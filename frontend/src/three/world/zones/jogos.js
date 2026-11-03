import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, TAU } from '../../core/math.js';
import { sag } from '../build.js';
import { crowd, walkers } from '../people.js';
import { confetti } from '../props.js';
import { animated, rt, toyKick, toys } from '../runtime.js';
import { canvasTex, holoMat } from '../textures.js';

// Jogos: Parque Arcade. Um autódromo de kart contorna o parque (largada com semáforo, arquibancada com torcida, box,
// telão com a classificação, zebras, pneus, faixas de turbo, passarela e arco inflável); dentro dele ficam a Praça
// Arcade (salão de fliperamas, roda-gigante, carrossel, controle gigante e blocos flutuando), a Arena dos Blocos, com
// piso de LED, e o palco do Reciclaverso, com as cinco lixeiras e o pedestal onde o lixo aparece.
// Leveza: quase tudo que é parado vira duas malhas com cor nos vértices (uma fosca e uma acesa); peças repetidas
// (pneus, cones, torcida, cabines da roda-gigante, luzes) são desenhadas de uma vez só.
const game = { zi: 3, party: null };
// Reciclaverso (jogo da Miniverso): cinco lixeiras, uma esteira trazendo o lixo e um estoque de itens para separar.
const BINS = [['Papel', '#2f7dff'], ['Vidro', '#2fbf5a'], ['Metal', '#ffc21a'], ['Plástico', '#e8452f'], ['Orgânico', '#8a5a34']];
const recy = { hover: -1, bins: [], items: [], stand: null, eye: null, look: null, timer: null, lidT: [-9, -9, -9, -9, -9], party: null, at: [0, 0, 0] };
const whack = { on: false, end: 0, score: 0, best: 0, next: 0, lastTxt: 0, pads: [], leds: null, ledT: [], pop: null, flash: '', flashAt: 0 };
const race = { state: 'off', karts: [], lights: null, board: null, party: null };
// Fliperama do Salão Arcade: alvo de clique em volta das máquinas e o ponto de onde a câmera olha para elas.
const arcade = { hit: null, at: [0, 0, 0] };

// Pista: linha central fechada (coordenadas da área), percorrida no sentido horário visto de cima.
const CTRL = [[-0.05, -0.4], [0.26, -0.4], [0.4, -0.33], [0.43, -0.19], [0.38, -0.05], [0.43, 0.1], [0.4, 0.25], [0.28, 0.36], [0.16, 0.38], [0.08, 0.32], [0.01, 0.3],
  [-0.07, 0.35], [-0.22, 0.41], [-0.36, 0.33], [-0.43, 0.17], [-0.41, 0], [-0.44, -0.16], [-0.38, -0.32], [-0.24, -0.4]];
// LIFT: o relevo do planeta fica ~4–5 mm acima da base da área; pista e piso vão um pouco acima dele.
const N = 360, W = 0.028, LIFT = 0.0068;
const track = { N, W, X: new Float32Array(N), Z: new Float32Array(N), TX: new Float32Array(N), TZ: new Float32Array(N), K: new Float32Array(N), VL: new Float32Array(N), L: 0, ds: 0, pads: [] };
{
  const pts = new THREE.CatmullRomCurve3(CTRL.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal').getSpacedPoints(N);
  for (let i = 0; i < N; i++) { track.X[i] = pts[i].x; track.Z[i] = pts[i].z; track.L += pts[i].distanceTo(pts[i + 1]); }
  track.ds = track.L / N;
  for (let i = 0; i < N; i++) { const a = (i + N - 1) % N, b = (i + 1) % N, dx = track.X[b] - track.X[a], dz = track.Z[b] - track.Z[a], l = Math.hypot(dx, dz); track.TX[i] = dx / l; track.TZ[i] = dz / l; }
  // Curvatura (com sinal: positiva vira à direita) e a velocidade que os karts do computador aguentam em cada trecho.
  for (let i = 0; i < N; i++) {
    const b = (i + 1) % N, a = Math.atan2(track.TZ[b], track.TX[b]) - Math.atan2(track.TZ[i], track.TX[i]);
    track.K[i] = Math.atan2(Math.sin(a), Math.cos(a)) / track.ds;
  }
  for (let i = 0; i < N; i++) { let k = 0; for (let j = -3; j <= 3; j++) k += Math.abs(track.K[(i + j + N) % N]); track.VL[i] = Math.min(0.27, Math.sqrt(0.3 / Math.max(1e-3, k / 7))); }
}
// Ponto da pista a uma distância s da largada, deslocado lat para a direita: { x, z, h } (h = direção em radianos).
function trackAt(s, lat, out) {
  const f = ((s % track.L) + track.L) % track.L / track.ds, i = Math.floor(f) % N, j = (i + 1) % N, u = f - Math.floor(f);
  const tx = track.TX[i] + (track.TX[j] - track.TX[i]) * u, tz = track.TZ[i] + (track.TZ[j] - track.TZ[i]) * u;
  out.x = track.X[i] + (track.X[j] - track.X[i]) * u - tz * lat; out.z = track.Z[i] + (track.Z[j] - track.Z[i]) * u + tx * lat; out.h = Math.atan2(tz, tx);
  return out;
}
const nearest = (x, z) => { let best = 0, bd = 9; for (let i = 0; i < N; i++) { const d = (track.X[i] - x) ** 2 + (track.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; };

// Peças com a cor gravada nos vértices: tudo que é parado entra em S (fosco) ou G (aceso) e vira uma malha só.
// O piso do parque acompanha a curvatura do planeta; palcos e bases retos ficam acima do ponto mais alto dele.
const FLOOR = 0.0056;
const topAt = (x, z, rad) => { const r = Math.max(0, Math.hypot(x, z) - rad); return sag(r, 0) + FLOOR; };
const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
function paint(geo, color) {
  if (geo.index) geo = geo.toNonIndexed();
  geo.deleteAttribute('uv'); _c.set(color);
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
function piece(list, geo, color, x, y, z, ry = 0, rx = 0, rz = 0) {
  geo = paint(geo, color); geo.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), ONE)); list.push(geo); return geo;
}
const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r, h, s = 10, r2 = r) => new THREE.CylinderGeometry(r, r2, h, s);
const meshOf = (list, m) => { const mesh = new THREE.Mesh(mergeGeometries(list), m); return mesh; };

// Kart: chassi baixo, para-choques, rodas, piloto com capacete da cor do kart (uma malha só por kart).
function kartGeo(color) {
  const L = [];
  piece(L, Bx(0.028, 0.003, 0.016), '#2a2f3a', 0, 0.0035, 0);
  piece(L, Bx(0.011, 0.004, 0.012), color, 0.009, 0.006, 0);
  piece(L, Bx(0.004, 0.003, 0.016), color, 0.0145, 0.004, 0);
  for (const s of [-1, 1]) piece(L, Bx(0.012, 0.004, 0.004), color, -0.002, 0.006, s * 0.0075);
  piece(L, Bx(0.003, 0.004, 0.019), color, -0.0145, 0.0045, 0);
  for (const [x, z] of [[0.009, 0.0085], [0.009, -0.0085], [-0.009, 0.009], [-0.009, -0.009]]) piece(L, Cy(0.0035, x < 0 ? 0.0042 : 0.0032, 8), '#15161c', x, 0.0035, z, 0, Math.PI / 2);
  piece(L, Bx(0.004, 0.007, 0.009), '#3a3f4a', -0.007, 0.008, 0);
  piece(L, Bx(0.005, 0.006, 0.007), '#f4f4f8', -0.003, 0.009, 0);
  piece(L, new THREE.SphereGeometry(0.0037, 8, 6), color, -0.0025, 0.0138, 0);
  piece(L, Bx(0.0018, 0.0016, 0.0052), '#141428', -0.0001, 0.014, 0);
  piece(L, Cy(0.0026, 0.0008, 8), '#2a2f3a', 0.0035, 0.0105, 0, 0, 0, 0.9);
  return mergeGeometries(L);
}

// Letras em pixel para os letreiros (5 × 5).
const FONT = { P: ['11110', '10001', '11110', '10000', '10000'], L: ['10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '11111', '10001', '10001'], Y: ['10001', '01010', '00100', '00100', '00100'],
  R: ['11110', '10001', '11110', '10100', '10010'], C: ['01111', '10000', '10000', '10000', '01111'], D: ['11110', '10001', '10001', '10001', '11110'], E: ['11111', '10000', '11110', '10000', '11111'] };
const HEART = ['01010', '11111', '11111', '01110', '00100'];
const pixelText = (x, rows, ox, oy, c, px = 4) => { x.fillStyle = c; rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') x.fillRect(ox + i * px, oy + j * px, px - 1, px - 1); })); };
const signMat = (w, h, draw) => new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, draw) });

