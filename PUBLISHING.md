# Portlane — website deployment and npm release

The repository is live at https://github.com/luan-thnh/portlane.

## GitHub Pages

The website source is in `docs/` and is compatible with **both** GitHub Pages modes.

- **Recommended for first setup:** go to **Settings → Pages → Deploy from a branch**, choose `main` and `/docs`, then click **Save**. GitHub automatically publishes updated `docs/` content on every push.
- **GitHub Actions deployment:** alternatively, choose **Settings → Pages → Source → GitHub Actions**. The workflow `.github/workflows/pages.yml` first runs tests, then deploys `docs/` when this publishing mode is enabled. If switching modes after a successful push, trigger it again under **Actions → Test and deploy GitHub Pages → Run workflow**.

An initial workflow run may skip deploy until Pages has been enabled. This is expected; `GITHUB_TOKEN` cannot enable the Pages site for you. The website URL is https://luan-thnh.github.io/portlane/ **only after GitHub reports a successful Pages deployment**.

No workflow publishes npm packages.

## Publish to npm manually (maintainers only)

**Important naming note:** The unscoped npm package `portlane` already belongs to a separate project. Do **not** publish as `portlane` or advertise `npx portlane`; it would run unrelated software. Our package name is **`portlane-tui`**, while the executable installed by npm is still `portlane`.

Before publishing, confirm that you own the intended npm name and it is available for your account. If `portlane-tui` is already owned by somebody else, choose an unclaimed name or your own scope (for example `@YOUR_NPM_USERNAME/portlane`) and update the hero/README accordingly. An npm account name may differ from a GitHub username.

```bash
# From the repository root, with Node.js 20+ on Linux
npm login
npm whoami
npm view portlane-tui name version   # May return E404 when available
npm test
npm run pack:check
npm publish --access public
```

The npm Registry may require two-factor authentication or another approved authentication method. `npm publish` is a built-in npm command; it is not an `npm run publish` script. Never commit npm tokens or `.npmrc` credentials.

After a successful publish, verify:

```bash
npm view portlane-tui name version bin
npx portlane-tui
# Or: npm install -g portlane-tui && portlane
```

`npx portlane-tui` is an installation-from-registry command, **not an offline command**. The landing page advertises it for after publication, and includes local `npm link` instructions until then. The GitHub Pages workflow deliberately never runs `npm publish`.
