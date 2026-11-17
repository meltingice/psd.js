import { readDescriptor, type Descriptor } from './descriptor.ts';
import type { InfoBlock } from './layer.ts';
import { readLayerStyles } from './layer-styles.ts';
import { readPathRecords } from './path-record.ts';
import type { Header } from './psd.ts';
import type { Reader, SpaceColor } from './reader.ts';
import { readLegacyTypeTool, TypeTool } from './type-tool.ts';

interface Ctx {
  header: Header;
  /** Length of the block's data. */
  length: number;
  /** Offset where the block's data ends. */
  end: number;
}

type Parser = (r: Reader, ctx: Ctx) => unknown;

/** Skips `skip` bytes of version info, then reads a descriptor. */
const descriptorAfter = (skip: number) => (r: Reader) => {
  r.skip(skip);
  return readDescriptor(r);
};

/** A boolean followed by 3 bytes of padding. */
const flag = (r: Reader) => r.bool();

const SECTION_DIVIDER_TYPES = ['other', 'open folder', 'closed folder', 'bounding section divider'] as const;
const SHEET_COLORS = ['none', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'gray'] as const;
const CHANNEL_LETTERS: Record<string, string[]> = { RGBColor: ['R', 'G', 'B'], CMYKColor: ['C', 'M', 'Y', 'K'] };
/** Indexed from 1. */
const BEVEL_STYLES = ['Outer Bevel', 'Inner Bevel', 'Emboss', 'Pillow Emboss', 'Stroke Emboss'];

function readDivider(r: Reader, { length }: Ctx) {
  const code = r.int32();
  const divider = {
    type: SECTION_DIVIDER_TYPES[code] ?? 'other',
    isFolder: code === 1 || code === 2,
    /** Marks the end of a group. */
    isHidden: code === 3,
    /** The group's blend mode key, which overrides the layer record's. */
    blendMode: undefined as string | undefined,
    subType: undefined as 'normal' | 'scene group' | undefined,
  };
  if (length >= 12) {
    r.skip(4); // signature
    divider.blendMode = r.ascii(4);
  }
  if (length >= 16) divider.subType = r.int32() === 0 ? 'normal' : 'scene group';
  return divider;
}

/** A point count followed by (output, input) pairs. */
const readCurvePoints = (r: Reader) =>
  Array.from({ length: r.int16() }, () => ({ output: r.int16(), input: r.int16() }));

export function readCurves(r: Reader, { end }: Pick<Ctx, 'end'>) {
  r.skip(3); // padding + version
  const tag = r.int32();
  const curves: Array<{ channelIndex: number; points: Array<{ output: number; input: number }> }> = [];
  // Legacy format: bit i of the tag says whether a curve for channel i is present.
  for (let i = 0; i < 32; i++) {
    if (tag & (1 << i)) curves.push({ channelIndex: i, points: readCurvePoints(r) });
  }
  // Photoshop CS repeats the curves in an extended section with explicit channel indexes,
  // which replaces the legacy data.
  if (r.pos < end - 4) {
    if (r.ascii(4) !== 'Crv ') throw new Error('Malformed extended curves data');
    r.skip(2);
    const count = r.int32();
    return Array.from({ length: count }, () => ({ channelIndex: r.int16(), points: readCurvePoints(r) }));
  }
  return curves;
}

function readLevels(r: Reader, { end }: Ctx) {
  r.skip(2); // version
  const record = () => ({
    inputFloor: r.int16(),
    inputCeiling: r.int16(),
    outputFloor: r.int16(),
    outputCeiling: r.int16(),
    gamma: r.int16() / 100,
  });
  const records = Array.from({ length: 29 }, record);
  if (r.pos < end - 4) {
    if (r.ascii(4) !== 'Lvls') throw new Error('Malformed extended levels data');
    r.skip(2);
    const extra = r.int16() - 29;
    for (let i = 0; i < extra; i++) records.push(record());
  }
  return records;
}

