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
 *
 * Touches (run it on a throwaway checkout, e.g. in CI):
 *   public/api/extensions/<id>/          removed for pruned extensions
 *   mock/data/extension-manifest.json    entries for pruned extensions removed
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const inline = args.find((a) => a.startsWith("--limit-mb="));
const limitMb = Number(inline ? inline.split("=")[1] : args.includes("--limit-mb") ? args[args.indexOf("--limit-mb") + 1] : 25);
const dryRun = args.includes("--dry-run");

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

const pruned = [];
for (const id of readdirSync(apiDir)) {
  const dir = join(apiDir, id);
  if (!statSync(dir).isDirectory()) continue;
  const big = largestFile(dir);
  if (big.size > limitBytes) pruned.push({ id, ...big });
}

if (pruned.length === 0) {
  console.log(`[prune] nothing over ${limitMb} MB per file — site unchanged`);
  process.exit(0);
}

for (const item of pruned) {
  console.log(`[prune] ${dryRun ? "would drop" : "drop"} ${item.id} — largest ${(item.size / 1024 / 1024).toFixed(1)} MB (${item.file.slice(repoDir.length + 1)})`);
}

if (dryRun) {
  console.log(`[prune] dry run: ${pruned.length} extension(s) would be removed`);
  process.exit(0);
}

const drop = new Set(pruned.map((p) => p.id));
for (const id of drop) rmSync(join(apiDir, id), { recursive: true, force: true });

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const before = manifest.extensions.length;
manifest.extensions = manifest.extensions.filter((ext) => !drop.has(ext.id));
if (manifest.graph?.entries) {
  manifest.graph.entries = manifest.graph.entries.filter((entry) => !drop.has(entry.id));
}
writeFileSync(manifestPath, JSON.stringify(manifest));

// Anything still above the cap would fail the upload again; surface it instead
// of letting the deploy step fail with an opaque API error.
const survivors = [];
for (const id of readdirSync(apiDir)) {
  const dir = join(apiDir, id);
  if (!statSync(dir).isDirectory()) continue;
  const big = largestFile(dir);
  if (big.size > limitBytes) survivors.push({ id, ...big });
}

console.log(`[prune] extensions ${before} -> ${manifest.extensions.length}`);
if (survivors.length > 0) {
  for (const item of survivors) {
    console.error(`[prune] still oversized: ${item.id} — ${(item.size / 1024 / 1024).toFixed(1)} MB (${item.file})`);
  }
  process.exit(1);
}
