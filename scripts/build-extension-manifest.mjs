#!/usr/bin/env node
/**
 * Build the static extension tier for the demo.
 *
 *   node scripts/build-extension-manifest.mjs [--root ../aiti-ai]
 *
 * For every selected extension:
 *   - import its index.ts (pure metadata modules only) and take the default export
 *   - copy its dist/ + icons/ + icon.svg under
 *       public/api/extensions/<id>/assets/...
 *     so the host's real URLs (/api/extensions/<id>/assets/...) resolve as
 *     static files; native import() and <img src> both work without a server.
 *   - emit mock/data/extension-manifest.json with the manifest + boot graph.
 *
 * The set is intentionally curated: extensions whose client bundle is
 * self-contained (no owner API or only light endpoints). Server-heavy
 * extensions stay in the catalog without a client (clientUrl: null).
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createJiti } from "jiti";
import { pruneStaleGenerations } from "./lib/prune-stale-generations.mjs";

// The host loads extension entries through jiti (TypeScript + require()); reuse
// the same loader so metadata imports behave identically to production.
const jiti = createJiti(import.meta.url, { interopDefault: true });

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const fullMode = args.includes("--full");
// Where client bundles come from: `checkout` (a working aiti-ai tree, dists already
// built locally) or `npm` (published tarballs, for CI where extension dists are
// build artifacts and absent from a fresh clone).
const DIST_SOURCE = (process.env.AITI_DIST_SOURCE ?? "checkout").toLowerCase();
const captureRun = args.find((a) => a.startsWith("--from-capture="))?.slice("--from-capture=".length)
  ?? (args.includes("--from-capture") ? args[args.indexOf("--from-capture") + 1] : undefined);
const rootArg = args.find((a) => a.startsWith("--root="))?.slice("--root=".length)
  ?? (args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined);
const sourceRoot = resolve(rootArg ?? process.env.AITI_SRC ?? join(demoDir, "..", "aiti-ai"));




/**
 * Some extensions ship their client as a plain source file (no bundler): the
 * `build:client` script is a copy from `client/src/` to `dist/`. A fresh CI
 * checkout has no `dist/`, so mirror that copy when the entry is a single file.
 */
