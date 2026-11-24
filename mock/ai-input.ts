/**
 * aiti-ai-input mock: ASR panel state.
 *
 * The recorded `/asr/info` came from a capture instance with no local ASR model
 * pulled, so it reports `stream_loaded: false` and the panel renders
 * "…（加载中/待拉）" forever — a permanent loading state in a static demo.
 * Report the demo models as loaded; label translation still comes from the
 * en fixture layer (mock/model/routes.en.json).
 */
import type { MockRequest } from "./http";
import { json } from "./http";
import { loadRecordedBody } from "./replay-tables";

function withLoaded(body: Record<string, unknown> | null): Record<string, unknown> {
  const base = body ?? {};
  return {
    ...base,
    ok: true,
    error: null,
    running: false,
    starting: false,
    lastError: null,
    stream_model: (base.stream_model as string) ?? "iic/SenseVoiceSmall",
    stream_loaded: true,
    offline_model: (base.offline_model as string) ?? "Qwen/Qwen3-ASR-0.6B",
    offline_loaded: true,
  };
}

export async function aiInputRoute(request: MockRequest): Promise<Response> {
  const sub = request.segments[3];
  if (sub === "asr") {
    const leaf = request.segments[4];
    if (leaf === "info") return json(withLoaded(await loadRecordedBody("GET /api/extensions/aiti-ai-input/asr/info")));
    if (leaf === "config") {
      const body = await loadRecordedBody("GET /api/extensions/aiti-ai-input/asr/config");
      return json({ ...(body ?? {}), ok: true });
    }
  }
  if (sub === "features") {
    return json((await loadRecordedBody("GET /api/extensions/aiti-ai-input/features")) ?? { ok: true });
  }
  return json({ ok: true });
}
