/** Pure, read-only view model. No effect on the safety policy or the OS. */
export const COMMON_DEV_PORTS = new Set([
  3000,3001,3002,3333,4000,4200,4321,5000,5001,5173,5174,5500,
  6006,7000,8000,8001,8080,8081,8082,8085,8088,8888,9000,9001,
  9090,9229,1234,1337,1420,1421,24678,
]);

const KNOWN_DEV_PROCESS = /(?:^|[^a-z0-9])(?:node(?:js)?|npm|pnpm|yarn|bun|deno|vite|next-server|next|nuxt|astro|webpack|esbuild|parcel|react-scripts|ng|nodemon|tsx|ts-node|python(?:\d+(?:\.\d+)?)?|uvicorn|gunicorn|flask|django|fastapi|rails|ruby|php|artisan|symfony|go|air|cargo|trunk|dotnet|vite-node)(?:$|[^a-z0-9])/i;
const SYSTEM_NAME = /^(?:gjs|codex|gnome(?:-|$)|gvfs(?:-|$)|xdg(?:-|$)|systemd(?:-|$)|dbus(?:-|$)|pipewire(?:-|$)|wireplumber$|kwin(?:_|$)|plasmashell$|NetworkManager$|cupsd$|chrome(?:-|$)|firefox$|code$)/i;

/** Heuristic for VISIBILITY only. Never a permission to send a signal. */
export function isLikelyDev(row) {
  // Don't treat unidentified system listeners as development apps just because
  // they happen to bind to a popular development port (e.g. :8080).
  if (!Number.isSafeInteger(row.pid) || row.pid <= 0) return false;
  const name = String(row.name ?? '');
  if (SYSTEM_NAME.test(name)) return false;
  if (row.port < 1024) return false;
  if (KNOWN_DEV_PROCESS.test(name)) return true;
  if (row.command && /(?:\b(?:vite|next|nuxt|webpack|astro|dev|serve|start:dev|uvicorn|flask|runserver|http-server|localhost)\b)/i.test(row.command) && !SYSTEM_NAME.test(name)) return true;
  return COMMON_DEV_PORTS.has(row.port);
}

/** Deduplicate IPv4/IPv6 listeners owned by same PID on the same port. */
export function collapseRows(rows) {
  const grouped = new Map();
  for (const row of rows) {
    const key = row.pid == null
      ? `${row.protocol}/${row.port}/${row.family}/${row.host}/${row.inode}`
      : `${row.protocol}/${row.port}/${row.pid}`;
    if (!grouped.has(key)) grouped.set(key, { ...row, key, listeners: [] });
    const group = grouped.get(key);
    group.listeners.push(row);
    // IPv4 addresses are friendlier in the detail panel when available.
    if (row.family === 'IPv4' && group.family === 'IPv6') Object.assign(group, { family: row.family, host: row.host, inode: row.inode });
  }
  return [...grouped.values()];
}

const priority = row => {
  if (row.port === 3000) return 0;
  if (COMMON_DEV_PORTS.has(row.port)) return 1;
  if (isLikelyDev(row)) return 2;
  return 3;
};
export function viewRows(rawRows, { mode = 'dev', search = '' } = {}) {
  const q = search.trim().toLowerCase();
  let groups = collapseRows(rawRows);
  if (q) {
    // Searching always searches ALL listeners, including hidden/protected ones.
    groups = groups.filter(r => [r.port, r.name, r.pid, r.command, r.host, r.protocol].some(v => String(v ?? '').toLowerCase().includes(q)));
  } else if (mode === 'dev') {
    groups = groups.filter(isLikelyDev);
  } else if (mode === 'mine') {
    groups = groups.filter(r => r.pid != null);
  }
  return groups.sort((a,b) => priority(a)-priority(b) || a.port-b.port || (a.pid??0)-(b.pid??0) || a.key.localeCompare(b.key));
}

export const cleanTerminal = (value) => String(value ?? '')
  .replace(/[\x00-\x1f\x7f-\x9f\x1b]/g,' ')
  .replace(/\s+/g,' ')
  .trim();
