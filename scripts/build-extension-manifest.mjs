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
      if (DIST_SOURCE === "npm") {
        const ok = (await installFromNpm(ext.id, sourceDir, assetDir))
          || copyPlainClient(ext.id, sourceDir, assetDir, clientRel);
        // Bundled-only extensions are not on npm; a local checkout may still have
        // their dist, so fall back to it (CI has neither and lists them without a
        // client).
        if (!ok && existsSync(join(sourceDir, "dist"))) {
          cpSync(join(sourceDir, "dist"), join(assetDir, "dist"), { recursive: true });
          for (const part of ["icons", "icon.svg"]) {
            if (existsSync(join(sourceDir, part))) cpSync(join(sourceDir, part), join(assetDir, part), { recursive: true });
          }
        } else if (!ok) {
          console.warn(`[ext] ${ext.id}: not available on npm or as a built dist — catalog entry only`);
        }
      } else if (existsSync(join(sourceDir, "dist"))) {
        const clientRel = String(ext.clientUrl ?? "").replace(`/api/extensions/${ext.id}/assets/`, "").replace(/\?.*$/, "");
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
        }
      }
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
  const extensions = captured.extensions.map((ext) => {
    const path = ext.clientUrl?.replace(/\?.*$/, "");
    const relative = path?.replace(`/api/extensions/${ext.id}/assets/`, "") ?? "";
    const exists = path && relative && existsSync(join(publicReady, ext.id, "assets", relative));
    return { ...ext, clientUrl: exists && !skipClients.has(ext.id) ? ext.clientUrl : null };
  }).filter((ext) => !skipIds.has(ext.id));
  const available = new Set(extensions.filter((e) => e.clientUrl).map((e) => e.id));
  const entries = (captured.graph?.entries ?? []).filter((row) => available.has(row.id));
  const manifest = {
    extensions,
    graph: { rev: captured.graph?.rev ?? "source", entries },
    failed: [],
  };
  // Demo-only extensions from this repo take precedence (same id wins).
  if (local.length) {
    const localIds = new Set(local.map((item) => item.ext.id));
    manifest.extensions = [...local.map((item) => item.ext), ...manifest.extensions.filter((ext) => !localIds.has(ext.id))];
    manifest.graph = { ...manifest.graph, entries: [...local.map((item) => item.row), ...(manifest.graph?.entries ?? []).filter((row) => !localIds.has(row.id))] };
  }
  writeFileSync(join(demoDir, "mock", "data", "extension-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
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

console.log(`[ext] ${extensions.length} extension(s) wired: ${extensions.map((e) => e.id).join(", ") || "(none)"}`);
if (skipped.length) console.log(`[ext] skipped: ${skipped.join("; ")}`);
