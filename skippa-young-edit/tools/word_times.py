#!/usr/bin/env python3
"""Word TIMING map of an audio clip (needs: pip install faster-whisper).

Stores only WHEN each sung word starts and ends and how many letters it has. The recognised text is never
written to disk or printed - the output is timing data for tools/fit_slots.py.

  python3 tools/word_times.py my_clip.mp3 song.words.json [small|medium]
"""
import sys, json, subprocess
import numpy as np
from faster_whisper import WhisperModel
audio, out = sys.argv[1], sys.argv[2]; name = sys.argv[3] if len(sys.argv) > 3 else 'small'
model = WhisperModel(name, device='cpu', compute_type='int8', cpu_threads=3)
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', audio, '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
pcm = np.frombuffer(raw, dtype='<i2').astype(np.float32) / 32768.0
segs, info = model.transcribe(pcm, language='en', word_timestamps=True, vad_filter=False, beam_size=5, condition_on_previous_text=False)
words = []; phrases = []
for s in segs:
    ws = [w for w in (s.words or []) if any(c.isalnum() for c in w.word)]
    if not ws: continue
    phrases.append({'t0': round(ws[0].start, 3), 't1': round(ws[-1].end, 3), 'n': len(ws)})
    for w in ws: words.append({'t0': round(w.start, 3), 't1': round(w.end, 3), 'len': sum(c.isalnum() for c in w.word), 'p': round(float(w.probability), 2)})
json.dump({'model': name, 'duration': info.duration, 'words': words, 'phrases': phrases}, open(out, 'w'))
print('model', name, '| words', len(words), '| phrases', len(phrases), '| mean confidence %.2f' % (sum(w['p'] for w in words) / max(1, len(words))))
