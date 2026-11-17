import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PSD } from '../src/index.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

describe('resources', () => {
  it('indexes every resource block', () => {
    const { blocks } = open('example.psd').resources;
    assert.ok(blocks.size > 1);
    for (const [id, block] of blocks) assert.equal(block.id, id);
  });

  it('parses layer comps', () => {
    const comps = open('example.psd').resources.layerComps;
    assert.deepEqual(comps.map((c) => c.name), ['Version A', 'Version B', 'Version C']);
    for (const comp of comps) assert.ok(comp.id > 0);
  });

  it('parses guides', () => {
    assert.deepEqual(open('guides.psd').resources.guides, [
      { location: 250, direction: 'vertical' },
      { location: 0, direction: 'horizontal' },
      { location: 500, direction: 'vertical' },
    ]);
    assert.deepEqual(open('simplest.psd').resources.guides, []);
  });

  it('parses resolution info', () => {
    const info = open('example.psd').resources.resolutionInfo!;
    assert.equal(Math.round(info.hRes), 72);
    assert.equal(info.hResUnitName, 'pixel/inch');
    assert.equal(info.widthUnitName, 'in');
  });

  it('parses version 7+ slices', () => {
    const slices = open('slices.psd').resources.slices!;
    assert.ok(slices.version > 6);
    assert.ok(slices.slices.length > 1);
    for (const slice of slices.slices) assert.equal(typeof slice.bounds.left, 'number');
    assert.equal(slices.slices[0]!.origin, 'userGenerated');
  });

  it('parses version 6 slices', () => {
    const slices = open('pixel.psd').resources.slices!;
    assert.equal(slices.version, 6);
    assert.deepEqual(slices.slices[0]!.bounds, { left: 0, top: 0, right: 1, bottom: 1 });
  });

  it('always has the default slice', () => {
    const { slices } = open('simplest.psd').resources.slices!;
    assert.equal(slices.length, 1);
    assert.equal(slices[0]!.id, 0);
  });

  it('exposes raw bytes and XMP', () => {
    const { resources } = open('example.psd');
    assert.ok(resources.bytes(1005)!.length >= 16);
    assert.equal(resources.bytes(9999), undefined);
    if (resources.blocks.has(1060)) assert.match(resources.xmpMetadata!, /x:xmpmeta/);
  });
});
