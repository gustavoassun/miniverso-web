import * as THREE from 'three';
import { TAU, clamp, smooth, smoother } from '../../core/math.js';
import { box, cyl, mat, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
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
function buildDunes(g, zi) {
  const bumps = [
    [-0.17, -0.15, 0.07, 0.12, 0.055, 0.5], [0.0, -0.22, 0.06, 0.13, 0.065, 0.3], [0.19, -0.13, 0.06, 0.1, 0.05, 0.8], [-0.22, 0.06, 0.055, 0.1, 0.05, -0.3],
    [0.22, 0.12, 0.05, 0.1, 0.045, 0.2], [-0.03, -0.04, 0.05, 0.09, 0.04, 0.6], [0.09, 0.26, 0.05, 0.09, 0.035, -0.2], [-0.13, 0.25, 0.045, 0.09, 0.035, 0.4],
    [-0.36, -0.18, 0.06, 0.11, 0.05, 0.2], [0.36, -0.2, 0.055, 0.1, 0.045, 0.6], [-0.38, 0.14, 0.05, 0.1, 0.045, -0.5], [0.35, 0.22, 0.05, 0.09, 0.04, 0.1],
    [0.0, -0.4, 0.06, 0.12, 0.05, 0.4], [-0.2, -0.36, 0.05, 0.1, 0.045, 0.7], [0.22, -0.36, 0.05, 0.1, 0.04, 0.2], [0.02, 0.4, 0.05, 0.1, 0.035, -0.3]];
  const dh = (x, z) => {
    let h = 0;
    for (const [bx, bz, sa, sl, hh, r] of bumps) {
      const dx = x - bx, dz = z - bz, c = Math.cos(r), s = Math.sin(r);
      let u = dx * c - dz * s; const v = dx * s + dz * c;
      u = u < 0 ? u / sa : u / (sa * 0.5);
      const bend = v * v / (sl * sl);
      h = Math.max(h, hh * Math.exp(-(u * u * 2.2 + bend * 2.2)) * (1 + 0.15 * Math.sin(v * 40)));
    }
    // Vales onde ficam as lagoas (a água nunca fica embaixo de uma duna).
    for (const [lx, lz, , s0] of LAG) h *= smooth(0.05 * s0, 0.095 * s0, Math.hypot((x - lx) / 1.25, (z - lz) / 0.95));
    return h * smooth(LR, LR - 0.1, Math.hypot(x, z));
  };
  // O relevo do planeta fica ~4 mm acima da base da área: a areia vai por cima dele.
  const BASE = 0.0046, sandY = (x, z) => sag(x, z) + dh(x, z) + BASE;
  const geo = new THREE.RingGeometry(0.0005, LR, 128, 64); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#fbf6e8'), cB = new THREE.Color('#e6dbc0'), cR = new THREE.Color('#d8caa4'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), h = dh(x, z), r = Math.hypot(x, z);
    p.setY(i, sag(x, z) + h + BASE - smooth(LR - 0.06, LR, r) * 0.008);
    c.copy(cB).lerp(cA, clamp(h / 0.04)).lerp(cR, smooth(LR - 0.12, LR, r) * 0.6); col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));

  // Lagoas de chuva: degradê do azul fundo ao verde-água na beira (duas paletas, azul e esmeralda).
  const lagoonTex = (deep, mid, edge) => canvasTex(128, 128, (x, w, h) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, deep); gr.addColorStop(0.55, mid); gr.addColorStop(0.85, edge); gr.addColorStop(1, 'rgba(95,224,208,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); });
  const blueM = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.08, metalness: 0.1, emissive: '#0a4a6a', emissiveIntensity: 0.35, depthWrite: false, map: lagoonTex('#1478c8', '#24a8d8', '#5fe0d0') });
  const greenM = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.08, metalness: 0.1, emissive: '#0a5a4a', emissiveIntensity: 0.35, depthWrite: false, map: lagoonTex('#0f8f8a', '#22c2a8', '#8ff0c8') });
  const lagoons = LAG.map(([x, z, r, s0, kind]) => { const m0 = kind ? greenM : blueM;
    // A lagoa acompanha a curva do planeta (um disco reto ficava meio enterrado na areia longe do centro).
    const y = sag(x, z) + BASE + 0.0012, lg = new THREE.CircleGeometry(0.05 * s0, 32, 0, TAU); lg.rotateX(-Math.PI / 2); lg.scale(1.25, 1, 0.8); lg.rotateY(r);
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
  walkers(g, [[[-0.2, -0.2], [-0.05, -0.12], [0.08, -0.2], [0.2, -0.08], [0.18, 0.03], [0.0, 0.04], [-0.15, 0.0]], [[-0.22, 0.14], [-0.1, 0.26], [0.12, 0.27], [0.24, 0.1], [0.12, 0.07]], [[-0.4, -0.1], [-0.3, -0.3], [-0.05, -0.38], [0.2, -0.36], [0.38, -0.12], [0.3, 0.05]]], 4, [C.white, C.coral, C.amber, C.teal], sandY);
  const TOUR = 7, tourG = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.0032, 0.0042, 0.013, 6).translate(0, 0.0065, 0), new THREE.MeshStandardMaterial({ roughness: 0.7, flatShading: true }), TOUR);
  const tourH = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0033, 8, 6).translate(0, 0.016, 0), new THREE.MeshStandardMaterial({ roughness: 0.7 }), TOUR);
  tourG.frustumCulled = tourH.frustumCulled = false; tourG.userData.detail = tourH.userData.detail = true; g.add(tourG, tourH);
  const tc = ['#ff8a2a', '#ffffff', '#ff7bb0', '#00b7e3', '#ffd23f', '#3ee07a', '#ffffff'].map(h => new THREE.Color(h)), skin = new THREE.Color('#c68a5e');
  for (let i = 0; i < TOUR; i++) { tourG.setColorAt(i, tc[i]); tourH.setColorAt(i, skin); }
  const guideFlag = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.006, 0.008), mat('#ff8a2a')); guideFlag.userData.keep = true; g.add(guideFlag);
  const tourPath = Array.from({ length: 80 }, (_, i) => { const a = i / 80 * TAU; return [Math.cos(a) * 0.3, Math.sin(a) * 0.22 - 0.04]; });
  const o = new THREE.Object3D();
  const tourAnim = t => {
    for (let i = 0; i < TOUR; i++) {
      const f = ((t * 0.12 - i * 0.012) % 1 + 1) % 1, k = f * 80, j = Math.floor(k), a = tourPath[j], b = tourPath[(j + 1) % 80], x = a[0] + (b[0] - a[0]) * (k - j) + (i % 2 ? 0.004 : -0.004), z = a[1] + (b[1] - a[1]) * (k - j);
      o.position.set(x, sandY(x, z) + Math.abs(Math.sin(t * 8 + i)) * 0.0012, z); o.rotation.set(0, Math.atan2(-(b[1] - a[1]), b[0] - a[0]), 0); o.updateMatrix(); tourG.setMatrixAt(i, o.matrix); tourH.setMatrixAt(i, o.matrix);
      if (i === 0) { guideFlag.position.set(x, o.position.y + 0.03, z); }
    }
    tourG.instanceMatrix.needsUpdate = tourH.instanceMatrix.needsUpdate = true;
  };
  tourG.userData.anim = tourAnim; animated.push(tourG);
  // 4x4 do passeio: um parado na vila e outro que roda pelas dunas no Passeio de 4x4.
  const parkedJeep = new THREE.Mesh(jeepGeo(), vehMat()); parkedJeep.position.set(0.3, sandY(0.3, 0.27) + 0.002, 0.27); parkedJeep.rotation.y = 2.2; g.add(parkedJeep);
  const jeep = new THREE.Group(); jeep.userData.keep = true; g.add(jeep);
  jeep.add(new THREE.Mesh(jeepGeo(), vehMat()));
  (rt.track ||= {}).jeep = jeep;                                                                   // a câmera do passeio segue este
  const path = Array.from({ length: 161 }, (_, i) => { const a = i / 160 * TAU, x = Math.cos(a) * 0.34, z = Math.sin(a) * 0.26 - 0.02; return new THREE.Vector3(x, sandY(x, z) + 0.003, z); });
  jeep.userData.anim = t => {
    const f = fxT(zi), u = f < 0 ? 0 : smoother(0, 14, f), k = (u * 160) % 160, i = Math.floor(k), a = path[i], b = path[i + 1];
    jeep.position.copy(a).lerp(b, k - i); jeep.position.y += f >= 0 && f < 14 ? Math.abs(Math.sin(t * 9)) * 0.002 : 0;
    jeep.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0); jeep.rotateZ(Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)));
  };
  animated.push(jeep);
}

export { buildDunes };
