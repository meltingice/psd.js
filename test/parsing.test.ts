import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { BLEND_MODES, PSD } from '../src/index.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

describe('header', () => {
  const { header } = open('example.psd');

  it('parses document info', () => {
    assert.equal(header.version, 1);
    assert.equal(header.isBig, false);
    assert.equal(header.channels, 3);
    assert.equal(header.width, 900);
    assert.equal(header.height, 600);
    assert.equal(header.depth, 8);
    assert.equal(header.mode, 3);
    assert.equal(header.modeName, 'RGBColor');
  });

  it('rejects files that are not PSDs', () => {
    assert.throws(() => new PSD(new Uint8Array(32)), /Invalid file signature/);
  });

  it('accepts an ArrayBuffer', () => {
    const bytes = readFileSync(new URL('fixtures/pixel.psd', import.meta.url));
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    assert.equal(new PSD(buffer).layers.length, 1);
  });
});

describe('layers', () => {
  const psd = open('example.psd');
  const byName = (name: string) => psd.layers.filter((l) => l.name === name);

  it('lists every layer record top to bottom', () => {
    assert.equal(psd.layers.length, 15);
    assert.equal(psd.layers[0]!.name, 'Version C');
  });

  it('identifies folders', () => {
    assert.equal(psd.layers[0]!.isFolder, true);
    assert.equal(byName('Matte')[0]!.isFolder, false);
  });

  it('detects visibility', () => {
    assert.equal(psd.layers[0]!.visible, false);
    assert.equal(byName('Version A')[0]!.visible, true);
  });

  it('calculates dimensions and coordinates', () => {
    const layer = byName('Logo_Glyph').at(-1)!;
    assert.equal(layer.width, 142);
    assert.equal(layer.height, 179);
    assert.equal(layer.left, 379);
    assert.equal(layer.top, 210);
  });

  it('parses blend modes and opacity', () => {
    const layer = byName('Version A')[0]!;
    assert.equal(layer.blendMode, 'passthru'); // groups take their mode from the section divider
    assert.equal(byName('Matte')[0]!.blendMode, 'normal');
    assert.equal(layer.opacity, 255);
  });

  it('parses every blend mode', () => {
    const layers = open('blendmodes.psd').layers;
    assert.equal(layers.length, 27);
    for (const layer of layers) assert.equal(layer.blendMode, layer.name);
    assert.ok(Object.values(BLEND_MODES).includes(layers[0]!.blendMode!));
  });

  it('parses layer info blocks lazily and caches them', () => {
    const layer = byName('Matte')[0]!;
    assert.deepEqual(Object.keys(layer.info), ['name', 'layerId', 'blendClippingElements', 'blendInteriorElements', 'knockout', 'locked', 'sheetColor', 'metadata', 'referencePoint']);
    assert.equal(layer.info.metadata, layer.info.metadata);
    assert.equal(layer.id, layer.info.layerId);
  });
});

describe('PSB (large document format)', () => {
  const psb = open('example.psb');

  it('parses the header and layers', () => {
    assert.equal(psb.header.version, 2);
    assert.equal(psb.header.isBig, true);
    assert.deepEqual(psb.layers.map((l) => l.name), ['summer', 'haze']);
  });

  it('decodes the composite', async () => {
    const image = await psb.image.decode();
    assert.equal(image.data.length, psb.width * psb.height * 4);
  });
});

describe('16-bit documents', () => {
  const psd = new PSD(readFileSync(new URL('../examples/images/example16.psd', import.meta.url)));

  it('reads layers from the Lr16 block', () => {
    assert.equal(psd.header.depth, 16);
    assert.equal(psd.layers.length, 30);
    assert.equal(psd.tree.childrenAtPath('Version A/Matte').length, 1);
  });
});

describe('vector masks', () => {
  it('parses path records', () => {
    const mask = open('path.psd').layers.find((l) => l.name === 'Logo_Glyph')!.info.vectorMask!;
    assert.deepEqual(mask.paths.map((p) => p.recordType), [6, 8, 0, 2, 2, 1, 2]);
    const subpath = mask.paths[2]!;
    assert.ok(subpath.recordType === 0 && subpath.numPoints === 4);
    const knot = mask.paths[3]!;
    assert.ok(knot.recordType === 2 && knot.closed && !knot.linked);
    assert.ok(knot.anchor.vert > 0 && knot.anchor.vert < 1);
  });
});
