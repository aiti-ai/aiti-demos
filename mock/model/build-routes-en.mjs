#!/usr/bin/env node
/**
 * Build mock/model/routes.en.json — English fixture overrides for recorded
 * mock routes whose bodies contain Chinese UI copy.
 *
 *   node mock/model/build-routes-en.mjs
 *
 * Reads mock/model/routes.json (recorded zh-rich bodies, never modified) and
 * writes routes.en.json containing ONLY the CJK-bearing route keys listed in
 * ROUTE_OVERRIDES. Entries keep the recorded structure and all non-Chinese
 * values byte-identical; Chinese strings are replaced through exact-match
 * translation maps (recorded zh string → concise English demo equivalent).
 *
 * By-design bilingual data is NOT translated and is reported as skipped:
 *   - cnName fields (model-wizard catalog/recommend: Chinese display names of
 *     a public catalog — not present in the current recording)
 *   - locale-keyed zh tables (e.g. packageInfo.descriptionI18n["zh-CN"]) —
 *     the extman client resolves these per UI locale and falls back to the
 *     already-English `description` for en, so they must stay Chinese.
 *
 * The script fails (exit 1) when a Chinese string has no translation or a
 * dictionary key no longer matches the recording, so a re-record that adds
 * Chinese copy surfaces immediately instead of silently rendering zh in en.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const demoDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const routesPath = join(demoDir, "mock", "model", "routes.json");
const outPath = join(demoDir, "mock", "model", "routes.en.json");

/** CJK unified ideographs (the script's single notion of "Chinese string"). */
const CJK_RE = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/;

/** Locale-keyed bilingual data: these keys stay Chinese by design. */
const BY_DESIGN_KEY_RE = /^(cnName|zh|zh-CN|zh-TW|zh-Hans|zh-Hant)$/;

// ---------------------------------------------------------------------------
// Translation maps: exact recorded Chinese string → English demo equivalent.
// Strings shared across extensions (spawn env blocks, slot placement copy,
// souls) appear once and are reused wherever the recording repeats them.
// ---------------------------------------------------------------------------

/** Recorded slot-placement copy, shared by every extension. */
const SLOT_COPY = {
  "顶部工具条": "Top toolbar",
  "弹窗（由扩展自身入口触发）": "Dialog (opened from the extension's own entry point)",
  "主区域页面面板（常驻）": "Main-area page panel (persistent)",
  "侧栏底部": "Sidebar footer",
  "左侧栏": "Left sidebar",
  "页面顶部横幅（常驻）": "Top-of-page banner (persistent)",
  "聊天输入框上方": "Above the chat composer",
  "文件查看/编辑接管（按文件匹配）": "File viewer/editor takeover (matched by file)",
  "目录选择器能力（顶栏打开文件夹等消费）": "Folder picker capability (consumed by top-bar open-folder etc.)",
  "命令目录（无 UI 渲染点；应用中心动作卡 + 输入命令提示消费）": "Command catalog (no UI render point; consumed by App Center action cards + composer command suggestions)",
  "左侧会话列表·会话行操作按钮": "Left session list · session-row action buttons",
  "界面": "Appearance",
};

/** Recorded spawn/agent-driver feature copy, shared by every agent backend. */
const AGENT_COPY = {
  "spawn 环境变量": "spawn environment variables",
  "每行一条，启动 agent 子进程时注入（我们自行解析，不依赖 shell，Windows 同样可用）：KEY=VALUE 设置（支持 $VAR / ${VAR} 引用：先取当前生效值，再回退父进程环境变量；未定义按空串）；-NAME 移除该变量（急救口：透传漏进来的坏变量配一行即拔掉）；# 注释与空行忽略。此处可覆盖自动注入的 AITI_BRIDGE_URL，也可 -AITI_BRIDGE_URL 整个去掉。改完下一轮 spawn 生效。":
    "One entry per line, injected when spawning the agent subprocess (we parse it ourselves, no shell needed, works on Windows too): KEY=VALUE sets (supports $VAR / ${VAR} refs: current value first, then parent env fallback; undefined → empty string); -NAME removes a variable (quick fix: one line pulls a leaked bad variable); # comments and blank lines ignored. Can override the auto-injected AITI_BRIDGE_URL or drop it entirely with -AITI_BRIDGE_URL. Takes effect on the next spawn.",
  "FOO=bar\nBAR=$FOO\n-UNWANTED_VAR\n# 注释行与空行忽略":
    "FOO=bar\nBAR=$FOO\n-UNWANTED_VAR\n# comments and blank lines are ignored",
  "显示环境注入": "Display env injection",
  "把 aiti-ui-env 显示模式裁决出的显示环境（DISPLAY/XAUTHORITY/DBUS 等）注入本扩展 spawn 的会话进程，新会话里的 GUI 程序与 MCP 即落在对应屏幕（虚拟屏可经浏览器 VNC 查看）。取值：留空或 auto = 跟随显示模式（快照存在即注入）；off = 不注入；headless = 仅虚拟屏快照注入；desktop = 仅真实桌面快照注入。改完下一轮 spawn 生效；spawn.env 里同名变量仍可覆盖（如 DISPLAY=:0）或 -DISPLAY 排除。":
    "Injects the display environment (DISPLAY/XAUTHORITY/DBUS etc.) decided by aiti-ui-env's display mode into the session processes this extension spawns, so GUI programs and MCP in new sessions land on the matching screen (virtual screens viewable via browser VNC). Values: empty or auto = follow display mode (inject when a snapshot exists); off = don't inject; headless = inject only the virtual-screen snapshot; desktop = inject only the real-desktop snapshot. Takes effect on the next spawn; same-name vars in spawn.env can still override (e.g. DISPLAY=:0) or exclude with -DISPLAY.",
  "spawn 命令覆盖": "spawn command override",
  "留空 = 使用本扩展默认 CLI。填入后以它替换默认 CLI 启动（docker 化包装：这里填 docker，再配「spawn 参数前缀」拼 run --rm -i … 镜像 CLI）。支持 $VAR / ${cwd} 引用（spawn 时展开）。改完下一轮 spawn 生效。注意：命令可执行任意本机程序，配置者须为本机管理员（与 spawn.env 同级信任）。":
    "Empty = use this extension's default CLI. When set, it replaces the default CLI at launch (docker wrap: put docker here and combine with \"spawn args prefix\" into run --rm -i … image CLI). Supports $VAR / ${cwd} refs (expanded at spawn). Takes effect on the next spawn. Note: the command can run any local program — configuring it requires admin-level trust (same as spawn.env).",
  "spawn 参数前缀": "spawn args prefix",
  "每行一个参数，拼在驱动内置参数之前（docker 化：run / --rm / -i / -v 挂载 / 镜像名 / 容器内 CLI 名）。支持 $VAR / ${VAR} / ${cwd}（会话工作目录）引用，spawn 时展开；# 注释与空行忽略。改完下一轮 spawn 生效。docker 配方要求 -v ${cwd}:${cwd} -w ${cwd} 同路径挂载，否则容器内路径与宿主历史不一致。":
    "One arg per line, prepended to the driver's built-in args (docker style: run / --rm / -i / -v mounts / image name / CLI name inside the container). Supports $VAR / ${VAR} / ${cwd} (session working dir) refs, expanded at spawn; # comments and blank lines ignored. Takes effect on the next spawn. The docker recipe needs -v ${cwd}:${cwd} -w ${cwd} same-path mounts, or container paths diverge from host history.",
  "桥工具白名单": "Bridge tool allowlist",
  "注入 agent 的桥（aiti_*）工具白名单。留空 = 只读子集（消息/页面读/人机交互类；page_exec、form_fill 等写类不注入——G1 安全缺省）。* = 全量（恢复旧现状，含页面执行/表单写）。也可给精确名单（逗号/空格分隔，如 aiti_inbox, page_exec）。名单外工具 agent 调用会报 unknown host tool；改完下一轮会话生效。":
    "Allowlist of bridge (aiti_*) tools injected into the agent. Empty = read-only subset (messages / page reads / human-interaction; write tools like page_exec and form_fill are not injected — G1 safe default). * = everything (restores the old behavior, incl. page execution / form writes). Or an exact list (comma/space separated, e.g. aiti_inbox, page_exec). Tools outside the list report unknown host tool; applies to the next session.",
  "留空=只读子集；*=全量；或 aiti_inbox, page_snapshot, page_exec":
    "empty = read-only subset; * = all; or aiti_inbox, page_snapshot, page_exec",
  "CLI 路径": "CLI path",
  "指定 cbc 可执行文件（npm i -g @tencent-ai/codebuddy-code 或 brew install codebuddy-code 后的绝对路径）。留空自动探测 PATH 上的 cbc/codebuddy → npx 兜底（首用有下载延迟）。":
    "Absolute path to the cbc executable (after npm i -g @tencent-ai/codebuddy-code or brew install codebuddy-code). Empty = auto-detect cbc/codebuddy on PATH → npx fallback (first use downloads).",
  "npx 包 spec": "npx package spec",
  "npx 兜底通道拉的包（默认 @tencent-ai/codebuddy-code 最新缓存；可钉版本如 @tencent-ai/codebuddy-code@2.148.0）。仅 cliPath 未配置时生效。":
    "Package pulled by the npx fallback (default @tencent-ai/codebuddy-code latest cache; pin like @tencent-ai/codebuddy-code@2.148.0). Only applies when cliPath is unset.",
  "默认模型": "Default model",
  "新会话默认模型 id（--model）：default-model/fast-model/balanced-model/primary-model/deep-model/glm-5.3/glm-5.2/kimi-k3/kimi-k2.6/minimax-m3/gemini-3.5-flash/gpt-5.x…。留空用账号默认档。":
    "Default model id for new sessions (--model): default-model/fast-model/balanced-model/primary-model/deep-model/glm-5.3/glm-5.2/kimi-k3/kimi-k2.6/minimax-m3/gemini-3.5-flash/gpt-5.x… Empty = account default.",
  "权限模式": "Permission mode",
  "--permission-mode：default/acceptEdits/bypassPermissions/plan/dontAsk/auto。默认 bypassPermissions（headless 无审批面，未放行=任务失败）。stream 模式支持运行中 control_request 切换，exec 模式下轮 spawn 生效。":
    "--permission-mode: default/acceptEdits/bypassPermissions/plan/dontAsk/auto. Default bypassPermissions (headless has no approval surface; unapproved = task fails). stream mode supports mid-run control_request switching; exec mode applies on the next spawn.",
  "连接模式": "Connection mode",
  "stream（默认，长连接：单进程多轮、cwd 进程内固定、免每轮冷启动、运行中可切模型/权限）| exec（兼容档：每轮单发 + --resume，进程隔离）。改后对已有会话需 /session/recycle 或重新打开生效。":
    "stream (default, long-lived: one process many turns, cwd fixed in-process, no per-turn cold start, model/permission switchable mid-run) | exec (compat: one shot + --resume per turn, process-isolated). For existing sessions, apply via /session/recycle or reopen.",
  "API Key（凭据）": "API key (credentials)",
  "CODEBUDDY_API_KEY：腾讯 CodeBuddy 平台个人 API key（覆盖凭据文件）。第三方 OpenAI 兼容网关请同时配 baseUrl。改后即刻生效（下轮 spawn 注入）。":
    "CODEBUDDY_API_KEY: personal API key of the Tencent CodeBuddy platform (overrides the credentials file). For third-party OpenAI-compatible gateways also set baseUrl. Applies immediately (injected on the next spawn).",
  "留空使用凭据文件（🔑 /login/key）": "empty = use the credentials file (🔑 /login/key)",
  "Auth Token（凭据）": "Auth token (credentials)",
  "CODEBUDDY_AUTH_TOKEN：已有 OAuth token（CLI 侧优先级高于 API key）。一般留空。":
    "CODEBUDDY_AUTH_TOKEN: existing OAuth token (CLI-side priority above API key). Usually leave empty.",
  "Base URL（第三方模型网关）": "Base URL (third-party model gateway)",
  "CODEBUDDY_BASE_URL：指向 OpenAI 兼容端点（绕过腾讯积分生态，iam.md 官方支持）。留空走腾讯官方。":
    "CODEBUDDY_BASE_URL: point at an OpenAI-compatible endpoint (bypasses the Tencent credit ecosystem; officially supported per iam.md). Empty = Tencent official.",
  "AITI 桥 URL（MCP 工具注入）": "AITI bridge URL (MCP tool injection)",
  "AITI_BRIDGE_URL：cbc 会话内启用 aiti_* 工具直连浏览器桥（需先 aiti-mcp-register --targets codebuddy 注册 shim）。留空则透传服务进程 env（有则生效），两者皆无=不含桥工具。":
    "AITI_BRIDGE_URL: enables aiti_* tools inside cbc sessions to reach the browser bridge directly (register the shim first with aiti-mcp-register --targets codebuddy). Empty passes through the service process env (if present); neither = no bridge tools.",
};

