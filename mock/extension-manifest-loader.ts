/**
 * Lazy access to the generated extension manifest.
 *
 * The manifest is ~1.1MB of JSON. A static import would put it inside the main
 * client chunk, so it would be parsed before first paint even though the host
 * only asks for it once extensions start loading. A dynamic import splits it out
 * and lets the shell paint first.
 */
type Manifest = typeof import("./data/extension-manifest.json");

let cached: Manifest | null = null;
let inflight: Promise<Manifest> | null = null;

export async function loadExtensionManifest(): Promise<Manifest> {
  if (cached) return cached;
  inflight ??= import("./data/extension-manifest.json").then((mod) => {
    cached = mod.default as Manifest;
    inflight = null;
    return cached;
  });
  return inflight;
}
