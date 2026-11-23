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
const useMemo = (fn, deps) => c("useMemo")(fn, deps);
function apiUrl(p) {
  const fn = _ctx?.apiUrl;
  return typeof fn === "function" ? fn(p) : p;
}
function t(key, params) {
  const fn = _ctx?.t;
  return typeof fn === "function" ? fn(key, params) : key;
}
const rowStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  width: "100%",
  padding: "5px 10px 5px 14px",
  background: "none",
  border: "none",
  color: "var(--text)",
  cursor: "pointer",
  fontSize: 12,
  textAlign: "left"
};
function SidebarTasksSection() {
  const [state, setState] = useState({});
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(apiUrl("/api/extensions/aiti-subagents/fleet/status")).then((r) => r.ok ? r.json() : null).then((d) => {
        if (alive && d) setState(d);
      }).catch(() => {
      });
    };
    load();
    let es;
    try {
      es = new EventSource(apiUrl("/api/extensions/aiti-subagents/fleet/events"));
      es.onmessage = (e) => {
        if (!e.data || e.data === "heartbeat") return;
        try {
          const ev = JSON.parse(e.data);
          if (ev && ev.type) load();
        } catch {
        }
      };
    } catch {
    }
    return () => {
      alive = false;
      try {
        es?.close();
      } catch {
      }
    };
  }, []);
  const running = state.running ?? [];
  const recent = (state.recent ?? []).slice(0, 5);
  const openByFile = (file) => {
    if (!file) return;
    fetch(apiUrl("/api/sessions?refresh=1")).then((r) => r.json()).then((d) => {
      const rows = d?.sessions || [];
      const row = rows.find((x) => x.path === file) || rows.find((x) => x.path && file.endsWith(x.path)) || rows.find((x) => x.id === file);
      if (!row) return;
      window.dispatchEvent(new CustomEvent("pi-web:open-session", { detail: { id: row.id } }));
      window.dispatchEvent(new Event("sm:sessions-changed"));
    }).catch(() => {
    });
  };
  if (running.length === 0 && recent.length === 0) {
    return /* @__PURE__ */ jsx("div", { style: { padding: "8px 14px", fontSize: 11, color: "var(--text-dim)" }, children: t("sa.noTasks") });
  }
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", paddingBottom: 4 }, children: [
    running.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "4px 14px 2px", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }, children: t("sa.runningN", { n: running.length }) }),
    running.map((r, i) => /* @__PURE__ */ jsxs("button", { type: "button", style: rowStyle, onClick: () => openByFile(r.sessionFile), title: r.task || r.agent || "", children: [
      /* @__PURE__ */ jsx("span", { style: { width: 7, height: 7, borderRadius: 99, background: "var(--warn, #f59e0b)", flexShrink: 0, animation: "pi-spin 1s linear infinite" } }),
      /* @__PURE__ */ jsxs("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }, children: [
        r.agent || "subagent",
        " · ",
        r.task || "…"
      ] })
    ] }, "r" + (r.id ?? i))),
    recent.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "6px 14px 2px", fontSize: 10, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em" }, children: t("sa.recentDone") }),
    recent.map((r, i) => {
      const ok = r.status === "ok" || r.status === "success" || r.status === "completed";
      return /* @__PURE__ */ jsxs("button", { type: "button", style: rowStyle, onClick: () => openByFile(r.sessionFile), title: r.task || r.agent || "", children: [
        /* @__PURE__ */ jsx("span", { style: { width: 7, height: 7, borderRadius: 99, background: ok ? "#10b981" : "var(--text-dim)", flexShrink: 0 } }),
        /* @__PURE__ */ jsxs("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: "var(--text-muted)" }, children: [
          r.agent || "subagent",
          " · ",
          r.task || "…"
        ] })
      ] }, "p" + (r.id ?? i));
    })
  ] });
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
function dockIconDecl(name) {
  const markup = DOCK_ICON_NODES[name].map((n) => `<${n.tag} ${Object.entries(n.attrs).map(([k, v]) => `${k}="${v}"`).join(" ")} />`).join("");
  return { svg: markup };
}
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
function isSidebarDockState(state) {
  return state === "docked:sidebar-explorer" || state.startsWith("docked:sidebar:");
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
  const notify = (k) => {
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
          notify(key);
        }
      }
      if ("state" in reg) {
        const next = reg.state ?? {};
        s.state = next;
        const sig = stateSig(next);
        if (sig !== s.sig.state) {
          s.sig.state = sig;
          notify(key);
        }
      }
      if ("menuItems" in reg) {
        const next = reg.menuItems ?? null;
        s.menuItems = next;
        const sig = menuSig(next);
        if (sig !== s.sig.menu) {
          s.sig.menu = sig;
          notify(key);
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
          notify(key);
        }
        if ("menuItems" in reg && cur.menuItems === (reg.menuItems ?? null)) {
          cur.menuItems = null;
          cur.sig.menu = "";
          notify(key);
        }
        if ("commands" in reg && cur.commands === (reg.commands ?? null)) cur.commands = null;
        if ("state" in reg) {
          cur.state = {};
          cur.sig.state = "{}";
          notify(key);
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
function seedDockDefault(k, zone) {
  try {
    if (!localStorage.getItem(DOCKPREF_KEY(k))) localStorage.setItem(DOCKPREF_KEY(k), zone);
  } catch {
  }
  const api = floatApi();
  if (api && typeof api.registerDefaultZone === "function") {
    try {
      api.registerDefaultZone(k, zone);
    } catch {
    }
  }
  localDefaults.set(k, zone);
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
function declareDockZones(k, zones, defaultZone) {
  const api = floatApi();
  if (api && typeof api.registerZones === "function") {
    try {
      api.registerZones(k, zones);
    } catch {
    }
    if (defaultZone && typeof api.registerDefaultZone === "function") {
      try {
        api.registerDefaultZone(k, defaultZone);
      } catch {
      }
    }
  }
  localZones.set(k, zones.filter(Boolean));
  if (defaultZone) localDefaults.set(k, defaultZone);
}
function usePresent(itemKey) {
  const [state, setState] = useState(() => presentState(itemKey));
  useEffect(() => {
    setState(presentState(itemKey));
    const h = ((e) => {
      if (e.detail?.key === itemKey) setState(e.detail.state);
    });
    window.addEventListener(CHANGE_EVENT, h);
    const off = onPresentChange((d) => {
      if (d.key === itemKey) setState(d.state);
    });
    return () => {
      window.removeEventListener(CHANGE_EVENT, h);
      off();
    };
  }, [itemKey]);
  return state;
}
function useGate(itemKey, face) {
  const state = usePresent(itemKey);
  if (face === "float") return state === "floating";
  return state === `docked:${face.dock}`;
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
function requestDockCommand(itemKey, actionId, payload) {
  return headerStore().request(itemKey, actionId, payload);
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
function useDockCommands(itemKey, commands) {
  const tick = useDockHeaderStoreTick();
  useEffect(() => {
    if (!itemKey) return;
    try {
      headerStore().register(itemKey, { commands });
    } catch {
    }
  });
  useEffect(() => {
    if (!itemKey) return;
    return () => {
      try {
        headerStore().register(itemKey, { commands: null });
      } catch {
      }
    };
  }, [itemKey, tick]);
}
function useDockHeaderState(itemKey, state) {
  const tick = useDockHeaderStoreTick();
  useEffect(() => {
    if (!itemKey) return;
    try {
      headerStore().register(itemKey, { state });
    } catch {
    }
  });
  useEffect(() => {
    if (!itemKey) return;
    return () => {
      try {
        headerStore().register(itemKey, { state: null });
      } catch {
      }
    };
  }, [itemKey, tick]);
}
function useDockHeaderStateOf(itemKey) {
  const tick = useDockHeaderStoreTick();
  const [, setVer] = useState(0);
  useEffect(() => {
    const s = headerStore();
    return s.subscribe(itemKey, () => setVer((v) => v + 1));
  }, [itemKey, tick]);
  return headerStore().stateOf(itemKey);
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
  const state = usePresent(itemKey);
  const allZones = zones && zones.length ? zones : zone ? [zone] : [];
  const showDetach = kind === "dockable" && chrome === "section" && allZones.length > 0;
  const btnBase = {
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
        ...btnBase,
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
  const positionRows = menu?.kind === "position" ? [{ type: "icons", label: menuWord("zones"), items: positionMenuModel(itemKey, allZones, defaultZone, state, { onNewWindow: props.onNewWindow }) }] : [];
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
          style: { ...btnBase, display: "flex", alignItems: "center" },
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
          style: { ...btnBase, fontSize: 12 },
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
          style: { ...btnBase, fontSize: 12, fontWeight: 700 },
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
function useGateSidebar(itemKey) {
  const state = usePresent(itemKey);
  if (!isSidebarDockState(state)) return null;
  return state === "docked:sidebar-explorer" ? "sidebar-explorer" : state.slice("docked:".length);
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
function buildTopology(runs) {
  const list = (Array.isArray(runs) ? runs : []).filter((r) => r && typeof r === "object");
  const nodes = list.map((run) => ({ run, parent: null, children: [], depth: 0, orphan: true }));
  const byFile = /* @__PURE__ */ new Map();
  for (const n of nodes) {
    const f = n.run.sessionFile;
    if (typeof f === "string" && f && !byFile.has(f)) byFile.set(f, n);
  }
  for (const n of nodes) {
    const pf = n.run.parentSessionFile;
    const parent = typeof pf === "string" && pf ? byFile.get(pf) : null;
    if (parent && parent !== n) {
      n.orphan = false;
      n.parent = parent;
      parent.children.push(n);
    }
  }
  const roots = nodes.filter((n) => n.orphan);
  const seen = /* @__PURE__ */ new Set();
  let maxDepth = 0;
  const queue = roots.map((n) => (seen.add(n), [n, 0]));
  while (queue.length) {
    const [n, d] = queue.shift();
    n.depth = d;
    if (d > maxDepth) maxDepth = d;
    for (const c2 of n.children) {
      if (!seen.has(c2)) {
        seen.add(c2);
        queue.push([c2, d + 1]);
      }
    }
  }
  for (const n of nodes) {
    if (!seen.has(n)) {
      n.orphan = true;
      roots.push(n);
    }
  }
  const byCreated = (a, b) => (a.run.createdAt || 0) - (b.run.createdAt || 0);
  for (const n of nodes) n.children.sort(byCreated);
  roots.sort((a, b) => byCreated(b, a));
  return { nodes, roots, maxDepth };
}
function topologyLayers(topology) {
  const layers = [];
  const walk = (n) => {
    var _a;
    (layers[_a = n.depth] || (layers[_a] = [])).push(n);
    for (const c2 of n.children) walk(c2);
  };
  for (const r of topology.roots) walk(r);
  for (let i = 0; i < layers.length; i++) if (!layers[i]) layers[i] = [];
  return layers;
}
const FLEET_KEY = "aiti-subagents:fleet";
const fleetCollapsedGroups = /* @__PURE__ */ new Set();
function setFleetOpen(v) {
  if (v) openFloat(FLEET_KEY);
  else closePanel(FLEET_KEY);
}
let fleetViewMode = (() => {
  try {
    return localStorage.getItem("pi:subagents:fleet-view") === "graph" ? "graph" : "tree";
  } catch {
    return "tree";
  }
})();
const fleetViewListeners = /* @__PURE__ */ new Set();
function setFleetViewMode(v) {
  fleetViewMode = v;
  try {
    localStorage.setItem("pi:subagents:fleet-view", v);
  } catch {
  }
  for (const l of fleetViewListeners) l(v);
}
let inspectorOpen = false;
let activeRunId = null;
const inspectorListeners = /* @__PURE__ */ new Set();
function setInspectorOpen(v) {
  inspectorOpen = v;
  for (const l of inspectorListeners) l();
}
function openInspector(runId) {
  activeRunId = runId;
  inspectorOpen = true;
  for (const l of inspectorListeners) l();
}
let agentsOpen = false;
const agentsListeners = /* @__PURE__ */ new Set();
function setAgentsOpen(v) {
  agentsOpen = v;
  for (const l of agentsListeners) l();
}
let cfgOpen = false;
const cfgListeners = /* @__PURE__ */ new Set();
function setCfgOpen(v) {
  cfgOpen = v;
  for (const l of cfgListeners) l();
}
function fmtDuration(ms) {
  if (!ms) return t("进行中");
  if (ms < 1e3) return `${ms}ms`;
  if (ms < 6e4) return `${(ms / 1e3).toFixed(1)}s`;
  return `${Math.floor(ms / 6e4)}m ${Math.floor(ms % 6e4 / 1e3)}s`;
}
function statusMeta(status) {
  return {
    pending: "#a0a0a0",
    running: "#00d4ff",
    completed: "var(--ok, #10b981)",
    failed: "var(--danger, #ef4444)",
    cancelled: "#a0a0a0"
  }[status] || "#888";
}
const STATUS_PATHS = {
  pending: [["circle", { cx: 12, cy: 12, r: 10 }], ["polyline", { points: "12 6 12 12 16 14" }]],
  running: [["path", { d: "M21 12a9 9 0 1 1-9-9" }]],
  completed: [["path", { d: "M20 6 9 17l-5-5" }]],
  failed: [["path", { d: "M18 6 6 18" }], ["path", { d: "m6 6 12 12" }]],
  cancelled: [["circle", { cx: 12, cy: 12, r: 10 }], ["path", { d: "m4.9 4.9 14.2 14.2" }]]
};
const USERS_PATHS = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }],
  ["circle", { cx: 9, cy: 7, r: 4 }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75" }]
];
const AGENT_PATHS = {
  scout: [["circle", { cx: 11, cy: 11, r: 8 }], ["path", { d: "m21 21-4.3-4.3" }]],
  worker: [["path", { d: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" }]],
  reviewer: [["path", { d: "M2.06 12.35a1 1 0 0 1 0-.7 10.75 10.75 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.75 10.75 0 0 1-19.88 0" }], ["circle", { cx: 12, cy: 12, r: 3 }]],
  oracle: [
    ["path", { d: "M9.94 15.5A2 2 0 0 0 8.5 14.06l-6.13-1.58a.5.5 0 0 1 0-.96L8.5 9.94A2 2 0 0 0 9.94 8.5l1.58-6.13a.5.5 0 0 1 .96 0L14.06 8.5A2 2 0 0 0 15.5 9.94l6.13 1.58a.5.5 0 0 1 0 .96L15.5 14.06a2 2 0 0 0-1.44 1.44l-1.58 6.13a.5.5 0 0 1-.96 0z" }],
    ["path", { d: "M20 3v4" }],
    ["path", { d: "M22 5h-4" }]
  ],
  researcher: [["path", { d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" }], ["path", { d: "M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" }]],
  delegate: [["path", { d: "M12 8V4H8" }], ["rect", { width: 16, height: 12, x: 4, y: 8, rx: 2 }], ["path", { d: "M2 14h2" }], ["path", { d: "M20 14h2" }], ["path", { d: "M15 13v2" }], ["path", { d: "M9 13v2" }]]
};
function iconSvg(paths, s = 16) {
  return /* @__PURE__ */ jsx("svg", { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: paths.map(([tag, attrs], i) => createElement(tag, { key: "i" + i, ...attrs })) });
}
const statusIcon = (status, s = 13) => iconSvg(STATUS_PATHS[status] || STATUS_PATHS.pending, s);
const agentIconEl = (name, s = 14) => iconSvg(AGENT_PATHS[name] || USERS_PATHS, s);
const FLEET_ICON = (s = 16) => iconSvg(USERS_PATHS, s);
const REFRESH_PATHS = [["path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }], ["path", { d: "M3 3v5h5" }]];
const GEAR_PATHS = [
  ["circle", { cx: 12, cy: 12, r: 3 }],
  ["path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" }]
];
const RefreshIcon = () => iconSvg(REFRESH_PATHS, 13);
const AgentsIcon = () => iconSvg(GEAR_PATHS, 13);
function useInspectorOpen() {
  const [open, setOpen] = useState(inspectorOpen);
  useEffect(() => {
    const l = () => setOpen(inspectorOpen);
    inspectorListeners.add(l);
    return () => inspectorListeners.delete(l);
  }, []);
  return open;
}
function useFleetState(open, reloadKey) {
  const [state, setState] = useState({ running: [], recent: [], agentCount: 0, runCount: 0 });
  useEffect(() => {
    let alive = true;
    const load = () => {
      fetch(apiUrl("/api/extensions/aiti-subagents/fleet/status")).then((r) => r.ok ? r.json() : null).then((d) => {
        if (alive && d) setState(d);
      }).catch(() => {
      });
    };
    load();
    let es;
    try {
      es = new EventSource(apiUrl("/api/extensions/aiti-subagents/fleet/events"));
      es.onmessage = (e) => {
        if (!e.data || e.data === "heartbeat") return;
        try {
          const ev = JSON.parse(e.data);
          if (ev && ev.type) load();
        } catch {
        }
      };
    } catch {
    }
    return () => {
      alive = false;
      if (es) es.close();
    };
  }, [open, reloadKey]);
  return state;
}
(function installToast() {
  try {
    const el = document.createElement("div");
    el.style.cssText = "position:fixed;top:14px;left:50%;transform:translateX(-50%);z-index:9900;background:var(--bg-panel,#1a1a2e);color:var(--text,#eee);border:1px solid var(--border,#444);border-radius:8px;padding:8px 16px;font-size:12px;box-shadow:0 6px 24px rgba(0,0,0,0.35);display:none;pointer-events:none;";
    document.body.appendChild(el);
    let timer = null;
    window.addEventListener("aiti-subagents:toast", (e) => {
      el.textContent = String(e.detail ?? "");
      el.style.display = "block";
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        el.style.display = "none";
      }, 2600);
    });
  } catch {
  }
})();
function setMsgGlobal(t2) {
  try {
    window.dispatchEvent(new CustomEvent("aiti-subagents:toast", { detail: t2 }));
  } catch {
  }
}
async function openSessionByFile(file, label) {
  try {
    const d = await fetch(apiUrl("/api/sessions?refresh=1")).then((r) => r.json());
    const rows = d?.sessions || [];
    const row = rows.find((s) => s.path === file) || rows.find((s) => s.path && file && file.endsWith(s.path)) || rows.find((s) => s.id === file);
    if (!row) {
      setMsgGlobal(`${t("未在索引中找到")}${label || t("会话")}${t("（稍后重试）")}`);
      return false;
    }
    window.dispatchEvent(new CustomEvent("pi-web:open-session", { detail: { id: row.id } }));
    window.dispatchEvent(new Event("sm:sessions-changed"));
    setMsgGlobal(`${t("已打开")}${label || t("会话")}${t("窗口")}`);
    return true;
  } catch (e) {
    setMsgGlobal(t("打开失败: ") + (e instanceof Error ? e.message : String(e)));
    return false;
  }
}
function ConfigSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const popRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const el = btnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const up = window.innerHeight - r.bottom < 260 && r.top > 260;
      setPos({ top: up ? void 0 : r.bottom + 4, bottom: up ? window.innerHeight - r.top + 4 : void 0, left: r.left, width: Math.max(r.width, 260) });
    }
    const onDoc = (e) => {
      const t2 = e.target;
      if (btnRef.current?.contains(t2) || popRef.current?.contains(t2)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const close = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);
  const current = options.find((o) => o.value === value);
  return /* @__PURE__ */ jsxs("div", { style: { position: "relative", flex: 1, minWidth: 0 }, children: [
    /* @__PURE__ */ jsxs(
      "button",
      {
        ref: btnRef,
        type: "button",
        onClick: () => setOpen(!open),
        style: { width: "100%", height: 34, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, padding: "0 9px", border: "1px solid var(--border)", borderRadius: 5, background: "var(--bg)", color: "var(--text)", fontSize: 12, cursor: "pointer", textAlign: "left" },
        children: [
          /* @__PURE__ */ jsx("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: current ? "var(--text)" : "var(--text-dim)" }, children: current ? current.label : t("选择…") }),
          /* @__PURE__ */ jsx("span", { style: { flexShrink: 0, fontSize: 9, color: "var(--text-dim)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }, children: "▾" })
        ]
      }
    ),
    open && pos && /* @__PURE__ */ jsx(
      "div",
      {
        ref: popRef,
        style: { position: "fixed", top: pos.top, bottom: pos.bottom, left: pos.left, width: pos.width, zIndex: 3400, background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "0 10px 28px rgba(0,0,0,0.28)", padding: 4, maxHeight: 250, overflowY: "auto" },
        children: options.map((o) => /* @__PURE__ */ jsxs(
          "div",
          {
            title: o.label,
            onMouseDown: (e) => {
              e.preventDefault();
              if (o.disabled) return;
              onChange(o.value);
              setOpen(false);
            },
            onMouseEnter: (e) => {
              if (!o.disabled && o.value !== value) e.currentTarget.style.background = "var(--bg-hover, rgba(127,127,127,0.14))";
            },
            onMouseLeave: (e) => {
              if (o.value !== value) e.currentTarget.style.background = "transparent";
            },
            style: { display: "flex", alignItems: "center", gap: 6, padding: "7px 9px", borderRadius: 5, fontSize: 12, lineHeight: 1.4, cursor: o.disabled ? "not-allowed" : "pointer", color: o.disabled ? "var(--text-dim)" : "var(--text)", background: o.value === value ? "var(--bg-hover, rgba(127,127,127,0.14))" : "transparent", fontWeight: o.value === value ? 600 : 400 },
            children: [
              /* @__PURE__ */ jsx("span", { style: { flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: o.label }),
              o.value === value && /* @__PURE__ */ jsx("span", { style: { flexShrink: 0, fontSize: 11, color: "var(--accent, #7c8cff)" }, children: "✓" })
            ]
          },
          o.value
        ))
      }
    )
  ] });
}
function AgentsManagerBody({ embedded }) {
  const [agents, setAgents] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", model: "", tools: "", excludeTools: "", systemPrompt: "", runnerKind: "keep", runnerAdapter: "claude-code", runnerCommand: "" });
  const [backends, setBackends] = useState([]);
  const [msg, setMsg] = useState("");
  const load = () => {
    fetch(apiUrl("/api/extensions/aiti-subagents/agents")).then((r) => r.ok ? r.json() : []).then((d) => setAgents(Array.isArray(d) ? d : [])).catch(() => {
    });
  };
  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    fetch(apiUrl("/api/extensions/aiti-subagents/agents/backends")).then((r) => r.ok ? r.json() : []).then((d) => setBackends(Array.isArray(d) ? d : [])).catch(() => {
    });
  }, []);
  const inputStyle = {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    height: 34,
    padding: "0 9px",
    border: "1px solid var(--border)",
    borderRadius: 5,
    background: "var(--bg)",
    color: "var(--text)",
    fontSize: 12,
    outline: "none"
  };
  const labelStyle = { display: "block", fontSize: 11, fontWeight: 500, color: "var(--text-muted)", marginBottom: 4, marginTop: 10 };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const runnerCurrentLabel = (runner) => !runner || runner.type === "pi" ? t("内置 pi") : runner.type === "external-job" ? `${t("pi-web 会话（")}${runner.backend || runner.options?.backend || "pi"}${t("）")}` : `${t("sa.extCli")} ${runner.adapter}${runner.command ? `（${runner.command}）` : ""}`;
  const runnerState = (agent) => ({
    runnerKind: "keep",
    runnerAdapter: agent.runner?.adapter || agent.runner?.backend || "claude-code",
    runnerCommand: agent.runner?.command || "",
    runnerCurrent: runnerCurrentLabel(agent.runner)
  });
  const applyForm = (agent) => setForm({
    name: agent.name,
    description: agent.description || "",
    model: agent.model || "",
    tools: (agent.tools || []).join(", "),
    excludeTools: (agent.excludeTools || []).join(", "),
    systemPrompt: agent.systemPrompt || "",
    ...runnerState(agent)
  });
  const startEdit = (agent) => {
    setEditing(agent ? { ...agent } : "new");
    setMsg("");
    if (!agent) {
      setForm({ name: "", description: "", model: "", tools: "", excludeTools: "", systemPrompt: "", runnerKind: "pi", runnerAdapter: "claude-code", runnerCommand: "", runnerCurrent: "" });
      return;
    }
    setForm({
      name: agent.name,
      description: agent.description || "",
      model: agent.model || "",
      tools: (agent.tools || []).join(", "),
      excludeTools: (agent.excludeTools || []).join(", "),
      systemPrompt: "",
      ...runnerState(agent)
    });
    fetch(apiUrl(`/api/extensions/aiti-subagents/agents/${encodeURIComponent(agent.name)}`)).then((r) => r.ok ? r.json() : null).then((d) => {
      if (d && d.name === agent.name) applyForm(d);
    }).catch(() => {
    });
  };
  const save = async () => {
    const body = {
      name: form.name.trim(),
      description: form.description.trim(),
      model: form.model.trim() || void 0,
      tools: form.tools ? form.tools.split(",").map((s) => s.trim()).filter(Boolean) : void 0,
      excludeTools: form.excludeTools ? form.excludeTools.split(",").map((s) => s.trim()).filter(Boolean) : void 0,
      systemPrompt: form.systemPrompt,
      // 执行器：external-cli / pi-web(external-job) → runner 块落盘；pi → 删除 runner（回退内置）；keep → 不动
      runner: form.runnerKind === "external-cli" ? { type: "external-cli", adapter: form.runnerAdapter, command: form.runnerCommand.trim() || void 0 } : form.runnerKind === "pi-web" ? { type: "external-job", provider: "pi-web-rpc", options: { backend: form.runnerAdapter || "pi" } } : form.runnerKind === "pi" ? { type: "pi" } : void 0
    };
    const r = await fetch(apiUrl("/api/extensions/aiti-subagents/agents"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if (d?.ok) {
      setMsg(t("已保存（覆盖内置需同名）"));
      setEditing(null);
      load();
    } else setMsg("❌ " + (d?.error || t("保存失败")));
  };
  const takeOver = async (name) => {
    const r = await fetch(apiUrl("/api/extensions/aiti-subagents/agents/takeover"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name })
    });
    const d = await r.json();
    setMsg(d?.ok ? `${name}${t(" 已由 pi-web 后端 ")}${d.backend}${t(" 接管（删除自定义可恢复 fork 直启）")}` : "❌ " + (d?.error || t("接管失败")));
    load();
  };
  const del = async (name) => {
    const r = await fetch(apiUrl(`/api/extensions/aiti-subagents/agents/${encodeURIComponent(name)}`), { method: "DELETE" });
    const d = await r.json();
    setMsg(d?.ok ? d?.restored ? t("已删除自定义，恢复默认") : t("已删除") : "❌ " + (d?.error || t("删除失败")));
    load();
  };
  const editOverlay = editing !== null ? /* @__PURE__ */ jsx(
    "div",
    {
      style: { position: "fixed", inset: 0, zIndex: 3310, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" },
      onClick: () => {
        setEditing(null);
        setMsg("");
      },
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          style: { width: 520, maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)", overflow: "hidden" },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", userSelect: "none" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, flex: 1 }, children: editing === "new" ? t("新建 Agent") : `${t("编辑 Agent · ")}${editing.name}` }),
              /* @__PURE__ */ jsx("button", { title: t("关闭编辑"), onClick: () => {
                setEditing(null);
                setMsg("");
              }, style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 2 }, children: "✕" })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, overflowY: "auto", padding: "4px 14px 10px" }, children: [
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("名称（字母/数字/下划线/连字符）") }),
              /* @__PURE__ */ jsx("input", { style: inputStyle, value: form.name, disabled: editing !== "new", onChange: set("name"), placeholder: "my-agent" }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("描述") }),
              /* @__PURE__ */ jsx("input", { style: inputStyle, value: form.description, onChange: set("description"), placeholder: t("这个 agent 做什么") }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("模型（可选，如 claude-haiku-4-5；留空继承父会话）") }),
              /* @__PURE__ */ jsx("input", { style: inputStyle, value: form.model, onChange: set("model"), placeholder: t("留空 = 继承父模型") }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: `${t("执行器（外部 CLI 或 pi-web 会话——决定 fork 用什么启动这个子代理）")}${form.runnerCurrent ? `${t("　当前：")}${form.runnerCurrent}` : ""}` }),
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6 }, children: [
                /* @__PURE__ */ jsx(
                  ConfigSelect,
                  {
                    value: form.runnerKind,
                    options: [
                      { value: "keep", label: form.runnerCurrent ? `${t("保持原样（")}${form.runnerCurrent}）` : t("保持原样"), disabled: !form.runnerCurrent },
                      { value: "pi", label: t("内置 pi") },
                      { value: "external-cli", label: t("外部 CLI（Claude Code / Codex / Cursor）") },
                      { value: "pi-web", label: t("pi-web 会话（RPC/ACP，可从前端 attach）") }
                    ],
                    onChange: (v) => setForm({ ...form, runnerKind: v })
                  }
                ),
                form.runnerKind === "external-cli" && /* @__PURE__ */ jsx(
                  ConfigSelect,
                  {
                    value: form.runnerAdapter,
                    options: ["claude-code", "claude-code-writer", "codex-exec", "codex-exec-writer", "cursor-agent", "cursor-agent-writer"].map((a) => ({ value: a, label: a })),
                    onChange: (v) => setForm({ ...form, runnerAdapter: v })
                  }
                ),
                form.runnerKind === "pi-web" && /* @__PURE__ */ jsx(
                  ConfigSelect,
                  {
                    value: form.runnerAdapter,
                    options: (backends.length ? backends : [{ key: "pi", label: t("pi（内置 RPC 会话）") }]).map((b) => ({ value: b.key, label: b.label || b.key })),
                    onChange: (v) => setForm({ ...form, runnerAdapter: v })
                  }
                )
              ] }),
              form.runnerKind === "external-cli" && /* @__PURE__ */ jsx("input", { style: { ...inputStyle, marginTop: 6 }, value: form.runnerCommand, onChange: set("runnerCommand"), placeholder: t("命令（留空按 adapter 默认：claude / codex / cursor-agent）") }),
              form.runnerKind === "pi-web" && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim)", marginTop: 6 }, children: t("子代理将启动为真正的 pi-web 会话：出现在会话列表、可实时打开观察、可 steer。") }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("tools 白名单（逗号分隔，留空 = 全部系统工具）") }),
              /* @__PURE__ */ jsx("input", { style: inputStyle, value: form.tools, onChange: set("tools"), placeholder: "read, grep, find, ls, bash, edit, write" }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("excludeTools 黑名单（逗号分隔，排除交互类等）") }),
              /* @__PURE__ */ jsx("input", { style: inputStyle, value: form.excludeTools, onChange: set("excludeTools"), placeholder: "user_confirm, user_input" }),
              /* @__PURE__ */ jsx("label", { style: labelStyle, children: t("系统提示词（给子代理 LLM 的角色定义）") }),
              /* @__PURE__ */ jsx("textarea", { style: { ...inputStyle, minHeight: 160, fontFamily: "var(--font-mono, monospace)", lineHeight: 1.5, resize: "vertical" }, value: form.systemPrompt, onChange: set("systemPrompt"), placeholder: t("你是 ...") })
            ] }),
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, padding: "8px 14px", borderTop: "1px solid var(--border)", alignItems: "center" }, children: [
              /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 11, color: "var(--text-dim)" }, children: msg }),
              /* @__PURE__ */ jsx("button", { className: "config-button config-button-secondary config-button-small", onClick: () => {
                setEditing(null);
                setMsg("");
              }, children: t("取消") }),
              /* @__PURE__ */ jsx("button", { className: "config-button config-button-primary config-button-small", onClick: save, children: t("保存") })
            ] })
          ]
        }
      )
    }
  ) : null;
  return /* @__PURE__ */ jsxs("div", { style: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minHeight: 0 }, children: [
    editOverlay,
    /* @__PURE__ */ jsxs("div", { style: { padding: "8px 12px", display: "flex", gap: 6, alignItems: "center" }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)", flex: 1 }, children: t("sa.agentCount", { n: agents.length }) }),
      embedded && /* @__PURE__ */ jsx("button", { onClick: () => setFleetOpen(true), title: t("打开子代理舰队（运行总览 / 检查器 / 委派）"), style: { background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", borderRadius: 6, padding: "3px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }, children: t("子代理舰队") }),
      /* @__PURE__ */ jsx("button", { onClick: load, title: t("重新加载列表"), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 6, padding: "3px 10px", fontSize: 12, cursor: "pointer" }, children: t("↻ 刷新") }),
      /* @__PURE__ */ jsx("button", { onClick: () => startEdit(null), style: { background: "rgba(0,212,255,0.12)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff", borderRadius: 6, padding: "3px 12px", fontSize: 12, cursor: "pointer" }, children: t("＋ 新建") })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { flex: 1, overflowY: "auto", padding: "0 8px 8px", minHeight: 0 }, children: agents.map((a) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", borderRadius: 6, border: "1px solid var(--border)", marginBottom: 4 }, children: [
      /* @__PURE__ */ jsx("span", { style: { fontWeight: 600, fontSize: 12, width: 90, flexShrink: 0 }, children: a.name }),
      /* @__PURE__ */ jsx(
        "span",
        {
          title: a.runner ? runnerCurrentLabel(a.runner) : t("内置 pi 执行器"),
          style: { fontSize: 9, padding: "0 5px", borderRadius: 6, flexShrink: 0, background: !a.runner ? "rgba(0,212,255,0.1)" : a.runner.type === "external-job" ? "color-mix(in srgb, var(--ok, #10b981) 15%, transparent)" : "rgba(168,85,247,0.15)", color: !a.runner ? "#00d4ff" : a.runner.type === "external-job" ? "var(--ok, #10b981)" : "#a855f7" },
          children: !a.runner ? "pi" : a.runner.type === "external-job" ? `pw:${a.runner.backend || "pi"}` : { "claude-code": "CC", "claude-code-writer": "CC✎", "codex-exec": "codex", "codex-exec-writer": "codex✎", "cursor-agent": "cursor", "cursor-agent-writer": "cursor✎" }[a.runner.adapter || ""] || a.runner.adapter
        }
      ),
      /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: a.description || t("(无描述)") }),
      a.isUserDefined && /* @__PURE__ */ jsx("span", { style: { fontSize: 9, padding: "0 5px", borderRadius: 6, background: "color-mix(in srgb, var(--ok, #10b981) 15%, transparent)", color: "var(--ok, #10b981)", flexShrink: 0 }, children: t("自定义") }),
      !a.isUserDefined && a.runner?.type === "external-cli" && (() => {
        const backend = { "claude-code": "claude", "claude-code-writer": "claude", "codex-exec": "codex", "codex-exec-writer": "codex", "cursor-agent": "cursor", "cursor-agent-writer": "cursor" }[a.runner?.adapter || ""];
        const ready = backend && backends.some((b) => b.key === backend);
        return /* @__PURE__ */ jsx(
          "button",
          {
            disabled: !ready,
            title: ready ? `${t("执行替换为 pi-web 后端 ")}${backend}${t("（同名覆盖，删除自定义即恢复 fork 直启）")}` : `${t("pi-web 后端 ")}${backend || "?"}${t(" 未就绪")}`,
            onClick: () => takeOver(a.name),
            style: { background: ready ? "color-mix(in srgb, var(--ok, #10b981) 12%, transparent)" : "none", border: `1px solid ${ready ? "color-mix(in srgb, var(--ok, #10b981) 40%, transparent)" : "var(--border)"}`, color: ready ? "var(--ok, #10b981)" : "var(--text-dim)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: ready ? "pointer" : "not-allowed", flexShrink: 0, opacity: ready ? 1 : 0.55 },
            children: t("接管")
          }
        );
      })(),
      /* @__PURE__ */ jsx("button", { onClick: () => startEdit(a), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }, children: t("编辑") }),
      a.isUserDefined && /* @__PURE__ */ jsx("button", { onClick: () => del(a.name), title: t("删除自定义（恢复默认）"), style: { background: "none", border: "1px solid var(--danger, #ef4444)", color: "var(--danger, #ef4444)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }, children: t("删除") })
    ] }, a.name)) }),
    /* @__PURE__ */ jsx("div", { style: { padding: "4px 12px", fontSize: 11, color: "var(--text-dim)", borderTop: "1px solid var(--border)" }, children: msg || t("内置 agent 编辑保存后以同名覆盖（删除恢复默认）") })
  ] });
}
function AgentsSettingsPanel(_props) {
  return /* @__PURE__ */ jsx("div", { style: { width: "100%", height: "100%", display: "flex", flexDirection: "column", color: "var(--text)", overflow: "hidden" }, children: /* @__PURE__ */ jsx(AgentsManagerBody, { embedded: true }) });
}
function AgentsDialog() {
  const [open, setOpen] = useState(agentsOpen);
  useEffect(() => {
    const l = () => setOpen(agentsOpen);
    agentsListeners.add(l);
    return () => agentsListeners.delete(l);
  }, []);
  if (!open) return null;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: { position: "fixed", inset: 0, zIndex: 3300, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" },
      onClick: () => setAgentsOpen(false),
      children: /* @__PURE__ */ jsxs(
        "div",
        {
          "data-ext-float": "1",
          "data-ext-float-w": "560",
          "data-ext-float-h": "520",
          "data-ext-float-min-w": "420",
          "data-ext-float-min-h": "360",
          "data-ext-float-full": "1",
          style: { width: 560, height: 520, display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)", overflow: "hidden" },
          onClick: (e) => e.stopPropagation(),
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "grab", userSelect: "none" }, children: [
              /* @__PURE__ */ jsx("span", { style: { color: "var(--text-muted)", display: "flex" }, children: FLEET_ICON(14) }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, flex: 1 }, children: t("Agent 管理") }),
              /* @__PURE__ */ jsx("button", { title: t("并发配置（单 run 并发 / 累计预算 / 跨 run 活跃顶层 async 数）"), onClick: () => setCfgOpen(true), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 2 }, children: "⚙" }),
              /* @__PURE__ */ jsx("button", { title: t("关闭"), onClick: () => setAgentsOpen(false), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 2 }, children: "✕" })
            ] }),
            /* @__PURE__ */ jsx(AgentsManagerBody, {})
          ]
        }
      )
    }
  );
}
function ConcurrencyDialog() {
  const [open, setOpen] = useState(cfgOpen);
  useEffect(() => {
    const l = () => setOpen(cfgOpen);
    cfgListeners.add(l);
    return () => {
      cfgListeners.delete(l);
    };
  }, []);
  const [data, setData] = useState(null);
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => {
    fetch(apiUrl("/api/extensions/aiti-subagents/config")).then((r) => r.json()).then((d) => {
      setData(d);
      const v = {};
      for (const m of d.meta ?? []) {
        const cur = m.key.split(".").reduce((o, k) => o && typeof o === "object" ? o[k] : void 0, d.config);
        v[m.key] = cur === void 0 || cur === null ? "" : String(cur);
      }
      setVals(v);
    }).catch(() => setMsg(t("加载失败")));
  };
  useEffect(() => {
    if (open) {
      setMsg("");
      load();
    }
  }, [open]);
  if (!open) return null;
  const displayVal = (m, raw) => {
    if (m.type !== "capacitySlotMs" || raw === "" || raw === "false") return raw;
    const n = Number(raw);
    return Number.isFinite(n) ? String(Math.round(n / 6e4)) : raw;
  };
  const defText = (m) => {
    const d = data?.defaults?.[m.key];
    if (d === null || d === void 0) return t("默认 不限");
    return `${t("sa.default")} ${m.type === "capacitySlotMs" ? `${Math.round(Number(d) / 6e4)}min` : d}`;
  };
  const save = async (config) => {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(apiUrl("/api/extensions/aiti-subagents/config"), {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ config })
      });
      const d = await r.json();
      if (!r.ok || d.ok === false) setMsg("❌ " + (d.error || `HTTP ${r.status}`));
      else {
        setMsg(t("已保存，对新启动的子代理立即生效"));
        load();
      }
    } catch (e) {
      setMsg("❌ " + e);
    }
    setBusy(false);
  };
  const inputStyle = { width: 96, padding: "3px 8px", fontSize: 12, fontFamily: "var(--font-mono, monospace)", border: "1px solid var(--border)", borderRadius: 6, background: "var(--bg)", color: "var(--text)", outline: "none", minWidth: 0 };
  return /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, zIndex: 3300, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center" }, onClick: () => setCfgOpen(false), children: /* @__PURE__ */ jsxs(
    "div",
    {
      "data-ext-float": "1",
      "data-ext-float-w": "560",
      "data-ext-float-h": "520",
      "data-ext-float-min-w": "420",
      "data-ext-float-min-h": "360",
      "data-ext-float-full": "1",
      style: { width: 560, height: 520, display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)", overflow: "hidden" },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "grab", userSelect: "none" }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, flex: 1 }, children: t("子代理并发配置") }),
          /* @__PURE__ */ jsx("button", { title: t("关闭"), onClick: () => setCfgOpen(false), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 2 }, children: "✕" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1, overflowY: "auto", padding: "8px 14px", minHeight: 0 }, children: data?.readable === false ? /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--danger, #ef4444)", lineHeight: 1.6 }, children: `${t("配置文件损坏，拒绝读写：")}${data.path}${t("（")}${data.error}${t("）——先手工修复后再试")}` }) : /* @__PURE__ */ jsxs(Fragment, { children: [
          /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, marginBottom: 8 }, children: t("四层闸门：单 run 并发 → 单 run 累计 → 会话累计 → 跨 run 活跃顶层 async 数（唯一能拦跨 run 并发的闸门，2026-10-10 12 路并行事故漏配的维度）。留空=不改；↺=回退缺省。保存后对新启动的子代理立即生效，无需重启。") }),
          (data?.meta ?? []).map((m) => /* @__PURE__ */ jsxs("div", { style: { border: "1px solid var(--border)", borderRadius: 6, padding: "6px 9px", marginBottom: 6 }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }, children: [
              /* @__PURE__ */ jsx("span", { style: { fontSize: 12, fontWeight: 600, flex: 1, minWidth: 120 }, title: m.key, children: m.label }),
              /* @__PURE__ */ jsx(
                "input",
                {
                  value: displayVal(m, vals[m.key] ?? ""),
                  disabled: busy,
                  title: m.key,
                  onChange: (e) => {
                    const input = e.target.value;
                    setVals((prev) => ({ ...prev, [m.key]: m.type === "capacitySlotMs" && input !== "" && input !== "false" && Number.isFinite(Number(input)) ? String(Number(input) * 6e4) : input }));
                  },
                  placeholder: defText(m),
                  style: inputStyle
                }
              ),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-muted)", minWidth: 70 }, children: defText(m) }),
              /* @__PURE__ */ jsx(
                "button",
                {
                  disabled: busy,
                  title: t("恢复缺省（删除该键）"),
                  onClick: () => void save({ [m.key]: null }),
                  style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 },
                  children: "↺"
                }
              )
            ] }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-muted)", lineHeight: 1.45, marginTop: 3 }, children: m.desc })
          ] }, m.key))
        ] }) }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, padding: "8px 14px", borderTop: "1px solid var(--border)", alignItems: "center" }, children: [
          /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: msg || String(data?.path ?? "") }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "config-button config-button-primary config-button-small",
              disabled: busy,
              onClick: () => {
                const config = {};
                for (const m of data?.meta ?? []) {
                  const s = String(vals[m.key] ?? "").trim();
                  if (s === "") continue;
                  if (m.type === "capacitySlotMs") {
                    if (s !== "false" && !Number.isFinite(Number(s))) {
                      setMsg(`${t("「")}${m.label}${t("」请输入分钟数或 false")}`);
                      return;
                    }
                    config[m.key] = s === "false" ? false : Number(s) * 6e4;
                  } else {
                    if (!Number.isFinite(Number(s))) {
                      setMsg(`${t("「")}${m.label}${t("」请输入数字")}`);
                      return;
                    }
                    config[m.key] = Number(s);
                  }
                }
                if (!Object.keys(config).length) {
                  setMsg(t("请先填入要修改的值（留空=不改）"));
                  return;
                }
                void save(config);
              },
              children: busy ? t("保存中…") : t("保存")
            }
          )
        ] })
      ]
    }
  ) });
}
function FleetBody(props) {
  const dockKey = typeof props?.dockItemKey === "string" && props.dockItemKey ? props.dockItemKey : void 0;
  const [reloadKey, setReloadKey] = useState(0);
  useEffect(() => {
    const onActivity = () => setReloadKey((k) => k + 1);
    window.addEventListener("aiti-subagents:activity", onActivity);
    return () => window.removeEventListener("aiti-subagents:activity", onActivity);
  }, []);
  const state = useFleetState(true, reloadKey);
  const [, setCollapsedTick] = useState(0);
  const toggleGroup = (key) => {
    if (fleetCollapsedGroups.has(key)) fleetCollapsedGroups.delete(key);
    else fleetCollapsedGroups.add(key);
    setCollapsedTick((n) => n + 1);
  };
  const running = state.running || [];
  const recent = (state.recent || []).slice(0, 12);
  const all = [...running, ...recent];
  const groups = /* @__PURE__ */ new Map();
  for (const run of all) {
    const key = run.parentSessionFile || " __orphan__";
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        title: run.parentTitle || (run.parentSessionFile ? key.split("/").pop()?.replace(/\.jsonl$/, "") || "" : ""),
        runs: []
      });
    }
    groups.get(key).runs.push(run);
  }
  const groupList = [...groups.values()].sort((a, b) => {
    const aRunning = a.runs.some((r) => r.status === "running");
    const bRunning = b.runs.some((r) => r.status === "running");
    if (aRunning !== bRunning) return aRunning ? -1 : 1;
    const aT = Math.max(...a.runs.map((r) => r.createdAt || 0));
    const bT = Math.max(...b.runs.map((r) => r.createdAt || 0));
    return bT - aT;
  });
  const openSession = (file) => {
    void openSessionByFile(file);
  };
  const [viewMode, setViewModeLocal] = useState(fleetViewMode);
  useEffect(() => {
    const l = (v) => setViewModeLocal(v);
    fleetViewListeners.add(l);
    return () => {
      fleetViewListeners.delete(l);
    };
  }, []);
  useDockCommands(dockKey, dockKey ? {
    refresh: () => setReloadKey((k) => k + 1),
    agents: () => setAgentsOpen(true)
  } : null);
  useDockHeaderState(dockKey, dockKey ? { runningCount: running.length, total: all.length } : null);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("div", { style: { flex: 1, overflowY: "auto", padding: 6, minHeight: 0 }, children: all.length === 0 ? /* @__PURE__ */ jsx("div", { style: { textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 12, whiteSpace: "pre-line" }, children: t("暂无子代理运行。\n在 AI 会话中调用 subagent 工具，或让模型使用 scout/worker/reviewer。") }) : viewMode === "graph" ? /* @__PURE__ */ jsx(FleetGraph, { runs: all }) : groupList.map((group) => {
      const runningCount = group.runs.filter((r) => r.status === "running").length;
      const isOrphan = group.key === " __orphan__";
      return /* @__PURE__ */ jsxs("div", { style: { marginBottom: 8 }, children: [
        /* @__PURE__ */ jsxs(
          "div",
          {
            onClick: () => toggleGroup(group.key),
            title: fleetCollapsedGroups.has(group.key) ? t("展开分组") : t("折叠分组"),
            style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", background: "rgba(128,128,128,0.08)", borderRadius: 6, marginBottom: 2, cursor: "pointer", userSelect: "none" },
            children: [
              /* @__PURE__ */ jsx("span", { style: { color: "var(--text-muted)", fontSize: 10, width: 10, flexShrink: 0, display: "inline-block", transition: "transform .12s", transform: fleetCollapsedGroups.has(group.key) ? "rotate(-90deg)" : "none" }, children: "▾" }),
              /* @__PURE__ */ jsx("span", { style: { flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, title: group.key, children: isOrphan ? `${t("sa.earlyRuns", { time: new Date(Math.max(...group.runs.map((r) => r.createdAt || 0))).toLocaleString("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) })}` : group.title || t("父会话") }),
              runningCount > 0 && /* @__PURE__ */ jsx("span", { style: { fontSize: 10, padding: "0 6px", borderRadius: 8, background: "rgba(0,212,255,0.15)", color: "#00d4ff" }, children: t("sa.runningCount", { n: runningCount }) }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim)", flexShrink: 0 }, children: t("sa.subCount", { n: group.runs.length }) }),
              !isOrphan && group.key && /* @__PURE__ */ jsx("button", { title: t("打开父会话"), onClick: (e) => {
                e.stopPropagation();
                openSession(group.key);
              }, style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 10, cursor: "pointer", flexShrink: 0 }, children: t("打开") })
            ]
          }
        ),
        !fleetCollapsedGroups.has(group.key) && group.runs.map((run) => {
          const color = statusMeta(run.status);
          const rowBg = run.status === "running" ? "rgba(0,212,255,0.07)" : "transparent";
          const wsBase = run.cwd ? String(run.cwd).split("/").filter(Boolean).pop() || "" : "";
          const metaBits = [
            run.turns ? `${run.turns} turns` : "",
            run.tokens ? `${Math.round(run.tokens / 1e3)}k tok` : "",
            run.model ? run.model.split("/").pop() : ""
          ].filter(Boolean).join(" · ");
          const liveElapsed = run.status === "running" && run.startedAt ? fmtDuration(Date.now() - Number(run.startedAt)) : "";
          return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 8px 6px 22px", borderRadius: 6, background: rowBg }, children: [
            /* @__PURE__ */ jsx("span", { style: { color: "var(--text-dim)", width: 12, flexShrink: 0, fontSize: 10 }, children: "└" }),
            /* @__PURE__ */ jsx("span", { style: { color, width: 16, display: "flex", justifyContent: "center", flexShrink: 0 }, children: statusIcon(run.status) }),
            /* @__PURE__ */ jsx("span", { style: { display: "flex", color: "var(--text-muted)", flexShrink: 0 }, children: agentIconEl(run.agent) }),
            /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, alignItems: "baseline", minWidth: 0 }, children: [
                /* @__PURE__ */ jsx("span", { style: { fontSize: 12, fontWeight: 600, color: "var(--text)", flexShrink: 0 }, children: run.agent }),
                wsBase && /* @__PURE__ */ jsx("span", { title: run.cwd, style: { fontSize: 10, padding: "0 6px", borderRadius: 8, background: "rgba(0,212,255,0.10)", border: "1px solid rgba(0,212,255,0.25)", color: "#00d4ff", flexShrink: 0, maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: `${wsBase}` }),
                /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: metaBits })
              ] }),
              /* @__PURE__ */ jsx("div", { title: run.task || "", style: { fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: (run.task || "").slice(0, 90) || t("（无任务文本）") })
            ] }),
            /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: run.status === "running" ? "#00d4ff" : "var(--text-muted)", flexShrink: 0 }, children: liveElapsed || fmtDuration(run.durationMs) }),
            run.sessionFile && /* @__PURE__ */ jsx("button", { title: t("打开子代理会话（transcript 回看全过程）"), onClick: () => openSession(run.sessionFile), style: { background: "none", border: "1px solid rgba(0,212,255,0.4)", color: "#00d4ff", borderRadius: 4, padding: "1px 6px", fontSize: 11, cursor: "pointer", flexShrink: 0 }, children: t("会话") }),
            run.status === "running" && /* @__PURE__ */ jsx(
              "button",
              {
                title: t("中止（/web 桥 abort 优先，回退 control inbox）"),
                onClick: () => {
                  fetch(apiUrl("/api/extensions/aiti-subagents/fleet/bridge"), {
                    method: "POST",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ id: run.id, action: "abort" })
                  }).then((r) => r.json()).then((r) => {
                    if (!r.ok) alert(t("中止失败: ") + (r.error || t("未知")));
                  }).catch(() => {
                  });
                },
                style: { background: "none", border: "1px solid var(--border)", color: "var(--danger, #ef4444)", borderRadius: 4, padding: "1px 6px", fontSize: 11, cursor: "pointer", flexShrink: 0 },
                children: "■"
              }
            ),
            /* @__PURE__ */ jsx("button", { title: t("详情"), onClick: () => openInspector(run.id), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer", flexShrink: 0 }, children: t("详情") })
          ] }, run.id);
        })
      ] }, group.key);
    }) }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", borderTop: "1px solid var(--border)", fontSize: 11, color: "var(--text-muted)" }, children: [
      /* @__PURE__ */ jsx("span", { style: { flex: 1 }, children: t("sa.totalRuns", { n: state.runCount }) }),
      /* @__PURE__ */ jsxs("span", { style: { display: "flex", border: "1px solid var(--border)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }, children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            title: t("分组列表视图"),
            onClick: () => setFleetViewMode("tree"),
            style: { background: viewMode === "tree" ? "var(--bg-hover)" : "none", border: "none", color: viewMode === "tree" ? "var(--text)" : "var(--text-muted)", padding: "1px 8px", fontSize: 11, cursor: "pointer" },
            children: t("树")
          }
        ),
        /* @__PURE__ */ jsx(
          "button",
          {
            title: t("分层拓扑图（列 = 深度，边 = 父子调用链）"),
            onClick: () => setFleetViewMode("graph"),
            style: { background: viewMode === "graph" ? "var(--bg-hover)" : "none", border: "none", borderLeft: "1px solid var(--border)", color: viewMode === "graph" ? "var(--text)" : "var(--text-muted)", padding: "1px 8px", fontSize: 11, cursor: "pointer" },
            children: t("图")
          }
        )
      ] }),
      /* @__PURE__ */ jsx("button", { title: t("刷新"), "aria-label": t("刷新"), onClick: () => setReloadKey((k) => k + 1), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, padding: 2 }, children: "⟳" }),
      /* @__PURE__ */ jsxs("button", { onClick: () => setAgentsOpen(true), title: t("管理/自定义 agent 定义"), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }, children: [
        FLEET_ICON(11),
        t("Agent 管理")
      ] }),
      /* @__PURE__ */ jsx("button", { onClick: () => setCfgOpen(true), title: t("并发配置（单 run 并发 / 累计预算 / 跨 run 活跃顶层 async 数）"), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "1px 8px", fontSize: 11, cursor: "pointer" }, children: t("并发") }),
      /* @__PURE__ */ jsxs("span", { style: { display: "flex", alignItems: "center", gap: 4 }, children: [
        /* @__PURE__ */ jsx("span", { style: { width: 6, height: 6, borderRadius: 3, background: "var(--ok, #10b981)", display: "inline-block" } }),
        t("SSE 实时")
      ] })
    ] })
  ] });
}
function FleetGraph({ runs }) {
  const topology = useMemo(() => buildTopology(runs), [runs]);
  const layers = useMemo(() => topologyLayers(topology), [topology]);
  const NODE_W = 196;
  const NODE_H = 48;
  const GAP_X = 34;
  const GAP_Y = 10;
  const pos = /* @__PURE__ */ new Map();
  const totalH = Math.max(...layers.map((l) => l.length * (NODE_H + GAP_Y)), NODE_H + 4);
  layers.forEach((layer, i) => {
    let y = Math.max(0, (totalH - layer.length * (NODE_H + GAP_Y)) / 2);
    for (const n of layer) {
      pos.set(n.run, { x: i * (NODE_W + GAP_X), y });
      y += NODE_H + GAP_Y;
    }
  });
  const width = Math.max(layers.length * (NODE_W + GAP_X) - GAP_X + 8, 120);
  return /* @__PURE__ */ jsx("div", { style: { overflow: "auto", width: "100%", height: "100%" }, children: /* @__PURE__ */ jsxs("div", { style: { position: "relative", width, height: totalH }, children: [
    /* @__PURE__ */ jsx("svg", { width, height: totalH, style: { position: "absolute", inset: 0, pointerEvents: "none" }, children: layers.flatMap((layer) => layer.map((n) => {
      const p = n.parent ? pos.get(n.parent.run) : null;
      const c2 = pos.get(n.run);
      if (!p || !c2) return null;
      const color = statusMeta(n.run.status);
      const x1 = p.x + NODE_W;
      const y1 = p.y + NODE_H / 2;
      const x2 = c2.x;
      const y2 = c2.y + NODE_H / 2;
      const dx = Math.max((x2 - x1) / 2, 4);
      return /* @__PURE__ */ jsx(
        "path",
        {
          d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
          fill: "none",
          stroke: color,
          strokeWidth: 1.3,
          opacity: 0.55
        },
        "e" + String(n.run.id ?? c2.y)
      );
    })) }),
    layers.flatMap((layer, i) => layer.map((n) => {
      const p = pos.get(n.run);
      const run = n.run;
      const color = statusMeta(run.status);
      const wsBase = run.cwd ? String(run.cwd).split("/").filter(Boolean).pop() || "" : "";
      return /* @__PURE__ */ jsxs(
        "div",
        {
          title: `${run.agent || "subagent"} · ${run.task || ""}`,
          onClick: () => {
            if (run.sessionFile) void openSessionByFile(run.sessionFile);
          },
          style: {
            position: "absolute",
            left: p.x,
            top: p.y,
            width: NODE_W,
            height: NODE_H,
            boxSizing: "border-box",
            borderRadius: 7,
            border: `1px solid ${color}`,
            background: "var(--bg)",
            cursor: "pointer",
            padding: "5px 8px",
            overflow: "hidden"
          },
          children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [
              /* @__PURE__ */ jsx("span", { style: { width: 7, height: 7, borderRadius: 99, background: color, flexShrink: 0, animation: run.status === "running" ? "pi-spin 1s linear infinite" : void 0 } }),
              /* @__PURE__ */ jsx("span", { style: { fontSize: 11.5, fontWeight: 600, color: "var(--text)", flexShrink: 0 }, children: run.agent || "subagent" }),
              wsBase ? /* @__PURE__ */ jsx("span", { style: { fontSize: 9, color: "var(--text-dim)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: wsBase }) : null,
              /* @__PURE__ */ jsx("span", { style: { fontSize: 9.5, color: "var(--text-dim)", marginLeft: "auto", flexShrink: 0 }, children: run.status === "running" && run.startedAt ? fmtDuration(Date.now() - Number(run.startedAt)) : fmtDuration(run.durationMs) })
            ] }),
            /* @__PURE__ */ jsx("div", { style: { fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 2 }, children: (run.task || "").slice(0, 60) || t("（无任务文本）") })
          ]
        },
        "n" + String(run.id ?? i + "-" + p.y)
      );
    }))
  ] }) });
}
function FleetDialog() {
  const open = useGate(FLEET_KEY, "float");
  useEffect(() => {
    if (open) {
      try {
        window.dispatchEvent(new Event("sm:sessions-changed"));
      } catch {
      }
    }
  }, [open]);
  if (!open) return null;
  return /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, zIndex: 3100, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      "data-ext-float": "1",
      "data-ext-float-key": FLEET_KEY,
      "data-ext-float-dock": `${sidebarZoneOf(FLEET_KEY)} right-panel`,
      "data-ext-float-dock-default": sidebarZoneOf(FLEET_KEY),
      "data-ext-float-w": "460",
      "data-ext-float-h": "380",
      "data-ext-float-min-w": "320",
      "data-ext-float-min-h": "220",
      "data-ext-float-full": "1",
      style: {
        pointerEvents: "auto",
        width: 460,
        height: 380,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-panel)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        color: "var(--text)",
        boxShadow: "0 10px 40px rgba(0,0,0,0.35)",
        overflow: "hidden"
      },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "grab", userSelect: "none" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-muted)", display: "flex" }, children: FLEET_ICON(15) }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, flex: 1 }, children: t("子代理舰队") }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-muted)", border: "1px solid var(--border)", borderRadius: 8, padding: "1px 8px" }, children: t("fork 引擎") }),
          /* @__PURE__ */ jsx("button", { title: t("关闭"), "aria-label": t("关闭"), onClick: () => setFleetOpen(false), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 2 }, children: "✕" })
        ] }),
        /* @__PURE__ */ jsx(FleetBody, {})
      ]
    }
  ) });
}
function FleetDockLeft() {
  const docked = useGateSidebar(FLEET_KEY);
  const hs = useDockHeaderStateOf(FLEET_KEY);
  if (!docked) return null;
  const runningCount = typeof hs.runningCount === "number" ? hs.runningCount : 0;
  const actions = [
    { id: "refresh", title: t("刷新"), icon: /* @__PURE__ */ jsx(RefreshIcon, {}), visibility: "always", onClick: () => {
      requestDockCommand(FLEET_KEY, "refresh");
    } },
    { id: "agents", title: t("Agent 管理"), icon: /* @__PURE__ */ jsx(AgentsIcon, {}), visibility: "always", onClick: () => {
      requestDockCommand(FLEET_KEY, "agents");
    } }
  ];
  return /* @__PURE__ */ jsx(
    DockBody,
    {
      itemKey: FLEET_KEY,
      title: t("子代理舰队"),
      icon: "bot",
      chrome: "section",
      count: runningCount > 0 ? runningCount : void 0,
      zones: [sidebarZoneOf(FLEET_KEY), "right-panel"],
      defaultZone: sidebarZoneOf(FLEET_KEY),
      headerActions: actions,
      children: /* @__PURE__ */ jsx(FleetBody, { dockItemKey: FLEET_KEY })
    }
  );
}
function FleetDockRight() {
  const docked = useGate(FLEET_KEY, { dock: "right-panel" });
  if (!docked) return null;
  return /* @__PURE__ */ jsx(
    DockBody,
    {
      itemKey: FLEET_KEY,
      zone: "right-panel",
      title: t("子代理舰队"),
      chrome: "tab",
      zones: [sidebarZoneOf(FLEET_KEY), "right-panel"],
      defaultZone: sidebarZoneOf(FLEET_KEY),
      children: /* @__PURE__ */ jsx(FleetBody, {})
    }
  );
}
function SteerRow({ runId, active }) {
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState(null);
  const send = () => {
    if (!text.trim() || sending) return;
    setSending(true);
    fetch(apiUrl("/api/extensions/aiti-subagents/fleet/bridge"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: runId, action: "steer", message: text })
    }).then((r) => r.json()).then((r) => {
      setMsg(r.ok ? t("已投递") : "✕ " + (r.error || t("失败")));
      if (r.ok) setText("");
    }).catch(() => setMsg(t("网络错误"))).finally(() => setSending(false));
  };
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, padding: "8px 10px", borderTop: "1px solid var(--border)", alignItems: "center" }, children: [
    /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }, children: t("发消息:") }),
    /* @__PURE__ */ jsx(
      "input",
      {
        value: text,
        disabled: !active || sending,
        placeholder: active ? t("向运行中的子代理发消息…") : t("run 已结束，不能发消息"),
        onChange: (e) => setText(e.currentTarget.value),
        onKeyDown: (e) => {
          if (e.key === "Enter") send();
        },
        style: { flex: 1, fontSize: 12, padding: "4px 8px", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 4, color: "var(--text)" }
      }
    ),
    /* @__PURE__ */ jsx(
      "button",
      {
        onClick: send,
        disabled: !active || sending || !text.trim(),
        style: { background: "none", border: "1px solid var(--border)", color: active && text.trim() ? "#00d4ff" : "var(--text-muted)", borderRadius: 4, padding: "3px 10px", fontSize: 11, cursor: active && text.trim() ? "pointer" : "default", flexShrink: 0 },
        children: sending ? "…" : t("发送")
      }
    ),
    msg && /* @__PURE__ */ jsx("span", { style: { fontSize: 11, color: msg.startsWith("✓") ? "var(--ok, #10b981)" : "var(--danger, #ef4444)", flexShrink: 0 }, children: msg })
  ] });
}
function InspectorDialog() {
  const open = useInspectorOpen();
  const [run, setRun] = useState(null);
  const [tab, setTab] = useState("summary");
  const runId = activeRunId;
  useEffect(() => {
    if (!open || !runId) return;
    let alive = true;
    setRun(null);
    setTab("summary");
    fetch(apiUrl(`/api/extensions/aiti-subagents/fleet/run/${runId}`)).then((r) => r.ok ? r.json() : Promise.reject(new Error("no fork detail"))).then((d) => {
      if (!alive || !d) return;
      const stateMap = { complete: "completed", running: "running", queued: "pending", failed: "failed" };
      d.status = stateMap[d.state] || d.state || "unknown";
      setRun(d);
    }).catch(() => fetch(apiUrl(`/api/extensions/aiti-subagents/runs/${runId}`)).then((r) => r.ok ? r.json() : null).then((d) => {
      if (alive && d) setRun(d);
    }).catch(() => {
    }));
    return () => {
      alive = false;
    };
  }, [open, runId]);
  if (!open) return null;
  const tabs = [{ id: "summary", label: t("摘要") }, { id: "output", label: t("输出") }, { id: "report", label: t("运行报告") }, { id: "tools", label: t("工具调用") }, { id: "raw", label: t("原始数据") }];
  const isForkDetail = Boolean(run && run.engine === "fork");
  let body = null;
  if (!run) {
    body = /* @__PURE__ */ jsx("div", { style: { textAlign: "center", color: "var(--text-muted)", padding: 40, fontSize: 12 }, children: t("加载中...") });
  } else {
    const color = statusMeta(run.status);
    const mono = { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 11, lineHeight: 1.5, whiteSpace: "pre-wrap", wordBreak: "break-all", margin: 0 };
    if (tab === "summary") {
      const totalTokens = run.totalTokens;
      const cost = Number(run.totalCost?.costUsd ?? run.totalCost ?? 0);
      body = /* @__PURE__ */ jsxs("div", { style: { padding: 12, fontSize: 12, lineHeight: 1.7 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [
          /* @__PURE__ */ jsx("b", { children: "agent:" }),
          agentIconEl(run.agent),
          run.agent
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 5 }, children: [
          /* @__PURE__ */ jsx("b", { children: t("状态:") }),
          /* @__PURE__ */ jsx("span", { style: { color, display: "flex" }, children: statusIcon(run.status) }),
          run.status,
          isForkDetail && run.pidAlive != null ? `${t("（runner pid ")}${run.pid}${run.pidAlive ? t(" 存活") : t(" 已退出")}${t("）")}` : ""
        ] }),
        run.cwd ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: "Workspace: " }),
          /* @__PURE__ */ jsx("span", { title: String(run.cwd), style: { fontFamily: "var(--font-mono, ui-monospace, monospace)", fontSize: 11 }, children: String(run.cwd) })
        ] }) : null,
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: t("耗时: ") }),
          fmtDuration(run.durationMs)
        ] }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: t("任务: ") }),
          String(run.task ?? "")
        ] }),
        isForkDetail && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: t("用量: ") }),
          `${t("sa.tokensHead")} ${typeof totalTokens === "object" && totalTokens ? `${totalTokens.input ?? 0}↑ ${totalTokens.output ?? 0}↓${t("sa.tokensTotal", { total: totalTokens.total ?? 0 })}` : String(totalTokens ?? "-")} · ${t("sa.turns", { n: run.turnCount ?? "-" })} · ${t("sa.toolCalls", { n: run.toolCount ?? "-" })} · $${Number(cost).toFixed(4)}`
        ] }),
        !isForkDetail && run.tokenUsage ? /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("b", { children: t("用量: ") }),
          `↑${run.tokenUsage.input || 0} ↓${run.tokenUsage.output || 0} $${Number(run.tokenUsage.cost || 0).toFixed(4)}`
        ] }) : null,
        isForkDetail && Array.isArray(run.steps) && run.steps.length > 0 && /* @__PURE__ */ jsxs("div", { style: { marginTop: 6 }, children: [
          /* @__PURE__ */ jsx("b", { children: "Steps:" }),
          run.steps.map((s, i) => /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-muted)" }, children: `  ${i + 1}. ${s.agent} [${s.state || "?"}] ${String(s.description || "").slice(0, 80)}` }, i))
        ] }),
        isForkDetail && run.steering && /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-muted)" }, children: `${t("sa.steerLine", { requested: run.steering.requested ?? 0, delivered: run.steering.delivered ?? 0, pending: run.steering.pending ?? 0 })}` }),
        isForkDetail && /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }, children: [
          (run.sessionFile || run.childSessionFile) && /* @__PURE__ */ jsx("button", { onClick: () => openSessionByFile(run.childSessionFile || run.sessionFile, t("子代理会话")), style: { background: "none", border: "1px solid #00d4ff", color: "#00d4ff", borderRadius: 4, padding: "2px 10px", fontSize: 11, cursor: "pointer" }, children: t("打开子代理消息窗口") }),
          (run.parentSessionFile || run.asyncDetail?.parentSessionFile) && /* @__PURE__ */ jsx("button", { onClick: () => openSessionByFile(run.parentSessionFile || run.asyncDetail.parentSessionFile, t("父会话")), style: { background: "none", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4, padding: "2px 10px", fontSize: 11, cursor: "pointer" }, children: t("↩ 打开父会话") })
        ] }),
        isForkDetail && run.bridge && (() => {
          const bridge = run.bridge;
          return bridge.attached ? /* @__PURE__ */ jsxs("div", { style: { marginTop: 4, padding: "6px 8px", background: "color-mix(in srgb, var(--ok, #10b981) 8%, transparent)", borderRadius: 6, fontSize: 11 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "var(--ok, #10b981)" }, children: `${t("🟢 /web RPC 已连接 · ")}${bridge.state?.isStreaming ? t("流式执行中") : t("空闲")} · ${bridge.state?.model?.provider ?? ""}/${bridge.state?.model?.id ?? ""} · ${t("待投递 ")}${bridge.state?.pendingMessageCount ?? 0}` }),
            (bridge.recentMessages || []).slice(-3).map((m, i) => /* @__PURE__ */ jsx("div", { style: { color: "var(--text-muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: `[${m.role}] ${m.text.slice(0, 120)}` }, i))
          ] }) : /* @__PURE__ */ jsx("div", { style: { marginTop: 4, padding: "6px 8px", background: "rgba(0,0,0,0.15)", borderRadius: 6, fontSize: 11 }, children: `${t("bridge 未连接（")}${bridge.error || t("socket 不可达")}${t("）——控制回退 control inbox 文件投递")}` });
        })(),
        run.error ? /* @__PURE__ */ jsxs("div", { style: { color: "var(--danger, #ef4444)" }, children: [
          /* @__PURE__ */ jsx("b", { children: t("错误: ") }),
          String(run.error)
        ] }) : null
      ] });
    } else if (tab === "report") {
      body = /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, overflow: "auto", margin: 8 }, children: /* @__PURE__ */ jsx("pre", { style: { ...mono, padding: 12, background: "rgba(0,0,0,0.25)", borderRadius: 6, margin: 0 }, children: String(run.logMarkdown || t("（fork 引擎无运行报告——run 未落盘或仍在进行）")) }) });
    } else if (tab === "output") {
      body = /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, overflow: "auto", margin: 8 }, children: /* @__PURE__ */ jsx("pre", { style: { ...mono, padding: 12, background: "rgba(0,0,0,0.25)", borderRadius: 6, margin: 0 }, children: String(run.output || t("(无输出)")) }) });
    } else if (tab === "tools") {
      const calls = run.toolCalls || [];
      body = /* @__PURE__ */ jsx("div", { style: { padding: 8, flex: 1, minHeight: 0, overflow: "auto" }, children: calls.length === 0 ? /* @__PURE__ */ jsx("div", { style: { color: "var(--text-muted)", fontSize: 12, padding: 8 }, children: t("(无工具调用)") }) : calls.map((tc, i) => /* @__PURE__ */ jsxs("div", { style: { padding: "4px 8px", borderBottom: "1px solid var(--border)", fontSize: 11, display: "flex", gap: 8 }, children: [
        /* @__PURE__ */ jsx("span", { style: { color: "#00d4ff", flexShrink: 0 }, children: tc.tool }),
        /* @__PURE__ */ jsx("span", { style: { color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: String(tc.args || "") })
      ] }, i)) });
    } else {
      body = /* @__PURE__ */ jsx("div", { style: { flex: 1, minHeight: 0, overflow: "auto", margin: 8 }, children: /* @__PURE__ */ jsx("pre", { style: { ...mono, padding: 12, background: "rgba(0,0,0,0.25)", borderRadius: 6, margin: 0 }, children: JSON.stringify(run, null, 2) }) });
    }
  }
  return /* @__PURE__ */ jsx("div", { style: { position: "fixed", inset: 0, zIndex: 3200, background: "rgba(0,0,0,0.35)", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }, children: /* @__PURE__ */ jsxs(
    "div",
    {
      "data-ext-float": "1",
      "data-ext-float-w": "560",
      "data-ext-float-h": "460",
      "data-ext-float-min-w": "400",
      "data-ext-float-min-h": "300",
      "data-ext-float-full": "1",
      style: { pointerEvents: "auto", width: 560, height: 460, display: "flex", flexDirection: "column", background: "var(--bg-panel)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text)", boxShadow: "0 10px 40px rgba(0,0,0,0.35)", overflow: "hidden" },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderBottom: "1px solid var(--border)", cursor: "grab", userSelect: "none" }, children: [
          /* @__PURE__ */ jsx("span", { style: { color: "var(--text-muted)", display: "flex" }, children: iconSvg(AGENT_PATHS.scout, 14) }),
          /* @__PURE__ */ jsx("span", { style: { fontSize: 13, fontWeight: 600, flex: 1 }, children: t("sa.inspectorTitle", { agent: run ? ` · ${run.agent}` : "" }) }),
          /* @__PURE__ */ jsx("button", { title: t("关闭"), "aria-label": t("关闭"), onClick: () => setInspectorOpen(false), style: { background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 2 }, children: "✕" })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 0, borderBottom: "1px solid var(--border)", background: "rgba(0,0,0,0.15)" }, children: tabs.map((tb) => /* @__PURE__ */ jsx(
          "div",
          {
            onClick: () => setTab(tb.id),
            style: {
              padding: "6px 14px",
              fontSize: 12,
              cursor: "pointer",
              borderBottom: tab === tb.id ? "2px solid #00d4ff" : "2px solid transparent",
              color: tab === tb.id ? "#00d4ff" : "var(--text-muted)"
            },
            children: tb.label
          },
          tb.id
        )) }),
        /* @__PURE__ */ jsx("div", { style: { flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }, children: body }),
        isForkDetail && /* @__PURE__ */ jsx(SteerRow, { runId: String(run.id), active: run.status === "running" })
      ]
    }
  ) });
}
function AgentsFeatureBanner({ cwd }) {
  return /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", width: "100%" }, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, flex: 1, minWidth: 200 }, children: [
      /* @__PURE__ */ jsx("span", { style: { display: "inline-flex", color: "var(--accent)" }, children: /* @__PURE__ */ jsxs("svg", { width: "15", height: "15", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
        /* @__PURE__ */ jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
        /* @__PURE__ */ jsx("circle", { cx: "9", cy: "7", r: "4" }),
        /* @__PURE__ */ jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
        /* @__PURE__ */ jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
      ] }) }),
      /* @__PURE__ */ jsx("strong", { style: { fontSize: 13 }, children: t("sa.engineTitle") }),
      /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text-muted)" }, children: t("sa.engineOnly") })
    ] }),
    /* @__PURE__ */ jsxs(
      "button",
      {
        type: "button",
        onClick: () => setFleetOpen(true),
        style: { display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg-hover)", color: "var(--accent)", cursor: "pointer", fontSize: 12, fontWeight: 600 },
        title: t("打开子代理舰队（运行总览 / 检查器 / Agent 管理）"),
        children: [
          /* @__PURE__ */ jsx("span", { style: { display: "inline-flex" }, children: /* @__PURE__ */ jsxs("svg", { width: "13", height: "13", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
            /* @__PURE__ */ jsx("path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" }),
            /* @__PURE__ */ jsx("circle", { cx: "9", cy: "7", r: "4" }),
            /* @__PURE__ */ jsx("path", { d: "M22 21v-2a4 4 0 0 0-3-3.87" }),
            /* @__PURE__ */ jsx("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })
          ] }) }),
          t("打开子代理舰队（运行总览 / 检查器 / Agent 管理）")
        ]
      }
    )
  ] });
}
function register(ctx) {
  ctx.registerItems?.("sidebarTasks", [{ id: "tasks", render: SidebarTasksSection, meta: { title: "i18n:it.tasks.title" } }]);
  __setCtx(ctx);
  const reg = ctx.registerItems;
  reg?.("toolbar", [{
    id: "aiti-subagents",
    meta: {
      label: t("子代理舰队"),
      title: t("子代理舰队"),
      icon: "icons/users.svg",
      onClick: () => {
        const st = presentState(FLEET_KEY);
        if (st === "closed" || st.startsWith("docked:")) setFleetOpen(true);
        else setFleetOpen(false);
      }
    }
  }]);
  reg?.("dialogs", [
    { id: "aiti-subagents-fleet", render: FleetDialog, meta: { label: t("子代理舰队") } },
    { id: "aiti-subagents-inspector", render: InspectorDialog, meta: { label: t("子代理检查器") } },
    { id: "aiti-subagents-agents", render: AgentsDialog, meta: { label: t("Agent 管理") } },
    { id: "aiti-subagents-concurrency", render: ConcurrencyDialog, meta: { label: t("并发配置") } }
  ]);
  seedDockDefault(FLEET_KEY, sidebarZoneOf(FLEET_KEY));
  declareDockZones(FLEET_KEY, [sidebarZoneOf(FLEET_KEY), "right-panel"], sidebarZoneOf(FLEET_KEY));
  reg?.("sidebarExplorerDock", [{ id: "fleet", render: FleetDockLeft, meta: { title: t("子代理舰队"), priority: 1, maxHeightPct: 30 } }]);
  reg?.("rightFileDock", [{ id: "fleet", render: FleetDockRight, meta: { title: t("舰队"), icon: dockIconDecl("bot") } }]);
  reg?.("settingsAgentsFeature", [{ id: "engine-banner", render: AgentsFeatureBanner }]);
  reg?.("settingsAgents", [{ id: "agents-manager", render: AgentsSettingsPanel }]);
  console.log("[aiti-subagents] client 已注册（toolbar + fleet + inspector + agents + settingsAgents（设置页签整页接管），JSX 构建版）");
}
export {
  register as default
};
