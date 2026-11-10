// SECTION D (OFTEN, heavenly) — "heaven"  (reference frames 78–118). One clean, slow shot:
//   a real sunlit cloudscape (CC0 panorama) seen from among the clouds, the camera rising gently toward the
//   low sun; soft cloud wisps drift past the lens; the gold word assembles in clear sky, backlit by the sun.
//   rf 78–86   out of white            rf 84–100 letters grow into place          rf 100–110 hold, sun sweep
//   rf 110–118 the sun blooms to white (hand-off to the white disc of the next scene)
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';
import { timeOfRf } from '../main.js';

// panorama crop stored in sky_heaven.jpg: longitude -72..144 deg (left..right), latitude 82.8..-10.8 deg (top..bottom)
const SKY_VS = `varying vec3 vD; void main(){ vD = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition); gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0); }`;
const SKY_FS = `uniform sampler2D tSky; uniform vec3 uSun; uniform float uGain; uniform float uWarm; varying vec3 vD;
void main(){ vec3 d = normalize(vD); float lon = degrees(atan(d.x, -d.z)), lat = degrees(asin(clamp(d.y, -1.0, 1.0)));
  vec2 uv = vec2((lon + 72.0) / 216.0, 1.0 - (82.8 - lat) / 93.6);
  vec3 c = texture2D(tSky, clamp(uv, vec2(0.001), vec2(0.999))).rgb;
  float edge = smoothstep(0.0, 0.04, uv.x) * smoothstep(1.0, 0.96, uv.x) * smoothstep(0.0, 0.03, uv.y) * smoothstep(1.0, 0.97, uv.y);
  c = mix(vec3(0.62, 0.7, 0.8), c, edge);
  float sd = max(dot(d, uSun), 0.0);
  // heavenly grade: lift and warm the light, keep the blue in the shadows of the clouds
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(c, c * vec3(1.05, 1.0, 0.9), uWarm * smoothstep(0.45, 0.95, l));
  c = mix(c, c * vec3(0.92, 0.97, 1.08), uWarm * (1.0 - smoothstep(0.2, 0.6, l)) * 0.6);
  c += vec3(1.0, 0.72, 0.4) * pow(sd, 40.0) * 0.22 * uWarm + vec3(1.0, 0.92, 0.75) * pow(sd, 500.0) * 0.9;   // sun glow + disc
  // dimension: cloud shadows cooler and deeper, sunlit tops brighter (an S-curve on luminance)
  float L2 = clamp(dot(c, vec3(0.299, 0.587, 0.114)), 0.0, 1.0); float S2 = L2 * L2 * (3.0 - 2.0 * L2); c *= mix(0.78, 1.18, S2) ; c = mix(c, c * vec3(0.86, 0.94, 1.12), (1.0 - smoothstep(0.25, 0.65, L2)) * 0.7);
  gl_FragColor = vec4(c * uGain, 1.0); }`;
