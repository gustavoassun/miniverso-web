import * as THREE from 'three';
import { TAU, mix, smooth } from '../../core/math.js';
import { box, cyl, draped, mat, road, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { confetti, lamp, palm, tree, waveFlag } from '../props.js';
import { animated, fxT, fxT2, fxT3, rt, zoneFx } from '../runtime.js';
import { canvasTex, glassMat, holoMat, plainFlag } from '../textures.js';
import { sailboat, trafficLoop } from '../vehicles.js';

// Negócios: Distrito de Negócios e Inovação, na beira de uma baía (o mar ocupa o lado leste da área, x > 0.33).
// Avenida em circuito com trânsito; dentro dela, as torres de vidro com a Torre Miniverso (coroa de LED nas cores
// da marca e elevador panorâmico), o hub de startups com jardim no teto, o parque com a fonte, o centro de
// convenções de teto curvo e a reunião ao ar livre com o projeto em holograma. Do lado de fora, o calçadão com
// palmeiras e a marina com veleiros. "Acender o skyline" acende as janelas, a coroa troca de cor e fachos de luz
// varrem o céu. O relevo fica ~4 mm acima da base da área: o piso vai a +0.0058 e os objetos partem de +0.0042.
const Y = (x, z) => sag(x, z) + 0.0042;
const BAY = 0.33;

function districtFloor(g, r) {
  const S = 512, k = S / (2 * r), px = u => (u + r) * k;
  const tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#dfe3e8'; x.fillRect(0, 0, w, h);
    x.strokeStyle = '#c9cfd7'; x.lineWidth = 1;
    for (let i = 0; i <= w; i += 10) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    // Praça central: piso de granito em placas, quatro gramados arredondados com bordas de flores, caminhos em
    // curva e a roda de pedra em volta da fonte com desenho radial.
    const P0x = -0.205, P0z = -0.045, PWd = 0.25, PDp = 0.21, FX = -0.08, FZ = 0.06;
    x.fillStyle = '#e9e5de'; x.beginPath(); x.roundRect(px(P0x), px(P0z), PWd * k, PDp * k, 10); x.fill();
    x.strokeStyle = 'rgba(150,140,128,.35)'; x.lineWidth = 1; for (let i = 0; i <= PWd * k; i += 6) { x.beginPath(); x.moveTo(px(P0x) + i, px(P0z)); x.lineTo(px(P0x) + i, px(P0z) + PDp * k); x.stroke(); }
    const lawn = (x0, z0, w0, d0, r0) => { x.fillStyle = '#4fae73'; x.beginPath(); x.roundRect(px(x0), px(z0), w0 * k, d0 * k, r0 * k); x.fill(); x.fillStyle = '#5ec386'; x.beginPath(); x.roundRect(px(x0) + 2, px(z0) + 2, w0 * k - 4, d0 * k - 4, r0 * k); x.fill(); };
    lawn(P0x + 0.01, P0z + 0.01, 0.1, 0.08, 0.03); lawn(FX + 0.022, P0z + 0.01, 0.1, 0.08, 0.03); lawn(P0x + 0.01, FZ + 0.022, 0.1, 0.08, 0.03); lawn(FX + 0.022, FZ + 0.022, 0.1, 0.08, 0.03);
    x.fillStyle = '#dcd4c6'; x.beginPath(); x.arc(px(FX), px(FZ), 0.056 * k, 0, TAU); x.fill();
    x.strokeStyle = '#bfb3a0'; x.lineWidth = 1.5; for (let a = 0; a < 24; a++) { const t = a / 24 * TAU; x.beginPath(); x.moveTo(px(FX) + Math.cos(t) * 0.04 * k, px(FZ) + Math.sin(t) * 0.04 * k); x.lineTo(px(FX) + Math.cos(t) * 0.056 * k, px(FZ) + Math.sin(t) * 0.056 * k); x.stroke(); }
    x.beginPath(); x.arc(px(FX), px(FZ), 0.048 * k, 0, TAU); x.stroke();
    // Calçadão de pedra portuguesa (ondas) na beira da baía.
    x.fillStyle = '#f2ece0'; x.fillRect(px(0.27), 0, (BAY - 0.27 + 0.02) * k, h);
    x.strokeStyle = '#2a3446'; x.lineWidth = 2; for (let y = 0; y < h; y += 14) { x.beginPath(); for (let t = 0; t <= 1; t += 0.1) { const xx = px(0.275) + t * (BAY - 0.28) * k, yy = y + Math.sin(t * TAU) * 4; t ? x.lineTo(xx, yy) : x.moveTo(xx, yy); } x.stroke(); }
    // A baía: tudo a leste de BAY fica transparente (o mar do planeta aparece ali).
    x.clearRect(px(BAY + 0.012), 0, w, h);
    const gr = x.createRadialGradient(w / 2, h / 2, w * 0.42, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  const geo = new THREE.RingGeometry(0.0005, r, 96, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + 0.0058);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9 })));
}

