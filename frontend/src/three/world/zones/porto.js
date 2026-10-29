import * as THREE from 'three';
import { R, TAU, mix, smooth, smoother } from '../../core/math.js';
import { box, compact, cyl, draped, mat, sag } from '../build.js';
import { gallery, terminalMask, windrow, yardFloor } from '../industry.js';
import { C } from '../palette.js';
import { walkers } from '../people.js';
import { waveFlag } from '../props.js';
import { animated, rt, zoneFx, zoneFx2 } from '../runtime.js';
import { glassMat, holoMat, maranhaoTex } from '../textures.js';
import { carrierGeo, tugGeo, vehMat } from '../vehicles.js';

// Porto: terminal de minério e porto multiuso entre a linha do trem (a noroeste) e o mar (ao sul, z > 0,25).
// Em terra: pátio de estocagem com pilhas e empilhadeira (o minério chega da Ferrovia por uma correia vinda do oeste),
// correia coberta até o píer, pátio de contêineres com pórtico, tanques de combustível, armazém e administração.
// No mar: píer com o carregador de navios sobre trilhos, navio atracado, rebocadores, quebra-mar com farol, boias do
// canal, navios esperando a vez e gaivotas. "Zarpar o navio" leva o navio carregado embora com os rebocadores e traz
// o próximo da fila; "Carregar o navio" enche os porões e o navio afunda na linha-d'água.
function buildPort(g, zi) {
  const G = 0.0065, gy = (x, z) => sag(x, z) + G, water = (x, z) => sag(x, z) - 0.0067;
  yardFloor(g, 0.7, 0.0062, terminalMask(g));
  const conc = '#b9b3a8', steel = '#9aa8b8';
  const roundTree = (x, z, sc) => { const y = gy(x, z); cyl(0.003 * sc, 0.02 * sc, C.trunk, x, y, z, g, 5);
    for (const [dx, dy, dz, r] of [[0, 0.03, 0, 0.014], [0.008, 0.026, 0.005, 0.01], [-0.007, 0.028, -0.005, 0.011]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * sc, 0), mat('#2f7d4f')); b.position.set(x + dx * sc, y + dy * sc, z + dz * sc); g.add(b); } };
  const parkedCar = (x, z, color) => { const y = gy(x, z) + 0.002;
    box(0.012, 0.004, 0.022, color, x, y, z, g); box(0.011, 0.004, 0.011, '#1d2b3d', x, y + 0.004, z - 0.001, g); };

  // ── Cais na beira-mar, ponte de acesso e berço de atracação sobre estacas.
  draped(1.1, 0.046 + G, 0.06, conc, 0, 0.23, g, -0.04);
  draped(1.1, 0.0015, 0.004, '#ffd23f', 0, 0.258, g, G + 0.006);
  const PX = 0.1, BZ0 = 0.43, BZ1 = 0.48, bTop = (x, z) => gy(x, z) + 0.006;
  draped(0.045, 0.006, 0.18, conc, PX, 0.345, g, G);
  draped(0.7, 0.008, BZ1 - BZ0, conc, 0.05, (BZ0 + BZ1) / 2, g, G - 0.002);
  for (let z = 0.27; z < 0.43; z += 0.032) for (const s of [-1, 1]) cyl(0.004, 0.055, '#7f8a96', PX + s * 0.016, sag(PX, z) - 0.048, z, g, 6);
  for (let x = -0.29; x <= 0.39; x += 0.05) for (const z of [BZ0 + 0.006, BZ1 - 0.006]) cyl(0.004, 0.055, '#7f8a96', x, sag(x, z) - 0.048, z, g, 6);
  for (let x = -0.27; x <= 0.38; x += 0.06) { box(0.012, 0.012, 0.004, '#1a1d24', x, sag(x, BZ1) - 0.002, BZ1 + 0.002, g); cyl(0.0025, 0.004, '#2a2f38', x + 0.03, bTop(x + 0.03, BZ1 - 0.005), BZ1 - 0.005, g, 8); }
  // Trilhos do carregador e a correia ao longo do berço.
  for (const z of [0.437, 0.473]) draped(0.7, 0.002, 0.003, C.steel, 0.05, z, g, G + 0.006);
  draped(0.7, 0.003, 0.009, C.dark, 0.05, 0.455, g, G + 0.006);
  for (let x = -0.28; x < 0.39; x += 0.016) box(0.006, 0.002, 0.006, C.ore, x, bTop(x, 0.455) + 0.003, 0.455, g);
  box(0.03, 0.03, 0.02, '#dfe6ee', PX, bTop(PX, 0.425), 0.425, g);

  // ── Pátio de estocagem (oeste): pilhas, trilhos e correia da empilhadeira; correia chegando da Ferrovia.
  windrow(g, -0.5, -0.08, 0.02, 0.06, 0.04, C.ore, G); windrow(g, -0.46, -0.08, 0.14, 0.06, 0.045, '#843b29', G);
  const SZ = 0.08;
  draped(0.62, 0.004, 0.01, C.dark, -0.37, SZ, g, G);
  for (let x = -0.67; x < -0.06; x += 0.014) box(0.006, 0.002, 0.006, C.ore, x, gy(x, SZ) + 0.004, SZ, g);
  for (const s of [-1, 1]) draped(0.46, 0.003, 0.003, C.steel, -0.29, SZ + s * 0.015, g, G);
  draped(0.18, 0.004, 0.01, C.dark, 0.01, SZ, g, G);
  const stk = new THREE.Group(); g.add(stk);
  for (const x of [-0.016, 0.016]) for (const s of [-1, 1]) box(0.005, 0.032, 0.005, C.amber, x, 0, s * 0.015, stk);
  box(0.042, 0.008, 0.04, C.amber, 0, 0.032, 0, stk); cyl(0.011, 0.028, C.white, 0, 0.04, 0, stk, 10);
  const sboom = new THREE.Group(); sboom.position.y = 0.07; stk.add(sboom);
  box(0.09, 0.006, 0.008, C.amber, 0.045, -0.003, 0, sboom); box(0.03, 0.012, 0.014, C.dark, -0.022, -0.006, 0, sboom); box(0.09, 0.002, 0.002, C.amber, 0.045, 0.015, 0, sboom);
  const swheel = new THREE.Group(); swheel.position.set(0.092, -0.004, 0); sboom.add(swheel);
  swheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0025, 6, 16), mat(C.white)));
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, b = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.006), mat(C.dark)); b.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0); b.rotation.z = a; swheel.add(b); }
  compact(swheel); compact(stk);
  stk.userData.anim = t => {
    const x = mix(-0.46, -0.13, (Math.sin(t * 0.08 + 1) + 1) / 2); stk.position.set(x, gy(x, SZ) + 0.003, SZ);
    sboom.rotation.y = Math.PI / 2 * Math.sign(Math.sin(t * 0.05)) + Math.sin(t * 0.3) * 0.3; sboom.rotation.z = -0.12; swheel.rotation.z = -t * 2.4;
  };
  animated.push(stk);
  // Torre de transferência e correia coberta até o píer (passa por cima do cais e da ponte de acesso).
  box(0.034, 0.08, 0.034, '#dfe6ee', PX, gy(PX, SZ), SZ, g); box(0.04, 0.005, 0.04, '#5a6878', PX, gy(PX, SZ) + 0.08, SZ, g); box(0.035, 0.005, 0.035, C.amber, PX, gy(PX, SZ) + 0.055, SZ, g);
  const ga = new THREE.Vector3(PX, gy(PX, 0.1) + 0.06, 0.1), gb = new THREE.Vector3(PX, bTop(PX, 0.415) + 0.02, 0.415);
  gallery(g, ga, gb);
  for (const k of [0.3, 0.62]) { const p = ga.clone().lerp(gb, k); for (const s of [-1, 1]) box(0.004, p.y - gy(p.x, p.z) + 0.01, 0.004, steel, p.x + s * 0.012, gy(p.x, p.z) - 0.01, p.z, g); }

  // ── Setor administrativo entre a via de serviço e a linha do trem: prédio principal de vidro com terraço, anexo,
  // torre de controle do tráfego de navios com radar girando, praça com árvores, bancos e a bandeira do Maranhão,
  // estacionamento e portaria com cancela na entrada da via.
  { const x = -0.05, z = -0.16, y = gy(x, z);
    box(0.094, 0.006, 0.05, conc, x, y, z, g);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.044), glassMat()); glass.position.set(x, y + 0.036, z); g.add(glass);
    for (const dy of [0.006, 0.026, 0.046]) box(0.092, 0.003, 0.046, C.white, x, y + dy, z, g);
    for (const dx of [-0.045, 0.045]) box(0.004, 0.064, 0.046, C.white, x + dx, y + 0.002, z, g);
    box(0.096, 0.004, 0.05, C.white, x, y + 0.066, z, g); box(0.03, 0.012, 0.02, C.white, x - 0.025, y + 0.07, z, g);
    for (const dx of [0.0, 0.02, 0.04]) box(0.008, 0.002, 0.008, '#3aa58c', x + dx - 0.005, y + 0.07, z + 0.008, g);
    box(0.02, 0.016, 0.004, '#1d2b3d', x, y + 0.006, z + 0.023, g); box(0.03, 0.002, 0.012, C.white, x, y + 0.022, z + 0.03, g); }
  { const x = -0.17, z = -0.15, y = gy(x, z);
    box(0.06, 0.034, 0.04, C.white, x, y, z, g); box(0.061, 0.009, 0.041, '#7fc4e8', x, y + 0.014, z, g, { emissive: '#3fbfe8', emissiveIntensity: 0.25 });
    box(0.061, 0.003, 0.041, C.tile, x, y + 0.031, z, g); box(0.064, 0.003, 0.044, C.dark, x, y + 0.034, z, g); }
  { const x = 0.11, z = -0.17, y = gy(x, z);
    cyl(0.012, 0.12, C.white, x, y, z, g, 12); cyl(0.0125, 0.006, C.tile, x, y + 0.04, z, g, 12); cyl(0.0125, 0.006, C.tile, x, y + 0.08, z, g, 12);
    cyl(0.022, 0.004, C.white, x, y + 0.12, z, g, 16);
    const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.017, 0.02, 16), mat('#9fe9ff', { emissive: '#3fbfe8', emissiveIntensity: 0.7 })); cab.position.set(x, y + 0.134, z); g.add(cab);
    cyl(0.024, 0.004, C.dark, x, y + 0.144, z, g, 16); cyl(0.0012, 0.012, C.dark, x, y + 0.148, z, g, 4);
    const radar = new THREE.Group(); radar.position.set(x, y + 0.16, z); g.add(radar);
    radar.add(new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.003, 0.004), mat(C.white)));
    radar.userData.anim = t => { radar.rotation.y = t * 1.6; }; animated.push(radar); }
  { const x = 0.045, z = -0.15;
    draped(0.09, 0.002, 0.1, '#e9e1d2', x, z, g, G);
    for (const dz of [-0.035, 0.03]) roundTree(x - 0.025, z + dz, 0.8);
    for (const dz of [-0.03, 0.03]) box(0.006, 0.004, 0.018, '#a07a5a', x + 0.03, gy(x + 0.03, z + dz), z + dz, g);
    waveFlag(g, x + 0.015, z + 0.02, 0.1, maranhaoTex(), 0.05); }
  { const x = -0.1, z = -0.235;
    draped(0.16, 0.002, 0.042, '#3a3f4a', x, z, g, G);
    for (let k = 0; k < 8; k++) { const px = x - 0.07 + k * 0.02; box(0.001, 0.0006, 0.016, '#f2f2f2', px - 0.01, gy(px, z) + 0.002, z - 0.012, g); if (k % 3 !== 1) parkedCar(px, z - 0.012, ['#e8452f', C.white, '#2a3446', C.amber, C.tile][k % 5]); } }
  const gate = new THREE.Group(); { const x = -0.29, z = -0.105, y = gy(x, z);
    box(0.016, 0.016, 0.014, C.white, x, y, z, g); box(0.017, 0.003, 0.015, C.tile, x, y + 0.016, z, g); box(0.0165, 0.006, 0.0002, '#7fc4e8', x, y + 0.007, z + 0.007, g);
    gate.position.set(x + 0.008, y + 0.01, z + 0.012); g.add(gate);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.003, 0.03), mat('#e8452f')); arm.geometry.translate(0, 0, 0.015); gate.add(arm);
    gate.userData.anim = t => { gate.rotation.x = -smooth(0, 0.3, Math.sin(t * 0.6)) * 1.2; }; animated.push(gate); }
  // Armazém, mais perto da linha (entre a administração e os tanques).
  { const x = 0.08, z = -0.3, y = gy(x, z), L = 0.16, Wd = 0.09, Hh = 0.04;
    box(L, Hh, Wd, '#2f6fb8', x, y, z, g);
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.BoxGeometry(L + 0.006, 0.004, Wd * 0.56), mat('#cfd8e6')); r.position.set(x, y + Hh + 0.011, z + s * Wd * 0.25); r.rotation.x = s * 0.42; g.add(r); }
    for (const dx of [-0.05, 0, 0.05]) box(0.028, 0.026, 0.002, '#1a1d24', x + dx, y, z + Wd / 2, g); }
  const RZ = -0.085;
  draped(0.86, 0.002, 0.022, '#3a3f4a', 0.12, RZ, g, G);
  for (let x = -0.29; x < 0.54; x += 0.03) box(0.012, 0.0008, 0.0015, '#f2f2f2', x, gy(x, RZ) + 0.002, RZ, g);

  // ── Pátio de contêineres (leste) com pórtico sobre pneus, e via interna.
  const boxes = [];
  for (let c = 0; c < 9; c++) for (let r = 0; r < 4; r++) { const n = 1 + Math.floor(R() * 3); for (let k = 0; k < n; k++) boxes.push([0.225 + c * 0.032, -0.04 + r * 0.025, k]); }
  for (let c = 0; c < 8; c++) for (let r = 0; r < 3; r++) { const n = 1 + Math.floor(R() * 2); for (let k = 0; k < n; k++) boxes.push([0.225 + c * 0.032, 0.105 + r * 0.022, k]); }
  { const cols = ['#e8452f', '#2f6fb8', '#ffd23f', '#3aa58c', '#f4f4f4', '#ff8a2a', '#7a828e'].map(c => new THREE.Color(c));
    const geo = new THREE.BoxGeometry(0.028, 0.012, 0.012); geo.translate(0, 0.006, 0);
    const cm = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ roughness: 0.6, flatShading: true }), boxes.length), o = new THREE.Object3D();
    boxes.forEach(([x, z, k], i) => { o.position.set(x, gy(x, z) + k * 0.0125, z); o.rotation.set(0, 0, 0); o.updateMatrix(); cm.setMatrixAt(i, o.matrix); cm.setColorAt(i, cols[(i * 5 + k) % cols.length]); });
    g.add(cm); }
  draped(0.36, 0.002, 0.02, '#3a3f4a', 0.36, 0.072, g, G);
  const rtg = new THREE.Group(); g.add(rtg);
  for (const x of [-0.014, 0.014]) for (const z of [-0.062, 0.058]) box(0.004, 0.055, 0.004, C.amber, x, 0, z, rtg);
  for (const z of [-0.062, 0.058]) box(0.032, 0.005, 0.005, C.amber, 0, 0, z, rtg);
  for (const x of [-0.014, 0.014]) box(0.005, 0.006, 0.126, C.amber, x, 0.055, -0.002, rtg);
  const trolley = new THREE.Group(); rtg.add(trolley);
  box(0.03, 0.006, 0.012, C.white, 0, 0.058, 0, trolley);
  const spreader = box(0.026, 0.003, 0.012, C.dark, 0, 0.03, 0, trolley); spreader.userData.keep = true;
  const cable = box(0.001, 0.025, 0.001, C.dark, 0, 0.033, 0, trolley); cable.userData.keep = true;
  compact(rtg);
  rtg.userData.anim = t => {
    const x = mix(0.24, 0.46, (Math.sin(t * 0.12) + 1) / 2); rtg.position.set(x, gy(x, -0.002), -0.002);
    trolley.position.z = Math.sin(t * 0.4) * 0.04; const drop = (Math.sin(t * 0.8) + 1) / 2 * 0.02; spreader.position.y = 0.03 - drop; cable.scale.y = 1 + drop / 0.025; cable.position.y = 0.033 - drop;
  };
  animated.push(rtg);

  // ── Tanques de combustível com dique de contenção.
  { const cx = 0.31, cz = -0.23, y = gy(cx, cz);
    for (const [dx, dz, w, d] of [[0, -0.1, 0.22, 0.006], [0, 0.1, 0.22, 0.006], [-0.11, 0, 0.006, 0.2], [0.11, 0, 0.006, 0.2]]) box(w, 0.008, d, conc, cx + dx, gy(cx + dx, cz + dz), cz + dz, g);
    for (const dx of [-0.05, 0.05]) for (const dz of [-0.05, 0.05]) { const x = cx + dx, z = cz + dz, ty = gy(x, z);
      cyl(0.034, 0.04, C.white, x, ty, z, g, 20); cyl(0.0345, 0.006, C.teal, x, ty + 0.026, z, g, 20);
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.034, 20, 6, 0, TAU, 0, 0.5), mat(C.white)); dome.position.set(x, ty + 0.04 - 0.034 * Math.cos(0.5), z); g.add(dome); }
    box(0.004, 0.004, 0.2, steel, cx - 0.13, y + 0.012, cz + 0.02, g); }

  // ── Quebra-mar de pedras com o farol na ponta e o facho girando.
  { const a = new THREE.Vector2(0.52, 0.25), b = new THREE.Vector2(0.62, 0.5), rock = mat('#8a8f96');
    for (let i = 0; i <= 26; i++) { const p = a.clone().lerp(b, i / 26); for (let k = 0; k < 2; k++) { const r = new THREE.Mesh(new THREE.IcosahedronGeometry(0.012 + R() * 0.008, 0), rock); r.position.set(p.x + (R() - 0.5) * 0.02, water(p.x, p.y) + 0.002 + R() * 0.006, p.y + (R() - 0.5) * 0.02); r.rotation.set(R() * 3, R() * 3, R() * 3); g.add(r); } }
    const fx = 0.625, fz = 0.515, fy = water(fx, fz) + 0.008;
    cyl(0.02, 0.008, '#8a8f96', fx, fy - 0.004, fz, g, 10);
    for (let i = 0; i < 5; i++) { const t0 = new THREE.Mesh(new THREE.CylinderGeometry(0.0105 - i * 0.0012, 0.012 - i * 0.0012, 0.018, 14), mat(i % 2 ? '#e8452f' : '#f4f4f4')); t0.position.set(fx, fy + 0.009 + i * 0.018, fz); g.add(t0); }
    const top = fy + 0.09;
    cyl(0.009, 0.012, '#fff1c4', fx, top, fz, g, 12).material = mat('#fff1c4', { emissive: '#ffd28a', emissiveIntensity: 1.8 });
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.012, 12), mat('#e8452f')); cap.position.set(fx, top + 0.018, fz); g.add(cap);
    const beam = new THREE.Group(); beam.position.set(fx, top + 0.006, fz); g.add(beam);
    for (const s of [-1, 1]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.18, 12, 1, true), holoMat('#fff1c4', 0.18)); c.rotation.z = s * Math.PI / 2; c.position.x = s * 0.09; beam.add(c); }
    beam.userData.anim = t => { beam.rotation.y = t * 0.9; }; animated.push(beam); }

  // ── Boias do canal até o galpão naval (vermelhas de um lado, verdes do outro) com luz piscando.
  const CH0 = [0.08, 0.63], CH1 = [-0.35, 0.86], chL = Math.hypot(CH1[0] - CH0[0], CH1[1] - CH0[1]), chU = [(CH1[0] - CH0[0]) / chL, (CH1[1] - CH0[1]) / chL];
  [0.12, 0.3].flatMap(a => [[a, 1, '#e8452f'], [a, -1, '#3ee07a']]).forEach(([a, sd, c], i) => {
    const x = CH0[0] + chU[0] * chL * a - chU[1] * sd * 0.065, z = CH0[1] + chU[1] * chL * a + chU[0] * sd * 0.065;
    const b = new THREE.Group(), y0 = water(x, z);
    cyl(0.007, 0.012, c, 0, -0.004, 0, b, 10); cyl(0.0015, 0.012, C.dark, 0, 0.008, 0, b, 5);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.003, 8, 6), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 1 })); lamp.position.y = 0.021; b.add(lamp);
    b.position.set(x, y0, z); g.add(b);
    b.userData.anim = t => { b.position.y = y0 + Math.sin(t * 1.4 + i) * 0.0015; b.rotation.z = Math.sin(t * 1.1 + i) * 0.08; lamp.material.emissiveIntensity = Math.sin(t * 3 + i * 1.7) > 0.3 ? 2 : 0.1; };
    animated.push(b);
  });
  // ── Galpão naval sobre estacas no fim do canal: o navio que sai entra nele, e o próximo sai dele.
  const shedYaw = Math.atan2(-chU[1], chU[0]);
  // Eixo local +x do galpão aponta para dentro (do canal para o fundo); a porta fica em −x, virada para o canal.
  { const sh = new THREE.Group(), hx = CH1[0] + chU[0] * 0.02, hz = CH1[1] + chU[1] * 0.02; shipPose(sh, hx, hz, shedYaw, water(hx, hz), 0); g.add(sh);
    const L = 0.42, Wd = 0.1, Hw = 0.075;
    for (const sd of [-1, 1]) { box(L, Hw, 0.006, '#dfe6ee', 0, -0.004, sd * Wd / 2, sh); box(L + 0.002, 0.008, 0.0065, C.tile, 0, 0.04, sd * Wd / 2, sh); for (let x = -L / 2; x <= L / 2 + 1e-6; x += 0.06) box(0.006, Hw + 0.002, 0.008, '#9aa8b8', x, -0.004, sd * Wd / 2, sh); }
    box(0.006, Hw, Wd, '#dfe6ee', L / 2, -0.004, 0, sh);
    const arch = new THREE.CylinderGeometry(Wd / 2 + 0.006, Wd / 2 + 0.006, L + 0.01, 20, 1, false, 0, Math.PI); arch.rotateZ(Math.PI / 2); arch.scale(1, 0.5, 1);
    const roofM = new THREE.Mesh(arch, mat('#cfd8e6', { side: THREE.DoubleSide })); roofM.position.y = Hw - 0.004; sh.add(roofM);
    for (const sd of [-1, 1]) box(0.01, Hw + 0.01, 0.012, C.amber, -L / 2, -0.004, sd * (Wd / 2 + 0.002), sh);
    box(0.01, 0.012, Wd + 0.016, C.amber, -L / 2, Hw - 0.006, 0, sh);
    for (let x = -L / 2 + 0.03; x < L / 2; x += 0.07) for (const sd of [-1, 1]) cyl(0.004, 0.05, '#7f8a96', x, -0.05, sd * (Wd / 2 + 0.008), sh, 6);
    for (let x = -L / 2 + 0.05; x < L / 2; x += 0.09) box(0.016, 0.002, 0.004, '#fff1c4', x, Hw - 0.012, 0, sh, { emissive: '#ffd28a', emissiveIntensity: 1.2 }); }

  // ── Navios esperando a vez, ao largo.
  [[0.18, 0.95, 0.4, '#2a3446', '#e8452f', '#00b7e3'], [0.46, 0.76, -0.3, '#3a2a22', '#b8392b', C.amber]].forEach(([x, z, yaw, h1, h2, f], i) => {
    const s = new THREE.Group(), m = new THREE.Mesh(carrierGeo(h1, h2, f), vehMat()); m.scale.setScalar(0.82); s.add(m); g.add(s);
    s.userData.anim = t => shipPose(s, x, z, yaw + Math.sin(t * 0.2 + i) * 0.02, water(x, z) - 0.008 + Math.sin(t * 1.1 + i) * 0.002, Math.sin(t * 0.9 + i) * 0.02);
    animated.push(s);
  });

  // ── Navio no berço, carregador de navios e rebocadores.
  const SX = 0.06, SZB = 0.525, HATCH = [-0.075, -0.031, 0.013, 0.057, 0.101];
  const ship = new THREE.Group(); ship.add(new THREE.Mesh(carrierGeo(), vehMat())); g.add(ship);
  const loader = new THREE.Group(); g.add(loader);
  for (const x of [-0.016, 0.016]) for (const z of [0.437, 0.473]) box(0.004, 0.05, 0.004, C.amber, x, 0, z - 0.455, loader);
  box(0.04, 0.006, 0.042, C.amber, 0, 0.05, 0, loader); box(0.016, 0.03, 0.016, C.white, 0, 0.056, 0, loader);
  box(0.012, 0.008, 0.04, C.dark, 0, 0.078, -0.03, loader);
  box(0.012, 0.006, 0.1, C.amber, 0, 0.083, 0.045, loader); box(0.002, 0.002, 0.1, C.amber, 0, 0.097, 0.045, loader);
  for (const z of [0.01, 0.045, 0.08]) box(0.002, 0.012, 0.002, C.amber, 0, 0.086, z, loader);
  const chute = box(0.008, 0.026, 0.008, C.white, 0, 0.057, 0.07, loader); chute.userData.keep = true;
  compact(loader);
  const stream = Array.from({ length: 8 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.006), mat(C.ore)); m.visible = false; m.userData.keep = true; g.add(m); return m; });
  const tugs = [0, 1].map(() => { const tg = new THREE.Group(); tg.add(new THREE.Mesh(tugGeo(), vehMat())); g.add(tg); return tg; });
  const wakes = tugs.map(tg => [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 4), mat('#ffffff', { transparent: true, opacity: 0.6, roughness: 1 })); m.scale.y = 0.15; tg.add(m); return m; }));
  // Linha do tempo de "Zarpar": afasta de lado, aponta a proa para o galpão naval e entra até sumir; o próximo sai
  // dele de ré, vira e encosta no berço.
  const DEP = 19, P0 = [SX, SZB], P1 = CH0, PS = CH1, yawIn = shedYaw;
  const lerp2 = (a, b, u) => [mix(a[0], b[0], u), mix(a[1], b[1], u)];
  const pose = fd => {
    if (fd < 3) return [...lerp2(P0, P1, smoother(0, 3, fd)), 0];
    if (fd < 5) return [...P1, yawIn * smoother(3, 5, fd)];
    if (fd < 9) return [...lerp2(P1, PS, smoother(5, 9, fd)), yawIn];
    if (fd < 10) return [...PS, yawIn];
    if (fd < 14) return [...lerp2(PS, P1, smoother(10, 14, fd)), yawIn];
    if (fd < 16) return [...P1, yawIn * (1 - smoother(14, 16, fd))];
    return [...lerp2(P1, P0, smoother(16, 19, fd)), 0];
  };
  let load = 0.15, depStart = -1, ldStart = -1, ldFrom = 0.15;
  const tmp = new THREE.Vector3();
  ship.userData.anim = t => {
    if (zoneFx[zi] >= 0 && zoneFx[zi] !== depStart) depStart = zoneFx[zi];
    if (zoneFx2[zi] >= 0 && zoneFx2[zi] !== ldStart) { ldStart = zoneFx2[zi]; ldFrom = load; }
    const fd = depStart < 0 ? -1 : rt.clock - depStart, fl = ldStart < 0 ? -1 : rt.clock - ldStart;
    const departing = fd >= 0 && fd < DEP, loading = fl >= 0 && fl < 10 && !departing && ldStart > depStart;
    if (departing && fd >= 9.5) load = 0.15;                                                // o navio que sai do galpão vem vazio
    if (loading) load = mix(ldFrom, 1, smooth(1, 9, fl));
    const [x, z, yaw] = departing ? pose(fd) : [SX, SZB, 0];
    shipPose(ship, x, z, yaw, water(x, z) - 0.004 - 0.009 * load + Math.sin(t * 1.3) * 0.0015, Math.sin(t) * 0.012);
    // Carregador: passeia pelos porões; carregando, para em cada um e o minério cai pela bica.
    const hatch = loading ? HATCH[Math.min(4, Math.floor(smooth(1, 9, fl) * 5))] : HATCH[0] + (Math.sin(t * 0.15) + 1) / 2 * (HATCH[4] - HATCH[0]);
    const lx = SX + hatch; loader.position.set(lx, bTop(lx, 0.455), 0.455);
    stream.forEach((m, i) => {
      const k = (t * 1.6 + i / stream.length) % 1; m.visible = loading && fl > 1 && fl < 9.5;
      if (m.visible) { tmp.set(lx + (i % 3 - 1) * 0.002, bTop(lx, 0.455) + 0.057 - k * 0.05, 0.525); m.position.copy(tmp); m.rotation.set(i, k * 4, 0); }
    });
    // Rebocadores: em volta do navio enquanto ele sai e chega; parados perto do quebra-mar no resto do tempo.
    const kt = departing ? smooth(0, 1.2, fd) * (1 - smooth(DEP - 1, DEP, fd)) : 0;
    tugs.forEach((tg, i) => {
      const a = t * 0.35 + i * Math.PI, ix = 0.4 + Math.cos(a) * 0.05, iz = 0.6 + Math.sin(a) * 0.03, iyaw = -a - Math.PI / 2;
      const ox = i ? 0.17 : -0.17, oz = 0.05, cs = Math.cos(yaw), sn = Math.sin(yaw);
      const sx = x + ox * cs + oz * sn, sz = z - ox * sn + oz * cs;
      const tx = mix(ix, sx, kt), tz = mix(iz, sz, kt), tyaw = kt > 0.5 ? yaw : iyaw;
      shipPose(tg, tx, tz, tyaw, water(tx, tz) - 0.002, 0);
      wakes[i].forEach((m, j) => { const k = (t * 1.2 + j / 4) % 1; m.position.set(-0.018 - k * 0.03, 0.001, Math.sin(j * 2.3) * 0.002); m.scale.set(1 + k * 1.6, 0.15, 0.8 + k * 1.4); m.material.opacity = 0.6 * (1 - k); });
    });
  };
  animated.push(ship);

  // ── Gaivotas voando em círculos sobre o píer.
  const gulls = new THREE.Group(); g.add(gulls);
  const gullList = Array.from({ length: 6 }, (_, i) => {
    const b = new THREE.Group(), wm = mat('#f4f4f4');
    const wings = [-1, 1].map(s => { const w = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0008, 0.004), wm); w.geometry.translate(s * 0.006, 0, 0); b.add(w); return w; });
    gulls.add(b); return { b, wings, r: 0.08 + (i % 3) * 0.05, h: 0.12 + (i % 2) * 0.04, sp: 0.35 + i * 0.05, ph: i * 1.3 };
  });
  gulls.userData.anim = t => gullList.forEach(gl => {
    const a = t * gl.sp + gl.ph, x = 0.12 + Math.cos(a) * gl.r, z = 0.45 + Math.sin(a) * gl.r * 0.7;
    gl.b.position.set(x, sag(x, z) + gl.h, z); gl.b.rotation.y = -a; const f = Math.sin(t * 9 + gl.ph) * 0.5;
    gl.wings[0].rotation.z = f; gl.wings[1].rotation.z = -f;
  });
  animated.push(gulls);

  // ── Trabalhadores de colete e capacete e caminhões.
  const vests = ['#ff8a2a', '#ffd23f', '#3ee07a'];
  walkers(g, [[[-0.25, 0.4355], [0.35, 0.4355], [0.35, 0.438], [-0.25, 0.438]]], 3, vests, bTop, '#f4f4f4');
  walkers(g, [[[-0.24, -0.06], [0.16, -0.06], [0.16, -0.056], [-0.24, -0.056]]], 3, vests, gy, '#ffd23f');
  walkers(g, [[[0.21, 0.085], [0.5, 0.085], [0.5, 0.09], [0.21, 0.09]]], 2, vests, gy, '#f4f4f4');
  const truck = (color) => { const tr = new THREE.Group();
    box(0.012, 0.012, 0.012, color, 0.016, 0.002, 0, tr); box(0.004, 0.006, 0.011, '#1d2b3d', 0.0215, 0.007, 0, tr);
    box(0.03, 0.003, 0.012, C.dark, -0.006, 0.002, 0, tr); box(0.028, 0.012, 0.012, ['#e8452f', '#2f6fb8', '#3aa58c'][Math.floor(R() * 3)], -0.006, 0.005, 0, tr);
    compact(tr); g.add(tr); return tr; };
  [[RZ, -0.26, 0.5, 0.09, '#ffd23f'], [0.072, 0.2, 0.52, 0.12, C.white]].forEach(([z, x0, x1, sp, c], i) => {
    const tr = truck(c);
    tr.userData.anim = t => { const u = Math.sin(t * sp + i * 2), x = mix(x0, x1, (u + 1) / 2), dir = Math.cos(t * sp + i * 2) >= 0 ? 1 : -1, zz = z - dir * 0.005; tr.position.set(x, gy(x, zz), zz); tr.rotation.y = dir > 0 ? 0 : Math.PI; };
    animated.push(tr);
  });
}

// Coloca um barco em (x, z) apoiado na superfície curva, com a proa em yaw (0 = +x) e um leve balanço lateral.
const UPV = new THREE.Vector3(0, 1, 0), nrm = new THREE.Vector3(), qy = new THREE.Quaternion(), qr = new THREE.Quaternion();
function shipPose(o, x, z, yaw, y, roll) {
  nrm.set(x, 1.6, z).normalize();
  o.quaternion.setFromUnitVectors(UPV, nrm).multiply(qy.setFromAxisAngle(UPV, yaw)).multiply(qr.setFromAxisAngle(new THREE.Vector3(1, 0, 0), roll));
  o.position.set(x, y, z);
}

export { buildPort };
