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
    h("path", { key: "a", d: "M12 2v6" }),
    h("path", { key: "b", d: "m5.5 5.5 3 3" }),
    h("path", { key: "c", d: "m18.5 5.5-3 3" }),
    h("path", { key: "d", d: "M4 14a8 8 0 0 1 16 0v4a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z" }),
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

  function Pill(props) {
    const { useState, useEffect } = ctx;
    const [closed, setClosed] = useState(readClosed);
    const [hover, setHover] = useState(false);
    const [entered, setEntered] = useState(false);

    useEffect(() => {
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }, []);

    if (closed) return null;
    const label = t("banner.text", "aiti.pw");
    const tip = props?.tip ?? t("banner.tip", "aiti — self-hosted AI dev workbench · open aiti.pw");
    const close = () => {
      writeClosed(true);
      setClosed(true);
    };

    const open = () => {
      try {
        window.open(SITE, "_blank", "noopener,noreferrer");
      } catch {
        window.location.href = SITE;
      }
    };

    return h("div", {
      role: "complementary",
      "aria-label": tip,
      "data-demo-banner": "1",
      style: {
        position: "fixed",
        right: 16,
        bottom: 84,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px 6px 10px",
        borderRadius: 999,
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
        color: hover ? "var(--text)" : "var(--text-muted)",
        boxShadow: "0 6px 20px rgba(0,0,0,0.16)",
        fontSize: 12,
        lineHeight: 1,
        cursor: "pointer",
        userSelect: "none",
        opacity: entered ? 1 : 0,
        transform: entered ? "translateY(0)" : "translateY(6px)",
        transition: "opacity .18s ease, transform .18s ease, color .12s ease, border-color .12s ease",
        ...(hover ? { borderColor: "var(--accent)" } : {}),
      },
      onClick: open,
      onKeyDown: (event) => {
        if (event.key === "Enter" || event.key === " ") open();
      },
      onMouseEnter: () => setHover(true),
      onMouseLeave: () => setHover(false),
      tabIndex: 0,
    }, [
      icon(),
      h("span", { key: "label", style: { fontWeight: 600, letterSpacing: 0.2 } }, label),
      h("button", {
        key: "close",
        type: "button",
        "data-demo-banner-close": "1",
        title: t("banner.close", "Hide"),
        "aria-label": t("banner.close", "Hide"),
        onClick: (event) => {
          event.stopPropagation();
          close();
        },
        style: {
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 16,
          height: 16,
          padding: 0,
          marginLeft: 2,
          border: "none",
          borderRadius: 999,
          background: "transparent",
          color: "inherit",
          cursor: "pointer",
          fontSize: 12,
          opacity: 0.7,
        },
      }, "✕"),
    ]);
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

  // `pages` (not `dialogs`): the host mounts those as plain elements, whereas a
  // dialogs item gets dialog chrome injected (extman/close buttons) and would
  // cover the pill's own ✕.
  safeRegister("pages", [{ id: "pill", render: Pill, meta: { label: "i18n:banner.label" } }]);
  // Permanent entry next to Models / Skills / Settings: the pill can be hidden,
  // this one cannot, so the site link is never lost.
  function FooterEntry() {
    const { useState } = ctx;
    const [hover, setHover] = useState(false);
    const label = t("banner.text", "aiti.pw");
    return h("button", {
      type: "button",
      title: t("banner.tip", "aiti — self-hosted AI dev workbench · open aiti.pw"),
      "aria-label": label,
      "data-demo-banner-footer": "1",
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

  safeRegister("sidebarFooter", [{ id: "entry", render: FooterEntry, meta: { label: "i18n:banner.label" } }]);

  return () => {
    for (const dispose of disposes) {
      try { dispose(); } catch { /* ignore */ }
    }
  };
}
