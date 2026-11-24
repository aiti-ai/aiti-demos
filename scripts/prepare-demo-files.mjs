#!/usr/bin/env node
// Snapshot the Pi Web repository into public/demo-files so the demo's file
// explorer and viewer can browse real project files without a backend.
//
// Every git-tracked file outside demo/ is copied under a hashed name (GitHub
// Pages drops dot-directories such as .github from the upload), and
// manifest.json maps each repository path to its asset.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// aiti-demos is standalone: snapshot the aiti-ai source checkout (AITI_SRC or
// the sibling directory by default), not this demo repo.
const repoDir = resolve(process.env.AITI_SRC ?? join(demoDir, "..", "aiti-ai"));
const outDir = join(demoDir, "public", "demo-files");
const assetDir = join(outDir, "f");
const MAX_FILE_BYTES = 4 * 1024 * 1024;
// Keep extensions only where the browser needs the right content type to
// render the file directly (<img>, <audio>, <iframe>); text is served as .txt.
const MEDIA_EXT = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".ico", ".bmp", ".avif", ".pdf", ".mp3", ".wav", ".ogg", ".m4a", ".mp4", ".webm", ".mov", ".docx"]);

/** Text scrub for published snapshot assets (see the plan's privacy section). */
function scrubText(text) {
  return text
    .replace(/\/home\/[^/\s"'`]+/g, "/Users/demo")
    .replace(/\b192\.168\.\d{1,3}\.\d{1,3}\b/g, "192.0.2.10")
    .replace(/\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, "10.0.0.10")
    .replace(/\.alot\.pw\b/g, ".aiti.pw")
    .replace(/\balot\.pw\b/g, "aiti.pw")
    // Vault-alias-shaped tokens in docs/tests: keep the shape, drop the value.
    .replace(/\brsec_[0-9a-f]{8}\b/g, "rsec_demo00");
}

const tracked = execFileSync("git", ["-C", repoDir, "ls-files", "-z"], { encoding: "utf8" })
  .split("\0")
  .filter((path) => path && !path.startsWith("demo/") && !path.startsWith("node_modules/"));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(assetDir, { recursive: true });
mkdirSync(join(outDir, "shards"), { recursive: true });

const files = [];
for (const path of tracked.sort()) {
  let size;
  try {
    size = statSync(join(repoDir, path)).size;
  } catch {
    continue; // deleted in the working tree
  }
  if (size > MAX_FILE_BYTES) continue;
  const ext = extname(path);
  const isMedia = MEDIA_EXT.has(ext.toLowerCase());
  const asset = createHash("sha1").update(path).digest("hex").slice(0, 16) + (isMedia ? ext.toLowerCase() : ".txt");
  const target = join(assetDir, asset);
  if (isMedia) {
    copyFileSync(join(repoDir, path), target);
  } else {
    // Text assets are published on the demo host: scrub operator-only values
    // (private home paths, internal domains, LAN addresses) while copying.
    writeFileSync(target, scrubText(readFileSync(join(repoDir, path), "utf8")));
  }
  files.push({ path, size, asset });
}

writeFileSync(join(outDir, "manifest.json"), JSON.stringify({
  v: 1,
  // [first-load governance B3] shard index: one shard per top-level directory
  // (+ "root" for top-level files). The file explorer only fetches the shards
  // for the directories it lists; the full manifest warm-up happens after the
  // boot's idle window (mock/files.ts primeAssetLookup).
  shards: Object.entries(files.reduce((acc, file) => {
    const top = shardId(file.path);
    acc[top] = (acc[top] ?? 0) + 1;
    return acc;
  }, {})).map(([id, count]) => ({ id, count })),
}));
const shardGroups = new Map();
for (const file of files) {
  const top = shardId(file.path);
  (shardGroups.get(top) ?? shardGroups.set(top, []).get(top)).push(file);
}
for (const [id, group] of shardGroups) {
  writeFileSync(join(outDir, "shards", `${id}.json`), JSON.stringify({ files: group }));
}

function shardId(path) {
  const slash = path.indexOf("/");
  if (slash <= 0) return "root";
  return path.slice(0, slash);
}
console.log(`[demo] copied ${files.length} project files into public/demo-files (${shardGroups.size} shards)`);
