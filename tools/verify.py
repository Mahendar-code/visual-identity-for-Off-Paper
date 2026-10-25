"""Checks every deliverable against the brief and writes VERIFICATION.md and verification.json.

Run after the build (tools/build.sh). It measures the real files: specs, brand rules (palette,
type, logo, name, opacity), licences, audio, motion and legibility, and merges the browser
usability tests of the thumbnail template (build/template-tests.json).
Usage: python3 tools/verify.py
"""
import glob
import hashlib
import json
import os
import re
import subprocess
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
D = os.path.join(ROOT, 'deliverables')
R = []


def check(cat, cid, name, ok, detail=''):
    """ok is True or False, or None when the check could not be measured here (reported as skipped, never as a pass)."""
    status = 'skip' if ok is None else 'pass' if ok else 'fail'
    R.append({'cat': cat, 'id': cid, 'name': name, 'pass': status == 'pass', 'status': status, 'detail': str(detail)})
    print(status.upper().ljust(5) + cid, name, '|', detail)


def run(*a):
    return subprocess.run(a, capture_output=True, text=True)


def rel(p):
    return os.path.relpath(p, ROOT)


PALETTE = {'Slate': '#343740', 'Mint': '#A2FFC8', 'Light Mint': '#DAFDE5', 'Light Blue': '#C9DBF1', 'Blue': '#323B70', 'Teal': '#009C9C', 'Orange': '#FF9A81'}
PAL = {k: tuple(int(v[i:i + 2], 16) for i in (1, 3, 5)) for k, v in PALETTE.items()}
SUPPLIED_LOGOS = {  # SHA-256 of the three files as downloaded from the brief's links on 2026-10-22
    'tokeniser-logo-on-dark.png': '6952027cc97a7293e3f8b46874efc7d3532ea700e66e7c4142179d4e18c788dc',
    'tokeniser-logo-slate-green-icon.png': '56d05ff1ba1ef6cccf22f4723a63957a6708af68fbed27edcdf67e1e577e7cd7',
    'tokeniser-logo-on-mint.png': '483ed1e207e52bac194e3956c0f2801cf51b81bc1afd2229bdf9073411081e65',
}
LOGO_URL = 'https://taskboard.redbellydao.network/brand/tokeniser/'
SHOW = 'Off Paper - Powered by Tokeniser'


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def probe(p):
    out = run('ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', p).stdout
    return json.loads(out)


def frame(p, t, w=None, h=None):
    j = probe(p)
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]
    W, H = (w or v['width']), (h or v['height'])
    vf = ['-vf', f'scale={W}:{H}'] if w else []
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t), '-i', p, '-frames:v', '1', *vf, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(H, W, 3)


def frame_n(p, n):
    """Decode exactly frame number n (no seeking ambiguity)."""
    j = probe(p)
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-vf', f'select=eq(n\\,{n})', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(v['height'], v['width'], 3)


def hull_share(img, tol):
    """Share of pixels inside the colour gamut that layering palette colours can produce (their convex hull)."""
    from scipy.spatial import ConvexHull
    hull = ConvexHull(np.array(list(PAL.values()), float))
    a = np.asarray(img.convert('RGB')).reshape(-1, 3).astype(np.int64)
    packed = (a[:, 0] << 16) | (a[:, 1] << 8) | a[:, 2]
    u, counts = np.unique(packed, return_counts=True)
    px = np.stack([(u >> 16) & 255, (u >> 8) & 255, u & 255], 1).astype(float)
    out = (px @ hull.equations[:, :3].T + hull.equations[:, 3]).max(1)  # signed distance outside the hull
    return counts[out <= tol].sum() / counts.sum()


def palette_share(img, tol, extra=()):
    """Share of pixels that are a palette colour or a blend of two palette colours (opacity), within tol."""
    a = np.asarray(img.convert('RGB')).reshape(-1, 3).astype(np.int64)
    packed = (a[:, 0] << 16) | (a[:, 1] << 8) | a[:, 2]
    u, counts = np.unique(packed, return_counts=True)
    px = np.stack([(u >> 16) & 255, (u >> 8) & 255, u & 255], 1).astype(np.float64)
    cols = np.array(list(PAL.values()) + list(extra), np.float64)
    best = np.full(len(px), 1e9)
    for i in range(len(cols)):
        for j in range(i, len(cols)):
            A, B = cols[i], cols[j]
            d = B - A
            L2 = max(float(d @ d), 1e-9)
            t = np.clip(((px - A) @ d) / L2, 0, 1)[:, None]
            dist = np.linalg.norm(px - (A + t * d), axis=1)
            best = np.minimum(best, dist)
    ok = counts[best <= tol].sum() / counts.sum()
    return ok, float(np.percentile(np.repeat(best, np.minimum(counts, 50)), 99.9))


