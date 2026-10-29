import * as THREE from 'three';
import { R, TAU } from '../core/math.js';
import { box, cyl, mat, sag } from './build.js';
import { C } from './palette.js';
import { animated } from './runtime.js';

function palm(g, x, z, h = 0.12, y = sag(x, z)) {
  const lean = (R() - 0.5) * 0.2;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.006, h, 5), mat(C.trunk)); trunk.position.set(x, y + h / 2, z); trunk.rotation.z = lean; g.add(trunk);
  for (let k = 0; k < 7; k++) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.003, 0.013), mat('#3aa58c')); leaf.geometry.translate(0.027, 0, 0);
    leaf.position.set(x - Math.sin(lean) * h, y + h, z); leaf.rotation.set(0, k / 7 * TAU, -0.5); g.add(leaf);
  }
}
function tree(g, x, z, s = 1, color = '#3aa58c', y = sag(x, z)) {
  cyl(0.004 * s, 0.025 * s, C.trunk, x, y, z, g, 5);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.024 * s, 0.06 * s, 6), mat(color)); crown.position.set(x, y + 0.05 * s, z); g.add(crown);
}
// Bandeira tremulando no mastro.
function waveFlag(g, x, z, h, tex, w = 0.12) {
  const y = sag(x, z);
  cyl(0.0025, h, C.white, x, y, z, g, 6);
  const geo = new THREE.PlaneGeometry(w, w * 0.6, 12, 3); geo.translate(w / 2, 0, 0);
  const base = geo.attributes.position.array.slice();
  const flag = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.8 }));
  flag.position.set(x + 0.002, y + h - w * 0.3, z); flag.rotation.y = 0.35;
  flag.userData.anim = t => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) { const bx = base[i * 3]; p.setZ(i, Math.sin(bx * 55 - t * 5) * 0.007 * (bx / w)); }
    p.needsUpdate = true; geo.computeVertexNormals();
  };
  g.add(flag); animated.push(flag);
}
// Confete colorido (comemorações).
function confetti(g, x, y, z) {
  // Miudeza: só aparece com a área aberta (nível de detalhe do motor).
  const n = 40, m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.008, 0.002), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
  const cols = [C.coral, C.amber, C.teal, C.violet, '#ffffff', '#00b7e3'].map(h => new THREE.Color(h));
  const vel = Array.from({ length: n }, () => new THREE.Vector3((R() - 0.5) * 0.3, 0.22 + R() * 0.25, (R() - 0.5) * 0.3));
  const o = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < n; i++) { m.setColorAt(i, cols[i % cols.length]); m.setMatrixAt(i, zero); }
  m.position.set(x, y, z); m.frustumCulled = false; m.userData.at = -1; m.userData.detail = true;
  m.userData.anim = t => {
    const age = m.userData.at < 0 ? -1 : t - m.userData.at;
    if (age < 0 || age > 2.6) { if (m.userData.live) { for (let i = 0; i < n; i++) m.setMatrixAt(i, zero); m.instanceMatrix.needsUpdate = true; m.userData.live = false; } return; }
    m.userData.live = true;
    for (let i = 0; i < n; i++) { const v = vel[i]; o.position.set(v.x * age, v.y * age - 0.16 * age * age, v.z * age); o.rotation.set(age * 8 + i, age * 6, i); o.scale.setScalar(1 - age / 2.6); o.updateMatrix(); m.setMatrixAt(i, o.matrix); }
    m.instanceMatrix.needsUpdate = true;
  };
  g.add(m); animated.push(m);
  return m;
}
const lamp = (g, x, z, y, h = 0.05) => {
  cyl(0.0018, h, C.dark, x, y, z, g, 5);
  const l = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), mat('#ffd28a', { emissive: '#ffb347', emissiveIntensity: 1.6 })); l.position.set(x, y + h + 0.002, z); g.add(l);
};
// Lampião colonial (poste escuro com lanterna de quatro faces e chapéu), como os do Centro Histórico.
const lampiao = (g, x, z, y, h = 0.042) => {
  cyl(0.0032, 0.005, C.dark, x, y, z, g, 6);
  cyl(0.0015, h, C.dark, x, y, z, g, 5);
  box(0.0074, 0.0095, 0.0074, '#ffe2a8', x, y + h, z, g, { emissive: '#ffb347', emissiveIntensity: 1.4 });
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.0068, 0.005, 4), mat(C.dark)); cap.rotation.y = Math.PI / 4; cap.position.set(x, y + h + 0.012, z); g.add(cap);
};
const zebra =(g, x, z, alongX, n = 5, lift = 0) => { for (let i = 0; i < n; i++) { const o = (i - (n - 1) / 2) * 0.006; box(alongX ? 0.02 : 0.003, 0.0008, alongX ? 0.003 : 0.02, '#f4f4f4', x + (alongX ? 0 : o), sag(x, z) + lift + 0.0032, z + (alongX ? o : 0), g); } };

export { confetti, lamp, lampiao, palm, tree, waveFlag, zebra };
