import type { Metadata, Viewport } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { demoAssetPath } from "@demo/mock/base-path";
import { BAIDU_INIT_SCRIPT, analyticsScriptTags } from "@demo/mock/analytics";
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
 * Runs before any app bundle: seed the demo's multi-folder docks.
 *
 * aiti-folder reads its manifest (`pi:sidebar-dock:folders`) at module init, so
 * seeding from React code races the extension import. An inline head script is
 * early enough for every load. It only fills an untouched manifest (≤1 entry),
 * so a visitor's own arrangements always win.
 */
const FOLDER_SEED_SCRIPT = `(function(){try{
var K="pi:sidebar-dock:folders",C="pi:sidebar-dock:collapsed:";
var b=location.pathname.match(/^\\/([A-Za-z0-9._-]+)(?:\\/|$)/);var key=K+(b?"@/"+b[1]:"");
var want=[["/Users/demo/code/pi-web",1,0],["/Users/demo/code/pi-web/docs",0,1],["/Users/demo/code/pi-web/extensions",0,1],["/Users/demo/pi-cwd-20260918",0,1]];
var cur=[];try{cur=JSON.parse(localStorage.getItem(key)||"[]")}catch(e){}
if(!Array.isArray(cur)||cur.length<=1){
localStorage.setItem(key,JSON.stringify(want.map(function(w){return w[1]?{p:w[0],pin:1}:{p:w[0]}})));
}
for(var i=0;i<want.length;i++){var fk="aiti-folder:folder:"+want[i][0];
var ck=C+fk;if(localStorage.getItem(ck)===null)localStorage.setItem(ck,want[i][2]?"0":"1");
var pk="pi-web:ext-float:dockpref:v1:"+fk;
if(localStorage.getItem(pk)===null)localStorage.setItem(pk,"sidebar:"+fk);}
}catch(e){}})();`;

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
        {/* Analytics: same setup as the aiti-docs site (Baidu + Counterscale). */}
        <script dangerouslySetInnerHTML={{ __html: BAIDU_INIT_SCRIPT }} />
        {analyticsScriptTags().map((tag) => (
          <script
            key={tag.src}
            async
            src={tag.src}
            {...(tag.id ? { id: tag.id } : {})}
            {...(tag.siteId ? { "data-site-id": tag.siteId } : {})}
          />
        ))}
      </head>
      <body translate="no" className="notranslate" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
