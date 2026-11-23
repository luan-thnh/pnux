import fs from 'node:fs';
import path from 'node:path';

const NET_SOURCES = [
  ['/proc/net/tcp', 'TCP', 'IPv4'],
  ['/proc/net/tcp6', 'TCP', 'IPv6'],
  ['/proc/net/udp', 'UDP', 'IPv4'],
  ['/proc/net/udp6', 'UDP', 'IPv6'],
];

function safeRead(file) {
  try { return fs.readFileSync(file, 'utf8'); } catch { return null; }
}

function byteReverseEachWord(hex) {
  return hex.match(/.{8}/g)?.map(w => w.match(/../g).reverse().join('')).join('') ?? hex;
}

export function decodeAddress(hex, family) {
  if (family === 'IPv4') {
    const bytes = hex.match(/../g);
    return bytes?.length === 4 ? bytes.reverse().map(s => parseInt(s, 16)).join('.') : '?';
  }
  if (!/^[0-9A-Fa-f]{32}$/.test(hex)) return '?';
  const normalized = byteReverseEachWord(hex);
  const groups = normalized.match(/.{4}/g).map(g => parseInt(g, 16));
  const pieces = groups.map(g => g.toString(16));
  let bestStart = -1, bestLength = 1;
  for (let i = 0; i < groups.length;) {
    if (groups[i] !== 0) { i++; continue; }
    let j = i;
    while (j < groups.length && groups[j] === 0) j++;
    if (j - i > bestLength) { bestStart = i; bestLength = j - i; }
    i = j;
  }
  if (bestStart < 0) return pieces.join(':');
  const left = pieces.slice(0, bestStart).join(':');
  const right = pieces.slice(bestStart + bestLength).join(':');
  return `${left}::${right}`;
}

export function parseNetTable(table, protocol, family) {
  if (!table) return [];
  const lines = table.trim().split(/\r?\n/).slice(1);
  return lines.flatMap(line => {
    const fields = line.trim().split(/\s+/);
    if (fields.length < 10) return [];
    // Linux kernel TCP state 0A = LISTEN; UDP 07 = UNCONN (bound socket).
    if (protocol === 'TCP' && fields[3] !== '0A') return [];
    if (protocol === 'UDP' && fields[3] !== '07') return [];
    const [addressHex, portHex] = fields[1].split(':');
    const port = Number.parseInt(portHex, 16);
    const uid = Number(fields[7]);
    const inode = fields[9];
    if (!Number.isInteger(port) || port === 0 || port > 65535 || !Number.isInteger(uid) || !/^\d+$/.test(inode) || inode === '0') return [];
    return [{ protocol, family, host: decodeAddress(addressHex, family), port, uid, inode }];
  });
}

export function parseProcStat(raw) {
  if (!raw) return null;
  const end = raw.lastIndexOf(')');
  if (end < 0) return null;
  const fields = raw.slice(end + 1).trim().split(/\s+/);
  if (fields.length < 20) return null;
  const ppid = Number(fields[1]);
  return { ppid, startTime: fields[19] };
}

export function readProcess(pid, procRoot = '/proc') {
  if (!Number.isSafeInteger(pid) || pid <= 0) return null;
  const base = path.join(procRoot, String(pid));
  const stat = parseProcStat(safeRead(path.join(base, 'stat')));
  const status = safeRead(path.join(base, 'status'));
  if (!stat || !status) return null;
  const uidLine = status.match(/^Uid:\s+(\d+)/m);
  if (!uidLine) return null;
  const uid = Number(uidLine[1]);
  const name = (safeRead(path.join(base, 'comm')) || '?').trim();
  const cmdline = safeRead(path.join(base, 'cmdline'));
  const command = cmdline ? cmdline.replace(/\x00/g, ' ').trim().slice(0, 600) : null;
  let executable = null;
  try { executable = fs.readlinkSync(path.join(base, 'exe')); } catch { /* denied */ }
  let cwd = null;
  try { cwd = fs.readlinkSync(path.join(base, 'cwd')); } catch { /* denied */ }
  return { pid, uid, name, command, cwd, executable, ...stat };
}

export function getAncestors(pid = process.pid, procRoot = '/proc') {
  const seen = new Set();
  for (let i = 0; i < 100 && pid > 0 && !seen.has(pid); i++) {
    seen.add(pid);
    const proc = readProcess(pid, procRoot);
    if (!proc) break;
    pid = proc.ppid;
  }
  return seen;
}

function getOwnProcesses(uid, procRoot) {
  const processes = [];
  for (const dirname of fs.readdirSync(procRoot)) {
    if (!/^\d+$/.test(dirname)) continue;
    const pid = Number(dirname);
    const info = readProcess(pid, procRoot);
    if (info && info.uid === uid) processes.push(info);
  }
  return processes;
}

export function ownedSocketsOfPid(pid, procRoot = '/proc') {
  const inodes = new Set();
  const dir = path.join(procRoot, String(pid), 'fd');
  let fds;
  try { fds = fs.readdirSync(dir); } catch { return inodes; }
  for (const fd of fds) {
    let target;
    try { target = fs.readlinkSync(path.join(dir, fd)); } catch { continue; }
    const match = /^socket:\[(\d+)\]$/.exec(target);
    if (match) inodes.add(match[1]);
  }
  return inodes;
}

/** Read-only: the active network namespace's bound sockets and owner PIDs if same UID. */
export function scanPorts({ udp = false, procRoot = '/proc', uid = process.getuid?.() } = {}) {
  if (process.platform !== 'linux') throw new Error('Portlane v0.1 supports Linux only.');
  if (!Number.isInteger(uid)) throw new Error('Cannot determine current UNIX uid.');
  const sockets = NET_SOURCES.flatMap(([file, proto, family]) => {
    if (!udp && proto === 'UDP') return [];
    const source = procRoot === '/proc' ? file : path.join(procRoot, 'net', path.basename(file));
    return parseNetTable(safeRead(source), proto, family);
  });
  const unique = new Map();
  for (const socket of sockets) unique.set(`${socket.protocol}/${socket.family}/${socket.host}/${socket.port}/${socket.inode}`, socket);
  const socketsByInode = new Map();
  for (const socket of unique.values()) {
    if (!socketsByInode.has(socket.inode)) socketsByInode.set(socket.inode, []);
    socketsByInode.get(socket.inode).push(socket);
  }
  const matches = new Map();
  for (const proc of getOwnProcesses(uid, procRoot)) {
    for (const inode of ownedSocketsOfPid(proc.pid, procRoot)) {
      if (!socketsByInode.has(inode)) continue;
      if (!matches.has(inode)) matches.set(inode, []);
      matches.get(inode).push(proc);
    }
  }
  const rows = [];
  for (const socket of unique.values()) {
    const owners = matches.get(socket.inode) ?? [];
    if (!owners.length) rows.push({ ...socket, pid: null, name: 'restricted / unknown', startTime: null, executable: null, command: null, cwd: null });
    else for (const proc of owners) rows.push({ ...socket, pid: proc.pid, name: proc.name, startTime: proc.startTime, executable: proc.executable, command: proc.command, cwd: proc.cwd });
  }
  return rows.sort((a, b) => a.port - b.port || a.protocol.localeCompare(b.protocol) || (a.pid ?? 0) - (b.pid ?? 0));
}