function readGradientMap(r: Reader) {
  r.skip(2); // version
  const reverse = r.bool();
  const dither = r.bool();
  const name = r.unicode();
  const colorStops = Array.from({ length: r.int16() }, () => {
    const stop = { location: r.int32(), midpoint: r.int32(), color: r.spaceColor() };
    r.skip(2);
    return stop;
  });
  const transparencyStops = Array.from({ length: r.int16() }, () => ({
    location: r.int32(),
    midpoint: r.int32(),
    opacity: r.int16(),
  }));
  const map = {
    reverse,
    dither,
    name,
    colorStops,
    transparencyStops,
    interpolation: undefined as number | undefined,
    noise: undefined as
      | {
          mode: number;
          randomSeed: number;
          showingTransparency: boolean;
          usingVectorColor: boolean;
          roughnessFactor: number;
          colorModel: number;
          minimumColor: number[];
          maximumColor: number[];
        }
      | undefined,
  };
  if (r.int16() > 0) {
    map.interpolation = r.int16();
    if (r.int16() >= 32) {
      map.noise = {
        mode: r.int16(),
        randomSeed: r.int32(),
        showingTransparency: r.int16() > 0,
        usingVectorColor: r.int16() > 0,
        roughnessFactor: r.int32(),
        colorModel: r.int16(),
        minimumColor: [0, 0, 0, 0].map(() => r.uint16() >> 8),
        maximumColor: [0, 0, 0, 0].map(() => r.uint16() >> 8),
      };
    }
  }
  return map;
}

function readHueSaturation(r: Reader) {
  r.skip(2); // version
  const type = r.uint8() === 0 ? ('hue' as const) : ('colorization' as const);
  r.skip(1);
  const hsl = () => ({ hue: r.int16(), saturation: r.int16(), lightness: r.int16() });
  const colorization = hsl();
  const master = hsl();
  const ranges = Array.from({ length: 6 }, () => ({
    range: [r.int16(), r.int16(), r.int16(), r.int16()],
    settings: [r.int16(), r.int16(), r.int16()],
  }));
  return { type, colorization, master, ranges };
}

function readSelectiveColor(r: Reader) {
  r.skip(2); // version
  const correctionMode = r.int16() === 0 ? ('relative' as const) : ('absolute' as const);
  r.skip(8); // the first record is unused
  const corrections = Array.from({ length: 9 }, () => ({
    cyan: r.int16(),
    magenta: r.int16(),
    yellow: r.int16(),
    black: r.int16(),
  }));
  return { correctionMode, corrections };
}

function readPhotoFilter(r: Reader) {
  const version = r.int16();
  let color: { colorSpace: number; components: number[] } | { x: number; y: number; z: number };
  if (version === 3) {
    color = { x: r.int32() >> 8, y: r.int32() >> 8, z: r.int32() >> 8 };
  } else if (version === 2) {
    color = { colorSpace: r.int16(), components: [r.int16(), r.int16(), r.int16(), r.int16()] };
  } else {
    throw new Error(`Unsupported photo filter version ${version}`);
  }
  return { color, density: r.int32(), preserveLuminosity: r.bool() };
}

