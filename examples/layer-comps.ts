// Shows which top-level groups and layers are visible in each layer comp.
// Usage: node examples/layer-comps.ts [file.psd]
import { readFile } from 'node:fs/promises';
import { PSD } from '../src/index.ts';

const psd = new PSD(await readFile(process.argv[2] ?? 'examples/images/example.psd'));

for (const comp of psd.resources.layerComps) {
  const tree = psd.tree.filterByComp(comp);
  const visible = tree.children.filter((n) => n.visible).map((n) => n.name);
  console.log(`${comp.name}: ${visible.join(', ')}`);
}
