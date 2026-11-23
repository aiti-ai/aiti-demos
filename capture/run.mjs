#!/usr/bin/env node
/**
 * Record a real pi-web instance into raw fixtures (Playwright + CDP).
 *
 *   node capture/run.mjs --run p1-core [--url http://127.0.0.1:30144] [--port 30144]
 *
 * Without --url it seeds an isolated run (capture/seed.mjs) and starts a
 * dedicated dev server (capture/server.mjs). Raw output lands in
 * capture/raw/<run>/ (gitignored) and is later compiled by capture/compile.mjs.
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { startCaptureServer } from "./server.mjs";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  if (hit) return hit.slice(name.length + 3);
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};
const runId = arg("run", new Date().toISOString().replace(/[:.]/g, "-"));
const port = Number(arg("port", "30144"));
const rawDir = join(demoDir, "capture", "raw", runId);
mkdirSync(rawDir, { recursive: true });
const assetsDir = join(rawDir, "assets");
const shotsDir = join(rawDir, "screenshots");
mkdirSync(assetsDir, { recursive: true });
mkdirSync(shotsDir, { recursive: true });

let server = null;
let base = arg("url");
if (!base) {
  const seed = JSON.parse(execFileSync(process.execPath, [join(demoDir, "capture", "seed.mjs"), "--run", runId], { encoding: "utf8" }));
  server = await startCaptureServer({ root: resolve(demoDir, "..", "aiti-ai"), seed, port, logFile: join(rawDir, "server.log") });
  base = server.base;
}

const requests = [];
const streams = [];
const consoleLines = [];
const steps = [];
let currentStep = "boot";

function writeAsset(pathname, body, contentType) {
  const safe = pathname.replace(/^\/+/, "").replace(/[?#].*$/, "");
  const target = join(assetsDir, safe);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, body);
  return { path: safe, bytes: body.length, contentType };
}

async function launchBrowser() {
  try {
    return await chromium.launch({ headless: true });
  } catch (error) {
    const fallback = process.env.PLAYWRIGHT_EXECUTABLE_PATH
      ?? ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium"].find((p) => existsSync(p));
    if (!fallback) throw error;
    console.warn(`[capture] Playwright browser missing, using ${fallback}`);
    return chromium.launch({ headless: true, executablePath: fallback });
  }
}

const browser = await launchBrowser();
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "en-US",
  timezoneId: "UTC",
});
const page = await context.newPage();
page.setDefaultTimeout(15_000);
const cdp = await context.newCDPSession(page);
await cdp.send("Network.enable");
cdp.on("Network.eventSourceMessageReceived", (event) => {
  streams.push({
    step: currentStep,
    requestId: event.requestId,
    timestamp: event.timestamp,
    event: event.eventName ?? "",
    data: event.data,
  });
});

const pendingResponses = [];
page.on("response", (response) => {
  const url = new URL(response.url());
  if (url.origin !== new URL(base).origin) return;
  if (!url.pathname.startsWith("/api/")) return;
  const type = response.headers()["content-type"] ?? "";
  if (type.includes("text/event-stream")) return;
  pendingResponses.push((async () => {
    try {
      const isAsset = url.pathname.startsWith("/api/extensions/") && /\.(mjs|js|css|svg|png|jpg|woff2?|ttf)$/.test(url.pathname);
      if (isAsset) {
        const body = await response.body();
        const asset = writeAsset(url.pathname, body, type);
        requests.push({ step: currentStep, method: response.request().method(), url: url.pathname, query: url.search, status: response.status(), type, asset });
        return;
      }
      if (!/json|text|javascript/.test(type)) {
        requests.push({ step: currentStep, method: response.request().method(), url: url.pathname, query: url.search, status: response.status(), type, skipped: "non-text" });
        return;
      }
      const body = await response.text();
      requests.push({
        step: currentStep,
        method: response.request().method(),
        url: url.pathname,
        query: url.search,
        status: response.status(),
        type,
        bytes: body.length,
        body: body.length > 4 * 1024 * 1024 ? body.slice(0, 4 * 1024 * 1024) : body,
      });
    } catch (error) {
      requests.push({ step: currentStep, url: url.pathname, error: String(error).slice(0, 200) });
    }
  })());
});
const pendingRequests = [];
page.on("request", (request) => {
  const url = new URL(request.url());
  if (url.origin !== new URL(base).origin) return;
  if (!url.pathname.startsWith("/api/")) return;
  if (request.method() === "GET") return;
  pendingRequests.push((() => {
    let data = null;
    try { data = request.postData(); } catch { /* binary */ }
    requests.push({
      step: currentStep,
      method: request.method(),
      url: url.pathname,
      query: url.search,
      requestBody: data && data.length <= 64 * 1024 ? data : null,
    });
  })());
});
page.on("console", (message) => {
  if (message.type() === "error" || message.type() === "warning") {
    consoleLines.push({ step: currentStep, type: message.type(), text: message.text().slice(0, 2000) });
  }
});
page.on("pageerror", (error) => {
  consoleLines.push({ step: currentStep, type: "pageerror", text: `${error.message}\n${(error.stack ?? "").slice(0, 2000)}` });
});

