import type { Metadata, Viewport } from "next";
import { THEME_INIT_SCRIPT } from "@/lib/theme";
import { demoAssetPath } from "@demo/mock/base-path";
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
      </head>
      <body translate="no" className="notranslate" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
