#!/usr/bin/env node
/**
 * Drop extensions whose client bundle exceeds a per-file size cap.
 *
 * Upload targets such as the EdgeOne Makers free plan reject any single file
 * over 25 MB, which fails the whole upload. A few extension bundles ship chunks
 * above that limit, so this script removes those extensions from the static
 * extension tier and from the generated manifest before the site is rebuilt for
 * such a target. Everything else keeps deploying unchanged.
 *
 *   node scripts/prune-oversize-extensions.mjs [--limit-mb 25] [--dry-run]
 *                                              [--verbose] [--keep-catalog]
 *                                              [--allow <id,id>] [--no-stale]
 *
 * Stale build generations are pruned first (scripts/lib/prune-stale-generations.mjs):
 * a tier assembled from a deployed tree carries every past chunk hash, and those
 * dead files must not decide whether a healthy extension gets dropped. Pass
 * --no-stale to measure the tree exactly as it is.
 *
 * --keep-catalog keeps the extension listed in the manifest with clientUrl:null
 * (catalog-only, the host shows it without loading a bundle) instead of deleting
 * the entry outright.
 *
 * Touches (run it on a throwaway checkout, e.g. in CI):
 *   public/api/extensions/<id>/          removed for pruned extensions
 *   mock/data/extension-manifest.json    entries for pruned extensions removed
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pruneStaleGenerations } from "./lib/prune-stale-generations.mjs";

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const valueOf = (name, fallback) => {
  const inline = args.find((a) => a.startsWith(`--${name}=`));
  if (inline) return inline.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const limitMb = Number(valueOf("limit-mb", 25));
const dryRun = args.includes("--dry-run");
const verbose = args.includes("--verbose");
const keepCatalog = args.includes("--keep-catalog");
const skipStale = args.includes("--no-stale");
const allow = new Set(String(valueOf("allow", "")).split(",").map((s) => s.trim()).filter(Boolean));

if (!Number.isFinite(limitMb) || limitMb <= 0) {
  console.error("[prune] --limit-mb must be a positive number");
  process.exit(1);
}
const limitBytes = limitMb * 1024 * 1024;

const apiDir = join(repoDir, "public", "api", "extensions");
const manifestPath = join(repoDir, "mock", "data", "extension-manifest.json");

if (!existsSync(apiDir)) {
  console.error(`[prune] extension assets not found: ${apiDir} (run the extension build first)`);
  process.exit(1);
}

// Read the manifest up front: its clientUrl entries are hashed file names that
// must never be treated as a stale generation.
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const protect = manifest.extensions
  .map((ext) => String(ext.clientUrl ?? "").replace(/\?.*$/, ""))
  .filter((p) => p.startsWith("/api/extensions/"))
  .map((p) => join(repoDir, "public", p.replace(/^\//, "")));

/** Largest file under a directory, recursively. */
function largestFile(dir) {
  let size = 0;
  let file = "";
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      const inner = largestFile(p);
      if (inner.size > size) ({ size, file } = inner);
    } else if (st.size > size) {
      size = st.size;
      file = p;
    }
  }
  return { size, file };
}

/** Total bytes under a directory, recursively. */
function dirSize(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    total += st.isDirectory() ? dirSize(p) : st.size;
  }
  return total;
}

/** Per-extension file inventory (largest file + total bytes). */
function inventory() {
  const rows = [];
  for (const id of readdirSync(apiDir)) {
    const dir = join(apiDir, id);
    if (!statSync(dir).isDirectory()) continue;
    const big = largestFile(dir);
    rows.push({ id, dir, largest: big.size, largestFile: big.file, total: dirSize(dir) });
  }
  return rows.sort((a, b) => b.largest - a.largest);
}

if (!skipStale) {
  const st = pruneStaleGenerations(apiDir, { dryRun, log: console.log, protect });
  if (st.files > 0) {
    console.log(`[prune] stale generations: ${st.files} file(s), ${(st.bytes / 1048576).toFixed(1)}MB across ${st.extensions} extension(s)`);
  }
}

const rows = inventory();
const oversized = rows.filter((row) => row.largest > limitBytes && !allow.has(row.id));
const allowed = rows.filter((row) => row.largest > limitBytes && allow.has(row.id));

if (verbose) {
  console.log("[prune] largest file per extension:");
  for (const row of rows.slice(0, 20)) {
    const mark = row.largest > limitBytes ? "✗" : " ";
    console.log(`  ${mark} ${(row.largest / 1048576).toFixed(1).padStart(6)}MB  ${(row.total / 1048576).toFixed(0).padStart(5)}MB dir  ${row.id}  (${row.largestFile.slice(row.dir.length + 1)})`);
  }
}
for (const row of allowed) {
  console.log(`[prune] keeping ${row.id} (--allow) although its largest file is ${(row.largest / 1048576).toFixed(1)}MB`);
}

if (oversized.length === 0) {
  console.log(`[prune] nothing over ${limitMb} MB per file — site unchanged`);
  process.exit(0);
}

for (const row of oversized) {
  const action = keepCatalog ? "demote to catalog-only" : "drop";
  console.log(`[prune] ${dryRun ? `would ${action}` : action} ${row.id} — largest ${(row.largest / 1048576).toFixed(1)} MB (${row.largestFile.slice(repoDir.length + 1)})`);
}

if (dryRun) {
  console.log(`[prune] dry run: ${oversized.length} extension(s) would be ${keepCatalog ? "demoted" : "removed"}`);
  process.exit(0);
}

const affected = new Set(oversized.map((row) => row.id));
for (const id of affected) rmSync(join(apiDir, id), { recursive: true, force: true });

const before = manifest.extensions.length;
if (keepCatalog) {
  manifest.extensions = manifest.extensions.map((ext) =>
    affected.has(ext.id) ? { ...ext, clientUrl: null, ui: ext.ui ? { ...ext.ui, prefetchOnIdle: false } : ext.ui } : ext,
  );
} else {
  manifest.extensions = manifest.extensions.filter((ext) => !affected.has(ext.id));
}
if (manifest.graph?.entries) {
  manifest.graph.entries = manifest.graph.entries.filter((entry) => !affected.has(entry.id));
}
if (manifest.graph?.bundle?.ids) {
  manifest.graph.bundle.ids = manifest.graph.bundle.ids.filter((id) => !affected.has(id));
}
writeFileSync(manifestPath, JSON.stringify(manifest));

// Anything still above the cap would fail the upload again; surface it instead
// of letting the deploy step fail with an opaque API error.
const survivors = inventory().filter((row) => row.largest > limitBytes);
console.log(`[prune] extensions ${before} -> ${manifest.extensions.length}`);
if (survivors.length > 0) {
  for (const row of survivors) {
    console.error(`[prune] still oversized: ${row.id} — ${(row.largest / 1048576).toFixed(1)} MB (${row.largestFile})`);
  }
  process.exit(1);
}
