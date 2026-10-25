// Opening sequence choreography: pure functions of time, shared by the picture (scene.js),
// the live player and the score (tools/score.py reads the cues this file exports as JSON).
// Nothing in here touches the DOM, so Node can import it too.

export const FPS = 60;
export const DURATION = 16;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const inOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const inOut5 = (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2);
const out3 = (t) => 1 - Math.pow(1 - t, 3);
const out5 = (t) => 1 - Math.pow(1 - t, 5);

// Act boundaries (seconds). The music is written to the same bars: 120 bpm, one bar = 2 s.
export const ACT = {
  dawn: [0.0, 3.6],      // the ground appears and a light passes over it
  lift: [3.6, 7.5],      // contours of the central hill lift off as rings and turn
  align: [7.5, 9.0],     // rings take their places along the rail
  fly: [9.0, 11.8],      // the camera runs the rail through the rings
  flip: [11.8, 12.0],    // the last ring turns edge-on and becomes the horizon
  mark: [12.0, 15.0],    // the name lands on the horizon; rings rise as on the cover
  fade: [15.0, 15.6],    // fade to solid Slate
  end: [15.6, 16.0],     // solid Slate for the last 0.4 s: the edit point into the episode
};

export const HILL = { x: 0, z: 10.5, h: 2.2, sigma: 2.6 };
export const COLUMN_RINGS = 6;
export const TUNNEL = { y: 2.4, r: 2.05, z0: 7.5, gap: 4.6, count: 10 };
export const RING_LIFT = Array.from({ length: COLUMN_RINGS }, (_, k) => 3.6 + 0.26 * k);

// Camera path. Pitch > 0 looks up.
export function camera(t, endPitch = 0.1) {
  // dawn: low and slow over the land
  let z = lerp(-3.2, -0.6, inOut(seg(t, 0, 7.5)));
  let y = lerp(1.35, 1.9, inOut(seg(t, 0.5, 7.0)));
  let pitch = lerp(-0.07, -0.03, seg(t, 0, 3.6));
  // lift: look up after the rings
  pitch = lerp(pitch, 0.24, inOut(seg(t, 3.9, 6.9)));
  // align: come back level onto the rail axis
  pitch = lerp(pitch, 0.0, inOut(seg(t, 7.2, 9.0)));
  y = lerp(y, TUNNEL.y, inOut(seg(t, 7.3, 9.0)));
  // fly: run the rail, accelerating, then settle in front of the last ring
  const zEnd = TUNNEL.z0 + TUNNEL.gap * (TUNNEL.count - 1) - 6.2;
  z = lerp(z, zEnd, inOut(seg(t, 8.9, 11.85)));
  // mark: tilt up a touch so the horizon sits below centre, as on the cover
  pitch = lerp(pitch, endPitch, inOut(seg(t, 11.95, 13.4)));
  const roll = 0.025 * Math.sin(Math.PI * seg(t, 9.0, 11.8)) * Math.sin(t * 2.1);
  return { x: 0.25 * Math.sin(t * 0.37) * (1 - seg(t, 11, 12)), y, z, pitch, roll };
}

// Height-scale of the land: full relief at dawn, flattened into rails for the run, relief again under the name.
export function relief(t) {
  return lerp(1, 0, inOut(seg(t, 4.2, 7.6))) + lerp(0, 0.85, inOut(seg(t, 12.0, 13.8)));
}
// The central hill gives up its height as its contours lift away.
export function hillScale(t) {
  return 1 - inOut(seg(t, 3.5, 6.0));
}

