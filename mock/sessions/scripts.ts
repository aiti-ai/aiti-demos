import type { SessionScript } from "./types";
import { welcomeSession } from "./content/welcome";
import { filesSession } from "./content/files";
import { modelsSession } from "./content/models";
import { branchingForkSession, branchingSession } from "./content/branching";
import { featureSession } from "./content/feature";
import { extendSession, extendSubagentSession } from "./content/extend";
import { tipsSession } from "./content/tips";
import { scratchSession } from "./content/scratch";
import { forkTourSession } from "./content/fork-tour";
import { multiAgentSession } from "./content/multi-agent";
import { queueWorktreeSession } from "./content/queue-worktree";
import { modelsVaultSession } from "./content/models-vault";
import { devtoolsSession } from "./content/devtools";

/** Every tutorial session, in the order they were "created". */
export const SESSION_SCRIPTS: SessionScript[] = [
  scratchSession,
  tipsSession,
  extendSession,
  extendSubagentSession,
  featureSession,
  branchingSession,
  branchingForkSession,
  modelsSession,
  modelsVaultSession,
  devtoolsSession,
  queueWorktreeSession,
  multiAgentSession,
  filesSession,
  forkTourSession,
  welcomeSession,
];

/**
 * Lightweight, IO-free projection of every script: enough to render the session
 * list (message count, first user text, last assistant text) without building
 * the real entries. The full build (file reads for tool results) runs only when
 * a session is actually opened.
 */
export interface ScriptMetaEntry {
  type: "message";
  id: string;
  parentId: null;
  message: { role: string; content: Array<{ type: string; text: string }> };
}

function textOf(value: { en: string; zh: string } | string): { en: string; zh: string } {
  return typeof value === "string" ? { en: value, zh: value } : value;
}

export const SESSION_SCRIPT_METAS = SESSION_SCRIPTS.map((script) => {
  const texts: Array<{ role: string; text: string }> = [];
  for (const step of script.steps) {
    if (step.kind === "user") {
      texts.push({ role: "user", text: textOf(step.text).en });
    } else if (step.kind === "assistant") {
      const last = step.rounds[step.rounds.length - 1];
      if (last?.text) texts.push({ role: "assistant", text: textOf(last.text).en });
    } else if (step.kind === "compaction") {
      texts.push({ role: "custom", text: textOf(step.summary).en });
    }
  }
  const metaEntries: ScriptMetaEntry[] = texts.map((entry, index) => ({
    type: "message",
    id: `meta-${index}`,
    parentId: null,
    message: { role: entry.role, content: [{ type: "text", text: entry.text }] },
  }));
  return { ...script, metaEntries };
});
