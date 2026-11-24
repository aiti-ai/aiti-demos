import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

const DOCS = {
  guide: "https://aiti.pw/guide/features.html",
  guideEn: "https://aiti.pw/en/guide/features.html",
  catalog: "https://aiti.pw/extensions/",
  draftKeeper: "https://aiti.pw/extensions/aiti-draft-keeper.html",
  draftKeeperEn: "https://aiti.pw/en/extensions/aiti-draft-keeper.html",
  queueKeeper: "https://aiti.pw/extensions/aiti-queue-keeper.html",
  queueKeeperEn: "https://aiti.pw/en/extensions/aiti-queue-keeper.html",
  aiInput: "https://aiti.pw/extensions/aiti-ai-input.html",
  aiInputEn: "https://aiti.pw/en/extensions/aiti-ai-input.html",
  msgSmart: "https://aiti.pw/extensions/aiti-msg-smart.html",
  msgSmartEn: "https://aiti.pw/en/extensions/aiti-msg-smart.html",
  msgAnchor: "https://aiti.pw/extensions/aiti-msg-anchor.html",
  msgAnchorEn: "https://aiti.pw/en/extensions/aiti-msg-anchor.html",
  msgNav: "https://aiti.pw/extensions/aiti-msg-nav.html",
  msgNavEn: "https://aiti.pw/en/extensions/aiti-msg-nav.html",
  speek: "https://aiti.pw/extensions/aiti-ai-speek.html",
  speekEn: "https://aiti.pw/en/extensions/aiti-ai-speek.html",
} as const;

