// Trilha do planeta, gerada por código (Web Audio), sem nenhum arquivo de áudio para baixar. Cada área tem a sua
// própria música (tom, andamento e instrumentos), e a troca entre elas é um cruzamento suave:
//   espaco   (universo, fora das áreas) ambiente espacial quente: grave longo, pad macio, um "coral" distante,
//            estrelas de sino com eco e, de tempos em tempos, o tema do Miniverso;
//   boi      (Centro)    toada de bumba-meu-boi de matraca: matracas, maracá, zabumba, pandeirão, o ronco do
//            tambor-onça, cavaquinho e a toada cantada; ao chamar o boi, tudo cresce e a toada não para;
//   porto    (Porto)     reggae "roots" com eco de dub, melódica, as ondas e a buzina de um navio ao longe;
//   cabine   (cabine do trem) o reggae de São Luís com o ta-dum dos trilhos por baixo;
//   trem     (Ferrovia)  baião: zabumba, triângulo, sanfona e o "piuí" do trem;
//   mangue   (Ecologia)  flauta, kalimba, chocalho, passarinhos, sapo e água correndo;
//   escola   (Educação)  xilofone brincalhão, pizzicato, caixinha de música, palmas e o sino da escola;
//   negocios (Negócios)  lo-fi elegante: piano elétrico com tremolo, vibrafone, batida com swing e chiado de vinil;
//   dunas    (Lençóis)   violão dedilhado em três tempos, vento sobre a areia, brilhos de lagoa e gaivotas;
//   jogos    (Parque Arcade) synthwave neon: baixo pulsando, pad largo, arpejo com eco e melodia de sintetizador;
//   corrida  (kart, da largada à chegada) faixa acelerada estilo 16 bits; na última volta sobe o tom e acelera;
//   natal    (Natal)     valsa natalina: guizos de trenó, celesta, cordas em pizzicato e uma melodia própria.
// Cada faixa só é montada na primeira vez em que toca (o carregamento do site fica mais leve).
// Efeitos da formação do planeta: um som que sobe junto com a barra de carregamento, um bipe a cada 5% e um acorde
// de chegada com um grave quando o planeta fica pronto.
// Efeitos dos minigames (sfx): bipes, acertos, erros, a largada, o motor do kart (que sobe com a velocidade) e uma
// fanfarra de vitória. A música abaixa um pouco enquanto um jogo está rolando (menos na corrida, que tem a sua).
// O navegador só libera som depois de um clique, toque ou tecla (rolar não conta). O primeiro gesto em qualquer
// lugar já prepara o áudio, para a formação soar desde o início.
// Vem ligada: começa bem baixinho quando o planeta se forma e cresce devagar. O botão desliga, e a escolha fica
// guardada no navegador. Só toca com o planeta na tela e a aba à vista.

const KEY = 'miniverso-musica';
const VOL = 0.95;
const mtof = m => 440 * 2 ** ((m - 69) / 12);
// Partitura em texto: números são notas MIDI, "." é pausa (ou nota segurando) e "|" só separa os compassos.
const S = str => str.replace(/\|/g, ' ').trim().split(/\s+/).map(x => (x === '.' ? 0 : +x));
const PENTA = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91];                                       // bipes do carregamento, subindo

// Universo: Ré maior, quatro compassos por acorde (Ré maj9, Si m11, Sol maj7#11, Lá sus).
const ESP = [{ r: 38, p: [62, 66, 69, 73, 76] }, { r: 35, p: [59, 62, 66, 69, 76] }, { r: 43, p: [55, 59, 62, 66, 73] }, { r: 45, p: [57, 62, 64, 69, 71] }];
const STARS = [74, 76, 78, 81, 83, 86, 88, 90, 93];
const ESP_TEMA = S(`78 . . . . . 76 . 74 . . . . . . . | 71 . 74 . 78 . . . 81 . . . . . . . | 79 . . . 78 . . . 76 . . . . . . . | 74 . . . . . . . . . . . . . . . |
  76 . . . . . 74 . 76 . . . 81 . . . | 83 . . . . . 81 . . . . . 76 . . . | 78 . . . 76 . . . 74 . . . . . . . | . . . . . . . . . . . . . . . .`);
// Boi: Sol maior; toada de oito compassos (dois versos).
const BOI_R = [43, 43, 50, 43, 48, 43, 50, 43];
const BOI_T = { 43: [55, 59, 62], 48: [55, 60, 64], 50: [54, 57, 62] };
const MATRACA = [1, .45, 0, .8, 1, .45, 0, .8, 1, .45, 0, .8, 1, .45, .8, .55];
const TOADA = S(`74 . 74 . 76 . 74 . 71 . . . 67 . 69 . | 71 . . . 71 . 69 . 67 . . . . . . . | 69 . 69 . 71 . 72 . 74 . . . 72 . 71 . | 69 . . . 66 . . . 67 . . . . . . . |
  71 . 71 . 72 . 74 . 76 . . . 74 . 72 . | 71 . . . 74 . . . 79 . . . . . . . | 78 . 76 . 74 . 72 . 71 . . . 69 . . . | 67 . . . . . . . . . . . . . . .`);
// Reggae: Lá menor dórico (Lá m7 – Ré), dois compassos cada.
const REG = [{ r: 45, c: [57, 60, 64, 67] }, { r: 50, c: [57, 60, 62, 66] }];
const MELODICA = S(`76 . . 74 76 . 79 . 76 . . . 74 . 72 . | 74 . . . . . . . . . . . . . . . | 72 . . 71 72 . 74 . 76 . . . 74 . 72 . | 69 . . . . . . . . . . . . . . . |
  81 . . 79 76 . 79 . 81 . . . 79 . 76 . | 78 . . . 74 . . . . . . . . . . . | 76 . . 74 72 . 74 . 72 . . . 71 . 69 . | 69 . . . . . . . . . . . . . . .`);
// Baião: Ré mixolídio (o "Si bemol" nordestino é o Dó natural), com cadência em Lá7.
const FOR_R = [50, 50, 48, 50, 50, 50, 45, 50];
const FOR_T = { 50: [62, 66, 69], 48: [60, 64, 67], 45: [57, 61, 64, 67] };
const SANFONA = S(`81 . 81 79 78 . 76 . 74 . 76 . 78 . . . | 79 . 78 . 76 . 74 . 72 . . . . . . . | 72 . 72 74 76 . 72 . 74 . . . 76 . 78 . | 79 . . . 78 . 76 . 74 . . . . . . . |
  81 . 81 79 78 . 76 . 74 . 76 . 78 . . . | 79 . 81 . 83 . 84 . 83 . 81 . . . . . | 79 . 78 . 76 . 73 . 76 . 74 . 73 . . . | 74 . . . . . . . . . . . . . . .`);
