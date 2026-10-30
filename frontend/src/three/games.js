import * as THREE from 'three';
import { R } from './core/math.js';
import { sag } from './world/build.js';
import { worldCamera } from './world/stage.js';
import { rt, toys } from './world/runtime.js';
import { createArcade } from './arcade.js';
import { arcade, game, race, track, trackAt, whack } from './world/zones/jogos.js';

// Minigames da área Jogos (gemas, blocos e corrida de kart) e os cliques nos brinquedos do planeta.
// st() devolve o estado atual do motor (movimento reduzido, área aberta, mundo ativo, cabine).
// compact(v): deixa a barra da área compacta durante a corrida e o fliperama. view(p): leva a câmera até um ponto da
// área ({ at, yaw, pitch, d }, como os pontos de interesse; null volta à visão geral).
export function createGames({ $, on, ray, pointer, zoneStatus, st, compact, view }) {
  // Minigames: placar grande no topo da tela, com dica de como jogar. Usam o relógio real (funcionam com movimento reduzido).
  const hud = $('.game-hud'), hudTitle = hud.querySelector('.gh-title'), hudScore = hud.querySelector('.gh-score'), hudHint = hud.querySelector('.gh-hint'), hudBtn = hud.querySelector('.gh-btn');
  const pad = $('.race-pad');
  function showHud(title, hint, btn) { hud.hidden = false; hud.classList.remove('racing'); hudTitle.textContent = title; hudHint.textContent = hint; hudScore.textContent = ''; hudBtn.hidden = !btn; if (btn) hudBtn.textContent = btn; }
  const nowS = () => performance.now() / 1000;
  const fmt = v => v.toFixed(1).replace('.', ',');
  // Cada jogo leva a câmera até onde ele acontece.
  const VIEWS = { gems: { at: [0, 0.03, -0.04], yaw: 0, pitch: 0.85, d: 1.55 }, whack: { at: [0.19, 0.03, 0.06], yaw: 0, pitch: 1.0, d: 0.44 } };
  function stopGame() {
    game.on = false; for (const m of game.gems) m.visible = false; stopWhack();
    clearTimeout(arcadeTimer); if (arc.on) { arc.close(true); compact(false); }
    if (race.state !== 'off') endRace();
    hud.hidden = true;
  }
  // 1) Caçar as gemas: pegar todas no menor tempo; pegar uma logo depois da outra rende combo.
  function startGame() {
    stopGame(); game.on = true; game.got = 0; game.t0 = nowS(); game.lastAt = -9; game.combo = 0;
    for (const m of game.gems) { m.visible = true; m.userData.got = -1; m.scale.set(1, 1.4, 1); m.material.opacity = 1; }
    view(VIEWS.gems);
    showHud('Caçar as gemas', `Ache e clique nas ${game.gems.length} gemas pelo parque: na roda-gigante, no salão, no telão, na pista...`); zoneStatus.textContent = 'Valendo!';
  }
  function collectGem(m) {
    m.userData.got = rt.clock; if (st().reduced) m.visible = false;
    const n = nowS(); game.combo = n - game.lastAt < 2.5 ? game.combo + 1 : 1; game.lastAt = n;
    game.got++;
    if (game.combo > 1) hudHint.textContent = `Combo ×${game.combo}!`;
    if (game.got === game.gems.length) {
      game.on = false; const tm = nowS() - game.t0; game.best = Math.min(game.best ?? Infinity, tm); game.party.userData.at = rt.clock;
      hudScore.textContent = `${fmt(tm)} s`; hudHint.textContent = `Pegou todas! Recorde: ${fmt(game.best)} s`; zoneStatus.textContent = 'Quer bater o recorde? Toque de novo em Caçar as gemas.';
    }
  }
  // 2) Acerte os blocos: 25 s e cada vez mais rápido; dourado vale +3, vermelho tira 2, o relâmpago dá +3 s.
  const WHACK_TIME = 25, WHACK_HINT = 'Clique nos blocos que saltam! Dourado +3 · Vermelho −2 · Relâmpago +3 s';
  const KIND_COLOR = { gold: '#ffd23f', red: '#ff3b3b', time: '#7fe9ff' };
  const ledDark = new THREE.Color('#0b0618'), ledC = new THREE.Color(), flashC = new THREE.Color();
  function stopWhack() { whack.on = false; for (const c of whack.pads) { c.userData.up = -1; c.visible = false; } }
  function startWhack() {
    stopGame(); whack.on = true; whack.score = 0; whack.t0 = nowS(); whack.end = nowS() + WHACK_TIME; whack.next = nowS() + 0.6; whack.lastTxt = 0; whack.flash = '';
    view(VIEWS.whack); showHud('Acerte os blocos', WHACK_HINT); zoneStatus.textContent = `Valendo! ${WHACK_TIME} segundos.`;
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
    const pace = Math.min(1, (n - whack.t0) / WHACK_TIME);
    if (n >= whack.next) {
      const idle = whack.pads.filter(c => c.userData.up < 0);
      if (idle.length) {
        const c = idle[Math.floor(R() * idle.length)], r = R(), kind = r < 0.12 ? 'gold' : r < 0.28 ? 'red' : r < 0.33 ? 'time' : 'ok', col = KIND_COLOR[kind] || c.userData.base;
        Object.assign(c.userData, { up: n, dur: (0.8 + R() * 0.5) * (1 - pace * 0.35), kind }); c.material.color.set(col); c.material.emissive.set(col);
      }
      whack.next = n + (0.38 + R() * 0.35) * (1 - pace * 0.45);
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
      stopWhack(); whack.best = Math.max(whack.best, whack.score);
      hudScore.textContent = `${whack.score} pts`; hudHint.textContent = (whack.score >= 18 ? 'Mandou muito bem!' : 'Boa! Dá para fazer mais.') + ` Recorde: ${whack.best} pts`;
      zoneStatus.textContent = 'Toque de novo em Acerte os blocos para jogar outra vez.';
      if (whack.score >= 18) game.party.userData.at = rt.clock;
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
  }

  // 3) Corrida de kart: você pilota o kart amarelo contra três rivais, 3 voltas. O kart acelera sozinho;
  // ← → (ou A/D, ou os botões na tela) viram e ↓ freia. Na grama ele perde velocidade; as setas azuis dão turbo.
  const LAPS = 3, VMAX = 0.27, ACC = 0.24, BRAKE = 0.7, VOFF = 0.09, WALL = track.W + 0.034;
  const input = { l: false, r: false, b: false };
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r', ArrowDown: 'b', s: 'b', S: 'b' };
  const racing = () => race.state === 'count' || race.state === 'run';
  on(window, 'keydown', e => { const k = KEYS[e.key]; if (!k || !racing()) return; input[k] = true; e.preventDefault(); });
  on(window, 'keyup', e => { const k = KEYS[e.key]; if (k) input[k] = false; });
  on(window, 'blur', () => { input.l = input.r = input.b = false; });
  for (const b of pad.querySelectorAll('[data-k]')) {
    const k = b.dataset.k, set = v => e => { input[k] = v; e.preventDefault(); };
    on(b, 'pointerdown', set(true)); for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) on(b, ev, set(false));
    on(b, 'contextmenu', e => e.preventDefault());
  }
  const pt = { x: 0, z: 0, h: 0 };
  let me = null, ais = [], best = null, boardKey = '';
  function setLights(red, green) {
    const L = race.lights; for (let k = 0; k < 5; k++) L.setColorAt(k, ledC.set(green ? '#3dff7a' : k < red ? '#ff2a2a' : '#3a1414'));
    L.instanceColor.needsUpdate = true;
  }
  function startRace() {
    stopGame();
    const K = race.karts;
    // Grid: você larga na segunda fila, à esquerda.
    trackAt(-0.085, -0.013, pt);
    me = { k: K[0], x: pt.x, z: pt.z, h: pt.h, v: 0, st: 0, prog: -0.085, lane: -0.013, i: Math.round((track.L - 0.085) / track.ds) % track.N, lap: 0, lapAt: 0, fin: 0, boost: 0 };
    ais = [[K[1], -0.035, -0.013, 0.86], [K[2], -0.035, 0.013, 0.8], [K[3], -0.085, 0.013, 0.83]].map(([k, prog, lane, skill]) => ({ k, prog, lane, skill, v: 0, fin: 0 }));
    for (const a of [me, ...ais]) { trackAt(a.prog, a.lane, pt); a.k.place(pt.x, pt.z, pt.h); }
    Object.assign(race, { state: 'count', t0: nowS(), last: nowS(), order: 0 }); setLights(0, false);
    input.l = input.r = input.b = false;
    showHud('Corrida de kart', 'Você é o kart amarelo. ← → (ou A/D) para virar · ↓ freia · setas azuis no chão dão turbo');
    hud.classList.add('racing'); pad.hidden = false; compact(true); boardKey = '';
    zoneStatus.textContent = `${LAPS} voltas contra Rosa, Azul e Verde. Boa sorte!`;
  }
  function endRace() {
    race.state = 'off'; pad.hidden = true; compact(false);
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
  // Seu kart: vira menos quanto mais rápido, perde velocidade fora do asfalto e bate na barreira.
  function pilot(dt) {
    const { X, Z, TX, TZ, N, L, W, ds } = track;
    const steer = (input.r ? 1 : 0) - (input.l ? 1 : 0); me.st += (steer - me.st) * Math.min(1, dt * 10);
    const off = Math.abs(me.lat ?? 0) > W, top = (off ? VOFF : VMAX) + me.boost;
    if (input.b) me.v = Math.max(0, me.v - BRAKE * dt);
    else if (me.v < top) me.v = Math.min(top, me.v + ACC * dt); else me.v = Math.max(top, me.v - (off ? 0.6 : 0.25) * dt);
    me.boost = Math.max(0, me.boost - dt * 0.12);
    me.h += me.st * 3 * (1 - 0.35 * Math.min(1, me.v / VMAX)) * Math.min(1, me.v / 0.05) * dt;
    me.x += Math.cos(me.h) * me.v * dt; me.z += Math.sin(me.h) * me.v * dt;
    const i = nearestFrom(me.i, me.x, me.z), nx = -TZ[i], nz = TX[i];
    me.lat = (me.x - X[i]) * nx + (me.z - Z[i]) * nz;
    if (Math.abs(me.lat) > WALL) { const push = me.lat - Math.sign(me.lat) * WALL; me.x -= nx * push; me.z -= nz * push; me.lat -= push; me.v = Math.min(me.v, 0.07); }
    let dsI = i - me.i; if (dsI > N / 2) dsI -= N; if (dsI < -N / 2) dsI += N; me.prog += dsI * ds; me.i = i;
    const s = ((me.prog % L) + L) % L;
    for (const p of track.pads) if (s > p.s0 && s < p.s1 && Math.abs(me.lat - p.lat) < 0.014 && me.boost < 0.06) { me.boost = 0.1; me.v = Math.max(me.v, VMAX + 0.08); }
  }
  function drive(dt, n) {
    const { N, L, ds } = track;
    // Depois da chegada o seu kart segue a pista sozinho, desacelerando.
    if (race.state === 'done') { me.prog += me.v * dt; trackAt(me.prog, me.lat ?? 0, pt); me.x = pt.x; me.z = pt.z; me.h = pt.h; } else pilot(dt);
    // Rivais: seguem a linha deles, freiam antes das curvas, aliviam quando abrem vantagem e apertam se você abre.
    for (const a of ais) {
      const ai = Math.floor((((a.prog % L) + L) % L) / ds);
      let lim = 1; for (let k = 0; k < 12; k += 2) lim = Math.min(lim, track.VL[(ai + k) % N]);
      const gap = Math.max(-0.3, Math.min(0.3, (me.prog - a.prog) / L)), rubber = 1 + gap * (gap < 0 ? 0.5 : 0.25);
      const target = lim * a.skill * (a.fin ? 0.6 : rubber);
      a.v = target > a.v ? Math.min(target, a.v + ACC * dt) : Math.max(target, a.v - 0.6 * dt);
      a.prog += a.v * dt;
      trackAt(a.prog, a.lane + Math.sin(n * 0.8 + a.skill * 9) * 0.003, pt); a.x = pt.x; a.z = pt.z; a.k.place(pt.x, pt.z, pt.h);
      // Encostou no rival: os dois se afastam um pouco e você perde velocidade.
      const dx = me.x - a.x, dz = me.z - a.z, d = Math.hypot(dx, dz);
      if (d < 0.019 && d > 1e-5) { const k = (0.019 - d) / d; me.x += dx * k; me.z += dz * k; me.v *= 0.9; }
      if (!a.fin && a.prog >= LAPS * L) a.fin = ++race.order;
    }
    me.k.place(me.x, me.z, me.h);
    // Voltas: tempo de cada uma e melhor volta.
    const lap = Math.floor(me.prog / L);
    if (lap > me.lap && lap >= 1) { const t = n - me.lapAt; best = Math.min(best ?? Infinity, t); me.lapAt = n; me.lastLap = t; }
    me.lap = Math.max(me.lap, lap);
  }
  function raceLoop(n) {
    if (race.state === 'off') return;
    if (!me) { race.state = 'off'; return; }
    const dt = Math.min(0.05, n - race.last); race.last = n;
    if (race.state === 'count') {
      // Semáforo: as cinco luzes acendem em vermelho, apagam juntas e a largada é dada.
      const e = n - race.t0, rem = 3 - e;
      setLights(Math.min(5, Math.floor(e / 0.5)), false);
      hudScore.textContent = rem > 0 ? String(Math.ceil(rem)) : 'JÁ!';
      if (rem <= 0) { race.state = 'run'; me.lapAt = n; setLights(0, true); race.greenAt = n; }
      return;
    }
    if (race.state === 'run') {
      if (n - race.greenAt > 1.2) { setLights(0, false); race.greenAt = Infinity; }
      drive(dt, n);
      const pos = standings().indexOf(me) + 1;
      hudScore.textContent = `Volta ${Math.min(LAPS, me.lap + 1)}/${LAPS} · ${pos}º lugar`;
      if (me.boost > 0.04) hudHint.textContent = 'TURBO!';
      else if (me.lastLap && n - me.lapAt < 2.5) hudHint.textContent = `Volta em ${fmt(me.lastLap)} s · melhor: ${fmt(best)} s`;
      else hudHint.textContent = Math.abs(me.lat ?? 0) > track.W ? 'Volte para o asfalto!' : '← → (ou A/D) para virar · ↓ freia · setas azuis dão turbo';
      board(`VOLTA ${Math.min(LAPS, me.lap + 1)}/${LAPS}`);
      if (me.prog >= LAPS * track.L) {
        me.fin = ++race.order; const win = me.fin === 1;
        race.state = 'done'; race.doneAt = n; pad.hidden = true; input.l = input.r = input.b = false;
        hudScore.textContent = win ? 'Você venceu!' : `${me.fin}º lugar`;
        hudHint.textContent = (win ? 'Que corrida!' : 'Quase! Tente de novo.') + ` Melhor volta: ${fmt(best)} s`;
        zoneStatus.textContent = 'Toque em Corrida de kart para correr de novo.';
        board('CHEGADA'); if (win) race.party.userData.at = rt.clock;
      }
      return;
    }
    // Depois da chegada: todos completam a volta devagar e a câmera volta para o parque.
    me.v = Math.max(0, me.v - 0.15 * dt); drive(dt, n);
    if (n - race.doneAt > 6) endRace();
  }
  // Câmera da corrida: atrás do seu kart, baixinha, seguindo com um leve atraso, com o "para cima" do chão onde
  // o kart está (a área acompanha a curvatura do planeta). Devolve o peso (0 a 1) dela.
  const camP = new THREE.Vector3(), camL = new THREE.Vector3(), camU = new THREE.Vector3(), tmp = new THREE.Vector3();
  let camW = 0, camOn = false;
  const PRS = 1.6;
  function raceCam(outCam, outLook, outUp, dt) {
    const want = racing() || (race.state === 'done' && nowS() - race.doneAt < 3.5);
    camW += ((want ? 1 : 0) - camW) * (1 - Math.exp(-dt * (st().reduced ? 20 : 2.2)));
    if (camW < 0.001 || !me) { camOn = false; return 0; }
    const fx = Math.cos(me.h), fz = Math.sin(me.h), k = camOn ? 1 - Math.exp(-dt * 7) : 1;
    const up = tmp.set(me.x, sag(me.x, me.z) + PRS, me.z).normalize(), cx = me.x - fx * 0.14, cz = me.z - fz * 0.14;
    camU.lerp(up, k);
    camP.lerp(tmp.set(cx, sag(cx, cz) + 0.058, cz), k);
    const lx = me.x + fx * 0.1, lz = me.z + fz * 0.1;
    camL.lerp(tmp.set(lx, sag(lx, lz) + 0.014, lz), k); camOn = true;
    outCam.copy(camP); outLook.copy(camL); outUp.copy(camU).normalize();
    return camW;
  }
  // 4) Fliperama: a câmera chega na frente das máquinas do salão e a tela do Quebra-pixel abre por cima.
  const arc = createArcade({ el: $('.arcade'), on, onClose: () => { compact(false); view(null); zoneStatus.textContent = 'Toque nas máquinas ou em Fliperama para jogar de novo.'; } });
  let arcadeTimer = 0;
  function startArcade() {
    if (arc.on) return;
    stopGame(); compact(true);
    view({ at: arcade.at, yaw: 0, pitch: 0.24, d: 0.3 });
    zoneStatus.textContent = 'Ligando o fliperama…';
    arcadeTimer = setTimeout(() => { arc.start(); zoneStatus.textContent = 'Quebra-pixel: limpe a tela de blocos!'; }, st().reduced ? 0 : 900);
  }
  function hitArcade() {
    if (st().focusZone !== game.zi || arc.on || !arcade.hit) return false;
    ray.setFromCamera(pointer, worldCamera);
    return ray.intersectObject(arcade.hit, false).length > 0;
  }
  const busyKeys = () => racing() || arc.on;
  const playing = () => game.on || whack.on || arc.on || race.state !== 'off';
  function whackTick() { const n = nowS(); if (game.on) hudScore.textContent = `${game.got}/${game.gems.length} · ${fmt(n - game.t0)} s`; whackLoop(n); raceLoop(n); }
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
  return { stopGame, startGame, collectGem, startWhack, startRace, startArcade, hitArcade, busyKeys, playing, racing, raceCam, whackTick, hitWhack, smack, hitToy, hitGem };
}
