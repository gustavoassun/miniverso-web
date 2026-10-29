import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { R, TAU, clamp, mix, smooth, smoother } from '../../core/math.js';
import { small } from '../../core/quality.js';
import { box, cityFloor, compact, cyl, draped, hipRoof, liftBox, mat, road, roundedPad, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { confetti, lamp, lampiao, palm, tree, waveFlag, zebra } from '../props.js';
import { animated, fxT, zoneFx } from '../runtime.js';
import { boiPanelTex, bordadoTex, facadeMat, holoMat, maranhaoTex, saiaTex, stoneTex } from '../textures.js';
import { sailboat, trafficLoop } from '../vehicles.js';
import { ZONES } from '../zones.js';
import { planet } from '../planet.js';
import { railBasis, railPt } from '../rail.js';
import { PR, RAIL_R, terrain } from '../terrain.js';

// Centro Histórico de São Luís em miniatura, organizado em quadras (inspirado no mapa real):
// cidade alta na colina (Rua Portugal com casarões, Catedral da Sé, Praça Benedito Leite com o chafariz,
// Praça Dom Pedro II e o Palácio dos Leões virado para o mar, Rua da Estrela com casarões de azulejo, mirante
// com lampiões e a ladeira coberta de bandeirolas); cidade baixa dentro de um circuito de mão dupla (quadra da
// Praia Grande, igreja, feira, e a Praça Maria Aragão com o palco do boi e a plateia); calçadão da Beira-Mar,
// cais com canoas e veleiros no Rio Anil e a Ponte do São Francisco até o bairro novo do outro lado.
const BOI = ['#e8452f', '#2f9bff', '#3ee07a', '#ffd23f', '#ff4fd8', '#ffffff', '#ff8a2a'];
const DUR = 14.5;                                                                             // duração da dança do boi (s)

function buildCentro(g, zi) {
  // Alturas da cidade baixa acima do terreno (o relevo do planeta fica ~0.004 acima de sag):
  // piso geral 0.0075, calçadas e quadras FL..FL+0.002, asfalto até FL+0.003.
  const T = 0.03, FL = 0.0085, top = (x, z) => sag(x, z) + T, low = (x, z) => sag(x, z) + FL + 0.002;
  cityFloor(g, 0.78, 0.0075, [0.249, 0.452]);
  const facades = [facadeMat('#2f6fb8', '#d8e8ff', '#1f4a36'), facadeMat('#f2c14e', null, '#2c5b4a'), facadeMat('#f6dccd', '#3f7fc4', '#6a3b28'), facadeMat('#a5dccb', null, '#3a2a22'), facadeMat('#eef4fb', '#2f6fb8', '#1f4a36'), facadeMat('#e98a6b', null, '#2c3e5b')];
  const azulejos = [facadeMat('#e9f1fb', '#2f6fb8', '#1f4a36'), facadeMat('#2f6fb8', '#d8e8ff', '#2c5b4a'), facadeMat('#f2c14e', '#c8643f', '#1f4a36'), facadeMat('#d9efe6', '#3aa58c', '#3a2a22'), facadeMat('#f6dccd', '#c8643f', '#6a3b28')];
  const casarao = (x, z, w, d, h, k, yAt, list = facades) => {
    const y = yAt(x, z), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), list[k % list.length]); m.position.set(x, y + h / 2, z); g.add(m);
    const roof = hipRoof(w + 0.008, d + 0.008, 0.02, C.terracotta); roof.position.set(x, y + h + 0.01, z); g.add(roof);
  };
  // Teto de bandeirolas de São João: fios atravessando a rua, cada bandeirinha uma instância (uma só chamada de desenho).
  const flagCols = ['#e2207a', '#2fd0e0', '#ff8a2a', '#ffd23f', '#ffffff', '#9b5de5', '#3ee07a'].map(h => new THREE.Color(h));
  const canopy = (x0, x1, z0, z1, yAt, step = 0.012) => {
    const spots = [];
    for (let z = z0; z <= z1 + 1e-9; z += step) for (let x = x0; x <= x1 + 1e-9; x += 0.0055) spots.push([x, z, (x - x0) / (x1 - x0)]);
    const geo = new THREE.PlaneGeometry(0.0048, 0.006); geo.translate(0, -0.003, 0);
    const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), spots.length), o = new THREE.Object3D();
    spots.forEach(([x, z, u], i) => {
      o.position.set(x + (R() - 0.5) * 0.002, yAt(x, z) - Math.sin(u * Math.PI) * 0.006, z + (R() - 0.5) * 0.002);
      o.rotation.set((R() - 0.5) * 0.6, (R() - 0.5) * 0.7, (R() - 0.5) * 0.3); o.updateMatrix(); m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, flagCols[Math.floor(u * 3 + (z - z0) / (step * 2)) % flagCols.length]);
    });
    g.add(m); return m;
  };
  // Peça ao longo de z com base e topo variando (ladeira, muro de arrimo, gramado e corrimão).
  const ramp = (x, w, z0, z1, bot, topF, material) => {
    const geo = new THREE.BoxGeometry(w, 1, z1 - z0, 1, 1, Math.max(2, Math.round((z1 - z0) / 0.01))), p = geo.attributes.position, cz = (z0 + z1) / 2;
    for (let i = 0; i < p.count; i++) { const zz = p.getZ(i) + cz; p.setY(i, sag(p.getX(i) + x, zz) + (p.getY(i) > 0 ? topF(zz) : bot(zz))); }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, material); m.position.set(x, 0, cz); g.add(m); return m;
  };
  const roundTree = (x, z, s, y) => {
    cyl(0.004 * s, 0.03 * s, C.trunk, x, y, z, g, 5);
    for (const [dx, dy, dz, r] of [[0, 0.045, 0, 0.022], [0.012, 0.04, 0.007, 0.016], [-0.011, 0.042, -0.007, 0.017], [0.003, 0.056, -0.009, 0.015]]) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 0), mat('#2f7d4f')); b.position.set(x + dx * s, y + dy * s, z + dz * s); g.add(b);
    }
  };
  const parked = (x, z, color, y) => {
    const c = new THREE.Group();
    box(0.024, 0.004, 0.012, '#1a1d24', 0, 0, 0, c); box(0.026, 0.006, 0.013, color, 0, 0.003, 0, c); box(0.013, 0.005, 0.011, '#1d2b3d', -0.002, 0.009, 0, c);
    c.position.set(x, y, z); c.rotation.y = Math.PI / 2; g.add(c);
  };
  const ppl = [C.coral, C.amber, C.teal, C.violet, C.white, '#e8452f', '#1e4488'];

  // ── Cidade alta: colina de pedra (núcleo, extensão norte da Praça Benedito Leite e extensão oeste da Rua da Estrela).
  const hill = (x0, x1, z0, z1) => {
    const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const geo = new THREE.BoxGeometry(w, T, d, Math.ceil(w / 0.02), 1, Math.ceil(d / 0.02)), p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + sag(p.getX(i) + cx, p.getZ(i) + cz));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: stoneTex('#b3a690', '#cdc1aa', '#a08f78', w / 0.072, d / 0.074), roughness: 0.95 }));
    m.position.set(cx, T / 2, cz); g.add(m);
  };
  hill(-0.44, -0.08, -0.44, 0.3); hill(-0.44, -0.08, -0.62, -0.44); hill(-0.62, -0.44, -0.44, 0.24);
  // Rua Portugal (ao longo de z, larga o bastante para os lampiões não encostarem nos casarões) e rua transversal.
  draped(0.06, 0.002, 0.72, '#8f877c', -0.27, -0.07, g, T);
  draped(0.39, 0.002, 0.03, '#8f877c', -0.285, -0.14, g, T);
  [-0.33, -0.27, -0.21, -0.09, -0.03, 0.03, 0.09, 0.15, 0.21, 0.27].forEach((z, i) => casarao(-0.345, z, 0.07, 0.056, 0.07 + (i % 3) * 0.015, i, top));
  [-0.09, -0.03, 0.03, 0.09].forEach((z, i) => casarao(-0.195, z, 0.07, 0.056, 0.075 + (i % 2) * 0.015, i + 3, top));
  for (const z of [-0.32, -0.22, -0.03, 0.08, 0.19]) tree(g, -0.41, z, 0.8, undefined, top(-0.41, z));
  // Lampiões nas calçadas, a 1,4 cm das fachadas e abaixo do teto de bandeirolas.
  for (const z of [-0.36, -0.24, -0.06, 0.06, 0.18]) for (const x of [-0.296, -0.244]) lampiao(g, x, z, top(x, z), 0.04);
  canopy(-0.297, -0.243, -0.12, 0.26, (x, z) => top(x, z) + 0.072);
  // Catedral da Sé no topo da Rua Portugal.
  const sz0 = -0.41, sy0 = top(-0.27, sz0);
  box(0.1, 0.075, 0.045, C.white, -0.27, sy0, sz0, g);
  for (const x of [-0.305, -0.235]) { box(0.025, 0.12, 0.025, C.white, x, sy0, sz0 + 0.012, g); const sp = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.035, 4), mat(C.terracotta)); sp.rotation.y = Math.PI / 4; sp.position.set(x, sy0 + 0.137, sz0 + 0.012); g.add(sp); }
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.005, 3), mat(C.white)); gable.rotation.x = -Math.PI / 2; gable.position.set(-0.27, sy0 + 0.093, sz0 + 0.02); g.add(gable);
  box(0.02, 0.035, 0.003, '#5a3a2a', -0.27, sy0, sz0 + 0.023, g);
  // Praça Benedito Leite, atrás da Sé: pedra portuguesa, chafariz de água verde com estátua dourada e jatos,
  // gramado em volta, palmeiras, árvores copadas, lampiões, bancos, casarões e carros estacionados.
  const BX = -0.255, BZ = -0.535, bTop = (x, z) => sag(x, z) + T + 0.0025;
  roundedPad(g, BX, BZ, 0.115, 0.07, 0.02, T + 0.0025, (x, w, h) => {
    x.fillStyle = '#efe6d6'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#3a3a44'; x.lineWidth = 2;
    for (let r = 10; r < h; r += 16) { x.beginPath(); for (let i = 0; i <= w; i += 4) x.lineTo(i, r + Math.sin(i / w * TAU * 3) * 4); x.stroke(); }
    x.strokeStyle = '#c9a77a'; x.lineWidth = 4; x.strokeRect(3, 3, w - 6, h - 6);
  });
  const fy = bTop(BX, BZ);
  cyl(0.054, 0.003, '#4f9b5a', BX, fy, BZ, g, 28);
  cyl(0.044, 0.009, '#e9e1d2', BX, fy, BZ, g, 28);
  const lago = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.002, 28), mat('#2fb8a0', { emissive: '#0f8f7a', emissiveIntensity: 0.35 })); lago.position.set(BX, fy + 0.008, BZ); g.add(lago);
  cyl(0.007, 0.012, '#e9e1d2', BX, fy, BZ, g, 10);
  const ouro = mat('#d4a640', { metalness: 0.6, roughness: 0.35 });
  const estatua = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.014, 6), ouro); estatua.position.set(BX, fy + 0.019, BZ); g.add(estatua);
  const cabecaEst = new THREE.Mesh(new THREE.SphereGeometry(0.0028, 8, 6), ouro); cabecaEst.position.set(BX, fy + 0.028, BZ); g.add(cabecaEst);
  const jatoMat = mat('#bff3ff', { emissive: '#7fe9ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 });
  const jatos = new THREE.Group(); jatos.position.set(BX, fy + 0.009, BZ);
  for (let k = 0; k < 8; k++) {
    const a = k / 8 * TAU, j = new THREE.Mesh(new THREE.CylinderGeometry(0.0006, 0.0014, 0.022, 5), jatoMat); j.geometry.translate(0, 0.011, 0);
    j.position.set(Math.cos(a) * 0.03, 0, Math.sin(a) * 0.03); j.rotation.set(-Math.sin(a) * 0.35, 0, Math.cos(a) * 0.35); jatos.add(j);
  }
  jatos.userData.anim = t => jatos.children.forEach((j, k) => { j.scale.y = 0.75 + 0.3 * Math.sin(t * 3 + k); });
  g.add(jatos); animated.push(jatos);
  for (const s of [-1, 1]) box(0.006, 0.005, 0.026, '#a07a5a', BX + s * 0.062, bTop(BX + s * 0.062, BZ), BZ, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { palm(g, BX + sx * 0.072, BZ + sz * 0.032, 0.09, bTop(BX + sx * 0.072, BZ + sz * 0.032)); lampiao(g, BX + sx * 0.105, BZ + sz * 0.06, bTop(BX + sx * 0.105, BZ + sz * 0.06)); lampiao(g, BX + sx * 0.04, BZ + sz * 0.062, bTop(BX + sx * 0.04, BZ + sz * 0.062)); }
  for (const s of [-1, 1]) roundTree(BX + s * 0.103, BZ, 1, bTop(BX + s * 0.103, BZ));
  [-0.585, -0.525, -0.47].forEach((z, i) => casarao(-0.41, z, 0.05, 0.054, 0.07 + (i % 2) * 0.014, i + 2, top));
  draped(0.03, 0.002, 0.17, '#8f877c', -0.11, -0.53, g, T);
  ['#e8452f', C.white, '#2a3446', C.amber, C.tile].forEach((c, i) => { const z = -0.592 + i * 0.03; parked(-0.112, z, c, top(-0.112, z) + 0.002); });
  // Rua da Estrela (oeste): casarões de azulejo, lampiões e mais bandeirolas.
  const EX = -0.5;
  draped(0.04, 0.002, 0.66, '#8f877c', EX, -0.1, g, T);
  for (let i = 0; i < 11; i++) casarao(-0.565, -0.39 + i * 0.057, 0.05, 0.054, 0.065 + (i % 3) * 0.012, i, top, azulejos);
  for (let z = -0.38; z <= 0.2; z += 0.1) lampiao(g, -0.474, z, top(-0.474, z));
  canopy(EX - 0.017, EX + 0.017, -0.36, 0.2, (x, z) => top(x, z) + 0.07, 0.014);
  // Praça Dom Pedro II e Palácio dos Leões (fachada para a praça, fundos para o mar, afastado do mirante).
  draped(0.075, 0.002, 0.18, '#e9e1d2', -0.207, -0.27, g, T);
  for (const z of [-0.33, -0.27, -0.21]) tree(g, -0.225, z, 0.7, '#2f9b7a', top(-0.225, z));
  const PAX = -0.14;
  const palace = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.17), facadeMat('#f4f1ea', null, '#4a6a8a')); palace.position.set(PAX, top(PAX, -0.28) + 0.0275, -0.28); g.add(palace);
  const proof = hipRoof(0.073, 0.178, 0.022, C.terracotta); proof.position.set(PAX, top(PAX, -0.28) + 0.055 + 0.011, -0.28); g.add(proof);
  box(0.012, 0.06, 0.05, C.white, PAX - 0.037, top(PAX - 0.037, -0.28), -0.28, g);
  for (const z of [-0.31, -0.25]) {                                                         // leões na entrada
    const ly = top(-0.195, z); box(0.012, 0.01, 0.012, '#cbbfa8', -0.195, ly, z, g);
    box(0.012, 0.008, 0.007, '#d8c9a8', -0.195, ly + 0.01, z, g);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), mat('#d8c9a8')); head.position.set(-0.201, ly + 0.022, z); g.add(head);
  }
  // Mirante na beira da colina: balaustrada e lampiões (com vão para a escadaria).
  draped(0.15, 0.002, 0.12, '#e9e1d2', -0.165, 0.22, g, T);
  for (let z = -0.42; z <= 0.29; z += 0.03) if (z < 0.17 || z > 0.23) box(0.003, 0.012, 0.024, C.white, -0.085, top(-0.085, z), z, g);
  for (let z = -0.4; z <= 0.29; z += 0.1) if (z < 0.16 || z > 0.24) lampiao(g, -0.094, z, top(-0.094, z));
  // Escadaria do mirante até a calçada da cidade baixa.
  for (let i = 0; i < 6; i++) { const x = -0.078 + i * 0.006; box(0.006, T * (1 - i / 6), 0.045, '#e8dfcf', x, sag(x, 0.2), 0.2, g); }
  // Ladeira de pedra coberta de bandeirolas descendo da colina: casarões de um lado; do outro, muro de arrimo
  // com corrimão e um gramado com lampiões. Termina numa rua de pedra com mais casarões.
  const LX = -0.2, LZ0 = 0.298, LZ1 = 0.515, lad = z => mix(T + 0.002, FL + 0.002, clamp((z - LZ0) / (LZ1 - LZ0))), onLad = (x, z) => sag(x, z) + lad(z);
  ramp(LX, 0.054, LZ0, LZ1, z => lad(z) - 0.006, lad, new THREE.MeshStandardMaterial({ map: stoneTex('#8f877c', '#a39a8c', '#7a7268', 2, 8), roughness: 0.95 }));
  ramp(LX - 0.029, 0.004, LZ0, LZ1, () => FL, z => lad(z) + 0.003, mat('#cbbfa8'));
  ramp(LX + 0.029, 0.005, LZ0, LZ1, () => FL, z => lad(z) + 0.008, mat('#e6dccb'));
  ramp(LX + 0.031, 0.0015, LZ0, LZ1, z => lad(z) + 0.017, z => lad(z) + 0.019, mat('#c3cad3'));
  for (let z = LZ0 + 0.01; z < LZ1; z += 0.02) box(0.0015, 0.011, 0.0015, '#c3cad3', LX + 0.031, onLad(LX + 0.031, z) + 0.008, z, g);
  ramp(-0.13, 0.07, LZ0, LZ1, () => FL, z => lad(z) + 0.006, mat('#5aa85a'));
  for (const z of [0.33, 0.41, 0.48]) lampiao(g, -0.158, z, onLad(-0.158, z) + 0.006);
  tree(g, -0.115, 0.42, 0.75, '#2f9b7a', onLad(-0.115, 0.42) + 0.006);
  [0.335, 0.395, 0.455].forEach((z, i) => casarao(-0.26, z, 0.06, 0.056, 0.085, i + 1, low));
  canopy(LX - 0.025, LX + 0.025, LZ0 + 0.006, LZ1 - 0.004, (x, z) => onLad(x, z) + 0.055, 0.011);
  draped(0.31, 0.002, 0.04, '#a9a297', -0.165, 0.535, g, FL + 0.0004);
  [-0.28, -0.22, -0.16, -0.1].forEach((x, i) => casarao(x, 0.585, 0.055, 0.05, 0.06 + (i % 2) * 0.014, i + 2, low));

  // ── Cidade baixa: circuito de mão dupla em volta das quadras (Av. Beira-Mar a leste).
  const RX0 = -0.03, RX1 = 0.2, RZ0 = -0.42, RZ1 = 0.38, loop = [[RX0, RZ0], [RX1, RZ0], [RX1, RZ1], [RX0, RZ1]];
  draped(0.024, 0.002, 1.2, '#e6ddcc', -0.058, -0.02, g, FL);                             // calçada ao pé da colina
  draped(RX1 - RX0 - 0.026, 0.002, RZ1 - RZ0 - 0.026, '#e3dbcc', (RX0 + RX1) / 2, (RZ0 + RZ1) / 2, g, FL);
  loop.forEach((a, i) => { const b = loop[(i + 1) % 4]; road(g, a[0], a[1], b[0], b[1], 0.026, FL); });
  zebra(g, RX0, 0.2, false, 5, FL); zebra(g, RX1, 0.2, false, 5, FL); zebra(g, RX1, -0.2, false, 5, FL); zebra(g, RX0, -0.2, false, 5, FL);
  trafficLoop(g, loop, [{ off: 0.0065, dir: 1, n: 7, speed: 0.05 }, { off: 0.0065, dir: -1, n: 6, speed: 0.045 }], FL + 0.003);
  // Quadra da Praia Grande: duas fileiras de casarões com um beco de pedestres no meio.
  for (let i = 0; i < 6; i++) { const z = -0.36 + i * 0.06; casarao(0.035, z, 0.05, 0.054, 0.06 + (i % 2) * 0.016, i + 1, sag); casarao(0.135, z, 0.05, 0.054, 0.066 + ((i + 1) % 2) * 0.014, i + 4, sag); }
  draped(0.04, 0.002, 0.36, '#a9a297', 0.085, -0.21, g, FL + 0.0006);
  // Largo ao norte: igreja de torre única entre dois casarões.
  draped(0.2, 0.002, 0.17, '#e3dbcc', 0.085, -0.53, g, FL);
  { const cx = 0.085, cz = -0.535, cy = low(cx, cz), ty = low(cx, -0.48);
    box(0.055, 0.05, 0.085, C.white, cx, cy, cz, g);
    const roof = hipRoof(0.061, 0.091, 0.022, C.terracotta); roof.position.set(cx, cy + 0.061, cz); g.add(roof);
    box(0.024, 0.09, 0.024, C.white, cx, ty, -0.48, g); box(0.026, 0.004, 0.026, '#f2c14e', cx, ty + 0.06, -0.48, g);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.032, 4), mat(C.terracotta)); spire.rotation.y = Math.PI / 4; spire.position.set(cx, ty + 0.106, -0.48); g.add(spire);
    box(0.012, 0.022, 0.002, '#5a3a2a', cx, ty, -0.4675, g); }
  casarao(0.02, -0.53, 0.045, 0.07, 0.06, 4, low); casarao(0.15, -0.53, 0.045, 0.07, 0.065, 5, low);
  for (const x of [0.04, 0.13]) lampiao(g, x, -0.46, low(x, -0.46));
  // Feira da Praia Grande ao sul: barracas coloridas com mercadorias, o casarão do mercado e bandeirolas.
  draped(0.2, 0.002, 0.17, '#e3dbcc', 0.09, 0.505, g, FL);
  casarao(0.09, 0.575, 0.19, 0.03, 0.05, 2, low);
  const tents = [C.coral, C.amber, C.teal, C.violet, '#e2207a', '#2fd0e0', '#3ee07a', '#ff8a2a'], goods = ['#e8452f', '#ffd23f', '#3ee07a', '#ff8a2a', '#9b5de5', '#f4f4f4'];
  [0.448, 0.508].forEach((z, row) => { for (let c = 0; c < 4; c++) {
    const x = 0.02 + c * 0.05, y = low(x, z);
    box(0.032, 0.008, 0.02, '#a07a5a', x, y, z, g);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.0015, 0.024, 0.0015, '#5a3a2a', x + sx * 0.017, y, z + sz * 0.012, g);
    const roof = hipRoof(0.042, 0.03, 0.012, tents[(c + row * 4) % tents.length]); roof.position.set(x, y + 0.03, z); g.add(roof);
    for (let k = 0; k < 3; k++) box(0.008, 0.005, 0.008, goods[(c + k + row) % goods.length], x - 0.01 + k * 0.01, y + 0.008, z, g);
  } });
  canopy(0.0, 0.18, 0.435, 0.53, (x, z) => low(x, z) + 0.052, 0.024);

  // Praça Maria Aragão: piso de pedra portuguesa com ondas e a estrela do Maranhão, o palco do boi ao norte
  // (painel com a cara do boi, saia de chita, marquise e luzes), um fio de bandeirolas na boca de cena, a plateia
  // de frente para o palco, mastros de fitas, bandeira do Maranhão em destaque ao lado da plateia, chafariz, bancos, árvores e lampiões no contorno.
  const PX = 0.085, PZ = 0.18, HX = 0.075, HZ = 0.165, PY = FL + 0.0028, py = (x, z) => sag(x, z) + PY;
  roundedPad(g, PX, PZ, HX, HZ, 0.035, PY, (x, w, h, k) => {
    x.fillStyle = '#f4f0e6'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#34343e'; x.lineWidth = 3;
    for (let row = 18; row < h; row += 26) { x.beginPath(); for (let i = 0; i <= w; i += 4) x.lineTo(i, row + Math.sin(i / w * TAU * 2) * 6); x.stroke(); }
    x.strokeStyle = '#c9a77a'; x.lineWidth = 5; x.strokeRect(4, 4, w - 8, h - 8);
    const cx = w / 2, cy = (PZ + 0.01 - (PZ - HZ)) * k;
    x.fillStyle = '#f4f0e6'; x.beginPath(); x.arc(cx, cy, 0.07 * k, 0, TAU); x.fill();
    x.fillStyle = '#1e4488'; x.beginPath(); x.arc(cx, cy, 0.03 * k, 0, TAU); x.fill();
    x.strokeStyle = '#e8452f'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, 0.034 * k, 0, TAU); x.stroke();
    x.fillStyle = '#ffffff'; x.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = (i % 2 ? 0.009 : 0.022) * k; x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
    x.fill();
  });
  // Palco.
  const SZ = 0.067, SD = 0.1, SW = 0.146, SH = 0.012, sy = py(PX, SZ), stTop = sy + SH;
  box(SW, SH, SD, '#2a1d4f', PX, sy, SZ, g);
  box(SW - 0.006, 0.001, SD - 0.006, '#3a2a66', PX, stTop, SZ, g);
  const skirt = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), new THREE.MeshStandardMaterial({ map: saiaTex(), roughness: 0.8 })); skirt.position.set(PX, sy + SH / 2, SZ + SD / 2 + 0.0006); g.add(skirt);
  const panelTex = boiPanelTex();
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(SW, 0.072), new THREE.MeshStandardMaterial({ map: panelTex, emissive: '#ffffff', emissiveMap: panelTex, emissiveIntensity: 0.25, roughness: 0.7 }));
  panel.position.set(PX, stTop + 0.036, SZ - SD / 2 + 0.003); g.add(panel);
  box(SW + 0.006, 0.078, 0.004, '#1b1440', PX, stTop - 0.002, SZ - SD / 2, g);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.004, 0.08, 0.004, C.white, PX + sx * (SW / 2 - 0.002), stTop, SZ + sz * (SD / 2 - 0.003), g);
  const marq = new THREE.BoxGeometry(SW + 0.012, 0.004, SD + 0.012, 40, 1, 1), mp = marq.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i); mp.setY(i, mp.getY(i) + 0.03 * Math.max(0, Math.sin(Math.PI * (x / (SW + 0.012) + 0.5))) ** 0.8); }
  marq.computeVertexNormals();
  const marquee = new THREE.Mesh(marq, mat(C.white)); marquee.position.set(PX, stTop + 0.08, SZ); g.add(marquee);
  // Fachos de luz colorida sobre o palco (acendem durante a dança).
  const beams = ['#ff4fd8', '#2fd0e0'].map((c, i) => {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.075, 16, 1, true), holoMat(c, 0.06)); b.position.set(PX + (i ? 0.035 : -0.035), stTop + 0.04, SZ + 0.006); g.add(b); return b;
  });
  // Mastros de fitas nos cantos da frente do palco.
  for (const s of [-1, 1]) {
    const mx = PX + s * 0.07, mz = SZ + SD / 2 + 0.008, my = py(mx, mz);
    cyl(0.0018, 0.11, C.white, mx, my, mz, g, 6);
    const st = new THREE.Mesh(new THREE.OctahedronGeometry(0.005), mat('#ffd36b', { emissive: '#ffb347', emissiveIntensity: 1 })); st.position.set(mx, my + 0.114, mz); g.add(st);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, f = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.05, 0.0008), mat(BOI[i % BOI.length])); f.position.set(mx + Math.cos(a) * 0.006, my + 0.085, mz + Math.sin(a) * 0.006); f.rotation.set(Math.sin(a) * 0.25, -a, -Math.cos(a) * 0.25); g.add(f); }
  }
  canopy(PX - SW / 2, PX + SW / 2, SZ + SD / 2 + 0.004, SZ + SD / 2 + 0.004, () => stTop + 0.074);
  // Chafariz ao sul, com bancos virados para ele, e árvores nos cantos.
  const FZ = PZ + HZ - 0.04, ffy = py(PX, FZ);
  cyl(0.024, 0.006, '#e9e1d2', PX, ffy, FZ, g, 24);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.002, 24), mat('#5fd3f0', { emissive: '#00b7e3', emissiveIntensity: 0.35 })); agua.position.set(PX, ffy + 0.006, FZ); g.add(agua);
  cyl(0.003, 0.016, '#e9e1d2', PX, ffy, FZ, g, 8);
  const jato = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 10, 1, true), jatoMat); jato.rotation.x = Math.PI; jato.position.set(PX, ffy + 0.026, FZ); g.add(jato);
  for (const s of [-1, 1]) box(0.006, 0.005, 0.026, '#a07a5a', PX + s * 0.042, py(PX + s * 0.042, FZ), FZ, g);
  for (const x of [PX - 0.06, PX + 0.06]) tree(g, x, FZ - 0.005, 0.75, '#2f9b7a', py(x, FZ - 0.005));
  for (const z of [0.13, 0.22, 0.31]) for (const s of [-1, 1]) lampiao(g, PX + s * (HX - 0.006), z, py(PX + s * (HX - 0.006), z));
  // Bandeira do Maranhão em destaque ao lado da plateia: pedestal de dois degraus, canteiro florido, banco virado
  // para ela e duas luzes no chão iluminando o mastro.
  const FX = PX + 0.06, FLZ = 0.255, fly = py(FX, FLZ);
  cyl(0.016, 0.003, '#e9e1d2', FX, fly, FLZ, g, 20); cyl(0.011, 0.003, '#d8cdb8', FX, fly + 0.003, FLZ, g, 20);
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU; box(0.003, 0.003, 0.003, BOI[k % BOI.length], FX + Math.cos(a) * 0.0135, fly + 0.003, FLZ + Math.sin(a) * 0.0135, g); }
  waveFlag(g, FX, FLZ, 0.17, maranhaoTex(), 0.09);
  box(0.006, 0.005, 0.028, '#a07a5a', FX - 0.024, py(FX - 0.024, FLZ), FLZ, g);
  for (const s of [-1, 1]) box(0.004, 0.003, 0.004, '#fff1c4', FX + 0.008, fly + 0.006, FLZ + s * 0.008, g, { emissive: '#ffd28a', emissiveIntensity: 1.6 });

  // O boi: veludo preto bordado, saia de chita com franja, chifres com pompons brancos, olhos coloridos,
  // focinho branco e a estrela na testa. Por baixo da saia aparecem os pés do brincante (o "miolo").
  const bord = bordadoTex(), veludo = new THREE.MeshStandardMaterial({ map: bord, emissive: '#ffffff', emissiveMap: bord, emissiveIntensity: 0.22, roughness: 0.55 });
  const boi = new THREE.Group(); boi.rotation.order = 'YXZ'; boi.scale.setScalar(0.85);
  for (const s of [-1, 1]) { cyl(0.0028, 0.01, '#2a2a33', 0, 0, s * 0.006, boi, 6); box(0.008, 0.003, 0.005, '#f4f4f4', 0.002, 0, s * 0.006, boi); }
  const saia = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.037, 0.026, 24, 1, true), new THREE.MeshStandardMaterial({ map: saiaTex(), side: THREE.DoubleSide, roughness: 0.8 }));
  saia.position.y = 0.022; saia.scale.set(1.3, 1, 1); saia.userData.keep = true; boi.add(saia);
  for (let k = 0; k < 20; k++) { const a = k / 20 * TAU, f = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.008, 0.0015), mat(BOI[k % BOI.length])); f.position.set(Math.cos(a) * 0.037 * 1.3, 0.006, Math.sin(a) * 0.037); f.rotation.y = -a; boi.add(f); }
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.068, 0.024, 0.044, 3, 0.01), veludo); corpo.position.y = 0.046; boi.add(corpo);
  box(0.07, 0.003, 0.046, '#ffd23f', 0, 0.034, 0, boi);
  const cupim = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), veludo); cupim.scale.set(1, 0.7, 1); cupim.position.set(0.022, 0.059, 0); boi.add(cupim);
  const rabo = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.022, 0.003), mat('#120c1c')); rabo.position.set(-0.038, 0.044, 0); rabo.rotation.z = 0.5; boi.add(rabo);
  const tufo = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), mat('#ff4fd8')); tufo.position.set(-0.044, 0.035, 0); boi.add(tufo);
  const cab = new THREE.Group(); cab.position.set(0.038, 0.058, 0); boi.add(cab);
  const cranio = new THREE.Mesh(new RoundedBoxGeometry(0.026, 0.024, 0.026, 2, 0.007), veludo); cranio.position.set(0.008, 0.004, 0); cab.add(cranio);
  const focinho = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.013, 0.021, 2, 0.005), mat('#f4efe6')); focinho.position.set(0.024, -0.004, 0); cab.add(focinho);
  box(0.003, 0.006, 0.016, '#e8452f', 0.031, -0.008, 0, cab);
  box(0.002, 0.0015, 0.018, '#c0142a', 0.029, -0.0105, 0, cab);
  for (const s of [-1, 1]) {
    for (const [r, c, dz] of [[0.0055, '#ffffff', 0.0135], [0.003, s < 0 ? '#e8452f' : '#2f9bff', 0.0145], [0.0013, '#120c1c', 0.0152]]) {
      const e = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.002, 16), mat(c)); e.rotation.x = Math.PI / 2; e.position.set(0.012, 0.008, s * dz); cab.add(e);
    }
    const chifre = new THREE.Mesh(new THREE.ConeGeometry(0.0032, 0.022, 6), mat('#120c1c')); chifre.position.set(0.004, 0.024, s * 0.011); chifre.rotation.set(s * 0.55, 0, -0.25); cab.add(chifre);
    const pompom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0055, 1), mat('#ffffff', { roughness: 1 })); pompom.scale.set(1, 0.8, 1); pompom.position.set(0.002, 0.015, s * 0.011); cab.add(pompom);
    const orelha = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.006, 0.012), mat('#120c1c')); orelha.position.set(-0.002, 0.01, s * 0.018); orelha.rotation.x = s * 0.6; cab.add(orelha);
  }
  const testa = new THREE.Mesh(new THREE.OctahedronGeometry(0.0035), mat('#ffd36b', { emissive: '#ffb347', emissiveIntensity: 1 })); testa.position.set(0.021, 0.01, 0); cab.add(testa);
  compact(cab); compact(boi);
  boi.position.set(PX, stTop, SZ); g.add(boi);
  const party = confetti(g, PX, stTop + 0.09, SZ);
  // Dança: 3 voltas no palco (saindo e voltando de frente para a plateia), pulando no ritmo, balançando a saia e a cabeça.
  const showK = () => { const f = fxT(zi); return f < 0 || f >= DUR ? 0 : smooth(0, 0.8, f) * (1 - smooth(DUR - 1.2, DUR, f)); };
  boi.userData.anim = t => {
    const f = fxT(zi), k = showK(), u = f < 0 || f >= DUR ? 0 : f / DUR, a = 6 * Math.PI * smoother(0, 1, u), beat = Math.abs(Math.sin(t * 5.5));
    if (f >= 0 && party.userData.at !== zoneFx[zi]) party.userData.at = zoneFx[zi];
    const heading = u > 0.5 ? 6 * Math.PI - a : -a;                                          // 6π = 3 voltas: mesma direção, sem giro extra no fim
    const yaw = mix(-Math.PI / 2 + Math.sin(t * 0.7) * 0.2, heading + Math.sin(t * 5.5) * 0.3, k), off = 0.0094; // o centro do boi fica no meio do corpo
    boi.position.set(PX + Math.sin(a) * 0.018 * k - Math.cos(yaw) * off, stTop + beat * 0.012 * k, SZ - Math.cos(a) * 0.004 * k + Math.sin(yaw) * off);
    boi.rotation.y = yaw;
    boi.rotation.z = Math.sin(t * 2) * 0.03 + k * Math.sin(t * 5.5) * 0.12;
    boi.rotation.x = k * Math.sin(t * 2.75) * 0.15;
    cab.rotation.z = Math.sin(t * 1.5) * 0.08 + k * Math.sin(t * 11) * 0.18;
    saia.scale.set(1.3 * (1 + 0.12 * beat * k), 1, 1 + 0.12 * beat * k);
    beams.forEach((b, i) => { b.material.opacity = 0.05 + 0.22 * k * (0.6 + 0.4 * Math.sin(t * 3 + i * 2)); });
  };
  animated.push(boi);
  // Brincantes na frente do palco: dois com pandeirões e dois com chapéus de fitas.
  [[-0.058, 0.128, '#e8452f', true], [0.058, 0.128, '#2f9bff', true], [-0.04, 0.133, '#ffd23f', false], [0.04, 0.133, '#3ee07a', false]].forEach(([dx, z, color, pandeiro], i) => {
    const b = new THREE.Group(), x = PX + dx, y0 = py(x, z);
    cyl(0.0042, 0.013, color, 0, 0, 0, b, 6);
    const h = new THREE.Mesh(new THREE.SphereGeometry(0.0034, 8, 6), mat('#8d5a3b')); h.position.y = 0.0165; b.add(h);
    if (pandeiro) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.0015, 16), mat('#f4e6c8')); p.rotation.x = Math.PI / 2; p.position.set(0, 0.016, 0.006); b.add(p);
      const aro = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0012, 6, 16), mat('#c8643f')); aro.position.copy(p.position); b.add(aro);
    } else {
      cyl(0.007, 0.0012, '#120c1c', 0, 0.019, 0, b, 12); cyl(0.0035, 0.005, '#120c1c', 0, 0.02, 0, b, 10);
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU, f = new THREE.Mesh(new THREE.BoxGeometry(0.0018, 0.014, 0.0006), mat(BOI[k % BOI.length])); f.position.set(Math.cos(a) * 0.0068, 0.0125, Math.sin(a) * 0.0068); f.rotation.y = -a; b.add(f); }
    }
    compact(b);
    b.position.set(x, y0, z); g.add(b);
    b.userData.anim = t => { const k = showK(); b.position.y = y0 + Math.abs(Math.sin(t * 5.5 + i)) * 0.008 * k; b.rotation.y = Math.sin(t * 2.75 + i) * 0.5 * k; };
    animated.push(b);
  });
  // Plateia de frente para o palco; pula e levanta os braços durante toda a dança.
  // Pouca gente (~22), espalhada sem encostar uma na outra nem no canteiro da bandeira.
  const plateia = [], nPub = small ? 14 : 22;
  for (let tries = 0; plateia.length < nPub && tries < 2000; tries++) {
    const x = 0.025 + R() * 0.12, z = 0.145 + R() * 0.09;
    if (Math.hypot(x - FX, z - FLZ) < 0.035 || plateia.some(([a, b]) => Math.hypot(x - a, z - b) < 0.015)) continue;
    plateia.push([x, z]);
  }
  const showFx = i => { const f = fxT(i); return f < 0 ? -1 : f < DUR - 1 ? Math.min(f, 4) : 8 + f - (DUR - 1); };
  crowd(g, plateia, zi, ppl, { yAt: py, fx: showFx });
  // Ao chamar o boi, a câmera fica logo atrás do chafariz, reta no eixo do palco e um pouco acima das cabeças:
  // a frente do palco, o boi e a plateia pulando no mesmo quadro.
  ZONES[zi].show = { cam: [PX, py(PX, FZ) + 0.085, FZ + 0.03], look: [PX, stTop + 0.025, SZ + 0.01], dur: DUR };

  // ── Calçadão da Beira-Mar e mureta na margem do rio, com palmeiras e lampiões fora do caminho.
  draped(0.032, 0.002, 1.2, '#f2ece0', 0.229, -0.02, g, FL);
  draped(0.004, 0.012, 1.2, '#cbbfa8', 0.247, -0.02, g, FL);
  for (let z = -0.6; z <= 0.57; z += 0.11) if (Math.abs(z + 0.12) > 0.041) { palm(g, 0.243, z, 0.09); lampiao(g, 0.219, z + 0.055, low(0.219, z + 0.055)); }
  // Cais com canoas amarradas e veleiros passeando pelo Rio Anil (sem passar debaixo da ponte).
  { const z = -0.5, water = (x, zz) => sag(x, zz) - 0.0067;
    box(0.07, 0.003, 0.016, '#a07a5a', 0.285, sag(0.285, z) + FL - 0.001, z, g);
    for (const x of [0.262, 0.29, 0.315]) for (const s of [-1, 1]) box(0.003, 0.02, 0.003, '#5a3a2a', x, sag(x, z + s * 0.007) - 0.012, z + s * 0.007, g);
    [[0.3, -0.475, '#e8452f'], [0.305, -0.527, '#2fd0e0'], [0.335, -0.49, '#ffd23f']].forEach(([x, zz, c], i) => {
      const b = new THREE.Group(), y0 = water(x, zz);
      box(0.03, 0.005, 0.009, c, 0, 0, 0, b); box(0.026, 0.002, 0.007, '#c79a6b', 0, 0.004, 0, b);
      b.position.set(x, y0, zz); b.rotation.y = 0.2 * (i - 1);
      b.userData.anim = t => { b.position.y = y0 + Math.sin(t * 1.6 + i * 2) * 0.001; b.rotation.z = Math.sin(t * 1.3 + i) * 0.06; };
      g.add(b); animated.push(b);
    });
    [[0.05, 0.5, '#e8452f', 0.1, 0, 0.36], [-0.6, -0.2, '#2fd0e0', 0.13, 2, 0.34]].forEach(([z0, z1, c, sp, ph, x]) => {
      const b = sailboat(c); g.add(b);
      b.userData.anim = t => {
        const zz = mix(z0, z1, (Math.sin(t * sp + ph) + 1) / 2);
        b.position.set(x, water(x, zz), zz); b.rotation.y = Math.cos(t * sp + ph) > 0 ? -Math.PI / 2 : Math.PI / 2; b.rotation.z = Math.sin(t * 1.4 + ph) * 0.04;
      };
      animated.push(b);
    }); }
  // ── Ponte do São Francisco: rampas, pilares, guarda-corpo e postes; carros vão e voltam.
  // O tabuleiro começa na altura do asfalto do circuito e sobe sobre o rio.
  const BZ_ = -0.12, BY = 0.024, lift = x => FL + BY * smooth(0.205, 0.26, x) * (1 - smooth(0.45, 0.5, x));
  liftBox(0.205, 0.5, BZ_, 0.036, 0.004, lift, mat('#7b818c'), g);
  for (let x = 0.215; x < 0.495; x += 0.02) box(0.008, 0.0008, 0.0015, '#f2f2f2', x, sag(x, BZ_) + lift(x) + 0.004, BZ_, g);
  for (const s of [-1, 1]) liftBox(0.21, 0.495, BZ_ + s * 0.017, 0.002, 0.006, x => lift(x) + 0.004, mat(C.white), g);
  for (let x = 0.27; x <= 0.44; x += 0.034) for (const s of [-1, 1]) box(0.006, BY + 0.05, 0.006, '#c3cad3', x, sag(x, BZ_) - 0.05, BZ_ + s * 0.011, g);
  for (let x = 0.28; x <= 0.44; x += 0.055) for (const s of [-1, 1]) lamp(g, x, BZ_ + s * 0.019, sag(x, BZ_) + lift(x) + 0.004, 0.03);
  trafficLoop(g, [[0.216, BZ_ - 0.007], [0.505, BZ_ - 0.007], [0.505, BZ_ + 0.007], [0.216, BZ_ + 0.007]], [{ off: 0, dir: 1, n: 5, speed: 0.045, bus: false }], (x) => lift(x) + 0.004);
  // ── Bairro novo do outro lado do rio (São Francisco): prédios, árvores e coqueiros na margem.
  [[0.5, -0.3, 0.12], [0.52, -0.22, 0.08], [0.5, -0.03, 0.1], [0.53, 0.05, 0.14], [0.5, 0.14, 0.07], [0.5, 0.3, 0.09], [0.51, 0.42, 0.06], [0.5, -0.45, 0.09],
    [0.6, -0.34, 0.13], [0.6, -0.18, 0.16], [0.61, -0.02, 0.1], [0.6, 0.14, 0.15], [0.59, 0.3, 0.11]].forEach(([x, z, h], i) => {
    box(0.034, h, 0.034, [C.white, C.ice, '#cfd8e6'][i % 3], x, sag(x, z), z, g);
    box(0.036, 0.006, 0.036, '#9fe9ff', x, sag(x, z) + h * 0.7, z, g, { emissive: '#3fbfe8', emissiveIntensity: 0.5 });
  });
  for (const z of [-0.26, -0.1, 0.06, 0.22]) tree(g, 0.555, z, 0.8);
  for (const z of [-0.55, -0.38, 0.22, 0.36, 0.5]) palm(g, 0.466, z, 0.08);

  // ── Pedestres: cada um no seu caminho, longe de carros, postes e palmeiras.
  walkers(g, [[[-0.285, -0.38], [-0.285, 0.29], [-0.255, 0.29], [-0.255, -0.38]]], 8, ppl, top);                        // Rua Portugal
  walkers(g, [[[-0.47, -0.147], [-0.1, -0.147], [-0.1, -0.133], [-0.47, -0.133]]], 5, ppl, top);                        // transversal
  walkers(g, [[[-0.235, 0.17], [-0.105, 0.17], [-0.105, 0.27], [-0.235, 0.27]]], 4, ppl, top);                          // mirante
  walkers(g, [[[-0.507, -0.41], [-0.507, 0.21], [-0.493, 0.21], [-0.493, -0.41]]], 6, ppl, top);                        // Rua da Estrela
  walkers(g, [[[BX - 0.088, BZ - 0.052], [BX + 0.088, BZ - 0.052], [BX + 0.088, BZ + 0.052], [BX - 0.088, BZ + 0.052]]], 5, ppl, bTop); // Benedito Leite
  walkers(g, [[[-0.21, 0.31], [-0.21, 0.505], [-0.19, 0.505], [-0.19, 0.31]]], 4, ppl, onLad);                         // ladeira
  walkers(g, [[[-0.31, 0.528], [-0.02, 0.528], [-0.02, 0.542], [-0.31, 0.542]]], 4, ppl, low);                          // rua de baixo
  walkers(g, [[[-0.058, -0.6], [-0.058, 0.56], [-0.054, 0.56], [-0.054, -0.6]]], 6, ppl, low);                          // calçada ao pé da colina
  walkers(g, [[[0.226, -0.6], [0.226, -0.15], [0.232, -0.15], [0.232, -0.6]], [[0.226, -0.09], [0.226, 0.56], [0.232, 0.56], [0.232, -0.09]]], 5, ppl, low); // calçadão
  walkers(g, [[[-0.004, -0.395], [0.174, -0.395], [0.174, 0.355], [-0.004, 0.355]]], 8, ppl, low);                      // calçadas da cidade baixa
  walkers(g, [[[0.08, -0.38], [0.08, -0.04], [0.09, -0.04], [0.09, -0.38]]], 4, ppl, low);                                // beco da Praia Grande
  walkers(g, [[[-0.004, -0.452], [0.18, -0.452], [0.18, -0.446], [-0.004, -0.446]]], 3, ppl, low);                       // largo da igreja
  walkers(g, [[[0.0, 0.474], [0.18, 0.474], [0.18, 0.482], [0.0, 0.482]], [[-0.004, 0.528], [0.185, 0.528], [0.185, 0.552], [-0.004, 0.552]]], 4, ppl, low); // feira

  // ── Ponte ferroviária onde a linha principal cruza o Rio Anil: viga sob os trilhos e pilares até a água.
  const ponte = new THREE.Group(); planet.add(ponte);
  const wet = []; for (let th = 3.2; th <= 3.6; th += 0.005) if (terrain(railPt(th)) < 0.005) wet.push(th);
  if (wet.length) {
    const t0 = wet[0] - 0.03, t1 = wet[wet.length - 1] + 0.03, step = 0.012, m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
    for (let th = t0; th < t1; th += step) {
      q.setFromRotationMatrix(railBasis(th + step / 2, m4));
      const deck = new THREE.Mesh(new THREE.BoxGeometry(step * RAIL_R + 0.001, 0.006, 0.064), mat('#6b7480')); deck.position.copy(railPt(th + step / 2)).multiplyScalar(RAIL_R + 0.001); deck.quaternion.copy(q); ponte.add(deck);
      for (const s of [-1, 1]) { const gd = new THREE.Mesh(new THREE.BoxGeometry(step * RAIL_R + 0.001, 0.012, 0.003), mat(C.amber)); gd.position.copy(railPt(th + step / 2)).multiplyScalar(RAIL_R + 0.01).addScaledVector(new THREE.Vector3(0, 0, s * 0.034).applyQuaternion(q), 1); gd.quaternion.copy(q); ponte.add(gd); }
    }
    for (let th = t0 + 0.006; th < t1; th += 0.024) {
      const h = RAIL_R - (PR - 0.04), pil = new THREE.Mesh(new THREE.BoxGeometry(0.012, h, 0.03), mat('#c3cad3'));
      pil.position.copy(railPt(th)).multiplyScalar(PR - 0.04 + h / 2); pil.quaternion.setFromRotationMatrix(railBasis(th, new THREE.Matrix4())); ponte.add(pil);
    }
  }
}

export { buildCentro };
