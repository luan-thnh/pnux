# PNIX — website deployment and npm release

The repository is live at https://github.com/luan-thnh/pnux.

## GitHub Pages

The website source is in `docs/` and is compatible with **both** GitHub Pages modes.

- **Recommended for first setup:** go to **Settings → Pages → Deploy from a branch**, choose `main` and `/docs`, then click **Save**. GitHub automatically publishes updated `docs/` content on every push.
- **GitHub Actions deployment:** alternatively, choose **Settings → Pages → Source → GitHub Actions**. The workflow `.github/workflows/pages.yml` first runs tests, then deploys `docs/` when this publishing mode is enabled. If switching modes after a successful push, trigger it again under **Actions → Test and deploy GitHub Pages → Run workflow**.

An initial workflow run may skip deploy until Pages has been enabled. This is expected; `GITHUB_TOKEN` cannot enable the Pages site for you. The website URL is https://luan-thnh.github.io/pnux/ **only after GitHub reports a successful Pages deployment**.

No workflow publishes npm packages.

## Publish to npm manually (maintainers only)

The intended npm package and executable are both **`pnix`**. The GitHub repository stays at `luan-thnh/pnux` unless renamed separately.

**Name availability is not publishability.** `npm-name-cli` returned “available” for `pnux` despite npm's real publish rejecting it with `E403` for name similarity. `pnux9` was likewise rejected. Registry 404, `npm view`, `npm-name --similar`, and `npm publish --dry-run` cannot guarantee that npm will accept `pnix`.

```bash
git pull origin main
npm whoami
npm test
npm run pack:check
npm publish --access public
```

If the registry rejects this name, use a more distinctive unscoped name or your own npm scope.

Verify after **successful** publication:

```bash
npm view pnix name version bin
npx pnix
# Or:
npm install -g pnix
pnix
```

The older `portlane-tui` package remains separate. Do not unpublish it automatically. GitHub Actions never publishes npm. Do not commit authentication credentials.
