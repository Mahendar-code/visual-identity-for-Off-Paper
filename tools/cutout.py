"""Cuts the stand-in guest photos out of their backgrounds for the thumbnail coin.

Uses rembg (MIT licence) with the IS-Net general-use model (Apache 2.0). Both are tools: the
output is the CC0 photo with its background removed, which the CC0 licence allows.
Usage: pip install rembg onnxruntime && python3 tools/cutout.py
"""
import json
import os

from PIL import Image
from rembg import new_session, remove

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
photos = json.load(open(os.path.join(ROOT, 'src/photos/photos.json')))
session = new_session('isnet-general-use')
os.makedirs(os.path.join(ROOT, 'src/photos/cutout'), exist_ok=True)
for p in photos:
    im = Image.open(os.path.join(ROOT, 'src/photos', p['file'])).convert('RGB')
    im.thumbnail((1800, 1800))
    out = remove(im, session=session)
    out = out.crop(out.getchannel('A').getbbox())
    dst = os.path.join(ROOT, 'src/photos/cutout', p['file'].replace('.jpg', '.png'))
    out.save(dst, optimize=True)
    print('cut out', os.path.relpath(dst, ROOT), out.size)
