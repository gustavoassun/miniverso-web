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
      { name: 'Rua Portugal e a Sé', text: 'Casarões coloniais com fachadas de azulejo, lampiões e bandeirolas, subindo até a Catedral da Sé.', at: [-0.27, 0.05, -0.3], yaw: 0.1, pitch: 0.56, d: 0.56 },
      { name: 'Praça Benedito Leite', text: 'Atrás da Sé, a praça arborizada com o chafariz e a estátua no centro: bancos, palmeiras e ponto de encontro da cidade alta.', at: [-0.255, 0.04, -0.53], yaw: 0.25, pitch: 0.98, d: 0.42 },
      { name: 'Palácio dos Leões', text: 'Sede do governo do Maranhão, com os leões na entrada, de frente para a praça, e os fundos voltados para o mar.', at: [-0.19, 0.05, -0.28], yaw: -1.0, pitch: 0.75, d: 0.46 },
      { name: 'Rua da Estrela', text: 'Mais casarões azulejados em fila, com lampiões nas calçadas e bandeirolas de São João cruzando a rua.', at: [-0.52, 0.05, -0.1], yaw: 1.3, pitch: 0.72, d: 0.5 },
      { name: 'Feira da Praia Grande', text: 'Barracas coloridas e o casarão do mercado: frutas, artesanato e comidas típicas no coração da Praia Grande.', at: [0.09, 0.02, 0.49], yaw: 2.8, pitch: 0.75, d: 0.4 },
      { name: 'Cais e Rio Anil', text: 'Canoas amarradas no cais, veleiros passeando pelo rio e a Ponte do São Francisco ligando o Centro ao bairro novo.', at: [0.34, 0.01, -0.36], yaw: -0.2, pitch: 0.85, d: 0.6 }
    ] },
  { name: 'Educação', text: 'Campus Miniverso: a Escola Miniverso de dois andares com pátio coberto, bandeiras e amarelinha; a UNDB (Centro Universitário Dom Bosco, de São Luís), com o pórtico magenta da marca, gramado e o palco da formatura; o Laboratório de VR imersivo, onde a turma de óculos estuda com hologramas de planeta, DNA e átomo (a especialidade da Miniverso); o Planetário com telescópios no gramado; a quadra com placar, pula-corda e pipas; a Ciência ao ar livre com horta, estufa, estação do tempo, painéis solares e o lago dos patos; e a Rua da escola, com faixa de pedestre, guarda de trânsito, ciclovia, bicicletário, ônibus escolar e o carrinho de pipoca. Aprender vivendo a experiência.',
    act: 'Noite de estrelas', done: 'A cúpula do planetário abriu, o telescópio subiu e estrelas cadentes cruzaram o céu do campus!', act2: 'Tocar o recreio', kind2: 'fx', done2: 'Recreio! A turma correu para o pátio, o jogo esquentou na quadra e as pipas subiram.',
    act3: 'Aula em VR', done3: 'A turma colocou os óculos: planeta, DNA e átomo cresceram em holograma no laboratório!', act4: 'Formatura', done4: 'Formatura na UNDB! Os formandos jogaram os capelos para o alto e o confete tomou conta do palco.',
    // Cenas de cinema de cada interação: a câmera desce até a ação (cam → look), fica dur segundos e volta para after.
    go: { cam: [0.385, 0.03, -0.15], look: [0.28, 0.12, -0.29], dur: 9, after: { at: [0.33, 0.045, -0.19], yaw: 0.6, pitch: 0.45, d: 0.46 } },
    go2: { cam: [-0.14, 0.05, 0.0], look: [0.1, -0.005, 0.03], dur: 9.5, after: { at: [0.18, 0.02, 0.08], yaw: 0.3, pitch: 0.62, d: 0.44 } },
    go3: { cam: [-0.22, 0.032, 0.2], look: [-0.25, 0.022, 0.02], dur: 10, after: { at: [-0.25, 0.035, 0.03], yaw: -0.25, pitch: 0.45, d: 0.38 } },
    go4: { cam: [-0.372, 0.014, 0.07], look: [-0.36, -0.018, -0.115], dur: 9, after: { at: [-0.36, 0.025, -0.1], yaw: -0.4, pitch: 0.58, d: 0.36 } },
    dir: nearRail(2.2, -0.82), R: 0.56, flat: [0.36, 0.44], view: 1.7, pitch: 0.62, music: 'escola',
    pois: [
      { name: 'Escola Miniverso', text: 'O prédio de dois andares com a entrada vermelha, o pátio coberto com bancos, as bandeiras e a amarelinha pintada no chão.', at: [0, 0.04, -0.25], yaw: 0, pitch: 0.5, d: 0.56 },
      { name: 'Recreio e quadra', text: 'Quadra com placar e traves, pula-corda no pátio e pipas no céu. Use Tocar o recreio para a turma sair correndo.', at: [0.18, 0.02, 0.08], yaw: 0.3, pitch: 0.62, d: 0.44 },
      { name: 'Laboratório de VR', text: 'Pavilhão de vidro onde a turma de óculos estuda com hologramas de planeta, DNA e átomo. Use Aula em VR para ver tudo crescer.', at: [-0.25, 0.035, 0.03], yaw: -0.25, pitch: 0.45, d: 0.38 },
      { name: 'UNDB e formatura', text: 'A UNDB, Centro Universitário Dom Bosco de São Luís: o pórtico magenta com a marca, as portas de vidro, os mastros e o gramado com estudantes. Use Formatura para os capelos voarem no palco.', at: [-0.32, 0.035, -0.2], yaw: -0.6, pitch: 0.45, d: 0.46 },
      { name: 'Planetário', text: 'A cúpula se abre em duas metades e o telescópio sobe; no gramado, telescópios apontados para o céu. Use Noite de estrelas.', at: [0.33, 0.045, -0.19], yaw: 0.6, pitch: 0.45, d: 0.46 },
      { name: 'Ciência ao ar livre', text: 'Horta, estufa, estação do tempo com anemômetro, painéis solares, o lago dos patos e a trilha com plaquinhas.', at: [-0.33, 0.02, 0.17], yaw: -0.65, pitch: 0.62, d: 0.42 },
      { name: 'Rua da escola', text: 'Faixa de pedestre com o guarda de trânsito, ciclovia com a turma de bicicleta, bicicletário, o ônibus escolar no ponto e o carrinho de pipoca.', at: [-0.08, 0.01, 0.36], yaw: 0.15, pitch: 0.9, d: 0.42 }
    ] },
  { name: 'Ecologia', text: 'Reserva do mangue, no litoral maranhense: no alto, uma cachoeira desce do morro de pedras no meio do bosque de ipês e buritis; o rio corre até o mar e, na foz, o mangue cresce na lama do estuário, com os guarás. No meio, um campo com borboletas e a lagoa das vitórias-régias; do outro lado, a praia dos ninhos de tartaruga, o viveiro de mudas, o centro de visitantes e as turbinas de vento. Uma passarela de madeira liga seis estações. Faça a Expedição em VR (uma visita guiada em primeira pessoa, como a Miniverso faz em sala de aula), limpe o lixo do mangue, solte as tartarugas e os guarás. Clique no viveiro para plantar mudas.',
    act: 'Expedição em VR', kind: 'ecotour', done: '', act2: 'Limpe o mangue', kind2: 'clean', act3: 'Soltar as tartarugas', done3: 'Os filhotes saíram dos ninhos e correram para o mar!', act4: 'Soltar os guarás', done4: 'O bando de guarás levantou voo sobre o mangue!',
    go3: { cam: [0.26, 0.005, -0.255], look: [0.19, -0.042, -0.345], dur: 10, after: { at: [0.2, 0.01, -0.34], yaw: -0.3, pitch: 0.6, d: 0.38 } },
    go4: { cam: [-0.02, 0.1, -0.46], look: [-0.24, 0.07, -0.17], dur: 12, after: { at: [-0.2, 0.04, -0.2], yaw: 0.5, pitch: 0.5, d: 0.48 } },
    dir: nearRail(5.05, -0.36), R: 0.56, flat: [0.36, 0.46], view: 1.8, pitch: 0.62, yaw: 2.75, music: 'mangue', water: (x, z) => 1 - smooth(-0.46, -0.38, z),
    pois: [
      { name: 'Cachoeira e bosque', text: 'A queda d’água desce do morro de pedras para o poço, no meio dos ipês floridos e dos buritis. Daqui nasce o rio que vai até o mangue.', at: [-0.41, 0.03, 0.23], yaw: 2.9, pitch: 0.6, d: 0.46 },
      { name: 'Mirante dos guarás', text: 'Torre de madeira na beira do mangue. Os guarás vermelhos pousam nas copas; use Soltar os guarás (ou clique no mirante) para vê-los voar em bando.', at: [-0.2, 0.04, -0.2], yaw: 0.5, pitch: 0.5, d: 0.48 },
      { name: 'Caranguejo-uçá', text: 'O banhado de lama na foz do rio, com as tocas e os caranguejos-uçá andando de lado. O mangue é o berçário de muitos bichos do litoral.', at: [-0.12, 0.01, -0.31], yaw: 0.2, pitch: 1.0, d: 0.38 },
      { name: 'Praia das tartarugas', text: 'Ninhos de tartaruga protegidos na areia e uma tartaruga-verde nadando no raso. Use Soltar as tartarugas para ver os filhotes correrem para o mar.', at: [0.2, 0.01, -0.34], yaw: -0.3, pitch: 0.6, d: 0.38 },
      { name: 'Viveiro e turbinas', text: 'A estufa de mudas de mangue para o replantio e, no morro, as turbinas de vento. Clique no viveiro para plantar mudas: elas brotam na beira do banhado.', at: [0.36, 0.03, 0.08], yaw: 2.4, pitch: 0.6, d: 0.55 },
      { name: 'Centro de visitantes', text: 'Pavilhão de vidro com telhado verde e painéis solares. Lá dentro, as pessoas usam óculos de realidade virtual para visitar lugares preservados sem sair da sala.', at: [0.08, 0.03, 0.25], yaw: 0, pitch: 0.42, d: 0.5 }
    ] },
  { name: 'Jogos', text: 'Parque Arcade: um autódromo de kart contorna o parque, com largada no semáforo, arquibancada, box, telão, faixas de turbo, caixas de item e um viaduto onde a pista passa por cima dela mesma. Dentro dele, um mapa de fases: cada brinquedo numa ilha do lago, ligadas por uma trilha de pedrinhas, com o pavilhão do Reciclaverso, o salão de fliperamas (clique nas máquinas para jogar), a roda-gigante, a torre de queda, a Zona VR, o carrossel, a fonte e a Arena dos Blocos. Quatro minigames: escolha um e jogue!', act: 'Reciclaverso', act2: 'Acerte os blocos', kind2: 'whack', act3: 'Corrida de kart', act4: 'Fliperama', done: '', dir: nearRail(4.2, -0.6),
    R: 0.58, flat: [0.42, 0.5], view: 1.6, pitch: 0.55,
    pois: [
      { name: 'Largada e arquibancada', text: 'Reta principal com o pórtico do semáforo de cinco luzes, a faixa quadriculada, a torcida na arquibancada e o telão com a classificação ao vivo.', at: [0.03, 0.03, -0.45], yaw: 0.35, pitch: 0.85, d: 0.62 },
      { name: 'Viaduto', text: 'O laço do lado direito: a pista contorna um laguinho e volta por cima dela mesma numa ponte com muretas acesas. Na rampa, os karts empinam.', at: [0.5, 0.03, 0.1], yaw: -1.5, pitch: 0.62, d: 0.55 },
      { name: 'Salão Arcade', text: 'O salão de fliperamas com letreiro em pixel e neon nas quinas. Clique nas máquinas da calçada para jogar o Quebra-pixel.', at: [-0.24, 0.04, 0.17], yaw: 0.2, pitch: 0.4, d: 0.56 },
      { name: 'Roda-gigante', text: 'Aros duplos cheios de luzes e cabines coloridas que giram devagar sobre o parque.', at: [-0.24, 0.13, -0.15], yaw: 0.45, pitch: 0.3, d: 0.85 },
      { name: 'Reciclaverso', text: 'O jogo da Miniverso que ensina a separar o lixo: um game show em que papel, vidro, metal, plástico e orgânico aparecem na sua frente e você escolhe a lixeira certa.', at: [0, 0.09, -0.21], yaw: 0, pitch: 0.68, d: 0.6 },
      { name: 'Zona VR', text: 'Realidade virtual, a especialidade da Miniverso: pessoas de óculos VR no palco e o óculos gigante girando em holograma.', at: [0.2, 0.07, -0.11], yaw: 0.35, pitch: 0.42, d: 0.5 },
      { name: 'Arena dos Blocos', text: 'Palco redondo com piso de LED e nove buracos: é aqui que os blocos saltam no minigame.', at: [0.19, 0.02, 0.075], yaw: -0.3, pitch: 0.7, d: 0.36 }
    ] },
  { name: 'Negócios', text: 'Distrito de Negócios e Inovação, na beira de uma baía: torres de vidro com a Torre Miniverso no centro, centro de convenções, hub de startups com jardim no teto, parque com fonte, avenida com trânsito, calçadão com palmeiras, marina e uma reunião ao ar livre com o projeto em holograma. Apresentações, treinamentos e gêmeos digitais em VR.',
    act: 'Apresentar projeto em VR', done: 'O projeto surgiu em holograma no meio da mesa e a equipe aprovou!', act2: 'Decolar o helicóptero', kind2: 'fx', done2: 'O helicóptero decolou para uma volta pelo distrito.',
    act3: 'Acender o skyline', done3: 'O skyline acendeu: show de luzes sobre a baía!',
    go: { cam: [0.2, 0.06, 0.34], look: [0.1, 0.04, 0.15], dur: 10, after: { at: [0.11, 0.03, 0.13], yaw: 0.2, pitch: 0.72, d: 0.46 } },
    go2: { track: 'heli', cam: [0.12, 0.09, 0.2], dur: 11, after: { at: [-0.1, 0.1, -0.1], yaw: 0.35, pitch: 0.4, d: 0.8 } },
    go3: { cam: [0.12, 0.12, 0.5], look: [-0.06, 0.12, -0.15], dur: 12.4, after: { at: [-0.08, 0.2, -0.16], yaw: 0.35, pitch: 0.32, d: 0.75 } },
    dir: nearRail(1.6, 0.55), R: 0.56, flat: [0.36, 0.44], view: 1.75, pitch: 0.5, music: 'negocios', clear: 0.62, water: (x, z) => smooth(0.33, 0.4, x),
    pois: [
      { name: 'Torre Miniverso', text: 'A torre mais alta do distrito, com coroa de LED nas cores da marca e elevador panorâmico. Use Acender o skyline à noite.', at: [-0.08, 0.2, -0.16], yaw: 0.35, pitch: 0.32, d: 0.75 },
      { name: 'Reunião em VR', text: 'Mesa ao ar livre onde a equipe apresenta o projeto em holograma. Use Apresentar projeto em VR.', at: [0.11, 0.03, 0.13], yaw: 0.2, pitch: 0.72, d: 0.46 },
      { name: 'Calçadão e marina', text: 'O calçadão com palmeiras na beira da baía e a marina com veleiros.', at: [0.33, 0.02, 0.05], yaw: -1.2, pitch: 0.58, d: 0.62 },
      { name: 'Centro de convenções', text: 'O pavilhão de teto curvo para feiras, congressos e apresentações em realidade virtual.', at: [-0.27, 0.03, 0.17], yaw: 0.45, pitch: 0.5, d: 0.52 },
      { name: 'Parque e fonte', text: 'O parque no meio do distrito, com a fonte, bancos e árvores.', at: [-0.07, 0.02, 0.07], yaw: 0, pitch: 0.7, d: 0.38 }
    ] },
  { name: 'Ferrovia', text: 'Terminal ferroviário: pátio de manobras com quatro linhas e desvios, o virador de vagões no galpão descarregando o minério, a correia coberta até o pátio de estocagem, onde a empilhadeira forma as pilhas, oficina de locomotivas, posto de abastecimento e torre de controle. Na linha principal, os trens seguem viagem.', act: 'Descarregar vagão', done: 'Virador girando: o minério vai para a esteira.', act2: 'Ir na cabine do trem', kind2: 'cab',
    go: { cam: [-0.075, 0.075, 0.18], look: [0.04, 0.015, 0.0], dur: 9 }, dir: nearRail(0.85, -0.2), rail: 0.85,
    R: 0.66, flat: [0.44, 0.52], view: 1.75, pitch: 0.62, music: 'trem' },
  { name: 'Porto', text: 'Terminal de minério e porto multiuso: o minério chega da Ferrovia, vai para as pilhas e segue pela correia coberta até o píer, onde o carregador enche os porões do navio. Contêineres, tanques, rebocadores, boias do canal, o farol no quebra-mar e navios esperando a vez.', act: 'Zarpar o navio', done: 'O navio carregado saiu com os rebocadores; o próximo da fila já vem atracar.', act2: 'Carregar o navio', kind2: 'fx', done2: 'O carregador está enchendo os porões: veja o navio afundar na linha-d’água.',
    go: { track: 'ship', cam: [0.31, 0.09, 0.37], dur: 14, after: { at: [0.06, 0.02, 0.47], yaw: 0.2, pitch: 0.62, d: 0.6 } },
    go2: { cam: [0.15, 0.06, 0.43], look: [0.04, 0.0, 0.525], dur: 10, after: { at: [0.06, 0.02, 0.47], yaw: 0.2, pitch: 0.62, d: 0.6 } }, dir: nearRail(0.25, 0.24),
    R: 0.62, flat: [0.36, 0.46], clear: 0.75, music: 'porto', view: 1.7, pitch: 0.5, focus: [0.05, 0.015, 0.18], water: (x, z) => smooth(0.21, 0.27, z),
    pois: [
      { name: 'Navio e carregador', text: 'O navio atracado no píer e o carregador sobre trilhos enchendo os porões de minério. Use Carregar o navio.', at: [0.06, 0.02, 0.47], yaw: 0.2, pitch: 0.62, d: 0.6 },
      { name: 'Pátio de minério', text: 'As pilhas de minério que chegam da Ferrovia, a empilhadeira e a correia coberta até o píer.', at: [-0.2, 0.02, 0.06], yaw: -0.35, pitch: 0.62, d: 0.66 },
      { name: 'Contêineres', text: 'O pátio de contêineres coloridos com o pórtico sobre pneus e os caminhões.', at: [0.24, 0.02, 0.04], yaw: 0.4, pitch: 0.66, d: 0.6 },
      { name: 'Administração e torre', text: 'O prédio de vidro da administração e a torre de controle do tráfego de navios com o radar girando.', at: [0.02, 0.04, -0.085], yaw: 0.1, pitch: 0.52, d: 0.52 }
    ] },
  { name: 'Lençóis', text: 'Dunas brancas com lagoas de água azul e verde, como nos Lençóis Maranhenses. Passeios virtuais por paisagens do Maranhão.', act: 'Passeio de 4x4', done: 'O 4x4 saiu pelas dunas, contornando as lagoas.',
    go: { track: 'jeep', offset: [0.1, 0.045, 0.06], dur: 13.5 }, dir: nearRail(5.5, 0.62), music: 'dunas',
    R: 0.5, flat: [0.34, 0.44], view: 1.6, pitch: 0.55,
    pois: [
      { name: 'Lagoa Azul', text: 'Lagoas de chuva entre as dunas, azuis no fundo e verde-água na beira, com gente se banhando e guarda-sóis na areia.', at: [0.1, 0.02, 0.0], yaw: 0.3, pitch: 0.55, d: 0.42 },
      { name: 'Campo de dunas', text: 'Dunas em meia-lua, com o lado do vento suave e o lado de trás íngreme; caminhantes nas cristas e o grupo de turistas seguindo o guia.', at: [0.0, 0.03, -0.22], yaw: 0, pitch: 0.62, d: 0.7 },
      { name: 'Mirante', text: 'Mirante de madeira numa crista, com vista para as lagoas e as dunas até o horizonte.', at: [-0.32, 0.05, 0.3], yaw: -0.6, pitch: 0.4, d: 0.34 },
      { name: 'Vila de pescadores', text: 'Casas de palha, coqueiros, redes e canoas na areia, como nas vilas da beira dos Lençóis.', at: [0.37, 0.02, 0.3], yaw: 0.6, pitch: 0.78, d: 0.46 }
    ] }
];
const zoneQuat = d => new THREE.Quaternion().setFromUnitVectors(UP, d);
for (const z of ZONES) { const q = zoneQuat(z.dir); z.lx = new THREE.Vector3(1, 0, 0).applyQuaternion(q); z.lz = new THREE.Vector3(0, 0, 1).applyQuaternion(q); }

export { ZONES };
