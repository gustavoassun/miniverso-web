import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { R, mix, smooth } from '../core/math.js';
import { sag } from './build.js';
import { animated, fxT } from './runtime.js';

// Os miniversianos: os bonequinhos do planeta, com identidade própria. Cabeça grande e redonda (proporção "mini"),
// corpo arredondado de ombros caídos, pernas com sapatos, cabelo com franja e, como marca registrada, um óculos VR
// de armação branca e lente ciano acesa, como o da logo: quem vê um personagem reconhece o Miniverso.
// Cada parte é desenhada de uma vez só para todas as pessoas (instâncias) e os materiais são os mesmos em todas as
// áreas (menos programas de sombreamento para preparar). Altura total ~2 cm na escala das áreas; quadril, ombros e
// centro da cabeça ficam onde sempre estiveram, para os acessórios das áreas (óculos VR, bonés, mochilas) encaixarem.
const SKIN = ['#8d5a3b', '#c68a5e', '#5a3a2a', '#e0b08a', '#a8714a'].map(h => new THREE.Color(h));
const HAIR = ['#1f1611', '#3b2414', '#6b4423', '#14100c', '#b58a4a', '#2a1a10'].map(h => new THREE.Color(h));
const PANTS = ['#2a3446', '#1e4488', '#3a3f4a', '#5a4a3a', '#14213d', '#4a5568'].map(h => new THREE.Color(h));
const HEAD_Y = 0.0166, HEAD_R = 0.0036, HIP = 0.0062, SHOULDER = 0.0126;
// Pinta a geometria (cor por vértice); c pode ser uma função da altura do vértice (sapatos mais escuros, por exemplo).
function paint(geo, c) {
  geo = geo.index ? geo.toNonIndexed() : geo;
  const col = new THREE.Color(), pos = geo.attributes.position, a = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) { col.set(typeof c === 'function' ? c(pos.getY(i)) : c); a[i * 3] = col.r; a[i * 3 + 1] = col.g; a[i * 3 + 2] = col.b; }
  geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (geo.attributes.uv) geo.deleteAttribute('uv');
  return geo;
}
const geos = (() => {
  // Tronco torneado: quadril, cintura, peito e ombros arredondados até o pescoço.
  const prof = [[0, 0.0057], [0.0029, 0.0059], [0.0034, 0.0072], [0.0032, 0.0094], [0.0033, 0.0112], [0.0029, 0.0125], [0.0017, 0.0134], [0, 0.0137]].map(([r, y]) => new THREE.Vector2(r, y));
  const torso = new THREE.LatheGeometry(prof, 12);
  const leg = paint(new THREE.CapsuleGeometry(0.00092, 0.0043, 3, 8).translate(0, -0.0031, 0), y => (y < -0.0049 ? '#3a3a3a' : '#ffffff'));   // pivô no quadril; sapato escuro
  const arm = new THREE.CapsuleGeometry(0.00072, 0.0054, 3, 8).translate(0, -0.0034, 0);          // pivô no ombro
  const head = new THREE.SphereGeometry(HEAD_R, 14, 10).translate(0, HEAD_Y, 0);
  // Cabelo: calota com franja na testa e a nuca coberta.
  const cap = new THREE.SphereGeometry(HEAD_R * 1.07, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.42).translate(0, HEAD_Y + 0.0002, -0.0001);
  const nape = new THREE.SphereGeometry(HEAD_R * 1.05, 10, 4, Math.PI, Math.PI, Math.PI * 0.4, Math.PI * 0.32).translate(0, HEAD_Y, -0.0002);
  const hair = mergeGeometries([cap.toNonIndexed(), nape.toNonIndexed()]);
  // Óculos VR, como o da logo: armação branca arredondada na frente dos olhos e alça escura em volta da cabeça
  // (goggles); a lente ciano que brilha é uma peça à parte (visor), com material aceso.
  const EY = HEAD_Y + 0.0002;
  const goggles = mergeGeometries([
    paint(new RoundedBoxGeometry(0.0058, 0.0024, 0.0013, 2, 0.0005).translate(0, EY, 0.00385), '#eef4fb'),
    paint(new THREE.TorusGeometry(HEAD_R * 1.01, 0.00034, 4, 20).rotateX(Math.PI / 2).translate(0, EY, 0), '#1b1d2a')
  ]);
  const visor = new RoundedBoxGeometry(0.0048, 0.0014, 0.0003, 2, 0.0001).translate(0, EY, 0.0045);
  return { torso, leg, arm, head, hair, goggles, visor };
})();
const MAT = {
  body: new THREE.MeshStandardMaterial({ roughness: 0.68 }),
  legs: new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true }),
  hair: new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }),
  visor: new THREE.MeshStandardMaterial({ color: '#04161f', emissive: '#00b7e3', emissiveIntensity: 2, roughness: 0.25, metalness: 0.3 }),
  hat: new THREE.MeshStandardMaterial({ roughness: 0.65, vertexColors: true, flatShading: true })
};

