/**
 * Demo boot seed: show several open folder docks.
 *
 * aiti-folder keeps its multi-instance manifest in localStorage
 * (`pi:sidebar-dock:folders`, `{p}` / `{p, pin:1}`; key gets an `@/<basePath>`
 * suffix on sub-path deployments). A fresh visitor sees a single folder block,
 * so the demo pre-seeds a few directories that the mock file layer can browse.
 *
 * Only seeds when the key is absent — a visitor's own arrangement always wins.
 */
const INSTANCES_KEY = "pi:sidebar-dock:folders";

/** [path, pinned, expanded] — pinned blocks survive the unpinned FIFO quota
 *  (default 3); expanded blocks ship with their tree open so the demo shows
 *  several live folder trees at once instead of four collapsed headers. */
const DEMO_FOLDERS: Array<[string, boolean, boolean]> = [
  ["/Users/demo/code/pi-web", true, false],
  ["/Users/demo/code/pi-web/docs", false, true],
  ["/Users/demo/code/pi-web/extensions", false, true],
  ["/Users/demo/pi-cwd-20260918", false, true],
];

const COLLAPSE_PREFIX = "pi:sidebar-dock:collapsed:";
const FOLDER_KEY_PREFIX = "aiti-folder:folder:";

/**
 * Seed the demo folder manifest.
 *
 * Called twice: once at module load (before the app renders) and once after the
 * app has hydrated. The second pass exists because aiti-folder's manifest is
 * read by an extension client that can import *before* this module on some
 * loads; its project sync then rewrites the manifest with just the current
 * folder. Re-applying is safe: it only fills in a manifest that still looks
 * untouched (0–1 entries), so a visitor's own arrangement always wins.
 */
export function seedDemoFolderDocks(): void {
  if (typeof window === "undefined") return;
  try {
    // Sub-path deployments scope their own key; seed the one this page resolves to.
    const base = window.location.pathname.match(/^\/([A-Za-z0-9._-]+)(?:\/|$)/)?.[1];
    const key = `${INSTANCES_KEY}${base ? `@/${base}` : ""}`;
    const raw = window.localStorage.getItem(key);
    let current: unknown[] = [];
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      current = Array.isArray(parsed) ? parsed : [];
    } catch { current = []; }
    if (current.length <= 1) {
      const entries = DEMO_FOLDERS.map(([p, pin]) => (pin ? { p, pin: 1 } : { p }));
      window.localStorage.setItem(key, JSON.stringify(entries));
    }
    // Always nudge the dock once: the sidebar orchestrator may have built its
    // block list from an earlier snapshot of this manifest on a cold load.
    window.dispatchEvent(new Event("pi:sidebar-dock:folders-changed"));
    // Block collapse state is its own key per block (seeded like the extension does).
    for (const [p, , expanded] of DEMO_FOLDERS) {
      const collapseKey = `${COLLAPSE_PREFIX}${FOLDER_KEY_PREFIX}${p}`;
      if (window.localStorage.getItem(collapseKey) === null) {
        window.localStorage.setItem(collapseKey, expanded ? "0" : "1");
      }
    }
  } catch {
    // Storage unavailable: the visitor simply sees the default single folder.
  }
}
