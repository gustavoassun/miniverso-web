// Trilha do planeta, gerada por código (Web Audio), sem arquivo de áudio: uma base ambiente estilo arcade em loop
// (pad suave, baixo, arpejo de onda quadrada com eco e brilhos de sino) e a camada de algumas áreas, que entra e sai
// com suavidade quando a área abre ou fecha:
//   boi   (Centro)   matraca e zabumba no ritmo do boi; ao chamar o boi, a percussão cresce e entra uma toada;
//   porto (Porto)    ondas e, de vez em quando, a buzina de um navio;
//   trem  (Ferrovia) o "ta-dum" das rodas nas juntas dos trilhos e o ronco da locomotiva.
// Efeitos da formação do planeta: um som que sobe junto com a barra de carregamento, um bipe a cada 5% e um acorde
// de chegada com um grave quando o planeta fica pronto.
// O navegador só libera som depois de um clique, toque ou tecla (rolar não conta). Por isso a capa tem o botão
// "Entrar com som", e o primeiro gesto em qualquer lugar já prepara o áudio, para a formação soar desde o início.
// Vem ligada: começa bem baixinho quando o planeta se forma e cresce devagar. O botão desliga, e a escolha fica
// guardada no navegador. Só toca com o planeta na tela e a aba à vista.

const KEY = 'miniverso-musica';
const BPM = 84, STEP = 60 / BPM / 4, VOL = 0.95;
const mtof = m => 440 * 2 ** ((m - 69) / 12);
// Lá menor: Am9 – Fmaj7 – Cmaj7 – G6, dois compassos cada (notas MIDI).
const CHORDS = [
  { root: 45, pad: [57, 60, 64, 71], arp: [69, 72, 76, 79, 83] },
  { root: 41, pad: [53, 57, 60, 64], arp: [65, 69, 72, 76, 81] },
  { root: 48, pad: [55, 60, 64, 71], arp: [67, 71, 72, 76, 79] },
  { root: 43, pad: [55, 59, 62, 64], arp: [67, 71, 74, 76, 79] }
];
// Arpejos por trecho de 8 compassos (índice da nota do acorde; null = pausa); o terceiro trecho respira sem arpejo.
const ARPS = [
  [0, null, 2, 1, null, 3, 2, null, 4, null, 3, 2, null, 1, 2, null],
  [0, 2, 1, 3, 2, 4, 3, 1, 0, 2, 1, 3, 4, 3, 2, 1],
  null
];
const MATRACA = [1, .45, 0, .8, 1, .45, 0, .8, 1, .45, 0, .8, 1, .45, .8, .55];
// Toada do boi (lá menor pentatônica, cabe em todos os acordes): frase de dois compassos.
const PENTA = [69, 72, 74, 76, 79, 81, 84, 86, 88, 91];                                       // bipes do carregamento, subindo
const TOADA = [76, 0, 0, 74, 72, 0, 69, 0, 72, 0, 74, 0, 76, 0, 0, 0, 79, 0, 76, 0, 74, 0, 72, 0, 74, 0, 72, 69, 0, 0, 0, 0];