function buildGames(g, zi) {
  const S = [], G = [];
  const { X, Z, TX, TZ, K } = track;

  // Chão: gramado listrado por fora, área de escape em volta da pista e a praça em ladrilhos de pixel por dentro.
  {
    const FR = 0.6, SZ = 512, px = u => (u / FR + 1) / 2 * SZ;
    const tex = canvasTex(SZ, SZ, (x, w, h) => {
      for (let i = -w; i < w * 2; i += 24) { x.fillStyle = (i / 24) % 2 ? '#55c084' : '#4cb67b'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 24, 0); x.lineTo(i + 24 - h * 0.4, h); x.lineTo(i - h * 0.4, h); x.fill(); }
      const loop = () => { x.beginPath(); for (let i = 0; i < N; i++) x[i ? 'lineTo' : 'moveTo'](px(X[i]), px(Z[i])); x.closePath(); };
      x.save(); loop(); x.clip();
      x.fillStyle = '#ece7f6'; x.fillRect(0, 0, w, h);
      const cols = ['#00b7e3', '#ff4fd8', '#ffc56b', '#3ee0b5', '#b07cff'];
      for (let r = 0; r < h / 8; r++) for (let k = 0; k < w / 8; k++) {
        const v = (r * 7 + k * 13 + ((r * k) % 5)) % 23;
        x.fillStyle = v === 0 ? cols[(r + k) % 5] : v < 9 ? '#e2dcf0' : '#ece7f6'; x.fillRect(k * 8 + 0.5, r * 8 + 0.5, 7, 7);
      }
      // Calçadas coloridas ligando o salão, a roda-gigante e a arena.
      x.lineCap = 'round'; x.lineWidth = 14; x.strokeStyle = 'rgba(176,124,255,.35)';
      x.beginPath(); x.moveTo(px(-0.2), px(0.12)); x.quadraticCurveTo(px(0), px(-0.02), px(0.19), px(0.07)); x.moveTo(px(-0.22), px(-0.08)); x.quadraticCurveTo(px(-0.05), px(0), px(0.02), px(0.12)); x.stroke();
      x.restore();
      // Caixas de brita por fora das curvas mais fechadas.
      for (let i = 0; i < N; i += 6) {
        let k = 0; for (let j = -5; j <= 5; j++) k += K[(i + j + N) % N]; k /= 11; if (Math.abs(k) < 4.5) continue;
        const side = k > 0 ? -1 : 1, bx = X[i] - TZ[i] * (W + 0.045) * side, bz = Z[i] + TX[i] * (W + 0.045) * side;
        x.fillStyle = '#e6d6ad'; x.beginPath(); x.arc(px(bx), px(bz), 0.035 / (2 * FR) * SZ, 0, TAU); x.fill();
        x.fillStyle = '#cdbb8f'; for (let d = 0; d < 14; d++) x.fillRect(px(bx) + (R() - 0.5) * 22, px(bz) + (R() - 0.5) * 22, 2, 2);
      }
      loop(); x.lineJoin = 'round'; x.lineWidth = (2 * W + 0.05) / (2 * FR) * SZ; x.strokeStyle = '#ddd2bc'; x.stroke();
      x.lineWidth = (2 * W + 0.016) / (2 * FR) * SZ; x.strokeStyle = '#f4f1ea'; x.stroke();
      const gr = x.createRadialGradient(w / 2, h / 2, w * 0.44, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
    });
    const geo = new THREE.RingGeometry(0.0005, FR, 96, 16); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + FLOOR);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9 })));
  }

  // Asfalto: fita que acompanha a curvatura do planeta, com faixas brancas nas bordas.
  {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, nx = -TZ[k], nz = TX[k];
      for (const s of [-1, 1]) { const x = X[k] + nx * W * s, z = Z[k] + nz * W * s; pos.push(x, sag(x, z) + LIFT, z); uv.push((s + 1) / 2, i * track.ds / 0.05); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    const tex = canvasTex(32, 64, (x, w, h) => {
      x.fillStyle = '#3b4150'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { x.fillStyle = R() > 0.5 ? '#444b5c' : '#343a48'; x.fillRect(R() * w, R() * h, 1, 1); }
      x.fillStyle = '#f2f2f2'; x.fillRect(1, 0, 2, h); x.fillRect(w - 3, 0, 2, h);
      x.fillStyle = 'rgba(255,255,255,.5)'; x.fillRect(w / 2 - 0.5, 4, 1, 22);
    });
    tex.wrapT = THREE.RepeatWrapping;
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })));
  }
  // Zebras vermelhas e brancas nas curvas.
  {
    const pos = [], col = [], red = new THREE.Color('#e8452f'), white = new THREE.Color('#f6f6f6');
    for (let i = 0; i < N; i++) {
      let k = 0; for (let j = -4; j <= 4; j++) k = Math.max(k, Math.abs(K[(i + j + N) % N])); if (k < 6) continue;
      const j = (i + 1) % N, c = Math.floor(i / 2) % 2 ? red : white;
      for (const s of [-1, 1]) {
        const q = [[i, W], [i, W + 0.009], [j, W + 0.009], [j, W]].map(([n, o]) => { const x = X[n] - TZ[n] * o * s, z = Z[n] + TX[n] * o * s; return [x, sag(x, z) + LIFT + 0.0012, z]; });
        for (const t of s > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]) { pos.push(...q[t]); col.push(c.r, c.g, c.b); }
      }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
    S.push(geo);
  }
  // Faixa quadriculada da largada e as marcas do grid.
  for (let a = 0; a < 8; a++) for (let b = 0; b < 2; b++) {
    const lat = -W + (a + 0.5) * (2 * W / 8), along = (b - 0.5) * (2 * W / 8), x = X[0] - TZ[0] * lat + TX[0] * along, z = Z[0] + TX[0] * lat + TZ[0] * along;
    piece(S, Bx(2 * W / 8, 0.0006, 2 * W / 8), (a + b) % 2 ? '#15161c' : '#f6f6f6', x, sag(x, z) + LIFT + 0.0003, z, -Math.atan2(TZ[0], TX[0]));
  }
  const pt = { x: 0, z: 0, h: 0 };
  for (const [s, lat] of [[-0.035, -0.013], [-0.035, 0.013], [-0.085, -0.013], [-0.085, 0.013]]) { trackAt(s - 0.012, lat, pt); piece(S, Bx(0.0015, 0.0006, 0.018), '#f6f6f6', pt.x, sag(pt.x, pt.z) + LIFT + 0.0003, pt.z, -pt.h); }
  // Faixas de turbo: setas azuis acesas no meio das retas (só para o seu kart).
  for (const [px0, pz0, lat] of [[0.12, -0.4, -0.012], [-0.42, -0.06, -0.012]]) {
    const i = nearest(px0, pz0), s0 = i * track.ds; track.pads.push({ s0, s1: s0 + 0.05, lat });
    for (let k = 0; k < 3; k++) {
      trackAt(s0 + 0.008 + k * 0.016, lat, pt); const y = sag(pt.x, pt.z) + LIFT + 0.0007;
      for (const s of [-1, 1]) piece(G, Bx(0.012, 0.0006, 0.0028), '#3df2ff', pt.x - Math.sin(pt.h) * s * 0.004, y, pt.z + Math.cos(pt.h) * s * 0.004, -pt.h - s * 0.75);
    }
    trackAt(s0 + 0.025, lat, pt); piece(S, Bx(0.052, 0.0004, 0.022), '#173a5c', pt.x, sag(pt.x, pt.z) + LIFT + 0.0002, pt.z, -pt.h);
  }

  // Pneus pintados nas curvas (por fora) e cones na chicane: cada tipo é uma peça só, repetida.
  {
    const spots = [];
    for (let i = 0; i < N; i += 4) {
      let k = 0; for (let j = -6; j <= 6; j++) k += K[(i + j + N) % N]; if (Math.abs(k) / 13 < 2.2) continue;
      const side = k > 0 ? -1 : 1, x = X[i] - TZ[i] * (W + 0.02) * side, z = Z[i] + TX[i] * (W + 0.02) * side;
      let ok = true; for (let n = 0; n < N; n += 2) if ((X[n] - x) ** 2 + (Z[n] - z) ** 2 < (W + 0.012) ** 2) { ok = false; break; }
      if (ok) spots.push([x, z]);
    }
    const tires = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0062, 0.0062, 0.013, 10), new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), spots.length);
    const tc = ['#e8452f', '#f6f6f6', '#2a2f3a', '#00b7e3'].map(h => new THREE.Color(h));
    spots.forEach(([x, z], i) => { tires.setMatrixAt(i, _m.makeTranslation(x, sag(x, z) + 0.0065, z)); tires.setColorAt(i, tc[i % 4]); });
    g.add(tires);
    const cones = [[0.4, -0.04], [0.41, -0.07], [0.385, 0.11], [0.06, 0.255], [0.02, 0.255], [-0.03, -0.355], [0.07, -0.355]];
    const cm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0035, 0.011, 8), new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6 }), cones.length);
    cones.forEach(([x, z], i) => cm.setMatrixAt(i, _m.makeTranslation(x, sag(x, z) + 0.0055, z)));
    g.add(cm);
  }

  // Pórtico da largada com o semáforo de cinco luzes, de frente para quem chega.
  {
    const x0 = X[0] + 0.004, z0 = Z[0], ry = -Math.atan2(TZ[0], TX[0]), y0 = sag(x0, z0);
    for (const s of [-1, 1]) piece(S, Bx(0.006, 0.075, 0.006), '#e9ecf5', x0, y0 + 0.0375, z0 + s * (W + 0.016), ry);
    piece(S, Bx(0.012, 0.014, 2 * W + 0.044), '#2b2250', x0, y0 + 0.075, z0, ry);
    for (let k = 0; k < 10; k++) piece(S, Bx(0.0125, 0.006, 0.0072), k % 2 ? '#15161c' : '#f6f6f6', x0, y0 + 0.085, z0 - 0.036 + k * 0.008, ry);
    piece(G, Bx(0.0125, 0.0018, 2 * W + 0.044), '#ff4fd8', x0, y0 + 0.0675, z0, ry);
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), 5);
    for (let k = 0; k < 5; k++) { lights.setMatrixAt(k, _m.makeTranslation(x0 - 0.0065, y0 + 0.075, z0 - 0.02 + k * 0.01)); lights.setColorAt(k, _c.set('#3a1414')); }
    lights.userData.keep = true; g.add(lights); race.lights = lights;
    race.party = confetti(g, x0, y0 + 0.06, z0);
  }

  // Arquibancada atrás da reta principal, com cobertura e a torcida (que pula durante a corrida).
  const fans = [];
  for (const sx of [-0.135, -0.045, 0.045, 0.135]) {
    const y0 = sag(sx, -0.5);
    for (let j = 0; j < 4; j++) {
      const z = -0.47 - j * 0.016, h = 0.01 * (j + 1);
      piece(S, Bx(0.088, h, 0.016), j % 2 ? '#c9d0de' : '#dfe4ee', sx, y0 + h / 2, z);
      piece(S, Bx(0.088, 0.003, 0.004), ['#00b7e3', '#ff4fd8', '#ffc56b', '#3ee0b5'][(j + Math.round(sx * 20)) & 3], sx, y0 + h + 0.0015, z + 0.005);
      for (let k = 0; k < 6; k++) fans.push([sx - 0.037 + k * 0.0148 + (R() - 0.5) * 0.004, y0 + h, z - 0.002]);
    }
    piece(S, Bx(0.09, 0.075, 0.004), '#2b2250', sx, y0 + 0.0375, -0.537);
    piece(S, Bx(0.094, 0.004, 0.08), '#00b7e3', sx, y0 + 0.078, -0.5, 0, -0.12);
    piece(S, Cy(0.0022, 0.07, 6), '#e9ecf5', sx - 0.044, y0 + 0.035, -0.464);
  }
  {
    const cm = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.0026, 0.004, 3, 6), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), fans.length);
    const cc = ['#ff8a6b', '#ffc56b', '#3ee0b5', '#00b7e3', '#ff4fd8', '#b07cff', '#f6f6f6', '#7a5cff'].map(h => new THREE.Color(h));
    fans.forEach(([x, y, z], i) => { cm.setMatrixAt(i, _m.makeTranslation(x, y + 0.0052, z)); cm.setColorAt(i, cc[(i * 5) % 8]); });
    cm.userData.detail = true; cm.frustumCulled = false;
    const ph = fans.map(() => R() * TAU);
    cm.userData.anim = t => {
      const hype = race.state === 'off' ? 0.25 : 1;
      fans.forEach(([x, y, z], i) => cm.setMatrixAt(i, _m.makeTranslation(x, y + 0.0052 + Math.max(0, Math.sin(t * (5 + hype * 4) + ph[i])) * 0.0028 * hype, z)));
      cm.instanceMatrix.needsUpdate = true;
    };
    g.add(cm); animated.push(cm);
  }
  // Telão com a classificação ao vivo (redesenhado só quando muda a ordem ou a volta).
  {
    const tx = 0.32, tz = -0.5, y0 = sag(tx, tz);
    for (const s of [-1, 1]) piece(S, Bx(0.006, 0.17, 0.006), '#3a3f4a', tx + s * 0.055, y0 + 0.085, tz);
    piece(S, Bx(0.14, 0.085, 0.008), '#15161c', tx, y0 + 0.135, tz);
    piece(G, Bx(0.142, 0.0025, 0.009), '#ff4fd8', tx, y0 + 0.178, tz);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 144;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.073), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(tx, y0 + 0.135, tz + 0.0045); screen.userData.keep = true; g.add(screen);
    race.board = (title, rows) => {
      const x = cv.getContext('2d'); x.fillStyle = '#100a24'; x.fillRect(0, 0, 256, 144);
      x.fillStyle = '#ffc56b'; x.font = '700 22px monospace'; x.textAlign = 'center'; x.fillText(title, 128, 28);
      rows.forEach(([name, color, extra], k) => {
        const y = 52 + k * 24; x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(14, y - 15, 228, 20);
        x.textAlign = 'left'; x.fillStyle = '#7fe9ff'; x.font = '700 16px monospace'; x.fillText(`${k + 1}º`, 20, y);
        x.fillStyle = color; x.fillRect(54, y - 11, 12, 12); x.fillStyle = '#ffffff'; x.fillText(name, 74, y);
        if (extra) { x.textAlign = 'right'; x.fillStyle = '#ffc56b'; x.fillText(extra, 236, y); }
      });
      tex.needsUpdate = true;
    };
  }
  // Box: garagens com portas coloridas viradas para a pista e janelas acesas para a praça.
  {
    const bz = -0.335;
    for (let k = 0; k < 4; k++) {
      const x = -0.165 + k * 0.11, y0 = sag(x, bz);
      piece(S, Bx(0.1, 0.03, 0.034), '#e9ecf5', x, y0 + 0.015, bz);
      piece(S, Bx(0.07, 0.022, 0.002), ['#ff4fd8', '#00b7e3', '#ffc56b', '#3ee0b5'][k], x, y0 + 0.011, bz - 0.0175);
      piece(S, Bx(0.102, 0.004, 0.036), '#2b2250', x, y0 + 0.032, bz);
      for (const s of [-1, 1]) piece(G, Bx(0.018, 0.008, 0.002), '#ffd28a', x + s * 0.025, y0 + 0.018, bz + 0.0175);
    }
  }

  // Roda-gigante: aros duplos com luzes, raios, cabines que ficam sempre de pé, cavaletes e bilheteria.
  {
    const wx = -0.24, wz = -0.15, y0 = sag(wx, wz), hubY = 0.135, WR = 0.1;
    const bt = topAt(wx, wz, 0.09) + 0.002 - y0; piece(S, Bx(0.17, bt + 0.004, 0.075), '#3a3f6a', wx, y0 - 0.004 + (bt + 0.004) / 2, wz);
    for (const sz of [-1, 1]) for (const s of [-1, 1]) piece(S, Bx(0.006, 0.15, 0.006), '#e9ecf5', wx + s * 0.032, y0 + 0.0675 + 0.004, wz + sz * 0.024, 0, 0, s * 0.418);
    piece(S, Cy(0.004, 0.056, 8), '#c9d0de', wx, y0 + hubY, wz, 0, Math.PI / 2);
    piece(S, Bx(0.022, 0.026, 0.02), '#ff4fd8', wx + 0.075, y0 + 0.013, wz + 0.025);
    piece(G, Bx(0.014, 0.008, 0.002), '#ffd28a', wx + 0.075, y0 + 0.016, wz + 0.0355);
    const rig = new THREE.Group(); rig.position.set(wx, y0 + hubY, wz); g.add(rig);
    const wheel = new THREE.Group(); rig.add(wheel);
    const WS = [], WG = [];
    for (const z of [-0.013, 0.013]) {
      piece(WS, new THREE.TorusGeometry(WR, 0.0032, 5, 48), '#ff4fd8', 0, 0, z);
      piece(WS, new THREE.TorusGeometry(WR * 0.55, 0.002, 4, 32), '#e9ecf5', 0, 0, z);
      for (let i = 0; i < 8; i++) piece(WS, Bx(WR * 2, 0.0022, 0.0022), '#e9ecf5', 0, 0, z, 0, 0, i * Math.PI / 8);
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; piece(WG, Bx(0.004, 0.004, 0.004), i % 2 ? '#ffd23f' : '#7fe9ff', Math.cos(a) * WR, Math.sin(a) * WR, z * 1.25); }
    }
    piece(WS, Cy(0.009, 0.034, 10), '#ffc56b', 0, 0, 0, 0, Math.PI / 2);
    for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; piece(WS, Cy(0.0016, 0.03, 5), '#c9d0de', Math.cos(a) * WR, Math.sin(a) * WR, 0, 0, Math.PI / 2); }
    wheel.add(meshOf(WS, vcMat), meshOf(WG, glowMat));
    const cabG = mergeGeometries([paint(new RoundedBoxGeometry(0.02, 0.016, 0.017, 2, 0.003), '#ffffff').translate(0, -0.013, 0), paint(Bx(0.022, 0.003, 0.019), '#e9ecf5').translate(0, -0.0035, 0)]);
    const cabs = new THREE.InstancedMesh(cabG, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true }), 10);
    const cabCols = ['#ff8a6b', '#00b7e3', '#ffc56b', '#3ee0b5', '#b07cff'].map(h => new THREE.Color(h));
    for (let i = 0; i < 10; i++) cabs.setColorAt(i, cabCols[i % 5]);
    cabs.frustumCulled = false; rig.add(cabs);
    rig.userData.anim = t => {
      const a0 = t * 0.28; wheel.rotation.z = a0;
      for (let i = 0; i < 10; i++) { const a = a0 + i / 10 * TAU; cabs.setMatrixAt(i, _m.makeRotationZ(Math.sin(t * 1.3 + i) * 0.06).setPosition(Math.cos(a) * WR, Math.sin(a) * WR, 0)); }
      cabs.instanceMatrix.needsUpdate = true;
    };
    animated.push(rig);
  }

  // Salão Arcade: prédio com letreiro, neon nas quinas, porta acesa e fliperamas na calçada.
  {
    const hx = -0.205, hz = 0.165, y0 = sag(hx, hz), HW = 0.15, HH = 0.06, HD = 0.085, fz = hz + HD / 2;
    piece(S, Bx(HW, HH, HD), '#2b2250', hx, y0 + HH / 2, hz);
    piece(S, Bx(HW + 0.006, 0.006, HD + 0.006), '#ff4fd8', hx, y0 + HH + 0.003, hz);
    for (let k = 0; k < 7; k++) piece(S, Bx(0.008, 0.012, 0.002), ['#00b7e3', '#ffc56b', '#3ee0b5', '#ff8a6b'][k % 4], hx - HW / 2 + 0.012 + k * 0.021, y0 + HH - 0.012, fz + 0.001);
    for (const s of [-1, 1]) {
      piece(G, Bx(0.0025, HH, 0.0025), '#7fe9ff', hx + s * HW / 2, y0 + HH / 2, fz);
      piece(G, Bx(0.032, 0.02, 0.002), '#ffc56b', hx + s * 0.045, y0 + 0.03, fz + 0.001);
      piece(S, Bx(0.034, 0.003, 0.004), '#ff4fd8', hx + s * 0.045, y0 + 0.042, fz + 0.002);
    }
    piece(G, Bx(HW, 0.0025, 0.0025), '#7fe9ff', hx, y0 + HH, fz);
    piece(G, Bx(0.028, 0.036, 0.002), '#ff9de9', hx, y0 + 0.018, fz + 0.001);
    piece(S, Bx(0.036, 0.004, 0.012), '#ff4fd8', hx, y0 + 0.038, fz + 0.006);
    piece(S, Cy(0.008, 0.012, 10), '#e9ecf5', hx + 0.05, y0 + HH + 0.012, hz - 0.02);
    piece(S, new THREE.SphereGeometry(0.012, 10, 6, 0, TAU, 0, Math.PI / 2), '#c9d0de', hx + 0.05, y0 + HH + 0.018, hz - 0.02, 0, -0.6);
    const arch = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.0325), signMat(128, 32, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff4fd8'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
      [...'ARCADE'].forEach((ch, i) => pixelText(x, FONT[ch], 8 + i * 19, 8, i % 2 ? '#7fe9ff' : '#ffc56b', 3));
    }));
    arch.position.set(hx, y0 + HH + 0.026, fz - 0.004); arch.userData.keep = true; g.add(arch);
    for (const s of [-1, 1]) piece(S, Bx(0.004, 0.03, 0.004), '#3a3f4a', hx + s * 0.05, y0 + HH + 0.012, fz - 0.006);
    const hitBox = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.075, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
    hitBox.position.set(hx, y0 + 0.035, fz + 0.012); hitBox.userData.keep = true; g.add(hitBox);
    arcade.hit = hitBox; arcade.at = [hx, y0 + 0.032, fz + 0.02];
    // Fliperamas: gabinete, tela inclinada acesa, letreiro, painel com alavanca e botões.
    const cabCols = ['#7a5cff', '#00b7e3', '#ff8a6b', '#3ee0b5'], screenCols = ['#7fe9ff', '#ffc56b', '#ff9de9', '#9dffb0'];
    [-0.27, -0.24, -0.17, -0.14].forEach((x, i) => {
      const z = fz + 0.018, y = sag(x, z);
      piece(S, Bx(0.022, 0.05, 0.018), cabCols[i], x, y + 0.025, z);
      piece(S, Bx(0.022, 0.012, 0.012), '#15161c', x, y + 0.02, z + 0.012, 0, 0.5);
      piece(G, Bx(0.016, 0.014, 0.002), screenCols[i], x, y + 0.037, z + 0.0095, 0, -0.18);
      for (let k = 0; k < 3; k++) piece(G, Bx(0.003, 0.003, 0.001), '#ffffff', x - 0.004 + k * 0.004, y + 0.034 + (k % 2) * 0.004, z + 0.011, 0, -0.18);
      piece(G, Bx(0.023, 0.007, 0.019), screenCols[(i + 2) % 4], x, y + 0.0535, z);
      piece(S, Cy(0.0009, 0.006, 5), '#15161c', x - 0.005, y + 0.027, z + 0.015);
      piece(S, new THREE.SphereGeometry(0.0022, 6, 4), '#e8452f', x - 0.005, y + 0.031, z + 0.015);
      for (const b of [0.002, 0.007]) piece(G, Cy(0.0016, 0.002, 6), b > 0.005 ? '#3ee0b5' : '#ffd23f', x + b, y + 0.0265, z + 0.0155);
    });
  }

  // Letreiro "PLAY" com coração, atrás da arena.
  {
    const sx = 0.2, sz = -0.08, y0 = sag(sx, sz);
    for (const s of [-1, 1]) piece(S, Cy(0.003, 0.12, 6), '#c9d0de', sx + s * 0.06, y0 + 0.06, sz);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.0525), signMat(128, 48, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#00b7e3'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
      [...'PLAY'].forEach((ch, i) => pixelText(x, FONT[ch], 12 + i * 24, 14, i % 2 ? '#ff4fd8' : '#7fe9ff'));
      pixelText(x, HEART, 104, 14, '#ff8a6b');
    }));
    sign.position.set(sx, y0 + 0.13, sz); sign.userData.keep = true; g.add(sign);
  }

  // Arena dos Blocos: palco redondo com piso de LED, anel neon, torres de luz e nove buracos.
  const AX = 0.19, AZ = 0.075, AY = topAt(AX, AZ, 0.112) + 0.007, AB = sag(AX, AZ) - 0.004;
  {
    piece(S, Cy(0.104, AY - AB, 32), '#241a46', AX, (AY + AB) / 2, AZ);
    piece(S, Cy(0.112, AY - 0.005 - AB, 32), '#3a3f6a', AX, (AY - 0.005 + AB) / 2, AZ);
    piece(G, new THREE.TorusGeometry(0.104, 0.0025, 4, 48), '#ff4fd8', AX, AY, AZ, 0, Math.PI / 2);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(0.098, 40), signMat(128, 128, (x, w, h) => {
      x.fillStyle = '#120c2c'; x.fillRect(0, 0, w, h);
      for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) { x.fillStyle = (r + k) % 2 ? '#1d1545' : '#261b5a'; x.fillRect(k * 8 + 1, r * 8 + 1, 6, 6); }
      x.strokeStyle = '#00b7e3'; x.lineWidth = 2; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 3, 0, TAU); x.stroke();
    }));
    floor.rotation.x = -Math.PI / 2; floor.position.set(AX, AY + 0.0004, AZ); g.add(floor);
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + k * Math.PI / 2, x = AX + Math.cos(a) * 0.118, z = AZ + Math.sin(a) * 0.118, y = sag(x, z);
      piece(S, Bx(0.005, 0.07, 0.005), '#c9d0de', x, y + 0.035, z);
      piece(G, Bx(0.012, 0.008, 0.012), k % 2 ? '#7fe9ff' : '#ff9de9', x, y + 0.072, z);
    }
    const leds = new THREE.InstancedMesh(new THREE.CircleGeometry(0.0155, 18).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ toneMapped: false }), 9);
    const cols = ['#ff4fd8', '#ffc56b', '#3ee0b5', '#00b7e3'];
    for (let i = 0; i < 9; i++) {
      const x = AX + (i % 3 - 1) * 0.052, z = AZ + (Math.floor(i / 3) - 1) * 0.052;
      leds.setMatrixAt(i, _m.makeTranslation(x, AY + 0.0012, z)); leds.setColorAt(i, _c.set('#0b0618'));
      piece(G, new THREE.TorusGeometry(0.0168, 0.0018, 4, 24), '#7fe9ff', x, AY + 0.0012, z, 0, Math.PI / 2);
      const cube = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.022, 0.022, 2, 0.004), new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.5, flatShading: true }));
      cube.position.set(x, AY - 0.02, z); cube.visible = false; cube.userData = { up: -1, dur: 1, y: AY, keep: true, base: cols[i % 4], kind: 'ok' };
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.whack = cube; cube.add(hit);
      g.add(cube); whack.pads.push(cube); whack.ledT.push(-9);
    }
    leds.userData.keep = true; g.add(leds); whack.leds = leds;
    whack.pop = confetti(g, 0, 0, 0);
  }

  // Holofotes varrendo o céu nos cantos do parque.
  {
    const beams = new THREE.Group(); beams.userData.keep = true; g.add(beams);
    for (const [bx, bz, c] of [[-0.52, -0.24, '#ff4fd8'], [0.52, -0.3, '#00b7e3'], [0.5, 0.26, '#ffc56b']]) {
      const y = sag(bx, bz); piece(S, Cy(0.012, 0.012, 8, 0.016), '#3a3f4a', bx, y + 0.006, bz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.45, 16, 1, true), holoMat(c, 0.14)); cone.geometry.translate(0, 0.225, 0); cone.position.set(bx, y + 0.01, bz); beams.add(cone);
    }
    beams.userData.anim = t => beams.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.5; c.rotation.x = Math.cos(t * 0.7 + i) * 0.35; });
    animated.push(beams);
  }

  // Controle de videogame gigante (genérico) em cima do telhado do salão Arcade, girando devagar (clique nele!).
  {
    const pad = new THREE.Group(), padY = sag(-0.205, 0.15) + 0.105; pad.position.set(-0.205, padY, 0.15); g.add(pad); pad.scale.setScalar(0.75);
    const PS = [], PG = [];
    piece(PS, new RoundedBoxGeometry(0.09, 0.022, 0.045, 3, 0.009), '#7a5cff', 0, 0, 0);
    for (const s of [-1, 1]) { const gr = new THREE.SphereGeometry(0.017, 12, 8); gr.scale(1, 0.7, 1.3); piece(PS, gr, '#7a5cff', s * 0.036, -0.004, 0.02); }
    for (const [w, d] of [[0.024, 0.007], [0.007, 0.024]]) piece(PS, Bx(w, 0.006, d), '#f6f6f6', -0.025, 0.012, 0);
    [['#ff8a6b', 0.025, -0.009], ['#ffc56b', 0.034, 0], ['#3ee0b5', 0.025, 0.009], ['#00b7e3', 0.016, 0]].forEach(([c, x, z]) => piece(PG, new THREE.SphereGeometry(0.0045, 8, 6), c, x, 0.012, z));
    pad.add(meshOf(PS, vcMat), meshOf(PG, glowMat));
    pad.userData.anim = t => { const k = toyKick(pad, t); pad.rotation.set(0.35, t * 0.4 + k * TAU, 0); pad.position.y = padY + Math.sin(t * 1.3) * 0.004 + k * 0.05; };
    animated.push(pad); toys.push(pad);
  }
  // Praça: carrossel, fonte de pixels, torre de queda, quiosques, pódio, postes, bancos, canteiros e gente passeando.
  {
    // Carrossel: plataforma e teto listrado girando, lâmpadas no beiral e cavalinhos que sobem e descem.
    const cx = 0.04, cz = 0.19, cy = topAt(cx, cz, 0.05);
    piece(S, Cy(0.05, cy + 0.003 - sag(cx, cz), 24), '#3a3f6a', cx, (cy + 0.003 + sag(cx, cz)) / 2, cz);
    const car = new THREE.Group(); car.position.set(cx, cy + 0.003, cz); g.add(car);
    const CS = [], CG = [];
    piece(CS, Cy(0.046, 0.005, 24), '#f4f1ea', 0, 0.0025, 0);
    piece(CS, Cy(0.004, 0.06, 8), '#ffc56b', 0, 0.03, 0);
    for (let k = 0; k < 12; k++) {
      const a = k / 12 * TAU, roof = new THREE.ConeGeometry(0.054, 0.026, 3, 1, true, a, TAU / 12);
      piece(CS, roof, k % 2 ? '#ff4fd8' : '#f6f6f6', 0, 0.073, 0);
      piece(CG, Bx(0.004, 0.004, 0.004), k % 2 ? '#ffd23f' : '#7fe9ff', Math.cos(a) * 0.052, 0.059, Math.sin(a) * 0.052);
    }
    piece(CS, new THREE.SphereGeometry(0.007, 8, 6), '#ffc56b', 0, 0.09, 0);
    for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; piece(CS, Cy(0.0012, 0.055, 5), '#e9ecf5', Math.cos(a) * 0.034, 0.032, Math.sin(a) * 0.034); }
    car.add(meshOf(CS, vcMat), meshOf(CG, glowMat));
    const hg = mergeGeometries([paint(Bx(0.016, 0.008, 0.006), '#ffffff'), paint(Bx(0.006, 0.01, 0.005), '#ffffff').translate(0.008, 0.006, 0), paint(Bx(0.003, 0.007, 0.002), '#ffffff').translate(-0.009, 0.002, 0)]);
    const horses = new THREE.InstancedMesh(hg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, flatShading: true }), 6);
    ['#ffc56b', '#7fe9ff', '#ff9de9', '#3ee0b5', '#b07cff', '#ff8a6b'].forEach((c, k) => horses.setColorAt(k, _c.set(c)));
    horses.frustumCulled = false; car.add(horses);
    car.userData.anim = t => {
      car.rotation.y = -t * 0.6;
      for (let k = 0; k < 6; k++) { const a = k / 6 * TAU; horses.setMatrixAt(k, _m.makeRotationY(-a).setPosition(Math.cos(a) * 0.034, 0.02 + Math.sin(t * 2.4 + k * 1.3) * 0.006, Math.sin(a) * 0.034)); }
      horses.instanceMatrix.needsUpdate = true;
    };
    animated.push(car);
  }
  {
    // Fonte de pixels no meio da praça: bacia, espelho d'água e cubinhos coloridos saltando.
    const fx = 0, fz = 0.03, fy = topAt(fx, fz, 0.04);
    piece(S, Cy(0.04, fy + 0.008 - sag(fx, fz), 20), '#e9ecf5', fx, (fy + 0.008 + sag(fx, fz)) / 2, fz);
    piece(S, Cy(0.034, 0.002, 20), '#5fd8ff', fx, fy + 0.008, fz);
    piece(S, Cy(0.008, 0.02, 8), '#7a5cff', fx, fy + 0.016, fz);
    piece(G, Cy(0.0405, 0.0015, 20), '#ff4fd8', fx, fy + 0.0085, fz);
    const n = 10, jets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.005, 0.005, 0.005), new THREE.MeshBasicMaterial({ toneMapped: false }), n);
    const jc = ['#7fe9ff', '#ff9de9', '#ffd23f', '#9dffb0', '#b07cff'];
    for (let i = 0; i < n; i++) jets.setColorAt(i, _c.set(jc[i % 5]));
    jets.position.set(fx, fy + 0.026, fz); jets.frustumCulled = false; jets.userData.detail = true; g.add(jets);
    jets.userData.anim = t => {
      for (let i = 0; i < n; i++) { const a = i / n * TAU, u = (t * 0.7 + i * 0.37) % 1, r = u * 0.03; jets.setMatrixAt(i, _m.makeRotationY(t + i).setPosition(Math.cos(a) * r, u * 0.05 - u * u * 0.06, Math.sin(a) * r)); }
      jets.instanceMatrix.needsUpdate = true;
    };
    animated.push(jets);
  }
  {
    // Torre de queda: coluna com faixas de luz; o anel de assentos sobe devagar e despenca.
    const tx = -0.33, tz = 0.02, y0 = sag(tx, tz), TH = 0.3;
    piece(S, Cy(0.026, 0.01, 12), '#3a3f6a', tx, y0 + 0.005, tz);
    piece(S, Bx(0.014, TH, 0.014), '#e9ecf5', tx, y0 + TH / 2, tz);
    for (const s of [-1, 1]) piece(G, Bx(0.0025, TH - 0.02, 0.0025), s > 0 ? '#ff4fd8' : '#7fe9ff', tx + s * 0.0072, y0 + TH / 2, tz + 0.0072);
    piece(S, Cy(0.016, 0.012, 10), '#ff4fd8', tx, y0 + TH + 0.006, tz);
    piece(G, new THREE.SphereGeometry(0.006, 8, 6), '#ffd23f', tx, y0 + TH + 0.016, tz);
    const ride = new THREE.Group(); ride.position.set(tx, y0, tz); g.add(ride);
    const RS = [];
    piece(RS, Cy(0.024, 0.012, 16), '#ffc56b', 0, 0, 0);
    for (let k = 0; k < 8; k++) { const a = k / 8 * TAU; piece(RS, Bx(0.008, 0.01, 0.006), ['#00b7e3', '#ff4fd8', '#3ee0b5', '#b07cff'][k % 4], Math.cos(a) * 0.025, 0.004, Math.sin(a) * 0.025, -a); }
    ride.add(meshOf(RS, vcMat));
    ride.userData.anim = t => {
      const c = t % 9, h = c < 5 ? 0.03 + c / 5 * 0.24 : c < 6.5 ? 0.27 : c < 7 ? 0.27 - ((c - 6.5) / 0.5) ** 2 * 0.24 : 0.03 + Math.abs(Math.sin((c - 7) * 9)) * 0.012 * (9 - c) / 2;
      ride.position.y = y0 + h;
    };
    animated.push(ride);
  }
  // Quiosques com toldo listrado: pipoca, sorvete e refri.
  [[0.135, -0.255, '#e8452f', '#ffd23f'], [-0.115, -0.255, '#ff9de9', '#7fe9ff'], [0.32, -0.13, '#00b7e3', '#ff8a6b']].forEach(([x, z, c1, c2]) => {
    const y0 = sag(x, z);
    piece(S, Bx(0.032, 0.022, 0.022), '#f4f1ea', x, y0 + 0.011, z);
    piece(S, Bx(0.034, 0.003, 0.024), c1, x, y0 + 0.016, z + 0.001);
    for (let k = 0; k < 4; k++) piece(S, Bx(0.009, 0.004, 0.03), k % 2 ? '#f6f6f6' : c1, x - 0.0135 + k * 0.009, y0 + 0.036, z + 0.004, 0, 0.25);
    for (const s of [-1, 1]) piece(S, Cy(0.001, 0.014, 4), '#c9d0de', x + s * 0.015, y0 + 0.029, z + 0.016);
    piece(G, Bx(0.02, 0.006, 0.002), c2, x, y0 + 0.043, z - 0.006);
    piece(S, new THREE.SphereGeometry(0.006, 8, 6), c2, x + 0.008, y0 + 0.028, z - 0.004);
  });
  {
    // Pódio com troféu dourado perto do box.
    const px = 0.25, pz = -0.27, y0 = sag(px, pz);
    [[0, 0.024, '#ffc56b'], [-0.02, 0.016, '#c9d0de'], [0.02, 0.011, '#ff8a6b']].forEach(([dx, h, c]) => piece(S, Bx(0.02, h, 0.018), c, px + dx, y0 + h / 2, pz));
    piece(G, Cy(0.0045, 0.012, 8, 0.002), '#ffd23f', px, y0 + 0.03, pz);
    piece(G, Cy(0.003, 0.003, 8), '#ffd23f', px, y0 + 0.0255, pz);
  }
  // Postes neon, bancos e canteiros com árvores coloridas.
  [[-0.15, 0.08], [0.09, -0.05], [-0.15, -0.05], [-0.09, 0.25], [0.12, 0.24], [-0.3, 0.1], [0.12, -0.17], [-0.17, -0.27]].forEach(([x, z], k) => {
    const y0 = sag(x, z);
    piece(S, Cy(0.0016, 0.05, 5), '#3a3f4a', x, y0 + 0.025, z);
    piece(G, new THREE.SphereGeometry(0.0045, 8, 6), k % 2 ? '#ff9de9' : '#7fe9ff', x, y0 + 0.052, z);
  });
  [[-0.09, 0.05, 0], [0.07, 0.0, Math.PI / 2], [-0.06, 0.25, 0], [0.1, 0.26, 0.3], [-0.14, -0.08, 0.5]].forEach(([x, z, ry]) => {
    const y0 = sag(x, z);
    piece(S, Bx(0.022, 0.0025, 0.007), '#ff8a6b', x, y0 + 0.007, z, ry);
    piece(S, Bx(0.022, 0.008, 0.0018), '#ff8a6b', x - Math.sin(ry) * 0.0035, y0 + 0.011, z - Math.cos(ry) * 0.0035, ry);
    for (const s of [-1, 1]) piece(S, Bx(0.002, 0.006, 0.006), '#3a3f4a', x + Math.cos(ry) * s * 0.009, y0 + 0.003, z - Math.sin(ry) * s * 0.009, ry);
  });
  [[-0.168, -0.222, '#ff7bb0'], [0.19, -0.17, '#3ee0b5'], [-0.33, 0.24, '#b07cff'], [0.16, 0.29, '#ffd23f'], [-0.33, -0.27, '#2f9b7a'], [0.33, 0.24, '#ff7bb0']].forEach(([x, z, c]) => {
    const y0 = sag(x, z);
    piece(S, Cy(0.014, 0.008, 10), '#e9ecf5', x, y0 + 0.004, z);
    piece(S, Cy(0.0025, 0.016, 5), '#7a5a3a', x, y0 + 0.016, z);
    piece(S, new THREE.IcosahedronGeometry(0.017, 0), c, x, y0 + 0.032, z);
  });
  // Gente: passeando pela praça e em volta do carrossel, na fila dos quiosques, nos fliperamas e assistindo à arena.
  const ppl = ['#ff8a6b', '#ffc56b', '#3ee0b5', '#00b7e3', '#ff4fd8', '#b07cff', '#f6f6f6', '#7a5cff'];
  walkers(g, [[[-0.13, -0.06], [-0.065, -0.06], [-0.065, 0.11], [-0.13, 0.11]], [[-0.04, 0.13], [0.12, 0.13], [0.12, 0.25], [-0.04, 0.25]], [[-0.12, -0.292], [0.2, -0.292], [0.2, -0.278], [-0.12, -0.278]]], 5, ppl, (x, z) => sag(x, z) + FLOOR);
  crowd(g, [[0.135, -0.231], [0.135, -0.217], [-0.115, -0.231], [0.32, -0.106], [-0.135, -0.115], [0.135, -0.12], [-0.27, 0.25], [-0.24, 0.25], [-0.17, 0.25], [-0.14, 0.25], [0.1, -0.1], [0.31, 0.03], [0.3, 0.12], [0.18, 0.21]].map(([x, z]) => [x, z, sag(x, z) + FLOOR]), zi, ppl);

  // Karts: o seu (amarelo) e três rivais. Fora da corrida eles dão voltas sozinhos pela pista.
  [['#ffc56b', 'Você', 0.17, -0.012], ['#ff4fd8', 'Rosa', 0.19, 0.012], ['#00b7e3', 'Azul', 0.18, -0.01], ['#3ee0b5', 'Verde', 0.2, 0.011]].forEach(([color, name, speed, lane], k) => {
    const kart = new THREE.Mesh(kartGeo(color), vcMat); g.add(kart);
    const info = { mesh: kart, color, name, s: k * track.L / 4, lane, speed, last: -1 };
    // roll: o kart deita um pouco para fora nas curvas.
    kart.rotation.order = 'YXZ';
    info.place = (x, z, h, roll = 0) => { kart.position.set(x, sag(x, z) + LIFT, z); kart.rotation.set(roll, -h, 0); };
    kart.userData.anim = t => {
      const dt = info.last < 0 ? 0 : Math.min(0.1, t - info.last); info.last = t;
      if (race.state !== 'off') return;
      info.s += info.speed * Math.min(1, track.VL[Math.floor(((info.s % track.L) + track.L) % track.L / track.ds) % N] / 0.2) * dt;
      trackAt(info.s, info.lane + Math.sin(t * 0.6 + k) * 0.004, pt); info.place(pt.x, pt.z, pt.h);
    };
    race.karts.push(info); animated.push(kart);
  });

  buildRecycle(g, S, G);
  buildTrackside(S, G);
  game.party = confetti(g, 0, sag(0, 0) + 0.12, 0);

  g.add(meshOf(S, vcMat), meshOf(G, glowMat));
  race.board('MINIVERSO GP', race.karts.map(k => [k.name, k.color, '']));
  const ctl = new THREE.Group(); g.add(ctl); ctl.userData.anim = () => rt.gameTick(); animated.push(ctl);
}

