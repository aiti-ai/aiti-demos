"use client";

import "@demo/mock/install";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/hooks/useI18n";
import { setFullHistoryOpener, setMediaUrlResolver, setTitleDecorator } from "@/lib/demo-seam";
import { staticFileUrlForApi } from "@demo/mock/files";
import { openDemoHistory } from "@demo/mock/export";
import { prefetchDemoHeavyChunks } from "@demo/mock/boot-prefetch";

// Install the demo seams before React renders anything (module scope is fine:
// both are pure setters, and the mock fetch layer is already installed above).
setMediaUrlResolver(staticFileUrlForApi);
setFullHistoryOpener((sessionId) => openDemoHistory(sessionId));
// Window title suffix: makes the tab unmistakably the static demo.
setTitleDecorator((title) => `${title} · aiti-ai demo (mock data)`);
prefetchDemoHeavyChunks();

export function DemoRoot() {
  return (
    <I18nProvider>
      <AppShell />
    </I18nProvider>
  );
}
