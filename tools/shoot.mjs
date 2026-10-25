// Screenshot one page at an exact pixel size once it sets window.ready.
// Usage: node tools/shoot.mjs <page path> <width> <height> <out.png> [query]
import { chromium } from 'playwright';
import { serve } from './serve.mjs';

export async function shoot(browser, base, page, w, h, out, query = '') {
  const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  p.on('console', (m) => m.type() === 'error' && console.error('[page]', m.text()));
  p.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await p.goto(`${base}/${page}${query ? `?${query}` : ''}`);
  await p.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
  await p.screenshot({ path: out, clip: { x: 0, y: 0, width: w, height: h }, omitBackground: false });
  await p.close();
}

if (process.argv[1].endsWith('shoot.mjs')) {
  const [page, w, h, out, query] = process.argv.slice(2);
  const { server, url } = await serve();
  const browser = await chromium.launch();
  await shoot(browser, url, page, +w, +h, out, query);
  await browser.close();
  server.close();
}
