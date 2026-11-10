// SECTION K (OFTEN, heavenly) — "ascension in gold light"  (reference frames 525–658)
//   525–531  the smoke wipe clears to a warm, starry gold-and-ivory space (letterboxed)
//   526–545  a ball of golden light blocks grows out of a white-hot core, wrapped in ivory smoke filaments
//   545–553  it flattens into a mosaic of the medallion; the struck-gold coin resolves tile by tile (whole at 553)
//   553–566  the medallion holds: halo ring, dial and soft beams behind it, a light sweep crosses the metal
//   566–570  it flashes pale gold and shrinks; the space drains to black behind a warm puff of smoke
//   569–585  the small coin on black: gold shockwave at 569, glow pulses on the beats (577, 581), a split at 583
//   585–594  radial blur → white-gold flash → a tunnel of gold halo rings and light streaks, slowing into the dark
//   594–611  the call-to-action rises out of depth amid gold shards that never cross its letters (whole at 598)
//   611–617  the letters burst apart into light   ·   617+ black
// The heavy things (≈4.5k blocks, the tunnel, the shards) are instanced and animated on the GPU: update() only sets uniforms.
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';

const KEYV = [-0.45, 0.62, 0.64], FILLV = [0.62, -0.45, 0.4], BACKV = [0.12, 0.55, -0.83];   // view-space lights: key from the upper left (the heavens)
const SMOKE_IN = [0.18, 0.55, 1.0], SMOKE = [1.0, 0.74, 0.38];   // the previous scene's smoke colour → warm gold
const CTA_STYLE = { top: '#fffaf0', bot: '#efcd84', side: '#a06812', sideDark: '#190b02', rim: '#fff2cc', gain: 1.0, chrome: 0.28, rimAmt: 0.9 };

// ---------------------------------------------------------------- warm nebula (far background)
const NEB_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const NEB_FS = `uniform sampler2D tNoise; uniform float uTime; uniform float uAmt; uniform float uCore; varying vec2 vUv;
float nz(vec2 p){ return texture2D(tNoise, p).r; }
float fbm(vec2 p){ return nz(p) * 0.5 + nz(p * 2.03 + 0.37) * 0.25 + nz(p * 4.07 + 0.71) * 0.15 + nz(p * 8.13 + 0.13) * 0.1; }
void main(){
  vec2 p = (vUv - 0.5) * vec2(1.7, 1.0); float r = length(p * vec2(0.85, 1.0));
  float f = fbm(p * 1.6 + vec2(uTime * 0.0012, -uTime * 0.0008));
  float g = fbm(p * 3.4 + vec2(f * 0.8, -f * 0.5) + vec2(-uTime * 0.0016, 0.0));
  float ridge = pow(1.0 - abs(g * 2.0 - 1.0), 6.0);
  float neb = smoothstep(0.36, 0.8, f); float halo = exp(-r * r * 20.0); float core = exp(-r * r * 90.0);
  vec3 col = vec3(0.012, 0.006, 0.003);
  col += vec3(0.26, 0.13, 0.035) * neb * (0.3 + 0.9 * halo);
  col += vec3(0.85, 0.6, 0.27) * ridge * neb * (0.08 + 0.55 * halo);
  col += (vec3(1.0, 0.8, 0.5) * core * 0.4 + vec3(0.5, 0.3, 0.1) * halo * 0.16) * uCore;
  col *= 0.62 + 0.38 * smoothstep(0.22, 0.68, g);
  gl_FragColor = vec4(col * uAmt, 1.0); }`;

// ---------------------------------------------------------------- stars (drawn from the un-jittered lens: crisp, twinkling)
const STAR_VS = `uniform mat4 uView; uniform float uPx; uniform float uTime; uniform float uOpacity; attribute float aSize; attribute float aPh; attribute vec3 aCol; varying vec3 vCol;
void main(){ vec4 mv = uView * modelMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mv;
  float tw = 0.6 + 0.4 * sin(uTime * (0.12 + 0.25 * fract(aPh * 7.3)) + aPh * 40.0);
  vCol = aCol * tw * uOpacity; gl_PointSize = max(1.0, aSize * uPx / 1080.0); }`;
const STAR_FS = `uniform float uGlint; varying vec3 vCol;
void main(){ vec2 c = gl_PointCoord - 0.5; float r2 = dot(c, c) * 4.0; float a = exp(-r2 * 7.0);
  if (uGlint > 0.5) a = exp(-r2 * 60.0) + (exp(-abs(c.x) * 70.0) * exp(-c.y * c.y * 10.0) + exp(-abs(c.y) * 70.0) * exp(-c.x * c.x * 10.0)) * 0.7 + exp(-r2 * 6.0) * 0.12;
  gl_FragColor = vec4(vCol * a, 1.0); }`;

// ---------------------------------------------------------------- the ball: bevelled gold voxel blocks, lit like real 3D cubes
const ROT3 = `mat3 rx(float a){ float c = cos(a), s = sin(a); return mat3(1.0, 0.0, 0.0, 0.0, c, s, 0.0, -s, c); }
mat3 ry(float a){ float c = cos(a), s = sin(a); return mat3(c, 0.0, -s, 0.0, 1.0, 0.0, s, 0.0, c); }
mat3 rz(float a){ float c = cos(a), s = sin(a); return mat3(c, s, 0.0, -s, c, 0.0, 0.0, 0.0, 1.0); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }`;
const CUBE_VS = `attribute vec3 aHome; attribute vec4 aSeed; attribute vec3 aRot; attribute float aEmit;
uniform float uK; uniform float uMorph; uniform float uSpin; uniform float uTilt; uniform float uTime; uniform float uReveal; uniform float uR; uniform float uHot;
varying vec3 vLoc; varying vec3 vNl; varying vec3 vB0; varying vec3 vB1; varying vec3 vB2; varying vec3 vView;
varying float vEmit; varying float vHot; varying vec2 vDisc; varying float vC;
${ROT3}
void main(){
  float d = aSeed.x;
  float k = clamp((uK - d * 0.42) / 0.58, 0.0, 1.0); k = 1.0 - pow(1.0 - k, 3.0);
  vec3 dir = normalize(aHome);
  vec3 from = dir * uR * (0.05 + 0.24 * fract(d * 7.31 + aSeed.w * 0.11));
  float breathe = 1.0 + 0.022 * sin(uTime * 0.23 + aSeed.w * 6.0) * k;
  vec3 p = mix(from, aHome * breathe, k);
  mat3 S = rx(uTilt) * ry(uSpin);
  vec3 q = S * p;
  vDisc = q.xy / (uR * 2.0) + 0.5;                                  // where this block sits on the medallion
  float gone = step(h21(floor(vDisc * 26.0)), uReveal);             // the coin takes over this cell
  float fl = 1.0 - uMorph * 0.86;
  q.z *= 1.0 - uMorph * 0.96; q.z -= uMorph * 0.05;
  float tum = 1.0 - k;
  mat3 Rc = S * rx(aRot.x * tum) * ry(aRot.y * tum) * rz(aRot.z * tum);
  float s = aSeed.y * mix(0.3, 1.0, k) * (1.0 - gone) * (1.0 + 0.12 * uMorph);
  vec3 lp = Rc * (position * s); lp.z *= fl;
  vec4 mv = modelViewMatrix * vec4(q + lp, 1.0); vView = -mv.xyz;
  mat3 F = mat3(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0 / max(fl, 0.1));
  mat3 M = normalMatrix * F * Rc; vB0 = M[0]; vB1 = M[1]; vB2 = M[2];
  vLoc = position; vNl = normal;
  vEmit = aEmit * (0.55 + 0.45 * sin(uTime * 0.31 + aSeed.w * 9.0)) * (1.0 - uMorph);
  vHot = clamp(tum * 1.15, 0.0, 1.0) * uHot; vC = aSeed.z;
  gl_Position = projectionMatrix * mv; }`;
