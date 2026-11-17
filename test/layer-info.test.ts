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

describe('shapes', () => {
  const psd = open('fixtures/vector-mask2.psd');
  const info = (name: string) => psd.layers.find((l) => l.name === name)!.info;
  const shapes = (name: string) => info(name).vectorOrigination!.shapes.map(({ data, ...shape }) => shape);

  it('reads live shape types and bounds', () => {
    const rect = { invalidated: false, index: 0, radii: undefined, line: undefined };
    assert.deepEqual(shapes('Rectangle 1'), [{ ...rect, type: 'rectangle', bounds: { top: 3, left: 3, bottom: 9, right: 9 } }]);
    assert.deepEqual(shapes('Ellipse 1'), [{ ...rect, type: 'ellipse', bounds: { top: 13, left: 4, bottom: 18, right: 8 } }]);
    // The layer's bounds include antialiasing; the shape's are what Photoshop shows.
    const layer = psd.layers.find((l) => l.name === 'Rectangle 1')!;
    assert.deepEqual([layer.top, layer.left, layer.bottom, layer.right], [2, 2, 10, 10]);
  });

  it('reads rounded rectangle radii and line endpoints', () => {
    const [rounded] = shapes('Rounded Rectangle 1');
    assert.equal(rounded!.type, 'roundedRectangle');
    assert.deepEqual(rounded!.radii, { topLeft: 3, topRight: 3, bottomRight: 3, bottomLeft: 3 });
    const [line] = shapes('Line 1');
    assert.equal(line!.type, 'line');
    assert.deepEqual(line!.line, { start: { x: 12, y: 18 }, end: { x: 19, y: 13 }, weight: 1 });
  });

  it('reads every shape in a layer, and shapes edited into paths', () => {
    assert.deepEqual(shapes('Color Fill 1').map((s) => [s.type, s.index]), [['roundedRectangle', 0], ['roundedRectangle', 1]]);
    assert.deepEqual(shapes('Polygon 1'), [
      { type: undefined, invalidated: true, index: 0, bounds: undefined, radii: undefined, line: undefined },
    ]);
  });

  it('reads strokes and fills, with the raw descriptor in data', () => {
    const { vectorStroke: stroke, vectorStrokeContent: fill } = info('Rounded Rectangle 1');
    assert.deepEqual(
      [stroke!.enabled, stroke!.fillEnabled, stroke!.width, stroke!.alignment, stroke!.cap, stroke!.join, stroke!.dashes, stroke!.opacity, stroke!.blendMode, stroke!.color],
      [true, true, 0.29, 'inside', 'butt', 'miter', [], 1, 'normal', [0, 0, 255]],
    );
    // The raw descriptors are only under data, like objectEffects.
    assert.equal(stroke!.data.strokeStyleLineWidth.value, 0.29);
    assert.ok(!('strokeStyleLineWidth' in stroke!));
    assert.deepEqual(Object.keys(fill!), ['color', 'gradient', 'pattern', 'data']);
    assert.ok(fill!.data['Clr ']);
    assert.deepEqual(Object.keys(info('Rectangle 1').vectorOrigination!), ['shapes', 'data']);
    assert.equal(info('Rectangle 1').vectorOrigination!.data.keyDescriptorList.length, 1);
    assert.deepEqual(fill!.color, [0, 255, 255]);
  });

  it('converts stroke widths in points to pixels, and reads a disabled fill', () => {
    const stroke = open('fixtures/stroke-width-points-300dpi.psd').layers.find((l) => l.name === 'Rectangle 1')!.info.vectorStroke!;
    assert.equal(stroke.data.strokeStyleLineWidth.unit, 'Points');
    assert.equal(stroke.width, 25); // 6pt at 300ppi
    assert.deepEqual([stroke.fillEnabled, stroke.alignment, stroke.color], [false, 'center', [255, 0, 0]]);
  });
});

describe('smart objects', () => {
  const placed = (name: string) => open('fixtures/placedLayer.psd').layers.find((l) => l.name === name)!.info.placedLayer!;

  it('reads custom warps, which use object arrays', () => {
    const { warp } = placed('embedded-png');
    assert.equal(warp.warpStyle.value, 'warpCustom');
    const { Hrzn, Vrtc } = warp.customEnvelopeWarp.meshPoints;
    assert.deepEqual([Hrzn.unit, Hrzn.values.length, Vrtc.values.length], ['Pixels', 16, 16]);
    assert.deepEqual([Hrzn.values[3], Vrtc.values[15]], [64, 64]);
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
