/**
 * Provider usage mock: /api/extensions/aiti-provider-usage/* answered with
 * canned per-provider reports in the exact shapes the real server adapters
 * produce (extensions/aiti-provider-usage/lib/server).
 *
 * All timestamps are computed per request (resetsAt = now + offset) so the
 * panel's reset countdowns and the window remaining-time ratio — the
 * ` (time:NN%)` suffix next to each reset time — always read plausibly, and a
 * manual refresh visibly re-renders them. Provider rows intentionally exercise
 * every render branch: percent and count buckets, currency metrics, a
 * rate-limited window, exhausted badges, grouped per-model details, and the
 * auth-unavailable / query-failed statuses.
 */
import { type MockRequest, delay, json } from "./http";

type UsageUnit = "percent" | "currency" | "count";

interface MockBucket {
  id: string;
  label: string;
  groupLabel?: string;
  used?: number;
  remaining?: number;
  limit?: number;
  unit: UsageUnit;
  currency?: string;
  windowMinutes?: number;
  resetsAt?: number;
  period?: string;
  status?: "ok" | "rate-limited" | "exhausted";
}

interface MockMetric {
  id: string;
  label: string;
  value: number | string;
  unit?: UsageUnit;
  currency?: string;
  groupLabel?: string;
}

interface MockReport {
  providerId: string;
  providerName: string;
  capturedAt: number;
  buckets: MockBucket[];
  metrics: MockMetric[];
  notes?: string[];
  exhausted?: boolean;
}

