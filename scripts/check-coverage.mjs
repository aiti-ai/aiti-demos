#!/usr/bin/env node
/**
 * Compare recorded requests with the compiled route table.
 *
 *   node scripts/check-coverage.mjs --run <id> [--strict]
 *
 * Prints captured / missing counts and the most frequent missing endpoints.
 * --strict exits 1 when a non-asset endpoint has no route.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const runId = arg("run");
if (!runId) {
  console.error("usage: node scripts/check-coverage.mjs --run <id> [--strict]");
  process.exit(1);
}
const rawPath = join(demoDir, "capture", "raw", runId, "requests.ndjson");
const routesPath = join(demoDir, "mock", "model", "routes.json");
if (!existsSync(rawPath) || !existsSync(routesPath)) {
  console.error("[coverage] missing raw capture or compiled routes");
  process.exit(1);
}
const rows = readFileSync(rawPath, "utf8").trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
const routes = JSON.parse(readFileSync(routesPath, "utf8"));

const missing = new Map();
let captured = 0;
for (const row of rows) {
  if (!row.url || !row.method) continue;
  if (row.skipped || row.error) continue;
  const query = row.query ? row.query.replace(/^\?/, "") : "";
  const exact = `${row.method} ${row.url}${query ? `?${query}` : ""}`;
  const pathOnly = `${row.method} ${row.url}`;
  if (routes[exact] || routes[pathOnly]) captured += 1;
  else {
    const key = pathOnly;
    missing.set(key, (missing.get(key) ?? 0) + 1);
  }
}
const top = [...missing.entries()].sort((a, b) => b[1] - a[1]);
console.log(`[coverage] ${captured}/${rows.length} recorded request(s) have a route; ${top.length} endpoint(s) missing`);
for (const [key, count] of top.slice(0, 30)) console.log(`  ${count}x ${key}`);
if (args.includes("--strict") && top.length) process.exit(1);
