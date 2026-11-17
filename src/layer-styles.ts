import type { Descriptor } from './descriptor.ts';
import { labToRgb } from './image.ts';
import type { BlendMode } from './layer.ts';

export type RGB = [number, number, number];

/** Layer styles (the `lfx2`/`lmfx` block). Photoshop CC allows several of some effects per layer. */
export interface LayerStyles {
  /** The master "show effects" switch. */
  enabled: boolean;
  /** Effect scale, where 1 is 100%. */
  scale: number;
  dropShadows: Shadow[];
  innerShadows: Shadow[];
  outerGlows: Glow[];
  innerGlows: Glow[];
  bevels: Bevel[];
  satins: Satin[];
  colorOverlays: ColorOverlay[];
  gradientOverlays: GradientOverlay[];
  patternOverlays: PatternOverlay[];
  strokes: Stroke[];
  /** The raw descriptor, for anything not covered above. */
  data: Descriptor;
}

interface Effect {
  enabled: boolean;
  blendMode: BlendMode | string | undefined;
  /** 0 to 1. */
  opacity: number;
}

export interface Shadow extends Effect {
  /** Undefined for colors that can't be converted, such as book colors. */
  color: RGB | undefined;
  /** Degrees. */
  angle: number;
  useGlobalLight: boolean;
  distance: number;
  /** "Spread" for drop shadows, "choke" for inner shadows, in pixels. */
  spread: number;
  size: number;
  /** 0 to 1. */
  noise: number;
  antiAlias: boolean;
  contour: string | undefined;
}

export interface Glow extends Effect {
  /** Glows use either a color or a gradient. */
  color: RGB | undefined;
  gradient: Gradient | undefined;
  /** `SfBL` (softer) or `PrBL` (precise). */
  technique: string | undefined;
  /** "Spread" for outer glows, "choke" for inner glows, in pixels. */
  spread: number;
  size: number;
  noise: number;
  jitter: number;
  range: number;
  /** Inner glows only: `SrcC` (center) or `SrcE` (edge). */
  source: string | undefined;
  antiAlias: boolean;
  contour: string | undefined;
}

export interface Bevel {
  enabled: boolean;
  /** `OtrB` (outer bevel), `InrB` (inner bevel), `Embs` (emboss), `PlEb` (pillow emboss) or `strokeEmboss`. */
  style: string | undefined;
  /** `SfBL` (smooth), `PrBL` (chisel hard) or `Slmt` (chisel soft). */
  technique: string | undefined;
  /** 0 to 10 (1 = 100%). */
  depth: number;
  direction: 'up' | 'down';
  size: number;
  soften: number;
  angle: number;
  altitude: number;
  useGlobalLight: boolean;
  highlight: { blendMode: BlendMode | string | undefined; color: RGB | undefined; opacity: number };
  shadow: { blendMode: BlendMode | string | undefined; color: RGB | undefined; opacity: number };
  antiAlias: boolean;
  contour: string | undefined;
}

export interface Satin extends Effect {
  color: RGB | undefined;
  angle: number;
  distance: number;
  size: number;
  invert: boolean;
  antiAlias: boolean;
  contour: string | undefined;
}

export interface ColorOverlay extends Effect {
  color: RGB | undefined;
}

export interface GradientStop {
  /** 0 to 1. */
  location: number;
  /** 0 to 1. */
  midpoint: number;
}

export interface Gradient {
  name: string;
  /** `CstS` (solid) or `ClNs` (noise). */
  type: string | undefined;
  /** 0 to 1. */
  smoothness: number;
  colorStops: Array<GradientStop & { color: RGB | undefined }>;
  opacityStops: Array<GradientStop & { opacity: number }>;
}

export interface GradientOverlay extends Effect {
  gradient: Gradient | undefined;
  angle: number;
  /** `Lnr` (linear), `Rdl` (radial), `Angl` (angle), `Rflc` (reflected) or `Dmnd` (diamond). */
  style: string | undefined;
  reverse: boolean;
  alignWithLayer: boolean;
  /** 1 = 100%. */
  scale: number;
  /** Percent of the layer size. */
  offset: { x: number; y: number };
}

export interface PatternOverlay extends Effect {
  pattern: { name: string; id: string } | undefined;
  scale: number;
  alignWithLayer: boolean;
}

