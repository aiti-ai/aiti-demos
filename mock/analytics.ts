/**
 * Analytics — mirrors the aiti-docs setup (docs/.vuepress/config.ts + client.ts):
 *
 *  - Baidu Analytics: Baidu's own snippet (define `_hmt`, insert hm.js before the
 *    first script). aiti-docs disables auto-pageview for its SPA router and
 *    reports one PV per route change; this demo is a single static page, so the
 *    default auto pageview is correct.
 *    The demo has its **own** property id, separate from the docs site.
 *  - Counterscale: self-hosted Cloudflare Worker tracker (`stats.justdb.ai`),
 *    `data-site-id` identifies the site. Its tracker.js patches the history API
 *    for SPA route changes; harmless on a single-page static site.
 *
 * Both are opt-out-able: set DEMO_ANALYTICS=off at build time to drop them.
 */

/**
 * Baidu Analytics site id — the demo has its own property (the docs site keeps
 * its own id), so demo traffic does not mix into the docs reports.
 */
const BAIDU_ID = "dcf7ea3c9a329de3430ace118f12d88c";
/** Counterscale site id. */
const COUNTERSCALE_SITE = "aiti.pw";
const COUNTERSCALE_SRC = "https://stats.justdb.ai/tracker.js";

const ENABLED = (process.env.DEMO_ANALYTICS ?? "on").toLowerCase() !== "off";

/**
 * Inline head script — Baidu's official snippet: define `_hmt`, then insert the
 * hm.js tag before the first existing script so it loads as early as possible.
 */
export const BAIDU_INIT_SCRIPT = `var _hmt = _hmt || [];
(function() {
  var hm = document.createElement("script");
  hm.src = "https://hm.baidu.com/hm.js?${BAIDU_ID}";
  var s = document.getElementsByTagName("script")[0];
  s.parentNode.insertBefore(hm, s);
})();`;

/** Head script tags, in load order (both async; the queue is already defined). */
/** The inline Baidu snippet, or an empty string when analytics is off. */
export function baiduInitScript(): string {
  return ENABLED ? BAIDU_INIT_SCRIPT : "";
}

export function analyticsScriptTags(): Array<{ src: string; async: boolean; id?: string; siteId?: string }> {
  if (!ENABLED) return [];
  return [
    { src: COUNTERSCALE_SRC, async: true, id: "counterscale-script", siteId: COUNTERSCALE_SITE },
  ];
}
