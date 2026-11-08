#!/usr/bin/env bash
# Renders the per-page Open Graph images (1200×630) into public/og/ from the brand template
# (brand/src/og.html, which loads this site's fonts). Run it from a full repo checkout after
# changing a page title; the PNGs are committed, so the site build itself needs no browser.
#   site/scripts/og.sh            render every image
#   site/scripts/og.sh compare     render only the named slugs
#   CHROME=/path/to/chrome site/scripts/og.sh
set -euo pipefail
cd "$(dirname "$0")/.."
SITE="$(pwd)"
REPO="$(cd .. && pwd)"
RENDER="$REPO/brand/tools/render-html.sh"
TEMPLATE="$REPO/brand/src/og.html"
OUT="$SITE/public/og"
mkdir -p "$OUT"

# slug | title | section | art (perch, camera, link, headphones, sleeping, celebrating)
PAGES='home|Record. Get a link. Polish it later.||perch
download|Download Reelbird for Mac, free|Download|perch
features|Auto-zoom, instant links and clean audio|Features|camera
features-auto-zoom|Zooms that follow your clicks|Features|camera
features-share-links|Share links that update in place|Features|link
features-audio-captions|Clear sound and on-device captions|Features|headphones
features-agents|Your coding agent can record the demo|Features|perch
features-step-by-step-guides|Turn a recording into a step-by-step guide|Features|perch
features-blur-sensitive-info|Blur sensitive info in a screen recording|Features|sleeping
docs|Install, share links, CLI and MCP|Docs|perch
docs-install|Install and update Reelbird|Docs|perch
docs-sharing|Share links from a bucket you own|Docs|link
docs-shortcuts|Keyboard shortcuts|Docs|perch
docs-cli|The reelbird command line tool|Docs|perch
docs-mcp|MCP server for Claude Code, Codex and Cursor|Docs|perch
docs-troubleshooting|Troubleshooting|Docs|sleeping
docs-format|The .reelbird project format|Docs|perch
docs-architecture|How Reelbird is built|Docs|perch
loom-alternative|A free, open-source Loom alternative for Mac|Compare|link
screen-studio-alternative|A free, open-source Screen Studio alternative|Compare|camera
compare|The best screen recorder for Mac, free and paid|Compare|perch
open-source-screen-recorders-mac|Open-source screen recorders for Mac|Compare|perch
cap-alternative|A Cap alternative for Mac, MIT licensed|Compare|link
scribe-alternative|A free Scribe and Tango alternative for Mac|Compare|perch
tella-alternative|A free Tella alternative for Mac|Compare|camera
focusee-alternative|A free FocuSee alternative for Mac|Compare|camera
cleanshot-alternative|A free CleanShot X alternative for screen recording|Compare|camera
use-cases|What people record with Reelbird|Use cases|perch
use-case-product-demos|Record a product demo video on your Mac|Use case|camera
use-case-dev-demos|Record a coding demo, or let your agent record it|Use case|perch
guides|Step by step, with the caveats|Guides|perch
guide-internal-audio|Record your Mac screen with internal audio|Guide|headphones
guide-captions|Add captions to a screen recording on Mac|Guide|headphones
guide-vertical-video|Turn a screen recording into a 9:16 video|Guide|camera
guide-webcam-overlay|Record your screen with a webcam overlay|Guide|camera
guide-r2-links|Self-host Loom-style links on Cloudflare R2|Guide|link
faq|Questions, answered|FAQ|perch
pricing|The recorder is free. Pro hosts your links.|Pricing|link
privacy|No account needed, no telemetry|Privacy|sleeping
terms|Terms of service|Legal|perch
changelog|What changed in each release|Changelog|celebrating'

enc() { python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$1"; }
start=$(date +%s)
if [ $# -gt 0 ]; then
  PAGES="$(echo "$PAGES" | awk -F'|' -v want=" $* " 'index(want, " " $1 " ")')"
  [ -n "$PAGES" ] || { echo "og.sh: no such slug: $*" >&2; exit 64; }
fi
while IFS='|' read -r slug title section art; do
  "$RENDER" "$TEMPLATE" "$OUT/$slug.png" 1200 630 "title=$(enc "$title")&section=$(enc "$section")&art=$art" >/dev/null
  if command -v pngquant >/dev/null; then pngquant --quality 80-95 --strip --force --skip-if-larger --output "$OUT/$slug.png" "$OUT/$slug.png" || true; fi
  echo "og/$slug.png"
done <<< "$PAGES"
echo "Rendered $(echo "$PAGES" | wc -l | tr -d ' ') images in $(( $(date +%s) - start ))s"
