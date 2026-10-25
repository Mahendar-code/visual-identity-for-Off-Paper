# Off Paper - Powered by Tokeniser

Redbelly Insights is relaunching as **Off Paper - Powered by Tokeniser**. This repository holds the new show's look: an identity sheet, the cover art, an episode thumbnail template with three finished examples, and a 16-second opening with its own score. Only the Tokeniser colours, the Montserrat typeface and the logo files provided with the brief were used.

**The idea: the Lift.** Real-world assets are heavy. Land, buildings and funds sit on paper. Every piece of the show is built around a single horizon line. Below it lies the ground, the real world, drawn as ridgelines. Above it, rings rise off the line and turn towards you: these are the tokens. Straight rails run in towards the line: that is the chain. The cover, every thumbnail and the last frames of the opening use this same picture, so they read as one show.

The review page is `index.html`. Open it locally or on the deployed site to browse every deliverable.

## Deliverables

| # | Asked for | Delivered |
|---|---|---|
| 1 | A short identity sheet covering colour, type, logo use and graphic elements | [`deliverables/1-identity/off-paper-identity-sheet.pdf`](deliverables/1-identity/off-paper-identity-sheet.pdf): 3 pages with Montserrat embedded, plus a PNG of each page |
| 2 | Square cover art, 3000 x 3000 | [`deliverables/2-cover/`](deliverables/2-cover/): PNG and JPG at 3000 px, a 1400 px JPG and the editable SVG |
| 3 | An editable thumbnail template in a free tool | [`maker/`](maker/) runs in any browser with no sign-up. [`off-paper-thumbnail-template.svg`](deliverables/3-thumbnails/template/off-paper-thumbnail-template.svg) opens in Figma, Penpot or Inkscape. Instructions: [`deliverables/3-thumbnails/README.md`](deliverables/3-thumbnails/README.md) |
| 3 | Three finished 16:9 thumbnails, 1280 x 720 or larger | [`deliverables/3-thumbnails/examples/`](deliverables/3-thumbnails/examples/): each at 1920 x 1080 and 1280 x 720, with its SVG |
| 4 | The opening in 16:9 and 9:16, with sound | [`off-paper-opening-landscape.mp4`](deliverables/4-opening/off-paper-opening-landscape.mp4) at 1920 x 1080 and [`off-paper-opening-vertical.mp4`](deliverables/4-opening/off-paper-opening-vertical.mp4) at 1080 x 1920. Both run 16 s: H.264 High at 60 fps, AAC 48 kHz stereo, mastered to -16 LUFS. The score is also supplied as a WAV. |
| 5 | Project files | [`src/`](src/), [`maker/`](maker/) and [`tools/`](tools/). A guide to every file is in [`deliverables/5-project-files/README.md`](deliverables/5-project-files/README.md) |
| 6 | Licence proof | [`deliverables/6-licences/LICENCES.md`](deliverables/6-licences/LICENCES.md), the Montserrat OFL, and dated captures of each photo's licence in [`deliverables/6-licences/proof/`](deliverables/6-licences/proof/) |

Automated checks are listed, with what each one measured, in [`VERIFICATION.md`](VERIFICATION.md).

## The identity at a glance

- **Colour.** Slate is the ground and the base of every surface. Blue is the sky above the horizon. Mint is the signal colour, used for the name, the rings, the horizon and light. Light Mint carries titles, Teal draws the ground lines, and Light Blue is for rails, supporting text and the photo backdrop. Orange belongs to the palette but is kept out of the show art. Light and haze are always one palette colour laid over another at reduced opacity.
- **Type.** Montserrat in four weights. Bold sets the show name and titles, SemiBold sets guest names and labels, Medium sets "- Powered by Tokeniser" and guest roles, and Regular sets body copy.
- **Name.** Always "Off Paper - Powered by Tokeniser". In the main lockup "Off Paper" sits on the horizon rule, with "- Powered by Tokeniser" and the logo below it. The compact lockup puts the whole name on one line and the logo at the opposite edge. Every file reads the name from a single constant, `SHOW_NAME` in `src/brand.js`.
- **Logo.** The three PNGs from the brief, never altered and only scaled proportionally. Use the on-dark file on Slate, Blue and photos, the slate-green file on Light Mint and Light Blue, and the on-mint file for avatars. Keep clear space equal to the logo's height on every side.
- **Graphic devices.** Horizon, ground lines, rings and rails. They sit at 70 percent opacity over flat colour and 60 percent over photos. Guest photos sit inside a coin under a 30 percent Slate wash.

## The opening

| Time | Picture | Sound |
|---|---|---|
| 0.0 to 3.6 s | Dawn breaks along the horizon. Light spreads over a landscape of ridgelines and a sweep crosses the hills | A high tone and a breath of air; the sweep travels across the stereo field with the light |
| 3.6 to 7.5 s | The contours of the middle hill rise one after another, become clean rings and turn to face the camera. The land flattens into rails | A bell for each ring, climbing in pitch; a pulse begins at 6 s |
| 7.5 to 9.0 s | The rings line up along the rail, and further rings form in the distance | Plucks and ticks come in |
| 9.0 to 11.8 s | The camera travels down the rail through the rings while pulses of light run along the rails | A whoosh as the camera passes each ring, timed from the camera path; a riser |
| 11.8 to 12.0 s | The final ring turns edge-on into a single line | 60 ms of silence |
| 12.0 to 15.0 s | That line becomes the horizon. "Off Paper" rises from it, then "- Powered by Tokeniser" and the logo appear, and rings lift off the line as on the cover | An impact that resolves to B flat major |
| 15.0 to 16.0 s | Fade to solid Slate, held so the episode can cut in | Fades to digital silence at 15.75 s |

Nothing is spoken, and apart from the show name and the Tokeniser logo nothing is written on screen. The landscape and vertical cuts are rendered separately from the same 3D scene, each with its own camera framing and lockup size, instead of one being cropped from the other. Both finish on solid Slate.

## Deploying the site (Vercel)

Nothing needs to be built. The repository root (`index.html`, `maker/`, `src/`, `deliverables/`) is already a static site.

1. In Vercel, go to **Add New > Project** and import this repository.
2. Set the framework preset to **Other** and leave the build command and output directory blank, so the root is served as it is.
3. Deploy. The review page is served at `/` and the thumbnail maker at `/maker/`.

Netlify, Cloudflare Pages, GitHub Pages or `npx serve .` on your own machine work the same way.

## Rebuilding

You need Node 18+, Python 3.11+ with `numpy scipy pillow` (plus `faster-whisper` for the speech check), FFmpeg and poppler-utils.

```bash
./tools/build.sh
```

The script renders every deliverable from source, runs the browser tests on the thumbnail template and rewrites `VERIFICATION.md`. [`deliverables/5-project-files/README.md`](deliverables/5-project-files/README.md) explains what each file does.
