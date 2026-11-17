import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { BLEND_MODES, pathToSvg, PSD } from '../src/index.ts';

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

describe('layers in tagged blocks', () => {
  const int = (n: number, size: number) => Array.from({ length: size }, (_, i) => (n >> ((size - 1 - i) * 8)) & 0xff);
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
  // A layer record with no channels: bounds, channel count, blend mode, opacity, clipping, flags,
  // filler, then the extra data (empty mask and blending ranges, and a padded name).
  const record = (name: string) => {
    const pascal = [name.length, ...ascii(name)];
    while (pascal.length % 4) pascal.push(0);
    const extra = [...int(0, 4), ...int(0, 4), ...pascal];
    return [...int(0, 16), ...int(0, 2), ...ascii('8BIMnorm'), 255, 0, 0, 0, ...int(extra.length, 4), ...extra];
  };
  const layerInfo = (names: string[]) => (names.length ? [...int(names.length, 2), ...names.flatMap(record)] : []);
  const block = (key: string, data: number[]) => [...ascii('8BIM' + key), ...int(data.length, 4), ...data];
  /** A 1x1 RGB document whose layer section holds `main` layers, an empty global mask, then `extra` bytes. */
  const psd = (depth: number, main: string[], extra: number[]) => {
    const info = layerInfo(main);
    const section = [...int(info.length, 4), ...info, ...int(0, 4), ...extra];
    const header = [...ascii('8BPS'), ...int(1, 2), ...int(0, 6), ...int(3, 2), ...int(1, 4), ...int(1, 4), ...int(depth, 2), ...int(3, 2)];
    return new PSD(new Uint8Array([...header, ...int(0, 4), ...int(0, 4), ...int(section.length, 4), ...section]));
  };
  const names = (p: PSD) => p.layers.map((l) => l.name);

  it('replaces 8-bit compatibility layers with Lr16 layers', () => {
    assert.deepEqual(names(psd(16, ['compat'], block('Lr16', layerInfo(['bottom', 'top'])))), ['top', 'bottom']);
  });

  it('skips zero padding before the block', () => {
    assert.deepEqual(names(psd(16, [], [0, 0, ...block('Lr16', layerInfo(['a']))])), ['a']);
  });

  it('reads layers from a Layr block when the main section is empty', () => {
    assert.deepEqual(names(psd(8, [], block('Layr', layerInfo(['a'])))), ['a']);
    assert.deepEqual(names(psd(8, ['main'], block('Layr', layerInfo(['a'])))), ['main']);
  });
});

