// Off Paper - Powered by Tokeniser: the identity in code.
// The one source of truth. The cover, the thumbnail template, the identity sheet and the
// opening import their name, colours, type, logo handling and geometry from here.

export const SHOW_NAME = 'Off Paper - Powered by Tokeniser';
export const NAME_TOP = 'Off Paper';
export const NAME_SUB = '- Powered by Tokeniser';
if (`${NAME_TOP} ${NAME_SUB}` !== SHOW_NAME) throw new Error('show name parts do not join to the show name');

// The seven Tokeniser colours. Apart from guest photos and the logo files, every pixel is built from these.
export const C = {
  slate: '#343740',      // primary: base of every surface ("ground")
  mint: '#A2FFC8',       // primary: show name, rings, horizon, light
  lightMint: '#DAFDE5',  // primary: titles and primary text
  lightBlue: '#C9DBF1',  // secondary: supporting text, rails
  blue: '#323B70',       // secondary: sky field above the horizon
  teal: '#009C9C',       // secondary: ground lines
  orange: '#FF9A81',     // secondary: left out of show art; on a finance show it would read as a warning
};

// Opacity rules from the Tokeniser brand guide: devices over flat colour, devices over a photo, Slate wash on photos.
export const RULE = { deviceOnSolid: 0.7, deviceOnPhoto: 0.6, photoSlateOverlay: 0.3 };

export const FONT = 'Montserrat';
export const W = { regular: 400, medium: 500, semibold: 600, bold: 700 };

// Supplied logo files. Crop boxes only trim the transparent padding; the artwork is
// never redrawn, recoloured or stretched (width and height always scale together).
const here = (p) => new URL(p, import.meta.url).href;
export const LOGO = {
  dark: { file: 'tokeniser-logo-on-dark.png', size: [4167, 1459], crop: [454, 460, 3259, 539] },
  light: { file: 'tokeniser-logo-slate-green-icon.png', size: [4167, 800], crop: [400, 78, 3495, 580] },
  mint: { file: 'tokeniser-logo-on-mint.png', size: [4167, 4167], crop: [0, 0, 4167, 4167] },
};
export const logoUrl = (kind) => here(`./logos/${LOGO[kind].file}`);
export const logoAspect = (kind) => LOGO[kind].crop[2] / LOGO[kind].crop[3];

// ---------- fonts and measuring ----------

const FONT_FILES = { 400: 'Regular', 500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold' };
export const fontUrl = (w) => here(`./fonts/Montserrat-${FONT_FILES[w]}.ttf`);

export async function loadFonts(doc = document) {
  const faces = Object.keys(FONT_FILES).map((w) => new FontFace(FONT, `url(${fontUrl(w)})`, { weight: String(w) }));
  await Promise.all(faces.map((f) => f.load()));
  faces.forEach((f) => doc.fonts.add(f));
  await doc.fonts.ready;
}

export function fontFaceCSS() {
  return Object.entries(FONT_FILES)
    .map(([w]) => `@font-face{font-family:${FONT};font-weight:${w};src:url(${fontUrl(w)}) format('truetype');}`)
    .join('\n');
}

let mctx;
export function measure(text, weight, size, tracking = 0) {
  if (!mctx) mctx = (typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(8, 8) : document.createElement('canvas')).getContext('2d');
  mctx.font = `${weight} ${size}px ${FONT}`;
  const m = mctx.measureText(text);
  return m.width + tracking * size * Math.max(0, [...text].length - 1);
}

// Montserrat metrics (units per em 1000): cap height 700, x-height 517.
export const CAP = 0.7;

// Sets a title in at most maxLines lines, filling each line before starting the next.
// Gives back the lines, or null if one word is wider than the box or more lines are needed.
export function wrap(text, weight, size, maxWidth, maxLines, tracking = 0) {
  const fits = (s) => measure(s, weight, size, tracking) <= maxWidth;
  const out = [];
  for (const word of text.trim().split(/\s+/)) {
    const last = out.length - 1;
    if (last >= 0 && fits(`${out[last]} ${word}`)) out[last] += ` ${word}`;
    else if (fits(word)) out.push(word);
    else return null;
  }
  return out.length <= maxLines ? out : null;
}

// ---------- maths ----------

export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = {
  inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  out: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  outExpo: (t) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  in: (t) => t * t * t,
  inQuad: (t) => t * t,
  inExpo: (t) => (t <= 0 ? 0 : Math.pow(2, 10 * t - 10)),
};

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seeded 2D value noise with smooth interpolation, and a few octaves of it.
export function noise2(seed) {
  const r = rng(seed);
  const N = 256;
  const perm = Array.from({ length: N }, (_, i) => i);
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  const val = Array.from({ length: N }, () => r() * 2 - 1);
  const h = (x, y) => val[perm[(perm[x & 255] + y) & 255]];
  const sm = (t) => t * t * (3 - 2 * t);
  const n = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    const u = sm(xf), v = sm(yf);
    return lerp(lerp(a, b, u), lerp(c, d, u), v);
  };
  return (x, y, oct = 4) => {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) { s += amp * n(x * f, y * f); amp *= 0.5; f *= 2.03; }
    return s;
  };
}