// Mangue: Mi menor (Mi m9 – Dó maj7 – Sol – Ré sus), dois compassos cada.
const MAN = [{ r: 40, p: [55, 59, 62, 66] }, { r: 36, p: [55, 59, 64, 67] }, { r: 43, p: [57, 59, 62, 67] }, { r: 38, p: [57, 62, 64, 69] }];
const KALIMBA = S(`76 . 79 . 74 . . 71 69 . . . 67 . 64 . | 67 . 69 . 71 . . 74 76 . 74 . . . . . | 79 . 76 . 74 . 71 . 69 . . 71 74 . . . | 71 . 69 . 67 . 64 . . . . . . . . .`);
const FLAUTA = S(`83 . . . 81 . 79 . 78 . . . 76 . . . | 74 . . . 76 . . . 79 . . . . . . . | 78 . . . 76 . 74 . 71 . . . 74 . . . | 76 . . . . . . . . . . . . . . . |
  79 . . . 81 . 83 . 86 . . . 83 . . . | 81 . . . 79 . 78 . 76 . . . . . . . | 74 . 76 . 79 . . . 78 . 76 . 74 . . . | 76 . . . . . . . . . . . . . . .`);
// Escola: Dó maior, I – vi – IV – V, um compasso cada.
const ESC_R = [48, 45, 41, 43];
const ESC_T = { 48: [60, 64, 67], 45: [57, 60, 64], 41: [57, 60, 65], 43: [55, 59, 62] };
const CAIXA = [1, 0, 1, 1, 0, 1, 1, 0];
const XILO = S(`72 . 76 . 79 . 76 . 77 . 76 . 74 . . . | 72 . 76 . 81 . 79 . 77 . 76 . 72 . . . | 77 . 81 . 84 . 81 . 79 . 77 . 76 . 74 . | 72 . 74 . 76 . 79 . 74 . . . . . . .`);
// Negócios: Fá maj9 – Mi m7 – Ré m9 – Sol13, dois compassos cada.
const NEG = [{ r: 41, c: [57, 60, 64, 67] }, { r: 40, c: [55, 59, 62, 64] }, { r: 38, c: [53, 57, 60, 64] }, { r: 43, c: [53, 59, 64] }];
const VIBRA = S(`76 . . 74 72 . . . 69 . . . . . . . | 72 . . . 76 . . . 79 . . . . . . . | 74 . . 72 71 . . . 67 . . . . . . . | 71 . . . 74 . . . 76 . . . . . . . |
  72 . . 69 65 . . . 69 . . . . . . . | 72 . . . 74 . 76 . 77 . . . . . . . | 74 . . . 71 . . . 77 . . . 76 . . . | 74 . . . . . . . . . . . . . . .`);
// Lençóis: Lá maior com cores abertas, em três tempos (compasso de 12 semicolcheias).
const DUN = [{ r: 45, c: [57, 61, 64, 68, 71] }, { r: 42, c: [54, 57, 61, 64, 69] }, { r: 38, c: [54, 57, 61, 62, 68] }, { r: 40, c: [52, 57, 59, 61, 64] }];
const DEDILHADO = [0, 2, 3, 4, 3, 2];
// Parque Arcade: Lá menor (Lá m7 – Fá maj7 – Dó – Sol), dois compassos cada.
const JOG = [{ r: 45, c: [57, 60, 64, 67] }, { r: 41, c: [57, 60, 64, 65] }, { r: 48, c: [55, 60, 64, 67] }, { r: 43, c: [55, 59, 62, 67] }];
const NEON = S(`76 . . . 74 . 72 . 74 . . . 76 . . . | 72 . . . . . . . . . . . 69 . 71 . | 72 . . . 74 . 76 . 79 . . . 77 . 76 . | 74 . . . . . . . 71 . . . 72 . 74 . |
  76 . . . 74 . 72 . 74 . . . 76 . 79 . | 81 . . . . . 79 . 77 . . . 76 . . . | 72 . . . 74 . 76 . 74 . . . 71 . . . | 69 . . . . . . . . . . . . . . .`);
// Corrida: Mi menor (Mi m – Dó – Sol – Ré), um compasso cada.
const RACE = [40, 36, 43, 38];
const RACE_T = { 40: [64, 67, 71], 36: [60, 64, 67], 43: [62, 67, 71], 38: [62, 66, 69] };
const CHIP = S(`76 . 79 . 83 . 81 . 79 . 76 . 78 . 79 . | 76 . . . 72 . 74 . 76 . . . . . . . | 74 . 79 . 83 . 86 . 84 . 83 . 81 . 79 . | 78 . . . 74 . 76 . 78 . . . 81 . 78 . |
  83 . 83 . 81 . 79 . 81 . 79 . 76 . 79 . | 76 . . . . . 72 . 76 . 79 . 84 . . . | 83 . 81 . 79 . 83 . 86 . . . 83 . 79 . | 81 . . . 78 . 74 . 78 . 81 . 86 . . .`);
// Natal: valsa em Sol maior, uma nota da melodia por tempo (três por compasso), dois versos de oito compassos.
const NAT_R = [43, 48, 43, 40, 48, 50, 45, 43, 43, 40, 48, 45, 43, 48, 50, 43];
const NAT_T = { 43: [59, 62, 67], 48: [60, 64, 67], 40: [59, 64, 67], 50: [57, 62, 66], 45: [57, 60, 64] };
const CANTO = [74, 0, 71, 72, 74, 76, 74, 0, 0, 71, 72, 74, 76, 79, 76, 78, 76, 74, 72, 71, 69, 67, 0, 0,
  79, 0, 78, 76, 0, 74, 72, 0, 71, 69, 71, 72, 74, 76, 74, 72, 71, 72, 74, 0, 78, 79, 0, 0];

