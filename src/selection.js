/** A selection is tied to one exact process/socket snapshot, not just a port.
 * If a PID is reused or a socket changes, stale selections are discarded.
 */
export function entryIdentity(row) {
  const sockets = (row.listeners?.length ? row.listeners : [row])
    .map(s => [s.protocol, s.family, s.host, s.port, s.inode].join('/'))
    .sort().join('|');
  return [row.pid, row.startTime, row.executable, sockets].join('::');
}

export function toggleSelected(selected, entry) {
  const result = new Set(selected);
  const id = entryIdentity(entry);
  if (result.has(id)) result.delete(id);
  else result.add(id);
  return result;
}

export function retainExistingSelections(selected, entries) {
  const available = new Set(entries.map(entryIdentity));
  return new Set([...selected].filter(id => available.has(id)));
}

/** Space selects whole port rows. Enter stops checked rows, or cursor row if
 * none are checked. More than one port on a PID becomes ONE process target.
 */
export function resolveTargets(entries, selected, cursor = 0) {
  const rows = selected.size
    ? entries.filter(row => selected.has(entryIdentity(row)))
    : (entries[cursor] ? [entries[cursor]] : []);
  const byProcess = new Map();
  for (const row of rows) {
    const pidIdentity = `${row.pid}:${row.startTime}`;
    if (!byProcess.has(pidIdentity)) byProcess.set(pidIdentity, row);
  }
  return {
    rows,
    targets: [...byProcess.values()],
    ports: [...new Set(rows.map(row => row.port))].sort((a, b) => a - b),
  };
}
