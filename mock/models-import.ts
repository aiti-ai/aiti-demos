/**
 * aiti-models-import mock: the first-run import dialog needs /status and /scan;
 * mutations succeed in memory and disappear on reload (static demo).
 */
import type { MockRequest } from "./http";
import { json } from "./http";

let dismissed = false;

const SOURCES = [
  {
    id: "codex",
    label: "Codex CLI",
    state: "ready" as const,
    note: null,
    providers: [
      {
        id: "codex-openrouter",
        label: "codex-openrouter",
        baseUrl: "https://openrouter.ai/api/v1",
        api: "openai-responses",
        keySource: "env",
        keyEnv: "OPENROUTER_API_KEY",
        hasKey: false,
        models: ["gpt-5.5", "gpt-5.5-codex"],
      },
    ],
  },
  {
    id: "zcode",
    label: "ZCode",
    state: "no-key" as const,
    note: "Channel zai has no valid plan entitlement in the demo data; entries import without keys.",
    providers: [
      { id: "zcode-bigmodel", label: "zcode-bigmodel", baseUrl: "https://open.bigmodel.cn/api/anthropic", api: "anthropic-messages", keySource: "none", hasKey: false, models: ["glm-4.7", "glm-4.7-air"] },
    ],
  },
];

export async function modelsImportRoute(request: MockRequest): Promise<Response> {
  const sub = request.segments[3];
  if (sub === "status") return json({ ok: true, firstRun: !dismissed, completed: dismissed, dismissed, sources: SOURCES.map((s) => s.id) });
  if (sub === "scan") return json({ ok: true, scanning: false, sources: SOURCES, firstRun: !dismissed });
  if (sub === "dismiss" && request.method === "POST") { dismissed = true; return json({ ok: true }); }
  if (sub === "import" && request.method === "POST") { dismissed = true; return json({ ok: true, imported: 0, providers: [], undoToken: null }); }
  if (sub === "reset" && request.method === "POST") { dismissed = false; return json({ ok: true }); }
  return json({ ok: true });
}
