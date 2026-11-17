import { readDescriptor, type Descriptor } from './descriptor.ts';
import { readPathRecords, type PathRecord } from './path-record.ts';
import { pad2, Reader } from './reader.ts';

/** An image resource block. `offset` points at its data inside the file. */
export interface ResourceBlock {
  id: number;
  name: string;
  offset: number;
  size: number;
}

export interface LayerComp {
  id: number;
  name: string;
  /** Bit flags: 1 = visibility, 2 = position, 4 = appearance. */
  capturedInfo: number;
}

export interface Guide {
  /** Position in pixels. */
  location: number;
  direction: 'horizontal' | 'vertical';
}

export interface ResolutionInfo {
  /** Horizontal resolution in pixels per `hResUnitName`. */
  hRes: number;
  hResUnit: number;
  hResUnitName: string;
  widthUnit: number;
  widthUnitName: string;
  vRes: number;
  vResUnit: number;
  vResUnitName: string;
  heightUnit: number;
  heightUnitName: string;
}

export interface Bounds {
  top: number;
  left: number;
  bottom: number;
  right: number;
}

/**
 * A slice. Version 6 resources store `origin`, `type` and the alignments as numeric codes;
 * versions 7+ store enum names such as `userGenerated` or `Img `.
 */
export interface Slice {
  id: number;
  groupId: number;
  origin: number | string;
  /** Only stored by version 6 resources. */
  associatedLayerId: number | null;
  name: string;
  type: number | string;
  bounds: Bounds;
  url: string;
  target: string;
  message: string;
  alt: string;
  cellTextIsHtml: boolean;
  cellText: string;
  horizontalAlignment: number | string;
  verticalAlignment: number | string;
  /** RGBA. Only stored by version 6 resources. */
  color: [number, number, number, number] | null;
  outset?: Bounds;
}

export interface Slices {
  version: number;
  name: string;
  bounds: Bounds;
  slices: Slice[];
}

export interface SavedPath {
  id: number;
  name: string;
  records: PathRecord[];
}

const RES_UNITS = ['pixel/inch', 'pixel/cm'];
const UNITS = ['in', 'cm', 'pt', 'picas', 'columns'];
const unitName = (names: string[], unit: number) => names[unit - 1] ?? 'unknown';

/** The image resources section. Blocks are indexed up front and decoded on first access. */
export class Resources {
  /** Every resource block in the file, by ID. */
  readonly blocks = new Map<number, ResourceBlock>();
  readonly #reader: Reader;
  readonly #cache = new Map<string, unknown>();

  constructor(r: Reader, end: number) {
    this.#reader = r;
    while (r.pos < end) {
      r.skip(4); // signature, 8BIM
      const id = r.uint16();
      const nameLength = pad2(r.uint8() + 1) - 1;
      const name = r.ascii(nameLength);
      const size = pad2(r.uint32());
      this.blocks.set(id, { id, name, offset: r.pos, size });
      r.skip(size);
    }
  }

  /** Raw bytes of a resource block. */
  bytes(id: number): Uint8Array | undefined {
    const block = this.blocks.get(id);
    return block && this.#reader.bytes.subarray(block.offset, block.offset + block.size);
  }