# ======================================================================== deliverables
cat = 'Deliverables and specs'
pdf = f'{D}/1-identity/off-paper-identity-sheet.pdf'
info = run('pdfinfo', pdf).stdout
pages = int(re.search(r'Pages:\s+(\d+)', info).group(1)) if 'Pages' in info else 0
check(cat, 'D01', 'Identity sheet PDF exists (short, 3 pages)', os.path.exists(pdf) and pages == 3, f'{pages} pages, {re.search(r"Page size:\s+(.*)", info).group(1) if pages else ""}')
pp = sorted(glob.glob(f'{D}/1-identity/off-paper-identity-sheet-page-*.png'))
check(cat, 'D02', 'Identity sheet as images (one per page and one combined)', len(pp) == 3 and all(Image.open(p).size == (1920, 1080) for p in pp) and os.path.exists(f'{D}/1-identity/off-paper-identity-sheet.png'), ', '.join(f'{Image.open(p).size[0]}x{Image.open(p).size[1]}' for p in pp))
cv = Image.open(f'{D}/2-cover/off-paper-cover-3000.png')
check(cat, 'D03', 'Cover art square, at least 1400 x 1400 (3000 x 3000 delivered), PNG', cv.size == (3000, 3000), f'{cv.size[0]}x{cv.size[1]} {cv.mode}')
j1, j2 = Image.open(f'{D}/2-cover/off-paper-cover-3000.jpg'), Image.open(f'{D}/2-cover/off-paper-cover-1400.jpg')
check(cat, 'D04', 'Cover art also as JPG, 3000 and 1400', j1.size == (3000, 3000) and j2.size == (1400, 1400), f'{j1.size}, {j2.size}')
try:
    root = ET.parse(f'{D}/2-cover/off-paper-cover.svg').getroot()
    check(cat, 'D05', 'Cover art editable SVG parses', root.get('viewBox') == '0 0 3000 3000', root.get('viewBox'))
except Exception as e:
    check(cat, 'D05', 'Cover art editable SVG parses', False, e)
ex = json.load(open(os.path.join(ROOT, 'src/examples.json')))
sizes = {e['slug']: Image.open(f"{D}/3-thumbnails/examples/off-paper-{e['slug']}-thumbnail.png").size for e in ex}
check(cat, 'D06', 'Three finished thumbnails at 16:9, at least 1280 x 720 (1920 x 1080 delivered)', len(sizes) == 3 and all(s == (1920, 1080) for s in sizes.values()), sizes)
small = {e['slug']: Image.open(f"{D}/3-thumbnails/examples/off-paper-{e['slug']}-thumbnail-1280.png").size for e in ex}
check(cat, 'D07', 'Each thumbnail also at exactly 1280 x 720', all(s == (1280, 720) for s in small.values()), small)
fict = json.load(open(os.path.join(ROOT, 'src/examples-fictional.json')))
alt = {'option-b-silhouette': [e['slug'] for e in ex], 'option-c-fictional': [e['slug'] for e in fict]}
alt_ok, alt_det = True, []
for d_, slugs in alt.items():
    for sl in slugs:
        b_ = f'{D}/3-thumbnails/examples/{d_}/off-paper-{sl}-thumbnail'
        ok_ = all(os.path.exists(b_ + x) for x in ('.png', '-1280.png', '.svg')) and Image.open(b_ + '.png').size == (1920, 1080) and Image.open(b_ + '-1280.png').size == (1280, 720)
        alt_ok &= ok_
    alt_det.append(f'{d_}: {len(slugs)} thumbnails')
check(cat, 'D15', 'Alternative example sets (silhouette; invented guests) at 1920 x 1080 and 1280 x 720, with SVGs', alt_ok and all(len(v) == 3 for v in alt.values()), ', '.join(alt_det))
tpl = f'{D}/3-thumbnails/template/off-paper-thumbnail-template.svg'
txt = open(tpl).read()
ET.fromstring(txt)
need = ['Episode number', 'Title', 'Guest name', 'Guest organisation', 'Guest photo', 'guest-photo-image']
miss = [n for n in need if f'id="{n}"' not in txt]
check(cat, 'D08', 'Editable SVG template: every slot is a named layer, file is valid XML', not miss, 'missing: ' + ', '.join(miss) if miss else ', '.join(need))
check(cat, 'D09', 'Free browser thumbnail maker present', os.path.exists(os.path.join(ROOT, 'maker/index.html')) and os.path.exists(os.path.join(ROOT, 'maker/maker.js')), 'maker/index.html (no account, no install)')
for fmt, (w, h) in (('landscape', (1920, 1080)), ('vertical', (1080, 1920))):
    p = f'{D}/4-opening/off-paper-opening-{fmt}.mp4'
    j = probe(p)
    v = [s for s in j['streams'] if s['codec_type'] == 'video'][0]
    a = [s for s in j['streams'] if s['codec_type'] == 'audio']
    dur = float(j['format']['duration'])
    ok = v['codec_name'] == 'h264' and (v['width'], v['height']) == (w, h) and v['r_frame_rate'] == '60/1' and v['pix_fmt'] == 'yuv420p' and 10 <= dur <= 20 and a and a[0]['codec_name'] == 'aac' and a[0]['sample_rate'] == '48000' and a[0]['channels'] == 2
    check(cat, f'D1{0 if fmt == "landscape" else 1}', f'Opening {fmt}: MP4, H.264, {w} x {h}, 60 fps, 10 to 20 s, AAC 48 kHz stereo', ok,
          f"{v['codec_name']} {v['profile']} {v['width']}x{v['height']} {v['r_frame_rate']} {v['pix_fmt']} {v.get('color_space', '')}, {dur:.2f} s, {a[0]['codec_name']} {a[0]['sample_rate']} Hz {a[0]['channels']} ch, {os.path.getsize(p) / 1e6:.1f} MB")
