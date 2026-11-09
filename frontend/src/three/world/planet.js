import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, TAU, UP } from '../core/math.js';
import { dpr, small } from '../core/quality.js';
import { box, compact, mat, zoneGroup } from './build.js';
import { C, OCEAN, VEHICLES } from './palette.js';
import { railBasis, railDist, railPt, railTan } from './rail.js';
import { animated, toyKick, toys, trains } from './runtime.js';
import { worldScene } from './stage.js';
import { canvasTex } from './textures.js';
import { DUNES, PLATEAU, PR, RAIL_R, TRAIN_SPEED, moisture, radiusAt, shadeOf, terrain } from './terrain.js';
import { locoMesh, paintGeo, sailboat, vehMat, wagonGeo } from './vehicles.js';
import { ZONES } from './zones.js';
import { buildCentro } from './zones/centro.js';
import { buildEcology } from './zones/ecologia.js';
import { buildEducation } from './zones/educacao.js';
import { buildRailway } from './zones/ferrovia.js';
import { buildGames } from './zones/jogos.js';
import { buildDunes } from './zones/lencois.js';
import { buildBusiness } from './zones/negocios.js';
import { buildPort } from './zones/porto.js';
import { applyReveal } from './reveal.js';

// O mundo é montado em pedaços: entre um pedaço e outro o navegador respira (desenha a capa, responde a cliques),
// em vez de travar a página inteira enquanto o planeta é construído.
const breathe = () => (globalThis.scheduler?.yield ? globalThis.scheduler.yield() : new Promise(r => setTimeout(r, 0)));

const planet = new THREE.Group();
const tilt = new THREE.Group();
tilt.add(planet); worldScene.add(tilt);

