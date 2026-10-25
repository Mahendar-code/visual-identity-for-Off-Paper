# Project files

Every visual and sound in the submission is produced by the code in this repository. There are no hidden design files: the code is the project file, and the SVG outputs open in any vector editor.

| Piece | Source | Editable output |
|---|---|---|
| Identity: palette, type, logo handling, show name, graphic devices | [`src/brand.js`](../../src/brand.js) | |
| Identity sheet | [`src/identity.html`](../../src/identity.html), [`src/identity.js`](../../src/identity.js) | [`1-identity/`](../1-identity/) PDF and PNGs |
| Cover art | [`src/cover.js`](../../src/cover.js), [`src/cover.html`](../../src/cover.html) | [`2-cover/off-paper-cover.svg`](../2-cover/off-paper-cover.svg) |
| Thumbnail template | [`src/thumbnail.js`](../../src/thumbnail.js), [`maker/`](../../maker/), [`src/examples.json`](../../src/examples.json), [`src/examples-fictional.json`](../../src/examples-fictional.json) | [`3-thumbnails/template/off-paper-thumbnail-template.svg`](../3-thumbnails/template/off-paper-thumbnail-template.svg), example SVGs |
| Opening sequence, picture | [`src/opening/timeline.js`](../../src/opening/timeline.js) (choreography), [`src/opening/scene.js`](../../src/opening/scene.js) (renderer), [`src/opening/stage.html`](../../src/opening/stage.html) | Open `/src/opening/stage.html?format=landscape&t=10.2` in a browser to see any moment |
| Opening sequence, sound | [`tools/score.py`](../../tools/score.py) (reads the cues written by [`tools/cues.mjs`](../../tools/cues.mjs)) | [`4-opening/off-paper-opening-score.wav`](../4-opening/off-paper-opening-score.wav) |
| Stand-in photos | [`src/photos/`](../../src/photos/) with [`photos.json`](../../src/photos/photos.json) (sources and hashes), cut-outs by [`tools/cutout.py`](../../tools/cutout.py) | |
| Fonts and logos | [`src/fonts/`](../../src/fonts/) (Montserrat, OFL), [`src/logos/`](../../src/logos/) (supplied files, unaltered) | |
| Renderers | [`tools/render-opening.mjs`](../../tools/render-opening.mjs), [`tools/render-stills.mjs`](../../tools/render-stills.mjs), [`tools/render-identity.mjs`](../../tools/render-identity.mjs), [`tools/previews.py`](../../tools/previews.py) | |
| Tests and checks | [`tools/test-template.mjs`](../../tools/test-template.mjs), [`tools/verify.py`](../../tools/verify.py), [`tools/licence-proof.mjs`](../../tools/licence-proof.mjs) | [`VERIFICATION.md`](../../VERIFICATION.md) |
| One command for everything | [`tools/build.sh`](../../tools/build.sh) | |

## Rebuild everything

You will need Node 18+, Python 3.11+ with `numpy scipy pillow` (`faster-whisper` is used by the speech check), FFmpeg, and poppler-utils, which provides `pdfinfo` and `pdffonts`.

```bash
pip install numpy scipy pillow faster-whisper
./tools/build.sh
```

It installs the Node tools, synthesises the score, renders both openings frame by frame (960 frames each at 60 fps, with motion blur), renders the cover and the thumbnails through the maker, builds the identity sheet, runs the template usability tests and writes `VERIFICATION.md`. About ten minutes on four cores.

## Change something

- **A colour, font weight or the name:** edit `src/brand.js`; everything follows.
- **The opening's timing:** edit the act times in `src/opening/timeline.js`. The score reads the same cues, so sound stays on picture after `node tools/cues.mjs && python3 tools/score.py`.
- **A thumbnail example:** edit `src/examples.json`, then `node tools/render-stills.mjs`.