// ---------- graphic devices (geometry shared by SVG stills and the canvas opening) ----------

// The ground: a terrain seen from a low camera, drawn as ridgelines.
// `flat` (0..1) straightens every line into a rail; `flatFar` straightens only the far rows,
// so the land turns into rails as it reaches the horizon.
export function terrain(seed = 7) {
  const nz = noise2(seed);
  const hills = [
    { x: 0, z: 9, r: 3.2, h: 1.25 },
    { x: -6.5, z: 13, r: 4.0, h: 0.9 },
    { x: 7.5, z: 11, r: 3.6, h: 0.8 },
    { x: 3.5, z: 20, r: 6.0, h: 1.4 },
    { x: -10, z: 24, r: 7.0, h: 1.6 },
  ];
  return (x, z) => {
    let y = 0;
    for (const k of hills) {
      const d2 = ((x - k.x) ** 2 + (z - k.z) ** 2) / (k.r * k.r);
      y += k.h * Math.exp(-d2);
    }
    return y + 0.55 * nz(x * 0.35, z * 0.35, 4) + 0.12 * nz(x * 1.7 + 40, z * 1.7, 2);
  };
}

// Project a world point for a level camera at height camH looking down +z.
export function project(x, y, z, cam) {
  const zc = z - cam.z;
  if (zc <= 0.05) return null;
  const s = cam.f / zc;
  return [cam.cx + (x - cam.x) * s, cam.horizon - (y - cam.y) * s, s];
}

// Ridgelines in screen space, far to near, each with a fill polygon for hidden-line removal.
export function groundLines({ cam, rows = 40, z0 = 2.2, z1 = 40, xSpan = 26, step = 0.12, amp = 1, flat = 0, flatFar = 0, seed = 7, bottom }) {
  const hf = terrain(seed);
  const out = [];
  for (let i = rows - 1; i >= 0; i--) {
    const u = i / (rows - 1);
    const z = z0 * Math.pow(z1 / z0, u); // even spacing in perspective
    const k = amp * (1 - flat) * (1 - flatFar * ease.inOut(u));
    const pts = [];
    for (let x = -xSpan; x <= xSpan + 1e-9; x += step * (z / z0) ** 0.5) {
      const p = project(x, hf(x, z) * k, z, cam);
      // a 0.02 px alternation keeps fully flattened rows from having a zero-height bounding box,
      // which some SVG renderers (resvg) cannot handle; it is invisible
      if (p) pts.push([p[0], p[1] + (pts.length % 2 ? 0.02 : 0)]);
    }
    out.push({ u, z, pts, fill: [...pts, [pts[pts.length - 1][0], bottom], [pts[0][0], bottom]] });
  }
  return out;
}

// A horizontal ring (a token) of radius r at height y, centred at (x, z), as a screen-space polyline.
export function ringPoints(x, y, z, r, cam, n = 96, tilt = 0) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
    const p = project(x + dx, y + dz * Math.sin(tilt), z + dz * Math.cos(tilt), cam);
    if (p) pts.push([p[0], p[1]]);
  }
  return pts;
}

// A ring drawn as a ribbon whose weight swells smoothly towards the viewer (near edge heavier,
// far edge lighter), like the rim of a coin. Returns two closed outlines; fill them with evenodd.
export function ringRibbon(x, y, z, r, cam, weight, n = 180, tilt = 0, swell = 0.55) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const dx = Math.cos(a) * r, dz = Math.sin(a) * r;
    const p = project(x + dx, y + dz * Math.sin(tilt), z + dz * Math.cos(tilt), cam);
    if (!p) return null;
    pts.push({ p, w: weight * (1 + swell - swell * 2 * (0.5 + 0.5 * Math.sin(a))) });
  }
  const outer = [], inner = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n].p, b = pts[(i + 1) % n].p, c = pts[i].p;
    let nx = b[1] - a[1], ny = -(b[0] - a[0]);
    const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const h = pts[i].w / 2;
    outer.push([c[0] + nx * h, c[1] + ny * h]);
    inner.push([c[0] - nx * h, c[1] - ny * h]);
  }
  return { outer, inner };
}