const CUBE_FS = `uniform sampler2D tEmb; uniform float uEmb; uniform float uGain; uniform vec3 uKey; uniform vec3 uFill; uniform vec3 uBack;
varying vec3 vLoc; varying vec3 vNl; varying vec3 vB0; varying vec3 vB1; varying vec3 vB2; varying vec3 vView;
varying float vEmit; varying float vHot; varying vec2 vDisc; varying float vC;
void main(){
  vec3 nl = vNl; vec3 bev = sign(vLoc) * smoothstep(0.38, 0.5, abs(vLoc)) * (1.0 - abs(nl));     // bevelled edges tilt the normal outward
  float edge = clamp(max(max(abs(bev.x), abs(bev.y)), abs(bev.z)), 0.0, 1.0);
  vec3 n = normalize(mat3(vB0, vB1, vB2) * normalize(nl + bev * 1.2)); vec3 v = normalize(vView);
  vec3 deep = vec3(0.24, 0.12, 0.025), mid = vec3(0.86, 0.58, 0.2), hi = vec3(1.0, 0.86, 0.55);
  vec3 alb = vC < 0.55 ? mix(deep, mid, vC / 0.55) : mix(mid, hi, (vC - 0.55) / 0.45);
  float dif = max(dot(n, uKey), 0.0); float fil = max(dot(n, uFill), 0.0);
  vec3 r = reflect(-v, n); float box = smoothstep(0.55, 0.95, dot(r, uKey));
  float spk = pow(max(dot(n, normalize(uKey + v)), 0.0), 36.0);
  vec3 col = alb * (0.05 + 0.75 * dif) + alb * vec3(0.55, 0.3, 0.08) * fil * 0.45;
  col += mix(alb, vec3(1.0, 0.95, 0.85), 0.4) * (box * 0.9 + spk * (0.7 + 1.8 * edge));
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.0) * (0.35 + 0.65 * max(dot(n, uBack), 0.0)); col += vec3(1.0, 0.82, 0.48) * rim * 0.55;
  col += vec3(1.0, 0.8, 0.45) * edge * 0.18 * (0.4 + dif);
  col = mix(col, vec3(1.55, 1.3, 0.92), vEmit * (0.6 + 0.4 * edge));
  col = mix(col, vec3(1.4, 1.3, 1.12), vHot);
  vec3 em = texture2D(tEmb, vDisc).rgb;
  col = mix(col, em * (0.5 + 0.55 * dif + 0.6 * spk) + vec3(1.0, 0.85, 0.5) * edge * 0.15, uEmb);
  gl_FragColor = vec4(col * uGain, 1.0); }`;

// ---------------------------------------------------------------- the medallion: struck gold (relief from the emblem, raised rim, reeded edge)
const COIN_VS = `varying vec2 vUv; varying vec3 vView; varying vec3 vT; varying vec3 vB; varying vec3 vNn;
void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz;
  vT = normalize(normalMatrix * vec3(1.0, 0.0, 0.0)); vB = normalize(normalMatrix * vec3(0.0, 1.0, 0.0)); vNn = normalize(normalMatrix * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * mv; }`;
const COIN_FS = `uniform sampler2D tMap; uniform float uSweep; uniform float uFlash; uniform float uOpacity; uniform float uReveal; uniform float uGlow; uniform vec3 uKey;
varying vec2 vUv; varying vec3 vView; varying vec3 vT; varying vec3 vB; varying vec3 vNn;
float lum(vec2 u){ return dot(texture2D(tMap, u).rgb, vec3(0.299, 0.587, 0.114)); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard;
  if (h21(floor(vUv * 26.0)) > uReveal) discard;
  vec3 base = texture2D(tMap, vUv).rgb; float l = dot(base, vec3(0.299, 0.587, 0.114));
  float e = 1.4 / 1024.0; float hx = lum(vUv + vec2(e, 0.0)) - lum(vUv - vec2(e, 0.0)); float hy = lum(vUv + vec2(0.0, e)) - lum(vUv - vec2(0.0, e));
  float E = 7.0 / 1024.0; float hb = (lum(vUv + vec2(E, 0.0)) + lum(vUv - vec2(E, 0.0)) + lum(vUv + vec2(0.0, E)) + lum(vUv - vec2(0.0, E))) * 0.25;
  float ao = clamp(1.0 - max(hb - l, 0.0) * 2.4, 0.4, 1.0);
  float relief = smoothstep(0.62, 0.92, l);
  vec2 rd = p / max(r, 1e-4);
  float wIn = smoothstep(0.885, 0.905, r) * (1.0 - smoothstep(0.915, 0.935, r)); float wOut = smoothstep(0.968, 0.992, r);
  vec3 n = vec3(-hx * 6.5, -hy * 6.5, 1.0); n.xy += -rd * wIn * 1.4 + rd * wOut * 2.4 + p * 0.06; n = normalize(n);
  vec3 N = normalize(vT * n.x + vB * n.y + vNn * n.z); vec3 V = normalize(vView);
  vec3 gold = mix(vec3(0.24, 0.12, 0.02), vec3(0.83, 0.57, 0.19), smoothstep(0.08, 0.6, l)); gold = mix(gold, vec3(1.0, 0.86, 0.56), relief * 0.8);
  float pol = max(relief, smoothstep(0.92, 0.94, r));
  float dif = max(dot(N, uKey), 0.0); vec3 R = reflect(-V, N);
  float box = smoothstep(0.5, 0.95, dot(R, uKey)); float strip = exp(-pow((R.x * 0.75 - R.y * 0.66 + 0.1) * 3.2, 2.0)); float hor = smoothstep(-0.3, 0.35, R.y);
  vec3 env = mix(vec3(0.07, 0.035, 0.008), vec3(0.42, 0.28, 0.11), hor) + vec3(1.0, 0.9, 0.72) * (box * 1.25 + strip * 0.4);
  vec3 col = gold * (0.12 + 0.5 * dif) * ao + gold * env * mix(0.55, 1.05, pol) * ao;
  col += vec3(1.0, 0.94, 0.8) * pow(max(dot(reflect(-uKey, N), V), 0.0), 70.0) * (0.35 + 0.9 * pol);
  col += vec3(1.0, 0.86, 0.55) * wOut * max(dot(rd, normalize(vec2(-0.55, 0.8))), 0.0) * 0.55;
  float sw = p.x * 0.88 + p.y * 0.48 - uSweep; float band = exp(-sw * sw / 0.012) * 0.75 + exp(-(sw + 0.2) * (sw + 0.2) / 0.0011) * 0.9;
  col += vec3(1.0, 0.93, 0.78) * band * mix(0.5, 1.0, pol);
  col *= 1.0 + uGlow; col = mix(col, vec3(1.0, 0.88, 0.62), uFlash);
  gl_FragColor = vec4(col, uOpacity * (1.0 - smoothstep(0.994, 1.0, r))); }`;
