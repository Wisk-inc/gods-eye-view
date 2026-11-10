// SECTION J (OFTEN, heavenly) — "ascension in gold light"  (reference frames 367–525)
// Ten word shots (s20–s29) in ONE continuous warm space. The camera travels from word to word: down through the
// first line (WHEN · IT FADES · WE), a slow arc, then it climbs toward the light above (STILL · RISE · TO · THE SKY ·
// SO) and rises into it for the last word, OFTEN — halo, aureole beams and god rays.
//   367 out of the radial blur: WHEN (top) · 375 tilt down: WHEN dissolves upward, IT FADES fades in letter by letter
//   392 IT FADES evaporates, glide down-left: WE grows in, giant · 410 slow arc right: STILL turns in (418)
//   425 the climb: RISE (426) · TO (440) · THE (453) → THE SKY (462) · 469 glide right: SO (477)
//   486 rising flight through the gold strings: OFTEN (495–505), the light above it · 517.6 gold smoke wipe → K
// Look: ivory-gold letters lit from above; a warm amber haze with light pouring down from above; strings of gold
// bokeh; black glass slabs with thin gold edges; gold crescents and halos; a warm travelling light.
// Legibility: soft particles carry a screen-space mask (they melt away in front of the word), decor is placed with
// the hold cameras so nothing sits between a word and the lens, and a word that would touch a frame edge fades first.
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';
import { timeOfRf } from '../main.js';

const DEG = Math.PI / 180;
// ivory face warming to gold at the foot, bronze sides lit from above, ivory bevel (gold leaf)
const IVORY_GOLD = { top: '#fff0cc', bot: '#d59a45', side: '#8c5718', sideDark: '#150901', rim: '#ffe7b0', gain: 0.92, chrome: 0.36, rimAmt: 0.85 };
const GOLD = '#f0bf62';

// ---- the sky: warm near-black below, amber haze toward the light above, soft shafts fanning down from it
const SKY_VS = `varying vec3 vD; void main(){ vec4 wp = modelMatrix * vec4(position, 1.0); vD = wp.xyz - cameraPosition; gl_Position = projectionMatrix * viewMatrix * wp; }`;
const SKY_FS = `uniform sampler2D tNoise; uniform vec3 uH; uniform float uT; uniform float uLight; varying vec3 vD;
float nz(vec2 p){ return texture2D(tNoise, p).r; }
void main(){ vec3 d = normalize(vD); float h = max(dot(d, uH), 0.0);
  vec3 col = mix(vec3(0.014, 0.009, 0.006), vec3(0.058, 0.037, 0.019), smoothstep(-0.6, 0.45, d.y));
  vec2 uv = vec2(atan(d.x, -d.z) / 6.2831853 * 4.0, asin(clamp(d.y, -1.0, 1.0)) / 3.14159265 * 2.0);
  float smoke = nz(uv * 1.2 + vec2(uT * 0.006, -uT * 0.01)) * 0.62 + nz(uv * 3.3 - vec2(uT * 0.008, uT * 0.004)) * 0.38;
  col *= 0.62 + 0.75 * smoke;
  col += vec3(0.40, 0.25, 0.10) * pow(h, 5.0) * 0.42 * uLight;
  col += vec3(1.0, 0.76, 0.42) * pow(h, 26.0) * 0.5 * uLight;
  col += vec3(1.0, 0.9, 0.72) * pow(h, 300.0) * 1.1 * uLight;
  vec3 e1 = normalize(cross(uH, vec3(0.0, 0.0, 1.0))); vec3 e2 = cross(e1, uH); vec3 pp = d - uH * dot(d, uH);
  float ang = atan(dot(pp, e2), dot(pp, e1)) / 6.2831853;
  float ray = nz(vec2(ang * 7.0, 0.11 + uT * 0.012)) * 0.6 + nz(vec2(ang * 19.0, 0.57 - uT * 0.009)) * 0.4;
  ray = smoothstep(0.45, 0.82, ray) * pow(h, 6.0) * (0.5 + 0.5 * smoke);
  col += vec3(0.9, 0.62, 0.3) * ray * 0.3 * uLight;
  gl_FragColor = vec4(col, 1.0); }`;

// ---- legibility mask shared by the soft particles: two screen rects (NDC) with the depth of each word's face
const MASK_GLSL = `uniform vec4 uM0; uniform vec4 uM1; uniform vec2 uMD; uniform vec2 uMK; uniform float uAsp;
float rectSD(vec2 p, vec4 r){ vec2 c = (r.xy + r.zw) * 0.5, h = (r.zw - r.xy) * 0.5; vec2 q = abs(p - c) - h; q.x *= uAsp; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0); }
float maskAt(vec2 ndc, float rad, float d){ float m = 1.0;
  if (d < uMD.x) m *= mix(1.0, smoothstep(0.0, 0.07, rectSD(ndc, uM0) - rad), uMK.x);
  if (d < uMD.y) m *= mix(1.0, smoothstep(0.0, 0.07, rectSD(ndc, uM1) - rad), uMK.y);
  return m; }`;
const LENS_GLSL = `uniform mat4 uView; uniform float uFocus; uniform float uAperture; uniform float uPx;`;

// gold bokeh beads (analytic defocus, like kit.bokeh) + mask
const BEAD_VS = `${LENS_GLSL} ${MASK_GLSL} attribute float aScale; varying float vA; varying float vM;
void main(){ vec4 mv = uView * modelMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.05); float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  float core = aScale * 1.6; float tot = core + coc; gl_Position = projectionMatrix * mv; gl_PointSize = min(tot * uPx * 0.5 * projectionMatrix[1][1] / d, 700.0); vA = (core * core) / (tot * tot);
  vM = maskAt(gl_Position.xy / gl_Position.w, gl_PointSize / uPx, d); }`;
const BEAD_FS = `uniform vec3 uColor; uniform float uOpacity; uniform float uFloor; varying float vA; varying float vM;
void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float k = 1.0 - vA;
  float soft = smoothstep(1.0, 0.0, r); soft = soft * soft * 1.6;
  float disc = smoothstep(1.0, 0.86, r) * (0.66 + 0.34 * smoothstep(0.45, 0.95, r));
  float a = mix(min(soft, 1.0), disc * max(vA * 2.2, uFloor), smoothstep(0.03, 0.55, k)); gl_FragColor = vec4(uColor * a * uOpacity * vM, 1.0); }`;

// thin gold rings with a dark glass fill (premultiplied): one Points object for all of them
const RING_VS = `${LENS_GLSL} ${MASK_GLSL} uniform float uT; attribute float aS; attribute float aThick; attribute float aFill; attribute float aB; attribute float aPh;
varying float vRR; varying float vW; varying float vAmp; varying float vFill; varying float vEdge; varying float vM; varying float vB;
void main(){ vec3 p = position + vec3(sin(uT * 0.55 + aPh) * 0.05, uT * 0.03 * (0.4 + fract(aPh * 3.7)), cos(uT * 0.4 + aPh * 1.7) * 0.05);
  vec4 mv = uView * modelMatrix * vec4(p, 1.0); float d = max(-mv.z, 0.05); float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  float tot = aS * 1.2 + coc * 1.1; gl_Position = projectionMatrix * mv; gl_PointSize = min(tot * uPx * 0.5 * projectionMatrix[1][1] / d, 600.0);
  vRR = aS / tot; float wl = max(aThick * aS, 0.004); vW = (wl * 0.5 + coc * 0.4) / (tot * 0.5); vAmp = wl / (wl + coc * 0.9);
  vFill = aFill; vEdge = (coc * 0.5 + aS * 0.03) / (tot * 0.5); vB = aB;
  vM = maskAt(gl_Position.xy / gl_Position.w, gl_PointSize / uPx, d); }`;
