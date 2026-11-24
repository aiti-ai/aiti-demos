/**
 * aiti-git-review mock: the review picker fires POST probes on mount
 * (/tasks, /refs, /hasChanges, /files). Those were recorded as request-only
 * (no response body), so replay cannot serve them — without a mock the picker
 * sits on "打开现有审查 · 加载中…" forever.
 *
 * Shapes mirror extensions/aiti-git-review/index.ts.
 */
import type { MockRequest } from "./http";
import { json } from "./http";
import { PROJECT_ROOT } from "./paths";

const DEMO_TASKS = [
  {
    id: "demo-review",
    repo: PROJECT_ROOT,
    scope: { kind: "repo", path: "" },
    base: null,
    ref2: null,
    files: 3,
    annotations: 2,
    createdAt: Date.UTC(2026, 10, 23, 9, 30),
    hasSummary: true,
    boundSessionId: null,
    title: "Review: session stats refactor",
  },
];

const DEMO_REFS = [
  { name: "main", kind: "branch" },
  { name: "feat/session-timer", kind: "branch" },
  { name: "v0.18.0", kind: "tag" },
  { name: "origin/main", kind: "remote" },
];

const DEMO_COMMITS = [
  { id: "0b44857", date: "2026-11-23", subject: "fix(session): handle integrity and queue steering" },
  { id: "65092ae", date: "2026-11-22", subject: "feat(session): hosting snapshot and switch API" },
  { id: "9df9a4f", date: "2026-11-21", subject: "fix(bridge): detect duplicate registration at load" },
];

export async function gitReviewRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  if (action === "tasks") return json({ ok: true, tasks: DEMO_TASKS });
  if (action === "refs") {
    return json({ ok: true, repo: PROJECT_ROOT, head: "main", refs: DEMO_REFS, commits: DEMO_COMMITS });
  }
  if (action === "hasChanges") {
    return json({ ok: true, hasChanges: true, repo: PROJECT_ROOT, file: "." });
  }
  if (action === "files") {
    return json({
      ok: true,
      files: [
        { path: "src/format-duration.ts", status: "M" },
        { path: "src/format-duration.test.mjs", status: "A" },
        { path: "README.md", status: "M" },
      ],
    });
  }
  return json({ ok: true });
}
