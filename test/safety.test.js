import test from 'node:test';
import assert from 'node:assert/strict';
import { safetyCheck, terminatePort, SafetyError } from '../src/safety.js';

const uid = 1000; // synthetic non-root user to exercise safety branches under any test runner
const row = {protocol:'TCP', family:'IPv4', host:'127.0.0.1', port:3000, uid, inode:'123', pid:99999, name:'node', startTime:'1000', executable:'/usr/bin/node'};

test('root cannot kill anything', () => {
  assert.match(safetyCheck({...row,uid:0},{uid:0,ancestors:new Set(),allRows:[]}),/root/);
});

test('foreign, privileged, and unresolvable ports are locked', () => {
  const context = {uid, ancestors:new Set(), allRows:[row]};
  assert.match(safetyCheck({...row,uid:uid+1},context),/owned/);
  assert.match(safetyCheck({...row,pid:null},context),/unavailable/);
  assert.match(safetyCheck({...row,port:80},context),/Privileged/);
});

test('protected system processes and parent processes are locked', () => {
  assert.match(safetyCheck({...row,name:'systemd'},{uid,ancestors:new Set(),allRows:[]}),/system/);
  assert.match(safetyCheck(row,{uid,ancestors:new Set([99999]),allRows:[]}),/parent/);
  assert.match(safetyCheck(row,{uid,ancestors:new Set(),allRows:[row,{...row,port:22}]}),/privileged/);
});

test('ordinary unprivileged owned dev server is eligible (non-root only)', () => {
  if (uid === 0) return;
  assert.equal(safetyCheck(row,{uid,ancestors:new Set(),allRows:[row]}),null);
});

test('stale snapshot never sends signal', () => {
  let called = false;
  assert.throws(() => terminatePort(row, {
    uid, scan:()=>[], sendSignal:()=>{called=true;}
  }), SafetyError);
  assert.equal(called,false);
});
