import * as THREE from 'three';
import { TAU, smooth } from '../../core/math.js';
import { box, cyl, draped, hipRoof, mat, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { confetti, lamp, palm, tree } from '../props.js';
import { animated, fxT, fxT2, fxT3, fxT4, rt } from '../runtime.js';
import { canvasTex, facadeMat, holoMat } from '../textures.js';
import { busParts, bx, paintGeo, vehMat } from '../vehicles.js';

// Educação: o Campus da Educação, numa área maior. Escola principal com painéis solares, escola amarela com a torre
// do sino, laboratório de realidade virtual (alunos de óculos e o sistema solar em holograma na "Aula em VR"),
// biblioteca, sala maker com braço robótico, observatório que abre, anfiteatro ao ar livre, feira de ciências
// (vulcão e foguete de garrafa PET), quadra com pista de corrida, horta, coleta seletiva, parquinho, ônibus escolar,
// átomo holográfico e livro flutuante. O relevo fica ~4 mm acima da base da área: o piso vai a +0.0058 e os objetos
// partem de +0.0042.
const Y = (x, z) => sag(x, z) + 0.0042;

// Piso do campus: grama com caminhos claros, a borda sumindo no terreno.
function campusFloor(g, r) {
  const S = 512, k = S / (2 * r), px = u => (u + r) * k;
  const tex = canvasTex(S, S, (x, w, h) => {
    x.fillStyle = '#5fcf95'; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) { x.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,60,30,.06)'; x.fillRect(Math.random() * w, Math.random() * h, 3, 3); }
    x.strokeStyle = '#efe7d6'; x.lineCap = 'round';
    const path = (pts, wd) => { x.lineWidth = wd * k; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(px(a), px(b)) : x.moveTo(px(a), px(b)))); x.stroke(); };
    path([[-0.42, 0.0], [0.42, 0.0]], 0.034); path([[0, -0.42], [0, 0.42]], 0.034);
    path([[-0.3, -0.12], [-0.3, 0.3]], 0.024); path([[0.36, -0.2], [0.36, 0.2]], 0.024); path([[-0.2, -0.33], [0.2, -0.33]], 0.024);
    x.beginPath(); x.arc(px(0), px(0), 0.11 * k, 0, TAU); x.fillStyle = '#efe7d6'; x.fill();
    x.beginPath(); x.arc(px(0), px(0), 0.085 * k, 0, TAU); x.fillStyle = '#66d39b'; x.fill();
    const gr = x.createRadialGradient(w / 2, h / 2, w * 0.42, w / 2, h / 2, w / 2); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,1)');
    x.globalCompositeOperation = 'destination-out'; x.fillStyle = gr; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
  const geo = new THREE.RingGeometry(0.0005, r, 96, 24); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, sag(p.getX(i), p.getZ(i)) + 0.0058);
  geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 0.92 })));
}

