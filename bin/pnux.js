#!/usr/bin/env node
import { scanPorts, getAncestors } from '../src/linux.js';
import { safetyCheck } from '../src/safety.js';
import { startUI } from '../src/ui.js';
import { viewRows } from '../src/presentation.js';
import { manageablePorts } from '../src/managed.js';

const args = new Set(process.argv.slice(2));
function help() {
  console.log(`PNUX v0.6.0 — compact port table for Linux

Usage:
  pnux               Interactive list of ports you can manage
  pnux --list        List manageable ports without the UI
  pnux --json        Inspect raw sockets as JSON (read-only)
  pnux --help        Show help

Keys: ↑↓ move · Space check/uncheck · Enter stop checked · y/n confirm · q quit (r refresh)

Advanced read-only inspection:
  pnux --list --all  All visible sockets (including restricted)
  pnux --list --mine All sockets mapped to your user
  pnux --udp         Include bound UDP listeners

No sudo, no automatic kill, no SIGKILL. One SIGTERM per confirmed process.
`);
}
function main() {
  if (args.has('--help') || args.has('-h')) { help(); return; }
  if (args.has('--version') || args.has('-v')) { console.log('0.6.0'); return; }
  const allowed = new Set(['--list', '--json', '--udp', '--all', '--mine']);
  const bad = [...args].filter(arg => !allowed.has(arg));
  if (bad.length) { console.error(`Unknown option: ${bad.join(', ')}. Use --help.`); process.exitCode = 2; return; }
  if (process.platform !== 'linux') { console.error('Linux/Ubuntu only.'); process.exitCode = 2; return; }
  if (args.has('--all') && args.has('--mine')) { console.error('Choose --all or --mine, not both.'); process.exitCode = 2; return; }
  if ((args.has('--all') || args.has('--mine')) && !args.has('--list') && !args.has('--json')) {
    console.error('--all and --mine are read-only options. Use --list --all or --list --mine.');
    process.exitCode = 2; return;
  }
  if (args.has('--list') || args.has('--json')) {
    const rows = scanPorts({ udp: args.has('--udp') });
    const uid = process.getuid?.();
    const ancestors = getAncestors();
    const reason = row => safetyCheck(row, { uid, ancestors, allRows: rows });
    if (args.has('--json')) {
      console.log(JSON.stringify(rows.map(row => ({ ...row, killable: !reason(row), reason: reason(row) })), null, 2));
      return;
    }
    const visible = args.has('--all') ? viewRows(rows, { mode: 'all' })
      : args.has('--mine') ? viewRows(rows, { mode: 'mine' })
      : manageablePorts(rows, { uid, ancestors });
    console.log('PORT\tAPPLICATION' + ((args.has('--all') || args.has('--mine')) ? '\tSTATUS' : ''));
    for (const row of visible) {
      const status = (args.has('--all') || args.has('--mine')) ? `\t${reason(row) ? 'PROTECTED' : 'READY'}` : '';
      console.log(`:${row.port}\t${row.name}${status}`);
    }
    return;
  }
  startUI({ udp: args.has('--udp') });
}
try { main(); } catch (e) { console.error(`pnux: ${e.message}`); process.exitCode = 1; }
