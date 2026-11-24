/**
 * Analytics — mirrors the aiti-docs setup (docs/.vuepress/config.ts + client.ts):
 *
 *  - Baidu Analytics: `_hmt` queue defined synchronously, `hm.js` loaded async.
 *    aiti-docs pushes `_setAutoPageview(false)` and reports one PV per SPA route
 *    change; this demo is a static page with no router, so the default auto
 *    pageview is correct and left enabled.
 *  - Counterscale: self-hosted Cloudflare Worker tracker (`stats.justdb.ai`),
 *    `data-site-id` identifies the site. Its tracker.js patches the history API
 *    for SPA route changes; harmless on a single-page static site.
 *
 * Both are opt-out-able: set DEMO_ANALYTICS=off at build time to drop them.
 */

/** Baidu Analytics site id (same property as the docs site). */
const BAIDU_ID = "a708f5b3da36a2aeb0402c8cccc8f33b";
/** Counterscale site id. */
const COUNTERSCALE_SITE = "aiti.pw";
const COUNTERSCALE_SRC = "https://stats.justdb.ai/tracker.js";

const ENABLED = (process.env.DEMO_ANALYTICS ?? "on").toLowerCase() !== "off";

/** Inline head script: the `_hmt` queue must exist before hm.js runs. */
export const BAIDU_INIT_SCRIPT = "var _hmt = _hmt || [];";

/** Head script tags, in load order (both async; the queue is already defined). */
export function analyticsScriptTags(): Array<{ src: string; async: boolean; id?: string; siteId?: string }> {
  if (!ENABLED) return [];
  return [
    { src: `https://hm.baidu.com/hm.js?${BAIDU_ID}`, async: true },
    { src: COUNTERSCALE_SRC, async: true, id: "counterscale-script", siteId: COUNTERSCALE_SITE },
  ];
}
