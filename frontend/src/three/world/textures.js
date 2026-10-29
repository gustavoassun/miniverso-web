import * as THREE from 'three';
import { R, TAU } from '../core/math.js';

// Texturas pintadas em canvas (fachadas, vidro, bandeira, painel): detalhe sem modelos para baixar.
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
// Fachada de casarão: azulejos, cornijas brancas, janelas altas com venezianas e sacada.
const facadeMat = (base, tile, shutter) => new THREE.MeshStandardMaterial({ roughness: 0.8, map: canvasTex(64, 96, (x, w, h) => {
  x.fillStyle = base; x.fillRect(0, 0, w, h);
  if (tile) { x.fillStyle = tile; for (let r = 0; r < 24; r++) for (let k = 0; k < 16; k++) if ((r + k) % 2 === 0) x.fillRect(k * 4 + 1, r * 4 + 1, 2, 2); }
  x.fillStyle = '#f4efe6'; x.fillRect(0, 0, w, 5); x.fillRect(0, 46, w, 4); x.fillRect(0, h - 4, w, 4);
  for (const fy of [12, 58]) for (let i = 0; i < 3; i++) {
    const wx = 6 + i * 20; x.fillStyle = '#f4efe6'; x.fillRect(wx - 2, fy - 3, 16, 30);
    x.fillStyle = shutter; x.fillRect(wx, fy, 12, 26); x.fillStyle = 'rgba(255,255,255,.22)'; x.fillRect(wx + 5, fy, 2, 26);
  }
  x.fillStyle = '#26262e'; x.fillRect(3, 38, w - 6, 2);
}) });
const glassMat = () => {
  const map = canvasTex(32, 96, (x, w, h) => {
    x.fillStyle = '#2b4f86'; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 24; r++) for (let k = 0; k < 4; k++) { x.fillStyle = R() > 0.72 ? (R() > 0.5 ? '#ffd28a' : '#7fe9ff') : '#3d6cb0'; x.fillRect(k * 8 + 1, r * 4 + 1, 6, 2); }
  });
  return new THREE.MeshStandardMaterial({ map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: 0.45, roughness: 0.18, metalness: 0.45 });
};
// Bandeira do Maranhão (estilizada): listras vermelhas, brancas e pretas e o quadrado azul com a estrela branca.
const maranhaoTex = () => canvasTex(180, 108, (x, w, h) => {
  ['#d21f26', '#ffffff', '#151515', '#ffffff', '#d21f26', '#ffffff', '#151515', '#ffffff', '#d21f26'].forEach((c, i) => { x.fillStyle = c; x.fillRect(0, i * 12, w, 12); });
  x.fillStyle = '#1d3f95'; x.fillRect(0, 0, 66, 60);
  x.fillStyle = '#ffffff'; x.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 7 : 17; x.lineTo(33 + Math.cos(a) * r, 30 + Math.sin(a) * r); }
  x.fill();
});
// Bumba meu boi: couro de veludo preto bordado com miçangas (rosáceas, estrela e barrados de pontos),
// saia de chita colorida e o painel do palco com a cara do boi num sol de bandeirinhas.
const BOI_CORES = ['#e8452f', '#2f9bff', '#3ee07a', '#ffd23f', '#ff4fd8', '#ffffff', '#ff8a2a'];
const star5 = (x, cx, cy, r0, r1) => { x.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? r1 : r0; x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } x.fill(); };
const bordadoTex = () => canvasTex(128, 64, (x, w, h) => {
  const cs = BOI_CORES;
  x.fillStyle = '#120c1c'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < w; i += 3) { x.fillStyle = cs[(i / 3) % cs.length]; x.fillRect(i, 1, 2, 2); x.fillRect(i, h - 3, 2, 2); }
  x.fillStyle = '#ffd23f'; x.fillRect(0, 5, w, 1); x.fillRect(0, h - 6, w, 1);
  for (const [cx, cy, r] of [[w * 0.24, h / 2, 21], [w * 0.76, h / 2, 21]]) for (let ring = 0; ring < 6; ring++) {
    const rr = r * (1 - ring / 6), n = Math.max(6, Math.round(rr * 1.6));
    for (let k = 0; k < n; k++) { const a = k / n * TAU; x.fillStyle = cs[(ring * 2 + (k % 2)) % cs.length]; x.fillRect(cx + Math.cos(a) * rr - 1, cy + Math.sin(a) * rr - 1, 2, 2); }
  }
  x.fillStyle = '#ffd23f'; star5(x, w / 2, h / 2, 13, 5);
  x.fillStyle = '#ffffff'; star5(x, w / 2, h / 2, 5, 2);
  for (let i = 0; i < 160; i++) { x.fillStyle = cs[i % cs.length]; x.fillRect(R() * w, 8 + R() * (h - 16), 1, 1); }
});
const saiaTex = () => canvasTex(128, 32, (x, w, h) => {
  BOI_CORES.forEach((c, i) => { x.fillStyle = c; x.fillRect(i * w / 7, 0, w / 7 + 1, h); });
  x.fillStyle = 'rgba(255,255,255,.75)'; for (let r = 4; r < h; r += 7) for (let k = (r % 2) * 3; k < w; k += 6) x.fillRect(k, r, 2, 2);
  x.fillStyle = '#ffd23f'; x.fillRect(0, 0, w, 3); x.fillStyle = '#120c1c'; x.fillRect(0, h - 3, w, 3);
});
const boiPanelTex = () => canvasTex(256, 128, (x, w, h) => {
  const cx = w / 2, cy = h * 0.58;
  x.fillStyle = '#1b1440'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 28; i++) { const a0 = i / 28 * TAU, a1 = a0 + TAU / 56; x.fillStyle = BOI_CORES[i % BOI_CORES.length]; x.globalAlpha = 0.55; x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, w, a0, a1); x.fill(); }
  x.globalAlpha = 1;
  for (let k = 0; k < w; k += 12) { x.fillStyle = BOI_CORES[(k / 12) % BOI_CORES.length]; x.beginPath(); x.moveTo(k, 0); x.lineTo(k + 10, 0); x.lineTo(k + 5, 12); x.fill(); }
  // Cara do boi: chifres, orelhas, cabeça bordada, olhos coloridos, focinho branco e a estrela na testa.
  x.strokeStyle = '#f4efe6'; x.lineWidth = 7; x.lineCap = 'round';
  for (const s of [-1, 1]) { x.beginPath(); x.moveTo(cx + s * 18, cy - 30); x.quadraticCurveTo(cx + s * 48, cy - 44, cx + s * 44, cy - 66); x.stroke(); }
  x.fillStyle = '#ffffff'; for (const s of [-1, 1]) { x.beginPath(); x.arc(cx + s * 22, cy - 30, 9, 0, TAU); x.fill(); }
  x.fillStyle = '#120c1c'; for (const s of [-1, 1]) { x.beginPath(); x.ellipse(cx + s * 40, cy - 14, 14, 6, s * 0.4, 0, TAU); x.fill(); }
  x.beginPath(); x.ellipse(cx, cy, 30, 38, 0, 0, TAU); x.fill();
  for (let i = 0; i < 70; i++) { const a = R() * TAU, r = R() * 28; x.fillStyle = BOI_CORES[i % BOI_CORES.length]; x.fillRect(cx + Math.cos(a) * r * 0.9, cy - 6 + Math.sin(a) * r, 2, 2); }
  for (const s of [-1, 1]) { x.fillStyle = '#ffffff'; x.beginPath(); x.arc(cx + s * 15, cy - 8, 8, 0, TAU); x.fill(); x.fillStyle = s < 0 ? '#e8452f' : '#2f9bff'; x.beginPath(); x.arc(cx + s * 15, cy - 8, 4.5, 0, TAU); x.fill(); }
  x.fillStyle = '#f4efe6'; x.beginPath(); x.ellipse(cx, cy + 24, 20, 13, 0, 0, TAU); x.fill();
  x.fillStyle = '#e8452f'; x.beginPath(); x.ellipse(cx, cy + 30, 13, 4, 0, 0, TAU); x.fill();
  x.fillStyle = '#ffd23f'; star5(x, cx, cy - 26, 9, 4);
});
const holoMat =(color, opacity = 0.7) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
// Piso de pedra (paralelepípedos) e de pedra portuguesa para as ruas e praças antigas.
const stoneTex = (base, light, dark, rx = 1, ry = 1) => {
  const t = canvasTex(128, 128, (x, w, h) => {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    for (let r = 0; r < 16; r++) for (let k = 0; k < 16; k++) { x.fillStyle = (r * 7 + k * 3) % 5 ? light : dark; x.fillRect(k * 8 + (r % 2 ? 4 : 0) + 1, r * 8 + 1, 6, 6); }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); return t;
};
const floors = {
  lawn: (x, w, h) => { x.fillStyle = '#5fd39a'; x.fillRect(0, 0, w, h); for (let i = 0; i < w; i += 16) { x.fillStyle = i % 32 ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)'; x.fillRect(i, 0, 16, h); }
    x.strokeStyle = '#efe9dd'; x.lineWidth = 9; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h * 0.62); x.lineTo(w, h * 0.62); x.stroke(); x.beginPath(); x.arc(w / 2, h * 0.62, 34, 0, TAU); x.stroke(); },
  meadow: (x, w, h) => { x.fillStyle = '#4fc48a'; x.fillRect(0, 0, w, h); const cs = ['#ff7bb0', '#ffd23f', '#ffffff', '#b07cff']; for (let i = 0; i < 260; i++) { x.fillStyle = cs[i % 4]; x.fillRect(R() * w, R() * h, 2.5, 2.5); } },
  neon: (x, w, h) => { x.fillStyle = '#1a1033'; x.fillRect(0, 0, w, h); x.lineWidth = 2;
    for (let i = 0; i <= w; i += 16) { x.strokeStyle = i % 64 ? 'rgba(0,183,227,.55)' : '#ff4fd8'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); } },
  pavers: (x, w, h) => { x.fillStyle = '#dfe3e8'; x.fillRect(0, 0, w, h); x.strokeStyle = '#b9c0c9'; x.lineWidth = 1.5;
    for (let i = 0; i <= w; i += 12) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.moveTo(0, i); x.lineTo(w, i); x.stroke(); }
    x.fillStyle = '#5fbf8a'; for (const [a, b] of [[36, 180], [72, 180], [180, 60], [204, 180], [120, 216]]) x.fillRect(a, b, 24, 24);
    x.fillStyle = '#c9b9a3'; x.fillRect(0, 150, w, 10); },
  gravel: (x, w, h) => { x.fillStyle = '#a49c90'; x.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { x.fillStyle = R() > 0.5 ? '#8c847a' : '#bdb5aa'; x.fillRect(R() * w, R() * h, 2, 2); } }
};
const plainFlag = (c1, c2) => canvasTex(60, 36, (x, w, h) => { x.fillStyle = c1; x.fillRect(0, 0, w, h); x.fillStyle = c2; x.fillRect(0, 13, w, 10); });

export { boiPanelTex, bordadoTex, canvasTex, facadeMat, floors, glassMat, holoMat, maranhaoTex, plainFlag, saiaTex, stoneTex };
