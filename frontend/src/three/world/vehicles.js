import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, mix } from '../core/math.js';
import { mat, sag } from './build.js';
import { C, VEHICLES } from './palette.js';
import { loopPath } from './people.js';
import { animated } from './runtime.js';

// Carrinhos andando em pistas (um único InstancedMesh por área). Cada pista: ponto inicial, final e altura extra.
// ── Veículos com detalhe: cada um é uma geometria só, com as cores pintadas nos vértices (uma chamada de
// desenho por veículo, ou por frota inteira quando instanciado). Peças brancas recebem a cor da instância.
const GLASS = VEHICLES.glass, TIRE = VEHICLES.tire, STEEL_D = VEHICLES.steel;
let vehMatCache;
const vehMat = () => vehMatCache ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.08, flatShading: true });
const lightMat = () => mat('#fff4c0', { emissive: '#ffe08a', emissiveIntensity: 1.4 });
function paintGeo(parts) {
  return mergeGeometries(parts.map(([geo, hex]) => {
    const g = geo.index ? geo.toNonIndexed() : geo; g.deleteAttribute('uv'); if (g.attributes.uv2) g.deleteAttribute('uv2');
    const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g;
  }));
}
const bx = (w, h, d, x, y, z) => new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z);
const wheelG = (r, w, x, y, z, seg = 10) => new THREE.CylinderGeometry(r, r, w, seg).rotateX(Math.PI / 2).translate(x, y, z);
const cylG = (r, h, x, y, z, seg = 8) => new THREE.CylinderGeometry(r, r, h, seg).translate(x, y + h / 2, z);
// Casco com proa afilada (+x), extrudado para cima a partir de y = 0.
function hullG(len, wid, h, bow = 0.3, y = 0) {
  const s = new THREE.Shape(), L = len / 2, W = wid / 2, b = len * bow;
  s.moveTo(-L, -W * 0.9); s.lineTo(L - b, -W); s.quadraticCurveTo(L - b * 0.15, -W * 0.95, L, 0); s.quadraticCurveTo(L - b * 0.15, W * 0.95, L - b, W); s.lineTo(-L, W * 0.9); s.closePath();
  return new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 5 }).rotateX(-Math.PI / 2).translate(0, y, 0);
}

