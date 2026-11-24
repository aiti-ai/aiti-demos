/**
 * session-manager mock: the sidebar takeover lists sessions through this
 * extension's API. Build the payload from the demo session store so the
 * sidebar always shows the full tutorial set (the recorded capture only ever
 * contained the recording instance's three sessions).
 *
 * Wire shape = the extension's v2 compact encoding (fmt: 2): cwd/projectRoot
 * become indexes into `cwds`, ISO timestamps become epoch-ms (ct/mt).
 */
import type { MockRequest } from "./http";
import { error, json } from "./http";
import { allSessions, ensureSessions, sessionListVersion } from "./sessions/store";

function buildPayload() {
  const cwds: string[] = [];
  const idx = new Map<string, number>();
  const enumOf = (v: string | undefined): number | undefined => {
    if (!v) return undefined;
    let i = idx.get(v);
    if (i === undefined) {
      i = cwds.length;
      cwds.push(v);
      idx.set(v, i);
    }
    return i;
  };
  const rows = allSessions().map((session) => {
    const entries = session.entries;
    const messages = entries.filter((e) => (e as { type?: string }).type === "message");
    const first = messages[0] as { message?: { content?: Array<{ type: string; text?: string }> } } | undefined;
    const last = messages[messages.length - 1] as { message?: { role?: string; content?: Array<{ type: string; text?: string }>; provider?: string; model?: string } } | undefined;
    const textOf = (m: typeof first) => {
      const content = m?.message?.content;
      if (typeof content === "string") return content;
      const block = Array.isArray(content) ? content.find((b) => b.type === "text") : null;
      return (block as { text?: string } | undefined)?.text ?? "";
    };
    // Timestamps come from the session entries so relative times ("10 minutes
    // ago") match each tutorial script's authored schedule.
    const times = entries
      .map((e) => Date.parse((e as { timestamp?: string }).timestamp ?? ""))
      .filter((t) => Number.isFinite(t));
    const createdMs = times[0] ?? Date.now() - 3600_000;
    const modifiedMs = times[times.length - 1] ?? createdMs;
    const row: Record<string, unknown> = {
      id: session.id,
      messageCount: messages.length,
      firstMessage: textOf(first).slice(0, 200),
      lastMessage: textOf(last).slice(0, 200),
      name: session.name,
      lastRole: last?.message?.role ?? "user",
      ...(last?.message?.model ? { model: last.message.model } : {}),
      lastRun: { status: "interrupted", at: new Date(modifiedMs).toISOString() },
      cwd: session.cwd,
      projectRoot: session.cwd,
      created: new Date(createdMs).toISOString(),
      modified: new Date(modifiedMs).toISOString(),
    };
    const c = enumOf(session.cwd);
    if (c !== undefined) { row.c = c; delete row.cwd; }
    const rt = enumOf(session.cwd);
    if (rt !== undefined) { row.r = rt; delete row.projectRoot; }
    if (Number.isFinite(createdMs)) { row.ct = createdMs; delete row.created; }
    if (Number.isFinite(modifiedMs)) { row.mt = modifiedMs; delete row.modified; }
    return row;
  });
  return {
    rev: `demo-${sessionListVersion()}`,
    fmt: 2 as const,
    cwds,
    sessions: rows,
    archived: [],
    archiveAgents: [],
  };
}

export async function sessionManagerRoute(request: MockRequest): Promise<Response> {
  const sub = request.segments[3];
  if (sub === "sessions") {
    await ensureSessions();
    return json(buildPayload());
  }
  if (sub === "workspaces") {
    await ensureSessions();
    const byCwd = new Map<string, number>();
    for (const s of allSessions()) byCwd.set(s.cwd, (byCwd.get(s.cwd) ?? 0) + 1);
    return json({
      rev: `demo-${sessionListVersion()}`,
      workspaces: [...byCwd.entries()].map(([key, count]) => ({
        key,
        root: key,
        name: key.split("/").pop() ?? key,
        lastModified: new Date().toISOString(),
        sessionCount: count,
        runningCount: 0,
        unreadCount: 0,
      })),
    });
  }
  if (sub === "session-tags") {
    // Clean tag state: the recorded payload referenced capture-run session ids
    // that do not exist in the demo store.
    return json({ version: 1, favoriteIds: [], tags: [], sessionTags: {} });
  }
  // Unknown sub-resource: 404 so the router falls through to the recorded
  // replay layer (sources, archive/status, git-ops-capabilities, ...). A wrong
  // -shaped 200 here crashes the client (e.g. tagData without favoriteIds).
  return error(`Not found: ${request.path}`, 404);
}
