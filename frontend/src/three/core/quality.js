// Aparelho mais simples (tela pequena ou poucos núcleos): resolução um pouco mais baixa e 30 quadros por segundo fora
// dos jogos. A suavização de bordas fica ligada em todos: nas placas de vídeo de celular ela custa pouco e tira o
// serrilhado que deixava o 3D com cara de baixa qualidade. Se o aparelho não aguentar, a qualidade adaptativa do motor
// baixa a resolução sozinha (até 60%).
const small = innerWidth < 700 || (navigator.hardwareConcurrency || 8) <= 4;
const touch = matchMedia('(pointer: coarse)').matches;
const dpr = Math.min(devicePixelRatio || 1, small ? 1.6 : 1.75);
const antialias = true;

export { antialias, dpr, small, touch };
