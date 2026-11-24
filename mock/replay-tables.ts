/**
 * Recorded response tables, loaded on demand.
 *
 * `routes.json` + `routes.en.json` are the route *index*: keys, status, content
 * type, small bodies inline — and, since the first-load chunk governance work,
 * large bodies (see capture/compile.mjs externalization) referenced as
 * `catalog: "demo-mock/catalog/<name>.json"` static files. A static import of
 * the inline tables would put them in the main chunk and parse them before the
 * first paint; the externalized bodies additionally fetch on first route hit and
 * stay cached in-memory, so a boot that never replays a large endpoint never
 * downloads it.
 */
import { demoAssetPath } from "./base-path";
import { getRealFetch } from "./runtime";

/** Legacy refs point at mock/model/catalog (build inputs, replay-skipped). Externalized bodies are static-fetchable. */
const FETCHABLE_CATALOG = /^demo-mock\//;

export type RouteEntry = {
  step?: string;
  status?: number;
  type?: string;
  body?: unknown;
  catalog?: string;
  asset?: unknown;
};
export type RouteTable = Record<string, RouteEntry[]>;

let zh: RouteTable | null = null;
let en: RouteTable | null = null;

async function tables(): Promise<{ zh: RouteTable; en: RouteTable | null }> {
  if (!zh) zh = (await import("./model/routes.json")).default as RouteTable;
  if (en === null) {
    try {
      en = (await import("./model/routes.en.json")).default as RouteTable;
    } catch {
      en = {};
    }
  }
  return { zh, en };
}

/** Merged table for the current UI locale (en overrides win). */
export async function routeTable(): Promise<RouteTable> {
  const { zh: zhTable, en: enTable } = await tables();
  const { currentDemoLocale } = await import("./locale");
  return currentDemoLocale() === "en" && enTable ? { ...zhTable, ...enTable } : zhTable;
}

const catalogCache = new Map<string, Promise<unknown>>();

/**
 * Materialize one route entry: externalized bodies fetch from their static file
 * on first use (cached in-memory; the fetch layer is the browser's own, so the
 * static host's cache headers apply). A failed fetch keeps the catalog marker so
 * the caller's skip logic treats it as absent (falls through to the next
 * candidate or 404, exactly like a missing body).
 */
export async function resolveEntry(entry: RouteEntry | undefined): Promise<RouteEntry | undefined> {
  if (!entry?.catalog || !FETCHABLE_CATALOG.test(entry.catalog)) return entry;
  let file = catalogCache.get(entry.catalog);
  if (!file) {
    file = getRealFetch()(demoAssetPath(`/${entry.catalog}`))
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error(`HTTP ${response.status}`))))
      .catch(() => null);
    catalogCache.set(entry.catalog, file);
  }
  const body = await file;
  return body !== null ? { ...entry, body } : entry;
}

/** First recorded body for a route key (used by hand-written mocks that refine a recorded payload). */
export async function loadRecordedBody(key: string): Promise<Record<string, unknown> | null> {
  const table = await routeTable();
  const entry = await resolveEntry(table[key]?.[0]);
  const body = entry?.body;
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}
