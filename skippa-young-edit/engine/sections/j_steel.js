// SECTION J — "steel particles / when I'm gone"  (reference frames 367–525). Ten word shots (s20–s29) in ONE
// continuous 3D space: the camera flies from word to word, earlier words stay behind, dim and out of focus.
//   370 s20 huge → top-centre · 379 s21 letters pop in below · 395 s22 enters giant from bottom-left
//   413 flash + spin round the word · 419 s23 rotates in · 426 s24 rises · 440 s25 letters drop from the top
//   453 s26 → 462 extends into s27 · 472 teal whip · 479 s28 with a thick crescent · 490 flight through the
//   dot strings · 494–496 cyan flash · 497 s29 (the title word) — final hold · 516 contrast pop · 518 smoke wipe
// Look: matte silver letters (light top → grey bottom, white bevel, near-black sides) in a near-black teal-grey
// void full of bokeh dot strings, dark-filled rings, black outlined tiles and thick white crescents.
import { ease, prog, sat, lerp, track, pulse, rng, TAU } from '../util.js';

const STEEL = { top: '#cdd1d3', bot: '#787e83', side: '#2b3035', sideDark: '#030405', rim: '#ffffff', gain: 0.86, chrome: 0.12, rimAmt: 0.8 };

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(367);
    const P = { s20: [0, 3.2, 0], s21: [0, 0.5, 1.0], s22: [-3.4, -2.7, 2.4], s23: [2.6, -5.6, 0], s24: [2.6, -7.7, 1.2], s25: [2.6, -5.5, 2.8], s26: [2.6, -3.2, 4.4], s28: [10, -2.2, 3.0], s29: [10, -2.4, -9] };
    const PL = Object.values(P);

    // ---- the void: near-black teal-grey, soft light blooms far back
    const bg = kit.bg('grad', { a: '#2b373c', b: '#020405', vig: 0.9, scale: 1.0, w: 320, h: 180 }); bg.position.set(4, -3, -48); group.add(bg);
    PL.forEach((c) => { for (let k = 0; k < 2; k++) { const s = R.range(9, 17); const m = kit.plate(tex.glow, s, s, { color: '#6f858d', additive: true, opacity: R.range(0.05, 0.13) }); m.position.set(c[0] + R.range(-6, 6), c[1] + R.range(-3.5, 3.5), c[2] - R.range(6, 12)); group.add(m); } });
    // a spot is "clear" when it does not sit between any word and the camera that will look at it
    const clear = (x, y, z, rad) => PL.every((c) => z < c[2] - 0.5 || Math.hypot(x - c[0], (y - c[1]) * 1.5) > rad);
    const place = (c, d0, d1, z0, z1, rad) => { let x, y, z, n = 0; do { const a = R() * TAU, d = R.range(d0, d1); x = c[0] + Math.cos(a) * d; y = c[1] + Math.sin(a) * d * 0.6; z = c[2] + R.range(z0, z1); } while (!clear(x, y, z, rad) && ++n < 40); return [x, y, z]; };
    // ---- bead strings (analytic bokeh): one cluster per word, a near layer, a corridor for the last flight
    let beads = []; PL.forEach((c, i) => { beads = beads.concat(kit.stringPoints({ strings: 3, dots: 44, box: [13, 8, 5], center: [c[0], c[1], c[2] - 1.6], size: 0.1, seed: 368 + i * 3 })); });
    beads = beads.concat(kit.stringPoints({ strings: 7, dots: 40, box: [36, 22, 10], center: [4.5, -3, -5], size: 0.13, seed: 369 }));
    group.add(kit.bokeh(beads.filter((p) => clear(p[0], p[1], p[2], 1.5)), { gain: 0.85, floor: 0.1 }));
    const strings3 = kit.bokeh(kit.stringPoints({ strings: 9, dots: 46, box: [9, 6, 12], center: [10, -2.3, -3], size: 0.1, seed: 371 }).filter((p) => clear(p[0], p[1], p[2], 1.7)), { gain: 0.9, floor: 0.1 }); group.add(strings3);
    // ---- black tiles with a thin light outline, tumbling slowly (soft cards: they blur cleanly out of focus)
    const tiles = []; PL.forEach((c) => { for (let i = 0; i < 5; i++) { const sz = R.range(0.7, 2.1); const q = kit.soft({ w: sz, h: sz * R.range(0.8, 1.15), r: 0.05, fill: '#030506', line: '#d6e0e6', ow: 0.032, gain: 1.15 }); q.position.set(...place(c, 2.6, 5.6, -3.6, 0.9, 3.0)); q.userData = { r: [R.range(-0.7, 0.7), R.range(-0.9, 0.9), R.range(-0.7, 0.7)], sp: R.range(-0.012, 0.012), ph: R() * 6 }; q.renderOrder = -2; group.add(q); tiles.push(q); } });
    // ---- bubbles: thin rings, some with the reference's dark fill, a few bold donuts
    const bubbles = []; PL.forEach((c) => { for (let i = 0; i < 22; i++) { const s = lerp(0.08, 0.62, Math.pow(R(), 2.0)); const kind = R(); const q = kit.soft({ w: s, h: s, r: s, fill: '#03070a', fillA: kind < 0.45 ? 0.55 : 0, line: '#eef6fa', ow: kind > 0.88 ? s * 0.16 : Math.max(0.012, s * 0.035) }); q.position.set(...place(c, 1.3, 5.2, -2.6, 1.0, 1.9)); q.userData = { b: q.position.clone(), ph: R() * 50, k: R.range(0.5, 1.3) }; q.renderOrder = -1; group.add(q); bubbles.push(q); } });
    const dust = kit.dust({ count: 460, box: [36, 22, 30], center: [4.5, -3, -2], size: 0.04, seed: 380, color: '#e2f4ff', opacity: 0.8 }); group.add(dust);
    [['bubbles', 's21', [3.4, -0.9, -1.2], 2.4, 0.5], ['bubbles', 's25', [-3.6, 1.0, -1.5], 2.2, 0.45], ['plus1', 's22', [3.0, 1.6, -1.4], 1.5, 0.35], ['plus2', 's28', [-3.2, -1.7, -1.6], 1.6, 0.35], ['halftone1', 's29', [4.2, -2.1, -2.4], 3.4, 0.2], ['bubbles', 's29', [-3.9, 1.4, -1.3], 2.3, 0.5], ['bubbles', 's23', [3.2, 1.3, -1.6], 2.2, 0.45]]
      .forEach(([n, k, o, h, op]) => { const m = kit.sprite(n, h, { opacity: op, color: '#dcefff' }); m.position.set(P[k][0] + o[0], P[k][1] + o[1], P[k][2] + o[2]); group.add(m); });

    // ---- words
    const mk = (key, fb, size) => { const w = kit.word(words[key] || fb, { size, depth: 0.5, style: STEEL, seed: key.charCodeAt(2) * 7 + key.charCodeAt(1) }); w.group.position.set(...P[key === 's27' ? 's26' : key]); w.set('uGrit', 0.035); w.set('uFaceAmt', 0.14); group.add(w.group); return w; };
    const W = { s20: mk('s20', 'WHEN', 1.1), s21: mk('s21', "I'M GONE", 1.0), s22: mk('s22', 'WILL', 1.3), s23: mk('s23', 'THEY', 1.2), s24: mk('s24', 'SAY', 1.2), s25: mk('s25', 'THAT', 1.35), s26: mk('s26', 'I', 1.3), s27: mk('s27', 'I WAS', 1.3), s28: mk('s28', 'ONLY', 1.5), s29: mk('s29', 'YOUNG', 1.45) };
    const n26 = W.s26.n;
    // camera distance that makes the cap height `frac` of the frame height (never wider than 80 % of the frame)
    const D = (k, frac) => Math.max(W[k].size / (0.728 * frac), W[k].width / (1.294 * 0.8));
    const d20 = D('s20', 0.5), d21 = D('s21', 0.3), d22 = D('s22', 0.47), d23 = D('s23', 0.43), d24 = D('s24', 0.4), d25 = D('s25', 0.37), d26 = D('s27', 0.37), d28 = D('s28', 0.54), d29 = D('s29', 0.45);

    // ---- strokes: thin arcs, a ribbon, a wave, and the thick crescents
    const ar = (k, rad, a0, a1, o = {}) => { const r = kit.ribbon(kit.arc(rad, a0, a1, 30, { center: [P[k][0] + (o.x || 0), P[k][1] + (o.y || 0), P[k][2] + (o.z ?? 0.35)], squash: o.sq || 1 }), { width: o.w || 0.1, gain: 1.4, taper: o.t || 0.7 }); group.add(r.mesh); return r; };
    const rib = {
      a22: ar('s22', 2.5, 40, 118, { w: 0.2, y: -0.3, x: 0.2, t: 0.55 }), b22: ar('s22', 3.4, 28, 80, { w: 0.1, y: -0.9, x: -0.3, z: -0.5 }),
      a23: ar('s23', 2.6, 12, 172, { w: 0.13, sq: 0.62, y: -0.5, z: -0.3 }), c26: ar('s26', 2.15, -64, 64, { w: 0.4, x: 0.2, t: 0.5 }),
      c28: ar('s28', 1.75, 96, 262, { w: 0.42, x: -0.5, y: 0.1, t: 0.5 }), t28: ar('s28', 1.75, -98, 96, { w: 0.06, x: -0.5, y: 0.1, z: -0.4, t: 2 }),
      c29: ar('s29', 2.2, -62, 62, { w: 0.4, x: 0.5, t: 0.5 }), r29: ar('s29', 3.3, 150, 215, { w: 0.07, z: -0.8 }),
    };
    rib.l21 = kit.ribbon([[-4.4, 1.5, 1.5], [-3.0, 0.9, 1.5], [-1.9, 1.25, 1.5], [-0.9, 0.8, 1.5]], { width: 0.2, taper: 0.5, gain: 1.4 });
    rib.w24 = kit.ribbon([[-0.9, -8.2, 1.7], [0.8, -8.75, 1.7], [2.3, -8.5, 1.7], [3.6, -8.2, 1.7], [5.6, -8.9, 1.7]], { width: 0.22, taper: 0.5, gain: 1.4 });
    rib.ring = kit.ribbon(kit.arc(3.6, 0, 360, 48, { center: [6.2, -2.6, 3.6], squash: 0.42 }), { width: 0.5, gain: 1.4, taper: 1.4 }); [rib.l21, rib.w24, rib.ring].forEach((r) => group.add(r.mesh));
    // ---- the small living light that follows the words: blue first, cyan after the spin
    const flare = kit.flare({ color: '#3f8cff', size: 1.0, streak: 6, gain: 1.1 }); group.add(flare);
    const flareCy = kit.flare({ color: '#37e6ff', size: 0.5, streak: 4.0, gain: 0.95 }); group.add(flareCy);
    const FL = [[367, P.s20, [1.4, 0.5, 0.5]], [384, P.s21, [-2.9, -1.2, 0.2]], [398, P.s22, [-2.0, 0.1, -0.4]], [420, P.s23, [-1.9, 1.25, 0.3]], [432, P.s24, [0.3, 1.5, 0.2]], [446, P.s25, [0.0, 1.45, 0.2]], [460, P.s26, [-2.0, 0.1, 0.3]], [480, P.s28, [2.3, 0.4, 0.4]], [497, P.s29, [-2.3, 0.95, 0.4]], [525, P.s29, [-2.2, 0.9, 0.4]]].map(([f, c, o]) => [f, [c[0] + o[0], c[1] + o[1], c[2] + o[2]], 'io3']);

    const at = (k, d, ox = 0, oy = 0) => ({ p: [P[k][0] + ox, P[k][1] + oy, P[k][2] + d], t: [P[k][0] + ox, P[k][1] + oy, P[k][2]] });
    const K = (rf, pose, roll, e) => ({ rf, ...pose, roll, e });
    const cam = [
      K(367, at('s20', d20 * 0.5, 0, -0.2), 9), K(371.6, at('s20', d20, 0, -0.33), 0, 'out4'), K(374.5, at('s20', d20 * 1.04, 0, -0.4), -0.5, 'lin'),
      K(378.5, at('s21', d21 * 1.25, 0, 1.3), -1, 'io2'), K(384, at('s21', d21, 0, 0.75), 0, 'out3'), K(389, at('s21', d21 * 0.97, 0.1, 0), -1, 'io2'), K(392, at('s21', d21 * 0.95, 0.15, -0.1), -3, 'lin'),
      K(398.5, at('s22', d22 * 1.12, 0.45, 0.3), 2, 'io3'), K(409, at('s22', d22 * 0.96, 0.2, 0.05), -1, 'lin'), K(413, at('s22', d22 * 0.9, 0.1, 0), -5, 'in2'),
      K(416, { p: [P.s22[0] + 4.2, P.s22[1] - 0.6, P.s22[2] + 1.0], t: P.s22 }, 34, 'lin'),
      K(419.6, at('s23', d23 * 1.15, -0.4, 0.2), -8, 'out3'), K(423, at('s23', d23, -0.2, 0.05), 0, 'out2'), K(426, at('s23', d23 * 0.97, -0.1, 0), 0.5, 'lin'),
      K(430.5, at('s24', d24 * 1.15, 0, 0.6), 2, 'io2'), K(434, at('s24', d24, 0, 0.05), 0, 'out3'), K(440, at('s24', d24 * 1.03, 0, 0.5), -1, 'lin'),
      K(447, at('s25', d25, 0.3, -0.3), 1, 'io3'), K(455, at('s25', d25 * 0.96, 0.25, -0.2), -2, 'lin'),
      K(459.5, at('s26', d26, 0.1, -0.15), 1, 'io3'), K(468, at('s26', d26 * 0.95, 0.15, 0), -1, 'lin'), K(472, at('s26', d26 * 0.92, 0.2, 0), -3, 'in2'),
      K(479, at('s28', d28 * 1.1, -0.15, 0), 6, 'whip'), K(485, at('s28', d28, -0.1, 0), 1, 'out2'), K(489.5, at('s28', d28 * 0.85, 0, 0), -2, 'in2'),
      K(493.6, at('s29', d29 * 2.0, 0, 0.2), 8, 'in3'), K(498.5, at('s29', d29 * 1.15, -0.3, 0.05), 0, 'out4'), K(517, at('s29', d29, -0.3, 0), -1.2, 'lin'), K(525, at('s29', d29 * 0.95, -0.25, 0), -2, 'lin'),
    ];
    const hide = (w) => w.opacity(0);
    const tilt = (w, x, y, z) => w.group.rotation.set(x, y, z);

    return { group, update(rf) {
      const T = rf - 367;
      tiles.forEach((q) => { const u = q.userData; q.rotation.set(u.r[0] + T * u.sp, u.r[1] + T * u.sp * 1.3, u.r[2] + Math.sin(rf * 0.03 + u.ph) * 0.15); });
      dust.drift(T, [0.003, 0.007, 0.004], 0.08);
      bubbles.forEach((q) => { const u = q.userData; q.position.set(u.b.x + Math.sin(rf * 0.04 * u.k + u.ph) * 0.06, u.b.y + T * 0.003 * u.k, u.b.z); q.quaternion.copy(ctx.camera.quaternion); });
      // s20: slams in huge, then falls out of focus as the camera drops
      W.s20.reset(1); W.s20.intro(rf, { start: 369.2, stagger: 0.5, dur: 4, type: 'slam', amp: 0.25 }); tilt(W.s20, -0.2, -0.2, 0.02); W.s20.gain(lerp(1.0, 0.55, prog(rf, 376, 382)) + 0.3 * pulse(rf, 370, 5)); if (rf < 369.2 || rf > 381) hide(W.s20); else if (rf > 376.5) W.s20.opacity(1 - prog(rf, 376.5, 381));
      // s21: letters pop in one after another; it tilts and rises as the next word arrives
      W.s21.reset(1); W.s21.intro(rf, { start: 379, stagger: 0.9, dur: 4.5, type: 'pop' }); tilt(W.s21, -0.22, 0.26, lerp(-0.05, -0.15, prog(rf, 386, 394, 'io2'))); W.s21.group.position.set(P.s21[0] + lerp(0, 0.9, prog(rf, 392, 400, 'io2')), P.s21[1] + lerp(0, 0.5, prog(rf, 390, 400, 'io2')), P.s21[2]);
      W.s21.gain(lerp(1.0, 0.5, prog(rf, 395, 401)) + 0.3 * pulse(rf, 382.4, 5)); W.s21.sweep(prog(rf, 386, 393), 0.28); if (rf < 379 || rf > 402) hide(W.s21); else if (rf > 395) W.s21.opacity(1 - prog(rf, 395, 402));
      // s22: first letters giant from the bottom-left
      W.s22.reset(1); W.s22.intro(rf, { start: 394.8, stagger: 1.5, dur: 5, type: 'rise', amp: 1.3 }); tilt(W.s22, -0.22, -0.26 + 0.6 * prog(rf, 410, 414, 'in2'), 0.04 - 0.1 * prog(rf, 410, 414)); W.s22.gain(1.0 + 0.3 * pulse(rf, 398.2, 5) + 0.6 * pulse(rf, 413.4, 4)); W.s22.sweep(prog(rf, 403, 410), 0.28); if (rf < 394.8 || rf > 419) hide(W.s22);
      // s23: rotates in from a steep side view, then tips backward
      W.s23.reset(1); W.s23.intro(rf, { start: 418.2, stagger: 0.6, dur: 5, type: 'spin' }); tilt(W.s23, -0.2 - 0.6 * prog(rf, 425, 432, 'io2'), -0.3, 0.15); W.s23.gain(lerp(1.0, 0.45, prog(rf, 427, 433)) + 0.3 * pulse(rf, 421.5, 5)); if (rf < 418.2 || rf > 437) hide(W.s23); else if (rf > 430) W.s23.opacity(1 - prog(rf, 430, 437));
      // s24: rises from below, holds, sinks out of focus
      W.s24.reset(1); W.s24.intro(rf, { start: 426, stagger: 0.8, dur: 5, type: 'rise', amp: 1.0 }); tilt(W.s24, -0.22 - 0.5 * prog(rf, 441, 448, 'io2'), -0.24, -0.05); W.s24.group.position.y = P.s24[1] - 0.5 * prog(rf, 440, 448, 'in2'); W.s24.gain(lerp(1.0, 0.45, prog(rf, 440, 446)) + 0.3 * pulse(rf, 429.8, 5)); W.s24.sweep(prog(rf, 433, 440), 0.28); if (rf < 426 || rf > 453) hide(W.s24); else if (rf > 446) W.s24.opacity(1 - prog(rf, 446, 453));
      // s25: letters drop from the top, later tips down and back
      W.s25.reset(1); W.s25.intro(rf, { start: 440, stagger: 1.7, dur: 5, type: 'drop', amp: 0.9 }); tilt(W.s25, -0.22 - 0.5 * prog(rf, 455, 462, 'io2'), -0.26, -0.1); W.s25.gain(lerp(1.0, 0.45, prog(rf, 456, 462)) + 0.3 * pulse(rf, 445.6, 5)); if (rf < 440 || rf > 458) hide(W.s25); else if (rf > 452.5) W.s25.opacity(1 - prog(rf, 452.5, 458));
      // s26 arrives from the top and EXTENDS into s27
      if (rf < 462) { W.s26.reset(1); W.s26.intro(rf, { start: 453, stagger: 1, dur: 4.5, type: 'drop', amp: 0.9 }); hide(W.s27); if (rf < 453) hide(W.s26); }
      else { hide(W.s26); W.s27.reset(1); W.s27.intro(rf, { start: 462, stagger: 0.9, dur: 4, type: 'drop', amp: 0.7, from: Math.min(n26, W.s27.n - 1) }); if (rf > 480) hide(W.s27); }
      const tip26 = prog(rf, 469, 473, 'in2'); tilt(W.s26, -0.22, -0.26, -0.09); tilt(W.s27, -0.22 - 0.6 * tip26, -0.26, -0.09); W.s27.gain(1.0 + 0.3 * pulse(rf, 463, 5)); W.s26.gain(1.0 + 0.3 * pulse(rf, 456, 5));
      // s28: huge, tips back and fades
      W.s28.reset(1); W.s28.intro(rf, { start: 477.2, stagger: 0.75, dur: 3.2, type: 'slam', amp: 0.22 }); tilt(W.s28, -0.2 - 0.6 * prog(rf, 486, 491, 'in2'), -0.3, 0.12); W.s28.gain(lerp(1.0, 0.3, prog(rf, 486, 490)) + 0.35 * pulse(rf, 479.5, 5)); W.s28.sweep(prog(rf, 481, 486), 0.28); if (rf < 477.2 || rf > 493) hide(W.s28); else if (rf > 487) W.s28.opacity(1 - prog(rf, 487, 493));
      // s29: the title word — the preset's "grow" entrance, then the hold
      W.s29.reset(1); W.s29.intro(rf, { start: 495.2, stagger: 1.9, dur: 4.2, type: 'grow' }); tilt(W.s29, -0.2, -0.24 + (rf - 500) * 0.004, -0.03); W.s29.gain(1.02 + 0.4 * pulse(rf, 503.5, 6) + 0.25 * pulse(rf, 508.7, 6)); W.s29.sweep(prog(rf, 505, 515), 0.7); if (rf < 495.2) hide(W.s29);
      // ---- strokes
      rib.l21.swoosh(rf, 390, 393.5, 394.5, 398); rib.a22.swoosh(rf, 400, 404.5, 406.5, 411.5); rib.b22.swoosh(rf, 401.5, 406, 408, 412.5); rib.a23.swoosh(rf, 419.5, 424, 425.5, 430.5); rib.w24.swoosh(rf, 432.5, 436.5, 438, 442);
      rib.c26.swoosh(rf, 460, 464, 468.5, 472.5); rib.c26.mesh.rotation.z = 0.9 * prog(rf, 468.5, 472.5, 'in2'); rib.ring.swoosh(rf, 472.5, 476, 476.5, 480);
      rib.c28.swoosh(rf, 478, 481.5, 486.5, 490); rib.t28.swoosh(rf, 479, 483.5, 486.5, 490); rib.c29.swoosh(rf, 497, 500.5, 502.5, 506); rib.r29.swoosh(rf, 503, 508, 511, 517);
      // ---- the light
      const fp = track(FL, rf); const cy = prog(rf, 414, 420); flare.position.set(fp[0], fp[1], fp[2]); flareCy.position.copy(flare.position); const fk = 0.75 + 0.25 * Math.sin(rf * 0.5) + 0.5 * pulse(rf, 493, 5); flare.setIntensity((1 - cy) * fk * prog(rf, 384, 388)); flareCy.setIntensity(cy * fk);
      strings3.setOpacity(rf > 484 ? 1 : 0.3);

      const c = kit.cam(cam, rf); c.pos.add(kit.shake(rf, 0.025, 0.4, 31)); c.aperture = 0.1; c.focus = c.pos.distanceTo(c.tgt);
      const f = Math.floor(rf + 1e-4); const cyan = f === 495 ? 0.85 : (f === 494 || f === 496) ? 0.5 : 0; const teal = 0.5 * pulse(rf, 471.6, 3.2, 1.6); const whip = pulse(rf, 475, 3.5, 3); const spin = pulse(rf, 414.5, 3.5, 2.5); const fly = pulse(rf, 491.5, 4, 3);
      const beat = (l = 5) => pulse(rf, 382.4, l) + pulse(rf, 398.2, l) + pulse(rf, 429.8, l) + pulse(rf, 445.6, l) + pulse(rf, 461.4, l) + pulse(rf, 477.2, l) + pulse(rf, 508.7, l);
      const pop = prog(rf, 515.6, 516.4); const white = 0.75 * pulse(rf, 413, 2.5, 1.2) + 0.4 * pulse(rf, 431.6, 2.5, 1.5);
      return { cam: c, clear: 0x020405, post: {
        saturation: 0.55, tint: [0.95, 1.0, 1.05], contrast: 1.14 + 0.4 * pop, exposure: (1 + 0.12 * beat(4) + 0.3 * spin + 0.25 * whip + 0.35 * fly) * lerp(1, 0.9, pop),
        bloom: 0.5 + 0.22 * beat(5) + 0.4 * spin + 0.3 * fly, bloomThreshold: 0.84, vignette: 0.85, chroma: 0.0013 + 0.005 * (spin + whip), sharpen: 0.45, dust: 0.4,
        zoomBlur: Math.max(0.8 * (1 - prog(rf, 367, 370.5, 'out2')), 0.55 * spin, 0.6 * whip, 0.8 * prog(rf, 490, 493.6, 'in2') * (rf < 494 ? 1 : 0)), zoom: 1 + 0.03 * beat(5), lens: 0.06 * beat(6) + 0.12 * spin,
        flash: Math.max(cyan, teal, white), flashColor: cyan ? (f === 495 ? [0.2, 0.9, 1.0] : [0.75, 0.94, 1.0]) : teal > white ? [0.05, 0.72, 0.78] : [1, 1, 1],
        leak: 0.22 + 0.5 * pulse(rf, 413, 5), leakColor: [0.3, 0.75, 1.0], leakPos: [0.98, 0.98], leakSize: 0.9, rays: 0.3 * pulse(rf, 503.5, 10), raysCenter: [0.5, 0.5],
        bars: track([[367, 0.075], [379, 0.075], [388, 0.03, 'io2'], [404, 0.0], [419, 0.0], [424, 0.05, 'out2'], [452, 0.05], [462, 0.088, 'out2'], [472, 0.088], [480, 0.02], [497, 0.0], [504, 0.06, 'out2'], [516, 0.06], [520, 0]], rf), barsAlpha: 0.9,
        smoke: prog(rf, 517.6, 524.4, 'io2'), smokeColor: [0.18, 0.55, 1.0],
        ovlA: rf >= 492.5 && rf < 499 ? { clip: 'slash_blue', t: (rf - 492.5) / 30, amt: 0.9 } : rf >= 517 ? { clip: 'smoke_puff', t: (rf - 517) / 30 * 1.6, amt: 1.0, scale: 1.5, oy: 0.1 } : null,
      } };
    } };
  },
};