/** aiti-extman/status + aiti-extman/status?locale=en override map. */
const extman = {
  ...SLOT_COPY,
  ...AGENT_COPY,

  // aiti-secret-vault
  "未声明协议版本（legacy）": "undeclared protocol version (legacy)",

  // aiti-acp-agent
  "ACP Agents (通用 ACP 驱动)": "ACP Agents (universal ACP driver)",
  "工具授权策略": "Tool permission policy",
  "allow（默认，信任 agent：优先切 bypass 模式 + 自动放行，不打扰）| ask（转前端授权卡人工审批，请求与决策写入会话消息）":
    "allow (default, trust the agent: prefer bypass mode + auto-approve, no interruptions) | ask (front-end permission card for human approval; request and decision are written into the session)",
  "人工审批超时（秒）": "Human approval timeout (s)",
  "ask 模式下人工未回应时的兑底：超时自动允许（信任优先），默认 300；0 = 无限等待":
    "Fallback when no human answers in ask mode: auto-approve on timeout (trust-first), default 300; 0 = wait forever",
  "显示「ACP Agents」工具条按钮": "Show the \"ACP Agents\" toolbar button",
  "默认隐藏。打开后在顶部工具栏显示 ACP 管理入口（弹窗）；新会话页 Backend 下拉里的「Manage ACP Agents…」选项不受此开关影响，始终显示":
    "Hidden by default. When on, an ACP management entry (dialog) shows in the top toolbar; the \"Manage ACP Agents…\" option in the new-session Backend dropdown is unaffected and always shown",
  "协议统一了，适配器只需要写一次。": "One protocol, one adapter, written once.",

  // aiti-agent-badge
  "显示 Agent 标识": "Show agent badge",
  "在输入框左下角扩展点显示当前会话的 agent、运行状态与托管方式（小屏在＋面板底部动作区）":
    "Shows the current session's agent, run state and hosting mode at the composer's bottom-left extension point (on small screens, in the ＋ panel's bottom action area)",
  "先看清是谁在干活，再决定它怎么活。": "See who is doing the work before deciding how it runs.",

  // aiti-agent-manager
  "Agent 管理界面": "Agent manager UI",
  "六家 agent 登录态，一屏看尽；多账号穿换，一键切换。": "Six agent login states on one screen; multi-account profiles with one-click switching.",

  // aiti-ai-input
  "顶部工具条图标（语音识别引擎管理入口）": "Top toolbar icon (ASR engine manager entry)",
  "控制页面顶部工具条是否出现图标按钮（点开 = 引擎切换 + 引擎参数 + 通用配置（链路开关/环境变量））。关掉只收起这个入口，不影响语音输入本身（见 voice.enabled）。":
    "Controls whether an icon button appears in the top toolbar (opens engine switching + engine params + general settings (link toggles/env vars)). Turning it off only hides this entry; voice input itself is unaffected (see voice.enabled).",
  "语音输入法（按钮，贴在输入框上）": "Voice input method (button attached to the composer)",
  "控制输入框上的 🎤 语音输入按钮（按住说话 → 实时识别/二次识别上屏整条录入链路）。**未完全测好→默认关**，需到 extman 手动开；关闭时按钮不挂载、也不会申请麦克风；转写文本的拼写修复另有 voice.fix 开关。":
    "Controls the 🎤 voice button on the composer (hold to speak → live recognition / 2-pass refinement straight into the input). **Not fully baked → off by default**; enable manually in extman; when off the button isn't mounted and the mic is never requested; spelling fixes for transcripts have their own voice.fix switch.",
  "AI 行内自动补全": "AI inline autocomplete",
  "仅本地补全（不用模型，0 出网）": "Local-only completion (no model, zero network)",
  "最小字符数（低于不自动补全）": "Min characters (below this, no auto-completion)",
  "输入加权长度不足时不出灰字、不发请求（CJK/全角按 1.5 计——英文 3 字符 / 中文 2 字触发；0=不限制）":
    "No ghost text or requests when the weighted input length is too short (CJK/fullwidth count 1.5 — English 3 chars / Chinese 2 chars to trigger; 0 = unlimited)",
  "上下文：小（~0.8k/次）": "Context: small (~0.8k/request)",
  "上下文：中（~2.9k/次，默认）": "Context: medium (~2.9k/request, default)",
  "上下文：大（~5.5k/次）": "Context: large (~5.5k/request)",
  "收藏/命令联想（建议区显示）": "Favorite/command suggestions (shown in the suggest area)",
  "应用命令提示（输入时联想应用中心的应用/面板/开关，点击直接执行）":
    "App command suggestions (suggest App Center apps/panels/toggles while typing; click to run)",
  "与收藏/命令联想独立的开关：输入词命中应用清单（工具条动作/面板/管理入口/功能开关）时在联想弹窗尾部追加「应用」候选，点击或 ↑↓/Tab 选中后回车直接执行，不向输入框插入文本。→ 自动接受会跳过应用候选（防误执行）。":
    "Independent of favorite/command suggestions: when the typed words match the app catalog (toolbar actions/panels/manage entries/feature toggles), an \"Apps\" candidate is appended to the suggest popup; click or ↑↓/Tab + Enter runs it directly without inserting text. → auto-accept skips app candidates (mis-run protection).",
  "短输入严格过滤阈值（字符数，超过才宽松匹配）": "Strict filter threshold for short input (chars; beyond it, loose matching)",
  "查询长度 ≤ 该值时走严格过滤：英文≥3字符/中文≥2字，且查询需达标题或内容长度的 1/4 才弹出（防短词命中长正文噪音）；> 该值按 substring 宽松匹配。0=关闭严格过滤。":
    "When the query is ≤ this length, strict filtering applies: English ≥3 chars / Chinese ≥2 chars, and the query must reach 1/4 of title or content length to pop up (prevents short words hitting long-text noise); > this length uses loose substring matching. 0 = strict filtering off.",
  "suggest 命令 ⚡ 一键执行（候选项旁加执行按钮，危险命令二次确认）":
    "suggest command ⚡ one-click run (adds a run button next to candidates; dangerous commands confirm twice)",
  "开启后命令联想候选项旁出现 ⚡：点击直接执行该命令（走 aiti-cmd /run + 两段式确认；不自动触发）。":
    "When on, command candidates show ⚡: click to run it right away (via aiti-cmd /run + two-step confirm; never auto-triggered).",
  "语音与高速输入拼写修复（识别到语音或高速输入后修复错字/代码词音译）":
    "Spelling fix for voice & fast typing (fixes typos/phonetic code words after voice or fast input)",
  "语音/高速输入感知条（识别到语音或高速输入时顶部提示正在修复）":
    "Voice/fast-input awareness bar (top hint that fixing is in progress)",
  "实时识别（按住麦克风边说边出；SenseVoice 伪实时分句秒出 / paraformer WS）":
    "Live recognition (hold the mic, text appears as you speak; SenseVoice pseudo-live sentence chunks / paraformer WS)",
  "实时识别开。流式模型选 SenseVoice（默认）= VAD 停顿分句 + SenseVoice 秒出逐句上屏（快，纯中文好）；选 paraformer = 老 WS 逐 chunk 实时（质量差）。":
    "Live recognition on. Streaming model SenseVoice (default) = VAD pause segmentation + SenseVoice sentence-by-sentence output (fast, best for pure Chinese); paraformer = legacy WS per-chunk streaming (lower quality).",
  "VAD 自动切句（说话停顿自动切句识别）": "VAD auto segmentation (pauses automatically split sentences)",
  "按住 🎤 说话，停顿约 0.7s 自动切句并识别上屏；不需要时可关。":
    "Hold 🎤 and speak; a ~0.7s pause auto-splits and recognizes the sentence; turn off if not needed.",
  "静音判定阈值（RMS，越小越灵敏）": "Silence threshold (RMS; lower = more sensitive)",
  "本地 VAD 切句的静音判据：某帧 RMS 低于该值即算静音。实测参考：正常说话 RMS≈0.02~0.10，小声/离麦远≈0.010，很低声≈0.003，安静房间底噪≈0.002~0.003。默认 0.005：够灵敏又高于底噪；安静环境可 0.003，嘈杂/键盘声多改 0.01~0.02。只影响「本地切句」链路（云引擎 + 伪实时分句），走服务端 /ws/vad 时由服务端判定。":
    "Silence criterion for local VAD splitting: a frame below this RMS counts as silence. Reference: normal speech RMS≈0.02~0.10, soft/far from mic ≈0.010, very quiet ≈0.003, quiet-room noise floor ≈0.002~0.003. Default 0.005: sensitive but above noise; quiet rooms 0.003, noisy/keyboard-heavy 0.01~0.02. Only affects the \"local splitting\" path (cloud engines + pseudo-live chunking); server-side /ws/vad decides on its own.",
  "麦克风输入增益（倍）": "Mic input gain (×)",
  "1–8 倍，只作用于送识别的音频（不写入录音文件，不改系统音量）。小声说话可设 2–4；过大会削波失真，>8 无效。":
    "1–8×, applied only to audio sent for recognition (never written to recordings, doesn't change system volume). Soft speech: 2–4; too high clips and distorts, >8 is ignored.",
  "伪实时分句（按住麦克风说话停顿自动切句，SenseVoice 秒出逐句上屏，松手收尾）":
    "Pseudo-live segmentation (hold to speak; pauses auto-split, SenseVoice outputs sentence by sentence, release to finish)",
  "按住说话，停顿 ~0.7s 自动把该句发 SenseVoice 识别上屏（~0.3s/句），不用松手等整段；松手提交尾句。SenseVoice 纯中文快，术语/英文会拆字母。":
    "Hold and speak; a ~0.7s pause sends that sentence to SenseVoice and shows it (~0.3s/sentence) without waiting for the whole take; release commits the tail sentence. SenseVoice is fast for pure Chinese; terms/English get split letter-by-letter.",
  "语音二次识别（松手后稍延离线精修再上屏，2-pass 更准）":
    "2-pass voice re-recognition (offline refinement shortly after release; more accurate)",
  "实时流式模型": "Live streaming model",
  "实时识别模型：SenseVoice（默认·伪实时分句·快）或 paraformer-zh-streaming（老 WS chunk 流式）；改后服务重启生效。":
    "Live recognition model: SenseVoice (default · pseudo-live chunking · fast) or paraformer-zh-streaming (legacy WS chunk streaming); restart the service to apply.",
  "2-pass 精修模型": "2-pass refinement model",
  "松手后离线精修模型（标点/术语大小写/语种；Qwen3 带 context 热词）; 改后服务重启生效。":
    "Offline refinement model after release (punctuation/term casing/language; Qwen3 supports context hot words); restart the service to apply.",
  "热词提取数量（中英文各 N）": "Hot-word extraction count (N each for Chinese/English)",
  "从 All Sessions 历史消息提取的中文/英文热词各 N 个（0=关闭热词；越大越全面但可能稀释）":
    "Extracts N Chinese and N English hot words each from All Sessions history (0 = off; larger = more complete but may dilute)",
  "热词提取包含：用户输入": "Hot-word sources include: user input",
  "热词提取包含：AI 输入": "Hot-word sources include: AI input",
  "你还没打完的字，它已经替你想到一半了。": "It anticipates the rest of your sentence before you finish typing.",

  // aiti-ai-schedule
  "AI 自调度（计划管理）": "AI self-scheduling (plan management)",
  "AI 工具（调度）": "AI tools (scheduling)",
  "会话内注入 schedule_task 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects the schedule_task tool into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",

  // aiti-ai-speek
  "跟读模式（AI 输出朗读）": "Read-aloud mode (AI output TTS)",
  "朗读提示词注入（开启跟读时提示 AI 优化输出，如先给结论/口语化）":
    "Read-aloud prompt injection (when read-aloud is on, asks AI for optimized output — conclusion first, conversational tone)",
  "AI 优化": "AI tuning",
  "edge-tts 后端音质档（已安装时自动开启；效果好于浏览器 Web Speech）":
    "edge-tts backend audio quality (auto-enabled when installed; better than browser Web Speech)",
  "引擎": "Engine",
  "edge-tts 可执行文件路径（留空自动探测 ~/.local/bin、PATH、pipx）":
    "edge-tts executable path (empty = auto-detect ~/.local/bin, PATH, pipx)",
  "如 C:\\Python312\\Scripts\\edge-tts.exe": "e.g. C:\\Python312\\Scripts\\edge-tts.exe",
  "本地 TTS 引擎（本机 CPU 合成，服务就绪时自动开启）":
    "Local TTS engine (on-device CPU synthesis; auto-enabled when the service is ready)",
  "本地 provider（hojo-40m / hojo-80m / qwen3-0.6b / stub；切换后需重启服务）":
    "Local provider (hojo-40m / hojo-80m / qwen3-0.6b / stub; restart the service after switching)",
  "本地引擎": "Local engine",
  "本地服务地址（留空 = 127.0.0.1:8768 自动选端口；也可指向任意 OpenAI 兼容 TTS）":
    "Local service URL (empty = 127.0.0.1:8768 auto port; can also point at any OpenAI-compatible TTS)",
  "本地模型名（透传 model 字段；留空由 provider 决定）":
    "Local model name (passed through as the model field; empty = provider decides)",
  "本地音色 ID（留空 = 服务端第一个音色）": "Local voice ID (empty = the server's first voice)",
  "请求音频格式（pcm 优先，服务不支持时自动降级 wav/mp3）":
    "Requested audio format (pcm first; falls back to wav/mp3 when unsupported)",
  "PCM 采样率（封装 WAV 头用，默认 24000）": "PCM sample rate (for the WAV header, default 24000)",
  "本地服务 API Key（回环地址留空即可；指向远端时才需要）":
    "Local service API key (leave empty for loopback; needed only for remote)",
  "选中本地引擎时自动准备并启动服务（首次会联网下载约 300MB）":
    "Auto-prepare and start the service when the local engine is selected (first run downloads ~300MB)",
  "空闲自动退出秒数（0 = 常驻；默认 1800 = 30 分钟）":
    "Idle auto-exit seconds (0 = keep running; default 1800 = 30 minutes)",
  "模型下载源（留空自动探测：官方 → hf-mirror；也可填镜像/代理地址）":
    "Model download source (empty = auto-detect: official → hf-mirror; a mirror/proxy URL also works)",
  "ONNX 线程数（0 = 自动；CPU 少核机器可调低）": "ONNX thread count (0 = auto; lower it on small-core CPUs)",
  "文本归一化（数字/日期读成中文；首次多装约 700MB，关闭后 venv 约 0.3GB）":
    "Text normalization (reads numbers/dates in Chinese; adds ~700MB on first install; without it the venv is ~0.3GB)",
  "朗读过程（把 AI 的中间叙述也读出来，如「让我看一下…」「我先确认…」；跳过 thinking 与工具执行）":
    "Read the process (also reads AI narration like \"let me check…\", \"let me confirm…\"; skips thinking and tool execution)",
  "朗读内容": "What gets read",
  "忽略阈值（回复少于 N 字不朗读，避免“好的”“收到”刷屏）":
    "Skip threshold (don't read replies shorter than N chars; avoids \"ok\"/\"got it\" spam)",
  "队列": "Queue",
  "你打字，它读给你听。": "You type, it reads aloud.",

  // aiti-ai-usage
  "用量不是账单来了才知道——每一枚 token 都该有去向。": "Know where every token goes before the bill arrives.",
  "用量报表按钮": "Usage report button",
  "会话统计下拉内「用量报表」入口": "\"Usage report\" entry inside the session stats dropdown",

  // aiti-app-center
  "应用中心": "App Center",
  "所有插件入口的家——折叠即开始菜单。": "Home of every plugin entry — collapsed, it's the start menu.",

  // aiti-append-system
  "追加系统提示词（APPEND_SYSTEM.md 管理）": "Append system prompt (APPEND_SYSTEM.md manager)",
  "顶部工具条显示「提示词」按钮": "Show the \"Prompts\" button in the top toolbar",
  "默认隐藏：面板从扩展管理器「打开」进入；打开后顶部工具条常显按钮":
    "Hidden by default: open the panel via the extension manager's \"Open\"; when on, the button is pinned in the top toolbar",

  // aiti-attach-agent
  "Session Attach (socket 附着后端)": "Session Attach (socket-attach backend)",
  "不抢方向盘——agent 已经在跑，附着上去看就好。": "It never grabs the wheel — the agent is already driving; attach and watch.",

  // aiti-backup
  "数据备份（快照）": "Data backup (snapshots)",

  // aiti-bridge-probe
  "桥连接探针（临时诊断）": "Bridge probe (temporary diagnostics)",
  "桥探针按钮": "Bridge probe button",
  "连接诊断": "Connection diagnostics",
  "顶栏显示桥连接探针按钮（临时诊断扩展：采集页面桥/SSE 连接事件并落盘供 AI 分析；问题定位后建议关闭并卸载本扩展）":
    "Shows a bridge probe button in the top bar (temporary diagnostic extension: collects page bridge/SSE connection events to disk for AI analysis; disable and uninstall once the issue is found)",
  "pi-web 扩展：桥连接探针（临时诊断）": "pi-web extension: bridge connection probe (temporary diagnostics)",

  // aiti-channels
  "IM 渠道（cc-connect 大前端）": "IM channels (cc-connect frontend)",
  "cc-connect 托管": "cc-connect supervision",
  "进程行为": "Process behavior",
  "接管 cc-connect 进程生命周期（start/stop/restart/探活，不做 systemd）":
    "Takes over the cc-connect process lifecycle (start/stop/restart/liveness; no systemd)",
  "管理台嵌入": "Admin console embed",
  "面板 🖥️ 管理台 Tab 内嵌 cc-connect 原生 Web UI（独立子域 iframe）":
    "The panel's 🖥️ admin tab embeds cc-connect's native Web UI (separate-subdomain iframe)",
  "aiti-im-list · 渠道/项目/会话清单": "aiti-im-list · channel/project/session list",
  "agent 工具": "Agent tools",
  "列出 IM 渠道/项目/活跃会话（cc-connect）：进程状态、项目清单、活跃会话；发消息前先拿 session_key":
    "Lists IM channels/projects/active sessions (cc-connect): process state, project list, active sessions; grab the session_key before sending",
  "aiti-im-send · 发渠道消息": "aiti-im-send · send channel message",
  "经 cc-connect socket API 向钉钉/飞书/微信等 IM 渠道发文本/文件":
    "Sends text/files to IM channels (DingTalk/Feishu/WeChat etc.) via the cc-connect socket API",
  "AI 不该被锁在网页里——钉钉/飞书/微信都是它的窗口。": "AI shouldn't be locked in a web page — DingTalk/Feishu/WeChat are all its windows.",

  // aiti-cmd
  "aiti 命令管理器（真 TTY 终端 + 常用命令）": "aiti command manager (real TTY terminal + favorite commands)",
  "agent 工具：aiti_cmd_run（AI 会话内经后端 runner 执行命令；危险命令二次确认）":
    "Agent tool: aiti_cmd_run (runs commands in AI sessions via the backend runner; dangerous commands confirm twice)",
  "关闭后新 agent 会话不再注入该工具（已注入会话即时拒绝）。":
    "When off, new agent sessions no longer get the tool (already-injected sessions reject immediately).",
  "大脑留给思考，命令交给收藏夹。": "Keep the brain for thinking; leave the commands to favorites.",
  "工作区终端": "Workspace terminal",
  "aiti-cmd：工作区终端页签接管（xterm）": "aiti-cmd: workspace terminal tab takeover (xterm)",

  // aiti-configs
  "配置版本化 + 崩溃自检（安全网）": "Config versioning + crash self-check (safety net)",
  "AI 工具（配置管理）": "AI tools (config management)",
  "AI 敢乱改，因为身后有一整个 git 当后悔药。": "AI dares to change things because a full git history is the undo button.",

  // aiti-cpu-meter
  "主线程流畅度检测器（读秒 + 0-100 分 + 可注入任意站点）":
    "Main-thread smoothness meter (stopwatch + 0-100 score + injectable into any site)",
  "启用检测器": "Enable the meter",
  "主线程诊断": "Main-thread diagnostics",
  "在本实例页面显示 CPU 流畅度检测器（rAF 读秒 + 0-100 流畅度分 + 颜色分层 + 最小化）。主线程卡死时读秒冻结、分数暴跌。":
    "Shows the CPU smoothness meter on this instance's pages (rAF stopwatch + 0-100 smoothness score + color tiers + minimize). When the main thread jams, the stopwatch freezes and the score plunges.",
  "位置": "Position",
  "默认位置：left-bottom（默认）/ left-top / right-bottom / right-top。可拖动后以拖动位置为准（持久化）。":
    "Default position: left-bottom (default) / left-top / right-bottom / right-top. Draggable; the dragged position wins (persisted).",
  "流畅度评分": "Smoothness score",
  "显示 0-100 流畅度评分（Apdex 锚定 + 颜色分层）+ 会话统计（平均/运行时长/最低）。关 = 纯读秒。":
    "Shows the 0-100 smoothness score (Apdex-anchored + color tiers) + session stats (average/runtime/minimum). Off = stopwatch only.",
  "支持最小化": "Supports minimize",
  "面板可最小化成小图标（色点+实时分数），拖到不碍事处长期挂着，点开看会话平均流畅度。关 = 只有展开态 + ✕。":
    "The panel can minimize to a small icon (color dot + live score), parked out of the way; open it later for the session average. Off = expanded state + ✕ only.",
  "面板「问 AI」按钮": "Panel \"Ask AI\" button",
  "AI 调试": "AI debugging",
  "面板标题栏显示 AI 图标（✨ sparkles，与 aiti-helper 同图形）：把现场报告（流畅度分/长任务/LoAF 脚本归因/卡顿快照）交给 aiti-helper 建「调试页面卡顿」AI 会话（外部版则创建会话后跳转 pi-web）。默认开。":
    "Shows an AI icon in the panel title bar (✨ sparkles, same glyph as aiti-helper): hands the live report (smoothness score/long tasks/LoAF script attribution/jank snapshots) to aiti-helper to start a \"debug page jank\" AI session (the external edition creates the session and jumps to pi-web). On by default.",
  "跨实例注入": "Cross-instance injection",
  "站点评估": "Site evaluation",
  "把「服务地址」目标实例的 CPU 检测器注入当前页面（评估当前页面，参照 aiti-debug-inject）。默认关闭。":
    "Injects the CPU meter of the \"service URL\" target instance into the current page (evaluates the current page; see aiti-debug-inject). Off by default.",
  "服务地址": "Service URL",
  "目标 pi-web 基址（含子路径，如 https://host:port/dev）。配好后打开「跨实例注入」。":
    "Target pi-web base URL (including subpath, e.g. https://host:port/dev). Then open \"cross-instance injection\".",
  "主线程一卡，读秒就停；流畅度一分，忙闲立见——挂在工作页角落，收工点开看平均。":
    "When the main thread stalls, the stopwatch freezes; one smoothness score shows busy vs idle — pin it in a corner and check the average after work.",

  // aiti-ctx-meter
  "上下文比例条（context %）": "Context usage bar (context %)",
  "上下文还剩多少，看一眼电池就知道。": "How much context is left — check the battery-style bar at a glance.",

  // aiti-custom-agent
  "自定义 Agent": "Custom Agent",
  "一行命令，一个后端；docker 里跑 agent，从此不再手写配置。":
    "One command, one backend; run agents in docker and stop hand-writing configs.",

  // aiti-debug-inject
  "AITI 远程调试注入（可配置目标 pi-web）": "AITI remote debug injection (configurable target pi-web)",
  "远程调试注入": "Remote debug injection",
  "目标 pi-web 基址（含子路径，如 https://host:port/dev）。配好后打开下面的「启用注入」。":
    "Target pi-web base URL (including subpath, e.g. https://host:port/dev). Then enable \"injection\" below.",
  "启用注入": "Enable injection",
  "打开后把「服务地址」指向的目标 pi-web 的 aiti-devtools launcher 注入本实例页面（默认关闭）。":
    "When on, injects the aiti-devtools launcher of the target pi-web that \"service URL\" points at into this instance's page (off by default).",
  "调试器该穿在哪件衣服里，由你说了算。": "You decide which window the debugger wears.",

  // aiti-devtools
  "aiti devtools（页面内 AI 调试助手）": "aiti devtools (in-page AI debugging assistant)",
  "pairFed · 跨桥联邦": "pairFed · cross-bridge federation",
  "pair 设备互连": "pair device interconnect",
  "开启后本实例 pair 面板/agent 工具可见并发消息/文件给权威桥（默认 127.0.0.1:8777）的设备（fed: 前缀）；权威桥用户经「pi-web 桥」设备向本实例广播":
    "When on, this instance's pair panel/agent tools can see and message/file-send devices of the authoritative bridge (default 127.0.0.1:8777) (fed: prefix); authoritative-bridge users broadcast to this instance via the \"pi-web bridge\" device",
  "pairFed · 权威桥 pair base": "pairFed · authoritative bridge pair base",
  "默认 http://127.0.0.1:8777/aiti": "default http://127.0.0.1:8777/aiti",
  "pairFed · 权威桥文件目录": "pairFed · authoritative bridge file directory",
  "同机直读 fed 文件用；默认 ~/.pi/aiti-bridge/aiti-bridge/pair-files（跨机部署 fed 文件下载不可用）":
    "For direct local reads of fed files; default ~/.pi/aiti-bridge/aiti-bridge/pair-files (fed file downloads unavailable across machines)",
  "page_exec · 页面执行": "page_exec · page execution",
  "页面调试": "Page debugging",
  "在已连接页面执行类 CDP 命令（DOM/CSS/Input/Page/Runtime/Storage/Performance/Browser 域）":
    "Runs CDP-like commands on the connected page (DOM/CSS/Input/Page/Runtime/Storage/Performance/Browser domains)",
  "page_snapshot · 页面现场": "page_snapshot · page state",
  "拉取已连接页面基础现场（URL/选区/模拟条件）":
    "Pulls the connected page's basic state (URL/selection/emulation)",
  "self_ui · 窗口弹窗清单": "self_ui · dialog inventory",
  "扫描目标页面（缺省 AI 主窗口 xxx/ai）打开的弹窗/表单/按钮——ai-helper 回填定位":
    "Scans the target page (default AI main window xxx/ai) for open dialogs/forms/buttons — ai-helper locates and fills them",
  "form_fill · 弹窗表单回填": "form_fill · dialog form fill",
  "把字段值回填到目标页面（缺省 AI 主窗口 xxx/ai）的弹窗表单（React 兼容）+ 可选点按钮——AI 结果直接操作扩展弹窗":
    "Fills field values into the target page's dialog form (default AI main window xxx/ai; React-compatible) + optional button click — AI results operate extension dialogs directly",
  "bridge_status · 桥状态": "bridge_status · bridge status",
  "查询已连接页面与挂起请求（按标题/URL 匹配 pageId；sessions 含 device——浏览器·屏幕·在线·语言，快速识别设备）":
    "Queries connected pages and pending requests (pageId matched by title/URL; sessions include device — browser·screen·online·language for quick identification)",
  "page_logs · 页面日志": "page_logs · page logs",
  "查询目标页面已采集的 console 日志（含连桥前缓冲重放）":
    "Queries console logs collected from the target page (incl. replay of the pre-bridge buffer)",
  "page_network · 页面网络": "page_network · page network",
  "查询目标页面已采集的 ajax/fetch 请求完成态（status/耗时/错误）":
    "Queries completed ajax/fetch requests collected on the target page (status/duration/errors)",
  "user_pick_element · 点选元素": "user_pick_element · pick element",
  "用户交互": "Human interaction",
  "请当前页面的人类用户点选一个页面元素（Inspector 点选模式）":
    "Asks the human at the page to pick an element (Inspector pick mode)",
  "user_confirm · 确认": "user_confirm · confirm",
  "向人类用户提一个是/否问题（可附补充说明）": "Asks the human a yes/no question (with optional notes)",
  "user_choose · 多选一": "user_choose · choose",
  "给人类用户一组选项让其选择（单选/多选/自定义）":
    "Gives the human a set of options to choose from (single/multi/custom)",
  "user_input · 输入": "user_input · input",
  "请人类用户输入一段文本": "Asks the human to type a piece of text",
  "user_presence · 在场探测": "user_presence · presence check",
  "探测人类用户是否在场/在线（长任务前确认）": "Checks whether the human is present/online (confirm before long tasks)",
  "user_notify · 通知": "user_notify · notify",
  "非阻塞浏览器通知（不等待回答）": "Non-blocking browser notification (doesn't wait for an answer)",
  "aiti_hello · 注册": "aiti_hello · register",
  "agent 会话": "Agent sessions",
  "agent 自我介绍/注册/绑定目标页（建议会话开始时调用）":
    "Agent introduces itself/registers/binds a target page (call at session start)",
  "aiti_inbox · 消息主通道": "aiti_inbox · message mainline",
  "拉取发给本 agent 会话的消息（含异步作答/页面事件订阅）":
    "Pulls messages addressed to this agent session (incl. async replies/page event subscriptions)",
  "file_stat · 文件校验": "file_stat · file check",
  "查询文件存在性/类型/大小/修改时间（绝对路径）":
    "Queries a file's existence/type/size/mtime (absolute path)",
  "AI 不该对着屏幕瞎猜，它该真正看见页面。": "AI shouldn't guess at the screen — it should truly see the page.",

  // aiti-doc-center
  "文档中心": "Doc Center",
  "扫描根目录": "Scan roots",
  "文档收集": "Doc collection",
  "逗号/换行分隔（支持 ~）。要精确控制 tag 层级和实时监听就把根定到具体仓库":
    "Comma/newline separated (~ supported). Pin roots to specific repos for exact tag hierarchy and live watching",
  "排除目录": "Excluded folders",
  "逗号分隔的目录名或通配（*.tmp）；另自动遵循 .gitignore/.aitiignore/.dockerignore":
    "Comma-separated folder names or globs (*.tmp); also honors .gitignore/.aitiignore/.dockerignore automatically",
  "单文件上限 KB": "Per-file cap KB",
  "超过则只索元数据不索正文": "Above the cap only metadata is indexed, not the body",
  "实时监听": "Live watching",
  "fs.watch 事件驱动近实时重索引；目录数超 5 万自动降级":
    "fs.watch event-driven near-realtime reindex; auto-downgrades past 50k folders",
  "方案 tag 词": "Plan tag word",
  "标签": "Tags",
  "方案状态 tag 的命名空间词（方案/评审中、方案/已实施…）":
    "Namespace word for plan-status tags (plan/in review, plan/implemented…)",
  "方案": "plan",
  "AI 工具（M4）": "AI tools (M4)",

  // aiti-draft-keeper
  "崩溃可以带走页面，带不走你打到一半的话。": "A crash can take the page, but not the words you were typing.",

  // aiti-echo-agent
  "Echo Agent (会话后端演示)": "Echo Agent (session backend demo)",
  "先让一声回声上线，再让千军万马接入。": "Get one echo online first, then let the armies plug in.",

  // aiti-editor
  "文本文件编辑": "Text file editing",
  "接管文本类文件为 Monaco 在线编辑器（未命中时回退核心只读查看器）":
    "Takes over text files with the Monaco editor (falls back to the core read-only viewer when unmatched)",
  "soffice 路径（LibreOffice）": "soffice path (LibreOffice)",
  "留空=自动从 PATH 查找；或填绝对路径如 /usr/bin/soffice":
    "empty = auto-find on PATH; or an absolute path like /usr/bin/soffice",
  "老格式转换（.doc→.docx/.pdf、.xls→.xlsx、.ppt→.pptx）所用 soffice 可执行文件路径":
    "soffice executable used for legacy conversions (.doc→.docx/.pdf, .xls→.xlsx, .ppt→.pptx)",
  "转换": "Conversion",
  "二进制文件查看": "Binary file viewing",
  "使用注册的 provider 渲染图片/视频/音频/PDF 等二进制文件（关闭后回退核心查看器）":
    "Renders images/video/audio/PDF etc. via registered providers (falls back to the core viewer when off)",
  "Markdown 预览智能点击": "Markdown preview smart clicks",
  "预览里点击段落/标题/代码行弹出动作卡（复制/引用/新会话/文件/链接），引用自动带 @文件#行号；需安装并启用 aiti-msg-smart":
    "Clicking a paragraph/heading/code line in the preview opens an action card (copy/quote/new session/file/link); quotes carry @file#line automatically; needs aiti-msg-smart installed and enabled",
  "看到不对的代码，当场就能改——不用切出去开 IDE。": "Fix wrong code on the spot — no need to switch out to an IDE.",

  // aiti-event-bus
  "页面事件总线": "Page event bus",
  "一条总线，全部帧。": "One bus, every frame.",

  // aiti-extman
  "aiti 扩展管理器": "aiti extension manager",
  "管扩展的，也该是个扩展。": "The extension manager should itself be an extension.",

  // aiti-feedback
  "报告问题": "Report an issue",

  // aiti-float
  "弹窗浮动增强": "Dialog float enhancements",
  "面板只管标一个属性，浮起来的一切交给它。": "Panels only mark one attribute; everything about floating is its job.",

  // aiti-folder
  "目录树不是导航的终点，是操作的起点。": "The folder tree isn't the end of navigation; it's where actions start.",
  "打开终端": "Open terminal",
  "aiti-folder：当前项目打开右栏工作区终端 tab": "aiti-folder: open the right-panel workspace terminal tab for the current project",

  // aiti-git-ops
  "Git Ops（共享 Git 操作引擎）": "Git Ops (shared git operations engine)",
  "一处写仓，处处安全。": "Write repo logic once; stay safe everywhere.",

  // aiti-git-review
  "Git 代码审核": "Git code review",
  "作为人类，这是我对抗ai的最后倔犟了": "As a human, this is my last stand against AI",

  // aiti-git-trace
  "AI 变更追踪": "AI change tracking",
  "追踪总开关": "Tracking master switch",
  "开启后 AI 会话文件变更写入 .aiti-trace 追踪仓（默认关）":
    "When on, AI session file changes are written into the .aiti-trace tracking repo (off by default)",
  "追加排除": "Extra excludes",
  "gitignore 语法，一行一条": "gitignore syntax, one per line",
  "在内置排除清单之上追加排除（叠加项目 .gitignore）":
    "Adds excludes on top of the built-in list (stacks with the project .gitignore)",
  "否定豁免": "Negation exemptions",
  "用 ! 模式救回被内置排除误伤的路径（父目录整目录排除时受 gitignore 否定规则限制）":
    "Uses ! patterns to rescue paths wrongly caught by the built-in excludes (subject to gitignore negation limits when a parent folder is fully excluded)",
  "内置排除清单": "Built-in exclude list",
  "关掉后仅剩项目 gitignore + 用户追加排除": "Turn off to keep only the project gitignore + user extras",
  "超过该大小的文件不入追踪仓，台账记 skipped": "Files above this size are skipped by the tracking repo (ledger records skipped)",
  "追踪范围": "Tracking scope",
  "repo=work-tree 为仓根（含同仓越界）；cwd=巨型仓下缩小到会话目录":
    "repo = work-tree is the repo root (includes in-repo boundary crossings); cwd = narrow to the session dir for huge repos",
  "无 git 自动建仓": "Auto-init repo without git",
  "无 git 目录在文件数预算内自动创建 .aiti-trace 简易追踪（§13.4；系统目录除外）":
    "Without a git dir, auto-creates a lightweight .aiti-trace tracker when within the file budget (§13.4; system dirs excluded)",
  "自动建仓文件数预算": "Auto-init file budget",
  "超过该文件数的不自动建仓（防生成物目录误建）":
    "Above this file count no auto-init (prevents accidental init in generated-output dirs)",
  "简易追踪补常见 gitignore": "Lightweight tracker adds common gitignore",
  "loose 建仓时顺带补 node_modules/ 等常见条目（默认只写 .aiti-trace/ 一行）":
    "On loose init also adds node_modules/ and other common entries (default writes only the .aiti-trace/ line)",
  "关注路径独立入口": "Watch paths standalone entry",
  "在工具条单独显示「⎇ 关注路径」按钮（默认关——入口在时间线面板顶部；切换后刷新页面生效）":
    "Shows a separate \"⎇ watch paths\" button in the toolbar (off by default — the entry is at the top of the timeline panel; reload after switching)",
  "时间线独立入口": "Timeline standalone entry",
  "在工具条单独显示「⎇ 时间线」按钮（默认开——主入口在输入框下方控制行，与压缩/导入同排；关闭后刷新页面生效）":
    "Shows a separate \"⎇ timeline\" button in the toolbar (on by default — main entry is the control row under the composer, next to compact/import; reload after turning off)",

  // aiti-helper
  "AI Helper（扩展的一句话 AI 能力）": "AI Helper (one-line AI abilities for extensions)",
  "AI 的工具该由 AI 自己接线、自己进化——人类的角色是掌舵，不是搬砖。":
    "AI's tools should be wired and evolved by AI itself — humans steer, not haul bricks.",

  // aiti-mail
  "邮件发送": "Mail sender",

  // aiti-model-check
  "模型可用性管理（探测 / 429 限流识别）": "Model availability manager (probing / 429 rate-limit detection)",
  "顶部工具条显示「模型」按钮": "Show the \"Models\" button in the top toolbar",
  "默认隐藏：模型检查从模型向导顶部「检查」入口进入；打开后在顶部工具条单独显示按钮":
    "Hidden by default: model check opens from the \"Check\" entry at the top of the model wizard; when on, a standalone button shows in the top toolbar",
  "model_status · 可用性总览": "model_status · availability overview",
  "模型工具": "Model tools",
  "模型可用性总览：各 model 是否可用 / 429 限流 / 异常 / 预计恢复时间（多 key 显示每 key 状态）":
    "Availability overview: per model available / 429 rate-limited / error / ETA to recover (multi-key shows per-key state)",
  "model_keys · 多 key 检查": "model_keys · multi-key check",
  "查看各 provider 配置的多个 API key（打码）与分 key 检查状态（可用/429/异常）":
    "Shows each provider's configured API keys (masked) with per-key check state (available/429/error)",
  "model_availability · 有无可用模型": "model_availability · any model available",
  "看是否无可用模型（无模型 / 全部限流或异常）+ 最近被阻断的执行记录":
    "Whether there is no usable model (none configured / all rate-limited or erroring) + recent blocked runs",
  "model_probe · 立即探测": "model_probe · probe now",
  "立即对模型发极小探针消息测当前可用性（200/429/其它）":
    "Sends a tiny probe message right now to test availability (200/429/other)",
  "model_report_blocked · 报告阻断": "model_report_blocked · report blocked",
  "报告一次被限流阻断的执行（大量 429 导致任务中断）→ 标记模型不可用（大量出错且阻断执行才标记）":
    "Reports a rate-limit-blocked run (mass 429s interrupting a task) → marks the model unavailable (only marked when many errors actually block execution)",
  "model_history · 探测历史": "model_history · probe history",
  "查看模型的探测历史（可用性 / 延迟 / 429 恢复时间预测）":
    "Shows a model's probe history (availability / latency / 429 recovery ETA)",
  "model_balance · 余额/用量": "model_balance · balance/usage",
  "查询各 AI provider 账户余额/套餐用量（支持公开余额 API 的）":
    "Queries AI provider account balance/plan usage (for providers with a public balance API)",
  "model_config · 配置": "model_config · config",
  "查看/修改 aiti-model-check 配置（修改需确认）": "Views/edits aiti-model-check config (edits need confirmation)",
  "限流到期提醒": "Rate-limit expiry reminders",
  "通知": "Notifications",
  "长期限流（已持续 ≥ 阈值）的模型在记录的预计恢复时间到点时提醒（纯时间检查，不发探测）——浏览器通知 + 面板「待验证」高亮":
    "When a long rate-limited model (≥ threshold) reaches its recorded recovery ETA, remind (pure time check, no probes) — browser notification + panel \"to verify\" highlight",
  "长期限流阈值（小时）": "Long rate-limit threshold (hours)",
  "默认 72 = 3 天": "default 72 = 3 days",
  "已持续限流超过该时长才值得到期提醒；留空 = 72 小时（3 天）":
    "Only rate limits lasting longer than this deserve an expiry reminder; empty = 72 hours (3 days)",
  "默认通知所有模型": "Notify for all models by default",
  "未逐模型/逐 provider 设置时，限流到期是否提醒（面板行尾铃铛可单独关闭）":
    "When no per-model/per-provider setting exists, whether to remind on expiry (the panel row's bell can opt out individually)",
  "AI 工具（模型检查）": "AI tools (model check)",
  "模型在不在家，敲门问问它。": "Is the model home? Knock and ask.",

  // aiti-model-recent
  "最近使用模型": "Recently used models",
  "模型面板顶部「最近使用」分组；关闭后面板不显示该段（数据保留）":
    "the \"Recently used\" group at the top of the model panel; when off the panel hides the section (data kept)",
  "常用的模型，应当在指尖。": "Frequently used models belong at your fingertips.",

  // aiti-model-wizard
  "模型添加向导（目录搜索 / 反向匹配 / 自动探测）":
    "Model setup wizard (catalog search / reverse matching / auto-detection)",
  "model_wizard_status · 现状": "model_wizard_status · current state",
  "模型添加向导": "Model setup wizard",
  "模型添加向导：当前已配置 providers（token 打码）+ models.json 路径":
    "Model setup wizard: configured providers (tokens masked) + models.json path",
  "model_wizard_search · 搜索目录": "model_wizard_search · search catalog",
  "在目录里搜索 AI 提供商（中文/英文/别名/模型 id）":
    "Searches the catalog for AI providers (Chinese/English/aliases/model ids)",
  "model_wizard_provider · 提供商详情": "model_wizard_provider · provider details",
  "查看某个提供商详情（api 地址/注册说明/领 token/已知模型）":
    "Shows a provider's details (API URL/signup notes/getting a token/known models)",
  "model_wizard_detect · 端点探测": "model_wizard_detect · endpoint detection",
  "给 baseUrl 自动探测 api 接口类型和真实地址（漏 /v1 /v2 自动补）":
    "Auto-detects the API style and real URL for a baseUrl (missing /v1 /v2 auto-added)",
  "model_wizard_test · 测试连接": "model_wizard_test · test connection",
  "测试连接：2xx/429 通过，401/403 无效；有 model 发探针，无 model 拉 /models 验证":
    "Tests the connection: 2xx/429 pass, 401/403 invalid; with a model sends a probe, without it pulls /models to verify",
  "model_wizard_save · 写 models.json": "model_wizard_save · write models.json",
  "把 provider + 模型列表写入 models.json（合并去重，token 打码；可选多 key）":
    "Writes provider + model list into models.json (merged & deduped, tokens masked; optional multi-key)",
  "model_wizard_combo_save · 建/改聚合组": "model_wizard_combo_save · create/edit aggregate group",
  "创建或更新模型聚合组（组合模型）：多个真实模型组成虚拟模型，粘性+权重路由":
    "Creates or updates a model aggregate (combo model): several real models behind one virtual model with sticky+weighted routing",
  "model_wizard_keys · 多 key 管理": "model_wizard_keys · multi-key management",
  "管理某 provider 的多个 API key（list/set/remove，含 rpm 限速）":
    "Manages a provider's multiple API keys (list/set/remove, with rpm limits)",
  "model_wizard_delete · 删 provider": "model_wizard_delete · remove provider",
  "从 models.json 删除一个 provider（其 apiKeys 一并删除）":
    "Deletes a provider from models.json (its apiKeys are removed too)",
  "AI 工具（模型向导）": "AI tools (model wizard)",
  "地址、token、注册页——散落四方的钥匙，串成一串。": "URLs, tokens, signup pages — keys scattered everywhere, strung onto one ring.",

  // aiti-models-import
  "模型配置导入（从其他 agent）": "Model config import (from other agents)",

  // aiti-msg-anchor
  "消息锚点横幅": "Message anchor banner",
  "显示消息锚点横幅": "Show the message anchor banner",
  "消息区顶部常驻横幅，展示当前视口所属的用户输入":
    "A persistent banner at the top of the message area showing the user input the current viewport belongs to",
  "显示模式": "Display mode",
  "内容": "Content",
  "current=当前视口所属的用户输入（滚动跟随）；first=会话第一条输入；latest=最近一条输入；title=会话标题":
    "current = the user input the viewport belongs to (follows scrolling); first = the session's first input; latest = the most recent input; title = session title",
  "显示会话标题行": "Show session title line",
  "横幅第一行显示当前会话标题（name，无则显示会话第一条输入）":
    "First banner line shows the current session title (name; falls back to the session's first input)",
  "显示当前输入行": "Show current input line",
  "横幅第二行显示当前视口所属的用户输入（display.mode 决定的输入）":
    "Second banner line shows the user input the viewport belongs to (as chosen by display.mode)",
  "横幅透明度": "Banner opacity",
  "样式": "Style",
  "横幅不透明度（0-100 数字：0=全透明，100=不透明；默认 85，能看到但不干扰）":
    "Banner opacity (0-100: 0 = transparent, 100 = opaque; default 85 — visible but not intrusive)",
  "文本截断长度": "Text truncation length",
  "横幅里用户输入/标题最多显示的字符数（超出省略号；0 或非法值回退 140）":
    "Max characters of user input/title shown in the banner (ellipsis beyond; 0 or invalid falls back to 140)",
  "回错了人的话，比叫错名字还尴尬。": "Quoting the wrong person's words is worse than getting a name wrong.",

  // aiti-msg-nav
  "消息滚动导航": "Message scroll navigation",
  "显示消息滚动导航条": "Show the message scroll nav bar",
  "消息区右侧的到最早/到最新/上一条/下一条按钮列":
    "The earliest/latest/previous/next button column on the message area's right edge",
  "长按『到最新』保持屏幕常亮": "Long-press \"latest\" keeps the screen awake",
  "agent 运行时长按最底部按钮可让屏幕保持常亮（Screen Wake Lock API，不支持时自动降级）":
    "While the agent runs, long-pressing the bottom button keeps the screen awake (Screen Wake Lock API; auto-degrades when unsupported)",
  "千楼万楼的聊天记录，电梯比楼梯好用。": "For skyscraper-tall chat logs, the elevator beats the stairs.",

  // aiti-msg-share
  "消息分享": "Message sharing",
  "分享出去，是为了让对话继续。": "Sharing exists so the conversation can continue.",

  // aiti-msg-smart
  "消息智能（段落点击识别）": "Message intelligence (paragraph click recognition)",
  "问题识别（引用回复）": "Question recognition (quote reply)",
  "识别封闭问句/选择问 → 选项按钮 + 引用回复": "Recognizes closed/choice questions → option buttons + quote reply",
  "划选识别（引用片段）": "Selection recognition (quote snippet)",
  "消息区划选文字 → 弹层：复制 / 引用回复（当前会话）/ 新会话引用（投递到新建会话 composer）":
    "Selecting text in the message area → popup: copy / quote reply (current session) / new-session quote (delivered to a new composer)",
  "文件/目录识别": "File/folder recognition",
  "提取段落内文件/目录路径 → 打开/定位按钮（存在性校验）":
    "Extracts file/folder paths from paragraphs → open/locate buttons (existence-checked)",
  "跨仓文件分辨": "Cross-repo file disambiguation",
  "主 cwd 未命中时，配合 aiti-git-trace 的会话识别仓/关注路径分辩 cwd 外文件（如写入 ~/workspace/pi-web 却只说 docs/x.md）":
    "When the main cwd misses, uses aiti-git-trace's session repos/watch paths to resolve files outside cwd (e.g. writing ~/workspace/pi-web while only mentioning docs/x.md)",
  "链接识别": "Link recognition",
  "识别段落内 http/https 链接 → 新窗口打开按钮": "Recognizes http/https links in paragraphs → open-in-new-window button",
  "复制全文": "Copy full text",
  "任意段落提供复制全文动作": "Every paragraph offers a copy-full-text action",
  "AI 说得再好，抄起来也挺费劲。": "No matter how well AI says it, copying it is a chore.",

  // aiti-omp-agent
  "Oh My Pi (omp 子进程后端)": "Oh My Pi (omp subprocess backend)",
  "omp 的独立世界：ready 握手 / get_state 能力面 / host tools / login / branch。":
    "omp's own world: ready handshake / get_state capability surface / host tools / login / branch.",

  // aiti-onlyoffice
  "启用 OnlyOffice": "Enable OnlyOffice",
  "开启后探测 DocumentServer，健康时注册 word/sheet/slide 三 provider（Docker：scripts/onlyoffice-up.sh）":
    "When on, probes DocumentServer and registers the word/sheet/slide providers when healthy (Docker: scripts/onlyoffice-up.sh)",
  "DocumentServer 地址": "DocumentServer URL",
  "本机服务端/容器访问的 DS 地址（healthcheck 与文档下载基准）":
    "DS URL as seen by the local server/container (basis for healthcheck and doc downloads)",
  "浏览器侧 DS 地址": "Browser-side DS URL",
  "浏览器加载 api.js 用的 DS 地址；留空跟随「DocumentServer 地址」。nginx /onlyoffice/ 反代场景填 https://…/onlyoffice":
    "DS URL the browser uses to load api.js; empty follows \"DocumentServer URL\". For nginx /onlyoffice/ reverse proxies set https://…/onlyoffice",
  "回调地址": "Callback URL",
  "DS 容器回访（download/callback）的基址。默认=网页地址（浏览器访问的 协议+域名+端口，容器与网页同源可达）；仅当容器无法访问网页地址（如 DS 部署在别的机器）时设置覆盖，如 https://pi.example.com:8443":
    "Base URL the DS container calls back (download/callback). Default = the web URL (scheme+host+port the browser uses; the container reaches it same-origin); set an override only when the container can't reach the web URL (e.g. DS deployed elsewhere), like https://pi.example.com:8443",

  // aiti-pair
  "设备互连（临时聊天 / 互传文件）": "Device pairing (quick chat / file exchange)",

  // aiti-pi-agent
  "Pi Spawn (子进程后端)": "Pi Spawn (subprocess backend)",
  "All Sessions 里最正统的一条路——pi 自己驱动自己。": "The most orthodox path in All Sessions — pi drives itself.",

  // aiti-plan-first
  "方案先行": "Plan first",
  "工具条按钮": "Toolbar button",
  "工具条显示「方案先行」按钮（切换后刷新页面生效）":
    "Shows the \"Plan first\" button in the toolbar (reload after switching)",
  "md 变更绑定向导": "md change binding wizard",
  "未绑定方案时，本轮变更出现 md 文件 → 弹下拉询问是否为 session 方案":
    "When no plan is bound and .md files appear in a turn → dropdown asking whether this is the session plan",
  "大改未跟提醒": "Big-change-not-followed reminder",
  "已绑定方案后，单轮改动量超阈值且方案未更新 → 弹下拉提醒":
    "With a plan bound, when a turn's change volume exceeds thresholds and the plan wasn't updated → dropdown reminder",
  "文件数阈值": "File count threshold",
  "单轮变更文件数达到该值视为「改动很多」": "A turn touching this many files counts as \"a lot of changes\"",
  "操作数阈值": "Operation count threshold",
  "单轮操作（op）数达到该值视为「改动很多」": "A turn with this many ops counts as \"a lot of changes\"",
  "领先提醒": "Ahead-of-plan reminder",
  "未绑定方案时，一旦开始改非 md 文件即弹「先做方案」（30 分钟冷却）":
    "Without a bound plan, the moment non-md files change → \"make a plan first\" pops (30-minute cooldown)",
  "追加 md 忽略": "Extra md ignores",
  "glob，一行一条": "globs, one per line",
  "在内置忽略（README*/CHANGELOG*/LICENSE*/node_modules 等）之上追加":
    "Adds to the built-in ignores (README*/CHANGELOG*/LICENSE*/node_modules etc.)",
  "绑定向导自动收起(秒)": "Binding wizard auto-collapse (s)",
  "md 变更绑定向导（疑似方案）多久自动收起；0=常驻，用户操作后才收起":
    "How long the md binding wizard (suspected plan) stays before auto-collapsing; 0 = stays until the user acts",
  "失联提醒自动收起(秒)": "Not-followed reminder auto-collapse (s)",
  "大改未跟提醒多久自动收起；0=常驻": "How long the big-change reminder stays; 0 = stays",
  "领先提醒自动收起(秒)": "Ahead reminder auto-collapse (s)",
  "领先提醒多久自动收起；0=常驻": "How long the ahead-of-plan reminder stays; 0 = stays",
  "方案先行提醒扩展——结合 aiti-git-trace 事件感知：md 变更绑定向导 + 大改未跟方案提醒 + 一键插入「更新方案文档：@file」":
    "Plan-first reminder extension — aiti-git-trace event awareness: md change binding wizard + big-change-not-followed reminder + one-click insert \"update the plan doc: @file\"",

  // aiti-plan-review
  "Plan-Sandbox 采认（声明 vs 其他，点选回收）": "Plan-Sandbox adoption (declared vs other, click to collect)",
  "进入 Plan-Sandbox 模式": "Enter Plan-Sandbox mode",
  "Plan 工具": "Plan tools",
  "沙箱内执行命令": "Run commands in the sandbox",
  "声明交付物（采认）": "Declare deliverables (adopt)",
  "中止计划（失败出口）": "Abort plan (failure exit)",
  "read（沙箱化：激活后读快照）": "read (sandboxed: reads the snapshot while active)",
  "沙箱化系统工具": "Sandboxed system tools",
  "write（沙箱化：激活后写快照）": "write (sandboxed: writes the snapshot while active)",
  "edit（沙箱化：激活后改快照）": "edit (sandboxed: edits the snapshot while active)",
  "bash（沙箱化：激活后在沙箱执行）": "bash (sandboxed: runs in the sandbox while active)",
  "ls（沙箱化：激活后列快照）": "ls (sandboxed: lists the snapshot while active)",
  "find（沙箱化：激活后搜快照）": "find (sandboxed: searches the snapshot while active)",
  "grep（沙箱化：激活后搜快照）": "grep (sandboxed: greps the snapshot while active)",
  "工具栏·沙箱历史入口": "Toolbar · sandbox history entry",
  "Plan-Sandbox 采认收尾 UI —— 读 review.json 契约（声明 vs 其他），点选采认/回滚/销毁":
    "Plan-Sandbox adoption wrap-up UI — reads the review.json contract (declared vs other); click to adopt/roll back/destroy",

  // aiti-prompts
  "aiti prompt 片段收藏库": "aiti prompt snippet library",
  "我的输入是我宝贵的财富——好话不说二遍。": "My prompts are precious assets — good lines are never typed twice.",

  // aiti-provider-usage
  "剩余额度面板": "Remaining balance panel",
  "会话信息面板余额区块（15+ 家 provider）；关闭后信息面板不显示余额区（上游同形）":
    "the balance block in the session info panel (15+ providers); when off the info panel hides the balance area (upstream shape)",
  "各家还剩多少额度，一面看尽。": "Every provider's remaining balance, one panel.",
  "剩余额度": "Remaining balance",

  // aiti-queue-keeper
  "队列面板增强": "Queue panel enhancements",
  "完整队列面板（横幅/行操作/拖拽/回收站/撤销条/导入导出）；关闭后回落 core 兜底 banner":
    "full queue panel (banner/row actions/drag/recycle bin/undo bar/import-export); when off falls back to the core banner",
  "排队不可怕，可怕的是排完队忘了自己要说什么。": "Queuing isn't scary; forgetting what you wanted to say is.",
  "队列面板": "Queue panel",

  // aiti-quickstart
  "快速上手": "Quick start",
  "空白不可怕，第一句从这里开始。": "A blank page isn't scary — the first sentence starts here.",
  "获取工作区…": "Get a workspace…",
  "获取工作区：Git 克隆 / 上传 / 本地目录 / 新建": "Get a workspace: git clone / upload / local folder / create new",

  // aiti-recovery
  "恢复对话框与向导": "Recovery dialog & wizard",
  "队列恢复对话框 + 重启恢复向导；关闭后恢复项不弹窗（数据在 sidecar 不丢，可用急救路径处理）":
    "queue recovery dialog + restart recovery wizard; when off recovery items don't pop (data stays in the sidecar; the first-aid path still works)",
  "中断不可怕，可怕的是找不到回去的路。": "Interruption isn't scary; losing the way back is.",
  "恢复对话框": "Recovery dialog",

  // aiti-session-cards
  "会话请求卡（审批/问答/授权）": "Session request cards (approval/Q&A/permissions)",
  "完整请求卡 UI": "Full request card UI",
  "方案审批/问答选项/授权选项完整交互；关闭后落宿主极简兜底卡（仍可接受/拒绝）":
    "full interactions for plan approval/Q&A options/permission options; when off falls back to the host's minimal card (still accept/decline)",
  "agent 求你作答的卡片，长什么样由扩展说了算。": "The cards agents beg you to answer — extensions decide what they look like.",

  // aiti-sheet-univer
  "Excel 编辑保存": "Excel edit & save",
  "开启后 .xlsx/.xlsm 提供 edit 能力（保存走 save-blob）；关闭仅预览":
    "When on, .xlsx/.xlsm get edit capability (saving via save-blob); off = preview only",

  // aiti-subagents
  "子代理（ai 委托 · 多 agent 协作）": "Subagents (AI delegation · multi-agent collaboration)",
  "主 agent 负责思考，脏活累活分给专职的它。": "The main agent thinks; the dirty work goes to the specialist.",
  "子代理任务": "Subagent tasks",

  // aiti-sysmon
  "系统状态（服务器 CPU/内存/磁盘/网络/温度）": "System status (server CPU/memory/disk/network/temperature)",
  "轮询间隔（秒）": "Poll interval (s)",
  "采样": "Sampling",
  "面板展开时的快照轮询间隔秒数（默认 3；非法值回退默认）。面板折叠或页面隐藏时不采样，服务端零常驻开销。":
    "Snapshot poll interval in seconds while the panel is expanded (default 3; invalid falls back). No sampling while collapsed or the page is hidden — zero standing server cost.",
  "显示 CPU 温度": "Show CPU temperature",
  "显示 CPU 温度（Linux 需安装 lm-sensors；读不到时显示 N/A 并给出配置指引链接）。":
    "Shows CPU temperature (Linux needs lm-sensors; shows N/A with a setup-guide link when unreadable).",
  "顶栏会话信息显示 CPU/内存": "Top-bar session info shows CPU/memory",
  "在顶部会话信息尾部常驻显示服务器 CPU 负载与内存占用百分比（默认开；关闭即零渲染零采样，可在扩展管理里切换）。仅宽屏档显示，窄屏自动隐藏；采样间隔同「轮询间隔」。":
    "Always shows server CPU load and memory percentage at the end of the top session info (on by default; off = zero rendering, zero sampling; switchable in the extension manager). Wide layout only, auto-hidden on narrow screens; sampling interval follows \"poll interval\".",
  "服务器忙不忙，开左栏看一眼就知道。": "Is the server busy? One glance at the left panel tells you.",

  // aiti-testagent / aiti-testagent-native
  "TestAgent 连桥（Java 进程扫描 / Attach）": "TestAgent bridge (Java process scan / attach)",
  "testagent-native（Windows API/COM 追踪面板）": "testagent-native (Windows API/COM tracing panel)",

  // aiti-ui-env
  "UI 环境（桌面/无头虚拟屏）": "UI environment (desktop / headless virtual screen)",
  "虚拟屏带 x11vnc + node vnc-bridge/noVNC，可在浏览器查看/操作虚拟桌面":
    "The virtual screen ships x11vnc + node vnc-bridge/noVNC — view and operate the virtual desktop from the browser",
  "AT-SPI 语义总线": "AT-SPI semantic bus",
  "虚拟屏环境注入 GTK/Qt a11y 开关（语义树可见，供 cua.ai 等独立扩展）":
    "Injects GTK/Qt a11y switches into virtual-screen environments (semantic tree visible; for cua.ai and similar extensions)",
  "音频输出（Linux PipeWire/Pulse）": "Audio output (Linux PipeWire/Pulse)",
  "为虚拟屏/桌面启动的 GUI 应用注入 PULSE_SERVER + PIPEWIRE_RUNTIME_DIR（从 /run/user/<uid> 自动发现），让 SSH/agent 启动的 WebView、播放器能有声音；关闭则不改音频变量":
    "Injects PULSE_SERVER + PIPEWIRE_RUNTIME_DIR into GUI apps started on the virtual screen/desktop (auto-discovered from /run/user/<uid>) so WebViews and players started via SSH/agents have sound; off = audio vars untouched",
  "虚拟屏未运行时自动拉起": "Auto-start the virtual screen when not running",
  "resolve/run 时虚拟屏未启动→自动拉起 Xvfb+openbox（systemd 或裸进程）":
    "If the virtual screen isn't up at resolve/run time → auto-starts Xvfb+openbox (systemd or bare process)",
  "DISPLAY 随机避让": "DISPLAY random avoidance",
  "启动虚拟屏自动选空闲 DISPLAY 号（auto 随机，避免固定 :99 被占冲突）；关闭则固定用面板配置/默认号":
    "Picks a free DISPLAY number automatically at virtual-screen start (auto = random, avoids fixed :99 collisions); off = always the panel config/default number",
  "虚拟屏窗口管理器": "Virtual screen window manager",
  "虚拟屏 WM（均经裸 Xvfb 实测 EWMH 兼容）。若填了不支持/未安装/启动失败的值，下次启动会自动按白名单顺序找一个能用的（并在状态与日志说明）。改动在下次虚拟屏 start 时生效；systemd 服务路径需重装 service":
    "Virtual screen WM (all EWMH-verified on bare Xvfb). If the value is unsupported/not installed/fails to start, the next start picks the first working one in whitelist order (noted in status and logs). Changes apply at the next virtual screen start; the systemd path needs the service reinstalled",
  "固定 DISPLAY 号": "Fixed DISPLAY number",
  "留空 = auto 随机；如 154": "empty = auto random; e.g. 154",
  "非空数字 → 固定用该 DISPLAY 号（被外来占用才避让）；与「DISPLAY 随机避让」开关叠加：本值优先":
    "A non-empty number → always that DISPLAY (avoids only foreign occupation); stacks with the \"DISPLAY random avoidance\" toggle: this value wins",
  "ui_env_status · 环境状态": "ui_env_status · environment status",
  "报告当前模式、桌面/虚拟屏探测、VNC 链接、安装状态":
    "Reports current mode, desktop/virtual-screen detection, VNC links, install state",
  "ui_env_set_mode · 切换模式": "ui_env_set_mode · switch mode",
  "切换显示模式（1优先桌面/2优先无头/3总是桌面/4总是无头），对新启动的 MCP/应用生效":
    "Switches display mode (1 prefer desktop / 2 prefer headless / 3 always desktop / 4 always headless), applies to newly started MCP/apps",
  "ui_env_resolve · 生成启动环境": "ui_env_resolve · build launch env",
  "按当前模式裁决目标屏，返回环境变量 JSON + export 行（给应用/MCP 启动器）":
    "Resolves the target screen by current mode and returns the env-var JSON + export lines (for app/MCP launchers)",
  "ui_env_run · 代启动应用/MCP": "ui_env_run · launch apps/MCP on behalf",
  "用裁决后的环境启动命令（后台运行），返回 pid/目标屏/日志文件":
    "Starts a command in the background with the resolved environment; returns pid/target screen/log file",
  "ui_env_headless · 虚拟屏启停/查询": "ui_env_headless · virtual screen start/stop/query",
  "启动/停止/查询无头虚拟屏（Xvfb + 可配置 WM + dbus + AT-SPI；WM 经扩展管理器 behavior.wm 配置，默认 openbox）；start 幂等，stop 仅虚拟屏相关不碰真实桌面":
    "Start/stop/query the headless virtual screen (Xvfb + configurable WM + dbus + AT-SPI; WM configured via the extension manager's behavior.wm, default openbox); start is idempotent, stop touches only virtual-screen bits, never the real desktop",
  "ui_env_deps · 依赖自检/安装": "ui_env_deps · dependency check/install",
  "自检/自动安装虚拟屏依赖组件（多发行版自适应）；action=check 只自检，install 需免密 sudo":
    "Checks/auto-installs virtual-screen dependencies (multi-distro adaptive); action=check checks only, install needs passwordless sudo",
  "ui_env_vnc · VNC 查看/启停": "ui_env_vnc · VNC view/start-stop",
  "查询/启动/停止 VNC-on-web（浏览器看虚拟桌面的地址）":
    "Query/start/stop VNC-on-web (the browser URL for the virtual desktop)",
  "webRDP：通过 rdp-bridge 把 RDP 协议经 WebSocket 透传到浏览器（需 webRDP 静态资源 + 目标 RDP 服务器）":
    "webRDP: tunnels the RDP protocol to the browser over WebSocket via rdp-bridge (needs webRDP static assets + a target RDP server)",
  "ui_env_rdp · RDP 查看/启停": "ui_env_rdp · RDP view/start-stop",
  "探测系统 RDP（xrdp）、启动/停止 RDP-on-web 桥、获取访问 URL":
    "Detects system RDP (xrdp), starts/stops the RDP-on-web bridge, returns the access URL",
  "AI 工具（UI 环境）": "AI tools (UI environment)",
  "没有显示器，也可以有舞台。": "No monitor needed to have a stage.",

  // aiti-video-studio
  "写好脚本，一键出片。": "Write the script; one click makes the video.",

  // aiti-word-superdoc
  "Word 编辑保存": "Word edit & save",
  "开启后 .docx 提供 edit 能力（保存走 save-blob）；关闭仅预览":
    "When on, .docx gets edit capability (saving via save-blob); off = preview only",

  // aiti-zcode-agent
  "传输通道": "Transport",
  "app-server = 长驻 ZCode Protocol（桌面端同款：流式打字机/工具卡/原生 steer/热切模型，省每轮 ~5-6s 冷启动）；oneshot = 每轮单发进程（旧路径兜底）。留空默认 app-server。":
    "app-server = long-lived ZCode Protocol (same as the desktop client: streaming typewriter/tool cards/native steer/hot model switch, saves ~5-6s cold start per turn); oneshot = one process per turn (legacy fallback). Empty defaults to app-server.",
  "Runtime 路径": "Runtime path",
  "指定 ZCode runtime：zcode.cjs 文件、解压目录、或 ZCode-*.AppImage 本体。留空则自动探测（Windows 安装目录 / 挂载实例 / ~/.zcode）→ 自动下载。":
    "Points at the ZCode runtime: a zcode.cjs file, an extracted directory, or the ZCode-*.AppImage itself. Empty = auto-detect (Windows install dir / mounted instance / ~/.zcode) → auto-download.",
  "自动下载 AppImage": "Auto-download AppImage",
  "探测不到 runtime 时从官网自动下载（约 300MB，缓存在扩展数据目录；Windows 已装则直接用安装目录）。":
    "When no runtime is detected, downloads from the official site (~300MB, cached in the extension data dir; if Windows already has it installed, uses the install dir directly).",
  "每轮 spawn 的 --mode：build（工具调用询问）/ edit（自动允许文件编辑）/ plan（只读规划）/ yolo（跳过全部权限询问，最大权限）。默认 yolo（2026-09-06 应用户要求由 build 改）。":
    "--mode for each spawn: build (asks on tool calls) / edit (auto-allows file edits) / plan (read-only planning) / yolo (skips all permission asks, max permissions). Default yolo (changed from build per user request, 2026-09-06).",
  "默认模型 ref": "Default model ref",
  "新会话默认模型（provider/model，如 bigmodel/GLM-5.3）。留空自动跟随已认证的套餐通道（bigmodel/zai）。":
    "Default model for new sessions (provider/model, e.g. bigmodel/GLM-5.3). Empty follows the authenticated plan channel (bigmodel/zai).",
  "留空自动跟随套餐通道": "empty = follow the plan channel automatically",
  "API Key 手动覆盖": "Manual API key override",
  "手动提供编程套餐 API Key（跳过桌面端凭据 OAuth 链路）。一般留空。":
    "Manually provides the coding-plan API key (skips the desktop client OAuth chain). Usually leave empty.",
  "留空使用桌面端登录凭据": "empty = use the desktop client's login credentials",
  "Ultra 网关路由": "Ultra gateway routing",
  "app-server 走 zcode.z.ai 平台根动态路由（桌面端同款）。注意：宿主对未声明布尔 feature 默认 true——本项必须显式声明才可控。3.17.2 独立 spawn 下网关持续 server_error（2026-11-07 实测），默认直连 open.bigmodel.cn。":
    "app-server uses zcode.z.ai platform-root dynamic routing (same as the desktop client). Note: the host defaults undeclared boolean features to true — this one must be declared explicitly to be controllable. Under 3.17.2 standalone spawn the gateway kept returning server_error (tested 2026-11-07); the default is direct open.bigmodel.cn.",
  "GLM 套餐在哪儿跑，面板就在哪儿看。": "Wherever the GLM plan runs, the panel shows it.",

  // service-tunnels
  "本地服务不该被防火墙关起来——在哪都应该可以安全访问。":
    "Local services shouldn't be locked behind a firewall — they should be safely reachable from anywhere.",

  // session-manager
  "顶栏会话搜索框": "Top-bar session search",
  "顶栏（含 ⋯ 菜单）的会话搜索框；全部会话面板内已有搜索":
    "The session search box in the top bar (incl. the ⋯ menu); the All Sessions panel already has search",
  "收藏图标": "Favorite icon",
  "会话列表/看板/顶栏显示收藏（★）图标；关闭后收藏操作入口收敛到标签下拉的「收藏」项（标签下拉始终可用）":
    "Shows favorite (★) icons in the session list/board/top bar; when off, the favorite entry collapses into the tag dropdown's \"favorite\" item (tag dropdown always available)",
  "会话行时间线按钮": "Session-row timeline button",
  "侧栏会话行悬停操作里显示「⎇ 时间线」按钮（aiti-git-trace 打开该会话的变更时间线）；全部会话面板行「⋯」菜单的时间线入口不受此开关影响":
    "Shows a \"⎇ timeline\" button in the sidebar session row's hover actions (aiti-git-trace opens that session's change timeline); the timeline entry in the All Sessions panel row's ⋯ menu is unaffected",
  "左栏文件夹区块保留数": "Left-panel folder blocks kept",
  "切换项目时自动打开的文件夹区块数量上限（未钉住的先进先出；钉住的不占配额）。默认 3，可填 1-9，非法值回落 3。在 extman「功能管理」里改。":
    "Max folder blocks auto-opened when switching projects (unpinned evicted first-in-first-out; pinned don't count). Default 3, accepts 1-9, invalid falls back to 3. Change in extman's Feature management.",
  "会话检索工具（session_search / session_read）": "Session search tools (session_search / session_read)",
  "给新建的 pi 会话注入两个只读工具：全文检索本机全部 agent 的历史会话、按会话读原始消息（压缩找回/翻旧账）。关闭后仅新建会话不再获得工具（存量会话在 wrapper 重建前仍持有）。":
    "Injects two read-only tools into new pi sessions: full-text search across all local agents' session history and reading raw messages per session (recover after compaction). When off, only new sessions stop receiving the tools (existing sessions keep them until the wrapper rebuilds).",
  "会话不是用完即走的流水，是每天都在累积的资产。": "Sessions aren't disposable streams; they're assets that accrue daily.",
  "项目 / Projects": "Projects",
  "左侧会话列表接管（SidebarClone）": "Left session list takeover (SidebarClone)",
  "分支 / Worktree": "Branch / Worktree",
  "分支 / Worktree preparer": "Branch / Worktree preparer",
};