// Carro de passeio (0.016 de comprimento, frente em +x).
const carParts = () => [
  [bx(0.0162, 0.0013, 0.0084, 0, 0.0012, 0), '#2a2f38'],
  [bx(0.016, 0.0036, 0.0082, 0, 0.0022, 0), '#ffffff'],
  [bx(0.0094, 0.0031, 0.0074, -0.0012, 0.0058, 0), GLASS],
  [bx(0.0016, 0.0031, 0.0076, -0.0012, 0.0058, 0), '#ffffff'],
  [bx(0.0084, 0.0009, 0.0076, -0.0012, 0.0087, 0), '#ffffff'],
  ...[-1, 1].flatMap(s => [
    [bx(0.0006, 0.0011, 0.0022, 0.008, 0.0038, s * 0.0026), '#fff6c8'],
    [bx(0.0006, 0.0011, 0.002, -0.008, 0.0038, s * 0.0027), '#e8452f'],
    [wheelG(0.0019, 0.0015, 0.0051, 0.0019, s * 0.0037), TIRE], [wheelG(0.0019, 0.0015, -0.0051, 0.0019, s * 0.0037), TIRE],
    [wheelG(0.0009, 0.0016, 0.0051, 0.0019, s * 0.0037, 6), '#c9ced6'], [wheelG(0.0009, 0.0016, -0.0051, 0.0019, s * 0.0037, 6), '#c9ced6']])
];
// Ônibus (urbano ou escolar): faixa de janelas, para-brisa, letreiro, teto claro e rodas com calota.
const busParts = (L, W, H, body) => [
  [bx(L, H * 0.78, W, 0, H * 0.14, 0), body],
  [bx(L * 0.9, H * 0.3, W + 0.0004, -L * 0.03, H * 0.5, 0), GLASS],
  [bx(0.0006, H * 0.42, W * 0.86, L / 2, H * 0.4, 0), GLASS],
  [bx(0.0006, H * 0.1, W * 0.6, L / 2 + 0.0002, H * 0.84, 0), '#ffb347'],
  [bx(L * 0.98, H * 0.08, W * 0.96, 0, H * 0.92, 0), '#e9eef5'],
  [bx(L * 0.99, H * 0.06, W + 0.0003, 0, H * 0.3, 0), '#2a3446'],
  ...[-1, 1].flatMap(s => [
    [bx(0.0006, H * 0.1, W * 0.18, L / 2, H * 0.24, s * W * 0.32), '#fff6c8'],
    [wheelG(H * 0.17, W * 0.16, L * 0.32, H * 0.17, s * W * 0.42), TIRE], [wheelG(H * 0.17, W * 0.16, -L * 0.3, H * 0.17, s * W * 0.42), TIRE],
    [wheelG(H * 0.08, W * 0.17, L * 0.32, H * 0.17, s * W * 0.42, 6), '#c9ced6'], [wheelG(H * 0.08, W * 0.17, -L * 0.3, H * 0.17, s * W * 0.42, 6), '#c9ced6']])
];
let carGeoC, busGeoC;
const CAR_COLS = VEHICLES.cars, BUS_COLS = VEHICLES.buses;
// Frota instanciada (carros e ônibus) para o trânsito: cada veículo da lista ganha malha e índice.
function fleet(g, list) {
  carGeoC ??= paintGeo(carParts()); busGeoC ??= paintGeo(busParts(0.028, 0.0095, 0.011, '#ffffff'));
  const nb = list.filter(v => v.bus).length;
  const mk = (geo, n) => { const m = new THREE.InstancedMesh(geo, vehMat(), Math.max(1, n)); m.count = n; m.frustumCulled = false; m.userData.vehicle = true; m.userData.keep = true; m.userData.detail = true; g.add(m); return m; };
  const cars = mk(carGeoC, list.length - nb), buses = mk(busGeoC, nb);
  let ic = 0, ib = 0;
  list.forEach(v => { v.mesh = v.bus ? buses : cars; v.idx = v.bus ? ib++ : ic++; v.mesh.setColorAt(v.idx, new THREE.Color(v.bus ? BUS_COLS[v.idx % BUS_COLS.length] : CAR_COLS[v.idx % CAR_COLS.length])); });
  const o = new THREE.Object3D();
  return {
    host: cars,
    place(v, x, y, z, ry) { o.position.set(x, y, z); o.rotation.set(0, ry, 0); o.updateMatrix(); v.mesh.setMatrixAt(v.idx, o.matrix); },
    done() { cars.instanceMatrix.needsUpdate = buses.instanceMatrix.needsUpdate = true; }
  };
}

