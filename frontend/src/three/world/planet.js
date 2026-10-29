import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { R, TAU, UP } from '../core/math.js';
import { dpr, small } from '../core/quality.js';
import { box, compact, mat, zoneGroup } from './build.js';
import { C, OCEAN, VEHICLES } from './palette.js';
import { railBasis, railDist, railPt, railTan } from './rail.js';
import { animated, toyKick, toys, trains } from './runtime.js';
import { worldScene } from './stage.js';
import { DUNES, PLATEAU, PR, RAIL_R, TRAIN_SPEED, radiusAt, shadeOf, terrain } from './terrain.js';
import { locoMesh, sailboat, vehMat, wagonGeo } from './vehicles.js';
import { ZONES } from './zones.js';
import { buildCentro } from './zones/centro.js';
import { buildEcology } from './zones/ecologia.js';
import { buildEducation } from './zones/educacao.js';
import { buildRailway } from './zones/ferrovia.js';
import { buildGames } from './zones/jogos.js';
import { buildDunes } from './zones/lencois.js';
import { buildBusiness } from './zones/negocios.js';
import { buildPort } from './zones/porto.js';

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
const BUILDERS = [buildCentro, buildEducation, buildEcology, buildGames, buildBusiness, buildRailway, buildPort, buildDunes];
for (const [i, z] of ZONES.entries()) BUILDERS[i](z.group = zoneGroup(z.dir, z.rail), i);
// Trilhos, dormentes e os trens de minério percorrendo o planeta pelo caminho sinuoso.
{
  const railMat = mat(C.steel, { metalness: 0.6, roughness: 0.4 });
  for (const s of [-1, 1]) {
    const pts = Array.from({ length: 480 }, (_, i) => { const th = i / 480 * TAU, r = railPt(th); return r.clone().multiplyScalar(RAIL_R + 0.008).addScaledVector(new THREE.Vector3().crossVectors(r, railTan(th)), s * 0.022); });
    planet.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 720, 0.0026, 5, true), railMat));
  }
  const n = small ? 140 : 220, sleepers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.016, 0.006, 0.07), mat(C.trunk), n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
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

// Árvores e turbinas espalhadas pelo terreno (fora das áreas construídas, da ferrovia e das dunas).
{
  const spots = [];
  // z.clear: margem extra sem enfeites em volta de uma área (o mar de manobra do Porto, por exemplo).
  const free = d => ZONES.every(z => d.angleTo(z.dir) > (z.clear ?? (z.flat ? z.flat[0] : 0.3))) && railDist(d) > 0.07 && d.angleTo(DUNES) > 0.5;
  for (let tries = 0; spots.length < (small ? 60 : 110) && tries < 5000; tries++) {
    const d = new THREE.Vector3(R() * 2 - 1, R() * 2 - 1, R() * 2 - 1).normalize(), h = terrain(d);
    if (h > 0.03 && h < 0.13 && free(d)) spots.push([d, h]);
  }
  const crowns = new THREE.InstancedMesh(new THREE.ConeGeometry(0.03, 0.08, 6), mat('#ffffff'), spots.length);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.008, 0.03, 5), mat(C.trunk), spots.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), greens = ['#2f9b7a', '#3aa58c', '#4bbf8f', '#2c8f86', '#36b07f', '#5fd39a', '#ff7bb0', '#ffd23f', '#b07cff'].map(h => new THREE.Color(h));
  spots.forEach(([d, h], i) => {
    const s = 0.7 + R() * 0.7; q.setFromUnitVectors(up, d);
    m4.compose(d.clone().multiplyScalar(radiusAt(h) + 0.055 * s), q, new THREE.Vector3(s, s, s)); crowns.setMatrixAt(i, m4); crowns.setColorAt(i, greens[i % 9]);
    m4.compose(d.clone().multiplyScalar(radiusAt(h) + 0.012 * s), q, new THREE.Vector3(s, s, s)); trunks.setMatrixAt(i, m4);
  });
  planet.add(crowns, trunks);

  let made = 0;
  for (let tries = 0; made < 3 && tries < 3000; tries++) {
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
{
  planet.updateMatrixWorld(true);
  const groups = new Map(), toRemove = [], inv = new THREE.Matrix4().copy(planet.matrixWorld).invert();
  planet.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.parent === planet) return;
    for (let a = o; a && a !== planet; a = a.parent) if (a.userData.anim || a.userData.keep) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone());
    if (!o.material.map) g.deleteAttribute('uv');
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    if (!groups.has(o.material)) groups.set(o.material, []);
    groups.get(o.material).push(g); toRemove.push(o);
  });
  toRemove.forEach(o => o.parent.remove(o));
  for (const [m, list] of groups) planet.add(new THREE.Mesh(mergeGeometries(list), m));
}

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
  const n = small ? 1600 : 3000, pos = new Float32Array(n * 3), start = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n);
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
function worldStencil(on) {
  for (const m of worldMaterials) { m.stencilWrite = on; m.stencilRef = 1; m.stencilFunc = THREE.EqualStencilFunc; m.stencilZPass = THREE.KeepStencilOp; }
}

export { atmoUniforms, atmosphere, balloons, cloudM, clouds, formPts, formUniforms, islands, orbit, planet, tilt, worldStencil, zoneMarks };
