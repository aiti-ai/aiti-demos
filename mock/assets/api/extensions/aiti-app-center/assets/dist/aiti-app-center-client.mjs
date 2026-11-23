let _ctx = null;
function __setCtx(ctx) {
  _ctx = ctx;
}
function getCtx() {
  return _ctx;
}
function regSvc(key, impl) {
  const c2 = _ctx;
  return typeof c2?.registerExtService === "function" ? c2.registerExtService(key, impl) : null;
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
const useLayoutEffect = (fn, deps) => c("useLayoutEffect")(fn, deps);
const useRef = (v) => c("useRef")(v);
const useCallback = (fn, deps) => c("useCallback")(fn, deps);
const useMemo = (fn, deps) => c("useMemo")(fn, deps);
function apiUrl(p) {
  const fn = _ctx?.apiUrl;
  return typeof fn === "function" ? fn(p) : p;
}
function t(key, params) {
  const fn = _ctx?.t;
  return typeof fn === "function" ? fn(key, params) : key;
}
function ui18nExact(ui18n, locale) {
  if (!ui18n) return {};
  return ui18n[locale] ?? {};
}
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff]/;
function extNameFor(ext, locale) {
  if (!ext) return "";
  const over = ui18nExact(ext.ui?.i18n, locale)["ext.displayName"];
  if (over) return over;
  const name = ext.name ?? "";
  if (!name) return ext.id;
  return locale.startsWith("zh") ? name : CJK_RE.test(name) ? ext.id : name;
}
function extDescriptionFor(ext, locale) {
  const over = ui18nExact(ext?.ui?.i18n, locale)["ext.description"];
  if (over) return over;
  return localeText(ext?.descriptionI18n, locale) || ext?.description || "";
}
function localeText(map, locale) {
  if (!map || typeof map !== "object") return "";
  const exact = map[locale];
  if (typeof exact === "string" && exact) return exact;
  const short = locale.split("-")[0];
  const family = Object.entries(map).find(([k, v]) => typeof v === "string" && v && k.split("-")[0] === short);
  return family ? family[1] : "";
}
function featureLabelFor(ext, f, locale) {
  const ui18n = ext?.ui?.i18n;
  const over = ui18nExact(ui18n, locale)["feat." + f.id];
  if (over) return over;
  const raw = f.label != null ? String(f.label) : String(f.id);
  if (raw.startsWith("i18n:")) {
    const key = raw.slice("i18n:".length);
    const tbl = ui18n?.[locale] ?? ui18n?.[locale.split("-")[0]] ?? ui18n?.en ?? Object.values(ui18n ?? {})[0];
    return tbl?.[key] ?? key;
  }
  return raw;
}
function featureDescriptionFor(ext, f, locale) {
  const over = ui18nExact(ext?.ui?.i18n, locale)["feat." + f.id + ".desc"];
  if (over) return over;
  return f.description != null ? String(f.description) : "";
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
const INTERNAL_CATEGORIES = ["session", "code", "ai", "auto", "debug", "ui", "system", "other"];
const DEFAULT_CATEGORY = "other";
const FLAT_MODE_THRESHOLD = 12;
const PINNED_KEY = "pi:app-center:pinned:v1";
const HIDDEN_KEY = "pi:app-center:hidden:v1";
const APP_STORE_EVENT = "pi:app-center:store";
const APP_OVERRIDES = {
  // session 会话与项目
  "session-manager": { category: "session", keywords: ["sessions", "会话"] },
  "aiti-folder": { category: "session", keywords: ["folder", "文件夹", "文件", "终端", "terminal"] },
  "aiti-draft-keeper": { category: "session", keywords: ["draft", "草稿"] },
  "aiti-recovery": { category: "session", keywords: ["recovery", "恢复"] },
  "aiti-session-cards": { category: "session", keywords: ["request", "请求卡"] },
  "aiti-quickstart": { category: "session", keywords: ["quickstart", "上手", "指南", "guide", "welcome"] },
  // code 代码与 Git
  "aiti-editor": { category: "code", keywords: ["editor", "编辑"] },
  "aiti-git-ops": { category: "code", keywords: ["git", "分支"] },
  "aiti-git-review": { category: "code", keywords: ["review", "审核", "diff"] },
  "aiti-git-trace": { category: "code", keywords: ["trace", "改动"] },
  "aiti-ctx-meter": { category: "code", keywords: ["context", "上下文"] },
  // ai 模型与 AI
  "aiti-model-check": { category: "ai", keywords: ["model", "模型", "429"] },
  "aiti-model-wizard": { category: "ai", keywords: ["model", "聚合", "多 key"] },
  "aiti-provider-usage": { category: "ai", keywords: ["quota", "余额", "额度"] },
  "aiti-ai-usage": { category: "ai", keywords: ["usage", "用量"] },
  "aiti-ai-input": { category: "ai", keywords: ["usage", "用量"] },
  "aiti-prompts": { category: "ai", keywords: ["prompt", "提示词"] },
  "aiti-plan-first": { category: "ai", keywords: ["plan", "方案"] },
  "aiti-plan-review": { category: "ai", keywords: ["plan", "评审"] },
  "aiti-models-import": { category: "ai", keywords: ["models", "导入"] },
  // auto 自动化与 Agent
  "aiti-ai-schedule": { category: "auto", keywords: ["schedule", "定时", "任务"] },
  "aiti-subagents": { category: "auto", keywords: ["subagent", "子代理", "舰队"] },
  "aiti-agent-manager": { category: "auto", keywords: ["agent", "登录"] },
  "aiti-custom-agent": { category: "auto", keywords: ["agent", "自定义"] },
  "aiti-cmd": { category: "auto", keywords: ["terminal", "终端", "命令"] },
  "aiti-queue-keeper": { category: "auto", keywords: ["queue", "队列"] },
  "aiti-ai-speek": { category: "auto", keywords: ["tts", "朗读"] },
  "aiti-attach-agent": { category: "auto", keywords: ["bridge", "桥"] },
  // debug 调试与观测
  "aiti-devtools": { category: "debug", keywords: ["devtools", "调试", "注入"] },
  "aiti-debug-inject": { category: "debug", keywords: ["inject", "注入"] },
  "aiti-ui-env": { category: "debug", keywords: ["ui", "虚拟屏", "vnc"] },
  "aiti-testagent-native": { category: "debug", keywords: ["testagent-native", "tan", "native"] },
  "aiti-testagent": { category: "debug", keywords: ["java", "testagent"] },
  "aiti-cpu-meter": { category: "debug", keywords: ["cpu", "监控"] },
  "aiti-bridge-probe": { category: "debug", keywords: ["bridge", "探针"] },
  // ui 界面与阅读
  "aiti-float": { category: "ui", keywords: ["float", "浮窗"] },
  "aiti-msg-smart": { category: "ui", keywords: ["message", "消息"] },
  "aiti-msg-nav": { category: "ui", keywords: ["message", "导航"] },
  "aiti-msg-anchor": { category: "ui", keywords: ["message", "锚点"] },
  "aiti-word-docx-preview": { category: "ui", keywords: ["docx", "word"] },
  "aiti-word-superdoc": { category: "ui", keywords: ["docx", "word"] },
  "aiti-sheet-univer": { category: "ui", keywords: ["sheet", "表格"] },
  "aiti-onlyoffice": { category: "ui", keywords: ["office", "文档"] },
  "aiti-doc-center": { category: "ui", keywords: ["docs", "文档"] },
  "aiti-mail": { category: "ui", keywords: ["mail", "邮件"] },
  // system 系统与管理
  "aiti-extman": { category: "system", keywords: ["extensions", "扩展", "插件"] },
  "aiti-configs": { category: "system", keywords: ["backup", "配置", "备份"] },
  "aiti-backup": { category: "system", keywords: ["backup", "备份"] },
  "service-tunnels": { category: "system", keywords: ["ports", "端口", "隧道"] },
  "aiti-event-bus": { category: "system", keywords: ["event", "事件", "sse"] },
  "aiti-append-system": { category: "system", keywords: ["append", "系统提示词"] },
  "aiti-model-recent": { category: "system", keywords: ["recent", "最近"] },
  "aiti-crash-fatal": { category: "system", keywords: ["crash", "崩溃"] },
  "aiti-app-center": { category: "system", keywords: ["apps", "应用"] }
};
function resolveCategory(itemLevel, extLevel, extId) {
  const v = itemLevel && String(itemLevel).trim() || extLevel && String(extLevel).trim() || APP_OVERRIDES[extId]?.category || DEFAULT_CATEGORY;
  return String(v).trim() || DEFAULT_CATEGORY;
}
function keywordList(v) {
  return Array.isArray(v) ? v.filter((k) => typeof k === "string" && k.trim().length > 0) : [];
}
function isInternalCategory(id) {
  return INTERNAL_CATEGORIES.includes(id);
}
function categoryLabel(id, t2) {
  return isInternalCategory(id) ? t2(`cat.${id}`) : id;
}
function categorySortKey(id) {
  const idx = INTERNAL_CATEGORIES.indexOf(id);
  return idx >= 0 ? String(idx).padStart(2, "0") : `99${id}`;
}
function viewMode(totalApps) {
  return totalApps <= FLAT_MODE_THRESHOLD ? "flat" : "two-segment";
}
const MORE_COLLAPSE_PINNED_ROWS = 2;
const PINNED_CARD_MIN = 64;
const PINNED_COL_GAP = 6;
function pinnedGridColumns(contentWidth) {
  if (!(contentWidth > 0)) return 1;
  return Math.max(1, Math.floor((contentWidth + PINNED_COL_GAP) / (PINNED_CARD_MIN + PINNED_COL_GAP)));
}
function pinnedRowsNeeded(pinnedCount, contentWidth) {
  return Math.floor(pinnedCount / pinnedGridColumns(contentWidth));
}
function matchApp(app, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [app.label, app.extId, app.extName ?? "", ...app.keywords ?? [], app.pinyin ?? ""].join("\n").toLowerCase();
  const qNorm = q.replace(/\s+/g, "");
  return q.split(/\s+/).every((tok) => hay.includes(tok)) || !!qNorm && hay.includes(qNorm) || typoMatch(q, hay) || !!qNorm && typoMatch(qNorm, hay);
}
function readIdList(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x === "string");
  } catch {
    return [];
  }
}
function writeIdList(key, ids) {
  try {
    if (ids.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(ids));
  } catch {
  }
  try {
    window.dispatchEvent(new CustomEvent(APP_STORE_EVENT, { detail: { key } }));
  } catch {
  }
}
function readPinned() {
  return readIdList(PINNED_KEY);
}
function writePinned(ids) {
  writeIdList(PINNED_KEY, [...new Set(ids)]);
}
function readHidden() {
  return readIdList(HIDDEN_KEY);
}
function writeHidden(ids) {
  writeIdList(HIDDEN_KEY, [...new Set(ids)]);
}
function togglePinned(appId) {
  const cur = readPinned();
  writePinned(cur.includes(appId) ? cur.filter((x) => x !== appId) : [...cur, appId]);
}
function toggleHidden(appId) {
  const cur = readHidden();
  writeHidden(cur.includes(appId) ? cur.filter((x) => x !== appId) : [...cur, appId]);
}
function movePinned(appId, delta) {
  const cur = readPinned();
  const i = cur.indexOf(appId);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= cur.length) return;
  [cur[i], cur[j]] = [cur[j], cur[i]];
  writePinned(cur);
}
const TOGGLE_PREFIX = "toggle:";
function isToggleId(id) {
  return id.startsWith(TOGGLE_PREFIX);
}
function pruneToggleIds() {
  const pinned = readPinned();
  const hidden = readHidden();
  const keepPinned = pinned.filter((x) => !isToggleId(x));
  const keepHidden = hidden.filter((x) => !isToggleId(x));
  const removed = pinned.length - keepPinned.length + (hidden.length - keepHidden.length);
  if (removed === 0) return 0;
  writePinned(keepPinned);
  writeHidden(keepHidden);
  return removed;
}
function hideApp(appId) {
  const cur = readHidden();
  if (!cur.includes(appId)) writeHidden([...cur, appId]);
}
function currentUiLocale() {
  try {
    const v = localStorage.getItem("pi-locale");
    if (v === "zh-CN" || v === "zh-TW" || v === "en") return v;
  } catch {
  }
  return "en";
}
function i18nTableFor(ui18n, locale) {
  if (!ui18n) return {};
  const short = locale.split("-")[0];
  return ui18n[locale] ?? ui18n[short] ?? (short === "zh" ? ui18n["zh-CN"] : void 0) ?? ui18n.en ?? Object.values(ui18n)[0] ?? {};
}
function translateExtItemText(extId, text, ui18n, locale) {
  if (!text) return "";
  if (!extId || !text.startsWith("i18n:")) return text;
  const key = text.slice("i18n:".length);
  return i18nTableFor(ui18n, locale)[key] ?? key;
}
function buildApps(input) {
  const locale = input.locale ?? currentUiLocale();
  const out = [];
  const seen = /* @__PURE__ */ new Set();
  const extById = new Map(input.exts.map((e) => [e.id, e]));
  for (const it of input.slotItems) {
    const colon = it.id.indexOf(":");
    const extId = it.extId ?? (colon > 0 ? it.id.slice(0, colon) : "");
    if (!extId) continue;
    const ext = extById.get(extId);
    const isPanel = it.slot === "rightFileDock";
    if (!isPanel && typeof it.meta?.onClick !== "function") continue;
    if (it.slot === "dialogs") continue;
    const feat = it.feature;
    if (feat && input.featureState[`${extId}:${feat}`] === false) continue;
    if (isPanel && it.static) continue;
    const kind = isPanel ? "panel" : it.slot === "sidebarFooter" ? "manage" : "action";
    const fullId = it.id.startsWith(`${extId}:`) ? it.id : `${extId}:${it.id}`;
    const id = `${kind}:${fullId}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const ui18n = ext?.ui?.i18n;
    const label = translateExtItemText(extId, it.meta?.label, ui18n, locale) || translateExtItemText(extId, it.meta?.title, ui18n, locale) || String(colon > 0 ? it.id.slice(colon + 1) : it.id);
    out.push({
      id,
      kind,
      category: resolveCategory(it.category ?? it.meta?.category, ext?.category, extId),
      label,
      extId,
      extName: extNameFor(ext, locale),
      extVersion: ext?.version,
      extDescription: extDescriptionFor(ext, locale) || void 0,
      pinyin: input.pinyinMap?.[extId],
      extIcon: ext?.icon ?? void 0,
      icon: it.meta?.icon,
      // Search vocabulary, most specific first: item-declared keywords → extension-declared keywords
      // (manifest pass-through) → the legacy override table (existing extensions only; new ones must
      // self-declare — see the APP_OVERRIDES header). An extension that declares an (even empty) keywords
      // array owns the vocabulary; the legacy table only fills in for extensions that declare nothing.
      keywords: [
        ...keywordList(it.meta?.keywords),
        ...Array.isArray(ext?.keywords) ? keywordList(ext.keywords) : keywordList(APP_OVERRIDES[extId]?.keywords)
      ],
      run: isPanel ? () => input.openPanel(fullId) : () => {
        try {
          it.meta.onClick(void 0);
        } catch {
        }
      }
    });
  }
  for (const ext of input.exts) {
    for (const f of ext.features ?? []) {
      if (f.type && f.type !== "boolean") continue;
      const id = `toggle:${ext.id}:${f.id}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const rawLabel = f.label != null ? String(f.label) : String(f.id);
      out.push({
        id,
        kind: "toggle",
        category: resolveCategory(f.category, ext.category, ext.id),
        label: featureLabelFor(ext, f, locale) || rawLabel,
        featureDescription: featureDescriptionFor(ext, f, locale) || void 0,
        extId: ext.id,
        extName: extNameFor(ext, locale),
        extVersion: ext.version,
        extDescription: extDescriptionFor(ext, locale) || void 0,
        pinyin: input.pinyinMap?.[ext.id],
        extIcon: ext.icon ?? void 0,
        // Same precedence as item cards: extension keywords (self-declared) first, legacy table as fallback;
        // the feature id itself stays searchable (it is the toggle's stable identifier).
        keywords: [...Array.isArray(ext.keywords) ? keywordList(ext.keywords) : keywordList(APP_OVERRIDES[ext.id]?.keywords), f.id],
        on: input.featureState[`${ext.id}:${f.id}`] ?? f.enabled !== false,
        run: () => {
        }
      });
    }
  }
  const rank = (k) => k === "panel" ? 0 : k === "toggle" ? 1 : 2;
  const best = /* @__PURE__ */ new Map();
  const order = [];
  for (const a of out) {
    const key = `${a.kind === "toggle" ? "t" : "e"}
${a.extId}
${a.label}`;
    const prev = best.get(key);
    if (!prev) {
      best.set(key, a);
      order.push(key);
      continue;
    }
    if (rank(a.kind) < rank(prev.kind)) best.set(key, a);
  }
  return order.map((k) => best.get(k));
}
async function setBooleanFeature(apiUrlFn, extId, featureId, enabled) {
  try {
    const res = await fetch(apiUrlFn("/api/extensions/aiti-extman/ops"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "set-feature", id: extId, featureId, enabled })
    });
    if (!res.ok) return false;
    try {
      window.dispatchEvent(new CustomEvent("pi-web:ext-features-changed", { detail: { extId, featureId, enabled } }));
    } catch {
    }
    return true;
  } catch {
    return false;
  }
}
function splitByKind(apps) {
  const entries = [];
  const toggles = [];
  for (const a of apps) (a.kind === "toggle" ? toggles : entries).push(a);
  return { entries, toggles };
}
function extensionToggleGroups(apps) {
  const byExt = /* @__PURE__ */ new Map();
  for (const a of apps) {
    if (a.kind !== "toggle") continue;
    let g = byExt.get(a.extId);
    if (!g) {
      g = { extId: a.extId, extName: a.extName, extIcon: a.extIcon, apps: [] };
      byExt.set(a.extId, g);
    }
    g.apps.push(a);
  }
  return [...byExt.values()].sort((x, y) => (x.extName ?? x.extId).localeCompare(y.extName ?? y.extId));
}
function hardDependents(exts, extId) {
  const provides = new Set(exts.find((e) => e.id === extId)?.provides ?? []);
  const names = /* @__PURE__ */ new Set();
  for (const e of exts) {
    if (e.id === extId) continue;
    const hit = (e.dependsOn ?? []).some(
      (d) => d === extId || d.startsWith(`${extId}.`) || d.startsWith(`${extId}:`) || provides.has(d)
    );
    if (hit) names.add(e.name ?? e.id);
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
async function disableExtension(apiUrlFn, extId) {
  try {
    const res = await fetch(apiUrlFn("/api/extensions/aiti-extman/ops"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "disable", id: extId })
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body?.error) return { ok: false, error: String(body?.error ?? `HTTP ${res.status}`) };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
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
function sidebarZoneOf(itemKey) {
  return `sidebar:${itemKey}`;
}
function isSidebarDockState(state) {
  return state === "docked:sidebar-explorer" || state.startsWith("docked:sidebar:");
}
const SIDEBAR_DISMISS_PREFIX = "pi:sidebar-dock:dismissed:";
function writeBlockDismissed(blockKey, dismissed) {
  try {
    if (dismissed) localStorage.setItem(SIDEBAR_DISMISS_PREFIX + blockKey, "1");
    else localStorage.removeItem(SIDEBAR_DISMISS_PREFIX + blockKey);
  } catch {
  }
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
function dockPref(k) {
  const api = floatApi();
  if (api) return api.dockPref(k) ?? null;
  try {
    return localStorage.getItem(DOCKPREF_KEY(k));
  } catch {
    return null;
  }
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
function openPanel(key) {
  try {
    const cur = presentState(key);
    if (cur.startsWith("docked:")) {
      const zone = cur.slice("docked:".length);
      if (zone) {
        present(key, `dock:${zone}`);
        return;
      }
    }
    const pref = dockPref(key);
    if (pref && pref !== "float") {
      present(key, `dock:${pref}`);
      return;
    }
    present(key, "dock:right-panel");
  } catch {
  }
}
const MANIFEST_TTL_MS = 3e4;
let extsCache = null;
let extsInflight = null;
function primeCommandsCache() {
  void loadExts();
}
async function loadExts() {
  if (extsCache && Date.now() - extsCache.at < MANIFEST_TTL_MS) return extsCache.exts;
  if (extsInflight) return extsInflight;
  extsInflight = (async () => {
    try {
      const res = await fetch(apiUrl("/api/extensions/manifest"));
      const d = await res.json();
      const exts = Array.isArray(d?.extensions) ? d.extensions : [];
      extsCache = { at: Date.now(), exts };
      return exts;
    } catch {
      return extsCache?.exts ?? [];
    } finally {
      extsInflight = null;
    }
  })();
  return extsInflight;
}
const featureOverlay = {};
let overlayBound = false;
function bindFeatureOverlay() {
  if (overlayBound || typeof window === "undefined") return;
  overlayBound = true;
  window.addEventListener("pi-web:ext-features-changed", ((e) => {
    const d = e.detail;
    if (!d?.extId || !d?.featureId) return;
    featureOverlay[`${d.extId}:${d.featureId}`] = d.value !== void 0 ? d.value !== "" : d.enabled !== false;
  }));
}
function currentFeatureState(exts) {
  const m = {};
  for (const e of exts) {
    for (const f of e.features ?? []) {
      if (f.type && f.type !== "boolean") continue;
      const key = `${e.id}:${f.id}`;
      m[key] = featureOverlay[key] ?? f.enabled !== false;
    }
  }
  return m;
}
let pinyinMapCache = null;
async function loadPinyinMap() {
  if (pinyinMapCache) return pinyinMapCache;
  try {
    const d = await fetch(apiUrl("/api/extensions/aiti-extman/status")).then((r) => r.json());
    const next = {};
    const exts = d?.extensions ?? {};
    for (const id of Object.keys(exts)) {
      const p = exts[id]?.pinyin;
      if (typeof p === "string" && p) next[id] = p;
    }
    pinyinMapCache = next;
  } catch {
    pinyinMapCache = {};
  }
  return pinyinMapCache;
}
function buildCommandHints(input) {
  const limit = input.limit ?? 5;
  const q = String(input.q ?? "").trim();
  const apps = buildApps({
    exts: input.exts,
    slotItems: input.slotItems,
    featureState: input.featureState,
    openPanel: input.openPanelFn,
    locale: currentUiLocale(),
    // query 时现读：静态条目 "i18n:" 标签按当前 locale 出成品文案
    pinyinMap: input.pinyinMap
  });
  const hiddenSet = new Set(input.hidden);
  const qEmpty = !q;
  let list = apps.filter((a) => a.kind === "toggle" || !hiddenSet.has(a.id));
  const pinnedSet = new Set(input.pinned);
  if (qEmpty) list = list.filter((a) => pinnedSet.has(a.id));
  else list = list.filter((a) => matchApp(a, q));
  const pinnedIdx = new Map(input.pinned.map((id, i) => [id, i]));
  const ranked = list.map((a, idx) => ({ a, idx, pin: pinnedIdx.get(a.id) })).sort((x, y) => {
    if (x.pin != null && y.pin != null) return x.pin - y.pin;
    if (x.pin != null) return -1;
    if (y.pin != null) return 1;
    return x.idx - y.idx;
  }).map((x) => x.a);
  return ranked.slice(0, limit).map((a) => toHint(a, input));
}
function toHint(a, input) {
  const hint = {
    id: a.id,
    kind: a.kind,
    label: a.label,
    extId: a.extId,
    extName: a.extName,
    category: input.categoryText(a.category),
    icon: a.icon,
    run: a.kind === "toggle" ? () => {
      const featureId = a.id.slice(`toggle:${a.extId}:`.length);
      void setBooleanFeature(input.apiUrlFn, a.extId, featureId, a.on !== true);
    } : a.run
  };
  if (a.kind === "toggle") hint.on = a.on === true;
  return hint;
}
async function queryCommands(q, limit = 5) {
  bindFeatureOverlay();
  const ctx = getCtx();
  const getSlotItems = ctx?.getSlotItems;
  if (typeof getSlotItems !== "function") return [];
  const exts = await loadExts();
  const pick = (slot) => getSlotItems(slot).map((it) => ({ ...it, slot }));
  return buildCommandHints({
    q,
    limit,
    exts,
    slotItems: [
      ...pick("toolbar"),
      ...pick("commands"),
      // 命令目录槽（dialogs 同型目录槽，无渲染点；kind=action）
      ...pick("sidebarFooter"),
      ...pick("rightFileDock")
    ],
    featureState: currentFeatureState(exts),
    pinned: readPinned(),
    hidden: readHidden(),
    openPanelFn: openPanel,
    apiUrlFn: apiUrl,
    categoryText: (id) => categoryLabel(id, t),
    pinyinMap: await loadPinyinMap()
  });
}
function registerCommandsService() {
  primeCommandsCache();
  return regSvc("aiti-app-center.commands", { query: queryCommands });
}
const IS_TOUCH = typeof matchMedia === "function" && matchMedia("(hover: none)").matches;
const DISABLE_PROTECT = {
  "aiti-app-center": "info.disableSelf",
  "aiti-extman": "info.disableManager"
};
function useManifestExts() {
  const [exts, setExts] = useState([]);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    let alive = true;
    fetch(apiUrl("/api/extensions/manifest")).then((r) => r.json()).then((d) => {
      if (alive && d && Array.isArray(d.extensions)) setExts(d.extensions);
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, [nonce]);
  return { exts, refresh: () => setNonce((n) => n + 1) };
}
function usePinyinMap() {
  const [map, setMap] = useState({});
  useEffect(() => {
    let alive = true;
    fetch(apiUrl("/api/extensions/aiti-extman/status")).then((r) => r.json()).then((d) => {
      if (!alive) return;
      const next = {};
      const exts = d?.extensions ?? {};
      for (const id of Object.keys(exts)) {
        const p = exts[id]?.pinyin;
        if (typeof p === "string" && p) next[id] = p;
      }
      setMap(next);
    }).catch(() => {
    });
    return () => {
      alive = false;
    };
  }, []);
  return map;
}
function useFeatureOverlay() {
  const [overlay, setOverlay] = useState({});
  useEffect(() => {
    const on = (e) => {
      const d = e.detail;
      if (!d?.extId || !d?.featureId) return;
      setOverlay((m) => ({ ...m, [`${d.extId}:${d.featureId}`]: d.value !== void 0 ? d.value !== "" : d.enabled !== false }));
    };
    window.addEventListener("pi-web:ext-features-changed", on);
    return () => window.removeEventListener("pi-web:ext-features-changed", on);
  }, []);
  const dropExt = (extId) => setOverlay((m) => {
    let changed = false;
    const next = {};
    for (const [k, v] of Object.entries(m)) {
      if (k.startsWith(`${extId}:`)) {
        changed = true;
        continue;
      }
      next[k] = v;
    }
    return changed ? next : m;
  });
  return { overlay, dropExt };
}
function IconGlyph(props) {
  const { icon, extId, label, size = 20 } = props;
  if (icon && typeof icon === "object" && "svg" in icon) {
    return /* @__PURE__ */ jsx(
      "svg",
      {
        width: size,
        height: size,
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: 2,
        strokeLinecap: "round",
        strokeLinejoin: "round",
        "aria-hidden": "true",
        dangerouslySetInnerHTML: { __html: icon.svg }
      }
    );
  }
  if (typeof icon === "string" && icon.endsWith(".svg")) {
    const url = apiUrl(`/api/extensions/${extId}/assets/${icon}`);
    return /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: {
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
  if (typeof icon === "string" && icon) {
    return /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: { fontSize: size - 4, lineHeight: 1 }, children: icon });
  }
  return /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: { fontSize: size - 6, fontWeight: 600, lineHeight: 1 }, children: label.slice(0, 1) });
}
const iconProps = {
  width: 14,
  height: 14,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true
};
const EditIcon = () => /* @__PURE__ */ jsxs("svg", { ...iconProps, children: [
  /* @__PURE__ */ jsx("path", { d: "M12 20h9" }),
  /* @__PURE__ */ jsx("path", { d: "M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" })
] });
const PlusIcon = () => /* @__PURE__ */ jsxs("svg", { ...iconProps, children: [
  /* @__PURE__ */ jsx("path", { d: "M5 12h14" }),
  /* @__PURE__ */ jsx("path", { d: "M12 5v14" })
] });
const SlidersIcon = () => /* @__PURE__ */ jsxs("svg", { ...iconProps, children: [
  /* @__PURE__ */ jsx("path", { d: "M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3" }),
  /* @__PURE__ */ jsx("path", { d: "M14 2v4M8 10v4M16 18v4" })
] });
const GridIcon = () => /* @__PURE__ */ jsxs("svg", { ...iconProps, children: [
  /* @__PURE__ */ jsx("rect", { width: "7", height: "7", x: "3", y: "3", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { width: "7", height: "7", x: "14", y: "3", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { width: "7", height: "7", x: "14", y: "14", rx: "1" }),
  /* @__PURE__ */ jsx("rect", { width: "7", height: "7", x: "3", y: "14", rx: "1" })
] });
const miniBtn = (active, danger) => ({
  width: 26,
  height: 26,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: 6,
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 12,
  lineHeight: 1,
  background: active ? "var(--bg-selected, #2a2a2a)" : "none",
  color: danger ? "var(--text-dim, #888)" : active ? "var(--accent, #2563eb)" : "var(--text-muted, #888)"
});
const cardOpsBtn = (active, danger) => ({
  width: 16,
  height: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  borderRadius: 4,
  padding: 0,
  cursor: "pointer",
  fontFamily: "inherit",
  fontSize: 10,
  lineHeight: 1,
  background: "transparent",
  color: danger ? "var(--text-dim, #888)" : active ? "var(--accent, #2563eb)" : "var(--text-muted, #999)"
});
const badgeHover = {
  onMouseEnter: (e) => {
    e.currentTarget.style.color = "var(--accent, #2563eb)";
  },
  onMouseLeave: (e) => {
    e.currentTarget.style.color = "";
  }
};
const iconCornerInset = "calc((100% - 52px) / 2 + 2px)";
function HeaderButton(props) {
  const { title, onClick, active, children } = props;
  return /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      title,
      "aria-label": title,
      "aria-pressed": active,
      onClick,
      style: {
        width: 28,
        height: 28,
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        border: "1px solid var(--border, #3a3a3a)",
        borderRadius: 8,
        padding: 0,
        cursor: "pointer",
        background: active ? "var(--bg-selected, #2a2a2a)" : "none",
        color: active ? "var(--accent, #2563eb)" : "var(--text-muted, #999)"
      },
      children
    }
  );
}
function AppCard(props) {
  const { app, edit, pinned, infoActive, onRun, onInfo, onMove } = props;
  const [hover, setHover] = useState(false);
  const showOps = edit || hover || IS_TOUCH;
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-app-card": app.id,
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, minWidth: 0 },
      children: [
        /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            title: `${app.label}${app.extName ? ` · ${app.extName}` : ""}`,
            "aria-label": app.label,
            onClick: () => onRun(app),
            style: {
              width: 52,
              height: 52,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0,
              background: "var(--bg-hover, #232323)",
              border: "1px solid var(--border, #3a3a3a)",
              borderRadius: 13,
              color: "var(--text-muted, #999)",
              cursor: "pointer",
              padding: 0,
              position: "relative",
              transition: "background 0.12s, color 0.12s, border-color 0.12s"
            },
            onMouseEnter: (e) => {
              e.currentTarget.style.background = "var(--bg-selected, #2a2a2a)";
              e.currentTarget.style.color = "var(--accent, #2563eb)";
            },
            onMouseLeave: (e) => {
              e.currentTarget.style.background = "var(--bg-hover, #232323)";
              e.currentTarget.style.color = "var(--text-muted, #999)";
            },
            children: /* @__PURE__ */ jsx(IconGlyph, { icon: app.icon, extId: app.extId, label: app.label })
          }
        ),
        /* @__PURE__ */ jsx("span", { style: { fontSize: 10, lineHeight: 1.3, color: "var(--text-muted, #999)", textAlign: "center", width: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", userSelect: "none" }, children: app.label }),
        showOps ? /* @__PURE__ */ jsxs("span", { style: { position: "absolute", top: 2, left: iconCornerInset, display: "flex", alignItems: "center", gap: 2, zIndex: 2 }, children: [
          /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              title: pinned ? t("app.unpin") : t("app.pin"),
              "aria-label": pinned ? t("app.unpin") : t("app.pin"),
              style: cardOpsBtn(pinned),
              ...badgeHover,
              onClick: () => togglePinned(app.id),
              children: /* @__PURE__ */ jsx(
                "svg",
                {
                  width: 10,
                  height: 10,
                  viewBox: "0 0 24 24",
                  fill: pinned ? "currentColor" : "none",
                  stroke: "currentColor",
                  strokeWidth: 2,
                  strokeLinecap: "round",
                  strokeLinejoin: "round",
                  "aria-hidden": "true",
                  children: /* @__PURE__ */ jsx("polygon", { points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" })
                }
              )
            }
          ),
          edit ? /* @__PURE__ */ jsx(
            "button",
            {
              type: "button",
              title: t("app.hide"),
              "aria-label": t("app.hide"),
              style: cardOpsBtn(false, true),
              ...badgeHover,
              onClick: () => hideApp(app.id),
              children: "✕"
            }
          ) : null
        ] }) : null,
        showOps ? /* @__PURE__ */ jsx("span", { style: { position: "absolute", top: 2, right: iconCornerInset, display: "flex", alignItems: "center", zIndex: 2 }, children: /* @__PURE__ */ jsx(
          "button",
          {
            type: "button",
            title: t("info.title"),
            "aria-label": t("info.title"),
            style: cardOpsBtn(infoActive),
            ...badgeHover,
            onClick: () => onInfo(app),
            children: "?"
          }
        ) }) : null,
        edit && pinned && onMove ? /* @__PURE__ */ jsxs("span", { style: { position: "absolute", top: 32, right: iconCornerInset, display: "flex", gap: 2, zIndex: 2 }, children: [
          /* @__PURE__ */ jsx("button", { type: "button", title: t("app.up"), "aria-label": t("app.up"), style: cardOpsBtn(), ...badgeHover, onClick: () => onMove(app.id, -1), children: "▲" }),
          /* @__PURE__ */ jsx("button", { type: "button", title: t("app.down"), "aria-label": t("app.down"), style: cardOpsBtn(), ...badgeHover, onClick: () => onMove(app.id, 1), children: "▼" })
        ] }) : null
      ]
    }
  );
}
const sectionHead = { fontSize: 10, fontWeight: 600, color: "var(--text-dim, #888)", letterSpacing: "0.05em", textTransform: "uppercase", padding: "2px 2px 0", userSelect: "none" };
const gridStyle = { display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${PINNED_CARD_MIN}px, 1fr))`, gap: `10px ${PINNED_COL_GAP}px`, width: "100%" };
const chipBtn = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  alignSelf: "flex-start",
  background: "none",
  border: "1px solid var(--border, #3a3a3a)",
  borderRadius: 7,
  padding: "3px 9px",
  fontSize: 11,
  fontFamily: "inherit",
  cursor: "pointer"
};
function CategorySection(props) {
  const { id, apps, edit, pinnedSet, infoId, onRun, onInfo, onMove } = props;
  return /* @__PURE__ */ jsxs("div", { "data-app-category": id, style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
    /* @__PURE__ */ jsxs("span", { style: sectionHead, children: [
      categoryLabel(id, t),
      "（",
      apps.length,
      "）"
    ] }),
    /* @__PURE__ */ jsx("div", { style: gridStyle, children: apps.map((a) => /* @__PURE__ */ jsx(
      AppCard,
      {
        app: a,
        edit,
        pinned: pinnedSet.has(a.id),
        infoActive: infoId === a.id,
        onRun,
        onInfo,
        onMove
      },
      a.id
    )) })
  ] });
}
function ToggleRow(props) {
  const { app, onToggle } = props;
  const on = app.on === true;
  const flip = () => onToggle(app);
  return /* @__PURE__ */ jsxs(
    "div",
    {
      role: "switch",
      "aria-checked": on,
      tabIndex: 0,
      "data-app-toggle-row": app.id,
      title: app.featureDescription ? `${app.label} · ${app.featureDescription}` : app.label,
      onClick: flip,
      onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          flip();
        }
      },
      style: {
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 2px",
        cursor: "pointer",
        borderTop: "1px solid var(--border, #2f2f2f)"
      },
      children: [
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: {
          width: 7,
          height: 7,
          flexShrink: 0,
          borderRadius: "50%",
          background: on ? "var(--ok, #4ade80)" : "var(--text-dim, #666)",
          boxShadow: on ? "0 0 0 2px color-mix(in srgb, var(--ok, #4ade80) 18%, transparent)" : "none"
        } }),
        /* @__PURE__ */ jsxs("span", { style: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }, children: [
          /* @__PURE__ */ jsx("span", { style: { fontSize: 12, color: "var(--text, #ddd)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: app.label }),
          app.featureDescription ? /* @__PURE__ */ jsx("span", { style: { fontSize: 10, color: "var(--text-dim, #888)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: app.featureDescription }) : null
        ] }),
        /* @__PURE__ */ jsx("span", { "aria-hidden": true, style: {
          width: 30,
          height: 17,
          flexShrink: 0,
          borderRadius: 999,
          position: "relative",
          background: on ? "var(--accent, #2563eb)" : "var(--bg-selected, #2a2a2a)",
          border: "1px solid var(--border, #3a3a3a)",
          transition: "background 0.12s"
        }, children: /* @__PURE__ */ jsx("span", { style: {
          position: "absolute",
          top: 2,
          left: on ? 15 : 2,
          width: 11,
          height: 11,
          borderRadius: "50%",
          background: on ? "#fff" : "var(--text-dim, #888)",
          transition: "left 0.12s"
        } }) })
      ]
    }
  );
}
function ToggleGroupBlock(props) {
  const { group, onToggle } = props;
  return /* @__PURE__ */ jsxs("div", { "data-toggle-group": group.extId, style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
    /* @__PURE__ */ jsxs("span", { style: { ...sectionHead, display: "flex", alignItems: "center", gap: 5, textTransform: "none", fontSize: 11 }, children: [
      /* @__PURE__ */ jsx(IconGlyph, { icon: group.extIcon, extId: group.extId, label: group.extName ?? group.extId, size: 13 }),
      group.extName ?? group.extId,
      /* @__PURE__ */ jsxs("span", { style: { opacity: 0.65, fontWeight: 400 }, children: [
        "（",
        group.apps.length,
        "）"
      ] })
    ] }),
    group.apps.map((a) => /* @__PURE__ */ jsx(ToggleRow, { app: a, onToggle }, a.id))
  ] });
}
function InfoSheet(props) {
  const { app, toggles, dependents, pinned, canDisable, protectKey, confirm, busy, error } = props;
  const bodyRow = { fontSize: 11, color: "var(--text-dim, #888)", lineHeight: 1.5, wordBreak: "break-all" };
  return /* @__PURE__ */ jsxs(
    "div",
    {
      "data-app-info-sheet": app.id,
      style: {
        position: "absolute",
        left: 8,
        right: 8,
        top: 48,
        bottom: 8,
        zIndex: 5,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--bg-panel, #1b1b1b)",
        border: "1px solid var(--border, #3a3a3a)",
        borderRadius: 10,
        boxShadow: "0 8px 28px rgba(0,0,0,0.45)",
        padding: "10px 12px"
      },
      children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }, children: [
          /* @__PURE__ */ jsx(IconGlyph, { icon: app.icon, extId: app.extId, label: app.label, size: 16 }),
          /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0, fontSize: 13, color: "var(--text, #ddd)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }, children: app.label }),
          /* @__PURE__ */ jsx("button", { type: "button", title: t("info.close"), "aria-label": t("info.close"), style: miniBtn(), onClick: props.onClose, children: "✕" })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsx("span", { style: sectionHead, children: t("info.source") }),
            /* @__PURE__ */ jsxs("span", { style: bodyRow, children: [
              app.extName ?? app.extId,
              " · ",
              app.extId,
              app.extVersion ? ` · ${app.extVersion}` : ""
            ] }),
            /* @__PURE__ */ jsx("span", { style: { ...bodyRow, color: "var(--text-muted, #999)" }, children: app.extDescription || t("info.noDesc") })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsx("span", { style: sectionHead, children: t("info.function") }),
            /* @__PURE__ */ jsxs("span", { style: bodyRow, children: [
              t(`kind.${app.kind}`),
              " · ",
              app.label
            ] })
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 6, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                style: { ...chipBtn, color: pinned ? "var(--accent, #2563eb)" : "var(--text-muted, #999)" },
                onClick: () => props.onPin(app),
                children: pinned ? `${t("app.unpin")}` : `${t("app.pin")}`
              }
            ),
            /* @__PURE__ */ jsx(
              "button",
              {
                type: "button",
                style: { ...chipBtn, color: "var(--text-dim, #888)" },
                onClick: () => props.onHide(app),
                children: t("info.hide")
              }
            )
          ] }),
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 2 }, children: [
            /* @__PURE__ */ jsx("span", { style: sectionHead, children: t("info.switches") }),
            toggles.length === 0 ? /* @__PURE__ */ jsx("span", { style: bodyRow, children: t("info.noSwitches") }) : /* @__PURE__ */ jsx("div", { style: { display: "flex", flexDirection: "column" }, children: toggles.map((a) => /* @__PURE__ */ jsx(ToggleRow, { app: a, onToggle: props.onToggleFeature }, a.id)) })
          ] }),
          canDisable && !protectKey ? /* @__PURE__ */ jsxs("div", { style: { borderTop: "1px solid var(--border, #2f2f2f)", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }, children: [
            dependents.length > 0 ? (
              /* 硬依赖者非空 = 置灰不开洞（与 extman 硬阻止同口径），引导去扩展管理 */
              /* @__PURE__ */ jsxs(Fragment, { children: [
                /* @__PURE__ */ jsx("button", { type: "button", disabled: true, style: { ...chipBtn, color: "var(--danger, #ef4444)", opacity: 0.5, cursor: "not-allowed" }, children: t("info.disable") }),
                /* @__PURE__ */ jsx("span", { style: bodyRow, children: t("info.disableBlocked", { deps: dependents.join("、") }) })
              ] })
            ) : busy ? /* @__PURE__ */ jsx("button", { type: "button", disabled: true, style: { ...chipBtn, color: "var(--danger, #ef4444)", opacity: 0.6 }, children: t("info.disableBusy") }) : confirm ? /* @__PURE__ */ jsxs(Fragment, { children: [
              /* @__PURE__ */ jsx("span", { style: bodyRow, children: t("info.disableConfirm", { ext: app.extName ?? app.extId }) }),
              /* @__PURE__ */ jsx("span", { style: { ...bodyRow, color: "var(--text-dim, #888)" }, children: t("info.disableHint") }),
              /* @__PURE__ */ jsxs("span", { style: { display: "flex", gap: 6 }, children: [
                /* @__PURE__ */ jsx("button", { type: "button", style: { ...chipBtn, color: "var(--danger, #ef4444)", borderColor: "color-mix(in srgb, var(--danger, #ef4444) 50%, transparent)" }, onClick: props.onConfirmDisable, children: t("info.disableYes") }),
                /* @__PURE__ */ jsx("button", { type: "button", style: chipBtn, onClick: props.onAskDisable, children: t("info.disableNo") })
              ] })
            ] }) : /* @__PURE__ */ jsx("button", { type: "button", style: { ...chipBtn, color: "var(--danger, #ef4444)", borderColor: "color-mix(in srgb, var(--danger, #ef4444) 35%, transparent)" }, onClick: props.onAskDisable, children: t("info.disable") }),
            error ? /* @__PURE__ */ jsx("span", { style: { ...bodyRow, color: "var(--danger, #ef4444)" }, children: error }) : null,
            /* @__PURE__ */ jsx("button", { type: "button", style: chipBtn, onClick: props.onOpenExtman, children: t("info.openExtman") })
          ] }) : /* @__PURE__ */ jsxs("div", { style: { borderTop: "1px solid var(--border, #2f2f2f)", paddingTop: 8 }, children: [
            protectKey ? /* @__PURE__ */ jsx("span", { style: bodyRow, children: t(protectKey) }) : null,
            !canDisable ? /* @__PURE__ */ jsx("span", { style: bodyRow, children: t("info.disableNoManager") }) : null
          ] })
        ] })
      ]
    }
  );
}
function AppCenter(props) {
  const { ctx, header } = props;
  const toolbarItems = ctx.useSlotItems?.("toolbar") ?? [];
  const commandItems = ctx.useSlotItems?.("commands") ?? [];
  const footerItems = ctx.useSlotItems?.("sidebarFooter") ?? [];
  const rightDockItems = ctx.useSlotItems?.("rightFileDock") ?? [];
  const [locale, setLocale] = useState(currentUiLocale);
  useEffect(() => {
    const on = () => setLocale(currentUiLocale());
    window.addEventListener("pi-web:locale-changed", on);
    return () => window.removeEventListener("pi-web:locale-changed", on);
  }, []);
  const { exts, refresh: refreshManifest } = useManifestExts();
  const { overlay: featureOverlay2, dropExt: dropFeatureOverlay } = useFeatureOverlay();
  const [pinned, setPinned] = useState(() => {
    pruneToggleIds();
    return readPinned();
  });
  const [hidden, setHidden] = useState(() => readHidden());
  useEffect(() => {
    const sync = () => {
      setPinned(readPinned());
      setHidden(readHidden());
    };
    window.addEventListener(APP_STORE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(APP_STORE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const [query, setQuery] = useState("");
  const [edit, setEdit] = useState(false);
  const [view, setView] = useState("apps");
  const [moreOpen, setMoreOpen] = useState(true);
  const [selectedCat, setSelectedCat] = useState("__all");
  const [infoId, setInfoId] = useState(null);
  const [disable, setDisable] = useState({ confirm: false, busy: false, error: null });
  const [removedExts, setRemovedExts] = useState([]);
  const [notice, setNotice] = useState(null);
  const pinyinMap = usePinyinMap();
  const scrollRef = useRef(null);
  const [contentWidth, setContentWidth] = useState(0);
  const bodyRoRef = useRef(null);
  const attachBody = useCallback((el) => {
    scrollRef.current = el;
    bodyRoRef.current?.disconnect();
    bodyRoRef.current = null;
    if (el && typeof ResizeObserver !== "undefined") {
      const measure = () => {
        const cs = getComputedStyle(el);
        setContentWidth(el.clientWidth - parseFloat(cs.paddingLeft || "0") - parseFloat(cs.paddingRight || "0"));
      };
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      bodyRoRef.current = ro;
      measure();
    }
  }, []);
  const featureState = useMemo(() => {
    const m = {};
    for (const e of exts) for (const f of e.features ?? []) m[`${e.id}:${f.id}`] = featureOverlay2[`${e.id}:${f.id}`] ?? f.enabled !== false;
    return m;
  }, [exts, featureOverlay2]);
  const builtApps = useMemo(() => buildApps({
    exts,
    slotItems: [
      ...toolbarItems.map((it) => ({ ...it, slot: "toolbar" })),
      ...commandItems.map((it) => ({ ...it, slot: "commands" })),
      ...footerItems.map((it) => ({ ...it, slot: "sidebarFooter" })),
      ...rightDockItems.map((it) => ({ ...it, slot: "rightFileDock" }))
    ],
    featureState,
    openPanel,
    locale,
    pinyinMap
  }), [toolbarItems, commandItems, footerItems, rightDockItems, exts, featureState, locale, pinyinMap]);
  const apps = useMemo(() => removedExts.length === 0 ? builtApps : builtApps.filter((a) => !removedExts.includes(a.extId)), [builtApps, removedExts]);
  const { entries, toggles } = useMemo(() => splitByKind(apps), [apps]);
  const hiddenSet = useMemo(() => new Set(hidden), [hidden]);
  const visibleEntries = useMemo(() => entries.filter((a) => !hiddenSet.has(a.id)), [entries, hiddenSet]);
  const pinnedSet = useMemo(() => new Set(pinned), [pinned]);
  const pinnedApps = useMemo(() => pinned.map((id) => isToggleId(id) ? void 0 : visibleEntries.find((a) => a.id === id)).filter((a) => Boolean(a)), [pinned, visibleEntries]);
  const extmanApp = useMemo(() => apps.find((a) => a.extId === "aiti-extman" && a.kind === "manage") ?? null, [apps]);
  const infoApp = useMemo(() => infoId ? apps.find((a) => a.id === infoId) ?? null : null, [apps, infoId]);
  const infoToggles = useMemo(() => infoApp ? toggles.filter((a) => a.extId === infoApp.extId) : [], [infoApp, toggles]);
  const infoDependents = useMemo(() => infoApp ? hardDependents(exts, infoApp.extId) : [], [infoApp, exts]);
  const autoMoreRef = useRef(null);
  useLayoutEffect(() => {
    if (apps.length === 0 && !header) return;
    const auto = pinnedRowsNeeded(pinnedApps.length, contentWidth) < MORE_COLLAPSE_PINNED_ROWS;
    const prev = autoMoreRef.current;
    autoMoreRef.current = auto;
    if (prev === null || auto && prev === false) setMoreOpen(auto);
  }, [contentWidth, pinnedApps.length, apps.length, header]);
  const searching = query.trim().length > 0;
  const entryResults = useMemo(() => searching ? visibleEntries.filter((a) => matchApp(a, query)) : [], [searching, visibleEntries, query]);
  const toggleGroups = useMemo(() => extensionToggleGroups(searching ? toggles.filter((a) => matchApp(a, query)) : toggles), [searching, toggles, query]);
  const byCategory = useMemo(() => {
    const groups = /* @__PURE__ */ new Map();
    const pinnedVisible = new Set(pinnedApps.map((a) => a.id));
    for (const a of visibleEntries) {
      if (pinnedVisible.has(a.id) && !searching) continue;
      (groups.get(a.category) ?? groups.set(a.category, []).get(a.category)).push(a);
    }
    return [...groups.entries()].sort((x, y) => categorySortKey(x[0]).localeCompare(categorySortKey(y[0])));
  }, [visibleEntries, pinnedApps, searching]);
  const mode = viewMode(visibleEntries.length);
  if (apps.length === 0 && !header) return null;
  const onToggleFeature = (app) => {
    const featureId = app.id.slice(`toggle:${app.extId}:`.length);
    void setBooleanFeature(apiUrl, app.extId, featureId, app.on !== true);
  };
  const onRun = (app) => {
    if (app.kind === "toggle") {
      onToggleFeature(app);
      return;
    }
    app.run();
  };
  const closeInfo = () => {
    setInfoId(null);
    setDisable({ confirm: false, busy: false, error: null });
  };
  const openInfo = (app) => {
    if (infoId === app.id) {
      closeInfo();
      return;
    }
    setInfoId(app.id);
    setDisable({ confirm: false, busy: false, error: null });
    scrollRef.current?.scrollTo?.(0, 0);
  };
  const switchView = () => {
    setView((v) => v === "apps" ? "toggles" : "apps");
    setEdit(false);
    setQuery("");
    closeInfo();
  };
  const openExtman = () => {
    if (extmanApp) {
      closeInfo();
      extmanApp.run();
    }
  };
  const askDisable = () => setDisable((d) => ({ confirm: !d.confirm, busy: false, error: d.error }));
  const confirmDisable = () => {
    if (!infoApp || disable.busy) return;
    const target = infoApp;
    setDisable({ confirm: true, busy: true, error: null });
    void disableExtension(apiUrl, target.extId).then((r) => {
      if (!r.ok) {
        setDisable({ confirm: true, busy: false, error: r.error ?? t("info.disableFailed", { ext: target.extId }) });
        return;
      }
      setRemovedExts((cur) => cur.includes(target.extId) ? cur : [...cur, target.extId]);
      dropFeatureOverlay(target.extId);
      refreshManifest();
      closeInfo();
      setNotice(t("info.disabled", { ext: target.extName ?? target.extId }));
    });
  };
  const renderCards = (list, withMove) => /* @__PURE__ */ jsx("div", { style: gridStyle, children: list.map((a) => /* @__PURE__ */ jsx(
    AppCard,
    {
      app: a,
      edit,
      pinned: pinnedSet.has(a.id),
      infoActive: infoId === a.id,
      onRun,
      onInfo: openInfo,
      onMove: (id, d) => {
        movePinned(id, d);
      }
    },
    a.id
  )) });
  const renderSection = (cat, list) => /* @__PURE__ */ jsx(
    CategorySection,
    {
      id: cat,
      apps: list,
      edit,
      pinnedSet,
      infoId: infoId ?? "",
      onRun,
      onInfo: openInfo,
      onMove: (id, d) => {
        movePinned(id, d);
      }
    },
    cat
  );
  return /* @__PURE__ */ jsxs("div", { "data-aiti-app-center": "1", style: { flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }, children: [
    /* @__PURE__ */ jsxs("div", { ref: attachBody, "data-app-center-body": "1", style: { flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden", padding: "0 12px 12px", display: "flex", flexDirection: "column", gap: 12 }, children: [
      header,
      /* @__PURE__ */ jsxs("div", { "data-app-center-search": "1", style: { position: "sticky", top: 0, zIndex: 3, flexShrink: 0, display: "flex", alignItems: "center", gap: 5, margin: "0 -12px", padding: "10px 12px 8px", background: "var(--bg-panel, #1b1b1b)" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 6, background: "var(--bg-hover, #232323)", border: "1px solid var(--border, #3a3a3a)", borderRadius: 8, padding: "5px 9px" }, children: [
          /* @__PURE__ */ jsxs("svg", { width: "12", height: "12", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2.2", strokeLinecap: "round", "aria-hidden": "true", style: { color: "var(--text-dim, #888)", flexShrink: 0 }, children: [
            /* @__PURE__ */ jsx("circle", { cx: "11", cy: "11", r: "8" }),
            /* @__PURE__ */ jsx("path", { d: "m21 21-4.3-4.3" })
          ] }),
          /* @__PURE__ */ jsx(
            "input",
            {
              type: "text",
              value: query,
              onChange: (e) => setQuery(e.target.value),
              placeholder: t(view === "apps" ? "app.search" : "app.searchToggles"),
              "aria-label": t(view === "apps" ? "app.search" : "app.searchToggles"),
              style: { flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "var(--text, #ddd)", fontSize: 12, fontFamily: "inherit" }
            }
          )
        ] }),
        view === "apps" ? /* @__PURE__ */ jsx(HeaderButton, { title: edit ? t("app.done") : t("app.edit"), active: edit, onClick: () => setEdit((v) => !v), children: /* @__PURE__ */ jsx(EditIcon, {}) }) : null,
        extmanApp ? /* @__PURE__ */ jsx(HeaderButton, { title: t("view.extman"), onClick: openExtman, children: /* @__PURE__ */ jsx(PlusIcon, {}) }) : null,
        /* @__PURE__ */ jsx(HeaderButton, { title: t(view === "apps" ? "view.toToggles" : "view.toApps"), onClick: switchView, children: view === "apps" ? /* @__PURE__ */ jsx(SlidersIcon, {}) : /* @__PURE__ */ jsx(GridIcon, {}) })
      ] }),
      notice ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", gap: 6, padding: "5px 8px", border: "1px solid var(--border, #3a3a3a)", borderRadius: 8, fontSize: 11, color: "var(--text-muted, #999)" }, children: [
        /* @__PURE__ */ jsx("span", { style: { flex: 1, minWidth: 0 }, children: notice }),
        /* @__PURE__ */ jsx("button", { type: "button", style: miniBtn(), title: t("info.close"), "aria-label": t("info.close"), onClick: () => setNotice(null), children: "✕" })
      ] }) : null,
      view === "toggles" ? toggleGroups.length === 0 ? /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim, #888)", textAlign: "center", padding: "12px 0" }, children: t("app.noResults") }) : toggleGroups.map((g) => /* @__PURE__ */ jsx(ToggleGroupBlock, { group: g, onToggle: onToggleFeature }, g.extId)) : searching ? entryResults.length > 0 ? renderCards(entryResults) : /* @__PURE__ */ jsx("div", { style: { fontSize: 12, color: "var(--text-dim, #888)", textAlign: "center", padding: "12px 0" }, children: t("app.noResults") }) : mode === "flat" ? (
        /* flat：按分类平铺全部 */
        byCategory.map(([cat, list]) => renderSection(cat, list))
      ) : (
        /* two-segment：常用 + 更多 */
        /* @__PURE__ */ jsxs(Fragment, { children: [
          pinnedApps.length > 0 ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 8 }, children: [
            /* @__PURE__ */ jsxs("span", { style: sectionHead, children: [
              t("app.pinned"),
              "（",
              pinnedApps.length,
              "）"
            ] }),
            renderCards(pinnedApps)
          ] }) : /* @__PURE__ */ jsx("div", { style: { fontSize: 11, color: "var(--text-dim, #888)", padding: "2px 2px" }, children: t("app.pinHint") }),
          moreOpen || edit ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
            /* @__PURE__ */ jsx("div", { role: "tablist", "aria-label": t("app.more"), style: { display: "flex", flexWrap: "wrap", gap: "5px 6px", flexShrink: 0 }, children: [
              ["__all", t("app.all"), visibleEntries.length - pinnedApps.length],
              ...byCategory.map(([cat, list]) => [cat, categoryLabel(cat, t), list.length])
            ].map(([key, label, count]) => {
              const active = selectedCat === key;
              return /* @__PURE__ */ jsxs(
                "button",
                {
                  type: "button",
                  role: "tab",
                  "aria-selected": active,
                  onClick: () => setSelectedCat(key),
                  style: {
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    flexShrink: 0,
                    border: "1px solid var(--border, #3a3a3a)",
                    borderRadius: 999,
                    padding: "3px 10px",
                    fontSize: 11,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    background: active ? "var(--bg-selected, #2a2a2a)" : "none",
                    color: active ? "var(--accent, #2563eb)" : "var(--text-muted, #999)"
                  },
                  children: [
                    label,
                    /* @__PURE__ */ jsx("span", { style: { opacity: 0.65 }, children: count })
                  ]
                },
                key
              );
            }) }),
            (selectedCat === "__all" ? byCategory : byCategory.filter(([cat]) => cat === selectedCat)).map(([cat, list]) => renderSection(cat, list))
          ] }) : /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => {
                setMoreOpen(true);
                setSelectedCat("__all");
              },
              style: {
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                alignSelf: "center",
                background: "none",
                border: "1px solid var(--border, #3a3a3a)",
                borderRadius: 8,
                padding: "5px 14px",
                color: "var(--text-muted, #999)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit"
              },
              children: [
                "⌄ ",
                t("app.more"),
                "（",
                visibleEntries.length - pinnedApps.length,
                "）"
              ]
            }
          )
        ] })
      ),
      edit && view === "apps" && hidden.length > 0 ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 6, borderTop: "1px solid var(--border, #3a3a3a)", paddingTop: 10 }, children: [
        /* @__PURE__ */ jsxs("span", { style: sectionHead, children: [
          t("app.hidden"),
          "（",
          hidden.length,
          "）"
        ] }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: 6 }, children: hidden.map((id) => {
          const app = entries.find((a) => a.id === id);
          return /* @__PURE__ */ jsxs(
            "button",
            {
              type: "button",
              onClick: () => toggleHidden(id),
              title: t("app.restore"),
              "aria-label": `${t("app.restore")} ${app?.label ?? id}`,
              style: { display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "1px dashed var(--border, #3a3a3a)", borderRadius: 7, padding: "3px 8px", color: "var(--text-dim, #888)", cursor: "pointer", fontSize: 11, fontFamily: "inherit" },
              children: [
                app ? /* @__PURE__ */ jsx(IconGlyph, { icon: app.icon, extId: app.extId, label: app.label, size: 12 }) : null,
                app?.label ?? id,
                " ⟳"
              ]
            },
            id
          );
        }) })
      ] }) : null
    ] }),
    infoApp ? /* @__PURE__ */ jsx(
      InfoSheet,
      {
        app: infoApp,
        toggles: infoToggles,
        dependents: infoDependents,
        pinned: pinnedSet.has(infoApp.id),
        canDisable: Boolean(extmanApp),
        protectKey: DISABLE_PROTECT[infoApp.extId],
        confirm: disable.confirm,
        busy: disable.busy,
        error: disable.error,
        onClose: closeInfo,
        onPin: (a) => {
          togglePinned(a.id);
        },
        onHide: (a) => {
          hideApp(a.id);
          closeInfo();
        },
        onToggleFeature,
        onAskDisable: askDisable,
        onConfirmDisable: confirmDisable,
        onOpenExtman: openExtman
      }
    ) : null
  ] });
}
function createAppCenterApi(ctx) {
  return {
    renderAppCenter: (opts) => /* @__PURE__ */ jsx(AppCenter, { ctx, header: opts?.header })
  };
}
function register(ctx) {
  __setCtx(ctx);
  const dispose = regSvc("aiti-app-center.api", createAppCenterApi(ctx));
  const disposeCmd = registerCommandsService();
  return () => {
    try {
      dispose?.();
    } catch {
    }
    try {
      disposeCmd?.();
    } catch {
    }
  };
}
export {
  register as default
};