/** The legacy (pre-Photoshop 6) layer effects block. */
function readEffectsLayer(r: Reader) {
  r.skip(2); // version
  const count = r.int16();
  const effects: {
    visible?: boolean;
    dropShadow?: ReturnType<typeof shadow>;
    innerShadow?: ReturnType<typeof shadow>;
    outerGlow?: ReturnType<typeof glow>;
    innerGlow?: ReturnType<typeof glow>;
    bevel?: ReturnType<typeof bevel>;
    solidFill?: ReturnType<typeof solidFill>;
  } = {};

  const blendKey = () => {
    r.skip(4); // signature
    return r.ascii(4);
  };
  const opacity = () => Math.round((r.uint8() / 255) * 100);
  // Documented as int32, but Photoshop writes 16.16 fixed point.
  const fixed = () => r.int32() >> 16;

  function shadow() {
    const size = r.int32();
    const end = r.pos + size;
    const data = {
      version: r.int32(),
      blur: fixed(),
      intensity: fixed(),
      angle: fixed(),
      distance: fixed(),
      color: r.spaceColor(),
      blendMode: blendKey(),
      enabled: r.bool(),
      useGlobalLight: r.bool(),
      /** Percent. */
      opacity: opacity(),
      nativeColor: undefined as SpaceColor | undefined,
    };
    if (size >= 51) data.nativeColor = r.spaceColor();
    r.seek(end);
    return data;
  }

  function glow(inner: boolean) {
    const size = r.int32();
    const end = r.pos + size;
    const data = {
      version: r.int32(),
      blur: fixed(),
      intensity: fixed(),
      color: r.spaceColor(),
      blendMode: blendKey(),
      enabled: r.bool(),
      opacity: opacity(),
      invert: undefined as boolean | undefined,
      nativeColor: undefined as SpaceColor | undefined,
    };
    if (data.version === 2) {
      if (inner) data.invert = r.bool();
      data.nativeColor = r.spaceColor();
    }
    r.seek(end);
    return data;
  }

  function bevel() {
    const size = r.int32();
    const end = r.pos + size;
    const version = r.int32();
    const angle = fixed();
    const strength = fixed();
    const blur = fixed();
    const highlightBlendMode = blendKey();
    const shadowBlendMode = blendKey();
    const highlightColor = r.spaceColor();
    const shadowColor = r.spaceColor();
    const styleId = r.uint8();
    const data = {
      version,
      angle,
      strength,
      blur,
      highlightBlendMode,
      shadowBlendMode,
      highlightColor,
      shadowColor,
      style: BEVEL_STYLES[styleId - 1],
      highlightOpacity: opacity(),
      shadowOpacity: opacity(),
      enabled: r.bool(),
      useGlobalLight: r.bool(),
      direction: r.uint8() === 0 ? ('up' as const) : ('down' as const),
      realHighlightColor: undefined as SpaceColor | undefined,
      realShadowColor: undefined as SpaceColor | undefined,
    };
    if (version === 2) {
      data.realHighlightColor = r.spaceColor();
      data.realShadowColor = r.spaceColor();
    }
    r.seek(end);
    return data;
  }

  function solidFill() {
    const size = r.int32();
    const end = r.pos + size;
    const data = {
      version: r.int32(),
      blendMode: blendKey(),
      color: r.spaceColor(),
      opacity: opacity(),
      enabled: r.bool(),
      nativeColor: r.spaceColor(),
    };
    r.seek(end);
    return data;
  }

  for (let i = 0; i < count; i++) {
    const sig = r.ascii(4);
    if (sig !== '8BIM') throw new Error(`Bad effects layer signature '${sig}'`);
    const key = r.ascii(4);
    switch (key) {
      case 'cmnS': {
        const size = r.int32();
        r.skip(size);
        effects.visible = true;
        break;
      }
      case 'dsdw':
        effects.dropShadow = shadow();
        break;
      case 'isdw':
        effects.innerShadow = shadow();
        break;
      case 'oglw':
        effects.outerGlow = glow(false);
        break;
      case 'iglw':
        effects.innerGlow = glow(true);
        break;
      case 'bevl':
        effects.bevel = bevel();
        break;
      case 'sofi':
        effects.solidFill = solidFill();
        break;
      default:
        r.skip(r.int32());
    }
  }
  return effects;
}

export interface Point {
  x: number;
  y: number;
}

/** A smart object's source and placement. The raw descriptor's keys (`Trnf`, `warp`...) are kept too. */
export interface PlacedLayer {
  /** The source file's ID in the document's linked file data. Copies of a smart object share it. */
  fileId: string;
  /** The page of a multi-page source such as a PDF, from 1. */
  page: number;
  totalPages: number;
  /**
   * Where the content's corners are in the document, in pixels: top left, top right, bottom
   * right, bottom left. Unlike the layer's bounds, these include transparent edges and follow
   * rotation. The raw values are in `Trnf`.
   */
  corners: [Point, Point, Point, Point];
  /** The corners including any perspective or distort transform. Undefined in older files. */
  nonAffineCorners: [Point, Point, Point, Point] | undefined;
  /** The content's size, in its own pixels. */
  size: { width: number; height: number };
  /** The content's resolution, in pixels per inch. */
  resolution: number;
  /**
   * Degrees clockwise, from the angle of the top edge. Only meaningful without skew or perspective.
   */
  rotation: number;
  /**
   * The corners' size relative to `size`. A flip makes `y` negative (a horizontal flip is a
   * 180° rotation plus a vertical flip). Photoshop's W and H percentages are relative to the
   * content's physical size instead, so they differ when `resolution` isn't the document's.
   */
  scale: { x: number; y: number };
}