// Itens do Reciclaverso: nome, ícone, lixeira (índice em BINS) e o desenho (peças com cor, base no chão, ~2 cm).
// O item aparece ampliado no pedestal, então cada um tem os detalhes que o identificam (rótulo, tampa, talo...).
const crumple = (geo, k) => { geo = geo.toNonIndexed(); const p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; if (!seen.has(key)) seen.set(key, 1 + (R() - 0.5) * k); const f = seen.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
  geo.computeVertexNormals(); return geo; };
const TRASH = [
  ['Jornal velho', '📰', 0, L => {
    piece(L, Bx(0.024, 0.003, 0.017), '#ecebe4', 0, 0.0015, 0); piece(L, Bx(0.023, 0.003, 0.016), '#dcdad0', 0.001, 0.0042, 0.0005, 0.08);
    piece(L, Bx(0.018, 0.0006, 0.003), '#222630', 0.001, 0.006, -0.005, 0.08);
    piece(L, Bx(0.007, 0.0006, 0.006), '#7a8597', -0.005, 0.006, 0.002, 0.08);
    for (const z of [0, 0.003, 0.006]) piece(L, Bx(0.008, 0.0006, 0.001), '#8a8f99', 0.006, 0.006, z, 0.08);
  }],
  ['Caixa de papelão', '📦', 0, L => {
    piece(L, Bx(0.02, 0.015, 0.017), '#c08a52', 0, 0.0075, 0);
    for (const s of [-1, 1]) piece(L, Bx(0.02, 0.001, 0.009), '#b07a44', 0, 0.0155 + 0.003, s * 0.0115, 0, s * 0.7);
    piece(L, Bx(0.0205, 0.0035, 0.0012), '#e9d3a8', 0, 0.011, 0.0086);
    piece(L, new THREE.TorusGeometry(0.0025, 0.0005, 3, 10), '#7a4e24', 0.005, 0.006, 0.0087);
  }],
  ['Bola de papel', '📄', 0, L => piece(L, crumple(new THREE.IcosahedronGeometry(0.0085, 1), 0.45), '#f6f6f2', 0, 0.0085, 0)],
  ['Garrafa de vidro', '🍾', 1, L => {
    piece(L, Cy(0.0058, 0.017, 12), '#2fa35a', 0, 0.0085, 0); piece(L, Cy(0.0024, 0.006, 12, 0.0058), '#2fa35a', 0, 0.02, 0);
    piece(L, Cy(0.0024, 0.007, 10), '#2fa35a', 0, 0.0265, 0); piece(L, Cy(0.0029, 0.0015, 10), '#1f7a40', 0, 0.0298, 0);
    piece(L, Cy(0.006, 0.007, 12), '#f2e6c4', 0, 0.008, 0);
  }],
  ['Pote de vidro', '🫙', 1, L => {
    piece(L, Cy(0.0082, 0.015, 14), '#bfeee0', 0, 0.0075, 0); piece(L, Cy(0.0085, 0.0035, 14), '#c9d0de', 0, 0.0167, 0);
    piece(L, Cy(0.0084, 0.006, 14), '#ffd23f', 0, 0.007, 0);
  }],
  ['Lata de refrigerante', '🥤', 2, L => {
    piece(L, Cy(0.0058, 0.018, 14), '#e8452f', 0, 0.009, 0);
    for (const y of [0.0008, 0.0174]) piece(L, Cy(0.0052, 0.0016, 14), '#d9dde5', 0, y, 0);
    piece(L, Cy(0.0059, 0.0025, 14), '#f6f6f6', 0, 0.011, 0);
    piece(L, Bx(0.004, 0.0008, 0.002), '#b8bec9', 0.001, 0.0186, 0);
  }],
  ['Lata de conserva', '🥫', 2, L => {
    piece(L, Cy(0.0078, 0.014, 16), '#c9d0de', 0, 0.007, 0);
    piece(L, Cy(0.0079, 0.008, 16), '#ff8a3c', 0, 0.007, 0);
    for (const y of [0.0005, 0.0135]) piece(L, Cy(0.0081, 0.001, 16), '#8a919c', 0, y, 0);
  }],
  ['Garrafa PET', '🧴', 3, L => {
    piece(L, Cy(0.0058, 0.02, 12), '#8fd8ff', 0, 0.01, 0); piece(L, Cy(0.0025, 0.006, 12, 0.0058), '#8fd8ff', 0, 0.023, 0);
    piece(L, Cy(0.0026, 0.0035, 10), '#2f7dff', 0, 0.0275, 0); piece(L, Cy(0.0059, 0.007, 12), '#2f7dff', 0, 0.011, 0);
    for (const y of [0.004, 0.017]) piece(L, Cy(0.0061, 0.001, 12), '#bfeaff', 0, y, 0);
  }],
  ['Copo plástico', '🥤', 3, L => {
    piece(L, Cy(0.0078, 0.018, 14, 0.0055), '#ff9de9', 0, 0.009, 0); piece(L, Cy(0.0081, 0.0025, 14), '#f6f6f6', 0, 0.0185, 0);
    piece(L, Cy(0.0009, 0.016, 6), '#2f7dff', 0.002, 0.024, 0, 0, 0, -0.25);
  }],
  ['Sacola plástica', '🛍️', 3, L => {
    piece(L, crumple(new THREE.BoxGeometry(0.017, 0.018, 0.007, 2, 2, 1), 0.12), '#f6f6f6', 0, 0.009, 0);
    piece(L, Bx(0.0172, 0.004, 0.0072), '#3ee0b5', 0, 0.01, 0);
    for (const s of [-1, 1]) piece(L, new THREE.TorusGeometry(0.0035, 0.0008, 4, 10, Math.PI), '#f6f6f6', s * 0.004, 0.018, 0);
  }],
  ['Casca de banana', '🍌', 4, L => {
    // Talo amarelo com a ponta marrom e quatro tiras de casca abertas, caindo para os lados.
    piece(L, Cy(0.0032, 0.014, 8, 0.0036), '#f2d23c', 0, 0.013, 0); piece(L, Cy(0.0018, 0.003, 6, 0.003), '#5a3a1a', 0, 0.0215, 0);
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + 0.4, petal = new THREE.TorusGeometry(0.008, 0.0026, 5, 10, 2.2); petal.scale(1, 1, 0.5);
      petal.rotateZ(Math.PI / 2); petal.translate(0, 0.011, 0); petal.rotateY(a);
      L.push(paint(petal, k % 2 ? '#f2d23c' : '#e6c02a'));
      const tip = new THREE.SphereGeometry(0.002, 6, 4); tip.translate(-0.0065 * Math.cos(a), 0.0063, 0.0065 * Math.sin(a)); L.push(paint(tip, '#6a4a22'));
    }
  }],
  ['Resto de maçã', '🍎', 4, L => {
    // Miolo mordido: casca vermelha só em cima e embaixo, polpa clara no meio com sementes, talo e folhinha.
    const top = new THREE.SphereGeometry(0.0078, 12, 6, 0, TAU, 0, Math.PI / 2.6), bot = new THREE.SphereGeometry(0.0078, 12, 6, 0, TAU, Math.PI - Math.PI / 2.6, Math.PI / 2.6);
    piece(L, top, '#d8402f', 0, 0.0148, 0); piece(L, bot, '#d8402f', 0, 0.0062, 0);
    // Polpa em forma de ampulheta: mais fina no meio, onde foi mordida.
    const core = new THREE.CylinderGeometry(0.0062, 0.0062, 0.0105, 14, 4), p = core.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.72 + 0.28 * Math.abs(p.getY(i)) / 0.00525; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    piece(L, core, '#f4e6b8', 0, 0.0105, 0);
    for (const [x, y] of [[-0.0018, 0.012], [0.0018, 0.012], [0, 0.009]]) { const seed = new THREE.SphereGeometry(0.0011, 6, 4); seed.scale(0.7, 1.2, 0.5); piece(L, seed, '#4a2a14', x, y, 0.0047); }
    piece(L, Cy(0.0006, 0.005, 5), '#5a3a1a', 0, 0.0218, 0);
    const leaf = new THREE.SphereGeometry(0.0032, 8, 4); leaf.scale(1, 0.18, 0.5); piece(L, leaf, '#3aa858', 0.003, 0.0232, 0, 0, 0, 0.4);
  }],
  ['Folhas secas', '🍂', 4, L => {
    [[0, 0.002, 0, 0.3, '#c9762f'], [0.004, 0.005, 0.003, -0.6, '#a85a24'], [-0.003, 0.008, -0.002, 1.4, '#e09a3a']].forEach(([x, y, z, ry, c]) => {
      const leaf = new THREE.SphereGeometry(0.0085, 10, 6); leaf.scale(1, 0.12, 0.5);
      piece(L, leaf, c, x, y, z, ry, 0.15); piece(L, Bx(0.016, 0.0006, 0.0006), '#6a3a14', x, y + 0.0011, z, ry, 0.15);
    });
  }]
];

