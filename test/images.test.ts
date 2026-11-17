import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { deflateSync, inflateSync } from 'node:zlib';
import { encodePng, PSD } from '../src/index.ts';
import { unpredict } from '../src/image.ts';

const open = (path: string) => new PSD(readFileSync(new URL(path, import.meta.url)));
const hash = (data: Uint8ClampedArray) => createHash('sha256').update(data).digest('hex').slice(0, 16);

describe('composite image', () => {
  it('decodes pixels', async () => {
    const psd = open('fixtures/pixel.psd');
    const image = await psd.image.decode();
    assert.equal(image.width, 1);
    assert.equal(image.height, 1);
    assert.deepEqual([...image.data], [0, 100, 200, 255]);
  });

  it('decodes fresh pixels on every call instead of keeping them alive', async () => {
    // Keeping decoded pixels on the image ran exports of large documents out of memory (#193, #242).
    const node = open('../examples/images/example.psd').tree.childrenAtPath('Version A/Logo_Glyph')[0]!;
    assert.ok(node.type === 'layer');
    for (const image of [open('fixtures/text.psd').image, node.image]) {
      const [a, b] = [await image.decode(), await image.decode()];
      assert.notEqual(a.data, b.data);
      assert.deepEqual(a, b);
    }
  });

  // SHA-256 prefixes of the RGBA output from psd.js 3.x, which this port must reproduce.
  const legacy: Record<string, string> = {
    'fixtures/alignment_modes.psd': '280c973ac028c3d3', // CMYK
    'fixtures/blendmodes.psd': '3748a84ea2dce581',
    'fixtures/example.psd': '15d3a648f17c5998',
    'fixtures/locked.psd': 'd8f69383d894c454',
    'fixtures/slices.psd': '7abef56bf8b80e33',
    'fixtures/text.psd': '2d939a0a48637e66',
    '../examples/images/example.psd': '9ce0263b040c56be',
    '../examples/images/example-cmyk.psd': '4b16a79a3d0e5e7b',
    '../examples/images/example-greyscale.psd': 'b6b15637c9f742ed',
  };
  for (const [path, expected] of Object.entries(legacy)) {
    it(`matches psd.js 3.x for ${path}`, async () => {
      assert.equal(hash((await open(path).image.decode()).data), expected);
    });
  }

  it('decodes 16-bit images to 8 bits', async () => {
    const image = await open('../examples/images/example16.psd').image.decode();
    assert.equal(image.data.length, 900 * 600 * 4);
    assert.deepEqual([...image.data.subarray(0, 4)], [144, 153, 163, 255]);
  });
});

describe('layer images', () => {
  it('decodes layer pixels', async () => {
    const node = open('fixtures/pixel.psd').tree.children[0]!;
    assert.ok(node.type === 'layer');
    assert.deepEqual([...(await node.image.decode()).data], [0, 100, 200, 255]);
  });

  // [file, layer, pixels digest, mask digest] from psd.js 3.x, which stored masks as RGBA [0, 0, 0, value].
  const legacy: Array<[string, string, string, string]> = [
    ['fixtures/path.psd', 'Logo_Glyph', '74a5f9002e87e5e6', '09fff7ff9652a3f6'],
    ['fixtures/slices.psd', 'item-1/base', 'c03eee1a0f14986d', '69e46b6f6376d9ea'],
    ['../examples/images/example.psd', 'Version A/Logo_Glyph', '80867206177cd0cb', '6d873a0258c6a3db'],
    ['../examples/images/example-cmyk.psd', 'Version A/Logo_Glyph', 'b3e0912e9697a694', '6d873a0258c6a3db'],
  ];
  for (const [path, layer, pixels, mask] of legacy) {
    it(`matches psd.js 3.x for ${path} ${layer}`, async () => {
      const node = open(path).tree.childrenAtPath(layer)[0]!;
      assert.ok(node.type === 'layer');
      assert.equal(hash((await node.image.decode()).data), pixels);

      assert.ok(node.image.hasMask);
      const gray = (await node.image.decodeMask())!;
      assert.deepEqual([gray.width, gray.height], [node.layer.mask!.width, node.layer.mask!.height]);
      const rgba = new Uint8ClampedArray(gray.data.length * 4);
      gray.data.forEach((v, i) => (rgba[i * 4 + 3] = v));
      assert.equal(hash(rgba), mask);
    });
  }

  it('uses the alpha channel for grayscale transparency', async () => {
    // psd.js 3.x read the alpha channel as the gray value for grayscale layers.
    const node = open('../examples/images/example-greyscale.psd').tree.childrenAtPath('Version D/Logo_Glyph')[0]!;
    assert.ok(node.type === 'layer');
    const { data } = await node.image.decode();
    assert.equal(data[3], 0); // the corner is transparent
    const center = ((node.height >> 1) * node.width + (node.width >> 1)) * 4;
    assert.equal(data[center + 3], 255);
    assert.ok(data[center]! < 128); // and the logo is dark
  });

  it('decodes ZIP-predicted 16-bit layers like their 8-bit equivalents', async () => {
    const layer = async (path: string) => {
      const node = open(path).tree.childrenAtPath('Version A/Make a change and save.')[0]!;
      assert.ok(node.type === 'layer');
      return (await node.image.decode()).data;
    };
    const [deep, shallow] = await Promise.all([layer('../examples/images/example16.psd'), layer('../examples/images/example.psd')]);
    assert.equal(deep.length, shallow.length);
    let diff = 0;
    for (let i = 0; i < deep.length; i++) diff += Math.abs(deep[i]! - shallow[i]!);
    assert.ok(diff / deep.length < 1, `mean difference ${diff / deep.length}`);
  });

  it('decodes empty layers to empty images', async () => {
    const node = open('fixtures/empty-layer.psd').tree.childrenAtPath('group/empty layer')[0]!;
    assert.ok(node.type === 'layer');
    assert.equal((await node.image.decode()).data.length, 0);
    await assert.rejects(node.image.toPng(), /empty image/);
  });
});

