// Scene kit: every reusable element of the 3D-typography style, built once and animated per frame.
//   word()      extruded rough-cut 3D text, one mesh per letter (individual drop-ins, ghosting, colour)
//   ribbon()    tapered white "trim path" stroke along a 3D curve
//   quad()      rounded card with outline (red cards, black tiles, wireframe tiles)
//   bubbles()   bokeh rings scattered in depth
//   dotStrings() chains of bokeh dots along curvy paths
//   flare()     anamorphic lens flare
//   starburst() spiky sun ring with long rays
//   panelFan()  radial wedge panels
//   bg()        background shader plane (ripple / ink / gradient)
//   planet()    lit sphere with atmosphere rim
//   plate()     textured billboard / card
//   cam()       camera keyframe interpolation, shake()
import * as THREE from 'three';
import { cutGlyph, capHeight, DEFAULT_CUT } from './glyphs.js';
import { rng, clamp, lerp, sat, ease, hash1, fbm1, wobble, pulse, TAU, DEG } from './util.js';

const V3 = (a) => (a instanceof THREE.Vector3 ? a : new THREE.Vector3(a[0], a[1], a[2] || 0));
const COL = (c) => new THREE.Color(c);
const hashStr = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

// ---------------------------------------------------------------- text material
const TEXT_VS = /* glsl */ `
varying vec3 vN; varying vec3 vNo; varying vec3 vPos; varying vec3 vView;
void main(){ vNo = normal; vN = normalize(normalMatrix * normal); vPos = position;
  vec4 mv = modelViewMatrix * vec4(position, 1.0); vView = -mv.xyz; gl_Position = projectionMatrix * mv; }`;
const TEXT_FS = /* glsl */ `
uniform vec3 uTop; uniform vec3 uBot; uniform vec3 uSide; uniform vec3 uSideDark; uniform vec3 uRim; uniform vec3 uLight;
uniform float uCap; uniform float uDepth; uniform float uBevel; uniform float uGain; uniform float uOpacity; uniform float uChrome; uniform float uRimAmt; uniform float uDesat; uniform float uGrit; uniform float uSweep; uniform float uSweepAmt; uniform float uHomeX;
uniform sampler2D tEnv; uniform sampler2D tGrit; uniform float uEnvAmt; uniform sampler2D tFace; uniform float uFaceAmt; uniform vec2 uFaceOff;
vec3 envAt(vec3 r){ return texture2D(tEnv, vec2(atan(r.x, -r.z) / 6.2831853 + 0.5, asin(clamp(r.y, -1.0, 1.0)) / 3.14159265 + 0.5)).rgb; }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(h2(i), h2(i+vec2(1.0,0.0)), f.x), mix(h2(i+vec2(0.0,1.0)), h2(i+vec2(1.0,1.0)), f.x), f.y); }
varying vec3 vN; varying vec3 vNo; varying vec3 vPos; varying vec3 vView;
void main(){
  // sliver triangles in the cap triangulation carry zero / NaN normals (they showed as black specks): fall back to the face normal
  vec3 no = vNo; if (!(dot(no, no) > 0.25)) no = vec3(0.0, 0.0, 1.0);
  vec3 n = normalize(vN); if (!(dot(n, n) > 0.25)) n = vec3(0.0, 0.0, 1.0); vec3 v = normalize(vView);
  if (!gl_FrontFacing) n = -n;
  float face = smoothstep(0.86, 0.985, no.z);
  float bevel = smoothstep(0.12, 0.55, no.z) * (1.0 - face);
  // an outward bevel folds over itself inside the font's narrow nicks; those inverted patches sit in the front bevel zone with a
  // back-facing normal and would shade as the dark side (black specks) — shade them as the face instead
  if (vPos.z > -uBevel * 1.03 && no.z < 0.12) { face = 1.0; bevel = 0.0; n = gl_FrontFacing ? normalize(vN + vec3(0.0, 0.0, 2.0)) : vec3(0.0, 0.0, 1.0); }
  float gy = clamp(vPos.y / uCap + 0.5, 0.0, 1.0);
  vec3 faceCol = mix(uBot, uTop, smoothstep(0.02, 0.92, gy));
  vec2 gp0 = vPos.xy / uCap; float wear = texture2D(tGrit, gp0 * 0.42).r;
  // real studio reflections: the lighting map is sampled along the reflection vector, with the surface wear
  // nudging the normal so highlights break up like brushed metal
  vec3 nb = normalize(n + vec3((wear - 0.5) * 0.22, (texture2D(tGrit, gp0 * 0.42 + 0.37).r - 0.5) * 0.22, 0.0) * face * clamp(uGrit * 10.0, 0.0, 1.5));
  vec3 r = reflect(-v, nb); vec3 env = envAt(r); float el = dot(env, vec3(0.333));
  float band = smoothstep(-0.35, 0.45, r.y + 0.25 * sin(vPos.x * 3.0 / uCap));
  faceCol *= mix(1.0, mix(0.62, 1.18, band), uChrome * (1.0 - uEnvAmt));
  faceCol = mix(faceCol, faceCol * (0.5 + 0.95 * min(el, 1.1)) + env * 0.1, uChrome * uEnvAmt);
  faceCol *= 1.0 - uGrit * 1.1 * (wear - 0.5);
  // the preset's recipe: a grunge photo mapped across the whole word and blended in Difference mode
  float fl = dot(texture2D(tFace, vec2(vPos.x + uHomeX, vPos.y) / (uCap * 5.5) + uFaceOff).rgb, vec3(0.299, 0.587, 0.114)); fl = clamp((fl - 0.05) * 1.9, 0.0, 0.7);
  faceCol = mix(faceCol, faceCol * (1.0 - fl * 1.2) + vec3(fl) * 0.05, uFaceAmt); // darken-only wear: the smudges of a Difference blend without its hue flips on warm colours
  // worn surface: mottling + fine diagonal scratches
  vec2 gp = vPos.xy / uCap; float grit = vn(gp*16.0)*0.55 + vn(gp*41.0)*0.3 + vn(vec2(gp.x*90.0 + gp.y*60.0, gp.y*6.0))*0.15;
  faceCol *= 1.0 - uGrit * (grit - 0.42) * 1.6;
  // light sweep: a bright diagonal band travelling across the whole word
  float sw = (vPos.x + uHomeX) * 0.82 + vPos.y * 0.57 - uSweep; faceCol += vec3(1.0) * exp(-sw * sw / (0.022 * uCap * uCap)) * uSweepAmt;
  float ndl = dot(n, normalize(uLight)) * 0.5 + 0.5;
  float dz = clamp(-vPos.z / max(uDepth, 1e-4), 0.0, 1.0);
  vec3 sideCol = mix(uSide, uSideDark, smoothstep(0.0, 1.0, dz)) * mix(0.5, 1.25, ndl);
  sideCol = mix(sideCol, sideCol * (0.5 + 1.2 * min(el, 1.1)) + env * 0.08, uChrome * uEnvAmt * 0.85);
  vec3 col = mix(sideCol, faceCol, face);
  col = mix(col, uRim, bevel * uRimAmt);
  float fr = pow(1.0 - clamp(dot(n, v), 0.0, 1.0), 3.0);
  col += uRim * fr * 0.18 * face * uRimAmt;
  float l = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(col, vec3(l), uDesat);
  gl_FragColor = vec4(col * uGain, uOpacity);
}`;

