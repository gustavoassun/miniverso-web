import * as THREE from 'three';
import { R, TAU, mix, smooth, smoother } from '../../core/math.js';
import { box, compact, cyl, draped, mat, sag } from '../build.js';
import { C, VEHICLES } from '../palette.js';
import { walkers } from '../people.js';
import { animated, fxT } from '../runtime.js';
import { gallery, terminalMask, windrow, yardFloor } from '../industry.js';
import { locoMesh, wagonMesh } from '../vehicles.js';

// Ferrovia: terminal ao sul da linha principal (que passa em z ≈ −0,29). Pátio de manobras com quatro linhas,
// desvios e ligação com a linha principal; galpão do virador de vagões com poeira de minério; correia coberta
// subindo até a torre de transferência; pátio de estocagem com pilhas e a empilhadeira andando nos trilhos;
// oficina de locomotivas, posto de abastecimento, caixa-d'água, torre de controle, holofotes, sinaleiros,
// caminhonete de serviço e trabalhadores de colete e capacete.
function buildRailway(g, zi) {
  // Chão do terminal acima do relevo (que fica ~0.004 acima de sag); tudo apoia em gy.
  const G = 0.0065, gy = (x, z) => sag(x, z) + G;
  yardFloor(g, 0.76, 0.0062, terminalMask(g));
  const railM = mat(C.steel, { metalness: 0.6, roughness: 0.4 });
  // Linha férrea entre dois pontos: lastro de pedra, dormentes e trilhos acompanhando a curvatura.
  const track = (x0, z0, x1, z1) => {
    const L = Math.hypot(x1 - x0, z1 - z0), ux = (x1 - x0) / L, uz = (z1 - z0) / L, rot = -Math.atan2(uz, ux);
    const at = (s, off = 0) => [x0 + ux * s - uz * off, z0 + uz * s + ux * off];
    for (let s = 0; s < L - 1e-6; s += 0.04) {
      const l = Math.min(0.04, L - s), [cx, cz] = at(s + l / 2);
      const bed = new THREE.Mesh(new THREE.BoxGeometry(l + 0.002, 0.004, 0.066), mat('#8a8379')); bed.position.set(cx, gy(cx, cz) + 0.0005, cz); bed.rotation.y = rot; g.add(bed);
      for (const sd of [-1, 1]) { const [rx, rz] = at(s + l / 2, sd * 0.018), r = new THREE.Mesh(new THREE.BoxGeometry(l, 0.004, 0.004), railM); r.position.set(rx, gy(rx, rz) + 0.008, rz); r.rotation.y = rot; g.add(r); }
    }
    for (let s = 0.01; s < L; s += 0.022) { const [x, z] = at(s), sl = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.004, 0.05), mat(C.trunk)); sl.position.set(x, gy(x, z) + 0.004, z); sl.rotation.y = rot; g.add(sl); }
  };
  const bumper = (x, z, s) => { box(0.008, 0.012, 0.05, '#c0392b', x, gy(x, z) + 0.004, z, g); box(0.0085, 0.004, 0.051, '#f4f4f4', x, gy(x, z) + 0.011, z, g); box(0.012, 0.006, 0.01, C.dark, x - s * 0.008, gy(x, z) + 0.008, z, g); };
  const signal = (x, z, green) => {
    cyl(0.0018, 0.05, C.dark, x, gy(x, z), z, g, 6); box(0.008, 0.016, 0.006, C.dark, x, gy(x, z) + 0.05, z, g);
    for (const [dy, c, on] of [[0.062, '#ff3b30', !green], [0.054, '#3ee07a', green]]) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.0022, 8, 6), mat(c, { emissive: c, emissiveIntensity: on ? 1.8 : 0.08 })); m.position.set(x, gy(x, z) + dy, z + 0.0035); g.add(m); }
  };
  const vagao = loaded => wagonMesh(loaded), loco = color => locoMesh(color);
  const park = (o, x, z, flip) => { o.position.set(x, gy(x, z) + 0.0105, z); if (flip) o.rotation.y = Math.PI; compact(o); g.add(o); return o; };

  // ── Pátio de manobras: L1 (trem vazio, ligada à linha principal), L2 (manobra), L3 (virador) e L4 (oficina).
  const L1 = -0.15, L2 = -0.075, L3 = 0, L4 = 0.09;
  track(-0.52, L1, 0.42, L1); track(0.42, L1, 0.64, -0.205); track(-0.52, L1, -0.66, -0.222);
  track(-0.5, L2, 0.5, L2); track(-0.42, L1, -0.32, L2); track(0.3, L2, 0.4, L1);
  track(-0.5, L3, 0.52, L3); track(0.38, L2, 0.48, L3);
  track(-0.53, L4, -0.2, L4); track(-0.2, L4, -0.08, L3);
  bumper(-0.505, L2, -1); bumper(0.525, L3, 1); bumper(-0.535, L4, -1);
  signal(-0.5, L1 - 0.035, true); signal(0.4, L1 - 0.035, false); signal(0.5, L3 + 0.035, false); signal(-0.48, L3 - 0.035, true);
  // Trem vazio em L1 esperando para sair e locomotiva de manobra com dois vagões indo e voltando em L2.
  park(loco(VEHICLES.locoEmpty), -0.36, L1, true);
  for (let i = 0; i < 4; i++) park(vagao(false), -0.265 + i * 0.09, L1);
  const shunt = new THREE.Group(); g.add(shunt);
  const sl = loco(C.coral); compact(sl); shunt.add(sl);
  for (const dx of [0.105, 0.195]) { const c = vagao(false); c.position.x = dx; compact(c); shunt.add(c); }
  shunt.userData.anim = t => { const x = -0.28 + (Math.sin(t * 0.22) * 0.5 + 0.5) * 0.2; shunt.position.set(x, gy(x, L2) + 0.0105, L2); };
  animated.push(shunt);
  // Trem carregado em L3 a oeste do virador; vagões já vazios a leste.
  park(loco(VEHICLES.locoLoaded), -0.45, L3, true);
  for (const x of [-0.355, -0.265, -0.175, -0.085]) park(vagao(true), x, L3);
  for (const x of [0.185, 0.275, 0.365, 0.455]) park(vagao(false), x, L3);

  // ── Galpão do virador de vagões: parede norte inteira; do lado da câmera só a faixa de cima e os pilares, para
  // ver o tambor girando. Telhado com lanternim.
  const DX = 0.04, BW = 0.17, BZ0 = -0.042, BZ1 = 0.07, BH = 0.1, bzc = (BZ0 + BZ1) / 2, by = gy(DX, bzc);
  box(BW, BH, 0.004, '#dfe6ee', DX, by, BZ0, g);
  box(BW, 0.03, 0.004, '#dfe6ee', DX, by + BH - 0.03, BZ1, g); box(BW + 0.001, 0.006, 0.0045, C.amber, DX, by + BH - 0.036, BZ1, g);
  for (const x of [-BW / 2, 0, BW / 2]) for (const z of [BZ0, BZ1]) box(0.006, BH, 0.006, '#9aa8b8', DX + x, by, z, g);
  box(BW + 0.012, 0.005, BZ1 - BZ0 + 0.014, '#5a6878', DX, by + BH, bzc, g);
  box(BW * 0.7, 0.014, 0.03, '#cfe3f2', DX, by + BH + 0.005, bzc, g); box(BW * 0.72, 0.003, 0.036, '#5a6878', DX, by + BH + 0.019, bzc, g);
  box(0.11, 0.003, 0.05, '#1a1420', DX, by + 0.0002, L3 + 0.045, g);                                    // fosso
  const dumper = new THREE.Group(); dumper.position.set(DX, gy(DX, L3) + 0.03, L3); dumper.userData.keep = true; g.add(dumper);
  for (const s of [-1, 1]) { const ringM = new THREE.Mesh(new THREE.TorusGeometry(0.048, 0.006, 6, 24), mat(C.amber)); ringM.rotation.y = Math.PI / 2; ringM.position.x = s * 0.05; dumper.add(ringM); }
  for (const a of [0.6, 2.5, 3.8, 5.6]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.005, 0.005), mat(C.amber)); bar.position.set(0, Math.sin(a) * 0.048, Math.cos(a) * 0.048); dumper.add(bar); }
  const inCar = vagao(true); inCar.position.y = -0.0195; dumper.add(inCar);
  const oreM = mat(C.ore), fallFrom = new THREE.Vector3(DX, gy(DX, L3) + 0.06, L3 + 0.03);
  const falling = Array.from({ length: 10 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), oreM); m.visible = false; m.userData.keep = true; g.add(m); return m; });
  // Poeira avermelhada subindo do fosso enquanto o minério cai.
  const dustM = new THREE.MeshStandardMaterial({ color: '#b0563d', transparent: true, opacity: 0, depthWrite: false, roughness: 1 });
  const dust = Array.from({ length: 10 }, (_, i) => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.008, 0), dustM); m.userData = { keep: true, ox: (R() - 0.5) * 0.08, oz: (R() - 0.5) * 0.03, ph: i / 10 }; g.add(m); return m; });

  // ── Correia coberta do fosso até a torre de transferência, numa galeria de treliça sobre cavaletes.
  // A correia sai na diagonal, para a torre não ficar entre a câmera e o galpão.
  const TX = 0.2, b0 = new THREE.Vector3(DX, gy(DX, 0.06) + 0.012, 0.06), b1 = new THREE.Vector3(TX, gy(TX, 0.285) + 0.12, 0.285);
  gallery(g, b0, b1);
  for (const k of [0.35, 0.6, 0.85]) { const p = b0.clone().lerp(b1, k); for (const s of [-1, 1]) box(0.004, p.y - gy(p.x, p.z), 0.004, '#9aa8b8', p.x + s * 0.012, gy(p.x, p.z), p.z, g); box(0.028, 0.003, 0.004, '#9aa8b8', p.x, p.y - 0.004, p.z, g); }
  const TZ = 0.302;
  box(0.04, 0.14, 0.036, '#dfe6ee', TX, gy(TX, TZ), TZ, g); box(0.046, 0.006, 0.042, '#5a6878', TX, gy(TX, TZ) + 0.14, TZ, g); box(0.041, 0.006, 0.037, C.amber, TX, gy(TX, TZ) + 0.1, TZ, g);
  const c0 = new THREE.Vector3(TX, gy(TX, 0.32) + 0.02, 0.32), c1 = new THREE.Vector3(TX, gy(TX, 0.425) + 0.012, 0.425);
  const conn = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.004, c0.distanceTo(c1)), mat(C.dark)); conn.position.copy(c0).lerp(c1, 0.5); conn.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), c1.clone().sub(c0).normalize()); g.add(conn);
  box(0.004, 0.016, 0.004, '#9aa8b8', TX, gy(TX, 0.37), 0.37, g);
  const route = [b0, b1, c0, c1], segL = route.slice(1).map((p, i) => p.distanceTo(route[i])), totL = segL.reduce((a, b) => a + b);
  const along = (s, out) => { for (let i = 0; i < segL.length; i++) { if (s <= segL[i] || i === segL.length - 1) return out.copy(route[i]).lerp(route[i + 1], Math.min(1, s / segL[i])); s -= segL[i]; } return out; };
  const chunks = Array.from({ length: 12 }, () => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.008), oreM); m.userData.keep = true; g.add(m); return m; });

  // ── Pátio de estocagem: pilhas compridas de minério, correia no chão e a empilhadeira nos trilhos dela.
  windrow(g, -0.34, 0.14, 0.37, 0.07, 0.045, C.ore, G); windrow(g, 0.26, 0.42, 0.37, 0.07, 0.04, '#7a3424', G); windrow(g, -0.3, 0.32, 0.51, 0.07, 0.05, '#843b29', G);
  const SZ = 0.44;
  draped(0.64, 0.004, 0.012, C.dark, 0.0, SZ, g, G);
  for (let x = -0.31; x < 0.33; x += 0.014) box(0.006, 0.002, 0.008, C.ore, x, gy(x, SZ) + 0.004, SZ, g);
  for (const s of [-1, 1]) draped(0.66, 0.003, 0.003, C.steel, 0.0, SZ + s * 0.016, g, G);
  const stk = new THREE.Group(); g.add(stk);
  for (const x of [-0.016, 0.016]) for (const s of [-1, 1]) box(0.005, 0.032, 0.005, C.amber, x, 0, s * 0.016, stk);
  box(0.042, 0.008, 0.042, C.amber, 0, 0.032, 0, stk);
  cyl(0.011, 0.028, C.white, 0, 0.04, 0, stk, 10);
  const boom = new THREE.Group(); boom.position.y = 0.07; stk.add(boom);
  box(0.095, 0.006, 0.008, C.amber, 0.047, -0.003, 0, boom); box(0.03, 0.012, 0.014, C.dark, -0.022, -0.006, 0, boom);
  for (const x of [0.02, 0.05, 0.08]) box(0.002, 0.012, 0.002, C.amber, x, 0.003, 0, boom);
  box(0.095, 0.002, 0.002, C.amber, 0.047, 0.015, 0, boom);
  const wheel = new THREE.Group(); wheel.position.set(0.097, -0.004, 0); boom.add(wheel);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.0025, 6, 16), mat(C.white)); wheel.add(rim);
  for (let k = 0; k < 8; k++) { const a = k / 8 * TAU, b = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.005, 0.006), mat(C.dark)); b.position.set(Math.cos(a) * 0.014, Math.sin(a) * 0.014, 0); b.rotation.z = a; wheel.add(b); }
  compact(wheel);
  stk.userData.anim = t => {
    const x = mix(-0.24, 0.28, (Math.sin(t * 0.07) + 1) / 2);
    stk.position.set(x, gy(x, SZ) + 0.003, SZ);
    boom.rotation.y = Math.PI / 2 + Math.sin(t * 0.3) * 0.35; boom.rotation.z = -0.12;
    wheel.rotation.z = -t * 2.4;
  };
  animated.push(stk);

  // ── Oficina de locomotivas em L4: telhado em arco, portão aberto para leste e janelas de vidro do lado da câmera.
  const OX0 = -0.56, OX1 = -0.38, ocx = (OX0 + OX1) / 2, OZ0 = 0.038, OZ1 = 0.142, oy = gy(ocx, L4), OH = 0.06;
  box(OX1 - OX0, OH, 0.004, C.white, ocx, oy, OZ0, g);
  box(OX1 - OX0, 0.018, 0.004, C.white, ocx, oy, OZ1, g);
  box(OX1 - OX0, OH - 0.018, 0.003, '#7fc4e8', ocx, oy + 0.018, OZ1, g, { transparent: true, opacity: 0.35, emissive: '#3fbfe8', emissiveIntensity: 0.2 });
  for (let x = OX0; x <= OX1 + 1e-6; x += 0.045) box(0.004, OH, 0.006, C.dark, x, gy(x, OZ1), OZ1, g);
  box(0.004, OH, OZ1 - OZ0, C.white, OX0, gy(OX0, L4), L4, g);
  for (const z of [OZ0, OZ1]) box(0.008, OH, 0.012, C.teal, OX1, gy(OX1, z), z, g);
  box(0.008, 0.014, OZ1 - OZ0, C.teal, OX1, oy + OH - 0.014, L4, g);
  const arc = new THREE.CylinderGeometry(0.056, 0.056, OX1 - OX0 + 0.012, 18, 1, false, 0, Math.PI); arc.rotateZ(Math.PI / 2); arc.scale(1, 0.55, 1);
  const vault = new THREE.Mesh(arc, mat(C.teal)); vault.position.set(ocx, oy + OH, L4); g.add(vault);
  park(loco(C.amber), -0.47, L4, true);
  for (let x = OX0 + 0.02; x < OX1; x += 0.05) box(0.012, 0.002, 0.004, '#fff1c4', x, oy + OH - 0.004, L4, g, { emissive: '#ffd28a', emissiveIntensity: 1.2 });
  // Posto de abastecimento ao lado de L4: bomba com mangueira e dois tanques deitados.
  box(0.016, 0.004, 0.012, '#cfd8e6', -0.25, gy(-0.25, 0.127), 0.127, g); box(0.006, 0.02, 0.006, C.amber, -0.25, gy(-0.25, 0.127) + 0.004, 0.127, g);
  box(0.002, 0.002, 0.016, C.dark, -0.25, gy(-0.25, 0.12) + 0.018, 0.118, g);
  for (const z of [0.17, 0.2]) {
    for (const dx of [-0.02, 0.02]) box(0.006, 0.01, 0.02, '#7f8fa3', -0.22 + dx, gy(-0.22, z), z, g);
    const tk = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.065, 14), mat(C.white)); tk.rotation.z = Math.PI / 2; tk.position.set(-0.22, gy(-0.22, z) + 0.02, z); g.add(tk);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.0123, 0.0123, 0.008, 14), mat(C.amber)); band.rotation.z = Math.PI / 2; band.position.copy(tk.position); g.add(band);
  }

  // ── Caixa-d'água, torre de controle e torres de holofote.
  { const x = 0.47, z = 0.3, y = gy(x, z);
    for (const [dx, dz] of [[-0.016, -0.016], [0.016, -0.016], [-0.016, 0.016], [0.016, 0.016]]) box(0.004, 0.1, 0.004, '#9aa8b8', x + dx, y, z + dz, g);
    cyl(0.026, 0.032, C.ice, x, y + 0.1, z, g, 16); const tr = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.014, 16), mat('#5a6878')); tr.position.set(x, y + 0.139, z); g.add(tr); }
  { const x = -0.1, z = 0.2, y = gy(x, z);
    box(0.036, 0.1, 0.036, C.ice, x, y, z, g); box(0.037, 0.005, 0.037, C.amber, x, y + 0.08, z, g);
    box(0.054, 0.026, 0.054, '#9fe9ff', x, y + 0.1, z, g, { emissive: '#3fbfe8', emissiveIntensity: 0.8 });
    box(0.064, 0.005, 0.064, C.dark, x, y + 0.126, z, g); cyl(0.0012, 0.04, C.dark, x + 0.02, y + 0.131, z, g, 4); }
  for (const [x, z] of [[-0.25, -0.205], [0.25, -0.215], [0.48, 0.12], [-0.36, 0.3]]) {
    const y = gy(x, z); cyl(0.003, 0.2, '#9aa8b8', x, y, z, g, 6); box(0.03, 0.004, 0.006, C.dark, x, y + 0.2, z, g);
    for (const dx of [-0.009, 0, 0.009]) box(0.007, 0.007, 0.004, '#fff4c0', x + dx, y + 0.204, z + 0.003, g, { emissive: '#ffe08a', emissiveIntensity: 1.6 });
  }

  // ── Via de serviço com caminhonete indo e voltando, e outra estacionada na oficina.
  const RZ = 0.25;
  draped(0.8, 0.002, 0.03, '#3a3f4a', 0.045, RZ, g, G);
  for (let x = -0.33; x < 0.43; x += 0.03) box(0.012, 0.0008, 0.0015, '#f2f2f2', x, gy(x, RZ) + 0.002, RZ, g);
  const pickup = () => { const p = new THREE.Group();
    box(0.03, 0.006, 0.015, '#1a1d24', 0, 0.001, 0, p); box(0.032, 0.007, 0.016, C.white, 0, 0.004, 0, p); box(0.014, 0.007, 0.0155, C.white, 0.004, 0.011, 0, p);
    box(0.0005, 0.005, 0.013, '#1d2b3d', 0.0112, 0.012, 0, p); box(0.004, 0.002, 0.008, '#ff8a2a', 0.004, 0.018, 0, p, { emissive: '#ff8a2a', emissiveIntensity: 1.4 });
    box(0.033, 0.002, 0.0162, C.amber, 0, 0.007, 0, p); compact(p); return p; };
  const truck = pickup(); g.add(truck);
  truck.userData.anim = t => { const u = Math.sin(t * 0.15), x = mix(-0.32, 0.42, (u + 1) / 2), dir = Math.cos(t * 0.15) >= 0 ? 1 : -1; truck.position.set(x, gy(x, RZ + dir * -0.007), RZ + dir * -0.007); truck.rotation.y = dir > 0 ? 0 : Math.PI; };
  animated.push(truck);
  { const p = pickup(); p.position.set(-0.36, gy(-0.36, 0.2), 0.2); p.rotation.y = Math.PI / 2; g.add(p); }

  // ── Trabalhadores de colete e capacete, poucos e espalhados.
  const vests = ['#ff8a2a', '#ffd23f', '#ff8a2a', '#3ee07a'];
  walkers(g, [[[-0.035, 0.088], [0.0, 0.088], [0.0, 0.11], [-0.035, 0.11]]], 2, vests, gy, '#f4f4f4');           // virador
  walkers(g, [[[-0.3, 0.272], [0.4, 0.272], [0.4, 0.278], [-0.3, 0.278]]], 4, vests, gy, '#ffd23f');                 // via de serviço
  walkers(g, [[[-0.37, 0.124], [-0.29, 0.124], [-0.29, 0.13], [-0.37, 0.13]]], 2, vests, gy, '#f4f4f4');           // oficina
  walkers(g, [[[-0.15, -0.115], [0.25, -0.115], [0.25, -0.11], [-0.15, -0.11]]], 2, vests, gy, '#ffd23f');           // entre as linhas

  // Ciclo do virador: gira (2 s), despeja (1,5 s), volta (2 s), entra vagão cheio. Repete sozinho; o botão começa um agora.
  const tmp = new THREE.Vector3();
  dumper.userData.anim = t => {
    const f = fxT(zi), u = (f >= 0 ? f : t) % 9;
    const turn = smoother(0, 2, u) * (1 - smoother(3.5, 5.5, u));
    dumper.rotation.x = turn * 2.6;
    inCar.userData.heap.visible = u < 2.4 || u > 6;
    inCar.userData.heap.scale.set(1, Math.max(0.01, u > 6 ? smooth(6, 7, u) : 1), 1);
    falling.forEach((m, i) => {
      const k = (u - 2 - i * 0.12) / 0.6; m.visible = k > 0 && k < 1 && u < 3.8;
      if (m.visible) m.position.set(fallFrom.x + (i % 3 - 1) * 0.015, fallFrom.y + 0.02 - k * 0.07, fallFrom.z + 0.01 + k * 0.012);
    });
    const d = smooth(2.1, 2.6, u) * (1 - smooth(4, 5.5, u));
    dustM.opacity = 0.45 * d;
    dust.forEach(m => {
      const k = ((u - 2) * 0.5 + m.userData.ph) % 1; m.visible = d > 0.01;
      m.position.set(fallFrom.x + m.userData.ox * (0.4 + k), gy(DX, L3) + 0.01 + k * 0.07, L3 + 0.045 + m.userData.oz);
      m.scale.setScalar(0.6 + k * 1.6);
    });
    chunks.forEach((m, i) => { along(((t * 0.05 + i / chunks.length) % 1) * totL, tmp); m.position.copy(tmp); m.position.y += 0.005; m.rotation.y = i; });
  };
  animated.push(dumper);
}

export { buildRailway };
