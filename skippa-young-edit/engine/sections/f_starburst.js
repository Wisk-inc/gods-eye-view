// SECTION F — "starburst"  (reference frames 160–241) — five word shots around a spiky red sunburst.
//   rf 160–176  s11 on a red label plate over the sunburst ring; a white streak passes through it
//   rf 177–188  punch zoom; the word EXTENDS into s12, small, centred in the ring; cards radiate like petals
//   rf 189–199  s13 inside the disc; music notes; vertical strokes
//   rf 200–219  s14 small, then a violent zoom makes it GIANT; the colour drains to grey (rf 206–213)
//   rf 220–241  s15: the scene again at half saturation, camera pulling back and rotating; blur + darken out
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(160);
    const CARD = { fill: '#b8141c', fill2: '#62050b', outline: '#ffe6d6', ow: 0.04, r: 0.07 };

    const bg = kit.bg('grad', { a: '#5c0e1e', b: '#0a0206', vig: 0.9, scale: 1.15, w: 160, h: 90 }); bg.position.z = -22; group.add(bg);
    const haze = []; for (let i = 0; i < 8; i++) { const s = R.range(8, 15); const m = kit.plate(tex.smoke, s, s, { color: R.pick(['#a01438', '#7a1030', '#c02048']), additive: true, opacity: R.range(0.08, 0.16) }); m.position.set(R.range(-12, 12), R.range(-6, 6), R.range(-14, -6)); m.userData = { sp: R.range(-0.004, 0.004) }; group.add(m); haze.push(m); }

    // ---- the sunburst
    const sb = kit.starburst({ rInner: 1.22, rValley: 1.6, rTip: 3.5, spikes: 22, rays: 20, rayLen: [5, 12], rayW: 0.05, fill: '#a81018', outline: '#ffd2a6', ring: '#ff2bd0', disc: '#22030c', seed: 9, ow: 0.06 }); sb.position.z = -0.5; group.add(sb);
    const sbGlow = kit.plate(tex.glow, 13, 13, { color: '#e0180c', additive: true, opacity: 0.14 }); sbGlow.position.z = -0.9; group.add(sbGlow);
    // petal cards radiating around the ring + deeper floating cards
    const petals = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + 0.35; const q = kit.quad({ ...CARD, w: 1.75, h: 1.2 }); q.userData = { a, r: 3.3 + (i % 2) * 0.35, ph: R() * 6 }; group.add(q); petals.push(q); }
    const floaters = [[-6.4, 3.4, -3.2, 1.5, 1.2], [6.8, -3.2, -2.8, 1.6, 1.3], [7.2, 3.6, -4.2, 1.2, 1.2], [-7.0, -3.4, -3.8, 1.3, 1.0], [0.4, 4.9, -5.0, 1.1, 1.1], [-1.2, -5.2, -4.6, 1.4, 1.0], [-4.9, 0.7, -1.7, 1.3, 1.1], [5.1, 1.0, -2.0, 1.4, 1.2], [-2.7, 3.7, -2.3, 1.2, 1.2], [3.0, -3.8, -2.1, 1.3, 1.0], [-8.8, 0.2, -4.6, 1.5, 1.3], [9.0, 0.5, -4.4, 1.4, 1.4]].map((c) => { const q = kit.quad({ ...CARD, w: c[3], h: c[4] }); q.position.set(c[0], c[1], c[2]); q.userData = { p: c, ph: R() * 6 }; group.add(q); return q; });
    // rings: scattered, a few big dark discs top-right, soft foreground bokeh
    const rings = kit.bubbles({ count: 30, box: [14, 8, 4], center: [0, 0, 0.6], size: [0.12, 0.6], seed: 161, kinds: ['ring', 'ringBold', 'ring', 'ringThin'], avoid: 2.0, gain: 1.2 }); group.add(rings);
    const discs = kit.bubbles({ count: 4, box: [2.6, 1.8, 0.8], center: [4.2, 2.3, 0.5], size: [0.9, 1.6], seed: 162, kinds: ['ringBold', 'ring'] }); group.add(discs);
    const ringsFar = kit.bubbles({ count: 20, box: [26, 14, 5], center: [0, 0, -8], size: [0.12, 0.5], seed: 163, kinds: ['ringOpen', 'ringThin'], opacity: 0.45 }); group.add(ringsFar);
    const ringsNear = kit.bubbles({ count: 6, box: [9, 5, 1], center: [0, 0, 3.4], size: [0.6, 1.4], seed: 164, kinds: ['ringOpen'], opacity: 0.25 }); group.add(ringsNear);
    const dust = kit.dust({ count: 260, box: [18, 10, 10], size: 0.04, seed: 165, color: '#ffd4c8', opacity: 0.85 }); group.add(dust);
    // tiny 3D music notes, top-left (original shapes: tilted stem + head + flag)
    const notes = []; for (let i = 0; i < 5; i++) { const g = new THREE.Group(); const col = '#ffe2cc';
      const head = new THREE.Mesh(new THREE.CircleGeometry(0.13, 20), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide, toneMapped: false })); head.scale.set(1.25, 0.9, 1); head.rotation.z = -0.4; g.add(head);
      const stem = kit.poly([[0.11, 0.02], [0.15, 0.02], [0.15, 0.62], [0.11, 0.62]], { color: col, grain: false }); g.add(stem);
      const flag = kit.poly([[0.15, 0.62], [0.38, 0.44], [0.36, 0.34], [0.15, 0.5]], { color: col, grain: false }); g.add(flag);
      g.position.set(-4.4 + i * 0.62 + R.range(-0.1, 0.1), 2.0 + R.range(-0.25, 0.6), 0.8 - i * 0.25); g.userData = { p: g.position.clone(), ph: R() * 6, s: R.range(0.8, 1.25) }; g.scale.setScalar(g.userData.s); group.add(g); notes.push(g); }

    // ---- words (all sit at the centre of the ring)
    const W = (key, fb, size, style, seed, depth = 0.55) => { const w = kit.word(words[key] || fb, { size, depth, style, seed }); w.group.position.set(0, 0, 0.4); group.add(w.group); return w; };
    const w11 = W('s11', 'MY', 1.0, 'pinkWhite', 11), w12 = W('s12', 'MYSELF', 0.62, 'pinkWhite', 12), w13 = W('s13', 'EVERY', 0.68, 'redSolid', 13), w14 = W('s14', 'NIGHT', 0.6, 'pinkWhite', 14, 0.7), w15 = W('s15', 'NO', 1.0, 'redSolid', 15);
    const plate = kit.quad({ ...CARD, w: w11.width + 0.7, h: 1.5 }); plate.position.set(0, 0, 0.12); group.add(plate);
    const streakA = kit.ribbon([[-8, -0.7, 0.9], [-2.5, -0.92, 0.9], [2.5, -0.98, 0.9], [8, -1.2, 0.9]], { width: 0.16, taper: 0.5, gain: 1.4 });
    const streakB = kit.ribbon([[-7.5, 0.1, 0.8], [-4.2, 0.02, 0.8], [-1.0, 0.0, 0.8]], { width: 0.14, taper: 0.5, gain: 1.4 });
    const vert = [kit.ribbon([[-1.5, 3.6, 0.9], [-1.15, 1.2, 0.9], [-1.4, -1.2, 0.9], [-1.0, -3.6, 0.9]], { width: 0.13, taper: 0.5, gain: 1.4 }), kit.ribbon([[1.7, -3.6, 0.9], [1.3, -1.0, 0.9], [1.6, 1.4, 0.9], [1.2, 3.6, 0.9]], { width: 0.13, taper: 0.5, gain: 1.4 })];
    const sweeps = [kit.ribbon(kit.arc(4.6, 150, 250, 22, { center: [0, 0, 1.2], squash: 0.6 }), { width: 0.09, gain: 1.35 }), kit.ribbon(kit.arc(5.4, -40, 60, 22, { center: [0, 0, -1.4], squash: 0.6 }), { width: 0.08, gain: 1.35 }), kit.ribbon(kit.arc(6.6, 60, 130, 22, { center: [0, 0, 0.6], squash: 0.5 }), { width: 0.2, gain: 1.35 }), kit.ribbon(kit.arc(7.2, 215, 300, 22, { center: [0, 0, 0.9], squash: 0.5 }), { width: 0.24, gain: 1.35 })];
    [streakA, streakB, ...vert, ...sweeps].forEach((r) => group.add(r.mesh));
    const glints = []; for (let i = 0; i < 6; i++) { const g = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, opacity: 0, color: '#fff0e0' }); g.userData = { t: 163 + i * 13.1, p: [R.range(-3.6, 3.6), R.range(-2, 2), 1.0] }; group.add(g); glints.push(g); }

    const dG = w14.width / (1.294 * 0.88) + 0.45;  // distance at which the giant word just fills the frame width
    const cam = [
      { rf: 159.5, p: [3.4, 2.3, 5.2], t: [2.8, 1.9, 0], roll: 24 },
      { rf: 163.6, p: [1.0, -0.35, 4.5], t: [0.55, -0.2, 0], roll: -5, e: 'out4' },
      { rf: 174.5, p: [0.5, -0.2, 4.1], t: [0.3, -0.12, 0], roll: 2.5, e: 'lin' },
      { rf: 177.4, p: [0.0, 0.0, 6.7], t: [0, 0, 0], roll: -3, e: 'out3' },
      { rf: 187, p: [0.15, 0.05, 6.2], t: [0.1, 0.05, 0], roll: 1.5, e: 'lin' },
      { rf: 189.6, p: [0.0, 0.0, 6.1], t: [0, 0, 0], roll: -5, e: 'out3' },
      { rf: 199.6, p: [0.0, 0.0, 5.6], t: [0, 0, 0], roll: 5, e: 'lin' },
      { rf: 200.3, p: [0.0, 0.0, 5.4], t: [0, 0, 0], roll: 4, e: 'lin' },
      { rf: 205.2, p: [0.0, -0.02, dG], t: [0.0, -0.02, 0], roll: 0, e: 'in2' },
      { rf: 216.8, p: [0.02, -0.02, dG * 0.93], t: [0.02, -0.02, 0], roll: -1, e: 'lin' },
      { rf: 219.8, p: [-2.6, 1.4, 1.6], t: [-3.4, 1.9, 0], roll: 24, e: 'in3' },
      { rf: 222.5, p: [0.3, 0.1, 3.1], t: [0.25, 0.1, 0], roll: -17, e: 'out4' },
      { rf: 236, p: [0.0, 0.0, 9.4], t: [0, 0, 0], roll: 13, e: 'out2' },
      { rf: 241, p: [0.0, 0.0, 12.0], t: [0, 0, 0], roll: 22, e: 'in2' },
    ];
    const show = (w, on, o = 1) => { if (!on) w.opacity(0); return on; };

    return { group, update(rf) {
      const T = rf - 160;
      haze.forEach((m, i) => { m.rotation.z = T * m.userData.sp; });
      sb.rotation.z = T * 0.0075; sb.scale.setScalar(1 + 0.05 * pulse(rf, 161.4, 5) + 0.06 * pulse(rf, 177.2, 5) + 0.05 * pulse(rf, 193, 5) + 0.05 * pulse(rf, 224.5, 5)); sbGlow.material.opacity = 0.2 + 0.14 * pulse(rf, 177.2, 6) + 0.14 * pulse(rf, 193, 6); sb.rotation.x = -0.28 + 0.06 * Math.sin(rf * 0.04); sb.rotation.y = 0.34 - T * 0.003;
      const pk = prog(rf, 160.6, 166.5, 'outBackSoft');
      petals.forEach((q, i) => { const u = q.userData; const a = u.a + T * 0.006; const r = u.r * pk + 0.25 * Math.sin(rf * 0.07 + u.ph); q.position.set(Math.cos(a) * r, Math.sin(a) * r, 0.1 + 0.25 * Math.sin(u.ph)); q.rotation.set(0.25 * Math.sin(rf * 0.05 + u.ph), 0.3 * Math.cos(rf * 0.04 + u.ph), a + 0.3); q.scale.setScalar(Math.max(0.001, pk)); q.visible = rf > 160.6; });
      floaters.forEach((q, i) => { const u = q.userData; q.position.set(u.p[0], u.p[1] + 0.12 * Math.sin(rf * 0.05 + u.ph), u.p[2]); q.rotation.set(0.3 * Math.sin(rf * 0.03 + u.ph), T * 0.008 * (i % 2 ? 1 : -1) + u.ph, 0.4 * Math.cos(rf * 0.035 + u.ph)); });
      rings.drift(T, 0.006, 0.06); discs.drift(T, 0.004, 0.05); ringsFar.drift(T, 0.004, 0.08); ringsNear.drift(T, 0.012, 0.1); dust.drift(T, [0.003, 0.009, 0.012], 0.07);
      notes.forEach((g, i) => { const u = g.userData; g.position.set(u.p.x + 0.08 * Math.sin(rf * 0.09 + u.ph), u.p.y + 0.14 * Math.sin(rf * 0.12 + u.ph * 2), u.p.z); g.rotation.set(0.3 * Math.sin(rf * 0.06 + u.ph), 0.5 * Math.sin(rf * 0.05 + u.ph), 0.25 * Math.sin(rf * 0.08 + u.ph)); g.visible = rf > 186 && rf < 240; g.scale.setScalar(u.s * prog(rf, 186 + i * 0.8, 191 + i * 0.8, 'outBackSoft')); });

      // --- words
      const a11 = rf < 176.3, a12 = rf >= 176.3 && rf < 188.3, a13 = rf >= 188.3 && rf < 200, a14 = rf >= 200 && rf < 219.8, a15 = rf >= 219.8;
      if (show(w11, a11)) { w11.intro(rf, { start: 160.6, stagger: 1.2, dur: 5.5, type: 'drop', amp: 0.6 }); w11.group.rotation.set(-0.24, 0.3 - T * 0.008, -0.1); w11.gain(1 + 0.35 * pulse(rf, 161.4, 5) + 0.5 * prog(rf, 174, 176.3, 'in2')); w11.sweep(prog(rf, 164, 172), 0.6); }
      plate.visible = a11; plate.rotation.set(-0.24, 0.3 - T * 0.008, -0.1); plate.scale.setScalar(prog(rf, 160.3, 164, 'outBackSoft'));
      if (show(w12, a12)) { w12.intro(rf, { start: 176.3, stagger: 0.55, dur: 4.5, type: 'pop' }); w12.group.rotation.set(-0.22, 0.26 - (rf - 177) * 0.006, -0.06); w12.gain(1 + 0.5 * pulse(rf, 177.2, 5)); w12.sweep(prog(rf, 179, 186), 0.6); }
      if (show(w13, a13)) { w13.intro(rf, { start: 188.3, stagger: 0.7, dur: 4.5, type: 'drop', amp: 0.5 }); w13.group.rotation.set(-0.22, 0.24, 0.08 - (rf - 189) * 0.012); w13.gain(1 + 0.45 * pulse(rf, 193, 5)); w13.sweep(prog(rf, 191, 198), 0.6); }
      if (show(w14, a14)) { w14.reset(1); w14.intro(rf, { start: 199.6, stagger: 0.4, dur: 3.5, type: 'pop' }); w14.group.rotation.set(-0.18, 0.2 - (rf - 206) * 0.004, -0.02); const d = prog(rf, 205.5, 213, 'io2'); w14.mixStyle('pinkWhite', 'silver', d); w14.gain(1 + 0.4 * pulse(rf, 205.6, 4) + 0.25 * pulse(rf, 208.7, 5)); w14.sweep(prog(rf, 208, 216), 0.5); }
      if (show(w15, a15)) { w15.intro(rf, { start: 219.8, stagger: 0.8, dur: 4.5, type: 'slam', amp: 0.4 }); w15.group.rotation.set(-0.26, 0.34 - (rf - 220) * 0.012, 0.05); w15.gain(1 + 0.4 * pulse(rf, 224.5, 5)); w15.sweep(prog(rf, 226, 234), 0.5); }
      streakA.swoosh(rf, 167.5, 171, 171.5, 175); streakB.swoosh(rf, 180.5, 183.5, 184, 187); vert[0].swoosh(rf, 193.5, 196.5, 197, 200); vert[1].swoosh(rf, 194.3, 197.3, 197.6, 200.5);
      sweeps[0].swoosh(rf, 162, 167, 169, 175); sweeps[1].swoosh(rf, 178, 183, 184, 189); sweeps[2].swoosh(rf, 222, 227, 229, 236); sweeps[3].swoosh(rf, 224, 229, 231, 238);
      glints.forEach((g) => { const k = pulse(rf, g.userData.t, 5, 1.4); g.material.opacity = k; const s = 0.3 + 0.7 * k; g.scale.set(s, s, 1); g.position.set(...g.userData.p); g.material.rotation = (rf - g.userData.t) * 0.08; });

      const c = kit.cam(cam, rf); c.pos.add(kit.shake(rf, 0.03, 0.45, 17)); c.aperture = a14 ? 0.012 : 0.05; c.focus = c.pos.z - 0.4;
      const P = (t, l = 3) => pulse(rf, t, l, 2.2); const punch = Math.max(P(176), P(188.4), P(219.6, 3.5));
      const giant = prog(rf, 201, 205.6, 'in2') * (1 - prog(rf, 205.6, 207.5));
      return { cam: c, clear: 0x0a0206, post: {
        desat: track([[205.5, 0], [213, 1, 'io2'], [219.5, 1], [221, 0.5, 'out2'], [236, 0.55], [241, 1, 'in2']], rf),
        zoomBlur: Math.max(0.5 * (1 - prog(rf, 159.5, 163.5, 'out2')), 0.8 * punch, 0.55 * giant, 0.6 * prog(rf, 237, 241, 'in2')),
        bloom: 0.62 + 0.4 * punch + 0.2 * (pulse(rf, 161.4, 5) + pulse(rf, 193, 5) + pulse(rf, 208.7, 5) + pulse(rf, 224.5, 5)), bloomThreshold: 0.86, vignette: 0.85, saturation: 1.06, contrast: 1.1,
        exposure: (1.06 + 0.3 * punch + 0.14 * (pulse(rf, 161.4, 4) + pulse(rf, 177.2, 4) + pulse(rf, 193, 4) + pulse(rf, 208.7, 4) + pulse(rf, 224.5, 4))) * lerp(1, 0.5, prog(rf, 237, 241, 'in2')),
        chroma: 0.0014 + 0.006 * punch + 0.003 * giant, lens: 0.12 * punch + 0.07 * (pulse(rf, 161.4, 6) + pulse(rf, 193, 6) + pulse(rf, 224.5, 6)),
        zoom: 1 + 0.03 * (pulse(rf, 161.4, 5) + pulse(rf, 177.2, 5) + pulse(rf, 193, 5) + pulse(rf, 208.7, 5) + pulse(rf, 224.5, 5)),
        bars: track([[160, 0.03], [164, 0.05, 'out3'], [200, 0.05], [206, 0.082, 'out3'], [218, 0.082], [222, 0.045], [241, 0.03]], rf), barsAlpha: 0.92,
        rays: 0.25 * (pulse(rf, 177.2, 8) + pulse(rf, 193, 8)), raysCenter: [0.5, 0.5], flash: Math.max(0.26 * P(176), 0.26 * P(188.4), 0.34 * pulse(rf, 202.6, 4, 2.4), 0.36 * P(219.9, 3.5)), flashColor: [1, 0.86, 0.84], leak: 0.2, leakColor: [1, 0.3, 0.2], leakPos: [0.02, 0.95], leakSize: 0.85,
      } };
    } };
  },
};
