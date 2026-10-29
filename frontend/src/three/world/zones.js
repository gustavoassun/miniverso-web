import * as THREE from 'three';
import { UP, smooth } from '../core/math.js';
import { nearRail } from './rail.js';

// Áreas do planeta. Cada uma tem um botão com uma pequena interação quando vista de perto.
const ZONES = [
  { name: 'Centro Histórico', text: 'São Luís em miniatura: na cidade alta, a Rua Portugal e a Rua da Estrela com casarões de azulejo, a Catedral da Sé, a Praça Benedito Leite com o chafariz, o Palácio dos Leões e a ladeira coberta de bandeirolas; embaixo, a Praia Grande com a feira, a Praça Maria Aragão com o palco do boi, o calçadão da Beira-Mar, canoas e veleiros no Rio Anil e a Ponte do São Francisco.', act: 'Chamar o boi', done: 'O boi subiu no palco da Maria Aragão e a plateia dançou junto!', dir: nearRail(3.1, 0.62),
    R: 0.74, flat: [0.5, 0.6], view: 2, water: (x, z) => smooth(0.25, 0.27, x) * (1 - smooth(0.44, 0.46, x)) },
  { name: 'Educação', text: 'Campus com escola, observatório, quadra, horta, coleta seletiva, painéis solares e estudantes pelo caminho. Aulas em realidade virtual e aprendizado com gamificação.', act: 'Abrir o observatório', done: 'Cúpula aberta: hora de olhar as estrelas.', act2: 'Tocar o recreio', kind2: 'fx', done2: 'Recreio! A turma foi para a quadra jogar bola.', dir: nearRail(2.2, -0.68) },
  { name: 'Ecologia', text: 'Mangue com guarás, energia do vento e do sol e uma árvore de luz. Educação ambiental e visitas a lugares preservados sem sair da sala.', act: 'Soltar os guarás', done: 'Os guarás levantaram voo sobre o mangue.', dir: nearRail(5.05, -0.36) },
  { name: 'Jogos', text: 'Parque gamer com arco neon, fliperamas, karts, roda-gigante, controle gigante e blocos voando (clique neles). Três minigames: escolha um e jogue!', act: 'Caçar as gemas', act2: 'Acerte os blocos', kind2: 'whack', act3: 'Corrida de kart', done: '', dir: nearRail(4.5, -0.6) },
  { name: 'Negócios', text: 'Distrito empresarial: torres com elevador panorâmico, sede com jardim no teto, fonte, drone de entregas e uma reunião ao ar livre. Apresentações, treinamentos e gêmeos digitais em VR.', act: 'Apresentar projeto em VR', done: 'O projeto surgiu em holograma no meio da mesa e a equipe aprovou!', act2: 'Decolar o helicóptero', kind2: 'fx', done2: 'O helicóptero decolou para uma volta pelo distrito.', dir: nearRail(1.45, -0.24) },
  { name: 'Ferrovia', text: 'Terminal ferroviário: pátio de manobras com quatro linhas e desvios, o virador de vagões no galpão descarregando o minério, a correia coberta até o pátio de estocagem, onde a empilhadeira forma as pilhas, oficina de locomotivas, posto de abastecimento e torre de controle. Na linha principal, os trens seguem viagem.', act: 'Descarregar vagão', done: 'Virador girando: o minério vai para a esteira.', act2: 'Ir na cabine do trem', kind2: 'cab', dir: nearRail(0.85, -0.2), rail: 0.85,
    R: 0.66, flat: [0.44, 0.52], view: 1.75, pitch: 0.62 },
  { name: 'Porto', text: 'Terminal de minério e porto multiuso: o minério chega da Ferrovia, vai para as pilhas e segue pela correia coberta até o píer, onde o carregador enche os porões do navio. Contêineres, tanques, rebocadores, boias do canal, o farol no quebra-mar e navios esperando a vez.', act: 'Zarpar o navio', done: 'O navio carregado saiu com os rebocadores; o próximo da fila já vem atracar.', act2: 'Carregar o navio', kind2: 'fx', done2: 'O carregador está enchendo os porões: veja o navio afundar na linha-d’água.', dir: nearRail(0.25, 0.24),
    R: 0.62, flat: [0.36, 0.46], clear: 0.75, view: 1.7, pitch: 0.5, focus: [0.05, 0.015, 0.18], water: (x, z) => smooth(0.21, 0.27, z) },
  { name: 'Lençóis', text: 'Dunas brancas com lagoas de água azul e verde, como nos Lençóis Maranhenses. Passeios virtuais por paisagens do Maranhão.', act: 'Passeio de 4x4', done: 'O 4x4 saiu pelas dunas.', dir: nearRail(5.5, 0.62) }
];
const zoneQuat = d => new THREE.Quaternion().setFromUnitVectors(UP, d);
for (const z of ZONES) { const q = zoneQuat(z.dir); z.lx = new THREE.Vector3(1, 0, 0).applyQuaternion(q); z.lz = new THREE.Vector3(0, 0, 1).applyQuaternion(q); }

export { ZONES };
