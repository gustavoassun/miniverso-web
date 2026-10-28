// Paleta do planeta Miniverso: troque um código de cor aqui e o planeta muda junto.
// As cores da marca seguem o manual (índigo, azul, quase preto e ciano).

// Marca.
const BRAND = { indigo: '#1e1645', blue: '#1e4488', night: '#0c0407', cyan: '#00b7e3' };

// Relevo, da água funda ao topo dos morros (o planeta escolhe a cor pela altura).
const TERRAIN = {
  deepWater: '#163a5c', // fundo do mar visto pela água
  beach: '#f0dfaa',     // faixa de areia na beira
  grass: '#5fd39a',     // campos
  forest: '#36b07f',    // morros verdes
  rock: '#8a9db3',      // pedra
  snow: '#eef5ff',      // topos
  dunes: '#f4ecd6'      // areia branca dos Lençóis
};

// Mar (camada de água por cima do relevo).
const OCEAN = { color: '#2a86c4', glow: '#0a3352' };

// Construções e objetos das áreas.
const C = { white: '#eef4fb', ice: '#cfe3f2', coral: '#ff8a6b', amber: '#ffc56b', teal: '#3ee0b5', violet: '#8f84ff', terracotta: '#c8643f', gray: '#7f8fa3', dark: '#2a3446', trunk: '#7a5b45', pastel: '#f2c9b8', mint: '#9fe0cf', ore: '#8a3f2c', tile: '#3f7fc4', steel: '#9aa8b8' };

// Veículos.
const VEHICLES = {
  glass: '#1d2b3d', tire: '#1a1d24', steel: '#3a404a',
  cars: [C.coral, C.white, C.amber, C.tile, C.teal, '#e8452f', C.ice, '#ffd23f', '#2a3446'],
  buses: ['#ffd23f', '#00b7e3', '#e8452f', '#3aa58c'],
  locoLoaded: C.amber, locoEmpty: C.teal,      // trem carregado (amarelo) e trem vazio (verde)
  wagonLoaded: '#6d7682', wagonEmpty: '#7a828e'
};

export { BRAND, C, OCEAN, TERRAIN, VEHICLES };
