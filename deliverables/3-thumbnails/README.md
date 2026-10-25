# Thumbnail template

A producer fills in four fields for each episode: **the episode number, the title, the guest's name and the guest's photo**. A fifth line for the guest's role or organisation is optional. The rest of the design cannot be changed: the Blue sky, the horizon, the ground lines, the coin with its rings, the show name and the Tokeniser logo.

| File | Contents |
|---|---|
| [`../../maker/`](../../maker/) | The thumbnail maker. A free web page that needs no sign-up or installation. This is the easiest option. |
| [`template/off-paper-thumbnail-template.svg`](template/off-paper-thumbnail-template.svg) | The same layout as a layered SVG, for Figma, Penpot or Inkscape. All three are free. |
| [`template/off-paper-thumbnail-template-preview.png`](template/off-paper-thumbnail-template-preview.png) | A preview of the blank template. |
| [`examples/`](examples/) | Option A: three finished thumbnails, each at 1920 x 1080 and 1280 x 720, with its SVG. |
| [`examples/option-b-silhouette/`](examples/option-b-silhouette/) | Option B: the same three episodes with the silhouette in place of a photo. |
| [`examples/option-c-fictional/`](examples/option-c-fictional/) | Option C: three invented guests and titles, with the CC0 stock photos. |

## Using the maker (about two minutes, no design experience needed)

1. Open the maker from the "Make a thumbnail" link on the review page. To run it locally, serve this folder (for example with `npx serve .`) and go to `/maker/`.
2. Enter the **episode number**, using digits only.
3. Enter the **title** in sentence case. Around 40 characters is easiest to read on a phone. The type gets smaller until the title fits on three lines, but never smaller than 96 px. If it still does not fit, you are asked to shorten it.
4. Enter the **guest's name**. You can add their role and organisation on the line below.
5. Pick the **guest photo**. Any headshot works, but a PNG with a transparent background (a cut-out) gives the best result, and the maker recognises one automatically. Use the Size, Left and right, and Up and down sliders to frame the face.
6. Look at the **phone preview**, which shows the thumbnail at the size it appears in a feed, and at the **Checks** panel. "Ready to download" appears once all four fields are filled in and the title fits.
7. Click **Download PNG, 1920 x 1080**, or the 1280 x 720 button. Files are named after the episode, for example `off-paper-ep33-thumbnail.png`.

To start from a finished thumbnail instead, click one of the examples at the top of the maker (EP 21, EP 28, EP 29, or the fictional EP 1 to 3) and edit the fields.

## Editing the SVG in a free design tool

Each field is its own named layer in the SVG: `Episode number`, `Title`, `Guest name`, `Guest organisation` and `Guest photo`, with the picture itself in the image layer `guest-photo-image`. Layers whose names end in "(locked)" carry the identity, so leave them untouched.

**Figma (free plan).** Make a new design file and drop `off-paper-thumbnail-template.svg` onto the canvas. Figma already includes Montserrat. Double-click any text layer to edit it. To swap the photo, select `guest-photo-image`, open Fill in the right-hand panel, click the image swatch and pick your file. Export the frame as a PNG at 1x, which gives 1920 x 1080.

**Penpot (free and open source, runs in the browser).** Create a file, then import the SVG or drag it in. Edit the text layers, replace the picture in `guest-photo-image`, and export as PNG.

**Inkscape (free desktop app).** First install Montserrat from [`../../src/fonts/`](../../src/fonts/). Open the SVG and find each field in the Layers and Objects panel. Edit the text with the Text tool. To replace the photo, select `guest-photo-image` and use right-click > Replace image (or Edit > Paste). Export as a 1920 x 1080 PNG.

**Line breaks in the title.** In the SVG the title is a single text layer of up to three lines. When editing it in a design tool, break the lines by hand so that none reaches the coin, which is about 900 px from the left edge at the default size. The maker handles this automatically.

## What the template takes care of

- Title: Montserrat Bold in Light Mint, between 96 and 124 px, never more than three lines. At 96 px the title is 18 px tall when the thumbnail is shown 360 px wide on a phone.
- Guest name: Montserrat SemiBold in Mint, 40 to 52 px, on one line. The role line is Medium in Light Blue.
- Episode number: SemiBold capitals in Mint with wide letter spacing.
- Photo: sits in the coin on a Light Blue backdrop under a 30 percent Slate wash. The rim ring is at 70 percent opacity over flat colour, and the orbit drops to 60 percent where it passes over the photo.
- Show name: always "Off Paper - Powered by Tokeniser" in the one-line lockup, with the Tokeniser logo on the right.

## About the examples

As the brief requests, the examples reuse titles and guests from earlier Redbelly Insights episodes as placeholder content. Each title is taken from something said in its episode; the timestamps are in [`../../src/examples.json`](../../src/examples.json). The photos are CC0 stock portraits standing in for the guests' real headshots and do not show the people named (see [`../6-licences/LICENCES.md`](../6-licences/LICENCES.md)).

| Example | Placeholder guest | Where the title comes from |
|---|---|---|
| EP 21 | Jeremy Hastings, CEO & Founder, Hutly | Episode 21, 00:18 to 01:20: the host introduces Hutly's move into AI-powered property agents |
| EP 28 | Vincent Gramoli, Founder, Redbelly Network | Episode 28, 05:40 to 06:41: tokenised assets are of limited use without tokenised workflows |
| EP 29 | Effie Dimitropoulos, CEO, AUDD Stablecoin | Episode 29, 43:21 to 44:29: money held in US dollar stablecoins is money that is not kept onshore |

### Two alternative sets

Pairing a real guest's name with a stranger's photo can mislead if a thumbnail is shared on its own, so two other sets show the same template without that pairing.

- **Option B, [`examples/option-b-silhouette/`](examples/option-b-silhouette/).** The same three episodes, guests and titles, with the template's placeholder silhouette in the coin instead of a photo.
- **Option C, [`examples/option-c-fictional/`](examples/option-c-fictional/).** Invented guests, organisations and titles with the same three CC0 stock photos. Every organisation is an "Example" company, so nobody real is named. The content is in [`../../src/examples-fictional.json`](../../src/examples-fictional.json).

| Example | Invented guest | Title |
|---|---|---|
| EP 1 | Daniel Okafor, Head of Assets, Example Property Co | Why property is moving on chain |
| EP 2 | Marcus Hale, Founder, Example Ledger Labs | Settlement in seconds, not days |
| EP 3 | Amara Nwosu, CEO, Example Payments | Stablecoins for everyday payments |
