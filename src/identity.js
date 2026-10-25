// Drawings for the identity sheet, built from the same geometry as every other piece of the show.
import { C, RULE, groundLines, ringRibbon, project, pathD, lockupSVG, inlineNameSVG, svgLogo, LOGO, logoUrl } from './brand.js';

const svg = (w, h, body, extra = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" ${extra}>${body}</svg>`;
const ribbonPath = (rb, fill = C.mint) => `<path d="${pathD(rb.outer, true)}${pathD(rb.inner, true)}" fill="${fill}" fill-rule="evenodd"/>`;

export function tileHorizon(w = 360, h = 230) {
  const hy = h * 0.6;
  return svg(w, h, `<rect width="${w}" height="${hy}" fill="${C.blue}"/><rect y="${hy}" width="${w}" height="${h - hy}" fill="${C.slate}"/><rect y="${hy}" width="${w}" height="4" fill="${C.mint}"/>`);
}

export function tileGround(w = 360, h = 230) {
  const cam = { x: 0, y: 1.2, z: 0, f: 260, cx: w / 2, horizon: h * 0.22 };
  const lines = groundLines({ cam, rows: 15, z0: 1.2, z1: 22, xSpan: 30, amp: 1.5, flatFar: 0.6, bottom: h + 4, seed: 11 });
  const g = lines.map((l) => `<path d="${pathD(l.fill, true)}" fill="${C.slate}"/><path d="${pathD(l.pts)}" fill="none" stroke="${C.teal}" stroke-width="${(1.4 + 2.2 * (1 - l.u) ** 2).toFixed(1)}"/>`).join('');
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.slate}"/><g opacity="${RULE.deviceOnSolid}">${g}</g>`);
}

export function tileRings(w = 360, h = 230) {
  const hy = h * 0.82;
  const cam = { x: 0, y: 1, z: 0, f: 300, cx: w / 2, horizon: hy };
  const rs = [[1.0, 0, 9.5], [1.9, 0.35, 9.2], [3.2, 0.8, 8.9], [4.8, 1.3, 8.6]].map(([y, tilt, z], i) => ribbonPath(ringRibbon(0, y, z, 2.6, cam, 3 + 2 * i, 160, tilt)));
  return svg(w, h, `<rect width="${w}" height="${hy}" fill="${C.blue}"/><rect y="${hy}" width="${w}" height="${h - hy}" fill="${C.slate}"/><g opacity="${RULE.deviceOnSolid}">${rs.join('')}</g><rect y="${hy}" width="${w}" height="3" fill="${C.mint}"/>`);
}

export function tileRails(w = 360, h = 230) {
  const hy = h * 0.3;
  const cam = { x: 0, y: 1.4, z: 0, f: 260, cx: w / 2, horizon: hy };
  let g = '';
  for (let z = 1.5; z < 40; z *= 1.22) {
    const a = project(-30, 0, z, cam), b = project(30, 0, z, cam);
    g += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${C.teal}" stroke-width="1.6"/>`;
  }
  for (const x of [-4.8, -3.2, -1.6, 1.6, 3.2, 4.8]) {
    const a = project(x, 0, 1.0, cam), b = project(x, 0, 200, cam);
    g += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${C.lightBlue}" stroke-width="2"/>`;
  }
  return svg(w, h, `<rect width="${w}" height="${hy}" fill="${C.blue}"/><rect y="${hy}" width="${w}" height="${h - hy}" fill="${C.slate}"/><g opacity="${RULE.deviceOnSolid}">${g}</g>`);
}

export function tileLight(w = 360, h = 230) {
  const hy = h * 0.62;
  return svg(w, h, `<defs><radialGradient id="lt" cx="0.5" cy="1" r="0.8"><stop offset="0" stop-color="${C.mint}" stop-opacity="0.35"/><stop offset="0.5" stop-color="${C.mint}" stop-opacity="0.08"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0"/></radialGradient>
<linearGradient id="ln" x1="0" x2="1"><stop offset="0" stop-color="${C.mint}" stop-opacity="0"/><stop offset="0.5" stop-color="${C.mint}"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0"/></linearGradient></defs>
<rect width="${w}" height="${hy}" fill="${C.blue}"/><rect width="${w}" height="${hy}" fill="url(#lt)"/><rect y="${hy}" width="${w}" height="${h - hy}" fill="${C.slate}"/><rect x="20" y="${hy - 1.5}" width="${w - 40}" height="3" fill="url(#ln)"/>
<circle cx="${w * 0.3}" cy="${hy * 0.45}" r="2" fill="${C.lightMint}" opacity="0.5"/><circle cx="${w * 0.72}" cy="${hy * 0.3}" r="1.6" fill="${C.lightMint}" opacity="0.4"/><circle cx="${w * 0.58}" cy="${hy * 0.62}" r="2.4" fill="${C.lightMint}" opacity="0.45"/>`);
}