{
  const g = new THREE.IcosahedronGeometry(1, small ? 16 : 22), p = g.attributes.position;
  const colors = new Float32Array(p.count * 3), v = new THREE.Vector3(), c = new THREE.Color(), mid = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    let sum = 0; mid.set(0, 0, 0);
    for (let k = 0; k < 3; k++) { v.fromBufferAttribute(p, i + k).normalize(); mid.add(v); const h = terrain(v); sum += h; v.multiplyScalar(radiusAt(h)); p.setXYZ(i + k, v.x, v.y, v.z); }
    c.set(shadeOf(sum / 3, mid.normalize()));
    for (let k = 0; k < 3; k++) colors.set([c.r, c.g, c.b], (i + k) * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  planet.add(new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92 })));
  planet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(PR + 0.004, small ? 8 : 12), new THREE.MeshStandardMaterial({ color: OCEAN.color, emissive: OCEAN.glow, roughness: 0.22, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.9 })));
}
const atmoUniforms = { uAlpha: { value: 1 } };
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(PR * 1.17, 48, 32), new THREE.ShaderMaterial({
  uniforms: atmoUniforms, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `uniform float uAlpha; varying vec3 vN; void main(){ float i = pow(clamp(.78 - dot(vN, vec3(0., 0., 1.)), 0., 1.), 3.2); gl_FragColor = vec4(vec3(.3, .78, 1.) * i * 1.6 * uAlpha, 1.); }`
}));
tilt.add(atmosphere);
await breathe();
const BUILDERS = [buildCentro, buildEducation, buildEcology, buildGames, buildBusiness, buildRailway, buildPort, buildDunes];
for (const [i, z] of ZONES.entries()) { BUILDERS[i](z.group = zoneGroup(z.dir, z.rail), i); await breathe(); }
// Trilhos, dormentes e os trens de minério percorrendo o planeta pelo caminho sinuoso.
{
  const railMat = mat(C.steel, { metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 480 }, (_, i) => { const th = i / 480 * TAU, r = railPt(th); return r.clone().multiplyScalar(RAIL_R + 0.008).addScaledVector(new THREE.Vector3().crossVectors(r, railTan(th)), s * 0.022); });
    planet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 720, 0.0026, 5, true), railMat));
  }
  // Leito de brita embaixo dos trilhos (uma fita que acompanha a linha), postes de telégrafo de um lado, sinais com
  // luz vermelha e verde e pequenas paradas com plataforma, cobertura, banco e placa. Tudo instanciado ou mesclado.
  {
    const N = 960, pos = [], idx = [], nv = new THREE.Vector3();
    for (let i = 0; i <= N; i++) {
      const th = i / N * TAU, r = railPt(th), t = railTan(th); nv.crossVectors(r, t).normalize();
      for (const s of [-1, 1]) { const p = r.clone().multiplyScalar(RAIL_R + 0.0012).addScaledVector(nv, s * 0.043); pos.push(p.x, p.y, p.z); }
      if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
    }
    const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); bg.setIndex(idx); bg.computeVertexNormals();
    planet.add(new THREE.Mesh(bg, mat('#8c8478', { side: THREE.DoubleSide })));
    const side = (th, off, lift, out = new THREE.Matrix4()) => { const b = railBasis(th, out), z = new THREE.Vector3().setFromMatrixColumn(b, 2); return out.setPosition(railPt(th).multiplyScalar(RAIL_R + lift).addScaledVector(z, off)); };
    const NP = small ? 70 : 120, poles = new THREE.InstancedMesh(paintGeo([[new THREE.CylinderGeometry(0.0012, 0.0016, 0.05, 5).translate(0, 0.025, 0), '#6a4e33'], [new THREE.BoxGeometry(0.0015, 0.0015, 0.018).translate(0, 0.046, 0), '#6a4e33'], [new THREE.SphereGeometry(0.0012, 4, 3).translate(0, 0.048, 0.007), '#d9e3ea'], [new THREE.SphereGeometry(0.0012, 4, 3).translate(0, 0.048, -0.007), '#d9e3ea']]), vehMat(), NP);
    const tmp4 = new THREE.Matrix4(), hid = new THREE.Matrix4().makeScale(0, 0, 0), pv = new THREE.Vector3();
    const dry = m => terrain(pv.setFromMatrixPosition(m).normalize()) > 0.012;                          // nada de poste dentro do mar
    for (let i = 0; i < NP; i++) { const m = side(i / NP * TAU + 0.013, -0.068, 0, tmp4); poles.setMatrixAt(i, dry(m) ? m : hid); }
    planet.add(poles);
    const NS = 10, sigPole = new THREE.InstancedMesh(paintGeo([[new THREE.CylinderGeometry(0.0012, 0.0012, 0.04, 5).translate(0, 0.02, 0), '#2a3446'], [new THREE.BoxGeometry(0.006, 0.012, 0.005).translate(0, 0.042, 0), '#1a1d24']]), vehMat(), NS);
    const sigLamp = new THREE.InstancedMesh(new THREE.SphereGeometry(0.0022, 8, 6).translate(0.0028, 0.044, 0), new THREE.MeshBasicMaterial({ toneMapped: false }), NS);
    for (let i = 0; i < NS; i++) { const m0 = side(i / NS * TAU + 0.31, -0.052, 0, tmp4), m = dry(m0) ? m0 : hid; sigPole.setMatrixAt(i, m); sigLamp.setMatrixAt(i, m); sigLamp.setColorAt(i, new THREE.Color(i % 3 ? '#3dff7a' : '#ff3b3b')); }
    planet.add(sigPole, sigLamp);
    // Paradas pelo caminho, longe das áreas (nomes de lugares do Maranhão).
    for (const [th, name] of [[1.27, 'BACANGA'], [2.7, 'ANIL'], [3.62, 'ALCÂNTARA'], [5.8, 'BARREIRINHAS']]) {
      const sm = side(th, 0.06, 0); if (!dry(sm)) continue;
      const st = new THREE.Group(); st.matrixAutoUpdate = false; st.matrix.copy(sm); planet.add(st);
      const add = (geo, c, x, y, z) => { const m = new THREE.Mesh(geo, typeof c === 'string' ? mat(c) : c); m.position.set(x, y, z); st.add(m); return m; };
      add(new THREE.BoxGeometry(0.11, 0.008, 0.026), '#d9cfbd', 0, 0.004, 0);
      add(new THREE.BoxGeometry(0.11, 0.0015, 0.003), '#ffd23f', 0, 0.0085, -0.0115);
      for (const x of [-0.04, 0, 0.04]) add(new THREE.CylinderGeometry(0.0012, 0.0012, 0.026, 5), '#e9eef5', x, 0.021, 0.008);
      add(new THREE.BoxGeometry(0.1, 0.003, 0.03), '#e8452f', 0, 0.035, 0.002).rotation.x = -0.12;
      add(new THREE.BoxGeometry(0.018, 0.0015, 0.005), '#a07a5a', -0.02, 0.012, 0.006); add(new THREE.BoxGeometry(0.018, 0.0015, 0.005), '#a07a5a', 0.02, 0.012, 0.006);
      add(new THREE.BoxGeometry(0.03, 0.02, 0.012), '#f4e7c8', 0.034, 0.018, 0.006);
      const sign = add(new THREE.PlaneGeometry(0.05, 0.009), new THREE.MeshBasicMaterial({ toneMapped: false, side: THREE.DoubleSide, map: canvasTex(220, 40, (x, w, h) => { x.fillStyle = '#1e4488'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.font = 'bold 22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(name, w / 2, h / 2 + 1); }) }), 0, 0.03, -0.013);
      sign.rotation.y = Math.PI;
    }
  }
  const n = small ? 220 : 360, sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.006, 0.07), mat(C.trunk), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < n; i++) {
    const th = i / n * TAU;
    q.setFromRotationMatrix(railBasis(th));
    m4.compose(railPt(th).multiplyScalar(RAIL_R + 0.003), q, new THREE.Vector3(1, 1, 1)); sleepers.setMatrixAt(i, m4);
  }
  planet.add(sleepers);

  // Dois trens no mesmo sentido, em lados opostos: um carregado de minério, outro voltando vazio.
  const spacing = 0.105 / RAIL_R;
  for (const [locoColor, loaded, start] of [[VEHICLES.locoLoaded, true, 0], [VEHICLES.locoEmpty, false, Math.PI]]) {
    const train = new THREE.Group(); planet.add(train);
    const loco = locoMesh(locoColor); train.add(loco);
    const nW = small ? 8 : 12, wagons = new THREE.InstancedMesh(wagonGeo(loaded ? VEHICLES.wagonLoaded : VEHICLES.wagonEmpty, loaded), vehMat(), nW); wagons.frustumCulled = false; train.add(wagons);
    const wp = new THREE.Vector3(), wq = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1), wm = new THREE.Matrix4();
    train.userData.anim = t => {
      for (let i = 0; i <= nW; i++) {
        const th = start + t * TRAIN_SPEED - i * spacing;
        wp.copy(railPt(th)).multiplyScalar(RAIL_R + 0.012); wq.setFromRotationMatrix(railBasis(th, m4));
        if (i === 0) { loco.position.copy(wp); loco.quaternion.copy(wq); } else wagons.setMatrixAt(i - 1, wm.compose(wp, wq, one));
      }
      wagons.instanceMatrix.needsUpdate = true; wagons.boundingSphere = null;
    };
    animated.push(train); trains.push({ group: train, start, label: loaded ? 'carregado (locomotiva amarela)' : 'vazio (locomotiva verde)' });
  }
}

