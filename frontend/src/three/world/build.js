import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { UP } from '../core/math.js';
import { planet } from './planet.js';
import { railTan } from './rail.js';
import { PLATEAU, PR, radiusAt, terrain } from './terrain.js';
import { canvasTex } from './textures.js';

// Materiais das construções (mesma família de cores do site, com acentos quentes).
const mats = {};
const mat = (hex, extra = {}) => mats[hex + JSON.stringify(extra)] ??= new THREE.MeshStandardMaterial({ color: hex, roughness: 0.75, flatShading: true, ...extra });
const box = (w, h, d, color, x, y, z, parent, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, extra)); m.position.set(x, y + h / 2, z); parent.add(m); return m; };
// Telhado de quatro águas com base exata w × d (cone de 4 lados girado 45° e escalado na geometria).
const hipRoof = (w, d, h, color) => { const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4); geo.rotateY(Math.PI / 4); geo.scale(w, h, d); return new THREE.Mesh(geo, mat(color)); };
const cyl = (r, h, color, x, y, z, parent, seg = 12) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat(color)); m.position.set(x, y + h / 2, z); parent.add(m); return m; };
const sag = (x, z) => -(PR - Math.sqrt(PR * PR - (x * x + z * z)));
// Grupo de uma área, de pé na superfície. Com railTh, o eixo x local fica paralelo à ferrovia ali.
function zoneGroup(dir, railTh) {
  const g = new THREE.Group();
  g.position.copy(dir).multiplyScalar(radiusAt(PLATEAU) - 0.004);
  g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  if (railTh !== undefined) {
    const tl = railTan(railTh).applyQuaternion(g.quaternion.clone().invert());
    g.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(UP, Math.atan2(-tl.z, tl.x)));
  }
  planet.add(g);
  return g;
}

// Junta as peças paradas de um objeto animado (boi, navio...) por material: menos chamadas de desenho.
function compact(obj) {
  const groups = new Map();
  for (const o of [...obj.children]) {
    if (!o.isMesh || o.userData.keep || o.userData.anim) continue;
    o.updateMatrix();
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(o.matrix);
    if (!o.material.map) g.deleteAttribute('uv');
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(g); obj.remove(o);
  }
  for (const [m, list] of groups) obj.add(new THREE.Mesh(mergeGeometries(list), m));
}

// Peça comprida que acompanha a curvatura do planeta (ruas, avenida, ponte).
function draped(w, h, d, color, x, z, g, lift = 0, extra) {
  const geo = new THREE.BoxGeometry(w, h, d, Math.max(1, Math.round(w / 0.02)), 1, Math.max(1, Math.round(d / 0.02))), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + h / 2 + lift + sag(p.getX(i) + x, p.getZ(i) + z));
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat(color, extra)); m.position.set(x, 0, z); g.add(m); return m;
}
// Altura do chão (terreno real) num ponto local de uma área.
function ground(g, x, z) {
  const R0 = g.position.length(), d = new THREE.Vector3(x, 0, z).applyQuaternion(g.quaternion).add(g.position).normalize(), r = radiusAt(terrain(d));
  return Math.sqrt(Math.max(0, r * r - x * x - z * z)) - R0;
}
// Rua de asfalto que acompanha a curvatura, com faixa tracejada no meio.
function road(g, x0, z0, x1, z1, w = 0.02, lift = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0), along = Math.abs(x1 - x0) > Math.abs(z1 - z0);
  draped(along ? len + w : w, 0.003, along ? w : len + w, '#3a3f4a', (x0 + x1) / 2, (z0 + z1) / 2, g, lift);
  for (let s = 0.01; s < len - 0.005; s += 0.02) { const x = x0 + (x1 - x0) * s / len, z = z0 + (z1 - z0) * s / len; box(along ? 0.008 : 0.0015, 0.0008, along ? 0.0015 : 0.008, '#f2f2f2', x, sag(x, z) + lift + 0.003, z, g); }
}

// Peça reta ao longo de x que acompanha a curvatura e uma altura variável (ponte com rampas).
function liftBox(x0, x1, z, w, h, liftFn, material, g) {
  const geo = new THREE.BoxGeometry(x1 - x0, h, w, Math.max(2, Math.round((x1 - x0) / 0.01)), 1, 1), p = geo.attributes.position, cx = (x0 + x1) / 2;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i) + cx, zz = p.getZ(i) + z; p.setY(i, p.getY(i) + h / 2 + sag(x, zz) + liftFn(x)); }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.position.set(cx, 0, z); g.add(m); return m;
}
// Piso urbano do Centro inteiro (pedra clara), vazado no rio, para o verde do planeta não aparecer entre as quadras.
function cityFloor(g, r, y, water) {
  const S = 512, tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#d3c9b8'; x.fillRect(0, 0, w, h);
    for (let r2 = 0; r2 < h / 6; r2++) for (let k = 0; k < w / 6; k++) { x.fillStyle = (r2 * 5 + k * 3) % 7 ? '#dbd2c2' : '#c4b9a6'; x.fillRect(k * 6 + (r2 % 2 ? 3 : 0) + 0.5, r2 * 6 + 0.5, 5, 5); }
    const px = u => (u / r + 1) / 2 * S;
    x.clearRect(px(water[0]), 0, px(water[1]) - px(water[0]), h);
    const gr = x.createRadialGradient(S / 2, S / 2, S * 0.43, S / 2, S / 2, S / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  const geo = new THREE.RingGeometry(0.0005, r, 96, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + y);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95 })));
}
// Piso desenhado com cantos arredondados (praça), recortado por transparência.
function roundedPad(g, cx, cz, hx, hz, rc, y, draw) {
  const W = 128, H = Math.round(W * hz / hx), k = W / (2 * hx);
  const tex = canvasTex(W, H, (x, w, h) => {
    x.save(); x.beginPath(); x.roundRect(0, 0, w, h, rc * k); x.clip(); draw(x, w, h, k); x.restore();
  });
  const geo = new THREE.PlaneGeometry(2 * hx, 2 * hz, 12, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i) + cx, p.getZ(i) + cz) + y);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, roughness: 0.9 })); m.position.set(cx, 0, cz); g.add(m); return m;
}

// Piso temático de cada área: textura pintada, com a borda sumindo no terreno.
function zoneFloor(g, r, draw, glow = false) {
  const tex = canvasTex(256, 256, (x, w, h) => {
    draw(x, w, h);
    const gr = x.createRadialGradient(w / 2, h / 2, w * 0.34, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  const geo = new THREE.RingGeometry(0.0005, r, 64, 12); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + 0.0018);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.85, ...(glow ? { emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.7 } : {}) }));
  g.add(m); return m;
}

export { box, cityFloor, compact, cyl, draped, hipRoof, liftBox, mat, road, roundedPad, sag, zoneFloor, zoneGroup };
