// SECTION B (OFTEN, heavenly) — "neon red night"  (reference frames 21–48)
//   rf 21–24   out of section A's red fog: NIGHT comes forward out of the dark letter by letter, each letter igniting like
//              a neon tube; the crimson field starts to ripple outward from behind it (impact at rf 24)
//   rf 24–29   HOLD — NIGHT white-hot on the dark rippling crimson field: a pool of neon light and soft red shafts behind
//              it, fine red dust, a brighter ring running out across the field on the beat; slow push-in on a small arc
//   rf 29–33   NIGHT flickers out and tips back into the dark while NEON TUBES (white-hot cores, red glow) sweep through
//              the frame — none of them is drawn before NIGHT has started to leave
//   rf 31–36.7 the last tube runs along the bottom of the frame and curls round into a neon-red halo; GLOWS spins
//              forward out of depth inside it; small gold sparks fly off the halo's head as it closes (impact at 36.5)
//   rf 36.5–42 HOLD — GLOWS centred in its halo, gold glints, a light sweep; slow push-in
//   rf 42–48   the camera rolls and pushes through the halo; GLOWS melts into light before any frame edge can cut it
//              (zoom blur + accelerating roll = the hand-off into section C)
// Layers, back to front: ripple field · night bokeh · light shafts · pool glow · impact FX · halo · WORD · tubes ·
// dust (never in front of a word) · soft discs and dark smudges at the frame edges, close to the lens.
import { ease, prog, sat, lerp, track, pulse, clamp, rng, wobble, TAU, DEG } from '../util.js';

const VS_UV = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Dark rippling crimson field: a satin / liquid surface. Rings around the point behind the word, bent by slow noise, turned
// into a height field and LIT — a dim key light from the upper left and the word's own neon light from the centre — so the
// ripples read as soft folds with sheen on one flank, not as contour lines. The ripples spread outward from the centre
// (uFront). uMatch blends to the look section A hands over (its soft red radial gradient).
const FS_FIELD = /* glsl */ `
uniform sampler2D tNoise; uniform float uT; uniform vec2 uSize; uniform vec2 uC; uniform float uRing; uniform float uSlope;
uniform float uFront; uniform float uAmp; uniform float uPool; uniform float uPoolR; uniform float uGain; uniform float uFall;
uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uHi; uniform vec3 uNeon;
uniform float uPulse; uniform float uPulseR;
uniform float uMatch; uniform float uMatchK; uniform float uMatchT;
varying vec2 vUv;
void main(){
  vec2 p = (vUv - 0.5) * uSize; vec2 d = p - uC; float r = length(d); float ang = atan(d.y, d.x);
  // organic, seamless bending of the rings (whole-number angular harmonics: no seam at +-pi, no texel kinks)
  float wob = 0.62 * sin(2.0 * ang + 0.7 + 0.35 * sin(r * 0.37 + uT * 0.05)) + 0.42 * sin(3.0 * ang - 1.2 + r * 0.23) + 0.26 * sin(5.0 * ang + 2.1 - r * 0.31) + 0.15 * sin(7.0 * ang + 0.4 + r * 0.5);
  float rr = max(r + wob * 0.55 * smoothstep(0.0, 3.5, r), 0.0);
  float ph = 6.2832 * pow(rr / uRing, 0.85) - uT;
  float dph = 5.34 * pow(max(rr, 0.05) / uRing, -0.15) / uRing;
  float env = uAmp * smoothstep(uFront, uFront - 3.5, r) * smoothstep(0.2, 1.6, r);
  // fine second ripple riding on the big one (detail), and the slope of the surface
  float ph2 = ph * 2.03 + 1.7 + (0.8 * sin(4.0 * ang + r * 0.6) + 0.5 * sin(9.0 * ang - 0.3)) * smoothstep(1.0, 4.5, r);
  float slope = (cos(ph) * dph + 0.22 * cos(ph2) * dph * 2.03) * env * uSlope;
  vec2 g = (d / max(r, 1e-3)) * slope;
  vec3 N = normalize(vec3(-g, 1.0));
  vec3 Lk = normalize(vec3(-0.55, 0.7, 0.5));
  vec3 Lp = normalize(vec3(-d, 4.5));
  float fall = exp(-r / uFall);
  float dk = max(dot(N, Lk), 0.0), dp = max(dot(N, Lp), 0.0);
  float spk = pow(max(dot(reflect(-Lk, N), vec3(0.0, 0.0, 1.0)), 0.0), 16.0);
  float spp = pow(max(dot(reflect(-Lp, N), vec3(0.0, 0.0, 1.0)), 0.0), 10.0);
  float aa = abs(ang);                                     // mirrored angle: seamless silk lookups
  float silk = texture2D(tNoise, vec2(aa * 1.1 + 0.5, rr * 0.12)).r;
  float silk2 = texture2D(tNoise, vec2(aa * 3.5 + 0.1, rr * 0.4)).g;
  vec3 col = uDeep + uMid * (0.38 * dk * (0.3 + 0.7 * fall) + 0.85 * dp * fall);
  col += uHi * (0.28 * spk * (0.3 + 0.7 * fall) + 0.75 * spp * fall * fall) * (0.6 + 0.4 * env) * (0.7 + 0.6 * silk);
  col *= 0.82 + 0.22 * silk + 0.12 * silk2;
  col += uNeon * uPool * exp(-(d.x * d.x * 0.42 + d.y * d.y) / (uPoolR * uPoolR));
  col += uHi * uPulse * exp(-pow((r - uPulseR) / 0.8, 2.0)) * (0.35 + 0.65 * dp) * (0.25 + fall);
  col *= uGain;
  float rp = r * uMatchK; float w = smoothstep(0.15, 0.85, sin(rp * 30.0 - uMatchT * 3.0) * 0.5 + 0.5);
  vec3 a = mix(vec3(0.043, 0.0, 0.004), vec3(0.29, 0.039, 0.039), smoothstep(0.75, 0.0, rp));
  a = mix(a, vec3(0.557, 0.122, 0.106), w * 0.42 * smoothstep(1.0, 0.05, rp));
  gl_FragColor = vec4(mix(col, a, uMatch), 1.0);
}`;

