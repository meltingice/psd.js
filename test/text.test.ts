import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { parseEngineData, PSD, TypeTool } from '../src/index.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

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

    // Runs without a FontSize use the normal style sheet's 12 (#37).
    const stripped = open('text.psd').tree.children[0]!.info.typeTool!;
    const engineData = Buffer.from(stripped.textData.EngineData).toString('latin1');
    stripped.textData.EngineData = Buffer.from(engineData.replaceAll('/FontSize 37.0', ''), 'latin1');
    assert.deepEqual(stripped.sizes, [12]);
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
  const bytes = (text: string) => new Uint8Array([...text].map((c) => c.charCodeAt(0)));

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
