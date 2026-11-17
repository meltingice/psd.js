import type { Layer } from './layer.ts';
import { encodePng, inflate } from './png.ts';
import type { Header } from './psd.ts';
import type { Reader } from './reader.ts';
import type { Resources } from './resources.ts';

export interface RGBAImage {
  width: number;
  height: number;
  /** RGBA, 4 bytes per pixel. Pass to `new ImageData(data, width, height)` in browsers. */
  data: Uint8ClampedArray;
}

export interface GrayImage {
  width: number;
  height: number;
  /** 1 byte per pixel. */
  data: Uint8Array;
}

/** Indexed color details needed to turn indexes into colors. */
interface Palette {
  /** 256 reds, then 256 greens, then 256 blues. */
  colors: Uint8Array;
  count: number;
  transparentIndex: number | undefined;
}

/** Number of color channels in a mode. Any single extra channel is transparency. */
function colorChannels(header: Header): number {
  const { mode, depth, channels } = header;
  if (mode === 0) {
    if (depth !== 1) throw new Error(`Unexpected ${depth}-bit bitmap image`);
    return 1;
  }
  if (depth !== 8 && depth !== 16) throw new Error(`Decoding ${depth}-bit images is not supported`);
  switch (mode) {
    case 1: // Grayscale
    case 8: // Duotone, stored as grayscale
      return 1;
    case 2: // Indexed
      if (depth !== 8) throw new Error(`Unexpected ${depth}-bit indexed image`);
      return 1;
    case 3: // RGB
    case 9: // Lab
      return 3;
    case 4: // CMYK
      return 4;
    case 7: // Multichannel, approximated as CMY(K) inks like Photoshop's default channel colors
      if (channels !== 3 && channels !== 4) throw new Error(`Decoding ${channels}-channel multichannel images is not supported`);
      return channels;
    default:
      throw new Error(`Decoding ${header.modeName} images is not supported`);
  }
}

const rowBytes = (width: number, depth: number) => Math.ceil((width * depth) / 8);

const readCounts = (r: Reader, rows: number, isBig: boolean) =>
  Array.from({ length: rows }, () => (isBig ? r.uint32() : r.uint16()));

/** Decodes PackBits rows. */
function unpackBits(r: Reader, counts: number[], rowLength: number): Uint8Array {
  const out = new Uint8Array(rowLength * counts.length);
  let o = 0;
  for (const count of counts) {
    const end = r.pos + count;
    while (r.pos < end) {
      const n = r.int8();
      if (n >= 0) {
        out.set(r.bytesView(n + 1), o);
        o += n + 1;
      } else if (n !== -128) {
        out.fill(r.uint8(), o, o + 1 - n);
        o += 1 - n;
      }
    }
  }
  return out;
}

/** Reverses ZIP prediction: each sample is stored as the delta from the previous one in its row. */
export function unpredict(data: Uint8Array, width: number, height: number, depth: number): Uint8Array {
  if (depth === 8) {
    for (let y = 0; y < height; y++) {
      for (let i = y * width + 1; i < (y + 1) * width; i++) data[i] = (data[i]! + data[i - 1]!) & 0xff;
    }
  } else if (depth === 16) {
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    for (let y = 0; y < height; y++) {
      for (let x = 1; x < width; x++) {
        const i = (y * width + x) * 2;
        view.setUint16(i, view.getUint16(i) + view.getUint16(i - 2));
      }
    }
  } else {
    throw new Error(`ZIP prediction is not supported for ${depth}-bit images`);
  }
  return data;
}

/** Reduces samples to 8 bits: keeps the high byte of 16-bit samples and expands 1-bit pixels (1 = black). */
function to8Bit(data: Uint8Array, depth: number, width: number, height: number): Uint8Array {
  if (depth === 8) return data;
  if (depth === 16) {
    const out = new Uint8Array(data.length / 2);
    for (let i = 0; i < out.length; i++) out[i] = data[i * 2]!;
    return out;
  }
  const out = new Uint8Array(width * height);
  const stride = rowBytes(width, 1);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[y * width + x] = data[y * stride + (x >> 3)]! & (0x80 >> (x & 7)) ? 0 : 255;
    }
  }
  return out;
}

