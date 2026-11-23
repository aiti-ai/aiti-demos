import type { NextConfig } from "next";
import { existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const configDir = dirname(fileURLToPath(import.meta.url));

// generated/meta.json is written by scripts/sync-frontend.mjs (predev/prebuild).
// Fall back to the local package so a bare config load never crashes.
type SourceMeta = { sourceVersion?: string; piVersion?: string };
let meta: SourceMeta = {};
const metaPath = join(configDir, "generated", "meta.json");
if (existsSync(metaPath)) {
  meta = JSON.parse(readFileSync(metaPath, "utf8")) as SourceMeta;
} else {
  const pkg = JSON.parse(readFileSync(join(configDir, "package.json"), "utf8")) as { version: string };
  meta = { sourceVersion: pkg.version, piVersion: "unknown" };
}
const appVersion = meta.sourceVersion ?? "0.0.0";
const piVersion = meta.piVersion ?? "unknown";

// demo.aiti.pw serves at the root. A project-site deployment (GitHub Pages)
// can still pass a prefix, but the canonical target has no base path.
const basePath = (process.env.DEMO_BASE_PATH ?? process.env.PAGES_BASE_PATH ?? "").replace(/\/+$/, "");

const nextConfig: NextConfig = {
  output: "export",
  basePath,
  trailingSlash: true,
  outputFileTracingRoot: configDir,
  turbopack: { root: configDir },
  images: { unoptimized: true },
  // Next writes AGENTS.md / CLAUDE.md into the project on `next dev` otherwise.
  agentRules: false,
  // `npm run dev` binds 127.0.0.1; Next 16 treats other hosts as cross-origin.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_PI_VERSION: piVersion,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
