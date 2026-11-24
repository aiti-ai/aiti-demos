/**
 * demo-banner client — hand-written ESM (no build step), same shape as
 * aiti-ctx-meter / aiti-draft-keeper clients: the host passes `ctx` with the
 * hyperscript helper and hooks, and `register` returns a disposer.
 *
 * The pill is a `dialogs` slot item mounted permanently by the host; this
 * component renders nothing until it decides to (fixed position, so it is not
 * affected by where the slot lives).
 */

const SITE = "https://aiti.pw";
/** Hidden state lives for the tab session: a reload brings the pill back, which
 *  keeps the demo predictable (no "where did it go" dead end). */
const CLOSED_KEY = "demo-banner:closed";

let h = null;

function readClosed() {
  try {
    return window.sessionStorage.getItem(CLOSED_KEY) === "1";
  } catch {
    return false; // storage unavailable: pill simply cannot be dismissed
  }
}

function writeClosed(closed) {
  try {
    if (closed) window.sessionStorage.setItem(CLOSED_KEY, "1");
    else window.sessionStorage.removeItem(CLOSED_KEY);
  } catch {
    /* ignore */
  }
}

/** 14px line icon (a spark/robot head in the host's stroke style). */
function icon() {
  return h("svg", {
    width: 14,
    height: 14,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": "true",
    style: { flexShrink: 0 },
  }, [
    // Install / download glyph (arrow into a tray) — the same shape as icon.svg,
    // so the pill and the top-bar entry read as "get aiti" at a glance.
    h("path", { key: "a", d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }),
    h("path", { key: "b", d: "m7 10 5 5 5-5" }),
    h("path", { key: "c", d: "M12 15V3" }),
  ]);
}

export default function register(ctx) {
  h = ctx.h;
  const t = (key, fallback) => {
    try {
      const value = typeof ctx.t === "function" ? ctx.t(key) : null;
      return value && value !== key ? value : fallback;
    } catch {
      return fallback;
    }
  };

  /**
   * The floating pill is mounted directly on <body> (not through a slot): the host
   * wraps slot items in its own chrome container (an extman wrench plus a close
   * button), which sits on top of the pill's own ✕. A plain DOM widget has no
   * chrome; the sidebar-footer entry below stays a real slot item, so the
   * extension is still discoverable in the app center / extension manager.
   */
  function mountPill() {
    if (typeof document === "undefined") return () => {};
    if (readClosed()) return () => {};

    const label = t("banner.text", "aiti.pw");
    const tip = t("banner.tip", "aiti — self-hosted AI dev workbench · open aiti.pw");
    const hideLabel = t("banner.close", "Hide");

    // Idempotent: the host can materialize the client more than once (startup
    // batch + slot demand), and a second pill would cover the first one's ✕.
    document.querySelectorAll("[data-demo-banner]").forEach((node) => node.remove());

    const root = document.createElement("div");
    root.setAttribute("data-demo-banner", "1");
    root.setAttribute("role", "complementary");
    root.setAttribute("aria-label", tip);
    root.setAttribute("title", tip);
    root.setAttribute("tabindex", "0");
    root.style.cssText = [
      "position:fixed", "right:16px", "bottom:84px", "z-index:60",
      "display:flex", "align-items:center", "gap:6px",
      "padding:6px 8px 6px 10px", "border-radius:999px",
      "border:1px solid var(--border)", "background:var(--bg-panel)",
      "color:var(--text-muted)", "box-shadow:0 6px 20px rgba(0,0,0,0.16)",
      "font-size:12px", "line-height:1", "cursor:pointer", "user-select:none",
      "opacity:0", "transform:translateY(6px)",
      "transition:opacity .18s ease, transform .18s ease, color .12s ease, border-color .12s ease",
    ].join(";");

    const glyph = document.createElement("span");
    glyph.style.cssText = "display:inline-flex;flex-shrink:0;color:var(--accent)";
    glyph.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:block"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>';

    const text = document.createElement("span");
    text.textContent = label;
    text.style.cssText = "font-weight:600;letter-spacing:.2px";

    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "✕";
    close.setAttribute("data-demo-banner-close", "1");
    close.setAttribute("aria-label", hideLabel);
    close.title = hideLabel;
    close.style.cssText = [
      "display:inline-flex", "align-items:center", "justify-content:center",
      "width:16px", "height:16px", "padding:0", "margin-left:2px",
      "border:none", "border-radius:999px", "background:transparent",
      "color:inherit", "cursor:pointer", "font-size:12px", "opacity:.7",
    ].join(";");

    const open = () => {
      try {
        window.open(SITE, "_blank", "noopener,noreferrer");
      } catch {
        window.location.href = SITE;
      }
    };

    root.addEventListener("click", open);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open();
      }
    });
    root.addEventListener("mouseenter", () => {
      root.style.color = "var(--text)";
      root.style.borderColor = "var(--accent)";
    });
    root.addEventListener("mouseleave", () => {
      root.style.color = "var(--text-muted)";
      root.style.borderColor = "var(--border)";
    });
    close.addEventListener("click", (event) => {
      event.stopPropagation();
      writeClosed(true);
      root.remove();
    });

    root.append(glyph, text, close);
    document.body.appendChild(root);
    requestAnimationFrame(() => {
      root.style.opacity = "1";
      root.style.transform = "translateY(0)";
    });
    return () => root.remove();
  }

  const disposes = [];
  const safeRegister = (slot, items) => {
    try {
      const dispose = ctx.registerItems(slot, items);
      if (typeof dispose === "function") disposes.push(dispose);
    } catch (error) {
      console.warn(`[demo-banner] registerItems(${slot}) failed:`, (error && error.message) || error);
    }
  };

  const unmountPill = mountPill();

  // Permanent entry in the top bar: the pill can be hidden, this one cannot, so
  // the site link is never lost.
  function FooterEntry() {
    const { useState } = ctx;
    const [hover, setHover] = useState(false);
    const label = t("banner.text", "aiti.pw");
    return h("button", {
      type: "button",
      title: t("banner.tip", "aiti — self-hosted AI dev workbench · open aiti.pw"),
      "aria-label": label,
      "data-demo-banner-toolbar": "1",
      onClick: () => {
        try {
          window.open(SITE, "_blank", "noopener,noreferrer");
        } catch {
          window.location.href = SITE;
        }
      },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      style: {
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "2px 8px",
        border: "none",
        borderRadius: 6,
        background: "transparent",
        color: hover ? "var(--text)" : "var(--text-muted)",
        cursor: "pointer",
        fontSize: 11,
        fontFamily: "inherit",
      },
    }, [icon(), h("span", { key: "l" }, label)]);
  }

  // The top bar always renders (the left sidebar is taken over by session-manager,
  // and the host only renders `sidebarFooter` in its own fallback sidebar).
  safeRegister("toolbar", [{ id: "entry", render: FooterEntry, meta: { label: "i18n:banner.label" } }]);

  return () => {
    try { unmountPill(); } catch { /* ignore */ }
    for (const dispose of disposes) {
      try { dispose(); } catch { /* ignore */ }
    }
  };
}
