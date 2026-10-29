import * as THREE from 'three';
import { clamp, smooth, smoother } from '../core/math.js';

// Cabine do maquinista presa à câmera, em camadas leves (sem teste de profundidade, por cima de tudo):
// 1) moldura e painel desenhados uma vez (refeitos só se a proporção da tela mudar);
// 2) instrumentos numa imagem pequena, só da caixa, atualizada 10 vezes por segundo: velocímetro em arco, mapa da
//    linha com o trem e a próxima área, luzes de estado e alavanca de tração;
// 3) íris da transição calculada na placa de vídeo (círculo escuro com anel ciano) e a legenda desenhada uma vez.
// O canto inferior esquerdo fica livre para o cartão da área.
const D = 0.02;                                                                            // distância das camadas à câmera
const cabin = new THREE.Group(); cabin.visible = false;
const CYAN = '#00b7e3', AMBER = '#ffc56b', SANS = "'Random Grotesque', system-ui, sans-serif", MONO = 'ui-monospace, Menlo, Consolas, monospace', TAU = Math.PI * 2;
// Áreas ao longo da linha (posição na volta e nome), para o mapa e a "próxima área".
const STOPS = [[0.25, 'Porto', '#3fbfe8'], [0.85, 'Ferrovia', AMBER], [1.45, 'Negócios', '#9f8cff'], [2.2, 'Educação', '#3ee07a'], [3.1, 'Centro Histórico', '#ff8a6b'], [4.5, 'Jogos', '#ff4fd8'], [5.05, 'Ecologia', '#3aa58c'], [5.5, 'Lençóis', '#f4ecd6']];

const layer = (material, order) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material); m.renderOrder = order; m.frustumCulled = false; m.position.z = -D; cabin.add(m); return m; };
const flat = (extra = {}) => new THREE.MeshBasicMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false, ...extra });
const frameMesh = layer(flat(), 50), instMesh = layer(flat(), 51);
const irisU = { uR: { value: 2 }, uAspect: { value: 1 } };
const irisMesh = layer(new THREE.ShaderMaterial({
  uniforms: irisU, transparent: true, depthTest: false, depthWrite: false,
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
  fragmentShader: `uniform float uR, uAspect; varying vec2 vUv;
    void main(){
      float d = length((vUv - .5) * vec2(uAspect, 1.)), dark = smoothstep(uR, uR + .004, d);
      float ring = exp(-abs(d - uR) * 90.) * step(.002, uR);
      gl_FragColor = vec4(mix(vec3(.016, .024, .04), vec3(0., .72, .89), ring / max(dark + ring, .001)), clamp(dark + ring, 0., 1.));
    }`
}), 52);
const captionMesh = layer(flat(), 53), barTrack = layer(flat({ color: '#ffffff', opacity: 0.12 }), 54), bar = layer(flat({ color: CYAN }), 55);

// Converte um retângulo em pixels do quadro (W×H) para o plano da câmera (meia largura w, meia altura h).
let W = 0, H = 0, aspect = 0, bin, w = 1, h = 1;
const place = (m, x, y, pw, ph) => { m.position.x = (x + pw / 2) / W * 2 * w - w; m.position.y = h - (y + ph / 2) / H * 2 * h; m.scale.set(pw / W * 2 * w, ph / H * 2 * h, 1); };
const canvasMap = (mesh, cv) => { mesh.material.map?.dispose(); mesh.material.map = new THREE.CanvasTexture(cv); mesh.material.map.colorSpace = THREE.SRGBColorSpace; mesh.material.needsUpdate = true; };

