import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeAddress, parseNetTable, parseProcStat } from '../src/linux.js';

const header = '  sl  local_address rem_address   st tx_queue:rx_queue tr:tm->when retrnsmt   uid  timeout inode';

test('decodes little-endian Linux IPv4 and IPv6 addresses', () => {
  assert.equal(decodeAddress('0100007F', 'IPv4'), '127.0.0.1');
  assert.equal(decodeAddress('00000000', 'IPv4'), '0.0.0.0');
  assert.equal(decodeAddress('00000000000000000000000000000000', 'IPv6'), '::');
  assert.equal(decodeAddress('00000000000000000000000001000000', 'IPv6'), '::1');
});

test('parses listening TCP but rejects established sockets and invalid ports', () => {
  const rows = parseNetTable(`${header}\n  0: 0100007F:0BB8 00000000:0000 0A 0:0 00:0 0 1000 0 100\n  1: 0100007F:0BB8 00000000:0000 01 0:0 00:0 0 1000 0 101\n  2: 00000000:0000 00000000:0000 0A 0:0 00:0 0 1000 0 200\n`, 'TCP', 'IPv4');
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {protocol:'TCP', family:'IPv4',host:'127.0.0.1',port:3000,uid:1000,inode:'100'});
});

test('UDP requires explicit inclusion and bound state', () => {
  const text = `${header}\n  0: 00000000:14E9 00000000:0000 07 0:0 00:0 0 1000 0 500`;
  assert.equal(parseNetTable(text, 'TCP', 'IPv4').length, 0);
  assert.equal(parseNetTable(text, 'UDP', 'IPv4')[0].port, 5353);
});

test('proc stat start time parsing ignores parenthesized process names', () => {
  const parts = ['S', '1', ...Array(17).fill('0'), '1234567', '0'];
  const out = parseProcStat(`12345 (hello ) world) ${parts.join(' ')}`);
  assert.deepEqual(out, { ppid:1, startTime:'1234567' });
});
