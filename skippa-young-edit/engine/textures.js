// Every bitmap asset in the edit is generated here on a 2D canvas (no external images):
// bokeh rings, soft dots, flare parts, star outlines, chevrons, original silhouette figures,
// the outro emblem, CTA / watermark text plates, and tiling noise.
import * as THREE from 'three';
import { rng, TAU } from './util.js';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, opts = {}) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
  if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 4; t.needsUpdate = true; return t;
}

function glow(size, stops) {
  const [c, g] = canvas(size, size); const r = size / 2;
  const gr = g.createRadialGradient(r, r, 0, r, r, r);
  for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, size, size); return c;
}

// bokeh "bubble": dark disc + bright ring with a soft halo
function ring(size, { thick = 0.06, dark = 0.82, halo = 0.5, inner = true } = {}) {
  const [c, g] = canvas(size, size); const r = size / 2; const R = r * 0.78;
  if (inner) { g.fillStyle = `rgba(6,6,9,${dark})`; g.beginPath(); g.arc(r, r, R, 0, TAU); g.fill(); }
  g.shadowColor = `rgba(255,255,255,${halo})`; g.shadowBlur = size * 0.09;
  g.strokeStyle = '#fff'; g.lineWidth = size * thick;
  for (let i = 0; i < 2; i++) { g.beginPath(); g.arc(r, r, R, 0, TAU); g.stroke(); }
  return c;
}

function streak(w, h) {
  const [c, g] = canvas(w, h);
  const gx = g.createLinearGradient(0, 0, w, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gx; g.fillRect(0, 0, w, h);
  g.globalCompositeOperation = 'destination-in';
  const gy = g.createLinearGradient(0, 0, 0, h);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.5, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gy; g.fillRect(0, 0, w, h); return c;
}

function polygon(size, sides, { fill = 'rgba(255,255,255,0.5)', stroke = null, rot = 0 } = {}) {
  const [c, g] = canvas(size, size); const r = size / 2;
  g.beginPath(); for (let i = 0; i < sides; i++) { const a = rot + (i / sides) * TAU; g[i ? 'lineTo' : 'moveTo'](r + Math.cos(a) * r * 0.8, r + Math.sin(a) * r * 0.8); } g.closePath();
  if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * 0.04; g.stroke(); }
  return c;
}

// bevelled 5-point star outline (the interlude stars)
function starOutline(size) {
  const [c, g] = canvas(size, size); const r = size / 2;
  const path = (R1, R2) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 10) * TAU; const R = i % 2 ? R2 : R1; g[i ? 'lineTo' : 'moveTo'](r + Math.cos(a) * R, r + Math.sin(a) * R); } g.closePath(); };
  g.lineJoin = 'miter';
  path(r * 0.84, r * 0.36); g.lineWidth = size * 0.085; g.strokeStyle = 'rgba(120,124,128,1)'; g.stroke();
  path(r * 0.84, r * 0.36); g.lineWidth = size * 0.04; g.strokeStyle = 'rgba(245,247,250,1)'; g.stroke();
  return c;
}

// thick tapered chevron "<"
function chevron(size) {
  const [c, g] = canvas(size, size);
  g.fillStyle = '#fff'; g.shadowColor = 'rgba(255,255,255,0.55)'; g.shadowBlur = size * 0.04;
  const s = size; g.beginPath();
  g.moveTo(s * 0.86, s * 0.10); g.lineTo(s * 0.14, s * 0.50); g.lineTo(s * 0.86, s * 0.90); g.lineTo(s * 0.84, s * 0.855);
  g.lineTo(s * 0.26, s * 0.50); g.lineTo(s * 0.84, s * 0.145); g.closePath(); g.fill(); return c;
}

