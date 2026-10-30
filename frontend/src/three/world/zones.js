import * as THREE from 'three';
import { UP, smooth } from '../core/math.js';
import { nearRail } from './rail.js';

// Áreas do planeta. Cada uma tem um botão com uma pequena interação quando vista de perto.
// pois: pontos de interesse da área. at = centro da vista (coordenadas da área), yaw/pitch = de onde a câmera olha
// (yaw 0 olha de +z para -z), d = distância da câmera. music: camada da trilha que entra com a área aberta (music.js).
const ZONES = [
  { name: 'Centro Histórico', text: 'São Luís em miniatura: na cidade alta, a Rua Portugal e a Rua da Estrela com casarões de azulejo, a Catedral da Sé, a Praça Benedito Leite com o chafariz, o Palácio dos Leões e a ladeira coberta de bandeirolas; embaixo, a Praia Grande com a feira, a Praça Maria Aragão com o palco do boi, o calçadão da Beira-Mar, canoas e veleiros no Rio Anil e a Ponte do São Francisco.', act: 'Chamar o boi', done: 'O boi subiu no palco da Maria Aragão e a plateia dançou junto!', dir: nearRail(3.1, 0.62),
    R: 0.74, flat: [0.5, 0.6], view: 2, music: 'boi', water: (x, z) => smooth(0.25, 0.27, x) * (1 - smooth(0.44, 0.46, x)),
    pois: [
      { name: 'Palco do boi', text: 'Na Praça Maria Aragão o Bumba meu boi sobe ao palco nas noites de São João, com matracas, pandeirões e a plateia dançando junto.', at: [0.085, 0.03, 0.12], yaw: 0, pitch: 0.36, d: 0.46 },
      { name: 'Rua Portugal e a Sé', text: 'Casarões coloniais com fachadas de azulejo, lampiões e bandeirolas, subindo até a Catedral da Sé.', at: [-0.27, 0.05, -0.32], yaw: 0.2, pitch: 0.44, d: 0.52 },
      { name: 'Praça Benedito Leite', text: 'Atrás da Sé, a praça arborizada com o chafariz e a estátua no centro: bancos, palmeiras e ponto de encontro da cidade alta.', at: [-0.255, 0.045, -0.535], yaw: 0.4, pitch: 1.2, d: 0.5 },
      { name: 'Palácio dos Leões', text: 'Sede do governo do Maranhão, com os leões na entrada, de frente para a praça, e os fundos voltados para o mar.', at: [-0.19, 0.05, -0.28], yaw: -1.0, pitch: 0.75, d: 0.46 },
      { name: 'Rua da Estrela', text: 'Mais casarões azulejados em fila, com lampiões nas calçadas e bandeirolas de São João cruzando a rua.', at: [-0.55, 0.06, -0.1], yaw: 1.3, pitch: 0.58, d: 0.42 },
      { name: 'Feira da Praia Grande', text: 'Barracas coloridas e o casarão do mercado: frutas, artesanato e comidas típicas no coração da Praia Grande.', at: [0.09, 0.02, 0.49], yaw: 2.8, pitch: 0.75, d: 0.4 },
      { name: 'Cais e Rio Anil', text: 'Canoas amarradas no cais, veleiros passeando pelo rio e a Ponte do São Francisco ligando o Centro ao bairro novo.', at: [0.33, 0.01, -0.38], yaw: 0.25, pitch: 0.62, d: 0.55 }
    ] },
  { name: 'Educação', text: 'Campus com escola, observatório, quadra, horta, coleta seletiva, painéis solares e estudantes pelo caminho. Aulas em realidade virtual e aprendizado com gamificação.', act: 'Abrir o observatório', done: 'Cúpula aberta: hora de olhar as estrelas.', act2: 'Tocar o recreio', kind2: 'fx', done2: 'Recreio! A turma foi para a quadra jogar bola.', dir: nearRail(2.2, -0.68) },
  { name: 'Ecologia', text: 'Mangue com guarás, energia do vento e do sol e uma árvore de luz. Educação ambiental e visitas a lugares preservados sem sair da sala.', act: 'Soltar os guarás', done: 'Os guarás levantaram voo sobre o mangue.', dir: nearRail(5.05, -0.36) },
  { name: 'Jogos', text: 'Parque Arcade: um autódromo de kart contorna o parque, com largada no semáforo, arquibancada, box, telão e faixas de turbo. Dentro dele, a praça com carrossel, fonte de pixels, torre de queda, quiosques, a roda-gigante, o salão de fliperamas (clique nas máquinas para jogar), blocos voando (clique neles) e a Arena dos Blocos. Quatro minigames: escolha um e jogue!', act: 'Caçar as gemas', act2: 'Acerte os blocos', kind2: 'whack', act3: 'Corrida de kart', act4: 'Fliperama', done: '', dir: nearRail(4.2, -0.6),
    R: 0.58, flat: [0.42, 0.5], view: 1.6, pitch: 0.55,
    pois: [
      { name: 'Largada e arquibancada', text: 'Reta principal com o pórtico do semáforo de cinco luzes, a faixa quadriculada, a torcida na arquibancada e o telão com a classificação ao vivo.', at: [0.05, 0.04, -0.44], yaw: 0, pitch: 0.42, d: 0.42 },
      { name: 'Curva do S', text: 'A chicane do lado direito: zebras vermelhas e brancas, pneus pintados e cones. Aqui é preciso tirar o pé.', at: [0.4, 0.02, 0.02], yaw: -1.2, pitch: 0.5, d: 0.4 },
      { name: 'Salão Arcade', text: 'O salão de fliperamas com letreiro em pixel e neon nas quinas. Clique nas máquinas da calçada para jogar o Quebra-pixel.', at: [-0.2, 0.04, 0.19], yaw: 0.35, pitch: 0.32, d: 0.32 },
      { name: 'Roda-gigante', text: 'Aros duplos cheios de luzes e cabines coloridas que giram devagar sobre o parque.', at: [-0.24, 0.12, -0.15], yaw: 0.5, pitch: 0.3, d: 0.42 },
      { name: 'Arena dos Blocos', text: 'Palco redondo com piso de LED e nove buracos: é aqui que os blocos saltam no minigame.', at: [0.19, 0.02, 0.075], yaw: -0.3, pitch: 0.7, d: 0.36 }
    ] },
  { name: 'Negócios', text: 'Distrito empresarial: torres com elevador panorâmico, sede com jardim no teto, fonte, drone de entregas e uma reunião ao ar livre. Apresentações, treinamentos e gêmeos digitais em VR.', act: 'Apresentar projeto em VR', done: 'O projeto surgiu em holograma no meio da mesa e a equipe aprovou!', act2: 'Decolar o helicóptero', kind2: 'fx', done2: 'O helicóptero decolou para uma volta pelo distrito.', dir: nearRail(1.45, -0.24) },
  { name: 'Ferrovia', text: 'Terminal ferroviário: pátio de manobras com quatro linhas e desvios, o virador de vagões no galpão descarregando o minério, a correia coberta até o pátio de estocagem, onde a empilhadeira forma as pilhas, oficina de locomotivas, posto de abastecimento e torre de controle. Na linha principal, os trens seguem viagem.', act: 'Descarregar vagão', done: 'Virador girando: o minério vai para a esteira.', act2: 'Ir na cabine do trem', kind2: 'cab', dir: nearRail(0.85, -0.2), rail: 0.85,
    R: 0.66, flat: [0.44, 0.52], view: 1.75, pitch: 0.62, music: 'trem' },
  { name: 'Porto', text: 'Terminal de minério e porto multiuso: o minério chega da Ferrovia, vai para as pilhas e segue pela correia coberta até o píer, onde o carregador enche os porões do navio. Contêineres, tanques, rebocadores, boias do canal, o farol no quebra-mar e navios esperando a vez.', act: 'Zarpar o navio', done: 'O navio carregado saiu com os rebocadores; o próximo da fila já vem atracar.', act2: 'Carregar o navio', kind2: 'fx', done2: 'O carregador está enchendo os porões: veja o navio afundar na linha-d’água.', dir: nearRail(0.25, 0.24),
    R: 0.62, flat: [0.36, 0.46], clear: 0.75, music: 'porto', view: 1.7, pitch: 0.5, focus: [0.05, 0.015, 0.18], water: (x, z) => smooth(0.21, 0.27, z) },
  { name: 'Lençóis', text: 'Dunas brancas com lagoas de água azul e verde, como nos Lençóis Maranhenses. Passeios virtuais por paisagens do Maranhão.', act: 'Passeio de 4x4', done: 'O 4x4 saiu pelas dunas.', dir: nearRail(5.5, 0.62) }
];
const zoneQuat = d => new THREE.Quaternion().setFromUnitVectors(UP, d);
for (const z of ZONES) { const q = zoneQuat(z.dir); z.lx = new THREE.Vector3(1, 0, 0).applyQuaternion(q); z.lz = new THREE.Vector3(0, 0, 1).applyQuaternion(q); }

export { ZONES };
