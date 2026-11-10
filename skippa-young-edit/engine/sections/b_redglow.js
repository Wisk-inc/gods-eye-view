// SECTION B — "red glow"  (reference frames 21–48)
//   rf 21–27  word s03 rises from the bottom into a red concentric-ripple field, white-hot face, red halo
//   rf 26–33  white ribbon burst: thick trim-path strokes criss-cross the whole frame (acts as a flash)
//   rf 33–36  word s04 whips in from the left
//   rf 36–43  s04 holds on a dark red vignette: thin white arcs, two white beams from below, slow clockwise roll
//   rf 44–48  the roll accelerates and the camera dives through the word (roll transition into section C)
import { ease, prog, sat, lerp, track, pulse } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group();

    // --- backgrounds
    const ripple = kit.bg('ripple', { a: '#4a0a0a', b: '#0b0001', c: '#8e1f1b', rings: 30, vig: 0.98 }); ripple.position.z = -6; group.add(ripple);
    const dark = kit.bg('grad', { a: '#4c0508', b: '#080001', vig: 0.9, scale: 1.3 }); dark.position.z = -6; group.add(dark);

    // --- word s03
    const w3 = kit.word(words.s03 || 'THE', { size: 1, depth: 0.5, style: 'redGlow', seed: 3 }); group.add(w3.group);
    const halo3 = kit.plate(tex.glow, 7.5, 4.6, { color: '#ff1206', additive: true, opacity: 0.5 }); halo3.position.z = -0.6; group.add(halo3);

    // --- ribbon burst (in front of everything)
    const R = [
      [[-9, 1.2, 1.4], [-3, 2.0, 1.4], [3, 0.6, 1.4], [9, 1.6, 1.4]],
      [[9, -0.6, 1.3], [3, -1.4, 1.3], [-2, -0.2, 1.3], [-9, -1.2, 1.3]],
      [[-2.6, 4.6, 1.5], [-2.0, 1.5, 1.5], [-2.9, -1.5, 1.5], [-2.2, -4.6, 1.5]],
      [[2.3, -4.6, 1.5], [2.9, -1.2, 1.5], [1.9, 1.6, 1.5], [2.6, 4.6, 1.5]],
      [[-9, -2.6, 1.6], [-4, -1.2, 1.6], [0, -2.4, 1.6], [5, -1.0, 1.6], [9, -2.2, 1.6]],
      [[9, 2.9, 1.6], [4, 1.9, 1.6], [-1, 3.0, 1.6], [-9, 2.2, 1.6]],
      [[-6.2, 4.4, 1.7], [-5.0, 0.4, 1.7], [-6.4, -4.4, 1.7]],
      [[6.0, -4.4, 1.7], [5.2, 0.2, 1.7], [6.4, 4.4, 1.7]],
      [[-9, 0.1, 1.8], [-3, -0.5, 1.8], [3, 0.5, 1.8], [9, -0.2, 1.8]],
      [[0.3, 4.6, 1.8], [-0.4, 1.0, 1.8], [0.5, -2.0, 1.8], [-0.1, -4.6, 1.8]],
    ];
    const burst = R.map((pts, i) => { const r = kit.ribbon(pts, { width: [0.34, 0.3, 0.42, 0.38, 0.5, 0.44, 0.6, 0.55, 0.7, 0.62][i], taper: 0.5, shade: 0.12 }); group.add(r.mesh); return r; });

    // --- word s04 and its dressing
    const w4 = kit.word(words.s04 || 'NIGHTS', { size: 1.25, depth: 0.62, style: 'redSolid', seed: 4 }); group.add(w4.group);
    const dN = w4.width / (1.294 * 0.6);   // camera distance at which the word spans 60 % of the frame width
    const halo4 = kit.plate(tex.glow, 10, 5.6, { color: '#ff0a05', additive: true, opacity: 0.4 }); halo4.position.z = -0.9; group.add(halo4);
    const arcs = [
      kit.ribbon(kit.arc(3.4, 200, 330, 24, { center: [-0.2, 0.3, -0.5], squash: 0.55 }), { width: 0.08 }),
      kit.ribbon(kit.arc(3.0, 20, 150, 24, { center: [0.6, 0.4, -0.4], squash: 0.6 }), { width: 0.07 }),
      kit.ribbon(kit.arc(4.2, 120, 220, 24, { center: [0.2, 0.0, 0.5], squash: 0.75 }), { width: 0.1 }),
      kit.ribbon(kit.arc(3.8, -60, 40, 24, { center: [-0.3, 0.1, 0.4], squash: 0.7 }), { width: 0.09 }),
    ]; arcs.forEach((a) => group.add(a.mesh));
    const beams = [
      kit.ribbon([[-0.75, -5.5, -0.35], [-0.2, -2.6, -0.35], [0.12, -0.55, -0.35]], { width: 0.34, taper: 0.28, shade: 0.3 }),
      kit.ribbon([[1.15, -5.5, -0.35], [0.62, -2.6, -0.35], [0.3, -0.55, -0.35]], { width: 0.34, taper: 0.28, shade: 0.3 }),
    ]; beams.forEach((b) => group.add(b.mesh));

    const camA = [ // s03
      { rf: 20, p: [0, 0.1, 4.3], t: [0, 0.1, 0], roll: 0 },
      { rf: 24, p: [0, 0.1, 4.5], t: [0, 0.1, 0], roll: 0, e: 'out3' },
      { rf: 33, p: [0, 0.2, 6.2], t: [0, 0.2, 0], roll: -2, e: 'io2' },
    ];
    const camB = [ // s04
      { rf: 33, p: [0, 0.05, dN * 1.12], t: [0, 0.05, 0], roll: -6 },
      { rf: 37, p: [0, 0.05, dN], t: [0, 0.05, 0], roll: -4, e: 'out3' },
      { rf: 41, p: [0, 0.03, dN * 0.95], t: [0, 0.03, 0], roll: 4, e: 'lin' },
      { rf: 44.5, p: [0, 0, dN * 0.78], t: [0, 0, 0], roll: 30, e: 'in2' },
      { rf: 48, p: [0.0, 0.0, 1.4], t: [0.0, 0.0, 0], roll: 100, e: 'in2' },
    ];

    return { group, update(rf) {
      const first = rf < 33;
      ripple.visible = first; dark.visible = !first; ripple.u.uTime.value = rf / 30;
      // s03: rise + settle
      w3.group.visible = halo3.visible = first;
      if (first) {
        const y = track([[20, -2.9], [23.2, 0.05, 'out4'], [27, 0.32, 'io2'], [33, 0.5, 'lin']], rf);
        w3.group.position.set(0, y, 0); w3.group.rotation.set(-0.3 + 0.22 * (1 - prog(rf, 20, 24, 'out3')), 0.3, -0.03); w3.reset(1);
        w3.gain(1.0 + 0.35 * pulse(rf, 23, 5)); halo3.position.set(0, y, -0.9); halo3.material.opacity = 0.5 * prog(rf, 20.5, 23, 'out2');
      }
      // ribbon burst
      burst.forEach((r, i) => { const t0 = 26.4 + i * 0.4; r.swoosh(rf, t0, t0 + 3.2, t0 + 3.6, t0 + 6.6, 1 + 0.5 * prog(rf, 28, 31)); });
      // s04
      w4.group.visible = halo4.visible = !first; arcs.forEach((a) => (a.mesh.visible = !first)); beams.forEach((b) => (b.mesh.visible = !first));
      if (!first) {
        const k = prog(rf, 32.6, 36.2, 'out5'); const x = 0; w4.group.position.set(lerp(-0.9, 0, k), lerp(-0.35, 0, k), lerp(-7, 0, k)); w4.group.scale.setScalar(1); w4.opacity(prog(rf, 32.6, 34.2));
        w4.group.rotation.set(-0.3, lerp(-0.5, 0.34, k), lerp(-0.3, -0.05, k)); w4.reset(1); w4.gain(1.05 + 0.4 * pulse(rf, 36, 5) + 0.35 * prog(rf, 43, 47));
        halo4.position.set(x, 0, -0.9);
        arcs.forEach((a, i) => a.swoosh(rf, 34 + i * 0.8, 38 + i * 0.8, 41 + i * 0.5, 47));
        beams.forEach((b, i) => b.swoosh(rf, 35 + i * 0.6, 38.5 + i * 0.6, 60, 70));
      }
      const cam = kit.cam(first ? camA : camB, rf); const sh = kit.shake(rf, 0.035, 0.45, 2); cam.pos.add(sh);
      return { cam, clear: first ? 0x200002 : 0x080001, post: {
        bloom: first ? 0.75 : 0.65, bloomThreshold: 0.8, vignette: first ? 0.9 : 0.9, chroma: 0.0016 + 0.004 * pulse(rf, 33, 4),
        bars: track([[21, 0], [35, 0], [38, 0.042, 'out3'], [48, 0.05]], rf), barsAlpha: 0.92,
        zoomBlur: 0.55 * prog(rf, 44.5, 48, 'in2'), exposure: 1 + 0.18 * pulse(rf, 23, 4) + 0.15 * pulse(rf, 36, 4), saturation: 1.12,
      } };
    } };
  },
};