// Chapéus (uma malha só, com cor por vértice), desenhados para a cabeça e ajustados ao tamanho dela:
//   cor ('#ffd23f')  capacete de obra com aba (trabalhadores do Porto e da Ferrovia);
//   'santa'          gorro de Papai Noel (cone vermelho caído para trás, aba e pompom brancos);
//   'palha'          chapéu de palha com fita vermelha (feira, praia);
//   'fitas'          chapéu de brincante do boi: palha com fitas coloridas pelos lados e por trás e um espelhinho;
//   'gorro'          gorro de lã com pompom (a cor vem de hatColors);
//   'bone'           boné com aba para a frente (a cor vem de hatColors);
//   'safari'         chapéu de aba larga cáqui (guias e trilheiros da Ecologia).
function hatGeo(kind) {
  let parts;
  if (kind === 'santa') {
    const y = 0.0186;
    const cone = new THREE.ConeGeometry(0.0033, 0.0085, 10).translate(0, 0.0042, 0).rotateX(-0.55).translate(0, y, -0.0004);
    const brim = new THREE.TorusGeometry(0.0033, 0.0011, 6, 14).rotateX(Math.PI / 2).translate(0, y, -0.0002);
    const pom = new THREE.SphereGeometry(0.0013, 8, 6).translate(0, y + Math.cos(0.55) * 0.0085, -0.0004 - Math.sin(0.55) * 0.0085);
    parts = [paint(cone, '#d6202b'), paint(brim, '#ffffff'), paint(pom, '#ffffff')];
  } else if (kind === 'palha' || kind === 'fitas') {
    const crown = new THREE.CylinderGeometry(0.0024, 0.0029, 0.0026, 12).translate(0, 0.0197, 0);
    const brim = new THREE.CylinderGeometry(0.0056, 0.0058, 0.0004, 16).translate(0, 0.0185, 0);
    const band = new THREE.CylinderGeometry(0.00295, 0.00295, 0.0008, 12).translate(0, 0.0189, 0);
    parts = [paint(crown, '#e2bf72'), paint(brim, '#d6b064'), paint(band, '#b8322a')];
    if (kind === 'fitas') {
      const C = ['#e8452f', '#ffd23f', '#3ee07a', '#00b7e3', '#ff4fd8', '#b07cff', '#ff8a2a'];
      for (let k = 0; k < 9; k++) {
        const a = Math.PI * 0.82 + (k / 8) * Math.PI * 1.36;                                         // lados e costas: o rosto (+z) fica livre
        parts.push(paint(new THREE.BoxGeometry(0.0009, 0.0068, 0.0002).translate(0, -0.0034, 0).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * 0.0054, 0.0184, Math.sin(a) * 0.0054), C[k % C.length]));
      }
      parts.push(paint(new THREE.CircleGeometry(0.0007, 8).translate(0, 0.0197, 0.00296), '#f4f8ff'));   // espelhinho na frente
    }
  } else if (kind === 'gorro') {
    const dome = new THREE.SphereGeometry(0.0034, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.55).translate(0, 0.0175, -0.0001);
    const rim = new THREE.TorusGeometry(0.0032, 0.0008, 6, 14).rotateX(Math.PI / 2).translate(0, 0.0179, -0.0001);
    const pom = new THREE.SphereGeometry(0.0012, 8, 6).translate(0, 0.0211, -0.0003);
    parts = [paint(dome, '#ffffff'), paint(rim, '#e6e6e6'), paint(pom, '#ffffff')];
  } else if (kind === 'bone') {
    const dome = new THREE.SphereGeometry(0.0034, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.0176, 0);
    const bill = new THREE.CylinderGeometry(0.0026, 0.0026, 0.0004, 12, 1, false, -Math.PI / 2, Math.PI).scale(1, 1, 1.15).translate(0, 0.0178, 0.0018);
    parts = [paint(dome, '#ffffff'), paint(bill, '#d8d8d8')];
  } else if (kind === 'safari') {
    const crown = new THREE.CylinderGeometry(0.0026, 0.0031, 0.0028, 12).translate(0, 0.0196, 0);
    const brim = new THREE.CylinderGeometry(0.0052, 0.0054, 0.0004, 16).translate(0, 0.0184, 0);
    const band = new THREE.CylinderGeometry(0.00315, 0.00315, 0.0007, 12).translate(0, 0.0187, 0);
    parts = [paint(crown, '#c8b48a'), paint(brim, '#b9a477'), paint(band, '#5a4a2a')];
  } else {
    const dome = new THREE.SphereGeometry(0.0036, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.0178, 0);
    const brim = new THREE.CylinderGeometry(0.0046, 0.0046, 0.0006, 12).translate(0, 0.0179, 0.0004);
    const ridge = new THREE.BoxGeometry(0.0009, 0.0012, 0.0066).translate(0, 0.0212, 0);
    parts = [paint(dome, kind), paint(brim, kind), paint(ridge, kind)];
  }
  // Desenhados para a cabeça antiga (raio 0,0031): crescem junto com a cabeça nova, a partir do centro dela.
  const k = HEAD_R / 0.0031;
  return mergeGeometries(parts).translate(0, -HEAD_Y, 0).scale(k, k, k).translate(0, HEAD_Y, 0);
}
const hatCache = {};
const PACK = new THREE.BoxGeometry(0.0044, 0.0052, 0.0022).translate(0, 0.0098, -0.0041);          // mochila nas costas

