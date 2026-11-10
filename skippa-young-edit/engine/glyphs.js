// Glyph surgery: takes a clean squared display font (Teko Bold) and re-cuts every letter so it reads like
// the hand-cut, chipped, heavy condensed lettering of the reference edit:
//   1. facet   – curves are sampled coarsely so round corners become chiselled chamfers
//   2. condense – horizontal squeeze
//   3. embolden – outline offset (outer contours grow, counters shrink into narrow slots)
//   4. flare   – stroke terminals are widened into small spurs
//   5. roughen – low-frequency wobble (hand-cut, non-parallel edges) + fine tooth + random chips/nicks
//   6. per-letter irregularity (applied at layout time in kit.js)
// Output: THREE.Shape[] per character, ready for ExtrudeGeometry.
import * as THREE from 'three';
import { TTFLoader } from 'three/addons/loaders/TTFLoader.js';
import { Font } from 'three/addons/loaders/FontLoader.js';
import { rng, fbm1, hash1 } from './util.js';

export async function loadFont(url) {
  const res = await fetch(url); if (!res.ok) throw new Error('font not found: ' + url);
  const buf = await res.arrayBuffer();
  const make = (reversed) => { const l = new TTFLoader(); l.reversed = reversed; return new Font(l.parse(buf)); };
  const ar = (pts) => { let a = 0; for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[(i + 1) % pts.length]; a += p.x * q.y - q.x * p.y; } return Math.abs(a / 2); };
  // the letter O must come out as ONE shape whose outline is larger than its counter (otherwise counters and bodies are swapped)
  const good = (f) => { const sh = f.generateShapes('O', 1); return sh.length === 1 && sh[0].holes.length === 1 && ar(sh[0].getPoints(4)) > ar(sh[0].holes[0].getPoints(4)); };
  let font = make(false); if (!good(font)) { const alt = make(true); if (good(alt)) font = alt; } // CFF outlines wind the other way
  return font;
}

// The genuine reference font (Chinese Rocks, Typodermic) is used exactly as drawn: no outline surgery, only
// the preset's slant. Its licence allows rendered video and forbids modifying or sharing the font file.
export const ROCKS_CUT = { minHole: 0.0015, minIsland: 0.001, denick: 0, facet: 5, xScale: 1, yScale: 1, boldX: 0, boldY: 0, slot: 0, flare: 0, flareMinLen: 1, flareMaxLen: 0, step: 0.02, wobble: 0, wobbleFreq: 1, tooth: 0, toothFreq: 1, chipEvery: 1e9, chipDepth: [0, 0], chipWidth: [0.01, 0.01], tracking: 0.012, slant: 0.19, bevelInset: false };

// Default "cut" — tuned against the reference lettering. All lengths are in em units.
export const DEFAULT_CUT = {
  // Measured targets from the reference lettering: letters ~1:2 (w:h), stem 35% / counter 30% / stem 35%,
  // crossbars about as thick as stems, gaps between letters ~11% of a letter. The base font (Teko Bold) has
  // 40% stems and 21% counters, so stems are SHAVED (negative offset) rather than emboldened.
  facet: 2,          // curve divisions (low = chamfered corners)
  xScale: 0.78,      // condense
  yScale: 1.0,
  boldX: -0.017,     // horizontal outline offset: each stem changes by 2x this, each counter by -2x
  boldY: -0.006,     // vertical outline offset (crossbar weight)
  slot: 0.0,         // extra counter shrink factor
  flare: 0.022,      // terminal spur size
  flareMinLen: 0.07, // cap-edge length window that counts as a stroke terminal
  flareMaxLen: 0.30,
  step: 0.016,       // resample spacing for roughening
  wobble: 0.0042,    // low-frequency edge drift (hand-cut, non-parallel edges)
  wobbleFreq: 2.2,
  tooth: 0.0019,     // fine jaggedness
  toothFreq: 46,
  chipEvery: 0.55,   // mean arc-length between chips
  chipDepth: [0.010, 0.030],
  chipWidth: [0.012, 0.036],
  tracking: -0.012,  // letter spacing (the base font's side bearings are too loose once stems are shaved)
};

function signedArea(pts) {
  let a = 0;
  for (let i = 0, n = pts.length; i < n; i++) { const p = pts[i], q = pts[(i + 1) % n]; a += p.x * q.y - q.x * p.y; }
  return a / 2;
}