export function createMusic() {
  let want = true, active = false, gestured = false, zone = null, boost = false, race = null;
  try { want = localStorage.getItem(KEY) !== '0'; } catch { /* sem armazenamento: fica ligada */ }
  // No iPhone (Safari 17+), áudio "ambiente" respeita a chave de silencioso e não interrompe outra música tocando.
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* navegador sem suporte */ }
  let ctx = null, master, rev, noiseBuf, timer = 0, sus = 0, load = 1, riser = null, duck = false, motor = null;
  const buses = {}, live = {};

  // O áudio é montado em duas partes: o contexto (rápido, é o que o navegador precisa liberar no primeiro toque) e o
  // resto (reverberação, ruídos), mais pesado. Com a página ociosa, esse resto é montado em etapas pequenas, uma por
  // momento livre (gerar o ruído, cada canal do eco, preparar cada eco), para nunca travar a capa ou o planeta; antes era
  // um bloco só de ~80 ms. Se o som for pedido antes de terminar (um toque em "som"), o que falta é montado na hora.
  function makeCtx() { if (!ctx) ctx = new AudioContext(); }
  const B = {}, sr = () => ctx.sampleRate;
  const fillIr = (d, from = 0, to = d.length) => { for (let i = from; i < to; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3; };
  const STEPS = [
    () => {
      makeCtx();
      B.master = ctx.createGain(); B.master.gain.value = 0;
      B.comp = ctx.createDynamicsCompressor(); B.comp.threshold.value = -18; B.comp.ratio.value = 3;
      B.master.connect(B.comp).connect(ctx.destination);
      // Ruído branco reaproveitado pela percussão, pelas ondas, pelo vento e pelo ronco do trem.
      noiseBuf = ctx.createBuffer(1, sr() * 2, sr());
      const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    },
    // Reverberação (resposta de impulso gerada), dividida por todas as faixas: cada canal numa etapa.
    () => { B.ir = ctx.createBuffer(2, sr() * 1.8, sr()); fillIr(B.ir.getChannelData(0)); },
    () => fillIr(B.ir.getChannelData(1)),
    () => { B.sIr = ctx.createBuffer(2, sr() * 1.1, sr()); fillIr(B.sIr.getChannelData(0)); fillIr(B.sIr.getChannelData(1)); },
    () => { rev = ctx.createConvolver(); rev.buffer = B.ir; const revOut = ctx.createGain(); revOut.gain.value = 0.55; rev.connect(revOut).connect(B.master); },
    () => {
      // Efeitos vão direto para a saída (não esperam a música subir), com reverberação própria.
      buses.sfx = ctx.createGain(); buses.sfx.gain.value = 0; buses.sfx.connect(B.comp);
      const sRev = ctx.createConvolver(); sRev.buffer = B.sIr; sRev.connect(buses.sfx);
      buses.sfxRev = ctx.createGain(); buses.sfxRev.connect(buses.sfx); const sSend = ctx.createGain(); sSend.gain.value = 0.8; buses.sfxRev.connect(sSend).connect(sRev);
      master = B.master;
      timer = setInterval(schedule, 25);
      mix();
    }
  ];
  let step = 0, idleBuild = 0;
  function buildSoon() {
    if (master || idleBuild) return;
    const run = () => { idleBuild = 0; if (master) return; STEPS[step++](); if (master) apply(); else idleBuild = idle(run); };
    const idle = fn => ('requestIdleCallback' in window ? requestIdleCallback(fn, { timeout: 2500 }) : setTimeout(fn, 120));
    idleBuild = idle(run);
  }
  function ensure() {
    makeCtx();
    while (!master) STEPS[step++]();
  }

  // ——— Instrumentos ———
  function loopNoise(type, freq, gain, out, lfoHz, depth) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfoHz; lg.gain.value = depth; l.connect(lg).connect(g.gain); l.start();
    s.connect(f).connect(g).connect(out); s.start();
  }
  // Uma nota. hold: segura até 70% da duração (sopros, cordas, pads); vib: [velocidade, profundidade em cents];
  // formant: filtros de vogal ("aah" do coral); pan: posição no estéreo (-1 a 1).
  function tone(t, type, freq, dur, gain, out, { attack = 0.006, freqEnd, filter, detune = 0, hold = false, vib, formant, pan } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack);
    if (hold) g.gain.setValueAtTime(gain, Math.max(t + attack, t + dur * 0.7));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (vib) {
      const v = ctx.createOscillator(), vg = ctx.createGain(); v.frequency.value = vib[0];
      vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(vib[1], t + Math.min(0.4, dur * 0.5));
      v.connect(vg).connect(o.detune); v.start(t); v.stop(t + dur + 0.05);
    }
    let n = o;
    if (formant) { n = ctx.createGain(); for (const f of formant) { const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = 5; o.connect(b).connect(n); } }
    else if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); n = f; }
    let dst = out; if (pan) { dst = ctx.createStereoPanner(); dst.pan.value = pan; dst.connect(out); }
    n.connect(g).connect(dst); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, type, freq, q, gain, out) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  const pad = (t, notes, dur, out, { type = 'triangle', g = 0.02, attack = 1.2, filter = 1400, spread = 7 } = {}) => notes.forEach((m, k) => {
    const pan = notes.length > 1 ? (k / (notes.length - 1) - 0.5) * 0.7 : 0;
    for (const d of [-spread, spread]) tone(t, type, mtof(m), dur, g, out, { attack, hold: true, filter, detune: d, pan });
  });
  const kick = (t, out, g = 0.28, f = 120) => tone(t, 'sine', f, 0.32, g, out, { freqEnd: 40, attack: 0.002 });
  const snare = (t, out, g = 0.08) => { noise(t, 0.16, 'bandpass', 1900, 0.9, g, out); tone(t, 'triangle', 200, 0.09, g * 0.9, out, { freqEnd: 140, attack: 0.001 }); };
  const hat = (t, out, g = 0.012, open = false) => noise(t, open ? 0.18 : 0.028, 'highpass', 7800, 0.7, g, out);
  const clap = (t, out, g = 0.05) => { for (let k = 0; k < 3; k++) noise(t + k * 0.011, k === 2 ? 0.12 : 0.02, 'bandpass', 1500, 1.4, g, out); };
  const shaker = (t, out, g) => noise(t, 0.045, 'highpass', 5600, 0.8, g, out);
  const bell = (t, m, out, g = 0.03, dur = 1.8, pan) => { tone(t, 'sine', mtof(m), dur, g, out, { attack: 0.004, pan }); tone(t, 'sine', mtof(m) * 2.76, dur * 0.3, g * 0.25, out, { attack: 0.002, pan }); };
  const pluck = (t, m, out, g = 0.04, dur = 0.9, pan, filter = 2600) => tone(t, 'triangle', mtof(m), dur, g, out, { attack: 0.003, filter, pan });
  const sanfona = (t, m, dur, g, out, pan) => { for (const d of [-9, 9]) tone(t, 'sawtooth', mtof(m), dur, g, out, { attack: 0.025, hold: true, filter: 2000, detune: d, pan, vib: [5.5, 5] }); };
  const melodica = (t, m, dur, out) => { tone(t, 'sawtooth', mtof(m), dur, 0.026, out, { filter: 1500, attack: 0.03, hold: true, vib: [5, 9] }); tone(t, 'square', mtof(m), dur, 0.01, out, { filter: 2200, attack: 0.03, hold: true, detune: 6 }); };
  const flute = (t, m, dur, g, out) => {
    tone(t, 'sine', mtof(m), dur, g, out, { attack: 0.07, hold: true, vib: [5, 14] });
    tone(t, 'sine', mtof(m) * 2, dur * 0.8, g * 0.12, out, { attack: 0.07, hold: true });
    noise(t, 0.12, 'bandpass', mtof(m) * 2, 2, g * 0.45, out);                                  // sopro
  };
  const rhodes = (t, m, dur, g, out, pan) => { tone(t, 'sine', mtof(m), dur, g, out, { attack: 0.005, pan }); tone(t, 'sine', mtof(m + 24), 0.35, g * 0.18, out, { attack: 0.002, pan }); };
  const jingle = (t, out, g) => { noise(t, 0.09, 'highpass', 7200, 0.7, g, out); tone(t, 'sine', 6100, 0.07, g * 0.12, out, { attack: 0.001, pan: 0.3 }); tone(t + 0.012, 'sine', 7900, 0.06, g * 0.1, out, { attack: 0.001, pan: -0.3 }); };
  function horn(t, out) {
    for (const [f, d] of [[73.4, -6], [92.5, 6]]) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.35); g.gain.setValueAtTime(0.045, t + 2.1); g.gain.linearRampToValueAtTime(0, t + 3);
      o.connect(lp).connect(g).connect(out); o.start(t); o.stop(t + 3.1);
    }
  }
  const piui = (t, out) => { for (const [at, dur] of [[0, 0.9], [1.1, 0.5]]) for (const f of [740, 932]) tone(t + at, 'square', f, dur, 0.016, out, { filter: 1800, hold: true, attack: 0.05 }); };
  const bird = (t, out, g = 0.025) => { const f = 2400 + Math.random() * 1600; for (let c = 0; c < 2 + (Math.random() * 3 | 0); c++) tone(t + c * 0.09, 'sine', f, 0.07, g, out, { freqEnd: f * 1.5, attack: 0.004, pan: Math.random() - 0.5 }); };
  const gull = (t, out) => { const f = 1800 + Math.random() * 500; for (let c = 0; c < 2; c++) tone(t + c * 0.22, 'sine', f, 0.28, 0.014, out, { freqEnd: f * 0.7, attack: 0.02, pan: 0.5 }); };
  const rnd = a => a[(Math.random() * a.length) | 0];

  // ——— As faixas ———
  // Cada uma recebe, a cada semicolcheia: s (passo desde o início), i (passo no compasso), bar (compasso), t (hora),
  // ST (duração do passo) e três saídas: m (seca), a (com ar: muita reverberação) e e (com eco no tempo da música).
  function espaco({ s, i, bar, t, ST, m, a, e }) {
    const ch = ESP[(bar >> 2) % 4];
    if (i === 0 && bar % 4 === 0) {
      pad(t, ch.p, ST * 64 + 1, a, { g: 0.012, attack: 2.4, filter: 1500 });
      tone(t, 'sine', mtof(ch.r), ST * 64 + 1, 0.11, m, { attack: 2.5, hold: true });
      if (bar % 8 === 4) ch.p.slice(0, 3).forEach((n, k) => tone(t, 'sawtooth', mtof(n), ST * 64, 0.07, a, { attack: 3, hold: true, formant: [700, 1150], detune: k * 5 - 5, pan: (k - 1) * 0.5 }));
    }
    if (bar >= 4 && i % 8 === 0) tone(t, 'sine', mtof(ch.r + 12), ST * 7, 0.045, m, { attack: 0.03 });   // pulso macio
    if (i % 4 === 2 && Math.random() < 0.3) bell(t, rnd(STARS), e, 0.02, 2.6, Math.random() * 1.4 - 0.7);   // estrelas
    const n = bar % 16 >= 8 && ESP_TEMA[s % 128];
    if (n) { tone(t, 'sine', mtof(n), ST * 8, 0.05, e, { attack: 0.09, hold: true, vib: [4.6, 9] }); tone(t, 'triangle', mtof(n - 12), ST * 8, 0.015, a, { attack: 0.1, hold: true }); }
  }
  function boi({ s, i, bar, t, ST, m, a, e }) {
    const r = BOI_R[bar % 8], hot = boost;
    if (MATRACA[i]) noise(t, 0.03, 'bandpass', 2300 + Math.random() * 500, 3, (hot ? 0.17 : 0.12) * MATRACA[i], m);
    if (i % 2 === 0 || hot) shaker(t, m, i % 4 === 0 ? 0.03 : 0.016);                              // maracá
    if (i === 0 || i === 7 || i === 10 || (i === 13 && bar % 2)) tone(t, 'sine', 140, 0.34, 0.3, m, { freqEnd: 48 });   // zabumba
    if (i === 4 || i === 12) { noise(t, 0.12, 'lowpass', 380, 0.8, 0.12, m); tone(t, 'sine', 85, 0.25, 0.14, m, { freqEnd: 58 }); }   // pandeirão
    if (hot && (i === 3 || i === 11)) tone(t, 'sine', 110, 0.3, 0.3, m, { freqEnd: 45 });
    if (i === 8 && bar % 2) { tone(t, 'triangle', 230, 0.2, 0.07, m, { freqEnd: 430, attack: 0.02, filter: 1200 }); tone(t + ST * 2, 'triangle', 420, 0.22, 0.06, m, { freqEnd: 220, attack: 0.02, filter: 1200 }); }   // tambor-onça
    if (i === 0 || i === 6 || i === 10) tone(t, 'triangle', mtof(r - 12 + (i === 6 ? 7 : 0)), ST * 3, 0.11, m, { attack: 0.01 });
    if (i % 4 === 2) BOI_T[r].forEach((n, k) => pluck(t + k * 0.012, n + 12, a, 0.018, 0.35, (k - 1) * 0.4, 3200));   // cavaquinho
    const n = (hot || (bar % 32 >= 4 && bar % 32 < 20)) && TOADA[s % 128];
    if (n) {
      tone(t, 'square', mtof(n), ST * 2.6, 0.026, e, { filter: 2600, vib: [5.5, 10], hold: true, attack: 0.02 });
      tone(t, 'triangle', mtof(n - 12), ST * 2.6, 0.05, m, { hold: true, attack: 0.02 });
      if (hot) tone(t, 'triangle', mtof(n + 12), ST * 2, 0.014, a, { attack: 0.02 });
    }
  }
  function reggae({ s, i, bar, t, ST, m, a, e }, porto) {
    const ch = REG[(bar >> 1) % 2], tt = i % 2 ? t + ST * 0.18 : t;
    const b = { 0: 0, 3: 0, 6: 7, 10: 0, 13: 5 }[i];
    if (b != null) { tone(t, 'sine', mtof(ch.r - 12 + b), ST * 2.2, 0.17, m, { attack: 0.01 }); tone(t, 'triangle', mtof(ch.r + b), ST * 1.5, 0.025, m, { attack: 0.01, filter: 800 }); }
    if (i === 4 || i === 12) ch.c.forEach((n, k) => tone(t, 'square', mtof(n), ST * 0.8, 0.011, a, { filter: 1700, attack: 0.004, pan: (k - 1.5) * 0.25 }));   // acorde no contratempo
    if (i % 4 === 2) for (const n of [ch.c[0] - 12, ch.c[2] - 12]) tone(t, 'triangle', mtof(n), ST * 0.6, 0.016, m, { filter: 1200, pan: -0.3 });   // órgão "bolha"
    if (i === 8) { kick(t, m, 0.2, 95); noise(t, 0.04, 'bandpass', 2600, 4, 0.06, porto ? e : m); }   // one drop
    hat(tt, m, i % 4 === 2 ? 0.018 : 0.008);
    const on = porto ? bar % 16 >= 4 && bar % 16 < 12 : bar % 16 >= 8, n = on && MELODICA[s % 128];
    if (n) melodica(t, n, ST * 2.4, porto ? e : a);
    if (porto && i === 0 && bar % 16 === 14) horn(t, m);
    if (!porto && (i === 0 || i === 2)) tone(t, 'sine', 78, 0.1, 0.05, m, { freqEnd: 44 });         // ta-dum dos trilhos
  }
  function forro({ s, i, bar, t, ST, m, a, e }) {
    const r = FOR_R[bar % 8];
    if (i === 0 || i === 8) tone(t, 'sine', 120, 0.3, 0.3, m, { freqEnd: 50 });                    // zabumba
    if (i === 3 || i === 11) tone(t, 'sine', 120, 0.22, 0.15, m, { freqEnd: 55 });
    if (i === 4 || i === 12) noise(t, 0.03, 'bandpass', 3200, 2, 0.07, m);                         // bacalhau
    const open = i % 4 === 2;                                                                    // triângulo
    tone(t, 'sine', 4200, open ? 0.35 : 0.04, open ? 0.016 : 0.009, a, { attack: 0.001, pan: 0.45 });
    tone(t, 'sine', 5870, open ? 0.3 : 0.03, open ? 0.01 : 0.006, a, { attack: 0.001, pan: 0.45 });
    const b = { 0: 0, 3: 0, 8: 7, 11: 7 }[i]; if (b != null) tone(t, 'triangle', mtof(r - 12 + b), ST * 2.5, 0.12, m, { attack: 0.006 });
    if (i % 4 === 2) FOR_T[r].forEach(n => tone(t, 'sawtooth', mtof(n), ST * 1.2, 0.006, a, { filter: 1600, attack: 0.008, detune: 8, pan: -0.25 }));   // fole da sanfona
    const n = bar % 16 >= 4 && bar % 16 < 12 && SANFONA[s % 128];
    if (n) sanfona(t, n, ST * 1.9, 0.016, e, 0.15);
    if (i === 0 && bar % 16 === 14) piui(t, a);
  }
  function mangue({ s, i, bar, t, ST, m, a, e }) {
    const ch = MAN[(bar >> 1) % 4], solo = bar % 16 >= 8;
    if (i === 0 && bar % 2 === 0) { pad(t, ch.p, ST * 32 + 0.8, a, { g: 0.008, attack: 1.5, filter: 1100 }); tone(t, 'sine', mtof(ch.r + 12), ST * 30, 0.06, m, { attack: 0.4, hold: true }); }
    const k = KALIMBA[s % 64];
    if (k) { const g = solo ? 0.6 : 1; tone(t, 'triangle', mtof(k), 1.1, 0.045 * g, e, { attack: 0.004, pan: ((k % 5) - 2) * 0.15 }); tone(t, 'sine', mtof(k + 12), 0.5, 0.018 * g, e, { attack: 0.003 }); }
    if (i % 2 === 1) shaker(t, m, i % 4 === 3 ? 0.022 : 0.011);                                     // chocalho
    const f = solo && FLAUTA[s % 128]; if (f) flute(t, f, ST * 3.6, 0.04, a);
    if (i % 4 === 0 && Math.random() < 0.18) bird(t, a);
    if (i === 8 && bar % 4 === 3 && Math.random() < 0.6) for (let c = 0; c < 2; c++) tone(t + c * 0.16, 'square', 120, 0.1, 0.02, m, { filter: 500, freqEnd: 90 });   // sapo
  }
  function escola({ s, i, bar, t, ST, m, a, e }) {
    const r = ESC_R[bar % 4], tri = ESC_T[r];
    if (i === 0 || i === 8) tone(t, 'triangle', mtof(r - 12 + (i === 8 ? 7 : 0)), ST * 1.5, 0.12, m, { attack: 0.004, filter: 900 });   // pizzicato
    if (i === 6 || i === 14) tone(t, 'triangle', mtof(r), ST, 0.06, m, { attack: 0.004, filter: 900 });
    if (i % 4 === 2) noise(t, 0.025, 'bandpass', 1900, 6, 0.045, m);                              // bloco de madeira
    if (bar >= 2 && (i === 4 || i === 12)) clap(t, a, 0.035);
    if (i % 2 === 0 && CAIXA[i / 2]) bell(t, tri[(i / 2 + bar) % 3] + 24, e, 0.012, 0.8, (i / 2) % 2 ? 0.5 : -0.5);   // caixinha de música
    const n = bar % 16 >= 4 && bar % 16 < 12 && XILO[s % 64];
    if (n) { tone(t, 'triangle', mtof(n), 0.4, 0.05, a, { attack: 0.002 }); tone(t, 'sine', mtof(n + 12), 0.25, 0.02, a, { attack: 0.002 }); }   // xilofone
    if (i === 0 && bar % 16 === 15) [88, 84].forEach((mm, k) => bell(t + k * 0.55, mm, a, 0.03, 1.6));   // sino da escola
  }
  function negocios({ s, i, bar, t, ST, m, a, e }) {
    const ch = NEG[(bar >> 1) % 4], tt = i % 2 ? t + ST * 0.32 : t;                                // swing
    if (i === 0 && bar % 2 === 0) ch.c.forEach((n, k) => rhodes(t + k * 0.018, n, ST * 26, 0.03, a, (k - 1.5) * 0.3));
    if (i === 14 && bar % 2) ch.c.slice(1).forEach((n, k) => rhodes(tt + k * 0.012, n, ST * 3, 0.018, a, (k - 1) * 0.3));
    const b = { 0: 0, 6: 7, 10: 12, 14: 10 }[i]; if (b != null) tone(tt, 'sine', mtof(ch.r - 12 + b), ST * 2.4, 0.15, m, { attack: 0.01 });
    if (i === 0 || i === 10) kick(tt, m, 0.13, 80);
    if (i === 4 || i === 12) noise(t, 0.08, 'bandpass', 1500, 0.9, 0.035, m);                     // caixa abafada
    if (i % 2 === 0) hat(t, m, 0.008); else if (i % 4 === 3) hat(tt, m, 0.005);
    if (Math.random() < 0.35) noise(t + Math.random() * ST, 0.006, 'highpass', 3000, 0.5, 0.008 + Math.random() * 0.016, m);   // chiado de vinil
    const n = bar % 16 >= 8 && VIBRA[s % 128];
    if (n) { tone(t, 'sine', mtof(n), 1.4, 0.035, e, { attack: 0.003 }); tone(t, 'sine', mtof(n + 12), 0.4, 0.008, e, { attack: 0.002 }); }   // vibrafone
  }
  function dunas({ i, bar, t, ST, m, a, e }) {
    const ch = DUN[(bar >> 1) % 4];
    if (i === 0 && bar % 2 === 0) { tone(t, 'sine', mtof(ch.r), ST * 24, 0.08, m, { attack: 0.3, hold: true }); pad(t, ch.c.slice(1, 4), ST * 24 + 1, a, { g: 0.006, attack: 2, filter: 1200 }); }
    if (i % 2 === 0) pluck(t, ch.c[DEDILHADO[i / 2]] + (bar % 4 === 3 && i === 6 ? 12 : 0), e, 0.04, 1.6, (i / 2) % 2 ? 0.35 : -0.35, 2400);   // violão
    if (bar % 8 >= 4 && i === 0) bell(t, ch.c[4] + 12, e, 0.018, 3);
    if (i % 6 === 3 && Math.random() < 0.15) bell(t, rnd(ch.c) + 24, a, 0.01, 2.2, Math.random() - 0.5);   // brilho da lagoa
    if (i === 0 && Math.random() < 0.12) gull(t, a);
  }
  function jogos({ s, i, bar, t, ST, m, a, e }) {
    const ch = JOG[(bar >> 1) % 4];
    if (i === 0 && bar % 2 === 0) pad(t, ch.c, ST * 32 + 0.5, a, { type: 'sawtooth', g: 0.006, attack: 0.6, filter: 1500, spread: 10 });
    if (i % 2 === 0) tone(t, 'sawtooth', mtof(ch.r - 12 + (i % 4 === 2 ? 12 : 0)), ST * 1.6, 0.05, m, { filter: 650, attack: 0.004 });
    if (i % 4 === 0) kick(t, m, 0.22);
    if (i === 4 || i === 12) snare(t, a, 0.07);
    if (i % 4 === 2) hat(t, m, 0.014); if (i === 14) hat(t, m, 0.01, true);
    if (bar >= 4) tone(t, 'square', mtof(ch.c[[0, 1, 2, 3, 2, 3, 1, 2][i % 8]] + 12), ST * 1.4, 0.011, e, { filter: 2400, pan: i % 2 ? 0.4 : -0.4 });   // arpejo
    const n = bar % 16 >= 8 && NEON[s % 128];
    if (n) for (const d of [-7, 7]) tone(t, 'sawtooth', mtof(n), ST * 3, 0.014, e, { filter: 2800, attack: 0.01, hold: true, detune: d, vib: [5.2, 8] });
  }
  function corrida({ s, i, bar, t, ST, m, a, e, x }) {
    const k = x.final ? 2 : 0, base = RACE[bar % 4], r = base + k, tri = RACE_T[base];
    if (i % 4 === 0) kick(t, m, 0.24, 130);
    if (i === 4 || i === 12) snare(t, m, 0.08);
    hat(t, m, i % 2 ? 0.006 : 0.012);
    if (i === 0 && bar % 8 === 0) noise(t, 1.2, 'highpass', 6000, 0.5, 0.05, a);                 // prato
    if (i % 4 !== 1) tone(t, 'sawtooth', mtof(r - 12 + (i % 8 === 6 ? 12 : 0)), ST * 0.9, 0.06, m, { filter: 900, attack: 0.003 });   // baixo galopando
    if (i === 0 || i === 6 || i === 10) tri.forEach(n => tone(t, 'square', mtof(n + k), ST * 1.5, 0.008, a, { filter: 2500 }));
    const n = bar >= 4 && CHIP[(s - 64) % 128];
    if (n) { tone(t, 'square', mtof(n + k), ST * 1.8, 0.024, e, { filter: 3600, attack: 0.004 }); tone(t, 'square', mtof(n + k + 12), ST * 1.2, 0.006, a, { filter: 4000, detune: 8 }); }
    if (x.final && i % 2) tone(t, 'square', mtof(tri[(i >> 1) % 3] + 12 + k), ST * 0.8, 0.008, e, { filter: 3000 });   // última volta: arpejo de alerta
  }
  function natal({ i, bar, t, ST, m, a, e }) {
    const b16 = bar % 16, r = NAT_R[b16], tri = NAT_T[r];
    if (i === 0) { tone(t, 'triangle', mtof(r - 12 + (bar % 2 ? 7 : 0)), ST * 3, 0.13, m, { attack: 0.004, filter: 900 }); pad(t, tri, ST * 12 + 0.3, a, { type: 'sawtooth', g: 0.0045, attack: 0.3, filter: 1600, spread: 6 }); }
    if (i === 4 || i === 8) tri.forEach((n, k) => tone(t, 'triangle', mtof(n), ST * 1.6, 0.016, a, { attack: 0.004, filter: 2200, pan: (k - 1) * 0.4 }));   // pizzicato
    if (i % 2 === 0) jingle(t, a, i % 4 === 0 ? 0.05 : 0.022);                                       // guizos do trenó
    const n = i % 4 === 0 && bar % 32 < 16 && CANTO[b16 * 3 + i / 4];
    if (n) { tone(t, 'sine', mtof(n + 12), 1.1, 0.04, e, { attack: 0.003 }); tone(t, 'sine', mtof(n + 24), 0.5, 0.012, e, { attack: 0.002 }); tone(t, 'triangle', mtof(n), ST * 3.5, 0.02, a, { attack: 0.02, hold: true, vib: [5, 6] }); }   // celesta e flauta
    else if (bar % 32 >= 16 && i % 4 === 0 && Math.random() < 0.45) bell(t, rnd(tri) + 24, e, 0.02, 1.4, Math.random() - 0.5);   // sininhos
  }

  // bpm: andamento; steps: semicolcheias por compasso; level: volume da faixa; loops: fundo contínuo (montado uma vez).
  const TRACKS = {
    espaco: { bpm: 64, level: 1, play: espaco },
    boi: { bpm: 112, level: 1.05, play: boi },
    porto: { bpm: 74, level: 0.9, play: c => reggae(c, true), loops: tr => loopNoise('lowpass', 480, 0.22, tr.m, 0.11, 0.14) },   // ondas
    cabine: { bpm: 76, level: 1.05, play: c => reggae(c, false), loops: tr => loopNoise('lowpass', 120, 0.12, tr.m, 0.4, 0.04) },  // ronco do trem
    trem: { bpm: 104, level: 0.95, play: forro, loops: tr => loopNoise('lowpass', 130, 0.2, tr.m, 0.4, 0.08) },
    mangue: { bpm: 80, level: 1.1, play: mangue, loops: tr => loopNoise('bandpass', 1400, 0.1, tr.m, 0.23, 0.04) },             // água correndo
    escola: { bpm: 112, level: 0.95, play: escola },
    negocios: { bpm: 80, level: 0.95, play: negocios, loops: tr => {
      loopNoise('lowpass', 260, 0.06, tr.m, 0.07, 0.02);                                            // zumbido distante da cidade
      const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 4.6; lg.gain.value = 0.25; l.connect(lg).connect(tr.a.gain); l.start();   // tremolo do piano
    } },
    dunas: { bpm: 72, steps: 12, level: 1, play: dunas, loops: tr => loopNoise('bandpass', 650, 0.14, tr.m, 0.09, 0.1) },      // vento
    jogos: { bpm: 100, level: 0.85, play: jogos },
    corrida: { bpm: 150, level: 0.9, play: corrida },
    natal: { bpm: 138, steps: 12, level: 1, play: natal }
  };
  // Cada faixa tem o seu volume (que sobe e desce na troca), o seu eco no tempo dela e envia para a reverberação.
  function track(name) {
    if (live[name]) return live[name];
    const d = TRACKS[name], ST = 60 / d.bpm / 4;
    const g = ctx.createGain(), rg = ctx.createGain(); g.gain.value = 0; rg.gain.value = 0; g.connect(master); rg.connect(rev);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), dt = ctx.createBiquadFilter();
    delay.delayTime.value = Math.min(0.9, ST * 3); fb.gain.value = 0.36; dt.type = 'lowpass'; dt.frequency.value = 2400;
    delay.connect(dt).connect(fb).connect(delay); dt.connect(g);
    const sub = (toRev, toDelay) => {
      const b = ctx.createGain(); b.connect(g);
      const s = ctx.createGain(); s.gain.value = toRev; b.connect(s).connect(rg);
      if (toDelay) { const s2 = ctx.createGain(); s2.gain.value = toDelay; b.connect(s2).connect(delay); }
      return b;
    };
    const tr = live[name] = { d, ST, g, rg, m: sub(0.2), a: sub(0.7, 0.15), e: sub(0.3, 0.45), step: 0, nextT: 0, on: false, offAt: -1e9, x: {} };
    d.loops?.(tr);
    return tr;
  }
  function schedule() {
    // Fora do planeta o áudio fica ligado em silêncio, sem tocar notas (não gasta e não precisa ser religado).
    if (!master || ctx.state !== 'running' || !isOn()) return;
    const now = ctx.currentTime;
    for (const k in live) {
      const tr = live[k]; if (!tr.on && now > tr.offAt + 3) continue;                              // a faixa que saiu ainda soa enquanto desaparece
      if (tr.nextT < now) tr.nextT = now + 0.05;
      const steps = tr.d.steps || 16;
      while (tr.nextT < now + 0.15) {
        const s = tr.step;
        tr.d.play({ s, i: s % steps, bar: Math.floor(s / steps), t: tr.nextT, ST: tr.ST, m: tr.m, a: tr.a, e: tr.e, x: tr.x });
        tr.nextT += tr.ST; tr.step++;
      }
    }
  }
  // Escolhe a faixa (a corrida vence a área; fora das áreas, o universo) e cruza: a que sai desce, a que entra sobe.
  function mix() {
    if (!master) return;
    const name = race ? 'corrida' : TRACKS[zone] ? zone : 'espaco', now = ctx.currentTime;
    for (const k in live) if (k !== name && live[k].on) { const o = live[k]; o.on = false; o.offAt = now; fade(o, 0, 0.5); }
    const tr = track(name);
    if (!tr.on) { if (now > tr.offAt + 3) { tr.step = 0; tr.nextT = now + (name === 'corrida' ? 0.02 : 0.1); } tr.on = true; }
    if (name === 'corrida') { tr.x.final = race === 'final'; tr.ST = 60 / (tr.x.final ? 162 : 150) / 4; }
    fade(tr, tr.d.level * (name === 'boi' && boost ? 1.45 : 1), name === 'corrida' ? 0.2 : 0.9);
  }
  const fade = (tr, v, tc) => { ramp(tr.g.gain, v, tc); ramp(tr.rg.gain, v, tc); };
  const level = () => (duck && !race ? VOL * 0.45 : VOL);

  // Formação do planeta: ruído filtrado e duas ondas serrilhadas que sobem de tom e abrem o filtro com a barra.
  function riserStart() {
    const t = ctx.currentTime, n = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), ng = ctx.createGain(), lp = ctx.createBiquadFilter(), sg = ctx.createGain();
    n.buffer = noiseBuf; n.loop = true; bp.type = 'bandpass'; bp.Q.value = 1.4; bp.frequency.value = 300; ng.gain.value = 0;
    lp.type = 'lowpass'; lp.frequency.value = 250; lp.Q.value = 4; sg.gain.value = 0;
    const oscs = [-12, 12].map(d => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 110; o.detune.value = d; o.connect(lp); o.start(t); return o; });
    n.connect(bp).connect(ng).connect(buses.sfxRev); lp.connect(sg).connect(buses.sfx); n.start(t);
    riser = { n, bp, ng, lp, sg, oscs };
  }
  function riserSet(k) {
    const r = riser, n = ctx.currentTime, tc = 0.12;
    r.bp.frequency.setTargetAtTime(300 + 3800 * k * k, n, tc); r.ng.gain.setTargetAtTime(0.025 + 0.1 * k, n, tc);
    r.lp.frequency.setTargetAtTime(250 + 2200 * k, n, tc); r.sg.gain.setTargetAtTime(0.045 * Math.min(1, k * 4), n, tc);
    for (const o of r.oscs) o.frequency.setTargetAtTime(110 * 2 ** k, n, tc);
  }
  function riserStop(fade = 0.4) {
    const r = riser; riser = null;
    ramp(r.ng.gain, 0, fade / 3); ramp(r.sg.gain, 0, fade / 3);
    const end = ctx.currentTime + fade * 2; r.n.stop(end); for (const o of r.oscs) o.stop(end);
  }
  // Planeta pronto: uma explosãozinha sutil (sopro grave que abafa, algumas faíscas) e um acorde de sinos em cascata.
  function arrive() {
    const t = ctx.currentTime + 0.02;
    const s = ctx.createBufferSource(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; lp.type = 'lowpass'; lp.frequency.setValueAtTime(2200, t); lp.frequency.exponentialRampToValueAtTime(110, t + 1.3);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.11, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    s.connect(lp).connect(g).connect(buses.sfxRev); s.start(t); s.stop(t + 1.6);
    tone(t, 'sine', 80, 1.4, 0.16, buses.sfx, { freqEnd: 32, attack: 0.03 });
    for (let k = 0; k < 5; k++) noise(t + 0.08 + Math.random() * 0.5, 0.02, 'highpass', 4000 + Math.random() * 3000, 0.8, 0.015 + Math.random() * 0.015, buses.sfxRev);
    [69, 72, 76, 81, 84].forEach((m, k) => { const at = t + 0.12 + k * 0.07; tone(at, 'triangle', mtof(m), 2.4, 0.04, buses.sfxRev); tone(at, 'sine', mtof(m + 12), 1.6, 0.018, buses.sfxRev); });
  }

  const isOn = () => want && active && !document.hidden;
  function apply() {
    if (isOn()) {
      // O navegador só deixa tocar depois de um toque, clique ou tecla na página (rolar não conta).
      if (!ctx && !gestured && !navigator.userActivation?.hasBeenActive) return;
      ensure(); clearTimeout(sus);
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      ramp(master.gain, level(), master.gain.value < 0.05 ? 2.5 : 0.9); // do silêncio, entra bem devagar
      ramp(buses.sfx.gain, 1, 0.05);
    } else if (ctx) {
      if (master) { ramp(master.gain, 0, 0.25); ramp(buses.sfx.gain, 0, 0.1); }
      clearTimeout(sus);
      // Só pausa de verdade com o som desligado ou a aba escondida. Antes pausava também na capa, e religar sem um
      // toque era recusado pelo celular: a música só voltava desligando e ligando o som.
      if (!want || document.hidden) sus = setTimeout(() => { if (!isOn()) ctx.suspend(); }, 1600);
    }
  }
  // Efeitos dos jogos. at: atraso em segundos; arg: altura extra (o tijolo do fliperama, por exemplo).
  const SFX = {
    tap: t => tone(t, 'triangle', 1200, 0.05, 0.05, buses.sfx),
    hit: (t, a = 0) => { tone(t, 'square', mtof(76 + a), 0.08, 0.05, buses.sfx, { filter: 4000 }); tone(t, 'sine', mtof(88 + a), 0.12, 0.03, buses.sfxRev); },
    good: t => { tone(t, 'square', mtof(83), 0.07, 0.045, buses.sfx, { filter: 4500 }); tone(t + 0.07, 'square', mtof(88), 0.18, 0.05, buses.sfx, { filter: 4500 }); },
    bonus: t => [76, 79, 83, 88, 91].forEach((m, k) => tone(t + k * 0.045, 'square', mtof(m), 0.12, 0.04, buses.sfxRev, { filter: 5000 })),
    bad: t => { tone(t, 'sawtooth', 165, 0.28, 0.07, buses.sfx, { freqEnd: 98, filter: 900 }); tone(t, 'square', 82, 0.28, 0.04, buses.sfx, { filter: 500 }); },
    tick: t => tone(t, 'square', 660, 0.14, 0.05, buses.sfx, { filter: 3000 }),
    go: t => { tone(t, 'square', 1320, 0.45, 0.06, buses.sfx, { filter: 4000 }); tone(t, 'square', 660, 0.45, 0.04, buses.sfx, { filter: 2500 }); },
    boost: t => { noise(t, 0.45, 'bandpass', 1800, 1.2, 0.12, buses.sfxRev); tone(t, 'sawtooth', 220, 0.45, 0.04, buses.sfx, { freqEnd: 880, filter: 2400 }); },
    bump: t => { tone(t, 'sine', 95, 0.18, 0.2, buses.sfx, { freqEnd: 45 }); noise(t, 0.08, 'lowpass', 600, 0.8, 0.12, buses.sfx); },
    whoosh: t => noise(t, 0.3, 'bandpass', 1200, 1.5, 0.08, buses.sfxRev),
    paddle: t => tone(t, 'square', 440, 0.06, 0.05, buses.sfx, { filter: 2400 }),
    lap: t => { tone(t, 'triangle', mtof(81), 0.14, 0.07, buses.sfx); tone(t + 0.1, 'triangle', mtof(88), 0.3, 0.07, buses.sfxRev); },
    lose: t => [72, 69, 65, 60].forEach((m, k) => tone(t + k * 0.16, 'square', mtof(m), 0.2, 0.045, buses.sfx, { filter: 1800 })),
    win: t => {
      // Fanfarra curtinha: subida de arpejo, acorde final com brilho de sino e um grave.
      [72, 76, 79].forEach((m, k) => tone(t + k * 0.11, 'square', mtof(m), 0.16, 0.05, buses.sfx, { filter: 4000 }));
      [72, 76, 79, 84].forEach(m => { tone(t + 0.36, 'square', mtof(m), 1.1, 0.035, buses.sfxRev, { filter: 3500 }); tone(t + 0.36, 'triangle', mtof(m + 12), 1.4, 0.025, buses.sfxRev); });
      tone(t + 0.36, 'sine', mtof(48), 0.9, 0.12, buses.sfx);
    }
  };
  function ramp(p, v, tc) { const n = ctx.currentTime; p.cancelScheduledValues(n); p.setValueAtTime(p.value, n); p.setTargetAtTime(v, n, tc); }

  return {
    get enabled() { return want; },
    setEnabled(v) { want = v; gestured = true; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignora */ } apply(); },
    // Primeiro toque, clique ou tecla na página: já deixa o áudio montado e liberado (em silêncio até o planeta).
    // Também a cada gesto seguinte, se o navegador ainda não tiver liberado (ou tiver parado) o áudio.
    wake() {
      const first = !gestured; gestured = true;
      if (!want || document.hidden) { if (first) apply(); return; }
      makeCtx(); buildSoon();
      if (ctx.state !== 'running') ctx.resume().then(apply, () => {});
      else if (first) apply();
    },
    refresh: apply,
    // Monta o áudio (pausado e em silêncio) com a capa parada, logo depois do carregamento: o primeiro toque só libera.
    prepare() { if (want) buildSoon(); },
    setActive(v) { if (v !== active) { active = v; apply(); } },
    // Progresso da formação do planeta (0 a 1): o som sobe com a barra, bipa a cada 5% e chega com um acorde.
    setLoad(k) {
      const prev = load; load = k;
      if (!master || ctx.state !== 'running' || !isOn()) { if (riser && ctx) riserStop(0.2); return; }
      if (k > 0.001 && k < 0.999 && k >= prev) {
        if (!riser) riserStart();
        riserSet(k);
        const b = Math.floor(k * 20); if (b > Math.floor(prev * 20)) tone(ctx.currentTime, 'square', mtof(PENTA[b >> 1]), 0.09, 0.022, buses.sfx, { filter: 3000 });
      } else if (riser) { riserStop(); if (k >= 0.999 && prev < 0.999) arrive(); }
    },
    // Apresentação da área (o boi no palco): percussão mais forte e a toada sem parar.
    setBoost(v) { if (v !== boost) { boost = v; mix(); } },
    setZone(k) { k = k || null; if (k !== zone) { zone = k; mix(); } },
    // Corrida de kart: null (fora), 'run' (valendo) ou 'final' (última volta: sobe o tom e acelera).
    setRace(v) { v = v || null; if (v !== race) { race = v; mix(); if (master && isOn()) ramp(master.gain, level(), 0.3); } },
    // Toca um efeito dos jogos (só com o som ligado e o áudio já liberado pelo navegador).
    sfx(kind, arg, at = 0) { if (!master || ctx.state !== 'running' || !isOn() || !SFX[kind]) return; SFX[kind](ctx.currentTime + at, arg); },
    // Música mais baixa enquanto um minigame está rolando (a corrida tem trilha própria e não abaixa).
    setDuck(v) { if (v === duck) return; duck = v; if (master && isOn()) ramp(master.gain, level(), 0.4); },
    // Motor do kart: level de 0 (marcha lenta) a 1+ (turbo); null desliga. Dois osciladores com filtro e um leve tremor.
    engine(level) {
      if (level == null || !master || ctx.state !== 'running' || !isOn()) {
        if (motor) { const m = motor; motor = null; ramp(m.g.gain, 0, 0.08); setTimeout(() => { m.a.stop(); m.b.stop(); m.l.stop(); }, 500); }
        return;
      }
      if (!motor) {
        const a = ctx.createOscillator(), b = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
        a.type = 'sawtooth'; b.type = 'square'; b.detune.value = -1200 + 7; f.type = 'lowpass'; f.Q.value = 2; g.gain.value = 0;
        l.frequency.value = 18; lg.gain.value = 0.012; l.connect(lg).connect(g.gain);
        a.connect(f); b.connect(f); f.connect(g).connect(buses.sfx); a.start(); b.start(); l.start();
        motor = { a, b, f, g, l };
      }
      const n = ctx.currentTime, k = Math.max(0, Math.min(1.3, level));
      motor.a.frequency.setTargetAtTime(48 + k * 120, n, 0.08); motor.b.frequency.setTargetAtTime(48 + k * 120, n, 0.08);
      motor.f.frequency.setTargetAtTime(380 + k * 1500, n, 0.08); motor.g.gain.setTargetAtTime(0.03 + k * 0.025, n, 0.1);
      motor.l.frequency.setTargetAtTime(14 + k * 30, n, 0.1);
    },
    dispose() { clearInterval(timer); clearTimeout(sus); if (idleBuild) { if ('cancelIdleCallback' in window) cancelIdleCallback(idleBuild); clearTimeout(idleBuild); } ctx?.close(); ctx = null; }
  };
}