await breathe();
// Vegetação por bioma (fora das áreas construídas, da ferrovia e das dunas), tudo instanciado (poucas chamadas de
// desenho): mata de copas redondas nos morros úmidos, pinheiros na mata seca, árvores de copa achatada no cerrado,
// arbustos nos campos, ipês floridos aqui e ali, coqueiros na beira do mar, pedras nas encostas e uma faixa de
// arbustos e árvores acompanhando a ferrovia (a paisagem que se vê da cabine do trem). Também turbinas e vilarejos.
{
  // z.clear: margem extra sem enfeites em volta de uma área (o mar de manobra do Porto, por exemplo).
  const free = d => ZONES.every(z => d.angleTo(z.dir) > (z.clear ?? (z.flat ? z.flat[0] : 0.3))) && railDist(d) > 0.07 && d.angleTo(DUNES) > 0.5;
  const up = new THREE.Vector3(0, 1, 0), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), qy = new THREE.Quaternion(), sc = new THREE.Vector3();
  const kinds = { round: [], pine: [], flat: [], bush: [], ipe: [], palm: [], rock: [] };
  const cap = small ? { round: 90, pine: 50, flat: 28, bush: 150, ipe: 14, palm: 26, rock: 30 } : { round: 170, pine: 95, flat: 55, bush: 300, ipe: 26, palm: 50, rock: 60 };
  const room = k => kinds[k].length < cap[k];
  for (let tries = 0; tries < (small ? 9000 : 16000); tries++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), h = terrain(d);
    if (h < 0.022 || !free(d)) continue;
    const m = moisture(d), r = R();
    if (h < 0.034) { if (room('palm') && r < 0.5) kinds.palm.push([d, h]); continue; }
    if (h < 0.075) {
      if (m < 0.42) { if (r < 0.25 && room('flat')) kinds.flat.push([d, h]); else if (r < 0.55 && room('bush')) kinds.bush.push([d, h]); }
      else if (r < 0.06 && room('ipe')) kinds.ipe.push([d, h]);
      else if (r < 0.45 && room('bush')) kinds.bush.push([d, h]);
      else if (m > 0.52 && r < 0.62 && room('round')) kinds.round.push([d, h]);
      continue;
    }
    if (h < 0.13) { if (m < 0.44) { if (room('pine')) kinds.pine.push([d, h]); } else if (room('round')) kinds.round.push([d, h]); continue; }
    if (h < 0.19 && room('rock') && r < 0.5) kinds.rock.push([d, h]);
  }
  // Faixa verde ao longo da ferrovia, dos dois lados (a vista da cabine).
  const railSide = [];
  for (let i = 0; i < (small ? 160 : 300); i++) {
    const th = R() * TAU, side = R() < 0.5 ? -1 : 1, r = railPt(th), t = railTan(th), nrm = new THREE.Vector3().crossVectors(r, t);
    const d = r.clone().addScaledVector(nrm, side * (0.075 + R() * 0.07)).normalize(), h = terrain(d);
    if (h < 0.022 || h > 0.13 || d.angleTo(DUNES) < 0.5 || ZONES.some(z => d.angleTo(z.dir) < (z.clear ?? (z.flat ? z.flat[0] : 0.3)))) continue;
    railSide.push([d, h, R() < 0.4]);
  }
  for (const [d, h, tall] of railSide) (tall ? kinds.round : kinds.bush).push([d, h]);
  const place = (mesh, list, sz, lift, colors) => {
    list.forEach(([d, h], i) => {
      const s = sz[0] + R() * (sz[1] - sz[0]);
      q.setFromUnitVectors(up, d).multiply(qy.setFromAxisAngle(up, R() * TAU));
      m4.compose(d.clone().multiplyScalar(radiusAt(h) + lift * s), q, sc.set(s, s * (0.85 + R() * 0.3), s)); mesh.setMatrixAt(i, m4);
      if (colors) mesh.setColorAt(i, colors[(i * 7 + Math.floor(R() * 3)) % colors.length]);
    });
    planet.add(mesh);
  };
  const col = hs => hs.map(h => new THREE.Color(h));
  const inst = (geo, material, n) => new THREE.InstancedMesh(geo, material, Math.max(1, n));
  // Mata: copas redondas (duas bolas) e tronco.
  const roundG = mergeGeometries([new THREE.IcosahedronGeometry(0.03, 0).translate(0, 0.055, 0), new THREE.IcosahedronGeometry(0.022, 0).translate(0.014, 0.075, 0.006)]);
  const trunkG = new THREE.CylinderGeometry(0.005, 0.007, 0.04, 5).translate(0, 0.02, 0);
  const allRound = [...kinds.round, ...kinds.ipe, ...kinds.flat];
  place(inst(roundG, mat('#ffffff'), kinds.round.length), kinds.round, [0.75, 1.3], -0.004, col(['#2f9e72', '#3aa58c', '#2c8f6a', '#3fae6f', '#4bbf8f']));
  place(inst(trunkG, mat(C.trunk), allRound.length + kinds.pine.length), [...allRound, ...kinds.pine], [0.8, 1.2], -0.004);
  // Ipês floridos (rosa, amarelo, roxo, branco).
  place(inst(roundG, mat('#ffffff'), kinds.ipe.length), kinds.ipe, [0.8, 1.1], -0.004, col(['#ff7bb0', '#ffd23f', '#b07cff', '#ffffff']));
  // Cerrado: copa achatada.
  place(inst(new THREE.SphereGeometry(0.034, 7, 4).scale(1, 0.38, 1).translate(0, 0.05, 0), mat('#ffffff'), kinds.flat.length), kinds.flat, [0.7, 1.1], -0.004, col(['#7fae4f', '#8fbf5a', '#6f9e46']));
  // Mata seca: pinheiros em dois andares.
  place(inst(mergeGeometries([new THREE.ConeGeometry(0.026, 0.05, 6).translate(0, 0.05, 0), new THREE.ConeGeometry(0.019, 0.04, 6).translate(0, 0.08, 0)]), mat('#ffffff'), kinds.pine.length), kinds.pine, [0.8, 1.3], -0.004, col(['#2c7f5e', '#36906a', '#2a7350']));
  // Arbustos.
  place(inst(new THREE.IcosahedronGeometry(0.016, 0).scale(1, 0.7, 1).translate(0, 0.008, 0), mat('#ffffff'), kinds.bush.length), kinds.bush, [0.7, 1.4], -0.002, col(['#4bbf8f', '#5fd39a', '#3aa58c', '#8fbf5a']));
  // Coqueiros: tronco curvo e folhas (uma geometria pintada nos vértices, uma chamada).
  const leaves = []; for (let k = 0; k < 7; k++) leaves.push([new THREE.BoxGeometry(0.05, 0.003, 0.012).translate(0.025, 0, 0).rotateZ(-0.45).rotateY(k / 7 * TAU).translate(0.006, 0.092, 0), '#3aa58c']);
  const palmG = paintGeo([[new THREE.CylinderGeometry(0.003, 0.0055, 0.09, 5).translate(0, 0.045, 0).rotateZ(-0.08), C.trunk], ...leaves, [new THREE.IcosahedronGeometry(0.006, 0).translate(0.006, 0.088, 0), '#7a5b45']]);
  place(inst(palmG, vehMat(), kinds.palm.length), kinds.palm, [0.75, 1.15], -0.004);
  // Pedras nas encostas.
  place(inst(new THREE.DodecahedronGeometry(0.018, 0).scale(1, 0.65, 1), mat('#8a9db3'), kinds.rock.length), kinds.rock, [0.6, 1.5], 0.002, col(['#8a9db3', '#9aa8b8', '#7f8fa3']));

  let made = 0;
  for (let tries = 0; made < (small ? 3 : 5) && tries < 3000; tries++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), h = terrain(d);
    if (h < 0.08 || !free(d)) continue;
    const t = new THREE.Group(); t.position.copy(d).multiplyScalar(radiusAt(h)); t.quaternion.setFromUnitVectors(up, d); planet.add(t);
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.007, 0.2, 6), mat(C.white)); mast.position.y = 0.1; t.add(mast);
    const rotor = new THREE.Group(); rotor.position.set(0, 0.2, 0.01); t.add(rotor);
    for (let b = 0; b < 3; b++) { const blade = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.09, 0.002), mat(C.white)); blade.geometry.translate(0, 0.045, 0); blade.rotation.z = b * TAU / 3; rotor.add(blade); }
    const speed = 1.2 + R(); rotor.userData.anim = tt => { rotor.rotation.z = tt * speed; }; animated.push(rotor);
    made++;
  }

  // Vilarejos espalhados e barcos de vela colorida no mar.
  const houseCols = [C.white, C.pastel, C.amber, C.mint, C.ice];
  let villages = 0;
  for (let tries = 0; villages < (small ? 4 : 7) && tries < 4000; tries++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), h = terrain(d);
    if (h < 0.03 || h > 0.09 || !free(d) || ZONES.some(z => d.angleTo(z.dir) < (z.clear ?? (z.flat ? z.flat[1] : 0.45)))) continue;
    const v = new THREE.Group(); v.position.copy(d).multiplyScalar(radiusAt(h) - 0.004); v.quaternion.setFromUnitVectors(up, d); planet.add(v);
    for (let k = 0; k < 4; k++) {
      const a = k * 1.7 + R(), x = Math.cos(a) * 0.035, z = Math.sin(a) * 0.035, s = 0.8 + R() * 0.4;
      box(0.022 * s, 0.018 * s, 0.02 * s, houseCols[(k + villages) % 5], x, 0, z, v);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.018 * s, 0.014 * s, 4), mat(C.terracotta)); roof.rotation.y = Math.PI / 4; roof.position.set(x, 0.025 * s, z); v.add(roof);
    }
    villages++;
  }
  const sails = [C.coral, C.amber, C.teal, '#ffffff'];
  let boats = 0;
  for (let tries = 0; boats < (small ? 4 : 8) && tries < 4000; tries++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize();
    if (terrain(d) > -0.05 || ZONES.some(z => d.angleTo(z.dir) < (z.clear ?? (z.flat ? z.flat[1] : 0.4)))) continue;
    const b = new THREE.Group(); b.position.copy(d).multiplyScalar(PR + 0.004); b.quaternion.setFromUnitVectors(up, d); planet.add(b);
    const inner = new THREE.Group(); inner.rotation.y = R() * TAU; b.add(inner);
    inner.add(sailboat(sails[boats % 4]));
    const ph = R() * TAU; b.userData.anim = t => { inner.position.y = Math.sin(t * 1.6 + ph) * 0.002; inner.rotation.z = Math.sin(t * 1.2 + ph) * 0.08; };
    animated.push(b); boats++;
  }
}

