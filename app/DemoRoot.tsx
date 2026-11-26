"use client";

import { useEffect } from "react";
import "@demo/mock/install";
import { AppShell } from "@/components/AppShell";
import { I18nProvider } from "@/hooks/useI18n";
import { setFullHistoryOpener, setMediaUrlResolver, setTitleDecorator } from "@/lib/demo-seam";
import { staticFileUrlForApi } from "@demo/mock/files";
import { openDemoHistory } from "@demo/mock/export";
import { prefetchDemoHeavyChunks } from "@demo/mock/boot-prefetch";
import { dismissBootSkeleton } from "@demo/mock/boot-skeleton";
import { seedDemoFolderDocks, seedUnreadSessionDots } from "@demo/mock/boot-seed";
import { SESSION_IDS } from "@demo/mock/sessions/ids";
import slotDeclarations from "@demo/mock/data/ext-slot-declarations.json";

// Slot declarations normally arrive from the host's server registry (SSR seed).
// A static export has no server, so the build derives the same table from the
// extension manifest: takeover slots (the sidebar is the one that matters here)
// then hold their skeleton from the very first frame instead of rendering the
// native fallback while the takeover bundle is still on the wire.
const extSlotDeclarations = slotDeclarations as Record<string, string[]>;

// Install the demo seams before React renders anything (module scope is fine:
// both are pure setters, and the mock fetch layer is already installed above).
setMediaUrlResolver(staticFileUrlForApi);
setFullHistoryOpener((sessionId) => openDemoHistory(sessionId));
// Window title suffix: makes the tab unmistakably the static demo.
setTitleDecorator((title) => `${title} · aiti-ai demo (mock data)`);
seedDemoFolderDocks();
// Session rows read their blue "new activity" dot from localStorage on mount.
seedUnreadSessionDots(Object.values(SESSION_IDS));
// Extensions can import (and rewrite the folder manifest) after this module on a
// cold load; top the demo folders up once the app has settled.
if (typeof window !== "undefined") {
  // Repeated nudges: the sidebar orchestrator can snapshot the folder list before
  // aiti-folder registers its faces (cold-load ordering); each event re-syncs it.
  for (const delay of [1_200, 3_500, 6_000, 9_000]) window.setTimeout(() => seedDemoFolderDocks(), delay);
}
prefetchDemoHeavyChunks();

export function DemoRoot() {
  // The static chrome (app/BootSkeleton.tsx) has been on screen since the first
  // frame; now that the real shell is committed, hand over.
  useEffect(() => {
    dismissBootSkeleton();
  }, []);

  return (
    <I18nProvider>
      <AppShell extSlotDeclarations={extSlotDeclarations} />
    </I18nProvider>
  );
}
