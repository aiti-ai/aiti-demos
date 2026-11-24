/**
 * aiti-model-check mock: the health page reads /status (per-model probe state),
 * /balance (provider quotas), /history (probe log) and /availability.
 *
 * A static demo cannot probe anything, so the page used to show every model as
 * "Untested" with "Balance unavailable". Return a plausible mixed picture:
 * one healthy provider, one rate-limited, one failed, plus balances and history.
 *
 * Shapes mirror extensions/aiti-model-check/core.cjs (statusOf / buildSummary /
 * applyBalancesToState).
 */
import type { MockRequest } from "./http";
import { json } from "./http";

const MINUTE = 60_000;
const now = Date.now();

function entry(
  provider: string,
  model: string,
  kind: "ok" | "rl" | "err" | "never",
  extra: Record<string, unknown> = {},
) {
  const probed = kind !== "never";
  const age = kind === "ok" ? 3 : kind === "rl" ? 12 : 25;
  return {
    provider,
    model,
    modelId: model,
    api: "openai-completions",
    baseUrl: "https://llm.example.invalid/v1",
    reasoning: true,
    source: "pi",
    lastProbedAt: probed ? now - age * MINUTE : 0,
    lastOk: kind === "ok",
    lastStatus: kind === "ok" ? 200 : kind === "rl" ? 429 : kind === "err" ? 500 : 0,
    lastLatencyMs: probed ? (kind === "ok" ? 640 : kind === "rl" ? 1200 : 480) : null,
    rateLimited: kind === "rl",
    lastText: kind === "ok" ? "pong" : kind === "rl" ? "rate limit exceeded" : "",
    ...extra,
  };
}

const state = {
  updatedAt: now - 3 * MINUTE,
  models: {
    "demo/demo-large": {
      ...entry("demo", "demo-large", "ok"),
      history: [
        { ts: now - 40 * MINUTE, ok: true, status: 200 },
        { ts: now - 22 * MINUTE, ok: true, status: 200 },
        { ts: now - 3 * MINUTE, ok: true, status: 200 },
      ],
    },
    "demo/demo-small": {
      ...entry("demo", "demo-small", "ok"),
      history: [{ ts: now - 5 * MINUTE, ok: true, status: 200 }],
    },
    "demo-lite/demo-lite-mini": {
      ...entry("demo-lite", "demo-lite-mini", "rl"),
      history: [
        { ts: now - 50 * MINUTE, ok: true, status: 200 },
        { ts: now - 12 * MINUTE, ok: false, status: 429 },
      ],
    },
    "demo-vision/demo-vision": {
      ...entry("demo-vision", "demo-vision", "err"),
      history: [{ ts: now - 25 * MINUTE, ok: false, status: 500 }],
    },
    "demo-plan/demo-plan-chat": {
      ...entry("demo-plan", "demo-plan-chat", "never"),
    },
  },
  balances: {
    demo: {
      provider: "demo",
      label: "Demo Gateway",
      kind: "balance",
      ok: true,
      unsupported: false,
      exhausted: false,
      checkedAt: now - 4 * MINUTE,
      latencyMs: 42,
      text: "Balance 66.66 CNY (demo)",
      detail: { total: 66.66, currency: "CNY" },
    },
    "demo-lite": {
      provider: "demo-lite",
      label: "Demo Lite (plan)",
      kind: "usage",
      ok: true,
      unsupported: false,
      exhausted: false,
      checkedAt: now - 4 * MINUTE,
      latencyMs: 88,
      text: "Plan usage 38% of monthly quota",
      detail: { used: 38, limit: 100, unit: "percent" },
    },
    "demo-vision": {
      provider: "demo-vision",
      label: "Demo Vision",
      kind: "balance",
      ok: false,
      unsupported: false,
      exhausted: true,
      checkedAt: now - 4 * MINUTE,
      latencyMs: 0,
      text: "Out of credit",
      detail: null,
    },
  },
  runtimeErrors: {},
  window: {},
};

const HISTORY = [
  { ts: now - 3 * MINUTE, provider: "demo", model: "demo-large", ok: true, status: 200, latencyMs: 640, text: "pong" },
  { ts: now - 5 * MINUTE, provider: "demo", model: "demo-small", ok: true, status: 200, latencyMs: 520, text: "pong" },
  { ts: now - 12 * MINUTE, provider: "demo-lite", model: "demo-lite-mini", ok: false, status: 429, latencyMs: 1200, text: "rate limit exceeded" },
  { ts: now - 25 * MINUTE, provider: "demo-vision", model: "demo-vision", ok: false, status: 500, latencyMs: 480, text: "upstream error" },
  { ts: now - 40 * MINUTE, provider: "demo", model: "demo-large", ok: true, status: 200, latencyMs: 700, text: "pong" },
];

export async function modelCheckRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  if (action === "status") {
    return json({
      ok: true,
      state,
      models: Object.values(state.models).map(({ ...rest }) => rest),
      modelsError: "",
      runtime: "demo",
      piError: null,
      summary: "📊 5 models · 2 ok · 1 rate-limited · 1 error · 1 untested",
      recover: { pending: false, last: null },
    });
  }
  if (action === "availability") {
    return json({ total: 5, ok: 2, blocked: 1, failed: 1, untested: 1, available: true, recent: [] });
  }
  if (action === "balance") {
    return json({ ok: true, refreshed: request.query("refresh") === "1", balances: Object.values(state.balances) });
  }
  if (action === "history") {
    const provider = request.query("provider");
    const model = request.query("model");
    const limit = Math.min(Number(request.query("limit") ?? 50) || 50, 300);
    const history = HISTORY.filter((h) => (!provider || h.provider === provider) && (!model || h.model === model)).slice(0, limit);
    return json({ ok: true, history });
  }
  if (action === "probe" && request.method === "POST") {
    return json({ ok: true, results: [{ provider: "demo", model: "demo-large", ok: true, status: 200, latencyMs: 610, text: "pong" }] });
  }
  if (action === "recover-check") return json({ ok: true, pending: false, recovered: [] });
  if (action === "recover-notify") return json({ ok: true });
  return json({ ok: true });
}
