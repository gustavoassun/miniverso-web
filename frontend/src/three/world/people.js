import * as THREE from 'three';
import { R, mix, smooth } from '../core/math.js';
import { sag } from './build.js';
import { animated, fxT } from './runtime.js';

// Bonequinhos (público): corpo, cabeça e braços em 3 desenhos só (instâncias). Pulam e levantam os braços na festa.
function crowd(g, spots, zi, colors, opts = {}) {
  const fx = opts.fx || fxT;
  const n = spots.length, mk = (geo) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), geo.userData.per * n); m.frustumCulled = false; g.add(m); return m; };
  const bg = new THREE.CylinderGeometry(0.0032, 0.0042, 0.013, 6); bg.translate(0, 0.0065, 0); bg.userData.per = 1;
  const hg = new THREE.SphereGeometry(0.0033, 8, 6); hg.translate(0, 0.016, 0); hg.userData.per = 1;
  const ag = new THREE.BoxGeometry(0.0016, 0.009, 0.0016); ag.translate(0, -0.0045, 0); ag.userData.per = 2;
  const bodies = mk(bg), heads = mk(hg), arms = mk(ag), skin = ['#8d5a3b', '#c68a5e', '#5a3a2a', '#e0b08a'].map(h => new THREE.Color(h));
  const people = spots.map(([x, z, y], k) => {
    const c = new THREE.Color(colors[k % colors.length]);
    bodies.setColorAt(k, c); heads.setColorAt(k, skin[k % 4]); arms.setColorAt(2 * k, c); arms.setColorAt(2 * k + 1, c);
    return { x, z, y: y ?? (opts.yAt || sag)(x, z), ph: k * 0.7 };
  });
  const o = new THREE.Object3D(), a = new THREE.Object3D();
  bodies.userData.anim = t => {
    const f = fx(zi), party = f < 0 ? 0 : smooth(0, 0.6, f) * (1 - smooth(8, 9, f));
    people.forEach((p, k) => {
      o.position.set(p.x, p.y + Math.abs(Math.sin(t * 7 + p.ph)) * 0.012 * party, p.z); o.rotation.set(0, Math.sin(t * 0.8 + p.ph) * 0.3, 0); o.scale.setScalar(1); o.updateMatrix();
      bodies.setMatrixAt(k, o.matrix); heads.setMatrixAt(k, o.matrix);
      const up = mix(0.15, Math.PI - 0.4 + Math.sin(t * 9 + p.ph) * 0.3, party);
      for (const s of [-1, 1]) { a.position.set(s * 0.0042, 0.012, 0); a.rotation.set(0, 0, s * up); a.updateMatrix(); a.matrix.premultiply(o.matrix); arms.setMatrixAt(2 * k + (s > 0 ? 1 : 0), a.matrix); }
    });
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true;
  };
  animated.push(bodies);
}
// Caminho fechado (lista de pontos x,z) percorrido por distância: devolve posição e direção em s.
function loopPath(pts) {
  const seg = []; let L = 0;
  pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, s: L, l }); L += l; });
  return { L, at(s) {
    s = ((s % L) + L) % L;
    let q = seg[seg.length - 1]; for (const g of seg) if (s < g.s + g.l) { q = g; break; }
    const u = (s - q.s) / q.l, tx = (q.b[0] - q.a[0]) / q.l, tz = (q.b[1] - q.a[1]) / q.l;
    return { x: q.a[0] + (q.b[0] - q.a[0]) * u, z: q.a[1] + (q.b[1] - q.a[1]) * u, tx, tz };
  } };
}
// Pedestres andando por caminhos (corpo + cabeça, instâncias), nos dois sentidos, balançando o passo.
// Com hat (cor), cada um usa capacete (trabalhadores).
function walkers(g, loops, per, colors, yAt = sag, hat) {
  const paths = loops.map(loopPath), n = loops.length * per;
  const bg = new THREE.CylinderGeometry(0.0032, 0.0042, 0.013, 6); bg.translate(0, 0.0065, 0);
  const hg = new THREE.SphereGeometry(0.0033, 8, 6); hg.translate(0, 0.016, 0);
  const mk = geo => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), n); m.frustumCulled = false; g.add(m); return m; };
  const bodies = mk(bg), heads = mk(hg), skin = ['#8d5a3b', '#c68a5e', '#5a3a2a', '#e0b08a'].map(h => new THREE.Color(h));
  const hats = hat ? mk(new THREE.SphereGeometry(0.0038, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.0175, 0)) : null;
  if (hats) for (let i = 0; i < n; i++) hats.setColorAt(i, new THREE.Color(hat));
  const people = [];
  paths.forEach((p, li) => { for (let k = 0; k < per; k++) people.push({ p, off: (k / per + R() * 0.08) * p.L, sp: 0.011 + R() * 0.006, dir: k % 2 ? 1 : -1, side: (R() - 0.5) * 0.006 + (k % 2 ? 0.003 : -0.003), ph: R() * 9 }); });
  people.forEach((o, i) => { bodies.setColorAt(i, new THREE.Color(colors[i % colors.length])); heads.setColorAt(i, skin[i % 4]); });
  const o = new THREE.Object3D();
  bodies.userData.anim = t => {
    people.forEach((w, i) => {
      const q = w.p.at(w.off + w.dir * t * w.sp), x = q.x - q.tz * w.side, z = q.z + q.tx * w.side;
      o.position.set(x, yAt(x, z) + Math.abs(Math.sin(t * 9 + w.ph)) * 0.0015, z);
      o.rotation.set(0, Math.atan2(-q.tz * w.dir, q.tx * w.dir), Math.sin(t * 9 + w.ph) * 0.06); o.updateMatrix();
      bodies.setMatrixAt(i, o.matrix); heads.setMatrixAt(i, o.matrix); hats?.setMatrixAt(i, o.matrix);
    });
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    if (hats) hats.instanceMatrix.needsUpdate = true;
  };
  animated.push(bodies);
}

export { crowd, loopPath, walkers };
