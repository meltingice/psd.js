import { readDescriptor, type Descriptor } from './descriptor.ts';
import { parseEngineData, type EngineDict } from './engine-data.ts';
import type { Reader } from './reader.ts';
import type { Bounds } from './resources.ts';

export interface Transform {
  xx: number;
  xy: number;
  yx: number;
  yy: number;
  tx: number;
  ty: number;
}

export type RGBA = [number, number, number, number];

/** A run of characters that share one style. */
export interface TextRun {
  /** Number of characters in the run. */
  length: number;
  font: string | undefined;
  size: number | undefined;
  color: RGBA | undefined;
  leading: number | 'auto';
  fauxBold: boolean;
  fauxItalic: boolean;
  underline: boolean;
  strikethrough: boolean;
  /** Tracking (letter spacing) in 1/1000 em, as in the Character panel. Multiply by `size / 1000` for pixels. */
  tracking: number;
  /**
   * `'auto'` when the font's kerning is used (Metrics in the Character panel), otherwise manual kerning
   * in 1/1000 em. Photoshop often stores the first character as its own run with a kerning of 0.
   */
  kerning: number | 'auto';
  /** Baseline shift in pixels before `transform` scales the text, like `size`. Positive values raise the text. */
  baselineShift: number;
  /** Small Caps or All Caps from the Character panel. `text` keeps the case it was typed in. */
  caps: TextCaps;
  /** Superscript or subscript from the Character panel. */
  baseline: TextBaseline;
}

const CAPS = ['normal', 'small-caps', 'all-caps'] as const;
export type TextCaps = (typeof CAPS)[number];
const BASELINES = ['normal', 'superscript', 'subscript'] as const;
export type TextBaseline = (typeof BASELINES)[number];

const lookup = <T>(values: readonly T[], key: string, index: number): T => {
  const value = values[index];
  if (value === undefined) throw new Error(`Unknown ${key} value: ${index}`);
  return value;
};

const ALIGNMENTS = ['left', 'right', 'center', 'justify'] as const;
export type TextAlignment = (typeof ALIGNMENTS)[number];

const readTransform = (r: Reader): Transform => ({
  xx: r.float64(),
  xy: r.float64(),
  yx: r.float64(),
  yy: r.float64(),
  tx: r.float64(),
  ty: r.float64(),
});

/** Engine data colors are ARGB floats from 0 to 1. */
const toRGBA = (values: number[]): RGBA => {
  const [a, r, g, b] = values.map((v) => Math.round(v * 255)) as RGBA;
  return [r, g, b, a];
};

const uniq = <T>(values: T[]): T[] => [...new Map(values.map((v) => [JSON.stringify(v), v])).values()];

/** A text layer (the `TySh` block). */
export class TypeTool {
  readonly transform: Transform;
  /** The raw text descriptor. */
  readonly textData: Descriptor;
  /** The raw warp descriptor. */
  readonly warpData: Descriptor;
  #engineData: EngineDict | undefined;

  constructor(r: Reader) {
    r.skip(2); // version
    this.transform = readTransform(r);
    r.skip(6); // text version + descriptor version
    this.textData = readDescriptor(r);
    r.skip(6); // warp version + descriptor version
    this.warpData = readDescriptor(r);
    // The block ends with left, top, right and bottom fields that Photoshop leaves as 0.
  }

  /**
   * The left edge of the text's frame, in pixels relative to the transform origin (`tx`, `ty`) and
   * before the transform. The frame spans the lines around the anchor point for point text, or the box
   * for paragraph text (it can reach beyond the box to fit the first line; see `boxBounds`).
   * Undefined in files from older Photoshop versions.
   */
  get left(): number | undefined {
    return this.textData.bounds?.Left.value;
  }
  /** See `left`. */
  get top(): number | undefined {
    return this.textData.bounds?.['Top '].value;
  }
  /** See `left`. */
  get right(): number | undefined {
    return this.textData.bounds?.Rght.value;
  }
  /** See `left`. */
  get bottom(): number | undefined {
    return this.textData.bounds?.Btom.value;
  }

