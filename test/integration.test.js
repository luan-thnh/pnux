import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { scanPorts, getAncestors } from '../src/linux.js';
import { manageablePorts } from '../src/managed.js';
import { terminatePort } from '../src/safety.js';

const childCode = `
const net = require('node:net');
const server = net.createServer(() => {});
server.listen(0, '127.0.0.1', () => {
  if (process.send) process.send({port: server.address().port});
});
`;

test('discovers a real child development server and sends only SIGTERM to its PID', {skip: process.platform !== 'linux' || process.getuid?.() === 0, timeout:15000}, async () => {
  const child = spawn(process.execPath, ['-e', childCode], { stdio:['ignore','ignore','pipe','ipc'] });
  let gone = false;
  try {
    const [msg] = await once(child,'message');
    const port = msg.port;
    assert.ok(port >= 1024);
    let observed;
    for (let retry = 0; retry < 30; retry++) {
      observed = scanPorts().find(row => row.port === port && row.pid === child.pid);
      if (observed) break;
      await new Promise(resolve => setTimeout(resolve, 75));
    }
    assert.ok(observed, 'find newly created child listener by inode and PID');
    assert.equal(observed.name, 'node');
    const display = manageablePorts(scanPorts(), { uid: process.getuid(), ancestors: getAncestors() });
    assert.ok(display.some(item => item.port === port && item.pid === child.pid),
      'actual child port is visible in the simple UI');
    const sent = terminatePort(observed);
    assert.equal(sent.pid, child.pid);
    assert.equal(sent.signal, 'SIGTERM');
    await once(child,'exit');
    gone = true;
    const leftover = scanPorts().find(row => row.port === port && row.pid === child.pid);
    assert.equal(leftover, undefined);
  } finally {
    if (!gone && child.exitCode === null) child.kill('SIGKILL'); // clean up only test-owned child
  }
});
