#!/usr/bin/env bash
# Rebuilds every deliverable from source, then tests and verifies it.
# Needs: Node 18+, Python 3.11+ (numpy, scipy, pillow; faster-whisper optional for the voice check),
# FFmpeg, poppler-utils (pdfinfo, pdffonts). About 10 minutes on 4 cores.
set -euo pipefail
cd "$(dirname "$0")/.."

(cd tools && npm ci --silent)
npx --prefix tools playwright install chromium >/dev/null 2>&1 || true

rm -rf build/frames-landscape build/frames-vertical
node tools/cues.mjs > /dev/null           # timing cues from src/opening/timeline.js
python3 tools/score.py                    # original score, mastered to -16 LUFS
node tools/render-opening.mjs landscape   # 1920 x 1080, 60 fps, with the score
node tools/render-opening.mjs vertical    # 1080 x 1920, 60 fps, with the score
node tools/render-stills.mjs              # cover, thumbnails (via the maker), SVG template
python3 tools/previews.py                 # small previews for the page and the identity sheet
node tools/render-identity.mjs            # identity sheet PDF and PNGs
node tools/test-template.mjs              # browser usability tests of the thumbnail template
python3 tools/verify.py                   # writes VERIFICATION.md and verification.json