const RING_FS = `uniform vec3 uColor; uniform float uOpacity; varying float vRR; varying float vW; varying float vAmp; varying float vFill; varying float vEdge; varying float vM; varying float vB;
void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
  float x = (r - vRR) / max(vW, 0.004); float ln = exp(-x * x * 1.7) * vAmp;
  float halo = exp(-abs(r - vRR) * 14.0) * 0.18 * vAmp;
  float inside = (1.0 - smoothstep(vRR - vEdge - 0.015, vRR + vEdge * 0.2, r)) * vFill;
  float k = uOpacity * vM; gl_FragColor = vec4(uColor * vB * (ln + halo) * k, inside * k); }`;

// drifting gold dust around the camera (GPU drift, wraps in a box that travels with the lens) + mask
const DUST_VS = `${LENS_GLSL} ${MASK_GLSL} uniform float uT; uniform vec3 uCtr; uniform vec3 uBox; uniform vec3 uVel; attribute float aPh; attribute float aS; varying float vA; varying float vM; varying float vTw;
void main(){ vec3 b = position + uVel * uT * (0.55 + 0.9 * fract(aPh * 7.31)) + vec3(sin(uT * 0.8 + aPh), 0.5 * sin(uT * 0.5 + aPh * 2.3), cos(uT * 0.6 + aPh * 1.3)) * 0.09;
  vec3 h = uBox * 0.5; vec3 q = mod(b - uCtr + h, uBox) - h; vec3 p = uCtr + q; vec3 ed = smoothstep(h, h * 0.8, abs(q));
  vec4 mv = uView * vec4(p, 1.0); float d = max(-mv.z, 0.05); float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  float core = aS * 1.6; float tot = core + coc; gl_Position = projectionMatrix * mv; gl_PointSize = clamp(tot * uPx * 0.5 * projectionMatrix[1][1] / d, 1.0, 260.0);
  vA = (core * core) / (tot * tot) * ed.x * ed.y * ed.z; vTw = 0.55 + 0.45 * sin(uT * 2.1 + aPh * 11.0);
  vM = maskAt(gl_Position.xy / gl_Position.w, gl_PointSize / uPx, d); }`;
const DUST_FS = `uniform vec3 uColor; uniform float uOpacity; varying float vA; varying float vM; varying float vTw;
void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float soft = smoothstep(1.0, 0.0, r); soft *= soft;
  gl_FragColor = vec4(uColor * soft * min(1.0, vA * 3.0 + 0.04) * vTw * uOpacity * vM, 1.0); }`;

// black glass slab: SDF card (edges soften with defocus), warm reflection sheen, thin gold edge brighter where it faces
// the light above, a faint inner bevel line and a soft shadow around it; uBack = the slab's back edge only
const TILE_VS = `uniform mat4 uView; uniform float uFocus; uniform float uAperture; varying vec2 vP; varying float vCoc; varying vec2 vL; varying float vFr; varying float vSh;
void main(){ vP = position.xy; vec4 wp = modelMatrix * vec4(position, 1.0); vec4 mv = uView * wp; float d = max(-mv.z, 0.05); vCoc = uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  vec3 ax = normalize(modelMatrix[0].xyz), ay = normalize(modelMatrix[1].xyz), az = normalize(modelMatrix[2].xyz);
  vec3 Lw = normalize(vec3(0.15, 1.0, 0.3)); vL = vec2(dot(Lw, ax), dot(Lw, ay));
  vec3 vd = normalize(cameraPosition - wp.xyz); vFr = pow(1.0 - abs(dot(az, vd)), 2.0); vSh = dot(az, normalize(vec3(-0.45, 0.7, 0.55)));
  gl_Position = projectionMatrix * mv; }`;
const TILE_FS = `uniform vec2 uHalf; uniform float uR; uniform float uOw; uniform vec3 uEdge; uniform float uOpacity; uniform float uBack;
varying vec2 vP; varying float vCoc; varying vec2 vL; varying float vFr; varying float vSh;
float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
void main(){ float d = sdRR(vP, uHalf, uR); float s = max(vCoc, fwidth(d) * 0.75);
  float inside = 1.0 - smoothstep(-s, s, d);
  float sg = s * 0.55 + uOw * 0.5; float dl = d + uOw * 0.5; float ln = exp(-dl * dl / (2.0 * sg * sg)) * min(1.0, uOw / (uOw * 0.5 + s * 0.9));
  vec2 u = vP / uHalf; vec2 en = normalize(u * u * u + vec2(1e-4)); float lit = 0.3 + 1.0 * max(dot(en, normalize(vL + vec2(1e-4))), 0.0);
  if (uBack > 0.5) { gl_FragColor = vec4(uEdge * ln * lit * 0.5 * uOpacity, 0.0); return; }
  float band = dot(u, vec2(0.6, 0.8)) + 1.7 * vSh - 0.35; float sheen = exp(-band * band * 4.0);
  vec3 glass = vec3(0.009, 0.006, 0.004) + vec3(0.42, 0.29, 0.14) * (0.03 + 0.2 * vFr) + vec3(0.95, 0.74, 0.45) * sheen * 0.075;
  float dl2 = d + uOw * 3.2; float s2 = s * 0.55 + uOw * 0.35; float ln2 = exp(-dl2 * dl2 / (2.0 * s2 * s2)) * 0.2 * min(1.0, uOw / (uOw * 0.5 + s * 0.9));
  float sh = (1.0 - smoothstep(0.0, 0.4 * min(uHalf.x, uHalf.y) + s * 2.0, d)) * step(0.0, d) * 0.42;
  float a = max(inside * 0.94, sh);
  gl_FragColor = vec4((glass * inside * 0.94 + uEdge * (ln + ln2) * lit) * uOpacity, a * uOpacity); }`;