// Photo treatment: the supplied photo, then the same photo set in the coin.
export function coinDemo(href, iw, ih, w = 300) {
  const r = w * 0.4, cx = w / 2, cy = w / 2;
  const H = 1.12 * 2 * r, Wd = (H * iw) / ih;
  return svg(w, w, `<defs><clipPath id="cd"><circle cx="${cx}" cy="${cy}" r="${r}"/></clipPath><clipPath id="cdf"><rect x="0" y="${cy + r * 0.42}" width="${w}" height="${w}"/></clipPath><clipPath id="cdb"><rect x="0" y="0" width="${w}" height="${cy + r * 0.42}"/></clipPath></defs>
<rect width="${w}" height="${w}" fill="${C.blue}"/>
<g opacity="${RULE.deviceOnSolid}"><circle cx="${cx}" cy="${cy}" r="${r + 9}" fill="none" stroke="${C.mint}" stroke-width="3.5"/><g clip-path="url(#cdb)"><ellipse cx="${cx}" cy="${cy + r * 0.42}" rx="${r * 1.32}" ry="${r * 0.26}" fill="none" stroke="${C.mint}" stroke-width="3" transform="rotate(-7 ${cx} ${cy + r * 0.42})"/></g></g>
<g clip-path="url(#cd)"><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="${C.lightBlue}"/><image href="${href}" x="${cx - Wd / 2}" y="${cy - r + 0.07 * 2 * r}" width="${Wd}" height="${H}"/><rect x="${cx - r}" y="${cy - r}" width="${2 * r}" height="${2 * r}" fill="${C.slate}" opacity="${RULE.photoSlateOverlay}"/></g>
<g opacity="${RULE.deviceOnPhoto}" clip-path="url(#cdf)"><ellipse cx="${cx}" cy="${cy + r * 0.42}" rx="${r * 1.32}" ry="${r * 0.26}" fill="none" stroke="${C.mint}" stroke-width="3" transform="rotate(-7 ${cx} ${cy + r * 0.42})"/></g>`);
}

export function primaryLockup(w = 820, h = 330) {
  const size = 132, hy = h * 0.52;
  const L = lockupSVG(w / 2, hy - size * 0.24, size, { anchor: 'middle' });
  return svg(w, h, `<rect width="${w}" height="${hy}" fill="${C.blue}"/><rect y="${hy}" width="${w}" height="${h - hy}" fill="${C.slate}"/><rect y="${hy}" width="${w}" height="${L.rule}" fill="${C.mint}" opacity="${RULE.deviceOnSolid}"/>${L.svg}`);
}

export function compactLockup(w = 820, h = 100) {
  const n = inlineNameSVG(32, h / 2 + 10, 29);
  const lg = svgLogo('dark', 0, 0, 34);
  const logo = svgLogo('dark', w - 32 - lg.width, h / 2 - 19, 34);
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.slate}"/>${n.svg}${logo.svg}`);
}

// The logo with its clear space (one logo height on every side) marked in Light Blue.
export function clearSpace(w = 420, h = 200) {
  const lh = 46, lg = svgLogo('dark', 0, 0, lh);
  const x = (w - lg.width) / 2, y = (h - lh) / 2;
  const box = `<rect x="${x - lh}" y="${y - lh}" width="${lg.width + 2 * lh}" height="${3 * lh}" fill="none" stroke="${C.lightBlue}" stroke-width="1.5" stroke-dasharray="6 5"/>`;
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${C.slate}"/>${box}${svgLogo('dark', x, y, lh).svg}
<rect x="${x - lh}" y="${y}" width="${lh}" height="${lh}" fill="${C.lightBlue}" opacity="0.1"/><rect x="${x + lg.width}" y="${y}" width="${lh}" height="${lh}" fill="${C.lightBlue}" opacity="0.1"/><rect x="${x}" y="${y - lh}" width="${lh}" height="${lh}" fill="${C.lightBlue}" opacity="0.1"/>`);
}

export function logoOn(kind, bg, w = 260, h = 120) {
  if (kind === 'mint') return svg(h, h, svgLogo('mint', 0, 0, h).svg);
  const lh = h * 0.28, lg = svgLogo(kind, 0, 0, lh);
  return svg(w, h, `<rect width="${w}" height="${h}" fill="${bg}"/>${svgLogo(kind, (w - lg.width) / 2, (h - lh) / 2, lh).svg}`);
}

// WCAG 2 contrast ratio between two hex colours.
export function contrast(a, b) {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
export { C, LOGO, logoUrl };
