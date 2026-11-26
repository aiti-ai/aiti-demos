import type { Metadata, Viewport } from "next";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { demoAssetPath } from "@demo/mock/base-path";
import { analyticsBootScript } from "@demo/mock/analytics";
import { BootSkeleton } from "./BootSkeleton";
import "katex/dist/katex.min.css";
import "./demo.css";

// Local system mono stack instead of next/font/google: the build must work
// without Google Fonts (CN networks), matching the host app.
const notoSansMono = { variable: "--font-noto-mono" };

export const metadata: Metadata = {
  title: "Pi Web · aiti-ai demo (mock data)",
  description: "Static aiti-ai demo: the real Pi Web UI and extension host, backed by recorded mock data (no server, no model calls)",
  applicationName: "Pi Web · aiti-ai demo",
  icons: {
    icon: [
      {
        url: demoAssetPath("/icons/icon-192.png"),
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: demoAssetPath("/icons/apple-touch-icon.png"),
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Pi Web · aiti-ai demo",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a1a" },
  ],
};


/**
 * Runs before any app bundle: seed the demo's folder docks (single-open
 * accordion — exactly one expanded block, see mock/boot-seed.ts).
 *
 * aiti-folder reads its manifest (`pi:sidebar-dock:folders`) at module init, so
 * seeding from React code races the extension import. An inline head script is
 * early enough for every load. It only fills an untouched manifest (≤1 entry),
 * so a visitor's own arrangements always win.
 */
const FOLDER_SEED_SCRIPT = `(function(){try{
var K="pi:sidebar-dock:folders",C="pi:sidebar-dock:collapsed:";
var b=location.pathname.match(/^\\/([A-Za-z0-9._-]+)(?:\\/|$)/);var key=K+(b?"@/"+b[1]:"");
var want=[["/Users/demo/code/pi-web",1,1],["/Users/demo/code/pi-web/docs",0,0],["/Users/demo/code/pi-web/extensions",0,0],["/Users/demo/pi-cwd-20260918",0,0]];
var cur=[];try{cur=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
if(!Array.isArray(cur)||cur.length<=1){
localStorage.setItem(key,JSON.stringify(want.map(function(w){return w[1]?{p:w[0],pin:1}:{p:w[0]}})));
}
for(var i=0;i<want.length;i++){var fk="aiti-folder:folder:"+want[i][0];
var ck=C+fk;if(localStorage.getItem(ck)===null)localStorage.setItem(ck,want[i][2]?"0":"1");
var pk="pi-web:ext-float:dockpref:v1:"+fk;
if(localStorage.getItem(pk)===null)localStorage.setItem(pk,"sidebar:"+fk);}
}catch(e){}})();`;

const ANALYTICS_BOOT_SCRIPT = analyticsBootScript();

/**
 * Scripts worth preloading from the first byte: the host's eager client bundle
 * and the sidebarContent taker's entry (see writeHostSeeds in
 * scripts/build-extension-manifest.mjs). Without the hints the extension graph
 * only starts downloading after the app shell has settled, which on a slow link
 * pushes the sidebar takeover tens of seconds out — long enough that visitors
 * conclude it never takes over. Written by the extension build; absent in a
 * bare `next dev` before the first `npm run extensions`. */
function bootPreloadHrefs(): string[] {
  const file = join(process.cwd(), "mock", "data", "boot-preload.json");
  if (!existsSync(file)) return [];
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8")) as { scripts?: string[] };
    return (parsed.scripts ?? []).filter((href) => typeof href === "string" && href.startsWith("/"));
  } catch {
    return [];
  }
}
const BOOT_PRELOAD = bootPreloadHrefs();
/** Injected as an inline script instead of JSX <link>s: React hoists link
 *  elements into the head, which would emit each hint twice in the static
 *  export. The script runs while the parser is still in <head>, so the
 *  preloads start as early as a literal tag would. */
const BOOT_PRELOAD_SCRIPT = BOOT_PRELOAD.length
  ? `(function(){try{var h=${JSON.stringify(BOOT_PRELOAD.map(demoAssetPath))};for(var i=0;i<h.length;i++){var l=document.createElement("link");l.rel="preload";l.as="script";/* ES modules always fetch in CORS mode, even same-origin: without this the preload is a no-cors fetch and the import() cannot reuse it. */l.crossOrigin="anonymous";l.fetchPriority="low";l.href=h[i];document.head.appendChild(l);}}catch(e){}})();`
  : "";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" translate="no" className={`${notoSansMono.variable} notranslate`} suppressHydrationWarning>
      <head>
        <meta name="google" content="notranslate" />
        <script
          dangerouslySetInnerHTML={{
            __html: THEME_INIT_SCRIPT,
          }}
        />
        <script dangerouslySetInnerHTML={{ __html: FOLDER_SEED_SCRIPT }} />
        {BOOT_PRELOAD_SCRIPT && <script dangerouslySetInnerHTML={{ __html: BOOT_PRELOAD_SCRIPT }} />}
        {/* Analytics: same setup as the aiti-docs site (Baidu + Counterscale),
            loaded once the demo itself has finished booting. */}
        {ANALYTICS_BOOT_SCRIPT && (
          <script dangerouslySetInnerHTML={{ __html: ANALYTICS_BOOT_SCRIPT }} />
        )}
      </head>
      <body translate="no" className="notranslate" suppressHydrationWarning>
        {children}
        {/* Static chrome: paints with the HTML, removed by the app on mount. */}
        <BootSkeleton />
      </body>
    </html>
  );
}
