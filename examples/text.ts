// Lists every text layer with its fonts and CSS.
// Usage: node examples/text.ts [file.psd]
import { readFile } from 'node:fs/promises';
import { PSD } from '../src/index.ts';

const psd = new PSD(await readFile(process.argv[2] ?? 'examples/images/example.psd'));

for (const node of psd.tree.descendants()) {
  const type = node.info.typeTool;
  if (!type) continue;
  console.log(`${node.path}: ${JSON.stringify(type.text)}`);
  console.log(`  fonts: ${type.fonts.join(', ')}`);
  console.log(`  ${type.toCSS().replaceAll('\n', '\n  ')}`);
}