// Locomotiva diesel de carga pesada: truques com rodas, estrado, tanque, capô longo com ventiladores,
// cabine com para-brisa, faixa clara, corrimãos, engates e uma placa lisa no capô (lugar para marca).
function locoGeo(color) {
  const P = [];
  for (const x of [-0.034, 0.034]) {
    P.push([bx(0.034, 0.006, 0.038, x, 0.003, 0), STEEL_D]);
    for (const dx of [-0.011, 0, 0.011]) for (const s of [-1, 1]) P.push([wheelG(0.0045, 0.003, x + dx, 0.0045, s * 0.0215), TIRE]);
  }
  P.push([bx(0.03, 0.008, 0.034, 0, 0.003, 0), '#262b33'],
    [bx(0.118, 0.005, 0.05, 0, 0.009, 0), STEEL_D],
    [bx(0.072, 0.03, 0.036, -0.019, 0.014, 0), color],
    [bx(0.0725, 0.004, 0.0366, -0.019, 0.026, 0), '#f4f4f4'],
    [bx(0.026, 0.012, 0.0368, -0.03, 0.03, 0), '#f4f4f4'],
    [bx(0.026, 0.038, 0.05, 0.035, 0.014, 0), color],
    [bx(0.0262, 0.004, 0.0504, 0.035, 0.026, 0), '#f4f4f4'],
    [bx(0.012, 0.018, 0.042, 0.054, 0.014, 0), color],
    [bx(0.0122, 0.004, 0.0424, 0.054, 0.026, 0), '#f4f4f4'],
    [bx(0.0012, 0.011, 0.044, 0.0482, 0.038, 0), GLASS],
    [bx(0.018, 0.009, 0.0506, 0.034, 0.039, 0), GLASS],
    [bx(0.029, 0.003, 0.053, 0.035, 0.052, 0), '#2a2f38'],
    [cylG(0.0075, 0.002, -0.046, 0.044, 0, 12), '#2a2f38'], [cylG(0.0075, 0.002, -0.029, 0.044, 0, 12), '#2a2f38'],
    [bx(0.006, 0.007, 0.008, -0.006, 0.044, 0), '#2a2f38'],
    [bx(0.006, 0.004, 0.008, -0.061, 0.009, 0), STEEL_D], [bx(0.006, 0.004, 0.008, 0.061, 0.009, 0), STEEL_D],
    [bx(0.004, 0.006, 0.046, 0.0605, 0.006, 0), '#ffc56b']);
  for (const s of [-1, 1]) {
    P.push([bx(0.074, 0.0012, 0.0012, -0.019, 0.025, s * 0.0235), '#f4f4f4']);
    for (const x of [-0.054, -0.036, -0.018, 0, 0.016]) P.push([bx(0.0012, 0.011, 0.0012, x, 0.014, s * 0.0235), '#f4f4f4']);
  }
  return paintGeo(P);
}
// Vagão de minério (gôndola aberta): truques, estrado, paredes com nervuras, borda reforçada e engates.
function wagonGeo(body, loaded) {
  const P = [], rib = '#59616c';
  for (const x of [-0.028, 0.028]) {
    P.push([bx(0.022, 0.006, 0.038, x, 0.003, 0), STEEL_D]);
    for (const dx of [-0.007, 0.007]) for (const s of [-1, 1]) P.push([wheelG(0.0045, 0.003, x + dx, 0.0045, s * 0.0215), TIRE]);
  }
  P.push([bx(0.084, 0.004, 0.044, 0, 0.009, 0), STEEL_D],
    [bx(0.074, 0.003, 0.038, 0, 0.013, 0), '#3b2a24'],
    [bx(0.003, 0.027, 0.041, 0.0385, 0.013, 0), body], [bx(0.003, 0.027, 0.041, -0.0385, 0.013, 0), body],
    [bx(0.006, 0.004, 0.008, 0.045, 0.009, 0), STEEL_D], [bx(0.006, 0.004, 0.008, -0.045, 0.009, 0), STEEL_D]);
  for (const s of [-1, 1]) {
    P.push([bx(0.08, 0.027, 0.003, 0, 0.013, s * 0.0205), body], [bx(0.082, 0.0022, 0.0042, 0, 0.0385, s * 0.0205), rib]);
    for (let x = -0.03; x <= 0.031; x += 0.015) P.push([bx(0.0022, 0.025, 0.0012, x, 0.014, s * 0.0226), rib]);
  }
  if (loaded) P.push(...heapParts(0.016));
  return paintGeo(P);
}
const heapParts = (y = 0) => [[bx(0.074, 0.018, 0.038, 0, y, 0), C.ore], [new THREE.SphereGeometry(0.03, 10, 5, 0, TAU, 0, Math.PI / 2).scale(1.22, 0.42, 0.6).translate(0, y + 0.018, 0), '#9a4a33']];
// Faróis acesos da locomotiva (malha separada, com brilho).
function locoLights(l) {
  for (const [x, y, z] of [[0.0605, 0.024, 0.012], [0.0605, 0.024, -0.012], [0.049, 0.054, 0]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0026, 8, 6), lightMat()); m.position.set(x, y, z); l.add(m); }
  return l;
}
const locoMesh = color => { const l = new THREE.Group(); l.add(new THREE.Mesh(locoGeo(color), vehMat())); return locoLights(l); };
// Vagão com o minério numa malha à parte (o virador esvazia e enche de novo).
function wagonMesh(loaded, body = '#6d7682') {
  const c = new THREE.Group(); c.add(new THREE.Mesh(wagonGeo(body, false), vehMat()));
  if (loaded) { const heap = new THREE.Mesh(paintGeo(heapParts()), vehMat()); heap.position.y = 0.016; c.add(heap); c.userData.heap = heap; }
  return c;
}

