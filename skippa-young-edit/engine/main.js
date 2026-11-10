// Engine entry. Deterministic: renderFrame(n) always produces the same picture for the same config.
// Time base: every section is authored in "reference frames" (rf) — the frame numbers of the analysed
// reference edit (30 fps, 114 BPM, first beat at 0.116 s). A different song tempo simply re-maps
// output time -> rf, so every hit stays on its beat.
import * as THREE from 'three';
import { loadFont, DEFAULT_CUT, ROCKS_CUT } from './glyphs.js';
import { makeTextures } from './textures.js';
import { makeKit } from './kit.js';
import { Post, POST_DEFAULTS } from './post.js';
import { loadSections } from './sections/index.js';
import { DEG } from './util.js';

export const REF = { fps: 30, bpm: 114, phase: 0.116, frames: 658 };
let S = null;
const _r = new THREE.Vector3(), _u = new THREE.Vector3(), _d = new THREE.Vector3(), _f = new THREE.Vector3(), _o = new THREE.Vector3();

// Time map. Default: linear beat map (reference beat b -> output beat b at cfg.bpm, beat 0 at cfg.offset).
// Optional cfg.anchors = [[rf, seconds], ...] bends it piecewise-linearly so chosen reference frames (word
// entrances) land on exact times in the new song (the onsets of its sung words).
const warps = new WeakMap();
function warpOf(cfg) {
  let w = warps.get(cfg); if (w) return w;
  const slope = (REF.bpm / cfg.bpm) / REF.fps; // seconds per reference frame on the linear map
  const lin = { tOf: (rf) => cfg.offset + (rf / REF.fps - REF.phase) * (REF.bpm / cfg.bpm), rfAt: (t) => REF.fps * (REF.phase + (t - cfg.offset) * (cfg.bpm / REF.bpm)) };
  const A = (cfg.anchors || []).filter((a) => a && a.length === 2).slice().sort((a, b) => a[0] - b[0]);
  if (A.length < 2) w = lin;
  else { const L = A[A.length - 1];
    w = { tOf(rf) { if (rf <= A[0][0]) return A[0][1] + (rf - A[0][0]) * slope; if (rf >= L[0]) return L[1] + (rf - L[0]) * slope; let i = 1; while (A[i][0] < rf) i++; const a = A[i - 1], b = A[i]; return a[1] + ((b[1] - a[1]) * (rf - a[0])) / (b[0] - a[0] || 1e-9); },
      rfAt(t) { if (t <= A[0][1]) return A[0][0] + (t - A[0][1]) / slope; if (t >= L[1]) return L[0] + (t - L[1]) / slope; let i = 1; while (A[i][1] < t) i++; const a = A[i - 1], b = A[i]; return a[0] + ((b[0] - a[0]) * (t - a[1])) / (b[1] - a[1] || 1e-9); } };
  }
  // cfg.smooth (seconds): round the corners of the piecewise map so speed changes ramp instead of snapping
  if (cfg.smooth > 0 && A.length >= 2) { const L = A[A.length - 1]; const piece = w; const dt = 1 / 240, t0 = A[0][1] - 1, n = Math.ceil((L[1] + 4 - t0) / dt) + 1;
    let cur = new Float64Array(n); for (let i = 0; i < n; i++) cur[i] = piece.rfAt(t0 + i * dt); const k = Math.max(1, Math.round(cfg.smooth / dt / 2));
    for (let pass = 0; pass < 2; pass++) { const cs = new Float64Array(n + 1); for (let i = 0; i < n; i++) cs[i + 1] = cs[i] + cur[i]; const nx = new Float64Array(n); for (let i = 0; i < n; i++) { const r = Math.min(k, i, n - 1 - i); nx[i] = (cs[i + r + 1] - cs[i - r]) / (2 * r + 1); } cur = nx; }
    const sm = cur;
    w = { rfAt(t) { const x = (t - t0) / dt; if (x <= 0 || x >= n - 1) return piece.rfAt(t); const i = Math.floor(x); return sm[i] + (sm[i + 1] - sm[i]) * (x - i); },
      tOf(rf) { if (rf <= sm[0] || rf >= sm[n - 1]) return piece.tOf(rf); let lo = 0, hi = n - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sm[m] <= rf) lo = m; else hi = m; } const d = sm[hi] - sm[lo]; return t0 + (lo + (d > 1e-12 ? (rf - sm[lo]) / d : 0)) * dt; } };
  }
  warps.set(cfg, w); return w;
}
export const rfAt = (tSec, cfg) => warpOf(cfg).rfAt(tSec);
export const timeOfRf = (rf, cfg) => warpOf(cfg).tOf(rf);
const halton = (i, b) => { let f = 1, r = 0; while (i > 0) { f /= b; r += f * (i % b); i = Math.floor(i / b); } return r; };