  #parse<T>(id: number, parse: (r: Reader, block: ResourceBlock) => T): T | undefined {
    const key = String(id);
    if (!this.#cache.has(key)) {
      const block = this.blocks.get(id);
      this.#cache.set(key, block && parse(this.#reader.at(block.offset), block));
    }
    return this.#cache.get(key) as T | undefined;
  }

  /** Resource 1065. */
  get layerComps(): LayerComp[] {
    return (
      this.#parse(1065, (r) => {
        r.skip(4); // descriptor version
        const list: Descriptor[] = readDescriptor(r).list ?? [];
        return list.map((c) => ({ id: c.compID, name: c['Nm  '], capturedInfo: c.capturedInfo }));
      }) ?? []
    );
  }

  /** Resource 1032. */
  get guides(): Guide[] {
    return (
      this.#parse(1032, (r) => {
        r.skip(12); // version + future grid info
        const count = r.int32();
        return Array.from({ length: count }, (): Guide => ({
          location: r.int32() / 32,
          direction: r.uint8() === 0 ? 'vertical' : 'horizontal',
        }));
      }) ?? []
    );
  }

  /** Resource 1005. */
  get resolutionInfo(): ResolutionInfo | undefined {
    return this.#parse(1005, (r) => {
      const hRes = r.uint32() / 65536;
      const hResUnit = r.uint16();
      const widthUnit = r.uint16();
      const vRes = r.uint32() / 65536;
      const vResUnit = r.uint16();
      const heightUnit = r.uint16();
      return {
        hRes,
        hResUnit,
        hResUnitName: unitName(RES_UNITS, hResUnit),
        widthUnit,
        widthUnitName: unitName(UNITS, widthUnit),
        vRes,
        vResUnit,
        vResUnitName: unitName(RES_UNITS, vResUnit),
        heightUnit,
        heightUnitName: unitName(UNITS, heightUnit),
      };
    });
  }

  /** Resource 1050, normalized to the same shape for every version. */
  get slices(): Slices | undefined {
    return this.#parse(1050, readSlices);
  }

  /** Resource 1060, the raw XMP packet. */
  get xmpMetadata(): string | undefined {
    return this.#parse(1060, (r, block) => new TextDecoder().decode(r.bytesView(block.size)).replace(/\0+$/, ''));
  }

  /** Resource 1025. */
  get workPath(): PathRecord[] | undefined {
    return this.#parse(1025, (r, block) => readPathRecords(r, Math.floor(block.size / 26)));
  }

  /** Resources 2000-2997. */
  get savedPaths(): SavedPath[] {
    return [...this.blocks.values()]
      .filter((b) => b.id >= 2000 && b.id <= 2997)
      .map((b) => ({ id: b.id, name: b.name, records: this.#parse(b.id, (r) => readPathRecords(r, Math.floor(b.size / 26)))! }));
  }

  /** Resource 1026: the group ID of each layer, ordered top to bottom like `psd.layers`. */
  get layerGroups(): number[] | undefined {
    return this.#parse(1026, (r, block) => Array.from({ length: block.size / 2 }, () => r.uint16()).reverse());
  }
}

function readSlices(r: Reader): Slices {
  const version = r.int32();
  if (version === 6) return readLegacySlices(r);
  if (version !== 7 && version !== 8) throw new Error(`Unsupported slices resource version ${version}`);

  r.skip(4); // descriptor version
  const d = readDescriptor(r);
  const bounds = (b: Descriptor): Bounds => ({ top: b['Top '], left: b['Left'], bottom: b['Btom'], right: b['Rght'] });
  return {
    version,
    name: d.baseName,
    bounds: bounds(d.bounds),
    slices: (d.slices as Descriptor[]).map((s) => ({
      id: s.sliceID,
      groupId: s.groupID,
      origin: s.origin.value,
      associatedLayerId: null,
      name: s['Nm  '] ?? '',
      type: s.Type.value,
      bounds: bounds(s.bounds),
      url: s.url ?? '',
      target: s.null ?? '',
      message: s.Msge ?? '',
      alt: s.altTag ?? '',
      cellTextIsHtml: s.cellTextIsHTML ?? false,
      cellText: s.cellText ?? '',
      horizontalAlignment: s.horzAlign.value,
      verticalAlignment: s.vertAlign.value,
      color: null,
      outset: { top: s.topOutset, left: s.leftOutset, bottom: s.bottomOutset, right: s.rightOutset },
    })),
  };
}

function readLegacySlices(r: Reader): Slices {
  const bounds = { top: r.int32(), left: r.int32(), bottom: r.int32(), right: r.int32() };
  const name = r.unicode();
  const count = r.int32();
  const slices = Array.from({ length: count }, (): Slice => {
    const id = r.int32();
    const groupId = r.int32();
    const origin = r.int32();
    const associatedLayerId = origin === 1 ? r.int32() : null;
    const name = r.unicode();
    const type = r.int32();
    const bounds = { left: r.int32(), top: r.int32(), right: r.int32(), bottom: r.int32() };
    const url = r.unicode();
    const target = r.unicode();
    const message = r.unicode();
    const alt = r.unicode();
    const cellTextIsHtml = r.bool();
    const cellText = r.unicode();
    const horizontalAlignment = r.int32();
    const verticalAlignment = r.int32();
    const [a, red, g, b] = [r.uint8(), r.uint8(), r.uint8(), r.uint8()];
    return {
      id, groupId, origin, associatedLayerId, name, type, bounds, url, target, message, alt,
      cellTextIsHtml, cellText, horizontalAlignment, verticalAlignment, color: [red, g, b, a],
    };
  });
  return { version: 6, name, bounds, slices };
}