/** Codex / Cursor / Claude Code souls (shared spawn copy comes from AGENT_COPY). */
const SOULS = {
  "历史会话不是化石——点一下就活过来。": "Past sessions aren't fossils — one click brings them back to life.",
  "Codex 在哪儿跑，面板就在哪儿看。": "Wherever Codex runs, the panel shows it.",
  "把 Cursor 的 agent 也接进 pi-web 的会话宇宙。": "Bring Cursor's agent into pi-web's session universe too.",
};
Object.assign(extman, SOULS);

// Entries recorded under different tool prefixes / vendor names (kept apart
// from the sections above to keep diffs against the recording readable).
Object.assign(extman, {
  "AI 工具（IM 渠道）": "AI tools (IM channels)",
  "会话内注入 aiti-im-* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects aiti-im-* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "会话内注入 aiti_configs_* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects aiti_configs_* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "会话内注入 aiti_doc_* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects aiti_doc_* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "会话内注入 aiti_model_* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects aiti_model_* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "会话内注入 aiti_model_wizard_* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects aiti_model_wizard_* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "会话内注入 ui_env_* 工具（默认关；需要时经 aiti-helper 帮助点（🤖）临时启用，或扩展管理器开启）":
    "Injects ui_env_* tools into sessions (off by default; enable temporarily via the aiti-helper help point (🤖) or in the extension manager)",
  "CodeBuddy Code (腾讯)": "CodeBuddy Code (Tencent)",
  "腾讯 CodeBuddy 会话，哪儿都能接上聊。": "CodeBuddy sessions you can pick up from anywhere.",
  "Qoder CLI (国际/CN 独立 CLI·非 IDE)": "Qoder CLI (intl/CN standalone CLI · not the IDE)",
  "别人走 ACP 大路，它偏要走签名的独木桥——因为风景在对面。":
    "Others take the ACP highway; it insists on the signed single-plank bridge — the view is better over there.",
});

