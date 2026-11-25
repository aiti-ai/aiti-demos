/**
 * Routes a Pi Web `/api/*` request to its in-browser mock. Handlers mirror the
 * real route handlers under app/api in the main project: same paths, methods
 * and response shapes.
 */
import { buildEntriesFromFiles, filterFileEntries } from "@/lib/file-fuzzy";
import { MockEventSource } from "./event-source";
import { MockRequest, delay, error, json } from "./http";
import { setRealFetch } from "./runtime";
import { HOME, PROJECT_ROOT, SCRATCH_ROOT, WORKTREE_BRANCH, WORKTREE_ROOT } from "./paths";
import { assetUrl, decodeFileTicket, encodeFileTicket, fileMeta, isBinaryPath, listDirectory, lookup, mimeFor, primeAssetLookup, projectFiles, readFileText, textChunk, PROJECT_ROOTS } from "./files";
import { getRealFetch } from "./runtime";
import { gitDiff, gitStatus } from "./git";
import { agentState, attachAgentStream, createRuntimeSession, runAgentCommand, runningSessionIds } from "./agent";
import {
  allSessions,
  buildContext,
  ensureSessionBuilt,
  deleteSession,
  ensureSessions,
  getSession,
  markTouched,
  sessionDetail,
  sessionInfo,
  sessionListVersion,
  bumpSessionListVersion,
} from "./sessions/store";
import { searchSessions } from "./search";
import { autoTitle } from "./replies";
import { demoOnlyMessage } from "./unavailable";
import { settingsRoutes } from "./settings-routes";
import { extensionsRoute } from "./extensions";
import { replayRoutes } from "./replay";
import { attachTerminalStream, terminalRoutes } from "./terminal";
import { hostingRoute } from "./session-hosting";

type Handler = (request: MockRequest) => Promise<Response> | Response;

function projectRoot(cwd: string | null): string | null {
  if (!cwd) return null;
  return PROJECT_ROOTS.find((root) => cwd === root || cwd.startsWith(`${root}/`)) ?? null;
}

function sessionsPayload() {
  return {
    sessions: allSessions().filter((session) => !session.transient).map(sessionInfo),
    sessionListVersion: sessionListVersion(),
    runningSessionIds: runningSessionIds(),
    completionNotificationSuppressedSessionIds: [],
  };
}

async function sessionsRoute(request: MockRequest): Promise<Response> {
  const [, , id, sub, entryId, leaf] = request.segments; // api / sessions / :id / ...
  if (!id) return json(sessionsPayload());
  if (id === "search") {
    const query = request.query("q") ?? "";
    if (query.length > 200) return error("Search query exceeds 200 characters", 400);
    return json(await searchSessions(query));
  }
  await ensureSessionBuilt(id);
  const session = getSession(id);
  if (!session) return error("Session not found", 404);
  if (!sub) {
    if (request.method === "PATCH") {
      const body = await request.json<{ name?: string }>();
      if (typeof body.name !== "string") return error("name is required", 400);
      session.name = body.name.trim() || undefined;
      markTouched();
      bumpSessionListVersion();
      return json({ ok: true });
    }
    if (request.method === "DELETE") {
      deleteSession(id);
      return json({ ok: true });
    }
    return json(sessionDetail(session, request.url.searchParams));
  }
  if (sub === "context") {
    const leafId = request.query("leafId") ?? undefined;
    const before = request.query("before") ?? undefined;
    const rawTail = Number(request.query("tail"));
    const tail = Number.isFinite(rawTail) && rawTail > 0 ? Math.min(rawTail, 1000) : 50;
    const context = buildContext(session, before ?? leafId ?? session.leafId, {
      deferThinking: request.url.searchParams.has("deferThinking"),
      tail,
      excludeLeaf: Boolean(before),
    });
    return json({ context, tail, before: before ?? null });
  }
  if (sub === "state") {
    return session.live ? json({ running: true, state: await agentState(session) }) : json({ running: false });
  }
  if (sub === "hosting") return hostingRoute(request, session);
  if (sub === "auto-name") {
    await delay(900);
    const title = autoTitle(session);
    session.name = title;
    markTouched();
    bumpSessionListVersion();
    return json({ title, usage: null });
  }
  if (sub === "entries" && entryId && leaf === "thinking") {
    const blockIndex = Number(request.query("blockIndex"));
    const entry = session.entries.find((candidate) => candidate.id === entryId);
    if (!entry || entry.type !== "message" || entry.message.role !== "assistant") return error("Assistant message not found", 404);
    const block = entry.message.content[blockIndex];
    if (!block || block.type !== "thinking") return error("Thinking block not found", 404);
    return json({ thinking: block.thinking });
  }
  if (sub === "export") return error(demoOnlyMessage(), 501);
  return error("Not found", 404);
}

