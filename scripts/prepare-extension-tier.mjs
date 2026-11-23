#!/usr/bin/env node
/**
 * Extract the packaged full extension tier (assets/extension-tier.tar.gz) into
 * public/api/extensions. The pack is produced from a real recorded instance
 * (see docs plan §6); prebuild/predev call this before the manifest builder.
 */
import { execFileSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pack = join(demoDir, "assets", "extension-tier.tar.gz");
const publicRoot = join(demoDir, "public");
const target = join(publicRoot, "api", "extensions");
const force = process.argv.includes("--force");

if (!existsSync(pack)) {
  console.error(`[ext] missing ${pack}`);
  process.exit(1);
}
if (existsSync(target) && !force) {
  console.log("[ext] full extension tier already extracted");
  process.exit(0);
}
rmSync(target, { recursive: true, force: true });
execFileSync("tar", ["-xzf", pack, "-C", publicRoot], { stdio: "inherit" });
console.log("[ext] extracted full extension tier -> public/api/extensions");
