#!/usr/bin/env python3
"""Fit the edit's 26 word-slots to where the words are actually sung in a clip.

Inputs: a word TIMING map (tools/word_times.py: start/end of every sung word, no text) and the clip's beat grid.
It picks the clip window, deals the sung words into the slots in order (1-4 words per slot) so that every
slot enters as close as possible to the onset of its first word, and writes a timing file the renderer uses:
tempo, first beat, where the clip starts, a time-warp anchor per slot, and the number of words per slot.

  python3 tools/fit_slots.py --words song.words.json --bpm 116 --phase 0.135 --out song.timing.json
  python3 tools/fit_slots.py --words song.words.json --bpm 116 --phase 0.135 --start 4.16 --out song.timing.json
"""
import argparse, json

ap = argparse.ArgumentParser()
ap.add_argument('--words', required=True); ap.add_argument('--bpm', type=float, required=True)
ap.add_argument('--phase', type=float, required=True, help='time of any beat in the clip (seconds)')
ap.add_argument('--start', type=float, default=None, help='clip time where the edit starts (default: best fit)')
ap.add_argument('--out', default='song.timing.json'); ap.add_argument('--max-shift', type=float, default=0.30)
a = ap.parse_args()

REF_FPS, REF_BPM, REF_PHASE, OFFSET = 30.0, 114.0, 0.116, 0.116
SLOTS = [('s01', 2), ('s02', 13), ('s03', 21), ('s04', 34), ('s05', 54), ('s06', 68), ('s07', 88), ('s08', 122), ('s10', 140), ('s11', 160),
         ('s12', 177), ('s13', 189), ('s14', 200), ('s15', 220), ('s16', 243), ('s17', 317), ('s20', 370), ('s21', 379), ('s22', 396),
         ('s23', 419), ('s24', 426), ('s25', 440), ('s26', 456), ('s27', 462), ('s28', 479), ('s29', 497)]
PRE = 15                       # slots before the wordless interlude (reference frames 267-316)
INTER = (262, 312); SPLIT = 290; LAST_WORD_RF = 520; END_RF = 617
FIXED = [0, 77, 115, 265, 285, 303, 335, 366, 414, 495, 524, 571, 587, 617, 658]  # beat-locked hits

T = 60.0 / a.bpm
t_edit = lambda rf: OFFSET + (rf / REF_FPS - REF_PHASE) * (REF_BPM / a.bpm)
D = json.load(open(a.words)); W = [w['t0'] for w in D['words']]; dur = D.get('duration') or (W[-1] + 2)


def dp(times, slots, w0, last_max=6, gmax=4):
    """times: onsets of the words in this part; slots: [(id, rf)]. Returns (cost, starts[]) or None."""
    n, m = len(slots), len(times)
    if m < n:
        return None
    gbar = m / n; INF = 1e18
    cost = lambda i, j: (times[j] - (w0 + t_edit(slots[i][1]))) ** 2
    f = [[INF] * m for _ in range(n)]; back = [[-1] * m for _ in range(n)]
    f[0][0] = cost(0, 0)
    for i in range(1, n):
        for j in range(i, m):
            for g in range(1, gmax + 1):
                jp = j - g
                if jp < 0 or f[i - 1][jp] >= INF:
                    continue
                c = f[i - 1][jp] + cost(i, j) + 0.004 * (g - gbar) ** 2
                if c < f[i][j]:
                    f[i][j] = c; back[i][j] = jp
    best = (INF, -1)
    for j in range(n - 1, m):
        g = m - j
        if g <= last_max and f[n - 1][j] < INF:
            c = f[n - 1][j] + 0.004 * (g - gbar) ** 2
            if c < best[0]:
                best = (c, j)
    if best[1] < 0:
        return None
    starts = [best[1]]
    for i in range(n - 1, 0, -1):
        starts.append(back[i][starts[-1]])
    return best[0], starts[::-1]


def fit(w0):
    lo, mid, hi = w0 + t_edit(0) - 0.05, w0 + t_edit(SPLIT), w0 + t_edit(LAST_WORD_RF) + 0.15
    pre = [t for t in W if lo <= t < mid]; post = [t for t in W if mid <= t <= hi]
    r1 = dp(pre, SLOTS[:PRE], w0); r2 = dp(post, SLOTS[PRE:], w0)
    if not r1 or not r2:
        return None
    lost = sum(1 for t in W if w0 + t_edit(INTER[0]) + 0.25 < t < w0 + t_edit(INTER[1]) - 0.1)
    score = (r1[0] + r2[0]) / len(SLOTS) + 0.02 * lost
    return dict(w0=w0, score=score, pre=pre, post=post, s1=r1[1], s2=r2[1], lost=lost)


if a.start is not None:
    cands = [fit(a.start)]
else:
    cands = []
    k = 0
    while True:
        w0 = a.phase % T + k * T - OFFSET; k += 1
        if w0 < 0:
            continue
        if w0 + t_edit(END_RF) > dur + 0.5:
            break
        r = fit(w0)
        if r:
            cands.append(r)
    cands.sort(key=lambda r: r['score'])
cands = [c for c in cands if c]
if not cands:
    raise SystemExit('no window fits: the clip has too few sung words for the 26 slots, or is too short')
for c in cands[:4]:
    print('window start %6.3fs  score %.4f  words %d+%d  sung during the wordless interlude: %d' % (c['w0'], c['score'], len(c['pre']), len(c['post']), c['lost']))
B = cands[0]; w0 = B['w0']
onsets, groups = [], []
for part, starts, slots in ((B['pre'], B['s1'], SLOTS[:PRE]), (B['post'], B['s2'], SLOTS[PRE:])):
    for i in range(len(slots)):
        nxt = starts[i + 1] if i + 1 < len(starts) else len(part)
        onsets.append(part[starts[i]] - w0); groups.append(nxt - starts[i])
slope = (REF_BPM / a.bpm) / REF_FPS
anchors = {}
for (sid, rf), t in zip(SLOTS, onsets):
    nom = t_edit(rf); anchors[rf] = nom + max(-a.max_shift, min(a.max_shift, t - nom))
for rf in FIXED:
    if all(abs(rf - s) > 6 for s in anchors):
        anchors[rf] = t_edit(rf)
A = sorted(anchors.items())
for _ in range(60):  # keep the warp gentle: local speed between 0.4x and 2.5x of the beat map
    ok = True
    for i in range(1, len(A)):
        (r0, t0), (r1, t1) = A[i - 1], A[i]; nom = (r1 - r0) * slope
        if not (0.4 * nom <= t1 - t0 <= 2.5 * nom):
            ok = False; A[i] = (r1, t1 + 0.5 * ((t_edit(r1)) - t1)); A[i - 1] = (r0, t0 + 0.25 * (t_edit(r0) - t0))
    if ok:
        break
shifts = [dict(A)[rf] - t_edit(rf) for _, rf in SLOTS]
out = {'bpm': round(a.bpm, 3), 'offset': OFFSET, 'audioStart': round(w0, 3), 'anchors': [[rf, round(t, 4)] for rf, t in A], 'groups': groups,
       'words': sum(groups), 'window': [round(w0, 3), round(w0 + t_edit(END_RF), 3)], 'slots': [s for s, _ in SLOTS]}
json.dump(out, open(a.out, 'w'), indent=1)
print('\nclip window %.2f-%.2fs | %d sung words -> 26 slots | words per slot: %s' % (out['window'][0], out['window'][1], out['words'], ' '.join(map(str, groups))))
print('slot shift vs the pure beat map (ms): ' + ' '.join('%+d' % round(s * 1000) for s in shifts))
print('wrote', a.out)
