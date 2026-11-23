const sample = [
  { port: 3000, process: 'next-server', pid: 147693 },
  { port: 5173, process: 'vite', pid: 148201 },
  { port: 8000, process: 'uvicorn', pid: 148922 },
  { port: 9614, process: 'java', pid: 8603 },
  { port: 4000, process: 'node', pid: 150108 },
];
const panel = document.getElementById('terminal-demo');
const list = document.getElementById('demo-rows');
const count = document.getElementById('demo-count');
const hint = document.getElementById('demo-hint');
const dialog = document.getElementById('demo-confirm');
const details = document.getElementById('confirm-detail');
let entries = [...sample];
let checked = new Set();
let cursor = 0;
let pending = [];

function render() {
  count.textContent = `${entries.length} ports${checked.size ? ` · ${checked.size} checked` : ''}`;
  list.replaceChildren(...entries.map((entry, index) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = `terminal-grid demo-row${cursor === index ? ' is-focused' : ''}${checked.has(entry.port) ? ' is-checked' : ''}`;
    row.setAttribute('aria-label', `Port ${entry.port}, ${entry.process}. ${checked.has(entry.port) ? 'Selected' : 'Not selected'}.`);
    row.setAttribute('aria-pressed', String(checked.has(entry.port)));
    const check = document.createElement('span');
    check.className = `check${checked.has(entry.port) ? ' checked' : ''}`;
    check.textContent = checked.has(entry.port) ? '✓' : '';
    check.setAttribute('aria-hidden', 'true');
    const port = document.createElement('span'); port.className = 'port'; port.textContent = `:${entry.port}`;
    const name = document.createElement('span'); name.className = 'process'; name.textContent = entry.process;
    const pid = document.createElement('span'); pid.className = 'pid'; pid.textContent = entry.pid;
    row.append(check, port, name, pid);
    row.addEventListener('click', () => { cursor = index; toggle(); panel.focus(); });
    return row;
  }));
}
function toggle() {
  if (!entries[cursor]) return;
  const port = entries[cursor].port;
  if (checked.has(port)) checked.delete(port); else checked.add(port);
  hint.textContent = `${checked.size} selected · Press Enter to review`; render();
}
function openConfirm() {
  pending = entries.filter(entry => checked.size ? checked.has(entry.port) : entry === entries[cursor]);
  if (!pending.length) return;
  details.textContent = `Stop ${pending.length} example port${pending.length === 1 ? '' : 's'}: ${pending.map(entry => `:${entry.port}`).join(', ')}? [y/N]`;
  dialog.hidden = false;
  document.getElementById('demo-cancel').focus();
}
function closeConfirm(confirmed) {
  if (confirmed) {
    const stopped = new Set(pending.map(entry => entry.port));
    entries = entries.filter(entry => !stopped.has(entry.port));
    checked.clear();
    cursor = Math.min(cursor, Math.max(0, entries.length - 1));
    hint.textContent = `Demo: stopped ${stopped.size} example port${stopped.size === 1 ? '' : 's'}.`;
  } else hint.textContent = 'Cancelled. Nothing was stopped.';
  pending = [];
  dialog.hidden = true;
  render(); panel.focus();
}
function reset() {
  entries = [...sample]; checked.clear(); cursor = 0; pending = []; dialog.hidden = true;
  hint.textContent = 'Use ↑↓ to move, Space to select'; render(); panel.focus();
}
panel.addEventListener('keydown', event => {
  if (!dialog.hidden) {
    if (['y', 'Y'].includes(event.key)) { event.preventDefault(); closeConfirm(true); }
    if (['n', 'N', 'Escape'].includes(event.key)) { event.preventDefault(); closeConfirm(false); }
    return;
  }
  if (event.key === 'ArrowDown') { event.preventDefault(); cursor = Math.min(cursor + 1, entries.length - 1); render(); }
  else if (event.key === 'ArrowUp') { event.preventDefault(); cursor = Math.max(cursor - 1, 0); render(); }
  else if (event.key === ' ') { event.preventDefault(); toggle(); }
  else if (event.key === 'Enter') { event.preventDefault(); openConfirm(); }
  else if (event.key.toLowerCase() === 'q') { event.preventDefault(); reset(); }
});
document.getElementById('demo-reset').addEventListener('click', reset);
document.getElementById('demo-cancel').addEventListener('click', () => closeConfirm(false));
document.getElementById('demo-yes').addEventListener('click', () => closeConfirm(true));
render();

async function copy(text, button) {
  const label = button.querySelector('span');
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed'; textarea.style.opacity = '0';
      document.body.append(textarea); textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      if (!copied) throw new Error('Copy unavailable');
    }
    label.textContent = 'Copied';
  } catch {
    label.textContent = 'Select text';
  }
  setTimeout(() => { label.textContent = 'Copy'; }, 1800);
}
document.getElementById('copy-npx').addEventListener('click', event => copy('npx pnux9', event.currentTarget));
document.getElementById('copy-command').addEventListener('click', event => copy('npm link', event.currentTarget));
document.getElementById('copy-run').addEventListener('click', event => copy('pnux9', event.currentTarget));


// The theme choice is local to the browser; the CLI never reads it.
const themeToggle = document.getElementById('theme-toggle');
const colorMeta = document.querySelector('meta[name="theme-color"]');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
function applyTheme(theme) {
  const dark = theme === 'dark';
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-pressed', String(dark));
  themeToggle.setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} mode`);
  themeToggle.title = `Switch to ${dark ? 'light' : 'dark'} mode`;
  colorMeta.content = dark ? '#0c0d0f' : '#f5f5ee';
}
function getSavedTheme() {
  try { return localStorage.getItem('pnux-theme'); } catch { return null; }
}
applyTheme(document.documentElement.dataset.theme || (systemTheme.matches ? 'dark' : 'light'));
themeToggle.addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  try { localStorage.setItem('pnux-theme', next); } catch { /* private mode */ }
});
systemTheme.addEventListener?.('change', event => {
  if (!['light', 'dark'].includes(getSavedTheme())) applyTheme(event.matches ? 'dark' : 'light');
});

// Progressive enhancement: content is visible if JavaScript or IO is disabled.
if ('IntersectionObserver' in window && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const target = document.querySelector('.terminal-shell');
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      target.classList.add('is-revealed');
      observer.disconnect();
    }
  }, { threshold: 0.16 });
  target.classList.add('will-reveal');
  observer.observe(target);
}
