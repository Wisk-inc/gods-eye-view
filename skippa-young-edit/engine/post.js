// Post pipeline. Per output frame:
//   1. N sub-frame renders are accumulated in a float buffer  -> real motion blur + anti-aliasing
//   2. bright-pass + 4-level gaussian pyramid                -> bloom / glow
//   3. one composite shader applies every "editor" effect of the reference:
//      camera shake/zoom/roll, mirror edges, turbulent displace, slice + block glitch, radial zoom blur,
//      chromatic aberration / RGB split, edge-detect, grade (exposure, contrast, saturation, tint, invert),
//      vignette, flat fill + shutter band, smoke wipe, iris disc / iris hole with coloured rim,
//      flash, fade, letterbox bars, watermark, grain, film scratches.
import * as THREE from 'three';

export const POST_DEFAULTS = {
  exposure: 1, contrast: 1.06, saturation: 1.08, desat: 0, tint: [1, 1, 1], invert: 0,
  bloom: 0.6, bloomThreshold: 0.8, bloomTint: [1, 1, 1],
  vignette: 0.55, chroma: 0.0012, zoomBlur: 0, zoomCenter: [0.5, 0.5],
  warp: 0, warpScale: 2.2,
  flash: 0, flashColor: [1, 1, 1], fade: 0,
  irisDisc: 0, irisHole: 9, irisRim: [1, 0.04, 0.08], irisRimW: 0.16, irisCenter: [0.5, 0.5], irisBg: [1, 1, 1],
  bars: 0, barsAlpha: 0.9,
  flat: 0, flatColor: [0.5, 0.5, 0.5], band: 0, bandColor: [1, 1, 1],
  mirror: 0, slices: 0, glitch: 0, edge: 0, rgbSplit: 0,
  smoke: 0, smokeColor: [0.18, 0.55, 1.0],
  grain: 0.035, scratches: 0,
  shake: [0, 0], zoom: 1, rotate: 0,
  leak: 0, leakColor: [1, 0.35, 0.2], leakPos: [0.1, 0.9], leakSize: 0.9,
  lens: 0, rays: 0, raysCenter: [0.5, 0.5],
  sharpen: 0.3,
  mark: 0.38,
};

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FS_ADD = `uniform sampler2D tDiffuse; uniform float uWeight; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(tDiffuse, vUv).rgb * uWeight, 1.0); }`;
const FS_BRIGHT = `uniform sampler2D tDiffuse; uniform float uThr; varying vec2 vUv;
void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb; float l = mix(max(c.r, max(c.g, c.b)), dot(c, vec3(0.299, 0.587, 0.114)), 0.7); float k = smoothstep(uThr, uThr + 0.35, l); gl_FragColor = vec4(min(c, vec3(4.0)) * k, 1.0); }`;
const FS_BLUR = `uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227027;
  c += (texture2D(tDiffuse, vUv + uDir*1.3846).rgb + texture2D(tDiffuse, vUv - uDir*1.3846).rgb) * 0.316216;
  c += (texture2D(tDiffuse, vUv + uDir*3.2308).rgb + texture2D(tDiffuse, vUv - uDir*3.2308).rgb) * 0.070270;
  gl_FragColor = vec4(c, 1.0); }`;

