import * as THREE from 'three';
import { TAU, mix, smooth } from '../../core/math.js';
import { box, cyl, mat, sag, zoneFloor } from '../build.js';
import { C } from '../palette.js';
import { crowd } from '../people.js';
import { confetti, tree, waveFlag } from '../props.js';
import { animated, fxT, fxT2, rt, zoneFx } from '../runtime.js';
import { canvasTex, floors, glassMat, holoMat, plainFlag } from '../textures.js';

// Negócios: distrito empresarial. Torres de vidro com elevador panorâmico, sede com jardim no teto, fonte,
// bandeiras, sala de reunião ao ar livre com apresentação holográfica em VR, drone de entregas e helicóptero.
function buildBusiness(g, zi) {
  zoneFloor(g, 0.31, floors.pavers);
  const glass = glassMat();
  for (const [x, z, h, w] of [[-0.12, -0.11, 0.3, 0.07], [-0.03, -0.17, 0.36, 0.06], [-0.2, 0.0, 0.2, 0.065], [0.05, -0.2, 0.22, 0.055]]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), glass); t.position.set(x, sag(x, z) + h / 2, z); g.add(t);
    box(w * 0.9, 0.012, w * 0.9, C.ice, x, sag(x, z) + h, z, g);
  }
  cyl(0.002, 0.07, C.white, -0.03, sag(-0.03, -0.17) + 0.372, -0.17, g, 5);
  const padY = sag(-0.12, -0.11) + 0.312;
  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.003, 16), mat('#2a3446')); helipad.position.set(-0.12, padY, -0.11); g.add(helipad);
  box(0.004, 0.0012, 0.018, '#f2c14e', -0.127, padY + 0.0015, -0.11, g); box(0.004, 0.0012, 0.018, '#f2c14e', -0.113, padY + 0.0015, -0.11, g); box(0.014, 0.0012, 0.004, '#f2c14e', -0.12, padY + 0.0015, -0.11, g);
  // Elevador panorâmico subindo e descendo na torre principal.
  const lift = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.022, 0.006), mat('#ffd28a', { emissive: '#ffb347', emissiveIntensity: 1.2 })); lift.userData.keep = true; g.add(lift);
  // Sede com faixa de vidro e jardim no teto.
  const hx = 0.12, hz = -0.15, hy = sag(hx, hz);
  box(0.15, 0.06, 0.08, C.white, hx, hy, hz, g);
  box(0.152, 0.016, 0.082, '#9fe9ff', hx, hy + 0.025, hz, g, { emissive: '#3fbfe8', emissiveIntensity: 0.7 });
  box(0.14, 0.008, 0.07, '#5fbf8a', hx, hy + 0.06, hz, g);
  for (const x of [0.07, 0.17]) tree(g, x, hz, 0.45);
  box(0.06, 0.008, 0.002, '#00b7e3', hx, hy + 0.045, hz + 0.041, g, { emissive: '#00b7e3', emissiveIntensity: 1.5 });
  // Fonte com jato d'água.
  const fx = -0.03, fz = 0.06, fy = sag(fx, fz);
  cyl(0.036, 0.012, C.ice, fx, fy, fz, g, 24);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.002, 24), mat('#2a86c4', { emissive: '#0a5a8a', emissiveIntensity: 0.6, roughness: 0.1 })); water.position.set(fx, fy + 0.012, fz); g.add(water);
  const jet = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.05, 10, 1, true), holoMat('#bfefff', 0.6)); jet.geometry.translate(0, 0.025, 0); jet.position.set(fx, fy + 0.012, fz); jet.userData.keep = true; g.add(jet);
  // Bandeiras.
  waveFlag(g, -0.24, 0.12, 0.13, plainFlag('#00b7e3', '#ffffff'), 0.05); waveFlag(g, -0.2, 0.15, 0.13, plainFlag('#1e4488', '#00b7e3'), 0.05); waveFlag(g, -0.16, 0.18, 0.13, plainFlag('#1e1645', '#ffc56b'), 0.05);
  tree(g, 0.22, 0.02, 0.8); tree(g, 0.0, 0.2, 0.8); tree(g, -0.1, 0.14, 0.9);
  // Reunião ao ar livre: deck de madeira, mesa redonda, equipe e o projeto aparecendo em holograma.
  const mx0 = 0.12, mz0 = 0.1, my0 = sag(mx0, mz0);
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.006, 28), mat('#a07a5a')); deck.position.set(mx0, my0 + 0.003, mz0); g.add(deck);
  cyl(0.03, 0.018, C.white, mx0, my0 + 0.006, mz0, g, 24);
  const projector = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.002, 16), mat('#7fe9ff', { emissive: '#00b7e3', emissiveIntensity: 1.5 })); projector.position.set(mx0, my0 + 0.025, mz0); g.add(projector);
  crowd(g, Array.from({ length: 6 }, (_, k) => { const a = k / 6 * TAU + 0.3; return [mx0 + Math.cos(a) * 0.045, mz0 + Math.sin(a) * 0.045]; }), zi, ['#1e4488', '#2a3446', '#eef4fb', '#1e1645', '#7f8fa3', '#00b7e3']);
  const holo = new THREE.Group(), hY = my0 + 0.03; holo.position.set(mx0, hY, mz0); holo.userData.keep = true; g.add(holo);
  const model = [[0, 0, 0.05], [0.014, 0.008, 0.035], [-0.012, 0.01, 0.028], [0.006, -0.014, 0.042], [-0.014, -0.01, 0.02], [0.018, -0.008, 0.024]].map(([x, z, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.01, 1, 0.01), holoMat('#7fe9ff', 0.6)); b.geometry.translate(0, 0.5, 0); b.position.set(x, 0, z); b.userData.h = h; holo.add(b); return b;
  });
  const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.0012, 6, 40), holoMat('#00b7e3', 0.8)); holoRing.rotation.x = Math.PI / 2; holo.add(holoRing);
  const cheer = confetti(g, mx0, my0 + 0.06, mz0);
  // Painel com indicadores atrás da mesa.
  const panelTex = canvasTex(256, 150, (x, w, h) => {
    x.strokeStyle = '#00b7e3'; x.lineWidth = 3; x.strokeRect(4, 4, w - 8, h - 8);
    x.fillStyle = '#00b7e3'; for (let i = 0; i < 6; i++) { const hh = 20 + ((i * 37) % 70); x.fillRect(22 + i * 22, h - 20 - hh, 14, hh); }
    x.strokeStyle = '#ffffff'; x.lineWidth = 3; x.beginPath(); [[160, 110], [180, 90], [200, 98], [220, 60], [240, 40]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.stroke();
    x.fillStyle = '#ffffff'; x.fillRect(22, 18, 90, 8); x.fillStyle = '#7fe9ff'; x.fillRect(22, 32, 60, 6);
  });
  const panelM = new THREE.MeshBasicMaterial({ map: panelTex, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.064), panelM), py = my0 + 0.13; panel.position.set(mx0 + 0.02, py, mz0 - 0.07); panel.rotation.y = -0.3; g.add(panel);
  // Drone de entregas com uma caixinha.
  const drone = new THREE.Group(); drone.userData.keep = true; g.add(drone);
  box(0.016, 0.005, 0.016, C.dark, 0, 0, 0, drone); box(0.01, 0.01, 0.01, '#c8a06a', 0, -0.012, 0, drone);
  const props = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.001, 10), holoMat('#ffffff', 0.5)); p.position.set(a * 0.011, 0.005, b * 0.011); drone.add(p); return p; });
  // Helicóptero no heliponto (decola, dá a volta no distrito e pousa).
  const heli = new THREE.Group(); heli.userData.keep = true; g.add(heli);
  const hb = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), mat('#e8452f')); hb.scale.set(1.4, 0.9, 0.9); hb.position.y = 0.012; heli.add(hb);
  const win = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 6), mat('#9fe9ff', { emissive: '#3fbfe8', emissiveIntensity: 0.5 })); win.position.set(0.009, 0.014, 0); heli.add(win);
  box(0.03, 0.004, 0.004, '#e8452f', -0.025, 0.012, 0, heli); box(0.003, 0.012, 0.002, C.white, -0.04, 0.012, 0, heli);
  for (const s of [-1, 1]) box(0.03, 0.002, 0.002, C.dark, 0, 0, s * 0.008, heli);
  const rotor = new THREE.Group(); rotor.position.y = 0.026; heli.add(rotor);
  for (const a of [0, Math.PI / 2]) { const bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.001, 0.004), mat(C.dark)); bl.rotation.y = a; rotor.add(bl); }
  panel.userData.anim = t => {
    const f = fxT(zi), show = f < 0 ? 0 : smooth(0, 0.6, f) * (1 - smooth(10, 11, f));
    model.forEach((b, i) => { b.scale.y = Math.max(0.0001, b.userData.h * (f < 0 ? 0 : smooth(0.3 + i * 0.35, 0.9 + i * 0.35, f)) * show); });
    holo.rotation.y = t * 0.8; holoRing.material.opacity = 0.2 + 0.6 * show; holoRing.scale.setScalar(0.8 + 0.4 * show);
    if (f >= 0 && f > 2.6 && cheer.userData.at < zoneFx[zi]) cheer.userData.at = rt.clock;
    panel.position.y = py + Math.sin(t * 1.2) * 0.005; panelM.opacity = 0.5 + 0.4 * show;
    lift.position.set(-0.12, sag(-0.12, -0.11) + 0.02 + (Math.sin(t * 0.5) * 0.5 + 0.5) * 0.25, -0.11 + 0.039);
    jet.scale.set(1, 0.7 + 0.3 * Math.sin(t * 5), 1);
    const a = t * 0.7; drone.position.set(-0.08 + Math.cos(a) * 0.15, sag(-0.08, -0.06) + 0.27 + Math.sin(t * 1.7) * 0.01, -0.06 + Math.sin(a) * 0.15); drone.rotation.y = -a;
    props.forEach(p => { p.rotation.y = t * 40; });
    const h2 = fxT2(zi), flying = h2 >= 0 && h2 < 12;
    const upK = flying ? smooth(0, 1.5, h2) * (1 - smooth(10.5, 12, h2)) : 0, orb = flying ? smooth(1.2, 3, h2) * (1 - smooth(9, 10.8, h2)) : 0, ang = (h2 - 1.2) * 0.8;
    heli.position.set(mix(-0.12, -0.02 + Math.cos(ang) * 0.2, orb), padY + 0.002 + upK * 0.14, mix(-0.11, -0.02 + Math.sin(ang) * 0.2, orb));
    heli.rotation.y = orb > 0.01 ? -ang - Math.PI / 2 : 0; heli.rotation.z = orb * 0.15;
    rotor.rotation.y = flying ? t * 40 : 0;
  };
  animated.push(panel);
}

export { buildBusiness };
