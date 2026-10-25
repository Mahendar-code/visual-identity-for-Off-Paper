// Usability tests for the thumbnail template, run in a real browser the way a producer uses it:
// fill the four slots, upload a photo, press the download buttons, and check what comes out.
// The downloaded SVG is also rendered by resvg (an independent renderer, not Chromium) to show
// the template file works outside the browser. Writes build/template-tests.json.
import { chromium } from 'playwright';
import { Resvg } from '@resvg/resvg-js';
import fs from 'node:fs';
import path from 'node:path';
import { serve, ROOT } from './serve.mjs';

const results = [];
const check = (id, name, pass, detail = '') => { results.push({ id, name, pass: !!pass, detail: String(detail) }); console.log(pass ? 'PASS' : 'FAIL', id, name, detail); };
const pngSize = (buf) => ({ w: buf.readUInt32BE(16), h: buf.readUInt32BE(20), png: buf.slice(1, 4).toString() === 'PNG' });
const outDir = path.join(ROOT, 'build/template-tests');
fs.mkdirSync(outDir, { recursive: true });

const { server, url } = await serve();
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 1300 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
const t0 = Date.now();
await page.goto(`${url}/maker/`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
check('U01', 'Maker loads with no errors', errors.length === 0, errors.join(' | ') || `ready in ${Date.now() - t0} ms`);

// every control has a visible label or an aria-label (usable by keyboard and screen readers)
const unlabelled = await page.evaluate(() => [...document.querySelectorAll('input, textarea')].filter((el) => !(el.getAttribute('aria-label') || (el.id && document.querySelector(`label[for="${el.id}"]`)))).map((el) => el.id || el.type));
check('U02', 'Every input has a label', unlabelled.length === 0, unlabelled.join(', ') || 'all labelled');

// --- scenario: a new episode from scratch, typed like a producer would
await page.fill('#episode', '33');
await page.fill('#title', 'What tokenised funds change for investors');
await page.fill('#guest', 'Guest Name');
await page.fill('#org', 'Head of Product, Example Fund');
await page.setInputFiles('#photo', path.join(ROOT, 'src/photos/stand-in-woman-headshot.jpg'));
await page.waitForFunction(() => window.makerState.photo && window.makerState.photo.href.startsWith('data:'));
const st = await page.evaluate(() => ({ cutout: window.makerState.photo.cutout, sliders: !document.getElementById('photo-controls').hidden, img: !!document.querySelector('#preview #guest-photo-image'), warnings: [...document.querySelectorAll('#warnings li')].map((l) => l.textContent), ok: !document.getElementById('ok').hidden, title: document.querySelector('#preview #Title text')?.textContent }));
check('U03', 'Uploaded JPG is placed in the coin and treated as a photo', st.img && st.cutout === false, `cutout=${st.cutout}`);
check('U04', 'Photo framing sliders appear after upload', st.sliders);
check('U05', 'A well-formed episode shows no warnings and the ready message', st.warnings.length === 0 && st.ok, st.warnings.join(' | ') || 'ready');
check('U06', 'Typed title appears in the preview', (st.title || '').replace(/\s+/g, ' ').includes('What tokenised funds'), st.title);

// sliders move the photo
const before = await page.getAttribute('#preview #guest-photo-image', 'x');
await page.locator('#dx').fill('0.2');
const after = await page.getAttribute('#preview #guest-photo-image', 'x');
check('U07', 'Left/right slider moves the photo', before !== after, `x ${before} -> ${after}`);
await page.locator('#dx').fill('0');

// downloads, exactly as the buttons deliver them
async function dl(sel) {
  const [d] = await Promise.all([page.waitForEvent('download'), page.click(sel)]);
  const f = path.join(outDir, d.suggestedFilename());
  await d.saveAs(f);
  return f;
}
const fPng = await dl('#dl-png');
const s1 = pngSize(fs.readFileSync(fPng));
check('U08', 'Download PNG gives a 1920 x 1080 PNG named after the episode', s1.png && s1.w === 1920 && s1.h === 1080 && path.basename(fPng) === 'off-paper-ep33-thumbnail.png', `${path.basename(fPng)} ${s1.w}x${s1.h}`);
const fSmall = await dl('#dl-png-small');
const s2 = pngSize(fs.readFileSync(fSmall));
check('U09', 'Download 1280 gives a 1280 x 720 PNG', s2.png && s2.w === 1280 && s2.h === 720, `${path.basename(fSmall)} ${s2.w}x${s2.h}`);
const fSvg = await dl('#dl-svg');
const svg = fs.readFileSync(fSvg, 'utf8');
const layers = ['Episode number', 'Title', 'Guest name', 'Guest organisation', 'Guest photo'];
const missing = layers.filter((l) => !svg.includes(`id="${l}"`));
const svgText = svg.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
check('U10', 'Downloaded SVG keeps every slot as a named, editable layer', missing.length === 0 && svgText.includes('What tokenised funds change for investors') && svg.includes('<text'), missing.length ? `missing ${missing}` : layers.join(', '));
check('U11', 'Downloaded SVG is self-contained (photo and logo embedded)', !/href="(?!data:)/.test(svg), 'all href are data: URIs');
check('U12', 'Time from opening the maker to a finished PNG', true, `${((Date.now() - t0) / 1000).toFixed(1)} s for 4 fields, 1 upload, 1 click (automated)`);

// independent renderer: resvg draws the downloaded SVG with the Montserrat files
const fonts = fs.readdirSync(path.join(ROOT, 'src/fonts')).filter((f) => f.endsWith('.ttf')).map((f) => path.join(ROOT, 'src/fonts', f));
const rendered = new Resvg(svg, { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: 'Montserrat' }, fitTo: { mode: 'width', value: 1920 } }).render();
fs.writeFileSync(path.join(outDir, 'resvg-render.png'), rendered.asPng());
check('U13', 'The SVG renders outside the browser (resvg, Montserrat only)', rendered.width === 1920 && rendered.height === 1080, `${rendered.width}x${rendered.height}; compared with the maker PNG in verify.py`);

// cut-out detection
await page.setInputFiles('#photo', path.join(ROOT, 'src/photos/cutout/stand-in-man-glasses.png'));
await page.waitForFunction(() => window.makerState.photo && window.makerState.photo.cutout === true, null, { timeout: 10000 }).catch(() => {});
check('U14', 'A transparent PNG is detected as a cut-out', await page.evaluate(() => window.makerState.photo.cutout === true));

// title fitting across lengths: never below 96 px, never more than 3 lines without a warning
const titles = [
  'Stablecoins', 'The value is in the workflow', 'Keeping digital dollars onshore', 'The agentic AI pivot in property',
  'Why funds are moving their registers on chain', 'Instant settlement and what it means for fund administrators',
  'From paper certificates to programmable assets: a practical guide for Australian funds and their investors',
];
const fit = await page.evaluate(async (titles) => {
  const { layoutText } = await import('/src/thumbnail.js');
  return titles.map((t) => { const L = layoutText({ episode: '1', title: t, guest: 'Guest Name', org: 'Role, Organisation' }); return { t, len: t.length, size: L.size, lines: L.lines.length, warn: L.warnings.length }; });
}, titles);
const okFit = fit.every((f) => f.size >= 96 && (f.warn > 0 || f.lines <= 3));
check('U15', 'Titles of every length: at least 96 px, 3 lines or a warning', okFit, fit.map((f) => `${f.len}ch:${f.size}px/${f.lines}l${f.warn ? '/warn' : ''}`).join(' '));
check('U16', 'Titles up to 45 characters fit without any warning', fit.filter((f) => f.len <= 45).every((f) => f.warn === 0));
check('U17', 'An over-long title is caught with a warning', fit[fit.length - 1].warn > 0, `${fit[fit.length - 1].len} characters`);
const minPhone = Math.min(...fit.map((f) => (f.size * 360) / 1920));
check('U18', 'Smallest title on a 360 px wide phone thumbnail is at least 18 px', minPhone >= 18, `${minPhone.toFixed(1)} px`);

const longName = await page.evaluate(async () => {
  const { layoutText } = await import('/src/thumbnail.js');
  const a = layoutText({ episode: '1', title: 'Title', guest: 'Alexandra Konstantinopoulou-Whitfield', org: '' });
  const b = layoutText({ episode: '1', title: 'Title', guest: 'An unusually long guest name that cannot possibly fit on one line here', org: '' });
  return { a: a.guestSize, aw: a.warnings.length, bw: b.warnings.length };
});
check('U19', 'A long guest name shrinks to fit; an impossible one warns', longName.aw === 0 && longName.a < 52 && longName.bw > 0, `shrunk to ${longName.a} px`);
const epWarn = await page.evaluate(async () => (await import('/src/thumbnail.js')).layoutText({ episode: 'twelve', title: 'Title', guest: 'Guest', org: '' }).warnings.length);
check('U20', 'A non-numeric episode number is flagged', epWarn > 0);

await browser.close();
server.close();
fs.writeFileSync(path.join(ROOT, 'build/template-tests.json'), JSON.stringify({ when: new Date().toISOString(), results }, null, 2));
console.log(`${results.filter((r) => r.pass).length}/${results.length} template tests passed`);
