# PNUX — website deployment and npm release

The repository is live at https://github.com/luan-thnh/pnux.

## GitHub Pages

The website source is in `docs/` and is compatible with **both** GitHub Pages modes.

- **Recommended for first setup:** go to **Settings → Pages → Deploy from a branch**, choose `main` and `/docs`, then click **Save**. GitHub automatically publishes updated `docs/` content on every push.
- **GitHub Actions deployment:** alternatively, choose **Settings → Pages → Source → GitHub Actions**. The workflow `.github/workflows/pages.yml` first runs tests, then deploys `docs/` when this publishing mode is enabled. If switching modes after a successful push, trigger it again under **Actions → Test and deploy GitHub Pages → Run workflow**.

An initial workflow run may skip deploy until Pages has been enabled. This is expected; `GITHUB_TOKEN` cannot enable the Pages site for you. The website URL is https://luan-thnh.github.io/pnux/ **only after GitHub reports a successful Pages deployment**.

No workflow publishes npm packages.

## Publish to npm manually (maintainers only)

The new npm package name is **`pnux`**, and its executable is also **`pnux`**. The GitHub repository intentionally stays at `luan-thnh/pnux` to preserve existing links.

Before publishing, check that the name is still available. **Important:** npm previously rejected the unscoped name `pnux` as too similar to other packages. A 404 for `pnux9` only indicates no public entry; npm can still reject the new name under its similarity protections. The definitive check is a successful `npm publish --access public`.

```bash
npm whoami
npm view pnux9 name version      # E404 is expected before first publication
npm test
npm run pack:check
npm publish --access public
```

If needed, sign in using `npm login` and complete npm's authentication requirements.

Verify after publication:

```bash
npm view pnux9 name version bin
npx pnux9
# Or install globally:
npm install -g pnux9
pnux9  # pnux also works as an alias
```

**Old package:** `portlane-tui` is a separate, already-published package. npm does not rename releases automatically. Only after `pnux9` publishes successfully, you may optionally mark old versions deprecated for a migration notice:

```bash
npm deprecate 'portlane-tui@*' 'Renamed to PNUX (npm: pnux9). Use npx pnux9 instead.'
```

Do not unpublish the old package just to change names. Never commit npm tokens or `.npmrc` credentials. GitHub Actions does **not** publish to npm.
