import type { ChannelInfo, Layer } from './layer.ts';
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

/** Writes pixel `i` as RGB at `out[o]`. It may also clear the alpha at `out[o + 3]`. */
type PixelWriter = (i: number, out: Uint8ClampedArray, o: number) => void;

/** How a color mode's channels become RGB. */
interface ColorModel {
  /** Number of color channels. Any single extra channel is transparency. */
  colorCount: number;
  /** Binds the color planes to a pixel writer. `plane(id, fill)` returns a missing plane filled with `fill`. */
  writer(plane: (id: number, fill?: number) => Uint8Array): PixelWriter;
}

/** The color model for a document. Throws for formats this library can't decode. Resources are only read for indexed images. */
function colorModel(header: Header, resources: () => Resources): ColorModel {
  const { mode, depth, channels, modeName } = header;
  if ((mode === 0) !== (depth === 1)) throw new Error(`Decoding ${depth}-bit ${modeName} images is not supported`);
  switch (mode) {
    case 0: // Bitmap, expanded to grayscale
    case 1: // Grayscale
    case 8: // Duotone, stored as grayscale
      return {
        colorCount: 1,
        writer: (plane) => {
          const g = plane(0);
          return (i, out, o) => {
            out[o] = out[o + 1] = out[o + 2] = g[i]!;
          };
        },
      };
    case 2: {
      if (depth !== 8) throw new Error(`Unexpected ${depth}-bit indexed image`);
      // The color mode data is the color table: 256 reds, then 256 greens, then 256 blues.
      const colors = header.colorModeData;
      if (colors.length < 768) throw new Error(`Indexed image color table is ${colors.length} bytes, expected 768`);
      const { indexedColorCount: count = 256, transparencyIndex: transparentIndex } = resources();
      return {
        colorCount: 1,
        writer: (plane) => {
          const p = plane(0);
          return (i, out, o) => {
            const index = p[i]!;
            out[o] = colors[index]!;
            out[o + 1] = colors[256 + index]!;
            out[o + 2] = colors[512 + index]!;
            if (index >= count || index === transparentIndex) out[o + 3] = 0;
          };
        },
      };
    }
    case 3:
      return {
        colorCount: 3,
        writer: (plane) => {
          const [r, g, b] = [plane(0), plane(1), plane(2)];
          return (i, out, o) => {
            out[o] = r[i]!;
            out[o + 1] = g[i]!;
            out[o + 2] = b[i]!;
          };
        },
      };
    case 7: // Multichannel, approximated as CMY(K) inks like Photoshop's default channel colors
      if (channels !== 3 && channels !== 4) throw new Error(`Decoding ${channels}-channel multichannel images is not supported`);
    // falls through
    case 4:
      return {
        colorCount: mode === 7 ? channels : 4,
        writer: (plane) => {
          // Values are stored inverted, so 255 is "no ink" for a missing black channel.
          const [c, m, y, k] = [plane(0), plane(1), plane(2), plane(3, 255)];
          return (i, out, o) => {
            const black = 255 - k[i]!;
            out[o] = inkToRgb(255 - c[i]!, black);
            out[o + 1] = inkToRgb(255 - m[i]!, black);
            out[o + 2] = inkToRgb(255 - y[i]!, black);
          };
        },
      };
    case 9:
      return {
        colorCount: 3,
        writer: (plane) => {
          const [l, a, b] = [plane(0), plane(1), plane(2)];
          return (i, out, o) => out.set(labToRgb(l[i]!, a[i]!, b[i]!), o);
        },
      };
    default:
      throw new Error(`Decoding ${modeName} images is not supported`);
  }
}

/** Combines 8-bit planes (keyed by channel ID, -1 for transparency) into RGBA. */
function toRgba(model: ColorModel, planes: Map<number, Uint8Array>, pixels: number): Uint8ClampedArray {
  const write = model.writer((id, fill = 0) => planes.get(id) ?? new Uint8Array(pixels).fill(fill));
  const alpha = planes.get(-1);
  const out = new Uint8ClampedArray(pixels * 4);
  for (let i = 0, o = 0; i < pixels; i++, o += 4) {
    out[o + 3] = alpha ? alpha[i]! : 255;
    write(i, out, o);
  }
  return out;
}