function dedupe(pts, eps = 1e-5) {
  const out = [];
  for (const p of pts) { const l = out[out.length - 1]; if (!l || Math.abs(l.x - p.x) > eps || Math.abs(l.y - p.y) > eps) out.push(new THREE.Vector2(p.x, p.y)); }
  if (out.length > 1) { const f = out[0], l = out[out.length - 1]; if (Math.abs(l.x - f.x) < eps && Math.abs(l.y - f.y) < eps) out.pop(); }
  return out;
}

// remove nearly-collinear vertices so real corners stand out
function simplify(pts, tol = 0.0016) {
  let cur = pts;
  for (let pass = 0; pass < 2; pass++) {
    const out = [];
    const n = cur.length;
    for (let i = 0; i < n; i++) {
      const a = cur[(i - 1 + n) % n], b = cur[i], c = cur[(i + 1) % n];
      const abx = b.x - a.x, aby = b.y - a.y, acx = c.x - a.x, acy = c.y - a.y;
      const d = Math.abs(abx * acy - aby * acx) / (Math.hypot(acx, acy) || 1e-9);
      if (d > tol) out.push(b);
    }
    if (out.length >= 3) cur = out;
  }
  return cur;
}

// offset a closed polygon along vertex normals. `amount` > 0 moves away from the polygon's own interior.
function offsetPoly(pts, ax, ay = ax) {
  const n = pts.length; if (n < 3 || (ax === 0 && ay === 0)) return pts;
  const ccw = signedArea(pts) > 0;
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    let e1x = b.x - a.x, e1y = b.y - a.y, e2x = c.x - b.x, e2y = c.y - b.y;
    const l1 = Math.hypot(e1x, e1y) || 1e-9, l2 = Math.hypot(e2x, e2y) || 1e-9;
    e1x /= l1; e1y /= l1; e2x /= l2; e2y /= l2;
    // outward normals of the two edges (for CCW the outward normal is (ey,-ex))
    const s = ccw ? 1 : -1;
    const n1x = e1y * s, n1y = -e1x * s, n2x = e2y * s, n2y = -e2x * s;
    let mx = n1x + n2x, my = n1y + n2y; const ml = Math.hypot(mx, my);
    if (ml < 1e-6) { mx = n1x; my = n1y; } else { mx /= ml; my /= ml; }
    const cosHalf = Math.max(0.35, mx * n1x + my * n1y); // miter limit
    out.push(new THREE.Vector2(b.x + (mx * ax) / cosHalf, b.y + (my * ay) / cosHalf));
  }
  return out;
}

// widen stroke terminals: a "cap" is a short edge between two long, roughly perpendicular neighbours
function flareTerminals(pts, C, isHole) {
  if (isHole || C.flare <= 0) return pts;
  const n = pts.length; const out = pts.map((p) => p.clone());
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    const ex = p2.x - p1.x, ey = p2.y - p1.y, len = Math.hypot(ex, ey);
    if (len < C.flareMinLen || len > C.flareMaxLen) continue;
    const ax = p1.x - p0.x, ay = p1.y - p0.y, la = Math.hypot(ax, ay);
    const bx = p3.x - p2.x, by = p3.y - p2.y, lb = Math.hypot(bx, by);
    if (la < len * 0.9 || lb < len * 0.9) continue;
    const ux = ex / len, uy = ey / len;
    const dotA = Math.abs((ax / la) * ux + (ay / la) * uy), dotB = Math.abs((bx / lb) * ux + (by / lb) * uy);
    if (dotA > 0.45 || dotB > 0.45) continue; // neighbours must be roughly perpendicular to the cap
    // both corners must turn the same way (convex end of a stroke)
    const c1 = ax * ey - ay * ex, c2 = ex * by - ey * bx;
    if (c1 * c2 <= 0) continue;
    const f = C.flare * (0.7 + 0.6 * hash1(i * 7.13 + p1.x * 91.7 + p1.y * 53.3));
    out[i].x -= ux * f; out[i].y -= uy * f;
    out[(i + 1) % n].x += ux * f; out[(i + 1) % n].y += uy * f;
  }
  return out;
}

// subdivide edges to <= step, remembering which vertices are true corners
function resample(pts, step) {
  const out = []; const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    const len = a.distanceTo(b); const k = Math.max(1, Math.round(len / step));
    for (let j = 0; j < k; j++) { const t = j / k; out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, corner: j === 0, len: len / k }); }
  }
  return out;
}

