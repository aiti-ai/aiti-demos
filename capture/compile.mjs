#!/usr/bin/env node
/**
 * Compile raw capture data into the demo's mock model.
 *
 *   node capture/compile.mjs --run p1-core4
 *
 * - normalizes capture paths to the fictional demo layout
 * - scrubs credentials (apiKey/token/secret/password/rsec_/sk-)
 * - groups responses by method + path (+ query variant)
 * - copies extension assets under mock/assets/
 *
 * Output: mock/model/{routes.json,meta.json,catalog/*.json}
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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
const runIds = (arg("runs") ?? arg("run") ?? "").split(",").map((id) => id.trim()).filter(Boolean);
if (!runIds.length) {
  console.error("usage: node capture/compile.mjs --run <run-id> | --runs a,b");
  process.exit(1);
}
const rawDirs = runIds.map((id) => join(demoDir, "capture", "raw", id));
for (const rawDir of rawDirs) {
  if (!existsSync(join(rawDir, "requests.ndjson"))) {
    console.error(`[compile] no capture at ${rawDir}`);
    process.exit(1);
  }
}
const runDirs = runIds.map((id) => join(demoDir, "capture", "runs", id));

const outDir = join(demoDir, "mock", "model");
const assetsOut = join(demoDir, "mock", "assets");
rmSync(outDir, { recursive: true, force: true });
rmSync(assetsOut, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
mkdirSync(assetsOut, { recursive: true });

const replacements = [];
for (const runDir of runDirs) {
  replacements.push(
    [join(runDir, "project"), "/Users/demo/code/pi-web"],
    [join(runDir, "agent"), "/Users/demo/.pi/agent"],
    [join(runDir, "web-data"), "/Users/demo/.pi/web/data"],
    [runDir, "/Users/demo"],
  );
}
replacements.push(["/Users/demo/code/pi-web", "/Users/demo/code/pi-web"], ["/Users/demo", "/Users/demo"]);
const secretKeys = /^(api_?key|token|secret|password|authorization|cookie|access_?token|refresh_?token)$/i;

function sanitizeText(text) {
  let out = text;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  out = out.replace(/rsec_[0-9a-f]{8}/gi, "rsec_***");
  out = out.replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "sk-***");
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{10,}/g, "Bearer ***");
  out = out.replace(/(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?/g, "private-host");
  return out;
}

function scrub(value, stats) {
  if (typeof value === "string") return sanitizeText(value);
  if (Array.isArray(value)) return value.map((item) => scrub(item, stats));
  if (value && typeof value === "object") {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      const safeKey = sanitizeText(key);
      if (secretKeys.test(key) && item !== null && item !== "") {
        stats.secrets += 1;
        out[safeKey] = "***";
      } else {
        out[safeKey] = scrub(item, stats);
      }
    }
    return out;
  }
  return value;
}

const rows = [];
for (const rawDir of rawDirs) {
  const rawText = readFileSync(join(rawDir, "requests.ndjson"), "utf8").trim();
  if (!rawText) continue;
  for (const line of rawText.split("\n")) {
    const row = JSON.parse(line);
    row.step = sanitizeText(String(row.step ?? ""));
    rows.push(row);
  }
}
const stats = { secrets: 0, bodies: 0, assets: 0, skipped: 0 };
const routes = {};
const catalog = {
  sessions: null,
  extensionManifest: null,
  extensionStatus: null,
  models: null,
  modelsEnabled: null,
  authProviders: null,
  skills: null,
  plugins: null,
  mcp: null,
  tools: null,
  settings: null,
};

function routeKey(row) {
  const query = row.query ? row.query.replace(/^\?/, "") : "";
  return `${row.method ?? "GET"} ${row.url}${query ? `?${query}` : ""}`;
}

function remember(name, row) {
  if (catalog[name] !== null) return;
  if (!row.body) return;
  try {
    catalog[name] = scrub(JSON.parse(row.body), stats);
  } catch {
    catalog[name] = sanitizeText(row.body);
  }
}

for (const row of rows) {
  if (!row.url || !row.method) continue;
  if (row.error || row.skipped) { stats.skipped += 1; continue; }
  if (row.asset) {
    // Raw assets are copied below; keep the route entry for documentation.
    stats.assets += 1;
  }
  let body = row.body ?? null;
  const isJsAsset = typeof body === "string"
    && (row.asset || (row.type ?? "").includes("javascript"))
    && row.url.startsWith("/api/extensions/");
  if (isJsAsset) {
    // Extension bundles/chunks belong in mock/assets (they are served as files),
    // not duplicated inside the route table.
    const safe = row.url.replace(/^\/+/, "").replace(/[?#].*$/, "");
    const target = join(assetsOut, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
    row.asset = { path: safe, bytes: body.length, contentType: row.type };
    body = null;
  }
  if (typeof body === "string" && body.length > 1_000_000) {
    const safe = row.url.replace(/^\/+/, "").replace(/[?#].*$/, "").replace(/[^A-Za-z0-9._/-]/g, "_") + ".txt";
    const target = join(assetsOut, safe);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, body);
    row.asset = { path: safe, bytes: body.length, contentType: row.type };
    body = null;
  }
  if (typeof body === "string") {
    if (body.trim().startsWith("{") || body.trim().startsWith("[")) {
      try { body = scrub(JSON.parse(body), stats); } catch { body = sanitizeText(body); }
    } else {
      body = sanitizeText(body);
    }
  }
  if (row.requestBody) {
    try { row.requestBody = scrub(JSON.parse(row.requestBody), stats); }
    catch { row.requestBody = sanitizeText(row.requestBody); }
  }
  const key = routeKey(row);
  const catalogRef = row.url === "/api/extensions/manifest"
    ? "catalog/extensionManifest.json"
    : row.url === "/api/extensions/status"
      ? "catalog/extensionStatus.json"
      : null;
  if (catalogRef) body = null;
  (routes[key] ??= []).push({
    step: row.step,
    status: row.status,
    type: row.type,
    asset: row.asset ?? null,
    requestBody: row.requestBody ?? null,
    ...(catalogRef ? { catalog: catalogRef } : {}),
    body,
  });
  stats.bodies += 1;
  remember("sessions", row.url === "/api/sessions" ? row : { body: null });
  if (row.url === "/api/extensions/manifest") remember("extensionManifest", row);
  if (row.url === "/api/extensions/status") remember("extensionStatus", row);
  if (row.url === "/api/models") remember("models", row);
  if (row.url === "/api/models/enabled") remember("modelsEnabled", row);
  if (row.url === "/api/auth/providers") remember("authProviders", row);
  if (row.url === "/api/skills") remember("skills", row);
  if (row.url === "/api/plugins") remember("plugins", row);
  if (row.url === "/api/mcp") remember("mcp", row);
  if (row.url === "/api/tools/settings") remember("tools", row);
}

// Copy captured extension assets from every run (auditable copy; the runtime
// full tier comes from aiti-ai/extensions/*/dist).
for (const rawDir of rawDirs) {
  const rawAssets = join(rawDir, "assets");
  if (existsSync(rawAssets)) cpSync(rawAssets, assetsOut, { recursive: true });
}

