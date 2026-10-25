// Renders the identity sheet to a 3-page PDF (fonts embedded) and to PNGs, one per page plus one combined.
// Usage: node tools/render-identity.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { serve, ROOT } from './serve.mjs';

const out = path.join(ROOT, 'deliverables/1-identity');
fs.mkdirSync(out, { recursive: true });
const { server, url } = await serve();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
page.on('requestfailed', (r) => console.error('[missing]', r.url()));
await page.goto(`${url}/src/identity.html`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
await page.pdf({ path: path.join(out, 'off-paper-identity-sheet.pdf'), width: '1920px', height: '1080px', printBackground: true, preferCSSPageSize: true });
const sections = await page.$$('section.page');
const pngs = [];
for (let i = 0; i < sections.length; i++) {
  const f = path.join(out, `off-paper-identity-sheet-page-${i + 1}.png`);
  await sections[i].screenshot({ path: f });
  pngs.push(f);
}
await browser.close();
server.close();
// one combined image, pages stacked
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...pngs.flatMap((p) => ['-i', p]), '-filter_complex', `${pngs.map((_, i) => `[${i}:v]`).join('')}vstack=inputs=${pngs.length}`, path.join(out, 'off-paper-identity-sheet.png')]);
console.log('identity sheet: PDF and', pngs.length, 'pages');
