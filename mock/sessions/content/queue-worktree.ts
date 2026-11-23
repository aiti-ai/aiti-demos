import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

export const queueWorktreeSession: SessionScript = {
  id: SESSION_IDS.queueWorktree,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 320,
  name: {
    en: "Parallel work: queues, worktrees, many folders",
    zh: "并行工作：队列、Worktree 与多文件夹",
  },
  steps: [
    { kind: "model", provider: "openai-codex", modelId: "gpt-5.5" },
    { kind: "thinking", level: "medium" },
    {
      kind: "user",
      gapMinutes: 0.1,
      text: {
        en: "What happens if I send another message while the agent is running?",
        zh: "agent 正在跑的时候，我再发一条会怎么样？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Explain follow-up vs steer, the queue panel, and crash recovery.",
            zh: "讲 follow-up 与 steer 的区别、队列面板和崩溃恢复。",
          },
          seconds: 7,
          text: {
            en: `It goes into the queue, and you choose how it is delivered:

- **Follow-up** — queued until the current turn finishes.
- **Steer** — interrupts the current turn and is delivered immediately (Alt/Option+Enter).
- **Recall / edit** — remove it from the queue and put it back in the composer.

The \`aiti-queue-keeper\` extension owns the full **queue panel** (reorder, trash, import/export). The queue is mirrored to a sidecar file, so a service restart offers a **recovery dialog** with resend / discard / later — it never auto-delivers.`,
            zh: `会进入队列，由你决定怎么投递：

- **Follow-up**——等当前这一轮结束后再发。
- **Steer**——打断当前轮，立即投递（Alt/Option+Enter）。
- **取回 / 编辑**——从队列移除并放回输入框。

\`aiti-queue-keeper\` 扩展接管完整的 **队列面板**（排序、回收站、导入导出）。队列会镜像到 sidecar 文件，服务重启后弹出 **恢复对话框**，由你选择重发 / 丢弃 / 稍后——绝不自动投递。`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.4,
      text: {
        en: "I need two projects running at once, and one of them on a separate worktree.",
        zh: "我要同时跑两个项目，其中一个放在单独的 worktree 上。",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          seconds: 10,
          text: {
            en: `That is the **multi-workspace** design:

1. **Projects** in the sidebar list every workspace derived from your sessions. Switch projects without stopping the other project's agent; sessions are grouped per project.
2. **New session → Workspace** opens the project/worktree picker. Pick a branch or **Create worktree**; the new session starts in that directory.
3. **Folders** — \`aiti-folder\` v2 gives every directory its own dock block (left sidebar, right panel or floating window). Pin the ones you use constantly; unpinned blocks follow a small LRU quota.
4. **Pin** projects, sessions and folders — the pinned order is persisted per deployment sub-path.

The worktree picker and the folder docks are extensions, so the host itself only knows “a cwd and a worktree list”.`,
            zh: `这是 **多工作区** 的设计：

1. 侧栏 **Projects** 列出所有由会话派生的工作区。切换项目不需要停掉另一个项目的 agent；会话按项目分组。
2. **新建会话 → Workspace** 打开项目/worktree 选择器。选分支或 **创建 worktree**，新会话就在那个目录启动。
3. **文件夹**——\`aiti-folder\` v2 给每个目录一个 dock 区块（左栏、右栏或浮窗）。常用目录钉住；未钉住的按一个小 LRU 配额自动关闭。
4. **置顶**——项目、会话、文件夹都能按自定义顺序置顶，按部署子路径独立持久化。

worktree 选择器和文件夹 dock 都是扩展，宿主本身只知道“一个 cwd 和一个 worktree 列表”。`,
          },
        },
      ],
    },
  ],
};
