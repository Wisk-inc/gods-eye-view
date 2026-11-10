#!/usr/bin/env python3
"""Contact sheet of rendered stills, optionally paired with reference frames (reference on top).

  python3 tools/sheet.py --frames <dir> --list 21,24,27 --out sheet.jpg [--ref <dir>] [--cols 6] [--tw 320]

Rendered stills are named f_<frame:04d>.jpg (0-based reference-frame numbers).
Reference frames are ffmpeg-style f_<frame+1:04d>.jpg (1-based).
"""
import argparse, os
from PIL import Image, ImageDraw, ImageFont

ap = argparse.ArgumentParser()
ap.add_argument('--frames', required=True); ap.add_argument('--list', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--ref', default=None); ap.add_argument('--cols', type=int, default=6); ap.add_argument('--tw', type=int, default=320)
a = ap.parse_args()
frames = [int(x) for x in a.list.split(',') if x != '']
tw = a.tw; th = int(tw * 9 / 16); pair = a.ref is not None
cell_h = (th * 2 + 4 if pair else th) + 18
cols = a.cols; rows = (len(frames) + cols - 1) // cols
W, H = cols * (tw + 4) + 4, rows * (cell_h + 4) + 4
sheet = Image.new('RGB', (W, H), (34, 34, 52)); d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 12)
except Exception:
    font = ImageFont.load_default()
for k, f in enumerate(frames):
    x = 4 + (k % cols) * (tw + 4); y = 4 + (k // cols) * (cell_h + 4)
    d.text((x + 2, y), ('f%d  %.2fs' % (f, f / 30.0)) + ('   ref / ours' if pair else ''), fill=(255, 230, 120), font=font)
    yy = y + 15
    if pair:
        rp = os.path.join(a.ref, 'f_%04d.jpg' % (f + 1))
        if os.path.exists(rp):
            sheet.paste(Image.open(rp).convert('RGB').resize((tw, th), Image.LANCZOS), (x, yy))
        yy += th + 4
    p = os.path.join(a.frames, 'f_%04d.jpg' % f)
    if os.path.exists(p):
        sheet.paste(Image.open(p).convert('RGB').resize((tw, th), Image.LANCZOS), (x, yy))
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
sheet.save(a.out, quality=88)
print('sheet', a.out, sheet.size)