// Neon tube: a camera-facing strip along a curve (built once), trimmed in the shader (uA..uB along the arc length).
// Cross-section: white-hot filament, saturated glass body, red light spilling around it. Drawn from the UN-jittered lens
// with analytic defocus (it widens and dims by the blur circle), so it never ghosts at low sample counts.
const VS_NEON = /* glsl */ `
attribute vec3 aTan; attribute float aSide; attribute float aU;
uniform mat4 uView; uniform float uFocus; uniform float uPx; uniform float uAp; uniform float uR; uniform float uSpread; uniform float uBlur;
varying float vS; varying float vU; varying float vK;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vec4 mv = uView * wp;
  vec3 t = mat3(uView) * normalize(mat3(modelMatrix) * aTan);
  vec3 sd = cross(t, normalize(mv.xyz)); float sl = length(sd); sd = sl > 1e-5 ? sd / sl : vec3(0.0, 1.0, 0.0);
  float d = max(-mv.z, 0.05);
  float pix = 2.0 * d / (uPx * projectionMatrix[1][1]);
  float coc = uAp * abs(d - uFocus) / max(uFocus, 0.01) + uBlur;
  float r = max(uR, 0.6 * pix);
  float soft = r + coc;
  mv.xyz += sd * (aSide * soft * uSpread);
  vS = aSide * uSpread; vK = r / soft; vU = aU;
  gl_Position = projectionMatrix * mv;
}`;
const FS_NEON = /* glsl */ `
uniform vec3 uCore; uniform vec3 uGlow; uniform float uGain; uniform float uA; uniform float uB; uniform float uEnd; uniform float uHead;
varying float vS; varying float vU; varying float vK;
void main(){
  float m = smoothstep(uA - uEnd, uA + uEnd, vU) * (1.0 - smoothstep(uB - uEnd, uB + uEnd, vU));
  if (m <= 0.0) discard;
  float s = abs(vS); float k = vK; float kb = 1.0 - k;
  float core = exp(-s * s / (0.045 + 0.6 * kb));
  float body = 1.0 - smoothstep(0.7, 1.05 + 0.9 * kb, s);
  float halo = exp(-s * (0.95 - 0.35 * kb));
  float hd = 1.0 + uHead * exp(-pow((uB - vU) / (uEnd * 5.0), 2.0));
  vec3 col = uCore * core * (0.2 + 0.8 * k) * 1.45 + uGlow * (body * (0.3 + 0.55 * k) + halo * 0.55);
  gl_FragColor = vec4(col * (m * hd * uGain), 1.0);
}`;

// Motes: camera-facing discs with analytic defocus; they drift and wrap inside a box. keepOut() switches off anything
// that would land on the active word's face, seen from the lens.
const VS_MOTE = /* glsl */ `
attribute vec3 aPos; attribute vec4 aRnd;
uniform mat4 uView; uniform float uFocus; uniform float uAperture; uniform float uPx;
uniform float uT; uniform vec3 uVel; uniform vec3 uBox; uniform vec3 uCenter; uniform float uSway; uniform float uMaxFrac;
uniform mat4 uWordInv; uniform vec3 uCamL; uniform vec2 uHalf; uniform float uKeep;
varying vec2 vQ; varying float vA; varying float vK; varying float vHue;
float keepOut(vec3 wp, float rad){
  vec3 pl = (uWordInv * vec4(wp, 1.0)).xyz;
  float dz = uCamL.z - pl.z;
  if (pl.z < -0.1 || dz < 0.02) return 1.0;
  float t = uCamL.z / dz;
  vec2 q = abs(uCamL.xy + (pl.xy - uCamL.xy) * t) - uHalf - rad * t;
  float inside = (1.0 - smoothstep(0.0, 0.2, q.x)) * (1.0 - smoothstep(0.0, 0.2, q.y));
  return 1.0 - inside * uKeep;
}
void main(){
  vec3 p = aPos + uVel * uT * (0.55 + 0.9 * aRnd.z);
  p.x += sin(uT * 0.11 * (0.5 + aRnd.z) + aRnd.y * 6.2832) * uSway;
  p.y += cos(uT * 0.09 * (0.5 + aRnd.z) + aRnd.y * 17.0) * uSway * 0.6;
  p = mod(p + 0.5 * uBox, uBox) - 0.5 * uBox;
  vec3 e = abs(p) / (0.5 * uBox);
  float life = (1.0 - smoothstep(0.75, 1.0, e.x)) * (1.0 - smoothstep(0.75, 1.0, e.y)) * (1.0 - smoothstep(0.75, 1.0, e.z));
  life *= 0.6 + 0.4 * sin(uT * 0.7 * (0.6 + aRnd.z) + aRnd.y * 40.0);
  p += uCenter;
  vec4 wp = modelMatrix * vec4(p, 1.0);
  vec4 mv = uView * wp; float d = max(-mv.z, 0.02);
  float pix = 2.0 * d / (uPx * projectionMatrix[1][1]);
  float core = aRnd.x * 1.6; float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
  float tot = core + coc;
  float shown = clamp(tot, 1.6 * pix, max(uMaxFrac * uPx * pix, 1.6 * pix));
  vK = 1.0 - (core * core) / (tot * tot);
  vA = life * keepOut(wp.xyz, 0.5 * shown) * min(1.0, (tot * tot) / (shown * shown)) * smoothstep(0.15, 0.45, -mv.z);
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
  float a = mix(soft, disc * max((1.0 - vK) * 2.2, uFloor), smoothstep(0.03, 0.55, vK)) * vA * uOpacity;
  gl_FragColor = vec4(col * a, 1.0);
}`;

