#!/usr/bin/env node
/**
 * Serve out/ locally for manual checks (the export is static; no server needed,
 * but a server with gzip + correct MIME makes `npm run perf -- --url` and
 * browser checks behave like the deployed copy).
 *
 *   node scripts/serve-out.mjs [port]     # default 8099
 */
import { createReadStream, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { gzipSync } from "node:zlib";
import { extname, join, normalize } from "node:path";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = normalize(resolve(dirname(fileURLToPath(import.meta.url)), "..", "out"));
const port = Number(process.argv[2] ?? 8099);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript",
  ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png",
  ".txt": "text/plain", ".woff2": "font/woff2", ".wasm": "application/wasm",
};

createServer((req, res) => {
  try {
    let file = normalize(join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)));
    let stat = statSync(file, { throwIfNoEntry: false });
    if (stat?.isDirectory()) { file = join(file, "index.html"); stat = statSync(file, { throwIfNoEntry: false }); }
    if (!stat) { res.writeHead(404).end("not found"); return; }
    const ext = extname(file);
    const compress = /\.(html|js|mjs|css|json|svg|txt)$/.test(ext) && /gzip/.test(req.headers["accept-encoding"] ?? "");
    const headers = { "content-type": MIME[ext] ?? "application/octet-stream", "cache-control": "no-cache" };
    if (compress) headers["content-encoding"] = "gzip";
    res.writeHead(200, headers);
    if (compress) res.end(gzipSync(readFileSync(file)));
    else createReadStream(file).pipe(res);
  } catch (error) {
    try { res.writeHead(500).end(String(error)); } catch { /* socket gone */ }
  }
}).listen(port, "127.0.0.1", () => console.log(`[serve-out] http://127.0.0.1:${port}/ (root: ${root})`));
