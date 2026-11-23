import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('pnux9 package name and executable stay aligned', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'pnux9');
  assert.equal(pkg.version, '0.6.0');
  assert.deepEqual(Object.keys(pkg.bin), ['pnux9', 'pnux']);
  assert.ok(existsSync(resolve(pkg.bin.pnux9)));
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../docs/app.js', import.meta.url), 'utf8');
  assert.match(html, /npx pnux9/);
  assert.match(js, /copy\('npx pnux9'/);
});
