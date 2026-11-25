#!/usr/bin/env node
/**
 * Rename every .mjs in a built site to .js and rewrite the references.
 *
 * EdgeOne Makers resolves content types from a built-in table that has no entry
 * for .mjs, and its edgeone.json header rules match the path *including* the
 * query string, so a `/*.mjs` rule never fires for the `?rev=`/`?bust=`
 * cache-busting URLs the client requests. Renaming sidesteps both problems:
 * `.js?rev=…` is served as application/javascript by every host we use.
 *
 *   node scripts/normalize-mjs.mjs [site-dir]
 *
 * Exclusions: demo-files/ is a snapshot of repository sources — thousands of
 * files that merely *mention* .mjs or quote .mjs code — and must stay verbatim.
 */
import { readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const siteDir = resolve(process.argv[2] ?? join(repoDir, "out"));
const SNAPSHOT_DIR = "demo-files";
const REWRITABLE = new Set([".js", ".mjs", ".json", ".html", ".txt", ".css"]);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(siteDir);
let renamed = 0;
let rewritten = 0;
let replacements = 0;

// 1. Rename first, so the reference rewrite below points at files that exist.
for (const file of files) {
  if (!file.endsWith(".mjs")) continue;
  const target = file.slice(0, -4) + ".js";
  renameSync(file, target);
  renamed++;
}

// 2. Rewrite references in text files, skipping the repository snapshot.
// Only paths (`…/name.mjs`) are rewritten: identifiers like TypeScript's
// `.mjs` declaration-suffix mapping are plain strings and must not follow.
const PATH_REF = /\/([A-Za-z0-9._-]+)\.mjs\b/g;
for (const file of walk(siteDir)) {
  const rel = relative(siteDir, file);
  if (rel === SNAPSHOT_DIR || rel.startsWith(SNAPSHOT_DIR + "/")) continue;
  const ext = file.slice(file.lastIndexOf("."));
  if (!REWRITABLE.has(ext)) continue;
  const text = readFileSync(file, "utf8");
  const hits = (text.match(PATH_REF) ?? []).length;
  if (hits === 0) continue;
  const next = text.replace(PATH_REF, "/$1.js");
  if (next !== text) {
    writeFileSync(file, next);
    rewritten++;
    replacements += hits;
  }
}

console.log(`[normalize] renamed ${renamed} .mjs file(s), rewrote ${replacements} reference(s) across ${rewritten} file(s)`);

// 3. Fail loudly if a reference survived (a query-string form we did not cover,
// or a dynamically built path that concatenates the extension).
const stragglers = [];
for (const file of walk(siteDir)) {
  const rel = relative(siteDir, file);
  if (rel === SNAPSHOT_DIR || rel.startsWith(SNAPSHOT_DIR + "/")) continue;
  const ext = file.slice(file.lastIndexOf("."));
  if (!REWRITABLE.has(ext)) continue;
  if (PATH_REF.test(readFileSync(file, "utf8"))) {
    stragglers.push(rel);
  }
  PATH_REF.lastIndex = 0;
}
if (stragglers.length > 0) {
  console.error(`[normalize] ${stragglers.length} file(s) still reference a .mjs path:`);
  for (const s of stragglers.slice(0, 10)) console.error("  " + s);
  process.exit(1);
}
