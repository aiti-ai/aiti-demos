#!/usr/bin/env node
/**
 * Static-site regression tour (no backend).
 *
 *   node scripts/tour.mjs [--url http://127.0.0.1:30147]
 *
 * Without --url it serves out/ on an ephemeral port, then checks the shell,
 * a recorded session, settings, files and the real demo extension panel.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(demoDir, "out");
const args = process.argv.slice(2);
const urlArg = args.find((a) => a.startsWith("--url="))?.slice("--url=".length)
  ?? (args.includes("--url") ? args[args.indexOf("--url") + 1] : undefined);

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

function startStatic(dir) {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://127.0.0.1");
    let path = normalize(join(dir, decodeURIComponent(url.pathname)));
    if (!path.startsWith(dir)) { res.writeHead(403).end(); return; }
    if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
    if (!existsSync(path)) {
      const html = path.endsWith(".html") ? null : join(dir, "404.html");
      res.writeHead(404, { "content-type": "text/plain" }).end(html && existsSync(html) ? "not found" : "not found");
      return;
    }
    res.writeHead(200, { "content-type": mime[extname(path)] ?? "application/octet-stream" });
    createReadStream(path).pipe(res);
  });
  return new Promise((resolvePromise) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolvePromise({ server, base: `http://127.0.0.1:${address.port}` });
    });
  });
}

let staticServer = null;
let base = urlArg;
if (!base) {
  if (!existsSync(join(outDir, "index.html"))) {
    console.error("[tour] out/index.html missing — run npm run build first");
    process.exit(1);
  }
  ({ server: staticServer, base } = await startStatic(outDir));
}

// Normalize the base so `${base}/?x` never turns into `//?x` (which the static
// server answers with its own error page, breaking every later check).
if (base) base = base.replace(/\/+$/, "");

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const fallback = process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ?? ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable"].find((p) => existsSync(p));
    if (!fallback) throw error;
    return chromium.launch({ headless: true, executablePath: fallback });
  }
}

const browser = await launchBrowser();
const page = await (await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "en-US" })).newPage();
const errors = [];
const failed = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
// Third-party trackers emit benign console noise (Baidu's hm.js trips the
// document "unload" permissions policy); it is not an app error.
const IGNORED_CONSOLE = [/Permissions policy violation: unload/i, /ERR_BLOCKED_BY_CLIENT/i];
page.on("console", (m) => {
  if (m.type() !== "error") return;
  const text = m.text();
  if (IGNORED_CONSOLE.some((re) => re.test(text))) return;
  errors.push(text.slice(0, 240));
});
page.on("response", (r) => { if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`); });


/** Navigate and let the app settle: a second goto while the shell is still
 *  booting leaves React mid-mount and every later check fails. */
async function go(url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForFunction(
    () => document.querySelectorAll("[data-ext-id]").length >= 1,
    undefined,
    { timeout: 60_000 },
  ).catch(() => {});
  await page.waitForTimeout(700);
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`[tour] ok   ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: String(error).slice(0, 300) });
    console.log(`[tour] FAIL ${name}: ${String(error).slice(0, 200)}`);
  }
}

try {
  await go(base);
  await check("shell", async () => {
    await page.getByRole("button", { name: "Settings", exact: true }).last().waitFor({ timeout: 30_000 });
  });
  await check("session", async () => {
    await go(`${base}/?session=019d7e3a-5c10-7a41-8f2e-0a1b2c3d4e01`);
    // A cold load over the public host compiles/fetches 56 extension bundles
    // before the transcript mounts; wait for the content, not a fixed budget.
    await page.getByText(/Welcome! Pi Web is a browser UI/).first().waitFor({ timeout: 60_000 }).catch(async (e) => {
      const info = await page.evaluate(() => ({
        url: location.href,
        len: document.body.innerText.length,
        entries: document.querySelectorAll("[data-entry-id]").length,
        head: document.body.innerText.slice(0, 160).replace(/\n+/g, " | "),
      }));
      throw new Error(`${e.message.split("\n")[0]} :: ${JSON.stringify(info)}`);
    });
  });
  await check("settings", async () => {
    await page.getByRole("button", { name: "Settings", exact: true }).last().click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByText("General", { exact: false }).first().waitFor({ timeout: 20_000 });
    await dialog.getByText("Models", { exact: true }).first().click({ timeout: 5_000 });
    await page.waitForTimeout(600);
    const close = dialog.locator('button[aria-label="Close"], button[title="Close"]').last();
    if (await close.count()) await close.click({ timeout: 5_000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
  });
  await check("files", async () => {
    const files = page.getByText("Files", { exact: true }).first();
    if (await files.count()) await files.click({ timeout: 5_000 });
    await page.getByText("README.md", { exact: false }).first().waitFor({ timeout: 20_000 });
  });
  await check("aiti-pw-entry", async () => {
    // The demo-only extension (extensions/demo-banner) puts a floating pill and a
    // permanent footer entry in place; both must point at the site.
    const entry = await page.evaluate(() => {
      const pill = document.querySelector("[data-demo-banner]");
      const footer = document.querySelector("[data-demo-banner-footer]");
      return {
        pill: Boolean(pill),
        footer: Boolean(footer),
        label: pill?.getAttribute("aria-label") ?? footer?.getAttribute("aria-label") ?? "",
      };
    });
    if (!entry.pill && !entry.footer) throw new Error("no aiti.pw entry rendered");
    if (!/aiti/i.test(entry.label)) throw new Error(`entry label unexpected: ${entry.label}`);
  });

  await check("extension-tier", async () => {
    // Return to the app document first: earlier steps may have left the tab on a
    // viewer URL where the mock network layer is not installed.
    await go(base);
    // Data-level proof that the real extension tier loaded: the manifest answers
    // with every catalogued extension and the host mounted extension entries.
    const tier = await page.evaluate(async () => {
      const res = await fetch("/api/extensions/manifest");
      const type = res.headers.get("content-type") ?? "";
      const text = await res.text();
      if (!type.includes("json")) {
        // Not the mock: the network layer was bypassed (fresh document, no install).
        return { error: `manifest not mocked: HTTP ${res.status} ${type}`, body: text.slice(0, 60) };
      }
      const manifest = JSON.parse(text);
      return {
        total: (manifest.extensions || []).length,
        withClient: (manifest.extensions || []).filter((e) => e.clientUrl).length,
        mounted: document.querySelectorAll("[data-ext-id]").length,
      };
    });
    if (tier.error) throw new Error(tier.error + " | " + (tier.body ?? ""));
    if (tier.total < 50 || tier.withClient < 40) {
      throw new Error(`extension tier incomplete: ${JSON.stringify(tier)}`);
    }
    await page.waitForFunction(
      () => document.querySelectorAll("[data-ext-id]").length >= 5,
      undefined,
      { timeout: 60_000 },
    );
  });
} finally {
  await browser.close();
  staticServer?.close();
}

const failedChecks = results.filter((r) => !r.ok);
console.log(`[tour] ${results.length - failedChecks.length}/${results.length} checks passed, ${errors.length} console error(s), ${failed.length} HTTP failure(s)`);
if (errors.length) console.log(errors.slice(0, 10).join("\n"));
if (failed.length) console.log([...new Set(failed)].slice(0, 10).join("\n"));
if (failedChecks.length || errors.length) process.exitCode = 1;
