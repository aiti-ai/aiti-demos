/**
 * service-tunnels mock: the "Service ports" panel lists the ports pi sessions
 * started plus tunnel state. A static site has no processes to discover, so the
 * panel fell back to "No service ports found" and the status/enroll calls 404'd.
 *
 * Shapes mirror extensions/service-tunnels (client/src/dialog/types.ts +
 * server/api.ts GET /services, /enroll, /status).
 */
import type { MockRequest } from "./http";
import { json } from "./http";

const SUFFIXES = [".pi.localhost", ".pi.aiti.pw"];

/** Demo services on the fictional workstation. */
const SERVICES = [
  {
    port: 5173,
    pid: 41207,
    process: "node",
    cmdline: "node /Users/demo/code/pi-web/node_modules/vite/bin/vite.js --host",
    addresses: ["127.0.0.1", "192.0.2.10"],
    identity: { label: "Web (Vite dev)", protocol: "http", status: 200, server: "Vite 6.4", favicon: null },
  },
  {
    port: 3010,
    pid: 41260,
    process: "node",
    cmdline: "node server.js",
    addresses: ["127.0.0.1"],
    identity: { label: "API server", protocol: "http", status: 204, server: "Express", favicon: null },
  },
  {
    port: 8768,
    pid: 41302,
    process: "python3",
    cmdline: "python3 -m uvicorn tts_service:app --port 8768",
    addresses: ["127.0.0.1"],
    identity: { label: "Local TTS", protocol: "http", status: 200, server: "uvicorn", favicon: null },
  },
  {
    port: 5900,
    pid: 40988,
    process: "Xvfb",
    cmdline: "/usr/bin/Xvfb :99 -screen 0 1920x1080x24",
    addresses: ["127.0.0.1"],
    identity: { label: "Virtual display (VNC)", protocol: "vnc", status: null, server: null, favicon: null },
  },
];

const TUNNELS = [
  { name: "cloudflared", cmd: "cloudflared tunnel run demo", running: true, pid: 41021, url: "https://demo-vite.example.invalid", lastOutput: "INF Registered tunnel connection" },
  { name: "ngrok", cmd: "ngrok http 3010", running: false, pid: null, url: null, lastOutput: "" },
];

const ENROLLED = [
  { port: 5173, basePath: "", label: "Web (Vite dev)" },
  { port: 3010, basePath: "/api", label: "API server" },
];

function statusPayload(lang: string) {
  return {
    self: {
      exposing: false,
      unauthenticated: false,
      allowLocal: true,
      allowHosts: [],
      allowLocalPending: { pending: false, expiresAt: 0 },
      port: 30147,
      mode: null,
      auth: null,
      tunnel: null,
      url: null,
    },
    serviceHostSuffix: SUFFIXES[0],
    serviceHostSuffixes: SUFFIXES,
    tunnels: TUNNELS,
    platform: "linux",
    lang,
  };
}

export async function serviceTunnelsRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  if (action === "services") {
    return json({
      services: SERVICES,
      serviceHostSuffix: SUFFIXES[0],
      serviceHostSuffixes: SUFFIXES,
      tunnels: TUNNELS,
      platform: "linux",
    });
  }
  if (action === "status") {
    return json(statusPayload(request.query("lang") ?? "en"));
  }
  if (action === "enroll") {
    if (request.method === "PATCH" || request.method === "POST") return json({ ok: true, ports: ENROLLED });
    return json({ ports: ENROLLED });
  }
  if (action === "self-reco") {
    return json({
      port: 30147,
      candidates: [
        { id: "tunnel", available: true, mode: "tunnel", auth: "portal", tunnel: "cloudflared", tunnelOptions: ["ngrok", "frpc", "cloudflared"], url: null },
        { id: "lan", available: true, mode: "lan", auth: "password", tunnel: null, tunnelOptions: [], url: null },
      ],
    });
  }
  if (action === "ddns") return json({ providers: [], records: [] });
  if (action === "users") return json({ users: [{ name: "demo", role: "owner" }] });
  if (action === "tunnels") return json({ ok: true, tunnels: TUNNELS });
  return json({ ok: true });
}
