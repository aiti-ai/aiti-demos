/**
 * Static extension tier: the host's real manifest/status endpoints answered
 * from the generated manifest. Extension client bundles and icons live under
 * public/api/extensions/<id>/assets/... so native import() and <img src>
 * resolve without a server (they never go through fetch()).
 */
import { loadExtensionManifest } from "./extension-manifest-loader";
import { type MockRequest, error, json } from "./http";
import { currentDemoLocale } from "./locale";
import { editorRoute } from "./editor";
import { modelsImportRoute } from "./models-import";
import { sessionManagerRoute } from "./session-manager";
import { gitReviewRoute } from "./git-review";
import { aiInputRoute } from "./ai-input";
import { sysmonRoute } from "./sysmon";
import { modelWizardRoute } from "./model-wizard";
import { getRealFetch } from "./runtime";
import { serviceTunnelsRoute } from "./service-tunnels";
import { msgShareRoute } from "./msg-share";
import { modelCheckRoute } from "./model-check";
import { extmanRoute } from "./extman";

let demoCounter = 0;

type ExtensionManifest = Awaited<ReturnType<typeof loadExtensionManifest>>;
type ManifestExtension = ExtensionManifest["extensions"][number];

function statusEntry(ext: ManifestExtension) {
  return {
    id: ext.id,
    name: ext.name,
    version: ext.version,
    source: ext.source,
    enabled: true,
    loaded: true,
    client: ext.clientUrl,
    icon: ext.icon,
    ui: ext.ui,
    features: ext.features ?? [],
    hooks: [],
    deps: [],
  };
}

function statusPayload(manifest: ExtensionManifest) {
  return {
    loaded: true,
    extensionsRoot: "/Users/demo/.pi/web/extensions",
    extraExtensionsRoots: [],
    devExtensionsRoot: null,
    bundledExtensionsRoot: "/Users/demo/.pi/web/extensions",
    dataRoot: "/Users/demo/.pi/web/data",
    extensions: Object.fromEntries(localeFiltered(manifest).extensions.map((ext) => [ext.id, statusEntry(ext)])),
    services: [],
    capabilities: {},
    multiSource: {},
    pins: { devPriority: false, pins: {} },
    protocol: { current: "1.0", minMajor: 1, minSupported: "1.0" },
  };
}

/**
 * Manifest with ui.i18n narrowed to the current UI locale (first-load chunk
 * governance B2): the full manifest carries both locale tables for all 68
 * extensions (~626KB of its ~906KB raw); the host's translateExtItemText looks
 * up the current locale with a same-family fallback, so shipping one table per
 * extension halves the boot-time manifest. The generated file stays complete
 * (build artifact); the narrowing happens per request and is cached per locale.
 * Known trade-off: switching the demo language mid-session leaves static labels
 * of not-yet-materialized extensions on their keys until reload.
 */
const localeFilteredCache = new Map<string, ExtensionManifest>();

function localeFiltered(manifest: ExtensionManifest): ExtensionManifest {
  const locale = currentDemoLocale();
  // The demo locale is "en" | "zh", extension tables are keyed "en" | "zh-CN".
  // Looking up i18n["zh"] always missed and fell through to the first table —
  // English — so zh users saw static labels (sidebar footer entries such as
  // Extensions / Phone) in English while the panel itself was localized.
  const tableKey = locale === "zh" ? "zh-CN" : "en";
  const cached = localeFilteredCache.get(tableKey);
  if (cached) return cached;
  const narrowed: ExtensionManifest = {
    ...manifest,
    extensions: manifest.extensions.map((ext) => {
      const i18n = (ext.ui as { i18n?: Record<string, unknown> } | null)?.i18n;
      if (!i18n) return ext;
      const table = (i18n as Record<string, unknown>)[tableKey] ?? Object.values(i18n)[0] ?? {};
      return { ...ext, ui: { ...ext.ui, i18n: { [tableKey]: table } } } as ManifestExtension;
    }),
  };
  localeFilteredCache.set(tableKey, narrowed);
  return narrowed;
}

export async function extensionsRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[2];
  // The manifest is 1.1MB of JSON: load it on the first request instead of
  // bundling it into the main chunk (see extension-manifest-loader.ts). The
  // response narrows ui.i18n to the current locale (see localeFiltered).
  if (action === "manifest" || action === "status") {
    const manifest = await loadExtensionManifest();
    if (action === "manifest") return json(localeFiltered(manifest));
    return json(statusPayload(manifest));
  }
  if (action === "client-bundle") {
    // Eager batch bundle: empty registry — the loader falls back to the
    // per-extension URLs from the graph.
    return new Response("export const registry = {};\n", {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (action === "reload" && request.method === "POST") return json({ ok: true, invalidated: [] });
  // Asset files live as real static files (public/api/extensions/...). The mock
  // layer must not intercept them: fetch()-based loads (vendor scripts, models,
  // fonts) fall through to the network, as native import()/img already do.
  if (request.segments[3] === "assets") {
    return getRealFetch()(request.url.href);
  }
  if (action === "aiti-editor") return editorRoute(request);
  if (action === "aiti-models-import") return modelsImportRoute(request);
  if (action === "session-manager") return sessionManagerRoute(request);
  if (action === "aiti-git-review") return gitReviewRoute(request);
  if (action === "aiti-ai-input") return aiInputRoute(request);
  if (action === "aiti-sysmon") return sysmonRoute(request);
  if (action === "service-tunnels") return serviceTunnelsRoute(request);
  if (action === "aiti-msg-share") return msgShareRoute(request);
  if (action === "aiti-model-check") return modelCheckRoute(request);
  if (action === "aiti-model-wizard") return modelWizardRoute(request);
  if (action === "aiti-extman") return extmanRoute(request);
  // The reference "demo" extension's self-check API (it is a real extension
  // bundle in the curated tier; its server hooks are replayed from constants).
  if (action === "demo") {
    const sub = request.segments[3];
    if (sub === "ping") return json({ pong: true, ts: Date.now() });
    if (sub === "hello") return json({ hello: "hello from the demo extension (static mock)" });
    if (sub === "core") return json({ sessionCount: 8, runningCount: 0, home: "/Users/demo", sample: [] });
    if (sub === "shared") return json({ protocol: { ok: true, sample: { version: "1.0" } }, displayName: { zh: "示例扩展", en: "Demo Extension" } });
    if (sub === "counter") {
      demoCounter += request.method === "POST" ? 1 : 0;
      return json({ count: demoCounter, updatedAt: new Date(0).toISOString() });
    }
    if (sub === "humor") {
      const leaf = request.segments[4];
      if (leaf === "random") return json({ id: "h1", text: "The demo is listening. Nothing is real except the extension host." });
      if (leaf === "refresh") return json({ ok: true, fetched: 3 });
      if (leaf === "toggle") return json({ ok: true, enabled: true });
      return json({ items: [{ id: "h1", text: "Static mock humor item." }], enabled: true });
    }
    return json({ ok: true });
  }
  return error(`Not found: ${request.path}`, 404);
}