const EDGE_VS = `varying vec3 vView; varying vec3 vN; varying float vAng; varying vec3 vTg;
void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz; vec2 d = normalize(position.xy); vAng = atan(d.y, d.x);
  vN = normalize(normalMatrix * vec3(d, 0.0)); vTg = normalize(normalMatrix * vec3(-d.y, d.x, 0.0)); gl_Position = projectionMatrix * mv; }`;
const EDGE_FS = `uniform vec3 uKey; uniform float uFlash; uniform float uOpacity; uniform float uGlow; varying vec3 vView; varying vec3 vN; varying float vAng; varying vec3 vTg;
void main(){ vec3 N = normalize(vN + vTg * sin(vAng * 180.0) * 0.35); if (!gl_FrontFacing) N = -N; vec3 V = normalize(vView); vec3 gold = vec3(0.78, 0.52, 0.17);
  float dif = max(dot(N, uKey), 0.0); vec3 R = reflect(-V, N); float box = smoothstep(0.5, 0.95, dot(R, uKey)); float hor = smoothstep(-0.3, 0.35, R.y);
  vec3 env = mix(vec3(0.06, 0.03, 0.006), vec3(0.4, 0.26, 0.1), hor) + vec3(1.0, 0.9, 0.72) * box * 1.2;
  vec3 col = (gold * (0.1 + 0.45 * dif) + gold * env * 0.9) * (1.0 + uGlow); col = mix(col, vec3(1.0, 0.88, 0.62), uFlash);
  gl_FragColor = vec4(col, uOpacity); }`;

// ---------------------------------------------------------------- the white-gold tunnel: light streaks + halo rings streaming past the lens
const STREAK_VS = `attribute vec4 aS; attribute vec4 aT; uniform float uTravel; uniform float uL; uniform float uNear; uniform float uOpacity; varying vec2 vP; varying float vA; varying float vC;
void main(){ float zr = fract(aS.z - uTravel * aS.w / uL); float z = uNear - 0.6 - zr * uL;
  vec3 c = vec3(cos(aS.x) * aS.y, sin(aS.x) * aS.y, z); vec3 tg = vec3(-sin(aS.x), cos(aS.x), 0.0);
  vec3 wp = c + tg * position.x * aT.y + vec3(0.0, 0.0, position.y * aT.x);
  vP = position.xy * 2.0; vC = aT.z;
  vA = uOpacity * (1.0 - smoothstep(uNear - 5.0, uNear - 0.6, wp.z)) * (1.0 - smoothstep(0.55, 1.0, zr)) * (0.5 + 0.5 * aT.w);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0); }`;
const STREAK_FS = `varying vec2 vP; varying float vA; varying float vC;
void main(){ float a = exp(-vP.x * vP.x * 4.0) * (1.0 - smoothstep(0.3, 1.0, abs(vP.y))); vec3 col = mix(vec3(1.0, 0.7, 0.3), vec3(1.0, 0.95, 0.84), vC);
  gl_FragColor = vec4(col * a * vA * 1.4, 1.0); }`;
const TRING_VS = `attribute vec4 aR; attribute vec4 aQ; uniform float uTravel; uniform float uL; uniform float uNear; uniform float uOpacity; varying vec2 vP; varying float vA; varying vec4 vQ;
${ROT3}
void main(){ float zr = fract(aR.x - uTravel / uL); float z = uNear - 0.6 - zr * uL;
  vec3 wp = rx(aR.z) * ry(aR.w) * vec3(position.xy * aR.y * 2.6, 0.0) + vec3(0.0, 0.0, z);
  vP = position.xy * 2.6; vQ = aQ;
  vA = uOpacity * (1.0 - smoothstep(uNear - 4.0, uNear - 0.4, z)) * (1.0 - smoothstep(0.6, 1.0, zr));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(wp, 1.0); }`;
const TRING_FS = `varying vec2 vP; varying float vA; varying vec4 vQ;
void main(){ float d = length(vP) - 1.0; float w = vQ.y; float ang = atan(vP.y, vP.x);
  float seg = 0.55 + 0.45 * sin(ang * 3.0 + vQ.x) * sin(ang * 7.0 - vQ.x * 2.0);
  float a = exp(-d * d / (w * w)) + exp(-d * d / (w * w * 40.0)) * 0.25;
  vec3 col = mix(vec3(1.0, 0.72, 0.32), vec3(1.0, 0.96, 0.86), vQ.z) * (0.4 + 0.6 * seg);
  gl_FragColor = vec4(col * a * vA, 1.0); }`;

// ---------------------------------------------------------------- gold shards: thin prisms that tumble and catch the light
const SHARD_VS = `attribute vec3 aBary; attribute vec4 aA; attribute vec4 aB; attribute vec3 aAx; attribute vec2 aSh;
uniform float uGo; uniform float uSpin; uniform float uOpacity; varying vec3 vN; varying vec3 vV; varying vec3 vBary; varying float vSeed; varying float vA;
mat3 axisAngle(vec3 ax, float ang){ ax = normalize(ax); float c = cos(ang), s = sin(ang), t = 1.0 - c;
  return mat3(t * ax.x * ax.x + c, t * ax.x * ax.y + s * ax.z, t * ax.x * ax.z - s * ax.y, t * ax.x * ax.y - s * ax.z, t * ax.y * ax.y + c, t * ax.y * ax.z + s * ax.x, t * ax.x * ax.z + s * ax.y, t * ax.y * ax.z - s * ax.x, t * ax.z * ax.z + c); }
void main(){ float r = aA.y + aA.z * uGo; vec3 c = vec3(cos(aA.x) * r, sin(aA.x) * r * 0.62, aA.w + aB.x * uGo);
  mat3 Rm = axisAngle(aAx, aB.w * 6.2831 + aB.z * uSpin);
  vec4 mv = modelViewMatrix * vec4(c + Rm * (position * vec3(aSh.x, aSh.y, 1.0) * aB.y), 1.0);
  vN = normalize(normalMatrix * (Rm * (normal / vec3(aSh.x, aSh.y, 1.0)))); vV = -mv.xyz; vBary = aBary; vSeed = aB.w; vA = uOpacity;
  gl_Position = projectionMatrix * mv; }`;
