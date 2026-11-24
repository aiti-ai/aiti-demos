/**
 * Replay layer: serve recorded responses for endpoints the hand-written mock
 * does not cover (session backends, MCP config, provider usage, models,
 * settings panels, and read-only POST probes such as git-review /tasks).
 * Hand-written routes always win; the framework endpoints and asset files stay
 * with the static extension tier.
 *
 * Recorded bodies are zh-rich; mock/model/routes.en.json holds English
 * overrides for the CJK-bearing routes (built by mock/model/build-routes-en.mjs).
 * Under the en UI locale the en overrides win per route key; every other key
 * falls back to the recorded table. zh keeps routes.json unchanged.
 */
import routes from "./model/routes.json";
import routesEn from "./model/routes.en.json";
import { currentDemoLocale } from "./locale";
import type { MockRequest } from "./http";

type Entry = {
  step?: string;
  status?: number;
  type?: string;
  body?: unknown;
  catalog?: string;
  asset?: unknown;
};

const recordedTable = routes as Record<string, Entry[]>;
const enOverrides = routesEn as Record<string, Entry[]>;
const enTable = { ...recordedTable, ...enOverrides };

/** Locale-aware lookup table: en overrides win, everything else falls back. */
function tableForLocale(): Record<string, Entry[]> {
  return currentDemoLocale() === "en" ? enTable : recordedTable;
}

function candidates(request: MockRequest): string[] {
  const query = request.url.search.replace(/^\?/, "");
  return [
    `${request.method} ${request.path}${query ? `?${query}` : ""}`,
    `${request.method} ${request.path}`,
  ];
}

/** GET-only guards that must never be replayed for writes. */
const WRITE_GUARD = /\/(delete|remove|uninstall|reset|logout|shutdown|kill|purge)\b/i;

export function replayRoutes(request: MockRequest): Response | null {
  // Reads replay always; writes replay only for extension-owned APIs whose
  // recorded POST bodies are pure reads-in-disguise (git-review /tasks, /refs,
  // /hasChanges, /files; search and probe endpoints). Anything destructive is
  // excluded so a click can never look like it mutated real state.
  const isWrite = request.method !== "GET";
  if (isWrite) {
    if (!request.path.startsWith("/api/extensions/")) return null;
    if (WRITE_GUARD.test(request.path)) return null;
  }
  // Extension framework endpoints and asset files stay with the static tier;
  // extension-owned API reads are replayed from the recorded model.
  if (request.path.startsWith("/api/extensions/")) {
    const action = request.segments[2];
    if (["manifest", "status", "client-bundle", "reload"].includes(action)) return null;
    if (request.segments[3] === "assets") return null;
  }
  // Agent/session/terminal streams and state machines stay hand-written.
  if (request.path.startsWith("/api/agent/")) return null;
  if (request.path.startsWith("/api/sessions/")) return null;
  if (request.path.startsWith("/api/terminal")) return null;
  if (request.path.startsWith("/api/files")) return null;

  const table = tableForLocale();
  for (const key of candidates(request)) {
    const entries = table[key];
    if (!entries?.length) continue;
    const entry = entries[0];
    if (entry.catalog || entry.asset || entry.body === undefined || entry.body === null) continue;
    const body = typeof entry.body === "string" ? entry.body : JSON.stringify(entry.body);
    return new Response(body, {
      status: entry.status ?? 200,
      headers: {
        "content-type": entry.type ?? "application/json",
        "cache-control": "no-store",
        "x-demo-replay": "1",
      },
    });
  }
  return null;
}
