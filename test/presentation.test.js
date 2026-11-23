import test from 'node:test';
import assert from 'node:assert/strict';
import { collapseRows, viewRows, isLikelyDev, cleanTerminal } from '../src/presentation.js';
import { safetyCheck } from '../src/safety.js';

const mk = (port,pid,name,protocol='TCP',family='IPv4') => ({ port,pid,name,protocol,family,host:'127.0.0.1',inode:String(port)+family,uid:1000,startTime:'1234',executable:'/usr/bin/node' });
const sockets = [
  mk(53,null,'restricted / unknown'),
  mk(1716,9948,'gjs'),
  mk(3000,147693,'next-server (v1)','TCP','IPv6'),
  mk(3000,147693,'next-server (v1)'),
  mk(35867,65683,'codex'),
  mk(9614,8603,'java'),
];

test('default DEV screen highlights :3000 but hides unrelated GNOME and system sockets', () => {
  const displayed = viewRows(sockets);
  assert.deepEqual(displayed.map(row=>row.port),[3000]);
  assert.equal(displayed[0].name,'next-server (v1)');
});

test('IPv4 and IPv6 listeners belonging to one process appear as one port', () => {
  const entries = collapseRows(sockets);
  assert.equal(entries.filter(row=>row.port===3000).length,1);
  assert.equal(entries.find(row=>row.port===3000).listeners.length,2);
  assert.equal(entries.find(row=>row.port===3000).family,'IPv4');
});

test('search checks all sockets, even ones hidden by default', () => {
  assert.equal(viewRows(sockets,{mode:'dev',search:'53'}).length,1);
  assert.equal(viewRows(sockets,{mode:'dev',search:'codex'}).length,1);
  assert.equal(viewRows(sockets,{mode:'dev',search:'3000'}).length,1);
});

test('mine view excludes unmapped system rows; all view keeps them', () => {
  assert.equal(viewRows(sockets,{mode:'mine'}).length,4);
  assert.equal(viewRows(sockets,{mode:'all'}).length,5);
});

test('does not interpret gjs or codex as development services', () => {
  assert.equal(isLikelyDev(mk(1716,9948,'gjs')),false);
  assert.equal(isLikelyDev(mk(35867,65683,'codex')),false);
  assert.equal(isLikelyDev(mk(5173,147693,'node')),true);
  assert.equal(isLikelyDev(mk(8000,147693,'my-server')),true);
  assert.equal(isLikelyDev(mk(8080,null,'restricted / unknown')),false);
});

test('GNOME and Codex stay protected from SIGTERM', () => {
  const ctx={uid:1000,ancestors:new Set(),allRows:[]};
  assert.match(safetyCheck(mk(1716,9948,'gjs'),ctx),/Protected/);
  assert.match(safetyCheck(mk(35867,65683,'codex'),ctx),/Protected/);
});

test('terminal input cannot inject ANSI control sequences into a view', () => {
  assert.equal(cleanTerminal('node\u001b[2J\nserver'), 'node [2J server');
});