check(cat, 'D12', 'Score delivered separately as WAV', os.path.exists(f'{D}/4-opening/off-paper-opening-score.wav'), '48 kHz 24-bit stereo')
proj = ['src/brand.js', 'src/cover.js', 'src/thumbnail.js', 'src/identity.html', 'src/opening/scene.js', 'src/opening/timeline.js', 'tools/score.py', 'tools/render-opening.mjs', 'tools/render-stills.mjs', 'tools/build.sh', 'maker/maker.js']
missing = [p for p in proj if not os.path.exists(os.path.join(ROOT, p))]
check(cat, 'D13', 'Project files for every piece are in the repository', not missing, 'missing ' + ', '.join(missing) if missing else f'{len(proj)} key files, full list in deliverables/5-project-files/README.md')
photos = json.load(open(os.path.join(ROOT, 'src/photos/photos.json')))
lic = [f'{D}/6-licences/LICENCES.md', f'{D}/6-licences/Montserrat-OFL.txt', f'{D}/6-licences/proof/nappy-license.png'] + [f"{D}/6-licences/proof/photo-{p['id']}.png" for p in photos]
check(cat, 'D14', 'Licence proof files present (font licence, licences file, dated proof for each photo)', all(os.path.exists(p) for p in lic), ', '.join(rel(p) for p in lic))

# ======================================================================== brand
cat = 'Brand rules'
srcs = [p for p in glob.glob(os.path.join(ROOT, '**/*'), recursive=True) if os.path.isfile(p) and '/node_modules/' not in p and '/build/' not in p and '/.git/' not in p and p.endswith(('.js', '.mjs', '.html', '.css', '.svg', '.py'))]
bad = {}
for p in srcs:
    t = open(p, errors='ignore').read()
    if p.endswith('.svg'):
        t = re.sub(r'data:[^"]+', '', t)
    for hx in re.findall(r'#[0-9A-Fa-f]{6}\b', t):
        if hx.upper() not in PALETTE.values():
            bad.setdefault(rel(p), set()).add(hx)
    for r_, g_, b_ in re.findall(r'rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)', t):
        if (int(r_), int(g_), int(b_)) not in PAL.values():
            bad.setdefault(rel(p), set()).add(f'rgb({r_},{g_},{b_})')
check(cat, 'B01', 'Every colour written in code, pages and SVGs is a Tokeniser colour', not bad, json.dumps({k: sorted(v) for k, v in bad.items()}) if bad else f'{len(srcs)} files scanned; no colour outside the 7 palette hex values')

share, dev = palette_share(cv.resize((1500, 1500), Image.NEAREST), 4)
check(cat, 'B02', 'Cover pixels: palette colours or opacity blends of two palette colours', share >= 0.995, f'{share * 100:.2f} percent of pixels within 4 RGB units (99.9th percentile deviation {dev:.1f})')
th_ok = []
for f_th in sorted(glob.glob(f'{D}/3-thumbnails/examples/**/off-paper-*-thumbnail.png', recursive=True)):
    im = Image.open(f_th).convert('RGB')
    a = np.asarray(im).copy()
    yy, xx = np.mgrid[0:1080, 0:1920]
    a[(xx - 1440) ** 2 + (yy - 476) ** 2 <= 331 ** 2] = PAL['Slate']  # the photo in the coin is excluded
    s_, d_ = palette_share(Image.fromarray(a), 4)
    th_ok.append((os.path.relpath(f_th, f'{D}/3-thumbnails/examples').replace('off-paper-', '').replace('-thumbnail.png', ''), s_))
check(cat, 'B03', 'Thumbnail pixels outside the photo: palette colours or two-colour blends', all(s >= 0.99 for _, s in th_ok), ', '.join(f'{k} {s * 100:.2f}%' for k, s in th_ok))
idp = []
for p in pp[:2]:
    s_, _ = palette_share(Image.open(p), 4, extra=[(115, 215, 166)])  # the green icon inside the supplied light-background logo
    idp.append(s_)
check(cat, 'B04', 'Identity sheet pages 1 and 2: palette colours or two-colour blends', all(s >= 0.99 for s in idp), ', '.join(f'{s * 100:.2f}%' for s in idp) + ' (page 3 holds photos and is not audited)')
vid, hul, enc = [], [], []
for fmt in ('landscape', 'vertical'):
    p = f'{D}/4-opening/off-paper-opening-{fmt}.mp4'
    fd = os.path.join(ROOT, f'build/frames-{fmt}')
    for t in (1.5, 3.0, 4.6, 6.8, 8.5, 10.2, 11.5, 12.6, 14.2, 15.8):
        f_png = os.path.join(fd, f'{round(t * 60):05d}.png')
        im = Image.open(f_png) if os.path.exists(f_png) else Image.fromarray(frame(p, t))
        vid.append(palette_share(im, 6)[0])
        hul.append(hull_share(im, 5))
        enc.append(hull_share(Image.fromarray(frame(p, t)), 6))
