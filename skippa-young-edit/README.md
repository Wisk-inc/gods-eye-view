# "Young" — 3D typography edit

A frame-for-frame recreation of a 3D-typography lyric-edit style, rebuilt as a small WebGL engine
(three.js, rendered headless and encoded with ffmpeg), paced to **Skippa – "Young"** (116 BPM).

| File | What it is |
|---|---|
| `ANALYSIS.md` | Frame-by-frame breakdown of the reference: beats, shots, every asset and effect |
| `PROMPT.md` | The long master prompt describing the whole edit |
| `lyrics.txt` | The words on screen — edit this |
| `song.timing.json` | Tempo, clip window and where each sung word lands (measured from the song's official preview) |
| `edit.config.json` | Size, frame rate, credit line, call-to-action, emblem text |
| `engine/` | The renderer: lettering (`glyphs.js`), scene kit (`kit.js`), finishing stack (`post.js`), one module per scene in `engine/sections/` |
| `render.mjs` | Renders stills, comparison sheets or the full video |
| `tools/` | Guide beat, tempo analysis, word-timing map, slot fitting, contact sheets |

## Render

```bash
npm install
```

```bash
node render.mjs
```

Output: `out/edit.mp4`, 1920×1080, 30 fps, ~21.6 s. A fast preview:

```bash
node render.mjs --scale 0.5 --samples 3 --out out/preview.mp4
```

Needs Node 18+, ffmpeg, Python 3 with numpy and Pillow, and Playwright's Chromium.

## What is and isn't in the video

- **Words:** the file ships with original lines telling the song's story (young, alone at night, facing his
  demons, how he'll be remembered). The song's own lyrics are Skippa's; they are not included. To use them,
  paste the lines sung in the clip window into `lyrics.txt` and render again — see the notes in that file.
- **Sound:** the render carries an original guide beat at the song's tempo so every hit is audible. The
  recording itself is not included. Add it yourself:

```bash
node render.mjs --audio /path/to/your-clip.mp3 --audio-start 0
```

  The edit covers about 20 s of the song, starting **4.16 s into its official 30-second preview**. If your
  file is the full track, pass that position as `--audio-start`. Posting on TikTok instead: upload the
  video, add the official sound, and slide it so the first hit lands on the first word.

## Timing to the song

`song.timing.json` was fitted to the song: 116 BPM, and each of the 26 word-slots enters on the onset of
the word sung at that moment (49 sung words across the clip; none fall in the wordless interlude).
To re-fit to a different clip or song:

```bash
python3 tools/analyze_audio.py clip.mp3
```

```bash
python3 tools/word_times.py clip.mp3 song.words.json
```

```bash
python3 tools/fit_slots.py --words song.words.json --bpm 116 --phase 0.135 --out song.timing.json
```

`word_times.py` needs `pip install faster-whisper`; it stores only timestamps and letter counts, never text.
Without a timing file the edit runs on a plain beat grid: `node render.mjs --no-timing --bpm 114`.

## Working on a scene

```bash
node render.mjs --only F --frames 160-240 --step 2 --scale 0.5 --samples 4 --sheet scratch/f.jpg
```

`--frames` are reference-frame numbers (0–657). `engine/README.md` documents the scene API.

## Fonts

Teko, Bebas Neue and Antonio (SIL Open Font License 1.1), in `engine/fonts/`. The display lettering is Teko
Bold re-cut at load time by `engine/glyphs.js`.
