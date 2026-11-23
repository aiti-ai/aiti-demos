#!/usr/bin/env node
/**
 * Fetch every extension client bundle + its literal relative imports from a
 * running pi-web instance, so the static demo can serve the real extension
 * tier without a backend.
 *
 *   node scripts/fetch-extension-bundles.mjs --url http://127.0.0.1:30145 [--out capture/raw/<run>/assets]
 *
 * Extension bundles use relative `import { ... } from "./entry-<hash>.js"`
 * chunks; the fetcher walks those edges (and icons) recursively.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const base = arg("url", "http://127.0.0.1:30145").replace(/\/+$/, "");
const out = arg("out", "capture/raw/p1-core4/assets");

const manifestResponse = await fetch(`${base}/api/extensions/manifest`);
if (!manifestResponse.ok) {
  console.error(`[fetch] manifest HTTP ${manifestResponse.status}`);
  process.exit(1);
}
const manifest = await manifestResponse.json();
const seen = new Set();
let ok = 0;
let failed = 0;
let bytes = 0;

async function save(rawPath) {
  const clean = rawPath.split("?")[0];
  if (seen.has(clean)) return;
  seen.add(clean);
  const response = await fetch(base + rawPath);
  if (!response.ok) {
    failed += 1;
    console.warn(`[fetch] ${response.status} ${rawPath}`);
    return;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  const file = join(out, clean.replace(/^\//, ""));
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, buffer);
  ok += 1;
  bytes += buffer.length;

  if (!/\.(mjs|js)$/.test(clean)) return;
  const text = buffer.toString("utf8");
  const dir = posix.dirname(clean);
  for (const match of text.matchAll(/(?:from|import\s*\()\s*["'](\.\.?\/[^"']+)["']/g)) {
    const next = posix.normalize(posix.join(dir, match[1]));
    await save(next.startsWith("/") ? next : `/${next}`);
  }
}

function collectIcons(value, out = []) {
  if (!value || typeof value !== "object") return out;
  if (Array.isArray(value)) {
    for (const item of value) collectIcons(item, out);
    return out;
  }
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === "string" && item.endsWith(".svg") && (key === "icon" || key === "iconUrl")) out.push(item);
    else collectIcons(item, out);
  }
  return out;
}

for (const ext of manifest.extensions) {
  if (ext.clientUrl) await save(ext.clientUrl);
  const icons = new Set(collectIcons(ext.ui));
  if (ext.icon?.endsWith(".svg")) icons.add(ext.icon);
  for (const icon of icons) await save(`/api/extensions/${ext.id}/assets/${icon}`);
}
for (const row of manifest.graph?.entries ?? []) {
  const url = new URL(row.url, base);
  await save(url.pathname + url.search);
}

// Client bundles reference icons by relative path at runtime; those are not in
// the manifest (inline SVG metadata), so scan the fetched JS for `icons/*.svg`.
import { readFileSync, readdirSync, statSync } from "node:fs";
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile() && /\.(mjs|js)$/.test(name)) out.push(p);
  }
  return out;
}
for (const ext of manifest.extensions) {
  const dir = join(out, "api", "extensions", ext.id);
  if (!statSync(dir, { throwIfNoEntry: false })?.isDirectory()) continue;
  for (const file of walk(dir)) {
    const text = readFileSync(file, "utf8");
    for (const match of text.matchAll(/["'](icons\/[A-Za-z0-9._-]+\.svg)["']/g)) {
      await save(`/api/extensions/${ext.id}/assets/${match[1]}`);
    }
  }
}

console.log(`[fetch] ${ok} file(s), ${(bytes / 1048576).toFixed(1)}MB, ${failed} failure(s) -> ${out}`);
if (failed) process.exitCode = 1;
