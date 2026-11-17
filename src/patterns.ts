import { decodePlanes, type Plane, type RGBAImage } from './image.ts';
import { encodePng } from './png.ts';
import { MODES, type Header } from './psd.ts';
import type { Reader } from './reader.ts';

interface PatternPlane extends Plane {
  depth: number;
  width: number;
  height: number;
}

/**
 * A pattern from the document's `Patt`, `Pat2` or `Pat3` blocks. Pattern fills and overlays refer
 * to it by `id`. The pixels are decoded on demand.
 */
export class Pattern {
  /** The unique ID that pattern fills (`info.patternFill.Ptrn.Idnt`) and layer styles (`pattern.id`) refer to. */
  readonly id: string;
  /** The name. Photoshop's presets have localizable names like `$$$/Presets/Patterns/Water=Water`. */
  readonly name: string;
  readonly width: number;
  readonly height: number;
  /** Color mode ID, as in `psd.header.mode`. */
  readonly mode: number;
  readonly #reader: Reader;
  readonly #colorTable: Uint8Array = new Uint8Array(0);
  readonly #planes: PatternPlane[] = [];

  constructor(r: Reader) {
    this.#reader = r;
    const version = r.uint32();
    if (version !== 1) throw new Error(`Unsupported pattern version ${version}`);
    this.mode = r.uint32();
    r.skip(4); // height and width (2 bytes each), also in the rectangle below
    this.name = r.unicode();
    this.id = r.pascal();

    // An indexed pattern's color table is 256 RGB triplets. The 4 bytes after it are undocumented
    // and skipped as in psd-tools. The decoder wants the reds, then the greens, then the blues.
    if (this.mode === 2) {
      const table = r.bytesView(768);
      this.#colorTable = new Uint8Array(768);
      for (let i = 0; i < 768; i++) this.#colorTable[(i % 3) * 256 + Math.floor(i / 3)] = table[i]!;
      r.skip(4);
    }

    // The pixels are a "virtual memory array list": a rectangle and a slot for each channel, and
    // two more slots for a user mask and the transparency.
    const listVersion = r.uint32();
    if (listVersion !== 3) throw new Error(`Unsupported pattern data version ${listVersion}`);
    r.skip(4); // length
    const [top, left, bottom, right] = [r.uint32(), r.uint32(), r.uint32(), r.uint32()];
    this.width = right - left;
    this.height = bottom - top;
    const colorSlots = r.uint32();
    for (let slot = 0; slot < colorSlots + 2; slot++) {
      if (r.uint32() === 0) continue; // not written
      const length = r.uint32();
      if (length === 0) continue;
      const end = r.pos + length;
      const depth = r.uint32();
      const [planeTop, planeLeft, planeBottom, planeRight] = [r.uint32(), r.uint32(), r.uint32(), r.uint32()];
      r.skip(2); // pixel depth again
      const compression = r.uint8();
      // Written color slots are the color channels in order; the last slot is the transparency.
      const id = slot < colorSlots ? this.#planes.length : slot === colorSlots + 1 ? -1 : undefined;
      const [width, height] = [planeRight - planeLeft, planeBottom - planeTop];
      if (id !== undefined) this.#planes.push({ id, compression, offset: r.pos, end, depth, width, height });
      r.seek(end);
    }
  }

  /** Decodes the pixels. Each call decodes again. */
  async decode(): Promise<RGBAImage> {
    const planes = this.#planes;
    const depth = planes[0]?.depth;
    if (depth === undefined) throw new Error(`Pattern '${this.name}' has no pixel data`);
    for (const p of planes) {
      if (p.depth !== depth || p.width !== this.width || p.height !== this.height) {
        throw new Error(`Pattern '${this.name}' has channels of different sizes or depths`);
      }
    }
    const header: Header = {
      version: 1,
      isBig: false, // RLE row lengths are 2 bytes even in PSB files
      channels: planes.filter((p) => p.id >= 0).length,
      width: this.width,
      height: this.height,
      depth,
      mode: this.mode,
      modeName: MODES[this.mode] ?? 'Unknown',
      colorModeData: this.#colorTable,
    };
    return decodePlanes(this.#reader, header, planes);
  }

  async toPng(): Promise<Uint8Array> {
    return encodePng(await this.decode());
  }
}

/** Reads the patterns in a `Patt`, `Pat2` or `Pat3` block. */
export function readPatterns(r: Reader, end: number): Pattern[] {
  const patterns: Pattern[] = [];
  // Each pattern is a length-prefixed record padded to 4 bytes.
  while (r.pos + 4 <= end) {
    const length = r.uint32();
    if (r.pos + length > end) throw new Error(`Pattern of ${length} bytes overruns its block`);
    patterns.push(new Pattern(r.at(r.pos)));
    r.skip((length + 3) & ~3);
  }
  return patterns;
}
