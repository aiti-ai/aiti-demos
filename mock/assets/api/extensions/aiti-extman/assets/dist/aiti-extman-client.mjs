let _ctx = null;
function __setCtx(ctx) {
  _ctx = ctx;
}
function c(name) {
  return _ctx?.[name] ?? (() => void 0);
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
function apiUrl(p) {
  const fn = _ctx?.apiUrl;
  return typeof fn === "function" ? fn(p) : p;
}
function t(key, params) {
  const fn = _ctx?.t;
  return typeof fn === "function" ? fn(key, params) : key;
}
function currentUiLocale() {
  try {
    const v = window.localStorage.getItem("pi-locale");
    if (v === "zh-CN" || v === "zh-TW" || v === "en") return v;
  } catch {
  }
  return "en";
}
let registry = null;
let registryPrimed = false;
let registryApiUrl = null;
const listeners$1 = /* @__PURE__ */ new Set();
function primeExtRegistry(apiUrlFn) {
  if (apiUrlFn) registryApiUrl = apiUrlFn;
  if (registryPrimed || typeof window === "undefined") return;
  const urlFn = registryApiUrl;
  if (!urlFn) return;
  registryPrimed = true;
  fetch(urlFn("/api/extensions/manifest")).then((r) => r.json()).then((d) => {
    const map = {};
    for (const e of d?.extensions ?? []) if (e?.id) map[e.id] = e;
    registry = map;
    for (const l of [...listeners$1]) {
      try {
        l();
      } catch {
      }
    }
  }).catch(() => {
    registryPrimed = false;
  });
}
function onExtRegistryReady(fn) {
  listeners$1.add(fn);
  return () => {
    listeners$1.delete(fn);
  };
}
function ui18nExact(ui18n, locale) {
  if (!ui18n) return {};
  return ui18n[locale] ?? {};
}
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;
function extDisplayName$1(id, fallbackName) {
  const locale = currentUiLocale();
  primeExtRegistry();
  const entry = registry?.[id];
  const over = entry ? ui18nExact(entry.ui?.i18n, locale)["ext.displayName"] : void 0;
  if (over) return over;
  const name = fallbackName ?? entry?.name ?? "";
  if (!name) return id;
  return locale.startsWith("zh") ? name : CJK_RE.test(name) ? id : name;
}
function extDescriptionFor(ext, locale) {
  const over = ui18nExact(ext?.ui?.i18n, locale)["ext.description"];
  if (over) return over;
  return localeText(ext?.descriptionI18n, locale) || ext?.description || "";
}
function extSoulFor(ext, locale) {
  const over = ui18nExact(ext?.ui?.i18n, locale)["ext.soul"];
  if (over) return over;
  return localeText(ext?.soulI18n, locale) || ext?.soul || "";
}
function localeText(map, locale) {
  if (!map || typeof map !== "object") return "";
  const exact = map[locale];
  if (typeof exact === "string" && exact) return exact;
  const short = locale.split("-")[0];
  const family = Object.entries(map).find(([k, v]) => typeof v === "string" && v && k.split("-")[0] === short);
  return family ? family[1] : "";
}
function osaDistance(a, b) {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev2 = null;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        v = Math.min(v, prev2[j - 2] + 1);
      }
      cur[j] = v;
    }
    prev2 = prev;
    prev = cur;
  }
  return prev[n];
}
function typoThreshold(q) {
  const len = [...String(q)].length;
  if (len <= 3) return 0;
  if (len <= 7) return 1;
  return 2;
}
const TOKEN_SPLIT = /[^a-z0-9\u4e00-\u9fa5]+/;
const MAX_TOKEN_LEN = 24;
function* candidateTokens(text) {
  for (const tok of String(text || "").toLowerCase().split(TOKEN_SPLIT)) {
    if (tok && tok.length <= MAX_TOKEN_LEN) yield tok;
  }
}
function typoMatch(q, text) {
  const query = String(q || "").trim().toLowerCase();
  if (!query || /\s/.test(query)) return false;
  const threshold = typoThreshold(query);
  if (threshold <= 0) return false;
  const raw = String(text || "");
  for (const src of [raw, raw.replace(/[-_/]/g, "")]) {
    for (const tok of candidateTokens(src)) {
      if (Math.abs(tok.length - query.length) > 2) continue;
      const d = osaDistance(query, tok);
      if (d <= threshold) return true;
      if (d <= 2 && query[0] === tok[0]) return true;
    }
  }
  return false;
}
function isFixedContainingBlock(cs) {
  const zoomValue = parseFloat(cs.zoom || "");
  if (Number.isFinite(zoomValue) && zoomValue !== 1) return true;
  if (cs.transform !== "none" || cs.perspective !== "none" || cs.filter !== "none") return true;
  if (/transform|perspective|filter/.test(cs.willChange || "")) return true;
  const c2 = cs.contain;
  return c2 === "strict" || c2 === "content" || c2 === "layout" || c2 === "paint";
}
function fixedOrigin(el) {
  let n = el.parentElement;
  while (n && n !== document.documentElement) {
    try {
      if (isFixedContainingBlock(getComputedStyle(n))) {
        const r = n.getBoundingClientRect();
        return { x: r.left, y: r.top };
      }
    } catch {
    }
    n = n.parentElement;
  }
  return { x: 0, y: 0 };
}
function zoomFactorOf(el) {
  let z = 1;
  let n = el.parentElement;
  while (n && n !== document.documentElement) {
    try {
      const zoomValue = parseFloat(getComputedStyle(n).zoom || "");
      if (Number.isFinite(zoomValue) && zoomValue > 0 && zoomValue !== 1) z *= zoomValue;
    } catch {
    }
    n = n.parentElement;
  }
  return z;
}
function clampToViewport(left, top, width, height, pad = 8) {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    left: Math.max(pad, Math.min(left, vw - pad - width)),
    top: Math.max(pad, Math.min(top, Math.max(pad, vh - pad - height)))
  };
}
const P = (d) => ({ tag: "path", attrs: { d } });
const R = (x, y, width, height, rx = 2) => ({ tag: "rect", attrs: { x, y, width, height, rx } });
const thin = (n) => ({ ...n, attrs: { ...n.attrs, "stroke-width": 1.5 } });
const DOCK_ICON_NODES = {
  /** 浮窗：圆角框 + 标题栏 + 圆点（app-window；用户 2026-09-15 定稿 C）。 */
  float: [
    R(2, 4, 20, 16, 2),
    P("M10 4v4"),
    P("M2 8h20"),
    P("M6 4v4")
  ],
  /** 新窗口打开：方框 + 右上外斜箭头（square-arrow-out-up-right；
   *  用户 2026-09-15 拍板：B 图形用作「新窗口打开」，且仅支持的面板（文件/文件夹）显示）。 */
  "new-window": [
    P("M21 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6"),
    P("m21 3-9 9"),
    P("M15 3h6v6")
  ],
  /** 左栏：方框 + 左缘粗边。 */
  "panel-left": [R(3, 3, 18, 18), P("M9 3v18")],
  /** 右栏：方框 + 右缘粗边。 */
  "panel-right": [R(3, 3, 18, 18), P("M15 3v18")],
  /** 底部（预留位）：方框 + 下缘粗边。 */
  "panel-bottom": [R(3, 3, 18, 18), P("M3 15h18")],
  "chevron-up": [P("m18 15-6-6-6 6")],
  "chevron-down": [P("m6 9 6 6 6-6")],
  "chevron-left": [P("m15 18-6-6 6-6")],
  "chevron-right": [P("m9 18 6-6-6-6")],
  "arrow-up": [P("m5 12 7-7 7 7"), P("M12 19V5")],
  /** 钉住：图钉（lucide pin；⋮ 区块操作「钉住」，与 aiti-folder MiPin 同形）。 */
  pin: [
    { tag: "line", attrs: { x1: 12, y1: 17, x2: 12, y2: 22 } },
    P("M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z")
  ],
  /** 关闭：×（lucide x；⋮ 区块操作「关闭」）。 */
  x: [P("M18 6 6 18"), P("m6 6 12 12")],
  /** 取消钉住态：图钉 + 斜删除线（lucide pin-off；移动行钉住钮已钉态，与 MiPin 同语义族）。 */
  "pin-off": [
    { tag: "line", attrs: { x1: 12, y1: 17, x2: 12, y2: 22 } },
    P("M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24Z"),
    { tag: "line", attrs: { x1: 2, y1: 2, x2: 22, y2: 22 } }
  ],
  /** 移除本实例：垃圾桶（lucide trash；多实例区块 ⋮「移除本实例」，与 aiti-folder MiTrash 同形）。 */
  trash: [
    { tag: "polyline", attrs: { points: "3 6 5 6 21 6" } },
    P("M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"),
    { tag: "line", attrs: { x1: 10, y1: 11, x2: 10, y2: 17 } },
    { tag: "line", attrs: { x1: 14, y1: 11, x2: 14, y2: 17 } }
  ],
  /** 移动：对角双箭头（lucide move-diagonal-2；⋮「移动」行首图标——左上 + 右下，用户 2026-09-15 指定）。 */
  "move-diagonal-2": [
    P("M5 11V5h6"),
    P("M19 13v6h-6"),
    P("M5 5l14 14")
  ],
  /* ── Block semantic icons (collapsed-header icons; lucide line style) ── */
  /** Projects block (session-manager projects): the aiti-ai logo as line art (chosen by
   *  the user 2026-11-26 from the icon candidates preview; prototype = aiti-docs
   *  docs/.vuepress/public/logo.svg). Three brand elements: large-rounded square (the
   *  gradient tile) + geometric letter a (circle + stem) + top-right spark (from the
   *  logo's yellow dot). Visual weight kept on par with the folder/file glyph family:
   *  the spark dot is stroked, not filled (a filled node reads much heavier at 13px),
   *  and the letter circle stays small so line density matches single-outline glyphs. */
  "aiti-ai-logo": [
    thin(R(3, 3, 18, 18, 4)),
    thin({ tag: "circle", attrs: { cx: 10, cy: 14, r: 2.8 } }),
    thin(P("M12.8 11.2v5.6")),
    thin({ tag: "circle", attrs: { cx: 16.8, cy: 7.2, r: 1.2 } }),
    thin(P("m18.8 5.3 1.5-1.6")),
    thin(P("m19.2 8.2 2.1-.4"))
  ],
  /** Folder block (aiti-folder faces): single folder (lucide folder). */
  folder: [
    P("M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z")
  ],
  /** Scheduled tasks block (aiti-ai-schedule tasks): clock (lucide clock). */
  clock: [
    { tag: "circle", attrs: { cx: 12, cy: 12, r: 10 } },
    { tag: "polyline", attrs: { points: "12 6 12 12 16 14" } }
  ],
  /** Subagent fleet block (aiti-subagents fleet): robot (lucide bot). */
  bot: [
    P("M12 8V4H8"),
    R(4, 8, 16, 12),
    P("M2 14h2"),
    P("M20 14h2"),
    P("M15 13v2"),
    P("M9 13v2")
  ],
  /** Prompt library block (aiti-prompts panel): bookshelf lines (lucide library). */
  library: [
    P("m16 6 4 14"),
    P("M12 6v14"),
    P("M8 8v12"),
    P("M4 4v16")
  ],
  /** Model availability block (aiti-model-check panel): shield + check (lucide shield-check). */
  "shield-check": [
    P("M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"),
    P("m9 12 2 2 4-4")
  ],
  /** Watch paths block (aiti-git-trace watch): branch (lucide git-branch). */
  "git-branch": [
    { tag: "line", attrs: { x1: 6, y1: 3, x2: 6, y2: 15 } },
    { tag: "circle", attrs: { cx: 18, cy: 6, r: 3 } },
    { tag: "circle", attrs: { cx: 6, cy: 18, r: 3 } },
    P("M18 9a9 9 0 0 1-9 9")
  ],
  /** Timeline block (aiti-git-trace timeline): clock + counterclockwise arrow (lucide history). */
  history: [
    P("M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"),
    P("M3 3v5h5"),
    P("M12 7v5l4 2")
  ],
  /** File panel block (aiti-editor file faces): document (lucide file). */
  file: [
    P("M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"),
    P("M14 2v4a2 2 0 0 0 2 2h4")
  ],
  /** ACP management block (aiti-acp-agent manage): plug (lucide plug). */
  plug: [
    P("M12 22v-5"),
    P("M9 8V2"),
    P("M15 8V2"),
    P("M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z")
  ],
  /** Speech recognition block (aiti-ai-input asr): microphone (lucide mic). */
  mic: [
    P("M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"),
    P("M19 10v2a7 7 0 0 1-14 0v-2"),
    { tag: "line", attrs: { x1: 12, y1: 19, x2: 12, y2: 22 } }
  ],
  /** Dock demo block (demo): 3D box (lucide box). */
  box: [
    P("M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"),
    P("m3.3 7 8.7 5 8.7-5"),
    P("M12 22V12")
  ]
};
function dockIconOfZone(zone) {
  if (zone === "float" || zone === "floating") return "float";
  if (zone === "sidebar-explorer" || zone.startsWith("sidebar:")) return "panel-left";
  if (zone === "bottom-panel" || zone.startsWith("bottom:")) return "panel-bottom";
  return "panel-right";
}
const SVG_NS = "http://www.w3.org/2000/svg";
function createDockIconSvg(name, size = 16) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const node of DOCK_ICON_NODES[name] ?? []) {
    const el = document.createElementNS(SVG_NS, node.tag);
    for (const [k, v] of Object.entries(node.attrs)) el.setAttribute(k, String(v));
    svg.appendChild(el);
  }
  return svg;
}
const DOCK_ICON_SVG_ROOT_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
function dockIconReactAttrs(attrs) {
  const out = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[!k.includes("-") || k.startsWith("aria-") || k.startsWith("data-") ? k : k.replace(/-([a-z])/g, (_, c2) => c2.toUpperCase())] = v;
  }
  return out;
}
function sidebarZoneOf(itemKey) {
  return `sidebar:${itemKey}`;
}
function isSidebarDockState(state2) {
  return state2 === "docked:sidebar-explorer" || state2.startsWith("docked:sidebar:");
}
const SIDEBAR_COLLAPSE_PREFIX = "pi:sidebar-dock:collapsed:";
const SIDEBAR_COLLAPSE_EVENT = "pi:sidebar-dock:collapsed-changed";
const SIDEBAR_MOVE_EVENT = "pi:sidebar-dock:move";
const SIDEBAR_DROP_EVENT = "pi:sidebar-dock:drop";
function readBlockCollapsed(blockKey) {
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSE_PREFIX + blockKey) === "1";
  } catch {
    return false;
  }
}
function writeBlockCollapsed(blockKey, collapsed) {
  try {
    localStorage.setItem(SIDEBAR_COLLAPSE_PREFIX + blockKey, collapsed ? "1" : "0");
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(SIDEBAR_COLLAPSE_EVENT, { detail: { key: blockKey, collapsed } }));
  } catch {
  }
}
const SIDEBAR_DISMISS_PREFIX = "pi:sidebar-dock:dismissed:";
function writeBlockDismissed(blockKey, dismissed) {
  try {
    if (dismissed) localStorage.setItem(SIDEBAR_DISMISS_PREFIX + blockKey, "1");
    else localStorage.removeItem(SIDEBAR_DISMISS_PREFIX + blockKey);
  } catch {
  }
}
const FLOAT_INSTALLED_EVENT = "piwe-float-installed";
const DOCK_HEADER_PENDING_TTL = 1e4;
function actionSig(list) {
  if (!list) return "";
  return list.map((a) => `${a.id}|${a.title}|${a.badge ?? ""}|${a.active ? 1 : 0}|${a.done ? 1 : 0}|${a.disabled ? 1 : 0}|${a.visibility ?? "always"}`).join("§");
}
function menuSig(list) {
  if (!list) return "";
  return list.map((m) => m.kind === "item" ? `i:${m.id ?? m.label}:${m.label}:${m.hint ?? ""}:${m.active ? 1 : 0}:${m.alwaysRun ? 1 : 0}:${m.disabled ? 1 : 0}` : m.kind === "head" ? `h:${m.label}` : m.kind === "iconsRow" ? `r:${m.label ?? ""}:${m.items.map((i) => i.key).join(",")}` : m.kind === "moveRow" ? "mv-row" : "s").join("§");
}
function stateSig(s) {
  try {
    return JSON.stringify(s);
  } catch {
    return `keys:${Object.keys(s).length}`;
  }
}
function createDockHeaderStore() {
  const keys = /* @__PURE__ */ new Map();
  const subs = /* @__PURE__ */ new Map();
  const keyState = (k) => {
    let s = keys.get(k);
    if (!s) {
      s = { actions: null, commands: null, state: {}, menuItems: null, pending: null, sig: { actions: "", state: "{}", menu: "" } };
      keys.set(k, s);
    }
    return s;
  };
  const notify2 = (k) => {
    const set = subs.get(k);
    if (!set) return;
    for (const cb of [...set]) {
      try {
        cb();
      } catch {
      }
    }
  };
  const tryConsumePending = (k) => {
    const s = keyState(k);
    const p = s.pending;
    if (!p) return;
    if (Date.now() - p.at > DOCK_HEADER_PENDING_TTL) {
      s.pending = null;
      return;
    }
    const fn = s.commands?.[p.id];
    if (typeof fn !== "function") return;
    s.pending = null;
    try {
      fn(p.payload);
    } catch {
    }
  };
  return {
    register(key, reg) {
      const s = keyState(key);
      if ("actions" in reg) {
        const next = reg.actions ?? null;
        s.actions = next;
        const sig = actionSig(next);
        if (sig !== s.sig.actions) {
          s.sig.actions = sig;
          notify2(key);
        }
      }
      if ("state" in reg) {
        const next = reg.state ?? {};
        s.state = next;
        const sig = stateSig(next);
        if (sig !== s.sig.state) {
          s.sig.state = sig;
          notify2(key);
        }
      }
      if ("menuItems" in reg) {
        const next = reg.menuItems ?? null;
        s.menuItems = next;
        const sig = menuSig(next);
        if (sig !== s.sig.menu) {
          s.sig.menu = sig;
          notify2(key);
        }
      }
      if ("commands" in reg) {
        s.commands = reg.commands ?? null;
        tryConsumePending(key);
      }
      return () => {
        const cur = keys.get(key);
        if (!cur) return;
        if ("actions" in reg && cur.actions === (reg.actions ?? null)) {
          cur.actions = null;
          cur.sig.actions = "";
          notify2(key);
        }
        if ("menuItems" in reg && cur.menuItems === (reg.menuItems ?? null)) {
          cur.menuItems = null;
          cur.sig.menu = "";
          notify2(key);
        }
        if ("commands" in reg && cur.commands === (reg.commands ?? null)) cur.commands = null;
        if ("state" in reg) {
          cur.state = {};
          cur.sig.state = "{}";
          notify2(key);
        }
      };
    },
    request(key, id, payload) {
      const s = keyState(key);
      const fn = s.commands?.[id];
      if (typeof fn === "function") {
        try {
          fn(payload);
        } catch {
        }
        return true;
      }
      s.pending = { id, at: Date.now(), payload };
      try {
        writeBlockCollapsed(key, false);
      } catch {
      }
      return false;
    },
    actionsOf(key) {
      return keys.get(key)?.actions ?? null;
    },
    commandsOf(key) {
      return keys.get(key)?.commands ?? null;
    },
    stateOf(key) {
      return keys.get(key)?.state ?? {};
    },
    menuItemsOf(key) {
      return keys.get(key)?.menuItems ?? null;
    },
    subscribe(key, cb) {
      let set = subs.get(key);
      if (!set) {
        set = /* @__PURE__ */ new Set();
        subs.set(key, set);
      }
      set.add(cb);
      return () => {
        const cur = subs.get(key);
        if (!cur) return;
        cur.delete(cb);
        if (cur.size === 0) subs.delete(key);
      };
    }
  };
}
let localHeaderStore = null;
function localDockHeaderStore() {
  if (!localHeaderStore) localHeaderStore = createDockHeaderStore();
  return localHeaderStore;
}
const ITEM_KEY_GLOBAL = "__piweFloat";
const CHANGE_EVENT = "piwe-float-present-change";
const DOCKPREF_KEY = (k) => `pi-web:ext-float:dockpref:v1:${k}`;
function floatApi() {
  const api = window[ITEM_KEY_GLOBAL];
  return api && typeof api.present === "function" ? api : null;
}
const LOCAL_STATES_KEY = "pi-web:ext-float:localstates:v1";
const LOCAL_STATES_REV_KEY = "pi-web:ext-float:localstates-rev:v1";
function loadLocalStates() {
  try {
    const raw = localStorage.getItem(LOCAL_STATES_KEY);
    const obj = raw ? JSON.parse(raw) : null;
    return new Map(Object.entries(obj ?? {}));
  } catch {
    return /* @__PURE__ */ new Map();
  }
}
const localStates = loadLocalStates();
let localStatesRev = "";
try {
  localStatesRev = localStorage.getItem(LOCAL_STATES_REV_KEY) ?? "";
} catch {
}
function syncLocalStates() {
  let rev = "";
  try {
    rev = localStorage.getItem(LOCAL_STATES_REV_KEY) ?? "";
  } catch {
  }
  if (rev === localStatesRev) return;
  localStatesRev = rev;
  const loaded = loadLocalStates();
  localStates.clear();
  for (const [lk, lv] of loaded) localStates.set(lk, lv);
}
function persistLocalStates() {
  const rev = String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
  try {
    localStorage.setItem(LOCAL_STATES_KEY, JSON.stringify(Object.fromEntries(localStates)));
    localStorage.setItem(LOCAL_STATES_REV_KEY, rev);
  } catch {
  }
  localStatesRev = rev;
}
const localSubs = /* @__PURE__ */ new Set();
const ACTIVATE_EVENT = "piwe-float-present-activate";
function localPresent(k, mode, opts) {
  syncLocalStates();
  const prev = localStates.get(k) ?? "closed";
  let next = prev;
  if (mode === "open") {
    if (prev.startsWith("docked:")) next = prev;
    else {
      const pref = dockPref(k);
      const zones = localZones.get(k) ?? [];
      const zone = pref && pref !== "float" && (zones.includes(pref) || isSidebarDockState(`docked:${pref}`)) ? pref : localDefaults.get(k) ?? zones[0];
      next = zone ? `docked:${zone}` : "floating";
    }
  } else if (mode === "float") next = "floating";
  else if (mode === "close") {
    next = "closed";
    writeBlockDismissed(k, true);
  } else if (mode.startsWith("dock:")) {
    const zone = mode.slice(5);
    try {
      localStorage.setItem(DOCKPREF_KEY(k), zone);
    } catch {
    }
    next = `docked:${zone}`;
  }
  if (next !== "closed" && isSidebarDockState(next)) writeBlockDismissed(k, false);
  if (next === prev) {
    if (prev.startsWith("docked:")) {
      try {
        window.dispatchEvent(new CustomEvent(ACTIVATE_EVENT, { detail: { key: k, state: prev, ...opts?.auto ? { auto: true } : {} } }));
      } catch {
      }
    }
    return;
  }
  localStates.set(k, next);
  persistLocalStates();
  const detail = { key: k, state: next, ...{} };
  for (const cb of localSubs) {
    try {
      cb(detail);
    } catch {
    }
  }
  try {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail }));
  } catch {
  }
}
function present(k, mode, opts) {
  const api = floatApi();
  if (api) {
    api.present(k, mode, opts);
    return;
  }
  localPresent(k, mode, opts);
}
function presentState(k) {
  const api = floatApi();
  if (api) return api.presented(k) ?? "closed";
  syncLocalStates();
  return localStates.get(k) ?? "closed";
}
function onPresentChange(cb) {
  const api = floatApi();
  if (api) return api.onPresentChange(cb);
  localSubs.add(cb);
  return () => localSubs.delete(cb);
}
function dockPref(k) {
  const api = floatApi();
  if (api) return api.dockPref(k) ?? null;
  try {
    return localStorage.getItem(DOCKPREF_KEY(k));
  } catch {
    return null;
  }
}
function flashDockContainer(k) {
  try {
    const el = document.querySelector(`[data-ext-float-dock-body="${k}"]`);
    if (!el) return;
    el.classList.remove("piwe-dock-flash");
    void el.offsetWidth;
    el.classList.add("piwe-dock-flash");
    setTimeout(() => el.classList.remove("piwe-dock-flash"), 2e3);
  } catch {
  }
}
function openFloat(k) {
  const st = presentState(k);
  if (st.startsWith("docked:")) flashDockContainer(k);
  present(k, "open");
}
if (typeof window !== "undefined") {
  try {
    window.addEventListener("piwe-float-present-command", ((e) => {
      if (floatApi()) return;
      if (!e.detail || !e.detail.key || !e.detail.mode) return;
      localPresent(e.detail.key, e.detail.mode);
    }));
  } catch {
  }
}
function dockTo(k, zone) {
  present(k, `dock:${zone}`);
}
function dockToSidebar(k) {
  present(k, `dock:${sidebarZoneOf(k)}`);
}
function undockToFloat(k) {
  present(k, "float");
}
function closePanel(k) {
  present(k, "close");
}
let fbMenuKey = null;
let fbMenuEl = null;
let fbDismiss = null;
if (typeof window !== "undefined") {
  try {
    window.addEventListener("piwe-float-dock-menu", ((e) => {
      if (floatApi()) return;
      const k = e.detail?.key;
      if (!k) return;
      if (fbMenuKey === k || fbDismiss && fbDismiss.key === k && Date.now() - fbDismiss.at < 350) {
        if (fbMenuEl) fbMenuEl.remove();
        fbMenuEl = null;
        fbMenuKey = null;
        return;
      }
      if (fbMenuEl) fbMenuEl.remove();
      const zones = localZones.get(k)?.length ? localZones.get(k) : presentState(k).startsWith("docked:") ? [presentState(k).slice(7)] : [];
      const def = localDefaults.get(k);
      const cur = presentState(k);
      const menu = document.createElement("div");
      menu.setAttribute("data-ext-dock-menu", "1");
      menu.style.cssText = "position:fixed;z-index:2147483600;background:var(--bg-panel,#1a1a1a);border:1px solid var(--border,#444);border-radius:8px;padding:4px;display:flex;flex-direction:column;gap:2px;box-shadow:0 8px 24px rgba(0,0,0,0.4);min-width:190px;";
      const rect = e.detail?.rect;
      menu.style.left = Math.max(8, (rect?.left ?? window.innerWidth / 2 - 70) - 60) + "px";
      menu.style.top = (rect?.bottom ?? 140) + 4 + "px";
      const items = positionMenuModel(k, zones, def, cur, { onNewWindow: dockWindowOpenerOf(k) });
      appendDockIconRow(menu, items, { label: "停靠方位", onPick: () => {
        if (fbMenuEl === menu) {
          fbMenuEl = null;
          fbMenuKey = null;
        }
      } });
      document.body.appendChild(menu);
      fbMenuKey = k;
      fbMenuEl = menu;
      const dismiss = (ev) => {
        if (menu.contains(ev.target)) return;
        fbDismiss = { key: k, at: Date.now() };
        menu.remove();
        if (fbMenuEl === menu) {
          fbMenuEl = null;
          fbMenuKey = null;
        }
        document.removeEventListener("mousedown", dismiss, true);
      };
      setTimeout(() => document.addEventListener("mousedown", dismiss, true), 0);
    }));
  } catch {
  }
}
const DOCK_WORDS = {
  newWindow: { "zh-CN": "新窗口打开", en: "Open in new window" },
  float: { "zh-CN": "浮窗", en: "Float" },
  zoneSidebar: { "zh-CN": "左栏 · 区块", en: "Left · blocks" },
  zoneRight: { "zh-CN": "右栏 · 面板", en: "Right · panels" }
};
function dockWord(key) {
  let loc = "en";
  try {
    loc = window.localStorage.getItem("pi-locale") || "en";
  } catch {
  }
  const w = DOCK_WORDS[key];
  return w[loc === "zh-CN" ? "zh-CN" : "en"] ?? w.en;
}
const DOCK_ZONE_LABELS = {
  "sidebar-explorer": dockWord("zoneSidebar"),
  "right-panel": dockWord("zoneRight")
};
function positionMenuItems(k, zones, defaultZone, cur) {
  const hasSidebar = zones.some((z) => z === "sidebar-explorer" || z.startsWith("sidebar:"));
  const items = [];
  if (hasSidebar) {
    const isDef = defaultZone === "sidebar-explorer" || !!defaultZone?.startsWith("sidebar:");
    items.push({
      key: "sidebar-explorer",
      icon: "panel-left",
      label: DOCK_ZONE_LABELS["sidebar-explorer"],
      hint: isDef ? "默认" : void 0,
      isDefault: isDef,
      active: isSidebarDockState(cur),
      run: () => dockToSidebar(k)
    });
  }
  for (const z of zones) {
    if (z === "sidebar-explorer" || z.startsWith("sidebar:")) continue;
    items.push({
      key: z,
      icon: dockIconOfZone(z),
      label: DOCK_ZONE_LABELS[z] ?? z,
      hint: z === defaultZone ? "默认" : void 0,
      isDefault: z === defaultZone,
      active: cur === `docked:${z}`,
      run: () => dockTo(k, z)
    });
  }
  return items;
}
function positionMenuModel(k, zones, defaultZone, cur, opts) {
  const newWindow = opts?.onNewWindow ?? dockWindowOpenerOf(k);
  return [
    ...newWindow ? [{ key: "new-window", icon: "new-window", label: dockWord("newWindow"), run: newWindow }] : [],
    { key: "float", icon: "float", label: dockWord("float"), active: cur === "floating", run: () => undockToFloat(k) },
    ...positionMenuItems(k, zones, defaultZone, cur)
  ];
}
const localWindowOpeners = /* @__PURE__ */ new Map();
function dockWindowOpenerOf(k) {
  const api = floatApi();
  if (api && typeof api.windowOpenerOf === "function") {
    try {
      const fn = api.windowOpenerOf(k);
      if (typeof fn === "function") return fn;
    } catch {
    }
  }
  return localWindowOpeners.get(k) ?? null;
}
function appendDockIconRow(parent, items, opts) {
  const row = document.createElement("div");
  row.setAttribute("data-ext-dock-icon-row", "1");
  row.style.cssText = "display:flex;align-items:center;justify-content:space-between;gap:16px;padding:5px 10px;";
  if (opts?.label) {
    const lab = document.createElement("span");
    lab.setAttribute("data-ext-dock-icon-row-label", "1");
    lab.textContent = opts.label;
    lab.style.cssText = "font-size:12px;color:var(--text-dim,#888);flex-shrink:0;user-select:none;white-space:nowrap;";
    row.appendChild(lab);
  }
  const group = document.createElement("div");
  group.setAttribute("data-ext-dock-icon-group", "1");
  group.style.cssText = "display:flex;gap:6px;margin-left:auto;flex-shrink:0;";
  for (const it of items) {
    const btn = document.createElement("button");
    btn.type = "button";
    const tip = it.isDefault ? `${it.label}（默认）` : it.label;
    btn.title = tip;
    btn.setAttribute("aria-label", tip);
    if (it.active === true || it.active === false) {
      btn.setAttribute("role", "menuitemradio");
      btn.setAttribute("aria-checked", it.active ? "true" : "false");
    } else {
      btn.setAttribute("role", "menuitem");
    }
    btn.setAttribute("data-ext-dock-icon", it.key);
    btn.style.cssText = "position:relative;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;border:none;background:none;border-radius:6px;padding:0;font-family:inherit;cursor:pointer;color:var(--text-muted,#888);" + (it.active ? "cursor:default;background:var(--bg-selected,#2a2a2a);color:var(--accent,#2563eb);" : "");
    btn.appendChild(createDockIconSvg(it.icon, 16));
    if (!it.active) {
      btn.addEventListener("mouseenter", () => {
        btn.style.background = "var(--bg-hover,#262626)";
        btn.style.color = "var(--text,#ddd)";
      });
      btn.addEventListener("mouseleave", () => {
        btn.style.background = "none";
        btn.style.color = "var(--text-muted,#888)";
      });
      btn.addEventListener("click", () => {
        opts?.onPick?.(it);
        it.run();
      });
    }
    if (it.isDefault) {
      const dot = document.createElement("span");
      dot.setAttribute("data-ext-dock-icon-default", "1");
      dot.style.cssText = "position:absolute;top:3px;right:3px;width:4px;height:4px;border-radius:50%;background:var(--accent,#2563eb);pointer-events:none;";
      btn.appendChild(dot);
    }
    group.appendChild(btn);
  }
  row.appendChild(group);
  parent.appendChild(row);
  return row;
}
const localZones = /* @__PURE__ */ new Map();
const localDefaults = /* @__PURE__ */ new Map();
function usePresent(itemKey) {
  const [state2, setState2] = useState(() => presentState(itemKey));
  useEffect(() => {
    setState2(presentState(itemKey));
    const h = ((e) => {
      if (e.detail?.key === itemKey) setState2(e.detail.state);
    });
    window.addEventListener(CHANGE_EVENT, h);
    const off = onPresentChange((d) => {
      if (d.key === itemKey) setState2(d.state);
    });
    return () => {
      window.removeEventListener(CHANGE_EVENT, h);
      off();
    };
  }, [itemKey]);
  return state2;
}
function useGate(itemKey, face) {
  const state2 = usePresent(itemKey);
  if (face === "float") return state2 === "floating";
  return state2 === `docked:${face.dock}`;
}
const DOCK_MENU_WORDS = {
  expand: { "zh-CN": "展开", en: "Expand" },
  collapse: { "zh-CN": "折叠", en: "Collapse" },
  block: { "zh-CN": "区块", en: "Block" },
  position: { "zh-CN": "切换停靠位置", en: "Change dock position" },
  actions: { "zh-CN": "区块操作", en: "Block actions" },
  move: { "zh-CN": "移动", en: "Move" },
  pin: { "zh-CN": "钉住", en: "Pin" },
  unpin: { "zh-CN": "取消钉住", en: "Unpin" },
  moveUp: { "zh-CN": "上移", en: "Move up" },
  moveDown: { "zh-CN": "下移", en: "Move down" },
  tools: { "zh-CN": "工具", en: "Tools" },
  removeInstance: { "zh-CN": "移除本实例", en: "Remove this instance" },
  close: { "zh-CN": "关闭", en: "Close" },
  zones: { "zh-CN": "停靠方位", en: "Dock zones" },
  defaultSuffix: { "zh-CN": "（默认）", en: " (default)" }
};
function menuWord(key) {
  let loc = "en";
  try {
    loc = window.localStorage.getItem("pi-locale") || "en";
  } catch {
  }
  const w = DOCK_MENU_WORDS[key];
  return w[loc === "zh-CN" ? "zh-CN" : "en"] ?? w.en;
}
function dockIconEl(name, size = 16) {
  return createElement(
    "svg",
    { width: size, height: size, ...DOCK_ICON_SVG_ROOT_PROPS, "aria-hidden": "true" },
    ...DOCK_ICON_NODES[name].map((n, i) => createElement(n.tag, { key: i, ...dockIconReactAttrs(n.attrs) }))
  );
}
function maskedIconSpan(url, size) {
  return createElement("span", { "aria-hidden": "true", style: {
    display: "inline-block",
    width: size,
    height: size,
    flexShrink: 0,
    background: "currentColor",
    WebkitMaskImage: `url("${url}")`,
    maskImage: `url("${url}")`,
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    WebkitMaskSize: "contain",
    maskSize: "contain"
  } });
}
function dockIconFromDecl(icon, size = 13) {
  if (icon == null) return null;
  if (typeof icon === "object") {
    const o = icon;
    if (typeof o.svg === "string") {
      return createElement("svg", {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        dangerouslySetInnerHTML: { __html: o.svg }
      });
    }
    if (typeof o.url === "string") return maskedIconSpan(o.url, size);
    return null;
  }
  if (typeof icon !== "string" || !icon) return null;
  if (/^https?:\/\//.test(icon)) return maskedIconSpan(icon, size);
  if (DOCK_ICON_NODES[icon]) return dockIconEl(icon, size);
  if (icon.endsWith(".svg")) return null;
  return createElement("span", { style: { fontSize: size, lineHeight: 1 } }, icon);
}
function headerStore() {
  const api = floatApi();
  const svc = api?.dockHeader;
  return svc && typeof svc.register === "function" ? svc : localDockHeaderStore();
}
function useDockHeaderStoreTick() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const on = () => setTick((v) => v + 1);
    window.addEventListener(FLOAT_INSTALLED_EVENT, on);
    return () => window.removeEventListener(FLOAT_INSTALLED_EVENT, on);
  }, []);
  return tick;
}
function useDockHeaderStoreData(itemKey) {
  const tick = useDockHeaderStoreTick();
  const [, setVer] = useState(0);
  useEffect(() => {
    const s2 = headerStore();
    return s2.subscribe(itemKey, () => setVer((v) => v + 1));
  }, [itemKey, tick]);
  const s = headerStore();
  return { actions: s.actionsOf(itemKey), menuItems: s.menuItemsOf(itemKey), hasCommands: !!s.commandsOf(itemKey) };
}
function mergeHeaderActions(local, fromStore) {
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  for (const a of [...local ?? [], ...fromStore ?? []]) {
    if (!a || typeof a.id !== "string" || seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}
function DockBody(props) {
  const { itemKey, zone, title, chrome = "section", zones, defaultZone, children } = props;
  const kind = props.kind ?? "dockable";
  const blockKey = props.blockKey ?? itemKey;
  const selfCollapsed = useState(() => readBlockCollapsed(blockKey));
  const collapsed = props.collapsed ?? selfCollapsed[0];
  const setSelfCollapsed = selfCollapsed[1];
  useEffect(() => {
    if (props.collapsed !== void 0) return;
    const sync = () => setSelfCollapsed(readBlockCollapsed(blockKey));
    window.addEventListener(SIDEBAR_COLLAPSE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SIDEBAR_COLLAPSE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [blockKey, props.collapsed]);
  const setCollapsed = (next) => {
    setSelfCollapsed(next);
    writeBlockCollapsed(blockKey, next);
    props.onToggleCollapsed?.(next);
  };
  const storeData = useDockHeaderStoreData(itemKey);
  const [menu, setMenu] = useState(null);
  const [menuEl, setMenuEl] = useState(null);
  const [menuBtnEl, setMenuBtnEl] = useState(null);
  const [posBtnEl, setPosBtnEl] = useState(null);
  const [menuPos, setMenuPos] = useState(null);
  useEffect(() => {
    if (!menu || !menuEl || !menu.anchor) return;
    const b = menu.anchor.getBoundingClientRect();
    const m = menuEl.getBoundingClientRect();
    const gap = 4, pad = 8;
    let top = b.bottom + gap;
    const below = window.innerHeight - pad - top;
    const above = b.top - gap - pad;
    if (m.height > below && above > below) top = b.top - gap - m.height;
    const c2 = clampToViewport(b.right - m.width, top, m.width, m.height, pad);
    const o = fixedOrigin(menuEl);
    const z = zoomFactorOf(menuEl);
    const next = { left: (c2.left - o.x) / z, top: (c2.top - o.y) / z };
    setMenuPos((cur) => cur && cur.left === next.left && cur.top === next.top ? cur : next);
  }, [menu, menuEl]);
  useEffect(() => {
    if (!menu) return;
    const onDown = (e) => {
      const t2 = e.target;
      if (t2 && menuEl?.contains(t2)) return;
      if (t2 && menu.anchor?.contains(t2)) return;
      setMenu(null);
    };
    let anchorTop = null;
    let anchorLeft = null;
    try {
      const a = menu.anchor?.getBoundingClientRect?.();
      if (a) {
        anchorTop = a.top;
        anchorLeft = a.left;
      }
    } catch {
    }
    const onScroll = (e) => {
      if (menuEl && e.target instanceof Node && menuEl.contains(e.target)) return;
      try {
        const a = menu.anchor?.getBoundingClientRect?.();
        if (a && anchorTop !== null && anchorLeft !== null && Math.abs(a.top - anchorTop) < 4 && Math.abs(a.left - anchorLeft) < 4) return;
      } catch {
      }
      setMenu(null);
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menu, menuEl]);
  const [headerEl, setHeaderEl] = useState(null);
  const [fitCount, setFitCount] = useState(4);
  useEffect(() => {
    if (!headerEl) return;
    const calc = () => {
      const w = headerEl.clientWidth || 0;
      if (w <= 0) return;
      const fixed = 154;
      const n = Math.max(0, Math.min(6, Math.floor((w - fixed) / 27)));
      setFitCount((cur) => cur === n ? cur : n);
    };
    calc();
    let ro = null;
    try {
      if (typeof ResizeObserver === "function") {
        ro = new ResizeObserver(calc);
        ro.observe(headerEl);
      }
    } catch {
    }
    window.addEventListener("resize", calc);
    return () => {
      try {
        if (ro) ro.disconnect();
      } catch {
      }
      window.removeEventListener("resize", calc);
    };
  }, [headerEl]);
  const state2 = usePresent(itemKey);
  const allZones = zones && zones.length ? zones : zone ? [zone] : [];
  const showDetach = kind === "dockable" && chrome === "section" && allZones.length > 0;
  const btnBase2 = {
    background: "none",
    border: "none",
    color: "var(--text-muted, #888)",
    cursor: "pointer",
    fontSize: 11,
    lineHeight: 1,
    padding: "2px 5px",
    flexShrink: 0,
    fontFamily: "inherit"
  };
  const allActions = mergeHeaderActions(props.headerActions, storeData.actions);
  const eligible = allActions.filter((a) => !collapsed || (a.visibility ?? "always") !== "expanded");
  const shownActions = eligible.slice(0, fitCount);
  const overflowActions = eligible.slice(fitCount);
  const actionBtn = (a) => createElement(
    "button",
    {
      key: a.id,
      type: "button",
      title: a.title,
      "aria-label": a.title,
      disabled: a.disabled === true,
      style: {
        ...btnBase2,
        position: "relative",
        color: a.done ? "var(--ok, #4ade80)" : a.active ? "var(--accent, #2563eb)" : "var(--text-muted, #888)",
        opacity: a.disabled ? 0.5 : 1,
        cursor: a.disabled ? "default" : "pointer"
      },
      onClick: (e) => {
        if (a.disabled !== true) a.onClick(e);
      }
    },
    a.icon ? createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center" } }, a.icon) : createElement("span", { style: { fontSize: 12, fontWeight: 700, lineHeight: 1 } }, "•"),
    a.badge !== void 0 && a.badge !== null && a.badge !== "" ? createElement("span", {
      style: { position: "absolute", top: -5, right: -4, fontSize: 9, lineHeight: "13px", color: "var(--text-muted, #888)", background: "var(--bg-panel, #1a1a1a)", border: "1px solid var(--border, #444)", borderRadius: 7, padding: "0 3px" }
    }, String(a.badge)) : null
  );
  const buildMainMenu = () => {
    const out = [];
    const sortable = kind !== "reserved";
    const buildMoveRow = () => ({
      type: "icons",
      label: menuWord("move"),
      icon: dockIconEl("move-diagonal-2", 13),
      items: [
        ...props.moveRowPin ? [{
          key: "pin",
          icon: props.moveRowPin.isPinned() ? "pin-off" : "pin",
          label: props.moveRowPin.isPinned() ? menuWord("unpin") : menuWord("pin"),
          run: () => props.moveRowPin.toggle()
        }] : [],
        { key: "move-up", icon: "chevron-up", label: menuWord("moveUp"), run: () => requestBlockMove(blockKey, -1) },
        { key: "move-down", icon: "chevron-down", label: menuWord("moveDown"), run: () => requestBlockMove(blockKey, 1) }
      ]
    });
    if (overflowActions.length > 0) {
      out.push({ type: "head", label: menuWord("tools") });
      for (const a of overflowActions) out.push({ type: "item", label: a.title, icon: a.icon, badge: a.badge, active: a.active, alwaysRun: true, disabled: a.disabled, run: a.onClick });
    }
    if (storeData.menuItems && storeData.menuItems.length > 0) {
      if (out.length > 0) out.push({ type: "sep" });
      let moveRowInserted = false;
      for (const m of storeData.menuItems) {
        if (m.kind === "moveRow" && sortable && !moveRowInserted) {
          moveRowInserted = true;
          out.push(buildMoveRow());
          continue;
        }
        if (m.kind === "head") out.push({ type: "head", label: m.label });
        else if (m.kind === "sep") out.push({ type: "sep" });
        else if (m.kind === "iconsRow") out.push({ type: "icons", label: m.label, items: m.items });
        else out.push({ type: "item", label: m.label, icon: m.icon, hint: m.hint, active: m.active, alwaysRun: m.alwaysRun, disabled: m.disabled, run: m.run });
      }
      if (chrome === "section" && sortable && !moveRowInserted) out.push(buildMoveRow());
    }
    const ops = [];
    if (chrome === "section" && sortable && !(storeData.menuItems || []).some((m) => m.kind === "moveRow")) {
      ops.push(buildMoveRow());
    }
    if (kind === "reserved" && typeof props.onRemove === "function") {
      ops.push({ type: "item", label: menuWord("removeInstance"), icon: dockIconEl("trash", 13), run: () => props.onRemove() });
    }
    if (Array.isArray(props.extraMenuItems)) {
      for (const m of props.extraMenuItems) ops.push({ type: "item", label: m.label, icon: m.icon, hint: m.hint, active: m.active, alwaysRun: m.alwaysRun, run: m.run });
    }
    if (kind === "dockable" && chrome === "section" && props.hideCloseItem !== true) {
      ops.push({ type: "item", label: menuWord("close"), icon: dockIconEl("x", 13), run: () => props.onClose ? props.onClose() : closePanel(itemKey) });
    }
    if (ops.length > 0) {
      if (out.length > 0) out.push({ type: "sep" });
      out.push({ type: "head", label: menuWord("block") });
      out.push(...ops);
    }
    return out;
  };
  const positionRows = menu?.kind === "position" ? [{ type: "icons", label: menuWord("zones"), items: positionMenuModel(itemKey, allZones, defaultZone, state2, { onNewWindow: props.onNewWindow }) }] : [];
  const menuRows = menu?.kind === "position" ? positionRows : menu?.kind === "main" ? buildMainMenu() : [];
  const renderMenuRow = (it, i) => {
    if (it.type === "sep") return createElement("div", { key: `sep-${i}`, style: { height: 1, background: "var(--border, #444)", margin: "3px 4px", opacity: 0.7, flexShrink: 0 } });
    if (it.type === "head") return createElement("div", { key: `head-${i}`, style: { fontSize: 10, color: "var(--text-dim, #888)", fontWeight: 600, padding: "4px 10px 2px", letterSpacing: 0.3, userSelect: "none", whiteSpace: "nowrap" } }, it.label);
    if (it.type === "icons") return createElement(
      "div",
      {
        key: `icons-${i}`,
        role: "group",
        "data-ext-dock-icon-row": "1",
        style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "5px 10px", flexShrink: 0 }
      },
      it.label ? createElement(
        "span",
        {
          key: "label",
          "data-ext-dock-icon-row-label": "1",
          // 行首图标（可选）：带图标 = 动作行（正文字色，与其余 icon+text 行同款）；
          // 无图标 = 纯说明名（dim，位置菜单「停靠方位」标题原样）。
          style: {
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: it.icon ? "var(--text, #ddd)" : "var(--text-dim, #888)",
            flexShrink: 0,
            userSelect: "none",
            whiteSpace: "nowrap"
          }
        },
        it.icon ? createElement("span", { style: { display: "inline-flex", flexShrink: 0 } }, it.icon) : null,
        it.label
      ) : null,
      createElement(
        "div",
        {
          key: "group",
          "data-ext-dock-icon-group": "1",
          style: { display: "flex", gap: 6, marginLeft: "auto", flexShrink: 0 }
        },
        ...it.items.map((x, j) => {
          const isRadio = x.active === true || x.active === false;
          const tip = x.isDefault ? `${x.label}${menuWord("defaultSuffix")}` : x.label;
          return createElement(
            "button",
            {
              key: `icon-${j}`,
              type: "button",
              role: isRadio ? "menuitemradio" : "menuitem",
              ...isRadio ? { "aria-checked": x.active ? "true" : "false" } : {},
              title: tip,
              "aria-label": tip,
              "data-ext-dock-icon": x.key,
              style: {
                position: "relative",
                width: 28,
                height: 28,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "none",
                borderRadius: 6,
                padding: 0,
                fontFamily: "inherit",
                cursor: x.active ? "default" : "pointer",
                background: x.active ? "var(--bg-selected, #2a2a2a)" : "none",
                color: x.active ? "var(--accent, #2563eb)" : "var(--text-muted, #888)"
              },
              onClick: () => {
                if (x.active) return;
                setMenu(null);
                x.run();
              },
              onMouseEnter: (e) => {
                if (!x.active) {
                  e.currentTarget.style.background = "var(--bg-hover, #262626)";
                  e.currentTarget.style.color = "var(--text, #ddd)";
                }
              },
              onMouseLeave: (e) => {
                if (!x.active) {
                  e.currentTarget.style.background = "none";
                  e.currentTarget.style.color = "var(--text-muted, #888)";
                }
              }
            },
            typeof x.icon === "string" ? dockIconEl(x.icon, 16) : x.icon,
            x.isDefault ? createElement("span", { key: "dot", "data-ext-dock-icon-default": "1", style: { position: "absolute", top: 3, right: 3, width: 4, height: 4, borderRadius: "50%", background: "var(--accent, #2563eb)", pointerEvents: "none" } }) : null
          );
        })
      )
    );
    const disabled = it.disabled === true;
    const locked = it.active === true && it.alwaysRun !== true;
    return createElement(
      "button",
      {
        key: `item-${i}`,
        type: "button",
        role: "menuitem",
        disabled,
        style: {
          background: "none",
          border: "none",
          cursor: disabled || locked ? "default" : "pointer",
          fontSize: 12,
          padding: "6px 12px",
          textAlign: "left",
          borderRadius: 6,
          fontFamily: "inherit",
          color: it.active ? "var(--accent, #2563eb)" : "var(--text, #ddd)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          opacity: disabled ? 0.5 : 1,
          flexShrink: 0
        },
        onClick: () => {
          setMenu(null);
          if (!locked) it.run();
        },
        onKeyDown: (e) => {
          if (e.key === "Escape") setMenu(null);
        }
      },
      it.icon ? createElement("span", { style: { width: 14, display: "inline-flex", justifyContent: "center", flexShrink: 0 } }, it.icon) : null,
      (it.active ? "✓ " : "") + it.label,
      it.badge !== void 0 && it.badge !== null && it.badge !== "" ? createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "var(--text-muted, #888)", border: "1px solid var(--border, #444)", borderRadius: 6, padding: "0 4px" } }, String(it.badge)) : null,
      it.hint ? createElement("span", { style: { marginLeft: "auto", fontSize: 10, color: "var(--text-muted, #888)", border: "1px solid var(--border, #444)", borderRadius: 4, padding: "0 4px" } }, it.hint) : null
    );
  };
  const menuNode = menu ? createElement("div", {
    ref: setMenuEl,
    role: "menu",
    style: {
      position: "fixed",
      zIndex: 2147483600,
      background: "var(--bg-panel, #1a1a1a)",
      border: "1px solid var(--border, #444)",
      borderRadius: 8,
      padding: 4,
      display: "flex",
      flexDirection: "column",
      gap: 2,
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      minWidth: menu?.kind === "position" ? 190 : 150,
      maxWidth: "calc(100vw - 16px)",
      // 长菜单滚动契约（v3）：视口内可滚 + 防滚动穿透（内部滚动不触发「容器滚动即关」）
      maxHeight: "min(70vh, calc(100vh - 16px))",
      overflowY: "auto",
      overscrollBehavior: "contain",
      // 首帧离屏（布局期测量后落位，绘制前同步无闪烁）
      ...menuPos ? { left: menuPos.left, top: menuPos.top } : { left: -99999, top: -99999 }
    },
    // hover 关闭仅限真 hover 设备（2026-11-15 小屏反馈「菜单经常自己关掉」）：手机上手指
    // 滑动浏览菜单项时浏览器合成 mouse 事件（touchmove 目标变化 → 合成 mouseleave），
    // 无条件关闭等于「一滑就关」；触屏（hover:none）忽略 mouseleave，改由外点/滚动关闭。
    onMouseLeave: () => {
      try {
        if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
      } catch {
      }
      setMenu(null);
    }
  }, menuRows.map(renderMenuRow)) : null;
  const toggleCollapsed = () => setCollapsed(!collapsed);
  const onDragStart = (e) => {
    if (e.target && typeof e.target.closest === "function" && e.target.closest("button")) {
      e.preventDefault();
      return;
    }
    dragKey = blockKey;
    try {
      e.dataTransfer.setData("application/x-pi-dock", blockKey);
      e.dataTransfer.effectAllowed = "move";
    } catch {
    }
  };
  const isDockDrag = (e) => {
    try {
      return [...e.dataTransfer?.types ?? []].includes("application/x-pi-dock");
    } catch {
      return false;
    }
  };
  const dropMark = (e, on) => {
    const el = e.currentTarget;
    if (!el) return;
    el.classList.remove("pi-dock-drop-before", "pi-dock-drop-after");
    if (on) el.classList.add(e.clientY - el.getBoundingClientRect().top < el.getBoundingClientRect().height / 2 ? "pi-dock-drop-before" : "pi-dock-drop-after");
  };
  const onDrop = (e) => {
    if (!isDockDrag(e)) return;
    e.preventDefault();
    const el = e.currentTarget;
    el.classList.remove("pi-dock-drop-before", "pi-dock-drop-after");
    let dragged = "";
    try {
      dragged = e.dataTransfer.getData("application/x-pi-dock") || "";
    } catch {
    }
    if (!dragged) dragged = dragKey || "";
    if (!dragged || dragged === blockKey) return;
    const r = el.getBoundingClientRect();
    requestBlockDrop(dragged, blockKey, e.clientY - r.top < r.height / 2);
  };
  const headerProps = { ref: setHeaderEl, style: { display: "flex", alignItems: "center", gap: 4, padding: "4px 8px", borderBottom: "1px solid var(--border, #333)", flexShrink: 0, minWidth: 0 }, onClick: (e) => {
    if (e.target && typeof e.target.closest === "function" && e.target.closest("button")) return;
    toggleCollapsed();
  } };
  if (chrome === "section" && kind !== "reserved") {
    headerProps.draggable = true;
    headerProps.title = props.headerHint ?? "拖动排序";
    headerProps.onDragStart = onDragStart;
    headerProps.onDragOver = (e) => {
      if (isDockDrag(e) && dragKey !== blockKey) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        dropMark(e, true);
      }
    };
    headerProps.onDragLeave = (e) => {
      try {
        if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;
      } catch {
      }
      dropMark(e, false);
    };
    headerProps.onDrop = onDrop;
    headerProps.onDragEnd = () => {
      dragKey = null;
      document.querySelectorAll(".pi-dock-drop-before, .pi-dock-drop-after").forEach((el) => el.classList.remove("pi-dock-drop-before", "pi-dock-drop-after"));
    };
  } else if (chrome === "section" && props.headerHint) {
    headerProps.title = props.headerHint;
  }
  const iconNode = dockIconFromDecl(props.icon, 13);
  const titleNode = createElement(
    "span",
    { style: { minWidth: 0, flex: "0 1 auto", display: "inline-flex", alignItems: "center", gap: 5 } },
    iconNode,
    props.renderTitle ? props.renderTitle() : createElement("span", { style: { fontSize: 13, fontWeight: 500, color: "var(--text, #222)", flex: "0 1 auto", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 } }, title ?? "")
  );
  const keepAlive = collapsed && storeData.hasCommands;
  return createElement(
    "div",
    {
      "data-ext-float-dock-body": itemKey,
      "data-ext-item": itemKey,
      "data-ext-dock-block": blockKey,
      // 根上带声明属性：TabBar ⇱ 菜单在 face 挂载时可直接读（注册表兜底优先）
      "data-ext-float-dock": allZones.join(" "),
      ...defaultZone ? { "data-ext-float-dock-default": defaultZone } : {},
      // 注册按钮数（e2e/调试断言用）：当前头行可见 / 溢出
      "data-ext-dock-actions": String(shownActions.length),
      "data-ext-dock-actions-overflow": String(overflowActions.length),
      style: { display: "flex", flexDirection: "column", height: "100%", minHeight: 0, overflow: "hidden", position: "relative" }
    },
    chrome === "section" && createElement(
      "div",
      headerProps,
      createElement(
        "button",
        {
          type: "button",
          title: collapsed ? menuWord("expand") : menuWord("collapse"),
          "aria-label": (title ?? menuWord("block")) + (collapsed ? " " + menuWord("expand") : " " + menuWord("collapse")),
          "aria-expanded": collapsed ? "false" : "true",
          style: { ...btnBase2, display: "flex", alignItems: "center" },
          onClick: toggleCollapsed
        },
        createElement(
          "svg",
          {
            width: 9,
            height: 9,
            viewBox: "0 0 10 10",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: 1.8,
            strokeLinecap: "round",
            strokeLinejoin: "round",
            style: { transform: collapsed ? "none" : "rotate(90deg)", transition: "transform 0.15s", flexShrink: 0 }
          },
          createElement("polyline", { points: "3 2 7 5 3 8" })
        )
      ),
      titleNode,
      typeof props.count === "number" && createElement("span", { style: { color: "var(--text-dim, #777)", fontWeight: 400, fontSize: 10, flexShrink: 0 } }, `(${props.count})`),
      createElement("span", { style: { flex: 1, minWidth: 0 } }),
      ...shownActions.map(actionBtn),
      showDetach ? createElement(
        "span",
        { style: { position: "relative", display: "inline-flex", flexShrink: 0 } },
        createElement("button", {
          ref: setPosBtnEl,
          type: "button",
          title: menuWord("position"),
          "aria-label": menuWord("position"),
          "aria-haspopup": "menu",
          "aria-expanded": menu?.kind === "position" ? "true" : "false",
          style: { ...btnBase2, fontSize: 12 },
          onClick: () => {
            if (menu?.kind === "position") setMenu(null);
            else {
              setMenuPos(null);
              setMenu({ kind: "position", anchor: posBtnEl ?? menuBtnEl });
            }
          }
        }, "⇱"),
        menu?.kind === "position" ? menuNode : null
      ) : null,
      createElement(
        "span",
        { style: { position: "relative", display: "inline-flex", flexShrink: 0 } },
        createElement("button", {
          ref: setMenuBtnEl,
          type: "button",
          title: menuWord("actions"),
          "aria-label": menuWord("actions"),
          "aria-haspopup": "menu",
          "aria-expanded": menu?.kind === "main" ? "true" : "false",
          style: { ...btnBase2, fontSize: 12, fontWeight: 700 },
          onClick: () => {
            if (menu?.kind === "main") {
              setMenu(null);
            } else {
              setMenuPos(null);
              setMenu({ kind: "main", anchor: menuBtnEl });
            }
          },
          onKeyDown: (e) => {
            if (e.key === "Escape" && menu?.kind === "main") setMenu(null);
          }
        }, "⋮"),
        menu?.kind === "main" ? menuNode : null
      )
    ),
    (!collapsed || keepAlive) && createElement("div", { style: { flex: collapsed ? "0 0 0" : 1, minHeight: 0, overflow: "hidden", display: collapsed ? "none" : "flex", flexDirection: "column" } }, children)
  );
}
function requestBlockMove(blockKey, delta) {
  try {
    window.dispatchEvent(new CustomEvent(SIDEBAR_MOVE_EVENT, { detail: { key: blockKey, delta } }));
  } catch {
  }
}
function requestBlockDrop(dragged, target, before) {
  try {
    window.dispatchEvent(new CustomEvent(SIDEBAR_DROP_EVENT, { detail: { key: dragged, target, before } }));
  } catch {
  }
}
let dragKey = null;
if (typeof document !== "undefined" && !document.getElementById("pi-dock-dnd-css")) {
  try {
    const st = document.createElement("style");
    st.id = "pi-dock-dnd-css";
    st.textContent = "[data-ext-dock-block][draggable=true] { cursor: grab; }.pi-dock-drop-before { box-shadow: inset 0 2px 0 var(--accent, #2563eb); }.pi-dock-drop-after { box-shadow: inset 0 -2px 0 var(--accent, #2563eb); }";
    document.head.appendChild(st);
  } catch {
  }
}
if (typeof document !== "undefined" && !document.getElementById("piwe-dock-flash-css")) {
  try {
    const st = document.createElement("style");
    st.id = "piwe-dock-flash-css";
    st.textContent = "@keyframes piwe-dock-flash-kf { 0%,100% { box-shadow: none; } 30% { box-shadow: inset 0 0 0 2px var(--accent, #2563eb); } }.piwe-dock-flash { animation: piwe-dock-flash-kf 2s ease; }";
    document.head.appendChild(st);
  } catch {
  }
}
let extI18nTables = null;
let extI18nPrimed = false;
function primeExtI18n() {
  if (extI18nPrimed || typeof window === "undefined") return;
  extI18nPrimed = true;
  fetch(apiUrl("/api/extensions/manifest")).then((r) => r.json()).then((d) => {
    const map = {};
    for (const e of d?.extensions ?? []) if (e?.id && e?.ui?.i18n) map[e.id] = e.ui.i18n;
    extI18nTables = map;
  }).catch(() => {
    extI18nPrimed = false;
  });
}
function tableFor(ui18n, locale) {
  if (!ui18n) return {};
  const short = locale.split("-")[0];
  return ui18n[locale] ?? ui18n[short] ?? (short === "zh" ? ui18n["zh-CN"] : void 0) ?? ui18n.en ?? Object.values(ui18n)[0] ?? {};
}
function resolveExtItemText(extId, text) {
  if (!text) return "";
  if (!extId || !text.startsWith("i18n:")) return text;
  primeExtI18n();
  const key = text.slice("i18n:".length);
  return tableFor(extI18nTables?.[extId], currentLocaleKey())[key] ?? key;
}
function extUi18nExact(extId) {
  primeExtI18n();
  return extI18nTables?.[extId ?? ""]?.[currentLocaleKey()] ?? {};
}
function currentLocaleKey() {
  try {
    const v = localStorage.getItem("pi-locale");
    if (v === "zh-CN" || v === "zh-TW" || v === "en") return v;
  } catch {
  }
  return "en";
}
function extSoulText(extId, pkg) {
  const map = pkg?.soulI18n ?? (pkg?.soulEn ? { en: pkg.soulEn } : void 0);
  return extSoulFor({ soul: pkg?.soul, soulI18n: map, ui: { i18n: extI18nTables?.[extId ?? ""] } }, currentLocaleKey());
}
function extDescriptionText(extId, pkg, fallback) {
  const map = pkg?.descriptionI18n ?? (pkg?.descriptionEn ? { en: pkg.descriptionEn } : void 0);
  const text = extDescriptionFor({
    description: pkg?.description ?? fallback,
    descriptionI18n: map,
    ui: { i18n: extI18nTables?.[extId ?? ""] }
  }, currentLocaleKey());
  return text || fallback || "";
}
function featureGroupText(extId, group) {
  return resolveExtItemText(extId, group == null ? "" : String(group));
}
function onlineName(ext) {
  if (!ext) return "";
  const locale = currentLocaleKey();
  if (locale.startsWith("zh")) return ext.name || extDisplayName(ext.id, ext.name);
  return ext.nameEn || extDisplayName(ext.id, ext.name);
}
function resolveItemLabel(extId, item) {
  return resolveExtItemText(extId, item && item.label) || resolveExtItemText(extId, item && item.title) || item && item.id || "";
}
function extDisplayName(id, fallbackName) {
  const shared = extDisplayName$1(id, fallbackName);
  const resolved = Boolean(shared && shared !== id && !/^@[^/]+\//.test(shared));
  if (resolved) return shared;
  const locale = currentLocaleKey();
  const local = state.status?.extensions?.[id]?.packageInfo?.displayNameI18n;
  if (!local) return shared;
  const exact = local[locale];
  if (exact) return exact;
  const family = Object.entries(local).find(([k]) => k.split("-")[0] === locale.split("-")[0]);
  return family ? family[1] : shared;
}
const state = {
  open: false,
  status: null,
  // /status 载荷 { extensions: {id: entry}, extensionsRoot, ... }
  loader: { materialized: [], prefetched: [] },
  selected: null,
  // { kind: "local"|"online"|"source"|"add", id }
  hoverLocal: null,
  // 本地列表悬停行 id（悬停显示启停开关）
  q: "",
  // 搜索词（空 = 只显示本地）
  busyKey: null,
  // `${action}:${id}` | "*"
  applying: null,
  // 操作进行中的全局反馈文案（如「正在应用变更…」，完成/失败后清除）
  error: null,
  message: null,
  registryData: null,
  // aiti.pw /extensions.json
  registryError: null,
  registryLoaded: false,
  // Dual-source update check (npm × aiti.pw registry × git); keyed by extension id.
  updates: null,
  // Registry-only phase rendered first; npm/git verdict not in yet (never show a ✓ yet).
  updatesPartial: false,
  // The last persisted verdict is being shown while a fresh check runs in the background
  // (process restart / stale cache): show ↑ badges immediately, never a ✓ until refreshed.
  updatesStale: false,
  updatesChecking: false,
  isMobile: false,
  // VSCode 式 trust：待确认的发行者（{kind:"source"|"zip", source, docsUrl?, id?, publisher, file?, zipName?}）
  pendingTrust: null,
  // 已信任发行者列表 [{name,url,source,trustedAt}]（管理 UI + 信任状态展示）
  trustedPublishers: [],
  trustedLoaded: false,
  // 功能打开提示（打开/定位结果；自动消失）
  openHint: null,
  // 小屏面板行为：listCollapsed=扩展列表折叠（给详情区让空间）；maximized=全屏展开（小屏打开默认开）。
  // mobileView：小屏导航视图——list=列表，detail=详情（点击扩展时切换，带返回按钮）
  listCollapsed: false,
  maximized: false,
  mobileView: "list",
  // 层级管理：打开其他弹窗后把自己降到后面（新弹窗置前），zBack=true 时面板 z-index 降到 300；可手动置顶恢复
  zBack: false,
  // 虚空创建：插槽条目已注册但未渲染到宿主（如被 feature 隐藏）时，「打开」离屏挂载其组件并触发 click。
  // { render, key }；由 UI 层的 VirtualClick 消费，触发完成后置回 null。
  virtualClick: null,
  // 依赖影响确认：禁用/卸载仍被已启用扩展声明依赖（clientDependsOn / 硬依赖边）时，
  // 待确认数据 { action: "disable"|"remove", id, clientDeps: string[], hardDeps: Array<{id, via?}> }
  // 由 UI 层的 DependentsDialog 消费。
  pendingDependents: null,
  // 依赖与能力模型视图：exts=扩展列表（现状）|caps=能力视图|conflicts=冲突/版本管理
  view: "exts",
  // 能力视图选中项（能力名）；冲突视图选中项（"multi:<id>" | "takeover:<cap>"）
  selCap: null,
  selConflict: null
};
function depEdges() {
  const exts = state.status && state.status.extensions || {};
  const edges = [];
  for (const id of Object.keys(exts)) {
    const e = exts[id];
    for (const dep of Array.isArray(e.clientDependsOn) ? e.clientDependsOn : []) {
      edges.push({ from: id, to: dep, kind: "client" });
    }
    for (const d of Array.isArray(e.depsResolved) ? e.depsResolved : []) {
      if (d.kind === "ext") {
        edges.push({ from: id, to: d.target, kind: d.hard ? "hard-ext" : "optional-ext" });
      } else {
        edges.push({ from: id, to: d.target ?? null, kind: d.hard ? "hard-cap" : "optional-cap", cap: d.name });
      }
    }
  }
  return edges;
}
function hardDependents(id) {
  const out = /* @__PURE__ */ new Map();
  for (const e of depEdges()) {
    if (e.to !== id || e.kind !== "hard-ext" && e.kind !== "hard-cap") continue;
    const prev = out.get(e.from);
    out.set(e.from, { id: e.from, via: e.kind === "hard-cap" ? e.cap : prev && prev.via });
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}
function clientDependents(id) {
  return depEdges().filter((e) => e.to === id && e.kind === "client").map((e) => e.from).sort();
}
function dependentsOf(id, opts) {
  const exts = state.status && state.status.extensions || {};
  return depEdges().filter((e) => {
    if (e.to !== id || e.from === id) return false;
    if (!opts?.allKinds && e.kind.startsWith("optional")) return false;
    if (!opts?.includeDisabled && exts[e.from] && exts[e.from].enabled === false) return false;
    return true;
  }).map((e) => e.from).filter((v, i, arr) => arr.indexOf(v) === i).sort();
}
const listeners = /* @__PURE__ */ new Set();
function notify() {
  for (const l of listeners) l();
}
const EXTMAN_KEY = "aiti-extman:panel";
function setState(patch) {
  if ("open" in patch) {
    const { open, ...rest } = patch;
    if (open) openFloat(EXTMAN_KEY);
    else closePanel(EXTMAN_KEY);
    patch = rest;
    if (Object.keys(patch).length === 0) return;
  }
  Object.assign(state, patch);
  notify();
}
function subscribe(l) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}
let ctxReload = null;
let ctxLoaderState = null;
let ctxFull = null;
function setHostCaps(caps) {
  ctxReload = typeof caps.reloadExtensions === "function" ? caps.reloadExtensions : null;
  ctxLoaderState = typeof caps.extLoaderState === "function" ? caps.extLoaderState : null;
  ctxFull = caps?.ctx ?? ctxFull;
}
let currentSessionVal = null;
function setCurrentSession(s) {
  currentSessionVal = s;
}
const SELF_ID = "aiti-extman";
const AITI_DOCS_BASE = "https://aiti.pw";
const AITI_REGISTRY_PAGE = AITI_DOCS_BASE + "/extensions/";
const SOURCE_LABELS = { user: "user", extra: "extra", dev: "dev", bundled: "bundled" };
const SOURCE_COLORS = {
  user: "rgba(99,102,241,0.85)",
  extra: "rgba(14,165,233,0.85)",
  dev: "rgba(217,119,6,0.85)",
  bundled: "rgba(120,120,120,0.9)"
};
const btnStyle = {
  padding: "5px 12px",
  background: "var(--bg-hover)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  color: "var(--text-muted)",
  cursor: "pointer",
  fontSize: 12,
  whiteSpace: "nowrap"
};
const chipStyle = (color, bg) => ({
  fontSize: 10,
  padding: "1px 6px",
  borderRadius: 8,
  background: bg,
  color,
  whiteSpace: "nowrap",
  flexShrink: 0
});
function shortenPath(p) {
  return String(p ?? "").replace(/^\/(?:Users|home)\/[^/]+/, "~");
}
function statusDotColor(e) {
  if (e.error) return "var(--danger, #ef4444)";
  if (e.enabled === false) return "var(--text-dim)";
  if (!e.loaded) return "var(--warn, #f59e0b)";
  return "var(--accent)";
}
function statusDotTitle(e) {
  if (e.error) return t("ext.statusError");
  if (e.enabled === false) return t("ext.statusDisabled");
  if (!e.loaded) return t("ext.statusNotLoaded");
  return t("ext.statusRunning");
}
function looksLikeSource(q) {
  const s = q.trim();
  if (!s) return false;
  if (/^(git:|npm:|https?:\/\/|git@)/i.test(s)) return true;
  if (s.startsWith("/") || s.startsWith("./") || s.startsWith("../") || /^[A-Za-z]:[\\/]/.test(s)) return true;
  if (/^@[A-Za-z0-9-][\w.-]*\//.test(s)) return true;
  return false;
}
function publisherTrusted(pub) {
  if (!pub) return false;
  const k = pub.name && pub.name.trim() || pub.fingerprint;
  return (state.trustedPublishers || []).some((x) => (x.name && x.name.trim() || x.fingerprint) === k);
}
async function refreshTrusted() {
  try {
    const r = await fetch(apiUrl("/api/extensions/aiti-extman/publishers"), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    setState({ trustedPublishers: d.trusted || [], trustedLoaded: true });
  } catch {
    setState({ trustedPublishers: state.trustedPublishers || [], trustedLoaded: true });
  }
}
function publisherSourceLabel(src) {
  const map = { npm: "npm", github: "GitHub", gitlab: "GitLab", git: "git", "package.json": "package.json", registry: "registry", manual: "manual", unknown: "?" };
  return map[src || ""] || src || "package.json";
}
function showOpenHint(text, ms) {
  setState({ openHint: { text, at: Date.now() } });
  setTimeout(() => {
    if (state.openHint && state.openHint.text === text) setState({ openHint: null });
  }, 2600);
}
function findButtonByLabel(label, { contains = false } = {}) {
  if (!label) return null;
  const norm = String(label).trim();
  const normL = norm.toLowerCase();
  const nodes = [...document.querySelectorAll("button, [role=button], [data-topbar-id]")];
  const exact = nodes.find(
    (b) => (b.getAttribute("title") || "") === norm || (b.getAttribute("aria-label") || "") === norm || (b.textContent || "").trim() === norm || (b.getAttribute("data-topbar-id") || "").split(":").pop() === norm
  );
  if (exact) return exact;
  if (!contains) return null;
  return nodes.find(
    (b) => ((b.getAttribute("title") || "") + " " + (b.getAttribute("aria-label") || "") + " " + (b.textContent || "") + " " + (b.getAttribute("data-topbar-id") || "")).toLowerCase().includes(normL)
  ) || null;
}
function clickTopbarEntry(el) {
  const btn = el.matches("button") ? el : el.querySelector("button") || el;
  btn.click();
}
function entryClickable(el) {
  return !!(el.matches("button") || el.querySelector("button, [role='button']"));
}
function regItemsOf(slot, extId) {
  const store = typeof window !== "undefined" ? window.__piWebExtUI : void 0;
  const items = store && store.items && store.items[slot] || [];
  return items.filter((it) => it.extId === extId || typeof it.id === "string" && it.id.indexOf(extId + ":") === 0);
}
function topbarRegs(extId) {
  return [...regItemsOf("toolbar", extId), ...regItemsOf("sessionTopbar", extId)];
}
function flashElement(el) {
  if (!el || typeof el.getBoundingClientRect !== "function") return;
  const h = el;
  const prev = {
    outline: h.style.outline,
    outlineOffset: h.style.outlineOffset,
    boxShadow: h.style.boxShadow,
    transition: h.style.transition
  };
  h.style.transition = "outline 0.15s, box-shadow 0.15s";
  h.style.outline = "2px solid rgba(217,119,6,0.9)";
  h.style.outlineOffset = "2px";
  h.style.boxShadow = "0 0 0 4px rgba(217,119,6,0.25)";
  try {
    h.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  } catch {
  }
  setTimeout(() => {
    h.style.outline = prev.outline;
    h.style.outlineOffset = prev.outlineOffset;
    h.style.boxShadow = prev.boxShadow;
    h.style.transition = prev.transition;
  }, 2200);
}
function locateContextElement(slot, currentSession) {
  if (slot === "chatInputTop") {
    const input = document.querySelector("[data-chat-input]");
    if (input) return input.closest("div") || input;
    return null;
  }
  if (slot === "sessionRowActions") {
    if (!currentSession || !currentSession.cwd) return null;
    const cwd = currentSession.cwd;
    const short = cwd.replace(/^\/home\/[^/]+/, "~");
    const base = cwd.split("/").pop();
    const cands = [...document.querySelectorAll("div")].filter((d) => {
      const x = (d.textContent || "").replace(/\s+/g, " ");
      if (x.indexOf(cwd) === -1 && x.indexOf(short) === -1 && !(base && x.indexOf(base) !== -1)) return false;
      if (d.querySelectorAll("button").length === 0) return false;
      const r = d.getBoundingClientRect();
      return r.width > 30 && r.width < 420 && r.height > 10 && r.height < 200;
    });
    if (!cands.length) return null;
    cands.sort((a, b) => {
      const ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect();
      return ra.width * ra.height - rb.width * rb.height;
    });
    return cands[0];
  }
  return null;
}
function locateSlotHost(slot) {
  if (slot === "banners") {
    const b = document.querySelector("[class*='banner'], [class*='Banner']");
    return b || null;
  }
  if (slot === "pages") {
    const main = document.querySelector("main, [class*='main'], [class*='Main']");
    return main || document.body;
  }
  return null;
}
function openTopbarOverflow(regs, label, where, onHit, onMiss) {
  const more = [...document.querySelectorAll("button")].find(
    (b) => {
      const s = b.getAttribute("aria-label") || b.getAttribute("title") || "";
      return s === "更多" || s === "More";
    }
  );
  if (!more) {
    onMiss();
    return;
  }
  const wasOpen = !!document.querySelector("[data-topbar-dropdown]");
  if (!wasOpen) more.click();
  setTimeout(() => {
    const menu = document.querySelector("[data-topbar-dropdown]");
    if (!menu) {
      if (!wasOpen) more.click();
      onMiss();
      return;
    }
    const keys = [label];
    for (const r of regs) {
      if (r && r.meta) {
        const rl = resolveExtItemText(r.extId, r.meta.label);
        const rt = resolveExtItemText(r.extId, r.meta.title);
        if (rt) keys.push(String(rt));
        if (rl) keys.push(String(rl));
      }
      if (r && r.id) keys.push(String(r.id).split(":").pop());
    }
    const hit = [...menu.querySelectorAll("[role=menuitem]")].find((mi) => {
      const btn2 = mi.querySelector("button");
      const hay = (btn2 && (btn2.getAttribute("title") || btn2.getAttribute("aria-label") || "") || "") + " " + (mi.textContent || "").replace(/\s+/g, " ");
      return keys.some((k) => k && hay.indexOf(k) !== -1);
    });
    const btn = hit && (hit.querySelector("button") || hit);
    if (btn) {
      btn.click();
      onHit();
      return;
    }
    if (!wasOpen) more.click();
    onMiss();
  }, 120);
}
function dropToBack() {
  if (!state.zBack) setState({ zBack: true });
}
function openTopbarEntry(extId, item, label, where) {
  let el = document.querySelector('[data-topbar-id="' + (extId + ":" + item.id) + '"]');
  if (el && entryClickable(el)) {
    clickTopbarEntry(el);
    showOpenHint(t("ext.slotOpened", { label }));
    dropToBack();
    return true;
  }
  const regs = topbarRegs(extId);
  const want = item && item.id;
  const preferred = want ? regs.find((r) => String(r.id).split(":").pop() === want) : null;
  const target = preferred || regs[0];
  if (target) {
    el = document.querySelector('[data-topbar-id="' + target.id + '"]');
    if (el && entryClickable(el)) {
      clickTopbarEntry(el);
      showOpenHint(t("ext.slotOpened", { label }));
      dropToBack();
      return true;
    }
    if (target.render && typeof target.render === "function") {
      setState({ virtualClick: { render: target.render, key: Date.now() } });
      showOpenHint(t("ext.slotOpened", { label }));
      dropToBack();
      return true;
    }
    openTopbarOverflow(
      [target],
      label,
      where,
      () => {
        showOpenHint(t("ext.slotOpened", { label }));
        dropToBack();
      },
      () => showOpenHint(t("ext.slotNoDirect", { where }))
    );
    return true;
  }
  return false;
}
function tryDirectOpen(extId, slot, item) {
  if (!extId || !item) return false;
  const want = item.id;
  const regs = regItemsOf(slot, extId);
  const hit = want ? regs.find((r) => String(r.id).split(":").pop() === want) : regs[0];
  if (hit && hit.meta && typeof hit.meta.open === "function") {
    try {
      hit.meta.open();
      return true;
    } catch {
    }
  }
  const svcOpen = ctxFull?.getExtService?.(extId + ".open");
  if (typeof svcOpen === "function") {
    try {
      svcOpen();
      return true;
    } catch {
    }
  }
  const camel = String(extId).replace(/-([a-z0-9])/g, (_, c2) => String(c2).toUpperCase());
  const g = typeof window !== "undefined" ? window["__" + camel + "Open"] : void 0;
  if (typeof g === "function") {
    try {
      g();
      return true;
    } catch {
    }
  }
  return false;
}
function openSlotItem(extId, slot, item, currentSession) {
  item && (item.label || item.title || item.id) || "";
  item && item.where || slot;
  const loader = ctxFull?.extLoaderState?.();
  if (extId && loader && !loader.materialized.includes(extId)) {
    void Promise.resolve(ctxFull?.ensureMaterialized?.(extId)).catch(() => {
    }).then(() => {
      openSlotItemNow(extId, slot, item, currentSession);
    });
    return;
  }
  openSlotItemNow(extId, slot, item, currentSession);
}
function openSlotItemNow(extId, slot, item, currentSession) {
  const label = resolveItemLabel(extId, item);
  const where = item && item.where || slot;
  if (item && item.context === "context") {
    if (!currentSession) {
      showOpenHint(t("ext.slotNeedSession", { where }) + "：" + label);
      return;
    }
    const el = locateContextElement(slot, currentSession);
    if (el) {
      flashElement(el);
      showOpenHint(t("ext.slotLocated", { where }) + "：" + label);
    } else {
      showOpenHint(t("ext.slotNeedSession", { where }) + "：" + label);
    }
    return;
  }
  if (tryDirectOpen(extId, slot, item)) {
    showOpenHint(t("ext.slotOpened", { label }));
    dropToBack();
    return;
  }
  if (slot === "toolbar" || slot === "sessionTopbar") {
    if (openTopbarEntry(extId, item, label, where)) return;
    const btn2 = findButtonByLabel(label, { contains: true });
    if (btn2) {
      btn2.click();
      showOpenHint(t("ext.slotOpened", { label }));
      dropToBack();
      return;
    }
    const regs2 = regItemsOf(slot, extId);
    const wantId2 = item && item.id;
    const hit = (wantId2 ? regs2.find((r) => String(r.id).split(":").pop() === wantId2) : null) || regs2[0];
    if (hit && typeof hit.render === "function") {
      setState({ virtualClick: { render: hit.render, key: Date.now() } });
      showOpenHint(t("ext.slotOpened", { label }));
      dropToBack();
      return;
    }
    showOpenHint(t("ext.slotNoDirect", { where }));
    return;
  }
  if (slot === "dialogs") {
    if (openTopbarEntry(extId, item, label, where)) return;
    const btn2 = findButtonByLabel(label, { contains: true });
    if (btn2) {
      btn2.click();
      showOpenHint(t("ext.slotOpened", { label }));
      dropToBack();
      return;
    }
    showOpenHint(t("ext.slotNoDirect", { where }));
    return;
  }
  const btn = findButtonByLabel(label, { contains: true });
  if (btn) {
    btn.click();
    showOpenHint(t("ext.slotOpened", { label }));
    return;
  }
  if (openTopbarEntry(extId, item, label, where)) return;
  const host = locateSlotHost(slot);
  if (host) {
    flashElement(host);
    showOpenHint(t("ext.slotLocated", { where }) + "：" + label);
    return;
  }
  showOpenHint(t("ext.slotNoDirect", { where }));
}
async function refreshStatus() {
  try {
    const r = await fetch(apiUrl("/api/extensions/aiti-extman/status?locale=" + encodeURIComponent(currentLocaleKey())), { cache: "no-store" });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const d = await r.json();
    let sel = state.selected;
    if (!sel || sel.kind !== "local" || !d.extensions[sel.id]) {
      if (!sel || sel.kind !== "online") {
        const ids = Object.keys(d.extensions || {}).filter((id) => d.extensions[id].enabled !== false).sort();
        sel = ids[0] || { kind: "local", id: Object.keys(d.extensions || {}).sort()[0] };
        if (sel) sel = { kind: "local", id: sel };
        else sel = null;
      }
    }
    setState({ status: d, selected: sel });
  } catch (e) {
    const errMsg = String(e && e.message || e);
    console.error("[aiti-extman] ❌ " + errMsg);
    setState({ error: errMsg });
  }
}
function sortedLocalIds(status) {
  const exts = status && status.extensions || {};
  return Object.keys(exts).sort((a, b) => {
    const da = exts[a].enabled === false ? 1 : 0;
    const db = exts[b].enabled === false ? 1 : 0;
    return da - db || a.localeCompare(b);
  });
}
async function loadRegistry() {
  if (state.registryLoaded) return;
  try {
    const r = await fetch(apiUrl("/api/extensions/aiti-extman/registry"), { cache: "no-store" });
    const d = await r.json();
    if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
    setState({ registryData: d, registryError: null, registryLoaded: true });
  } catch (e) {
    setState({ registryError: String(e && e.message || e), registryLoaded: true });
  }
}
let updatesInFlight = null;
async function loadUpdates(force = false) {
  if (updatesInFlight) return updatesInFlight;
  const p = (async () => {
    setState({ updatesChecking: true });
    try {
      const pr = await fetch(apiUrl("/api/extensions/aiti-extman/updates?phase=registry" + (force ? "&force=1" : "")), { cache: "no-store" });
      const pd = await pr.json();
      if (pr.ok && !pd.error && pd.updates) {
        setState({ updates: pd.updates, updatesPartial: !!pd.partial, updatesStale: !!pd.stale });
      }
    } catch {
    }
    try {
      const r = await fetch(apiUrl("/api/extensions/aiti-extman/updates" + (force ? "?force=1" : "")), { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
      setState({ updates: d.updates || {}, updatesPartial: !!d.partial, updatesStale: !!d.stale });
      if (!force && d.stale) {
        const fr = await fetch(apiUrl("/api/extensions/aiti-extman/updates?force=1"), { cache: "no-store" });
        const fd = await fr.json();
        if (fr.ok && !fd.error) setState({ updates: fd.updates || {}, updatesPartial: !!fd.partial, updatesStale: false });
      }
    } catch {
    } finally {
      setState({ updatesChecking: false });
    }
  })();
  updatesInFlight = p;
  try {
    await p;
  } finally {
    updatesInFlight = null;
  }
}
function semverGt(a, b) {
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(String(v).trim());
    return m ? { nums: [Number(m[1]), Number(m[2]), Number(m[3])], pre: m[4] ?? null } : null;
  };
  const pa = parse(a);
  const pb = parse(b);
  if (!pa || !pb) return false;
  for (let i = 0; i < 3; i++) if (pa.nums[i] !== pb.nums[i]) return pa.nums[i] > pb.nums[i];
  if (pa.pre && pb.pre) {
    const xa = pa.pre.split(".");
    const xb = pb.pre.split(".");
    for (let i = 0; i < Math.max(xa.length, xb.length); i++) {
      const x = xa[i];
      const y = xb[i];
      if (x === void 0) return false;
      if (y === void 0) return true;
      if (/^\d+$/.test(x) && /^\d+$/.test(y)) {
        const d = Number(x) - Number(y);
        if (d) return d > 0;
      } else if (x !== y) return x > y;
    }
    return false;
  }
  if (pa.pre) return false;
  if (pb.pre) return true;
  return false;
}
function runOp(action, extra) {
  if ((action === "disable" || action === "remove") && extra && typeof extra.id === "string") {
    const clientDeps = clientDependents(extra.id);
    const hardDeps = hardDependents(extra.id);
    if (clientDeps.length > 0 || hardDeps.length > 0) {
      setState({ pendingDependents: { action, id: extra.id, clientDeps, hardDeps } });
      return Promise.resolve();
    }
  }
  return execOp(action, extra);
}
async function execOp(action, extra) {
  const key = action + ":" + (extra && (extra.busyId || extra.id || extra.source) || "");
  setState({ busyKey: key, applying: t("ext.applying"), error: null, message: null });
  try {
    const r = await fetch(apiUrl("/api/extensions/aiti-extman/ops"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...extra })
    });
    const d = await r.json();
    if (!r.ok && !d.needsTrust) throw new Error(d.error || "HTTP " + r.status);
    if (d.needsTrust) {
      setState({
        pendingTrust: {
          kind: "source",
          source: d.source || extra.source,
          docsUrl: d.docsUrl || extra.docsUrl,
          id: d.id,
          publisher: d.publisher,
          publisherHint: extra.publisherHint,
          zipName: d.zipName
        },
        busyKey: null,
        applying: null,
        error: null,
        message: null
      });
      return;
    }
    if (d.error) throw new Error(d.error);
    if (d.extensions) {
      let sel = state.selected;
      if (action === "install" && d.id) sel = { kind: "local", id: d.id };
      else if ((action === "remove" || action === "enable" || action === "disable") && d.id) sel = { kind: "local", id: d.id };
      if (!sel || sel.kind === "local" && !d.extensions[sel.id]) {
        const ids = Object.keys(d.extensions || {}).filter((id) => d.extensions[id].enabled !== false).sort();
        sel = ids[0] ? { kind: "local", id: ids[0] } : null;
      }
      setState({ status: d, selected: sel });
    } else {
      await refreshStatus();
    }
    if (action === "set-feature" && d && d.id && d.featureId) {
      const detail = d.value !== void 0 && typeof d.value === "string" ? { extId: d.id, featureId: d.featureId, value: d.value } : { extId: d.id, featureId: d.featureId, enabled: d.enabled !== false };
      try {
        window.dispatchEvent(new CustomEvent("pi-web:ext-features-changed", { detail }));
      } catch {
      }
    }
    await syncClient();
    const msgs = {
      install: "ext.msgInstalled",
      remove: "ext.msgRemoved",
      enable: "ext.msgEnabled",
      disable: "ext.msgDisabled",
      reload: "ext.msgReloaded",
      "set-feature": "ext.msgFeatureSet",
      "set-pin": "ext.msgPinned",
      "set-dev-priority": "ext.msgPinned",
      trust: "ext.msgTrusted",
      untrust: "ext.msgUntrusted"
    };
    setState({ message: installProtocolHint(t(msgs[action] || "ext.msgReloaded"), action === "install" ? d?.protocolCheck : null), busyKey: null, applying: null });
    if (action === "trust" || action === "untrust" || action === "install") void refreshTrusted();
    if (action === "install" || action === "remove") void loadUpdates(true);
  } catch (e) {
    setState({ error: String(e && e.message || e), busyKey: null, applying: null });
    console.error("[aiti-extman] ❌ " + String(e && e.message || e));
  }
}
let updateAllInFlight = null;
async function updateAll() {
  if (updateAllInFlight) return updateAllInFlight;
  const p = (async () => {
    setState({ busyKey: "*", applying: t("ext.updatingAll"), error: null, message: null });
    try {
      const r = await fetch(apiUrl("/api/extensions/aiti-extman/update-all"), { method: "POST", cache: "no-store" });
      const d = await r.json();
      if (!r.ok || d.error) throw new Error(d.error || "HTTP " + r.status);
      if (d.extensions) {
        const ids = Object.keys(d.extensions).filter((id) => d.extensions[id].enabled !== false).sort();
        const sel = state.selected;
        setState({
          status: d,
          selected: sel && sel.kind === "local" && d.extensions[sel.id] ? sel : ids[0] ? { kind: "local", id: ids[0] } : null
        });
      } else {
        await refreshStatus();
      }
      await syncClient();
      const list = Array.isArray(d.updated) ? d.updated : [];
      const failed = list.filter((u) => !u.ok);
      setState({
        message: failed.length ? t("ext.msgUpdatedSome", { ok: String(list.length - failed.length), failed: String(failed.length) }) : t("ext.msgUpdatedAll", { count: String(list.length) }),
        busyKey: null,
        applying: null
      });
      void loadUpdates(true);
    } catch (e) {
      setState({ error: String(e && e.message || e), busyKey: null, applying: null });
    }
  })();
  updateAllInFlight = p;
  try {
    await p;
  } finally {
    updateAllInFlight = null;
  }
}
async function syncClient() {
  try {
    if (ctxReload) await ctxReload({ resyncOnly: true });
  } catch {
  }
  if (ctxLoaderState) setState({ loader: ctxLoaderState() });
}
function syncLoader() {
  if (ctxLoaderState) setState({ loader: ctxLoaderState() });
}
async function runInstallZip(file, trust) {
  setState({ busyKey: "install:zip:" + file.name, applying: t("ext.applying"), error: null, message: null });
  try {
    const fd = new FormData();
    fd.append("file", file, file.name);
    if (trust) fd.append("trust", "1");
    const r = await fetch(apiUrl("/api/extensions/aiti-extman/install-zip"), { method: "POST", body: fd });
    const d = await r.json();
    if (!r.ok && !d.needsTrust) throw new Error(d.error || "HTTP " + r.status);
    if (d.needsTrust) {
      setState({
        pendingTrust: { kind: "zip", file, id: d.id, publisher: d.publisher, zipName: d.zipName },
        busyKey: null,
        applying: null,
        error: null,
        message: null
      });
      return;
    }
    if (d.error) throw new Error(d.error);
    if (d.extensions) {
      let sel = state.selected;
      if (d.id) sel = { kind: "local", id: d.id };
      if (!sel || sel.kind === "local" && !d.extensions[sel.id]) {
        const ids = Object.keys(d.extensions).filter((id) => d.extensions[id].enabled !== false).sort();
        sel = ids[0] ? { kind: "local", id: ids[0] } : null;
      }
      setState({ status: d, selected: sel });
    } else {
      await refreshStatus();
    }
    await syncClient();
    setState({ message: installProtocolHint(t("ext.msgInstalled"), d?.protocolCheck), busyKey: null, applying: null });
    void refreshTrusted();
    void loadUpdates(true);
  } catch (e) {
    setState({ error: String(e && e.message || e), busyKey: null, applying: null });
    console.error("[aiti-extman] ❌ " + String(e && e.message || e));
  }
}
function installProtocolHint(base, protocolCheck) {
  const pc = protocolCheck;
  if (!pc || !pc.state || pc.state === "ok") return base;
  const stateKey = {
    stale: "ext.protocolStale",
    incompatible: "ext.protocolIncompatible",
    missing: "ext.protocolMissing",
    invalid: "ext.protocolInvalid",
    too_new: "ext.protocolTooNew"
  };
  return pc.state === "too_new" ? base + " · " + t("ext.protocolInstallTooNew", { declared: pc.declared ?? "?", current: pc.current }) : base + " · " + t("ext.protocolInstallWarn", { declared: pc.declared ?? "(legacy)", current: pc.current, state: t(stateKey[pc.state] || "ext.protocol") });
}
function subscribeAll(fn) {
  const unsubState = subscribe(fn);
  const onLocale = () => {
    fn();
    void refreshStatus().catch(() => {
    });
  };
  window.addEventListener("pi-web:locale-changed", onLocale);
  const unsubRegistry = onExtRegistryReady(fn);
  return () => {
    unsubState();
    unsubRegistry();
    window.removeEventListener("pi-web:locale-changed", onLocale);
  };
}
function localMatches(id, e, q) {
  if (!q) return true;
  const s = q.toLowerCase();
  const display = extUi18nExact(id)["ext.displayName"] || e.name || "";
  const hay = (id + " " + (e.name || "") + " " + display + " " + (e.packageInfo && e.packageInfo.name || "") + " " + (e.pinyin || "")).toLowerCase();
  const qNorm = s.replace(/\s+/g, "");
  return hay.includes(s) || !!qNorm && hay.includes(qNorm) || typoMatch(q, hay) || !!qNorm && typoMatch(qNorm, hay);
}
function onlineMatches(ext, q) {
  if (!q) return false;
  const s = q.toLowerCase();
  const display = extUi18nExact(ext.id)["ext.displayName"] || ext.name || "";
  const pinyin = state.status && state.status.extensions && state.status.extensions[ext.id] && state.status.extensions[ext.id].pinyin || "";
  const hay = [ext.id, ext.name, display, ext.description, ext.category, (ext.tags || []).join(" "), pinyin].filter(Boolean).join(" ").toLowerCase();
  const qNorm = s.replace(/\s+/g, "");
  return hay.includes(s) || !!qNorm && hay.includes(qNorm) || typoMatch(q, hay) || !!qNorm && typoMatch(qNorm, hay);
}
function registryDocUrl(ext) {
  return ext.docs ? AITI_DOCS_BASE + ext.docs : AITI_REGISTRY_PAGE + ext.id + ".html";
}
function registryInstallSource(ext) {
  if (ext.npm && ext.npm.trim()) return "npm:" + ext.npm.trim();
  if (ext.repo && ext.repo.trim()) {
    const repo = ext.repo.trim();
    return /^https?:\/\//.test(repo) ? repo : "git:https://github.com/" + repo;
  }
  return null;
}
function onlinePublisher(ext) {
  if (ext.publisher && ext.publisher.trim()) {
    return {
      name: ext.publisher.trim(),
      url: ext.website && ext.website.trim() || null,
      source: "registry",
      fingerprint: ext.publisher.trim()
    };
  }
  const name = ext.author && ext.author.trim() || null;
  let url = null;
  let source = "registry";
  if (ext.repo && ext.repo.trim()) {
    url = /^https?:\/\//.test(ext.repo) ? ext.repo.trim() : "https://github.com/" + ext.repo.trim();
    source = "github";
  } else if (ext.npm && ext.npm.trim()) {
    url = "https://www.npmjs.com/package/" + ext.npm.trim();
    source = "npm";
  }
  return { name, url, source, fingerprint: name || url || ext.id };
}
function invokeHelper(opts) {
  const inv = typeof window !== "undefined" ? window.__aitiHelperInvoke : null;
  if (typeof inv === "function") {
    try {
      inv(opts);
      return true;
    } catch {
      return false;
    }
  }
  const p = ctxFull?.ensureMaterialized?.("aiti-helper");
  if (p && typeof p.then === "function") {
    void Promise.resolve(p).catch(() => {
    }).then(() => {
      const inv2 = typeof window !== "undefined" ? window.__aitiHelperInvoke : null;
      if (typeof inv2 === "function") inv2(opts);
      else {
        try {
          window.alert?.(t("ext.helperMissing"));
        } catch {
        }
      }
    });
    return true;
  }
  try {
    window.alert?.(t("ext.helperMissing"));
  } catch {
  }
  return false;
}
function extDescVars(extId, entry) {
  const vars = { "ext-id": extId };
  try {
    const probe = apiUrl("/api/__md_probe__");
    const base = probe.replace(/\/api\/__md_probe__.*$/, "").replace(/\/+$/, "");
    vars["aiti-url"] = location.origin + base;
  } catch {
    vars["aiti-url"] = location.origin;
  }
  if (entry && typeof entry.dir === "string" && entry.dir) vars["ext-dir"] = entry.dir;
  if (entry && typeof entry.configDir === "string" && entry.configDir) vars["ext-config-dir"] = entry.configDir;
  return vars;
}
function substVars(text, vars) {
  return text.replace(/\{\{\s*([A-Za-z0-9_-]+)\s*\}\}/g, (m, k) => Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : m);
}
const INLINE_RE = /(`([^`]+)`)|(\*\*([^*]+)\*\*)|(\*([^*\n]+)\*)|(\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))|((?:https?:\/\/)[^\s<>()[\]"']+)/g;
const inlineCodeStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: "0.92em",
  background: "var(--bg-hover)",
  borderRadius: 4,
  padding: "1px 5px",
  overflowWrap: "anywhere"
};
function inline(text, keyBase) {
  const out = [];
  let last = 0, m, i = 0;
  INLINE_RE.lastIndex = 0;
  while (m = INLINE_RE.exec(text)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const k = keyBase + "-" + i++;
    if (m[2] !== void 0) {
      out.push(/* @__PURE__ */ jsx("code", { style: inlineCodeStyle, children: m[2] }, k));
    } else if (m[4] !== void 0) {
      out.push(/* @__PURE__ */ jsx("strong", { style: { fontWeight: 700 }, children: m[4] }, k));
    } else if (m[6] !== void 0) {
      out.push(/* @__PURE__ */ jsx("em", { children: m[6] }, k));
    } else if (m[8] !== void 0) {
      out.push(/* @__PURE__ */ jsx("a", { href: m[9], target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)" }, children: m[8] }, k));
    } else if (m[10] !== void 0) {
      out.push(/* @__PURE__ */ jsx("a", { href: m[10], target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", overflowWrap: "anywhere" }, children: m[10] }, k));
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
function CodeBlock({ code, lang }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(done).catch(() => {
      });
    } else {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        done();
      } catch {
      }
    }
  };
  return /* @__PURE__ */ jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg-panel)", overflow: "hidden", minWidth: 0 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "3px 8px", borderBottom: "1px solid var(--border)" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }, children: lang || "code" }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          onClick: copy,
          style: { border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)", color: copied ? "#10b981" : "var(--text-muted)", fontSize: 10, padding: "1px 8px", cursor: "pointer" },
          children: copied ? "✓ " + t("ext.copied") : t("ext.copy")
        }
      )
    ] }),
    /* @__PURE__ */ jsx("pre", { style: { margin: 0, padding: "8px 10px", overflowX: "auto", fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre" }, children: /* @__PURE__ */ jsx("code", { children: code }) })
  ] });
}
const isListLine = (l) => /^\s*(?:[-*+]|\d+[.)])\s+/.test(l);
const isBlockStart = (l) => /^(#{1,4}\s|```|\s*>|\s*[-*+]\s|\s*\d+[.)]\s)/.test(l);
function MdDesc({ text, vars }) {
  const lines = substVars(text, vars).split(/\r?\n/);
  const blocks = [];
  let i = 0, key = 0;
  while (i < lines.length) {
    const line = lines[i];
    const fence = line.match(/^```\s*(\S*)\s*$/);
    if (fence) {
      const lang = fence[1] || "";
      const buf2 = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) {
        buf2.push(lines[i]);
        i++;
      }
      i++;
      blocks.push(/* @__PURE__ */ jsx(CodeBlock, { code: buf2.join("\n"), lang }, key++));
      continue;
    }
    if (!line.trim()) {
      i++;
      continue;
    }
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      const lv = h[1].length;
      const style = lv <= 2 ? { fontSize: lv === 1 ? 14 : 13, fontWeight: 700, color: "var(--text)", marginTop: 4 } : { fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginTop: 2 };
      blocks.push(/* @__PURE__ */ jsx("div", { style, children: inline(h[2], "h" + key) }, key++));
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
      blocks.push(/* @__PURE__ */ jsx("div", { style: { borderTop: "1px solid var(--border)", margin: "2px 0" } }, key++));
      i++;
      continue;
    }
    if (/^\s*>\s?/.test(line)) {
      const buf2 = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        buf2.push(lines[i].replace(/^\s*>\s?/, ""));
        i++;
      }
      blocks.push(
        /* @__PURE__ */ jsx("div", { style: { borderLeft: "3px solid var(--border)", paddingLeft: 10, color: "var(--text-dim)", fontSize: 12, lineHeight: 1.55, margin: "2px 0" }, children: buf2.map((l, n) => /* @__PURE__ */ jsx("div", { children: inline(l, "q" + key + "-" + n) }, n)) }, key++)
      );
      continue;
    }
    if (isListLine(line)) {
      const ordered = /^\s*\d+[.)]\s/.test(line);
      const items = [];
      while (i < lines.length) {
        const mm = lines[i].match(/^(\s*)(?:[-*+]|\d+[.)])\s+(.+)$/);
        if (mm) {
          items.push({ level: Math.floor(mm[1].replace(/\t/g, "  ").length / 2), text: mm[2] });
          i++;
          continue;
        }
        if (items.length && /^\s+\S/.test(lines[i]) && !/^```/.test(lines[i])) {
          items[items.length - 1].text += " " + lines[i].trim();
          i++;
          continue;
        }
        break;
      }
      blocks.push(
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 3, margin: "2px 0" }, children: items.map((it, n) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, paddingLeft: it.level * 14, fontSize: 12, lineHeight: 1.55 }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0 }, children: ordered ? n + 1 + "." : "•" }),
          /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0 }, children: inline(it.text, "li" + key + "-" + n) })
        ] }, n)) }, key++)
      );
      continue;
    }
    const buf = [];
    while (i < lines.length && lines[i].trim() && !isBlockStart(lines[i])) {
      buf.push(lines[i]);
      i++;
    }
    blocks.push(
      /* @__PURE__ */ jsx("div", { style: { fontSize: 12, lineHeight: 1.6, color: "var(--text)" }, children: buf.map((l, n) => /* @__PURE__ */ jsx("div", { children: inline(l, "p" + key + "-" + n) }, n)) }, key++)
    );
  }
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }, children: blocks });
}
const Z_BASE = 2147483600;
const V = {
  panel: "var(--bg-panel, #1c1c20)",
  hover: "var(--bg-hover, #2a2a30)",
  border: "var(--border, #3a3a42)",
  text: "var(--text, #e8e8ec)",
  accent: "var(--accent, #4f8ef7)",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)"
};
const KIND_COLOR = {
  info: V.accent,
  success: "#10b981",
  error: "var(--danger, #ef4444)",
  warn: "var(--warn, #f59e0b)"
};
function iconSvg(kind, color) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", "18");
  svg.setAttribute("height", "18");
  svg.style.flexShrink = "0";
  const common = { fill: "none", stroke: color, "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" };
  const add = (tag, attrs) => {
    const el = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    svg.appendChild(el);
  };
  if (kind === "warn") {
    add("path", { ...common, d: "M12 3 L22 20 H2 Z" });
    add("line", { ...common, x1: "12", y1: "9.5", x2: "12", y2: "14" });
    add("line", { ...common, x1: "12", y1: "16.8", x2: "12", y2: "16.9" });
  } else if (kind === "error") {
    add("circle", { ...common, cx: "12", cy: "12", r: "9" });
    add("line", { ...common, x1: "9", y1: "9", x2: "15", y2: "15" });
    add("line", { ...common, x1: "15", y1: "9", x2: "9", y2: "15" });
  } else if (kind === "success") {
    add("circle", { ...common, cx: "12", cy: "12", r: "9" });
    add("path", { ...common, d: "M8 12.5 L11 15.5 L16.5 9.5" });
  } else {
    add("circle", { ...common, cx: "12", cy: "12", r: "9" });
    add("line", { ...common, x1: "12", y1: "11", x2: "12", y2: "16" });
    add("line", { ...common, x1: "12", y1: "8", x2: "12", y2: "8.01" });
  }
  return svg;
}
const btnBase = {
  border: "1px solid " + V.border,
  background: V.hover,
  borderRadius: 6,
  padding: "6px 16px",
  cursor: "pointer",
  fontSize: 13,
  color: V.text,
  fontFamily: "inherit"
};
Promise.resolve();
const queue = [];
let showing = false;
function enqueue(specKind, opts) {
  return new Promise((resolve) => {
    queue.push({ kind: specKind, opts, resolve });
    drain();
  });
}
function drain() {
  if (showing) return;
  const next = queue.shift();
  if (!next) return;
  showing = true;
  try {
    showDialog(next, () => {
      showing = false;
      drain();
    });
  } catch (e) {
    next.resolve(next.kind === "prompt" ? null : next.kind === "confirm" ? false : void 0);
    showing = false;
    drain();
  }
}
function canUseTopLayer() {
  try {
    const probe = document.createElement("dialog");
    return !!probe && typeof probe.showModal === "function";
  } catch {
    return false;
  }
}
const BACKDROP_STYLE_ID = "ui-dialogs-backdrop";
function ensureBackdropStyle() {
  try {
    if (document.getElementById(BACKDROP_STYLE_ID)) return;
    const st = document.createElement("style");
    st.id = BACKDROP_STYLE_ID;
    st.textContent = "[data-ui-dialog-overlay]::backdrop{background:transparent;}";
    (document.head || document.body).appendChild(st);
  } catch {
  }
}
function mount() {
  const modal = canUseTopLayer();
  const overlay = document.createElement(modal ? "dialog" : "div");
  overlay.setAttribute("data-ui-dialog-overlay", "1");
  overlay.style.cssText = "position:fixed;inset:0;margin:0;border:0;padding:20px;width:auto;height:auto;max-width:none;max-height:none;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:" + Z_BASE + ";";
  const panel = document.createElement("div");
  panel.setAttribute("data-ext-float", "1");
  panel.setAttribute("data-ext-float-w", "440");
  panel.setAttribute("data-ext-float-autoh", "1");
  panel.setAttribute("data-ext-float-full", "1");
  panel.setAttribute("data-ext-float-keepmask", "1");
  panel.setAttribute("data-ext-float-max", "0");
  panel.setAttribute("data-ext-float-persist", "0");
  panel.tabIndex = -1;
  panel.style.cssText = "width:440px;max-width:100%;border-radius:12px;background:" + V.panel + ";border:1px solid " + V.border + ";color:" + V.text + ";font-family:inherit;font-size:13px;box-shadow:0 20px 60px rgba(0,0,0,0.35);outline:none;overflow:hidden;";
  overlay.appendChild(panel);
  document.body.appendChild(overlay);
  if (modal) {
    ensureBackdropStyle();
    try {
      overlay.showModal();
    } catch {
    }
  }
  return { overlay, panel };
}
function buildBody(panel, spec, finish) {
  const o = spec.opts || {};
  const kind = spec.kind === "confirm" ? "info" : o.kind === "success" || o.kind === "error" || o.kind === "warn" || o.kind === "info" ? o.kind : "info";
  const color = spec.kind === "confirm" && o.danger ? KIND_COLOR.error : KIND_COLOR[kind];
  const iconKind = spec.kind === "confirm" && o.danger ? "warn" : kind;
  const head = document.createElement("div");
  head.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 18px 0;";
  const icon = iconSvg(iconKind, color);
  icon.style.width = "20px";
  icon.style.height = "20px";
  head.appendChild(icon);
  const titleEl = document.createElement("div");
  titleEl.style.cssText = "flex:1;min-width:0;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
  titleEl.textContent = o.title || (spec.kind === "confirm" ? o.danger ? "危险操作确认" : "确认操作" : spec.kind === "prompt" ? "输入" : spec.kind === "choice" ? "请选择" : "提示");
  head.appendChild(titleEl);
  panel.appendChild(head);
  if (o.message) {
    const msg = document.createElement("div");
    msg.style.cssText = "padding:12px 18px 0;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:" + V.text + ";";
    msg.textContent = String(o.message);
    panel.appendChild(msg);
  }
  if (o.detail) {
    const det = document.createElement("pre");
    det.style.cssText = "margin:10px 18px 0;padding:10px 12px;border-radius:8px;background:" + V.hover + ";border:1px solid " + V.border + ";font-family:" + V.mono + ";font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto;color:" + V.text + ";";
    det.textContent = String(o.detail);
    panel.appendChild(det);
  }
  let input = null;
  if (spec.kind === "prompt") {
    input = document.createElement("input");
    input.type = "text";
    input.value = typeof o.value === "string" ? o.value : "";
    if (o.placeholder) input.placeholder = String(o.placeholder);
    input.style.cssText = "display:block;margin:12px 18px 0;width:calc(100% - 36px);box-sizing:border-box;border:1px solid " + V.border + ";border-radius:6px;padding:7px 10px;font-size:13px;background:" + V.hover + ";color:" + V.text + ";font-family:inherit;outline:none;";
    input.addEventListener("focus", () => {
      input.style.borderColor = V.accent;
    });
    input.addEventListener("blur", () => {
      input.style.borderColor = V.border;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finish(input && o.required && !input.value.trim() ? void 0 : input.value);
      }
    });
    panel.appendChild(input);
  }
  const foot = document.createElement("div");
  foot.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px 18px;";
  const mk = (label, primary, dangerStyle, onClick) => {
    const b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = Object.entries({
      ...btnBase,
      ...primary ? { background: dangerStyle ? KIND_COLOR.error : V.accent, borderColor: "transparent", color: "#fff", fontWeight: "600" } : {}
    }).map(([k, v]) => k + ":" + v).join(";") + ";";
    b.addEventListener("click", onClick);
    foot.appendChild(b);
    return b;
  };
  if (spec.kind === "choice") {
    const items = Array.isArray(o.choices) ? o.choices : [];
    for (const item of items) {
      mk(item.label || item.id, item.tone === "primary", item.tone === "danger", () => finish(item.id));
    }
    if (items.length === 0) finish(o.cancelId ?? null);
  } else if (spec.kind === "alert") {
    const ok = mk(o.confirmText || "确定", true, false, () => finish(void 0));
    ok.__primary = true;
  } else {
    mk(o.cancelText || "取消", false, false, () => finish(spec.kind === "prompt" ? null : spec.kind === "choice" ? o.cancelId ?? null : false));
    const ok = mk(o.confirmText || (spec.kind === "confirm" && o.danger ? "确认执行" : "确定"), true, !!(spec.kind === "confirm" && o.danger), () => finish(spec.kind === "prompt" ? input && o.required && !input.value.trim() ? void 0 : input.value : true));
    ok.__primary = true;
  }
  panel.appendChild(foot);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      finish(spec.kind === "prompt" || spec.kind === "choice" ? null : spec.kind === "confirm" ? false : void 0);
    } else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
      e.preventDefault();
      (foot.querySelector("button") ? Array.from(foot.querySelectorAll("button")).at(-1) : null)?.click();
    }
  });
  return input;
}
function showDialog(spec, done) {
  const { overlay, panel } = mount();
  const prevFocus = document.activeElement;
  let settled = false;
  const finish = (v) => {
    if (settled) return;
    settled = true;
    spec.resolve(v);
    try {
      overlay.close?.();
    } catch {
    }
    try {
      overlay.remove();
    } catch {
    }
    try {
      prevFocus && typeof prevFocus.focus === "function" && prevFocus.focus();
    } catch {
    }
    setTimeout(done, 0);
  };
  try {
    overlay.addEventListener?.("cancel", (e) => {
      try {
        e?.preventDefault?.();
      } catch {
      }
      finish(spec.kind === "prompt" || spec.kind === "choice" ? null : spec.kind === "confirm" ? false : void 0);
    });
  } catch {
  }
  const input = buildBody(panel, spec, finish);
  setTimeout(() => {
    try {
      if (input) {
        input.focus();
        input.select();
      } else {
        const btns = panel.querySelectorAll("button");
        (btns.length ? btns[btns.length - 1] : panel).focus();
      }
    } catch {
    }
  }, 0);
}
function uiConfirm(opts) {
  const o = typeof opts === "string" ? { message: opts } : opts;
  return enqueue("confirm", o);
}
const ROOT_CHIP_COLORS = {
  user: ["#3b82f6", "rgba(59,130,246,0.12)"],
  extra: ["#d97706", "rgba(217,119,6,0.12)"],
  dev: ["#059669", "rgba(5,150,105,0.12)"],
  bundled: ["#8b5cf6", "rgba(139,92,246,0.12)"]
};
function updateSourceLabel(source) {
  if (source === "registry") return "site";
  if (source === "none" || !source) return "";
  return source;
}
function updateTooltip(upd) {
  if (!upd) return "";
  const parts = [];
  if (upd.installed) parts.push("installed " + upd.installed);
  if (upd.npm) parts.push("npm " + upd.npm.latest);
  if (upd.registry) parts.push("aiti.pw " + upd.registry.version);
  if (upd.git) parts.push("git " + String(upd.git.head).slice(0, 7) + (upd.git.remote ? " → " + String(upd.git.remote).slice(0, 7) : ""));
  if (upd.message) parts.push(upd.message);
  return parts.join(" · ");
}
const UPDATE_WARN = { color: "#d97706", bg: "rgba(217,119,6,0.12)" };
const UPDATE_OK = {
  color: "color-mix(in srgb, var(--ok, #10b981) 90%, transparent)",
  bg: "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"
};
function UpdateStatusChip({ upd }) {
  if (!upd) return null;
  switch (upd.state) {
    case "update-available":
      return /* @__PURE__ */ jsxs("span", { style: chipStyle(UPDATE_WARN.color, UPDATE_WARN.bg), title: updateTooltip(upd), children: [
        "↑ ",
        upd.latest,
        upd.source !== "none" ? " · " + updateSourceLabel(upd.source) : ""
      ] });
    case "unpublished":
      return /* @__PURE__ */ jsx("span", { style: chipStyle(UPDATE_WARN.color, UPDATE_WARN.bg), title: updateTooltip(upd), children: t("ext.updateSiteOnly", { version: upd.registry && upd.registry.version || upd.latest }) });
    case "up-to-date":
      if (state.updatesStale) return null;
      return /* @__PURE__ */ jsxs("span", { style: chipStyle(UPDATE_OK.color, UPDATE_OK.bg), title: updateTooltip(upd), children: [
        "✓ ",
        upd.latest
      ] });
    case "local-ahead":
      return /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-dim)", "var(--bg-panel)"), title: updateTooltip(upd), children: t("ext.localAhead") });
    case "error":
      return /* @__PURE__ */ jsxs("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)"), title: updateTooltip(upd), children: [
        "! ",
        t("ext.updateCheckFailed")
      ] });
    default:
      return null;
  }
}
function protocolChipSpec(proto) {
  const state2 = proto?.state;
  if (!state2) return null;
  if (state2 === "ok") {
    return proto.minorAhead ? { icon: "ℹ", label: t("ext.protocolMinorAhead"), color: "#0ea5e9", bg: "rgba(14,165,233,0.12)" } : null;
  }
  const warn = { color: "#d97706", bg: "rgba(217,119,6,0.12)" };
  switch (state2) {
    case "incompatible":
      return { icon: "⛔", label: t("ext.protocolIncompatible"), color: "var(--danger, #ef4444)", bg: "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)" };
    case "too_new":
      return { icon: "↑", label: t("ext.protocolTooNew"), ...warn };
    case "missing":
      return { icon: "⚠", label: t("ext.protocolMissing"), ...warn };
    case "invalid":
      return { icon: "⚠", label: t("ext.protocolInvalid"), ...warn };
    case "stale":
      return { icon: "⚠", label: t("ext.protocolStale"), ...warn };
    default:
      return { icon: "⚠", label: String(state2), ...warn };
  }
}
function currentLocale() {
  try {
    const v = localStorage.getItem("pi-locale") || (typeof navigator !== "undefined" ? navigator.language : "") || "en";
    return String(v).toLowerCase().startsWith("zh") ? "zh" : "en";
  } catch {
    return "en";
  }
}
function askAiProtocolUpgrade(id, proto) {
  const refs = (proto?.upgradeRefs || []).join(" → ");
  const from = proto?.declared ?? (currentLocale() === "zh" ? "（未声明/legacy）" : "(undeclared/legacy)");
  const zhMsg = `【扩展协议升级】把 pi-web 扩展 ${id} 从协议 ${from} 升级到当前 ${proto?.current}。
请走 ext-protocol-upgrade skill：先读 docs/pi-web-ext-protocol.md；本扩展按顺序读迁移手册 ${refs || "（无跳数）"}，改 pi-web-ext/${id}/ 源码并更新 package.json 的 aitiExtProtocol，构建/测试/deploy 后回报。` + (proto?.detail ? `
现状：${proto.detail}` : "");
  const enMsg = `[Extension protocol upgrade] Upgrade pi-web extension ${id} from protocol ${from} to current ${proto?.current}.
Use the ext-protocol-upgrade skill: read docs/pi-web-ext-protocol.md first; read the migration handbooks in order ${refs || "(none skipped)"}, edit pi-web-ext/${id}/ source and bump aitiExtProtocol in package.json, then build/test/deploy and report back.` + (proto?.detail ? `
Current state: ${proto.detail}` : "");
  const msg = currentLocale() === "zh" ? zhMsg : enMsg;
  invokeHelper({ helperId: "ext-protocol-upgrade", extId: SELF_ID, extName: "aiti-extman", message: msg, contextLabel: t("ext.protocolUpgradeCtx", { id }) });
}
function VirtualClick({ vc }) {
  const ref = useRef(null);
  useEffect(() => {
    const btn = ref.current?.querySelector("button, [role='button']");
    if (btn) btn.click();
    const timer = setTimeout(() => setState({ virtualClick: null }), 80);
    return () => clearTimeout(timer);
  }, []);
  return /* @__PURE__ */ jsx("div", { ref, "aria-hidden": true, style: { position: "fixed", left: -99999, top: -99999, width: 1, height: 1, overflow: "hidden", pointerEvents: "none" }, children: vc.render({ menu: false, virtual: true }) });
}
function BoxPlaceholderIcon({ size }) {
  return /* @__PURE__ */ jsxs(
    "svg",
    {
      "aria-hidden": true,
      width: size,
      height: size,
      viewBox: "0 0 24 24",
      fill: "none",
      stroke: "currentColor",
      strokeWidth: 2,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      style: { flexShrink: 0, verticalAlign: "middle", opacity: 0.75 },
      children: [
        /* @__PURE__ */ jsx("path", { d: "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" }),
        /* @__PURE__ */ jsx("path", { d: "m3.3 7 8.7 5 8.7-5" }),
        /* @__PURE__ */ jsx("path", { d: "M12 22V12" })
      ]
    }
  );
}
function extIconSpan(ext, size, id) {
  const extId = id || ext && ext.id;
  const localIcon = extId ? state.status?.extensions?.[extId]?.icon : null;
  if (extId && typeof localIcon === "string" && localIcon.endsWith(".svg")) {
    const url = apiUrl("/api/extensions/" + extId + "/assets/" + localIcon);
    return /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: {
      display: "inline-block",
      width: size,
      height: size,
      flexShrink: 0,
      verticalAlign: "middle",
      background: "currentColor",
      maskImage: "url(" + url + ")",
      WebkitMaskImage: "url(" + url + ")",
      maskRepeat: "no-repeat",
      maskPosition: "center",
      maskSize: "contain"
    } });
  }
  if (ext && typeof ext.iconUrl === "string" && ext.iconUrl) {
    return /* @__PURE__ */ jsx(
      "img",
      {
        "aria-hidden": true,
        alt: "",
        src: AITI_DOCS_BASE + ext.iconUrl,
        width: size,
        height: size,
        style: { flexShrink: 0, verticalAlign: "middle", objectFit: "contain" }
      }
    );
  }
  return /* @__PURE__ */ jsx(BoxPlaceholderIcon, { size });
}
function SourceTag({ source }) {
  if (!source) return null;
  return /* @__PURE__ */ jsx("span", { style: { ...chipStyle(SOURCE_COLORS[source] || "var(--text-dim)", "rgba(120,120,120,0.12)"), fontFamily: "var(--font-mono)" }, children: SOURCE_LABELS[source] || source });
}
function ChevronIcon({ dir, size = 14 }) {
  return /* @__PURE__ */ jsx("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, style: { flexShrink: 0 }, children: dir === "left" ? /* @__PURE__ */ jsx("path", { d: "m15 18-6-6 6-6" }) : /* @__PURE__ */ jsx("path", { d: "m9 18 6-6-6-6" }) });
}
function ExtNav({ ids, index }) {
  if (index < 0 || ids.length < 2) return null;
  const go = (dir) => {
    const next = ids[(index + dir + ids.length) % ids.length];
    setState({ selected: { kind: "local", id: next }, error: null, message: null, mobileView: state.isMobile ? "detail" : state.mobileView });
  };
  const targetName = (dir) => {
    const id = ids[(index + dir + ids.length) % ids.length];
    const entry = state.status && state.status.extensions[id];
    return entry ? extDisplayName(id, entry.name) : id;
  };
  const navBtn = { ...btnStyle, padding: "5px 9px", fontSize: 13, lineHeight: 1, display: "inline-flex", alignItems: "center" };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 2, flexShrink: 0, marginLeft: "auto" }, children: [
    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => go(-1), title: t("ext.prevExt") + ": " + targetName(-1), "aria-label": t("ext.prevExt"), style: navBtn, children: /* @__PURE__ */ jsx(ChevronIcon, { dir: "left" }) }),
    /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", minWidth: 34, textAlign: "center", userSelect: "none" }, children: [
      index + 1,
      "/",
      ids.length
    ] }),
    /* @__PURE__ */ jsx("button", { type: "button", onClick: () => go(1), title: t("ext.nextExt") + ": " + targetName(1), "aria-label": t("ext.nextExt"), style: navBtn, children: /* @__PURE__ */ jsx(ChevronIcon, { dir: "right" }) })
  ] });
}
function ToggleKnob({ enabled, loading, size }) {
  const left = enabled ? size + 5 : 3;
  if (loading) {
    return /* @__PURE__ */ jsx("span", { className: "extman-spin", style: {
      position: "absolute",
      top: 3,
      left,
      width: size,
      height: size,
      borderRadius: "50%",
      border: "2px solid var(--bg)",
      borderTopColor: "rgba(255,255,255,0.45)",
      boxSizing: "border-box"
    } });
  }
  return /* @__PURE__ */ jsx("span", { style: {
    position: "absolute",
    top: 3,
    left,
    width: size,
    height: size,
    borderRadius: "50%",
    background: "var(--bg)",
    boxShadow: "0 1px 4px rgba(0,0,0,0.22)",
    transition: "left 0.18s cubic-bezier(.4,0,.2,1)"
  } });
}
function Toggle({ enabled, loading, onToggle, label }) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: onToggle,
      disabled: loading,
      title: label,
      "aria-label": label,
      style: {
        flexShrink: 0,
        width: 40,
        height: 22,
        borderRadius: 11,
        border: "none",
        padding: 0,
        cursor: loading ? "wait" : "pointer",
        background: enabled ? "var(--accent)" : "var(--border)",
        position: "relative",
        transition: "background 0.18s",
        outline: "none",
        opacity: loading ? 0.65 : 1
      },
      children: /* @__PURE__ */ jsx(ToggleKnob, { enabled, loading, size: 16 })
    }
  );
}
function MiniToggle({ enabled, loading, onToggle, label }) {
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      onClick: onToggle,
      disabled: loading,
      title: label,
      "aria-label": label,
      style: {
        flexShrink: 0,
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        padding: 0,
        cursor: loading ? "wait" : "pointer",
        background: enabled ? "var(--accent)" : "var(--border)",
        position: "relative",
        transition: "background 0.18s",
        outline: "none",
        opacity: loading ? 0.65 : 1
      },
      children: /* @__PURE__ */ jsx(ToggleKnob, { enabled, loading, size: 14 })
    }
  );
}
function PublisherCell({ publisher }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  if (!publisher) return null;
  const name = publisher.name && publisher.name.trim() || t("ext.publisherUnknown");
  const url = publisher.url || null;
  const trusted = publisherTrusted(publisher);
  const busy = state.busyKey === "trust:" + name || state.busyKey === "untrust:" + name;
  const keyName = publisher.name && publisher.name.trim() || publisher.fingerprint || "";
  const linkStyle = { color: "var(--accent)", textDecoration: "none", fontSize: 12, fontWeight: 600 };
  const actionBtnStyle = { ...btnStyle, padding: "3px 10px", fontSize: 11 };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }, children: [
      url ? /* @__PURE__ */ jsxs(
        "a",
        {
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
          title: url,
          style: { ...linkStyle, display: "inline-flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", minWidth: 0, maxWidth: "100%" },
          children: [
            /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis" }, children: name }),
            /* @__PURE__ */ jsxs("svg", { width: 10, height: 10, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, style: { flexShrink: 0 }, children: [
              /* @__PURE__ */ jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
              /* @__PURE__ */ jsx("polyline", { points: "15 3 21 3 21 9" }),
              /* @__PURE__ */ jsx("line", { x1: 10, y1: 14, x2: 21, y2: 3 })
            ] })
          ]
        }
      ) : /* @__PURE__ */ jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)" }, children: name }),
      /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-muted)", "var(--bg-hover)"), children: publisherSourceLabel(publisher.source) }),
      trusted ? /* @__PURE__ */ jsxs("span", { style: chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), children: [
        "✓ ",
        t("ext.trusted")
      ] }) : /* @__PURE__ */ jsxs("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: [
        "⚠ ",
        t("ext.notTrusted")
      ] }),
      trusted ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: busy,
          onClick: () => void runOp("untrust", { name: keyName }),
          style: actionBtnStyle,
          children: busy ? "…" : t("ext.untrustPublisher")
        }
      ) : keyName ? /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: busy,
          onClick: () => void runOp("trust", { name: publisher.name && publisher.name.trim() || "", fingerprint: keyName, url, source: publisher.source }),
          style: actionBtnStyle,
          children: busy ? "…" : t("ext.trustPublisher")
        }
      ) : null
    ] }),
    !publisher.name && publisher.fingerprint && /* @__PURE__ */ jsxs("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }, children: [
      t("ext.fingerprint"),
      ": ",
      publisher.fingerprint
    ] })
  ] });
}
function TrustDialog() {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const pt = state.pendingTrust;
  if (!pt) return null;
  const pub = pt.publisher || {};
  const name = pub.name && pub.name.trim() || t("ext.publisherUnknown");
  const url = pub.url || null;
  const busy = state.busyKey !== null;
  const confirm = () => {
    const p = state.pendingTrust;
    setState({ pendingTrust: null });
    if (p.kind === "zip") void runInstallZip(p.file, true);
    else void runOp("install", { source: p.source, docsUrl: p.docsUrl, trust: true, publisher: p.publisher, publisherHint: p.publisherHint });
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483645,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      },
      onClick: (e) => {
        if (e.target === e.currentTarget) setState({ pendingTrust: null });
      },
      children: /* @__PURE__ */ jsxs("div", { style: {
        width: 420,
        maxWidth: "100%",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }, onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 16, display: "inline-flex" }, children: /* @__PURE__ */ jsxs("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [
            /* @__PURE__ */ jsx("path", { d: "M18 8h1a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4H5a4 4 0 0 1-4-4v-8a4 4 0 0 1 4-4h1" }),
            /* @__PURE__ */ jsx("path", { d: "M7 8V6a5 5 0 0 1 10 0v2" }),
            /* @__PURE__ */ jsx("path", { d: "M12 13v4" })
          ] }) }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" }, children: t("ext.trustDialogTitle") })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.publisher") }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            url ? /* @__PURE__ */ jsxs("a", { href: url, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontSize: 13, fontWeight: 600 }, children: [
              name,
              " ↗"
            ] }) : /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" }, children: name }),
            /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-muted)", "var(--bg-hover)"), children: publisherSourceLabel(pub.source) })
          ] }),
          !pub.name && pub.fingerprint && /* @__PURE__ */ jsxs("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }, children: [
            t("ext.fingerprint"),
            ": ",
            pub.fingerprint
          ] }),
          pt.zipName && /* @__PURE__ */ jsxs("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }, children: [
            "zip: ",
            pt.zipName
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }, children: t("ext.trustDialogBody") }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setState({ pendingTrust: null }), disabled: busy, style: btnStyle, children: t("ext.cancel") }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: confirm,
              disabled: busy,
              style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", fontWeight: 600 },
              children: busy ? "…" : t("ext.trustAndInstall")
            }
          )
        ] })
      ] })
    }
  );
}
function DependentsDialog() {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const pd = state.pendingDependents;
  if (!pd) return null;
  const busy = state.busyKey !== null;
  const isRemove = pd.action === "remove";
  const confirm = () => {
    const p = state.pendingDependents;
    setState({ pendingDependents: null });
    if (p) void execOp(p.action, { id: p.id });
  };
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        zIndex: 2147483645,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16
      },
      onClick: (e) => {
        if (e.target === e.currentTarget) setState({ pendingDependents: null });
      },
      children: /* @__PURE__ */ jsxs("div", { style: {
        width: 420,
        maxWidth: "100%",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        gap: 14
      }, onClick: (e) => e.stopPropagation(), children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 16, color: "rgba(217,119,6,0.9)", display: "inline-flex" }, children: /* @__PURE__ */ jsxs("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [
            /* @__PURE__ */ jsx("path", { d: "m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" }),
            /* @__PURE__ */ jsx("path", { d: "M12 9v4" }),
            /* @__PURE__ */ jsx("path", { d: "M12 17h.01" })
          ] }) }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" }, children: t("ext.dependentsTitle") })
        ] }),
        pd.clientDeps.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }, children: t(isRemove ? "ext.dependentsBodyRemove" : "ext.dependentsBodyDisable", { id: pd.id }) }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: pd.clientDeps.map((d) => /* @__PURE__ */ jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text)" }, children: d }, d)) })
        ] }),
        pd.hardDeps.length > 0 && /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }, children: t(isRemove ? "ext.dependentsHardRemove" : "ext.dependentsHardDisable", { id: pd.id }) }),
          /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: pd.hardDeps.map((d) => /* @__PURE__ */ jsxs("div", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text)" }, children: [
            d.id,
            d.via ? /* @__PURE__ */ jsxs("span", { style: { color: "var(--text-dim)" }, children: [
              " · ",
              d.via
            ] }) : null
          ] }, d.id)) })
        ] }),
        pd.hardDeps.length > 0 ? /* @__PURE__ */ jsx("div", { style: {
          fontSize: 12,
          color: "var(--text)",
          background: "rgba(217,119,6,0.12)",
          border: "1px solid rgba(217,119,6,0.4)",
          borderRadius: 8,
          padding: "8px 12px",
          lineHeight: 1.6
        }, children: t("ext.dependentsHardBlocked") }) : null,
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 2 }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setState({ pendingDependents: null }), disabled: busy, style: btnStyle, children: t("ext.cancel") }),
          pd.hardDeps.length === 0 && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: confirm,
              disabled: busy,
              style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", fontWeight: 600 },
              children: busy ? "…" : t(isRemove ? "ext.dependentsConfirmRemove" : "ext.dependentsConfirmDisable")
            }
          )
        ] })
      ] })
    }
  );
}
function CapList({ q }) {
  const caps = state.status && state.status.capabilities || {};
  const needle = q.trim().toLowerCase();
  const names = Object.keys(caps).filter((n) => !needle || n.toLowerCase().includes(needle)).sort();
  if (names.length === 0) {
    return /* @__PURE__ */ jsx("div", { style: { padding: "10px 8px", fontSize: 12, color: "var(--text-dim)" }, children: t("ext.cap.none") });
  }
  return /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: names.map((name) => {
    const c2 = caps[name];
    const missing = !c2.providers || c2.providers.length === 0;
    const isSel = state.selCap === name;
    return /* @__PURE__ */ jsxs(
      "div",
      {
        onClick: () => setState({ selCap: name }),
        style: { display: "flex", alignItems: "center", gap: 7, padding: "8px 8px", borderRadius: 5, cursor: "pointer", background: isSel ? "var(--bg-selected)" : "none" },
        onMouseEnter: (ev) => {
          if (!isSel) ev.currentTarget.style.background = "var(--bg-hover)";
        },
        onMouseLeave: (ev) => {
          if (!isSel) ev.currentTarget.style.background = "none";
        },
        children: [
          /* @__PURE__ */ jsx(
            "span",
            {
              title: missing ? t("ext.depMissing") : t("ext.cap.effective") + ": " + (c2.effective || "—"),
              style: { flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: missing ? "var(--danger, #ef4444)" : "var(--accent)" }
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
            /* @__PURE__ */ jsx("div", { title: name, style: { fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: isSel ? 600 : 500, color: missing ? "var(--text-dim)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: name }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }, children: missing ? "✗ " + t("ext.depMissing") : (c2.effective || "") + (c2.consumers && c2.consumers.length > 0 ? " · " + c2.consumers.length + " consumer" + (c2.consumers.length > 1 ? "s" : "") : "") })
          ] }),
          c2.pinnedTo && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: "pin" })
        ]
      },
      name
    );
  }) });
}
function CapDetail({ name }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const c2 = state.status && state.status.capabilities && state.status.capabilities[name];
  if (!c2) return /* @__PURE__ */ jsx("div", { style: { color: "var(--text-dim)", fontSize: 13 }, children: "…" });
  const missing = !c2.providers || c2.providers.length === 0;
  const busy = state.busyKey !== null;
  const jumpTo = (extId) => setState({ view: "exts", selected: { kind: "local", id: extId }, selCap: null, selConflict: null, mobileView: state.isMobile ? "detail" : state.mobileView });
  const sorted = [...c2.providers || []].sort((a, b) => (b.id === c2.effective ? 1 : 0) - (a.id === c2.effective ? 1 : 0) || a.id.localeCompare(b.id));
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)", overflowWrap: "anywhere" }, children: name }),
      missing ? /* @__PURE__ */ jsxs("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)"), children: [
        "✗ ",
        t("ext.depMissing")
      ] }) : /* @__PURE__ */ jsxs("span", { style: chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), children: [
        "✓ ",
        t("ext.cap.effective"),
        ": ",
        c2.effective
      ] }),
      c2.pinnedTo && /* @__PURE__ */ jsxs("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: [
        t("ext.depViaPin"),
        ": ",
        c2.pinnedTo
      ] })
    ] }),
    !missing && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" }, children: [
          t("ext.cap.providers"),
          " (",
          c2.providers.length,
          ")"
        ] }),
        /* @__PURE__ */ jsxs("label", { style: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-dim)", marginLeft: "auto", flexWrap: "wrap" }, children: [
          t("ext.cap.pick"),
          /* @__PURE__ */ jsxs(
            "select",
            {
              value: c2.pinnedTo || "",
              disabled: busy,
              onChange: (e) => void runOp("set-pin", { scope: "capability", key: name, value: e.target.value || null }),
              style: { fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none" },
              children: [
                /* @__PURE__ */ jsx("option", { value: "", children: t("ext.pin.auto") }),
                (c2.providers || []).map((p) => /* @__PURE__ */ jsxs("option", { value: p.id, children: [
                  extDisplayName(p.id, p.id),
                  p.version ? " v" + p.version : "",
                  p.takeover ? " · takeover" : ""
                ] }, p.id))
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: sorted.map((p) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 6, border: "1px solid var(--border)", background: p.id === c2.effective ? "var(--bg-selected)" : "var(--bg-panel)", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            role: "button",
            tabIndex: 0,
            onClick: () => jumpTo(p.id),
            style: { fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: p.id === c2.effective ? 600 : 400, color: "var(--text)", cursor: "pointer", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
            children: extDisplayName(p.id, p.id)
          }
        ),
        p.version && /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }, children: [
          "v",
          p.version
        ] }),
        /* @__PURE__ */ jsx(SourceTag, { source: p.source }),
        p.takeover && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: "takeover" }),
        p.id === c2.effective && /* @__PURE__ */ jsxs("span", { style: { marginLeft: "auto", flexShrink: 0, ...chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)") }, children: [
          "✓ ",
          t("ext.cap.effective")
        ] })
      ] }, p.id)) })
    ] }),
    c2.consumers && c2.consumers.length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" }, children: t("ext.cap.consumers") }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: c2.consumers.map((cons) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(
          "span",
          {
            role: "button",
            tabIndex: 0,
            onClick: () => jumpTo(cons.extId),
            style: { ...chipStyle("var(--text-muted)", "var(--bg-hover)"), fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer", whiteSpace: "normal" },
            children: cons.extId
          }
        ),
        /* @__PURE__ */ jsx("span", { style: cons.hard ? chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)") : chipStyle("var(--text-dim)", "var(--bg-hover)"), children: cons.hard ? "hard" : "·optional" })
      ] }, cons.extId)) })
    ] }),
    missing && /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }, children: [
      t("ext.depMissing"),
      ": ",
      t("ext.cap.providers"),
      " = 0"
    ] })
  ] });
}
function ConflictList({ q }) {
  const st = state.status;
  const multi = st && st.multiSource || {};
  const caps = st && st.capabilities || {};
  const takeovers = Object.keys(caps).filter((n) => {
    const ps = caps[n].providers || [];
    const takers = ps.filter((p) => p.takeover);
    return takers.length > 1 || takers.length === 1 && ps.length > 1;
  }).sort();
  const needle = q.trim().toLowerCase();
  const multiIds = Object.keys(multi).filter((id) => !needle || id.toLowerCase().includes(needle)).sort();
  const tks = takeovers.filter((n) => !needle || n.toLowerCase().includes(needle));
  if (multiIds.length === 0 && tks.length === 0) {
    return /* @__PURE__ */ jsx("div", { style: { padding: "10px 8px", fontSize: 12, color: "var(--text-dim)" }, children: t("ext.conflict.none") });
  }
  const rowStyle = (key) => ({
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "8px 8px",
    borderRadius: 5,
    cursor: "pointer",
    background: state.selConflict === key ? "var(--bg-selected)" : "none"
  });
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
    multiIds.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "4px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase" }, children: t("ext.conflict.multiSource") }),
    multiIds.map((id) => {
      const g = multi[id];
      const winner = (g.candidates || []).find((c2) => c2.winner);
      return /* @__PURE__ */ jsx(
        "div",
        {
          onClick: () => setState({ selConflict: "multi:" + id }),
          style: rowStyle("multi:" + id),
          onMouseEnter: (ev) => {
            if (state.selConflict !== "multi:" + id) ev.currentTarget.style.background = "var(--bg-hover)";
          },
          onMouseLeave: (ev) => {
            if (state.selConflict !== "multi:" + id) ev.currentTarget.style.background = "none";
          },
          children: /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
            /* @__PURE__ */ jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: state.selConflict === "multi:" + id ? 600 : 500, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: id }),
            /* @__PURE__ */ jsxs("div", { style: { fontSize: 10, color: "var(--text-dim)", marginTop: 1 }, children: [
              (g.candidates || []).length,
              " sources",
              winner ? " · " + (SOURCE_LABELS[winner.source] || winner.source) + (winner.version ? " v" + winner.version : "") : ""
            ] })
          ] })
        },
        "m:" + id
      );
    }),
    tks.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "8px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", borderTop: multiIds.length > 0 ? "1px solid var(--border)" : "none", marginTop: multiIds.length > 0 ? 6 : 0 }, children: t("ext.conflict.takeover") }),
    tks.map((n) => {
      const c2 = caps[n];
      const conflict = (c2.providers || []).filter((p) => p.takeover).length > 1;
      return /* @__PURE__ */ jsxs(
        "div",
        {
          onClick: () => setState({ selConflict: "takeover:" + n }),
          style: rowStyle("takeover:" + n),
          onMouseEnter: (ev) => {
            if (state.selConflict !== "takeover:" + n) ev.currentTarget.style.background = "var(--bg-hover)";
          },
          onMouseLeave: (ev) => {
            if (state.selConflict !== "takeover:" + n) ev.currentTarget.style.background = "none";
          },
          children: [
            /* @__PURE__ */ jsx("span", { title: conflict ? "conflict" : "superseded", style: { flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: conflict ? "#d97706" : "var(--text-dim)" } }),
            /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
              /* @__PURE__ */ jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: n }),
              /* @__PURE__ */ jsxs("div", { style: { fontSize: 10, color: "var(--text-dim)", marginTop: 1 }, children: [
                t("ext.cap.effective"),
                ": ",
                c2.effective || "—"
              ] })
            ] })
          ]
        },
        "t:" + n
      );
    })
  ] });
}
function ConflictDetail() {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const st = state.status;
  const sel = state.selConflict;
  if (!st || !sel) return /* @__PURE__ */ jsx("div", { style: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }, children: t("ext.select") });
  if (sel.startsWith("takeover:")) return /* @__PURE__ */ jsx(CapDetail, { name: sel.slice(9) });
  const id = sel.slice(6);
  const group = st.multiSource && st.multiSource[id];
  if (!group) return /* @__PURE__ */ jsx("div", { style: { color: "var(--text-dim)", fontSize: 13 }, children: "…" });
  const busy = state.busyKey !== null;
  const devOn = !!(st.pins && st.pins.devPriority === true);
  const pinned = st.pins && st.pins.pins ? st.pins.pins["source:" + id] : null;
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 720 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }, children: id }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: [
        t("ext.conflict.multiSource"),
        " · ",
        (group.candidates || []).length
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-panel)" }, children: [
      /* @__PURE__ */ jsx(Toggle, { enabled: devOn, loading: busy, onToggle: () => void runOp("set-dev-priority", { value: !devOn }), label: t("ext.devPriorityHint") }),
      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0 }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)" }, children: t("ext.devPriority") }),
        /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.devPriorityHint") })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" }, children: t("ext.conflict.pick") }),
        /* @__PURE__ */ jsxs(
          "select",
          {
            value: pinned || "",
            disabled: busy,
            onChange: (e) => void runOp("set-pin", { scope: "source", key: id, value: e.target.value || null }),
            style: { fontSize: 11, padding: "3px 6px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", outline: "none", maxWidth: "100%" },
            children: [
              /* @__PURE__ */ jsxs("option", { value: "", children: [
                t("ext.pin.auto"),
                "（pin > dev > version > root）"
              ] }),
              (group.candidates || []).map((c2) => /* @__PURE__ */ jsxs("option", { value: c2.dir, children: [
                SOURCE_LABELS[c2.source] || c2.source,
                c2.version ? " v" + c2.version : "",
                " · ",
                shortenPath(c2.dir)
              ] }, c2.dir))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [...group.candidates || []].sort((a, b) => (b.winner ? 1 : 0) - (a.winner ? 1 : 0)).map((c2) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 7, padding: "6px 9px", borderRadius: 6, border: "1px solid var(--border)", background: c2.winner ? "var(--bg-selected)" : "var(--bg-panel)", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(SourceTag, { source: c2.source }),
        c2.version && /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }, children: [
          "v",
          c2.version
        ] }),
        /* @__PURE__ */ jsx("span", { title: c2.dir, style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }, children: shortenPath(c2.dir) }),
        c2.winner ? /* @__PURE__ */ jsxs("span", { style: chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), children: [
          "✓ ",
          t("ext.conflict.winner")
        ] }) : /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-dim)", "var(--bg-hover)"), children: t("ext.conflict.shadowed") })
      ] }, c2.dir)) })
    ] })
  ] });
}
function summaryOf(status) {
  return t("ext.summary", {
    total: Object.keys(status.extensions || {}).length,
    on: Object.values(status.extensions || {}).filter((e) => e.enabled !== false).length,
    off: Object.values(status.extensions || {}).filter((e) => e.enabled === false).length
  });
}
const IconClose = () => /* @__PURE__ */ jsxs("svg", { width: 11, height: 11, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, children: [
  /* @__PURE__ */ jsx("path", { d: "M18 6 6 18" }),
  /* @__PURE__ */ jsx("path", { d: "m6 6 12 12" })
] });
const IconPlus = () => /* @__PURE__ */ jsxs("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: [
  /* @__PURE__ */ jsx("line", { x1: 12, y1: 5, x2: 12, y2: 19 }),
  /* @__PURE__ */ jsx("line", { x1: 5, y1: 12, x2: 19, y2: 12 })
] });
function ExtManPanel(props) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const open = useGate(EXTMAN_KEY, "float");
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setState({ open: false });
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open]);
  useEffect(() => {
    if (!open && state.pendingDependents) setState({ pendingDependents: null });
  }, [open]);
  useEffect(() => {
    if (document.getElementById("extman-spin-style")) return;
    const el = document.createElement("style");
    el.id = "extman-spin-style";
    el.textContent = "@keyframes extman-rotate{to{transform:rotate(360deg)}}.extman-spin{animation:extman-rotate .8s linear infinite}";
    document.head.appendChild(el);
  }, []);
  setCurrentSession(props ? props.currentSession : null);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        position: "fixed",
        inset: 0,
        // z 默认抬到 AI 调试窗（2147483642）之上：本弹窗是 aiti 家族 UI，必须随时可关——
        // 打开其他扩展弹窗后自动降到后面（zBack=true → 300，新弹窗置前）；头部「置于顶层」可恢复
        zIndex: state.zBack ? 300 : 2147483644,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center"
      },
      onClick: (e) => {
        if (e.target === e.currentTarget) setState({ open: false });
      },
      children: /* @__PURE__ */ jsx(
        "div",
        {
          "data-ext-float": "1",
          "data-ext-float-w": 900,
          "data-ext-float-h": 660,
          "data-ext-float-full": "1",
          "data-ext-float-key": EXTMAN_KEY,
          "data-ext-float-dock": "right-panel",
          style: {
            width: 900,
            maxWidth: "calc(100vw - 16px)",
            height: "78vh",
            maxHeight: "calc(100dvh - 16px)",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg)",
            border: "1px solid var(--border)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
            overflow: "hidden"
          },
          onClick: (e) => e.stopPropagation(),
          children: /* @__PURE__ */ jsx(ExtManContent, {})
        }
      )
    }
  );
}
function ExtManContent() {
  const status = state.status;
  const isMobile = state.isMobile;
  const q = state.q;
  const hasQuery = q.trim().length > 0;
  const localIds = sortedLocalIds(status).filter((id) => !hasQuery || localMatches(id, status.extensions[id], q.trim()));
  const regExts = state.registryData && state.registryData.extensions || [];
  const onlineHits = hasQuery ? regExts.filter((ext) => onlineMatches(ext, q.trim()) && !(status && status.extensions[ext.id])) : [];
  const registryById = {};
  for (const ext of regExts) registryById[ext.id] = ext;
  const busyAny = state.busyKey !== null;
  const updateCount = state.updates ? Object.keys(state.updates).filter((k) => state.updates && state.updates[k] && state.updates[k].hasUpdate).length : 0;
  const updatingAll = state.busyKey === "*" && !!state.applying;
  const rootChips = status ? [
    { label: "user", value: shortenPath(status.extensionsRoot) },
    ...status.extraExtensionsRoots && status.extraExtensionsRoots.length ? status.extraExtensionsRoots.map((p) => ({ label: "extra", value: shortenPath(p) })) : [],
    ...status.devExtensionsRoot ? [{ label: "dev", value: shortenPath(status.devExtensionsRoot) }] : [],
    { label: "bundled", value: shortenPath(status.bundledExtensionsRoot) },
    { label: "data", value: shortenPath(status.dataRoot) }
  ] : [];
  const installBusy = state.busyKey && state.busyKey.indexOf("install:") === 0;
  const sel = state.selected;
  const selLocal = sel && sel.kind === "local" && status && status.extensions[sel.id];
  const selOnline = sel && sel.kind === "online" && registryById[sel.id];
  const listRef = useRef(null);
  useEffect(() => {
    const s = state.selected;
    if (!s || s.kind !== "local") return;
    const raf = requestAnimationFrame(() => {
      const el = listRef.current?.querySelector('[data-ext-row="l:' + s.id + '"]');
      if (el) el.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(raf);
  }, [state.selected, status]);
  const navIds = localIds;
  const navIndex = sel && sel.kind === "local" && selLocal ? navIds.indexOf(sel.id) : -1;
  function rowSelected(kind, id) {
    return sel && sel.kind === kind && sel.id === id;
  }
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    isMobile ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8, padding: "10px 12px 10px 14px", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 8, minWidth: 0, flex: 1 }, children: [
          /* @__PURE__ */ jsxs("span", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 6 }, children: [
            extIconSpan({ id: SELF_ID }, 14),
            t("ext.title")
          ] }),
          status && /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: summaryOf(status) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0 }, children: [
          state.zBack && /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setState({ zBack: false }),
              title: t("ext.raiseToTop"),
              style: { ...btnStyle, padding: "5px 9px", fontSize: 12, lineHeight: 1 },
              children: "⤒"
            }
          ),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setState({ open: false }),
              title: t("ext.close"),
              "aria-label": t("ext.close"),
              style: { ...btnStyle, padding: "5px 9px", fontSize: 13, lineHeight: 1 },
              children: /* @__PURE__ */ jsx(IconClose, {})
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            disabled: busyAny,
            onClick: () => {
              setState({ selected: { kind: "add", id: "" }, q: "", error: null, message: null, mobileView: isMobile ? "detail" : state.mobileView });
              void loadRegistry();
              void refreshTrusted();
            },
            title: t("ext.add"),
            style: { ...btnStyle, flex: 1, background: "var(--accent)", color: "white", borderColor: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", gap: 5 },
            children: [
              /* @__PURE__ */ jsx(IconPlus, {}),
              t("ext.add")
            ]
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: busyAny, onClick: () => void runOp("reload", {}), style: { ...btnStyle, flex: 1 }, children: state.busyKey === "reload:" ? "…" : t("ext.reload") }),
        updateCount > 0 && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: busyAny,
            title: t("ext.updateAllHint"),
            onClick: async () => {
              if (await uiConfirm({ message: t("ext.updateAllConfirm", { count: String(updateCount) }) })) void updateAll();
            },
            style: { ...btnStyle, flex: 1, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
            children: updatingAll ? "…" : t("ext.updateAll", { count: String(updateCount) })
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: busyAny, onClick: () => {
          void refreshStatus();
          void loadUpdates(true);
        }, style: { ...btnStyle, flex: 1 }, children: t("ext.refresh") })
      ] })
    ] }) : /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 18px", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }, children: [
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 15, fontWeight: 700, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 6 }, children: [
          extIconSpan({ id: SELF_ID }, 15),
          t("ext.title")
        ] }),
        status && /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: summaryOf(status) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexShrink: 0 }, children: [
        state.zBack && /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setState({ zBack: false }), title: t("ext.raiseToTop"), style: btnStyle, children: t("ext.raiseToTop") }),
        /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            disabled: busyAny,
            onClick: () => {
              setState({ selected: { kind: "add", id: "" }, q: "", error: null, message: null, mobileView: isMobile ? "detail" : state.mobileView });
              void loadRegistry();
              void refreshTrusted();
            },
            title: t("ext.add"),
            style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", display: "flex", alignItems: "center", gap: 5 },
            children: [
              /* @__PURE__ */ jsx(IconPlus, {}),
              t("ext.add")
            ]
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: busyAny, onClick: () => void runOp("reload", {}), style: btnStyle, children: state.busyKey === "reload:" ? "…" : t("ext.reload") }),
        updateCount > 0 && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: busyAny,
            title: t("ext.updateAllHint"),
            onClick: async () => {
              if (await uiConfirm({ message: t("ext.updateAllConfirm", { count: String(updateCount) }) })) void updateAll();
            },
            style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
            children: updatingAll ? "…" : t("ext.updateAll", { count: String(updateCount) })
          }
        ),
        /* @__PURE__ */ jsx("button", { type: "button", disabled: busyAny, onClick: () => {
          void refreshStatus();
          void loadUpdates(true);
        }, style: btnStyle, children: t("ext.refresh") }),
        /* @__PURE__ */ jsx("button", { type: "button", onClick: () => setState({ open: false }), title: t("ext.close"), "aria-label": t("ext.close"), style: btnStyle, children: /* @__PURE__ */ jsx(IconClose, {}) })
      ] })
    ] }),
    state.error && /* @__PURE__ */ jsx("div", { style: { padding: "8px 18px", fontSize: 12, color: "var(--danger, #ef4444)", background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)", borderBottom: "1px solid var(--border)" }, children: state.error }),
    state.applying && /* @__PURE__ */ jsxs("div", { style: { padding: "8px 18px", fontSize: 12, color: "var(--accent)", background: "rgba(99,102,241,0.07)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsx("span", { className: "extman-spin", style: { width: 12, height: 12, borderRadius: "50%", border: "2px solid var(--accent)", borderTopColor: "transparent", display: "inline-block", boxSizing: "border-box", flexShrink: 0 } }),
      state.applying
    ] }),
    state.message && /* @__PURE__ */ jsx("div", { style: { padding: "8px 18px", fontSize: 12, color: "#16a34a", background: "rgba(22,163,74,0.06)", borderBottom: "1px solid var(--border)" }, children: state.message }),
    state.openHint && /* @__PURE__ */ jsx("div", { style: { padding: "8px 18px", fontSize: 12, color: "#d97706", background: "rgba(217,119,6,0.08)", borderBottom: "1px solid var(--border)" }, children: state.openHint.text }),
    state.virtualClick && /* @__PURE__ */ jsx(VirtualClick, { vc: state.virtualClick }, state.virtualClick.key),
    /* @__PURE__ */ jsxs("div", { style: { flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", overflow: "hidden" }, children: [
      /* @__PURE__ */ jsxs("div", { style: {
        display: isMobile && state.mobileView === "detail" ? "none" : "flex",
        width: isMobile ? "100%" : 290,
        flex: isMobile ? state.listCollapsed ? 0 : 1 : void 0,
        minHeight: isMobile ? 0 : void 0,
        borderRight: isMobile ? "none" : "1px solid var(--border)",
        borderBottom: "none",
        flexDirection: "column",
        flexShrink: 0,
        background: "var(--bg-panel)"
      }, children: [
        isMobile && /* @__PURE__ */ jsxs(
          "button",
          {
            type: "button",
            onClick: () => setState({ listCollapsed: !state.listCollapsed }),
            title: state.listCollapsed ? t("ext.expandList") : t("ext.collapseList"),
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              width: "100%",
              padding: "8px 12px",
              border: "none",
              background: "var(--bg-panel)",
              cursor: "pointer",
              flexShrink: 0,
              color: "var(--text-muted)"
            },
            children: [
              /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, fontWeight: 600 }, children: [
                extIconSpan({ id: SELF_ID }, 13),
                t("ext.list"),
                " (",
                status ? Object.keys(status.extensions).length : 0,
                ")"
              ] }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 11 }, children: state.listCollapsed ? "▾ " + t("ext.expand") : "▴ " + t("ext.collapse") })
            ]
          }
        ),
        (!isMobile || !state.listCollapsed) && [
          /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 4, padding: "8px 8px 0", flexShrink: 0 }, children: [["exts", t("ext.view.exts")], ["caps", t("ext.view.caps")], ["conflicts", t("ext.view.conflicts")]].map(([v, label]) => /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              onClick: () => setState({ view: v, selCap: null, selConflict: null }),
              style: {
                flex: 1,
                padding: "4px 6px",
                fontSize: 11,
                fontWeight: state.view === v ? 600 : 400,
                borderRadius: 6,
                cursor: "pointer",
                outline: "none",
                border: "1px solid " + (state.view === v ? "var(--accent)" : "var(--border)"),
                background: state.view === v ? "rgba(99,102,241,0.10)" : "var(--bg)",
                color: state.view === v ? "var(--accent)" : "var(--text-muted)"
              },
              children: label
            },
            v
          )) }, "viewtabs"),
          /* @__PURE__ */ jsx("div", { style: { padding: "8px 8px 6px", borderBottom: "1px solid var(--border)", flexShrink: 0 }, children: /* @__PURE__ */ jsxs("div", { style: { position: "relative", width: "100%" }, children: [
            /* @__PURE__ */ jsx("span", { style: {
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              color: "var(--text-dim)",
              display: "flex",
              alignItems: "center"
            }, children: /* @__PURE__ */ jsxs("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("circle", { cx: 11, cy: 11, r: 8 }),
              /* @__PURE__ */ jsx("line", { x1: 21, y1: 21, x2: 16.65, y2: 16.65 })
            ] }) }),
            /* @__PURE__ */ jsx(
              "input",
              {
                value: q,
                onChange: (e) => {
                  setState({ q: e.target.value });
                  if (e.target.value.trim()) void loadRegistry();
                },
                placeholder: t("ext.searchHint"),
                style: {
                  width: "100%",
                  height: 28,
                  padding: q ? "0 26px 0 26px" : "0 10px 0 26px",
                  border: "1px solid var(--border)",
                  borderRadius: 6,
                  background: "var(--bg)",
                  color: "var(--text)",
                  fontSize: 12,
                  outline: "none",
                  boxSizing: "border-box"
                }
              }
            ),
            q && /* @__PURE__ */ jsx(
              "button",
              {
                onClick: () => setState({ q: "" }),
                title: t("ext.clearSearch"),
                style: {
                  position: "absolute",
                  right: 4,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "var(--text-dim)",
                  cursor: "pointer",
                  fontSize: 13,
                  lineHeight: 1,
                  padding: "2px 4px",
                  display: "flex",
                  alignItems: "center"
                },
                children: "×"
              }
            )
          ] }) }, "search"),
          /* @__PURE__ */ jsx("div", { ref: listRef, style: { flex: 1, overflowY: "auto", padding: "8px 6px" }, children: state.view === "caps" ? /* @__PURE__ */ jsx(CapList, { q }) : state.view === "conflicts" ? /* @__PURE__ */ jsx(ConflictList, { q }) : !status ? /* @__PURE__ */ jsx("div", { style: { padding: "10px 8px", fontSize: 12, color: "var(--text-muted)" }, children: "…" }) : [
            /* ① 来源快捷安装 */
            hasQuery && looksLikeSource(q) && /* @__PURE__ */ jsxs(
              "div",
              {
                onClick: () => setState({ selected: { kind: "source", id: q.trim() }, error: null, message: null, mobileView: isMobile ? "detail" : state.mobileView }),
                style: {
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "8px 8px",
                  marginBottom: 6,
                  borderRadius: 5,
                  cursor: "pointer",
                  border: "1px dashed var(--border)",
                  background: rowSelected("source", q.trim()) ? "var(--bg-selected)" : "none"
                },
                children: [
                  /* @__PURE__ */ jsx("span", { style: { fontSize: 11, flexShrink: 0 }, children: "⬇" }),
                  /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
                    /* @__PURE__ */ jsx("div", { style: { fontSize: 11, fontWeight: 600, color: "var(--text)" }, children: t("ext.installFromSource") }),
                    /* @__PURE__ */ jsx("div", { style: { fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: q.trim() })
                  ] }),
                  /* @__PURE__ */ jsx(
                    "button",
                    {
                      type: "button",
                      disabled: !!installBusy,
                      onClick: (e) => {
                        e.stopPropagation();
                        void runOp("install", { source: q.trim() });
                      },
                      style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", flexShrink: 0 },
                      children: installBusy ? "…" : t("ext.install")
                    }
                  )
                ]
              },
              "src-row"
            ),
            /* ② 本地 */
            ...localIds.map((id, i) => {
              const e = status.extensions[id];
              const isSel = rowSelected("local", id);
              const reg = registryById[id];
              const upd = state.updates && state.updates[id];
              const regUpd = !upd && !state.updatesPartial && reg && reg.version && e.version && semverGt(reg.version, e.version);
              const updatable = upd ? upd.hasUpdate : !!regUpd;
              const upVer = upd ? upd.latest : reg && reg.version || "";
              const upSource = upd ? updateSourceLabel(upd.source) : "site";
              const protoChip = protocolChipSpec(e.protocol);
              const showDivider = !hasQuery && e.enabled === false && (i === 0 || status.extensions[localIds[i - 1]].enabled !== false);
              const hovered = state.hoverLocal === id;
              const rowBusy = state.busyKey === "enable:" + id || state.busyKey === "disable:" + id;
              return /* @__PURE__ */ jsxs("div", { children: [
                showDivider && /* @__PURE__ */ jsx("div", { style: { padding: "8px 8px 3px", fontSize: 10, fontWeight: 700, color: "var(--danger, #ef4444)", textTransform: "uppercase", borderTop: "1px solid var(--border)", marginTop: 6 }, children: t("ext.disabled") }),
                /* @__PURE__ */ jsxs(
                  "div",
                  {
                    "data-ext-row": "l:" + id,
                    onClick: () => setState({ selected: { kind: "local", id }, error: null, message: null, mobileView: isMobile ? "detail" : state.mobileView }),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 10px",
                      borderRadius: 5,
                      cursor: "pointer",
                      background: isSel ? "var(--bg-selected)" : hovered ? "var(--bg-hover)" : "none",
                      boxShadow: e.enabled === false ? "inset 2px 0 0 color-mix(in srgb, var(--danger, #ef4444) 55%, transparent)" : void 0
                    },
                    onMouseEnter: () => {
                      if (state.hoverLocal !== id) setState({ hoverLocal: id });
                    },
                    onMouseLeave: () => {
                      if (state.hoverLocal === id) setState({ hoverLocal: null });
                    },
                    children: [
                      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
                        /* @__PURE__ */ jsxs("div", { title: id, style: {
                          fontSize: 12,
                          fontWeight: isSel ? 600 : 500,
                          color: e.enabled === false ? "var(--text-dim)" : "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          minWidth: 0
                        }, children: [
                          /* @__PURE__ */ jsx("span", { title: statusDotTitle(e), style: { flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: statusDotColor(e) } }),
                          extIconSpan(e, 12, id),
                          /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }, children: extDisplayName(id, e.name) + (e.version ? " · v" + e.version : "") }),
                          protoChip && /* @__PURE__ */ jsxs("span", { title: e.protocol?.detail || "", style: chipStyle(protoChip.color, protoChip.bg), children: [
                            protoChip.icon,
                            " ",
                            protoChip.label
                          ] }, "proto"),
                          e.enabled === false && /* @__PURE__ */ jsx("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 14%, transparent)"), children: t("ext.disabled") }, "off-chip")
                        ] }),
                        /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }, children: e.error ? "⚠ " + String(e.error).slice(0, 60) : extDisplayName(id, e.name) !== id ? /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: id }) : null })
                      ] }),
                      hovered && id !== SELF_ID ? /* @__PURE__ */ jsx(
                        MiniToggle,
                        {
                          enabled: e.enabled !== false,
                          loading: rowBusy,
                          onToggle: (ev) => {
                            ev.stopPropagation();
                            void runOp(e.enabled === false ? "enable" : "disable", { id });
                          },
                          label: (e.enabled === false ? t("ext.enable") : t("ext.disable")) + " " + id
                        }
                      ) : [
                        hasQuery && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(99,102,241,0.9)", "rgba(99,102,241,0.12)"), children: t("ext.installed") }, "inst"),
                        updatable && /* @__PURE__ */ jsxs("span", { title: upd ? updateTooltip(upd) : "", style: chipStyle(UPDATE_WARN.color, UPDATE_WARN.bg), children: [
                          "↑",
                          upVer,
                          upSource ? " " + upSource : ""
                        ] }, "up"),
                        !hasQuery && /* @__PURE__ */ jsx(SourceTag, { source: e.source }, "src")
                      ]
                    ]
                  }
                )
              ] }, "l:" + id);
            }),
            /* ③ 在线（搜索命中且未安装） */
            hasQuery && (state.registryError && !state.registryData ? /* @__PURE__ */ jsxs("div", { style: { padding: "8px 8px", fontSize: 11, color: "#d97706" }, children: [
              t("ext.registryFailed"),
              ": ",
              state.registryError
            ] }, "reg-err") : !state.registryData ? /* @__PURE__ */ jsx("div", { style: { padding: "8px 8px", fontSize: 11, color: "var(--text-muted)" }, children: "…" }, "reg-loading") : [
              onlineHits.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "10px 8px 3px", fontSize: 10, fontWeight: 600, color: "var(--text-dim)", textTransform: "uppercase", borderTop: "1px solid var(--border)", marginTop: 6 }, children: t("ext.onlineResults") }, "online-h"),
              ...onlineHits.map((ext) => {
                const isSel = rowSelected("online", ext.id);
                const src = registryInstallSource(ext);
                return /* @__PURE__ */ jsxs(
                  "div",
                  {
                    onClick: () => setState({ selected: { kind: "online", id: ext.id }, error: null, message: null, mobileView: isMobile ? "detail" : state.mobileView }),
                    style: {
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "9px 10px",
                      borderRadius: 5,
                      cursor: "pointer",
                      background: isSel ? "var(--bg-selected)" : "none"
                    },
                    onMouseEnter: (ev) => {
                      if (!isSel) ev.currentTarget.style.background = "var(--bg-hover)";
                    },
                    onMouseLeave: (ev) => {
                      if (!isSel) ev.currentTarget.style.background = "none";
                    },
                    children: [
                      /* @__PURE__ */ jsxs("div", { style: { minWidth: 0, flex: 1 }, children: [
                        /* @__PURE__ */ jsxs("div", { title: extDescriptionText(ext.id, ext) || ext.id, style: {
                          fontSize: 12,
                          fontWeight: isSel ? 600 : 500,
                          color: "var(--text)",
                          display: "flex",
                          alignItems: "center",
                          gap: 5,
                          minWidth: 0
                        }, children: [
                          /* @__PURE__ */ jsx("span", { title: t("ext.statusNotInstalled"), style: { flexShrink: 0, width: 7, height: 7, borderRadius: "50%", background: "var(--border)" } }),
                          extIconSpan(ext, 12),
                          /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, flex: 1 }, children: onlineName(ext) + (ext.version ? " · v" + ext.version : "") })
                        ] }),
                        /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }, children: [
                          onlineName(ext) !== ext.id ? /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: ext.id }, "pkg") : null,
                          (() => {
                            const desc = extDescriptionText(ext.id, ext);
                            return desc ? onlineName(ext) !== ext.id ? " · " + desc : desc : null;
                          })()
                        ] })
                      ] }),
                      src ? /* @__PURE__ */ jsx(
                        "button",
                        {
                          type: "button",
                          disabled: !!installBusy,
                          onClick: (e) => {
                            e.stopPropagation();
                            void runOp("install", { source: src, docsUrl: registryDocUrl(ext), publisherHint: ext.publisher || ext.author });
                          },
                          style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", flexShrink: 0 },
                          children: installBusy ? "…" : t("ext.install")
                        }
                      ) : /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }, children: t("ext.noSource") })
                    ]
                  },
                  "o:" + ext.id
                );
              })
            ])
          ] }, "results")
        ]
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: isMobile && state.mobileView === "list" ? "none" : "flex", flexDirection: "column", flex: 1, minHeight: 0, overflow: "hidden", padding: isMobile ? 12 : 20 }, children: [
        (isMobile ? state.mobileView === "detail" : navIndex >= 0) && /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexShrink: 0 }, children: [
          isMobile && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsxs(
              "button",
              {
                type: "button",
                onClick: () => setState({ mobileView: "list" }),
                style: { ...btnStyle, display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", fontSize: 12 },
                children: [
                  "← ",
                  t("ext.back")
                ]
              }
            ),
            sel && /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: selLocal ? extDisplayName(sel.id, selLocal.name) : selOnline ? extDisplayName(sel.id, selOnline.name) : sel.id })
          ] }),
          /* @__PURE__ */ jsx(ExtNav, { ids: navIds, index: navIndex })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, overflowY: "auto" }, children: !status ? null : state.view === "caps" ? state.selCap ? /* @__PURE__ */ jsx(CapDetail, { name: state.selCap }) : /* @__PURE__ */ jsx("div", { style: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }, children: t("ext.select") }) : state.view === "conflicts" ? /* @__PURE__ */ jsx(ConflictDetail, {}) : sel && sel.kind === "add" ? /* @__PURE__ */ jsx(AddPane, {}) : sel && sel.kind === "source" ? /* @__PURE__ */ jsx(SourceDetail, { source: sel.id }) : selLocal ? /* @__PURE__ */ jsx(LocalDetail, { id: sel.id, entry: selLocal }) : selOnline ? /* @__PURE__ */ jsx(OnlineDetail, { ext: registryById[sel.id] }) : /* @__PURE__ */ jsx("div", { style: { height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)", fontSize: 13 }, children: t("ext.select") }) })
      ] })
    ] }),
    status && /* @__PURE__ */ jsxs("div", { style: {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
      padding: "8px 18px",
      borderTop: "1px solid var(--border)",
      flexShrink: 0
    }, children: [
      /* @__PURE__ */ jsx(
        "div",
        {
          style: { minWidth: 0, flex: 1, fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)", lineHeight: 1.5, overflow: "hidden" },
          title: rootChips.map((c2) => c2.label + ": " + c2.value).join("\n"),
          children: /* @__PURE__ */ jsx("div", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: rootChips.map((c2, i) => /* @__PURE__ */ jsxs("span", { children: [
            i > 0 && /* @__PURE__ */ jsx("span", { style: { opacity: 0.45, margin: "0 7px" }, children: "·" }),
            /* @__PURE__ */ jsx("span", { style: {
              display: "inline-block",
              fontSize: 9,
              lineHeight: 1.7,
              padding: "0 6px",
              borderRadius: 8,
              fontWeight: 600,
              color: ROOT_CHIP_COLORS[c2.label]?.[0] || "var(--text-muted)",
              background: ROOT_CHIP_COLORS[c2.label]?.[1] || "rgba(127,127,127,0.14)"
            }, children: c2.label }),
            " " + c2.value
          ] }, c2.label + ":" + i)) })
        }
      ),
      /* @__PURE__ */ jsx(
        "a",
        {
          href: AITI_REGISTRY_PAGE,
          target: "_blank",
          rel: "noopener noreferrer",
          style: { fontSize: 11, color: "var(--accent)", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 },
          children: "aiti.pw/extensions"
        }
      )
    ] }),
    /* @__PURE__ */ jsx(TrustDialog, {}),
    /* @__PURE__ */ jsx(DependentsDialog, {})
  ] });
}
function InfoRow({ label, children }) {
  return [
    /* @__PURE__ */ jsx("div", { style: { color: "var(--text-dim)" }, children: label }, "l"),
    /* @__PURE__ */ jsx("div", { style: { color: "var(--text-muted)", minWidth: 0, overflowWrap: "anywhere" }, children }, "v")
  ];
}
function DepChip({ d, optional }) {
  const jump = (extId) => setState({ selected: { kind: "local", id: extId }, error: null, message: null, view: "exts", mobileView: state.isMobile ? "detail" : state.mobileView });
  const ok = d.status === "ok";
  const inactive = d.status === "inactive";
  const color = d.status === "missing" ? "var(--text-dim)" : inactive ? "rgba(217,119,6,0.9)" : "var(--text-muted)";
  const bg = d.status === "missing" ? "var(--bg-hover)" : inactive ? "rgba(217,119,6,0.12)" : "var(--bg-hover)";
  const label = d.kind === "ext" ? extDisplayName(d.target, d.target) + (d.target !== d.name ? " (" + d.name + ")" : "") : d.name + " → " + (d.target ? extDisplayName(d.target, d.target) : "✗ " + t("ext.depMissing"));
  return /* @__PURE__ */ jsxs(
    "span",
    {
      role: "button",
      tabIndex: 0,
      onClick: () => {
        if (d.target) jump(d.target);
      },
      onKeyDown: (e) => {
        if (e.key === "Enter" && d.target) jump(d.target);
      },
      title: d.name + " [" + d.kind + (d.viaPin ? " ·pin" : "") + "] " + d.status,
      style: {
        ...chipStyle(color, bg),
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        cursor: d.target ? "pointer" : "default",
        textDecoration: d.status === "missing" ? "line-through" : "none"
      },
      children: [
        ok ? "✓ " : inactive ? "⚠ " : "✗ ",
        label,
        d.viaPin ? " ·" + t("ext.depViaPin") : "",
        optional ? " ·optional" : ""
      ]
    }
  );
}
function LocalDetail({ id, entry }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const enabled = entry.enabled !== false;
  const busy = state.busyKey === "enable:" + id || state.busyKey === "disable:" + id || state.busyKey === "remove:" + id;
  const rawSlots = entry.slots || {};
  const slotEntries = Object.entries(rawSlots);
  const slotItems = slotEntries.reduce((s, [, items]) => s + items.length, 0);
  const slotDetailOf = (slot) => {
    const detail = entry.slotsDetail && entry.slotsDetail[slot] || [];
    if (detail.length) return detail;
    return (rawSlots[slot] || []).map((itId) => ({ id: itId, label: itId, context: "global", where: "" }));
  };
  const pkg = entry.packageInfo || {};
  const registryEntry = (state.registryData && state.registryData.extensions || []).find((x) => x && x.id === id) || null;
  const allDependents = dependentsOf(id, { includeDisabled: true, allKinds: true });
  const dependentEdgeKinds = {};
  for (const e of depEdges()) {
    if (e.to !== id || e.from === id) continue;
    (dependentEdgeKinds[e.from] = dependentEdgeKinds[e.from] || []).push(
      e.kind === "client" ? "·client" : e.kind === "optional-ext" || e.kind === "optional-cap" ? "·optional" : e.kind === "hard-cap" ? "·cap." + (e.cap || "") : "hard"
    );
  }
  const loader = state.loader;
  const clientState = !entry.client ? t("ext.noClient") : loader.materialized.includes(id) ? t("ext.clientLoaded") : loader.prefetched.includes(id) ? t("ext.prefetched") : t("ext.notLoaded");
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(96px, 130px) minmax(0, 1fr)",
    gap: "9px 14px",
    fontSize: 12,
    lineHeight: 1.45
  };
  const sectionTitle = { fontSize: 12, fontWeight: 700, color: "var(--text)" };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, minWidth: 0, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 180, flex: 1 }, children: [
        id === SELF_ID ? /* @__PURE__ */ jsxs("span", { title: t("ext.selfProtected"), style: chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), children: [
          "🔒 ",
          t("ext.selfProtected")
        ] }) : /* @__PURE__ */ jsx(
          Toggle,
          {
            enabled,
            loading: busy,
            onToggle: () => void runOp(enabled ? "disable" : "enable", { id }),
            label: enabled ? t("ext.disable") : t("ext.enable")
          }
        ),
        /* @__PURE__ */ jsx(SourceTag, { source: entry.source }),
        !enabled && /* @__PURE__ */ jsx("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 14%, transparent)"), children: t("ext.disabled") }),
        entry.error && /* @__PURE__ */ jsx("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)"), children: "error" }),
        /* @__PURE__ */ jsx("span", { title: id, style: {
          fontSize: 13,
          fontWeight: 600,
          color: "var(--text)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap"
        }, children: extDisplayName(id, entry.name) }),
        extDisplayName(id, entry.name) !== id && /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)", flexShrink: 0 }, children: id })
      ] }),
      entry.source === "user" && entry.dir && id !== SELF_ID && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: busy,
          style: { ...btnStyle, color: "var(--danger, #ef4444)", background: "color-mix(in srgb, var(--danger, #ef4444) 8%, transparent)" },
          onClick: async () => {
            if (dependentsOf(id).length > 0 || await uiConfirm({ message: t("ext.removeConfirm"), danger: true })) void runOp("remove", { id });
          },
          children: t("ext.remove")
        }
      )
    ] }),
    (() => {
      const soul = extSoulText(id, pkg);
      return soul ? /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, fontStyle: "italic", color: "var(--text)", borderLeft: "3px solid var(--accent)", paddingLeft: 10, opacity: 0.92 }, children: [
        "❝ ",
        soul,
        " ❞"
      ] }) : null;
    })(),
    entry.descriptionMd && /* @__PURE__ */ jsx(MdDesc, { text: entry.descriptionMd, vars: extDescVars(id, entry) }),
    /* @__PURE__ */ jsxs("div", { style: gridStyle, children: [
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.status"), children: /* @__PURE__ */ jsx("span", { style: { color: statusDotColor(entry) }, children: entry.error ? "error" : !enabled ? t("ext.disabled") : entry.loaded ? "loaded" : "—" }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.fieldName"), children: /* @__PURE__ */ jsx("span", { children: extDisplayName(id, entry.name) }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.version"), children: /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)" }, children: [
        entry.version || "—",
        pkg.version && pkg.version !== entry.version ? " (package " + pkg.version + ")" : ""
      ] }) }),
      entry.protocol && (() => {
        const c2 = protocolChipSpec(entry.protocol);
        return /* @__PURE__ */ jsx(InfoRow, { label: t("ext.protocol"), children: /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: (entry.protocol.declared ?? "—") + " / " + t("ext.protocolCurrent") + " " + entry.protocol.current }),
          c2 ? /* @__PURE__ */ jsxs("span", { style: chipStyle(c2.color, c2.bg), title: entry.protocol.detail || "", children: [
            c2.icon,
            " ",
            c2.label
          ] }) : /* @__PURE__ */ jsxs("span", { style: chipStyle("var(--ok, #10b981)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), title: entry.protocol.detail || "", children: [
            "✓ ",
            t("ext.protocolOk")
          ] }),
          entry.protocol.needsUpgrade && /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
              title: t("ext.protocolUpgradeTitle", { id, from: entry.protocol.declared ?? "legacy", to: entry.protocol.current }),
              onClick: () => askAiProtocolUpgrade(id, entry.protocol),
              children: [
                "🤖 ",
                t("ext.protocolUpgradeAi")
              ]
            }
          )
        ] }) });
      })(),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.slots"), children: slotEntries.length ? t("ext.slotSummary", { slots: slotEntries.length, items: slotItems }) : t("ext.noSlots") }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.clientBundle"), children: /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)" }, children: entry.client ? entry.client.file + (entry.client.hash ? " @" + entry.client.hash.slice(0, 8) : "") : "—" }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.clientState"), children: clientState }),
      pkg.homepage && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.sourceUrl"), children: /* @__PURE__ */ jsx("a", { href: pkg.homepage, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }, children: pkg.homepage }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.publisher"), children: /* @__PURE__ */ jsx(PublisherCell, { publisher: entry.publisher }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.dir"), children: /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: entry.dir ? shortenPath(entry.dir) : "—" }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.configDir"), children: /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: entry.configDir ? shortenPath(entry.configDir) : "—" }) }),
      (() => {
        const upd = state.updates && state.updates[id];
        const regVersion = upd && upd.registry && upd.registry.version || registryEntry && registryEntry.version || null;
        if (!pkg.name && !regVersion && !upd) return null;
        const installing = !!(upd && upd.installable && state.busyKey === "install:" + upd.installable);
        const showBtn = !!(upd && upd.hasUpdate && upd.installable);
        return /* @__PURE__ */ jsx(InfoRow, { label: t("ext.versionCheck"), children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap", minWidth: 0 }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: pkg.name || id }),
            /* @__PURE__ */ jsxs("span", { style: chipStyle("var(--text-muted)", "var(--bg-panel)"), children: [
              "v",
              pkg.version || upd && upd.installed || "—"
            ] })
          ] }),
          upd && upd.npm && /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)", minWidth: 46 }, children: "npm" }),
            /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: [
              "v",
              upd.npm.latest
            ] }),
            upd.npm.hasUpdate && /* @__PURE__ */ jsx("span", { style: chipStyle(UPDATE_WARN.color, UPDATE_WARN.bg), children: "↑" })
          ] }),
          upd && upd.registry && /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)", minWidth: 46 }, children: "aiti.pw" }),
            /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: [
              "v",
              upd.registry.version
            ] }),
            upd.registry.hasUpdate && /* @__PURE__ */ jsx("span", { style: chipStyle(UPDATE_WARN.color, UPDATE_WARN.bg), children: "↑" }),
            upd.registry.docsUrl && /* @__PURE__ */ jsx("a", { href: upd.registry.docsUrl, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontSize: 11 }, children: t("ext.docs") })
          ] }),
          upd && upd.git && /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)", minWidth: 46 }, children: "git" }),
            /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: [
              String(upd.git.head).slice(0, 7),
              upd.git.remote ? " → " + String(upd.git.remote).slice(0, 7) : " (no remote)"
            ] })
          ] }),
          /* @__PURE__ */ jsxs("span", { style: { display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            !upd ? /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.updatesChecking") }) : /* @__PURE__ */ jsx(UpdateStatusChip, { upd }),
            (state.updatesPartial || state.updatesStale) && /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, title: upd ? updateTooltip(upd) : "", children: state.updatesPartial ? t("ext.updatesPartial") : t("ext.updatesStale") }),
            showBtn && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                disabled: installing || !enabled,
                title: t("ext.updateTo", { version: upd.latest }),
                onClick: () => void runOp("install", { source: upd.installable, id }),
                style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
                children: installing ? "…" : t("ext.update")
              },
              "btn"
            )
          ] }),
          upd && upd.message && /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: upd.message })
        ] }) });
      })(),
      entry.i18nLocales && entry.i18nLocales.length > 0 && /* @__PURE__ */ jsx(InfoRow, { label: "i18n", children: /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: entry.i18nLocales.join(", ") }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: sectionTitle, children: [
        t("ext.slots"),
        slotEntries.length ? " · " + t("ext.slotsOpenHint") : ""
      ] }),
      slotEntries.length === 0 ? /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim)" }, children: t("ext.noSlots") }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6 }, children: slotEntries.map(([slot, ids]) => {
        const items = slotDetailOf(slot);
        const isContext = items.some((it) => it.context === "context");
        return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4, border: "1px solid var(--border)", borderRadius: 6, padding: "6px 8px", background: "var(--bg-panel)", minWidth: 0 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }, children: slot }),
            /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-dim)" }, children: [
              "×",
              ids.length
            ] }),
            isContext ? /* @__PURE__ */ jsxs("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: [
              "⚠ ",
              t("ext.context")
            ] }) : /* @__PURE__ */ jsx("span", { style: chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), children: t("ext.global") })
          ] }),
          items.map((it) => {
            const label = (it.label || it.title || it.id) + "";
            const where = it.where || "";
            return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, minWidth: 0 }, children: [
              /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: label }),
              where && /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", flexShrink: 0, maxWidth: "38%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: where }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  type: "button",
                  onClick: () => openSlotItem(id, slot, it, currentSessionVal),
                  title: t("ext.open") + ": " + label + (where ? " · " + where : ""),
                  style: { ...btnStyle, padding: "2px 9px", fontSize: 10, flexShrink: 0 },
                  children: t("ext.open")
                }
              )
            ] }, it.id);
          })
        ] }, slot);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsx("div", { style: sectionTitle, children: t("ext.deps") }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, fontSize: 12 }, children: [
        Array.isArray(entry.depsResolved) && entry.depsResolved.some((d) => d.hard) && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.deps.hard") }),
          /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: entry.depsResolved.filter((d) => d.hard).map((d) => /* @__PURE__ */ jsx(DepChip, { d, optional: false }, d.name)) })
        ] }),
        Array.isArray(entry.depsResolved) && entry.depsResolved.some((d) => !d.hard) && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.deps.optional") }),
          /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: entry.depsResolved.filter((d) => !d.hard).map((d) => /* @__PURE__ */ jsx(DepChip, { d, optional: true }, d.name)) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.clientDeps") }),
          entry.clientDependsOn && entry.clientDependsOn.length ? /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", overflowWrap: "anywhere" }, children: entry.clientDependsOn.join(" · ") }) : /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)" }, children: t("ext.noDeps") })
        ] }),
        Array.isArray(entry.capsProvides) && entry.capsProvides.length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.capProvide") }),
          /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: entry.capsProvides.map((n) => /* @__PURE__ */ jsx(
            "span",
            {
              role: "button",
              tabIndex: 0,
              onClick: () => setState({ view: "caps", selCap: n, selected: null, mobileView: state.isMobile ? "detail" : state.mobileView }),
              style: { ...chipStyle("rgba(99,102,241,0.9)", "rgba(99,102,241,0.12)"), fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" },
              children: n
            },
            n
          )) })
        ] }),
        Array.isArray(entry.capsTakeover) && entry.capsTakeover.length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.takeoverCaps") }),
          /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: entry.capsTakeover.map((n) => {
            const tr = Array.isArray(entry.takeoverResolved) ? entry.takeoverResolved.find((x) => x.name === n) : null;
            const effective = tr ? tr.effective : true;
            return /* @__PURE__ */ jsxs(
              "span",
              {
                role: "button",
                tabIndex: 0,
                onClick: () => setState({ view: "conflicts", selConflict: "takeover:" + n, selected: null, mobileView: state.isMobile ? "detail" : state.mobileView }),
                style: { ...chipStyle(effective ? "color-mix(in srgb, var(--ok, #10b981) 90%, transparent)" : "var(--text-dim)", effective ? "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)" : "var(--bg-hover)"), fontFamily: "var(--font-mono)", fontSize: 11, cursor: "pointer" },
                children: [
                  n,
                  " · ",
                  effective ? t("ext.takeoverEffective") : t("ext.takeoverShadowed")
                ]
              },
              n
            );
          }) })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, title: t("ext.depsByHint"), children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, children: t("ext.depsBy") }),
          allDependents.length ? /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: allDependents.map((d) => {
            const off = state.status && state.status.extensions && state.status.extensions[d] && state.status.extensions[d].enabled === false;
            const kinds = dependentEdgeKinds[d] || [];
            return /* @__PURE__ */ jsxs(
              "span",
              {
                role: "button",
                tabIndex: 0,
                onClick: () => setState({ selected: { kind: "local", id: d }, error: null, message: null, view: "exts", mobileView: state.isMobile ? "detail" : state.mobileView }),
                onKeyDown: (e) => {
                  if (e.key === "Enter") setState({ selected: { kind: "local", id: d }, error: null, message: null, view: "exts", mobileView: state.isMobile ? "detail" : state.mobileView });
                },
                title: off ? t("ext.dependentDisabledTitle", { id: d }) : d + (kinds.length ? " [" + kinds.join(" ") + "]" : ""),
                style: {
                  ...chipStyle(off ? "var(--text-dim)" : "var(--text-muted)", "var(--bg-hover)"),
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  cursor: "pointer",
                  textDecoration: off ? "line-through" : "none"
                },
                children: [
                  d,
                  off ? " ·off" : "",
                  kinds.length ? /* @__PURE__ */ jsxs("span", { style: { color: "var(--text-dim)" }, children: [
                    " ",
                    kinds.join(" ")
                  ] }) : null
                ]
              },
              d
            );
          }) }) : /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)" }, children: t("ext.noDeps") })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "baseline" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", flexShrink: 0, minWidth: 110 }, title: state.status?.sharedDeps ? t("ext.sharedDepsRoot") + ": " + state.status.sharedDeps.nodeModules : void 0, children: t("ext.pkgDeps") }),
          pkg.dependencies && pkg.dependencies.length ? /* @__PURE__ */ jsx("span", { style: { display: "flex", gap: 8, flexWrap: "wrap", fontFamily: "var(--font-mono)", fontSize: 11, overflowWrap: "anywhere" }, children: pkg.dependencies.map((d) => {
            const st = entry.npmDepStates?.[d];
            const mark = st === "shared" ? "✓" : st === "local" ? "●" : st === "missing" ? "✗" : "";
            const color = st === "shared" ? "color-mix(in srgb, var(--ok, #10b981) 90%, transparent)" : st === "missing" ? "color-mix(in srgb, var(--danger, #ef4444) 90%, transparent)" : "var(--text-dim)";
            const stateText = st === "shared" ? t("ext.depShared") : st === "local" ? t("ext.depLocal") : st === "missing" ? t("ext.depMissing") : "";
            return /* @__PURE__ */ jsxs("span", { style: { color, whiteSpace: "nowrap" }, title: stateText ? d + " · " + stateText : d, children: [
              mark ? mark + " " : "",
              d
            ] }, d);
          }) }) : /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)" }, children: t("ext.noDeps") })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsx("div", { style: sectionTitle, children: t("ext.serverCaps") }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
        (entry.serverHooks || []).map((hk) => /* @__PURE__ */ jsxs("span", { style: { ...chipStyle("var(--text-muted)", "var(--bg-hover)"), fontFamily: "var(--font-mono)" }, children: [
          hk,
          "()"
        ] }, hk)),
        (entry.agentHooks || []).map((hk) => /* @__PURE__ */ jsxs("span", { style: { ...chipStyle("color-mix(in srgb, var(--ok, #10b981) 90%, transparent)", "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)"), fontFamily: "var(--font-mono)" }, children: [
          "agent:",
          hk,
          "()"
        ] }, "a:" + hk)),
        !(entry.serverHooks || []).length && !(entry.agentHooks || []).length && /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text-dim)" }, children: t("ext.noDeps") })
      ] }),
      entry.provides && entry.provides.length > 0 && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.provides") }),
        entry.provides.map((p) => /* @__PURE__ */ jsx("span", { style: { ...chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), fontFamily: "var(--font-mono)" }, children: p }, p))
      ] }),
      (() => {
        const svcs = (state.status?.services ?? []).filter((x) => x.extId === id);
        if (!svcs.length) return null;
        return /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "baseline", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.services") }),
          svcs.map((x) => /* @__PURE__ */ jsx("span", { style: { ...chipStyle("rgba(16,120,185,0.9)", "rgba(16,120,185,0.12)"), fontFamily: "var(--font-mono)" }, children: x.key }, x.key))
        ] });
      })()
    ] }),
    entry.features && entry.features.length > 0 ? /* @__PURE__ */ jsx(FeaturePanel, { id, features: entry.features }) : null,
    entry.error && /* @__PURE__ */ jsx("div", { style: {
      fontSize: 12,
      color: "var(--danger, #ef4444)",
      whiteSpace: "pre-wrap",
      background: "color-mix(in srgb, var(--danger, #ef4444) 6%, transparent)",
      border: "1px solid color-mix(in srgb, var(--danger, #ef4444) 25%, transparent)",
      borderRadius: 6,
      padding: "8px 10px",
      fontFamily: "var(--font-mono)"
    }, children: entry.error })
  ] });
}
function TextlistFeatureInput({ f, id, busy, onSave }) {
  const cur = typeof f.value === "string" ? f.value : "";
  const [draft, setDraft] = useState(cur);
  const ref = useRef(null);
  useEffect(() => {
    if (document.activeElement !== ref.current && draft !== cur) setDraft(cur);
  }, [cur]);
  const commit = () => {
    const v = draft;
    if (v === cur) return;
    onSave(v);
  };
  const lines = Math.max(4, draft.split("\n").length + 1);
  return /* @__PURE__ */ jsx(
    "textarea",
    {
      ref,
      value: draft,
      placeholder: f.placeholder || "",
      disabled: busy,
      rows: lines,
      onBlur: commit,
      onInput: (e) => setDraft(e.target.value),
      style: { width: "100%", marginTop: 2, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", font: "12px/1.6 var(--font-mono), monospace", outline: "none", boxSizing: "border-box", resize: "vertical", whiteSpace: "pre" }
    }
  );
}
function StringFeatureInput({ f, id, busy, onSave }) {
  const cur = typeof f.value === "string" ? f.value : "";
  const [draft, setDraft] = useState(cur);
  const ref = useRef(null);
  useEffect(() => {
    if (document.activeElement !== ref.current && draft !== cur) setDraft(cur);
  }, [cur]);
  const commit = () => {
    const v = draft;
    if (v === cur) return;
    onSave(v);
  };
  return /* @__PURE__ */ jsx(
    "input",
    {
      ref,
      value: draft,
      placeholder: f.placeholder || "",
      disabled: busy,
      onInput: (e) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          e.currentTarget.blur();
        }
      },
      style: { width: "100%", marginTop: 2, padding: "5px 8px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--text)", font: "12px/1.5 var(--font-mono), monospace", outline: "none", boxSizing: "border-box" }
    }
  );
}
function FeaturePanel({ id, features }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const sectionTitle = { fontSize: 12, fontWeight: 700, color: "var(--text)" };
  const on = features.filter((f) => f.enabled !== false).length;
  const off = features.length - on;
  const groups = [];
  for (const f of features) {
    const g = f.group || "";
    const last = groups[groups.length - 1];
    if (last && last.group === g) last.items.push(f);
    else groups.push({ group: g, items: [f] });
  }
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: sectionTitle, children: t("ext.features") }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: [
        t("ext.featuresOn", { on }),
        " · ",
        t("ext.featuresOff", { off })
      ] })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", lineHeight: 1.5 }, children: t("ext.featuresHint") }),
    /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: groups.map((g, gi) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
      g.group && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, fontWeight: 700, color: "var(--text-muted)", marginTop: gi > 0 ? 6 : 0 }, children: featureGroupText(id, g.group) }),
      g.items.map((f) => {
        const key = "set-feature:" + id + ":" + f.id;
        const busy = state.busyKey === key;
        const isString = f.type === "string" || f.type === "textlist";
        return /* @__PURE__ */ jsxs("div", { style: {
          display: "flex",
          alignItems: "flex-start",
          gap: 8,
          padding: "5px 8px",
          borderRadius: 6,
          background: "var(--bg-panel)",
          border: "1px solid var(--border)"
        }, children: [
          isString ? /* @__PURE__ */ jsx("div", { style: { width: 16, textAlign: "center", color: "var(--text-dim)", fontSize: 13, lineHeight: 1.4, flexShrink: 0 }, children: "✎" }) : /* @__PURE__ */ jsx(
            Toggle,
            {
              enabled: f.enabled !== false,
              loading: busy,
              onToggle: () => void runOp("set-feature", { id, busyId: f.id, featureId: f.id, enabled: f.enabled === false }),
              label: (f.enabled === false ? t("ext.enable") : t("ext.disable")) + " " + f.id
            }
          ),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)" }, children: extUi18nExact(id)["feat." + f.id] || f.label }),
              isString && /* @__PURE__ */ jsx("span", { style: chipStyle("#2563eb", "rgba(37,99,235,0.12)"), children: f.type === "textlist" ? t("ext.featureTypeTextlist") : t("ext.featureTypeText") }),
              !isString && f.default === false && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(217,119,6,0.9)", "rgba(217,119,6,0.12)"), children: t("ext.featureDefaultOff") }),
              !isString && f.enabled === false && /* @__PURE__ */ jsx("span", { style: chipStyle("var(--danger, #ef4444)", "color-mix(in srgb, var(--danger, #ef4444) 12%, transparent)"), children: t("ext.disabled") })
            ] }),
            extUi18nExact(id)["feat." + f.id + ".desc"] || f.description ? /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", lineHeight: 1.45 }, children: extUi18nExact(id)["feat." + f.id + ".desc"] || f.description }) : null,
            isString ? f.type === "textlist" ? /* @__PURE__ */ jsx(
              TextlistFeatureInput,
              {
                f,
                id,
                busy,
                onSave: (v) => void runOp("set-feature", { id, busyId: f.id, featureId: f.id, value: v })
              },
              f.id + "-input"
            ) : /* @__PURE__ */ jsx(
              StringFeatureInput,
              {
                f,
                id,
                busy,
                onSave: (v) => void runOp("set-feature", { id, busyId: f.id, featureId: f.id, value: v })
              },
              f.id + "-input"
            ) : /* @__PURE__ */ jsx("div", { style: { fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--text-muted)" }, children: f.id })
          ] })
        ] }, f.id);
      })
    ] }, gi)) })
  ] });
}
function OnlineDetail({ ext }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const installed = state.status && state.status.extensions[ext.id];
  const src = registryInstallSource(ext);
  const installBusy = state.busyKey && state.busyKey.indexOf("install:") === 0;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "minmax(96px, 130px) minmax(0, 1fr)",
    gap: "9px 14px",
    fontSize: 12,
    lineHeight: 1.45
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, minWidth: 180, flex: 1 }, children: [
        /* @__PURE__ */ jsx("span", { style: { fontSize: 20, flexShrink: 0, display: "inline-flex" }, children: extIconSpan(ext, 20) }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)" }, children: onlineName(ext) }),
        onlineName(ext) !== ext.id && /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-dim)" }, children: ext.id }),
        installed && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(99,102,241,0.9)", "rgba(99,102,241,0.12)"), children: t("ext.installed") })
      ] }),
      src && /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: !!installBusy,
          onClick: () => void runOp("install", { source: src, docsUrl: registryDocUrl(ext), publisherHint: ext.publisher || ext.author }),
          style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
          children: installBusy ? t("ext.installing") : installed ? t("ext.update") : t("ext.install")
        }
      )
    ] }),
    (() => {
      const desc = extDescriptionText(ext.id, ext);
      return desc ? /* @__PURE__ */ jsx("div", { style: { fontSize: 13, color: "var(--text)" }, children: desc }) : null;
    })(),
    (() => {
      const soul = extSoulText(ext.id, ext);
      return soul ? /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--text-dim)", fontStyle: "italic" }, children: [
        "❝ ",
        soul,
        " ❞"
      ] }) : null;
    })(),
    ext.descriptionMd && /* @__PURE__ */ jsx(MdDesc, { text: ext.descriptionMd, vars: extDescVars(ext.id) }),
    /* @__PURE__ */ jsxs("div", { style: gridStyle, children: [
      ext.name && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.fieldName"), children: /* @__PURE__ */ jsx("span", { children: onlineName(ext) }) }),
      ext.version && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.version"), children: /* @__PURE__ */ jsxs("span", { style: { fontFamily: "var(--font-mono)" }, children: [
        "v",
        ext.version
      ] }) }),
      ext.type && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.type"), children: ext.type }),
      ext.category && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.category"), children: ext.category }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.publisher"), children: /* @__PURE__ */ jsx(PublisherCell, { publisher: onlinePublisher(ext) }) }),
      ext.license && /* @__PURE__ */ jsx(InfoRow, { label: t("ext.license"), children: ext.license }),
      ext.npm && /* @__PURE__ */ jsx(InfoRow, { label: "npm", children: /* @__PURE__ */ jsx("span", { style: { fontFamily: "var(--font-mono)", fontSize: 11 }, children: ext.npm }) }),
      ext.repo && /* @__PURE__ */ jsx(InfoRow, { label: "repo", children: /* @__PURE__ */ jsx("a", { href: /^https?:\/\//.test(ext.repo) ? ext.repo : "https://github.com/" + ext.repo, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }, children: ext.repo }) }),
      /* @__PURE__ */ jsx(InfoRow, { label: t("ext.docs"), children: /* @__PURE__ */ jsx("a", { href: registryDocUrl(ext), target: "_blank", rel: "noopener noreferrer", style: { color: "var(--accent)", textDecoration: "none", fontFamily: "var(--font-mono)", fontSize: 11 }, children: registryDocUrl(ext) }) })
    ] }),
    ext.tags && ext.tags.length > 0 && /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: ext.tags.map((tag) => /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-muted)", "var(--bg-hover)"), children: tag }, tag)) }),
    !src && /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "#d97706" }, children: [
      t("ext.noSource"),
      " — ",
      t("ext.docs"),
      ": ",
      registryDocUrl(ext)
    ] })
  ] });
}
function AddPane() {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const [source, setSource] = useState("");
  const [zipFile, setZipFile] = useState(null);
  const installBusy = state.busyKey && state.busyKey.indexOf("install:") === 0;
  const reg = state.registryData;
  const regList = reg && reg.extensions ? [...reg.extensions].sort((a, b) => (a.type === "pi-web-ext" ? 0 : 1) - (b.type === "pi-web-ext" ? 0 : 1) || a.id.localeCompare(b.id)) : [];
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 680, minHeight: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 5 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" }, children: t("ext.add") }),
        /* @__PURE__ */ jsxs(
          "a",
          {
            href: AITI_REGISTRY_PAGE,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { display: "inline-flex", alignItems: "center", gap: 5, color: "var(--accent)", fontSize: 12, textDecoration: "none", whiteSpace: "nowrap" },
            children: [
              /* @__PURE__ */ jsxs("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }),
                /* @__PURE__ */ jsx("polyline", { points: "15 3 21 3 21 9" }),
                /* @__PURE__ */ jsx("line", { x1: 10, y1: 14, x2: 21, y2: 3 })
              ] }),
              "aiti.pw/extensions"
            ]
          }
        )
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }, children: [
        t("ext.installTo"),
        ": ",
        state.status ? shortenPath(state.status.extensionsRoot) + "/<id>" : "~/.pi/web/extensions/<id>"
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: [
      /* @__PURE__ */ jsx("label", { htmlFor: "extman-install-source", style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }, children: t("ext.fromSource") }),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx(
          "input",
          {
            id: "extman-install-source",
            value: source,
            onChange: (e) => setSource(e.target.value),
            placeholder: "git:https://… · npm:@scope/pkg · /path/to/ext",
            style: {
              flex: 1,
              height: 34,
              padding: "0 11px",
              border: "1px solid var(--border)",
              borderRadius: 6,
              background: "var(--bg-panel)",
              color: "var(--text)",
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              outline: "none",
              minWidth: 0
            },
            onKeyDown: (e) => {
              if (e.key === "Enter" && source.trim() && !installBusy) void runOp("install", { source: source.trim() });
            }
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: !!installBusy || !source.trim(),
            onClick: () => void runOp("install", { source: source.trim() }),
            style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
            children: installBusy ? t("ext.installing") : t("ext.install")
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 7 }, children: [
      /* @__PURE__ */ jsx("div", { style: { fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }, children: t("ext.uploadZip") }),
      /* @__PURE__ */ jsx(
        "input",
        {
          id: "extman-zip-file",
          type: "file",
          accept: ".zip",
          onChange: (e) => {
            setZipFile(e.target.files && e.target.files[0] || null);
          },
          style: { display: "none" }
        }
      ),
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, alignItems: "center" }, children: [
        /* @__PURE__ */ jsxs(
          "label",
          {
            htmlFor: "extman-zip-file",
            style: { ...btnStyle, display: "flex", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 },
            children: [
              /* @__PURE__ */ jsxs("svg", { width: 12, height: 12, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: [
                /* @__PURE__ */ jsx("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
                /* @__PURE__ */ jsx("polyline", { points: "17 8 12 3 7 8" }),
                /* @__PURE__ */ jsx("line", { x1: 12, y1: 3, x2: 12, y2: 15 })
              ] }),
              t("ext.chooseZip")
            ]
          }
        ),
        zipFile && /* @__PURE__ */ jsx(
          "span",
          {
            title: zipFile.name,
            style: { fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, minWidth: 0 },
            children: zipFile.name + " (" + Math.round(zipFile.size / 1024) + " KB)"
          }
        ),
        zipFile && /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            disabled: !!installBusy,
            onClick: () => void runInstallZip(zipFile),
            style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)", flexShrink: 0 },
            children: installBusy ? t("ext.installing") : t("ext.install")
          }
        )
      ] }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.zipHint") })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" }, children: t("ext.registry") }),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: t("ext.registryHint") })
      ] }),
      !reg && !state.registryError && /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-muted)" }, children: "…" }),
      state.registryError && !reg && /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, color: "#d97706" }, children: [
        t("ext.registryFailed"),
        ": ",
        state.registryError
      ] }),
      reg && regList.length === 0 && /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim)" }, children: t("ext.registryEmpty") }),
      /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 6, maxHeight: "42vh", overflowY: "auto", paddingRight: 2 }, children: regList.map((ext) => {
        const installed = state.status && state.status.extensions[ext.id];
        const installedVersion = installed && installed.version;
        const updatable = installed && ext.version && installedVersion && semverGt(ext.version, installedVersion);
        const src = registryInstallSource(ext);
        return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--bg-panel)" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsxs("span", { style: { fontSize: 13, fontWeight: 600, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 5 }, title: ext.id, children: [
                extIconSpan(ext, 12),
                onlineName(ext)
              ] }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }, children: ext.id }),
              ext.version && /* @__PURE__ */ jsxs("span", { style: { fontSize: 10, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }, children: [
                "v",
                ext.version
              ] }),
              ext.type && /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-muted)", "var(--bg-hover)"), children: ext.type }),
              installed && /* @__PURE__ */ jsx("span", { style: chipStyle("rgba(99,102,241,0.9)", "rgba(99,102,241,0.12)"), children: t("ext.installed") }),
              updatable && /* @__PURE__ */ jsx("span", { style: chipStyle("#d97706", "rgba(217,119,6,0.12)"), children: t("ext.updateTo", { version: ext.version }) })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: extDescriptionText(ext.id, ext) || ext.name || "" })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }, children: [
            /* @__PURE__ */ jsx(
              "a",
              {
                href: registryDocUrl(ext),
                target: "_blank",
                rel: "noopener noreferrer",
                style: { ...btnStyle, textDecoration: "none", display: "inline-block", lineHeight: "22px" },
                children: t("ext.docs")
              }
            ),
            src ? /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                disabled: !!installBusy,
                onClick: () => void runOp("install", { source: src, docsUrl: registryDocUrl(ext), publisherHint: ext.publisher || ext.author }),
                style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
                children: installBusy ? "…" : installed ? t("ext.update") : t("ext.install")
              }
            ) : /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", maxWidth: 120, textAlign: "right" }, children: t("ext.noSource") }),
            installed && /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                onClick: () => setState({ selected: { kind: "local", id: ext.id }, error: null, message: null }),
                style: btnStyle,
                children: t("ext.detail")
              }
            )
          ] })
        ] }, ext.id);
      }) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { fontSize: 12, fontWeight: 700, color: "var(--text)" }, children: [
          "🤝 ",
          t("ext.trustedPublishers")
        ] }),
        /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--text-dim)" }, children: [
          "(",
          (state.trustedPublishers || []).length,
          ")"
        ] }),
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            onClick: () => void refreshTrusted(),
            style: { ...btnStyle, padding: "3px 10px", fontSize: 11, marginLeft: "auto" },
            children: "↻"
          }
        )
      ] }),
      (state.trustedPublishers || []).length === 0 ? /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim)" }, children: t("ext.trustedEmpty") }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column", gap: 5, maxHeight: 240, overflowY: "auto" }, children: state.trustedPublishers.map((x) => {
        const key = x.name && x.name.trim() || x.fingerprint || "?";
        const label = x.name && x.name.trim() || (x.fingerprint ? t("ext.publisherUnknown") + " · " + x.fingerprint : "?");
        const busy = state.busyKey === "untrust:" + key;
        return /* @__PURE__ */ jsxs("div", { style: {
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 10px",
          borderRadius: 6,
          border: "1px solid var(--border)",
          background: "var(--bg-panel)"
        }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)", minWidth: 0, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: label }),
          /* @__PURE__ */ jsx("span", { style: chipStyle("var(--text-muted)", "var(--bg-hover)"), children: publisherSourceLabel(x.source) }),
          x.url && /* @__PURE__ */ jsx("a", { href: x.url, target: "_blank", rel: "noopener noreferrer", title: x.url, style: { color: "var(--accent)", fontSize: 11, textDecoration: "none", flexShrink: 0 }, children: "↗" }),
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              disabled: busy,
              onClick: () => void runOp("untrust", { name: key }),
              style: { ...btnStyle, padding: "3px 10px", fontSize: 11, color: "var(--danger, #ef4444)", flexShrink: 0 },
              children: busy ? "…" : t("ext.untrustPublisher")
            }
          )
        ] }, key + ":" + x.trustedAt);
      }) })
    ] })
  ] });
}
function ExtManDockFace(props) {
  const docked = useGate(EXTMAN_KEY, { dock: "right-panel" });
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  setCurrentSession(props ? props.currentSession : null);
  useEffect(() => {
    if (docked) {
      void refreshStatus();
      void refreshTrusted();
      void loadUpdates();
      syncLoader();
    }
  }, [docked]);
  if (!docked) return null;
  return /* @__PURE__ */ jsx(
    DockBody,
    {
      itemKey: EXTMAN_KEY,
      zone: "right-panel",
      title: t("ext.title"),
      chrome: "tab",
      zones: ["right-panel"],
      children: /* @__PURE__ */ jsx(ExtManContent, {})
    }
  );
}
function SourceDetail({ source }) {
  const [, force] = useState(0);
  useEffect(() => subscribeAll(() => force((v) => v + 1)), []);
  const installBusy = state.busyKey && state.busyKey.indexOf("install:") === 0;
  const kind = /^(git:|git@|https?:\/\/)/i.test(source) ? "git" : /^(npm:|@)/i.test(source) ? "npm" : "path";
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 18, maxWidth: 680 }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8 }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 18 }, children: "⬇" }),
      /* @__PURE__ */ jsx("div", { style: { fontSize: 14, fontWeight: 700, color: "var(--text)" }, children: t("ext.installFromSource") })
    ] }),
    /* @__PURE__ */ jsx("div", { style: {
      fontFamily: "var(--font-mono)",
      fontSize: 13,
      color: "var(--text)",
      background: "var(--bg-panel)",
      border: "1px solid var(--border)",
      borderRadius: 6,
      padding: "10px 12px",
      overflowWrap: "anywhere"
    }, children: source }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsx("span", { style: { ...chipStyle("var(--text-muted)", "var(--bg-hover)"), fontFamily: "var(--font-mono)" }, children: kind }),
      /* @__PURE__ */ jsxs("span", { style: { fontSize: 11, color: "var(--text-dim)", fontFamily: "var(--font-mono)" }, children: [
        t("ext.installTo"),
        ": ",
        state.status ? shortenPath(state.status.extensionsRoot) + "/<id>" : "~/.pi/web/extensions/<id>"
      ] }),
      /* @__PURE__ */ jsx(
        "button",
        {
          type: "button",
          disabled: !!installBusy,
          onClick: () => void runOp("install", { source }),
          style: { ...btnStyle, background: "var(--accent)", color: "white", borderColor: "var(--accent)" },
          children: installBusy ? t("ext.installing") : t("ext.install")
        }
      )
    ] })
  ] });
}
function openExtmanPanel() {
  setState({ open: true, maximized: false, error: null, message: null, zBack: false });
  void refreshStatus();
  void refreshTrusted();
  void loadUpdates();
  syncLoader();
}
function openExtmanTo(extId) {
  if (extId) setState({ view: "exts", selected: { kind: "local", id: extId }, selCap: null, selConflict: null, error: null, message: null, mobileView: state.isMobile ? "detail" : state.mobileView });
  openExtmanPanel();
}
function SidebarFooterButton() {
  return /* @__PURE__ */ jsxs(
    "button",
    {
      title: t("ext.title"),
      onClick: () => openExtmanPanel(),
      style: {
        flex: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 32,
        padding: 0,
        background: "none",
        border: "none",
        borderRadius: 9,
        color: "var(--text-muted)",
        cursor: "pointer",
        fontSize: 12,
        transition: "background 0.12s, color 0.12s"
      },
      onMouseEnter: (e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.color = "var(--text)";
      },
      onMouseLeave: (e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.color = "var(--text-muted)";
      },
      children: [
        /* @__PURE__ */ jsxs("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx("path", { d: "M12 2v4M12 18v4M2 12h4M18 12h4" }),
          /* @__PURE__ */ jsx("circle", { cx: 12, cy: 12, r: 4 })
        ] }),
        t("ext.shortLabel")
      ]
    }
  );
}
function setHostIsMobile(v) {
  if (state.isMobile !== v) setState({ isMobile: v });
}
function register(ctx) {
  __setCtx(ctx);
  primeExtRegistry((p) => apiUrl(p));
  setHostCaps({ reloadExtensions: ctx.reloadExtensions, extLoaderState: ctx.extLoaderState, ctx });
  const mq = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(max-width: 640px)") : null;
  if (mq) {
    const apply = () => setHostIsMobile(mq.matches);
    apply();
    if (mq.addEventListener) mq.addEventListener("change", apply);
  }
  ctx.registerItems?.("sidebarFooter", [{
    id: "aiti-extman-open",
    render: SidebarFooterButton,
    meta: { label: t("ext.shortLabel"), title: t("ext.title"), icon: "icons/wrench.svg", onClick: () => openExtmanPanel() }
  }]);
  ctx.registerItems?.("dialogs", [{ id: "aiti-extman-panel", render: (props) => /* @__PURE__ */ jsx(ExtManPanel, { ...props || {} }) }]);
  ctx.registerExtService?.("aiti-extman.open", (extId) => openExtmanTo(extId));
  try {
    const MIG = "pi-web:extman:dockpref-default-float:v1";
    if (!localStorage.getItem(MIG)) {
      const pk = `pi-web:ext-float:dockpref:v1:${EXTMAN_KEY}`;
      if (localStorage.getItem(pk) === "right-panel") localStorage.removeItem(pk);
      localStorage.setItem(MIG, "1");
    }
  } catch {
  }
  ctx.registerItems?.("rightFileDock", [{ id: "panel", render: (props) => /* @__PURE__ */ jsx(ExtManDockFace, { ...props || {} }), meta: { title: t("ext.shortLabel") } }]);
}
export {
  register as default
};
