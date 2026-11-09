import * as THREE from 'three';
import { R, TAU, clamp, smooth } from '../../core/math.js';
import { box, cyl, draped, mat, road, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, figures, loopPath, walkers } from '../people.js';
import { confetti, lamp, nightSky, palm, waveFlag, zebra } from '../props.js';
import { animated, fxT, fxT2, fxT3, fxT4 } from '../runtime.js';
import { canvasTex, holoMat, maranhaoTex, plainFlag } from '../textures.js';
import { busParts, bx, paintGeo, trafficLoop, vehMat } from '../vehicles.js';

// Educação: Campus Miniverso, com vida. No fundo, a Escola Miniverso de verdade (dois andares, janelas, pátio
// coberto, bandeiras); à esquerda, a Universidade com colunas e frontão, gramado com estudantes e o palco da
// formatura; no meio, o Laboratório de VR imersivo (hologramas de planeta, DNA e átomo, alunos de óculos apontando);
// à direita, o Planetário com a cúpula que abre e telescópios no gramado; na frente, a quadra com placar, amarelinha,
// pula-corda e pipas (o recreio), a Ciência ao ar livre (horta, estufa, estação do tempo, painéis solares, lago com
// patos e trilha com plaquinhas) e a Rua da escola (faixa de pedestre, guarda de trânsito, ciclovia com alunos de
// bicicleta, bicicletário, ponto do ônibus escolar e carrinho de pipoca).
// Chão: o relevo fica ~4 mm acima da base da área. Pisos e pinturas acompanham a curva do planeta (draped/curvos);
// prédios largos partem do ponto mais baixo do chão embaixo deles (nenhuma quina flutuando ou enterrada).
const Y = (x, z) => sag(x, z) + 0.0042;
const FLOOR = 0.0058;
const ROAD_Z = 0.41, BIKE_Z = 0.36, RX = 0.36;                                       // rua e ciclovia até |x| 0,36 (dentro da parte plana)

// Piso do campus: grama com caminhos, praça central e calçada da rua; a borda some no terreno.
function campusFloor(g, r) {
  const S = 1024, k = S / (2 * r), px = u => (u + r) * k;
  const tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#62cf95'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,70,35,.07)'; x.fillRect(R() * w, R() * h, 3, 3); }
    x.lineCap = 'round'; x.lineJoin = 'round';
    const path = (pts, wd, c = '#efe6d3') => { x.strokeStyle = c; x.lineWidth = wd * k; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(px(a), px(b)) : x.moveTo(px(a), px(b)))); x.stroke(); };
    // Eixo do portão até a escola, caminhos para cada prédio e a calçada ao longo da rua.
    path([[0, 0.33], [0, -0.2]], 0.05);
    path([[-0.33, -0.17], [-0.12, -0.08], [0.12, -0.08], [0.32, -0.12]], 0.03);
    path([[-0.27, 0.06], [-0.1, 0.02]], 0.026); path([[0.12, 0.02], [0.27, 0.12]], 0.026);
    path([[-0.42, 0.2], [-0.12, 0.26], [0.12, 0.26], [0.42, 0.24]], 0.026);
    path([[-0.46, 0.335], [0.46, 0.335]], 0.034, '#e6dcc8');
    // Praça central (pedra clara com desenho de rosa dos ventos).
    x.fillStyle = '#efe6d3'; x.beginPath(); x.arc(px(0), px(-0.02), 0.085 * k, 0, TAU); x.fill();
    x.strokeStyle = '#d7c9ad'; x.lineWidth = 3; x.beginPath(); x.arc(px(0), px(-0.02), 0.06 * k, 0, TAU); x.stroke();
    x.fillStyle = '#5aa9e6'; for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; x.beginPath(); x.moveTo(px(0) + Math.cos(a) * 0.055 * k, px(-0.02) + Math.sin(a) * 0.055 * k); x.lineTo(px(0) + Math.cos(a + 0.5) * 0.015 * k, px(-0.02) + Math.sin(a + 0.5) * 0.015 * k); x.lineTo(px(0) + Math.cos(a - 0.5) * 0.015 * k, px(-0.02) + Math.sin(a - 0.5) * 0.015 * k); x.fill(); }
    // Pátio da escola (piso claro em frente ao prédio).
    x.fillStyle = '#e9e1cf'; x.fillRect(px(-0.16), px(-0.22), 0.32 * k, 0.08 * k);
    // Gramado da universidade, mais escuro e listrado.
    x.save(); x.beginPath(); x.roundRect(px(-0.44), px(-0.2), 0.24 * k, 0.16 * k, 0.03 * k); x.clip();
    for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? '#4fbf83' : '#57c88b'; x.fillRect(px(-0.44) + i * 0.015 * k, px(-0.2), 0.015 * k, 0.16 * k); }
    x.restore();
    // Trilha de terra da ciência ao ar livre.
    path([[-0.44, 0.06], [-0.36, 0.1], [-0.3, 0.06], [-0.22, 0.12], [-0.18, 0.2]], 0.014, '#c9a877');
    const gr = x.createRadialGradient(w / 2, h / 2, w * 0.44, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  tex.anisotropy = 8;
  const geo = new THREE.RingGeometry(0.0005, r, 112, 28); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + FLOOR);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.92 })));
}

// Pintura no chão que acompanha a curva (quadra, amarelinha, lago): plano curvado com textura.
function decal(g, w, d, x, z, lift, material) {
  const geo = new THREE.PlaneGeometry(w, d, Math.max(2, Math.round(w / 0.01)), Math.max(2, Math.round(d / 0.01))); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i) + x, p.getZ(i) + z) + lift);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, material); m.position.set(x, 0, z); g.add(m); return m;
}
// Prédio que parte do ponto mais baixo do chão embaixo dele (o planeta é curvo).
const baseY = (x, z, w, d) => Math.min(Y(x - w / 2, z - d / 2), Y(x + w / 2, z - d / 2), Y(x - w / 2, z + d / 2), Y(x + w / 2, z + d / 2)) - 0.0008;
function building(g, w, h, d, material, x, z) {
  const y0 = baseY(x, z, w, d), hh = h + (Y(x, z) - y0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), material); m.position.set(x, y0 + hh / 2, z); g.add(m);
  return Y(x, z) + h;                                                                          // altura do topo
}
// Fachada com janelas em fileiras (andares), faixa de base e cornija.
const windowsMat = (base, glass, frame, floors, cols) => new THREE.MeshStandardMaterial({ roughness: 0.75, map: canvasTex(cols * 24, floors * 40 + 12, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  x.fillStyle = 'rgba(0,0,0,.12)'; x.fillRect(0, h - 8, w, 8);
  x.fillStyle = frame; x.fillRect(0, 0, w, 4);
  for (let f = 0; f < floors; f++) for (let c = 0; c < cols; c++) {
    const wx = c * 24 + 5, wy = 10 + f * 40;
    x.fillStyle = frame; x.fillRect(wx - 2, wy - 2, 18, 26);
    x.fillStyle = glass; x.fillRect(wx, wy, 14, 22);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(wx + 1, wy + 1, 4, 20);
    x.fillStyle = frame; x.fillRect(wx + 6, wy, 2, 22); x.fillRect(wx, wy + 10, 14, 2);
  }
}) });
const label = (text, bg, fg, w = 256, h = 40, font = 'bold 24px sans-serif') => new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, (x, ww, hh) => {
  x.fillStyle = bg; x.fillRect(0, 0, ww, hh); x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, ww / 2, hh / 2 + 1);
}) });

