# Development

Requires Node 24, which runs the TypeScript sources directly.

```sh
npm install
npm test            # node:test, runs test/*.test.ts
npm run typecheck
npm run build       # compiles src/ to dist/
```

Test fixtures live in `test/fixtures` (most come from PSD.rb's specs) and `examples/images`. The image tests check decoded pixels against hashes of psd.js 3.x output, so a failure there means the output changed.

## Examples

```sh
node examples/tree.ts path/to/file.psd
node examples/export-png.ts path/to/file.psd   # writes to ./output
```

For the browser example, run `npm run build`, serve the repository root (e.g. `npx serve .`) and open `/examples/browser.html`.

## Layout

* `src/psd.ts`: entry point and header
* `src/reader.ts`: binary reader
* `src/resources.ts`: image resources (layer comps, guides, slices...)
* `src/layer.ts`: layer records and the layer and mask section
* `src/layer-info.ts`: every additional layer info block. Add new blocks to `LAYER_INFO` and `layer.info` picks up their types.
* `src/type-tool.ts`, `src/engine-data.ts`: text layers
* `src/image.ts`, `src/png.ts`: pixel decoding and PNG encoding
* `src/nodes.ts`: the document tree

## Publishing

1. Merge everything that should be in the release.
2. `npm version <major|minor|patch>`, then `git push --follow-tags`.
3. Create a GitHub release for the tag with the changes.
4. `npm publish`. `prepublishOnly` typechecks, tests and builds first.
