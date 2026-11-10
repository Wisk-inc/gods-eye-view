// SECTION D — "orbit / alone"  (reference frames 78–118)
//   rf 78–85   an iris hole with a wide soft red rim opens from the centre onto deep space
//   rf 84–96   word s07 in gold: letters tumble in one at a time from the upper right, stack on a diagonal,
//              rotate into place
//   rf 96–108  hold right of centre, tilted, right end nearer; slow push; planet lower-left, sun top-right;
//              white strokes sweep in.  STORY: a tiny hooded figure stands alone on the planet's edge.
//   rf 107–114 a yellow rim closes in, turns orange then red as the hole shrinks      rf 115–117 white
// Composition: planet (lower-left mass) → figure on its edge → strokes lead the eye → gold word (right)
// → sun and its rays (top-right); moon, orbit lines, nebula and flare ghosts fill the remaining space.
import { ease, prog, lerp, track, pulse, rng, TAU } from '../util.js';

const c01 = (x) => Math.min(1, Math.max(0, x));

export default {
  build(ctx) {
    const { THREE, kit, tex, words } = ctx; const group = new THREE.Group(); const R = rng(71);

    // ---------- deep space: nebula shader, two star layers, twinkling glint stars
    const neb = new THREE.Mesh(new THREE.PlaneGeometry(260, 150), new THREE.ShaderMaterial({ depthWrite: false, uniforms: { tNoise: { value: tex.noise }, uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tNoise; uniform float uTime; varying vec2 vUv; float n(vec2 p){ return texture2D(tNoise, p).r; }
        void main(){ vec2 p = vUv * vec2(1.78, 1.0); vec2 q = vec2(n(p * 0.7 + uTime * 0.004), n(p * 0.7 + 4.1));
          float f = n(p * 1.3 + q * 0.9); float g = n(p * 2.9 - q * 0.6 + 1.7); float band = smoothstep(0.75, 0.0, abs(vUv.y - 0.62 + (vUv.x - 0.5) * 0.35));
          vec3 col = vec3(0.004, 0.016, 0.026); col += vec3(0.01, 0.11, 0.14) * smoothstep(0.35, 0.8, f) * (0.5 + band);
          col += vec3(0.11, 0.035, 0.16) * smoothstep(0.5, 0.92, g) * band; col += vec3(0.2, 0.11, 0.035) * smoothstep(0.55, 1.0, f * g * 2.2) * smoothstep(0.35, 1.0, vUv.x) * smoothstep(0.3, 1.0, vUv.y);
          gl_FragColor = vec4(col, 1.0); }` }));
    neb.position.set(10, 4, -90); neb.renderOrder = -20; group.add(neb);
    const stars = kit.starfield({ count: 1500, radius: 120, seed: 7, size: 0.7 }); group.add(stars);
    const starsBig = kit.starfield({ count: 130, radius: 110, seed: 8, size: 1.5, color: '#cfe6ff' }); group.add(starsBig);
    const twinkles = []; for (let i = 0; i < 16; i++) { const g = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, color: R.pick(['#ffffff', '#bfe0ff', '#ffe6b0']), opacity: 0.8 }); g.position.set(R.range(-13, 16), R.range(-5.5, 7.5), R.range(-34, -14)); g.userData = { s: R.range(0.5, 1.5), ph: R() * 9, sp: R.range(0.25, 0.6) }; group.add(g); twinkles.push(g); }

    // ---------- the planet: NASA Blue Marble photograph on a disc, relit (terminator, glowing limb, ocean glint)
    const PC = new THREE.Vector3(-7.0, -7.5, -2.2), PR = 9.9; const L = new THREE.Vector3(0.6, 0.62, 0.5).normalize();
    const earthU = { tMap: { value: tex.earth || tex.planet }, tHi: { value: tex.earthHi || tex.white }, uHasHi: { value: tex.earthHi ? 1 : 0 }, tNoise: { value: tex.noise }, uLight: { value: L }, uSpin: { value: 0 } };
    const planet = new THREE.Mesh(new THREE.CircleGeometry(PR, 180), new THREE.ShaderMaterial({ uniforms: earthU, depthWrite: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform sampler2D tMap; uniform sampler2D tHi; uniform sampler2D tNoise; uniform float uHasHi; uniform vec3 uLight; uniform float uSpin; varying vec2 vUv;
        void main(){ vec2 p = (vUv - 0.5) * 2.0; float r = length(p); if (r > 1.0) discard;
          float c = cos(uSpin), s = sin(uSpin); vec2 q = mat2(c, -s, s, c) * p; vec2 duv = q * 0.5 * 0.99 + 0.5; vec3 tex = texture2D(tMap, duv).rgb;
          vec2 cuv = (duv - vec2(0.45)) / 0.55; // the visible slice, cut from the 8000 px original at full resolution
          if (uHasHi > 0.5 && cuv.x > 0.003 && cuv.y > 0.003 && cuv.x < 0.997 && cuv.y < 0.997) tex = texture2D(tHi, cuv).rgb;
          tex *= 0.93 + 0.14 * texture2D(tNoise, duv * 46.0).r;
          vec3 n = vec3(p, sqrt(max(0.0, 1.0 - r * r))); float d = dot(n, uLight); float day = smoothstep(-0.32, 0.3, d);
          vec3 col = mix(tex * vec3(0.03, 0.06, 0.11), tex * tex * (0.42 + 0.46 * day) + tex * 0.12 * day, day);
          vec3 h = normalize(uLight + vec3(0.0, 0.0, 1.0)); col += vec3(1.0, 0.95, 0.85) * pow(max(dot(n, h), 0.0), 50.0) * 0.3 * day;
          col *= vec3(0.82, 1.05, 1.12);
          col += vec3(0.1, 0.5, 0.95) * pow(r, 16.0) * (0.1 + 0.6 * day);
          col = mix(col, vec3(0.45, 0.9, 1.0) * (0.3 + 1.1 * day), smoothstep(0.978, 1.0, r) * 0.9);
          gl_FragColor = vec4(col, 1.0); }` }));
    planet.position.copy(PC); planet.renderOrder = -5; group.add(planet);
    const atmo = kit.plate(tex.glow, PR * 2.75, PR * 2.75, { color: '#1c8cff', additive: true, opacity: 0.3 }); atmo.position.copy(PC).add(new THREE.Vector3(1.0, 1.0, -0.4)); atmo.renderOrder = -6; group.add(atmo);
    // orbit lines around the planet + a satellite light travelling along one of them
    const orbitPts = (rad, tilt, sq) => { const o = []; for (let i = 0; i <= 90; i++) { const a = (i / 90) * TAU * 0.62 + 0.2; const x = Math.cos(a) * rad, y = Math.sin(a) * rad * sq; o.push(new THREE.Vector3(PC.x + x * Math.cos(tilt) - y * Math.sin(tilt), PC.y + x * Math.sin(tilt) + y * Math.cos(tilt), PC.z + 0.3)); } return o; };
    const orbits = [kit.ribbon(orbitPts(PR * 1.48, 0.5, 0.86), { width: 0.035, gain: 1.2, segments: 90, taper: 0.9 }), kit.ribbon(orbitPts(PR * 1.62, 0.72, 0.8), { width: 0.028, gain: 0.9, segments: 90, taper: 0.9 }), kit.ribbon(orbitPts(PR * 1.8, 0.36, 0.9), { width: 0.022, gain: 0.7, segments: 90, taper: 0.9 })];
    orbits.forEach((o) => group.add(o.mesh));
    const satl = kit.plate(tex.core, 0.9, 0.9, { additive: true, billboard: true, color: '#bfe9ff' }); group.add(satl);
    const satTrail = kit.plate(tex.streak, 2.2, 0.12, { additive: true, color: '#9fdcff', opacity: 0.7 }); group.add(satTrail);

    // ---------- the lone figure standing on the planet's edge (original silhouette), rim-lit by the sun
    const ang = 57 * Math.PI / 180; const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0);
    const figH = 1.3; const figPos = PC.clone().addScaledVector(dir, PR + figH * 0.4); figPos.z = PC.z + 0.05;
    const figRim = kit.plate(tex.figStand, figH * 1.1, figH * 1.1, { color: '#d4f1ff', additive: true, opacity: 0.85 }); figRim.position.copy(figPos).add(new THREE.Vector3(0.016, 0.014, -0.01)); group.add(figRim);
    const fig = kit.plate(tex.figStand, figH, figH, { color: '#02050a', opacity: 1 }); fig.position.copy(figPos); group.add(fig);
    [fig, figRim].forEach((m) => { m.rotation.z = ang - Math.PI / 2; });
    const figGlow = kit.plate(tex.glow, 2.6, 2.6, { color: '#8fdcff', additive: true, opacity: 0.3 }); figGlow.position.copy(figPos).add(new THREE.Vector3(0, 0, -0.1)); group.add(figGlow);

    // ---------- small real moon, top-left, balancing the sun
    const moon = kit.planet({ radius: 0.62, map: tex.moon, light: [0.7, 0.45, 0.55], atmo: '#9fb4c8', atmoAmt: 0.12, night: '#020305', gain: 1.05 }); moon.position.set(-5.4, 3.7, -9); group.add(moon);

    // ---------- the sun: rayed star (generated), soft bloom, thin anamorphic streak, ghosts across the frame
    const SUN = new THREE.Vector3(12.6, 7.1, -22);
    const rc = document.createElement('canvas'); rc.width = rc.height = 1024; const g2 = rc.getContext('2d'); g2.translate(512, 512);
    for (let i = 0; i < 150; i++) { const a = R() * TAU, len = 150 + Math.pow(R(), 2.6) * 362, wd = 1.2 + R() * 5.5; const gr = g2.createLinearGradient(0, 0, len, 0); gr.addColorStop(0, 'rgba(255,255,255,' + (0.28 + R() * 0.5) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g2.save(); g2.rotate(a); g2.fillStyle = gr; g2.beginPath(); g2.moveTo(0, -wd); g2.lineTo(len, 0); g2.lineTo(0, wd); g2.closePath(); g2.fill(); g2.restore(); }
    const cgr = g2.createRadialGradient(0, 0, 0, 0, 0, 230); cgr.addColorStop(0, 'rgba(255,255,255,1)'); cgr.addColorStop(0.14, 'rgba(255,255,255,0.92)'); cgr.addColorStop(0.45, 'rgba(255,255,255,0.24)'); cgr.addColorStop(1, 'rgba(255,255,255,0)'); g2.fillStyle = cgr; g2.beginPath(); g2.arc(0, 0, 230, 0, TAU); g2.fill();
    const rayTex = tex.make.tex(rc);
    const sunRays = kit.plate(rayTex, 13, 13, { additive: true, billboard: true, color: '#ffe2ac', gain: 0.9 }); sunRays.position.copy(SUN); group.add(sunRays);
    const sunRays2 = kit.plate(rayTex, 7, 7, { additive: true, billboard: true, color: '#fff6dc', gain: 0.9 }); sunRays2.position.copy(SUN); group.add(sunRays2);
    const sunHalo = kit.plate(tex.glow, 20, 20, { additive: true, billboard: true, color: '#ff9c3c', opacity: 0.4 }); sunHalo.position.copy(SUN); group.add(sunHalo);
    const sunStreak = kit.plate(tex.streak, 26, 0.34, { additive: true, billboard: true, color: '#ffd9a0', opacity: 0.85 }); sunStreak.position.copy(SUN); group.add(sunStreak);
    const ghosts = [[0.3, 0.7, 'hex', '#ff8a5c', 0.28], [0.47, 1.25, 'ringOpen', '#7ad0ff', 0.3], [0.62, 0.5, 'hex', '#c78cff', 0.3], [0.8, 1.7, 'hex', '#5cc8ff', 0.16], [0.95, 0.85, 'glow', '#ffb060', 0.3], [1.14, 2.4, 'ringOpen', '#ff9ccf', 0.18], [1.3, 1.1, 'hex', '#8cf0ff', 0.22]]
      .map(([t, s, k, c, o]) => { const m = kit.plate(tex[k], s, s, { additive: true, billboard: true, color: c, opacity: o, depthTest: false }); m.userData = { t, o }; group.add(m); return m; });

    // ---------- the word: rich gold, bright yellow bevel outlines
    const GOLD = { top: '#ffcf52', bot: '#b9670c', side: '#8a4c08', sideDark: '#190c00', rim: '#fff46a', gain: 1.0, chrome: 0.5, rimAmt: 1.0 };
    const WP = new THREE.Vector3(2.05, -0.45, 0);
    const w = kit.word(words.s07 || 'ALONE', { size: 1.62, depth: 0.55, bevel: 0.034, style: GOLD, seed: 7 }); w.group.position.copy(WP); w.set('uGrit', 0.05); group.add(w.group);
    const wGlow = kit.plate(tex.glow, 11, 5.4, { color: '#ff9a12', additive: true, opacity: 0.26 }); wGlow.position.copy(WP).add(new THREE.Vector3(0, 0, -0.9)); group.add(wGlow);

    // ---------- strokes: lead from the planet to the word, loop around it
    const strokes = [
      kit.ribbon([[-10.5, 5.2, 1.2], [-7.4, 3.9, 1.2], [-5.2, 1.6, 1.2], [-4.6, -1.6, 1.2]], { width: 0.24, taper: 0.55, gain: 1.3 }),
      kit.ribbon([[-9.5, -1.0, 1.6], [-6.0, 0.2, 1.6], [-3.2, -0.8, 1.6], [-0.6, -3.2, 1.6]], { width: 0.2, taper: 0.6, gain: 1.3 }),
      kit.ribbon([[-8.6, 6.2, 0.8], [-6.6, 4.6, 0.8], [-6.2, 2.4, 0.8], [-7.6, 0.2, 0.8]], { width: 0.2, taper: 0.5, gain: 1.3 }),
      kit.ribbon([[-1.6, -0.5, 0.9], [0.2, -1.9, 0.9], [2.4, -2.5, 0.9], [4.4, -4.7, 0.9]], { width: 0.3, taper: 0.5, gain: 1.3 }),
      kit.ribbon(kit.arc(4.5, 30, 150, 26, { center: [WP.x, WP.y - 0.2, -0.5], squash: 0.52 }), { width: 0.07, gain: 1.3 }),
      kit.ribbon(kit.arc(5.2, 205, 325, 26, { center: [WP.x + 0.2, WP.y + 0.3, 0.5], squash: 0.46 }), { width: 0.09, gain: 1.3 }),
      kit.ribbon([[6.6, 3.2, -0.6], [5.4, 1.5, -0.6], [5.9, -0.4, -0.6]], { width: 0.12, taper: 0.6, gain: 1.3 }),
    ]; strokes.forEach((s) => group.add(s.mesh));

    const dust = kit.dust({ count: 320, box: [22, 12, 14], center: [1, 0, 0], size: 0.045, seed: 72, color: '#ffe9c4', opacity: 0.85 }); group.add(dust);
    const dustNear = kit.dust({ count: 40, box: [12, 7, 2], center: [1, 0, 3.4], size: 0.11, seed: 73, color: '#ffd9a0', opacity: 0.3 }); group.add(dustNear);
    const glints = [[-0.36, 0.42], [0.1, 0.5], [0.42, 0.1]].map((p, i) => { const g = kit.plate(tex.glint, 1, 1, { additive: true, billboard: true, opacity: 0, color: '#fff4c8' }); g.userData = { p, t: 97 + i * 3.4 }; group.add(g); return g; });
    const shoot = kit.ribbon([[9.5, 5.6, -8], [5.5, 4.0, -8], [1.5, 2.9, -8]], { width: 0.06, gain: 1.4, taper: 1.2 }); group.add(shoot.mesh);

    // ---------- extra detail: aurora on the limb, a satellite, drifting rocks, a crown constellation, lens dirt
    const limb = (a0, a1, rr) => { const o = []; for (let i = 0; i <= 40; i++) { const a = (a0 + (a1 - a0) * i / 40) * Math.PI / 180; o.push(new THREE.Vector3(PC.x + Math.cos(a) * PR * rr, PC.y + Math.sin(a) * PR * rr, PC.z + 0.02)); } return o; };
    const aurora = [kit.ribbon(limb(66, 104, 1.012), { width: 0.5, color: '#2cffa6', gain: 0.5, opacity: 0.5, taper: 0.8, segments: 60 }), kit.ribbon(limb(70, 100, 1.02), { width: 0.14, color: '#9dffd6', gain: 1.0, opacity: 0.85, taper: 0.9, segments: 60 })];
    aurora.forEach((r) => { r.mesh.material.blending = THREE.AdditiveBlending; r.mesh.material.depthWrite = false; group.add(r.mesh); });
    const satG = new THREE.Group(); const sm = (pts, c) => { const m = kit.poly(pts, { color: c, grain: false }); satG.add(m); return m; };
    sm([[-0.16, -0.1], [0.16, -0.1], [0.16, 0.1], [-0.16, 0.1]], '#c9d2da'); sm([[-0.78, -0.14], [-0.2, -0.14], [-0.2, 0.14], [-0.78, 0.14]], '#274a8c'); sm([[0.2, -0.14], [0.78, -0.14], [0.78, 0.14], [0.2, 0.14]], '#274a8c'); sm([[-0.03, 0.1], [0.03, 0.1], [0.03, 0.3], [-0.03, 0.3]], '#e8eef2');
    const satGl = kit.plate(tex.glint, 0.7, 0.7, { additive: true, billboard: true, color: '#ffffff' }); satGl.position.set(0.5, 0.05, 0.05); satG.add(satGl); satG.scale.setScalar(0.62); group.add(satG);
    const rocks = []; for (let i = 0; i < 9; i++) { const nP = 6 + Math.floor(R() * 3), rr = R.range(0.1, 0.42), pts = []; for (let k = 0; k < nP; k++) { const a = (k / nP) * TAU; pts.push([Math.cos(a) * rr * R.range(0.6, 1.1), Math.sin(a) * rr * R.range(0.6, 1.1)]); } const m = kit.poly(pts, { color: R.pick(['#141a22', '#1d2530', '#0c1016']), grain: false }); const rim = kit.poly(pts.map((q) => [q[0] * 1.09 + 0.012, q[1] * 1.09 + 0.012]), { color: '#ffd9a0', gain: 0.9, grain: false }); rim.position.z = -0.01; const g = new THREE.Group(); g.add(rim, m); g.position.set(R.range(-6.5, 8.5), R.range(-3.6, 4), R.range(2.2, 5.2)); g.userData = { p: g.position.clone(), sp: R.range(-0.03, 0.03), v: R.range(0.006, 0.02) }; group.add(g); rocks.push(g); }
    const CR = [[-1.9, 3.5], [-1.45, 4.25], [-1.0, 3.75], [-0.55, 4.4], [-0.1, 3.75], [0.35, 4.25], [0.8, 3.5]].map((q) => new THREE.Vector3(q[0] - 1.2, q[1] + 0.2, -12));
    const crown = kit.ribbon([...CR, CR[0].clone()], { width: 0.035, gain: 1.0, opacity: 0.6, taper: 2.0, segments: 70 }); crown.mesh.material.blending = THREE.AdditiveBlending; group.add(crown.mesh);
    const crownStars = CR.map((q) => { const g = kit.plate(tex.glint, 0.55, 0.55, { additive: true, billboard: true, color: '#dfeaff' }); g.position.copy(q); group.add(g); return g; });
    const dirt = []; for (let i = 0; i < 14; i++) { const g = kit.plate(R.pick([tex.ringOpen, tex.glow, tex.hex]), 1, 1, { additive: true, billboard: true, color: R.pick(['#ffcf8a', '#ffe9c0', '#ffb070']), opacity: R.range(0.05, 0.16), depthTest: false }); const a = R() * TAU, d = R.range(1.5, 7); g.position.set(SUN.x + Math.cos(a) * d, SUN.y + Math.sin(a) * d * 0.7, SUN.z + 2); const sc = R.range(0.5, 2.2); g.scale.set(sc, sc, 1); g.userData = { o: g.material.opacity }; group.add(g); dirt.push(g); }

    const camKeys = [
      { rf: 78, p: [0.4, 0.5, 10.4], t: [0.6, 0.25, 0], roll: -5 },
      { rf: 86, p: [0.7, 0.35, 8.6], t: [0.8, 0.15, 0], roll: -2.5, e: 'out3' },
      { rf: 96, p: [1.0, 0.1, 7.5], t: [1.05, 0.0, 0], roll: -0.5, e: 'io2' },
      { rf: 118, p: [1.55, -0.15, 6.3], t: [1.55, -0.2, 0], roll: 1.6, e: 'lin' },
    ];
    const OPEN = [[78, 0.07], [79, 0.14], [80, 0.26], [81, 0.36], [82, 0.47], [83, 0.58], [84, 0.75], [85, 0.95], [86, 1.3]];
    const CLOSE = [[106.5, 1.35], [108, 1.12, 'out2'], [110, 0.9], [111, 0.62], [112, 0.45], [113, 0.32], [114, 0.17], [115, 0.0]];
    const n = w.n; const V = new THREE.Vector3(), C0 = new THREE.Vector3();
    // the word bends in 3D: letters sit on a cylinder, so the first letters turn away around the planet
    const Rb = w.width * 1.25, xmax = w.width / 2; const bend = w.letters.map((Lt) => { const ph = (Lt.home.x - xmax) / Rb; return { x: xmax + Rb * Math.sin(ph) - Lt.home.x, z: -Rb * (1 - Math.cos(ph)), ry: ph }; });

    return { group, update(rf) {
      const T = rf - 78; earthU.uSpin.value = 0.02 + T * 0.0009; neb.material.uniforms.uTime.value = T;
      stars.rotation.y = T * 0.0006; starsBig.rotation.y = T * 0.0009; moon.rotation.y = T * 0.004;
      twinkles.forEach((g) => { const k = 0.5 + 0.5 * Math.sin(rf * g.userData.sp + g.userData.ph); const s = g.userData.s * (0.35 + 0.9 * k); g.scale.set(s, s, 1); g.material.opacity = 0.25 + 0.75 * k; g.material.rotation = T * 0.01; });
      orbits.forEach((o, i) => o.set(0, prog(rf, 84 + i * 2, 100 + i * 2, 'out3')));
      const sa = 0.2 + (0.18 + T * 0.012) * TAU * 0.62, sr = PR * 1.48; const sx = Math.cos(sa) * sr, sy = Math.sin(sa) * sr * 0.86; satl.position.set(PC.x + sx * Math.cos(0.5) - sy * Math.sin(0.5), PC.y + sx * Math.sin(0.5) + sy * Math.cos(0.5), PC.z + 0.35);
      const sk = 0.6 + 0.4 * Math.sin(rf * 0.9); satl.scale.set(0.5 + 0.5 * sk, 0.5 + 0.5 * sk, 1); satTrail.position.copy(satl.position); satTrail.rotation.z = sa + 0.5 + Math.PI / 2; satTrail.material.opacity = 0.6 * prog(rf, 88, 94);
      satl.material.opacity = prog(rf, 86, 92);
      // letters tumble in one at a time from the upper right; the stack rotates into reading position
      const settle = prog(rf, 89.5, 96.5, 'io3');
      w.group.rotation.set(-0.2, -0.3 + (rf - 96) * 0.0015, lerp(1.12, 0.21, settle)); w.group.scale.setScalar(lerp(0.72, 1, settle));
      for (let i = 0; i < n; i++) {
        const st = 84 + i * (10.4 / Math.max(1, n - 1)); const t = (rf - st) / 6.5;
        if (t <= 0) { w.pose(i, { o: 0 }); continue; }
        const e = ease.out3(c01(t)), k = 1 - e; const sp = i % 2 ? -1 : 1; const b = bend[i];
        w.pose(i, { x: b.x + k * (3.2 + i * 0.3), y: k * (2.6 - i * 0.9), z: b.z + k * 2.4, rx: k * 2.6 * sp, ry: b.ry + k * 3.4, rz: k * -2.2 * sp, s: lerp(0.55, 1, e), o: c01(t * 4) });
      }
      w.gain(lerp(1.35, 0.96, prog(rf, 84, 95)) + 0.22 * pulse(rf, 98.2, 6)); w.sweep(prog(rf, 98, 107), 0.32);
      wGlow.material.opacity = 0.26 * prog(rf, 90, 97) + 0.16 * pulse(rf, 98.2, 6);
      strokes[0].swoosh(rf, 90.5, 95, 96, 101); strokes[1].swoosh(rf, 92.5, 97, 98, 103); strokes[2].swoosh(rf, 91.5, 96, 97.5, 102.5); strokes[3].swoosh(rf, 99, 103, 104.5, 109);
      strokes[4].swoosh(rf, 95, 100, 102, 108); strokes[5].swoosh(rf, 97, 102, 104, 110); strokes[6].swoosh(rf, 100, 103.5, 105, 109); shoot.swoosh(rf, 101, 104, 104.5, 108);
      // sun
      const sunOn = prog(rf, 92.5, 97, 'out2'); const fl = sunOn * (1 + 0.12 * Math.sin(rf * 0.45));
      sunRays.material.opacity = fl; sunRays.material.rotation = T * 0.006; sunRays2.material.opacity = fl; sunRays2.material.rotation = -T * 0.011; sunHalo.material.opacity = 0.5 * sunOn; sunStreak.material.opacity = 0.85 * sunOn;
      figRim.material.opacity = 0.5 + 0.45 * sunOn; figGlow.material.opacity = 0.16 + 0.22 * sunOn;
      dust.drift(T, [0.006, 0.004, 0.02], 0.08); dustNear.drift(T, [0.02, 0.008, 0], 0.1);
      glints.forEach((g) => { const k = pulse(rf, g.userData.t, 5, 1.4); g.material.opacity = k; const s = 0.3 + 0.75 * k; g.scale.set(s, s, 1); g.material.rotation = (rf - g.userData.t) * 0.08; g.position.set(WP.x + g.userData.p[0] * w.width, WP.y + g.userData.p[1] + g.userData.p[0] * 0.5, 0.6); });

      aurora.forEach((r, i) => { r.set(0, 1, 1 + 0.25 * Math.sin(rf * 0.21 + i * 2)); r.mesh.material.opacity = [0.5, 0.85][i] * (0.75 + 0.25 * Math.sin(rf * 0.3 + i)); });
      satG.position.set(lerp(-3.6, 0.6, prog(rf, 80, 118)), lerp(3.9, 3.2, prog(rf, 80, 118)), -6); satG.rotation.set(0.5, 0.6 + T * 0.01, 0.25 + T * 0.004); satGl.material.opacity = 0.4 + 0.6 * Math.max(0, Math.sin(rf * 0.55));
      rocks.forEach((g) => { const u = g.userData; g.position.set(u.p.x - T * u.v, u.p.y + T * u.v * 0.4, u.p.z); g.rotation.z = T * u.sp; });
      crown.mesh.visible = false; crownStars.forEach((g, i) => { const k = prog(rf, 94 + i * 1.4, 97 + i * 1.4, 'outBackSoft') * (0.7 + 0.3 * Math.sin(rf * 0.5 + i)); g.scale.set(0.55 * k, 0.55 * k, 1); g.material.opacity = k; });
      dirt.forEach((g) => { g.material.opacity = g.userData.o * sunOn; });
      const cam = kit.cam(camKeys, rf); cam.pos.add(kit.shake(rf, 0.035, 0.3, 11)); cam.aperture = 0.045; cam.focus = cam.pos.z;
      // flare ghosts sit on the line from the sun through the point the camera is looking at
      C0.copy(cam.tgt); ghosts.forEach((m) => { V.copy(SUN).lerp(C0, m.userData.t); V.z = lerp(SUN.z, 1.5, Math.min(1, m.userData.t)); m.position.copy(V); m.material.opacity = m.userData.o * sunOn; });
      const opening = rf < 86, closing = rf >= 106.5; const c = prog(rf, 107, 114);
      const rim = closing ? [1, lerp(0.88, 0.06, ease.in2(c)), lerp(0.1, 0.06, c)] : [1, 0.04, 0.08];
      return { cam, clear: 0x01060a, post: {
        irisHole: opening ? track(OPEN, rf) : closing ? track(CLOSE, rf) : 9, irisRim: rim, irisRimW: opening ? 0.2 : lerp(0.12, 0.2, c), irisBg: [1, 1, 1],
        flash: rf >= 114.6 ? 1 : 0, zoomBlur: 0.7 * (1 - prog(rf, 78, 87, 'out2')) + 0.35 * prog(rf, 110, 114.5, 'in2'),
        bloom: 0.7 + 0.3 * pulse(rf, 98.2, 6), bloomThreshold: 0.88, vignette: 0.62, saturation: 1.2, contrast: 1.12,
        exposure: 1 + 0.3 * (1 - prog(rf, 78, 84)) + 0.12 * pulse(rf, 98.2, 5), chroma: 0.0018 + 0.004 * pulse(rf, 82.4, 5),
        zoom: 1 + 0.03 * pulse(rf, 82.4, 5) + 0.025 * pulse(rf, 98.2, 5), lens: 0.07 * pulse(rf, 82.4, 6) + 0.05 * pulse(rf, 98.2, 6),
        rays: 0.3 * sunOn, raysCenter: [0.92, 0.9], leak: 0.2 * sunOn, leakColor: [1, 0.6, 0.24], leakPos: [1.0, 1.0], leakSize: 0.95,
        bars: track([[78, 0], [87, 0], [90, 0.07, 'out3'], [118, 0.07]], rf), barsAlpha: 0.75, mark: 0.38, sharpen: 0.5, dust: 0.4,
      } };
    } };
  },
};
