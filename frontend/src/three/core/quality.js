// Aparelho mais simples (tela pequena ou poucos núcleos): resolução mais baixa, 30 quadros por segundo fora dos jogos
// e sem antisserrilhado em telas muito densas (onde ele quase não aparece e esquenta o celular).
const small = innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
const touch = matchMedia('(pointer: coarse)').matches;
const dpr = Math.min(devicePixelRatio || 1, small ? 1.25 : 1.75);
const antialias = !(small && (devicePixelRatio || 1) >= 2);

export { antialias, dpr, small, touch };