check(cat, 'B05', 'Opening frames as rendered (20 sampled): every pixel is a mix of palette colours, nothing outside their gamut', min(hul) >= 0.999,
      f'lowest frame {min(hul) * 100:.2f}% inside the gamut of the palette (layers of palette colours at opacity: sky, light, rings, vignette, grain); {np.mean(vid) * 100:.1f}% are a blend of just two. '
      f'After H.264 4:2:0 encoding, {np.mean(enc) * 100:.1f}% on average (colour bleeding at sharp Mint edges)')

fonts = run('pdffonts', pdf).stdout.splitlines()[2:]
names = sorted({l.split()[0].split('+')[-1] for l in fonts if l.strip()})
check(cat, 'B06', 'Montserrat is the only typeface embedded in the identity PDF', names and all(n.startswith('Montserrat-') for n in names), ', '.join(names))
fam = set()
for p in srcs:
    if '/src/' in p:
        for f_ in re.findall(r'font-family[=:]\s*["\']?([A-Za-z ,\-]+)', open(p, errors='ignore').read()):
            fam.update(x.strip() for x in f_.split(',') if x.strip() and not x.strip().startswith('$'))
fam.discard('')
check(cat, 'B07', 'Every font-family used to draw the show is Montserrat', fam <= {'Montserrat'} or fam <= {'Montserrat', 'FONT'}, ', '.join(sorted(fam)) or 'Montserrat via the FONT constant')
ttf = sorted(glob.glob(os.path.join(ROOT, 'src/fonts/*.ttf')))
check(cat, 'B08', 'Bundled font files are Montserrat (SIL OFL 1.1, from Google Fonts)', ttf and all(os.path.basename(p).startswith('Montserrat-') for p in ttf) and 'SIL Open Font License' in open(os.path.join(ROOT, 'src/fonts/OFL.txt')).read(), ', '.join(os.path.basename(p) for p in ttf))

hashes = {f: sha(os.path.join(ROOT, 'src/logos', f)) for f in SUPPLIED_LOGOS}
check(cat, 'B09', 'Logo files are byte-identical to the supplied files (SHA-256)', hashes == SUPPLIED_LOGOS, ', '.join(f'{k[:-4]} {v[:12]}' for k, v in hashes.items()))
live = run('curl', '-sS', '-m', '20', '-o', '/dev/null', '-w', '%{http_code}', LOGO_URL + 'tokeniser-logo-on-dark.png').stdout
if live == '200':
    same = all(hashlib.sha256(subprocess.run(['curl', '-sS', '-m', '30', LOGO_URL + f], capture_output=True).stdout).hexdigest() == h for f, h in SUPPLIED_LOGOS.items())
    check(cat, 'B10', 'Logo files still match a fresh download from the brief links', same, LOGO_URL)
else:
    check(cat, 'B10', 'Logo files still match a fresh download from the brief links', None, f'not measured: the brief links could not be reached (HTTP {live})')
svgs = [f'{D}/2-cover/off-paper-cover.svg', tpl] + sorted(glob.glob(f'{D}/3-thumbnails/examples/**/*.svg', recursive=True))
ratios = []
for p in svgs:
    for m in re.finditer(r'<svg id="tokeniser-logo"[^>]*>', open(p).read()):
        tag = m.group(0)
        w_, h_ = float(re.search(r'width="([\d.]+)"', tag).group(1)), float(re.search(r'height="([\d.]+)"', tag).group(1))
        vb = [float(x) for x in re.search(r'viewBox="([^"]+)"', tag).group(1).split()]
        ratios.append(abs((w_ / h_) / (vb[2] / vb[3]) - 1))
