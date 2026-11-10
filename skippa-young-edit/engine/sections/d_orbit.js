// SECTION D — "planet / alone"  (reference frames 78–118). One clean shot:
//   a real Earth (NASA world map with clouds) turning slowly under a sun high on the right, a thin blue
//   atmosphere on its limb, city lights where night begins, stars — and the gold word assembling in the clear
//   space beside it. Nothing else: no props, no rings, no figures.
//   rf 78–92   out of white: the frame settles while the planet rises a little and the camera eases back
//   rf 84–100  the letters grow up into place one after another, inside the frame
//   rf 100–110 hold: sunlight sweeps across the word, the camera drifts
//   rf 110–118 the sun blooms to white (hand-off to the white disc of the next scene)
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';
import { timeOfRf } from '../main.js';

const EARTH_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vUv = uv; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const EARTH_FS = `uniform sampler2D tDay; uniform sampler2D tNight; uniform vec3 uSun; uniform vec3 uCam; uniform float uGain;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
void main(){ vec3 n = normalize(vN), v = normalize(uCam - vW); float ndl = dot(n, uSun); float nv = max(dot(n, v), 0.0);
  vec3 day = texture2D(tDay, vUv).rgb; day = pow(day, vec3(1.3)) * 1.0;
  float lit = smoothstep(-0.1, 0.32, ndl);
  vec3 col = day * (0.012 + 0.95 * max(ndl, 0.0) + 0.05 * lit);
  float ocean = smoothstep(0.03, 0.2, day.b - max(day.r, day.g) * 0.92); vec3 h = normalize(uSun + v);
  col += vec3(1.0, 0.94, 0.82) * pow(max(dot(n, h), 0.0), 70.0) * ocean * 0.55 * lit;                                          // sun glint on open water
  vec3 night = texture2D(tNight, vUv).rgb; col += night * night * vec3(1.0, 0.78, 0.48) * 2.4 * (1.0 - smoothstep(-0.22, 0.06, ndl)); // city lights
  col = mix(col, col * vec3(1.0, 0.55, 0.3) + vec3(0.03, 0.012, 0.0), smoothstep(0.22, 0.0, ndl) * smoothstep(-0.12, 0.02, ndl) * 0.6); // warm terminator
  float fr = pow(1.0 - nv, 2.4); col = mix(col, vec3(0.32, 0.72, 1.0) * (0.06 + 1.15 * lit), fr * 0.8);                       // air thickening toward the limb
  col += vec3(0.62, 0.9, 1.0) * pow(1.0 - nv, 7.0) * lit * 1.1;
  gl_FragColor = vec4(col * uGain, 1.0); }`;
