/**
 * aiti-model-wizard mock: the "new models discovered" reminder.
 *
 * On page load the extension asks GET /new-models?toast=1; the server decides
 * (rate limits) whether the green toast may show. The recorded capture had
 * total: 0 — no discovery — so the demo never demonstrated the feature.
 * Report a small demo discovery so the toast appears once per load, and accept
 * the ack/refresh calls the toast's buttons make.
 */
import type { MockRequest } from "./http";
import { error, json } from "./http";

/** Shape from extensions/aiti-model-wizard: providers[p] = { count, newModels }. */
const NEW_MODELS = {
  providers: {
    demo: { count: 2, newModels: ["demo-large-v2", "demo-vision"] },
    "demo-lite": { count: 1, newModels: ["demo-lite-mini"] },
  },
  total: 3,
  baseline: true,
} as const;

let acked = false;
let toastConsumed = false;

export async function modelWizardRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  const leaf = request.segments[4];

  if (action === "new-models") {
    if (leaf === "ack" && request.method === "POST") {
      acked = true;
      return json({ ok: true, total: 0, providers: {} });
    }
    if (leaf === "refresh" && request.method === "POST") {
      return json({ ok: true, scanning: false, ...NEW_MODELS });
    }
    if (leaf === "ignore" && request.method === "POST") {
      return json({ ok: true, ...NEW_MODELS });
    }
    // GET /new-models[?toast=1]
    const wantToast = request.query("toast") === "1";
    const toast = wantToast && !acked && !toastConsumed
      ? (toastConsumed = true, { allowed: true, reason: "ok", shownToday: 1, nextAtMs: null })
      : { allowed: false, reason: acked ? "acked" : "rate-limited", shownToday: 1, nextAtMs: null };
    return json({
      ok: true,
      scanning: false,
      ...(acked ? { total: 0, providers: {} } : NEW_MODELS),
      baseline: NEW_MODELS.baseline,
      toast: wantToast ? toast : null,
    });
  }

  // ---- Model health / wizard pages -------------------------------------
  if (action === "last-test") {
    return json({
      ok: true,
      ts: Date.now() - 4 * 60_000,
      providers: {
        demo: { ok: true, status: 200, latencyMs: 640, text: "pong" },
        "demo-lite": { ok: false, status: 429, latencyMs: 1180, text: "rate limit exceeded" },
      },
    });
  }
  if (action === "modelParams") {
    const provider = request.query("provider") ?? "demo";
    return json({
      ok: true,
      provider,
      params: [
        { id: "demo-large", contextWindow: 200_000, maxTokens: 32_768, reasoning: true, input: ["text", "image"] },
        { id: "demo-small", contextWindow: 64_000, maxTokens: 8_192, reasoning: false, input: ["text"] },
      ],
    });
  }
  if (action === "undo-status") return json({ ok: true, ts: Date.now() - 30 * 60_000, providers: ["demo"] });
  if (action === "keys") {
    return json({
      ok: true,
      keys: [
        { name: "primary", key: "sk-***demo", rpm: 60 },
        { name: "backup", key: "sk-***demo", rpm: 30 },
      ],
    });
  }
  if (action === "combos") return json({ ok: true, combos: [] });
  if (action === "discoverStored" || action === "discover") {
    return json({
      ok: true,
      baseUrl: "https://llm.example.invalid/v1",
      api: "openai-completions",
      models: [{ id: "demo-large-v2" }, { id: "demo-vision" }, { id: "demo-small" }],
      count: 3,
    });
  }
  if (action === "detect") {
    return json({ ok: true, baseUrl: "https://llm.example.invalid/v1", api: "openai-completions", source: "catalog" });
  }
  if (action === "checkup") {
    return json({
      ok: true,
      ts: Date.now(),
      providers: {
        demo: { ok: true, status: 200, latencyMs: 610, text: "pong" },
        "demo-lite": { ok: false, status: 429, latencyMs: 1100, text: "rate limit exceeded" },
      },
    });
  }
  if (action === "affiliate") return json({ ok: true, providers: {} });
  if (action === "free-models") return json({ ok: true, providers: [] });
  if (action === "probe-cap") return json({ ok: true, caps: { stream: true, tools: true, vision: true } });
  // Everything else (proxy-status, status, config, discover, oauth-info, …)
  // must come from the recorded replay layer — answering with a stub here
  // drops fields the wizard reads (e.g. `status.length`) and crashes its render.
  return error(`Not found: ${request.path}`, 404);
}