async function agentRoute(request: MockRequest): Promise<Response> {
  const [, , id, sub] = request.segments;
  if (id === "running") return json({ sessionListVersion: sessionListVersion(), runningSessionIds: runningSessionIds(), completionNotificationSuppressedSessionIds: [] });
  if (id === "new") return json(createRuntimeSession(await request.json()));
  const session = getSession(id);
  if (sub === "lease") return json({ success: true, renewed: session ? 1 : 0 });
  if (sub === "bash-output") return error(demoOnlyMessage(), 404);
  if (request.method === "GET") {
    if (!session?.live) return json({ running: false });
    return json({ running: true, state: await agentState(session) });
  }
  const command = await request.json<Record<string, unknown>>();
  if (!session) {
    return error("Session not found", 404, command.type === "prompt" ? { code: "prompt_rejected", accepted: false } : {});
  }
  const result = await runAgentCommand(session, command);
  if (!result.ok) return error(result.error, result.status, result.extra);
  if (command.type === "set_tools") return json({ success: true, data: result.data });
  return json({ success: true, data: result.data });
}

async function serveFile(filePath: string, type: string, offset: number): Promise<Response> {
  const found = await lookup(filePath);
  if (!projectRoot(filePath)) return error("Access denied", 403);
  if (!found) return error("Not found", 404);
  if (type === "list") {
    if (found.kind !== "dir") return error("Not a directory", 400);
    return json({ entries: await listDirectory(filePath), path: filePath });
  }
  if (found.kind !== "file") return error("Not a file", 400);
  if (type === "meta") return json({ ...fileMeta(filePath, found.file), mtime: new Date(0).toISOString() });
  if (type === "read" && !isBinaryPath(filePath)) {
    const text = await readFileText(found.file);
    const chunk = textChunk(text, Number.isSafeInteger(offset) ? offset : 0);
    return json({ ...chunk, language: fileMeta(filePath, found.file).language, mtime: new Date(0).toISOString() });
  }
  if (type === "read" || type === "download" || type === "preview") {
    const asset = assetUrl(found.file);
    if (!asset) return error("Not found", 404);
    return getRealFetch()(asset);
  }
  return error("Invalid file request type", 400);
}

async function filesRoute(request: MockRequest): Promise<Response> {
  // Current host channels: POST /api/files/get (path in body) and
  // POST /api/files/ticket (GET-only consumers). The legacy GET path stays.
  if (request.method === "POST") {
    const action = request.segments[2];
    if (action === "ticket") {
      const body = await request.json<{ path?: string; type?: string }>();
      if (!body.path || !body.type) return error("path and type are required", 400);
      return json({ ticket: encodeFileTicket(body.path, body.type) });
    }
    if (action === "get") {
      const body = await request.json<{ path?: string; type?: string; offset?: number }>();
      if (!body.path || !body.type) return error("path and type are required", 400);
      return serveFile(body.path, body.type, Number(body.offset ?? request.query("offset") ?? 0));
    }
    return error(demoOnlyMessage(), 501);
  }
  // GET /api/files/_t/<ticket>: the mock ticket carries the path.
  if (request.segments[2] === "_t") {
    const ticket = decodeFileTicket(request.segments[3] ?? "");
    if (!ticket) return error("Invalid ticket", 400);
    return serveFile(ticket.path, request.query("type") ?? ticket.type, Number(request.query("offset") ?? 0));
  }
  const filePath = "/" + request.segments.slice(2).join("/");
  const type = request.query("type") ?? "list";
  const offset = Number(request.query("offset") ?? 0);
  return serveFile(filePath, type, offset);
}

async function fileIndexRoute(request: MockRequest): Promise<Response> {
  const root = projectRoot(request.query("cwd"));
  if (!root) return error("Access denied", 403);
  const files = (await projectFiles(root)).map((file) => file.path).sort();
  const query = request.query("q");
  if (query) return json({ matches: filterFileEntries(buildEntriesFromFiles(files), query) });
  return json({ files: files.slice(0, 5000), truncated: files.length > 5000 });
}

async function worktreesRoute(request: MockRequest): Promise<Response> {
  if (request.method !== "GET") return error(demoOnlyMessage(), 501);
  const cwd = request.query("cwd");
  const root = projectRoot(cwd);
  if (!root) return error("Access denied", 403);
  if (root === SCRATCH_ROOT) return json({ projectRoot: root, projectKey: root, isGit: false, isTopLevel: true, currentWorktreePath: root, worktrees: [] });
  return json({
    projectRoot: PROJECT_ROOT,
    projectKey: PROJECT_ROOT,
    isGit: true,
    isTopLevel: cwd === root,
    currentWorktreePath: root,
    worktrees: [
      { path: PROJECT_ROOT, branch: "main", isMain: true },
      { path: WORKTREE_ROOT, branch: WORKTREE_BRANCH, isMain: false },
    ],
  });
}

