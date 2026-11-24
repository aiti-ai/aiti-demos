/**
 * Virtual filesystem for the demo projects. The Pi Web project is backed by
 * the repository snapshot in public/demo-files (see scripts/prepare-demo-files.mjs);
 * the scratch project lives entirely in memory. Session "tool runs" add
 * overrides on top so the explorer, viewer and Git panel tell one story.
 */
import { TEXT_PREVIEW_MAX_BYTES, documentPreviewKind, getAudioMime, getDocumentMime, getImageMime, getVideoMime } from "@/lib/file-types";
import { demoAssetPath } from "./base-path";
import { PROJECT_ROOT, SCRATCH_ROOT, WORKTREE_ROOT, relativeToProject } from "./paths";
import { getRealFetch } from "./runtime";
import { PROJECT_FILE_EDITS, PROJECT_FILE_OVERRIDES, SCRATCH_FILES } from "./data/project-files";

export interface VirtualFile {
  path: string;
  size: number;
  /** Static asset name under public/demo-files/f/. */
  asset?: string;
  /** Inline text content (overrides and scratch files). */
  content?: string;
}

interface Project {
  root: string;
  load(): Promise<VirtualFile[]>;
}

const IGNORED_NAMES = new Set([
  "node_modules", ".git", ".next", "dist", "build", "__pycache__",
  ".turbo", ".cache", "coverage", ".pytest_cache", ".mypy_cache",
  "target", "vendor", ".DS_Store",
]);

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "typescript", tsx: "tsx", mts: "typescript", cts: "typescript",
  js: "javascript", jsx: "jsx", mjs: "javascript", cjs: "javascript",
  py: "python", rb: "ruby", php: "php", lua: "lua", pl: "perl", r: "r",
  go: "go", rs: "rust", java: "java", kt: "kotlin", kts: "kotlin", swift: "swift",
  scala: "scala", groovy: "groovy", gradle: "groovy", dart: "dart", zig: "zig",
  c: "c", cpp: "cpp", h: "c", hpp: "cpp", cs: "csharp", mm: "objectivec",
  ex: "elixir", exs: "elixir", hs: "haskell", ml: "ocaml", clj: "clojure", nix: "nix",
  html: "html", htm: "html", vue: "markup", svelte: "markup", astro: "markup",
  css: "css", scss: "scss", less: "less",
  json: "json", jsonl: "json", yaml: "yaml", yml: "yaml",
  toml: "toml", ini: "ini", cfg: "ini", properties: "properties",
  xml: "xml", md: "markdown", mdx: "markdown", tex: "latex",
  sh: "bash", bash: "bash", zsh: "bash", fish: "bash",
  ps1: "powershell", psm1: "powershell", bat: "batch", cmd: "batch",
  sql: "sql", graphql: "graphql", gql: "graphql", proto: "protobuf",
  dockerfile: "dockerfile", tf: "hcl", hcl: "hcl", diff: "diff", patch: "diff",
  env: "bash", gitignore: "bash", txt: "text",
  pdf: "pdf", docx: "word",
};

export function languageFor(filePath: string): string {
  const base = (filePath.split("/").pop() ?? "").toLowerCase();
  if (base === "dockerfile" || base.startsWith("dockerfile.")) return "dockerfile";
  if (base === ".env" || base.startsWith(".env.")) return "bash";
  if (base === "makefile" || base === "gnumakefile") return "makefile";
  const ext = base.split(".").pop() ?? "";
  return EXT_TO_LANGUAGE[ext] ?? "text";
}

function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

// [first-load governance B3] Shard store: manifest.json is a small shard index
// ({v, shards:[{id,count}]}); one shard file per top-level directory holds that
// directory's {path,size,asset} rows. Directory listings and file lookups fetch
// only the shard they need; the full snapshot (projectFiles / asset warm-up)
// fetches every shard — now happening after the boot's idle window instead of
// competing with the first paint.
type ShardIndex = { v: number; shards: Array<{ id: string; count: number }> };

let shardIndexPromise: Promise<ShardIndex> | null = null;
const shardPromises = new Map<string, Promise<VirtualFile[]>>();
let allShardsPromise: Promise<VirtualFile[]> | null = null;

