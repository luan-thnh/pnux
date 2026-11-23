import readline from 'node:readline';
import { scanPorts, getAncestors } from './linux.js';
import { terminatePort } from './safety.js';
import { manageablePorts } from './managed.js';
import { cleanTerminal } from './presentation.js';
import { entryIdentity, retainExistingSelections, resolveTargets, toggleSelected } from './selection.js';

const C = {
  reset: '\x1b[0m', bold: '\x1b[1m', accent: '\x1b[38;5;121m',
  bright: '\x1b[38;5;255m', muted: '\x1b[38;5;245m',
  subtle: '\x1b[38;5;239m', warning: '\x1b[38;5;221m',
  focused: '\x1b[48;5;237m', checked: '\x1b[48;5;23m', normalWeight: '\x1b[22m', normalFg: '\x1b[39m',
};

function shorten(input, max) {
  const text = cleanTerminal(input);
  if (max < 2) return '';
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}

/** A single compact table. PORT first; process second; PID only when space allows. */
export function renderTableScreen({ entries, cursor = 0, selected = new Set(), pending = null, message = '', columns = 80, rows = 24, root = false }) {
  const width = Math.max(36, Math.min(102, columns - 2));
  const withPid = width >= 65;
  const nameWidth = Math.max(8, width - 19 - (withPid ? 9 : 0));
  const height = Math.max(9, rows);
  const itemCount = Math.max(1, height - (pending ? 12 : 8));
  const offset = Math.max(0, Math.min(cursor - itemCount + 1, entries.length - itemCount));
  const visible = entries.slice(offset, offset + itemCount);
  const suffix = `${entries.length} ports${selected.size ? ` · ${selected.size} checked` : ''}`;
  let out = '\x1b[H\x1b[2J\x1b[?25l';
  out += `  ${C.bold}${C.accent}PNUX${C.reset}${' '.repeat(Math.max(2, width - suffix.length - 10))}${C.muted}${suffix}${C.reset}\n`;
  out += `  ${C.subtle}${'─'.repeat(width)}${C.reset}\n\n`;
  out += `         ${C.muted}${'PORT'.padEnd(8)}  ${'PROCESS'.padEnd(nameWidth)}${withPid ? '  ' + 'PID'.padStart(7) : ''}${C.reset}\n`;
  for (let i = 0; i < visible.length; i++) {
    const entry = visible[i];
    const focused = offset + i === cursor;
    const checked = selected.has(entryIdentity(entry));
    const arrow = focused ? `${C.accent}›${C.normalFg}` : ' ';
    const checkbox = checked ? `${C.accent}[x]${C.normalFg}` : `${C.muted}[ ]${C.normalFg}`;
    const port = `:${entry.port}`.padEnd(8);
    const name = shorten(entry.name, nameWidth).padEnd(nameWidth);
    const pid = withPid ? `  ${C.muted}${String(entry.pid ?? '–').slice(0, 7).padStart(7)}` : '';
    const bg = checked ? C.checked : focused ? C.focused : '';
    // Reset only at the row's end so highlight covers the full line, not disconnected spans.
    out += `${bg}  ${arrow} ${checkbox}  ${C.accent}${focused ? C.bold : ''}${port}${C.normalWeight}  ${C.bright}${name}${pid}${C.reset}\n`;
  }
  if (!entries.length) {
    out += `  ${C.muted}${root ? 'Run as a regular user (never sudo).' : 'No manageable ports found. Try starting your dev server.'}${C.reset}\n`;
  }
  out += `\n  ${C.subtle}${'─'.repeat(width)}${C.reset}\n`;
  if (pending) {
    const count = pending.targets.length;
    const portCount = pending.rows.length;
    const summary = `Stop ${portCount} port${portCount === 1 ? '' : 's'} (${count} process${count === 1 ? '' : 'es'})? [y/N]`;
    out += `  ${C.warning}${C.bold}${shorten(summary, width)}${C.reset}\n`;
    out += `  ${C.muted}${shorten(`${pending.ports.map(port => `:${port}`).join(', ')} · Stops entire processes`, width)}${C.reset}\n`;
    out += `  ${C.muted}y Confirm     n Cancel${C.reset}\n`;
  } else {
    const help = width < 42 ? '↑↓  Space Check  Enter Stop  q' : width < 58 ? '↑↓ Move  Space Check  Enter Stop  q Quit' : '↑↓ Move   Space Check   Enter Stop   q Quit';
    out += `  ${C.muted}${help}${C.reset}\n`;
    if (entries.length > itemCount) out += `  ${C.muted}${Math.min(cursor + 1, entries.length)} of ${entries.length} · more below${C.reset}\n`;
  }
  if (message) out += `  ${C.warning}${shorten(message, width)}${C.reset}\n`;
  return out;
}

