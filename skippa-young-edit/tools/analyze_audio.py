#!/usr/bin/env python3
"""Find the tempo and the first beat of an audio clip (numpy + ffmpeg only).

  python3 tools/analyze_audio.py my_clip.mp3            # human-readable
  python3 tools/analyze_audio.py my_clip.mp3 --json     # {"bpm":..,"offset":..,"alt_bpm":..}

`offset` is the time (seconds) of the first strong beat: pass it to render.mjs as --offset so the edit's
beat 0 (its first hit) lands on it. `--start S` analyses the clip from S seconds in (use with --audio-start).
"""
import argparse, json, subprocess, sys
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('audio'); ap.add_argument('--json', action='store_true'); ap.add_argument('--start', type=float, default=0.0)
ap.add_argument('--lo', type=float, default=70.0); ap.add_argument('--hi', type=float, default=180.0)
a = ap.parse_args()

SR = 22050
cmd = ['ffmpeg', '-v', 'error', '-ss', str(a.start), '-i', a.audio, '-ac', '1', '-ar', str(SR), '-f', 's16le', '-']
raw = subprocess.run(cmd, capture_output=True).stdout
if len(raw) < SR:
    sys.exit('could not decode audio (is ffmpeg installed and the file readable?)')
y = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0

hop, nfft = 256, 1024
win = np.hanning(nfft).astype(np.float32)
nfr = 1 + (len(y) - nfft) // hop
idx = np.arange(nfft)[None, :] + hop * np.arange(nfr)[:, None]
mag = np.abs(np.fft.rfft(y[idx] * win, axis=1))
logm = np.log1p(100 * mag)
flux = np.maximum(0, np.diff(logm, axis=0)).sum(axis=1)
flux = np.concatenate([[0], flux]); fr = SR / hop
freqs = np.fft.rfftfreq(nfft, 1 / SR)
lowflux = np.maximum(0, np.diff(logm[:, freqs < 150], axis=0)).sum(axis=1); lowflux = np.concatenate([[0], lowflux])
e = flux / (flux.max() + 1e-9); el = lowflux / (lowflux.max() + 1e-9)

o = e - e.mean(); ac = np.correlate(o, o, mode='full')[len(o) - 1:]; ac /= ac[0] + 1e-9


def ac_at(lag):
    i0 = int(lag)
    return 0.0 if i0 + 1 >= len(ac) else ac[i0] * (1 - (lag - i0)) + ac[i0 + 1] * (lag - i0)


def comb(env, bpm):
    T = 60.0 / bpm * fr; best = (0.0, 0.0)
    for ph in np.arange(0, T, 1.0):
        ii = np.round(np.arange(ph, len(env) - 2, T)).astype(int)
        s = np.maximum.reduce([env[np.clip(ii + k, 0, len(env) - 1)] for k in (-1, 0, 1)]).mean()
        if s > best[0]:
            best = (s, ph / fr)
    return best


cands = []
for bpm in np.arange(a.lo, a.hi + 0.01, 0.5):
    lag = 60.0 / bpm * fr
    cands.append((ac_at(lag) + 0.5 * ac_at(lag * 2) + 0.33 * ac_at(lag * 3) + 0.25 * ac_at(lag * 4), bpm))
cands.sort(reverse=True)
best = None
for score, bpm in cands[:6]:
    for fine in np.arange(bpm - 0.5, bpm + 0.51, 0.1):
        s, ph = comb(0.6 * e + 0.4 * el, fine)
        if best is None or s > best[0]:
            best = (s, fine, ph)
_, bpm, phase = best
beat = 60.0 / bpm
# choose the downbeat-ish phase: among beat phases, prefer the one whose hits carry the most low-band energy
alts = []
for k in range(2):
    ph = (phase + k * beat / 2) % beat
    ii = np.round(np.arange(ph * fr, len(el) - 2, beat * fr)).astype(int)
    alts.append((el[np.clip(ii, 0, len(el) - 1)].mean(), ph))
phase = max(alts)[1]
first = phase
while first < 0.03:
    first += beat
res = {'bpm': round(float(bpm), 2), 'offset': round(float(first), 3), 'alt_bpm': round(float(bpm * 2 if bpm < 100 else bpm / 2), 2), 'beats_per_edit': 38.85, 'edit_seconds': round(38.85 * beat + first, 2)}
if a.json:
    print(json.dumps(res))
else:
    print('tempo      %.2f BPM   (if it feels half/double time, try %.2f)' % (res['bpm'], res['alt_bpm']))
    print('first beat %.3f s   -> node render.mjs --audio "%s" --bpm %.2f --offset %.3f' % (res['offset'], a.audio, res['bpm'], res['offset']))
    print('the edit will run %.2f s at this tempo' % res['edit_seconds'])
