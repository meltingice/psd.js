# PSD.js

A general purpose Photoshop (PSD and PSB) parser for Node and the browser, written in TypeScript with no runtime dependencies. Based on [PSD.rb](https://github.com/layervault/psd.rb).

It gives you a Photoshop document as a tree of groups and layers, along with:

* Document size, color mode and bit depth
* Layer and group names, bounds, visibility, opacity, blend modes and locks
* Text contents, fonts, sizes, colors, alignment and character styles like tracking and caps
* Vector masks, layer styles, adjustment layers, smart objects and the rest of nearly 50 layer info blocks
* Layer comps, guides, slices, resolution info and XMP metadata
* The flattened composite image and individual layer images, as RGBA pixels or PNG

## Installation

```sh
npm install psd
```

Requires Node 20+ or a modern browser. The package is ESM only.

To check the installed version at runtime, import its `package.json`:

```ts
import pkg from 'psd/package.json' with { type: 'json' };
pkg.version; // '4.1.0'
```

## Usage

`new PSD()` takes the file contents as an `ArrayBuffer` or any typed array (including a Node `Buffer`). It only reads the header up front; everything else is parsed lazily when you first access it, so opening large files is fast.

### Node

```ts
import { readFile, writeFile } from 'node:fs/promises';
import { PSD } from 'psd';

const psd = new PSD(await readFile('file.psd'));

console.log(psd.width, psd.height, psd.header.modeName);
console.log(JSON.stringify(psd.tree, null, 2));

await writeFile('composite.png', await psd.image.toPng());
```

### Browser

```ts
import { PSD } from 'psd';

// From a URL
const psd = new PSD(await (await fetch('/file.psd')).arrayBuffer());

// From a file input or drag and drop
const psd = new PSD(await file.arrayBuffer());

// Draw the composite on a canvas
const { width, height, data } = await psd.image.decode();
canvas.getContext('2d').putImageData(new ImageData(data, width, height), 0, 0);
```

See [`examples/`](examples) for more. The Node examples run directly with `node examples/tree.ts`.

### The document tree

`psd.tree` is the root of the document hierarchy. Every node has a `type` of `'root'`, `'group'` or `'layer'`, which TypeScript uses to narrow the node's type.

```ts
const tree = psd.tree;

tree.children;                // top-level groups and layers
tree.descendants();           // every node below, depth first
tree.subtree();               // the node itself followed by its descendants
tree.descendants().filter((n) => n.type === 'layer'); // just layers

const [matte] = tree.childrenAtPath('Version A/Matte'); // or ['Version A', 'Matte']
matte.path;                   // 'Version A/Matte'
matte.parent;                 // the 'Version A' group
matte.ancestors();            // [the 'Version A' group]
matte.siblings;               // all children of the parent, including this node
matte.nextSibling;
matte.prevSibling;
matte.depth;                  // 2; the root is 0
matte.root;                   // the root node
tree.findById(32);            // by layer ID
```

`childrenAtPath` is case-insensitive unless you pass `{ caseSensitive: true }`, and it always returns an array because layer names don't have to be unique.

### Node properties

Groups and layers share these properties:

```ts
node.name;
node.id;                      // the layer ID
node.top; node.left; node.bottom; node.right; node.width; node.height;
node.visible;                 // accounts for clipping masks and layer comps
node.opacity;                 // 0 to 1
node.fillOpacity;             // 0 to 1
node.blendMode;               // 'normal', 'multiply', 'passthru', ...
node.clippingMask;            // the node this one is clipped to
node.allLocked; node.positionLocked; node.compositeLocked; node.transparencyLocked;
node.colorLabel;              // 'none', 'red', ...; inherited from ancestors
node.info;                    // layer info blocks; see below
node.layer;                   // the raw layer record
node.toJSON();                // a plain object; JSON.stringify(psd.tree) also works
```

Groups have `children` and `open`. Group bounds are calculated from their non-empty children. Layers have `image`. Both have `isEmpty`.

### Layer info

Most layer data lives in "additional layer information" blocks. `node.info` (or `layer.info`) has a typed property for each block in the layer. Each block is parsed the first time you access it:

```ts
const type = node.info.typeTool;     // undefined if this isn't a text layer
if (type) {
  type.text;                         // 'Make a change and save.'; paragraphs end in '\r', line breaks are '\u0003'
  type.fonts;                        // ['HelveticaNeue-Light', 'AdobeInvisFont', 'MyriadPro-Regular']
  type.sizes;                        // [33], in pixels before the transform
  type.pointSizes(psd.resources.resolutionInfo.vRes); // the point sizes Photoshop shows
  type.colors;                       // [[19, 120, 98, 255]]
  type.alignment;                    // ['center']
  type.runs;                         // per-run font, size, color, bold, italic, tracking, caps...
  type.transform;                    // { xx, xy, yx, yy, tx, ty }
  type.left; type.top; type.right; type.bottom; // the text frame or paragraph box, relative to tx/ty
  type.boundingBox;                  // { left, top, right, bottom } of the glyphs, relative to tx/ty
  type.boxBounds;                    // { left, top, right, bottom } of the paragraph text box; undefined for point text
  type.toCSS();
}
```

Each run in `type.runs` has its character styles: `font`, `size`, `color`, `leading`, `fauxBold`, `fauxItalic`, `underline`, `strikethrough`, `tracking` and `kerning` (in 1/1000 em; `kerning` is `'auto'` for the font's own kerning), `baselineShift` (in pixels like `sizes`; positive raises the text), `caps` (`'normal'`, `'small-caps'` or `'all-caps'`; `text` keeps the case it was typed in) and `baseline` (`'normal'`, `'superscript'` or `'subscript'`).

For paragraph text, `boxBounds` is the text box exactly as Photoshop draws it. The frame (`left`/`top`/`right`/`bottom`) usually matches it, but it can reach above or below the box to fit the first line, and files from older Photoshop versions don't store the frame. Like the frame and `boundingBox`, it's relative to `tx`/`ty` and before the rest of `transform`: a box resized with Free Transform keeps its stored size, and `transform` scales it in the document.

```ts
node.info.vectorMask?.paths;         // path records
node.info.solidColor;                // { r, g, b }
node.info.placedLayer;               // smart object descriptor
node.info.locked;                    // { all, position, composite, transparency }
node.info.hueSaturation;             // adjustment layer settings
Object.keys(node.info);              // the blocks this layer has
```

`node.layer.infoBlocks` lists every block in the layer, including ones this library doesn't parse.

Some blocks are stored as Photoshop descriptors. Their contents vary between Photoshop versions, so they're typed loosely. `descriptorColor()` converts a descriptor color (RGB, HSB, CMYK, grayscale or Lab) to `[r, g, b]`.

### Layer styles

`node.info.objectEffects` normalizes the layer styles. Each effect is a list, since Photoshop CC allows several drop shadows, strokes and overlays per layer:

```ts
const styles = node.info.objectEffects;
if (styles?.enabled) {
  for (const shadow of styles.dropShadows) {
    shadow.enabled; shadow.color;              // [0, 0, 0]
    shadow.opacity; shadow.blendMode;          // 0.75, 'multiply'
    shadow.angle; shadow.distance; shadow.size;
  }
  styles.strokes;          // size, position, fillType, color/gradient/pattern
  styles.gradientOverlays; // gradient stops, angle, style, scale
  // also innerShadows, outerGlows, innerGlows, bevels, satins, colorOverlays, patternOverlays
  styles.data;             // the raw descriptor
}
```

Files from before Photoshop 6 store effects in `node.info.effectsLayer` instead.

### Images

Image decoding is asynchronous because ZIP-compressed data is inflated with the platform's `DecompressionStream`.

```ts
const composite = await psd.image.decode();  // { width, height, data: RGBA Uint8ClampedArray }
const png = await psd.image.toPng();         // Uint8Array

if (node.type === 'layer') {
  await node.image.decode();                 // the layer's own pixels, at node.left/top
  await node.image.decodeMask();             // the user mask as grayscale, or undefined
  await node.image.toPng();
}
```

The mask's bounds and settings are in `node.layer.mask`, including the density (0 to 1) and feather (pixels) from the Properties panel: `density` and `feather` for the user mask, `vectorDensity` and `vectorFeather` for the vector mask. They aren't applied to the decoded mask.

`decode()` and `toPng()` decode the pixels again on every call and don't keep them, so exporting every layer of a large document only holds one layer's pixels at a time. Keep the result if you need it more than once.

The composite is only present if the file was saved with "Maximize Compatibility" enabled. Decoding supports RGB, CMYK, grayscale, duotone, indexed, Lab and multichannel images at 8 or 16 bits per channel, and 1-bit bitmaps, with raw, RLE or ZIP compression. CMYK, Lab and multichannel colors are converted with simple formulas rather than color profiles, so they're close to Photoshop's but not exact. Multichannel images must have 3 or 4 channels, which are treated as CMY(K) inks.

`encodePng({ width, height, data })` encodes any grayscale or RGBA pixels. Pass `{ iccProfile }` as the second argument to embed an ICC profile; it must be an RGB profile for RGBA pixels or a grayscale one for grayscale pixels.

`toPng()` embeds the document's ICC profile (`psd.resources.iccProfile`) when it's an RGB profile. CMYK and Lab colors are converted to approximate sRGB and grayscale documents decode to RGBA, so their profiles don't describe the output and aren't embedded. Pass `{ embedProfile: false }` to leave the profile out, e.g. for smaller files when the document is sRGB anyway:

```ts
const png = await psd.image.toPng({ embedProfile: false });
```

### Resources

```ts
psd.resources.layerComps;      // [{ id, name, capturedInfo }]
psd.resources.guides;          // [{ location, direction }]
psd.resources.slices;          // { version, name, bounds, slices }
psd.resources.resolutionInfo;  // { hRes, vRes, ... }
psd.resources.xmpMetadata;     // the XMP packet as a string
psd.resources.iccProfile;      // the ICC color profile as a Uint8Array
psd.resources.globalAngle;     // 120, the global light angle in degrees for styles with useGlobalLight
psd.resources.globalAltitude;  // 30, the global light altitude in degrees
psd.resources.workPath;        // path records
psd.resources.savedPaths;      // [{ id, name, records }]
psd.resources.bytes(1036);     // the raw bytes of any resource block
```

### Layer comps

```ts
const tree = psd.tree.filterByComp('Version A'); // a new tree with the comp's visibility and positions
node.visibleInComp('Version B');
node.positionInComp(725235304);                  // by name or ID
```

## Upgrading from 3.x

4.0 is a TypeScript rewrite with a new API. The main changes:

| 3.x | 4.0 |
| --- | --- |
| `require('psd')` | `import { PSD } from 'psd'` (ESM only) |
| `PSD.fromFile(path)` + `psd.parse()` | `new PSD(await readFile(path))`; no `parse()` |
| `PSD.open(path)` | `new PSD(await readFile(path))` |
| `PSD.fromURL(url)` / `fromEvent` / `fromDroppedFile` | `new PSD(await response.arrayBuffer())` / `new PSD(await file.arrayBuffer())` |
| `psd.tree()` | `psd.tree` |
| `node.get('name')`, `node.get('width')` | `node.name`, `node.width` |
| `node.get('typeTool')`, `layer.typeTool()` | `node.info.typeTool` |
| `typeTool.export().value`, `typeTool.fonts()` | `typeTool.text`, `typeTool.fonts` |
| `typeTool.lengthArray()`, `fontStyles()`, `fontWeights()`, `textDecoration()` | `typeTool.runs` |
| `node.export()` | `node.toJSON()` |
| `node.isLayer()`, `isGroup()`, `isRoot()` | `node.type === 'layer'`, etc. |
| `node.children()`, `siblings()`, `depth()`, `path()` ... | properties: `node.children`, `node.siblings`, `node.depth`, `node.path` |
| `node.hasChildren()`, `childless()`, `hasSiblings()`, `onlyChild()` | `node.children.length`, `node.siblings.length` |
| `psd.image.pixelData` | `(await psd.image.decode()).data` |
| `psd.image.toPng()` (pngjs / `<img>`) | `await psd.image.toPng()` returns PNG bytes |
| `psd.image.saveAsPng(path)` | `writeFile(path, await psd.image.toPng())` |
| `psd.resources.resource('layerComps').export()` | `psd.resources.layerComps` |
| `psd.layers` | `psd.layers` (now also populated for 16-bit files) |

New in 4.0: PSB support, 16-bit layers, ZIP-compressed image data, bitmap/indexed/Lab/multichannel decoding, typed layer styles, ~30 more layer info blocks, slices, paths, XMP, lock inheritance, layer comp filtering, and fixes for grayscale layer images.

## Limitations

* There's no renderer, so layers can't be composited, and a node can't be exported with its effects applied. The composite stored in the file is available as `psd.image`.
* 32-bit images can be parsed but not decoded to pixels.

## License

MIT