export default {
  build(ctx) {
    const { THREE, kit, tex, words, cfg } = ctx; const group = new THREE.Group();
    const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
    const COL = (c) => new THREE.Color(c);
    const U = (v) => ({ value: v });
    const ADD = { blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor };
    const ASPECT = (cfg.width || 1920) / (cfg.height || 1080);
    const AP = U(0.05);                                   // virtual aperture for the analytic defocus (tubes, motes)
    const LENS = { uView: kit.lens.view, uFocus: kit.lens.focus, uPx: kit.lens.px };

    // ------------------------------------------------------------------ palette + letter materials
    const NEON = '#ff2a3d', GOLD = '#f3cf7a';
    // neon letters: pink-white glass faces, a white-hot bevel outlining every letter, deep crimson sides falling to wine
    const ST_N = { top: '#fff1f0', bot: '#ff6a78', side: '#e8102c', sideDark: '#1e0208', rim: '#ffffff', gain: 1.0, chrome: 0.16, rimAmt: 1.0 };
    const ST_G = { top: '#fff6f6', bot: '#ff8292', side: '#ff2440', sideDark: '#260209', rim: '#ffffff', gain: 1.0, chrome: 0.26, rimAmt: 1.0 };

    // ------------------------------------------------------------------ words + framing
    const Z2 = -1.2;                                      // GLOWS sits a little deeper in the same space as NIGHT
    const W3 = kit.word(words.s03 || 'NIGHT', { size: 1, depth: 0.55, bevel: 0.02, style: ST_N, seed: 3 }); group.add(W3.group);
    const W4 = kit.word(words.s04 || 'GLOWS', { size: 1, depth: 0.6, bevel: 0.02, style: ST_G, seed: 4 }); group.add(W4.group);
    W3.set('uFaceAmt', 0.07); W3.set('uGrit', 0.025); W3.set('uLight', V3(-0.45, 0.8, 0.4));
    W4.set('uFaceAmt', 0.06); W4.set('uGrit', 0.02); W4.set('uLight', V3(0.25, 0.85, 0.1));
    const box3 = new THREE.Box3().setFromObject(W3.group), box4 = new THREE.Box3().setFromObject(W4.group);
    const corners = (b) => { const out = []; for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(V3(x, y, z)); return out; };
    const C3 = corners(box3), C4 = corners(box4);
    const hw3 = Math.max(-box3.min.x, box3.max.x), hw4 = Math.max(-box4.min.x, box4.max.x);
    const d3 = Math.max((2 * hw3) / (1.294 * 0.56), 1 / (0.728 * 0.34));     // NIGHT: <= 56 % of the width, cap <= 34 %
    const d4 = Math.max((2 * hw4) / (1.294 * 0.53), 1 / (0.728 * 0.31));     // GLOWS (a little smaller: its halo needs room)
    const st3 = Math.min(0.32, 1.3 / Math.max(1, W3.n - 1)), st4 = Math.min(0.38, 1.5 / Math.max(1, W4.n - 1));

    // ------------------------------------------------------------------ camera (one continuous move through the space)
    const camAt = (rf) => {
      const kT = prog(rf, 29.4, 34.6, 'io2');                                    // NIGHT framing -> GLOWS framing
      const dive = prog(rf, 42, 48, 'in3');
      const dN = d3 * (1.17 - 0.17 * ease.out3(prog(rf, 21, 24.8)) - 0.011 * Math.max(0, rf - 21));
      const dG = d4 * (1.13 - 0.13 * ease.out3(prog(rf, 32.5, 37)) - 0.011 * Math.max(0, rf - 33)) * (1 - dive) + 0.32 * dive;
      const dist = lerp(dN, dG, kT), tz = lerp(0, Z2, kT);
      const ox = lerp(lerp(-0.24, 0.14, prog(rf, 21, 29.5, 'io2')), lerp(0.2, -0.12, prog(rf, 33, 42, 'io2')), kT) * (1 - dive);
      const oy = lerp(lerp(0.14, 0.03, prog(rf, 21, 29.5, 'io2')), lerp(0.09, -0.02, prog(rf, 33, 42, 'io2')), kT) * (1 - dive);
      const tgt = V3(0, 0.02, tz), pos = V3(ox, 0.02 + oy, tz + dist);
      const roll = -2.0 + 3.0 * prog(rf, 21, 29.5, 'io2') - 2.4 * prog(rf, 29.5, 36, 'io2') + 1.8 * prog(rf, 36, 42, 'io2') + 58 * dive;
      return { pos, tgt, roll, fov: 40 + 5 * dive, dist, kT, dive };
    };
    const camObj = new THREE.PerspectiveCamera(40, ASPECT, 0.05, 600);
    const poseCam = (c) => { camObj.position.copy(c.pos); camObj.up.set(0, 1, 0); camObj.lookAt(c.tgt); camObj.rotateZ(c.roll * DEG); camObj.fov = c.fov; camObj.aspect = ASPECT; camObj.updateProjectionMatrix(); camObj.updateMatrixWorld(true); };
    const _p = V3();
    const fitOf = (W, C) => { W.group.updateMatrixWorld(true); let mx = 0, my = 0; for (const c of C) { _p.copy(c).applyMatrix4(W.group.matrixWorld).project(camObj); mx = Math.max(mx, Math.abs(_p.x)); my = Math.max(my, Math.abs(_p.y)); } return [mx, my]; };
    const camF = camAt(31); const Dref = (z) => camF.pos.z - z;           // frame-unit authoring for the tubes (camera at rf 31)
    const F = (u, v, z) => [u * 0.6473 * Dref(z) + camF.pos.x, v * 0.364 * Dref(z) + camF.pos.y, z];

    // ------------------------------------------------------------------ local builders
    const neon = (pts, o = {}) => {
      const { r = 0.02, seg = 220, core = '#fff3f2', glow = NEON, gain = 1, spread = 4.6, head = 0.7, blur = 0, order = 3, tension = 0.5 } = o;
      const curve = new THREE.CatmullRomCurve3(pts.map((p) => (p.isVector3 ? p : V3(p[0], p[1], p[2] || 0))), false, 'catmullrom', tension);
      const n = seg + 1; const pos = new Float32Array(n * 6), tan = new Float32Array(n * 6), side = new Float32Array(n * 2), uu = new Float32Array(n * 2); const P = V3(), T = V3();
      for (let i = 0; i < n; i++) { const u = i / seg; curve.getPointAt(u, P); curve.getTangentAt(u, T); for (let j = 0; j < 2; j++) { const k = i * 2 + j; pos[k * 3] = P.x; pos[k * 3 + 1] = P.y; pos[k * 3 + 2] = P.z; tan[k * 3] = T.x; tan[k * 3 + 1] = T.y; tan[k * 3 + 2] = T.z; side[k] = j ? -1 : 1; uu[k] = u; } }
      const idx = []; for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aTan', new THREE.BufferAttribute(tan, 3)); geo.setAttribute('aSide', new THREE.BufferAttribute(side, 1)); geo.setAttribute('aU', new THREE.BufferAttribute(uu, 1)); geo.setIndex(idx);
      const len = curve.getLength();
      const u = { ...LENS, uAp: AP, uR: U(r), uSpread: U(spread), uBlur: U(blur), uCore: U(COL(core)), uGlow: U(COL(glow)), uGain: U(gain), uA: U(0), uB: U(1), uEnd: U((r * 2.2) / len), uHead: U(head) };
      const mesh = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS_NEON, fragmentShader: FS_NEON, uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ADD }));
      mesh.frustumCulled = false; mesh.renderOrder = order; mesh.visible = false;
      const N = { mesh, u, curve, len, gain,
        set(a, b, g = 1) { if (b - a < 1e-3) { mesh.visible = false; return N; } mesh.visible = true; u.uA.value = a; u.uB.value = b; u.uGain.value = N.gain * g; return N; },
        swoosh(rf, t0, t1, t2, t3, g = 1, eOn = 'out3', eOff = 'in2') { if (rf < t0 || rf > t3) { mesh.visible = false; return N; } return N.set(prog(rf, t2, t3, eOff), prog(rf, t0, t1, eOn), g); } };
      return N;
    };
    const QUAD = new Float32Array([-1, -1, 0, 1, -1, 0, 1, 1, 0, -1, 1, 0]);
    const KEEP = { uWordInv: U(new THREE.Matrix4()), uCamL: U(V3(0, 0, 5)), uHalf: U(new THREE.Vector2(1, 0.6)), uKeep: U(1) };
    const motes = (count, o = {}) => {
      const { box = [10, 6, 6], center = [0, 0, 0], size = [0.02, 0.05], sizePow = 2, seed = 3, colors = ['#ffffff', '#ffd0e0', '#ffffff'], opacity = 0.6, floor = 0.1, sway = 0.1, vel = [0, 0.01, 0], maxFrac = 0.2, ap = 1 } = o; const R = rng(seed);
      const pos = new Float32Array(count * 3), rnd = new Float32Array(count * 4);
      for (let i = 0; i < count; i++) { pos[i * 3] = (R() - 0.5) * box[0]; pos[i * 3 + 1] = (R() - 0.5) * box[1]; pos[i * 3 + 2] = (R() - 0.5) * box[2]; rnd[i * 4] = lerp(size[0], size[1], Math.pow(R(), sizePow)); rnd[i * 4 + 1] = R(); rnd[i * 4 + 2] = R(); rnd[i * 4 + 3] = R(); }
      const geo = new THREE.InstancedBufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(QUAD, 3)); geo.setIndex([0, 1, 2, 0, 2, 3]);
      geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(pos, 3)); geo.setAttribute('aRnd', new THREE.InstancedBufferAttribute(rnd, 4)); geo.instanceCount = count;
      const u = { ...LENS, uAperture: U(AP.value * ap), ...KEEP, uT: U(0), uVel: U(V3(vel[0], vel[1], vel[2])), uBox: U(V3(box[0], box[1], box[2])), uCenter: U(V3(center[0], center[1], center[2])), uSway: U(sway), uMaxFrac: U(maxFrac),
        uColA: U(COL(colors[0])), uColB: U(COL(colors[1])), uColC: U(COL(colors[2] || colors[1])), uOpacity: U(opacity), uFloor: U(floor) };
      const m = new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: VS_MOTE, fragmentShader: FS_MOTE, uniforms: u, transparent: true, depthWrite: false, side: THREE.DoubleSide, ...ADD }));
      m.frustumCulled = false; m.u = u; m.ap = ap; return m;
    };
    // impact FX sits behind the word: drawn before the letters, its soft flash dimmed
    // (its star glints would sit right on the letters' edges in the hold: switched off, the halo carries the glints here)
    const tuneFx = (fx, flash) => fx.group.children.forEach((grp) => { grp.children.forEach((m) => { m.renderOrder = -7; if (m.isSprite) m.visible = false; }); const glow = grp.children[grp.children.length - 1]; glow.renderOrder = -7.8; glow.material.color.multiplyScalar(flash); });
    const glowPlate = (w, h, color, order) => { const m = kit.plate(tex.glow, w, h, { color, additive: true, opacity: 0 }); m.renderOrder = order; return m; };
    // soft out-of-focus disc (a lens bokeh: flat body, brighter rim)
    const discTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); const gr = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      [[0, 0.36], [0.55, 0.42], [0.8, 0.62], [0.9, 0.78], [0.955, 0.4], [1, 0]].forEach(([o, a]) => gr.addColorStop(o, `rgba(255,255,255,${a})`)); g.fillStyle = gr; g.fillRect(0, 0, 256, 256); return tex.make.tex(c); })();

    // ------------------------------------------------------------------ background: the rippling crimson field
    const FZ = -11;
    const camS = camAt(21); const Df = camS.pos.z - FZ;
    const fu = { tNoise: U(tex.noise), uT: U(0), uSize: U(new THREE.Vector2(48, 30)), uC: U(new THREE.Vector2(0, 0)), uRing: U(1.7), uSlope: U(0.22), uFront: U(0), uAmp: U(1), uPool: U(0), uPoolR: U(2.4), uGain: U(1), uFall: U(4.3),
      uDeep: U(COL('#0a0204')), uMid: U(COL('#4e030e')), uHi: U(COL('#d01028')), uNeon: U(COL(NEON)), uPulse: U(0), uPulseR: U(0), uMatch: U(1), uMatchK: U(10.3 / (34 * Df)), uMatchT: U(0.7) };
    const field = new THREE.Mesh(new THREE.PlaneGeometry(48, 30), new THREE.ShaderMaterial({ vertexShader: VS_UV, fragmentShader: FS_FIELD, uniforms: fu, depthWrite: false }));
    field.position.z = FZ; field.renderOrder = -20; group.add(field);

    // night bokeh: big soft lights far behind the words
    const nightBokeh = motes(30, { box: [15, 8, 3.5], center: [0, 0.2, -6.2], size: [0.05, 0.13], sizePow: 1.5, seed: 21, colors: [NEON, '#ff8a96', '#ffe6e0'], opacity: 0.32, floor: 0.32, vel: [0.004, 0.003, 0], sway: 0.15, maxFrac: 0.09, ap: 3.2 }); nightBokeh.renderOrder = -12; group.add(nightBokeh);
    // soft red light shafts behind whichever word is on screen
    const beams = kit.beams({ center: [0, 0, -1.6], count: 9, len: 7.5, color: NEON, opacity: 0.12, seed: 11 }); beams.group.children.forEach((m) => { m.renderOrder = -9; }); group.add(beams.group);

    // ------------------------------------------------------------------ NIGHT dressing (moves with the word)
    const pool3 = glowPlate(2 * hw3 * 1.55, 2.2, '#ff1a30', -8); pool3.position.z = -0.7; W3.group.add(pool3);
    // a faint crimson dial behind the word, squashed to an ellipse (it foreshadows the halo GLOWS will get)
    const orn3 = kit.ornaments({ center: [0, 0, 0], radius: (hw3 + 0.5) / 0.918, color: '#ff4a5c', opacity: 0.2, seed: 7 }); orn3.group.scale.set(1, 0.56, 1); orn3.group.position.z = -0.1;
    orn3.group.children.forEach((m) => { m.position.z = -0.75; m.renderOrder = -7.2; }); W3.group.add(orn3.group);
    const fxS3 = Math.min(1.3, 0.6 + hw3 * 0.42);
    const fx3 = kit.impactFX([{ rf: 24, at: [0, 0, -0.8], size: fxS3, color: NEON, sparks: 20 }]); tuneFx(fx3, 0.45); W3.group.add(fx3.group);

    // ------------------------------------------------------------------ GLOWS dressing: pool, impact, the neon halo
    const pool4 = glowPlate(2 * hw4 * 1.6, 2.4, '#ff1a30', -8); pool4.position.z = -0.75; W4.group.add(pool4);
    const fxS4 = Math.min(1.35, 0.6 + hw4 * 0.45);
    const fx4 = kit.impactFX([{ rf: 36.5, at: [0, 0, -0.85], size: fxS4, color: NEON, sparks: 22 }]); tuneFx(fx4, 0.4); W4.group.add(fx4.group);
    // the halo: one tube that sweeps in along the bottom of the frame and bends once round the word, its two ends stopping
    // just short of each other like a real bent-glass neon ring
    const haloG = new THREE.Group(); haloG.position.set(0, 0.0, Z2 - 0.5); haloG.rotation.x = -0.1; group.add(haloG);
    const aH = hw4 * 1.06 + 0.86, bH = 1.22, TH0 = 215 * DEG, TURN = 0.972;
    const feed = [[2.2, -0.2, 0.9], [1.6, -0.95, 0.55], [0.8, -1.32, 0.3], [-0.08, -1.4, 0.12], [-0.6, -1.08, 0.03]].map(([x, y, z]) => V3(x * aH, y * bH, z));
    const loop = []; const ML = 44; for (let j = 0; j <= ML; j++) { const th = TH0 - TAU * TURN * (j / ML); const s = 1 + 0.012 * Math.sin(j * 0.9); loop.push(V3(Math.cos(th) * aH * s, Math.sin(th) * bH * s, 0)); }
    const halo = neon([...feed, ...loop], { r: 0.024, seg: 360, gain: 1.05, head: 0.9, order: -6 }); haloG.add(halo.mesh);
    const uJ = (() => { const L = halo.curve.getLengths(2000); const tJ = feed.length / (feed.length + loop.length - 1); return L[Math.round(tJ * 2000)] / L[2000]; })();
    const H_ON = [31.0, 36.7], H_OFF = [32.0, 35.2];
    const headU = (rf) => prog(rf, H_ON[0], H_ON[1], 'out2');
    const halo2 = neon(loop.map((p) => p.clone().multiplyScalar(0.9).setZ(-0.3)), { r: 0.009, seg: 240, gain: 0.55, head: 0.4, order: -6 }); haloG.add(halo2.mesh);
    // gold sparks shed by the halo's head while it closes, flying outward (never toward the word)
    const SPARKS = []; { const R = rng(404); const P = V3(), T = V3();
      for (let i = 0; i < 9; i++) { const b = 33.7 + i * 0.33 + R.range(-0.08, 0.08); const u = headU(b); if (u < uJ + 0.02) continue; halo.curve.getPointAt(Math.min(u, 0.999), P); halo.curve.getTangentAt(Math.min(u, 0.999), T);
        const out = V3(P.x / (aH * aH), P.y / (bH * bH), 0).normalize(); const vel = T.clone().multiplyScalar(R.range(0.12, 0.3)).addScaledVector(out, R.range(0.28, 0.5)); vel.z = R.range(-0.05, 0.08);
        const m = kit.plate(tex.streak, 1, 1, { additive: true, color: i % 3 ? '#ffd27a' : '#fff1c8', opacity: 0, gain: 1.9 }); m.renderOrder = -5; haloG.add(m);
        const hd = kit.plate(tex.dot, 1, 1, { additive: true, color: '#fff6dc', opacity: 0, gain: 1.6 }); hd.renderOrder = -5; haloG.add(hd);
        SPARKS.push({ m, hd, b, p0: P.clone(), v: vel, life: R.range(2.6, 3.8), len: R.range(0.3, 0.46), w: R.range(0.032, 0.046), ph: R() * 6 }); } }
    const GLINTS = [[150, 37.7, 0.36], [28, 39.1, 0.3], [292, 40.5, 0.42]].map(([deg, t0, s], i) => { const m = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, color: i === 2 ? '#fff6e0' : GOLD, opacity: 0, gain: 1.2 }); const th = deg * DEG; m.position.set(Math.cos(th) * aH * 1.03, Math.sin(th) * bH * 1.03, 0.05); m.renderOrder = -5; haloG.add(m); return { m, t0, s }; });

    // ------------------------------------------------------------------ the neon tubes of the transition
    const off = (pts, du, dv) => pts.map(([u, v]) => [u + du, v + dv]);
    const T1 = [[-1.35, -0.98], [-0.78, -0.58], [-0.28, -0.14], [0.22, 0.24], [0.72, 0.5], [1.35, 0.7]];
    const TUBES = [
      { n: neon(off(T1, 0, 0).map(([u, v]) => F(u, v, 0.55)), { r: 0.027 }), on: [29.0, 31.7], off: [30.1, 32.9] },
      { n: neon(off(T1, -0.035, 0.06).map(([u, v]) => F(u, v, 0.3)), { r: 0.015, gain: 0.85 }), on: [29.3, 32.0], off: [30.4, 33.2] },
      { n: neon(off(T1, 0.04, -0.07).map(([u, v]) => F(u, v, 0.8)), { r: 0.019, gain: 0.9 }), on: [29.6, 32.3], off: [30.7, 33.4] },
      // close to the lens: a big soft red glow sweeping over the top of the frame
      { n: neon([[-1.4, 0.3], [-0.55, 0.74], [0.35, 0.86], [1.4, 0.6]].map(([u, v]) => F(u, v, 2.3)), { r: 0.026, blur: 0.035, gain: 0.45, head: 0.3 }), on: [30.0, 32.4], off: [30.9, 33.4] },
      // far behind: a thin line crossing the other way, for depth
      { n: neon([[1.3, 0.95], [0.5, 0.45], [-0.3, 0.02], [-1.3, -0.62]].map(([u, v]) => F(u, v, -3.2)), { r: 0.014, gain: 0.7, head: 0.4, order: -4 }), on: [29.8, 32.6], off: [31.0, 33.6] },
    ]; TUBES.forEach((t) => group.add(t.n.mesh));

    // ------------------------------------------------------------------ air: dust between the layers (never in front of a word)
    const dust = motes(150, { box: [10, 6, 7], center: [0, 0, 0.4], size: [0.006, 0.02], sizePow: 2.5, seed: 31, colors: ['#ff5a6a', '#ffe2dc', '#ff2a3d'], opacity: 0.75, floor: 0.08, vel: [0.006, 0.012, 0.01], sway: 0.1, maxFrac: 0.12 }); dust.renderOrder = 4; group.add(dust);

    // ------------------------------------------------------------------ lens layer (locked to the camera, 1 unit = frame height)
    const hud = new THREE.Group(); group.add(hud); const AX = ASPECT / 2;
    const hudPlate = (map, color, additive, order) => { const m = kit.plate(map, 1, 1, { color, additive, opacity: 0, depthTest: false }); m.renderOrder = order; hud.add(m); return m; };
    const DISCS = [[-0.86, 0.36, 0.3, NEON, 0.16], [0.88, -0.33, 0.34, '#ff5a6a', 0.13], [-0.72, -0.46, 0.2, '#ffd6d0', 0.08], [0.76, 0.45, 0.24, NEON, 0.12], [0.97, 0.1, 0.15, '#ffffff', 0.06], [-0.98, -0.06, 0.22, '#ff3a4a', 0.1]]
      .map(([x, y, s, c, o], i) => ({ m: hudPlate(discTex, c, true, 92), x: x * AX / 0.889, y, s, o, ph: i * 1.7 }));
    const SMUDGE = [[-0.95, -0.58, 0.95], [0.98, 0.58, 0.8], [1.0, -0.6, 0.62]].map(([x, y, s]) => ({ m: hudPlate(tex.smoke, '#030001', false, 91), x: x * AX / 0.889, y, s }));

    return { group, update(rf) {
      const c = camAt(rf); const sh = kit.shake(rf, 0.012 + 0.012 * c.dive, 0.55, 21); c.pos.add(sh); c.tgt.addScaledVector(sh, 0.5); poseCam(c);
      const kT = c.kT, dive = c.dive;

      // ---------------- NIGHT
      const outN = prog(rf, 29.2, 32.4, 'in2');
      W3.group.visible = rf < 32.6;
      if (W3.group.visible) {
        W3.group.rotation.set(-0.24 - 0.9 * outN, 0.3 - 0.012 * (rf - 24), -0.02); W3.group.position.set(0, -0.4 * outN, -2.4 * outN);
        const oN = 1 - prog(rf, 30.2, 31.3, 'io2');
        const flick = track([[29.1, 1], [29.32, 0.42], [29.6, 1.0], [29.9, 0.32], [30.2, 0.78], [30.65, 0.18], [31.4, 0.06]], rf);
        for (let i = 0; i < W3.n; i++) { const L = W3.letters[i]; const t0 = 21.15 + i * st3; const t = (rf - t0) / 1.65;
          if (t <= 0) { W3.pose(i, { o: 0 }); continue; }
          const k = 1 - ease.out3(sat(t)); const sgn = L.rnd < 0.5 ? -1 : 1;
          W3.pose(i, { z: -k * 4.6, y: k * (L.rnd2 - 0.5) * 0.5, ry: k * 0.9 * sgn, rz: -k * 0.3 * sgn, s: 1 - 0.15 * k, o: sat(t * 3) * oN });
          const ig = track([[-0.6, 0.5], [0, 1.45, 'in2'], [0.35, 0.72], [0.7, 1.16], [1.25, 1.0]], rf - (t0 + 1.24));
          L.mesh.material.uniforms.uGain.value = ig * flick * (1 + 0.07 * pulse(rf, 26.8, 3, 0.4)); }
        W3.sweep(prog(rf, 25.4, 27.6), 0.5);
        orn3.update(rf, prog(rf, 23.6, 25.2, 'out2') * (1 - prog(rf, 28.8, 30.0)));
        pool3.material.opacity = 0.24 * prog(rf, 22.4, 24.2, 'out2') * (0.35 + 0.65 * flick) * oN;
        fx3.update(rf);
      }

      // ---------------- GLOWS
      W4.group.visible = rf > 32.8;
      let fadeG = 1;
      if (W4.group.visible) {
        W4.group.position.set(0, 0, Z2); W4.group.rotation.set(-0.22, 0.27 - 0.01 * (rf - 36.5), -0.02);
        const fit = fitOf(W4, C4); const lim = Math.max(fit[0], fit[1] / 0.9);
        fadeG = (1 - prog(lim, 0.8, 0.97)) * (1 - prog(rf, 45.6, 47.2, 'io2'));
        const glowOut = prog(rf, 43.8, 46.6, 'in2');
        for (let i = 0; i < W4.n; i++) { const L = W4.letters[i]; const t0 = 33.0 + i * st4; const t = (rf - t0) / 2.0;
          if (t <= 0) { W4.pose(i, { o: 0 }); continue; }
          const k = 1 - ease.out3(sat(t)); const sgn = L.rnd < 0.5 ? -1 : 1;
          W4.pose(i, { z: -k * 3.4, y: k * (L.rnd2 - 0.5) * 0.4, ry: k * 1.3 * sgn, s: 1 - 0.3 * k, o: sat(t * 3) * fadeG });
          const ig = track([[-0.7, 0.45], [0, 1.35, 'in2'], [0.4, 0.86], [0.8, 1.08], [1.3, 1.0]], rf - (t0 + 1.5));
          L.mesh.material.uniforms.uGain.value = ig * (1 + 0.06 * pulse(rf, 40.5, 3, 0.4) + 0.55 * glowOut); }
        W4.sweep(prog(rf, 38.0, 40.2), 0.55);
        pool4.material.opacity = 0.24 * prog(rf, 34.5, 36.8, 'out2') * (0.6 + 0.4 * fadeG);
        fx4.update(rf);
      }
      // halo: sweeps in, closes round the word, breathes, then flies past the lens in the dive
      haloG.rotation.z = 0.012 * (rf - 36.5);
      const hb = 1 + 0.12 * Math.sin(rf * 0.9) * prog(rf, 37, 39) + 0.35 * pulse(rf, 40.5, 3, 0.4);
      if (rf < H_ON[0]) halo.mesh.visible = false; else halo.set(prog(rf, H_OFF[0], H_OFF[1], 'in2') * uJ, headU(rf), hb * (1 + 0.4 * dive));
      if (rf < 33.6) halo2.mesh.visible = false; else halo2.set(1 - prog(rf, 33.6, 37.4, 'out2'), 1, hb);
      for (const s of SPARKS) { const t = rf - s.b; const on = t > 0 && t < s.life; s.m.visible = s.hd.visible = on; if (!on) continue; const g = -0.03;
        const x = s.p0.x + s.v.x * t, y = s.p0.y + s.v.y * t + 0.5 * g * t * t, z = s.p0.z + s.v.z * t; const a = Math.atan2(s.v.y + g * t, s.v.x); const k = t / s.life; const L = s.len * (1 - 0.55 * k);
        s.m.position.set(x - Math.cos(a) * L * 0.35, y - Math.sin(a) * L * 0.35, z); s.m.rotation.z = a; s.m.scale.set(L, s.w, 1); const o = Math.pow(1 - k, 1.3) * (0.78 + 0.22 * Math.sin(t * 9 + s.ph)); s.m.material.opacity = o;
        s.hd.position.set(x, y, z + 0.01); s.hd.scale.setScalar(s.w * 1.6); s.hd.material.opacity = o; }
      for (const g of GLINTS) { const k = pulse(rf, g.t0, 1.8, 0.45) * (1 - dive); g.m.visible = k > 0.01; const s = g.s * (0.4 + 0.8 * k); g.m.scale.set(s, s, 1); g.m.material.opacity = k; g.m.material.rotation = 0.3 + (rf - g.t0) * 0.15; }

      // ---------------- the tubes
      TUBES.forEach((t) => t.n.swoosh(rf, t.on[0], t.on[1], t.off[0], t.off[1]));

      // ---------------- field, bokeh, shafts, dust
      fu.uT.value = 0.35 * (rf - 21); fu.uMatchT.value = rf / 30; fu.uMatch.value = 1 - prog(rf, 21.3, 24.6, 'io2');
      fu.uFront.value = 0.5 + 2.8 * Math.max(0, rf - 22.4); fu.uAmp.value = lerp(1, 0.5, kT);
      fu.uPool.value = 0.24 * prog(rf, 22.6, 24.4, 'out2') * (1 - 0.6 * prog(rf, 29.4, 31.2)) + 0.1 * prog(rf, 33.5, 36.8) + 0.85 * prog(rf, 44.5, 48, 'in2');
      fu.uGain.value = lerp(0.95, 0.72, kT) + 0.75 * prog(rf, 44.5, 48, 'in2'); fu.uPoolR.value = 2.4 + 3.2 * prog(rf, 44, 48, 'in2');
      const pb = (b) => (rf > b ? Math.exp(-(rf - b) / 2.4) : 0);
      fu.uPulse.value = 0.55 * pb(26.8) + 0.45 * pb(40.5); fu.uPulseR.value = rf < 40 ? 0.6 + 3.0 * (rf - 26.8) : 0.6 + 3.0 * (rf - 40.5);
      nightBokeh.u.uT.value = rf; nightBokeh.u.uOpacity.value = 0.32 * prog(rf, 21.5, 25);
      beams.group.position.z = lerp(-1.6, Z2 - 1.7, kT);
      beams.update(rf, prog(rf, 22.8, 25, 'out2') * (1 - prog(rf, 29.2, 31)) + prog(rf, 35, 38, 'out2') * (1 - dive));
      const actW = rf < 32.6 ? W3 : W4, actC = rf < 32.6 ? C3 : C4;
      actW.group.updateMatrixWorld(true); KEEP.uWordInv.value.copy(actW.group.matrixWorld).invert(); KEEP.uCamL.value.copy(c.pos).applyMatrix4(KEEP.uWordInv.value);
      const hb3 = rf < 32.6 ? box3 : box4; KEEP.uHalf.value.set(Math.max(-hb3.min.x, hb3.max.x) + 0.1, 0.62);
      dust.u.uT.value = rf; dust.u.uOpacity.value = 0.75 * prog(rf, 21.3, 23.5);
      for (const m of [dust, nightBokeh]) m.u.uAperture.value = AP.value * m.ap;

      // ---------------- lens layer
      const fwd = V3(); camObj.getWorldDirection(fwd); const hd = 1.0; const hh = 2 * Math.tan((c.fov * DEG) / 2) * hd;
      hud.position.copy(camObj.position).addScaledVector(fwd, hd); hud.quaternion.copy(camObj.quaternion); hud.scale.setScalar(hh);
      const lensK = prog(rf, 21.3, 24) * (1 - 0.6 * dive);
      DISCS.forEach((d) => { const dx = 0.02 * Math.sin(rf * 0.05 + d.ph), dy = 0.015 * Math.cos(rf * 0.04 + d.ph); d.m.position.set(d.x + dx, d.y + dy, 0); d.m.scale.set(d.s, d.s, 1); d.m.material.opacity = d.o * lensK * (0.8 + 0.2 * Math.sin(rf * 0.3 + d.ph)); });
      SMUDGE.forEach((s) => { s.m.position.set(s.x, s.y, 0); s.m.scale.set(s.s * 1.2, s.s, 1); s.m.material.opacity = 0.85 * lensK; });

      // ---------------- post
      _p.set(0, 0, kT > 0.5 ? Z2 : 0).project(camObj); const sx = 0.5 + 0.5 * _p.x, sy = 0.5 + 0.5 * _p.y;
      const trans = prog(rf, 29, 30.5) * (1 - prog(rf, 34, 36.5));
      const intro = prog(rf, 21, 24.5, 'io2');
      const endK = prog(rf, 45, 48);
      const post = {
        exposure: 1, contrast: lerp(1.06, 1.13, intro), saturation: lerp(1.12, 1.1, intro),
        bloom: lerp(0.72, 0.5, intro) + 0.18 * dive, bloomThreshold: lerp(0.8, 0.84, intro), bloomTint: [1, 0.42, 0.48],
        vignette: lerp(0.9, 0.82, intro) + 0.05 * endK, chroma: lerp(0.0012, 0.0007, kT) + 0.0006 * trans + 0.003 * dive,
        streak: 0.5, rays: 0.1 + 0.08 * trans + 0.3 * dive, raysCenter: [sx, sy],
        zoomBlur: 0.72 * prog(rf, 44.4, 48, 'in2'), zoomCenter: [sx, sy],          // (any zoom blur also multiplies chroma x5: only in the dive)
        bars: track([[21, 0], [33, 0], [37, 0.045, 'io2'], [48, 0.05]], rf), barsAlpha: 0.94, barsGlow: lerp(0.42, 0.32, endK), barsGlowColor: [lerp(1, 0.92, endK), lerp(0.18, 0.96, endK), lerp(0.24, 1.0, endK)],
        leak: 0.1 * intro * (1 - kT * 0.5), leakColor: [1, 0.1, 0.16], leakPos: [0.96, 0.92], leakSize: 0.75,
        grain: 0.045, dust: 0.24, scratches: 0.1, sharpen: 0.35,
      };
      return { cam: { pos: c.pos, tgt: c.tgt, roll: c.roll, fov: c.fov, aperture: 0.012, focus: c.dist }, clear: 0x0a0204, post };
    } };
  },
};
