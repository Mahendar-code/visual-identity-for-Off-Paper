// Thumbnail maker: fills the four slots of the Off Paper thumbnail template and exports
// PNG (1920 x 1080 and 1280 x 720) or an editable SVG. Runs entirely in the browser.
import { loadFonts, fontUrl, logoUrl, W } from '../src/brand.js';
import { thumbnailSVG, THUMB } from '../src/thumbnail.js';

const $ = (id) => document.getElementById(id);
const state = { episode: '', title: '', guest: '', org: '', photo: null };

const toDataURL = (blob) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
const fetchDataURL = async (url) => toDataURL(await (await fetch(url)).blob());

let embedded = null; // fonts and logo as data URIs, so exported files carry everything they need
async function embeds() {
  if (embedded) return embedded;
  const weights = [W.medium, W.semibold, W.bold];
  const fonts = await Promise.all(weights.map(async (w) => `@font-face{font-family:Montserrat;font-weight:${w};src:url(${await fetchDataURL(fontUrl(w))}) format('truetype');}`));
  embedded = { fontCSS: fonts.join(''), logo: await fetchDataURL(logoUrl('dark')) };
  return embedded;
}

// Is this image a cut-out (transparent background)? Sample the border for transparency.
function hasTransparentEdge(img) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0, 64, 64);
  const d = g.getImageData(0, 0, 64, 64).data;
  let clear = 0, n = 0;
  for (let i = 0; i < 64; i++) for (const [x, y] of [[i, 0], [0, i], [63, i]]) { n++; if (d[(y * 64 + x) * 4 + 3] < 200) clear++; }
  return clear / n > 0.3;
}

export async function setPhoto(src, opts = {}) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const cutout = opts.cutout ?? hasTransparentEdge(img);
  state.photo = { href: src, w: img.naturalWidth, h: img.naturalHeight, cutout, zoom: opts.zoom ?? (cutout ? 1.15 : 1), top: opts.top ?? 0.06, dx: opts.dx ?? 0, dy: opts.dy ?? 0 };
  syncSliders();
  render();
}

function syncSliders() {
  const p = state.photo;
  $('photo-controls').hidden = !p;
  if (!p) return;
  $('zoom').min = p.cutout ? 0.8 : 1; $('zoom').max = p.cutout ? 4 : 3;
  $('zoom').value = p.zoom;
  $('dx').value = p.dx;
  $('dy').value = p.cutout ? p.top : p.dy;
  $('cutout-note').textContent = p.cutout ? 'Cut-out detected: the photo sits on the coin backdrop.' : 'Photo fills the coin.';
}

function build(forExport = false, emb = embedded) {
  return thumbnailSVG(state, { photo: state.photo, logoHref: emb ? emb.logo : undefined, fontCSS: forExport && emb ? emb.fontCSS : '' });
}

// Exported files must carry the photo inside them, so swap a linked photo for a data URI first.
async function embedPhoto() {
  const p = state.photo;
  if (p && !p.href.startsWith('data:')) p.href = await fetchDataURL(p.href);
}

export function render() {
  const { svg, layout } = build();
  $('preview').innerHTML = svg;
  $('phone-thumb').innerHTML = svg;
  $('mini-thumb').innerHTML = svg;
  const w = $('warnings');
  w.innerHTML = '';
  const msgs = [];
  if (!String(state.episode).trim()) msgs.push('Add the episode number.');
  if (!state.title.trim()) msgs.push('Add the episode title.');
  if (!state.guest.trim()) msgs.push('Add the guest name.');
  if (!state.photo) msgs.push('Add the guest photo.');
  // layout warnings about empty fields repeat the messages above
  msgs.push(...layout.warnings.filter((m) => String(state.episode).trim() || !m.startsWith('Use digits')));
  if (state.title.length > 42) msgs.push(`The title is ${state.title.length} characters. Up to about 40 reads best on a phone.`);
  for (const m of msgs) { const li = document.createElement('li'); li.textContent = m; w.appendChild(li); }
  $('ok').hidden = msgs.length > 0;
  $('title-size').textContent = `${layout.size}px title, ${layout.lines.length} line${layout.lines.length > 1 ? 's' : ''}, ${(layout.size * 360 / THUMB.w).toFixed(1)}px on a 360px-wide phone thumbnail`;
}

const fileName = (ext, w) => `off-paper-ep${(state.episode || '00').trim()}-thumbnail${w && w !== 1920 ? `-${w}` : ''}.${ext}`;

// Rasterise the exact SVG (fonts and images embedded) to PNG at the requested width.
export async function exportPNG(width = 1920) {
  const emb = await embeds();
  await embedPhoto();
  let { svg } = build(true, emb);
  const blob = new Blob([svg], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.src = url;
  await img.decode();
  await new Promise((r) => setTimeout(r, 60)); // let embedded fonts settle (Safari)
  const c = document.createElement('canvas');
  c.width = width; c.height = Math.round((width * THUMB.h) / THUMB.w);
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/png');
}

export async function exportSVG() {
  const emb = await embeds();
  await embedPhoto();
  return build(false, emb).svg; // photo and logo embedded; text stays editable (Montserrat by name)
}

function download(href, name) {
  const link = Object.assign(document.createElement('a'), { href, download: name });
  document.body.appendChild(link);
  link.click();
  link.remove();
  if (href.startsWith('blob:')) setTimeout(() => URL.revokeObjectURL(href), 1000);
}

async function loadExample(slug) {
  const sets = await Promise.all(['examples', 'examples-fictional'].map(async (f) => (await fetch(`../src/${f}.json`)).json()));
  const ex = sets.flat().find((e) => e.slug === slug);
  Object.assign(state, { episode: ex.episode, title: ex.title, guest: ex.guest, org: ex.org });
  for (const k of ['episode', 'title', 'guest', 'org']) $(k).value = state[k];
  await setPhoto(`../src/${ex.photo.file}`, ex.photo);
}

async function init() {
  await loadFonts();
  await embeds();
  for (const k of ['episode', 'title', 'guest', 'org']) {
    $(k).addEventListener('input', (e) => { state[k] = e.target.value; render(); });
    state[k] = $(k).value;
  }
  $('photo').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (f) await setPhoto(await toDataURL(f));
  });
  for (const k of ['zoom', 'dx', 'dy']) {
    $(k).addEventListener('input', (e) => {
      const v = Number(e.target.value);
      if (k === 'dy' && state.photo.cutout) state.photo.top = v; else state.photo[k] = v;
      render();
    });
  }
  $('dl-png').addEventListener('click', async () => download(await exportPNG(1920), fileName('png')));
  $('dl-png-small').addEventListener('click', async () => download(await exportPNG(1280), fileName('png', 1280)));
  $('dl-svg').addEventListener('click', async () => download(URL.createObjectURL(new Blob([await exportSVG()], { type: 'image/svg+xml' })), fileName('svg')));
  document.querySelectorAll('[data-example]').forEach((b) => b.addEventListener('click', () => loadExample(b.dataset.example)));
  const q = new URLSearchParams(location.search);
  if (q.get('example')) await loadExample(q.get('example')); else render();
  Object.assign(window, { exportPNG, exportSVG, makerState: state, loadExample, setPhoto });
  window.ready = true;
}
init();
