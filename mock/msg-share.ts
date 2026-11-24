/**
 * aiti-msg-share mock: the share dialog's method list (/catalog), the user's
 * saved targets (/targets) and the share history (/history).
 *
 * A static demo has no upload credentials, so the real catalog comes back empty
 * and the dialog shows no share options at all. Return a representative demo
 * catalog (image host, pastebin, OSS, note apps, local link) plus two saved
 * targets and a short history.
 *
 * Shapes mirror @aiti-ai/content-share (dist/types.d.ts CatalogEntry) and
 * extensions/aiti-msg-share (publicTarget output).
 */
import type { MockRequest } from "./http";
import { json } from "./http";

type Kind = "text" | "image" | "file" | "session";

const CATALOG = [
  {
    id: "local-link",
    name: "Local link",
    kinds: ["text", "image", "file", "session"] as Kind[],
    category: "local",
    source: "aiti",
    auth: "none",
    recommended: true,
    status: "ok",
    note: { zh: "不上传：本机路径 + 内网访问地址", en: "No upload: local path plus a LAN URL" },
  },
  {
    id: "custom-http",
    name: "Self-hosted paste service",
    kinds: ["text", "file"] as Kind[],
    category: "paste",
    source: "aiti",
    auth: "none",
    recommended: true,
    status: "ok",
    note: { zh: "自建 HTTP 端点（POST + URL 提取）", en: "Any HTTP endpoint (POST with URL extraction)" },
  },
  {
    id: "aliyun-oss",
    name: "Aliyun OSS",
    kinds: ["image", "file"] as Kind[],
    category: "object-storage",
    source: "aiti",
    auth: "key",
    recommended: true,
    status: "ok",
    note: { zh: "对象存储，适合图片与附件", en: "Object storage for images and attachments" },
  },
  {
    id: "github-gist",
    name: "GitHub Gist",
    kinds: ["text"] as Kind[],
    category: "paste",
    source: "sharex",
    auth: "token",
    status: "ok",
  },
  {
    id: "joplin",
    name: "Joplin",
    kinds: ["text", "image", "file"] as Kind[],
    category: "notes",
    source: "aiti",
    auth: "token",
    status: "ok",
  },
  {
    id: "obsidian",
    name: "Obsidian (vault folder)",
    kinds: ["text"] as Kind[],
    category: "notes",
    source: "aiti",
    auth: "none",
    status: "ok",
  },
];

interface ShareTarget {
  id: string;
  provider: string;
  name: string;
  values: Record<string, string>;
  secretKeys: string[];
  tags: string;
  pathPrefix: string;
  enabled: boolean;
}

const TARGETS: ShareTarget[] = [
  {
    id: "demo-oss",
    provider: "aliyun-oss",
    name: "Team bucket",
    values: { bucket: "demo-share", endpoint: "oss-cn-hangzhou.example.invalid", region: "cn-hangzhou", accessKeyId: "LTAI***demo", accessKeySecret: "***" },
    secretKeys: ["accessKeySecret"],
    tags: "team,demo",
    pathPrefix: "share/",
    enabled: true,
  },
  {
    id: "demo-paste",
    provider: "custom-http",
    name: "Self-hosted paste",
    values: { url: "http://127.0.0.1:8931/api/pastes" },
    secretKeys: [],
    tags: "local",
    pathPrefix: "",
    enabled: true,
  },
];

const HISTORY = [
  { id: "h1", targetId: "demo-paste", provider: "custom-http", kind: "text", title: "Session stats popover refactor", url: "http://127.0.0.1:8931/p/demo1", at: Date.UTC(2026, 10, 23, 9, 12), bytes: 4210, redacted: 2 },
  { id: "h2", targetId: "demo-oss", provider: "aliyun-oss", kind: "image", title: "screenshot.png", url: "https://demo-share.oss-cn-hangzhou.example.invalid/share/screenshot.png", at: Date.UTC(2026, 10, 22, 15, 40), bytes: 184_320, redacted: 0 },
  { id: "h3", targetId: "demo-paste", provider: "custom-http", kind: "session", title: "Refactor: extract formatDuration", url: "http://127.0.0.1:8931/p/demo3", at: Date.UTC(2026, 10, 21, 11, 5), bytes: 66_120, redacted: 5 },
];

export async function msgShareRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  if (action === "catalog") return json({ ok: true, targets: CATALOG, count: CATALOG.length });
  if (action === "targets") {
    if (request.method === "GET") return json({ ok: true, targets: TARGETS });
    if (request.method === "POST") {
      const body = await request.json<{ id?: string; provider?: string; name?: string }>();
      const created: ShareTarget = {
        id: body.id ?? "demo-new",
        provider: body.provider ?? "custom-http",
        name: body.name ?? "New target",
        values: {} as Record<string, string>,
        secretKeys: [] as string[],
        tags: "",
        pathPrefix: "",
        enabled: true,
      };
      TARGETS.push(created);
      return json({ ok: true, target: created });
    }
    return json({ ok: true });
  }
  if (action === "history") return json({ ok: true, entries: HISTORY });
  if (action === "containers") {
    return json({ ok: true, containers: [{ id: "demo-vault", label: "Demo notes", parent: null, path: "Demo" }] });
  }
  if (action === "share" && request.method === "POST") {
    return json({
      ok: true,
      url: "http://127.0.0.1:8931/p/demo-mock",
      rawUrl: "http://127.0.0.1:8931/raw/demo-mock",
      provider: "custom-http",
      redactions: 3,
      bytes: 4210,
      message: "Static demo: the link is simulated, nothing was uploaded.",
    });
  }
  if (action === "preview-redact") {
    const body = await request.json<{ text?: string }>();
    return json({ ok: true, text: body.text ?? "", redactions: 0 });
  }
  if (action === "refresh" && request.method === "POST") return json({ ok: true, count: CATALOG.length });
  if (action === "probe") return json({ ok: true, reachable: true, status: 200, latencyMs: 42 });
  return json({ ok: true });
}
