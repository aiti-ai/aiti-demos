#!/usr/bin/env node
/**
 * Audit compiled fixtures for leaked real paths / credentials.
 *
 *   node scripts/audit-fixtures.mjs [--run <id>]
 *
 * Scans mock/model/**.json and mock/assets/** text files. Fails (exit 1) on
 * high-confidence leaks; prints a short report otherwise.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const modelDir = join(demoDir, "mock", "model");
const assetsDir = join(demoDir, "mock", "assets");

const patterns = [
  { name: "real home path", re: /\/home\/wind\b/g },
  { name: "capture run path", re: /\/workspace\/aiti-demos\/capture\/runs\//g },
  { name: "vault token", re: /rsec_[0-9a-f]{8}\b/gi },
  { name: "api key", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { name: "bearer token", re: /Bearer\s+[A-Za-z0-9._-]{20,}/g },
  // 127.0.0.1 is the normal loopback address in extension config examples; allow it.
  { name: "private ip", re: /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b|\b192\.168\.\d{1,3}\.\d{1,3}\b|\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/g },
];

function filesUnder(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) filesUnder(p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

const hits = [];
function scan(file, text) {
  for (const { name, re } of patterns) {
    re.lastIndex = 0;
    const matches = text.match(re);
    if (matches) hits.push({ file: file.slice(demoDir.length + 1), kind: name, count: matches.length, sample: matches[0].slice(0, 80) });
  }
  // A secret-shaped apiKey value must be scrubbed, not merely renamed.
  const keys = text.match(/"apiKey"\s*:\s*"(?!\*\*\*)[^"]{8,}"/g);
  if (keys) hits.push({ file: file.slice(demoDir.length + 1), kind: "unscrubbed apiKey", count: keys.length, sample: keys[0].slice(0, 80) });
}

for (const file of filesUnder(modelDir)) {
  if (extname(file) !== ".json") continue;
  scan(file, readFileSync(file, "utf8"));
}
for (const file of filesUnder(assetsDir)) {
  if (!/\.(js|mjs|json|txt|md|css|svg|html)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  if (text.length > 4_000_000) continue;
  // Compiled extension code may contain documented example addresses; only
  // fixtures (mock/model) are treated as leaked data for private IPs.
  const before = hits.length;
  scan(file, text);
  for (let i = hits.length - 1; i >= before; i -= 1) {
    if (hits[i].kind === "private ip") hits.splice(i, 1);
  }
}

if (hits.length) {
  console.error(`[audit] ${hits.length} suspicious hit(s):`);
  for (const hit of hits.slice(0, 40)) console.error(`  ${hit.file}: ${hit.kind} x${hit.count} (${hit.sample})`);
  process.exit(1);
}
console.log("[audit] fixtures clean: no real paths, tokens or private IPs");
