import type { LayerImage } from './image.ts';
import type { BlendMode, Layer } from './layer.ts';
import type { LayerInfo } from './layer-info.ts';
import type { PSD } from './psd.ts';
import type { LayerComp } from './resources.ts';

export type Node = RootNode | GroupNode | LayerNode;
export type ChildNode = GroupNode | LayerNode;

export type LayerJSON = ReturnType<LayerNode['toJSON']>;
export interface GroupJSON extends ReturnType<LayerBackedNode['toJSON']> {
  open: boolean;
  children: Array<GroupJSON | LayerJSON>;
}

/** A layer comp, or its name or ID. */
export type CompRef = LayerComp | string | number;

interface Box {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

interface Offset {
  x: number;
  y: number;
}

abstract class BaseNode {
  abstract readonly type: 'root' | 'group' | 'layer';
  abstract readonly name: string;
  readonly children: ChildNode[] = [];

  abstract get parent(): RootNode | GroupNode | null;
  abstract get root(): RootNode;
  /** Bounds before any layer comp offset. */
  protected abstract get box(): Box;

  /** The offset applied by the tree's layer comp. */
  protected get offset(): Offset {
    return { x: 0, y: 0 };
  }

  get top(): number {
    return this.box.top + this.offset.y;
  }

  get bottom(): number {
    return this.box.bottom + this.offset.y;
  }

  get left(): number {
    return this.box.left + this.offset.x;
  }

  get right(): number {
    return this.box.right + this.offset.x;
  }

  get width(): number {
    return this.right - this.left;
  }

  get height(): number {
    return this.bottom - this.top;
  }

  /** Ancestors from the top of the tree down, excluding the root. */
  ancestors(): GroupNode[] {
    const parent = this.parent;
    return parent && parent.type !== 'root' ? [...parent.ancestors(), parent] : [];
  }

  /** Every child of this node's parent, including this node. */
  get siblings(): ChildNode[] {
    return this.parent?.children ?? [];
  }

  get nextSibling(): ChildNode | undefined {
    const siblings = this.siblings;
    return siblings[siblings.findIndex((s: BaseNode) => s === this) + 1];
  }

  get prevSibling(): ChildNode | undefined {
    const siblings = this.siblings;
    const index = siblings.findIndex((s: BaseNode) => s === this);
    return index > 0 ? siblings[index - 1] : undefined;
  }

  /** All nodes below this one, depth first. */
  descendants(): ChildNode[] {
    return this.children.flatMap((c) => [c, ...c.descendants()]);
  }

  /** This node followed by its descendants. */
  subtree(this: Node): Node[] {
    return [this, ...this.descendants()];
  }

  /** 0 for the root. */
  get depth(): number {
    return this.parent ? this.parent.depth + 1 : 0;
  }

  /** Slash-separated names from the top of the tree, e.g. `Version A/Matte`. */
  get path(): string {
    return [...this.ancestors().map((n) => n.name), this.name].join('/');
  }

  /**
   * Finds descendants by a path of names, relative to this node. Layer names don't have to be
   * unique, so this always returns an array.
   */
  childrenAtPath(path: string | string[], { caseSensitive = false } = {}): ChildNode[] {
    const [query, ...rest] = Array.isArray(path) ? path : path.split('/').filter(Boolean);
    if (query === undefined) return [];
    const normalize = (s: string) => (caseSensitive ? s : s.toLowerCase());
    const matches = this.children.filter((c) => normalize(c.name) === normalize(query));
    return rest.length === 0 ? matches : matches.flatMap((m) => m.childrenAtPath(rest, { caseSensitive }));
  }

  findById(id: number): ChildNode | undefined {
    return this.descendants().find((n) => n.id === id);
  }

