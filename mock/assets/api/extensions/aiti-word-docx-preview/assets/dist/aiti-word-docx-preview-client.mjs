function v(t) {
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
const l = {};
function x(t, e, o) {
  const r = window;
  if (r[e]) return Promise.resolve(r[e]);
  const i = e + "|" + t;
  if (l[i]) return l[i];
  const n = new Promise((c, d) => {
    fetch(t, { cache: "no-store" }).then((s) => {
      if (!s.ok) throw new Error("vendor 加载失败: " + t);
      return s.text();
    }).then((s) => {
      try {
        new Function("exports", "module", "define", s)(void 0, void 0, void 0);
      } catch {
      }
      r[e] ? c(r[e]) : d(new Error("vendor 全局未挂载: " + e));
    }).catch(d);
  });
  return n.catch(() => {
    delete l[i];
  }), n;
}
const y = () => {
  const t = window.__aitiWordDocxPreviewApiUrl;
  if (typeof t == "function")
    try {
      return t("/api/extensions/aiti-word-docx-preview/assets/");
    } catch {
    }
  const e = import.meta.url.match(/^(.*\/assets\/)client\//);
  return e ? e[1] : "/api/extensions/aiti-word-docx-preview/assets/";
}, w = (t) => y() + "vendor/" + t;
function h() {
  return x(w("jszip.min.js"), "JSZip");
}
async function b() {
  return await h(), x(w("docx-preview.min.js"), "docx");
}
function E(t) {
  const e = document.createElement("div");
  e.setAttribute("data-word-loading", "1"), e.style.cssText = "position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-muted,#888);font-size:13px;background:var(--bg,#fff);z-index:5;";
  const o = document.createElement("div");
  o.style.cssText = "width:22px;height:22px;border-radius:50%;border:2.5px solid var(--border,#e0e0e0);border-top-color:var(--primary,#6366f1);animation:aiti-word-spin 0.8s linear infinite;";
  const r = document.createElement("div");
  if (r.textContent = t, e.append(o, r), !document.getElementById("aiti-word-spin-style")) {
    const i = document.createElement("style");
    i.id = "aiti-word-spin-style", i.textContent = "@keyframes aiti-word-spin{to{transform:rotate(360deg)}}", document.head.appendChild(i);
  }
  return e;
}
function f(t) {
  t.querySelectorAll("[data-word-loading]").forEach((e) => e.remove());
}
function g(t, e) {
  const o = document.createElement("div");
  o.style.cssText = "flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:var(--danger, #f87171);font-size:13px;padding:16px;text-align:center;";
  const r = document.createElement("div");
  r.textContent = t;
  const i = document.createElement("div");
  i.style.cssText = "color:var(--text-dim,#888);font-size:12px;word-break:break-all;max-width:80%;", i.textContent = e;
  const n = document.createElement("div");
  return n.style.cssText = "color:var(--text-dim,#888);font-size:12px;", n.textContent = "可用工具条「▦ 打开方式」切换其他编辑器", o.append(r, i, n), o;
}
const _ = "aiti-docx-preview-body";
function P(t, e) {
  const o = document.createElement("div");
  o.style.cssText = "display:flex;flex-direction:column;height:100%;overflow:hidden;background:var(--bg,#fff);position:relative;";
  const r = document.createElement("div");
  r.style.cssText = "display:flex;align-items:center;gap:8px;padding:5px 12px;font-size:11px;color:var(--text-dim,#888);border-bottom:1px solid var(--border,#e0e0e0);flex-shrink:0;", r.textContent = "Word 文档（docx-preview 高保真预览 · 只读）";
  const i = document.createElement("div");
  i.style.cssText = "flex:1;min-height:0;overflow:auto;position:relative;", o.append(r, i), i.appendChild(E("加载文档渲染引擎…"));
  let n = !1, c = [];
  return (async () => {
    const d = await t.readFile();
    if (n) return;
    const s = await b();
    if (n) return;
    f(i);
    const a = document.createElement("div");
    a.className = _;
    const p = document.createElement("div");
    i.append(p, a), await s.renderAsync(d.data, a, p, {
      inWrapper: !0,
      breakPages: !0,
      renderHeaders: !0,
      renderFooters: !0,
      renderFootnotes: !0,
      renderEndnotes: !0,
      ignoreFonts: !1,
      useBase64URL: !1,
      experimental: !0
    }), !n && a.querySelectorAll("img").forEach((m) => {
      const u = m.src || "";
      u.startsWith("blob:") && c.push(u);
    });
  })().catch((d) => {
    n || (f(i), i.innerHTML = "", i.appendChild(g("Word 文档解析失败", String(d && d.message || d))));
  }), {
    el: o,
    dispose() {
      n = !0;
      for (const d of c)
        try {
          URL.revokeObjectURL(d);
        } catch {
        }
      c = [];
    }
  };
}
function A(t) {
  window.__aitiWordDocxPreviewApiUrl = (e) => typeof t.apiUrl == "function" ? t.apiUrl(e) : e, v(() => {
    const e = window.__aitiEditor, o = window.__aitiWordDocxPreviewDisposables || [];
    for (const r of o)
      try {
        r();
      } catch {
      }
    o.length = 0, o.push(e.registerEditorProvider({
      id: "aiti-word-docx-preview.docx",
      displayName: "Word 预览（docx-preview）",
      sourceExt: "aiti-word-docx-preview",
      selector: { extensions: [".docx"] },
      capabilities: ["preview"],
      defaultCapability: "preview",
      about: {
        summary: ".docx 高保真只读预览（页面级还原：分页 / 页眉页脚 / 表格 / 图片 / 列表）",
        capabilities: [
          "高保真分页渲染（比核心 mammoth 纯 HTML 转换显著还原）",
          "页眉 / 页脚 / 脚注 / 尾注渲染",
          "表格 / 图片 / 超链接 / 列表样式还原",
          "零安装解析（纯 JS，文件不落第三方服务）",
          "文件变化实时跟随（watch）"
        ],
        limits: [
          "只读：编辑诉求由「打开方式」路由到 SuperDoc / OnlyOffice 扩展",
          "复杂排版（文本框 / 艺术字 / SmartArt / 批注）还原有限"
        ],
        vendor: "docx-preview 0.4 (Apache-2.0) + JSZip 3.10 (MIT/GPLv3 双许可)"
      },
      render: (r, i) => P(r, i)
    })), window.__aitiWordDocxPreviewDisposables = o;
  });
}
export {
  A as default
};
