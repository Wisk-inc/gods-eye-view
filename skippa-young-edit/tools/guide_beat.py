#!/usr/bin/env python3
"""Original guide beat for the edit (synthesised here, no samples).

It exists so the flashes, whips and letter hits are audible while you work, and so you can line the real
song up against it. Kick/sub/snare/hat pattern on the beat grid, a dark pad, and impacts + risers on the
edit's big transitions.

  python3 tools/guide_beat.py --bpm 114 --offset 0.116 --duration 21.93 --out out/guide_beat.wav
"""
import argparse, wave
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('--bpm', type=float, default=114.0)
ap.add_argument('--offset', type=float, default=0.116, help='time of beat 0 in seconds')
ap.add_argument('--duration', type=float, default=21.93)
ap.add_argument('--out', default='out/guide_beat.wav')
a = ap.parse_args()

SR = 44100
N = int(a.duration * SR) + SR // 2
L = np.zeros(N); R = np.zeros(N)
rs = np.random.RandomState(7)
beat = 60.0 / a.bpm
REF_PHASE, REF_BPM = 0.116, 114.0


def t_of_beat(b):
    return a.offset + b * beat


def t_of_rf(rf):  # reference frame -> output seconds (same mapping as the engine)
    return a.offset + (rf / 30.0 - REF_PHASE) * (REF_BPM / a.bpm)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    n = min(len(sig), N - i)
    L[i:i + n] += sig[:n] * gain * (1 - max(0, pan)); R[i:i + n] += sig[:n] * gain * (1 + min(0, pan))


def env(n, decay):
    return np.exp(-np.arange(n) / (decay * SR))


def kick(dur=0.42):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t / 0.028); ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * env(n, 0.16); s[:60] += np.linspace(0.8, 0, 60)
    return np.tanh(s * 1.6)


def sub(freq, dur):
    n = int(dur * SR); t = np.arange(n) / SR
    f = freq * (1 + 0.5 * np.exp(-t / 0.02)); ph = 2 * np.pi * np.cumsum(f) / SR
    return np.tanh(np.sin(ph) * 1.9) * env(n, dur * 0.55) * np.minimum(1, t / 0.004)


def snare(dur=0.3):
    n = int(dur * SR); t = np.arange(n) / SR
    nz = rs.randn(n); nz = nz - np.concatenate([[0], nz[:-1]]) * 0.55
    return (nz * 0.55 * env(n, 0.075) + np.sin(2 * np.pi * 190 * t) * env(n, 0.05) * 0.6)


def hat(dur=0.07, decay=0.012):
    n = int(dur * SR); nz = rs.randn(n); nz = np.diff(nz, prepend=0); nz = np.diff(nz, prepend=0)
    return nz * 0.22 * env(n, decay)


def impact(dur=2.4):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t / 0.09); boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * env(n, 0.5)
    nz = rs.randn(n); k = 48; nz = np.convolve(nz, np.ones(k) / k, mode='same'); crash = (rs.randn(n) * 0.25 + nz * 2.0) * env(n, 0.7)
    return np.tanh(boom * 1.4) + crash * 0.5


def riser(dur):
    n = int(dur * SR); t = np.arange(n) / SR; u = t / dur
    nz = rs.randn(n); nz = np.diff(nz, prepend=0)
    tone = np.sin(2 * np.pi * np.cumsum(180 + 1500 * u ** 2) / SR)
    return (nz * 0.35 + tone * 0.25) * u ** 2.2


def pad(freqs, dur):
    n = int(dur * SR); t = np.arange(n) / SR; s = np.zeros(n)
    for f in freqs:
        for d in (-0.35, 0.0, 0.4):
            s += np.sin(2 * np.pi * (f * (1 + d / 100)) * t + rs.rand() * 6.28) + 0.3 * np.sin(2 * np.pi * 2 * f * t + rs.rand() * 6.28)
    s *= (0.75 + 0.25 * np.sin(2 * np.pi * 0.21 * t)) * np.minimum(1, t / 0.6) * np.minimum(1, (dur - t) / 0.8)
    return s / (len(freqs) * 3.3)


# ---- arrangement (in beats on the 114-style grid; sections follow the edit's energy map)
total_beats = int((a.duration - a.offset) / beat) + 1
rf_beat = lambda rf: (rf / 30.0 - REF_PHASE) / (60.0 / REF_BPM)
quiet = (rf_beat(267), rf_beat(318))      # shutter interlude: drums drop out
outro = rf_beat(525); end = rf_beat(617)
ROOT = 46.25  # F#1
notes = [ROOT, ROOT, ROOT * 1.189, ROOT * 0.891, ROOT, ROOT, ROOT * 1.335, ROOT * 1.189]
K = kick(); S = snare(); H = hat(); HO = hat(0.22, 0.06)
kick_steps = {0, 6, 10, 16, 22, 27}          # 16th steps in a 2-bar loop
snare_steps = {4, 12, 20, 28}
for step in range(total_beats * 4):
    b = step / 4.0; t = t_of_beat(b); s32 = step % 32
    if b >= end:
        break
    if quiet[0] <= b < quiet[1]:
        if step % 4 == 2:
            add(H, t, 0.35, 0.3)
        continue
    g = 0.72 if b >= outro else 1.0
    if s32 in kick_steps:
        add(K, t, 0.95 * g); add(sub(notes[(step // 16) % len(notes)], beat * 1.4), t, 0.62 * g)
    if s32 in snare_steps:
        add(S, t, 0.7 * g, -0.1)
    if step % 2 == 0:
        add(H, t, 0.5 * g, 0.35 if (step // 2) % 2 else -0.25)
    if s32 in (14, 15, 30, 31):
        add(H, t, 0.42 * g, 0.2)
        add(H, t + beat / 8, 0.3 * g, -0.2)
    if s32 == 26:
        add(HO, t, 0.5 * g, 0.3)

# pad: minor colour, changes every 2 bars
chords = [[92.5, 110.0, 138.6, 185.0], [82.4, 110.0, 123.5, 164.8], [92.5, 116.5, 138.6, 185.0], [73.4, 92.5, 110.0, 146.8]]
for i in range(int(total_beats / 8) + 1):
    add(pad(chords[i % len(chords)], beat * 8 + 1.0), t_of_beat(i * 8), 0.2)

# impacts + risers on the edit's big transitions (reference frames)
for rf, g in [(3, 0.9), (77, 1.0), (115, 0.9), (265, 1.0), (303, 0.6), (335, 0.85), (366, 0.8), (414, 0.75), (495, 0.95), (522, 0.9), (570, 0.8), (586, 0.9), (617, 1.0)]:
    add(impact(), t_of_rf(rf), 0.55 * g)
for rf0, rf1 in [(60, 77), (104, 115), (254, 265), (322, 335), (480, 495), (600, 617)]:
    d = t_of_rf(rf1) - t_of_rf(rf0); add(riser(d), t_of_rf(rf0), 0.5, 0.0)

# ---- master
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 0.9)
mix /= max(1e-9, np.abs(mix).max()) / 0.89
n_out = int(a.duration * SR); mix = mix[:n_out]
fade = int(0.02 * SR); mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
import os
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
with wave.open(a.out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((mix * 32767).astype('<i2').tobytes())
print('guide beat', a.out, '%.2fs @ %.1f bpm' % (a.duration, a.bpm))
