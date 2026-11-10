# Engine guide — writing a section

The edit is a list of **sections** (`engine/sections/index.js`). Each section owns an exclusive range of
**reference frames (rf)** — the frame numbers of the analysed reference edit (30 fps, 114 BPM, beat 0 at
0.116 s, 658 frames). Everything is authored against rf, so a hit authored at rf 77 lands where the reference's
frame 77 lands, whatever the output tempo.

Beat grid (rf): beat `b` is at `rf = 3.48 + 15.789·b`. Quarter beats: 3.5, 19.3, 35.1, 50.9, 66.6, 82.4, 98.2,
114.0, 129.8, 145.6, 161.4, 177.2, 193.0, 208.7, 224.5, 240.3, 256.1, 271.9, 287.7, 303.5, 319.3, 335.1, 350.8,
366.6, 382.4, 398.2, 414.0, 429.8, 445.6, 461.4, 477.2, 493.0, 508.7, 524.5, 540.3, 556.1, 571.9, 587.7, 603.5,
619.3. An 8th note is 7.9 frames, a 16th is 3.95 frames.

## Module contract

```js
// engine/sections/x_name.js
import { ease, prog, sat, lerp, track, pulse, clamp, rng, wobble, TAU, DEG } from '../util.js';
export default {
  build(ctx) {
    const { THREE, kit, tex, words, cfg } = ctx;
    const group = new THREE.Group();          // everything the section draws goes in here
    // ... create objects once ...
    return { group, update(rf) {              // rf is fractional (called several times per frame for motion blur)
      // ... pose everything for this instant ...
      return { cam: { pos, tgt, roll, fov, aperture, focus }, clear: 0x000000, post: { /* overrides */ } };
    } };
  },
};
```

Rules
- **Only edit your own section file.** Never edit `util.js`, `kit.js`, `post.js`, `main.js`, `glyphs.js`,
  `textures.js`, `sections/index.js` or another section. Need something the kit lacks? Build it locally in your
  file with `THREE` (custom `ShaderMaterial`, geometry, canvas texture via `tex.make.tex(canvas)`).
- **Deterministic.** No `Math.random()`, `Date`, `performance.now()`. Use `rng(seed)` at build time and pure
  functions of `rf` in `update`. `update(rf)` must give the same result whatever order it is called in.
- `update` is called ~8–16× per output frame — never allocate geometry there; move/scale/rotate/set uniforms.
- Colour is display-referred (no tone mapping, no colour management): `#ff0000` renders as pure red. Values
  above 1.0 (gain) bloom.
- Words come from `words.sNN` (see `edit.config.json`); always provide a fallback: `words.s07 || 'ALONE'`.
  The text is user-replaceable, so lay out by `word.width`, never by hard-coded letter counts.

## Framing maths

Camera default fov 40°. Visible height at distance `d` is `0.728·d`, visible width `1.294·d`.
A word with `size: 1` (cap height 1 world unit) at distance 4.6 fills 30 % of the frame height.
`cap fraction = size / (0.728·d)`. Word width for the default cut ≈ `0.52·size` per letter.
Screen position: move `tgt` (and `pos` with it) — a target 1 unit to the right of the word puts the word left.

## kit

