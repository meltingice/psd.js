import type { Layer } from './layer.ts';
import { encodePng, inflate } from './png.ts';
import type { Header } from './psd.ts';
import type { Reader } from './reader.ts';

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

/** Number of color channels per supported color mode. */
const COLOR_CHANNELS: Record<number, number> = {
  1: 1, // Grayscale
  3: 3, // RGB
  4: 4, // CMYK
  8: 1, // Duotone, stored as grayscale
};

function assertSupported(header: Header): number {
  const colorChannels = COLOR_CHANNELS[header.mode];
  if (colorChannels === undefined) throw new Error(`Decoding ${header.modeName} images is not supported`);
  if (header.depth !== 8 && header.depth !== 16) throw new Error(`Decoding ${header.depth}-bit images is not supported`);
  return colorChannels;
}

const readCounts = (r: Reader, rows: number, isBig: boolean) =>
  Array.from({ length: rows }, () => (isBig ? r.uint32() : r.uint16()));

/** Decodes PackBits rows. */
function unpackBits(r: Reader, counts: number[], rowBytes: number): Uint8Array {
  const out = new Uint8Array(rowBytes * counts.length);
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

/** Reduces samples to 8 bits by keeping the high byte. */
function to8Bit(data: Uint8Array, depth: number): Uint8Array {
  if (depth === 8) return data;
  const out = new Uint8Array(data.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = data[i * 2]!;
  return out;
}

/** Decodes the data of a single layer channel, which starts with its own compression type. */
async function readLayerChannel(r: Reader, length: number, width: number, height: number, header: Header): Promise<Uint8Array> {
  const end = r.pos + length;
  const compression = r.uint16();
  const rowBytes = (width * header.depth) / 8;
  if (width === 0 || height === 0) return new Uint8Array();

  switch (compression) {
    case 0:
      return to8Bit(r.bytesView(rowBytes * height), header.depth);
    case 1:
      return to8Bit(unpackBits(r, readCounts(r, height, header.isBig), rowBytes), header.depth);
    case 2:
    case 3: {
      const data = await inflate(r.bytesView(end - r.pos));
      return to8Bit(compression === 3 ? unpredict(data, width, height, header.depth) : data, header.depth);
    }
    default:
      throw new Error(`Unknown compression type ${compression}`);
  }
}

/** Converts in-file CMYK (stored inverted) to RGB. */
function cmykToRgb(c: number, m: number, y: number, k: number): [number, number, number] {
  const convert = (v: number) => Math.min(Math.max((65535 - (v * (255 - k) + (k << 8))) >> 8, 0), 255);
  return [convert(c), convert(m), convert(y)];
}

/** Combines 8-bit channels (keyed by channel ID) into RGBA. Missing channels read as 0. */
function combine(width: number, height: number, mode: number, channels: Map<number, Uint8Array>): Uint8ClampedArray {
  const n = width * height;
  const out = new Uint8ClampedArray(n * 4);
  const empty = new Uint8Array(n);
  const ch = (id: number) => channels.get(id) ?? empty;
  const alpha = channels.get(-1);

  for (let i = 0; i < n; i++) {
    let rgb: [number, number, number];
    if (mode === 3) {
      rgb = [ch(0)[i]!, ch(1)[i]!, ch(2)[i]!];
    } else if (mode === 4) {
      rgb = cmykToRgb(255 - ch(0)[i]!, 255 - ch(1)[i]!, 255 - ch(2)[i]!, 255 - ch(3)[i]!);
    } else {
      const g = ch(0)[i]!;
      rgb = [g, g, g];
    }
    out.set(rgb, i * 4);
    out[i * 4 + 3] = alpha ? alpha[i]! : 255;
  }
  return out;
}

/** The flattened composite image stored at the end of the file. */
export class CompositeImage {
  readonly #reader: Reader;
  readonly #header: Header;
  #decoded: Promise<RGBAImage> | undefined;

  constructor(reader: Reader, header: Header) {
    this.#reader = reader;
    this.#header = header;
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
    const colorChannels = assertSupported(header);
    const { width, height, depth, channels: count } = header;
    const r = this.#reader.at(this.#reader.pos);
    const compression = r.uint16();
    const planeBytes = ((width * depth) / 8) * height;

    let planes: Uint8Array[];
    if (compression === 0) {
      planes = Array.from({ length: count }, () => r.bytesView(planeBytes));
    } else if (compression === 1) {
      const counts = readCounts(r, count * height, header.isBig);
      planes = Array.from({ length: count }, (_, c) => unpackBits(r, counts.slice(c * height, (c + 1) * height), (width * depth) / 8));
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
    planes.slice(0, colorChannels).forEach((p, i) => channels.set(i, to8Bit(p, depth)));
    // A single extra channel is transparency; more than that are saved selections and spot colors.
    if (count === colorChannels + 1) channels.set(-1, to8Bit(planes[colorChannels]!, depth));

    return { width, height, data: combine(width, height, header.mode, channels) };
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
    assertSupported(layer.header);
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
    assertSupported(header);
    const data = await readLayerChannel(this.#reader.at(channel.offset), channel.length, mask.width, mask.height, header);
    return { width: mask.width, height: mask.height, data };
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}