export async function init(userCfg = {}) {
  const cfg = { width: 1920, height: 1080, fps: 30, bpm: REF.bpm, offset: REF.phase, samples: 8, shutter: 0.8, jpeg: 0.95, ...userCfg };
  THREE.ColorManagement.enabled = false;
  const canvas = document.getElementById('c'); canvas.width = cfg.width; canvas.height = cfg.height;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace; renderer.toneMapping = THREE.NoToneMapping; renderer.autoClear = false; renderer.setPixelRatio(1); renderer.setSize(cfg.width, cfg.height, false);
  // genuine reference font if it has been placed in engine/local/ (not redistributable), else the re-cut open font
  let font = null, cut = { ...DEFAULT_CUT, ...(cfg.cut || {}) }, fontName = 'Teko Bold (re-cut)';
  if (cfg.localFont !== false) { try { font = await loadFont('local/chinese-rocks.otf'); cut = { ...ROCKS_CUT, ...(cfg.cut || {}) }; fontName = 'Chinese Rocks'; } catch (e) { font = null; } }
  if (!font) font = await loadFont(cfg.fontUrl || 'fonts/Teko-Bold.woff');
  const tex = await makeTextures(cfg);
  const kit = makeKit({ font, cut, tex });
  const post = new Post(renderer, cfg.width, cfg.height, tex);
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(40, cfg.width / cfg.height, 0.05, 600);
  const ctx = { THREE, kit, tex, cfg, words: cfg.words || {}, scene, camera };
  const sections = []; const errors = [];
  for (const def of await loadSections(cfg.only)) {
    if (def.error) { errors.push(def.id + ' (' + def.file + '): ' + def.error); continue; }
    try { const inst = def.build(ctx); inst.group.visible = false; scene.add(inst.group); sections.push({ def, inst }); } catch (e) { errors.push(def.id + ': ' + (e && e.stack ? e.stack : e)); }
  }
  S = { cfg, renderer, post, scene, camera, sections, ctx, canvas };
  const endT = timeOfRf(REF.frames, cfg);
  return { frames: Math.ceil(endT * cfg.fps), fps: cfg.fps, duration: endT, font: fontName, sections: sections.map((s) => ({ id: s.def.id, name: s.def.name, range: s.def.range })), errors };
}

function sectionAt(rf) { for (const s of S.sections) if (rf >= s.def.range[0] && rf < s.def.range[1]) return s; return null; }

/** Render output frame n to the canvas. Returns a JPEG data URL (or null with {noRead:true}). */
export function renderFrame(n, opts = {}) {
  const { cfg, renderer, post, scene, camera } = S; const N = opts.samples || cfg.samples; const sh = opts.shutter ?? cfg.shutter;
  const t0 = n / cfg.fps; const rf0 = Math.max(0, rfAt(t0, cfg)); const sec = sectionAt(rf0);
  for (const s of S.sections) s.inst.group.visible = s === sec;
  post.begin(); let P = { ...POST_DEFAULTS };
  if (sec) {
    const lo = sec.def.range[0], hi = sec.def.range[1] - 1e-3; const mid = N >> 1;
    for (let k = 0; k < N; k++) {
      const tk = t0 + ((k + 0.5) / N - 0.5) * (sh / cfg.fps); const rf = Math.min(hi, Math.max(lo, rfAt(tk, cfg)));
      const out = sec.inst.update(N === 1 ? rf0 : rf, S.ctx) || {};
      const c = out.cam || {}; camera.position.copy(c.pos || new THREE.Vector3(0, 0, 6)); camera.up.set(0, 1, 0); camera.lookAt(c.tgt || new THREE.Vector3()); if (c.roll) camera.rotateZ(c.roll * DEG); camera.fov = c.fov || 40; camera.updateProjectionMatrix();
      { const L = S.ctx.kit.lens; if (L) { camera.updateMatrixWorld(true); L.view.value.copy(camera.matrixWorldInverse); L.focus.value = c.focus ?? camera.position.distanceTo(c.tgt || _o.set(0, 0, 0)); L.aperture.value = c.aperture > 0 && N > 1 ? c.aperture : 0; L.px.value = cfg.height; } }
      if (c.aperture > 0 && N > 1) { // thin-lens depth of field: jitter the lens, keep the focal point fixed
        camera.updateMatrix(); const right = _r.setFromMatrixColumn(camera.matrix, 0), up = _u.setFromMatrixColumn(camera.matrix, 1); camera.getWorldDirection(_d);
        const focus = c.focus ?? camera.position.distanceTo(c.tgt || _o.set(0, 0, 0)); _f.copy(camera.position).addScaledVector(_d, focus);
        const ang = k * 2.399963, rad = Math.sqrt((k + 0.5) / N) * c.aperture;
        camera.position.addScaledVector(right, Math.cos(ang) * rad).addScaledVector(up, Math.sin(ang) * rad); camera.up.copy(up); camera.lookAt(_f);
      }
      camera.setViewOffset(cfg.width, cfg.height, halton(k + 1, 2) - 0.5, halton(k + 1, 3) - 0.5, cfg.width, cfg.height);
      camera.updateMatrixWorld(true);
      post.sample(scene, camera, 1 / N, out.clear ?? 0x000000);
      if (k === mid || N === 1) { P = { ...POST_DEFAULTS, ...(out.post || {}) };
        // cfg.calm (0..1) damps exposure pumping and flashes so hits read as light, not as a brightness slider
        if (cfg.calm > 0) { if (P.exposure > 1) P.exposure = 1 + (P.exposure - 1) * (1 - cfg.calm); P.flash *= 1 - 0.55 * cfg.calm; P.bloom *= 1 - 0.2 * cfg.calm; } }
    }
  } else { P.fade = 1; P.mark = 0; }
  post.finish(P, t0);
  if (opts.noRead) return null;
  return S.canvas.toDataURL('image/jpeg', opts.jpeg ?? cfg.jpeg);
}

window.EDIT = { init, renderFrame, rfAt: (t) => rfAt(t, S.cfg), timeOfRf: (rf) => timeOfRf(rf, S.cfg), REF };
