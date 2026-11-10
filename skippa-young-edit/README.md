# "Young" — 3D typography edit

A frame-for-frame recreation of a 3D-typography lyric-edit style, rebuilt as a small WebGL engine
(three.js, rendered headless and encoded with ffmpeg). It is paced on a **103 BPM** beat grid (the tempo of
Skippa's "Money Walk" riddim) with every word held long enough to read: about 40 seconds.

| File | What it is |
|---|---|
| `ANALYSIS.md` | Frame-by-frame breakdown of the reference: beats, shots, every asset and effect |
| `PROMPT.md` | The long master prompt describing the whole edit |
| `lyrics.txt` | The words on screen — edit this |
| `song.timing.json` | The pacing: tempo, which beat every word lands on, and how long it holds (written by `tools/make_pacing.py`) |
| `edit.config.json` | Size, frame rate, credit line, call-to-action, emblem text |
| `engine/` | The renderer: lettering (`glyphs.js`), scene kit (`kit.js`), finishing stack (`post.js`), one module per scene in `engine/sections/` (A–K, eleven scenes) |
| `engine/assets/` | Real photographs and scans, all public domain or CC0 (NASA Earth and Moon, studio lighting map, metal and wood grain) — see `CREDITS.md` there |
| `engine/local/` | **Not in the repository.** Your own copy of the display font and any overlay pack — see "Font and local pack" |
| `render.mjs` | Renders stills, comparison sheets or the full video |
| `tools/` | Guide beat, tempo analysis, word-timing map, slot fitting, contact sheets |

## Render

```bash
npm install
```

```bash
node render.mjs
```

Output: `out/edit.mp4`, 1920×1080, 30 fps, ~40 s, no sound. A fast preview:

```bash
node render.mjs --scale 0.5 --samples 3 --out out/preview.mp4
```

Needs Node 18+, ffmpeg, Python 3 with numpy and Pillow, and Playwright's Chromium.

## What is and isn't in the video

- **Words:** the file ships with original lines telling the song's story (young, alone at night, facing his
  demons, how he'll be remembered). The song's own lyrics are Skippa's; they are not included. To use them,
  paste the lines sung in the clip window into `lyrics.txt` and render again — see the notes in that file.
- **Sound:** the video is silent. The recording is not included; add it yourself:

```bash
node render.mjs --audio /path/to/your-clip.mp3 --audio-start 0
```

  The first hit of the edit is 0.12 s in, and beats follow every 0.583 s (103 BPM). Posting on TikTok
  instead: upload the video, add the official sound, and slide it so a strong beat lands on the first word.
  `--guide` adds a plain synthesized beat on that grid, only useful for checking sync.

## Pacing

`tools/make_pacing.py` holds one row per word: the reference frame where it starts and the beat it lands on.
Between two rows the edit does not run at constant speed — letters arrive and leave at close to their natural
speed and the rest of the time goes to the hold, where the finished word sits still enough to read. The engine
rounds every speed change into a ramp (`smooth` in the timing file).

```bash
python3 tools/make_pacing.py --bpm 103
```

Change `--bpm` for another song, or edit the beat column to give a word more or less time. To see the flow
without a full render:

```bash
node render.mjs --every 4 --scale 0.2 --samples 3 --stills scratch/watch
```

An earlier fit that snaps each word to the sung-word onsets of "Young" (116 BPM, ~21 s, the reference's own
speed) is kept as `song.timing.young116.json`; use it with `--timing song.timing.young116.json`.
`tools/analyze_audio.py`, `tools/word_times.py` and `tools/fit_slots.py` produce that kind of fit from a
clip; `word_times.py` stores only timestamps and letter counts, never text.

## Working on a scene

```bash
node render.mjs --only F --frames 160-240 --step 2 --scale 0.5 --samples 4 --sheet scratch/f.jpg
```

`--frames` are reference-frame numbers (0–657); `--from` / `--to` / `--every` select output frames instead.
`engine/README.md` documents the scene API.

`--samples N` sets the sub-frames blended per frame (motion blur, depth of field, anti-aliasing): 8 is the
default, 12 is smoother on fast spins. `--parts N` splits a render across N processes and joins the pieces;
it is no faster on a software GL renderer, which already uses every core.

## Font and local pack

The reference is set in **Chinese Rocks** (Typodermic). Its licence allows the font in rendered video but not
passing the font file on, so the file is not in this repository. Put your copy at:

```
engine/local/chinese-rocks.otf
```

The engine then uses it exactly as drawn, with the reference's slant. Without it the lettering falls back to
Teko Bold, re-cut at load time by `engine/glyphs.js` to the same proportions (Teko, Bebas Neue and Antonio
are bundled in `engine/fonts/` under the SIL Open Font License 1.1).

`engine/local/` can also hold an overlay pack: clips (smoke, shards, tunnels, glitch flashes, embers) and
sprite images that the scenes screen over the picture when present and skip when absent.

```bash
python3 tools/import_pack.py --clips /path/to/clips --images /path/to/images --map pack.map.json
```

`pack.map.json` names what to import: which clip becomes which overlay (`tunnel2`, `shards`, `smoke_puff`…)
and which image becomes which sprite; the header of `tools/import_pack.py` shows the format.

The folder is git-ignored on purpose: editing packs rarely come with a licence to redistribute. Only add
material you have the right to use, and leave out anyone else's footage, logos or character art.
