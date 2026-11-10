// SECTION A — "ink burst"  (reference frames 0–20): the title word s01, then s02
//   rf 0–3      red / white liquid ink streams past the lens (motion blur, never blown out); s01 comes out of it, very close
//   rf 3–4.3    s01 slams back onto the canvas, its letters settling one after another. At the hit a blue-white ink
//               ring bursts out behind it: impact ring + sparks, ink speckles, brush curls drawing on
//   rf 4.5–7.5  HOLD — s01 sharp on its dark smoke nest. Slow pull-back, 3° of turn, a small camera arc (parallax between
//               the layers), ring growing to the frame edge, light sweep, a beat pulse at rf 6.9. Nothing crosses the letters
//   rf 7.6–10.5 s01 tips back and sinks out of focus while black ink closes in from the frame edges
//   rf 10.5–12.3 the ink opens from the centre on the ember field of shot 2 and the focus racks in
//   rf 11.4–13.3 s02 comes forward out of the dark letter by letter and lands (impact, two dry-brush strokes)
//   rf 13.5–17.5 HOLD — s02 sharp, lit from the right, light shafts and a pool of ember light behind its smoke nest
//   rf 17.5–21  s02 tips back and sinks into red fog (it keeps its rim, so it reads while it dims); the ripple field that
//               section B opens on fades up underneath
// Layer order (back to front): ink field · light shafts · ink ring / splash · smoke nest · dial + impact rings · WORD ·
// brush strokes (never over the word) · dust and bokeh at every depth (masked out in front of the word) · soft dark
// shapes and light leaks at the frame edges.
import { ease, prog, sat, lerp, track, pulse, clamp, rng, wobble, TAU, DEG } from '../util.js';

const VS_UV = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
// same, but drawn from the un-jittered lens (kit.lens.view): thin lines stay thin instead of ghosting under depth of field
const VS_UV_STILL = /* glsl */ `uniform mat4 uView; varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * uView * modelMatrix * vec4(position, 1.0); }`;

// domain-warped ink / smoke field (backgrounds) with a pool of light that picks up the ink texture
const FS_INK = /* glsl */ `
uniform sampler2D tNoise; uniform float uTime; uniform float uScale; uniform float uRot; uniform vec2 uAniso; uniform vec2 uOff;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uTint; uniform float uTintAmt;
uniform float uLo; uniform float uHi; uniform float uGain; uniform float uVig; uniform float uCrease;
uniform vec3 uPoolCol; uniform float uPool; uniform float uPoolR; uniform vec2 uPoolC;
varying vec2 vUv;
vec3 nz(vec2 p){ return texture2D(tNoise, p).rgb; }
void main(){
  vec2 c = (vUv - 0.5) * vec2(1.7778, 1.0);
  float cr = cos(uRot), sr = sin(uRot);
  vec2 p = (mat2(cr, -sr, sr, cr) * c) * uAniso * uScale + uOff;
  float t = uTime;
  vec2 q = nz(p * 0.31 + vec2(t * 0.11, -t * 0.07)).rg - 0.5;
  vec2 r = nz(p * 0.74 + q * 1.35 + vec2(-t * 0.05, t * 0.13)).gb - 0.5;
  float f = nz(p * 1.07 + r * 1.25 + q * 0.5).r;
  float g = nz(p * 2.6 - r * 0.8 + 3.7).b;
  float h = nz(p * 0.19 + q * 0.35 + 9.1).g;
  float d = f * 0.74 + g * 0.26;
  vec3 col = mix(uC0, uC1, smoothstep(uLo, uLo + 0.2, d));
  col = mix(col, uC2, smoothstep(uLo + 0.14, uHi, d));
  col = mix(col, uC3, smoothstep(uHi - 0.03, uHi + 0.13, d + (g - 0.5) * 0.22));
  col = mix(col, uTint * (0.35 + 1.3 * d), uTintAmt * smoothstep(0.42, 0.68, h));
  // thin dark veins along iso-lines of the warped field (oil-paint wrinkles)
  float iso = abs(fract(d * 7.0 + q.x * 1.5) - 0.5);
  float vein = (1.0 - smoothstep(0.0, 0.06, iso)) * smoothstep(0.35, 0.62, g);
  col *= 1.0 - uCrease * vein;
  vec2 pc = c - uPoolC; float pool = exp(-dot(pc, pc) / (uPoolR * uPoolR));
  col += uPoolCol * (uPool * pool * (0.4 + 1.2 * d));
  col *= uGain * mix(1.0, smoothstep(1.15, 0.2, length(c) * 3.0), uVig);
  gl_FragColor = vec4(col, 1.0);
}`;

// blue-white ink ring: an expanding, clumpy band of light with fine filaments (rgb, added) around a dark smoky core (alpha)
const FS_BURST = /* glsl */ `
uniform sampler2D tNoise; uniform float uT; uniform float uR; uniform float uW; uniform float uAmt; uniform float uDark; uniform float uCore; uniform float uSeed; uniform vec2 uStretch;
varying vec2 vUv;
vec3 nz(vec2 p){ return texture2D(tNoise, p).rgb; }
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  vec2 pn = p * uStretch;                                   // noise in world proportions although the plane is an ellipse
  vec3 w1 = nz(pn * 0.42 + uSeed + vec2(0.0, uT * 0.006));
  vec2 q = p + (w1.rg - 0.5) * 0.36;
  vec3 w2 = nz(pn * 1.05 + (w1.gb - 0.5) * 0.5 + 2.3 - vec2(uT * 0.008, 0.0));
  q += (w2.gb - 0.5) * 0.17;
  float r = length(q);
  vec3 w3 = nz(pn * 2.9 + (w2.rg - 0.5) * 0.6 + 5.1 + vec2(uT * 0.004));
  vec3 w4 = nz(pn * 7.1 + (w3.gb - 0.5) * 0.8 + 1.7 - vec2(0.0, uT * 0.003));
  float billow = 1.0 - abs(w3.r * 2.0 - 1.0);
  float fil = pow(1.0 - abs(w4.r * 2.0 - 1.0), 3.0);
  float inner = smoothstep(uR - uW * 1.7, uR, r), outer = 1.0 - smoothstep(uR, uR + uW * 0.8, r);
  float ring = inner * outer;
  float clump = smoothstep(0.3, 0.7, w2.r);
  float dens = ring * (0.16 + 1.25 * clump) * (0.4 + 0.85 * billow) + ring * fil * 0.6 * (0.35 + clump);
  dens += smoothstep(uR, uR * 0.3, r) * 0.15 * smoothstep(0.5, 0.82, w3.g) * (0.4 + fil);          // wisps left inside the ring
  dens *= uAmt;
  vec3 deep = vec3(0.05, 0.10, 0.62), mid = vec3(0.16, 0.5, 1.0), hot = vec3(0.84, 0.94, 1.0), mag = vec3(0.86, 0.14, 0.62);
  vec3 col = mix(deep, mid, smoothstep(0.06, 0.5, dens)); col = mix(col, hot, smoothstep(0.5, 1.2, dens));
  col = mix(col, mag, smoothstep(0.56, 0.8, w1.b) * 0.6 * (1.0 - smoothstep(0.5, 1.0, dens)));
  float grey = smoothstep(0.05, 0.75, p.x + (w1.g - 0.5) * 0.5);                                   // one side: grey-white smoke
  col = mix(col, vec3(dot(col, vec3(0.4, 0.4, 0.2))) * vec3(1.02, 1.0, 1.1), grey * 0.7);
  float core = exp(-dot(p, p) / max(uR * uR * 0.35 + 0.004, 1e-4)) * uCore;
  vec3 light = col * min(dens, 1.5) + vec3(0.72, 0.9, 1.0) * core;
  float dark = smoothstep(uR * 1.12, uR * 0.42, r + (w3.b - 0.5) * 0.22) * uDark;
  gl_FragColor = vec4(light, clamp(dark, 0.0, 1.0));
}`;

// dark smoke nest behind a word: a ragged cloud shaped like the word's box, so every letter sits on darkness
const FS_NEST = /* glsl */ `
uniform sampler2D tNoise; uniform float uTime; uniform vec3 uCol; uniform float uAmt; uniform float uSeed; uniform vec2 uSize; uniform vec2 uBox; uniform float uFall;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * uSize;
  vec3 w = texture2D(tNoise, p * 0.11 + uSeed + vec2(uTime * 0.05, 0.0)).rgb;
  vec2 q = p + (w.rg - 0.5) * 0.5;
  float n = texture2D(tNoise, q * 0.33 + 4.2 + vec2(0.0, uTime * 0.07)).r;
  vec2 dd = abs(q) - uBox; float sd = length(max(dd, 0.0)) + min(max(dd.x, dd.y), 0.0);
  float a = 1.0 - smoothstep(0.0, uFall, sd + (n - 0.5) * uFall * 0.9);
  a *= 0.8 + 0.28 * texture2D(tNoise, q * 0.8 + 1.3).g;
  gl_FragColor = vec4(uCol, clamp(a * uAmt, 0.0, 1.0));
}`;

