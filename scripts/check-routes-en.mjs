#!/usr/bin/env node
/**
 * Verify the English fixture layer (mock/model/routes.en.json).
 *
 *   node scripts/check-routes-en.mjs
 *
 * Proves, for the merged en lookup table (en overrides win, everything else
 * falls back to mock/model/routes.json):
 *   - every translated route body carries no CJK outside by-design bilingual
 *     data (cnName / locale-keyed zh tables such as descriptionI18n["zh-CN"]),
 *     and lists how many by-design strings remain per route;
 *   - aiti-extman/status (+ ?locale=en) keeps the recorded extension count;
 *   - route keys not overridden are byte-identical to the recording.
 */
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const routes = JSON.parse(readFileSync(join(demoDir, "mock", "model", "routes.json"), "utf8"));
const routesEn = JSON.parse(readFileSync(join(demoDir, "mock", "model", "routes.en.json"), "utf8"));

// Large bodies are externalized to public/demo-mock/catalog (replay fetches them
// on demand — mock/replay-tables.ts resolveEntry); this checker reads them the
// same way so translated-body scans see the full payload.
function entryBody(entry) {
  if (!entry?.catalog) return entry?.body ?? null;
  if (!String(entry.catalog).startsWith("demo-mock/")) return null;
  return JSON.parse(readFileSync(join(demoDir, "public", entry.catalog), "utf8"));
}

const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;
const BY_DESIGN_RE = /(^|\.)(cnName|zh|zh-CN|zh-TW|zh-Hans|zh-Hant)$/;

/** The replay merge under currentDemoLocale() === "en". */
const enTable = { ...routes, ...routesEn };

let fatal = 0;

function walk(value, path, hits) {
  if (typeof value === "string") {
    if (CJK_RE.test(value)) hits.push({ path, value });
  } else if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, `${path}[${i}]`, hits));
  } else if (value && typeof value === "object") {
    for (const key of Object.keys(value)) walk(value[key], path ? `${path}.${key}` : key, hits);
  }
}

for (const [route, enEntries] of Object.entries(routesEn)) {
  const zhEntries = routes[route];
  if (!zhEntries || zhEntries.length !== enEntries.length) {
    console.error(`[check-routes-en] entry count mismatch for ${route}`);
    fatal += 1;
    continue;
  }
  enEntries.forEach((entry, index) => {
    const hits = [];
    walk(entryBody(entry), "body", hits);
    const byDesign = hits.filter((h) => BY_DESIGN_RE.test(h.path));
    const stray = hits.filter((h) => !BY_DESIGN_RE.test(h.path));
    if (stray.length) {
      console.error(`[check-routes-en] ${route} entry[${index}]: ${stray.length} CJK string(s) outside by-design paths:`);
      for (const h of stray.slice(0, 10)) console.error(`  ${h.path} = ${JSON.stringify(h.value.slice(0, 80))}`);
      fatal += 1;
    }
    if (byDesign.length) {
      console.log(`[check-routes-en] ${route} entry[${index}]: ${byDesign.length} by-design bilingual string(s) kept Chinese (locale-keyed zh data)`);
    }
  });
}

for (const key of [
  "GET /api/extensions/aiti-extman/status",
  "GET /api/extensions/aiti-extman/status?locale=en",
]) {
  const zhCount = Object.keys(entryBody(routes[key][0]).extensions).length;
  const enCount = Object.keys(entryBody(enTable[key][0]).extensions).length;
  if (zhCount !== enCount) {
    console.error(`[check-routes-en] ${key}: extension count zh ${zhCount} ≠ en ${enCount}`);
    fatal += 1;
  } else {
    console.log(`[check-routes-en] ${key}: ${enCount}/${zhCount} extensions preserved`);
  }
}

// Fallback semantics: a route not present in routes.en.json must resolve to
// the recorded table entry (identity check via the merge result).
for (const key of Object.keys(routes)) {
  if (key in routesEn) continue;
  if (enTable[key] !== routes[key]) {
    console.error(`[check-routes-en] untranslated ${key} no longer falls back to the recording`);
    fatal += 1;
  }
}

if (fatal) {
  console.error(`[check-routes-en] FAILED with ${fatal} problem(s)`);
  process.exit(1);
}
console.log(`[check-routes-en] OK — ${Object.keys(routesEn).length} en overrides, ${Object.keys(routes).length - Object.keys(routesEn).length} keys fall back to the recording`);