// Moldura: interior, vidro com quebra-sol e reflexos, coluna central, painel com friso e a caixa de vidro.
const frameCv = document.createElement('canvas'), instCv = document.createElement('canvas'), instCtx = instCv.getContext('2d'), IS = 1.25;
function buildFrame(a) {
  aspect = a; W = a >= 1 ? 1280 : 900; H = Math.round(clamp(W / a, 360, 1800));
  frameCv.width = W; frameCv.height = H;
  const x = frameCv.getContext('2d'), m = Math.min(W, H);
  const win = { x0: W * 0.04, y0: H * 0.07, x1: W * 0.96, y1: H * 0.69, r: m * 0.06 }, ww = win.x1 - win.x0, wh = win.y1 - win.y0;
  let g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#1e242d'); g.addColorStop(0.6, '#161b22'); g.addColorStop(1, '#0c0f14');
  x.fillStyle = g; x.beginPath(); x.rect(0, 0, W, H); x.roundRect(win.x0, win.y0, ww, wh, win.r); x.fill('evenodd');
  x.save(); x.beginPath(); x.roundRect(win.x0, win.y0, ww, wh, win.r); x.clip();
  g = x.createLinearGradient(0, win.y0, 0, win.y0 + wh * 0.22); g.addColorStop(0, 'rgba(8,24,48,.6)'); g.addColorStop(1, 'rgba(8,24,48,0)'); x.fillStyle = g; x.fillRect(win.x0, win.y0, ww, wh * 0.22);
  for (const [px, wd] of [[0.18, 0.05], [0.26, 0.018], [0.66, 0.04]]) {
    x.fillStyle = 'rgba(255,255,255,.05)'; x.beginPath(); x.moveTo(win.x0 + ww * px, win.y1); x.lineTo(win.x0 + ww * (px + wd), win.y1); x.lineTo(win.x0 + ww * (px + wd + 0.12), win.y0); x.lineTo(win.x0 + ww * (px + 0.12), win.y0); x.fill();
  }
  x.restore();
  x.strokeStyle = '#06080b'; x.lineWidth = m * 0.014; x.beginPath(); x.roundRect(win.x0, win.y0, ww, wh, win.r); x.stroke();
  x.strokeStyle = 'rgba(255,255,255,.07)'; x.lineWidth = 2; x.beginPath(); x.roundRect(win.x0 - m * 0.01, win.y0 - m * 0.01, ww + m * 0.02, wh + m * 0.02, win.r * 1.15); x.stroke();
  const cx = W / 2, cw = m * 0.016; g = x.createLinearGradient(cx - cw, 0, cx + cw, 0); g.addColorStop(0, '#11151b'); g.addColorStop(0.5, '#2c333d'); g.addColorStop(1, '#11151b');
  x.fillStyle = g; x.beginPath(); x.roundRect(cx - cw / 2, win.y0 - 2, cw, wh + 4, cw / 2); x.fill();
  const top = win.y1 + H * 0.035;
  x.beginPath(); x.moveTo(0, top + H * 0.02); x.quadraticCurveTo(W / 2, top - H * 0.03, W, top + H * 0.02); x.lineTo(W, H); x.lineTo(0, H); x.closePath();
  g = x.createLinearGradient(0, top, 0, H); g.addColorStop(0, '#2b323c'); g.addColorStop(0.25, '#1a1f26'); g.addColorStop(1, '#0d1015'); x.fillStyle = g; x.fill();
  x.save(); x.shadowColor = CYAN; x.shadowBlur = 12; x.strokeStyle = 'rgba(0,183,227,.7)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(0, top + H * 0.02); x.quadraticCurveTo(W / 2, top - H * 0.03, W, top + H * 0.02); x.stroke(); x.restore();
  // Caixa dos instrumentos com a largura exata das peças (≈ 3,15 alturas), em até 56% da tela, à direita.
  const bh = Math.min(H - top - H * 0.05, m * 0.24, W * 0.56 / 3.15), bw = bh * 3.15;
  bin = { x: W * 0.95 - bw, y: top + (H - top - bh) * 0.55, w: bw, h: bh };
  x.save(); x.shadowColor = 'rgba(0,0,0,.6)'; x.shadowBlur = 18; x.fillStyle = 'rgba(7,11,17,.92)'; x.beginPath(); x.roundRect(bin.x, bin.y, bw, bh, bh * 0.14); x.fill(); x.restore();
  x.strokeStyle = 'rgba(0,183,227,.28)'; x.lineWidth = 1.5; x.beginPath(); x.roundRect(bin.x, bin.y, bw, bh, bh * 0.14); x.stroke();
  canvasMap(frameMesh, frameCv);
  instCv.width = Math.round(bw * IS); instCv.height = Math.round(bh * IS);
  canvasMap(instMesh, instCv);
}