const GOLD = { top: '#ffdc7a', bot: '#b8720f', side: '#5e3404', sideDark: '#120800', rim: '#fff3c8', gain: 0.92, chrome: 0.3, rimAmt: 0.9 };

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(78);
    const SUN = new THREE.Vector3(0.663, 0.249, -0.706).normalize();       // where the sun sits in the panorama

    // ---- the sky
    const su = { tSky: { value: tex.sky || tex.white }, uSun: { value: SUN }, uGain: { value: 1.0 }, uWarm: { value: 1.0 } };
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 96, 64), new THREE.ShaderMaterial({ vertexShader: SKY_VS, fragmentShader: SKY_FS, uniforms: su, side: THREE.BackSide, depthWrite: false })); sky.renderOrder = -10; group.add(sky);
    // ---- soft cloud wisps between the camera and the sky (they drift down past the lens: we are rising)
    const wisps = []; for (let i = 0; i < 8; i++) { const s = R.range(5, 12); const m = kit.plate(tex.smoke, s * 1.6, s, { color: i % 3 ? '#fff4e2' : '#ffe2c0', additive: false, opacity: 0 }); m.userData = { x: R.range(-9, 9), y0: R.range(-6, 9), z: -R.range(5, 18), sp: R.range(0.05, 0.11), o: R.range(0.05, 0.12), r: R() * 6 }; m.renderOrder = -5; group.add(m); wisps.push(m); }
    // ---- golden motes (soft out-of-focus specks catching the sun)
    const motes = []; for (let i = 0; i < 70; i++) motes.push([R.range(-7, 7), R.range(-4, 4.5), -R.range(2.5, 14), R.range(0.02, 0.06)]);
    const moteMesh = kit.bokeh(motes, { color: '#ffd796', gain: 0.9, floor: 0.12 }); group.add(moteMesh);
    // ---- the sun's lens flare
    const flare = kit.flare({ color: '#ffc77a', size: 3.0, streak: 10, ghosts: true, gain: 0.8 }); group.add(flare);

    // ---- the word, in clear sky, backlit
    // place the word in clear sky left of the sun, measured from the camera's mid-shot pose
    const camAt = (k) => ({ pos: new THREE.Vector3(lerp(0.15, -0.1, k), lerp(-0.25, 0.25, k), lerp(0.3, 0.0, k)), look: new THREE.Vector3(lerp(0.13, 0.19, k), lerp(0.42, 0.46, k), -1).normalize() });
    const M = camAt(0.55), right = new THREE.Vector3().crossVectors(M.look, new THREE.Vector3(0, 1, 0)).normalize(), up = new THREE.Vector3().crossVectors(right, M.look).normalize();
    const WP = M.pos.clone().addScaledVector(M.look, 9.0).addScaledVector(right, -0.85).addScaledVector(up, -0.35);
    const w = kit.word(words.s07 || 'HEAVEN', { size: 1.5, depth: 0.45, style: GOLD, seed: 7 }); w.group.position.copy(WP); w.set('uGrit', 0.0); w.set('uFaceAmt', 0.08); group.add(w.group);
    const halo = kit.plate(tex.glow, 11, 4.8, { color: '#ffcf7a', additive: true, opacity: 0 }); halo.position.copy(WP).add(new THREE.Vector3(0.4, 0, -1.4)); group.add(halo);
    const shade = kit.plate(tex.glow, 13, 4.6, { color: '#1a1206', additive: false, opacity: 0 }); shade.position.copy(WP).addScaledVector(M.look, 1.6); shade.lookAt(M.pos); group.add(shade);

    const _p = new THREE.Vector3(), cam3 = new THREE.PerspectiveCamera(46, 16 / 9, 0.1, 1000);
    return { group, update(rf) {
      const t = timeOfRf(rf, ctx.cfg) - timeOfRf(78, ctx.cfg);
      const k = prog(rf, 78, 118, 'io2');
      // camera: rising slowly through the clouds, turning a little toward the sun
      const C = camAt(k); const pos = C.pos.add(kit.shake(rf, 0.01, 0.2, 9)); const look = C.look;
      const tgt = pos.clone().addScaledVector(look, 10);
      sky.position.copy(pos);
      wisps.forEach((m) => { const u = m.userData; const y = ((u.y0 - t * u.sp * 9 + 12) % 16 + 16) % 16 - 7; m.position.set(pos.x + u.x, pos.y + y, pos.z + u.z); m.rotation.z = u.r + t * 0.02; m.material.opacity = u.o * prog(rf, 79, 90); m.lookAt(pos); });
      // word: grows into place inside the frame, turns a few degrees, sun sweep in the hold
      w.reset(1); w.intro(rf, { start: 84, stagger: 2.4, dur: 7, type: 'grow' });
      w.group.position.set(WP.x, WP.y + 0.05 * Math.sin(t * 1.1), WP.z); w.group.lookAt(pos); w.group.rotateY(0.3 - 0.12 * k); w.group.rotateX(-0.04); w.group.rotateZ(0.05 - 0.03 * k);
      w.set('uLight', new THREE.Vector3(0.75, 0.35, -0.25)); w.gain(0.95 + 0.2 * pulse(rf, 100.5, 7)); w.sweep(prog(rf, 100, 111), 0.75);
      halo.material.opacity = 0.12 * prog(rf, 88, 100) * (1 - prog(rf, 112, 117)); shade.material.opacity = 0.42 * prog(rf, 84, 96) * (1 - prog(rf, 111, 116));
      // sun: flare position on the sky sphere, its screen position drives the light rays
      const sunW = pos.clone().addScaledVector(SUN, 60); flare.position.copy(sunW);
      cam3.position.copy(pos); cam3.lookAt(tgt); cam3.updateMatrixWorld(); _p.copy(sunW).project(cam3); const sx = _p.x * 0.5 + 0.5, sy = _p.y * 0.5 + 0.5;
      const bloomOut = prog(rf, 111.5, 117.8, 'in2'); flare.setIntensity(0.55 + 0.08 * Math.sin(t * 2.0) + 1.3 * bloomOut);
      su.uGain.value = 1.0 + 0.5 * bloomOut;
      const open = 1 - prog(rf, 78, 86, 'out2');
      return { cam: { pos, tgt, roll: lerp(-1.0, 1.2, k), fov: 46, aperture: 0.03, focus: pos.distanceTo(WP) }, clear: 0xb8c8d8, post: {
        saturation: 1.12, contrast: 1.14, bloom: 0.38 + 0.6 * bloomOut, bloomThreshold: 0.9, bloomTint: [1, 0.97, 0.92], vignette: 0.6, chroma: 0.001, sharpen: 0.35, dust: 0.12, grain: 0.02,
        flash: Math.max(open, bloomOut), flashColor: [1, 0.98, 0.93], exposure: 0.96 + 0.3 * open + 0.5 * bloomOut,
        zoom: lerp(1.1, 1, prog(rf, 78, 92, 'out3')) + 0.04 * bloomOut, zoomBlur: Math.max(0.35 * open, 0.45 * bloomOut), zoomCenter: [sx, sy],
        rays: 0.22 + 0.6 * bloomOut, raysCenter: [sx, sy], leak: 0.07 + 0.35 * bloomOut, leakColor: [1.0, 0.8, 0.55], leakPos: [sx, sy], leakSize: 0.9, streak: 0.55,
        bars: track([[78, 0], [86, 0.07, 'out3'], [112, 0.07], [118, 0]], rf), barsAlpha: 1, barsGlow: 0.35 + 0.8 * pulse(rf, 84, 8), barsGlowColor: [1.0, 0.88, 0.62],
      } };
    } };
  },
};