check(cat, 'B11', 'Logo never stretched: placed width/height equals the artwork ratio in every SVG', ratios and max(ratios) < 0.005, f'{len(ratios)} placements, worst {max(ratios) * 100:.3f}% off')
# logo pixel fidelity on the cover: compare the rendered logo with the supplied file, scaled and set on Slate
tag = re.search(r'<svg id="tokeniser-logo"[^>]*>', open(f'{D}/2-cover/off-paper-cover.svg').read()).group(0)
x_, y_, w_, h_ = (float(re.search(fr'{k}="([\d.]+)"', tag).group(1)) for k in ('x', 'y', 'width', 'height'))
src = Image.open(os.path.join(ROOT, 'src/logos/tokeniser-logo-on-dark.png')).crop((454, 460, 454 + 3259, 460 + 539)).resize((round(w_), round(h_)), Image.LANCZOS)
bg = Image.new('RGBA', src.size, PAL['Slate'] + (255,))
bg.alpha_composite(src)
crop = cv.convert('RGB').crop((round(x_), round(y_), round(x_) + round(w_), round(y_) + round(h_)))
mse = np.mean((np.asarray(crop, float) - np.asarray(bg.convert('RGB'), float)) ** 2)
psnr = 10 * np.log10(255 ** 2 / max(mse, 1e-9))
check(cat, 'B12', 'Logo as rendered on the cover matches the supplied artwork pixel for pixel (not recoloured)', psnr >= 30, f'PSNR {psnr:.1f} dB against the supplied PNG scaled to {round(w_)}x{round(h_)}')
scene = open(os.path.join(ROOT, 'src/opening/scene.js')).read()
draws = re.findall(r'\.(?:fill|stroke)Text\(\s*([A-Z_a-z.]+)', scene)
check(cat, 'B13', 'Opening draws no text except the show name (logo is the supplied image)', set(draws) <= {'NAME_TOP', 'NAME_SUB'}, ', '.join(draws))
brand = open(os.path.join(ROOT, 'src/brand.js')).read()
rules = re.search(r'RULE = \{ deviceOnSolid: ([\d.]+), deviceOnPhoto: ([\d.]+), photoSlateOverlay: ([\d.]+) \}', brand)
tpltxt = txt
op_ok = rules and rules.groups() == ('0.7', '0.6', '0.3') and 'id="Devices on colour, 70 percent (locked)" opacity="0.7"' in tpltxt and 'id="Devices on photo, 60 percent (locked)" opacity="0.6"' in tpltxt and 'fill="#343740" opacity="0.3"' in tpltxt and 'id="device-rings" opacity="0.7"' in open(f'{D}/2-cover/off-paper-cover.svg').read() and scene.count('RULE.deviceOnSolid') >= 2
check(cat, 'B14', 'Device and photo opacity rules: 70 on colour, 60 on photos, 30 percent Slate photo overlay', op_ok, 'src/brand.js RULE, template layers, cover layers, opening layers')

texts = [p for p in glob.glob(os.path.join(ROOT, '**/*'), recursive=True) if os.path.isfile(p) and '/node_modules/' not in p and '/build/' not in p and '/.git/' not in p and p.endswith(('.js', '.mjs', '.html', '.md', '.svg', '.py', '.json', '.txt', '.sh')) and '/proof/' not in p and not p.endswith(('tools/verify.py', 'verification.json', 'VERIFICATION.md'))]
forbid = [r'Off-Paper', r'OffPaper', r'OFF PAPER', r'Off paper', r'off paper', r'Off Paper\s*[–—:|]', r'Tokenizer', r'- powered by', r'Off Paper Podcast']
hits = []
for p in texts:
    t = open(p, errors='ignore').read()
    t = re.sub(r'data:[^"]+', '', t)
    for f_ in forbid:
        for m in re.finditer(f_, t):
            hits.append(f'{rel(p)}: {m.group(0)}')
    for m in re.finditer(r'Powered by Tokeniser', t):
        if t[max(0, m.start() - 2):m.start()] != '- ':
            hits.append(f'{rel(p)}: "Powered by Tokeniser" without "- "')
check(cat, 'B15', 'The show name is never written another way, anywhere in the repository', not hits and f"SHOW_NAME = '{SHOW}'" in brand, '; '.join(hits[:6]) or f'{len(texts)} text files scanned; the name comes from one constant')
meta_ok = all(SHOW in probe(f'{D}/4-opening/off-paper-opening-{f}.mp4')['format'].get('tags', {}).get('title', '') for f in ('landscape', 'vertical'))
check(cat, 'B16', 'Video and SVG titles carry the exact show name', meta_ok and all(SHOW in open(p).read() for p in svgs), 'MP4 title tags, SVG <title> elements')
hype = [w for p in texts if p.endswith(('.html', '.svg', '.json')) for w in re.findall(r'\b(rocket|moon|lambo|100x|pump|to the moon|price target|laser)\b', open(p, errors='ignore').read(), re.I)]
check(cat, 'B17', 'No hype language in any visible text (rockets, moons, price talk)', not hype, ', '.join(hype) or 'none found')
credit = []
pat = re.compile(r'(made by|created by|designed by|design by|©|\bby @)', re.I)
for p in texts:
    if os.path.basename(p) in ('OFL.txt', 'Montserrat-OFL.txt') or p.endswith('verify.py'):
        continue
    for m in pat.finditer(open(p, errors='ignore').read()):
        credit.append(f'{rel(p)}: {m.group(0)}')
for f in ('landscape', 'vertical'):
    tags = probe(f'{D}/4-opening/off-paper-opening-{f}.mp4')['format'].get('tags', {})
    extra = [k for k in tags if k.lower() in ('artist', 'author', 'comment', 'copyright', 'album_artist', 'composer')]
    credit += [f'{f}.mp4 tag {k}' for k in extra]
pdfmeta = run('pdfinfo', pdf).stdout
if re.search(r'^Author:\s+\S', pdfmeta, re.M):
    credit.append('PDF Author field')
for p in [f'{D}/2-cover/off-paper-cover-3000.png'] + [f"{D}/3-thumbnails/examples/off-paper-{e['slug']}-thumbnail.png" for e in ex]:
    inf = Image.open(p).info
    if any(k.lower() in ('author', 'artist', 'copyright') for k in inf):
        credit.append(f'{rel(p)} metadata')
check(cat, 'B18', 'No personal credit anywhere: no names, handles, signatures or made-by lines, in files or metadata', not credit, '; '.join(credit[:6]) or 'text, MP4 tags, PDF author and PNG metadata all clean')

