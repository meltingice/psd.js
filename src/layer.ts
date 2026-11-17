import { LayerImage } from './image.ts';
import { createLayerInfo, type LayerInfo } from './layer-info.ts';
import type { Header } from './psd.ts';
import { pad2, type Reader } from './reader.ts';
import type { Resources } from './resources.ts';

export const BLEND_MODES = {
  norm: 'normal',
  dark: 'darken',
  lite: 'lighten',
  hue: 'hue',
  sat: 'saturation',
  colr: 'color',
  lum: 'luminosity',
  mul: 'multiply',
  scrn: 'screen',
  diss: 'dissolve',
  over: 'overlay',
  hLit: 'hard_light',
  sLit: 'soft_light',
  diff: 'difference',
  smud: 'exclusion',
  div: 'color_dodge',
  idiv: 'color_burn',
  lbrn: 'linear_burn',
  lddg: 'linear_dodge',
  vLit: 'vivid_light',
  lLit: 'linear_light',
  pLit: 'pin_light',
  hMix: 'hard_mix',
  pass: 'passthru',
  dkCl: 'darker_color',
  lgCl: 'lighter_color',
  fsub: 'subtract',
  fdiv: 'divide',
} as const;

export type BlendMode = (typeof BLEND_MODES)[keyof typeof BLEND_MODES];

export const blendModeName = (key: string): BlendMode | undefined => BLEND_MODES[key.trim() as keyof typeof BLEND_MODES];

export interface ChannelInfo {
  /** 0, 1, 2... are color channels, -1 is transparency, -2 the user mask, -3 the real user mask. */
  id: number;
  length: number;
  /** Offset of the channel's image data in the file. */
  offset: number;
}

export interface Mask {
  top: number;
  left: number;
  bottom: number;
  right: number;
  width: number;
  height: number;
  defaultColor: number;
  /** Position is relative to the layer. */
  relative: boolean;
  disabled: boolean;
  invert: boolean;
}

export interface BlendingRange {
  source: { black: [number, number]; white: [number, number] };
  dest: { black: [number, number]; white: [number, number] };
}

export interface BlendingRanges {
  grey: BlendingRange;
  channels: BlendingRange[];
}

/** A tagged block found in a layer record, located by file offset. */
export interface InfoBlock {
  key: string;
  offset: number;
  length: number;
}

export interface GlobalMask {
  overlayColorSpace: number;
  colorComponents: number[];
  /** 0 (transparent) to 100 (opaque). */
  opacity: number;
  /** 0 = color selected, 1 = color protected, 128 = use value stored per layer. */
  kind: number;
}

/** Tagged block keys whose length is 8 bytes in PSB files. */
const BIG_KEYS = new Set(['LMsk', 'Lr16', 'Lr32', 'Layr', 'Mt16', 'Mt32', 'Mtrn', 'Alph', 'FMsk', 'lnk2', 'FEid', 'FXid', 'PxSD']);

export const readBlockLength = (r: Reader, header: Header, key: string) =>
  header.isBig && BIG_KEYS.has(key) ? r.int64() : r.uint32();

/**
 * A raw layer record. Section dividers (the start and end markers of groups) are layers too;
 * use `psd.tree` for the document hierarchy.
 */
export class Layer {
  readonly header: Header;
  readonly top: number;
  readonly left: number;
  readonly bottom: number;
  readonly right: number;
  readonly channels: ChannelInfo[] = [];
  /** The raw 4-character blend mode key, e.g. `norm`. */
  readonly blendKey: string;
  /** 0-255. */
  readonly opacity: number;
  /** Clipped to the layer below it. */
  readonly clipped: boolean;
  readonly flags: number;
  readonly mask: Mask | undefined;
  readonly blendingRanges: BlendingRanges | undefined;
  /** The pre-Photoshop 5 name. Prefer `name`. */
  readonly legacyName: string;
  /** Every tagged block key in this layer, including ones this library can't parse. */
  readonly infoBlocks: InfoBlock[] = [];
  /** Parsed additional layer information, keyed by name. Each block is parsed on first access. */
  readonly info: LayerInfo;
  readonly #reader: Reader;
  readonly #resources: () => Resources;
  #image: LayerImage | undefined;

  constructor(r: Reader, header: Header, resources: () => Resources) {
    this.header = header;
    this.#reader = r;
    this.#resources = resources;
    this.top = r.int32();
    this.left = r.int32();
    this.bottom = r.int32();
    this.right = r.int32();

    const channelCount = r.uint16();
    for (let i = 0; i < channelCount; i++) {
      this.channels.push({ id: r.int16(), length: header.isBig ? r.int64() : r.uint32(), offset: 0 });
    }

    r.skip(4); // signature, 8BIM
    this.blendKey = r.ascii(4);
    this.opacity = r.uint8();
    this.clipped = r.uint8() === 1;
    this.flags = r.uint8();
    r.skip(1); // filler

    const extraLength = r.uint32();
    const end = r.pos + extraLength;

    this.mask = readMask(r);
    this.blendingRanges = readBlendingRanges(r);

    const nameLength = ((r.uint8() + 4) & ~3) - 1; // padded to a multiple of 4, including the length byte
    this.legacyName = r.ascii(nameLength);

    while (r.pos < end) {
      r.skip(4); // signature, 8BIM or 8B64
      const key = r.ascii(4);
      const length = pad2(readBlockLength(r, header, key));
      this.infoBlocks.push({ key, offset: r.pos, length });
      r.skip(length);
    }
    r.seek(end);

    this.info = createLayerInfo(r, this.infoBlocks, header);
  }