// Nuvens e um satélite em órbita.
const clouds = new THREE.Group(); tilt.add(clouds);
const cloudM = mat('#ffffff', { roughness: 1, transparent: true, opacity: 0.92 });
{
  const cm = cloudM;
  for (let i = 0; i < (small ? 6 : 10); i++) {
    const parts = [];
    for (let k = 0; k < 3 + Math.floor(R() * 2); k++) { const s = 0.05 + R() * 0.04; const g = new THREE.IcosahedronGeometry(s, 0); g.translate(k * 0.05 - 0.05, R() * 0.02, (R() - 0.5) * 0.04); parts.push(g); }
    const cloud = new THREE.Mesh(mergeGeometries(parts), cm);
    const d = new THREE.Vector3(R() * 2 - 1, (R() * 2 - 1) * 0.7, R() * 2 - 1).normalize();
    cloud.position.copy(d).multiplyScalar(PR + 0.32 + R() * 0.1); cloud.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d);
    clouds.add(cloud);
  }
}
const orbit = new THREE.Group(); orbit.rotation.set(0.9, 0, 0.4); tilt.add(orbit);
{
  const sat = new THREE.Group(); sat.position.x = PR + 0.75; orbit.add(sat);
  sat.add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.08), mat(C.white)));
  for (const s of [-1, 1]) { const panel = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.004, 0.06), mat('#2a5ea8', { metalness: 0.5, roughness: 0.3 })); panel.position.x = s * 0.12; sat.add(panel); }
  const ring = new THREE.Mesh(new THREE.TorusGeometry(PR + 0.75, 0.002, 4, 160), new THREE.MeshBasicMaterial({ color: '#00b7e3', transparent: true, opacity: 0.18 }));
  ring.rotation.x = Math.PI / 2; orbit.add(ring);
}
// Ilhas flutuando em volta do planeta (o lado ficção do Miniverso).
const islands = new THREE.Group(); tilt.add(islands);
[[0.9, 0.5, 0.3], [-0.7, -0.3, 0.8], [0.2, -0.85, -0.6], [-0.5, 0.75, -0.7]].slice(0, small ? 3 : 4).forEach(([x, y, z], k) => {
  const d = new THREE.Vector3(x, y, z).normalize(), isl = new THREE.Group();
  isl.position.copy(d).multiplyScalar(PR + 0.9); isl.quaternion.setFromUnitVectors(UP, d); isl.userData = { d, ph: k * 1.7 };
  const rock = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.18, 7), mat('#8a7f9e')); rock.rotation.x = Math.PI; rock.position.y = -0.1; isl.add(rock);
  isl.add(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 7), mat('#4bbf8f')));
  if (k % 2) {
    for (const [tx, tz, s] of [[0.03, 0.01, 1], [-0.04, -0.02, 0.8]]) { const c = new THREE.Mesh(new THREE.ConeGeometry(0.028 * s, 0.08 * s, 6), mat('#3aa58c')); c.position.set(tx, 0.05 * s, tz); isl.add(c); }
  } else {
    const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), mat('#7fe9ff', { emissive: '#00b7e3', emissiveIntensity: 1 })); crystal.scale.y = 1.6; crystal.position.y = 0.09; isl.add(crystal); isl.userData.crystal = crystal;
  }
  islands.add(isl);
});

