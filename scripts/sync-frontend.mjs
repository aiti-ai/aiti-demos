#!/usr/bin/env node
/**
 * Sync the aiti-ai frontend into the standalone demo.
 *
 *   node scripts/sync-frontend.mjs [--root ../aiti-ai] [--check]
 *
 * Generated output lives in generated/ (gitignored) and mirrors the host UI:
 * components/, hooks/, lib/, styles/ (the four app CSS files), plus the public
 * assets the UI references (icons, provider-icons.svg).
 *
 * --check verifies generated/ matches the source without writing (CI + drift
 * alarm). Exit code 1 on drift.
 */
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const rootArg = args.find((a) => a.startsWith("--root="))?.slice("--root=".length)
  ?? (args.includes("--root") ? args[args.indexOf("--root") + 1] : undefined);
const sourceRoot = resolve(rootArg ?? process.env.AITI_SRC ?? join(demoDir, "..", "aiti-ai"));
const check = args.includes("--check");

if (!existsSync(join(sourceRoot, "components", "AppShell.tsx"))) {
  console.error(`[sync] source root not found or not aiti-ai: ${sourceRoot}`);
  process.exit(1);
}

const generated = join(demoDir, "generated");
const stylesDir = join(generated, "styles");

/** Copy a directory, skipping tests and build noise. */
function copyTree(from, to, skip = () => false) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const src = join(from, name);
    const dst = join(to, name);
    if (skip(src, name)) continue;
    const st = statSync(src);
    if (st.isDirectory()) copyTree(src, dst, skip);
    else if (st.isFile()) cpSync(src, dst);
  }
}

const skipTest = (_src, name) => /\.(test|spec)\.(mjs|js|ts|tsx)$/.test(name);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (st.isFile()) out.push(p);
  }
  return out;
}

function hashTree(dir) {
  const hash = createHash("sha256");
  for (const file of walk(dir).sort()) {
    hash.update(relative(dir, file));
    hash.update(readFileSync(file));
  }
  return hash.digest("hex");
}

if (check) {
  const metaPath = join(generated, "meta.json");
  if (!existsSync(metaPath)) {
    console.error("[sync] generated/meta.json missing — run npm run sync");
    process.exit(1);
  }
  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const components = hashTree(join(sourceRoot, "components"));
  const hooks = hashTree(join(sourceRoot, "hooks"));
  const lib = hashTree(join(sourceRoot, "lib"));
  const styles = ["globals.css", "settings.css", "sidebar.css", "sidebar-menu.css"].map((f) => {
    const p = join(sourceRoot, "app", f);
    return existsSync(p) ? createHash("sha256").update(readFileSync(p)).digest("hex") : "missing";
  });
  const drift = [];
  if (meta.components !== components) drift.push("components");
  if (meta.hooks !== hooks) drift.push("hooks");
  if (meta.lib !== lib) drift.push("lib");
  if (JSON.stringify(meta.styles) !== JSON.stringify(styles)) drift.push("styles");
  if (meta.sourceVersion !== JSON.parse(readFileSync(join(sourceRoot, "package.json"), "utf8")).version) drift.push("version");
  if (drift.length) {
    console.error(`[sync] generated frontend is stale (${drift.join(", ")}) — run npm run sync`);
    process.exit(1);
  }
  console.log(`[sync] generated frontend is up to date (${meta.sourceVersion})`);
  process.exit(0);
}

rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });

copyTree(join(sourceRoot, "components"), join(generated, "components"), skipTest);
copyTree(join(sourceRoot, "hooks"), join(generated, "hooks"), skipTest);
copyTree(join(sourceRoot, "lib"), join(generated, "lib"), skipTest);

mkdirSync(stylesDir, { recursive: true });
const styleFiles = [];
for (const name of ["globals.css", "settings.css", "sidebar.css", "sidebar-menu.css"]) {
  const src = join(sourceRoot, "app", name);
  if (!existsSync(src)) throw new Error(`missing source style: ${src}`);
  cpSync(src, join(stylesDir, name));
  styleFiles.push(name);
}

// Server-only modules imported as types by client components: replace with
// type-only stubs (the browser never needs their implementation).
const stubs = join(demoDir, "sync", "stubs");
for (const rel of ["lib/subagent-extension.ts", "lib/terminal-manager.ts"]) {
  const stub = join(stubs, rel);
  if (existsSync(stub)) cpSync(stub, join(generated, rel));
}

// Public assets referenced by the UI (served from /icons and /provider-icons.svg).
rmSync(join(demoDir, "public", "icons"), { recursive: true, force: true });
cpSync(join(sourceRoot, "public", "icons"), join(demoDir, "public", "icons"), { recursive: true });
for (const name of ["provider-icons.svg"]) {
  const src = join(sourceRoot, "public", name);
  if (existsSync(src)) cpSync(src, join(demoDir, "public", name));
}

const sourcePackage = JSON.parse(readFileSync(join(sourceRoot, "package.json"), "utf8"));
let sourceCommit = "unknown";
try {
  sourceCommit = execFileSync("git", ["-C", sourceRoot, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();
} catch { /* not a git checkout */ }

const meta = {
  source: sourceRoot,
  sourceVersion: sourcePackage.version,
  sourceCommit,
  piVersion: sourcePackage.dependencies?.["@earendil-works/pi-coding-agent"] ?? "unknown",
  generatedAt: new Date().toISOString(),
  components: hashTree(join(sourceRoot, "components")),
  hooks: hashTree(join(sourceRoot, "hooks")),
  lib: hashTree(join(sourceRoot, "lib")),
  styles: styleFiles.map((f) => createHash("sha256").update(readFileSync(join(sourceRoot, "app", f))).digest("hex")),
};
writeFileSync(join(generated, "meta.json"), JSON.stringify(meta, null, 2) + "\n");
console.log(`[sync] generated frontend from ${sourceRoot} @ ${sourceCommit.slice(0, 12)} (v${meta.sourceVersion})`);