function shardIdFor(relativePath: string, shards: ReadonlyArray<{ id: string }>): string {
  // A path inside a top-level directory belongs to that directory's shard;
  // a bare top-level directory name ("docs") IS that shard. Only entries that
  // match no shard id (top-level files, the empty root path) live in "root".
  const wanted = relativePath.split("/")[0] || "root";
  return shards.some((shard) => shard.id === wanted) ? wanted : "root";
}

function fetchShard(id: string): Promise<VirtualFile[]> {
  let promise = shardPromises.get(id);
  if (!promise) {
    promise = getRealFetch()(demoAssetPath(`/demo-files/shards/${id}.json`))
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<{ files: VirtualFile[] }>;
      })
      .then((manifest) => manifest.files)
      .catch((error) => {
        shardPromises.delete(id);
        throw error;
      });
    shardPromises.set(id, promise);
  }
  return promise;
}

async function loadShardIndex(): Promise<ShardIndex> {
  shardIndexPromise ??= getRealFetch()(demoAssetPath("/demo-files/manifest.json"))
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json() as Promise<ShardIndex>;
    })
    .catch((error) => {
      shardIndexPromise = null;
      throw error;
    });
  return shardIndexPromise;
}

/** All snapshot files (fetches every shard once, in parallel). */
function loadRepositorySnapshot(): Promise<VirtualFile[]> {
  allShardsPromise ??= loadShardIndex()
    .then((index) => Promise.all(index.shards.map((shard) => fetchShard(shard.id))))
    .then((groups) => groups.flat())
    .catch((error) => {
      allShardsPromise = null;
      throw error;
    });
  return allShardsPromise;
}

/** Snapshot files under one top-level directory (fetches just that shard). */
async function loadRepositoryShard(relativePath: string): Promise<VirtualFile[]> {
  const index = await loadShardIndex();
  return fetchShard(shardIdFor(relativePath, index.shards));
}

/** Files added or rewritten by the demo sessions, keyed by project-relative path. */
const overrides = new Map<string, VirtualFile>(
  Object.entries(PROJECT_FILE_OVERRIDES).map(([path, content]) => [path, { path, size: byteLength(content), content }]),
);

export function writeProjectFile(relativePath: string, content: string): void {
  overrides.set(relativePath, { path: relativePath, size: byteLength(content), content });
}

/** Original snapshot text of files the demo sessions edited, for diffs. */
const editedOriginals = new Map<string, string>();
let editsApplied: Promise<void> | null = null;

function applyProjectEdits(): Promise<void> {
  editsApplied ??= (async () => {
    for (const { path, edits } of PROJECT_FILE_EDITS) {
      const shard = await loadRepositoryShard(path).catch(() => [] as VirtualFile[]);
      const file = shard.find((candidate) => candidate.path === path);
      if (!file) continue;
      const original = await readFileText(file).catch(() => null);
      if (original === null) continue;
      let next = original;
      for (const edit of edits) {
        if (next.includes(edit.oldText)) next = next.replace(edit.oldText, edit.newText);
      }
      if (next === original) continue;
      editedOriginals.set(path, original);
      if (!overrides.has(path)) overrides.set(path, { path, size: byteLength(next), content: next });
    }
  })().catch(() => {
    editsApplied = null;
  });
  return editsApplied;
}

/** Snapshot text before the demo edits, or null for files that were not edited. */
export async function originalText(relativePath: string): Promise<string | null> {
  await PROJECTS[0].load();
  return editedOriginals.get(relativePath) ?? null;
}

const PROJECTS: Project[] = [
  {
    root: PROJECT_ROOT,
    async load() {
      await applyProjectEdits();
      const files = await loadRepositorySnapshot();
      const merged = new Map(files.map((file) => [file.path, file]));
      for (const [path, file] of overrides) merged.set(path, file);
      return [...merged.values()];
    },
  },
  {
    // The linked worktree is a clean checkout of the same snapshot.
    root: WORKTREE_ROOT,
    async load() {
      return loadRepositorySnapshot();
    },
  },
  {
    root: SCRATCH_ROOT,
    async load() {
      return Object.entries(SCRATCH_FILES).map(([path, content]) => ({ path, size: byteLength(content), content }));
    },
  },
];

export const PROJECT_ROOTS = PROJECTS.map((project) => project.root);

function findProject(filePath: string): { project: Project; relative: string } | null {
  for (const project of PROJECTS) {
    if (filePath === project.root) return { project, relative: "" };
    if (filePath.startsWith(`${project.root}/`)) return { project, relative: filePath.slice(project.root.length + 1) };
  }
  return null;
}