// Conjunto de malhas instanciadas para n pessoas; place() posiciona uma pessoa com balanço de pernas e braços.
// sc: tamanho (0,8 = crianças). opts: hat (veja hatGeo), hatColors (cores de gorros e bonés), pack (cores das mochilas).
function figures(g, n, colors, sc = 1, opts = {}) {
  const mk = (geo, mat, count) => { const m = new THREE.InstancedMesh(geo, mat, count); m.frustumCulled = false; m.userData.detail = true; g.add(m); return m; };
  const torso = mk(geos.torso, MAT.body, n), head = mk(geos.head, MAT.body, n), hair = mk(geos.hair, MAT.hair, n), goggles = mk(geos.goggles, MAT.hat, n), visor = mk(geos.visor, MAT.visor, n);
  const legs = mk(geos.leg, MAT.legs, 2 * n), arms = mk(geos.arm, MAT.body, 2 * n);
  const hat = opts.hat ? mk(hatCache[opts.hat] ||= hatGeo(opts.hat), MAT.hat, n) : null;
  const pack = opts.pack ? mk(PACK, MAT.body, n) : null;
  const hc = opts.hatColors?.map(c => new THREE.Color(c)), pc = Array.isArray(opts.pack) ? opts.pack.map(c => new THREE.Color(c)) : PANTS;
  for (let k = 0; k < n; k++) {
    const c = new THREE.Color(colors[k % colors.length]), p = PANTS[(k * 7 + 3) % PANTS.length];
    torso.setColorAt(k, c); head.setColorAt(k, SKIN[(k * 3) % SKIN.length]); hair.setColorAt(k, HAIR[(k * 5 + 1) % HAIR.length]);
    legs.setColorAt(2 * k, p); legs.setColorAt(2 * k + 1, p); arms.setColorAt(2 * k, c); arms.setColorAt(2 * k + 1, c);
    if (hat && hc) hat.setColorAt(k, hc[(k * 3 + 1) % hc.length]);
    if (pack) pack.setColorAt(k, pc[(k * 5 + 2) % pc.length]);
  }
  const whole = [torso, head, hair, goggles, visor, hat, pack].filter(Boolean);
  const o = new THREE.Object3D(), part = new THREE.Object3D(), M = new THREE.Matrix4();
  // swing: balanço do passo (−1..1); armsUp: 0 braços para baixo, 1 erguidos (festa); sit: sentado (pernas à frente).
  const place = (k, x, y, z, rotY, swing = 0, armsUp = 0, tilt = 0, sit = 0) => {
    o.position.set(x, y, z); o.rotation.set(0, rotY, tilt); o.scale.setScalar(sc); o.updateMatrix();
    for (const m of whole) m.setMatrixAt(k, o.matrix);                                          // chapéu e mochila acompanham a inclinação do corpo
    for (const s of [-1, 1]) {
      const i = 2 * k + (s > 0 ? 1 : 0);
      part.position.set(s * 0.0013, HIP, 0); part.rotation.set(sit ? -1.45 : s * swing * 0.55, 0, 0); part.updateMatrix(); M.multiplyMatrices(o.matrix, part.matrix); legs.setMatrixAt(i, M);
      const up = mix(0.16, Math.PI - 0.35, armsUp);
      part.position.set(s * 0.0035, SHOULDER, 0); part.rotation.set(-s * swing * 0.6, 0, s * up); part.updateMatrix(); M.multiplyMatrices(o.matrix, part.matrix); arms.setMatrixAt(i, M);
    }
  };
  const done = () => { for (const m of whole) m.instanceMatrix.needsUpdate = true; legs.instanceMatrix.needsUpdate = arms.instanceMatrix.needsUpdate = true; };
  return { place, done, host: torso };
}