// Caixa com o sombreado já pintado (frente clara, laterais e fundo mais escuros), desenhada sem depender da luz da
// cena: as lixeiras ficam sempre vivas, de qualquer ângulo. Ordem das faces: +x, -x, +y, -y, +z, -z.
const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
// Itens do jogo: sombreado que acompanha a câmera (matcap pintado), iluminados de frente de qualquer lado do planeta.
const itemMat = new THREE.MeshMatcapMaterial({ vertexColors: true, flatShading: true, matcap: canvasTex(64, 64, (x, w) => {
  const gr = x.createRadialGradient(w * 0.38, w * 0.32, 2, w / 2, w / 2, w / 2);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#e4e4ea'); gr.addColorStop(1, '#8c8c99');
  x.fillStyle = gr; x.fillRect(0, 0, w, w);
}) });
function shadedBox(list, w, h, d, color, x, y, z) {
  const geo = Bx(w, h, d).toNonIndexed(), base = new THREE.Color(color), shade = [0.8, 0.8, 1.12, 0.6, 1, 0.7], c = new Float32Array(geo.attributes.position.count * 3);
  geo.deleteAttribute('uv');
  for (let f = 0; f < 6; f++) { _c.copy(base).multiplyScalar(shade[f]); for (let v = 0; v < 6; v++) c.set([_c.r, _c.g, _c.b], (f * 6 + v) * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); geo.translate(x, y, z); list.push(geo);
}

// Palco do Reciclaverso (um game show): borda neon verde, painel com letreiro, cinco lixeiras com tampa que abre,
// pedestal com holofotes e cronômetro de luzes, símbolo de reciclagem girando em holograma e lixo flutuando em volta.
function buildRecycle(g, S, G) {
  const PX = 0, PZ = -0.2, base = sag(PX, PZ) - 0.004, PT = topAt(PX, PZ, 0.115) + 0.004;
  piece(S, Bx(0.22, PT - base, 0.1), '#1d2b3a', PX, (PT + base) / 2, PZ);
  piece(G, Bx(0.222, 0.0025, 0.0025), '#3dff8f', PX, PT, PZ + 0.05);
  for (const s of [-1, 1]) piece(G, Bx(0.0025, 0.0025, 0.1), '#3dff8f', PX + s * 0.11, PT, PZ);
  // Painel do fundo com faixas acesas e o letreiro.
  piece(S, Bx(0.22, 0.085, 0.008), '#12261d', PX, PT + 0.0425, PZ - 0.046);
  for (let k = 0; k < 6; k++) piece(G, Bx(0.0022, 0.07, 0.001), k % 2 ? '#2fbf5a' : '#7dffb0', PX - 0.1 + k * 0.04, PT + 0.04, PZ - 0.0415);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.21, 0.042), signMat(512, 102, (x, w, h) => {
    x.fillStyle = '#0c1a14'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3dff8f'; x.lineWidth = 5; x.strokeRect(2.5, 2.5, w - 5, h - 5);
    let fs = 72; do x.font = `900 ${fs--}px "Arial Black", Arial, sans-serif`; while (x.measureText('RECICLAVERSO').width > w - 40);
    x.textBaseline = 'middle';
    const a = 'RECICLA', b = 'VERSO', wa = x.measureText(a).width, wb = x.measureText(b).width, x0 = (w - wa - wb) / 2;
    x.fillStyle = '#5dff7a'; x.fillText(a, x0, h / 2 + 2); x.fillStyle = '#f4f8ff'; x.fillText(b, x0 + wa, h / 2 + 2);
  }));
  sign.position.set(PX, PT + 0.108, PZ - 0.041); sign.userData.keep = true; g.add(sign);
  for (const s of [-1, 1]) piece(S, Bx(0.004, 0.03, 0.004), '#3a3f4a', PX + s * 0.08, PT + 0.09, PZ - 0.044);
  // Nomes das lixeiras no painel, em cima de cada uma.
  const XS = BINS.map((_, k) => PX - 0.08 + k * 0.04);
  const labels = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.014), signMat(512, 36, (x, w) => {
    x.fillStyle = '#12261d'; x.fillRect(0, 0, w, 36); x.font = '700 17px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    BINS.forEach(([name, c], k) => { const cx = (XS[k] - PX + 0.1) / 0.2 * w; x.fillStyle = c; x.fillRect(cx - 46, 5, 92, 26); x.fillStyle = '#ffffff'; x.fillText(name.toUpperCase(), cx, 19); });
  }));
  labels.position.set(PX, PT + 0.062, PZ - 0.0415); labels.userData.keep = true; g.add(labels);
  // Canos verdes nos cantos.
  for (const s of [-1, 1]) {
    piece(S, Cy(0.006, 0.12, 10), '#2c7a4c', PX + s * 0.113, PT + 0.06, PZ - 0.04);
    for (const y of [0.03, 0.07, 0.11]) piece(G, Cy(0.0068, 0.003, 10), '#3dff8f', PX + s * 0.113, PT + y, PZ - 0.04);
  }
  // Lixeiras: corpo, símbolo branco na frente e a tampa (uma peça repetida que abre quando o lixo entra).
  const BZ = PZ - 0.014, BH = 0.036, BB = [];
  BINS.forEach(([, c], k) => {
    const x = XS[k];
    shadedBox(BB, 0.03, BH, 0.026, c, x, PT + BH / 2, BZ);
    piece(S, Bx(0.031, 0.004, 0.027), '#1d2b3a', x, PT + 0.002, BZ);
    piece(S, new THREE.TorusGeometry(0.006, 0.0012, 4, 12), '#ffffff', x, PT + 0.02, BZ + 0.0132);
    for (let a = 0; a < 3; a++) piece(S, new THREE.ConeGeometry(0.0022, 0.004, 3), '#ffffff', x + Math.cos(a * TAU / 3 + 0.5) * 0.006, PT + 0.02 + Math.sin(a * TAU / 3 + 0.5) * 0.006, BZ + 0.0135, 0, Math.PI / 2, a * TAU / 3 + 0.5);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.07, 0.05), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(x, PT + 0.03, BZ + 0.01); hit.userData.keep = true; hit.userData.bin = k; g.add(hit);
    recy.bins.push({ hit, x, y: PT + BH, z: BZ });
  });
  const lidGeo = Bx(0.032, 0.004, 0.028); lidGeo.translate(0, 0.002, 0.014);
  g.add(meshOf(BB, flatMat));
  const lids = new THREE.InstancedMesh(lidGeo, new THREE.MeshBasicMaterial(), 5);
  BINS.forEach(([, c], k) => lids.setColorAt(k, _c.set(c).multiplyScalar(0.85)));
  lids.frustumCulled = false; g.add(lids);
  lids.userData.anim = t => {
    for (let k = 0; k < 5; k++) {
      const age = t - recy.lidT[k], open = Math.max(age < 0 || age > 0.7 ? 0 : Math.sin(Math.min(1, age / 0.7) * Math.PI), recy.hover === k ? 0.35 : 0);
      lids.setMatrixAt(k, _m.makeRotationX(-open * 1.1).setPosition(XS[k], PT + BH, BZ - 0.014));
    }
    lids.instanceMatrix.needsUpdate = true;
  };
  animated.push(lids);
  const timer = new THREE.InstancedMesh(Bx(0.004, 0.0025, 0.0025), new THREE.MeshBasicMaterial({ color: '#3dff8f', toneMapped: false }), 24);
  // Quem joga fica na plateia, de frente para o palco (eye/look); o item da vez aparece flutuando na frente dele, com
  // o anel de luzes do cronômetro em volta.
  const FX = 0, FZ = PZ + 0.125, FY = sag(FX, FZ) + FLOOR + 0.016;
  for (let k = 0; k < 24; k++) { const a = -Math.PI / 2 + k / 24 * TAU; timer.setMatrixAt(k, _m.makeRotationY(-a).setPosition(FX + Math.cos(a) * 0.017, FY - 0.004, FZ + Math.sin(a) * 0.017)); }
  recy.eye = { x: 0, y: sag(0, PZ + 0.19) + FLOOR + 0.04, z: PZ + 0.19 }; recy.look = { x: 0, y: PT + 0.032, z: PZ - 0.01 };
  timer.count = 0; timer.userData.keep = true; g.add(timer); recy.timer = timer;
  recy.stand = { x: FX, y: FY, z: FZ };
  recy.at = [PX, PT + 0.03, PZ];
  // Estoque de itens (um de cada; só o da vez e o que está voando para a lixeira aparecem).
  for (const [name, icon, bin, draw] of TRASH) {
    const L = []; draw(L); const m = new THREE.Mesh(mergeGeometries(L), itemMat);
    m.visible = false; m.userData.keep = true; g.add(m);
    recy.items.push({ mesh: m, name, icon, bin });
  }
  // Símbolo de reciclagem (três setas em triângulo) em neon, balançando devagar em cima do letreiro.
  {
    const sym = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.05), new THREE.MeshBasicMaterial({ toneMapped: false, transparent: true, depthWrite: false, side: THREE.DoubleSide, map: canvasTex(128, 128, (x, w) => {
      const c = w / 2, R0 = 44, ang = k => -Math.PI / 2 + k * TAU / 3, P = (k, r = R0) => [c + Math.cos(ang(k)) * r, c + 6 + Math.sin(ang(k)) * r];
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (const [lw, col] of [[20, 'rgba(61,255,143,.25)'], [11, '#3dff8f']]) for (let k = 0; k < 3; k++) {
        // Cada seta corre por um lado do triângulo, com uma folga nos cantos, e termina numa ponta.
        const [ax, ay] = P(k), [bx, by] = P(k + 1), sx = ax + (bx - ax) * 0.2, sy = ay + (by - ay) * 0.2, ex = ax + (bx - ax) * 0.68, ey = ay + (by - ay) * 0.68;
        x.strokeStyle = col; x.lineWidth = lw; x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
        const dx = (bx - ax), dy = (by - ay), l = Math.hypot(dx, dy), ux = dx / l, uy = dy / l, hs = lw * 1.5;
        x.fillStyle = col; x.beginPath(); x.moveTo(ex + ux * hs, ey + uy * hs); x.lineTo(ex - uy * hs, ey + ux * hs); x.lineTo(ex + uy * hs, ey - ux * hs); x.closePath(); x.fill();
      }
    }) }));
    sym.position.set(PX, PT + 0.158, PZ - 0.04); sym.userData.keep = true; g.add(sym);
    sym.userData.anim = t => { sym.rotation.y = Math.sin(t * 0.8) * 0.5; sym.position.y = PT + 0.158 + Math.sin(t * 1.4) * 0.004; };
    animated.push(sym);
  }
  // Lixo flutuando em volta do pavilhão, como na arte do jogo.
  [[TRASH[7], -0.13, 0.11, 0.6], [TRASH[5], 0.13, 0.1, 2.1], [TRASH[2], 0.07, 0.15, 4]].forEach(([[, , , draw], dx, h, ph]) => {
    const L = []; draw(L); const m = new THREE.Mesh(mergeGeometries(L), itemMat); m.scale.setScalar(1.3); g.add(m);
    m.userData.detail = true;
    m.userData.anim = t => { m.position.set(PX + dx, PT + h + Math.sin(t * 1.1 + ph) * 0.01, PZ - 0.02); m.rotation.set(t * 0.7 + ph, t * 0.9, ph); };
    animated.push(m);
  });
  recy.party = confetti(g, PX, PT + 0.06, PZ);
}

