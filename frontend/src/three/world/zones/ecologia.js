import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, TAU, mix, smooth } from '../../core/math.js';
import { sag } from '../build.js';
import { crowd } from '../people.js';
import { animated, fxT, fxT3, fxT4, toys } from '../runtime.js';
import { canvasTex } from '../textures.js';

// Ecologia: Reserva do mangue. Uma história de água de cima para baixo: no alto, uma cachoeira desce de um morro de
// pedras para um poço no meio do bosque (ipês floridos e buritis); o rio corre até o mar e, na foz, o mangue cresce
// na lama do estuário, com seus canais. No meio fica o campo com borboletas e uma lagoa de vitórias-régias;
// do outro lado, a praia dos ninhos de tartaruga, o viveiro de mudas, o centro de visitantes e as turbinas de vento.
// Uma passarela de madeira sobre palafitas liga seis estações (cachoeira, mirante dos guarás, caranguejo-uçá,
// tartarugas, viveiro e centro de visitantes). Bichos: guarás em bando, caranguejos, garças, peixe-boi, peixes,
// filhotes de tartaruga, sapo e borboletas. Jogos: Expedição em VR e Limpe o mangue (games.js).
// Leveza: o que é parado vira duas malhas com cor nos vértices (fosca e acesa); bichos e flores repetidos são
// desenhados de uma vez só.
const FR = 0.6;
const shore = x => -0.36 + Math.sin(x * 8 + 1) * 0.022;                    // linha da praia (o mar fica abaixo dela)
// Rio: da cachoeira até a foz, alargando; [x, z, largura].
const RIVER = [[-0.41, 0.215, 0.02], [-0.38, 0.16, 0.022], [-0.33, 0.07, 0.026], [-0.3, -0.04, 0.03], [-0.27, -0.15, 0.036], [-0.25, -0.26, 0.046], [-0.23, -0.36, 0.06], [-0.22, -0.46, 0.08]];
// Canais do mangue que se abrem da foz pelo banhado.
const CHANNELS = [[[-0.27, -0.2], [-0.36, -0.24], [-0.43, -0.3]], [[-0.25, -0.3], [-0.16, -0.31], [-0.08, -0.36]], [[-0.3, -0.1], [-0.4, -0.12], [-0.46, -0.06]]];
const POND = { x: 0.05, z: -0.06, r: 0.055 };
const ST = { cachoeira: [-0.41, 0.3], mirante: [-0.11, -0.16], caranguejo: [-0.1, -0.31], tartaruga: [0.18, -0.31], viveiro: [0.41, 0.02], centro: [0.08, 0.27] };
// Passarela: laço que sai do centro de visitantes, cruza o campo, sobe ao mirante da cachoeira, desce pela margem do
// rio até o mangue, passa pela praia e volta pelo viveiro.
const WALK = [[0.08, 0.15], [-0.04, 0.18], [-0.16, 0.21], [-0.27, 0.21], [-0.29, 0.12], [-0.24, 0.02], [-0.2, -0.1], [-0.17, -0.21], [-0.08, -0.26], [0.04, -0.26], [0.16, -0.25], [0.27, -0.18], [0.34, -0.06], [0.33, 0.06], [0.21, 0.13]];
const riverAt = z => { for (let k = 0; k < RIVER.length - 1; k++) { const [x0, z0, w0] = RIVER[k], [x1, z1, w1] = RIVER[k + 1]; if (z <= z0 && z >= z1) { const u = (z0 - z) / (z0 - z1); return [x0 + (x1 - x0) * u, w0 + (w1 - w0) * u]; } } return null; };
// Banhado de lama: dos dois lados do rio, alargando para a foz, e na beira do mar do lado do mangue.
const inMud = (x, z) => {
  if (z > -0.04 || x > 0.02 || z < shore(x) + 0.018) return false;          // a lama para antes do mar
  const r = riverAt(Math.max(-0.46, z));
  return (r && Math.abs(x - r[0]) < 0.07 + (-0.04 - z) * 0.6) || (z < shore(x) + 0.06 && x < 0);
};

const _c = new THREE.Color(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), ONE = new THREE.Vector3(1, 1, 1);
function paint(geo, color) {
  if (geo.index) geo = geo.toNonIndexed();
  geo.deleteAttribute('uv'); _c.set(color);
  const n = geo.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = _c.r; c[i * 3 + 1] = _c.g; c[i * 3 + 2] = _c.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(c, 3)); return geo;
}
function piece(list, geo, color, x, y, z, ry = 0, rx = 0, rz = 0) { geo = paint(geo, color); geo.applyMatrix4(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), ONE)); list.push(geo); return geo; }
const Bx = (w, h, d) => new THREE.BoxGeometry(w, h, d), Cy = (r, h, s = 10, r2 = r) => new THREE.CylinderGeometry(r, r2, h, s);
const vcMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, flatShading: true });
const glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const signMat = (w, h, draw) => new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(w, h, draw) });
// Dados da reserva usados pelos jogos (games.js): o caminho da passarela (para a Expedição em VR, em primeira
// pessoa), as estações com a curiosidade de cada uma e o lixo boiando do minigame Limpe o mangue.
const eco = {
  zi: -1, path: [], cum: [], L: 0, stations: [], trash: [], cleanOn: false,
  at(s, out) {
    const { path, cum, L } = eco; s = Math.max(0, Math.min(L, s));
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = path[i - 1], b = path[i], u = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
    out.x = a.x + (b.x - a.x) * u; out.y = a.y + (b.y - a.y) * u; out.z = a.z + (b.z - a.z) * u; return out;
  },
  spawnAll: () => {}, collect: () => false, hide: () => {}
};
const FACTS = {
  cachoeira: ['Cachoeira e bosque', 'A água das nascentes desce pelos rios e chega ao mangue, onde se mistura com o mar.'],
  mirante: ['Mirante dos guarás', 'O guará nasce cinzento e fica vermelho comendo os caranguejinhos do mangue.'],
  caranguejo: ['Caranguejo-uçá', 'Na época das chuvas, o uçá sai da toca em bando para se reproduzir: é a "andada".'],
  tartaruga: ['Praia das tartarugas', 'Os filhotes nascem à noite e seguem o brilho do mar. Luz artificial na praia os confunde.'],
  viveiro: ['Viveiro de mudas', 'O mangue segura a costa contra a erosão e é berçário de peixes, camarões e caranguejos.'],
  centro: ['Centro de visitantes', 'Com realidade virtual, a Miniverso leva a turma a lugares preservados sem sair da sala.']
};

