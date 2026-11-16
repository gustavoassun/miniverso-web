import { clamp, fbm3, mix, smooth, vnoise } from '../core/math.js';
import { nearRail, railDist } from './rail.js';
import { ZONES } from './zones.js';
import { TERRAIN } from './palette.js';

// Terreno do planeta, desenhado com uma geografia própria (antes era ruído solto: ilhas isoladas, mares sem lógica e
// neve em qualquer pico):
// - um continente contínuo acompanha a ferrovia e liga todas as áreas por terra (nada fica ilhado);
// - em volta do Centro Histórico, a terra tem o contorno do estado do Maranhão, com São Luís na costa norte;
// - os mares ficam dos dois lados do continente, com costa recortada e praias;
// - as montanhas ficam nas serras entre as áreas (longe delas e da ferrovia), com encostas de mata e topo de pedra;
// - neve só no Natal (o "polo" da vila), nunca nos outros picos;
// - os Lençóis encostam no mar (como em Atins e Caburé), com as dunas descendo até a praia.
const PR = 1.6;
const DUNES = nearRail(5.5, 0.62);
const PLATEAU = 0.035;
const CENTRO = ZONES.find(z => z.name === 'Centro Histórico');
// Contorno simplificado do Maranhão (longitude, latitude em graus), no sentido horário a partir do litoral oeste.
const MA = [[-46.0, -1.0], [-44.8, -1.3], [-44.3, -2.3], [-43.5, -2.4], [-42.3, -2.8], [-41.8, -3.0], [-42.1, -4.0], [-42.9, -5.0], [-43.0, -6.3],
  [-44.2, -7.5], [-45.2, -8.2], [-46.0, -9.0], [-45.8, -10.2], [-46.6, -9.6], [-47.5, -8.6], [-47.4, -7.0], [-48.0, -6.0], [-48.6, -5.3], [-47.5, -4.6],
  [-47.4, -3.3], [-46.6, -2.0]];