export const STYLES = {
  // face top / face bottom / side near / side far / bevel rim
  inkWhite: { top: '#ffffff', bot: '#ffc2d0', side: '#ff5a78', sideDark: '#4a0616', rim: '#ffffff', gain: 1.0, chrome: 0.0, rimAmt: 0.9 },
  redGlow: { top: '#ffc0ae', bot: '#f0604e', side: '#ee1016', sideDark: '#6c0004', rim: '#ffffff', gain: 1.0, chrome: 0.0, rimAmt: 1.0 },
  redSolid: { top: '#ffd9d0', bot: '#f58676', side: '#e20e15', sideDark: '#560004', rim: '#ffffff', gain: 1.0, chrome: 0.0, rimAmt: 1.0 },
  crimson: { top: '#ee3a42', bot: '#a00c15', side: '#780810', sideDark: '#2a0206', rim: '#ffb4ac', gain: 1.0, chrome: 0.15, rimAmt: 0.75 },
  pinkWhite: { top: '#fff4f4', bot: '#ee5c64', side: '#be1420', sideDark: '#3c0408', rim: '#ffffff', gain: 1.0, chrome: 0.0, rimAmt: 0.85 },
  gold: { top: '#fff4a8', bot: '#e39a1c', side: '#8c5406', sideDark: '#241200', rim: '#fffcd6', gain: 1.0, chrome: 0.55, rimAmt: 0.95 },
  silver: { top: '#f4f6f8', bot: '#9ba1a7', side: '#5c6268', sideDark: '#0e1012', rim: '#ffffff', gain: 0.98, chrome: 0.7, rimAmt: 0.8 },
  steel: { top: '#e6e9ec', bot: '#8e949a', side: '#4a5056', sideDark: '#08090b', rim: '#ffffff', gain: 0.98, chrome: 0.8, rimAmt: 0.75 },
  graphite: { top: '#b9bdc1', bot: '#5f6368', side: '#2c2f33', sideDark: '#050506', rim: '#e8eaec', gain: 0.95, chrome: 0.8, rimAmt: 0.65 },
};