export function startUI({ udp = false } = {}) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error('Interactive mode needs a terminal. Use --list for plain output.');
    process.exitCode = 2;
    return;
  }
  if (process.platform !== 'linux') throw new Error('Only Linux is supported.');

  let entries = [];
  let cursor = 0;
  let selected = new Set();
  let selectionExpired = false;
  let pending = null;
  let message = '';
  let closed = false;
  let interval;
  const uid = process.getuid();

  function refresh() {
    const old = entries[cursor] && entryIdentity(entries[cursor]);
    try {
      const scanned = scanPorts({ udp });
      entries = manageablePorts(scanned, { uid, ancestors: getAncestors() });
      const kept = retainExistingSelections(selected, entries);
      if (kept.size < selected.size) {
        message = 'Changed/disappeared ports were unchecked.';
        // Never silently fall back to the cursor when an entire multi-select expires.
        if (kept.size === 0) selectionExpired = true;
      }
      selected = kept;
      const next = old ? entries.findIndex(item => entryIdentity(item) === old) : -1;
      cursor = next >= 0 ? next : Math.min(cursor, Math.max(entries.length - 1, 0));
    } catch (e) {
      message = `Scan failed: ${e.message}`;
    }
  }

  function render() {
    if (closed) return;
    process.stdout.write(renderTableScreen({
      entries, cursor, selected, pending, message,
      columns: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      root: uid === 0,
    }));
  }

  function restoreExit() {
    process.stdout.write('\x1b[?25h\x1b[0m\x1b[?1049l');
  }
  function close() {
    if (closed) return;
    closed = true;
    clearInterval(interval);
    process.stdin.removeListener('keypress', onKey);
    process.stdout.removeListener('resize', render);
    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.removeListener('SIGINT', close);
    process.removeListener('SIGTERM', close);
    process.removeListener('exit', restoreExit);
    restoreExit();
  }

  function confirmStop() {
    // Each target is revalidated in terminatePort just before SIGTERM.
    // One PID is signaled at most once even if several checked ports share it.
    let stopped = 0;
    const failures = [];
    for (const target of pending.targets) {
      try { terminatePort(target); stopped++; }
      catch (e) { failures.push(`:${target.port} ${e.message}`); }
    }
    selected.clear();
    selectionExpired = false;
    pending = null;
    refresh();
    message = failures.length
      ? `${stopped} stopped, ${failures.length} skipped. ${failures[0]}`
      : `Sent SIGTERM to ${stopped} process${stopped === 1 ? '' : 'es'}.`;
  }

  function onKey(_str, key = {}) {
    if (key.ctrl && key.name === 'c') { close(); return; }
    const ch = (key.sequence || '').toLowerCase();
    if (pending) {
      if (ch === 'y') confirmStop();
      else if (ch === 'n' || key.name === 'escape') { pending = null; message = 'Cancelled.'; }
      // Other keys do nothing until y / n / Escape.
      render();
      return;
    }
    if (ch === 'q' || key.name === 'escape') { close(); return; }
    if (key.name === 'up' || ch === 'k') cursor = Math.max(0, cursor - 1);
    else if (key.name === 'down' || ch === 'j') cursor = Math.min(entries.length - 1, cursor + 1);
    else if (ch === 'r') { message = ''; refresh(); }
    else if (key.name === 'space' || ch === ' ') {
      if (entries[cursor]) { selected = toggleSelected(selected, entries[cursor]); selectionExpired = false; message = ''; }
    } else if (key.name === 'return' || ch === '\r') {
      if (selectionExpired) { message = 'Selection changed; press Space to select ports again.'; }
      else {
        const targets = resolveTargets(entries, selected, cursor);
        if (targets.targets.length) { pending = targets; message = ''; }
      }
    }
    render();
  }

  process.stdout.write('\x1b[?1049h');
  refresh();
  readline.emitKeypressEvents(process.stdin);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.on('keypress', onKey);
  process.stdout.on('resize', render);
  process.on('SIGINT', close);
  process.on('SIGTERM', close);
  process.on('exit', restoreExit);
  interval = setInterval(() => {
    if (!pending) { refresh(); render(); }
  }, 4000);
  render();
}