// Balões coloridos flutuando em volta do planeta: clique para fazê-los saltar e girar.
const balloons = new THREE.Group(); tilt.add(balloons);
[[0.6, 0.7, 0.4, '#ff8a6b', '#ffc56b'], [-0.8, 0.2, 0.5, '#00b7e3', '#ffffff'], [0.3, -0.4, 0.9, '#b07cff', '#ffd23f'], [-0.3, 0.6, -0.8, '#3ee0b5', '#ff7bb0'], [0.9, -0.2, -0.5, '#ffd23f', '#e8452f']].slice(0, small ? 3 : 5).forEach(([x, y, z, c1, c2], k) => {
  const d = new THREE.Vector3(x, y, z).normalize(), bl = new THREE.Group(); bl.quaternion.setFromUnitVectors(UP, d); balloons.add(bl);
  const env = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), mat(c1)); env.scale.set(1, 1.15, 1); env.position.y = 0.08; bl.add(env);
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.061, 0.012, 6, 24), mat(c2)); band.rotation.x = Math.PI / 2; band.position.y = 0.08; bl.add(band);
  const neck = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.04, 12), mat(c1)); neck.rotation.x = Math.PI; neck.position.y = 0.02; bl.add(neck);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.016, 0.022), mat('#a07a5a')); basket.position.y = -0.012; bl.add(basket);
  compact(bl);
  bl.userData.anim = t => { const kk = toyKick(bl, t); bl.position.copy(d).multiplyScalar(PR + 0.62 + Math.sin(t * 0.6 + k) * 0.03 + kk * 0.2); bl.children.forEach(c => { c.rotation.y = t * 0.2 + kk * 8; }); };
  animated.push(bl); toys.push(bl);
});

