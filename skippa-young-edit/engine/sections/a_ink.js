// SECTION A — "ink burst"  (reference frames 0–20)
//   rf 0–1    extreme close-up of the incoming word inside a bright red/white liquid swirl (blur + flash)
//   rf 2–3    word s01 SLAMS: fills the frame at rf 2, snaps back while un-rotating; a blue-white burst ignites behind it
//   rf 4–7    s01 holds (cap ~40 %, ~20° clockwise) on a dark smoky red field: expanding blue-white ink ring,
//             curled brush squiggles drawing on, ink speckles flying outward, rain, light leaks
//   rf 8–12   smear: defocus -> dark/white turbulent blur -> red comes in (no readable text)
//   rf 13–16  word s02 (~8° counter-clockwise, right end nearer the camera), two long dry-brush strokes, flare-ups
//   rf 17–20  s02 dims into a dark red fog; ripple rings + the top of s03 arrive for the hand-off to section B
import { ease, prog, sat, lerp, track, pulse, clamp, rng, wobble, TAU, DEG } from '../util.js';

const VS_UV = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// domain-warped ink / smoke field (backgrounds)
const FS_INK = /* glsl */ `
uniform sampler2D tNoise; uniform float uTime; uniform float uScale; uniform float uRot; uniform vec2 uAniso; uniform vec2 uOff;
uniform vec3 uC0; uniform vec3 uC1; uniform vec3 uC2; uniform vec3 uC3; uniform vec3 uTint; uniform float uTintAmt;
uniform float uLo; uniform float uHi; uniform float uGain; uniform float uVig; uniform float uCrease;
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
  col *= uGain * mix(1.0, smoothstep(1.15, 0.2, length(c) * 3.0), uVig);
  gl_FragColor = vec4(col, 1.0);
}`;

// blue-white ink burst: an expanding, clumpy ring of light (rgb, added) with a dark smoky core (alpha, occludes)
const FS_BURST = /* glsl */ `
uniform sampler2D tNoise; uniform float uT; uniform float uR; uniform float uW; uniform float uAmt; uniform float uDark; uniform float uCore; uniform float uSeed;
varying vec2 vUv;
vec3 nz(vec2 p){ return texture2D(tNoise, p).rgb; }
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  vec3 w1 = nz(p * 0.42 + uSeed + vec2(0.0, uT * 0.006));
  vec2 q = p + (w1.rg - 0.5) * 0.42;
  vec3 w2 = nz(q * 1.05 + 2.3 - vec2(uT * 0.008, 0.0));
  q += (w2.gb - 0.5) * 0.2;
  float r = length(q);
  vec3 w3 = nz(q * 2.9 + 5.1 + vec2(uT * 0.004));
  float billow = 1.0 - abs(w3.r * 2.0 - 1.0);
  float inner = smoothstep(uR - uW * 1.6, uR, r), outer = 1.0 - smoothstep(uR, uR + uW * 0.75, r);
  float ring = inner * outer;
  float dens = ring * (0.2 + 1.5 * smoothstep(0.28, 0.72, w2.r)) * (0.45 + 0.9 * billow);
  dens += smoothstep(uR, uR * 0.25, r) * 0.22 * smoothstep(0.45, 0.8, w3.g);   // wisps inside the ring
  dens *= uAmt;
  vec3 deep = vec3(0.07, 0.13, 0.78), mid = vec3(0.2, 0.6, 1.0), hot = vec3(0.9, 0.97, 1.0), mag = vec3(0.9, 0.16, 0.72);
  vec3 col = mix(deep, mid, smoothstep(0.08, 0.5, dens)); col = mix(col, hot, smoothstep(0.45, 1.05, dens));
  col = mix(col, mag, smoothstep(0.56, 0.8, w1.b) * 0.65 * (1.0 - smoothstep(0.55, 1.0, dens)));
  float grey = smoothstep(0.05, 0.75, p.x + (w1.g - 0.5) * 0.5);                 // right side: grey-white smoke
  col = mix(col, vec3(dot(col, vec3(0.4, 0.4, 0.2))) * vec3(1.02, 1.0, 1.1), grey * 0.8);
  float core = exp(-dot(p, p) / max(uR * uR * 0.35 + 0.004, 1e-4)) * uCore;
  vec3 light = col * dens + vec3(0.78, 0.92, 1.0) * core;
  float dark = smoothstep(uR * 1.15, uR * 0.35, r + (w3.b - 0.5) * 0.25) * uDark;
  gl_FragColor = vec4(light, clamp(dark, 0.0, 1.0));
}`;

// dark smoke cloud (normal blend)
const FS_SMOKE = /* glsl */ `
uniform sampler2D tNoise; uniform float uTime; uniform vec3 uCol; uniform float uAmt; uniform float uSeed; varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * 2.0;
  vec3 w = texture2D(tNoise, p * 0.4 + uSeed + vec2(uTime * 0.05, 0.0)).rgb;
  vec2 q = p + (w.rg - 0.5) * 0.6;
  float n = texture2D(tNoise, q * 1.3 + 4.2 + vec2(0.0, uTime * 0.07)).r;
  float r = length(q);
  float a = smoothstep(1.0, 0.2, r + (n - 0.5) * 0.7);
  a *= 0.55 + 0.6 * texture2D(tNoise, q * 3.1 + 1.3).g;
  gl_FragColor = vec4(uCol, clamp(a * uAmt, 0.0, 1.0));
}`;

// concentric ripple field (matches the look section B opens on) with an alpha so it can fade in
const FS_RIPPLE = /* glsl */ `
uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uRings; uniform float uVig; uniform float uAlpha; varying vec2 vUv;
void main(){ vec2 p = (vUv - 0.5) * vec2(1.7778, 1.0); float r = length(p); float w = sin(r * uRings - uTime * 3.0) * 0.5 + 0.5; w = smoothstep(0.15, 0.85, w);
  vec3 col = mix(uB, uA, smoothstep(0.75, 0.0, r)); col = mix(col, uC, w * 0.42 * smoothstep(1.0, 0.05, r)); col *= mix(1.0, smoothstep(1.05, 0.25, r), uVig); gl_FragColor = vec4(col, uAlpha); }`;