// Graneleiro: casco com proa, fundo vermelho, linha-d'água branca, convés, escotilhas com minério,
// guindastes de convés, castelo de proa, superestrutura de popa com passadiço, chaminé e botes.
function carrierGeo(hull = '#1f3550', bottom = '#b8392b', funnel = C.coral) {
  const P = [[hullG(0.318, 0.056, 0.016, 0.22, -0.002), bottom], [hullG(0.322, 0.06, 0.022, 0.22, 0.014), hull], [hullG(0.3225, 0.0604, 0.002, 0.22, 0.0135), '#f4f4f4'],
    [hullG(0.31, 0.054, 0.002, 0.22, 0.036), '#6f7f73'], [bx(0.03, 0.007, 0.05, 0.128, 0.036, 0), hull], [cylG(0.0016, 0.03, 0.135, 0.043, 0), '#f4f4f4']];
  for (let i = 0; i < 5; i++) { const x = -0.075 + i * 0.044; P.push([bx(0.034, 0.008, 0.042, x, 0.038, 0), '#3d4652'], [bx(0.029, 0.002, 0.036, x, 0.0455, 0), C.ore]); }
  for (let i = 0; i < 3; i++) { const x = -0.053 + i * 0.088; P.push([cylG(0.0028, 0.032, x, 0.038, 0), '#ffc56b'], [bx(0.042, 0.003, 0.003, x + 0.019, 0.066, 0), '#ffc56b'], [cylG(0.0006, 0.022, x + 0.038, 0.045, 0, 4), '#2a2f38']); }
  P.push([bx(0.046, 0.017, 0.05, -0.122, 0.038, 0), '#f4f4f4'], [bx(0.0465, 0.003, 0.0504, -0.122, 0.047, 0), GLASS],
    [bx(0.038, 0.014, 0.046, -0.124, 0.055, 0), '#f4f4f4'], [bx(0.0385, 0.003, 0.0464, -0.124, 0.061, 0), GLASS],
    [bx(0.03, 0.011, 0.064, -0.124, 0.069, 0), '#f4f4f4'], [bx(0.0305, 0.004, 0.0644, -0.124, 0.073, 0), GLASS], [bx(0.032, 0.002, 0.066, -0.124, 0.08, 0), '#c9ced6'],
    [cylG(0.0012, 0.02, -0.124, 0.082, 0, 4), '#f4f4f4'],
    [bx(0.016, 0.026, 0.016, -0.143, 0.05, 0), funnel], [bx(0.0165, 0.004, 0.0165, -0.143, 0.076, 0), '#1a1d24'],
    [bx(0.012, 0.006, 0.007, -0.11, 0.055, 0.027), '#ff7a1a'], [bx(0.012, 0.006, 0.007, -0.11, 0.055, -0.027), '#ff7a1a']);
  return paintGeo(P);
}
// Rebocador: casco vermelho com defensas pretas, timoneira em dois níveis, chaminé e mastro.
function tugGeo() {
  return paintGeo([[hullG(0.031, 0.0125, 0.005, 0.35, -0.002), '#7a1f1a'], [hullG(0.033, 0.014, 0.007, 0.35, 0.003), '#e8452f'],
    [hullG(0.0336, 0.0146, 0.0018, 0.35, 0.0035), TIRE], [hullG(0.03, 0.012, 0.001, 0.35, 0.0098), '#c9c2b5'],
    [bx(0.012, 0.008, 0.0105, 0.002, 0.0105, 0), '#f4f4f4'], [bx(0.009, 0.005, 0.0095, 0.003, 0.0185, 0), '#f4f4f4'],
    [bx(0.0092, 0.002, 0.0097, 0.003, 0.0198, 0), GLASS], [bx(0.0124, 0.002, 0.0107, 0.002, 0.0145, 0), GLASS],
    [bx(0.004, 0.007, 0.004, -0.006, 0.0175, 0), '#ffc56b'], [bx(0.0042, 0.0015, 0.0042, -0.006, 0.0245, 0), TIRE],
    [cylG(0.0007, 0.01, 0.004, 0.0235, 0, 4), '#f4f4f4'], [bx(0.003, 0.003, 0.003, -0.012, 0.0105, 0), TIRE]]);
}
// Veleiro: casco branco com faixa colorida, convés de madeira, mastro, vela grande e bujarrona.
function sailboat(color) {
  const b = new THREE.Group();
  b.add(new THREE.Mesh(paintGeo([[hullG(0.04, 0.013, 0.007, 0.4, -0.003), '#f4f4f4'], [hullG(0.0404, 0.0134, 0.0015, 0.4, 0.0015), color],
    [hullG(0.037, 0.011, 0.001, 0.4, 0.004), '#c79a6b'], [bx(0.01, 0.003, 0.007, -0.006, 0.005, 0), '#f4f4f4'], [cylG(0.0008, 0.045, 0.004, 0.004, 0, 5), '#c9ced6']]), vehMat()));
  const sailGeo = (pts) => { const s = new THREE.Shape(); s.moveTo(...pts[0]); pts.slice(1).forEach(p => s.lineTo(...p)); return new THREE.ShapeGeometry(s); };
  const sm = mat(color === '#ffffff' ? '#f4f4f4' : '#ffffff', { side: THREE.DoubleSide, roughness: 0.9 }), cm = mat(color, { side: THREE.DoubleSide, roughness: 0.9 });
  const main = new THREE.Mesh(sailGeo([[0.0035, 0.008], [0.0035, 0.048], [-0.016, 0.008]]), cm); b.add(main);
  const jib = new THREE.Mesh(sailGeo([[0.0045, 0.044], [0.019, 0.006], [0.0045, 0.008]]), sm); b.add(jib);
  return b;
}
// 4x4 de passeio nas dunas: carroceria com para-lama, santantônio, bancos, estepe e rodas grandes.
function jeepGeo() {
  const P = [[bx(0.03, 0.007, 0.016, 0, 0.004, 0), '#3a8f62'], [bx(0.011, 0.003, 0.0162, 0.0095, 0.011, 0), '#3a8f62'],
    [bx(0.0012, 0.007, 0.015, 0.004, 0.011, 0), GLASS], [bx(0.006, 0.004, 0.006, -0.002, 0.011, 0.004), '#2a2f38'], [bx(0.006, 0.004, 0.006, -0.002, 0.011, -0.004), '#2a2f38'],
    [bx(0.0012, 0.012, 0.0012, -0.008, 0.011, 0.007), '#f4f4f4'], [bx(0.0012, 0.012, 0.0012, -0.008, 0.011, -0.007), '#f4f4f4'], [bx(0.0012, 0.0012, 0.015, -0.008, 0.0225, 0), '#f4f4f4'],
    [wheelG(0.004, 0.003, -0.0165, 0.01, 0), TIRE], [bx(0.0008, 0.002, 0.0035, 0.015, 0.008, 0.005), '#fff6c8'], [bx(0.0008, 0.002, 0.0035, 0.015, 0.008, -0.005), '#fff6c8']];
  for (const x of [0.0095, -0.0095]) for (const s of [-1, 1]) P.push([wheelG(0.005, 0.004, x, 0.005, s * 0.0085), TIRE], [wheelG(0.0024, 0.0042, x, 0.005, s * 0.0085, 6), '#c9ced6']);
  return paintGeo(P);
}

