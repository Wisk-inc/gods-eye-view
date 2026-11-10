// SECTION K — "outro"  (reference frames 525–658)
//   525–531  the blue smoke wipe clears to a purple star field (letterboxed)
//   527–545  a ball of glowing pink blocks condenses, wrapped in smoke wisps; glass shards drift in the corner
//   545–552  the ball flattens into the medallion (an ORIGINAL roundel — no one else's logo or artwork)
//   553–567  medallion ≈ 80 % of frame height, pink rim glow, a diagonal light sweep crosses it (557–567)
//   567–570  pop: it flashes pale, shrinks; the purple drains to black behind a puff of smoke
//   570–584  small medallion on black: burst ring at 570, glow pulses at 576 and 582, RGB split at 583
//   585–593  radial blur → pastel block-glitch flash → speed-line tunnel → dark, neon lines
//   594–612  call-to-action text grows at the centre amid flying shards and streaks; flickers from 607
//   613–616  punch zoom, smear left, glitch flash   ·   617+ black
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';

const COIN_VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const COIN_FS = `uniform sampler2D tMap; uniform float uSweep; uniform float uFlash; uniform float uOpacity; uniform float uTime; varying vec2 vUv;
float lum(vec2 u){ return dot(texture2D(tMap, u).rgb, vec3(0.299, 0.587, 0.114)); }
void main(){ vec2 p = vUv * 2.0 - 1.0; float r = length(p); if (r > 1.0) discard; float th = atan(p.y, p.x);
  vec3 base = texture2D(tMap, vUv).rgb; float h = lum(vUv); float e = 2.0 / 1024.0;
  float hx = lum(vUv + vec2(e, 0.0)) - lum(vUv - vec2(e, 0.0)); float hy = lum(vUv + vec2(0.0, e)) - lum(vUv - vec2(0.0, e));
  // engraving: fine concentric rings and rays cut into the dark metal, like a struck coin
  float eng = (sin(r * 150.0) * 0.5 + 0.5) * 0.55 + (sin(th * 96.0) * 0.5 + 0.5) * 0.45 * smoothstep(0.25, 0.8, r); eng *= 1.0 - smoothstep(0.35, 0.6, h);
  vec3 n = normalize(vec3(-hx * 8.0 + cos(th) * (eng - 0.5) * 0.3, -hy * 8.0 + sin(th) * (eng - 0.5) * 0.3, 1.0));
  vec3 L = normalize(vec3(-0.45 + 0.25 * sin(uTime), 0.62, 0.62)); float dif = clamp(dot(n, L), 0.0, 1.0); float spec = pow(clamp(dot(reflect(-L, n), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 18.0);
  vec3 col = base * (0.3 + 0.95 * dif) * (0.75 + 0.45 * eng); col += vec3(1.0, 0.72, 1.0) * spec * 0.75; col += vec3(0.75, 0.3, 1.0) * pow(1.0 - dif, 3.0) * 0.12;
  col = mix(col, vec3(1.0, 0.22, 0.72) * (0.7 + 0.6 * dif), smoothstep(0.93, 0.955, r) * 0.9); col += vec3(1.0, 0.75, 0.95) * smoothstep(0.975, 1.0, r) * 0.7;
  float sw = p.x * 0.88 + p.y * 0.48 - uSweep; float band = exp(-sw * sw / 0.006) + 0.5 * exp(-(sw + 0.2) * (sw + 0.2) / 0.0012);
  col += vec3(1.0, 0.93, 1.0) * band * 0.95; col = mix(col, vec3(1.0, 0.86, 1.0), uFlash);
  gl_FragColor = vec4(col, uOpacity * smoothstep(1.0, 0.992, r)); }`;

