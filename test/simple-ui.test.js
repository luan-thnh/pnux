import test from 'node:test';
import assert from 'node:assert/strict';
import { manageablePorts } from '../src/managed.js';
import { renderTableScreen } from '../src/ui.js';
import { entryIdentity, toggleSelected, retainExistingSelections, resolveTargets } from '../src/selection.js';

const make = (port, pid, name, uid = 1000, family = 'IPv4') => ({
  port, pid, name, uid, family, protocol: 'TCP', host: '127.0.0.1', inode: String(port) + (family === 'IPv4' ? '1' : '2'),
  startTime: '12345', executable: '/usr/bin/node', command: name,
});
const context = { uid: 1000, ancestors: new Set([77]) };
const plain = str => str.replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '');

const entries = [make(3000, 123, 'next-server (v1)'), make(5173, 124, 'vite'), make(9614, 125, 'java')];

test('only safe/manageable apps appear and development ports sort first', () => {
  const inputs = [
    make(53, null, 'restricted / unknown'), make(9614, 122, 'java'),
    make(3000, 123, 'next-server (v1)', 1000, 'IPv6'),
    make(3000, 123, 'next-server (v1)'),
    make(1716, 124, 'gjs'), make(35867, 125, 'codex'),
    make(8000, 126, 'python3', 1001), make(5173, 77, 'node'),
  ];
  const managed = manageablePorts(inputs, context);
  assert.deepEqual(managed.map(row => row.port), [3000, 9614]);
  assert.equal(managed[0].listeners.length, 2);
});

test('simple compact table prioritizes PORT and PROCESS, relegating PID', () => {
  const result = plain(renderTableScreen({ entries, columns: 80, rows: 24 }));
  assert.match(result, /PNIX/);
  assert.match(result, /PORT\s+PROCESS\s+PID/);
  assert.match(result, /\[ \]\s+:3000\s+next-server \(v1\)\s+123/);
  assert.match(result, /\[ \]\s+:5173\s+vite\s+124/);
  assert.match(result, /Space Check\s+Enter Stop\s+q Quit/);
  assert.doesNotMatch(result, /SOCKETS|FILTER|DETAILS|My Processes|READY|All Sockets/i);
});

test('Space toggles multiple independent port checks, preserves cursor row position', () => {
  let checked = new Set();
  checked = toggleSelected(checked, entries[0]);
  checked = toggleSelected(checked, entries[2]);
  assert.equal(checked.size, 2);
  const result = plain(renderTableScreen({ entries, selected: checked, cursor: 2 }));
  assert.match(result, /2 checked/);
  assert.match(result, /\[x\]\s+:3000/);
  assert.match(result, /\[ \]\s+:5173/);
  assert.match(result, /\[x\]\s+:9614/);
  assert.match(result, /› \[x\]\s+:9614/);
  checked = toggleSelected(checked, entries[0]);
  assert.equal(checked.size, 1);
});

test('Enter targets all checked rows; no checks means current highlighted row', () => {
  const selected = new Set([entryIdentity(entries[0]), entryIdentity(entries[2])]);
  const batch = resolveTargets(entries, selected, 1);
  assert.deepEqual(batch.ports, [3000, 9614]);
  assert.equal(batch.targets.length, 2);
  const one = resolveTargets(entries, new Set(), 1);
  assert.deepEqual(one.ports, [5173]);
  assert.equal(one.targets[0].pid, 124);
});

test('multiple checked port rows belonging to one PID signal once, not twice', () => {
  const duplicate = { ...make(3001, 123, 'next-server (v1)'), startTime: entries[0].startTime };
  const rows = [entries[0], duplicate, entries[2]];
  const checked = new Set([entryIdentity(rows[0]), entryIdentity(rows[1]), entryIdentity(rows[2])]);
  const batch = resolveTargets(rows, checked);
  assert.equal(batch.rows.length, 3);
  assert.equal(batch.targets.length, 2);
  const result = plain(renderTableScreen({ entries: rows, selected: checked, pending: batch }));
  assert.match(result, /Stop 3 ports \(2 processes\)\? \[y\/N\]/);
  assert.match(result, /:3000, :3001, :9614/);
  assert.match(result, /Stops entire processes/);
});

test('stale selection is discarded if PID startTime or socket changes', () => {
  const selected = new Set([entryIdentity(entries[0]), entryIdentity(entries[1])]);
  const changed = [{ ...entries[0], startTime: 'new-start' }, entries[1], entries[2]];
  assert.deepEqual([...retainExistingSelections(selected, changed)], [entryIdentity(entries[1])]);
  const changedSocket = [{...entries[1], inode: '123456789' }];
  assert.equal(retainExistingSelections(selected, changedSocket).size, 0);
});

test('TUI escapes process names and truncates in narrow terminal without losing controls', () => {
  const rows = Array.from({ length: 20 }, (_, i) => make(3000 + i, 1000 + i, 'my-node-very-long-process-\x1b[2J'));
  const result = plain(renderTableScreen({ entries: rows, cursor: 15, columns: 45, rows: 12 }));
  assert.match(result, /Enter Stop/);
  assert.match(result, /:3015/);
  assert.doesNotMatch(result, /\x1b/);
});

test('confirmation presents explicit y/N even for single row', () => {
  const batch = resolveTargets(entries, new Set(), 0);
  const result = plain(renderTableScreen({entries, pending: batch}));
  assert.match(result, /Stop 1 port \(1 process\)\? \[y\/N\]/);
});


test('small terminal widths keep the table and controls inside the viewport', () => {
  for (const columns of [38, 40, 45, 65, 80]) {
    const result = plain(renderTableScreen({ entries, columns, rows: 12 }));
    for (const line of result.trimEnd().split('\n')) {
      assert.ok(line.length <= columns, `line exceeds ${columns} columns: ${line}`);
    }
  }
});