class Word {
  constructor(kit, text, o = {}) {
    const font = o.font || kit.font, cut = o.cut || kit.cut;
    this.text = text; this.size = o.size ?? 1; this.kit = kit;
    const capEm = capHeight(font, cut); const em = this.size / capEm;
    this.depth = (o.depth ?? 0.34) * this.size; const inset = cut.bevelInset !== false; const bevel = (o.bevel ?? (inset ? 0.016 : 0.011)) * this.size;
    this.group = new THREE.Group(); this.letters = [];
    const R = rng(o.seed ?? hashStr(text)); const irr = o.irregular ?? 1;
    const chars = text.split('');
    const glyphs = chars.map((ch, i) => cutGlyph(font, ch, cut, o.unique === false ? 0 : (i * 7 + (o.seed ?? 0)) % 5));
    const advs = glyphs.map((g) => g.advance * em + (o.tracking ?? 0) * this.size);
    const total = advs.reduce((a, b) => a + b, 0); this.width = total; this.height = this.size;
    const faceOff = new THREE.Vector2(0.28 + R() * 0.3, 0.26 + R() * 0.16);
    this.uniformsBase = () => ({
      uTop: { value: COL('#fff') }, uBot: { value: COL('#fff') }, uSide: { value: COL('#888') }, uSideDark: { value: COL('#111') }, uRim: { value: COL('#fff') },
      uLight: { value: new THREE.Vector3(0.35, 0.8, 0.6) }, uCap: { value: this.size }, uDepth: { value: this.depth }, uBevel: { value: Math.max(bevel, 1e-4) }, uGain: { value: 1 }, uOpacity: { value: 1 }, uChrome: { value: 0 }, uRimAmt: { value: 0.9 }, uDesat: { value: 0 }, uGrit: { value: 0.1 }, uSweep: { value: -99 }, uSweepAmt: { value: 0 }, uHomeX: { value: 0 },
      tFace: { value: kit.tex.faceTex || kit.tex.white }, uFaceAmt: { value: kit.tex.faceTex ? 0.6 : 0 }, uFaceOff: { value: faceOff },
      tEnv: { value: kit.tex.env || kit.tex.white }, tGrit: { value: kit.tex.grit || kit.tex.white }, uEnvAmt: { value: kit.tex.env ? 1 : 0 },
    });
    let cursor = -total / 2;
    chars.forEach((ch, i) => {
      const g = glyphs[i]; const adv = advs[i];
      if (g.shapes.length) {
        const geo = new THREE.ExtrudeGeometry(g.shapes, { depth: this.depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel / em, bevelOffset: inset ? -bevel / em : 0, bevelSegments: 1, curveSegments: 1, steps: 1 });
        geo.scale(em, em, 1);
        geo.translate(-(g.advance * em) / 2, -this.size / 2, -(this.depth + bevel));
        const mat = new THREE.ShaderMaterial({ vertexShader: TEXT_VS, fragmentShader: TEXT_FS, uniforms: this.uniformsBase(), transparent: true, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geo, mat);
        const home = new THREE.Vector3(cursor + adv / 2, (R() - 0.5) * 0.03 * this.size * irr, 0);
        const letter = { mesh, home, ch, i, w: adv, rot0: (R() - 0.5) * 3.0 * DEG * irr, s0: 1 + (R() - 0.5) * 0.04 * irr, rnd: R(), rnd2: R() };
        mat.uniforms.uHomeX.value = home.x;
        mesh.position.copy(home); mesh.rotation.z = letter.rot0; mesh.scale.setScalar(letter.s0);
        this.group.add(mesh); this.letters.push(letter);
      }
      cursor += adv;
    });
    this.n = this.letters.length; this.style = null;
    this.setStyle(o.style || 'silver');
  }
  setStyle(s) { const st = typeof s === 'string' ? STYLES[s] : s; this.style = st; for (const L of this.letters) { const u = L.mesh.material.uniforms; u.uTop.value.set(st.top); u.uBot.value.set(st.bot); u.uSide.value.set(st.side); u.uSideDark.value.set(st.sideDark); u.uRim.value.set(st.rim); u.uGain.value = st.gain ?? 1; u.uChrome.value = st.chrome ?? 0; u.uRimAmt.value = st.rimAmt ?? 0.9; } return this; }
  /** blend between two styles (t 0..1) */
  mixStyle(a, b, t) { const A = typeof a === 'string' ? STYLES[a] : a, B = typeof b === 'string' ? STYLES[b] : b; const c = new THREE.Color(); const m = (k) => '#' + c.set(A[k]).lerp(COL(B[k]), t).getHexString(); return this.setStyle({ top: m('top'), bot: m('bot'), side: m('side'), sideDark: m('sideDark'), rim: m('rim'), gain: lerp(A.gain ?? 1, B.gain ?? 1, t), chrome: lerp(A.chrome ?? 0, B.chrome ?? 0, t), rimAmt: lerp(A.rimAmt ?? 0.9, B.rimAmt ?? 0.9, t) }); }
  set(name, v) { for (const L of this.letters) L.mesh.material.uniforms[name].value = v; return this; }
  opacity(o) { for (const L of this.letters) { L.mesh.material.uniforms.uOpacity.value = o; L.mesh.visible = o > 0.003; } return this; }
  gain(g) { return this.set('uGain', g); }
  desat(d) { return this.set('uDesat', d); }
  /** light sweep across the word: t 0..1 travels left -> right; amt = brightness */
  sweep(t, amt = 0.9) { const x = (-this.width / 2 - this.size) + t * (this.width + 2 * this.size); this.set('uSweep', x * 0.82); return this.set('uSweepAmt', t <= 0 || t >= 1 ? 0 : amt); }
  /** place one letter relative to its home pose */
  pose(i, p = {}) { const L = this.letters[i]; if (!L) return; const m = L.mesh; m.position.set(L.home.x + (p.x || 0), L.home.y + (p.y || 0), L.home.z + (p.z || 0)); m.rotation.set(p.rx || 0, p.ry || 0, L.rot0 + (p.rz || 0)); m.scale.setScalar(L.s0 * (p.s ?? 1)); if (p.o !== undefined) { m.material.uniforms.uOpacity.value = p.o; m.visible = p.o > 0.003; } }
  reset(o = 1) { for (let i = 0; i < this.n; i++) this.pose(i, { o }); return this; }
  /**
   * Staggered letter entrance. rf = current reference frame. Returns overall progress 0..1.
   * type: drop | rise | pop | slam | swing | spin | none
   */
  intro(rf, { start = 0, stagger = 1.3, dur = 7, type = 'drop', amp = 1, from = 0, upto = this.n, easing = 'outBackSoft' } = {}) {
    const S = this.size; const e_ = ease[easing] || ease.out3;
    for (let i = 0; i < this.n; i++) {
      const L = this.letters[i]; if (i < from || i >= upto) continue;
      const t = (rf - (start + (i - from) * stagger)) / dur;
      if (t <= 0) { this.pose(i, { o: 0 }); continue; }
      const e = e_(sat(t)); const k = 1 - e; const o = sat(t * 3.5); const sgn = L.rnd < 0.5 ? -1 : 1;
      if (type === 'drop') this.pose(i, { y: k * S * 1.5 * amp, rz: k * sgn * 0.55 * amp, s: 1 + k * 0.4, o });
      else if (type === 'rise') this.pose(i, { y: -k * S * 1.5 * amp, rz: k * sgn * 0.4 * amp, s: 1 + k * 0.3, o });
      else if (type === 'pop') this.pose(i, { s: Math.max(0.02, e), rz: k * sgn * 0.3, o });
      else if (type === 'grow') this.pose(i, { y: -k * S * 1.1 * amp, x: -k * S * 0.08, s: lerp(0.07, 1, e), o });
      else if (type === 'slam') this.pose(i, { z: k * S * 5 * amp, s: 1 + k * 0.5, rz: k * sgn * 0.25, o });
      else if (type === 'swing') this.pose(i, { x: k * S * 0.9 * amp, y: -k * S * 1.3 * amp, rz: -k * 1.0 * amp, s: 1 - k * 0.25, o });
      else if (type === 'spin') this.pose(i, { ry: k * 2.2 * sgn, z: k * S * 1.2, o });
      else this.pose(i, { o });
    }
    return sat((rf - start) / (dur + Math.max(0, upto - from - 1) * stagger));
  }
}

// ---------------------------------------------------------------- kit factory
export function makeKit({ font, cut = DEFAULT_CUT, tex }) {
  const kit = { font, cut, tex, STYLES };

  kit.word = (text, o) => new Word(kit, text, o);

  // ---- ribbon: tapered stroke with trim-path animation
  kit.ribbon = (points, o = {}) => {
    const { width = 0.18, color = '#ffffff', segments = 56, taper = 0.7, shade = 0.22, normal = [0, 0, 1], gain = 1.15, opacity = 1 } = o;
    const curve = new THREE.CatmullRomCurve3(points.map(V3), false, 'catmullrom', 0.5);
    const nrm = V3(normal).clone().normalize();
    const pos = new Float32Array((segments + 1) * 2 * 3), colr = new Float32Array((segments + 1) * 2 * 3); const idx = [];
    for (let i = 0; i < segments; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(colr, 3)); geo.setIndex(idx);
    const base = COL(color);
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, toneMapped: false });
    const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false;
    const p = new THREE.Vector3(), t = new THREE.Vector3(), s = new THREE.Vector3();
    const R = { mesh, curve, width, gain,
      /** show the part of the curve between a and b (0..1). widthMul scales thickness. */
      set(a, b, widthMul = 1) {
        a = sat(a); b = sat(b); if (b - a < 0.002) { mesh.visible = false; return R; } mesh.visible = true;
        for (let i = 0; i <= segments; i++) {
          const f = i / segments; const u = a + (b - a) * f; curve.getPoint(u, p); curve.getTangent(u, t); s.crossVectors(t, nrm);
          if (s.lengthSq() < 1e-8) s.set(0, 1, 0); s.normalize();
          const w = 0.5 * R.width * widthMul * Math.pow(Math.sin(Math.PI * clamp(f, 0.0001, 0.9999)), taper);
          const k = i * 6; pos[k] = p.x + s.x * w; pos[k + 1] = p.y + s.y * w; pos[k + 2] = p.z + s.z * w; pos[k + 3] = p.x - s.x * w; pos[k + 4] = p.y - s.y * w; pos[k + 5] = p.z - s.z * w;
          const g1 = R.gain, g2 = R.gain * (1 - shade); colr[k] = base.r * g1; colr[k + 1] = base.g * g1; colr[k + 2] = base.b * g1; colr[k + 3] = base.r * g2; colr[k + 4] = base.g * g2; colr[k + 5] = base.b * g2;
        }
        geo.attributes.position.needsUpdate = true; geo.attributes.color.needsUpdate = true; return R;
      },
      /** classic swoosh: draws on over [t0,t1], erases over [t2,t3] (reference frames) */
      swoosh(rf, t0, t1, t2 = t1, t3 = t1 + (t1 - t0), widthMul = 1) { const b = ease.out3(sat((rf - t0) / (t1 - t0))); const a = ease.in2(sat((rf - t2) / (t3 - t2))); if (rf < t0 || rf > t3) { mesh.visible = false; return R; } return R.set(a, b, widthMul); },
    };
    R.set(0, 1); return R;
  };
  kit.arc = (radius, a0, a1, n = 24, { center = [0, 0, 0], squash = 1, tilt = 0 } = {}) => { const out = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n) * DEG; const x = Math.cos(a) * radius, y = Math.sin(a) * radius * squash; out.push(new THREE.Vector3(center[0] + x, center[1] + y * Math.cos(tilt * DEG), center[2] + y * Math.sin(tilt * DEG))); } return out; };

  // ---- rounded card
  const roundRect = (w, h, r) => { const s = new THREE.Shape(); const x = -w / 2, y = -h / 2; r = Math.min(r, w / 2, h / 2); s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
  kit.quad = (o = {}) => {
    const { w = 1, h = 1, r = 0.04, fill = '#b0141c', fill2 = null, outline = '#ffffff', ow = 0.03, gain = 1, outlineGain = 1.15, opacity = 1, shadow = 0.5 } = o;
    const g = new THREE.Group();
    // soft drop shadow behind the card: it reads as a real layer floating in depth, not a flat sticker
    if (fill && shadow > 0) { const sh = kit.plate(tex.glow, w * 1.7, h * 1.7, { color: '#000000', opacity: shadow }); sh.position.set(w * 0.05, -h * 0.07, -0.06); sh.renderOrder = -3; g.shadowMesh = sh; g.add(sh); }
    if (fill) {
      const geo = new THREE.ShapeGeometry(roundRect(w, h, r), 3); const c1 = COL(fill).multiplyScalar(gain), c2 = COL(fill2 || fill).multiplyScalar(gain * (fill2 ? 1 : 0.62));
      const cols = new Float32Array(geo.attributes.position.count * 3); for (let i = 0; i < geo.attributes.position.count; i++) { const t = geo.attributes.position.getY(i) / h + 0.5; const c = c2.clone().lerp(c1, t); cols.set([c.r, c.g, c.b], i * 3); }
      geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
      g.fillMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, map: o.grain === true ? (tex.wood || null) : null, side: THREE.DoubleSide, transparent: opacity < 1, opacity, toneMapped: false })); g.add(g.fillMesh);
    }
    if (outline && ow > 0) { const sh = roundRect(w + ow, h + ow, r + ow / 2); sh.holes.push(new THREE.Path(roundRect(w - ow, h - ow, Math.max(0.001, r - ow / 2)).getPoints(3).reverse())); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh, 3), new THREE.MeshBasicMaterial({ color: COL(outline).multiplyScalar(outlineGain), side: THREE.DoubleSide, transparent: opacity < 1, opacity, toneMapped: false })); m.position.z = 0.002; g.outlineMesh = m; g.add(m); }
    return g;
  };

  // ---- textured card / billboard
  kit.plate = (texture, w, h, o = {}) => { const { color = '#ffffff', additive = false, opacity = 1, gain = 1, depthTest = true, billboard = false } = o; const mat = billboard ? new THREE.SpriteMaterial({ map: texture, color: COL(color).multiplyScalar(gain), transparent: true, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, depthTest, toneMapped: false }) : new THREE.MeshBasicMaterial({ map: texture, color: COL(color).multiplyScalar(gain), transparent: true, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, depthTest, side: THREE.DoubleSide, toneMapped: false }); const m = billboard ? new THREE.Sprite(mat) : new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat); m.scale.set(w, h, 1); return m; };

  // ---- bokeh rings scattered in a box
  kit.bubbles = (o = {}) => {
    const { count = 24, box = [10, 6, 6], center = [0, 0, 0], size = [0.12, 0.7], seed = 1, kinds = ['ring', 'ring', 'ringThin', 'ringBold'], color = '#ffffff', opacity = 0.95, gain = 1, avoid = 0 } = o;
    const R = rng(seed); const g = new THREE.Group(); g.items = [];
    for (let i = 0; i < count; i++) {
      let x, y, tries = 0; do { x = (R() - 0.5) * box[0]; y = (R() - 0.5) * box[1]; tries++; } while (avoid > 0 && Math.hypot(x, y * 1.6) < avoid && tries < 12);
      const z = (R() - 0.5) * box[2]; const s = lerp(size[0], size[1], Math.pow(R(), 2.2));
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[R.pick(kinds)], color: COL(color).multiplyScalar(gain), transparent: true, opacity, depthWrite: false, toneMapped: false }));
      sp.scale.set(s, s, 1); sp.position.set(center[0] + x, center[1] + y, center[2] + z); g.add(sp); g.items.push({ sp, base: sp.position.clone(), s, ph: R() * 100, sp2: R.range(0.4, 1.3) });
    }
    /** gentle float; `rise` world units per frame */
    g.drift = (rf, rise = 0.004, sway = 0.05) => { for (const it of g.items) { it.sp.position.set(it.base.x + Math.sin(rf * 0.05 * it.sp2 + it.ph) * sway, it.base.y + rf * rise * it.sp2, it.base.z); } };
    g.setOpacity = (v) => { for (const it of g.items) it.sp.material.opacity = v; };
    g.setColor = (c, gn = 1) => { for (const it of g.items) it.sp.material.color.copy(COL(c).multiplyScalar(gn)); };
    return g;
  };

  // ---- chains of bokeh dots along random curvy paths
  kit.dotStrings = (o = {}) => {
    const { strings = 6, dots = 46, box = [16, 9, 8], center = [0, 0, 0], size = 0.11, seed = 5, color = '#ffffff', opacity = 0.9, gain = 1 } = o;
    const R = rng(seed); const g = new THREE.Group(); const pts = [];
    for (let s = 0; s < strings; s++) {
      const cps = []; let x = (R() - 0.5) * box[0], y = (R() - 0.5) * box[1], z = (R() - 0.5) * box[2]; let a = R() * TAU;
      for (let k = 0; k < 6; k++) { cps.push(new THREE.Vector3(center[0] + x, center[1] + y, center[2] + z)); a += R.range(-1.2, 1.2); x += Math.cos(a) * box[0] * 0.22; y += Math.sin(a) * box[1] * 0.3; z += R.range(-1, 1) * box[2] * 0.12; }
      const c = new THREE.CatmullRomCurve3(cps); for (let i = 0; i < dots; i++) pts.push(c.getPoint(i / (dots - 1)));
    }
    const mk = (sel, sz) => { const arr = []; pts.forEach((p, i) => { if (sel(i)) arr.push(p.x, p.y, p.z); }); const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const m = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, size: sz, sizeAttenuation: true, color: COL(color).multiplyScalar(gain), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.frustumCulled = false; return m; };
    g.add(mk((i) => i % 3 !== 0, size)); g.add(mk((i) => i % 3 === 0, size * 1.7));
    g.setOpacity = (v) => g.children.forEach((c) => { c.material.opacity = v; });
    return g;
  };

  // ---- analytic depth of field. The engine blurs by jittering the lens, which at low sample counts shows as
  // ghost copies on small bright things. These three helpers draw from the UN-jittered camera (kit.lens.view,
  // set by the engine every sub-frame) and widen themselves by the thin-lens blur circle instead: smooth bokeh
  // discs, soft cards and soft rings at any sample count.
  kit.lens = { view: { value: new THREE.Matrix4() }, focus: { value: 5 }, aperture: { value: 0 }, px: { value: 1080 } };
  /** points for bead strings: [[x,y,z,size]…], beads graded large in the middle, tiny at the ends */
  kit.stringPoints = (o = {}) => {
    const { strings = 6, dots = 46, box = [16, 9, 8], center = [0, 0, 0], size = 0.11, seed = 5 } = o; const R = rng(seed); const out = [];
    for (let s = 0; s < strings; s++) {
      const cps = []; let x = (R() - 0.5) * box[0], y = (R() - 0.5) * box[1], z = (R() - 0.5) * box[2]; let a = R() * TAU;
      for (let k = 0; k < 6; k++) { cps.push(new THREE.Vector3(center[0] + x, center[1] + y, center[2] + z)); a += R.range(-1.2, 1.2); x += Math.cos(a) * box[0] * 0.22; y += Math.sin(a) * box[1] * 0.3; z += R.range(-1, 1) * box[2] * 0.12; }
      const c = new THREE.CatmullRomCurve3(cps); const big = R.range(0.65, 1.5);
      for (let i = 0; i < dots; i++) { const p = c.getPoint(i / (dots - 1)); const taper = 0.35 + 0.65 * Math.pow(Math.sin(Math.PI * i / (dots - 1)), 0.8); out.push([p.x, p.y, p.z, size * big * taper]); }
    }
    return out;
  };
  /** additive bokeh points. pts: [[x,y,z,diameter]…] */
  kit.bokeh = (pts, o = {}) => {
    const { color = '#ffffff', opacity = 1, gain = 1, floor = 0.17 } = o;
    const pos = new Float32Array(pts.length * 3), sc = new Float32Array(pts.length); pts.forEach((p, i) => { pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2]; sc[i] = p[3] ?? 0.1; });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aScale', new THREE.BufferAttribute(sc, 1));
    const mat = new THREE.ShaderMaterial({ uniforms: { uView: kit.lens.view, uFocus: kit.lens.focus, uAperture: kit.lens.aperture, uPx: kit.lens.px, uColor: { value: COL(color).multiplyScalar(gain) }, uOpacity: { value: opacity }, uFloor: { value: floor } },
      vertexShader: `uniform mat4 uView; uniform float uFocus; uniform float uAperture; uniform float uPx; attribute float aScale; varying float vA;
        void main(){ vec4 mv = uView * modelMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.05); float coc = 2.0 * uAperture * abs(d - uFocus) / max(uFocus, 0.01);
          float core = aScale * 1.6; float tot = core + coc; gl_Position = projectionMatrix * mv; gl_PointSize = min(tot * uPx * 0.5 * projectionMatrix[1][1] / d, 700.0); vA = (core * core) / (tot * tot); }`,
      fragmentShader: `uniform vec3 uColor; uniform float uOpacity; uniform float uFloor; varying float vA;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float k = 1.0 - vA;
          float soft = smoothstep(1.0, 0.0, r); soft = soft * soft * 1.6;                                   // in focus: a small glowing bead
          float disc = smoothstep(1.0, 0.86, r) * (0.7 + 0.3 * smoothstep(0.5, 0.95, r));                 // out of focus: a flat disc with a brighter rim
          float a = mix(min(soft, 1.0), disc * max(vA * 2.2, uFloor), smoothstep(0.03, 0.55, k)); gl_FragColor = vec4(uColor * a * uOpacity, 1.0); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const m = new THREE.Points(geo, mat); m.frustumCulled = false; m.setOpacity = (v) => { mat.uniforms.uOpacity.value = v; }; return m;
  };
  /** soft card / disc / ring: rounded-rect SDF whose edges and outline blur with defocus.
   *  {w,h,r (corner radius; r >= min(w,h)/2 gives a disc), fill, fillA (0 = outline only), line, ow, additive} */
  kit.soft = (o = {}) => {
    const { w = 1, h = 1, r = 0.05, fill = '#030506', fillA = 1, line = '#c2ced6', ow = 0.02, gain = 1, opacity = 1, additive = false } = o; const pad = 0.9;
    const mat = new THREE.ShaderMaterial({ uniforms: { uView: kit.lens.view, uFocus: kit.lens.focus, uAperture: kit.lens.aperture, uHalf: { value: new THREE.Vector2(w / 2, h / 2) }, uR: { value: Math.min(r, w / 2, h / 2) }, uOw: { value: ow }, uFill: { value: COL(fill) }, uFillA: { value: fillA }, uLine: { value: COL(line).multiplyScalar(gain) }, uOpacity: { value: opacity } },
      vertexShader: `uniform mat4 uView; uniform float uFocus; uniform float uAperture; varying vec2 vP; varying float vCoc;
        void main(){ vP = position.xy; vec4 mv = uView * modelMatrix * vec4(position, 1.0); float d = max(-mv.z, 0.05); vCoc = uAperture * abs(d - uFocus) / max(uFocus, 0.01); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec2 uHalf; uniform float uR; uniform float uOw; uniform vec3 uFill; uniform float uFillA; uniform vec3 uLine; uniform float uOpacity; varying vec2 vP; varying float vCoc;
        float sdRR(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
        void main(){ float d = sdRR(vP, uHalf, uR); float s = max(vCoc, fwidth(d) * 0.75);
          float inside = (1.0 - smoothstep(-s, s, d)) * uFillA; float sg = s * 0.55 + uOw * 0.5; float dl = d + uOw * 0.5;
          float ln = exp(-dl * dl / (2.0 * sg * sg)) * min(1.0, uOw / (uOw * 0.5 + s * 0.9));
          vec3 col = mix(uFill, uLine, clamp(ln, 0.0, 1.0)); float a = clamp(max(inside, ln), 0.0, 1.0) * uOpacity; gl_FragColor = vec4(${additive ? 'uLine * ln * uOpacity, 1.0' : 'col, a'}); }`,
      transparent: true, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w + pad * 2, h + pad * 2), mat); m.setOpacity = (v) => { mat.uniforms.uOpacity.value = v; }; return m;
  };

  // ---- designed detail: impact bursts, dial graphics, light beams (all additive, all cheap) ---------------------
  /** Impact burst when a word lands. hits: [{rf, at:[x,y,z], size, color, sparks}]. Call .update(rf) every frame.
   *  Each hit: two expanding rings, a fan of sparks that fly out and die, a soft flash behind, a few glints. */
  kit.impactFX = (hits) => {
    const g = new THREE.Group();
    const items = hits.map((h, hi) => { const R = rng(900 + hi * 7 + Math.round(h.rf * 3)); const s = h.size ?? 1.5; const col = h.color || '#ffffff'; const grp = new THREE.Group(); grp.position.set(...h.at); grp.visible = false;
      const ring = kit.plate(tex.ringThin, 1, 1, { additive: true, color: col, opacity: 0 }), ring2 = kit.plate(tex.ring, 1, 1, { additive: true, color: col, opacity: 0 }), glow = kit.plate(tex.glow, s * 4, s * 2.4, { additive: true, color: col, opacity: 0 }); glow.position.z = -0.4;
      const sparks = []; for (let i = 0, n = h.sparks ?? 26; i < n; i++) { const a = R() * TAU; const m = kit.plate(tex.streak, 1, 1, { additive: true, color: i % 3 ? col : '#ffffff', opacity: 0 }); m.rotation.z = a; m.userData = { a, v: R.range(0.55, 1.5) * s, len: R.range(0.25, 0.7) * s, w: R.range(0.02, 0.05) * s, d: R.range(0, 1.6), z: R.range(-0.3, 0.5) }; grp.add(m); sparks.push(m); }
      const glints = []; for (let i = 0; i < 5; i++) { const m = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, color: '#ffffff', opacity: 0 }); m.userData = { p: [R.range(-1.2, 1.2) * s, R.range(-0.5, 0.5) * s, 0.5], d: R.range(0, 4), s: R.range(0.25, 0.6) * s }; grp.add(m); glints.push(m); }
      grp.add(ring, ring2, glow); g.add(grp); return { h, s, grp, ring, ring2, glow, sparks, glints }; });
    const update = (rf) => { for (const it of items) { const t = rf - it.h.rf; const on = t > -0.5 && t < 16; it.grp.visible = on; if (!on) continue; const s = it.s, fin = sat(t * 2 + 1);
      const k1 = ease.out3(sat(t / 9)); it.ring.scale.setScalar(s * lerp(0.8, 4.2, k1)); it.ring.material.opacity = 0.9 * (1 - k1) * fin;
      const k2 = ease.out3(sat((t - 1.5) / 10)); it.ring2.scale.setScalar(s * lerp(0.5, 3.0, k2)); it.ring2.material.opacity = 0.55 * (1 - k2) * sat(t - 0.5);
      it.glow.material.opacity = 0.5 * Math.exp(-Math.max(0, t) / 3.5) * fin;
      for (const m of it.sparks) { const u = m.userData; const tt = t - u.d; if (tt <= 0) { m.material.opacity = 0; continue; } const k = ease.out3(sat(tt / 9)); const r = s * 0.5 + u.v * k * 2.4; m.position.set(Math.cos(u.a) * r, Math.sin(u.a) * r * 0.75, u.z); m.scale.set(u.len * (1 - 0.6 * k), u.w, 1); m.material.opacity = (1 - k) * 0.95; }
      for (const m of it.glints) { const u = m.userData; const k = pulse(t, u.d + 1.5, 4, 1.5); m.position.set(...u.p); m.scale.set(u.s * (0.4 + 0.8 * k), u.s * (0.4 + 0.8 * k), 1); m.material.opacity = k; m.material.rotation = t * 0.12; } } };
    return { group: g, update };
  };
  /** Dial graphics behind a word: a dashed ring, a ring of tick marks and broken arcs, counter-rotating slowly.
   *  {center, radius, color, opacity, seed}. Call .update(rf, k) with k = visibility 0..1. Keep it BEHIND the text. */
  kit.ornaments = (o = {}) => {
    const { center = [0, 0, 0], radius = 2.6, color = '#ffffff', opacity = 0.45, seed = 3 } = o; const g = new THREE.Group(); g.position.set(...center); const R = rng(seed);
    const mk = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d'); x.translate(512, 512); x.strokeStyle = '#fff'; x.lineCap = 'butt'; draw(x); const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t; };
    const dashed = mk((x) => { x.lineWidth = 5; x.setLineDash([46, 30]); x.beginPath(); x.arc(0, 0, 470, 0, TAU); x.stroke(); x.setLineDash([]); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 440, 0, TAU); x.stroke(); });
    const ticks = mk((x) => { for (let i = 0; i < 72; i++) { const a = (i / 72) * TAU, l = i % 6 === 0 ? 46 : 20; x.lineWidth = i % 6 === 0 ? 6 : 3; x.beginPath(); x.moveTo(Math.cos(a) * 480, Math.sin(a) * 480); x.lineTo(Math.cos(a) * (480 - l), Math.sin(a) * (480 - l)); x.stroke(); } });
    const arcs = mk((x) => { x.lineWidth = 9; for (let i = 0; i < 3; i++) { x.beginPath(); x.arc(0, 0, 420, i * 2.1 + 0.2, i * 2.1 + 1.3); x.stroke(); } x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 380, 0.4, 5.2); x.stroke(); });
    const L = [[dashed, 2.0, 0.006, -0.5, 1], [ticks, 2.45, -0.004, -0.9, 0.7], [arcs, 1.55, 0.011, -0.3, 1]].map(([t, k, sp, z, om]) => { const m = kit.plate(t, radius * k, radius * k, { additive: true, color, opacity }); m.position.z = z; m.userData = { sp, ph: R() * 6, om }; g.add(m); return m; });
    const update = (rf, k = 1) => { for (const m of L) { m.rotation.z = m.userData.ph + rf * m.userData.sp; m.material.opacity = opacity * k * m.userData.om; } g.visible = k > 0.003; };
    return { group: g, update };
  };
  /** Soft light shafts fanning out from a point behind a word. {center, count, len, color, opacity, seed, spread}. .update(rf, k) */
  kit.beams = (o = {}) => {
    const { center = [0, 0, -1], count = 9, len = 9, color = '#ffffff', opacity = 0.14, seed = 5, spread = TAU } = o; const g = new THREE.Group(); g.position.set(...center); const R = rng(seed); const list = [];
    for (let i = 0; i < count; i++) { const m = kit.plate(tex.streak, len, R.range(0.5, 1.6), { additive: true, color, opacity }); m.userData = { a: (i / count) * spread + R.range(-0.2, 0.2), sp: R.range(0.002, 0.006) * (i % 2 ? 1 : -1), o: R.range(0.5, 1) }; g.add(m); list.push(m); }
    const update = (rf, k = 1) => { for (const m of list) { const u = m.userData; const a = u.a + rf * u.sp; m.rotation.z = a; m.position.set(Math.cos(a) * len * 0.5, Math.sin(a) * len * 0.5, 0); m.material.opacity = opacity * u.o * k * (0.7 + 0.3 * Math.sin(rf * 0.07 + u.a * 3)); } g.visible = k > 0.003; };
    return { group: g, update };
  };

  // ---- anamorphic lens flare
  kit.flare = (o = {}) => {
    const { color = '#49d6ff', size = 1, streak = 7, ghosts = true, gain = 1 } = o; const g = new THREE.Group(); const c = COL(color);
    const add = (t, w, h, col, op) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[t], color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, toneMapped: false })); s.scale.set(w * size, h * size, 1); g.add(s); return s; };
    g.core = add('core', 1.5, 1.5, COL('#ffffff').multiplyScalar(gain), 1); g.halo = add('glow', 3.4, 3.4, c.clone().multiplyScalar(gain), 0.75);
    g.streak = add('streak', streak, 0.22, c.clone().lerp(COL('#fff'), 0.35).multiplyScalar(gain), 0.95); g.streak2 = add('streak', streak * 0.45, 0.6, c.clone().multiplyScalar(gain), 0.4);
    if (ghosts) { [[1.6, 0.35, '#7a5cff'], [2.5, 0.22, '#ff5ca8'], [-1.2, 0.18, '#5cc8ff']].forEach(([d, s, col]) => { const gh = add('hex', s, s, COL(col).multiplyScalar(gain), 0.35); gh.position.set(d, -d * 0.12, 0); }); }
    g.setIntensity = (v) => { g.children.forEach((s) => { s.material.opacity = (s.userData.op ??= s.material.opacity) * v; }); };
    return g;
  };

  // ---- spiky sun ring with long rays
  kit.starburst = (o = {}) => {
    const { rInner = 1.0, rValley = 1.28, rTip = 2.0, spikes = 26, rays = 14, rayLen = [3.5, 7], rayW = 0.05, fill = '#c9141d', outline = '#ffd2a6', ring = '#ff2bd0', disc = '#3a0612', seed = 9, ow = 0.045, gain = 1 } = o;
    const R = rng(seed); const g = new THREE.Group();
    const build = (grow) => { const s = new THREE.Shape(); const n = spikes * 2; for (let i = 0; i < n; i++) { const a = (i / n) * TAU; const tipJ = 1 + (hash1(i * 3.7 + seed) - 0.5) * 0.5; const r = (i % 2 ? rValley : rTip * tipJ) + grow; s[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); } s.closePath(); const hole = new THREE.Path(); hole.absarc(0, 0, rInner - grow, 0, TAU, true); s.holes.push(hole); return s; };
    const mk = (shape, col, z) => { const m = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), new THREE.MeshBasicMaterial({ color: COL(col).multiplyScalar(gain), side: THREE.DoubleSide, toneMapped: false })); m.position.z = z; g.add(m); return m; };
    g.outlineMesh = mk(build(ow), outline, -0.01); g.fillMesh = mk(build(0), fill, 0);
    // long thin rays
    const rayGeo = new THREE.BufferGeometry(); const rp = [];
    for (let i = 0; i < rays; i++) { const a = (i / rays) * TAU + R.range(-0.12, 0.12); const L = R.range(rayLen[0], rayLen[1]); const w = rayW * R.range(0.6, 1.6); const ca = Math.cos(a), sa = Math.sin(a), nx = -sa, ny = ca; const r0 = rValley * 0.98; rp.push(ca * r0 + nx * w, sa * r0 + ny * w, 0, ca * r0 - nx * w, sa * r0 - ny * w, 0, ca * L, sa * L, 0); }
    rayGeo.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); g.rays = new THREE.Mesh(rayGeo, new THREE.MeshBasicMaterial({ color: COL(outline).multiplyScalar(gain * 1.05), side: THREE.DoubleSide, toneMapped: false })); g.rays.position.z = -0.02; g.add(g.rays);
    // inner disc with spokes + magenta ring
    g.disc = new THREE.Mesh(new THREE.CircleGeometry(rInner * 0.985, 64), new THREE.MeshBasicMaterial({ color: COL(disc), toneMapped: false })); g.disc.position.z = -0.03; g.add(g.disc);
    const sp = []; const ns = 9; for (let i = 0; i < ns; i++) { const a = (i / ns) * TAU + 0.2; const ca = Math.cos(a), sa = Math.sin(a), nx = -sa * 0.018 * rInner, ny = ca * 0.018 * rInner; sp.push(nx, ny, 0, -nx, -ny, 0, ca * rInner * 0.97 + nx, sa * rInner * 0.97 + ny, 0, -nx, -ny, 0, ca * rInner * 0.97 - nx, sa * rInner * 0.97 - ny, 0, ca * rInner * 0.97 + nx, sa * rInner * 0.97 + ny, 0); }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); g.spokes = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x0a0204, side: THREE.DoubleSide, toneMapped: false })); g.spokes.position.z = -0.025; g.add(g.spokes);
    g.ring = new THREE.Mesh(new THREE.RingGeometry(rInner * 0.93, rInner * 0.965, 96, 1, 0.5, TAU * 0.82), new THREE.MeshBasicMaterial({ color: COL(ring).multiplyScalar(gain * 1.1), side: THREE.DoubleSide, toneMapped: false })); g.ring.position.z = 0.005; g.add(g.ring);
    g.setColors = (c) => { if (c.fill) g.fillMesh.material.color.copy(COL(c.fill)); if (c.outline) { g.outlineMesh.material.color.copy(COL(c.outline)); g.rays.material.color.copy(COL(c.outline)); } if (c.disc) g.disc.material.color.copy(COL(c.disc)); if (c.ring) g.ring.material.color.copy(COL(c.ring)); };
    return g;
  };

  // ---- radial wedge panels (the red polygon fan / magenta panels)
  kit.panelFan = (o = {}) => {
    const { count = 7, r0 = 0.6, r1 = 16, gap = 0.035, colors = ['#e01a22', '#c4121a', '#f0343a'], seed = 4, rotate = 0, edgeDark = 0.55 } = o; const R = rng(seed); const g = new THREE.Group(); let a = rotate;
    const spans = Array.from({ length: count }, () => R.range(0.6, 1.5)); const tot = spans.reduce((x, y) => x + y, 0);
    spans.forEach((sp, i) => { const da = (sp / tot) * TAU; const a0 = a + gap, a1 = a + da - gap; a += da; const pos = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], col = []; const c = COL(colors[i % colors.length]); const cd = c.clone().multiplyScalar(edgeDark);
      const P = [[Math.cos(a0) * r0, Math.sin(a0) * r0], [Math.cos(a0) * r1, Math.sin(a0) * r1], [Math.cos(a1) * r1, Math.sin(a1) * r1], [Math.cos(a1) * r0, Math.sin(a1) * r0]]; const verts = [P[0], P[1], P[2], P[0], P[2], P[3]]; const arr = []; verts.forEach((p, k) => { arr.push(p[0], p[1], 0); const inner = (k === 0 || k === 3 || k === 5); const cc = inner ? c : cd; col.push(cc.r, cc.g, cc.b); });
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false })); m.position.z = -R() * 0.6; g.add(m); });
    return g;
  };

  // ---- background shader planes
  const BG_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
  const BG_FS = {
    ripple: `uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uRings; uniform float uVig; varying vec2 vUv;
      void main(){ vec2 p = (vUv-0.5)*vec2(1.78,1.0); float r = length(p); float w = sin(r*uRings - uTime*3.0)*0.5+0.5; w = smoothstep(0.15,0.85,w);
        vec3 col = mix(uB, uA, smoothstep(0.75, 0.0, r)); col = mix(col, uC, w*0.42*smoothstep(1.0,0.05,r)); col *= mix(1.0, smoothstep(1.05,0.25,r), uVig); gl_FragColor = vec4(col,1.0); }`,
    grad: `uniform vec3 uA; uniform vec3 uB; uniform float uVig; uniform float uTime; uniform vec2 uCenter; uniform float uScale; varying vec2 vUv;
      void main(){ vec2 p = (vUv-uCenter)*vec2(1.78,1.0)*uScale; float r = length(p); vec3 col = mix(uA, uB, smoothstep(0.0, 0.85, r)); col *= mix(1.0, smoothstep(1.2,0.3,r), uVig); gl_FragColor = vec4(col,1.0); }`,
    ink: `uniform sampler2D tNoise; uniform vec3 uA; uniform vec3 uB; uniform vec3 uC; uniform float uTime; uniform float uScale; varying vec2 vUv;
      float n(vec2 p){ return texture2D(tNoise, p).r; }
      void main(){ vec2 p = vUv*uScale; vec2 q = vec2(n(p*0.6 + uTime*0.11), n(p*0.6 + 3.1 - uTime*0.09)); vec2 r2 = vec2(n(p*1.3 + q*1.6 + uTime*0.21), n(p*1.3 + q*1.6 + 7.7));
        float f = n(p*1.1 + r2*1.9 + uTime*0.05); float g = n(p*2.3 - q*1.2);
        vec3 col = mix(uB, uA, smoothstep(0.32,0.62,f)); col = mix(col, uC, smoothstep(0.58,0.86,f*0.6+g*0.55)); col *= 0.55 + 0.75*smoothstep(0.2,0.8,r2.x);
        gl_FragColor = vec4(col,1.0); }`,
  };
  kit.bg = (type, o = {}) => {
    const { w = 60, h = 34, a = '#ff2a2a', b = '#3a0206', c = '#ff9a8a', rings = 46, vig = 0.8, scale = 1, center = [0.5, 0.5] } = o;
    const uniforms = { uA: { value: COL(a) }, uB: { value: COL(b) }, uC: { value: COL(c) }, uTime: { value: 0 }, uRings: { value: rings }, uVig: { value: vig }, uScale: { value: scale }, uCenter: { value: new THREE.Vector2(center[0], center[1]) }, tNoise: { value: tex.noise } };
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.ShaderMaterial({ vertexShader: BG_VS, fragmentShader: BG_FS[type], uniforms, depthWrite: false })); m.renderOrder = -10; m.u = uniforms; return m;
  };

  // ---- lit sphere with atmosphere rim (planet / moon)
  kit.planet = (o = {}) => {
    const { radius = 6, map = tex.planet, light = [1, 0.5, 0.7], atmo = '#38d6ff', atmoAmt = 1.1, night = '#020812', gain = 1.1, repeat = [1, 1] } = o;
    const uniforms = { tMap: { value: map }, uLight: { value: V3(light).clone().normalize() }, uAtmo: { value: COL(atmo) }, uAtmoAmt: { value: atmoAmt }, uNight: { value: COL(night) }, uGain: { value: gain }, uRepeat: { value: new THREE.Vector2(repeat[0], repeat[1]) }, uSpin: { value: 0 } };
    const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 64), new THREE.ShaderMaterial({ uniforms,
      vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 wp = modelMatrix*vec4(position,1.0); vV = normalize(cameraPosition - wp.xyz); gl_Position = projectionMatrix*viewMatrix*wp; }`,
      fragmentShader: `uniform sampler2D tMap; uniform vec3 uLight; uniform vec3 uAtmo; uniform vec3 uNight; uniform float uAtmoAmt; uniform float uGain; uniform vec2 uRepeat; uniform float uSpin; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
        void main(){ vec3 n = normalize(vN); vec3 tex = texture2D(tMap, vec2(vUv.x*uRepeat.x + uSpin, vUv.y*uRepeat.y)).rgb; float d = dot(n, uLight); float day = smoothstep(-0.12, 0.42, d);
          vec3 col = mix(uNight + tex*0.05, tex*(0.35+0.95*day), day); float fr = pow(1.0 - clamp(dot(n, vV),0.0,1.0), 2.4); col += uAtmo * fr * uAtmoAmt * (0.25 + 0.9*day);
          gl_FragColor = vec4(col*uGain, 1.0); }` }));
    m.u = uniforms; return m;
  };

  // ---- starfield
  kit.starfield = (o = {}) => { const { count = 700, radius = 80, seed = 2, size = 0.35, color = '#ffffff' } = o; const R = rng(seed); const arr = []; for (let i = 0; i < count; i++) { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); const rr = radius * R.range(0.7, 1); arr.push(Math.cos(a) * s * rr, u * rr, Math.sin(a) * s * rr); } const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3)); const m = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, size, sizeAttenuation: true, color: COL(color), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.frustumCulled = false; return m; };

  // ---- floating dust / embers (tiny additive points that drift and wrap inside a box)
  kit.dust = (o = {}) => {
    const { count = 180, box = [16, 9, 8], center = [0, 0, 0], size = 0.05, seed = 3, color = '#ffffff', opacity = 0.75, gain = 1 } = o; const R = rng(seed);
    const base = new Float32Array(count * 3), arr = new Float32Array(count * 3), ph = new Float32Array(count);
    for (let i = 0; i < count; i++) { base[i * 3] = (R() - 0.5) * box[0]; base[i * 3 + 1] = (R() - 0.5) * box[1]; base[i * 3 + 2] = (R() - 0.5) * box[2]; ph[i] = R() * 100; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const m = new THREE.Points(geo, new THREE.PointsMaterial({ map: tex.dot, size, sizeAttenuation: true, color: COL(color).multiplyScalar(gain), transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false })); m.frustumCulled = false;
    const wrap = (v, h) => ((((v + h) % (2 * h)) + 2 * h) % (2 * h)) - h;
    /** vel = world units per frame [x,y,z]; sway adds a little turbulence */
    m.drift = (rf, vel = [0.0, 0.006, 0.0], sway = 0.06) => { for (let i = 0; i < count; i++) { const k = i * 3; arr[k] = center[0] + wrap(base[k] + vel[0] * rf + Math.sin(rf * 0.04 + ph[i]) * sway, box[0] / 2); arr[k + 1] = center[1] + wrap(base[k + 1] + vel[1] * rf, box[1] / 2); arr[k + 2] = center[2] + wrap(base[k + 2] + vel[2] * rf + Math.cos(rf * 0.03 + ph[i]) * sway, box[2] / 2); } geo.attributes.position.needsUpdate = true; return m; };
    m.drift(0); return m;
  };

  // ---- sprite from the local pack (white-on-black images, added to the picture); a hidden dummy if absent
  kit.sprite = (name, h = 1, o = {}) => { const t = tex.pack && tex.pack[name]; if (!t) { const d = new THREE.Object3D(); d.visible = false; d.material = { opacity: 0, color: new THREE.Color(), rotation: 0 }; d.missing = true; return d; } const a = (t.userData && t.userData.aspect) || 1; return kit.plate(t, h * a, h, { additive: true, ...o }); };
  kit.has = (clip) => !!(tex.ovl && tex.ovl[clip]);

  // ---- flat shape from a list of [x,y] points
  kit.poly = (pts, o = {}) => { const { color = '#ffffff', gain = 1, opacity = 1 } = o; const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))); const geo = new THREE.ShapeGeometry(s); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.22, uv.getY(i) * 0.22); return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: COL(color).multiplyScalar(gain), map: o.grain === true ? (tex.wood || null) : null, side: THREE.DoubleSide, transparent: opacity < 1, opacity, toneMapped: false })); };

  // ---- camera keyframes: [{rf, p:[x,y,z], t:[x,y,z], roll:deg, fov:deg, e:'io3'}]
  kit.cam = (keys, rf) => {
    let a = keys[0], b = keys[0];
    if (rf >= keys[keys.length - 1].rf) a = b = keys[keys.length - 1];
    else if (rf > keys[0].rf) { let i = 1; while (keys[i].rf < rf) i++; a = keys[i - 1]; b = keys[i]; }
    const t = a === b ? 0 : (ease[b.e] || ease.io3)((rf - a.rf) / (b.rf - a.rf || 1e-6));
    const L = (x, y) => lerp(x, y, t);
    return { pos: new THREE.Vector3(L(a.p[0], b.p[0]), L(a.p[1], b.p[1]), L(a.p[2], b.p[2])), tgt: new THREE.Vector3(L(a.t[0], b.t[0]), L(a.t[1], b.t[1]), L(a.t[2], b.t[2])), roll: L(a.roll || 0, b.roll || 0) * (kit.rollScale ?? 1), fov: L(a.fov || 40, b.fov || 40) };
  };
  kit.rollScale = 0.55;   // camera rolls are damped: the moves stay, the twisting is calmer
  /** hand-held shake in world units, add to camera pos/tgt */
  kit.shake = (rf, amp = 0.03, freq = 0.35, seed = 0) => new THREE.Vector3(wobble(rf * freq, seed) * amp, wobble(rf * freq, seed + 7) * amp, 0);

  return kit;
}
