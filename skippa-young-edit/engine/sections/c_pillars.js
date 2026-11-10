// SECTION C — "pillars, panels, white iris"  (reference frames 48–78)
//   rf 48–53  the camera roll from section B continues through a close-up of red/white blocks
//   rf 54–66  word s05 split in two halves around a giant white pillar; two more pillars form a tent;
//             red facets below; steady push-in from small (cap 12 %) to frame-filling
//   rf 64–68  punch zoom, word swaps
//   rf 69–73  word s06 centred on a fan of red polygon panels
//   rf 71–77  a white disc grows from the centre of the word to full white (hand-off)
import { ease, prog, sat, lerp, track, pulse, rng } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group();
    const A = new THREE.Group(), B = new THREE.Group(); group.add(A, B);

    // ---------- set A: pillars
    const bgA = kit.bg('grad', { a: '#5a070a', b: '#070001', vig: 0.95, scale: 1.15, w: 120, h: 70 }); bgA.position.z = -18; A.add(bgA);
    const facets = [
      { pts: [[-6.5, -7], [0.2, -0.95], [6.8, -7]], c: '#e2362c', z: -1.6 },
      { pts: [[-9, -7], [-3.2, 0.6], [-1.2, -7]], c: '#b01a16', z: -2.6 },
      { pts: [[1.4, -7], [3.6, 1.1], [10, -7]], c: '#c8221c', z: -2.3 },
      { pts: [[-2.2, 7], [0.5, 1.4], [3.4, 7]], c: '#7a0e0c', z: -3.4 },
    ].map((f) => { const m = kit.poly(f.pts, { color: f.c }); m.position.z = f.z; A.add(m); return m; });
    const sheen = kit.plate(tex.glow, 16, 9, { color: '#ff2a14', additive: true, opacity: 0.28 }); sheen.position.set(0, -1.5, -1.2); A.add(sheen);
    const w5 = kit.word(words.s05 || 'FEEL', { size: 1, depth: 0.6, style: 'redSolid', seed: 5 }); A.add(w5.group);
    const half = Math.ceil(w5.n / 2); const gap = 0.42;
    const pillarL = kit.ribbon([[-6.6, -7.5, 0.9], [-3.1, -0.8, 0.9], [0.5, 8.5, 0.9]], { width: 0.8, taper: 0.22, shade: 0.4, gain: 0.94 });
    const pillarR = kit.ribbon([[6.2, -7.5, 0.55], [3.2, -0.6, 0.55], [1.2, 8.5, 0.55]], { width: 0.72, taper: 0.22, shade: 0.4, gain: 0.94 });
    const pillarC = kit.ribbon([[0.5, -7.5, -0.45], [0.06, -0.3, -0.45], [-0.5, 7.5, -0.45]], { width: 0.36, taper: 0.2, shade: 0.36, gain: 0.96 });
    const sweepA = kit.ribbon(kit.arc(4.2, 195, 345, 26, { center: [0.2, 1.6, 0.3], squash: 0.42 }), { width: 0.2, gain: 1.3 });
    const sweepB = kit.ribbon(kit.arc(5.6, 20, 120, 22, { center: [-0.6, -1.2, -0.9], squash: 0.5 }), { width: 0.1, gain: 1.3 });
    [pillarL, pillarR, pillarC, sweepA, sweepB].forEach((r) => A.add(r.mesh));
    const ringsA = kit.bubbles({ count: 14, box: [13, 7, 5], center: [0, 0.4, -1], size: [0.08, 0.4], seed: 51, kinds: ['ringThin', 'ring', 'ringOpen'], opacity: 0.8, avoid: 1.4 }); A.add(ringsA);
    const dustA = kit.dust({ count: 200, box: [16, 10, 9], center: [0, 0, 0], size: 0.04, seed: 52, color: '#ffd9c8', opacity: 0.8 }); A.add(dustA);

    // ---------- set B: panel fan
    const fan = kit.panelFan({ count: 8, r0: 0.25, r1: 34, gap: 0.045, colors: ['#d81c24', '#a81018', '#e43036', '#8c0c12'], seed: 6, rotate: 0.35, edgeDark: 0.32 }); fan.position.set(0.1, -0.1, -2.4); B.add(fan);
    const fanGlow = kit.plate(tex.glow, 14, 8, { color: '#ff5a48', additive: true, opacity: 0.35 }); fanGlow.position.set(0, 0, -1.6); B.add(fanGlow);
    const w6 = kit.word(words.s06 || 'OLD', { size: 1, depth: 0.5, style: 'redGlow', seed: 6 }); B.add(w6.group);
    const edge = kit.ribbon([[7.5, 2.4, 0.5], [5.2, 0.8, 0.5], [4.6, -1.2, 0.5], [6.2, -4.2, 0.5]], { width: 0.4, taper: 0.5, gain: 1.25 }); B.add(edge.mesh);
    const edge2 = kit.ribbon([[-7.5, -2.0, 0.2], [-5.0, -1.1, 0.2], [-3.9, 0.9, 0.2], [-5.6, 3.9, 0.2]], { width: 0.16, taper: 0.6, gain: 1.25 }); B.add(edge2.mesh);
    const ringsB = kit.bubbles({ count: 12, box: [12, 6.5, 3], center: [0, 0, 0.6], size: [0.08, 0.36], seed: 61, opacity: 0.85, avoid: 1.5 }); B.add(ringsB);
    const dustB = kit.dust({ count: 140, box: [14, 8, 6], center: [0, 0, 0.5], size: 0.04, seed: 62, color: '#ffe2d8', opacity: 0.8 }); B.add(dustB);
    const dot = kit.plate(tex.core, 1, 1, { additive: true, billboard: true, opacity: 0, depthTest: false }); dot.position.set(0, 0, 0.4); B.add(dot);

    const camA = [
      { rf: 47.5, p: [0.6, -0.4, 1.0], t: [0.2, -0.2, 0], roll: -84 },
      { rf: 54, p: [0.1, 0.25, 8.2], t: [0.1, 0.25, 0], roll: -3, e: 'out4' },
      { rf: 62, p: [0.0, 0.1, 4.4], t: [0.0, 0.1, 0], roll: 2, e: 'out2' },
      { rf: 64.4, p: [0.0, 0.05, 3.6], t: [0.0, 0.05, 0], roll: 3.5, e: 'lin' },
      { rf: 67, p: [0.0, 0.0, 0.9], t: [0.0, 0.0, 0], roll: 9, e: 'in3' },
    ];
    const camB = [
      { rf: 67, p: [0.0, 0.0, 2.6], t: [0, 0, 0], roll: -7 },
      { rf: 69.5, p: [0.05, 0.0, 4.3], t: [0.05, 0, 0], roll: -1.5, e: 'out4' },
      { rf: 78, p: [0.1, 0.0, 3.8], t: [0.1, 0, 0], roll: 2.5, e: 'lin' },
    ];
    const IRIS = [[70.4, 0], [71, 0.03], [72, 0.08], [73, 0.17], [74, 0.3], [75, 0.55], [76, 0.9], [77, 1.3], [78, 1.4]];

    return { group, update(rf) {
      const first = rf < 67; A.visible = first; B.visible = !first;
      if (first) {
        // letters stand apart: two halves around the centre pillar, popping in on the way
        for (let i = 0; i < w5.n; i++) { const side = i < half ? -1 : 1; const t = prog(rf, 52.5 + i * 0.7, 57 + i * 0.7, 'outBackSoft'); w5.pose(i, { x: side * gap, y: (1 - t) * -0.8, rz: (1 - t) * side * 0.4, s: lerp(0.4, 1, t), o: sat((rf - (52.2 + i * 0.7)) * 0.8) }); }
        w5.group.rotation.set(-0.26, 0.3 - (rf - 54) * 0.012, -0.03 + (rf - 54) * 0.004); w5.gain(0.95 + 0.2 * pulse(rf, 58.8, 5) + 0.5 * prog(rf, 63.5, 66.8, 'in2')); w5.sweep(prog(rf, 56, 63), 0.7);
        pillarL.swoosh(rf, 45, 51, 90, 99); pillarR.swoosh(rf, 45.5, 52, 90, 99); pillarC.swoosh(rf, 46, 53, 90, 99);
        sweepA.swoosh(rf, 55, 59.5, 60.5, 65); sweepB.swoosh(rf, 57, 61, 62, 66);
        facets.forEach((f, i) => { f.rotation.z = Math.sin(rf * 0.05 + i) * 0.01; });
        ringsA.drift(rf - 48, 0.01, 0.05); dustA.drift(rf - 48, [0.004, 0.012, 0.02], 0.06);
      } else {
        w6.intro(rf, { start: 66.4, stagger: 0.6, dur: 4.5, type: 'slam', amp: 0.5 });
        w6.group.rotation.set(-0.24, 0.3 - (rf - 67) * 0.01, -0.02); w6.gain(1 + 0.45 * pulse(rf, 69, 5) + 0.9 * prog(rf, 71, 76, 'in2')); w6.sweep(prog(rf, 68.5, 74), 0.8);
        fan.rotation.z = (rf - 67) * 0.006; fan.scale.setScalar(lerp(1.25, 1, prog(rf, 67, 71, 'out3')));
        edge.swoosh(rf, 68, 71.5, 73, 77); edge2.swoosh(rf, 68.6, 72, 73.5, 77);
        ringsB.drift(rf - 67, 0.012, 0.05); dustB.drift(rf - 67, [0.0, 0.014, 0.02], 0.06);
        const d = prog(rf, 69.6, 72, 'out2'); dot.material.opacity = d; const ds = 0.25 + 1.6 * prog(rf, 69.6, 73, 'in2'); dot.scale.set(ds, ds, 1);
      }
      const cam = kit.cam(first ? camA : camB, rf); cam.pos.add(kit.shake(rf, 0.03, 0.5, 9));
      const punch = pulse(rf, 66.6, 3.2, 2.6);
      return { cam, clear: first ? 0x060001 : 0x120103, post: {
        bloom: 0.55 + 0.5 * punch + 0.2 * pulse(rf, 50.9, 5), bloomThreshold: 0.86, vignette: first ? 0.85 : 0.6,
        zoomBlur: Math.max(0.6 * (1 - prog(rf, 47.5, 53.5, 'out2')), 0.75 * punch),
        exposure: 1 + 0.35 * punch + 0.18 * pulse(rf, 50.9, 4) + 0.12 * pulse(rf, 58.8, 4), chroma: 0.0014 + 0.006 * punch + 0.003 * pulse(rf, 50.9, 4),
        zoom: 1 + 0.035 * pulse(rf, 50.9, 5) + 0.03 * pulse(rf, 58.8, 5), lens: 0.12 * punch + 0.06 * pulse(rf, 50.9, 5),
        rays: 0.35 * prog(rf, 70, 75), raysCenter: [0.5, 0.5],
        bars: track([[48, 0.05], [54, 0.074, 'out3'], [64, 0.074], [67, 0.02, 'in2'], [70, 0.035], [76, 0]], rf), barsAlpha: 0.93,
        irisDisc: rf >= 70.4 ? track(IRIS, rf) : 0, irisRim: [1, 0.05, 0.08], irisBg: [1, 1, 1], flash: prog(rf, 76.6, 77, 'lin'),
        saturation: 1.14, leak: first ? 0.22 : 0.3, leakColor: [1, 0.3, 0.16], leakPos: [0.05, 0.95], leakSize: 0.85, mark: 0.38 * (1 - prog(rf, 75, 77)),
      } };
    } };
  },
};
