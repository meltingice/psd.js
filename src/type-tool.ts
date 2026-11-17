import { readDescriptor, type Descriptor } from './descriptor.ts';
import { parseEngineData, type EngineDict } from './engine-data.ts';
import type { Reader } from './reader.ts';

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
}

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
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  #engineData: EngineDict | undefined;

  constructor(r: Reader) {
    r.skip(2); // version
    this.transform = readTransform(r);
    r.skip(6); // text version + descriptor version
    this.textData = readDescriptor(r);
    r.skip(6); // warp version + descriptor version
    this.warpData = readDescriptor(r);
    this.left = r.int32();
    this.top = r.int32();
    this.right = r.int32();
    this.bottom = r.int32();
  }

  /** The text content. Paragraphs are separated by `\r`. */
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
      };
    });
  }

  /** Unique font sizes, in points. */
  get sizes(): number[] {
    return uniq(this.runs.flatMap((r) => (r.size === undefined ? [] : [r.size])));
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
      (p: EngineDict) => ALIGNMENTS[Math.min(p.ParagraphSheet.Properties.Justification ?? defaults.Justification, 3)]!,
    );
  }

  /** CSS for the first style run. Fonts may include Photoshop-internal names. */
  toCSS(): string {
    const definition: Record<string, string | undefined> = {
      'font-family': this.fonts.join(', '),
      'font-size': this.sizes[0] === undefined ? undefined : `${this.sizes[0]}pt`,
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