  /** The tight bounds of the glyphs, relative to the transform origin like `left`/`top`/`right`/`bottom`. */
  get boundingBox(): Bounds | undefined {
    const box = this.textData.boundingBox;
    return box && { left: box.Left.value, top: box['Top '].value, right: box.Rght.value, bottom: box.Btom.value };
  }

  /**
   * The box of paragraph (box) text, exactly as Photoshop draws it, relative to the transform origin and
   * before the transform like `left`/`top`/`right`/`bottom`. Undefined for text without a box, such as
   * point text. Unlike the frame, it doesn't grow to fit the first line, and older Photoshop versions
   * store it too.
   */
  get boxBounds(): Bounds | undefined {
    const shape = this.engineData.EngineDict.Rendered.Shapes.Children[0].Cookie.Photoshop;
    if (shape.ShapeType !== 1) return undefined;
    const [left, top, right, bottom] = shape.BoxBounds;
    return { left, top, right, bottom };
  }

  /**
   * The text content. Paragraphs are separated by `\r`, and line breaks within a paragraph
   * (Shift+Enter) are `\u0003`; neither displays as a new line in HTML or a terminal.
   */
  get text(): string {
    return this.textData['Txt '];
  }

  /** The parsed EngineData, which holds all styling. Parsed on first access. */
  get engineData(): EngineDict {
    return (this.#engineData ??= parseEngineData(this.textData.EngineData));
  }

  /** Every font referenced by the text. */
  get fonts(): string[] {
    return this.engineData.ResourceDict.FontSet.map((f: EngineDict) => f.Name);
  }

  /**
   * The style of each run of characters, in order. Runs only store what they change from the
   * document's normal style sheet, so the rest comes from that.
   */
  get runs(): TextRun[] {
    const styleRun = this.engineData.EngineDict.StyleRun;
    const lengths: number[] = [...styleRun.RunLengthArray];
    // EngineData counts a trailing return that the text value omits.
    const total = lengths.reduce((sum, n) => sum + n, 0);
    if (total - this.text.length === 1) lengths[lengths.length - 1]! -= 1;

    const { FontSet, StyleSheetSet, TheNormalStyleSheet } = this.engineData.ResourceDict;
    const defaults = StyleSheetSet[TheNormalStyleSheet].StyleSheetData;
    return styleRun.RunArray.map((run: EngineDict, i: number): TextRun => {
      const s = { ...defaults, ...run.StyleSheet.StyleSheetData };
      return {
        length: lengths[i] ?? 0,
        font: s.Font === undefined ? undefined : FontSet[s.Font]?.Name,
        size: s.FontSize,
        color: s.FillColor ? toRGBA(s.FillColor.Values) : undefined,
        leading: s.AutoLeading === false && s.Leading !== undefined ? s.Leading : 'auto',
        fauxBold: s.FauxBold ?? false,
        fauxItalic: s.FauxItalic ?? false,
        underline: s.Underline ?? false,
        strikethrough: s.Strikethrough ?? false,
        tracking: s.Tracking ?? 0,
        kerning: s.AutoKerning === false ? (s.Kerning ?? 0) : 'auto',
        baselineShift: s.BaselineShift ?? 0,
        caps: lookup(CAPS, 'FontCaps', s.FontCaps ?? 0),
        baseline: lookup(BASELINES, 'FontBaseline', s.FontBaseline ?? 0),
      };
    });
  }

  /** Unique font sizes as stored, in pixels before `transform` scales the text. See `pointSizes()`. */
  get sizes(): number[] {
    return uniq(this.runs.flatMap((r) => (r.size === undefined ? [] : [r.size])));
  }

  /** How much `transform` scales the text vertically, which is what Photoshop scales font sizes by. */
  get #scale(): number {
    return Math.hypot(this.transform.yx, this.transform.yy);
  }