function buildEducation(g, zi) {
  campusFloor(g, 0.54);

  // ── Escola principal (prédio branco com faixa de vidro, colunas e painéis solares) e torre de salas.
  const z0 = -0.22, y0 = Y(0.02, z0);
  box(0.3, 0.07, 0.09, C.white, 0.02, y0, z0, g);
  box(0.29, 0.014, 0.092, '#9fe9ff', 0.02, y0 + 0.026, z0, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
  box(0.31, 0.008, 0.1, C.ice, 0.02, y0 + 0.07, z0, g);
  for (let i = 0; i < 6; i++) { const x = -0.09 + i * 0.044; cyl(0.0055, 0.062, C.white, x, Y(x, z0 + 0.054), z0 + 0.054, g, 8); }
  for (let i = 0; i < 5; i++) { const x = -0.09 + i * 0.055, p = box(0.045, 0.003, 0.032, '#1e4488', x, y0 + 0.081, z0 - 0.01, g, { metalness: 0.5, roughness: 0.25 }); p.rotation.x = 0.35; }
  box(0.08, 0.12, 0.08, C.ice, -0.17, Y(-0.17, z0), z0, g);
  box(0.06, 0.012, 0.082, '#9fe9ff', -0.17, Y(-0.17, z0) + 0.08, z0, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
  // Letreiro "ESCOLA" na fachada.
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.018), new THREE.MeshBasicMaterial({ map: canvasTex(200, 36, (x, w, h) => { x.fillStyle = '#1e4488'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('ESCOLA', w / 2, h / 2 + 1); }), toneMapped: false }));
  sign.position.set(0.02, y0 + 0.058, z0 + 0.0461); g.add(sign);

  // ── Escola amarela com telhado, torre do sino e relógio.
  const sx = 0.27, sz = -0.2, sy = Y(sx, sz);
  const school = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.065), facadeMat('#f2c14e', null, '#1e4488')); school.position.set(sx, sy + 0.03, sz); g.add(school);
  const sroof = hipRoof(0.108, 0.073, 0.028, C.terracotta); sroof.position.set(sx, sy + 0.074, sz); g.add(sroof);
  box(0.022, 0.044, 0.022, C.white, sx, sy + 0.08, sz, g);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.0065, 16), mat(C.white, { emissive: '#ffffff', emissiveIntensity: 0.4 })); clockFace.position.set(sx, sy + 0.104, sz + 0.0115); g.add(clockFace);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.016, 4), mat(C.terracotta)); bell.rotation.y = Math.PI / 4; bell.position.set(sx, sy + 0.132, sz); g.add(bell);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.0009, 0.0055, 0.0006), mat(C.dark)); hand.geometry.translate(0, 0.0026, 0); hand.position.set(sx, sy + 0.104, sz + 0.0122); hand.userData.keep = true; g.add(hand);

  // ── Laboratório de realidade virtual: pavilhão de vidro, alunos de óculos e o sistema solar em holograma.
  const lx = -0.3, lz = 0.02, ly = Y(lx, lz);
  box(0.15, 0.006, 0.11, '#dfe7ee', lx, ly, lz, g);
  box(0.15, 0.004, 0.11, C.white, lx, ly + 0.056, lz, g);
  for (const [dx, dz] of [[-0.072, -0.052], [0.072, -0.052], [-0.072, 0.052], [0.072, 0.052]]) box(0.005, 0.05, 0.005, C.white, lx + dx, ly + 0.006, lz + dz, g);
  const labGlass = new THREE.Mesh(new THREE.BoxGeometry(0.144, 0.05, 0.104), new THREE.MeshStandardMaterial({ color: '#9fe9ff', transparent: true, opacity: 0.22, roughness: 0.1, metalness: 0.2, depthWrite: false }));
  labGlass.position.set(lx, ly + 0.031, lz); g.add(labGlass);
  box(0.06, 0.008, 0.002, '#00b7e3', lx, ly + 0.048, lz + 0.0535, g, { emissive: '#00b7e3', emissiveIntensity: 1.4 });
  const seats = Array.from({ length: 8 }, (_, k) => [lx - 0.045 + (k % 4) * 0.03, lz - 0.02 + Math.floor(k / 4) * 0.04, ly + 0.006]);
  crowd(g, seats, zi, ['#1e4488', '#00b7e3', '#ffffff', '#2a3446'], { fx: fxT3 });
  // Óculos VR nos alunos (uma geometria só, instanciada).
  const visor = new THREE.InstancedMesh(paintGeo([[bx(0.0068, 0.0032, 0.0034, 0, 0, 0), '#eef4fb'], [bx(0.0056, 0.0018, 0.0006, 0, 0.0007, 0.0018), '#00b7e3']]), vehMat(), seats.length);
  seats.forEach(([x, z, y], k) => { const o = new THREE.Object3D(); o.position.set(x, y + 0.0145, z + 0.002); o.updateMatrix(); visor.setMatrixAt(k, o.matrix); });
  visor.userData.detail = true; g.add(visor);
  // Sistema solar em holograma sobre o laboratório (fraco sempre; forte na Aula em VR).
  const solar = new THREE.Group(), soy = ly + 0.13; solar.position.set(lx, soy, lz); solar.userData.keep = true; g.add(solar);
  const sun = new THREE.Mesh(new THREE.IcosahedronGeometry(0.014, 1), holoMat('#ffd28a', 0.9)); solar.add(sun);
  const orbitM = holoMat('#7fe9ff', 0.35);
  const planets = [[0.03, 0.004, '#9fe9ff', 1.6], [0.046, 0.006, '#3ee07a', 1.1], [0.064, 0.005, '#ff8a6b', 0.8], [0.084, 0.008, '#ffc56b', 0.5]].map(([r, s, c, sp]) => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.0007, 4, 64), orbitM); ring.rotation.x = Math.PI / 2; solar.add(ring);
    const pl = new THREE.Mesh(new THREE.SphereGeometry(s, 10, 8), holoMat(c, 0.95)); solar.add(pl); return { pl, r, sp };
  });
  const solarBeam = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.075, 18, 1, true), holoMat('#00b7e3', 0.1)); solarBeam.position.set(lx, ly + 0.095, lz); solarBeam.userData.keep = true; g.add(solarBeam);

  // ── Biblioteca (colunas e estantes coloridas na fachada) e sala maker com braço robótico.
  const bxL = -0.22, bzL = -0.36, byL = Y(bxL, bzL);
  const shelfTex = canvasTex(96, 48, (x, w, h) => {
    x.fillStyle = '#f4efe6'; x.fillRect(0, 0, w, h); const cs = ['#e8452f', '#1e4488', '#3aa58c', '#ffc56b', '#8f84ff', '#00b7e3'];
    for (let r = 0; r < 3; r++) { x.fillStyle = '#7a5b45'; x.fillRect(4, 6 + r * 14 + 10, w - 8, 2); for (let k = 0; k < 14; k++) { x.fillStyle = cs[(k + r * 2) % 6]; x.fillRect(6 + k * 6, 6 + r * 14, 4, 10); } }
  });
  box(0.11, 0.055, 0.07, '#f4efe6', bxL, byL, bzL, g);
  const shelves = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.045), new THREE.MeshStandardMaterial({ map: shelfTex, roughness: 0.8 })); shelves.position.set(bxL, byL + 0.0265, bzL + 0.0352); g.add(shelves);
  const libRoof = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.115, 16, 1, false, 0, Math.PI), mat('#3f7fc4')); libRoof.rotation.z = Math.PI / 2; libRoof.position.set(bxL, byL + 0.055, bzL); g.add(libRoof);
  for (let i = 0; i < 4; i++) { const x = bxL - 0.042 + i * 0.028; cyl(0.004, 0.05, C.white, x, Y(x, bzL + 0.04), bzL + 0.04, g, 8); }
  const mkx = -0.06, mkz = -0.38, mky = Y(mkx, mkz);
  box(0.09, 0.045, 0.06, '#e8eef4', mkx, mky, mkz, g);
  box(0.092, 0.006, 0.062, '#ff8a6b', mkx, mky + 0.045, mkz, g);
  box(0.05, 0.003, 0.03, '#2a3446', mkx, mky + 0.051, mkz, g);
  const arm = new THREE.Group(); arm.position.set(mkx, mky + 0.054, mkz); arm.userData.keep = true; g.add(arm);
  const armBase = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.006, 10), mat('#ffc56b')); armBase.position.y = 0.003; arm.add(armBase);
  const seg1 = new THREE.Group(); seg1.position.y = 0.006; arm.add(seg1);
  const l1 = new THREE.Mesh(new THREE.BoxGeometry(0.004, 0.026, 0.004), mat('#ffc56b')); l1.position.y = 0.013; seg1.add(l1);
  const seg2 = new THREE.Group(); seg2.position.y = 0.026; seg1.add(seg2);
  const l2 = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.02, 0.0035), mat('#ffc56b')); l2.position.y = 0.01; seg2.add(l2);
  const claw = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.003, 0.005), mat(C.dark)); claw.position.y = 0.021; seg2.add(claw);
  const part = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.006, 0.006), mat('#00b7e3', { emissive: '#00b7e3', emissiveIntensity: 0.6 })); part.position.set(0.012, 0.003, 0); arm.add(part);

  // ── Observatório: cúpula em duas metades que se abrem e telescópio que sobe.
  const ox = 0.36, oz = 0.0, oy = Y(ox, oz);
  cyl(0.05, 0.05, C.ice, ox, oy, oz, g, 20);
  const halves = [0, 1].map(k => {
    const piv = new THREE.Group(); piv.position.set(ox, oy + 0.05, oz); piv.userData.keep = true; g.add(piv);
    piv.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8, k * Math.PI, Math.PI, 0, Math.PI / 2), mat(C.white)));
    return piv;
  });
  const scope = new THREE.Group(); scope.position.set(ox, oy + 0.03, oz); scope.userData.keep = true; g.add(scope);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.08, 10), mat(C.dark)); tube.position.y = 0.03; scope.add(tube);

  // ── Pátio central: átomo holográfico e livro aberto flutuando.
  const atom = new THREE.Group(), ay = Y(0, 0) + 0.15; atom.position.set(0, ay, 0); g.add(atom);
  atom.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.013, 1), holoMat('#7fe9ff', 0.9)));
  const electrons = [0, 1, 2].map(k => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0016, 6, 48), holoMat('#00b7e3', 0.6)); ring.rotation.set(k * 1.05, k * 0.6, 0); atom.add(ring);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), holoMat('#ffffff', 1)); ring.add(e); return e;
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.13, 16, 1, true), holoMat('#00b7e3', 0.12)); beam.position.set(0, ay - 0.075, 0); g.add(beam); beam.userData.keep = true;
  const book = new THREE.Group(), bky = Y(-0.12, 0.06) + 0.1; book.position.set(-0.12, bky, 0.06); g.add(book);
  for (const s of [-1, 1]) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.003, 0.064), mat(C.coral)); cover.geometry.translate(s * 0.024, -0.003, 0); cover.rotation.z = s * 0.25; book.add(cover);
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.003, 0.06), mat(C.white)); page.geometry.translate(s * 0.0225, 0, 0); page.rotation.z = s * 0.25; book.add(page);
  }
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.0015, 0.058), mat(C.white)); leaf.geometry.translate(0.022, 0.002, 0); book.add(leaf);
  for (const [x, z] of [[0.075, 0.045], [-0.075, -0.045], [0.075, -0.045], [-0.075, 0.045]]) { box(0.024, 0.006, 0.007, '#a07a5a', x, Y(x, z) + 0.004, z, g); box(0.024, 0.008, 0.002, '#a07a5a', x, Y(x, z) + 0.008, z - 0.003, g); }

  // ── Feira de ciências: três barracas, o vulcão e o foguete de garrafa PET.
  const fz = 0.15;
  [[-0.08, '#ff8a6b'], [0.0, '#00b7e3'], [0.12, '#8f84ff']].forEach(([x, c]) => {
    box(0.044, 0.016, 0.022, C.white, x, Y(x, fz), fz, g);
    for (const s of [-1, 1]) box(0.002, 0.03, 0.002, C.dark, x + s * 0.02, Y(x, fz), fz - 0.009, g);
    box(0.048, 0.003, 0.026, c, x, Y(x, fz) + 0.03, fz - 0.002, g);
  });
  box(0.012, 0.006, 0.008, '#3aa58c', -0.088, Y(-0.088, fz) + 0.016, fz, g); box(0.008, 0.01, 0.008, '#e8452f', -0.072, Y(-0.072, fz) + 0.016, fz, g);
  const globe = new THREE.Mesh(new THREE.SphereGeometry(0.007, 12, 8), mat('#3f7fc4')); globe.position.set(0.12, Y(0.12, fz) + 0.024, fz); g.add(globe);
  const vx = 0.0, vy = Y(vx, fz) + 0.016;
  const volcano = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.016, 10), mat('#8a5a3c')); volcano.position.set(vx, vy + 0.008, fz); g.add(volcano);
  const lava = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.0022, 0), new THREE.MeshBasicMaterial({ color: '#ff6b3a', toneMapped: false }), 24); lava.frustumCulled = false; lava.userData.detail = true; g.add(lava);
  const lavaV = Array.from({ length: 24 }, (_, i) => new THREE.Vector3(Math.cos(i * 2.4) * (0.02 + (i % 5) * 0.006), 0.07 + (i % 7) * 0.012, Math.sin(i * 2.4) * (0.02 + (i % 5) * 0.006)));
  const rocket = new THREE.Group(), rx0 = 0.06, rz0 = 0.19, ry0 = Y(rx0, rz0); rocket.position.set(rx0, ry0, rz0); rocket.userData.keep = true; g.add(rocket);
  const bottle = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.018, 10), mat('#9fe9ff', { transparent: true, opacity: 0.8 })); bottle.position.y = 0.012; rocket.add(bottle);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.007, 10), mat('#e8452f')); nose.position.y = 0.0245; rocket.add(nose);
  for (let k = 0; k < 3; k++) { const fin = new THREE.Mesh(new THREE.BoxGeometry(0.0005, 0.006, 0.004), mat('#e8452f')); fin.position.set(Math.cos(k * TAU / 3) * 0.004, 0.005, Math.sin(k * TAU / 3) * 0.004); fin.rotation.y = -k * TAU / 3; rocket.add(fin); }
  box(0.004, 0.003, 0.004, C.dark, rx0, ry0, rz0, g);
  const spray = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0016, 6, 4), holoMat('#bfefff', 0.8), 14); spray.frustumCulled = false; spray.userData.detail = true; g.add(spray);
  const cheer = confetti(g, 0.03, Y(0.03, fz) + 0.05, fz);

  // ── Quadra poliesportiva cercada pela pista de corrida.
  const qx = 0.13, qz = 0.29, qy = Y(qx, qz);
  const trackM = new THREE.MeshStandardMaterial({ roughness: 0.85, alphaTest: 0.5, map: canvasTex(256, 160, (x, w, h) => {
    x.fillStyle = '#c8643f'; x.beginPath(); x.roundRect(0, 0, w, h, 70); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.7)'; x.lineWidth = 1.5; for (let l = 1; l < 4; l++) { x.beginPath(); x.roundRect(l * 8, l * 8, w - l * 16, h - l * 16, 70 - l * 8); x.stroke(); }
    x.fillStyle = '#5fcf95'; x.beginPath(); x.roundRect(34, 34, w - 68, h - 68, 40); x.fill();
  }) });
  draped(0.26, 0.002, 0.16, '#ffffff', qx, qz, g, 0.0044).material = trackM;
  const courtM = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(128, 80, (x, w, h) => {
    x.fillStyle = '#2f7fc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8452f'; x.fillRect(10, 8, w - 20, h - 16);
    x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.strokeRect(10, 8, w - 20, h - 16); x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 10, 0, TAU); x.stroke();
  }) });
  const court = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.003, 0.075), courtM); court.position.set(qx, qy + 0.004, qz); g.add(court);
  for (const s of [-1, 1]) box(0.003, 0.016, 0.022, C.white, qx + s * 0.058, qy + 0.004, qz, g);
  const players = Array.from({ length: 8 }, (_, k) => [qx + (k % 4 - 1.5) * 0.028, qz + (k < 4 ? -0.017 : 0.017), qy + 0.0055]);
  crowd(g, players, zi, ['#ffffff', '#1e4488', '#00b7e3', '#ffffff', '#2a3446'], { fx: fxT2 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), mat(C.white)); ball.userData.keep = true; g.add(ball);
  // Corredores na pista.
  const lane = Array.from({ length: 24 }, (_, i) => { const a = i / 24 * TAU; return [qx + Math.cos(a) * 0.112, qz + Math.sin(a) * 0.066]; });
  walkers(g, [lane], 4, ['#ff8a6b', '#ffc56b', '#3ee07a', '#ffffff'], (x, z) => Y(x, z) + 0.0012);

  // ── Anfiteatro ao ar livre: degraus em meia-lua, professor e quadro.
  const ax = 0.36, az = 0.22, ayy = Y(ax, az);
  for (let r = 0; r < 3; r++) { const step = new THREE.Mesh(new THREE.CylinderGeometry(0.07 - r * 0.014, 0.07 - r * 0.014, 0.006, 20, 1, false, Math.PI * 0.5, Math.PI), mat(r % 2 ? '#e6ddcc' : '#d3c9b8')); step.position.set(ax, ayy + 0.003 + r * 0.006, az); g.add(step); }
  const board = box(0.05, 0.03, 0.003, '#2f4f3e', ax - 0.075, ayy + 0.012, az, g); board.rotation.y = Math.PI / 2;
  crowd(g, [[ax - 0.06, az, ayy]], zi, ['#1e1645']);
  crowd(g, Array.from({ length: 7 }, (_, k) => { const a = Math.PI * 0.62 + k / 6 * Math.PI * 0.76; return [ax + Math.cos(a) * -0.04, az + Math.sin(a) * 0.04, ayy + 0.012]; }), zi, ['#1e4488', '#00b7e3', '#ffffff', '#ffc56b']);

  // ── Horta, coleta seletiva e parquinho.
  for (let i = 0; i < 4; i++) {
    const x = -0.34 + i * 0.03, z = 0.25;
    box(0.022, 0.008, 0.07, '#7a5b45', x, Y(x, z), z, g);
    for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0055, 0), mat(k % 2 ? '#3aa58c' : '#5fd39a')); v.position.set(x, Y(x, z) + 0.011, z - 0.026 + k * 0.017); g.add(v); }
  }
  box(0.03, 0.03, 0.03, '#7fbfe8', -0.21, Y(-0.21, 0.27), 0.27, g);
  ['#1e4488', '#e8452f', '#3aa58c', '#f2c14e'].forEach((cc, i) => { const x = -0.12 + i * 0.014, z = 0.31; box(0.012, 0.017, 0.012, cc, x, Y(x, z), z, g); box(0.013, 0.002, 0.013, C.dark, x, Y(x, z) + 0.017, z, g); });
  const px0 = -0.18, pz0 = 0.4, py0 = Y(px0, pz0);
  box(0.004, 0.03, 0.004, '#ff8a6b', px0 - 0.02, py0, pz0, g); box(0.004, 0.03, 0.004, '#ff8a6b', px0 + 0.02, py0, pz0, g); box(0.044, 0.003, 0.003, '#ff8a6b', px0, py0 + 0.03, pz0, g);
  const swing = new THREE.Group(); swing.position.set(px0, py0 + 0.03, pz0); swing.userData.keep = true; g.add(swing);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.0015, 0.006), mat('#ffc56b')); seat.position.y = -0.022; swing.add(seat);
  for (const s of [-1, 1]) { const rope = new THREE.Mesh(new THREE.BoxGeometry(0.0006, 0.022, 0.0006), mat(C.dark)); rope.position.set(s * 0.0045, -0.011, 0); swing.add(rope); }
  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.002, 0.04), mat('#00b7e3')); slide.position.set(px0 + 0.06, py0 + 0.012, pz0); slide.rotation.x = 0.55; g.add(slide);
  box(0.012, 0.024, 0.012, '#3ee07a', px0 + 0.06, py0, pz0 - 0.022, g);

  // ── Ônibus escolar, bicicletário, árvores, palmeiras e postes.
  const bus = new THREE.Group(); bus.position.set(0.42, Y(0.42, -0.06), -0.06); g.add(bus);
  bus.add(new THREE.Mesh(paintGeo([...busParts(0.065, 0.022, 0.024, '#ffd23f'), [bx(0.05, 0.003, 0.0226, -0.004, 0.006, 0), '#1a1d24']]).rotateY(Math.PI / 2), vehMat()));
  for (let i = 0; i < 5; i++) { const x = 0.18 + i * 0.012, z = -0.1; const w = new THREE.Mesh(new THREE.TorusGeometry(0.004, 0.0007, 4, 12), mat(C.dark)); w.position.set(x, Y(x, z) + 0.004, z); w.rotation.y = Math.PI / 2; g.add(w); }
  for (const [x, z, s, c] of [[-0.42, -0.1, 0.9], [-0.4, 0.14, 1], [0.44, 0.12, 0.8], [-0.1, -0.46, 0.9], [0.18, -0.42, 0.85], [-0.36, -0.28, 0.9], [0.26, 0.42, 0.9, '#ff7bb0'], [-0.02, 0.44, 0.9, '#ffd23f'], [0.46, -0.24, 0.8]]) tree(g, x, z, s, c, Y(x, z));
  for (const [x, z] of [[0.08, -0.08], [-0.08, 0.08], [0.2, 0.08], [-0.2, -0.08]]) lamp(g, x, z, Y(x, z), 0.045);
  palm(g, 0.47, 0.02, 0.11, Y(0.47, 0.02));

  // ── Estudantes caminhando pelos caminhos do campus.
  const ring = Array.from({ length: 20 }, (_, i) => { const a = i / 20 * TAU; return [Math.cos(a) * 0.098, Math.sin(a) * 0.098]; });
  walkers(g, [ring, [[-0.41, 0.006], [0.41, 0.006], [0.41, -0.006], [-0.41, -0.006]], [[0.006, -0.4], [0.006, 0.4], [-0.006, 0.4], [-0.006, -0.4]]], 6, ['#ffffff', '#1e4488', '#00b7e3', '#2a3446', '#ffc56b'], (x, z) => Y(x, z) + 0.0016);

  // ── Animações (uma função só para a área inteira).
  const o = new THREE.Object3D(), zero = new THREE.Matrix4().makeScale(0, 0, 0);
  atom.userData.anim = t => {
    const f = fxT(zi), k = f < 0 ? 0 : smooth(0, 1.2, f) * (1 - smooth(6, 7.5, f));
    atom.rotation.y = t * (0.6 + (f >= 0 && f < 7 ? 1.8 : 0)); atom.position.y = ay + Math.sin(t * 1.4) * 0.008;
    electrons.forEach((e, i) => { const a = t * (2 + i * 0.7) + i; e.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); });
    halves[0].rotation.x = k * 1.05; halves[1].rotation.x = -k * 1.05;
    scope.position.y = oy + 0.012 + k * 0.03; scope.rotation.z = 0.15 + k * (0.45 + Math.sin(t * 0.8) * 0.15);
    book.position.y = bky + Math.sin(t * 1.1 + 1) * 0.01; book.rotation.y = 0.4 + Math.sin(t * 0.4) * 0.3; leaf.rotation.z = 0.25 + ((t * 0.35) % 1) * (Math.PI - 0.5);
    hand.rotation.z = -t * 0.5;
    // Recreio: bola na quadra e o balanço.
    const r2 = fxT2(zi), on = r2 >= 0 && r2 < 9;
    const bxp = qx + (on ? Math.sin(t * 2.2) * 0.045 : 0), bzp = qz + (on ? Math.sin(t * 3.1) * 0.02 : 0);
    ball.position.set(bxp, qy + 0.009 + (on ? Math.abs(Math.sin(t * 6)) * 0.02 : 0), bzp);
    swing.rotation.x = Math.sin(t * 2.4) * (on ? 0.7 : 0.18);
    // Aula em VR: o sistema solar acende e gira mais rápido.
    const v = fxT3(zi), vr = v < 0 ? 0 : smooth(0, 1, v) * (1 - smooth(9, 10.5, v));
    sun.material.opacity = 0.35 + 0.6 * vr; orbitM.opacity = 0.12 + 0.4 * vr; solarBeam.material.opacity = 0.04 + 0.12 * vr;
    solar.scale.setScalar(0.75 + 0.5 * vr); solar.position.y = soy + vr * 0.02; sun.rotation.y = t;
    planets.forEach(({ pl, r, sp }, i) => { const a = t * sp * (1 + vr * 2) + i * 1.7; pl.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); pl.material.opacity = 0.35 + 0.6 * vr; });
    // Sala maker: o braço pega a peça e devolve.
    const c = (t * 0.5) % 1;
    arm.rotation.y = Math.sin(c * TAU) * 1.2; seg1.rotation.z = 0.5 + Math.sin(c * TAU * 2) * 0.35; seg2.rotation.z = -1 + Math.cos(c * TAU * 2) * 0.4;
    // Feira de ciências: vulcão e foguete.
    const e = fxT4(zi);
    if (e >= 0 && e < 4) {
      for (let i = 0; i < 24; i++) { const a = (e * 1.4 + i / 24) % 1.2, vv = lavaV[i]; o.position.set(vx + vv.x * a, vy + 0.016 + vv.y * a - 0.11 * a * a, fz + vv.z * a); o.scale.setScalar(1 - a * 0.6); o.updateMatrix(); lava.setMatrixAt(i, o.matrix); }
      lava.instanceMatrix.needsUpdate = true; lava.userData.live = true;
    } else if (lava.userData.live) { for (let i = 0; i < 24; i++) lava.setMatrixAt(i, zero); lava.instanceMatrix.needsUpdate = true; lava.userData.live = false; }
    const up = e < 0 ? 0 : e < 0.6 ? 0 : e < 3.4 ? (e - 0.6) : 0, hgt = up > 0 ? Math.max(0, 0.16 * up - 0.03 * up * up) : 0;
    rocket.position.set(rx0 + (up > 0 ? up * 0.01 : 0), ry0 + hgt, rz0); rocket.rotation.z = up > 0 ? -up * 0.08 : 0;
    if (up > 0 && up < 1.2) { for (let i = 0; i < 14; i++) { const a = ((up * 3 + i / 14) % 1) * 0.04; o.position.set(rocket.position.x + Math.sin(i * 7) * a * 0.3, rocket.position.y - a, rz0 + Math.cos(i * 5) * a * 0.3); o.scale.setScalar(1 - a * 20); o.updateMatrix(); spray.setMatrixAt(i, o.matrix); } spray.instanceMatrix.needsUpdate = true; spray.userData.live = true; }
    else if (spray.userData.live) { for (let i = 0; i < 14; i++) spray.setMatrixAt(i, zero); spray.instanceMatrix.needsUpdate = true; spray.userData.live = false; }
    if (e > 2.4 && e < 2.6 && cheer.userData.at < rt.clock - 3) cheer.userData.at = rt.clock;
  };
  animated.push(atom);
  for (let i = 0; i < 24; i++) lava.setMatrixAt(i, zero);
  for (let i = 0; i < 14; i++) spray.setMatrixAt(i, zero);
}

export { buildEducation };
