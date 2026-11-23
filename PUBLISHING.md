# Publish Portlane to GitHub

**Target:** `luan-thnh/portlane` (public, `main`).

The connected GitHub app can commit to existing repositories, but cannot create one or change repository Pages settings.

## Preferred: finish with the connected GitHub app

1. At https://github.com/new create repository `portlane` under `luan-thnh`; select **Public** and **Add a README** to initialize the `main` branch.
2. Share the URL `https://github.com/luan-thnh/portlane` back in the conversation. The existing GitHub connector can upload the source files and workflow to that existing repository.
3. In GitHub, open **Settings > Pages > Build and deployment > Source > GitHub Actions**.
4. Once source is pushed, check **Actions > Test and deploy GitHub Pages**. If Pages wasn't enabled on the first run, click **Run workflow**.
5. The public site URL should be `https://luan-thnh.github.io/portlane/` only after the deploy job succeeds.

## Alternative: push from local machine

Create the repository **without** initializing it with README, .gitignore or license. Then, from the source root:

```bash
git init -b main
git add .
git commit -m "feat: release Portlane CLI and landing page"
git remote add origin https://github.com/luan-thnh/portlane.git
git push -u origin main
```

Use your existing GitHub credential helper; don't put access tokens in the source. After the push, configure GitHub Pages source as above.

The workflow tests the CLI and builds/uploads only the static `site/` folder. It does **not** publish any npm package.


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
