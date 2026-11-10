// SECTION H — "shutter interlude / the fall"  (reference frames 267–316). Greyscale, no words.
//   rf 267–277  near-white, then the frame steps darker each frame while a white band grows from the middle
//   rf 278–287  the band becomes a window between very thick bars; blurry light scene; white flash at 285
//   rf 288–302  bars ease open; dark field; the white glowing falling figure tumbles; outline stars drop in
//   rf 303      one flat grey frame (beat)
//   rf 304–315  negative strobe on white: curl · blank · figure + corner chevrons · full scene · blank + figure
import { ease, prog, sat, lerp, track, pulse, rng } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(267);
    const bgLight = kit.bg('grad', { a: '#e4e7ea', b: '#868b90', vig: 0.4, scale: 1.0, w: 120, h: 70 }); bgLight.position.z = -14; group.add(bgLight);
    const bgDark = kit.bg('grad', { a: '#34474a', b: '#070b0c', vig: 0.85, scale: 1.1, w: 120, h: 70 }); bgDark.position.z = -14; group.add(bgDark);
    const haze = []; for (let i = 0; i < 7; i++) { const s = R.range(6, 12); const m = kit.plate(tex.smoke, s, s, { color: '#9fb0b4', additive: true, opacity: R.range(0.06, 0.13) }); m.position.set(R.range(-9, 9), R.range(-4, 4), R.range(-9, -4)); m.userData = { sp: R.range(-0.004, 0.004) }; group.add(m); haze.push(m); }

    // the falling figure (original silhouette) with a soft glow and a fall trail
    const fig = new THREE.Group(); group.add(fig);
    const trail = kit.plate(tex.streak, 5.5, 0.9, { additive: true, opacity: 0.22 }); trail.rotation.z = Math.PI / 2 + 0.25; trail.position.set(0.5, 2.4, -0.2); fig.add(trail);
    const glow = kit.plate(tex.glow, 4.2, 4.2, { additive: true, opacity: 0.26 }); glow.position.z = -0.1; fig.add(glow);
    const body = kit.plate(tex.figFall, 2.2, 2.2, { additive: true, gain: 1.3 }); fig.add(body);

    const stars = [[-2.5, 0.95, 0.2, 1.2], [2.6, 0.9, -0.3, 1.1], [-4.4, -1.3, -2.5, 0.6], [4.6, -1.1, -2.2, 0.55]].map((p, i) => { const m = kit.plate(tex.star, p[3], p[3], { additive: true }); m.userData = { p, ph: R() * 6, i }; group.add(m); return m; });
    const oval = kit.ribbon(kit.arc(0.95, 0, 360, 48, { center: [-4.1, 0.1, 0.1], squash: 1.6 }), { width: 0.035, gain: 1.2, taper: 3 }); group.add(oval.mesh);
    const oval2 = kit.ribbon(kit.arc(0.8, 0, 360, 40, { center: [6.5, 1.7, -1.2], squash: 1.3 }), { width: 0.025, gain: 0.9, taper: 3 }); group.add(oval2.mesh);
    const chev = [[-3.25, 1.5, 1], [3.25, 1.5, -1]].map(([x, y, sx]) => { const m = kit.plate(tex.chevron, 1.6 * sx, 1.6, { additive: true }); m.position.set(x, y, 0.3); m.rotation.z = sx > 0 ? -0.45 : 0.45; group.add(m); return m; });
    const rings = kit.bubbles({ count: 20, box: [13, 6, 4], center: [0, 0, -0.3], size: [0.1, 0.45], seed: 268, kinds: ['ringThin', 'ringOpen', 'ring'], avoid: 1.6 }); group.add(rings);
    const dust = kit.dust({ count: 240, box: [15, 8, 8], size: 0.035, seed: 269, opacity: 0.8 }); group.add(dust);
    // pack sprites (hidden automatically if the local pack is absent)
    const bub = kit.sprite('bubbles', 2.4, { opacity: 0.55 }); bub.position.set(4.6, -1.5, -0.8); group.add(bub);
    const plus = kit.sprite('plus2', 1.9, { opacity: 0.5 }); plus.position.set(-4.9, -1.7, -1.0); group.add(plus);
    const half = kit.sprite('halftone2', 3.4, { opacity: 0.22 }); half.position.set(5.2, -2.6, -2.0); group.add(half);
    const all = [...stars, ...chev, rings, dust, bub, plus, half, oval.mesh, oval2.mesh, ...haze];

    return { group, update(rf) {
      const T = rf - 267; const f = Math.floor(rf + 1e-4);
      const shutter = rf < 278, win = rf >= 278 && rf < 288, main = rf >= 288 && rf < 303, flat303 = f === 303, strobe = rf >= 304;
      bgLight.visible = false; bgDark.visible = main || win; haze.forEach((m) => { m.rotation.z = T * m.userData.sp; });
      // figure: tumbling and sinking
      fig.rotation.z = -0.35 + T * 0.03; fig.position.set(0.15 * Math.sin(T * 0.08), lerp(1.3, -0.35, prog(rf, 274, 302, 'io2')), 0); body.rotation.z = 0;
      stars.forEach((m) => { const u = m.userData; const k = prog(rf, 293.6 + u.i * 0.7, 298 + u.i * 0.7, 'outBackSoft'); m.position.set(u.p[0], u.p[1] + (1 - k) * 4.5, u.p[2]); m.rotation.z = (1 - k) * 2.2 + T * 0.012 * (u.i % 2 ? -1 : 1); m.visible = rf > 293.6 + u.i * 0.7; });
      oval.set(0, prog(rf, 288, 296, 'out3')); oval2.set(0, prog(rf, 290, 298, 'out3'));
      rings.drift(T, 0.008, 0.06); dust.drift(T, [0.0, 0.014, 0.0], 0.07);
      chev.forEach((m) => { m.visible = false; });
      let figS = 1, others = main || win, post = {};
      if (strobe) { // negative strobe: black scene -> inverted white
        others = f >= 308 && f <= 310;
        if (f === 304) figS = 0.14; else if (f === 305) figS = 0; else if (f <= 307) figS = 0.4; else if (f <= 310) figS = 1; else figS = lerp(0.16, 0.5, prog(rf, 311, 316));
        chev.forEach((m) => { m.visible = (f >= 306 && f <= 310); });
        glow.material.opacity = 0.0; trail.material.opacity = 0.0;
      } else { glow.material.opacity = win ? 0.0 : 0.26 + 0.16 * pulse(rf, 287.7, 6); trail.material.opacity = win ? 0 : 0.2; }
      fig.scale.setScalar(Math.max(0.0001, figS)); fig.visible = figS > 0 && !shutter && !flat303;
      all.forEach((o) => { if (o !== chev[0] && o !== chev[1]) o.visible = others && (o.missing ? false : true); });
      if (others) stars.forEach((m) => { m.visible = rf > 293.6 + m.userData.i * 0.7 || strobe; });

      const cam = { pos: new THREE.Vector3(0, 0, lerp(7.4, 6.2, prog(rf, 278, 316))).add(kit.shake(rf, 0.02, 0.3, 21)), tgt: new THREE.Vector3(0, 0, 0), roll: lerp(-1.5, 1.5, prog(rf, 278, 316)), fov: 40, aperture: win ? 0.3 : 0.05 };
      cam.focus = cam.pos.z;
      const g = track([[267, 0.96], [268, 0.88], [272, 0.52, 'lin'], [277, 0.15, 'lin']], rf);
      post = { desat: 1, saturation: 0, bloom: 0.8, bloomThreshold: 0.72, vignette: main ? 0.7 : 0.2, grain: 0.06, scratches: 0.7, dust: 0.55, sharpen: 0.4, contrast: 1.1,
        flat: shutter ? 1 : flat303 ? 1 : 0, flatColor: flat303 ? [0.62, 0.63, 0.64] : [g, g, g],
        band: shutter ? track([[267, 0.0015], [268, 0.004], [277, 0.07, 'in2'], [278, 0.11]], rf) : 0, bandColor: [1, 1, 1],
        bars: shutter ? 0 : win ? track([[278, 0.39], [284, 0.35, 'out2'], [288, 0.3]], rf) : main ? track([[288, 0.275], [302, 0.19, 'out2']], rf) : 0.085, barsAlpha: strobe ? 0.82 : 0.97,
        flash: f === 285 ? 0.9 : 0.6 * prog(rf, 301.4, 303, 'in2') * (main ? 1 : 0), invert: strobe || win ? 1 : 0,
        exposure: (win ? 0.7 : 1) + 0.2 * pulse(rf, 287.7, 5) + 0.15 * pulse(rf, 295.6, 5), zoom: 1 + 0.03 * pulse(rf, 287.7, 5) + 0.03 * pulse(rf, 303.5, 4),
        zoomBlur: 0.5 * prog(rf, 300.5, 303, 'in2') * (main ? 1 : 0), chroma: 0.001, mark: shutter ? 0 : 0.38,
        ovlA: main ? { clip: 'embers2', t: T / 30, loop: true, amt: 0.5 } : null,
      };
      return { cam, clear: 0x000000, post };
    } };
  },
};
