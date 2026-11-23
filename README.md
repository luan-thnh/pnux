<div align="center">
  <a href="https://luan-thnh.github.io/pnux/"><img src="docs/mark.svg" width="56" alt="PNUX" /></a>
  <h1>PNUX</h1>
  <p><strong>Find the port. Select the process. Get back to building.</strong></p>
  <p>
    <a href="https://luan-thnh.github.io/pnux/">Website</a> ·
    <a href="README.vi.md">Tiếng Việt</a> ·
    <a href="#quick-start">Quick start</a> ·
    <a href="PUBLISHING.md">Publishing guide</a>
  </p>
  <p>
    <a href="https://github.com/luan-thnh/pnux/actions/workflows/pages.yml"><img src="https://github.com/luan-thnh/pnux/actions/workflows/pages.yml/badge.svg" alt="CI and Pages status" /></a>
    <img src="https://img.shields.io/badge/Linux-Ubuntu-24292F?logo=linux&logoColor=white" alt="Linux / Ubuntu" />
    <img src="https://img.shields.io/badge/Node.js-20%2B-24292F?logo=node.js&logoColor=white" alt="Node.js 20+" />
    <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24292F" alt="MIT license" /></a>
  </p>
</div>

![PNUX terminal manager hero](docs/banner.svg)

> **Illustration:** example ports and process IDs shown above are not real processes on your machine.

PNUX is a small, keyboard-first **Linux port manager**. It shows the listening ports you can manage, with the **port number first**, the process name next, and technical details out of the way. Select several rows with Space; stop only after confirming.

## Quick start

```bash
npx pnux9
```

**npm release pending:** `npx pnux9` will work after the maintainer publishes the new `pnux9` package. Until then, run the source version below.

**Run from source today** (Linux/Ubuntu, Node.js 20+, normal user):

```bash
git clone https://github.com/luan-thnh/pnux.git
cd pnux
npm start
```

Or install a local global command with `npm link`, then run `pnux9` (or the `pnux` alias). No external runtime dependencies or daemon. The GitHub repository is now named [`pnux`](https://github.com/luan-thnh/pnux).

## Terminal preview

<p align="center"><img src="docs/terminal.svg" alt="PNUX table with checked ports" width="860" /></p>
<p align="center"><sub>Focused port-first table · <kbd>Space</kbd> to select multiple rows</sub></p>
<p align="center"><img src="docs/confirmation.svg" alt="PNUX confirmation prompt" width="860" /></p>
<p align="center"><sub>Review before sending one graceful SIGTERM per unique process</sub></p>

| Key | Action |
| --- | --- |
| <kbd>↑</kbd> / <kbd>↓</kbd> or <kbd>j</kbd> / <kbd>k</kbd> | Move |
| <kbd>Space</kbd> | Select / unselect a row |
| <kbd>Enter</kbd> | Review selected rows (or current row) |
| <kbd>Y</kbd> / <kbd>N</kbd> | Confirm / cancel |
| <kbd>R</kbd> | Refresh |
| <kbd>Q</kbd> | Quit |

### Read-only CLI

```bash
pnux9 --list          # Manageable listening ports
pnux9 --list --mine   # Current-user sockets and protection status
pnux9 --list --all    # All visible sockets
pnux9 --json          # Machine-readable output
pnux9 --udp --list    # Include UDP
```

## Built to be careful

- **User-owned processes only** in the interactive stop list; root, other-user and protected processes are excluded.
- **Explicit confirmation** before sending any signal.
- **Revalidation** of process identity and socket mapping immediately before a stop.
- **SIGTERM**, never automatic SIGKILL; one signal per unique PID.
- **No sudo, no background service, no firewall edits.**

> **Important:** stopping a port means signaling the *entire process* listening on it. A single process may serve multiple ports or hold unsaved work. The safety checks reduce mistakes, but cannot guarantee every user process is harmless to stop.

## Contribute & deploy

```bash
npm test
npm run pack:check
```

The landing page is static HTML, CSS and JavaScript in [`docs/`](docs/). View locally with `python3 -m http.server 8080 --directory docs`. Its interactive terminal is a **demo only** and never touches your computer's ports.

**GitHub Pages:** in **Settings → Pages**, select **Deploy from a branch → main → /docs → Save**. Alternatively select **Source → GitHub Actions** to let the [workflow](.github/workflows/pages.yml) deploy `docs/`. The workflow runs tests but **never publishes npm**; only the maintainer does that, following [PUBLISHING.md](PUBLISHING.md).

Inspired by [npkill](https://github.com/voidcosmos/npkill)'s focused TUI. PNUX's port management logic is an independent implementation. [MIT License](LICENSE).
