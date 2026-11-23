#!/usr/bin/env node
/**
 * Prepare an isolated capture run: temp agent dir, demo project (git), sessions,
 * models/settings, and web data. Nothing reads the operator's real pi data.
 *
 *   node capture/seed.mjs [--run <id>]
 *
 * Prints JSON {runDir, agentDir, dataDir, projectDir, sessionsDir, webDataDir}.
 */
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const runId = args.find((a) => a.startsWith("--run="))?.slice("--run=".length)
  ?? (args.includes("--run") ? args[args.indexOf("--run") + 1] : undefined)
  ?? new Date().toISOString().replace(/[:.]/g, "-");
const runDir = join(demoDir, "capture", "runs", runId);

if (existsSync(runDir)) rmSync(runDir, { recursive: true, force: true });
const agentDir = join(runDir, "agent");
const dataDir = join(runDir, "web-data");
const projectDir = join(runDir, "project");
const sessionsDir = join(agentDir, "sessions");
const webDataDir = dataDir;

function write(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

function projectFile(rel, content) {
  write(join(projectDir, rel), content);
}

function sessionHeader(id, cwd, timestamp, name) {
  return [
    { type: "session", version: 3, id, timestamp, cwd },
    ...(name ? [{ type: "session_info", id: "info-1", parentId: null, timestamp, name }] : []),
  ];
}

function entry(id, parentId, timestamp, message) {
  return { type: "message", id, parentId, timestamp, message };
}

const now = Date.UTC(2026, 10, 23, 12, 0, 0);
const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();

function writeSession(id, name, minutesAgo, lines) {
  const dir = join(sessionsDir, "demo");
  mkdirSync(dir, { recursive: true });
  const stamp = iso(minutesAgo).replace(/[:.]/g, "-");
  const header = sessionHeader(id, projectDir, iso(minutesAgo), name);
  writeFileSync(join(dir, `${stamp}_${id}.jsonl`), [...header, ...lines].map((line) => JSON.stringify(line)).join("\n") + "\n");
}

const projectReadme = `# Demo Project

A tiny project used by the static demo to exercise the file explorer, Markdown
preview, Git status/diff, tables, Mermaid and the image viewer.

## Quick start

\`\`\`bash
npm install
npm run dev
\`\`\`

| Area | What it shows |
| --- | --- |
| Files | text, Markdown, images, tables |
| Git | modified files and diffs |
| Chat | tool calls and changed-file chips |

\`\`\`mermaid
graph TD
  Browser --> Server
  Server --> Agent
\`\`\`
`;

projectFile("README.md", projectReadme);
projectFile("package.json", JSON.stringify({ name: "demo-project", private: true, version: "0.1.0" }, null, 2) + "\n");
projectFile("src/app.ts", `export function greet(name: string): string {\n  return \`Hello, \${name}!\`;\n}\n\nexport const answer = 42;\n`);
projectFile("src/utils.ts", `import { greet } from "./app";\n\nexport function shout(name: string): string {\n  return greet(name).toUpperCase();\n}\n`);
projectFile("src/format-duration.ts", `export function formatDuration(ms: number): string {\n  if (!Number.isFinite(ms) || ms <= 0) return "0s";\n  const total = Math.floor(ms / 1000);\n  const hours = Math.floor(total / 3600);\n  const minutes = Math.floor((total % 3600) / 60);\n  const seconds = total % 60;\n  return [hours ? \`\${hours}h\` : "", minutes ? \`\${minutes}m\` : "", seconds || (!hours && !minutes) ? \`\${seconds}s\` : ""].filter(Boolean).join(" ");\n}\n`);
projectFile("src/format-duration.test.mjs", `import assert from "node:assert/strict";\nimport { test } from "node:test";\nimport { formatDuration } from "./format-duration.ts";\n\ntest("formats", () => {\n  assert.equal(formatDuration(42_000), "42s");\n  assert.equal(formatDuration(0), "0s");\n});\n`);
projectFile("docs/guide.md", `# Guide\n\n- Open a file in the explorer.\n- Edit it and watch **Git changes**.\n- Open the *changed files* view.\n\n> The demo never touches a real repository.\n`);
projectFile("docs/table.csv", `name,kind,notes\nalpha,text,first\nbeta,image,second\ngamma,table,third\n`);
projectFile("assets/logo.svg", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#6366f1"/><path d="M18 40 32 18l14 22-14-7z" fill="#fff"/></svg>\n`);
projectFile("assets/pixel.png", Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lK3Q6wAAAABJRU5ErkJggg==",
  "base64",
));
projectFile(".gitignore", "node_modules/\n");

try {
  execFileSync("git", ["init", "-q"], { cwd: projectDir });
  execFileSync("git", ["config", "user.email", "demo@example.invalid"], { cwd: projectDir });
  execFileSync("git", ["config", "user.name", "Demo"], { cwd: projectDir });
  execFileSync("git", ["add", "-A"], { cwd: projectDir });
  execFileSync("git", ["commit", "-qm", "Initial demo project"], { cwd: projectDir });
} catch (error) {
  console.error("[seed] git init failed:", String(error).slice(0, 200));
}

write(join(agentDir, "models.json"), JSON.stringify({
  providers: {
    demo: {
      name: "Demo Gateway",
      baseUrl: "https://llm.example.invalid/v1",
      api: "openai-completions",
      apiKey: "static-demo-no-credential",
      models: [
        { id: "demo-large", name: "Demo Large", reasoning: true, input: ["text", "image"], contextWindow: 200_000, maxTokens: 32_768, cost: { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2 } },
        { id: "demo-small", name: "Demo Small", reasoning: false, input: ["text"], contextWindow: 64_000, maxTokens: 8_192, cost: { input: 0.2, output: 1, cacheRead: 0.02, cacheWrite: 0.2 } },
      ],
    },
  },
}, null, 2) + "\n");
write(join(agentDir, "settings.json"), JSON.stringify({
  defaultProvider: "demo",
  defaultModel: "demo-large",
  defaultThinkingLevel: "medium",
}, null, 2) + "\n");
write(join(agentDir, "auth.json"), "{}\n");
write(join(agentDir, "mcp.json"), JSON.stringify({ mcpServers: {} }, null, 2) + "\n");
write(join(agentDir, "skills", "demo-helper", "SKILL.md"), `---\nname: demo-helper\ndescription: A tiny demo skill shown in the Skills settings page.\n---\n\n# Demo helper\n\nThis skill exists only for the static demo.\n`);

writeSession("demo-welcome", "👋 Welcome to Pi Web — a quick tour", 10, [
  entry("u1", null, iso(10), { role: "user", content: [{ type: "text", text: "Hi! Give me a quick tour of this screen." }] }),
  entry("a1", "u1", iso(9), {
    role: "assistant",
    provider: "demo",
    model: "Demo Large",
    content: [
      { type: "thinking", thinking: "I should introduce the layout and point at the demo files." },
      { type: "text", text: "Let me open the README first." },
      { type: "toolCall", id: "call-1", name: "read", arguments: { path: "README.md" } },
    ],
    usage: { input: 1200, output: 180, cacheRead: 0, cacheWrite: 0, totalTokens: 1380, cost: { input: 0.0024, output: 0.0018, cacheRead: 0, cacheWrite: 0, total: 0.0042 } },
  }),
  { type: "message", id: "tr1", parentId: "a1", timestamp: iso(9), message: { role: "toolResult", toolCallId: "call-1", toolName: "read", content: [{ type: "text", text: projectReadme.slice(0, 400) }], isError: false } },
  entry("a2", "tr1", iso(8), {
    role: "assistant",
    provider: "demo",
    model: "Demo Large",
    content: [{ type: "text", text: "Welcome! This is a static demo of **Pi Web** — the browser UI for the pi coding agent.\n\nThe screen has four areas:\n\n| Area | What it's for |\n| --- | --- |\n| Left sidebar | Sessions, projects and the file explorer |\n| Chat | The conversation, model, reasoning level and tool preset |\n| Top bar | History, export, branches, system prompt and tools |\n| Right panel | Files and terminals in tabs |\n\n```mermaid\ngraph LR\n  Browser --> Server\n  Server --> Agent\n```\n" }],
    usage: { input: 1500, output: 60, cacheRead: 0, cacheWrite: 0, totalTokens: 1560, cost: { input: 0.003, output: 0.0006, cacheRead: 0, cacheWrite: 0, total: 0.0036 } },
  }),
]);

writeSession("demo-feature", "Refactor: extract formatDuration with tests", 55, [
  entry("u1", null, iso(55), { role: "user", content: [{ type: "text", text: "Move `formatDuration` into `lib/` and add unit tests." }] }),
  entry("a1", "u1", iso(54), {
    role: "assistant",
    provider: "demo",
    model: "Demo Large",
    content: [
      { type: "thinking", thinking: "Find the helper first, then extract it." },
      { type: "text", text: "Let me find the existing helper." },
      { type: "toolCall", id: "call-1", name: "bash", arguments: { command: "rg -n \"formatDuration\" src" } },
    ],
    usage: { input: 1000, output: 120, cacheRead: 0, cacheWrite: 0, totalTokens: 1120, cost: { input: 0.002, output: 0.0012, cacheRead: 0, cacheWrite: 0, total: 0.0032 } },
  }),
  { type: "message", id: "tr1", parentId: "a1", timestamp: iso(54), message: { role: "toolResult", toolCallId: "call-1", toolName: "bash", content: [{ type: "text", text: "src/format-duration.ts:1:export function formatDuration(ms: number): string {" }], isError: false } },
  entry("a2", "tr1", iso(53), {
    role: "assistant",
    provider: "demo",
    model: "Demo Large",
    content: [{ type: "text", text: "Done — the helper lives in `src/format-duration.ts` and the test passes.\n\n| File | Change |\n| --- | --- |\n| `src/format-duration.ts` | New helper |\n| `src/format-duration.test.mjs` | Unit test |\n" }],
    usage: { input: 1200, output: 90, cacheRead: 0, cacheWrite: 0, totalTokens: 1290, cost: { input: 0.0024, output: 0.0009, cacheRead: 0, cacheWrite: 0, total: 0.0033 } },
  }),
]);

writeSession("demo-branching", "Branching: edit from here vs. new session", 90, [
  entry("u1", null, iso(90), { role: "user", content: [{ type: "text", text: "Explain the difference between a fork and a branch." }] }),
  entry("a1", "u1", iso(89), { role: "assistant", provider: "demo", model: "Demo Large", content: [{ type: "text", text: "A **fork** copies the whole conversation into a new session file. A **branch** keeps the same session and moves the active leaf." }], usage: { input: 900, output: 60, cacheRead: 0, cacheWrite: 0, totalTokens: 960, cost: { input: 0.0018, output: 0.0006, cacheRead: 0, cacheWrite: 0, total: 0.0024 } } }),
  entry("u2", "a1", iso(88), { role: "user", content: [{ type: "text", text: "Show me the branch navigator." }] }),
  entry("a2", "u2", iso(87), { role: "assistant", provider: "demo", model: "Demo Large", content: [{ type: "text", text: "Use **Branches** in the top bar to switch leaves; the transcript follows the selected branch." }], usage: { input: 1100, output: 50, cacheRead: 0, cacheWrite: 0, totalTokens: 1150, cost: { input: 0.0022, output: 0.0005, cacheRead: 0, cacheWrite: 0, total: 0.0027 } } }),
]);

mkdirSync(dataDir, { recursive: true });
chmodSync(agentDir, 0o755);

console.log(JSON.stringify({ runId, runDir, agentDir, dataDir, projectDir, sessionsDir, webDataDir }, null, 2));