const meta = {
  runId: runIds.join(","),
  runs: runIds,
  compiledAt: new Date().toISOString(),
  sourceCommit: (() => {
    try { return JSON.parse(readFileSync(join(rawDirs[0], "meta.json"), "utf8")).sourceCommit; }
    catch { return "unknown"; }
  })(),
  counts: {
    requests: rows.length,
    routes: Object.keys(routes).length,
    bodies: stats.bodies,
    assets: stats.assets,
    secretsRedacted: stats.secrets,
    skipped: stats.skipped,
  },
  endpoints: Object.keys(routes).sort(),
};
// Drop byte-identical repeats and cap sequences; a route table only needs a
// few variants for the static demo.
for (const [key, list] of Object.entries(routes)) {
  const seen = new Set();
  routes[key] = list.filter((entry) => {
    const fingerprint = String(JSON.stringify(entry.body ?? entry.asset ?? entry.catalog) ?? "").slice(0, 2000);
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  }).slice(0, 5);
}
writeFileSync(join(outDir, "routes.json"), JSON.stringify(routes) + "\n");
writeFileSync(join(outDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
mkdirSync(join(outDir, "catalog"), { recursive: true });
for (const [name, value] of Object.entries(catalog)) {
  if (value === null) continue;
  writeFileSync(join(outDir, "catalog", `${name}.json`), JSON.stringify(value, null, 2) + "\n");
}

console.log(`[compile] ${meta.counts.requests} requests -> ${meta.counts.routes} route(s), ${meta.counts.assets} asset(s), ${meta.counts.secretsRedacted} secret(s) redacted`);
console.log(`[compile] model -> ${outDir}`);
