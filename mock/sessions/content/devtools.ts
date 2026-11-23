import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

export const devtoolsSession: SessionScript = {
  id: SESSION_IDS.devtools,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 1_500,
  name: {
    en: "Debug the page you are building",
    zh: "调试你正在开发的页面",
  },
  steps: [
    { kind: "model", provider: "openai-codex", modelId: "gpt-5.5" },
    { kind: "thinking", level: "medium" },
    {
      kind: "user",
      gapMinutes: 0.1,
      text: {
        en: "Can this workbench inspect a page I am developing, not just its own UI?",
        zh: "这个工作台能检查我正在开发的页面吗？不只是它自己的界面。",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Explain aiti-devtools: injection carriers, the bridge, MCP tools, and the TUI attach path.",
            zh: "讲 aiti-devtools：注入载体、桥、MCP 工具，以及 TUI 附着链路。",
          },
          seconds: 13,
          text: {
            en: `Yes — that is \`aiti-devtools\`, the page-injection half of the ecosystem:

| Piece | What it does |
| --- | --- |
| **Launcher injection** | \`aiti-devtools-vite\` / \`webpack\` / \`nuxt\` (and a VS Code carrier) inject a launcher into your dev server. |
| **Bridge** | The standalone bridge exposes page RPC, a browser MCP client and an AI cockpit over one port (default \`8777\`). |
| **MCP tools** | The agent can list pages, evaluate JS, read console/network, screenshot and run CDP commands through the bridge. |
| **TUI attach** | \`pi-web-bridge\` connects a pi TUI session to the workbench: \`/web\` opens a live view with bidirectional IO. |

\`\`\`mermaid
flowchart LR
  P["Your dev page<br/>(launcher injected)"] <--> B["aiti-bridge<br/>:8777"]
  B <--> W["Pi Web workbench"]
  B <--> A["Any MCP client / agent"]
  T["pi TUI session"] <--> W
\`\`\`

In a real install you start the bridge, open your app, and the page shows up as a debug target. This static demo replays the workbench UI only — the bridge and page injection need the real server.`,
            zh: `可以——这是 \`aiti-devtools\`，生态里的页面注入半边：

| 组件 | 作用 |
| --- | --- |
| **Launcher 注入** | \`aiti-devtools-vite\` / \`webpack\` / \`nuxt\`（以及 VS Code 载体）往你的 dev server 注入启动器。 |
| **桥** | 独立桥在一个端口（默认 \`8777\`）暴露页面 RPC、浏览器 MCP 客户端和 AI 窗。 |
| **MCP 工具** | agent 可以通过桥列页面、执行 JS、读 console/network、截图、跑 CDP 命令。 |
| **TUI 附着** | \`pi-web-bridge\` 把 pi TUI 会话接到工作台：\`/web\` 打开实时视图，双向 IO。 |

\`\`\`mermaid
flowchart LR
  P["你的开发页面<br/>(已注入 launcher)"] <--> B["aiti-bridge<br/>:8777"]
  B <--> W["Pi Web 工作台"]
  B <--> A["任意 MCP 客户端 / agent"]
  T["pi TUI 会话"] <--> W
\`\`\`

真实安装里启动桥、打开你的应用，页面就会作为调试目标出现。这个静态 demo 只回放工作台界面——桥和页面注入需要真实服务。`,
          },
        },
      ],
    },
  ],
};