// São Luís (-44.3, -2.5) fica no centro da área; cada grau vale K radianos no planeta.
const K = 0.15;
const MAP = MA.map(([lo, la]) => [(lo + 44.3) * K, -(la + 2.5) * K]);
// Distância (com sinal: positiva dentro) até o contorno do Maranhão, nas coordenadas locais em volta do Centro.
function maranhao(d) {
  if (!CENTRO?.lx || d.dot(CENTRO.dir) < 0.2) return -1;
  const x = d.dot(CENTRO.lx), y = d.dot(CENTRO.lz);
  let inside = false, best = 9;
  for (let i = 0, j = MAP.length - 1; i < MAP.length; j = i++) {
    const [xi, yi] = MAP[i], [xj, yj] = MAP[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
    const ex = xj - xi, ey = yj - yi, t = clamp(((x - xi) * ex + (y - yi) * ey) / (ex * ex + ey * ey), 0, 1);
    best = Math.min(best, Math.hypot(x - xi - ex * t, y - yi - ey * t));
  }
  return inside ? best : -best;
}
// Quanto um ponto é "terra" (0 a 1): faixa ao longo da ferrovia, um disco em volta de cada área e o Maranhão.
// Perto do Centro a faixa da ferrovia afina, para o contorno do Maranhão aparecer cercado de mar.
const SEA_LENCOIS = nearRail(5.5, 1.12);   // mar do lado de fora dos Lençóis
function landness(d) {
  const nearMA = smooth(1.5, 0.9, d.angleTo(CENTRO.dir));
  let l = smooth(mix(0.3, 0.16, nearMA), mix(0.12, 0.06, nearMA), railDist(d));
  for (const z of ZONES) l = Math.max(l, smooth(z.R * 1.12 + 0.04, z.R * 0.85, d.angleTo(z.dir)));
  l = Math.max(l, smooth(-0.02, 0.05, maranhao(d)));
  l = Math.min(l, smooth(0.1, 0.3, d.angleTo(SEA_LENCOIS)));
  return l;
}
// Distância "livre" das áreas e da ferrovia: onde dá para ter serras sem atrapalhar nada.
function freeness(d) {
  let f = smooth(0.12, 0.3, railDist(d));
  for (const z of ZONES) f = Math.min(f, smooth(z.R * 1.05, z.R * 1.45, d.angleTo(z.dir)));
  return f;
}
function terrain(d) {
  // Costa recortada: o limite entre terra e mar balança com um ruído suave.
  const coast = landness(d) + (fbm3(d.x * 2.4 + 5.2, d.y * 2.4 + 1.3, d.z * 2.4 - 2.7) - 0.5) * 0.4;
  const fine = (vnoise(d.x * 7 + 3, d.y * 7, d.z * 7 - 1) - 0.5) * 0.04;
  let h;
  if (coast < 0.5) h = -0.02 - smooth(0.5, 0.15, coast) * 0.07 + fine * 0.3;            // mar: raso perto da costa, fundo longe
  else {
    const low = 0.03 + (coast - 0.5) * 0.06 + fine;                                       // planícies e campos
    // Serras: cristas longas (ruído "dobrado") só onde não há área nem ferrovia por perto.
    const ridge = 1 - Math.abs(fbm3(d.x * 2.6 - 3.3, d.y * 2.6 + 7.7, d.z * 2.6 + 1.9) * 2 - 1);
    h = low + freeness(d) * (smooth(0.4, 0.9, ridge) * 0.2 + smooth(0.6, 1, ridge) * 0.05) * smooth(0.5, 0.68, coast);
  }
  // Os Lençóis descem até o mar de um lado (praia e dunas), como em Atins e Caburé.
  const dune = smooth(0.46, 0.24, d.angleTo(DUNES));
  h = mix(h, 0.025 + 0.05 * vnoise(d.x * 9, d.y * 9, d.z * 9), dune);
  // Faixa plana da ferrovia; onde ela cruza o mar, vira um istmo mais largo (com praia).
  const rd = railDist(d);
  h = mix(PLATEAU, h, smooth(0.035, h < 0.02 ? 0.15 : 0.08, rd));
  for (const z of ZONES) h = mix(PLATEAU, h, smooth(...(z.flat || [0.2, 0.4]), d.angleTo(z.dir)));
  // Água própria de cada área: o rio Anil no Centro, o mar na frente do porto.
  for (const z of ZONES) if (z.water) h = mix(h, -0.06, z.water(d.dot(z.lx) * PR, d.dot(z.lz) * PR) * smooth(0.75, 0.6, d.angleTo(z.dir)));
  return h;
}
// Umidade (0 seco a 1 úmido): define cerrado, campos e mata.
const moisture = d => fbm3(d.x * 1.6 - 7.1, d.y * 1.6 + 4.4, d.z * 1.6 + 2.2);
const SNOWY = ZONES.filter(z => z.snow).map(z => z.dir);
const shadeOf = (h, d) => {
  const T = TERRAIN;
  if (h >= 0.02 && SNOWY.some(sd => d.angleTo(sd) < 0.42)) return T.snow;              // neve só em volta da vila de Natal
  if (smooth(0.4, 0.26, d.angleTo(DUNES)) > 0.5 && h >= 0) return T.dunes;
  if (h < 0) return h < -0.05 ? T.deepWater : T.shallow;
  if (h < 0.022) return T.beach;
  const m = moisture(d);
  if (h < 0.075) return m < 0.42 ? T.savanna : m > 0.56 ? T.meadow : T.grass;
  if (h < 0.13) return m < 0.44 ? T.drywood : T.forest;
  return T.rock;                                                                          // topos de pedra, sem neve
};
const radiusAt = h => (h > 0 ? PR + h * 0.42 : PR - 0.03);
const RAIL_R = radiusAt(PLATEAU) + 0.004, TRAIN_SPEED = 0.12;

export { DUNES, PLATEAU, PR, RAIL_R, TRAIN_SPEED, moisture, radiusAt, shadeOf, terrain };