function roughen(pts, C, R, seed) {
  const n = pts.length; if (n < 3) return pts.map((p) => new THREE.Vector2(p.x, p.y));
  const ccw = signedArea(pts) > 0; const s = ccw ? 1 : -1;
  // arc length + chip positions
  const arc = [0]; for (let i = 1; i < n; i++) arc.push(arc[i - 1] + pts[i - 1].len);
  const total = arc[n - 1] + pts[n - 1].len;
  const chips = []; let pos = R() * C.chipEvery;
  while (pos < total) { chips.push({ at: pos, d: R.range(C.chipDepth[0], C.chipDepth[1]) * (R() < 0.18 ? -0.6 : 1), w: R.range(C.chipWidth[0], C.chipWidth[1]) }); pos += C.chipEvery * R.range(0.35, 1.75); }
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = pts[(i - 1 + n) % n], b = pts[i], c = pts[(i + 1) % n];
    let tx = c.x - a.x, ty = c.y - a.y; const tl = Math.hypot(tx, ty) || 1e-9; tx /= tl; ty /= tl;
    const nx = ty * s, ny = -tx * s; // outward
    const u = arc[i];
    let d = (fbm1(u * C.wobbleFreq + seed * 13.7, 2) - 0.5) * 2 * C.wobble + (fbm1(u * C.toothFreq + seed * 5.1, 2) - 0.5) * 2 * C.tooth;
    for (const ch of chips) { let du = Math.abs(u - ch.at); du = Math.min(du, total - du); if (du < ch.w) d -= ch.d * (1 - du / ch.w); }
    if (b.corner) d *= 0.45; // keep silhouette corners readable
    out.push(new THREE.Vector2(b.x + nx * d, b.y + ny * d));
  }
  return out;
}

const cache = new Map();

/** Re-cut one character. Returns { shapes, advance, bounds:{minX,maxX,minY,maxY} } in em units (cap height ~0.7*yScale). */
export function cutGlyph(font, ch, cut = DEFAULT_CUT, variant = 0) {
  const key = ch + '|' + variant + '|' + JSON.stringify(cut);
  if (cache.has(key)) return cache.get(key);
  const C = cut; const data = font.data; const scale = 1 / data.resolution;
  const g = data.glyphs[ch] || data.glyphs['?'];
  const baseAdv = (g ? g.ha : data.resolution * 0.3) * scale;
  const seed = ch.charCodeAt(0) * 17 + variant * 101; const R = rng(seed + 1);
  const raw = ch === ' ' ? [] : font.generateShapes(ch, 1);
  const shapes = []; let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  const prep = (pts, isHole, k) => {
    let p = dedupe(pts).map((v) => new THREE.Vector2(v.x * C.xScale + (C.slant || 0) * v.y * C.yScale, v.y * C.yScale));
    p = simplify(p);
    // remove micro-nicks (two short edges meeting at a sharp angle): an outward bevel self-intersects on them and shows as black specks
    if (C.denick) { for (let pass = 0; pass < 6; pass++) { const n = p.length; if (n < 6) break; const q = []; let changed = false;
      for (let i = 0; i < n; i++) { const a = p[(i + n - 1) % n], b = p[i], c = p[(i + 1) % n]; const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
        if (l1 < C.denick && l2 < C.denick && ((b.x - a.x) * (c.x - b.x) + (b.y - a.y) * (c.y - b.y)) / (l1 * l2 + 1e-12) < 0.5) { changed = true; continue; } q.push(b); }
      p = q; if (!changed) break; } }
    if (p.length < 3) return null;
    p = offsetPoly(p, isHole ? -C.boldX * (1 + C.slot) : C.boldX, isHole ? -C.boldY : C.boldY);
    p = flareTerminals(p, C, isHole);
    const rs = resample(p, C.step);
    return roughen(rs, C, R, seed + k * 3.3 + (isHole ? 50 : 0));
  };
  raw.forEach((sh, si) => {
    const outer = prep(sh.getPoints(C.facet), false, si);
    if (!outer || Math.abs(signedArea(outer)) < (C.minIsland ?? 0)) return;
    const shape = new THREE.Shape(outer);
    sh.holes.forEach((h, hi) => { const hp = prep(h.getPoints(C.facet), true, si * 10 + hi + 1); if (hp && Math.abs(signedArea(hp)) > (C.minHole ?? 1e-5)) shape.holes.push(new THREE.Path(hp)); });
    shapes.push(shape);
    for (const p of outer) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); }
  });
  const res = { shapes, advance: baseAdv * C.xScale + C.boldX * 2 + C.tracking, bounds: { minX, maxX, minY, maxY } };
  cache.set(key, res);
  return res;
}

/** Cap height of the cut font in em units (measured on "H"). */
export function capHeight(font, cut = DEFAULT_CUT) {
  const g = cutGlyph(font, 'H', cut, 0);
  return g.bounds.maxY - Math.max(0, g.bounds.minY);
}
