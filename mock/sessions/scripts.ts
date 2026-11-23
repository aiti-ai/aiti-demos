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