function copyPlainClient(extId, sourceDir, assetDir, clientRel) {
  const bare = String(clientRel).replace(/^dist\//, "");
  // Extensions without a declared client have an empty relative path; do not
  // mistake `client/src/` itself for the entry file.
  if (!bare) return false;
  const candidates = [join(sourceDir, "client", "src", bare), join(sourceDir, bare)];
  const from = candidates.find((p) => existsSync(p) && statSync(p).isFile());
  if (!from) return false;
  mkdirSync(join(assetDir, "dist"), { recursive: true });
  cpSync(from, join(assetDir, "dist", bare));
  // Runtime helper files some extensions serve from the extension root (the
  // devtools launcher) live in `assets/`; carry them along when present.
  if (existsSync(join(sourceDir, "assets"))) {
    cpSync(join(sourceDir, "assets"), assetDir, { recursive: true });
    cpSync(join(sourceDir, "assets"), join(assetDir, ".."), { recursive: true });
  }
  return true;
}

/**
 * Install one extension's client bundles from its published npm tarball.
 * Extension packages ship `dist/` (verified: @aiti-ai/aiti-folder@latest), so CI
 * can build the demo tier without compiling 60+ clients.
 *
 * Only called for extensions that declare a client: server-only extensions have
 * no `dist/` in their tarball, so two `npm pack` round trips (declared version +
 * @latest) always come back empty. The caller skips them up front.
 */
async function installFromNpm(extId, sourceDir, assetDir) {
  const pkgPath = join(sourceDir, "package.json");
  if (!existsSync(pkgPath)) return false;
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  if (!pkg.name) return false;
  const packDir = join(demoDir, "public", "api", ".npm-packs");
  mkdirSync(packDir, { recursive: true });
  const specs = [`${pkg.name}@${pkg.version ?? "latest"}`, `${pkg.name}@latest`];
  for (const spec of specs) {
    try {
      const out = execFileSync("npm", ["pack", spec, "--registry", "https://registry.npmjs.org", "--pack-destination", packDir], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim().split("\n").pop();
      const tarball = join(packDir, out);
      if (!existsSync(tarball)) continue;
      const extractDir = join(packDir, `${extId}-x`);
      rmSync(extractDir, { recursive: true, force: true });
      mkdirSync(extractDir, { recursive: true });
      execFileSync("tar", ["xzf", tarball, "-C", extractDir]);
      const pkgRoot = join(extractDir, "package");
      let copied = false;
      for (const part of ["dist", "icons", "icon.svg", "assets"]) {
        const from = join(pkgRoot, part);
        if (!existsSync(from)) continue;
        cpSync(from, join(assetDir, part), { recursive: true });
        copied = true;
      }
      rmSync(tarball, { force: true });
      rmSync(extractDir, { recursive: true, force: true });
      if (copied) return true;
    } catch { /* try the next spec */ }
  }
  return false;
}

/**
 * Copy Monaco's AMD bundle (min/vs) out of the published monaco-editor tarball.
 *
 * aiti-editor ships no monaco/ in git (gitignore) nor in its npm tarball; the
 * assets are materialized from the monaco-editor devDependency at pack time. A
 * demo build from a fresh checkout therefore has to fetch them itself.
 */
function materializeMonacoFromNpm(sourceDir, assetDir, rootDir) {
  const pkg = JSON.parse(readFileSync(join(sourceDir, "package.json"), "utf8"));
  const range = pkg.devDependencies?.["monaco-editor"] ?? pkg.dependencies?.["monaco-editor"] ?? "latest";
  const packDir = join(demoDir, "public", "api", ".npm-packs");
  mkdirSync(packDir, { recursive: true });
  try {
    const out = execFileSync(
      "npm",
      ["pack", `monaco-editor@${range}`, "--registry", "https://registry.npmjs.org", "--pack-destination", packDir],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim().split("\n").pop();
    const tarball = join(packDir, out);
    if (!existsSync(tarball)) throw new Error("pack produced no tarball");
    const extractDir = join(packDir, "monaco-x");
    rmSync(extractDir, { recursive: true, force: true });
    mkdirSync(extractDir, { recursive: true });
    execFileSync("tar", ["xzf", tarball, "-C", extractDir]);
    const vs = join(extractDir, "package", "min", "vs");
    if (!existsSync(join(vs, "loader.js"))) throw new Error("tarball has no min/vs/loader.js");
    cpSync(vs, join(assetDir, "monaco", "vs"), { recursive: true });
    cpSync(vs, join(rootDir, "monaco", "vs"), { recursive: true });
    console.log(`[ext] aiti-editor: monaco assets materialized from monaco-editor@${range}`);
    rmSync(tarball, { force: true });
    rmSync(extractDir, { recursive: true, force: true });
  } catch (e) {
    // The demo still works without the editor; say so instead of failing the build.
    console.warn(`[ext] aiti-editor: monaco assets unavailable (${String(e.message).split("\n")[0]})`);
  }
}

/**
 * Chunked extensions ship a thin client entry plus sibling chunks. A stale
 * source `dist/` can miss those chunks (they are build outputs, not committed),
 * and the copied tree then fails to import at runtime. When a chunk referenced
 * by the entry is absent from the source dist, fall back to the deployed
 * extension tree (the tree the app actually runs) for that extension's dist.
 */
function deployedExtensionsRoot() {
  return process.env.AITI_DEPLOYED_EXTENSIONS_DIR
    ?? join(process.env.HOME ?? "", ".pi", "web", "extensions");
}

function missingChunks(distDir, clientRel) {
  // clientRel is relative to the extension dir (dist/<file>) or already bare.
  const bare = clientRel.replace(/^dist\//, "");
  const candidates = [join(distDir, bare), join(distDir, "dist", bare)];
  const entry = candidates.find((p) => existsSync(p) && statSync(p).isFile());
  if (!entry) return [];
  const text = readFileSync(entry, "utf8");
  return [...text.matchAll(/from\s*["'](\.\/[^"']+)["']/g)]
    .map((m) => m[1])
    .filter((rel) => !existsSync(join(dirname(entry), rel)));
}

function copyDist(extId, sourceDir, destAssetDir, clientRel) {
  const destDist = join(destAssetDir, "dist");
  const bare = clientRel.replace(/^dist\//, "");
  const srcDist = join(sourceDir, "dist");
  if (existsSync(srcDist)) cpSync(srcDist, destDist, { recursive: true });
  // An unbuilt checkout has an empty (or absent) dist: the entry itself is missing.
  if (!existsSync(join(destDist, bare))) {
    const deployedDist = join(deployedExtensionsRoot(), extId, "dist");
    if (existsSync(deployedDist)) {
      cpSync(deployedDist, destDist, { recursive: true });
      return "deployed";
    }
    return "missing";
  }
  const missing = missingChunks(destDist, clientRel);
  if (!missing.length) return "source";
  const deployedDist = join(deployedExtensionsRoot(), extId, "dist");
  if (existsSync(deployedDist)) {
    cpSync(deployedDist, join(destAssetDir, "dist"), { recursive: true });
    if (!missingChunks(join(destAssetDir, "dist"), clientRel).length) return "deployed";
  }
  console.warn(`[ext] ${extId}: client chunks still missing (${missing.join(", ")})`);
  return "incomplete";
}

const publicRoot = join(demoDir, "public", "api", "extensions");
// Publish atomically. The editor's Monaco loader treats one 404 as a permanent
// failure for the whole page session, so the old "rmSync then copy" left a
// multi-second window where every asset 404'd. Build into a staging directory
// and swap it in with a rename instead.
const stagingRoot = join(demoDir, "public", "api", ".extensions.next");
const retiredRoot = join(demoDir, "public", "api", ".extensions.prev");

function publish(root) {
  rmSync(retiredRoot, { recursive: true, force: true });
  if (existsSync(publicRoot)) renameSync(publicRoot, retiredRoot);
  renameSync(root, publicRoot);
  rmSync(retiredRoot, { recursive: true, force: true });
}


/**
 * Local extensions live in this repo (`extensions/<id>/`). They are demo-only:
 * never published, never part of aiti-ai. Merged into the static tier ahead of
 * the recorded catalog so the host loads them like any other extension.
 */
async function localExtensions() {
  const dir = join(demoDir, "extensions");
  if (!existsSync(dir)) return [];
  const out = [];
  for (const name of readdirSync(dir)) {
    const extDir = join(dir, name);
    const entry = join(extDir, "index.ts");
    if (!existsSync(entry)) continue;
    let mod;
    try {
      mod = await jiti.import(pathToFileURL(entry).href);
    } catch (error) {
      console.warn(`[ext] local ${name}: import failed (${String(error).slice(0, 120)})`);
      continue;
    }
    const ext = mod.default;
    if (!ext?.id || !ext?.client) {
      console.warn(`[ext] local ${name}: missing default export with id/client`);
      continue;
    }
    const clientRel = String(ext.client);
    if (!existsSync(join(extDir, clientRel))) {
      console.warn(`[ext] local ${ext.id}: client not built (${clientRel})`);
      continue;
    }
    const pkgPath = join(extDir, "package.json");
    const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, "utf8")) : {};
    const assetDir = join(stagingRoot, ext.id, "assets");
    mkdirSync(assetDir, { recursive: true });
    cpSync(join(extDir, "dist"), join(assetDir, "dist"), { recursive: true });
    for (const extra of ["icons", "icon.svg", "LICENSE", "README.md"]) {
      if (existsSync(join(extDir, extra))) cpSync(join(extDir, extra), join(assetDir, extra), { recursive: true });
    }
    const clientUrl = `/api/extensions/${ext.id}/assets/${clientRel}`;
    const rev = hashFiles(join(assetDir, "dist"));
    out.push({
      ext: {
        id: ext.id,
        name: ext.name ?? ext.id,
        version: pkg.version ?? "0.0.0",
        clientUrl,
        ui: ext.ui ?? null,
        source: "local",
        icon: ext.icon ?? null,
      },
      row: { id: ext.id, url: `${clientUrl}?rev=${rev}`, rev, immediately: true },
    });
    console.log(`[ext] local extension: ${ext.id} (${clientRel})`);
  }
  return out;
}


/**
 * The two seeds the host normally gets from its own server, derived from the
 * manifest we just built:
 *
 *  · `ext-slot-declarations.json` — slot → declaring extension ids, the exact
 *    shape of the server registry's `slotDeclarations()`. The host uses it as
 *    the SSR seed for takeover decisions: with a `sidebarContent` declarer the
 *    sidebar renders its takeover skeleton on the first frame instead of the
 *    native SessionSidebar. A static export has no server, so without this
 *    seed the first frames fall back to the native sidebar — on a slow link
 *    that fallback then sits on screen for tens of seconds while the takeover
 *    bundle is still downloading (the "session-manager never takes over"
 *    report).
 *  · `boot-preload.json` — the eager client bundle plus the sidebarContent
 *    taker's entry: preloaded from `<head>` so the takeover assets download in
 *    parallel with the app shell instead of starting after it settles.
 */
function writeHostSeeds(manifest) {
  const SLOT_META_KEYS = new Set(["i18n", "provides", "clientDependsOn", "clientImmediately"]);
  const declarations = {};
  for (const ext of manifest.extensions) {
    for (const [key, value] of Object.entries(ext.ui ?? {})) {
      if (SLOT_META_KEYS.has(key) || !Array.isArray(value) || value.length === 0) continue;
      (declarations[key] ??= []).push(ext.id);
    }
  }
  const dataDir = join(demoDir, "mock", "data");
  writeFileSync(join(dataDir, "ext-slot-declarations.json"), JSON.stringify(declarations, null, 2) + "\n");

  const scripts = [];
  if (manifest.graph?.bundle?.url) scripts.push(manifest.graph.bundle.url);
  for (const id of declarations.sidebarContent ?? []) {
    const row = (manifest.graph?.entries ?? []).find((entry) => entry.id === id);
    if (row?.url) scripts.push(row.url);
  }
  writeFileSync(join(dataDir, "boot-preload.json"), JSON.stringify({ scripts: [...new Set(scripts)] }, null, 2) + "\n");
  console.log(`[ext] host seeds: ${Object.keys(declarations).length} slot(s) declared, ${scripts.length} preload hint(s)`);
}

/**
 * aiti-devtools serves its launcher/bridge helpers from the extension root
 * (`/api/extensions/aiti-devtools/host-protocol.js`, `bridge-client.js`, …).
 * The extension's own `assets/` directory went untracked upstream, but the
 * copies are tracked in packages/aiti-devtools-core/assets — mirror them at
 * both the runtime URL and the `/assets/` alias the host's asset router
 * accepts. Without them the client 404s its helpers on every boot.
 */
function copyDevtoolsCoreAssets(sourceRoot, assetDir, rootDir) {
  const from = join(sourceRoot, "packages", "aiti-devtools-core", "assets");
  if (!existsSync(from)) {
    console.warn("[ext] aiti-devtools: packages/aiti-devtools-core/assets missing — runtime helpers will 404");
    return;
  }
  for (const file of readdirSync(from)) {
    const src = join(from, file);
    if (!statSync(src).isFile()) continue;
    cpSync(src, join(rootDir, file));
    cpSync(src, join(assetDir, file));
  }
}

/**
 * Pre-build the host's eager client bundle.
 *
 * The host loads `graph.bundle` as ONE script (its own optimization for the
 * per-extension URLs). A static demo can build it ahead of time with the host's
 * own builder, which turns ~40 boot requests into one — the dominant cost when
 * the site is served through a CDN.
 */
async function buildEagerBundle(manifest) {
  const eager = (manifest.graph?.entries ?? []).filter((row) => row.immediately !== false && !row.bundleExcluded);
  if (!eager.length) return;
  // Default: batch every eager client (the host's own behaviour) — measured equal
  // to a split at 300ms RTT and fewer round trips beyond that, which is what a
  // CDN-served demo sees. AITI_DEMO_BATCH_ALL=0 batches only AITI_DEMO_BATCH_IDS,
  // which shrank the batch to 61KB/5 clients but did not move time-to-ready.
  const batchAll = process.env.AITI_DEMO_BATCH_ALL !== "0";
  const critical = new Set(
    (process.env.AITI_DEMO_BATCH_IDS ?? "session-manager,aiti-event-bus,aiti-float,aiti-draft-keeper,aiti-app-center,demo-banner")
      .split(",").map((id) => id.trim()).filter(Boolean),
  );
  const rows = batchAll ? eager : eager.filter((row) => critical.has(row.id));
  if (!rows.length) return;
  const bundleMod = await jiti.import(pathToFileURL(join(sourceRoot, "lib", "ext", "client-bundle.ts")).href);
  if (typeof bundleMod.buildClientBundle !== "function") {
    console.warn("[ext] host bundle builder unavailable — skipping the eager bundle");
    return;
  }
  const entries = rows.map((row, order) => {
    const id = row.id;
    const assetDir = join(publicRoot, id, "assets");
    const rel = String(row.url ?? "").replace(`/api/extensions/${id}/assets/`, "").split("?")[0];
    return { id, dir: assetDir, file: join(assetDir, rel), rev: row.rev, priority: row.priority, order };
  }).filter((entry) => existsSync(entry.file));
  if (!entries.length) return;
  const built = await bundleMod.buildClientBundle(entries);
  if (!built?.code) return;
  // The bundle externalizes chunked extensions' shared chunks as relative paths
  // (`./<extId>/assets/dist/entry-*.js`), so it has to live at
  // /api/extensions/<file> — relative to that directory they resolve to the
  // per-extension asset URLs.
  rmSync(join(demoDir, "public", "ext-bundle"), { recursive: true, force: true });
  for (const stale of readdirSync(publicRoot)) {
    if (stale.startsWith("client-bundle-")) rmSync(join(publicRoot, stale), { force: true });
  }
  const file = `client-bundle-${built.rev}.mjs`;
  writeFileSync(join(publicRoot, file), built.code);
  manifest.graph.bundle = { url: `/api/extensions/${file}`, rev: built.rev, ids: built.ids };
  if (built.offenders?.length) console.log(`[ext] bundle: excluded import.meta extensions: ${built.offenders.join(", ")}`);
  if (built.chunked?.length) console.log(`[ext] bundle: chunked extensions externalized: ${built.chunked.length}`);
  console.log(`[ext] eager bundle: ${built.ids.length}/${eager.length} clients in one file (${Math.round(built.code.length / 1024)}KB)`);
}

if (fullMode) {
  const capturedManifestPath = join(demoDir, "mock", "model", "catalog", "extensionManifest.json");
  if (!existsSync(capturedManifestPath)) {
    console.error("[ext] missing mock/model/catalog/extensionManifest.json (run compile first)");
    process.exit(1);
  }
  const captured = JSON.parse(readFileSync(capturedManifestPath, "utf8"));
  const skipIds = new Set([
    "demo", "demo-lazy", "sm-demo-source",
    // experimental pi-work extensions, not part of the public aiti-ai tree
    "aiti-bridge-probe", "aiti-plan-first", "aiti-plan-review", "aiti-video-studio",
  ]);
  // Settings takeovers that still need more recorded APIs: catalog only.
  const skipClients = new Set();

  if (captureRun) {
    const rawAssets = join(demoDir, "capture", "raw", captureRun, "assets", "api", "extensions");
    if (!existsSync(rawAssets)) {
      console.error(`[ext] missing captured assets at ${rawAssets}`);
      process.exit(1);
    }
    rmSync(stagingRoot, { recursive: true, force: true });
    cpSync(rawAssets, stagingRoot, { recursive: true });
  } else {
    // Copy the real client bundles straight from the aiti-ai checkout:
    // extensions/<id>/dist + icons. No archive, no second mock.
    if (!existsSync(join(sourceRoot, "extensions"))) {
      console.error(`[ext] aiti-ai extensions not found at ${sourceRoot}`);
      process.exit(1);
    }
    rmSync(stagingRoot, { recursive: true, force: true });
    mkdirSync(stagingRoot, { recursive: true });
    for (const ext of captured.extensions) {
      if (skipIds.has(ext.id)) continue;
      const sourceDir = join(sourceRoot, "extensions", ext.id);
      if (!existsSync(sourceDir)) continue;
      const assetDir = join(stagingRoot, ext.id, "assets");
      const rootDir = join(stagingRoot, ext.id);
      const clientRel = String(ext.clientUrl ?? "").replace(`/api/extensions/${ext.id}/assets/`, "").replace(/\?.*$/, "");
      // `client` lives on the extension definition (index.ts), not in its
      // package.json, so the captured clientUrl is the resolved truth. No client
      // means the host graph has no entry for this id: the demo only lists it in
      // the catalog, and nothing ever requests its client assets.
      const serverOnly = !clientRel;
      if (DIST_SOURCE === "npm") {
        if (serverOnly) {
          // Skip npm outright — a server-only tarball carries no `dist/`, so the
          // two `npm pack` attempts (declared version + @latest) are dead weight
          // (tens of seconds each on a cold registry cache). A local checkout may
          // still have a built dist; carry it for parity with a checkout run.
          if (existsSync(join(sourceDir, "dist"))) {
            cpSync(join(sourceDir, "dist"), join(assetDir, "dist"), { recursive: true });
          }
          console.log(`[ext] ${ext.id}: no client bundle (server-only extension) — catalog entry only`);
        } else {
          const ok = (await installFromNpm(ext.id, sourceDir, assetDir))
            || copyPlainClient(ext.id, sourceDir, assetDir, clientRel);
          // A local checkout may still have the dist (built or deployed) while CI
          // has neither, so fall back to it before listing the row without a client.
          if (!ok && existsSync(join(sourceDir, "dist"))) {
            cpSync(join(sourceDir, "dist"), join(assetDir, "dist"), { recursive: true });
            for (const part of ["icons", "icon.svg"]) {
              if (existsSync(join(sourceDir, part))) cpSync(join(sourceDir, part), join(assetDir, part), { recursive: true });
            }
          } else if (!ok) {
            console.warn(`[ext] ${ext.id}: client bundle unavailable on npm and no built dist — listed without a client`);
          }
        }
      } else if (existsSync(join(sourceDir, "dist"))) {
        const origin = copyDist(ext.id, sourceDir, assetDir, clientRel);
        if (origin === "deployed") console.log(`[ext] ${ext.id}: dist chunks completed from the deployed tree`);
      }
      if (existsSync(join(sourceDir, "icons"))) cpSync(join(sourceDir, "icons"), join(assetDir, "icons"), { recursive: true });
      if (existsSync(join(sourceDir, "icon.svg"))) cpSync(join(sourceDir, "icon.svg"), join(assetDir, "icon.svg"));
      // Asset routing mirrors the host: a URL "/assets/<rel>" maps to the
      // extension directory itself (registry.assetPath strips the prefix), so
      // serve <extDir>/<rel> at BOTH root and /assets/ — that covers aiti-editor
      // (assets/vendor + assets/monaco/vs from its monaco/ + vendor/ dirs) and
      // aiti-devtools (root-level runtime helpers).
      if (existsSync(join(sourceDir, "assets"))) {
        cpSync(join(sourceDir, "assets"), assetDir, { recursive: true });
        cpSync(join(sourceDir, "assets"), rootDir, { recursive: true });
      }
      if (ext.id === "aiti-editor") {
        if (existsSync(join(sourceDir, "vendor"))) {
          cpSync(join(sourceDir, "vendor"), join(assetDir, "vendor"), { recursive: true });
          cpSync(join(sourceDir, "vendor"), join(rootDir, "vendor"), { recursive: true });
        }
        if (existsSync(join(sourceDir, "monaco", "vs"))) {
          cpSync(join(sourceDir, "monaco", "vs"), join(assetDir, "monaco", "vs"), { recursive: true });
          cpSync(join(sourceDir, "monaco", "vs"), join(rootDir, "monaco", "vs"), { recursive: true });
        } else {
          // monaco/ is gitignored (materialized from monaco-editor by the
          // extension's prepack), so a fresh checkout and its npm tarball both
          // lack it — the file preview would then have no editor at all. Pull
          // the AMD bundle straight from the monaco-editor tarball.
          materializeMonacoFromNpm(sourceDir, assetDir, rootDir);
        }
      }
      if (ext.id === "aiti-devtools") copyDevtoolsCoreAssets(sourceRoot, assetDir, rootDir);
      for (const name of readdirSync(sourceDir)) {
        if (!/\.(js|mjs|css|json|html|svg|png)$/.test(name)) continue;
        const file = join(sourceDir, name);
        if (!statSync(file).isFile()) continue;
        cpSync(file, join(rootDir, name));
      }
      for (const name of ["LICENSE", "README.md"]) {
        if (existsSync(join(sourceDir, name))) cpSync(join(sourceDir, name), join(assetDir, name));
      }
    }
  }

  rmSync(join(demoDir, "public", "api", ".npm-packs"), { recursive: true, force: true });
  // Local (demo-only) extensions copy into the staging tree, so they must be
  // collected before the rename.
  const local = await localExtensions();
  publish(stagingRoot);
  const publicReady = publicRoot;
  // A tier completed from a deployed tree can carry every past chunk hash. Drop
  // the generations the manifest does not reference before the rows are wired,
  // so a 26MB bundle does not ship 90MB of dead siblings.
  const protect = captured.extensions
    .map((ext) => String(ext.clientUrl ?? "").replace(/\?.*$/, ""))
    .filter((p) => p.startsWith("/api/extensions/"))
    .map((p) => join(demoDir, "public", p.replace(/^\//, "")));
  const stale = pruneStaleGenerations(publicReady, { protect });
  if (stale.files > 0) {
    console.log(`[ext] stale generations: ${stale.files} file(s), ${(stale.bytes / 1048576).toFixed(1)}MB across ${stale.extensions} extension(s)`);
  }
  const extensions = captured.extensions.map((ext) => {
    const path = ext.clientUrl?.replace(/\?.*$/, "");
    const relative = path?.replace(`/api/extensions/${ext.id}/assets/`, "") ?? "";
    const exists = path && relative && existsSync(join(publicReady, ext.id, "assets", relative));
    return { ...ext, clientUrl: exists && !skipClients.has(ext.id) ? ext.clientUrl : null };
  }).filter((ext) => !skipIds.has(ext.id));
  const available = new Set(extensions.filter((e) => e.clientUrl).map((e) => e.id));
  // [first-load chunk governance] The office viewer extensions are lazy upstream
  // now (aiti-ai flipped them to ui.clientImmediately:false + prefetchOnIdle after
  // this recording was made). Mirror that in the recorded graph until the next
  // capture refresh, so the demo's boot matches the source tree: the provider
  // shells stay out of boot and materialize in the first idle window instead.
  const OFFICE_LAZY = new Set(["aiti-sheet-univer", "aiti-word-superdoc", "aiti-word-docx-preview"]);
  const entries = (captured.graph?.entries ?? []).filter((row) => available.has(row.id)).map((row) => ({
    ...row,
    ...(OFFICE_LAZY.has(row.id) ? { immediately: false } : {}),
    ...(row.bundleExcluded ? { bundleExcluded: true } : {}),
  }));
  for (const ext of extensions) {
    if (OFFICE_LAZY.has(ext.id) && ext.ui && !ext.ui.prefetchOnIdle) {
      ext.ui.prefetchOnIdle = true;
    }
  }
  const manifest = {
    extensions,
    graph: { rev: captured.graph?.rev ?? "source", entries },
    failed: [],
  };
  // Boot-graph eagerness follows the captured graph. Trimming it (only the
  // first-frame core set) saves ~350ms but hides the app-center cards of every
  // extension that declares a panel slot (static declarations never become panel
  // cards), which is exactly what this demo is for. The drawer stays complete.
  // Demo-only extensions from this repo take precedence (same id wins).
  if (local.length) {
    const localIds = new Set(local.map((item) => item.ext.id));
    manifest.extensions = [...local.map((item) => item.ext), ...manifest.extensions.filter((ext) => !localIds.has(ext.id))];
    manifest.graph = { ...manifest.graph, entries: [...local.map((item) => item.row), ...(manifest.graph?.entries ?? []).filter((row) => !localIds.has(row.id))] };
  }
  await buildEagerBundle(manifest);
  writeFileSync(join(demoDir, "mock", "data", "extension-manifest.json"), JSON.stringify(manifest) + "\n");
  writeHostSeeds(manifest);
  console.log(`[ext] full manifest: ${manifest.extensions.length} extension(s), ${manifest.graph.entries.length} client bundle(s) (${captureRun ? `capture ${captureRun}` : `source ${sourceRoot}`}${local.length ? `, ${local.length} local` : ""})`);
  process.exit(0);
}

/** Curated tier: self-contained client bundles (see the plan §9). */
if (!existsSync(join(sourceRoot, "extensions"))) {
  console.error(`[ext] aiti-ai extensions not found at ${sourceRoot}`);
  process.exit(1);
}
const EXT_IDS = [
  "aiti-ctx-meter",
  "aiti-msg-nav",
  "aiti-msg-anchor",
  "aiti-feedback",
  "aiti-model-recent",
  "aiti-draft-keeper",
  "aiti-float",
  "aiti-session-cards",
  "aiti-queue-keeper",
  "demo",
];

// Curated mode publishes atomically too (see publish()).
rmSync(stagingRoot, { recursive: true, force: true });
mkdirSync(stagingRoot, { recursive: true });

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

function hashFiles(dir) {
  const hash = createHash("sha256");
  for (const file of walk(dir).sort()) {
    hash.update(file.slice(dir.length));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex").slice(0, 12);
}

const extensions = [];
const entries = [];
const skipped = [];

for (const id of EXT_IDS) {
  const dir = join(sourceRoot, "extensions", id);
  const indexPath = join(dir, "index.ts");
  if (!existsSync(indexPath)) {
    skipped.push(`${id} (no index.ts)`);
    continue;
  }
  let mod;
  try {
    mod = await jiti.import(pathToFileURL(indexPath).href);
  } catch (error) {
    skipped.push(`${id} (import failed: ${String(error).slice(0, 120)})`);
    continue;
  }
  const ext = mod.default;
  if (!ext?.id || !ext?.client) {
    skipped.push(`${id} (no default/client)`);
    continue;
  }
  const clientRel = String(ext.client);
  const clientFile = join(dir, clientRel);
  if (!existsSync(clientFile)) {
    skipped.push(`${id} (client not built: ${clientRel})`);
    continue;
  }
  const assetDir = join(stagingRoot, ext.id, "assets");
  mkdirSync(assetDir, { recursive: true });
  cpSync(join(dir, "dist"), join(assetDir, "dist"), { recursive: true });
  if (existsSync(join(dir, "icons"))) cpSync(join(dir, "icons"), join(assetDir, "icons"), { recursive: true });
  if (existsSync(join(dir, "icon.svg"))) cpSync(join(dir, "icon.svg"), join(assetDir, "icon.svg"));
  for (const name of ["LICENSE", "README.md"]) {
    if (existsSync(join(dir, name))) cpSync(join(dir, name), join(assetDir, name));
  }

  const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  const features = Array.isArray(ext.features)
    ? ext.features.map((feature) => ({
        ...feature,
        enabled: feature.default !== false,
        ...(feature.type === "string" || feature.type === "textlist" ? { value: String(feature.value ?? "") } : {}),
      }))
    : null;
  const clientUrl = `/api/extensions/${ext.id}/assets/${clientRel}`;
  const rev = hashFiles(join(assetDir, "dist"));
  extensions.push({
    id: ext.id,
    name: ext.name ?? ext.id,
    version: pkg.version ?? "0.0.0",
    clientUrl,
    ui: ext.ui ?? null,
    source: "bundled",
    icon: ext.icon ?? null,
    ...(features ? { features } : {}),
  });
  entries.push({ id: ext.id, url: `${clientUrl}?rev=${rev}`, rev, immediately: true });
}

publish(stagingRoot);
extensions.sort((a, b) => a.id.localeCompare(b.id));
entries.sort((a, b) => a.id.localeCompare(b.id));
const graphRev = createHash("sha256").update(entries.map((e) => `${e.id}:${e.rev}`).join("|")).digest("hex").slice(0, 12);
const manifest = { extensions, graph: { rev: graphRev, entries }, failed: [] };

const out = join(demoDir, "mock", "data", "extension-manifest.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");
writeHostSeeds(manifest);

console.log(`[ext] ${extensions.length} extension(s) wired: ${extensions.map((e) => e.id).join(", ") || "(none)"}`);
if (skipped.length) console.log(`[ext] skipped: ${skipped.join("; ")}`);