// screen-locked rain / film scratches
const FS_RAIN = /* glsl */ `
uniform float uT; uniform float uAmt; uniform float uCols; varying vec2 vUv;
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
  float a = layer(vUv, uCols, 1.0, 1.0) + 0.7 * layer(vUv + vec2(0.371, 0.113), uCols * 0.73, 1.35, 5.0);
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

// ink speckles that fly outward from a point (position computed in the vertex shader from a time uniform)
const VS_SPECK = /* glsl */ `
attribute vec3 aDir; attribute vec4 aRnd;
uniform float uT; uniform float uPx; uniform float uReach;
varying float vA; varying float vHue;
void main(){
  float t = max(uT - aRnd.z, 0.0);
  float k = 1.0 - exp(-t * 0.55);
  vec3 p = position + aDir * (aRnd.x * (k * uReach + t * 0.05));
  p.y -= 0.003 * t * t * aRnd.x;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = max(1.0, aRnd.y * uPx / max(-mv.z, 0.05));
  vA = smoothstep(0.0, 0.4, t) * (1.0 - smoothstep(4.5, 9.0, t));
  vHue = aRnd.w;
  gl_Position = projectionMatrix * mv;
}`;
const FS_SPECK = /* glsl */ `
uniform vec3 uColA; uniform vec3 uColB; uniform vec3 uColC; uniform float uOpacity;
varying float vA; varying float vHue;
void main(){
  vec2 c = gl_PointCoord - 0.5; float r = length(c) * 2.0;
  float a = smoothstep(1.0, 0.3, r);
  vec3 col = vHue < 0.5 ? mix(uColA, uColB, vHue * 2.0) : mix(uColB, uColC, vHue * 2.0 - 1.0);
  gl_FragColor = vec4(col * a * vA * uOpacity, a * vA * uOpacity);
}`;

export default {
  build(ctx) {
    const { THREE, kit, tex, words, cfg } = ctx;
    const group = new THREE.Group();
    const HPX = (cfg && cfg.height) || 1080; const ASPECT = ((cfg && cfg.width) || 1920) / HPX;
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const COL = (c) => new THREE.Color(c);
    const U = (v) => ({ value: v });
    const CUT = 10.5;                                  // shot 1 -> shot 2 (hidden inside the smear)
    const shot1 = new THREE.Group(), shot2 = new THREE.Group(), hud = new THREE.Group(); group.add(shot1, shot2, hud);

    // ------------------------------------------------------------------ local builders
    const inkPlane = (o) => {
      const u = { tNoise: U(tex.noise), uTime: U(0), uScale: U(o.scale ?? 9), uRot: U(o.rot ?? 0), uAniso: U(new THREE.Vector2(1, 1)), uOff: U(new THREE.Vector2(o.off ? o.off[0] : 0, o.off ? o.off[1] : 0)),
        uC0: U(COL(o.c[0])), uC1: U(COL(o.c[1])), uC2: U(COL(o.c[2])), uC3: U(COL(o.c[3])), uTint: U(COL(o.tint || '#000000')), uTintAmt: U(o.tintAmt ?? 0),
        uLo: U(o.lo ?? 0.4), uHi: U(o.hi ?? 0.7), uGain: U(1), uVig: U(o.vig ?? 0), uCrease: U(o.crease ?? 0.3) };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(o.w ?? 64, o.h ?? 36), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_INK, uniforms: u, depthWrite: false }));
      m.renderOrder = -20; m.u = u; return m;
    };
    const smokePlane = (w, h, col, seed) => {
      const u = { tNoise: U(tex.noise), uTime: U(0), uCol: U(COL(col)), uAmt: U(1), uSeed: U(seed) };
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_SMOKE, uniforms: u, transparent: true, depthWrite: false }));
      m.renderOrder = -12; m.u = u; return m;
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
      mesh.frustumCulled = false;
      const B = { mesh, u, width,
        set(a, b, wMul = 1) { a = sat(a); b = sat(b); if (b - a < 0.004) { mesh.visible = false; return B; } mesh.visible = true; u.uA.value = a; u.uB.value = b; u.uW.value = 0.5 * B.width * wMul; return B; },
        /** draws on over [t0,t1] (head runs ahead), erases from the tail over [t2,t3] */
        swoosh(rf, t0, t1, t2, t3, wMul = 1, eOn = 'out3', eOff = 'in2') { if (rf < t0 || rf > t3) { mesh.visible = false; return B; } return B.set(prog(rf, t2, t3, eOff), prog(rf, t0, t1, eOn), wMul); } };
      return B;
    };
    // additive specks flying outward from `origin`
    const specks = (count, o = {}) => {
      const { origin = [0, 0, 0], seed = 5, size = [0.012, 0.05], colors = ['#ffffff', '#8fd4ff', '#ff5fb4'], flat = 0.45, additive = true, reach = 2.4 } = o; const R = rng(seed);
      const pos = new Float32Array(count * 3), dir = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) {
        const a = R() * TAU, zz = (R() - 0.5) * 2 * flat, rr = Math.sqrt(1 - zz * zz * 0.6);
        pos[i * 3] = origin[0] + (R() - 0.5) * 0.3; pos[i * 3 + 1] = origin[1] + (R() - 0.5) * 0.3; pos[i * 3 + 2] = origin[2] + (R() - 0.5) * 0.3;
        dir[i * 3] = Math.cos(a) * rr; dir[i * 3 + 1] = Math.sin(a) * rr * 0.72; dir[i * 3 + 2] = zz;
        rnd[i * 4] = 0.25 + 1.0 * Math.pow(R(), 0.7); rnd[i * 4 + 1] = lerp(size[0], size[1], Math.pow(R(), 3)); rnd[i * 4 + 2] = R() * 1.4; rnd[i * 4 + 3] = R();
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aDir', new THREE.BufferAttribute(dir, 3)); geo.setAttribute('aRnd', new THREE.BufferAttribute(rnd, 4));
      const u = { uT: U(0), uPx: U(HPX), uReach: U(reach), uColA: U(COL(colors[0])), uColB: U(COL(colors[1])), uColC: U(COL(colors[2])), uOpacity: U(1) };
      const m = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: VS_SPECK, fragmentShader: FS_SPECK, uniforms: u, transparent: true, depthWrite: false,
        blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: additive ? THREE.OneFactor : THREE.OneMinusSrcAlphaFactor }));
      m.frustumCulled = false; m.u = u; return m;
    };
    const glowSprite = (map, color, o = {}) => { const m = kit.plate(map, 1, 1, { color, additive: true, opacity: 0, billboard: true, depthTest: o.depthTest ?? true, gain: o.gain ?? 1 }); if (o.order !== undefined) m.renderOrder = o.order; return m; };
    const setRGB = (c, a, b, t) => c.setRGB(lerp(a.r, b.r, t), lerp(a.g, b.g, t), lerp(a.b, b.b, t));

    // ================================================================== SHOT 1 — s01
    const PAL_SWIRL = ['#1a0208', '#d2161f', '#ff9488', '#ffffff'].map(COL), PAL_DARK = ['#030104', '#2a0613', '#7c1220', '#ff6a3c'].map(COL);
    const bg1 = inkPlane({ c: ['#030104', '#2a0613', '#7c1220', '#ff6a3c'], scale: 9, tint: '#5a1cc0', tintAmt: 0.5, off: [0.3, 0.7] }); bg1.position.z = -9; shot1.add(bg1);

    const BC = V3(0.05, -0.12, -1.1);                 // burst centre
    const burstU = { tNoise: U(tex.noise), uT: U(0), uR: U(0.1), uW: U(0.08), uAmt: U(0), uDark: U(0), uCore: U(0), uSeed: U(0.37) };
    const burst = new THREE.Mesh(new THREE.PlaneGeometry(9, 9), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_BURST, uniforms: burstU, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor }));
    burst.position.copy(BC); burst.renderOrder = -10; shot1.add(burst);
    const coreGlow = glowSprite(tex.glow, '#bfe6ff', { order: -9 }); coreGlow.position.set(BC.x, BC.y, BC.z + 0.2); shot1.add(coreGlow);
    const coreHot = glowSprite(tex.core, '#ffffff', { order: -9 }); coreHot.position.set(BC.x, BC.y, BC.z + 0.25); shot1.add(coreHot);

    // puffs: blobs of the ring that break off, fly outward and defocus
    const PUFFS = []; { const R = rng(77); const cols = ['#3f7bff', '#7fd0ff', '#ffffff', '#b06bff', '#ff4fb0', '#dfe9ff', '#6fb8ff', '#ffffff'];
      for (let i = 0; i < 36; i++) { const m = glowSprite(R() < 0.55 ? tex.smoke : tex.glow, R.pick(cols), { order: -8 }); m.material.rotation = R() * TAU; shot1.add(m);
        PUFFS.push({ m, ang: R() * TAU, sp: R.range(0.55, 1.3), z: R.range(-1.4, 0.7), s: R.range(0.35, 1.0), delay: R.range(0, 1.3), spin: R.range(-0.2, 0.2) }); } }

    // electric arcs out of the burst core
    const ARCS = []; { const R = rng(41);
      for (let i = 0; i < 9; i++) { const a0 = (i / 9) * TAU + R.range(-0.25, 0.25), L = R.range(1.3, 2.5); const pts = []; let a = a0;
        for (let k = 0; k <= 8; k++) { const rr = 0.12 + (k / 8) * L; a += R.range(-0.22, 0.22); const j = k ? R.range(-0.1, 0.1) : 0; pts.push([BC.x + Math.cos(a) * rr - Math.sin(a) * j, BC.y + (Math.sin(a) * rr + Math.cos(a) * j) * 0.8, BC.z + 0.35 + R.range(-0.2, 0.2)]); }
        const rb = kit.ribbon(pts, { width: R.range(0.018, 0.04), taper: 0.5, color: i % 3 ? '#d6ecff' : '#ffffff', gain: 2.2, segments: 72, shade: 0 }); shot1.add(rb.mesh); ARCS.push({ rb, t0: 3.0 + R.range(0, 2.6), dur: R.range(0.9, 1.5) }); } }

    // the word
    const W1 = kit.word(words.s01 || 'YOUNG', { size: 1, depth: 0.42, style: 'inkWhite', seed: 1 }); shot1.add(W1.group);
    const ST_HOT = { top: COL('#ffffff'), bot: COL('#ffd8dc'), side: COL('#ff5a3c'), sideDark: COL('#7a0812') }, ST_INK = { top: COL('#ffffff'), bot: COL('#ff7f90'), side: COL('#5a0f38'), sideDark: COL('#07020c') };
    const k1 = Math.min(1, (0.62 * ASPECT / W1.width) / 0.4);          // long replacement words shrink to fit
    const wordGlow = glowSprite(tex.glow, '#ff5a8c', { order: -7 }); wordGlow.position.set(0, 0, -0.5); shot1.add(wordGlow);

    // brush squiggles (curly control points), heads run toward the word
    const hw = Math.min(1.5, Math.max(0, W1.width * 0.47 - 0.62));       // push the squiggles outward for wide words
    const SQ = [
      { b: brush([[-3.9 - hw, -1.0, 0.3], [-3.3 - hw, -0.45, 0.3], [-2.75 - hw, 0.2, 0.3], [-2.2 - hw, 0.6, 0.3], [-1.7 - hw, 0.52, 0.3], [-1.3 - hw, 0.28, 0.3], [-0.95 - hw, 0.1, 0.3], [-0.6 - hw, 0.16, 0.3], [-0.42 - hw, 0.4, 0.3]], { width: 0.125, seed: 3, head: 0.25 }), on: [2.5, 7.6], off: [4.9, 9.4] },
      { b: brush([[2.2, 2.4, 0.2], [1.9, 1.75, 0.2], [1.62, 1.32, 0.2], [1.25, 1.06, 0.2], [0.85, 0.9, 0.2], [0.5, 0.74, 0.2], [0.3, 0.5, 0.2]], { width: 0.115, seed: 5, head: 0.2 }), on: [3.4, 8.0], off: [6.3, 9.6] },
      { b: brush([[0.85, -2.5, 0.4], [0.66, -1.8, 0.4], [0.5, -1.25, 0.4], [0.44, -0.9, 0.4], [0.5, -0.66, 0.4]], { width: 0.1, seed: 7, rim: '#ff2060', head: 0.15 }), on: [4.4, 8.2], off: [6.8, 9.6] },
      { b: brush([[4.1 + hw * 0.4, 1.0, -0.3], [3.3 + hw * 0.4, 0.42, -0.3], [2.6 + hw * 0.4, 0.3, -0.3], [2.2 + hw * 0.4, 0.62, -0.3], [2.42 + hw * 0.4, 0.98, -0.3], [2.8 + hw * 0.4, 0.86, -0.3]], { width: 0.07, seed: 9, head: 0.2 }), on: [4.0, 8.4], off: [6.6, 9.8] },
      { b: brush([[-3.4, -2.3, 0.5], [-2.6, -1.5, 0.5], [-2.0, -1.12, 0.5], [-1.5, -1.2, 0.5], [-1.3, -1.48, 0.5]], { width: 0.06, seed: 11, head: 0.2 }), on: [3.6, 8.0], off: [6.0, 9.4] },
    ]; SQ.forEach((s) => shot1.add(s.b.mesh));

    const speck1 = specks(520, { origin: [BC.x, BC.y, BC.z + 0.3], seed: 5, size: [0.012, 0.06], colors: ['#ffffff', '#8fd4ff', '#ff5fb4'] }); speck1.renderOrder = 6; shot1.add(speck1);
    const ink1 = specks(90, { origin: [BC.x, BC.y, BC.z + 0.5], seed: 9, size: [0.02, 0.085], colors: ['#000000', '#12020a', '#2a0410'], additive: false, flat: 0.3 }); ink1.renderOrder = 5; shot1.add(ink1);
    const dust1 = kit.dust({ count: 160, box: [9, 5.5, 5], center: [0, 0, 0.2], size: 0.03, seed: 31, color: '#ffd0e0', opacity: 0.55 }); dust1.renderOrder = 4; shot1.add(dust1);
    const GL1 = []; { const R = rng(19); for (let i = 0; i < 7; i++) { const m = glowSprite(tex.glint, i % 2 ? '#bfe4ff' : '#ffffff', { depthTest: false, order: 8 }); shot1.add(m); GL1.push({ m, x: R.range(-1.7, 1.7), y: R.range(-0.9, 0.9), t0: 2.2 + i * 0.75 + R.range(0, 0.4), s: R.range(0.5, 1.1) }); } }

    // ================================================================== SHOT 2 — s02
    const bg2 = inkPlane({ c: ['#080202', '#4a0a06', '#c2300f', '#ff9a52'], scale: 8, off: [2.1, 4.4], lo: 0.36, hi: 0.68, crease: 0.4 }); bg2.position.z = -7; shot2.add(bg2);
    const cloud2 = smokePlane(7.5, 4.6, '#060202', 0.61); cloud2.position.set(0.1, 0.05, -0.9); shot2.add(cloud2);
    const W2 = kit.word(words.s02 || 'BUT', { size: 1, depth: 0.5, style: 'silver', seed: 2 }); shot2.add(W2.group);
    { const a = { top: COL('#ffa690'), bot: COL('#e84a3c'), side: COL('#84090c'), sideDark: COL('#160103') }, b = { top: COL('#ffffff'), bot: COL('#b6bac2'), side: COL('#5a5f67'), sideDark: COL('#0a0b0d') };
      W2.letters.forEach((L, i) => { const u = L.mesh.material.uniforms; const tt = W2.n > 1 ? sat((L.home.x / W2.width + 0.5) * 1.25 - 0.1) : 0.5;
        setRGB(u.uTop.value, a.top, b.top, tt); setRGB(u.uBot.value, a.bot, b.bot, tt); setRGB(u.uSide.value, a.side, b.side, tt); setRGB(u.uSideDark.value, a.sideDark, b.sideDark, tt); u.uRim.value.set('#ffffff'); u.uRimAmt.value = 0.95; u.uChrome.value = 0.2; }); }
    const k2 = Math.min(1, (0.56 * ASPECT / W2.width) / 0.36);
    const hw2 = Math.min(1.2, Math.max(0, W2.width * 0.5 - 0.85));
    const ST = [
      { b: brush([[-1.42 - hw2, -0.42, 0.1], [-1.62 - hw2, 0.2, 0.12], [-2.0 - hw2, 0.95, 0.16], [-2.5 - hw2, 1.75, 0.2], [-3.1 - hw2, 2.7, 0.24]], { width: 0.15, seed: 21, fray: 0.95, rough: 0.34, rim: '#ff3a26', taper: 0.22 }), on: [10.6, 13.2], off: [14.4, 18.6] },
      { b: brush([[0.72 + hw2, 1.17, 0.1], [1.5 + hw2, 1.04, 0.14], [2.4 + hw2, 0.8, 0.18], [3.3 + hw2, 0.52, 0.22], [4.3 + hw2, 0.2, 0.26]], { width: 0.15, seed: 23, fray: 0.95, rough: 0.34, rim: '#ff3a26', taper: 0.22 }), on: [10.9, 13.6], off: [15.0, 19.6] },
      { b: brush([[0.2, -0.86, 0.3], [0.34, -1.2, 0.3], [0.5, -1.7, 0.3], [0.62, -2.4, 0.3]], { width: 0.1, seed: 25, fray: 0.8, rough: 0.3, core: '#ffb6a6', rim: '#e01a12', taper: 0.25 }), on: [10.8, 12.6], off: [12.8, 16.2] },
      { b: brush([[-0.6, -1.4, -0.4], [-1.4, -1.22, -0.4], [-2.3, -1.3, -0.4], [-3.4, -1.7, -0.4]], { width: 0.05, seed: 27, fray: 0.7, rough: 0.3, rim: '#ff3a26' }), on: [12.4, 15.2], off: [15.6, 18.4] },
    ]; ST.forEach((s) => shot2.add(s.b.mesh));
    const FL2 = [ // flare-ups at the right edge and corners
      { m: glowSprite(tex.smoke, '#ffffff', { order: 3, gain: 1.6 }), p: [3.2, -1.75, 0.5], s: 3.0, ph: 1 }, { m: glowSprite(tex.glow, '#ffe2d6', { order: 3, gain: 1.4 }), p: [3.5, 0.25, -0.4], s: 1.9, ph: 2 },
      { m: glowSprite(tex.smoke, '#ff3a1c', { order: 3, gain: 1.5 }), p: [2.9, -1.6, 0.1], s: 4.2, ph: 3 }, { m: glowSprite(tex.glow, '#ff8a3c', { order: 3 }), p: [-3.4, 1.9, -1.0], s: 3.6, ph: 4 },
      { m: glowSprite(tex.glow, '#d05cff', { order: 3 }), p: [3.6, 1.9, -0.6], s: 2.2, ph: 5 }, { m: glowSprite(tex.smoke, '#ffd0c0', { order: 3 }), p: [-3.3, -1.7, 0.4], s: 2.4, ph: 6 },
    ]; FL2.forEach((f) => { f.m.position.set(f.p[0], f.p[1], f.p[2]); shot2.add(f.m); });
    const dust2 = kit.dust({ count: 240, box: [10, 6, 5], center: [0, 0, 0.4], size: 0.03, seed: 61, color: '#ffc6a0', opacity: 0.6 }); dust2.renderOrder = 4; shot2.add(dust2);
    const ember2 = kit.dust({ count: 70, box: [10, 6, 4], center: [0, 0, 0.8], size: 0.075, seed: 67, color: '#ff5a2a', opacity: 0.5 }); ember2.renderOrder = 4; shot2.add(ember2);
    const halo2 = glowSprite(tex.glow, '#ff2a14', { order: -6 }); halo2.position.set(0, 0, -0.6); shot2.add(halo2);
    // hand-off: ripple rings + the top of the next word
    const ripU = { uA: U(COL('#7a100e')), uB: U(COL('#180102')), uC: U(COL('#c22e26')), uTime: U(0), uRings: U(30), uVig: U(0.95), uAlpha: U(0) };
    const ripple = new THREE.Mesh(new THREE.PlaneGeometry(60, 34), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_RIPPLE, uniforms: ripU, transparent: true, depthWrite: false })); ripple.position.z = -1.6; ripple.renderOrder = -8; shot2.add(ripple);

    // ================================================================== HUD (locked to the camera, at the focal plane)
    const hudPlate = (map, x, y, w, h, color, order = 90, gain = 1) => { const m = kit.plate(map, w, h, { color, additive: true, opacity: 0, depthTest: false, gain }); m.position.set(x, y, 0); m.renderOrder = order; hud.add(m); return m; };
    const AX = ASPECT / 2;
    const curtain = new THREE.Mesh(new THREE.PlaneGeometry(ASPECT * 1.2, 1.2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false })); curtain.renderOrder = 80; hud.add(curtain);
    const BLOBS = []; { const R = rng(303); const cols = ['#ffffff', '#ffd9e2', '#f4f0ff', '#ffb9c9', '#e8e8ee', '#ff9fb4', '#ffffff', '#d9c8ff'];
      for (let i = 0; i < 13; i++) { const a = R() * TAU, rad = R.range(0.22, 0.85); const m = hudPlate(i % 3 === 0 ? tex.smoke : tex.glow, 0, 0, 1, 1, cols[i % cols.length], 84); BLOBS.push({ m, a, rad, s: R.range(0.45, 1.25), sq: R.range(0.5, 1), rot: R() * TAU, t0: R.range(6.9, 8.4), t1: R.range(11.2, 13.2), w: R.range(0.5, 1) }); } }
    const midBlob = hudPlate(tex.glow, 0, 0, 1, 1, '#ffe6ea', 85), midBlob2 = hudPlate(tex.smoke, 0, 0, 1, 1, '#ff8f9a', 85);
    const CORNERS = [[-AX, 0.5, '#ffffff', 1.5], [AX, 0.5, '#fff4f0', 1.4], [AX, -0.5, '#ffffff', 1.7], [-AX, -0.5, '#f0f0ff', 1.2]].map(([x, y, c, s]) => ({ m: hudPlate(tex.glow, x, y, s, s, c, 86), s }));
    // light leaks + edge glints
    const leakTL = hudPlate(tex.glow, -AX * 0.92, 0.52, 1.5, 1.0, '#ffb22e', 92), leakT = hudPlate(tex.streak, -AX * 0.2, 0.497, 1.5, 0.03, '#f6ff5a', 93, 1.6), leakTR = hudPlate(tex.glow, AX * 0.95, 0.42, 0.5, 1.2, '#c05cff', 92), leakBR = hudPlate(tex.glow, AX * 0.9, -0.5, 1.3, 0.8, '#ff5a3c', 92), leakL = hudPlate(tex.glow, -AX, -0.1, 0.5, 1.3, '#ff2a50', 92);
    const rainU = { uT: U(0), uAmt: U(0.4), uCols: U(430) };
    const rain = new THREE.Mesh(new THREE.PlaneGeometry(ASPECT * 1.06, 1.06), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_RAIN, uniforms: rainU, transparent: true, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending })); rain.renderOrder = 95; hud.add(rain);
    // next word (s03) peeking in from the bottom in the last frame
    const W3 = kit.word(words.s03 || 'THE', { size: 1, depth: 0.5, style: 'redGlow', seed: 3 }); W3.group.scale.setScalar(0.32); hud.add(W3.group); W3.letters.forEach((L) => { L.mesh.renderOrder = 88; });
    const halo3 = hudPlate(tex.glow, 0, -0.6, 2.2, 1.2, '#ff1206', 87);

    // ------------------------------------------------------------------ camera
    const camObj = new THREE.PerspectiveCamera(); const fwd = V3(); const cam = { pos: V3(), tgt: V3(), roll: 0, fov: 40, aperture: 0, focus: 4 };
    const CAP1 = [[0, 2.2], [1, 1.55, 'lin'], [2, 0.95, 'lin'], [3, 0.64, 'lin'], [4, 0.46, 'out2'], [5, 0.405, 'lin'], [6, 0.375, 'lin'], [7, 0.35, 'lin'], [8, 0.32, 'lin'], [10.6, 0.25, 'lin']];
    const ROT1 = [[0, 47], [1, 43], [2, 38], [3, 33], [4, 27], [5, 23.5], [6, 20.5], [7, 16], [8, 10], [10.6, -6]];
    const CAP2 = [[10.4, 0.11], [12, 0.17, 'lin'], [13, 0.235, 'lin'], [14, 0.29, 'lin'], [15, 0.335, 'lin'], [16, 0.356, 'lin'], [17, 0.38, 'lin'], [18, 0.4, 'lin'], [19, 0.414, 'lin'], [21, 0.435, 'lin']];
    const ROLL2 = [[10.4, -46], [12, -29, 'lin'], [13, -17, 'lin'], [14, -12.5, 'lin'], [15, -9.5, 'lin'], [16, -8, 'lin'], [17, -4, 'lin'], [18, -1.6, 'lin'], [19, -0.5, 'lin'], [21, 0, 'lin']];
    const YAW2 = [[10.4, 0.85], [13, 0.66, 'lin'], [15, 0.52, 'lin'], [17, 0.3, 'lin'], [19, 0.1, 'lin'], [21, 0.02, 'lin']];

    return { group, update(rf) {
      const S1 = rf < CUT; shot1.visible = S1; shot2.visible = !S1;
      const tb = rf - 3.15;                                                            // frames since the burst ignites
      // ---------------- camera
      if (S1) {
        const cap = track(CAP1, rf) * (rf > 2 ? lerp(1, k1, prog(rf, 2, 4)) : 1); const d = 1 / (0.7279 * cap);
        const tx = track([[0, 0.34], [2, 0.12, 'out2'], [4, -0.1, 'out2'], [8, -0.06, 'lin'], [10.6, 0.3, 'in2']], rf), ty = track([[0, 0.12], [2, 0.04, 'out2'], [4, -0.04, 'out2'], [8, -0.02, 'lin'], [10.6, -0.2, 'in2']], rf);
        cam.tgt.set(tx, ty, 0); cam.pos.set(tx, ty + 0.02 * d, d); cam.fov = 40; cam.roll = track([[0, 7], [3, 3, 'out2'], [6, 0, 'lin'], [8, -4, 'in2'], [10.6, -22, 'in2']], rf);
        cam.aperture = track([[0, 0.05], [2, 0.03], [4, 0.045], [6.4, 0.05], [7.4, 0.13, 'in2'], [8.4, 0.3, 'lin'], [10.6, 0.36]], rf); cam.focus = d * track([[0, 1], [6.4, 1], [8, 0.62, 'in2'], [10.6, 0.45]], rf);
      } else {
        const cap = track(CAP2, rf) * k2; const d = 1 / (0.9326 * cap);
        cam.tgt.set(0.02, 0.0, 0); cam.pos.set(0.02, 0.05 * d, d); cam.fov = 50; cam.roll = track(ROLL2, rf);
        cam.aperture = track([[10.4, 0.5], [12, 0.34, 'lin'], [13, 0.16, 'lin'], [14, 0.07, 'out2'], [15, 0.035, 'lin'], [21, 0.035]], rf); cam.focus = d * track([[10.4, 0.5], [12, 0.6], [13.4, 0.86, 'lin'], [14.4, 1, 'out2']], rf);
      }
      const shA = track([[0, 0.02], [2, 0.05], [3.5, 0.09], [5, 0.035], [7, 0.03], [9, 0.07], [12, 0.08], [14, 0.04], [15.3, 0.04], [16, 0.1], [17.5, 0.03], [21, 0.015]], rf);
      const sh = kit.shake(rf, shA, 0.9, 3); cam.pos.add(sh); cam.tgt.addScaledVector(sh, 0.6);

      // ---------------- shot 1
      if (S1) {
        const sw = 1 - prog(rf, 0.6, 3.2, 'io2');                                      // 1 = bright red/white swirl, 0 = dark smoky field
        const u = bg1.u; setRGB(u.uC0.value, PAL_DARK[0], PAL_SWIRL[0], sw); setRGB(u.uC1.value, PAL_DARK[1], PAL_SWIRL[1], sw); setRGB(u.uC2.value, PAL_DARK[2], PAL_SWIRL[2], sw); setRGB(u.uC3.value, PAL_DARK[3], PAL_SWIRL[3], sw);
        u.uAniso.value.set(lerp(1, 0.2, sw), 1); u.uRot.value = 0.62; u.uLo.value = lerp(0.42, 0.3, sw); u.uHi.value = lerp(0.74, 0.5, sw); u.uGain.value = lerp(0.95, 1.5, sw) * (1 + 0.5 * pulse(rf, 3.3, 3)); u.uTime.value = rf * 0.16; u.uTintAmt.value = 0.55 * (1 - sw); u.uScale.value = lerp(9, 5, sw);
        // word: slam + un-rotate, letters settle one after another
        const rz = -DEG * track(ROT1, rf); W1.group.rotation.set(-0.2, -0.26, rz); W1.group.position.set(0, 0, 0);
        const hot = 1 - prog(rf, 1.5, 4.2, 'out2'); for (const L of W1.letters) { const lu = L.mesh.material.uniforms; setRGB(lu.uBot.value, ST_INK.bot, ST_HOT.bot, hot); setRGB(lu.uSide.value, ST_INK.side, ST_HOT.side, hot); setRGB(lu.uSideDark.value, ST_INK.sideDark, ST_HOT.sideDark, hot); }
        const fadeOut = 1 - prog(rf, 7.6, 9.2, 'io2');
        for (let i = 0; i < W1.n; i++) { const L = W1.letters[i]; const k = 1 - prog(rf, 1.4 + i * 0.2, 4.4 + i * 0.2, 'out4'); const wv = Math.sin(rf * 1.3 + i * 1.7) * 0.012 * prog(rf, 4, 5);
          W1.pose(i, { z: k * 0.3 * (0.5 + L.rnd), y: wv, rz: k * (L.rnd2 - 0.5) * 0.5, s: 1 + k * 0.18, o: fadeOut }); }
        W1.gain(track([[0, 2.2], [2, 1.9], [3.4, 2.1], [4.4, 1.35, 'out2'], [6.5, 1.22], [8, 1.5]], rf));
        const wg = wordGlow; wg.scale.set(W1.width * 2.1, 2.6, 1); wg.material.opacity = 0.34 * prog(rf, 2.5, 4.5) * fadeOut; wg.material.rotation = rz;
        // burst
        const bu = burstU; bu.uT.value = Math.max(0, tb) * 6; bu.uR.value = track([[3.1, 0.03], [3.6, 0.14, 'out2'], [4, 0.27, 'out2'], [5, 0.36, 'lin'], [6, 0.47, 'lin'], [7, 0.58, 'lin'], [8.5, 0.72, 'lin']], rf);
        bu.uW.value = track([[3.1, 0.05], [4, 0.105], [6, 0.15], [8.5, 0.2]], rf); bu.uAmt.value = track([[3.1, 0], [3.5, 2.2, 'out2'], [4.2, 1.6], [5, 1.25], [6, 0.8], [7, 0.42], [8.4, 0]], rf);
        bu.uDark.value = track([[3.1, 0], [4, 0.82, 'out2'], [6, 0.8], [8, 0.4]], rf); bu.uCore.value = track([[3.05, 0], [3.35, 3.2, 'out2'], [4.1, 0.55, 'out2'], [5, 0.12], [6, 0]], rf); burst.visible = tb > -0.1;
        const cg = pulse(rf, 3.3, 2.6, 0.35); coreGlow.scale.setScalar(2.2 + 4.5 * prog(rf, 3.1, 5)); coreGlow.material.opacity = 0.9 * cg; coreHot.scale.setScalar(1.2 + 2.2 * prog(rf, 3.1, 4.4)); coreHot.material.opacity = cg;
        for (const p of PUFFS) { const t = tb - p.delay * 0.55; if (t <= 0) { p.m.visible = false; continue; } p.m.visible = true; const dist = p.sp * (2.5 * (1 - Math.exp(-t * 0.5)) + 0.14 * t); const a = p.ang + p.spin * t * 0.2;
          p.m.position.set(BC.x + Math.cos(a) * dist, BC.y + Math.sin(a) * dist * 0.76, p.z); const s = p.s * (0.55 + 0.3 * t); p.m.scale.set(s, s, 1); p.m.material.opacity = 0.7 * sat(t * 2.2) * sat(1 - (t - 3.2) / 3.2); }
        for (const a of ARCS) a.rb.swoosh(rf, a.t0, a.t0 + a.dur * 0.55, a.t0 + a.dur * 0.45, a.t0 + a.dur);
        SQ.forEach((s, i) => s.b.swoosh(rf, s.on[0], s.on[1], s.off[0], s.off[1], 1 + 0.25 * pulse(rf, 3.5, 3)));
        speck1.u.uT.value = tb; speck1.u.uPx.value = HPX / (2 * Math.tan(cam.fov * DEG / 2)); ink1.u.uT.value = tb - 0.2; ink1.u.uPx.value = speck1.u.uPx.value; speck1.visible = ink1.visible = tb > 0;
        dust1.drift(rf, [0.012, 0.02, 0.01], 0.1); dust1.material.opacity = 0.55 * prog(rf, 2.5, 4.5);
        for (const g of GL1) { const k = pulse(rf, g.t0, 1.6, 0.4); g.m.visible = k > 0.01; g.m.position.set(g.x, g.y, 0.4); const s = g.s * (0.5 + 0.9 * k); g.m.scale.set(s, s, 1); g.m.material.opacity = k; g.m.material.rotation = rf * 0.25; }
      } else {
        // ---------------- shot 2
        const u = bg2.u; u.uTime.value = rf * 0.14; u.uGain.value = track([[10.4, 0.7], [12, 1.05], [13, 1.25, 'out2'], [16, 1.1], [17, 0.75], [20.6, 0.5]], rf);
        cloud2.u.uTime.value = rf * 0.1; cloud2.u.uAmt.value = 0.92;
        W2.group.rotation.set(-0.13, -track(YAW2, rf), 0); W2.group.position.set(0, 0, 0);
        const inS = prog(rf, 10.4, 12.2); const outW = track([[17.4, 1], [19, 0.8], [20.5, 0.42]], rf);
        for (let i = 0; i < W2.n; i++) { const L = W2.letters[i]; const k = 1 - prog(rf, 11.6 + i * 0.5, 14.6 + i * 0.5, 'out4'); W2.pose(i, { z: -k * 0.9, y: k * (L.rnd - 0.5) * 0.5, rz: k * (L.rnd2 - 0.5) * 0.7, s: 1 + k * 0.1, o: inS * outW }); }
        W2.gain(track([[10.4, 1.9], [13, 1.75], [14, 1.3, 'out2'], [15.3, 1.12], [16, 1.3], [17, 0.95], [20.6, 0.9]], rf)); W2.desat(track([[16.5, 0], [17.2, 0.35], [18.5, 0.1], [20.6, 0]], rf));
        halo2.scale.set(W2.width * 2.4, 2.4, 1); halo2.material.opacity = 0.3 * prog(rf, 12, 14) + 0.25 * prog(rf, 17.5, 20);
        ST.forEach((s) => s.b.swoosh(rf, s.on[0], s.on[1], s.off[0], s.off[1], 1 + 0.2 * pulse(rf, 13, 3), 'out2', 'io2'));
        for (const f of FL2) { const fl = 0.75 + 0.25 * wobble(rf * 0.7, f.ph); const s = f.s * (0.9 + 0.2 * wobble(rf * 0.5, f.ph + 9)); f.m.scale.set(s, s, 1); f.m.material.opacity = fl * track([[10.4, 0.4], [12.6, 1], [16.2, 1], [17.2, 0.5], [19, 0.2], [20.6, 0.05]], rf); f.m.material.rotation = f.ph + rf * 0.03; }
        dust2.drift(rf, [0.018, 0.012, 0.0], 0.1); ember2.drift(rf, [0.01, 0.03, 0.0], 0.14); dust2.material.opacity = 0.6 * track([[10.4, 0.3], [13, 1], [17, 0.8], [20.6, 0.3]], rf); ember2.material.opacity = 0.5 * track([[10.4, 0.3], [13, 1], [17, 0.7], [20.6, 0.3]], rf);
        ripU.uTime.value = rf / 30; ripU.uAlpha.value = track([[17.6, 0], [19.4, 0.5], [20.6, 0.86]], rf); ripple.visible = ripU.uAlpha.value > 0.002;
        ripple.position.set(cam.tgt.x, cam.tgt.y, -1.6);
      }

      // ---------------- HUD
      camObj.position.copy(cam.pos); camObj.up.set(0, 1, 0); camObj.lookAt(cam.tgt); if (cam.roll) camObj.rotateZ(cam.roll * DEG); camObj.getWorldDirection(fwd);
      const hh = 2 * Math.tan(cam.fov * DEG / 2) * cam.focus; hud.position.copy(cam.pos).addScaledVector(fwd, cam.focus); hud.quaternion.copy(camObj.quaternion); hud.scale.setScalar(hh);
      const smear = track([[6.8, 0], [8, 0.75, 'in2'], [9, 1], [11, 1], [12.2, 0.7], [13.4, 0.12, 'out2'], [14, 0]], rf);
      curtain.material.opacity = track([[7.4, 0], [8.6, 0.5], [9.4, 0.78], [10.6, 0.6], [11.8, 0.3], [13, 0]], rf); curtain.visible = curtain.material.opacity > 0.002;
      for (const b of BLOBS) { const life = sat((rf - b.t0) / 1.2) * sat((b.t1 - rf) / 1.6); b.m.visible = life > 0.002; if (!b.m.visible) continue; const tt = rf - 9.5; const a = b.a + tt * 0.11 * (b.w > 0.75 ? -1 : 1), rad = b.rad * (1 + tt * 0.07);
        b.m.position.set(Math.cos(a) * rad * AX, Math.sin(a) * rad * 0.55, 0); b.m.scale.set(b.s * (1 + 0.05 * tt), b.s * b.sq * (1 + 0.05 * tt), 1); b.m.rotation.z = b.rot + tt * 0.15; b.m.material.opacity = 0.42 * life * b.w; }
      const mb = track([[7.2, 0], [8.4, 0.75], [10, 0.9], [11.4, 0.8], [12.6, 0.35], [13.6, 0]], rf); midBlob.visible = midBlob2.visible = mb > 0.002;
      midBlob.scale.set(0.9 + 0.1 * wobble(rf * 0.8, 2), 0.62, 1); midBlob.position.set(0.02 * wobble(rf, 4), -0.02, 0); midBlob.material.opacity = mb; midBlob.rotation.z = 0.5 - rf * 0.12;
      midBlob2.scale.set(1.25, 0.8, 1); midBlob2.position.set(-0.03, -0.1, 0); midBlob2.material.opacity = mb * track([[8, 0.2], [9, 0.25], [10.2, 0.7], [12, 0.8]], rf); midBlob2.rotation.z = rf * 0.2;
      CORNERS.forEach((c, i) => { const o = track([[7, 0], [8.2, 0.75], [10.4, 0.7], [11.6, 0.4], [13, 0.12], [15, 0]], rf) * (0.75 + 0.25 * wobble(rf * 0.9, i + 20)); c.m.material.opacity = o; c.m.visible = o > 0.002; });
      // leaks
      const lk = 0.8 + 0.2 * wobble(rf * 0.8, 11);
      leakTL.material.opacity = lk * track([[0, 0.9], [2, 0.75], [4, 0.5], [7, 0.55], [9, 0.25], [11, 0.5], [13, 0.7], [16, 0.6], [17.2, 0.25], [20.6, 0.05]], rf);
      leakT.material.opacity = track([[0, 1], [3, 0.9], [8, 0.7], [9.4, 0.2], [12, 0.9], [16.4, 0.9], [17.4, 0.1], [20.6, 0]], rf) * (0.6 + 0.4 * wobble(rf * 1.3, 5)); leakT.position.x = -AX * 0.2 + 0.4 * wobble(rf * 0.4, 8);
      leakTR.material.opacity = track([[0, 0.3], [2.6, 0.5], [3.4, 0.9], [5, 0.5], [8, 0.4], [10, 0.15], [14, 0.5], [16.4, 0.7], [17.4, 0.2], [20.6, 0]], rf);
      leakBR.material.opacity = track([[0, 0.5], [3, 0.3], [8, 0.25], [12, 0.5], [16.4, 0.6], [17.4, 0.2], [20.6, 0.05]], rf) * lk;
      leakL.material.opacity = track([[0, 0.6], [2, 0.5], [5, 0.25], [8, 0.2], [12, 0.3], [20.6, 0.15]], rf);
      rainU.uT.value = rf * 0.05 + Math.floor(rf + 0.5) * 0.377; rainU.uAmt.value = track([[0, 0.34], [8, 0.34], [16.6, 0.3], [18, 0.12], [20.6, 0.05]], rf);
      // next word peeking in
      const pk = prog(rf, 19.45, 20.9, 'out2'); const show3 = !S1 && pk > 0; W3.group.visible = show3; halo3.visible = show3;
      if (show3) { const yTop = -0.5 - 0.06 + 0.3 * pk; W3.group.position.set(0, yTop - 0.16, 0); W3.group.rotation.set(-0.1, 0.3, -0.03); W3.reset(1); W3.gain(1.5); halo3.position.set(0, yTop - 0.1, 0); halo3.material.opacity = 0.55 * pk; }

      // ---------------- post
      const beta = clamp(track([[0, 0.72], [1, 0.62], [2, 0.16, 'out2'], [3, 0.2], [4, 0.1], [5, 0.02], [6.4, 0.02], [7.2, 0.5, 'in2'], [8, 0.88], [12, 0.88], [13, 0.62], [14, 0.24, 'out2'], [15, 0.03], [16.6, 0.05], [17.4, 0.3], [20.6, 0.4]], rf), 0, 0.93);
      const E = track([[0, 1.5], [1, 1.5], [2, 1.3], [3, 1.3], [4, 1.1], [5, 1.0], [7, 1.02], [8, 1.12], [9, 0.82], [10, 0.98], [11, 1.08], [12, 1.12], [13, 1.3], [14, 1.08], [15, 1.0], [16, 1.08], [17, 0.66], [18, 0.62], [19, 0.7], [20.6, 0.74]], rf);
      const zb = track([[0, 0.9], [1, 0.8], [2, 0.3], [3, 0.34], [4, 0.14], [5, 0.03], [6.4, 0.02], [7, 0.16], [8, 0.5], [9, 0.62], [10.5, 0.7], [12, 0.5], [13, 0.22], [14, 0.06], [15, 0.0], [15.5, 0.0], [16, 0.16], [17, 0.05], [20.6, 0.03]], rf);
      const fog = track([[16.6, 0], [17.4, 0.22], [18.4, 0.34], [19.4, 0.42], [20.6, 0.5]], rf);
      const post = {
        exposure: E * (1 - beta), bloom: 0.72 + beta / (1 - beta), bloomThreshold: lerp(0.72, -0.35, sat(beta * 3)), bloomTint: [1, 0.96, 0.98],
        contrast: track([[0, 1.14], [16.6, 1.14], [17.6, 0.96], [20.6, 0.92]], rf), saturation: track([[0, 1.3], [8, 1.3], [9, 0.9], [11, 1.25], [16.6, 1.3], [17.2, 0.9], [18.4, 1.15], [20.6, 1.2]], rf),
        desat: track([[7.6, 0], [9, 0.62], [10, 0.4], [11.2, 0.1], [12, 0]], rf), tint: track([[0, [1, 1, 1]], [16.8, [1, 1, 1]], [18.2, [1, 0.8, 0.8]], [20.6, [1, 0.7, 0.7]]], rf),
        vignette: track([[0, 0.25], [2, 0.35], [4, 0.6], [8, 0.5], [10, 0.3], [13, 0.55], [17, 0.75], [20.6, 0.8]], rf),
        chroma: 0.0045 + 0.004 * pulse(rf, 3.4, 3) + 0.003 * pulse(rf, 13, 3) + 0.006 * pulse(rf, 15.7, 2.2) + 0.002 * smear - 0.003 * prog(rf, 17, 20),
        zoomBlur: zb, zoomCenter: [0.5 + 0.03 * wobble(rf * 0.5, 31), 0.5],
        warp: track([[0, 0.085], [2, 0.05], [4, 0.036], [6.4, 0.04], [8, 0.11], [10, 0.14], [12, 0.11], [13, 0.07], [14, 0.045], [16, 0.04], [17.4, 0.03], [20.6, 0.016]], rf), warpScale: track([[0, 2.6], [6, 3.0], [9, 4.2], [12, 3.6], [14, 3.0], [20.6, 2.4]], rf),
        flash: 0.22 * pulse(rf, 0, 1.6, 0.1) + 0.16 * pulse(rf, 2.1, 1.3, 0.5) + 0.14 * pulse(rf, 3.3, 1.2, 0.3) + 0.12 * pulse(rf, 12.9, 1.4, 0.5), flashColor: [1, 0.96, 0.94],
        flat: fog, flatColor: track([[16.6, [0.1, 0.02, 0.02]], [18.4, [0.3, 0.05, 0.06]], [20.6, [0.44, 0.07, 0.07]]], rf),
        mirror: 0.3 * pulse(rf, 15.8, 1.6, 0.5), zoom: 1 + 0.05 * pulse(rf, 3.5, 3) + 0.035 * pulse(rf, 13, 3) + 0.11 * pulse(rf, 15.8, 1.8, 0.5) + 0.03 * pulse(rf, 19.3, 3),
        rotate: 0.012 * wobble(rf * 0.6, 17), shake: [0.004 * wobble(rf * 1.7, 41) * (1 + 3 * pulse(rf, 15.8, 2)), 0.004 * wobble(rf * 1.7, 43) * (1 + 3 * pulse(rf, 15.8, 2))],
        leak: track([[0, 0.5], [2, 0.3], [5, 0.16], [8, 0.2], [12, 0.35], [14, 0.4], [16.6, 0.35], [18, 0.15], [20.6, 0.08]], rf), leakColor: [1, 0.42, 0.16], leakPos: [0.04, 0.96], leakSize: 0.8,
        grain: 0.05, scratches: track([[0, 1.6], [16.6, 1.6], [18, 0.6], [20.6, 0.2]], rf), sharpen: 0.35,
      };
      return { cam, clear: S1 ? 0x040103 : 0x0a0202, post };
    } };
  },
};