// Junta as peças paradas por material para desenhar o planeta com poucas chamadas.
// Nível de detalhe: dentro das áreas, as peças pequenas (lampiões, bancos, placas, vasos, janelinhas, enfeites...)
// vão para malhas separadas de cada área, marcadas como miudeza: de longe o planeta mostra só o básico (relevo,
// construções, trens) e o detalhe aparece só na área aberta. Menos coisa desenhada na vista do planeta.
await breathe();
{
  planet.updateMatrixWorld(true);
  const groups = new Map(), fine = new Map(), toRemove = [], inv = new THREE.Matrix4().copy(planet.matrixWorld).invert();
  const zoneGroups = new Map(ZONES.map(z => [z.group, new THREE.Matrix4().copy(z.group.matrixWorld).invert()]));
  const bb = new THREE.Box3(), sz = new THREE.Vector3();
  const FINE = 0.026;                                                                         // ~2,6 cm na escala da área
  planet.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.parent === planet) return;
    let zg = null;
    for (let a = o; a && a !== planet; a = a.parent) { if (a.userData.anim || a.userData.keep) return; if (zoneGroups.has(a)) zg = a; }
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    if (!o.material.map) g.deleteAttribute('uv');
    let tiny = false;
    if (zg && !o.userData.big) { if (!o.geometry.boundingBox) o.geometry.computeBoundingBox(); bb.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld); tiny = bb.getSize(sz).length() < FINE; }
    // Mesma conta para todos (posição relativa ao planeta); as miudezas só vão para outra lista, por área.
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (tiny) {
      if (!fine.has(zg)) fine.set(zg, new Map());
      const fm = fine.get(zg); if (!fm.has(o.material)) fm.set(o.material, []); fm.get(o.material).push(g);
    } else {
      if (!groups.has(o.material)) groups.set(o.material, []);
      groups.get(o.material).push(g);
    }
    toRemove.push(o);
  });
  toRemove.forEach(o => o.parent.remove(o));
  for (const [m, list] of groups) planet.add(new THREE.Mesh(mergeGeometries(list), m));
  for (const [zg, fm] of fine) for (const [m, list] of fm) { const mesh = new THREE.Mesh(mergeGeometries(list), m); mesh.userData.detail = true; mesh.userData.detailZone = ZONES.findIndex(z => z.group === zg); planet.add(mesh); }
}

