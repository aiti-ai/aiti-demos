import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

export const forkTourSession: SessionScript = {
  id: SESSION_IDS.forkTour,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 20,
  name: {
    en: "What makes this distribution different?",
    zh: "这个发行版和上游有什么不同？",
  },
  steps: [
    { kind: "model", provider: "openai-codex", modelId: "gpt-5.5" },
    { kind: "thinking", level: "medium" },
    {
      kind: "user",
      gapMinutes: 0.1,
      text: {
        en: "I know upstream pi-web. What does this aiti-ai distribution add on top of it?",
        zh: "我了解上游 pi-web。这个 aiti-ai 发行版在上面加了什么？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Summarize the four signature capabilities from the public feature guide, then point at the extension host as the mechanism behind most of them.",
            zh: "按公开的功能总览讲四大招牌，然后指出大部分能力都建立在扩展宿主之上。",
          },
          seconds: 14,
          text: {
            en: `This is the **aiti-ai distribution** of Pi Web. The upstream base is still here — sessions, branches, files, Git worktrees, web settings — but four capabilities sit on top of it:

| Signature capability | What it changes |
| --- | --- |
| **One sidebar for many agents** | pi sessions, 25 ACP agents, dedicated CLI drivers (Claude Code, Codex, Cursor, Qoder…) and attached TUI processes all land in **All Sessions**, with tags, FTS search, archive and a board view. |
| **Full-stack usage** | Token reports by workspace/provider/model/key/hour, provider quotas, model health probes, context meter and main-thread FPS — not just a monthly token counter. |
| **Multi-workspace by design** | Several projects/sessions run at once, one workspace can hold several folder docks, and projects/sessions/folders can be pinned in a custom order. |
| **Detached sessions** | An agent can outlive the Pi Web service: a wrapper process hosts it and the UI reattaches after a restart. |

Most of the visible surface is the **extension host**: 46 slots and 60+ bundled extensions. The app drawer, session manager, floating docks, composer contract, model wizard, provider usage, MCP panel and the debug bridge are all extensions or extension-driven.`,
            zh: `这是 Pi Web 的 **aiti-ai 发行版**。上游底座仍在——会话、分支、文件、Git worktree、网页设置——上面多了四大招牌能力：

| 招牌能力 | 改变了什么 |
| --- | --- |
| **一个侧栏汇聚多种 agent** | pi 会话、25 家 ACP agent、专业 CLI 驱动（Claude Code / Codex / Cursor / Qoder…）以及附着模式接进来的终端进程，全部进入 **All Sessions**，带 tag、FTS 搜索、归档和看板视图。 |
| **全栈用量** | 按 workspace / provider / model / key / 小时统计 token，提供商配额、模型健康探针、上下文比例条、主线程流畅度——不是简单的月度 token 计数。 |
| **多工作区并行** | 多个项目/会话同时跑，一个工作区可以开多个文件夹 dock，项目/会话/文件夹都能按自定义顺序置顶。 |
| **会话脱离服务进程** | agent 由独立 wrapper 托管，pi-web 服务重启后 UI 还能重新接回原会话。 |

可见界面大部分来自 **扩展宿主**：46 个插槽、60+ 个内置扩展。应用抽屉、会话管理器、浮动 dock、composer 契约、模型向导、提供商余额、MCP 面板、调试桥，都是扩展或扩展驱动的。`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.2,
      text: {
        en: "Where do I click to see that in this demo?",
        zh: "在这个 demo 里，我从哪里点进去看？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Give a concrete tour: app drawer, All Sessions, settings tabs, new-session backend picker, top-bar extension icons, right dock.",
            zh: "给一条具体路线：应用抽屉、All Sessions、设置各 tab、新建会话的后端选择、顶栏扩展图标、右侧 dock。",
          },
          seconds: 8,
          text: {
            en: `A five-stop tour:

1. **App drawer** — collapse the sidebar blocks (Projects / Tasks / System Status). The drawer lists 40+ app cards grouped by category; that is \`aiti-app-center\` consuming the \`commands\` slot.
2. **All Sessions** — the sidebar is \`session-manager\`: projects, sessions, tags and archive. Open the **⋯** menu on a project to see workspace actions.
3. **Settings** — **Models** uses \`aiti-model-wizard\`, **MCP** shows the read-only config with secrets masked, **Extensions** is \`aiti-extman\`.
4. **New session** — the **Backend** picker lists pi plus ACP/custom backends; **Workspace** can pick a branch or a worktree.
5. **Top bar / right dock** — the icons are extension entries (usage, docs, mail, git review, debug…). The composer shows the context meter next to **Compact**; the queue panel appears when the agent is busy.

The demo is static: it replays recorded responses. A real install runs the agents and bridges for real.`,
            zh: `一条五站路线：

1. **应用抽屉**——把侧栏的 Projects / Tasks / System Status 收起，抽屉会按分类列出 40+ 个应用卡；这是 \`aiti-app-center\` 在消费 \`commands\` 槽。
2. **All Sessions**——侧栏是 \`session-manager\`：项目、会话、tag 和归档。点项目上的 **⋯** 菜单看工作区操作。
3. **设置**——**Models** 是 \`aiti-model-wizard\`，**MCP** 展示只读配置且凭据打码，**Extensions** 是 \`aiti-extman\`。
4. **新建会话**——**Backend** 选择器列出 pi 以及 ACP / 自定义后端；**Workspace** 可以选分支或 worktree。
5. **顶栏 / 右侧 dock**——图标都是扩展入口（用量、文档、邮件、Git 审核、调试…）。输入框在 **Compact** 旁边显示上下文比例条；agent 忙时会出现队列面板。

这个 demo 是静态的：回放录制响应。真实安装里 agent 和桥都是真跑。`,
          },
        },
      ],
    },
  ],
};
