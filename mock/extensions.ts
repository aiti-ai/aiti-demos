/**
 * Static extension tier: the host's real manifest/status endpoints answered
 * from the generated manifest. Extension client bundles and icons live under
 * public/api/extensions/<id>/assets/... so native import() and <img src>
 * resolve without a server (they never go through fetch()).
 */
import manifest from "./data/extension-manifest.json";
import { type MockRequest, error, json } from "./http";
import { editorRoute } from "./editor";
import { modelsImportRoute } from "./models-import";
import { sessionManagerRoute } from "./session-manager";
import { gitReviewRoute } from "./git-review";
import { aiInputRoute } from "./ai-input";
import { sysmonRoute } from "./sysmon";

let demoCounter = 0;

type ManifestExtension = (typeof manifest.extensions)[number];

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

function statusPayload() {
  return {
    loaded: true,
    extensionsRoot: "/Users/demo/.pi/web/extensions",
    extraExtensionsRoots: [],
    devExtensionsRoot: null,
    bundledExtensionsRoot: "/Users/demo/.pi/web/extensions",
    dataRoot: "/Users/demo/.pi/web/data",
    extensions: Object.fromEntries(manifest.extensions.map((ext) => [ext.id, statusEntry(ext)])),
    services: [],
    capabilities: {},
    multiSource: {},
    pins: { devPriority: false, pins: {} },
    protocol: { current: "1.0", minMajor: 1, minSupported: "1.0" },
  };
}

export async function extensionsRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[2];
  if (action === "manifest") return json(manifest);
  if (action === "status") return json(statusPayload());
  if (action === "client-bundle") {
    // Eager batch bundle: empty registry — the loader falls back to the
    // per-extension URLs from the graph.
    return new Response("export const registry = {};\n", {
      headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "no-store" },
    });
  }
  if (action === "reload" && request.method === "POST") return json({ ok: true, invalidated: [] });
  if (action === "aiti-editor") return editorRoute(request);
  if (action === "aiti-models-import") return modelsImportRoute(request);
  if (action === "session-manager") return sessionManagerRoute(request);
  if (action === "aiti-git-review") return gitReviewRoute(request);
  if (action === "aiti-ai-input") return aiInputRoute(request);
  if (action === "aiti-sysmon") return sysmonRoute(request);
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
