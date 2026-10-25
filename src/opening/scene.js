// Opening sequence renderer. draw(t) paints one moment; frame(t) adds motion blur by averaging
// sub-frames across a 180 degree shutter. Every colour is a Tokeniser colour, alone or at an opacity
// over another; graphic devices composite at 70 percent; text and logo at full strength.
import { C, RULE, W, FONT, CAP, LOGO, logoUrl, NAME_TOP, NAME_SUB, lockupGeometry, noise2, rng, clamp, lerp, seg, ease } from '../brand.js';
import { ACT, HILL, TUNNEL, COLUMN_RINGS, camera, relief, hillScale, ring, tunnelRing, markRing, passTimes } from './timeline.js';

export const FORMATS = {
  landscape: { w: 1920, h: 1080, f: 1040, nameSize: 150, band: 150, groundRows: 1, mark: { colScale: 0.43, rScale: 0.56, tiltScale: 0.84, endPitch: 0.185 } },
  vertical: { w: 1080, h: 1920, f: 1000, nameSize: 140, band: 150, groundRows: 1.15, mark: { colScale: 0.78, rScale: 0.62, tiltScale: 0.95, endPitch: 0.1 } },
};

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const rgba = (h, a) => { const [r, g, b] = hex(h); return `rgba(${r},${g},${b},${a})`; };
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export async function createScene(canvas, format = 'landscape') {
  const F = FORMATS[format];
  canvas.width = F.w; canvas.height = F.h;
  const out = canvas.getContext('2d');
  const mk = () => { const c = document.createElement('canvas'); c.width = F.w; c.height = F.h; return c; };
  const frameC = mk(), groundC = mk(), ringC = mk();
  const glowC = document.createElement('canvas'); glowC.width = Math.round(F.w / 4); glowC.height = Math.round(F.h / 4);
  const glx = glowC.getContext('2d');
  const fx = frameC.getContext('2d'), gx = groundC.getContext('2d'), rx = ringC.getContext('2d');
  const timing = {};
  const tick = (k, t0) => { timing[k] = (timing[k] || 0) + performance.now() - t0; };

  const logo = new Image();
  logo.src = logoUrl('dark');
  await logo.decode();

  // Film grain: two seeded noise tiles, one Light Mint and one Slate.
  const grain = [C.lightMint, C.slate].map((col, gi) => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d'); const im = g.createImageData(256, 256); const r = rng(91 + gi); const [cr, cg, cb] = hex(col);
    for (let i = 0; i < im.data.length; i += 4) { im.data[i] = cr; im.data[i + 1] = cg; im.data[i + 2] = cb; im.data[i + 3] = Math.floor(r() * 255); }
    g.putImageData(im, 0, 0); return c;
  });

  const nz = noise2(5);
  const wob = noise2(17);
  const passes = passTimes();
  const L = lockupGeometry(F.nameSize);

  // The land: gentle noise and two side ranges, plus the central hill whose contours become the rings.
  const land = (x, z) => 0.62 * nz(x * 0.3, z * 0.3, 4) + 1.1 * Math.exp(-((x + 8) ** 2 + (z - 19) ** 2) / 30) + 0.9 * Math.exp(-((x - 9) ** 2 + (z - 15) ** 2) / 22);
  const hill = (x, z) => HILL.h * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / (2 * HILL.sigma ** 2));
  const height = (x, z, t) => relief(t) * land(x, z) + hillScale(t) * hill(x, z) * (t < 7 ? 1 : 0);

  let cam;
  function setCam(t) {
    const c = camera(t, F.mark.endPitch);
    const pitchFmt = format === 'vertical' ? 0.012 : 0;
    cam = { ...c, pitch: c.pitch + pitchFmt, f: F.f, cx: F.w / 2, cy: F.h / 2, cp: Math.cos(c.pitch + pitchFmt), sp: Math.sin(c.pitch + pitchFmt), cr: Math.cos(c.roll), sr: Math.sin(c.roll) };
  }
  function P(X, Y, Z) {
    const dx = X - cam.x, dy = Y - cam.y, dz = Z - cam.z;
    const y2 = dy * cam.cp - dz * cam.sp, z2 = dy * cam.sp + dz * cam.cp;
    if (z2 < 0.06) return null;
    const s = cam.f / z2;
    const sx = dx * s, sy = -y2 * s;
    return [cam.cx + sx * cam.cr - sy * cam.sr, cam.cy + sx * cam.sr + sy * cam.cr, s, z2];
  }
  const horizonY = () => cam.cy + cam.f * Math.tan(cam.pitch);

  // ---------- ground ----------
  function drawGround(t) {
    gx.clearRect(0, 0, F.w, F.h);
    const R = relief(t);
    const dz = 0.9 / F.groundRows;
    const z0 = cam.z + 0.5, z1 = cam.z + 62;
    const reveal = lerp(64, -1, ease.out(seg(t, 0.25, 2.6)));      // light reaches from the horizon towards us
    const hy = horizonY();
    const sweepOn = t > 1.2 && t < 4.2;
    const sx = lerp(-0.35 * F.w, 1.35 * F.w, ease.inOut(seg(t, 1.4, 3.8)));
    let stroke = C.teal;
    if (sweepOn) {
      const gr = gx.createLinearGradient(sx - 0.3 * F.w, 0, sx + 0.3 * F.w, 0);
      gr.addColorStop(0, C.teal); gr.addColorStop(0.5, C.mint); gr.addColorStop(1, C.teal);
      stroke = gr;
    }
    const markFog = smooth(11.9, 12.5, t);
    const rows = [];
    for (let i = Math.ceil(z1 / dz); i >= Math.floor(z0 / dz); i--) {
      const z = i * dz;
      const d = z - cam.z;
      if (d < 0.5) continue;
      let a = smooth(-1, 2.5, d - reveal) * (1 - smooth(30, 60, d)) * smooth(0.5, 1.6, d);
      if (a <= 0.003) continue;
      rows.push({ z, d, a });
    }
    for (const row of rows) {
      const { z, d } = row;
      let a = row.a;
      const step = Math.max(0.24, 0.034 * d);
      const top = [], bot = [];
      for (let x = -34; x <= 34; x += step) {
        const p = P(x, height(x, z, t), z);
        const q = P(x, -40, z);
        if (!p || !q) continue;
        top.push(p); bot.push(q);
      }
      if (top.length < 2) continue;
      // under the name, keep a clear band below the horizon for the sub line and logo
      if (markFog > 0) { const yRow = top[Math.floor(top.length / 2)][1]; a *= 1 - markFog * (1 - smooth(hy + F.band * 1.05, hy + F.band * 1.6, yRow)); }
      if (a <= 0.003) continue;
      gx.globalAlpha = 1;
      gx.beginPath();
      top.forEach((p, i) => (i ? gx.lineTo(p[0], p[1]) : gx.moveTo(p[0], p[1])));
      for (let i = bot.length - 1; i >= 0; i--) gx.lineTo(bot[i][0], bot[i][1]);
      gx.closePath();
      gx.fillStyle = C.slate; gx.fill();
      gx.beginPath();
      top.forEach((p, i) => (i ? gx.lineTo(p[0], p[1]) : gx.moveTo(p[0], p[1])));
      gx.globalAlpha = a;
      gx.strokeStyle = stroke;
      gx.lineWidth = clamp(0.035 * (cam.f / d), 1.2, 7);
      gx.lineJoin = 'round';
      gx.stroke();
    }
    // rails: straight lines running to the horizon, the land made into a ledger
    const railA = smooth(5.6, 7.6, t) * (1 - smooth(12.0, 12.8, t));
    if (railA > 0) {
      gx.strokeStyle = C.lightBlue;
      for (const xr of [-6.4, -4.8, -3.2, -1.6, 1.6, 3.2, 4.8, 6.4]) {
        let prev = null;
        for (let zz = cam.z + 0.6; zz < cam.z + 70; zz += Math.max(0.3, (zz - cam.z) * 0.06)) {
          const p = P(xr, height(xr, zz, t) + 0.01, zz);
          if (p && prev) {
            const dd = zz - cam.z;
            gx.globalAlpha = railA * (1 - smooth(25, 65, dd));
            gx.lineWidth = clamp(0.045 * p[2], 1.2, 6);
            gx.beginPath(); gx.moveTo(prev[0], prev[1]); gx.lineTo(p[0], p[1]); gx.stroke();
          }
          prev = p;
        }
      }
    }
    gx.globalAlpha = 1;
  }

  function nameLayout(t) {
    const hy = horizonY();
    const S = F.nameSize;
    const e1 = ease.outQuint(seg(t, 12.25, 13.0));
    const baseline = hy - L.ruleY;
    return { hy, S, e1, x0: F.w / 2 - L.width / 2, baseline, y: baseline + (1 - e1) * S * 1.05 };
  }

  // ---------- rings ----------
  function ribbon(st, t) {
    const n = 140;
    const pts = [];
    const base = P(st.x, st.y, st.z);
    if (!base) return null;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ca = Math.cos(a), sa = Math.sin(a);
      const R = st.r * (1 + st.wobble * 0.24 * wob(ca * 1.4 + st.k * 3.1, sa * 1.4 + st.k * 1.7, 3));
      const p = P(st.x + ca * R, st.y + sa * R * Math.sin(st.tilt), st.z + sa * R * Math.cos(st.tilt));
      if (!p) return null;
      pts.push(p);
    }
    const zc = base[3];
    const ww = 0.075;
    const outer = [], inner = [];
    for (let i = 0; i < n; i++) {
      const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n], c = pts[i];
      let nx = b[1] - a[1], ny = -(b[0] - a[0]);
      const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      const swell = 1 + 0.55 * clamp((zc - c[3]) / st.r, -1, 1);
      const h = Math.max(0.8, ww * c[2] * swell) / 2;
      outer.push([c[0] + nx * h, c[1] + ny * h]);
      inner.push([c[0] - nx * h, c[1] - ny * h]);
    }
    return { outer, inner, depth: zc, screen: base, pts };
  }

  let lastDrawn = [];
  // A glint of light runs round each ring (light, drawn at full strength over the devices).
  function drawGlints(ctx, t) {
    const on = smooth(4.4, 5.4, t) * (1 - smooth(11.6, 11.9, t)) + smooth(13.2, 13.8, t) * (1 - smooth(14.8, 15.1, t));
    if (on <= 0) return;
    ctx.save();
    ctx.strokeStyle = C.lightMint;
    ctx.lineCap = 'round';
    for (const { rb, a, k } of lastDrawn) {
      const n = rb.pts.length;
      const i0 = Math.floor(((t * 0.42 + k * 0.17) % 1) * n);
      ctx.globalAlpha = on * a * 0.9;
      ctx.lineWidth = clamp(0.05 * rb.pts[i0][2], 1.5, 6);
      ctx.beginPath();
      for (let j = 0; j < Math.round(n * 0.07); j++) { const p = rb.pts[(i0 + j) % n]; j ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawRings(t) {
    rx.clearRect(0, 0, F.w, F.h);
    const states = [];
    if (t < ACT.mark[0] + 0.05) {
      for (let k = 0; k < COLUMN_RINGS; k++) states.push(ring(k, t));
      for (let k = COLUMN_RINGS; k < TUNNEL.count; k++) states.push(tunnelRing(k, t));
      // the last rail ring is also the one that flips into the horizon
      if (t > ACT.flip[0] - 0.4) { const last = states[TUNNEL.count - 1]; Object.assign(last, tunnelRing(TUNNEL.count - 1, t)); }
    }
    if (t >= ACT.mark[0]) for (let k = 0; k < COLUMN_RINGS; k++) states.push(markRing(k, t, F.mark));
    const drawn = [];
    for (const st of states) {
      if (st.alpha <= 0.002) continue;
      const rb = ribbon(st, t);
      if (!rb) continue;
      // fade a ring out just before the camera passes through it
      const pass = smooth(0.35, 1.5, rb.depth);
      drawn.push({ rb, a: st.alpha * pass, k: st.k });
    }
    drawn.sort((p, q) => q.rb.depth - p.rb.depth);
    for (const { rb, a } of drawn) {
      rx.globalAlpha = a;
      rx.beginPath();
      rb.outer.forEach((p, i) => (i ? rx.lineTo(p[0], p[1]) : rx.moveTo(p[0], p[1])));
      rx.closePath();
      rb.inner.forEach((p, i) => (i ? rx.lineTo(p[0], p[1]) : rx.moveTo(p[0], p[1])));
      rx.closePath();
      rx.fillStyle = C.mint;
      rx.fill('evenodd');
    }
    rx.globalAlpha = 1;
    lastDrawn = drawn;
    // cut the name out of the rings so it stays crisp where they pass behind it
    const nl = nameLayout(t);
    if (nl.e1 > 0) {
      rx.save();
      rx.beginPath(); rx.rect(0, 0, F.w, nl.hy - Math.max(L.rule, 4) / 2); rx.clip();
      rx.globalCompositeOperation = 'destination-out';
      rx.font = `${W.bold} ${nl.S}px ${FONT}`;
      rx.letterSpacing = `${(-0.01 * nl.S).toFixed(2)}px`;
      rx.lineJoin = 'round'; rx.lineWidth = nl.S * 0.12; rx.strokeStyle = C.slate; rx.fillStyle = C.slate;
      rx.strokeText(NAME_TOP, nl.x0 - nl.S * 0.04, nl.y);
      rx.fillText(NAME_TOP, nl.x0 - nl.S * 0.04, nl.y);
      rx.restore();
    }
    // where the last ring lies flat it is a line exactly on the horizon: report its width for the rule
    const last = drawn.length && t > ACT.flip[0] ? tunnelRing(TUNNEL.count - 1, t) : null;
    if (last) {
      const a = P(last.x - last.r, last.y, last.z), b = P(last.x + last.r, last.y, last.z);
      return a && b ? Math.abs(b[0] - a[0]) : 0;
    }
    return 0;
  }

  // ---------- light ----------
  function drawPulses(ctx, t) {
    const on = smooth(6.6, 7.4, t) * (1 - smooth(11.7, 12.0, t));
    if (on <= 0) return;
    const r = rng(7);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.shadowColor = rgba(C.mint, 0.9);
    ctx.shadowBlur = 18;
    for (const xr of [-6.4, -4.8, -3.2, -1.6, 1.6, 3.2, 4.8, 6.4]) {
      for (let j = 0; j < 3; j++) {
        const speed = 16 + 10 * r(), phase = r() * 40;
        const zp = ((t * speed + phase) % 46) + cam.z - 2;
        const p = P(xr, height(xr, zp, t) + 0.02, zp), q = P(xr, height(xr, zp + 1.6, t) + 0.02, zp + 1.6);
        if (!p || !q) continue;
        const d = zp - cam.z;
        ctx.globalAlpha = on * (1 - smooth(20, 44, d)) * smooth(0.8, 2, d);
        ctx.strokeStyle = C.mint;
        ctx.lineWidth = clamp(0.07 * p[2], 1.5, 9);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Light motes drifting in the air: texture and depth, and a sense of speed on the run.
  const moteR = rng(33);
  const motes = Array.from({ length: 170 }, () => ({ x: (moteR() * 2 - 1) * 22, y: 0.3 + moteR() * 9, z: moteR() * 70, s: 0.6 + moteR() * 1.2 }));
  function drawMotes(ctx, t) {
    const on = smooth(0.8, 2.5, t) * (1 - smooth(14.6, 15.2, t));
    if (on <= 0) return;
    ctx.fillStyle = C.lightMint;
    for (const m of motes) {
      let z = m.z + 0.35 * t;
      z = cam.z + ((((z - cam.z) % 70) + 70) % 70);
      const p = P(m.x + 0.2 * Math.sin(t * 0.5 + m.z), m.y + 0.15 * Math.sin(t * 0.7 + m.x), z);
      if (!p) continue;
      const d = p[3];
      const a = on * 0.45 * smooth(0.6, 3, d) * (1 - smooth(25, 60, d));
      if (a < 0.01) continue;
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.arc(p[0], p[1], clamp(0.016 * p[2] * m.s, 0.6, 5), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function glow(ctx, x, y, r, a) {
    if (a <= 0) return;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(C.mint, a)); g.addColorStop(0.4, rgba(C.mint, a * 0.3)); g.addColorStop(1, rgba(C.mint, 0));
    ctx.fillStyle = g; ctx.fillRect(0, 0, F.w, F.h);
  }

  // ---------- the name ----------
  function drawName(ctx, t, ruleW) {
    const hy = horizonY();
    const S = F.nameSize;
    const rule = Math.max(L.rule, 4);
    const ruleTop = hy;
    // the horizon rule: grows out of the flattened ring to the full width
    if (t >= ACT.mark[0] - 0.001) {
      const e = ease.outQuint(seg(t, ACT.mark[0], ACT.mark[0] + 0.5));
      const w = lerp(Math.max(ruleW, 8), F.w, e);
      ctx.fillStyle = C.mint;
      ctx.fillRect(F.w / 2 - w / 2, ruleTop - rule / 2, w, rule);
      // a pulse of light runs along the horizon during the hold
      const pe = seg(t, 13.9, 14.9);
      if (pe > 0 && pe < 1) {
        const px = lerp(-0.1 * F.w, 1.1 * F.w, ease.inOut(pe));
        const g = ctx.createLinearGradient(px - 160, 0, px + 160, 0);
        g.addColorStop(0, rgba(C.lightMint, 0)); g.addColorStop(0.5, rgba(C.lightMint, 0.95)); g.addColorStop(1, rgba(C.lightMint, 0));
        ctx.fillStyle = g; ctx.fillRect(px - 160, ruleTop - rule / 2, 320, rule);
      }
    }
    const nl = nameLayout(t);
    const { x0, baseline, e1 } = nl;
    // "Off Paper" rises out of the rule
    if (e1 > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, 0, F.w, ruleTop - rule / 2); ctx.clip();
      ctx.font = `${W.bold} ${S}px ${FONT}`;
      ctx.letterSpacing = `${(-0.01 * S).toFixed(2)}px`;
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = C.mint;
      ctx.fillText(NAME_TOP, x0 - S * 0.04, nl.y);
      ctx.restore();
    }
    // "- Powered by Tokeniser" drops out of the rule
    const e2 = ease.outQuint(seg(t, 12.6, 13.3));
    if (e2 > 0) {
      ctx.save();
      ctx.beginPath(); ctx.rect(0, ruleTop + rule / 2, F.w, F.h); ctx.clip();
      ctx.font = `${W.medium} ${L.sub}px ${FONT}`;
      ctx.letterSpacing = '0px';
      ctx.fillStyle = C.lightMint;
      ctx.fillText(NAME_SUB, x0, baseline + L.subBase - (1 - e2) * L.sub * 2.4);
      ctx.restore();
    }
    // the logo, as supplied: uniform scale only, fades in
    const e3 = ease.out(seg(t, 12.75, 13.45));
    if (e3 > 0) {
      const [sx, sy, sw, sh] = LOGO.dark.crop;
      ctx.save();
      ctx.globalAlpha = e3;
      ctx.drawImage(logo, sx, sy, sw, sh, x0 + L.width - L.logoW, baseline + L.logoY + (1 - e3) * L.logoH * 0.5, L.logoW, L.logoH);
      ctx.restore();
    }
  }

  // ---------- one moment ----------
  function draw(ctx, t) {
    setCam(t);
    const hy = horizonY();
    // ground and sky: the sky brightens from Slate to Blue at dawn
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.slate; ctx.fillRect(0, 0, F.w, F.h);
    const dawn = ease.inOut(seg(t, 0.2, 3.2));
    ctx.save();
    ctx.translate(F.w / 2, hy); ctx.rotate(cam.roll); ctx.translate(-F.w / 2, -hy);
    ctx.globalAlpha = dawn;
    ctx.fillStyle = C.blue; ctx.fillRect(-F.w, hy - 4 * F.h, 3 * F.w, 4 * F.h);
    // haze: the sky colour bleeds a little way into the far ground so the horizon is soft
    ctx.globalAlpha = 1;
    const hz = ctx.createLinearGradient(0, hy, 0, hy + F.h * 0.1);
    hz.addColorStop(0, rgba(C.blue, 0.8 * dawn)); hz.addColorStop(1, rgba(C.blue, 0));
    ctx.fillStyle = hz; ctx.fillRect(-F.w, hy, 3 * F.w, F.h * 0.1);
    ctx.restore();
    ctx.globalAlpha = 1;
    // light at the horizon: dawn, the lift, the impact
    const impact = Math.exp(-Math.max(0, t - ACT.mark[0]) / 0.35) * (t >= ACT.mark[0] ? 1 : 0);
    glow(ctx, F.w / 2, hy, F.w * 0.75, 0.12 * dawn + 0.12 * smooth(0.1, 1.2, t) * (1 - smooth(2.5, 4, t)) + 0.08 * smooth(3.6, 5, t) * (1 - smooth(7.5, 9, t)) + 0.1 * smooth(12, 13, t) + 0.35 * impact);

    let tg = performance.now();
    drawGround(t);
    tick('ground', tg);
    ctx.globalAlpha = RULE.deviceOnSolid;
    ctx.drawImage(groundC, 0, 0);
    ctx.globalAlpha = 1;
    // first light: a line of dawn opening along the horizon
    const dl = seg(t, 0.1, 1.7), dlA = 1 - smooth(2.0, 3.4, t);
    if (dl > 0 && dlA > 0) {
      const w = F.w * ease.outExpo(dl);
      const g = ctx.createLinearGradient(F.w / 2 - w / 2, 0, F.w / 2 + w / 2, 0);
      g.addColorStop(0, rgba(C.mint, 0)); g.addColorStop(0.5, rgba(C.mint, 0.95 * dlA)); g.addColorStop(1, rgba(C.mint, 0));
      ctx.fillStyle = g; ctx.fillRect(F.w / 2 - w / 2, hy - 1.5, w, 3);
    }

    drawPulses(ctx, t);
    drawMotes(ctx, t);

    let t0 = performance.now();
    const ruleW = drawRings(t);
    tick('rings', t0); t0 = performance.now();
    // the rings' glow (light): a blurred quarter-size copy under the rings themselves
    glx.clearRect(0, 0, glowC.width, glowC.height);
    glx.filter = 'blur(5px)';
    glx.drawImage(ringC, 0, 0, glowC.width, glowC.height);
    glx.filter = 'none';
    ctx.globalAlpha = 0.9;
    ctx.drawImage(glowC, 0, 0, F.w, F.h);
    ctx.globalAlpha = RULE.deviceOnSolid;
    ctx.drawImage(ringC, 0, 0);
    ctx.globalAlpha = 1;
    drawGlints(ctx, t);
    tick('ringComposite', t0);

    // a breath of light as the camera passes through each ring
    let flash = 0;
    for (const pt of passes) flash += Math.exp(-(((t - pt) / 0.05) ** 2));
    if (flash > 0.01) { ctx.globalAlpha = 0.09 * Math.min(1, flash); ctx.fillStyle = C.mint; ctx.fillRect(0, 0, F.w, F.h); ctx.globalAlpha = 1; }

    drawName(ctx, t, ruleW);

    // vignette and grain
    const vg = ctx.createRadialGradient(F.w / 2, F.h / 2, Math.min(F.w, F.h) * 0.35, F.w / 2, F.h / 2, Math.hypot(F.w, F.h) * 0.62);
    vg.addColorStop(0, rgba(C.slate, 0)); vg.addColorStop(1, rgba(C.slate, 0.55));
    ctx.fillStyle = vg; ctx.fillRect(0, 0, F.w, F.h);
    const fade = ease.inOut(seg(t, ACT.fade[0], ACT.fade[1]));
    const gr = rng(Math.floor(t * 20) + 3);
    for (let gi = 0; gi < 2; gi++) {
      ctx.globalAlpha = (gi ? 0.028 : 0.016) * (1 - fade);
      const ox = Math.floor(gr() * 256), oy = Math.floor(gr() * 256);
      ctx.fillStyle = ctx.createPattern(grain[gi], 'repeat');
      ctx.save(); ctx.translate(-ox, -oy); ctx.fillRect(ox, oy, F.w, F.h); ctx.restore();
    }
    ctx.globalAlpha = 1;
    if (fade > 0) { ctx.globalAlpha = fade; ctx.fillStyle = C.slate; ctx.fillRect(0, 0, F.w, F.h); ctx.globalAlpha = 1; }
    if (t >= ACT.fade[1]) { ctx.fillStyle = C.slate; ctx.fillRect(0, 0, F.w, F.h); }
  }

  // Motion blur: average sub-frames across half a frame interval where things move fast.
  function subframes(t) {
    if (t < 3.4 || t > 13.6) return 1;
    if (t > 9.0 && t < 12.1) return 4;
    return 3;
  }
  function frame(t, fps = 60) {
    const n = subframes(t);
    if (n === 1) { draw(out, t); return; }
    for (let i = 0; i < n; i++) {
      const ts = t - (0.5 / fps) * (i / (n - 1) - 0.5);
      draw(fx, ts);
      out.globalAlpha = 1 / (i + 1);
      out.drawImage(frameC, 0, 0);
    }
    out.globalAlpha = 1;
  }

  return { F, draw: (t) => draw(out, t), frame, canvas, timing };
}
