// SECTION E — "maroon cards"  (reference frames 118–160)
//   rf 118–124  a white disc with a red rim shrinks away over the scene
//   rf 122–133  word s08 (two words) in dark crimson: letters arrive one per frame, alternately dropping and
//               rising; upper centre, sloping down to the right
//   rf 134–139  whip up-right
//   rf 139–152  word s10 enters giant from the left with a white-pink flash, settles centre sloping up
//   rf 152–155  the spiky starburst grows in from the lower left        rf 156–160  whip toward it (hand-off)
import { ease, prog, sat, lerp, track, pulse, rng } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group();
    const CARD = { fill: '#b8141c', fill2: '#6a060c', outline: '#ffe6d6', ow: 0.04, r: 0.07 };

    const makeSet = (seed, cards, withPanels) => {
      const g = new THREE.Group(); const R = rng(seed);
      const bg = kit.bg('grad', { a: '#2e0a14', b: '#070104', vig: 0.9, scale: 1.2, w: 120, h: 70 }); bg.position.z = -16; g.add(bg);
      if (withPanels) [
        { pts: [[-2.2, -7], [-0.4, 0.2], [4.6, -1.8], [5.2, -7]], c: '#7a1430', z: -3.2 }, { pts: [[-9, -7], [-6.2, -1.2], [-2.6, -7]], c: '#520c20', z: -3.6 },
        { pts: [[4.9, -7], [5.0, -1.9], [11, 1.6], [11, -7]], c: '#8e1e38', z: -3.9 }, { pts: [[-10, 7], [-9.5, 2.6], [-3.4, 4.2], [-2.8, 7]], c: '#3c0818', z: -4.4 },
        { pts: [[2.4, 7], [3.6, 3.3], [10, 2.4], [10, 7]], c: '#5a0e26', z: -4.8 },
      ].forEach((f) => { const m = kit.poly(f.pts, { color: f.c }); m.position.z = f.z; g.add(m); });
      const cs = cards.map((c) => { const q = kit.quad({ ...CARD, w: c[3], h: c[4] }); q.position.set(c[0], c[1], c[2]); q.rotation.set(c[5], c[6], c[7]); q.userData = { p: [c[0], c[1], c[2]], r: [c[5], c[6], c[7]], ph: R() * 6 }; g.add(q); return q; });
      const rings = kit.bubbles({ count: 46, box: [13, 7.5, 5], center: [0, 0, 0.2], size: [0.1, 0.8], seed: seed + 1, kinds: ['ring', 'ringBold', 'ringBold', 'ring'], avoid: 1.2, gain: 1.25 }); g.add(rings);
      const ringsFar = kit.bubbles({ count: 14, box: [22, 12, 4], center: [0, 0, -6], size: [0.1, 0.4], seed: seed + 2, kinds: ['ringOpen', 'ringThin'], opacity: 0.45 }); g.add(ringsFar);
      const dust = kit.dust({ count: 200, box: [16, 9, 9], size: 0.04, seed: seed + 3, color: '#ffd0dc', opacity: 0.8 }); g.add(dust);
      const glow = kit.plate(tex.glow, 13, 7, { color: '#ff1c50', additive: true, opacity: 0.2 }); glow.position.z = -1.4; g.add(glow);
      return { g, cs, rings, ringsFar, dust };
    };
    // x, y, z, w, h, rx, ry, rz
    const S1 = makeSet(81, [[3.7, 1.75, -0.9, 2.8, 1.8, 0.2, -0.5, -0.16], [-3.9, -2.5, 0.5, 2.6, 1.6, -0.25, 0.45, 0.1], [-4.6, 2.5, -2.2, 1.3, 1.3, 0.3, 0.4, 0.5], [1.4, -3.0, -1.6, 1.5, 1.2, -0.3, -0.2, -0.3], [6.2, -2.0, -3.0, 1.2, 1.2, 0.2, 0.6, 0.35], [-6.6, 0.4, -1.8, 1.6, 1.3, 0.2, 0.5, -0.3], [5.6, 3.4, -2.6, 1.4, 1.4, -0.3, -0.4, 0.2], [-1.6, -3.4, -0.6, 1.9, 1.3, 0.25, 0.3, 0.2], [-8.4, -3.0, -3.4, 1.5, 1.5, 0.2, 0.3, 0.4]], true);
    const S2 = makeSet(91, [[2.9, 1.65, -0.7, 2.3, 1.75, 0.25, -0.45, 0.5], [-2.3, 0.1, -0.5, 2.1, 1.5, -0.15, 0.4, 0.42], [4.4, -1.9, 0.2, 1.7, 1.9, 0.2, -0.35, -0.12], [-0.6, -2.9, -1.3, 1.2, 1.2, -0.3, 0.2, 0.1], [-5.0, 2.6, -2.4, 1.3, 1.0, 0.3, 0.5, -0.4], [6.4, 2.9, -3.2, 1.1, 1.1, -0.2, -0.5, 0.25], [-5.4, -0.9, -1.2, 1.8, 1.4, 0.2, 0.5, 0.3], [0.9, 3.5, -1.8, 1.5, 1.2, -0.25, -0.3, -0.2], [6.9, 0.3, -1.4, 1.5, 1.6, 0.2, -0.5, 0.3], [7.6, 5.0, -2.6, 1.6, 1.3, 0.2, 0.4, 0.3]], false);
    S2.g.position.set(-40, -24, 0); group.add(S1.g, S2.g);

    const w8 = kit.word(words.s08 || 'I FOUGHT', { size: 1, depth: 0.55, style: 'crimson', seed: 8 }); w8.group.position.set(-0.1, 0.95, 0); S1.g.add(w8.group);
    const strokes1 = [
      kit.ribbon([[2.2, -0.2, 0.6], [3.4, -1.0, 0.6], [5.0, -1.2, 0.6], [6.4, -0.6, 0.6]], { width: 0.24, taper: 0.55, gain: 1.3 }),
      kit.ribbon([[-6.8, 3.4, 0.4], [-4.6, 2.9, 0.4], [-2.9, 3.3, 0.4], [-1.4, 2.6, 0.4]], { width: 0.2, taper: 0.6, gain: 1.3 }),
      kit.ribbon(kit.arc(4.4, 205, 260, 18, { center: [0.2, 1.2, -0.6], squash: 0.7 }), { width: 0.07, gain: 1.3 }),
    ]; strokes1.forEach((r) => S1.g.add(r.mesh));

    const w10 = kit.word(words.s10 || 'WITH', { size: 1.3, depth: 0.6, style: { top: '#ff9690', bot: '#cc1e28', side: '#8e0c14', sideDark: '#2a0206', rim: '#ffffff', gain: 1.0, chrome: 0.1, rimAmt: 0.95 }, seed: 10 }); S2.g.add(w10.group);
    const flashGlow = kit.plate(tex.glow, 10, 5.5, { color: '#ffd0dc', additive: true, opacity: 0 }); flashGlow.position.z = 0.4; S2.g.add(flashGlow);
    const strokes2 = [
      kit.ribbon([[3.0, 3.6, 0.7], [3.9, 1.6, 0.7], [5.2, -0.2, 0.7], [6.6, -1.4, 0.7]], { width: 0.36, taper: 0.45, gain: 1.35 }),
      kit.ribbon([[0.6, 3.9, -0.4], [0.9, 2.9, -0.4], [0.7, 2.0, -0.4]], { width: 0.12, taper: 0.6, gain: 1.3 }),
      kit.ribbon(kit.arc(4.8, -30, 30, 18, { center: [0, 0, -0.8], squash: 0.8 }), { width: 0.06, gain: 1.3 }),
      kit.ribbon([[-5.6, 2.8, 0.5], [-3.6, 2.2, 0.5], [-2.2, 2.6, 0.5]], { width: 0.2, taper: 0.55, gain: 1.35 }),
      kit.ribbon([[1.6, -3.4, 0.6], [2.8, -2.6, 0.6], [4.4, -2.8, 0.6]], { width: 0.16, taper: 0.55, gain: 1.35 }),
    ]; strokes2.forEach((r) => S2.g.add(r.mesh));
    const sb = kit.starburst({ rInner: 1.25, rValley: 1.65, rTip: 2.7, spikes: 24, rays: 15, rayLen: [4, 9], fill: '#c9141d', outline: '#ffd2a6', ring: '#ff2bd0', disc: '#2a0410', seed: 9 });
    sb.position.set(-3.7, -2.5, -0.9); S2.g.add(sb);

    const O2 = S2.g.position;
    const cam1 = [
      { rf: 118, p: [0.0, 0.35, 6.4], t: [0, 0.3, 0], roll: 2.5 },
      { rf: 126, p: [0.0, 0.3, 5.75], t: [0, 0.25, 0], roll: 0.5, e: 'out3' },
      { rf: 136, p: [0.1, 0.25, 5.35], t: [0.1, 0.2, 0], roll: -1.5, e: 'lin' },
      { rf: 139, p: [0.2, -0.55, 7.2], t: [0.2, -0.65, 0], roll: 16, e: 'in2' },
    ];
    const cam2 = [
      { rf: 139, p: [O2.x + 0.9, O2.y + 0.5, 6.2], t: [O2.x + 0.8, O2.y + 0.4, 0], roll: 14 },
      { rf: 144.5, p: [O2.x + 0.3, O2.y + 0.1, 5.5], t: [O2.x + 0.3, O2.y + 0.05, 0], roll: 1.5, e: 'out4' },
      { rf: 153, p: [O2.x + 0.1, O2.y - 0.1, 5.0], t: [O2.x + 0.1, O2.y - 0.15, 0], roll: -2, e: 'lin' },
      { rf: 156, p: [O2.x - 0.3, O2.y - 0.4, 5.0], t: [O2.x - 0.4, O2.y - 0.5, 0], roll: -4, e: 'in2' },
      { rf: 160, p: [O2.x - 4.5, O2.y - 3.1, 4.2], t: [O2.x - 4.0, O2.y - 2.7, 0], roll: -24, e: 'in3' },
    ];
    const DISC = [[118, 1.0], [119, 0.85], [120, 0.62], [121, 0.45], [122, 0.3], [123, 0.17], [124, 0.07], [125, 0]];
    const animSet = (S, rf, t0) => { S.cs.forEach((q, i) => { const u = q.userData; q.rotation.set(u.r[0] + Math.sin(rf * 0.05 + u.ph) * 0.08, u.r[1] + (rf - t0) * 0.006 * (i % 2 ? 1 : -1), u.r[2] + Math.sin(rf * 0.04 + u.ph * 2) * 0.05); q.position.set(u.p[0], u.p[1] + Math.sin(rf * 0.06 + u.ph) * 0.08, u.p[2]); }); S.rings.drift(rf - t0, 0.008, 0.06); S.ringsFar.drift(rf - t0, 0.005, 0.08); S.dust.drift(rf - t0, [0.004, 0.01, 0.01], 0.07); };

    return { group, update(rf) {
      const first = rf < 139; S1.g.visible = first; S2.g.visible = !first;
      if (first) {
        if (w8.group.parent !== S1.g) { S1.g.add(w8.group); w8.group.position.set(-0.1, 0.95, 0); w8.group.scale.setScalar(1); w8.opacity(1); }
        animSet(S1, rf, 118); const n = w8.n;
        for (let i = 0; i < n; i++) { const st = 121.6 + i * (7.2 / Math.max(1, n - 1)); const t = (rf - st) / 5.5; if (t <= 0) { w8.pose(i, { o: 0 }); continue; } const e = ease.outBackSoft(sat(t)), k = 1 - e, up = i % 2 ? -1 : 1; w8.pose(i, { y: k * up * 1.7, rz: k * up * 0.6, s: 1 + k * 0.35, o: sat(t * 4) }); }
        w8.group.rotation.set(-0.26, 0.32 - (rf - 122) * 0.004, -0.14); w8.gain(1.0 + 0.3 * pulse(rf, 129.8, 5)); w8.sweep(prog(rf, 128, 135), 0.6);
        strokes1[0].swoosh(rf, 126, 130, 131, 135); strokes1[1].swoosh(rf, 128, 132, 132.5, 136.5); strokes1[2].swoosh(rf, 124, 129, 130, 135);
      } else {
        // the previous word lingers at the top, rolled and receding, while the next one arrives
        if (w8.group.parent !== S2.g) S2.g.add(w8.group); w8.reset(1); const gk = prog(rf, 139, 151, 'out2');
        w8.group.position.set(0.7 + 0.2 * gk, 1.75 + 0.1 * gk, -2.6 - 2.4 * gk); w8.group.scale.setScalar(0.9); w8.group.rotation.set(-0.3 - 0.5 * gk, 0.3, -0.12 - 0.2 * gk); w8.gain(lerp(0.75, 0.3, gk)); w8.opacity(1 - prog(rf, 144, 151)); w8.sweep(0, 0);
        animSet(S2, rf, 139);
        const k = prog(rf, 138.6, 145, 'out4'); w10.group.position.set(lerp(-1.5, 0, k), lerp(-0.9, 0.05, k), lerp(-6.5, 0, k)); w10.group.scale.setScalar(1);
        w10.group.rotation.set(-0.28, lerp(0.7, 0.3, k) - (rf - 145) * 0.003, lerp(0.4, 0.26, k));
        w10.intro(rf, { start: 138.8, stagger: 1.6, dur: 5.5, type: 'drop', amp: 0.7 });
        const fl = pulse(rf, 143, 3.5, 1.2); w10.gain(1.0 + 0.8 * fl + 0.25 * pulse(rf, 145.6, 5)); flashGlow.material.opacity = 0.35 * fl; flashGlow.position.copy(w10.group.position).add(new THREE.Vector3(0, 0, 0.4)); w10.sweep(prog(rf, 146, 153), 0.7);
        strokes2[0].swoosh(rf, 144.5, 148.5, 150, 155); strokes2[1].swoosh(rf, 147, 150, 151, 155); strokes2[2].swoosh(rf, 143, 148, 149, 154); strokes2[3].swoosh(rf, 145.5, 149, 150, 154); strokes2[4].swoosh(rf, 147, 150.5, 151.5, 155.5);
        const g = prog(rf, 151.6, 156.5, 'outBackSoft'); sb.scale.setScalar(Math.max(0.001, g * 1.15)); sb.rotation.z = (rf - 152) * 0.03; sb.visible = rf > 151.6;
      }
      const cam = kit.cam(first ? cam1 : cam2, rf); cam.pos.add(kit.shake(rf, 0.03, 0.42, 13));
      return { cam, clear: 0x0b0207, post: {
        irisDisc: rf < 125 ? track(DISC, rf) : 0, irisRim: [1, 0.05, 0.1], irisBg: [1, 1, 1],
        bloom: 0.62 + 0.25 * pulse(rf, 129.8, 5) + 0.45 * pulse(rf, 143, 4) + 0.25 * pulse(rf, 145.6, 5), bloomThreshold: 0.82, vignette: 0.8, saturation: 1.12, contrast: 1.08,
        exposure: 1 + 0.25 * (1 - prog(rf, 118, 124)) + 0.14 * pulse(rf, 129.8, 4) + 0.3 * pulse(rf, 143, 3.5), chroma: 0.0014 + 0.004 * pulse(rf, 143, 4) + 0.004 * prog(rf, 156, 160),
        zoom: 1 + 0.03 * pulse(rf, 129.8, 5) + 0.035 * pulse(rf, 145.6, 5), lens: 0.07 * pulse(rf, 129.8, 6) + 0.1 * pulse(rf, 143, 5),
        bars: track([[118, 0], [124, 0], [128, 0.06, 'out3'], [156, 0.06], [160, 0.03]], rf), barsAlpha: 0.55,
        leak: 0.2, leakColor: [1, 0.25, 0.32], leakPos: [0.98, 0.05], leakSize: 0.8, zoomBlur: 0.28 * pulse(rf, 138.8, 3.5, 2.6) + 0.5 * prog(rf, 157, 160, 'in2'), tint: [1.04, 0.97, 0.94],
      } };
    } };
  },
};
