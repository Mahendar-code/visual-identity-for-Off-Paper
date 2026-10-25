# Verification

77 of 77 checks passed, 0 failed, 0 skipped (2026-10-25 06:49 UTC). Skipped means the check could not be measured on this machine; it is not counted as a pass. Every check measures the delivered files; the commands that produce this report are in `tools/build.sh`.

| Area | Checks | Passed | Skipped |
|---|---|---|---|
| Deliverables and specs | 14 | 14 | 0 |
| Brand rules | 18 | 18 | 0 |
| Licences | 4 | 4 | 0 |
| Audio | 10 | 10 | 0 |
| Visual quality and motion | 11 | 11 | 0 |
| Template usability (browser tests) | 20 | 20 | 0 |

## Deliverables and specs

| ID | Check | Result | Measured |
|---|---|---|---|
| D01 | Identity sheet PDF exists (short, 3 pages) | pass | 3 pages, 1440 x 810 pts |
| D02 | Identity sheet as images (one per page and one combined) | pass | 1920x1080, 1920x1080, 1920x1080 |
| D03 | Cover art square, at least 1400 x 1400 (3000 x 3000 delivered), PNG | pass | 3000x3000 RGB |
| D04 | Cover art also as JPG, 3000 and 1400 | pass | (3000, 3000), (1400, 1400) |
| D05 | Cover art editable SVG parses | pass | 0 0 3000 3000 |
| D06 | Three finished thumbnails at 16:9, at least 1280 x 720 (1920 x 1080 delivered) | pass | {'ep21': (1920, 1080), 'ep28': (1920, 1080), 'ep29': (1920, 1080)} |
| D07 | Each thumbnail also at exactly 1280 x 720 | pass | {'ep21': (1280, 720), 'ep28': (1280, 720), 'ep29': (1280, 720)} |
| D08 | Editable SVG template: every slot is a named layer, file is valid XML | pass | Episode number, Title, Guest name, Guest organisation, Guest photo, guest-photo-image |
| D09 | Free browser thumbnail maker present | pass | maker/index.html (no account, no install) |
| D10 | Opening landscape: MP4, H.264, 1920 x 1080, 60 fps, 10 to 20 s, AAC 48 kHz stereo | pass | h264 High 1920x1080 60/1 yuv420p bt709, 16.00 s, aac 48000 Hz 2 ch, 16.0 MB |
| D11 | Opening vertical: MP4, H.264, 1080 x 1920, 60 fps, 10 to 20 s, AAC 48 kHz stereo | pass | h264 High 1080x1920 60/1 yuv420p bt709, 16.00 s, aac 48000 Hz 2 ch, 15.1 MB |
| D12 | Score delivered separately as WAV | pass | 48 kHz 24-bit stereo |
| D13 | Project files for every piece are in the repository | pass | 11 key files, full list in deliverables/5-project-files/README.md |
| D14 | Licence proof files present (font licence, licences file, dated proof for each photo) | pass | deliverables/6-licences/LICENCES.md, deliverables/6-licences/Montserrat-OFL.txt, deliverables/6-licences/proof/nappy-license.png, deliverables/6-licences/proof/photo-man-suit.png, deliverables/6-licences/proof/photo-man-glasses.png, deliverables/6-licences/proof/photo-woman-headshot.png |

## Brand rules

