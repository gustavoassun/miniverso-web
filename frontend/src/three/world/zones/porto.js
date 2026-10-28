import * as THREE from 'three';
import { TAU, clamp } from '../../core/math.js';
import { box, compact, cyl, mat, sag } from '../build.js';
import { C } from '../palette.js';
import { animated, fxT } from '../runtime.js';
import { PR } from '../terrain.js';
import { carrierGeo, tugGeo, vehMat } from '../vehicles.js';

// Porto: cais de frente para o mar, navio graneleiro, carregador, pilhas de minério, guindaste e silos.
function buildPort(g, zi) {
  box(0.42, 0.025, 0.1, C.gray, 0, sag(0, 0.16), 0.16, g);
  for (let i = 0; i < 3; i++) {
    const pile = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.06, 10), mat(C.ore)); pile.scale.z = 1.6; pile.position.set(-0.14 + i * 0.12, sag(0, -0.06) + 0.03, -0.06); g.add(pile);
  }
  const loader = new THREE.Group(); loader.position.set(0.06, sag(0.06, 0.12), 0.12); g.add(loader);
  box(0.03, 0.16, 0.03, C.amber, 0, 0, 0, loader); box(0.03, 0.16, 0.03, C.amber, 0, 0, -0.08, loader);
  const boom = new THREE.Group(); boom.position.y = 0.16; loader.add(boom);
  box(0.03, 0.025, 0.26, C.amber, 0, 0, 0.06, boom); box(0.012, 0.06, 0.012, C.dark, 0, -0.06, 0.18, boom);
  boom.userData.anim = t => { boom.rotation.y = Math.sin(t * 0.35) * 0.35; }; animated.push(boom);
  const crane = new THREE.Group(); crane.position.set(-0.17, sag(-0.17, 0.14), 0.14); g.add(crane);
  box(0.02, 0.2, 0.02, C.coral, 0, 0, 0, crane);
  const jib = new THREE.Group(); jib.position.y = 0.2; crane.add(jib);
  box(0.18, 0.014, 0.014, C.coral, 0.06, 0, 0, jib);
  jib.userData.anim = t => { jib.rotation.y = Math.sin(t * 0.5 + 1) * 0.8; }; animated.push(jib);
  for (let i = 0; i < 3; i++) { const x = 0.12 + i * 0.05, z = -0.2, y = sag(x, z); cyl(0.022, 0.12, C.ice, x, y, z, g, 14); const top = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 6, 0, TAU, 0, Math.PI / 2), mat(C.ice)); top.position.set(x, y + 0.12, z); g.add(top); }
  cyl(0.01, 0.17, C.gray, -0.19, sag(-0.19, -0.2), -0.2, g, 8);
  const smoke = new THREE.Group(); smoke.position.set(-0.19, sag(-0.19, -0.2) + 0.18, -0.2); g.add(smoke);
  const puffs = [0, 1, 2].map(() => { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.018, 0), mat('#ffffff', { transparent: true, opacity: 0.6, roughness: 1 })); smoke.add(m); return m; });
  smoke.userData.anim = t => puffs.forEach((m, i) => { const k = (t * 0.35 + i / 3) % 1; m.position.set(k * 0.04, k * 0.12, 0); m.scale.setScalar(0.6 + k * 1.4); m.material.opacity = 0.6 * (1 - k); });
  animated.push(smoke);
  // Navio: balança no cais e, ao zarpar, sai para o mar de lado e volta.
  const ship = new THREE.Group(); ship.rotation.order = 'ZYX'; ship.rotation.y = Math.PI / 2 + 0.08; g.add(ship);
  { const m = new THREE.Mesh(carrierGeo(), vehMat()); m.rotation.y = -Math.PI / 2; m.userData.keep = true; ship.add(m); }
  const stacker = new THREE.Group(); stacker.position.set(-0.02, sag(-0.02, -0.15), -0.15); g.add(stacker);
  box(0.03, 0.03, 0.03, C.amber, 0, 0, 0, stacker); box(0.012, 0.03, 0.012, C.amber, 0, 0.03, 0, stacker);
  const sboom = new THREE.Group(); sboom.position.y = 0.055; stacker.add(sboom);
  box(0.2, 0.01, 0.012, C.amber, 0.06, 0, 0, sboom); box(0.06, 0.008, 0.01, C.dark, -0.06, 0, 0, sboom);
  const wheelS = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.004, 6, 16), mat(C.dark)); wheelS.position.set(0.16, -0.012, 0); sboom.add(wheelS);
  sboom.userData.anim = t => { sboom.rotation.y = 0.6 + Math.sin(t * 0.25) * 0.9; wheelS.rotation.z = t * 3; }; animated.push(sboom);
  const anchored = new THREE.Group(); anchored.position.set(0.24, sag(0.24, 0.45) - 0.01, 0.45); anchored.rotation.set(0.28, 0.5, -0.12); g.add(anchored);
  { const m = new THREE.Mesh(carrierGeo('#2a3446', '#e8452f', '#00b7e3'), vehMat()); m.rotation.y = -Math.PI / 2; m.scale.setScalar(0.82); m.userData.keep = true; anchored.add(m); }
  compact(anchored); anchored.userData.anim = t => { anchored.position.y = sag(0.24, 0.45) - 0.01 + Math.sin(t * 1.1) * 0.003; }; animated.push(anchored);
  const tug = new THREE.Group(); g.add(tug);
  tug.add(new THREE.Mesh(tugGeo(), vehMat()));
  // Esteira de espuma atrás do rebocador.
  const wake = [0, 1, 2, 3].map(i => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.006, 8, 4), mat('#ffffff', { transparent: true, opacity: 0.6, roughness: 1 })); m.scale.y = 0.15; tug.add(m); return m; });
  tug.userData.anim = t => {
    const a = t * 0.4, x = 0.12 + Math.cos(a) * 0.08, z = 0.3 + Math.sin(a) * 0.04; tug.position.set(x, sag(x, z) - 0.002, z); tug.rotation.y = -a - Math.PI / 2;
    wake.forEach((m, i) => { const k = (t * 1.2 + i / 4) % 1; m.position.set(-0.018 - k * 0.03, 0.001, Math.sin(i * 2.3) * 0.002); m.scale.set(1 + k * 1.6, 0.15, 0.8 + k * 1.4); m.material.opacity = 0.6 * (1 - k); });
  };
  animated.push(tug);
  compact(ship);
  ship.userData.anim = t => {
    const f = fxT(zi), k = f < 0 ? 0 : Math.sin(Math.PI * clamp(f / 10)) ** 2, x = 0.02 + k * 0.45, z = 0.33;
    ship.position.set(x, sag(x, z) - 0.012 + Math.sin(t * 1.3) * 0.004, z);
    ship.rotation.z = -Math.asin(x / PR); ship.rotation.x = Math.sin(t) * 0.02;
  };
  animated.push(ship);
}

export { buildPort };
