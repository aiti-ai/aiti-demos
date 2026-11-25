/**
 * Drop stale build generations from a static extension tier.
 *
 * Chunked extensions emit `chunk-<hash>.mjs` / `<name>-<hash>.mjs` files whose
 * names change on every build. A tier assembled from a deployed tree (rather
 * than a fresh build or an npm tarball) therefore carries every past
 * generation: aiti-word-superdoc accumulated 10 generations of its vendor chunk
 * (90MB of dead weight for a 26MB bundle). Derivative consequences: uploads to
 * hosts with a per-file cap fail, and the oversized-first strategy of
 * scripts/prune-oversize-extensions.mjs drops a healthy extension because of a
 * file nobody ever requests.
 *
 * Rule: inside a `dist/` directory of an extension, a file named
 * `<extId>-…-<hash>.<ext>` that has a sibling generation (same stem, different
 * hash) and is **not reachable** from the entry/asset files of that directory is
 * stale and gets deleted. Reachability follows the same relative-import edges
 * the browser follows (`from "./x.mjs"`, `import("./x.mjs")`, `new URL("./x",
 * import.meta.url)`, plain quoted file names).
 *
 * Safety: only files under `dist/` (not `dist/assets/…`) and only names owned by
 * the extension itself are candidates — runtime-resolved assets (Monaco workers,
 * mermaid bundles, icons) are never touched.
 */
import { existsSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { join, posix } from "node:path";

/** `…-<8 char hash>.mjs` — hex (current) or the older base64-ish charset. */
const HASHED_FILE = /^(?<stem>.+?)-(?<hash>[0-9a-f]{8}|[A-Za-z0-9_-]{8})\.(?<ext>mjs|js|css)$/;
/** Quoted strings that look like file references (imports, workers, styles). */
const QUOTED_PATH = /["'(]([^"'()\s]+\.(?:mjs|js|css))["')]/g;
const TEXT_FILE = /\.(mjs|js|css|json|html)$/;

/** Directories named `dist` directly under an extension (not their children). */
function distDirs(extDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const p = join(dir, entry.name);
      if (entry.name === "dist") out.push(p);
      else walk(p);
    }
  };
  walk(extDir);
  return out;
}

/** All files under `dir` keyed by relative posix path. */
function listFiles(dir, rel = "", out = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = rel ? `${rel}/${entry.name}` : entry.name;
    const p = join(dir, entry.name);
    if (entry.isDirectory()) listFiles(p, next, out);
    else if (entry.isFile()) out.set(next, statSync(p).size);
  }
  return out;
}

/** Resolve a reference from `fromRel` to a known file path, or null. */
function resolveRef(ref, fromRel, known) {
  const clean = ref.split("?")[0].split("#")[0];
  if (clean.startsWith("./") || clean.startsWith("../")) {
    const next = posix.normalize(posix.join(posix.dirname(fromRel), clean));
    return known.has(next) ? next : null;
  }
  // Bare file name (a bundle may reference a sibling by name only).
  if (!clean.includes("/") && known.has(clean)) return clean;
  const base = posix.basename(clean);
  return known.has(base) ? base : null;
}

/**
 * Prune one extension's stale generations.
 * @returns {{ removed: string[], bytes: number }}
 */
function pruneExtension(extId, extDir, { dryRun, log, protect }) {
  const removed = [];
  let bytes = 0;
  for (const dir of distDirs(extDir)) {
    const rel = dir.slice(extDir.length + 1);
    const files = listFiles(dir);
    if (files.size === 0) continue;

    // Group same-stem generations (only files the extension itself names).
    const families = new Map();
    for (const name of files.keys()) {
      const base = posix.basename(name);
      if (!base.startsWith(`${extId}-`)) continue;
      const m = HASHED_FILE.exec(base);
      if (!m) continue;
      const key = `${posix.dirname(name)}|${m.groups.stem}|${m.groups.ext}`;
      if (!families.has(key)) families.set(key, []);
      families.get(key).push(name);
    }
    const candidates = new Set();
    for (const members of families.values()) {
      if (members.length < 2) continue;
      for (const name of members) {
        // The manifest may point straight at a hashed entry file — never touch it.
        if (!protect.has(join(dir, name))) candidates.add(name);
      }
    }
    if (candidates.size === 0) continue;

    // Reachability from every non-candidate file (entry bundles, css, workers…).
    const known = files;
    const queue = [...known.keys()].filter((name) => !candidates.has(name));
    const reachable = new Set();
    while (queue.length > 0) {
      const name = queue.pop();
      if (reachable.has(name)) continue;
      reachable.add(name);
      if (!TEXT_FILE.test(name)) continue;
      let text;
      try { text = readFileSync(join(dir, name), "utf8"); } catch { continue; }
      for (const match of text.matchAll(QUOTED_PATH)) {
        const next = resolveRef(match[1], name, known);
        if (next && !reachable.has(next)) queue.push(next);
      }
    }

    for (const name of candidates) {
      if (reachable.has(name)) continue;
      const abs = join(dir, name);
      removed.push(`${rel}/${name}`);
      bytes += files.get(name) ?? 0;
      if (!dryRun) rmSync(abs, { force: true });
    }
  }
  if (removed.length > 0) {
    log(`[stale] ${extId}: ${dryRun ? "would drop" : "dropped"} ${removed.length} file(s), ${(bytes / 1048576).toFixed(1)}MB`);
  }
  return { removed, bytes };
}

/**
 * Prune stale generations for every extension in a static tier.
 * @param {string} root directory holding `<extId>/` folders (e.g. public/api/extensions)
 * @param {{ dryRun?: boolean, log?: (m: string) => void, protect?: string[] }} [opts]
 *   protect: absolute paths that must survive (e.g. the entry files the manifest points at)
 */
export function pruneStaleGenerations(root, { dryRun = false, log = console.log, protect = [] } = {}) {
  const summary = { files: 0, bytes: 0, extensions: 0 };
  if (!existsSync(root)) return summary;
  const protectedPaths = new Set(protect);
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const extDir = join(root, entry.name);
    const st = pruneExtension(entry.name, extDir, { dryRun, log, protect: protectedPaths });
    if (st.removed.length > 0) {
      summary.files += st.removed.length;
      summary.bytes += st.bytes;
      summary.extensions += 1;
    }
  }
  return summary;
}