| ID | Check | Result | Measured |
|---|---|---|---|
| B01 | Every colour written in code, pages and SVGs is a Tokeniser colour | pass | 30 files scanned; no colour outside the 7 palette hex values |
| B02 | Cover pixels: palette colours or opacity blends of two palette colours | pass | 100.00 percent of pixels within 4 RGB units (99.9th percentile deviation 2.1) |
| B03 | Thumbnail pixels outside the photo: palette colours or two-colour blends | pass | ep21 100.00%, ep28 100.00%, ep29 100.00% |
| B04 | Identity sheet pages 1 and 2: palette colours or two-colour blends | pass | 99.96%, 100.00% (page 3 holds photos and is not audited) |
| B05 | Opening frames as rendered (20 sampled): every pixel is a mix of palette colours, nothing outside their gamut | pass | lowest frame 100.00% inside the gamut of the palette (layers of palette colours at opacity: sky, light, rings, vignette, grain); 81.4% are a blend of just two. After H.264 4:2:0 encoding, 98.3% on average (colour bleeding at sharp Mint edges) |
| B06 | Montserrat is the only typeface embedded in the identity PDF | pass | Montserrat-Bold, Montserrat-Medium, Montserrat-Regular, Montserrat-SemiBold |
| B07 | Every font-family used to draw the show is Montserrat | pass | Montserrat |
| B08 | Bundled font files are Montserrat (SIL OFL 1.1, from Google Fonts) | pass | Montserrat-Bold.ttf, Montserrat-ExtraBold.ttf, Montserrat-Medium.ttf, Montserrat-Regular.ttf, Montserrat-SemiBold.ttf |
| B09 | Logo files are byte-identical to the supplied files (SHA-256) | pass | tokeniser-logo-on-dark 6952027cc97a, tokeniser-logo-slate-green-icon 56d05ff1ba1e, tokeniser-logo-on-mint 483ed1e207e5 |
| B10 | Logo files still match a fresh download from the brief links | pass | https://taskboard.redbellydao.network/brand/tokeniser/ |
| B11 | Logo never stretched: placed width/height equals the artwork ratio in every SVG | pass | 5 placements, worst 0.012% off |
| B12 | Logo as rendered on the cover matches the supplied artwork pixel for pixel (not recoloured) | pass | PSNR 35.9 dB against the supplied PNG scaled to 943x156 |
| B13 | Opening draws no text except the show name (logo is the supplied image) | pass | NAME_TOP, NAME_TOP, NAME_TOP, NAME_SUB |
| B14 | Device and photo opacity rules: 70 on colour, 60 on photos, 30 percent Slate photo overlay | pass | src/brand.js RULE, template layers, cover layers, opening layers |
| B15 | The show name is never written another way, anywhere in the repository | pass | 42 text files scanned; the name comes from one constant |
| B16 | Video and SVG titles carry the exact show name | pass | MP4 title tags, SVG <title> elements |
| B17 | No hype language in any visible text (rockets, moons, price talk) | pass | none found |
| B18 | No personal credit anywhere: no names, handles, signatures or made-by lines, in files or metadata | pass | text, MP4 tags, PDF author and PNG metadata all clean |

## Licences

| ID | Check | Result | Measured |
|---|---|---|---|
| L01 | Each stand-in photo: file hash matches the record, and its dated page capture shows the public domain (CC0) mark | pass | man-suit: 5ChqIJeC... sha 1a2e853da5 ok; man-glasses: MAa023BN... sha ef8a367c62 ok; woman-headshot: oQPjaaRQ... sha a42aa629e5 ok |
| L02 | Captured Nappy licence page states CC0 and commercial use | pass | Retrieved: 2026-10-22T20:14:47.990Z |
| L03 | Licences file covers fonts, logos, music, photos and tools, and lists every photo source | pass | deliverables/6-licences/LICENCES.md |
| L04 | Score is generated in code: no audio files are read, only cues | pass | tools/score.py synthesises every sound from sine waves and seeded noise |

## Audio

| ID | Check | Result | Measured |
|---|---|---|---|
| A01 | Loudness of the score WAV: -16 LUFS integrated (podcast target), true peak at or below -1 dBTP | pass | -15.6 LUFS, true peak -2.9 dBTP, LRA 6.9 LU |
| A02 | Loudness of the landscape MP4: -16 LUFS integrated (podcast target), true peak at or below -1 dBTP | pass | -15.7 LUFS, true peak -2.8 dBTP, LRA 6.9 LU |
| A03 | Loudness of the vertical MP4: -16 LUFS integrated (podcast target), true peak at or below -1 dBTP | pass | -15.7 LUFS, true peak -2.8 dBTP, LRA 6.9 LU |
| A04 | No clipping: sample peak below 0 dBFS | pass | sample peak -2.95 dBFS |
| A05 | Ends in digital silence for a clean cut | pass | last 0.2 s peak 0.0 |
| A06 | Audio and picture are the same length | pass | 16.000 s audio, 16.000 s video |
| A07 | The impact lands on the picture: silence just before 12.00 s, the hit right at it | pass | -240.0 dBFS in the gap, -13.6 dBFS in the first 60 ms after 12.00 s |
| A08 | A sound starts on every ring lift and every ring pass (a clear onset within 40 ms of each picture cue) | pass | 14 cues; weakest onset 2.2x the median spectral flux, median 3.3x |
| A09 | No voice: a speech detector (Silero VAD) finds no speech in the score | pass | 0 speech segments, 0.00 s in total |
| A10 | Balanced and mono-safe: no octave more than 10 dB above 1 kHz, stereo correlation positive | pass | 63 Hz +5.3 dB, 250 Hz +0.3 dB, 1000 Hz +0.0 dB, 4000 Hz -2.9 dB, 12000 Hz -11.8 dB; L/R correlation 0.69 |

## Visual quality and motion

