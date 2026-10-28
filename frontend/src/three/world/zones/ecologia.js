import * as THREE from 'three';
import { R, TAU, mix, smooth } from '../../core/math.js';
import { box, compact, cyl, mat, sag, zoneFloor } from '../build.js';
import { C } from '../palette.js';
import { tree } from '../props.js';
import { animated, fxT } from '../runtime.js';
import { floors } from '../textures.js';

// Ecologia: mangue com guarás, painéis solares, turbinas e uma árvore de luz.
function buildEcology(g, zi) {
  zoneFloor(g, 0.31, floors.meadow);
  const lx = -0.06, lz = 0.06, ly = sag(lx, lz);
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.11, 28), mat('#2a86c4', { emissive: '#0a3352', roughness: 0.2, metalness: 0.1 })); water.rotation.x = -Math.PI / 2; water.position.set(lx, ly + 0.004, lz); g.add(water);
  const mangroves = [];
  for (let k = 0; k < 7; k++) {
    const a = k / 7 * TAU + 0.3, x = lx + Math.cos(a) * 0.11, z = lz + Math.sin(a) * 0.11, y = sag(x, z);
    if (Math.sin(a) > 0.75) continue;
    for (let r = 0; r < 4; r++) { const b = r / 4 * TAU + a, root = new THREE.Mesh(new THREE.CylinderGeometry(0.0016, 0.0016, 0.04, 4), mat(C.trunk)); root.position.set(x + Math.cos(b) * 0.009, y + 0.016, z + Math.sin(b) * 0.009); root.rotation.set(-Math.sin(b) * 0.5, 0, Math.cos(b) * 0.5); g.add(root); }
    cyl(0.003, 0.05, C.trunk, x, y + 0.02, z, g, 5);
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.03, 0), mat(k % 2 ? '#2f7d5a' : '#3a8f62')); crown.scale.set(1, 0.6, 1); crown.position.set(x, y + 0.075, z); g.add(crown);
    mangroves.push([x, z]);
  }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    const x = 0.08 + i * 0.05, z = -0.17 + j * 0.06;
    cyl(0.002, 0.018, C.gray, x, sag(x, z), z, g, 4);
    const p = box(0.044, 0.003, 0.032, '#1e4488', x, sag(x, z) + 0.016, z, g, { metalness: 0.5, roughness: 0.25 }); p.rotation.x = 0.5;
  }
  for (const [x, z] of [[-0.17, -0.15], [-0.05, -0.2]]) {
    const t = new THREE.Group(); t.position.set(x, sag(x, z), z); g.add(t);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.006, 0.22, 6), mat(C.white)); mast.position.y = 0.11; t.add(mast);
    const rotor = new THREE.Group(); rotor.position.set(0, 0.22, 0.008); t.add(rotor);
    for (let b = 0; b < 3; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.085, 0.002), mat(C.white)); blade.geometry.translate(0, 0.042, 0); blade.rotation.z = b * TAU / 3; rotor.add(blade); }
    const sp = 1.1 + R() * 0.5; rotor.userData.anim = tt => { rotor.rotation.z = tt * sp; }; animated.push(rotor);
  }
  tree(g, 0.2, 0.18, 0.9); tree(g, 0.06, 0.2, 1.1, '#2f9b7a'); tree(g, -0.21, 0.05, 1); tree(g, 0.22, -0.02, 0.8);
  // Árvore de luz (ficção): copa de cristais que pulsa.
  const lightM = new THREE.MeshStandardMaterial({ color: '#7fe9d2', emissive: '#3ee0b5', emissiveIntensity: 0.8, roughness: 0.3, flatShading: true, transparent: true, opacity: 0.92 });
  const lt = new THREE.Group(), ltx = 0.15, ltz = 0.08; lt.position.set(ltx, sag(ltx, ltz), ltz); g.add(lt);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.008, 0.08, 6), mat(C.white)); trunk.position.y = 0.04; lt.add(trunk);
  for (const [s, y, x] of [[0.04, 0.1, 0], [0.03, 0.14, 0.015], [0.026, 0.12, -0.022]]) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), lightM); c.position.set(x, y, 0); lt.add(c); }
  compact(lt);
  lt.userData.anim = t => { lightM.emissiveIntensity = 0.6 + 0.4 * Math.sin(t * 1.6); lt.rotation.y = t * 0.2; };
  animated.push(lt);
  // Guarás: pousados na beira do mangue; voam em roda quando chamados (dois ficam sempre voando).
  const birdM = mat('#e8452f'), flock = [];
  for (let k = 0; k < 10; k++) {
    const b = new THREE.Group(); b.userData.keep = true; g.add(b);
    b.add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.006, 0.006), birdM));
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.004, 0.004), birdM); head.position.set(0.009, 0.003, 0); b.add(head);
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.0015, 0.02), birdM); w.geometry.translate(0, 0, s * 0.01); b.add(w); return w; });
    const a0 = k / 10 * TAU, perch = new THREE.Vector3(lx + Math.cos(a0) * 0.085, ly + 0.008, lz + Math.sin(a0) * 0.085);
    flock.push({ b, wings, a0, perch, r: 0.11 + (k % 3) * 0.035, h: 0.13 + (k % 4) * 0.025, sp: 0.7 + (k % 3) * 0.15 });
  }
  const fly = new THREE.Group(); g.add(fly);
  fly.userData.anim = t => {
    const f = fxT(zi), up = f < 0 ? 0 : smooth(0, 1.6, f) * (1 - smooth(10, 12, f));
    flock.forEach((o, k) => {
      const lift = k < 2 ? 1 : up, a = o.a0 + t * o.sp;
      o.b.position.set(mix(o.perch.x, lx + Math.cos(a) * o.r, lift), mix(o.perch.y, ly + o.h + Math.sin(t * 1.3 + k) * 0.01, lift), mix(o.perch.z, lz + Math.sin(a) * o.r, lift));
      o.b.rotation.y = lift > 0.02 ? -a - Math.PI / 2 : -o.a0;
      const flap = lift > 0.02 ? Math.sin(t * 14 + k) * 0.7 : 0.15;
      o.wings[0].rotation.x = -flap; o.wings[1].rotation.x = flap;
    });
  };
  animated.push(fly);
}

export { buildEcology };
