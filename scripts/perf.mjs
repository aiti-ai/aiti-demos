#!/usr/bin/env node
/**
 * Boot performance check for the static build.
 *
 *   node scripts/perf.mjs                    # measures out/ on an ephemeral server
 *   node scripts/perf.mjs --runs 3           # repeat and report each run
 *   node scripts/perf.mjs --url <url>        # measure a deployed copy instead
 *
 * Metrics: DOMContentLoaded, "ready" (the session list has content), request
 * count, script transfer, and how many separate extension client bundles the
 * boot graph pulled (one batch bundle should cover most of them).
 */
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const runs = Number(arg("runs", "1"));
const urlArg = arg("url");
// --resolve-ip: pin the host to an address (measure the Pages copy from a LAN
// whose DNS points at the operator host).
const resolveIp = arg("resolve-ip");

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".txt": "text/plain", ".woff2": "font/woff2", ".wasm": "application/wasm",
};

/** Serve out/ like a CDN: gzip for text, correct .mjs type (python's http.server gets that wrong). */
function serve(dir) {
  const root = normalize(dir);
  const server = createServer((req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://x");
      let file = normalize(join(root, decodeURIComponent(url.pathname)));
      if (!file.startsWith(root)) return res.writeHead(403).end();
      let stat = statSync(file, { throwIfNoEntry: false });
      if (stat?.isDirectory()) { file = join(file, "index.html"); stat = statSync(file, { throwIfNoEntry: false }); }
      if (!stat) return res.writeHead(404).end("not found");
      const ext = extname(file);
      const compress = /\.(html|js|mjs|css|json|svg|txt)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "");
      const headers = { "content-type": MIME[ext] ?? "application/octet-stream", "cache-control": ext === ".html" ? "no-cache" : "public, max-age=60" };
      if (compress) headers["content-encoding"] = "gzip";
      res.writeHead(200, headers);
      if (compress) res.end(gzipSync(readFileSync(file)));
      else createReadStream(file).pipe(res);
    } catch (error) {
      res.writeHead(500).end(String(error));
    }
  });
  return new Promise((done) => server.listen(0, "127.0.0.1", () => done({ server, base: `http://127.0.0.1:${server.address().port}` })));
}

let staticServer = null;
let base = urlArg;
if (!base) {
  if (!existsSync(join(demoDir, "out", "index.html"))) {
    console.error("[perf] out/index.html missing — run npm run build first");
    process.exit(1);
  }
  ({ server: staticServer, base } = await serve(join(demoDir, "out")));
}

function existsSync(path) {
  try { statSync(path); return true; } catch { return false; }
}

async function launch() {
  const launchArgs = resolveIp ? [`--host-resolver-rules=MAP ${new URL(urlArg).hostname} ${resolveIp}`] : [];
  try { return await chromium.launch({ headless: true, args: launchArgs }); } catch (error) {
    const fallback = process.env.PLAYWRIGHT_EXECUTABLE_PATH ?? ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"].find((p) => existsSync(p));
    if (!fallback) throw error;
    return chromium.launch({ headless: true, executablePath: fallback, args: launchArgs });
  }
}

const browser = await launch();
const rows = [];
for (let run = 1; run <= runs; run += 1) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  const started = Date.now();
  await page.goto(base, { waitUntil: "domcontentloaded", timeout: 90_000 });
  const dcl = Date.now() - started;
  let ready = null;
  for (let i = 0; i < 900; i += 1) {
    if (await page.evaluate(() => /msgs|条消息/.test(document.body.innerText))) { ready = Date.now() - started; break; }
    await page.waitForTimeout(100);
  }
  // Extension clients load after the shell: wait for them (bounded) so the
  // bundle counts below reflect a settled page.
  await page.waitForFunction(() => document.querySelectorAll("[data-ext-id]").length >= 5, undefined, { timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const stats = await page.evaluate(() => {
    const resources = performance.getEntriesByType("resource");
    const byType = {};
    for (const entry of resources) {
      const type = entry.initiatorType || "other";
      byType[type] ??= { n: 0, kb: 0 };
      byType[type].n += 1;
      byType[type].kb += (entry.transferSize ?? 0) / 1024;
    }
    return {
      resources: resources.length,
      js: byType.script?.kb ?? 0,
      extBundles: resources.filter((e) => e.name.includes("/api/extensions/") && e.name.includes(".mjs")).length,
      batch: resources.some((e) => /client-bundle-[0-9a-f]+\.mjs/.test(e.name)),
    };
  });
  rows.push({ run, dcl, ready, resources: stats.resources, jsKB: Math.round(stats.js), extBundles: stats.extBundles, batch: stats.batch });
  await context.close();
}
await browser.close();
staticServer?.close();

console.log(`[perf] ${base}`);
for (const row of rows) {
  console.log(`  run ${row.run}: dcl ${row.dcl}ms · ready ${row.ready ?? "—"}ms · ${row.resources} requests · js ${row.jsKB}KB · ${row.extBundles} extension bundle(s)${row.batch ? " (batch bundle in use)" : ""}`);
}
