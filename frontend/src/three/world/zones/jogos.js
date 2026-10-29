import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TAU } from '../../core/math.js';
import { box, compact, cyl, mat, sag, zoneFloor } from '../build.js';
import { C } from '../palette.js';
import { confetti } from '../props.js';
import { animated, rt, toyKick, toys } from '../runtime.js';
import { canvasTex, floors, holoMat } from '../textures.js';

// Jogos: parque gamer. Piso neon, roda-gigante, kart, fliperamas, controle gigante flutuando, painel em pixel,
// blocos voando em volta e dois minigames: caçar as gemas e acertar os blocos que saltam do chão.
const game = { zi: 3, gems: [], got: 0, on: false, party: null };
const whack = { on: false, end: 0, score: 0, best: 0, next: 0, lastTxt: 0, pads: [], pop: null, flash: '', flashAt: 0 };
const race = { state: 'off', t0: 0, p: 0, c: 0, v: 0, last: 0, doneAt: 0, karts: [] };
function buildGames(g, zi) {
  zoneFloor(g, 0.31, floors.neon, true);
  const wheel = new THREE.Group(), wx = -0.13, wz = -0.1; wheel.position.set(wx, sag(wx, wz) + 0.16, wz); g.add(wheel);
  const rimMat = mat('#ff4fd8', { emissive: '#ff4fd8', emissiveIntensity: 0.8 });
  wheel.add(new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.005, 6, 48), rimMat));
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.004, 0.004), mat(C.white)); s.rotation.z = i * Math.PI / 6; wheel.add(s); }
  const cabins = [], cabColors = [C.coral, C.teal, C.amber, C.violet];
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU, cab = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.022, 0.022), mat(cabColors[i % 4])); cab.position.set(Math.cos(a) * 0.12, Math.sin(a) * 0.12, 0); wheel.add(cab); cabins.push(cab); }
  for (const s of [-1, 1]) { const leg = box(0.007, 0.18, 0.007, C.gray, wx + s * 0.04, sag(wx, wz), wz + 0.03 * s, g); leg.rotation.z = -s * 0.22; }
  wheel.userData.anim = t => { wheel.rotation.z = t * 0.35; for (const cab of cabins) cab.rotation.z = -t * 0.35; };
  animated.push(wheel);
  // Pista de kart com dois karts.
  const kx = 0.1, kz = 0.08, ky = sag(kx, kz);
  const track = new THREE.Mesh(new THREE.RingGeometry(0.045, 0.075, 40), mat('#2a3446', { side: THREE.DoubleSide })); track.rotation.x = -Math.PI / 2; track.position.set(kx, ky + 0.003, kz); g.add(track);
  const curb = new THREE.Mesh(new THREE.TorusGeometry(0.076, 0.003, 4, 40), mat(C.coral)); curb.rotation.x = Math.PI / 2; curb.position.set(kx, ky + 0.004, kz); g.add(curb);
  for (const [color, speed, off] of [[C.amber, 1.6, 0], [C.teal, 1.75, 2.5]]) {
    const kart = new THREE.Group(); g.add(kart);
    box(0.022, 0.008, 0.012, color, 0, 0, 0, kart);
    const driver = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 6), mat(C.white)); driver.position.set(-0.002, 0.012, 0); kart.add(driver);
    compact(kart);
    const info = { speed, off }; race.karts.push(info);
    kart.userData.anim = t => {
      const racing = race.state !== 'off', mine = info === race.karts[0], r = mine ? 0.065 : 0.052;
      const a = racing ? -Math.PI / 2 + Math.min(mine ? race.p : race.c, 3 * TAU) : t * speed + off;
      kart.position.set(kx + Math.cos(a) * r, ky + 0.004, kz + Math.sin(a) * r); kart.rotation.y = -a - Math.PI / 2;
    };
    animated.push(kart);
  }
  // Fliperamas com telas acesas.
  [[0.04, C.violet], [0.1, C.teal], [0.16, C.coral]].forEach(([x, c], i) => {
    const z = -0.17, y = sag(x, z);
    box(0.034, 0.075, 0.03, c, x, y, z, g);
    box(0.026, 0.022, 0.002, '#7fe9ff', x, y + 0.042, z + 0.016, g, { emissive: i % 2 ? '#ffc56b' : '#00b7e3', emissiveIntensity: 1.4 });
    box(0.034, 0.01, 0.031, '#ffffff', x, y + 0.075, z, g, { emissive: '#ffffff', emissiveIntensity: 0.5 });
    box(0.03, 0.004, 0.012, C.dark, x, y + 0.03, z + 0.02, g);
  });
  // Painel em pixel "PLAY" com coração, piscando.
  const font = { P: ['11110', '10001', '11110', '10000', '10000'], L: ['10000', '10000', '10000', '10000', '11111'], A: ['01110', '10001', '11111', '10001', '10001'], Y: ['10001', '01010', '00100', '00100', '00100'],
    R: ['11110', '10001', '11110', '10100', '10010'], C: ['01111', '10000', '10000', '10000', '01111'], D: ['11110', '10001', '10001', '10001', '11110'], E: ['11111', '10000', '11110', '10000', '11111'] };
  const heart = ['01010', '11111', '11111', '01110', '00100'];
  const signM = new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(128, 48, (x, w, h) => {
    x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#00b7e3'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
    const draw = (rows, ox, oy, c) => { x.fillStyle = c; rows.forEach((r, j) => [...r].forEach((v, i) => { if (v === '1') x.fillRect(ox + i * 4, oy + j * 4, 3, 3); })); };
    [...'PLAY'].forEach((ch, i) => draw(font[ch], 12 + i * 24, 14, i % 2 ? '#ff4fd8' : '#7fe9ff'));
    draw(heart, 104, 14, '#ff8a6b');
  }) });
  const sx = 0.1, sz = -0.25, sy = sag(sx, sz);
  for (const s of [-1, 1]) cyl(0.003, 0.12, C.gray, sx + s * 0.06, sy, sz, g, 6);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.0525), signM); sign.position.set(sx, sy + 0.14, sz); sign.userData.keep = true; g.add(sign);
  // Arco de entrada "ARCADE" em neon e dois holofotes varrendo o céu.
  const archM = new THREE.MeshBasicMaterial({ toneMapped: false, map: canvasTex(128, 32, (x, w, h) => {
    x.fillStyle = '#140c2a'; x.fillRect(0, 0, w, h); x.strokeStyle = '#ff4fd8'; x.lineWidth = 2; x.strokeRect(1, 1, w - 2, h - 2);
    [...'ARCADE'].forEach((ch, i) => { x.fillStyle = i % 2 ? '#7fe9ff' : '#ffc56b'; font[ch].forEach((r, j) => [...r].forEach((v, k) => { if (v === '1') x.fillRect(8 + i * 19 + k * 3, 8 + j * 3, 2.5, 2.5); })); });
  }) });
  const ax = 0.0, az = 0.29, ay = sag(ax, az);
  for (const s of [-1, 1]) box(0.008, 0.075, 0.008, '#ff4fd8', ax + s * 0.055, ay, az, g, { emissive: '#ff4fd8', emissiveIntensity: 1 });
  const arch = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.03), archM); arch.position.set(ax, ay + 0.088, az); arch.userData.keep = true; g.add(arch);
  const beams = new THREE.Group(); beams.userData.keep = true; g.add(beams);
  for (const [bx, bz, c] of [[-0.25, -0.2, '#ff4fd8'], [0.26, -0.18, '#00b7e3']]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.4, 16, 1, true), holoMat(c, 0.16)); cone.geometry.translate(0, 0.2, 0); cone.position.set(bx, sag(bx, bz), bz); beams.add(cone);
  }
  beams.userData.anim = t => beams.children.forEach((c, i) => { c.rotation.z = Math.sin(t * 0.9 + i * 2) * 0.5; c.rotation.x = Math.cos(t * 0.7 + i) * 0.35; });
  animated.push(beams);
  // Controle de videogame gigante flutuando (genérico).
  const pad = new THREE.Group(), padY = sag(0.18, -0.06) + 0.2; pad.position.set(0.18, padY, -0.06); g.add(pad);
  pad.add(new THREE.Mesh(new RoundedBoxGeometry(0.09, 0.022, 0.045, 3, 0.009), mat(C.violet)));
  for (const s of [-1, 1]) { const grip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 12, 8), mat(C.violet)); grip.scale.set(1, 0.7, 1.3); grip.position.set(s * 0.036, -0.004, 0.02); pad.add(grip); }
  for (const [w, d] of [[0.024, 0.007], [0.007, 0.024]]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.006, d), mat(C.white)); b.position.set(-0.025, 0.012, 0); pad.add(b); }
  [['#ff8a6b', 0.025, -0.009], ['#ffc56b', 0.034, 0], ['#3ee0b5', 0.025, 0.009], ['#00b7e3', 0.016, 0]].forEach(([c, x, z]) => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 6), mat(c, { emissive: c, emissiveIntensity: 0.6 })); b.position.set(x, 0.012, z); pad.add(b); });
  compact(pad);
  pad.userData.anim = t => { const k = toyKick(pad, t); pad.rotation.set(0.7 + Math.sin(t * 0.9) * 0.1, Math.sin(t * 0.5) * 0.5 + k * TAU, Math.sin(t * 0.7) * 0.08); pad.position.y = padY + Math.sin(t * 1.3) * 0.01 + k * 0.05; };
  animated.push(pad); toys.push(pad);
  // Ilha de blocos flutuando e blocos voando em volta da área (clique neles!).
  const blocks = new THREE.Group(), bly = sag(0.03, -0.04) + 0.16; blocks.position.set(0.03, bly, -0.04); g.add(blocks);
  [[0, 0, 0, C.teal], [0.022, 0, 0, C.teal], [-0.022, 0, 0, C.amber], [0, 0, 0.022, C.violet], [0, 0.022, 0, C.coral], [0.022, -0.022, 0.022, '#8a7f9e'], [-0.022, -0.022, 0, '#8a7f9e']]
    .forEach(([x, y, z, c]) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.021, 0.021, 0.021), mat(c)); b.position.set(x, y, z); blocks.add(b); });
  compact(blocks);
  blocks.userData.anim = t => { const k = toyKick(blocks, t); blocks.rotation.y = t * 0.5 + k * TAU; blocks.position.y = bly + Math.sin(t * 1.2) * 0.012 + k * 0.06; };
  animated.push(blocks); toys.push(blocks);
  [C.coral, C.amber, C.teal, C.violet, '#ff4fd8', '#00b7e3'].forEach((c, k) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.024, 0.024, 0.024, 2, 0.004), mat(c, { emissive: c, emissiveIntensity: 0.35 })); g.add(b);
    const r = 0.21 + (k % 2) * 0.03, h = 0.2 + k * 0.012, sp = 0.25 + k * 0.04, ph = k / 6 * TAU;
    b.userData.anim = t => { const kk = toyKick(b, t), a = ph + t * sp; b.position.set(Math.cos(a) * r, sag(Math.cos(a) * r, Math.sin(a) * r) + h + Math.sin(t * 2 + k) * 0.01 + kk * 0.07, Math.sin(a) * r); b.rotation.set(t + k + kk * 6, t * 0.7 + kk * 6, 0); };
    animated.push(b); toys.push(b);
  });
  // Gemas do minigame 1.
  const spots = [[-0.04, 0.09, 0.15], [0.17, 0.12, -0.02], [-0.21, 0.08, 0.08], [0.02, 0.22, -0.13], [0.13, 0.07, 0.19]];
  spots.forEach(([x, h, z], k) => {
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
  // Minigame 2: seis buracos com borda neon; blocos saltam e é preciso clicar antes que desçam.
  const cols = ['#ff4fd8', '#ffc56b', '#3ee0b5', '#00b7e3'];
  for (let i = 0; i < 6; i++) {
    const x = -0.165 + (i % 3) * 0.045, z = 0.1 + Math.floor(i / 3) * 0.045, y = sag(x, z);
    const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.004, 16), mat('#0b0618')); hole.position.set(x, y + 0.003, z); g.add(hole);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.017, 0.0022, 6, 24), mat('#ff4fd8', { emissive: '#ff4fd8', emissiveIntensity: 1.2 })); rim.rotation.x = Math.PI / 2; rim.position.set(x, y + 0.005, z); g.add(rim);
    const cube = new THREE.Mesh(new RoundedBoxGeometry(0.022, 0.022, 0.022, 2, 0.004), new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.5, flatShading: true }));
    cube.position.set(x, y - 0.02, z); cube.visible = false; cube.userData = { up: -1, dur: 1, y, keep: true, base: cols[i % 4], kind: 'ok' };
    const hit = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.userData.whack = cube; cube.add(hit);
    g.add(cube); whack.pads.push(cube);
  }
  whack.pop = confetti(g, 0, 0, 0);
  const ctl = new THREE.Group(); g.add(ctl); ctl.userData.anim = () => rt.gameTick(); animated.push(ctl);
}

export { buildGames, game, race, whack };
