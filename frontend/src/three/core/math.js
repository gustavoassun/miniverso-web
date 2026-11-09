import * as THREE from 'three';

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const smoother = (a, b, v) => { const t = clamp((v - a) / (b - a)); return t * t * t * (t * (t * 6 - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - (1 - t) ** 3;
const TAU = Math.PI * 2, R = Math.random;
const hash3 = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function vnoise(x, y, z) {
  const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z);
  let fx = x - X, fy = y - Y, fz = z - Z; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy); fz = fz * fz * (3 - 2 * fz);
  const L = mix;
  return L(L(L(hash3(X, Y, Z), hash3(X + 1, Y, Z), fx), L(hash3(X, Y + 1, Z), hash3(X + 1, Y + 1, Z), fx), fy),
           L(L(hash3(X, Y, Z + 1), hash3(X + 1, Y, Z + 1), fx), L(hash3(X, Y + 1, Z + 1), hash3(X + 1, Y + 1, Z + 1), fx), fy), fz);
}
const fbm3 = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
const UP = new THREE.Vector3(0, 1, 0);

export { R, TAU, UP, clamp, easeOut, fbm3, mix, smooth, smoother, vnoise };