type Corners = PlacedLayer['corners'];

const corners = (values: number[]) =>
  [0, 2, 4, 6].map((i) => ({ x: values[i]!, y: values[i + 1]! })) as Corners;

/** Normalizes a smart object's descriptor, keeping its raw keys. */
export function readPlacedLayer(d: Descriptor): Descriptor & PlacedLayer {
  if (d.Trnf?.length !== 8) throw new Error('Smart object descriptor has no transform');
  const [topLeft, topRight, , bottomLeft] = corners(d.Trnf);
  const top = { x: topRight.x - topLeft.x, y: topRight.y - topLeft.y };
  const left = { x: bottomLeft.x - topLeft.x, y: bottomLeft.y - topLeft.y };
  const size = { width: d['Sz  '].Wdth as number, height: d['Sz  '].Hght as number };
  const flip = Math.sign(top.x * left.y - top.y * left.x) || 1;
  return {
    ...d,
    fileId: d.Idnt,
    page: d.PgNm,
    totalPages: d.totalPages,
    corners: corners(d.Trnf),
    nonAffineCorners: d.nonAffineTransform && corners(d.nonAffineTransform),
    size,
    resolution: d.Rslt.value,
    rotation: (Math.atan2(top.y, top.x) * 180) / Math.PI,
    scale: { x: Math.hypot(top.x, top.y) / size.width, y: (flip * Math.hypot(left.x, left.y)) / size.height },
  };
}

function readMetadata(r: Reader) {
  const metadata: { layerComp?: Descriptor } = {};
  const count = r.int32();
  for (let i = 0; i < count; i++) {
    r.skip(4); // signature
    const key = r.ascii(4);
    r.skip(4); // copy on sheet duplication + padding
    const length = r.int32();
    const end = r.pos + length;
    if (key === 'cmls') {
      r.skip(4); // descriptor version
      metadata.layerComp = readDescriptor(r);
    }
    r.seek(end);
  }
  return metadata;
}

