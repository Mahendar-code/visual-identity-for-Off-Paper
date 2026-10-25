// Episode thumbnail template. One function builds the whole 16:9 thumbnail as SVG from four slots
// (episode number, title, guest name, guest photo) plus an optional organisation line.
// The browser maker, the SVG template file and the example PNGs all come from this function.
import { C, RULE, W, FONT, CAP, measure, wrap, inlineNameSVG, svgLogo, groundLines, ringRibbon, pathD, esc, svgText } from './brand.js';

export const THUMB = {
  w: 1920, h: 1080,
  margin: 104,
  horizon: 818,
  rule: 6,
  textWidth: 900,
  titleMax: 124, titleMin: 96, titleStep: 4, titleLines: 3, titleLeading: 1.06,
  labelSize: 32,
  guestSize: 52, guestMin: 40, orgSize: 34,
  coin: { cx: 1440, cy: 476, r: 330 },
  footer: { base: 896, size: 38, logoH: 46 },
};

// Where the title, guest and organisation land for given text; also reports anything the maker should warn about.
export function layoutText({ episode, title, guest, org }) {
  const T = THUMB;
  const warnings = [];
  let size = T.titleMax, lines = null;
  for (; size >= T.titleMin; size -= T.titleStep) {
    lines = wrap(title, W.bold, size, T.textWidth, T.titleLines, -0.01);
    if (lines) break;
  }
  if (!lines) {
    size = T.titleMin;
    lines = wrap(title, W.bold, size, T.textWidth, 9, -0.01) || [title];
    warnings.push(`The title needs ${lines.length} lines even at the smallest size. Shorten it to fit 3 lines.`);
  }
  let gs = T.guestSize;
  while (gs > T.guestMin && measure(guest, W.semibold, gs) > T.textWidth) gs -= 2;
  if (measure(guest, W.semibold, gs) > T.textWidth) warnings.push('The guest name is too long for one line.');
  if (org && measure(org, W.medium, T.orgSize) > T.textWidth) warnings.push('The organisation line is too long for one line.');
  if (!/^\d{1,4}$/.test(String(episode).trim())) warnings.push('Use digits only for the episode number.');

  // Vertical rhythm: label, title, then the guest block; everything sits above the horizon.
  const labelBase = T.margin + T.labelSize * CAP;
  const lead = size * T.titleLeading;
  const firstBase = labelBase + 56 + size * CAP;
  const lastBase = firstBase + lead * (lines.length - 1);
  const guestBase = lastBase + size * 0.3 + 40 + gs * CAP;
  const orgBase = guestBase + T.orgSize * 1.45;
  const bottom = org ? orgBase + T.orgSize * 0.25 : guestBase + gs * 0.25;
  if (bottom > T.horizon - 40) warnings.push('The text runs into the horizon. Shorten the title.');
  return { size, lines, lead, labelBase, firstBase, guestSize: gs, guestBase, orgBase, bottom, warnings };
}

// photo: { href, w, h, cutout, zoom, top, dx, dy }
//  - cut-out PNG: the image is `zoom` coin-diameters tall and its top sits `top` diameters below the coin's top
//  - ordinary photo: it covers the coin, then `zoom` enlarges it and dx, dy move it (fractions of the diameter)
export function photoPlacement(photo, coin = THUMB.coin) {
  const { cx, cy, r } = coin;
  const d = 2 * r;
  const iw = photo.w, ih = photo.h;
  if (photo.cutout) {
    const H = (photo.zoom || 1.1) * d;
    const Wd = (H * iw) / ih;
    return { x: cx - Wd / 2 + (photo.dx || 0) * d, y: cy - r + (photo.top ?? 0.06) * d, w: Wd, h: H };
  }
  const s = Math.max(d / iw, d / ih) * (photo.zoom || 1);
  return { x: cx - (iw * s) / 2 + (photo.dx || 0) * d, y: cy - (ih * s) / 2 + (photo.dy || 0) * d, w: iw * s, h: ih * s };
}