/** aiti-cpu-meter descriptionMd — recorded only in the zh `status` body. */
const cpuMeterMd = {
  "主线程流畅度检测器：页面角落挂一块小面板——rAF 读秒 + 0-100 流畅度分（Apdex 锚定 + 颜色分层）。**主线程一卡，读秒就停、分数暴跌**；可最小化成长期挂角的小图标，收工点开看会话平均。\n\n---\n\n## 四种用法\n\n### 1. 本实例页面（pi-web）\n\naiti-ai 版默认关闭（extman「功能管理」打开「启用检测器」）。面板可拖动、可最小化；位置/评分/最小化等开关见本页下方「功能管理」。\n\n### 2. 注入任意网站：script 标签\n\n外部版是单文件 IIFE，任何页面 `<script>` 加载即用（脚本跨站放行，已声明 publicApi）：\n\n```html\n<script src=\"{{aiti-url}}/api/extensions/{{ext-id}}/aiti-cpu-meter.js\" defer></script>\n```\n\n> 上面的 `{{aiti-url}}` 会自动替换成**当前 pi-web 实例的外部地址**（含 `/dev` 前缀），粘贴到目标站即可用。\n\n### 3. 注入任意网站：bookmarklet（免改目标站）\n\n新建一个浏览器书签，URL 粘贴下面这行（点「复制」），之后在任意网页上点这个书签，检测器就挂上了：\n\n```js\njavascript:(function(){var s=document.createElement('script');s.src='{{aiti-url}}/api/extensions/{{ext-id}}/aiti-cpu-meter.js';s.defer=1;document.body.appendChild(s)})();void 0\n```\n\n### 4. 全站自动注入：service-tunnels\n\n安装 [service-tunnels](http://aiti.pw/extensions/service-tunnels.html) 后，在它的公开配置里勾选「CPU 流畅度检测器」——代理/公开页面 HTML 自动注入，无需逐页加 script。\n\n---\n\n## 卡顿分析（🤖 问 AI）\n\n面板标题栏 🤖「问 AI」：一键把现场数据（流畅度分/长任务/LoAF 脚本归因/卡顿快照）交给 `aiti-helper` 建「调试页面卡顿」AI 会话，定位卡顿根因并给修复建议。\n\n## 数据口径\n\n- 读秒 = 距上帧真实耗时；主线程被长任务占死时读秒冻结\n- 流畅度分 0-100 由长任务占比 Apdex 锚定，颜色分层（绿 ≥ 90 / 黄 ≥ 70 / 红 < 70）\n- 会话统计：平均分 / 运行时长 / 最低分，最小化态也持续累积\n":
    "Main-thread smoothness meter: a small panel pinned in the page corner — rAF stopwatch + 0-100 smoothness score (Apdex-anchored + color tiers). **When the main thread jams, the stopwatch freezes and the score plunges**; it can minimize to a small icon parked in the corner — open it after work for the session average.\n\n---\n\n## Four ways to use it\n\n### 1. This instance's pages (pi-web)\n\nThe aiti-ai edition is off by default (enable the meter in extman's Feature management). The panel is draggable and minimizable; position/score/minimize toggles are under \"Feature management\" below.\n\n### 2. Inject into any website: script tag\n\nThe external edition is a single-file IIFE — drop it into any page with `<script>` (cross-site script allowed, publicApi declared):\n\n```html\n<script src=\"{{aiti-url}}/api/extensions/{{ext-id}}/aiti-cpu-meter.js\" defer></script>\n```\n\n> `{{aiti-url}}` above is auto-replaced with **the current pi-web instance's external URL** (including the `/dev` prefix) — paste it into the target site and it works.\n\n### 3. Inject into any website: bookmarklet (no changes to the target site)\n\nCreate a browser bookmark, paste the line below as its URL (click \"Copy\"), then click the bookmark on any page and the meter attaches:\n\n```js\njavascript:(function(){var s=document.createElement('script');s.src='{{aiti-url}}/api/extensions/{{ext-id}}/aiti-cpu-meter.js';s.defer=1;document.body.appendChild(s)})();void 0\n```\n\n### 4. Site-wide auto injection: service-tunnels\n\nAfter installing [service-tunnels](http://aiti.pw/extensions/service-tunnels.html), tick \"CPU smoothness meter\" in its public config — proxied/public page HTML gets it injected automatically, no per-page script.\n\n---\n\n## Jank analysis (🤖 Ask AI)\n\nThe panel title bar's 🤖 \"Ask AI\": one click hands the live data (smoothness score/long tasks/LoAF script attribution/jank snapshots) to `aiti-helper` to start a \"debug page jank\" AI session, locate the root cause and suggest fixes.\n\n## How the numbers work\n\n- Stopwatch = true time since the previous frame; frozen while long tasks jam the main thread\n- Smoothness score 0-100 is Apdex-anchored on long-task share, with color tiers (green ≥ 90 / yellow ≥ 70 / red < 70)\n- Session stats: average / runtime / minimum — keeps accumulating even minimized\n",
};