// ---------- original silhouette figures (story imagery) ----------
function limb(g, pts, w0, w1) {
  // tapered rounded limb through points
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; const t0 = i / (pts.length - 1), t1 = (i + 1) / (pts.length - 1);
    const a = w0 + (w1 - w0) * t0, b = w0 + (w1 - w0) * t1; const ang = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(ang), ny = Math.cos(ang);
    g.beginPath(); g.moveTo(x0 + nx * a, y0 + ny * a); g.lineTo(x1 + nx * b, y1 + ny * b); g.lineTo(x1 - nx * b, y1 - ny * b); g.lineTo(x0 - nx * a, y0 - ny * a); g.closePath(); g.fill();
    g.beginPath(); g.arc(x0, y0, a, 0, TAU); g.fill(); g.beginPath(); g.arc(x1, y1, b, 0, TAU); g.fill();
  }
}
// a young man falling backwards through the air: back arched, limbs trailing upward
function figureFall(size) {
  const [c, g] = canvas(size, size); const s = size / 100; g.fillStyle = '#fff';
  g.save(); g.translate(size * 0.5, size * 0.52); g.rotate(-0.42); g.scale(s, s);
  // torso (arched)
  g.beginPath(); g.moveTo(-16, -3); g.quadraticCurveTo(-2, 12, 17, 5); g.quadraticCurveTo(21, -2, 16, -8); g.quadraticCurveTo(0, -2, -14, -13); g.quadraticCurveTo(-20, -9, -16, -3); g.closePath(); g.fill();
  // head + neck, hood bump
  g.beginPath(); g.arc(-25, -15, 7.2, 0, TAU); g.fill(); limb(g, [[-17, -9], [-22, -12]], 3.6, 3.4);
  // arms flung up
  limb(g, [[-13, -11], [-9, -27], [-1, -38]], 3.4, 2.1); limb(g, [[-10, -4], [2, -22], [13, -30]], 3.2, 2.0);
  // legs trailing
  limb(g, [[15, -4], [27, -19], [25, -36]], 4.6, 2.6); limb(g, [[17, 2], [33, -6], [41, -22]], 4.4, 2.6);
  // loose jacket tail
  g.beginPath(); g.moveTo(4, -3); g.quadraticCurveTo(10, -16, 22, -14); g.quadraticCurveTo(12, -8, 12, 2); g.closePath(); g.fill();
  g.restore(); return c;
}
// lone standing figure, hood up, hands in pockets
function figureStand(size) {
  const [c, g] = canvas(size, size); const s = size / 100; g.fillStyle = '#fff'; g.save(); g.translate(size * 0.5, size * 0.5); g.scale(s, s);
  g.beginPath(); g.arc(0, -33, 6.4, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-8.5, -30); g.quadraticCurveTo(0, -44, 8.5, -30); g.quadraticCurveTo(7, -24, 0, -24); g.quadraticCurveTo(-7, -24, -8.5, -30); g.closePath(); g.fill(); // hood
  g.beginPath(); g.moveTo(-10.5, -25); g.lineTo(10.5, -25); g.quadraticCurveTo(14.5, -8, 12, 6); g.lineTo(-12, 6); g.quadraticCurveTo(-14.5, -8, -10.5, -25); g.closePath(); g.fill(); // hoodie
  limb(g, [[-6, 4], [-7, 24], [-7.5, 41]], 4.6, 3.3); limb(g, [[6, 4], [7, 24], [8, 41]], 4.6, 3.3);
  limb(g, [[-7.5, 41], [-12.5, 42.5]], 2.6, 2.3); limb(g, [[8, 41], [13, 42.5]], 2.6, 2.3);
  g.restore(); return c;
}
// seated figure, knees up, head down
function figureSit(size) {
  const [c, g] = canvas(size, size); const s = size / 100; g.fillStyle = '#fff'; g.save(); g.translate(size * 0.5, size * 0.56); g.scale(s, s);
  g.beginPath(); g.arc(-2, -22, 6.6, 0, TAU); g.fill();
  g.beginPath(); g.moveTo(-14, 16); g.quadraticCurveTo(-21, -8, -9, -19); g.quadraticCurveTo(-1, -17, 3, -9); g.quadraticCurveTo(1, 6, -1, 16); g.closePath(); g.fill();
  limb(g, [[-3, 13], [13, -3], [17, 16]], 4.6, 3.2); limb(g, [[-6, 15], [9, 3], [12, 17]], 4.4, 3.1);
  limb(g, [[-6, -12], [8, -5], [14, -3]], 3.1, 2.3); limb(g, [[17, 16], [23, 17]], 2.6, 2.2);
  g.restore(); return c;
}