describe('layer mask parameters', () => {
  const params = (file: string, name: string) => {
    const { density, feather, vectorDensity, vectorFeather } = open(file).layers.find((l) => l.name === name)!.mask!;
    return [Math.round(density * 255), feather, Math.round(vectorDensity * 255), vectorFeather];
  };

  it('reads density and feather after the real user mask', () => {
    // This layer has a real user mask channel (-3), so its fields come before the parameters.
    assert.deepEqual(params('mask_parameters.psd', 'Rectangle 1'), [204, 2.6, 250, 0.3]);
  });

  it('reads parameters in a long record without a real user mask', () => {
    // 36 bytes, the size of a real user mask record, but the layer has no -3 channel.
    assert.deepEqual(params('mask-parameters-no-real-channel.psd', 'heart'), [255, 3, 191, 6]);
  });

  it("defaults to Photoshop's 100% density and no feather", () => {
    assert.deepEqual(params('path.psd', 'Logo_Glyph'), [255, 0, 255, 0]);
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

  it('reads how subpaths combine', () => {
    const glyph = open('example.psd').layers.find((l) => l.name === 'Logo_Glyph')!.info.vectorMask!.paths;
    assert.deepEqual(glyph.flatMap((p) => (p.recordType === 0 ? [p.operation] : [])), [1, 2, 1, 2, 1, 2]);
  });
});

describe('pathToSvg', () => {
  const info = (psd: PSD, name: string) => psd.layers.find((l) => l.name === name && l.info.vectorMask)!.info;

  it('converts a closed path', () => {
    const psd = open('path.psd');
    assert.deepEqual(pathToSvg(info(psd, 'Logo_Glyph').vectorMask!.paths, psd.width, psd.height), [
      { operation: 1, d: 'M8 4C8 4 4 4 4 4C4 4 4 8 4 8C4 8 8 8 8 8C8 8 8 4 8 4Z' },
    ]);
  });

  it("matches each shape's bounds", () => {
    const psd = open('vector-mask2.psd');
    for (const name of ['Rectangle 1', 'Rounded Rectangle 1', 'Ellipse 1', 'Color Fill 1']) {
      const { vectorMask, vectorOrigination } = info(psd, name);
      const shapes = pathToSvg(vectorMask!.paths, psd.width, psd.height);
      const boxes = vectorOrigination!.shapes.map((shape) => shape.bounds!);
      assert.equal(shapes.length, boxes.length, name);
      shapes.forEach(({ d }, i) => {
        // Photoshop's ellipses and rounded corners keep their control points on the bounding box.
        const [x, y] = [0, 1].map((o) => d.match(/[\d.]+/g)!.map(Number).filter((_, j) => j % 2 === o));
        const box = boxes[i]!;
        assert.deepEqual([Math.min(...y!), Math.min(...x!), Math.max(...y!), Math.max(...x!)], [box.top, box.left, box.bottom, box.right], name);
      });
    }
    assert.deepEqual(pathToSvg(info(psd, 'Color Fill 1').vectorMask!.paths, 1, 1).map((s) => s.operation), [3, 3]);
    assert.deepEqual(pathToSvg(info(psd, 'Gradient Fill 1').vectorMask!.paths, psd.width, psd.height), []);
  });

  it('leaves open subpaths open and merges subpaths of one component', () => {
    const psd = open('slices.psd');
    const layers = psd.layers.map((l) => l.info.vectorMask?.paths ?? []);
    const openPath = layers.find((paths) => paths.some((p) => p.recordType === 3))!;
    const shapes = pathToSvg(openPath, psd.width, psd.height);
    assert.equal(shapes.length, 1);
    const { d } = shapes[0]!;
    assert.equal(d.match(/C/g)!.length, 17); // 18 knots
    assert.match(d, /^M680\.98 143\.446C[^MZ]+$/);

    const ring = layers.find((paths) => paths.some((p) => p.recordType === 0 && p.operation === -1))!;
    const merged = pathToSvg(ring, psd.width, psd.height);
    // Three subpaths combined by -1 form one component, then a separate one.
    assert.deepEqual(
      merged.map(({ operation, d }) => [operation, d.match(/M/g)!.length, d.match(/Z/g)!.length]),
      [[1, 3, 3], [1, 1, 1]],
    );
  });

  it('throws on knots that do not match their subpath records', () => {
    const paths = open('path.psd').layers[0]!.info.vectorMask!.paths;
    assert.throws(() => pathToSvg(paths.slice(3), 1, 1), /knot outside/);
    assert.throws(() => pathToSvg(paths.slice(0, -1), 1, 1), /3 of its 4 knots/);
    assert.throws(() => pathToSvg([...paths, ...paths.slice(3)], 1, 1), /knot outside/);
    assert.throws(() => pathToSvg([{ recordType: 0, numPoints: 0, operation: -1 }], 1, 1), /component that does not exist/);
  });
});

describe('linked files', () => {
  it('reads embedded files and opens embedded documents (#102)', () => {
    const psd = open('slices.psd');
    assert.equal(psd.linkedFiles.length, 1);
    const file = psd.linkedFiles[0]!;
    assert.deepEqual(
      { id: file.id, name: file.name, type: file.type, fileType: file.fileType, creator: file.creator, size: file.data?.length },
      { id: '844291a5-849d-1176-a2e8-8582ed9e0fef', name: 'Status bar black', type: 'embedded', fileType: '8BPB', creator: '8BIM', size: 1048576 },
    );
    const node = psd.tree.descendants().find((n) => n.name === 'status-bar')!;
    assert.ok(node.type === 'layer');
    assert.equal(node.linkedFile, file);

    const inner = new PSD(file.data!);
    assert.deepEqual([inner.header.version, inner.width, inner.height], [2, 616, 27]);
    assert.deepEqual(inner.tree.childrenAtPath('Status bar black/Battery')[0]!.children.map((n) => n.name), ['+', 'Charge', 'battery', '100%']);
  });

  it('matches smart object layers in PSB files', () => {
    const psd = open('example.psb');
    const layers = psd.tree.descendants().filter((n) => n.type === 'layer' && n.info.placedLayer);
    assert.deepEqual(layers.map((n) => n.type === 'layer' && n.linkedFile?.name), ['1431870.jpg', 'Screen Shot 2015-09-08 at 11.39.28.jpg']);
    for (const file of psd.linkedFiles) assert.deepEqual([...file.data!.subarray(0, 3)], [0xff, 0xd8, 0xff]); // JPEG
  });

  it('reads external files and the 8-byte lnkE length in PSB files', () => {
    const files = open('placedLayer.psb').linkedFiles;
    assert.deepEqual(files.map((f) => [f.type, f.name, f.fileType]), [
      ['embedded', 'linked-layer.png', 'png '],
      ['external', 'linked-layer.png', 'png '],
      ['external', '1layer.psd', '8BPS'],
    ]);
    // The embedded copy is byte-identical to psd-tools' tests/psd_files/linked-layer.png.
    const data = files[0]!.data!;
    const blobSha = createHash('sha1').update(`blob ${data.length}\0`).update(data).digest('hex');
    assert.equal(blobSha, 'edace7a43ceabf53447d107c67672b349b7dbb73');
    assert.equal(files[1]!.data, undefined);
    assert.equal(files[2]!.location!.relPath, '1layer.psd');
  });

  it('is empty without linked files', () => {
    assert.deepEqual(open('example.psd').linkedFiles, []);
    assert.deepEqual(open('indexed.psd').linkedFiles, []);
  });
});