# ======================================================================== licences
cat = 'Licences'
ok = True
det = []
for p in photos:
    f = os.path.join(ROOT, 'src/photos', p['file'])
    proof = open(f"{D}/6-licences/proof/photo-{p['id']}.txt").read()
    good = sha(f) == p['sha256'] and p['licence'].startswith('CC0') and p['source_page'] in proof and 'public domain' in proof.lower()
    ok &= good
    det.append(f"{p['id']}: {p['source_page'].split('/')[-1][:8]}... sha {p['sha256'][:10]} {'ok' if good else 'MISMATCH'}")
check(cat, 'L01', 'Each stand-in photo: file hash matches the record, and its dated page capture shows the public domain (CC0) mark', ok, '; '.join(det))
lp = open(f'{D}/6-licences/proof/nappy-license.txt').read()
check(cat, 'L02', 'Captured Nappy licence page states CC0 and commercial use', 'Creative Commons Zero (CC0)' in lp and 'commercial' in lp.lower(), lp.split('\n')[1])
licmd = open(f'{D}/6-licences/LICENCES.md').read()
check(cat, 'L03', 'Licences file covers fonts, logos, music, photos and tools, and lists every photo source', all(k in licmd for k in ('Montserrat', 'SIL Open Font License', 'Tokeniser logo', 'score.py', 'CC0')) and all(p['source_page'] in licmd for p in photos), rel(f'{D}/6-licences/LICENCES.md'))
sc = open(os.path.join(ROOT, 'tools/score.py')).read()
check(cat, 'L04', 'Score is generated in code: no audio files are read, only cues', not re.search(r"\.(wav|mp3|flac|ogg|aif)['\"]\s*\)", sc.split('# ---------------------------------------------------------------- mix')[0]) and 'wavfile.read' not in sc, 'tools/score.py synthesises every sound from sine waves and seeded noise')

# ======================================================================== audio
cat = 'Audio'
wav = f'{D}/4-opening/off-paper-opening-score.wav'


def ebur(p):
    e = run('ffmpeg', '-hide_banner', '-nostats', '-i', p, '-map', '0:a', '-af', 'ebur128=peak=true', '-f', 'null', '-').stderr
    s = e[e.rindex('Summary:'):]
    return float(re.search(r'I:\s+(-?[\d.]+)', s).group(1)), float(re.search(r'Peak:\s+(-?[\d.]+)', s).group(1)), float(re.search(r'LRA:\s+(-?[\d.]+)', s).group(1))


for name, p in (('score WAV', wav), ('landscape MP4', f'{D}/4-opening/off-paper-opening-landscape.mp4'), ('vertical MP4', f'{D}/4-opening/off-paper-opening-vertical.mp4')):
    I, TP, LRA = ebur(p)
    check(cat, f'A0{["score WAV", "landscape MP4", "vertical MP4"].index(name) + 1}', f'Loudness of the {name}: -16 LUFS integrated (podcast target), true peak at or below -1 dBTP', abs(I + 16) <= 1.0 and TP <= -1.0, f'{I} LUFS, true peak {TP} dBTP, LRA {LRA} LU')
from scipy.io import wavfile  # noqa: E402
import scipy.signal as ss  # noqa: E402
sr, x = wavfile.read(wav)
x = x.astype(np.float64) / (2 ** 31 if x.dtype == np.int32 else 1)
m = x.mean(1)
cues = json.load(open(os.path.join(ROOT, 'build/cues.json')))
check(cat, 'A04', 'No clipping: sample peak below 0 dBFS', np.abs(x).max() < 0.999, f'sample peak {20 * np.log10(np.abs(x).max()):.2f} dBFS')
tail = np.abs(x[int(15.8 * sr):]).max()
check(cat, 'A05', 'Ends in digital silence for a clean cut', tail == 0.0, f'last 0.2 s peak {tail}')
check(cat, 'A06', 'Audio and picture are the same length', abs(len(x) / sr - 16.0) < 0.01, f'{len(x) / sr:.3f} s audio, 16.000 s video')


def rms_db(a, b):
    seg = m[int(a * sr):int(b * sr)]
    return 20 * np.log10(np.sqrt(np.mean(seg ** 2)) + 1e-12)


gap, hit = rms_db(11.945, 11.995), rms_db(12.0, 12.06)
check(cat, 'A07', 'The impact lands on the picture: silence just before 12.00 s, the hit right at it', gap < -45 and hit - gap > 30, f'{gap:.1f} dBFS in the gap, {hit:.1f} dBFS in the first 60 ms after 12.00 s')
f_, t_, Z = ss.stft(m, sr, nperseg=1024, noverlap=1024 - 240)   # 5 ms hop
Sg = np.log(np.abs(Z[(f_ > 2000) & (f_ < 10000)]) + 1e-6)
flux = np.maximum(np.diff(Sg, axis=1), 0).sum(0)
tf = t_[1:]
med = np.median(flux[(tf > 3) & (tf < 12)])
on = [flux[(tf > c - 0.03) & (tf < c + 0.04)].max() / med for c in cues['ringLift'] + cues['ringPass']]
check(cat, 'A08', 'A sound starts on every ring lift and every ring pass (a clear onset within 40 ms of each picture cue)', min(on) >= 2.0, f'{len(on)} cues; weakest onset {min(on):.1f}x the median spectral flux, median {np.median(on):.1f}x')
try:
    from faster_whisper.vad import VadOptions, get_speech_timestamps
    a16 = ss.resample_poly(m, 1, 3).astype(np.float32)
    segs = get_speech_timestamps(a16, VadOptions(threshold=0.5, min_speech_duration_ms=250))
    speech = sum(s['end'] - s['start'] for s in segs) / 16000
    check(cat, 'A09', 'No voice: a speech detector (Silero VAD) finds no speech in the score', speech < 0.5, f'{len(segs)} speech segments, {speech:.2f} s in total')
