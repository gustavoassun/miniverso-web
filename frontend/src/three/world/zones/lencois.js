import * as THREE from 'three';
import { TAU, clamp, smooth, smoother } from '../../core/math.js';
import { box, cyl, mat, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, figures, walkers } from '../people.js';
import { palm } from '../props.js';
import { animated, fxT, rt } from '../runtime.js';
import { canvasTex } from '../textures.js';
import { jeepGeo, vehMat } from '../vehicles.js';

// Lençóis: um campo grande de dunas em meia-lua (relevo próprio, lado do vento suave e lado de trás mais íngreme),
// lagoas de chuva em tons de azul e verde (Lagoa Azul e Lagoa Bonita com placa), gente se banhando, caminhantes nas
// cristas, um grupo de turistas com o guia, o mirante de madeira, guarda-sóis, a vila de pescadores na beira (casas
// de palha, coqueiros, redes e canoas) e os 4x4 do passeio. Tudo segue a areia e a curva do planeta.
const LR = 0.52;
// Lagoas: x, z, giro, tamanho e cor (0 azul, 1 esmeralda).
const LAG = [[0.1, -0.01, -0.3, 1, 0], [-0.1, 0.1, 0.5, 1, 1], [0.03, 0.12, 0.1, 0.9, 0], [-0.04, 0.2, -0.4, 0.8, 1], [-0.28, -0.04, 0.2, 1.1, 0], [0.28, 0.02, -0.5, 1, 1], [-0.1, -0.28, 0.3, 0.9, 0], [0.16, -0.28, -0.2, 0.85, 1], [0.2, 0.33, 0.6, 0.8, 0]];
// Rio Preguiças: contorna o campo de dunas pelo lado de baixo, entrando e saindo pela borda (como o rio que separa
// Barreirinhas do parque e desce até o mar em Caburé). Linha central em coordenadas da área.
const RIVER = Array.from({ length: 64 }, (_, i) => {
  const s = i / 63, a = -2.7 + s * 2.2;
  const r = 0.43 + 0.11 * (Math.max(0, 0.15 - s) / 0.15) ** 1.5 + 0.11 * (Math.max(0, s - 0.85) / 0.15) ** 1.5 + 0.015 * Math.sin(s * 14);
  return [Math.cos(a) * r, Math.sin(a) * r];
});
const riverDist = (x, z) => { let m = 9; for (let i = 0; i < RIVER.length - 1; i++) { const [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], ex = bx - ax, ez = bz - az, t = clamp(((x - ax) * ex + (z - az) * ez) / (ex * ex + ez * ez)); m = Math.min(m, Math.hypot(x - ax - ex * t, z - az - ez * t)); } return m; };
function buildDunes(g, zi) {
  const bumps = [
    [-0.17, -0.15, 0.07, 0.12, 0.055, 0.5], [0.0, -0.22, 0.06, 0.13, 0.065, 0.3], [0.19, -0.13, 0.06, 0.1, 0.05, 0.8], [-0.22, 0.06, 0.055, 0.1, 0.05, -0.3],
    [0.22, 0.12, 0.05, 0.1, 0.045, 0.2], [-0.03, -0.04, 0.05, 0.09, 0.04, 0.6], [0.09, 0.26, 0.05, 0.09, 0.035, -0.2], [-0.13, 0.25, 0.045, 0.09, 0.035, 0.4],
    [-0.36, -0.18, 0.06, 0.11, 0.05, 0.2], [0.36, -0.2, 0.055, 0.1, 0.045, 0.6], [-0.38, 0.14, 0.05, 0.1, 0.045, -0.5], [0.35, 0.22, 0.05, 0.09, 0.04, 0.1],
    [0.0, -0.4, 0.06, 0.12, 0.05, 0.4], [-0.2, -0.36, 0.05, 0.1, 0.045, 0.7], [0.22, -0.36, 0.05, 0.1, 0.04, 0.2], [0.02, 0.4, 0.05, 0.1, 0.035, -0.3]];
  // Relevo como nos Lençóis de verdade: cristas longas e onduladas, perpendiculares ao vento (que vem do mar), com o
  // lado do vento suave e o lado de trás íngreme, quebradas em meias-luas; as lagoas ficam nos vales entre elas.
  const WIND = 0.35, cw = Math.cos(WIND), sw = Math.sin(WIND);
  const dh = (x, z) => {
    const u = x * cw + z * sw, v = -x * sw + z * cw;
    const ph = u / 0.14 + 0.32 * Math.sin(v * 8.5 + 1.2) + 0.14 * Math.sin(v * 19 + u * 6), f = ph - Math.floor(ph);
    const prof = f < 0.7 ? Math.sin(f / 0.7 * Math.PI / 2) ** 1.3 : Math.pow(1 - (f - 0.7) / 0.3, 1.6);
    const crest = 0.5 + 0.5 * Math.sin(v * 10.5 + Math.floor(ph) * 2.3);                          // quebra em meias-luas
    let h = 0.05 * prof * (0.35 + 0.65 * smooth(0.15, 0.6, crest)) * (0.8 + 0.2 * Math.sin(v * 4 + u * 3));
    // Vales onde ficam as lagoas (a água nunca fica embaixo de uma duna).
    for (const [lx, lz, , s0] of LAG) h *= smooth(0.065 * s0, 0.12 * s0, Math.hypot((x - lx) / 1.25, (z - lz) / 0.95));
    h *= smooth(0.08, 0.16, Math.hypot(x - 0.38, z - 0.3));                                          // vila de pescadores no plano
    h *= smooth(0.028, 0.07, riverDist(x, z));                                                       // o rio corre no plano, entre as dunas
    return h * smooth(LR, LR - 0.1, Math.hypot(x, z));
  };
  // O relevo do planeta fica ~4 mm acima da base da área: a areia vai por cima dele.
  const BASE = 0.0046, sandY = (x, z) => sag(x, z) + dh(x, z) + BASE;
  const geo = new THREE.RingGeometry(0.0005, LR, 128, 64); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#ffffff'), cB = new THREE.Color('#ece6d8'), cR = new THREE.Color('#ddd2b8'), cBank = new THREE.Color('#7fae5a'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = dh(x, z), r = Math.hypot(x, z);
    p.setY(i, sag(x, z) + h + BASE - smooth(LR - 0.06, LR, r) * 0.008);
    c.copy(cB).lerp(cA, clamp(h / 0.04)).lerp(cR, smooth(LR - 0.12, LR, r) * 0.6).lerp(cBank, smooth(0.075, 0.03, riverDist(x, z)) * 0.85); col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

  // Lagoas de chuva: degradê do azul fundo ao verde-água na beira (duas paletas, azul e esmeralda).
  const lagoonTex = (deep, mid, edge) => canvasTex(128, 128, (x, w, h) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, deep); gr.addColorStop(0.55, mid); gr.addColorStop(0.85, edge); gr.addColorStop(1, 'rgba(95,224,208,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const blueM = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.08, metalness: 0.1, emissive: '#0a4a6a', emissiveIntensity: 0.35, depthWrite: false, map: lagoonTex('#0f6fc4', '#1fa6e0', '#62e6d8') });
  const greenM = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.08, metalness: 0.1, emissive: '#0a5a4a', emissiveIntensity: 0.35, depthWrite: false, map: lagoonTex('#0f8f8a', '#22c2a8', '#8ff0c8') });
  const lagoons = LAG.map(([x, z, r, s0, kind]) => { const m0 = kind ? greenM : blueM;
    // A lagoa acompanha a curva do planeta (um disco reto ficava meio enterrado na areia longe do centro).
    const y = sag(x, z) + BASE + 0.0012, lg = new THREE.CircleGeometry(0.064 * s0, 40, 0, TAU); lg.rotateX(-Math.PI / 2); lg.scale(1.25, 1, 0.8); lg.rotateY(r);
    const lp = lg.attributes.position; for (let i = 0; i < lp.count; i++) lp.setY(i, sag(lp.getX(i) + x, lp.getZ(i) + z) + BASE + 0.0012);
    lg.computeVertexNormals();
    const m = new THREE.Mesh(lg, m0); m.position.set(x, 0, z); m.renderOrder = 2; g.add(m);
    return { x, z, y };
  });
  const lagoonSign = (x, z, text) => { const y = sandY(x, z); cyl(0.0012, 0.018, '#7a5b45', x, y, z, g, 4); const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.008), new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(150, 40, (q, w, h) => { q.fillStyle = '#7a5b45'; q.fillRect(0, 0, w, h); q.fillStyle = '#fff6dc'; q.font = 'bold 20px sans-serif'; q.textAlign = 'center'; q.textBaseline = 'middle'; q.fillText(text, w / 2, h / 2 + 1); }) })); pl.position.set(x, y + 0.02, z); g.add(pl); };
  lagoonSign(0.15, 0.045, 'LAGOA AZUL'); lagoonSign(-0.06, 0.14, 'LAGOA BONITA');
  // Gente se banhando (água pela cintura).
  const bathers = [];
  lagoons.forEach((l, k) => { for (let j = 0; j < 2; j++) { const a = k * 2.1 + j * 2.6; bathers.push([l.x + Math.cos(a) * 0.022, l.z + Math.sin(a) * 0.014, l.y - 0.007]); } });
  crowd(g, bathers, zi, [C.coral, C.amber, C.teal, C.white, C.violet, '#e8452f']);
  // Guarda-sóis coloridos com cadeiras na beira das lagoas.
  [[0.14, 0.04, C.coral], [-0.14, 0.05, C.amber], [0.07, 0.17, C.teal], [-0.3, 0.02, '#ff7bb0'], [0.3, -0.04, '#ffd23f']].forEach(([x, z, cc]) => {
    const y = sandY(x, z); cyl(0.0015, 0.035, C.white, x, y, z, g, 5);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.012, 8), mat(cc)); top.position.set(x, y + 0.038, z); g.add(top);
    box(0.008, 0.002, 0.012, '#ffffff', x + 0.01, y + 0.001, z + 0.006, g);
  });
  // Mirante de madeira numa crista, com escada e gente olhando a paisagem.
  const MX = -0.32, MZ = 0.3, my = sandY(MX, MZ);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.0014, 0.05, '#7a5b45', MX + dx * 0.012, my - 0.004, MZ + dz * 0.012, g, 5);
  box(0.03, 0.003, 0.03, '#a07a5a', MX, my + 0.044, MZ, g);
  for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; box(0.0015, 0.008, 0.0015, '#7a5b45', MX + Math.cos(a) * 0.014, my + 0.047, MZ + Math.sin(a) * 0.014, g); }
  const roofM = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.016, 4), mat('#c9a66b')); roofM.rotation.y = Math.PI / 4; roofM.position.set(MX, my + 0.075, MZ); g.add(roofM);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(0.0009, 0.022, '#7a5b45', MX + dx * 0.012, my + 0.047, MZ + dz * 0.012, g, 4);
  for (let i = 0; i < 8; i++) box(0.012, 0.0015, 0.004, '#a07a5a', MX + 0.02 + i * 0.004, my + 0.005 + i * 0.005, MZ, g);
  crowd(g, [[MX - 0.006, MZ, my + 0.0465], [MX + 0.006, MZ + 0.004, my + 0.0465]], zi, ['#ffffff', C.coral]);
  // Vila de pescadores na beira (como em Atins): casas de palha, coqueiros, redes e canoas na areia.
  const vil = [[0.36, 0.3, 0.3], [0.42, 0.22, -0.4], [0.3, 0.38, 0.9], [0.44, 0.33, 0.1]];
  vil.forEach(([x, z, r]) => {
    const y = Math.min(sandY(x - 0.012, z - 0.01), sandY(x + 0.012, z + 0.01)) - 0.001, hut = new THREE.Group(); hut.position.set(x, y, z); hut.rotation.y = r; g.add(hut);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.016, 0.02), mat('#e9dcc0')); wall.position.y = 0.008; hut.add(wall);
    const thatch = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.02, 4), mat('#c9a66b')); thatch.rotation.y = Math.PI / 4; thatch.scale.set(1.2, 1, 0.95); thatch.position.y = 0.026; hut.add(thatch);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.01, 0.001), mat('#6a4a2a')); door.position.set(0, 0.005, 0.0105); hut.add(door);
  });
  for (const [x, z] of [[0.33, 0.25], [0.47, 0.27], [0.38, 0.4], [0.26, 0.33], [0.46, 0.17]]) palm(g, x, z, 0.08, sandY(x, z) - 0.002);
  for (const [x, z, a] of [[0.4, 0.26, 0.3], [0.33, 0.35, -0.2]]) { const hy = sandY(x, z); const ham = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.02, 8, 1, true, 0, Math.PI), mat('#ff7bb0', { side: THREE.DoubleSide })); ham.rotation.set(0, a, Math.PI / 2); ham.position.set(x, hy + 0.012, z); g.add(ham); }
  for (const [x, z, a, cc] of [[0.4, 0.42, 0.2, '#e8452f'], [0.47, 0.37, 1.1, '#00b7e3']]) { const cy = sandY(x, z); const can = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.03, 8, 1, false, 0, Math.PI), mat(cc, { side: THREE.DoubleSide })); can.rotation.set(Math.PI, a, Math.PI / 2); can.position.set(x, cy + 0.004, z); g.add(can); }
  crowd(g, [[0.38, 0.28], [0.35, 0.33], [0.43, 0.3]].map(([x, z]) => [x, z, sandY(x, z)]), zi, ['#ffd23f', '#ffffff', '#00b7e3']);
  // Caminhantes nas cristas e o grupo de turistas seguindo o guia com a bandeirinha.
  walkers(g, [[[-0.2, -0.2], [-0.05, -0.12], [0.08, -0.2], [0.2, -0.08], [0.18, 0.03], [0.0, 0.04], [-0.15, 0.0]], [[-0.22, 0.14], [-0.1, 0.26], [0.12, 0.27], [0.24, 0.1], [0.12, 0.07]], [[-0.36, -0.08], [-0.26, -0.24], [-0.05, -0.31], [0.18, -0.29], [0.33, -0.12], [0.28, 0.05]]], 4, [C.white, C.coral, C.amber, C.teal], sandY, 'palha');
  // Grupo de turistas: miniversianos de boné seguindo a guia (de chapéu de safári e bandeirinha laranja) em fila,
  // no passo de quem caminha na areia (antes eram bonecos antigos de cilindro, correndo dez vezes mais rápido).
  const TOUR = 7, tourF = figures(g, TOUR, ['#2f8f5e', '#ffffff', '#ff7bb0', '#00b7e3', '#ffd23f', '#3ee07a', '#ff8a2a'], 1, { hat: 'bone', hatColors: ['#ffffff', '#e8452f', '#1e4488', '#ffd23f'] });
  const guideFlag = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.006, 0.008), mat('#ff8a2a')); guideFlag.userData.keep = true; g.add(guideFlag);
  const tourPath = Array.from({ length: 80 }, (_, i) => { const a = i / 80 * TAU; return [Math.cos(a) * 0.3, Math.sin(a) * 0.22 - 0.04]; });
  const tourAt = f => { const k = (((f % 1) + 1) % 1) * 80, j = Math.floor(k), a = tourPath[j], b = tourPath[(j + 1) % 80]; return [a[0] + (b[0] - a[0]) * (k - j), a[1] + (b[1] - a[1]) * (k - j), Math.atan2(b[0] - a[0], b[1] - a[1])]; };
  tourF.host.userData.anim = t => {
    for (let i = 0; i < TOUR; i++) {
      const [x, z, h] = tourAt(t * 0.011 - i * 0.012), step = Math.sin(t * 9 + i * 1.7), side = (i % 2 ? 0.004 : -0.004) * (i ? 1 : 0);
      const xx = x + Math.cos(h) * side, zz = z - Math.sin(h) * side;
      tourF.place(i, xx, sandY(xx, zz) + Math.abs(step) * 0.0006, zz, h, step, 0, step * 0.04);
      if (i === 0) guideFlag.position.set(xx, sandY(xx, zz) + 0.03, zz);
    }
    tourF.done();
  };
  animated.push(tourF.host);
  // 4x4 do passeio: um parado na vila e outro que roda pelas dunas no Passeio de 4x4.
  const parkedJeep = new THREE.Mesh(jeepGeo(), vehMat()); parkedJeep.position.set(0.3, sandY(0.3, 0.27) + 0.002, 0.27); parkedJeep.rotation.y = 2.2; g.add(parkedJeep);
  const jeep = new THREE.Group(); jeep.userData.keep = true; g.add(jeep);
  jeep.add(new THREE.Mesh(jeepGeo(), vehMat()));
  (rt.track ||= {}).jeep = jeep;                                                                   // a câmera do passeio segue este
  // Caminho do passeio: uma volta pelas dunas que desvia das lagoas (e de quem está nelas) e fica longe do rio; antes o
  // 4x4 passava por dentro da água.
  const loop = Array.from({ length: 160 }, (_, i) => { const a = i / 160 * TAU; return [Math.cos(a) * 0.34, Math.sin(a) * 0.26 - 0.02]; });
  for (let it = 0; it < 6; it++) {
    for (const q of loop) {
      for (const [lx, lz, , s0] of LAG) { const dx = q[0] - lx, dz = q[1] - lz, d = Math.hypot(dx / 1.25, dz / 0.85), rad = 0.064 * s0 + 0.03; if (d < rad && d > 1e-4) { const k = rad / d; q[0] = lx + dx * k; q[1] = lz + dz * k; } }
      if (riverDist(q[0], q[1]) < 0.07) { const r = Math.hypot(q[0], q[1]); q[0] *= (r - 0.02) / r; q[1] *= (r - 0.02) / r; }
    }
    for (let i = 0; i < loop.length; i++) { const a = loop[(i + 159) % 160], b = loop[(i + 1) % 160], q = loop[i]; q[0] = (a[0] + q[0] * 2 + b[0]) / 4; q[1] = (a[1] + q[1] * 2 + b[1]) / 4; }
  }
  const path = [...loop, loop[0]].map(([x, z]) => new THREE.Vector3(x, sandY(x, z) + 0.003, z));
  jeep.userData.anim = t => {
    const f = fxT(zi), u = f < 0 ? 0 : smoother(0, 14, f), k = (u * 160) % 160, i = Math.floor(k), a = path[i], b = path[i + 1];
    jeep.position.copy(a).lerp(b, k - i); jeep.position.y += f >= 0 && f < 14 ? Math.abs(Math.sin(t * 9)) * 0.002 : 0;
    jeep.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0); jeep.rotateZ(Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)));
  };
  animated.push(jeep);

  // ── Rio Preguiças: a água acompanha a curva do planeta, com buritis e açaizeiros nas margens.
  const RW = 0.026, rpos = [], ridx = [];
  RIVER.forEach(([x, z], i) => {
    const [px, pz] = RIVER[Math.max(0, i - 1)], [nx, nz] = RIVER[Math.min(RIVER.length - 1, i + 1)], tx = nx - px, tz = nz - pz, tl = Math.hypot(tx, tz), ox = -tz / tl * RW, oz = tx / tl * RW;
    for (const sd of [-1, 1]) { const xx = x + ox * sd, zz = z + oz * sd; rpos.push(xx, sag(xx, zz) + BASE + 0.0009, zz); }
    if (i) { const a = (i - 1) * 2; ridx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  });
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.Float32BufferAttribute(rpos, 3)); rg.setIndex(ridx); rg.computeVertexNormals();
  const river = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ color: '#1f86c2', roughness: 0.12, metalness: 0.1, emissive: '#0a3f62', emissiveIntensity: 0.3, side: THREE.DoubleSide }));
  river.renderOrder = 2; g.add(river);
  const along = (s, off = 0) => { const k = s * (RIVER.length - 1), i = Math.min(RIVER.length - 2, Math.floor(k)), f = k - i, [ax, az] = RIVER[i], [bx, bz] = RIVER[i + 1], tx = bx - ax, tz = bz - az, tl = Math.hypot(tx, tz); return { x: ax + tx * f - tz / tl * off, z: az + tz * f + tx / tl * off, h: Math.atan2(-tz, tx) }; };
  for (let k = 0; k < 16; k++) {
    const s = 0.05 + k / 16 * 0.9, sd = k % 2 ? 1 : -1, q = along(s, sd * (RW + 0.014 + (k % 3) * 0.006));
    if (Math.hypot(q.x, q.z) < LR - 0.01) { const bp = new THREE.Group(); bp.position.set(q.x, sag(q.x, q.z) + BASE - 0.001, q.z); bp.scale.setScalar(0.5 + (k % 3) * 0.06); g.add(bp); palm(bp, 0, 0, 0.09 + (k % 4) * 0.01, 0); }
  }
  // Balsa atravessando o rio (de Barreirinhas para o parque) com um 4x4 em cima, e lanchas (voadeiras) subindo e descendo.
  const ferryAt = along(0.5), fy = sag(ferryAt.x, ferryAt.z) + BASE + 0.0012;
  const ferry = new THREE.Group(); ferry.userData.keep = true; g.add(ferry);
  const hullF = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.004, 0.024), mat('#2a5ea8')); hullF.position.y = 0.001; ferry.add(hullF);
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.0012, 0.022), mat('#b08a5e')); deck.position.y = 0.0036; ferry.add(deck);
  for (const sd of [-1, 1]) {
    const ramp = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.001, 0.02), mat('#8a6a4a')); ramp.position.set(sd * 0.025, 0.0032, 0); ramp.rotation.z = sd * -0.35; ferry.add(ramp);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.0025, 0.0008), mat('#ffffff')); rail.position.set(0, 0.0055, sd * 0.0108); ferry.add(rail);
  }
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.007), mat('#ffffff')); cabin.position.set(-0.014, 0.0082, -0.0075); ferry.add(cabin);
  const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0012, 0.009), mat('#e8452f')); cabRoof.position.set(-0.014, 0.0126, -0.0075); ferry.add(cabRoof);
  const fj = new THREE.Mesh(jeepGeo(), vehMat()); fj.scale.setScalar(0.62); fj.position.set(0.004, 0.0042, 0.003); ferry.add(fj);
  ferry.rotation.y = ferryAt.h + Math.PI / 2;
  // Um pequeno atracadouro de madeira em cada margem, onde a balsa encosta.
  const span = RW * 2.4, cosH = Math.cos(ferryAt.h), sinH = Math.sin(ferryAt.h), nx = sinH, nz = cosH;   // normal ao rio no plano
  const c0 = [ferryAt.x - nx * span, ferryAt.z - nz * span], c1 = [ferryAt.x + nx * span, ferryAt.z + nz * span];
  for (const [cx, cz] of [c0, c1]) {
    const cy = sag(cx, cz) + BASE; box(0.016, 0.002, 0.016, '#8a6a4a', cx, cy + 0.001, cz, g);
    cyl(0.0012, 0.014, '#5a3a28', cx, cy, cz, g, 5);
  }
  ferry.userData.anim = t => { const u = Math.sin(t * 0.3) * 0.5 + 0.5, k = (u - 0.5) * RW * 1.5; ferry.position.set(ferryAt.x + nx * k, fy + Math.sin(t * 1.3) * 0.0004, ferryAt.z + nz * k); };
  animated.push(ferry);
  [['#ffffff', 0.12, 1], ['#ffd23f', 0.37, -1], ['#00b7e3', 0.66, 1]].forEach(([cc, s0, dir], k) => {
    const boat = new THREE.Group(); boat.userData.keep = true; g.add(boat);
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.004, 0.007), mat(cc)); hull.position.y = 0.002; boat.add(hull);
    const bow = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.007, 4), mat(cc)); bow.rotation.z = -Math.PI / 2; bow.position.set(0.0125, 0.002, 0); boat.add(bow);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.0015, 0.0075), mat('#2a5ea8')); roof.position.set(-0.002, 0.008, 0); boat.add(roof);
    crowd(boat, [[-0.004, 0, 0.0005], [0.003, 0, 0.0005]].map(([x, z, y]) => [x, z, y]), zi, ['#ff8a6b', '#ffffff'], { face: Math.PI / 2, sit: true });
    boat.userData.anim = t => {
      const u = ((s0 + dir * t * 0.018) % 1 + 1) % 1, s = 0.08 + (u < 0.5 ? u * 2 : (1 - u) * 2) * 0.84, back = (u < 0.5) === (dir > 0);
      const q = along(s, (back ? 1 : -1) * RW * 0.45), y = sag(q.x, q.z) + BASE + 0.0011;
      boat.position.set(q.x, y + Math.abs(Math.sin(t * 7 + k)) * 0.0006, q.z); boat.rotation.y = q.h + (back ? Math.PI : 0);
    };
    animated.push(boat);
  });
  // Restinga: moitas verdes nas bordas das dunas, do lado de fora do rio (como perto das margens do parque).
  const BUSH = 46, bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.009, 0), mat('#5f9e4a'), BUSH); bush.userData.detail = true; g.add(bush);
  const bo = new THREE.Object3D(), bc = ['#5f9e4a', '#4f8a3c', '#7fae5a', '#3f7a38'].map(h => new THREE.Color(h));
  for (let i = 0; i < BUSH; i++) {
    const a = 0.15 + i / BUSH * 2.85, r = LR - 0.015 - (i % 4) * 0.012, x = Math.cos(a) * r, z = Math.sin(a) * r;
    bo.position.set(x, sag(x, z) + BASE + dh(x, z) * 0.6, z); bo.scale.set(1 + (i % 3) * 0.4, 0.55 + (i % 2) * 0.25, 1 + ((i + 1) % 3) * 0.35); bo.rotation.y = i * 1.3; bo.updateMatrix();
    bush.setMatrixAt(i, bo.matrix); bush.setColorAt(i, bc[i % 4]);
  }
  // Farol listrado de vermelho e branco perto da saída do rio para o mar (como o Farol de Mandacaru, perto de Caburé).
  const fa = along(0.9, -(RW + 0.035)), fby = sag(fa.x, fa.z) + BASE;
  for (let k = 0; k < 6; k++) { const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.0062 - k * 0.0005, 0.0066 - k * 0.0005, 0.011, 10), mat(k % 2 ? '#ffffff' : '#d6202b')); seg.position.set(fa.x, fby + 0.0055 + k * 0.011, fa.z); g.add(seg); }
  const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.007, 10), new THREE.MeshBasicMaterial({ color: '#fff1b8', toneMapped: false })); lamp.position.set(fa.x, fby + 0.07, fa.z); g.add(lamp);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.0055, 0.006, 10), mat('#d6202b')); cap.position.set(fa.x, fby + 0.0765, fa.z); g.add(cap);
}

export { buildDunes };