interface OverviewEntry {
  providerId: string;
  providerName: string;
  kind: string;
  status: "ready" | "auth-unavailable" | "query-failed";
  report?: MockReport;
  message?: string;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
/** Calendar-month windows are approximated as 30d by the real adapters. */
const MONTH = 30 * DAY;

/** Reset time as epoch seconds, `offsetMs` from now. */
function resetsIn(offsetMs: number, now: number): number {
  return Math.floor((now + offsetMs) / 1000);
}

/** One canned provider report. `now` is the request time. */
type ReportFactory = (now: number) => MockReport;

const reports: Array<{ id: string; name: string; build: ReportFactory }> = [
  {
    id: "deepseek",
    name: "DeepSeek",
    // Balance-style provider: metrics only, no buckets.
    build: (now) => ({
      providerId: "deepseek",
      providerName: "DeepSeek",
      capturedAt: now,
      buckets: [],
      metrics: [
        { id: "availability", label: "API calls", value: "Available" },
        { id: "cny-total", label: "Total balance", value: 86.4, unit: "currency", currency: "CNY" },
        { id: "cny-granted", label: "Granted balance", value: 10, unit: "currency", currency: "CNY" },
        { id: "cny-topped-up", label: "Topped-up balance", value: 76.4, unit: "currency", currency: "CNY" },
      ],
    }),
  },
  {
    id: "github-copilot",
    name: "GitHub Copilot",
    // Not connected on this install — the row renders the muted message.
    build: () => ({ providerId: "github-copilot", providerName: "GitHub Copilot", capturedAt: 0, buckets: [], metrics: [] }),
  },
  {
    id: "kimi-coding",
    name: "Kimi Coding",
    // Percent windows (5h / weekly / monthly) + a booster wallet metric.
    build: (now) => ({
      providerId: "kimi-coding",
      providerName: "Kimi Coding",
      capturedAt: now,
      buckets: [
        { id: "window-5h", label: "5h", used: 19, remaining: 81, limit: 100, unit: "percent", resetsAt: resetsIn(3 * HOUR + 20 * MINUTE, now), windowMinutes: 5 * 60 },
        { id: "window-weekly", label: "weekly", used: 38, remaining: 62, limit: 100, unit: "percent", resetsAt: resetsIn(6 * DAY + 9 * HOUR, now), windowMinutes: WEEK / MINUTE },
        { id: "window-monthly", label: "monthly", used: 74, remaining: 26, limit: 100, unit: "percent", resetsAt: resetsIn(22 * DAY, now), windowMinutes: MONTH / MINUTE },
      ],
      metrics: [
        { id: "booster", label: "Booster wallet", value: "4.20", unit: "currency", currency: "USD" },
      ],
      notes: ["Percentages are plan window usage, not balance."],
    }),
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    // Daily window currently rate-limited — renders the 限流 state suffix and
    // the red severity color.
    build: (now) => ({
      providerId: "opencode-go",
      providerName: "OpenCode Go",
      capturedAt: now,
      buckets: [
        { id: "window-daily", label: "daily", used: 88, remaining: 12, limit: 100, unit: "percent", resetsAt: resetsIn(5 * HOUR + 20 * MINUTE, now), windowMinutes: DAY / MINUTE, status: "rate-limited" },
      ],
      metrics: [],
      exhausted: true,
      notes: ["Any quota window at its limit blocks requests."],
    }),
  },
  {
    id: "openai-codex",
    name: "OpenAI Codex",
    // ChatGPT plan windows (primary 5h / weekly secondary, percent) — this is
    // also the demo sessions' default model provider, so the panel pins it as
    // "current session" and renders it expanded on top.
    build: (now) => ({
      providerId: "openai-codex",
      providerName: "OpenAI Codex",
      capturedAt: now,
      buckets: [
        { id: "codex:primary", label: "5h", used: 23, remaining: 77, limit: 100, unit: "percent", resetsAt: resetsIn(2 * HOUR + 40 * MINUTE, now), windowMinutes: 5 * 60 },
        { id: "codex:secondary", label: "Weekly", used: 41, remaining: 59, limit: 100, unit: "percent", resetsAt: resetsIn(2 * DAY + 3 * HOUR, now), windowMinutes: WEEK / MINUTE },
      ],
      metrics: [
        { id: "credits", label: "Credits", value: "Unlimited" },
      ],
    }),
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    // Currency bucket with a hard monthly limit.
    build: (now) => ({
      providerId: "openrouter",
      providerName: "OpenRouter",
      capturedAt: now,
      buckets: [
        { id: "monthly-usd", label: "Monthly limit", remaining: 6.4, limit: 20, used: 13.6, unit: "currency", currency: "USD", resetsAt: resetsIn(12 * DAY, now), windowMinutes: MONTH / MINUTE },
      ],
      metrics: [],
    }),
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    // Endpoint blipped at capture time — renders the query-failed message.
    build: () => ({ providerId: "siliconflow", providerName: "SiliconFlow", capturedAt: 0, buckets: [], metrics: [] }),
  },
  {
    id: "zai-coding-cn",
    name: "Z.AI Coding CN",
    // Count-unit token windows (5h exact, weekly) + per-model details grouped
    // under the 5h window, mirroring the zai adapter's normalizeLimit shape.
    build: (now) => ({
      providerId: "zai-coding-cn",
      providerName: "Z.AI Coding CN",
      capturedAt: now,
      buckets: [
        {
          id: "limit-0",
          label: "5h",
          used: 337600,
          remaining: 462400,
          limit: 800000,
          unit: "count",
          resetsAt: resetsIn(1 * HOUR + 48 * MINUTE, now),
          windowMinutes: 5 * 60,
          status: "ok",
        },
        {
          id: "limit-1",
          label: "1w",
          used: 5800000,
          remaining: 4200000,
          limit: 10000000,
          unit: "count",
          resetsAt: resetsIn(3 * DAY + 15 * HOUR, now),
          windowMinutes: WEEK / MINUTE,
          status: "ok",
        },
      ],
      metrics: [
        { id: "limit-0:glm-4.7", label: "glm-4.7", value: 298300, unit: "count", groupLabel: "5h" },
        { id: "limit-0:glm-4.6-air", label: "glm-4.6-air", value: 39300, unit: "count", groupLabel: "5h" },
      ],
      notes: ["Plan level: Pro"],
    }),
  },
];

/** Same sort key as the real aggregate(): provider display name. */
function overview(now: number): { capturedAt: number; providers: OverviewEntry[] } {
  const providers = reports
    .map(({ id, name, build }) => ({ id, name, report: build(now) }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ id, name, report }): OverviewEntry => {
      if (id === "github-copilot") {
        return { providerId: id, providerName: name, kind: "usage", status: "auth-unavailable", message: "Connect this provider before querying usage." };
      }
      if (id === "siliconflow") {
        return { providerId: id, providerName: name, kind: "usage", status: "query-failed", message: "The provider usage endpoint returned HTTP 503." };
      }
      return { providerId: id, providerName: name, kind: "usage", status: "ready", report };
    });
  return { capturedAt: now, providers };
}

export async function providerUsageRoute(request: MockRequest): Promise<Response> {
  const sub = request.segments[3];
  if (sub === "overview" && request.method === "POST") {
    // A short delay so the panel's querying state and the refresh spinner are
    // visible, like a real network round trip. Data is computed per request,
    // so a force refresh always moves the captured-at time and countdowns.
    await delay(450, request.signal);
    return json(overview(Date.now()));
  }
  if (sub === "query" && request.method === "POST") {
    await delay(300, request.signal);
    const body = await request.json<{ providerId?: unknown }>().catch(() => ({}) as { providerId?: unknown });
    const providerId = typeof body?.providerId === "string" ? body.providerId : "";
    const found = reports.find((report) => report.id === providerId);
    if (!found) return json({ providerId, status: "unsupported", message: "Unsupported provider" });
    if (providerId === "github-copilot") return json({ providerId, status: "auth-unavailable", message: "Connect this provider before querying usage." });
    if (providerId === "siliconflow") return json({ providerId, status: "query-failed", message: "The provider usage endpoint returned HTTP 503." });
    const now = Date.now();
    return json({ providerId, status: "ready", report: { ...found.build(now), providerId, providerName: found.name } });
  }
  return json({ error: `Not found: ${request.path}` }, 404);
}