const SHARD_FS = `uniform vec3 uKey; varying vec3 vN; varying vec3 vV; varying vec3 vBary; varying float vSeed; varying float vA;
void main(){ vec3 n = normalize(vN); if (!gl_FrontFacing) n = -n; vec3 v = normalize(vV);
  float edge = 1.0 - smoothstep(0.0, 0.07, min(min(vBary.x, vBary.y), vBary.z));
  vec3 deep = vec3(0.32, 0.17, 0.03), gold = vec3(0.92, 0.66, 0.26), pale = vec3(1.0, 0.92, 0.72); float k = fract(vSeed * 13.7);
  vec3 alb = k < 0.6 ? mix(deep, gold, k / 0.6) : mix(gold, pale, (k - 0.6) / 0.4);
  vec3 r = reflect(-v, n); float box = smoothstep(0.6, 0.97, dot(r, uKey)); float strip = exp(-pow((r.x * 0.7 + r.y * 0.7 - 0.3) * 4.0, 2.0));
  float dif = max(dot(n, uKey), 0.0);
  vec3 col = alb * (0.06 + 0.5 * dif) + mix(alb, vec3(1.0), 0.3) * (box * 1.6 + strip * 0.45);
  col += vec3(1.0, 0.9, 0.7) * edge * (0.35 + 0.9 * pow(1.0 - abs(dot(n, v)), 2.0));
  col += vec3(1.0, 0.8, 0.45) * pow(1.0 - max(dot(n, v), 0.0), 3.0) * 0.5;
  gl_FragColor = vec4(col, vA); }`;

