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
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createJiti } from "jiti";

// The host loads extension entries through jiti (TypeScript + require()); reuse
// the same loader so metadata imports behave identically to production.
const jiti = createJiti(import.meta.url, { interopDefault: true });

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.slice("--root=".length)
  ?? (args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined);
const sourceRoot = resolve(rootArg ?? process.env.AITI_SRC ?? join(demoDir, "..", "aiti-ai"));
if (!existsSync(join(sourceRoot, "extensions"))) {
  console.error(`[ext] aiti-ai extensions not found at ${sourceRoot}`);
  process.exit(1);
}

/** Curated tier: self-contained client bundles (see the plan §9). */
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

const publicRoot = join(demoDir, "public", "api", "extensions");
rmSync(publicRoot, { recursive: true, force: true });
mkdirSync(publicRoot, { recursive: true });

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
  const assetDir = join(publicRoot, ext.id, "assets");
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

extensions.sort((a, b) => a.id.localeCompare(b.id));
entries.sort((a, b) => a.id.localeCompare(b.id));
const graphRev = createHash("sha256").update(entries.map((e) => `${e.id}:${e.rev}`).join("|")).digest("hex").slice(0, 12);
const manifest = { extensions, graph: { rev: graphRev, entries }, failed: [] };

const out = join(demoDir, "mock", "data", "extension-manifest.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(manifest, null, 2) + "\n");

console.log(`[ext] ${extensions.length} extension(s) wired: ${extensions.map((e) => e.id).join(", ") || "(none)"}`);
if (skipped.length) console.log(`[ext] skipped: ${skipped.join("; ")}`);