async function step(label, fn) {
  currentStep = label;
  const started = Date.now();
  try {
    await fn();
    steps.push({ label, ok: true, ms: Date.now() - started });
    console.log(`[capture] ok   ${label}`);
  } catch (error) {
    steps.push({ label, ok: false, ms: Date.now() - started, error: String(error).slice(0, 500) });
    console.log(`[capture] FAIL ${label}: ${String(error).slice(0, 200)}`);
  }
  await page.waitForTimeout(600);
}

async function crawlExtensions() {
  const manifest = await page.evaluate(async () => (await fetch("/api/extensions/manifest")).json());
  const labels = [];
  const seen = new Set();
  const skip = /new session|delete|remove|stop|send|fork|logout|uninstall|install|reset|pair|upload|download|stop/i;
  const resolve = (ui, raw) => {
    if (typeof raw !== "string") return null;
    if (!raw.startsWith("i18n:")) return raw;
    const key = raw.slice(5);
    return ui.i18n?.en?.[key] ?? ui.i18n?.["zh-CN"]?.[key] ?? key;
  };
  for (const ext of manifest.extensions ?? []) {
    const ui = ext.ui;
    if (!ui) continue;
    for (const [slot, items] of Object.entries(ui)) {
      if (!Array.isArray(items)) continue;
      for (const item of items) {
        for (const raw of [item?.title, item?.label, item?.name]) {
          const label = resolve(ui, raw);
          if (!label || label.length > 80 || skip.test(label)) continue;
          const id = `${ext.id}|${slot}|${label}`;
          if (seen.has(id)) continue;
          seen.add(id);
          labels.push({ ext: ext.id, slot, label });
        }
      }
    }
  }
  console.log(`[capture] extension crawl: ${labels.length} candidate(s)`);
  // Session-specific slots only render with a session open.
  await page.goto(`${base}/?session=demo-welcome`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForTimeout(1200);
  let opened = 0;
  for (const [index, { label, ext }] of labels.entries()) {
    currentStep = `ext:${ext}:${label}`.slice(0, 120);
    let clicked = false;
    for (const locator of [
      page.getByTitle(label, { exact: true }).first(),
      page.getByTitle(label, { exact: false }).first(),
      page.getByRole("button", { name: label, exact: true }).first(),
      page.getByRole("button", { name: label, exact: false }).first(),
      page.getByText(label, { exact: true }).first(),
      page.getByText(label, { exact: false }).first(),
    ]) {
      if (!(await locator.count())) continue;
      try {
        await locator.click({ timeout: 1_500 });
        clicked = true;
        break;
      } catch { /* try next */ }
    }
    if (!clicked) continue;
    opened += 1;
    await page.waitForTimeout(700);
    if (index % 5 === 0) {
      const safe = `${String(index).padStart(3, "0")}-${ext}-${label}`.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 100);
      await page.screenshot({ path: join(shotsDir, `ext-${safe}.png`) }).catch(() => {});
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(250);
  }
  steps.push({ label: "extension-crawl", ok: true, opened, candidates: labels.length });
  console.log(`[capture] extension crawl opened ${opened}/${labels.length}`);
}

async function crawlAppCenter() {
  const collapseAppDrawer = async () => {
    const collapse = page.getByTitle("Collapse").first();
    if (await collapse.count()) await collapse.click({ timeout: 2_000 }).catch(() => {});
    await page.waitForTimeout(800);
  };
  await collapseAppDrawer();
  const cards = await page.evaluate(() => [...document.querySelectorAll("[data-app-card]")]
    .map((el) => ({ key: el.getAttribute("data-app-card"), text: (el.textContent || "").trim().slice(0, 60) })));
  console.log(`[capture] app center: ${cards.length} card(s)`);
  let opened = 0;
  for (const [index, card] of cards.entries()) {
    const skip = /delete|remove|stop|send|compact|share|reset|logout|uninstall|install|new session/i;
    if (skip.test(card.text)) continue;
    currentStep = `app:${card.key}`.slice(0, 120);
    // A card may replace the app drawer with a panel; reload + collapse for each
    // card so the next one is reliably visible.
    await page.goto(`${base}/?session=demo-welcome`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
    await page.getByRole("button", { name: "Settings", exact: true }).last().waitFor({ timeout: 20_000 }).catch(() => {});
    await collapseAppDrawer();
    const locator = page.locator(`[data-app-card="${card.key.replace(/"/g, '\\"')}"]`).first();
    if (!(await locator.count())) continue;
    try {
      try {
        await locator.click({ timeout: 1_500 });
      } catch {
        // A previous panel may still overlay the drawer; force the card click.
        await locator.click({ timeout: 1_500, force: true });
      }
      opened += 1;
      await page.waitForTimeout(600);
      if (index % 3 === 0) {
        const safe = `${String(index).padStart(2, "0")}-${card.key}`.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 100);
        await page.screenshot({ path: join(shotsDir, `app-${safe}.png`) }).catch(() => {});
      }
      await page.keyboard.press("Escape").catch(() => {});
      const close = page.locator('button[aria-label="Close"], button[title="Close"]').last();
      if (await close.count()) await close.click({ timeout: 800 }).catch(() => {});
      await page.waitForTimeout(200);
    } catch { /* hidden */ }
  }
  steps.push({ label: "app-center-crawl", ok: true, opened, cards: cards.length });
  console.log(`[capture] app center opened ${opened}/${cards.length}`);
}

async function crawlDomButtons() {
  const max = Number(arg("max-buttons", "70"));
  const skip = /delete|remove|stop|send|fork|logout|uninstall|install|reset|pair|upload|download|shutdown|reboot|kill|compact|generate title|new session|^new$|close|collapse|expand/i;
  const clicked = new Set();
  let opened = 0;
  for (let index = 0; index < max; index += 1) {
    const candidates = await page.evaluate(() => [...document.querySelectorAll("button, [role=\"button\"]")]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      })
      .map((el) => ({
        title: el.getAttribute("title") || "",
        aria: el.getAttribute("aria-label") || "",
        text: (el.textContent || "").trim().slice(0, 60),
      }))
      .filter((item) => item.title || item.aria));
    const next = candidates.find((item) => {
      const key = item.title || item.aria;
      return key && !clicked.has(key) && !skip.test(key);
    });
    if (!next) break;
    const key = next.title || next.aria;
    clicked.add(key);
    currentStep = `dom:${key}`.slice(0, 120);
    const locator = next.title
      ? page.getByTitle(next.title, { exact: true }).first()
      : page.getByRole("button", { name: next.aria, exact: true }).first();
    if (!(await locator.count())) continue;
    try {
      await locator.click({ timeout: 1_500 });
      opened += 1;
      await page.waitForTimeout(500);
      if (index % 4 === 0) {
        const safe = `${String(index).padStart(3, "0")}-${key}`.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 100);
        await page.screenshot({ path: join(shotsDir, `dom-${safe}.png`) }).catch(() => {});
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(200);
    } catch { /* non-clickable */ }
  }
  steps.push({ label: "dom-button-crawl", ok: true, opened });
  console.log(`[capture] dom button crawl opened ${opened}`);
}

