import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, TAU } from '../../core/math.js';
import { sag } from '../build.js';
import { crowd, figures } from '../people.js';
import { confetti } from '../props.js';
import { animated, rt, toyKick, toys } from '../runtime.js';
import { canvasTex, holoMat } from '../textures.js';

// Jogos: Parque Arcade. Um autódromo de kart contorna o parque (largada com semáforo, arquibancada com torcida, box,
// telão com a classificação, zebras, pneus, faixas de turbo, passarela e arco inflável); dentro dele fica um mapa de
// fases: um lago com uma ilha para cada brinquedo (salão de fliperamas, roda-gigante, torre de queda, Reciclaverso,
// Zona VR, Arena dos Blocos, carrossel e a fonte), ligadas por uma trilha de pedrinhas e marcadas por bandeirinhas.
// Leveza: quase tudo que é parado vira duas malhas com cor nos vértices (uma fosca e uma acesa); peças repetidas
// (pneus, cones, torcida, cabines da roda-gigante, luzes) são desenhadas de uma vez só.
const game = { zi: 3, party: null };
// Reciclaverso (jogo da Miniverso): cinco lixeiras, uma esteira trazendo o lixo e um estoque de itens para separar.
const BINS = [['Papel', '#2f7dff'], ['Vidro', '#2fbf5a'], ['Metal', '#ffc21a'], ['Plástico', '#e8452f'], ['Orgânico', '#8a5a34']];
const recy = { hover: -1, bins: [], items: [], stand: null, eye: null, look: null, timer: null, lidT: [-9, -9, -9, -9, -9], party: null, at: [0, 0, 0] };
const whack = { on: false, end: 0, score: 0, best: 0, next: 0, lastTxt: 0, pads: [], leds: null, ledT: [], pop: null, flash: '', flashAt: 0 };
const race = { state: 'off', karts: [], lights: null, board: null, party: null, fx: () => {}, fireworks: () => {}, items: [], bananas: [], shield: null };
// Fliperama do Salão Arcade: alvo de clique em volta das máquinas e o ponto de onde a câmera olha para elas.
const arcade = { hit: null, at: [0, 0, 0] };

// Pista: linha central fechada (coordenadas da área), percorrida no sentido horário visto de cima.
// Do lado direito a pista sai num laço em volta de um laguinho e volta por cima dela mesma num viaduto; embaixo,
// ela faz uma barriga larga para fora. Volta de ~3,7 (24% mais longa que o traçado antigo).
const CTRL = [[-0.05, -0.4], [0.26, -0.4], [0.4, -0.33], [0.44, -0.19], [0.435, -0.06], [0.445, 0.07], [0.48, 0.17], [0.54, 0.235], [0.605, 0.22], [0.635, 0.13],
  [0.61, 0.04], [0.53, -0.015], [0.43, 0], [0.375, 0.04], [0.355, 0.13], [0.36, 0.24], [0.28, 0.36], [0.17, 0.42], [0.08, 0.5], [-0.04, 0.52], [-0.12, 0.46],
  [-0.22, 0.41], [-0.36, 0.33], [-0.43, 0.17], [-0.41, 0], [-0.44, -0.16], [-0.38, -0.32], [-0.24, -0.4]];