/** Decodes the data of a single layer channel, which starts with its own compression type. */
async function readLayerChannel(r: Reader, length: number, width: number, height: number, header: Header): Promise<Uint8Array> {
  const end = r.pos + length;
  const compression = r.uint16();
  const { depth } = header;
  if (width === 0 || height === 0) return new Uint8Array();

  let data: Uint8Array;
  switch (compression) {
    case 0:
      data = r.bytesView(rowBytes(width, depth) * height);
      break;
    case 1:
      data = unpackBits(r, readCounts(r, height, header.isBig), rowBytes(width, depth));
      break;
    case 2:
    case 3:
      data = await inflate(r.bytesView(end - r.pos));
      if (compression === 3) unpredict(data, width, height, depth);
      break;
    default:
      throw new Error(`Unknown compression type ${compression}`);
  }
  return to8Bit(data, depth, width, height);
}

/** Converts in-file CMYK (stored inverted) to RGB. */
function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  const convert = (v: number) => Math.min(Math.max((65535 - (v * (255 - k) + (k << 8))) >> 8, 0), 255);
  return [convert(c), convert(m), convert(y)];
}

/** Converts 8-bit encoded Lab (L 0-255 for 0-100, a and b offset by 128) to sRGB, using a D65 white point. */
export function labToRgb(l: number, a: number, b: number): [number, number, number] {
  const fy = ((l * 100) / 255 + 16) / 116;
  const fx = fy + (a - 128) / 500;
  const fz = fy - (b - 128) / 200;
  const inverse = (t: number) => (t > 6 / 29 ? t ** 3 : 3 * (6 / 29) ** 2 * (t - 4 / 29));
  const [x, y, z] = [0.95047 * inverse(fx), inverse(fy), 1.08883 * inverse(fz)];
  const gamma = (v: number) => {
    const c = v > 0.0031308 ? 1.055 * v ** (1 / 2.4) - 0.055 : 12.92 * v;
    return Math.round(Math.min(Math.max(c, 0), 1) * 255);
  };
  return [
    gamma(3.2406 * x - 1.5372 * y - 0.4986 * z),
    gamma(-0.9689 * x + 1.8758 * y + 0.0415 * z),
    gamma(0.0557 * x - 0.204 * y + 1.057 * z),
  ];
}

/** Combines 8-bit channels (keyed by channel ID) into RGBA. Missing channels read as 0. */
function combine(width: number, height: number, mode: number, channels: Map<number, Uint8Array>, palette?: Palette): Uint8ClampedArray {
  const n = width * height;
  const out = new Uint8ClampedArray(n * 4);
  const empty = new Uint8Array(n);
  const ch = (id: number) => channels.get(id) ?? empty;
  const [c0, c1, c2] = [ch(0), ch(1), ch(2)];
  // Multichannel files may have no fourth ink; 255 is "no ink" since values are stored inverted.
  const c3 = channels.get(3) ?? new Uint8Array(n).fill(255);
  const alpha = channels.get(-1);

  for (let i = 0; i < n; i++) {
    let rgb: [number, number, number];
    let a = alpha ? alpha[i]! : 255;
    switch (mode) {
      case 3:
        rgb = [c0[i]!, c1[i]!, c2[i]!];
        break;
      case 4:
      case 7:
        rgb = cmykToRgb(255 - c0[i]!, 255 - c1[i]!, 255 - c2[i]!, 255 - c3[i]!);
        break;
      case 9:
        rgb = labToRgb(c0[i]!, c1[i]!, c2[i]!);
        break;
      case 2: {
        if (!palette) throw new Error('Indexed image has no color table');
        const index = c0[i]!;
        const { colors, count, transparentIndex } = palette;
        rgb = [colors[index]!, colors[256 + index]!, colors[512 + index]!];
        if (index >= count || index === transparentIndex) a = 0;
        break;
      }
      default: {
        const g = c0[i]!;
        rgb = [g, g, g];
      }
    }
    out.set(rgb, i * 4);
    out[i * 4 + 3] = a;
  }
  return out;
}

/** The flattened composite image stored at the end of the file. */
export class CompositeImage {
  readonly #reader: Reader;
  readonly #header: Header;
  readonly #resources: () => Resources;
  #decoded: Promise<RGBAImage> | undefined;

