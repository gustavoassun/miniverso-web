import * as THREE from 'three';
import { TAU, smooth } from '../../core/math.js';
import { box, cyl, hipRoof, mat, sag, zoneFloor } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { tree } from '../props.js';
import { animated, fxT, fxT2 } from '../runtime.js';
import { canvasTex, facadeMat, floors, holoMat } from '../textures.js';
import { busParts, bx, paintGeo, vehMat } from '../vehicles.js';

// Educação (extras): escola com torre do sino, painéis solares, quadra com estudantes, horta, ponto de
// coleta seletiva, ônibus escolar e estudantes caminhando pelo campus.
function eduExtras(g, zi) {
  // Segunda escola, amarela, com telhado, torre do sino e relógio.
  const sx = 0.215, sz = -0.08, sy = sag(sx, sz);
  const school = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.06), facadeMat('#f2c14e', null, '#1e4488')); school.position.set(sx, sy + 0.03, sz); g.add(school);
  const sroof = hipRoof(0.098, 0.068, 0.028, C.terracotta); sroof.position.set(sx, sy + 0.074, sz); g.add(sroof);
  box(0.02, 0.04, 0.02, C.white, sx, sy + 0.08, sz, g);
  const clockFace = new THREE.Mesh(new THREE.CircleGeometry(0.006, 16), mat(C.white, { emissive: '#ffffff', emissiveIntensity: 0.4 })); clockFace.position.set(sx, sy + 0.1, sz + 0.0105); g.add(clockFace);
  const bell = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.016, 4), mat(C.terracotta)); bell.rotation.y = Math.PI / 4; bell.position.set(sx, sy + 0.128, sz); g.add(bell);
  // Painéis solares no teto do prédio principal.
  for (let i = 0; i < 4; i++) { const x = -0.09 + i * 0.06, z = -0.13, p = box(0.045, 0.003, 0.03, '#1e4488', x, sag(x, z) + 0.082, z, g, { metalness: 0.5, roughness: 0.25 }); p.rotation.x = 0.35; }
  // Quadra poliesportiva com traves; os estudantes jogam e comemoram no recreio.
  const qx = 0.07, qz = 0.2, qy = sag(qx, qz);
  const courtM = new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(128, 80, (x, w, h) => {
    x.fillStyle = '#2f7fc4'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8452f'; x.fillRect(10, 8, w - 20, h - 16);
    x.strokeStyle = '#ffffff'; x.lineWidth = 2; x.strokeRect(10, 8, w - 20, h - 16); x.beginPath(); x.moveTo(w / 2, 8); x.lineTo(w / 2, h - 8); x.stroke(); x.beginPath(); x.arc(w / 2, h / 2, 10, 0, TAU); x.stroke();
  }) });
  const court = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.003, 0.08), courtM); court.position.set(qx, qy + 0.002, qz); g.add(court);
  for (const s of [-1, 1]) { box(0.003, 0.016, 0.022, C.white, qx + s * 0.058, qy, qz, g); }
  const players = Array.from({ length: 8 }, (_, k) => [qx + (k % 4 - 1.5) * 0.028, qz + (k < 4 ? -0.018 : 0.018)]);
  crowd(g, players, zi, ['#ffffff', '#1e4488', '#00b7e3', '#ffffff', '#2a3446'], { fx: fxT2 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.004, 10, 8), mat(C.white)); ball.userData.keep = true; g.add(ball);
  ball.userData.anim = t => {
    const f = fxT2(zi), on = f >= 0 && f < 9;
    const x = qx + (on ? Math.sin(t * 2.2) * 0.045 : 0), z = qz + (on ? Math.sin(t * 3.1) * 0.02 : 0);
    ball.position.set(x, sag(x, z) + 0.006 + (on ? Math.abs(Math.sin(t * 6)) * 0.02 : 0), z);
  };
  animated.push(ball);
  // Horta com canteiros.
  for (let i = 0; i < 3; i++) {
    const x = -0.215 + i * 0.03, z = 0.18;
    box(0.022, 0.008, 0.06, '#7a5b45', x, sag(x, z), z, g);
    for (let k = 0; k < 4; k++) { const v = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0055, 0), mat(k % 2 ? '#3aa58c' : '#5fd39a')); v.position.set(x, sag(x, z) + 0.011, z - 0.022 + k * 0.015); g.add(v); }
  }
  // Ponto de coleta seletiva: papel, plástico, vidro e metal.
  ['#1e4488', '#e8452f', '#3aa58c', '#f2c14e'].forEach((cc, i) => { const x = -0.075 + i * 0.013, z = 0.245; box(0.011, 0.016, 0.011, cc, x, sag(x, z), z, g); box(0.012, 0.002, 0.012, C.dark, x, sag(x, z) + 0.016, z, g); });
  // Ônibus escolar estacionado.
  const bus = new THREE.Group(); bus.position.set(0.245, sag(0.245, 0.07), 0.07); g.add(bus);
  bus.add(new THREE.Mesh(paintGeo([...busParts(0.065, 0.022, 0.024, '#ffd23f'), [bx(0.05, 0.003, 0.0226, -0.004, 0.006, 0), '#1a1d24']]).rotateY(Math.PI / 2), vehMat()));
  // Estudantes caminhando pelo campus.
  const ring = Array.from({ length: 18 }, (_, i) => { const a = i / 18 * TAU; return [-0.03 + Math.cos(a) * 0.105, 0.07 + Math.sin(a) * 0.105]; });
  walkers(g, [ring, [[0.0, 0.15], [0.145, 0.15], [0.145, 0.25], [0.0, 0.25]]], 6, ['#ffffff', '#1e4488', '#00b7e3', '#2a3446'], (x, z) => sag(x, z) + 0.002);
}

