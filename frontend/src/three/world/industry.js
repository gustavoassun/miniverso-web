import * as THREE from 'three';
import { R, smooth } from '../core/math.js';
import { mat, sag } from './build.js';
import { C } from './palette.js';
import { railPt } from './rail.js';
import { PLATEAU, terrain } from './terrain.js';
import { canvasTex } from './textures.js';

// Peças dos terminais industriais (Ferrovia e Porto): chão de brita recortado, galeria de treliça da correia e
// pilhas compridas de minério.
// Onde a brita fica (0 a 1) num terminal com a linha principal do lado −z: só do lado do terminal, até logo depois
// dos trilhos, e nunca onde o terreno desce para a praia ou o mar. Do outro lado da linha volta o gramado do planeta.
function terminalMask(g) {
  const inv = g.quaternion.clone().invert(), R0 = g.position.length(), pts = [];
  for (let th = 0; th < Math.PI * 2; th += 0.004) { const p = railPt(th).applyQuaternion(inv).multiplyScalar(R0); if (p.y > 0 && Math.hypot(p.x, p.z) < 1.3) pts.push([p.x, p.z]); }
  const railZ = x => { let best = pts[0]; for (const q of pts) if (Math.abs(q[0] - x) < Math.abs(best[0] - x)) best = q; return best[1]; };
  const d = new THREE.Vector3();
  return (x, z) => {
    d.set(x, 0, z).applyQuaternion(g.quaternion).add(g.position).normalize();
    return smooth(railZ(x) - 0.045, railZ(x) - 0.028, z) * smooth(PLATEAU - 0.006, PLATEAU - 0.001, terrain(d));
  };
}
// Chão de brita do terminal, com a borda sumindo no terreno e recortado pela máscara.
function yardFloor(g, r, y, keep) {
  const S = 512, tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#a49c90'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) { x.fillStyle = R() > 0.5 ? '#8c847a' : '#bdb5aa'; x.fillRect(R() * w, R() * h, 2, 2); }
    const gr = x.createRadialGradient(S / 2, S / 2, S * 0.42, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h);
    // Máscara em 128×128 ampliada com suavização (canvas y cresce com z local, como o UV do anel).
    const N = 128, m = document.createElement('canvas'); m.width = m.height = N;
    const mx = m.getContext('2d'), img = mx.createImageData(N, N);
    for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) img.data[(j * N + i) * 4 + 3] = Math.round(255 * keep((i + 0.5) / N * 2 * r - r, (j + 0.5) / N * 2 * r - r));
    mx.putImageData(img, 0, 0);
    x.globalCompositeOperation = 'destination-in'; x.imageSmoothingEnabled = true; x.drawImage(m, 0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  const geo = new THREE.RingGeometry(0.0005, r, 96, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + y);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95 })));
}
// Galeria de treliça de a até b: piso da correia, cordas, diagonais e cobertura.
function gallery(g, a, b) {
  const grp = new THREE.Group(), L = a.distanceTo(b), steel = mat('#9aa8b8');
  grp.position.copy(a).lerp(b, 0.5); grp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize()); g.add(grp);
  const add = (w, h, d, x, y, z, m, rx = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.x = rx; grp.add(o); };
  add(0.016, 0.003, L, 0, 0, 0, mat(C.dark));
  for (const s of [-1, 1]) { add(0.002, 0.002, L, s * 0.012, 0, 0, steel); add(0.002, 0.002, L, s * 0.012, 0.02, 0, steel);
    const n = Math.round(L / 0.025), seg = L / n, dl = Math.hypot(seg, 0.02), ang = Math.atan2(0.02, seg);
    for (let i = 0; i < n; i++) add(0.0015, 0.0015, dl, s * 0.012, 0.01, -L / 2 + (i + 0.5) * seg, steel, i % 2 ? ang : -ang); }
  add(0.03, 0.002, L, 0, 0.022, 0, mat('#cfd8e6'));
}
// Pilha comprida de minério (crista no meio e pontas inclinadas) acompanhando a curvatura.
function windrow(g, x0, x1, z, w, h, color, G) {
  const L = x1 - x0, cx = (x0 + x1) / 2, geo = new THREE.BoxGeometry(L, h, w, 16, 1, 4), p = geo.attributes.position, k = (L / 2 - h * 1.1) / (L / 2);
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i), y = p.getY(i), zz = p.getZ(i);
    if (y > 0) { zz *= 0.06; x *= k; y += (R() - 0.5) * 0.006; }
    p.setXYZ(i, x, y + h / 2 + sag(x + cx, zz + z) + G, zz);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color)); m.position.set(cx, 0, z); g.add(m);
}

export { gallery, terminalMask, windrow, yardFloor };
