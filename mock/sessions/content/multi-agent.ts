import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

export const multiAgentSession: SessionScript = {
  id: SESSION_IDS.multiAgent,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 130,
  name: {
    en: "Many agents, one sidebar",
    zh: "多个 agent，一个侧栏",
  },
  steps: [
    { kind: "model", provider: "deepseek", modelId: "deepseek-flash" },
    { kind: "thinking", level: "low" },
    {
      kind: "user",
      gapMinutes: 0.1,
      text: {
        en: "Can this workbench drive agents other than pi?",
        zh: "这个工作台除了 pi 还能驱动别的 agent 吗？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Explain the ACP family, dedicated CLI drivers and the attach mode, then where the backend picker lives.",
            zh: "讲 ACP 家族、专业 CLI 驱动和附着模式，再指出后端选择器在哪里。",
          },
          seconds: 12,
          text: {
            en: `Yes — three integration levels:

| Level | What it is | Examples |
| --- | --- | --- |
| **Native** | pi sessions run directly in the host | \`pi\` |
| **ACP** | one adapter auto-detects 25 Agent Client Protocol agents; permission cards, queues and model catalogs are unified | Claude Code, Codex, Gemini, Cursor, Qoder, Kimi, Copilot, OpenCode… |
| **Dedicated CLI drivers** | each one understands a specific CLI's flags, auth and stream format | \`aiti-codex-agent\`, \`aiti-claude-code-agent\`, \`aiti-cursor-agent\`, \`aiti-codebuddy-agent\`, \`aiti-qoder-agent\`, \`aiti-zcode-agent\`, \`aiti-omp-agent\` |
| **Attach** | connect to an agent already running in a terminal through a local socket | \`aiti-attach-agent\` |

Pick one in **New session → Backend**. The composer shows the active backend in the agent badge; ACP sessions expose their permission/queue UI in the same chat surface as pi.`,
            zh: `可以，分三层接入：

| 层级 | 是什么 | 例子 |
| --- | --- | --- |
| **原生** | pi 会话直接跑在宿主里 | \`pi\` |
| **ACP** | 一个适配器自动探测 25 家 Agent Client Protocol agent；授权卡、队列、模型目录统一 | Claude Code、Codex、Gemini、Cursor、Qoder、Kimi、Copilot、OpenCode… |
| **专业 CLI 驱动** | 每家单独吃透 CLI 参数、认证和流格式 | \`aiti-codex-agent\`、\`aiti-claude-code-agent\`、\`aiti-cursor-agent\`、\`aiti-codebuddy-agent\`、\`aiti-qoder-agent\`、\`aiti-zcode-agent\`、\`aiti-omp-agent\` |
| **附着** | 通过本地 socket 连上终端里已经在跑的 agent | \`aiti-attach-agent\` |

在 **新建会话 → Backend** 里选。输入框的 agent 徽标会显示当前后端；ACP 会话的授权/队列 UI 与 pi 在同一个聊天界面里。`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.1,
      text: {
        en: "And their old sessions? Do I have to remember which tool each one came from?",
        zh: "那它们以前的会话呢？我得记住每条是哪个工具聊的吗？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          seconds: 9,
          text: {
            en: `No — that is the first signature capability.

\`session-manager\` parses **23 agent history formats** into one session model. **All Sessions** shows them together; you can search with FTS5, filter by agent or tag, pin projects/sessions, archive a batch into a \`.pwarc\` snapshot and open a board view. Opening a historical session either replays it read-only or resumes it through the matching backend, depending on what that agent supports.

In this static demo the list is the recorded tutorial set; in a real install the same sidebar would also show your Claude Code / Codex / Cursor history.`,
            zh: `不用——这是第一个招牌能力。

\`session-manager\` 把 **23 家 agent 的历史格式**解析成同一套会话模型。**All Sessions** 放在一起看：FTS5 全文搜索、按 agent 或 tag 过滤、项目/会话置顶、批量归档成 \`.pwarc\` 快照、看板视图。点开历史会话时，按该 agent 的能力决定只读回放还是通过对应后端继续聊。

这个静态 demo 里是录制好的教程列表；真实安装中同一个侧栏也会出现你的 Claude Code / Codex / Cursor 历史。`,
          },
        },
      ],
    },
  ],
};
