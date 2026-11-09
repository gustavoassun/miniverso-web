import * as THREE from 'three';
import { R, TAU, smooth } from '../../core/math.js';
import { box, cyl, mat, sag } from '../build.js';
import { crowd, figures, walkers } from '../people.js';
import { confetti, lamp, nightSky } from '../props.js';
import { animated, fxT, fxT2, fxT3, rt } from '../runtime.js';
import { canvasTex } from '../textures.js';

// Natal: vila nevada logo abaixo da Ferrovia. No meio, a árvore de Natal grande (luzes que piscam, bolas, festão
// dourado e estrela), presentes embaixo; em volta, casinhas de madeira com telhado de neve, janelas acesas e fumaça
// na chaminé, pista de patinação com patinadores, bonecos de neve, postes com guirlanda e varais de luzinhas,
// pinheiros nevados na borda, gente passeando de gorro e neve caindo sem parar. Interações: Acender a árvore (a
// noite cai e as luzes correm pela árvore), Nevasca (a neve engrossa e venta) e Trenó do Papai Noel (passa baixinho
// sobre a vila, com a câmera acompanhando).
// Chão: neve ~5,8 mm acima da base da área (como o campus); peças em Y.
const FLOOR = 0.0058;
const Y = (x, z) => sag(x, z) + 0.0042;
const TREE_X = 0, TREE_Z = -0.02;

function snowFloor(g, r) {
  const S = 1024, k = S / (2 * r), px = u => (u + r) * k;
  const tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#f3f8ff'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 6000; i++) { x.fillStyle = i % 3 ? 'rgba(170,200,235,.10)' : 'rgba(255,255,255,.6)'; x.fillRect(R() * w, R() * h, 2 + R() * 4, 2 + R() * 3); }
    // Caminhos pisados (neve mais acinzentada) da entrada até a árvore e em volta dela.
    x.lineCap = 'round'; x.strokeStyle = 'rgba(160,178,205,.55)';
    const path = (pts, wd) => { x.lineWidth = wd * k; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(px(a), px(b)) : x.moveTo(px(a), px(b)))); x.stroke(); };
    path([[0, 0.36], [0, 0.06]], 0.04);
    x.lineWidth = 0.035 * k; x.beginPath(); x.arc(px(TREE_X), px(TREE_Z), 0.11 * k, 0, TAU); x.stroke();
    path([[-0.08, -0.08], [-0.2, -0.17]], 0.026); path([[0.08, -0.08], [0.2, -0.17]], 0.026); path([[-0.1, 0.03], [-0.25, 0.04]], 0.026); path([[0.1, 0.05], [0.16, 0.1]], 0.026);
    // Praça da árvore: pedra clara com um anel vermelho.
    x.fillStyle = '#e4e9f1'; x.beginPath(); x.arc(px(TREE_X), px(TREE_Z), 0.075 * k, 0, TAU); x.fill();
    x.strokeStyle = '#d9414a'; x.lineWidth = 4; x.beginPath(); x.arc(px(TREE_X), px(TREE_Z), 0.07 * k, 0, TAU); x.stroke();
    const gr = x.createRadialGradient(w / 2, h / 2, w * 0.42, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  tex.anisotropy = 8;
  const geo = new THREE.RingGeometry(0.0005, r, 112, 28); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + FLOOR);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.95 })));
}

// Estrela de cinco pontas (extrudada).
function starGeo(r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  const geo = new THREE.ExtrudeGeometry(s, { depth: r * 0.3, bevelEnabled: false }); geo.translate(0, 0, -r * 0.15); return geo;
}