/** aiti-devtools descriptionMd — recorded only in the zh `status` body. */
const devtoolsMd = {
  "## 把 AI 请到页面开发现场\n\nAI 不该对着屏幕瞎猜——它该真正看见页面。注入后 AI 与你在**同一个页面**上协作：\n点选元素（`[元素N]` 直达 AI 输入框）、读 console / 网络、执行类 CDP 命令、事件冻结与放行。\n\n📖 **5 分钟上手**：[aiti.pw/devtools/quick-start.html](https://aiti.pw/devtools/quick-start.html)\n\n调试自己的前端项目只需两步（Vite 示例，dev server 启动即注入）：\n\n```\npnpm add -D @aiti-ai/aiti-devtools-vite\n```\n\n```ts\n// vite.config.ts\nimport { aitiDevtools } from '@aiti-ai/aiti-devtools-vite';\nexport default defineConfig({\n  plugins: [aitiDevtools({ bridgeUrl: 'http://localhost:8777' })],\n});\n```\n\n其他载体（webpack / Rspack / Nuxt / Astro / 浏览器扩展 / IDE 插件）与完整教程见\n[aiti.pw/devtools/quick-start.html](https://aiti.pw/devtools/quick-start.html) ——让 AI 常驻你的网页。\n":
    "## Bring AI to the page you're developing\n\nAI shouldn't guess at the screen — it should truly see the page. Once injected, AI collaborates with you on **the same page**:\npick elements (`[element N]` goes straight to the AI composer), read console/network, run CDP-like commands, freeze and release events.\n\n📖 **5-minute quick start**: [aiti.pw/devtools/quick-start.html](https://aiti.pw/devtools/quick-start.html)\n\nDebugging your own frontend takes two steps (Vite example; injected when the dev server starts):\n\n```\npnpm add -D @aiti-ai/aiti-devtools-vite\n```\n\n```ts\n// vite.config.ts\nimport { aitiDevtools } from '@aiti-ai/aiti-devtools-vite';\nexport default defineConfig({\n  plugins: [aitiDevtools({ bridgeUrl: 'http://localhost:8777' })],\n});\n```\n\nOther carriers (webpack / Rspack / Nuxt / Astro / browser extensions / IDE plugins) and the full tutorial at\n[aiti.pw/devtools/quick-start.html](https://aiti.pw/devtools/quick-start.html) — keep AI living in your web page.\n",
};