await breathe();
// Marcadores das áreas (anel no chão), alvos de clique e pontos dos rótulos.
const zoneMarks = ZONES.map(z => {
  const ring = new THREE.Mesh(new THREE.RingGeometry(z.R || 0.33, (z.R || 0.33) + 0.015, 96), new THREE.MeshBasicMaterial({ color: '#00b7e3', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  ring.position.copy(z.dir).multiplyScalar(radiusAt(PLATEAU) + 0.006);
  ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), z.dir);
  planet.add(ring);
  const hit = new THREE.Mesh(new THREE.SphereGeometry(z.R || 0.34, 12, 8), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.copy(z.dir).multiplyScalar(PR + 0.08); planet.add(hit);
  return { ring, hit, dir: z.dir, anchor: z.dir.clone().multiplyScalar(PR + 0.42), glow: 0 };
});

// Formação do planeta: partículas com as cores do terreno chegam girando, formam a superfície e se dissipam.
const formUniforms = { uForm: { value: 0 }, uFade: { value: 0 }, uPx: { value: dpr } };
const formPts = new THREE.Group(); tilt.add(formPts);
{
  const n = small ? 2200 : 4200, pos = new Float32Array(n * 3), start = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n);
  const d = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    d.set(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize();
    const h = terrain(d); d.multiplyScalar(Math.max(radiusAt(h), PR + 0.004) + 0.012); pos.set([d.x, d.y, d.z], i * 3);
    c.set(shadeOf(h, d.clone().normalize())); col.set([c.r, c.g, c.b], i * 3);
    d.set(R() * 2 - 1, (R() * 2 - 1) * 0.6, R() * 2 - 1).normalize().multiplyScalar(2.4 + R() * 1.6); start.set([d.x, d.y, d.z], i * 3);
    seed[i] = R();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
  g.setAttribute('aColor', new THREE.BufferAttribute(col, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const pts = new THREE.Points(g, new THREE.ShaderMaterial({
    uniforms: formUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aStart, aColor; attribute float aSeed; uniform float uForm, uFade, uPx; varying vec3 vC; varying float vA;
      void main(){
        float k = smoothstep(aSeed * .45, aSeed * .45 + .55, uForm);
        float sw = (1. - k) * (1. - k) * 4.;
        vec3 s = aStart; float c = cos(sw), sn = sin(sw); s = vec3(c * s.x - sn * s.z, s.y, sn * s.x + c * s.z);
        vec3 p = mix(s, position, k * k * (3. - 2. * k)) + normalize(position) * uFade * (.12 + aSeed * .7);
        vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
        gl_PointSize = uPx * (2. + aSeed * 2.2) * (4. / -mv.z);
        vC = aColor; vA = smoothstep(0., .12, uForm) * (1. - uFade);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ float r = length(gl_PointCoord - .5); gl_FragColor = vec4(mix(vC, vec3(.55, .9, 1.), .4) * 1.3, smoothstep(.5, .05, r) * vA); }`
  }));
  pts.frustumCulled = false; formPts.add(pts);
}

const worldMaterials = [];
worldScene.traverse(o => { if (o.material) worldMaterials.push(...[].concat(o.material)); });
applyReveal(worldMaterials);
function worldStencil(on) {
  for (const m of worldMaterials) { m.stencilWrite = on; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc; m.stencilZPass = THREE.KeepStencilOp; }
}

export { atmoUniforms, atmosphere, balloons, cloudM, clouds, formPts, formUniforms, islands, orbit, planet, tilt, worldStencil, zoneMarks };