// Público parado (assistindo, sentado ou na festa): pulam e erguem os braços quando a interação da área toca.
function crowd(g, spots, zi, colors, opts = {}) {
  const fx = opts.fx || fxT, n = spots.length, f = figures(g, n, colors, 1, opts);
  const people = spots.map(([x, z, y, rot], k) => ({ x, z, y: y ?? (opts.yAt || sag)(x, z), rot, ph: k * 0.7 + R() * 0.5 }));
  // opts.face: para onde olham (radianos, 0 = +z; o 4º valor de cada ponto vale só para aquela pessoa); opts.sit: sentados no chão (pernas à frente);
  // opts.jump / opts.speed: altura e ritmo do pulo na festa (padrão calmo e alegre).
  const face = opts.face || 0, sit = opts.sit ? 1 : 0, jump = opts.jump ?? 0.009, speed = opts.speed ?? 5.5;
  f.host.userData.anim = t => {
    const v = fx(zi), party = v < 0 ? 0 : smooth(0, 0.6, v) * (1 - smooth(8, 9, v));
    people.forEach((p, k) => f.place(k, p.x, p.y + (sit ? 0 : Math.max(0, Math.sin(t * speed + p.ph)) * jump * party), p.z, (p.rot ?? face) + Math.sin(t * 0.6 + p.ph) * (sit ? 0.15 : 0.35), sit ? 0 : Math.sin(t * speed * 1.3 + p.ph) * 0.25 * party, party > 0 ? party * (0.75 + 0.25 * Math.sin(t * speed * 1.3 + p.ph)) : 0, 0, sit));
    f.done();
  };
  animated.push(f.host);
}
// Caminho fechado (lista de pontos x,z) percorrido por distância: devolve posição e direção em s.
function loopPath(pts) {
  const seg = []; let L = 0;
  pts.forEach((a, i) => { const b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); seg.push({ a, b, s: L, l }); L += l; });
  return { L, at(s) {
    s = ((s % L) + L) % L;
    let q = seg[seg.length - 1]; for (const g of seg) if (s < g.s + g.l) { q = g; break; }
    const u = (s - q.s) / q.l, tx = (q.b[0] - q.a[0]) / q.l, tz = (q.b[1] - q.a[1]) / q.l;
    return { x: q.a[0] + (q.b[0] - q.a[0]) * u, z: q.a[1] + (q.b[1] - q.a[1]) * u, tx, tz };
  } };
}
// Pedestres andando por caminhos, nos dois sentidos, com passo de verdade (pernas e braços alternando).
// hat: chapéu de todos (veja hatGeo; uma cor é capacete de obra); opts: hatColors e pack, como em figures().
function walkers(g, loops, per, colors, yAt = sag, hat, opts = {}) {
  const paths = loops.map(loopPath), n = loops.length * per, f = figures(g, n, colors, 1, { ...opts, hat });
  const people = [];
  paths.forEach(p => { for (let k = 0; k < per; k++) people.push({ p, off: (k / per + R() * 0.08) * p.L, sp: 0.011 + R() * 0.006, dir: k % 2 ? 1 : -1, side: (R() - 0.5) * 0.006 + (k % 2 ? 0.003 : -0.003), ph: R() * 9 }); });
  f.host.userData.anim = t => {
    people.forEach((w, i) => {
      const q = w.p.at(w.off + w.dir * t * w.sp), x = q.x - q.tz * w.side, z = q.z + q.tx * w.side, step = Math.sin(t * 10 + w.ph), rot = Math.atan2(-q.tz * w.dir, q.tx * w.dir) + Math.PI / 2;
      const y = yAt(x, z) + Math.abs(step) * 0.0009;
      f.place(i, x, y, z, rot, step, 0, step * 0.04);
    });
    f.done();
  };
  animated.push(f.host);
}

export { crowd, figures, loopPath, walkers };
