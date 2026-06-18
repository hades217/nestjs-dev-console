# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/). Newest first.

## [0.2.0] - 2026-06-18

### Changed (packaging)
- Ship a prebuilt `dist/` in the repo (no longer gitignored) so the package
  installs cleanly under package managers that don't run a dependency's
  `prepare` script on git installs (e.g. **bun**, which gates lifecycle scripts).
  The `prepare` script is kept for npm git installs / publish.

### Added
- **Token-in-URL login** for Bearer/localStorage apps that don't share a
  backend cookie: a `LoginProvider` may now return `{ openUrl }` and the page
  opens that URL instead of `apps[app].url + path` — so a freshly-minted token
  can ride along in the deep-link (e.g. `…/dev-login?token=…`).
- The page now POSTs the clicked node's `app` + `path` to `/dev/login`, so a
  token-based provider can build the deep-link itself. `DevLoginBody` /
  `DevLoginResult` types exported.

### Changed
- `package.json`: `prepublishOnly` → `prepare` so the package builds `dist/`
  automatically when installed straight from git (`npm i github:hades217/nestjs-dev-console`),
  since `dist/` is gitignored. `repository.url` points at the standalone repo.

## [0.1.0] - 2026-06-18

### Added
- Initial extraction from the Airbotix platform-backend dev console.
- `DevConsoleModule.forRoot({ config, graphProvider, loginProvider, imports })`
  — default-deny gated; registers no controller when disabled.
- `GraphProvider` / `LoginProvider` adapter interfaces.
- Config-driven single-file page: branding, roles (icon/accent/legend), apps
  (deep-link + health + start command), column headings, footer, seed hint,
  start-all command — injected as JSON, CSP relaxed for the dev route only.
- Hardened enable gate (`devConsoleEnabled` / `resolveEnabled`): NODE_ENV
  allowlist + affirmative dev signal + `DEV_CONSOLE_ENABLED` kill switch.
- `DevConsoleGuard` — request-time 404 when disabled.
