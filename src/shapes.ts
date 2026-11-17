import type { Descriptor, UnitValue } from './descriptor.ts';
import type { BlendMode } from './layer.ts';
import { blendMode, descriptorColor, enumValue, gradient, pattern, percent, type Gradient, type RGB } from './layer-styles.ts';
import type { Bounds } from './resources.ts';

/** A shape's fill or stroke content. One of these is set, depending on its type. */
export interface ShapeContent {
  /** Undefined for colors that can't be converted, such as book colors. */
  color: RGB | undefined;
  gradient: Gradient | undefined;
  pattern: { name: string; id: string } | undefined;
}

/** The live shape properties Photoshop keeps for each shape tool shape in a layer. */
export interface VectorShape {
  /** Undefined if the shape was edited into a plain path, or for shape types this library doesn't know. */
  type: 'rectangle' | 'roundedRectangle' | 'line' | 'ellipse' | undefined;
  /** The shape was edited with the path tools, so it only has `index` and `data`. */
  invalidated: boolean;
  /** The shape's path component in the vector mask (`info.vectorMask`). */
  index: number;
  /**
   * The shape's bounds in pixels, as shown in Photoshop's Properties panel. The layer's bounds are
   * larger: they're whole pixels, and include antialiasing and the stroke.
   */
  bounds: Bounds | undefined;
  /** Rounded rectangle corner radii, in pixels. */
  radii: { topLeft: number; topRight: number; bottomRight: number; bottomLeft: number } | undefined;
  /** Line endpoints in pixels, and the line's weight. */
  line: { start: { x: number; y: number }; end: { x: number; y: number }; weight: number } | undefined;
  /** The raw descriptor, for anything not covered above (rotated corners, arrowheads...). */
  data: Descriptor;
}

/** A shape layer's stroke settings, and whether its fill and stroke are shown. */
export interface VectorStroke extends ShapeContent {
  /** Whether the stroke is shown. */
  enabled: boolean;
  /**
   * Whether the fill is shown. The fill's content is in `vectorStrokeContent`, or `solidColor`,
   * `gradientFill` or `patternFill` for older shapes.
   */
  fillEnabled: boolean;
  /** In pixels. */
  width: number;
  alignment: 'inside' | 'center' | 'outside' | undefined;
  cap: 'butt' | 'round' | 'square' | undefined;
  join: 'miter' | 'round' | 'bevel' | undefined;
  miterLimit: number;
  /** Alternating dash and gap lengths, as multiples of the width. Empty for a solid line. */
  dashes: number[];
  /** In pixels. */
  dashOffset: number;
  /** 0 to 1. */
  opacity: number;
  blendMode: BlendMode | string | undefined;
}

const SHAPE_TYPES = { 1: 'rectangle', 2: 'roundedRectangle', 4: 'line', 5: 'ellipse' } as const;
const ALIGNMENTS = { strokeStyleAlignInside: 'inside', strokeStyleAlignCenter: 'center', strokeStyleAlignOutside: 'outside' } as const;
const CAPS = { strokeStyleButtCap: 'butt', strokeStyleRoundCap: 'round', strokeStyleSquareCap: 'square' } as const;
const JOINS = { strokeStyleMiterJoin: 'miter', strokeStyleRoundJoin: 'round', strokeStyleBevelJoin: 'bevel' } as const;

const lookup = <T extends Record<string, string>>(table: T, v: unknown): T[keyof T] | undefined =>
  table[enumValue(v) as keyof T];

/** Converts a unit value to pixels at the given resolution (pixels per inch). */
function pixels(v: UnitValue, resolution: number): number {
  switch (v.id) {
    case '#Pxl':
      return v.value;
    case '#Pnt':
      return (v.value * resolution) / 72;
    case '#Mlm':
      return (v.value * resolution) / 25.4;
    default:
      throw new Error(`Unsupported shape unit '${v.id}'`);
  }
}

export const shapeContent = (d: Descriptor | undefined): ShapeContent => ({
  color: descriptorColor(d?.['Clr ']),
  gradient: gradient(d?.Grad),
  pattern: pattern(d?.Ptrn),
});

function vectorShape(d: Descriptor): VectorShape {
  const res: number = d.keyOriginResolution;
  const px = (v: UnitValue) => pixels(v, res);
  const box = d.keyOriginShapeBBox;
  const radii = d.keyOriginRRectRadii;
  const point = (p: Descriptor) => ({ x: p.Hrzn as number, y: p.Vrtc as number });
  return {
    type: SHAPE_TYPES[d.keyOriginType as keyof typeof SHAPE_TYPES],
    invalidated: d.keyShapeInvalidated ?? false,
    index: d.keyOriginIndex,
    bounds: box && { top: px(box['Top ']), left: px(box.Left), bottom: px(box.Btom), right: px(box.Rght) },
    radii: radii && {
      topLeft: px(radii.topLeft),
      topRight: px(radii.topRight),
      bottomRight: px(radii.bottomRight),
      bottomLeft: px(radii.bottomLeft),
    },
    line: d.keyOriginLineStart && {
      start: point(d.keyOriginLineStart),
      end: point(d.keyOriginLineEnd),
      weight: d.keyOriginLineWeight,
    },
    data: d,
  };
}

/** Adds `shapes` to the vector origination (`vogk`) descriptor. */
export const readVectorOrigination = (d: Descriptor): Descriptor & { shapes: VectorShape[] } => ({
  ...d,
  shapes: (d.keyDescriptorList ?? []).map(vectorShape),
});

/** Adds the normalized settings to the vector stroke (`vstk`) descriptor, keeping its raw keys. */
export function readVectorStroke(d: Descriptor): Descriptor & VectorStroke {
  const res: number = d.strokeStyleResolution;
  return {
    ...d,
    ...shapeContent(d.strokeStyleContent),
    enabled: d.strokeEnabled,
    fillEnabled: d.fillEnabled,
    width: pixels(d.strokeStyleLineWidth, res),
    alignment: lookup(ALIGNMENTS, d.strokeStyleLineAlignment),
    cap: lookup(CAPS, d.strokeStyleLineCapType),
    join: lookup(JOINS, d.strokeStyleLineJoinType),
    miterLimit: d.strokeStyleMiterLimit,
    dashes: d.strokeStyleLineDashSet.map((v: UnitValue) => v.value),
    dashOffset: pixels(d.strokeStyleLineDashOffset, res),
    opacity: percent(d.strokeStyleOpacity),
    blendMode: blendMode(d.strokeStyleBlendMode),
  };
}