const FS_FINAL = /* glsl */ `
precision highp float;
uniform sampler2D tScene; uniform sampler2D tB0; uniform sampler2D tB1; uniform sampler2D tB2; uniform sampler2D tB3; uniform sampler2D tMark; uniform sampler2D tNoise;
uniform vec2 uRes; uniform float uTime;
uniform float uExposure; uniform float uContrast; uniform float uSaturation; uniform float uDesat; uniform float uInvert; uniform vec3 uTint;
uniform float uBloom; uniform vec3 uBloomTint;
uniform float uVignette; uniform float uChroma; uniform float uZoomBlur; uniform vec2 uZoomCenter;
uniform float uWarp; uniform float uWarpScale;
uniform float uFlash; uniform float uFade; uniform vec3 uFlashColor;
uniform float uIrisDisc; uniform float uIrisHole; uniform float uIrisRimW; uniform vec3 uIrisRim; uniform vec3 uIrisBg; uniform vec2 uIrisCenter;
uniform float uBars; uniform float uBarsAlpha;
uniform float uFlat; uniform float uBand; uniform vec3 uFlatColor; uniform vec3 uBandColor;
uniform float uMirror; uniform float uSlices; uniform float uGlitch; uniform float uEdge; uniform float uRgbSplit;
uniform float uSmoke; uniform vec3 uSmokeColor;
uniform float uGrain; uniform float uScratches;
uniform vec2 uShake; uniform float uZoom; uniform float uRotate;
uniform float uMark; uniform vec4 uMarkRect;
uniform float uLeak; uniform vec3 uLeakColor; uniform vec2 uLeakPos; uniform float uLeakSize; uniform float uSharpen;
uniform float uLens; uniform float uRays; uniform vec2 uRaysCenter;
varying vec2 vUv;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float nz(vec2 p){ return texture2D(tNoise, p).r; }
float fbm(vec2 p){ return nz(p)*0.62 + nz(p*2.03 + 3.1)*0.26 + nz(p*4.1 + 7.7)*0.12; }
vec2 mir(vec2 uv){ vec2 m = mod(uv, 2.0); return mix(m, 2.0 - m, step(1.0, m)); }

void main(){
  float aspect = uRes.x / uRes.y;
  vec2 uv = vUv;
  // ---- global transform
  vec2 c = uv - 0.5; c.x *= aspect; float cr = cos(uRotate), sr = sin(uRotate); c = mat2(cr, -sr, sr, cr) * c; c /= uZoom; c.x /= aspect; uv = c + 0.5 + uShake;
  // ---- lens distortion (optics compensation): + bulges outward, - pinches
  if (abs(uLens) > 0.0005) { vec2 lc = uv - 0.5; vec2 la = lc * vec2(aspect, 1.0); uv = 0.5 + lc * (1.0 + uLens * dot(la, la)) / (1.0 + uLens * 0.2); }
  uv = (uv - 0.5) * (1.0 + uMirror * 0.35) + 0.5;
  // ---- turbulent displace (liquid / ink smear)
  if (uWarp > 0.0005) { vec2 q = uv * vec2(aspect, 1.0) * uWarpScale * 0.17; vec2 d = vec2(fbm(q + vec2(uTime*0.13, 0.0)), fbm(q + vec2(5.2, uTime*0.11))) - 0.5; uv += d * uWarp; }
  // ---- horizontal slice glitch
  if (uSlices > 0.001) { float band = floor(uv.y * 34.0); float h = hash(vec2(band, floor(uTime*30.0))); float on = step(1.0 - 0.3*uSlices, h); uv.x += on * (hash(vec2(band*1.7, 3.0)) - 0.5) * 0.12 * uSlices; }
  // ---- block glitch
  if (uGlitch > 0.001) { vec2 blk = floor(uv * vec2(7.0, 15.0)); float h = hash(blk + floor(uTime*30.0)*1.37); float on = step(1.0 - 0.5*uGlitch, h); uv.x += on * (hash(blk*2.3) - 0.5) * 0.45 * uGlitch; }
  // ---- sample scene: zoom blur + chromatic aberration
  vec2 zc = uZoomCenter; vec2 dir = uv - zc; float ca = uChroma + uRgbSplit * 0.01; vec3 col;
  if (uZoomBlur > 0.001) {
    vec3 acc = vec3(0.0); float tw = 0.0;
    for (int i = 0; i < 16; i++) { float f = (float(i) + hash(gl_FragCoord.xy + float(i)*7.3)) / 16.0; float s = 1.0 - uZoomBlur * 0.45 * f; float w = 1.0 - f*0.55; vec2 p = zc + dir * s;
      acc.r += texture2D(tScene, mir(p + dir*ca*5.0)).r * w; acc.g += texture2D(tScene, mir(p)).g * w; acc.b += texture2D(tScene, mir(p - dir*ca*5.0)).b * w; tw += w; }
    col = acc / tw;
  } else {
    col.r = texture2D(tScene, mir(uv + dir*ca)).r; col.g = texture2D(tScene, mir(uv)).g; col.b = texture2D(tScene, mir(uv - dir*ca)).b;
    if (uSharpen > 0.001) { vec2 px = 1.0 / uRes; vec3 nb = (texture2D(tScene, mir(uv + vec2(px.x, 0.0))).rgb + texture2D(tScene, mir(uv - vec2(px.x, 0.0))).rgb + texture2D(tScene, mir(uv + vec2(0.0, px.y))).rgb + texture2D(tScene, mir(uv - vec2(0.0, px.y))).rgb) * 0.25; col += (texture2D(tScene, mir(uv)).rgb - nb) * uSharpen; }
  }
  if (uRgbSplit > 0.001) { col.r = texture2D(tScene, mir(uv + vec2(uRgbSplit*0.018, 0.0))).r; col.b = texture2D(tScene, mir(uv - vec2(uRgbSplit*0.018, 0.0))).b; }
  vec2 buv = mir(uv);
  vec3 bl = texture2D(tB0, buv).rgb*0.34 + texture2D(tB1, buv).rgb*0.28 + texture2D(tB2, buv).rgb*0.22 + texture2D(tB3, buv).rgb*0.18;
  col += bl * uBloom * uBloomTint;
  // ---- light rays (shine): the bright pass smeared outward from a centre
  if (uRays > 0.001) { vec3 ra = vec3(0.0); for (int i = 0; i < 14; i++) { float f = (float(i) + hash(gl_FragCoord.xy + float(i)*3.1)) / 14.0; ra += texture2D(tB1, mir(buv + (uRaysCenter - buv) * f * 0.6)).rgb * (1.0 - f); } col += ra / 5.0 * uRays * uBloomTint; }
  // ---- edge-detect (contour glitch frame)
  if (uEdge > 0.001) { vec2 px = 1.5 / uRes; float l0 = dot(texture2D(tScene, buv).rgb, vec3(0.333)); float lx = dot(texture2D(tScene, buv + vec2(px.x, 0.0)).rgb, vec3(0.333)); float ly = dot(texture2D(tScene, buv + vec2(0.0, px.y)).rgb, vec3(0.333)); float e = clamp(length(vec2(lx - l0, ly - l0)) * 10.0, 0.0, 1.0); col = mix(col, vec3(e) * vec3(0.8, 1.0, 0.86), uEdge); }
  // ---- grade
  col *= uExposure;
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(l), col, uSaturation * (1.0 - uDesat));
  col = (col - 0.5) * uContrast + 0.5;
  col *= uTint; col = max(col, 0.0);
  col = mix(col, 1.0 - min(col, vec3(1.0)), uInvert);
  // ---- vignette
  vec2 vq = (vUv - 0.5) * vec2(aspect, 1.0); float vr = length(vq) / length(vec2(aspect*0.5, 0.5));
  col *= mix(1.0, smoothstep(1.18, 0.32, vr), uVignette * (1.0 - uInvert));
  // ---- flat fill + shutter band
  col = mix(col, uFlatColor, uFlat);
  if (uBand > 0.0001) { float b = 1.0 - smoothstep(uBand - 0.0015, uBand + 0.0015, abs(vUv.y - 0.5)); col = mix(col, uBandColor, b); }
  // ---- smoke wipe (surges from bottom-left, blue leading edge)
  if (uSmoke > 0.001) { float d = vUv.x*0.7 + vUv.y*0.3; float n = fbm(vUv*vec2(aspect, 1.0)*0.55 + vec2(-uTime*0.22, uTime*0.09)) + 0.35*nz(vUv*1.7 + uTime*0.05); float k = uSmoke*1.75 - 0.2 - d - (n - 0.6)*0.6;
    float m = smoothstep(0.0, 0.1, k); float edge = smoothstep(-0.16, 0.0, k) * (1.0 - m); col = mix(col, uSmokeColor*1.25 + 0.1, edge*0.92); col = mix(col, vec3(1.0), m); col = mix(col, uSmokeColor + 0.35, m * smoothstep(0.55, 0.9, n) * 0.35); }
  // ---- iris: hole (scene inside, bg outside, coloured rim) and disc (bg colour growing from the centre)
  vec2 ic = (vUv - uIrisCenter) * vec2(aspect, 1.0); float id = length(ic);
  if (uIrisHole < 8.0) { float outside = smoothstep(uIrisHole - 0.006, uIrisHole + 0.03, id); float rim = smoothstep(uIrisHole - uIrisRimW, uIrisHole - uIrisRimW*0.3, id) * (1.0 - outside); col = mix(col, uIrisRim, rim); col = mix(col, uIrisBg, outside); }
  if (uIrisDisc > 0.0001) { float inside = 1.0 - smoothstep(uIrisDisc - 0.014, uIrisDisc + 0.004, id); float drim = (1.0 - smoothstep(uIrisDisc, uIrisDisc + 0.045, id)) * (1.0 - inside); col = mix(col, uIrisRim, drim*0.9); col = mix(col, uIrisBg, inside); }
  // ---- light leak (additive coloured glow from a corner)
  if (uLeak > 0.001) { float ld = distance(vUv * vec2(aspect, 1.0), uLeakPos * vec2(aspect, 1.0)); float lk = smoothstep(uLeakSize, 0.0, ld); col += uLeakColor * uLeak * lk * lk * (0.75 + 0.5 * fbm(vUv * 0.35 + vec2(uTime * 0.05, 0.0))); }
  // ---- flash / fade
  col = mix(col, uFlashColor, uFlash); col *= (1.0 - uFade);
  // ---- letterbox bars (drawn over flashes, like the reference)
  if (uBars > 0.0001) { float bar = clamp(step(vUv.y, uBars) + step(1.0 - uBars, vUv.y), 0.0, 1.0); col = mix(col, vec3(0.0), bar * uBarsAlpha); }
  // ---- watermark
  vec2 muv = (vUv - uMarkRect.xy) / uMarkRect.zw + 0.5;
  if (uMark > 0.001 && muv.x > 0.0 && muv.x < 1.0 && muv.y > 0.0 && muv.y < 1.0) { float a = texture2D(tMark, muv).a; float lum = dot(col, vec3(0.333)); col = mix(col, vec3(step(lum, 0.55)), a * uMark); }
  // ---- grain + scratches
  col += (hash(gl_FragCoord.xy + uTime*61.0) - 0.5) * uGrain;
  if (uScratches > 0.001) { float sx = floor(gl_FragCoord.x / 2.0); float on = step(0.9962, hash(vec2(sx, floor(uTime*30.0)))); float seg = step(hash(vec2(sx*1.3, floor(vUv.y*5.0) + floor(uTime*30.0))), 0.62); col += on * seg * 0.2 * uScratches; }
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export class Post {
  constructor(renderer, w, h, tex) {
    this.r = renderer; this.w = w; this.h = h;
    const mk = (W, H, depth = false) => new THREE.WebGLRenderTarget(Math.max(2, W | 0), Math.max(2, H | 0), { type: THREE.HalfFloatType, format: THREE.RGBAFormat, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: depth, stencilBuffer: false, wrapS: THREE.ClampToEdgeWrapping, wrapT: THREE.ClampToEdgeWrapping });
    this.sceneRT = mk(w, h, true); this.accRT = mk(w, h);
    this.levels = [2, 4, 8, 16].map((d) => ({ a: mk(w / d, h / d), b: mk(w / d, h / d) }));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.quad.frustumCulled = false;
    this.fs = new THREE.Scene(); this.fs.add(this.quad);
    const sm = (fs, uniforms, extra = {}) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.mAdd = sm(FS_ADD, { tDiffuse: { value: null }, uWeight: { value: 1 } }, { transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor });
    this.mBright = sm(FS_BRIGHT, { tDiffuse: { value: null }, uThr: { value: 0.7 } });
    this.mBlur = sm(FS_BLUR, { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2() } });
    const U = (v) => ({ value: v }); const v3 = () => new THREE.Vector3(); const v2 = () => new THREE.Vector2();
    this.uF = { tScene: U(null), tB0: U(null), tB1: U(null), tB2: U(null), tB3: U(null), tMark: U(tex.mark), tNoise: U(tex.noise), uRes: U(new THREE.Vector2(w, h)), uTime: U(0),
      uExposure: U(1), uContrast: U(1), uSaturation: U(1), uDesat: U(0), uInvert: U(0), uTint: U(v3()), uBloom: U(1), uBloomTint: U(v3()), uVignette: U(0.5), uChroma: U(0), uZoomBlur: U(0), uZoomCenter: U(v2()),
      uWarp: U(0), uWarpScale: U(2), uFlash: U(0), uFade: U(0), uFlashColor: U(v3()), uIrisDisc: U(0), uIrisHole: U(9), uIrisRimW: U(0.16), uIrisRim: U(v3()), uIrisBg: U(v3()), uIrisCenter: U(v2()),
      uBars: U(0), uBarsAlpha: U(0.9), uFlat: U(0), uBand: U(0), uFlatColor: U(v3()), uBandColor: U(v3()), uMirror: U(0), uSlices: U(0), uGlitch: U(0), uEdge: U(0), uRgbSplit: U(0), uSmoke: U(0), uSmokeColor: U(v3()),
      uGrain: U(0.03), uScratches: U(0), uShake: U(v2()), uZoom: U(1), uRotate: U(0), uLeak: U(0), uLeakColor: U(v3()), uLeakPos: U(v2()), uLeakSize: U(0.9), uSharpen: U(0.3), uLens: U(0), uRays: U(0), uRaysCenter: U(v2()), uMark: U(0.4), uMarkRect: U(new THREE.Vector4(0.5, 0.03, 0.07, 0.02)) };
    this.mFinal = sm(FS_FINAL, this.uF);
    const markH = 0.021; this.uF.uMarkRect.value.set(0.5, 0.032, (markH * tex.markAspect * h) / w, markH);
  }
  begin() { const r = this.r; r.setRenderTarget(this.accRT); r.setClearColor(0x000000, 1); r.clear(true, true, false); }
  sample(scene, camera, weight, clear = 0x000000) {
    const r = this.r; r.setRenderTarget(this.sceneRT); r.setClearColor(clear, 1); r.clear(true, true, false); r.render(scene, camera);
    this.quad.material = this.mAdd; this.mAdd.uniforms.tDiffuse.value = this.sceneRT.texture; this.mAdd.uniforms.uWeight.value = weight;
    r.setRenderTarget(this.accRT); r.render(this.fs, this.cam);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.fs, this.cam); }
  finish(P, time) {
    const L = this.levels; const u = this.uF;
    // bloom pyramid
    this.mBright.uniforms.tDiffuse.value = this.accRT.texture; this.mBright.uniforms.uThr.value = P.bloomThreshold; this.pass(this.mBright, L[0].a);
    for (let i = 0; i < L.length; i++) {
      const src = i === 0 ? L[0].a : L[i - 1].a; const W = L[i].a.width, H = L[i].a.height;
      this.mBlur.uniforms.tDiffuse.value = src.texture; this.mBlur.uniforms.uDir.value.set(1 / W, 0); this.pass(this.mBlur, L[i].b);
      this.mBlur.uniforms.tDiffuse.value = L[i].b.texture; this.mBlur.uniforms.uDir.value.set(0, 1 / H); this.pass(this.mBlur, L[i].a);
    }
    u.tScene.value = this.accRT.texture; u.tB0.value = L[0].a.texture; u.tB1.value = L[1].a.texture; u.tB2.value = L[2].a.texture; u.tB3.value = L[3].a.texture; u.uTime.value = time;
    const S = (k, v) => { u[k].value = v; }; const V = (k, a) => { u[k].value.fromArray(a); };
    S('uExposure', P.exposure); S('uContrast', P.contrast); S('uSaturation', P.saturation); S('uDesat', P.desat); S('uInvert', P.invert); V('uTint', P.tint);
    S('uBloom', P.bloom); V('uBloomTint', P.bloomTint); S('uVignette', P.vignette); S('uChroma', P.chroma); S('uZoomBlur', P.zoomBlur); V('uZoomCenter', P.zoomCenter);
    S('uWarp', P.warp); S('uWarpScale', P.warpScale); S('uFlash', P.flash); S('uFade', P.fade); V('uFlashColor', P.flashColor);
    S('uIrisDisc', P.irisDisc); S('uIrisHole', P.irisHole); S('uIrisRimW', P.irisRimW); V('uIrisRim', P.irisRim); V('uIrisBg', P.irisBg); V('uIrisCenter', P.irisCenter);
    S('uBars', P.bars); S('uBarsAlpha', P.barsAlpha); S('uFlat', P.flat); S('uBand', P.band); V('uFlatColor', P.flatColor); V('uBandColor', P.bandColor);
    S('uMirror', P.mirror); S('uSlices', P.slices); S('uGlitch', P.glitch); S('uEdge', P.edge); S('uRgbSplit', P.rgbSplit); S('uSmoke', P.smoke); V('uSmokeColor', P.smokeColor);
    S('uLens', P.lens); S('uRays', P.rays); V('uRaysCenter', P.raysCenter);
    S('uLeak', P.leak); V('uLeakColor', P.leakColor); V('uLeakPos', P.leakPos); S('uLeakSize', P.leakSize); S('uSharpen', P.sharpen);
    S('uGrain', P.grain); S('uScratches', P.scratches); V('uShake', P.shake); S('uZoom', P.zoom); S('uRotate', P.rotate); S('uMark', P.mark);
    this.pass(this.mFinal, null);
  }
}
