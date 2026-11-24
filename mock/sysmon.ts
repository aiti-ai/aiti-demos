/**
 * aiti-sysmon mock: the System Status dock panel and the top-bar CPU/memory
 * chips read /snapshot and /brief, which a static site cannot provide. Report a
 * stable, plausible demo machine so the panel renders instead of 404-ing to an
 * empty block.
 *
 * Shapes mirror extensions/aiti-sysmon/index.ts buildSnapshot/buildBrief.
 */
import type { MockRequest } from "./http";
import { json } from "./http";

const GiB = 1024 ** 3;

/** Deterministic drift so the panel looks alive without being random noise. */
function wave(period: number, base: number, amplitude: number): number {
  return Math.round((base + amplitude * Math.sin((Date.now() / 1000) * (2 * Math.PI / period))) * 10) / 10;
}

function brief() {
  const used = 6.4 * GiB;
  const total = 16 * GiB;
  return {
    ts: Date.now(),
    cpu: { load: wave(47, 18, 9) },
    mem: {
      pct: Math.round((used / total) * 1000) / 10,
      used,
      total,
      swapPct: 3.1,
      swapUsed: 0.25 * GiB,
      swapTotal: 8 * GiB,
    },
  };
}

function snapshot() {
  const memory = brief().mem;
  return {
    ts: Date.now(),
    os: {
      hostname: "demo-workstation",
      platform: "linux",
      distro: "Ubuntu",
      release: "24.04",
      kernel: "6.8.0-demo",
      arch: "x64",
      uptime: 4 * 86400 + 7 * 3600,
    },
    cpu: {
      model: "Demo Ryzen 7 7840U (16) @ 5.1GHz",
      cores: 16,
      load: wave(47, 18, 9),
      perCore: Array.from({ length: 16 }, (_, i) => wave(37 + i, 16, 12)),
      loadavg: [0.74, 0.91, 1.05],
      temp: wave(53, 52, 4),
    },
    sensors: [
      { chip: "k10temp", label: "Tctl", temp: 52.5 },
      { chip: "nvme", label: "Composite", temp: 41.0 },
      { chip: "amdgpu", label: "edge", temp: 47.0 },
    ],
    mem: {
      total: memory.total,
      used: memory.used,
      free: memory.total - memory.used,
      swapTotal: memory.swapTotal,
      swapUsed: memory.swapUsed,
    },
    disks: [
      { fs: "/dev/nvme0n1p2", mount: "/", type: "ext4", used: 412 * GiB, total: 1024 * GiB, use: 40.2 },
      { fs: "/dev/nvme0n1p1", mount: "/boot/efi", type: "vfat", used: 0.2 * GiB, total: 0.5 * GiB, use: 40 },
    ],
    net: [
      { iface: "enp1s0", rxSec: wave(29, 240_000, 180_000), txSec: wave(23, 42_000, 30_000), rxTotal: 184_320_111_222, txTotal: 12_884_991_002, operState: "up" },
      { iface: "wg0", rxSec: wave(31, 18_000, 12_000), txSec: wave(37, 9_000, 6_000), rxTotal: 88_112_001, txTotal: 4_221_009, operState: "up" },
    ],
  };
}

export async function sysmonRoute(request: MockRequest): Promise<Response> {
  const action = request.segments[3];
  if (action === "brief") return json(brief());
  if (action === "snapshot") return json(snapshot());
  return json({ ok: true });
}