// Enfeites da pista: passarela sobre a reta da esquerda, arco inflável na saída do S, painéis coloridos ao longo das
// retas e postes de luz nas curvas.
function buildTrackside(S, G) {
  const { X, Z, TX, TZ, K } = track;
  // Passarela: escadas nas duas pontas, piso, guarda-corpo aceso e uma faixa quadriculada no meio.
  {
    const bz = 0.07, y0 = sag(-0.42, bz), BY = 0.078;
    for (const x of [-0.485, -0.355]) { piece(S, Bx(0.014, BY, 0.022), '#e9ecf5', x, y0 + BY / 2, bz); piece(S, Bx(0.016, 0.004, 0.024), '#ff4fd8', x, y0 + BY + 0.002, bz); }
    piece(S, Bx(0.15, 0.005, 0.022), '#2b2250', -0.42, y0 + BY + 0.0025, bz);
    for (const s of [-1, 1]) piece(G, Bx(0.15, 0.002, 0.002), '#7fe9ff', -0.42, y0 + BY + 0.014, bz + s * 0.011);
    for (let k = 0; k < 8; k++) piece(S, Bx(0.008, 0.008, 0.0015), k % 2 ? '#15161c' : '#f6f6f6', -0.448 + k * 0.008, y0 + BY - 0.004, bz + 0.0115);
  }
  // Arco inflável listrado na saída do S (a pista corre ao longo de x ali).
  {
    const ax = 0.22, az = 0.372, y0 = sag(ax, az), AR = 0.066;
    for (let k = 0; k < 8; k++) {
      const seg = new THREE.TorusGeometry(AR, 0.007, 6, 6, Math.PI / 8); seg.rotateZ(k * Math.PI / 8);
      piece(S, seg, k % 2 ? '#ff4fd8' : '#ffc56b', ax, y0, az, Math.PI / 2);
    }
  }
  // Painéis coloridos ao longo das retas, por fora da pista.
  const cols = ['#ff4fd8', '#00b7e3', '#ffc56b', '#3ee0b5'];
  for (let i = 0, n = 0; i < N; i += 7) {
    let k = 0; for (let j = -4; j <= 4; j++) k = Math.max(k, Math.abs(K[(i + j + N) % N])); if (k > 2) continue;
    for (const side of [-1, 1]) {
      const o = W + 0.024, x = X[i] - TZ[i] * o * side, z = Z[i] + TX[i] * o * side;
      if (Math.hypot(x, z) < 0.43 || Math.hypot(x, z) > 0.53) continue;
      piece(S, Bx(0.022, 0.009, 0.0025), cols[n++ % 4], x, sag(x, z) + 0.0045, z, -Math.atan2(TZ[i], TX[i]));
    }
  }
  // Postes de luz nas curvas grandes.
  for (const [x, z] of [[0.49, -0.24], [0.47, 0.2], [-0.47, 0.25], [-0.48, -0.28], [0.1, 0.45], [-0.12, 0.46]]) {
    const y0 = sag(x, z);
    piece(S, Cy(0.002, 0.08, 6), '#3a3f4a', x, y0 + 0.04, z);
    piece(S, Bx(0.016, 0.003, 0.003), '#3a3f4a', x, y0 + 0.08, z);
    for (const s of [-1, 1]) piece(G, Bx(0.005, 0.004, 0.005), '#fff6d8', x + s * 0.006, y0 + 0.077, z);
  }
}

export { arcade, BINS, buildGames, game, race, recy, track, trackAt, whack };