function traffic(g, lanes, perLane = 4) {
  const list = []; lanes.forEach((l, li) => { for (let k = 0; k < perLane; k++) list.push({ l, li, k, bus: k === 1 && li % 2 === 0 }); });
  const f = fleet(g, list), a = new THREE.Vector3(), b = new THREE.Vector3();
  f.host.userData.anim = t => {
    list.forEach(v => {
      const [p0, p1, lift, speed] = v.l; a.set(...p0); b.set(...p1);
      const u = (t * speed / a.distanceTo(b) + v.k / perLane + v.li * 0.13) % 1, x = mix(a.x, b.x, u), z = mix(a.z, b.z, u);
      f.place(v, x, sag(x, z) + lift, z, Math.atan2(-(b.z - a.z), b.x - a.x));
    });
    f.done();
  };
  animated.push(f.host);
}
// Trânsito num circuito fechado: faixas de ida e volta (deslocadas para os lados da rua).
function trafficLoop(g, pts, lanes, lift = 0) {
  const path = loopPath(pts), list = [];
  lanes.forEach(l => { for (let k = 0; k < l.n; k++) list.push({ ...l, s0: k / l.n * path.L, bus: l.bus !== false && k % 4 === 2 }); });
  const f = fleet(g, list);
  f.host.userData.anim = t => {
    list.forEach(c => {
      const q = path.at(c.s0 + c.dir * t * c.speed), x = q.x - q.tz * c.off * c.dir, z = q.z + q.tx * c.off * c.dir;
      f.place(c, x, sag(x, z) + (typeof lift === 'function' ? lift(x, z) : lift), z, Math.atan2(-q.tz * c.dir, q.tx * c.dir));
    });
    f.done();
  };
  animated.push(f.host);
}

export { busParts, bx, carrierGeo, jeepGeo, locoMesh, paintGeo, sailboat, trafficLoop, tugGeo, vehMat, wagonGeo, wagonMesh };
