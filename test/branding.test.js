import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

test('pnix package name and executable stay aligned', () => {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(pkg.name, 'pnix');
  assert.equal(pkg.version, '0.7.0');
  assert.deepEqual(Object.keys(pkg.bin), ['pnix']);
  assert.ok(existsSync(resolve(pkg.bin.pnix)));
  assert.equal(pkg.bin.pnix, './bin/pnix.js');
  const html = readFileSync(new URL('../docs/index.html', import.meta.url), 'utf8');
  const js = readFileSync(new URL('../docs/app.js', import.meta.url), 'utf8');
  assert.match(html, /npx pnix/);
  assert.match(js, /copy\('npx pnix'/);
});