describe('ZIP prediction', () => {
  it('undoes 8-bit row deltas', () => {
    assert.deepEqual([...unpredict(new Uint8Array([10, 1, 255, 5, 5, 5]), 3, 2, 8)], [10, 11, 10, 5, 10, 15]);
  });

  it('undoes 16-bit row deltas', () => {
    const data = new Uint8Array([0x01, 0x00, 0x00, 0x01, 0xff, 0xff]);
    assert.deepEqual([...unpredict(data, 3, 1, 16)], [0x01, 0x00, 0x01, 0x01, 0x01, 0x00]);
  });

  it('round-trips through zlib', () => {
    assert.deepEqual([...inflateSync(deflateSync(new Uint8Array([1, 2, 3])))], [1, 2, 3]);
  });
});

describe('PNG encoding', () => {
  const readChunks = (png: Uint8Array) => {
    const view = new DataView(png.buffer, png.byteOffset);
    const chunks: Record<string, Uint8Array> = {};
    for (let pos = 8; pos < png.length; ) {
      const length = view.getUint32(pos);
      chunks[String.fromCharCode(...png.subarray(pos + 4, pos + 8))] = png.subarray(pos + 8, pos + 8 + length);
      pos += 12 + length;
    }
    return chunks;
  };

  it('encodes RGBA pixels losslessly', async () => {
    const image = await open('fixtures/text.psd').image.decode();
    const png = await encodePng(image);
    assert.deepEqual([...png.subarray(0, 8)], [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const { IHDR, IDAT, IEND } = readChunks(png);
    assert.ok(IHDR && IDAT && IEND);
    const header = new DataView(IHDR.buffer, IHDR.byteOffset);
    assert.deepEqual([header.getUint32(0), header.getUint32(4), IHDR[8], IHDR[9]], [image.width, image.height, 8, 6]);

    const raw = inflateSync(IDAT);
    const pixels = Buffer.from(image.data.buffer, image.data.byteOffset, image.data.byteLength);
    const row = image.width * 4;
    for (let y = 0; y < image.height; y++) {
      assert.equal(raw[y * (row + 1)], 0);
      assert.ok(raw.subarray(y * (row + 1) + 1, (y + 1) * (row + 1)).equals(pixels.subarray(y * row, (y + 1) * row)));
    }
  });

  it('encodes grayscale pixels', async () => {
    const { IHDR, IDAT } = readChunks(await encodePng({ width: 2, height: 1, data: new Uint8Array([7, 9]) }));
    assert.equal(IHDR![9], 0);
    assert.deepEqual([...inflateSync(IDAT!)], [0, 7, 9]);
  });
});
