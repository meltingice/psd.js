import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { PSD } from '../src/index.ts';
import { labToRgb } from '../src/image.ts';

const open = (name: string) => new PSD(readFileSync(new URL(`fixtures/${name}`, import.meta.url)));

/** A minimal PSD with no resources or layers and a raw composite of the given planes. */
function synthetic(mode: number, width: number, height: number, planes: number[][]): PSD {
  const imageLength = 2 + planes.length * width * height;
  const bytes = new Uint8Array(26 + 12 + imageLength);
  const view = new DataView(bytes.buffer);
  bytes.set([0x38, 0x42, 0x50, 0x53]); // 8BPS
  view.setUint16(4, 1);
  view.setUint16(12, planes.length);
  view.setUint32(14, height);
  view.setUint32(18, width);
  view.setUint16(22, 8);
  view.setUint16(24, mode);
  // Color mode data, resources and layer section lengths are all 0, then compression 0 (raw).
  planes.forEach((plane, i) => bytes.set(plane, 40 + i * width * height));
  return new PSD(bytes);
}

const pixels = async (psd: PSD) => [...(await psd.image.decode()).data];
const near = (actual: number[], expected: number[], tolerance: number) =>
  actual.every((v, i) => Math.abs(v - expected[i]!) <= tolerance);

describe('indexed color', () => {
  it('maps indexes through the color table (written by ImageMagick)', async () => {
    const psd = open('indexed.psd');
    assert.equal(psd.header.modeName, 'IndexedColor');
    const colors = [[255, 0, 0, 255], [0, 255, 0, 255], [0, 0, 255, 255]];
    const expected = Array.from({ length: 30 }, (_, i) => colors[((i % 10) + Math.floor(i / 10)) % 3]!).flat();
    assert.deepEqual(await pixels(psd), expected);
  });
});

describe('bitmap', () => {
  it('expands 1-bit rows that are not byte aligned (written by ImageMagick)', async () => {
    const psd = open('bitmap.psd');
    assert.equal(psd.header.depth, 1);
    const expected = Array.from({ length: 30 }, (_, n) => {
      const [i, j] = [n % 10, Math.floor(n / 10)];
      const v = (i * j + i) % 3 === 0 ? 0 : 255;
      return [v, v, v, 255];
    }).flat();
    assert.deepEqual(await pixels(psd), expected);
  });
});

describe('Lab', () => {
  it('converts to sRGB', () => {
    assert.deepEqual(labToRgb(255, 128, 128), [255, 255, 255]);
    assert.deepEqual(labToRgb(0, 128, 128), [0, 0, 0]);
    // sRGB red is roughly Lab(53.24, 80.09, 67.20).
    assert.ok(near(labToRgb(136, 208, 195), [255, 0, 0], 6), String(labToRgb(136, 208, 195)));
  });

  it('decodes composites with transparency', async () => {
    const psd = synthetic(9, 2, 1, [[255, 136], [128, 208], [128, 195], [255, 100]]);
    const [white, red] = [(await pixels(psd)).slice(0, 4), (await pixels(psd)).slice(4)];
    assert.deepEqual(white, [255, 255, 255, 255]);
    assert.ok(near(red, [255, 0, 0, 100], 6), String(red));
  });
});

describe('multichannel', () => {
  it('decodes 3 channels as inverted CMY inks', async () => {
    const psd = synthetic(7, 2, 1, [[0, 255], [255, 255], [255, 255]]);
    const data = await pixels(psd);
    assert.ok(near(data.slice(0, 4), [0, 255, 255, 255], 1), String(data)); // full cyan
    assert.deepEqual(data.slice(4), [255, 255, 255, 255]); // no ink
  });

  it('rejects channel counts it cannot approximate', async () => {
    await assert.rejects(synthetic(7, 1, 1, [[0], [0]]).image.decode(), /2-channel multichannel/);
  });
});
