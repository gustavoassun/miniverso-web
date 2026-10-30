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
// telão com a classificação, zebras, pneus e faixas de turbo); dentro dele ficam a Praça Arcade (salão de fliperamas,
// roda-gigante, controle gigante e blocos flutuando) e a Arena dos Blocos, com piso de LED.
// Leveza: quase tudo que é parado vira duas malhas com cor nos vértices (uma fosca e uma acesa); peças repetidas
// (pneus, cones, torcida, cabines da roda-gigante, luzes) são desenhadas de uma vez só.
const game = { zi: 3, gems: [], got: 0, on: false, party: null };
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

  // Controle de videogame gigante flutuando (genérico) no meio da praça.
  {
    const pad = new THREE.Group(), padY = sag(0.02, -0.13) + 0.2; pad.position.set(0.02, padY, -0.13); g.add(pad);
    const PS = [], PG = [];
    piece(PS, new RoundedBoxGeometry(0.09, 0.022, 0.045, 3, 0.009), '#7a5cff', 0, 0, 0);
    for (const s of [-1, 1]) { const gr = new THREE.SphereGeometry(0.017, 12, 8); gr.scale(1, 0.7, 1.3); piece(PS, gr, '#7a5cff', s * 0.036, -0.004, 0.02); }
    for (const [w, d] of [[0.024, 0.007], [0.007, 0.024]]) piece(PS, Bx(w, 0.006, d), '#f6f6f6', -0.025, 0.012, 0);
    [['#ff8a6b', 0.025, -0.009], ['#ffc56b', 0.034, 0], ['#3ee0b5', 0.025, 0.009], ['#00b7e3', 0.016, 0]].forEach(([c, x, z]) => piece(PG, new THREE.SphereGeometry(0.0045, 8, 6), c, x, 0.012, z));
    pad.add(meshOf(PS, vcMat), meshOf(PG, glowMat));
    pad.userData.anim = t => { const k = toyKick(pad, t); pad.rotation.set(0.7 + Math.sin(t * 0.9) * 0.1, Math.sin(t * 0.5) * 0.5 + k * TAU, Math.sin(t * 0.7) * 0.08); pad.position.y = padY + Math.sin(t * 1.3) * 0.01 + k * 0.05; };
    animated.push(pad); toys.push(pad);
  }
  // Ilha de blocos flutuando e blocos voando em volta do parque (clique neles!).
  {
    const blocks = new THREE.Group(), bly = sag(-0.03, 0.04) + 0.16; blocks.position.set(-0.03, bly, 0.04); g.add(blocks);
    const BS = [];
    [[0, 0, 0, '#3ee0b5'], [0.022, 0, 0, '#3ee0b5'], [-0.022, 0, 0, '#ffc56b'], [0, 0, 0.022, '#b07cff'], [0, 0.022, 0, '#ff8a6b'], [0.022, -0.022, 0.022, '#8a7f9e'], [-0.022, -0.022, 0, '#8a7f9e']]
      .forEach(([x, y, z, c]) => piece(BS, Bx(0.021, 0.021, 0.021), c, x, y, z));
    blocks.add(meshOf(BS, vcMat));
    blocks.userData.anim = t => { const k = toyKick(blocks, t); blocks.rotation.y = t * 0.5 + k * TAU; blocks.position.y = bly + Math.sin(t * 1.2) * 0.012 + k * 0.06; };
    animated.push(blocks); toys.push(blocks);
    ['#ff8a6b', '#ffc56b', '#3ee0b5', '#b07cff', '#ff4fd8', '#00b7e3'].forEach((c, k) => {
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.024, 0.024, 2, 0.004), new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.35, flatShading: true })); g.add(b);
      const r = 0.3 + (k % 2) * 0.04, h = 0.24 + k * 0.012, sp = 0.2 + k * 0.03, ph = k / 6 * TAU;
      b.userData.anim = t => { const kk = toyKick(b, t), a = ph + t * sp; b.position.set(Math.cos(a) * r, sag(Math.cos(a) * r, Math.sin(a) * r) + h + Math.sin(t * 2 + k) * 0.01 + kk * 0.07, Math.sin(a) * r); b.rotation.set(t + k + kk * 6, t * 0.7 + kk * 6, 0); };
      animated.push(b); toys.push(b);
    });
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
    // Fonte de pixels embaixo da ilha de blocos: bacia, espelho d'água e cubinhos coloridos saltando.
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
  [[0.07, -0.25, '#e8452f', '#ffd23f'], [-0.06, -0.25, '#ff9de9', '#7fe9ff'], [0.32, -0.13, '#00b7e3', '#ff8a6b']].forEach(([x, z, c1, c2]) => {
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
  [[-0.135, 0.08], [0.08, -0.04], [-0.145, -0.04], [-0.09, 0.25], [0.12, 0.24], [-0.3, 0.1], [0.12, -0.17], [-0.17, -0.27]].forEach(([x, z], k) => {
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
  [[-0.15, -0.24, '#ff7bb0'], [0.15, -0.21, '#3ee0b5'], [-0.33, 0.24, '#b07cff'], [0.16, 0.29, '#ffd23f'], [-0.33, -0.27, '#2f9b7a'], [0.33, 0.24, '#ff7bb0']].forEach(([x, z, c]) => {
    const y0 = sag(x, z);
    piece(S, Cy(0.014, 0.008, 10), '#e9ecf5', x, y0 + 0.004, z);
    piece(S, Cy(0.0025, 0.016, 5), '#7a5a3a', x, y0 + 0.016, z);
    piece(S, new THREE.IcosahedronGeometry(0.017, 0), c, x, y0 + 0.032, z);
  });
  // Gente: passeando pela praça e em volta do carrossel, na fila dos quiosques, nos fliperamas e assistindo à arena.
  const ppl = ['#ff8a6b', '#ffc56b', '#3ee0b5', '#00b7e3', '#ff4fd8', '#b07cff', '#f6f6f6', '#7a5cff'];
  walkers(g, [[[-0.12, -0.08], [0.05, -0.08], [0.05, 0.11], [-0.12, 0.11]], [[-0.04, 0.13], [0.12, 0.13], [0.12, 0.25], [-0.04, 0.25]], [[-0.12, -0.29], [0.2, -0.29], [0.2, -0.195], [-0.12, -0.195]]], 5, ppl, (x, z) => sag(x, z) + FLOOR);
  crowd(g, [[0.07, -0.226], [0.07, -0.212], [-0.06, -0.226], [0.32, -0.106], [-0.27, 0.25], [-0.24, 0.25], [-0.17, 0.25], [-0.14, 0.25], [0.06, -0.1], [0.08, -0.08], [0.31, 0.03], [0.3, 0.12], [0.18, 0.21]].map(([x, z]) => [x, z, sag(x, z) + FLOOR]), zi, ppl);

  // Karts: o seu (amarelo) e três rivais. Fora da corrida eles dão voltas sozinhos pela pista.
  [['#ffc56b', 'Você', 0.17, -0.012], ['#ff4fd8', 'Rosa', 0.19, 0.012], ['#00b7e3', 'Azul', 0.18, -0.01], ['#3ee0b5', 'Verde', 0.2, 0.011]].forEach(([color, name, speed, lane], k) => {
    const kart = new THREE.Mesh(kartGeo(color), vcMat); g.add(kart);
    const info = { mesh: kart, color, name, s: k * track.L / 4, lane, speed, last: -1 };
    info.place = (x, z, h) => { kart.position.set(x, sag(x, z) + LIFT, z); kart.rotation.y = -h; };
    kart.userData.anim = t => {
      const dt = info.last < 0 ? 0 : Math.min(0.1, t - info.last); info.last = t;
      if (race.state !== 'off') return;
      info.s += info.speed * Math.min(1, track.VL[Math.floor(((info.s % track.L) + track.L) % track.L / track.ds) % N] / 0.2) * dt;
      trackAt(info.s, info.lane + Math.sin(t * 0.6 + k) * 0.004, pt); info.place(pt.x, pt.z, pt.h);
    };
    race.karts.push(info); animated.push(kart);
  });

  // Gemas do minigame 1, espalhadas pelo parque (na roda-gigante, no salão, na arquibancada, no telão, na pista...).
  [[-0.24, 0.27, -0.15], [-0.205, 0.12, 0.165], [0, 0.11, -0.5], [0.32, 0.215, -0.5], [0.19, 0.06, 0.075], [0.44, 0.04, 0.1], [-0.42, 0.04, 0], [0.04, 0.05, 0.31]].forEach(([x, h, z], k) => {
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.014), new THREE.MeshStandardMaterial({ color: '#7fe9ff', emissive: '#00b7e3', emissiveIntensity: 1.2, flatShading: true, transparent: true }));
    const gy = sag(x, z) + h; gem.position.set(x, gy, z); gem.scale.y = 1.4; gem.visible = false; gem.userData.got = -1;
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); gem.add(hit); hit.userData.gem = gem;
    gem.userData.anim = t => {
      if (gem.userData.got >= 0) { const age = t - gem.userData.got; gem.scale.setScalar(1 + age * 4); gem.material.opacity = 1 - age * 3; if (age > 0.33) gem.visible = false; return; }
      gem.rotation.y = t * 2 + k; gem.position.y = gy + Math.sin(t * 2 + k) * 0.008;
    };
    g.add(gem); animated.push(gem); game.gems.push(gem);
  });
  game.party = confetti(g, 0, sag(0, 0) + 0.12, 0);

  g.add(meshOf(S, vcMat), meshOf(G, glowMat));
  race.board('MINIVERSO GP', race.karts.map(k => [k.name, k.color, '']));
  const ctl = new THREE.Group(); g.add(ctl); ctl.userData.anim = () => rt.gameTick(); animated.push(ctl);
}

export { arcade, buildGames, game, race, track, trackAt, whack };