| ID | Check | Result | Measured |
|---|---|---|---|
| V01 | Smooth motion, landscape: 960 frames at a constant 60 fps, no repeated or dropped frames while things move | pass | 960 frames; 0 repeats in 3.6 to 12.4 s; largest frame-to-frame change 1.63x its neighbours (median change 2.20) |
| V03 | Landscape ends on solid Slate, ready for a straight cut | pass | mean RGB [50.0, 54.0, 62.0] vs Slate [52, 55, 64], spread 0.02 |
| V05 | Clean encode and sharp text, landscape: H.264 output against the rendered frames | pass | mean PSNR 37.1 dB over 5 frames; 36.2 dB on the band holding the show name at 14.2 s |
| V07 | Landscape is laid out for its own frame: the name is centred with clear margins | pass | left margin 29.9%, right margin 29.9% of the width |
| V02 | Smooth motion, vertical: 960 frames at a constant 60 fps, no repeated or dropped frames while things move | pass | 960 frames; 0 repeats in 3.6 to 12.4 s; largest frame-to-frame change 1.92x its neighbours (median change 2.10) |
| V04 | Vertical ends on solid Slate, ready for a straight cut | pass | mean RGB [50.0, 54.0, 62.0] vs Slate [52, 55, 64], spread 0.02 |
| V06 | Clean encode and sharp text, vertical: H.264 output against the rendered frames | pass | mean PSNR 37.7 dB over 5 frames; 35.7 dB on the band holding the show name at 14.2 s |
| V08 | Vertical is laid out for its own frame: the name is centred with clear margins | pass | left margin 16.7%, right margin 16.8% of the width |
| V09 | Cover reads small: "Off Paper" cap height at podcast-app sizes, Mint on Blue contrast | pass | 36 px cap height at 300 px, 6.7 px at 55 px; Mint on Blue 8.9:1 (WCAG AAA) |
| V10 | Thumbnail titles read on a phone: smallest title size in a 360 px feed, Light Mint on Blue contrast | pass | 18.0 px; Light Mint on Blue 9.6:1 (WCAG AAA) |
| V11 | The SVG template renders the same outside the browser (resvg vs the maker PNG) | pass | PSNR 37.2 dB |

## Template usability (browser tests)

| ID | Check | Result | Measured |
|---|---|---|---|
| U01 | Maker loads with no errors | pass | ready in 181 ms |
| U02 | Every input has a label | pass | all labelled |
| U03 | Uploaded JPG is placed in the coin and treated as a photo | pass | cutout=false |
| U04 | Photo framing sliders appear after upload | pass |  |
| U05 | A well-formed episode shows no warnings and the ready message | pass | ready |
| U06 | Typed title appears in the preview | pass | What tokenised funds change for investors |
| U07 | Left/right slider moves the photo | pass | x 945.0 -> 1077.0 |
| U08 | Download PNG gives a 1920 x 1080 PNG named after the episode | pass | off-paper-ep33-thumbnail.png 1920x1080 |
| U09 | Download 1280 gives a 1280 x 720 PNG | pass | off-paper-ep33-thumbnail-1280.png 1280x720 |
| U10 | Downloaded SVG keeps every slot as a named, editable layer | pass | Episode number, Title, Guest name, Guest organisation, Guest photo |
| U11 | Downloaded SVG is self-contained (photo and logo embedded) | pass | all href are data: URIs |
| U12 | Time from opening the maker to a finished PNG | pass | 1.8 s for 4 fields, 1 upload, 1 click (automated) |
| U13 | The SVG renders outside the browser (resvg, Montserrat only) | pass | 1920x1080; compared with the maker PNG in verify.py |
| U14 | A transparent PNG is detected as a cut-out | pass |  |
| U15 | Titles of every length: at least 96 px, 3 lines or a warning | pass | 11ch:124px/1l 28ch:124px/3l 31ch:124px/3l 32ch:124px/3l 45ch:96px/3l 60ch:96px/5l/warn 106ch:96px/8l/warn |
| U16 | Titles up to 45 characters fit without any warning | pass |  |
| U17 | An over-long title is caught with a warning | pass | 106 characters |
| U18 | Smallest title on a 360 px wide phone thumbnail is at least 18 px | pass | 18.0 px |
| U19 | A long guest name shrinks to fit; an impossible one warns | pass | shrunk to 42 px |
| U20 | A non-numeric episode number is flagged | pass |  |

## What the checks cannot prove

- Taste. Automated checks show the files follow the brief; whether the opening feels right is for a person to judge. Stills from every second of both formats are in `src/previews/` and on the review page.
- The thumbnail template was exercised with Chromium and resvg. It was not imported into Figma or Penpot by these scripts; the SVG uses only plain shapes, paths, images and text so that those tools read it.
- The example photos are CC0 stock portraits standing in for the guests; they do not show the people named. Each real episode needs a headshot cleared by its guest.
