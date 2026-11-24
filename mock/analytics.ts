/**
 * Analytics — mirrors the aiti-docs setup (docs/.vuepress/config.ts + client.ts):
 *
 *  - Baidu Analytics: Baidu's own queue (`_hmt`) plus hm.js.
 *  - Counterscale: self-hosted Cloudflare Worker tracker (`stats.justdb.ai`),
 *    `data-site-id` identifies the site. Its tracker.js patches the history API
 *    for SPA route changes; harmless on a single-page static site.
 *
 * Both are deferred until after the demo's own boot: the page is client-rendered
 * (~2.7MB of JS), so third-party trackers must not compete with it for sockets
 * and bandwidth. `_hmt` is defined inline and up front, so queued events are
 * still delivered whenever hm.js finally lands.
 *
 * Opt out at build time with DEMO_ANALYTICS=off.
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
 * Inline head script: declare the Baidu queue, then append both tracker tags
 * once the window has loaded. `requestIdleCallback` (with a timeout so it still
 * runs on a busy page) keeps the trackers out of the first seconds entirely.
 */
export function analyticsBootScript(): string {
  if (!ENABLED) return "";
  return `(function(){
var started=false;
function start(){
if(started)return;started=true;
var head=document.head||document.documentElement;
function tag(src,attrs){var s=document.createElement("script");s.async=true;s.src=src;
if(attrs)for(var k in attrs)s.setAttribute(k,attrs[k]);head.appendChild(s);}
tag("https://hm.baidu.com/hm.js?${BAIDU_ID}");
tag("${COUNTERSCALE_SRC}",{id:"counterscale-script","data-site-id":"${COUNTERSCALE_SITE}"});
}
function schedule(){if(window.requestIdleCallback)window.requestIdleCallback(start,{timeout:3000});else setTimeout(start,1200);}
window._hmt=window._hmt||[];
if(document.readyState==="complete")schedule();
else window.addEventListener("load",schedule,{once:true});
})();`;
}
