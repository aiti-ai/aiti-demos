/**
 * Recorded response tables, loaded on demand.
 *
 * `routes.json` + `routes.en.json` are ~1.7MB of JSON. A static import puts both
 * into the main client chunk, where they are parsed before the first paint; the
 * demo only needs them when an endpoint actually falls through to replay.
 */
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

/** First recorded body for a route key (used by hand-written mocks that refine a recorded payload). */
export async function loadRecordedBody(key: string): Promise<Record<string, unknown> | null> {
  const table = await routeTable();
  const body = table[key]?.[0]?.body;
  return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
}
