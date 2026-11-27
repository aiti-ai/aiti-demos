#!/usr/bin/env node
/**
 * Refresh the recorded extension catalog's display metadata from the source
 * tree.
 *
 *   node scripts/sync-catalog-meta.mjs [--root ../aiti-ai]
 *
 * The full tier's manifest metadata (mock/model/catalog/extensionManifest.json)
 * is a capture snapshot: name / version / ui (slot declarations + i18n tables),
 * icon, description and feature switches age while the client bundles are
 * rebuilt from the checkout on every `npm run extensions`. Between two capture
 * runs this script pulls those fields from each extension's index.ts +
 * package.json so a metadata-only upstream change (i18n waves, new slots,
 * version bumps) reaches the demo without a full recapture.
 *
 * Preserved from the recording: clientUrl (with its content rev — the boot
 * graph stays byte-identical), source, per-feature enabled/value overrides
 * (the recorded instance's switch states, matched by feature id), and every
 * catalog row that has no counterpart in the source tree (demo-only or
 * retired extensions).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createJiti } from "jiti";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.slice("--root=".length)
  ?? (args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined);
const sourceRoot = resolve(rootArg ?? process.env.AITI_SRC ?? join(demoDir, "..", "aiti-ai"));

if (!existsSync(join(sourceRoot, "extensions"))) {
  console.error(`[meta] aiti-ai extensions not found at ${sourceRoot}`);
  process.exit(1);
}

// Same loader the host and the tier build use, so metadata imports behave
// identically to production (TypeScript + require() interop).
const jiti = createJiti(import.meta.url, { interopDefault: true });

const catalogPath = join(demoDir, "mock", "model", "catalog", "extensionManifest.json");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const recordedById = new Map(catalog.extensions.map((ext) => [ext.id, ext]));
let updated = 0;
const touched = [];

for (const id of recordedById.keys()) {
  const dir = join(sourceRoot, "extensions", id);
  const indexPath = join(dir, "index.ts");
  if (!existsSync(indexPath)) continue;
  let ext;
  try {
    ext = (await jiti.import(pathToFileURL(indexPath).href))?.default;
  } catch (error) {
    console.warn(`[meta] ${id}: import failed (${String(error).slice(0, 120)}) — keeping the recorded row`);
    continue;
  }
  if (!ext?.id) continue;

  let pkg = {};
  try {
    pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
  } catch { /* metadata fallbacks only */ }

  const recorded = recordedById.get(id);
  const next = {
    id,
    name: ext.name ?? id,
    version: pkg.version ?? recorded.version ?? "0.0.0",
    // clientUrl + its content rev stay as recorded: the boot graph (and the
    // browser cache keys built from it) must not shift between captures.
    clientUrl: recorded.clientUrl ?? null,
    ui: deepCopy(ext.ui) ?? null,
    source: recorded.source ?? "user",
    icon: ext.icon ?? null,
    // manifest(): entry declaration wins, package.json is the fallback.
    description: typeof ext.description === "string" && ext.description.trim()
      ? ext.description.trim()
      : typeof pkg.description === "string" ? pkg.description : recorded.description ?? null,
  };
  // Live-manifest pass-through fields, absent when undeclared (same shape as
  // the host's manifest(): category/keywords feed the app-center search).
  if (Array.isArray(ext.category)) next.category = [...ext.category];
  else if (typeof ext.category === "string" && ext.category) next.category = [ext.category];
  if (Array.isArray(ext.keywords) && ext.keywords.length) next.keywords = ext.keywords.filter((k) => typeof k === "string" && k.trim());
  if (Array.isArray(ext.dependsOn)?.length) next.dependsOn = [...ext.dependsOn];
  if (Array.isArray(ext.optionalDependsOn)?.length) next.optionalDependsOn = [...ext.optionalDependsOn];
  if (Array.isArray(ext.provides)?.length) next.provides = [...ext.provides];
  if (Array.isArray(ext.takeover)?.length) next.takeover = [...ext.takeover];
  // Feature switches: normalize from the declaration (enabled = default !==
  // false), then keep the recorded instance's overrides for ids that still
  // exist. New toggles appear at their source default.
  next.features = normalizeFeatures(ext.features, recorded.features);

  if (JSON.stringify(next) !== JSON.stringify(recorded)) {
    updated += 1;
    touched.push(`${id} ${recorded.version ?? "?"} → ${next.version}`);
  }
  catalog.extensions[catalog.extensions.indexOf(recorded)] = scrubPrivateIps(next);
}

mkdirSync(dirname(catalogPath), { recursive: true });
writeFileSync(catalogPath, JSON.stringify(catalog, null, 2) + "\n");
console.log(`[meta] catalog refreshed from ${sourceRoot}: ${updated} row(s) changed`);
for (const line of touched) console.log(`[meta]   ${line}`);

function deepCopy(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

/**
 * Source metadata sometimes carries RFC1918 literals as documentation examples
 * (e.g. aiti-ui-env's VNC placeholder `192.168.1.20:5900`). The demo fixture
 * audit refuses private-range IPs, and the demo is public — rewrite them to
 * the RFC5737 TEST-NET-1 range, which keeps the placeholder meaningful without
 * shipping a LAN address.
 */
function scrubPrivateIps(entry) {
  const raw = JSON.stringify(entry);
  const scrubbed = raw
    .replace(/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, (m) => m.replace(/^192\.168\./, "192.0.2."))
    .replace(/\b172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}\b/g, (m) => m.replace(/^172\.[^.]*\./, "192.0.2."))
    .replace(/\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, (m) => m.replace(/^10\./, "192.0.2."));
  return JSON.parse(scrubbed);
}

function normalizeFeatures(declared, recordedFeatures) {
  if (!Array.isArray(declared) || declared.length === 0) return null;
  const recordedState = new Map((recordedFeatures ?? []).map((f) => [f.id, f]));
  return declared.map((feature) => {
    const prior = recordedState.get(feature.id);
    const base = {
      id: feature.id,
      type: feature.type ?? "boolean",
      label: feature.label ?? feature.id,
      ...(feature.description ? { description: feature.description } : {}),
      ...(feature.placeholder ? { placeholder: feature.placeholder } : {}),
      ...(feature.category ? { category: feature.category } : {}),
      // Recorded switch states win over source defaults; new ids start at default.
      enabled: prior ? prior.enabled : feature.default !== false,
    };
    if (feature.type === "string" || feature.type === "textlist") {
      base.value = String(prior?.value ?? feature.value ?? "");
    }
    return base;
  });
}