  /** The union of the non-empty children's bounds, before layer comp offsets. */
  protected childBounds(): Box | undefined {
    const boxes = this.children.filter((c) => !c.isEmpty).map((c: BaseNode) => c.box);
    if (boxes.length === 0) return undefined;
    return {
      top: Math.min(...boxes.map((b) => b.top)),
      left: Math.min(...boxes.map((b) => b.left)),
      bottom: Math.max(...boxes.map((b) => b.bottom)),
      right: Math.max(...boxes.map((b) => b.right)),
    };
  }
}

/** Shared behavior of groups and layers, which are both backed by a layer record. */
abstract class LayerBackedNode extends BaseNode {
  abstract override readonly type: 'group' | 'layer';
  readonly layer: Layer;
  readonly #parent: RootNode | GroupNode;

  constructor(layer: Layer, parent: RootNode | GroupNode) {
    super();
    this.layer = layer;
    this.#parent = parent;
  }

  get parent(): RootNode | GroupNode {
    return this.#parent;
  }

  get root(): RootNode {
    return this.#parent.root;
  }

  protected get box(): Box {
    const { top, left, bottom, right } = this.layer;
    return { top, left, bottom, right };
  }

  protected override get offset(): Offset {
    const comp = this.root.comp;
    return comp && comp.capturedInfo & 0b010 ? this.#offsetInComp(comp.id) : super.offset;
  }

  get name(): string {
    return this.layer.name;
  }

  get id(): number | undefined {
    return this.layer.id;
  }

  get info(): LayerInfo {
    return this.layer.info;
  }

  /** Visible, accounting for clipping masks and the tree's layer comp. */
  get visible(): boolean {
    if (this.layer.clipped && this.clippingMask?.visible === false) return false;
    const comp = this.root.comp;
    return comp && comp.capturedInfo & 0b001 ? this.visibleInComp(comp) : this.layer.visible;
  }

  /** 0 to 1. */
  get opacity(): number {
    return this.layer.opacity / 255;
  }

  /** 0 to 1. */
  get fillOpacity(): number {
    return this.layer.fillOpacity / 255;
  }

  get blendMode(): BlendMode | undefined {
    return this.layer.blendMode;
  }

  /** The node this one is clipped to: the first unclipped sibling below it. */
  get clippingMask(): ChildNode | undefined {
    if (!this.layer.clipped) return undefined;
    let node = this.nextSibling;
    while (node?.layer.clipped) node = node.nextSibling;
    return node;
  }

  // Locks are inherited from ancestors, but Photoshop only stores them on the locked node.
  #locked(key: 'all' | 'position' | 'composite' | 'transparency'): boolean {
    if (this.layer.info.locked?.[key]) return true;
    return this.parent.type === 'group' && this.parent.#locked(key);
  }

  get allLocked(): boolean {
    return this.#locked('all');
  }

  get positionLocked(): boolean {
    return this.#locked('position');
  }

  get compositeLocked(): boolean {
    return this.#locked('composite');
  }

  get transparencyLocked(): boolean {
    return this.#locked('transparency');
  }

  /** The color label, inherited from the nearest labeled ancestor. */
  get colorLabel(): string {
    const color = this.layer.info.sheetColor ?? 'none';
    return color === 'none' && this.parent.type === 'group' ? this.parent.colorLabel : color;
  }

  /** Whether this node is visible in the given layer comp. */
  visibleInComp(comp: CompRef): boolean {
    const id = this.root.findComp(comp).id;
    let visible = true;
    for (const setting of this.#compSettings()) {
      if (setting.enab !== undefined) visible = setting.enab;
      if (setting.compList.includes(id)) return visible;
    }
    return false;
  }

  /** This node's bounds in the given layer comp. */
  positionInComp(comp: CompRef): Box {
    const { x, y } = this.#offsetInComp(this.root.findComp(comp).id);
    const { top, left, bottom, right } = this.box;
    return { top: top + y, left: left + x, bottom: bottom + y, right: right + x };
  }

