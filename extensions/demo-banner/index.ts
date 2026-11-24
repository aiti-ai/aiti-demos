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
    // The floating pill is a body-mounted widget (see dist/client.mjs): a slot
    // item would be wrapped in the host's chrome container, whose injected
    // buttons would cover the pill's own close button.
    // Permanent entry in the top bar (the left sidebar is taken over by
    // session-manager, and `sidebarFooter` only renders in the host's fallback
    // sidebar). The floating pill can be hidden; this one cannot.
    toolbar: [{ id: "entry", label: "i18n:banner.label", icon: "icon.svg" }],
    i18n: {
      en: {
        "ext.displayName": "aiti.pw entry",
        "banner.label": "aiti.pw entry",
        "banner.text": "aiti.pw",
        "banner.tip": "Install aiti — self-hosted AI dev workbench · get it at aiti.pw",
        "banner.close": "Hide",
      },
      "zh-CN": {
        "ext.displayName": "aiti.pw 入口",
        "banner.label": "aiti.pw 入口",
        "banner.text": "aiti.pw",
        "banner.tip": "安装 aiti —— 自托管 AI 开发工作台 · 前往 aiti.pw 获取",
        "banner.close": "关闭",
      },
    },
  },
};
