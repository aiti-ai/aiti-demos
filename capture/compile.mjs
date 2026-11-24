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
import { createHash } from "node:crypto";
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
// Static files for externalized large bodies (see the externalization step below).
const demoCatalogDir = join(demoDir, "public", "demo-mock", "catalog");
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
// Derive the operator's home from the environment instead of hardcoding a
// local path, so this scrubber works on any machine and carries no personal
// paths in the source.
const operatorHome = String(process.env.HOME ?? process.env.USERPROFILE ?? "").replace(/\/+$/, "");
if (operatorHome) {
  replacements.push(
    [`${operatorHome}/workspace/aiti-ai`, "/Users/demo/code/pi-web"],
    [operatorHome, "/Users/demo"],
  );
}
const secretKeys = /^(api_?key|token|secret|password|authorization|cookie|access_?token|refresh_?token)$/i;

function sanitizeText(text) {
  let out = text;
  for (const [from, to] of replacements) out = out.split(from).join(to);
  out = out.replace(/rsec_[0-9a-f]{8}/gi, "rsec_***");
  out = out.replace(/\bsk-[A-Za-z0-9_-]{20,}\b/g, "sk-***");
  out = out.replace(/Bearer\s+[A-Za-z0-9._-]{10,}/g, "Bearer ***");
  out = out.replace(/(?:10|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}(?:\.\d{1,3})?/g, "private-host");
  // Masked key fragments (prefix***suffix) still leak first/last chars — flatten them.
  out = out.replace(/([A-Za-z]{2,6})\*{2,}([A-Za-z0-9]{2,8})/g, "$1***demo");
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
const stats = { secrets: 0, bodies: 0, assets: 0, skipped: 0, externalized: 0 };
rmSync(join(demoDir, "public", "demo-mock"), { recursive: true, force: true });
mkdirSync(demoCatalogDir, { recursive: true });
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

const PCT = [
  ...(operatorHome
    ? [
      [encodeURIComponent(operatorHome), "/Users/demo"],
      [encodeURIComponent(`${operatorHome}/workspace/aiti-ai`), "/Users/demo/code/pi-web"],
    ]
    : []),
];

/** Replace operator-config-shaped recorded bodies with synthetic demo data. */
function syntheticBody(url) {
  const u = url.split("?")[0];
  if (u === "/api/extensions/aiti-model-wizard/status") {
    return { ok: true, file: "/Users/demo/.pi/agent/models.json", providers: [{
      provider: "demo", combo: false, enabled: true, api: "openai-completions",
      baseUrl: "https://llm.example.invalid/v1", apiKeyMasked: "sk-***demo", hasKey: true,
      modelCount: 2, models: [{ id: "demo-large", enabled: true }, { id: "demo-small", enabled: true }],
      keys: [], keyCount: 0,
    }] };
  }
  if (u === "/api/extensions/aiti-model-check/status") {
    return { ok: true, state: { updatedAt: 0, models: {} }, models: [{
      provider: "demo", model: "Demo Large", modelId: "demo-large", api: "openai-completions",
      baseUrl: "https://llm.example.invalid/v1", reasoning: true, source: "pi",
    }], modelsError: null, runtime: "demo", piError: null,
      summary: { total: 1, ok: 1, limited: 0, error: 0, unknown: 0 }, recover: [] };
  }
  if (u === "/api/extensions/aiti-model-check/balance") {
    return { ok: true, refreshed: true, balances: [{
      provider: "demo", label: "Demo Gateway", kind: "balance", ok: true, unsupported: false,
      exhausted: false, checkedAt: 0, latencyMs: 12, text: "Balance 66.66 CNY (demo)", details: null,
    }] };
  }
  if (u === "/api/extensions/aiti-ai-usage/facets") {
    return { agents: ["pi"], providers: ["demo"], models: ["Demo Large", "Demo Small"],
      keys: [], workspaces: ["/Users/demo/code/pi-web"], days: ["2026-11-23"] };
  }
  if (u.startsWith("/api/extensions/aiti-ai-usage/overview")) {
    const series = ["2026-11-20", "2026-11-21", "2026-11-22", "2026-11-23"].map((bucket) => (
      { bucket, provider: "demo", tokens: 120000, cost: 0.8 }));
    return { label: "30d", totals: { msgs: 96, tokens: 480000, cost: 3.2 },
      keyTotals: { reqs: 96, err429: 0 }, series,
      rows: [], byModel: [{ model: "Demo Large", provider: "demo", tokens: 480000, cost: 3.2 }] };
  }
  if (u === "/api/extensions/aiti-agent-manager/agents") {
    return { agents: [{ agent: "acp", label: { zh: "ACP 家族", en: "ACP family" }, extId: "aiti-acp-agent",
      modes: ["tui"], installed: true, authState: "unknown", flowState: "idle", authSource: "none",
      dependencyHint: { zh: "各 ACP CLI 随用随装", en: "ACP CLIs connect when installed" },
      accounts: [], hasContent: false }] };
  }
  if (u === "/api/session-backends") {
    return { providers: [], sessionListVersion: 1 };
  }
  if (u === "/api/extensions/aiti-models-import/scan") {
    return { ok: true, scanning: false, total: 0, providers: [], baseline: false, toast: null };
  }
  return null;
}

function routeKey(row) {
  const url0 = row.url;
  let query = row.query ? row.query.replace(/^\?/, "") : "";
  let url = url0;
  // Recorded keys may percent-encode operator paths (?project=%2Fhome%2F...) —
  // decode, sanitize, re-encode so no real path survives in any form.
  if (/%[0-9A-Fa-f]{2}/.test(url + query)) {
    try {
      const dec = sanitizeText(decodeURIComponent(`${url0}${row.query ?? ""}`));
      const qIdx = dec.indexOf("?");
      url = qIdx >= 0 ? dec.slice(0, qIdx) : dec;
      query = qIdx >= 0 ? dec.slice(qIdx + 1) : "";
    } catch { /* keep raw */ }
  }
  return `${row.method ?? "GET"} ${url}${query ? `?${query}` : ""}`;
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
  // Operator-config endpoints: never publish the recorded body.
  const synthetic = syntheticBody(row.url);
  if (synthetic) body = synthetic;
  let catalogRef = row.url === "/api/extensions/manifest"
    ? "catalog/extensionManifest.json"
    : row.url === "/api/extensions/status"
      ? "catalog/extensionStatus.json"
      : null;
  if (catalogRef) body = null;
  // [first-load chunk governance] Large bodies move out of routes.json into static
  // files under public/demo-mock/catalog (served by the static host, fetched by the
  // replay layer on first hit — see mock/replay-tables.ts resolveEntry). The route
  // table ships as a small index, so the boot-time chunk stays tiny: the 13 >8KB
  // entries held ~1MB of the ~1.1MB inline total. Manifest/status keep their legacy
  // mock/model/catalog refs above (build inputs; replay skips them).
  if (!catalogRef && body !== null && typeof body === "object") {
    const serialized = JSON.stringify(body);
    if (serialized.length > 8192) {
      const safe = (row.url.replace(/^\/+/, "").replace(/\?[^"]*$/, "").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80)) || "root";
      const name = `${safe}-${createHash("sha1").update(serialized).digest("hex").slice(0, 10)}.json`;
      writeFileSync(join(demoCatalogDir, name), serialized);
      catalogRef = `demo-mock/catalog/${name}`;
      body = null;
      stats.externalized += 1;
    }
  }
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

console.log(`[compile] ${meta.counts.requests} requests -> ${meta.counts.routes} route(s), ${meta.counts.assets} asset(s), ${meta.counts.secretsRedacted} secret(s) redacted, ${stats.externalized} large body(s) externalized`);
console.log(`[compile] model -> ${outDir}`);