/**
 * Snapshot files for one top-level directory + session overrides — the shard
 * view used by path lookups and directory listings so the file explorer only
 * fetches the shards it actually browses (first-load governance B3).
 */
async function shardView(relativePath: string): Promise<VirtualFile[]> {
  await applyProjectEdits();
  const shard = await loadRepositoryShard(relativePath);
  const merged = new Map(shard.map((file) => [file.path, file]));
  for (const [path, file] of overrides) merged.set(path, file);
  return [...merged.values()];
}

export async function projectFiles(root: string): Promise<VirtualFile[]> {
  const project = PROJECTS.find((candidate) => candidate.root === root);
  return project ? project.load() : [];
}

export type FileLookup =
  | { kind: "file"; file: VirtualFile; relative: string; root: string }
  | { kind: "dir"; relative: string; root: string }
  | null;

export async function lookup(filePath: string): Promise<FileLookup> {
  const match = findProject(filePath.replace(/\/+$/, "") || "/");
  if (!match) return null;
  if (match.relative === "") return { kind: "dir", relative: "", root: match.project.root };
  if (match.project.root !== PROJECT_ROOT) {
    const files = await match.project.load();
    const file0 = files.find((candidate) => candidate.path === match.relative);
    if (file0) return { kind: "file", file: file0, relative: match.relative, root: match.project.root };
    const prefix0 = `${match.relative}/`;
    if (files.some((candidate) => candidate.path.startsWith(prefix0))) return { kind: "dir", relative: match.relative, root: match.project.root };
    return null;
  }
  const files = await shardView(match.relative);
  const file = files.find((candidate) => candidate.path === match.relative);
  if (file) return { kind: "file", file, relative: match.relative, root: match.project.root };
  const prefix = `${match.relative}/`;
  if (files.some((candidate) => candidate.path.startsWith(prefix))) {
    return { kind: "dir", relative: match.relative, root: match.project.root };
  }
  return null;
}

export async function listDirectory(filePath: string): Promise<{ name: string; isDir: boolean; size: number; modified: string }[] | null> {
  const found = await lookup(filePath);
  if (!found || found.kind !== "dir") return null;
  const files = found.root === PROJECT_ROOT ? await shardView(found.relative) : await projectFiles(found.root);
  const prefix = found.relative ? `${found.relative}/` : "";
  const children = new Map<string, boolean>();
  for (const file of files) {
    if (!file.path.startsWith(prefix)) continue;
    const rest = file.path.slice(prefix.length);
    const [name, ...deeper] = rest.split("/");
    if (!name || IGNORED_NAMES.has(name) || name.endsWith(".pyc")) continue;
    children.set(name, (children.get(name) ?? false) || deeper.length > 0);
  }
  return [...children.entries()]
    .map(([name, isDir]) => ({ name, isDir, size: 0, modified: "" }))
    .sort((a, b) => (a.isDir !== b.isDir ? (a.isDir ? -1 : 1) : a.name.localeCompare(b.name)));
}

const textCache = new Map<string, Promise<string>>();

export async function readFileText(file: VirtualFile): Promise<string> {
  if (file.content !== undefined) return file.content;
  const asset = file.asset!;
  let pending = textCache.get(asset);
  if (!pending) {
    pending = getRealFetch()(assetUrl(file)!).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.text();
    });
    pending.catch(() => textCache.delete(asset));
    textCache.set(asset, pending);
  }
  return pending;
}

/** Read a project file by absolute path; null when it does not exist. */
export async function readProjectText(filePath: string): Promise<string | null> {
  const found = await lookup(filePath);
  return found?.kind === "file" ? readFileText(found.file) : null;
}

export function assetUrl(file: VirtualFile): string | null {
  return file.asset ? demoAssetPath(`/demo-files/f/${file.asset}`) : null;
}

export function mimeFor(filePath: string): string {
  return getImageMime(filePath) || getAudioMime(filePath) || getVideoMime(filePath) || getDocumentMime(filePath) || "text/plain";
}

export function isBinaryPath(filePath: string): boolean {
  return mimeFor(filePath) !== "text/plain";
}

export function fileMeta(filePath: string, file: VirtualFile) {
  return {
    size: file.size,
    language: languageFor(filePath),
    mime: mimeFor(filePath),
    previewKind: documentPreviewKind(filePath),
  };
}

