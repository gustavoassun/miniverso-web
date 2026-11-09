import * as THREE from 'three';
import { R, mix, smooth } from '../core/math.js';
import { sag } from './build.js';
import { animated, fxT } from './runtime.js';

// Bonequinhos do planeta, mais caprichados e ainda leves: tronco, duas pernas (calça), dois braços, cabeça e cabelo,
// cada parte desenhada de uma vez só para todas as pessoas (instâncias). Altura total ~2 cm na escala das áreas.
const SKIN = ['#8d5a3b', '#c68a5e', '#5a3a2a', '#e0b08a', '#a8714a'].map(h => new THREE.Color(h));
const HAIR = ['#1f1611', '#3b2414', '#6b4423', '#14100c', '#b58a4a', '#2a1a10'].map(h => new THREE.Color(h));
const PANTS = ['#2a3446', '#1e4488', '#3a3f4a', '#5a4a3a', '#14213d', '#4a5568'].map(h => new THREE.Color(h));
const geos = (() => {
  const torso = new THREE.CylinderGeometry(0.0029, 0.0035, 0.0076, 7); torso.translate(0, 0.0096, 0);
  const leg = new THREE.BoxGeometry(0.0017, 0.0062, 0.0019); leg.translate(0, -0.0031, 0);           // pivô no quadril
  const arm = new THREE.BoxGeometry(0.0014, 0.0068, 0.0015); arm.translate(0, -0.0034, 0);           // pivô no ombro
  const head = new THREE.SphereGeometry(0.0031, 10, 7); head.translate(0, 0.0166, 0);
  const hair = new THREE.SphereGeometry(0.0033, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.55); hair.translate(0, 0.0171, -0.0002);
  return { torso, leg, arm, head, hair };
})();
const HIP = 0.0062, SHOULDER = 0.0128;

// Conjunto de malhas instanciadas para n pessoas; place() posiciona uma pessoa com balanço de pernas e braços.
function figures(g, n, colors) {
  const mk = (geo, count) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.72, flatShading: true }), count); m.frustumCulled = false; m.userData.detail = true; g.add(m); return m; };
  const torso = mk(geos.torso, n), head = mk(geos.head, n), hair = mk(geos.hair, n), legs = mk(geos.leg, 2 * n), arms = mk(geos.arm, 2 * n);
  for (let k = 0; k < n; k++) {
    const c = new THREE.Color(colors[k % colors.length]), p = PANTS[(k * 7 + 3) % PANTS.length];
    torso.setColorAt(k, c); head.setColorAt(k, SKIN[(k * 3) % SKIN.length]); hair.setColorAt(k, HAIR[(k * 5 + 1) % HAIR.length]);
    legs.setColorAt(2 * k, p); legs.setColorAt(2 * k + 1, p); arms.setColorAt(2 * k, c); arms.setColorAt(2 * k + 1, c);
  }
  const o = new THREE.Object3D(), part = new THREE.Object3D(), M = new THREE.Matrix4();
  // swing: balanço do passo (−1..1); armsUp: 0 braços para baixo, 1 erguidos (festa); sit: sentado (pernas à frente).
  const place = (k, x, y, z, rotY, swing = 0, armsUp = 0, tilt = 0, sit = 0) => {
    o.position.set(x, y, z); o.rotation.set(0, rotY, tilt); o.scale.setScalar(1); o.updateMatrix();
    torso.setMatrixAt(k, o.matrix); head.setMatrixAt(k, o.matrix); hair.setMatrixAt(k, o.matrix);
    for (const s of [-1, 1]) {
      const i = 2 * k + (s > 0 ? 1 : 0);
      part.position.set(s * 0.0011, HIP, 0); part.rotation.set(sit ? -1.45 : s * swing * 0.55, 0, 0); part.updateMatrix(); M.multiplyMatrices(o.matrix, part.matrix); legs.setMatrixAt(i, M);
      const up = mix(0.12, Math.PI - 0.35, armsUp);
      part.position.set(s * 0.0037, SHOULDER, 0); part.rotation.set(-s * swing * 0.6, 0, s * up); part.updateMatrix(); M.multiplyMatrices(o.matrix, part.matrix); arms.setMatrixAt(i, M);
    }
  };
  const done = () => { torso.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = hair.instanceMatrix.needsUpdate = legs.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true; };
  return { place, done, host: torso };
}

// Público parado (assistindo, sentado ou na festa): pulam e erguem os braços quando a interação da área toca.
function crowd(g, spots, zi, colors, opts = {}) {
  const fx = opts.fx || fxT, n = spots.length, f = figures(g, n, colors);
  const people = spots.map(([x, z, y], k) => ({ x, z, y: y ?? (opts.yAt || sag)(x, z), ph: k * 0.7 + R() * 0.5 }));
  f.host.userData.anim = t => {
    const v = fx(zi), party = v < 0 ? 0 : smooth(0, 0.6, v) * (1 - smooth(8, 9, v));
    people.forEach((p, k) => f.place(k, p.x, p.y + Math.abs(Math.sin(t * 7 + p.ph)) * 0.011 * party, p.z, Math.sin(t * 0.6 + p.ph) * 0.35, Math.sin(t * 9 + p.ph) * 0.25 * party, party > 0 ? party * (0.8 + 0.2 * Math.sin(t * 9 + p.ph)) : 0));
    f.done();
  };
  animated.push(f.host);
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
// Pedestres andando por caminhos, nos dois sentidos, com passo de verdade (pernas e braços alternando).
// Com hat (cor), cada um usa capacete (trabalhadores).
function walkers(g, loops, per, colors, yAt = sag, hat) {
  const paths = loops.map(loopPath), n = loops.length * per, f = figures(g, n, colors);
  let hats = null;
  if (hat) { hats = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0037, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.0174, 0), new THREE.MeshStandardMaterial({ roughness: 0.6, color: hat }), n); hats.frustumCulled = false; hats.userData.detail = true; g.add(hats); }
  const people = [];
  paths.forEach(p => { for (let k = 0; k < per; k++) people.push({ p, off: (k / per + R() * 0.08) * p.L, sp: 0.011 + R() * 0.006, dir: k % 2 ? 1 : -1, side: (R() - 0.5) * 0.006 + (k % 2 ? 0.003 : -0.003), ph: R() * 9 }); });
  const o = new THREE.Object3D();
  f.host.userData.anim = t => {
    people.forEach((w, i) => {
      const q = w.p.at(w.off + w.dir * t * w.sp), x = q.x - q.tz * w.side, z = q.z + q.tx * w.side, step = Math.sin(t * 10 + w.ph), rot = Math.atan2(-q.tz * w.dir, q.tx * w.dir) + Math.PI / 2;
      const y = yAt(x, z) + Math.abs(step) * 0.0009;
      f.place(i, x, y, z, rot, step, 0, step * 0.04);
      if (hats) { o.position.set(x, y, z); o.rotation.set(0, rot, 0); o.updateMatrix(); hats.setMatrixAt(i, o.matrix); }
    });
    f.done(); if (hats) hats.instanceMatrix.needsUpdate = true;
  };
  animated.push(f.host);
}

export { crowd, loopPath, walkers };
