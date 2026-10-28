import * as THREE from 'three';
import { smooth, smoother } from '../../core/math.js';
import { box, compact, cyl, mat, sag, zoneFloor } from '../build.js';
import { C } from '../palette.js';
import { animated, fxT } from '../runtime.js';
import { floors } from '../textures.js';
import { locoMesh, wagonMesh } from '../vehicles.js';

// Ferrovia: terminal ao lado da linha principal, com trem parado sendo descarregado pelo virador de vagões,
// esteira levando o minério ao pátio, trem vazio e locomotiva de manobra. Os trens da linha passam ao fundo.
function buildRailway(g, zi) {
  zoneFloor(g, 0.31, floors.gravel);
  const railM = mat(C.steel, { metalness: 0.6, roughness: 0.4 });
  const track = (z, x0, x1) => {
    for (let x = x0; x < x1 - 1e-6; x += 0.05) for (const s of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.004, 0.004), railM); m.position.set(x + 0.025, sag(x + 0.025, z) + 0.008, z + s * 0.018); g.add(m); }
    for (let x = x0 + 0.01; x < x1; x += 0.022) box(0.01, 0.005, 0.05, C.trunk, x, sag(x, z) + 0.002, z, g);
  };
  const ZA = 0.03, ZB = -0.085, DX = 0.06;
  track(ZA, -0.28, 0.28); track(ZB, -0.26, 0.24);
  const car = loaded => wagonMesh(loaded), loco = color => locoMesh(color);
  // Trem carregado parado na linha do virador.
  const parked = [[-0.235, loco(C.amber)], [-0.14, car(true)], [-0.045, car(true)], [0.155, car(false)], [0.25, car(false)]];
  for (const [x, o] of parked) { o.position.set(x, sag(x, ZA) + 0.012, ZA); if (x < -0.2) o.rotation.y = Math.PI; compact(o); g.add(o); }  // locomotiva de frente para a linha
  // Virador de vagões: gira o vagão de lado e o minério cai no fosso.
  box(0.11, 0.004, 0.07, '#1a1420', DX, sag(DX, ZA + 0.05) + 0.001, ZA + 0.05, g);
  const dumper = new THREE.Group(); dumper.position.set(DX, sag(DX, ZA) + 0.03, ZA); dumper.userData.keep = true; g.add(dumper);
  for (const s of [-1, 1]) { const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 24), mat(C.amber)); ringM.rotation.y = Math.PI / 2; ringM.position.x = s * 0.05; dumper.add(ringM); }
  for (const a of [0.6, 2.5, 3.8, 5.6]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.005), mat(C.amber)); bar.position.set(0, Math.sin(a) * 0.048, Math.cos(a) * 0.048); dumper.add(bar); }
  const inCar = car(true); inCar.position.y = -0.018; dumper.add(inCar);
  box(0.13, 0.004, 0.11, C.ice, DX, sag(DX, ZA) + 0.1, ZA, g);
  for (const [px, pz] of [[-0.055, -0.045], [0.055, -0.045], [-0.055, 0.045], [0.055, 0.045]]) box(0.006, 0.1, 0.006, C.gray, DX + px, sag(DX + px, ZA + pz), ZA + pz, g);
  // Minério caindo no fosso.
  const fallM = mat(C.ore), falling = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), fallM); m.visible = false; g.add(m); m.userData.keep = true; return m; });
  // Esteira do fosso até a pilha do pátio, com pedaços de minério andando.
  const b0 = new THREE.Vector3(DX + 0.03, sag(DX, ZA + 0.07) + 0.01, ZA + 0.07), b1 = new THREE.Vector3(0.2, sag(0.2, 0.22) + 0.075, 0.22);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, b0.distanceTo(b1)), mat(C.dark)); belt.position.copy(b0).lerp(b1, 0.5); belt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b1.clone().sub(b0).normalize()); g.add(belt);
  for (const k of [0.3, 0.65]) { const p = b0.clone().lerp(b1, k); box(0.005, p.y - sag(p.x, p.z), 0.005, C.gray, p.x, sag(p.x, p.z), p.z, g); }
  const chunks = Array.from({ length: 9 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.006, 0.009), fallM); m.userData.keep = true; g.add(m); return m; });
  const pile = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.075, 12), mat(C.ore)); pile.scale.z = 1.5; pile.position.set(0.21, sag(0.21, 0.23) + 0.037, 0.23); g.add(pile);
  // Base: oficina com telhado, torre de controle e postes de luz.
  box(0.13, 0.06, 0.07, C.white, -0.15, sag(-0.15, -0.19), -0.19, g); box(0.135, 0.01, 0.075, C.teal, -0.15, sag(-0.15, -0.19) + 0.06, -0.19, g);
  box(0.03, 0.11, 0.03, C.ice, 0.0, sag(0, -0.2), -0.2, g); box(0.045, 0.025, 0.045, '#9fe9ff', 0.0, sag(0, -0.2) + 0.11, -0.2, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
  for (const [x, z] of [[-0.27, -0.03], [0.27, -0.03]]) { cyl(0.0025, 0.14, C.gray, x, sag(x, z), z, g, 5); box(0.018, 0.008, 0.012, '#ffd28a', x, sag(x, z) + 0.14, z, g, { emissive: '#ffb347', emissiveIntensity: 1.6 }); }
  // Trem vazio esperando e locomotiva de manobra indo e voltando.
  for (let i = 0; i < 4; i++) { const c = car(false); const x = -0.02 + i * 0.09; c.position.set(x, sag(x, ZB) + 0.012, ZB); compact(c); g.add(c); }
  const shunter = loco(C.coral); compact(shunter); g.add(shunter);
  shunter.userData.anim = t => { const x = -0.2 + (Math.sin(t * 0.25) * 0.5 + 0.5) * 0.08; shunter.position.set(x, sag(x, ZB) + 0.012, ZB); };
  animated.push(shunter);
  // Ciclo: gira (2 s), despeja (1,5 s), volta (2 s), entra vagão cheio. Repete sozinho; o botão começa um agora.
  const fallFrom = new THREE.Vector3(DX, sag(DX, ZA) + 0.06, ZA + 0.03);
  dumper.userData.anim = t => {
    const f = fxT(zi), u = (f >= 0 ? f : t) % 9;
    const turn = smoother(0, 2, u) * (1 - smoother(3.5, 5.5, u));
    dumper.rotation.x = turn * 2.6;
    inCar.userData.heap.visible = u < 2.4 || u > 6;
    inCar.userData.heap.scale.set(1, Math.max(0.01, u > 6 ? smooth(6, 7, u) : 1), 1);
    falling.forEach((m, i) => {
      const k = (u - 2 - i * 0.12) / 0.6; m.visible = k > 0 && k < 1 && u < 3.8;
      if (m.visible) m.position.set(fallFrom.x + (i % 3 - 1) * 0.015, fallFrom.y + 0.02 - k * 0.07, fallFrom.z + 0.01 + k * 0.012);
    });
    chunks.forEach((m, i) => { const k = (t * 0.12 + i / chunks.length) % 1; m.position.copy(b0).lerp(b1, k); m.position.y += 0.006; m.rotation.y = i; });
  };
  animated.push(dumper);
}

export { buildRailway };