/** Same chunking contract as lib/text-preview.ts, measured in UTF-8 bytes. */
export function textChunk(text: string, offset: number) {
  const bytes = new TextEncoder().encode(text);
  let end = Math.min(bytes.length, offset + TEXT_PREVIEW_MAX_BYTES);
  while (end < bytes.length && end > offset && (bytes[end] & 0xc0) === 0x80) end--;
  return {
    content: new TextDecoder().decode(bytes.slice(offset, end)),
    nextOffset: end,
    truncated: end < bytes.length,
    language: "",
    size: bytes.length,
  };
}

/**
 * Map a Pi Web `/api/files/...?type=read|download` URL for a binary project
 * file to its static snapshot, for <img>/<audio>/<iframe> elements and download
 * links that never go through fetch(). Text files keep the API URL for reads;
 * downloads of in-memory files become data URLs, since GitHub Pages has no
 * /api/files endpoint to answer them.
 */
export function staticFileUrlForApi(apiUrl: string): string {
  // Resolved lazily from the manifest cache; see router-side lookups for fetch().
  const parsed = new URL(apiUrl, "http://demo.invalid");
  const type = parsed.searchParams.get("type");
  // Ticket URLs are what the current host uses for GET-only consumers
  // (<img>/<video>/<iframe>/EventSource). The mock ticket carries the path.
  if (parsed.pathname.startsWith("/api/files/_t/")) {
    const ticket = decodeFileTicket(parsed.pathname.slice("/api/files/_t/".length));
    if (!ticket) return apiUrl;
    const ticketType = type ?? ticket.type;
    if (ticketType !== "read" && ticketType !== "download" && ticketType !== "preview") return apiUrl;
    return staticFileUrlForPath(ticket.path, ticketType, apiUrl);
  }
  if (type !== "read" && type !== "download" && type !== "preview") return apiUrl;
  const filePath = "/" + parsed.pathname.replace(/^\/api\/files\//, "").split("/").map(decodeURIComponent).join("/");
  return staticFileUrlForPath(filePath, type, apiUrl);
}

/** Map a project path + consumer type to a static asset; fallback when unmapped. */
function staticFileUrlForPath(filePath: string, type: string, fallback: string): string {
  if (type === "read" && !isBinaryPath(filePath)) return fallback;
  const content = inlineContent(filePath);
  if (content !== undefined) {
    return type === "download" ? `data:text/plain;charset=utf-8,${encodeURIComponent(content)}` : fallback;
  }
  const asset = knownAssets.get(filePath);
  return asset ? demoAssetPath(`/demo-files/f/${asset}`) : fallback;
}

/** base64url ticket payload used by the static demo (the host uses random opaque tickets). */
interface FileTicketPayload { path: string; type: string }
const FILE_TICKET_PREFIX = "demo:";

export function encodeFileTicket(filePath: string, type: string): string {
  const json = JSON.stringify({ path: filePath, type });
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return FILE_TICKET_PREFIX + btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeFileTicket(raw: string): FileTicketPayload | null {
  try {
    const ticket = decodeURIComponent(raw);
    if (!ticket.startsWith(FILE_TICKET_PREFIX)) return null;
    const base = ticket.slice(FILE_TICKET_PREFIX.length).replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(base);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as FileTicketPayload;
    return typeof parsed.path === "string" && typeof parsed.type === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/** Text of a file that lives in memory (tutorial edits, scratch project), if any. */
function inlineContent(filePath: string): string | undefined {
  const projectRelative = relativeToProject(filePath, PROJECT_ROOT);
  if (projectRelative) return overrides.get(projectRelative)?.content;
  const scratchRelative = relativeToProject(filePath, SCRATCH_ROOT);
  if (scratchRelative && Object.hasOwn(SCRATCH_FILES, scratchRelative)) return SCRATCH_FILES[scratchRelative];
  return undefined;
}

/** Absolute path -> asset name, filled once the manifest loads. */
const knownAssets = new Map<string, string>();

export function primeAssetLookup(): Promise<void> {
  return loadRepositorySnapshot().then((files) => {
    for (const file of files) {
      if (!file.asset) continue;
      // The worktree is a clean checkout, so it maps every snapshot file;
      // edited project files are answered by inlineContent() first.
      knownAssets.set(`${PROJECT_ROOT}/${file.path}`, file.asset);
      knownAssets.set(`${WORKTREE_ROOT}/${file.path}`, file.asset);
    }
  }).catch(() => {});
}
