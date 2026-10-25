"""Small preview images for the identity sheet and the review page, cut from the rendered deliverables.
Usage: python3 tools/previews.py
"""
import os
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src/previews')
D = os.path.join(ROOT, 'deliverables')
os.makedirs(OUT, exist_ok=True)


def ff(*a):
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *a], check=True)


ff('-i', f'{D}/2-cover/off-paper-cover-3000.png', '-vf', 'scale=900:900:flags=lanczos', '-q:v', '3', f'{OUT}/cover.jpg')
for ep in ('ep21', 'ep28', 'ep29'):
    ff('-i', f'{D}/3-thumbnails/examples/off-paper-{ep}-thumbnail.png', '-vf', 'scale=960:540:flags=lanczos', '-q:v', '3', f'{OUT}/{ep}.jpg')
for opt, eps in (('option-b-silhouette', ('ep21', 'ep28', 'ep29')), ('option-c-fictional', ('ep01', 'ep02', 'ep03'))):
    for ep in eps:
        ff('-i', f'{D}/3-thumbnails/examples/{opt}/off-paper-{ep}-thumbnail.png', '-vf', 'scale=960:540:flags=lanczos', '-q:v', '3', f'{OUT}/{opt}-{ep}.jpg')
ff('-i', f'{D}/3-thumbnails/template/off-paper-thumbnail-template-preview.png', '-vf', 'scale=960:540:flags=lanczos', '-q:v', '3', f'{OUT}/template.jpg')

# storyboard frames from both openings (seconds)
for fmt, scale in (('landscape', '640:360'), ('vertical', '360:640')):
    src = f'{D}/4-opening/off-paper-opening-{fmt}.mp4'
    if not os.path.exists(src):
        continue
    for t in (1.5, 4.6, 6.8, 10.2, 12.6, 14.2):
        ff('-ss', str(t), '-i', src, '-frames:v', '1', '-vf', f'scale={scale}:flags=lanczos', '-q:v', '3', f'{OUT}/{fmt}-{t:04.1f}.jpg')
    ff('-ss', '14.2', '-i', src, '-frames:v', '1', '-q:v', '2', f'{OUT}/{fmt}-poster.jpg')
print('previews written to', os.path.relpath(OUT, ROOT))