/** Every layer info block this library understands, by name. */
const LAYER_INFO = {
  artboard: {
    keys: ['artb', 'artd', 'abdd'],
    parse: (r: Reader) => {
      const data = descriptorAfter(4)(r);
      const rect = data.artboardRect;
      return { data, coords: { left: rect['Left'], top: rect['Top '], right: rect['Rght'], bottom: rect['Btom'] } };
    },
  },
  blackWhite: {
    keys: ['blwh'],
    parse: (r: Reader) => {
      const d = descriptorAfter(4)(r);
      return {
        red: d['Rd  '] as number,
        yellow: d['Yllw'] as number,
        green: d['Grn '] as number,
        cyan: d['Cyn '] as number,
        blue: d['Bl  '] as number,
        magenta: d['Mgnt'] as number,
        tint: d.useTint as boolean,
        tintColor: { red: d.tintColor['Rd  '] as number, green: d.tintColor['Grn '] as number, blue: d.tintColor['Bl  '] as number },
        presetKind: d.bwPresetKind as number,
        presetFileName: d.blackAndWhitePresetFileName as string,
        data: d,
      };
    },
  },
  blendClippingElements: { keys: ['clbl'], parse: flag },
  blendInteriorElements: { keys: ['infx'], parse: flag },
  /** Only meaningful with "Use Legacy" checked; otherwise see `contentGenerator`. */
  brightnessContrast: {
    keys: ['brit'],
    parse: (r: Reader) => ({ brightness: r.int16(), contrast: r.int16(), meanValue: r.int16(), labColor: r.bool() }),
  },
  channelBlendingRestrictions: {
    keys: ['brst'],
    parse: (r: Reader, { length, header }: Ctx) => {
      const channels = Array.from({ length: length / 4 }, () => r.int32());
      const letters = CHANNEL_LETTERS[header.modeName];
      return { channels, letters: letters ? channels.map((c) => letters[c]) : undefined };
    },
  },
  channelMixer: {
    keys: ['mixr'],
    parse: (r: Reader) => {
      r.skip(2); // version
      const monochrome = r.int16() > 0;
      const channels = Array.from({ length: 4 }, () => ({
        redCyan: r.int16(),
        greenMagenta: r.int16(),
        blueYellow: r.int16(),
        black: r.int16(),
        constant: r.int16(),
      }));
      return { monochrome, channels };
    },
  },
  colorBalance: {
    keys: ['blnc'],
    parse: (r: Reader) => {
      const range = () => ({ cyanRed: r.int16(), magentaGreen: r.int16(), yellowBlue: r.int16() });
      return { shadows: range(), midtones: range(), highlights: range(), preserveLuminosity: r.int16() > 0 };
    },
  },
  colorLookup: { keys: ['clrL'], parse: descriptorAfter(6) },
  /** Brightness/contrast in Photoshop CS3+. */
  contentGenerator: {
    keys: ['CgEd'],
    parse: (r: Reader) => {
      const d = descriptorAfter(4)(r);
      return {
        brightness: d.Brgh as number,
        contrast: d.Cntr as number,
        meanValue: d.means as number,
        labColor: d['Lab '] as boolean,
        useLegacy: d.useLegacy as boolean,
        auto: d.Auto as boolean,
        data: d,
      };
    },
  },
  curves: { keys: ['curv'], parse: readCurves },
  effectsLayer: { keys: ['lrFX'], parse: readEffectsLayer },
  exposure: {
    keys: ['expA'],
    parse: (r: Reader) => {
      r.skip(2); // version
      return { exposure: r.float32(), offset: r.float32(), gamma: r.float32() };
    },
  },
  /** 0-255. */
  fillOpacity: { keys: ['iOpa'], parse: (r: Reader) => r.uint8() },
  gradientFill: { keys: ['GdFl'], parse: descriptorAfter(4) },
  gradientMap: { keys: ['grdm'], parse: readGradientMap },
  hueSaturation: { keys: ['hue2'], parse: readHueSaturation },
  /** Present (and `true`) on invert adjustment layers. */
  invert: { keys: ['nvrt'], parse: () => true },
  knockout: {
    keys: ['knko'],
    parse: (r: Reader) => {
      const value = r.uint8();
      return { enabled: value > 0, mode: value === 1 ? ('shallow' as const) : value === 2 ? ('deep' as const) : undefined };
    },
  },
  layerId: { keys: ['lyid'], parse: (r: Reader) => r.int32() },
  layerMaskAsGlobalMask: { keys: ['lmgm'], parse: flag },
  /** Minimum Photoshop version needed to read the layer, times 10 (70 = 7.0). */
  layerVersion: { keys: ['lyvr'], parse: (r: Reader) => r.int32() },
  layerNameSource: { keys: ['lnsr'], parse: (r: Reader) => r.ascii(4) },
  legacyTypeTool: { keys: ['tySh'], parse: readLegacyTypeTool },
  levels: { keys: ['levl'], parse: readLevels },
  locked: {
    keys: ['lspf'],
    parse: (r: Reader) => {
      const value = r.int32();
      const all = value === -2147483648;
      const locked = {
        transparency: all || (value & 0x01) > 0,
        composite: all || (value & 0x02) > 0,
        position: all || (value & 0x04) > 0,
        all: false,
      };
      locked.all = locked.transparency && locked.composite && locked.position;
      return locked;
    },
  },
  metadata: { keys: ['shmd'], parse: readMetadata },
  /** The Unicode layer name. */
  name: { keys: ['luni'], parse: (r: Reader) => r.unicode() },
  /** Group markers in files that lack `sectionDivider`. */
  nestedSectionDivider: {
    keys: ['lsdk'],
    parse: (r: Reader) => {
      const code = r.int32();
      return { isFolder: code === 1 || code === 2, isHidden: code === 3 };
    },
  },
  /** Layer styles (drop shadow, stroke, etc.). Photoshop stores a group's styles in `lfxs`. */
  objectEffects: { keys: ['lfx2', 'lmfx', 'lfxs'], parse: (r: Reader) => readLayerStyles(descriptorAfter(8)(r)) },
  patternFill: { keys: ['PtFl'], parse: descriptorAfter(4) },
  photoFilter: { keys: ['phfl'], parse: readPhotoFilter },
  /** Smart object data: the raw descriptor plus its normalized source and placement. */
  placedLayer: { keys: ['SoLd', 'SoLE'], parse: (r: Reader) => readPlacedLayer(descriptorAfter(12)(r)) },
  posterize: { keys: ['post'], parse: (r: Reader) => r.int16() },
  referencePoint: { keys: ['fxrp'], parse: (r: Reader) => ({ x: r.float64(), y: r.float64() }) },
  sectionDivider: { keys: ['lsct'], parse: readDivider },
  selectiveColor: { keys: ['selc'], parse: readSelectiveColor },
  /** The layer's color label. */
  sheetColor: { keys: ['lclr'], parse: (r: Reader) => SHEET_COLORS[r.int16()] ?? 'none' },
  solidColor: {
    keys: ['SoCo'],
    parse: (r: Reader) => {
      const data = descriptorAfter(4)(r);
      const c = data['Clr '];
      return { r: Math.round(c['Rd  ']), g: Math.round(c['Grn ']), b: Math.round(c['Bl  ']), data };
    },
  },
  threshold: { keys: ['thrs'], parse: (r: Reader) => r.int16() },
  transparencyShapesLayer: { keys: ['tsly'], parse: (r: Reader) => r.uint8() === 1 },
  typeTool: { keys: ['TySh'], parse: (r: Reader) => new TypeTool(r) },
  vectorMask: {
    keys: ['vmsk', 'vsms'],
    parse: (r: Reader, { length }: Ctx) => {
      r.skip(4); // version
      const flags = r.int32();
      return {
        invert: (flags & 0x01) > 0,
        notLink: (flags & 0x02) > 0,
        disable: (flags & 0x04) > 0,
        paths: readPathRecords(r, Math.floor((length - 8) / 26)),
      };
    },
  },
  vectorMaskAsGlobalMask: { keys: ['vmgm'], parse: flag },
  vectorOrigination: { keys: ['vogk'], parse: descriptorAfter(8) },
  vectorStroke: { keys: ['vstk'], parse: descriptorAfter(4) },
  vectorStrokeContent: { keys: ['vscg'], parse: descriptorAfter(8) },
  vibrance: {
    keys: ['vibA'],
    parse: (r: Reader) => {
      const data = descriptorAfter(4)(r);
      return { vibrance: data.vibrance as number | undefined, saturation: data['Strt'] as number | undefined, data };
    },
  },
} satisfies Record<string, { keys: string[]; parse: Parser }>;

export type LayerInfo = {
  readonly [K in keyof typeof LAYER_INFO]?: ReturnType<(typeof LAYER_INFO)[K]['parse']>;
};

const BY_KEY = new Map<string, [string, Parser]>(
  Object.entries(LAYER_INFO).flatMap(([name, { keys, parse }]) => keys.map((key) => [key, [name, parse as Parser]] as const)),
);

/** Builds the `layer.info` object: one memoized getter per known block present in the layer. */
export function createLayerInfo(reader: Reader, blocks: InfoBlock[], header: Header): LayerInfo {
  const info = {};
  for (const block of blocks) {
    const entry = BY_KEY.get(block.key);
    if (!entry || Object.hasOwn(info, entry[0])) continue;
    const [name, parse] = entry;
    let value: unknown;
    let parsed = false;
    Object.defineProperty(info, name, {
      enumerable: true,
      get() {
        if (!parsed) {
          value = parse(reader.at(block.offset), { header, length: block.length, end: block.offset + block.length });
          parsed = true;
        }
        return value;
      },
    });
  }
  return info;
}
