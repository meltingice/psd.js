import { CompositeImage } from './image.ts';
import { readLayerSection, type GlobalMask, type Layer, type LayerSection } from './layer.ts';
import { RootNode } from './nodes.ts';
import { readPatterns, type Pattern } from './patterns.ts';
import { Reader } from './reader.ts';
import { Resources } from './resources.ts';

export const MODES = [
  'Bitmap',
  'GrayScale',
  'IndexedColor',
  'RGBColor',
  'CMYKColor',
  'HSLColor',
  'HSBColor',
  'Multichannel',
  'Duotone',
  'LabColor',
  'Gray16',
  'RGB48',
  'Lab48',
  'CMYK64',
  'DeepMultichannel',
  'Duotone16',
] as const;

export interface Header {
  /** 1 for PSD, 2 for PSB (large document format). */
  version: 1 | 2;
  /** Whether this is a PSB (large document format) file. */
  isBig: boolean;
  /** Number of channels in the composite image, including alpha channels. */
  channels: number;
  width: number;
  height: number;
  /** Bits per channel: 1, 8, 16 or 32. */
  depth: number;
  /** Color mode ID; see `modeName`. */
  mode: number;
  modeName: (typeof MODES)[number] | 'Unknown';
  /** Color mode data: the palette for indexed images, or duotone specifications. */
  colorModeData: Uint8Array;
}

function readHeader(r: Reader): Header {
  const signature = r.ascii(4);
  if (signature !== '8BPS') throw new Error(`Invalid file signature '${signature}', expected '8BPS'`);
  const version = r.uint16();
  if (version !== 1 && version !== 2) throw new Error(`Unsupported PSD version ${version}`);
  r.skip(6); // reserved
  const channels = r.uint16();
  const height = r.uint32();
  const width = r.uint32();
  const depth = r.uint16();
  const mode = r.uint16();
  const colorModeData = r.bytesView(r.uint32());
  return { version, isBig: version === 2, channels, width, height, depth, mode, modeName: MODES[mode] ?? 'Unknown', colorModeData };
}

/**
 * A Photoshop document (PSD or PSB). Construction only reads the header and locates each
 * section; everything else is parsed on first access.
 *
 * ```ts
 * const psd = new PSD(await readFile('file.psd'));
 * console.log(psd.tree.toJSON());
 * ```
 */
export class PSD {
  readonly header: Header;
  readonly #reader: Reader;
  readonly #resourcesOffset: number;
  readonly #layersOffset: number;
  readonly #imageOffset: number;
  #resources: Resources | undefined;
  #layerSection: LayerSection | undefined;
  #image: CompositeImage | undefined;
  #tree: RootNode | undefined;
  #patterns: Pattern[] | undefined;

  constructor(data: ArrayBuffer | ArrayBufferView) {
    const bytes = ArrayBuffer.isView(data) ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : new Uint8Array(data);
    const r = new Reader(bytes);
    this.#reader = r;
    this.header = readHeader(r);

    this.#resourcesOffset = r.pos;
    r.skip(r.uint32());
    this.#layersOffset = r.pos;
    r.skip(this.header.isBig ? r.int64() : r.uint32());
    this.#imageOffset = r.pos;
    if (this.#imageOffset > bytes.length) throw new Error('File is truncated');
  }

  get width(): number {
    return this.header.width;
  }

  get height(): number {
    return this.header.height;
  }

  /** Image resources: layer comps, guides, slices, resolution and more. */
  get resources(): Resources {
    if (!this.#resources) {
      const r = this.#reader.at(this.#resourcesOffset);
      const length = r.uint32();
      this.#resources = new Resources(r, r.pos + length);
    }
    return this.#resources;
  }

  get #layers(): LayerSection {
    return (this.#layerSection ??= readLayerSection(this.#reader.at(this.#layersOffset), this.header, () => this.resources));
  }

  /** Every layer record from top to bottom, including group dividers. Use `tree` for the hierarchy. */
  get layers(): Layer[] {
    return this.#layers.layers;
  }

  get globalMask(): GlobalMask | undefined {
    return this.#layers.globalMask;
  }

  /**
   * The patterns used by pattern fills, overlays and strokes, which refer to them by `id`.
   * Pixels are decoded on demand with `pattern.decode()`.
   */
  get patterns(): Pattern[] {
    return (this.#patterns ??= this.#layers.infoBlocks
      .filter((b) => ['Patt', 'Pat2', 'Pat3'].includes(b.key))
      .flatMap((b) => readPatterns(this.#reader.at(b.offset), b.offset + b.length)));
  }

  /** The flattened composite image. */
  get image(): CompositeImage {
    return (this.#image ??= new CompositeImage(this.#reader.at(this.#imageOffset), this.header, () => this.resources));
  }

  /** The document as a tree of groups and layers. */
  get tree(): RootNode {
    return (this.#tree ??= new RootNode(this));
  }
}
