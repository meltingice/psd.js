import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { descriptorColor, PSD } from '../src/index.ts';
import { readCurves, readPlacedLayer } from '../src/layer-info.ts';
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
    const groups = open('fixtures/drop-shadow-groups.psd').tree.children.filter((n) => n.type === 'group');
    assert.deepEqual(groups.map((g) => g.name), ['group-child-shadow', 'group-opacity50', 'group-passthrough', 'group-normal']);
    for (const group of groups) {
      assert.ok(group.layer.infoBlocks.some((b) => b.key === 'lfxs') && !group.layer.infoBlocks.some((b) => b.key === 'lfx2'));
      const [shadow, ...others] = group.info.objectEffects!.dropShadows;
      assert.equal(others.length, 0);
      assert.deepEqual(
        [shadow!.enabled, shadow!.blendMode, shadow!.opacity, shadow!.color, shadow!.angle, shadow!.distance, shadow!.size],
        [true, 'normal', 0.75, [200, 0, 0], 120, 6, 8],
        group.name,
      );
    }
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

describe('smart objects', () => {
  const placed = (name: string) => open('fixtures/placedLayer.psd').layers.find((l) => l.name === name)!.info.placedLayer!;

  it('reads the source and placement of embedded and linked smart objects', () => {
    const embedded = placed('embedded-png');
    assert.deepEqual(
      [embedded.fileId, embedded.page, embedded.totalPages, embedded.size, embedded.resolution],
      ['5a96c404-ab9c-1177-97ef-96ca454b82b7', 1, 1, { width: 64, height: 64 }, 144],
    );
    assert.deepEqual(embedded.corners, [{ x: 96, y: 96 }, { x: 160, y: 96 }, { x: 160, y: 160 }, { x: 96, y: 160 }]);
    assert.deepEqual(embedded.nonAffineCorners, embedded.corners);
    assert.deepEqual([embedded.rotation, embedded.scale], [0, { x: 1, y: 1 }]);

    // 72ppi content in this 144ppi document: twice its pixel size.
    const linked = placed('linked-psd');
    assert.deepEqual([linked.size, linked.resolution, linked.scale], [{ width: 101, height: 55 }, 72, { x: 2, y: 2 }]);
    assert.deepEqual(linked.Trnf, [27, 73, 229, 73, 229, 183, 27, 183]);
  });

  it('reads custom warps, which use object arrays', () => {
    const { warp } = placed('embedded-png');
    assert.equal(warp.warpStyle.value, 'warpCustom');
    const { Hrzn, Vrtc } = warp.customEnvelopeWarp.meshPoints;
    assert.deepEqual([Hrzn.unit, Hrzn.values.length, Vrtc.values.length], ['Pixels', 16, 16]);
    assert.deepEqual([Hrzn.values[3], Vrtc.values[15]], [64, 64]);
  });

  it('gets rotation and scale from the corners', () => {
    // No fixture has a rotated smart object, so this uses a minimal descriptor.
    const at = (deg: number, sx: number, sy: number) => {
      const [c, s] = [Math.cos((deg * Math.PI) / 180), Math.sin((deg * Math.PI) / 180)];
      const point = (x: number, y: number) => [10 + x * sx * c - y * sy * s, 20 + x * sx * s + y * sy * c];
      const Trnf = [point(0, 0), point(100, 0), point(100, 50), point(0, 50)].flat();
      const { rotation, scale, nonAffineCorners } = readPlacedLayer({ class: { name: '', id: 'null' }, Trnf, 'Sz  ': { Wdth: 100, Hght: 50 }, Rslt: { value: 72 } });
      return [Math.round(rotation * 1e6) / 1e6, Math.round(scale.x * 1e6) / 1e6, Math.round(scale.y * 1e6) / 1e6, nonAffineCorners];
    };
    assert.deepEqual(at(30, 2, 1), [30, 2, 1, undefined]);
    assert.deepEqual(at(-135, 0.5, 0.5), [-135, 0.5, 0.5, undefined]);
    assert.deepEqual(at(0, -1, 1), [180, 1, -1, undefined]); // a horizontal flip
    assert.throws(() => readPlacedLayer({ class: { name: '', id: 'null' } }), /no transform/);
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