// ---------- SVG helpers ----------

const f1 = (v) => Math.round(v * 10) / 10;
export const pathD = (pts, close = false) => pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('') + (close ? 'Z' : '');
export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function svgText(str, { x, y, size, weight, fill, anchor = 'start', tracking = 0, id, extra = '' }) {
  const ls = tracking ? ` letter-spacing="${f1(tracking * size)}"` : '';
  const idA = id ? ` id="${id}"` : '';
  return `<text${idA} x="${f1(x)}" y="${f1(y)}" font-family="${FONT}" font-weight="${weight}" font-size="${f1(size)}" fill="${fill}" text-anchor="${anchor}"${ls}${extra}>${esc(str)}</text>`;
}

// The logo as a nested <svg> whose viewBox trims the transparent padding: uniform scale only.
export function svgLogo(kind, x, y, height, href = logoUrl(kind), id = 'tokeniser-logo') {
  const L = LOGO[kind];
  const [sx, sy, sw, sh] = L.crop;
  const w = (height * sw) / sh;
  return {
    width: w,
    svg: `<svg id="${id}" x="${f1(x)}" y="${f1(y)}" width="${f1(w)}" height="${f1(height)}" viewBox="${sx} ${sy} ${sw} ${sh}" preserveAspectRatio="xMidYMid meet" overflow="hidden"><image href="${href}" x="0" y="0" width="${L.size[0]}" height="${L.size[1]}"/></svg>`,
  };
}

// ---------- the show-name lockup ----------
// "Off Paper" sits on the horizon rule; "- Powered by Tokeniser" and the Tokeniser logo sit under it.
// Geometry is computed once here and used by SVG stills and the canvas opening alike.
export function lockupGeometry(size, { subScale = 0.24, logoScale = 0.3, gapScale = 0.5 } = {}) {
  const topW = measure(NAME_TOP, W.bold, size, -0.01);
  const sub = size * subScale;
  const subW = measure(NAME_SUB, W.medium, sub);
  const logoH = size * logoScale;
  const logoW = logoH * logoAspect('dark');
  const rowW = subW + size * gapScale + logoW;
  const width = Math.max(topW, rowW);
  const ruleY = size * 0.24;                 // below the baseline of "Off Paper"
  const rule = Math.max(2, size * 0.022);    // rule thickness
  const subBase = ruleY + rule + sub * 1.55; // baseline of the sub line
  const logoY = subBase - sub * CAP - (logoH - sub * CAP) * 0.62; // logo optically centred on the sub line caps
  return { size, topW, sub, subW, logoH, logoW, width, ruleY, rule, subBase, logoY, height: subBase + sub * 0.3, ascent: size * CAP };
}

// Compact one-line lockup for small spaces: "Off Paper - Powered by Tokeniser" as one text run
// (two weights), used where the stacked lockup would be too small to read.
export function inlineNameSVG(x, baseline, size, { top = C.mint, sub = C.lightMint, id = 'show-name' } = {}) {
  const wTop = measure(`${NAME_TOP} `, W.bold, size);
  const width = wTop + measure(NAME_SUB, W.medium, size);
  return {
    width,
    svg: `<text id="${id}" x="${f1(x)}" y="${f1(baseline)}" font-family="${FONT}" font-size="${f1(size)}"><tspan font-weight="${W.bold}" fill="${top}">${esc(NAME_TOP)} </tspan><tspan font-weight="${W.medium}" fill="${sub}">${esc(NAME_SUB)}</tspan></text>`,
  };
}

export function lockupSVG(x, baseline, size, { anchor = 'start', topFill = C.mint, subFill = C.lightMint, rule = C.mint, logoKind = 'dark', logoHref, opts } = {}) {
  const g = lockupGeometry(size, opts);
  const x0 = anchor === 'middle' ? x - g.width / 2 : anchor === 'end' ? x - g.width : x;
  const logo = svgLogo(logoKind, x0 + g.width - g.logoW, baseline + g.logoY, g.logoH, logoHref);
  const svg = [
    `<g id="show-name" aria-label="${SHOW_NAME}">`,
    svgText(NAME_TOP, { x: x0 - size * 0.04, y: baseline, size, weight: W.bold, fill: topFill, tracking: -0.01 }),
    `<rect x="${f1(x0)}" y="${f1(baseline + g.ruleY)}" width="${f1(g.width)}" height="${f1(g.rule)}" fill="${rule}"/>`,
    svgText(NAME_SUB, { x: x0, y: baseline + g.subBase, size: g.sub, weight: W.medium, fill: subFill }),
    `</g>`,
    logo.svg,
  ].join('');
  return { svg, ...g, x0 };
}
