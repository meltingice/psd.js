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

  it('exports CSS', () => {
    const css = type.toCSS();
    assert.match(css, /MyriadPro-Regular/);
    assert.match(css, /font-size: 37pt;/);
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

  it('throws on malformed input', () => {
    assert.throws(() => parseEngineData(bytes('<< /A (unterminated >>')), /Unterminated/);
    assert.throws(() => parseEngineData(bytes('<< /A ?? >>')), /Unexpected EngineData token/);
  });
});