function buildEducation(g, zi) {
  campusFloor(g, 0.56);
  // Árvore copada (tronco e três bolas de folhagem); com cor, vira um ipê florido.
  const copa = (x, z, s0 = 1, c) => {
    const y = Y(x, z), leafs = c ? [c, c, c] : ['#2f8f5e', '#3aa56d', '#2c7f52'];
    cyl(0.0035 * s0, 0.03 * s0, C.trunk, x, y, z, g, 6);
    [[0, 0.042, 0, 0.02], [0.011, 0.036, 0.006, 0.015], [-0.01, 0.038, -0.006, 0.016]].forEach(([dx, dy, dz, r], k) => { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s0, 1), mat(leafs[k], { flatShading: true })); b.position.set(x + dx * s0, y + dy * s0, z + dz * s0); g.add(b); });
  };
  const o = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  const anims = [];

  // ── 1. Escola Miniverso: prédio de dois andares, entrada com marquise, pátio coberto, bandeiras e portão.
  const SX = 0, SZ = -0.29;
  const schoolMat = windowsMat('#f4e7c8', '#7fc4ea', '#ffffff', 2, 14);
  const sTop = building(g, 0.34, 0.075, 0.085, schoolMat, SX, SZ);
  building(g, 0.07, 0.092, 0.092, windowsMat('#e8452f', '#9fe0ff', '#ffffff', 2, 3), SX, SZ);           // bloco da entrada
  box(0.352, 0.006, 0.097, '#ffffff', SX, sTop - 0.001, SZ, g);                                          // cornija
  box(0.33, 0.004, 0.08, '#c9d3dc', SX, sTop + 0.005, SZ, g);                                           // laje
  for (let i = 0; i < 6; i++) { const p = box(0.04, 0.003, 0.03, '#1e4488', SX - 0.12 + i * 0.048, sTop + 0.012, SZ - 0.01, g, { metalness: 0.5, roughness: 0.25 }); p.rotation.x = 0.35; } // painéis solares
  const signS = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.016), label('ESCOLA MINIVERSO', '#1e4488', '#ffffff', 320, 46, 'bold 26px sans-serif'));
  signS.position.set(SX, Y(SX, SZ) + 0.083, SZ + 0.0465); g.add(signS);
  // Marquise da entrada e pátio coberto (telhado leve sobre colunas finas, com bancos embaixo).
  const pz = -0.19, py = Y(0, pz);
  box(0.09, 0.004, 0.035, '#ffffff', SX, Y(SX, SZ + 0.06) + 0.04, SZ + 0.06, g);
  for (const sx of [-0.04, 0.04]) cyl(0.0022, 0.04, '#ffffff', sx, Y(sx, SZ + 0.075), SZ + 0.075, g, 6);
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.003, 0.06), mat('#00b7e3', { transparent: true, opacity: 0.6, depthWrite: false })); canopy.position.set(0.11, py + 0.05, pz + 0.002); canopy.userData.big = true; g.add(canopy);
  box(0.204, 0.004, 0.004, '#ffffff', 0.11, py + 0.048, pz - 0.028, g); box(0.204, 0.004, 0.004, '#ffffff', 0.11, py + 0.048, pz + 0.032, g);
  for (const cx of [0.02, 0.2]) for (const cz of [-0.215, -0.17]) cyl(0.0018, 0.05, '#e9eef5', cx, Y(cx, cz), cz, g, 6);
  for (const cx of [0.05, 0.11, 0.17]) { box(0.024, 0.004, 0.007, '#a07a5a', cx, Y(cx, -0.192) + 0.005, -0.192, g); box(0.024, 0.006, 0.0015, '#a07a5a', cx, Y(cx, -0.196) + 0.007, -0.196, g); }
  // Mastros: Brasil (verde e amarelo), Maranhão e a bandeira da escola.
  // Alinhados à esquerda da entrada, com espaço entre eles (as bandeiras não se cruzam) e base de pedra.
  box(0.1, 0.003, 0.014, '#d9cfbd', -0.15, Y(-0.15, -0.205) - 0.001, -0.205, g);
  [plainFlag('#1f9d55', '#ffd23f'), maranhaoTex(), plainFlag('#1e4488', '#00b7e3')].forEach((tex, k) => { const fx0 = -0.185 + k * 0.04; waveFlag(g, fx0, -0.205, 0.09 - Math.abs(k - 1) * 0.008, tex, 0.03); cyl(0.0035, 0.004, '#c9c2b4', fx0, Y(fx0, -0.205) + 0.001, -0.205, g, 10); });
  // Amarelinha pintada no pátio.
  decal(g, 0.025, 0.07, -0.07, -0.172, FLOOR + 0.0006, new THREE.MeshStandardMaterial({ roughness: 0.9, alphaTest: 0.5, map: canvasTex(48, 128, (x, w, h) => {
    const cs = ['#ffd23f', '#ff7bb0', '#00b7e3', '#3ee07a', '#ff8a2a', '#b07cff'];
    const sq = (cx, cy, n) => { x.fillStyle = cs[n % cs.length]; x.fillRect(cx - 9, cy - 9, 18, 18); x.strokeStyle = '#fff'; x.lineWidth = 2; x.strokeRect(cx - 9, cy - 9, 18, 18); x.fillStyle = '#fff'; x.font = 'bold 11px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(String(n + 1), cx, cy + 1); };
    sq(24, 116, 0); sq(24, 96, 1); sq(14, 76, 2); sq(34, 76, 3); sq(24, 56, 4); sq(14, 36, 5); sq(34, 36, 6); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(24, 14, 10, Math.PI, 0); x.fill();
  }) }));
  // Portão do campus com a placa, na calçada da rua.
  for (const s of [-1, 1]) { box(0.014, 0.06, 0.014, '#e9e1d2', s * 0.045, Y(s * 0.045, 0.325), 0.325, g); box(0.018, 0.006, 0.018, '#ffffff', s * 0.045, Y(s * 0.045, 0.325) + 0.06, 0.325, g); }
  box(0.1, 0.016, 0.008, '#1e4488', 0, Y(0, 0.325) + 0.064, 0.325, g);
  for (const sgn of [1, -1]) { const gs = new THREE.Mesh(new THREE.PlaneGeometry(0.094, 0.012), label('ESCOLA MINIVERSO', '#1e4488', '#ffffff', 300, 40, 'bold 24px sans-serif')); gs.position.set(0, Y(0, 0.325) + 0.072, 0.325 + sgn * 0.0042); if (sgn < 0) gs.rotation.y = Math.PI; g.add(gs); }
  for (let i = 0; i < 9; i++) { const x = -0.2 + i * 0.016 + (i > 4 ? 0.25 : 0) - (i > 4 ? 0.064 : 0); if (Math.abs(x) < 0.06) continue; box(0.0016, 0.022, 0.0016, '#2a3446', x, Y(x, 0.322), 0.322, g); }
  box(0.15, 0.0016, 0.0016, '#2a3446', -0.13, Y(-0.13, 0.322) + 0.02, 0.322, g); box(0.15, 0.0016, 0.0016, '#2a3446', 0.13, Y(0.13, 0.322) + 0.02, 0.322, g);

  // ── 3. Laboratório de VR imersivo: pavilhão de vidro, hologramas (planeta, DNA e átomo) e alunos de óculos.
  const LX = -0.25, LZ = 0.04, LW = 0.15, LD = 0.1;
  decal(g, LW + 0.02, LD + 0.02, LX, LZ, FLOOR + 0.0008, mat('#dfe7ee'));
  const lTop = Y(LX, LZ) + 0.055;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const x = LX + dx * LW / 2, z = LZ + dz * LD / 2; box(0.005, lTop - Y(x, z), 0.005, '#ffffff', x, Y(x, z), z, g); }
  box(LW + 0.012, 0.005, LD + 0.012, '#ffffff', LX, lTop, LZ, g);
  box(0.07, 0.008, 0.0016, '#00b7e3', LX, lTop - 0.008, LZ + LD / 2 + 0.002, g, { emissive: '#00b7e3', emissiveIntensity: 1.4 });
  const labGlass = new THREE.Mesh(new THREE.BoxGeometry(LW - 0.004, 0.05, LD - 0.004), new THREE.MeshStandardMaterial({ color: '#9fe9ff', transparent: true, opacity: 0.2, roughness: 0.1, metalness: 0.2, depthWrite: false }));
  labGlass.position.set(LX, lTop - 0.025, LZ); labGlass.userData.big = true; g.add(labGlass);
  const signL = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.011), label('LAB VR', '#00b7e3', '#06102a', 160, 26, 'bold 18px sans-serif')); signL.position.set(LX, lTop + 0.011, LZ + LD / 2 + 0.0072); g.add(signL);
  box(0.07, 0.014, 0.002, '#00b7e3', LX, lTop + 0.004, LZ + LD / 2 + 0.005, g);
  // Pedestais com hologramas.
  const holoAt = [[-0.045, '#7fe9ff'], [0, '#b07cff'], [0.045, '#3ee07a']];
  holoAt.forEach(([dx]) => { cyl(0.009, 0.006, '#2a3446', LX + dx, Y(LX + dx, LZ - 0.012), LZ - 0.012, g, 14); cyl(0.0075, 0.0012, '#00b7e3', LX + dx, Y(LX + dx, LZ - 0.012) + 0.006, LZ - 0.012, g, 14); });
  const hy = Y(LX, LZ) + 0.03;
  const holo = new THREE.Group(); holo.position.set(LX, hy, LZ - 0.012); holo.userData.keep = true; g.add(holo);
  // Hologramas com cor de verdade (a mistura aditiva estourava para branco contra as paredes claras do laboratório).
  const holoL = (c, op) => { const m = holoMat(c, Math.min(1, op + 0.15)); m.blending = THREE.NormalBlending; return m; };
  const hPlanet = new THREE.Group(); hPlanet.position.x = -0.045; holo.add(hPlanet);
  hPlanet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.011, 2), holoL('#7fe9ff', 0.55)));
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 0), holoL('#3ee07a', 0.8)); c.position.setFromSphericalCoords(0.01, 0.6 + i * 0.4, i * 1.9); hPlanet.add(c); }
  const hRing = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0007, 4, 40), holoL('#ffffff', 0.6)); hRing.rotation.x = 1.2; hPlanet.add(hRing);
  const dna = new THREE.Group(); holo.add(dna);
  const dnaN = 12, dnaBalls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 6, 4), holoL('#ff8ad8', 0.9), dnaN * 2), dnaRungs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.0007, 0.0007), holoL('#ffffff', 0.55), dnaN);
  for (let i = 0; i < dnaN; i++) { const a = i * 0.62, yy = -0.012 + i * 0.0026; for (const s of [0, 1]) { o.position.set(Math.cos(a + s * Math.PI) * 0.006, yy, Math.sin(a + s * Math.PI) * 0.006); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); dnaBalls.setMatrixAt(i * 2 + s, o.matrix); } o.position.set(0, yy, 0); o.rotation.set(0, -a, 0); o.scale.set(0.012, 1, 1); o.updateMatrix(); dnaRungs.setMatrixAt(i, o.matrix); }
  dnaBalls.frustumCulled = dnaRungs.frustumCulled = false; dna.add(dnaBalls, dnaRungs);
  const atom = new THREE.Group(); atom.position.x = 0.045; holo.add(atom);
  atom.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 1), holoL('#ffd28a', 0.95)));
  const electrons = [0, 1, 2].map(k => { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0006, 4, 36), holoL('#3ee07a', 0.6)); ring.rotation.set(k * 1.05, k * 0.6, 0); atom.add(ring); const e = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 4), holoL('#ffffff', 1)); ring.add(e); return e; });
  const beams = holoAt.map(([dx, c]) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.024, 14, 1, true), holoL(c, 0.12)); b.position.set(LX + dx, Y(LX + dx, LZ - 0.012) + 0.019, LZ - 0.012); b.rotation.x = Math.PI; b.userData.keep = true; g.add(b); return b; });
  // Alunos de óculos VR (levantam os braços apontando na Aula em VR).
  const seats = Array.from({ length: 9 }, (_, k) => [LX - 0.05 + (k % 3) * 0.05 + (k > 5 ? 0.012 : 0), LZ + 0.018 + Math.floor(k / 3) * 0.013, undefined]).map(([x, z]) => [x, z, Y(x, z) + 0.0016]);
  crowd(g, seats, zi, ['#1e4488', '#00b7e3', '#ffffff', '#2a3446', '#ff8a6b'], { fx: fxT3 });
  const visor = new THREE.InstancedMesh(paintGeo([[bx(0.0068, 0.0032, 0.0034, 0, 0, 0), '#eef4fb'], [bx(0.0056, 0.0018, 0.0006, 0, 0.0007, -0.0018), '#00b7e3']]), vehMat(), seats.length);
  seats.forEach(([x, z, y], k) => { o.position.set(x, y + 0.0145, z - 0.002); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); visor.setMatrixAt(k, o.matrix); });
  visor.userData.detail = true; g.add(visor);
  const v3 = () => { const v = fxT3(zi); return v < 0 ? 0 : smooth(0, 1, v) * (1 - smooth(10, 11.5, v)); };
  anims.push(t => {
    const vr = v3();
    holo.scale.setScalar(1 + vr * 1.4); holo.position.y = hy + vr * 0.035;
    hPlanet.rotation.y = t * 0.6; dna.rotation.y = t * 1.1; atom.rotation.y = t * 0.8;
    electrons.forEach((e, i) => { const a = t * (2.4 + i * 0.7) + i; e.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0); });
    beams.forEach(b => { b.material.opacity = 0.08 + vr * 0.22; });
  });

  // ── 4. UNDB (Centro Universitário Dom Bosco, São Luís), a universidade do campus: prédio moderno branco com
  // faixas de janelas, pórtico magenta na entrada com a marca (os quatro quadrados U N D B em degradê do vermelho ao
  // magenta e "Centro Universitário"), portas de vidro, marquise, escadaria, totem com a marca no gramado e os
  // mastros do Brasil, do Maranhão e da UNDB. Representação estilizada (não é a planta real do prédio).
  const UX = -0.3, UZ = -0.27, MAG = '#cf004e', MAG_D = '#770131';
  const undbLogo = (w, h, sub = true) => canvasTex(w, h, (x, ww, hh) => {
    x.clearRect(0, 0, ww, hh);
    const tiles = ['#ef3e4a', '#e2366b', '#d23a86', '#bf44a0'], letters = 'UNDB', sz = Math.min(ww / 4.4, hh * (sub ? 0.68 : 0.9)), gap = sz * 0.1, x0 = (ww - (sz * 4 + gap * 3)) / 2, y0 = sub ? hh * 0.04 : (hh - sz) / 2;
    tiles.forEach((c, k) => { x.fillStyle = c; x.beginPath(); x.roundRect(x0 + k * (sz + gap), y0, sz, sz, sz * 0.12); x.fill(); x.fillStyle = '#ffffff'; x.font = `bold ${Math.round(sz * 0.72)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(letters[k], x0 + k * (sz + gap) + sz / 2, y0 + sz * 0.54); });
    if (sub) { x.fillStyle = '#ffffff'; x.font = `bold ${Math.round(hh * 0.17)}px sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('CENTRO UNIVERSITÁRIO', ww / 2, hh * 0.86); }
  });
  const uTop = building(g, 0.17, 0.08, 0.08, windowsMat('#f4f6f8', '#2c4a6e', '#ffffff', 3, 9), UX, UZ);
  box(0.176, 0.004, 0.086, '#ffffff', UX, uTop - 0.0005, UZ, g);
  box(0.172, 0.006, 0.004, MAG, UX, Y(UX, UZ) + 0.026, UZ + 0.0405, g);                              // faixa magenta na fachada
  // Pórtico de entrada: dois pilares e a viga magenta com a marca na frente, portas de vidro e marquise.
  const PZ = UZ + 0.058, py0 = baseY(UX, PZ, 0.13, 0.02), ph = Y(UX, PZ) - py0 + 0.07;
  const magGlow = { emissive: MAG, emissiveIntensity: 0.35 };
  for (const s0 of [-1, 1]) box(0.014, ph, 0.02, MAG, UX + s0 * 0.058, py0, PZ, g, magGlow);
  box(0.13, 0.026, 0.022, MAG, UX, py0 + ph - 0.004, PZ, g, magGlow);
  box(0.132, 0.003, 0.024, MAG_D, UX, py0 + ph + 0.022, PZ, g);
  const logoFront = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.024), new THREE.MeshBasicMaterial({ map: undbLogo(512, 124), transparent: true, toneMapped: false }));
  logoFront.position.set(UX, py0 + ph + 0.009, PZ + 0.0115); g.add(logoFront);
  const glassDoors = new THREE.Mesh(new THREE.BoxGeometry(0.098, 0.04, 0.003), new THREE.MeshStandardMaterial({ color: '#9fd6ef', transparent: true, opacity: 0.55, roughness: 0.1, metalness: 0.3, depthWrite: false }));
  glassDoors.position.set(UX, Y(UX, PZ - 0.004) + 0.02, PZ - 0.004); glassDoors.userData.big = true; g.add(glassDoors);
  for (const dx of [-0.033, 0, 0.033]) box(0.0016, 0.04, 0.0035, '#d9dde5', UX + dx, Y(UX, PZ - 0.004), PZ - 0.004, g);
  box(0.11, 0.003, 0.03, '#ffffff', UX, Y(UX, PZ) + 0.043, PZ + 0.012, g);                          // marquise
  for (let st = 0; st < 3; st++) box(0.1 - st * 0.008, 0.0024, 0.012, '#e6e2da', UX, Y(UX, PZ + 0.026 - st * 0.006) - 0.001 + (2 - st) * 0.0022, PZ + 0.026 - st * 0.006, g);
  // Totem com a marca no gramado em frente.
  const TTX = UX + 0.075, TTZ = UZ + 0.11, tty = Y(TTX, TTZ);
  box(0.034, 0.03, 0.006, '#ffffff', TTX, tty, TTZ, g);
  const logoTotem = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.009), new THREE.MeshBasicMaterial({ map: undbLogo(256, 80, false), transparent: true, toneMapped: false }));
  logoTotem.position.set(TTX, tty + 0.021, TTZ + 0.0031); g.add(logoTotem);
  box(0.03, 0.003, 0.0004, MAG, TTX, tty + 0.008, TTZ + 0.0032, g);
  // Mastros alinhados ao lado do pórtico: Brasil, Maranhão e UNDB.
  [[plainFlag('#1f9d55', '#ffd23f')], [maranhaoTex()], [plainFlag(MAG, '#ffffff')]].forEach(([tex], k) => { const fx0 = UX - 0.13 + k * 0.036; waveFlag(g, fx0, UZ + 0.08, 0.085 - Math.abs(k - 1) * 0.008, tex, 0.028); cyl(0.004, 0.003, '#d9d9d9', fx0, Y(fx0, UZ + 0.08) - 0.001, UZ + 0.08, g, 10); });
  // Gramado: estudantes sentados em rodas (sentados de verdade, sem afundar no chão), com livros abertos.
  const sitSpots = [[-0.42, -0.16], [-0.405, -0.14], [-0.43, -0.135], [-0.27, -0.1], [-0.255, -0.085], [-0.28, -0.078]];
  crowd(g, sitSpots.map(([x, z]) => [x, z, Y(x, z) - 0.0038]), zi, ['#ffc56b', '#ffffff', '#3ee07a', '#ff7bb0', '#00b7e3', '#b07cff'], { sit: true });
  for (const [x, z] of [[-0.418, -0.145], [-0.265, -0.088]]) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0012, 0.004), mat(C.coral)); bk.position.set(x, Y(x, z) + 0.001, z); g.add(bk); }
  // Palco da formatura da UNDB, de pé no chão (ali o planeta inclina): estrado com degraus e saia magenta, painel
  // com a marca e arco de balões, púlpito, formandos de beca virados para a plateia e as cadeiras das famílias.
  const UPV = new THREE.Vector3(0, 1, 0), nrmV = new THREE.Vector3();
  const tiltAt = (x, z) => new THREE.Quaternion().setFromUnitVectors(UPV, nrmV.set(x, Math.sqrt(1.6 * 1.6 - x * x - z * z), z).normalize());
  const stX = -0.36, stZ = -0.11, stage = new THREE.Group(); stage.position.set(stX, Y(stX, stZ) - 0.0012, stZ); stage.quaternion.copy(tiltAt(stX, stZ)); g.add(stage);
  const sb = (w, h, d, c, x, y, z, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(x, y + h / 2, z); stage.add(m); return m; };
  const SH = 0.009;
  sb(0.1, SH, 0.042, '#f4f1ea', 0, 0, 0);
  sb(0.102, 0.0035, 0.0012, MAG, 0, SH - 0.0045, 0.0215, { emissive: MAG, emissiveIntensity: 0.3 });
  for (let k = 0; k < 3; k++) sb(0.034, SH * (1 - k / 3), 0.006, '#e6e2da', 0, 0, 0.024 + k * 0.006);
  sb(0.1, 0.042, 0.003, MAG_D, 0, SH, -0.0195);
  const backLogo = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.022), new THREE.MeshBasicMaterial({ map: undbLogo(512, 160), transparent: true, toneMapped: false }));
  backLogo.position.set(0, SH + 0.026, -0.0178); stage.add(backLogo);
  const formLbl = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.006), label('FORMATURA 2026', MAG_D, '#ffd23f', 240, 30, 'bold 20px sans-serif'));
  formLbl.position.set(0, SH + 0.0085, -0.0178); stage.add(formLbl);
  const BAL = 26, balG = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.35 }), BAL), bo = new THREE.Object3D(), balC = [MAG, '#ffffff', '#ffd23f'].map(c => new THREE.Color(c));
  for (let k = 0; k < BAL; k++) { const a = k / (BAL - 1) * Math.PI; bo.position.set(-Math.cos(a) * 0.052, Math.sin(a) * 0.05 + 0.002, 0.016); bo.updateMatrix(); balG.setMatrixAt(k, bo.matrix); balG.setColorAt(k, balC[k % 3]); }
  stage.add(balG);
  sb(0.012, 0.016, 0.008, '#3a2a22', 0.038, SH, 0.006); sb(0.014, 0.002, 0.01, '#5a3a2a', 0.038, SH + 0.016, 0.005);
  const grads = Array.from({ length: 5 }, (_, k) => [-0.032 + k * 0.014, 0.0, SH]);
  crowd(stage, grads.map(([x, z, y]) => [x, z, y]), zi, ['#1a1d24'], { fx: fxT4, jump: 0.006, speed: 6 });
  const CH = 18, chairs = new THREE.InstancedMesh(paintGeo([[bx(0.006, 0.0008, 0.006, 0, 0.0045, 0), '#ffffff'], [bx(0.006, 0.006, 0.0008, 0, 0.0045, 0.0028), '#ffffff'], [bx(0.0008, 0.0045, 0.0008, -0.0024, 0, -0.0024), '#c9d3dc'], [bx(0.0008, 0.0045, 0.0008, 0.0024, 0, -0.0024), '#c9d3dc'], [bx(0.0008, 0.0045, 0.0008, -0.0024, 0, 0.0024), '#c9d3dc'], [bx(0.0008, 0.0045, 0.0008, 0.0024, 0, 0.0024), '#c9d3dc']]), vehMat(), CH);
  const seatsF = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) { const x = -0.04 + c * 0.016 + (c > 2 ? 0.008 : 0), z = 0.062 + r * 0.014; bo.position.set(x, 0, z); bo.rotation.set(0, 0, 0); bo.updateMatrix(); chairs.setMatrixAt(r * 6 + c, bo.matrix); if ((r * 6 + c) % 3 !== 1) seatsF.push([x, z]); }
  bo.rotation.set(0, 0, 0); stage.add(chairs);
  crowd(stage, seatsF.map(([x, z]) => [x, z - 0.0006, -0.0008]), zi, ['#ff7bb0', '#00b7e3', '#ffd23f', '#ffffff', '#3ee07a', '#b07cff'], { fx: fxT4, face: Math.PI, sit: true });
  const caps = new THREE.InstancedMesh(paintGeo([[bx(0.0075, 0.0007, 0.0075, 0, 0.0016, 0), '#1a1d24'], [new THREE.CylinderGeometry(0.0026, 0.0026, 0.0016, 8).translate(0, 0.0008, 0), '#1a1d24'], [bx(0.0006, 0.003, 0.0006, 0.0033, -0.0008, 0), '#ffd23f']]), vehMat(), grads.length);
  caps.frustumCulled = false; caps.userData.detail = true; stage.add(caps);
  const capV = grads.map((_, k) => new THREE.Vector3((k - 2) * 0.012, 0.16 + (k % 3) * 0.03, 0.02 + (k % 2) * 0.02));
  const cheers = [-0.035, 0, 0.035].map(dx => confetti(stage, dx, SH + 0.03, 0.01));
  anims.push(t => {
    const f = fxT4(zi), throwing = f >= 0 && f < 3.2;
    grads.forEach(([x, z, y], k) => {
      if (throwing) { const a = Math.max(0, f - 0.4); o.position.set(x + capV[k].x * a, y + 0.0195 + capV[k].y * a - 0.11 * a * a, z + capV[k].z * a); o.rotation.set(a * 9 + k, a * 7, a * 5); }
      else { o.position.set(x, y + 0.0195, z); o.rotation.set(0, 0.3 * k, 0); }
      o.scale.setScalar(1); o.updateMatrix(); caps.setMatrixAt(k, o.matrix);
    });
    caps.instanceMatrix.needsUpdate = true;
    cheers.forEach((c, k) => { if (f > 0.5 + k * 0.25 && f < 0.6 + k * 0.25 && c.userData.at < t - 3) c.userData.at = t; });
  });

  // ── 8. Planetário: cúpula que abre em duas metades, telescópio que sobe, telescópios no gramado e, na noite de
  // estrelas, a cúpula acende por dentro e estrelas cadentes cruzam o céu do campus.
  const OX = 0.3, OZ = -0.24, oy = baseY(OX, OZ, 0.12, 0.12);
  cyl(0.062, Y(OX, OZ) - oy + 0.045, '#e9eef5', OX, oy, OZ, g, 28);
  cyl(0.066, 0.006, '#c9d3dc', OX, Y(OX, OZ) + 0.042, OZ, g, 28);
  const oTop = Y(OX, OZ) + 0.048;
  const glowIn = new THREE.Mesh(new THREE.SphereGeometry(0.058, 20, 10, 0, TAU, 0, Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1a2a6a', side: THREE.BackSide, toneMapped: false }));
  glowIn.position.set(OX, oTop, OZ); glowIn.userData.keep = true; g.add(glowIn);
  const halves = [0, 1].map(k => { const piv = new THREE.Group(); piv.position.set(OX, oTop, OZ); piv.userData.keep = true; g.add(piv); piv.add(new THREE.Mesh(new THREE.SphereGeometry(0.061, 20, 10, k * Math.PI, Math.PI, 0, Math.PI / 2), mat('#f4f7fb', { metalness: 0.25, roughness: 0.35 }))); return piv; });
  const scope = new THREE.Group(); scope.position.set(OX, oTop - 0.02, OZ); scope.userData.keep = true; g.add(scope);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.085, 12), mat('#2a3446')); tube.position.y = 0.035; scope.add(tube);
  const signP = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.011), label('PLANETÁRIO', '#1e1645', '#ffd23f', 220, 30, 'bold 20px sans-serif')); signP.position.set(OX, Y(OX, OZ) + 0.03, OZ + 0.0625); g.add(signP);
  for (const [x, z, a] of [[0.4, -0.12, 0.6], [0.36, -0.08, -0.4], [0.44, -0.2, 1.4]]) {
    const ty = Y(x, z), tp = new THREE.Group(); tp.position.set(x, ty, z); tp.rotation.y = a; g.add(tp);
    for (let k = 0; k < 3; k++) { const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.02, 4), mat('#2a3446')); leg.position.set(Math.cos(k * TAU / 3) * 0.004, 0.009, Math.sin(k * TAU / 3) * 0.004); leg.rotation.set(Math.sin(k * TAU / 3) * 0.3, 0, -Math.cos(k * TAU / 3) * 0.3); tp.add(leg); }
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.003, 0.018, 8), mat('#ffffff')); tt.position.set(0, 0.021, 0); tt.rotation.z = 0.9; tp.add(tt);
  }
  const STARS = 7, shoot = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0011, 0.07, 5).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#fff6c8', toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }), STARS);
  shoot.frustumCulled = false; shoot.userData.detail = true; g.add(shoot);
  for (let i = 0; i < STARS; i++) shoot.setMatrixAt(i, zero);
  // Céu noturno da Noite de estrelas: uma cúpula escura com estrelas em volta do planetário, que só aparece quando a
  // câmera já desceu até o telescópio (de fora seria uma bolha) e some antes de ela voltar.
  const night = nightSky(g, OX, oTop, OZ, 0.5);
  const glowC = new THREE.Color(), nightA = new THREE.Color('#1a2a6a'), nightB = new THREE.Color('#ffd23f');
  anims.push(t => {
    const f = fxT(zi), k = f < 0 ? 0 : smooth(0, 1.4, f) * (1 - smooth(9, 10.5, f));
    const nk = f < 0 ? 0 : smooth(1.3, 2.6, f) * (1 - smooth(8.2, 9.2, f));
    night.set(nk, t);
    halves[0].rotation.x = k * 1.1; halves[1].rotation.x = -k * 1.1;
    scope.position.y = oTop - 0.02 + k * 0.03; scope.rotation.z = 0.2 + k * (0.5 + Math.sin(t * 0.7) * 0.15);
    glowIn.material.color.copy(glowC.copy(nightA).lerp(nightB, k * (0.4 + 0.2 * Math.sin(t * 3))));
    if (k > 0.05) {
      for (let i = 0; i < STARS; i++) { const c = ((t * 0.55 + i / STARS) % 1); o.position.set(OX - 0.3 + c * 0.5, oTop + 0.22 + Math.sin(i * 3.1) * 0.05 - c * 0.08, OZ - 0.2 + (i % 4) * 0.08); o.rotation.set(0, 0.2, -0.25); o.scale.set(k * (1 - c), 1, 1); o.updateMatrix(); shoot.setMatrixAt(i, o.matrix); }
      shoot.instanceMatrix.needsUpdate = true; shoot.userData.live = true;
    } else if (shoot.userData.live) { for (let i = 0; i < STARS; i++) shoot.setMatrixAt(i, zero); shoot.instanceMatrix.needsUpdate = true; shoot.userData.live = false; }
  });

  // ── 2. Recreio: quadra com placar e traves, pula-corda, pipas e a turma correndo (Tocar o recreio).
  const QX = 0.24, QZ = 0.14, QW = 0.15, QD = 0.09;
  decal(g, QW + 0.02, QD + 0.02, QX, QZ, FLOOR + 0.0006, mat('#2f7fc4'));
  decal(g, QW, QD, QX, QZ, FLOOR + 0.0012, new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(192, 116, (x, w, h) => {
    x.fillStyle = '#e8613f'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
    x.beginPath(); x.moveTo(w / 2, 4); x.lineTo(w / 2, h - 4); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 16, 0, TAU); x.stroke();
    for (const s of [0, 1]) { x.strokeRect(s ? w - 34 : 4, h / 2 - 26, 30, 52); }
  }) }));
  for (const s of [-1, 1]) { const gx = QX + s * (QW / 2 - 0.004), gy = Y(gx, QZ) + 0.002; box(0.0016, 0.016, 0.0016, '#ffffff', gx, gy, QZ - 0.013, g); box(0.0016, 0.016, 0.0016, '#ffffff', gx, gy, QZ + 0.013, g); box(0.0016, 0.0016, 0.028, '#ffffff', gx, gy + 0.016, QZ, g); }
  const sbX = QX, sbZ = QZ - QD / 2 - 0.016;
  cyl(0.0016, 0.03, '#2a3446', sbX - 0.018, Y(sbX - 0.018, sbZ), sbZ, g, 5); cyl(0.0016, 0.03, '#2a3446', sbX + 0.018, Y(sbX + 0.018, sbZ), sbZ, g, 5);
  box(0.044, 0.016, 0.004, '#1a1d24', sbX, Y(sbX, sbZ) + 0.026, sbZ, g);
  const scoreTex = canvasTex(176, 64, () => {}), scoreCtx = scoreTex.image.getContext('2d');
  const drawScore = (a, b) => { const x = scoreCtx; x.fillStyle = '#0b0f1a'; x.fillRect(0, 0, 176, 64); x.font = 'bold 14px sans-serif'; x.textAlign = 'center'; x.fillStyle = '#7fe9ff'; x.fillText('AZUL', 44, 16); x.fillStyle = '#ff8a6b'; x.fillText('LARANJA', 132, 16); x.font = 'bold 34px monospace'; x.fillStyle = '#ffd23f'; x.fillText(String(a), 44, 52); x.fillText(String(b), 132, 52); x.fillStyle = '#ffffff'; x.fillText(':', 88, 50); scoreTex.needsUpdate = true; };
  drawScore(2, 1);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.0145), new THREE.MeshBasicMaterial({ map: scoreTex, toneMapped: false })); board.position.set(sbX, Y(sbX, sbZ) + 0.034, sbZ + 0.0021); g.add(board);
  // Turma do recreio: crianças (o mesmo bonequinho caprichado, em tamanho menor) em três brincadeiras.
  const KID = 0.8;
  // Futebol na quadra: time azul x laranja, com goleiro em cada gol. Parados, esperam na posição olhando a bola;
  // no recreio correm atrás dela, e no gol do azul o time comemora com os braços para cima.
  const team = Array.from({ length: 8 }, (_, k) => {
    const blue = k < 4, keeper = k === 0 || k === 4, side = blue ? -1 : 1;
    const hx = keeper ? QX + side * (QW / 2 - 0.009) : QX + side * (0.012 + (k % 4 - 1) * 0.02), hz = keeper ? QZ : QZ + ((k % 4) - 2) * 0.022;
    return { hx, hz, x: hx, z: hz, rot: blue ? Math.PI / 2 : -Math.PI / 2, keeper, blue, ph: k * 1.37 };
  });
  const soccer = figures(g, 8, team.map(p => (p.blue ? '#00b7e3' : '#ff8a6b')), KID);
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), mat(C.white)); ball.userData.keep = true; g.add(ball);
  // Pula-corda no pátio: duas crianças batem a corda e uma pula.
  const JX = 0.08, JZ = -0.15, jy = Y(JX, JZ) + 0.0016;
  const ropeKids = figures(g, 3, ['#ffc56b', '#b07cff', '#3ee07a'], KID);
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0006, 4, 24, Math.PI), mat('#ff4fd8')); rope.position.set(JX, jy + 0.012, JZ); rope.userData.keep = true; g.add(rope);
  // Pega-pega: no recreio, a turma sai correndo pela porta da escola, brinca na praça e volta quando acaba.
  const RUN = 8, CX0 = 0, CZ0 = -0.035, door = [0, -0.232];
  const runners = figures(g, RUN, ['#ff7bb0', '#ffd23f', '#7fe9ff', '#3ee07a', '#ffffff', '#b07cff', '#ff8a2a', '#ff4fd8'], KID);
  const rk = Array.from({ length: RUN }, (_, k) => ({ r: 0.026 + (k % 4) * 0.011, w: (k % 2 ? 1 : -1) * (1.1 + (k % 3) * 0.3), a0: k * TAU / RUN, ph: k * 0.8, px: 0, pz: 0, rot: 0, delay: k * 0.18 }));
  // Pipas no céu do campus, com a linha até a mão de quem empina.
  const KITES = [[-0.02, 0.2, '#e8452f', '#ffd23f'], [0.14, 0.24, '#00b7e3', '#ffffff'], [-0.14, 0.22, '#3ee07a', '#ff7bb0']];
  const kiteG = new THREE.CylinderGeometry(0.012, 0.012, 0.001, 4); kiteG.rotateX(Math.PI / 2); kiteG.scale(0.75, 1, 1);
  const kites = KITES.map(([x, z, c1, c2], k) => {
    const hold = [x, z, Y(x, z) + 0.0016]; crowd(g, [hold], zi, [c2]);
    const kg = new THREE.Group(); kg.userData.keep = true; g.add(kg);
    const body = new THREE.Mesh(kiteG, mat(c1, { side: THREE.DoubleSide })); kg.add(body);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.0012, 0.03, 0.0005), mat(c2)); tail.position.y = -0.024; kg.add(tail);
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.0003, 0.0003, 1, 3), mat('#ffffff')); line.userData.keep = true; g.add(line);
    return { kg, line, hold, k };
  });
  const a0 = new THREE.Vector3(), a1 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), qq = new THREE.Quaternion();
  anims.push(t => {
    const r2 = fxT2(zi), on = r2 >= 0 && r2 < 10;
    const bxp = QX + (on ? Math.sin(t * 2.2) * 0.05 : Math.sin(t * 0.6) * 0.01), bzp = QZ + (on ? Math.sin(t * 3.1) * 0.022 : 0);
    ball.position.set(bxp, Y(bxp, bzp) + 0.006 + (on ? Math.abs(Math.sin(t * 6)) * 0.02 : 0), bzp);
    if (on && Math.floor(r2) === 6 && !board.userData.goal) { board.userData.goal = true; drawScore(3, 1); } else if (!on && board.userData.goal) { board.userData.goal = false; drawScore(2, 1); }
    const sp = on ? 9 : 5.5; rope.rotation.x = t * sp;
    const hop = Math.max(0, Math.sin(t * sp));
    ropeKids.place(0, JX - 0.021, jy, JZ, Math.PI / 2, 0, 0.32 + 0.14 * Math.sin(t * sp));
    ropeKids.place(1, JX + 0.021, jy, JZ, -Math.PI / 2, 0, 0.32 + 0.14 * Math.sin(t * sp + Math.PI));
    ropeKids.place(2, JX, jy + hop * 0.007, JZ, 0, hop * 0.4, 0.25 + hop * 0.3);
    ropeKids.done();
    // Futebol.
    const dt = Math.min(0.05, Math.max(0, t - (soccer.t ?? t))); soccer.t = t;
    const goal = on && Math.floor(r2) >= 6 && Math.floor(r2) < 8;
    team.forEach((p, k) => {
      let tx = p.hx, tz = p.hz;
      if (on && !goal) {
        if (p.keeper) tz = QZ + clamp(bzp - QZ, -0.012, 0.012);
        else { tx = bxp + (p.blue ? -1 : 1) * (0.01 + (k % 4) * 0.004) + Math.sin(t * 0.9 + p.ph) * 0.012; tz = bzp + Math.cos(t * 1.1 + p.ph) * 0.018; }
      }
      tx = clamp(tx, QX - QW / 2 + 0.005, QX + QW / 2 - 0.005); tz = clamp(tz, QZ - QD / 2 + 0.005, QZ + QD / 2 - 0.005);
      const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz), step = Math.min(d, (on ? 0.07 : 0.025) * dt);
      if (d > 1e-5) { p.x += dx / d * step; p.z += dz / d * step; }
      const moving = d > 0.0025, face = moving ? Math.atan2(dx, dz) : Math.atan2(bxp - p.x, bzp - p.z);
      p.rot += (((face - p.rot) % TAU + TAU * 1.5) % TAU - TAU / 2) * Math.min(1, dt * 8);
      const run = moving ? Math.sin(t * 15 + p.ph) : 0, party = goal && p.blue ? 1 : 0;
      soccer.place(k, p.x, Y(p.x, p.z) + 0.0029 + Math.abs(run) * 0.0007 + party * Math.max(0, Math.sin(t * 7 + p.ph)) * 0.004, p.z, p.rot, run, party, run * 0.05);
    });
    soccer.done();
    // Pega-pega: sai pela porta, corre em volta da praça (cada um no seu ritmo e sentido) e volta.
    rk.forEach((c, k) => {
      const u = r2 < 0 ? 0 : smooth(c.delay, c.delay + 1.4, r2), v = r2 < 0 ? 1 : smooth(8.4 + c.delay * 0.5, 9.8 + c.delay * 0.5, r2);
      const a = c.a0 + c.w * t, lx = CX0 + Math.cos(a) * c.r * 1.5, lz = CZ0 + Math.sin(a) * c.r;
      const out = u * (1 - v), x = door[0] + (lx - door[0]) * out, z = door[1] + (lz - door[1]) * out;
      const vis = r2 >= 0 && r2 < 10.5 && out > 0.02;
      const dx = x - c.px, dz = z - c.pz; c.px = x; c.pz = z;
      if (Math.hypot(dx, dz) > 1e-6) c.rot = Math.atan2(dx, dz);
      const run = Math.sin(t * 16 + c.ph);
      runners.place(k, vis ? x : 0, vis ? Y(x, z) + 0.0016 + Math.abs(run) * 0.0008 : Y(0, -0.29) - 0.04, vis ? z : -0.29, c.rot, vis ? run : 0, 0, run * 0.05);
    });
    runners.done();
    kites.forEach(({ kg, line, hold, k }) => {
      const kx = hold[0] + 0.04 + Math.sin(t * 0.7 + k) * 0.02, ky = hold[2] + 0.12 + k * 0.02 + Math.sin(t * 1.3 + k * 2) * 0.012 + (on ? 0.02 : 0), kz = hold[1] - 0.06 + Math.cos(t * 0.5 + k) * 0.015;
      kg.position.set(kx, ky, kz); kg.rotation.set(Math.sin(t * 1.7 + k) * 0.3, 0.3, Math.sin(t * 2.1 + k) * 0.35);
      a0.set(hold[0], hold[2] + 0.014, hold[1]); a1.set(kx, ky - 0.005, kz);
      line.position.copy(a0).add(a1).multiplyScalar(0.5); line.scale.set(1, a0.distanceTo(a1), 1); line.quaternion.copy(qq.setFromUnitVectors(up, a1.sub(a0).normalize()));
    });
  });

  // ── 5. Ciência ao ar livre: horta, estufa, estação do tempo, painéis solares, lago com patos e a trilha.
  for (let i = 0; i < 4; i++) {
    const x = -0.42 + i * 0.026, z = 0.2;
    box(0.018, 0.007, 0.06, '#7a5b45', x, baseY(x, z, 0.018, 0.06), z, g);
    for (let kk = 0; kk < 4; kk++) { const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0048, 0), mat(['#3aa58c', '#5fd39a', '#e8452f', '#ffd23f'][(i + kk) % 4])); v.position.set(x, Y(x, z) + 0.009, z - 0.022 + kk * 0.015); g.add(v); }
  }
  const GX = -0.32, GZ = 0.25;
  decal(g, 0.07, 0.045, GX, GZ, FLOOR + 0.0007, mat('#cfd8de'));
  const ghRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.066, 14, 1, false, -Math.PI / 2, Math.PI), new THREE.MeshStandardMaterial({ color: '#c9f3ff', transparent: true, opacity: 0.45, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
  ghRoof.rotation.z = Math.PI / 2; ghRoof.position.set(GX, Y(GX, GZ) + 0.004, GZ); ghRoof.userData.big = true; g.add(ghRoof);
  for (let i = 0; i < 6; i++) { const x = GX - 0.025 + i * 0.01; const p = new THREE.Mesh(new THREE.IcosahedronGeometry(0.004, 0), mat(i % 2 ? '#3aa58c' : '#7fd38a')); p.position.set(x, Y(x, GZ) + 0.006, GZ); g.add(p); }
  // Estação do tempo: mastro com anemômetro girando, cata-vento e caixinha de sensores.
  const WX = -0.2, WZ = 0.2, wy = Y(WX, WZ);
  cyl(0.0012, 0.05, '#c9d3dc', WX, wy, WZ, g, 6); box(0.008, 0.01, 0.006, '#ffffff', WX, wy + 0.02, WZ, g);
  const anemo = new THREE.Group(); anemo.position.set(WX, wy + 0.05, WZ); anemo.userData.keep = true; g.add(anemo);
  for (let k = 0; k < 3; k++) { const arm = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.0006, 0.0006), mat('#c9d3dc')); arm.geometry.translate(0.006, 0, 0); arm.rotation.y = k * TAU / 3; anemo.add(arm); const cup = new THREE.Mesh(new THREE.SphereGeometry(0.002, 6, 4, 0, TAU, 0, Math.PI / 2), mat('#e8452f')); cup.position.set(Math.cos(k * TAU / 3) * 0.012, 0, -Math.sin(k * TAU / 3) * 0.012); cup.rotation.z = Math.PI / 2; anemo.add(cup); }
  const vane = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, 0.0006), mat('#ffd23f')); vane.position.set(WX, wy + 0.042, WZ); vane.userData.keep = true; g.add(vane);
  // Painéis solares em fileira, inclinados.
  for (let i = 0; i < 4; i++) { const x = -0.44 + i * 0.03, z = 0.29; box(0.0015, 0.008, 0.0015, '#2a3446', x, Y(x, z), z, g); const p = box(0.026, 0.002, 0.016, '#1e4488', x, Y(x, z) + 0.008, z, g, { metalness: 0.5, roughness: 0.25 }); p.rotation.x = -0.5; }
  // Lago dos patos, de pé no chão inclinado: borda de pedra, água dentro dela (com marolas), deque de madeira na
  // beira, vitórias-régias e os patos nadando só na água (antes atravessavam a ponte).
  const tiltL = (x, z) => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, Math.sqrt(1.6 * 1.6 - x * x - z * z), z).normalize());
  const PKX = -0.392, PKZ = 0.118, lake = new THREE.Group(); lake.position.set(PKX, Y(PKX, PKZ) + 0.0016, PKZ); lake.quaternion.copy(tiltL(PKX, PKZ)); g.add(lake);
  const LRX = 0.042, LRZ = 0.029;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 40), mat('#c9bfae')); rim.rotation.x = Math.PI / 2; rim.scale.set(LRX, LRZ, 0.055); rim.position.y = 0.0022; lake.add(rim);
  const waterGeo = new THREE.CircleGeometry(1, 40); waterGeo.rotateX(-Math.PI / 2); waterGeo.scale(LRX * 0.97, 1, LRZ * 0.97);
  const water = new THREE.Mesh(waterGeo, new THREE.MeshStandardMaterial({ roughness: 0.15, metalness: 0.1, color: '#ffffff', emissive: '#0a4a6a', emissiveIntensity: 0.25, map: canvasTex(128, 96, (x, w, h) => {
    const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2); gr.addColorStop(0, '#2a9fd0'); gr.addColorStop(1, '#5fd4e8'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
    x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2; for (let k = 0; k < 12; k++) { const cx = 20 + R() * 88, cy = 18 + R() * 60; x.beginPath(); x.arc(cx, cy, 5, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
  }) }));
  water.position.y = 0.0016; lake.add(water);
  for (const [lx, lz] of [[-0.03, 0.012], [-0.022, 0.02], [0.028, -0.014]]) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.0045, 10, 0.3, TAU - 0.6), mat('#3aa56d', { side: THREE.DoubleSide })); pad.rotation.x = -Math.PI / 2; pad.position.set(lx, 0.0019, lz); lake.add(pad); }
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.0014, 6, 4), mat('#ff9ad5')); flower.position.set(-0.03, 0.0026, 0.012); lake.add(flower);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.0016, 0.012), mat('#a07a5a')); deck.position.set(LRX + 0.004, 0.003, 0.004); lake.add(deck);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const post = new THREE.Mesh(new THREE.CylinderGeometry(0.0008, 0.0008, 0.005, 5), mat('#7a5b45')); post.position.set(LRX + 0.004 + dx * 0.0075, 0.0015, 0.004 + dz * 0.005); lake.add(post); }
  const duckG = paintGeo([[new THREE.SphereGeometry(0.003, 8, 6).scale(1.4, 0.8, 1), '#ffffff'], [new THREE.SphereGeometry(0.0018, 8, 6).translate(0.0035, 0.0025, 0), '#ffffff'], [bx(0.0018, 0.0006, 0.0012, 0.0052, 0.0022, 0), '#ff9a2a']]);
  const DUCKS = 4, ducks = new THREE.InstancedMesh(duckG, vehMat(), DUCKS); ducks.frustumCulled = false; ducks.userData.detail = true; lake.add(ducks);
  anims.push(t => {
    for (let i = 0; i < DUCKS; i++) { const a = t * 0.3 + i * TAU / DUCKS + Math.sin(t * 0.7 + i) * 0.2, k = 0.55 + (i % 2) * 0.12, x = Math.cos(a) * LRX * k, z = Math.sin(a) * LRZ * k; o.position.set(x, 0.0024 + Math.sin(t * 2 + i) * 0.0002, z); o.rotation.set(0, -a - Math.PI / 2, 0); o.scale.setScalar(1); o.updateMatrix(); ducks.setMatrixAt(i, o.matrix); }
    ducks.instanceMatrix.needsUpdate = true;
    anemo.rotation.y = t * 5; vane.rotation.y = Math.sin(t * 0.4) * 0.8;
  });
  // Trilha com árvores e plaquinhas.
  for (const [x, z, s0, c] of [[-0.45, 0.04, 0.8], [-0.47, -0.06, 0.75, '#ffd23f'], [-0.155, 0.118, 0.7], [-0.46, 0.14, 0.75, '#ff7bb0']]) copa(x, z, s0, c);
  for (const [x, z] of [[-0.4, 0.075], [-0.26, 0.08], [-0.19, 0.16]]) { box(0.0012, 0.012, 0.0012, '#7a5b45', x, Y(x, z), z, g); box(0.01, 0.006, 0.0012, '#f4efe6', x, Y(x, z) + 0.01, z, g); }

  // ── 7. Rua da escola: asfalto com faixa de pedestre, guarda de trânsito, ciclovia com alunos de bicicleta,
  // bicicletário, ponto e ônibus escolar parado, carrinho de pipoca e trânsito calmo.
  road(g, -RX, ROAD_Z, RX, ROAD_Z, 0.05, FLOOR - 0.0018);
  for (let i = 0; i < 2; i++) zebra(g, 0, ROAD_Z - 0.012 + i * 0.024, false, 8, FLOOR - 0.002);                      // faixa de pedestre atravessando a rua
  draped(2 * RX, 0.0012, 0.018, '#d9534f', 0, BIKE_Z, g, FLOOR - 0.0002);
  for (let x = -RX + 0.02; x <= RX - 0.02; x += 0.05) box(0.012, 0.0006, 0.0012, '#ffffff', x, sag(x, BIKE_Z) + FLOOR + 0.0012, BIKE_Z, g);
  trafficLoop(g, [[-RX + 0.01, ROAD_Z], [RX - 0.01, ROAD_Z], [RX - 0.01, ROAD_Z + 0.001], [-RX + 0.01, ROAD_Z + 0.001]], [{ n: 2, dir: 1, off: 0.012, speed: 0.04, bus: false }], FLOOR + 0.0014);
  // Guarda de trânsito com placa "PARE" e colete laranja.
  crowd(g, [[0.03, ROAD_Z - 0.026, Y(0.03, ROAD_Z - 0.026) + 0.0016]], zi, ['#ff8a2a']);
  cyl(0.0008, 0.016, '#c9d3dc', 0.037, Y(0.037, ROAD_Z - 0.026) + 0.004, ROAD_Z - 0.026, g, 4);
  const stop = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.0008, 8), label('PARE', '#d21f26', '#ffffff', 32, 32, 'bold 11px sans-serif')); stop.rotation.x = Math.PI / 2; stop.position.set(0.037, Y(0.037, ROAD_Z - 0.026) + 0.022, ROAD_Z - 0.026); g.add(stop);
  // Ônibus escolar parado no ponto, com abrigo.
  const busX = -0.24;
  const bus = new THREE.Mesh(paintGeo([...busParts(0.07, 0.024, 0.026, '#ffd23f'), [bx(0.056, 0.003, 0.0244, -0.004, 0.006, 0), '#1a1d24']]), vehMat()); bus.position.set(busX, Y(busX, ROAD_Z - 0.026) + 0.0012, ROAD_Z - 0.026); g.add(bus);
  const busSign = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.005), label('ESCOLAR', '#1a1d24', '#ffd23f', 120, 20, 'bold 14px sans-serif')); busSign.position.set(busX, Y(busX, ROAD_Z) + 0.016, ROAD_Z - 0.026 - 0.0124); busSign.rotation.y = Math.PI; g.add(busSign);
  box(0.03, 0.002, 0.012, '#9fe0ff', busX + 0.005, Y(busX, 0.343) + 0.022, 0.343, g, { transparent: true, opacity: 0.6 });
  for (const s of [-1, 1]) box(0.0012, 0.022, 0.0012, '#2a3446', busX + 0.005 + s * 0.013, Y(busX, 0.343), 0.343, g);
  crowd(g, [[busX - 0.004, 0.348], [busX + 0.008, 0.35], [busX + 0.016, 0.347]].map(([x, z]) => [x, z, Y(x, z) + 0.0016]), zi, ['#ffffff', '#1e4488', '#ff7bb0']);
  // Bicicletário e bicicletas andando na ciclovia (instâncias).
  const bikeG = paintGeo([
    [new THREE.TorusGeometry(0.0028, 0.0005, 4, 12).translate(-0.0042, 0.0028, 0), '#1a1d24'], [new THREE.TorusGeometry(0.0028, 0.0005, 4, 12).translate(0.0042, 0.0028, 0), '#1a1d24'],
    [bx(0.0084, 0.0007, 0.0007, 0, 0.0042, 0), '#00b7e3'], [bx(0.0007, 0.004, 0.0007, -0.0012, 0.0028, 0), '#00b7e3'],
    [new THREE.CylinderGeometry(0.0026, 0.0032, 0.009, 6).translate(-0.0008, 0.0095, 0), '#ffffff'], [new THREE.SphereGeometry(0.0027, 8, 6).translate(-0.0004, 0.0162, 0), '#c68a5e'], [new THREE.SphereGeometry(0.0029, 8, 4, 0, TAU, 0, Math.PI / 2).translate(-0.0004, 0.0168, 0), '#e8452f']]);
  const BIKES = 5, bikes = new THREE.InstancedMesh(bikeG, vehMat(), BIKES); bikes.frustumCulled = false; bikes.userData.detail = true; g.add(bikes);
  const bikePath = loopPath([[-RX + 0.01, BIKE_Z - 0.004], [RX - 0.01, BIKE_Z - 0.004], [RX - 0.01, BIKE_Z + 0.004], [-RX + 0.01, BIKE_Z + 0.004]]);
  anims.push(t => {
    for (let i = 0; i < BIKES; i++) { const q = bikePath.at(i / BIKES * bikePath.L + t * 0.03); o.position.set(q.x, Y(q.x, q.z) + 0.0018, q.z); o.rotation.set(0, Math.atan2(-q.tz, q.tx), 0); o.scale.setScalar(1); o.updateMatrix(); bikes.setMatrixAt(i, o.matrix); }
    bikes.instanceMatrix.needsUpdate = true;
  });
  for (let i = 0; i < 5; i++) { const x = 0.1 + i * 0.01, z = 0.345; const w = new THREE.Mesh(new THREE.TorusGeometry(0.0034, 0.0006, 4, 12), mat(['#e8452f', '#00b7e3', '#3ee07a', '#ffd23f', '#b07cff'][i])); w.position.set(x, Y(x, z) + 0.0036, z); w.rotation.y = Math.PI / 2; g.add(w); }
  box(0.054, 0.002, 0.002, '#c9d3dc', 0.12, Y(0.12, 0.345) + 0.004, 0.345, g);
  // Carrinho de pipoca com toldo listrado.
  const PCX = 0.2, PCZ = 0.338, pcy = Y(PCX, PCZ);
  box(0.016, 0.012, 0.01, '#e8452f', PCX, pcy + 0.003, PCZ, g); box(0.012, 0.01, 0.008, '#fff6c8', PCX, pcy + 0.015, PCZ, g, { transparent: true, opacity: 0.7 });
  box(0.02, 0.002, 0.014, '#ffffff', PCX, pcy + 0.03, PCZ, g); box(0.02, 0.0022, 0.004, '#e8452f', PCX, pcy + 0.0305, PCZ, g);
  for (const s of [-1, 1]) { const w = new THREE.Mesh(new THREE.TorusGeometry(0.0028, 0.0006, 4, 10), mat('#1a1d24')); w.position.set(PCX + s * 0.006, pcy + 0.0028, PCZ + 0.006); g.add(w); }
  crowd(g, [[PCX + 0.014, PCZ + 0.004, pcy + 0.0016], [PCX - 0.016, PCZ + 0.006, pcy + 0.0016]], zi, ['#ffffff', '#ffc56b']);

  // ── Árvores, palmeiras, postes e estudantes pelos caminhos.
  for (const [x, z, s0, c] of [[0.45, -0.05, 0.85], [0.42, 0.06, 0.8, '#ffd23f'], [0.15, -0.4, 0.8], [-0.15, -0.42, 0.85], [-0.45, -0.33, 0.8], [0.46, -0.32, 0.8, '#ff7bb0'], [0.37, 0.25, 0.8], [0.06, 0.24, 0.75, '#ffd23f'], [-0.08, 0.24, 0.75], [0.22, -0.12, 0.7], [-0.2, -0.12, 0.7], [0.3, 0.3, 0.7, '#ff7bb0']]) copa(x, z, s0, c);
  // Arbustos e canteiros floridos ao longo dos caminhos e em volta da praça (instâncias: duas chamadas de desenho).
  {
    const spots = [];
    for (let a = 0; a < TAU; a += TAU / 18) spots.push([Math.cos(a) * 0.098, -0.02 + Math.sin(a) * 0.098]);
    for (let x = -0.3; x <= 0.3; x += 0.05) if (Math.abs(x) > 0.06) { spots.push([x, 0.305]); spots.push([x, -0.11]); }
    for (let z = -0.15; z <= 0.3; z += 0.05) if (z < -0.04 || z > 0.06) { spots.push([0.036, z]); spots.push([-0.036, z]); }
    const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0065, 1).scale(1, 0.75, 1), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), spots.length);
    const blooms = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0018, 0), new THREE.MeshStandardMaterial({ roughness: 0.6 }), spots.length * 3);
    const bc = ['#2f8f5e', '#3aa56d', '#46b07a'].map(h => new THREE.Color(h)), fc = ['#ff7bb0', '#ffd23f', '#ffffff', '#b07cff', '#ff8a2a'].map(h => new THREE.Color(h));
    spots.forEach(([x, z], k) => {
      o.position.set(x, Y(x, z) + 0.004, z); o.rotation.set(0, k, 0); o.scale.setScalar(0.85 + (k % 3) * 0.15); o.updateMatrix(); bushes.setMatrixAt(k, o.matrix); bushes.setColorAt(k, bc[k % 3]);
      for (let f = 0; f < 3; f++) { const a = k * 1.7 + f * 2.1; o.position.set(x + Math.cos(a) * 0.004, Y(x, z) + 0.0085, z + Math.sin(a) * 0.004); o.scale.setScalar(1); o.updateMatrix(); blooms.setMatrixAt(k * 3 + f, o.matrix); blooms.setColorAt(k * 3 + f, fc[(k + f) % fc.length]); }
    });
    g.add(bushes, blooms);
  }
  for (const [x, z] of [[0.48, 0.17], [-0.12, -0.38], [0.12, -0.38]]) palm(g, x, z, 0.1, Y(x, z));
  for (const [x, z] of [[0.045, -0.08], [-0.045, -0.08], [0.045, 0.1], [-0.045, 0.1], [0.045, 0.28], [-0.045, 0.28]]) lamp(g, x, z, Y(x, z), 0.042);
  walkers(g, [
    [[0.008, 0.31], [0.008, -0.18], [-0.008, -0.18], [-0.008, 0.31]],
    [[-0.32, -0.16], [-0.12, -0.075], [0.12, -0.075], [0.31, -0.11], [0.12, -0.085], [-0.12, -0.085]],
    [[-0.4, 0.2], [-0.12, 0.255], [0.12, 0.255], [0.4, 0.235], [0.12, 0.265], [-0.12, 0.265]],
    [[-0.4, 0.33], [0.4, 0.33], [0.4, 0.34], [-0.4, 0.34]]
  ], 4, ['#ffffff', '#1e4488', '#00b7e3', '#2a3446', '#ffc56b', '#ff7bb0'], (x, z) => Y(x, z) + 0.0016);
  // ── Animações (uma função só para a área inteira).
  const host = new THREE.Object3D(); host.userData.keep = true; host.userData.detail = true; g.add(host);              // só anima com a área aberta
  host.userData.anim = t => { for (const a of anims) a(t); };
  animated.push(host);
}

export { buildEducation };
