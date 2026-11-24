/**
 * Demo boot prefetch.
 *
 * `aiti-model-wizard` splits into a thin shell + a heavy chunk that registers
 * the "new models discovered" toast. The shell only warms the chunk when its
 * `…:new-models-changed` event fires (first interaction in production), so a
 * page that is merely looked at never reaches the toast code.
 *
 * The demo dispatches that event after boot — the same path the extension uses
 * internally — with a few bounded retries because extension clients materialize
 * at different times than the app shell. Each attempt is skipped once the toast
 * is on screen, so it stops as soon as it worked (no polling).
 */
const ATTEMPTS_MS = [2_000, 5_000, 9_000];

function toastVisible(): boolean {
  for (const el of document.querySelectorAll<HTMLElement>("div")) {
    const style = getComputedStyle(el);
    if (style.position === "fixed" && style.backgroundColor.startsWith("rgba(22, 163, 74")) return true;
  }
  return false;
}

export function prefetchDemoHeavyChunks(): void {
  if (typeof window === "undefined") return;
  const flag = "__piWebDemoPrefetched";
  const store = window as unknown as Record<string, unknown>;
  if (store[flag]) return;
  store[flag] = true;
  for (const delay of ATTEMPTS_MS) {
    window.setTimeout(() => {
      if (toastVisible()) return;
      try {
        window.dispatchEvent(new Event("aiti-model-wizard:new-models-changed"));
      } catch { /* non-fatal */ }
    }, delay);
  }
}
