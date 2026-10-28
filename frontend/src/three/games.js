import { R, TAU } from './core/math.js';
import { worldCamera } from './world/stage.js';
import { rt, toys } from './world/runtime.js';
import { game, race, whack } from './world/zones/jogos.js';

// Minigames da área Jogos (gemas, blocos e corrida de kart) e os cliques nos brinquedos do planeta.
// st() devolve o estado atual do motor (movimento reduzido, área aberta, mundo ativo, cabine).
export function createGames({ $, on, ray, pointer, zoneStatus, st }) {
  // Minigames: placar grande no topo da tela, com dica de como jogar. Usam o relógio real (funcionam com movimento reduzido).
  const hud = $('.game-hud'), hudTitle = hud.querySelector('.gh-title'), hudScore = hud.querySelector('.gh-score'), hudHint = hud.querySelector('.gh-hint'), hudBtn = hud.querySelector('.gh-btn');
  function showHud(title, hint, btn) { hud.hidden = false; hudTitle.textContent = title; hudHint.textContent = hint; hudScore.textContent = ''; hudBtn.hidden = !btn; if (btn) hudBtn.textContent = btn; }
  const nowS = () => performance.now() / 1000;
  const fmt = v => v.toFixed(1).replace('.', ',');
  function stopGame() { game.on = false; for (const m of game.gems) m.visible = false; stopWhack(); race.state = 'off'; hud.hidden = true; }
  // 1) Caçar as gemas: pegar as 5 no menor tempo.
  function startGame() {
    stopGame(); game.on = true; game.got = 0; game.t0 = nowS();
    for (const m of game.gems) { m.visible = true; m.userData.got = -1; m.scale.set(1, 1.4, 1); m.material.opacity = 1; }
    showHud('Caçar as gemas', 'Clique nas 5 gemas brilhando, o mais rápido que puder!'); zoneStatus.textContent = 'Valendo!';
  }
  function collectGem(m) {
    m.userData.got = rt.clock; if (st().reduced) m.visible = false;
    game.got++;
    if (game.got === game.gems.length) {
      game.on = false; const tm = nowS() - game.t0; game.best = Math.min(game.best ?? Infinity, tm); game.party.userData.at = rt.clock;
      hudScore.textContent = `${fmt(tm)} s`; hudHint.textContent = `Pegou todas! Recorde: ${fmt(game.best)} s`; zoneStatus.textContent = 'Quer bater o recorde? Toque de novo em Caçar as gemas.';
    }
  }
  // 2) Acerte os blocos: 20 s; dourado vale +3, vermelho tira 2.
  const WHACK_HINT = 'Clique nos blocos que saltam! Dourado = +3 · Vermelho = −2';
  function stopWhack() { whack.on = false; for (const c of whack.pads) { c.userData.up = -1; c.visible = false; } }
  function startWhack() {
    stopGame(); whack.on = true; whack.score = 0; whack.end = nowS() + 20; whack.next = nowS() + 0.6; whack.lastTxt = 0; whack.flash = '';
    showHud('Acerte os blocos', WHACK_HINT); zoneStatus.textContent = 'Valendo! 20 segundos.';
  }
  const KIND_COLOR = { gold: '#ffd23f', red: '#ff3b3b' };
  function whackLoop(n) {
    if (!whack.on) return;
    if (n >= whack.next) {
      const idle = whack.pads.filter(c => c.userData.up < 0);
      if (idle.length) {
        const c = idle[Math.floor(R() * idle.length)], r = R(), kind = r < 0.12 ? 'gold' : r < 0.27 ? 'red' : 'ok', col = KIND_COLOR[kind] || c.userData.base;
        Object.assign(c.userData, { up: n, dur: 0.8 + R() * 0.5, kind }); c.material.color.set(col); c.material.emissive.set(col);
      }
      whack.next = n + 0.38 + R() * 0.35;
    }
    for (const c of whack.pads) {
      const u = c.userData; if (u.up < 0) { c.visible = false; continue; }
      const age = n - u.up; if (age > u.dur) { u.up = -1; c.visible = false; continue; }
      const k = Math.min(1, age / 0.12, (u.dur - age) / 0.12);
      c.visible = true; c.position.y = u.y - 0.012 + k * 0.03; c.rotation.y = age * 4;
    }
    if (n - whack.lastTxt > 0.1) { hudScore.textContent = `${whack.score} pts · ${Math.max(0, Math.ceil(whack.end - n))} s`; hudHint.textContent = whack.flash && n - whack.flashAt < 0.7 ? whack.flash : WHACK_HINT; whack.lastTxt = n; }
    if (n >= whack.end) {
      stopWhack(); whack.best = Math.max(whack.best, whack.score);
      hudScore.textContent = `${whack.score} pts`; hudHint.textContent = (whack.score >= 12 ? 'Mandou muito bem!' : 'Boa! Dá para fazer mais.') + ` Recorde: ${whack.best} pts`;
      zoneStatus.textContent = 'Toque de novo em Acerte os blocos para jogar outra vez.';
      if (whack.score >= 12) game.party.userData.at = rt.clock;
    }
  }
  function hitWhack() {
    if (st().focusZone !== game.zi || !whack.on) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(whack.pads.filter(c => c.userData.up >= 0), true)[0];
    return hit ? hit.object.userData.whack || hit.object : null;
  }
  function smack(c) {
    const kind = c.userData.kind, d = kind === 'gold' ? 3 : kind === 'red' ? -2 : 1;
    c.userData.up = -1; c.visible = false; whack.score = Math.max(0, whack.score + d);
    whack.flash = d > 1 ? '+3! Bloco dourado!' : d < 0 ? '−2… era vermelho!' : '+1'; whack.flashAt = nowS(); whack.lastTxt = 0;
    if (d > 0) { whack.pop.position.copy(c.position); whack.pop.userData.at = rt.clock; }
  }
  // 3) Corrida de kart: 3 voltas contra o kart azul; cada toque em ACELERAR dá um impulso.
  function startRace() {
    stopGame(); Object.assign(race, { state: 'count', t0: nowS(), p: 0, c: 0, v: 0, last: nowS() });
    showHud('Corrida de kart', 'Você é o kart amarelo. Aperte ACELERAR (ou a barra de espaço) bem rápido!', 'ACELERAR!'); zoneStatus.textContent = '3 voltas. Boa sorte!';
  }
  function boost() { if (race.state === 'run') race.v = Math.min(race.v + 0.6, 3.6); }
  on(hudBtn, 'click', boost);
  on(window, 'keydown', e => { if ((race.state === 'run' || race.state === 'count') && e.key === ' ') { e.preventDefault(); boost(); } });
  function raceLoop(n) {
    if (race.state === 'off') return;
    const dt = Math.min(0.1, n - race.last); race.last = n;
    if (race.state === 'count') { const rem = 3 - (n - race.t0); hudScore.textContent = rem > 0 ? String(Math.ceil(rem)) : 'JÁ!'; if (rem <= 0) race.state = 'run'; return; }
    if (race.state === 'run') {
      race.v *= Math.exp(-dt * 1.1); race.p += (0.35 + race.v) * dt; race.c += 1.5 * dt;
      const total = 3 * TAU;
      hudScore.textContent = `Volta ${Math.min(3, Math.floor(race.p / TAU) + 1)}/3 · ${race.p >= race.c ? '1º' : '2º'} lugar`;
      if (race.p >= total || race.c >= total) {
        const win = race.p >= total && race.p >= race.c; race.state = 'done'; race.doneAt = n; hudBtn.hidden = true;
        hudScore.textContent = win ? 'Você venceu!' : '2º lugar';
        hudHint.textContent = win ? 'Que corrida! Toque em Corrida de kart para correr de novo.' : 'O kart azul ganhou por pouco. Tente de novo!';
        if (win) game.party.userData.at = rt.clock;
      }
      return;
    }
    if (n - race.doneAt > 6) race.state = 'off';
  }
  function whackTick() { const n = nowS(); if (game.on) hudScore.textContent = `${game.got}/5 · ${fmt(n - game.t0)} s`; whackLoop(n); raceLoop(n); }
  // Brinquedos pelo planeta: um clique faz pular e girar.
  function hitToy() {
    if (!st().worldLive || st().cab) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(toys, true)[0];
    if (!hit) return null;
    for (let o = hit.object; o; o = o.parent) if (toys.includes(o)) return o;
    return null;
  }
  function hitGem() {
    if (st().focusZone !== game.zi || !game.on) return null;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(game.gems.filter(m => m.visible && m.userData.got < 0), true)[0];
    return hit ? hit.object.userData.gem || hit.object : null;
  }
  return { stopGame, startGame, collectGem, startWhack, startRace, boost, whackTick, hitWhack, smack, hitToy, hitGem };
}