const rowBytes = (width: number, depth: number) => Math.ceil((width * depth) / 8);

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

/**
 * Decodes `count` planes stored back to back after a single compression type, as 8-bit samples.
 * The composite image is stored this way, and so is each layer channel (with a count of 1).
 */
async function readPlanes(r: Reader, end: number, count: number, width: number, height: number, header: Header): Promise<Uint8Array[]> {
  const { depth } = header;
  if (depth !== 1 && depth !== 8 && depth !== 16) throw new Error(`Decoding ${depth}-bit images is not supported`);
  const compression = r.uint16();
  if (width === 0 || height === 0) return Array.from({ length: count }, () => new Uint8Array());

  const stride = rowBytes(width, depth);
  const planeBytes = stride * height;
  let planes: Uint8Array[];
  switch (compression) {
    case 0:
      planes = Array.from({ length: count }, () => r.bytesView(planeBytes));
      break;
    case 1: {
      // Every row's byte count comes first, for all planes.
      const counts = Array.from({ length: count * height }, () => (header.isBig ? r.uint32() : r.uint16()));
      planes = Array.from({ length: count }, (_, c) => unpackBits(r, counts.slice(c * height, (c + 1) * height), stride));
      break;
    }
    case 2:
    case 3: {
      const data = await inflate(r.bytesView(end - r.pos));
      planes = Array.from({ length: count }, (_, c) => data.subarray(c * planeBytes, (c + 1) * planeBytes));
      if (compression === 3) for (const plane of planes) unpredict(plane, width, height, depth);
      break;
    }
    default:
      throw new Error(`Unknown compression type ${compression}`);
  }
  return planes.map((plane) => to8Bit(plane, depth, width, height));
}

/** Decodes a single layer channel. */
const readLayerChannel = async (reader: Reader, channel: ChannelInfo, width: number, height: number, header: Header) =>
  (await readPlanes(reader.at(channel.offset), channel.offset + channel.length, 1, width, height, header))[0]!;

/** Converts a cyan, magenta or yellow ink amount and the black amount to the matching RGB component. */
const inkToRgb = (ink: number, k: number) => Math.min(Math.max((65535 - (ink * (255 - k) + (k << 8))) >> 8, 0), 255);

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
    const { width, height, channels: count } = header;
    const model = colorModel(header, this.#resources);
    const r = this.#reader.at(this.#reader.pos);
    const planes = await readPlanes(r, r.bytes.length, count, width, height, header);

    const channels = new Map(planes.slice(0, model.colorCount).entries());
    // A single extra channel is transparency; more than that are saved selections and spot colors.
    if (count === model.colorCount + 1) channels.set(-1, planes[model.colorCount]!);
    return { width, height, data: toRgba(model, channels, width * height) };
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}

/** A layer's pixels and user mask. */
export class LayerImage {
  readonly #layer: Layer;
  readonly #reader: Reader;
  readonly #resources: () => Resources;
  #decoded: Promise<RGBAImage> | undefined;

  constructor(layer: Layer, reader: Reader, resources: () => Resources) {
    this.#layer = layer;
    this.#reader = reader;
    this.#resources = resources;
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
    const { header, width, height } = this.#layer;
    const model = colorModel(header, this.#resources);
    const planes = new Map<number, Uint8Array>();
    for (const channel of this.#layer.channels) {
      if (channel.id < -1) continue;
      planes.set(channel.id, await readLayerChannel(this.#reader, channel, width, height, header));
    }
    return { width, height, data: toRgba(model, planes, width * height) };
  }

  /** Decodes the user mask as grayscale, positioned at `layer.mask`. */
  async decodeMask(): Promise<GrayImage | undefined> {
    const { mask, channels, header } = this.#layer;
    const channel = channels.find((c) => c.id === -2);
    if (!mask || !channel) return undefined;
    return { width: mask.width, height: mask.height, data: await readLayerChannel(this.#reader, channel, mask.width, mask.height, header) };
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}
