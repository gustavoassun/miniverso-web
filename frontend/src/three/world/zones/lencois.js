import * as THREE from 'three';
import { TAU, clamp, smooth, smoother } from '../../core/math.js';
import { cyl, mat, sag } from '../build.js';
import { C } from '../palette.js';
import { crowd, walkers } from '../people.js';
import { animated, fxT } from '../runtime.js';
import { canvasTex } from '../textures.js';
import { jeepGeo, vehMat } from '../vehicles.js';

// Lençóis: dunas em meia-lua com volume (relevo próprio), lagoas todas no mesmo estilo,
// gente se banhando nas lagoas, caminhantes subindo as dunas, guarda-sóis e o 4x4 do passeio.
function buildDunes(g, zi) {
  const bumps = [[-0.17, -0.15, 0.07, 0.12, 0.055, 0.5], [0.0, -0.21, 0.06, 0.13, 0.065, 0.3], [0.19, -0.12, 0.06, 0.1, 0.05, 0.8], [-0.21, 0.07, 0.055, 0.1, 0.05, -0.3],
    [0.21, 0.12, 0.05, 0.1, 0.045, 0.2], [-0.03, -0.03, 0.05, 0.09, 0.04, 0.6], [0.09, 0.25, 0.05, 0.09, 0.035, -0.2], [-0.13, 0.24, 0.045, 0.09, 0.035, 0.4]];
  const dh = (x, z) => {
    let h = 0;
    for (const [bx, bz, sa, sl, hh, r] of bumps) {
      const dx = x - bx, dz = z - bz, c = Math.cos(r), s = Math.sin(r);
      let u = dx * c - dz * s; const v = dx * s + dz * c;
      u = u < 0 ? u / sa : u / (sa * 0.5);                       // lado do vento suave, lado de trás mais íngreme
      const bend = v * v / (sl * sl);
      h = Math.max(h, hh * Math.exp(-(u * u * 2.2 + bend * 2.2)) * (1 + 0.15 * Math.sin(v * 40)));
    }
    return h * smooth(0.34, 0.25, Math.hypot(x, z));
  };
  const sandY = (x, z) => sag(x, z) + dh(x, z);
  const geo = new THREE.RingGeometry(0.0005, 0.34, 96, 44); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3), cA = new THREE.Color('#fbf6e8'), cB = new THREE.Color('#e6dbc0'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), h = dh(x, z); p.setY(i, sag(x, z) + h - 0.0012); c.copy(cB).lerp(cA, clamp(h / 0.04)); col.set([c.r, c.g, c.b], i * 3); }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })));
  // Lagoas: mesmo formato e degradê (azul no meio, verde-água na borda).
  const lagoonM = new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.08, metalness: 0.1, emissive: '#0a4a6a', emissiveIntensity: 0.35, depthWrite: false,
    map: canvasTex(128, 128, (x, w, h) => { const gr = x.createRadialGradient(64, 64, 4, 64, 64, 64); gr.addColorStop(0, '#1478c8'); gr.addColorStop(0.55, '#24a8d8'); gr.addColorStop(0.85, '#5fe0d0'); gr.addColorStop(1, 'rgba(95,224,208,0)'); x.fillStyle = gr; x.fillRect(0, 0, w, h); }) });
  const lagoons = [[0.1, -0.01, -0.3], [-0.1, 0.1, 0.5], [0.03, 0.12, 0.1], [-0.04, 0.2, -0.4]].map(([x, z, r]) => {
    const y = sag(x, z) + 0.0025, m = new THREE.Mesh(new THREE.CircleGeometry(0.05, 32), lagoonM);
    m.rotation.set(-Math.PI / 2, 0, r); m.scale.set(1.25, 0.8, 1); m.position.set(x, y, z); m.renderOrder = 2; g.add(m);
    return { x, z, y };
  });
  // Gente se banhando nas lagoas (água pela cintura) e outros sentados na areia.
  const bathers = [];
  lagoons.forEach((l, k) => { for (let j = 0; j < 2; j++) { const a = k * 2.1 + j * 2.6; bathers.push([l.x + Math.cos(a) * 0.022, l.z + Math.sin(a) * 0.014, l.y - 0.007]); } });
  crowd(g, bathers, zi, [C.coral, C.amber, C.teal, C.white, C.violet, '#e8452f']);
  // Guarda-sóis coloridos na beira das lagoas.
  [[0.14, 0.04, C.coral], [-0.14, 0.05, C.amber], [0.07, 0.17, C.teal]].forEach(([x, z, cc]) => {
    const y = sandY(x, z); cyl(0.0015, 0.035, C.white, x, y, z, g, 5);
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.012, 8), mat(cc)); top.position.set(x, y + 0.038, z); g.add(top);
  });
  // Caminhantes subindo e descendo as dunas.
  walkers(g, [[[-0.2, -0.2], [-0.05, -0.12], [0.08, -0.2], [0.2, -0.08], [0.18, 0.03], [0.0, 0.04], [-0.15, 0.0]], [[-0.22, 0.14], [-0.1, 0.26], [0.12, 0.27], [0.24, 0.1], [0.12, 0.07]]], 4, [C.white, C.coral, C.amber, C.teal], sandY);
  // 4x4: carroceria, santantônio e rodas; segue um caminho entre as lagoas acompanhando as dunas.
  const jeep = new THREE.Group(); jeep.userData.keep = true; g.add(jeep);
  jeep.add(new THREE.Mesh(jeepGeo(), vehMat()));
  const path = Array.from({ length: 121 }, (_, i) => { const a = i / 120 * TAU, x = Math.cos(a) * 0.2, z = Math.sin(a) * 0.15 + 0.02; return new THREE.Vector3(x, sandY(x, z) + 0.003, z); });
  jeep.userData.anim = t => {
    const f = fxT(zi), u = f < 0 ? 0 : smoother(0, 12, f), k = (u * 120) % 120, i = Math.floor(k), a = path[i], b = path[i + 1];
    jeep.position.copy(a).lerp(b, k - i); jeep.position.y += f >= 0 && f < 12 ? Math.abs(Math.sin(t * 9)) * 0.002 : 0;
    jeep.rotation.set(0, Math.atan2(-(b.z - a.z), b.x - a.x), 0); jeep.rotateZ(Math.atan2(b.y - a.y, Math.hypot(b.x - a.x, b.z - a.z)));
  };
  animated.push(jeep);
}

export { buildDunes };
