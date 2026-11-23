# aiti-demos

Static showcase of **AITI Web** (the [aiti-ai](https://github.com/aiti-ai/aiti-ai) pi-web fork):
the real host UI, the real extension host and real extension client bundles, backed by a
recorded mock model instead of a server.

Live (LAN, `*.aiti.pw` certificate): <https://demo.aiti.pw/>

## How it works

- `app/` is a thin Next.js static-export shell.
- `generated/` is synced from a sibling `aiti-ai` checkout by `scripts/sync-frontend.mjs`
  (gitignored; `--check` catches drift).
- `public/api/extensions/<id>/assets/...` is copied **verbatim** from
  `aiti-ai/extensions/<id>/dist` + `icons` + runtime assets. The host loads these with
  native `import()`; `mock/data/extension-manifest.json` is the static manifest/graph.
- `mock/` answers `/api/*` in the browser: hand-written state machines for the demo
  sessions, plus `mock/model/routes.json` replaying recorded responses.

## Commands

```bash
# optional: a sibling aiti-ai checkout, or AITI_SRC=/path/to/aiti-ai
npm ci
npm run dev          # sync + extension tier + file snapshot, then next dev :30146
npm run build        # static export in out/
npm run audit        # fixture/secret audit
npm run tour         # Playwright regression against out/
npm run capture:install:cn   # CN mirror fallback for Playwright's Chromium
npm run deploy       # build + rsync to demo.aiti.pw (scripts/deploy-demo.sh)
```

## Recording (maintainers)

```bash
node capture/seed.mjs --run my-run          # isolated agent/data/project
node capture/run.mjs --run my-run --extensions --app-center-fresh
node capture/compile.mjs --runs my-run      # sanitises into mock/model/
node scripts/audit-fixtures.mjs
```

`capture/raw/**` is gitignored and never published; `mock/model/**` is sanitised.
`demo`, `demo-lazy` and `sm-demo-source` are excluded from recording.

## Limits

The mock replays recorded GET responses. Server-side extension logic, live agent turns,
writes and bridges are not executed; panels that need them show recorded snapshots or
degrade. See the internal plan for the full coverage matrix.
