let _ctx$1 = null;
function __setCtx$1(ctx) {
  _ctx$1 = ctx;
}
function extSvc(key) {
  return _ctx$1?.getExtService?.(key);
}
function onExtServiceChange(fn) {
  const c2 = _ctx$1;
  return typeof c2?.onExtServiceChange === "function" ? c2.onExtServiceChange(fn) : () => {
  };
}
function regSvc(key, impl) {
  const c2 = _ctx$1;
  return typeof c2?.registerExtService === "function" ? c2.registerExtService(key, impl) : null;
}
function c(name) {
  return _ctx$1?.[name] ?? (() => void 0);
}
const Fragment = typeof Symbol !== "undefined" && Symbol.for ? Symbol.for("react.fragment") : 2763;
function createElement(...args) {
  return c("h").call(null, ...args);
}
function mergeKey(args) {
  const [type, props, key, ...rest] = args;
  if (props && typeof props === "object") {
    const merged = { ...props };
    if (key !== void 0 && key !== null) merged.key = key;
    return [type, merged, ...rest];
  }
  return args;
}
const jsx = (...args) => createElement(...mergeKey(args));
const jsxs = (...args) => {
  const props = args[1];
  const children = props?.children;
  if (Array.isArray(children)) {
    for (const c2 of children) {
      if (c2 && typeof c2 === "object" && c2._store) {
        c2._store.validated = 1;
      }
    }
  }
  return createElement(...mergeKey(args));
};
const useState = (init) => c("useState")(init);
const useEffect = (fn, deps) => c("useEffect")(fn, deps);
const useRef = (v) => c("useRef")(v);
const useCallback = (fn, deps) => c("useCallback")(fn, deps);
function apiUrl$1(p) {
  const fn = _ctx$1?.apiUrl;
  return typeof fn === "function" ? fn(p) : p;
}
function t$1(key, params) {
  const fn = _ctx$1?.t;
  return typeof fn === "function" ? fn(key, params) : key;
}
function createPortal(children, container) {
  const fn = _ctx$1?.createPortal;
  return typeof fn === "function" ? fn(children, container) : null;
}
let _ctx = null;
function __setCtx(ctx) {
  _ctx = ctx;
}
function apiUrl(p) {
  const fn = _ctx?.apiUrl;
  return typeof fn === "function" ? fn(p) : p;
}
function t(key, params) {
  const fn = _ctx?.t;
  return typeof fn === "function" ? fn(key, params) : key;
}
const MENU_ACTION_ROW_STYLE = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  width: "100%",
  minHeight: 30,
  padding: "6px 12px",
  border: 0,
  borderRadius: 0,
  background: "none",
  color: "var(--text-muted)",
  fontFamily: "inherit",
  fontSize: 12,
  lineHeight: 1.35,
  textAlign: "left",
  cursor: "pointer"
};
function MenuActionRow(props) {
  const { icon, label, title, emphasized = false, disabled = false, trailing, onClick } = props;
  const [hovered, setHovered] = useState(false);
  const active = hovered && !disabled;
  return /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      className: `menu-action-row${emphasized ? " is-emphasized" : ""}`,
      title: title ?? label,
      disabled,
      onClick: (event) => {
        event.stopPropagation();
        onClick({ stopPropagation: () => event.stopPropagation() });
      },
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      style: {
        ...MENU_ACTION_ROW_STYLE,
        color: disabled ? "var(--text-dim)" : active || emphasized ? "var(--text)" : "var(--text-muted)",
        background: active ? "var(--bg-hover)" : "none",
        opacity: disabled ? 0.55 : 1,
        cursor: disabled ? "default" : "pointer"
      },
      children: [
        icon ? /* @__PURE__ */ jsx(
          "span",
          {
            "aria-hidden": "true",
            style: { display: "inline-flex", flexShrink: 0, color: emphasized || active ? "var(--text)" : "var(--text-dim)" },
            children: icon
          }
        ) : null,
        /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: label }),
        trailing ? /* @__PURE__ */ jsx("span", { style: { flexShrink: 0, color: "var(--text-dim)", fontSize: 11 }, children: trailing }) : null
      ]
    }
  );
}
const SERVICE_KEY = "aiti-quickstart.api";
const FOOTER_ITEM_ID = "quickstart-open";
const DISMISS_KEY = "pi:quickstart:sidebar-dismissed";
const WIDGET_TITLE_KEYS = {
  guide: "qs.guideTitle",
  shortcuts: "qs.shortcutsTitle",
  streaming: "qs.rt.title",
  examples: "qs.examplesTitle"
};
const WIDGET_METAS = [
  // guide priority -1（非 0）：2026-11-07 起 guide 先占行 1 独占整行（宿主 builtin:recent
  // 同为 p0 且注册序在前；2026-11-15 recent defaultArea 移 top，top 排序 = guide → recent →
  // shortcuts → streaming，priority 序不变）。宿主顶区 2026-11-15 起 flex 自适应
  // （吃掉 composer 上方全部空白，卡片自然高度贴顶、下方自然留白），不再有固定上限。
  // h=1：宿主网格 gridAutoRows: minmax(58px,auto)，行高按内容自动撑开。
  // areas 全开双区（2026-11-07 用户问「能否移动」）：⚙ 面板可跨 top/bottom 挪动，
  // defaultArea 保持各自语义默认（挪动后 pref 持久化）。
  { id: "guide", areas: ["top", "bottom"], defaultArea: "top", w: 8, h: 1, priority: -1 },
  // shortcuts w8（2026-11-07 用户拍板：与快速上手同宽整行）；4 列 kbd 行式 ×2 行（8 项）。
  { id: "shortcuts", areas: ["top", "bottom"], defaultArea: "top", w: 8, h: 1, priority: 10 },
  // streaming p15（shortcuts 10 与 examples 20 之间）：任务运行时概念卡——图标/配色
  // 复刻宿主 ChatInput 流式按钮区（fork/侧聊/插队/排队/继续），卡片即按钮图例。
  { id: "streaming", areas: ["top", "bottom"], defaultArea: "top", w: 8, h: 1, priority: 15 },
  { id: "examples", areas: ["top", "bottom"], defaultArea: "bottom", w: 8, h: 1, priority: 20 }
];
const RUNTIME_ROWS = [
  { key: "qs.rt.fork", descKey: "qs.rt.forkDesc" },
  { key: "qs.rt.sideChat", descKey: "qs.rt.sideChatDesc" },
  { key: "qs.rt.steer", descKey: "qs.rt.steerDesc" },
  { key: "qs.rt.followUp", descKey: "qs.rt.followUpDesc" },
  { key: "qs.rt.continue", descKey: "qs.rt.continueDesc" }
];
function readSidebarDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function writeSidebarDismissed(dismissed) {
  try {
    if (dismissed) localStorage.setItem(DISMISS_KEY, "1");
  } catch {
  }
}
function resolveQuickstartCwd(src) {
  const cwd = src.tabCwd && src.tabCwd.trim() || src.sessionCwd && src.sessionCwd.trim() || src.recentRoot && src.recentRoot.trim() || src.home && src.home.trim() || "";
  return cwd || null;
}
function topRecentRoot(sessions) {
  const best = /* @__PURE__ */ new Map();
  for (const s of Array.isArray(sessions) ? sessions : []) {
    const root = s.projectRoot && String(s.projectRoot).trim() || s.cwd && String(s.cwd).trim() || "";
    if (!root) continue;
    const t2 = typeof s.modified === "number" ? s.modified : s.modified ? Date.parse(String(s.modified)) : 0;
    const prev = best.get(root) ?? -1;
    if (t2 > prev) best.set(root, t2);
  }
  let top = null;
  for (const [root, t2] of best) if (!top || t2 > top.t) top = { root, t: t2 };
  return top?.root ?? null;
}
function nameFromGitUrl(url) {
  const clean = url.replace(/[\\/]+$/, "").replace(/\.git$/, "");
  const tail = clean.split(/[\\/]/).pop() ?? clean;
  return tail.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+/, "") || "workspace";
}
function isUnsafeGitArg(s) {
  return /^-/.test(s) || /[\u0000-\u001f\u007f]/.test(s);
}
function parseGitUrl(source) {
  const s = (source ?? "").trim();
  if (!s) return null;
  const gitPrefix = s.match(/^git:(.+?)(?:#([^#]+))?$/);
  if (gitPrefix) {
    const ref = gitPrefix[1];
    const branch = gitPrefix[2];
    if (isUnsafeGitArg(ref) || branch && isUnsafeGitArg(branch)) return null;
    return { ref, branch: branch || void 0, name: nameFromGitUrl(ref), local: !/^[a-z]+:\/\//i.test(ref) };
  }
  if (/^git@[\w.-]+:/.test(s)) {
    if (isUnsafeGitArg(s)) return null;
    return { ref: s, name: nameFromGitUrl(s), local: false };
  }
  if (/^https?:\/\//i.test(s) && (/\.git(?:#|$|\/)/.test(s) || /github\.com\//i.test(s) || /gitlab\.com\//i.test(s))) {
    const hash = s.indexOf("#");
    const url = hash > 0 ? s.slice(0, hash) : s;
    const branch = hash > 0 ? s.slice(hash + 1) : void 0;
    if (isUnsafeGitArg(url) || branch && isUnsafeGitArg(branch)) return null;
    return { ref: url, branch: branch || void 0, name: nameFromGitUrl(url), local: false };
  }
  if (/^\//.test(s) || /^~[\\/]/.test(s) || /^[A-Za-z]:[\\/]/.test(s)) {
    if (isUnsafeGitArg(s)) return null;
    return { ref: s, name: nameFromGitUrl(s), local: true };
  }
  return null;
}
function deriveOnboardingState(input) {
  const hasWorkspace = Boolean(input.cwd && input.cwd.trim()) || input.recentRootCount > 0;
  const hasModel = input.modelCount > 0;
  if (!hasWorkspace) return "fresh";
  return hasModel ? "full" : "hasWorkspace";
}
function splitKbdHint(hint) {
  const str = (hint ?? "").trim();
  const i = str.indexOf(" ");
  if (i <= 0) return { kbd: str, desc: "" };
  return { kbd: str.slice(0, i), desc: str.slice(i + 1).trim() };
}
const EXAMPLES_CONFIG_DEFAULT = { mode: "auto", maxChips: 4 };
const EXAMPLES_MODES = ["auto", "prompts", "builtin"];
const EXAMPLES_MIN_TEXT = 8;
function normalizeExamplesConfig(raw) {
  const r = raw ?? {};
  const n = typeof r.maxChips === "number" ? r.maxChips : parseInt(String(r.maxChips ?? ""), 10);
  const max = Number.isFinite(n) ? Math.max(2, Math.min(8, Math.round(n))) : EXAMPLES_CONFIG_DEFAULT.maxChips;
  return {
    mode: EXAMPLES_MODES.includes(r.mode) ? r.mode : EXAMPLES_CONFIG_DEFAULT.mode,
    maxChips: max
  };
}
function shuffle(list, rand = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
function assembleExampleChips(params) {
  const max = Math.max(1, Math.min(8, Math.round(params.maxChips) || EXAMPLES_CONFIG_DEFAULT.maxChips));
  const poolShuffled = shuffle(params.pool, params.rand);
  const builtinChip = (text) => ({ text, label: text, promptId: null });
  if (params.mode === "builtin") return poolShuffled.slice(0, max).map(builtinChip);
  const usable = (params.prompts ?? []).filter((p) => typeof p?.text === "string" && p.text.trim().length >= EXAMPLES_MIN_TEXT).slice(0, max).map((p) => ({ text: p.text, label: (p.name || "").trim() || p.text, promptId: p.id || null }));
  if (params.mode === "prompts") return usable;
  const fill = poolShuffled.slice(0, Math.max(0, max - usable.length)).map(builtinChip);
  return [...usable, ...fill];
}
const cardStyle = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  gap: 2,
  padding: "3px 10px",
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 10,
  boxSizing: "border-box",
  overflow: "hidden",
  fontFamily: "inherit"
};
const titleStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text, #ddd)",
  flexShrink: 0
};
const chipBase = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 999,
  padding: "1px 8px",
  fontSize: 10.5,
  color: "var(--text-muted, #999)",
  background: "none",
  cursor: "pointer",
  fontFamily: "inherit",
  transition: "border-color 0.12s, color 0.12s, background 0.12s"
};
const primaryBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--accent, #2563eb)",
  borderRadius: 8,
  padding: "6px 12px",
  background: "none",
  color: "var(--accent, #2563eb)",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit",
  transition: "background 0.12s"
};
function FolderPlusIcon({ size = 12 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("path", { d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" }),
    /* @__PURE__ */ jsx("line", { x1: "12", y1: "10", x2: "12", y2: "16" }),
    /* @__PURE__ */ jsx("line", { x1: "9", y1: "13", x2: "15", y2: "13" })
  ] });
}
function RocketIcon({ size = 14 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { color: "var(--accent, #2563eb)", flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("path", { d: "M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" }),
    /* @__PURE__ */ jsx("path", { d: "m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" }),
    /* @__PURE__ */ jsx("path", { d: "M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" }),
    /* @__PURE__ */ jsx("path", { d: "M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" })
  ] });
}
function readTabCwd() {
  try {
    const raw = window.sessionStorage.getItem("pi-web:tab-open-session");
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.kind === "new" && typeof parsed.cwd === "string" ? parsed.cwd : null;
  } catch {
    return null;
  }
}
function readSessionCwd() {
  try {
    const v = window.__piWebCwd;
    return typeof v === "string" ? v : null;
  } catch {
    return null;
  }
}
async function fetchHome() {
  try {
    const svc = extSvc("pi-web.home");
    if (svc?.ensure) return await svc.ensure();
  } catch {
  }
  try {
    const res = await fetch(apiUrl$1("/api/home"));
    const d = await res.json();
    return typeof d.home === "string" ? d.home : null;
  } catch {
    return null;
  }
}
async function fetchRecentRoot() {
  try {
    const res = await fetch(apiUrl$1("/api/sessions"), { headers: { accept: "application/json" } });
    const d = await res.json();
    return topRecentRoot(d.sessions ?? []);
  } catch {
    return null;
  }
}
async function openQuickstart() {
  const tabCwd = readTabCwd();
  const sessionCwd = readSessionCwd();
  let recentRoot = null;
  let home = null;
  if (!tabCwd && !sessionCwd) {
    recentRoot = await fetchRecentRoot();
    if (!recentRoot) home = await fetchHome();
  }
  const cwd = resolveQuickstartCwd({ tabCwd, sessionCwd, recentRoot, home });
  if (!cwd) {
    try {
      extSvc("pi-web.toast")?.show?.(t$1("qs.toast.noCwd"));
    } catch {
    }
    return;
  }
  try {
    extSvc("pi-web.newSession")?.setCwd?.(cwd);
  } catch {
  }
}
function openWorkspaceHub() {
  try {
    window.dispatchEvent(new CustomEvent("aiti-quickstart:open-hub"));
  } catch {
  }
}
function openModelConfig() {
  try {
    const wizard = extSvc("aiti-model-wizard.openTab");
    if (typeof wizard === "function") {
      wizard("add");
      return;
    }
  } catch {
  }
  try {
    const g = window.__aitiModelWizardOpenTab;
    if (typeof g === "function") {
      g("add");
      return;
    }
  } catch {
  }
  try {
    const ui = extSvc("pi-web.ui");
    const setSection = ui?.get?.("setSettingsSection");
    if (typeof setSection === "function") {
      setSection("models");
      return;
    }
  } catch {
  }
  try {
    extSvc("pi-web.toast")?.show?.(t$1("qs.start.modelMissing"));
  } catch {
  }
}
function useVitals(cwdFromExtra) {
  const [vitals, setVitals] = useState({ cwd: cwdFromExtra ?? null, recentRootCount: 0, modelCount: 0, ready: false, modelsOk: false });
  useEffect(() => {
    let alive = true;
    const scan = async () => {
      const cwd = cwdFromExtra && cwdFromExtra.trim() || readTabCwd() || readSessionCwd();
      let recentRootCount = 0;
      let modelCount = 0;
      let modelsOk = false;
      try {
        const res = await fetch(apiUrl$1("/api/sessions"), { headers: { accept: "application/json" } });
        const d = await res.json();
        const roots = /* @__PURE__ */ new Set();
        for (const s of d.sessions ?? []) {
          const r = s.projectRoot && String(s.projectRoot).trim() || s.cwd && String(s.cwd).trim() || "";
          if (r) roots.add(r);
        }
        recentRootCount = roots.size;
      } catch {
      }
      try {
        const res = await fetch(apiUrl$1("/api/models"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cwd: cwd ?? void 0 }) });
        const d = await res.json();
        if (res.ok && Array.isArray(d.modelList)) {
          modelCount = d.modelList.length;
          modelsOk = true;
        }
      } catch {
      }
      if (alive) setVitals({ cwd: cwd ?? null, recentRootCount, modelCount, ready: true, modelsOk });
    };
    void scan();
    const refresh = () => {
      void scan();
    };
    try {
      window.addEventListener("pi-web:models-changed", refresh);
      window.addEventListener("pi-web:sessions-changed", refresh);
      document.addEventListener("visibilitychange", refresh);
    } catch {
    }
    return () => {
      alive = false;
      try {
        window.removeEventListener("pi-web:models-changed", refresh);
        window.removeEventListener("pi-web:sessions-changed", refresh);
        document.removeEventListener("visibilitychange", refresh);
      } catch {
      }
    };
  }, [cwdFromExtra]);
  return vitals;
}
const FULL_STEP_KEYS = ["qs.step1", "qs.step2", "qs.step3", "qs.step4", "qs.step5"];
const QUICKSTART_DOC_URL = "https://aiti.pw/devtools/quick-start.html";
const STEP_DOC_KEY = "qs.step5";
const stepNumStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: 16,
  height: 16,
  borderRadius: 999,
  fontSize: 10.5,
  fontWeight: 600,
  color: "var(--accent, #2563eb)",
  border: "1px solid var(--accent, #2563eb)"
};
const stepLabelStyle = { fontSize: 11, color: "var(--text-muted, #999)", lineHeight: 1.35, minWidth: 0 };
function openQuickstartDoc() {
  try {
    window.open(QUICKSTART_DOC_URL, "_blank", "noopener");
  } catch {
  }
}
function CrosshairIcon({ size = 12, color }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color || "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
    /* @__PURE__ */ jsx("line", { x1: "22", x2: "18", y1: "12", y2: "12" }),
    /* @__PURE__ */ jsx("line", { x1: "6", x2: "2", y1: "12", y2: "12" }),
    /* @__PURE__ */ jsx("line", { x1: "12", x2: "12", y1: "6", y2: "2" }),
    /* @__PURE__ */ jsx("line", { x1: "12", x2: "12", y1: "22", y2: "18" })
  ] });
}
function StepRow({ k, num }) {
  const [hov, setHov] = useState(false);
  if (k !== STEP_DOC_KEY) {
    return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 }, children: [
      /* @__PURE__ */ jsx("span", { style: stepNumStyle, children: num }),
      /* @__PURE__ */ jsx("span", { style: stepLabelStyle, children: t$1(k) })
    ] });
  }
  return /* @__PURE__ */ jsxs(
    "div",
    {
      title: t$1("qs.step5.title"),
      role: "button",
      tabIndex: 0,
      onClick: openQuickstartDoc,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openQuickstartDoc();
        }
      },
      onMouseEnter: () => setHov(true),
      onMouseLeave: () => setHov(false),
      style: { display: "flex", alignItems: "center", gap: 8, minWidth: 0, cursor: "pointer", borderRadius: 6, outline: "none", gridColumn: "1 / -1", whiteSpace: "nowrap" },
      children: [
        /* @__PURE__ */ jsx("span", { style: stepNumStyle, children: num }),
        /* @__PURE__ */ jsxs("span", { style: { ...stepLabelStyle, display: "inline-flex", alignItems: "center", gap: 5, color: hov ? "var(--accent, #2563eb)" : stepLabelStyle.color, overflow: "hidden", textOverflow: "ellipsis" }, children: [
          /* @__PURE__ */ jsx(CrosshairIcon, { size: 12, color: hov ? "var(--accent, #2563eb)" : "var(--text-muted, #999)" }),
          /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", minWidth: 0, flexShrink: 1 }, children: t$1(k) })
        ] })
      ]
    }
  );
}
const SHORTCUT_KEYS = [
  "qs.sc.newSession",
  "qs.sc.enter",
  "qs.sc.shiftEnter",
  "qs.sc.escStop",
  "qs.sc.at",
  "qs.sc.slash",
  "qs.sc.upRecall",
  "qs.sc.upHistory"
];
const EXAMPLE_KEYS = ["qs.ex.1", "qs.ex.2", "qs.ex.3", "qs.ex.4", "qs.ex.5", "qs.ex.6", "qs.ex.7", "qs.ex.8"];
const EXAMPLES_CHANGED_EVENT = "aiti-quickstart:examples-changed";
function fetchPromptsSuggest(limit) {
  return fetch(apiUrl$1(`/api/extensions/aiti-prompts/prompts/suggest?limit=${limit}`), { headers: { accept: "application/json" } }).then((r) => r.ok ? r.json() : null).then((d) => Array.isArray(d?.results) ? d.results : []).catch(() => []);
}
function fetchExamplesConfig() {
  return fetch(apiUrl$1("/api/extensions/aiti-quickstart/examples/config"), { headers: { accept: "application/json" } }).then((r) => r.ok ? r.json() : null).then((d) => normalizeExamplesConfig(d?.config)).catch(() => normalizeExamplesConfig(null));
}
function useRecentRoots() {
  const [roots, setRoots] = useState([]);
  useEffect(() => {
    let alive = true;
    const scan = async () => {
      const best = /* @__PURE__ */ new Map();
      try {
        const res = await fetch(apiUrl$1("/api/sessions"), { headers: { accept: "application/json" } });
        const d = await res.json();
        for (const s of d.sessions ?? []) {
          const r = s.projectRoot && String(s.projectRoot).trim() || s.cwd && String(s.cwd).trim() || "";
          if (!r) continue;
          const tm = s.modified ? Date.parse(s.modified) : 0;
          if ((best.get(r) ?? -1) < tm) best.set(r, tm);
        }
      } catch {
      }
      try {
        const res = await fetch(apiUrl$1("/api/extensions/aiti-quickstart/workspace/history"), { headers: { accept: "application/json" } });
        const d = await res.json();
        for (const w of d.workspaces ?? []) {
          const r = w.root && String(w.root).trim() || "";
          if (!r) continue;
          const tm = typeof w.time === "number" ? w.time : 0;
          if ((best.get(r) ?? -1) < tm) best.set(r, tm);
        }
      } catch {
      }
      const list = [...best.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3).map(([root]) => ({ root, name: root.split(/[\\/]/).filter(Boolean).pop() ?? root }));
      if (alive) setRoots(list);
    };
    void scan();
    const refresh = () => {
      void scan();
    };
    try {
      window.addEventListener("pi-web:sessions-changed", refresh);
    } catch {
    }
    return () => {
      alive = false;
      try {
        window.removeEventListener("pi-web:sessions-changed", refresh);
      } catch {
      }
    };
  }, []);
  return roots;
}
function StepChip({ label }) {
  return /* @__PURE__ */ jsx("span", { style: { ...chipBase, cursor: "default" }, children: label });
}
function GuideWidget(props) {
  const isMobile = props.isMobile === true;
  const vitals = useVitals(props.cwd ?? null);
  const recents = useRecentRoots();
  const importReady = useImportServiceReady();
  const state = vitals.ready ? deriveOnboardingState({ cwd: vitals.cwd, recentRootCount: vitals.recentRootCount, modelCount: vitals.modelCount }) : "full";
  const head = /* @__PURE__ */ jsxs("div", { style: { ...titleStyle, justifyContent: "space-between" }, children: [
    /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsx(RocketIcon, {}),
      t$1("qs.guideTitle")
    ] }),
    /* @__PURE__ */ jsx("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--text-dim, #888)" }, children: t$1("qs.guideHint") })
  ] });
  if (state === "fresh") {
    return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
      head,
      /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-muted, #999)", flexShrink: 0 }, children: t$1("qs.start.subtitle") }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1, minHeight: 0, display: "flex", flexDirection: isMobile ? "column" : "row", gap: 8, alignItems: "center", justifyContent: "center" }, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            style: { ...primaryBtn, flex: isMobile ? void 0 : 1, maxWidth: 280 },
            onClick: openWorkspaceHub,
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "none";
            },
            children: [
              /* @__PURE__ */ jsx(RocketIcon, { size: 12 }),
              /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }, children: [
                /* @__PURE__ */ jsx("span", { children: t$1("qs.start.acquire") }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim, #888)" }, children: t$1("qs.start.acquireHint") })
              ] })
            ]
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            style: { ...primaryBtn, flex: isMobile ? void 0 : 1, maxWidth: 280 },
            onClick: openModelConfig,
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "none";
            },
            children: /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }, children: [
              /* @__PURE__ */ jsx("span", { children: t$1("qs.start.configureModel") }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim, #888)" }, children: t$1("qs.start.modelMissing") })
            ] })
          }
        ),
        importReady ? /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            style: { ...primaryBtn, flex: isMobile ? void 0 : 1, maxWidth: 280 },
            onClick: openModelsImport,
            title: t$1("qs.start.importModelsTitle"),
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "none";
            },
            children: [
              /* @__PURE__ */ jsx(ImportIcon, {}),
              /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", flexDirection: "column", alignItems: "flex-start", lineHeight: 1.3 }, children: [
                /* @__PURE__ */ jsx("span", { children: t$1("qs.start.importModels") }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim, #888)" }, children: t$1("qs.start.importModelsHint") })
              ] })
            ]
          }
        ) : null
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }, children: [
        /* @__PURE__ */ jsx(StepChip, { label: t$1("qs.start.step.workspace") }),
        /* @__PURE__ */ jsx(StepChip, { label: t$1("qs.start.step.model") }),
        /* @__PURE__ */ jsx(StepChip, { label: t$1("qs.start.step.msg") })
      ] })
    ] });
  }
  if (state === "hasWorkspace") {
    return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
      head,
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", flexShrink: 0 }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11.5, color: "var(--text-dim, #888)" }, children: t$1("qs.start.recent") }),
        recents.map((r) => /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            style: chipBase,
            onClick: () => {
              try {
                extSvc("pi-web.newSession")?.setCwd?.(r.root);
              } catch {
              }
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
              e.currentTarget.style.color = "var(--accent, #2563eb)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
              e.currentTarget.style.color = "var(--text-muted, #999)";
            },
            children: r.name
          },
          r.root
        )),
        vitals.modelsOk && vitals.modelCount === 0 ? /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-dim, #888)" }, children: [
            "● ",
            t$1("qs.start.modelMissing")
          ] }),
          /* @__PURE__ */ jsx("button", { type: "button", style: { ...chipBase, borderColor: "var(--accent, #2563eb)", color: "var(--accent, #2563eb)" }, onClick: openModelConfig, children: t$1("qs.start.configureModel") }),
          importReady ? /* @__PURE__ */ jsxs("button", { type: "button", style: { ...chipBase, borderColor: "var(--accent, #2563eb)", color: "var(--accent, #2563eb)" }, onClick: openModelsImport, title: t$1("qs.start.importModelsTitle"), children: [
            /* @__PURE__ */ jsx(ImportIcon, {}),
            /* @__PURE__ */ jsx("span", { children: t$1("qs.start.importModels") })
          ] }) : null
        ] }) : null
      ] }),
      /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "3px 12px", alignContent: "center" }, children: FULL_STEP_KEYS.slice(2).map((key, i) => /* @__PURE__ */ jsx(StepRow, { k: key, num: i + 3 }, key)) })
    ] });
  }
  const iconChip = (icon, title, onClick, key) => /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      title,
      "aria-label": title,
      onClick,
      style: {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 20,
        flexShrink: 0,
        border: "1px solid var(--border, #3a3a3a)",
        borderRadius: 6,
        background: "none",
        color: "var(--text-muted, #999)",
        cursor: "pointer",
        padding: 0
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
        e.currentTarget.style.color = "var(--accent, #2563eb)";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
        e.currentTarget.style.color = "var(--text-muted, #999)";
      },
      children: icon
    },
    key
  );
  const headFull = /* @__PURE__ */ jsxs("div", { style: { ...titleStyle, justifyContent: "space-between" }, children: [
    /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsx(RocketIcon, {}),
      t$1("qs.guideTitle")
    ] }),
    /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 5 }, children: [
      iconChip(/* @__PURE__ */ jsx(FolderPlusIcon, {}), t$1("qs.open.hub"), openWorkspaceHub, "hub"),
      iconChip(/* @__PURE__ */ jsx(CpuIcon, {}), t$1("qs.start.configureModel"), openModelConfig, "model"),
      importReady ? iconChip(/* @__PURE__ */ jsx(ImportIcon, {}), t$1("qs.start.importModels"), openModelsImport, "import") : null,
      !isMobile && /* @__PURE__ */ jsx("span", { style: { fontSize: 11, fontWeight: 400, color: "var(--text-dim, #888)", marginLeft: 2 }, children: t$1("qs.guideHint") })
    ] })
  ] });
  return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
    headFull,
    /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: "3px 12px", alignContent: "center" }, children: FULL_STEP_KEYS.map((key, i) => /* @__PURE__ */ jsx(StepRow, { k: key, num: i + 1 }, key)) })
  ] });
}
function ImportIcon({ size = 12 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    /* @__PURE__ */ jsx("path", { d: "m7 10 5 5 5-5" }),
    /* @__PURE__ */ jsx("path", { d: "M12 15V3" })
  ] });
}
function modelsImportService() {
  try {
    const svc = extSvc("aiti-models-import.open");
    if (svc && typeof svc.open === "function") return svc;
  } catch {
  }
  return null;
}
function useImportServiceReady() {
  const [, force] = useState(0);
  useEffect(() => {
    const off = onExtServiceChange((k) => {
      if (k === "aiti-models-import.open") force((v) => v + 1);
    });
    return () => {
      try {
        off?.();
      } catch {
      }
    };
  }, []);
  return modelsImportService() !== null;
}
function openModelsImport() {
  try {
    modelsImportService()?.open();
  } catch {
  }
}
function CpuIcon({ size = 12 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2" }),
    /* @__PURE__ */ jsx("rect", { x: "9", y: "9", width: "6", height: "6" }),
    /* @__PURE__ */ jsx("path", { d: "M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 15h3M1 9h3M1 15h3" })
  ] });
}
const kbdStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 6,
  padding: "1px 5px",
  fontFamily: "var(--font-mono, ui-monospace, monospace)",
  fontSize: 10,
  color: "var(--text, #ddd)",
  background: "var(--bg-hover, #232323)",
  lineHeight: 1.6
};
function ShortcutsWidget(props) {
  const isMobile = props.isMobile === true;
  return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: titleStyle, children: t$1("qs.shortcutsTitle") }),
    /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))", gap: "3px 12px", alignContent: "center" }, children: SHORTCUT_KEYS.map((key) => {
      const { kbd, desc } = splitKbdHint(t$1(key));
      return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("kbd", { style: kbdStyle, children: kbd }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 10.5, color: "var(--text-muted, #999)", lineHeight: 1.35, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }, children: desc })
      ] }, key);
    }) })
  ] });
}
const RT_COLOR = {
  fork: "rgba(37,99,235,1)",
  sideChat: "rgba(37,99,235,0.9)",
  steer: "rgba(180,130,0,1)",
  followUp: "rgba(99,102,241,1)",
  continue: "rgba(5,150,105,1)"
};
function RtForkIcon({ size = 13 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("circle", { cx: "12", cy: "18", r: "3" }),
    /* @__PURE__ */ jsx("circle", { cx: "6", cy: "6", r: "3" }),
    /* @__PURE__ */ jsx("circle", { cx: "18", cy: "6", r: "3" }),
    /* @__PURE__ */ jsx("path", { d: "M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9" }),
    /* @__PURE__ */ jsx("path", { d: "M12 12v3" })
  ] });
}
function RtSideChatIcon({ size = 13 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("path", { d: "M21 12a8 8 0 0 1-8 8H5.5a2 2 0 0 1-1.4-3.4A8 8 0 1 1 21 12z" }),
    /* @__PURE__ */ jsx("path", { d: "M13 8.5v7M9.5 12h7" })
  ] });
}
function RtSteerIcon({ size = 13 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.8", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("path", { d: "M5 1 L9 5 L5 9" }),
    /* @__PURE__ */ jsx("line", { x1: "1", y1: "5", x2: "9", y2: "5" })
  ] });
}
function RtFollowUpIcon({ size = 13 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 10 10", fill: "none", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("line", { x1: "2", y1: "1.5", x2: "8", y2: "1.5" }),
    /* @__PURE__ */ jsx("path", { d: "M2 1.5 L2 2.5 L5 5 L2 7.5 L2 8.5" }),
    /* @__PURE__ */ jsx("path", { d: "M8 1.5 L8 2.5 L5 5 L8 7.5 L8 8.5" }),
    /* @__PURE__ */ jsx("line", { x1: "2", y1: "8.5", x2: "8", y2: "8.5" })
  ] });
}
function RtContinueIcon({ size = 13 }) {
  return /* @__PURE__ */ jsxs("svg", { width: size, height: size, viewBox: "0 0 12 12", fill: "none", stroke: "currentColor", strokeWidth: "1.7", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0 }, children: [
    /* @__PURE__ */ jsx("polyline", { points: "1.5 2.5 5.5 6 1.5 9.5" }),
    /* @__PURE__ */ jsx("polyline", { points: "6.5 2.5 10.5 6 6.5 9.5" })
  ] });
}
const RUNTIME_ROW_META = {
  "qs.rt.fork": { color: RT_COLOR.fork, Icon: RtForkIcon },
  "qs.rt.sideChat": { color: RT_COLOR.sideChat, Icon: RtSideChatIcon },
  "qs.rt.steer": { color: RT_COLOR.steer, Icon: RtSteerIcon },
  "qs.rt.followUp": { color: RT_COLOR.followUp, Icon: RtFollowUpIcon },
  "qs.rt.continue": { color: RT_COLOR.continue, Icon: RtContinueIcon }
};
function RuntimeWidget(props) {
  const isMobile = props.isMobile === true;
  return /* @__PURE__ */ jsxs("div", { style: cardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: titleStyle, children: t$1("qs.rt.title") }),
    /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: "3px 16px", alignContent: "center" }, children: RUNTIME_ROWS.map((row) => {
      const meta = RUNTIME_ROW_META[row.key];
      const Icon = meta.Icon;
      return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: meta.color, display: "inline-flex", flexShrink: 0 }, children: /* @__PURE__ */ jsx(Icon, { size: 12 }) }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11, fontWeight: 600, color: meta.color, flexShrink: 0 }, children: t$1(row.key) }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 10.5, color: "var(--text-muted, #999)", lineHeight: 1.35, minWidth: 0 }, children: t$1(row.descKey) })
      ] }, row.key);
    }) })
  ] });
}
function ExamplesWidget() {
  const [chips, setChips] = useState(null);
  const [reloadTick, setReloadTick] = useState(0);
  const [poolShuffled] = useState(() => shuffle(EXAMPLE_KEYS.map((k) => t$1(k))));
  useEffect(() => {
    const onChange = () => setReloadTick((v) => v + 1);
    try {
      window.addEventListener(EXAMPLES_CHANGED_EVENT, onChange);
    } catch {
    }
    return () => {
      try {
        window.removeEventListener(EXAMPLES_CHANGED_EVENT, onChange);
      } catch {
      }
    };
  }, []);
  useEffect(() => {
    let alive = true;
    void (async () => {
      const config = await fetchExamplesConfig();
      const prompts = config.mode === "builtin" ? [] : await fetchPromptsSuggest(config.maxChips);
      if (!alive) return;
      setChips(assembleExampleChips({ mode: config.mode, maxChips: config.maxChips, prompts, pool: poolShuffled }));
    })();
    return () => {
      alive = false;
    };
  }, [reloadTick, poolShuffled]);
  const fill = (chip) => {
    try {
      const composer = extSvc("pi-web.composer");
      const setInputValue = composer?.get?.("setInputValue");
      const focusComposer = composer?.get?.("focusComposer");
      setInputValue?.(chip.text);
      focusComposer?.();
    } catch {
    }
    if (chip.promptId) {
      void fetch(apiUrl$1(`/api/extensions/aiti-prompts/prompts/touch/${encodeURIComponent(chip.promptId)}`), { method: "POST" }).catch(() => {
      });
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { ...cardStyle, height: "auto", minHeight: "100%" }, children: [
    /* @__PURE__ */ jsx("div", { style: titleStyle, children: t$1("qs.examplesTitle") }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: (chips ?? []).map((chip, i) => /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        title: chip.text,
        style: chipBase,
        onClick: () => fill(chip),
        onMouseEnter: (e) => {
          e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
          e.currentTarget.style.color = "var(--accent, #2563eb)";
        },
        onMouseLeave: (e) => {
          e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
          e.currentTarget.style.color = "var(--text-muted, #999)";
        },
        children: [
          chip.promptId ? /* @__PURE__ */ jsx(BookmarkIcon, {}) : null,
          chip.label
        ]
      },
      `${chip.promptId ?? "builtin"}:${i}`
    )) })
  ] });
}
function BookmarkIcon() {
  return /* @__PURE__ */ jsx("svg", { width: 10, height: 10, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", style: { flexShrink: 0, opacity: 0.75 }, children: /* @__PURE__ */ jsx("path", { d: "m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" }) });
}
function ExamplesSettings({ close }) {
  const [mode, setMode] = useState("auto");
  const [maxChips, setMaxChips] = useState(4);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let alive = true;
    void fetchExamplesConfig().then((c2) => {
      if (!alive) return;
      setMode(c2.mode);
      setMaxChips(c2.maxChips);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);
  const save = async () => {
    setSaving(true);
    try {
      await fetch(apiUrl$1("/api/extensions/aiti-quickstart/examples/config"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode, maxChips })
      });
      try {
        window.dispatchEvent(new CustomEvent(EXAMPLES_CHANGED_EVENT));
      } catch {
      }
      close();
    } finally {
      setSaving(false);
    }
  };
  const rowStyle2 = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "7px 0" };
  const labelStyle2 = { fontSize: 12, color: "var(--text, #ddd)", flexShrink: 0 };
  const modeOptions = [
    { v: "auto", label: t$1("qs.exs.mode.auto") },
    { v: "prompts", label: t$1("qs.exs.mode.prompts") },
    { v: "builtin", label: t$1("qs.exs.mode.builtin") }
  ];
  const stepBtn = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 24,
    height: 24,
    border: "1px solid var(--border, #3a3a3a)",
    borderRadius: 6,
    background: "none",
    color: "var(--text, #ddd)",
    cursor: "pointer",
    fontSize: 13,
    padding: 0,
    fontFamily: "inherit"
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2, fontFamily: "inherit" }, children: [
    /* @__PURE__ */ jsxs("div", { style: rowStyle2, children: [
      /* @__PURE__ */ jsx("span", { style: labelStyle2, children: t$1("qs.exs.mode") }),
      /* @__PURE__ */ jsx(
        "select",
        {
          value: mode,
          disabled: !loaded,
          onChange: (e) => setMode(e.target.value),
          style: { flex: 1, minWidth: 0, maxWidth: 260, background: "var(--bg-hover, #232323)", color: "var(--text, #ddd)", border: "1px solid var(--border, #3a3a3a)", borderRadius: 6, padding: "4px 8px", fontSize: 12, fontFamily: "inherit" },
          children: modeOptions.map((o) => /* @__PURE__ */ jsx("option", { value: o.v, children: o.label }, o.v))
        }
      )
    ] }),
    /* @__PURE__ */ jsxs("div", { style: rowStyle2, children: [
      /* @__PURE__ */ jsx("span", { style: labelStyle2, children: t$1("qs.exs.maxChips") }),
      /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 8 }, children: [
        /* @__PURE__ */ jsx("button", { type: "button", style: stepBtn, disabled: !loaded || maxChips <= 2, onClick: () => setMaxChips((v) => Math.max(2, v - 1)), "aria-label": "-", children: "−" }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text, #ddd)", minWidth: 16, textAlign: "center" }, children: maxChips }),
        /* @__PURE__ */ jsx("button", { type: "button", style: stepBtn, disabled: !loaded || maxChips >= 8, onClick: () => setMaxChips((v) => Math.min(8, v + 1)), "aria-label": "+", children: "＋" })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "flex-end", padding: "8px 0 2px" }, children: /* @__PURE__ */ jsx(
      "button",
      {
        type: "button",
        disabled: !loaded || saving,
        onClick: () => {
          void save();
        },
        style: { border: "1px solid var(--accent, #2563eb)", borderRadius: 6, background: "none", color: "var(--accent, #2563eb)", fontSize: 12, padding: "5px 14px", cursor: "pointer", fontFamily: "inherit", opacity: !loaded || saving ? 0.5 : 1 },
        children: t$1("qs.exs.save")
      }
    ) })
  ] });
}
function renderWidget(id, props) {
  switch (id) {
    case "guide":
      return /* @__PURE__ */ jsx(GuideWidget, { ...props });
    case "shortcuts":
      return /* @__PURE__ */ jsx(ShortcutsWidget, { ...props });
    case "streaming":
      return /* @__PURE__ */ jsx(RuntimeWidget, { ...props });
    case "examples":
      return /* @__PURE__ */ jsx(ExamplesWidget, { ...props });
    default:
      return null;
  }
}
function FreshGuidePage(props) {
  const isMobile = props.isMobile === true;
  const vitals = useVitals(null);
  const importReady = useImportServiceReady();
  const recents = useRecentRoots();
  const bigBtn = (icon, label, hint, onClick, key, accent = false) => /* @__PURE__ */ jsxs(
    "button",
    {
      type: "button",
      style: {
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 6,
        flex: isMobile ? void 0 : 1,
        minWidth: isMobile ? void 0 : 160,
        padding: "12px 14px",
        border: `1px solid var(--border, #3a3a3a)`,
        borderRadius: 12,
        background: accent ? "var(--bg-hover, #232323)" : "none",
        color: "var(--text, #ddd)",
        cursor: "pointer",
        fontFamily: "inherit",
        textAlign: "left",
        transition: "border-color 0.12s, background 0.12s"
      },
      onClick,
      onMouseEnter: (e) => {
        e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
      },
      children: [
        /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13.5, fontWeight: 600 }, children: [
          icon,
          label
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim, #888)", lineHeight: 1.5 }, children: hint })
      ]
    },
    key
  );
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18, padding: "8px 4px", fontFamily: "inherit" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, fontSize: 20, fontWeight: 600, color: "var(--text, #ddd)" }, children: [
        /* @__PURE__ */ jsx(RocketIcon, { size: 22 }),
        t$1("qs.start.title")
      ] }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: "var(--text-muted, #999)" }, children: t$1("qs.start.subtitle") })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: isMobile ? "column" : "row", gap: 10 }, children: [
      bigBtn(/* @__PURE__ */ jsx(FolderPlusIcon, { size: 16 }), t$1("qs.start.acquire"), t$1("qs.start.acquireHint"), openWorkspaceHub, "hub", true),
      bigBtn(/* @__PURE__ */ jsx(CpuIcon, { size: 16 }), t$1("qs.start.configureModel"), vitals.modelsOk && vitals.modelCount > 0 ? t$1("qs.start.modelOk") : t$1("qs.start.modelMissing"), openModelConfig, "model"),
      importReady ? bigBtn(/* @__PURE__ */ jsx(ImportIcon, { size: 16 }), t$1("qs.start.importModels"), t$1("qs.start.importModelsHint"), openModelsImport, "import") : null
    ] }),
    recents.length > 0 ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim, #888)" }, children: t$1("qs.start.recent") }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: recents.map((r) => /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          title: r.root,
          style: chipBase,
          onClick: () => {
            try {
              extSvc("pi-web.newSession")?.setCwd?.(r.root);
            } catch {
            }
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
            e.currentTarget.style.color = "var(--accent, #2563eb)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
            e.currentTarget.style.color = "var(--text-muted, #999)";
          },
          children: r.name
        },
        r.root
      )) })
    ] }) : null,
    /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 8 }, children: [t$1("qs.start.step.workspace"), t$1("qs.start.step.model"), t$1("qs.start.step.msg")].map((label, i) => /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-muted, #999)" }, children: [
      /* @__PURE__ */ jsx("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 18, height: 18, borderRadius: 999, fontSize: 11, fontWeight: 600, color: "var(--accent, #2563eb)", border: "1px solid var(--accent, #2563eb)" }, children: i + 1 }),
      label
    ] }, label)) })
  ] });
}
const FILLER_STEP_KEYS = ["qs.filler.step1", "qs.filler.step2", "qs.filler.step3"];
function QuickstartFiller() {
  const [dismissed, setDismissed] = useState(() => readSidebarDismissed());
  const vitals = useVitals(null);
  const importReady = useImportServiceReady();
  if (dismissed) return null;
  const noWorkspace = !vitals.ready ? false : deriveOnboardingState({ cwd: vitals.cwd, recentRootCount: vitals.recentRootCount, modelCount: vitals.modelCount }) === "fresh";
  return /* @__PURE__ */ jsxs("div", { style: {
    // The header slot sits inside the app-center scroll body padding; no outer horizontal
    // margin here, so a dismissed guide leaves no empty flex item above the search row.
    flexShrink: 0,
    margin: "10px 0 8px",
    padding: "10px 12px",
    border: "1px solid var(--border, #3a3a3a)",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    fontFamily: "inherit"
  }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6 }, children: [
      /* @__PURE__ */ jsx(RocketIcon, { size: 13 }),
      /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, color: "var(--text, #ddd)" }, children: t$1("qs.filler.title") }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          title: t$1("qs.filler.dismiss"),
          "aria-label": t$1("qs.filler.dismiss"),
          onClick: () => {
            writeSidebarDismissed(true);
            setDismissed(true);
          },
          style: {
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 20,
            height: 20,
            padding: 0,
            background: "none",
            border: "none",
            borderRadius: 5,
            color: "var(--text-dim, #888)",
            cursor: "pointer",
            fontSize: 12,
            lineHeight: 1
          },
          onMouseEnter: (e) => {
            e.currentTarget.style.background = "var(--bg-hover, #232323)";
            e.currentTarget.style.color = "var(--text, #ddd)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "none";
            e.currentTarget.style.color = "var(--text-dim, #888)";
          },
          children: "✕"
        }
      )
    ] }),
    noWorkspace ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          style: primaryBtn,
          onClick: openWorkspaceHub,
          onMouseEnter: (e) => {
            e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "none";
          },
          children: [
            /* @__PURE__ */ jsx(FolderPlusIcon, { size: 12 }),
            t$1("qs.open.hub")
          ]
        }
      ),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          style: chipBase,
          onClick: openModelConfig,
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
            e.currentTarget.style.color = "var(--accent, #2563eb)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
            e.currentTarget.style.color = "var(--text-muted, #999)";
          },
          children: t$1("qs.start.configureModel")
        }
      ),
      importReady ? /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          style: chipBase,
          onClick: openModelsImport,
          title: t$1("qs.start.importModelsTitle"),
          onMouseEnter: (e) => {
            e.currentTarget.style.borderColor = "var(--accent, #2563eb)";
            e.currentTarget.style.color = "var(--accent, #2563eb)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.borderColor = "var(--border, #3a3a3a)";
            e.currentTarget.style.color = "var(--text-muted, #999)";
          },
          children: [
            /* @__PURE__ */ jsx(ImportIcon, {}),
            /* @__PURE__ */ jsx("span", { children: t$1("qs.start.importModels") })
          ]
        }
      ) : null
    ] }) : /* @__PURE__ */ jsxs(Fragment, { children: [
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: FILLER_STEP_KEYS.map((key, i) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--text-dim, #888)", flexShrink: 0 }, children: [
          i + 1,
          "."
        ] }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text-muted, #999)", lineHeight: 1.6, minWidth: 0 }, children: t$1(key) })
      ] }, key)) }),
      /* @__PURE__ */ jsxs(
        "button",
        {
          type: "button",
          onClick: () => {
            void openQuickstart();
          },
          style: primaryBtn,
          onMouseEnter: (e) => {
            e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
          },
          onMouseLeave: (e) => {
            e.currentTarget.style.background = "none";
          },
          children: [
            /* @__PURE__ */ jsx(RocketIcon, { size: 12 }),
            t$1("qs.filler.open")
          ]
        }
      )
    ] })
  ] });
}
function WorkspacePickerAcquireEntry() {
  return /* @__PURE__ */ jsx(
    MenuActionRow,
    {
      icon: /* @__PURE__ */ jsx(FolderPlusIcon, { size: 13 }),
      label: t$1("qs.open.hub"),
      title: t$1("qs.open.hub"),
      onClick: openWorkspaceHub
    }
  );
}
const COMPONENT_DICT = {
  en: {
    "files.cancel": "Cancel",
    "files.loading": "Loading files...",
    "files.noSubdirs": "No subdirectories",
    "files.parentDir": "Parent directory",
    "files.selectFolder": "Select this folder",
    "i18n.close": "Close",
    "sidebar.customPath": "Custom path…",
    "files.openFolder": "Open Folder",
    "sidebar.filterProjects": "Filter projects…",
    "sidebar.noMatchingProjects": "No matching projects",
    "sidebar.useDefaultDirectory": "Use default directory",
    "files.showIgnored": "Show ignored items",
    "files.hideIgnored": "Hide ignored items",
    "files.pin": "Pin",
    "files.ignoredGitInternalTip": "{path} (internal git metadata, hidden by default)",
    "files.ignoredByRulesTip": "{path} (ignored by .gitignore/.aitignore)",
    "git.branchPanelTitle": "Branch panel (branch / tag / stash)",
    "git.pushTitle": "Push commits",
    "git.pullTitle": "Pull (ff-only)",
    "git.pushConfirm": "Push {count} commit(s) to upstream?",
    "git.pullConfirm": "Pull {count} commit(s) from upstream (ff-only)?",
    "git.commitTitle": "Commit",
    "git.commitShort": "Commit",
    "git.stageAll": "Select all",
    "git.stageNone": "Staged only",
    "git.stagedCount": "{count} selected",
    "git.commitPlaceholder": "Commit message…",
    "git.amend": "Amend last commit",
    "git.commitBtn": "Commit",
    "git.planShort": "Group",
    "git.planTitle": "Group & commit plan (staged group-by-group, breakpoint-resumable)",
    "git.planMoveTo": "Move to next group",
    "git.planExclude": "Exclude from plan",
    "git.planRestore": "Restore to first group",
    "git.planAddGroup": "＋ New group (takes last file of largest group)",
    "git.planExcluded": "Excluded (won't be committed)",
    "git.planStuck": "Stuck at group {group} — earlier groups already committed",
    "git.planRolledBack": "rolled back to base HEAD",
    "git.planRollback": "Roll back plan (reset --mixed)",
    "git.planExecute": "Commit group by group",
    "git.planConfirm": "Commit {count} group(s), one commit each?",
    "git.planNewGroupMessage": "chore: new group",
    "git.aiRefine": "AI refine",
    "git.aiRefineBusy": "AI grouping… (up to 3 min)",
    "git.aiMessage": "Generate",
    "git.aiMessageBusy": "Generating… (up to 3 min)",
    "git.aiMessageOverwrite": "Message already has content. Overwrite with the generated commit message?",
    "git.aiMessageTitle": "Generate a commit message with AI (reads AGENTS.md and the diff of selected files)",
    "git.stagedBucket": "Staged",
    "git.unstagedBucket": "Changes",
    "git.stageTitle": "Stage",
    "git.unstageTitle": "Unstage",
    "git.discardTitle": "Discard changes",
    // 已跟踪文件（引擎 discard = checkout 恢复到上次提交；untracked 由客户端分流到回收站，走下方专属文案）
    "git.discardConfirm": "Discard ALL uncommitted changes of {path}? (tracked files restore to the last commit)",
    "git.discardUntrackedConfirm": "Move the untracked file to the trash? (restorable from the trash)",
    "git.diffTitle": "View diff (git-review)",
    "git.changesToggle": "Toggle changed-files section",
    "git.planRetry": "Retry remaining groups"
  },
  "zh-CN": {
    "files.cancel": "取消",
    "files.loading": "正在加载文件...",
    "files.noSubdirs": "无子目录",
    "files.parentDir": "上级目录",
    "files.selectFolder": "选择此文件夹",
    "i18n.close": "关闭",
    "sidebar.customPath": "自定义路径…",
    "files.openFolder": "打开文件夹",
    "sidebar.filterProjects": "筛选项目…",
    "sidebar.noMatchingProjects": "没有匹配的项目",
    "sidebar.useDefaultDirectory": "使用默认目录",
    "files.showIgnored": "显示忽略项",
    "files.hideIgnored": "隐藏被忽略项",
    "files.pin": "钉住",
    "files.ignoredGitInternalTip": "{path}（git 仓库内部，默认隐藏）",
    "files.ignoredByRulesTip": "{path}（已被 .gitignore/.aitignore 忽略）",
    "git.branchPanelTitle": "分支面板（分支 / tag / stash）",
    "git.pushTitle": "推送提交",
    "git.pullTitle": "拉取（ff-only）",
    "git.pushConfirm": "推送 {count} 个提交到上游？",
    "git.pullConfirm": "从上游拉取 {count} 个提交（ff-only）？",
    "git.commitTitle": "提交",
    "git.commitShort": "提交",
    "git.stageAll": "全选",
    "git.stageNone": "仅暂存区",
    "git.stagedCount": "已选 {count} 个",
    "git.commitPlaceholder": "提交消息…",
    "git.amend": "修正上一笔（amend）",
    "git.commitBtn": "提交",
    "git.planShort": "分组",
    "git.planTitle": "分组提交计划（逐组提交 · 失败断点可回滚）",
    "git.planMoveTo": "移到下一组",
    "git.planExclude": "剔除出计划",
    "git.planRestore": "恢复到第一组",
    "git.planAddGroup": "＋ 新建组（取最大组的最后一个文件）",
    "git.planExcluded": "已剔除（不会提交）",
    "git.planStuck": "卡在第 {group} 组——之前的组已提交",
    "git.planRolledBack": "已回滚到起点 HEAD",
    "git.planRollback": "回滚本计划（reset --mixed）",
    "git.planExecute": "逐组提交",
    "git.planConfirm": "共 {count} 组，每组一笔提交？",
    "git.planNewGroupMessage": "chore: new group",
    "git.aiRefine": "AI 精修",
    "git.aiRefineBusy": "AI 分组中…（最长 3 分钟）",
    "git.aiMessage": "生成",
    "git.aiMessageBusy": "生成中…（最长 3 分钟）",
    "git.aiMessageOverwrite": "输入框已有内容，生成结果将覆盖，是否继续？",
    "git.aiMessageTitle": "AI 生成提交信息（读取 AGENTS.md 与所选文件的 diff）",
    "git.stagedBucket": "已暂存",
    "git.unstagedBucket": "工作区",
    "git.stageTitle": "暂存",
    "git.unstageTitle": "取消暂存",
    "git.discardTitle": "丢弃变更",
    // 已跟踪文件（引擎 discard = checkout 恢复到上次提交；untracked 由客户端分流到回收站，走下方专属文案）
    "git.discardConfirm": "丢弃 {path} 的全部未提交改动？（已跟踪文件将恢复到上次提交）",
    "git.discardUntrackedConfirm": "将未跟踪文件移入回收站？（可在回收站还原）",
    "git.diffTitle": "查看 diff（git-review）",
    "git.changesToggle": "开/合变更文件区",
    "git.planRetry": "重试剩余组"
  }
};
function currentLocale() {
  const raw = window.__PI_LOCALE__ || document.documentElement.lang || "en";
  const l = String(raw);
  if (l.startsWith("zh")) return "zh-CN";
  return l;
}
function ct(key, params) {
  const dict = COMPONENT_DICT[currentLocale()];
  let hit = dict && dict[key];
  if (hit === void 0) hit = t(key);
  return hit;
}
function FolderIcon({ open, size }) {
  return /* @__PURE__ */ jsx("svg", { width: size ?? 14, height: size ?? 14, viewBox: "0 0 24 24", fill: "none", stroke: "var(--text-dim)", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", style: { flexShrink: 0 }, children: /* @__PURE__ */ jsx("path", { d: open ? "m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2" : "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" }) });
}
const rowStyle = { display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "0 12px", height: 26, border: "none", background: "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left" };
function DirectoryBrowser({ initialPath, onSelect, onCancel }) {
  const [path, setPath] = useState(initialPath || "");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const load = useCallback((target) => {
    if (loading) return;
    setLoading(true);
    setError(null);
    const p = target ? { path: target } : {};
    fetch(apiUrl("/api/cwd/browse"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(p) }).then(async (r) => {
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
      setData(d);
      setPath(d.path);
    }).catch((e) => setError(e && e.message ? e.message : String(e))).finally(() => setLoading(false));
  }, [loading]);
  useEffect(() => {
    load(initialPath || "");
  }, []);
  useEffect(() => {
    const k = (e) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", k, true);
    return () => document.removeEventListener("keydown", k, true);
  }, [onCancel]);
  const dirs = data && data.directories || [];
  const drives = data && data.drives;
  return /* @__PURE__ */ jsx("div", { onClick: (e) => {
    if (e.target === e.currentTarget) onCancel();
  }, style: { position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }, children: /* @__PURE__ */ jsxs("div", { style: { width: "min(560px,92vw)", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 8px 32px rgba(0,0,0,0.3)", overflow: "hidden" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderBottom: "1px solid var(--border)", background: "var(--bg)", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)", flex: 1 }, children: ct("sidebar.customPath") }),
      /* @__PURE__ */ jsx("button", { onClick: onCancel, title: ct("i18n.close"), style: { height: 28, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-panel)", color: "var(--text)", cursor: "pointer", fontSize: 12 }, children: "✕" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderBottom: "1px solid var(--border)", flexShrink: 0, fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflowX: "auto", whiteSpace: "nowrap" }, children: [
      data && data.parentPath != null ? /* @__PURE__ */ jsx("button", { onClick: () => load(data.parentPath), title: ct("files.parentDir"), style: { height: 22, padding: "0 6px", border: "1px solid var(--border)", borderRadius: 4, background: "var(--bg-panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, flexShrink: 0 }, children: "↑" }) : null,
      /* @__PURE__ */ jsx("span", { title: path, style: { overflow: "hidden", textOverflow: "ellipsis" }, children: path || "/" })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "4px 0" }, children: [
      loading ? /* @__PURE__ */ jsx("div", { style: { padding: "12px", fontSize: 12, color: "var(--text-dim)" }, children: ct("files.loading") }) : null,
      error ? /* @__PURE__ */ jsx("div", { style: { padding: "12px", fontSize: 12, color: "var(--danger, #f87171)" }, children: error }) : null,
      !loading && !error && drives && drives.length > 0 ? drives.map((d) => /* @__PURE__ */ jsxs("button", { onClick: () => load(d.path), style: rowStyle, children: [
        /* @__PURE__ */ jsx(FolderIcon, { open: false }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 12 }, children: d.name })
      ] }, d.path)) : null,
      !loading && !error && dirs.length === 0 && (!drives || drives.length === 0) ? /* @__PURE__ */ jsx("div", { style: { padding: "12px", fontSize: 12, color: "var(--text-dim)" }, children: ct("files.noSubdirs") }) : null,
      !loading && !error ? dirs.map((d) => /* @__PURE__ */ jsxs("button", { onClick: () => load(d.path), onDoubleClick: () => onSelect(d.path), style: rowStyle, children: [
        /* @__PURE__ */ jsx(FolderIcon, { open: false }),
        /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: d.name }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)" }, children: "→" })
      ] }, d.path)) : null
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, padding: "8px 12px", borderTop: "1px solid var(--border)", flexShrink: 0, background: "var(--bg)" }, children: [
      /* @__PURE__ */ jsx("button", { onClick: () => path && onSelect(path), disabled: !path, style: { height: 28, padding: "0 12px", border: "none", borderRadius: 5, background: "var(--accent)", color: "#fff", cursor: path ? "pointer" : "not-allowed", fontSize: 12, fontWeight: 600, opacity: path ? 1 : 0.5 }, children: ct("files.selectFolder") }),
      /* @__PURE__ */ jsx("button", { onClick: onCancel, style: { height: 28, padding: "0 10px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg-panel)", color: "var(--text)", cursor: "pointer", fontSize: 12 }, children: ct("files.cancel") })
    ] })
  ] }) });
}
async function fetchHistory() {
  try {
    const res = await fetch(apiUrl$1("/api/extensions/aiti-quickstart/workspace/history"), { headers: { accept: "application/json" } });
    const d = await res.json();
    return Array.isArray(d.workspaces) ? d.workspaces : [];
  } catch {
    return [];
  }
}
function uploadService() {
  try {
    const svc = extSvc("session-manager.uploadWorkspace");
    if (svc && typeof svc.open === "function") return svc;
  } catch {
  }
  return null;
}
function setCwd(root) {
  try {
    extSvc("pi-web.newSession")?.setCwd?.(root);
  } catch {
  }
}
function recordHistory(root, source, extra) {
  if (source !== "clone") {
    void fetch(apiUrl$1("/api/extensions/aiti-quickstart/workspace/history"), {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "record", source, root, name: root.split(/[\\/]/).filter(Boolean).pop() ?? root, time: Date.now() })
    }).catch(() => {
    });
  }
}
const overlayStyle = {
  position: "fixed",
  inset: 0,
  zIndex: 130,
  background: "rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16
};
const panelStyle = {
  width: 600,
  maxWidth: "94vw",
  minHeight: 320,
  maxHeight: "min(760px, 90dvh)",
  display: "flex",
  flexDirection: "column",
  background: "var(--bg, #1a1a1a)",
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 12,
  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
  overflow: "hidden"
};
const headStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "12px 14px 8px",
  flexShrink: 0
};
const bodyStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: "4px 14px 14px",
  display: "flex",
  flexDirection: "column",
  gap: 12
};
const tabBtn = (active) => ({
  border: "1px solid " + (active ? "var(--accent, #2563eb)" : "var(--border, #3a3a3a)"),
  borderRadius: 8,
  padding: "4px 10px",
  fontSize: 12,
  background: "none",
  cursor: "pointer",
  color: active ? "var(--accent, #2563eb)" : "var(--text-muted, #999)",
  fontFamily: "inherit"
});
const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  background: "var(--bg-hover, #232323)",
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 8,
  padding: "6px 9px",
  color: "var(--text, #ddd)",
  fontSize: 12,
  fontFamily: "inherit",
  outline: "none"
};
const goBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--accent, #2563eb)",
  borderRadius: 8,
  padding: "6px 14px",
  background: "none",
  color: "var(--accent, #2563eb)",
  cursor: "pointer",
  fontSize: 12,
  fontFamily: "inherit"
};
const labelStyle = { fontSize: 11, color: "var(--text-dim, #888)", flexShrink: 0 };
const browseBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  flexShrink: 0,
  padding: 0,
  background: "var(--bg-hover, #232323)",
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 8,
  color: "var(--text-muted, #999)",
  cursor: "pointer"
};
const errStyle = { fontSize: 11.5, color: "var(--danger, #ef4444)", lineHeight: 1.5, wordBreak: "break-all" };
function FolderGlyph() {
  return /* @__PURE__ */ jsx("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", children: /* @__PURE__ */ jsx("path", { d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" }) });
}
function DirectoryPick(props) {
  return createPortal(
    /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, zIndex: 2147483600 }, children: /* @__PURE__ */ jsx(DirectoryBrowser, { initialPath: props.initialPath, onSelect: props.onSelect, onCancel: props.onCancel }) }),
    document.body
  );
}
function WorkspaceHub() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("clone");
  const [history, setHistory] = useState([]);
  const pickCallback = useRef(null);
  useEffect(() => {
    const onOpen = (event) => {
      const detail = event.detail;
      pickCallback.current = typeof detail?.onSelect === "function" ? detail.onSelect : null;
      setOpen(true);
      setTab("clone");
      void fetchHistory().then(setHistory);
    };
    try {
      window.addEventListener("aiti-quickstart:open-hub", onOpen);
    } catch {
    }
    return () => {
      try {
        window.removeEventListener("aiti-quickstart:open-hub", onOpen);
      } catch {
      }
    };
  }, []);
  if (!open) return null;
  const closeHub = () => {
    pickCallback.current = null;
    setOpen(false);
  };
  const refreshHistory = () => {
    void fetchHistory().then(setHistory);
  };
  const enter = (root, source, extra) => {
    recordHistory(root, source);
    const cb = pickCallback.current;
    pickCallback.current = null;
    if (cb) cb(root);
    else setCwd(root);
    setOpen(false);
  };
  return createPortal(
    /* @__PURE__ */ jsx("div", { style: overlayStyle, onClick: (e) => {
      if (e.target === e.currentTarget) closeHub();
    }, children: /* @__PURE__ */ jsxs(
      "div",
      {
        style: { ...panelStyle },
        "data-ext-float": "1",
        "data-ext-float-full": "1",
        "data-ext-float-w": "600",
        "data-ext-float-h": "600",
        "data-ext-float-autoh": "1",
        "data-ext-float-min-h": "320",
        children: [
          /* @__PURE__ */ jsxs("div", { style: headStyle, children: [
            /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: 600, color: "var(--text, #ddd)" }, children: t$1("qs.hub.title") }),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                title: t$1("qs.hub.close"),
                "aria-label": t$1("qs.hub.close"),
                onClick: closeHub,
                style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, padding: 0, background: "none", border: "none", borderRadius: 6, color: "var(--text-dim, #888)", cursor: "pointer", fontSize: 13, lineHeight: 1 },
                onMouseEnter: (e) => {
                  e.currentTarget.style.background = "var(--bg-hover, #232323)";
                  e.currentTarget.style.color = "var(--text, #ddd)";
                },
                onMouseLeave: (e) => {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--text-dim, #888)";
                },
                children: "✕"
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { style: bodyStyle, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, paddingBottom: 10, borderBottom: "1px solid var(--border, #3a3a3a)" }, children: [
              /* @__PURE__ */ jsx("span", { style: labelStyle, children: t$1("qs.hub.recent") }),
              history.length === 0 ? /* @__PURE__ */ jsx("span", { style: { fontSize: 11.5, color: "var(--text-dim, #888)" }, children: t$1("qs.hub.recentEmpty") }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: history.map((h) => /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", border: "1px solid var(--border, #3a3a3a)", borderRadius: 999, overflow: "hidden" }, children: [
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    title: h.root,
                    onClick: () => enter(h.root, h.source === "clone" ? "clone" : h.source === "new" ? "new" : h.source === "local" ? "local" : "local", h.url ? { url: h.url } : void 0),
                    style: { border: "none", background: "none", padding: "3px 4px 3px 10px", cursor: "pointer", color: "var(--text-muted, #999)", fontSize: 11.5, fontFamily: "inherit" },
                    onMouseEnter: (e) => {
                      e.currentTarget.style.color = "var(--accent, #2563eb)";
                    },
                    onMouseLeave: (e) => {
                      e.currentTarget.style.color = "var(--text-muted, #999)";
                    },
                    children: h.name
                  }
                ),
                /* @__PURE__ */ jsx(
                  "button",
                  {
                    type: "button",
                    title: t$1("qs.hub.forget"),
                    onClick: async () => {
                      await fetch(apiUrl$1("/api/extensions/aiti-quickstart/workspace/forget"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: h.id }) }).catch(() => {
                      });
                      refreshHistory();
                    },
                    style: { border: "none", background: "none", padding: "3px 8px 3px 2px", cursor: "pointer", color: "var(--text-dim, #888)", fontSize: 10 },
                    children: "✕"
                  }
                )
              ] }, h.id)) })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6, flexShrink: 0 }, children: ["clone", "upload", "local", "new"].map((k) => /* @__PURE__ */ jsx("button", { type: "button", style: tabBtn(tab === k), onClick: () => setTab(k), children: t$1(`qs.hub.tab.${k}`) }, k)) }),
            tab === "clone" ? /* @__PURE__ */ jsx(CloneTab, { onEnter: enter, onRefreshHistory: refreshHistory }) : null,
            tab === "upload" ? /* @__PURE__ */ jsx(UploadTab, { onEnter: enter }) : null,
            tab === "local" ? /* @__PURE__ */ jsx(LocalTab, { onEnter: enter }) : null,
            tab === "new" ? /* @__PURE__ */ jsx(NewTab, { onEnter: enter }) : null
          ] })
        ]
      }
    ) }),
    document.body
  );
}
async function resolveBrowseStart(typed) {
  const value = typed.trim();
  if (value) return value;
  try {
    const res = await fetch(apiUrl$1("/api/cwd/validate"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cwd: "~/workspace" })
    });
    const d = await res.json();
    if (res.ok && d.cwd) return d.cwd;
  } catch {
  }
  return "~";
}
function CloneTab(props) {
  const [url, setUrl] = useState("");
  const [branch, setBranch] = useState("");
  const [dir, setDir] = useState("");
  const [depth, setDepth] = useState(false);
  const [busy, setBusy] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseStart, setBrowseStart] = useState(void 0);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const parsed = url.trim() ? parseGitUrl(url) : null;
  const go = async () => {
    setError(null);
    if (!parsed) {
      setError(t$1("qs.hub.err.parse"));
      return;
    }
    setBusy(true);
    setProgress("…");
    try {
      const res = await fetch(apiUrl$1("/api/extensions/aiti-quickstart/workspace/clone"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: parsed.ref, branch: parsed.branch ?? (branch.trim() || void 0), dir: dir.trim() || void 0, depth: depth ? 1 : void 0 })
      });
      const d = await res.json();
      if (!res.ok || !d.ok) {
        setError(d.error ?? `HTTP ${res.status}`);
        setBusy(false);
        setProgress(null);
        return;
      }
      props.onRefreshHistory();
      props.onEnter(d.root ?? "", "clone", { url: parsed.ref });
    } catch (e) {
      setError(e.message);
      setBusy(false);
      setProgress(null);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsxs("label", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
      /* @__PURE__ */ jsx("span", { style: labelStyle, children: t$1("qs.hub.clone.url") }),
      /* @__PURE__ */ jsx("input", { style: inputStyle, value: url, onChange: (e) => setUrl(e.target.value), placeholder: "https://github.com/user/repo.git", disabled: busy })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("label", { style: { flex: 1, display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: labelStyle, children: t$1("qs.hub.clone.branch") }),
        /* @__PURE__ */ jsx("input", { style: inputStyle, value: branch, onChange: (e) => setBranch(e.target.value), disabled: busy })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { flex: 1.4, display: "flex", flexDirection: "column", gap: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: labelStyle, children: t$1("qs.hub.clone.dir") }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
          /* @__PURE__ */ jsx("input", { style: { ...inputStyle, flex: 1, minWidth: 0 }, value: dir, onChange: (e) => setDir(e.target.value), placeholder: "~/workspace", disabled: busy }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              title: t$1("qs.hub.local.browse"),
              "aria-label": t$1("qs.hub.local.browse"),
              disabled: busy,
              onClick: () => {
                void resolveBrowseStart(dir).then((p) => {
                  setBrowseStart(p);
                  setBrowseOpen(true);
                });
              },
              style: { ...browseBtn, opacity: busy ? 0.5 : 1 },
              children: /* @__PURE__ */ jsx(FolderGlyph, {})
            }
          )
        ] })
      ] })
    ] }),
    browseOpen ? /* @__PURE__ */ jsx(
      DirectoryPick,
      {
        initialPath: browseStart,
        onSelect: (p) => {
          setDir(p);
          setBrowseOpen(false);
        },
        onCancel: () => setBrowseOpen(false)
      }
    ) : null,
    /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--text-muted, #999)", cursor: "pointer" }, children: [
      /* @__PURE__ */ jsx("input", { type: "checkbox", checked: depth, onChange: (e) => setDepth(e.target.checked), disabled: busy }),
      t$1("qs.hub.clone.depth")
    ] }),
    busy ? /* @__PURE__ */ jsx("div", { style: { fontSize: 11.5, color: "var(--text-dim, #888)" }, children: progress ?? "…" }) : null,
    error ? /* @__PURE__ */ jsx("div", { style: errStyle, children: error }) : null,
    /* @__PURE__ */ jsx("button", { type: "button", style: { ...goBtn, alignSelf: "flex-start", opacity: busy || !parsed ? 0.5 : 1 }, disabled: busy || !parsed, onClick: () => {
      void go();
    }, children: t$1("qs.hub.clone.go") })
  ] });
}
function UploadTab(props) {
  const svc = uploadService();
  if (!svc) {
    return /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim, #888)", lineHeight: 1.6 }, children: t$1("qs.hub.upload.fallback") });
  }
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text-muted, #999)" }, children: t$1("qs.hub.tab.upload") }),
    /* @__PURE__ */ jsx("button", { type: "button", style: { ...goBtn, alignSelf: "flex-start" }, onClick: () => {
      svc.open({
        onSelect: (root) => props.onEnter(root, "local"),
        // upload history is rendered by the server-side scan; entering here only
        onClose: () => {
        }
      });
    }, children: t$1("qs.hub.tab.upload") })
  ] });
}
function LocalTab(props) {
  const [path, setPath] = useState("");
  const [error, setError] = useState(null);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [browseStart, setBrowseStart] = useState(void 0);
  const go = async () => {
    setError(null);
    const p = path.trim();
    if (!p) {
      setError(t$1("qs.hub.err.parse"));
      return;
    }
    try {
      const res = await fetch(apiUrl$1("/api/cwd/validate"), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cwd: p }) });
      const d = await res.json();
      if (!res.ok || !d.cwd) {
        setError(d.error ?? `HTTP ${res.status}`);
        return;
      }
      props.onEnter(d.cwd, "local");
    } catch (e) {
      setError(e.message);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
      /* @__PURE__ */ jsx("span", { style: labelStyle, children: t$1("qs.hub.tab.local") }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 4 }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            style: { ...inputStyle, flex: 1, minWidth: 0 },
            value: path,
            onChange: (e) => setPath(e.target.value),
            onKeyDown: (e) => {
              if (e.key === "Enter") void go();
            },
            placeholder: "/home/you/projects/my-app"
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            title: t$1("qs.hub.local.browse"),
            "aria-label": t$1("qs.hub.local.browse"),
            onClick: () => {
              void resolveBrowseStart(path).then((p) => {
                setBrowseStart(p);
                setBrowseOpen(true);
              });
            },
            style: browseBtn,
            children: /* @__PURE__ */ jsx(FolderGlyph, {})
          }
        )
      ] })
    ] }),
    browseOpen ? /* @__PURE__ */ jsx(
      DirectoryPick,
      {
        initialPath: browseStart,
        onSelect: (p) => {
          setPath(p);
          setBrowseOpen(false);
        },
        onCancel: () => setBrowseOpen(false)
      }
    ) : null,
    error ? /* @__PURE__ */ jsx("div", { style: errStyle, children: error }) : null,
    /* @__PURE__ */ jsx("button", { type: "button", style: { ...goBtn, alignSelf: "flex-start" }, onClick: () => {
      void go();
    }, children: t$1("qs.hub.local.go") })
  ] });
}
function NewTab(props) {
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(apiUrl$1("/api/default-cwd"), { method: "POST" });
      const d = await res.json();
      if (!res.ok || !d.cwd) {
        setError(d.error ?? `HTTP ${res.status}`);
        setBusy(false);
        return;
      }
      props.onEnter(d.cwd, "new");
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text-muted, #999)", lineHeight: 1.6 }, children: t$1("qs.start.acquireHint") }),
    error ? /* @__PURE__ */ jsx("div", { style: errStyle, children: error }) : null,
    /* @__PURE__ */ jsx("button", { type: "button", style: { ...goBtn, alignSelf: "flex-start", opacity: busy ? 0.5 : 1 }, disabled: busy, onClick: () => {
      void go();
    }, children: t$1("qs.hub.new.go") })
  ] });
}
function WorkspaceHubRoot() {
  return /* @__PURE__ */ jsx(WorkspaceHub, {});
}
function register(ctx) {
  __setCtx$1(ctx);
  __setCtx(ctx);
  ctx.registerItems?.("newSessionWidgets", WIDGET_METAS.map((m) => ({
    id: m.id,
    render: (props) => renderWidget(m.id, props ?? {}),
    meta: {
      title: t$1(WIDGET_TITLE_KEYS[m.id] ?? m.id),
      areas: m.areas,
      defaultArea: m.defaultArea,
      w: m.w,
      h: m.h,
      priority: m.priority
    },
    ...m.id === "examples" ? { settings: { render: ({ close }) => /* @__PURE__ */ jsx(ExamplesSettings, { close }) } } : {}
  })));
  ctx.registerItems?.("sidebarFooter", [{
    id: FOOTER_ITEM_ID,
    render: () => null,
    meta: { label: t$1("qs.footer.label"), title: t$1("qs.footer.title"), icon: "icons/rocket.svg", onClick: () => {
      void openQuickstart();
    } }
  }]);
  ctx.registerItems?.("workspacePickerActions", [{ id: "acquire", render: WorkspacePickerAcquireEntry }]);
  ctx.registerItems?.("dialogs", [{ id: "aiti-quickstart-hub", render: () => /* @__PURE__ */ jsx(WorkspaceHubRoot, {}) }]);
  ctx.registerItems?.("noWorkspaceGuide", [{ id: "fresh", render: (props) => /* @__PURE__ */ jsx(FreshGuidePage, { ...props }) }]);
  const disposeApi = regSvc(SERVICE_KEY, { renderQuickstart: () => /* @__PURE__ */ jsx(QuickstartFiller, {}) });
  const disposeOpen = regSvc("aiti-quickstart.open", { open: () => {
    try {
      window.dispatchEvent(new CustomEvent("aiti-quickstart:open-hub"));
    } catch {
    }
  } });
  return () => {
    try {
      disposeApi?.();
    } catch {
    }
    try {
      disposeOpen?.();
    } catch {
    }
  };
}
export {
  register as default
};