export default {
  build(ctx) {
    const { THREE, kit, tex, words, cfg } = ctx; const group = new THREE.Group(); const R = rng(367);
    const ASP = (cfg.width || 1920) / (cfg.height || 1080); const T0 = timeOfRf(367, cfg); const tOf = (rf) => timeOfRf(rf, cfg) - T0;
    const L = kit.lens; const lensU = () => ({ uView: L.view, uFocus: L.focus, uAperture: L.aperture, uPx: L.px });
    const MU = { uM0: { value: new THREE.Vector4(9, 9, 9, 9) }, uM1: { value: new THREE.Vector4(9, 9, 9, 9) }, uMD: { value: new THREE.Vector2(0, 0) }, uMK: { value: new THREE.Vector2(0, 0) }, uAsp: { value: ASP } };
    const PREMUL = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };
    const C = (c, g = 1) => new THREE.Color(c).multiplyScalar(g);
    const LIGHT = new THREE.Vector3(0.1, 0.92, 0.38).normalize();         // key light from above (view space, for the letters)
    const HEAVEN = new THREE.Vector3(0, Math.sin(27 * DEG), -Math.cos(27 * DEG));   // where the light pours from (world dir)

    // ================================================================ words
    // fallback, cap size, anchor, tilt (x back, y turn, z slant)
    const DEF = {
      s20: ['WHEN', 1.1, [0, 3.0, 0], [-0.2, -0.2, 0.02]],
      s21: ['IT FADES', 1.0, [0.3, 0.4, 0.8], [-0.22, 0.26, -0.06]],
      s22: ['WE', 1.3, [-1.6, -1.8, 2.2], [-0.22, -0.28, 0.05]],
      s23: ['STILL', 1.2, [1.9, -3.4, 0.8], [-0.2, -0.3, 0.1]],
      s24: ['RISE', 1.2, [2.6, -1.3, 1.6], [-0.22, -0.24, -0.04]],
      s25: ['TO', 1.35, [2.2, 0.8, 2.4], [-0.22, 0.28, -0.07]],
      s26: ['THE', 1.3, [3.0, 2.9, 3.2], [-0.22, -0.26, -0.08]],
      s28: ['SO', 1.5, [7.6, 4.4, 2.4], [-0.2, -0.3, 0.1]],
      s29: ['OFTEN', 1.45, [8.4, 7.6, -3.0], [-0.18, -0.22, -0.03]],
    };
    const A = {}, RIG = {}, W = {};
    Object.entries(DEF).forEach(([k, [fb, size, pos, tilt]], i) => { A[k] = pos; const rig = new THREE.Group(); rig.position.set(...pos); rig.rotation.set(...tilt); group.add(rig); RIG[k] = rig;
      W[k] = kit.word(words[k] || fb, { size, depth: 0.5, style: IVORY_GOLD, seed: 211 + i * 17 }); rig.add(W[k].group); });
    // s27 extends s26: same seed, so its first letters are the very same meshes' twins, placed exactly on top of them
    W.s27 = kit.word(words.s27 || 'THE SKY', { size: DEF.s26[1], depth: 0.5, style: IVORY_GOLD, seed: 211 + 6 * 17 }); RIG.s26.add(W.s27.group); W.s27.group.position.x = (W.s27.width - W.s26.width) / 2; RIG.s27 = RIG.s26;
    const KEYS = ['s20', 's21', 's22', 's23', 's24', 's25', 's26', 's27', 's28', 's29'];
    KEYS.forEach((k) => { const w = W[k]; w.set('uGrit', 0.045); w.set('uFaceAmt', 0.12); w.set('uLight', LIGHT); });
    group.updateMatrixWorld(true);
    { const c27 = new THREE.Vector3(W.s27.group.position.x, 0, 0).applyMatrix4(RIG.s26.matrixWorld); A.s27 = c27.toArray(); }
    // [start, formed, leave, gone]
    const SHOT = { s20: [367, 372, 375, 378.3], s21: [379, 388, 392, 397.5], s22: [394.8, 404, 410, 414.5], s23: [418.2, 423, 425, 428.8], s24: [426, 432, 438, 441.2],
      s25: [440, 450, 452.5, 455.8], s26: [453, 457, 462, 462], s27: [462, 467, 469, 473.2], s28: [477.2, 482.7, 486, 489.8], s29: [495.2, 505, 517.6, 530] };

    // ================================================================ camera
    // camera straight in front of a word, the word shown at screen position (fx, fy) (fractions of the half frame)
    const Dk = (k, cap, wmax = 0.72) => Math.max(W[k].size / (0.728 * cap), W[k].width / (1.294 * wmax));
    const at = (k, d, fx = 0, fy = 0, dx = 0, dy = 0) => { const c = A[k]; const ox = -fx * 0.647 * d, oy = -fy * 0.364 * d; return { p: [c[0] + ox + dx, c[1] + oy + dy, c[2] + d], t: [c[0] + ox, c[1] + oy, c[2]] }; };
    const K = (rf, pose, roll, e) => ({ rf, ...pose, roll, e });
    const d20 = Dk('s20', 0.4), d21 = Dk('s21', 0.32), d22 = Dk('s22', 0.46), d23 = Dk('s23', 0.4), d24 = Dk('s24', 0.4), d25 = Dk('s25', 0.42), d26 = Dk('s26', 0.4), d27 = Dk('s27', 0.36), d28 = Dk('s28', 0.5), d29 = Dk('s29', 0.41, 0.7);
    const CAM = [
      K(367, at('s20', d20 * 0.84, 0, 0.2), 4),
      K(372, at('s20', d20, 0, 0.26), 0, 'out3'),
      K(375, at('s20', d20 * 0.975, 0, 0.27), -0.4, 'lin'),
      K(384.5, at('s21', d21 * 1.05, 0, -0.03), -1, 'io3'),           // tilt down: WHEN dissolves upward
      K(391, at('s21', d21 * 0.99, 0.01, -0.04), -1.6, 'lin'),
      K(400.5, at('s22', d22 * 1.07, -0.16, -0.06), 1.5, 'io3'),      // glide down-left onto WE
      K(410, at('s22', d22 * 0.97, -0.15, -0.05), 0.4, 'lin'),
      K(415.6, { p: [0.4, -2.25, 7.0], t: [0.35, -2.55, 1.5] }, -2.5, 'in2'),   // slow arc: breathe out...
      K(421.5, at('s23', d23 * 1.04, 0.04, 0.02), -2.6, 'out2'),      // ...and in onto STILL
      K(425, at('s23', d23 * 1.0, 0.04, 0.02), -2.0, 'lin'),
      K(431.5, at('s24', d24 * 1.04, 0, -0.02), 1, 'io3'),            // the climb
      K(438.6, at('s24', d24 * 0.97, 0, -0.03), 0.6, 'lin'),
      K(446, at('s25', d25 * 1.04, 0.02, 0), -1, 'io3'),
      K(452.5, at('s25', d25 * 0.98, 0.02, 0), -1.2, 'lin'),
      K(457.5, at('s26', d26 * 1.02, -0.3, 0.02), 1, 'io3'),          // THE sits left: the sky will extend to the right
      K(459.5, at('s26', d26 * 1.0, -0.3, 0.02), 0.8, 'lin'),
      K(466.5, at('s27', d27, 0, 0.02), 0, 'io2'),                     // reveal THE SKY: pan right, pull back
      K(469, at('s27', d27 * 0.985, 0, 0.02), -0.3, 'lin'),
      K(479.5, at('s28', d28 * 1.06, 0.06, 0), 2, 'io3'),             // glide right/up onto SO
      K(486, at('s28', d28 * 0.97, 0.06, 0), 0.8, 'lin'),
      K(499.5, at('s29', d29 * 1.12, 0, -0.1, 0, -0.5), -1.5, 'io3'), // rising flight into the light
      K(505, at('s29', d29, 0, -0.08, 0, -0.42), 0, 'out2'),
      K(525, at('s29', d29 * 0.93, 0, -0.08, 0, -0.38), -1.2, 'lin'),
    ];

    // ================================================================ projection helpers (hold cameras, masks, edge safety)
    const pc = new THREE.PerspectiveCamera(40, ASP, 0.05, 600);
    const setPC = (c) => { pc.position.copy(c.pos); pc.up.set(0, 1, 0); pc.lookAt(c.tgt); if (c.roll) pc.rotateZ(c.roll * DEG); pc.fov = c.fov || 40; pc.updateProjectionMatrix(); pc.updateMatrixWorld(true); };
    const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _q = new THREE.Vector4();
    const wordBox = (w) => { let x0 = 9, y0 = 9, x1 = -9, y1 = -9, dF = 0; const hw = w.width / 2 + 0.04 * w.size, hh = w.size * 0.56;
      for (let i = 0; i < 8; i++) { _v.set(i & 1 ? hw : -hw, i & 2 ? hh : -hh, i & 4 ? -w.depth : 0).applyMatrix4(w.group.matrixWorld); _w.copy(_v).applyMatrix4(pc.matrixWorldInverse); if (!(i & 4)) dF = Math.max(dF, -_w.z);
        _v.project(pc); x0 = Math.min(x0, _v.x); x1 = Math.max(x1, _v.x); y0 = Math.min(y0, _v.y); y1 = Math.max(y1, _v.y); }
      return { r: [x0, y0, x1, y1], dF }; };
    const sdRect = (x, y, r) => { let qx = Math.abs(x - (r[0] + r[2]) / 2) - (r[2] - r[0]) / 2, qy = Math.abs(y - (r[1] + r[3]) / 2) - (r[3] - r[1]) / 2; qx *= ASP; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0); };
    const HOLD = { s20: 373.5, s21: 390, s22: 407, s23: 424, s24: 435, s25: 451.2, s26: 459, s27: 468, s28: 484.3, s29: 511 };
    const holds = Object.entries(HOLD).map(([k, hrf]) => { const c = kit.cam(CAM, hrf); setPC(c); const b = wordBox(W[k]);
      return { k, view: pc.matrixWorldInverse.clone(), vp: new THREE.Matrix4().multiplyMatrices(pc.projectionMatrix, pc.matrixWorldInverse), r: b.r, dF: b.dF, focus: c.pos.distanceTo(c.tgt), pos: c.pos.clone(), tgt: c.tgt.clone() }; });
    // a point (with radius) is clear when, for every hold, it is behind the word or off the word's screen box
    const isClear = (x, y, z, rad, pad = 0.07) => { for (const h of holds) { _v.set(x, y, z).applyMatrix4(h.view); const dep = -_v.z; if (dep < 0.15 || dep > h.dF + 0.25) continue;
      _q.set(x, y, z, 1).applyMatrix4(h.vp); const coc = 0.1 * Math.abs(dep - h.focus) / h.focus; if (sdRect(_q.x / _q.w, _q.y / _q.w, h.r) - (rad + coc) * 2.747 / dep < pad) return false; } return true; };

    // ================================================================ the space
    const su = { tNoise: { value: tex.noise }, uH: { value: HEAVEN }, uT: { value: 0 }, uLight: { value: 1 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 64, 40), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: su, side: THREE.BackSide, depthWrite: false })); sky.renderOrder = -10; group.add(sky);
    const ANCH = ['s20', 's21', 's22', 's23', 's24', 's25', 's27', 's28', 's29'];
    // pools of warm light behind each word (top-weighted: the light comes from above), and a tight backlight that rims the letters
    const pools = ANCH.map((k) => { const w = W[k], rig = RIG[k], cx = k === 's27' ? W.s27.group.position.x : 0;
      const pool = kit.plate(tex.glow, w.width * 1.7 + 3.4, w.size * 3.9, { color: '#ffae4f', additive: true, opacity: 0 }); pool.position.set(cx, w.size * 0.42, -1.6); pool.renderOrder = -6; rig.add(pool);
      const back = kit.plate(tex.glow, w.width * 1.25 + 0.6, w.size * 1.7, { color: '#ffcf78', additive: true, opacity: 0 }); back.position.set(cx, w.size * 0.12, -(w.depth + 0.45)); back.renderOrder = -5; rig.add(back);
      return { k, pool, back }; });
    // the light above: a broad warm glow high in the space, brighter as we climb
    const sun = kit.plate(tex.glow, 60, 34, { color: '#ffb860', additive: true, opacity: 0.12 }); sun.position.set(6, 22, -30); sun.renderOrder = -9; group.add(sun);

    // ---- strings of gold bokeh: a cluster behind each word, a deep layer, the corridor of the last flight, close soft discs
    let bp = [];
    ANCH.forEach((k, i) => { const c = A[k]; bp = bp.concat(kit.stringPoints({ strings: 3, dots: 40, box: [12, 7, 5], center: [c[0], c[1], c[2] - 2.6], size: 0.08, seed: 400 + i * 7 })); });
    bp = bp.concat(kit.stringPoints({ strings: 7, dots: 46, box: [30, 22, 10], center: [3.5, 2, -7.5], size: 0.12, seed: 471 }));
    bp = bp.concat(kit.stringPoints({ strings: 6, dots: 40, box: [9, 10, 9], center: [8.2, 6.4, -1.5], size: 0.085, seed: 472 }));
    bp = bp.filter((p) => isClear(p[0], p[1], p[2], p[3] * 0.8));
    const near = []; holds.forEach((h, i) => { const fw = new THREE.Vector3().subVectors(h.tgt, h.pos).normalize(), rt = new THREE.Vector3().crossVectors(fw, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(rt, fw);
      for (let j = 0; j < 4; j++) { const dist = R.range(1.1, 2.2), side = j % 2 ? 1 : -1; const sx = side * R.range(0.72, 1.05), sy = R.range(-0.95, 0.95) * (Math.abs(sx) > 0.85 ? 1 : 0.4) + (j > 1 ? 0.5 * Math.sign(R() - 0.5) : 0);
        const p = h.pos.clone().addScaledVector(fw, dist).addScaledVector(rt, sx * 0.647 * dist).addScaledVector(up, sy * 0.364 * dist); if (isClear(p.x, p.y, p.z, 0.05, 0.25)) near.push([p.x, p.y, p.z, R.range(0.03, 0.07)]); } });
    const beadMat = (color, gain, floor, opacity = 1) => new THREE.ShaderMaterial({ uniforms: { ...lensU(), ...MU, uColor: { value: C(color, gain) }, uOpacity: { value: opacity }, uFloor: { value: floor } }, vertexShader: BEAD_VS, fragmentShader: BEAD_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
    const pointsOf = (pts, mat, attrs = {}) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flatMap((p) => [p[0], p[1], p[2]]), 3)); Object.entries(attrs).forEach(([n, a]) => g.setAttribute(n, new THREE.Float32BufferAttribute(a, 1))); const m = new THREE.Points(g, mat); m.frustumCulled = false; m.renderOrder = 1; group.add(m); return m; };
    const beadSets = [[GOLD, 1.0, 0.1], ['#ffe6b8', 0.9, 0.1], ['#d98e34', 1.05, 0.12]].map(([col, g, fl], j) => pointsOf(bp.filter((_, i) => i % 3 === j), beadMat(col, g, fl), { aScale: bp.filter((_, i) => i % 3 === j).map((p) => p[3]) }));
    const nearSet = pointsOf(near, beadMat('#ffcf86', 0.8, 0.13), { aScale: near.map((p) => p[3]) });

    // ---- rings (one Points object): thin gold rings, many with a dark glass fill, a few bold ones
    const rings = []; ANCH.forEach((k) => { const c = A[k]; let n = 0, tries = 0; while (n < 22 && tries++ < 200) { const a = R() * TAU, dd = R.range(1.4, 5.4); const p = [c[0] + Math.cos(a) * dd, c[1] + Math.sin(a) * dd * 0.62, c[2] + R.range(-3.0, 1.2)]; const s = lerp(0.09, 0.62, Math.pow(R(), 2.0)); if (!isClear(p[0], p[1], p[2], s * 0.6)) continue; rings.push([...p, s]); n++; } });
    for (let i = 0; i < 50; i++) { const p = [R.range(-8, 14), R.range(-7, 12), R.range(-10, -4)], s = lerp(0.15, 0.7, R()); if (isClear(p[0], p[1], p[2], s)) rings.push([...p, s]); }
    rings.sort((a, b) => a[2] - b[2]);
    const ringMat = new THREE.ShaderMaterial({ uniforms: { ...lensU(), ...MU, uT: { value: 0 }, uColor: { value: C('#f3c66e', 1.15) }, uOpacity: { value: 1 } }, vertexShader: RING_VS, fragmentShader: RING_FS, transparent: true, depthWrite: false, ...PREMUL });
    const RR = rng(377); const ringPts = pointsOf(rings, ringMat, { aS: rings.map((r) => r[3]), aThick: rings.map(() => { const q = RR(); return q > 0.9 ? 0.16 : q > 0.6 ? 0.07 : 0.04; }), aFill: rings.map(() => (RR() < 0.5 ? RR.range(0.35, 0.6) : 0)), aB: rings.map(() => RR.range(0.6, 1.15)), aPh: rings.map(() => RR() * 50) });

    // ---- gold dust that drifts upward around the lens
    const DN = 650, dpos = [], dph = [], dsz = []; for (let i = 0; i < DN; i++) { dpos.push(R.range(-6, 6), R.range(-4, 4), R.range(-7, 7)); dph.push(R() * 60); dsz.push(Math.pow(R(), 3) * 0.022 + 0.006); }
    const dustU = { ...lensU(), ...MU, uT: { value: 0 }, uCtr: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(12, 8, 14) }, uVel: { value: new THREE.Vector3(0.03, 0.16, 0.02) }, uColor: { value: C('#ffd690', 1.2) }, uOpacity: { value: 0.9 } };
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(dpos, 3)); dg.setAttribute('aPh', new THREE.Float32BufferAttribute(dph, 1)); dg.setAttribute('aS', new THREE.Float32BufferAttribute(dsz, 1));
    const dust = new THREE.Points(dg, new THREE.ShaderMaterial({ uniforms: dustU, vertexShader: DUST_VS, fragmentShader: DUST_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); dust.frustumCulled = false; dust.renderOrder = 1; group.add(dust);

    // ---- black glass slabs with thin gold edges, tumbling slowly
    const tileGeo = {}; const tiles = [];
    const mkTile = (w, h, edge = '#f4c56c') => { const key = w.toFixed(2) + 'x' + h.toFixed(2); const pad = 0.9; const geo = tileGeo[key] || (tileGeo[key] = new THREE.PlaneGeometry(w + pad * 2, h + pad * 2));
      const mk = (back) => new THREE.Mesh(geo, new THREE.ShaderMaterial({ uniforms: { uView: L.view, uFocus: L.focus, uAperture: L.aperture, uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uR: { value: Math.min(w, h) * 0.035 }, uOw: { value: 0.024 + 0.012 * Math.min(w, h) }, uEdge: { value: C(edge, 1.25) }, uOpacity: { value: 1 }, uBack: { value: back ? 1 : 0 } }, vertexShader: TILE_VS, fragmentShader: TILE_FS, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...PREMUL }));
      const g = new THREE.Group(), front = mk(false), back = mk(true); back.position.set(0.012, -0.018, -(0.05 + 0.035 * Math.min(w, h))); front.renderOrder = back.renderOrder = -2; g.add(back, front); g.front = front; g.back = back; return g; };
    ANCH.forEach((k, i) => { const c = A[k]; let n = 0, tries = 0; const want = k === 's29' || k === 's21' ? 4 : 3;
      while (n < want && tries++ < 120) { const sz = R.range(0.7, 2.1), asp = R.range(0.78, 1.2); const a = (n / want) * TAU + R.range(-0.5, 0.5) + i, dd = R.range(2.4, 4.6); const p = [c[0] + Math.cos(a) * dd * 1.25, c[1] + Math.sin(a) * dd * 0.62, c[2] + R.range(-3.4, 0.6)];
        if (!isClear(p[0], p[1], p[2], sz * 0.75, 0.1)) continue; const t = mkTile(sz, sz * asp); t.position.set(...p); t.userData = { r: [R.range(-0.8, 0.8), R.range(-0.9, 0.9), R.range(-0.8, 0.8)], sp: [R.range(-0.05, 0.05), R.range(-0.06, 0.06), R.range(-0.03, 0.03)], ph: R() * 6 }; group.add(t); tiles.push(t); n++; } });

    // ---- gold crescents (a bevelled stroke + a fine bright edge) and thin halos
    const crescent = (k, rad, a0, a1, o = {}) => { const c = [o.x || 0, o.y || 0, o.z ?? -0.55], wd = o.w ?? 0.3, sq = o.sq || 1;
      const main = kit.ribbon(kit.arc(rad, a0, a1, 44, { center: c, squash: sq }), { width: wd, color: o.color || GOLD, gain: o.gain ?? 1.1, taper: o.t ?? 0.55, shade: 0.42, segments: 64 });
      const hi = kit.ribbon(kit.arc(rad + wd * 0.3, a0 + 3, a1 - 3, 44, { center: [c[0], c[1], c[2] + 0.012], squash: sq }), { width: Math.max(0.018, wd * 0.11), color: '#fff2cf', gain: 1.45, taper: o.t ?? 0.55, shade: 0, segments: 64 });
      RIG[k].add(main.mesh, hi.mesh); return { main, hi, swoosh(rf, t0, t1, t2, t3) { main.swoosh(rf, t0, t1, t2, t3); hi.swoosh(rf, t0 + 0.5, t1 + 0.5, t2 - 0.3, t3 - 0.3); } }; };
    const halo = (k, rad, o = {}) => { const r = kit.ribbon(kit.arc(rad, -90, 270, 90, { center: [o.x || 0, o.y || 0, o.z ?? -0.9], squash: o.sq || 1 }), { width: o.w ?? 0.045, color: o.color || '#ffd98c', gain: o.gain ?? 1.3, taper: 0.03, shade: 0.1, segments: 120 }); RIG[k].add(r.mesh); return r; };
    const w21 = W.s21.width, w22 = W.s22.width, w23 = W.s23.width, w24 = W.s24.width, w27 = W.s27.width, x27 = W.s27.group.position.x, w28 = W.s28.width, w29 = W.s29.width;
    const CR = {
      c21: crescent('s21', 1.9, 95, 175, { x: -w21 / 2 + 0.2, y: -0.15, w: 0.2, z: -0.6 }),
      a22: crescent('s22', 2.1, 32, 118, { x: 0.25, y: -0.5, w: 0.3, z: -0.7 }), b22: crescent('s22', 2.9, 25, 78, { x: -0.2, y: -1.0, w: 0.12, z: -1.1 }),
      e23: crescent('s23', w23 * 0.62 + 0.5, 8, 172, { y: -0.35, w: 0.1, sq: 0.62, z: -0.75, t: 0.9 }),
      v24: crescent('s24', w24 * 0.75 + 0.6, 205, 335, { y: 0.0, w: 0.16, sq: 0.42, z: -0.45, t: 0.8 }),
      c27: crescent('s27', 2.1, -60, 60, { x: x27 + w27 / 2 - 0.25, w: 0.38, z: -0.7 }),
      c28: crescent('s28', 1.65, 100, 260, { x: -w28 / 2 - 0.35, y: 0.05, w: 0.4, z: -0.6 }), e28: crescent('s28', 2.6, -95, 95, { x: -0.4, w: 0.06, sq: 0.8, z: -1.0, t: 1.4 }),
      c29: crescent('s29', 2.0, -58, 58, { x: w29 / 2 - 0.3, y: 0.05, w: 0.36, z: -0.75 }),
    };
    const halo29 = halo('s29', w29 * 0.62 + 0.2, { y: 0.15, sq: 0.5, z: -1.15, w: 0.05 }), halo29b = halo('s29', w29 * 0.66 + 0.35, { y: 0.17, sq: 0.52, z: -1.35, w: 0.018, gain: 1.1 });
    const halo23 = halo('s23', w23 * 0.5 + 0.2, { y: 1.05, sq: 0.18, z: -0.9, w: 0.035, gain: 1.15 });
    // aureole for OFTEN (beams + a faint dial: "so often"), rising shafts behind RISE
    const beams29 = kit.beams({ center: [0, 0.25, -1.8], count: 12, len: 8.5, color: '#ffc773', opacity: 0.13, seed: 29 }); RIG.s29.add(beams29.group);
    const orn29 = kit.ornaments({ center: [0, 0.3, -1.5], radius: w29 * 0.36 + 0.4, color: '#f2c16a', opacity: 0.3, seed: 31 }); orn29.group.scale.y = 0.5; RIG.s29.add(orn29.group);
    const beams24 = kit.beams({ center: [0, -0.9, -1.3], count: 8, len: 7, color: '#ffbd66', opacity: 0.1, seed: 24, spread: Math.PI * 0.8 }); beams24.group.rotation.z = Math.PI * 0.1; RIG.s24.add(beams24.group);

    // ---- the travelling light (warm), behind the word plane so the letters hide its core when it passes behind them
    const flare = kit.flare({ color: '#ffb550', size: 0.62, streak: 4.6, ghosts: false, gain: 1.0 }); flare.children.forEach((s) => { s.material.depthTest = true; s.renderOrder = 2; }); group.add(flare);
    const FLo = { s20: [-1.95, 0.72, -0.5], s21: [-2.75, -0.85, -0.4], s22: [-1.25, 0.55, -0.5], s23: [-2.2, 0.85, -0.5], s24: [1.75, 0.8, -0.5], s25: [-1.25, 0.95, -0.5], s27: [-2.95, 0.75, -0.5], s28: [1.55, 0.75, -0.5], s29: [-2.75, 0.62, -0.5] };
    const FL = [[367, 's20'], [381, 's21'], [399, 's22'], [420.5, 's23'], [431, 's24'], [445, 's25'], [466, 's27'], [480, 's28'], [500, 's29'], [525, 's29']].map(([f, k]) => [f, [A[k][0] + FLo[k][0], A[k][1] + FLo[k][1], A[k][2] + FLo[k][2]], 'io3']);

    // ---- landings: two reusable gold bursts (each word's hit sits behind its letters)
    const fx = [kit.impactFX([{ rf: 0, at: [0, 0, 0], size: 1, color: GOLD, sparks: 14 }]), kit.impactFX([{ rf: 0, at: [0, 0, 0], size: 1, color: '#ffd68c', sparks: 14 }])]; fx.forEach((f) => group.add(f.group));
    const HITS = [[372, 's20', 0.9], [388, 's21', 1.0], [404, 's22', 1.2], [423, 's23', 1.0], [432, 's24', 1.15], [450, 's25', 0.9], [457, 's26', 0.85], [467, 's27', 1.1], [482.7, 's28', 1.1], [505, 's29', 1.45]]
      .map(([hrf, k, s]) => { const w = W[k]; const p = new THREE.Vector3(k === 's27' ? x27 : 0, 0, -(w.depth + 0.6)).applyMatrix4(RIG[k].matrixWorld); return { rf: hrf, p, s }; });

    // ================================================================ per frame
    const mulO = (w, f) => { if (f >= 0.9999) return; for (const Lt of w.letters) { const u = Lt.mesh.material.uniforms.uOpacity; u.value *= f; Lt.mesh.visible = u.value > 0.003; } };
    const hideW = (w) => w.opacity(0);
    const ent = (w, rf, { start, stagger, dur, type, amp = 1, from = 0 }) => { const S = w.size; const g0 = w.style.gain;
      for (let i = from; i < w.n; i++) { const Lt = w.letters[i]; const tt = rf - (start + (i - from) * stagger), t = tt / dur;
        if (t <= 0) { w.pose(i, { o: 0 }); continue; } const e = ease.outBackSoft(sat(t)), k = 1 - e, o = sat(t * 3.2), sg = Lt.rnd < 0.5 ? -1 : 1;
        if (type === 'pop') w.pose(i, { s: Math.max(0.03, e), y: -k * S * 0.12, rz: k * sg * 0.22, o });
        else if (type === 'grow') w.pose(i, { y: -k * S * 0.9 * amp, x: -k * S * 0.06, s: lerp(0.08, 1, e), o });
        else if (type === 'fade') w.pose(i, { y: -k * S * 0.2, s: lerp(0.8, 1, e), rz: k * sg * 0.1, o: sat(t * 1.7) });
        else if (type === 'spin') w.pose(i, { ry: k * 1.9 * sg, s: lerp(0.72, 1, e), o });
        else if (type === 'depth') w.pose(i, { z: -k * S * 3.0 * amp, y: k * S * 0.12, rx: -k * 0.45, s: lerp(0.7, 1, e), o });
        Lt.mesh.material.uniforms.uGain.value = g0 + 0.22 * pulse(tt, dur * 0.42, 6, 0.8); } };
    const rigPose = (k, dy = 0, dz = 0, rx = 0, ry = 0, rz = 0) => { const r = RIG[k], a = A[k === 's27' ? 's26' : k], tl = DEF[k === 's27' ? 's26' : k][3]; r.position.set(a[0], a[1] + dy, a[2] + dz); r.rotation.set(tl[0] + rx, tl[1] + ry, tl[2] + rz); };
    const VIS = {}; const PRI = []; const sweepHold = (w, rf, k, amt = 0.32) => { const s = SHOT[k]; w.sweep(prog(rf, s[1] + 0.5, s[2] + 0.5), amt); };

    function poseWords(rf) {
      KEYS.forEach((k) => { W[k].reset(1); W[k].gain(W[k].style.gain); W[k].sweep(0, 0); VIS[k] = 0; });
      // WHEN — letters pop in out of the blur; on the leave it rises, tips back and dissolves (before the frame edge)
      { const w = W.s20, ex = prog(rf, 375, 378.3, 'in2'); rigPose('s20', 0.45 * ex, -0.3 * ex, -0.42 * ex); if (rf < 367.4 || ex >= 1) hideW(w); else { ent(w, rf, { start: 367.6, stagger: 0.55, dur: 4.2, type: 'pop' }); mulO(w, 1 - ex); sweepHold(w, rf, 's20'); VIS.s20 = (1 - ex) * prog(rf, 367.6, 370); } }
      // IT FADES — fades in letter by letter; on the leave it evaporates letter by letter, drifting up
      { const w = W.s21; rigPose('s21', 0, 0, 0, 0, -0.07 * prog(rf, 386, 397, 'io2')); if (rf < 379 || rf > 398.5) hideW(w); else { ent(w, rf, { start: 379, stagger: 1.05, dur: 5, type: 'fade' }); let left = 0;
        for (let i = 0; i < w.n; i++) { const f = prog(rf, 392 + i * 0.55, 394.6 + i * 0.55, 'in2'); if (f > 0) { const m = w.letters[i].mesh; m.position.y += f * 0.35 * w.size; m.scale.multiplyScalar(1 - 0.18 * f); const u = m.material.uniforms.uOpacity; u.value *= 1 - f; m.visible = u.value > 0.003; } left += 1 - f; }
        sweepHold(w, rf, 's21', 0.28); VIS.s21 = (left / w.n) * prog(rf, 379, 383); } }
      // WE — grows in giant; on the leave it turns away with the camera's arc and fades
      { const w = W.s22, ex = prog(rf, 410, 414.5, 'in2'); rigPose('s22', 0, 0, 0, 0.8 * ex, 0); if (rf < 394.8 || ex >= 1) hideW(w); else { ent(w, rf, { start: 394.8, stagger: 3.6, dur: 9, type: 'grow', amp: 0.42 }); mulO(w, 1 - ex); sweepHold(w, rf, 's22', 0.3); VIS.s22 = (1 - ex) * prog(rf, 394.8, 398); } }
      // STILL — letters turn in from a steep side view; leaves by tipping back
      { const w = W.s23, ex = prog(rf, 425, 428.8, 'in2'); rigPose('s23', -0.3 * ex, -0.4 * ex, -0.5 * ex); if (rf < 418.2 || ex >= 1) hideW(w); else { ent(w, rf, { start: 418.2, stagger: 0.6, dur: 5, type: 'spin' }); mulO(w, 1 - ex); VIS.s23 = (1 - ex) * prog(rf, 418.2, 420.5); } }
      // RISE — letters rise into place growing from small; tips back as the camera climbs past it
      { const w = W.s24, ex = prog(rf, 438, 441.2, 'in2'); rigPose('s24', -0.2 * ex, -0.4 * ex, -0.5 * ex); if (rf < 426 || ex >= 1) hideW(w); else { ent(w, rf, { start: 426, stagger: 1.0, dur: 6, type: 'grow', amp: 0.55 }); mulO(w, 1 - ex); sweepHold(w, rf, 's24'); VIS.s24 = (1 - ex) * prog(rf, 426, 429); } }
      // TO — letters fly in from depth
      { const w = W.s25, ex = prog(rf, 452.5, 455.8, 'in2'); rigPose('s25', -0.2 * ex, -0.4 * ex, -0.5 * ex); if (rf < 440 || ex >= 1) hideW(w); else { ent(w, rf, { start: 440, stagger: 4.0, dur: 10, type: 'depth' }); mulO(w, 1 - ex); sweepHold(w, rf, 's25', 0.28); VIS.s25 = (1 - ex) * prog(rf, 440, 443); } }
      // THE → THE SKY (the extension grows in to the right while the camera opens up)
      { if (rf < 462) { hideW(W.s27); if (rf < 453) hideW(W.s26); else { ent(W.s26, rf, { start: 453, stagger: 1.0, dur: 4.6, type: 'pop' }); sweepHold(W.s26, rf, 's26', 0.25); VIS.s26 = prog(rf, 453, 455); } rigPose('s26'); }
        else { hideW(W.s26); const w = W.s27, ex = prog(rf, 469, 473.2, 'in2'); rigPose('s26', -0.2 * ex, -0.4 * ex, -0.5 * ex); if (ex >= 1) hideW(w); else { ent(w, rf, { start: 462, stagger: 0.9, dur: 5.6, type: 'grow', amp: 0.5, from: Math.min(W.s26.n, w.n - 1) }); mulO(w, 1 - ex); sweepHold(w, rf, 's27', 0.3); VIS.s27 = 1 - ex; } } }
      // SO — letters arrive out of depth; tips back and sinks as the camera rises toward the light
      { const w = W.s28, ex = prog(rf, 486, 489.8, 'in2'); rigPose('s28', -0.3 * ex, -0.4 * ex, -0.55 * ex); if (rf < 477.2 || ex >= 1) hideW(w); else { ent(w, rf, { start: 477.2, stagger: 1.2, dur: 6, type: 'depth', amp: 0.8 }); mulO(w, 1 - ex); sweepHold(w, rf, 's28', 0.3); VIS.s28 = (1 - ex) * prog(rf, 477.2, 480); } }
      // OFTEN — the reference preset's grow; a slow turn and a long gold light sweep through the hold
      { const w = W.s29; rigPose('s29', 0, 0, 0, (rf - 505) * 0.0035, 0); if (rf < 495.2) hideW(w); else { ent(w, rf, { start: 495.2, stagger: 1.9, dur: 4.6, type: 'grow' }); w.sweep(prog(rf, 506, 516.5), 0.42); VIS.s29 = prog(rf, 495.2, 498); } }
    }

    const DBG = { on: false, log: [] };
    const update = (rf) => {
      const t = tOf(rf);
      // ---- camera
      const c = kit.cam(CAM, rf); c.pos.add(kit.shake(rf, 0.018, 0.33, 31)); c.aperture = 0.09; c.focus = c.pos.distanceTo(c.tgt);
      // ---- words, then everything that depends on where they are on screen
      poseWords(rf); group.updateMatrixWorld(true); setPC(c);
      const bars = track([[367, 0.075], [379, 0.075], [388, 0.045, 'io2'], [404, 0.035], [419, 0.035], [424, 0.05, 'out2'], [452, 0.05], [462, 0.07, 'out2'], [472, 0.07], [480, 0.045], [497, 0.045], [505, 0.065, 'out2'], [516, 0.065], [520, 0]], rf);
      const yLim = 1 - 2 * bars - 0.025, xLim = 0.975;
      const boxes = []; KEYS.forEach((k) => { if (!W[k].letters.some((Lt) => Lt.mesh.visible)) return; const b = wordBox(W[k]); b.k = k;
        // edge safety: a word never gets sliced by the frame — it fades out before its box reaches an edge
        const m = Math.min(xLim - Math.max(-b.r[0], b.r[2]), yLim - Math.max(-b.r[1], b.r[3])); const f = sat(m / 0.06); mulO(W[k], f); b.f = f; b.v = VIS[k] * f; boxes.push(b);
        if (DBG.on && f < 0.999 && VIS[k] > 0.3) DBG.log.push(`EDGE rf ${rf.toFixed(1)} ${k} vis ${VIS[k].toFixed(2)} margin ${m.toFixed(3)}`); });
      boxes.sort((a, b) => b.v - a.v);
      const setM = (i, b) => { const r = MU['uM' + i].value; if (b && b.v > 0.01) { r.set(b.r[0] - 0.035, b.r[1] - 0.05, b.r[2] + 0.035, b.r[3] + 0.05); MU.uMD.value.setComponent(i, b.dF + 0.05); MU.uMK.value.setComponent(i, sat(b.v * 1.5)); } else { r.set(9, 9, 9, 9); MU.uMK.value.setComponent(i, 0); } };
      setM(0, boxes[0]); setM(1, boxes[1]);
      if (DBG.on) DBG.boxes = boxes;

      // ---- the space
      sky.position.copy(c.pos); const climb = prog(rf, 418, 512, 'io2'); su.uT.value = t; su.uLight.value = lerp(0.72, 1.3, climb) * (1 + 0.25 * pulse(rf, 505, 14));
      sun.material.opacity = lerp(0.07, 0.2, climb);
      pools.forEach(({ k, pool, back }) => { const s = SHOT[k === 's27' ? 's26' : k], e = SHOT[k]; const v = prog(rf, s[0] - 3, s[1], 'io2') * (1 - prog(rf, e[2], e[3] + 2.5, 'io2'));
        pool.material.opacity = 0.2 * v * (k === 's29' ? 1.25 : 1); back.material.opacity = 0.11 * v; pool.visible = back.visible = v > 0.002; });
      ringMat.uniforms.uT.value = t; dustU.uT.value = t; dustU.uCtr.value.copy(c.tgt).sub(c.pos).normalize().multiplyScalar(6.0).add(c.pos);
      tiles.forEach((q) => { const u = q.userData; q.rotation.set(u.r[0] + t * u.sp[0], u.r[1] + t * u.sp[1], u.r[2] + t * u.sp[2] + 0.06 * Math.sin(t * 0.7 + u.ph)); });
      nearSet.material.uniforms.uOpacity.value = 1;

      // ---- strokes (all behind their words; they draw on with the word and wipe off before it leaves)
      CR.c21.swoosh(rf, 386, 390.5, 393, 397); CR.a22.swoosh(rf, 399, 404, 409, 413.5); CR.b22.swoosh(rf, 400.5, 405.5, 409.5, 414);
      CR.e23.swoosh(rf, 419.5, 423.5, 425, 428.5); CR.v24.swoosh(rf, 430, 435, 437.5, 441); CR.c27.swoosh(rf, 463.5, 467.5, 469, 473);
      CR.c28.swoosh(rf, 478.5, 482.5, 485.5, 489.5); CR.e28.swoosh(rf, 479.5, 484.5, 485.5, 489.5); CR.c29.swoosh(rf, 497, 502, 507, 513);
      const h29 = prog(rf, 501, 509, 'out3'); halo29.set(0.5 - 0.5 * h29, 0.5 + 0.5 * h29); halo29b.set(0.5 - 0.5 * prog(rf, 503, 512, 'out3'), 0.5 + 0.5 * prog(rf, 503, 512, 'out3')); halo29.mesh.visible = h29 > 0.01; halo29b.mesh.visible = rf > 503;
      halo23.swoosh(rf, 420.5, 424, 425, 428);
      beams29.update(rf, prog(rf, 500, 509, 'io2')); orn29.update(rf, prog(rf, 503, 511, 'io2')); beams24.update(rf, prog(rf, 428, 434, 'io2') * (1 - prog(rf, 437.5, 441)));

      // ---- the light
      const fp = track(FL, rf); flare.position.set(fp[0], fp[1], fp[2]); flare.setIntensity((0.62 + 0.12 * Math.sin(t * 2.4) + 0.4 * pulse(rf, 413.5, 6) + 0.35 * pulse(rf, 492, 7)) * prog(rf, 368, 373));
      fx.forEach((f, i) => { let hit = null; for (let j = i; j < HITS.length; j += 2) if (rf >= HITS[j].rf - 0.5 && rf < HITS[j].rf + 16) hit = HITS[j]; const grp = f.group.children[0];
        if (hit) { grp.position.copy(hit.p); grp.scale.setScalar(hit.s); f.update(rf - hit.rf); } else f.update(-99); });

      // ---- the edit
      const hitP = HITS.reduce((a, h) => a + pulse(rf, h.rf, 6), 0);
      const arc = pulse(rf, 413.5, 5, 3.5), glide = pulse(rf, 474, 6, 4.5), rise = pulse(rf, 492.5, 6, 6);
      _v.copy(c.pos).addScaledVector(HEAVEN, 200).project(pc); const sx = _v.x * 0.5 + 0.5, sy = _v.y * 0.5 + 0.5;
      const pop = prog(rf, 515.4, 516.6) * (1 - prog(rf, 518, 520));
      return { cam: c, clear: 0x050302, post: {
        saturation: lerp(0.3, 1.06, prog(rf, 367, 373, 'out2')), tint: [1.035, 0.99, 0.91], contrast: 1.1 + 0.12 * pop, exposure: 1.0,
        bloom: 0.42 + 0.12 * hitP + 0.15 * (arc + rise), bloomThreshold: 0.8, bloomTint: [1.0, 0.84, 0.6], vignette: 0.85, chroma: 0.0011 + 0.0025 * (arc + glide + rise), sharpen: 0.4, dust: 0.26, grain: 0.035, streak: 0.32,
        zoomBlur: Math.max(0.8 * (1 - prog(rf, 367, 370.5, 'out2')), 0.18 * arc, 0.16 * glide, 0.26 * rise), zoomCenter: [0.5, 0.5], zoom: 1 + 0.012 * hitP, lens: 0.035 * hitP,
        rays: 0.1 + 0.1 * climb + 0.22 * prog(rf, 503, 510) * (1 - prog(rf, 517, 521)) + 0.15 * rise, raysCenter: [sx, Math.min(sy, 1.3)],
        leak: 0.1 + 0.1 * climb + 0.25 * (arc + rise) + 0.12 * glide, leakColor: [1.0, 0.72, 0.36], leakPos: [sx, Math.min(sy, 1.2)], leakSize: 1.0,
        flash: 0.12 * rise, flashColor: [1.0, 0.86, 0.6],
        bars, barsAlpha: 0.92, barsGlow: 0.24 + 0.4 * pulse(rf, 505, 10), barsGlowColor: [1.0, 0.8, 0.48],
        smoke: prog(rf, 517.6, 524.4, 'io2'), smokeColor: [1.0, 0.74, 0.36],
        ovlA: rf >= 517.6 ? { clip: 'smoke_puff', t: (rf - 517.6) / 30 * 1.6, amt: 0.85 * prog(rf, 517.6, 519.5), tint: [1.0, 0.84, 0.6], scale: 1.5, oy: 0.1 } : null,
      } };
    };

    // ---- build-time framing report (prints only without --quiet): every hold's box, and any frame where a word nears an edge
    if (typeof console !== 'undefined') { DBG.on = true; const lines = [];
      KEYS.forEach((k) => { const s = SHOT[k]; [s[1], (s[1] + s[2]) / 2, s[2]].forEach((f) => { update(f); const b = (DBG.boxes || []).find((x) => x.k === k); if (b) lines.push(`${k} rf ${f.toFixed(1)} box [${b.r.map((v) => v.toFixed(2)).join(', ')}] f ${b.f.toFixed(2)}`); }); });
      for (let f = 367; f < 525; f += 0.5) update(f);
      console.log('J-FRAMING ' + lines.join(' | ')); console.log('J-EDGE ' + (DBG.log.length ? DBG.log.slice(0, 40).join(' | ') : 'none')); console.log(`J-COUNT beads ${bp.length} near ${near.length} rings ${rings.length} tiles ${tiles.length} objects ${(() => { let n = 0; group.traverse(() => n++); return n; })()}`); DBG.on = false; }
    return { group, update };
  },
};
