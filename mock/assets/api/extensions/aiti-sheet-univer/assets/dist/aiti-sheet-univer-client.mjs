function pe(t) {
  if (!(typeof window > "u")) {
    if (window.__aitiEditor) {
      try {
        t();
      } catch (e) {
        console.error("[aiti-editor-inject] 注册失败:", e);
      }
      return;
    }
    Array.isArray(window.__aitiEditorQueue) || (window.__aitiEditorQueue = []), window.__aitiEditorQueue.push(() => {
      try {
        t();
      } catch (e) {
        console.error("[aiti-editor-inject] 注册失败(重放):", e);
      }
    });
  }
}
const D = { LEFT: 1, CENTER: 2, RIGHT: 3, JUSTIFIED: 4, BOTH: 5 }, M = { TOP: 1, MIDDLE: 2, BOTTOM: 3 }, Y = { WRAP: 3 }, S = { NONE: 0, THIN: 1, HAIR: 2, DOTTED: 3, DASHED: 4, DASH_DOT: 5, DASH_DOT_DOT: 6, DOUBLE: 7, MEDIUM: 8, MEDIUM_DASHED: 9, MEDIUM_DASH_DOT: 10, MEDIUM_DASH_DOT_DOT: 11, SLANT_DASH_DOT: 12, THICK: 13 }, q = 5e4, K = 2e3, me = 25569, ee = 7, te = 5, ne = 0.75;
function P(t) {
  if (typeof t != "string") return null;
  let e = t;
  return e[0] === "#" && (e = e.slice(1)), /^[0-9a-fA-F]{8}$/.test(e) ? parseInt(e.slice(0, 2), 16) === 0 ? null : "#" + e.slice(2).toLowerCase() : /^[0-9a-fA-F]{6}$/.test(e) ? "#" + e.toLowerCase() : null;
}
function H(t) {
  if (typeof t != "string") return null;
  const e = t.replace("#", "");
  return /^[0-9a-fA-F]{6}$/.test(e) ? ("FF" + e).toUpperCase() : null;
}
function G(t) {
  return Math.round((t.getTime() / 864e5 + me) * 1e8) / 1e8;
}
function he(t) {
  const e = String(t || "").toUpperCase().match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!e) return null;
  const o = (n) => n.split("").reduce((i, s) => i * 26 + (s.charCodeAt(0) - 64), 0) - 1;
  return {
    startRow: parseInt(e[2], 10) - 1,
    startColumn: o(e[1]),
    endRow: parseInt(e[4] || e[2], 10) - 1,
    endColumn: o(e[3] || e[1])
  };
}
const xe = (t, e) => {
  let o = "", n = e + 1;
  for (; n > 0; ) {
    const i = (n - 1) % 26;
    o = String.fromCharCode(65 + i) + o, n = Math.floor((n - 1) / 26);
  }
  return o + (t + 1);
};
function ye(t) {
  const e = {}, o = t.font;
  if (o) {
    o.name && (e.ff = o.name), typeof o.size == "number" && (e.fs = o.size), o.bold && (e.bl = 1), o.italic && (e.it = 1), o.underline && (e.ul = { s: 1 }), o.strike && (e.st = { s: 1 });
    const a = P(o.color && o.color.argb);
    a && (e.cl = { rgb: a });
  }
  const n = t.fill;
  if (n && n.type === "pattern" && n.pattern === "solid") {
    const a = P(n.fgColor && n.fgColor.argb || n.bgColor && n.bgColor.argb);
    a && (e.bg = { rgb: a });
  } else n && n.type;
  const i = t.alignment;
  if (i) {
    const a = String(i.horizontal || "").toLowerCase();
    a === "left" ? e.ht = D.LEFT : a === "center" ? e.ht = D.CENTER : a === "right" ? e.ht = D.RIGHT : (a === "justify" || a === "justified") && (e.ht = D.JUSTIFIED);
    const l = String(i.vertical || "").toLowerCase();
    l === "top" ? e.vt = M.TOP : l === "middle" || l === "center" ? e.vt = M.MIDDLE : l === "bottom" && (e.vt = M.BOTTOM), i.wrapText && (e.tb = Y.WRAP);
  }
  const s = t.border;
  if (s) {
    const a = {}, l = {
      thin: S.THIN,
      hair: S.HAIR,
      dotted: S.DOTTED,
      dashDot: S.DASH_DOT,
      dashDotDot: S.DASH_DOT_DOT,
      double: S.DOUBLE,
      medium: S.MEDIUM,
      mediumDashed: S.MEDIUM_DASHED,
      mediumDashDot: S.MEDIUM_DASH_DOT,
      mediumDashDotDot: S.MEDIUM_DASH_DOT_DOT,
      slantDashDot: S.SLANT_DASH_DOT,
      thick: S.THICK,
      dashed: S.DASHED
    };
    for (const g of ["top", "bottom", "left", "right"]) {
      const u = s[g];
      if (!u || !u.style || u.style === "none") continue;
      const d = l[String(u.style)] ?? S.THIN, f = P(u.color && u.color.argb) || "#000000";
      a[g[0]] = { s: d, rgb: f };
    }
    Object.keys(a).length && (e.bd = a);
  }
  const c = t.numFmt;
  if (typeof c == "string" && c !== "General") {
    const a = be(c);
    a !== "General" && (e.n = { pattern: a });
  }
  return Object.keys(e).length ? e : null;
}
function be(t) {
  const o = String(t || "").split(";");
  return o.map(
    (c) => c.replace(/value\(\)\s*(?:>=|<=|<>|[><=])\s*[\d.]+/gi, "").replace(/\[\s*\]/g, "").trim()
  ).filter((c, a) => c !== "" || o[a].trim() === "").join(";").trim() || "General";
}
function ge(t, e) {
  const o = t.value;
  if (o == null) return {};
  if (typeof o == "number" || typeof o == "boolean") return { v: o };
  if (typeof o == "string") return { v: o };
  if (o instanceof Date) return { v: G(o) };
  if (typeof o == "object") {
    if (typeof o.formula == "string") {
      const n = { f: o.formula.replace(/^=/, "") }, i = o.result;
      return i == null ? n.v = "" : i instanceof Date ? n.v = G(i) : (typeof i == "number" || typeof i == "boolean" || typeof i == "string") && (n.v = i), n;
    }
    if (Array.isArray(o.richText))
      return e.add("富文本已并为纯文本"), { v: o.richText.map((n) => n && n.text || "").join("") };
    if (o.hyperlink != null)
      return e.add("超链接仅保留显示文本"), { v: typeof o.text == "string" ? o.text : String(o.text ?? "") };
    if (o.error != null) return { v: String(o.error) };
    if (o.sharedFormula != null)
      return { v: o.result == null ? "" : o.result };
  }
  return { v: String(o) };
}
function ve(t, e) {
  const o = /* @__PURE__ */ new Set(), n = Math.min(e?.maxRows ?? q, q), i = Math.min(e?.maxCols ?? K, K), s = {}, c = /* @__PURE__ */ new Map(), a = {}, l = [], g = (r) => JSON.stringify(r), u = (r) => {
    if (!r) return;
    const h = g(r);
    let y = c.get(h);
    return y || (y = "s" + c.size, c.set(h, y), s[y] = r), y;
  }, d = t && t.worksheets || [];
  for (const r of d) {
    const h = "sheet-" + (l.length + 1);
    l.push(h);
    const y = {}, p = {}, x = {}, E = Math.min(Math.max(r.actualRowCount || r.rowCount || 0, 1), n), m = Math.min(Math.max(r.actualColumnCount || r.columnCount || 0, 1), i);
    ((r.rowCount || 0) > n || (r.actualRowCount || 0) > n) && o.add("超过 " + n + " 行，已截断（只读降级）"), ((r.columnCount || 0) > i || (r.actualColumnCount || 0) > i) && o.add("超过 " + i + " 列，已截断");
    for (let v = 1; v <= E; v++) {
      const w = r.getRow(v);
      w && typeof w.height == "number" && (p[v - 1] = { h: { v: Math.round(w.height / ne), s: 0 } }), w && w.hidden && (p[v - 1] = Object.assign(p[v - 1] || {}, { hd: 1 }));
    }
    for (let v = 1; v <= m; v++) {
      const w = r.getColumn(v);
      w && typeof w.width == "number" && w.width > 0 && (x[v - 1] = { w: { v: Math.round(w.width * ee + te), s: 0 } }), w && w.isHidden && (x[v - 1] = Object.assign(x[v - 1] || {}, { hd: 1 }));
    }
    r.eachRow({ includeEmpty: !1 }, (v, w) => {
      w > n || v.eachCell({ includeEmpty: !0 }, (V, U) => {
        var X;
        if (!U || U > i) return;
        const A = {}, I = ge(V, o);
        I.v !== void 0 && (A.v = I.v), I.f !== void 0 && (A.f = I.f);
        const ue = ye(V), W = u(ue);
        W && (A.s = W), !(A.v === void 0 && A.f === void 0 && !A.s) && ((y[X = w - 1] || (y[X] = {}))[U - 1] = A);
      });
    });
    const b = [], k = r.model && r.model.merges || r._merges || [];
    for (const v of k) {
      const w = typeof v == "string" ? he(v) : v;
      w && (w.startRow === w.endRow && w.startColumn === w.endColumn || b.push(w));
    }
    let O;
    const T = r.views && r.views[0] || {};
    T.state === "frozen" && (T.xSplit || 0) + (T.ySplit || 0) > 0 && (O = {
      xSplit: T.xSplit || 0,
      ySplit: T.ySplit || 0,
      startRow: T.ySplit || 0,
      startColumn: T.xSplit || 0
    });
    try {
      const v = r.conditionalFormattings;
      (v && typeof v.modelCount == "number" ? v.modelCount > 0 : v && v.ruleNamesById && Object.keys(v.ruleNamesById).length > 0) && o.add("条件格式不支持，保存将剥离");
      const w = r.dataValidations && r.dataValidations.model;
      w && Array.isArray(w.dataValidation) && w.dataValidation.length > 0 && o.add("数据验证不支持，保存将剥离");
    } catch {
    }
    const _ = r.properties && r.properties.tabColor;
    a[h] = {
      id: h,
      name: r.name,
      tabColor: _ && P(_.argb) || void 0,
      hidden: r.state === "hidden" || r.state === "veryHidden" ? 1 : 0,
      cellData: y,
      rowCount: Math.max(E, 1) + 50,
      // 留出增长空间
      columnCount: Math.max(m, 1) + 10,
      rowData: p,
      columnData: x,
      merges: b,
      freeze: O,
      defaultRowHeight: 20,
      defaultColumnWidth: 73
    };
  }
  return { snapshot: {
    id: e?.fileName || "workbook",
    name: e?.fileName || "workbook",
    appVersion: "aiti-sheet-univer",
    locale: "zh-CN",
    styles: s,
    sheetOrder: l,
    sheets: a
  }, warnings: [...o] };
}
function we(t) {
  if (!t || typeof t != "object") return;
  const e = {};
  t.ff && (e.font = Object.assign(e.font || {}, { name: t.ff })), typeof t.fs == "number" && (e.font = Object.assign(e.font || {}, { size: t.fs })), t.bl === 1 && (e.font = Object.assign(e.font || {}, { bold: !0 })), t.it === 1 && (e.font = Object.assign(e.font || {}, { italic: !0 })), t.ul && t.ul.s && (e.font = Object.assign(e.font || {}, { underline: !0 })), t.st && t.st.s && (e.font = Object.assign(e.font || {}, { strike: !0 }));
  const o = H(t.cl && t.cl.rgb);
  o && (e.font = Object.assign(e.font || {}, { color: { argb: o } })), e.font && Object.keys(e.font).length === 0 && delete e.font;
  const n = H(t.bg && t.bg.rgb);
  n && (e.fill = { type: "pattern", pattern: "solid", fgColor: { argb: n } });
  const i = {};
  t.ht === D.LEFT ? i.horizontal = "left" : t.ht === D.CENTER ? i.horizontal = "center" : t.ht === D.RIGHT ? i.horizontal = "right" : (t.ht === D.JUSTIFIED || t.ht === D.BOTH) && (i.horizontal = "justify"), t.vt === M.TOP ? i.vertical = "top" : t.vt === M.MIDDLE ? i.vertical = "middle" : t.vt === M.BOTTOM && (i.vertical = "bottom"), t.tb === Y.WRAP && (i.wrapText = !0), Object.keys(i).length && (e.alignment = i);
  const s = t.bd;
  if (s && typeof s == "object") {
    const c = {
      t: "top",
      b: "bottom",
      l: "left",
      r: "right"
    }, a = {};
    for (const [g, u] of Object.entries(S)) a[u] = g;
    const l = {};
    for (const [g, u] of Object.entries(c)) {
      const d = s[g];
      d && (l[u] = { style: a[d.s] || "thin", color: { argb: H(d.rgb) || "FF000000" } });
    }
    Object.keys(l).length && (e.border = l);
  }
  return t.n && typeof t.n.pattern == "string" && (e.numFmt = t.n.pattern), Object.keys(e).length ? e : void 0;
}
function ke(t) {
  return t ? (typeof t.dataStream == "string" ? t.dataStream : "").replace(/[\r\n]+$/, "") : "";
}
function oe(t, e) {
  const o = new t.Workbook();
  o.creator = "aiti-sheet-univer", o.created = o.modified = /* @__PURE__ */ new Date();
  const n = e.sheetOrder && e.sheetOrder.length ? e.sheetOrder : Object.keys(e.sheets || {}), i = e.styles || {};
  for (const s of n) {
    const c = e.sheets && (e.sheets[s] || {}), a = o.addWorksheet(c.name || s, {
      state: c.hidden ? "hidden" : "visible",
      properties: c.tabColor ? { tabColor: { argb: H(c.tabColor) || void 0 } } : void 0,
      views: c.freeze && (c.freeze.xSplit || 0) + (c.freeze.ySplit || 0) > 0 ? [{
        state: "frozen",
        xSplit: c.freeze.xSplit || 0,
        ySplit: c.freeze.ySplit || 0,
        topLeftCell: xe(c.freeze.startRow ?? c.freeze.ySplit ?? 0, c.freeze.startColumn ?? c.freeze.xSplit ?? 0)
      }] : [{ state: "normal" }]
    }), l = c.rowData || {};
    for (const d of Object.keys(l)) {
      const f = parseInt(d, 10), r = l[d], h = a.getRow(f + 1);
      r && r.h && typeof r.h.v == "number" && (h.height = Math.round(r.h.v * ne * 10) / 10), r && r.hd && (h.hidden = !0);
    }
    const g = c.columnData || {};
    for (const d of Object.keys(g)) {
      const f = parseInt(d, 10), r = g[d], h = a.getColumn(f + 1);
      r && r.w && typeof r.w.v == "number" && (h.width = Math.max(0, Math.round((r.w.v - te) / ee * 100) / 100)), r && r.hd && (h.isHidden = !0);
    }
    const u = c.cellData || {};
    for (const d of Object.keys(u)) {
      const f = parseInt(d, 10), r = u[d];
      for (const h of Object.keys(r)) {
        const y = parseInt(h, 10), p = r[h];
        if (!p) continue;
        const x = a.getCell(f + 1, y + 1);
        let E = null;
        if (p.s) {
          E = typeof p.s == "string" ? i[p.s] : p.s;
          const m = we(E);
          m && (m.numFmt && (x.numFmt = m.numFmt), m.font && (x.font = m.font), m.fill && (x.fill = m.fill), m.alignment && (x.alignment = m.alignment), m.border && (x.border = m.border));
        }
        if (typeof p.f == "string" && p.f.length) {
          const m = { formula: p.f[0] === "=" ? p.f.slice(1) : p.f };
          p.v != null && (m.result = p.v), x.value = m;
        } else p.p ? x.value = ke(p.p) : p.v !== void 0 && (x.value = p.v);
      }
    }
    for (const d of c.merges || [])
      try {
        if (d.startRow === d.endRow && d.startColumn === d.endColumn) continue;
        a.mergeCells(d.startRow + 1, d.startColumn + 1, d.endRow + 1, d.endColumn + 1);
      } catch {
      }
  }
  return o;
}
const F = {};
function ie(t, e, o) {
  const n = window;
  if (n[e]) return Promise.resolve(n[e]);
  const i = e + "|" + t;
  if (F[i]) return F[i];
  const s = new Promise((c, a) => {
    fetch(t, { cache: "no-store" }).then((l) => {
      if (!l.ok) throw new Error("vendor 加载失败: " + t);
      return l.text();
    }).then((l) => {
      try {
        new Function("exports", "module", "define", l)(void 0, void 0, void 0);
      } catch {
      }
      n[e] ? c(n[e]) : a(new Error("vendor 全局未挂载: " + e));
    }).catch(a);
  });
  return s.catch(() => {
    delete F[i];
  }), s;
}
const Ce = () => {
  const t = window.__aitiSheetUniverApiUrl;
  if (typeof t == "function")
    try {
      return t("/api/extensions/aiti-sheet-univer/assets/");
    } catch {
    }
  const e = import.meta.url.match(/^(.*\/assets\/)(?:dist|client)\//);
  return e ? e[1] : "/api/extensions/aiti-sheet-univer/assets/";
}, re = (t) => Ce() + "vendor/" + t;
function J() {
  return ie(re("exceljs.min.js"), "ExcelJS");
}
function Ee() {
  return ie(re("xlsx.full.min.js"), "XLSX");
}
let $ = !1;
function Se() {
  if ($) return;
  const t = import.meta.url.match(/^(.*\/assets\/)(?:dist|client)\//);
  if (!t) return;
  $ = !0;
  const e = document.createElement("link");
  e.id = "aiti-sheet-univer-css", e.rel = "stylesheet", e.href = t[1] + "dist/aiti-sheet-univer-aiti-sheet-univer.css", document.head.appendChild(e);
}
let j = null;
function Te() {
  return j || (j = (async () => {
    const t = await import("./aiti-sheet-univer-chunk-Dzf_YK5F.mjs");
    return Se(), t;
  })(), j.catch(() => {
    j = null;
  }), j);
}
async function Oe(t, e, o) {
  const i = await (await Te()).bootSheetEngine(t, e, o);
  return {
    snapshot: () => {
      try {
        return i.fWorkbook.getSnapshot();
      } catch {
        return null;
      }
    },
    setEditable: (s) => {
      try {
        i.fWorkbook.setEditable(s);
      } catch {
      }
    },
    dispose: () => {
      try {
        i.dispose();
      } catch {
      }
    }
  };
}
const De = (t) => "'" + String(t).replace(/'/g, "'\\''") + "'";
function Ae(t) {
  const { apiUrl: e, filePath: o } = t, n = t.t || ((m) => m), i = document.createElement("div");
  i.style.cssText = "position:absolute;inset:0;overflow:auto;padding:22px 26px;background:var(--bg,#fff);font-size:13px;line-height:1.55;color:var(--text,#1a1a1a);z-index:10;";
  const s = document.createElement("div");
  s.style.cssText = "font-weight:700;font-size:15px;margin-bottom:6px;", s.textContent = n("转换该文件需要 LibreOffice (soffice)"), i.appendChild(s);
  const c = document.createElement("div");
  c.style.cssText = "margin-bottom:12px;", c.innerHTML = n(
    "服务器端未检测到 LibreOffice，因此无法把老格式{target}。两个解决方向：在<b>服务器</b>安装并配置 LibreOffice（推荐，装完即可在线转换）；或把文件下载到<b>你本地</b>用 Office 编辑。",
    { target: t.targetLabel ? n("转换成 {label}", { label: t.targetLabel }) : "" }
  ), i.appendChild(c);
  const a = "display:inline-flex;align-items:center;gap:6px;padding:6px 14px;font-size:12px;font-weight:600;border:1px solid var(--border,#d0d0d0);border-radius:8px;background:var(--bg-selected,#eef2ff);color:var(--text,#1a1a1a);cursor:pointer;font-family:inherit;", l = (m) => {
    const b = document.createElement("div");
    return b.style.cssText = "font-weight:600;font-size:12px;color:var(--text-dim,#888);margin:12px 0 4px;", b.textContent = m, i.appendChild(b), b;
  };
  l(n("服务器安装 LibreOffice（任选其一）"));
  const g = [
    ["Linux (Debian/Ubuntu)", "sudo apt install libreoffice fonts-noto-cjk"],
    ["macOS", "brew install --cask libreoffice"],
    ["Windows", "winget install --id TheDocumentFoundation.LibreOffice -e"]
  ];
  for (const [m, b] of g) {
    const k = document.createElement("div");
    k.style.cssText = "display:flex;align-items:center;gap:8px;margin:2px 0;";
    const O = document.createElement("span");
    O.style.cssText = "flex-shrink:0;width:150px;font-size:11px;color:var(--text-dim,#888);", O.textContent = m;
    const T = document.createElement("code");
    T.style.cssText = "font-family:var(--font-mono,ui-monospace,monospace);font-size:11px;background:var(--bg-selected,#f1f3f7);padding:2px 8px;border-radius:5px;word-break:break-all;flex:1 1 auto;", T.textContent = b, k.append(O, T), i.appendChild(k);
  }
  const u = document.createElement("div");
  u.style.cssText = "margin-top:8px;display:flex;align-items:center;gap:10px;padding:8px 12px;border:1px solid var(--border,#e4e7ef);border-radius:8px;background:var(--bg-selected,#f6f8ff);flex-wrap:wrap;";
  const d = document.createElement("button");
  d.type = "button", d.style.cssText = a + "background:var(--bg-selected,#e8edff);border-color:var(--accent,#7c8cf8);", d.innerHTML = n("AI 帮我安装（推荐）"), d.title = n("调起 aiti-helper 并自动选中「AI 帮我在服务器安装 LibreOffice」帮助点，AI 自动检测平台（Linux/Windows/macOS）、安装并验证");
  const f = document.createElement("span");
  f.style.cssText = "flex:1 1 200px;font-size:11px;color:var(--text-dim,#888);", f.textContent = n("不想手动装？点按钮唤起 AI 助手自动完成检测、安装、验证；也可点弹窗右上角 🤖 手动选帮助点。"), d.onclick = () => {
    const m = window;
    if (typeof m.__aitiHelperInvoke != "function") {
      f.textContent = n("aiti-helper 未就绪（未部署或未加载）：刷新页面后重试，或按上方命令手动安装。");
      return;
    }
    m.__aitiHelperInvoke({
      helperId: "install-soffice",
      message: "打开老格式文件时提示缺少 LibreOffice (soffice)，请按 install-soffice 手册在本机安装并验证（完成后用 soffice-status?refresh=1 确认可用）。",
      autoSend: !0,
      contextLabel: "soffice 缺失面板 · 一键 AI 安装",
      extId: "aiti-editor",
      extName: "aiti-editor"
    }), f.textContent = n("已唤起 AI 助手并自动发起安装任务——切到 AI 助手弹窗查看进度；装完回本页点「重试转换」。");
  }, u.append(d, f), i.appendChild(u), l(n("已安装但不在 PATH？配置路径"));
  const r = document.createElement("div");
  r.style.cssText = "font-size:12px;", r.textContent = n("扩展管理器 → aiti-editor → 功能 → 「soffice 路径（LibreOffice）」填入绝对路径（如 /opt/libreoffice/program/soffice），保存后刷新页面重试。"), i.appendChild(r);
  const h = document.createElement("div");
  h.style.cssText = "height:1px;background:var(--border,#eee);margin:14px 0;", i.appendChild(h), l(n("替代方案"));
  const y = document.createElement("div");
  y.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;";
  const p = document.createElement("button");
  p.type = "button", p.style.cssText = a, p.innerHTML = n("下载到本机编辑"), p.title = n("下载原文件，在你本地用 Office/WPS 编辑"), p.onclick = async () => {
    p.disabled = !0;
    try {
      const m = e("/api/extensions/aiti-editor"), b = await fetch(m + "/ticket", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath: o })
      }).then((O) => O.json());
      if (!b.ticket) throw new Error(b.error || n("票据签发失败"));
      const k = document.createElement("a");
      k.href = m + "/t/" + b.ticket + "/file", k.download = o.split("/").pop() || "download", document.body.appendChild(k), k.click(), k.remove();
    } catch (m) {
      p.title = String(m.message || m);
    } finally {
      p.disabled = !1;
    }
  }, y.appendChild(p);
  const x = document.createElement("button");
  x.type = "button", x.style.cssText = a, x.innerHTML = n("虚拟环境打开（远程查看）"), x.title = n("在服务器的虚拟桌面用 LibreOffice 打开本文件，经浏览器 VNC 远程查看/编辑（需 aiti-ui-env 扩展）"), x.onclick = async () => {
    x.disabled = !0, x.textContent = n("虚拟环境准备中…");
    const m = (b) => {
      x.textContent = b;
    };
    try {
      const b = e("/api/extensions/aiti-ui-env"), k = await fetch(b + "/headless", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start" }) }).then((v) => v.json());
      if (!k.ok) throw new Error(n("虚拟屏启动失败：{msg}", { msg: k.error || n("未知") }));
      const O = await fetch(b + "/run", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ cmd: "soffice --norestore " + De(o), prefer: "headless" }) }).then((v) => v.json());
      if (!O.ok) throw new Error(n("LibreOffice 启动失败：{msg}", { msg: O.error || n("未知") }));
      const T = await fetch(b + "/vnc", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "start" }) }).then((v) => v.json());
      if (!T.ok) throw new Error(n("VNC 启动失败：{msg}", { msg: T.error || n("未知") }));
      const _ = await fetch(b + "/vnc-session", { method: "POST" }).then((v) => v.json());
      if (!_.ok || !_.path) throw new Error(n("VNC 会话获取失败"));
      m(n("已在虚拟环境打开，正在跳转远程查看…")), window.open(e(_.path), "_blank"), x.textContent = n("虚拟环境打开（远程查看）"), x.disabled = !1;
    } catch (b) {
      const k = String(b.message || b);
      x.textContent = k.includes("404") || k.includes("Failed to fetch") ? n("虚拟环境打开（需 aiti-ui-env 扩展）") : n("虚拟环境打开（重试）"), x.title = k, x.disabled = !1;
    }
  }, y.appendChild(x), i.appendChild(y);
  const E = document.createElement("div");
  if (E.style.cssText = "margin-top:10px;font-size:11px;color:var(--text-dim,#888);", E.textContent = n("「虚拟环境打开」在服务器的虚拟桌面上运行 LibreOffice 并经浏览器 VNC 远程查看——适合不想在本地装 Office、且服务器已配置虚拟屏（aiti-ui-env）的场景。"), i.appendChild(E), t.onRetry || t.onClose) {
    const m = document.createElement("div");
    if (m.style.cssText = "display:flex;justify-content:flex-end;gap:8px;margin-top:14px;", t.onRetry) {
      const b = document.createElement("button");
      b.type = "button", b.textContent = n("重试转换"), b.style.cssText = a, b.onclick = () => t.onRetry(), m.appendChild(b);
    }
    if (t.onClose) {
      const b = document.createElement("button");
      b.type = "button", b.textContent = n("关闭"), b.style.cssText = a + "background:transparent;", b.onclick = () => t.onClose(), m.appendChild(b);
    }
    i.appendChild(m);
  }
  return i;
}
const _e = 2147483600, C = {
  panel: "var(--bg-panel, #1c1c20)",
  hover: "var(--bg-hover, #2a2a30)",
  border: "var(--border, #3a3a42)",
  text: "var(--text, #e8e8ec)",
  accent: "var(--accent, #4f8ef7)",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)"
}, B = {
  info: C.accent,
  success: "#10b981",
  error: "var(--danger, #ef4444)",
  warn: "var(--warn, #f59e0b)"
};
function je(t, e) {
  const o = "http://www.w3.org/2000/svg", n = document.createElementNS(o, "svg");
  n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("width", "18"), n.setAttribute("height", "18"), n.style.flexShrink = "0";
  const i = { fill: "none", stroke: e, "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, s = (c, a) => {
    const l = document.createElementNS(o, c);
    for (const [g, u] of Object.entries(a)) l.setAttribute(g, u);
    n.appendChild(l);
  };
  return t === "warn" ? (s("path", { ...i, d: "M12 3 L22 20 H2 Z" }), s("line", { ...i, x1: "12", y1: "9.5", x2: "12", y2: "14" }), s("line", { ...i, x1: "12", y1: "16.8", x2: "12", y2: "16.9" })) : t === "error" ? (s("circle", { ...i, cx: "12", cy: "12", r: "9" }), s("line", { ...i, x1: "9", y1: "9", x2: "15", y2: "15" }), s("line", { ...i, x1: "15", y1: "9", x2: "9", y2: "15" })) : t === "success" ? (s("circle", { ...i, cx: "12", cy: "12", r: "9" }), s("path", { ...i, d: "M8 12.5 L11 15.5 L16.5 9.5" })) : (s("circle", { ...i, cx: "12", cy: "12", r: "9" }), s("line", { ...i, x1: "12", y1: "11", x2: "12", y2: "16" }), s("line", { ...i, x1: "12", y1: "8", x2: "12", y2: "8.01" })), n;
}
const Me = {
  border: "1px solid " + C.border,
  background: C.hover,
  borderRadius: 6,
  padding: "6px 16px",
  cursor: "pointer",
  fontSize: 13,
  color: C.text,
  fontFamily: "inherit"
};
Promise.resolve();
const se = [];
let z = !1;
function ae(t, e) {
  return new Promise((o) => {
    se.push({ kind: t, opts: e, resolve: o }), N();
  });
}
function N() {
  if (z) return;
  const t = se.shift();
  if (t) {
    z = !0;
    try {
      He(t, () => {
        z = !1, N();
      });
    } catch {
      t.resolve(t.kind === "prompt" ? null : t.kind === "confirm" ? !1 : void 0), z = !1, N();
    }
  }
}
function Le() {
  try {
    const t = document.createElement("dialog");
    return !!t && typeof t.showModal == "function";
  } catch {
    return !1;
  }
}
const Q = "ui-dialogs-backdrop";
function Ie() {
  try {
    if (document.getElementById(Q)) return;
    const t = document.createElement("style");
    t.id = Q, t.textContent = "[data-ui-dialog-overlay]::backdrop{background:transparent;}", (document.head || document.body).appendChild(t);
  } catch {
  }
}
function ze() {
  const t = Le(), e = document.createElement(t ? "dialog" : "div");
  e.setAttribute("data-ui-dialog-overlay", "1"), e.style.cssText = "position:fixed;inset:0;margin:0;border:0;padding:20px;width:auto;height:auto;max-width:none;max-height:none;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:" + _e + ";";
  const o = document.createElement("div");
  if (o.setAttribute("data-ext-float", "1"), o.setAttribute("data-ext-float-w", "440"), o.setAttribute("data-ext-float-autoh", "1"), o.setAttribute("data-ext-float-full", "1"), o.setAttribute("data-ext-float-keepmask", "1"), o.setAttribute("data-ext-float-max", "0"), o.setAttribute("data-ext-float-persist", "0"), o.tabIndex = -1, o.style.cssText = "width:440px;max-width:100%;border-radius:12px;background:" + C.panel + ";border:1px solid " + C.border + ";color:" + C.text + ";font-family:inherit;font-size:13px;box-shadow:0 20px 60px rgba(0,0,0,0.35);outline:none;overflow:hidden;", e.appendChild(o), document.body.appendChild(e), t) {
    Ie();
    try {
      e.showModal();
    } catch {
    }
  }
  return { overlay: e, panel: o };
}
function Pe(t, e, o) {
  const n = e.opts || {}, i = e.kind === "confirm" ? "info" : n.kind === "success" || n.kind === "error" || n.kind === "warn" || n.kind === "info" ? n.kind : "info", s = e.kind === "confirm" && n.danger ? B.error : B[i], c = e.kind === "confirm" && n.danger ? "warn" : i, a = document.createElement("div");
  a.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 18px 0;";
  const l = je(c, s);
  l.style.width = "20px", l.style.height = "20px", a.appendChild(l);
  const g = document.createElement("div");
  if (g.style.cssText = "flex:1;min-width:0;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", g.textContent = n.title || (e.kind === "confirm" ? n.danger ? "危险操作确认" : "确认操作" : e.kind === "prompt" ? "输入" : e.kind === "choice" ? "请选择" : "提示"), a.appendChild(g), t.appendChild(a), n.message) {
    const r = document.createElement("div");
    r.style.cssText = "padding:12px 18px 0;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:" + C.text + ";", r.textContent = String(n.message), t.appendChild(r);
  }
  if (n.detail) {
    const r = document.createElement("pre");
    r.style.cssText = "margin:10px 18px 0;padding:10px 12px;border-radius:8px;background:" + C.hover + ";border:1px solid " + C.border + ";font-family:" + C.mono + ";font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto;color:" + C.text + ";", r.textContent = String(n.detail), t.appendChild(r);
  }
  let u = null;
  e.kind === "prompt" && (u = document.createElement("input"), u.type = "text", u.value = typeof n.value == "string" ? n.value : "", n.placeholder && (u.placeholder = String(n.placeholder)), u.style.cssText = "display:block;margin:12px 18px 0;width:calc(100% - 36px);box-sizing:border-box;border:1px solid " + C.border + ";border-radius:6px;padding:7px 10px;font-size:13px;background:" + C.hover + ";color:" + C.text + ";font-family:inherit;outline:none;", u.addEventListener("focus", () => {
    u.style.borderColor = C.accent;
  }), u.addEventListener("blur", () => {
    u.style.borderColor = C.border;
  }), u.addEventListener("keydown", (r) => {
    r.key === "Enter" && (r.preventDefault(), o(u && n.required && !u.value.trim() ? void 0 : u.value));
  }), t.appendChild(u));
  const d = document.createElement("div");
  d.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px 18px;";
  const f = (r, h, y, p) => {
    const x = document.createElement("button");
    return x.textContent = r, x.style.cssText = Object.entries({
      ...Me,
      ...h ? { background: y ? B.error : C.accent, borderColor: "transparent", color: "#fff", fontWeight: "600" } : {}
    }).map(([E, m]) => E + ":" + m).join(";") + ";", x.addEventListener("click", p), d.appendChild(x), x;
  };
  if (e.kind === "choice") {
    const r = Array.isArray(n.choices) ? n.choices : [];
    for (const h of r)
      f(h.label || h.id, h.tone === "primary", h.tone === "danger", () => o(h.id));
    r.length === 0 && o(n.cancelId ?? null);
  } else if (e.kind === "alert") {
    const r = f(n.confirmText || "确定", !0, !1, () => o(void 0));
    r.__primary = !0;
  } else {
    f(n.cancelText || "取消", !1, !1, () => o(e.kind === "prompt" ? null : e.kind === "choice" ? n.cancelId ?? null : !1));
    const r = f(n.confirmText || (e.kind === "confirm" && n.danger ? "确认执行" : "确定"), !0, !!(e.kind === "confirm" && n.danger), () => o(e.kind === "prompt" ? u && n.required && !u.value.trim() ? void 0 : u.value : !0));
    r.__primary = !0;
  }
  return t.appendChild(d), t.addEventListener("keydown", (r) => {
    r.key === "Escape" ? (r.stopPropagation(), o(e.kind === "prompt" || e.kind === "choice" ? null : e.kind === "confirm" ? !1 : void 0)) : r.key === "Enter" && !(r.target instanceof HTMLButtonElement) && (r.preventDefault(), (d.querySelector("button") ? Array.from(d.querySelectorAll("button")).at(-1) : null)?.click());
  }), u;
}
function He(t, e) {
  const { overlay: o, panel: n } = ze(), i = document.activeElement;
  let s = !1;
  const c = (l) => {
    if (!s) {
      s = !0, t.resolve(l);
      try {
        o.close?.();
      } catch {
      }
      try {
        o.remove();
      } catch {
      }
      try {
        i && typeof i.focus == "function" && i.focus();
      } catch {
      }
      setTimeout(e, 0);
    }
  };
  try {
    o.addEventListener?.("cancel", (l) => {
      try {
        l?.preventDefault?.();
      } catch {
      }
      c(t.kind === "prompt" || t.kind === "choice" ? null : t.kind === "confirm" ? !1 : void 0);
    });
  } catch {
  }
  const a = Pe(n, t, c);
  setTimeout(() => {
    try {
      if (a)
        a.focus(), a.select();
      else {
        const l = n.querySelectorAll("button");
        (l.length ? l[l.length - 1] : n).focus();
      }
    } catch {
    }
  }, 0);
}
function ce(t) {
  return ae("confirm", typeof t == "string" ? { message: t } : t);
}
function Re(t) {
  return ae("prompt", typeof t == "string" ? { message: t } : t);
}
const L = /* @__PURE__ */ new Map();
async function Ue(t, e, o, n) {
  const i = window.__aitiSheetUniverApiUrl || ((a) => a), s = await fetch(i("/api/extensions/aiti-sheet-univer/save-blob"), {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filePath: t, dataBase64: le(e), baseMtimeMs: o, cwd: n })
  }), c = await s.json().catch(() => ({}));
  if (s.status === 409 && c.conflict) {
    const a = new Error("conflict");
    throw a.conflict = !0, a.diskMtimeMs = c.diskMtimeMs, a;
  }
  if (!s.ok) throw new Error(c.error || "保存失败 (" + s.status + ")");
  return c;
}
function le(t) {
  const e = new Uint8Array(t), o = 32768;
  let n = "";
  for (let i = 0; i < e.length; i += o)
    n += String.fromCharCode.apply(null, Array.from(e.subarray(i, i + o)));
  return btoa(n);
}
function Fe(t) {
  const e = document.createElement("div");
  e.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 12px;font-size:11px;color:#92400e;background:#fef3c7;border-bottom:1px solid #fde68a;flex-shrink:0;";
  const o = document.createElement("span");
  o.style.flex = "1 1 auto", o.textContent = "⚠ " + [...t].join("；") + "（保存将剥离这些内容）";
  const n = document.createElement("button");
  return n.type = "button", n.textContent = "✕", n.title = "关闭提示", n.style.cssText = "border:none;background:transparent;cursor:pointer;color:inherit;font-size:12px;", n.onclick = () => e.remove(), e.append(o, n), e;
}
function de(t, e) {
  const o = document.createElement("div");
  o.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--danger, #f87171);font-size:13px;padding:16px;text-align:center;";
  const n = document.createElement("div");
  n.textContent = t;
  const i = document.createElement("div");
  i.style.cssText = "color:var(--text-dim,#888);font-size:12px;word-break:break-all;max-width:80%;", i.textContent = e;
  const s = document.createElement("div");
  return s.style.cssText = "color:var(--text-dim,#888);font-size:12px;", s.textContent = "可用工具条「▦ 打开方式」切换其他编辑器", o.append(n, i, s), o;
}
const Be = (t) => t.split("/").pop() || t;
function fe(t) {
  const e = document.createElement("div");
  e.setAttribute("data-sheet-loading", "1"), e.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-muted,#888);font-size:13px;background:var(--bg,#fff);z-index:5;";
  const o = document.createElement("div");
  o.style.cssText = "width:22px;height:22px;border-radius:50%;border:2.5px solid var(--border,#e0e0e0);border-top-color:var(--primary,#6366f1);animation:aiti-sheet-spin 0.8s linear infinite;";
  const n = document.createElement("div");
  if (n.textContent = t, e.append(o, n), !document.getElementById("aiti-sheet-spin-style")) {
    const i = document.createElement("style");
    i.id = "aiti-sheet-spin-style", i.textContent = "@keyframes aiti-sheet-spin{to{transform:rotate(360deg)}}", document.head.appendChild(i);
  }
  return e;
}
function R(t) {
  t.querySelectorAll("[data-sheet-loading]").forEach((e) => e.remove());
}
async function Ne(t, e, o) {
  const n = L.get(e);
  if (!n) throw new Error("编辑器实例未就绪");
  const i = n.getSnapshot();
  if (!i) throw new Error("快照不可用");
  const s = e.slice(0, e.lastIndexOf("/")) || "/", c = e.split("/").pop() || "book.xlsx", a = s + "/" + c.replace(/(\.[^.]*)$/, "") + "-副本" + (c.match(/\.[^.]*$/)?.[0] || ".xlsx"), l = await Re({ message: "另存为（输入完整路径或当前目录下的文件名）：", value: a });
  if (!l || l.trim() === e) return;
  const g = l.trim(), u = await J(), f = await oe(u, i).xlsx.writeBuffer(), r = window.__aitiSheetUniverApiUrl || ((p) => p);
  if (await (async () => {
    try {
      const p = await fetch(r("/api/extensions/aiti-editor/ticket"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath: g })
      }).then((E) => E.json());
      return !!(await fetch(r("/api/extensions/aiti-editor/t/" + p.ticket + "/stat")).then((E) => E.json())).ok;
    } catch {
      return !1;
    }
  })() && !await ce({ message: `目标文件已存在：
` + g + `
覆盖？`, danger: !0 })) {
    o("已取消另存", "err");
    return;
  }
  const y = await fetch(r("/api/extensions/aiti-sheet-univer/save-blob"), {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filePath: g, dataBase64: le(f) })
  }).then((p) => p.json());
  if (!y.ok) throw new Error(y.error || "另存失败");
  o("已另存为 " + (g.split("/").pop() || g));
  try {
    window.__aitiEditor?.openFile(g);
  } catch {
  }
}
async function Z(t, e, o) {
  const n = L.get(e);
  if (!n) throw new Error("编辑器实例未就绪");
  const i = n.getSnapshot();
  if (!i) throw new Error("快照不可用");
  const s = await J(), a = await oe(s, i).xlsx.writeBuffer();
  try {
    await t.save(a), o("已保存", "ok");
  } catch (l) {
    if (l && l.conflict) {
      if (await ce({ message: "文件已被外部修改，用当前内容覆盖磁盘版本？", danger: !0 })) {
        await t.save(a, { force: !0 }), o("已覆盖外部修改", "ok");
        return;
      }
      o("已取消覆盖，文件保持未保存", "err");
      return;
    }
    throw l;
  }
}
function Je(t, e) {
  const o = e.filePath, n = document.createElement("div");
  n.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:hidden;background:#fff;position:relative;";
  const i = document.createElement("div");
  i.style.cssText = "flex:1;min-height:0;position:relative;", n.appendChild(i);
  let s = null;
  const c = { current: 0 };
  let a = !1, l = !1;
  i.appendChild(fe("加载表格引擎…"));
  const g = (d, f) => {
    const r = document.createElement("div");
    r.style.cssText = "position:absolute;top:38px;left:50%;transform:translateX(-50%);z-index:60;pointer-events:none;max-width:70%;padding:6px 14px;border-radius:999px;color:#fff;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:" + (f === "err" ? "rgba(220,38,38,0.92)" : "rgba(22,101,52,0.92)") + ";", r.textContent = d, n.appendChild(r), setTimeout(() => r.remove(), 2400);
  }, u = (d) => {
    (d.metaKey || d.ctrlKey) && d.key.toLowerCase() === "s" && e.capability === "edit" && (d.preventDefault(), d.stopPropagation(), Z(t, o, g).catch((f) => g(String(f && f.message || f), "err")));
  };
  return window.addEventListener("keydown", u, !0), (async () => {
    const d = await t.readFile();
    if (a) return;
    c.current = d.mtimeMs;
    const f = await J();
    if (a) return;
    const r = new f.Workbook();
    if (await r.xlsx.load(d.data), a) return;
    const { snapshot: h, warnings: y } = ve(r, { fileName: Be(o) });
    if (y.length && !l && (l = !0, n.insertBefore(Fe(y), i)), s = await Oe(i, h, {
      editable: e.capability === "edit",
      onMutation: () => {
        try {
          t.markDirty(!0);
        } catch {
        }
      }
    }), a) {
      s.dispose(), s = null;
      return;
    }
    R(i), L.set(o, {
      getSnapshot: () => {
        try {
          return s ? s.snapshot() : null;
        } catch {
          return null;
        }
      },
      mtimeRef: c
    });
    try {
      t.registerSaveHandler?.(async (p) => {
        if (p === "save") {
          await Z(t, o, g);
          return;
        }
        await Ne(t, o, g);
      });
    } catch {
    }
    try {
      t.markDirty(!1);
    } catch {
    }
  })().catch((d) => {
    a || (R(i), i.innerHTML = "", i.appendChild(de("Excel 文件解析失败", String(d && d.message || d))));
  }), {
    el: n,
    dispose() {
      a = !0, window.removeEventListener("keydown", u, !0), L.get(o) && L.delete(o);
      try {
        s?.dispose();
      } catch {
      }
      s = null;
    }
  };
}
function Ve(t, e) {
  const o = document.createElement("div");
  o.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:hidden;background:#fff;";
  const n = document.createElement("div");
  n.style.cssText = "flex:1;min-height:0;overflow:auto;position:relative;", o.appendChild(n);
  let i = !1;
  return n.style.position = "relative", n.appendChild(fe("解析旧格式…")), (async () => {
    const s = await t.readFile();
    if (i) return;
    const c = await Ee();
    if (i) return;
    R(n);
    const a = c.read(s.data, { type: "array" });
    let l = "";
    for (const f of a.SheetNames)
      l += '<div style="padding:6px 12px;font-weight:600;font-size:12px;color:#888;border-bottom:1px solid #eee;">' + f + "</div>", l += c.utils.sheet_to_html(a.Sheets[f], { header: "", footer: "" });
    n.innerHTML = l || '<div style="padding:40px;text-align:center;color:#888;">空工作簿</div>';
    const g = document.createElement("style");
    g.textContent = "table.xlstable{border-collapse:collapse;font-size:12px;}table.xlstable td{border:1px solid #e5e7eb;padding:3px 8px;white-space:nowrap;max-width:360px;overflow:hidden;text-overflow:ellipsis;}", n.appendChild(g), n.querySelectorAll("table").forEach((f) => f.classList.add("xlstable")), u();
    function u(f) {
      const r = o.querySelector("[data-legacy-tip]");
      r && r.remove();
      const h = document.createElement("div");
      h.setAttribute("data-legacy-tip", "1"), h.style.cssText = "position:sticky;bottom:0;display:flex;align-items:center;gap:8px;padding:5px 12px;font-size:11px;color:#92400e;background:#fef3c7;border-top:1px solid #fde68a;flex-shrink:0;";
      const y = document.createElement("span");
      y.style.flex = "1 1 auto", y.textContent = f ? void 0 : "旧格式只读预览；编辑请先另存 .xlsx（或点右侧一键转换）", f && (y.textContent = f), h.appendChild(y), h.appendChild(d()), o.appendChild(h);
    }
    function d() {
      const f = document.createElement("button");
      return f.type = "button", f.textContent = "转为 .xlsx 并打开", f.title = "后台转换为同名 -fromxls.xlsx 副本（不覆盖原文件与已有文件）并自动打开", f.style.cssText = "flex-shrink:0;padding:2px 10px;font-size:11px;font-weight:600;border:1px solid var(--warn, #f59e0b);border-radius:6px;background:#fff;cursor:pointer;color:#92400e;", f.onclick = async () => {
        f.disabled = !0, f.textContent = "转换中…";
        try {
          const r = window.__aitiSheetUniverApiUrl || ((p) => p), h = await fetch(r("/api/extensions/aiti-sheet-univer/convert-saveas"), {
            method: "POST",
            cache: "no-store",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ filePath })
          }), y = await h.json();
          if (!h.ok && y.code === "soffice-missing") {
            const p = document.createElement("div");
            p.style.cssText = "position:absolute;inset:0;z-index:20;overflow:hidden;background:var(--bg,#fff);", p.appendChild(Ae({
              apiUrl: (x) => r(x),
              filePath,
              targetLabel: ".xlsx",
              t: window.__aitiSheetUniverT,
              onClose: () => {
                try {
                  p.remove();
                } catch {
                }
                f.disabled = !1, f.textContent = "转为 .xlsx 并打开";
              },
              onRetry: () => {
                try {
                  p.remove();
                } catch {
                }
                f.disabled = !1, f.click();
              }
            })), n.appendChild(p);
            return;
          }
          if (!y.ok) throw new Error(y.error || "转换失败");
          u("已创建 " + (y.newPath || "").split("/").pop() + "，正在打开…");
          try {
            window.__aitiEditor?.openFile(y.newPath);
          } catch {
          }
        } catch (r) {
          u(), f.disabled = !1, f.textContent = "转为 .xlsx 并打开", f.title = String(r && r.message || r);
        }
      }, f;
    }
  })().catch((s) => {
    i || (R(n), n.innerHTML = "", n.appendChild(de("旧格式解析失败", String(s && s.message || s))));
  }), { el: o, dispose() {
    i = !0;
  } };
}
function We(t) {
  window.__aitiSheetUniverApiUrl = (e) => typeof t.apiUrl == "function" ? t.apiUrl(e) : e, window.__aitiSheetUniverT = (e, o) => typeof t.t == "function" ? t.t(e, o) : e, pe(() => {
    const e = window.__aitiEditor, o = window.__aitiSheetUniverDisposables || [];
    for (const s of o)
      try {
        s();
      } catch {
      }
    o.length = 0;
    let n = !0;
    try {
      (t.getFeatures?.() || {})["sheet.edit"] === !1 && (n = !1);
    } catch {
    }
    const i = n ? ["preview", "edit"] : ["preview"];
    o.push(e.registerEditorProvider({
      id: "aiti-sheet-univer.sheet",
      displayName: "Excel（Univer）",
      sourceExt: "aiti-sheet-univer",
      selector: { extensions: [".xlsx", ".xlsm"] },
      capabilities: i,
      defaultCapability: "preview",
      contentProvider: "aiti-sheet-univer",
      about: {
        summary: "Excel 表格预览与编辑（exceljs 数据面 + Univer 视图面）",
        capabilities: [
          ".xlsx/.xlsm 打开：样式 / 公式 / 合并 / 冻结 / 行高列宽 / 多 sheet / 隐藏 sheet / tab 色",
          "单元格编辑与保存（Ctrl+S），样式、公式、数字格式往返保持",
          "保存冲突检测（外部修改 → 409 → 确认覆盖）",
          "不支持项保存前明示（顶部警告条）",
          "「打开方式」可与其他编辑器共存；编辑能力可用 sheet.edit 功能开关整体关闭"
        ],
        limits: [
          "图表、透视表、条件格式、数据验证：不支持，保存时剥离（打开时警告条提示）",
          "富文本单元格并为纯文本；超链接仅保留显示文本",
          "保存经 exceljs 重写整个工作簿：.xlsm 宏/VBA 保留不保证，未识别的扩展属性可能丢失",
          "超过 5 万行 / 2000 列截断（只渲染前段）",
          "数字格式含 ODF 条件 token（value()>0 等）会被净化，显示可能略有差异"
        ],
        vendor: "exceljs 4.4 (MIT) + Univer 0.25 (Apache-2.0)"
      },
      render: (s, c) => Je(s, c)
    })), o.push(e.registerEditorProvider({
      id: "aiti-sheet-univer.xls-readonly",
      displayName: "旧格式表格（只读）",
      sourceExt: "aiti-sheet-univer",
      selector: { extensions: [".xls", ".ods"] },
      capabilities: ["preview"],
      defaultCapability: "preview",
      about: {
        summary: "旧格式表格（.xls / .ods）只读预览",
        capabilities: ["内容表格化展示（多 sheet 分节）", "零安装解析（纯 JS）", "文件变化实时跟随（watch）", "一键「转为 .xlsx 并打开」：派生 -fromxls.xlsx 副本（不覆盖原文件；重名自动 (1)/(2) 递增）"],
        limits: ["仅数据还原，不含样式", "只读：编辑走转换出的 .xlsx 副本（原文件不动）"],
        vendor: "@e965/xlsx 0.20 (Apache-2.0) + soffice（转换）"
      },
      render: (s, c) => Ve(s, c)
    })), o.push(e.registerContentProvider({
      id: "aiti-sheet-univer",
      async write(s, c, a) {
        return await Ue(s, c, a);
      }
    })), window.__aitiSheetUniverDisposables = o;
  });
}
export {
  We as default
};