export default {
  build(ctx) {
    const { THREE, kit, tex, cfg } = ctx; const group = new THREE.Group(); const R = rng(525);
    const RB = 1.3;                                                   // radius of the ball = radius of the medallion
    const KEY = new THREE.Vector3(...KEYV).normalize(), FILL = new THREE.Vector3(...FILLV).normalize(), BACK = new THREE.Vector3(...BACKV).normalize();
    const cvs = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; };
    const mkTex = (c) => tex.make.tex(c);
    const inst = (geo, attrs) => { for (const [k, arr, n] of attrs) geo.setAttribute(k, new THREE.InstancedBufferAttribute(arr, n)); return geo; };

    // ---- canvas textures: a thin glowing halo ring, a wide halo ellipse, smoke filaments
    const haloTex = (() => { const [c, g] = cvs(1024); g.translate(512, 512); g.strokeStyle = '#fff'; g.shadowColor = 'rgba(255,255,255,0.9)'; g.shadowBlur = 26; g.lineWidth = 7; for (let i = 0; i < 3; i++) { g.beginPath(); g.arc(0, 0, 430, 0, TAU); g.stroke(); } g.shadowBlur = 0; g.lineWidth = 2; g.globalAlpha = 0.5; g.beginPath(); g.arc(0, 0, 452, 0, TAU); g.stroke(); return mkTex(c); })();   // ring radius = 0.42 × plate size
    const ellTex = (() => { const [c, g] = cvs(2048, 640); g.translate(1024, 320); g.strokeStyle = '#fff'; g.shadowColor = 'rgba(255,255,255,0.85)'; g.shadowBlur = 18; g.lineWidth = 4; for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(0, 0, 980, 280, 0, 0, TAU); g.stroke(); } g.shadowBlur = 0; g.globalAlpha = 0.45; g.lineWidth = 2; g.beginPath(); g.ellipse(0, 0, 1010, 300, 0, 0.25, TAU - 0.9); g.stroke(); return mkTex(c); })();
    const wispTex = (() => { const S = 512; const [c, g] = cvs(S); const W = rng(77); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      for (let pass = 0; pass < 2; pass++) { g.filter = pass ? 'none' : 'blur(3px)';
        for (let i = 0; i < 46; i++) { let x = S * W.range(0.2, 0.8), y = S * W.range(0.36, 0.64), a = W.range(-0.5, 0.5) + (W() < 0.5 ? 0 : Math.PI); let curl = W.range(-0.07, 0.07);
          g.strokeStyle = `rgba(255,255,255,${pass ? W.range(0.05, 0.16) : W.range(0.08, 0.2)})`; g.lineWidth = pass ? W.range(0.6, 1.8) : W.range(3, 9); g.beginPath(); g.moveTo(x, y);
          const n = Math.floor(W.range(40, 110)); for (let k = 0; k < n; k++) { a += curl + Math.sin(k * 0.11 + i * 1.7) * 0.045; curl *= 1.012; x += Math.cos(a) * 2.2; y += Math.sin(a) * 2.2; g.lineTo(x, y); } g.stroke(); } }
      g.filter = 'none'; g.globalCompositeOperation = 'destination-in'; const gr = g.createRadialGradient(S / 2, S / 2, S * 0.12, S / 2, S / 2, S * 0.5); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, S, S); return mkTex(c); })();

    // ---- warm starry space
    const nebU = { tNoise: { value: tex.noise }, uTime: { value: 0 }, uAmt: { value: 1 }, uCore: { value: 1 } };
    const neb = new THREE.Mesh(new THREE.PlaneGeometry(110, 65), new THREE.ShaderMaterial({ vertexShader: NEB_VS, fragmentShader: NEB_FS, uniforms: nebU, depthWrite: false })); neb.position.z = -34; neb.renderOrder = -10; group.add(neb);
    const mkStars = (n, seed, big) => { const S = rng(seed); const pos = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n), col = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const z = -S.range(16, 50); pos.set([S.range(-1, 1) * 0.72 * -z, S.range(-1, 1) * 0.42 * -z, z], i * 3); sz[i] = big ? S.range(14, 30) : lerp(1.6, 4.6, Math.pow(S(), 3)); ph[i] = S(); const w = S(); col.set(w < 0.5 ? [1, 0.86, 0.6] : w < 0.85 ? [1, 0.95, 0.85] : [1, 0.74, 0.42], i * 3); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSize', new THREE.BufferAttribute(sz, 1)); geo.setAttribute('aPh', new THREE.BufferAttribute(ph, 1)); geo.setAttribute('aCol', new THREE.BufferAttribute(col, 3));
      const u = { uView: kit.lens.view, uPx: kit.lens.px, uTime: { value: 0 }, uOpacity: { value: 1 }, uGlint: { value: big ? 1 : 0 } };
      const m = new THREE.Points(geo, new THREE.ShaderMaterial({ vertexShader: STAR_VS, fragmentShader: STAR_FS, uniforms: u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); m.frustumCulled = false; m.u = u; m.renderOrder = -9; group.add(m); return m; };
    const stars = mkStars(900, 526, false), glints = mkStars(26, 527, true);
    const pool = kit.plate(tex.glow, 8, 8, { color: '#ffb84a', additive: true, opacity: 0 }); pool.position.set(0, 0, -3); group.add(pool);
    const dust = kit.dust({ count: 240, box: [15, 9, 5], center: [0, 0, -3.2], size: 0.03, seed: 528, color: '#ffe0a0', opacity: 0.75 }); group.add(dust);   // always behind the hero plane
    const fgPts = []; const FB = rng(529); for (let i = 0; i < 14; i++) { const zz = FB.range(1.8, 3.4), dd = 5.4 - zz, side = i % 2 ? 1 : -1; fgPts.push([side * FB.range(0.8, 1.05) * 0.647 * dd, FB.range(-1, 1) * 0.364 * dd, zz, FB.range(0.02, 0.06)]); }
    const fgB = kit.bokeh(fgPts, { color: '#ffc978', gain: 0.8, floor: 0.16 }); group.add(fgB);   // soft discs near the lens, frame edges only

    // ---- the ball: a voxel shell of bevelled gold blocks (some are pure light)
    const STEP = 0.072; const homes = []; const nG = Math.ceil(RB / STEP) + 2; const VR = rng(530);
    for (let i = -nG; i <= nG; i++) for (let j = -nG; j <= nG; j++) for (let k = -nG; k <= nG; k++) {
      const x = i * STEP, y = j * STEP, z = k * STEP; if (Math.abs(Math.hypot(x, y, z) - RB) > STEP * 0.55 || VR() < 0.1) continue;
      const h = [x, y, z]; const u = VR(); if (u < 0.16) { const ax = Math.abs(x) >= Math.abs(y) && Math.abs(x) >= Math.abs(z) ? 0 : Math.abs(y) >= Math.abs(z) ? 1 : 2; h[ax] += Math.sign(h[ax]) * STEP * (u < 0.04 ? 2 : 1); }
      homes.push(h); }
    const NB = homes.length; const aHome = new Float32Array(NB * 3), aSeed = new Float32Array(NB * 4), aRot = new Float32Array(NB * 3), aEmit = new Float32Array(NB);
    homes.forEach((h, i) => { aHome.set(h, i * 3); aSeed.set([sat(0.62 * VR() + 0.38 * (0.5 + 0.5 * h[1] / RB)), STEP * VR.range(0.74, 0.93), VR(), VR() * TAU], i * 4); aRot.set([VR.range(-3, 3), VR.range(-3, 3), VR.range(-3, 3)], i * 3); aEmit[i] = VR() < 0.075 ? VR.range(0.55, 1) : 0; });
    const cubeU = { uK: { value: 0 }, uMorph: { value: 0 }, uSpin: { value: 0 }, uTilt: { value: 0.2 }, uTime: { value: 0 }, uReveal: { value: 0 }, uR: { value: RB }, uHot: { value: 1 }, tEmb: { value: tex.emblem }, uEmb: { value: 0 }, uGain: { value: 1 }, uKey: { value: KEY }, uFill: { value: FILL }, uBack: { value: BACK } };
    const cubes = new THREE.InstancedMesh(inst(new THREE.BoxGeometry(1, 1, 1), [['aHome', aHome, 3], ['aSeed', aSeed, 4], ['aRot', aRot, 3], ['aEmit', aEmit, 1]]), new THREE.ShaderMaterial({ vertexShader: CUBE_VS, fragmentShader: CUBE_FS, uniforms: cubeU }), NB); cubes.frustumCulled = false;
    const ball = new THREE.Group(); ball.add(cubes); group.add(ball);
    const coreHot = kit.plate(tex.core, 3.2, 3.2, { color: '#fff1d6', additive: true, opacity: 0 }); ball.add(coreHot);
    const coreIn = kit.plate(tex.glow, 2.6, 2.6, { color: '#ffb347', additive: true, opacity: 0 }); ball.add(coreIn);
    const wisps = []; for (let i = 0; i < 12; i++) { const s = R.range(1.7, 2.6); const m = kit.plate(wispTex, s * 1.5, s, { color: i % 3 ? '#fff0d4' : '#ffd590', additive: true, opacity: 0 }); m.userData = { a: (i / 12) * TAU + R.range(-0.25, 0.25), r: R.range(1.3, 1.62), sp: R.range(0.006, 0.016) * (i % 2 ? 1 : -1), z: R.range(-0.7, 0.45), o: R.range(0.28, 0.5), ph: R() * 6 }; ball.add(m); wisps.push(m); }

    // ---- the medallion: front + back faces and a reeded edge (real thickness), halo ring, dial, beams
    const TH = 0.1; const coinU = { tMap: { value: tex.emblem }, uSweep: { value: 9 }, uFlash: { value: 0 }, uOpacity: { value: 0 }, uReveal: { value: 0 }, uGlow: { value: 0 }, uKey: { value: KEY } };
    const coinMat = new THREE.ShaderMaterial({ vertexShader: COIN_VS, fragmentShader: COIN_FS, uniforms: coinU, transparent: true });
    const coin = new THREE.Group(); group.add(coin);
    const face = new THREE.Mesh(new THREE.CircleGeometry(RB, 160), coinMat); face.position.z = TH / 2; coin.add(face);
    const back = new THREE.Mesh(new THREE.CircleGeometry(RB, 160), coinMat); back.rotation.y = Math.PI; back.position.z = -TH / 2; coin.add(back);
    const edgeGeo = new THREE.CylinderGeometry(RB, RB, TH, 200, 1, true); edgeGeo.rotateX(Math.PI / 2);
    const edge = new THREE.Mesh(edgeGeo, new THREE.ShaderMaterial({ vertexShader: EDGE_VS, fragmentShader: EDGE_FS, uniforms: { uKey: coinU.uKey, uFlash: coinU.uFlash, uOpacity: coinU.uOpacity, uGlow: coinU.uGlow }, transparent: true, side: THREE.DoubleSide })); coin.add(edge);
    const halo = kit.plate(haloTex, 1, 1, { color: '#ffcf70', additive: true, opacity: 0 }); group.add(halo);
    const coinGlow = kit.plate(tex.glow, 7.5, 7.5, { color: '#ffae3c', additive: true, opacity: 0 }); coinGlow.position.z = -1.2; group.add(coinGlow);
    const orn = kit.ornaments({ center: [0, 0, -0.9], radius: 2.05, color: '#f0c46a', opacity: 0.3, seed: 531 }); group.add(orn.group);
    const beams = kit.beams({ center: [0, 0, -2.4], count: 12, len: 11, color: '#f6d389', opacity: 0.075, seed: 532 }); group.add(beams.group);
    const shock = kit.ribbon(kit.arc(1, 0, 360, 80, { center: [0, 0, -0.2] }), { width: 0.045, gain: 1.5, taper: 3, color: '#ffe2a6' }); group.add(shock.mesh);
    const fx = kit.impactFX([{ rf: 553, at: [0, 0, -0.8], size: 2.3, color: '#ffd07a', sparks: 20 }, { rf: 569.4, at: [0, 0, -0.5], size: 1.25, color: '#ffc861', sparks: 16 }, { rf: 598, at: [0, 0, -0.9], size: 1.3, color: '#ffd889', sparks: 0 }]); group.add(fx.group);
    const ctaHit = fx.group.children[2];

    // ---- the tunnel
    const TL = 60, NT = 240, NR = 16; const TR = rng(533); const aS = new Float32Array(NT * 4), aT = new Float32Array(NT * 4), aRg = new Float32Array(NR * 4), aQg = new Float32Array(NR * 4);
    for (let i = 0; i < NT; i++) { aS.set([TR() * TAU, TR.range(1.6, 3.6), TR(), TR.range(0.75, 1.3)], i * 4); aT.set([TR.range(2.5, 8), TR.range(0.02, 0.07), TR(), TR()], i * 4); }
    for (let i = 0; i < NR; i++) { aRg.set([i / NR + TR.range(-0.01, 0.01), TR.range(2.0, 2.6), TR.range(-0.12, 0.12), TR.range(-0.12, 0.12)], i * 4); aQg.set([TR() * TAU, TR.range(0.012, 0.03), TR(), 0], i * 4); }
    const tunU = { uTravel: { value: 0 }, uL: { value: TL }, uNear: { value: 5 }, uOpacity: { value: 0 } };
    const addMat = (vs, fs) => new THREE.ShaderMaterial({ vertexShader: vs, fragmentShader: fs, uniforms: tunU, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const streaks = new THREE.InstancedMesh(inst(new THREE.PlaneGeometry(1, 1), [['aS', aS, 4], ['aT', aT, 4]]), addMat(STREAK_VS, STREAK_FS), NT); streaks.frustumCulled = false; group.add(streaks);
    const tRings = new THREE.InstancedMesh(inst(new THREE.PlaneGeometry(1, 1), [['aR', aRg, 4], ['aQ', aQg, 4]]), addMat(TRING_VS, TRING_FS), NR); tRings.frustumCulled = false; group.add(tRings);
    const tunEnd = kit.plate(tex.glow, 12, 12, { color: '#fff0cf', additive: true, opacity: 0 }); group.add(tunEnd);

    // ---- the call to action (the config's text) as chunky 3D letters: ivory face, gold-leaf bevel, bronze sides
    const ctaText = String(cfg.cta || '').toUpperCase().trim();
    const cw = ctaText ? kit.word(ctaText, { size: 0.6, depth: 0.42, style: CTA_STYLE, seed: 613 }) : null;
    let ctaPlate = null; if (cw) { cw.set('uGrit', 0.025); cw.set('uFaceAmt', 0.05); cw.set('uLight', new THREE.Vector3(-0.4, 0.8, 0.5)); group.add(cw.group); } else { ctaPlate = kit.plate(tex.cta, 1, 1, {}); group.add(ctaPlate); }
    const W = cw ? cw.width : 0.6 * 1.2 * tex.ctaAspect, HH = 0.6;
    const DC = Math.max(W / (1.294 * 0.6), HH / (0.728 * 0.16));          // camera distance: the CTA spans ≤ 60 % of the frame width
    const ctaShade = kit.plate(tex.glow, W * 1.5, HH * 3.4, { color: '#000000', opacity: 0 }); ctaShade.position.z = -0.7; group.add(ctaShade);
    const ctaPool = kit.plate(tex.glow, W * 2.4, W * 1.3, { color: '#ffb54d', additive: true, opacity: 0 }); ctaPool.position.z = -3.2; group.add(ctaPool);
    const ctaRing = kit.plate(ellTex, W * 1.45, W * 1.45 * 640 / 2048, { color: '#ffd27a', additive: true, opacity: 0 }); ctaRing.position.z = -0.9; group.add(ctaRing);
    const ctaBeams = kit.beams({ center: [0, 0, -3.0], count: 12, len: 14, color: '#f6d389', opacity: 0.06, seed: 534 }); group.add(ctaBeams.group);

    // ---- camera
    const CAM = [
      { rf: 525, p: [0.3, -0.15, 6.5], t: [0.1, 0.03, 0], roll: -2.2 },
      { rf: 567, p: [-0.02, 0.02, 5.05], t: [0, 0.01, 0], roll: 1.0, e: 'out2' },
      { rf: 585, p: [0.0, 0.0, 4.92], t: [0, 0, 0], roll: 0.2, e: 'lin' },
      { rf: 594, p: [0.0, 0.06, DC * 1.13], t: [0, 0.02, 0], roll: 1.4, e: 'io2' },
      { rf: 600, p: [0.0, 0.02, DC * 1.02], t: [0, 0, 0], roll: 0.5, e: 'out3' },
      { rf: 612, p: [0.0, 0.0, DC * 0.97], t: [0, 0, 0], roll: -0.4, e: 'lin' },
      { rf: 617, p: [0.0, 0.0, DC * 0.84], t: [0, 0, 0], roll: -1.0, e: 'in2' },
    ];

    // ---- shards around the CTA: every path is checked at build time so no shard ever enters the text's box during its hold
    const goAt = (rf) => (rf < 594 ? 0 : 1.6 * (1 - Math.exp(-(rf - 594) / 1.6)) + 0.045 * (rf - 594)) + 3.2 * ease.in2(prog(rf, 613, 617));
    const hw = (W / 2) * 1.08 + 0.35 * HH, hh = HH * 0.55 + 0.4 * HH;
    const checks = [598, 600, 603, 606, 609, 611].map((f) => [goAt(f), kit.cam(CAM, f).pos.z]);
    const NSH = 56; const SH = rng(535); const shA = new Float32Array(NSH * 4), shB = new Float32Array(NSH * 4), shX = new Float32Array(NSH * 3), shS = new Float32Array(NSH * 2);
    for (let i = 0; i < NSH; i++) {
      const a = (i / NSH) * TAU + SH.range(-0.3, 0.3), sz = lerp(0.1, 0.42, Math.pow(SH(), 1.5)), vr = SH.range(0.5, 1.6), z0 = SH.range(-3.4, -0.6); const vz = SH.range(0.1, 0.65) * Math.min(1, (-0.35 - z0) / (0.65 * goAt(598)));
      const ok = (r0) => checks.every(([go, Dz]) => { const r = r0 + vr * go, z = z0 + vz * go, k = Dz / (Dz - z), m = sz * 0.9 * k; return Math.abs(Math.cos(a) * r * k) > hw + m || Math.abs(Math.sin(a) * r * 0.62 * k) > hh + m; });
      let r0 = SH.range(0.05, 0.5), guard = 0; while (!ok(r0) && guard++ < 400) r0 += 0.04;
      shA.set([a, r0, vr, z0], i * 4); shB.set([vz, sz, SH.range(0.04, 0.12) * SH.sign(), SH()], i * 4); shX.set([SH.range(-1, 1), SH.range(-1, 1), SH.range(-1, 1)], i * 3); shS.set([SH.range(0.7, 1.4), SH.range(0.7, 1.4)], i * 2);
    }
    const shardGeo = (() => { const A = [0, 0.62], B = [-0.44, -0.36], C = [0.5, -0.22], h = 0.03, Z = [0, 0, 0]; const P = [], Nn = [], Bc = []; const f = (p, z) => [p[0], p[1], z];
      const tri = (p0, p1, p2, n, b0, b1, b2) => { P.push(...p0, ...p1, ...p2); Nn.push(...n, ...n, ...n); Bc.push(...b0, ...b1, ...b2); };
      tri(f(A, h), f(B, h), f(C, h), [0, 0, 1], [1, 0, 0], [0, 1, 0], [0, 0, 1]); tri(f(A, -h), f(C, -h), f(B, -h), [0, 0, -1], [1, 0, 0], [0, 0, 1], [0, 1, 0]);
      [[A, B], [B, C], [C, A]].forEach(([p, q]) => { const ex = q[0] - p[0], ey = q[1] - p[1], l = Math.hypot(ex, ey); const n = [ey / l, -ex / l, 0]; tri(f(p, h), f(p, -h), f(q, -h), n, Z, Z, Z); tri(f(p, h), f(q, -h), f(q, h), n, Z, Z, Z); });
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3)); g.setAttribute('aBary', new THREE.Float32BufferAttribute(Bc, 3)); return g; })();
    const shU = { uGo: { value: 0 }, uSpin: { value: 0 }, uOpacity: { value: 0 }, uKey: { value: KEY } };
    const shards = new THREE.InstancedMesh(inst(shardGeo, [['aA', shA, 4], ['aB', shB, 4], ['aAx', shX, 3], ['aSh', shS, 2]]), new THREE.ShaderMaterial({ vertexShader: SHARD_VS, fragmentShader: SHARD_FS, uniforms: shU, transparent: true, side: THREE.DoubleSide }), NSH); shards.frustumCulled = false; group.add(shards);

    return { group, update(rf) {
      const T = rf - 525;
      const c = kit.cam(CAM, rf); c.pos.add(kit.shake(rf, 0.012, 0.3, 41));
      if (rf >= 617) { group.visible = false; return { cam: { ...c, aperture: 0 }, clear: 0x000000, post: { fade: 1, mark: 0, dust: 0, grain: 0, vignette: 0 } }; }
      group.visible = true;
      // ---- clocks
      const clearK = prog(rf, 524.8, 530.6, 'io2'), gather = prog(rf, 525.6, 540), appear = prog(rf, 526.4, 533, 'out3');
      const morph = prog(rf, 545, 551.6, 'io2'), emb = prog(rf, 545.6, 550.4, 'io2'), reveal = prog(rf, 548.6, 553, 'io2'), coinOn = prog(rf, 548.4, 553);
      const pop = prog(rf, 566.5, 570.5, 'io3'), dark = prog(rf, 566.5, 570), rush = prog(rf, 584.2, 586.8, 'in2'), gone = prog(rf, 585.8, 587.2);
      const tunOn = prog(rf, 585.9, 587.2) * (1 - prog(rf, 591.6, 593.8, 'io2')), ctaOn = rf >= 593.6;
      const cb = prog(rf, 593.8, 598, 'out2') * (1 - prog(rf, 613.5, 616.5));          // the CTA's backdrop
      const xk = prog(rf, 612.6, 615.6, 'in2');                                         // the letters burst apart

      // ---- space
      nebU.uTime.value = rf; nebU.uAmt.value = rf < 585 ? lerp(1, 0.12, dark) : rf < 593.6 ? 0.12 * (1 - tunOn) : 0.42 * cb;
      nebU.uCore.value = rf < 593.6 ? 1 : 0.5;
      const starK = rf < 585 ? lerp(1, 0.4, dark) : rf < 593.6 ? 0.4 * (1 - tunOn) : 0.6 * cb;
      stars.u.uTime.value = rf; stars.u.uOpacity.value = starK; glints.u.uTime.value = rf; glints.u.uOpacity.value = starK * 0.85;
      pool.material.opacity = 0.2 * appear * (1 - dark);
      dust.drift(T, [0.002, -0.01, 0], 0.06); dust.material.opacity = 0.75 * (rf < 585 ? lerp(1, 0.5, dark) : rf < 593.6 ? 0 : 0.8 * cb);
      fgB.setOpacity(rf < 585 ? lerp(1, 0.35, dark) : rf < 593.6 ? 0 : cb);

      // ---- the ball of golden light
      ball.visible = rf >= 525.4 && rf < 553.5;
      if (ball.visible) {
        cubeU.uK.value = gather; cubeU.uMorph.value = morph; cubeU.uSpin.value = 0.35 + T * 0.034; cubeU.uTilt.value = 0.2 * (1 - morph); cubeU.uTime.value = rf; cubeU.uReveal.value = reveal;
        cubeU.uHot.value = 1 - prog(rf, 531, 537); cubeU.uEmb.value = emb; cubeU.uGain.value = 1 + 0.08 * pulse(rf, 535, 6) + 0.08 * pulse(rf, 540, 6);
        ball.position.set(lerp(0.12, 0, morph), lerp(0.06, 0, morph), 0);
        coreHot.material.opacity = 0.9 * (1 - prog(rf, 527, 536, 'out2')) * prog(rf, 525.4, 526.6);
        coreIn.material.opacity = 0.28 * appear * (1 - morph);
        wisps.forEach((m) => { const u = m.userData; const a = u.a + T * u.sp, g = lerp(0.35, 1, appear); m.position.set(Math.cos(a) * u.r * g, Math.sin(a) * u.r * g * 0.92, u.z); m.rotation.z = a + Math.PI / 2 + 0.25 * Math.sin(rf * 0.05 + u.ph); m.material.opacity = u.o * appear * (1 - prog(rf, 544, 550)) * (0.75 + 0.25 * Math.sin(rf * 0.21 + u.ph)); });
      }

      // ---- the medallion
      const cs = lerp(1, 0.42, pop) * (1 - 0.07 * prog(rf, 571, 584)) * (1 + 0.05 * pulse(rf, 577, 5) + 0.05 * pulse(rf, 581, 5)) * (1 + 2.4 * rush);
      coin.visible = coinOn > 0 && gone < 1; coin.scale.setScalar(cs);
      coin.rotation.set(0.06 * Math.sin(rf * 0.05 + 0.6) - 0.04, 0.17 * Math.sin((rf - 549) * 0.075), 0);
      coinU.uOpacity.value = coinOn * (1 - gone); coinU.uReveal.value = reveal; coinU.uSweep.value = lerp(1.45, -1.45, prog(rf, 556.5, 567, 'io2'));
      coinU.uFlash.value = sat(0.5 * pulse(rf, 569, 3, 2) + 0.12 * pop + 0.18 * pulse(rf, 577, 4) + 0.18 * pulse(rf, 581, 4) + 0.6 * rush);
      coinU.uGlow.value = 0.07 * pulse(rf, 557.8, 6) + 0.07 * pulse(rf, 562.9, 6);
      const hk = coinOn * (1 - gone); halo.visible = coin.visible; halo.scale.setScalar((RB * 1.13 * cs) / 0.42); halo.position.z = -0.35 * cs;
      halo.material.opacity = hk * (0.5 + 0.1 * Math.sin(rf * 0.2) + 0.35 * pulse(rf, 569.4, 6) + 0.3 * pulse(rf, 577, 5) + 0.3 * pulse(rf, 581, 5));
      coinGlow.scale.setScalar(cs * 7.5); coinGlow.material.opacity = hk * lerp(0.24, 0.16, dark);
      orn.group.scale.setScalar(cs); orn.update(rf, coinOn * (1 - pop)); beams.update(rf, coinOn * (1 - dark));
      const sk = prog(rf, 569.4, 577, 'out3'); shock.set(0, 1, 1 - sk); shock.mesh.scale.setScalar(lerp(0.65, 4.0, sk)); shock.mesh.visible = rf >= 569.4 && rf < 577;
      fx.update(rf); ctaHit.children.forEach((m) => { if (m.isSprite) m.visible = false; });

      // ---- the tunnel
      streaks.visible = tRings.visible = tunOn > 0.001; tunU.uOpacity.value = tunOn; tunU.uNear.value = c.pos.z;
      tunU.uTravel.value = track([[585.6, 0], [590.4, 42, 'out2'], [594, 54, 'out3']], rf);
      tunEnd.position.set(0, 0, c.pos.z - 46); tunEnd.material.opacity = 0.45 * tunOn;

      // ---- the call to action
      if (cw) { cw.group.visible = ctaOn;
        if (ctaOn) {
          for (let i = 0; i < cw.n; i++) { const L = cw.letters[i]; const t = (rf - (594 + i * 0.17)) / 2.6; if (t <= 0) { cw.pose(i, { o: 0 }); continue; }
            const e = ease.outBackSoft(sat(t)), k = 1 - e, sg = L.rnd < 0.5 ? -1 : 1, dx = L.home.x / (W / 2);
            cw.pose(i, { x: xk * dx * 1.4, y: xk * (L.rnd2 - 0.5) * 1.2 - k * 0.15, z: -k * 3.2 + xk * 2.6, ry: k * 0.55 * sg + xk * sg * 0.8, rz: xk * (L.rnd - 0.5) * 1.2, s: lerp(0.3, 1, e) * (1 + xk * 0.4), o: sat(t * 3) * (1 - sat(xk * 1.8)) }); }
          cw.group.rotation.set(-0.1 + 0.015 * Math.sin(rf * 0.06), 0.16 - 0.006 * (rf - 598), 0.012);
          cw.gain(1 + 0.06 * pulse(rf, 603.9, 6) + 0.06 * pulse(rf, 608.1, 6) + 0.25 * pulse(rf, 613, 3)); cw.sweep(prog(rf, 601.5, 609.5, 'io2'), 0.45);
        } }
      if (ctaPlate) { const s = track([[594, 0.3], [598, 1, 'out3'], [612, 1.06], [616, 1.5, 'in2']], rf) * W; ctaPlate.visible = ctaOn; ctaPlate.scale.set(s, s / tex.ctaAspect, 1); ctaPlate.material.opacity = prog(rf, 594, 596) * (1 - xk); }
      ctaShade.material.opacity = 0.55 * cb; ctaPool.material.opacity = 0.2 * cb * (1 + 0.25 * pulse(rf, 598, 8));
      ctaRing.material.opacity = 0.42 * cb * (0.85 + 0.15 * Math.sin(rf * 0.18)); ctaRing.scale.set(W * 1.45 * lerp(0.86, 1, prog(rf, 594, 600, 'out3')), W * 1.45 * 640 / 2048 * lerp(0.86, 1, prog(rf, 594, 600, 'out3')), 1);
      ctaBeams.update(rf, cb);
      shards.visible = rf >= 594 && rf < 617; shU.uGo.value = goAt(rf); shU.uSpin.value = rf - 594; shU.uOpacity.value = prog(rf, 594, 595.2) * (1 - prog(rf, 615.4, 616.8));

      // ---- lens
      const fo = rf < 553 ? lerp(0.9, 0.05, prog(rf, 543, 551, 'io2')) : 0.05;
      const cam = { pos: c.pos, tgt: c.tgt, roll: c.roll, fov: 40, aperture: rf < 585.5 ? 0.045 : rf < 593.5 ? 0 : 0.04, focus: c.pos.distanceTo(c.tgt) - fo };

      // ---- the grade
      const post = { exposure: 1, saturation: 1.06, contrast: 1.1, bloom: 0.42, bloomThreshold: 0.86, bloomTint: [1, 0.86, 0.62], vignette: 0.86, chroma: 0.0014, sharpen: 0.34, dust: 0.2, grain: 0.035, streak: 0.42,
        smoke: 1 - clearK, smokeColor: SMOKE_IN.map((v, i) => lerp(v, SMOKE[i], prog(rf, 525, 528.5))),
        bars: track([[525, 0], [528.5, 0.1, 'out2'], [544, 0.1], [552.5, 0, 'io2']], rf), barsAlpha: 1, barsGlow: 0.3, barsGlowColor: [1, 0.82, 0.5],
        leak: 0.08, leakColor: [1, 0.7, 0.35], leakPos: [0.1, 1.0], leakSize: 0.9, rays: 0, raysCenter: [0.5, 0.5] };
      if (rf < 566.5) {
        post.rays = 0.16 * appear * (1 - coinOn) + 0.24 * coinOn;
      } else if (rf < 585) {
        const b = pulse(rf, 569.4, 6) + 0.7 * pulse(rf, 577, 5) + 0.7 * pulse(rf, 581, 5); const split = prog(rf, 582.6, 584.8);
        Object.assign(post, { rays: 0.2 + 0.3 * b, vignette: 0.92, rgbSplit: 0.5 * split, chroma: 0.0014 + 0.004 * split, zoomBlur: 0.9 * rush, leak: 0.05,
          ovlA: rf >= 569 && rf < 578 ? { clip: 'fire_ring', t: 0.2 + (rf - 569.4) / 30 * 2.6, amt: 0.34 * (1 - prog(rf, 572.5, 578)), mono: true, tint: [1, 0.78, 0.42], scale: 1.25 } : null,
          ovlB: rf < 578 ? { clip: 'smoke_puff', t: 0.3 + (rf - 566) / 30 * 1.6, amt: 0.32 * (1 - prog(rf, 572, 578)), tint: [1, 0.86, 0.62], flipX: true, scale: 1.3, ox: 0.32 } : null });
      } else if (rf < 593.6) {
        const fl = pulse(rf, 586.8, 3.2, 1.4);
        Object.assign(post, { rays: 0.15 * tunOn, bloom: 0.5, streak: 0.7, zoomBlur: Math.max(0.9 * rush * (1 - gone * 0.5), 0.55 * tunOn * (1 - prog(rf, 589, 593))), chroma: 0.004 * tunOn + 0.002, flash: 0.32 * fl, flashColor: [1, 0.93, 0.78], vignette: 0.8, leak: 0,
          ovlA: rf < 588.6 ? { clip: 'flash_glitch', t: (rf - 585.8) / 30, amt: 0.45, mono: true, tint: [1, 0.86, 0.6] } : null });
      } else {
        const fl = pulse(rf, 613, 3, 0.8);
        Object.assign(post, { rays: 0.14 * cb + 0.25 * fl, vignette: 0.9, chroma: 0.0016 + 0.004 * xk, zoomBlur: 0.5 * xk, flash: 0.28 * fl, flashColor: [1, 0.9, 0.7], fade: prog(rf, 614.8, 617), leak: 0.06 * cb, streak: 0.5 });
      }
      return { cam, clear: 0x000000, post };
    } };
  },
};