/** GET /api/extensions/aiti-ai-schedule/plans */
const plans = {
  "tts 缓存清理（过期 30 天 + 1GB LRU）": "TTS cache cleanup (30-day expiry + 1GB LRU)",
  "每 86400s": "every 86400s",
  "会话索引库瘦身（回收删除残留空闲页，不删会话数据；长任务——经索引 worker 后台执行，主线程零阻塞）":
    "Session index compaction (reclaims free pages left by deletions; keeps session data; long task via the index worker, zero main-thread blocking)",
  "影子仓按时间瘦身（默认保 30 天，删旧分支+回收对象+清无主台账）":
    "Shadow repo time-based prune (default 30 days: delete old branches + gc objects + clear orphaned ledgers)",
  "文档中心定期收集整理": "Doc Center periodic collect & organize",
  "每 600s": "every 600s",
  "配置变更滞留提醒": "Uncommitted config change reminder",
  "每 3600s": "every 3600s",
  "配置定时兜底提交": "Config scheduled fallback commit",
  "配置崩溃哨兵（自检指纹 + 可选桥检测）": "Config crash sentinel (self-check fingerprint + optional bridge check)",
  "每 60s": "every 60s",
};

/** GET /api/extensions/aiti-ai-speek/tts/info */
const ttsInfo = {
  "本地服务未运行（hojo-40m）— 选中「本地」引擎或运行 start-tts.sh start 自动准备":
    "Local service not running (hojo-40m) — pick the \"Local\" engine or run start-tts.sh start to prepare it automatically",
  "本地服务运行中 · Hojo-TTS-Light-40M (CPU, built-in voices) · pid 2055188":
    "Local service running · Hojo-TTS-Light-40M (CPU, built-in voices) · pid 2055188",
};

