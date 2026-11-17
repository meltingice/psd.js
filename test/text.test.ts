import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseEngineData, PSD, TypeTool } from '../src/index.ts';
import { Reader } from '../src/reader.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));
const bytes = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));

describe('text layers', () => {
  const type = open('text.psd').tree.children[0]!.info.typeTool!;

  it('reads the text and styles', () => {
    assert.ok(type instanceof TypeTool);
    assert.equal(type.text, 'Test');
    assert.deepEqual(type.fonts, ['AdobeInvisFont', 'MyriadPro-Regular']);
    assert.deepEqual(type.sizes, [37]);
    assert.deepEqual(type.colors, [[24, 24, 24, 255]]);
    assert.equal(type.runs.reduce((n, r) => n + r.length, 0), type.text.length);
  });

  it('resolves styles a run omits from the normal style sheet', () => {
    // text.psd's runs don't set Font; the normal style sheet's font is index 1.
    assert.deepEqual([...new Set(type.runs.map((r) => r.font))], ['MyriadPro-Regular']);

  });

  it('uses the normal style sheet font size for runs without one (#37)', () => {
    const sample = open('cantGetTextSizes.psd').tree.children[0]!.info.typeTool!;
    const runStyles = sample.engineData.EngineDict.StyleRun.RunArray.map((r: any) => r.StyleSheet.StyleSheetData);
    assert.ok(runStyles.every((s: any) => s.FontSize === undefined));
    assert.equal(sample.text, 'Can’t get text size');
    assert.deepEqual(sample.sizes, [12]);
    assert.deepEqual(sample.toCSS().match(/font-size: [^;]+/)?.[0], 'font-size: 12px');
  });

  it('reads tracking, kerning and baseline shift (#146)', () => {
    // effect-stroke-gradient.psd's texts have -80 tracking and are shifted 8px down.
    const runs = open('effect-stroke-gradient.psd').tree.descendants().flatMap((n) => n.info.typeTool?.runs ?? []);
    assert.equal(runs.length, 2);
    for (const run of runs) {
      assert.equal(run.tracking, -80);
      assert.ok(Math.abs(run.baselineShift + 8) < 1e-4, `${run.baselineShift}`);
      assert.equal(run.kerning, 'auto');
    }

    // text.psd's first character turns off automatic kerning.
    assert.deepEqual(type.runs.map((r) => r.kerning), [0, 'auto', 'auto', 'auto', 'auto']);
    assert.deepEqual([...new Set(type.runs.map((r) => [r.tracking, r.baselineShift, r.caps, r.baseline].join()))], ['0,0,normal,normal']);
  });

  it('reads caps and superscript/subscript (#299)', () => {
    // No small fixture uses these, so the TySh block is built from scratch.
    const style = (s: string) => `<< /StyleSheet << /StyleSheetData << ${s} >> >> >>`;
    const typeTool = (styles: string[]) => {
      const out: number[] = [];
      const int = (n: number, size = 4) => out.push(...Array.from({ length: size }, (_, i) => (n >> (8 * (size - 1 - i))) & 0xff));
      const ascii = (s: string) => out.push(...bytes(s));
      const engineData = `<< /EngineDict << /StyleRun << /RunLengthArray [ ${styles.map(() => 1).join(' ')} ] /RunArray [ ${styles.join(' ')} ] >> >>
        /ResourceDict << /FontSet [ ] /StyleSheetSet [ ${style('')} ] /TheNormalStyleSheet 0 >> >>`;
      int(1, 2); // version
      out.push(...new Array(48).fill(0)); // transform
      int(50, 2); int(16); // text and descriptor versions
      int(0); int(0); ascii('TxLr'); int(2); // unnamed TxLr descriptor with 2 items
      int(0); ascii('Txt '); ascii('TEXT'); int(styles.length); for (let i = 0; i < styles.length; i++) int(0x61 + i, 2);
      int(10); ascii('EngineData'); ascii('tdta'); int(engineData.length); ascii(engineData);
      int(1, 2); int(16); // warp and descriptor versions
      int(0); int(0); ascii('warp'); int(0); // empty warp descriptor
      return new TypeTool(new Reader(new Uint8Array(out)));
    };

    const runs = typeTool([style('/FontCaps 1 /FontBaseline 2'), style('/FontCaps 2 /FontBaseline 1'), style('')]).runs;
    assert.deepEqual(runs.map((r) => r.caps), ['small-caps', 'all-caps', 'normal']);
    assert.deepEqual(runs.map((r) => r.baseline), ['subscript', 'superscript', 'normal']);
    assert.deepEqual(runs[2], {
      length: 1, font: undefined, size: undefined, color: undefined, leading: 'auto', fauxBold: false, fauxItalic: false,
      underline: false, strikethrough: false, tracking: 0, kerning: 'auto', baselineShift: 0, caps: 'normal', baseline: 'normal',
    });
    assert.throws(() => typeTool([style('/FontCaps 3')]).runs, /Unknown FontCaps value: 3/);
    assert.throws(() => typeTool([style('/FontBaseline 3')]).runs, /Unknown FontBaseline value: 3/);
  });

  it('converts sizes to the points Photoshop shows', () => {
    // alignment_modes.psd is 300 ppi; its text was set in these point sizes (#169).
    const psd = open('alignment_modes.psd');
    const ppi = psd.resources.resolutionInfo!.vRes;
    for (const [name, points] of [['justify', 10], ['center', 24], ['right', 20], ['left', 18]] as const) {
      const [size] = psd.tree.childrenAtPath(name)[0]!.info.typeTool!.pointSizes(ppi);
      assert.ok(Math.abs(size! - points) < 1e-4, `${name}: ${size}`);
    }

    // Free-transforming text scales its sizes; rotating it doesn't (#131).
    const scaled = open('text.psd').tree.children[0]!.info.typeTool!;
    const angle = Math.PI / 6;
    Object.assign(scaled.transform, { xx: 2 * Math.cos(angle), xy: 2 * Math.sin(angle), yx: -2 * Math.sin(angle), yy: 2 * Math.cos(angle) });
    assert.deepEqual(scaled.pointSizes(72).map(Math.round), [74]);
    assert.match(scaled.toCSS(), /font-size: 74(\.\d+)?px;/);
    assert.throws(() => scaled.pointSizes(NaN), /Invalid resolution/);
  });

  it('reads the text frame and glyph bounds (#181)', () => {
    // text.psd is a 100x50 paragraph box at the origin.
    assert.deepEqual([type.left, type.right, type.bottom], [0, 100, 50]);
    assert.ok(type.top! < 0);

    // Centered point text: the frame is around the anchor, and the glyphs fill the layer's pixels.
    const node = new PSD(readFileSync(new URL('../examples/images/example.psd', import.meta.url))).tree.descendants()
      .find((n) => n.info.typeTool)!;
    const point = node.info.typeTool!;
    assert.ok(point.left! < 0 && point.right! > 0 && Math.abs(point.left! + point.right!) < 0.01);
    const { tx, ty } = point.transform;
    const box = point.boundingBox!;
    assert.deepEqual(
      [Math.floor(box.left + tx), Math.floor(box.top + ty), Math.ceil(box.right + tx), Math.ceil(box.bottom + ty)],
      [node.left, node.top, node.right, node.bottom],
    );

    // Older files don't store bounds.
    const old = open('alignment_modes.psd').tree.childrenAtPath('left')[0]!.info.typeTool!;
    assert.equal(old.left, undefined);
    assert.equal(old.boundingBox, undefined);
  });

  it('exports CSS', () => {
    const css = type.toCSS();
    assert.match(css, /MyriadPro-Regular/);
    assert.match(css, /font-size: 37px;/);
    assert.match(css, /rgba\(24, 24, 24, 255\)/);
    for (const line of css.split('\n')) assert.ok(line.endsWith(';'));
  });

  it('exports JSON through the node', () => {
    const json = open('text.psd').tree.children[0]!.toJSON();
    assert.ok('text' in json);
    assert.equal(json.text?.text, 'Test');
    assert.deepEqual(json.text?.transform, type.transform);
  });

  for (const alignment of ['left', 'right', 'center', 'justify']) {
    it(`reads ${alignment} alignment`, () => {
      const node = open('alignment_modes.psd').tree.childrenAtPath(alignment)[0]!;
      assert.match(node.info.typeTool!.toCSS(), new RegExp(`text-align: ${alignment};`));
    });
  }
});

