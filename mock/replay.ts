/**
 * Replay layer: serve recorded responses for endpoints the hand-written mock
 * does not cover (session backends, MCP config, provider usage, models,
 * settings panels, and read-only POST probes such as git-review /tasks).
 * Hand-written routes always win; the framework endpoints and asset files stay
 * with the static extension tier.
 *
 * The recorded tables live in ./replay-tables.ts and load on demand: together
 * they are ~1.7MB of JSON, so a static import would put them in the main chunk
 * and parse them before the first paint.
 */
import type { MockRequest } from "./http";
import { routeTable, resolveEntry } from "./replay-tables";

/** Writes are replayed only for read-only probes; anything destructive is refused. */
const WRITE_GUARD = /\/(delete|remove|uninstall|reset|logout|shutdown|kill|purge)\b/i;

function candidates(request: MockRequest): string[] {
  const query = request.url.search.replace(/^\?/, "");
  return [
    `${request.method} ${request.path}${query ? `?${query}` : ""}`,
    `${request.method} ${request.path}`,
  ];
}

export async function replayRoutes(request: MockRequest): Promise<Response | null> {
  // Reads replay always; writes replay only for extension-owned APIs whose
  // recorded POST bodies are pure reads-in-disguise (git-review /tasks, /refs,
  // /hasChanges, /files; search and probe endpoints).
  const isWrite = request.method !== "GET";
  if (isWrite) {
    if (!request.path.startsWith("/api/extensions/")) return null;
    if (WRITE_GUARD.test(request.path)) return null;
  }
  // Extension framework endpoints and asset files stay with the static tier.
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

  const table = await routeTable();
  for (const key of candidates(request)) {
    const entries = table[key];
    if (!entries?.length) continue;
    // Externalized bodies (entry.catalog → demo-mock catalog file) fetch on first
    // hit; a failed fetch keeps the marker so this candidate still falls through.
    const entry = await resolveEntry(entries[0]);
    if (!entry || entry.catalog || entry.asset || entry.body === undefined || entry.body === null) continue;
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