| call | returns / notes |
|---|---|
| `kit.word(text, {size, depth, bevel, style, seed, tracking, irregular})` | `Word`: `.group`, `.width`, `.height`, `.n`, `.letters[i].mesh`. `depth` is relative to cap height (0.3–0.7 for the chunky reference look). |
| `word.setStyle(name\|obj)`, `word.mixStyle(a, b, t)` | styles: `inkWhite redGlow redSolid crimson pinkWhite gold silver steel graphite`. A style is `{top, bot, side, sideDark, rim, gain, chrome, rimAmt}`. |
| `word.intro(rf, {start, stagger, dur, type, amp, from, upto, easing})` | staggered letter entrance: `drop rise grow pop slam swing spin none` (`grow` is the reference preset's move: letters rise from below while scaling up from 7 %). Letters are hidden before their start. Call every update. |
| `word.pose(i, {x,y,z,rx,ry,rz,s,o})`, `word.reset(o)`, `word.opacity(o)`, `word.gain(g)`, `word.desat(d)`, `word.set('uGrit', v)`, `word.sweep(t, amt)` (light band crossing the word, t 0..1) | per-letter / whole-word control. Rotate / move the whole word with `word.group`. Tilt the word (`group.rotation.x ≈ -0.3`, `.y ≈ ±0.35`) so the extruded sides show. |
| `kit.ribbon(points, {width, taper, shade, color, gain, normal, segments})` | tapered white stroke. `.set(a, b, widthMul)` shows the curve between a..b (0..1); `.swoosh(rf, on0, on1, off0, off1)` = draw-on then erase. `.mesh` |
| `kit.arc(radius, deg0, deg1, n, {center, squash, tilt})` | point list for ribbons (crescents, rings, arcs). |
| `kit.quad({w, h, r, fill, fill2, outline, ow, gain, opacity})` | rounded card group (`fill: null` = wireframe tile). |
| `kit.plate(texture, w, h, {color, additive, opacity, gain, billboard, depthTest})` | textured card or camera-facing sprite. |
| `kit.bubbles({count, box, center, size:[min,max], seed, kinds, color, opacity, avoid})` | bokeh rings; `.drift(rf, rise, sway)`, `.setOpacity(v)`, `.setColor(c)`. kinds: `ring ringThin ringBold ringOpen`. |
| `kit.dotStrings({strings, dots, box, center, size, seed, color, opacity})` | chains of bokeh dots on curvy paths. |
| `kit.dust({count, box, center, size, seed, color, opacity})` | drifting additive specks; call `.drift(rf, [vx,vy,vz], sway)` every update. |
| `kit.bokeh(points, {color, gain, opacity, floor})` | additive beads `[[x,y,z,diameter]…]` with **analytic** defocus: each bead widens into a flat bokeh disc by the thin-lens blur circle, so it is smooth at any sample count. `kit.stringPoints({strings, dots, box, center, size, seed})` builds graded bead strings for it. |
| `kit.soft({w, h, r, fill, fillA, line, ow, additive})` | card / disc / ring drawn as a rounded-rect SDF whose edge and outline soften with defocus (`r ≥ w/2` = disc, `fillA: 0` = ring only). Use these instead of `quad` / `bubbles` when `cam.aperture` is large. |
| `kit.flare({color, size, streak, ghosts, gain})` | anamorphic flare group; `.setIntensity(v)`. |
| `kit.impactFX([{rf, at:[x,y,z], size, color, sparks}])` | burst when a word lands: two expanding rings, a fan of sparks, a soft flash, glints. Returns `{group, update(rf)}` — add `.group` to the scene and call `.update(rf)` every frame. |
| `kit.ornaments({center, radius, color, opacity, seed})` | dial graphics for behind a word (dashed ring, tick ring, broken arcs, counter-rotating). `{group, update(rf, k)}`, `k` = visibility 0..1. |
| `kit.beams({center, count, len, color, opacity, seed, spread})` | soft light shafts fanning from a point behind a word. `{group, update(rf, k)}`. |
| `kit.starburst({rInner, rValley, rTip, spikes, rays, rayLen, fill, outline, ring, disc, seed})` | spiky sun ring + long rays + spoked disc + magenta ring; `.setColors({...})`. |
| `kit.panelFan({count, r0, r1, gap, colors, seed, rotate})` | radial wedge panels. |
| `kit.bg(type, {w, h, a, b, c, rings, vig, scale, center})` | background plane: `ripple`, `grad`, `ink`. Uniforms on `.u` (`uTime`, `uA`…). Put it far behind (`z = -6…-20`) and scale to cover the frustum. |
| `kit.planet({radius, map, light, atmo, atmoAmt, night, gain})` | lit sphere + atmosphere rim; `tex.planet`, `tex.moon`. |
| `kit.starfield({count, radius, seed, size})`, `kit.poly(points, {color, gain, opacity})` | |
| `kit.cam(keys, rf)` | keys `[{rf, p:[x,y,z], t:[x,y,z], roll:deg, fov:deg, e:'io3'}]` → `{pos, tgt, roll, fov}`. Ease names: `lin in2 out2 io2 in3 out3 io3 out4 out5 inExpo outExpo whip outBack outBackSoft outElastic cut`. |
| `kit.shake(rf, amp, freq, seed)` | Vector3 hand-held offset — add to `cam.pos`. |

Textures (`tex.*`): `glow core dot ring ringThin ringBold ringOpen streak hex star chevron glint smoke figFall
figStand figSit noise planet moon emblem cta mark`. `tex.ctaAspect`, `tex.markAspect`.
`tex.make.textPlate(text, {font, px, weight, skew, stroke, fill, spacing})` builds a text texture.

util: `track(keys, x)` keys `[[x, value, ease?], …]` (value may be an array), `prog(x, a, b, ease)`,
`pulse(x, centre, decayFrames)`, `wobble(t, seed)`, `rng(seed)` → `r()`, `r.range(a,b)`, `r.pick(arr)`.

## Local pack (optional)

`tools/import_pack.py` turns your own overlay clips and images into `engine/local/` (git-ignored).
- **Overlay clips** are screened over the finished frame through two post slots:
  `ovlA: { clip: 'embers1', t: seconds, amt: 0.6, tint: [1,0.6,0.4], loop: true, scale: 1, ox: 0, oy: 0, flipX: false }`
  (`f` = explicit frame instead of `t`). Unknown clip names are ignored, so scenes still render without the pack.
- **Images** become additive sprites: `kit.sprite('bubbles', height, {opacity, color, billboard})`
  (a hidden dummy object if the image is missing). `kit.has('tunnel2')` tests for a clip.
  `mono: true` reduces a clip to its brightness before `tint`, so a fire clip can be any colour. Clip edges
  fade out, so a clip scaled below the frame shows no rectangle.
- `grunge` (post) lays the pack's worn texture over flat areas.

## Camera extras

`cam.aperture` (world units, e.g. 0.05–0.25) turns on real depth of field: whatever is at `cam.focus`
(default: the distance to `tgt`) stays sharp, everything nearer/farther blurs. Use it for rack-focus between
words and for soft foreground bokeh. The blur comes from jittering the lens across the sub-frames, so small
bright things ghost at low sample counts — draw those with `kit.bokeh` / `kit.soft`, which read the lens
state from `kit.lens` (un-jittered view matrix, focus, aperture; set by the engine every sub-frame).

## post (per-frame overrides; all optional)

`exposure contrast saturation desat tint[3] invert` · `bloom bloomThreshold bloomTint[3]` · `vignette` ·
`chroma` (aberration) · `rgbSplit` · `zoomBlur zoomCenter[2]` (radial blur) · `warp warpScale` (turbulent
displace) · `mirror` (mirrored edges) · `slices` / `glitch` (digital tears) · `edge` (contour look) ·
`flash flashColor[3]` · `fade` · `irisDisc` (bg-coloured disc radius growing from `irisCenter`; 1.05 covers a
16:9 frame) · `irisHole` (scene visible inside this radius, `irisBg` outside, `irisRim` colour band of width
`irisRimW`; 9 = off) · `bars barsAlpha` (letterbox fraction per bar) · `flat flatColor[3]` + `band bandColor[3]`
(flat fill + centred horizontal band) · `smoke smokeColor[3]` (0..1 wipe from bottom-left) · `leak leakColor[3]
leakPos[2] leakSize` (additive light leak) · `lens` (barrel + / pinch − distortion, for hit bulges) · `rays raysCenter[2]` (light rays shining out of bright shapes) · `sharpen` · `grain scratches` · `shake[2] zoom rotate` (2D
transform of the finished frame — use `zoom` pulses for beat punches) · `mark` (watermark opacity).
Defaults are in `post.js` (`POST_DEFAULTS`).

## Test loop

```bash
# paired contact sheet: reference frame on top, yours below
node render.mjs --only X --frames 118-159 --step 2 --scale 0.5 --samples 4 --quiet \
     --sheet scratch/x_v1.jpg --ref "$REF" --cols 7 --tw 270
# one full-res still
node render.mjs --only X --frames 130 --samples 12 --quiet --stills scratch/x_still
```
`--frames` takes rf numbers / ranges (`a-b`, comma lists). Read the sheet image, compare, adjust, repeat.
Build errors print as `SECTION BUILD ERRORS` / `[pageerror]` — fix before judging the picture.

## What makes it read as the reference

- **Density.** Every reference frame has 5–8 layers: textured background, mid-ground shapes, the word, glowing
  strokes crossing in front, bokeh rings at several depths, dust, a flare or light leak, letterbox bars. A shot
  with just a word and a gradient is wrong.
- **Nothing is ever still.** Slow push or drift on every hold, rings drifting, strokes drawing on/off, small
  hand-held shake, and a punch (`zoom`, `exposure`, `chroma`, `bloom` pulse) on every beat.
- **Letters arrive one by one** (1–2 frames apart) with overshoot; words leave by whip, roll, tip-back or blur.
- **Transitions are smeared**, never clean cuts: whips with heavy motion blur, zoom blur, white/colour flashes,
  iris wipes. Start and end your range in a state that hides the cut (blur, flash, or matching motion).
- **Text is big.** Cap height is typically 22–45 % of the frame height; giant words overflow the frame.
