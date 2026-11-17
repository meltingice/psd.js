import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

describe('package', () => {
  it('exports package.json so callers can read the version', async () => {
    // Imported by package name, the way a dependent project would.
    const { default: pkg } = await import('psd/package.json', { with: { type: 'json' } });
    const expected = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    assert.equal(pkg.version, expected.version);
  });
});