// Educação: campus, observatório que abre, átomo holográfico e livro flutuante.
function buildEducation(g, zi) {
  zoneFloor(g, 0.31, floors.lawn);
  eduExtras(g, zi);
  const z0 = -0.13, y0 = sag(0, z0);
  box(0.26, 0.07, 0.09, C.white, 0, y0, z0, g);
  box(0.25, 0.014, 0.092, '#9fe9ff', 0, y0 + 0.026, z0, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
  box(0.27, 0.008, 0.1, C.ice, 0, y0 + 0.07, z0, g);
  box(0.08, 0.12, 0.08, C.ice, -0.15, sag(-0.15, z0), z0, g);
  box(0.06, 0.012, 0.082, '#9fe9ff', -0.15, sag(-0.15, z0) + 0.08, z0, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
  for (let i = 0; i < 5; i++) { const x = -0.08 + i * 0.04; cyl(0.0055, 0.062, C.white, x, sag(x, z0 + 0.054), z0 + 0.054, g, 8); }
  const lawn = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.004, 20), mat('#62caa2')); lawn.position.set(-0.03, sag(-0.03, 0.07) + 0.002, 0.07); g.add(lawn);
  tree(g, -0.2, 0.06); tree(g, -0.12, 0.17, 0.9);
  // Observatório: cúpula em duas metades que se abrem e telescópio que sobe.
  const ox = 0.15, oz = 0.07, oy = sag(ox, oz);
  cyl(0.05, 0.05, C.ice, ox, oy, oz, g, 20);
  const halves = [0, 1].map(k => {
    const piv = new THREE.Group(); piv.position.set(ox, oy + 0.05, oz); piv.userData.keep = true; g.add(piv);
    piv.add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 8, k * Math.PI, Math.PI, 0, Math.PI / 2), mat(C.white)));
    return piv;
  });
  const scope = new THREE.Group(); scope.position.set(ox, oy + 0.03, oz); scope.userData.keep = true; g.add(scope);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.012, 0.08, 10), mat(C.dark)); tube.position.y = 0.03; scope.add(tube);
  // Átomo holográfico sobre o pátio (ficção).
  const atom = new THREE.Group(), ay = sag(-0.03, 0.07) + 0.15; atom.position.set(-0.03, ay, 0.07); g.add(atom);
  atom.add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.013, 1), holoMat('#7fe9ff', 0.9)));
  const electrons = [0, 1, 2].map(k => {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.0016, 6, 48), holoMat('#00b7e3', 0.6)); ring.rotation.set(k * 1.05, k * 0.6, 0); atom.add(ring);
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 8, 6), holoMat('#ffffff', 1)); ring.add(e); return e;
  });
  const beam = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.13, 16, 1, true), holoMat('#00b7e3', 0.12)); beam.position.set(-0.03, ay - 0.075, 0.07); g.add(beam); beam.userData.keep = true;
  atom.userData.anim = t => {
    const f = fxT(zi), boost = f >= 0 && f < 7 ? 1 : 0, k = f < 0 ? 0 : smooth(0, 1.2, f) * (1 - smooth(6, 7.5, f));
    atom.rotation.y = t * (0.6 + boost * 1.8); atom.position.y = ay + Math.sin(t * 1.4) * 0.008;
    electrons.forEach((e, i) => { const a = t * (2 + i * 0.7) + i; e.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0); });
    halves[0].rotation.x = k * 1.05; halves[1].rotation.x = -k * 1.05;
    scope.position.y = oy + 0.012 + k * 0.03; scope.rotation.z = 0.15 + k * (0.45 + Math.sin(t * 0.8) * 0.15);
  };
  animated.push(atom);
  // Livro aberto flutuando, com uma página virando.
  const book = new THREE.Group(), bky = sag(-0.17, 0.09) + 0.11; book.position.set(-0.17, bky, 0.09); g.add(book);
  for (const s of [-1, 1]) {
    const cover = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.003, 0.064), mat(C.coral)); cover.geometry.translate(s * 0.024, -0.003, 0); cover.rotation.z = s * 0.25; book.add(cover);
    const page = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.003, 0.06), mat(C.white)); page.geometry.translate(s * 0.0225, 0, 0); page.rotation.z = s * 0.25; book.add(page);
  }
  const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.0015, 0.058), mat(C.white)); leaf.geometry.translate(0.022, 0.002, 0); book.add(leaf);
  book.userData.anim = t => { book.position.y = bky + Math.sin(t * 1.1 + 1) * 0.01; book.rotation.y = 0.4 + Math.sin(t * 0.4) * 0.3; leaf.rotation.z = 0.25 + ((t * 0.35) % 1) * (Math.PI - 0.5); };
  animated.push(book);
}

export { buildEducation };
