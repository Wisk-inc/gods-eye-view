#!/usr/bin/env python3
"""Build song.timing.json: the pacing of the edit on a song's beat grid.

Every word-slot (and every wordless beat of the edit) is listed with the reference frame where it starts and the
beat of the song it should land on. Between two slots the edit does not run at constant speed: letters arrive
and leave at close to their natural speed, and the time that is left over goes to the HOLD, where the finished
word sits still enough to be read. The engine rounds the speed changes into ramps (`smooth`).

  python3 tools/make_pacing.py --bpm 103 --out song.timing.json

Columns: (rf_in, beat, rf_formed, rf_exit)   rf_formed / rf_exit = None -> run that stretch at even speed.
"""
import argparse, json, os
SLOTS = [
    (3, 0, 4.5, 7.5),           # s01
    (12, 2, 13.5, 17.5),        # s02
    (21, 3.5, 24, 29),          # s03
    (33, 5, 36.5, 42),          # s04
    (48, 7, 59, 64),            # pillars + s05
    (67, 9.5, 70, 73.5),        # s06
    (78, 11, 99, 110),          # planet + s07
    (118, 15, 133, 136),        # s08
    (139, 18, 148, 153),        # s10
    (160, 20, 166, 174),        # s11
    (176.3, 21.5, 181, 186.5),  # s12
    (188.3, 23.5, 193, 198.5),  # s13
    (199.6, 25, 206, 217),      # s14
    (219.8, 28, 224, 236),      # s15
    (241, 30, 249, 262),        # s16
    (267, 32, None, None),      # interlude
    (316, 35, 328, 329),        # s17 small
    (337, 37, 341, 364),        # s17 full width
    (367, 40, 372, 375),        # s20
    (379, 41.5, 388, 392),      # s21
    (394.8, 43.5, 404, 410),    # s22
    (418.2, 46, 423, 425),      # s23
    (426, 47.5, 432, 438),      # s24
    (440, 49, 450, 452.5),      # s25
    (453, 51, 457, 460),        # s26
    (462, 52.5, 467, 469),      # s27
    (477.2, 54, 482.7, 486),    # s28
    (495.2, 56, 505, 517.6),    # s29
    (525, 59, None, None),      # outro: block ball
    (545, 61, 553, 566),        # medallion
    (569, 63, None, None),      # small medallion
    (585, 64, None, None),      # tunnel
    (594, 65, 598, 611),        # call to action
    (613, 67, None, None),      # punch out
    (617, 67.5, None, None),    # black
]
ap = argparse.ArgumentParser(); ap.add_argument('--bpm', type=float, default=103.0); ap.add_argument('--offset', type=float, default=0.12)
ap.add_argument('--hold', type=float, default=4.0, help='how much slower the hold runs than the entrance/exit'); ap.add_argument('--min', type=float, default=1.1, help='entrance/exit never faster than natural speed / this')
ap.add_argument('--smooth', type=float, default=0.12); ap.add_argument('--tail', type=float, default=0.6); ap.add_argument('--out', default=os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'song.timing.json'))
a = ap.parse_args(); beat = 60.0 / a.bpm; FPS = 30.0
anch = [(0.0, 0.0)]
for i, (r0, b0, r1, r2) in enumerate(SLOTS):
    T0 = a.offset + b0 * beat; anch.append((r0, T0))
    if i + 1 < len(SLOTS) and r1 is not None:
        r3, b3 = SLOTS[i + 1][0], SLOTS[i + 1][1]; T3 = a.offset + b3 * beat; T = T3 - T0
        e, h, x = r1 - r0, r2 - r1, r3 - r2; s = max(FPS * T / (e + a.hold * h + x), a.min); te, tx = e * s / FPS, x * s / FPS; th = T - te - tx
        if th > h / FPS: anch.append((r1, T0 + te)); anch.append((r2, T3 - tx))
anch.append((658, anch[-1][1] + a.tail))
for (r, t), (r2, t2) in zip(anch, anch[1:]): assert r2 > r and t2 > t, (r, t, r2, t2)
old = {}
if os.path.exists(a.out):
    try: old = json.load(open(a.out))
    except Exception: old = {}
out = {'bpm': a.bpm, 'offset': a.offset, 'smooth': a.smooth, 'anchors': [[round(r, 3), round(t, 4)] for r, t in anch]}
if 'groups' in old: out['groups'] = old['groups']
json.dump(out, open(a.out, 'w'), indent=1)
print('wrote %s: %.1f BPM, %d anchors, %.2f s' % (a.out, a.bpm, len(anch), anch[-1][1]))
for (r0, b0, r1, r2), nxt in zip(SLOTS, SLOTS[1:]):
    if r1 is None: continue
    t = dict(anch); print('  rf %6.1f beat %5.1f  slot %.2fs  in %.2fs  hold %.2fs' % (r0, b0, (nxt[1] - b0) * beat, t.get(r1, 0) - (a.offset + b0 * beat) if r1 in t else float('nan'), (t.get(r2, 0) - t.get(r1, 0)) if r1 in t and r2 in t else float('nan')))
