/**
 * demo-banner — demo-only, frontend-only extension.
 *
 * Lives in the aiti-demos repo (not in aiti-ai, never published): it exists so
 * the static demo has a visible way out to the site. Loaded by the real
 * extension host like any other extension, so it also demonstrates the
 * framework (app center card, extension manager entry, disable/reopen).
 */
export default {
  id: "demo-banner",
  name: "aiti.pw entry",
  icon: "icon.svg",
  client: "dist/client.mjs",
  ui: {
    // `pages` items are mounted permanently by the host as plain elements (no
    // dialog chrome); the component decides whether to render.
    pages: [{ id: "pill", label: "i18n:banner.label" }],
    // Permanent entry in the sidebar footer (next to Models / Skills / Settings):
    // the floating pill can be hidden, this one cannot, so the site link is
    // never lost. Registered at runtime (see dist/client.mjs).
    sidebarFooter: [{ id: "entry", label: "i18n:banner.label" }],
    i18n: {
      en: {
        "ext.displayName": "aiti.pw entry",
        "banner.label": "aiti.pw entry",
        "banner.text": "aiti.pw",
        "banner.tip": "aiti — self-hosted AI dev workbench · open aiti.pw",
        "banner.close": "Hide",
      },
      "zh-CN": {
        "ext.displayName": "aiti.pw 入口",
        "banner.label": "aiti.pw 入口",
        "banner.text": "aiti.pw",
        "banner.tip": "aiti —— 自托管 AI 开发工作台 · 打开 aiti.pw",
        "banner.close": "关闭",
      },
    },
  },
};
