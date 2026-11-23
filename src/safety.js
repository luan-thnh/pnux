import { getAncestors, readProcess, ownedSocketsOfPid, scanPorts } from './linux.js';

const PROTECTED_NAMES = new Set([
  'init', 'systemd', 'systemd-logind', 'systemd-resolved', 'systemd-network',
  'dbus-daemon', 'dbus-broker', 'polkitd', 'sshd', 'login', 'agetty',
  'NetworkManager', 'wpa_supplicant', 'dockerd', 'containerd', 'containerd-shim',
  'cron', 'crond', 'gdm', 'gdm3', 'gnome-shell', 'plasmashell', 'kwin_wayland',
  'kwin_x11', 'Xorg', 'Xwayland', 'pipewire', 'pipewire-pulse', 'wireplumber',
  'pulseaudio', 'gnome-terminal-', 'gnome-terminal-server', 'konsole',
  'bash', 'zsh', 'fish', 'sh', 'sudo', 'su', 'loginctl', 'code', 'firefox', 'chrome',
  'gjs', 'codex', 'gnome-keyring-d', 'gnome-session-b', 'gvfsd', 'xdg-desktop-por',
]);

export class SafetyError extends Error {
  constructor(message) { super(message); this.name = 'SafetyError'; }
}

export function safetyCheck(row, { uid = process.getuid?.(), ancestors = getAncestors(), allRows = [] } = {}) {
  if (process.platform !== 'linux') return 'Linux only';
  if (uid === 0) return 'Refused: running as root (never use sudo)';
  if (!Number.isInteger(uid) || !Number.isSafeInteger(row.pid) || row.pid < 2) return 'Owner PID unavailable';
  if (row.uid !== uid) return 'Not owned by current user';
  if (row.port < 1024) return 'Privileged port (<1024)';
  if (ancestors.has(row.pid)) return 'Protected: Portlane or its parent/terminal process';
  if (PROTECTED_NAMES.has(row.name) || /^(?:systemd|gnome|gvfs|xdg-)(?:-|$)/.test(row.name)) return 'Protected desktop/system process';
  if (!row.startTime || !/^[0-9]+$/.test(row.inode)) return 'Missing process identity';
  if (allRows.some(item => item.pid === row.pid && item.port < 1024)) return 'Process also owns a privileged port';
  return null;
}

export function relatedPorts(row, allRows) {
  return [...new Set(allRows.filter(item => item.pid === row.pid).map(item => `${item.protocol}/${item.port}`))].sort();
}

/** Verify PID identity AND listening socket just before sending ONE graceful signal. */
export function terminatePort(row, { uid = process.getuid?.(), procRoot = '/proc', sendSignal = process.kill, scan = scanPorts } = {}) {
  const currentRows = scan({ procRoot, uid, udp: row.protocol === 'UDP' });
  const live = currentRows.find(item =>
    item.pid === row.pid && item.inode === row.inode && item.port === row.port &&
    item.protocol === row.protocol && item.family === row.family && item.host === row.host &&
    item.startTime === row.startTime
  );
  if (!live) throw new SafetyError('Port or process changed since scan; refresh and try again.');
  const reason = safetyCheck(live, { uid, ancestors: getAncestors(process.pid, procRoot), allRows: currentRows });
  if (reason) throw new SafetyError(reason);
  const proc = readProcess(row.pid, procRoot);
  if (!proc || proc.uid !== uid || proc.startTime !== row.startTime || proc.name !== row.name || proc.executable !== row.executable) {
    throw new SafetyError('Process identity changed; no signal sent.');
  }
  if (!ownedSocketsOfPid(row.pid, procRoot).has(row.inode)) {
    throw new SafetyError('Process no longer owns this socket; no signal sent.');
  }
  try { sendSignal(row.pid, 'SIGTERM'); }
  catch (error) { throw new SafetyError(`SIGTERM failed: ${error.message}`); }
  return { pid: row.pid, signal: 'SIGTERM', affectedPorts: relatedPorts(live, currentRows) };
}
