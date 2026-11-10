#!/usr/bin/env python3
"""Import overlay clips and images from an editing pack into engine/local/ (never committed).

Clips become frame atlases (8x8 cells of 480x270) that the finishing stack can screen over the picture;
images are resized and stored under friendly names for the scene kit.

  python3 tools/import_pack.py --clips <dir> --images <dir> --map pack.map.json

pack.map.json: {"clips": {"<source file>": "<name>", ...}, "images": {"<source file>": "<name>", ...}}
Only the files named in the map are imported. Check the licence of whatever you import.
"""
import argparse, json, os, subprocess
from PIL import Image

ap = argparse.ArgumentParser(); ap.add_argument('--clips'); ap.add_argument('--images'); ap.add_argument('--map', required=True)
ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine', 'local')); a = ap.parse_args()
M = json.load(open(a.map)); os.makedirs(os.path.join(a.out, 'ovl'), exist_ok=True); os.makedirs(os.path.join(a.out, 'img'), exist_ok=True)
COLS, ROWS, CW, CH = 8, 8, 480, 270; manifest = {'clips': {}, 'images': {}}
mp = os.path.join(a.out, 'manifest.json')
if os.path.exists(mp):
    manifest = json.load(open(mp))
for src, name in (M.get('clips') or {}).items():
    path = os.path.join(a.clips, src)
    if not os.path.exists(path): print('missing clip', src); continue
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip() or 1)
    n = min(COLS * ROWS, max(2, int(round(dur * 30)))); fps = n / dur
    out = os.path.join(a.out, 'ovl', name + '.jpg')
    vf = 'fps=%.5f,scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,tile=%dx%d' % (fps, CW, CH, CW, CH, COLS, ROWS)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-vf', vf, '-frames:v', '1', '-q:v', '3', out])
    if r.returncode == 0: manifest['clips'][name] = {'file': 'ovl/' + name + '.jpg', 'frames': n, 'cols': COLS, 'rows': ROWS, 'duration': round(dur, 3)}; print('clip', name, n, 'frames', '%.2fs' % dur)
for src, name in (M.get('images') or {}).items():
    path = os.path.join(a.images, src)
    if not os.path.exists(path): print('missing image', src); continue
    im = Image.open(path).convert('RGB'); im.thumbnail((1600, 1600)); im.save(os.path.join(a.out, 'img', name + '.jpg'), quality=88)
    manifest['images'][name] = {'file': 'img/' + name + '.jpg', 'w': im.width, 'h': im.height}; print('image', name, im.size)
json.dump(manifest, open(mp, 'w'), indent=1); print('wrote', mp)