export interface Stroke extends Effect {
  size: number;
  /** `OutF` (outside), `InsF` (inside) or `CtrF` (center). */
  position: string | undefined;
  /** `SClr` (color), `GrFl` (gradient) or `Ptrn` (pattern). */
  fillType: string | undefined;
  color: RGB | undefined;
  gradient: Gradient | undefined;
  pattern: { name: string; id: string } | undefined;
}

const BLEND_MODES: Record<string, BlendMode> = {
  Nrml: 'normal',
  Dslv: 'dissolve',
  Drkn: 'darken',
  Mltp: 'multiply',
  CBrn: 'color_burn',
  linearBurn: 'linear_burn',
  darkerColor: 'darker_color',
  Lghn: 'lighten',
  Scrn: 'screen',
  CDdg: 'color_dodge',
  linearDodge: 'linear_dodge',
  lighterColor: 'lighter_color',
  Ovrl: 'overlay',
  SftL: 'soft_light',
  HrdL: 'hard_light',
  vividLight: 'vivid_light',
  linearLight: 'linear_light',
  pinLight: 'pin_light',
  hardMix: 'hard_mix',
  Dfrn: 'difference',
  Xclu: 'exclusion',
  blendSubtraction: 'subtract',
  blendDivide: 'divide',
  H: 'hue',
  Strt: 'saturation',
  Clr: 'color',
  Lmns: 'luminosity',
  passThrough: 'passthru',
};

/** Unit values (`{ value }`) and plain numbers as a number. */
const num = (v: any): number => (typeof v === 'object' && v !== null ? v.value : (v ?? 0));
const percent = (v: any) => num(v) / 100;
const enumValue = (v: any): string | undefined => v?.value?.trim();
const blendMode = (v: any) => {
  const value = enumValue(v);
  return value === undefined ? undefined : (BLEND_MODES[value] ?? value);
};
const contour = (v: any): string | undefined => v?.['Nm  '];
const pattern = (v: any) => (v ? { name: v['Nm  '] as string, id: v.Idnt as string } : undefined);

/** Converts a descriptor color to RGB. */
export function descriptorColor(c: Descriptor | undefined): RGB | undefined {
  if (!c) return undefined;
  const round = (values: number[]) => values.map((v) => Math.round(Math.min(Math.max(v, 0), 255))) as RGB;
  switch (c.class.id) {
    case 'RGBC':
      return 'redFloat' in c
        ? round([c.redFloat * 255, c.greenFloat * 255, c.blueFloat * 255])
        : round([c['Rd  '], c['Grn '], c['Bl  ']]);
    case 'Grsc': {
      const gray = 255 - (num(c['Gry ']) * 255) / 100;
      return round([gray, gray, gray]);
    }
    case 'HSBC': {
      const [h, s, v] = [num(c['H   ']) / 60, c['Strt'] / 100, c['Brgh'] / 100];
      const f = (n: number) => {
        const k = (n + h) % 6;
        return 255 * (v - v * s * Math.max(0, Math.min(k, 4 - k, 1)));
      };
      return round([f(5), f(3), f(1)]);
    }
    case 'CMYC': {
      const k = c['Blck'] / 100;
      return round([c['Cyn '], c['Mgnt'], c['Ylw ']].map((v) => 255 * (1 - v / 100) * (1 - k)));
    }
    case 'LbCl':
      return labToRgb((c['Lmnc'] * 255) / 100, c['A   '] + 128, c['B   '] + 128);
    default:
      return undefined;
  }
}

function gradient(g: Descriptor | undefined): Gradient | undefined {
  if (!g) return undefined;
  const stop = (s: Descriptor) => ({ location: s.Lctn / 4096, midpoint: s.Mdpn / 100 });
  return {
    name: g['Nm  '],
    type: enumValue(g.GrdF),
    smoothness: (g.Intr ?? 4096) / 4096,
    colorStops: (g.Clrs ?? []).map((s: Descriptor) => ({ ...stop(s), color: descriptorColor(s['Clr ']) })),
    opacityStops: (g.Trns ?? []).map((s: Descriptor) => ({ ...stop(s), opacity: percent(s.Opct) })),
  };
}

const effect = (d: Descriptor): Effect => ({ enabled: d.enab ?? false, blendMode: blendMode(d['Md  ']), opacity: percent(d.Opct) });