try {
  await page.goto(`${base}/`, { waitUntil: "domcontentloaded", timeout: 90_000 });
  await step("boot", async () => {
    // Extensions can take over the sidebar (session-manager), so wait for a
    // stable shell element instead of a core-only label.
    await page.getByRole("button", { name: "Settings", exact: true }).last().waitFor({ timeout: 30_000 });
    await page.screenshot({ path: join(shotsDir, "01-boot.png") });
  });
  await step("open-welcome-session", async () => {
    await page.goto(`${base}/?session=demo-welcome`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    await page.getByText(/Welcome! This is a static demo/).first().waitFor({ timeout: 20_000 });
    await page.screenshot({ path: join(shotsDir, "02-welcome.png") });
  });
  await step("open-settings", async () => {
    await page.getByRole("button", { name: "Settings", exact: true }).last().click();
    const dialog = page.getByRole("dialog", { name: "Settings" });
    await dialog.getByText("General", { exact: false }).first().waitFor({ timeout: 20_000 });
    await page.screenshot({ path: join(shotsDir, "03-settings-general.png") });
    for (const tab of ["Models", "Skills", "Sub-agents", "Plugins", "MCP"]) {
      const item = dialog.getByText(tab, { exact: true }).first();
      if (await item.count()) {
        await item.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(600);
        await page.screenshot({ path: join(shotsDir, `03-settings-${tab.toLowerCase()}.png`) });
      }
    }
  });
  await step("close-settings", async () => {
    const dialog = page.getByRole("dialog", { name: "Settings" });
    const close = dialog.locator('button[aria-label="Close"], button[title="Close"]').last();
    if (await close.count()) await close.click({ timeout: 5_000 }).catch(() => {});
    await page.keyboard.press("Escape").catch(() => {});
    await dialog.waitFor({ state: "hidden", timeout: 10_000 }).catch(() => {});
    await page.waitForTimeout(400);
  });
  await step("open-files", async () => {
    const byText = page.getByText("Files", { exact: true }).first();
    if (await byText.count()) await byText.click({ timeout: 5_000 }).catch(() => {});
    const byTitle = page.getByTitle(/Files/i).first();
    if (await byTitle.count()) await byTitle.click({ timeout: 5_000 }).catch(() => {});
    await page.getByText("README.md", { exact: false }).first().waitFor({ timeout: 20_000 });
    await page.screenshot({ path: join(shotsDir, "04-files.png") });
  });
  await step("open-guide", async () => {
    const docs = page.getByText("docs", { exact: true }).last();
    if (!(await docs.count())) return; // best effort: sidebar takeover may hide the tree
    await docs.click({ timeout: 5_000 }).catch(() => {});
    await page.waitForTimeout(800);
    const guide = page.getByText("guide.md", { exact: false }).first();
    if (await guide.count()) {
      await guide.click({ timeout: 5_000 }).catch(() => {});
      await page.waitForTimeout(1200);
      await page.screenshot({ path: join(shotsDir, "05-guide.png") });
    }
  });
  await step("new-session", async () => {
    await page.getByText("New", { exact: true }).first().click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: join(shotsDir, "06-new-session.png") });
  });
  await step("extension-panel", async () => {
    // The three demo packages are excluded from the recording instance; pick a
    // real extension entry if one is present (best effort, not a hard failure).
    const candidates = ["demo Self-check", "Extensions", "Feedback", "Settings"];
    for (const title of candidates) {
      const button = page.getByTitle(title).first();
      if (await button.count()) {
        await button.click({ timeout: 5_000 }).catch(() => {});
        await page.waitForTimeout(1200);
        await page.screenshot({ path: join(shotsDir, "07-extension-panel.png") });
        break;
      }
    }
  });
  if (args.includes("--extensions")) {
    await crawlExtensions();
    await crawlDomButtons();
  }
  if (args.includes("--app-center")) await crawlAppCenter();
  await step("model-selector", async () => {
    const model = page.getByText("Demo Large", { exact: false }).first();
    if (await model.count()) {
      await model.click({ timeout: 5_000 }).catch(async () => {
        await page.keyboard.press("Escape").catch(() => {});
        await model.click({ timeout: 5_000 });
      });
      await page.waitForTimeout(800);
      await page.screenshot({ path: join(shotsDir, "08-model-selector.png") });
      await page.keyboard.press("Escape").catch(() => {});
    }
  });
} finally {
  await Promise.allSettled([...pendingRequests, ...pendingResponses]);
  if (!page.isClosed()) await page.waitForTimeout(500);
  await browser.close();
  server?.stop();
}

const meta = {
  runId,
  base,
  startedAt: new Date().toISOString(),
  sourceCommit: (() => {
    try { return execFileSync("git", ["-C", resolve(demoDir, "..", "aiti-ai"), "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); }
    catch { return "unknown"; }
  })(),
  counts: {
    requests: requests.length,
    streams: streams.length,
    console: consoleLines.length,
    steps: steps.length,
    failedSteps: steps.filter((s) => !s.ok).length,
  },
  steps,
  hash: createHash("sha256").update(JSON.stringify(requests)).digest("hex").slice(0, 16),
};
writeFileSync(join(rawDir, "requests.ndjson"), requests.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(rawDir, "streams.ndjson"), streams.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(rawDir, "console.ndjson"), consoleLines.map((r) => JSON.stringify(r)).join("\n") + "\n");
writeFileSync(join(rawDir, "meta.json"), JSON.stringify(meta, null, 2) + "\n");

console.log(`[capture] ${meta.counts.requests} requests, ${meta.counts.streams} SSE frames, ${meta.counts.console} console lines, ${meta.counts.failedSteps} failed step(s)`);
console.log(`[capture] raw -> ${rawDir}`);
if (meta.counts.failedSteps) process.exitCode = 2;