/** GET /api/extensions/aiti-ai-speek/tts/voices?force=1 */
const ttsVoices = {
  "中文 · 女声 1": "Chinese · Female 1",
  "我是 Hojo 中文女声 1，很高兴为你朗读。": "I'm Hojo Chinese female voice 1, happy to read for you.",
  "中文 · 女声 2": "Chinese · Female 2",
  "我是 Hojo 中文女声 2，很高兴为你朗读。": "I'm Hojo Chinese female voice 2, happy to read for you.",
  "中文 · 男声 1": "Chinese · Male 1",
  "我是 Hojo 中文男声 1，很高兴为你朗读。": "I'm Hojo Chinese male voice 1, happy to read for you.",
  "中文 · 男声 2": "Chinese · Male 2",
  "我是 Hojo 中文男声 2，很高兴为你朗读。": "I'm Hojo Chinese male voice 2, happy to read for you.",
};

/** GET /api/extensions/aiti-ai-speek/voices */
const speekVoices = {
  "晓晓 · 女（温和）": "Xiaoxiao · Female (gentle)",
  "我是晓晓，很高兴为你朗读，期待为你服务。": "I'm Xiaoxiao, happy to read for you — at your service.",
  "晓北（东北） · 女（幽默）": "Xiaobei (Northeastern) · Female (humorous)",
  "我是晓北，很高兴为你朗读，期待为你服务。": "I'm Xiaobei, happy to read for you — at your service.",
  "晓妮（陕西） · 女（明亮）": "Xiaoni (Shaanxi) · Female (bright)",
  "我是晓妮，很高兴为你朗读，期待为你服务。": "I'm Xiaoni, happy to read for you — at your service.",
  "晓伊 · 女（活泼）": "Xiaoyi · Female (lively)",
  "我是晓伊，很高兴为你朗读，期待为你服务。": "I'm Xiaoyi, happy to read for you — at your service.",
  "云健 · 男（激情）": "Yunjian · Male (passionate)",
  "我是云健，很高兴为你朗读，期待为你服务。": "I'm Yunjian, happy to read for you — at your service.",
  "云夏 · 男（可爱）": "Yunxia · Male (cute)",
  "我是云夏，很高兴为你朗读，期待为你服务。": "I'm Yunxia, happy to read for you — at your service.",
  "云希 · 男（活泼/阳光）": "Yunxi · Male (lively/sunny)",
  "我是云希，很高兴为你朗读，期待为你服务。": "I'm Yunxi, happy to read for you — at your service.",
  "云扬 · 男（专业/可靠）": "Yunyang · Male (professional/reliable)",
  "我是云扬，很高兴为你朗读，期待为你服务。": "I'm Yunyang, happy to read for you — at your service.",
  "已安装 · edge-tts v7.3.1 · /Users/demo/.local/bin/edge-tts":
    "installed · edge-tts v7.3.1 · /Users/demo/.local/bin/edge-tts",
};

