#!/usr/bin/env node
/**
 * Start an isolated pi-web dev server for recording.
 *
 *   node capture/server.mjs --seed <seed-json> [--port 30144]
 *
 * The server runs from the aiti-ai checkout with its own distDir
 * (.next-capture) so it can coexist with the normal dev/prod servers.
 */
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export async function startCaptureServer({ root, seed, port = 30144, logFile }) {
  const nextBin = join(root, "node_modules", "next", "dist", "bin", "next");
  if (!existsSync(nextBin)) throw new Error(`next not installed under ${root}`);
  const distDir = join(root, ".next-capture");
  rmSync(distDir, { recursive: true, force: true });
  const bundledEmpty = join(seed.runDir, "bundled-empty");
  mkdirSync(bundledEmpty, { recursive: true });

  // Curated extension tier for recording: symlink the deployed set but drop the
  // three demo packages so their panels/noise never enter the capture.
  const exclude = new Set(
    (process.env.AITI_CAPTURE_EXCLUDE ?? "demo,demo-lazy,sm-demo-source")
      .split(",").map((s) => s.trim()).filter(Boolean),
  );
  const sourceExtensions = process.env.AITI_CAPTURE_EXTENSIONS_DIR
    ?? join(process.env.HOME ?? "", ".pi", "web", "extensions");
  const curatedExtensions = join(seed.runDir, "extensions");
  rmSync(curatedExtensions, { recursive: true, force: true });
  mkdirSync(curatedExtensions, { recursive: true });
  if (existsSync(sourceExtensions)) {
    for (const name of readdirSync(sourceExtensions)) {
      if (exclude.has(name)) continue;
      symlinkSync(join(sourceExtensions, name), join(curatedExtensions, name), "dir");
    }
  }
  if (exclude.size) console.log(`[capture] excluded extensions: ${[...exclude].join(", ")}`);

  const env = {
    ...process.env,
    PI_CODING_AGENT_DIR: seed.agentDir,
    PI_WEB_DATA_DIR: seed.webDataDir,
    PI_WEB_EXTENSIONS_DIR: curatedExtensions,
    PI_WEB_BUNDLED_EXTENSIONS_DIR: bundledEmpty,
    PI_WEB_PASSWORD: "",
    PI_WEB_DEV_DIST: "1",
    PI_WEB_DIST_DIR: ".next-capture",
    PI_WEB_PKG_DIR: root,
    NEXT_TELEMETRY_DISABLED: "1",
  };
  delete env.PI_WEB_BASE_PATH;
  delete env.PI_WEB_BUILD_BASEPATH;
  delete env.PI_WEB_EXTRA_EXTENSIONS_DIRS;

  const log = logFile ? (await import("node:fs")).createWriteStream(logFile) : null;
  const proc = spawn(process.execPath, [nextBin, "dev", "-H", "127.0.0.1", "-p", String(port)], {
    cwd: root,
    env,
    stdio: ["ignore", "pipe", "pipe"],
  });
  proc.stdout?.on("data", (chunk) => log?.write(chunk));
  proc.stderr?.on("data", (chunk) => log?.write(chunk));

  const base = `http://127.0.0.1:${port}`;
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    if (proc.exitCode !== null) throw new Error(`capture server exited (${proc.exitCode}); see ${logFile ?? "server log"}`);
    const response = await fetch(`${base}/api/sessions`, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
    if (response?.ok) {
      return {
        base,
        proc,
        stop: () => {
          try { proc.kill("SIGTERM"); } catch { /* already gone */ }
          log?.end();
        },
      };
    }
    await delay(500);
  }
  proc.kill("SIGTERM");
  throw new Error(`capture server readiness timed out; see ${logFile ?? "server log"}`);
}
