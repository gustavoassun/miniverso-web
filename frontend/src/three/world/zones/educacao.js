import * as THREE from 'three';
import { R, TAU, smooth } from '../../core/math.js';
import { box, cyl, draped, mat, road, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, loopPath, walkers } from '../people.js';
import { confetti, lamp, palm, tree, waveFlag, zebra } from '../props.js';
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
  waveFlag(g, -0.075, -0.205, 0.08, plainFlag('#1f9d55', '#ffd23f'), 0.04);
  waveFlag(g, -0.06, -0.205, 0.08, maranhaoTex(), 0.04);
  waveFlag(g, -0.045, -0.205, 0.08, plainFlag('#1e4488', '#00b7e3'), 0.04);
  // Amarelinha pintada no pátio.
  decal(g, 0.025, 0.07, -0.11, -0.175, FLOOR + 0.0006, new THREE.MeshStandardMaterial({ roughness: 0.9, alphaTest: 0.5, map: canvasTex(48, 128, (x, w, h) => {
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
  const signL = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.011), label('LAB VR', '#00b7e3', '#06102a', 160, 26, 'bold 18px sans-serif')); signL.position.set(LX, lTop + 0.011, LZ + LD / 2 + 0.006); g.add(signL);
  box(0.07, 0.014, 0.002, '#00b7e3', LX, lTop + 0.004, LZ + LD / 2 + 0.005, g);
  // Pedestais com hologramas.
  const holoAt = [[-0.045, '#7fe9ff'], [0, '#b07cff'], [0.045, '#3ee07a']];
  holoAt.forEach(([dx]) => { cyl(0.009, 0.006, '#2a3446', LX + dx, Y(LX + dx, LZ - 0.012), LZ - 0.012, g, 14); cyl(0.0075, 0.0012, '#00b7e3', LX + dx, Y(LX + dx, LZ - 0.012) + 0.006, LZ - 0.012, g, 14); });
  const hy = Y(LX, LZ) + 0.03;
  const holo = new THREE.Group(); holo.position.set(LX, hy, LZ - 0.012); holo.userData.keep = true; g.add(holo);
  const hPlanet = new THREE.Group(); hPlanet.position.x = -0.045; holo.add(hPlanet);
  hPlanet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.011, 2), holoMat('#7fe9ff', 0.55)));
  for (let i = 0; i < 6; i++) { const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 0), holoMat('#3ee07a', 0.8)); c.position.setFromSphericalCoords(0.01, 0.6 + i * 0.4, i * 1.9); hPlanet.add(c); }
  const hRing = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0007, 4, 40), holoMat('#ffffff', 0.6)); hRing.rotation.x = 1.2; hPlanet.add(hRing);
  const dna = new THREE.Group(); holo.add(dna);
  const dnaN = 12, dnaBalls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 6, 4), holoMat('#ff8ad8', 0.9), dnaN * 2), dnaRungs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.0007, 0.0007), holoMat('#ffffff', 0.55), dnaN);
  for (let i = 0; i < dnaN; i++) { const a = i * 0.62, yy = -0.012 + i * 0.0026; for (const s of [0, 1]) { o.position.set(Math.cos(a + s * Math.PI) * 0.006, yy, Math.sin(a + s * Math.PI) * 0.006); o.rotation.set(0, 0, 0); o.scale.setScalar(1); o.updateMatrix(); dnaBalls.setMatrixAt(i * 2 + s, o.matrix); } o.position.set(0, yy, 0); o.rotation.set(0, -a, 0); o.scale.set(0.012, 1, 1); o.updateMatrix(); dnaRungs.setMatrixAt(i, o.matrix); }
  dnaBalls.frustumCulled = dnaRungs.frustumCulled = false; dna.add(dnaBalls, dnaRungs);
  const atom = new THREE.Group(); atom.position.x = 0.045; holo.add(atom);
  atom.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.0045, 1), holoMat('#ffd28a', 0.95)));
  const electrons = [0, 1, 2].map(k => { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.014, 0.0006, 4, 36), holoMat('#3ee07a', 0.6)); ring.rotation.set(k * 1.05, k * 0.6, 0); atom.add(ring); const e = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 6, 4), holoMat('#ffffff', 1)); ring.add(e); return e; });
  const beams = holoAt.map(([dx, c]) => { const b = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.024, 14, 1, true), holoMat(c, 0.12)); b.position.set(LX + dx, Y(LX + dx, LZ - 0.012) + 0.019, LZ - 0.012); b.rotation.x = Math.PI; b.userData.keep = true; g.add(b); return b; });
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

  // ── 4. Universidade: prédio com colunas e frontão, escadaria, gramado com estudantes e o palco da formatura.
  const UX = -0.3, UZ = -0.27;
  const uTop = building(g, 0.16, 0.07, 0.085, windowsMat('#efe9dc', '#5a8fc4', '#ffffff', 2, 7), UX, UZ);
  box(0.172, 0.006, 0.097, '#ffffff', UX, uTop - 0.001, UZ, g);
  const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.006, 3), mat('#f6f1e6')); ped.rotation.set(Math.PI / 2, 0, Math.PI / 2); ped.scale.set(0.45, 1, 1.45);
  ped.position.set(UX, uTop + 0.017, UZ + 0.05); g.add(ped);
  box(0.1, 0.005, 0.03, '#f6f1e6', UX, uTop + 0.002, UZ + 0.05, g);
  for (let i = 0; i < 6; i++) { const x = UX - 0.045 + i * 0.018; cyl(0.0035, uTop - Y(x, UZ + 0.058), '#ffffff', x, Y(x, UZ + 0.058) + 0.004, UZ + 0.058, g, 10); }
  for (let s = 0; s < 3; s++) box(0.11 - s * 0.006, 0.0025, 0.012, '#e6ddcc', UX, Y(UX, UZ + 0.07 + s * 0.008) - 0.001 + (2 - s) * 0.0022, UZ + 0.07 - s * 0.004, g);
  const signU = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.009), label('UNIVERSIDADE', '#f6f1e6', '#2a3446', 220, 28, 'bold 18px serif')); signU.position.set(UX, uTop + 0.0115, UZ + 0.066); g.add(signU);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.022, 16, 8, 0, TAU, 0, Math.PI / 2), mat('#3f7fc4', { metalness: 0.3, roughness: 0.4 })); dome.position.set(UX, uTop + 0.004, UZ - 0.01); g.add(dome);
  // Gramado: estudantes sentados em rodas e o palco da formatura com formandos de beca.
  const sit = [[-0.4, -0.15], [-0.39, -0.135], [-0.41, -0.13], [-0.25, -0.1], [-0.24, -0.085], [-0.26, -0.08]].map(([x, z]) => [x, z, Y(x, z) - 0.004]);
  crowd(g, sit, zi, ['#ffc56b', '#ffffff', '#3ee07a', '#ff7bb0', '#00b7e3', '#b07cff']);
  for (const [x, z] of [[-0.4, -0.142], [-0.25, -0.09]]) { const bk = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.0012, 0.004), mat(C.coral)); bk.position.set(x + 0.007, Y(x, z) + 0.001, z); g.add(bk); }
  const stX = -0.345, stZ = -0.12;
  box(0.07, 0.006, 0.03, '#ffffff', stX, Y(stX, stZ), stZ, g);
  box(0.07, 0.03, 0.003, '#1e4488', stX, Y(stX, stZ - 0.015), stZ - 0.015, g);
  const grads = Array.from({ length: 5 }, (_, k) => [stX - 0.028 + k * 0.014, stZ + 0.004, Y(stX, stZ) + 0.006]);
  crowd(g, grads, zi, ['#1a1d24'], { fx: fxT4 });
  const caps = new THREE.InstancedMesh(paintGeo([[bx(0.0075, 0.0007, 0.0075, 0, 0.0016, 0), '#1a1d24'], [new THREE.CylinderGeometry(0.0026, 0.0026, 0.0016, 8).translate(0, 0.0008, 0), '#1a1d24'], [bx(0.0006, 0.003, 0.0006, 0.0033, -0.0008, 0), '#ffd23f']]), vehMat(), grads.length);
  caps.frustumCulled = false; caps.userData.detail = true; g.add(caps);
  const capV = grads.map((_, k) => new THREE.Vector3((k - 2) * 0.012, 0.16 + (k % 3) * 0.03, 0.02 + (k % 2) * 0.02));
  const cheerU = confetti(g, stX, Y(stX, stZ) + 0.03, stZ + 0.01);
  anims.push(t => {
    const f = fxT4(zi), throwing = f >= 0 && f < 3.2;
    grads.forEach(([x, z, y], k) => {
      if (throwing) { const a = Math.max(0, f - 0.4); o.position.set(x + capV[k].x * a, y + 0.0195 + capV[k].y * a - 0.11 * a * a, z + capV[k].z * a); o.rotation.set(a * 9 + k, a * 7, a * 5); }
      else { o.position.set(x, y + 0.0195, z); o.rotation.set(0, 0.3 * k, 0); }
      o.scale.setScalar(1); o.updateMatrix(); caps.setMatrixAt(k, o.matrix);
    });
    caps.instanceMatrix.needsUpdate = true;
    if (f > 0.5 && f < 0.6 && cheerU.userData.at < t - 3) cheerU.userData.at = t;
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
  const STARS = 7, shoot = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.0016, 0.0016), new THREE.MeshBasicMaterial({ color: '#fff6c8', toneMapped: false, transparent: true, opacity: 0.9 }), STARS);
  shoot.frustumCulled = false; shoot.userData.detail = true; g.add(shoot);
  for (let i = 0; i < STARS; i++) shoot.setMatrixAt(i, zero);
  const glowC = new THREE.Color(), nightA = new THREE.Color('#1a2a6a'), nightB = new THREE.Color('#ffd23f');
  anims.push(t => {
    const f = fxT(zi), k = f < 0 ? 0 : smooth(0, 1.4, f) * (1 - smooth(9, 10.5, f));
    halves[0].rotation.x = k * 1.1; halves[1].rotation.x = -k * 1.1;
    scope.position.y = oTop - 0.02 + k * 0.03; scope.rotation.z = 0.2 + k * (0.5 + Math.sin(t * 0.7) * 0.15);
    glowIn.material.color.copy(glowC.copy(nightA).lerp(nightB, k * (0.4 + 0.2 * Math.sin(t * 3))));
    if (k > 0.05) {
      for (let i = 0; i < STARS; i++) { const c = ((t * 0.55 + i / STARS) % 1); o.position.set(-0.35 + c * 0.8, 0.3 + Math.sin(i * 3.1) * 0.06 - c * 0.08, -0.35 + (i % 4) * 0.12); o.rotation.set(0, 0.2, -0.25); o.scale.set(k * (1 - c), 1, 1); o.updateMatrix(); shoot.setMatrixAt(i, o.matrix); }
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
  const players = Array.from({ length: 8 }, (_, k) => [QX + (k % 4 - 1.5) * 0.03, QZ + (k < 4 ? -0.018 : 0.018)]).map(([x, z]) => [x, z, Y(x, z) + 0.0024]);
  crowd(g, players, zi, ['#00b7e3', '#00b7e3', '#ff8a6b', '#ff8a6b', '#00b7e3', '#ff8a6b', '#00b7e3', '#ff8a6b'], { fx: fxT2 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 10, 8), mat(C.white)); ball.userData.keep = true; g.add(ball);
  // Pula-corda no pátio: duas crianças batem a corda e uma pula.
  const JX = 0.08, JZ = -0.15, jy = Y(JX, JZ) + 0.0016;
  crowd(g, [[JX - 0.02, JZ, jy], [JX + 0.02, JZ, jy]], zi, ['#ffc56b', '#b07cff'], { fx: fxT2 });
  const rope = new THREE.Mesh(new THREE.TorusGeometry(0.02, 0.0006, 4, 24, Math.PI), mat('#ff4fd8')); rope.position.set(JX, jy + 0.012, JZ); rope.userData.keep = true; g.add(rope);
  const jumper = new THREE.Group(); jumper.position.set(JX, jy, JZ); jumper.userData.keep = true; g.add(jumper);
  const jb = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0042, 0.013, 6), mat('#3ee07a')); jb.position.y = 0.0065; jumper.add(jb);
  const jh = new THREE.Mesh(new THREE.SphereGeometry(0.0033, 8, 6), mat('#c68a5e')); jh.position.y = 0.016; jumper.add(jh);
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
    const sp = on ? 9 : 5.5; rope.rotation.x = t * sp; jumper.position.y = jy + Math.max(0, Math.sin(t * sp)) * 0.008;
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
  // Lago com patos (água curva com marolas) e a ponte de madeira.
  const PKX = -0.36, PKZ = 0.1;
  decal(g, 0.11, 0.08, PKX, PKZ, FLOOR + 0.0008, new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.1, alphaTest: 0.5, map: canvasTex(128, 96, (x, w, h) => {
    x.fillStyle = '#e6d6ad'; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 1, h / 2 - 1, 0, 0, TAU); x.fill();
    x.fillStyle = '#3cb4d8'; x.beginPath(); x.ellipse(w / 2, h / 2, w / 2 - 8, h / 2 - 8, 0, 0, TAU); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 2; for (let i = 0; i < 10; i++) { const cx = 24 + R() * 80, cy = 22 + R() * 52; x.beginPath(); x.arc(cx, cy, 5, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
  }) }));
  box(0.012, 0.003, 0.05, '#a07a5a', PKX + 0.02, Y(PKX + 0.02, PKZ) + 0.001, PKZ, g);
  const duckG = paintGeo([[new THREE.SphereGeometry(0.003, 8, 6).scale(1.4, 0.8, 1), '#ffffff'], [new THREE.SphereGeometry(0.0018, 8, 6).translate(0.0035, 0.0025, 0), '#ffffff'], [bx(0.0018, 0.0006, 0.0012, 0.0052, 0.0022, 0), '#ff9a2a']]);
  const DUCKS = 4, ducks = new THREE.InstancedMesh(duckG, vehMat(), DUCKS); ducks.frustumCulled = false; ducks.userData.detail = true; g.add(ducks);
  anims.push(t => {
    for (let i = 0; i < DUCKS; i++) { const a = t * 0.35 + i * TAU / DUCKS + Math.sin(t * 0.7 + i) * 0.2, x = PKX + Math.cos(a) * 0.032, z = PKZ + Math.sin(a) * 0.022; o.position.set(x, Y(x, z) + 0.0028, z); o.rotation.set(0, -a - Math.PI / 2, 0); o.scale.setScalar(1); o.updateMatrix(); ducks.setMatrixAt(i, o.matrix); }
    ducks.instanceMatrix.needsUpdate = true;
    anemo.rotation.y = t * 5; vane.rotation.y = Math.sin(t * 0.4) * 0.8;
  });
  // Trilha com árvores e plaquinhas.
  for (const [x, z, s, c] of [[-0.45, 0.04, 0.8], [-0.31, 0.03, 0.75, '#ffd23f'], [-0.2, 0.1, 0.7], [-0.46, 0.14, 0.75, '#ff7bb0']]) tree(g, x, z, s, c, Y(x, z));
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
  for (const [x, z, s, c] of [[0.45, -0.05, 0.85], [0.42, 0.06, 0.8, '#ffd23f'], [0.15, -0.4, 0.8], [-0.15, -0.42, 0.85], [-0.45, -0.33, 0.8], [0.46, -0.32, 0.8, '#ff7bb0'], [0.37, 0.25, 0.8], [0.06, 0.24, 0.75, '#ffd23f'], [-0.08, 0.24, 0.75]]) tree(g, x, z, s, c, Y(x, z));
  for (const [x, z] of [[0.48, 0.17], [-0.12, -0.38], [0.12, -0.38]]) palm(g, x, z, 0.1, Y(x, z));
  for (const [x, z] of [[0.045, -0.08], [-0.045, -0.08], [0.045, 0.1], [-0.045, 0.1], [0.045, 0.28], [-0.045, 0.28]]) lamp(g, x, z, Y(x, z), 0.042);
  walkers(g, [
    [[0.008, 0.31], [0.008, -0.18], [-0.008, -0.18], [-0.008, 0.31]],
    [[-0.32, -0.16], [-0.12, -0.075], [0.12, -0.075], [0.31, -0.11], [0.12, -0.085], [-0.12, -0.085]],
    [[-0.4, 0.2], [-0.12, 0.255], [0.12, 0.255], [0.4, 0.235], [0.12, 0.265], [-0.12, 0.265]],
    [[-0.4, 0.33], [0.4, 0.33], [0.4, 0.34], [-0.4, 0.34]]
  ], 4, ['#ffffff', '#1e4488', '#00b7e3', '#2a3446', '#ffc56b', '#ff7bb0'], (x, z) => Y(x, z) + 0.0016);
  // Recreio: turma correndo pelo pátio (aparece só no recreio).
  const RUN = 10, runG = paintGeo([[new THREE.CylinderGeometry(0.0028, 0.0036, 0.011, 6).translate(0, 0.0055, 0), '#ffffff'], [new THREE.SphereGeometry(0.0029, 8, 6).translate(0, 0.014, 0), '#c68a5e']]);
  const runners = new THREE.InstancedMesh(runG, new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), RUN); runners.frustumCulled = false; runners.userData.detail = true; g.add(runners);
  const runC = ['#ff7bb0', '#ffd23f', '#00b7e3', '#3ee07a', '#ff8a2a'].map(h => new THREE.Color(h));
  for (let i = 0; i < RUN; i++) { runners.setColorAt(i, runC[i % runC.length]); runners.setMatrixAt(i, zero); }
  anims.push(t => {
    const r2 = fxT2(zi), on = r2 >= 0 && r2 < 10;
    if (on) {
      const k = smooth(0, 0.8, r2) * (1 - smooth(9, 10, r2));
      for (let i = 0; i < RUN; i++) { const a = t * (0.9 + (i % 3) * 0.2) + i * TAU / RUN, rr = 0.045 + (i % 4) * 0.012, x = Math.cos(a) * rr * 1.4, z = -0.02 + Math.sin(a) * rr; o.position.set(x, Y(x, z) + 0.0016 + Math.abs(Math.sin(t * 12 + i)) * 0.003, z); o.rotation.set(0, -a, 0); o.scale.setScalar(k); o.updateMatrix(); runners.setMatrixAt(i, o.matrix); }
      runners.instanceMatrix.needsUpdate = true; runners.userData.live = true;
    } else if (runners.userData.live) { for (let i = 0; i < RUN; i++) runners.setMatrixAt(i, zero); runners.instanceMatrix.needsUpdate = true; runners.userData.live = false; }
  });

  // ── Animações (uma função só para a área inteira).
  const host = new THREE.Object3D(); host.userData.keep = true; host.userData.detail = true; g.add(host);              // só anima com a área aberta
  host.userData.anim = t => { for (const a of anims) a(t); };
  animated.push(host);
}

export { buildEducation };