/** POST /api/extensions/aiti-ai-speek/messages-content (TTS text payload) */
const msgContent = {
  "Welcome!\nThis is a static demo of Pi Web — the browser UI for the pi coding agent.\nThe screen has four areas:\n这是一张 5 行 2 列的表格；表头：Area、What it's for；例如：Left sidebar、Sessions, projects and the file explorer；结论：Right panel、Files and terminals in tabs；细节请看屏幕。\n接下来是一段mermaid代码，约3 行，主要实现graph LR；细节请看屏幕。":
    "Welcome!\nThis is a static demo of Pi Web — the browser UI for the pi coding agent.\nThe screen has four areas:\nThis is a table with 5 rows and 2 columns; headers: Area, What it's for; for example: Left sidebar, Sessions, projects and the file explorer; in short: Right panel, Files and terminals in tabs; see the screen for details.\nNext comes a mermaid code block, about 3 lines, mainly a graph LR; see the screen for details.",
};

/** POST /api/extensions/aiti-ai-speek/tts-batch */
const ttsBatch = {
  "这是一张5行2列的表格；": "This is a table with 5 rows and 2 columns;",
};

/**
 * aiti-ai-input ASR labels, shared by asr/config, asr/info and features.
 * The per-field labels exist only in asr/config + asr/info, so they are a
 * separate map merged in for those two routes.
 */
const asrBase = {
  "自建服务 8767（FunASR / Qwen3 / GLM）": "Self-hosted service 8767 (FunASR / Qwen3 / GLM)",
  "讯飞开放平台（听写 iat · 真流式 + 一次性提交兜底）":
    "iFlytek Open Platform (iat dictation · true streaming + one-shot fallback)",
  "百度智能云（短语音识别 · 普通话）": "Baidu AI Cloud (short speech recognition · Mandarin)",
  "硅基流动（云 API · SenseVoiceSmall）": "SiliconFlow (cloud API · SenseVoiceSmall)",
  "OpenAI 兼容端点（自建 / 代理 / 其它云）": "OpenAI-compatible endpoint (self-hosted / proxy / other clouds)",
  "Azure AI 语音（短语音识别 · F0 每月 5 小时免费）":
    "Azure AI Speech (short recognition · F0 free tier, 5 hours/month)",
};
const asrFields = {
  "API Key（控制台）": "API key (console)",
  "dev_pid（1537 普通话 / 80001 极速版）": "dev_pid (1537 Mandarin / 80001 fast edition)",
  "模型": "Model",
  "端点（可选）": "Endpoint (optional)",
  "端点（…/v1 或完整 …/audio/transcriptions）": "Endpoint (…/v1 or full …/audio/transcriptions)",
  "API Key（本地服务可留空）": "API key (can be empty for local services)",
  "密钥 Key1": "Key Key1",
  "区域（如 eastasia）": "Region (e.g. eastasia)",
  "语言": "Language",
};
const asr = { ...asrBase, ...asrFields };

/** GET /api/extensions/aiti-cmd/sessions */
const cmdSessions = {
  "本地 TTS 服务（aiti-ai-speek）": "Local TTS service (aiti-ai-speek)",
};

/** GET /api/extensions/aiti-devtools/mcp/bridge/sessions */
const bridgeSessions = {
  "Pi Web · AI 主窗口": "Pi Web · AI main window",
  "project - Pi Web · AI 主窗口": "project - Pi Web · AI main window",
  "Chrome 159 · Linux · 1440x900 · 🌐在线 · 16核 · en-US · UTC · 🤖自动化":
    "Chrome 159 · Linux · 1440x900 · 🌐online · 16 cores · en-US · UTC · 🤖automated",
};

/** GET /api/extensions/aiti-onlyoffice/status */
const onlyoffice = {
  "功能未开启（扩展管理器 → aiti-onlyoffice → 功能）":
    "Feature not enabled (Extension Manager → aiti-onlyoffice → Features)",
};

/** GET /api/extensions/aiti-subagents/agents/backends */
const backends = {
  "pi（内置 RPC 会话）": "pi (built-in RPC sessions)",
  "Qoder CLI CN (中国站)": "Qoder CLI CN (China site)",
  "ZCode CLI (智谱)": "ZCode CLI (Zhipu)",
};

/** GET /api/extensions/service-tunnels/status?self-only=1 */
const tunnels = {
  "本机（回环）": "This machine (loopback)",
  "局域网（wlp3s0）": "LAN (wlp3s0)",
  "局域网（br0）": "LAN (br0)",
  "局域网（br-d419d3ba284b）": "LAN (br-d419d3ba284b)",
  "局域网（docker0）": "LAN (docker0)",
};

/** GET /api/extensions/session-manager/sources */
const sources = {
  "需要 sqlcipher 二进制（apt install sqlcipher）解密本地库":
    "Requires the sqlcipher binary (apt install sqlcipher) to decrypt the local database",
};

/**
 * GET /api/sessions/demo-welcome/hosting — the task named this route
 * "GET /api/agent/demo-welcome/hosting", but the recording only contains the
 * sessions-scoped key below (the sole demo-welcome hosting route, and the
 * only one with Chinese copy).
 */
const hosting = {
  "pi CLI（pi 0.84+；models.json 内 API key）": "pi CLI (pi 0.84+; API key in models.json)",
};

/** Route key → translation map. Keys must exist in routes.json verbatim. */
const ROUTE_OVERRIDES = {
  "GET /api/extensions/aiti-extman/status": { ...extman, ...cpuMeterMd, ...devtoolsMd },
  "GET /api/extensions/aiti-extman/status?locale=en": extman,
  "GET /api/extensions/aiti-ai-schedule/plans": plans,
  "GET /api/extensions/aiti-ai-speek/tts/info": ttsInfo,
  "GET /api/extensions/aiti-ai-speek/tts/voices?force=1": ttsVoices,
  "GET /api/extensions/aiti-ai-speek/voices": speekVoices,
  "POST /api/extensions/aiti-ai-speek/messages-content": msgContent,
  "POST /api/extensions/aiti-ai-speek/tts-batch": ttsBatch,
  "GET /api/extensions/aiti-ai-input/asr/config": asr,
  "GET /api/extensions/aiti-ai-input/asr/info": asr,
  "GET /api/extensions/aiti-ai-input/features": asrBase,
  "GET /api/extensions/aiti-cmd/sessions": cmdSessions,
  "GET /api/extensions/aiti-devtools/mcp/bridge/sessions": bridgeSessions,
  "GET /api/extensions/aiti-onlyoffice/status": onlyoffice,
  "GET /api/extensions/aiti-subagents/agents/backends": backends,
  "GET /api/extensions/service-tunnels/status?self-only=1": tunnels,
  "GET /api/extensions/session-manager/sources": sources,
  "GET /api/sessions/demo-welcome/hosting": hosting,
};

// ---------------------------------------------------------------------------
// Build engine: clone entries, replace mapped Chinese strings, verify
// coverage both ways, and check structural identity against the recording.
// ---------------------------------------------------------------------------

const routes = JSON.parse(readFileSync(routesPath, "utf8"));

const skipped = [];
const missing = [];
const translated = new Map();
const usedKeys = new Map(); // route → Set of applied dictionary keys

function isByDesign(path, parentKey) {
  return parentKey !== null && BY_DESIGN_KEY_RE.test(parentKey);
}

function walk(value, path, route, map, used, out) {
  if (typeof value === "string") {
    if (!CJK_RE.test(value)) return value;
    const segments = path.split(".");
    const parentKey = segments.length > 1 ? segments[segments.length - 1] : null;
    if (isByDesign(path, parentKey)) {
      skipped.push({ route, path, value });
      return value;
    }
    const en = map[value];
    if (typeof en !== "string") {
      missing.push({ route, path, value });
      return value;
    }
    used.add(value);
    out.count += 1;
    return en;
  }
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let i = 0; i < value.length; i += 1) {
      copy[i] = walk(value[i], `${path}[${i}]`, route, map, used, out);
    }
    return copy;
  }
  if (value && typeof value === "object") {
    const copy = {};
    for (const key of Object.keys(value)) {
      copy[key] = walk(value[key], path ? `${path}.${key}` : key, route, map, used, out);
    }
    return copy;
  }
  return value;
}

/** Compare key sets recursively; returns [] of mismatch descriptions. */
function structureDiff(a, b, path, diffs) {
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) diffs.push(`${path}: array length ${a.length} ≠ ${b.length}`);
    const n = Math.min(a.length, b.length);
    for (let i = 0; i < n; i += 1) structureDiff(a[i], b[i], `${path}[${i}]`, diffs);
    return diffs;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a);
    const bk = Object.keys(b);
    for (const k of ak) if (!Object.hasOwn(b, k)) diffs.push(`${path}.${k}: missing in en`);
    for (const k of bk) if (!Object.hasOwn(a, k)) diffs.push(`${path}.${k}: extra in en`);
    for (const k of ak) if (Object.hasOwn(b, k)) structureDiff(a[k], b[k], `${path}.${k}`, diffs);
    return diffs;
  }
  return diffs;
}

const outRoutes = {};
let fatal = 0;

for (const [route, map] of Object.entries(ROUTE_OVERRIDES)) {
  const entries = routes[route];
  if (!Array.isArray(entries)) {
    console.error(`[build-routes-en] route missing in routes.json: ${route}`);
    fatal += 1;
    continue;
  }
  const used = new Set();
  const counter = { count: 0 };
  const outEntries = entries.map((entry, index) => walk(entry, `entries[${index}]`, route, map, used, counter));
  outRoutes[route] = outEntries;
  translated.set(route, counter.count);
  usedKeys.set(route, used);

  for (let index = 0; index < entries.length; index += 1) {
    const diffs = structureDiff(entries[index], outEntries[index], `entry[${index}]`, []);
    for (const d of diffs) {
      console.error(`[build-routes-en] structure mismatch ${route}: ${d}`);
      fatal += 1;
    }
  }
}

// Every dictionary key must have been applied somewhere (stale-entry guard).
for (const [route, map] of Object.entries(ROUTE_OVERRIDES)) {
  const used = usedKeys.get(route);
  for (const key of Object.keys(map)) {
    if (!used.has(key)) {
      console.error(`[build-routes-en] unused translation key in ${route}: ${JSON.stringify(key.slice(0, 80))}`);
      fatal += 1;
    }
  }
}

// Report
console.log("[build-routes-en] translated strings per route:");
for (const [route, count] of translated) {
  console.log(`  ${count}\t${route}`);
}
console.log(`[build-routes-en] skipped by-design bilingual strings: ${skipped.length}`);
const skipByRoute = new Map();
for (const s of skipped) {
  if (!skipByRoute.has(s.route)) skipByRoute.set(s.route, []);
  skipByRoute.get(s.route).push(s);
}
for (const [route, list] of skipByRoute) {
  console.log(`  ${route}: ${list.length} (locale-keyed zh data, kept Chinese)`);
  for (const s of list) console.log(`    ${s.path} = ${JSON.stringify(s.value.slice(0, 60))}…`);
}
if (missing.length) {
  console.error(`[build-routes-en] ${missing.length} Chinese string(s) without a translation:`);
  for (const m of missing) console.error(`  ${m.route} ${m.path} = ${JSON.stringify(m.value.slice(0, 120))}`);
  fatal += 1;
}

if (fatal) {
  console.error("[build-routes-en] FAILED with problem(s) above; routes.en.json not written.");
  process.exit(1);
}

// Extension-count sanity for the extman status bodies.
const extmanKeys = [
  "GET /api/extensions/aiti-extman/status",
  "GET /api/extensions/aiti-extman/status?locale=en",
];
for (const key of extmanKeys) {
  const zhCount = Object.keys(routes[key][0].body.extensions).length;
  const enCount = Object.keys(outRoutes[key][0].body.extensions).length;
  if (zhCount !== enCount) {
    console.error(`[build-routes-en] extension count mismatch for ${key}: zh ${zhCount} ≠ en ${enCount}`);
    process.exit(1);
  }
  console.log(`[build-routes-en] ${key}: ${enCount} extensions (matches recording)`);
}

writeFileSync(outPath, `${JSON.stringify(outRoutes)}\n`);
console.log(`[build-routes-en] wrote ${outPath} (${Object.keys(outRoutes).length} route keys)`);
