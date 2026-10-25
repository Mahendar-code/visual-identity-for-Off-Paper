// Cover art: the ground, the horizon and a column of rings lifting off it.
// Returns one SVG document; the same file is the editable project file and the source of the PNG.
import { C, RULE, groundLines, ringRibbon, pathD, lockupSVG, lockupGeometry } from './brand.js';

// Six tokens lifting off the horizon: the lowest lies flat on the line (the land), each one above
// has turned a little further, and the top one faces the viewer (the token).
export function coverRings() {
  const ys = [1.0, 1.9, 3.3, 5.2, 7.7, 10.8];
  return ys.map((y, i) => {
    const u = i / (ys.length - 1);
    return { y, z: 11.5 - 2.2 * u, r: 3.5 + 0.5 * u, tilt: (Math.PI / 2) * 0.9 * Math.pow(u, 1.2), w: 11 + 15 * u };
  });
}

export function coverSVG({ size = 3000, logoHref } = {}) {
  const S = size, k = S / 3000;
  const nameSize = 520 * k;
  const g = lockupGeometry(nameSize);
  const horizon = 1900 * k;              // the horizon is also the lockup rule
  const baseline = horizon - g.ruleY;

  // A level camera at eye height 1 on the ground; rings above eye level open into ellipses
  // seen from below, so the column reads as tokens lifting off the horizon.
  const cam = { x: 0, y: 1, z: 0, f: 1150 * k, cx: S / 2, horizon };
  // Each ring is a ribbon that is heavier on its near edge, like the rim of a coin.
  const ringSVG = coverRings()
    .map((q) => {
      const rb = ringRibbon(0, q.y, q.z, q.r, cam, q.w * k, 240, q.tilt);
      return `<path d="${pathD(rb.outer, true)}${pathD(rb.inner, true)}" fill="${C.mint}" fill-rule="evenodd"/>`;
    })
    .join('');

  // Ground lines under the lockup row: hills near the viewer, flattening into rails far away.
  const gcam = { x: 0, y: 1.25, z: 0, f: 950 * k, cx: S / 2, horizon: horizon + 360 * k };
  const lines = groundLines({ cam: gcam, rows: 30, z0: 1.15, z1: 30, xSpan: 34, amp: 1.5, flatFar: 1, bottom: S + 10, seed: 11 });
  const groundSVG = lines
    .map((l) => `<path d="${pathD(l.fill, true)}" fill="${C.slate}"/><path d="${pathD(l.pts)}" fill="none" stroke="${C.teal}" stroke-width="${((2.5 + 6 * (1 - l.u) ** 2) * k).toFixed(1)}" stroke-linejoin="round"/>`)
    .join('');

  const lock = lockupSVG(S / 2, baseline, nameSize, { anchor: 'middle', logoHref });
  // Knock the name out of the rings with a Blue stroke behind the letters, so it stays crisp at any size.
  const knock = lock.svg.replace(/<text([^>]*)>Off Paper<\/text>/, `<text$1 stroke="${C.blue}" stroke-width="${(26 * k).toFixed(1)}" stroke-linejoin="round" paint-order="stroke">Off Paper</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<title>Off Paper - Powered by Tokeniser, cover art</title>
<defs>
<radialGradient id="dawn" cx="0.5" cy="1" r="0.75"><stop offset="0" stop-color="${C.mint}" stop-opacity="0.22"/><stop offset="0.45" stop-color="${C.mint}" stop-opacity="0.06"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0"/></radialGradient>
</defs>
<rect id="sky" width="${S}" height="${horizon.toFixed(1)}" fill="${C.blue}"/>
<rect id="light" width="${S}" height="${horizon.toFixed(1)}" fill="url(#dawn)"/>
<rect id="ground" y="${horizon.toFixed(1)}" width="${S}" height="${(S - horizon).toFixed(1)}" fill="${C.slate}"/>
<g id="device-rings" opacity="${RULE.deviceOnSolid}">${ringSVG}</g>
<g id="device-ground" opacity="${RULE.deviceOnSolid}">${groundSVG}</g>
<rect id="horizon" x="0" y="${(baseline + g.ruleY).toFixed(1)}" width="${S}" height="${g.rule.toFixed(1)}" fill="${C.mint}"/>
${knock}
</svg>`;
}