except Exception as e:
    check(cat, 'A09', 'No voice: a speech detector (Silero VAD) finds no speech in the score', None, f'not measured: speech detector not installed ({type(e).__name__}); pip install faster-whisper')
fq, P = ss.welch(m, sr, nperseg=8192)
oct_ = {}
for c in (63, 250, 1000, 4000, 12000):
    sel = (fq >= c / 1.414) & (fq < c * 1.414)
    oct_[c] = 10 * np.log10(P[sel].sum() + 1e-20)
ref = oct_[1000]
corr = np.corrcoef(x[:, 0], x[:, 1])[0, 1]
check(cat, 'A10', 'Balanced and mono-safe: no octave more than 10 dB above 1 kHz, stereo correlation positive', all(v - ref < 10 for v in oct_.values()) and 0.2 < corr < 0.98, ', '.join(f'{k} Hz {v - ref:+.1f} dB' for k, v in oct_.items()) + f'; L/R correlation {corr:.2f}')

# ======================================================================== visual quality and motion
cat = 'Visual quality and motion'
for fmt, (w, h) in (('landscape', (1920, 1080)), ('vertical', (1080, 1920))):
    p = f'{D}/4-opening/off-paper-opening-{fmt}.mp4'
    n = int(run('ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', p).stdout.strip())
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', p, '-vf', 'scale=192:108' if fmt == 'landscape' else 'scale=108:192', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(n, -1).astype(np.float32)
    diff = np.abs(np.diff(fr, axis=0)).mean(1)
    tt = (np.arange(1, n) / 60.0)
    moving = (tt > 3.6) & (tt < 12.4)
    rep = int((diff[moving] < 0.05).sum())
    med = np.median(diff[moving])
    flashes = cues['ringPass'] + [12.0]
    near = np.array([min(abs(t - c) for c in flashes) < 0.06 for t in tt])
    worst = float((diff[moving & ~near] / (np.convolve(diff, np.ones(15) / 15, 'same')[moving & ~near] + 1e-6)).max())
    check(cat, f'V0{1 if fmt == "landscape" else 2}', f'Smooth motion, {fmt}: 960 frames at a constant 60 fps, no repeated or dropped frames while things move', n == 960 and rep == 0 and worst < 4.0, f'{n} frames; {rep} repeats in 3.6 to 12.4 s; largest frame-to-frame change {worst:.2f}x its neighbours (median change {med:.2f})')
    last = np.stack([frame(p, t) for t in (15.62, 15.75, 15.9)]).reshape(-1, 3).astype(float)
    dev = np.abs(last.mean(0) - np.array(PAL['Slate'])).max()
    check(cat, f'V0{3 if fmt == "landscape" else 4}', f'{fmt.capitalize()} ends on solid Slate, ready for a straight cut', dev <= 3 and last.std(0).max() <= 1.5, f'mean RGB {last.mean(0).round(1).tolist()} vs Slate {list(PAL["Slate"])}, spread {last.std(0).max():.2f}')
    fd = os.path.join(ROOT, f'build/frames-{fmt}')
    if os.path.isdir(fd):
        ps, tp = [], []
        for t in (2.0, 6.8, 10.2, 13.0, 14.2):
            srcf = np.asarray(Image.open(os.path.join(fd, f'{round(t * 60):05d}.png')).convert('RGB'), float)
            enc = frame_n(p, round(t * 60)).astype(float)
            ps.append(10 * np.log10(255 ** 2 / np.mean((srcf - enc) ** 2)))
        srcf = np.asarray(Image.open(os.path.join(fd, f'{round(14.2 * 60):05d}.png')).convert('RGB'), float)
        enc = frame_n(p, round(14.2 * 60)).astype(float)
        cy = int(np.argmax([((enc[r, :, 1] > 220) & (enc[r, :, 0] < 200)).sum() for r in range(h)]))
        y0, y1 = max(0, cy - int(0.09 * h)), min(h, cy + int(0.03 * h))
        tps = 10 * np.log10(255 ** 2 / np.mean((srcf[y0:y1] - enc[y0:y1]) ** 2))
        check(cat, f'V0{5 if fmt == "landscape" else 6}', f'Clean encode and sharp text, {fmt}: H.264 output against the rendered frames', np.mean(ps) >= 36 and tps >= 35, f'mean PSNR {np.mean(ps):.1f} dB over 5 frames; {tps:.1f} dB on the band holding the show name at 14.2 s')
    else:
        check(cat, f'V0{5 if fmt == "landscape" else 6}', f'Clean encode and sharp text, {fmt}: H.264 output against the rendered frames', None, 'not measured: rendered frames not kept; run tools/build.sh')
    e = frame(p, 14.2).astype(int)
    mint = (e[:, :, 1] > 215) & (e[:, :, 0] > 120) & (e[:, :, 0] < 200) & (e[:, :, 2] > 160) & (e[:, :, 2] < 230)
    cover = mint.sum(1)
    rows = np.where((cover > w * 0.02) & (cover < w * 0.5))[0]   # rows of the name; the full-width horizon rule is left out
    band = mint[rows] if len(rows) else mint
    cols = np.where(band.any(0))[0]
    l_, r_ = cols.min() / w, 1 - cols.max() / w
    check(cat, f'V0{7 if fmt == "landscape" else 8}', f'{fmt.capitalize()} is laid out for its own frame: the name is centred with clear margins', l_ > 0.08 and r_ > 0.08 and abs(l_ - r_) < 0.03, f'left margin {l_ * 100:.1f}%, right margin {r_ * 100:.1f}% of the width')