export const forkTourSession: SessionScript = {
  id: SESSION_IDS.forkTour,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 26,
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
            en: "Summarize the five signature capabilities from the public feature guide: multi-agent sessions, full-stack usage, multi-workspace, detached sessions, and the composer/message workflow. Then point at the extension host as the mechanism behind most of them.",
            zh: "按公开的功能总览讲五大招牌：多 Agent 会话汇聚、全栈用量、多工作区、会话脱离、输入与消息工作流；然后指出大部分能力都建立在扩展宿主之上。",
          },
          seconds: 16,
          text: {
            en: `This is the **aiti-ai distribution** of Pi Web. The upstream base is still here — sessions, branches, files, Git worktrees, web settings — but five capabilities sit on top of it:

| Signature capability | What it changes |
| --- | --- |
| **One sidebar for many agents** | pi sessions, 25 ACP agents, dedicated CLI drivers (Claude Code, Codex, Cursor, Qoder…) and attached TUI processes all land in **All Sessions**, with tags, FTS search, archive and a board view. |
| **Full-stack usage** | Token reports by workspace/provider/model/key/hour, provider quotas, model health probes, context meter and main-thread FPS — not just a monthly token counter. |
| **Multi-workspace by design** | Several projects/sessions run at once, one workspace can hold several folder docks, and projects/sessions/folders can be pinned in a custom order. |
| **Detached sessions** | An agent can outlive the Pi Web service: a wrapper process hosts it and the UI reattaches after a restart. |
| **Composer & message workflow** | Drafts, queue, autocomplete, voice input, click-to-quote messages, anchors and read-aloud — the two screens you touch most become stateful, recoverable and operable. |

Most of the visible surface is the **extension host**: 46 slots and 60+ bundled extensions. The app drawer, session manager, floating docks, composer contract, model wizard, provider usage, MCP panel and the debug bridge are all extensions or extension-driven.

The full breakdown (with upstream/ours attribution) is in the [feature guide](${DOCS.guideEn}).`,
            zh: `这是 Pi Web 的 **aiti-ai 发行版**。上游底座仍在——会话、分支、文件、Git worktree、网页设置——上面叠了五组招牌能力：

| 招牌能力 | 改变了什么 |
| --- | --- |
| **一个侧栏汇聚多种 agent** | pi 会话、25 家 ACP agent、专业 CLI 驱动（Claude Code / Codex / Cursor / Qoder…）以及附着模式接进来的终端进程，全部进入 **All Sessions**，带 tag、FTS 搜索、归档和看板视图。 |
| **全栈用量** | 按 workspace / provider / model / key / 小时统计 token，提供商配额、模型健康探针、上下文比例条、主线程流畅度——不是简单的月度 token 计数。 |
| **多工作区并行** | 多个项目/会话同时跑，一个工作区可以开多个文件夹 dock，项目/会话/文件夹都能按自定义顺序置顶。 |
| **会话脱离服务进程** | agent 由独立 wrapper 托管，pi-web 服务重启后 UI 还能重新接回原会话。 |
| **输入与消息工作流** | 草稿、队列、补全、语音输入、消息点击智能、锚点导航、跟读听书——把每天点击最多的两块界面做成有状态、可恢复、可操作的链路。 |

可见界面大部分来自 **扩展宿主**：46 个插槽、60+ 个内置扩展。应用抽屉、会话管理器、浮动 dock、composer 契约、模型向导、提供商余额、MCP 面板、调试桥，都是扩展或扩展驱动的。

完整拆解（区分上游与自研）在[功能总览](${DOCS.guide})。`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.8,
      text: {
        en: "The composer and message area — draft keeper, queue, input smart, msg smart, read-aloud. What exactly do those add? I have not seen them elsewhere.",
        zh: "输入框和消息区具体有哪些增强？就是 draft keeper、queue、input smart、msg smart、跟读这些——我在别家没见过。",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Walk the composer/message chain in the order people use it: drafts, queue, input intelligence, message intelligence, read-aloud. Give the mechanism, not marketing, and link each extension doc.",
            zh: "按使用顺序讲输入与消息链：草稿、队列、输入智能、消息智能、跟读。讲机制而不是口号，每项附扩展文档链接。",
          },
          seconds: 22,
          text: {
            en: `These five are the ones I use most, and they are all in-house extensions:

- **Draft Keeper** (\`aiti-draft-keeper\`) — the sole owner of the composer draft state machine. One shared slot per session, so tabs share the same draft; switching sessions, closing the page or crashing restores it verbatim; a rejected send merges the text back; stale slots are pruned after 7 days. Restore waits for host hydration and only writes on real input, so a restore can never delete what you just typed. [Details](${DOCS.draftKeeperEn})
- **Queue Keeper** (\`aiti-queue-keeper\`) — while the agent is busy, queued messages can be reordered (drag), jump-sent as steer, converted to follow-up, recalled for editing, soft-deleted into a recycle bin (8s undo) and imported/exported. The queue itself is mirrored to a server-side sidecar; after a restart you decide per entry — resend / drop / later — and nothing is ever auto-delivered. [Details](${DOCS.queueKeeperEn})
- **Input Smart** (\`aiti-ai-input\`) — two-tier autocomplete (instant local rules → AI continuation fallback), commands typed straight into the composer (\`model\`, \`compact\` — execute and the caret stays in the box), push-to-talk ASR with streaming recognition + 2-pass refinement, pluggable engines and workspace hotwords, plus a mobile newline pill. [Details](${DOCS.aiInputEn})
- **Message Smart** (\`aiti-msg-smart\`) — click any paragraph, heading, table row or code line to copy / quote / highlight / pick an option (yes-no, A-B). Selections can be quoted as a reply; recognizers handle file paths, URLs and closed questions. The anchor banner (\`aiti-msg-anchor\`) tells you which input produced what is on screen, and the nav rail (\`aiti-msg-nav\`) jumps between user turns. [Details](${DOCS.msgSmartEn}) · [anchor](${DOCS.msgAnchorEn}) · [nav](${DOCS.msgNavEn})
- **Read-aloud follow mode** (\`aiti-ai-speek\`) — one click on the 🔊 toolbar toggles listening mode: finished replies queue up in order, the current sentence is highlighted in the message flow and scrolls with the audio (audiobook style). The bar has prev / play / skip / stop, 0.75–2x rate and live voice switching; three engines (browser Web Speech / edge-tts / local ONNX with voice cloning). With follow mode off it subscribes to nothing and sends zero requests. [Details](${DOCS.speekEn})`,
            zh: `这五组是我们日常用得最多、也最能拉开差距的部分（全是自研扩展）：

- **草稿保管员** \`aiti-draft-keeper\`——composer 草稿状态机的唯一所有者。每会话一个共享槽位，多标签页打开同一会话天然同稿；切会话、关页面、崩溃重启后原样恢复；发送失败把原文合并回草稿；7 天陈旧槽位自动清理。恢复要等宿主水合完成、只写真实输入，所以「恢复」不会反过来删掉你刚打的字。[细节](${DOCS.draftKeeper})
- **队列管家** \`aiti-queue-keeper\`——AI 忙时排队的消息可以拖拽排序、插队发送（steer）、转 follow-up、取回编辑、软删进回收站（8 秒撤销）、导入导出。队列镜像在服务端 sidecar，重启后逐条决定「重发 / 丢弃 / 稍后」，绝不自动投递。[细节](${DOCS.queueKeeper})
- **输入智能** \`aiti-ai-input\`——两级自动补全（本地规则秒出 → AI 续写兜底）；命令直接打进输入框（打「模型」「压缩」就执行，光标不离开输入框）；按住说话的实时语音输入（流式识别 + 2-pass 精修 + 多引擎可插拔 + 工作区热词）；小屏还有换行胶囊。[细节](${DOCS.aiInput})
- **消息智能** \`aiti-msg-smart\`——段落、标题、表格行、代码行直接点：复制 / 引用 / 行高亮 / 选项按钮（是·否、A·B）；划选文字可引用回复；文件路径、链接、封闭问句都有对应识别器。配合顶部锚点横幅 \`aiti-msg-anchor\` 和导航条 \`aiti-msg-nav\`，长会话不迷路。[细节](${DOCS.msgSmart}) · [锚点](${DOCS.msgAnchor}) · [导航](${DOCS.msgNav})
- **跟读模式** \`aiti-ai-speek\`——点工具条 🔊 进入听书模式：完成的回复按顺序入队，当前句在消息流里高亮并自动滚动；播放条有上一句 / 暂停 / 跳过 / 停止、0.75–2x 语速、实时换音色；三档引擎（浏览器 Web Speech / edge-tts / 本地 ONNX，可克隆音色）；关闭跟读时零订阅、零请求。[细节](${DOCS.speek})`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.6,
      text: {
        en: "Where do I click to see that in this demo, and where can I read more?",
        zh: "在这个 demo 里，我从哪里点进去看？更多文档在哪？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Give a concrete tour: composer, message area, toolbar read-aloud, sidebar, settings, top bar. Then list the docs links.",
            zh: "给一条具体路线：输入框、消息区、工具条跟读、侧栏、设置、顶栏；最后列文档链接。",
          },
          seconds: 9,
          text: {
            en: `A six-stop tour:

1. **Composer** — type \`model\` or \`compact\` to see command candidates; start typing a sentence to see gray-text completion (it only fires when idle and the caret is at the end).
2. **Message area** — click any paragraph or code line for the action card; hover the quote button for clause highlights. The banner at the top is the anchor; the rail on the right jumps between your inputs.
3. **Toolbar 🔊** — the read-aloud toggle and playback bar (the demo cannot synthesize audio, but the extension UI is the real one).
4. **Sidebar** — \`session-manager\` for All Sessions, projects, tags and archive; the **⋯** menu on a project shows workspace actions; folder docks can be pinned.
5. **Settings** — **Models** is the model wizard, **MCP** is read-only with secrets masked, **Extensions** is the extension manager.
6. **Top bar / right dock** — extension entries (usage, docs, mail, git review, debug…), and the context meter next to **Compact**.

Read more:

- [Feature guide](${DOCS.guideEn}) — every capability, split into upstream vs in-house.
- [Extension catalog](${DOCS.catalog}) — one page per extension, with install and config details.
- Deep dives: [draft keeper](${DOCS.draftKeeperEn}) · [queue keeper](${DOCS.queueKeeperEn}) · [input smart](${DOCS.aiInputEn}) · [message smart](${DOCS.msgSmartEn}) · [read-aloud](${DOCS.speekEn})

The demo is static: API responses are recorded and replayed. A real install runs the agents, the queue sidecar and the bridges for real.`,
            zh: `一条六站路线：

1. **输入框**——打 \`模型\` 或 \`压缩\` 看命令候选；打一句话看灰字补全（停止输入且光标在末尾才触发）。
2. **消息区**——点任意段落或代码行看操作卡片；hover 引用按钮看子句高亮。顶部是锚点横幅，右侧导航条在用户输入之间跳转。
3. **工具条 🔊**——跟读开关与播放条（静态 demo 不会真的合成音频，但扩展 UI 是真实的）。
4. **侧栏**——\`session-manager\` 管 All Sessions、项目、tag 和归档；点项目上的 **⋯** 看工作区操作；文件夹 dock 可以钉住。
5. **设置**——**Models** 是模型向导，**MCP** 是只读且凭据打码，**Extensions** 是扩展管理器。
6. **顶栏 / 右侧 dock**——扩展入口（用量、文档、邮件、Git 审核、调试…），输入框旁还有上下文比例条。

更多文档：

- [功能总览](${DOCS.guide})——全部能力，逐项区分上游与自研。
- [扩展目录](${DOCS.catalog})——每个扩展一页，含安装与配置细节。
- 深入阅读：[草稿保管员](${DOCS.draftKeeper}) · [队列管家](${DOCS.queueKeeper}) · [输入智能](${DOCS.aiInput}) · [消息智能](${DOCS.msgSmart}) · [跟读模式](${DOCS.speek})

这个 demo 是静态的：API 响应录制后回放；真实安装里 agent、队列 sidecar 和桥都是真跑。`,
          },
        },
      ],
    },
  ],
};
