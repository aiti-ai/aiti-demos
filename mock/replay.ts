/**
 * Replay layer: serve recorded GET responses for endpoints the hand-written
 * mock does not cover (session backends, MCP config, provider usage, models,
 * settings panels, …). Hand-written routes always win; extension APIs stay
 * with the static extension tier.
 */
import routes from "./model/routes.json";
import type { MockRequest } from "./http";

type Entry = {
  step?: string;
  status?: number;
  type?: string;
  body?: unknown;
  catalog?: string;
  asset?: unknown;
};

const table = routes as Record<string, Entry[]>;

function candidates(request: MockRequest): string[] {
  const query = request.url.search.replace(/^\?/, "");
  return [
    `${request.method} ${request.path}${query ? `?${query}` : ""}`,
    `${request.method} ${request.path}`,
  ];
}

export function replayRoutes(request: MockRequest): Response | null {
  if (request.method !== "GET") return null;
  // Extension APIs are owned by the curated static tier; the full recorded
  // manifest would point at bundles the demo does not ship.
  if (request.path.startsWith("/api/extensions/")) return null;
  // Agent/session/terminal streams and state machines stay hand-written.
  if (request.path.startsWith("/api/agent/")) return null;
  if (request.path.startsWith("/api/sessions/")) return null;
  if (request.path.startsWith("/api/terminal")) return null;
  if (request.path.startsWith("/api/files")) return null;

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