describe('parseEngineData', () => {
  it('parses nested dictionaries, arrays and scalars', () => {
    const data = parseEngineData(bytes('<< /A 1 /B -.5 /C [ 1 2.25 ] /D true /E << /F /Name >> /G [ << /H false >> ] >>'));
    assert.deepEqual(data, { A: 1, B: -0.5, C: [1, 2.25], D: true, E: { F: 'Name' }, G: [{ H: false }] });
  });

  it('parses multi-line data without depending on whitespace layout', () => {
    assert.deepEqual(parseEngineData(bytes('\n\n<<\n\t/A\n\t<<\n\t\t/B [ ]\n\t>>\n>>')), { A: { B: [] } });
  });

  it('decodes UTF-16 strings with escapes', () => {
    // "(þÿ" BOM, then UTF-16BE "a)é" with the ")" escaped.
    const data = new Uint8Array([...bytes('<< /T ('), 0xfe, 0xff, 0x00, 0x61, 0x00, 0x5c, 0x29, 0x00, 0xe9, ...bytes(') >>')]);
    assert.deepEqual(parseEngineData(data), { T: 'a)é' });
  });

  it('decodes CJK font names (#202)', () => {
    // 木 (U+6728), 丩 (U+4E29) and 小 (U+5C0F) contain "(", ")" and "\" bytes, which are escaped.
    // 上 (U+4E0A) and 不 (U+4E0D) contain raw newline bytes.
    const name = '微软雅黑木丩小上不';
    const utf16 = [...name].flatMap((c) => [c.charCodeAt(0) >> 8, c.charCodeAt(0) & 0xff]);
    const escaped = utf16.flatMap((b) => ([0x28, 0x29, 0x5c].includes(b) ? [0x5c, b] : [b]));
    const data = parseEngineData(
      new Uint8Array([...bytes('<< /FontSet [ << /Name ('), 0xfe, 0xff, ...escaped, ...bytes(') /Script 1 >> ] >>')]),
    );
    assert.deepEqual(data, { FontSet: [{ Name: name, Script: 1 }] });
  });

  it('throws on malformed input', () => {
    assert.throws(() => parseEngineData(bytes('<< /A (unterminated >>')), /Unterminated/);
    assert.throws(() => parseEngineData(bytes('<< /A ?? >>')), /Unexpected EngineData token/);
  });
});
