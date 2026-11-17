// Prints the document tree as JSON.
// Usage: node examples/tree.ts [file.psd]
import { readFile } from 'node:fs/promises';
import { PSD } from '../src/index.ts';

const psd = new PSD(await readFile(process.argv[2] ?? 'examples/images/example.psd'));
console.log(JSON.stringify(psd.tree, null, 2));
