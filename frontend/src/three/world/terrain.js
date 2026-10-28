import { fbm3, mix, smooth, vnoise } from '../core/math.js';
import { nearRail, railDist } from './rail.js';
import { ZONES } from './zones.js';
import { TERRAIN } from './palette.js';

// Terreno do planeta: ruído suave, com platôs nas áreas, faixa plana para a ferrovia e dunas com lagoas.
const PR = 1.6;
const DUNES = nearRail(5.5, 0.62);
const PLATEAU = 0.035;
function terrain(d) {
  // Mais terra que mar (antes era quase metade água).
  let h = (fbm3(d.x * 1.7 + 5.2, d.y * 1.7 + 1.3, d.z * 1.7 - 2.7) - 0.44) * 1.3;
  const dune = smooth(0.46, 0.24, d.angleTo(DUNES));
  h = mix(h, 0.025 + 0.05 * vnoise(d.x * 9, d.y * 9, d.z * 9), dune);
  h = mix(PLATEAU, h, smooth(0.035, 0.08, railDist(d)));
  for (const z of ZONES) h = mix(PLATEAU, h, smooth(...(z.flat || [0.2, 0.4]), d.angleTo(z.dir)));
  // Água própria de cada área: o rio Anil no Centro, o mar na frente do porto.
  for (const z of ZONES) if (z.water) h = mix(h, -0.06, z.water(d.dot(z.lx) * PR, d.dot(z.lz) * PR) * smooth(0.75, 0.6, d.angleTo(z.dir)));
  return h;
}
const shadeOf = (h, d) => {
  const T = TERRAIN;
  if (smooth(0.4, 0.26, d.angleTo(DUNES)) > 0.5 && h >= 0) return T.dunes;
  return h < 0 ? T.deepWater : h < 0.025 ? T.beach : h < 0.075 ? T.grass : h < 0.13 ? T.forest : h < 0.18 ? T.rock : T.snow;
};
const radiusAt = h => (h > 0 ? PR + h * 0.42 : PR - 0.03);
const RAIL_R = radiusAt(PLATEAU) + 0.004, TRAIN_SPEED = 0.12;

export { DUNES, PLATEAU, PR, RAIL_R, TRAIN_SPEED, radiusAt, shadeOf, terrain };