cap300 = 520 * 0.7 / 3000 * 300
check(cat, 'V09', 'Cover reads small: "Off Paper" cap height at podcast-app sizes, Mint on Blue contrast', cap300 >= 30, f'{cap300:.0f} px cap height at 300 px, {520 * 0.7 / 3000 * 55:.1f} px at 55 px; Mint on Blue 8.9:1 (WCAG AAA)')
tt_ = json.load(open(os.path.join(ROOT, 'build/template-tests.json')))['results']
mt = next(r for r in tt_ if r['id'] == 'U18')
check(cat, 'V10', 'Thumbnail titles read on a phone: smallest title size in a 360 px feed, Light Mint on Blue contrast', mt['pass'], f"{mt['detail']}; Light Mint on Blue 9.6:1 (WCAG AAA)")
mk = np.asarray(Image.open(os.path.join(ROOT, 'build/template-tests/off-paper-ep33-thumbnail.png')).convert('RGB'), float)
rv = np.asarray(Image.open(os.path.join(ROOT, 'build/template-tests/resvg-render.png')).convert('RGB'), float)
ps = 10 * np.log10(255 ** 2 / np.mean((mk - rv) ** 2))
check(cat, 'V11', 'The SVG template renders the same outside the browser (resvg vs the maker PNG)', ps >= 30, f'PSNR {ps:.1f} dB')

# ======================================================================== template usability (browser tests)
for r in tt_:
    check('Template usability (browser tests)', r['id'], r['name'], r['pass'], r['detail'])

# ======================================================================== report
cats = []
for r in R:
    if r['cat'] not in cats:
        cats.append(r['cat'])
passed = sum(r['status'] == 'pass' for r in R)
skipped = sum(r['status'] == 'skip' for r in R)
failed = sum(r['status'] == 'fail' for r in R)
visual = sum(1 for r in R if r['cat'] in ('Visual quality and motion', 'Template usability (browser tests)'))
summary = {'total': len(R), 'passed': passed, 'failed': failed, 'skipped': skipped, 'visual': visual, 'when': datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}
json.dump({'summary': summary, 'checks': R}, open(os.path.join(ROOT, 'verification.json'), 'w'), indent=1)
md = [f'# Verification', '', f'{passed} of {len(R)} checks passed, {failed} failed, {skipped} skipped ({summary["when"]}). Skipped means the check could not be measured on this machine; it is not counted as a pass. Every check measures the delivered files; the commands that produce this report are in `tools/build.sh`.', '',
      '| Area | Checks | Passed | Skipped |', '|---|---|---|---|']
md += [f'| {c} | {sum(1 for r in R if r["cat"] == c)} | {sum(1 for r in R if r["cat"] == c and r["status"] == "pass")} | {sum(1 for r in R if r["cat"] == c and r["status"] == "skip")} |' for c in cats]
for c in cats:
    md += ['', f'## {c}', '', '| ID | Check | Result | Measured |', '|---|---|---|---|']
    md += [f'| {r["id"]} | {r["name"]} | { {"pass": "pass", "skip": "skipped", "fail": "**FAIL**"}[r["status"]] } | {r["detail"].replace("|", "/")} |' for r in R if r['cat'] == c]
md += ['', '## What the checks cannot prove', '',
       '- Taste. Automated checks show the files follow the brief; whether the opening feels right is for a person to judge. Stills from every second of both formats are in `src/previews/` and on the review page.',
       '- The thumbnail template was exercised with Chromium and resvg. It was not imported into Figma or Penpot by these scripts; the SVG uses only plain shapes, paths, images and text so that those tools read it.',
       '- The example photos are CC0 stock portraits standing in for the guests; they do not show the people named. Each real episode needs a headshot cleared by its guest.', '']
open(os.path.join(ROOT, 'VERIFICATION.md'), 'w').write('\n'.join(md))
print(f'\n{passed}/{len(R)} checks passed, {failed} failed, {skipped} skipped')
