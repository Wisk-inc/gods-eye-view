// SECTION G — "mono"  (reference frames 241–267). Everything greyscale on black.
//   rf 241–247  black field; the previous word (s15) lingers as a dark fading ghost at upper-centre;
//               word s16 rises in below-right, dark grey first
//   rf 248–261  s16 in chrome, tilted about -10°, cap ≈ 26 %, centre-right; two thick glowing white arcs
//               flank it and slide downward; wireframe tiles; a grey starburst outline bottom-right; rings
//   rf 259–264  exposure washes up to light grey      rf 265–266  pure white (hand-off)
import { ease, prog, sat, lerp, track, pulse, rng } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group();

    const bg = kit.bg('grad', { a: '#0d0e10', b: '#000000', vig: 0.95, scale: 1.2, w: 90, h: 52 }); bg.position.z = -16; group.add(bg);

    // soft smoke haze far behind (adds depth to the black)
    const R = rng(77); const haze = [];
    for (let i = 0; i < 9; i++) { const s = R.range(5, 10); const m = kit.plate(tex.smoke, s, s, { color: '#9aa2ab', additive: true, opacity: R.range(0.05, 0.12) }); m.position.set(R.range(-8, 8), R.range(-4, 4), R.range(-9, -4)); m.userData = { x: m.position.x, sp: R.range(0.002, 0.008) * R.sign(), rot: R.range(-0.002, 0.002) }; group.add(m); haze.push(m); }

    // ghost of the previous word
    const ghost = kit.word(words.s15 || 'NO', { size: 0.85, depth: 0.45, style: 'graphite', seed: 15 });
    ghost.group.position.set(-0.5, 1.75, -1.6); ghost.group.rotation.set(-0.35, 0.25, -0.08); group.add(ghost.group);

    // the word
    const w = kit.word(words.s16 || 'SLEEP', { size: 1, depth: 0.55, style: 'silver', seed: 16 });
    w.group.position.set(0.55, -0.4, 0); group.add(w.group);
    const halo = kit.plate(tex.glow, 8, 4.4, { color: '#aeb6c0', additive: true, opacity: 0.16 }); halo.position.set(0.55, -0.4, -0.9); group.add(halo);

    // two thick glowing strokes flanking the word, leaning like slashes
    const hw = w.width / 2;
    const arcL = kit.ribbon([[0.55 - hw - 0.35, 3.4, 0.5], [0.55 - hw - 0.75, 1.3, 0.6], [0.55 - hw - 0.95, -0.9, 0.6], [0.55 - hw - 1.55, -3.6, 0.5]], { width: 0.24, taper: 0.42, gain: 1.7, shade: 0.1 });
    const arcR = kit.ribbon([[0.55 + hw + 1.25, 3.6, 0.35], [0.55 + hw + 0.95, 1.4, 0.45], [0.55 + hw + 0.8, -0.8, 0.45], [0.55 + hw + 0.25, -3.6, 0.35]], { width: 0.27, taper: 0.42, gain: 1.7, shade: 0.1 });
    const thin = [
      kit.ribbon(kit.arc(4.6, 150, 215, 20, { center: [0.6, -0.2, -1.2], squash: 0.8 }), { width: 0.05, gain: 1.3 }),
      kit.ribbon(kit.arc(5.4, -25, 35, 20, { center: [0.2, 0.1, -1.6], squash: 0.75 }), { width: 0.045, gain: 1.3 }),
    ];
    [arcL, arcR, ...thin].forEach((r) => group.add(r.mesh));

    // wireframe tiles
    const tiles = [
      { q: kit.quad({ w: 1.25, h: 1.25, r: 0.05, fill: '#050506', outline: '#f4f6f8', ow: 0.028 }), p: [-3.55, -0.55, -0.3], r: [0.25, 0.55, 0.16] },
      { q: kit.quad({ w: 0.95, h: 1.05, r: 0.05, fill: '#040405', outline: '#cfd3d8', ow: 0.022 }), p: [1.05, 2.75, -1.5], r: [-0.3, -0.45, -0.12] },
      { q: kit.quad({ w: 0.7, h: 0.7, r: 0.04, fill: null, outline: '#8f959b', ow: 0.016 }), p: [4.7, 1.5, -2.6], r: [0.4, 0.3, 0.5] },
      { q: kit.quad({ w: 0.55, h: 0.55, r: 0.03, fill: null, outline: '#7c8187', ow: 0.014 }), p: [-5.3, 2.4, -3.2], r: [-0.2, 0.6, -0.3] },
    ];
    tiles.forEach((t) => { t.q.position.set(...t.p); t.q.rotation.set(...t.r); group.add(t.q); });

    // grey starburst outline, bottom-right
    const sb = kit.starburst({ rInner: 1.55, rValley: 1.95, rTip: 3.2, spikes: 20, rays: 11, rayLen: [4.2, 7.5], rayW: 0.035, fill: '#0b0c0d', outline: '#a9aeb4', ring: '#70757b', disc: '#040405', seed: 21, ow: 0.05 });
    sb.position.set(4.9, -3.35, -1.9); sb.rotation.set(-0.25, -0.2, 0.4); group.add(sb);

    // rings at three depths + dust + glints
    const rings = kit.bubbles({ count: 34, box: [12, 7, 5], center: [0.3, 0, -0.6], size: [0.08, 0.42], seed: 31, kinds: ['ringThin', 'ring', 'ringBold', 'ringOpen'], avoid: 1.6 }); group.add(rings);
    const ringsFar = kit.bubbles({ count: 18, box: [22, 12, 5], center: [0, 0, -6], size: [0.12, 0.45], seed: 32, kinds: ['ringOpen', 'ringThin'], opacity: 0.5 }); group.add(ringsFar);
    const ringsNear = kit.bubbles({ count: 6, box: [8, 4.5, 1.2], center: [0, 0, 3.0], size: [0.5, 1.2], seed: 33, kinds: ['ringOpen', 'ringThin'], opacity: 0.3 }); group.add(ringsNear);
    const dust = kit.dust({ count: 260, box: [15, 9, 9], center: [0, 0, -1], size: 0.034, seed: 5, opacity: 0.75 }); group.add(dust);
    const dustNear = kit.dust({ count: 40, box: [9, 5, 2], center: [0, 0, 2.6], size: 0.07, seed: 6, opacity: 0.35 }); group.add(dustNear);
    const glints = [[0.55 - hw + 0.1, 0.25, 0.3], [0.55 + hw - 0.15, 0.55, 0.3], [0.55, -0.95, 0.3]].map((p, i) => { const g = kit.plate(tex.glint, 0.9, 0.9, { additive: true, billboard: true, opacity: 0 }); g.position.set(...p); g.userData.t = 249 + i * 3.2; group.add(g); return g; });

    const camKeys = [
      { rf: 241, p: [0.15, 0.25, 6.5], t: [0.2, 0.15, 0], roll: -2.5 },
      { rf: 248, p: [0.3, 0.0, 4.7], t: [0.35, -0.1, 0], roll: -1, e: 'out3' },
      { rf: 262, p: [0.5, -0.15, 4.15], t: [0.5, -0.25, 0], roll: 1.2, e: 'lin' },
      { rf: 267, p: [0.55, -0.2, 3.9], t: [0.55, -0.3, 0], roll: 2, e: 'in2' },
    ];

    return { group, update(rf) {
      haze.forEach((m) => { m.position.x = m.userData.x + (rf - 241) * m.userData.sp * 6; m.rotation.z = (rf - 241) * m.userData.rot * 6; });
      // ghost fades, sinks back
      const go = track([[241, 0.6], [245, 0.32, 'out2'], [250, 0.08, 'lin'], [253, 0]], rf); ghost.reset(go); ghost.gain(0.55);
      ghost.group.position.set(-0.5 - (rf - 241) * 0.012, 1.75 + (rf - 241) * 0.02, -1.6 - (rf - 241) * 0.09); ghost.group.rotation.x = -0.35 - (rf - 241) * 0.012;
      // word: letters rise in, graphite -> silver, slow tilt
      w.mixStyle('graphite', 'steel', prog(rf, 243, 250, 'out2'));
      w.intro(rf, { start: 241.3, stagger: 0.85, dur: 5.5, type: 'rise', amp: 0.75 });
      w.gain(lerp(0.55, 0.86, prog(rf, 242, 249)) + 0.22 * pulse(rf, 248.2, 5) + 0.25 * pulse(rf, 256.1, 5));
      w.group.rotation.set(-0.34 + 0.03 * Math.sin(rf * 0.11), 0.46 - (rf - 241) * 0.004, -0.21 + (rf - 241) * 0.0012);
      halo.material.opacity = 0.16 * prog(rf, 243, 250) + 0.12 * pulse(rf, 256.1, 6);
      // flanking strokes: draw on, slide down, erase into the wash
      const slide = -(rf - 246) * 0.085;
      arcL.mesh.position.y = slide; arcR.mesh.position.y = slide * 0.8 + 0.2;
      arcL.swoosh(rf, 243.5, 248, 257.5, 263.5, 1 + 0.35 * pulse(rf, 248.2, 4)); arcR.swoosh(rf, 244.3, 249, 258.5, 264.5, 1 + 0.35 * pulse(rf, 248.2, 4));
      thin[0].swoosh(rf, 246, 251, 254, 260); thin[1].swoosh(rf, 249, 254, 257, 263);
      tiles.forEach((t, i) => { t.q.rotation.set(t.r[0] + (rf - 241) * 0.004 * (i % 2 ? -1 : 1), t.r[1] + (rf - 241) * 0.006, t.r[2] + (rf - 241) * 0.003 * (i % 2 ? 1 : -1)); t.q.position.y = t.p[1] + Math.sin(rf * 0.07 + i) * 0.05; });
      sb.rotation.z = 0.4 + (rf - 241) * 0.006; sb.scale.setScalar(lerp(0.8, 1, prog(rf, 241, 250, 'out3')));
      rings.drift(rf - 241, 0.006, 0.05); ringsFar.drift(rf - 241, 0.004, 0.08); ringsNear.drift(rf - 241, 0.012, 0.1);
      dust.drift(rf - 241, [0.004, 0.009, 0.0], 0.07); dustNear.drift(rf - 241, [0.01, 0.016, 0], 0.1);
      glints.forEach((g) => { const k = pulse(rf, g.userData.t, 4.5, 1.2); g.material.opacity = 0.95 * k; const s = 0.5 + 1.1 * k; g.scale.set(s, s, 1); g.material.rotation = (rf - g.userData.t) * 0.09; });

      const cam = kit.cam(camKeys, rf); cam.pos.add(kit.shake(rf, 0.03, 0.4, 5)); cam.aperture = 0.07; cam.focus = cam.pos.z;
      const wash = prog(rf, 258.5, 264.6, 'in2');
      return { cam, clear: 0x000000, post: {
        desat: 1, saturation: 0, bloom: 0.95 + 0.35 * pulse(rf, 248.2, 5) + 0.3 * pulse(rf, 256.1, 5), bloomThreshold: 0.68, vignette: 0.85 * (1 - wash),
        exposure: track([[241, 0.5], [245.5, 1, 'out2'], [258.5, 1], [262, 1.7, 'in2'], [264.6, 3.2, 'in2']], rf) + 0.12 * pulse(rf, 256.1, 4),
        flash: track([[260, 0], [263, 0.35, 'in2'], [264.8, 1, 'in2'], [267, 1]], rf),
        zoom: 1 + 0.03 * pulse(rf, 248.2, 5) + 0.035 * pulse(rf, 256.1, 5), chroma: 0.0012 + 0.003 * pulse(rf, 256.1, 4),
        bars: track([[241, 0.0], [246, 0.06, 'out3'], [259, 0.06], [264, 0, 'in2']], rf), barsAlpha: 0.95, contrast: 1.1, grain: 0.04, sharpen: 0.4,
        mark: 0.38 * (1 - wash),
      } };
    } };
  },
};
