#!/usr/bin/env bash
# Build and publish the static showcase to demo.aiti.pw on this host.
#
#   bash scripts/deploy-demo.sh            # build + rsync + reload nginx
#   bash scripts/deploy-demo.sh --skip-build
#
# Requires the aiti-ai checkout next to this repo (or AITI_SRC) and passwordless
# sudo for nginx/rsync (or run as root).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="/var/www/aiti-demos"
SKIP_BUILD=0
[[ "${1:-}" == "--skip-build" ]] && SKIP_BUILD=1

cd "$HERE"
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  npm run build
fi
if [[ ! -f out/index.html ]]; then
  echo "out/index.html missing — run the build first" >&2
  exit 1
fi

sudo mkdir -p "$TARGET"
# --delete keeps removed chunks from lingering; nginx serves the directory.
sudo rsync -a --delete "$HERE/out/" "$TARGET/"
sudo nginx -t
sudo systemctl reload nginx
echo "[demo] published to https://demo.aiti.pw/ (root: $TARGET)"