  /**
   * Unique font sizes in points, as Photoshop's Character panel shows them: scaled by `transform`
   * and converted at `ppi` pixels per inch (`psd.resources.resolutionInfo.vRes`). Pass 72 for pixels.
   */
  pointSizes(ppi: number): number[] {
    if (!(ppi > 0)) throw new Error(`Invalid resolution: ${ppi}`);
    return this.sizes.map((size) => (size * this.#scale * 72) / ppi);
  }

  /** Unique text colors (RGBA). */
  get colors(): RGBA[] {
    return uniq(this.runs.map((r) => r.color ?? [0, 0, 0, 255]));
  }

  /** Unique explicit leadings (line spacing). */
  get leadings(): number[] {
    return uniq(this.runs.flatMap((r) => (r.leading === 'auto' ? [] : [r.leading])));
  }

  /** The alignment of each paragraph. */
  get alignment(): TextAlignment[] {
    const { ParagraphSheetSet, TheNormalParagraphSheet } = this.engineData.ResourceDict;
    const defaults = ParagraphSheetSet[TheNormalParagraphSheet].Properties;
    return this.engineData.EngineDict.ParagraphRun.RunArray.map(
      // Photoshop leaves Justification out of the normal sheet when it's 0 (left).
      (p: EngineDict) => ALIGNMENTS[Math.min(p.ParagraphSheet.Properties.Justification ?? defaults.Justification ?? 0, 3)]!,
    );
  }

  /** CSS for the first style run. Fonts may include Photoshop-internal names. */
  toCSS(): string {
    const definition: Record<string, string | undefined> = {
      'font-family': this.fonts.join(', '),
      'font-size': this.sizes[0] === undefined ? undefined : `${this.sizes[0] * this.#scale}px`,
      color: `rgba(${this.colors[0]!.join(', ')})`,
      'text-align': this.alignment[0],
    };
    return Object.entries(definition)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${v};`)
      .join('\n');
  }

  toJSON() {
    return {
      text: this.text,
      font: {
        name: this.fonts[0],
        names: this.fonts,
        sizes: this.sizes,
        colors: this.colors,
        alignment: this.alignment,
        leadings: this.leadings,
      },
      runs: this.runs,
      left: this.left,
      top: this.top,
      right: this.right,
      bottom: this.bottom,
      boundingBox: this.boundingBox,
      boxBounds: this.boxBounds,
      transform: this.transform,
    };
  }
}

/** The pre-Photoshop 6 text block (`tySh`). Font data only; the text itself isn't stored here. */
export function readLegacyTypeTool(r: Reader) {
  r.skip(2); // version
  const transform = readTransform(r);
  r.skip(2); // font version
  const faces = Array.from({ length: r.int16() }, () => ({
    mark: r.int16(),
    fontType: r.int32(),
    fontName: r.pascal(),
    fontFamilyName: r.pascal(),
    fontStyleName: r.pascal(),
    script: r.int16(),
    vector: Array.from({ length: r.int32() }, () => r.int32()),
  }));
  const styles = Array.from({ length: r.int16() }, () => {
    const style = {
      mark: r.int16(),
      faceMark: r.int16(),
      size: r.int32(),
      tracking: r.int32(),
      kerning: r.int32(),
      leading: r.int32(),
      baseShift: r.int32(),
      autoKern: r.bool(),
      rotate: false,
    };
    r.skip(1);
    style.rotate = r.bool();
    return style;
  });
  const type = r.int16();
  const scalingFactor = r.int32();
  const characterCount = r.int32();
  const horzPlace = r.int32();
  const vertPlace = r.int32();
  const selectStart = r.int32();
  const selectEnd = r.int32();
  const lines = Array.from({ length: r.int16() }, () => ({
    charCount: r.int32(),
    orientation: r.int16(),
    alignment: r.int16(),
    actualChar: r.int16(),
    style: r.int16(),
  }));
  const color = r.spaceColor();
  const antialias = r.bool();
  return {
    transform, faces, styles, type, scalingFactor, characterCount, horzPlace, vertPlace,
    selectStart, selectEnd, lines, color, antialias,
  };
}
