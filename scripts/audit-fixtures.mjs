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

const FAKE_MASKED = /sk-\*{2,}demo/; // canonical scrubbed form

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
  if (keys) {
    // Known benign placeholder values (demo fixtures); everything else fails.
    const benign = ["sk-gateway-demo", "DEMO-NO-CREDENTIAL", "CLAUDE_GATEWAY_KEY"];
    const real = keys.filter((k) => !benign.some((b) => k.includes(b)));
    if (real.length) hits.push({ file: file.slice(demoDir.length + 1), kind: "unscrubbed apiKey", count: real.length });
  }
  // Masked key fragments leaking prefix/suffix (e.g. 3 letters + *** + 4 chars),
  // except the canonical scrubbed form produced by capture/compile.mjs.
  const masked = text.match(/"[A-Za-z]*Masked"\s*:\s*"[^"]*\*{2,}[A-Za-z0-9]{2,8}"/g) ?? [];
  const realMasked = masked.filter((m) => !FAKE_MASKED.test(m));
  if (realMasked.length) hits.push({ file: file.slice(demoDir.length + 1), kind: "masked key fragment", count: realMasked.length, sample: realMasked[0].slice(0, 80) });
  // Percent-encoded real paths survive plain-text path checks.
  const pct = text.match(/%2Fhome%2Fwind/gi);
  if (pct) hits.push({ file: file.slice(demoDir.length + 1), kind: "encoded home path", count: pct.length, sample: "%2Fhome%2Fwind" });
}

// Whole mock tree (routes + catalog + captured fixtures + session content).
// mock/assets is skipped here and scanned below with the documented-example
// exemption (compiled extension code may quote example addresses).
for (const file of filesUnder(join(demoDir, "mock"))) {
  if (file.startsWith(join(demoDir, "mock", "assets"))) continue;
  if (!/\.(json|ts|tsx|mjs)$/i.test(extname(file))) continue;
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
