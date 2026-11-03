import * as THREE from 'three';
import { R } from './core/math.js';
import { sag } from './world/build.js';
import { worldCamera } from './world/stage.js';
import { rt, toys } from './world/runtime.js';
import { createArcade } from './arcade.js';
import { arcade, BINS, game, race, recy, track, trackAt, whack } from './world/zones/jogos.js';

// Minigames da área Jogos (Reciclaverso, blocos, corrida de kart e fliperama) e os cliques nos brinquedos do planeta.
// st() devolve o estado atual do motor (movimento reduzido, área aberta, mundo ativo, cabine).
// compact(v): deixa a barra da área compacta durante a corrida e o fliperama. view(p): leva a câmera até um ponto da
// área ({ at, yaw, pitch, d }, como os pontos de interesse; null volta à visão geral). sound: a trilha (music.js),
// que também toca os efeitos de cada jogo.
export function createGames({ $, on, ray, pointer, zoneStatus, st, compact, view, sound }) {
  // Minigames: placar no topo da tela, com dica de como jogar. Usam o relógio real (funcionam com movimento reduzido).
  const hud = $('.game-hud'), hudTitle = hud.querySelector('.gh-title'), hudScore = hud.querySelector('.gh-score'), hudHint = hud.querySelector('.gh-hint'), hudBtn = hud.querySelector('.gh-btn');
  const hudBins = hud.querySelector('.gh-bins'), hudBar = hud.querySelector('.gh-bar'), hudFill = hudBar.querySelector('i'), pad = $('.race-pad');
  function showHud(title, hint, btn) { hud.hidden = false; hud.classList.remove('corner'); hudBins.hidden = true; hudBar.hidden = true; hudTitle.textContent = title; hudHint.textContent = hint; hudScore.textContent = ''; hudBtn.hidden = !btn; if (btn) hudBtn.textContent = btn; }
  const nowS = () => performance.now() / 1000;
  const fmt = v => v.toFixed(1).replace('.', ',');
  const sfx = (k, a, at) => sound?.sfx(k, a, at);
  // Resposta tátil (celulares com vibração; nos outros não faz nada).
  const buzz = p => { try { navigator.vibrate?.(p); } catch { /* sem vibração */ } };
  // Cartão "Como jogar": antes de cada jogo, ícones e teclas desenhadas com poucas palavras. Jogar (ou Enter/espaço)
  // começa; o × desiste. Em telas de toque, mostra os gestos no lugar das teclas.
  const how = $('.how'), howIcon = how.querySelector('.how-icon'), howTitle = how.querySelector('.how-title'), howSteps = how.querySelector('.how-steps'), howGo = how.querySelector('.how-go');
  const touch = matchMedia('(hover: none)').matches;
  const kb = (...k) => k.map(x => `<kbd>${x}</kbd>`).join('');
  const sq = c => `<i class="sq" style="--q: ${c}"></i>`;
  const HOW = {
    recy: { icon: '♻️', title: 'Reciclaverso', steps: [['🍌🥫🧴', 'O lixo aparece na sua frente'], [BINS.map(([, c]) => sq(c)).join(''), touch ? 'Toque na lixeira certa' : `Clique na lixeira certa ou ${kb('1')}…${kb('5')}`], ['⏱️', 'Antes de a barra de tempo acabar'], ['⭐', 'Acertos seguidos valem mais']] },
    whack: { icon: '🟪', title: 'Acerte os blocos', steps: [['👆', 'Acerte os blocos que saltam'], [sq('#ffd23f'), 'Dourado: +3'], [sq('#ff3b3b'), 'Vermelho: −2'], ['⚡', 'Relâmpago: +3 segundos']] },
    race: { icon: '🏁', title: 'Corrida de kart', steps: touch
      ? [['◀ ▶', 'Segure os botões para virar'], ['✋', 'Botão do meio freia'], ['»»', 'Setas azuis dão turbo'], ['🏆', '3 voltas: chegue em 1º']]
      : [[kb('←', '→'), 'Virar'], [kb('↓'), 'Frear'], ['»»', 'Setas azuis dão turbo'], ['🏆', '3 voltas: chegue em 1º']] },
    arcade: { icon: '🕹️', title: 'Quebra-pixel', steps: touch
      ? [['👆', 'Arraste para mover a raquete'], ['👆', 'Toque para lançar a bola'], [sq('#ffd23f'), 'Bloco dourado alarga a raquete'], ['❤️', '3 vidas']]
      : [[`${kb('←', '→')} 🖱️`, 'Mova a raquete'], [kb('Espaço'), 'Lance a bola'], [sq('#ffd23f'), 'Bloco dourado alarga a raquete'], ['❤️', '3 vidas']] }
  };
  let howNext = null;
  function intro(kind, go) {
    const c = HOW[kind];
    howIcon.textContent = c.icon; howTitle.textContent = c.title;
    howSteps.replaceChildren(...c.steps.map(([ico, text]) => {
      const li = document.createElement('li'), i = document.createElement('span'), t = document.createElement('span');
      i.className = 'how-ico'; i.innerHTML = ico; t.innerHTML = text; li.append(i, t); return li;
    }));
    hud.hidden = true; how.hidden = false; howNext = go; compact(true); sfx('tap');
  }
  function closeHow() { how.hidden = true; howNext = null; }
  on(howGo, 'click', () => { const go = howNext; closeHow(); go?.(); });
  on(how.querySelector('.how-x'), 'click', () => stopGame());
  on(window, 'keydown', e => { if (how.hidden) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); howGo.click(); } });
  // Cada jogo leva a câmera até onde ele acontece.
  const VIEWS = { recy: { at: [0, 0.07, -0.19], yaw: 0, pitch: 0.55, d: 0.56 }, whack: { at: [0.19, 0.03, 0.05], yaw: 0, pitch: 0.95, d: 0.62 } };
  function stopGame() {
    closeHow(); stopRecycle(); stopWhack();
    if (arc.on) arc.close(true);
    compact(false); zoneStatus.textContent = '';
    if (race.state !== 'off') endRace();
    hud.hidden = true;
  }

  // 1) Reciclaverso, o show: a cada rodada um item sobe no pedestal, grande e girando, e você escolhe a lixeira certa
  // (clicando nela, nos botões coloridos do placar ou nas teclas 1 a 5) antes de o anel de luzes apagar. Responder
  // rápido vale mais e acertos em sequência rendem bônus; no erro ou no fim do tempo, o item vai para a lixeira certa
  // e aparece a explicação.
  const ROUNDS = 12, SHOW = 0.28, FLY = 0.45, GAP = 0.35;
  const rc = { on: false, score: 0, combo: 0, ok: 0, bad: 0, best: 0, round: 0, cur: null, last: null, t0: 0, dur: 0, next: 0, fly: null, flash: '', flashAt: 0 };
  const binOf = k => BINS[k][0];
  const timerC = new THREE.Color();
  function stopRecycle() {
    rc.on = false; rc.eye = false; rc.cur = null; rc.fly = null; hudBins.hidden = true; hudBar.hidden = true;
    for (const it of recy.items) it.mesh.visible = false;
    if (recy.timer) recy.timer.count = 0;
  }
  function startRecycle() { stopGame(); view(VIEWS.recy); rc.eye = true; intro('recy', beginRecycle); }
  function beginRecycle() {
    Object.assign(rc, { on: true, score: 0, combo: 0, ok: 0, bad: 0, round: 0, cur: null, fly: null, next: nowS() + 0.7, flash: '' });
    showHud('Reciclaverso', ''); hud.classList.add('corner');
    hudBins.hidden = false; hudBar.hidden = false; sfx('go');
    zoneStatus.textContent = `${ROUNDS} rodadas. Valendo!`;
  }
  function nextItem(n) {
    const pool = recy.items.filter(it => it !== rc.last && it !== rc.fly?.it);
    const it = pool[Math.floor(R() * pool.length)];
    rc.round++; rc.cur = it; rc.last = it; rc.t0 = n; rc.dur = 7 - (rc.round - 1) / (ROUNDS - 1) * 3.5; rc.beep = 0;
    it.mesh.visible = true; it.mesh.position.set(recy.stand.x, recy.stand.y, recy.stand.z); it.mesh.scale.setScalar(0.01);
    sfx('whoosh');
  }
  function sendTo(it, k, n) {
    const bin = recy.bins[k];
    rc.fly = { it, t0: n, from: it.mesh.position.clone(), to: new THREE.Vector3(bin.x, bin.y + 0.004, bin.z), s: it.mesh.scale.x };
    recy.lidT[k] = rt.clock; rc.cur = null; rc.next = n + FLY + GAP;
  }
  function recyLoop(n) {
    if (!rc.on) return;
    if (!rc.cur && !rc.fly && n >= rc.next) { if (rc.round >= ROUNDS) return endRecycle(); nextItem(n); }
    // Item da vez: sobe crescendo e gira no pedestal; o anel de luzes vai apagando (verde, amarelo, vermelho).
    if (rc.cur) {
      const m = rc.cur.mesh, age = n - rc.t0, left = Math.max(0, 1 - age / rc.dur), grow = Math.min(1, age / SHOW);
      m.scale.setScalar(0.95 * (1 - (1 - grow) ** 3)); m.rotation.set(0.25, age * 1.4, 0);
      m.position.y = recy.stand.y + Math.sin(age * 3) * 0.0015;
      recy.timer.count = Math.ceil(left * 24);
      const col = left > 0.5 ? '#3dff8f' : left > 0.25 ? '#ffd23f' : '#ff3b3b';
      recy.timer.material.color.copy(timerC.set(col));
      hudFill.style.transform = `scaleX(${left.toFixed(3)})`; hudFill.style.background = col;
      const sec = Math.ceil(rc.dur - age); if (sec <= 2 && sec !== rc.beep) { rc.beep = sec; sfx('tick'); buzz(10); }
      if (left <= 0) {
        rc.bad++; rc.combo = 0; tell(`O tempo acabou! ${rc.cur.icon} ${rc.cur.name} vai no ${binOf(rc.cur.bin)}.`, n);
        sfx('bad'); buzz([30, 40, 30]); sendTo(rc.cur, rc.cur.bin, n);
      }
    } else { recy.timer.count = 0; hudFill.style.transform = 'scaleX(0)'; }
    // Item voando em arco para a lixeira, encolhendo; a tampa abre quando ele entra.
    if (rc.fly) {
      const f = rc.fly, u = Math.min(1, (n - f.t0) / FLY), m = f.it.mesh;
      m.position.lerpVectors(f.from, f.to, u); m.position.y += Math.sin(Math.PI * u) * 0.05; m.rotation.x += 0.25; m.scale.setScalar(f.s * (1 - u * 0.75));
      if (u >= 1) { m.visible = false; rc.fly = null; }
    }
    hudScore.textContent = `Rodada ${Math.max(1, rc.round)}/${ROUNDS} · ${rc.score} pts`;
    hudHint.textContent = rc.flash && n - rc.flashAt < 1.8 ? rc.flash : '';
  }
  function tell(t, n) { rc.flash = t; rc.flashAt = n; }
  function sortInto(k) {
    if (!rc.on || !rc.cur) return;
    const n = nowS(), it = rc.cur, left = Math.max(0, 1 - (n - rc.t0) / rc.dur);
    if (it.bin === k) {
      rc.ok++; rc.combo++; const pts = 10 + Math.round(left * 10) + Math.min(5, rc.combo - 1) * 2; rc.score += pts;
      tell(rc.combo >= 3 ? `Certo! +${pts} · ${rc.combo} seguidas!` : `Certo! +${pts}`, n);
      sfx(rc.combo >= 3 ? 'bonus' : 'good'); buzz(15);
    } else {
      rc.bad++; rc.combo = 0;
      tell(`Ops! ${it.icon} ${it.name} vai no ${binOf(it.bin)}, não no ${binOf(k)}.`, n);
      sfx('bad'); buzz([40, 30, 40]);
    }
    sendTo(it, it.bin, n);
  }
  function endRecycle() {
    const win = rc.ok >= 9;
    stopRecycle(); compact(false); rc.best = Math.max(rc.best, rc.score);
    hudScore.textContent = `${rc.ok}/${ROUNDS} certos · ${rc.score} pts`;
    hudHint.textContent = (rc.ok === ROUNDS ? 'Perfeito! Reciclador de primeira!' : win ? 'Muito bem, o planeta agradece!' : 'Dá para reciclar melhor! Tente de novo.') + ` Recorde: ${rc.best} pts`;
    zoneStatus.textContent = 'Toque de novo em Reciclaverso para jogar outra vez.';
    if (win) { recy.party.userData.at = rt.clock; sfx('win'); buzz([30, 60, 30, 60, 80]); } else sfx('lose');
  }
  [...hudBins.querySelectorAll('[data-bin]')].forEach(b => on(b, 'click', () => sortInto(Number(b.dataset.bin))));
  on(window, 'keydown', e => { if (!rc.on) return; const k = Number(e.key); if (k >= 1 && k <= 5) { sortInto(k - 1); e.preventDefault(); } });
  // Lixeira sob o cursor: a tampa dela se levanta um pouco (recy.hover), mostrando onde o item vai cair.
  function hitBin() {
    if (st().focusZone !== game.zi || !rc.on) return (recy.hover = -1);
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(recy.bins.map(b => b.hit), false)[0];
    return (recy.hover = hit ? hit.object.userData.bin : -1);
  }

  // 2) Acerte os blocos: 30 s, começando devagar e acelerando aos poucos; dourado vale +3, vermelho tira 2, o relâmpago dá +3 s.
  const WHACK_TIME = 30, WHACK_HINT = 'Dourado +3 · Vermelho −2 · Relâmpago +3 s';
  const KIND_COLOR = { gold: '#ffd23f', red: '#ff3b3b', time: '#7fe9ff' };
  const ledDark = new THREE.Color('#0b0618'), ledC = new THREE.Color(), flashC = new THREE.Color();
  function stopWhack() { whack.on = false; for (const c of whack.pads) { c.userData.up = -1; c.visible = false; } }
  function startWhack() { stopGame(); view(VIEWS.whack); intro('whack', beginWhack); }
  function beginWhack() {
    whack.on = true; whack.score = 0; whack.t0 = nowS(); whack.end = nowS() + WHACK_TIME; whack.next = nowS() + 0.6; whack.lastTxt = 0; whack.flash = '';
    showHud('Acerte os blocos', WHACK_HINT); hud.classList.add('corner'); zoneStatus.textContent = `Valendo! ${WHACK_TIME} segundos.`; sfx('go');
  }
  // Piso de LED: o buraco acende na cor do bloco que saiu dele e pisca forte quando você acerta.
  function leds(n) {
    const L = whack.leds; if (!L) return;
    let live = false;
    whack.pads.forEach((c, i) => {
      const age = n - whack.ledT[i], up = c.userData.up >= 0;
      ledC.copy(ledDark); if (up) ledC.lerp(flashC.set(c.material.color), 0.35);
      if (age < 0.6) { ledC.lerp(flashC.set(whack.ledHit[i] || '#ffffff'), 1 - age / 0.6); live = true; }
      L.setColorAt(i, ledC); if (up) live = true;
    });
    if (live || whack.ledLive) L.instanceColor.needsUpdate = true; whack.ledLive = live;
  }
  whack.ledHit = [];
  function whackLoop(n) {
    if (!whack.on) { if (whack.ledLive) leds(n); return; }
    // Ritmo: começa devagar (blocos ficam ~2 s de pé e saem um por vez) e acelera aos poucos até o fim.
    const pace = Math.min(1, (n - whack.t0) / WHACK_TIME) ** 1.6;
    if (n >= whack.next) {
      const idle = whack.pads.filter(c => c.userData.up < 0);
      if (idle.length) {
        const c = idle[Math.floor(R() * idle.length)], r = R(), kind = r < 0.12 ? 'gold' : r < 0.28 ? 'red' : r < 0.33 ? 'time' : 'ok', col = KIND_COLOR[kind] || c.userData.base;
        Object.assign(c.userData, { up: n, dur: 2 - pace * 1.25 + R() * 0.3, kind }); c.material.color.set(col); c.material.emissive.set(col);
      }
      whack.next = n + 1.25 - pace * 0.9 + R() * 0.25;
    }
    for (const c of whack.pads) {
      const u = c.userData; if (u.up < 0) { c.visible = false; continue; }
      const age = n - u.up; if (age > u.dur) { u.up = -1; c.visible = false; continue; }
      const k = Math.min(1, age / 0.12, (u.dur - age) / 0.12);
      c.visible = true; c.position.y = u.y - 0.012 + k * 0.03; c.rotation.y = age * 4;
    }
    leds(n);
    if (n - whack.lastTxt > 0.1) { hudScore.textContent = `${whack.score} pts · ${Math.max(0, Math.ceil(whack.end - n))} s`; hudHint.textContent = whack.flash && n - whack.flashAt < 0.7 ? whack.flash : WHACK_HINT; whack.lastTxt = n; }
    if (n >= whack.end) {
      stopWhack(); compact(false); whack.best = Math.max(whack.best, whack.score);
      const win = whack.score >= 18;
      hudScore.textContent = `${whack.score} pts`; hudHint.textContent = (win ? 'Mandou muito bem!' : 'Boa! Dá para fazer mais.') + ` Recorde: ${whack.best} pts`;
      zoneStatus.textContent = 'Toque de novo em Acerte os blocos para jogar outra vez.';
      if (win) { game.party.userData.at = rt.clock; sfx('win'); buzz([30, 60, 30, 60, 80]); } else sfx('lose');
    }
  }
  function hitWhack() {
    if (st().focusZone !== game.zi || !whack.on) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(whack.pads.filter(c => c.userData.up >= 0), true)[0];
    return hit ? hit.object.userData.whack || hit.object : null;
  }
  function smack(c) {
    const kind = c.userData.kind, d = kind === 'gold' ? 3 : kind === 'red' ? -2 : 1, i = whack.pads.indexOf(c);
    c.userData.up = -1; c.visible = false; whack.score = Math.max(0, whack.score + d);
    if (kind === 'time') whack.end += 3;
    whack.flash = kind === 'time' ? '+3 segundos! Relâmpago!' : d > 1 ? '+3! Bloco dourado!' : d < 0 ? '−2… era vermelho!' : '+1'; whack.flashAt = nowS(); whack.lastTxt = 0;
    whack.ledT[i] = nowS(); whack.ledHit[i] = d < 0 ? '#ff3b3b' : kind === 'gold' ? '#ffd23f' : '#ffffff';
    if (d > 0) { whack.pop.position.copy(c.position); whack.pop.userData.at = rt.clock; }
    if (d < 0) { sfx('bad'); buzz([40, 30, 40]); } else if (d > 1 || kind === 'time') { sfx('bonus'); buzz(25); } else { sfx('hit', (whack.score % 5) * 2); buzz(12); }
  }

  // 3) Corrida de kart: você pilota o kart amarelo contra três rivais, 3 voltas. O kart acelera sozinho;
  // ← → (ou A/D, ou os botões na tela) viram e ↓ freia. Sem tocar em nada, ele se alinha sozinho com a pista; as
  // zebras seguram o kart dentro da pista, mas em cima delas ele anda devagar e a mureta freia; as setas azuis dão turbo.
  const LAPS = 3, VMAX = 0.27, ACC = 0.24, BRAKE = 0.7, KERB = 0.15, EDGE = track.W + 0.004, ON_KERB = track.W - 0.008;
  const input = { l: false, r: false, b: false };
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowDown: 'b', s: 'b', S: 'b' };
  const racing = () => race.state === 'count' || race.state === 'run';
  on(window, 'keydown', e => { const k = KEYS[e.key]; if (!k || !racing()) return; input[k] = true; e.preventDefault(); });
  on(window, 'keyup', e => { const k = KEYS[e.key]; if (k) input[k] = false; });
  on(window, 'blur', () => { input.l = input.r = input.b = false; });
  for (const b of pad.querySelectorAll('[data-k]')) {
    const k = b.dataset.k, set = v => e => { input[k] = v; e.preventDefault(); if (v) buzz(8); };
    on(b, 'pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) on(b, ev, set(false));
    on(b, 'contextmenu', e => e.preventDefault());
  }
  const pt = { x: 0, z: 0, h: 0 };
  let me = null, ais = [], best = null, boardKey = '', lights = -1;
  function setLights(red, green) {
    const L = race.lights; for (let k = 0; k < 5; k++) L.setColorAt(k, ledC.set(green ? '#3dff7a' : k < red ? '#ff2a2a' : '#3a1414'));
    L.instanceColor.needsUpdate = true;
  }
  function startRace() {
    stopGame();
    const K = race.karts;
    // Grid: você larga na segunda fila, à esquerda.
    trackAt(-0.085, -0.013, pt);
    me = { k: K[0], x: pt.x, z: pt.z, h: pt.h, v: 0, st: 0, prog: -0.085, lane: -0.013, lat: -0.013, i: Math.round((track.L - 0.085) / track.ds) % track.N, lap: 0, lapAt: 0, fin: 0, boost: 0, hitAt: -9 };
    ais = [[K[1], -0.035, -0.013, 0.86], [K[2], -0.035, 0.013, 0.8], [K[3], -0.085, 0.013, 0.83]].map(([k, prog, lane, skill]) => ({ k, prog, lane, laneT: lane, skill, v: 0, fin: 0 }));
    for (const a of [me, ...ais]) { trackAt(a.prog, a.lane, pt); a.k.place(pt.x, pt.z, pt.h); }
    Object.assign(race, { state: 'grid', last: nowS(), order: 0 }); setLights(0, false); lights = 0;
    input.l = input.r = input.b = false; compact(true); boardKey = '';
    zoneStatus.textContent = `Você é o kart amarelo. ${LAPS} voltas contra Rosa, Azul e Verde.`;
    intro('race', goRace);
  }
  function goRace() {
    Object.assign(race, { state: 'count', t0: nowS(), last: nowS() });
    showHud('Corrida de kart', 'Olho no semáforo…');
    hud.classList.add('corner'); pad.hidden = false;
  }
  function endRace() {
    race.state = 'off'; pad.hidden = true; compact(false); sound?.engine(null);
    for (const a of [me, ...ais]) if (a) a.k.s = ((a.prog % track.L) + track.L) % track.L;
    setLights(0, false);
  }
  const standings = () => [me, ...ais].map(a => ({ a, key: a.fin ? 1e6 - a.fin : a.prog })).sort((p, q) => q.key - p.key).map(p => p.a);
  function board(title) {
    const rows = standings().map(a => [a.k.name, a.k.color, a === me && best ? `${fmt(best)} s` : '']);
    const key = title + rows.map(r => r[0]).join();
    if (key !== boardKey) { boardKey = key; race.board(title, rows); }
  }
  function nearestFrom(i0, x, z) {
    let best = i0, bd = 9;
    for (let d = -18; d <= 18; d++) { const i = (i0 + d + track.N) % track.N, dd = (track.X[i] - x) ** 2 + (track.Z[i] - z) ** 2; if (dd < bd) { bd = dd; best = i; } }
    return best;
  }
  const wrapA = a => Math.atan2(Math.sin(a), Math.cos(a));
  // Seu kart: direção suave, alinhamento automático com a pista quando você solta o volante, zebras que seguram
  // (a batida tira velocidade e endireita o kart) e turbo nas setas azuis.
  function pilot(dt, n) {
    const { X, Z, TX, TZ, N, L, ds } = track;
    const steer = (input.r ? 1 : 0) - (input.l ? 1 : 0); me.st += (steer - me.st) * Math.min(1, dt * 7);
    const kerb = Math.abs(me.lat) > ON_KERB, top = (kerb ? KERB : VMAX) + me.boost;
    if (input.b) me.v = Math.max(0, me.v - BRAKE * dt);
    else if (me.v < top) me.v = Math.min(top, me.v + ACC * dt); else me.v = Math.max(top, me.v - (kerb ? 0.5 : 0.25) * dt);
    me.boost = Math.max(0, me.boost - dt * 0.12);
    const ahead = (me.i + 4) % N, tan = Math.atan2(TZ[ahead], TX[ahead]), err = wrapA(tan - me.h);
    me.h += me.st * 2.5 * (1 - 0.3 * Math.min(1, me.v / VMAX)) * Math.min(1, me.v / 0.05) * dt;
    if (Math.abs(steer) < 0.5) me.h += err * Math.min(1, dt * 1.6);                       // solta o volante: alinha com a pista
    me.x += Math.cos(me.h) * me.v * dt; me.z += Math.sin(me.h) * me.v * dt;
    const i = nearestFrom(me.i, me.x, me.z), nx = -TZ[i], nz = TX[i];
    me.lat = (me.x - X[i]) * nx + (me.z - Z[i]) * nz;
    if (Math.abs(me.lat) > EDGE) {
      const push = me.lat - Math.sign(me.lat) * EDGE; me.x -= nx * push; me.z -= nz * push; me.lat -= push;
      me.h += wrapA(Math.atan2(TZ[i], TX[i]) - me.h) * 0.5;
      if (n - me.hitAt > 0.35) { me.hitAt = n; me.v *= 0.6; sfx('bump'); buzz(25); }
    }
    let dsI = i - me.i; if (dsI > N / 2) dsI -= N; if (dsI < -N / 2) dsI += N; me.prog += dsI * ds; me.i = i;
    const s = ((me.prog % L) + L) % L;
    for (const p of track.pads) if (s > p.s0 && s < p.s1 && Math.abs(me.lat - p.lat) < 0.014 && me.boost < 0.06) { me.boost = 0.1; me.v = Math.max(me.v, VMAX + 0.08); sfx('boost'); buzz(35); }
  }
  function drive(dt, n) {
    const { N, L, ds } = track;
    // Depois da chegada o seu kart segue a pista sozinho, desacelerando.
    if (race.state === 'done') { me.prog += me.v * dt; trackAt(me.prog, me.lat ?? 0, pt); me.x = pt.x; me.z = pt.z; me.h = pt.h; } else pilot(dt, n);
    // Rivais: seguem a linha deles, freiam antes das curvas, aliviam quando abrem vantagem e apertam se você abre.
    // Antes de encostar em alguém na mesma faixa, trocam de faixa para ultrapassar ou seguram atrás.
    const lanePos = a => (a === me ? me.lat : a.lane);
    for (const a of ais) {
      const ai = Math.floor((((a.prog % L) + L) % L) / ds);
      let lim = 1; for (let k = 0; k < 12; k += 2) lim = Math.min(lim, track.VL[(ai + k) % N]);
      const gap = Math.max(-0.3, Math.min(0.3, (me.prog - a.prog) / L)), rubber = 1 + gap * (gap < 0 ? 0.5 : 0.25);
      let target = lim * a.skill * (a.fin ? 0.6 : rubber);
      for (const o of [me, ...ais]) {
        if (o === a) continue;
        const ahead = o.prog - a.prog;
        if (ahead <= 0 || ahead > 0.045 || Math.abs(lanePos(o) - a.lane) > 0.016) continue;
        const other = -Math.sign(lanePos(o) || a.lane) * 0.013;
        const free = [me, ...ais].every(q => q === a || q === o || Math.abs(q.prog - a.prog) > 0.04 || Math.abs(lanePos(q) - other) > 0.016);
        if (free) a.laneT = other; else target = Math.min(target, (o === me ? me.v : o.v) * 0.97);
      }
      a.lane += Math.max(-0.03 * dt, Math.min(0.03 * dt, a.laneT - a.lane));
      a.v = target > a.v ? Math.min(target, a.v + ACC * dt) : Math.max(target, a.v - 0.6 * dt);
      a.prog += a.v * dt;
      const ai2 = Math.floor((((a.prog % L) + L) % L) / ds) % N;
      trackAt(a.prog, a.lane, pt); a.x = pt.x; a.z = pt.z; a.k.place(pt.x, pt.z, pt.h, Math.max(-0.2, Math.min(0.2, track.K[ai2] * a.v * 0.05)));
      // Encostou no rival: os dois se afastam um pouco e você perde velocidade.
      const dx = me.x - a.x, dz = me.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.019 && d > 1e-5) { const k = (0.019 - d) / d; me.x += dx * k; me.z += dz * k; me.v *= 0.9; if (n - me.hitAt > 0.35) { me.hitAt = n; sfx('bump'); buzz(20); } }
      if (!a.fin && a.prog >= LAPS * L) a.fin = ++race.order;
    }
    me.k.place(me.x, me.z, me.h, Math.max(-0.22, Math.min(0.22, me.st * me.v * 0.8)));
    // Voltas: tempo de cada uma e melhor volta.
    const lap = Math.floor(me.prog / L);
    if (lap > me.lap && lap >= 1) { const t = n - me.lapAt; best = Math.min(best ?? Infinity, t); me.lapAt = n; me.lastLap = t; if (lap < LAPS) sfx('lap'); }
    me.lap = Math.max(me.lap, lap);
  }
  function raceLoop(n) {
    if (race.state === 'off') return;
    if (!me) { race.state = 'off'; return; }
    const dt = Math.min(0.05, n - race.last); race.last = n;
    if (race.state === 'grid') { sound?.engine(0); return; }
    sound?.engine(race.state === 'done' ? me.v / VMAX * 0.6 : me.v / VMAX + me.boost * 3);
    if (race.state === 'count') {
      // Semáforo: as cinco luzes acendem em vermelho (um bipe cada), apagam juntas e a largada é dada.
      const e = n - race.t0, rem = 3 - e, red = Math.min(5, Math.floor(e / 0.5));
      if (red !== lights) { lights = red; if (red > 0) { sfx('tick'); buzz(10); } }
      setLights(red, false);
      hudScore.textContent = rem > 0 ? String(Math.ceil(rem)) : 'JÁ!';
      if (rem <= 0) { race.state = 'run'; me.lapAt = n; setLights(0, true); race.greenAt = n; sfx('go'); buzz(40); }
      return;
    }
    if (race.state === 'run') {
      if (n - race.greenAt > 1.2) { setLights(0, false); race.greenAt = Infinity; }
      drive(dt, n);
      const pos = standings().indexOf(me) + 1;
      hudScore.textContent = `Volta ${Math.min(LAPS, me.lap + 1)}/${LAPS} · ${pos}º lugar`;
      if (me.boost > 0.04) hudHint.textContent = 'TURBO!';
      else if (me.lastLap && n - me.lapAt < 2.5) hudHint.textContent = `Volta em ${fmt(me.lastLap)} s · melhor: ${fmt(best)} s`;
      else hudHint.textContent = Math.abs(me.lat) > ON_KERB ? 'Volte para o meio da pista!' : '';
      board(`VOLTA ${Math.min(LAPS, me.lap + 1)}/${LAPS}`);
      if (me.prog >= LAPS * track.L) {
        me.fin = ++race.order; const win = me.fin === 1;
        race.state = 'done'; race.doneAt = n; pad.hidden = true; input.l = input.r = input.b = false;
        hudScore.textContent = win ? 'Você venceu!' : `${me.fin}º lugar`;
        hudHint.textContent = (win ? 'Que corrida!' : 'Quase! Tente de novo.') + ` Melhor volta: ${fmt(best)} s`;
        zoneStatus.textContent = 'Toque em Corrida de kart para correr de novo.';
        board('CHEGADA');
        if (win) { race.party.userData.at = rt.clock; sfx('win'); buzz([30, 60, 30, 60, 80]); } else sfx(me.fin === 2 ? 'lap' : 'lose');
      }
      return;
    }
    // Depois da chegada: todos completam a volta devagar e a câmera volta para o parque.
    me.v = Math.max(0, me.v - 0.15 * dt); drive(dt, n);
    if (n - race.doneAt > 6) endRace();
  }
  // Câmera dos jogos em primeira pessoa: na corrida, atrás do seu kart, baixinha, seguindo com um leve atraso; no
  // Reciclaverso, na plateia, de frente para o palco. O "para cima" é o do chão ali (a área acompanha a curvatura do
  // planeta). Devolve o peso (0 a 1) dela.
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), camU = new THREE.Vector3(), tmp = new THREE.Vector3();
  let camW = 0, camOn = false;
  const PRS = 1.6;
  function raceCam(outCam, outLook, outUp, dt) {
    const kart = me && (racing() || race.state === 'grid' || (race.state === 'done' && nowS() - race.doneAt < 3.5)), want = kart || rc.eye;
    camW += ((want ? 1 : 0) - camW) * (1 - Math.exp(-dt * (st().reduced ? 20 : 2.2)));
    if (camW < 0.001) { camOn = false; return 0; }
    if (!kart) {
      if (rc.eye) {
        const { eye, look } = recy, k = camOn ? 1 - Math.exp(-dt * 4) : 1;
        camU.lerp(tmp.set(eye.x, eye.y + PRS, eye.z).normalize(), k); camP.lerp(tmp.set(eye.x, eye.y, eye.z), k); camL.lerp(tmp.set(look.x, look.y, look.z), k); camOn = true;
      }
      outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
      return camW;
    }
    const fx = Math.cos(me.h), fz = Math.sin(me.h), k = camOn ? 1 - Math.exp(-dt * 6) : 1;
    const up = tmp.set(me.x, sag(me.x, me.z) + PRS, me.z).normalize(), cx = me.x - fx * 0.14, cz = me.z - fz * 0.14;
    camU.lerp(up, k);
    camP.lerp(tmp.set(cx, sag(cx, cz) + 0.052, cz), k);
    const lx = me.x + fx * 0.1, lz = me.z + fz * 0.1;
    camL.lerp(tmp.set(lx, sag(lx, lz) + 0.014, lz), k); camOn = true;
    outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
    return camW;
  }
  // 4) Fliperama: a câmera chega na frente das máquinas do salão e a tela do Quebra-pixel abre por cima.
  const arc = createArcade({ el: $('.arcade'), on, sfx, buzz, onClose: () => { compact(false); view(null); zoneStatus.textContent = 'Toque nas máquinas ou em Fliperama para jogar de novo.'; } });
  function startArcade() {
    if (arc.on) return;
    stopGame(); compact(true);
    view({ at: arcade.at, yaw: 0, pitch: 0.24, d: 0.3 });
    zoneStatus.textContent = 'Quebra-pixel: limpe a tela de blocos!';
    intro('arcade', () => arc.start());
  }
  function hitArcade() {
    if (st().focusZone !== game.zi || arc.on || !arcade.hit) return false;
    ray.setFromCamera(pointer, worldCamera);
    return ray.intersectObject(arcade.hit, false).length > 0;
  }
  // Enquanto um jogo roda, a câmera fica fixa: as setas e a roda do mouse não mexem na vista.
  const busyKeys = () => playing();
  const whacking = () => whack.on;
  const playing = () => rc.on || whack.on || arc.on || race.state !== 'off' || !how.hidden;
  // Um passo por quadro: os jogos andam e a música abaixa enquanto algum está rolando.
  function whackTick() { const n = nowS(); recyLoop(n); whackLoop(n); raceLoop(n); sound?.setDuck(playing()); }
  // Brinquedos pelo planeta: um clique faz pular e girar.
  function hitToy() {
    if (!st().worldLive || st().cab) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(toys, true)[0];
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) if (toys.includes(o)) return o;
    return null;
  }
  return { stopGame, startRecycle, sortInto, hitBin, startWhack, startRace, startArcade, hitArcade, busyKeys, playing, whacking, racing, raceCam, whackTick, hitWhack, smack, hitToy };
}