const shadow = (d: Descriptor): Shadow => ({
  ...effect(d),
  color: descriptorColor(d['Clr ']),
  angle: num(d.lagl),
  useGlobalLight: d.uglg ?? false,
  distance: num(d.Dstn),
  spread: num(d.Ckmt),
  size: num(d.blur),
  noise: percent(d.Nose),
  antiAlias: d.AntA ?? false,
  contour: contour(d.TrnS),
});

const glow = (d: Descriptor): Glow => ({
  ...effect(d),
  color: descriptorColor(d['Clr ']),
  gradient: gradient(d.Grad),
  technique: enumValue(d.GlwT),
  spread: num(d.Ckmt),
  size: num(d.blur),
  noise: percent(d.Nose),
  jitter: percent(d.ShdN),
  range: percent(d.Inpr),
  source: enumValue(d.glwS),
  antiAlias: d.AntA ?? false,
  contour: contour(d.TrnS),
});

const bevel = (d: Descriptor): Bevel => ({
  enabled: d.enab ?? false,
  style: enumValue(d.bvlS),
  technique: enumValue(d.bvlT),
  depth: percent(d.srgR),
  direction: enumValue(d.bvlD) === 'Out' ? 'down' : 'up',
  size: num(d.blur),
  soften: num(d.Sftn),
  angle: num(d.lagl),
  altitude: num(d.Lald),
  useGlobalLight: d.uglg ?? false,
  highlight: { blendMode: blendMode(d.hglM), color: descriptorColor(d.hglC), opacity: percent(d.hglO) },
  shadow: { blendMode: blendMode(d.sdwM), color: descriptorColor(d.sdwC), opacity: percent(d.sdwO) },
  antiAlias: d.AntA ?? false,
  contour: contour(d.TrnS),
});

const satin = (d: Descriptor): Satin => ({
  ...effect(d),
  color: descriptorColor(d['Clr ']),
  angle: num(d.lagl),
  distance: num(d.Dstn),
  size: num(d.blur),
  invert: d.Invr ?? false,
  antiAlias: d.AntA ?? false,
  contour: contour(d.MpgS),
});

const gradientOverlay = (d: Descriptor): GradientOverlay => ({
  ...effect(d),
  gradient: gradient(d.Grad),
  angle: num(d.Angl),
  style: enumValue(d.Type),
  reverse: d.Rvrs ?? false,
  alignWithLayer: d.Algn ?? false,
  scale: percent(d['Scl ']),
  offset: { x: num(d.Ofst?.Hrzn), y: num(d.Ofst?.Vrtc) },
});

const stroke = (d: Descriptor): Stroke => ({
  ...effect(d),
  size: num(d['Sz  ']),
  position: enumValue(d.Styl),
  fillType: enumValue(d.PntT),
  color: descriptorColor(d['Clr ']),
  gradient: gradient(d.Grad),
  pattern: pattern(d.Ptrn),
});

/** Normalizes the layer styles descriptor. */
export function readLayerStyles(data: Descriptor): LayerStyles {
  // Each effect is stored singly, or as a list under a `...Multi` key in Photoshop CC.
  const list = (single: string, multi?: string): Descriptor[] =>
    (multi && data[multi]) || (data[single] ? [data[single]] : []);
  return {
    enabled: data.masterFXSwitch ?? true,
    scale: data['Scl '] ? percent(data['Scl ']) : 1,
    dropShadows: list('DrSh', 'dropShadowMulti').map(shadow),
    innerShadows: list('IrSh', 'innerShadowMulti').map(shadow),
    outerGlows: list('OrGl').map(glow),
    innerGlows: list('IrGl').map(glow),
    bevels: list('ebbl').map(bevel),
    satins: list('ChFX').map(satin),
    colorOverlays: list('SoFi', 'solidFillMulti').map((d) => ({ ...effect(d), color: descriptorColor(d['Clr ']) })),
    gradientOverlays: list('GrFl', 'gradientFillMulti').map(gradientOverlay),
    patternOverlays: list('patternFill').map((d) => ({
      ...effect(d),
      pattern: pattern(d.Ptrn),
      scale: percent(d['Scl ']),
      alignWithLayer: d.Algn ?? false,
    })),
    strokes: list('FrFX', 'frameFXMulti').map(stroke),
    data,
  };
}
