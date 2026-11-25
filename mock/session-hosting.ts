/**
 * Mock for GET/POST /api/sessions/[id]/hosting — the agent badge's hosting
 * snapshot (aiti-agent-badge).
 *
 * The real endpoint reads two independent sources: the runtime registry (is a
 * process alive, in which mode) and the survive-restart preference marker (what
 * the next start should use). The mock keeps the same separation per session:
 *   · welcome      → in-process process, alive but idle ("Idle (process alive)")
 *   · multi-agent  → subprocess-detached process (the survive-restart row)
 *   · everyone else → cold: never started here ("Not started")
 *
 * POST mirrors the real switch semantics: on a cold session it only writes the
 * preference (the mode stays null — nothing is running); on an alive session it
 * restarts the process into the switched mode. State resets on reload — fine
 * for a demo; the visitor's read-only view is identical to production.
 */
import type { MockRequest } from "./http";
import { error, json } from "./http";
import { SESSION_IDS } from "./sessions/ids";
import { sessionFilePath } from "./paths";
import type { MockSession } from "./sessions/store";

type HostingMode = "in-process" | "subprocess" | "subprocess-detached";

/** sessionId → mode of the process currently alive for it (runtime registry). */
const live = new Map<string, HostingMode>();
/** sessionId → mode the next start should use (preference marker). */
const preference = new Map<string, HostingMode>();

function initState(id: string): void {
  if (id === SESSION_IDS.welcome) { live.set(id, "in-process"); preference.set(id, "in-process"); }
  else if (id === SESSION_IDS.multiAgent) { live.set(id, "subprocess-detached"); preference.set(id, "subprocess-detached"); }
}

const DETACH_REASON = "systemd-run: systemd user manager reachable";
const SPAWN_PROVIDER_TYPE = "aiti-pi-agent/spawn";
const SPAWN_PROVIDER_LABEL = "New pi subprocess (--mode rpc)";

function snapshot(session: MockSession) {
  if (!live.has(session.id) && !preference.has(session.id)) initState(session.id);
  const pref = preference.get(session.id);
  const current = live.get(session.id) ?? null;
  const info: Record<string, unknown> = {
    ok: true,
    sessionId: session.id,
    nativeSessionId: session.id,
    sessionFile: sessionFilePath(session.cwd, session.created, session.id),
    cwd: session.cwd,
    agent: "pi",
    agentKind: "pi",
    agentLabel: "Pi CLI",
    agentHint: "pi CLI (pi 0.84+; API keys inside models.json)",
    alive: current !== null,
    running: false,
    mode: current,
    detached: current === "subprocess-detached",
    detachedPreference: pref === "subprocess-detached",
    nextStartMode: pref === "subprocess" ? "subprocess" : pref === "subprocess-detached" ? "subprocess-detached" : "in-process",
    runner: "systemd-run",
    detachAvailable: true,
    detachReason: DETACH_REASON,
    switchSupported: true,
    switchDisabledReason: null,
    modes: [
      { mode: "in-process", available: true },
      { mode: "subprocess", available: true },
      { mode: "subprocess-detached", available: true },
    ],
  };
  if (current === "in-process") {
    info.providerType = "local";
  } else if (current === "subprocess" || current === "subprocess-detached") {
    info.providerType = SPAWN_PROVIDER_TYPE;
    info.providerLabel = SPAWN_PROVIDER_LABEL;
  } else if (pref === "subprocess" || pref === "subprocess-detached") {
    info.providerType = SPAWN_PROVIDER_TYPE;
  }
  return info;
}

export async function hostingRoute(request: MockRequest, session: MockSession): Promise<Response> {
  if (request.method === "GET") return json(snapshot(session));
  if (request.method === "POST") {
    const body = await request.json<{ mode?: string }>();
    const mode = body?.mode;
    if (mode !== "in-process" && mode !== "subprocess" && mode !== "subprocess-detached") {
      return error("mode must be in-process, subprocess, or subprocess-detached", 400);
    }
    preference.set(session.id, mode);
    // A real switch stops the old runtime and starts the new mode; a cold
    // session just records the preference for its first start.
    if (live.has(session.id) && live.get(session.id) !== mode) live.set(session.id, mode);
    return json({ ok: true, mode, info: snapshot(session) });
  }
  return error("Not found", 404);
}
