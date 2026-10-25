// Renders the opening sequence frame by frame in headless Chromium and encodes it with the score.
// Usage: node tools/render-opening.mjs <landscape|vertical> [--workers 3] [--frames dir] [--from s --to s]
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, ROOT } from './serve.mjs';
import { FPS, DURATION } from '../src/opening/timeline.js';

const args = process.argv.slice(2);
const fmt = args[0] || 'landscape';
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const workers = Number(opt('workers', 3));
const framesDir = path.resolve(opt('frames', path.join(ROOT, `build/frames-${fmt}`)));
const from = Math.round(Number(opt('from', 0)) * FPS);
const to = Math.round(Number(opt('to', DURATION)) * FPS);
const size = fmt === 'vertical' ? [1080, 1920] : [1920, 1080];

fs.mkdirSync(framesDir, { recursive: true });
const { server, url } = await serve();
const browser = await chromium.launch();
const total = to - from;
let done = 0;
const t0 = Date.now();

async function worker(w) {
  const page = await browser.newPage({ viewport: { width: size[0], height: size[1] } });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto(`${url}/src/opening/stage.html?format=${fmt}`);
  await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  const per = Math.ceil(total / workers);
  for (let i = from + w * per; i < Math.min(to, from + (w + 1) * per); i++) {
    const file = path.join(framesDir, `${String(i).padStart(5, '0')}.png`);
    if (fs.existsSync(file)) { done++; continue; }
    const data = await page.evaluate((t) => { window.renderAt(t); return window.grab(); }, i / FPS);
    fs.writeFileSync(file, Buffer.from(data.slice(data.indexOf(',') + 1), 'base64'));
    done++;
    if (done % 60 === 0) console.log(`${fmt}: ${done}/${total} frames, ${((Date.now() - t0) / done).toFixed(0)} ms/frame`);
  }
  await page.close();
}

await Promise.all(Array.from({ length: workers }, (_, w) => worker(w)));
await browser.close();
server.close();
console.log(`${fmt}: rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);

// Encode: H.264 High, 4:2:0, BT.709 tags, 60 fps, AAC 48 kHz stereo from the mastered score.
if (from === 0 && to === Math.round(DURATION * FPS)) {
  const outDir = path.join(ROOT, 'deliverables/4-opening');
  fs.mkdirSync(outDir, { recursive: true });
  const audio = path.join(ROOT, 'deliverables/4-opening/off-paper-opening-score.wav');
  const out = path.join(outDir, `off-paper-opening-${fmt}.mp4`);
  const a = [
    '-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(framesDir, '%05d.png'),
    ...(fs.existsSync(audio) ? ['-i', audio] : []),
    '-map', '0:v', ...(fs.existsSync(audio) ? ['-map', '1:a', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2'] : []),
    '-vf', 'scale=in_range=full:out_range=tv:out_color_matrix=bt709,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-level', '4.2', '-tune', 'film', '-maxrate', '24M', '-bufsize', '48M',
    '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709', '-color_range', 'tv',
    '-r', String(FPS), '-g', String(FPS), '-movflags', '+faststart', '-map_metadata', '-1',
    '-metadata', `title=Off Paper - Powered by Tokeniser - Opening (${fmt === 'vertical' ? '9:16' : '16:9'})`,
    '-shortest', out,
  ];
  execFileSync('ffmpeg', a, { stdio: 'inherit' });
  console.log('wrote', path.relative(ROOT, out));
}