function buildBusiness(g, zi) {
  districtFloor(g, 0.54);
  const glass = glassMat(), glass2 = glassMat();
  glass2.color.set('#bcd6f5');

  // ── Avenida em circuito, com faixas e trânsito nos dois sentidos.
  const loop = [[-0.38, -0.34], [0.22, -0.34], [0.22, 0.32], [-0.38, 0.32]];
  loop.forEach((a, i) => { const b = loop[(i + 1) % 4]; road(g, a[0], a[1], b[0], b[1], 0.026, 0.0046); });
  trafficLoop(g, loop, [{ off: 0.0065, dir: 1, n: 8, speed: 0.05 }, { off: 0.0065, dir: -1, n: 7, speed: 0.044 }], 0.0076);
  for (const [x, z] of [[-0.38, -0.34], [0.22, -0.34], [0.22, 0.32], [-0.38, 0.32]]) lamp(g, x + 0.018 * Math.sign(-x || 1), z + 0.018 * Math.sign(-z), Y(x, z), 0.05);

  // ── Torres de vidro (dentro do circuito, ao norte) e a Torre Miniverso.
  const towers = [[-0.3, -0.25, 0.22, 0.06, glass], [-0.21, -0.22, 0.3, 0.065, glass2], [0.04, -0.25, 0.26, 0.06, glass2], [0.13, -0.22, 0.18, 0.055, glass], [-0.3, -0.12, 0.15, 0.055, glass2], [0.13, -0.11, 0.14, 0.05, glass]];
  for (const [x, z, h, w, m] of towers) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), m); t.position.set(x, Y(x, z) + h / 2, z); g.add(t);
    box(w * 0.9, 0.01, w * 0.9, C.ice, x, Y(x, z) + h, z, g);
    box(w * 1.02, 0.012, w * 1.02, '#2a3446', x, Y(x, z), z, g);
  }
  const TX = -0.08, TZ = -0.18, TH = 0.42, ty = Y(TX, TZ);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.046, TH, 8), glass); tower.position.set(TX, ty + TH / 2, TZ); g.add(tower);
  for (let k = 1; k < 6; k++) { const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.047 - k * 0.0018, 0.047 - k * 0.0018, 0.004, 8), mat(C.ice)); ring.position.set(TX, ty + k * TH / 6, TZ); g.add(ring); }
  cyl(0.0018, 0.08, C.white, TX, ty + TH + 0.012, TZ, g, 5);
  const crownM = new THREE.MeshStandardMaterial({ color: '#00b7e3', emissive: '#00b7e3', emissiveIntensity: 1.6, roughness: 0.4 });
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.014, 8, 1, true), crownM); crown.position.set(TX, ty + TH - 0.01, TZ); crown.userData.keep = true; g.add(crown);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.004, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff4d4d', toneMapped: false })); beacon.position.set(TX, ty + TH + 0.094, TZ); beacon.userData.keep = true; g.add(beacon);
  const lift = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.018, 0.006), mat('#ffd28a', { emissive: '#ffb347', emissiveIntensity: 1.2 })); lift.userData.keep = true; g.add(lift);
  // Heliponto na torre mais alta do lado oeste.
  const padY = Y(-0.21, -0.22) + 0.311;
  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.003, 16), mat('#2a3446')); helipad.position.set(-0.21, padY, -0.22); g.add(helipad);
  box(0.004, 0.0012, 0.018, '#f2c14e', -0.217, padY + 0.0015, -0.22, g); box(0.004, 0.0012, 0.018, '#f2c14e', -0.203, padY + 0.0015, -0.22, g); box(0.014, 0.0012, 0.004, '#f2c14e', -0.21, padY + 0.0015, -0.22, g);
  // Fachos de luz do show do skyline.
  const beams = [[-0.21, -0.22], [0.04, -0.25], [TX, TZ], [-0.3, -0.25]].map(([x, z], k) => {
    const b = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.5, 12, 1, true), holoMat(['#00b7e3', '#8f84ff', '#ffffff', '#3ee0b5'][k], 0)); b.geometry.translate(0, 0.25, 0);
    b.position.set(x, Y(x, z) + 0.3, z); b.userData.keep = true; g.add(b); return b;
  });

  // ── Hub de startups com faixa de vidro, jardim no teto e painel de indicadores.
  const hx = 0.1, hz = 0.0, hy = Y(hx, hz);
  box(0.12, 0.055, 0.08, C.white, hx, hy, hz, g);
  box(0.122, 0.016, 0.082, '#9fe9ff', hx, hy + 0.024, hz, g, { emissive: '#3fbfe8', emissiveIntensity: 0.7 });
  box(0.11, 0.008, 0.07, '#5fbf8a', hx, hy + 0.055, hz, g);
  for (const [x, z] of [[0.07, -0.02], [0.13, 0.02], [0.1, -0.01]]) tree(g, x, z, 0.35, undefined, hy + 0.06);
  box(0.06, 0.008, 0.002, '#00b7e3', hx, hy + 0.043, hz + 0.041, g, { emissive: '#00b7e3', emissiveIntensity: 1.5 });

  // ── Praça central, como uma praça de centro empresarial: fonte de dois andares com anel de jatos e escultura,
  // bancos com encosto virados para a fonte, árvores copadas, canteiros com flores, pérgola com bancos, quiosque de
  // café com mesinhas e guarda-sóis, bicicletas de aluguel e gente sentada.
  const fx = -0.08, fz = 0.06, fy = Y(fx, fz);
  cyl(0.04, 0.009, '#cfd6de', fx, fy, fz, g, 32);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.002, 32), mat('#2a86c4', { emissive: '#0a5a8a', emissiveIntensity: 0.6, roughness: 0.1 })); water.position.set(fx, fy + 0.0085, fz); g.add(water);
  cyl(0.017, 0.016, '#e9eef5', fx, fy, fz, g, 20);
  const water2 = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.0015, 20), mat('#3aa0dc', { emissive: '#0a5a8a', emissiveIntensity: 0.6, roughness: 0.1 })); water2.position.set(fx, fy + 0.0158, fz); g.add(water2);
  const sculpt = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0016, 8, 24), mat('#c9d3dc', { metalness: 0.8, roughness: 0.25 })); sculpt.position.set(fx, fy + 0.027, fz); sculpt.rotation.y = 0.6; g.add(sculpt);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.034, 10, 1, true), holoMat('#bfefff', 0.6)); jet.geometry.translate(0, 0.017, 0); jet.position.set(fx, fy + 0.016, fz); jet.userData.keep = true; g.add(jet);
  const JN = 14, jets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0005, 0.0012, 0.018, 5).translate(0, 0.009, 0), holoMat('#d9f6ff', 0.7), JN); jets.frustumCulled = false; jets.userData.detail = true; g.add(jets);
  const jo = new THREE.Object3D();
  // Bancos com encosto em roda, virados para a fonte.
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * TAU + 0.26, bx0 = fx + Math.cos(a) * 0.064, bz0 = fz + Math.sin(a) * 0.064, by = Y(bx0, bz0), bench = new THREE.Group();
    bench.position.set(bx0, by, bz0); bench.rotation.y = -a + Math.PI / 2; g.add(bench);
    for (const [w0, h0, d0, x0, y0, z0, c] of [[0.022, 0.0016, 0.006, 0, 0.0045, 0, '#b07a4a'], [0.022, 0.006, 0.0014, 0, 0.008, 0.0028, '#b07a4a'], [0.0014, 0.0045, 0.005, -0.009, 0.00225, 0, '#3a3f4a'], [0.0014, 0.0045, 0.005, 0.009, 0.00225, 0, '#3a3f4a']]) { const m = new THREE.Mesh(new THREE.BoxGeometry(w0, h0, d0), mat(c)); m.position.set(x0, y0, z0); bench.add(m); }
  }
  crowd(g, [0, 2, 4].map(k => { const a = k / 6 * TAU + 0.26; return [fx + Math.cos(a) * 0.066, fz + Math.sin(a) * 0.066, Y(fx + Math.cos(a) * 0.066, fz + Math.sin(a) * 0.066) - 0.003]; }), zi, ['#1e4488', '#ffc56b', '#eef4fb']);
  // Árvores copadas (três bolas de folhagem) nos gramados e em volta da praça.
  const leafy = ['#2f8f5e', '#3aa56d', '#2c7f52', '#46b07a'];
  const copa = (x, z, s0) => { const y = Y(x, z); cyl(0.0035 * s0, 0.028 * s0, C.trunk, x, y, z, g, 6); for (const [dx, dy, dz, r] of [[0, 0.04, 0, 0.019], [0.01, 0.034, 0.006, 0.014], [-0.009, 0.036, -0.006, 0.015]]) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s0, 1), mat(leafy[Math.floor((x * 97 + z * 61 + r * 1000) % 4 + 4) % 4], { flatShading: true })); b.position.set(x + dx * s0, y + dy * s0, z + dz * s0); g.add(b); } };
  for (const [x, z, s0] of [[-0.17, -0.02, 0.95], [-0.17, 0.14, 1], [0.01, 0.14, 0.9], [0.01, -0.02, 0.95], [-0.08, -0.03, 0.75], [-0.19, 0.06, 0.8], [0.03, 0.06, 0.8]]) copa(x, z, s0);
  // Canteiros com flores (instâncias) na borda dos gramados.
  const FL = 70, flowers = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0024, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), FL); flowers.userData.detail = true; g.add(flowers);
  const flc = ['#ff7bb0', '#ffd23f', '#ffffff', '#b07cff', '#ff8a2a'].map(h => new THREE.Color(h));
  for (let i = 0; i < FL; i++) { const q = i % 4, t = (i >> 2) / (FL / 4), lx = (q % 2 ? fx + 0.022 : -0.195) + t * 0.1, lz = (q < 2 ? -0.035 : fz + 0.022) + (i % 2 ? 0.003 : 0.077); jo.position.set(lx, Y(lx, lz) + 0.0028, lz); jo.rotation.set(i, i * 2, 0); jo.scale.setScalar(0.8 + (i % 3) * 0.2); jo.updateMatrix(); flowers.setMatrixAt(i, jo.matrix); flowers.setColorAt(i, flc[i % flc.length]); }
  // Pérgola de madeira com bancos no lado norte da praça.
  const PGx = -0.13, PGz = -0.04;
  for (const dx of [-0.04, 0, 0.04]) for (const dz of [-0.006, 0.006]) cyl(0.0012, 0.026, '#7a5b45', PGx + dx, Y(PGx + dx, PGz + dz), PGz + dz, g, 5);
  for (let i = 0; i < 9; i++) box(0.0016, 0.0016, 0.02, '#a07a5a', PGx - 0.04 + i * 0.01, Y(PGx, PGz) + 0.026, PGz, g);
  box(0.086, 0.002, 0.002, '#a07a5a', PGx, Y(PGx, PGz) + 0.025, PGz - 0.006, g); box(0.086, 0.002, 0.002, '#a07a5a', PGx, Y(PGx, PGz) + 0.025, PGz + 0.006, g);
  // Quiosque de café com mesinhas e guarda-sóis coloridos.
  const KX = 0.025, KZ = 0.105, ky = Y(KX, KZ);
  box(0.024, 0.018, 0.016, '#ffffff', KX, ky, KZ, g); box(0.026, 0.008, 0.002, '#9fe9ff', KX, ky + 0.007, KZ - 0.0085, g, { emissive: '#3fbfe8', emissiveIntensity: 0.4 });
  box(0.03, 0.003, 0.022, '#1e4488', KX, ky + 0.018, KZ, g);
  for (const [dx, dz, c] of [[-0.022, 0.012, '#ff8a6b'], [0.0, 0.022, '#00b7e3'], [0.022, 0.012, '#ffc56b']]) {
    const tx = KX + dx, tz = KZ + dz, tyy = Y(tx, tz);
    cyl(0.004, 0.0012, '#ffffff', tx, tyy + 0.006, tz, g, 10); cyl(0.0006, 0.006, '#3a3f4a', tx, tyy, tz, g, 4); cyl(0.0006, 0.022, '#e9eef5', tx, tyy, tz, g, 4);
    const um = new THREE.Mesh(new THREE.ConeGeometry(0.011, 0.005, 8), mat(c)); um.position.set(tx, tyy + 0.024, tz); g.add(um);
  }
  crowd(g, [[KX - 0.027, KZ + 0.013], [KX + 0.004, KZ + 0.027], [KX + 0.027, KZ + 0.012]].map(([x, z]) => [x, z, Y(x, z) - 0.002]), zi, ['#ff8a6b', '#2a3446', '#ffffff']);
  // Bicicletas de aluguel na estação ao lado da praça.
  for (let i = 0; i < 4; i++) { const x = -0.2 + i * 0.008, z = 0.168; const w = new THREE.Mesh(new THREE.TorusGeometry(0.003, 0.0006, 4, 10), mat('#ff8a2a')); w.position.set(x, Y(x, z) + 0.0032, z); w.rotation.y = Math.PI / 2; g.add(w); }
  box(0.04, 0.012, 0.002, '#1e4488', -0.188, Y(-0.188, 0.172), 0.172, g);
  for (const [x, z] of [[-0.205, -0.045], [0.045, -0.045], [-0.205, 0.165], [0.045, 0.165]]) lamp(g, x, z, Y(x, z), 0.046);
  const jetAnim = t => { for (let k = 0; k < JN; k++) { const a = k / JN * TAU; jo.position.set(fx + Math.cos(a) * 0.026, fy + 0.0088, fz + Math.sin(a) * 0.026); jo.rotation.set(-Math.sin(a) * 0.45, 0, Math.cos(a) * 0.45); jo.scale.set(1, 0.7 + 0.35 * Math.sin(t * 3 + k * 0.9), 1); jo.updateMatrix(); jets.setMatrixAt(k, jo.matrix); } jets.instanceMatrix.needsUpdate = true; };
  jets.userData.anim = jetAnim; animated.push(jets);

  // ── Centro de convenções: pavilhão de teto curvo e entrada de vidro.
  const cx = -0.28, cz = 0.18, cy = Y(cx, cz);
  box(0.16, 0.03, 0.1, C.white, cx, cy, cz, g);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.168, 24, 1, false, -Math.PI / 2, Math.PI), mat('#cfe3f2', { metalness: 0.3, roughness: 0.35 })); roof.rotation.z = Math.PI / 2; roof.scale.set(1, 1, 0.85); roof.position.set(cx, cy + 0.03, cz); g.add(roof);
  box(0.06, 0.024, 0.004, '#9fe9ff', cx, cy, cz + 0.051, g, { emissive: '#3fbfe8', emissiveIntensity: 0.6 });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.014), new THREE.MeshBasicMaterial({ map: canvasTex(200, 40, (x, w, h) => { x.fillStyle = '#1e1645'; x.fillRect(0, 0, w, h); x.fillStyle = '#00b7e3'; x.fillRect(0, h - 5, w, 5); x.fillStyle = '#ffffff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('INOVA EXPO', w / 2, h / 2 - 1); }), toneMapped: false }));
  banner.position.set(cx, cy + 0.034, cz + 0.0535); g.add(banner);
  waveFlag(g, cx - 0.06, cz + 0.08, 0.11, plainFlag('#00b7e3', '#ffffff'), 0.04); waveFlag(g, cx, cz + 0.085, 0.11, plainFlag('#1e4488', '#00b7e3'), 0.04); waveFlag(g, cx + 0.06, cz + 0.08, 0.11, plainFlag('#1e1645', '#ffc56b'), 0.04);

  // ── Reunião ao ar livre: deck, mesa, equipe e o projeto em holograma (Apresentar projeto em VR).
  const mx0 = 0.1, mz0 = 0.16, my0 = Y(mx0, mz0);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.006, 28), mat('#a07a5a')); deck.position.set(mx0, my0 + 0.003, mz0); g.add(deck);
  cyl(0.03, 0.018, C.white, mx0, my0 + 0.006, mz0, g, 24);
  const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.002, 16), mat('#7fe9ff', { emissive: '#00b7e3', emissiveIntensity: 1.5 })); projector.position.set(mx0, my0 + 0.025, mz0); g.add(projector);
  crowd(g, Array.from({ length: 6 }, (_, k) => { const a = k / 6 * TAU + 0.3; return [mx0 + Math.cos(a) * 0.045, mz0 + Math.sin(a) * 0.045, my0 + 0.006]; }), zi, ['#1e4488', '#2a3446', '#eef4fb', '#1e1645', '#7f8fa3', '#00b7e3']);
  const holo = new THREE.Group(), hY = my0 + 0.03; holo.position.set(mx0, hY, mz0); holo.userData.keep = true; g.add(holo);
  const model = [[0, 0, 0.05], [0.014, 0.008, 0.035], [-0.012, 0.01, 0.028], [0.006, -0.014, 0.042], [-0.014, -0.01, 0.02], [0.018, -0.008, 0.024]].map(([x, z, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1, 0.01), holoMat('#7fe9ff', 0.6)); b.geometry.translate(0, 0.5, 0); b.position.set(x, 0, z); b.userData.h = h; holo.add(b); return b;
  });
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0012, 6, 40), holoMat('#00b7e3', 0.8)); holoRing.rotation.x = Math.PI / 2; holo.add(holoRing);
  const cheer = confetti(g, mx0, my0 + 0.06, mz0);
  const panelTex = canvasTex(256, 150, (x, w, h) => {
    x.strokeStyle = '#00b7e3'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#00b7e3'; for (let i = 0; i < 6; i++) { const hh = 20 + ((i * 37) % 70); x.fillRect(22 + i * 22, h - 20 - hh, 14, hh); }
    x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.beginPath(); [[160, 110], [180, 90], [200, 98], [220, 60], [240, 40]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
    x.fillStyle = '#ffffff'; x.fillRect(22, 18, 90, 8); x.fillStyle = '#7fe9ff'; x.fillRect(22, 32, 60, 6);
  });
  const panelM = new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.064), panelM), py = my0 + 0.13; panel.position.set(mx0 + 0.02, py, mz0 - 0.07); panel.rotation.y = -0.3; g.add(panel);

  // ── Fora do circuito: calçadão com palmeiras e postes na beira da baía, e a marina com veleiros.
  for (let z = -0.4; z <= 0.41; z += 0.1) { palm(g, 0.285, z, 0.1, Y(0.285, z)); lamp(g, 0.31, z + 0.05, Y(0.31, z + 0.05), 0.045); }
  draped(0.004, 0.012, 0.86, '#cbbfa8', BAY + 0.004, 0, g, 0.004);
  const pierY = Y(0.4, 0.08) + 0.004;
  box(0.12, 0.004, 0.018, '#a07a5a', 0.39, pierY, 0.08, g);
  for (const zz of [0.04, 0.12]) box(0.07, 0.004, 0.01, '#a07a5a', 0.4, pierY, zz, g);
  for (let i = 0; i < 6; i++) cyl(0.002, 0.016, '#7a5b45', 0.34 + i * 0.02, pierY - 0.012, 0.072, g, 5);
  const boats = [[0.42, 0.03, '#ff8a6b', 0.4], [0.44, 0.13, '#00b7e3', 1.8], [0.47, -0.12, '#ffffff', 3.1], [0.45, 0.27, '#ffc56b', 4.2]].map(([x, z, c, ph]) => {
    const b = new THREE.Group(); b.position.set(x, sag(x, z) - 0.0062, z); b.rotation.y = ph; b.add(sailboat(c)); b.userData.keep = true; g.add(b); return { b, ph, y: sag(x, z) - 0.0062 };
  });
  // Escritórios menores do lado oeste, fora da avenida.
  for (const [x, z, h] of [[-0.46, -0.12, 0.08], [-0.46, 0.0, 0.06], [-0.46, 0.12, 0.09]]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.05, h, 0.06), glass2); t.position.set(x, Y(x, z) + h / 2, z); g.add(t); box(0.046, 0.008, 0.056, C.ice, x, Y(x, z) + h, z, g); }
  for (const [x, z] of [[-0.1, -0.44], [0.08, -0.44], [-0.28, -0.44], [-0.1, 0.42], [0.08, 0.42]]) tree(g, x, z, 0.85, undefined, Y(x, z));

  // ── Pessoas nas calçadas e no parque.
  walkers(g, [[[-0.36, -0.315], [0.2, -0.315], [0.2, 0.295], [-0.36, 0.295]], [[0.272, -0.42], [0.272, 0.42], [0.3, 0.42], [0.3, -0.42]]], 7, ['#1e4488', '#2a3446', '#eef4fb', '#00b7e3', '#ffc56b', '#7f8fa3'], (x, z) => Y(x, z) + 0.0016);
  walkers(g, [Array.from({ length: 16 }, (_, i) => { const a = i / 16 * TAU; return [fx + Math.cos(a) * 0.052, fz + Math.sin(a) * 0.052]; })], 5, ['#ff8a6b', '#1e4488', '#ffffff', '#3aa58c'], (x, z) => Y(x, z) + 0.0016);

  // ── Drones de entrega e helicóptero.
  const drones = [0, 1].map(k => {
    const d = new THREE.Group(); d.userData.keep = true; g.add(d);
    box(0.016, 0.005, 0.016, C.dark, 0, 0, 0, d); box(0.01, 0.01, 0.01, k ? '#7fbfe8' : '#c8a06a', 0, -0.012, 0, d);
    const props = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.001, 10), holoMat('#ffffff', 0.5)); p.position.set(a * 0.011, 0.005, b * 0.011); d.add(p); return p; });
    return { d, props, k };
  });
  const heli = new THREE.Group(); heli.userData.keep = true; g.add(heli);
  const hb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat('#e8452f')); hb.scale.set(1.4, 0.9, 0.9); hb.position.y = 0.012; heli.add(hb);
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6), mat('#9fe9ff', { emissive: '#3fbfe8', emissiveIntensity: 0.5 })); win.position.set(0.009, 0.014, 0); heli.add(win);
  box(0.03, 0.004, 0.004, '#e8452f', -0.025, 0.012, 0, heli); box(0.003, 0.012, 0.002, C.white, -0.04, 0.012, 0, heli);
  for (const s of [-1, 1]) box(0.03, 0.002, 0.002, C.dark, 0, 0, s * 0.008, heli);
  const rotor = new THREE.Group(); rotor.position.y = 0.026; heli.add(rotor);
  for (const a of [0, Math.PI / 2]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.001, 0.004), mat(C.dark)); bl.rotation.y = a; rotor.add(bl); }

  // ── Animações da área.
  const BEACON_ON = new THREE.Color('#ff4d4d'), BEACON_OFF = new THREE.Color('#4a1515');
  const crownCols = ['#00b7e3', '#8f84ff', '#3ee0b5', '#ffc56b', '#ff4fd8'].map(h => new THREE.Color(h)), tmpC = new THREE.Color();
  panel.userData.anim = t => {
    const f = fxT(zi), show = f < 0 ? 0 : smooth(0, 0.6, f) * (1 - smooth(10, 11, f));
    model.forEach((b, i) => { b.scale.y = Math.max(0.0001, b.userData.h * (f < 0 ? 0 : smooth(0.3 + i * 0.35, 0.9 + i * 0.35, f)) * show); });
    holo.rotation.y = t * 0.8; holoRing.material.opacity = 0.2 + 0.6 * show; holoRing.scale.setScalar(0.8 + 0.4 * show);
    if (f >= 0 && f > 2.6 && cheer.userData.at < zoneFx[zi]) cheer.userData.at = rt.clock;
    panel.position.y = py + Math.sin(t * 1.2) * 0.005; panelM.opacity = 0.5 + 0.4 * show;
    lift.position.set(TX + 0.04, ty + 0.02 + (Math.sin(t * 0.5) * 0.5 + 0.5) * (TH - 0.06), TZ + 0.012);
    jet.scale.set(1, 0.7 + 0.3 * Math.sin(t * 5), 1);
    beacon.material.color.copy(Math.sin(t * 4) > 0 ? BEACON_ON : BEACON_OFF);
    // Skyline: janelas mais acesas, coroa trocando de cor e fachos varrendo o céu.
    const sk = fxT3(zi), lit = sk < 0 ? 0 : smooth(0, 1.2, sk) * (1 - smooth(12, 14, sk));
    glass.emissiveIntensity = glass2.emissiveIntensity = 0.45 + lit * 0.9;
    const ci = ((t * (0.3 + lit * 1.2)) % crownCols.length + crownCols.length) % crownCols.length || 0, i0 = Math.floor(ci) % crownCols.length, c0 = crownCols[i0], c1 = crownCols[(i0 + 1) % crownCols.length];
    tmpC.copy(c0).lerp(c1, ci % 1); crownM.color.copy(tmpC); crownM.emissive.copy(tmpC); crownM.emissiveIntensity = 1.4 + lit * 1.6;
    beams.forEach((b, i) => { b.material.opacity = lit * 0.16; b.rotation.set(Math.sin(t * 0.9 + i * 1.7) * 0.5 * lit, 0, Math.cos(t * 0.7 + i) * 0.5 * lit); });
    drones.forEach(({ d, props, k }) => { const a = t * (0.6 + k * 0.2) + k * 3; d.position.set(-0.05 + Math.cos(a) * (0.16 + k * 0.06), Y(-0.05, -0.05) + 0.24 + k * 0.05 + Math.sin(t * 1.7 + k) * 0.01, -0.05 + Math.sin(a) * (0.16 + k * 0.06)); d.rotation.y = -a; props.forEach(p => { p.rotation.y = t * 40; }); });
    boats.forEach(({ b, ph, y }) => { b.position.y = y + Math.sin(t * 1.4 + ph) * 0.002; b.rotation.z = Math.sin(t * 1.1 + ph) * 0.07; });
    const h2 = fxT2(zi), flying = h2 >= 0 && h2 < 12;
    const upK = flying ? smooth(0, 1.5, h2) * (1 - smooth(10.5, 12, h2)) : 0, orb = flying ? smooth(1.2, 3, h2) * (1 - smooth(9, 10.8, h2)) : 0, ang = (h2 - 1.2) * 0.8;
    heli.position.set(mix(-0.21, -0.05 + Math.cos(ang) * 0.26, orb), padY + 0.002 + upK * 0.16, mix(-0.22, -0.02 + Math.sin(ang) * 0.26, orb));
    heli.rotation.y = orb > 0.01 ? -ang - Math.PI / 2 : 0; heli.rotation.z = orb * 0.15;
    rotor.rotation.y = flying ? t * 40 : 0;
  };
  animated.push(panel);
}

export { buildBusiness };