// soft cloud puff (smoke / fog sprites)
function smokePuff(size, seed = 5) {
  const [c, g] = canvas(size, size); const R = rng(seed);
  for (let i = 0; i < 26; i++) { const a = R() * TAU, d = R() * size * 0.26, r = R.range(size * 0.1, size * 0.3); const x = size / 2 + Math.cos(a) * d, y = size / 2 + Math.sin(a) * d; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.16)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  return c;
}
// 4-point star glint
function glint(size) {
  const [c, g] = canvas(size, size); const r = size / 2; g.translate(r, r);
  const arm = (len, w) => { const gr = g.createLinearGradient(-len, 0, len, 0); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.5, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.moveTo(-len, 0); g.quadraticCurveTo(0, -w, len, 0); g.quadraticCurveTo(0, w, -len, 0); g.fill(); };
  arm(r * 0.96, r * 0.07); g.rotate(Math.PI / 2); arm(r * 0.96, r * 0.07); g.rotate(Math.PI / 4); arm(r * 0.45, r * 0.05); g.rotate(Math.PI / 2); arm(r * 0.45, r * 0.05);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, r * 0.3); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, r * 0.3, 0, TAU); g.fill();
  return c;
}

// film dust overlay tile: R = bright specks / hairs / blotches (added), G = dark specks (subtracted)
function dustOverlay(size, seed = 23) {
  const [c, g] = canvas(size, size); const R = rng(seed); g.fillStyle = '#000'; g.fillRect(0, 0, size, size); g.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 420; i++) { const x = R() * size, y = R() * size, r = 0.4 + Math.pow(R(), 3) * 2.6; g.fillStyle = `rgba(255,0,0,${0.25 + R() * 0.7})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  for (let i = 0; i < 20; i++) { let x = R() * size, y = R() * size, a = R() * TAU; g.strokeStyle = `rgba(255,0,0,${0.2 + R() * 0.35})`; g.lineWidth = 0.6 + R() * 0.9; g.beginPath(); g.moveTo(x, y); const n = 3 + Math.floor(R() * 7); for (let k = 0; k < n; k++) { a += R.range(-0.9, 0.9); x += Math.cos(a) * R.range(4, 16); y += Math.sin(a) * R.range(4, 16); g.lineTo(x, y); } g.stroke(); }
  for (let i = 0; i < 14; i++) { const x = R() * size, y = R() * size, r = R.range(8, 34); const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,0,0,0.16)'); gr.addColorStop(1, 'rgba(255,0,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  for (let i = 0; i < 9; i++) { const x = R() * size; g.strokeStyle = `rgba(255,0,0,${0.12 + R() * 0.2})`; g.lineWidth = 0.7; g.beginPath(); g.moveTo(x, R() * size); g.lineTo(x + R.range(-3, 3), R() * size); g.stroke(); }
  for (let i = 0; i < 150; i++) { const x = R() * size, y = R() * size, r = 0.5 + Math.pow(R(), 3) * 2.4; g.fillStyle = `rgba(0,255,0,${0.3 + R() * 0.6})`; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  return c;
}

// tiling value noise (for smoke / ink / grain lookups)
function noiseTex(size, seed = 7) {
  const [c, g] = canvas(size, size); const R = rng(seed); const img = g.createImageData(size, size);
  const oct = (cells) => { const grid = new Float32Array(cells * cells); for (let i = 0; i < grid.length; i++) grid[i] = R(); return (x, y) => { const fx = (x / size) * cells, fy = (y / size) * cells; const x0 = Math.floor(fx) % cells, y0 = Math.floor(fy) % cells, x1 = (x0 + 1) % cells, y1 = (y0 + 1) % cells; let tx = fx - Math.floor(fx), ty = fy - Math.floor(fy); tx = tx * tx * (3 - 2 * tx); ty = ty * ty * (3 - 2 * ty); const a = grid[y0 * cells + x0], b = grid[y0 * cells + x1], cc = grid[y1 * cells + x0], d = grid[y1 * cells + x1]; return a + (b - a) * tx + (cc - a) * ty + (a - b - cc + d) * tx * ty; }; };
  const chans = [0, 1, 2].map(() => [oct(4), oct(8), oct(16), oct(32), oct(64)]);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) { const i = (y * size + x) * 4; for (let k = 0; k < 3; k++) { let v = 0, a = 0.5, n = 0; for (const o of chans[k]) { v += a * o(x, y); n += a; a *= 0.5; } img.data[i + k] = Math.round((v / n) * 255); } img.data[i + 3] = 255; }
  g.putImageData(img, 0, 0); return c;
}

// procedural "planet": oceans, land, cloud bands
function planetTex(w, h, seed = 3) {
  const [c, g] = canvas(w, h); const n = noiseTex(256, seed); const ng = n.getContext('2d').getImageData(0, 0, 256, 256).data;
  const samp = (u, v, ch) => { const x = ((u % 1) + 1) % 1 * 255.999, y = ((v % 1) + 1) % 1 * 255.999; return ng[((y | 0) * 256 + (x | 0)) * 4 + ch] / 255; };
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const u = x / w, v = y / h; const lat = Math.abs(v - 0.5) * 2;
    const land = samp(u * 2, v * 2, 0) * 0.6 + samp(u * 5, v * 5, 1) * 0.3 + samp(u * 11, v * 11, 2) * 0.1;
    const cloud = samp(u * 3 + 0.3, v * 6 + 0.1, 2) * 0.55 + samp(u * 9, v * 14, 0) * 0.45;
    let r, gg, b;
    if (land > 0.53) { const t = Math.min(1, (land - 0.53) * 7); r = 12 + 26 * t; gg = 66 + 60 * t; b = 96 + 30 * t; } else { const t = land / 0.53; r = 4 + 10 * t; gg = 40 + 90 * t; b = 96 + 120 * t; }
    const cl = Math.max(0, (cloud - 0.5) * 3.2) + Math.max(0, (lat - 0.82) * 4);
    r += (255 - r) * Math.min(1, cl); gg += (255 - gg) * Math.min(1, cl); b += (255 - b) * Math.min(1, cl);
    const i = (y * w + x) * 4; img.data[i] = r; img.data[i + 1] = gg; img.data[i + 2] = b; img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0); return c;
}
function moonTex(size, seed = 11) {
  const [c, g] = canvas(size, size); const R = rng(seed); g.fillStyle = '#a9adb0'; g.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i++) { const x = R() * size, y = R() * size, r = R.range(4, 46) * (size / 512); const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, 'rgba(70,72,76,0.55)'); gr.addColorStop(0.8, 'rgba(110,112,116,0.25)'); gr.addColorStop(1, 'rgba(230,232,236,0.0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); }
  g.strokeStyle = 'rgba(40,42,46,0.75)'; g.lineWidth = size / 300; g.lineCap = 'round';
  for (let k = 0; k < 7; k++) { let x = R() * size, y = R() * size, a = R() * TAU; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 26; j++) { a += R.range(-0.7, 0.7); x += Math.cos(a) * size * 0.022; y += Math.sin(a) * size * 0.022; g.lineTo(x, y); } g.stroke(); }
  return c;
}

// outro emblem: an original roundel — crown over a cut "Y", ring text, pentagon panel (football nod)
function emblem(size, { glyph = 'Y', ringText = 'YOUNG  ·  SKIPPA  ·  YOUNG  ·  SKIPPA  ·  ', font = 'Teko' } = {}) {
  const [c, g] = canvas(size, size); const r = size / 2; g.translate(r, r);
  const bg = g.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.05, 0, 0, r); bg.addColorStop(0, '#d9a4ff'); bg.addColorStop(0.45, '#8a2be2'); bg.addColorStop(1, '#2a0650');
  g.fillStyle = bg; g.beginPath(); g.arc(0, 0, r * 0.97, 0, TAU); g.fill();
  g.strokeStyle = '#ff5fb0'; g.lineWidth = size * 0.012; g.beginPath(); g.arc(0, 0, r * 0.955, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = size * 0.008; g.beginPath(); g.arc(0, 0, r * 0.9, 0, TAU); g.stroke(); g.beginPath(); g.arc(0, 0, r * 0.68, 0, TAU); g.stroke();
  // engraved radial hatching between the rings
  g.strokeStyle = 'rgba(40,0,80,0.35)'; g.lineWidth = size * 0.004; for (let i = 0; i < 160; i++) { const a = (i / 160) * TAU; g.beginPath(); g.moveTo(Math.cos(a) * r * 0.69, Math.sin(a) * r * 0.69); g.lineTo(Math.cos(a) * r * 0.89, Math.sin(a) * r * 0.89); g.stroke(); }
  // ring text
  g.fillStyle = '#fff'; g.font = `700 ${size * 0.118}px '${font}'`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = ringText.split(''); chars.forEach((ch, i) => { const a = -Math.PI / 2 + (i / chars.length) * TAU; g.save(); g.rotate(a + Math.PI / 2); g.translate(0, -r * 0.785); g.fillText(ch, 0, size * 0.006); g.restore(); });
  // pentagon panel
  g.fillStyle = 'rgba(30,0,70,0.55)'; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = size * 0.01; g.beginPath(); for (let i = 0; i < 5; i++) { const a = -Math.PI / 2 + (i / 5) * TAU; g[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6 + r * 0.03); } g.closePath(); g.fill(); g.stroke();
  // crown
  g.fillStyle = '#ffe9ff'; g.beginPath(); const cw = r * 0.34, cy = -r * 0.33; g.moveTo(-cw, cy + r * 0.13); g.lineTo(-cw * 1.08, cy - r * 0.07); g.lineTo(-cw * 0.5, cy + r * 0.03); g.lineTo(0, cy - r * 0.15); g.lineTo(cw * 0.5, cy + r * 0.03); g.lineTo(cw * 1.08, cy - r * 0.07); g.lineTo(cw, cy + r * 0.13); g.closePath(); g.fill();
  [-1.08, 0, 1.08].forEach((k, i) => { g.beginPath(); g.arc(cw * k, cy - (i === 1 ? r * 0.175 : r * 0.09), r * 0.03, 0, TAU); g.fill(); });
  // monogram
  g.fillStyle = '#fff'; g.font = `700 ${size * 0.44}px '${font}'`; g.shadowColor = 'rgba(20,0,60,0.8)'; g.shadowBlur = size * 0.02; g.shadowOffsetY = size * 0.008; g.fillText(glyph, 0, r * 0.2);
  return c;
}

function textPlate(text, { font = 'Bebas Neue', px = 180, weight = 400, skew = 0, stroke = 0, fill = '#fff', pad = 40, spacing = 0 } = {}) {
  const [m, mg] = canvas(8, 8); mg.font = `${weight} ${px}px '${font}'`;
  const widths = text.split('').map((ch) => mg.measureText(ch).width + spacing); const w = Math.ceil(widths.reduce((a, b) => a + b, 0) + pad * 2 + Math.abs(skew) * px), h = Math.ceil(px * 1.25 + pad * 2);
  const [c, g] = canvas(w, h); g.font = `${weight} ${px}px '${font}'`; g.textBaseline = 'middle'; g.textAlign = 'left';
  g.setTransform(1, 0, -skew, 1, skew * h * 0.5 + (skew > 0 ? 0 : 0), 0);
  let x = pad + Math.abs(skew) * px * 0.5; text.split('').forEach((ch, i) => { if (stroke) { g.lineWidth = stroke; g.strokeStyle = fill; g.lineJoin = 'round'; g.strokeText(ch, x, h / 2 + px * 0.04); } else { g.fillStyle = fill; g.fillText(ch, x, h / 2 + px * 0.04); } x += widths[i]; });
  return c;
}

async function loadImage(url, { repeat = false } = {}) {
  try { const t = await new THREE.TextureLoader().loadAsync(url); t.colorSpace = THREE.NoColorSpace; if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; return t; } catch (e) { return null; }
}

export async function makeTextures(cfg = {}) {
  if (document.fonts) { await Promise.all(["700 40px 'Teko'", "400 40px 'Bebas Neue'", "700 40px 'Antonio'"].map((f) => document.fonts.load(f).catch(() => null))); }
  const T = {};
  T.glow = tex(glow(256, [[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,0.55)'], [0.6, 'rgba(255,255,255,0.12)'], [1, 'rgba(255,255,255,0)']]));
  T.dot = tex(glow(64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.95)'], [0.7, 'rgba(255,255,255,0.25)'], [1, 'rgba(255,255,255,0)']]));
  T.core = tex(glow(256, [[0, 'rgba(255,255,255,1)'], [0.08, 'rgba(255,255,255,0.9)'], [0.3, 'rgba(255,255,255,0.18)'], [1, 'rgba(255,255,255,0)']]));
  T.ring = tex(ring(256)); T.ringThin = tex(ring(256, { thick: 0.03, halo: 0.35 })); T.ringBold = tex(ring(256, { thick: 0.12, halo: 0.7 })); T.ringOpen = tex(ring(256, { thick: 0.035, inner: false, halo: 0.3 }));
  T.streak = tex(streak(512, 64)); T.hex = tex(polygon(128, 6, { fill: 'rgba(255,255,255,0.35)', stroke: 'rgba(255,255,255,0.5)' }));
  T.star = tex(starOutline(256)); T.chevron = tex(chevron(256)); T.smoke = tex(smokePuff(256)); T.glint = tex(glint(256));
  T.figFall = tex(figureFall(512)); T.figStand = tex(figureStand(512)); T.figSit = tex(figureSit(512));
  T.noise = tex(noiseTex(256, 7), { repeat: true }); T.noise.minFilter = THREE.LinearFilter; T.noise.generateMipmaps = false;
  T.planet = tex(planetTex(1024, 512, 3), { repeat: true }); T.moon = tex(moonTex(512, 11), { repeat: true });
  T.emblem = tex(emblem(1024, { glyph: cfg.emblemGlyph || 'Y', ringText: cfg.emblemRing || 'YOUNG  ·  SKIPPA  ·  YOUNG  ·  SKIPPA  ·  ' }));
  T.cta = tex(textPlate(cfg.cta || 'FOLLOW FOR MORE', { font: 'Antonio', weight: 700, px: 200, skew: 0.2, spacing: 10 }));
  T.ctaAspect = T.cta.image.width / T.cta.image.height;
  T.mark = tex(textPlate(cfg.watermark || 'SKIPPA · YOUNG', { font: 'Teko', weight: 700, px: 96, stroke: 3, spacing: 6, pad: 16 }));
  T.markAspect = T.mark.image.width / T.mark.image.height;
  // real-world assets (see engine/assets/CREDITS.md); every one has a fallback so the engine runs without them
  const [cw, cg] = canvas(4, 4); cg.fillStyle = '#fff'; cg.fillRect(0, 0, 4, 4); T.white = tex(cw, { repeat: true });
  const A = cfg.assetBase || 'assets/';
  T.dustfx = tex(dustOverlay(1024), { repeat: true }); T.earthHi = await loadImage(A + 'earth_hi.jpg');
  const [earth, moon, env, grit, wood] = await Promise.all([loadImage(A + 'earth.jpg'), loadImage(A + 'moon.jpg', { repeat: true }), loadImage(A + 'env.jpg', { repeat: true }), loadImage(A + 'grit.jpg', { repeat: true }), loadImage(A + 'wood.jpg', { repeat: true })]);
  T.earth = earth; if (moon) T.moon = moon; T.env = env; T.grit = grit || T.white; T.wood = wood;
  T.make = { textPlate: (t, o) => tex(textPlate(t, o)), tex };
  return T;
}
