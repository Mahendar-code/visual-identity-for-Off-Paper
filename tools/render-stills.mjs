// Renders the still deliverables: cover art (PNG, JPG, editable SVG), the three example thumbnails
// (through the thumbnail maker's own export path, at 1920 x 1080 and 1280 x 720, plus editable SVGs)
// and the empty SVG template. Usage: node tools/render-stills.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, ROOT } from './serve.mjs';
import { shoot } from './shoot.mjs';

const D = (p) => path.join(ROOT, 'deliverables', p);
const b64 = (dataUrl) => Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
for (const d of ['2-cover', '3-thumbnails/examples', '3-thumbnails/template']) fs.mkdirSync(D(d), { recursive: true });

const { server, url } = await serve();
const browser = await chromium.launch();

// Cover: the SVG is the project file; the PNG is rendered from it at 3000 x 3000.
await shoot(browser, url, 'src/cover.html', 3000, 3000, D('2-cover/off-paper-cover-3000.png'));
{
  const p = await browser.newPage();
  await p.goto(`${url}/src/cover.html?size=3000`);
  await p.waitForFunction(() => window.ready === true);
  const svg = await p.evaluate(async () => {
    const { coverSVG } = await import('/src/cover.js');
    const bl = await (await fetch('/src/logos/tokeniser-logo-on-dark.png')).blob();
    const logo = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(bl); });
    return coverSVG({ size: 3000, logoHref: logo });
  });
  fs.writeFileSync(D('2-cover/off-paper-cover.svg'), svg);
  await p.close();
}
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', D('2-cover/off-paper-cover-3000.png'), '-q:v', '1', D('2-cover/off-paper-cover-3000.jpg')]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', D('2-cover/off-paper-cover-3000.png'), '-vf', 'scale=1400:1400:flags=lanczos', '-q:v', '1', D('2-cover/off-paper-cover-1400.jpg')]);
console.log('cover done');

// Thumbnails: open the maker exactly as a producer would, load each example, export.
const examples = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/examples.json'), 'utf8'));
const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(`${url}/maker/`);
await page.waitForFunction(() => window.ready === true);
for (const ex of examples) {
  await page.evaluate((slug) => window.loadExample(slug), ex.slug);
  await page.waitForTimeout(300);
  const big = await page.evaluate(() => window.exportPNG(1920));
  const small = await page.evaluate(() => window.exportPNG(1280));
  const svg = await page.evaluate(() => window.exportSVG());
  fs.writeFileSync(D(`3-thumbnails/examples/off-paper-${ex.slug}-thumbnail.png`), b64(big));
  fs.writeFileSync(D(`3-thumbnails/examples/off-paper-${ex.slug}-thumbnail-1280.png`), b64(small));
  fs.writeFileSync(D(`3-thumbnails/examples/off-paper-${ex.slug}-thumbnail.svg`), svg);
  console.log('thumbnail', ex.slug);
}

// Two alternative example sets, made through the same maker:
//  option B: the same episodes and guests, with the placeholder silhouette instead of a stand-in photo
//  option C: invented guests, organisations and titles, with the CC0 stock photos
const SILHOUETTE = { file: 'photos/placeholder-silhouette.png', cutout: true, zoom: 1.0, top: 0.08 };
const variants = {
  'option-b-silhouette': examples.map((e) => ({ ...e, photo: SILHOUETTE })),
  'option-c-fictional': JSON.parse(fs.readFileSync(path.join(ROOT, 'src/examples-fictional.json'), 'utf8')),
};
for (const [dir, items] of Object.entries(variants)) {
  fs.mkdirSync(D(`3-thumbnails/examples/${dir}`), { recursive: true });
  for (const ex of items) {
    await page.evaluate(async (e) => {
      Object.assign(window.makerState, { episode: e.episode, title: e.title, guest: e.guest, org: e.org });
      await window.setPhoto(`../src/${e.photo.file}`, e.photo);
    }, ex);
    await page.waitForTimeout(300);
    const out = (suffix) => D(`3-thumbnails/examples/${dir}/off-paper-${ex.slug}-thumbnail${suffix}`);
    fs.writeFileSync(out('.png'), b64(await page.evaluate(() => window.exportPNG(1920))));
    fs.writeFileSync(out('-1280.png'), b64(await page.evaluate(() => window.exportPNG(1280))));
    fs.writeFileSync(out('.svg'), await page.evaluate(() => window.exportSVG()));
    console.log('thumbnail', dir, ex.slug);
  }
}

// The empty template: placeholder text, empty photo slot, every slot a named layer.
await page.evaluate(async () => {
  Object.assign(window.makerState, { episode: '00', title: 'Episode title in sentence case, up to three lines', guest: 'Guest Name', org: 'Role, Organisation' });
  await window.setPhoto('../src/photos/placeholder-silhouette.png', { cutout: true, zoom: 1.0, top: 0.08 });
});
const tpl = await page.evaluate(() => window.exportSVG());
fs.writeFileSync(D('3-thumbnails/template/off-paper-thumbnail-template.svg'), tpl);
const tplPng = await page.evaluate(() => window.exportPNG(1920));
fs.writeFileSync(D('3-thumbnails/template/off-paper-thumbnail-template-preview.png'), b64(tplPng));
console.log('template done');

await browser.close();
server.close();
