import { fbm3, mix, smooth, vnoise } from '../core/math.js';
import { nearRail, railDist } from './rail.js';
import { ZONES } from './zones.js';
import { TERRAIN } from './palette.js';

// Terreno do planeta: continentes e mares grandes e organizados (ruído de baixa frequência, em vez de muitas poças
// espalhadas), um pouco de relevo fino por cima, platôs nas áreas, faixa plana para a ferrovia e dunas com lagoas.
// Biomas (shadeOf): a umidade (outro ruído suave) separa cerrado seco, campos e mata; acima vêm pedra e topos.
const PR = 1.6;
const DUNES = nearRail(5.5, 0.62);
const PLATEAU = 0.035;
function terrain(d) {
  // Mais terra que mar (antes era quase metade água).
  let h = (fbm3(d.x * 1.15 + 5.2, d.y * 1.15 + 1.3, d.z * 1.15 - 2.7) - 0.43) * 1.45 + (vnoise(d.x * 7 + 3, d.y * 7, d.z * 7 - 1) - 0.5) * 0.045;
  const dune = smooth(0.46, 0.24, d.angleTo(DUNES));
  h = mix(h, 0.025 + 0.05 * vnoise(d.x * 9, d.y * 9, d.z * 9), dune);
  // Faixa plana da ferrovia; onde ela cruza o mar, vira um istmo mais largo (com praia), para o trem não parecer
  // andar por cima da água.
  const rd = railDist(d);
  h = mix(PLATEAU, h, smooth(0.035, h < 0.02 ? 0.15 : 0.08, rd));
  for (const z of ZONES) h = mix(PLATEAU, h, smooth(...(z.flat || [0.2, 0.4]), d.angleTo(z.dir)));
  // Água própria de cada área: o rio Anil no Centro, o mar na frente do porto.
  for (const z of ZONES) if (z.water) h = mix(h, -0.06, z.water(d.dot(z.lx) * PR, d.dot(z.lz) * PR) * smooth(0.75, 0.6, d.angleTo(z.dir)));
  return h;
}
// Umidade (0 seco a 1 úmido): define cerrado, campos e mata.
const moisture = d => fbm3(d.x * 1.6 - 7.1, d.y * 1.6 + 4.4, d.z * 1.6 + 2.2);
const shadeOf = (h, d) => {
  const T = TERRAIN;
  if (smooth(0.4, 0.26, d.angleTo(DUNES)) > 0.5 && h >= 0) return T.dunes;
  if (h < 0) return h < -0.05 ? T.deepWater : T.shallow;
  if (h < 0.022) return T.beach;
  const m = moisture(d);
  if (h < 0.075) return m < 0.42 ? T.savanna : m > 0.56 ? T.meadow : T.grass;
  if (h < 0.13) return m < 0.44 ? T.drywood : T.forest;
  return h < 0.18 ? T.rock : T.snow;
};
const radiusAt = h => (h > 0 ? PR + h * 0.42 : PR - 0.03);
const RAIL_R = radiusAt(PLATEAU) + 0.004, TRAIN_SPEED = 0.12;

export { DUNES, PLATEAU, PR, RAIL_R, TRAIN_SPEED, moisture, radiusAt, shadeOf, terrain };
