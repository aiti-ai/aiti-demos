import { PROJECT_ROOT } from "../../paths";
import { SESSION_IDS } from "../ids";
import type { SessionScript } from "../types";

export const modelsVaultSession: SessionScript = {
  id: SESSION_IDS.modelsVault,
  cwd: PROJECT_ROOT,
  startedMinutesAgo: 540,
  name: {
    en: "Models, quotas and secrets",
    zh: "模型、额度与密钥",
  },
  steps: [
    { kind: "model", provider: "claude-gateway", modelId: "claude-sonnet-5" },
    { kind: "thinking", level: "medium" },
    {
      kind: "user",
      gapMinutes: 0.1,
      text: {
        en: "I have several providers and multiple keys per provider. How do I manage them without editing JSON by hand?",
        zh: "我有好几个 provider，每个还有多把 key。不手改 JSON 怎么管？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          thinking: {
            en: "Cover the model wizard, models-combo multi-key rotation, provider usage and the usage report.",
            zh: "讲模型向导、models-combo 多 key 轮转、提供商余额和用量报表。",
          },
          seconds: 11,
          text: {
            en: `Settings → **Models** is \`aiti-model-wizard\`:

- Search a catalog (models.dev + a Chinese AI directory), paste a base URL and it reverse-matches the provider.
- Test connectivity — 2xx **and** 429 count as reachable; a 429 keeps the key but records the retry window.
- Pick or type models, then save. Tokens are masked in the UI and never returned to the frontend.

For multiple keys, the \`pi-models-combo\` plugin rotates keys stickily to dodge rate limits and can aggregate several providers behind one “combo” model. **Provider usage** (16 adapters) shows quotas and balances per provider; **AI usage** reports tokens by workspace/provider/model/key/hour, with CSV export and a Sankey view.`,
            zh: `设置 → **Models** 是 \`aiti-model-wizard\`：

- 搜索目录（models.dev + 国内 AI 目录），贴一个 base URL 也能反查 provider。
- 连通性测试——2xx **和** 429 都算可达；429 保留 key 并记录恢复窗口。
- 选或输入模型后保存。token 在界面里打码，永不返回前端。

多把 key 用 \`pi-models-combo\` 插件做粘性轮转避开限流，还能把多家 provider 聚合成一个“组合模型”。**提供商余额**（16 个适配器）显示每家配额/余额；**AI 用量**按 workspace / provider / model / key / 小时统计 token，支持 CSV 和桑基图。`,
          },
        },
      ],
    },
    {
      kind: "user",
      gapMinutes: 1.3,
      text: {
        en: "I sometimes paste a token into the chat. Is that safe?",
        zh: "我有时会把 token 直接贴进聊天框，安全吗？",
      },
    },
    {
      kind: "assistant",
      rounds: [
        {
          seconds: 8,
          text: {
            en: `Two different layers, with different trade-offs:

- **\`pi-secret-mask\`** — for one-off values. A pasted token becomes a placeholder before the prompt reaches the model; the real value is restored only when a tool executes. It does not persist across sessions.
- **\`pi-secret-vault\`** — for durable secrets. Values are encrypted at rest; the model only ever sees a \`rsec_<hash8>\` token and can query it by alias at tool time. Humans manage aliases from the vault panel; plaintext never enters the chat context.

The web vault panel (\`aiti-secret-vault\`) lists aliases, rotates/reveals/deletes them, and shows which aliases a session has mounted. MCP settings have their own masking layer on the host side, so MCP env/header secrets never reach the browser.`,
            zh: `两层不同的防线，取舍不同：

- **\`pi-secret-mask\`**——适合临时值。贴进 prompt 的 token 在发给模型前变成占位符；只有工具执行时才还原真值，不跨会话持久。
- **\`pi-secret-vault\`**——适合长期密钥。密文落盘；模型只看到 \`rsec_<hash8>\` 令牌，可在工具执行时按别名查询。别名由人在保险库面板管理，明文永不进入聊天上下文。

Web 侧保险库面板（\`aiti-secret-vault\`）可以列别名、轮换、揭示、删除，并查看当前会话挂载了哪些别名。MCP 设置还有宿主侧的打码层，env/header 密钥根本不送到浏览器。`,
          },
        },
      ],
    },
  ],
};
