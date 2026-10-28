import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TAU, smooth } from '../../core/math.js';
import { small } from '../../core/quality.js';
import { box, cityFloor, compact, cyl, draped, hipRoof, liftBox, mat, road, roundedPad, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { confetti, lamp, palm, tree, waveFlag, zebra } from '../props.js';
import { animated, fxT, zoneFx } from '../runtime.js';
import { facadeMat, maranhaoTex, stoneTex } from '../textures.js';
import { trafficLoop } from '../vehicles.js';

// Centro Histórico de São Luís em miniatura, organizado em quadras (inspirado no mapa real):
// cidade alta na colina (Rua Portugal com casarões, Catedral da Sé, Praça Dom Pedro II e o Palácio dos Leões
// virado para o mar, mirante com luminárias e escadaria); cidade baixa dentro de um circuito de mão dupla
// (quadra da Praia Grande, jardim e a Praça Maria Aragão com o boi, a bandeira e o público); calçadão da
// Beira-Mar na margem do Rio Anil e a Ponte do São Francisco até o bairro novo do outro lado.
function buildCentro(g, zi) {
  // Alturas da cidade baixa acima do terreno (o relevo do planeta fica ~0.004 acima de sag):
  // piso geral 0.0075, calçadas e quadras FL..FL+0.002, asfalto até FL+0.003.
  const T = 0.03, FL = 0.0085, top = (x, z) => sag(x, z) + T, low = (x, z) => sag(x, z) + FL + 0.002;
  cityFloor(g, 0.56, 0.0075, [0.249, 0.452]);
  const facades = [facadeMat('#2f6fb8', '#d8e8ff', '#1f4a36'), facadeMat('#f2c14e', null, '#2c5b4a'), facadeMat('#f6dccd', '#3f7fc4', '#6a3b28'), facadeMat('#a5dccb', null, '#3a2a22'), facadeMat('#eef4fb', '#2f6fb8', '#1f4a36'), facadeMat('#e98a6b', null, '#2c3e5b')];
  const flagCols = [C.coral, C.amber, C.teal, C.violet, C.tile, '#ffffff'];
  const casarao = (x, z, w, d, h, k, yAt, rot = 0) => {
    const y = yAt(x, z), m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facades[k % facades.length]); m.position.set(x, y + h / 2, z); m.rotation.y = rot; g.add(m);
    const roof = hipRoof(w + 0.008, d + 0.008, 0.02, C.terracotta); roof.rotation.y = rot; roof.position.set(x, y + h + 0.01, z); g.add(roof);
  };
  // ── Cidade alta: colina de pedra.
  const HX0 = -0.44, HX1 = -0.08, HZ0 = -0.44, HZ1 = 0.3, hcx = (HX0 + HX1) / 2, hcz = (HZ0 + HZ1) / 2;
  const hill = new THREE.Mesh(new THREE.BoxGeometry(HX1 - HX0, T, HZ1 - HZ0, 18, 1, 36), new THREE.MeshStandardMaterial({ map: stoneTex('#b3a690', '#cdc1aa', '#a08f78', 5, 10), roughness: 0.95 }));
  { const p = hill.geometry.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + sag(p.getX(i) + hcx, p.getZ(i) + hcz)); hill.geometry.computeVertexNormals(); }
  hill.position.set(hcx, T / 2, hcz); g.add(hill);
  // Rua Portugal (ao longo de z) e rua transversal, de pedra mais escura.
  draped(0.04, 0.002, 0.72, '#8f877c', -0.27, -0.07, g, T);
  draped(0.34, 0.002, 0.03, '#8f877c', -0.26, -0.14, g, T);
  // Casarões da fileira oeste (frente para a Rua Portugal) e da fileira leste (metade sul).
  [-0.33, -0.27, -0.21, -0.09, -0.03, 0.03, 0.09, 0.15, 0.21, 0.27].forEach((z, i) => casarao(-0.33, z, 0.07, 0.056, 0.07 + (i % 3) * 0.015, i, top));
  [-0.09, -0.03, 0.03, 0.09].forEach((z, i) => casarao(-0.21, z, 0.07, 0.056, 0.075 + (i % 2) * 0.015, i + 3, top));
  for (let i = 0; i < 4; i++) tree(g, -0.41, -0.3 + i * 0.17, 0.8);
  // Catedral da Sé no topo da Rua Portugal.
  const sz0 = -0.41, sy0 = top(-0.27, sz0);
  box(0.1, 0.075, 0.045, C.white, -0.27, sy0, sz0, g);
  for (const x of [-0.305, -0.235]) { box(0.025, 0.12, 0.025, C.white, x, sy0, sz0 + 0.012, g); const sp = new THREE.Mesh(new THREE.ConeGeometry(0.019, 0.035, 4), mat(C.terracotta)); sp.rotation.y = Math.PI / 4; sp.position.set(x, sy0 + 0.137, sz0 + 0.012); g.add(sp); }
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.005, 3), mat(C.white)); gable.rotation.x = -Math.PI / 2; gable.position.set(-0.27, sy0 + 0.093, sz0 + 0.02); g.add(gable);
  box(0.02, 0.035, 0.003, '#5a3a2a', -0.27, sy0, sz0 + 0.023, g);
  // Praça Dom Pedro II e Palácio dos Leões (fachada para a praça, fundos para o mar).
  draped(0.075, 0.002, 0.18, '#e9e1d2', -0.207, -0.27, g, T);
  for (const z of [-0.33, -0.27, -0.21]) tree(g, -0.225, z, 0.7, '#2f9b7a');
  const palace = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.055, 0.17), facadeMat('#f4f1ea', null, '#4a6a8a')); palace.position.set(-0.125, top(-0.125, -0.28) + 0.0275, -0.28); g.add(palace);
  const proof = hipRoof(0.073, 0.178, 0.022, C.terracotta); proof.position.set(-0.125, top(-0.125, -0.28) + 0.055 + 0.011, -0.28); g.add(proof);
  box(0.012, 0.06, 0.05, C.white, -0.162, top(-0.162, -0.28), -0.28, g);
  for (const z of [-0.31, -0.25]) {                                                         // leões na entrada
    const ly = top(-0.18, z); box(0.012, 0.01, 0.012, '#cbbfa8', -0.18, ly, z, g);
    box(0.012, 0.008, 0.007, '#d8c9a8', -0.18, ly + 0.01, z, g);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), mat('#d8c9a8')); head.position.set(-0.186, ly + 0.022, z); g.add(head);
  }
  // Mirante na beira da colina: balaustrada e luminárias (com vão para a escadaria).
  draped(0.15, 0.002, 0.12, '#e9e1d2', -0.165, 0.22, g, T);
  for (let z = -0.42; z <= 0.29; z += 0.03) if (z < 0.17 || z > 0.23) box(0.003, 0.012, 0.024, C.white, -0.085, top(-0.085, z), z, g);
  for (let z = -0.4; z <= 0.29; z += 0.1) if (z < 0.16 || z > 0.24) lamp(g, -0.095, z, top(-0.095, z));
  for (const z of [-0.36, -0.24, -0.06, 0.06, 0.18]) { lamp(g, -0.292, z, top(-0.292, z), 0.045); lamp(g, -0.248, z, top(-0.248, z), 0.045); }
  // Bandeirinhas de São João cruzando a Rua Portugal.
  for (const z of [-0.06, 0.12]) for (let i = 0; i < 7; i++) { const x = -0.288 + i * 0.006, f = new THREE.Mesh(new THREE.ConeGeometry(0.004, 0.009, 3), mat(flagCols[(i + (z > 0 ? 2 : 0)) % 6])); f.rotation.x = Math.PI; f.position.set(x, top(x, z) + 0.085 - Math.sin(i / 6 * Math.PI) * 0.01, z); g.add(f); }
  // Escadaria do mirante até a calçada da cidade baixa.
  for (let i = 0; i < 6; i++) { const x = -0.078 + i * 0.006; box(0.006, T * (1 - i / 6), 0.045, '#e8dfcf', x, sag(x, 0.2), 0.2, g); }

  // ── Cidade baixa: circuito de mão dupla em volta das quadras (Av. Beira-Mar a leste).
  const RX0 = -0.03, RX1 = 0.2, RZ0 = -0.42, RZ1 = 0.38, loop = [[RX0, RZ0], [RX1, RZ0], [RX1, RZ1], [RX0, RZ1]];
  draped(0.024, 0.002, 0.82, '#e6ddcc', -0.058, -0.02, g, FL);                            // calçada ao pé da colina
  draped(RX1 - RX0 - 0.026, 0.002, RZ1 - RZ0 - 0.026, '#e3dbcc', (RX0 + RX1) / 2, (RZ0 + RZ1) / 2, g, FL);
  loop.forEach((a, i) => { const b = loop[(i + 1) % 4]; road(g, a[0], a[1], b[0], b[1], 0.026, FL); });
  zebra(g, RX0, 0.2, false, 5, FL); zebra(g, RX1, 0.2, false, 5, FL); zebra(g, RX1, -0.2, false, 5, FL); zebra(g, RX0, -0.2, false, 5, FL);
  trafficLoop(g, loop, [{ off: 0.0065, dir: 1, n: 7, speed: 0.05 }, { off: 0.0065, dir: -1, n: 6, speed: 0.045 }], FL + 0.003);
  // Quadra da Praia Grande: duas fileiras de casarões com um beco de pedestres no meio.
  for (let i = 0; i < 6; i++) { const z = -0.36 + i * 0.06; casarao(0.035, z, 0.05, 0.054, 0.06 + (i % 2) * 0.016, i + 1, sag); casarao(0.135, z, 0.05, 0.054, 0.066 + ((i + 1) % 2) * 0.014, i + 4, sag); }
  draped(0.04, 0.002, 0.36, '#a9a297', 0.085, -0.21, g, FL + 0.0006);
  // Praça Maria Aragão, agora ocupando toda a metade sul da quadra: piso de pedra portuguesa com ondas e a
  // estrela do Maranhão no centro, palco sob a marquise curva ao norte, o boi no meio com o público em
  // meia-lua aberta para o palco, bandeira do Maranhão, chafariz, bancos, árvores e postes no contorno.
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
  const SZ = PZ - HZ + 0.042;                                                                 // palco ao norte
  box(0.09, 0.009, 0.03, C.ice, PX, py(PX, SZ), SZ, g);
  box(0.09, 0.03, 0.004, '#1e4488', PX, py(PX, SZ - 0.015), SZ - 0.015, g);
  const marq = new THREE.BoxGeometry(0.15, 0.004, 0.045, 40, 1, 1), mp = marq.attributes.position;
  for (let i = 0; i < mp.count; i++) { const x = mp.getX(i); mp.setY(i, mp.getY(i) + 0.06 * Math.max(0, Math.sin(Math.PI * (x + 0.075) / 0.15)) ** 0.8); }
  marq.computeVertexNormals();
  const marquee = new THREE.Mesh(marq, mat(C.white)); marquee.position.set(PX, py(PX, SZ), SZ); g.add(marquee);
  waveFlag(g, PX + 0.05, PZ - 0.075, 0.17, maranhaoTex(), 0.09);
  // Chafariz ao sul, com bancos virados para ele, e árvores nos cantos.
  const FZ = PZ + HZ - 0.04, fy = py(PX, FZ);
  cyl(0.024, 0.006, '#e9e1d2', PX, fy, FZ, g, 24);
  const agua = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.002, 24), mat('#5fd3f0', { emissive: '#00b7e3', emissiveIntensity: 0.35 })); agua.position.set(PX, fy + 0.006, FZ); g.add(agua);
  cyl(0.003, 0.016, '#e9e1d2', PX, fy, FZ, g, 8);
  const jato = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.02, 10, 1, true), mat('#bff3ff', { emissive: '#7fe9ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.75 })); jato.rotation.x = Math.PI; jato.position.set(PX, fy + 0.026, FZ); g.add(jato);
  for (const s of [-1, 1]) { box(0.006, 0.005, 0.026, '#a07a5a', PX + s * 0.042, py(PX + s * 0.042, FZ), FZ, g); box(0.026, 0.005, 0.006, '#a07a5a', PX, py(PX, FZ + s * 0.04), FZ + s * 0.04, g); }
  for (const [x, z] of [[PX - 0.052, FZ + 0.03], [PX + 0.052, FZ + 0.03], [PX - 0.06, PZ - 0.07], [PX + 0.06, PZ + 0.075]]) tree(g, x, z, 0.75, '#2f9b7a');
  for (const z of [PZ - 0.1, PZ + 0.02, PZ + 0.13]) for (const s of [-1, 1]) lamp(g, PX + s * (HX - 0.004), z, py(PX + s * (HX - 0.004), z));
  const boi = new THREE.Group(), by = py(PX, PZ + 0.01); boi.position.set(PX, by, PZ + 0.01); boi.scale.setScalar(1.25); g.add(boi);
  const saia = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.034, 0.03, 14), mat(C.coral)); saia.position.y = 0.017; boi.add(saia);
  for (let k = 0; k < 14; k++) { const a = k / 14 * TAU, fita = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.026, 0.002), mat(flagCols[k % 6])); fita.position.set(Math.cos(a) * 0.034, 0.014, Math.sin(a) * 0.034); fita.rotation.y = -a; boi.add(fita); }
  const corpo = new THREE.Mesh(new RoundedBoxGeometry(0.06, 0.024, 0.036, 2, 0.009), mat('#1b1440')); corpo.position.y = 0.044; boi.add(corpo);
  for (let k = 0; k < 8; k++) { const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.003), mat('#ffd36b', { emissive: '#ffb347', emissiveIntensity: 1 })); s.position.set(-0.024 + k * 0.007, 0.057, (k % 2 ? 1 : -1) * 0.01); boi.add(s); }
  const cabeca = new THREE.Mesh(new THREE.BoxGeometry(0.019, 0.02, 0.02), mat('#1b1440')); cabeca.position.set(0.037, 0.06, 0); boi.add(cabeca);
  for (const s of [-1, 1]) { const ch = new THREE.Mesh(new THREE.ConeGeometry(0.0026, 0.015, 5), mat(C.white)); ch.position.set(0.04, 0.075, s * 0.008); ch.rotation.x = s * 0.5; boi.add(ch); }
  const estrela = new THREE.Mesh(new THREE.OctahedronGeometry(0.0035), mat(C.white, { emissive: '#ffffff', emissiveIntensity: 0.6 })); estrela.position.set(0.047, 0.063, 0); boi.add(estrela);
  compact(boi);
  const party = confetti(g, PX, by + 0.09, PZ + 0.01);
  boi.userData.anim = t => {
    const f = fxT(zi), k = f < 0 ? 0 : smooth(0, 0.5, f) * (1 - smooth(8, 9, f));
    if (f >= 0 && party.userData.at !== zoneFx[zi]) party.userData.at = zoneFx[zi];
    boi.position.y = by + Math.abs(Math.sin(t * 6)) * 0.015 * k;
    boi.rotation.y = -0.6 + k * Math.sin(t * 2.6) * 1.1;
    boi.rotation.z = Math.sin(t * 2) * 0.03 + k * Math.sin(t * 6) * 0.14;
  };
  animated.push(boi);
  // Público em meia-lua, sem invadir o palco nem a bandeira.
  const spots = [];
  const nP = small ? 16 : 26, a0 = -Math.PI / 2 + 0.85, a1 = 1.5 * Math.PI - 0.85;           // aberta para o palco (−z)
  for (let k = 0; k < nP; k++) { const a = a0 + k / (nP - 1) * (a1 - a0), r = k % 2 ? 0.062 : 0.052; spots.push([PX + Math.cos(a) * r, PZ + 0.01 + Math.sin(a) * r]); }
  crowd(g, spots, zi, [C.coral, C.amber, C.teal, C.violet, C.white, '#e8452f'], { yAt: py });
  // ── Calçadão da Beira-Mar e mureta na margem do rio, com palmeiras fora do caminho.
  draped(0.032, 0.002, 0.82, '#f2ece0', 0.229, -0.02, g, FL);
  draped(0.004, 0.012, 0.82, '#cbbfa8', 0.247, -0.02, g, FL);
  for (let z = -0.38; z <= 0.36; z += 0.11) if (Math.abs(z + 0.12) > 0.04) { palm(g, 0.243, z, 0.09); lamp(g, 0.216, z + 0.055, low(0.216, z + 0.055), 0.04); }
  // ── Ponte do São Francisco: rampas, pilares, guarda-corpo e postes; carros vão e voltam.
  // O tabuleiro começa na altura do asfalto do circuito e sobe sobre o rio.
  const BZ = -0.12, BY = 0.024, lift = x => FL + BY * smooth(0.205, 0.26, x) * (1 - smooth(0.45, 0.5, x));
  liftBox(0.205, 0.5, BZ, 0.036, 0.004, lift, mat('#7b818c'), g);
  for (let x = 0.215; x < 0.495; x += 0.02) box(0.008, 0.0008, 0.0015, '#f2f2f2', x, sag(x, BZ) + lift(x) + 0.004, BZ, g);
  for (const s of [-1, 1]) liftBox(0.21, 0.495, BZ + s * 0.017, 0.002, 0.006, x => lift(x) + 0.004, mat(C.white), g);
  for (let x = 0.27; x <= 0.44; x += 0.034) for (const s of [-1, 1]) box(0.006, BY + 0.05, 0.006, '#c3cad3', x, sag(x, BZ) - 0.05, BZ + s * 0.011, g);
  for (let x = 0.28; x <= 0.44; x += 0.055) for (const s of [-1, 1]) lamp(g, x, BZ + s * 0.019, sag(x, BZ) + lift(x) + 0.004, 0.03);
  trafficLoop(g, [[0.216, BZ - 0.007], [0.505, BZ - 0.007], [0.505, BZ + 0.007], [0.216, BZ + 0.007]], [{ off: 0, dir: 1, n: 5, speed: 0.045, bus: false }], (x) => lift(x) + 0.004);
  // ── Bairro novo do outro lado do rio (São Francisco).
  [[0.5, -0.3, 0.12], [0.52, -0.22, 0.08], [0.5, -0.03, 0.1], [0.53, 0.05, 0.14], [0.5, 0.14, 0.07]].forEach(([x, z, h], i) => {
    box(0.034, h, 0.034, [C.white, C.ice, '#cfd8e6'][i % 3], x, sag(x, z), z, g);
    box(0.036, 0.006, 0.036, '#9fe9ff', x, sag(x, z) + h * 0.7, z, g, { emissive: '#3fbfe8', emissiveIntensity: 0.5 });
  });
  // ── Pedestres: cada um no seu caminho, longe de carros, postes e palmeiras.
  const ppl = [C.coral, C.amber, C.teal, C.violet, C.white, '#e8452f', '#1e4488'];
  walkers(g, [[[-0.279, -0.38], [-0.279, 0.29], [-0.261, 0.29], [-0.261, -0.38]]], 8, ppl, top);                        // Rua Portugal
  walkers(g, [[[-0.42, -0.147], [-0.1, -0.147], [-0.1, -0.133], [-0.42, -0.133]]], 4, ppl, top);                        // transversal
  walkers(g, [[[-0.235, 0.17], [-0.105, 0.17], [-0.105, 0.27], [-0.235, 0.27]]], 4, ppl, top);                          // mirante
  walkers(g, [[[-0.058, -0.4], [-0.058, 0.36], [-0.054, 0.36], [-0.054, -0.4]]], 4, ppl, low);                          // calçada ao pé da colina
  walkers(g, [[[0.226, -0.4], [0.226, -0.15], [0.232, -0.15], [0.232, -0.4]], [[0.226, -0.09], [0.226, 0.37], [0.232, 0.37], [0.232, -0.09]]], 4, ppl, low); // calçadão
  walkers(g, [[[-0.004, -0.395], [0.174, -0.395], [0.174, 0.355], [-0.004, 0.355]]], 8, ppl, low);                      // calçadas da cidade baixa
  walkers(g, [[[0.08, -0.38], [0.08, -0.04], [0.09, -0.04], [0.09, -0.38]]], 4, ppl, low);                                // beco da Praia Grande
  walkers(g, [[[PX - 0.03, SZ + 0.03], [PX + 0.03, SZ + 0.03], [PX + 0.03, SZ + 0.04], [PX - 0.03, SZ + 0.04]]], 3, ppl, py); // diante do palco
}

export { buildCentro };