// Instrumentos, desenhados em coordenadas locais da caixa (0..bw × 0..bh).
function drawInstruments(t, th) {
  const x = instCtx, bw = bin.w, bh = bin.h, pad = bh * 0.12;
  x.setTransform(IS, 0, 0, IS, 0, 0); x.clearRect(0, 0, bw, bh);
  let g = x.createLinearGradient(0, 0, 0, bh * 0.4); g.addColorStop(0, 'rgba(255,255,255,.06)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.beginPath(); x.roundRect(2, 2, bw - 4, bh * 0.4, bh * 0.12); x.fill();
  // Velocímetro em arco.
  const r = bh * 0.36, sx = pad + r, sy = bh * 0.54, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2, v = 0.62 + Math.sin(t * 0.7) * 0.02;
  x.lineCap = 'round'; x.lineWidth = bh * 0.07; x.strokeStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.arc(sx, sy, r, a0, a1); x.stroke();
  g = x.createLinearGradient(sx - r, 0, sx + r, 0); g.addColorStop(0, '#0a7fa3'); g.addColorStop(1, CYAN);
  x.save(); x.shadowColor = CYAN; x.shadowBlur = 10; x.strokeStyle = g; x.beginPath(); x.arc(sx, sy, r, a0, a0 + (a1 - a0) * v); x.stroke(); x.restore();
  x.textAlign = 'center'; x.fillStyle = '#ffffff'; x.font = `600 ${Math.round(bh * 0.3)}px ${SANS}`; x.fillText(String(Math.round(46 + v * 6)), sx, sy + bh * 0.08);
  x.fillStyle = 'rgba(255,255,255,.55)'; x.font = `${Math.round(bh * 0.09)}px ${MONO}`; x.fillText('km/h', sx, sy + bh * 0.22);
  // Mapa da linha com o trem e a próxima área.
  const mx = sx + r + pad * 1.2, mw = bh * 1.15, my = pad, mh = bh - pad * 2;
  x.fillStyle = '#071d26'; x.beginPath(); x.roundRect(mx, my, mw, mh, bh * 0.08); x.fill(); x.strokeStyle = 'rgba(0,183,227,.25)'; x.lineWidth = 1; x.stroke();
  const lx = mx + mw * 0.3, ly = my + mh * 0.52, lr = Math.min(mw * 0.22, mh * 0.36);
  const pt = s => { const k = 1 + 0.14 * Math.sin(2 * s + 0.6); return [lx + Math.cos(s) * lr * k, ly + Math.sin(s) * lr * k]; };
  x.strokeStyle = 'rgba(0,183,227,.7)'; x.lineWidth = 2; x.beginPath(); for (let i = 0; i <= 72; i++) x.lineTo(...pt(i / 72 * TAU)); x.stroke();
  for (const [s, , c] of STOPS) { x.fillStyle = c; x.beginPath(); x.arc(...pt(s), 2.6, 0, TAU); x.fill(); }
  const pos = ((th % TAU) + TAU) % TAU, next = STOPS.find(s => s[0] > pos) || STOPS[0];
  x.save(); x.shadowColor = '#ffffff'; x.shadowBlur = 10 + Math.sin(t * 4) * 4; x.fillStyle = '#ffffff'; x.beginPath(); x.arc(...pt(pos), 4, 0, TAU); x.fill(); x.restore();
  x.textAlign = 'left'; x.fillStyle = 'rgba(255,255,255,.5)'; x.font = `${Math.round(bh * 0.075)}px ${MONO}`; x.fillText('PRÓXIMA ÁREA', mx + mw * 0.6, my + mh * 0.36);
  x.fillStyle = next[2]; x.font = `600 ${Math.round(bh * 0.12)}px ${SANS}`; x.fillText(next[1], mx + mw * 0.6, my + mh * 0.56, mw * 0.38);
  // Luzes de estado.
  const ex = mx + mw + pad * 1.1;
  [['TRAÇÃO', '#3ee07a', true], ['FREIO', AMBER, true], ['SINAL', '#3ee07a', Math.sin(t * 3) > -0.2]].forEach(([label, c, on], i) => {
    const ey = pad + bh * 0.13 + i * bh * 0.25;
    x.save(); if (on) { x.shadowColor = c; x.shadowBlur = 8; } x.fillStyle = on ? c : 'rgba(255,255,255,.12)'; x.beginPath(); x.arc(ex + bh * 0.04, ey - bh * 0.03, bh * 0.035, 0, TAU); x.fill(); x.restore();
    x.fillStyle = 'rgba(255,255,255,.7)'; x.font = `${Math.round(bh * 0.08)}px ${MONO}`; x.fillText(label, ex + bh * 0.11, ey);
  });
  // Alavanca de tração no trilho com marcas.
  const tx = bw - pad * 1.4, ty0 = pad, ty1 = bh - pad, hy = ty0 + (ty1 - ty0) * (0.3 + Math.sin(t * 0.4) * 0.03);
  x.fillStyle = '#0f1318'; x.beginPath(); x.roundRect(tx - bh * 0.025, ty0, bh * 0.05, ty1 - ty0, bh * 0.025); x.fill();
  for (let i = 0; i < 5; i++) { x.fillStyle = 'rgba(255,255,255,.25)'; x.fillRect(tx + bh * 0.05, ty0 + (ty1 - ty0) * i / 4 - 1, bh * 0.05, 2); }
  const hg = x.createLinearGradient(tx - bh * 0.1, 0, tx + bh * 0.1, 0); hg.addColorStop(0, '#c0392b'); hg.addColorStop(0.5, '#ff6b5a'); hg.addColorStop(1, '#a12b20');
  x.fillStyle = hg; x.beginPath(); x.roundRect(tx - bh * 0.1, hy - bh * 0.045, bh * 0.2, bh * 0.09, bh * 0.045); x.fill();
  instMesh.material.map.needsUpdate = true;
}

// Legenda da transição, desenhada uma vez para entrar e outra para sair.
const captions = {};
function caption(entering) {
  if (captions[entering]) return captions[entering];
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const x = cv.getContext('2d');
  x.textAlign = 'center'; x.fillStyle = CYAN; x.font = `30px ${MONO}`; x.fillText(entering ? 'E M B A R C A N D O' : 'D E S E M B A R C A N D O', 512, 90);
  x.fillStyle = '#ffffff'; x.font = `600 84px ${SANS}`; x.fillText(entering ? 'Cabine do maquinista' : 'Voltando à Ferrovia', 512, 185);
  const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace; return (captions[entering] = tx);
}

let last = -1, lastEntering = null;
// k: progresso da entrada (0 fora, 1 dentro). Fecha a íris (0–0,25), escuro com a legenda (0,25–0,7), abre na cabine (0,7–1).
function updateCabin(camera, t, th, k, entering = true) {
  h = D * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)); w = h * camera.aspect;
  if (Math.abs(camera.aspect - aspect) > 0.01) { buildFrame(camera.aspect); last = -1; }
  cabin.position.copy(camera.position); cabin.quaternion.copy(camera.quaternion);
  // Moldura e instrumentos só com a câmera já na cabine.
  const inside = k >= 0.7;
  frameMesh.visible = instMesh.visible = inside;
  if (inside) {
    place(frameMesh, 0, 0, W, H); place(instMesh, bin.x, bin.y, bin.w, bin.h);
    if (t - last >= 0.1 || last < 0) { drawInstruments(t, th); last = t; }
  }
  // Íris: raio em relação à meia altura da tela (meia diagonal ≈ fora da tela).
  const R = Math.hypot(camera.aspect, 1) / 2 + 0.02, rI = k < 0.25 ? R * (1 - smoother(0, 0.25, k)) : k > 0.7 ? R * smoother(0.7, 1, k) : 0;
  irisMesh.visible = rI < R; irisU.uR.value = rI; irisU.uAspect.value = camera.aspect; place(irisMesh, 0, 0, W, H);
  // Legenda e linha de carregamento no escuro.
  const a = smooth(0.2, 0.32, k) * (1 - smooth(0.62, 0.72, k)), load = smooth(0.28, 0.66, k);
  captionMesh.visible = barTrack.visible = bar.visible = a > 0.01;
  if (a > 0.01) {
    if (lastEntering !== entering) { captionMesh.material.map = caption(entering); captionMesh.material.needsUpdate = true; lastEntering = entering; }
    const m = Math.min(W, H), cwid = m * 0.62, chei = cwid / 4;
    place(captionMesh, W / 2 - cwid / 2, H / 2 - chei * 0.62, cwid, chei); captionMesh.material.opacity = a;
    const lw = m * 0.28, p = entering ? load : 1 - load;
    place(barTrack, W / 2 - lw / 2, H / 2 + m * 0.06, lw, 2); barTrack.material.opacity = 0.12 * a;
    place(bar, W / 2 - lw / 2, H / 2 + m * 0.06, Math.max(0.5, lw * p), 2); bar.material.opacity = a;
  }
}

export { cabin, updateCabin };
