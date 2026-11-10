// SECTION I — "wide line / facing them"  (reference frames 316–367). One three-word line (s17). Greyscale.
//   rf 316–320  still negative: chevrons re-enter; word 1 appears small top-centre (317), word 2 (320)
//   rf 321–328  dark; word 3's letters swing in one at a time; the falling figure drifts out at the bottom
//   rf 329–336  blur, then a white negative flash with displaced ink
//   rf 337–343  the line snaps to FULL FRAME WIDTH, embossed, edges mirrored
//   rf 344–365  chrome hold: bracket lines close into an X, cracked moon, a darker echo of the line looms behind
//   rf 365–367  radial zoom blur (hand-off)
import { ease, prog, sat, lerp, track, pulse, rng } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(316);
    const text = (words.s17 || 'FACING MY DEMONS').trim(); const toks = text.split(/\s+/);
    const bg = kit.bg('grad', { a: '#c9cdd1', b: '#5c6165', vig: 0.6, scale: 1.0, w: 200, h: 110 }); bg.position.z = -22; group.add(bg);
    const foil = kit.sprite('foil', 70, { opacity: 0.1, color: '#aab4bc' }); foil.position.z = -20; group.add(foil);
    const haze = []; for (let i = 0; i < 8; i++) { const s = R.range(9, 18); const m = kit.plate(tex.smoke, s, s, { color: '#8e989d', additive: true, opacity: R.range(0.05, 0.12) }); m.position.set(R.range(-16, 16), R.range(-7, 7), R.range(-14, -6)); m.userData = { sp: R.range(-0.004, 0.004) }; group.add(m); haze.push(m); }

    const G0 = { top: '#bfc3c6', bot: '#6a6f73', side: '#2c2f33', sideDark: '#050506', rim: '#eceef0', gain: 0.95, chrome: 0.15, rimAmt: 0.7 }, S0 = { top: '#f1f3f4', bot: '#9aa0a4', side: '#3a3f44', sideDark: '#050607', rim: '#ffffff', gain: 1.0, chrome: 0.15, rimAmt: 0.85 };
    const S = 1; const line = kit.word(text, { size: S, depth: 0.5, style: S0, seed: 17 }); group.add(line.group);
    const echo = kit.word(text, { size: S, depth: 0.2, style: 'graphite', seed: 17 }); echo.group.position.set(0, 1.5, -6); echo.group.scale.setScalar(2.3); group.add(echo.group); echo.set('uGrit', 0); echo.set('uFaceAmt', 0); line.set('uFaceAmt', 0.25); line.set('uGrit', 0.04);
    // letters per word (spaces carry no mesh)
    const counts = toks.map((t) => t.replace(/\s/g, '').length); const start = counts.map((c, i) => counts.slice(0, i).reduce((a, b) => a + b, 0));
    const dWide = line.width / (1.294 * 0.97), dSmall = S / (0.095 * 0.728);

    const fig = new THREE.Group(); const fglow = kit.plate(tex.glow, 6, 6, { additive: true, opacity: 0.4 }); fglow.position.z = -0.1; fig.add(fglow); fig.add(kit.plate(tex.figFall, 3.0, 3.0, { additive: true, gain: 1.3 })); group.add(fig);
    const chev = [[-1, -1], [1, 1]].map(([side, sx]) => { const m = kit.plate(tex.chevron, 3.8 * sx, 3.8, { additive: true }); m.userData = { side }; group.add(m); return m; });
    const slashes = [kit.ribbon([[-9.5, -1.5, 0.5], [-7.4, 0.4, 0.5], [-5.6, 2.2, 0.5]], { width: 0.2, taper: 0.5, gain: 1.4 }), kit.ribbon([[9.5, -1.5, 0.5], [7.4, 0.4, 0.5], [5.6, 2.2, 0.5]], { width: 0.2, taper: 0.5, gain: 1.4 }), kit.ribbon([[-9.5, 3.4, 0.4], [-6.5, 4.4, 0.4], [-3.6, 4.0, 0.4], [-1.6, 2.9, 0.4]], { width: 0.14, taper: 0.55, gain: 1.4 })];
    slashes.forEach((r) => group.add(r.mesh));
    // bracket lines that close into an X
    const hw = line.width / 2; const br = [-1, 1].map((sd) => { const r = kit.ribbon([[sd * 2.2, 3.4, 0.7], [sd * 0.9, 1.5, 0.7], [sd * 0.35, 0, 0.7], [sd * 0.9, -1.5, 0.7], [sd * 2.2, -3.4, 0.7]], { width: 0.075, gain: 1.5, taper: 3 }); r.sd = sd; group.add(r.mesh); return r; });
    const moon = kit.planet({ radius: 1.15, map: tex.moon, light: [-0.5, 0.5, 0.7], atmo: '#cfd6dc', atmoAmt: 0.1, night: '#050607', gain: 1.0 }); moon.position.set(hw * 0.72, 2.25, -1.6); group.add(moon);
    const rings = kit.bubbles({ count: 26, box: [line.width * 1.3, 6, 4], center: [0, 0, 0.3], size: [0.1, 0.55], seed: 317, kinds: ['ringThin', 'ring', 'ringOpen'], avoid: 0 }); group.add(rings);
    const bigRings = kit.bubbles({ count: 4, box: [line.width, 4, 1], center: [0, 0.5, -1], size: [1.6, 2.6], seed: 318, kinds: ['ringOpen'], opacity: 0.5 }); group.add(bigRings);
    const dust = kit.dust({ count: 300, box: [line.width * 1.5, 8, 9], size: 0.04, seed: 319, opacity: 0.8 }); group.add(dust);
    const plus = kit.sprite('plus3', 2.2, { opacity: 0.4 }); plus.position.set(-hw * 0.8, -2.3, -0.8); group.add(plus);
    const half = kit.sprite('halftone1', 4.2, { opacity: 0.2 }); half.position.set(hw * 0.75, -2.6, -2.4); group.add(half);

    return { group, update(rf) {
      const T = rf - 316; const wide = rf >= 336.6; haze.forEach((m) => { m.rotation.z = T * m.userData.sp; });
      // --- letters
      line.reset(1); const n = line.n;
      for (let i = 0; i < n; i++) {
        const w = i < start[1] || counts.length < 2 ? 0 : (counts.length < 3 || i < start[2]) ? 1 : 2; const j = i - start[w];
        let st, type; if (w === 0) { st = 316.8 + j * 0.25; type = 'pop'; } else if (w === 1) { st = 319.6 + j * 0.3; type = 'pop'; } else { st = 321.6 + j * (6.4 / Math.max(1, counts[2] - 1)); type = 'swing'; }
        const t = (rf - st) / (type === 'swing' ? 5 : 3.2); if (t <= 0) { line.pose(i, { o: 0 }); continue; } const e = ease.outBackSoft(sat(t)), k = 1 - e;
        if (type === 'swing') line.pose(i, { x: k * S * 1.0, y: -k * S * 1.5, rz: -k * 1.1, s: 1 - k * 0.25, o: sat(t * 4) }); else line.pose(i, { s: Math.max(0.02, e), y: k * S * 0.5, o: sat(t * 4) });
      }
      line.group.rotation.set(wide ? -0.16 : -0.24, wide ? 0.0 + 0.05 * Math.sin(rf * 0.05) : 0.22, wide ? 0 : -0.02);
      line.mixStyle(G0, S0, wide ? prog(rf, 337, 344) : 0.75); line.gain(1.12 + 0.4 * pulse(rf, 335.1, 5) + 0.25 * pulse(rf, 350.8, 5)); line.sweep(prog(rf, 346, 362), 0.55);
      echo.opacity(wide ? 0.07 * prog(rf, 340, 350) : 0); echo.group.position.set(Math.sin(rf * 0.03) * 0.6, 1.5 + Math.cos(rf * 0.04) * 0.2, -6); echo.gain(0.55);
      // --- small-view dressing
      const figY = lerp(-3.0, -7.5, prog(rf, 318, 331, 'in2')); fig.position.set(0, figY, 0); fig.rotation.z = 0.5 + T * 0.03; fig.visible = !wide;
      chev.forEach((m) => { const k = prog(rf, 315.5, 319, 'out4'); m.position.set(m.userData.side * lerp(11, 5.0, k), -1.6, 0.4); m.visible = rf < 324; m.material.opacity = 1 - prog(rf, 321, 324); });
      slashes[0].swoosh(rf, 320.3, 322, 322.4, 324.2); slashes[1].swoosh(rf, 320.6, 322.3, 322.7, 324.5); slashes[2].swoosh(rf, 322.5, 325.5, 326, 328.5);
      // --- wide-view dressing
      const cl = prog(rf, 343, 361, 'io2'); br.forEach((r) => { r.mesh.position.x = r.sd * lerp(hw * 0.82, 0.12, cl); r.set(0, wide ? prog(rf, 337, 342, 'out3') : 0); });
      moon.visible = wide; moon.rotation.y = T * 0.006; bigRings.visible = wide; foil.visible = wide && !foil.missing; half.visible = wide && !half.missing; plus.visible = wide && !plus.missing;
      rings.drift(T, 0.006, 0.06); bigRings.drift(T, 0.003, 0.04); dust.drift(T, [0.004, 0.008, 0.01], 0.07);
      const dk = prog(rf, 344, 361); bg.u.uA.value.setRGB(lerp(0.78, 0.2, dk), lerp(0.8, 0.26, dk), lerp(0.82, 0.27, dk)); bg.u.uB.value.setRGB(lerp(0.36, 0.02, dk), lerp(0.38, 0.03, dk), lerp(0.4, 0.035, dk)); bg.visible = wide;

      // --- camera: far & offset while the line is small; then the line fills the frame width
      const d = wide ? lerp(dWide, dWide * 1.13, prog(rf, 337, 366)) : lerp(dSmall, dSmall * 0.93, prog(rf, 316, 336));
      const ty = wide ? 0 : -0.145 * d; const cam = { pos: new THREE.Vector3(0, ty, d).add(kit.shake(rf, 0.03, 0.4, 23)), tgt: new THREE.Vector3(0, ty, 0), roll: wide ? lerp(-1, 1, prog(rf, 337, 366)) : 0, fov: 40, aperture: wide ? 0.05 : 0.0 }; cam.focus = d;
      const fl = pulse(rf, 333.5, 3.5, 2.2);
      return { cam, clear: 0x000000, post: {
        desat: 1, saturation: 0, contrast: 1.1, bloom: 0.8 + 0.4 * fl, bloomThreshold: 0.7, vignette: wide ? 0.75 : 0.55, grain: 0.05, dust: 0.5, sharpen: 0.45,
        invert: Math.max(1 - prog(rf, 319.4, 321, 'io2'), fl > 0.25 ? 1 : 0), flat: 0.5 * prog(rf, 318, 319.6) * (1 - prog(rf, 319.6, 321.2)), flatColor: [0.6, 0.6, 0.62],
        warp: 0.07 * fl + 0.02 * (1 - prog(rf, 337, 341)) * (wide ? 1 : 0), warpScale: 3.2, exposure: 1 + 0.9 * fl + 0.6 * (1 - prog(rf, 337, 344)) * (wide ? 1 : 0) + 0.3 * prog(rf, 328.5, 332),
        zoomBlur: Math.max(0.5 * prog(rf, 328.5, 332) * (rf < 333 ? 1 : 0), 0.9 * prog(rf, 364.2, 367, 'in2')), mirror: wide ? 0.5 * (1 - prog(rf, 337, 343.5, 'out2')) : 0,
        slices: wide ? 0.5 * (pulse(rf, 344.5, 3) + pulse(rf, 350.8, 3.5) + pulse(rf, 358.5, 3)) : 0, zoom: 1 + 0.035 * pulse(rf, 335.1, 5) + 0.03 * pulse(rf, 350.8, 5), lens: 0.1 * fl + 0.06 * pulse(rf, 350.8, 6),
        bars: track([[316, 0.085], [321, 0.05, 'out2'], [336, 0.05], [338, 0.065], [366, 0.065]], rf), barsAlpha: 0.95, chroma: 0.0012 + 0.004 * fl,
        ovlA: wide ? { clip: 'smoke_swirl', t: (rf - 337) / 30, amt: 0.18, scale: 1.25 } : null,
      } };
    } };
  },
};