  constructor(reader: Reader, header: Header, resources: () => Resources) {
    this.#reader = reader;
    this.#header = header;
    this.#resources = resources;
  }

  get width(): number {
    return this.#header.width;
  }

  get height(): number {
    return this.#header.height;
  }

  /**
   * Decodes the pixels. Photoshop only stores a full composite when "Maximize Compatibility"
   * is enabled; otherwise this is blank.
   */
  decode(): Promise<RGBAImage> {
    return (this.#decoded ??= this.#decode());
  }

  async #decode(): Promise<RGBAImage> {
    const header = this.#header;
    const colorCount = colorChannels(header);
    const { width, height, depth, channels: count } = header;
    const r = this.#reader.at(this.#reader.pos);
    const compression = r.uint16();
    const planeBytes = rowBytes(width, depth) * height;

    let planes: Uint8Array[];
    if (compression === 0) {
      planes = Array.from({ length: count }, () => r.bytesView(planeBytes));
    } else if (compression === 1) {
      const counts = readCounts(r, count * height, header.isBig);
      planes = Array.from({ length: count }, (_, c) => unpackBits(r, counts.slice(c * height, (c + 1) * height), rowBytes(width, depth)));
    } else if (compression === 2 || compression === 3) {
      const data = await inflate(r.bytesView(r.bytes.length - r.pos));
      planes = Array.from({ length: count }, (_, c) => {
        const plane = data.subarray(c * planeBytes, (c + 1) * planeBytes);
        return compression === 3 ? unpredict(plane, width, height, depth) : plane;
      });
    } else {
      throw new Error(`Unknown compression type ${compression}`);
    }

    const channels = new Map<number, Uint8Array>();
    planes.slice(0, colorCount).forEach((p, i) => channels.set(i, to8Bit(p, depth, width, height)));
    // A single extra channel is transparency; more than that are saved selections and spot colors.
    if (count === colorCount + 1) channels.set(-1, to8Bit(planes[colorCount]!, depth, width, height));

    let palette: Palette | undefined;
    if (header.mode === 2) {
      const resources = this.#resources();
      palette = { colors: header.colorModeData, count: resources.indexedColorCount ?? 256, transparentIndex: resources.transparencyIndex };
    }
    return { width, height, data: combine(width, height, header.mode, channels, palette) };
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}

/** A layer's pixels and user mask. */
export class LayerImage {
  readonly #layer: Layer;
  readonly #reader: Reader;
  #decoded: Promise<RGBAImage> | undefined;

  constructor(layer: Layer, reader: Reader) {
    this.#layer = layer;
    this.#reader = reader;
  }

  get width(): number {
    return this.#layer.width;
  }

  get height(): number {
    return this.#layer.height;
  }

  /** Whether the layer has a user (pixel) mask. */
  get hasMask(): boolean {
    return this.#layer.mask !== undefined && this.#layer.channels.some((c) => c.id === -2);
  }

  /** Decodes the layer pixels. The mask is not applied; see `decodeMask()`. */
  decode(): Promise<RGBAImage> {
    return (this.#decoded ??= this.#decode());
  }

  async #decode(): Promise<RGBAImage> {
    const layer = this.#layer;
    colorChannels(layer.header);
    const channels = new Map<number, Uint8Array>();
    for (const c of layer.channels) {
      if (c.id < -1) continue;
      channels.set(c.id, await readLayerChannel(this.#reader.at(c.offset), c.length, layer.width, layer.height, layer.header));
    }
    return { width: layer.width, height: layer.height, data: combine(layer.width, layer.height, layer.header.mode, channels) };
  }

  /** Decodes the user mask as grayscale, positioned at `layer.mask`. */
  async decodeMask(): Promise<GrayImage | undefined> {
    const { mask, channels, header } = this.#layer;
    const channel = channels.find((c) => c.id === -2);
    if (!mask || !channel) return undefined;
    colorChannels(header);
    const data = await readLayerChannel(this.#reader.at(channel.offset), channel.length, mask.width, mask.height, header);
    return { width: mask.width, height: mask.height, data };
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}