export function thumbnailSVG(data, { logoHref, photo, fontCSS = '' } = {}) {
  const T = THUMB;
  const L = layoutText(data);
  const { cx, cy, r } = T.coin;
  const d = 2 * r;

  // Ground lines below the footer row (devices on solid colour, 70 percent).
  const gcam = { x: 0, y: 1.1, z: 0, f: 560, cx: 1300, horizon: T.horizon + 128 };
  const lines = groundLines({ cam: gcam, rows: 14, z0: 1.1, z1: 20, xSpan: 46, amp: 1.6, flatFar: 1, bottom: T.h + 10, seed: 23 });
  const ground = lines.map((l) => `<path d="${pathD(l.fill, true)}" fill="${C.slate}"/><path d="${pathD(l.pts)}" fill="none" stroke="${C.teal}" stroke-width="${(2.5 + 3 * (1 - l.u) ** 2).toFixed(1)}" stroke-linejoin="round"/>`).join('');

  // Two flat rings on the horizon under the coin: the coin has just lifted off them.
  const rcam = { x: 0, y: 1, z: 0, f: 1250, cx, horizon: T.horizon };
  const base = [
    { y: 1.0, z: 12.4, rr: 3.7, w: 6 },
    { y: 1.3, z: 12.0, rr: 3.6, w: 8 },
  ].map((q) => { const rb = ringRibbon(0, q.y, q.z, q.rr, rcam, q.w, 160, 0.05); return `<path d="${pathD(rb.outer, true)}${pathD(rb.inner, true)}" fill="${C.mint}" fill-rule="evenodd"/>`; }).join('');

  // The coin's rim sits just outside the photo, on solid colour.
  const rim = `<circle cx="${cx}" cy="${cy}" r="${r + 20}" fill="none" stroke="${C.mint}" stroke-width="7"/>`;
  // An orbit crosses the coin: its back half is on solid colour (70), its front half on the photo (60).
  // The orbit is drawn as two open arcs (no clip paths), so every SVG editor and renderer reads it the same.
  const oy = cy + r * 0.42;
  const orbitArc = (front) => {
    const pts = [];
    const rot = (-7 * Math.PI) / 180;
    for (let i = 0; i <= 90; i++) {
      const a = (front ? 0 : Math.PI) + (i / 90) * Math.PI;
      const ex = r * 1.34 * Math.cos(a), ey = r * 0.26 * Math.sin(a);
      pts.push([cx + ex * Math.cos(rot) - ey * Math.sin(rot), oy + ex * Math.sin(rot) + ey * Math.cos(rot)]);
    }
    return `<path d="${pathD(pts)}" fill="none" stroke="${C.mint}" stroke-width="6" stroke-linecap="round"/>`;
  };

  let img = '';
  if (photo && photo.href) {
    const pp = photoPlacement(photo);
    img = `<image id="guest-photo-image" href="${photo.href}" x="${pp.x.toFixed(1)}" y="${pp.y.toFixed(1)}" width="${pp.w.toFixed(1)}" height="${pp.h.toFixed(1)}" preserveAspectRatio="none"/>`;
  }

  const name = inlineNameSVG(T.margin, T.footer.base, T.footer.size);
  const logo = svgLogo('dark', 0, 0, T.footer.logoH, logoHref);
  const logoSVG = svgLogo('dark', T.w - T.margin - logo.width, T.footer.base - T.footer.size * CAP / 2 - T.footer.logoH * 0.55, T.footer.logoH, logoHref).svg;

  // a trailing space on every line but the last keeps the words apart when an editor joins the lines
  const titleSpans = L.lines.map((ln, i) => `<tspan x="${(T.margin - L.size * 0.035).toFixed(1)}" y="${(L.firstBase + i * L.lead).toFixed(1)}">${esc(ln)}${i < L.lines.length - 1 ? ' ' : ''}</tspan>`).join('');

  return {
    layout: L,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${T.w}" height="${T.h}" viewBox="0 0 ${T.w} ${T.h}">
<title>Off Paper - Powered by Tokeniser, episode ${esc(data.episode)} thumbnail</title>
<defs>
${fontCSS ? `<style>${fontCSS}</style>` : ''}
<radialGradient id="dawn" cx="${(cx / T.w).toFixed(3)}" cy="1" r="0.62"><stop offset="0" stop-color="${C.mint}" stop-opacity="0.2"/><stop offset="0.5" stop-color="${C.mint}" stop-opacity="0.05"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0"/></radialGradient>
<clipPath id="coin"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath>
</defs>
<g id="Background (locked)">
<rect width="${T.w}" height="${T.horizon}" fill="${C.blue}"/>
<rect width="${T.w}" height="${T.horizon}" fill="url(#dawn)"/>
<rect y="${T.horizon}" width="${T.w}" height="${T.h - T.horizon}" fill="${C.slate}"/>
</g>
<g id="Devices on colour, 70 percent (locked)" opacity="${RULE.deviceOnSolid}">${ground}${base}${rim}${orbitArc(false)}</g>
<g id="Guest photo" clip-path="url(#coin)">
<rect id="Photo backdrop" x="${cx - r}" y="${cy - r}" width="${d}" height="${d}" fill="${C.lightBlue}"/>
${img}
<rect id="Photo overlay, Slate 30 percent (locked)" x="${cx - r}" y="${cy - r}" width="${d}" height="${d}" fill="${C.slate}" opacity="${RULE.photoSlateOverlay}"/>
</g>
<g id="Devices on photo, 60 percent (locked)" opacity="${RULE.deviceOnPhoto}">${orbitArc(true)}</g>
<rect id="Horizon (locked)" x="0" y="${T.horizon}" width="${T.w}" height="${T.rule}" fill="${C.mint}"/>
<g id="Episode number">${svgText(`EPISODE ${String(data.episode).trim()}`, { x: T.margin, y: L.labelBase, size: T.labelSize, weight: W.semibold, fill: C.mint, tracking: 0.18 })}</g>
<g id="Title"><text font-family="${FONT}" font-weight="${W.bold}" font-size="${L.size}" letter-spacing="${(-0.01 * L.size).toFixed(1)}" fill="${C.lightMint}">${titleSpans}</text></g>
<g id="Guest name">${svgText(data.guest, { x: T.margin, y: L.guestBase, size: L.guestSize, weight: W.semibold, fill: C.mint })}</g>
<g id="Guest organisation">${data.org ? svgText(data.org, { x: T.margin, y: L.orgBase, size: T.orgSize, weight: W.medium, fill: C.lightBlue }) : ''}</g>
<g id="Show name and logo (locked)">${name.svg}${logoSVG}</g>
</svg>`,
  };
}