const HALO_VS = `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const HALO_FS = `uniform vec2 uSun2; uniform float uR; varying vec2 vP;
void main(){ float r = length(vP) / uR; if (r < 0.98) discard; float side = 0.16 + 0.84 * smoothstep(-0.55, 0.7, dot(normalize(vP), uSun2));
  float a = exp(-(r - 1.0) * 24.0) * smoothstep(0.98, 1.0, r); gl_FragColor = vec4((vec3(0.28, 0.66, 1.0) * a * 1.2 + vec3(0.9, 0.97, 1.0) * exp(-(r - 1.0) * 120.0) * 0.55) * side, 1.0); }`;
const GOLD = { top: '#fff6b8', bot: '#eaa21e', side: '#8a5206', sideDark: '#1e0f00', rim: '#fffde0', gain: 1.0, chrome: 0.5, rimAmt: 0.95 };

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(78);
    const EC = new THREE.Vector3(-8.1, -3.3, -15.45), ER = 9, SUN = new THREE.Vector3(0.62, 0.42, 0.66).normalize();

    // ---- space: stars only
    const stars = kit.starfield({ count: 1300, radius: 90, seed: 79, size: 0.34, color: '#e6eeff' }); group.add(stars);
    const bright = []; for (let i = 0; i < 9; i++) { const g = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, opacity: 0.0, color: i % 3 ? '#cfe2ff' : '#fff1d8' }); g.position.set(R.range(-2, 26), R.range(-10, 14), R.range(-60, -40)); g.userData = { s: R.range(0.8, 1.7), ph: R() * 9 }; group.add(g); bright.push(g); }

    // ---- the planet
    const tilt = new THREE.Group(); tilt.position.copy(EC); tilt.rotation.set(0.12, 0, 0.3); group.add(tilt);
    const eu = { tDay: { value: tex.earthDay || tex.white }, tNight: { value: tex.earthNight || tex.white }, uSun: { value: SUN }, uCam: { value: new THREE.Vector3() }, uGain: { value: 1 } };
    const earth = new THREE.Mesh(new THREE.SphereGeometry(ER, 160, 96), new THREE.ShaderMaterial({ vertexShader: EARTH_VS, fragmentShader: EARTH_FS, uniforms: eu })); tilt.add(earth);
    const hu = { uSun2: { value: new THREE.Vector2(0.8, 0.6) }, uR: { value: ER } };
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(ER * 3.2, ER * 3.2), new THREE.ShaderMaterial({ vertexShader: HALO_VS, fragmentShader: HALO_FS, uniforms: hu, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); halo.position.copy(EC); group.add(halo);

    // ---- the sun, high on the right
    const SP = new THREE.Vector3(25.4, 12.0, -52.1);
    const sun = kit.flare({ color: '#ffcf8a', size: 6.5, streak: 9, ghosts: true, gain: 1.0 }); sun.position.copy(SP); group.add(sun);
    const sunGlow = kit.plate(tex.glow, 60, 60, { color: '#ffb060', additive: true, billboard: true, opacity: 0.22 }); sunGlow.position.copy(SP); group.add(sunGlow);

    // ---- the word, in clear space beside the planet
    const WP = new THREE.Vector3(2.5, 0.1, -8.5);
    const w = kit.word(words.s07 || 'ALONE', { size: 1.3, depth: 0.5, style: GOLD, seed: 7 }); w.group.position.copy(WP); w.set('uGrit', 0.0); w.set('uFaceAmt', 0.1); w.set('uLight', new THREE.Vector3(0.6, 0.7, 0.45)); group.add(w.group);
    const wGlow = kit.plate(tex.glow, 9, 4.2, { color: '#ff9a20', additive: true, opacity: 0.0 }); wGlow.position.copy(WP).add(new THREE.Vector3(0, 0, -1.2)); group.add(wGlow);

    const _v = new THREE.Vector3(), _x = new THREE.Vector3(), _y = new THREE.Vector3();
    return { group, update(rf) {
      const t = timeOfRf(rf, ctx.cfg) - timeOfRf(78, ctx.cfg);          // seconds on screen: the planet turns at a steady rate whatever the edit's speed
      const k = prog(rf, 78, 118, 'io2');
      const pos = new THREE.Vector3(lerp(0.55, -0.5, k), lerp(-0.28, 0.16, k), lerp(1.3, -0.5, k)).add(kit.shake(rf, 0.012, 0.25, 9));
      const tgt = new THREE.Vector3(lerp(0.2, 0.38, k), lerp(-0.1, 0.02, k), -10);
      // planet: rises slightly out of the white, turns
      tilt.position.set(EC.x, EC.y - 1.3 * (1 - prog(rf, 78, 94, 'out3')), EC.z); earth.rotation.y = (ctx.cfg.earthPhase ?? 0.5) + t * 0.085;   // 0.5 puts the Caribbean in view (Jamaica near the top) eu.uCam.value.copy(pos);
      halo.position.copy(tilt.position); halo.lookAt(pos); const d = pos.distanceTo(tilt.position); hu.uR.value = ER / Math.sqrt(Math.max(0.05, 1 - (ER / d) * (ER / d)));
      halo.updateMatrixWorld(); _x.setFromMatrixColumn(halo.matrixWorld, 0); _y.setFromMatrixColumn(halo.matrixWorld, 1); hu.uSun2.value.set(SUN.dot(_x), SUN.dot(_y)).normalize();
      stars.rotation.y = t * 0.004; bright.forEach((g) => { const u = g.userData; const tw = 0.55 + 0.45 * Math.sin(t * 3.1 + u.ph); g.material.opacity = 0.55 * tw; g.scale.set(u.s * (0.7 + 0.3 * tw), u.s * (0.7 + 0.3 * tw), 1); });
      // word
      w.reset(1); w.intro(rf, { start: 84, stagger: 2.6, dur: 6.5, type: 'grow' }); w.group.rotation.set(-0.1, -0.4 + 0.05 * k, 0.15 - 0.03 * k); w.group.position.set(WP.x, WP.y + 0.06 * Math.sin(t * 1.3), WP.z);
      w.gain(0.92 + 0.22 * pulse(rf, 100.5, 6)); w.sweep(prog(rf, 100, 110.5), 0.8); wGlow.material.opacity = 0.16 * prog(rf, 90, 100);
      // sun breathing, blooming at the end
      const bloomOut = prog(rf, 111.5, 117.8, 'in2'); sun.setIntensity(0.85 + 0.1 * Math.sin(t * 2.2) + 1.2 * bloomOut); sunGlow.material.opacity = 0.2 + 0.5 * bloomOut;
      const open = 1 - prog(rf, 78, 84.5, 'out2');
      return { cam: { pos, tgt, roll: lerp(-1.2, 1.4, k), fov: 40, aperture: 0.015, focus: 9.3 }, clear: 0x000003, post: {
        saturation: 1.14, contrast: 1.08, bloom: 0.55 + 0.5 * bloomOut, bloomThreshold: 0.82, bloomTint: [1, 0.96, 0.9], vignette: 0.7, chroma: 0.0012, sharpen: 0.5, dust: 0.25, grain: 0.03,
        flash: Math.max(open, bloomOut), flashColor: bloomOut > open ? [1, 0.97, 0.9] : [1, 1, 1], exposure: 1 + 0.5 * open + 0.6 * bloomOut,
        zoom: lerp(1.16, 1, prog(rf, 78, 93, 'out3')) + 0.05 * bloomOut, zoomBlur: Math.max(0.45 * open, 0.5 * bloomOut), zoomCenter: bloomOut > 0 ? [0.9, 0.86] : [0.5, 0.5],
        rays: 0.45 + 0.5 * bloomOut, raysCenter: [0.9, 0.86], leak: 0.28 + 0.4 * bloomOut, leakColor: [1.0, 0.72, 0.4], leakPos: [0.97, 0.97], leakSize: 0.9,
        bars: track([[78, 0], [86, 0.075, 'out3'], [112, 0.075], [118, 0]], rf), barsAlpha: 1, barsGlow: 0.3 + 0.9 * pulse(rf, 84, 8), barsGlowColor: [1.0, 0.86, 0.6],
      } };
    } };
  },
};
