import * as THREE from 'three';
import { R } from './core/math.js';
import { sag } from './world/build.js';
import { worldCamera } from './world/stage.js';
import { rt, toys } from './world/runtime.js';
import { createArcade } from './arcade.js';
import { arcade, BINS, game, race, recy, slopeAt, track, trackAt, whack } from './world/zones/jogos.js';
import { eco } from './world/zones/ecologia.js';

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
    recy: { icon: '♻️', title: 'Reciclaverso', steps: [['🍌🥫🧴', 'O lixo aparece na sua frente'], [BINS.map(([, c]) => sq(c)).join(''), touch ? 'Toque na lixeira certa' : `Clique na lixeira certa ou ${kb('1')}…${kb('5')}`], ['⏱️', 'O tempo encurta: as últimas são relâmpago!'], ['⭐', 'Acertos seguidos valem mais']] },
    whack: { icon: '🟪', title: 'Acerte os blocos', steps: [['👆', 'Acerte os blocos que saltam'], [sq('#ffd23f'), 'Dourado: +3'], [sq('#ff3b3b'), 'Vermelho: −2'], ['⚡', 'Relâmpago: +3 segundos']] },
    race: { icon: '🏁', title: 'Corrida de kart', steps: touch
      ? [['◀ ▶', 'Segure os botões para virar'], ['❓', 'Pegue as caixas e toque em Item'], ['✨', 'Segure a curva: faíscas viram turbo'], ['🏆', '3 voltas: chegue em 1º']]
      : [[kb('←', '→'), 'Virar · ' + kb('↓') + ' freia'], [kb('Espaço'), 'Usa o item das caixas ❓'], ['✨', 'Segure a curva: faíscas viram turbo'], ['🏆', '3 voltas: chegue em 1º']] },
    clean: { icon: '🌿', title: 'Limpe o mangue', steps: [['🧴🥫🛍️', 'Lixo boiando nos canais e no mar'], ['👆', touch ? 'Toque no lixo para recolher' : 'Clique no lixo para recolher'], ['⏱️', '35 segundos'], ['⭐', 'Quanto mais limpo, mais estrelas']] },
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
  function closeHow() { how.hidden = true; howNext = null; howColors.hidden = true; how.classList.remove('side'); }
  // Cor do seu kart (escolhida antes da corrida, lembrada no aparelho). Nenhuma igual à dos rivais.
  const KART_COLORS = [['#ffc56b', 'amarelo'], ['#e8452f', 'vermelho'], ['#f4f4f4', 'branco'], ['#2a2f3a', 'grafite'], ['#b6e84a', 'limão'], ['#d4a640', 'dourado'], ['#7a9cff', 'lavanda'], ['#8a5a3c', 'café']];
  const howColors = how.querySelector('.how-colors');
  let kartColor = KART_COLORS[0]; try { const c = localStorage.getItem('miniverso-kart-cor'); kartColor = KART_COLORS.find(k => k[0] === c) || kartColor; } catch { /* sem armazenamento */ }
  howColors.replaceChildren(...KART_COLORS.map(([c, name]) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'how-color'; b.style.setProperty('--k', c); b.title = name; b.setAttribute('aria-label', `Kart ${name}`); b.dataset.c = c; return b; }));
  const paintPick = () => { for (const b of howColors.children) b.classList.toggle('on', b.dataset.c === kartColor[0]); race.karts[0]?.recolor(kartColor[0]); zoneStatus.textContent = `Você é o kart ${kartColor[1]}. ${LAPS} voltas contra Rosa, Azul, Verde, Roxo e Laranja.`; };
  on(howColors, 'click', e => { const b = e.target.closest('.how-color'); if (!b) return; kartColor = KART_COLORS.find(k => k[0] === b.dataset.c); try { localStorage.setItem('miniverso-kart-cor', kartColor[0]); } catch { /* sem armazenamento */ } paintPick(); sfx('tap'); });
  on(howGo, 'click', () => { const go = howNext; closeHow(); go?.(); });
  on(how.querySelector('.how-x'), 'click', () => stopGame());
  on(window, 'keydown', e => { if (how.hidden) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); howGo.click(); } });
  // Cada jogo leva a câmera até onde ele acontece.
  const VIEWS = { clean: { at: [-0.04, 0.02, -0.06], yaw: 2.75, pitch: 1.32, d: 2.1 }, recy: { at: [0, 0.07, -0.19], yaw: 0, pitch: 0.55, d: 0.56 }, whack: { at: [0.19, 0.03, 0.05], yaw: 0, pitch: 0.95, d: 0.62 } };
  function stopGame() {
    closeHow(); stopRecycle(); stopWhack(); stopEcoTour(); stopClean();
    if (arc.on) arc.close(true);
    compact(false); zoneStatus.textContent = '';
    if (race.state !== 'off') endRace();
    hud.hidden = true;
  }

  // Ecologia, Expedição em VR: visita guiada em primeira pessoa pela passarela da reserva. A câmera caminha pelo
  // caminho e, em cada estação, olha para ela enquanto o cartão mostra o nome e uma curiosidade.
  const ECO_SPEED = 0.045, ecoT = { on: false, t0: 0, idx: -1 };
  function startEcoTour() {
    stopGame(); Object.assign(ecoT, { on: true, t0: nowS(), idx: -1 }); compact(true);
    showHud('Expedição em VR', 'Uma caminhada pela reserva, estação por estação.'); hud.classList.add('corner'); sfx('go');
    zoneStatus.textContent = 'Expedição em VR: aproveite a vista!';
  }
  function stopEcoTour() { if (!ecoT.on) return; ecoT.on = false; hud.hidden = true; compact(false); }
  function ecoLoop(n) {
    if (!ecoT.on) return;
    const s = (n - ecoT.t0) * ECO_SPEED;
    if (s > eco.L + 0.02) { stopEcoTour(); zoneStatus.textContent = 'Fim da expedição! Toque em Expedição em VR para fazer de novo.'; sfx('win'); return; }
    const idx = eco.stations.findIndex(st => Math.abs(s - st.s) < 0.05);
    if (idx >= 0 && idx !== ecoT.idx) { ecoT.idx = idx; const st = eco.stations[idx]; hudTitle.textContent = `${idx + 1} · ${st.name}`; hudScore.textContent = `${idx + 1}/${eco.stations.length} · ${st.name}`; hudHint.textContent = st.fact; sfx('good'); buzz(12); }
  }
  // Ecologia, Limpe o mangue: 35 s para recolher o lixo boiando nos canais e no mar (clique ou toque em cada um).
  const CLEAN_TIME = 35, cl = { on: false, end: 0, score: 0 };
  function startClean() { stopGame(); view(VIEWS.clean); intro('clean', beginClean); }
  function beginClean() {
    Object.assign(cl, { on: true, end: nowS() + CLEAN_TIME, score: 0 }); eco.cleanOn = true; eco.spawnAll();
    showHud('Limpe o mangue', 'Recolha o lixo antes que a maré leve!'); hud.classList.add('corner'); hudBar.hidden = false; sfx('go'); flash('🌿 Valendo!', 'go', 1);
  }
  function stopClean() { if (!cl.on && !eco.cleanOn) return; cl.on = false; eco.cleanOn = false; eco.hide(); hudBar.hidden = true; }
  function cleanLoop(n) {
    if (!cl.on) return;
    const left = Math.max(0, cl.end - n);
    hudScore.textContent = `${cl.score} recolhidos · ${Math.ceil(left)} s`;
    hudFill.style.transform = `scaleX(${(left / CLEAN_TIME).toFixed(3)})`; hudFill.style.background = left > 10 ? '#3dff8f' : left > 5 ? '#ffd23f' : '#ff3b3b';
    if (left <= 0) {
      const stars = cl.score >= 22 ? 3 : cl.score >= 15 ? 2 : cl.score >= 8 ? 1 : 0, txt = '★'.repeat(stars) + '☆'.repeat(3 - stars);
      stopClean(); compact(false); flash(txt, stars === 3 ? 'win' : 'end', 3);
      hudScore.textContent = `${txt} ${cl.score} recolhidos`; hudHint.textContent = stars >= 2 ? 'O mangue agradece! Os bichos voltaram a respirar.' : 'Ainda ficou lixo na água. Tente de novo!';
      zoneStatus.textContent = 'Toque em Limpe o mangue para jogar de novo.'; sfx(stars >= 2 ? 'win' : 'lose');
    }
  }
  function hitTrash() {
    if (!cl.on || st().focusZone !== eco.zi) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(eco.trash.filter(m => m.visible), true)[0];
    if (!hit) return null;
    const o = hit.object; return eco.trash.includes(o) ? o : o.userData.trash;
  }
  function pickTrash(m) {
    if (!eco.collect(m, rt.clock)) return;
    cl.score++; sfx('good', cl.score % 5); buzz(12);
    if (cl.score % 5 === 0) { flash(`🌿 ${cl.score} recolhidos!`, 'boost', 0.9); sfx('bonus'); }
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
    hudBins.hidden = false; hudBar.hidden = false; sfx('go'); flash('♻️ Valendo!', 'go', 1.1);
    zoneStatus.textContent = `${ROUNDS} rodadas. Valendo!`;
  }
  // Tempo para responder: folgado no começo (8 s nas 4 primeiras), vai encurtando até 4 s na 9ª e as 3 últimas são
  // relâmpago (3 s, 2,6 s e 2,2 s).
  const FAST_FROM = 10;
  const roundTime = r => (r <= 4 ? 8 : r < FAST_FROM ? 8 - (r - 4) / (FAST_FROM - 1 - 4) * 4 : [3, 2.6, 2.2][Math.min(2, r - FAST_FROM)]);
  function nextItem(n) {
    const pool = recy.items.filter(it => it !== rc.last && it !== rc.fly?.it);
    const it = pool[Math.floor(R() * pool.length)];
    rc.round++; rc.cur = it; rc.last = it; rc.t0 = n; rc.dur = roundTime(rc.round); rc.beep = 0;
    // Entrando nas rodadas relâmpago: aviso grande, som e vibração.
    if (rc.round === FAST_FROM) { tell('⚡ Rodadas relâmpago! Pontos em dobro.', n); flash('⚡ RELÂMPAGO · pontos x2', 'last', 1.6); sfx('go'); buzz([20, 30, 20]); }
    it.mesh.visible = true; it.mesh.position.set(recy.stand.x, recy.stand.y, recy.stand.z); it.mesh.scale.setScalar(0.01);
    sfx('whoosh');
  }
  function sendTo(it, k, n) {
    const bin = recy.bins[k];
    rc.fly = { it, t0: n, from: it.mesh.position.clone(), to: new THREE.Vector3(bin.x, bin.y + 0.004, bin.z), s: it.mesh.scale.x };
    recy.lidT[k] = rt.clock; rc.cur = null; rc.next = n + FLY + GAP;
  }
  function recyLoop(n) {
    if (flashUntil && n > flashUntil && race.state === 'off') { flashEl.classList.remove('on'); flashUntil = 0; }
    if (!rc.on) return;
    if (!rc.cur && !rc.fly && n >= rc.next) { if (rc.round >= ROUNDS) return endRecycle(); nextItem(n); }
    // Item da vez: sobe crescendo e gira no pedestal; o anel de luzes vai apagando (verde, amarelo, vermelho).
    if (rc.cur) {
      const m = rc.cur.mesh, age = n - rc.t0, left = Math.max(0, 1 - age / rc.dur), grow = Math.min(1, age / SHOW);
      m.scale.setScalar(0.95 * (1 - (1 - grow) ** 3)); m.rotation.set(0.25, age * (rc.round >= FAST_FROM ? 3.2 : 1.4), 0);
      m.position.y = recy.stand.y + Math.sin(age * 3) * 0.0015;
      recy.timer.count = Math.ceil(left * 24);
      const col = left > 0.5 ? '#3dff8f' : left > 0.25 ? '#ffd23f' : '#ff3b3b';
      recy.timer.material.color.copy(timerC.set(col));
      hudFill.style.transform = `scaleX(${left.toFixed(3)})`; hudFill.style.background = col;
      const sec = Math.ceil(rc.dur - age); if (sec <= (rc.dur < 3.5 ? 1 : 2) && sec !== rc.beep) { rc.beep = sec; sfx('tick'); buzz(10); }
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
    hudScore.textContent = `${rc.round >= FAST_FROM ? '⚡ ' : ''}Rodada ${Math.max(1, rc.round)}/${ROUNDS} · ${rc.score} pts`;
    hudHint.textContent = rc.flash && n - rc.flashAt < 1.8 ? rc.flash : '';
  }
  function tell(t, n) { rc.flash = t; rc.flashAt = n; }
  function sortInto(k) {
    if (!rc.on || !rc.cur) return;
    const n = nowS(), it = rc.cur, left = Math.max(0, 1 - (n - rc.t0) / rc.dur);
    if (it.bin === k) {
      rc.ok++; rc.combo++; const pts = (10 + Math.round(left * 10) + Math.min(5, rc.combo - 1) * 2) * (rc.round >= FAST_FROM ? 2 : 1); rc.score += pts;
      tell(rc.combo >= 3 ? `Certo! +${pts} · ${rc.combo} seguidas!` : `Certo! +${pts}`, n);
      // Sequências marcantes: aviso grande e confete no palco.
      if (rc.combo === 3 || rc.combo === 5 || rc.combo === 8) { flash(`🔥 ${rc.combo} seguidas!`, 'boost', 1); recy.party.userData.at = rt.clock; }
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
    // Estrelas pelo número de acertos: 6+ uma, 9+ duas, 11+ três.
    const stars = rc.ok >= 11 ? 3 : rc.ok >= 9 ? 2 : rc.ok >= 6 ? 1 : 0, starTxt = '★'.repeat(stars) + '☆'.repeat(3 - stars);
    flash(starTxt, stars === 3 ? 'win' : 'end', 3.2);
    hudScore.textContent = `${starTxt} ${rc.ok}/${ROUNDS} certos · ${rc.score} pts`;
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
    if (cl.on) return hitTrash();
    if (st().focusZone !== game.zi || !whack.on) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(whack.pads.filter(c => c.userData.up >= 0), true)[0];
    return hit ? hit.object.userData.whack || hit.object : null;
  }
  function smack(c) {
    if (eco.trash.includes(c)) return pickTrash(c);
    const kind = c.userData.kind, d = kind === 'gold' ? 3 : kind === 'red' ? -2 : 1, i = whack.pads.indexOf(c);
    c.userData.up = -1; c.visible = false; whack.score = Math.max(0, whack.score + d);
    if (kind === 'time') whack.end += 3;
    whack.flash = kind === 'time' ? '+3 segundos! Relâmpago!' : d > 1 ? '+3! Bloco dourado!' : d < 0 ? '−2… era vermelho!' : '+1'; whack.flashAt = nowS(); whack.lastTxt = 0;
    whack.ledT[i] = nowS(); whack.ledHit[i] = d < 0 ? '#ff3b3b' : kind === 'gold' ? '#ffd23f' : '#ffffff';
    if (d > 0) { whack.pop.position.copy(c.position); whack.pop.userData.at = rt.clock; }
    if (d < 0) { sfx('bad'); buzz([40, 30, 40]); } else if (d > 1 || kind === 'time') { sfx('bonus'); buzz(25); } else { sfx('hit', (whack.score % 5) * 2); buzz(12); }
  }

  // 3) Corrida de kart: você pilota o kart amarelo contra três rivais, 3 voltas por um circuito com viaduto. O kart
  // acelera sozinho; ← → (ou A/D, ou os botões na tela) viram, ↓ freia e Espaço (ou o botão Item) usa o item.
  // Sem tocar em nada, ele se alinha sozinho com a pista; as zebras seguram o kart dentro da pista, mas em cima delas
  // ele anda devagar e a mureta freia; as setas azuis dão turbo. Segurar a curva em velocidade solta faíscas
  // (azuis, depois laranja) e, ao soltar, vira um turbo curto. Nas caixas "?" você ganha um item: turbo, casca de
  // banana (larga atrás de você e faz quem passar rodar) ou escudo (6 s protegido).
  // PACE: a corrida anda num ritmo 18% mais calmo que o relógio (com os karts menores, a pista parece maior).
  const PACE = 0.82, LAPS = 3, VMAX = 0.27, ACC = 0.24, BRAKE = 0.7, KERB = 0.15, ON_KERB = track.W - 0.008;
  // Até onde o centro do kart vai: a lateral dele encosta na face da mureta (no chão) ou na mureta da ponte (no viaduto).
  const HALF = 0.0116 * track.KART_S, edgeAt = i => (track.Y[i] > 0.004 ? track.W + 0.002 - HALF : track.BARRIER - 0.0016 - HALF);
  const input = { l: false, r: false, b: false };
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowDown: 'b', s: 'b', S: 'b' };
  const racing = () => race.state === 'count' || race.state === 'run';
  on(window, 'keydown', e => {
    if (!racing()) return;
    if (e.key === ' ' || e.key === 'x' || e.key === 'X') { e.preventDefault(); if (!e.repeat) useItem(); return; }
    const k = KEYS[e.key]; if (!k) return; input[k] = true; e.preventDefault();
  });
  on(window, 'keyup', e => { const k = KEYS[e.key]; if (k) input[k] = false; });
  on(window, 'blur', () => { input.l = input.r = input.b = false; });
  for (const b of pad.querySelectorAll('[data-k]')) {
    const k = b.dataset.k, set = v => e => { input[k] = v; e.preventDefault(); if (v) buzz(8); };
    on(b, 'pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) on(b, ev, set(false));
    on(b, 'contextmenu', e => e.preventDefault());
  }
  const itemBtn = pad.querySelector('.rp-item');
  if (itemBtn) { on(itemBtn, 'pointerdown', e => { e.preventDefault(); useItem(); }); on(itemBtn, 'contextmenu', e => e.preventDefault()); }
  // Painel da corrida: posição grande, volta, item guardado e o mini-mapa; avisos grandes no meio da tela.
  const rh = $('.race-hud'), rhPos = rh.querySelector('.rh-pos'), rhLap = rh.querySelector('.rh-lap'), rhItem = rh.querySelector('.rh-item'), rhMap = rh.querySelector('.rh-map');
  const flashEl = $('.race-flash');
  let flashUntil = 0;
  function flash(text, kind = '', dur = 1.2) { flashEl.textContent = text; flashEl.className = `race-flash ${kind}`; flashEl.hidden = false; void flashEl.offsetWidth; flashEl.classList.add('on'); flashUntil = nowS() + dur; }
  const ITEMS = { turbo: '🚀', banana: '🍌', escudo: '🛡️' };
  const mapX = rhMap.getContext('2d'), MAP = 120, mapK = MAP / 1.42, mp = (x, z) => [MAP / 2 + x * mapK, MAP / 2 + z * mapK];
  const mapPath = new Path2D(); for (let i = 0; i <= track.N; i++) { const [x, y] = mp(track.X[i % track.N], track.Z[i % track.N]); i ? mapPath.lineTo(x, y) : mapPath.moveTo(x, y); }
  let mapAt = 0;
  function drawMap(n) {
    if (n - mapAt < 0.066) return; mapAt = n;
    mapX.clearRect(0, 0, MAP, MAP);
    mapX.lineJoin = 'round'; mapX.lineWidth = 7; mapX.strokeStyle = 'rgba(20,12,42,.7)'; mapX.stroke(mapPath);
    mapX.lineWidth = 3.5; mapX.strokeStyle = '#d9d4ea'; mapX.stroke(mapPath);
    const [sx, sy] = mp(track.X[0], track.Z[0]); mapX.fillStyle = '#ffffff'; mapX.fillRect(sx - 1, sy - 5, 2, 10);
    for (const a of [...ais, me]) { const [x, y] = mp(a.x, a.z); mapX.fillStyle = a.k.color; mapX.strokeStyle = '#140c2a'; mapX.lineWidth = 2; mapX.beginPath(); mapX.arc(x, y, a === me ? 5.5 : 4, 0, Math.PI * 2); mapX.fill(); mapX.stroke(); }
  }
  const pt = { x: 0, z: 0, h: 0, y: 0 }, ptY = { x: 0, z: 0, h: 0, y: 0 };
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
    me = { sp: undefined, k: K[0], x: pt.x, z: pt.z, h: pt.h, y: 0, v: 0, st: 0, prog: -0.085, lane: -0.013, lat: -0.013, i: Math.round((track.L - 0.085) / track.ds) % track.N, lap: 0, lapAt: 0, fin: 0, boost: 0, hitAt: -9, drift: 0, spin: 0, item: null, rollAt: 0, shieldUntil: 0 };
    // Rivais com jeito próprio: Rosa é agressiva e cola em quem está na frente; Azul é rápido mas às vezes erra a
    // curva; Verde guarda força e acelera na última volta.
    // Cinco rivais competitivos: Rosa e Roxo são agressivos, Azul é muito rápido mas às vezes erra, Verde e Laranja
    // guardam força para a última volta. Você larga no meio do grid.
    ais = [[K[1], -0.035, -0.013, 1, 'agressiva'], [K[2], -0.035, 0.013, 0.99, 'erra'], [K[3], -0.085, 0.013, 0.95, 'final'], [K[4], -0.135, -0.013, 0.98, 'agressiva'], [K[5], -0.135, 0.013, 0.96, 'final']]
      .map(([k, prog, lane, skill, mood]) => ({ k, prog, lane, laneT: lane, skill, mood, v: 0, fin: 0, x: 0, z: 0, spin: 0, boostT: 0, dropAt: 0, slowUntil: 0, nextSlip: 4 + R() * 6 }));
    for (const a of [me, ...ais]) { trackAt(a.prog, a.lane, pt); a.x = pt.x; a.z = pt.z; a.k.place(pt.x, pt.z, pt.h, 0, pt.y); }
    race.bananas.length = 0; for (const it of race.items) it.off = -9; race.shield.visible = false;
    Object.assign(race, { state: 'grid', last: nowS(), order: 0, gridAt: nowS() }); setLights(0, false); lights = 0;
    input.l = input.r = input.b = false; compact(true); boardKey = '';
    intro('race', goRace); howColors.hidden = false; how.classList.add('side'); paintPick();
  }
  function goRace() {
    Object.assign(race, { state: 'count', t0: nowS(), last: nowS() });
    hud.hidden = true; rh.hidden = false; rhItem.textContent = ''; rhItem.classList.remove('has');
    pad.hidden = false;
  }
  function endRace() {
    race.state = 'off'; pad.hidden = true; rh.hidden = true; flashEl.hidden = true; compact(false); sound?.engine(null);
    for (const a of [me, ...ais]) if (a) a.k.s = ((a.prog % track.L) + track.L) % track.L;
    race.bananas.length = 0; if (race.shield) race.shield.visible = false;
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
  const smooth01 = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Suspensão: o kart inclina com a rampa um pouquinho atrasado, como mola (empina na subida, assenta e balança de
  // leve no topo e no fim da descida). Devolve [inclinação, quanto o chassi sobe na mola].
  function susp(a, target, dt) {
    if (a.sp === undefined) { a.sp = target; a.sv = 0; }
    a.sv += ((target - a.sp) * 150 - a.sv * 14) * dt; a.sp += a.sv * dt;
    return [a.sp, Math.min(0.0016, Math.abs(target - a.sp) * 0.012)];
  }
  const yAt = (x, z, y) => sag(x, z) + 0.0068 + y;
  // Itens: a caixa sorteia um item (com a roleta girando no painel por um instante); Espaço ou o botão usa.
  function grabBoxes(a, n) {
    for (const it of race.items) {
      if (it.off > 0 && rt.clock - it.off < 3) continue;
      if ((a.x - it.x) ** 2 + (a.z - it.z) ** 2 > 0.016 ** 2) continue;
      it.off = rt.clock;
      for (let k = 0; k < 10; k++) race.fx(it.x, it.y, it.z, (R() - 0.5) * 0.12, R() * 0.1, (R() - 0.5) * 0.12, 0.5, ['#ff4fd8', '#ffc56b', '#7fe9ff', '#3ee0b5'][k % 4], 1.2);
      if (a === me) {
        if (!me.item && !me.rollAt) { me.rollAt = n; sfx('bonus'); buzz(20); }
      } else if (R() < 0.5) { a.boostT = 1.3; } else { a.dropAt = n + 0.8 + R() * 1.5; }
    }
  }
  function useItem() {
    if (!me || race.state !== 'run' || !me.item) return;
    const it = me.item; me.item = null; rhItem.textContent = ''; rhItem.classList.remove('has');
    if (it === 'turbo') { me.boost = 0.11; me.v = Math.max(me.v, VMAX + 0.09); sfx('boost'); buzz(35); flash('TURBO!', 'boost', 0.8); }
    else if (it === 'banana') { dropBanana(me.prog - 0.03, me.lat); sfx('whoosh'); buzz(12); }
    else { me.shieldUntil = nowS() + 6; sfx('bonus'); buzz(20); flash('ESCUDO!', 'shield', 0.8); }
  }
  function dropBanana(prog, lane) {
    trackAt(prog, lane, pt);
    race.bananas.push({ x: pt.x, z: pt.z, y: yAt(pt.x, pt.z, pt.y), at: rt.clock });
    if (race.bananas.length > 6) race.bananas.shift();
  }
  // Escorregou na casca: o kart dá uma volta inteira, perde quase toda a velocidade e solta estrelinhas.
  function slip(a, n) {
    a.spin = 1; a.v *= 0.3;
    for (let k = 0; k < 8; k++) race.fx(a.x, yAt(a.x, a.z, a.y ?? 0) + 0.012, a.z, (R() - 0.5) * 0.1, 0.06 + R() * 0.05, (R() - 0.5) * 0.1, 0.6, '#ffd23f', 1.1);
    if (a === me) { sfx('bad'); buzz([40, 30, 60]); flash('Escorregou!', 'bad', 0.9); }
  }
  function bananaHits(a, n) {
    for (let i = race.bananas.length - 1; i >= 0; i--) {
      const b = race.bananas[i]; if ((a.x - b.x) ** 2 + (a.z - b.z) ** 2 > 0.01 ** 2 || rt.clock - b.at < 0.4) continue;
      race.bananas.splice(i, 1);
      if (a === me && nowS() < me.shieldUntil) { sfx('paddle'); continue; }
      slip(a, n);
    }
  }
  // Chama do turbo e poeira: partículas saindo de trás do kart.
  function exhaust(a, h, y, hot) {
    const bx = a.x - Math.cos(h) * 0.016, bz = a.z - Math.sin(h) * 0.016;
    race.fx(bx + (R() - 0.5) * 0.004, y + 0.009, bz + (R() - 0.5) * 0.004, -Math.cos(h) * 0.05, 0.02, -Math.sin(h) * 0.05, 0.22, hot ? (R() < 0.5 ? '#ffd23f' : '#ff7a1a') : '#d8d2c4', hot ? 1.3 : 1.6, 0);
  }
  // Seu kart: direção suave, alinhamento automático com a pista quando você solta o volante, zebras que seguram
  // (a batida tira velocidade e endireita o kart), turbo nas setas azuis e a derrapagem.
  function pilot(dt, n) {
    const { X, Z, TX, TZ, N, L, ds } = track;
    const spinning = me.spin > 0;
    const steer = spinning ? 0 : (input.r ? 1 : 0) - (input.l ? 1 : 0);
    me.st += (steer - me.st) * Math.min(1, dt * 12);
    const kerb = Math.abs(me.lat) > ON_KERB, top = (kerb ? KERB : VMAX) + me.boost;
    if (input.b) me.v = Math.max(0, me.v - BRAKE * dt);
    else if (me.v < top) me.v = Math.min(top, me.v + ACC * dt); else me.v = Math.max(top, me.v - (kerb ? 0.5 : 0.25) * dt);
    me.boost = Math.max(0, me.boost - dt * 0.12);
    // Derrapagem: virando forte em velocidade, a carga sobe (faíscas azuis, depois laranja); ao soltar, turbo curto.
    const drifting = Math.abs(steer) > 0.5 && me.v > 0.17 && !kerb;
    if (drifting) me.drift += dt;
    else { if (me.drift > 0.6) { const big = me.drift > 1.3; me.boost = Math.max(me.boost, big ? 0.085 : 0.055); me.v = Math.max(me.v, VMAX + (big ? 0.06 : 0.035)); sfx('boost'); buzz(big ? 30 : 18); if (big) flash('Super derrapada!', 'boost', 0.7); } me.drift = 0; }
    const ahead = (me.i + 4) % N, tan = Math.atan2(TZ[ahead], TX[ahead]), err = wrapA(tan - me.h);
    me.h += me.st * 2.8 * (drifting ? 1.12 : 1) * (1 - 0.25 * Math.min(1, me.v / VMAX)) * Math.min(1, me.v / 0.05) * dt;
    if (Math.abs(steer) < 0.5) me.h += err * Math.min(1, dt * 1.6);                       // solta o volante: alinha com a pista
    me.x += Math.cos(me.h) * me.v * dt; me.z += Math.sin(me.h) * me.v * dt;
    const i = nearestFrom(me.i, me.x, me.z), nx = -TZ[i], nz = TX[i];
    me.lat = (me.x - X[i]) * nx + (me.z - Z[i]) * nz;
    const EDGE = edgeAt(i);
    if (Math.abs(me.lat) > EDGE) {
      // Encostou na mureta: o kart fica rente a ela e desliza junto, virando para dentro da pista.
      const push = me.lat - Math.sign(me.lat) * EDGE; me.x -= nx * push; me.z -= nz * push; me.lat -= push;
      const into = Math.abs(wrapA(Math.atan2(TZ[i], TX[i]) - me.h));
      me.h += wrapA(Math.atan2(TZ[i], TX[i]) - me.h) * 0.35;
      me.v *= 1 - Math.min(0.5, into * 1.2) * Math.min(1, dt * 20);
      if (n - me.hitAt > 0.35 && into > 0.12) {
        me.hitAt = n; me.v *= 0.8; me.drift = 0; sfx('bump'); buzz(25);
        for (let k = 0; k < 6; k++) race.fx(me.x + nx * Math.sign(me.lat) * 0.01, yAt(me.x, me.z, me.y) + 0.006, me.z + nz * Math.sign(me.lat) * 0.01, (R() - 0.5) * 0.1, 0.05 + R() * 0.05, (R() - 0.5) * 0.1, 0.35, '#fff6d8', 0.9);
      }
    }
    let dsI = i - me.i; if (dsI > N / 2) dsI -= N; if (dsI < -N / 2) dsI += N; me.prog += dsI * ds; me.i = i;
    me.y = trackAt(me.prog, 0, ptY).y;                                                      // altura exata da pista (rampa do viaduto)
    const s = ((me.prog % L) + L) % L;
    for (const p of track.pads) if (s > p.s0 && s < p.s1 && Math.abs(me.lat - p.lat) < 0.014 && me.boost < 0.06) { me.boost = 0.1; me.v = Math.max(me.v, VMAX + 0.08); sfx('boost'); buzz(35); flash('TURBO!', 'boost', 0.7); }
    // Faíscas da derrapagem nas rodas de trás e poeira na zebra.
    const gy = yAt(me.x, me.z, me.y);
    if (drifting && me.drift > 0.25) for (const sd of [-1, 1]) {
      const wx = me.x - Math.cos(me.h) * 0.011 - Math.sin(me.h) * 0.009 * sd, wz = me.z - Math.sin(me.h) * 0.011 + Math.cos(me.h) * 0.009 * sd;
      race.fx(wx, gy + 0.002, wz, (R() - 0.5) * 0.06, 0.04 + R() * 0.04, (R() - 0.5) * 0.06, 0.25, me.drift > 1.3 ? (R() < 0.5 ? '#ffa63d' : '#ffd23f') : (R() < 0.5 ? '#7fe9ff' : '#ffffff'), 0.9);
    }
    if (kerb && me.v > 0.08 && R() < 0.22) race.fx(me.x - Math.cos(me.h) * 0.01, gy + 0.002, me.z - Math.sin(me.h) * 0.01, (R() - 0.5) * 0.02, 0.015, (R() - 0.5) * 0.02, 0.35, '#e9e1c8', 1.3, 0);
    if (me.boost > 0.03) exhaust(me, me.h, gy, true);
    grabBoxes(me, n); bananaHits(me, n);
    // Roleta do item: gira os ícones por 0,8 s e para num item.
    if (me.rollAt) {
      const e = n - me.rollAt, keys = Object.keys(ITEMS);
      if (e < 0.8) rhItem.textContent = ITEMS[keys[Math.floor(e * 14) % 3]];
      else { const pos = standings().indexOf(me); const pick = pos >= 2 && R() < 0.55 ? 'turbo' : keys[Math.floor(R() * 3)]; me.item = pick; me.rollAt = 0; rhItem.textContent = ITEMS[pick]; rhItem.classList.add('has'); sfx('good'); buzz(15); }
    }
  }
  function drive(dt, n) {
    const { N, L, ds } = track;
    // Depois da chegada o seu kart segue a pista sozinho, desacelerando.
    if (race.state === 'done') { me.prog += me.v * dt; trackAt(me.prog, me.lat ?? 0, pt); me.x = pt.x; me.z = pt.z; me.h = pt.h; me.y = pt.y; } else pilot(dt, n);
    me.spin = Math.max(0, me.spin - dt * 1.1);
    // Rivais: seguem a linha deles, freiam antes das curvas, aliviam quando abrem vantagem e apertam se você abre.
    // Antes de encostar em alguém na mesma faixa, trocam de faixa para ultrapassar ou seguram atrás.
    const lanePos = a => (a === me ? me.lat : a.lane);
    const lastLap = me.prog > (LAPS - 1) * L;
    for (const a of ais) {
      const ai = Math.floor((((a.prog % L) + L) % L) / ds);
      let lim = 1; for (let k = 0; k < 12; k += 2) lim = Math.min(lim, track.VL[(ai + k) % N]);
      // Competitivos: fazem as curvas mais perto do limite e, se você abre vantagem, apertam forte (até ~27% mais
      // rápidos); se eles abrem, aliviam só um pouco.
      const gap = Math.max(-0.3, Math.min(0.3, (me.prog - a.prog) / L)), rubber = 1 + gap * (gap < 0 ? 0.35 : a.mood === 'agressiva' ? 1 : 0.85);
      let target = Math.min(0.28, lim * 1.2) * a.skill * (a.fin ? 0.6 : rubber);
      if (a.mood === 'final' && a.prog > (LAPS - 1) * L && !a.fin) target *= 1.07;
      if (a.mood === 'erra' && race.state === 'run') { a.nextSlip -= dt; if (a.nextSlip < 0 && lim < 0.8) { a.slowUntil = n + 0.7; a.nextSlip = 6 + R() * 8; } if (n < a.slowUntil) target *= 0.72; }
      { const as = ((a.prog % L) + L) % L; for (const p of track.pads) if (as > p.s0 && as < p.s1 && !(a.boostT > 0)) a.boostT = 0.8; }  // também pegam as faixas de turbo
      if (a.boostT > 0) { a.boostT -= dt; target += 0.07; }
      if (a.spin > 0) { a.spin = Math.max(0, a.spin - dt * 1.1); target *= 0.4; }
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
      if (a.dropAt && n > a.dropAt) { a.dropAt = 0; dropBanana(a.prog - 0.03, a.lane); }
      const ai2 = Math.floor((((a.prog % L) + L) % L) / ds) % N, k2 = track.K[ai2];
      trackAt(a.prog, a.lane, pt); a.x = pt.x; a.z = pt.z; a.y = pt.y;
      const [ap, ah] = susp(a, slopeAt(a.prog), dt);
      a.k.place(pt.x, pt.z, pt.h + a.spin * Math.PI * 2, Math.max(-0.2, Math.min(0.2, k2 * a.v * 0.05)), pt.y + ah, ap, Math.max(-1, Math.min(1, k2 * 0.12)));
      if (race.state === 'run') { grabBoxes(a, n); bananaHits(a, n); }
      if (a.boostT > 0) exhaust(a, pt.h, yAt(pt.x, pt.z, pt.y), true);
      // Encostou no rival: os dois se afastam um pouco e você perde velocidade (o escudo protege).
      const dx = me.x - a.x, dz = me.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.015 && d > 1e-5 && Math.abs(me.y - a.y) < 0.02) {
        const k = (0.015 - d) / d; me.x += dx * k; me.z += dz * k;
        if (nowS() < me.shieldUntil) a.v *= 0.8; else me.v *= 0.9;
        if (n - me.hitAt > 0.35) { me.hitAt = n; sfx('bump'); buzz(20); }
      }
      if (!a.fin && a.prog >= LAPS * L) a.fin = ++race.order;
    }
    // Empina um pouquinho ao acelerar e abaixa o bico ao frear (aceleração suavizada).
    const accN = dt > 0 ? (me.v - (me.pv ?? me.v)) / dt : 0; me.pv = me.v; me.acc = (me.acc ?? 0) + (accN - (me.acc ?? 0)) * Math.min(1, dt * 6);
    const [mp, mh] = susp(me, slopeAt(me.prog) + Math.max(-0.06, Math.min(0.06, me.acc * 0.12)), dt);
    me.k.place(me.x, me.z, me.h + me.spin * Math.PI * 2, Math.max(-0.16, Math.min(0.16, me.st * me.v * 0.6)), me.y + mh + (Math.abs(me.lat) > track.W - 0.004 && track.Y[me.i] < 0.004 ? 0.0012 : 0), mp, me.st);
    const sh = race.shield; sh.visible = nowS() < me.shieldUntil;
    if (sh.visible) { sh.position.set(me.x, yAt(me.x, me.z, me.y) + 0.009, me.z); sh.rotation.y = n * 2; sh.material.opacity = 0.22 + Math.sin(n * 10) * 0.06 * (me.shieldUntil - nowS() < 1.5 ? 2 : 1); }
    // Voltas: tempo de cada uma e melhor volta.
    const lap = Math.floor(me.prog / L);
    if (lap > me.lap && lap >= 1) {
      const t = n - me.lapAt; best = Math.min(best ?? Infinity, t); me.lapAt = n; me.lastLap = t;
      // A cada volta: fogos sobre a reta, confete no pórtico e a torcida vibra.
      if (lap < LAPS) { race.fireworks(lap === LAPS - 1 ? 5 : 3, me.prog); if (race.burst) race.burst(false); else { race.party.userData.at = rt.clock; race.cheerAt = rt.clock; } }
      if (lap === LAPS - 1) { flash('ÚLTIMA VOLTA!', 'last', 1.8); sfx('lap'); buzz([30, 40, 30]); } else if (lap < LAPS) { flash(`Volta ${lap + 1}`, '', 1); sfx('lap'); }
    }
    me.lap = Math.max(me.lap, lap);
    if (lastLap && !me.lastFlag) me.lastFlag = true;
  }
  function raceLoop(n) {
    if (race.state === 'off') return;
    if (!me) { race.state = 'off'; return; }
    const dt = Math.min(0.05, n - race.last) * PACE; race.last = n;
    if (flashUntil && n > flashUntil) { flashEl.classList.remove('on'); flashUntil = 0; }
    if (race.state === 'grid') { sound?.engine(0); return; }
    sound?.engine(race.state === 'done' ? me.v / VMAX * 0.6 : me.v / VMAX + me.boost * 3);
    drawMap(n);
    if (race.state === 'count') {
      // Semáforo: as cinco luzes acendem em vermelho (um bipe cada), apagam juntas e a largada é dada.
      const e = n - race.t0, rem = 3 - e, red = Math.min(5, Math.floor(e / 0.5));
      if (red !== lights) { lights = red; if (red > 0) { sfx('tick'); buzz(10); } }
      setLights(red, false);
      const c = Math.ceil(rem);
      if (rem > 0 && c !== race.lastCount) { race.lastCount = c; flash(String(c), 'count', 0.9); }
      rhPos.innerHTML = `${standings().indexOf(me) + 1}º<small>/${ais.length + 1}</small>`; rhLap.textContent = `Volta 1/${LAPS}`;
      if (rem <= 0) { race.state = 'run'; race.lastCount = 0; me.lapAt = n; setLights(0, true); race.greenAt = n; sfx('go'); buzz(40); flash('JÁ!', 'go', 0.9); }
      return;
    }
    if (race.state === 'run') {
      if (n - race.greenAt > 1.2) { setLights(0, false); race.greenAt = Infinity; }
      drive(dt, n);
      const pos = standings().indexOf(me) + 1;
      if (pos !== race.lastPos) { race.lastPos = pos; rhPos.innerHTML = `${pos}º<small>/${ais.length + 1}</small>`; rhPos.classList.remove('pop'); void rhPos.offsetWidth; rhPos.classList.add('pop'); }
      rhLap.textContent = `Volta ${Math.min(LAPS, me.lap + 1)}/${LAPS}`;
      board(`VOLTA ${Math.min(LAPS, me.lap + 1)}/${LAPS}`);
      if (me.prog >= LAPS * track.L) {
        me.fin = ++race.order; const win = me.fin === 1;
        race.state = 'done'; race.doneAt = n; pad.hidden = true; input.l = input.r = input.b = false;
        flash(win ? 'VOCÊ VENCEU!' : `${me.fin}º LUGAR`, win ? 'win' : 'end', 4);
        rhLap.textContent = `Melhor volta: ${fmt(best)} s`;
        zoneStatus.textContent = 'Toque em Corrida de kart para correr de novo.';
        board('CHEGADA');
        race.fireworks(win ? 9 : 4, me.prog); race.cheerAt = rt.clock;
        if (win) { if (race.burst) race.burst(true); else race.party.userData.at = rt.clock; sfx('win'); buzz([30, 60, 30, 60, 80]); } else sfx(me.fin === 2 ? 'lap' : 'lose');
      }
      return;
    }
    // Depois da chegada: todos completam a volta devagar e a câmera volta para o parque.
    me.v = Math.max(0, me.v - 0.15 * dt); drive(dt, n);
    if (n - race.doneAt > 6) endRace();
  }
  // Câmeras dos jogos. Na corrida, uma câmera de perseguição: um pouco acima e atrás do seu kart, virando com
  // atraso suave (não dá trancos quando o kart bate ou se alinha), afastando e abrindo a visão com a velocidade e
  // tremendo de leve na batida. Antes da largada ela dá uma volta em torno do grid e encaixa atrás de você durante a
  // contagem. No Reciclaverso, fica na plateia, de frente para o palco. Devolve o peso (0 a 1) dela.
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), camU = new THREE.Vector3(), tmp = new THREE.Vector3(), orb = new THREE.Vector3(), orbL = new THREE.Vector3();
  let camW = 0, camOn = false, camH = 0, camY = 0, fovNow = 52;
  const PRS = 1.6;
  // Quanto o chão sobe no desenho a uma distância do centro da área (mesma conta do shader: toda a curva desfeita).
  const FLAT_K = 1 / (2 * PRS), FLAT_R1 = 0.85, FLAT_R3 = 1.3;
  const flatLift = (x, z) => { const r = Math.hypot(x, z); return FLAT_K * (r < FLAT_R1 ? r * r : FLAT_R1 * (2 * Math.min(r, FLAT_R3) - FLAT_R1)); };
  const ground = (x, z) => sag(x, z) + flatLift(x, z) + 0.0068;
  let kartOn = false;
  const kartCam = () => kartOn;
  const camFov = () => fovNow;
  function raceCam(outCam, outLook, outUp, dt) {
    const kart = me && (racing() || race.state === 'grid' || (race.state === 'done' && nowS() - race.doneAt < 3.5)), want = kart || rc.eye || ecoT.on;
    kartOn = !!kart;
    camW += ((want ? 1 : 0) - camW) * (1 - Math.exp(-dt * (st().reduced ? 20 : 2.2)));
    if (camW < 0.001) { camOn = false; fovNow = 52; return 0; }
    if (!kart && ecoT.on) {
      // Expedição: olhos de quem caminha (um leve balanço), olhando o caminho à frente; perto de cada estação, vira
      // para ela.
      const n = nowS(), s = Math.min(eco.L, (n - ecoT.t0) * ECO_SPEED), k = camOn ? 1 - Math.exp(-dt * 5) : 1;
      eco.at(s, tmp); const bob = Math.sin(n * 7) * 0.0012;
      camP.lerp(orb.set(tmp.x, tmp.y + 0.022 + bob, tmp.z), k);
      eco.at(s + 0.07, orbL); orbL.y += 0.016;
      let w = 0, near = null; for (const st of eco.stations) { const d = Math.abs(s - st.s); const ww = 1 - smooth01(0.02, 0.09, d); if (ww > w) { w = ww; near = st; } }
      if (near) orbL.lerp(near.look, w * 0.85);
      camL.lerp(orbL, k); camU.lerp(orb.set(0, 1, 0), k); camOn = true; fovNow = 64;
      outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
      return camW;
    }
    if (!kart) {
      // Tela em pé (celular): as cinco lixeiras precisam caber na largura. A câmera recua na mesma linha de visão e
      // abre um pouco o ângulo, conforme o formato da tela.
      const asp = worldCamera.aspect, tall = Math.max(0, Math.min(1, (1.25 - asp) / 0.8));
      fovNow = 52 + tall * 10;
      if (rc.eye) {
        const { eye, look } = recy, k = camOn ? 1 - Math.exp(-dt * 4) : 1, back = 1 + tall * 0.82;
        tmp.set(look.x + (eye.x - look.x) * back, look.y + (eye.y - look.y) * back + tall * 0.085, look.z + (eye.z - look.z) * back);
        camU.lerp(orb.set(tmp.x, tmp.y + PRS, tmp.z).normalize(), k); camP.lerp(tmp, k); camL.lerp(orbL.set(look.x, look.y - tall * 0.03, look.z), k); camOn = true;
      }
      outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
      return camW;
    }
    const n = nowS(), fresh = !camOn;
    if (fresh) { camH = me.h; camY = me.y; }
    camH += wrapA(me.h - camH) * (1 - Math.exp(-dt * 7)); camY += (me.y - camY) * (1 - Math.exp(-dt * 8));
    // A câmera anda pela própria pista, um trecho atrás do kart (nunca sai do asfalto, nem no viaduto e no laço),
    // e olha um pouco à frente dele.
    const sp = Math.min(1.3, me.v / VMAX), fx = Math.cos(camH), fz = Math.sin(camH), back = 0.064 + sp * 0.016 + me.boost * 0.09;
    trackAt(me.prog - back, (me.lat ?? 0) * 0.6, pt);
    const cx = pt.x, cz = pt.z, cy = pt.y, lx = me.x + fx * 0.075, lz = me.z + fz * 0.075;
    const shake = Math.max(0, 1 - (n - me.hitAt) / 0.35) * 0.0035;
    tmp.set(cx + Math.sin(n * 83) * shake, ground(cx, cz) + cy + 0.0245 + Math.sin(n * 97) * shake, cz);
    orbL.set(lx, ground(lx, lz) + camY + 0.009, lz);
    // Volta de cinema em torno do grid antes da largada; durante a contagem, encaixa atrás do kart.
    const intro = race.state === 'grid' ? 1 : race.state === 'count' ? 1 - Math.min(1, Math.max(0, (n - race.t0) / 1.8)) : 0;
    if (intro > 0 && (race.state === 'count' || !how.hidden)) {                                   // da vitrine para trás do kart, sem pulo
      // Vitrine: enquanto você escolhe a cor, a câmera gira devagar bem perto do seu kart. A mira fica um pouco ao lado
      // dele (na tela larga), para o kart aparecer ao lado da janela de como jogar e não embaixo dela.
      const a = me.h + Math.PI * 0.75 + (n - race.gridAt) * 0.35, r0 = 0.062, wide = worldCamera.aspect > 1.1;
      const cx = me.x + Math.cos(a) * r0, cz = me.z + Math.sin(a) * r0, fx2 = -Math.cos(a), fz2 = -Math.sin(a);
      const w = intro * intro * (3 - 2 * intro), side = wide ? 0.017 * w : 0, up2 = wide ? 0.004 : -0.012;
      tmp.lerp(orb.set(cx, ground(cx, cz) + me.y + 0.028, cz), w);
      orbL.lerp(orb.set(me.x + fz2 * side, ground(me.x, me.z) + me.y + 0.008 + up2 * w, me.z - fx2 * side), w);
    } else if (intro > 0) {
      trackAt(-0.06, 0, pt);
      // Varre só o lado de dentro da pista (de frente para o grid), longe da arquibancada.
      const a = pt.h + Math.PI / 2 + Math.sin((n - race.gridAt) * 0.35) * 1.1, ox = pt.x + Math.cos(a) * 0.14, oz = pt.z + Math.sin(a) * 0.14, w = intro * intro * (3 - 2 * intro);
      orb.set(ox, ground(ox, oz) + 0.115, oz); tmp.lerp(orb, w);
      orbL.lerp(orb.set(pt.x, ground(pt.x, pt.z) + 0.01, pt.z), w);
    }
    const k = fresh ? 1 : 1 - Math.exp(-dt * 9);
    // "Para cima" da câmera é o do chão onde ela está (a pista acompanha a curva do planeta).
    camU.lerp(orb.set(tmp.x, Math.sqrt(Math.max(0, 2.56 - tmp.x * tmp.x - tmp.z * tmp.z)), tmp.z).normalize(), k); camP.lerp(tmp, k); camL.lerp(orbL, k); camOn = true;
    // Campo de visão: bem mais aberto que antes, abrindo mais em alta velocidade e no turbo.
    // No celular em pé o campo de visão abre mais, para a pista à frente e as curvas caberem na tela estreita.
    const tallR = Math.max(0, Math.min(1, (1.25 - worldCamera.aspect) / 0.8));
    fovNow = 60 + tallR * 22 + sp * 7 + Math.min(0.12, me.boost) * 45 - intro * 6;
    outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
    return camW;
  }
  // 4) Fliperama: a câmera chega na frente das máquinas do salão e a tela do Quebra-pixel abre por cima.
  // As jogadas do Quebra-pixel também fazem a turma da calçada reagir (acerto, bônus/fase, bola perdida).
  const arcSfx = (k, p) => { sfx(k, p); if (k === 'hit') arcade.hitAt = rt.clock; else if (k === 'bonus' || k === 'win') arcade.hypeAt = rt.clock; else if (k === 'bad' || k === 'lose') arcade.sadAt = rt.clock; };
  const arc = createArcade({ el: $('.arcade'), on, sfx: arcSfx, buzz, onClose: () => { compact(false); view(null); zoneStatus.textContent = 'Toque nas máquinas ou em Fliperama para jogar de novo.'; } });
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
  const exitable = () => (rc.on || whack.on || race.state !== 'off' || ecoT.on || cl.on) && how.hidden && !arc.on;
  const playing = () => rc.on || whack.on || arc.on || race.state !== 'off' || !how.hidden || ecoT.on || cl.on;
  // Um passo por quadro: os jogos andam e a música abaixa enquanto algum está rolando.
  function whackTick() { const n = nowS(); recyLoop(n); whackLoop(n); raceLoop(n); ecoLoop(n); cleanLoop(n); sound?.setDuck(playing()); }
  // Brinquedos pelo planeta: um clique faz pular e girar.
  function hitToy() {
    if (!st().worldLive || st().cab) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(toys, true)[0];
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) if (toys.includes(o)) return o;
    return null;
  }
  return { exitable, stopGame, startRecycle, startEcoTour, startClean, sortInto, hitBin, startWhack, startRace, startArcade, hitArcade, busyKeys, playing, whacking, racing, raceCam, kartCam, camFov, whackTick, hitWhack, smack, hitToy };
}
