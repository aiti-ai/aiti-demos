/**
 * aiti-editor mock: enough of the ticket/read/save API for the in-browser
 * editor takeover to work on demo project files. The real extension signs
 * short-lived path tickets so file paths never enter URLs; the mock issues a
 * deterministic base64url ticket carrying the same payload.
 */
import type { MockRequest, } from "./http";
import { error, json } from "./http";
import { lookup } from "./files";

function encodeTicket(path: string): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ path }));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return "demo:" + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodeTicket(raw: string): string | null {
  try {
    const ticket = decodeURIComponent(raw);
    if (!ticket.startsWith("demo:")) return null;
    const base = ticket.slice(5).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base);
    const parsed = JSON.parse(new TextDecoder().decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)))) as { path?: string };
    return typeof parsed.path === "string" ? parsed.path : null;
  } catch {
    return null;
  }
}

async function readProjectFile(path: string): Promise<string | null> {
  const found = await lookup(path);
  if (!found || found.kind !== "file") return null;
  const { readFileText } = await import("./files");
  try {
    return await readFileText(found.file);
  } catch {
    return null;
  }
}

const overrides = new Map<string, string>();

export async function editorRoute(request: MockRequest): Promise<Response> {
  const parts = request.segments.slice(3);
  // POST /api/extensions/aiti-editor/ticket {filePath}
  if (parts[0] === "ticket" && request.method === "POST") {
    const body = await request.json<{ filePath?: string }>();
    if (!body.filePath) return error("filePath is required", 400);
    const content = await readProjectFile(body.filePath);
    if (content === null) return error("路径不在白名单内", 400);
    return json({ ok: true, ticket: encodeTicket(body.filePath), expiresIn: 3600 });
  }
  const ticketPath = parts[0] === "t" ? decodeTicket(parts[1] ?? "") : null;
  if (!ticketPath) return error("ticket 无效或已过期", 403);
  const endpoint = parts[2];
  if (endpoint === "stat") {
    const content = await readProjectFile(ticketPath);
    if (content === null) return error("文件不存在", 404);
    return json({ ok: true, mtimeMs: 0, size: content.length });
  }
  if (endpoint === "file") {
    const content = (overrides.get(ticketPath) ?? await readProjectFile(ticketPath));
    if (content === null) return error("文件不存在", 404);
    return new Response(content, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" } });
  }
  if (endpoint === "raw") {
    const content = (overrides.get(ticketPath) ?? await readProjectFile(ticketPath));
    if (content === null) return error("文件不存在", 404);
    return json({ ok: true, content, encoding: "utf-8", hasBOM: false });
  }
  if (endpoint === "git-changes") {
    const projectRelative = ticketPath.startsWith("/Users/demo/code/pi-web/") ? ticketPath.slice("/Users/demo/code/pi-web/".length) : null;
    const changed = projectRelative ? ["README.md", "docs/guide.md", "src/format-duration.ts"].includes(projectRelative) : false;
    return json({ ok: true, isRepo: true, changed, status: changed ? "M" : null, adds: null, dels: null, worktreeEol: "lf" });
  }
  if (endpoint === "git-base") {
    // gitHasDelta only turns on when changed/dirty; return a real baseline so
    // the ⇋ HEAD diff view works. Baseline = the file from the snapshot
    // manifest (before in-memory edits), matching the "snapshot vs edit" model.
    const original = (await readProjectFile(ticketPath)) ?? "";
    return json({
      ok: true,
      original,
      base: "HEAD",
      hasBaseline: true,
      baselineEol: "lf",
      baselineBytes: original.length,
      baselineLines: original ? original.split("\n").length - (original.endsWith("\n") ? 1 : 0) : 0,
    });
  }
  if (endpoint === "save" && request.method === "POST") {
    const body = await request.json<{ content?: string; filePath?: string }>();
    if (typeof body.content !== "string") return error("content is required", 400);
    overrides.set(body.filePath ?? ticketPath, body.content);
    return json({ ok: true, mtimeMs: Date.now(), size: body.content.length });
  }
  if (endpoint === "prefs") {
    return json({ ok: true, prefs: {} });
  }
  return json({ ok: true });
}
