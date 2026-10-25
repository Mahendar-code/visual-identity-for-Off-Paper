// Captures dated proof of the licence for every third-party image in the submission:
// the Nappy licence page and each photo's own page (with its "More info" panel open),
// as a screenshot plus the page text. Run: node tools/licence-proof.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'deliverables/6-licences/proof');
const photos = JSON.parse(fs.readFileSync(path.join(root, 'src/photos/photos.json'), 'utf8'));
fs.mkdirSync(out, { recursive: true });

const pages = [['nappy-license', 'https://nappy.co/license'], ...photos.map((p) => [`photo-${p.id}`, p.source_page])];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 1250 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36',
});
await ctx.addCookies([{ name: 'popupNewsletter', value: 'dismiss', domain: 'nappy.co', path: '/' }]);
for (const [name, url] of pages) {
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const more = p.getByText('More info', { exact: true });
  if (await more.count()) { await more.first().click().catch(() => {}); await p.waitForTimeout(800); }
  await p.screenshot({ path: path.join(out, `${name}.png`) });
  const text = await p.evaluate(() => document.body.innerText);
  fs.writeFileSync(path.join(out, `${name}.txt`), `Source: ${url}\nRetrieved: ${new Date().toISOString()}\n\n${text}\n`);
  console.log(name, 'captured');
  await p.close();
}
await browser.close();
