#!/usr/bin/env bash
# Install Playwright's Chrome for Testing from the npmmirror mirror.
#
# `npx playwright install chromium` downloads from cdn.playwright.dev, which
# redirects to Google storage and often stalls on CN networks. This script
# fetches the same Chrome-for-Testing build with aria2c (16 connections) and
# writes it into the Playwright cache with the marker files it expects.
#
#   bash scripts/install-playwright-browser.sh
#   PLAYWRIGHT_BROWSERS_PATH=/path bash scripts/install-playwright-browser.sh
#
# Version mapping comes from node_modules/playwright-core/browsers.json.
set -euo pipefail

VERSION="${PLAYWRIGHT_CFT_VERSION:-159.0.8154.6}"
REVISION="${PLAYWRIGHT_CFT_REVISION:-1255}"
MIRROR="${PLAYWRIGHT_CFT_MIRROR:-https://cdn.npmmirror.com/binaries/chrome-for-testing}"
CACHE="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
BASE="$MIRROR/$VERSION/linux64"
TMP="${TMPDIR:-/tmp}/playwright-cft-$$"

mkdir -p "$TMP" "$CACHE/chromium-$REVISION" "$CACHE/chromium_headless_shell-$REVISION"

download() {
  local url="$1" out="$2"
  if command -v aria2c >/dev/null 2>&1; then
    aria2c -x16 -s16 -k1M --allow-overwrite=true -o "$out" "$url"
  else
    curl -fL --retry 3 --connect-timeout 15 -o "$out" "$url"
  fi
}

cd "$TMP"
[ -f chrome-linux64.zip ] || download "$BASE/chrome-linux64.zip" chrome-linux64.zip
[ -f chrome-headless-shell-linux64.zip ] || download "$BASE/chrome-headless-shell-linux64.zip" chrome-headless-shell-linux64.zip

unzip -q -o chrome-linux64.zip -d "$CACHE/chromium-$REVISION"
unzip -q -o chrome-headless-shell-linux64.zip -d "$CACHE/chromium_headless_shell-$REVISION"
touch "$CACHE/chromium-$REVISION/INSTALLATION_COMPLETE" "$CACHE/chromium_headless_shell-$REVISION/INSTALLATION_COMPLETE"

cd /
rm -rf "$TMP"
echo "[playwright] installed chromium-$REVISION ($VERSION) under $CACHE"