export default {
  build(ctx) {
    const { THREE, kit, tex } = ctx; const group = new THREE.Group(); const R = rng(525);
    // ---- space
    const bg = kit.bg('grad', { a: '#4b1058', b: '#07020b', vig: 0.9, scale: 1.0, w: 120, h: 70 }); bg.position.z = -30; group.add(bg);
    const stars = kit.starfield({ count: 520, radius: 60, seed: 526, size: 0.42, color: '#ffd8ff' }); group.add(stars);
    const band = kit.plate(tex.streak, 36, 5, { color: '#b020d0', additive: true, opacity: 0.5 }); band.position.set(0, 0.2, -6); group.add(band);
    const halo = kit.plate(tex.glow, 9, 9, { color: '#d018a8', additive: true, opacity: 0.4 }); halo.position.set(0, 0, -1.5); group.add(halo);
    const dust = kit.dust({ count: 260, box: [16, 9, 10], size: 0.045, seed: 527, color: '#ffc8f4', opacity: 0.8 }); group.add(dust);

    // ---- the ball of blocks
    const SR = 1.5, N = 5200; const ball = new THREE.Group(); group.add(ball);
    const inst = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ toneMapped: false }), N); inst.frustumCulled = false; ball.add(inst);
    const parts = []; for (let i = 0; i < N; i++) { const u = R() * 2 - 1, a = R() * TAU, s = Math.sqrt(1 - u * u); const n = new THREE.Vector3(Math.cos(a) * s, u, Math.sin(a) * s);
      parts.push({ n, rad: SR * (1 + (R() - 0.5) * 0.12), from: n.clone().multiplyScalar(SR * R.range(0.08, 0.34)), sz: R.range(0.02, 0.062), d: R() * 0.5, rot: new THREE.Euler(R() * 6, R() * 6, R() * 6), c: R(), ph: R() * 40 }); }
    const dummy = new THREE.Object3D(), v = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0), col = new THREE.Color(), LD = new THREE.Vector3(-0.45, 0.6, 0.66).normalize();
    const cA = new THREE.Color('#5a14b8'), cB = new THREE.Color('#ff48b4'), cW = new THREE.Color('#fff0ff');
    const wisps = []; for (let i = 0; i < 18; i++) { const s = R.range(1.0, 2.0); const m = kit.plate(tex.smoke, s * 0.75, s * 0.75, { color: i % 3 ? '#ffffff' : '#ffc4f0', additive: true, opacity: 0 }); m.userData = { a: (i / 18) * TAU + R.range(-0.2, 0.2), r: R.range(1.5, 1.85), sp: R.range(0.008, 0.026) * (i % 2 ? 1 : -1), ph: R() * 6, o: R.range(0.3, 0.6) }; ball.add(m); wisps.push(m); }
    const core = kit.plate(tex.glow, 5.2, 5.2, { color: '#ff7ad8', additive: true, opacity: 0 }); core.position.z = -0.6; ball.add(core);

    // ---- the medallion
    const cu = { tMap: { value: tex.emblem }, uSweep: { value: 9 }, uFlash: { value: 0 }, uOpacity: { value: 0 }, uTime: { value: 0 } };
    const coin = new THREE.Mesh(new THREE.CircleGeometry(1.55, 128), new THREE.ShaderMaterial({ vertexShader: COIN_VS, fragmentShader: COIN_FS, uniforms: cu, transparent: true, depthWrite: false })); group.add(coin);
    const ringGlow = kit.plate(tex.ringBold || tex.ring, 3.5, 3.5, { color: '#ff3aa8', additive: true, opacity: 0 }); ringGlow.position.z = -0.05; group.add(ringGlow);
    const shock = kit.ribbon(kit.arc(1, 0, 360, 64, { center: [0, 0, -0.1] }), { width: 0.05, gain: 1.6, taper: 4, color: '#ffc8f4' }); group.add(shock.mesh);

    // ---- call to action + flying debris
    const cta = kit.plate(tex.cta, 1, 1, {}); cta.position.z = 0.5; group.add(cta);
    const tris = []; for (let i = 0; i < 16; i++) { const s = R.range(0.28, 0.8); const m = kit.poly([[0, s * 0.6], [-s * 0.4, -s * 0.4], [s * 0.45, -s * 0.25]], { color: R.pick(['#a63cff', '#7a22e0', '#d070ff', '#5a16c0']), grain: false }); m.userData = { a: R() * TAU, v: R.range(0.05, 0.13), r0: R.range(0.7, 1.7), rot: [R.range(-0.2, 0.2), R.range(-0.2, 0.2), R.range(-0.15, 0.15)], z: R.range(-1.5, 2.4), ph: R() * 6 }; group.add(m); tris.push(m); }
    const streaks = []; for (let i = 0; i < 44; i++) { const m = kit.plate(tex.streak, R.range(1.6, 4.6), R.range(0.07, 0.4), { color: i % 3 ? '#eafff6' : '#8fffe0', additive: true, opacity: 0.9 }); m.userData = { a: R() * TAU, v: R.range(0.08, 0.22), r0: R.range(0.9, 2.8), z: R.range(-2, 1.6) }; group.add(m); streaks.push(m); }

    return { group, update(rf) {
      const T = rf - 525; const f = Math.floor(rf + 1e-4);
      const cam = { pos: new THREE.Vector3(0, 0, 5.3).add(kit.shake(rf, 0.03, 0.35, 41)), tgt: new THREE.Vector3(0, 0, 0), roll: lerp(-1.5, 1.5, prog(rf, 525, 617)), fov: 40, aperture: 0.04, focus: 5.3 };
      if (rf >= 617) { group.visible = false; return { cam, clear: 0x000000, post: { fade: 1, mark: 0, dust: 0, grain: 0, vignette: 0 } }; }
      group.visible = true;
      const appear = prog(rf, 527, 535, 'out3'), morph = prog(rf, 545, 552, 'io2'), coinOn = prog(rf, 545.5, 552.5), popK = prog(rf, 566.5, 570.5, 'io3'), dark = prog(rf, 566.5, 569.5), gone = prog(rf, 584.4, 586.2), late = rf >= 586;
      // ---- space
      const pd = (1 - dark); bg.u.uA.value.setRGB(0.294 * pd, 0.063 * pd, 0.345 * pd); bg.u.uB.value.setRGB(0.027 * pd, 0.008 * pd, 0.043 * pd); bg.visible = !late;
      band.material.opacity = 0.32 * pd * (late ? 0 : 1); halo.material.opacity = (0.1 + 0.22 * coinOn) * pd; halo.visible = !late; stars.material.opacity = late ? 0 : lerp(0.9, 0.35, dark); stars.rotation.y = T * 0.0012; dust.drift(T, [0.004, 0.006, 0.01], 0.08); dust.visible = !late;
      // ---- ball of blocks
      const bx = lerp(0.35, 0, morph), by = lerp(0.22, 0, morph); ball.position.set(bx, by, 0); ball.visible = rf >= 526.5 && rf < 553;
      if (ball.visible) { const rotY = T * 0.04;
        for (let i = 0; i < N; i++) { const p = parts[i]; const k = ease.out3(sat((prog(rf, 526.5, 538) - p.d * 0.35) / (1 - p.d * 0.35)));
          v.copy(p.n).multiplyScalar(p.rad * (1 + 0.035 * Math.sin(rf * 0.22 + p.ph))).lerp(p.from, 1 - k).applyAxisAngle(Y, rotY); v.z *= 1 - morph * 0.92;
          dummy.position.copy(v); dummy.rotation.set(p.rot.x + rf * 0.02, p.rot.y + rf * 0.03, p.rot.z); dummy.scale.setScalar(p.sz * (0.45 + 0.55 * k) * (1 - morph)); dummy.updateMatrix(); inst.setMatrixAt(i, dummy.matrix);
          const nd = v.set(p.n.x, p.n.y, p.n.z).applyAxisAngle(Y, rotY).dot(LD); const sh = 0.22 + 0.95 * Math.max(0, nd); col.copy(cA).lerp(cB, p.c).multiplyScalar(sh * 0.9); col.lerp(cW, 0.8 * (1 - k)); if (p.c > 0.9 && nd > 0.2) col.lerp(cW, 0.6); inst.setColorAt(i, col); }
        inst.instanceMatrix.needsUpdate = true; if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
        wisps.forEach((m) => { const u = m.userData; const a = u.a + T * u.sp; const g = lerp(0.3, 1, prog(rf, 526.5, 537, 'out3')) * (1 + 0.05 * Math.sin(rf * 0.2 + u.ph)); m.position.set(Math.cos(a) * u.r * g, Math.sin(a) * u.r * g, 0.3); m.rotation.z = a * 2 + T * u.sp * 3; m.material.opacity = u.o * appear * (1 - morph) * (0.7 + 0.3 * Math.sin(rf * 0.35 + u.ph)); });
        core.material.opacity = (0.75 * (1 - prog(rf, 527, 537)) + 0.12) * (1 - morph) * prog(rf, 526.2, 527.5); }
      // ---- medallion
      const cs = lerp(1, 0.44, popK) * (1 - 0.1 * prog(rf, 571, 584)) * (1 + 0.07 * pulse(rf, 576, 5) + 0.07 * pulse(rf, 582, 5)) * (1 + 0.5 * gone);
      coin.visible = coinOn > 0 && gone < 1; coin.scale.setScalar(cs * lerp(0.9, 1, coinOn)); coin.rotation.set(0.07 * Math.cos(rf * 0.06), 0.16 * Math.sin(rf * 0.07) + (1 - coinOn) * 0.9, 0);
      cu.uOpacity.value = coinOn * (1 - gone); cu.uSweep.value = lerp(1.35, -1.35, prog(rf, 556.5, 567.2)); cu.uTime.value = rf * 0.08;
      cu.uFlash.value = sat(0.6 * pulse(rf, 569, 3, 2) + 0.16 * popK + 0.25 * pulse(rf, 576, 4) + 0.25 * pulse(rf, 582, 4));
      ringGlow.scale.setScalar(3.5 * cs * 1.02); ringGlow.material.opacity = 0.5 * coinOn * (1 - gone) * (0.6 + 0.4 * pulse(rf, 576, 5) + 0.4 * pulse(rf, 582, 5)); ringGlow.visible = coin.visible;
      const sk = prog(rf, 570, 577, 'out3'); shock.set(0, 1, 1 - sk); shock.mesh.scale.setScalar(lerp(0.7, 4.2, sk)); shock.mesh.visible = rf >= 570 && rf < 577;
      // ---- call to action + debris
      const T2 = rf - 593; const cw = track([[591, 0.3], [593, 0.9, 'out2'], [597.5, 3.6, 'out3'], [612, 4.1, 'lin'], [617, 4.3]], rf);
      cta.visible = rf >= 591; cta.scale.set(cw, cw / tex.ctaAspect, 1); cta.rotation.z = -0.02; cta.material.opacity = prog(rf, 591, 593.5);
      tris.forEach((m) => { const u = m.userData; const r = u.r0 + Math.max(0, T2) * u.v; m.visible = rf >= 593.4; m.position.set(Math.cos(u.a) * r * 1.35, Math.sin(u.a) * r * 0.8, u.z); m.rotation.set(u.ph + T2 * u.rot[0], u.ph * 2 + T2 * u.rot[1], u.a + T2 * u.rot[2]); });
      streaks.forEach((m) => { const u = m.userData; const r = u.r0 + Math.max(-6, rf - 590) * u.v; m.visible = late; m.position.set(Math.cos(u.a) * r * 1.6, Math.sin(u.a) * r * 0.9, u.z); m.rotation.z = Math.atan2(Math.sin(u.a) * 0.9, Math.cos(u.a) * 1.6); m.material.opacity = rf < 591 ? 1 : 0.75; });

      // ---- the edit
      const post = { saturation: 1.15, contrast: 1.12, bloom: 0.6, bloomThreshold: 0.8, bloomTint: [1, 0.86, 1], vignette: 0.8, chroma: 0.002, sharpen: 0.35, dust: 0.35, grain: 0.04,
        smoke: 1 - prog(rf, 523.5, 529.5, 'out2'), smokeColor: [0.18, 0.55, 1.0], bars: track([[525, 0], [527.5, 0.115, 'out2'], [545, 0.115], [553, 0.0, 'io2']], rf), barsAlpha: 1,
        exposure: 1 + 0.25 * pulse(rf, 540.4, 5) + 0.3 * pulse(rf, 556.2, 5), zoom: 1 + 0.03 * pulse(rf, 540.4, 5) + 0.035 * pulse(rf, 556.2, 5), rays: 0.35 * coinOn * (1 - popK), raysCenter: [0.5, 0.5] };
      if (rf < 570.5) {
        post.flash = 0.08 * pulse(rf, 569, 2.5, 1.6); post.flashColor = [1, 0.88, 1];
        post.ovlA = rf >= 529 && rf < 553 ? { clip: 'smoke_swirl', t: 0.95 + (rf - 529) / 30 * 1.3, amt: 0.75 * prog(rf, 529, 533) * (1 - morph), tint: [1, 0.9, 1], scale: 1.05, ox: 0.05, oy: 0.05 } : rf >= 566 ? { clip: 'smoke_puff', t: 0.3 + (rf - 566) / 30 * 1.6, amt: 0.42, tint: [1, 0.82, 1], flipX: true, scale: 1.3, ox: 0.32 } : null;
        post.ovlB = rf >= 531 && rf < 547 ? { clip: 'shards', t: 0.9 + (rf - 531) / 30, amt: 0.9 * prog(rf, 531, 534) * (1 - prog(rf, 543, 547)), tint: [1, 0.8, 1], scale: 1.5, ox: 0.3, oy: -0.22 } : null;
      } else if (rf < 586) {
        const b = pulse(rf, 570.3, 5) + 0.7 * pulse(rf, 576, 5) + 0.7 * pulse(rf, 582, 5); const split = prog(rf, 582.6, 584.6), zb = prog(rf, 584.2, 586, 'in2');
        Object.assign(post, { exposure: 1 + 0.4 * b + 0.6 * zb, bloom: 0.65 + 0.45 * b, zoom: 1 + 0.04 * b, rgbSplit: 1.4 * split, chroma: 0.002 + 0.02 * zb, zoomBlur: 1.1 * zb, rays: 0.5 * b, vignette: 0.9,
          ovlA: rf < 582 ? { clip: 'fire_ring', t: 0.2 + (rf - 570) / 30 * 2.6, amt: 0.5 * (1 - prog(rf, 572.5, 578)), mono: true, tint: [1, 0.35, 0.85], scale: 1.5 } : null,
          ovlB: rf < 578 ? { clip: 'smoke_puff', t: 0.3 + (rf - 566) / 30 * 1.6, amt: 0.42 * (1 - prog(rf, 571, 578)), tint: [1, 0.82, 1], flipX: true, scale: 1.3, ox: 0.32 } : null });
      } else if (rf < 594) {
        const tun = 1 - prog(rf, 588.6, 591.4); const dk = prog(rf, 590.5, 592);
        Object.assign(post, { exposure: lerp(1.6, 1.0, dk), bloom: 1.2, zoomBlur: lerp(1.15, 0.45, dk), chroma: 0.012, flash: 0.5 * tun, flashColor: [1, 0.9, 1], saturation: 0.9, vignette: 0.6, rays: 0, slices: 0.9 * dk, glitch: 0.35 * dk,
          ovlA: { clip: 'tunnel2', t: (rf - 586) / 30 * 1.6, amt: 0.55 * (1 - dk), tint: [1, 0.86, 1], scale: 1.5 }, ovlB: rf < 588.5 ? { clip: 'flash_glitch', t: (rf - 586) / 30, amt: 0.9 } : { clip: 'neon_lines', t: (rf - 588.5) / 30, loop: true, amt: 0.8 * dk, scale: 1.7 } });
      } else {
        const fl = f === 607 || f === 608 ? 0.45 : f === 609 || f === 610 ? 1.2 : f === 611 || f === 612 ? 0.5 : 1; const pz = rf >= 613; const sm = prog(rf, 614.6, 617);
        Object.assign(post, { exposure: fl * (1 + 0.25 * pulse(rf, 598.5, 5)), bloom: 1.0, bloomTint: [0.9, 1, 0.96], chroma: pz ? 0.008 : 0.0026, zoomBlur: pz ? 0.4 + 0.5 * sm : 0.12, tint: pz ? [1.15, 1.04, 0.82] : [0.93, 1.05, 1.0], saturation: 1.1, vignette: 0.9, rays: 0,
          zoom: pz ? 2.3 : 1 + 0.03 * pulse(rf, 598.5, 5), shake: pz ? [0.2 * sm, 0] : [0, 0], glitch: 0.9 * sm, flash: 0, flashColor: [1, 1, 0.9], lens: pz ? 0.2 : 0,
          ovlA: { clip: 'shards', t: 1.15 + (rf - 593) / 30 * 1.5, amt: 0.75, tint: [0.82, 1, 0.94], scale: 1.25 }, ovlB: rf >= 614 ? { clip: 'flash_glitch', t: (rf - 614) / 30, amt: 0.45 } : null });
      }
      return { cam, clear: 0x000000, post };
    } };
  },
};