// LIFT: o relevo do planeta fica ~4–5 mm acima da base da área; pista e piso vão um pouco acima dele.
const N = 420, W = 0.028, LIFT = 0.0068, BRIDGE_H = 0.052, KART_S = 0.78, BARRIER = W + 0.0125;
const track = { N, W, BARRIER, KART_S, X: new Float32Array(N), Z: new Float32Array(N), TX: new Float32Array(N), TZ: new Float32Array(N), Y: new Float32Array(N), K: new Float32Array(N), VL: new Float32Array(N), L: 0, ds: 0, pads: [] };
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
  // Viaduto: onde a pista passa por cima dela mesma, a segunda passagem sobe numa ponte (rampa suave, topo reto).
  let bi = -1, bd = 9;
  for (let i = 0; i < N; i++) for (let j = i + N / 6; j < N - N / 6 + i && j < N; j++) { const d = (track.X[i] - track.X[j]) ** 2 + (track.Z[i] - track.Z[j]) ** 2; if (d < bd) { bd = d; bi = j; } }
  track.bridge = bi;
  for (let i = 0; i < N; i++) {
    const d = Math.min(Math.abs(i - bi), N - Math.abs(i - bi)) * track.ds;
    // Rampas longas (0,32) com curva suave em S: no máximo ~14° de subida, como um viaduto de verdade.
    track.Y[i] = d < 0.06 ? BRIDGE_H : d < 0.38 ? BRIDGE_H * 0.5 * (1 + Math.cos(Math.PI * (d - 0.06) / 0.32)) : 0;
  }
}
// Ponto da pista a uma distância s da largada, deslocado lat para a direita: { x, z, h } (h = direção em radianos).
function trackAt(s, lat, out) {
  const f = ((s % track.L) + track.L) % track.L / track.ds, i = Math.floor(f) % N, j = (i + 1) % N, u = f - Math.floor(f);
  const tx = track.TX[i] + (track.TX[j] - track.TX[i]) * u, tz = track.TZ[i] + (track.TZ[j] - track.TZ[i]) * u;
  out.x = track.X[i] + (track.X[j] - track.X[i]) * u - tz * lat; out.z = track.Z[i] + (track.Z[j] - track.Z[i]) * u + tx * lat; out.h = Math.atan2(tz, tx);
  out.y = track.Y[i] + (track.Y[j] - track.Y[i]) * u;
  return out;
}
// Inclinação da pista (rampa do viaduto) a uma distância s da largada, em radianos.
const slopeAt = s => { const a = trackAt(s - 0.01, 0, {}), b = trackAt(s + 0.01, 0, {}); return Math.atan2(b.y - a.y, 0.02); };
const nearest = (x, z) => { let best = 0, bd = 9; for (let i = 0; i < N; i++) { const d = (track.X[i] - x) ** 2 + (track.Z[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return best; };

// Peças com a cor gravada nos vértices: tudo que é parado entra em S (fosco) ou G (aceso) e vira uma malha só.
// O piso do parque acompanha a curvatura do planeta; palcos e bases retos ficam acima do ponto mais alto dele.
const FLOOR = 0.0056;
const topAt = (x, z, rad) => { const r = Math.max(0, Math.hypot(x, z) - rad); return sag(r, 0) + FLOOR; };
// Mapa de fases: ilhas (círculo r ou retângulo w × d) com a cor da borda de cada fase, a trilha que as liga e onde
// fica a bandeirinha de cada uma.
const ISLANDS = [
  { x: -0.205, z: 0.175, r: 0.105, c: '#ff4fd8', flag: [-0.3, 0.13] }, // Salão Arcade
  { x: -0.33, z: 0.02, r: 0.042, c: '#00b7e3' }, // torre de queda
  { x: -0.24, z: -0.15, r: 0.1, c: '#ffc56b', flag: [-0.155, -0.205] }, // roda-gigante
  { x: 0, z: -0.14, w: 0.25, d: 0.24, c: '#3ee0b5', flag: [-0.112, -0.245] }, // Reciclaverso
  { x: 0.2, z: -0.11, r: 0.055, c: '#7fe9ff', flag: [0.245, -0.14] }, // Zona VR
  { x: 0.19, z: 0.075, r: 0.125, c: '#b07cff', flag: [0.24, -0.03] }, // Arena dos Blocos
  { x: 0.02, z: 0.21, r: 0.075, c: '#ff8a6b' }, // carrossel
  { x: 0, z: 0.03, r: 0.056, c: '#ffd23f' }, // fonte (o começo do mapa)
  { x: 0.035, z: -0.31, w: 0.55, d: 0.12, c: '#c9d0de' } // box e pódio, junto da reta
];
const TRAIL = [
  [[-0.205, 0.175], [-0.33, 0.02], 0.15], [[-0.33, 0.02], [-0.24, -0.15], 0.15], [[-0.24, -0.15], [-0.06, -0.06], 0.2],
  [[0.06, -0.06], [0.2, -0.11], 0.25], [[0.2, -0.11], [0.19, 0.075], 0.2], [[0.19, 0.075], [0.02, 0.21], 0.2], [[0.02, 0.21], [-0.205, 0.175], 0.15],
  [[0, 0.03], [0, -0.06], 0], [[-0.06, -0.06], [0.06, -0.06], 0], [[0.12, -0.3], [0.2, -0.11], -0.15]
];
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

// Kart (uma malha só): chassi baixo, laterais arredondadas na cor do kart, bico com placa de número e asa
// dianteira, motor com dois escapamentos, aerofólio traseiro com suportes, rodas de trás com aro, volante e o piloto
// de macacão branco com capacete na cor do kart, viseira escura e faixa branca. As rodas da frente são uma peça à
// parte (kartWheels) para virar nas curvas.
const wheel = (L, x, z, w) => { piece(L, Cy(0.0038, w, 12), '#15161c', x, 0.0038, z, 0, Math.PI / 2); piece(L, Cy(0.0021, w + 0.0004, 10), '#c9d0de', x, 0.0038, z, 0, Math.PI / 2); };
function kartGeo(color) {
  const L = [];
  piece(L, Bx(0.03, 0.0026, 0.017), '#2a2f3a', 0, 0.0034, 0);
  for (const s of [-1, 1]) piece(L, new RoundedBoxGeometry(0.017, 0.0055, 0.0052, 2, 0.002), color, -0.001, 0.0058, s * 0.0088);
  piece(L, new RoundedBoxGeometry(0.013, 0.0048, 0.012, 2, 0.002), color, 0.0098, 0.0058, 0);
  piece(L, Bx(0.0045, 0.0014, 0.021), '#2a2f3a', 0.0168, 0.0038, 0);
  for (const s of [-1, 1]) piece(L, Bx(0.0045, 0.004, 0.0012), color, 0.0168, 0.0048, s * 0.0103);
  piece(L, Cy(0.0031, 0.0007, 12), '#f6f6f6', 0.0105, 0.0084, 0);
  piece(L, Bx(0.0014, 0.0008, 0.0026), '#15161c', 0.0105, 0.0088, 0);
  piece(L, Bx(0.008, 0.0016, 0.0125), '#f6f6f6', -0.0005, 0.0059, 0);
  piece(L, Bx(0.006, 0.0075, 0.0095), '#2a2f3a', -0.0062, 0.0082, 0);
  piece(L, Bx(0.0072, 0.0062, 0.012), '#3a3f4a', -0.0118, 0.0072, 0);
  for (const s of [-1, 1]) { piece(L, Cy(0.0012, 0.0062, 8), '#c9d0de', -0.0162, 0.0088, s * 0.003, 0, 0, Math.PI / 2); piece(L, Cy(0.0014, 0.0012, 8), '#15161c', -0.0194, 0.0088, s * 0.003, 0, 0, Math.PI / 2); }
  for (const s of [-1, 1]) { piece(L, Bx(0.0016, 0.0062, 0.0014), '#2a2f3a', -0.0142, 0.0112, s * 0.0062); piece(L, Bx(0.0058, 0.0048, 0.0008), color, -0.0152, 0.0138, s * 0.0102); }
  piece(L, Bx(0.0058, 0.0014, 0.021), color, -0.0152, 0.0145, 0);
  piece(L, Bx(0.0058, 0.0007, 0.021), '#f6f6f6', -0.0152, 0.0153, 0);
  for (const s of [-1, 1]) wheel(L, -0.0092, s * 0.0092, 0.0048);
  piece(L, new THREE.TorusGeometry(0.0022, 0.0005, 4, 12), '#15161c', 0.0042, 0.0108, 0, Math.PI / 2, 0, 0.55);
  piece(L, Bx(0.0052, 0.0072, 0.0074), '#f6f6f6', -0.0028, 0.0108, 0);
  for (const s of [-1, 1]) piece(L, Bx(0.0062, 0.0018, 0.0018), '#f6f6f6', 0.0012, 0.0112, s * 0.0034, 0, 0, -0.35);
  piece(L, new THREE.SphereGeometry(0.0039, 12, 8), color, -0.0024, 0.0158, 0);
  piece(L, new THREE.SphereGeometry(0.0034, 10, 6, -0.9, 1.8, 1.05, 0.75), '#141428', -0.0019, 0.0156, 0);
  piece(L, new THREE.TorusGeometry(0.0039, 0.0006, 4, 16), '#f6f6f6', -0.0024, 0.0158, 0, Math.PI / 2, 0, 0);
  return mergeGeometries(L);
}
function kartWheels() { const L = []; for (const s of [-1, 1]) wheel(L, 0, s * 0.0092, 0.0038); return mergeGeometries(L); }

// Letras em pixel para os letreiros (5 × 5).
const FONT = { P: ['11110', '10001', '11110', '10000', '10000'], L: ['10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '11111', '10001', '10001'], Y: ['10001', '01010', '00100', '00100', '00100'],
  R: ['11110', '10001', '11110', '10100', '10010'], C: ['01111', '10000', '10000', '10000', '01111'], D: ['11110', '10001', '10001', '10001', '11110'], E: ['11111', '10000', '11110', '10000', '11111'] };
FONT['1'] = ['00100', '01100', '00100', '00100', '01110']; FONT[' '] = ['00000', '00000', '00000', '00000', '00000'];
const HEART = ['01010', '11111', '11111', '01110', '00100'];
const pixelText = (x, rows, ox, oy, c, px = 4) => { x.fillStyle = c; rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') x.fillRect(ox + i * px, oy + j * px, px - 1, px - 1); })); };
const signMat = (w, h, draw) => new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, draw) });

function buildGames(g, zi) {
  const S = [], G = [];
  const { X, Z, TX, TZ, K } = track;

  // Chão: gramado listrado por fora, área de escape em volta da pista e, por dentro, um mapa de fases: um lago com uma
  // ilha para cada brinquedo, ligadas por uma trilha de pedrinhas (como a tela de escolher fase de um jogo).
  {
    const FR = 0.74, SZ = 1024, px = u => (u / FR + 1) / 2 * SZ, sc = SZ / (2 * FR);
    const tex = canvasTex(SZ, SZ, (x, w, h) => {
      for (let i = -w; i < w * 2; i += 48) { x.fillStyle = (i / 48) % 2 ? '#55c084' : '#4cb67b'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 48, 0); x.lineTo(i + 48 - h * 0.4, h); x.lineTo(i - h * 0.4, h); x.fill(); }
      const loop = () => { x.beginPath(); for (let i = 0; i < N; i++) x[i ? 'lineTo' : 'moveTo'](px(X[i]), px(Z[i])); x.closePath(); };
      x.save(); loop(); x.clip();
      // Lago com marolas claras.
      x.fillStyle = '#3cb4d8'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 2.5; x.lineCap = 'round';
      for (let i = 0; i < 170; i++) { const cx = R() * w, cy = R() * h; x.beginPath(); x.arc(cx, cy, 7, Math.PI * 1.15, Math.PI * 1.85); x.arc(cx + 13, cy, 7, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
      // Ilhas: sombra na água, raso claro, espuma, areia e a borda na cor de cada fase.
      const shape = (isl, grow, dx = 0, dy = 0) => {
        x.beginPath();
        if (isl.r) x.arc(px(isl.x) + dx, px(isl.z) + dy, isl.r * sc + grow, 0, TAU);
        else x.roundRect(px(isl.x - isl.w / 2) - grow + dx, px(isl.z - isl.d / 2) - grow + dy, isl.w * sc + grow * 2, isl.d * sc + grow * 2, 0.03 * sc + grow);
      };
      for (const isl of ISLANDS) { shape(isl, 2, 7, 10); x.fillStyle = '#2a8db2'; x.fill(); }
      for (const isl of ISLANDS) { shape(isl, 16); x.fillStyle = '#86dbee'; x.fill(); }
      for (const isl of ISLANDS) { shape(isl, 6); x.fillStyle = '#effcff'; x.fill(); }
      for (const isl of ISLANDS) {
        shape(isl, 0); x.fillStyle = '#f4eedc'; x.fill();
        x.save(); x.clip(); x.fillStyle = '#ebe3cb'; for (let r = 0; r < h; r += 24) for (let k = (r / 24) % 2 ? 0 : 24; k < w; k += 48) x.fillRect(k, r, 24, 24); x.restore();
        shape(isl, -5); x.strokeStyle = isl.c; x.lineWidth = 7; x.stroke();
      }
      // Trilha de pedrinhas ligando as fases, com uma curvinha em cada trecho.
      const stones = [];
      for (const [a, b, bend] of TRAIL) {
        const [ax, az] = a, [bx, bz] = b, mx = (ax + bx) / 2 - (bz - az) * bend, mz = (az + bz) / 2 + (bx - ax) * bend;
        let lx = px(ax), lz = px(az), acc = 0;
        for (let t = 0; t <= 1; t += 0.004) {
          const u = 1 - t, qx = px(u * u * ax + 2 * u * t * mx + t * t * bx), qz = px(u * u * az + 2 * u * t * mz + t * t * bz);
          acc += Math.hypot(qx - lx, qz - lz); lx = qx; lz = qz;
          if (acc >= 17) { acc = 0; stones.push([qx, qz]); }
        }
      }
      for (const [sx, sz] of stones) { x.fillStyle = 'rgba(20,60,90,.3)'; x.beginPath(); x.arc(sx + 2, sz + 3, 6.5, 0, TAU); x.fill(); }
      for (const [sx, sz] of stones) { x.fillStyle = '#fff7e0'; x.strokeStyle = '#d9b75a'; x.lineWidth = 2; x.beginPath(); x.arc(sx, sz, 6, 0, TAU); x.fill(); x.stroke(); }
      x.restore();
      // O gramado some aos poucos só na beira de tudo (r 0,67 → 0,74): o laço da pista vai até ~0,65 e, com o sumiço
      // começando antes (0,53), o laguinho e a área do laço ficavam transparentes e o gramado do planeta aparecia ali.
      const gr = x.createRadialGradient(w / 2, h / 2, w * 0.452, w / 2, h / 2, w * 0.5); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
      // Caixas de brita por fora das curvas mais fechadas.
      for (let i = 0; i < N; i += 6) {
        let k = 0; for (let j = -5; j <= 5; j++) k += K[(i + j + N) % N]; k /= 11; if (Math.abs(k) < 4.5) continue;
        const side = k > 0 ? -1 : 1, bx = X[i] - TZ[i] * (W + 0.045) * side, bz = Z[i] + TX[i] * (W + 0.045) * side;
        x.fillStyle = '#e6d6ad'; x.beginPath(); x.arc(px(bx), px(bz), 0.035 / (2 * FR) * SZ, 0, TAU); x.fill();
        x.fillStyle = '#cdbb8f'; for (let d = 0; d < 14; d++) x.fillRect(px(bx) + (R() - 0.5) * 22, px(bz) + (R() - 0.5) * 22, 2, 2);
      }
      loop(); x.lineJoin = 'round'; x.lineWidth = (2 * W + 0.05) / (2 * FR) * SZ; x.strokeStyle = '#ddd2bc'; x.stroke();
      x.lineWidth = (2 * W + 0.016) / (2 * FR) * SZ; x.strokeStyle = '#f4f1ea'; x.stroke();
    });
    tex.anisotropy = 16;
    const geo = new THREE.RingGeometry(0.0005, FR, 112, 20); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + FLOOR);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.9 })));
  }

  // Asfalto: fita que acompanha a curvatura do planeta, com faixas brancas nas bordas.
  {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const k = i % N, nx = -TZ[k], nz = TX[k];
      for (const s of [-1, 1]) { const x = X[k] + nx * W * s, z = Z[k] + nz * W * s; pos.push(x, sag(x, z) + LIFT + track.Y[k], z); uv.push((s + 1) / 2, i * track.ds / 0.05); }
      if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); geo.computeVertexNormals();
    // Asfalto liso (granulado bem fino e uniforme), faixas brancas nas bordas e tracejado no meio; nítido mesmo de
    // perto e em ângulo baixo (filtro anisotrópico no máximo).
    const tex = canvasTex(128, 128, (x, w, h) => {
      x.fillStyle = '#3c4252'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 900; i++) { x.fillStyle = R() > 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; x.fillRect(R() * w, R() * h, 1.5, 1.5); }
      x.fillStyle = '#f2f2f2'; x.fillRect(5, 0, 5, h); x.fillRect(w - 10, 0, 5, h);
      x.fillStyle = 'rgba(255,255,255,.75)'; x.fillRect(w / 2 - 1.5, 10, 3, 54);
    });
    tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 16;
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.92 })));
  }
  // Zebras vermelhas e brancas nas curvas.
  {
    const pos = [], col = [], red = new THREE.Color('#e8452f'), white = new THREE.Color('#f6f6f6');
    for (let i = 0; i < N; i++) {
      let k = 0; for (let j = -4; j <= 4; j++) k = Math.max(k, Math.abs(K[(i + j + N) % N])); if (k < 6) continue;
      const j = (i + 1) % N, c = Math.floor(i / 2) % 2 ? red : white;
      for (const s of [-1, 1]) {
        const q = [[i, W], [i, W + 0.009], [j, W + 0.009], [j, W]].map(([n, o]) => { const x = X[n] - TZ[n] * o * s, z = Z[n] + TX[n] * o * s; return [x, sag(x, z) + LIFT + track.Y[n] + 0.0012, z]; });
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
  for (const [s, lat] of [[-0.035, -0.013], [-0.035, 0.013], [-0.085, -0.013], [-0.085, 0.013], [-0.135, -0.013], [-0.135, 0.013]]) { trackAt(s - 0.012, lat, pt); piece(S, Bx(0.0015, 0.0006, 0.018), '#f6f6f6', pt.x, sag(pt.x, pt.z) + LIFT + 0.0003, pt.z, -pt.h); }
  // Faixas de turbo: painel de vidro escuro rente ao asfalto, com setas de neon que correm para a frente e bordas
  // acesas (uma faixa só que acompanha a curva da pista; a textura desliza para dar a sensação de velocidade).
  {
    const tex = canvasTex(128, 256, (x, w, h) => {
      x.fillStyle = '#0d1b33'; x.fillRect(0, 0, w, h);
      const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, 'rgba(0,183,227,.55)'); gr.addColorStop(0.12, 'rgba(0,183,227,0)'); gr.addColorStop(0.88, 'rgba(0,183,227,0)'); gr.addColorStop(1, 'rgba(0,183,227,.55)');
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.fillStyle = '#7fe9ff'; x.fillRect(0, 0, 5, h); x.fillRect(w - 5, 0, 5, h);
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (let k = 0; k < 4; k++) {
        const y = k * 64 + 18;
        x.strokeStyle = 'rgba(61,242,255,.35)'; x.lineWidth = 18; x.beginPath(); x.moveTo(28, y + 30); x.lineTo(w / 2, y); x.lineTo(w - 28, y + 30); x.stroke();
        x.strokeStyle = '#bff8ff'; x.lineWidth = 7; x.beginPath(); x.moveTo(28, y + 30); x.lineTo(w / 2, y); x.lineTo(w - 28, y + 30); x.stroke();
      }
    });
    tex.wrapT = THREE.RepeatWrapping; tex.anisotropy = 16;
    const mat = new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const L = [];
    for (const [px0, pz0, lat] of [[0.12, -0.4, -0.012], [-0.42, -0.06, -0.012]]) {
      const i = nearest(px0, pz0), s0 = i * track.ds; track.pads.push({ s0, s1: s0 + 0.05, lat });
      const pos = [], uv = [], idx = [], n = 10, half = 0.0115;
      for (let k = 0; k <= n; k++) {
        trackAt(s0 + k * 0.05 / n, lat, pt);
        for (const sd of [-1, 1]) { const x = pt.x - Math.sin(pt.h) * half * sd, z = pt.z + Math.cos(pt.h) * half * sd; pos.push(x, sag(x, z) + LIFT + 0.0009, z); uv.push((sd + 1) / 2, k / n * 2.4); }
        if (k < n) { const a = k * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx); L.push(geo);
    }
    const pads = new THREE.Mesh(mergeGeometries(L), mat); pads.material.side = THREE.DoubleSide; g.add(pads);
    pads.userData.anim = t => { tex.offset.y = -t * 1.6; };
    animated.push(pads);
  }

  // Muro de pneus por fora das curvas: pilhas de dois pneus, uma encostada na outra, alternando vermelho e branco
  // (uma peça só, repetida). Fica de fora onde a pista passa perto (viaduto e laço).
  {
    const spots = [];
    for (let i = 0; i < N; i += 2) {
      let k = 0; for (let j = -6; j <= 6; j++) k += K[(i + j + N) % N]; if (Math.abs(k) / 13 < 2.4 || track.Y[i] > 0) continue;
      const side = k > 0 ? -1 : 1, x = X[i] - TZ[i] * (W + 0.03) * side, z = Z[i] + TX[i] * (W + 0.03) * side;
      let ok = true; for (let n = 0; n < N; n += 2) if ((X[n] - x) ** 2 + (Z[n] - z) ** 2 < (W + 0.02) ** 2) { ok = false; break; }
      if (ok && !spots.some(([a, b]) => (a - x) ** 2 + (b - z) ** 2 < 0.0105 ** 2)) spots.push([x, z]);
    }
    const tg = mergeGeometries([paint(Cy(0.0055, 0.0055, 12), '#ffffff').translate(0, 0.00275, 0), paint(Cy(0.0055, 0.0055, 12), '#ffffff').translate(0, 0.0085, 0), paint(Cy(0.0058, 0.0012, 12), '#222630').translate(0, 0.0055, 0), paint(Cy(0.0058, 0.0012, 12), '#222630').translate(0, 0.0113, 0)]);
    const tires = new THREE.InstancedMesh(tg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true }), spots.length);
    const tc = [new THREE.Color('#e8452f'), new THREE.Color('#f4f4f4')];
    spots.forEach(([x, z], i) => { tires.setMatrixAt(i, _m.makeTranslation(x, sag(x, z), z)); tires.setColorAt(i, tc[i % 2]); });
    g.add(tires);
    const cones = [[-0.11, -0.335], [0, -0.335], [0.11, -0.335]];
    const cm = new THREE.InstancedMesh(new THREE.ConeGeometry(0.0035, 0.011, 8), new THREE.MeshStandardMaterial({ color: '#ff7a1a', roughness: 0.6 }), cones.length);
    cones.forEach(([x, z], i) => cm.setMatrixAt(i, _m.makeTranslation(x, sag(x, z) + 0.0055, z)));
    g.add(cm);
  }

  // Pórtico da largada e chegada: duas torres arredondadas por fora da mureta, com faixa de neon e base, viga com o
  // letreiro MINIVERSO GP dos dois lados, quadriculado em cima e as cinco luzes do semáforo viradas para quem chega.
  {
    const x0 = X[0] + 0.004, z0 = Z[0], ry = -Math.atan2(TZ[0], TX[0]), y0 = sag(x0, z0), off = BARRIER + 0.012, TH = 0.088;
    const sign = signMat(512, 64, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h);
      for (let k = 0; k < 32; k++) { x.fillStyle = k % 2 ? '#15161c' : '#f6f6f6'; x.fillRect(k * 16, 0, 16, 6); x.fillStyle = k % 2 ? '#f6f6f6' : '#15161c'; x.fillRect(k * 16, h - 6, 16, 6); }
      x.font = '900 34px "Arial Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.fillStyle = '#ffffff'; x.fillText('MINIVERSO', w / 2 - 34, h / 2 + 1); x.fillStyle = '#ff4fd8'; x.fillText('GP', w / 2 + 128, h / 2 + 1);
    });
    for (const s of [-1, 1]) {
      const tx = x0 - TZ[0] * off * s, tz = z0 + TX[0] * off * s, ty = sag(tx, tz);
      piece(S, Bx(0.02, 0.008, 0.02), '#3a3f6a', tx, ty + 0.004, tz, ry);
      piece(S, new RoundedBoxGeometry(0.013, TH, 0.013, 2, 0.003), '#2b2250', tx, ty + TH / 2 + 0.008, tz, ry);
      piece(G, Bx(0.0025, TH - 0.01, 0.0135), s > 0 ? '#7fe9ff' : '#ff4fd8', tx, ty + TH / 2 + 0.008, tz, ry);
    }
    const span = 2 * off + 0.014, beamY = y0 + TH + 0.006;
    piece(S, new RoundedBoxGeometry(0.014, 0.024, span, 2, 0.004), '#2b2250', x0, beamY, z0, ry);
    for (let k = 0; k < 14; k++) piece(S, Bx(0.0145, 0.005, span / 14), k % 2 ? '#15161c' : '#f6f6f6', x0, beamY + 0.0145, z0 - span / 2 + (k + 0.5) * span / 14, ry);
    piece(G, Bx(0.0145, 0.0018, span), '#ff4fd8', x0, beamY - 0.0125, z0, ry);
    for (const sd of [-1, 1]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(span * 0.86, 0.019), sign);
      m.position.set(x0 + Math.cos(-ry) * 0.0072 * sd, beamY, z0 + Math.sin(-ry) * 0.0072 * sd); m.rotation.y = ry + (sd > 0 ? Math.PI / 2 : -Math.PI / 2); m.userData.keep = true; g.add(m);
    }
    const lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 10, 8), new THREE.MeshBasicMaterial({ toneMapped: false }), 5);
    for (let k = 0; k < 5; k++) { lights.setMatrixAt(k, _m.makeTranslation(x0 - 0.0085, beamY - 0.021, z0 - 0.02 + k * 0.01)); lights.setColorAt(k, _c.set('#3a1414')); }
    piece(S, Bx(0.004, 0.009, 0.056), '#15161c', x0 - 0.0068, beamY - 0.021, z0, ry);
    lights.userData.keep = true; g.add(lights); race.lights = lights;
    race.party = confetti(g, x0, beamY, z0);
    // Confete espalhado pela reta principal e saindo da arquibancada: a cada volta a reta ganha uma chuva de confete;
    // na vitória, todos disparam em sequência, várias vezes.
    const along = [-0.2, -0.08, 0.04, 0.16].map(x => confetti(g, x, sag(x, -0.4) + 0.05, -0.4));
    const stands = [-0.14, -0.05, 0.05, 0.14].map(x => confetti(g, x, sag(x, -0.5) + 0.07, -0.48));
    race.burst = (big) => {
      const now = rt.clock, list = big ? [race.party, ...along, ...stands] : [race.party, ...along];
      list.forEach((c, k) => { c.userData.at = now + k * 0.12; });
      if (big) setTimeout(() => stands.concat(along).forEach((c, k) => { c.userData.at = rt.clock + k * 0.1; }), 2200);
      race.cheerAt = now; if (big) race.winAt = now;
    };
  }

  // Arquibancada da reta principal: um bloco só, levemente curvado, com cinco degraus de assentos coloridos em faixas,
  // parede de fundo, cobertura inclinada sobre colunas com borda de neon e letreiro, e a torcida (com bandeirinhas)
  // que pula e agita mais quando a corrida está valendo e a cada volta.
  const fans = [];
  {
    const X0 = -0.19, X1 = 0.19, Zf = -0.457, D = 0.016, T = 5, n = 24, seat = ['#00b7e3', '#7a5cff', '#ff4fd8', '#ffc56b', '#3ee0b5'];
    const bow = x => 0.012 * (x / X1) ** 2;
    for (let k = 0; k < n; k++) {
      const xa = X0 + (k + 0.5) * (X1 - X0) / n, w = (X1 - X0) / n + 0.0008, y0 = sag(xa, Zf - 0.04), zb = Zf + bow(xa);
      for (let j = 0; j < T; j++) {
        const z = zb - j * D - D / 2, h = 0.008 * (j + 1);
        piece(S, Bx(w, h, D), j % 2 ? '#d7dceb' : '#e9ecf5', xa, y0 + h / 2, z);
        piece(S, Bx(w, 0.0028, 0.006), seat[Math.floor(k / 5 + j) % 5], xa, y0 + h + 0.0014, z + 0.003);
        for (let q = 0; q < 2; q++) fans.push([xa - w / 4 + q * w / 2 + (R() - 0.5) * 0.003, y0 + h + 0.0014, z - 0.001]);
      }
      piece(S, Bx(w, 0.062, 0.004), '#2b2250', xa, y0 + 0.031, zb - T * D - 0.002);
      piece(S, Bx(w, 0.003, 0.056), '#2b2250', xa, y0 + 0.068, zb - T * D + 0.026, 0, -0.12);
      piece(G, Bx(w, 0.002, 0.002), k % 2 ? '#7fe9ff' : '#ff4fd8', xa, y0 + 0.0645, zb - T * D + 0.054);
      if (k % 4 === 0) piece(S, Cy(0.0018, 0.068, 6), '#c9d0de', xa, y0 + 0.034, zb - T * D - 0.001);
    }
    const ys = sag(0, Zf) + 0.071;
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.018), signMat(512, 48, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff4fd8'; x.fillRect(0, h - 4, w, 4);
      x.font = '900 28px "Arial Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.fillText('ARQUIBANCADA MINIVERSO', w / 2, h / 2);
    }));
    banner.position.set(0, ys, Zf - T * D + 0.0565); banner.rotation.x = -0.12; banner.userData.keep = true; g.add(banner);
  }
  // Torcida: os mesmos bonequinhos do planeta (cabelo, braços e calça), com camisas coloridas e bandeirinhas.
  // Parados, balançam de leve; com a corrida valendo, pulam devagar; a cada volta comemoram com os braços para cima
  // (pulo calmo, sem tremedeira); na vitória, ficam vários segundos em festa.
  {
    const cc = ['#ff8a6b', '#ffc56b', '#3ee0b5', '#00b7e3', '#ff4fd8', '#b07cff', '#f6f6f6', '#7a5cff'];
    const f = figures(g, fans.length, fans.map((_, i) => cc[(i * 5) % 8]));
    const flags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.0004, 0.004, 0.006).translate(0, 0.006, 0.003), new THREE.MeshBasicMaterial({ toneMapped: false }), fans.length);
    fans.forEach((_, i) => { flags.setColorAt(i, new THREE.Color(cc[(i * 3 + 2) % 8])); flags.setMatrixAt(i, ZERO); });
    flags.userData.detail = true; flags.frustumCulled = false;
    const ph = fans.map(() => R() * TAU);
    f.host.userData.anim = t => {
      const lapCheer = Math.max(0, 1 - (t - (race.cheerAt ?? -9)) / 3), winCheer = Math.max(0, 1 - (t - (race.winAt ?? -99)) / 7);
      const cheer = Math.max(lapCheer, winCheer), live = race.state !== 'off' ? 1 : 0;
      const speed = 2 + live * 2.2 + cheer * 2.5, amp = 0.0005 + live * 0.0013 + cheer * 0.003;
      fans.forEach(([x, y, z], i) => {
        const jump = Math.max(0, Math.sin(t * speed + ph[i])) * amp;
        f.place(i, x, y - 0.0014 + jump, z, Math.sin(t * 0.7 + ph[i]) * 0.25, 0, Math.min(1, cheer * 1.2) * (0.75 + 0.25 * Math.sin(t * speed + ph[i])));
        flags.setMatrixAt(i, i % 3 ? ZERO : _m.makeRotationX(Math.sin(t * (3 + cheer * 3) + ph[i]) * 0.6).setPosition(x + 0.0045, y + 0.0145 + jump, z));
      });
      f.done(); flags.instanceMatrix.needsUpdate = true;
    };
    g.add(flags); animated.push(f.host);
  }
  // Telão com a classificação ao vivo (redesenhado só quando muda a ordem ou a volta).
  {
    const tx = 0.32, tz = -0.5, y0 = sag(tx, tz);
    for (const s of [-1, 1]) piece(S, Bx(0.006, 0.17, 0.006), '#3a3f4a', tx + s * 0.055, y0 + 0.085, tz);
    piece(S, Bx(0.14, 0.105, 0.008), '#15161c', tx, y0 + 0.135, tz);
    piece(G, Bx(0.142, 0.0025, 0.009), '#ff4fd8', tx, y0 + 0.188, tz);
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 184;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.0935), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.set(tx, y0 + 0.135, tz + 0.0045); screen.userData.keep = true; g.add(screen);
    race.board = (title, rows) => {
      const x = cv.getContext('2d'); x.fillStyle = '#100a24'; x.fillRect(0, 0, 256, 184);
      x.fillStyle = '#ffc56b'; x.font = '700 22px monospace'; x.textAlign = 'center'; x.fillText(title, 128, 28);
      rows.forEach(([name, color, extra], k) => {
        const y = 50 + k * 22; x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(14, y - 15, 228, 19);
        x.textAlign = 'left'; x.fillStyle = '#7fe9ff'; x.font = '700 16px monospace'; x.fillText(`${k + 1}º`, 20, y);
        x.fillStyle = color; x.fillRect(54, y - 11, 12, 12); x.fillStyle = '#ffffff'; x.fillText(name, 74, y);
        if (extra) { x.textAlign = 'right'; x.fillStyle = '#ffc56b'; x.fillText(extra, 236, y); }
      });
      tex.needsUpdate = true;
    };
  }
  // Box: um prédio contínuo afastado da mureta, com quatro garagens numeradas e portas coloridas, faixa de vidro
  // acesa no andar de cima, terraço com letreiro BOX e, na ponta, a torre de controle de vidro. Entre ele e a pista
  // fica o pátio do box, com cones.
  {
    const bz = -0.298, X0 = -0.215, X1 = 0.215, y0 = sag(0, bz), H = 0.026;
    piece(S, Bx(X1 - X0, H + 0.018, 0.034), '#e9ecf5', 0, y0 + (H - 0.018) / 2, bz);                // a base desce até o chão nas pontas
    const front = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0 - 0.01, 0.02), signMat(512, 48, (x, w, h) => {
      x.fillStyle = '#d7dceb'; x.fillRect(0, 0, w, h);
      ['#ff4fd8', '#00b7e3', '#ffc56b', '#3ee0b5'].forEach((c, k) => {
        const cx = (k + 0.5) * w / 4; x.fillStyle = '#2b2250'; x.fillRect(cx - 50, 6, 100, h - 6); x.fillStyle = c; x.fillRect(cx - 46, 10, 92, h - 10);
        x.fillStyle = 'rgba(0,0,0,.12)'; for (let r = 14; r < h; r += 6) x.fillRect(cx - 46, r, 92, 1.5);
        x.font = '900 20px "Arial Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.fillText(String(k + 1), cx, h / 2 + 4);
      });
    }));
    front.position.set(0, y0 + 0.011, bz - 0.0172); front.rotation.y = Math.PI; front.userData.keep = true; g.add(front);
    piece(G, Bx(X1 - X0 - 0.01, 0.007, 0.035), '#9fe8ff', 0, y0 + H + 0.0035, bz);
    piece(S, Bx(X1 - X0 + 0.006, 0.003, 0.04), '#2b2250', 0, y0 + H + 0.0085, bz - 0.002);
    piece(G, Bx(X1 - X0 + 0.006, 0.0018, 0.0018), '#ff4fd8', 0, y0 + H + 0.0085, bz - 0.022);
    for (let k = 0; k < 9; k++) piece(S, Bx(0.0016, 0.007, 0.0016), '#c9d0de', X0 + 0.01 + k * (X1 - X0 - 0.02) / 8, y0 + H + 0.0035, bz - 0.0178);
    const boxSign = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.014), signMat(128, 36, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#7fe9ff'; x.lineWidth = 3; x.strokeRect(1.5, 1.5, w - 3, h - 3);
      x.font = '900 24px "Arial Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffc56b'; x.fillText('BOX', w / 2, h / 2 + 1);
    }));
    boxSign.position.set(0, y0 + H + 0.018, bz - 0.01); boxSign.rotation.y = Math.PI; boxSign.userData.keep = true; g.add(boxSign);
    for (const s of [-1, 1]) piece(S, Bx(0.002, 0.012, 0.002), '#3a3f4a', s * 0.02, y0 + H + 0.014, bz - 0.01);
    const tx = X0 - 0.014, ty = sag(tx, bz);
    piece(S, Cy(0.011, 0.06, 12), '#e9ecf5', tx, ty + 0.03, bz);
    piece(G, Cy(0.0145, 0.016, 12), '#9fe8ff', tx, ty + 0.068, bz);
    piece(S, Cy(0.017, 0.004, 12), '#2b2250', tx, ty + 0.078, bz);
    piece(G, Cy(0.0172, 0.0016, 12), '#ff4fd8', tx, ty + 0.0805, bz);
    piece(S, Cy(0.0012, 0.016, 5), '#c9d0de', tx, ty + 0.088, bz);
    piece(G, new THREE.SphereGeometry(0.0025, 8, 6), '#ff3b3b', tx, ty + 0.097, bz);
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
    const beams = new THREE.Group(); beams.userData.keep = true; beams.userData.noRace = true; g.add(beams);
    for (const [bx, bz, c] of [[-0.52, -0.24, '#ff4fd8'], [0.52, -0.3, '#00b7e3'], [0.47, 0.37, '#ffc56b']]) {
      const y = sag(bx, bz); piece(S, Cy(0.012, 0.012, 8, 0.016), '#3a3f4a', bx, y + 0.006, bz);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.45, 16, 1, true), holoMat(c, 0.14)); cone.geometry.translate(0, 0.225, 0); cone.position.set(bx, y + 0.01, bz); beams.add(cone);
    }
    beams.userData.anim = t => beams.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.5; c.rotation.x = Math.cos(t * 0.7 + i) * 0.35; });
    animated.push(beams);
  }

  // Controle de videogame gigante (genérico) em cima do telhado do salão Arcade, girando devagar (clique nele!).
  {
    const pad = new THREE.Group(), padY = sag(-0.205, 0.15) + 0.105; pad.position.set(-0.205, padY, 0.15); pad.userData.noRace = true; g.add(pad); pad.scale.setScalar(0.75);
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
    const cx = 0.02, cz = 0.21, cy = topAt(cx, cz, 0.05);
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
  {
    // Pódio com troféu dourado dentro do parque, atrás do box (longe da pista).
    const px = 0.265, pz = -0.29, y0 = sag(px, pz);
    [[0, 0.024, '#ffc56b'], [-0.02, 0.016, '#c9d0de'], [0.02, 0.011, '#ff8a6b']].forEach(([dx, h, c]) => piece(S, Bx(0.02, h, 0.018), c, px + dx, y0 + h / 2, pz));
    piece(G, Cy(0.0045, 0.012, 8, 0.002), '#ffd23f', px, y0 + 0.03, pz);
    piece(G, Cy(0.003, 0.003, 8), '#ffd23f', px, y0 + 0.0255, pz);
  }
  // Bandeirinha de fase em cada ilha principal: mastro branco, flâmula na cor da ilha e uma estrela dourada no topo.
  for (const { flag, c } of ISLANDS) {
    if (!flag) continue;
    const [x, z] = flag, y0 = sag(x, z) + FLOOR;
    piece(S, Cy(0.0016, 0.06, 6), '#f6f6f6', x, y0 + 0.03, z);
    piece(S, Cy(0.006, 0.004, 10), '#3a3f6a', x, y0 + 0.002, z);
    const pen = new THREE.CylinderGeometry(0.011, 0.011, 0.0012, 3); pen.rotateX(Math.PI / 2); pen.scale(1.4, 0.75, 1);
    piece(S, pen, c, x + 0.012, y0 + 0.05, z);
    piece(G, new THREE.OctahedronGeometry(0.0055), '#ffd23f', x, y0 + 0.065, z);
  }
  // Gente: na calçada dos fliperamas, na plateia do Reciclaverso e assistindo à arena (só em cima das ilhas).
  const ppl = ['#ff8a6b', '#ffc56b', '#3ee0b5', '#00b7e3', '#ff4fd8', '#b07cff', '#f6f6f6', '#7a5cff'];
  crowd(g, [[-0.27, 0.245], [-0.24, 0.25], [-0.17, 0.25], [-0.14, 0.245], [0.1, -0.1], [-0.09, -0.04], [0.17, 0.19], [0.035, 0.06], [-0.035, 0.005]].map(([x, z]) => [x, z, sag(x, z) + FLOOR]), zi, ppl);

  // Fora da corrida, os karts dão voltas sozinhos pela pista.
  const wheelsGeo = kartWheels();
  // Karts: o seu (amarelo) e cinco rivais (Rosa, Azul, Verde, Roxo e Laranja).
  [['#ffc56b', 'Você', 0.17, -0.012], ['#ff4fd8', 'Rosa', 0.19, 0.012], ['#00b7e3', 'Azul', 0.18, -0.01], ['#3ee0b5', 'Verde', 0.2, 0.011], ['#b07cff', 'Roxo', 0.185, -0.011], ['#ff8a3c', 'Laranja', 0.195, 0.012]].forEach(([color, name, speed, lane], k) => {
    const kart = new THREE.Mesh(kartGeo(color), vcMat); g.add(kart);
    const front = new THREE.Mesh(wheelsGeo, vcMat); front.position.set(0.0092, 0, 0); kart.add(front);
    kart.scale.setScalar(KART_S);
    const info = { mesh: kart, color, name, s: k * track.L / 6, lane, speed, last: -1, y: 0 };
    // roll: o kart deita um pouco para fora nas curvas; pitch: empina na rampa do viaduto; steer: rodas da frente.
    kart.rotation.order = 'YXZ';
    // A inclinação nas curvas gira o kart pela base: ele sobe um pouco para o lado de dentro não entrar no chão.
    info.place = (x, z, h, roll = 0, y = 0, pitch = 0, steer = 0) => { info.y = y; kart.position.set(x, sag(x, z) + LIFT + y + Math.abs(roll) * 0.0095 * KART_S, z); kart.rotation.set(roll, -h, pitch); front.rotation.y = -steer * 0.45; };
    kart.userData.anim = t => {
      const dt = info.last < 0 ? 0 : Math.min(0.1, t - info.last); info.last = t;
      if (race.state !== 'off') return;
      info.s += info.speed * Math.min(1, track.VL[Math.floor(((info.s % track.L) + track.L) % track.L / track.ds) % N] / 0.2) * dt;
      trackAt(info.s, info.lane + Math.sin(t * 0.6 + k) * 0.004, pt); info.place(pt.x, pt.z, pt.h, 0, pt.y, slopeAt(info.s));
    };
    race.karts.push(info); animated.push(kart);
  });
  buildRaceFx(g);

  buildRecycle(g, S, G);
  buildTrackside(S, G, g);
  buildGameDecor(g, S, G, zi);
  game.party = confetti(g, 0, sag(0, 0) + 0.12, 0);

  g.add(meshOf(S, vcMat), meshOf(G, glowMat));
  race.board('MINIVERSO GP', race.karts.map(k => [k.name, k.color, '']));
  const ctl = new THREE.Group(); g.add(ctl); ctl.userData.anim = () => rt.gameTick(); animated.push(ctl);
}