  #offsetInComp(id: number): Offset {
    let x = 0;
    let y = 0;
    for (const setting of this.#compSettings()) {
      if (setting.Ofst) ({ Hrzn: x, Vrtc: y } = setting.Ofst);
      if (setting.compList.includes(id)) break;
    }
    return { x, y };
  }

  #compSettings(): Array<{ enab?: boolean; Ofst?: { Hrzn: number; Vrtc: number }; compList: number[] }> {
    return this.layer.info.metadata?.layerComp?.layerSettings ?? [];
  }

  toJSON() {
    return {
      type: this.type,
      id: this.id,
      name: this.name,
      visible: this.visible,
      opacity: this.opacity,
      blendMode: this.blendMode,
      top: this.top,
      left: this.left,
      bottom: this.bottom,
      right: this.right,
      width: this.width,
      height: this.height,
    };
  }
}

export class GroupNode extends LayerBackedNode {
  readonly type = 'group';
  #box: Box | undefined;

  /** The bounds of the non-empty children, or the group's own bounds if they're all empty. */
  protected override get box(): Box {
    return (this.#box ??= this.childBounds() ?? super.box);
  }

  /** Whether the group is expanded in the layers panel. */
  get open(): boolean {
    return this.layer.info.sectionDivider?.type === 'open folder';
  }

  get isEmpty(): boolean {
    return this.children.every((c) => c.isEmpty);
  }

  override toJSON(): GroupJSON {
    return { ...super.toJSON(), open: this.open, children: this.children.map((c) => c.toJSON()) };
  }
}

export class LayerNode extends LayerBackedNode {
  readonly type = 'layer';

  get image(): LayerImage {
    return this.layer.image;
  }

  get isEmpty(): boolean {
    return this.width === 0 || this.height === 0;
  }

  override toJSON() {
    return {
      ...super.toJSON(),
      mask: this.layer.mask,
      text: this.layer.info.typeTool?.toJSON(),
      image: { width: this.layer.width, height: this.layer.height },
    };
  }
}

export class RootNode extends BaseNode {
  readonly type = 'root';
  readonly name = '';
  readonly psd: PSD;
  /** The layer comp whose visibility and positions this tree shows, if any. See `filterByComp`. */
  readonly comp: LayerComp | undefined;

  constructor(psd: PSD, comp?: LayerComp) {
    super();
    this.psd = psd;
    this.comp = comp;

    let current: RootNode | GroupNode = this;
    const stack: Array<RootNode | GroupNode> = [];
    for (const layer of psd.layers) {
      if (layer.isFolder) {
        const group = new GroupNode(layer, current);
        current.children.push(group);
        stack.push(current);
        current = group;
      } else if (layer.isFolderEnd) {
        // Files from some editors have unbalanced markers. Rather than fail, a stray end marker is
        // ignored, and groups still open at the bottom of the list end there.
        current = stack.pop() ?? current;
      } else {
        current.children.push(new LayerNode(layer, current));
      }
    }
  }

  get parent(): null {
    return null;
  }

  get root(): RootNode {
    return this;
  }

  protected get box(): Box {
    return { top: 0, left: 0, bottom: this.psd.height, right: this.psd.width };
  }

  get visible(): true {
    return true;
  }

  /** Looks up a layer comp by name or ID. Throws if it doesn't exist. */
  findComp(comp: CompRef): LayerComp {
    if (typeof comp === 'object') return comp;
    const found = this.psd.resources.layerComps.find((c) => (typeof comp === 'string' ? c.name === comp : c.id === comp));
    if (!found) throw new Error(`Layer comp not found: ${comp}`);
    return found;
  }

  /** A new tree with the visibility and positions captured by a layer comp applied. */
  filterByComp(comp: CompRef): RootNode {
    return new RootNode(this.psd, this.findComp(comp));
  }

  toJSON() {
    const { header, resources } = this.psd;
    return {
      children: this.children.map((c) => c.toJSON()),
      document: {
        width: this.width,
        height: this.height,
        depth: header.depth,
        mode: header.modeName,
        resources: {
          layerComps: resources.layerComps,
          guides: resources.guides,
          slices: resources.slices?.slices ?? [],
          resolutionInfo: resources.resolutionInfo,
        },
      },
    };
  }
}
