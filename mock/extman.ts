/**
 * aiti-extman mock: the extension manager panel reads /status (installed tier),
 * /updates (registry + npm comparison), /registry (online catalog),
 * /publishers and /ops. A static demo has no filesystem, no npm and no registry,
 * so the panel used to open on a bare "HTTP 404" with an empty list — and every
 * extension name fell back to English because the localized names come from the
 * same payload.
 *
 * Shapes mirror extensions/aiti-extman/server (statusPayload / updatesPayload).
 */
import { loadExtensionManifest } from "./extension-manifest-loader";
import { type MockRequest, json } from "./http";

const EXTENSIONS_ROOT = "/Users/demo/extensions";
const BUNDLED_ROOT = "/Users/demo/bundled-extensions";
const DATA_ROOT = "/Users/demo/.pi/web/data";

function protocol(declared: string | null) {
  return {
    declared,
    current: "1.0",
    minSupported: "1.0",
    minorAhead: false,
    needsUpgrade: false,
    upgradeRefs: [] as string[],
    state: declared ? "ok" : "missing",
    detail: declared ? "" : "未声明协议版本（legacy）",
    source: "host",
  };
}

export async function extmanRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3] ?? "";

  if (action === "status") {
    const manifest = await loadExtensionManifest();
    const extensions: Record<string, unknown> = {};
    for (const ext of manifest.extensions) {
      extensions[ext.id] = {
        loaded: true,
        enabled: true,
        name: ext.name,
        version: ext.version,
        pinyin: "",
        protocol: protocol("1.0"),
        source: ext.source ?? "host",
        ...(ext.clientUrl ? {} : { serverOnly: true }),
      };
    }
    return json({
      loaded: true,
      extensionsRoot: EXTENSIONS_ROOT,
      extraExtensionsRoots: [],
      devExtensionsRoot: null,
      bundledExtensionsRoot: BUNDLED_ROOT,
      dataRoot: DATA_ROOT,
      extensions,
      sharedDeps: { ok: true, missing: [], packages: [] },
      services: [],
    });
  }

  if (action === "updates") {
    return json({
      ok: true,
      phase: "all",
      partial: false,
      checkedAt: new Date().toISOString(),
      sources: {
        registry: { ok: true, count: 74 },
        npm: { ok: true, checked: 0, failed: 0, missing: 0 },
        git: { ok: true, checked: 0 },
      },
      updates: {},
    });
  }

  if (action === "registry") return json({ ok: true, entries: [], packages: [] });
  if (action === "publishers") return json({ ok: true, publishers: [] });
  if (action === "ops") return json({ ok: true, ops: [], log: [] });
  if (action === "update-all") return json({ ok: true, updated: [], skipped: [] });
  if (action === "install-zip") return json({ ok: false, error: "静态 demo 不支持安装扩展" });
  return json({ ok: true });
}