// concentric ripple field (the look section B opens on) with an alpha so it can fade in
const FS_RIPPLE = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uRings; uniform float uVig; uniform float uAlpha; varying vec2 vUv;
void main(){ vec2 p = (vUv - 0.5) * vec2(1.7778, 1.0); float r = length(p); float w = sin(r * uRings - uTime * 3.0) * 0.5 + 0.5; w = smoothstep(0.15, 0.85, w);
  vec3 col = mix(uB, uA, smoothstep(0.75, 0.0, r)); col = mix(col, uC, w * 0.42 * smoothstep(1.0, 0.05, r)); col *= mix(1.0, smoothstep(1.05, 0.25, r), uVig); gl_FragColor = vec4(col, uAlpha); }`;

// rain / film streaks on a plane BEHIND the words
const FS_RAIN = /* glsl */ `
uniform float uT; uniform float uAmt; uniform float uCols; uniform float uRows; varying vec2 vUv;
float h1(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float layer(vec2 uv, float cols, float speed, float seed){
  float x = uv.x * cols; float cx = floor(x); float fx = fract(x);
  float r1 = h1(vec2(cx, seed)), r2 = h1(vec2(cx, seed + 7.3)), r3 = h1(vec2(cx, seed + 13.1));
  float on = step(0.62, r1);
  float per = 0.42 + 0.5 * r2;
  float y = (uv.y + uT * speed * (0.7 + 0.6 * r3)) / per + r2 * 9.0;
  float cell = floor(y); float fy = fract(y);
  float len = 0.10 + 0.2 * h1(vec2(cx, cell + seed));
  float s = smoothstep(0.0, 0.02, fy) * (1.0 - smoothstep(len * 0.5, len, fy));
  float w = 1.0 - smoothstep(0.16, 0.42, abs(fx - 0.5));
  return on * s * w * (0.4 + 0.6 * h1(vec2(cell, cx + seed)));
}
void main(){
  vec2 uv = vec2(vUv.x, vUv.y * uRows);
  float a = layer(uv, uCols, 1.0, 1.0) + 0.7 * layer(uv + vec2(0.371, 0.113), uCols * 0.73, 1.35, 5.0);
  gl_FragColor = vec4(vec3(0.84, 0.88, 0.95) * a * uAmt, 1.0);
}`;

// dry-brush stroke: trim-path in the shader, ragged edges, white core with a red rim / underside
const VS_BRUSH = /* glsl */ `
attribute vec3 aSide; attribute vec2 aQ;
uniform float uA; uniform float uB; uniform float uW; uniform float uTaper; uniform float uHead;
varying vec2 vQ; varying float vF;
void main(){
  float f = clamp((aQ.x - uA) / max(uB - uA, 1e-4), 0.0, 1.0);
  float tp = pow(max(sin(3.14159265 * clamp(f, 0.002, 0.998)), 0.0), uTaper);
  tp *= 1.0 + uHead * smoothstep(0.7, 0.96, f);
  vec3 p = position + aSide * (uW * tp);
  vQ = aQ; vF = f;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;
const FS_BRUSH = /* glsl */ `
uniform sampler2D tNoise; uniform float uA; uniform float uB; uniform vec3 uCore; uniform vec3 uRim; uniform float uGain; uniform float uRimAmt; uniform float uFray; uniform float uSeed; uniform float uLen;
varying vec2 vQ; varying float vF;
void main(){
  if (vQ.x < uA || vQ.x > uB) discard;
  float e = abs(vQ.y);
  float br = texture2D(tNoise, vec2(vQ.x * uLen * 0.045 + uSeed, vQ.y * 0.33 + uSeed * 1.7)).r;
  float br2 = texture2D(tNoise, vec2(vQ.x * uLen * 0.21 + 3.1, vQ.y * 0.8 + uSeed)).g;
  float edge = 1.0 - uFray * (0.2 + 0.8 * br) * 0.55;
  if (e > edge + (br2 - 0.5) * uFray * 0.35) discard;
  float ends = min(smoothstep(0.0, 0.16, vF), smoothstep(1.0, 0.9, vF));
  if (br2 > 1.0 - uFray * 0.42 * (1.0 - ends * 0.75) && e > 0.25) discard;      // dry gaps, mostly near the ends
  vec3 col = mix(uCore, uRim, uRimAmt * smoothstep(0.5, 0.95, e));
  col = mix(col, uRim * 0.85, uRimAmt * 0.8 * smoothstep(-0.05, -0.8, vQ.y));
  col *= 0.84 + 0.3 * br;
  gl_FragColor = vec4(col * uGain, 1.0);
}`;

// "is this point in front of the word?" — projects a world point from the lens onto the word's plane; anything that
// would land on the word's box is switched off, so no speck, ember or bokeh disc ever crosses the letters
const KEEP_GLSL = /* glsl */ `
uniform mat4 uWordInv; uniform vec3 uCamL; uniform vec2 uHalf; uniform float uKeep;
float keepOut(vec3 wp, float rad){
  vec3 pl = (uWordInv * vec4(wp, 1.0)).xyz;
  float dz = uCamL.z - pl.z;
  if (pl.z < -0.08 || dz < 0.02) return 1.0;                 // behind the faces: the letters hide it anyway
  float t = uCamL.z / dz;
  vec2 q = abs(uCamL.xy + (pl.xy - uCamL.xy) * t) - uHalf - rad * t;
  float inside = (1.0 - smoothstep(0.0, 0.16, q.x)) * (1.0 - smoothstep(0.0, 0.16, q.y));
  return 1.0 - inside * uKeep;
}`;

// motes: camera-facing discs with ANALYTIC defocus (they widen into flat bokeh discs by the thin-lens blur circle, so
// they are smooth at any sample count). Drift mode wraps them in a box; BURST mode flings them outward from a point.
const VS_MOTE = /* glsl */ `
attribute vec3 aPos; attribute vec4 aRnd; attribute vec4 aDir;
uniform mat4 uView; uniform float uFocus; uniform float uAperture; uniform float uPx;
uniform float uT; uniform vec3 uVel; uniform vec3 uBox; uniform vec3 uCenter; uniform float uSway; uniform float uSize; uniform float uMaxFrac; uniform float uReach;
${KEEP_GLSL}
varying vec2 vQ; varying float vA; varying float vK; varying float vHue;
void main(){
#ifdef BURST
  float t = max(uT - aRnd.z, 0.0);
  float k = 1.0 - exp(-t * 0.55);
  vec3 p = aPos + aDir.xyz * (aDir.w * (k * uReach + t * 0.05));
  p.y -= 0.003 * t * t * aDir.w;
  float life = smoothstep(0.0, 0.4, t) * (1.0 - smoothstep(4.5, 9.0, t));
#else
  vec3 p = aPos + uVel * uT * (0.55 + 0.9 * aRnd.z);
  p.x += sin(uT * 0.11 * (0.5 + aRnd.z) + aRnd.y * 6.2832) * uSway;
  p.y += cos(uT * 0.09 * (0.5 + aRnd.z) + aRnd.y * 17.0) * uSway * 0.6;
  p = mod(p + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 e = abs(p) / (0.5 * uBox);
  float life = (1.0 - smoothstep(0.8, 1.0, e.x)) * (1.0 - smoothstep(0.8, 1.0, e.y)) * (1.0 - smoothstep(0.8, 1.0, e.z));
  life *= 0.62 + 0.38 * sin(uT * 0.7 * (0.6 + aRnd.z) + aRnd.y * 40.0);
  p += uCenter;
#endif
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vec4 mv = uView * wp; float d = max(-mv.z, 0.02);
  float pix = 2.0 * d / (uPx * projectionMatrix[1][1]);                          // world size of one pixel at this depth
  float core = uSize * aRnd.x * 1.6; float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  float tot = core + coc;
  float shown = clamp(tot, 1.6 * pix, max(uMaxFrac * uPx * pix, 1.6 * pix));
  vK = 1.0 - (core * core) / (tot * tot);
  vA = life * keepOut(wp.xyz, 0.5 * shown) * min(1.0, (tot * tot) / (shown * shown)) * smoothstep(0.12, 0.4, -mv.z);
  vHue = aRnd.w; vQ = position.xy;
  mv.xy += position.xy * (0.5 * shown);
  gl_Position = projectionMatrix * mv;
}`;
const FS_MOTE = /* glsl */ `
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uOpacity; uniform float uFloor;
varying vec2 vQ; varying float vA; varying float vK; varying float vHue;
void main(){
  float r = length(vQ); if (r >= 1.0) discard;
  float soft = smoothstep(1.0, 0.0, r); soft = min(soft * soft * 1.6, 1.0);
  float disc = smoothstep(1.0, 0.86, r) * (0.7 + 0.3 * smoothstep(0.5, 0.95, r));
  vec3 col = vHue < 0.5 ? mix(uColA, uColB, vHue * 2.0) : mix(uColB, uColC, vHue * 2.0 - 1.0);
#ifdef INK
  float a = mix(soft, disc * max((1.0 - vK) * 2.2, 0.5), smoothstep(0.03, 0.55, vK)) * vA * uOpacity;
  gl_FragColor = vec4(col * a, a);
#else
  float a = mix(soft, disc * max((1.0 - vK) * 2.2, uFloor), smoothstep(0.03, 0.55, vK)) * vA * uOpacity;
  gl_FragColor = vec4(col * a, 1.0);
#endif
}`;

// ink matte for the shot change: black ink with a ragged, fingered edge closes in from the frame edges and opens again
// from the centre (rgb = ink + glowing rim, alpha = ink cover)
const FS_MATTE = /* glsl */ `
uniform sampler2D tNoise; uniform float uHole; uniform float uSoft; uniform vec3 uInk; uniform vec3 uRim; uniform float uRimAmt; uniform float uT; uniform float uAspect;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * vec2(uAspect, 1.0) * 1.2;
  float r = length(p); float a = atan(p.y, p.x) / 6.2831853;
  float n1 = texture2D(tNoise, vec2(a * 3.0 + 0.13, 0.37 + uT * 0.011)).r;
  float n1b = texture2D(tNoise, vec2(a * 9.0 + 0.71, r * 0.5 - uT * 0.02)).g;
  float n2 = texture2D(tNoise, p * 0.55 + vec2(uT * 0.013, -uT * 0.008)).b;
  float open = clamp(uHole * 3.0, 0.0, 1.0);
  float edge = uHole * (0.66 + 0.5 * n1 + 0.22 * n1b) + (n2 - 0.5) * 0.3 * open - 0.15 * (1.0 - open);
  float ink = smoothstep(edge - uSoft, edge + uSoft, r);
  float rim = exp(-pow((r - edge) / (uSoft * 1.6 + 0.03), 2.0)) * open;
  float tx = texture2D(tNoise, p * 0.9 + 3.1 + vec2(0.0, uT * 0.01)).r;
  gl_FragColor = vec4(uInk * (0.35 + 1.5 * tx) * ink + uRim * (rim * uRimAmt), ink);
}`;

export default {
  build(ctx) {
    const { THREE, kit, tex, words, cfg } = ctx;
    const group = new THREE.Group();
    const HPX = (cfg && cfg.height) || 1080; const ASPECT = ((cfg && cfg.width) || 1920) / HPX;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const COL = (c) => new THREE.Color(c);
    const U = (v) => ({ value: v });
    const gexp = (x, tau, pw) => Math.exp(-Math.pow(Math.max(0, x) / tau, pw));     // 1 -> 0, smooth both ends
    const ramp = (x, k) => (x <= 0 ? 0 : (x * x) / (x + k));                          // 0 with zero slope, then ~linear
    const CUT = 10.5;                                  // shot 1 -> shot 2 (hidden under the ink)
    const shot1 = new THREE.Group(), shot2 = new THREE.Group(), hud = new THREE.Group(); group.add(shot1, shot2, hud);
    const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };
    const OVER = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor };   // rgb = light, alpha = cover
    const LENS = { uView: kit.lens.view, uFocus: kit.lens.focus, uAperture: kit.lens.aperture, uPx: kit.lens.px };
    const mkKeep = () => ({ uWordInv: U(new THREE.Matrix4()), uCamL: U(V3(0, 0, 5)), uHalf: U(new THREE.Vector2(1, 0.6)), uKeep: U(1) });
    const KEEP1 = mkKeep(), KEEP2 = mkKeep();

    // ------------------------------------------------------------------ local builders
    const inkPlane = (o) => {
      const u = { tNoise: U(tex.noise), uTime: U(0), uScale: U(o.scale ?? 9), uRot: U(o.rot ?? 0), uAniso: U(new THREE.Vector2(1, 1)), uOff: U(new THREE.Vector2(o.off ? o.off[0] : 0, o.off ? o.off[1] : 0)),
        uC0: U(COL(o.c[0])), uC1: U(COL(o.c[1])), uC2: U(COL(o.c[2])), uC3: U(COL(o.c[3])), uTint: U(COL(o.tint || '#000000')), uTintAmt: U(o.tintAmt ?? 0),
        uLo: U(o.lo ?? 0.4), uHi: U(o.hi ?? 0.7), uGain: U(1), uVig: U(o.vig ?? 0), uCrease: U(o.crease ?? 0.3),
        uPoolCol: U(COL(o.pool || '#000000')), uPool: U(0), uPoolR: U(o.poolR ?? 0.1), uPoolC: U(new THREE.Vector2(0, 0)) };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 64, o.h ?? 36), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_INK, uniforms: u, depthWrite: false }));
      m.renderOrder = -20; m.u = u; return m;
    };
    // smoke nest sized to a word: box = half extents that are fully dark, fall = ragged falloff outside
    const nestPlane = (bx, by, fall, col, seed) => {
      const w = (bx + fall) * 2 + 1.4, h = (by + fall) * 2 + 1.4;
      const u = { tNoise: U(tex.noise), uTime: U(0), uCol: U(COL(col)), uAmt: U(0), uSeed: U(seed), uSize: U(new THREE.Vector2(w, h)), uBox: U(new THREE.Vector2(bx, by)), uFall: U(fall) };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_NEST, uniforms: u, transparent: true, depthWrite: false }));
      m.renderOrder = -7.5; m.u = u; return m;
    };
    // brush stroke along a curve (points: [x,y,z] list). set(a,b) shows the part a..b of the path.
    const brush = (points, o = {}) => {
      const { width = 0.12, segments = 110, core = '#ffffff', rim = '#ff2a3c', rimAmt = 0.75, gain = 1.25, taper = 0.3, rough = 0.2, fray = 0.5, head = 0, seed = 1, normal = [0, 0, 1] } = o;
      const curve = new THREE.CatmullRomCurve3(points.map((p) => V3(p[0], p[1], p[2] || 0)), false, 'catmullrom', 0.5);
      const R = rng(seed * 7919 + 13); const n = segments + 1;
      const pos = new Float32Array(n * 6), side = new Float32Array(n * 6), q = new Float32Array(n * 4); const idx = [];
      const P = V3(), T = V3(), S = V3(), N = V3(normal[0], normal[1], normal[2]).normalize();
      let j1 = 1, j2 = 1;
      for (let i = 0; i < n; i++) {
        const u = i / segments; curve.getPointAt(u, P); curve.getTangentAt(u, T); S.crossVectors(T, N); if (S.lengthSq() < 1e-8) S.set(0, 1, 0); S.normalize();
        j1 = lerp(j1, 1 + rough * (R() - 0.5) * 2.4, 0.6); j2 = lerp(j2, 1 + rough * (R() - 0.5) * 2.4, 0.6);
        const k = i * 6; pos[k] = pos[k + 3] = P.x; pos[k + 1] = pos[k + 4] = P.y; pos[k + 2] = pos[k + 5] = P.z;
        side[k] = S.x * j1; side[k + 1] = S.y * j1; side[k + 2] = S.z * j1; side[k + 3] = -S.x * j2; side[k + 4] = -S.y * j2; side[k + 5] = -S.z * j2;
        q[i * 4] = u; q[i * 4 + 1] = 1; q[i * 4 + 2] = u; q[i * 4 + 3] = -1;
      }
      for (let i = 0; i < segments; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSide', new THREE.BufferAttribute(side, 3)); geo.setAttribute('aQ', new THREE.BufferAttribute(q, 2)); geo.setIndex(idx);
      const u = { tNoise: U(tex.noise), uA: U(0), uB: U(1), uW: U(width / 2), uTaper: U(taper), uHead: U(head), uCore: U(COL(core)), uRim: U(COL(rim)), uGain: U(gain), uRimAmt: U(rimAmt), uFray: U(fray), uSeed: U((seed * 0.137) % 1), uLen: U(curve.getLength() / width) };
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS_BRUSH, fragmentShader: FS_BRUSH, uniforms: u, side: THREE.DoubleSide }));
      mesh.frustumCulled = false; mesh.visible = false;
      const B = { mesh, u, width,
        set(a, b, wMul = 1) { a = sat(a); b = sat(b); if (b - a < 0.004) { mesh.visible = false; return B; } mesh.visible = true; u.uA.value = a; u.uB.value = b; u.uW.value = 0.5 * B.width * wMul; return B; },
        /** draws on over [t0,t1] (head runs ahead), erases from the tail over [t2,t3] */
        swoosh(rf, t0, t1, t2, t3, wMul = 1, eOn = 'out3', eOff = 'in2') { if (rf < t0 || rf > t3) { mesh.visible = false; return B; } return B.set(prog(rf, t2, t3, eOff), prog(rf, t0, t1, eOn), wMul); } };
      return B;
    };
    // camera-facing discs with analytic defocus (see VS_MOTE). burst: { origin, reach, flat } flings them out of a point.
    const QUAD = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const motes = (count, o = {}) => {
      const { box = [10, 6, 6], center = [0, 0, 0], size = [0.02, 0.05], sizePow = 2, seed = 3, colors = ['#ffffff', '#ffd0e0', '#ffffff'], opacity = 0.6, floor = 0.1, sway = 0.1, vel = [0, 0.01, 0], keep = KEEP1, maxFrac = 0.2, burst = null, ink = false } = o; const R = rng(seed);
      const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4), dir = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        if (burst) {
          const a = R() * TAU, zz = lerp(burst.z0 ?? -0.4, burst.z1 ?? 0.4, R()), rr = Math.sqrt(Math.max(0, 1 - zz * zz * 0.6));
          pos[i * 3] = burst.origin[0] + (R() - 0.5) * 0.3; pos[i * 3 + 1] = burst.origin[1] + (R() - 0.5) * 0.3; pos[i * 3 + 2] = burst.origin[2] + (R() - 0.5) * 0.3;
          dir[i * 4] = Math.cos(a) * rr * (burst.sx ?? 1); dir[i * 4 + 1] = Math.sin(a) * rr * (burst.sy ?? 0.72); dir[i * 4 + 2] = zz; dir[i * 4 + 3] = 0.25 + 1.0 * Math.pow(R(), 0.7);
          rnd[i * 4 + 2] = R() * 1.4;
        } else {
          pos[i * 3] = (R() - 0.5) * box[0]; pos[i * 3 + 1] = (R() - 0.5) * box[1]; pos[i * 3 + 2] = (R() - 0.5) * box[2]; rnd[i * 4 + 2] = R();
        }
        rnd[i * 4] = lerp(size[0], size[1], Math.pow(R(), sizePow)); rnd[i * 4 + 1] = R(); rnd[i * 4 + 3] = R();
      }
      const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(QUAD, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3)); geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4)); geo.setAttribute('aDir', new THREE.InstancedBufferAttribute(dir, 4)); geo.instanceCount = count;
      const u = { ...LENS, ...keep, uT: U(0), uVel: U(V3(vel[0], vel[1], vel[2])), uBox: U(V3(box[0], box[1], box[2])), uCenter: U(V3(center[0], center[1], center[2])), uSway: U(sway), uSize: U(1), uMaxFrac: U(maxFrac), uReach: U(burst ? burst.reach ?? 2.4 : 0),
        uColA: U(COL(colors[0])), uColB: U(COL(colors[1])), uColC: U(COL(colors[2] || colors[1])), uOpacity: U(opacity), uFloor: U(floor) };
      const defines = {}; if (burst) defines.BURST = 1; if (ink) defines.INK = 1;
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS_MOTE, fragmentShader: FS_MOTE, uniforms: u, defines, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...(ink ? OVER : ADD) }));
      m.frustumCulled = false; m.u = u; return m;
    };
    const glowSprite = (map, color, o = {}) => { const m = kit.plate(map, 1, 1, { color, additive: true, opacity: 0, billboard: true, depthTest: o.depthTest ?? true, gain: o.gain ?? 1 }); if (o.order !== undefined) m.renderOrder = o.order; return m; };
    const setRGB = (c, a, b, t) => c.setRGB(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));
    // impact FX sits behind the word: everything is drawn before the letters, its soft flash even before the smoke nest
    const tuneFx = (fx, flash = 0.6) => fx.group.children.forEach((grp) => { grp.children.forEach((m) => { m.renderOrder = -7; }); const glow = grp.children[grp.children.length - 1]; glow.renderOrder = -7.8; glow.material.color.multiplyScalar(flash); });
    // parallel hairline next to a stroke (offset to the left of its direction of travel)
    const offs = (pts, o) => pts.map((p, i) => { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)]; const tx = b[0] - a[0], ty = b[1] - a[1], l = Math.hypot(tx, ty) || 1; return [p[0] - (ty / l) * o, p[1] + (tx / l) * o]; });
    // small star glints sitting on the outer corners of a word (children of the word group, so they turn with it)
    const cornerGlints = (W, times, color) => { const L0 = W.letters[0], Ln = W.letters[W.n - 1], Lm = W.letters[Math.floor(W.n / 2)]; if (!L0) return [];
      const P = [[L0.home.x - L0.w * 0.42, 0.46], [Ln.home.x + Ln.w * 0.42, 0.46], [Lm.home.x + Lm.w * 0.4, -0.46]];
      return P.map((p, i) => { const m = glowSprite(tex.glint, i === 1 ? '#ffffff' : color, { order: 6 }); m.position.set(p[0], p[1], 0.04); W.group.add(m); return { m, t0: times[i], s: [0.42, 0.5, 0.36][i] }; }); };
    const tickGlints = (list, rf) => { for (const g of list) { const k = pulse(rf, g.t0, 1.5, 0.35); g.m.visible = k > 0.01; const s = g.s * (0.45 + 0.75 * k); g.m.scale.set(s, s, 1); g.m.material.opacity = 0.9 * k; g.m.material.rotation = 0.4 + (rf - g.t0) * 0.22; } };

    // ================================================================== SHOT 1 — s01
    const PAL_SWIRL = ['#12020a', '#b3121c', '#ff5a4a', '#ffd9cf'].map(COL), PAL_DARK = ['#020103', '#1c0410', '#560c18', '#c8402a'].map(COL);
    const bg1 = inkPlane({ c: ['#020103', '#1c0410', '#560c18', '#c8402a'], scale: 5.4, tint: '#3518a8', tintAmt: 0.4, off: [0.3, 0.7], vig: 0.8, crease: 0.34, pool: '#7a1430', poolR: 0.17 }); bg1.position.z = -9; shot1.add(bg1);

    // the word
    const W1 = kit.word(words.s01 || 'YOUNG', { size: 1, depth: 0.42, style: 'inkWhite', seed: 1 }); shot1.add(W1.group);
    const ST_HOT = { top: COL('#ffffff'), bot: COL('#ffd8dc'), side: COL('#ff5a3c'), sideDark: COL('#7a0812') }, ST_INK = { top: COL('#ffffff'), bot: COL('#ff7486'), side: COL('#5a0f38'), sideDark: COL('#07020c') };
    for (const L of W1.letters) { const lu = L.mesh.material.uniforms; lu.uLight.value.set(-0.45, 0.75, 0.55); lu.uRim.value.set('#f2f8ff'); lu.uRimAmt.value = 0.95; }
    const TILT1 = 17.5 * DEG;                             // the word's clockwise tilt in the hold
    // cap height (fraction of the frame height) in the hold: the tilted word keeps a clear margin on all four sides
    const C1 = Math.min(0.385, (0.70 * ASPECT) / (W1.width * Math.cos(TILT1) + Math.sin(TILT1)), 0.70 / (W1.width * Math.sin(TILT1) + Math.cos(TILT1)));
    const hw1 = W1.width * 0.5; KEEP1.uHalf.value.set(hw1 + 0.12, 0.62);

    // splash: everything the impact throws up, behind the word. It turns with the word so the ring stays an ellipse around it.
    const splash = new THREE.Group(); splash.position.set(0, 0, -1.1); shot1.add(splash);
    const SX = (hw1 + 0.62) / 1.62, SY = 0.66;
    const burstU = { tNoise: U(tex.noise), uT: U(0), uR: U(0.1), uW: U(0.08), uAmt: U(0), uDark: U(0), uCore: U(0), uSeed: U(0.37), uStretch: U(new THREE.Vector2(SX, SY)) };
    const burst = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_BURST, uniforms: burstU, transparent: true, depthWrite: false, ...OVER }));
    burst.scale.set(SX, SY, 1); burst.renderOrder = -10; splash.add(burst);
    const coreGlow = glowSprite(tex.glow, '#a8d8ff', { order: -9 }); coreGlow.position.set(0, 0, 0.2); splash.add(coreGlow);
    // puffs: blobs of the ring that break off, drift outward and fade (always behind the nest, never over the word)
    const PUFFS = []; { const R = rng(77); const cols = ['#3f7bff', '#7fd0ff', '#dfe9ff', '#b06bff', '#ff4fb0', '#6fb8ff', '#ffffff'];
      for (let i = 0; i < 14; i++) { const m = glowSprite(R() < 0.6 ? tex.smoke : tex.glow, R.pick(cols), { order: -8 }); m.material.rotation = R() * TAU; splash.add(m);
        PUFFS.push({ m, ang: R() * TAU, sp: R.range(0.6, 1.25), z: R.range(-0.5, 0.25), s: R.range(0.3, 0.75), delay: R.range(0, 1.4), spin: R.range(-0.2, 0.2) }); } }
    // electric filaments out of the core at the hit
    const ARCS = []; { const R = rng(41);
      for (let i = 0; i < 6; i++) { const a0 = (i / 6) * TAU + R.range(-0.3, 0.3), L = R.range(1.4, 2.4); const pts = []; let a = a0;
        for (let k = 0; k <= 8; k++) { const rr = 0.3 + (k / 8) * L; a += R.range(-0.2, 0.2); const j = k ? R.range(-0.09, 0.09) : 0; pts.push([(Math.cos(a) * rr - Math.sin(a) * j) * SX * 0.9, (Math.sin(a) * rr + Math.cos(a) * j) * 0.72, 0.3 + R.range(-0.15, 0.15)]); }
        const rb = kit.ribbon(pts, { width: R.range(0.014, 0.03), taper: 0.5, color: i % 3 ? '#cfe8ff' : '#ffffff', gain: 1.7, segments: 64, shade: 0 }); rb.mesh.visible = false; splash.add(rb.mesh); ARCS.push({ rb, t0: 3.75 + R.range(0, 1.5), dur: R.range(0.9, 1.4) }); } }
    const speck1 = motes(420, { burst: { origin: [0, 0, 0.3], reach: 2.5, z0: -0.25, z1: 0.75, sx: SX * 0.95, sy: 0.7 }, seed: 5, size: [0.007, 0.034], sizePow: 3, colors: ['#ffffff', '#8fd4ff', '#ff6fbc'], opacity: 0.95, floor: 0.12, maxFrac: 0.13 }); speck1.renderOrder = 5; splash.add(speck1);
    const ink1 = motes(70, { burst: { origin: [0, 0, 0.4], reach: 2.3, z0: -0.2, z1: 0.5, sx: SX * 0.95, sy: 0.7 }, seed: 9, size: [0.012, 0.05], sizePow: 2.4, colors: ['#000000', '#0d0208', '#1c0410'], opacity: 0.92, ink: true, maxFrac: 0.1 }); ink1.renderOrder = 4; splash.add(ink1);

    // behind the word, moving with it: smoke nest, coloured glow hugging the letters, dial graphic, impact rings + sparks
    const nest1 = nestPlane(hw1 + 0.16, 0.6, 0.6, '#030105', 0.61); nest1.position.z = -0.62; W1.group.add(nest1);
    const wordGlow = kit.plate(tex.glow, W1.width * 1.7, 2.15, { color: '#ff3566', additive: true, opacity: 0 }); wordGlow.position.z = -0.5; wordGlow.renderOrder = -7.3; W1.group.add(wordGlow);
    const orn1 = kit.ornaments({ center: [0, 0, 0], radius: (hw1 + 0.42) / 0.918, color: '#cfe6ff', opacity: 0.3, seed: 3 }); orn1.group.scale.set(1, 0.6, 1); orn1.group.children.forEach((m) => { m.position.z = -0.56; m.renderOrder = -7.2; }); W1.group.add(orn1.group);
    const fxS1 = Math.min(1.25, 0.55 + hw1 * 0.42);
    const fx1 = kit.impactFX([{ rf: 3.95, at: [0, 0, -0.62], size: fxS1, color: '#a4d6ff', sparks: 26 }, { rf: 6.85, at: [0, 0, -0.62], size: fxS1 * 0.9, color: '#ffc2d6', sparks: 0 }]); tuneFx(fx1, 0.55); W1.group.add(fx1.group);
    const GL1 = cornerGlints(W1, [4.45, 5.95, 6.9], '#cfe8ff');

    // brush curls, authored in frame units (x ±0.889, y ±0.5 of the hold framing) so they clear the tilted word whatever its length
    const dH1 = 1 / (0.7279 * C1 * 0.965);
    const F1 = (pts, z = 0) => pts.map(([x, y]) => [(x / (C1 * 0.965)) * (1 - z / dH1), (y / (C1 * 0.965)) * (1 - z / dH1), z]);
    const A1 = [[-1.05, -0.42], [-0.87, -0.3], [-0.745, -0.12], [-0.71, 0.07], [-0.745, 0.225], [-0.82, 0.285], [-0.875, 0.22], [-0.85, 0.13]];
    const B1 = [[1.03, 0.07], [0.85, 0.2], [0.63, 0.325], [0.45, 0.4], [0.335, 0.405], [0.28, 0.362], [0.292, 0.315]];
    const SQ = [
      { b: brush(F1(A1, 0.25), { width: 0.15, seed: 3, head: 0.3, taper: 0.34 }), on: [3.7, 6.5], off: [7.3, 9.0] },
      { b: brush(F1(B1, 0.12), { width: 0.118, seed: 5, head: 0.25, taper: 0.34 }), on: [3.95, 6.9], off: [7.5, 9.2] },
      { b: brush(F1([[-0.63, -0.57], [-0.46, -0.445], [-0.27, -0.39], [-0.1, -0.415], [-0.035, -0.475]], 0.4), { width: 0.052, seed: 7, rim: '#ff2060', head: 0.2 }), on: [4.3, 6.7], off: [7.0, 8.8] },
      { b: brush(F1([[1.0, -0.1], [0.82, -0.17], [0.705, -0.29], [0.69, -0.4], [0.76, -0.475]], -0.3), { width: 0.045, seed: 9, head: 0.2 }), on: [4.6, 7.0], off: [7.4, 9.0] },
      { b: brush(F1(offs(A1, 0.036), 0.25), { width: 0.02, seed: 11, rimAmt: 0.3, fray: 0.3, taper: 0.5 }), on: [4.1, 6.9], off: [7.45, 9.1] },
      { b: brush(F1(offs(B1, -0.032), 0.12), { width: 0.018, seed: 13, rimAmt: 0.3, fray: 0.3, taper: 0.5 }), on: [4.35, 7.2], off: [7.6, 9.3] },
    ]; SQ.forEach((s) => shot1.add(s.b.mesh));

    // air: fine dust at every depth + a few large soft bokeh discs near the lens (none of them ever in front of the word)
    const dust1 = motes(260, { box: [10, 6, 7], center: [0, 0, 0.2], size: [0.008, 0.024], seed: 31, colors: ['#ffd0e0', '#ffffff', '#9fd0ff'], opacity: 0.7, floor: 0.07, vel: [0.012, 0.02, 0.008], sway: 0.1, maxFrac: 0.16 }); dust1.renderOrder = 4; shot1.add(dust1);
    const bokeh1 = motes(34, { box: [7.5, 4.6, 3.2], center: [0, 0, 1.7], size: [0.03, 0.075], seed: 37, colors: ['#7fc4ff', '#dfeeff', '#ff7fb8'], opacity: 0.5, floor: 0.2, vel: [0.016, 0.01, 0.004], sway: 0.12, maxFrac: 0.2 }); bokeh1.renderOrder = 4; shot1.add(bokeh1);

    // ================================================================== SHOT 2 — s02
    const bg2 = inkPlane({ c: ['#050101', '#2c0503', '#8a1a0a', '#ff7430'], scale: 5.6, off: [2.1, 4.4], lo: 0.4, hi: 0.72, crease: 0.4, vig: 0.85, pool: '#ff4a14', poolR: 0.16 }); bg2.position.z = -7; shot2.add(bg2);
    const beams2 = kit.beams({ center: [0, 0, -1.6], count: 8, len: 5.4, color: '#ff6a2a', opacity: 0.17, seed: 5 }); beams2.group.children.forEach((m) => { m.renderOrder = -9; }); shot2.add(beams2.group);
    const W2 = kit.word(words.s02 || 'BUT', { size: 1, depth: 0.5, style: 'silver', seed: 2 }); shot2.add(W2.group);
    { const a = { top: COL('#ffa690'), bot: COL('#e84a3c'), side: COL('#84090c'), sideDark: COL('#160103') }, b = { top: COL('#ffffff'), bot: COL('#b6bac2'), side: COL('#5a5f67'), sideDark: COL('#0a0b0d') };
      W2.letters.forEach((L) => { const u = L.mesh.material.uniforms; const tt = W2.n > 1 ? sat((L.home.x / W2.width + 0.5) * 1.25 - 0.1) : 0.5;
        setRGB(u.uTop.value, a.top, b.top, tt); setRGB(u.uBot.value, a.bot, b.bot, tt); setRGB(u.uSide.value, a.side, b.side, tt); setRGB(u.uSideDark.value, a.sideDark, b.sideDark, tt); u.uRim.value.set('#ffffff'); u.uRimAmt.value = 0.95; u.uChrome.value = 0.2; u.uLight.value.set(0.9, 0.45, 0.55); }); }
    const hw2 = W2.width * 0.5; KEEP2.uHalf.value.set(hw2 + 0.12, 0.62);
    const C2 = clamp((0.42 * ASPECT) / W2.width, 0.22, 0.37);                 // cap height when the word has landed
    const nest2 = nestPlane(hw2 + 0.16, 0.62, 0.62, '#050102', 0.23); nest2.position.z = -0.72; W2.group.add(nest2);
    const halo2 = kit.plate(tex.glow, W2.width * 2.0, 2.2, { color: '#ff2a14', additive: true, opacity: 0 }); halo2.position.z = -0.6; halo2.renderOrder = -7.3; W2.group.add(halo2);
    const orn2 = kit.ornaments({ center: [0, 0, 0], radius: (hw2 + 0.46) / 0.918, color: '#ffb48a', opacity: 0.24, seed: 8 }); orn2.group.scale.set(1, 0.72, 1); orn2.group.children.forEach((m) => { m.position.z = -0.6; m.renderOrder = -7.2; }); W2.group.add(orn2.group);
    const fxS2 = Math.min(1.2, 0.6 + hw2 * 0.45);
    const fx2 = kit.impactFX([{ rf: 13.2, at: [0, 0, -0.66], size: fxS2, color: '#ffb07a', sparks: 22 }]); tuneFx(fx2, 0.5); W2.group.add(fx2.group);
    const GL2 = cornerGlints(W2, [15.55, 13.5, 17.2], '#ffd9c2');

    // two long dry-brush strokes + accents, authored in SCREEN units of the hold (the camera is rolled 8° there)
    const ROLL2 = -8, capH2 = C2 * 1.03, dH2 = 1 / (0.9326 * capH2); const cr2 = Math.cos(ROLL2 * DEG), sr2 = Math.sin(ROLL2 * DEG);
    const F2 = (pts, z = 0) => pts.map(([x, y]) => [((x * cr2 - y * sr2) / capH2) * (1 - z / dH2), ((x * sr2 + y * cr2) / capH2) * (1 - z / dH2), z]);
    const wx2 = Math.max(0, hw2 * capH2 - 0.3);                                // push the strokes outward for wide words
    const S1p = [[-0.82 - wx2, 0.58], [-0.735 - wx2, 0.41], [-0.645 - wx2, 0.225], [-0.565 - wx2, 0.065], [-0.5 - wx2, -0.05]];
    const S2p = [[0.2 + wx2 * 0.5, 0.39], [0.42 + wx2 * 0.7, 0.375], [0.64 + wx2, 0.335], [0.84 + wx2, 0.28], [1.03 + wx2, 0.215]];
    const ST = [
      { b: brush(F2(S1p, 0.14), { width: 0.16, seed: 21, fray: 0.95, rough: 0.34, rim: '#ff3a26', taper: 0.22 }), on: [12.25, 13.5], off: [17.2, 19.6] },
      { b: brush(F2(S2p, 0.1), { width: 0.15, seed: 23, fray: 0.95, rough: 0.34, rim: '#ff3a26', taper: 0.22 }), on: [12.5, 13.8], off: [17.4, 19.9] },
      { b: brush(F2([[0.06, -0.335], [0.09, -0.405], [0.125, -0.5], [0.15, -0.6]], 0.3), { width: 0.09, seed: 25, fray: 0.8, rough: 0.3, core: '#ffb6a6', rim: '#e01a12', taper: 0.25 }), on: [12.7, 13.7], off: [16.6, 18.6] },
      { b: brush(F2([[-0.2 - wx2 * 0.4, -0.4], [-0.42 - wx2 * 0.7, -0.385], [-0.68 - wx2, -0.41], [-0.98 - wx2, -0.5]], -0.3), { width: 0.045, seed: 27, fray: 0.7, rough: 0.3, rim: '#ff3a26' }), on: [12.9, 14.6], off: [16.8, 18.8] },
      { b: brush(F2(offs(S1p, 0.04), 0.14), { width: 0.02, seed: 29, rimAmt: 0.35, fray: 0.4, taper: 0.5 }), on: [12.6, 14.2], off: [17.3, 19.7] },
      { b: brush(F2(offs(S2p, 0.037), 0.1), { width: 0.018, seed: 33, rimAmt: 0.35, fray: 0.4, taper: 0.5 }), on: [12.85, 14.5], off: [17.5, 20.0] },
    ]; ST.forEach((s) => shot2.add(s.b.mesh));
    const fw2 = 0.889 / capH2;                                                 // half the frame width, world units at the word
    const FL2 = [ // flare-ups at the right edge and the corners: light source side, well clear of the word
      { m: glowSprite(tex.glow, '#ffe0d0', { order: 3, gain: 1.2 }), p: [fw2 * 1.2, 0.35, -0.3], s: 1.7, ph: 2 }, { m: glowSprite(tex.smoke, '#fff2ea', { order: 3, gain: 1.3 }), p: [fw2 * 1.22, -1.45, 0.2], s: 2.3, ph: 1 },
      { m: glowSprite(tex.smoke, '#ff3a1c', { order: 3, gain: 1.3 }), p: [fw2 * 1.08, -1.75, -0.2], s: 2.5, ph: 3 }, { m: glowSprite(tex.glow, '#ff8a3c', { order: 3 }), p: [-fw2 * 1.3, 1.85, -1.0], s: 2.6, ph: 4 },
    ]; FL2.forEach((f) => { f.m.position.set(f.p[0], f.p[1], f.p[2]); shot2.add(f.m); });
    const dust2 = motes(240, { box: [10, 6, 7], center: [0, 0, 0.2], size: [0.008, 0.024], seed: 61, colors: ['#ffc6a0', '#ffffff', '#ff9a6a'], opacity: 0.7, floor: 0.07, vel: [0.014, 0.014, 0.004], sway: 0.1, keep: KEEP2, maxFrac: 0.16 }); dust2.renderOrder = 4; shot2.add(dust2);
    const ember2 = motes(90, { box: [9, 6, 5], center: [0, 0, 0.6], size: [0.016, 0.05], seed: 67, colors: ['#ff5a2a', '#ff9a3a', '#ffd9a0'], opacity: 0.85, floor: 0.2, vel: [0.008, 0.034, 0.003], sway: 0.16, keep: KEEP2, maxFrac: 0.2 }); ember2.renderOrder = 4; shot2.add(ember2);
    // hand-off: the ripple field of section B, matched to its ring spacing and phase
    const ripU = { uA: U(COL('#4a0a0a')), uB: U(COL('#0b0001')), uC: U(COL('#8e1f1b')), uTime: U(0), uRings: U(30), uVig: U(0.98), uAlpha: U(0) };
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_RIPPLE, uniforms: ripU, transparent: true, depthWrite: false })); ripple.position.z = -1.6; ripple.renderOrder = -8.5; shot2.add(ripple);

    // rain on a plane behind the words (both shots)
    const rainU = { uView: kit.lens.view, uT: U(0), uAmt: U(0.3), uCols: U(1500), uRows: U(3.6) };
    const rain = new THREE.Mesh(new THREE.PlaneGeometry(22, 13), new THREE.ShaderMaterial({ vertexShader: VS_UV_STILL, fragmentShader: FS_RAIN, uniforms: rainU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); rain.position.z = -1.4; rain.renderOrder = -6; rain.frustumCulled = false; group.add(rain);

    // ================================================================== HUD (locked to the camera, at the focal plane; 1 unit = frame height)
    const hudPlate = (map, x, y, w, h, color, order = 90, gain = 1, additive = true) => { const m = kit.plate(map, w, h, { color, additive, opacity: 0, depthTest: false, gain }); m.position.set(x, y, 0); m.renderOrder = order; hud.add(m); return m; };
    const AX = ASPECT / 2;
    const matU = { tNoise: U(tex.noise), uHole: U(2), uSoft: U(0.06), uInk: U(COL('#030104')), uRim: U(COL('#8fc8ff')), uRimAmt: U(0.5), uT: U(0), uAspect: U(ASPECT) };
    const matte = new THREE.Mesh(new THREE.PlaneGeometry(ASPECT * 1.2, 1.2), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_MATTE, uniforms: matU, transparent: true, depthTest: false, depthWrite: false, ...OVER })); matte.renderOrder = 80; matte.visible = false; hud.add(matte);
    const INK_A = COL('#030104'), INK_B = COL('#070201'), RIM_A = COL('#8fc8ff'), RIM_B = COL('#ff6a22');
    // soft lights drifting over the ink while the shot changes (cool -> warm)
    const BLOBS = []; { const R = rng(303); const cA = ['#6fb4ff', '#dfeaff', '#ff8fc0', '#4f8cff', '#ffffff', '#9fd0ff'].map(COL), cB = ['#ff6a2a', '#ffd2a0', '#ff3a1c', '#ff8a3c', '#ffe2c8', '#e0301a'].map(COL);
      for (let i = 0; i < 6; i++) { const m = hudPlate(i % 2 ? tex.smoke : tex.glow, 0, 0, 1, 1, '#ffffff', 84); BLOBS.push({ m, a: (i / 6) * TAU + R.range(-0.4, 0.4), rad: R.range(0.16, 0.62), s: R.range(0.4, 0.95), sq: R.range(0.55, 1), rot: R() * TAU, w: R.range(0.55, 1), cA: cA[i], cB: cB[i], dir: i % 2 ? -1 : 1 }); } }
    // out-of-focus dark shapes close to the lens, in the corners the word never reaches
    const SMUDGE = [
      { m: hudPlate(tex.smoke, 0, 0, 1, 1, '#040103', 86, 1, false), p1: [-0.86, -0.53], s1: 1.0, p2: [-0.86, -0.54], s2: 0.95 },
      { m: hudPlate(tex.smoke, 0, 0, 1, 1, '#040103', 86, 1, false), p1: [0.9, 0.53], s1: 0.82, p2: [0.93, -0.56], s2: 0.62 },
      { m: hudPlate(tex.smoke, 0, 0, 1, 1, '#050104', 86, 1, false), p1: [-0.96, 0.54], s1: 0.5, p2: [-0.97, 0.56], s2: 0.6 },
    ];
    // light leaks along the frame edges
    const leakTL = hudPlate(tex.glow, -AX * 0.97, 0.54, 1.0, 0.7, '#ffb22e', 92), leakT = hudPlate(tex.streak, -AX * 0.2, 0.497, 1.5, 0.03, '#f6ff5a', 93, 1.5), leakTR = hudPlate(tex.glow, AX * 0.99, 0.42, 0.4, 1.0, '#c05cff', 92), leakBR = hudPlate(tex.glow, AX * 0.95, -0.53, 1.0, 0.6, '#ff5a3c', 92), leakL = hudPlate(tex.glow, -AX * 1.02, -0.1, 0.4, 1.1, '#ff2a50', 92);

    // ------------------------------------------------------------------ camera
    const camObj = new THREE.PerspectiveCamera(); const fwd = V3(); const cam = { pos: V3(), tgt: V3(), roll: 0, fov: 40, aperture: 0, focus: 4 };

    return { group, update(rf) {
      const S1 = rf < CUT; shot1.visible = S1; shot2.visible = !S1;
      let orbit = 0;
      // ---------------- camera
      if (S1) {
        // slam: the camera starts 4x too close and settles back; then a slow, decelerating pull-back through the hold
        const cap = C1 * (0.93 + 0.07 * Math.exp(-Math.max(0, rf - 3.8) / 3.2)) * (1 + 3.0 * gexp(rf, 1.9, 1.5)) * lerp(1, 0.9, prog(rf, 7.6, 10.6, 'io2'));
        const d = 1 / (0.7279 * cap);
        orbit = lerp(-0.05, 0.055, prog(rf, 3.0, 9.0, 'io2'));                         // small arc around the word: parallax between the layers
        const tx = 0.22 * gexp(rf, 1.5, 1.6), ty = 0.08 * gexp(rf, 1.5, 1.6);
        cam.tgt.set(tx, ty, 0); cam.pos.set(tx + d * Math.sin(orbit), ty + 0.03 * d, d * Math.cos(orbit)); cam.fov = 40;
        cam.roll = 5 * gexp(rf, 2.2, 1.6) - 5 * prog(rf, 7.6, 10.6, 'in2');
        cam.aperture = track([[0, 0.05], [3, 0.04], [4.2, 0.032, 'out2'], [7.5, 0.032], [8.6, 0.16, 'in2'], [10.6, 0.34, 'lin']], rf);
        cam.focus = d * track([[0, 1], [7.5, 1], [9.2, 0.72, 'io2'], [10.6, 0.55]], rf);
      } else {
        const ap = gexp(rf - 10.5, 1.5, 1.6);                                          // 1 at the cut -> 0 once the word has landed
        const cap = C2 * (1 - 0.42 * ap) * (1 + 0.02 * ramp(rf - 13.0, 1.5));          // arrive from depth, then a slow push-in
        const d = 1 / (0.9326 * cap);
        orbit = lerp(0.07, -0.05, prog(rf, 11.0, 20.5, 'io2'));
        cam.tgt.set(0, 0, 0); cam.pos.set(d * Math.sin(orbit), 0.05 * d, d * Math.cos(orbit)); cam.fov = 50;
        cam.roll = ROLL2 + 14 * gexp(rf - 10.5, 1.6, 1.6) - ROLL2 * prog(rf, 17.3, 20.9, 'io2');
        cam.aperture = track([[10.5, 0.4], [11.6, 0.28, 'lin'], [12.6, 0.1, 'lin'], [13.2, 0.03, 'out2'], [17.5, 0.03], [20.7, 0.045]], rf);
        cam.focus = d * track([[10.5, 0.55], [12.0, 0.76, 'lin'], [13.1, 1, 'out2']], rf);
      }
      const shA = track([[0, 0.03], [3.4, 0.03], [3.95, 0.075], [4.5, 0.02, 'out2'], [5.2, 0.012], [7.6, 0.012], [9.5, 0.05], [12.4, 0.05], [13.2, 0.06], [13.8, 0.016, 'out2'], [17.5, 0.014], [21, 0.012]], rf);
      const sh = kit.shake(rf, shA, 0.9, 3); cam.pos.add(sh); cam.tgt.addScaledVector(sh, 0.6);

      // ---------------- shot 1
      if (S1) {
        const tb = rf - 3.55;                                                          // frames since the splash ignites
        const sw = 1 - prog(rf, 0.6, 3.3, 'io2');                                      // 1 = red/white liquid, 0 = dark smoky field
        const u = bg1.u; setRGB(u.uC0.value, PAL_DARK[0], PAL_SWIRL[0], sw); setRGB(u.uC1.value, PAL_DARK[1], PAL_SWIRL[1], sw); setRGB(u.uC2.value, PAL_DARK[2], PAL_SWIRL[2], sw); setRGB(u.uC3.value, PAL_DARK[3], PAL_SWIRL[3], sw);
        u.uAniso.value.set(lerp(1, 0.22, sw), 1); u.uRot.value = 0.62; u.uLo.value = lerp(0.42, 0.34, sw); u.uHi.value = lerp(0.76, 0.6, sw); u.uGain.value = lerp(0.9, 1.0, sw); u.uTime.value = rf * 0.16; u.uTintAmt.value = 0.42 * (1 - sw); u.uScale.value = lerp(5.4, 4.6, sw);
        u.uPool.value = 0.5 * prog(rf, 3.4, 5) * (1 - prog(rf, 8, 10)); u.uVig.value = lerp(0.8, 0.3, sw);
        // word: un-rotates as it lands, then keeps turning very slowly; tips back and sinks away on the exit
        const tilt = (17.5 + 22 * gexp(rf, 2.1, 1.6) - 0.95 * ramp(rf - 3.8, 1.0) - 2.0 * Math.pow(Math.max(0, rf - 7.6), 1.4)) * DEG;
        const exit = prog(rf, 7.6, 10.4, 'in2');
        W1.group.rotation.set(-0.2 - 0.6 * exit, -0.24, -tilt); W1.group.position.set(0, 0, -3.2 * exit);
        splash.rotation.z = -tilt;
        const hot = 1 - prog(rf, 1.5, 4.2, 'out2'); for (const L of W1.letters) { const lu = L.mesh.material.uniforms; setRGB(lu.uBot.value, ST_INK.bot, ST_HOT.bot, hot); setRGB(lu.uSide.value, ST_INK.side, ST_HOT.side, hot); setRGB(lu.uSideDark.value, ST_INK.sideDark, ST_HOT.sideDark, hot); }
        const fadeOut = 1 - prog(rf, 8.7, 10.1, 'io2'); const st1 = Math.min(0.13, 0.55 / Math.max(1, W1.n - 1));
        for (let i = 0; i < W1.n; i++) { const L = W1.letters[i]; const k = 1 - prog(rf, 1.4 + i * st1 * 1.2, 3.72 + i * st1, 'out4');
          const bump = Math.exp(-Math.pow((rf - (3.86 + i * st1)) / 0.3, 2)); const wv = Math.sin(rf * 1.3 + i * 1.7) * 0.008 * prog(rf, 4.4, 5.4);
          W1.pose(i, { z: k * 0.34 * (0.5 + L.rnd), y: wv + k * (L.rnd - 0.5) * 0.2, rz: k * (L.rnd2 - 0.5) * 0.55, s: 1 + k * 0.2 + 0.035 * bump, o: fadeOut }); }
        W1.gain(track([[0, 1.4], [3, 1.36], [4.3, 1.22, 'out2'], [7.6, 1.18], [9.2, 0.95]], rf) + 0.09 * pulse(rf, 6.9, 1.6, 0.3));
        W1.sweep(prog(rf, 5.25, 6.7), 0.5);
        nest1.u.uTime.value = rf * 0.1; nest1.u.uAmt.value = 0.93 * prog(rf, 0.8, 2.8) * (1 - prog(rf, 8.8, 10.2));
        wordGlow.material.opacity = 0.3 * prog(rf, 2.8, 4.4) * fadeOut;
        orn1.update(rf, prog(rf, 4.0, 5.3, 'out2') * (1 - prog(rf, 7.7, 9.0)));
        fx1.update(rf); tickGlints(GL1, rf);
        // splash
        const bu = burstU; burst.visible = tb > -0.05; bu.uT.value = Math.max(0, tb) * 6;
        bu.uR.value = 0.5 - 0.44 * Math.exp(-Math.max(0, tb) / 1.7);
        bu.uW.value = track([[3.55, 0.05], [4.5, 0.1], [6, 0.14], [8.5, 0.19]], rf);
        bu.uAmt.value = track([[3.55, 0], [3.9, 1.45, 'out2'], [4.6, 1.15], [6, 0.95], [7.5, 0.75], [9, 0.3], [10, 0]], rf);
        bu.uDark.value = track([[3.55, 0], [4.2, 0.8, 'out2'], [7.5, 0.8], [9.5, 0.5]], rf);
        bu.uCore.value = track([[3.5, 0], [3.8, 1.5, 'out2'], [4.5, 0.25, 'out2'], [5.2, 0]], rf);
        const cg = pulse(rf, 3.75, 1.7, 0.3); coreGlow.scale.set((2.4 + 3.6 * prog(rf, 3.5, 5)) * SX, 2.4 + 3.6 * prog(rf, 3.5, 5), 1); coreGlow.material.opacity = 0.55 * cg; coreGlow.visible = cg > 0.003;
        for (const p of PUFFS) { const t = tb - p.delay * 0.6; if (t <= 0) { p.m.visible = false; continue; } p.m.visible = true; const dist = p.sp * (2.3 * (1 - Math.exp(-t * 0.5)) + 0.12 * t); const a = p.ang + p.spin * t * 0.2;
          p.m.position.set(Math.cos(a) * dist * SX, Math.sin(a) * dist * 0.7, p.z); const s = p.s * (0.55 + 0.3 * t); p.m.scale.set(s, s, 1); p.m.material.opacity = 0.5 * sat(t * 2.2) * sat(1 - (t - 3.2) / 3.2) * sat(dist * 1.4 - 0.5); }
        for (const a of ARCS) a.rb.swoosh(rf, a.t0, a.t0 + a.dur * 0.55, a.t0 + a.dur * 0.45, a.t0 + a.dur);
        SQ.forEach((s) => s.b.swoosh(rf, s.on[0], s.on[1], s.off[0], s.off[1], 1 + 0.2 * pulse(rf, 3.95, 2.5, 0.3)));
        speck1.u.uT.value = tb; ink1.u.uT.value = tb - 0.2; speck1.visible = ink1.visible = tb > 0; speck1.u.uOpacity.value = 0.95 * (1 - prog(rf, 8.2, 10)); ink1.u.uOpacity.value = 0.92 * (1 - prog(rf, 8.2, 10));
        dust1.u.uT.value = rf; dust1.u.uOpacity.value = 0.7 * prog(rf, 2.6, 4.4) * (1 - prog(rf, 8.6, 10.3)); bokeh1.u.uT.value = rf; bokeh1.u.uOpacity.value = 0.5 * prog(rf, 3.2, 4.8) * (1 - prog(rf, 9, 10.4));
        W1.group.updateMatrixWorld(true); KEEP1.uWordInv.value.copy(W1.group.matrixWorld).invert(); KEEP1.uCamL.value.copy(cam.pos).applyMatrix4(KEEP1.uWordInv.value);
        KEEP1.uKeep.value = prog(rf, 3.6, 4.3) * (1 - prog(rf, 8.4, 9.6));
      } else {
        // ---------------- shot 2
        const ap = gexp(rf - 10.5, 1.5, 1.6);
        const out = prog(rf, 17.5, 20.8, 'in2');                                       // exit: tip back and sink into the fog
        const u = bg2.u; u.uTime.value = rf * 0.14; u.uGain.value = track([[10.5, 0.75], [12.4, 0.95], [13.3, 1.0, 'out2'], [17.4, 0.96], [19.2, 0.6], [20.7, 0.35]], rf);
        u.uPool.value = 0.62 * prog(rf, 10.7, 12.6, 'out2') * (1 - 0.7 * prog(rf, 17.5, 20)) + 0.12 * pulse(rf, 13.2, 2.4, 0.3); u.uPoolC.value.set(0.0, -0.01);
        const yaw = 0.44 * (1 - 0.45 * prog(rf, 13.3, 20.7, 'io2')) + 0.55 * ap;
        W2.group.rotation.set(-0.13 - 0.7 * out, -yaw, 0); W2.group.position.set(0, -0.12 * out, -2.6 * out);
        const st2 = Math.min(0.3, 0.75 / Math.max(1, W2.n - 1)); const outO = 1 - prog(rf, 19.3, 20.65, 'io2');
        for (let i = 0; i < W2.n; i++) { const L = W2.letters[i]; const t0 = 11.4 + i * st2; const k = rf < t0 ? 1 : 1 - ease.outBackSoft(sat((rf - t0) / 1.3)); const sgn = L.rnd < 0.5 ? -1 : 1;
          W2.pose(i, { z: -k * 2.6, y: k * (L.rnd - 0.5) * 0.5, ry: k * 0.8 * sgn, rz: k * (L.rnd2 - 0.5) * 0.6, s: 1 - 0.15 * Math.max(0, k), o: sat((rf - t0) / 0.55) * outO }); }
        W2.gain(track([[10.5, 0.7], [12.4, 1.1], [13.2, 1.34, 'out2'], [14.0, 1.18, 'out2'], [17.5, 1.14], [19.2, 0.94], [20.7, 0.86]], rf));
        W2.sweep(prog(rf, 14.3, 15.75), 0.55);
        nest2.u.uTime.value = rf * 0.1; nest2.u.uAmt.value = 0.9 * prog(rf, 11.0, 12.6) * (1 - 0.85 * prog(rf, 17.8, 20.2));
        halo2.material.opacity = (0.3 * prog(rf, 12, 13.3) + 0.1 * pulse(rf, 13.2, 2, 0.3)) * (1 - 0.6 * prog(rf, 19.3, 20.7));
        orn2.update(rf, prog(rf, 13.2, 14.4, 'out2') * (1 - prog(rf, 17.2, 18.6)));
        beams2.update(rf, prog(rf, 12.0, 13.6, 'out2') * (1 - prog(rf, 17.4, 19.6)));
        fx2.update(rf); tickGlints(GL2, rf);
        ST.forEach((s) => s.b.swoosh(rf, s.on[0], s.on[1], s.off[0], s.off[1], 1 + 0.18 * pulse(rf, 13.2, 2.5, 0.3), 'out2', 'io2'));
        const flK = track([[10.5, 0], [12.4, 0.5], [13.3, 0.85, 'out2'], [17.4, 0.85], [19.4, 0.2], [20.7, 0]], rf);
        for (const f of FL2) { const fl = 0.75 + 0.25 * wobble(rf * 0.7, f.ph); const s = f.s * (0.9 + 0.2 * wobble(rf * 0.5, f.ph + 9)); f.m.scale.set(s, s, 1); f.m.material.opacity = 0.62 * fl * flK; f.m.material.rotation = f.ph + rf * 0.03; }
        const air = track([[10.5, 0], [11.4, 0.4], [12.8, 1], [17.6, 1], [19.6, 0.4], [20.7, 0]], rf);
        dust2.u.uT.value = rf; dust2.u.uOpacity.value = 0.7 * air; ember2.u.uT.value = rf; ember2.u.uOpacity.value = 0.85 * air;
        const dd = cam.pos.z + 1.6; ripU.uTime.value = rf / 30; ripU.uRings.value = 241.1 / Math.max(1, dd); ripU.uAlpha.value = track([[17.5, 0], [19.3, 0.55, 'io2'], [20.75, 0.97, 'lin']], rf); ripple.visible = ripU.uAlpha.value > 0.002;
        W2.group.updateMatrixWorld(true); KEEP2.uWordInv.value.copy(W2.group.matrixWorld).invert(); KEEP2.uCamL.value.copy(cam.pos).applyMatrix4(KEEP2.uWordInv.value);
        KEEP2.uKeep.value = prog(rf, 12.6, 13.2) * (1 - prog(rf, 19.6, 20.6));
      }
      rainU.uT.value = rf * 0.11; rainU.uAmt.value = track([[0, 0.2], [3, 0.3], [8, 0.3], [9.6, 0.1], [11.6, 0.1], [13, 0.28], [17.4, 0.26], [19, 0.06], [20.7, 0]], rf);

      // ---------------- HUD
      camObj.position.copy(cam.pos); camObj.up.set(0, 1, 0); camObj.lookAt(cam.tgt); if (cam.roll) camObj.rotateZ(cam.roll * DEG); camObj.getWorldDirection(fwd);
      const hh = 2 * Math.tan(cam.fov * DEG / 2) * cam.focus; hud.position.copy(cam.pos).addScaledVector(fwd, cam.focus); hud.quaternion.copy(camObj.quaternion); hud.scale.setScalar(hh);
      const smear = track([[7.6, 0], [9, 1, 'io2'], [11.6, 1], [13, 0, 'io2']], rf);
      // ink closes over shot 1 and opens on shot 2
      const hole = track([[0, 2], [7.5, 2], [8.5, 1.05, 'in2'], [9.7, 0.3, 'lin'], [10.35, 0, 'out2'], [10.6, 0], [11.3, 0.42, 'in2'], [12.3, 2, 'lin']], rf);
      matte.visible = hole < 1.8; matU.uHole.value = hole; matU.uT.value = rf; const warm = prog(rf, 10.2, 10.8);
      matU.uInk.value.copy(INK_A).lerp(INK_B, warm); matU.uRim.value.copy(RIM_A).lerp(RIM_B, warm); matU.uRimAmt.value = lerp(0.45, 0.95, warm); matU.uSoft.value = lerp(0.06, 0.085, warm);
      const bl = track([[8.0, 0], [9.2, 1, 'io2'], [11.4, 1], [12.7, 0, 'io2']], rf);
      for (const b of BLOBS) { b.m.visible = bl > 0.002; if (!b.m.visible) continue; const tt = rf - 10.4; const a = b.a + tt * 0.1 * b.dir, rad = b.rad * (1 + tt * 0.05);
        b.m.position.set(Math.cos(a) * rad * AX, Math.sin(a) * rad * 0.6, 0); b.m.scale.set(b.s * (1 + 0.04 * tt), b.s * b.sq * (1 + 0.04 * tt), 1); b.m.rotation.z = b.rot + tt * 0.12; setRGB(b.m.material.color, b.cA, b.cB, warm); b.m.material.opacity = 0.2 * bl * b.w; }
      const smK = S1 ? prog(rf, 2.6, 4.2) : prog(rf, 11.4, 12.8) * (1 - prog(rf, 19, 20.7));
      for (const s of SMUDGE) { const p = S1 ? s.p1 : s.p2, sc = S1 ? s.s1 : s.s2; s.m.position.set(p[0] - orbit * 1.4, p[1], 0); s.m.scale.set(sc * 1.15, sc, 1); s.m.material.opacity = 0.9 * smK; s.m.visible = smK > 0.002; }
      // leaks
      const lk = 0.8 + 0.2 * wobble(rf * 0.8, 11);
      leakTL.material.opacity = lk * track([[0, 0.5], [4, 0.42], [8, 0.4], [9.6, 0.1], [11.6, 0.2], [13, 0.5], [17.2, 0.45], [19, 0.15], [20.7, 0.0]], rf);
      leakT.material.opacity = track([[0, 0.7], [4, 0.7], [8, 0.6], [9.6, 0.1], [12.4, 0.5], [16.8, 0.7], [18.4, 0.1], [20.7, 0]], rf) * (0.6 + 0.4 * wobble(rf * 1.3, 5)); leakT.position.x = -AX * 0.2 + 0.4 * wobble(rf * 0.4, 8);
      leakTR.material.opacity = track([[0, 0.2], [3.4, 0.3], [4.2, 0.55], [8, 0.4], [9.6, 0.1], [13, 0.3], [17, 0.4], [19, 0.1], [20.7, 0]], rf);
      leakBR.material.opacity = track([[0, 0.3], [4, 0.25], [8, 0.2], [9.6, 0.05], [12.6, 0.45], [17, 0.5], [19, 0.15], [20.7, 0.0]], rf) * lk;
      leakL.material.opacity = track([[0, 0.4], [4, 0.28], [8, 0.2], [9.6, 0.05], [13, 0.25], [18, 0.2], [20.7, 0.0]], rf);

      // ---------------- post: no exposure / flash pumping — the hits are light inside the scene; blur only between the holds
      const beta = clamp(track([[0, 0.42], [1.6, 0.34], [2.8, 0.2, 'lin'], [3.7, 0.06, 'lin'], [4.2, 0, 'out2'], [7.6, 0], [8.6, 0.3, 'in2'], [9.6, 0.62, 'lin'], [11.3, 0.62], [12.3, 0.3, 'lin'], [13.1, 0, 'out2'], [21, 0]], rf), 0, 0.9);
      const bT = sat(beta * 3); const endK = prog(rf, 17.6, 20.75);
      const zb = track([[0, 0.62], [1.6, 0.5], [2.8, 0.3, 'lin'], [3.6, 0.12, 'lin'], [4.15, 0, 'out2'], [7.7, 0], [8.6, 0.12, 'in2'], [9.6, 0.34, 'lin'], [10.6, 0.42], [11.6, 0.34], [12.5, 0.14, 'lin'], [13.05, 0, 'out2'], [21, 0]], rf);
      const hold = (1 - smear) * prog(rf, 4.1, 4.5);
      const post = {
        exposure: 1 - beta, bloom: lerp(lerp(0.5, 0.75, endK), 0, bT) + beta / ((1 - beta) * 1.1), bloomThreshold: lerp(0.8, -0.35, bT), bloomTint: [1, 0.96, 0.98],
        contrast: lerp(1.1, 1.06, endK), saturation: lerp(1.22, 1.12, endK),
        vignette: track([[0, 0.35], [3, 0.5], [4.5, 0.66], [7.6, 0.66], [10.5, 0.5], [13.3, 0.68], [17.5, 0.7], [20.75, 0.9]], rf),
        chroma: 0.0016 + 0.003 * pulse(rf, 3.95, 1.2, 0.3) + 0.0025 * pulse(rf, 13.2, 1.2, 0.3) + 0.003 * smear,
        zoomBlur: zb, zoomCenter: [0.5, 0.5],
        warp: track([[0, 0.07], [2.5, 0.04], [4.2, 0.012, 'out2'], [7.6, 0.012], [9, 0.09, 'in2'], [11.5, 0.09], [13.1, 0.012, 'out2'], [17.6, 0.012], [20.75, 0.004]], rf), warpScale: 3,
        zoom: 1 + 0.035 * pulse(rf, 3.95, 2.4, 0.25) + 0.012 * pulse(rf, 6.9, 1.6, 0.3) + 0.03 * pulse(rf, 13.2, 2.2, 0.25) + 0.012 * pulse(rf, 17.3, 1.6, 0.3),
        rotate: 0.004 * wobble(rf * 0.5, 17), shake: [0.002 * wobble(rf * 1.3, 41), 0.002 * wobble(rf * 1.3, 43)],
        leak: track([[0, 0.3], [4, 0.16], [8, 0.12], [9.6, 0.04], [12.4, 0.2], [17, 0.18], [20.75, 0.0]], rf), leakColor: [1, 0.42, 0.16], leakPos: [0.04, 0.96], leakSize: 0.8,
        grain: 0.05, scratches: 0.7 * (1 - hold) * (1 - endK), dust: lerp(0.36, 0.2, hold), sharpen: 0.38,
      };
      return { cam, clear: S1 ? 0x040103 : 0x0a0202, post };
    } };
  },
};