export function createMusic() {
  let want = true, active = false, gestured = false, zone = null, boost = false;
  try { want = localStorage.getItem(KEY) !== '0'; } catch { /* sem armazenamento: fica ligada */ }
  // No iPhone (Safari 17+), áudio "ambiente" respeita a chave de silencioso e não interrompe outra música tocando.
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* navegador sem suporte */ }
  let ctx = null, master, noiseBuf, timer = 0, sus = 0, step = 0, nextT = 0, nextHorn = 0, load = 1, riser = null;
  const buses = {}, offAt = {};

  function ensure() {
    if (ctx) return;
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    master.connect(comp).connect(ctx.destination);
    // Ruído branco reaproveitado pela percussão, pelas ondas e pelo ronco do trem.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    // Reverberação (resposta de impulso gerada) e eco no tempo da música.
    const rev = ctx.createConvolver(), ir = ctx.createBuffer(2, ctx.sampleRate * 2.6, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3; }
    rev.buffer = ir; const revOut = ctx.createGain(); revOut.gain.value = 0.55; rev.connect(revOut).connect(master);
    // Efeitos vão direto para a saída (não esperam a música subir), com reverberação própria.
    buses.sfx = ctx.createGain(); buses.sfx.gain.value = 0; buses.sfx.connect(comp);
    const sRev = ctx.createConvolver(); sRev.buffer = ir; sRev.connect(buses.sfx);
    buses.sfxRev = ctx.createGain(); buses.sfxRev.connect(buses.sfx); const sSend = ctx.createGain(); sSend.gain.value = 0.8; buses.sfxRev.connect(sSend).connect(sRev);
    const delay = ctx.createDelay(1), fb = ctx.createGain(), dTone = ctx.createBiquadFilter();
    delay.delayTime.value = STEP * 3; fb.gain.value = 0.38; dTone.type = 'lowpass'; dTone.frequency.value = 2200;
    delay.connect(dTone).connect(fb).connect(delay); dTone.connect(master);
    const bus = (dry, toRev, toDelay) => { const g = ctx.createGain(); g.gain.value = dry; g.connect(master);
      if (toRev) { const s = ctx.createGain(); s.gain.value = toRev; g.connect(s).connect(rev); }
      if (toDelay) { const s = ctx.createGain(); s.gain.value = toDelay; g.connect(s).connect(delay); }
      return g; };
    buses.base = bus(1, 0.25); buses.arp = bus(1, 0.3, 0.45); buses.bell = bus(1, 0.7, 0.35); buses.lead = bus(1, 0.35, 0.3);
    // Pad passa por um filtro que abre e fecha devagar.
    buses.padF = ctx.createBiquadFilter(); buses.padF.type = 'lowpass'; buses.padF.frequency.value = 900;
    const lfo = ctx.createOscillator(), lfoG = ctx.createGain(); lfo.frequency.value = 0.05; lfoG.gain.value = 350;
    lfo.connect(lfoG).connect(buses.padF.frequency); lfo.start();
    buses.padF.connect(bus(1, 0.6));
    for (const k of ['boi', 'porto', 'trem']) { buses[k] = bus(0, 0.2); offAt[k] = -1e9; }
    // Fundo contínuo das áreas: ondas do Porto (sobem e descem) e ronco grave do trem.
    loopNoise('lowpass', 520, 0.55, buses.porto, 0.11, 0.35);
    loopNoise('lowpass', 130, 0.5, buses.trem, 0.4, 0.15);
    timer = setInterval(schedule, 25);
    mixZone();
  }
  function loopNoise(type, freq, gain, out, lfoHz, depth) {
    const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = gain;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = lfoHz; lg.gain.value = depth; l.connect(lg).connect(g.gain); l.start();
    s.connect(f).connect(g).connect(out); s.start();
  }
  function tone(t, type, freq, dur, gain, out, { attack = 0.006, freqEnd, filter, detune = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let n = o; if (filter) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = filter; o.connect(f); n = f; }
    n.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(t, dur, type, freq, q, gain, out) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
  }
  function pad(t, notes, dur) {
    for (const m of notes) for (const det of [-8, 8]) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 1.8); g.gain.setValueAtTime(0.018, t + dur - 0.3); g.gain.linearRampToValueAtTime(0, t + dur + 1.4);
      o.connect(g).connect(buses.padF); o.start(t); o.stop(t + dur + 1.5);
    }
  }
  function horn(t) {
    for (const [f, d] of [[73.4, -6], [92.5, 6]]) {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = d; lp.type = 'lowpass'; lp.frequency.value = 420;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09, t + 0.35); g.gain.setValueAtTime(0.09, t + 2.1); g.gain.linearRampToValueAtTime(0, t + 3);
      o.connect(lp).connect(g).connect(buses.porto); o.start(t); o.stop(t + 3.1);
    }
  }

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

  const playing = k => k === zone || ctx.currentTime < offAt[k] + 2.5;   // a camada ainda soa enquanto desaparece
  function schedule() {
    if (!ctx || ctx.state !== 'running') return;
    if (nextT < ctx.currentTime) nextT = ctx.currentTime + 0.05;
    while (nextT < ctx.currentTime + 0.15) { playStep(step, nextT); nextT += STEP; step++; }
  }
  function playStep(s, t) {
    const bar = Math.floor(s / 16), i = s % 16, ch = CHORDS[Math.floor(bar / 2) % CHORDS.length];
    if (i === 0 && bar % 2 === 0) pad(t, ch.pad, STEP * 32);
    if (i === 0 || i === 6 || i === 10) tone(t, 'triangle', mtof(ch.root + (i === 10 ? 12 : 0)), STEP * 3.5, 0.13, buses.base, { attack: 0.01 });
    const arp = bar >= 2 ? ARPS[Math.floor(bar / 8) % ARPS.length] : null, a = arp?.[i];
    if (a != null) tone(t, 'square', mtof(ch.arp[a]), STEP * 1.7, 0.02, buses.arp, { filter: 2600 });
    if (i % 4 === 2 && Math.random() < 0.2) tone(t, 'sine', mtof(ch.arp[(Math.random() * 5) | 0] + 12), 1.8, 0.03, buses.bell, { attack: 0.008 });
    if (bar >= 4 && i % 4 === 2) noise(t, 0.035, 'highpass', 7500, 0.7, 0.012, buses.base);                    // chiadinho no contratempo
    if (playing('boi')) {
      const n = boost && TOADA[s % 32];
      if (n) { tone(t, 'square', mtof(n), STEP * 2.4, 0.03, buses.lead, { filter: 3200 }); tone(t, 'triangle', mtof(n - 12), STEP * 2.4, 0.06, buses.lead); }
      if (boost && (i === 3 || i === 11)) tone(t, 'sine', 110, 0.3, 0.3, buses.boi, { freqEnd: 45 });                     // zabumba dobrada na apresentação
      if (MATRACA[i]) noise(t, 0.03, 'bandpass', 2300 + Math.random() * 500, 3, 0.14 * MATRACA[i], buses.boi);
      if (i === 0 || i === 7 || i === 10 || (i === 13 && bar % 2)) tone(t, 'sine', 140, 0.34, 0.32, buses.boi, { freqEnd: 48 });
      if (i === 4 || i === 12) noise(t, 0.09, 'bandpass', 850, 1.3, 0.09, buses.boi);
    }
    if (playing('trem')) {
      if (i === 0 || i === 2 || i === 8 || i === 10) { tone(t, 'sine', 78, 0.14, 0.26, buses.trem, { freqEnd: 44 }); noise(t, 0.05, 'lowpass', 500, 0.7, 0.1, buses.trem); }
      if (i % 4 === 2) noise(t, 0.06, 'highpass', 3200, 0.7, 0.03, buses.trem);
    }
    if (playing('porto') && t >= nextHorn) { if (zone === 'porto') horn(t); nextHorn = t + 22 + Math.random() * 10; }
  }

  const isOn = () => want && active && !document.hidden;
  function apply() {
    if (isOn()) {
      // O navegador só deixa tocar depois de um toque, clique ou tecla na página (rolar não conta).
      if (!ctx && !gestured && !navigator.userActivation?.hasBeenActive) return;
      ensure(); clearTimeout(sus);
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      ramp(master.gain, VOL, master.gain.value < 0.05 ? 2.5 : 0.9);                // do silêncio, entra bem devagar
      ramp(buses.sfx.gain, 1, 0.05);
    } else if (ctx) {
      ramp(master.gain, 0, 0.25); ramp(buses.sfx.gain, 0, 0.1); clearTimeout(sus);
      sus = setTimeout(() => { if (!isOn()) ctx.suspend(); }, 1600);
    }
  }
  // Camada da área aberta sobe; a base abaixa um pouco para dar espaço.
  function mixZone() {
    if (!ctx) return;
    const show = boost && zone === 'boi';
    for (const z of ['boi', 'porto', 'trem']) ramp(buses[z].gain, z === zone ? (show ? 1.8 : 1.3) : 0, 0.7);
    ramp(buses.base.gain, show ? 0.6 : zone ? 0.8 : 1, 1); ramp(buses.arp.gain, show ? 0.3 : zone ? 0.75 : 1, 1);
  }
  function ramp(p, v, tc) { const n = ctx.currentTime; p.cancelScheduledValues(n); p.setValueAtTime(p.value, n); p.setTargetAtTime(v, n, tc); }

  return {
    get enabled() { return want; },
    setEnabled(v) { want = v; gestured = true; try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignora */ } apply(); },
    // Primeiro toque, clique ou tecla na página: já deixa o áudio montado e liberado (em silêncio até o planeta).
    wake() { if (gestured) return; gestured = true; if (want) { ensure(); ctx.resume().catch(() => {}); } apply(); },
    refresh: apply,
    setActive(v) { if (v !== active) { active = v; apply(); } },
    // Progresso da formação do planeta (0 a 1): o som sobe com a barra, bipa a cada 5% e chega com um acorde.
    setLoad(k) {
      const prev = load; load = k;
      if (!ctx || ctx.state !== 'running' || !isOn()) { if (riser && ctx) riserStop(0.2); return; }
      if (k > 0.001 && k < 0.999 && k >= prev) {
        if (!riser) riserStart();
        riserSet(k);
        const b = Math.floor(k * 20); if (b > Math.floor(prev * 20)) tone(ctx.currentTime, 'square', mtof(PENTA[b >> 1]), 0.09, 0.022, buses.sfx, { filter: 3000 });
      } else if (riser) { riserStop(); if (k >= 0.999 && prev < 0.999) arrive(); }
    },
    // Apresentação da área (o boi no palco): percussão mais forte e a toada por cima.
    setBoost(v) { if (v !== boost) { boost = v; mixZone(); } },
    setZone(k) {
      k = k || null; if (k === zone) return;
      if (ctx) { if (zone) offAt[zone] = ctx.currentTime; if (k === 'porto') nextHorn = ctx.currentTime + 2.5; }
      zone = k; mixZone();
    },
    dispose() { clearInterval(timer); clearTimeout(sus); ctx?.close(); ctx = null; }
  };
}