function buildEcology(g, zi) {
  const S = [], G = [];
  eco.zi = zi;
  // O relevo do planeta fica ~4–5 mm acima da base da área: o chão da reserva vai um pouco acima dele.
  const ground = (x, z) => sag(x, z) + 0.0062;

  // Chão: gramado, bosque mais escuro no alto, rio e canais, banhado de lama na foz, praia e o mar (que continua no
  // oceano do planeta). Some aos poucos na borda, perto da ferrovia e do lado dos Jogos.
  {
    const SZ = 1280, px = u => (u / FR + 1) / 2 * SZ, sc = SZ / (2 * FR);
    const tex = canvasTex(SZ, SZ, (x, w, h) => {
      x.fillStyle = '#5cc48c'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3200; i++) { x.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.05)' : 'rgba(0,60,30,.06)'; x.fillRect(R() * w, R() * h, 3, 3); }
      x.fillStyle = '#3f9c6a'; x.beginPath(); x.ellipse(px(-0.3), px(0.28), 0.22 * sc, 0.13 * sc, -0.2, 0, TAU); x.fill();
      x.fillStyle = 'rgba(240,200,60,.5)'; for (let i = 0; i < 120; i++) x.fillRect(px(-0.3 + (R() - 0.5) * 0.4), px(0.28 + (R() - 0.5) * 0.22), 3, 3);
      const seaTop = off => { x.beginPath(); x.moveTo(0, 0); for (let k = 0; k <= 80; k++) { const u = -FR + k / 80 * 2 * FR; x.lineTo(px(u), px(shore(u) + off)); } x.lineTo(w, 0); x.closePath(); };
      seaTop(0.07); x.fillStyle = '#f2e3b3'; x.fill();
      seaTop(0); x.fillStyle = '#eafaff'; x.fill();
      seaTop(-0.007); x.fillStyle = '#5fc4e2'; x.fill();
      seaTop(-0.05); x.fillStyle = '#2a86c4'; x.fill();
      x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 3; x.lineCap = 'round';
      for (let i = 0; i < 70; i++) { const u = (R() * 2 - 1) * FR, v = shore(u) - 0.06 - R() * 0.25; x.beginPath(); x.arc(px(u), px(v), 9, Math.PI * 1.15, Math.PI * 1.85); x.stroke(); }
      x.fillStyle = 'rgba(160,130,80,.25)'; for (let i = 0; i < 700; i++) { const u = (R() * 2 - 1) * FR, v = shore(u) + R() * 0.07; x.fillRect(px(u), px(v), 2, 2); }
      x.fillStyle = '#6b5a46';
      for (let gx = -FR; gx < 0.03; gx += 0.006) for (let gz = -0.5; gz < -0.02; gz += 0.006) if (inMud(gx, gz)) x.fillRect(px(gx) - 1, px(gz) - 1, 0.006 * sc + 2, 0.006 * sc + 2);
      x.fillStyle = '#5a4a39'; for (let i = 0; i < 260; i++) { const u = -0.48 + R() * 0.5, v = -0.42 + R() * 0.38; if (!inMud(u, v)) continue; x.beginPath(); x.ellipse(px(u), px(v), 4 + R() * 6, 3 + R() * 4, R() * 3, 0, TAU); x.fill(); }
      x.fillStyle = '#2b2219'; for (let i = 0; i < 46; i++) { const a = R() * TAU, r = 0.3 + R() * 0.6; x.beginPath(); x.arc(px(ST.caranguejo[0] + Math.cos(a) * r * 0.08), px(ST.caranguejo[1] + Math.sin(a) * r * 0.045), 2.5, 0, TAU); x.fill(); }
      // Rio e canais só em terra: o desenho é cortado na linha da praia (desaguam e somem no mar, sem faixa por cima).
      x.save(); x.beginPath(); x.moveTo(0, h); for (let k = 0; k <= 80; k++) { const u = -FR + k / 80 * 2 * FR; x.lineTo(px(u), px(shore(u) + 0.004)); } x.lineTo(w, h); x.closePath(); x.clip();
      x.lineCap = 'round'; x.lineJoin = 'round';
      for (const [extra, c] of [[0.012, '#4f7a6a'], [0, '#3aa0c8']]) for (let k = 0; k < RIVER.length - 1; k++) {
        const [x0, z0, w0] = RIVER[k], [x1, z1, w1] = RIVER[k + 1]; x.strokeStyle = c; x.lineWidth = ((w0 + w1) / 2 + extra) * sc;
        x.beginPath(); x.moveTo(px(x0), px(z0)); x.lineTo(px(x1), px(z1)); x.stroke();
      }
      x.strokeStyle = 'rgba(255,255,255,.3)'; x.lineWidth = 2; for (let i = 0; i < 40; i++) { const z = 0.25 - R() * 0.6, r = riverAt(z); if (!r) continue; x.beginPath(); x.moveTo(px(r[0] - 0.006), px(z)); x.lineTo(px(r[0] + 0.004), px(z - 0.004)); x.stroke(); }
      for (const ch of CHANNELS) for (const [lw, c] of [[0.03 * sc, '#4f7a6a'], [0.02 * sc, '#3a9cc0']]) {
        x.strokeStyle = c; x.lineWidth = lw; x.beginPath(); ch.forEach(([u, v], k) => (k ? x.lineTo(px(u), px(v)) : x.moveTo(px(u), px(v)))); x.stroke();
      }
      // Foz: a água do rio e dos canais se abre num leque claro na beira, misturando com o mar.
      x.restore();
      for (const [u, v] of [[riverAt(-0.355)[0], shore(riverAt(-0.355)[0])], ...CHANNELS.map(ch => [ch[ch.length - 1][0], shore(ch[ch.length - 1][0])])]) {
        const gm = x.createRadialGradient(px(u), px(v), 0, px(u), px(v), 0.045 * sc); gm.addColorStop(0, 'rgba(95,196,226,.85)'); gm.addColorStop(1, 'rgba(95,196,226,0)');
        x.fillStyle = gm; x.beginPath(); x.arc(px(u), px(v), 0.045 * sc, 0, TAU); x.fill();
      }
      x.fillStyle = '#e3cf98'; x.beginPath(); x.arc(px(POND.x), px(POND.z), (POND.r + 0.008) * sc, 0, TAU); x.fill();
      x.fillStyle = '#2f95b8'; x.beginPath(); x.arc(px(POND.x), px(POND.z), POND.r * sc, 0, TAU); x.fill();
      x.strokeStyle = '#d9c59a'; x.lineWidth = 0.022 * sc; x.beginPath(); x.moveTo(px(0.1), px(0.48)); x.quadraticCurveTo(px(0.12), px(0.38), px(0.08), px(0.31)); x.stroke();
      x.globalCompositeOperation = 'destination-out';
      const gr = x.createRadialGradient(w / 2, h / 2, w * 0.36, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      const gz = x.createLinearGradient(0, px(0.4), 0, px(0.47)); gz.addColorStop(0, 'rgba(0,0,0,0)'); gz.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = gz; x.fillRect(0, px(0.4), w, h);
      const gx = x.createLinearGradient(px(0.45), 0, px(0.52), 0); gx.addColorStop(0, 'rgba(0,0,0,0)'); gx.addColorStop(1, 'rgba(0,0,0,1)'); x.fillStyle = gx; x.fillRect(px(0.45), 0, w, h);
      x.globalCompositeOperation = 'source-over';
    });
    tex.anisotropy = 16;
    const geo = new THREE.RingGeometry(0.0005, FR, 110, 22); geo.rotateX(-Math.PI / 2);
    const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + 0.0058);
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.85 })));
  }

  // Cachoeira: um paredão de pedras no alto do bosque. O córrego corre por cima da laje, passa da borda e cai em
  // curva na frente da rocha até um degrau; dali cai de novo no poço, que tem espuma, névoa subindo e pedrinhas em
  // volta. Do poço sai o rio. A água é uma faixa contínua que acompanha esse caminho, com a textura correndo.
  {
    const [cx, cz] = ST.cachoeira, y0 = ground(cx, cz), ROCK = ['#8a8577', '#9c9688', '#7d786b'];
    const rock = (geo, k, x, y, z, ry = 0) => piece(S, geo, ROCK[k % 3], x, y, z, ry);
    // Laje de cima (topo reto, onde o córrego corre), pedras de trás mais altas, pedras dos lados emoldurando a queda,
    // o degrau do meio e pedrinhas em volta do poço.
    rock(Cy(0.036, 0.05, 7), 0, cx, y0 + 0.025, cz + 0.008, 0.3);
    rock(Cy(0.03, 0.068, 6), 1, cx - 0.012, y0 + 0.034, cz + 0.045, 0.8);
    rock(Cy(0.026, 0.06, 6), 2, cx + 0.03, y0 + 0.03, cz + 0.04, 0.2);
    for (const s of [-1, 1]) { rock(new THREE.IcosahedronGeometry(0.022, 0).scale(1, 1.25, 1), s > 0 ? 1 : 2, cx + s * 0.036, y0 + 0.026, cz - 0.022, s); rock(new THREE.IcosahedronGeometry(0.016, 0), 0, cx + s * 0.05, y0 + 0.012, cz - 0.045, s * 2); }
    rock(Cy(0.022, 0.024, 6), 1, cx, y0 + 0.012, cz - 0.046, 0.5);
    const poolZ = cz - 0.085;
    for (let k = 0; k < 11; k++) { const a = k / 11 * TAU, r = 0.034 + (k % 3) * 0.003; if (Math.sin(a) < -0.55) continue; rock(new THREE.IcosahedronGeometry(0.006 + (k % 3) * 0.002, 0).scale(1, 0.6, 1), k, cx + Math.cos(a) * r, ground(cx, poolZ) + 0.002, poolZ + Math.sin(a) * r * 0.8, k); }
    for (let k = 0; k < 9; k++) { const a = R() * TAU; piece(S, new THREE.IcosahedronGeometry(0.007 + R() * 0.005, 0), k % 2 ? '#3f9c6a' : '#4fae78', cx + Math.cos(a) * 0.045, y0 + 0.05 + R() * 0.02, cz + 0.03 + Math.sin(a) * 0.02, a); }
    // Caminho da água: [z, y, largura] — córrego na laje, borda, primeira queda em curva, degrau, segunda queda, poço.
    const path = [[0.035, 0.0515, 0.016], [0.0, 0.0512, 0.018], [-0.026, 0.051, 0.02], [-0.033, 0.047, 0.021], [-0.036, 0.038, 0.022], [-0.037, 0.028, 0.022], [-0.042, 0.0245, 0.022], [-0.054, 0.0242, 0.022], [-0.06, 0.02, 0.024], [-0.063, 0.01, 0.026], [-0.066, 0.003, 0.028], [-0.072, 0.0005, 0.03]];
    const curve = new THREE.CatmullRomCurve3(path.map(([z, y]) => new THREE.Vector3(0, y, z)), false, 'centripetal'), n = 40, pts = curve.getSpacedPoints(n);
    const widthAt = u => { const f = u * (path.length - 1), i = Math.min(path.length - 2, Math.floor(f)); return path[i][2] + (path[i + 1][2] - path[i][2]) * (f - i); };
    const pos = [], uv = [], idx = []; let acc = 0;
    pts.forEach((p, k) => {
      if (k) acc += p.distanceTo(pts[k - 1]);
      const w = widthAt(k / n) / 2;
      for (const sd of [-1, 1]) { pos.push(cx + sd * w, y0 + p.y + 0.0012, cz + p.z); uv.push((sd + 1) / 2, acc / 0.03); }
      if (k < n) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(idx);
    const fallTex = canvasTex(32, 128, (x, w, h) => {
      const gr = x.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#5cc4e8'); gr.addColorStop(0.5, '#a8e6f8'); gr.addColorStop(1, '#5cc4e8'); x.fillStyle = gr; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { x.fillStyle = R() < 0.5 ? 'rgba(255,255,255,.8)' : 'rgba(255,255,255,.4)'; x.fillRect(R() * w, R() * h, 1.5 + R() * 2.5, 10 + R() * 18); }
    });
    fallTex.wrapT = THREE.RepeatWrapping;
    const water = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: fallTex, transparent: true, opacity: 0.92, toneMapped: false, side: THREE.DoubleSide }));
    water.userData.keep = true; g.add(water);
    water.userData.anim = t => { fallTex.offset.y = -t * 1.3; }; animated.push(water);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.032, 22), new THREE.MeshBasicMaterial({ color: '#4ab4dc', toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.set(cx, ground(cx, poolZ) + 0.0006, poolZ); g.add(pool);
    // Espuma no pé da queda e névoa subindo.
    const foam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.003, 6, 4), new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.85 }), 18);
    foam.frustumCulled = false; foam.userData.detail = true; g.add(foam);
    const fz = cz - 0.072;
    foam.userData.anim = t => {
      for (let k = 0; k < 18; k++) {
        const u = (t * 0.6 + k * 0.29) % 1, a = k / 18 * TAU + t * 0.5;
        if (k < 12) { const r = 0.004 + u * 0.018, s = 1.2 - u; foam.setMatrixAt(k, _m.makeScale(s, s * 0.45, s).setPosition(cx + Math.cos(a) * r, pool.position.y + 0.001, fz + Math.sin(a) * r * 0.7)); }
        else { const s = 0.8 + u * 1.4; foam.setMatrixAt(k, _m.makeScale(s, s, s).setPosition(cx + Math.cos(a) * 0.008, pool.position.y + 0.004 + u * 0.02, fz + Math.sin(a) * 0.004)); }
      }
      foam.instanceMatrix.needsUpdate = true;
    };
    animated.push(foam);
  }

  // Árvores: mangue (raízes-escora em arco e copa larga) na lama do estuário; no bosque, ipês amarelos e roxos floridos
  // e buritis; algumas árvores comuns nas bordas e coqueiros na praia. Guarda as copas do mangue (os guarás pousam nelas).
  const crowns = [];
  {
    const mangrove = (x, z, s, k) => {
      const y = ground(x, z), H = 0.045 * s;
      for (let r = 0; r < 6; r++) { const b = r / 6 * TAU + k, arc = new THREE.TorusGeometry(0.012 * s, 0.0012, 4, 8, Math.PI * 0.9); arc.rotateY(b); piece(S, arc, '#6a4e33', x + Math.cos(b) * 0.006 * s, y + 0.001, z - Math.sin(b) * 0.006 * s); }
      piece(S, Cy(0.0028 * s, H, 6, 0.0038 * s), '#6a4e33', x, y + 0.008 * s + H / 2, z);
      const cy = y + 0.008 * s + H, shades = ['#2c6e4c', '#357d57', '#2a6446'];
      for (let l = 0; l < 4; l++) { const a = l / 4 * TAU + k, cr = new THREE.IcosahedronGeometry(0.02 * s, 0); cr.scale(1.15, 0.62, 1.15); piece(S, cr, shades[(l + k) % 3], x + Math.cos(a) * 0.012 * s, cy + (l % 2) * 0.006 * s, z + Math.sin(a) * 0.012 * s, a); }
      piece(S, new THREE.IcosahedronGeometry(0.022 * s, 0).scale(1.2, 0.6, 1.2), '#3a8a5f', x, cy + 0.01 * s, z, k);
      crowns.push([x, cy + 0.018 * s, z]);
    };
    const spots = [];
    for (let t = 0; spots.length < 24 && t < 3000; t++) {
      const x = -0.5 + R() * 0.52, z = -0.44 + R() * 0.4;
      if (!inMud(x, z) || Math.hypot(x, z) > 0.55) continue;
      const rv = riverAt(z); if (rv && Math.abs(x - rv[0]) < rv[1] / 2 + 0.012) continue;
      if (CHANNELS.some(ch => ch.some(([u, v]) => Math.hypot(x - u, z - v) < 0.02))) continue;
      if (Math.hypot(x - ST.mirante[0], z - ST.mirante[1]) < 0.05 || Math.hypot(x - ST.caranguejo[0], z - ST.caranguejo[1]) < 0.07) continue;
      if (WALK.some(([u, v]) => Math.hypot(x - u, z - v) < 0.035) || spots.some(([u, v]) => Math.hypot(x - u, z - v) < 0.05)) continue;
      spots.push([x, z]);
    }
    spots.forEach(([x, z], k) => mangrove(x, z, 0.85 + R() * 0.35, k));
    const ipe = (x, z, c, k) => {
      const y = ground(x, z); piece(S, Cy(0.0026, 0.04, 6, 0.0036), '#6a4e33', x, y + 0.02, z);
      const light = '#' + _c.set(c).lerp(new THREE.Color('#ffffff'), 0.3).getHexString();
      for (let l = 0; l < 5; l++) { const a = l / 5 * TAU + k; piece(S, new THREE.IcosahedronGeometry(0.014, 0).scale(1.2, 0.75, 1.2), l % 2 ? c : light, x + Math.cos(a) * 0.011, y + 0.05 + (l % 2) * 0.006, z + Math.sin(a) * 0.011, a); }
      piece(S, new THREE.IcosahedronGeometry(0.016, 0), c, x, y + 0.062, z, k);
    };
    const buriti = (x, z, k) => {
      const y = ground(x, z), H = 0.075; piece(S, Cy(0.003, H, 6, 0.004), '#7a6247', x, y + H / 2, z);
      for (let l = 0; l < 9; l++) { const a = l / 9 * TAU + k, leaf = new THREE.ConeGeometry(0.014, 0.004, 6, 1, false, 0, Math.PI * 0.9); leaf.rotateZ(Math.PI / 2); leaf.translate(0.016, 0, 0); piece(S, leaf, l % 2 ? '#3aa058' : '#2f8a4c', x, y + H, z, a, 0, -0.25); }
      for (let l = 0; l < 4; l++) piece(S, new THREE.SphereGeometry(0.0028, 6, 4), '#8a4a28', x + Math.cos(l * 1.6) * 0.004, y + H - 0.006, z + Math.sin(l * 1.6) * 0.004);
    };
    [[-0.3, 0.31, '#ffd23f'], [-0.48, 0.2, '#b07cff'], [-0.22, 0.34, '#b07cff'], [-0.45, 0.32, '#ffd23f'], [-0.15, 0.3, '#ffd23f'], [-0.5, 0.08, '#ff7bb0']].forEach(([x, z, c], k) => ipe(x, z, c, k));
    [[-0.34, 0.36], [-0.25, 0.27], [-0.44, 0.12], [-0.38, 0.0]].forEach(([x, z], k) => buriti(x, z, k));
    for (const [x, z] of [[0.24, 0.34], [-0.06, 0.36], [0.3, 0.24]]) { const y = ground(x, z); piece(S, Cy(0.003, 0.03, 6), '#7a5a3a', x, y + 0.015, z); for (let l = 0; l < 3; l++) piece(S, new THREE.IcosahedronGeometry(0.022 - l * 0.004, 0), l % 2 ? '#46b07c' : '#3aa58c', x + (l - 1) * 0.006, y + 0.04 + l * 0.012, z, l); }
    for (const [x, z] of [[0.38, -0.3], [0.31, -0.33], [0.0, -0.31]]) {
      const y = ground(x, z), H = 0.09;
      for (let k = 0; k < 5; k++) piece(S, Cy(0.0032 - k * 0.0002, H / 5 + 0.001, 6), k % 2 ? '#8a6a48' : '#7a5a3a', x + k * 0.0025, y + (k + 0.5) * H / 5, z, 0, 0, -0.15);
      for (let l = 0; l < 7; l++) { const a = l / 7 * TAU, leaf = new THREE.BoxGeometry(0.04, 0.0018, 0.009); leaf.translate(0.02, 0, 0); piece(S, leaf, l % 2 ? '#3aa58c' : '#2f9b7a', x + 0.012, y + H, z, a, 0, -0.35); }
      for (let l = 0; l < 3; l++) piece(S, new THREE.SphereGeometry(0.003, 6, 4), '#6a4a22', x + 0.012 + Math.cos(l * 2) * 0.003, y + H - 0.004, z + Math.sin(l * 2) * 0.003);
    }
  }

  // Barreira de pedras entre o mangue e o mar: uma fileira de pedrinhas na beira da lama, com aberturas onde o rio e
  // os canais desaguam.
  {
    const mouths = [riverAt(shore(-0.23)) ? [riverAt(-0.36)[0], -0.36] : [-0.23, -0.36], ...CHANNELS.map(ch => ch[ch.length - 1])];
    for (let x = -0.54; x < 0.02; x += 0.009) {
      const z = shore(x) + 0.013 + Math.sin(x * 57) * 0.003;
      if (Math.hypot(x, z) > 0.56 || mouths.some(([mx, mz]) => Math.hypot(x - mx, z - mz) < 0.035)) continue;
      const r = 0.0045 + Math.abs(Math.sin(x * 91)) * 0.003;
      piece(S, new THREE.IcosahedronGeometry(r, 0).scale(1.2, 0.7, 1), ['#8a8577', '#9c9688', '#7d786b'][Math.floor(Math.abs(x) * 300) % 3], x, ground(x, z) + r * 0.45, z, x * 40);
      if (Math.sin(x * 33) > 0.5) piece(S, new THREE.IcosahedronGeometry(r * 0.7, 0), '#a8a294', x + 0.004, ground(x, z) + r * 0.9, z + 0.004, x * 17);
    }
  }

  // Lagoa das vitórias-régias: folhas redondas com a borda virada, flores rosadas e um sapo que pula de folha em folha.
  {
    const pads = [[0.02, -0.07, 0.014], [0.07, -0.05, 0.012], [0.05, -0.09, 0.01], [0.08, -0.08, 0.009], [0.03, -0.035, 0.011]];
    pads.forEach(([x, z, r], k) => {
      const y = ground(x, z) + 0.0008;
      piece(S, Cy(r, 0.0008, 16), '#3a9a4a', x, y, z);
      piece(S, new THREE.TorusGeometry(r, 0.0009, 4, 16), '#c9473a', x, y + 0.0006, z, 0, Math.PI / 2);
      if (k % 2 === 0) { for (let l = 0; l < 6; l++) { const a = l / 6 * TAU; piece(S, new THREE.SphereGeometry(0.0022, 6, 4).scale(0.5, 0.9, 1), '#ffb7d5', x + Math.cos(a) * 0.002, y + 0.003, z + Math.sin(a) * 0.002, -a, 0, 0.5); } piece(S, new THREE.SphereGeometry(0.0013, 6, 4), '#ffd23f', x, y + 0.004, z); }
    });
    const frog = new THREE.Group(); g.add(frog); const FL = [];
    piece(FL, new THREE.SphereGeometry(0.003, 8, 6).scale(1.2, 0.8, 1), '#4fbf4a', 0, 0.002, 0);
    for (const s of [-1, 1]) { piece(FL, new THREE.SphereGeometry(0.0011, 6, 4), '#2a2e36', 0.002, 0.0042, s * 0.0016); piece(FL, Bx(0.004, 0.001, 0.0018), '#3aa03a', -0.0015, 0.0008, s * 0.003, s * 0.6); }
    frog.add(new THREE.Mesh(mergeGeometries(FL), vcMat));
    frog.userData.anim = t => {
      const c = Math.max(0, t) / 3, i = Math.floor(c) % pads.length, j = (i + 1) % pads.length, u = c % 1, hop = Math.max(0, (u - 0.75) / 0.25);
      const [x0, z0] = pads[i], [x1, z1] = pads[j], x = mix(x0, x1, hop), z = mix(z0, z1, hop);
      frog.position.set(x, ground(x, z) + 0.0015 + Math.sin(hop * Math.PI) * 0.012, z); frog.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    };
    animated.push(frog);
  }

  // Turbinas de vento no morro do lado da ferrovia: torre branca afinando, cabine e três pás com a ponta vermelha.
  for (const [x, z, sp] of [[0.36, 0.3, 0.8], [0.25, 0.38, 1], [0.44, 0.19, 0.9]]) {
    const y = ground(x, z), H = 0.14;
    piece(S, Cy(0.0032, H, 8, 0.0065), '#f4f4f8', x, y + H / 2, z);
    piece(S, Cy(0.009, 0.004, 8), '#c9d0de', x, y + 0.002, z);
    piece(S, new THREE.CapsuleGeometry(0.0045, 0.012, 3, 8).rotateX(Math.PI / 2), '#f4f4f8', x, y + H, z - 0.002);
    const rotor = new THREE.Group(); rotor.position.set(x, y + H, z + 0.009); g.add(rotor);
    const RL = [paint(new THREE.SphereGeometry(0.004, 8, 6), '#e9ecf5')];
    for (let b = 0; b < 3; b++) { const blade = new THREE.BoxGeometry(0.005, 0.066, 0.0014); blade.translate(0, 0.035, 0); blade.rotateZ(b * TAU / 3); RL.push(paint(blade, '#f4f4f8')); const tipG = new THREE.BoxGeometry(0.0052, 0.008, 0.0016); tipG.translate(0, 0.065, 0); tipG.rotateZ(b * TAU / 3); RL.push(paint(tipG, '#e8452f')); }
    rotor.add(new THREE.Mesh(mergeGeometries(RL), vcMat));
    rotor.userData.anim = t => { rotor.rotation.z = t * sp; }; animated.push(rotor);
  }

  // Passarela de madeira: tábuas com junta escura, guarda-corpo dos dois lados e palafitas quando passa sobre a lama
  // e a areia (fica mais alta ali); no gramado ela fica rente ao chão.
  {
    const curve = new THREE.CatmullRomCurve3(WALK.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    const n = 260, pts = curve.getSpacedPoints(n), Wd = 0.0085;
    const wet = (x, z) => inMud(x, z) || z < shore(x) + 0.12;
    const lift = pts.map(p => (wet(p.x, p.z) ? 0.011 : 0.004));
    for (let k = 0; k < 6; k++) for (let i = 0; i < n; i++) lift[i] = (lift[(i + n - 1) % n] + lift[i] + lift[(i + 1) % n]) / 3;
    eco.path = pts.slice(0, n).concat([pts[0]]).map((p, k) => new THREE.Vector3(p.x, ground(p.x, p.z) + lift[k % n], p.z));
    eco.cum = [0]; for (let k = 1; k < eco.path.length; k++) eco.cum.push(eco.cum[k - 1] + eco.path[k].distanceTo(eco.path[k - 1]));
    eco.L = eco.cum[eco.cum.length - 1];
    for (const key of ['cachoeira', 'mirante', 'caranguejo', 'tartaruga', 'viveiro', 'centro']) {
      const [sx, sz] = ST[key]; let bi = 0, bd = 9; eco.path.forEach((p, k) => { const d = Math.hypot(p.x - sx, p.z - sz); if (d < bd) { bd = d; bi = k; } });
      eco.stations.push({ key, name: FACTS[key][0], fact: FACTS[key][1], s: key === 'centro' ? eco.L - 0.06 : eco.cum[bi], look: new THREE.Vector3(sx, ground(sx, sz) + (key === 'cachoeira' ? 0.035 : 0.022), sz) });
    }
    eco.stations.sort((a, b) => a.s - b.s);
    const pos = [], uv = [], idx = []; let acc = 0;
    const T = i => { const a = pts[(i + n - 1) % n], b = pts[(i + 1) % n]; return Math.atan2(b.z - a.z, b.x - a.x); };
    for (let i = 0; i <= n; i++) {
      const k = i % n, p = pts[k], h = T(k), nx = -Math.sin(h), nz = Math.cos(h), y = ground(p.x, p.z) + lift[k];
      if (i) acc += pts[k].distanceTo(pts[(k + n - 1) % n]);
      for (const s of [-1, 1]) { const x = p.x + nx * Wd * s, z = p.z + nz * Wd * s; pos.push(x, y, z); uv.push((s + 1) / 2, acc / 0.012); }
      if (i < n) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const deck = new THREE.BufferGeometry(); deck.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); deck.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); deck.setIndex(idx); deck.computeVertexNormals();
    const wood = canvasTex(64, 64, (x, w, hh) => {
      x.fillStyle = '#b98a57'; x.fillRect(0, 0, w, hh);
      for (let r = 0; r < 4; r++) { x.fillStyle = r % 2 ? '#a77a4a' : '#c4935e'; x.fillRect(0, r * 16 + 1, w, 14); x.fillStyle = 'rgba(70,40,20,.5)'; x.fillRect(0, r * 16, w, 1.5); }
      x.fillStyle = 'rgba(70,40,20,.25)'; for (let i = 0; i < 40; i++) x.fillRect(R() * w, R() * hh, 6, 0.8);
    });
    wood.wrapT = THREE.RepeatWrapping; wood.anisotropy = 8;
    g.add(new THREE.Mesh(deck, new THREE.MeshStandardMaterial({ map: wood, roughness: 0.85, side: THREE.DoubleSide })));
    for (let i = 0; i < n; i += 3) {
      const p = pts[i], h = T(i), nx = -Math.sin(h), nz = Math.cos(h), y = ground(p.x, p.z) + lift[i];
      for (const s of [-1, 1]) {
        const x = p.x + nx * (Wd - 0.0008) * s, z = p.z + nz * (Wd - 0.0008) * s;
        piece(S, Bx(0.0014, 0.0075, 0.0014), '#8a6440', x, y + 0.00375, z, -h);
        if (lift[i] > 0.006 && i % 6 === 0) piece(S, Cy(0.0012, lift[i] + 0.004, 5), '#6a4e33', x, y - (lift[i] + 0.004) / 2, z);
      }
    }
    for (const s of [-1, 1]) {
      const rail = [];
      for (let i = 0; i <= n; i++) { const k = i % n, p = pts[k], h = T(k), nx = -Math.sin(h), nz = Math.cos(h); rail.push(new THREE.Vector3(p.x + nx * (Wd - 0.0008) * s, ground(p.x, p.z) + lift[k] + 0.0075, p.z + nz * (Wd - 0.0008) * s)); }
      piece(S, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail, true), n, 0.0009, 4, true), '#d9b98a', 0, 0, 0);
    }
  }

  // Ponte de madeira em arco sobre o rio e píer até o mar, com a canoa.
  {
    const rv = riverAt(0.12), bx = rv[0], bz = 0.12, by = ground(bx, bz), span = rv[1] + 0.03;
    for (let k = 0; k <= 8; k++) { const u = k / 8 - 0.5, y = by + 0.006 + Math.cos(u * Math.PI) * 0.008; piece(S, Bx(span / 8.5, 0.0018, 0.016), k % 2 ? '#b98a57' : '#a77a4a', bx + u * span, y, bz); }
    for (const s of [-1, 1]) { const r = []; for (let k = 0; k <= 8; k++) { const u = k / 8 - 0.5; r.push(new THREE.Vector3(bx + u * span, by + 0.014 + Math.cos(u * Math.PI) * 0.008, bz + s * 0.0075)); } piece(S, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(r), 12, 0.0009, 4), '#d9b98a', 0, 0, 0); }
    const x0 = 0.08, z0 = shore(0.08) + 0.02, z1 = z0 - 0.13;
    for (let k = 0; k <= 10; k++) {
      const z = z0 + (z1 - z0) * k / 10, y = ground(x0, z0) + 0.009;
      piece(S, Bx(0.016, 0.0018, (z0 - z1) / 10 * 1.02), k % 2 ? '#b98a57' : '#a77a4a', x0, y, z);
      if (k % 3 === 0) for (const s of [-1, 1]) piece(S, Cy(0.0013, 0.03, 5), '#6a4e33', x0 + s * 0.007, y - 0.012, z);
    }
    const boat = new THREE.Group(); boat.position.set(x0 + 0.022, ground(x0, z1) + 0.002, z1 + 0.01); g.add(boat);
    const BS = [], hull = new THREE.CylinderGeometry(0.008, 0.005, 0.045, 10, 1, false, 0, Math.PI); hull.rotateZ(Math.PI / 2); hull.rotateX(Math.PI / 2); hull.scale(1, 0.7, 1);
    piece(BS, hull, '#c9473a', 0, 0.004, 0, Math.PI / 2); piece(BS, Bx(0.042, 0.0012, 0.0042), '#f4efe2', 0, 0.0065, 0, Math.PI / 2);
    for (const z of [-0.008, 0.008]) piece(BS, Bx(0.009, 0.0012, 0.003), '#8a6440', 0, 0.006, z, Math.PI / 2);
    boat.add(new THREE.Mesh(mergeGeometries(BS), vcMat));
    boat.userData.anim = t => { boat.position.y = ground(x0, z1) + 0.002 + Math.sin(t * 1.6) * 0.0015; boat.rotation.z = Math.sin(t * 1.1) * 0.06; };
    animated.push(boat);
  }

  // Mirante dos guarás: torre de madeira de dois andares com escada, telhado de palha e binóculo, na beira do mangue.
  {
    const [mx, mz] = ST.mirante, y0 = ground(mx, mz), H = 0.07;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piece(S, Bx(0.003, H, 0.003), '#7a5a3a', mx + dx * 0.013, y0 + H / 2, mz + dz * 0.013);
    for (const hh of [0.035, H]) { piece(S, Bx(0.032, 0.003, 0.032), '#b98a57', mx, y0 + hh, mz); for (const [dx, dz, ry] of [[0, -1, 0], [0, 1, 0], [-1, 0, Math.PI / 2], [1, 0, Math.PI / 2]]) piece(S, Bx(0.03, 0.0012, 0.0012), '#d9b98a', mx + dx * 0.015, y0 + hh + 0.007, mz + dz * 0.015, ry); }
    for (let k = 0; k < 6; k++) piece(S, Bx(0.008, 0.0012, 0.004), '#a77a4a', mx + 0.02, y0 + 0.004 + k * 0.0055, mz - 0.01 + k * 0.004, 0, -0.6);
    const roof = new THREE.ConeGeometry(0.03, 0.022, 4); roof.rotateY(Math.PI / 4); piece(S, roof, '#c9a25e', mx, y0 + H + 0.024, mz);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) piece(S, Bx(0.0025, 0.012, 0.0025), '#7a5a3a', mx + dx * 0.013, y0 + H + 0.007, mz + dz * 0.013);
    piece(S, Cy(0.0016, 0.006, 6), '#3a3f4a', mx - 0.006, y0 + H + 0.008, mz + 0.012, 0, Math.PI / 2);
  }

  // Praia das tartarugas: ninhos protegidos na areia (estacas e corda), placa e uma tartaruga-verde nadando.
  const nests = [[0.13, -0.315], [0.19, -0.33], [0.25, -0.315], [0.21, -0.3]];
  {
    for (const [nx, nz] of nests) {
      const y = ground(nx, nz); piece(S, Cy(0.009, 0.0016, 12), '#e3cf98', nx, y + 0.0008, nz);
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.6; piece(S, Bx(0.0012, 0.009, 0.0012), '#8a6440', nx + Math.cos(a) * 0.011, y + 0.0045, nz + Math.sin(a) * 0.011); }
      for (let k = 0; k < 4; k++) { const a = k / 4 * TAU + 0.6 + Math.PI / 4; piece(S, Bx(0.0155, 0.0006, 0.0006), '#ff8a3c', nx + Math.cos(a) * 0.0078, y + 0.007, nz + Math.sin(a) * 0.0078, -a + Math.PI / 2); }
    }
    const sx = 0.16, sz = -0.285, sy = ground(sx, sz);
    piece(S, Bx(0.002, 0.016, 0.002), '#7a5a3a', sx, sy + 0.008, sz);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.024, 0.012), signMat(128, 64, (x, w, h) => { x.fillStyle = '#f4efe2'; x.fillRect(0, 0, w, h); x.strokeStyle = '#3aa58c'; x.lineWidth = 5; x.strokeRect(2.5, 2.5, w - 5, h - 5); x.font = '700 15px Arial, sans-serif'; x.textAlign = 'center'; x.fillStyle = '#2c6e4c'; x.fillText('NINHOS DE', w / 2, 26); x.fillText('TARTARUGA', w / 2, 46); }));
    sign.position.set(sx, sy + 0.019, sz + 0.0012); sign.userData.keep = true; g.add(sign);
    const turtle = new THREE.Group(); g.add(turtle); const TS = [];
    piece(TS, new THREE.SphereGeometry(0.011, 10, 6, 0, TAU, 0, Math.PI / 2).scale(1.2, 0.5, 1), '#5a7a3a', 0, 0, 0);
    for (let k = 0; k < 5; k++) piece(TS, Cy(0.0035, 0.0012, 6), '#7a9a52', Math.cos(k * 1.256) * 0.006, 0.004, Math.sin(k * 1.256) * 0.005);
    piece(TS, new THREE.SphereGeometry(0.0035, 8, 6), '#8aa868', 0.015, 0.001, 0);
    for (const [fx, fz] of [[0.007, 1], [0.007, -1], [-0.009, 1], [-0.009, -1]]) piece(TS, Bx(0.008, 0.0012, 0.004), '#8aa868', fx, 0, fz * 0.011, fz * 0.4);
    turtle.add(new THREE.Mesh(mergeGeometries(TS), vcMat));
    turtle.userData.anim = t => { const a = t * 0.25, x = 0.22 + Math.cos(a) * 0.08, z = -0.46 + Math.sin(a) * 0.03; turtle.position.set(x, ground(x, z) - 0.0015, z); turtle.rotation.y = -a - Math.PI / 2; };
    animated.push(turtle);
  }

  // Viveiro de mudas: estufa de madeira com tela de sombreamento e bancadas com bandejas; as mudas plantadas crescem
  // no canteiro de replantio, na beira do banhado.
  const planted = [];
  {
    const [vx, vz] = ST.viveiro, y0 = ground(vx, vz), Wv = 0.07, Dv = 0.05, Hv = 0.032;
    piece(S, Bx(Wv + 0.008, 0.003, Dv + 0.008), '#c9b48a', vx, y0 + 0.0015, vz);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) piece(S, Bx(0.0025, Hv, 0.0025), '#8a6440', vx + dx * Wv / 2, y0 + Hv / 2, vz + dz * Dv / 2);
    piece(S, Bx(Wv + 0.004, 0.0025, 0.0025), '#8a6440', vx, y0 + Hv, vz - Dv / 2); piece(S, Bx(Wv + 0.004, 0.0025, 0.0025), '#8a6440', vx, y0 + Hv, vz + Dv / 2);
    const net = new THREE.Mesh(new THREE.BoxGeometry(Wv, 0.0015, Dv), new THREE.MeshStandardMaterial({ color: '#2f8f5a', transparent: true, opacity: 0.55, roughness: 0.9 }));
    net.position.set(vx, y0 + Hv + 0.001, vz); g.add(net);
    const trays = [];
    for (const dz of [-0.013, 0.013]) {
      piece(S, Bx(Wv - 0.012, 0.0025, 0.014), '#a77a4a', vx, y0 + 0.012, vz + dz);
      for (const dx of [-0.02, 0.02]) piece(S, Bx(0.0018, 0.012, 0.0018), '#7a5a3a', vx + dx, y0 + 0.006, vz + dz);
      for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) trays.push([vx - 0.022 + i * 0.0063, y0 + 0.0137, vz + dz - 0.003 + j * 0.006]);
    }
    const sprout = mergeGeometries([paint(Cy(0.0022, 0.0022, 6).translate(0, 0.0011, 0), '#3a2a1a'), paint(Bx(0.0006, 0.004, 0.0006).translate(0, 0.004, 0), '#3a8a3a'), paint(new THREE.SphereGeometry(0.0018, 6, 4).scale(1, 0.6, 1).translate(0, 0.0062, 0), '#5ac46a')]);
    const sp = new THREE.InstancedMesh(sprout, vcMat, trays.length); trays.forEach(([x, y, z], i) => sp.setMatrixAt(i, _m.makeTranslation(x, y, z))); g.add(sp);
    const vsign = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.011), signMat(160, 44, (x, w, h) => { x.fillStyle = '#2c6e4c'; x.fillRect(0, 0, w, h); x.font = '700 20px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.fillText('VIVEIRO DE MUDAS', w / 2, h / 2 + 1); }));
    vsign.position.set(vx - Wv / 2 - 0.0015, y0 + Hv + 0.009, vz); vsign.rotation.y = -Math.PI / 2; vsign.userData.keep = true; g.add(vsign);
    for (let k = 0; k < 12; k++) { const x = -0.12 + (k % 6) * 0.016 + (R() - 0.5) * 0.006, z = -0.12 + Math.floor(k / 6) * 0.025 + (R() - 0.5) * 0.006; planted.push({ x, z, at: -1 }); }
  }

  // Centro de visitantes: pavilhão redondo de vidro com teto verde florido, painéis solares no beiral, deque, letreiro
  // e visitantes com óculos VR (visitas a lugares preservados sem sair da sala).
  {
    const [cx, cz] = ST.centro, y0 = ground(cx, cz);
    piece(S, Cy(0.07, 0.004, 28), '#b98a57', cx, y0 + 0.002, cz);
    piece(S, Cy(0.052, 0.006, 28), '#e9ecf5', cx, y0 + 0.007, cz);
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.046, 0.026, 28, 1, true), new THREE.MeshStandardMaterial({ color: '#9fd8e8', transparent: true, opacity: 0.45, roughness: 0.15, metalness: 0.2, side: THREE.DoubleSide }));
    glass.position.set(cx, y0 + 0.023, cz); g.add(glass);
    for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; piece(S, Bx(0.0025, 0.026, 0.0025), '#e9ecf5', cx + Math.cos(a) * 0.046, y0 + 0.023, cz + Math.sin(a) * 0.046); }
    piece(S, Cy(0.056, 0.004, 28), '#e9ecf5', cx, y0 + 0.038, cz);
    const dome = new THREE.SphereGeometry(0.054, 20, 8, 0, TAU, 0, Math.PI / 2); dome.scale(1, 0.38, 1); piece(S, dome, '#5aa864', cx, y0 + 0.04, cz);
    const fl = ['#ffd23f', '#ff7bb0', '#ffffff', '#b07cff'];
    for (let k = 0; k < 26; k++) { const a = R() * TAU, r = Math.sqrt(R()) * 0.045, yy = Math.sqrt(Math.max(0, 1 - (r / 0.054) ** 2)) * 0.054 * 0.38; piece(S, new THREE.SphereGeometry(0.0022, 5, 4), fl[k % 4], cx + Math.cos(a) * r, y0 + 0.04 + yy, cz + Math.sin(a) * r); }
    for (let k = 0; k < 8; k++) { const a = Math.PI * 0.15 + k / 8 * Math.PI * 0.7; piece(S, Bx(0.014, 0.0012, 0.01), '#1e4488', cx + Math.cos(a) * 0.062, y0 + 0.037, cz + Math.sin(a) * 0.062, -a, 0.35); }
    piece(S, Bx(0.03, 0.002, 0.016), '#e9ecf5', cx, y0 + 0.028, cz - 0.054);
    for (const s of [-1, 1]) piece(S, Bx(0.002, 0.024, 0.002), '#e9ecf5', cx + s * 0.013, y0 + 0.016, cz - 0.06);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.013), signMat(320, 60, (x, w, h) => { x.fillStyle = '#2c6e4c'; x.fillRect(0, 0, w, h); x.fillStyle = '#3ee0b5'; x.fillRect(0, h - 4, w, 4); x.font = '700 22px Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#ffffff'; x.fillText('CENTRO DE VISITANTES', w / 2, h / 2); }));
    sign.position.set(cx, y0 + 0.033, cz - 0.0625); sign.rotation.y = Math.PI; sign.userData.keep = true; g.add(sign);
    piece(G, Cy(0.0465, 0.0016, 28), '#7fe9d2', cx, y0 + 0.0105, cz);
    const spots = [[cx - 0.018, cz - 0.008], [cx + 0.016, cz - 0.012], [cx + 0.004, cz + 0.016], [cx - 0.02, cz + 0.014]];
    crowd(g, spots.map(([x, z]) => [x, z, y0 + 0.01]), zi, ['#ff8a6b', '#3ee0b5', '#ffc56b', '#b07cff'], { fx: () => -1 });
    for (const [x, z] of spots) { piece(S, Bx(0.0085, 0.0045, 0.0075), '#15161c', x, y0 + 0.0268, z); piece(G, Bx(0.0088, 0.0026, 0.0078), '#00b7e3', x, y0 + 0.0268, z + 0.0004); }
  }

  // Placas das estações ao longo da passarela (poste de madeira e placa com o número e o nome).
  [['1', 'CACHOEIRA E BOSQUE', -0.3, 0.255], ['2', 'MIRANTE DOS GUARÁS', -0.13, -0.11], ['3', 'CARANGUEJO-UÇÁ', -0.11, -0.235], ['4', 'PRAIA DAS TARTARUGAS', 0.12, -0.215], ['5', 'VIVEIRO DE MUDAS', 0.36, -0.03], ['6', 'CENTRO DE VISITANTES', 0.15, 0.17]].forEach(([n, name, x, z]) => {
    const y = ground(x, z); piece(S, Bx(0.0018, 0.018, 0.0018), '#7a5a3a', x, y + 0.009, z);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.009), signMat(200, 60, (c, w, h) => {
      c.fillStyle = '#f4efe2'; c.fillRect(0, 0, w, h); c.fillStyle = '#2c6e4c'; c.beginPath(); c.arc(30, h / 2, 22, 0, TAU); c.fill();
      c.font = '700 26px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffffff'; c.fillText(n, 30, h / 2 + 1);
      c.font = '700 14px Arial, sans-serif'; c.textAlign = 'left'; c.fillStyle = '#2c6e4c'; c.fillText(name, 58, h / 2 + 1);
    }));
    m.material.side = THREE.DoubleSide; m.position.set(x, y + 0.02, z); m.rotation.y = Math.atan2(-x, -z) + Math.PI; m.userData.keep = true; g.add(m);
  });

  g.add(new THREE.Mesh(mergeGeometries(S), vcMat), new THREE.Mesh(mergeGeometries(G), glowMat));

  // Guarás: corpo afilado, pescoço comprido em curva, bico longo e curvo, pernas finas e asas de duas partes com a
  // ponta preta. Pousados nas copas do mangue; quatro voam sempre, alternando batidas e planeio e inclinando nas
  // curvas sobre o estuário; ao chamar (clique no mirante ou começo da Expedição), o bando decola um a um, dá a volta
  // e volta a pousar.
  {
    const NB = 18;
    const body = mergeGeometries([
      paint(new THREE.SphereGeometry(0.0045, 10, 6).scale(1.7, 0.85, 0.85), '#ec4a35'),
      paint(new THREE.ConeGeometry(0.0025, 0.007, 6).rotateZ(Math.PI / 2).translate(-0.0095, 0.0005, 0), '#e8452f'),
      paint(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.006, 0.001, 0), new THREE.Vector3(0.0095, 0.004, 0), new THREE.Vector3(0.0115, 0.006, 0)]), 6, 0.0012, 5), '#ec4a35'),
      paint(new THREE.SphereGeometry(0.0019, 8, 6).translate(0.0122, 0.0068, 0), '#ec4a35'),
      paint(new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.0135, 0.0068, 0), new THREE.Vector3(0.018, 0.0062, 0), new THREE.Vector3(0.0205, 0.0035, 0)), 6, 0.00055, 4), '#2a1a14'),
      paint(new THREE.SphereGeometry(0.0005, 4, 3).translate(0.0128, 0.0075, 0.0013), '#15161c'), paint(new THREE.SphereGeometry(0.0005, 4, 3).translate(0.0128, 0.0075, -0.0013), '#15161c'),
      paint(Cy(0.0004, 0.008, 4).translate(-0.001, -0.0055, 0.0012), '#c9473a'), paint(Cy(0.0004, 0.008, 4).translate(-0.001, -0.0055, -0.0012), '#c9473a')
    ]);
    const inner = paint(new THREE.BoxGeometry(0.008, 0.0011, 0.009).translate(0, 0, 0.0045), '#d63a28');
    const outer = mergeGeometries([paint(new THREE.BoxGeometry(0.007, 0.001, 0.008).translate(0, 0, 0.004), '#e34a33'), paint(new THREE.BoxGeometry(0.0045, 0.0011, 0.004).translate(0.0012, 0, 0.0075), '#1f1612')]);
    const bodies = new THREE.InstancedMesh(body, vcMat, NB), inW = new THREE.InstancedMesh(inner, vcMat, NB * 2), outW = new THREE.InstancedMesh(outer, vcMat, NB * 2);
    for (const m of [bodies, inW, outW]) { m.frustumCulled = false; m.userData.keep = true; g.add(m); }
    const birds = Array.from({ length: NB }, (_, k) => ({ perch: crowns[k % crowns.length], a0: k / NB * TAU, r: 0.13 + (k % 3) * 0.035, h: 0.12 + (k % 4) * 0.018, sp: 0.42 + (k % 3) * 0.06, delay: k * 0.12, ph: R() * TAU }));
    const mir = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.1, 0.045), new THREE.MeshBasicMaterial({ visible: false }));
    mir.position.set(ST.mirante[0], ground(...ST.mirante) + 0.05, ST.mirante[1]); g.add(mir); toys.push(mir);
    const M2 = new THREE.Matrix4(), M3 = new THREE.Matrix4(), M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3();
    const CX = -0.24, CZ = -0.2;
    bodies.userData.anim = t => {
      // Decolam com o botão Soltar os guarás, com o clique no mirante ou no começo da Expedição (o mais recente vale).
      const ages = [fxT(zi), fxT4(zi), t - (mir.userData.kick ?? -99)].filter(v => v >= 0), f = ages.length ? Math.min(...ages) : -1;
      birds.forEach((o, k) => {
        const e = f - o.delay, up = k < 4 ? 1 : f < 0 || e < 0 || f > 16 ? 0 : smooth(0, 1.6, e) * (1 - smooth(13, 15.5, f));
        const a = o.a0 + t * o.sp, wob = Math.sin(t * 0.7 + k) * 0.02, [px, py, pz] = o.perch;
        const fx = CX + Math.cos(a) * (o.r + wob), fz = CZ + Math.sin(a) * (o.r * 0.75 + wob), fy = py + o.h + Math.sin(t * 1.1 + k) * 0.012;
        const x = mix(px, fx, up), y = mix(py, fy, up) + Math.sin(Math.PI * up) * 0.03, z = mix(pz, fz, up);
        const flying = up > 0.02, yaw = flying ? -a - Math.PI / 2 : -o.a0, bank = flying ? 0.35 : 0;
        // Batida rápida na decolagem; no ar, alterna batidas e planeio. Pousado, as asas ficam fechadas junto ao corpo.
        const glide = flying ? smooth(0.3, 0.6, Math.sin(t * 0.9 + o.ph)) : 0, flap = flying ? Math.sin(t * 12 + k) * 0.9 * (1 - glide) + 0.12 * glide : -1.3;
        Q.setFromEuler(E.set(bank, yaw, flying ? 0 : 0.1, 'YXZ')); M2.compose(P.set(x, y, z), Q, ONE); bodies.setMatrixAt(k, M2);
        for (const s of [0, 1]) {
          const rootA = s ? Math.PI - flap * 0.8 : flap * 0.8, tipA = flap * 0.6 * (s ? -1 : 1);
          M3.makeTranslation(0, 0.0015, 0).multiply(M4.makeRotationX(rootA)); inW.setMatrixAt(k * 2 + s, _m.multiplyMatrices(M2, M3));
          M3.multiply(M4.makeTranslation(0, 0, 0.009)).multiply(M4.makeRotationX(tipA)); outW.setMatrixAt(k * 2 + s, _m.multiplyMatrices(M2, M3));
        }
      });
      bodies.instanceMatrix.needsUpdate = true; inW.instanceMatrix.needsUpdate = true; outW.instanceMatrix.needsUpdate = true;
    };
    animated.push(bodies);
  }

  // Caranguejos-uçá no banhado: andam de lado entre as tocas e de vez em quando se escondem (descem na toca).
  {
    const crab = mergeGeometries([
      paint(new THREE.SphereGeometry(0.004, 8, 5).scale(1.3, 0.55, 1), '#2f6f9a'),
      paint(new THREE.SphereGeometry(0.0022, 6, 4).translate(0.0045, 0.0005, 0.0042), '#e8743a'), paint(new THREE.SphereGeometry(0.0022, 6, 4).translate(0.0045, 0.0005, -0.0042), '#e8743a'),
      paint(Cy(0.0005, 0.003, 4).translate(0.003, 0.0025, 0.0015), '#2a1a14'), paint(Cy(0.0005, 0.003, 4).translate(0.003, 0.0025, -0.0015), '#2a1a14'),
      ...[-1, 1].flatMap(s => [-0.002, 0, 0.002].map(dx => paint(Bx(0.0008, 0.0008, 0.005).rotateX(s * 0.6).translate(dx, -0.0008, s * 0.0045), '#c96a34')))
    ]);
    const NC = 16, crabs = new THREE.InstancedMesh(crab, vcMat, NC); crabs.frustumCulled = false; crabs.userData.detail = true; g.add(crabs);
    const [cx, cz] = ST.caranguejo, cs = Array.from({ length: NC }, () => ({ x: cx + (R() - 0.5) * 0.13, z: cz + (R() - 0.5) * 0.06, ph: R() * TAU, sp: 0.5 + R() * 0.6 }));
    crabs.userData.anim = t => {
      cs.forEach((c, k) => { const walk = Math.sin(t * c.sp + c.ph) * 0.012, x = c.x + walk, z = c.z, hide = smooth(0.85, 0.98, Math.sin(t * 0.4 + c.ph * 2)); crabs.setMatrixAt(k, _m.makeRotationY(c.ph).setPosition(x, ground(x, z) + 0.0018 - hide * 0.006, z)); });
      crabs.instanceMatrix.needsUpdate = true;
    };
    animated.push(crabs);
  }

  // Filhotes de tartaruga: escondidos nos ninhos; ao soltar, saem e correm até o mar e somem nas ondas.
  {
    const hatch = mergeGeometries([paint(new THREE.SphereGeometry(0.0024, 8, 5, 0, TAU, 0, Math.PI / 2).scale(1.2, 0.6, 1), '#3f5a2a'), paint(new THREE.SphereGeometry(0.0011, 6, 4).translate(0.003, 0.0004, 0), '#5a7a3a'), ...[-1, 1].map(s => paint(Bx(0.0025, 0.0005, 0.0012).translate(0.0008, 0, s * 0.0026), '#5a7a3a'))]);
    const NH = 16, hs = new THREE.InstancedMesh(hatch, vcMat, NH); hs.frustumCulled = false; hs.userData.keep = true; g.add(hs);
    const runs = Array.from({ length: NH }, (_, k) => { const [nx, nz] = nests[k % nests.length]; return { nx: nx + (R() - 0.5) * 0.006, nz: nz + (R() - 0.5) * 0.006, delay: R() * 1.5, sp: 0.06 + R() * 0.03, wob: R() * TAU }; });
    hs.userData.anim = t => {
      const f = fxT3(zi);
      runs.forEach((o, k) => {
        const e = f - o.delay; if (f < 0 || e < 0 || e > 9) { hs.setMatrixAt(k, ZERO); return; }
        const tz = shore(o.nx) - 0.03, z = Math.max(tz, o.nz - e * o.sp * 0.5), x = o.nx + Math.sin(e * 6 + o.wob) * 0.002, out = smooth(tz + 0.01, tz, z), sc = (1 - out) * Math.min(1, e * 3);
        hs.setMatrixAt(k, _m.makeRotationY(Math.PI / 2 + Math.sin(e * 10 + o.wob) * 0.25).scale(_p.set(sc, sc, sc)).setPosition(x, ground(x, z) + 0.0015, z));
      });
      hs.instanceMatrix.needsUpdate = true;
    };
    animated.push(hs);
  }

  // Mudas do replantio: cada clique no viveiro planta mais três, que brotam e crescem na beira do banhado.
  {
    const sap = mergeGeometries([paint(Cy(0.001, 0.016, 5).translate(0, 0.008, 0), '#6a4e33'), paint(new THREE.IcosahedronGeometry(0.0065, 0).scale(1, 0.7, 1).translate(0, 0.018, 0), '#3a9a5f'), paint(new THREE.IcosahedronGeometry(0.0045, 0).translate(0.003, 0.022, 0.002), '#4fb873')]);
    const saps = new THREE.InstancedMesh(sap, vcMat, planted.length); saps.frustumCulled = false; saps.userData.keep = true; g.add(saps);
    const hit = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.06), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(ST.viveiro[0], ground(...ST.viveiro) + 0.02, ST.viveiro[1]); g.add(hit); toys.push(hit);
    let lastKick = -9, next = 0;
    const plant = t => { for (let k = 0; k < 3; k++) { const p = planted[next % planted.length]; p.at = t + k * 0.25; next++; } };
    saps.userData.anim = t => {
      const kick = hit.userData.kick ?? -9; if (kick !== lastKick) { lastKick = kick; if (kick > 0) plant(t); }
      planted.forEach((p, k) => {
        if (p.at < 0 || t < p.at) { saps.setMatrixAt(k, ZERO); return; }
        const s = 0.2 + 0.8 * smooth(0, 2.2, t - p.at), sway = Math.sin(t * 1.5 + k) * 0.05;
        saps.setMatrixAt(k, _m.makeRotationZ(sway).scale(_p.set(s, s, s)).setPosition(p.x, ground(p.x, p.z), p.z));
      });
      saps.instanceMatrix.needsUpdate = true;
    };
    animated.push(saps);
  }

  // Peixe-boi-marinho nadando devagar no mar: sobe para respirar e afunda de novo (o dorso aparece na água).
  {
    const mg = new THREE.Group(); g.add(mg); const MS = [];
    piece(MS, new THREE.SphereGeometry(0.009, 12, 8).scale(2.3, 0.85, 1), '#8a98a4', 0, 0, 0);
    piece(MS, new THREE.SphereGeometry(0.006, 10, 6).scale(1, 0.85, 1), '#9aa8b2', 0.02, 0.001, 0);
    piece(MS, new THREE.SphereGeometry(0.009, 12, 6).scale(0.5, 0.18, 1), '#7a8894', -0.025, 0, 0);
    for (const s of [-1, 1]) piece(MS, new THREE.SphereGeometry(0.004, 6, 4).scale(1, 0.25, 1.6), '#7a8894', 0.01, -0.003, s * 0.008, s * 0.4);
    for (const s of [-1, 1]) piece(MS, new THREE.SphereGeometry(0.0009, 5, 4), '#2a2e36', 0.024, 0.003, s * 0.0028);
    mg.add(new THREE.Mesh(mergeGeometries(MS), vcMat));
    mg.userData.anim = t => { const a = t * 0.12, x = -0.05 + Math.cos(a) * 0.12, z = -0.47 + Math.sin(a) * 0.03, dip = Math.sin(t * 0.7) * 0.5 + 0.5; mg.position.set(x, ground(x, z) - 0.009 + dip * 0.0045, z); mg.rotation.set(0, -a - Math.PI / 2, Math.sin(t * 0.7) * 0.08); };
    animated.push(mg);
  }
  // Garças-brancas pescando na lama e na beira do rio: de tempos em tempos baixam a cabeça na água.
  for (const [gx, gz, ph] of [[-0.18, -0.12, 0], [-0.33, -0.3, 2], [-0.36, 0.1, 4], [-0.06, -0.33, 1]]) {
    const eg = new THREE.Group(); eg.position.set(gx, ground(gx, gz), gz); eg.rotation.y = ph; g.add(eg);
    const BL = [], NL = [];
    piece(BL, new THREE.SphereGeometry(0.0045, 8, 6).scale(1.6, 0.9, 0.9), '#f6f6f2', 0, 0.016, 0);
    for (const s of [-1, 1]) piece(BL, Cy(0.0005, 0.013, 4), '#2a2e36', -0.001, 0.0065, s * 0.0015);
    piece(BL, Bx(0.006, 0.0012, 0.0045), '#e9e9e2', -0.008, 0.017, 0, 0, 0, -0.4);
    piece(NL, Cy(0.001, 0.011, 5), '#f6f6f2', 0, 0.0055, 0, 0, 0, -0.35);
    piece(NL, new THREE.SphereGeometry(0.0022, 6, 4), '#f6f6f2', 0.002, 0.012, 0);
    piece(NL, new THREE.ConeGeometry(0.0007, 0.006, 4), '#f2c230', 0.0055, 0.0118, 0, 0, 0, -Math.PI / 2);
    eg.add(new THREE.Mesh(mergeGeometries(BL), vcMat));
    const neck = new THREE.Mesh(mergeGeometries(NL), vcMat); neck.position.set(0.006, 0.018, 0); eg.add(neck);
    neck.userData.anim = t => { const c = (t + ph * 3) % 7, d = c > 5.5 ? Math.sin((c - 5.5) / 1.5 * Math.PI) : 0; neck.rotation.z = -d * 1.6; };
    animated.push(neck);
  }
  // Peixinhos pulando no rio e nos canais: de vez em quando um sai da água num arco e mergulha de novo.
  {
    const fish = mergeGeometries([paint(new THREE.SphereGeometry(0.002, 6, 4).scale(2, 0.8, 0.7), '#c9d6e3'), paint(new THREE.ConeGeometry(0.0016, 0.003, 4).rotateZ(Math.PI / 2).translate(-0.005, 0, 0), '#9fb2c6')]);
    const fm = new THREE.InstancedMesh(fish, vcMat, 5); fm.frustumCulled = false; fm.userData.detail = true; g.add(fm);
    const jumps = [[-0.3, -0.04], [-0.27, -0.16], [-0.36, -0.24], [-0.16, -0.31], [-0.36, 0.17]].map(([x, z], k) => ({ x, z, ph: k * 1.7, ry: R() * TAU }));
    fm.userData.anim = t => {
      jumps.forEach((j, k) => {
        const c = (t + j.ph) % 4.5; if (c > 0.7) { fm.setMatrixAt(k, ZERO); return; }
        const u = c / 0.7, x = j.x + Math.cos(j.ry) * (u - 0.5) * 0.02, z = j.z + Math.sin(j.ry) * (u - 0.5) * 0.02, y = ground(x, z) + Math.sin(u * Math.PI) * 0.014;
        fm.setMatrixAt(k, _m.makeRotationFromEuler(_e.set(0, -j.ry, (0.5 - u) * 2.4)).setPosition(x, y, z));
      });
      fm.instanceMatrix.needsUpdate = true;
    };
    animated.push(fm);
  }
  // Borboletas coloridas voando sobre o campo florido (asas que abrem e fecham).
  {
    const wing = paint(new THREE.CircleGeometry(0.004, 6).rotateX(-Math.PI / 2).translate(0, 0, 0.004), '#ffffff');
    const NBF = 10, bf = new THREE.InstancedMesh(wing, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false }), NBF * 2);
    const cols = ['#ffd23f', '#ff7bb0', '#7fe9ff', '#ff8a3c', '#b07cff'].map(h => new THREE.Color(h));
    for (let k = 0; k < NBF * 2; k++) bf.setColorAt(k, cols[Math.floor(k / 2) % cols.length]);
    bf.frustumCulled = false; bf.userData.detail = true; g.add(bf);
    const flies = Array.from({ length: NBF }, () => ({ x: -0.05 + R() * 0.35, z: -0.12 + R() * 0.32, r: 0.02 + R() * 0.03, sp: 0.6 + R() * 0.6, ph: R() * TAU }));
    bf.userData.anim = t => {
      flies.forEach((f, k) => {
        const a = t * f.sp + f.ph, x = f.x + Math.cos(a) * f.r, z = f.z + Math.sin(a * 1.3) * f.r, y = ground(x, z) + 0.016 + Math.sin(t * 3 + f.ph) * 0.005, flap = Math.abs(Math.sin(t * 16 + f.ph)) * 1.2;
        for (const s of [0, 1]) bf.setMatrixAt(k * 2 + s, _m.makeRotationFromEuler(_e.set(s ? Math.PI - flap : flap, -a, 0, 'YXZ')).setPosition(x, y, z));
      });
      bf.instanceMatrix.needsUpdate = true;
    };
    animated.push(bf);
  }

  // Lixo boiando para o minigame Limpe o mangue: garrafas PET, latas, sacolas e copos levados pela água no rio, nos
  // canais, na lagoa e no mar, por todo o mapa. Só aparecem durante o jogo; clicar recolhe (o lixo sobe girando e
  // some) e outro aparece em outro lugar.
  {
    const kinds = [
      () => mergeGeometries([paint(Cy(0.0026, 0.011, 8), '#a7dcf5'), paint(Cy(0.0013, 0.003, 6).translate(0, 0.007, 0), '#1f6fe0'), paint(Cy(0.00265, 0.004, 8), '#ffffff')]).rotateZ(Math.PI / 2),
      () => mergeGeometries([paint(Cy(0.0026, 0.0075, 10), '#d3263a'), paint(Cy(0.0027, 0.0018, 10), '#d9dde5')]).rotateZ(Math.PI / 2),
      () => paint(new THREE.IcosahedronGeometry(0.0045, 0).scale(1.3, 0.5, 1), '#f2f2f2'),
      () => mergeGeometries([paint(Cy(0.0034, 0.0075, 10, 0.0024), '#e8342f'), paint(new THREE.TorusGeometry(0.0034, 0.0005, 4, 12).rotateX(Math.PI / 2).translate(0, 0.0037, 0), '#ffffff')]).rotateX(1.2)
    ];
    const spots = [];
    for (let z = 0.2; z > -0.4; z -= 0.05) { const r = riverAt(z); if (r) spots.push([r[0], z]); }
    for (const ch of CHANNELS) for (let k = 0; k < ch.length - 1; k++) spots.push([(ch[k][0] + ch[k + 1][0]) / 2, (ch[k][1] + ch[k + 1][1]) / 2]);
    for (let k = 0; k < 4; k++) { const a = k / 4 * TAU; spots.push([POND.x + Math.cos(a) * POND.r * 0.55, POND.z + Math.sin(a) * POND.r * 0.55]); }
    for (let k = 0; k < 16; k++) { const x = -0.38 + k * 0.05, z = shore(x) - 0.03 - (k % 3) * 0.035; if (Math.hypot(x, z) < 0.55 && Math.hypot(x - 0.08, z + 0.42) > 0.04) spots.push([x, z]); }
    for (let k = spots.length - 1; k >= 0; k--) if (crowns.some(([cx, , cz]) => Math.hypot(spots[k][0] - cx, spots[k][1] - cz) < 0.03)) spots.splice(k, 1);
    const trashMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, flatShading: true });
    for (let k = 0; k < 12; k++) {
      const m = new THREE.Mesh(kinds[k % kinds.length]().scale(2.2, 2.2, 2.2), trashMat); m.visible = false; m.userData.keep = true; g.add(m);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.trash = m; m.add(hit);
      m.userData.trash = { spot: k, gone: -9, ph: R() * TAU };
      eco.trash.push(m);
    }
    const free = () => { const used = new Set(eco.trash.filter(m => m.visible).map(m => m.userData.trash.spot)); const opts = spots.map((_, k) => k).filter(k => !used.has(k)); return opts[Math.floor(R() * opts.length)] ?? 0; };
    eco.spawnAll = () => { eco.trash.forEach(m => { m.visible = false; }); eco.trash.forEach(m => { const d = m.userData.trash; d.spot = free(); d.gone = -9; m.scale.setScalar(1); m.visible = true; }); };
    eco.collect = (m, t) => { const d = m.userData.trash; if (d.gone > 0) return false; d.gone = t; return true; };
    eco.hide = () => eco.trash.forEach(m => { m.visible = false; });
    const tick = new THREE.Group(); g.add(tick);
    tick.userData.anim = t => {
      if (!eco.cleanOn) return;
      for (const m of eco.trash) {
        const d = m.userData.trash;
        if (d.gone > 0) {
          const e = t - d.gone;
          if (e < 0.5) { m.scale.setScalar(1 - e * 1.6); m.position.y += 0.0015; m.rotation.y += 0.4; continue; }
          if (e < 1.2) { m.visible = false; continue; }
          d.spot = free(); d.gone = -9; m.scale.setScalar(1); m.visible = true;
        }
        const [sx, sz] = spots[d.spot], x = sx + Math.sin(t * 0.5 + d.ph) * 0.006, z = sz + Math.cos(t * 0.4 + d.ph) * 0.004;
        m.position.set(x, ground(x, z) + 0.0015 + Math.sin(t * 2 + d.ph) * 0.0008, z); m.rotation.set(Math.sin(t + d.ph) * 0.2, t * 0.3 + d.ph, 0);
      }
    };
    animated.push(tick);
  }
}

export { buildEcology, eco };