async function cwdRoute(request: MockRequest): Promise<Response> {
  const [, , action] = request.segments;
  if (action === "validate") {
    const body = await request.json<{ cwd?: string }>();
    const raw = (body.cwd ?? "").trim();
    if (!raw) return error("Path is required", 400);
    const cwd = raw === "~" ? HOME : raw.startsWith("~/") ? `${HOME}/${raw.slice(2)}` : raw.replace(/\/+$/, "");
    const root = projectRoot(cwd);
    const found = root ? await lookup(cwd) : null;
    if (!root || !found) return error(`Directory does not exist: ${raw}`, 400);
    if (found.kind !== "dir") return error(`Path is not a directory: ${raw}`, 400);
    const project = root === WORKTREE_ROOT ? PROJECT_ROOT : root;
    return json({ success: true, cwd, projectRoot: project, projectKey: project });
  }
  if (action === "browse") {
    const path = (request.query("path") || HOME).replace(/\/+$/, "") || "/";
    const virtualDirs: Record<string, string[]> = {
      "/": ["Users"],
      "/Users": ["demo"],
      [HOME]: ["code", SCRATCH_ROOT.split("/").pop()!],
      [`${HOME}/code`]: ["pi-web"],
    };
    let names = virtualDirs[path];
    if (!names) {
      const entries = await listDirectory(path);
      if (!entries) return error("Directory not found", 404);
      names = entries.filter((entry) => entry.isDir).map((entry) => entry.name);
    }
    const parent = path === "/" ? null : path.slice(0, path.lastIndexOf("/")) || "/";
    return json({
      path,
      parentPath: parent,
      directories: names.map((name) => ({ name, path: path === "/" ? `/${name}` : `${path}/${name}` })),
    });
  }
  return error("Not found", 404);
}

const ROUTES: Record<string, Handler> = {
  sessions: sessionsRoute,
  agent: agentRoute,
  extensions: extensionsRoute,
  files: filesRoute,
  "file-index": fileIndexRoute,
  worktrees: worktreesRoute,
  cwd: cwdRoute,
  home: () => json({ home: HOME }),
  "default-cwd": () => json({ cwd: SCRATCH_ROOT }),
  "project-trust": () => json({ requiresTrust: false, trusted: true }),
  "app-update": () => {
    const version = process.env.NEXT_PUBLIC_APP_VERSION ?? "0.0.0";
    return json({ currentVersion: version, latestVersion: version, updateAvailable: false, releaseUrl: `https://github.com/aiti-ai/aiti-ai/releases/tag/v${version}` });
  },
  git: async (request) => {
    const cwd = request.query("cwd") ?? "";
    if (request.segments[2] === "diff") return json(await gitDiff(request.query("path") ?? ""));
    return json(await gitStatus(cwd));
  },
  push: () => error("Push notifications are not available in the static demo", 404),
  terminal: terminalRoutes,
};

export async function handleApiRequest(
  url: URL,
  method: string,
  body: BodyInit | null | undefined,
  signal: AbortSignal | null | undefined,
  realFetch: typeof fetch,
): Promise<Response> {
  setRealFetch(realFetch);
  const request = new MockRequest(url, method, body, signal);
  try {
    await ensureSessions();
    await delay(25, signal);
    const group = request.segments[1];
    const handler = ROUTES[group];
    let response = handler ? await handler(request) : await settingsRoutes(request);
    if (response.status === 404 && (!handler || group === "extensions")) response = (await replayRoutes(request)) ?? response;
    if (signal?.aborted) throw new DOMException("The operation was aborted.", "AbortError");
    return response;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") throw cause;
    console.error("[pi-web demo] mock API failed", url.pathname, cause);
    return error(cause instanceof Error ? cause.message : String(cause), 500);
  }
}

/** Resolve an EventSource URL to the mock stream that serves it. */
export function resolveApiStream(url: URL) {
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) return null;
  const segments = url.pathname.split("/").filter(Boolean).map((segment) => decodeURIComponent(segment));
  if (segments[1] === "agent" && segments[3] === "events") {
    const id = segments[2];
    return (source: MockEventSource) => {
      let cleanup: (() => void) | void;
      let cancelled = false;
      void ensureSessions().then(() => {
        if (!cancelled) cleanup = attachAgentStream(id, source);
      });
      return () => {
        cancelled = true;
        cleanup?.();
      };
    };
  }
  if (segments[1] === "files" && url.searchParams.get("type") === "watch") {
    const ticket = segments[2] === "_t" ? decodeFileTicket(segments[3] ?? "") : null;
    const filePath = ticket?.path ?? "/" + segments.slice(2).join("/");
    return (source: MockEventSource) => {
      source.send({ filePath }, "connected");
    };
  }
  if (segments[1] === "terminal" && segments[3] === "events") {
    return (source: MockEventSource) => attachTerminalStream(segments[2], source, url);
  }
  if (segments[1] === "auth" && segments[2] === "login") {
    return (source: MockEventSource) => {
      source.send({ type: "progress", message: "Starting sign-in…" });
      const timer = setTimeout(() => source.send({ type: "error", message: demoOnlyMessage() }), 900);
      return () => clearTimeout(timer);
    };
  }
  return null;
}

/** Warm the manifest so binary previews can map to static assets synchronously. */
export function warmDemoAssets(): void {
  void primeAssetLookup();
}
