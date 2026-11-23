<div align="center">
  <img src="site/mark.svg" width="70" alt="Portlane logo">
  <h1>Portlane</h1>
  <p><strong>Ports, under control.</strong></p>
  <p>Find running development ports. Pick one or several. Confirm before stopping.</p>
  <p>
    <a href="README.vi.md">Tiếng Việt</a> ·
    <a href="site/index.html">Landing page source</a> ·
    <a href="#quick-start">Get started</a>
  </p>
  <p><img alt="Node.js 20+" src="https://img.shields.io/badge/Node.js-%E2%89%A520-397B56?logo=node.js&logoColor=white"> <img alt="Linux" src="https://img.shields.io/badge/OS-Linux%20%2F%20Ubuntu-173D2B"> <img alt="MIT license" src="https://img.shields.io/badge/License-MIT-blue"></p>
</div>

![Example Portlane TUI with two ports checked](docs/terminal.png)

> **Example output.** Port and process names in the screenshot are illustrative. Portlane lists processes from your actual machine when you run it.

## Why Portlane?

You have a dev server already running on `:3000`, another at `:5173`, and don't want to search through long `ps`, `ss`, or `lsof` output to find the correct process. Portlane gives you a focused, keyboard-driven table.

- **Port-first view.** Shows `PORT`, `PROCESS`, and a subdued `PID` column. On narrow terminals, PID is hidden to keep ports readable.
- **Multi-select.** Check ports with `Space`, then confirm one stop action with `Enter` → `y` / `n`.
- **User-owned only.** The interactive list excludes processes it cannot safely offer to stop; unresolvable and protected system sockets don't clutter the view.
- **Graceful by default.** A confirmed action sends `SIGTERM`, not `SIGKILL`.
- **Zero runtime dependencies.** Linux `/proc`, built-in Node.js modules, no daemon or root privileges.

## Quick start

When the maintainer publishes **`portlane-tui`** to npm, start with:

```bash
npx portlane-tui
```

> **Not published yet.** This command is for after publication. The npm package `portlane` currently belongs to an unrelated project, so `npx portlane` must **not** be used for this CLI.

**Requirements:** Linux / Ubuntu, Node.js 20 or newer, normal non-root user.

For now, this project has **not been published to npm Registry**. When the GitHub repository is available, clone it and install locally:

```bash
git clone https://github.com/luan-thnh/portlane.git
cd portlane
npm link
portlane
```

Run without installing a global npm link:

```bash
npm start
```

### Keyboard shortcuts

| Key | Action |
| :-- | :-- |
| `↑` / `↓` or `j` / `k` | Move through ports |
| `Space` | Check/uncheck a port |
| `Enter` | Review selected ports (or current row when none are checked) |
| `y` | Confirm graceful stop |
| `n` / `Esc` | Cancel the confirmation |
| `r` | Refresh immediately |
| `q` / `Esc` | Quit (outside the confirmation) |

![Portlane confirmation screen](docs/confirmation.png)

> Selecting multiple port rows that belong to **one PID** results in **one** signal to that process.

## Read-only commands

```bash
portlane --list            # Manageable ports as plain text
portlane --list --mine     # Visible current-user sockets, with protection status
portlane --list --all      # All visible sockets, including protected/unknown
portlane --json            # Raw sockets for scripts (no stop operation)
portlane --udp --list      # Include bound UDP sockets
portlane --help
```

The default scan focuses on TCP listening sockets. The CLI does **not** open ports or modify firewall rules.

## Safety model

Portlane aims to avoid accidental disruption, not to provide a guarantee that killing an arbitrary user process is harmless.

1. **Read first:** scanning uses `/proc`, and interactive rows must map to eligible, user-owned processes.
2. **Respect protection:** root, other-user, privileged, unmapped, selected desktop/system and ancestor processes are excluded from stopping.
3. **Review before signal:** `Enter` shows the number of port rows and distinct processes; only an explicit `y` proceeds.
4. **Revalidate:** immediately before signaling, it checks UID, PID start time, executable and socket identity again to reduce stale-target and PID-reuse risks.
5. **Graceful stop only:** it sends one `SIGTERM` per process and does not automatically escalate to `SIGKILL`.

**Important:** The kernel stops a **process**, not a TCP port. A process may own several listeners or other resources. `SIGTERM` may terminate all its services and unsaved work. Portlane only sees sockets accessible in its network namespace. Avoid running with `sudo`.

## Development

If you maintain this package and want to publish it yourself, see **[PUBLISHING.md — Publish to npm manually](PUBLISHING.md#publish-to-npm-manually-maintainers-only)**. The command is `npm publish --access public` after checking the package name, logging in, and running the tests. GitHub Actions does not publish npm packages.

```bash
npm test
npm run pack:check
npm start
```

No build step is needed; the CLI and [landing page](site/index.html) are plain JavaScript. Integration tests may skip the real-process stop check under root; run tests as a normal Linux user for that coverage.

### Landing page

Open `site/index.html` in a browser or serve it locally:

```bash
python3 -m http.server 8080 --directory site
# Visit http://localhost:8080
```

The web terminal is an **interactive illustration**; it does not inspect or terminate any processes on the visitor's computer.

A GitHub Pages workflow is included in [`.github/workflows/pages.yml`](.github/workflows/pages.yml). To publish your own fork/repo:

1. Create a **public** repository named `portlane` under your GitHub account. If you want ChatGPT to push through its GitHub connector, initialize it with a README so that `main` exists.
2. Push all project files to the `main` branch.
3. In **Settings → Pages**, select **Source → GitHub Actions**.
4. The **Test and deploy GitHub Pages** workflow will run on a `main` push, or run it manually via **Actions → Run workflow** after enabling Pages. It tests the CLI, checks npm pack contents (without publishing), and uploads only `site/`.

The intended Pages URL is `https://luan-thnh.github.io/portlane/` after a successful deployment. This URL is **not live until the workflow succeeds**.

GitHub Pages will publish only the `site/` directory. This repository/package is not automatically published to npm.

## Acknowledgements

Inspired by the straightforward terminal interaction of [npkill](https://github.com/voidcosmos/npkill), with an independent implementation for managing Linux listening ports.

MIT © Contributors. See [LICENSE](LICENSE).


## Landing page appearance

The static landing page in [`site/`](site/) supports **light and dark themes**. Use the sun/moon control in the header to switch. The choice is saved in browser storage; otherwise the site follows the operating system theme. Subtle reveal and interaction animations honor `prefers-reduced-motion`. The interactive terminal is an illustration and never reads or stops local processes.