function buildNatal(g, zi) {
  snowFloor(g, 0.44);
  const o = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0), col = new THREE.Color();
  const anims = [];

  // ── Árvore de Natal.
  const ty = Y(TREE_X, TREE_Z) + 0.0016;
  cyl(0.074, 0.006, '#e4e9f1', TREE_X, ty - 0.002, TREE_Z, g, 28);                                       // base de pedra
  cyl(0.008, 0.03, '#6b4a33', TREE_X, ty, TREE_Z, g, 8);
  const tiers = [[0.07, 0.07, 0.02], [0.056, 0.06, 0.07], [0.043, 0.052, 0.112], [0.03, 0.044, 0.148], [0.018, 0.036, 0.178]];
  const coneSurf = [];
  tiers.forEach(([r, h, y0], k) => {
    const c = new THREE.Mesh(new THREE.ConeGeometry(r, h, 14), mat(k % 2 ? '#1f6b46' : '#237a4f', { flatShading: true })); c.position.set(TREE_X, ty + y0 + h / 2, TREE_Z); g.add(c);
    const sn = new THREE.Mesh(new THREE.ConeGeometry(r * 0.42, h * 0.32, 14), mat('#f6fbff', { flatShading: true })); sn.position.set(TREE_X, ty + y0 + h * 0.84, TREE_Z); g.add(sn);
    coneSurf.push({ r, h, y0: ty + y0 });
  });
  const treeTop = ty + 0.178 + 0.036;
  // Ponto na superfície do cone (camada k, altura u de 0 embaixo a 1 em cima, ângulo a).
  const onCone = (k, u, a, out = 1.0) => { const { r, h, y0 } = coneSurf[k], rr = r * (1 - u) * out; return [TREE_X + Math.cos(a) * rr, y0 + h * u, TREE_Z + Math.sin(a) * rr]; };
  // Bolas.
  const BALLS = 54, balls = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0034, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.25, metalness: 0.5 }), BALLS);
  const ballC = ['#d9414a', '#ffd23f', '#3f7fe8', '#e9eef5', '#ff7bb0'].map(c => new THREE.Color(c));
  for (let i = 0; i < BALLS; i++) { const k = i % 5, u = 0.15 + ((i * 7) % 10) / 10 * 0.6, a = i * 2.4; o.position.set(...onCone(k, u, a, 1.04)); o.scale.setScalar(k > 2 ? 0.8 : 1); o.updateMatrix(); balls.setMatrixAt(i, o.matrix); balls.setColorAt(i, ballC[i % ballC.length]); }
  g.add(balls);
  // Luzinhas em espiral (piscam; na Acender a árvore, as cores correm de baixo para cima).
  const LIGHTS = 110, lights = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0018, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), LIGHTS);
  const lightC = ['#ffe9a8', '#ff5a5a', '#7fe9ff', '#9dffb0', '#ffb3f0'].map(c => new THREE.Color(c)), lightY = [];
  for (let i = 0; i < LIGHTS; i++) {
    const s = i / LIGHTS, k = Math.min(4, Math.floor(s * 5)), u = (s * 5 - k) * 0.85 + 0.05, a = s * TAU * 9;
    const p = onCone(k, u, a, 1.06); o.position.set(...p); o.scale.setScalar(1); o.updateMatrix(); lights.setMatrixAt(i, o.matrix); lights.setColorAt(i, lightC[i % lightC.length]); lightY.push(s);
  }
  lights.frustumCulled = false; lights.userData.keep = true; g.add(lights);
  // Festão dourado em espiral.
  const garl = []; for (let i = 0; i <= 120; i++) { const s = i / 120, k = Math.min(4, Math.floor(s * 5)), u = (s * 5 - k) * 0.85 + 0.08; garl.push(new THREE.Vector3(...onCone(k, u, s * TAU * 5 + 1, 1.03))); }
  g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(garl), 240, 0.0009, 4), mat('#ffd23f', { metalness: 0.6, roughness: 0.3, emissive: '#7a5a00', emissiveIntensity: 0.4 })));
  // Estrela no topo (gira devagar e brilha mais quando a árvore acende).
  const star = new THREE.Mesh(starGeo(0.013), new THREE.MeshStandardMaterial({ color: '#ffd23f', emissive: '#ffb400', emissiveIntensity: 0.8, metalness: 0.4, roughness: 0.3 }));
  star.position.set(TREE_X, treeTop + 0.01, TREE_Z); star.userData.keep = true; g.add(star);
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.02, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0.15, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending }));
  halo.position.copy(star.position); halo.userData.keep = true; g.add(halo);
  // Presentes embaixo da árvore.
  [[0.05, 0.01, '#d9414a', '#ffd23f'], [-0.045, 0.02, '#3f7fe8', '#ffffff'], [0.02, 0.05, '#3ee07a', '#d9414a'], [-0.03, -0.04, '#ffd23f', '#d9414a'], [0.05, -0.035, '#b07cff', '#ffd23f'], [-0.055, -0.01, '#ff7bb0', '#ffffff'], [0.0, 0.058, '#ffffff', '#d9414a']].forEach(([dx, dz, c1, c2], k) => {
    const s0 = 0.011 + (k % 3) * 0.003, x = TREE_X + dx, z = TREE_Z + dz, y = ty + 0.004;
    box(s0, s0 * 0.8, s0, c1, x, y, z, g); box(s0 + 0.0004, s0 * 0.8 + 0.0004, 0.0022, c2, x, y - 0.0002, z, g); box(0.0022, s0 * 0.8 + 0.0004, s0 + 0.0004, c2, x, y - 0.0002, z, g);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.0022, 0.0008, 4, 10), mat(c2)); bow.position.set(x, y + s0 * 0.8 + 0.001, z); g.add(bow);
  });
  const sparkle = confetti(g, TREE_X, treeTop, TREE_Z, { up: 0.05, spread: 0.12, grav: 0.03, floor: -(treeTop - ty) + 0.004, size: 0.004, n: 50 });

  // ── Casinhas da vila (madeira, telhado nevado, janelas acesas, porta com guirlanda e fumaça na chaminé).
  const HOUSES = [[-0.22, -0.18, 0.75], [0.0, -0.27, 0], [0.22, -0.18, -0.75], [-0.28, 0.04, 1.45], [0.28, 0.0, -1.5]];
  const woods = ['#8a5a3c', '#a0643f', '#6f4a35', '#9b6b4a', '#7d4f36'], smokeFrom = [];
  HOUSES.forEach(([x, z, ry], k) => {
    const hs = new THREE.Group(); hs.position.set(x, Y(x, z) - 0.002, z); hs.rotation.y = ry; g.add(hs);
    const hb = (w, h, d, c, px0, py0, pz0, extra) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, extra)); m.position.set(px0, py0 + h / 2, pz0); hs.add(m); return m; };
    const W0 = 0.05, D0 = 0.04, H0 = 0.034;
    hb(W0, H0, D0, woods[k], 0, 0, 0);
    for (let i = 0; i < 5; i++) hb(W0 + 0.001, 0.0008, D0 + 0.001, '#5a3a28', 0, 0.004 + i * 0.0065, 0);  // tábuas
    for (const s0 of [-1, 1]) {
      const roof = new THREE.Mesh(new THREE.BoxGeometry(W0 + 0.008, 0.0035, D0 * 0.62), mat('#7a2e2a')); roof.position.set(0, H0 + 0.011, s0 * D0 * 0.26); roof.rotation.x = s0 * 0.62; hs.add(roof);
      const snow = new THREE.Mesh(new THREE.BoxGeometry(W0 + 0.01, 0.003, D0 * 0.6), mat('#f6fbff')); snow.position.set(0, H0 + 0.0135, s0 * D0 * 0.25); snow.rotation.x = s0 * 0.62; hs.add(snow);
      hb(0.012, 0.01, 0.0012, '#ffd27a', s0 * 0.015, 0.012, D0 / 2 + 0.0004, { emissive: '#ffb347', emissiveIntensity: 1.1 });  // janelas
      hb(0.0136, 0.0016, 0.0016, '#f6fbff', s0 * 0.015, 0.0115, D0 / 2 + 0.001);
    }
    const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.001, D0 * 0.58, 0.022, 3, 1).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), mat(woods[k])); gable.scale.set(1, 1, 1); // empena
    gable.rotation.set(0, Math.PI / 2, 0); gable.position.set(0, H0 + 0.006, 0); hs.add(gable);
    hb(0.011, 0.018, 0.0012, '#4a2a1c', 0, 0, D0 / 2 + 0.0004);                                         // porta
    const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.0032, 0.0012, 5, 12), mat('#1f6b46')); wreath.position.set(0, 0.014, D0 / 2 + 0.0016); hs.add(wreath);
    const bowW = new THREE.Mesh(new THREE.SphereGeometry(0.0012, 6, 4), mat('#d9414a')); bowW.position.set(0, 0.0105, D0 / 2 + 0.0022); hs.add(bowW);
    hb(0.007, 0.016, 0.007, '#6a6a72', W0 * 0.3, H0 + 0.004, -D0 * 0.15); hb(0.009, 0.002, 0.009, '#f6fbff', W0 * 0.3, H0 + 0.02, -D0 * 0.15);
    hs.updateMatrix(); smokeFrom.push(new THREE.Vector3(W0 * 0.3, H0 + 0.024, -D0 * 0.15).applyMatrix4(hs.matrix));
  });
  const PUFF = 6, smoke = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.004, 0), new THREE.MeshStandardMaterial({ color: '#e8eef6', transparent: true, opacity: 0.7, roughness: 1 }), PUFF * smokeFrom.length);
  smoke.frustumCulled = false; smoke.userData.keep = true; g.add(smoke);

  // ── Pista de patinação com patinadores girando.
  const RX = 0.17, RZ = 0.14, rr = 0.065;
  // Gelo acompanhando a curva do planeta, sempre um pouco acima da neve (um disco reto deixava a neve atravessar a
  // pista nas bordas), e a mureta de neve também curvada em volta.
  const iceGeo = new THREE.CircleGeometry(rr, 48, 0, TAU); iceGeo.rotateX(-Math.PI / 2);
  { const p = iceGeo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i) + RX, p.getZ(i) + RZ) + FLOOR + 0.0014); iceGeo.computeVertexNormals(); }
  const ice = new THREE.Mesh(iceGeo, new THREE.MeshStandardMaterial({ color: '#cfeeff', roughness: 0.08, metalness: 0.25, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); ice.position.set(RX, 0, RZ); g.add(ice);
  const rimPts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU, x = Math.cos(a) * rr, z = Math.sin(a) * rr; rimPts.push(new THREE.Vector3(x, sag(x + RX, z + RZ) + FLOOR + 0.0022, z)); }
  const rim = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts, true), 96, 0.0035, 6, true), mat('#ffffff')); rim.position.set(RX, 0, RZ); g.add(rim);
  for (let k = 0; k < 16; k++) { const a = k / 16 * TAU; const x = RX + Math.cos(a) * (rr + 0.006), z = RZ + Math.sin(a) * (rr + 0.006); cyl(0.0008, 0.008, '#d9414a', x, Y(x, z) + 0.001, z, g, 5); }
  const SK = 7, skaters = figures(g, SK, ['#d9414a', '#3f7fe8', '#ffd23f', '#ffffff', '#3ee07a', '#ff7bb0', '#b07cff']);
  const skInfo = Array.from({ length: SK }, (_, k) => ({ r: 0.022 + (k % 3) * 0.013, w: 0.5 + (k % 2) * 0.15, a0: k * TAU / SK, ph: R() * TAU }));
  skaters.host.userData.anim = t => {
    skInfo.forEach((s, k) => {
      const a = s.a0 + t * s.w, x = RX + Math.cos(a) * s.r, z = RZ + Math.sin(a) * s.r, glide = Math.sin(t * 2.6 + s.ph);
      skaters.place(k, x, sag(x, z) + FLOOR + 0.0016, z, -a, glide * 0.8, 0.18 + 0.12 * Math.abs(glide), 0.18);
    });
    skaters.done();
  };
  animated.push(skaters.host);

  // ── Bonecos de neve (com cachecol, cartola e nariz de cenoura) e criançada em volta.
  const snowman = (x, z, s0, scarf) => {
    const y = Y(x, z) + 0.001;
    [[0.011, 0.009], [0.008, 0.023], [0.0058, 0.034]].forEach(([r, yy]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r * s0, 12, 8), mat('#fbfdff')); b.position.set(x, y + yy * s0, z); g.add(b); });
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0012 * s0, 0.006 * s0, 6), mat('#ff8a2a')); nose.rotation.x = Math.PI / 2; nose.position.set(x, y + 0.034 * s0, z + 0.0075 * s0); g.add(nose);
    const sc = new THREE.Mesh(new THREE.TorusGeometry(0.0065 * s0, 0.0016 * s0, 5, 14), mat(scarf)); sc.rotation.x = Math.PI / 2; sc.position.set(x, y + 0.029 * s0, z); g.add(sc);
    cyl(0.005 * s0, 0.0008 * s0, '#1a1d24', x, y + 0.0388 * s0, z, g, 10); cyl(0.0036 * s0, 0.007 * s0, '#1a1d24', x, y + 0.0395 * s0, z, g, 10);
    for (const s1 of [-1, 1]) { const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.0005 * s0, 0.0005 * s0, 0.014 * s0, 4), mat('#5a3a28')); arm.position.set(x + s1 * 0.012 * s0, y + 0.025 * s0, z); arm.rotation.z = s1 * 1.0; g.add(arm); }
    for (let i = 0; i < 3; i++) { const bt = new THREE.Mesh(new THREE.SphereGeometry(0.0009 * s0, 5, 4), mat('#1a1d24')); bt.position.set(x, y + (0.02 + i * 0.004) * s0, z + 0.0078 * s0 - i * 0.0002); g.add(bt); }
  };
  snowman(-0.15, 0.17, 1.15, '#d9414a'); snowman(-0.05, 0.22, 0.9, '#3f7fe8'); snowman(0.27, -0.09, 1, '#3ee07a');
  crowd(g, [[-0.165, 0.19], [-0.135, 0.19], [-0.06, 0.24]].map(([x, z]) => [x, z, Y(x, z) + 0.0016]), zi, ['#ffd23f', '#ff7bb0', '#7fe9ff'], { fx: fxT2 });

  // ── Postes com guirlanda e varais de luzinhas ligando os postes em volta da praça.
  const posts = Array.from({ length: 8 }, (_, k) => { const a = k / 8 * TAU + 0.2; return [TREE_X + Math.cos(a) * 0.125, TREE_Z + Math.sin(a) * 0.125]; });
  posts.forEach(([x, z]) => { lamp(g, x, z, Y(x, z), 0.04); const wr = new THREE.Mesh(new THREE.TorusGeometry(0.0045, 0.0015, 5, 12), mat('#1f6b46')); wr.position.set(x, Y(x, z) + 0.026, z); wr.lookAt(TREE_X, Y(x, z) + 0.026, TREE_Z); g.add(wr); const rb = new THREE.Mesh(new THREE.SphereGeometry(0.0015, 6, 4), mat('#d9414a')); rb.position.set(x, Y(x, z) + 0.022, z); g.add(rb); });
  const STR = 12, BULBS = posts.length * STR, bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0014, 5, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), BULBS);
  posts.forEach(([x0, z0], k) => {
    const [x1, z1] = posts[(k + 1) % posts.length];
    for (let i = 0; i < STR; i++) { const u = (i + 0.5) / STR, x = x0 + (x1 - x0) * u, z = z0 + (z1 - z0) * u; o.position.set(x, Y(x, z) + 0.036 - Math.sin(u * Math.PI) * 0.01, z); o.scale.setScalar(1); o.updateMatrix(); bulbs.setMatrixAt(k * STR + i, o.matrix); bulbs.setColorAt(k * STR + i, lightC[(k + i) % lightC.length]); }
  });
  bulbs.frustumCulled = false; bulbs.userData.keep = true; g.add(bulbs);

  // ── Portal da vila: dois bastões de doce listrados e a faixa VILA DE NATAL.
  const caneTex = canvasTex(32, 128, (x, w, h) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h); x.fillStyle = '#d9414a'; for (let i = -4; i < 12; i++) { x.beginPath(); x.moveTo(0, i * 16); x.lineTo(w, i * 16 - 12); x.lineTo(w, i * 16 - 4); x.lineTo(0, i * 16 + 8); x.fill(); } });
  for (const s0 of [-1, 1]) {
    const x = s0 * 0.05, z = 0.33, y = Y(x, z);
    const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.06, 10), new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.4 })); cane.position.set(x, y + 0.03, z); g.add(cane);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.008, 0.0035, 8, 14, Math.PI), new THREE.MeshStandardMaterial({ map: caneTex, roughness: 0.4 })); hook.position.set(x - s0 * 0.008, y + 0.06, z); hook.rotation.y = s0 > 0 ? 0 : Math.PI; g.add(hook);
  }
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.016), new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide, map: canvasTex(320, 52, (x, w, h) => {
    x.fillStyle = '#b3222b'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ffd23f'; x.lineWidth = 3; x.strokeRect(3, 3, w - 6, h - 6);
    x.fillStyle = '#ffffff'; x.font = 'bold 28px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('VILA DE NATAL', w / 2, h / 2 + 1);
  }) }));
  banner.position.set(0, Y(0, 0.33) + 0.052, 0.33); g.add(banner);

  // ── Pinheiros nevados na borda e bastões de doce enfeitando os caminhos.
  const PINES = 40, pineG = new THREE.ConeGeometry(0.016, 0.05, 7).translate(0, 0.031, 0), pineS = new THREE.ConeGeometry(0.008, 0.016, 7).translate(0, 0.05, 0);
  const pines = new THREE.InstancedMesh(pineG, new THREE.MeshStandardMaterial({ roughness: 0.8, flatShading: true }), PINES), pinesS = new THREE.InstancedMesh(pineS, new THREE.MeshStandardMaterial({ color: '#f6fbff', roughness: 0.9, flatShading: true }), PINES);
  const trunkI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.003, 0.003, 0.01, 5).translate(0, 0.005, 0), mat('#6b4a33'), PINES);
  for (let i = 0; i < PINES; i++) {
    const a = i / PINES * TAU + Math.sin(i * 3.1) * 0.08, r0 = 0.34 + (i % 3) * 0.028;
    const x = Math.cos(a) * r0, z = Math.sin(a) * r0; if (z > 0.28 && Math.abs(x) < 0.09) { pines.setMatrixAt(i, zero); pinesS.setMatrixAt(i, zero); trunkI.setMatrixAt(i, zero); continue; }
    o.position.set(x, Y(x, z), z); o.rotation.set(0, i, 0); o.scale.setScalar(0.8 + (i % 4) * 0.15); o.updateMatrix();
    pines.setMatrixAt(i, o.matrix); pinesS.setMatrixAt(i, o.matrix); trunkI.setMatrixAt(i, o.matrix); pines.setColorAt(i, col.set(i % 2 ? '#1f6b46' : '#2c7f52'));
  }
  g.add(pines, pinesS, trunkI);

  // ── Gente passeando de gorro vermelho pelos caminhos.
  walkers(g, [
    Array.from({ length: 20 }, (_, i) => { const a = i / 20 * TAU; return [TREE_X + Math.cos(a) * 0.105, TREE_Z + Math.sin(a) * 0.105]; }),
    [[-0.012, 0.33], [-0.012, 0.09], [0.012, 0.09], [0.012, 0.33]],
    [[-0.09, -0.07], [-0.2, -0.15], [-0.19, -0.16], [-0.08, -0.08]]
  ], 4, ['#3f7fe8', '#ffffff', '#1f6b46', '#ffd23f', '#b07cff'], (x, z) => Y(x, z) + 0.0016, 'santa');

  // ── Neve caindo (sempre; na Nevasca engrossa, cai mais rápido e venta de lado).
  const FLAKES = 900, flakePos = new Float32Array(FLAKES * 3), flakeV = new Float32Array(FLAKES);
  for (let i = 0; i < FLAKES; i++) { const a = R() * TAU, r0 = Math.sqrt(R()) * 0.42; flakePos[i * 3] = Math.cos(a) * r0; flakePos[i * 3 + 1] = R() * 0.32; flakePos[i * 3 + 2] = Math.sin(a) * r0; flakeV[i] = 0.6 + R() * 0.8; }
  const flakeGeo = new THREE.BufferGeometry(); flakeGeo.setAttribute('position', new THREE.BufferAttribute(flakePos, 3));
  const flakes = new THREE.Points(flakeGeo, new THREE.PointsMaterial({ color: '#ffffff', size: 0.0032, transparent: true, opacity: 0.9, depthWrite: false }));
  flakes.frustumCulled = false; flakes.userData.keep = true; g.add(flakes);
  flakeGeo.setDrawRange(0, FLAKES / 3);

  // ── Trenó do Papai Noel com as renas (voa em volta da vila; no botão, passa baixinho).
  const sleigh = new THREE.Group(); sleigh.userData.keep = true; g.add(sleigh);
  const sp = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, mat(c)); m.position.set(x, y, z); sleigh.add(m); return m; };
  sp(new THREE.BoxGeometry(0.022, 0.008, 0.012), '#c4202b', 0, 0.006, 0); sp(new THREE.BoxGeometry(0.006, 0.012, 0.012), '#c4202b', -0.009, 0.01, 0);
  for (const s0 of [-1, 1]) sp(new THREE.BoxGeometry(0.028, 0.0012, 0.0012), '#ffd23f', 0.002, 0.0015, s0 * 0.005);
  sp(new THREE.SphereGeometry(0.0045, 8, 6), '#c4202b', -0.002, 0.0145, 0); sp(new THREE.SphereGeometry(0.0028, 8, 6), '#f1c9a5', -0.002, 0.021, 0);
  sp(new THREE.ConeGeometry(0.0028, 0.006, 8), '#c4202b', -0.002, 0.0255, 0); sp(new THREE.SphereGeometry(0.002, 6, 4), '#ffffff', 0.0005, 0.0195, 0);
  sp(new THREE.SphereGeometry(0.0045, 8, 6), '#7a5a3a', -0.008, 0.0145, 0);
  for (let k = 0; k < 4; k++) {
    const rx = 0.02 + Math.floor(k / 2) * 0.016, rz = (k % 2 ? 1 : -1) * 0.004;
    sp(new THREE.BoxGeometry(0.01, 0.005, 0.0045), '#8a5a3c', rx, 0.008, rz); sp(new THREE.BoxGeometry(0.004, 0.006, 0.003), '#8a5a3c', rx + 0.006, 0.012, rz);
    for (const s0 of [-1, 1]) sp(new THREE.BoxGeometry(0.0012, 0.006, 0.0012), '#5a3a28', rx + s0 * 0.003, 0.003, rz);
    if (k === 3) sp(new THREE.SphereGeometry(0.0011, 6, 4), '#ff3b3b', rx + 0.0085, 0.0125, rz);
  }
  (rt.track ||= {}).sleigh = sleigh;
  const trail = confetti(g, 0, 0, 0, { up: 0.004, spread: 0.02, grav: 0.01, size: 0.003, n: 30 });
  const night = nightSky(g, TREE_X, ty, TREE_Z, 0.5, [0.2, 0.33, -0.25]);

  const lightsBase = lightC; let chase = 0;
  anims.push(t => {
    const f = fxT(zi), on = f < 0 ? 0 : smooth(0, 1.2, f) * (1 - smooth(9.5, 10.5, f)), nk = f < 0 ? 0 : smooth(1.2, 2.6, f) * (1 - smooth(8.3, 9.3, f));
    night.set(nk, t);
    // Luzes: piscam devagar; acesas, uma onda de brilho sobe pela árvore.
    for (let i = 0; i < LIGHTS; i++) {
      const tw = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7), wave = on * Math.max(0, Math.sin((lightY[i] * 6 - t * 3) * Math.PI)) ;
      col.copy(lightsBase[(i + (on > 0.5 ? Math.floor(t * 4) : 0)) % lightsBase.length]).multiplyScalar(0.45 + tw * 0.55 + wave * 1.2); lights.setColorAt(i, col);
    }
    lights.instanceColor.needsUpdate = true;
    const dtL = Math.min(0.05, Math.max(0, t - (bulbs.userData.t ?? t))); bulbs.userData.t = t; chase += dtL * (1 + on * 3);
    for (let i = 0; i < BULBS; i++) { const tw = Math.sin(t * 2.2 + i * 0.9) > -0.2 ? 1 : 0.35; col.copy(lightsBase[(i + Math.floor(chase)) % lightsBase.length]).multiplyScalar(tw); bulbs.setColorAt(i, col); }
    bulbs.instanceColor.needsUpdate = true;
    star.rotation.y = t * 0.8; star.material.emissiveIntensity = 0.8 + on * (1.4 + Math.sin(t * 6) * 0.4); halo.material.opacity = 0.12 + on * 0.25; halo.scale.setScalar(1 + on * (0.6 + Math.sin(t * 4) * 0.15));
    if (f > 1.4 && f < 1.5 && sparkle.userData.at < t - 3) sparkle.userData.at = t;
    // Fumaça das chaminés.
    smokeFrom.forEach((p, h) => { for (let i = 0; i < PUFF; i++) { const u = ((t * 0.25 + i / PUFF + h * 0.13) % 1); o.position.set(p.x + u * 0.012 + Math.sin(t + i) * 0.002, p.y + u * 0.04, p.z); o.scale.setScalar(0.6 + u * 1.4); o.rotation.set(i, u * 2, 0); o.updateMatrix(); smoke.setMatrixAt(h * PUFF + i, o.matrix); } });
    smoke.instanceMatrix.needsUpdate = true;
    // Neve.
    const n2 = fxT2(zi), storm = n2 < 0 ? 0 : smooth(0, 1.5, n2) * (1 - smooth(9, 11, n2));
    flakeGeo.setDrawRange(0, Math.floor(FLAKES * (0.33 + storm * 0.67)));
    const fall = 0.018 + storm * 0.03, wind = storm * 0.03;
    for (let i = 0; i < FLAKES; i++) {
      let y = flakePos[i * 3 + 1] - flakeV[i] * fall * 0.016;
      flakePos[i * 3] += (Math.sin(t * 1.3 + i) * 0.0002 + wind * 0.016);
      if (y < 0 || flakePos[i * 3] > 0.42) { y = 0.3 + R() * 0.03; const a = R() * TAU, r0 = Math.sqrt(R()) * 0.42; flakePos[i * 3] = Math.cos(a) * r0 - wind * 2; flakePos[i * 3 + 2] = Math.sin(a) * r0; }
      flakePos[i * 3 + 1] = y;
    }
    flakeGeo.attributes.position.needsUpdate = true;
    flakes.material.size = 0.0032 + storm * 0.0012;
    // Trenó: volta alta e lenta; no botão, desce e passa rasante pela vila com rastro de brilho.
    // A volta é somada quadro a quadro (antes a velocidade multiplicava o relógio inteiro e o trenó disparava ao mudar
    // de ritmo); no botão ele só acelera um pouco, desce e chega mais perto, tudo suave.
    const dtS = Math.min(0.05, Math.max(0, t - (sleigh.userData.t ?? t))); sleigh.userData.t = t;
    const s3 = fxT3(zi), lowT = s3 < 0 ? 0 : smooth(0, 2, s3) * (1 - smooth(9.5, 11.5, s3));
    sleigh.userData.low = (sleigh.userData.low ?? 0) + (lowT - (sleigh.userData.low ?? 0)) * Math.min(1, dtS * 2); const low = sleigh.userData.low;
    sleigh.userData.a = (sleigh.userData.a ?? 0) + dtS * (0.2 + low * 0.12);
    const a = sleigh.userData.a, rad = 0.36 - low * 0.12, hgt = 0.26 - low * 0.14 + Math.sin(t * 1.1) * 0.006;
    sleigh.position.set(TREE_X + Math.cos(a) * rad, ty + hgt, TREE_Z + Math.sin(a) * rad); sleigh.rotation.set(0, -a - Math.PI / 2, 0.06 + Math.sin(t * 1.1) * 0.03);
    if (low > 0.5 && trail.userData.at < t - 0.4) { trail.position.copy(sleigh.position); trail.userData.at = t; }
  });

  const host = new THREE.Object3D(); host.userData.keep = true; host.userData.detail = true; g.add(host);
  host.userData.anim = t => { for (const fn of anims) fn(t); };
  animated.push(host);
}

export { buildNatal };
