// SECTION K — "outro"  (reference frames 525–657)   [work in progress: texture probe]
import { ease, prog, sat, lerp, track, pulse } from '../util.js';

export default {
  build(ctx) {
    const { THREE, kit, tex } = ctx; const group = new THREE.Group();
    const emb = kit.plate(tex.emblem, 2, 2, {}); emb.position.set(-1.6, 0, 0); group.add(emb);
    const cta = kit.plate(tex.cta, 3.2, 3.2 / tex.ctaAspect, {}); cta.position.set(1.7, 0.6, 0); group.add(cta);
    const sm = kit.plate(tex.smoke, 1.5, 1.5, { additive: true }); sm.position.set(1.0, -0.8, 0); group.add(sm);
    const gl = kit.plate(tex.glint, 1.0, 1.0, { additive: true }); gl.position.set(2.6, -0.8, 0); group.add(gl);
    return { group, update(rf) {
      return { cam: { pos: new THREE.Vector3(0, 0, 5), tgt: new THREE.Vector3(0, 0, 0) }, clear: 0x101018, post: { mark: 0.38 } };
    } };
  },
};