// Efeitos da corrida (só se mexem durante ela; fora dela ficam escondidos e parados):
// race.fx(x, y, z, vx, vy, vz, vida, cor, tamanho) solta uma partícula (faísca da derrapagem, fumaça da zebra, chama
// do turbo, confete da batida); race.items são as seis caixas "?" na pista (somem ao pegar e voltam em 3 s);
// race.bananas são as cascas soltas na pista; race.shield é a bolha do escudo.
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
// Faixa contínua: rows são seções (listas de pontos [x, y, z]) ao longo da pista; liga cada seção à seguinte.
// colorAt(r) dá a cor do trecho entre a seção r e a r + 1.
function ribbonGeo(rows, colorAt) {
  const pos = [], col = [];
  for (let r = 0; r < rows.length - 1; r++) {
    const c = colorAt(r);
    for (let k = 0; k < rows[r].length - 1; k++) {
      const a = rows[r][k], b = rows[r][k + 1], c1 = rows[r + 1][k], d = rows[r + 1][k + 1];
      for (const v of [a, c1, b, b, c1, d]) { pos.push(...v); col.push(c.r, c.g, c.b); }
    }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals();
  return geo;
}
function buildRaceFx(g) {
  const pt = { x: 0, z: 0, h: 0, y: 0 };
  {
    const P = 260, fx = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0016, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), P);
    const pa = Array.from({ length: P }, () => ({ t: 1, life: 0, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, s: 1, g: 0 }));
    for (let i = 0; i < P; i++) { fx.setMatrixAt(i, ZERO); fx.setColorAt(i, _c.set('#ffffff')); }
    fx.frustumCulled = false; fx.userData.keep = true; g.add(fx);
    let head = 0, lastT = -1, live = 0;
    race.fx = (x, y, z, vx, vy, vz, life, color, size = 1, grav = 0.06) => {
      Object.assign(pa[head], { t: 0, life, x, y, z, vx, vy, vz, s: size, g: grav }); fx.setColorAt(head, _c.set(color)); fx.instanceColor.needsUpdate = true;
      head = (head + 1) % P; live = P;
    };
    fx.userData.anim = t => {
      const dt = lastT < 0 ? 0 : Math.min(0.05, t - lastT); lastT = t;
      if (!live) return;
      let n = 0;
      for (let i = 0; i < P; i++) {
        const p = pa[i]; if (p.t >= p.life) { fx.setMatrixAt(i, ZERO); continue; }
        n++; p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vy -= p.g * dt;
        const k = Math.max(0, 1 - p.t / p.life) * p.s; fx.setMatrixAt(i, _m.makeRotationY(p.t * 9 + i).scale(_p.set(k, k, k)).setPosition(p.x, p.y, p.z));
      }
      fx.instanceMatrix.needsUpdate = true; if (!n) { live = 0; }
    };
    animated.push(fx);
    // Fogos de artifício sobre a reta de chegada: cada um sobe como um risco dourado e estoura numa esfera de faíscas
    // coloridas que caem devagar. race.fireworks(n, s) solta n fogos, um depois do outro, à frente do ponto s da pista
    // e dos lados dela (onde quem está correndo vê).
    const shots = [], COLS = ['#ff4fd8', '#7fe9ff', '#ffc56b', '#3ee0b5', '#b07cff', '#ffffff'];
    race.fireworks = (n, s = 0) => { for (let k = 0; k < n; k++) shots.push({ at: rt.clock + k * 0.32, stage: 0, s: s + 0.22 + k * 0.05 + R() * 0.04, side: k % 2 ? 1 : -1 }); };
    const boom = new THREE.Group(); boom.userData.keep = true; g.add(boom);
    boom.userData.anim = t => {
      for (let k = shots.length - 1; k >= 0; k--) {
        const sh = shots[k]; if (t < sh.at) continue;
        if (sh.stage === 0) {
          trackAt(sh.s, sh.side * (0.06 + R() * 0.04), pt);
          sh.x = pt.x; sh.z = pt.z; sh.y = sag(pt.x, pt.z) + 0.015 + pt.y; sh.c = COLS[Math.floor(R() * COLS.length)];
          for (let q = 0; q < 6; q++) race.fx(sh.x, sh.y + q * 0.006, sh.z, 0, 0.09, 0, 0.4 - q * 0.05, '#ffd23f', 0.8, 0);
          sh.stage = 1; sh.at = t + 0.42;
        } else {
          const y = sh.y + 0.045, c2 = COLS[Math.floor(R() * COLS.length)];
          for (let q = 0; q < 30; q++) {
            const u = R() * 2 - 1, a = R() * TAU, r = Math.sqrt(1 - u * u), sp = 0.045 + R() * 0.02;
            race.fx(sh.x, y, sh.z, Math.cos(a) * r * sp, u * sp, Math.sin(a) * r * sp, 1 + R() * 0.4, q % 3 ? sh.c : c2, 1.3, 0.035);
          }
          shots.splice(k, 1);
        }
      }
    };
    animated.push(boom);
  }
  {
    // Caixas de item: cubo arredondado com "?" em todas as faces, girando e mudando de cor.
    const tex = canvasTex(64, 64, (x, w) => {
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, w); x.fillStyle = 'rgba(20,12,42,.18)'; x.fillRect(5, 5, w - 10, w - 10);
      x.font = '900 46px "Arial Black", Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
      x.lineWidth = 6; x.strokeStyle = '#140c2a'; x.strokeText('?', w / 2, w / 2 + 3); x.fillStyle = '#ffffff'; x.fillText('?', w / 2, w / 2 + 3);
    });
    const box = new THREE.InstancedMesh(new RoundedBoxGeometry(0.013, 0.013, 0.013, 2, 0.003), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }), 6);
    race.items = [];
    for (const f of [0.2, 0.62]) for (const lat of [-0.016, 0, 0.016]) { trackAt(f * track.L, lat, pt); race.items.push({ x: pt.x, z: pt.z, y: sag(pt.x, pt.z) + LIFT + pt.y + 0.011, s: f * track.L, lat, off: -9 }); }
    box.frustumCulled = false; box.userData.keep = true; g.add(box);
    const hue = new THREE.Color();
    box.userData.anim = t => {
      race.items.forEach((it, i) => {
        const back = Math.min(1, Math.max(0, (t - it.off - 2.6) / 0.4)), sc = it.off < 0 ? 1 : back;
        box.setMatrixAt(i, _m.makeRotationFromEuler(_e.set(0.5, t * 1.6 + i, 0.4)).scale(_p.set(sc, sc, sc)).setPosition(it.x, it.y + Math.sin(t * 2.5 + i) * 0.002, it.z));
        box.setColorAt(i, hue.setHSL((t * 0.15 + i * 0.17) % 1, 0.85, 0.62));
      });
      box.instanceMatrix.needsUpdate = true; box.instanceColor.needsUpdate = true;
    };
    animated.push(box);
  }
  {
    // Cascas de banana soltas na pista (até seis de uma vez).
    const L = []; const arc = new THREE.TorusGeometry(0.0048, 0.0019, 5, 10, Math.PI * 1.15); arc.rotateX(-Math.PI / 2);
    L.push(paint(arc, '#f2d23c')); for (const a of [0, Math.PI * 1.15]) { const tip = new THREE.SphereGeometry(0.0017, 6, 4); tip.translate(Math.cos(a) * 0.0048, 0, -Math.sin(a) * 0.0048); L.push(paint(tip, '#6a4a22')); }
    const ban = new THREE.InstancedMesh(mergeGeometries(L), vcMat, 6);
    for (let i = 0; i < 6; i++) ban.setMatrixAt(i, ZERO);
    ban.frustumCulled = false; ban.userData.keep = true; g.add(ban);
    race.bananas = [];
    ban.userData.anim = t => {
      for (let i = 0; i < 6; i++) { const b = race.bananas[i]; ban.setMatrixAt(i, b ? _m.makeRotationY(i * 1.3).setPosition(b.x, b.y + 0.002, b.z) : ZERO); }
      ban.instanceMatrix.needsUpdate = true;
    };
    animated.push(ban);
  }
  {
    // Escudo: bolha azul em volta do seu kart.
    const sh = new THREE.Mesh(new THREE.IcosahedronGeometry(0.019, 1), new THREE.MeshBasicMaterial({ color: '#7fe9ff', transparent: true, opacity: 0.28, depthWrite: false, toneMapped: false, wireframe: false }));
    sh.visible = false; sh.userData.keep = true; g.add(sh); race.shield = sh;
  }
}

