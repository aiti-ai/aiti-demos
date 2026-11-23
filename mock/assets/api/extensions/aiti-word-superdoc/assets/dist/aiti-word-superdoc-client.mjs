function M(t) {
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
const D = 2147483600, p = {
  panel: "var(--bg-panel, #1c1c20)",
  hover: "var(--bg-hover, #2a2a30)",
  border: "var(--border, #3a3a42)",
  text: "var(--text, #e8e8ec)",
  accent: "var(--accent, #4f8ef7)",
  mono: "var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)"
}, E = {
  info: p.accent,
  success: "#10b981",
  error: "var(--danger, #ef4444)",
  warn: "var(--warn, #f59e0b)"
};
function O(t, e) {
  const o = "http://www.w3.org/2000/svg", n = document.createElementNS(o, "svg");
  n.setAttribute("viewBox", "0 0 24 24"), n.setAttribute("width", "18"), n.setAttribute("height", "18"), n.style.flexShrink = "0";
  const i = { fill: "none", stroke: e, "stroke-width": "2", "stroke-linecap": "round", "stroke-linejoin": "round" }, r = (u, s) => {
    const c = document.createElementNS(o, u);
    for (const [x, l] of Object.entries(s)) c.setAttribute(x, l);
    n.appendChild(c);
  };
  return t === "warn" ? (r("path", { ...i, d: "M12 3 L22 20 H2 Z" }), r("line", { ...i, x1: "12", y1: "9.5", x2: "12", y2: "14" }), r("line", { ...i, x1: "12", y1: "16.8", x2: "12", y2: "16.9" })) : t === "error" ? (r("circle", { ...i, cx: "12", cy: "12", r: "9" }), r("line", { ...i, x1: "9", y1: "9", x2: "15", y2: "15" }), r("line", { ...i, x1: "15", y1: "9", x2: "9", y2: "15" })) : t === "success" ? (r("circle", { ...i, cx: "12", cy: "12", r: "9" }), r("path", { ...i, d: "M8 12.5 L11 15.5 L16.5 9.5" })) : (r("circle", { ...i, cx: "12", cy: "12", r: "9" }), r("line", { ...i, x1: "12", y1: "11", x2: "12", y2: "16" }), r("line", { ...i, x1: "12", y1: "8", x2: "12", y2: "8.01" })), n;
}
const z = {
  border: "1px solid " + p.border,
  background: p.hover,
  borderRadius: 6,
  padding: "6px 16px",
  cursor: "pointer",
  fontSize: 13,
  color: p.text,
  fontFamily: "inherit"
};
Promise.resolve();
const A = [];
let b = !1;
function P(t, e) {
  return new Promise((o) => {
    A.push({ kind: t, opts: e, resolve: o }), C();
  });
}
function C() {
  if (b) return;
  const t = A.shift();
  if (t) {
    b = !0;
    try {
      R(t, () => {
        b = !1, C();
      });
    } catch {
      t.resolve(t.kind === "prompt" ? null : t.kind === "confirm" ? !1 : void 0), b = !1, C();
    }
  }
}
function I() {
  try {
    const t = document.createElement("dialog");
    return !!t && typeof t.showModal == "function";
  } catch {
    return !1;
  }
}
const S = "ui-dialogs-backdrop";
function W() {
  try {
    if (document.getElementById(S)) return;
    const t = document.createElement("style");
    t.id = S, t.textContent = "[data-ui-dialog-overlay]::backdrop{background:transparent;}", (document.head || document.body).appendChild(t);
  } catch {
  }
}
function U() {
  const t = I(), e = document.createElement(t ? "dialog" : "div");
  e.setAttribute("data-ui-dialog-overlay", "1"), e.style.cssText = "position:fixed;inset:0;margin:0;border:0;padding:20px;width:auto;height:auto;max-width:none;max-height:none;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;z-index:" + D + ";";
  const o = document.createElement("div");
  if (o.setAttribute("data-ext-float", "1"), o.setAttribute("data-ext-float-w", "440"), o.setAttribute("data-ext-float-autoh", "1"), o.setAttribute("data-ext-float-full", "1"), o.setAttribute("data-ext-float-keepmask", "1"), o.setAttribute("data-ext-float-max", "0"), o.setAttribute("data-ext-float-persist", "0"), o.tabIndex = -1, o.style.cssText = "width:440px;max-width:100%;border-radius:12px;background:" + p.panel + ";border:1px solid " + p.border + ";color:" + p.text + ";font-family:inherit;font-size:13px;box-shadow:0 20px 60px rgba(0,0,0,0.35);outline:none;overflow:hidden;", e.appendChild(o), document.body.appendChild(e), t) {
    W();
    try {
      e.showModal();
    } catch {
    }
  }
  return { overlay: e, panel: o };
}
function N(t, e, o) {
  const n = e.opts || {}, i = e.kind === "confirm" ? "info" : n.kind === "success" || n.kind === "error" || n.kind === "warn" || n.kind === "info" ? n.kind : "info", r = e.kind === "confirm" && n.danger ? E.error : E[i], u = e.kind === "confirm" && n.danger ? "warn" : i, s = document.createElement("div");
  s.style.cssText = "display:flex;align-items:center;gap:10px;padding:14px 18px 0;";
  const c = O(u, r);
  c.style.width = "20px", c.style.height = "20px", s.appendChild(c);
  const x = document.createElement("div");
  if (x.style.cssText = "flex:1;min-width:0;font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;", x.textContent = n.title || (e.kind === "confirm" ? n.danger ? "危险操作确认" : "确认操作" : e.kind === "prompt" ? "输入" : e.kind === "choice" ? "请选择" : "提示"), s.appendChild(x), t.appendChild(s), n.message) {
    const a = document.createElement("div");
    a.style.cssText = "padding:12px 18px 0;line-height:1.55;white-space:pre-wrap;word-break:break-word;color:" + p.text + ";", a.textContent = String(n.message), t.appendChild(a);
  }
  if (n.detail) {
    const a = document.createElement("pre");
    a.style.cssText = "margin:10px 18px 0;padding:10px 12px;border-radius:8px;background:" + p.hover + ";border:1px solid " + p.border + ";font-family:" + p.mono + ";font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-all;max-height:180px;overflow:auto;color:" + p.text + ";", a.textContent = String(n.detail), t.appendChild(a);
  }
  let l = null;
  e.kind === "prompt" && (l = document.createElement("input"), l.type = "text", l.value = typeof n.value == "string" ? n.value : "", n.placeholder && (l.placeholder = String(n.placeholder)), l.style.cssText = "display:block;margin:12px 18px 0;width:calc(100% - 36px);box-sizing:border-box;border:1px solid " + p.border + ";border-radius:6px;padding:7px 10px;font-size:13px;background:" + p.hover + ";color:" + p.text + ";font-family:inherit;outline:none;", l.addEventListener("focus", () => {
    l.style.borderColor = p.accent;
  }), l.addEventListener("blur", () => {
    l.style.borderColor = p.border;
  }), l.addEventListener("keydown", (a) => {
    a.key === "Enter" && (a.preventDefault(), o(l && n.required && !l.value.trim() ? void 0 : l.value));
  }), t.appendChild(l));
  const y = document.createElement("div");
  y.style.cssText = "display:flex;align-items:center;justify-content:flex-end;gap:8px;padding:16px 18px;";
  const h = (a, d, f, m) => {
    const w = document.createElement("button");
    return w.textContent = a, w.style.cssText = Object.entries({
      ...z,
      ...d ? { background: f ? E.error : p.accent, borderColor: "transparent", color: "#fff", fontWeight: "600" } : {}
    }).map(([k, B]) => k + ":" + B).join(";") + ";", w.addEventListener("click", m), y.appendChild(w), w;
  };
  if (e.kind === "choice") {
    const a = Array.isArray(n.choices) ? n.choices : [];
    for (const d of a)
      h(d.label || d.id, d.tone === "primary", d.tone === "danger", () => o(d.id));
    a.length === 0 && o(n.cancelId ?? null);
  } else if (e.kind === "alert") {
    const a = h(n.confirmText || "确定", !0, !1, () => o(void 0));
    a.__primary = !0;
  } else {
    h(n.cancelText || "取消", !1, !1, () => o(e.kind === "prompt" ? null : e.kind === "choice" ? n.cancelId ?? null : !1));
    const a = h(n.confirmText || (e.kind === "confirm" && n.danger ? "确认执行" : "确定"), !0, !!(e.kind === "confirm" && n.danger), () => o(e.kind === "prompt" ? l && n.required && !l.value.trim() ? void 0 : l.value : !0));
    a.__primary = !0;
  }
  return t.appendChild(y), t.addEventListener("keydown", (a) => {
    a.key === "Escape" ? (a.stopPropagation(), o(e.kind === "prompt" || e.kind === "choice" ? null : e.kind === "confirm" ? !1 : void 0)) : a.key === "Enter" && !(a.target instanceof HTMLButtonElement) && (a.preventDefault(), (y.querySelector("button") ? Array.from(y.querySelectorAll("button")).at(-1) : null)?.click());
  }), l;
}
function R(t, e) {
  const { overlay: o, panel: n } = U(), i = document.activeElement;
  let r = !1;
  const u = (c) => {
    if (!r) {
      r = !0, t.resolve(c);
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
    o.addEventListener?.("cancel", (c) => {
      try {
        c?.preventDefault?.();
      } catch {
      }
      u(t.kind === "prompt" || t.kind === "choice" ? null : t.kind === "confirm" ? !1 : void 0);
    });
  } catch {
  }
  const s = N(n, t, u);
  setTimeout(() => {
    try {
      if (s)
        s.focus(), s.select();
      else {
        const c = n.querySelectorAll("button");
        (c.length ? c[c.length - 1] : n).focus();
      }
    } catch {
    }
  }, 0);
}
function L(t) {
  return P("confirm", typeof t == "string" ? { message: t } : t);
}
function q(t) {
  return P("prompt", typeof t == "string" ? { message: t } : t);
}
const F = ["docx"], K = "aiti-word-superdoc-aiti-word-superdoc.css";
let T = !1;
function H() {
  if (T) return;
  const t = import.meta.url.match(/^(.*\/assets\/)(?:dist|client)\//);
  if (!t) return;
  T = !0;
  const e = document.createElement("link");
  e.id = "aiti-word-superdoc-css", e.rel = "stylesheet", e.href = t[1] + "dist/" + K, document.head.appendChild(e);
}
let g = null;
function G() {
  return g || (H(), g = import("./aiti-word-superdoc-chunk-e25dac3a.mjs"), g.catch(() => {
    g = null;
  })), g;
}
const v = /* @__PURE__ */ new Map();
function J(t) {
  const e = document.createElement("div");
  e.setAttribute("data-word-loading", "1"), e.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-muted,#888);font-size:13px;background:var(--bg,#fff);z-index:5;";
  const o = document.createElement("div");
  o.style.cssText = "width:22px;height:22px;border-radius:50%;border:2.5px solid var(--border,#e0e0e0);border-top-color:var(--primary,#6366f1);animation:aiti-word-spin 0.8s linear infinite;";
  const n = document.createElement("div");
  if (n.textContent = t, e.append(o, n), !document.getElementById("aiti-word-spin-style")) {
    const i = document.createElement("style");
    i.id = "aiti-word-spin-style", i.textContent = "@keyframes aiti-word-spin{to{transform:rotate(360deg)}}", document.head.appendChild(i);
  }
  return e;
}
function _(t) {
  t.querySelectorAll("[data-word-loading]").forEach((e) => e.remove());
}
function Q(t, e) {
  const o = document.createElement("div");
  o.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--danger, #f87171);font-size:13px;padding:16px;text-align:center;";
  const n = document.createElement("div");
  n.textContent = t;
  const i = document.createElement("div");
  i.style.cssText = "color:var(--text-dim,#888);font-size:12px;word-break:break-all;max-width:80%;", i.textContent = e;
  const r = document.createElement("div");
  return r.style.cssText = "color:var(--text-dim,#888);font-size:12px;", r.textContent = "可用工具条「▦ 打开方式」切换其他编辑器", o.append(n, i, r), o;
}
async function V(t, e, o, n) {
  const i = window.__aitiWordSuperdocApiUrl || ((s) => s), r = await fetch(i("/api/extensions/aiti-word-superdoc/save-blob"), {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filePath: t, dataBase64: j(e), baseMtimeMs: o, cwd: n })
  }), u = await r.json().catch(() => ({}));
  if (r.status === 409 && u.conflict) {
    const s = new Error("conflict");
    throw s.conflict = !0, s.diskMtimeMs = u.diskMtimeMs, s;
  }
  if (!r.ok) throw new Error(u.error || "保存失败 (" + r.status + ")");
  return u;
}
function j(t) {
  const e = new Uint8Array(t), o = 32768;
  let n = "";
  for (let i = 0; i < e.length; i += o)
    n += String.fromCharCode.apply(null, Array.from(e.subarray(i, i + o)));
  return btoa(n);
}
async function X(t, e, o) {
  const n = v.get(e);
  if (!n) throw new Error("编辑器实例未就绪");
  const i = e.slice(0, e.lastIndexOf("/")) || "/", r = e.split("/").pop() || "doc.docx", u = i + "/" + r.replace(/(\.[^.]*)$/, "") + "-副本" + (r.match(/\.[^.]*$/)?.[0] || ".docx"), s = await q({ message: "另存为（输入完整路径或当前目录下的文件名）：", value: u });
  if (!s || s.trim() === e) return;
  const c = s.trim(), x = window.__aitiWordSuperdocApiUrl || ((a) => a);
  if (await (async () => {
    try {
      const a = await fetch(x("/api/extensions/aiti-editor/ticket"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filePath: c })
      }).then((f) => f.json());
      return !!(await fetch(x("/api/extensions/aiti-editor/t/" + a.ticket + "/stat")).then((f) => f.json())).ok;
    } catch {
      return !1;
    }
  })() && !await L({ message: `目标文件已存在：
` + c + `
覆盖？`, danger: !0 })) {
    o("已取消另存", "err");
    return;
  }
  const y = await n.exportBytes(), h = await fetch(x("/api/extensions/aiti-word-superdoc/save-blob"), {
    method: "POST",
    cache: "no-store",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ filePath: c, dataBase64: j(y) })
  }).then((a) => a.json());
  if (!h.ok) throw new Error(h.error || "另存失败");
  o("已另存为 " + (c.split("/").pop() || c));
  try {
    window.__aitiEditor?.openFile(c);
  } catch {
  }
}
function Y(t, e) {
  const o = e.filePath, n = document.createElement("div");
  n.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg,#fff);position:relative;";
  const i = document.createElement("div");
  i.style.cssText = "flex-shrink:0;border-bottom:1px solid var(--border,#e0e0e0);display:none;";
  const r = document.createElement("div");
  r.style.cssText = "flex:1;min-height:0;position:relative;overflow:hidden;";
  const u = document.createElement("div");
  u.style.cssText = "position:absolute;inset:0;overflow:auto;", r.appendChild(u), n.append(i, r), r.appendChild(J("加载 Word 引擎…（首次约需拉取数 MB）"));
  let s = !1, c = null;
  const x = { current: 0 }, l = async () => await (await c.export({ exportType: F, triggerDownload: !1 })).arrayBuffer(), y = (d, f) => {
    const m = document.createElement("div");
    m.style.cssText = "position:absolute;top:44px;left:50%;transform:translateX(-50%);z-index:600;pointer-events:none;max-width:70%;padding:6px 14px;border-radius:999px;color:#fff;font-size:12px;box-shadow:0 4px 14px rgba(0,0,0,0.25);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:" + (f === "err" ? "rgba(220,38,38,0.92)" : "rgba(22,101,52,0.92)") + ";", m.textContent = d, n.appendChild(m), setTimeout(() => m.remove(), 2400);
  }, h = async () => {
    if (!c) throw new Error("编辑器实例未就绪");
    const d = await l(), f = () => {
      try {
        t.markDirty(!1);
      } catch {
      }
      y("已保存", "ok");
    };
    try {
      await t.save(d), f();
    } catch (m) {
      if (m && m.conflict) {
        if (await L({ message: "文件已被外部修改，用当前内容覆盖磁盘版本？", danger: !0 })) {
          await t.save(d, { force: !0 }), f();
          return;
        }
        y("已取消覆盖，文件保持未保存", "err");
        return;
      }
      throw m;
    }
  }, a = (d) => {
    (d.metaKey || d.ctrlKey) && d.key.toLowerCase() === "s" && e.capability === "edit" && (d.preventDefault(), d.stopPropagation(), h().catch((f) => y(String(f && f.message || f), "err")));
  };
  return window.addEventListener("keydown", a, !0), (async () => {
    const [d, f] = await Promise.all([G(), t.readFile()]);
    if (s) return;
    x.current = f.mtimeMs;
    const m = e.capability === "edit", w = await d.createSuperdoc(u, m ? i : null, f.data, {
      editable: m,
      onUpdate: () => {
        try {
          t.markDirty(!0);
        } catch {
        }
      }
    });
    if (s) {
      try {
        w.sd.destroy();
      } catch {
      }
      return;
    }
    if (c = w.sd, await w.ready, !s) {
      _(r), m && (i.style.display = "block"), v.set(o, {
        exportBytes: l,
        mtimeRef: x
      });
      try {
        t.registerSaveHandler?.(async (k) => {
          if (k === "save") {
            await h();
            return;
          }
          await X(t, o, y);
        });
      } catch {
      }
    }
  })().catch((d) => {
    s || (_(r), r.innerHTML = "", r.appendChild(Q("Word 文档加载失败", String(d && d.message || d))));
  }), {
    el: n,
    dispose() {
      s = !0, window.removeEventListener("keydown", a, !0), v.get(o) && v.delete(o);
      try {
        c?.destroy();
      } catch {
      }
      c = null;
    }
  };
}
function Z(t) {
  window.__aitiWordSuperdocApiUrl = (e) => typeof t.apiUrl == "function" ? t.apiUrl(e) : e, M(() => {
    const e = window.__aitiEditor, o = window.__aitiWordSuperdocDisposables || [];
    for (const r of o)
      try {
        r();
      } catch {
      }
    o.length = 0;
    let n = !0;
    try {
      (t.getFeatures?.() || {})["word.edit"] === !1 && (n = !1);
    } catch {
    }
    const i = n ? ["preview", "edit"] : ["preview"];
    o.push(e.registerEditorProvider({
      id: "aiti-word-superdoc.docx",
      displayName: "Word 编辑（SuperDoc）",
      sourceExt: "aiti-word-superdoc",
      selector: { extensions: [".docx"] },
      capabilities: i,
      defaultCapability: "preview",
      contentProvider: "aiti-word-superdoc",
      about: {
        summary: ".docx 在线编辑（ProseMirror 双向：打开即 docx 结构，导出即 docx 文件）",
        capabilities: [
          "所见即所得编辑（标题 / 粗斜体 / 列表 / 表格 / 图片 / 链接）",
          "编辑态内建工具栏（字号 / 对齐 / 颜色 / 撤销重做）",
          "Ctrl+S 保存回原文件（409 冲突确认覆盖）；另存为 .docx 副本",
          "预览态=只读编辑器（与编辑态同一渲染引擎，无二次转换）",
          "文件变化实时跟随（watch）"
        ],
        limits: [
          "复杂排版（文本框 / 艺术字 / SmartArt / 脚注尾注）导出可能近似",
          "打开时重新序列化整个文档：与原 Word 排版细节可能有差异（保真档请用 OnlyOffice）",
          "首次加载需拉取 ~2.5MB（gzip）引擎"
        ],
        vendor: "SuperDoc 2.12 (AGPL-3.0，隔离于本扩展) + ProseMirror (MIT)",
        license: "AGPL-3.0"
      },
      render: (r, u) => Y(r, u)
    })), o.push(e.registerContentProvider({
      id: "aiti-word-superdoc",
      async write(r, u, s) {
        return await V(r, u, s);
      }
    })), window.__aitiWordSuperdocDisposables = o;
  });
}
export {
  Z as default
};
