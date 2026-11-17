// Saves the composite image and every non-empty layer as PNGs in ./output.
// Usage: node examples/export-png.ts [file.psd]
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PSD } from '../src/index.ts';

const psd = new PSD(await readFile(process.argv[2] ?? 'examples/images/example.psd'));
await mkdir('output', { recursive: true });

const start = performance.now();
await writeFile('output/composite.png', await psd.image.toPng());

for (const node of psd.tree.descendants()) {
  if (node.type !== 'layer' || node.isEmpty) continue;
  await writeFile(`output/${node.path.replaceAll('/', ' - ')}.png`, await node.image.toPng());
}
console.log(`Finished in ${Math.round(performance.now() - start)}ms`);