// Itens do Reciclaverso: nome, ícone, lixeira (índice em BINS) e o desenho (~2 cm, base no chão). O item aparece
// grande na frente de quem joga, então cada um tem o material com cara de material e os detalhes que o identificam:
// o desenho recebe M = { m: fosco (papel, papelão, orgânicos), p: plástico brilhante, t: metal cromado, g: vidro
// translúcido } e põe cada peça na lista do material dela.
const crumple = (geo, k) => { geo = geo.toNonIndexed(); const p = geo.attributes.position, seen = new Map();
  for (let i = 0; i < p.count; i++) { const key = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`; if (!seen.has(key)) seen.set(key, 1 + (R() - 0.5) * k); const f = seen.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f); }
  geo.computeVertexNormals(); return geo; };
// Garrafa torneada: perfil [raio, altura] girado em volta do eixo (gargalo, ombro, corpo e fundo num desenho só).
const lathe = (prof, seg = 20) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);
const TRASH = [
  ['Jornal velho', '📰', 0, M => {
    // Jornal dobrado ao meio e em pé, inclinado de frente para quem joga: a metade de trás apoia, e na primeira página
    // ficam o letreiro preto com o nome, a manchete, a foto e três colunas de texto em linhas finas.
    const page = (list, geo, color, x, y, z) => { geo.applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z)); geo.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.55)); geo.translate(0, 0.0012, 0.004); list.push(paint(geo, color)); };
    const back = Bx(0.022, 0.0016, 0.026); back.translate(0, 0.0008, 0.002); back.applyMatrix4(new THREE.Matrix4().makeRotationX(0.25)); M.m.push(paint(back, '#d9d6c9'));
    page(M.m, Bx(0.022, 0.026, 0.0016), '#f1efe6', 0, 0.013, 0);
    page(M.m, Bx(0.019, 0.0042, 0.0004), '#15161c', 0, 0.0228, 0.001);
    for (let k = 0; k < 6; k++) page(M.m, Bx(0.0018, 0.0016, 0.0003), '#f1efe6', -0.0068 + k * 0.0027, 0.0228, 0.0013);
    // Manchete, foto e colunas na frente e também no verso (o jornal gira no pedestal).
    for (const zz of [0.001, -0.001]) {
      page(M.m, Bx(0.019, 0.0014, 0.0003), '#2b2e36', 0, zz > 0 ? 0.0187 : 0.0225, zz);
      page(M.m, Bx(0.0085, 0.0062, 0.0003), '#6d8fb3', -0.0048 * Math.sign(zz), 0.0138, zz);
      page(M.m, Bx(0.0085, 0.0018, 0.0003), '#e8b24a', -0.0048 * Math.sign(zz), 0.0118, zz * 1.2);
      for (let c = 0; c < 3; c++) for (let r = 0; r < 7; r++) {
        if (c === 0 && r < 4) continue;
        page(M.m, Bx(0.0055, 0.0005, 0.0003), '#8a8f99', (-0.0062 + c * 0.0062) * Math.sign(zz), 0.0163 - r * 0.0018, zz);
      }
    }
  }],
  ['Caixa de papelão', '📦', 0, M => {
    // Caixa parda com as abas abertas, fita adesiva, setas de "este lado para cima" e código de barras.
    piece(M.m, Bx(0.02, 0.015, 0.017), '#c08a52', 0, 0.0075, 0);
    for (const s of [-1, 1]) { piece(M.m, Bx(0.02, 0.0009, 0.0085), '#b07a44', 0, 0.0185, s * 0.0118, 0, s * 0.75); piece(M.m, Bx(0.0085, 0.0009, 0.016), '#a8733f', s * 0.0133, 0.0178, 0, 0, 0, -s * 0.9); }
    piece(M.p, Bx(0.0205, 0.0036, 0.0012), '#d9b878', 0, 0.0108, 0.0086);
    for (const dx of [-0.0035, 0.0035]) { piece(M.m, Bx(0.0008, 0.0035, 0.0004), '#3a2412', -0.006 + dx * 0.4, 0.0055, 0.0087); piece(M.m, new THREE.ConeGeometry(0.0013, 0.0015, 3), '#3a2412', -0.006 + dx * 0.4, 0.0081, 0.0087); }
    piece(M.m, Bx(0.0055, 0.003, 0.0004), '#f4efe2', 0.005, 0.0045, 0.0087);
    for (let k = 0; k < 6; k++) piece(M.m, Bx(0.0004, 0.0022, 0.0005), '#222', 0.003 + k * 0.0008, 0.0045, 0.0089);
  }],
  ['Bola de papel', '📄', 0, M => {
    // Folha de caderno amassada: branca, com as linhas azuis e a margem vermelha aparecendo nas dobras.
    piece(M.m, crumple(new THREE.IcosahedronGeometry(0.0085, 1), 0.45), '#f6f6f2', 0, 0.0085, 0);
    for (const [y, ry] of [[0.006, 0.3], [0.009, 1.2], [0.012, 2.4]]) piece(M.m, Bx(0.009, 0.0004, 0.0006), '#7fa4e0', Math.cos(ry) * 0.0068, y, Math.sin(ry) * 0.0068, ry + Math.PI / 2, 0.5);
    piece(M.m, Bx(0.0004, 0.006, 0.0006), '#e0605a', -0.0074, 0.0095, 0.002, 0, 0, 0.3);
  }],
  ['Garrafa de vidro', '🍾', 1, M => {
    // Garrafa de vidro verde: grossa, transparente, fundo pesado, tampinha de metal dourada com serrilha, rótulo de
    // papel creme com faixa vermelha e um reflexo branco descendo pelo vidro.
    piece(M.g, lathe([[0, 0], [0.0062, 0], [0.0064, 0.0012], [0.0064, 0.016], [0.0058, 0.0185], [0.0033, 0.0215], [0.0025, 0.026], [0.0026, 0.0285], [0, 0.0285]]), '#2e9e57', 0, 0, 0);
    piece(M.m, Cy(0.0058, 0.0045, 20), '#1f6e3d', 0, 0.0028, 0);
    piece(M.t, Cy(0.0029, 0.0022, 16), '#d7b443', 0, 0.0294, 0);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; piece(M.t, Bx(0.0009, 0.0022, 0.0006), '#b8952e', Math.cos(a) * 0.0029, 0.0292, Math.sin(a) * 0.0029, -a); }
    piece(M.m, Cy(0.00655, 0.0075, 20), '#f2e6c4', 0, 0.0092, 0);
    piece(M.m, Cy(0.0066, 0.0016, 20), '#c9473a', 0, 0.0103, 0);
    piece(M.p, Bx(0.0008, 0.016, 0.0009), '#ffffff', 0.0042, 0.012, 0.0048, 0.75);
  }],
  ['Pote de vidro', '🫙', 1, M => {
    // Pote de geleia de vidro transparente: dá para ver a geleia vermelha dentro; tampa de metal dourada com frisos e
    // rótulo branco com um morango.
    piece(M.g, lathe([[0, 0], [0.0082, 0], [0.0085, 0.0015], [0.0085, 0.0145], [0.0072, 0.0168], [0.0072, 0.0185], [0, 0.0185]]), '#cfeff5', 0, 0, 0);
    piece(M.m, Cy(0.0072, 0.0115, 18), '#c2263b', 0, 0.007, 0);
    piece(M.t, Cy(0.008, 0.0042, 20), '#d7b443', 0, 0.0198, 0);
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; piece(M.t, Bx(0.0007, 0.0038, 0.0006), '#a8862a', Math.cos(a) * 0.0081, 0.0198, Math.sin(a) * 0.0081, -a); }
    piece(M.m, Cy(0.0086, 0.0042, 20, 0.0086), '#fbf8f0', 0, 0.0078, 0);
    piece(M.m, new THREE.SphereGeometry(0.0018, 8, 6), '#d6303f', 0, 0.008, 0.0087);
    piece(M.m, Bx(0.0018, 0.0007, 0.0006), '#3aa858', 0, 0.0098, 0.0087);
    piece(M.p, Bx(0.0008, 0.011, 0.0009), '#ffffff', 0.0058, 0.009, 0.0062, 0.75);
  }],
  ['Lata de refrigerante', '🥤', 2, M => {
    // Latinha de alumínio: corpo vermelho metálico, faixa branca em onda, aros prateados em cima e embaixo, pescoço
    // afinando e o lacre de abrir.
    piece(M.t, lathe([[0, 0], [0.0048, 0], [0.0058, 0.0012], [0.0058, 0.0165], [0.0049, 0.0182], [0.0049, 0.0188], [0, 0.0188]]), '#d3263a', 0, 0, 0);
    piece(M.t, Cy(0.0059, 0.0016, 22), '#d9dde5', 0, 0.0018, 0); piece(M.t, Cy(0.005, 0.0012, 22), '#d9dde5', 0, 0.0183, 0);
    for (let k = 0; k < 36; k++) { const a = k / 36 * TAU, y = 0.0098 + Math.sin(a * 2) * 0.0014; piece(M.p, Bx(0.0011, 0.0016, 0.0005), '#ffffff', Math.cos(a) * 0.00595, y, Math.sin(a) * 0.00595, -a + Math.PI / 2, 0, Math.atan(Math.cos(a * 2) * 0.0028 / 0.0059)); }
    piece(M.t, Cy(0.0016, 0.0006, 10), '#b8bec9', 0.0016, 0.0192, 0); piece(M.t, Bx(0.0034, 0.0005, 0.0018), '#c9ced8', 0.0001, 0.0192, 0);
    piece(M.m, Bx(0.0018, 0.0003, 0.0012), '#2a2e36', -0.0022, 0.0191, 0);
  }],
  ['Lata de conserva', '🥫', 2, M => {
    // Lata de aço prateada com frisos, rótulo de papel laranja com o desenho do milho, tampa com aro.
    piece(M.t, Cy(0.0078, 0.0145, 22), '#c9ced8', 0, 0.0073, 0);
    for (const y of [0.0012, 0.0134]) piece(M.t, Cy(0.0081, 0.0012, 22), '#9aa1ad', 0, y, 0);
    for (const y of [0.0035, 0.0112]) piece(M.t, Cy(0.0079, 0.0006, 22), '#e8ebf0', 0, y, 0);
    piece(M.m, Cy(0.00795, 0.0062, 22), '#ff8a3c', 0, 0.0073, 0);
    piece(M.m, new THREE.SphereGeometry(0.0021, 8, 6).scale(0.6, 1.2, 0.4), '#ffd23f', 0, 0.0073, 0.0079);
    for (const s of [-1, 1]) piece(M.m, Bx(0.0008, 0.0026, 0.0004), '#3aa858', s * 0.0016, 0.0068, 0.0081, 0, 0, s * 0.5);
    piece(M.t, new THREE.TorusGeometry(0.0055, 0.0005, 4, 20), '#e8ebf0', 0, 0.0147, 0, 0, Math.PI / 2);
  }],
  ['Garrafa PET', '🧴', 3, M => {
    // Garrafa PET de água: plástico fino e azulado, corpo com gomos, fundo com os "pezinhos", tampa azul de rosca e
    // rótulo azul e branco.
    piece(M.g, lathe([[0, 0.0012], [0.0052, 0.0006], [0.0058, 0.0025], [0.0056, 0.006], [0.0059, 0.0085], [0.0056, 0.0115], [0.0059, 0.0145], [0.0057, 0.0175], [0.0042, 0.0215], [0.0026, 0.0245], [0.0025, 0.0262], [0, 0.0262]]), '#a7dcf5', 0, 0, 0);
    for (let k = 0; k < 5; k++) { const a = k / 5 * TAU; piece(M.g, new THREE.SphereGeometry(0.0022, 8, 6), '#a7dcf5', Math.cos(a) * 0.0035, 0.0012, Math.sin(a) * 0.0035); }
    piece(M.p, Cy(0.0028, 0.004, 14), '#1f6fe0', 0, 0.0282, 0);
    for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; piece(M.p, Bx(0.0006, 0.0036, 0.0005), '#1a5cbf', Math.cos(a) * 0.0029, 0.0282, Math.sin(a) * 0.0029, -a); }
    piece(M.p, Cy(0.0031, 0.0007, 14), '#1f6fe0', 0, 0.0259, 0);
    piece(M.p, Cy(0.006, 0.0058, 20), '#ffffff', 0, 0.013, 0);
    piece(M.p, Cy(0.00605, 0.0024, 20), '#2f7dff', 0, 0.013, 0);
  }],
  ['Copo plástico', '🥤', 3, M => {
    // Copo descartável de festa: plástico vermelho brilhante com os frisos, borda branca enrolada e canudo listrado.
    piece(M.p, Cy(0.0078, 0.0175, 18, 0.0054), '#e8342f', 0, 0.00875, 0);
    for (const y of [0.0045, 0.0085]) piece(M.p, Cy(0.0062 + y * 0.12, 0.0006, 18), '#c42a26', 0, y, 0);
    piece(M.p, new THREE.TorusGeometry(0.0078, 0.0007, 6, 22), '#ffffff', 0, 0.0175, 0, 0, Math.PI / 2);
    piece(M.p, Cy(0.0009, 0.016, 8), '#ffffff', 0.0022, 0.024, 0, 0, 0, -0.25);
    for (let k = 0; k < 4; k++) piece(M.p, Cy(0.00095, 0.0018, 8), '#2f7dff', 0.0022 + 0.0009 * (k - 1.5), 0.024 + 0.0038 * (k - 1.5), 0, 0, 0, -0.25);
  }],
  ['Sacola plástica', '🛍️', 3, M => {
    // Sacolinha de mercado: plástico branco amassado e brilhante, alças, e a marca verde com as setinhas.
    piece(M.p, crumple(new THREE.BoxGeometry(0.017, 0.018, 0.007, 3, 3, 1), 0.12), '#f6f6f6', 0, 0.009, 0);
    for (const s of [-1, 1]) piece(M.p, new THREE.TorusGeometry(0.0035, 0.0009, 5, 12, Math.PI), '#f2f2f2', s * 0.0042, 0.018, 0);
    piece(M.p, new THREE.TorusGeometry(0.0028, 0.0007, 4, 14), '#2fbf5a', 0, 0.009, 0.0039);
    for (let k = 0; k < 3; k++) { const a = k / 3 * TAU + 0.5; piece(M.p, new THREE.ConeGeometry(0.001, 0.0016, 3), '#2fbf5a', Math.cos(a) * 0.0028, 0.009 + Math.sin(a) * 0.0028, 0.004, 0, Math.PI / 2, a); }
  }],
  ['Casca de banana', '🍌', 4, M => {
    // Talo amarelo com a ponta marrom e quatro tiras de casca abertas, caindo para os lados, com pintinhas.
    piece(M.m, Cy(0.0032, 0.014, 8, 0.0036), '#f2d23c', 0, 0.013, 0); piece(M.m, Cy(0.0018, 0.003, 6, 0.003), '#5a3a1a', 0, 0.0215, 0);
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * TAU + 0.4, petal = new THREE.TorusGeometry(0.008, 0.0026, 5, 10, 2.2); petal.scale(1, 1, 0.5);
      petal.rotateZ(Math.PI / 2); petal.translate(0, 0.011, 0); petal.rotateY(a);
      M.m.push(paint(petal, k % 2 ? '#f2d23c' : '#e6c02a'));
      const tip = new THREE.SphereGeometry(0.002, 6, 4); tip.translate(-0.0065 * Math.cos(a), 0.0063, 0.0065 * Math.sin(a)); M.m.push(paint(tip, '#6a4a22'));
      const dot = new THREE.SphereGeometry(0.0007, 5, 4); dot.translate(-0.0075 * Math.cos(a + 0.3), 0.011, 0.0075 * Math.sin(a + 0.3)); M.m.push(paint(dot, '#7a5a22'));
    }
  }],
  ['Resto de maçã', '🍎', 4, M => {
    // Miolo mordido: casca vermelha só em cima e embaixo, polpa clara no meio com sementes, talo e folhinha.
    const top = new THREE.SphereGeometry(0.0078, 12, 6, 0, TAU, 0, Math.PI / 2.6), bot = new THREE.SphereGeometry(0.0078, 12, 6, 0, TAU, Math.PI - Math.PI / 2.6, Math.PI / 2.6);
    piece(M.m, top, '#d8402f', 0, 0.0148, 0); piece(M.m, bot, '#d8402f', 0, 0.0062, 0);
    const core = new THREE.CylinderGeometry(0.0062, 0.0062, 0.0105, 14, 4), p = core.attributes.position;
    for (let i = 0; i < p.count; i++) { const f = 0.72 + 0.28 * Math.abs(p.getY(i)) / 0.00525; p.setX(i, p.getX(i) * f); p.setZ(i, p.getZ(i) * f); }
    piece(M.m, core, '#f4e6b8', 0, 0.0105, 0);
    for (const [x, y] of [[-0.0018, 0.012], [0.0018, 0.012], [0, 0.009]]) { const seed = new THREE.SphereGeometry(0.0011, 6, 4); seed.scale(0.7, 1.2, 0.5); piece(M.m, seed, '#4a2a14', x, y, 0.0047); }
    piece(M.m, Cy(0.0006, 0.005, 5), '#5a3a1a', 0, 0.0218, 0);
    const leaf = new THREE.SphereGeometry(0.0032, 8, 4); leaf.scale(1, 0.18, 0.5); piece(M.m, leaf, '#3aa858', 0.003, 0.0232, 0, 0, 0, 0.4);
  }],
  ['Folhas secas', '🍂', 4, M => {
    [[0, 0.002, 0, 0.3, '#c9762f'], [0.004, 0.005, 0.003, -0.6, '#a85a24'], [-0.003, 0.008, -0.002, 1.4, '#e09a3a']].forEach(([x, y, z, ry, c]) => {
      const leaf = new THREE.SphereGeometry(0.0085, 10, 6); leaf.scale(1, 0.12, 0.5);
      piece(M.m, leaf, c, x, y, z, ry, 0.15); piece(M.m, Bx(0.016, 0.0006, 0.0006), '#6a3a14', x, y + 0.0011, z, ry, 0.15);
    });
  }]
];
// Materiais dos itens (sombreado que acompanha a câmera, iluminado de frente de qualquer lado do planeta):
// fosco para papel e orgânicos, plástico com brilho forte e pontual, metal cromado com faixas de reflexo e vidro
// translúcido com borda clara.
const matcap = draw => canvasTex(64, 64, (x, w) => { draw(x, w); });
const ITEM_MATS = {
  m: new THREE.MeshMatcapMaterial({ vertexColors: true, flatShading: true, matcap: matcap((x, w) => {
    const gr = x.createRadialGradient(w * 0.38, w * 0.32, 2, w / 2, w / 2, w / 2);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.55, '#e4e4ea'); gr.addColorStop(1, '#8c8c99'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
  }) }),
  p: new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: matcap((x, w) => {
    const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.7, '#ececf2'); gr.addColorStop(1, '#a4a4b0'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    const hl = x.createRadialGradient(w * 0.34, w * 0.3, 0, w * 0.34, w * 0.3, w * 0.14); hl.addColorStop(0, 'rgba(255,255,255,1)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hl; x.fillRect(0, 0, w, w);
  }) }),
  t: new THREE.MeshMatcapMaterial({ vertexColors: true, matcap: matcap((x, w) => {
    const gr = x.createLinearGradient(0, 0, 0, w);
    [[0, '#5a5f6b'], [0.22, '#ffffff'], [0.38, '#8d93a0'], [0.55, '#3c414c'], [0.7, '#c9ced8'], [0.86, '#ffffff'], [1, '#6c7280']].forEach(([o, c]) => gr.addColorStop(o, c));
    x.fillStyle = gr; x.fillRect(0, 0, w, w);
  }) }),
  g: new THREE.MeshMatcapMaterial({ vertexColors: true, transparent: true, opacity: 0.5, depthWrite: false, matcap: matcap((x, w) => {
    const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    gr.addColorStop(0, '#6f7680'); gr.addColorStop(0.62, '#b9c1cb'); gr.addColorStop(0.9, '#ffffff'); gr.addColorStop(1, '#ffffff'); x.fillStyle = gr; x.fillRect(0, 0, w, w);
    const hl = x.createRadialGradient(w * 0.3, w * 0.28, 0, w * 0.3, w * 0.28, w * 0.12); hl.addColorStop(0, 'rgba(255,255,255,1)'); hl.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = hl; x.fillRect(0, 0, w, w);
  }) })
};
// Monta um item: junta as peças de cada material e faz um objeto com um grupo por material (o vidro por último, para
// o que está dentro dele aparecer através).
function itemMesh(draw) {
  const M = { m: [], p: [], t: [], g: [] }; draw(M);
  const keys = ['m', 'p', 't', 'g'].filter(k => M[k].length);
  const geo = mergeGeometries(keys.map(k => mergeGeometries(M[k])), true);
  return new THREE.Mesh(geo, keys.map(k => ITEM_MATS[k]));
}

// Caixa com o sombreado já pintado (frente clara, laterais e fundo mais escuros), desenhada sem depender da luz da
// cena: as lixeiras ficam sempre vivas, de qualquer ângulo. Ordem das faces: +x, -x, +y, -y, +z, -z.
const flatMat = new THREE.MeshBasicMaterial({ vertexColors: true });
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
    const m = itemMesh(draw);
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
    sym.position.set(PX, PT + 0.158, PZ - 0.04); sym.userData.keep = true; sym.userData.noRace = true; g.add(sym);
    sym.userData.anim = t => { sym.rotation.y = Math.sin(t * 0.8) * 0.5; sym.position.y = PT + 0.158 + Math.sin(t * 1.4) * 0.004; };
    animated.push(sym);
  }
  // Lixo flutuando em volta do pavilhão, como na arte do jogo.
  [[TRASH[7], -0.13, 0.11, 0.6], [TRASH[5], 0.13, 0.1, 2.1], [TRASH[2], 0.07, 0.15, 4]].forEach(([[, , , draw], dx, h, ph]) => {
    const m = itemMesh(draw); m.scale.setScalar(1.3); g.add(m);
    m.userData.detail = true; m.userData.noRace = true;
    m.userData.anim = t => { m.position.set(PX + dx, PT + h + Math.sin(t * 1.1 + ph) * 0.01, PZ - 0.02); m.rotation.set(t * 0.7 + ph, t * 0.9, ph); };
    animated.push(m);
  });
  recy.party = confetti(g, PX, PT + 0.06, PZ);
}

// Enfeites da pista: passarela sobre a reta da esquerda, arco inflável na saída do S, painéis coloridos ao longo das
// retas e postes de luz nas curvas.
function buildTrackside(S, G, g) {
  const { X, Z, TX, TZ, K } = track;
  // Passarela: escadas nas duas pontas, piso, guarda-corpo aceso e uma faixa quadriculada no meio.
  {
    const bz = 0.07, y0 = sag(-0.42, bz), BY = 0.078;
    // Cada coluna desce até o chão logo embaixo dela (o planeta é curvo: o chão de fora é mais baixo que o do meio).
    for (const x of [-0.485, -0.355]) { const gy = sag(x, bz) - 0.002, hh = y0 + BY - gy; piece(S, Bx(0.014, hh, 0.022), '#e9ecf5', x, gy + hh / 2, bz); piece(S, Bx(0.018, 0.006, 0.026), '#3a3f6a', x, gy + 0.003, bz); piece(S, Bx(0.016, 0.004, 0.024), '#ff4fd8', x, y0 + BY + 0.002, bz); }
    piece(S, Bx(0.15, 0.005, 0.022), '#2b2250', -0.42, y0 + BY + 0.0025, bz);
    for (const s of [-1, 1]) piece(G, Bx(0.15, 0.002, 0.002), '#7fe9ff', -0.42, y0 + BY + 0.014, bz + s * 0.011);
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.016), signMat(256, 32, (x, w, h) => {
      x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.fillStyle = '#ff4fd8'; x.fillRect(0, 0, w, 2); x.fillRect(0, h - 2, w, 2);
      for (let k = 0; k < 3; k++) pixelText(x, HEART, 10 + k * 20, 9, '#ff3b5c', 3);
      [...'PLAYER 1'].forEach((ch, i) => pixelText(x, FONT[ch], 82 + i * 20, 9, i < 6 ? '#7fe9ff' : '#ffc56b', 3));
    }));
    banner.position.set(-0.42, y0 + BY - 0.004, bz + 0.0115); banner.userData.keep = true; g.add(banner);
  }
  // Arco inflável listrado na saída do viaduto, atravessado na pista.
  {
    const i = nearest(0.24, 0.39), ax = X[i], az = Z[i], y0 = sag(ax, az), AR = 0.066, ry = Math.PI / 2 - Math.atan2(TZ[i], TX[i]);
    for (let k = 0; k < 8; k++) {
      const seg = new THREE.TorusGeometry(AR, 0.007, 6, 6, Math.PI / 8); seg.rotateZ(k * Math.PI / 8);
      piece(S, seg, k % 2 ? '#ff4fd8' : '#ffc56b', ax, y0, az, ry);
    }
  }
  // Viaduto: laje contínua embaixo do asfalto, muretas contínuas com faixa acesa no topo (alternando rosa e azul) e
  // pilares fora da pista de baixo. Tudo acompanha a curva e a rampa sem degraus.
  {
    const low = [];
    for (let i = 0; i < N; i++) if (track.Y[i] === 0) low.push(i);
    const overRoad = (x, z) => low.some(i => (X[i] - x) ** 2 + (Z[i] - z) ** 2 < (W + 0.012) ** 2);
    const ribbon = (list, rows, color) => {
      // rows: para cada índice da ponte, os pontos [x, y, z] de uma seção; liga seção com seção em faixas.
      const pos = [], col = [], c = new THREE.Color(color);
      for (let r = 0; r < rows.length - 1; r++) for (let k = 0; k < rows[r].length - 1; k++) {
        const a = rows[r][k], b = rows[r][k + 1], c1 = rows[r + 1][k], d = rows[r + 1][k + 1];
        for (const v of [a, c1, b, b, c1, d]) { pos.push(...v); col.push(c.r, c.g, c.b); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.computeVertexNormals(); list.push(geo);
    };
    const idx = []; for (let i = 0; i < N; i++) if (track.Y[i] > 0.001) idx.push(i);
    // A ponte é um trecho contínuo de índices; ordena começando logo depois de um buraco na sequência.
    const start = idx.findIndex((v, k) => idx[(k + idx.length - 1) % idx.length] !== (v + N - 1) % N), ord = idx.slice(start).concat(idx.slice(0, start));
    const at = (i, lat, dy) => { const x = X[i] - TZ[i] * lat, z = Z[i] + TX[i] * lat; return [x, sag(x, z) + LIFT + track.Y[i] + dy, z]; };
    const E = W + 0.006, M = W + 0.004;
    // Laje: fundo e laterais (uma faixa em U por baixo do asfalto).
    const BS = [], BG = [];
    ribbon(BS, ord.map(i => [at(i, -E, -0.0005), at(i, -E, -0.011), at(i, E, -0.011), at(i, E, -0.0005)]), '#3a3f6a');
    // Muretas: parede branca por fora e por dentro, faixa acesa no topo.
    for (const sd of [-1, 1]) {
      ribbon(BS, ord.map(i => [at(i, sd * (M + 0.002), 0.0005), at(i, sd * (M + 0.002), 0.0095), at(i, sd * (M - 0.002), 0.0095), at(i, sd * (M - 0.002), 0.0005)]), '#e9ecf5');
      ribbon(BG, ord.map(i => [at(i, sd * (M + 0.0024), 0.0098), at(i, sd * (M - 0.0024), 0.0098)]), sd > 0 ? '#ff4fd8' : '#7fe9ff');
    }
    // Faixas vistas dos dois lados (a ponte aparece de cima, de baixo e de lado).
    g.add(new THREE.Mesh(mergeGeometries(BS), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, flatShading: true, side: THREE.DoubleSide })));
    g.add(new THREE.Mesh(mergeGeometries(BG), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide })));
    for (const i of ord) {
      if (i % 9 || track.Y[i] < 0.02) continue;
      for (const sd of [-1, 1]) {
        const px = X[i] - TZ[i] * (W - 0.004) * sd, pz = Z[i] + TX[i] * (W - 0.004) * sd, g0 = sag(px, pz), ph = sag(X[i], Z[i]) + LIFT + track.Y[i] - 0.011 - g0;
        if (!overRoad(px, pz)) piece(S, Bx(0.009, ph, 0.009), '#c9d0de', px, g0 + ph / 2, pz, -Math.atan2(TZ[i], TX[i]));
      }
    }
  }

  // Mureta da pista: parede baixa contínua dos dois lados, logo depois da zebra, em volta do circuito inteiro (no
  // viaduto quem segura são as muretas da ponte). Branca, com o topo em trechos vermelhos e brancos. Os karts
  // batem exatamente nela (BARRIER).
  {
    const runs = []; let cur = null;
    for (let k = 0; k <= N; k++) {
      const i = k % N, on = track.Y[i] < 0.006;
      if (on) { if (!cur) runs.push(cur = []); cur.push(i); } else cur = null;
    }
    if (runs.length > 1 && runs[0][0] === 0 && track.Y[N - 1] < 0.006) { const first = runs.shift(); runs[runs.length - 1].push(...first.slice(1)); }
    const L = [], B = BARRIER, T = 0.0016, H = 0.0078;
    const at = (i, lat, dy) => { const x = X[i] - TZ[i] * lat, z = Z[i] + TX[i] * lat; return [x, sag(x, z) + LIFT + track.Y[i] + dy, z]; };
    const white = new THREE.Color('#f1f1f6'), red = new THREE.Color('#e8452f');
    for (const run of runs) for (const sd of [-1, 1]) {
      L.push(ribbonGeo(run.map(i => [at(i, sd * (B + T), -0.004), at(i, sd * (B + T), H), at(i, sd * (B - T), H), at(i, sd * (B - T), -0.004)]), () => white));
      L.push(ribbonGeo(run.map(i => [at(i, sd * (B + T + 0.0004), H + 0.0012), at(i, sd * (B - T - 0.0004), H + 0.0012)]), r => (Math.floor(run[r] / 4) % 2 ? red : white)));
    }
    g.add(new THREE.Mesh(mergeGeometries(L), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, flatShading: true, side: THREE.DoubleSide, emissive: '#3d3d4a' })));
  }
  // Postes de luz nas curvas grandes.
  for (const [x, z] of [[0.49, -0.24], [0.5, 0.33], [-0.47, 0.25], [-0.48, -0.28], [0, 0.42], [-0.2, 0.52]]) {
    const y0 = sag(x, z);
    piece(S, Cy(0.002, 0.08, 6), '#3a3f4a', x, y0 + 0.04, z);
    piece(S, Bx(0.016, 0.003, 0.003), '#3a3f4a', x, y0 + 0.08, z);
    for (const s of [-1, 1]) piece(G, Bx(0.005, 0.004, 0.005), '#fff6d8', x + s * 0.006, y0 + 0.077, z);
  }
}

// Zona VR: palco redondo com grade acesa, três pessoas de óculos VR e o óculos gigante girando em holograma.
function buildGameDecor(g, S, G, zi) {
  // Zona VR (no lugar do antigo letreiro): palco redondo com grade acesa, três pessoas de óculos VR e, flutuando no
  // feixe de luz, o óculos gigante da Miniverso girando devagar.
  {
    const vx = 0.2, vz = -0.11, vy = topAt(vx, vz, 0.05) + 0.003, vb = sag(vx, vz) - 0.003;
    piece(S, Cy(0.046, vy - vb, 24), '#1d1d2a', vx, (vy + vb) / 2, vz);
    piece(G, new THREE.TorusGeometry(0.046, 0.0018, 4, 40), '#00b7e3', vx, vy, vz, 0, Math.PI / 2);
    for (let k = -2; k <= 2; k++) for (const r of [0, Math.PI / 2]) piece(G, Bx(0.08 - Math.abs(k) * 0.012, 0.0006, 0.0012), '#1f6f9a', vx + (r ? k * 0.014 : 0), vy + 0.0004, vz + (r ? 0 : k * 0.014), r);
    const spots = [[vx - 0.02, vz + 0.012], [vx + 0.018, vz + 0.016], [vx, vz - 0.02]];
    crowd(g, spots.map(([x, z]) => [x, z, vy]), zi, ['#ff4fd8', '#ffc56b', '#3ee0b5'], { fx: () => -1 });
    for (const [x, z] of spots) { piece(S, Bx(0.0085, 0.0045, 0.0075), '#15161c', x, vy + 0.0168, z); piece(G, Bx(0.0088, 0.0026, 0.0078), '#00b7e3', x, vy + 0.0168, z + 0.0004); }
    const beam = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 18, 1, true), holoMat('#7fe9ff', 0.12));
    beam.rotation.x = Math.PI; beam.position.set(vx, vy + 0.05, vz); beam.userData.keep = true; beam.userData.noRace = true; g.add(beam);
    const goggles = new THREE.Group(); goggles.position.set(vx, vy + 0.12, vz); goggles.userData.noRace = true; g.add(goggles);
    const GS = [], GG = [];
    piece(GS, new RoundedBoxGeometry(0.07, 0.032, 0.032, 3, 0.01), '#1d1d2a', 0, 0, 0);
    piece(GS, Bx(0.074, 0.012, 0.012), '#3a3f4a', 0, 0, -0.019);
    piece(GS, new THREE.TorusGeometry(0.03, 0.004, 5, 18, Math.PI), '#3a3f4a', 0, 0, -0.012, 0, Math.PI / 2, Math.PI / 2);
    piece(GG, new RoundedBoxGeometry(0.06, 0.022, 0.004, 2, 0.006), '#00b7e3', 0, 0.001, 0.016);
    piece(GG, Bx(0.05, 0.003, 0.0045), '#c9f6ff', 0, 0.006, 0.0165);
    goggles.add(meshOf(GS, vcMat), meshOf(GG, glowMat));
    goggles.userData.anim = t => { const k = toyKick(goggles, t); goggles.rotation.y = Math.sin(t * 0.5) * 0.7 + k * TAU; goggles.position.y = vy + 0.12 + Math.sin(t * 1.2) * 0.006 + k * 0.03; };
    animated.push(goggles); toys.push(goggles);
  }
}

export { arcade, BINS, buildGames, game, race, recy, slopeAt, track, trackAt, whack };