// Ring k's state at time t: centre, radius, tilt (0 flat, pi/2 facing the camera), organic wobble, opacity.
export function ring(k, t) {
  const cam = camera(t);
  const lift = RING_LIFT[k] ?? 4.9;
  // contour on the hill: its height on the hill and its contour radius there
  const hk = HILL.h * (0.16 + 0.13 * k);
  const rk = HILL.sigma * Math.sqrt(2 * Math.log(HILL.h / hk));
  // column pose (the cover): rising and turning
  const u = k / (COLUMN_RINGS - 1);
  const colY = 1.8 + 0.95 * k + 0.13 * k * k;
  const colTilt = (Math.PI / 2) * 0.94 * Math.pow(u, 1.1);
  const a = out5(seg(t, lift, lift + 2.6));
  let x = HILL.x, z = HILL.z;
  let y = lerp(hk * hillScale(lift), colY, a);
  let r = lerp(rk, 3.9 + 0.6 * u, out3(seg(t, lift, lift + 1.8)));
  let tilt = lerp(0, colTilt, inOut(seg(t, lift + 0.2, lift + 2.2)));
  // once lifted, each ring keeps turning slowly (precession), so the column never stands still
  tilt += 0.16 * Math.sin(t * 1.7 + k * 1.3) * seg(t, lift + 1.2, lift + 2.4);
  let wobble = 1 - out3(seg(t, lift, lift + 1.5));
  let alpha = clamp(seg(t, lift - 0.25, lift + 0.15) * 1);
  // align: take a place on the rail, facing the camera
  const slot = k;
  const b = inOut5(seg(t, 7.3 + 0.1 * k, 8.8 + 0.08 * k));
  x = lerp(x, 0, b);
  y = lerp(y, TUNNEL.y, b);
  z = lerp(z, TUNNEL.z0 + TUNNEL.gap * slot, b);
  r = lerp(r, TUNNEL.r, b);
  tilt = lerp(tilt, Math.PI / 2, b);
  // the rings are gone once the camera has run through them
  if (t > ACT.flip[1] + 0.05) alpha = 0;
  return { x, y, z, r, tilt, wobble, alpha, k, camZ: cam.z };
}

// Rings 6..9 only exist on the rail: they condense out of the distance as the run begins.
export function tunnelRing(k, t) {
  const z = TUNNEL.z0 + TUNNEL.gap * k;
  let alpha = seg(t, 7.9 + 0.18 * (k - COLUMN_RINGS), 8.9 + 0.18 * (k - COLUMN_RINGS));
  let tilt = Math.PI / 2;
  // the last ring turns edge-on and lies down as the horizon
  if (k === TUNNEL.count - 1) tilt = lerp(Math.PI / 2, 0, inOut(seg(t, ACT.flip[0], ACT.flip[1])));
  if (t > ACT.flip[1]) alpha = 0;
  return { x: 0, y: TUNNEL.y, z, r: TUNNEL.r, tilt, wobble: 0, alpha, k };
}

// The six rings that rise off the horizon under the name: the cover composition, relative to the camera.
export function markRing(k, t, { colScale = 1, rScale = 1, tiltScale = 1, endPitch = 0.1 } = {}) {
  const cam = camera(t, endPitch);
  const u = k / (COLUMN_RINGS - 1);
  const ys = [0.0, 0.9, 2.3, 4.2, 6.7, 9.8].map((v) => v * colScale); // above eye level, as on the cover
  const a = out5(seg(t, 12.08 + 0.13 * k, 13.25 + 0.13 * k));
  const tilt = (Math.PI / 2) * 0.9 * tiltScale * Math.pow(u, 1.2) * a + 0.04 * Math.sin(t * 0.9 + k) * seg(t, 13, 14);
  return {
    x: cam.x, y: cam.y + ys[k] * a + 0.03 * Math.sin(t * 1.3 + k * 1.7) * seg(t, 13.2, 14.2),
    z: cam.z + 11.5 - 2.2 * u, r: (3.5 + 0.5 * u) * rScale, tilt, wobble: 0, alpha: seg(t, 12.05 + 0.13 * k, 12.25 + 0.13 * k), k,
  };
}

// Times at which the camera passes through each rail ring (for the whoosh in the score).
export function passTimes() {
  const out = [];
  for (let k = 0; k < TUNNEL.count - 1; k++) {
    const zr = TUNNEL.z0 + TUNNEL.gap * k;
    let prev = camera(8.5).z;
    for (let t = 8.5; t <= 12; t += 1 / 600) {
      const z = camera(t).z;
      if (prev < zr && z >= zr) { out.push(+t.toFixed(3)); break; }
      prev = z;
    }
  }
  return out;
}

export function cues() {
  return {
    fps: FPS, duration: DURATION, bpm: 120, acts: ACT,
    ringLift: RING_LIFT, ringPass: passTimes(), impact: ACT.mark[0],
    nameIn: [12.25, 13.0], subIn: [12.6, 13.3], logoIn: [12.75, 13.45],
    sweep: [1.4, 3.8], fadeOut: ACT.fade, silenceFrom: 15.75,
  };
}
