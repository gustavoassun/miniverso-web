import { ZONES } from './zones.js';

// Estado compartilhado do mundo em tempo de execução: relógio da animação, objetos animados,
// brinquedos clicáveis, trens e o início das interações de cada área.
const rt = { clock: 0, gameTick: () => {} };
const zoneFx = ZONES.map(() => -1);
const fxT = i => (zoneFx[i] < 0 ? -1 : rt.clock - zoneFx[i]);
const zoneFx2 = ZONES.map(() => -1), fxT2 = i => (zoneFx2[i] < 0 ? -1 : rt.clock - zoneFx2[i]);
const animated = [];
// Coisas que respondem ao clique em qualquer lugar do planeta (balões, blocos voadores, controle gigante).
const toys = [];
const toyKick = (o, t) => { const k = o.userData.kick ?? -9, age = t - k; return age >= 0 && age < 1.6 ? Math.sin(Math.PI * age / 1.6) : 0; };

const trains = [];

export { animated, fxT, fxT2, rt, toyKick, toys, trains, zoneFx, zoneFx2 };
