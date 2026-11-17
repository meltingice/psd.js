import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { descriptorColor, PSD } from '../src/index.ts';
import { readCurves } from '../src/layer-info.ts';
import { Reader } from '../src/reader.ts';

const open = (path: string) => new PSD(readFileSync(new URL(path, import.meta.url)));
const layer = (path: string, name: string) => open(path).layers.find((l) => l.name === name && l.info.objectEffects)!;

describe('layer styles', () => {
  it('reads color overlays', () => {
    const styles = layer('fixtures/slices.psd', 'status-bar').info.objectEffects!;
    assert.equal(styles.enabled, true);
    assert.equal(styles.scale, 1);
    assert.deepEqual(styles.colorOverlays, [{ enabled: true, blendMode: 'normal', opacity: 1, color: [255, 255, 255] }]);
    assert.deepEqual(styles.dropShadows, []);
  });

  it('reads gradient overlays', () => {
    const [overlay] = layer('../examples/images/example.psd', 'Logo_Glyph').info.objectEffects!.gradientOverlays;
    assert.ok(overlay);
    assert.equal(overlay.angle, 135);
    assert.equal(overlay.style, 'Lnr');
    assert.equal(overlay.alignWithLayer, true);
    assert.deepEqual(overlay.gradient!.colorStops.map((s) => [s.location, s.color]), [
      [0, [10, 0, 178]],
      [0.5, [255, 0, 0]],
      [1, [255, 252, 0]],
    ]);
    assert.deepEqual(overlay.gradient!.opacityStops.map((s) => s.opacity), [1, 1]);
  });

  it('reads group styles, which Photoshop stores in lfxs', () => {
    // No fixture has a group with styles, so relabel a layer's lfx2 block: lfxs has the same layout.
    const bytes = readFileSync(new URL('fixtures/slices.psd', import.meta.url));
    const block = new PSD(bytes).layers.find((l) => l.name === 'status-bar')!.infoBlocks.find((b) => b.key === 'lfx2')!;
    bytes.write('lfxs', block.offset - 8, 'latin1'); // the key precedes the 4-byte length
    const layer = new PSD(bytes).layers.find((l) => l.name === 'status-bar')!;
    assert.ok(layer.infoBlocks.some((b) => b.key === 'lfxs'));
    assert.deepEqual(layer.info.objectEffects?.colorOverlays, [{ enabled: true, blendMode: 'normal', opacity: 1, color: [255, 255, 255] }]);
  });

  it('converts descriptor colors', () => {
    const color = (id: string, values: object) => descriptorColor({ class: { name: '', id }, ...values });
    assert.deepEqual(color('RGBC', { 'Rd  ': 10.4, 'Grn ': 20, 'Bl  ': 300 }), [10, 20, 255]);
    assert.deepEqual(color('HSBC', { 'H   ': { id: '#Ang', unit: 'Angle', value: 120 }, Strt: 100, Brgh: 100 }), [0, 255, 0]);
    assert.deepEqual(color('CMYC', { 'Cyn ': 100, Mgnt: 0, 'Ylw ': 0, Blck: 0 }), [0, 255, 255]);
    assert.deepEqual(color('Grsc', { 'Gry ': 100 }), [0, 0, 0]);
    assert.deepEqual(color('LbCl', { Lmnc: 100, 'A   ': 0, 'B   ': 0 }), [255, 255, 255]);
    assert.equal(color('BkCl', {}), undefined);
  });
});

describe('legacy layer effects', () => {
  // This layer stores Photoshop's default effect settings in the pre-Photoshop 6 lrFX block.
  const effects = layer('fixtures/slices.psd', 'status-bar').info.effectsLayer!;

  it('reads fixed-point shadow and glow values', () => {
    assert.deepEqual(
      [effects.dropShadow!.blur, effects.dropShadow!.angle, effects.dropShadow!.distance, effects.dropShadow!.opacity],
      [5, 120, 5, 75],
    );
    assert.deepEqual([effects.outerGlow!.blur, effects.outerGlow!.color.components.slice(0, 3)], [5, [255, 255, 190]]);
  });

  it('reads bevels, whose styles are numbered from 1', () => {
    assert.equal(effects.bevel!.style, 'Inner Bevel');
    assert.equal(effects.bevel!.angle, 120);
  });

  it('reads solid fills', () => {
    assert.equal(effects.solidFill!.enabled, true);
    assert.deepEqual(effects.solidFill!.color.components.slice(0, 3), [255, 255, 255]);
  });
});

describe('curves', () => {
  const bytes = (...values: Array<[number, 1 | 2 | 4] | string>) => {
    const out: number[] = [];
    for (const v of values) {
      if (typeof v === 'string') out.push(...[...v].map((c) => c.charCodeAt(0)));
      else for (let i = v[1] - 1; i >= 0; i--) out.push((v[0] >> (i * 8)) & 0xff);
    }
    return new Uint8Array(out);
  };

  it('reads legacy curves', () => {
    // Padding, version 1, tag with channel 0 set, 2 points.
    const data = bytes([0, 1], [1, 2], [0b1, 4], [2, 2], [0, 2], [0, 2], [255, 2], [255, 2]);
    assert.deepEqual(readCurves(new Reader(data), { end: data.length }), [
      { channelIndex: 0, points: [{ output: 0, input: 0 }, { output: 255, input: 255 }] },
    ]);
  });

  it('replaces legacy curves with the extended section instead of duplicating them', () => {
    const data = bytes(
      [0, 1], [4, 2], [0b1, 4], [2, 2], [0, 2], [0, 2], [255, 2], [255, 2],
      'Crv ', [4, 2], [1, 4], [0, 2], [2, 2], [0, 2], [0, 2], [200, 2], [255, 2],
    );
    assert.deepEqual(readCurves(new Reader(data), { end: data.length }), [
      { channelIndex: 0, points: [{ output: 0, input: 0 }, { output: 200, input: 255 }] },
    ]);
  });
});

describe('layer version', () => {
  it('reads the minimum Photoshop version', () => {
    assert.ok(open('../examples/images/example.psd').layers.some((l) => l.info.layerVersion === 80));
  });
});
