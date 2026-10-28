import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { R, TAU, UP } from '../core/math.js';
import { dpr, small } from '../core/quality.js';

// ───────────── Cena 1: capa com o óculos ─────────────
const introScene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 120);

const cosmosUniforms = { uTime: { value: 0 }, uAspect: { value: 1 } };
const cosmos = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShaderMaterial({
  uniforms: cosmosUniforms, depthWrite: false, depthTest: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    uniform float uTime, uAspect; varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0., a = .5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= .5; } return v; }
    void main(){
      vec2 asp = vec2(uAspect, 1.);
      float n = fbm(vUv * asp * 2.2 + vec2(uTime * .012, uTime * .006));
      float tl = smoothstep(1.05, 0., length((vUv - vec2(0., 1.)) * asp));
      float br = smoothstep(1.1, 0., length((vUv - vec2(1., 0.)) * asp));
      float tr = smoothstep(.75, 0., length((vUv - vec2(1., 1.)) * asp));
      float halo = smoothstep(.55, 0., length((vUv - .5) * asp));
      // Cantos com o degradê da marca: azul, índigo e um toque de ciano.
      vec3 col = vec3(.047, .016, .027) + vec3(.06, .13, .27) * tl * (.25 + n) + vec3(.1, .07, .22) * br * (.2 + n)
        + vec3(.0, .2, .25) * tr * n * .45 + vec3(.05, .05, .12) * halo;
      gl_FragColor = vec4(col, 1.);
    }`
}));
cosmos.frustumCulled = false;
cosmos.renderOrder = -10;
introScene.add(cosmos);

// Poeira fina e lenta, só para dar profundidade.
const dustGeo = new THREE.BufferGeometry();
{
  const n = small ? 160 : 300, p = new Float32Array(n * 3), s = new Float32Array(n);
  for (let i = 0; i < n; i++) { p.set([(R() - 0.5) * 14, (R() - 0.5) * 8, -2 - R() * 10], i * 3); s[i] = R(); }
  dustGeo.setAttribute('position', new THREE.BufferAttribute(p, 3));
  dustGeo.setAttribute('aSeed', new THREE.BufferAttribute(s, 1));
}
// Quando o óculos vem até o rosto, a poeira passa por nós, como entrar em movimento.
const dustUniforms = { uTime: { value: 0 }, uPx: { value: dpr }, uWarp: { value: 0 } };
introScene.add(new THREE.Points(dustGeo, new THREE.ShaderMaterial({
  uniforms: dustUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  vertexShader: `attribute float aSeed; uniform float uTime, uPx, uWarp; varying float vA;
    void main(){ vec3 p = position; p.y += sin(uTime * .15 + aSeed * 30.) * .3; p.x += cos(uTime * .1 + aSeed * 20.) * .2; p.z += uWarp * (6. + aSeed * 6.);
      vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv; gl_PointSize = uPx * (1.2 + aSeed * 1.8) * (1. + uWarp * 1.5);
      vA = .25 + .35 * sin(uTime * (.5 + aSeed) + aSeed * 40.) * .5 + .2; }`,
  fragmentShader: `varying float vA; void main(){ float r = length(gl_PointCoord - .5); gl_FragColor = vec4(vec3(.6, .85, 1.), smoothstep(.5, .1, r) * vA); }`
})));

const keyLight = new THREE.DirectionalLight('#f3f8ff', 2.4); keyLight.position.set(-2.5, 3.5, 5);
const rimLight = new THREE.DirectionalLight('#00b7e3', 2.2); rimLight.position.set(4, 1.5, -4);
const fillLight = new THREE.HemisphereLight('#9fcfff', '#0a1220', 0.5);
introScene.add(keyLight, rimLight, fillLight);

// Óculos aprovado (versão branca): visor de vidro com luz no contorno, friso prateado,
// conectores cromados e alças no estilo do site atual.
function goggle(W, H, n, dip, width = 0.24) {
  return (t, sx = 1, sy = 1) => {
    const c = Math.cos(t), s = Math.sin(t);
    let x = W * sx * Math.sign(c) * Math.abs(c) ** (2 / n), y = H * sy * Math.sign(s) * Math.abs(s) ** (2 / n);
    if (y < 0) y += H * sy * dip * Math.exp(-(((x / (W * sx)) / width) ** 2));
    return [x, y];
  };
}
function shapeOf(out, sx, sy, hole) {
  const shape = new THREE.Shape();
  for (let i = 0; i <= 200; i++) { const [x, y] = out(i / 200 * TAU, sx, sy); i ? shape.lineTo(x, y) : shape.moveTo(x, y); }
  if (hole) { const p = new THREE.Path(); for (let i = 0; i <= 200; i++) { const [x, y] = out(-i / 200 * TAU, hole[0], hole[1]); i ? p.lineTo(x, y) : p.moveTo(x, y); } shape.holes.push(p); }
  return shape;
}
// Superfície curva no formato do visor, com UV de -1 a 1 nas bordas (para a tela do visor).
function curvedSurface(out, ow, oh, sx, sy, zOf, seg = 48) {
  const g = new THREE.PlaneGeometry(2, 2, seg, seg), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i), s = Math.max(Math.abs(u), Math.abs(v));
    let x = 0, y = 0;
    if (s > 1e-6) { const [ex, ey] = out(Math.atan2(v, u), sx, sy); x = ex * s; y = ey * s; }
    p.setXYZ(i, x, y, zOf(x)); uv.setXY(i, x / (ow * sx) * 0.5 + 0.5, y / (oh * sy) * 0.5 + 0.5);
  }
  g.computeVertexNormals();
  return g;
}
const extrude = (shape, depth, bevel, size = bevel * 0.9, segs = 10) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: size, bevelSegments: segs, curveSegments: 12 });
const bend = (geo, w, k) => { const p = geo.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + k * (1 - (p.getX(i) / w) ** 2)); geo.computeVertexNormals(); return geo; };
function perforated(repeatX, repeatY) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#9a9a9a'; x.fillRect(0, 0, 128, 128); x.fillStyle = '#202020';
  for (let r = 0; r < 8; r++) for (let k = 0; k < 8; k++) { x.beginPath(); x.arc(k * 16 + (r % 2 ? 8 : 0) + 4, r * 16 + 8, 2.6, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = 4;
  return t;
}
function fabricGrain() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'); x.fillStyle = '#808080'; x.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 128; i += 4) { x.fillStyle = 'rgba(0,0,0,.18)'; x.fillRect(0, i, 128, 1); x.fillStyle = 'rgba(255,255,255,.1)'; x.fillRect(i, 0, 1, 128); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(30, 2);
  return t;
}
// Referencial da alça num ponto: largura sempre no eixo indicado (em pé na lateral, deitada no topo).
function frameAt(curve, u, axis) {
  const t = curve.getTangentAt(u), b = axis.clone().addScaledVector(t, -t.dot(axis)).normalize(), n = new THREE.Vector3().crossVectors(t, b);
  return { t, n, b };
}
function strapAlong(curve, width, thick, axis, steps = 120) {
  const pos = [], uv = [], idx = [], ring = 10;
  const prof = Array.from({ length: ring }, (_, i) => { const a = i / ring * TAU; const c = Math.cos(a), s = Math.sin(a); return [Math.sign(c) * Math.abs(c) ** 0.35 * thick / 2, Math.sign(s) * Math.abs(s) ** 0.35 * width / 2]; });
  for (let i = 0; i <= steps; i++) {
    const p = curve.getPointAt(i / steps), { n, b } = frameAt(curve, i / steps, axis);
    for (let j = 0; j <= ring; j++) { const [u, v] = prof[j % ring]; pos.push(p.x + n.x * u + b.x * v, p.y + n.y * u + b.y * v, p.z + n.z * u + b.z * v); uv.push(i / steps, j / ring); }
  }
  for (let i = 0; i < steps; i++) for (let j = 0; j < ring; j++) { const a = i * (ring + 1) + j, d = a + ring + 1; idx.push(a, d, a + 1, d, d + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Peça que abraça a alça num ponto da curva (mesmo referencial usado para desenhar a alça).
function wrapOn(curve, u, width, thick, len, mat, axis) {
  const { t, n, b } = frameAt(curve, u, axis);
  const m = new THREE.Mesh(new RoundedBoxGeometry(width, thick, len, 5, Math.min(width, thick) * 0.3), mat);
  m.position.copy(curve.getPointAt(u));
  m.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(b, n, t));
  return m;
}
const SIDE = new THREE.Vector3(1, 0, 0);

const W = 1.5, H = 0.7, out = goggle(W, H, 4.4, 0.22);
const rig = new THREE.Group();
introScene.add(rig);

const glassM = new THREE.MeshPhysicalMaterial({ color: '#1b1f26', roughness: 0.04, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6 });
const bodyM = new THREE.MeshPhysicalMaterial({ color: '#eef3f8', roughness: 0.22, metalness: 0.15, clearcoat: 0.8, clearcoatRoughness: 0.15, envMapIntensity: 1.1 });
const chromeM = new THREE.MeshPhysicalMaterial({ color: '#d5dde6', roughness: 0.16, metalness: 1, envMapIntensity: 1.3 });
const padM = new THREE.MeshStandardMaterial({ color: '#30343c', roughness: 0.85, bumpMap: perforated(6, 3), bumpScale: 1.2 });
const darkM = new THREE.MeshStandardMaterial({ color: '#5f6772', roughness: 0.6 });
const ledBase = new THREE.Color('#00b7e3');
const ledM = new THREE.MeshBasicMaterial({ color: ledBase, toneMapped: false });
const glowM = new THREE.MeshBasicMaterial({ color: ledBase, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

// Visor: placa de vidro com bordas bem arredondadas, levemente abaulada.
const visor = new THREE.Mesh(bend(extrude(shapeOf(out, 1, 1), 0.12, 0.16, 0.13, 14), W, 0.12), glassM); visor.position.z = 0.3; rig.add(visor);
const frontAt = x => 0.3 + 0.12 + 0.16 + 0.12 * (1 - (x / W) ** 2);

// Luz do contorno, logo dentro da borda do visor, com halo suave.
const ringCurve = new THREE.CatmullRomCurve3(Array.from({ length: 260 }, (_, i) => { const [x, y] = out(i / 260 * TAU, 0.88, 0.8); return new THREE.Vector3(x, y, frontAt(x) + 0.004); }), true);
rig.add(new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 400, 0.026, 10, true), ledM));
rig.add(new THREE.Mesh(new THREE.TubeGeometry(ringCurve, 400, 0.085, 10, true), glowM));

// Friso prateado entre visor e corpo.
rig.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(Array.from({ length: 220 }, (_, i) => { const [x, y] = out(i / 220 * TAU, 1.07, 1.19); return new THREE.Vector3(x, y, 0.16); }), true), 300, 0.034, 10, true), chromeM));

// Corpo atrás do visor.
const bodyOut = goggle(W * 0.98, H * 0.94, 4.2, 0.18);
const body = new THREE.Mesh(extrude(shapeOf(bodyOut, 1, 1), 0.5, 0.15), bodyM); body.position.z = -0.34; rig.add(body);
const topY = H * 0.94 + 0.14;

// Interface facial: almofada perfurada e lentes.
const seal = new THREE.Mesh(extrude(shapeOf(bodyOut, 0.97, 0.94, [0.7, 0.5]), 0.22, 0.1), padM); seal.position.z = -0.84; rig.add(seal);
const LENS_X = 0.58, LENS_Z = -0.5, LENS_R = 0.27;
for (const side of [-1, 1]) {
  const lens = new THREE.Mesh(new THREE.CircleGeometry(LENS_R, 48), glassM); lens.rotation.y = Math.PI; lens.position.set(side * LENS_X, 0, LENS_Z); rig.add(lens);
  const lr = new THREE.Mesh(new THREE.TorusGeometry(LENS_R + 0.01, 0.035, 12, 64), darkM); lr.position.set(side * LENS_X, 0, LENS_Z - 0.01); rig.add(lr);
}

// Alças (somem com suavidade quando o óculos vira para o rosto).
const strapGroup = new THREE.Group(); rig.add(strapGroup);
const strapM = new THREE.MeshStandardMaterial({ color: '#41454d', roughness: 0.92, metalness: 0, bumpMap: fabricGrain(), bumpScale: 0.6, transparent: true });
const buckleM = new THREE.MeshPhysicalMaterial({ color: '#e8eef5', roughness: 0.35, metalness: 0.3, clearcoat: 0.6, transparent: true });
const plateM = new THREE.MeshStandardMaterial({ color: '#5f6772', roughness: 0.6, transparent: true });
const dotM = new THREE.MeshBasicMaterial({ color: ledBase, toneMapped: false, transparent: true });
const strapFade = [strapM, buckleM, plateM, dotM];
const sideCurve = new THREE.CatmullRomCurve3([[1.68, 0, -0.2], [1.64, 0.06, -1.0], [0.92, 0.12, -1.86], [0, 0.14, -2.08], [-0.92, 0.12, -1.86], [-1.64, 0.06, -1.0], [-1.68, 0, -0.2]].map(p => new THREE.Vector3(...p)));
strapGroup.add(new THREE.Mesh(strapAlong(sideCurve, 0.36, 0.11, UP, 180), strapM));
const topCurve = new THREE.CatmullRomCurve3([[0, topY + 0.02, -0.08], [0, topY + 0.38, -0.62], [0, topY + 0.4, -1.28], [0, topY - 0.02, -1.86], [0, 0.26, -2.06]].map(p => new THREE.Vector3(...p)));
strapGroup.add(new THREE.Mesh(strapAlong(topCurve, 0.32, 0.1, SIDE, 140), strapM));

// Conectores cromados na frente; fivela lateral de peça única, com plaquinha e luz.
for (const s of [-1, 1]) {
  const conn = new THREE.Mesh(new RoundedBoxGeometry(0.18, 0.44, 0.5, 6, 0.07), chromeM); conn.position.set(s * 1.64, -0.02, -0.12); rig.add(conn);
  const recess = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.22, 0.28, 4, 0.02), darkM); recess.position.set(s * 1.72, -0.02, -0.12); rig.add(recess);
  const u = s > 0 ? 0.13 : 0.87, outward = frameAt(sideCurve, u, UP).n;
  const buckle = wrapOn(sideCurve, u, 0.46, 0.2, 0.32, buckleM, UP); strapGroup.add(buckle);
  const plate = wrapOn(sideCurve, u, 0.3, 0.02, 0.2, plateM, UP); plate.position.addScaledVector(outward, 0.098); strapGroup.add(plate);
  const dot = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.11, 4, 8), dotM);
  dot.position.copy(sideCurve.getPointAt(u)).addScaledVector(outward, 0.112); dot.quaternion.copy(buckle.quaternion); strapGroup.add(dot);
  const btn = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.09, 0.2, 3, 0.02), darkM); btn.position.set(s * 1.58, -0.36, 0.0); rig.add(btn);
}

// Grade de som no topo e saídas embaixo.
const grill = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.035, 0.2, 4, 0.014), new THREE.MeshStandardMaterial({ color: '#d3d9e0', roughness: 0.5, bumpMap: perforated(3, 1.4), bumpScale: 2 }));
grill.position.set(0.6, topY - 0.005, -0.02); rig.add(grill);
const btn2 = new THREE.Mesh(new RoundedBoxGeometry(0.24, 0.04, 0.08, 3, 0.015), chromeM); btn2.position.set(-0.6, topY, 0.02); rig.add(btn2);
for (const x of [-1.0, -0.82, 0.82, 1.0]) { const v = new THREE.Mesh(new RoundedBoxGeometry(0.16, 0.05, 0.08, 3, 0.018), darkM); v.position.set(x, -H * 0.9 - 0.1, 0.0); rig.add(v); }

// Sombra suave e brilho azul embaixo do óculos (só na capa).
const radial = (inner, outer) => { const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d'); const gr = x.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, inner); gr.addColorStop(1, outer); x.fillStyle = gr; x.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); };
const shadow = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 3.6), new THREE.MeshBasicMaterial({ map: radial('rgba(0,0,0,.7)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }));
const underglow = new THREE.Mesh(new THREE.PlaneGeometry(4, 2.4), new THREE.MeshBasicMaterial({ map: radial('rgba(255,255,255,1)', 'rgba(255,255,255,0)'), color: '#00b7e3', transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
shadow.rotation.x = underglow.rotation.x = -Math.PI / 2;
introScene.add(shadow, underglow);

// Tela do visor: luz sob o vidro (brilho no ponteiro, pixels, onda, varredura de entrada) e o nome Miniverso.
const DS = { x: 0.97, y: 0.95 };
const NAME = new THREE.Vector2(0.6, 0.6 * DS.x * W / (640 / 110) / (DS.y * H));
const displayUniforms = {
  uTime: { value: 0 }, uPower: { value: 0 }, uHover: { value: 0 }, uSweep: { value: 0 }, uFade: { value: 1 },
  uPoint: { value: new THREE.Vector2(9, 9) }, uRipP: { value: new THREE.Vector2(0, 0) }, uRipT: { value: -1 },
  uName: { value: 0 }, uNameSize: { value: NAME }, uNameTex: { value: null }, uAspect: { value: (DS.x * W) / (DS.y * H) }
};
const display = new THREE.Mesh(curvedSurface(out, W, H, DS.x, DS.y, x => frontAt(x) + 0.006, 40), new THREE.ShaderMaterial({
  uniforms: displayUniforms, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
  fragmentShader: `
    uniform float uTime, uPower, uHover, uSweep, uFade, uRipT, uName, uAspect; uniform vec2 uPoint, uRipP, uNameSize; uniform sampler2D uNameTex; varying vec2 vUv;
    void main(){
      vec2 q = (vUv - .5) * 2.;
      vec2 qa = q * vec2(uAspect, 1.);
      float e = pow(abs(q.x), 4.) + pow(abs(q.y), 4.);
      vec2 grid = vec2(64., 26.);
      vec2 f = fract(vUv * grid) - .5, cell = floor(vUv * grid);
      float sq = smoothstep(.34, .22, max(abs(f.x), abs(f.y)));
      vec2 cq = (((cell + .5) / grid) - .5) * 2. * vec2(uAspect, 1.);
      float h = fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453);
      float dp = distance(qa, uPoint * vec2(uAspect, 1.));
      float glow = uHover * exp(-dp * dp * 3.5);
      float pix = uHover * smoothstep(.6, 0., distance(cq, uPoint * vec2(uAspect, 1.))) * (.4 + .6 * h) * sq;
      float ring = 0.;
      if (uRipT >= 0.) ring = smoothstep(.12, 0., abs(distance(cq, uRipP * vec2(uAspect, 1.)) - uRipT * 3.)) * (1. - clamp(uRipT / 1.1, 0., 1.)) * sq;
      float boot = smoothstep(.16, 0., abs(q.x - mix(-1.3, 1.3, uPower))) * step(.001, uPower) * step(uPower, .999) * sq * step(.35, h);
      float sweep = smoothstep(.14, 0., abs(q.x * .6 - q.y * .4 - mix(-1.4, 1.4, uSweep))) * step(.001, uSweep) * step(uSweep, .999);
      float breathe = (.5 + .5 * sin(uTime * 1.2)) * smoothstep(1., 0., e) * .05 * (1. - uName);
      vec3 col = vec3(0., .72, .89) * (glow * .28 + pix * .55 + ring * .8 + boot * .6 + breathe) + vec3(.7, .85, 1.) * sweep * .12;
      vec2 nu = (q / uNameSize) * .5 + .5;
      if (uName > 0. && nu.x > 0. && nu.x < 1. && nu.y > 0. && nu.y < 1.) { vec4 t = texture2D(uNameTex, nu); col += t.rgb * t.a * uName; }
      col *= smoothstep(1., .9, e) * uFade;
      gl_FragColor = vec4(col, 1.);
    }`
}));
display.renderOrder = 3;
rig.add(display);

document.fonts.load('700 200px "Random Grotesque"').then(() => {
  const c = document.createElement('canvas'), ctx = c.getContext('2d'), font = '700 200px "Random Grotesque", "Segoe UI", sans-serif';
  const setup = () => { ctx.font = font; if ('letterSpacing' in ctx) ctx.letterSpacing = '-6px'; };
  setup();
  c.width = Math.ceil(ctx.measureText('miniverso').width) + 12; c.height = 200;
  setup(); ctx.fillStyle = '#eef3fb'; ctx.textBaseline = 'alphabetic'; ctx.fillText('miniverso', 6, 170);
  NAME.y = NAME.x * DS.x * W / (c.width / c.height) / (DS.y * H);
  const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
  displayUniforms.uNameTex.value = tex;
});

// Discos invisíveis nas lentes: marcam no stencil por onde o mundo aparece.
const lensWindows = [-1, 1].map(side => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(LENS_R, 64), new THREE.MeshBasicMaterial({
    colorWrite: false, depthWrite: false, side: THREE.DoubleSide,
    stencilWrite: true, stencilRef: 1, stencilFunc: THREE.AlwaysStencilFunc, stencilZPass: THREE.ReplaceStencilOp
  }));
  m.position.set(side * LENS_X, 0, LENS_Z - 0.04); m.renderOrder = 10; m.userData.side = side;
  rig.add(m);
  return m;
});
// Borda escura das lentes, desenhada por cima do mundo para parecer vidro de lente.
const rimScene = new THREE.Scene();
const rimGroup = new THREE.Group(); rimGroup.matrixAutoUpdate = false; rimScene.add(rimGroup);
const rimUniforms = { uFade: { value: 1 } };
const lensRims = [-1, 1].map(side => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(LENS_R, 64), new THREE.ShaderMaterial({
    uniforms: rimUniforms, transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform float uFade; varying vec2 vUv;
      void main(){ float r = length(vUv - .5) * 2.; float a = smoothstep(.62, 1., r) * .9; vec3 c = mix(vec3(0.), vec3(.35, .8, 1.), smoothstep(.93, 1., r) * .35);
        gl_FragColor = vec4(c, a * uFade); }`
  }));
  m.position.set(side * LENS_X, 0, LENS_Z - 0.045);
  rimGroup.add(m);
  return m;
});

export { DS, LENS_R, LENS_X, LENS_Z, NAME, W, camera, cosmosUniforms, display, displayUniforms, dustUniforms, frontAt, glowM, introScene, ledBase, ledM, lensRims, lensWindows, rig, rimGroup, rimScene, rimUniforms, shadow, strapFade, strapGroup, underglow };