  get width(): number {
    return this.right - this.left;
  }

  get height(): number {
    return this.bottom - this.top;
  }

  get name(): string {
    return this.info.name ?? this.legacyName;
  }

  /** The layer's unique ID, if the file has one. */
  get id(): number | undefined {
    return this.info.layerId;
  }

  get visible(): boolean {
    return (this.flags & 0x02) === 0;
  }

  get blendMode(): BlendMode | undefined {
    const dividerMode = this.info.sectionDivider?.blendMode;
    return blendModeName(dividerMode ?? this.blendKey);
  }

  /** 0-255. */
  get fillOpacity(): number {
    return this.info.fillOpacity ?? 255;
  }

  /** Starts a group (folder) in the flat layer list. */
  get isFolder(): boolean {
    const divider = this.info.sectionDivider ?? this.info.nestedSectionDivider;
    return divider ? divider.isFolder : this.name === '<Layer group>';
  }

  /** Ends a group in the flat layer list. */
  get isFolderEnd(): boolean {
    const divider = this.info.sectionDivider ?? this.info.nestedSectionDivider;
    return divider ? divider.isHidden : this.name === '</Layer group>';
  }

  /** The layer's pixels. Decoding happens on demand. */
  get image(): LayerImage {
    return (this.#image ??= new LayerImage(this, this.#reader, this.#resources));
  }
}

function readMask(r: Reader): Mask | undefined {
  const size = r.uint32();
  if (size === 0) return undefined;
  const end = r.pos + size;
  const top = r.int32();
  const left = r.int32();
  const bottom = r.int32();
  const right = r.int32();
  const defaultColor = r.uint8();
  const flags = r.uint8();
  r.seek(end);
  return {
    top,
    left,
    bottom,
    right,
    width: right - left,
    height: bottom - top,
    defaultColor,
    relative: (flags & 0x01) > 0,
    disabled: (flags & 0x02) > 0,
    invert: (flags & 0x04) > 0,
  };
}

function readBlendingRanges(r: Reader): BlendingRanges | undefined {
  const length = r.uint32();
  if (length === 0) return undefined;
  const end = r.pos + length;
  const pair = (): [number, number] => [r.uint8(), r.uint8()];
  const range = (): BlendingRange => ({ source: { black: pair(), white: pair() }, dest: { black: pair(), white: pair() } });
  const grey = range();
  const channels = Array.from({ length: (length - 8) / 8 }, range);
  r.seek(end);
  return { grey, channels };
}

export interface LayerSection {
  /** Top to bottom, including group start/end dividers. */
  layers: Layer[];
  globalMask: GlobalMask | undefined;
  /** The first alpha channel of the composite image holds the merged transparency. */
  mergedAlpha: boolean;
}

/**
 * Parses the layer and mask information section. `r` is positioned at its length field.
 * `resources` is only read when decoding indexed color layers, which need the color table.
 */
export function readLayerSection(r: Reader, header: Header, resources: () => Resources): LayerSection {
  const section: LayerSection = { layers: [], globalMask: undefined, mergedAlpha: false };
  const length = header.isBig ? r.int64() : r.uint32();
  const end = r.pos + length;
  if (length === 0) return section;

  const readLayers = (infoLength: number) => {
    const infoEnd = r.pos + infoLength;
    if (infoLength > 0) {
      const count = r.int16();
      if (count < 0) section.mergedAlpha = true;
      const layers = Array.from({ length: Math.abs(count) }, () => new Layer(r, header, resources));

      // Channel image data follows the records, in layer order then channel order.
      let offset = r.pos;
      for (const layer of layers) {
        for (const channel of layer.channels) {
          channel.offset = offset;
          offset += channel.length;
        }
      }
      section.layers.push(...layers);
    }
    r.seek(infoEnd);
  };

  readLayers(pad2(header.isBig ? r.int64() : r.uint32()));
  section.globalMask = readGlobalMask(r);

  // 16 and 32-bit documents store their layers in an Lr16 or Lr32 block after the global mask.
  // The main section may hold 8-bit compatibility copies, which these replace. Some files use a
  // Layr block instead, and some pad the blocks with zero bytes.
  while (r.pos + 12 <= end) {
    if (r.bytes[r.pos] === 0) {
      r.skip(1);
      continue;
    }
    const sig = r.ascii(4);
    if (sig !== '8BIM' && sig !== '8B64') break;
    const key = r.ascii(4);
    const blockLength = pad2(readBlockLength(r, header, key));
    const blockEnd = r.pos + blockLength;
    if (key === `Lr${header.depth}`) {
      section.layers = [];
      readLayers(blockLength);
    } else if (key === 'Layr' && section.layers.length === 0) {
      readLayers(blockLength);
    }
    r.seek(blockEnd);
  }

  section.layers.reverse();
  r.seek(end);
  return section;
}

function readGlobalMask(r: Reader): GlobalMask | undefined {
  const length = r.uint32();
  if (length === 0) return undefined;
  const end = r.pos + length;
  const mask = {
    overlayColorSpace: r.int16(),
    colorComponents: [0, 0, 0, 0].map(() => r.uint16() >> 8),
    opacity: r.uint16(),
    kind: r.uint8(),
  };
  r.seek(end);
  return mask;
}
