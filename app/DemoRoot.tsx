"use client";

import "@demo/mock/install";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/hooks/useI18n";
import { setFullHistoryOpener, setMediaUrlResolver, setTitleDecorator } from "@/lib/demo-seam";
import { staticFileUrlForApi } from "@demo/mock/files";
import { openDemoHistory } from "@demo/mock/export";
import { prefetchDemoHeavyChunks } from "@demo/mock/boot-prefetch";
import { seedDemoFolderDocks } from "@demo/mock/boot-seed";

// Install the demo seams before React renders anything (module scope is fine:
// both are pure setters, and the mock fetch layer is already installed above).
setMediaUrlResolver(staticFileUrlForApi);
setFullHistoryOpener((sessionId) => openDemoHistory(sessionId));
// Window title suffix: makes the tab unmistakably the static demo.
setTitleDecorator((title) => `${title} · aiti-ai demo (mock data)`);
seedDemoFolderDocks();
// Extensions can import (and rewrite the folder manifest) after this module on a
// cold load; top the demo folders up once the app has settled.
if (typeof window !== "undefined") {
  // Repeated nudges: the sidebar orchestrator can snapshot the folder list before
  // aiti-folder registers its faces (cold-load ordering); each event re-syncs it.
  for (const delay of [1_200, 3_500, 6_000, 9_000]) window.setTimeout(() => seedDemoFolderDocks(), delay);
}
prefetchDemoHeavyChunks();

export function DemoRoot() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
