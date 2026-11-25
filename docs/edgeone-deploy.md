# EdgeOne Makers deployment (demo.aiti.pw)

How the demo is published today, and the exact steps to move `demo.aiti.pw` from
GitHub Pages to EdgeOne Makers once ICP filing for `aiti.pw` clears.

## Current setup

| Item | Value |
|---|---|
| Public entry | `https://demo.aiti.pw` → GitHub Pages (custom domain, `public/CNAME`) |
| Makers project | `aiti-demos-cn` · area `global` · provider `Upload` (direct upload) |
| Makers project id | `makers-3eufsxrmkaux` |
| Console | `console.cloud.tencent.com/edgeone/pages/project/makers-3eufsxrmkaux` |
| Workflow | `.github/workflows/demo.yml` — `build` → `deploy` (Pages) + `edgeone` (Makers) |
| Secret | `EDGEONE_API_TOKEN` (account-level Makers API token, max 1 year) |

Both targets publish from the same build. The `edgeone` job is skipped when the
secret is missing or the run is a pull request, so the Pages path never depends
on it.

### Why the EdgeOne copy drops one extension

The free plan rejects **any single file over 25 MB**. `aiti-word-superdoc` ships
three minified chunks at 24.6–25.4 MB, which fails the whole upload. The `build`
job therefore:

1. builds the full site and uploads it as the Pages artifact;
2. runs `node scripts/prune-oversize-extensions.mjs --limit-mb 25`, which removes
   every extension whose largest file exceeds the cap from both
   `public/api/extensions/` and `mock/data/extension-manifest.json`;
3. rebuilds with `npx next build` (no `prebuild`, so the pruned manifest is not
   regenerated) and uploads that tree as the `edgeone-site` artifact.

Pages keeps all 68 extensions; EdgeOne serves 67.

### MIME types: EdgeOne serves `.mjs` as octet-stream

A direct-upload project does not rewrite response headers by itself, and by
default every `.mjs` under `/api/extensions/**` is served as
`application/octet-stream`. Browsers refuse to execute that as an ES module
(`Strict MIME type checking is enforced for module scripts`), so **every
extension client fails to load** — the sidebar never gets its session-manager
takeover, and the console shows `[ext] client bundle import failed — falling
back to per-extension bundles` for each bundle.

Fix: `edgeone.json` in the **uploaded tree** (not just the repo) declares the
content type:

```json
{ "headers": [ { "source": "/*.mjs", "headers": [ { "key": "Content-Type",
  "value": "text/javascript; charset=utf-8" } ] } ] }
```

`*` matches across `/`, so one rule covers nested `assets/dist/*.mjs`. The
workflow copies `edgeone.json` into `out/` before uploading for exactly this
reason. Verified against a throwaway project: without the file the header stays
`application/octet-stream`, with it the response is `text/javascript`.

### The project must be "direct upload"

CLI deploys are only accepted by projects whose provider is `Upload`. A
Git-integrated project is rejected with:

```
Project … exists but has Provider 'Github'. This project type does not support
direct folder or zip file deployment.
```

That is why the CI target is `aiti-demos-cn` and not the console-created
`aiti-demos` project.

## Default domain is not a public entry

On mainland networks, `<project>.edgeone.cool` only answers with a **preview
link** (`?eo_token=…`, valid 3 hours); plain requests return `401`. Do not share
it as the site URL. A custom domain is required for public access.

## Switching `demo.aiti.pw` to EdgeOne

Do this only after the ICP filing for `aiti.pw` is approved.

1. **Bind the domain** — console → `aiti-demos-cn` → 域名管理 → add
   `demo.aiti.pw`. Confirm the acceleration area includes mainland China (the
   project is `global`). Copy the CNAME target EdgeOne shows.
2. **Repoint DNS** — change `demo.aiti.pw` from `aiti-ai.github.io` to the EdgeOne
   CNAME target. Keep TTL low until the certificate is issued.
3. **Remove the Pages custom domain** — repository Settings → Pages → clear the
   custom domain. A CNAME can only point at one place; leaving it set makes
   GitHub keep trying to verify a domain it no longer serves.
4. **Delete `public/CNAME`** — otherwise every build copies it into `out/` again.

Certificate: EdgeOne issues and renews its own DV certificate for the bound
domain. It is independent from the one GitHub issues; nothing needs to be
imported or shared.

### After the switch: reduce the workflow to one target

Once EdgeOne serves the domain, Pages is redundant. Delete from
`.github/workflows/demo.yml`:

- the `deploy` job and its `actions/deploy-pages` step;
- `actions/configure-pages` and `actions/upload-pages-artifact` in `build`;
- the "full build for Pages, pruned rebuild for EdgeOne" split — one pruned build
  is enough, so `prune-oversize-extensions.mjs` can run before the single
  `npm run build`.

Then keep `aiti-ai.github.io/aiti-demos` as a read-only fallback (Pages still
serves the repository path without a custom domain).

## Rollback

If EdgeOne misbehaves, point DNS back to `aiti-ai.github.io` and re-add the
custom domain in Settings → Pages. Both the old artifact and this document's
step list stay valid.

## Error codes seen so far

| Symptom | Cause |
|---|---|
| `Provider 'Github' … Only projects with Provider 'Upload'` | project name collides with a Git-integrated project |
| `localPath does not exist` | `download-artifact` does not keep the uploaded top-level folder; deploy `site/` (with `site/out` fallback) |
| `401` on `<project>.edgeone.cool` | default domain requires a preview link (`eo_token`), 3 h TTL |
| `Failed to load module script … application/octet-stream` | `.mjs` served without a JS content type; ship `edgeone.json` inside the uploaded tree |
| Upload rejects one file | single file > 25 MB, see the prune step above |
