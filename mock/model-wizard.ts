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
import { json } from "./http";

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

  // Status/config stay on the recorded replay layer.
  return json({ ok: true });
}
