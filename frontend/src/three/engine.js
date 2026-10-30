import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { R, TAU, UP, clamp, easeOut, mix, smooth, smoother } from './core/math.js';
import { dpr } from './core/quality.js';
import { DS, LENS_R, LENS_X, LENS_Z, NAME, W, camera, cosmosUniforms, display, displayUniforms, dustUniforms, frontAt, glowM, introScene, ledBase, ledM, lensRims, lensWindows, rig, rimGroup, rimScene, rimUniforms, shadow, strapFade, strapGroup, underglow } from './intro/headset.js';
import { atmoUniforms, atmosphere, balloons, cloudM, clouds, formPts, formUniforms, islands, orbit, planet, tilt, worldStencil, zoneMarks } from './world/planet.js';
import { cabin, updateCabin } from './world/cabin.js';
import { railPt, railTan } from './world/rail.js';
import { animated, rt, toys, trains, zoneFx, zoneFx2 } from './world/runtime.js';
import { skyUniforms, worldCamera, worldScene } from './world/stage.js';
import { PR, RAIL_R, TRAIN_SPEED } from './world/terrain.js';
import { ZONES } from './world/zones.js';
import { ZONE_COLORS } from './zoneNames.js';
import { game } from './world/zones/jogos.js';
import { createGames } from './games.js';
import { createMusic } from './music.js';
import { revealEdge, revealUniforms } from './world/reveal.js';

// Motor da abertura: capa com o óculos, entrada pelo visor e o planeta Miniverso.
// createMiniverso(rootEl) liga tudo dentro do elemento do componente e devolve dispose() para desligar.
export function createMiniverso(rootEl, opts = {}) {
  const offs = [];
  const on = (target, type, fn, options) => { target.addEventListener(type, fn, options); offs.push(() => target.removeEventListener(type, fn, options)); };
  let raf = 0, disposed = false, sentProgress = -1, sentReduced = null, sentPassed = null;
  rt.gameTick = () => whackTick();

  const $ = s => rootEl.querySelector(s);
  const root = rootEl, intro = rootEl, stage = $('.stage'), canvas = $('.scene-canvas'), motionBtn = $('.motion-toggle');
  const nameRow = $('.name-row'), capaEl = $('.capa'), zoneCard = $('.zone-card'), labels = [...rootEl.querySelectorAll('.zone-label')];

  let reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!cabin.parent) worldScene.add(cabin);
  // Nível de detalhe: as miudezas animadas de cada área (pessoas, carros, aves, boias, confete...) só aparecem e só
  // são calculadas com a área aberta. Na vista do planeta ficam o relevo, as construções, os trens, os satélites,
  // os balões e as máquinas grandes. Miudeza = marcada com userData.detail, ou peça animada ou solta na área com
  // menos de ~6 cm.
  const details = [];
  {
    const zoneOf = o => { for (let a = o; a; a = a.parent) { const i = ZONES.findIndex(z => z.group === a); if (i >= 0) return i; } return -1; };
    const box = new THREE.Box3(), size = new THREE.Vector3();
    ZONES.forEach((z, i) => z.group.traverse(o => { if (o.userData.detail) details.push([o, i]); }));
    const small = o => { box.setFromObject(o); return !box.isEmpty() && box.getSize(size).length() < 0.06; };
    for (const a of animated) {
      if (a.userData.detail) continue;
      const zi = zoneOf(a); if (zi >= 0 && small(a)) { a.userData.detail = true; details.push([a, zi]); }
    }
    // Peças soltas pequenas que uma máquina movimenta (minério na correia, poeira, jatos d'água...).
    ZONES.forEach((z, i) => { for (const o of z.group.children) if (!o.userData.detail && !o.userData.anim && small(o)) { o.userData.detail = true; details.push([o, i]); } });
  }
  let detailZone = null;
  const showDetails = zi => { if (zi === detailZone) return; detailZone = zi; for (const [o, i] of details) o.visible = i === zi; };
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, stencil: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x0c0407, 1);
  renderer.autoClear = false;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.06).texture;
  introScene.environment = envMap;

  // ───────────── Interação ─────────────
  const pointer = new THREE.Vector2(9, 9), ray = new THREE.Raycaster();
  let drag = null, userY = 0, userX = 0, rotY = 0, rotX = 0, idleAt = 0, rippleAt = -1, hoverVisor = 0, hoverZone = -1;
  let eased = 0, lockNow = 0, worldLive = false, velX = 0, velY = 0, mx = 0, my = 0;
  // Orientação do planeta (giro livre em 360°): arrastar para os lados gira em torno do eixo vertical da tela,
  // arrastar para cima/baixo em torno do eixo horizontal.
  const orient = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.32, 0, -0.12)), qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const XAX = new THREE.Vector3(1, 0, 0), FACE = new THREE.Vector3(0, 0.3, 1).normalize();
  const turnPlanet = (ax, ay) => { orient.premultiply(qa.setFromAxisAngle(UP, ay)).premultiply(qa.setFromAxisAngle(XAX, ax)).normalize(); };
  // Cabine: a câmera vai para a frente da locomotiva do trem carregado.
  let cab = false, cabT = 0, cabStart = 0, cabTrain = 0, hoverTrain = -1;
  const trainTip = $('.train-tip');
  // Zoom numa área do planeta: a câmera voa até ela e um cartão explica o que é.
  let focusZone = -1, lastFocus = 0, focusT = 0, barH = 0, camLift = 0;
  // Órbita em volta da área focada: giro (yaw), inclinação (pitch, até quase de cima) e distância.
  // Ao abrir, a área aparece um pouco afastada (vista do conjunto); o zoom vai de bem perto até o dobro da distância.
  const ZD = 1.35, ZD_MIN = 0.35, ZD_MAX = 2;
  // Centro da órbita: começa no ponto da área (focus) e, ao aproximar com a roda, anda para o que está sob o cursor.
  const zF = new THREE.Vector3(), zFT = new THREE.Vector3(), zF0 = new THREE.Vector3(), lo = new THREE.Vector3(), ld = new THREE.Vector3();
  const zoneFocus = i => zF0.fromArray(ZONES[i].focus || [0, 0.035, 0]);
  let zYaw = 0.06, zPitch = 0.36, zDist = ZD, zYawT = 0.06, zPitchT = 0.36, zDistT = ZD;
  // Apresentação de uma área (o boi no palco): a câmera vai até a plateia; arrastar, rolar ou as setas devolvem o controle.
  let show = false, showT = 0;
  const showCam = new THREE.Vector3(), showLook = new THREE.Vector3();
  // Corrida de kart: a câmera desce para trás do seu kart (games.js diz onde e com que peso).
  const raceCamP = new THREE.Vector3(), raceLook = new THREE.Vector3(), raceUp = new THREE.Vector3();
  let raceW = 0;
  const zoneAct = zoneCard.querySelector('.zone-act'), zoneAct2 = zoneCard.querySelector('.zone-act2'), zoneAct3 = zoneCard.querySelector('.zone-act3'), zoneAct4 = zoneCard.querySelector('.zone-act4'), zoneStatus = zoneCard.querySelector('.zone-status');
  const zoneMore = zoneCard.querySelector('.zone-more'), zoneInfo = zoneCard.querySelector('.zone-info'), zoneClose = zoneCard.querySelector('.zone-close');
  // Pontos de interesse: marcadores numerados na cena; a câmera voa até cada detalhe e a barra mostra uma legenda
  // curta. O tour passa por todos sozinho; arrastar, rolar ou as setas do teclado devolvem o controle.
  const zoneTour = zoneCard.querySelector('.zone-tour'), poiName = zoneCard.querySelector('.poi-name'), poiCount = zoneCard.querySelector('.poi-count'), poiText = zoneCard.querySelector('.poi-text'), poiPlay = zoneCard.querySelector('.poi-play'), poiLayer = $('.pois');
  const TOUR_STEP = 7;
  // Música do planeta (music.js): começa baixinho na formação do planeta; botão no canto para desligar.
  const music = createMusic(), soundBtn = $('.sound-toggle');
  const syncSound = () => { soundBtn.setAttribute('aria-pressed', String(music.enabled)); $('.sound-chip').setAttribute('aria-pressed', String(music.enabled)); soundBtn.setAttribute('aria-label', music.enabled ? 'Desligar a música' : 'Ligar a música'); soundBtn.querySelector('span').textContent = music.enabled ? 'Música' : 'Sem música'; };
  syncSound();
  on(soundBtn, 'click', () => { music.setEnabled(!music.enabled); syncSound(); });
  // Chave "Som" na barra da capa, junto dos outros ajustes da abertura (mesma escolha do botão do planeta).
  const soundChip = $('.sound-chip');
  on(soundChip, 'click', () => { music.setEnabled(!music.enabled); syncSound(); });
  on(document, 'pointerdown', () => music.wake(), true);
  on(document, 'keydown', () => music.wake(), true);
  on(document, 'visibilitychange', () => music.refresh());
  offs.push(() => music.dispose());
  let poi = -1, tour = false, tourAt = 0, markers = [];
  const poisOf = i => ZONES[i]?.pois || [];
  const zMin = () => poisOf(focusZone).length ? Math.min(ZD_MIN, 0.2 / (0.745 * (ZONES[focusZone].view || 1))) : ZD_MIN;
  // Leva a câmera a um ponto da área aberta ({ at, yaw, pitch, d }; sem ponto, à visão geral).
  function aim(p) {
    const i = focusZone; if (i < 0) return;
    const ty = p ? p.yaw : ZONES[i].yaw ?? 0.06;
    zYawT = zYaw + ((ty - zYaw) % TAU + TAU * 1.5) % TAU - TAU / 2;                    // pelo lado mais curto
    zPitchT = p ? p.pitch : ZONES[i].pitch ?? 0.36; zDistT = p ? p.d / (0.745 * (ZONES[i].view || 1)) : ZD;
    if (p) zFT.fromArray(p.at); else zFT.copy(zoneFocus(i));
    show = false;
  }
  function poiSet(n, move = true) {
    const i = focusZone, ps = poisOf(i); if (!ps.length) return;
    poi = n; const p = ps[n];
    if (move) aim(p);
    poiName.textContent = p ? p.name : 'Visão geral';
    poiCount.textContent = p ? `${n + 1} / ${ps.length}` : `${ps.length} pontos`;
    poiText.textContent = p ? p.text : 'Toque num número na cena para ver de perto, ou siga o tour pela área.';
    markers.forEach((m, k) => m.classList.toggle('on', k === n));
  }
  function buildMarkers(i) {
    poiLayer.replaceChildren(); poiLayer.style.setProperty('--c', ZONE_COLORS[i]);
    markers = poisOf(i).map((p, k) => {
      const b = document.createElement('button'), num = document.createElement('b'), label = document.createElement('span');
      b.type = 'button'; b.className = 'poi'; b.tabIndex = -1; num.textContent = k + 1; label.textContent = p.name; b.append(num, label);
      b.addEventListener('click', () => { tourStop(); poiSet(k); });
      poiLayer.append(b); return b;
    });
  }
  function tourStop() { tour = false; poiPlay.setAttribute('aria-pressed', 'false'); }
  on(poiPlay, 'click', () => {
    if (tour) return tourStop();
    tour = true; tourAt = performance.now() / 1000; poiPlay.setAttribute('aria-pressed', 'true');
    poiSet((poi + 1) % poisOf(focusZone).length);
  });
  const poiStep = d => { const n = poisOf(focusZone).length; if (!n) return; tourStop(); poiSet(((poi + 1 + d) % (n + 1) + n + 1) % (n + 1) - 1); }; // a visão geral entra na volta
  on(zoneCard.querySelector('.poi-prev'), 'click', () => poiStep(-1));
  on(zoneCard.querySelector('.poi-next'), 'click', () => poiStep(1));
  // Texto completo da área numa gaveta; enquanto a pessoa mexe na cena, a barra fica quase transparente.
  const infoOpen = v => { zoneCard.classList.toggle('open', v); zoneInfo.setAttribute('aria-expanded', String(v)); };
  on(zoneInfo, 'click', () => infoOpen(!zoneCard.classList.contains('open')));
  let busyTimer = 0;
  const busy = () => { tourStop(); infoOpen(false); zoneCard.classList.add('busy'); clearTimeout(busyTimer); busyTimer = setTimeout(() => zoneCard.classList.remove('busy'), 900); };
  offs.push(() => clearTimeout(busyTimer));
  function openZone(i) {
    if (!worldLive) return;
    const fresh = focusZone !== i;
    if (fresh) stopGame();
    if (fresh) show = false;
    if (fresh) { zYawT = ZONES[i].yaw ?? 0.06; zPitchT = ZONES[i].pitch ?? 0.36; zDistT = ZD; zFT.copy(zoneFocus(i)); if (focusZone < 0) { zYaw = zYawT; zPitch = zPitchT; zDist = zDistT; zF.copy(zFT); } }
    focusZone = lastFocus = i; canvas.classList.add('orbiting');
    if (fresh) { buildMarkers(i); tourStop(); infoOpen(false); poiSet(-1, false); }
    zoneCard.querySelector('h3').textContent = ZONES[i].name;
    zoneCard.style.setProperty('--c', ZONE_COLORS[i]);
    zoneCard.querySelector('.zone-index').textContent = `Área ${String(i + 1).padStart(2, '0')} / ${String(ZONES.length).padStart(2, '0')}`;
    zoneCard.querySelector('.zone-text').textContent = ZONES[i].text;
    zoneAct.textContent = ZONES[i].act; zoneStatus.textContent = '';
    cab = false; cardCompact(false); zoneAct2.hidden = !ZONES[i].act2; zoneAct2.textContent = ZONES[i].act2 || '';
    zoneAct3.hidden = !ZONES[i].act3; zoneAct3.textContent = ZONES[i].act3 || '';
    zoneAct4.hidden = !ZONES[i].act4; zoneAct4.textContent = ZONES[i].act4 || '';
    zoneCard.hidden = false;
  }
  // Na cabine a barra fica compacta (título, botões e status), para não tampar a vista.
  function cardCompact(on) { for (const el of [zoneMore, zoneInfo, zoneClose, zoneAct]) el.hidden = on; zoneTour.hidden = on || !poisOf(focusZone).length; zoneCard.classList.toggle('compact', on); if (on) { infoOpen(false); tourStop(); } }
  function closeZone() { cardCompact(false); focusZone = -1; show = false; canvas.classList.remove('orbiting'); cab = false; trainTip.hidden = true; zoneCard.hidden = true; stopGame(); tourStop(); infoOpen(false); poi = -1; markers = []; poiLayer.replaceChildren(); }
  on(zoneAct2, 'click', () => {
    const i = focusZone; if (i < 0) return;
    const kind = ZONES[i].kind2;
    if (kind === 'cab') { if (cab) exitCab(); else enterCab(0); }
    else if (kind === 'whack') startWhack();
    else { zoneFx2[i] = clock; zoneStatus.textContent = ZONES[i].done2; }
  });
  on(zoneAct3, 'click', () => { if (focusZone === game.zi) startRace(); });
  on(zoneAct4, 'click', () => { if (focusZone === game.zi) startArcade(); });
  on(zoneClose, 'click', closeZone);
  // Pequena interação de cada área.
  on(zoneAct, 'click', () => {
    const i = focusZone; if (i < 0) return;
    zoneFx[i] = clock; show = !!ZONES[i].show;
    if (i === game.zi) startGame(); else zoneStatus.textContent = ZONES[i].done;
  });
  // Cabine de qualquer um dos trens (pelo botão da Ferrovia ou clicando no trem).
  function enterCab(k) {
    const fz = ZONES.findIndex(z => z.kind2 === 'cab');
    if (focusZone !== fz) openZone(fz);
    cabStart = trains[k].start; cabTrain = k; cab = true; trainTip.hidden = true;
    zoneAct2.textContent = 'Sair da cabine'; cardCompact(true);
    zoneStatus.textContent = `Na cabine do trem ${trains[k].label}, seguindo a ferrovia pelo planeta.`;
  }
  function exitCab() { cab = false; cardCompact(false); if (focusZone >= 0) zoneAct2.textContent = ZONES[focusZone].act2 || ''; zoneStatus.textContent = ''; }
  function hitTrain() {
    if (!worldLive || cab) return -1;
    ray.setFromCamera(pointer, worldCamera);
    const hit = ray.intersectObjects(trains.map(t => t.group), true)[0];
    if (!hit) return -1;
    return trains.findIndex(t => { for (let o = hit.object; o; o = o.parent) if (o === t.group) return true; return false; });
  }
  // Minigames: placar grande no topo da tela, com dica de como jogar (ver games.js).
  const { stopGame, startGame, collectGem, startWhack, startRace, startArcade, hitArcade, busyKeys, playing, racing, raceCam, whackTick, hitWhack, smack, hitToy, hitGem } = createGames({
    $, on, ray, pointer, zoneStatus, st: () => ({ reduced, focusZone, worldLive, cab }), compact: v => cardCompact(v), view: p => { tourStop(); aim(p); } });
  labels.forEach((el, i) => on(el, 'click', () => openZone(i)));
  on(window, 'keydown', e => { if (e.key === 'Escape' && focusZone >= 0 && !cab && cabT === 0) closeZone(); });

  const toNdc = e => { const r = canvas.getBoundingClientRect(); pointer.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); };
  function hitVisor() {
    if (lockNow > 0.5) return null;
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObject(display)[0];
    return hit ? new THREE.Vector2((hit.uv.x - 0.5) * 2, (hit.uv.y - 0.5) * 2) : null;
  }
  function hitZone() {
    if (!worldLive) return -1;
    ray.setFromCamera(pointer, worldCamera);
    const hits = ray.intersectObjects(zoneMarks.map(z => z.hit), false);
    return hits.length ? zoneMarks.findIndex(z => z.hit === hits[0].object) : -1;
  }
  const ripple = at => { displayUniforms.uRipP.value.copy(at); rippleAt = performance.now(); };

  // Na cabine (e durante a transição) o mundo não responde: só o botão de sair, no cartão.
  const inCab = () => cab || cabT > 0.001;
  on(canvas, 'pointermove', e => {
    toNdc(e);
    if (inCab()) { hoverZone = hoverTrain = -1; trainTip.hidden = true; canvas.classList.remove('pointing'); return; }
    if (drag && drag.id === e.pointerId) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
      if (drag.mode === 'headset') { userY = drag.y0 + dx * 0.008; userX = clamp(drag.x0 + dy * 0.004, -0.5, 0.5); }
      if (drag.mode === 'planet' && focusZone >= 0 && !cab) {
        zYawT -= (e.clientX - drag.lx) * 0.006; zPitchT = clamp(zPitchT + (e.clientY - drag.ly) * 0.005, 0.18, 1.45); show = false;
        if (drag.moved) busy();
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = performance.now();
      } else if (drag.mode === 'planet') {
        const sx = (e.clientX - drag.lx) * 0.006, sy = (e.clientY - drag.ly) * 0.006, sec = Math.max(0.016, (performance.now() - drag.lt) / 1000);
        turnPlanet(sy, sx); velY = sx / sec; velX = sy / sec;
        drag.lx = e.clientX; drag.ly = e.clientY; drag.lt = performance.now();
      }
      idleAt = performance.now();
    }
    const h = hitVisor(); hoverVisor = h ? 1 : 0; if (h) displayUniforms.uPoint.value.copy(h);
    hoverZone = hitZone();
    hoverTrain = drag ? -1 : hitTrain();
    trainTip.hidden = hoverTrain < 0;
    if (hoverTrain >= 0) { const r = canvas.getBoundingClientRect(); trainTip.style.transform = `translate(${(e.clientX - r.left + 14).toFixed(0)}px, ${(e.clientY - r.top + 14).toFixed(0)}px)`; }
    canvas.classList.toggle('pointing', (hoverZone >= 0 || hoverTrain >= 0 || !!hitGem() || !!hitWhack() || hitArcade() || !!hitToy()) && !drag);
  });
  on(canvas, 'pointerleave', () => { hoverVisor = 0; hoverZone = -1; hoverTrain = -1; trainTip.hidden = true; });
  on(canvas, 'pointerdown', e => {
    toNdc(e);
    const mode = worldLive ? 'planet' : (!reduced && lockNow < 0.5 ? 'headset' : null);
    if (!mode || (mode === 'planet' && inCab())) return;
    drag = { id: e.pointerId, mode, x: e.clientX, y: e.clientY, y0: userY, x0: userX, lx: e.clientX, ly: e.clientY, lt: performance.now(), moved: false };
    canvas.setPointerCapture(e.pointerId); canvas.classList.add('dragging');
    if (mode === 'planet') velX = velY = 0;
  });
  const endDrag = e => {
    if (!drag || drag.id !== e.pointerId) return;
    if (!drag.moved && e.type === 'pointerup' && drag.mode === 'headset') { const h = hitVisor(); if (h) ripple(h); }
    if (!drag.moved && e.type === 'pointerup' && drag.mode === 'planet') {
      toNdc(e); const gem = hitGem();
      const block = gem ? null : hitWhack(), cabinet = !gem && !block && hitArcade(), toy = gem || block || cabinet ? null : hitToy();
      if (gem) collectGem(gem);
      else if (block) smack(block);
      else if (cabinet) startArcade();
      else if (toy) toy.userData.kick = clock;
      else if (hitTrain() >= 0) enterCab(hitTrain());
      else { const zi = hitZone(); if (zi >= 0) openZone(zi); }
    }
    if (drag.mode === 'planet' && performance.now() - drag.lt > 80) velX = velY = 0;
    drag = null; canvas.classList.remove('dragging'); idleAt = performance.now();
    if (e.pointerType !== 'mouse') { hoverVisor = 0; hoverZone = -1; }
  };
  on(canvas, 'pointerup', endDrag);
  // Aproximar leva o centro da órbita na direção do ponto do chão sob o cursor (como num mapa); afastar o devolve
  // aos poucos ao centro da área. O centro fica dentro da área.
  function zoomAt(e, k) {
    if (focusZone < 0 || k === 1) return;
    const zg = ZONES[focusZone].group; toNdc(e); ray.setFromCamera(pointer, worldCamera);
    lo.copy(ray.ray.origin); zg.worldToLocal(lo); ld.copy(ray.ray.origin).add(ray.ray.direction); zg.worldToLocal(ld); ld.sub(lo);
    if (k < 1 && ld.y < -1e-4) { const t = (zFT.y - lo.y) / ld.y; zFT.x += (lo.x + ld.x * t - zFT.x) * (1 - k); zFT.z += (lo.z + ld.z * t - zFT.z) * (1 - k); }
    if (k > 1) zFT.lerp(zoneFocus(focusZone), Math.min(1, (k - 1) * 1.5));
    const R = (ZONES[focusZone].R || 0.33) * 1.25, d = Math.hypot(zFT.x, zFT.z); if (d > R) { zFT.x *= R / d; zFT.z *= R / d; }
  }
  on(canvas, 'wheel', e => { if (focusZone < 0) return; e.preventDefault(); e.stopPropagation(); if (inCab()) return; show = false; busy(); const before = zDistT; zDistT = clamp(zDistT * Math.exp(e.deltaY * 0.0012), Math.min(zMin(), zDistT), ZD_MAX); zoomAt(e, zDistT / before); }, { passive: false });
  on(canvas, 'pointercancel', endDrag);
  on(canvas, 'keydown', e => {
    const k = e.key;
    if (worldLive && (inCab() || busyKeys())) return;
    if (worldLive && focusZone >= 0 && !cab && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '-'].includes(k)) {
      if (k === 'ArrowLeft') zYawT += 0.3; else if (k === 'ArrowRight') zYawT -= 0.3;
      else if (k === 'ArrowUp') zPitchT = clamp(zPitchT + 0.15, 0.18, 1.45); else if (k === 'ArrowDown') zPitchT = clamp(zPitchT - 0.15, 0.18, 1.45);
      else zDistT = clamp(zDistT * (k === '+' ? 0.85 : 1.18), Math.min(zMin(), zDistT), ZD_MAX);
      show = false; busy(); e.preventDefault(); return;
    }
    if (worldLive && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k)) {
      if (k === 'ArrowLeft') velY -= 1.2; else if (k === 'ArrowRight') velY += 1.2; else if (k === 'ArrowUp') velX -= 1.2; else velX += 1.2;
      e.preventDefault(); return;
    }
    if (k === 'ArrowLeft') userY -= 0.35; else if (k === 'ArrowRight') userY += 0.35;
    else if (k === 'ArrowUp') userX = clamp(userX - 0.15, -0.5, 0.5); else if (k === 'ArrowDown') userX = clamp(userX + 0.15, -0.5, 0.5);
    else if (k === 'Home') { userY = 0; userX = 0; }
    else if (k === 'Enter' || k === ' ') ripple(new THREE.Vector2(0, 0));
    else return;
    e.preventDefault(); idleAt = performance.now();
  });
  on(window, 'pointermove', e => { mx = e.clientX / innerWidth * 2 - 1; my = e.clientY / innerHeight * 2 - 1; }, { passive: true });

  const setReduced = v => {
    reduced = v; root.classList.toggle('reduced', v);
    motionBtn.setAttribute('aria-pressed', String(v));
  };
  on(motionBtn, 'click', () => { setReduced(!reduced); if (reduced) auto = null; });
  setReduced(reduced);

  const HALF_W = 1.83, HALF_H = 0.95;
  let nameWidth = 1, miniW = 120, versoW = 160;
  const miniEl = $('.mini'), versoEl = $('.verso');
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = worldCamera.aspect = w / h;
    camera.updateProjectionMatrix(); worldCamera.updateProjectionMatrix(); camLift = -1;
    cosmosUniforms.uAspect.value = skyUniforms.uAspect.value = w / h;
    nameWidth = nameRow.offsetWidth || 1;
    miniW = miniEl.offsetWidth || miniW; versoW = versoEl.offsetWidth || versoW;
  }
  on(window, 'resize', resize); resize();
  document.fonts.ready.then(() => { if (!disposed) resize(); });

  let visible = true;
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; }); io.observe(intro);

  // Abertura automática: rolando um pouco, mini e verso se juntam; dali em diante a abertura segue sozinha.
  // Ligada por padrão, pode ser desligada (fica lembrado). Rolar para cima devolve o controle.
  const AUTO_KEY = 'miniverso-abertura-auto', JOINED = 0.02;                     // um gesto de rolagem já dispara a abertura
  let autoOn = true, auto = null, touchY = 0;
  try { autoOn = localStorage.getItem(AUTO_KEY) !== '0'; } catch {}
  const autoBtn = $('.auto-toggle');
  function setAutoOn(v, save) {
    autoOn = v; if (!v) auto = null;
    autoBtn.setAttribute('aria-pressed', String(v));
    if (save) try { localStorage.setItem(AUTO_KEY, v ? '1' : '0'); } catch {}
  }
  on(autoBtn, 'click', () => setAutoOn(!autoOn, true));
  setAutoOn(autoOn, false);
  const introEnd = () => intro.offsetTop + intro.offsetHeight - innerHeight;
  let lastProgress = clamp(scrollY / introEnd());
  // Dois trechos: o óculos vem até o rosto e entra (~3,4 s, ágil mas sem pressa) e o planeta se forma (com calma, ~7 s).
  const SPLIT = 0.42, AUTO_IN = 3400, AUTO_PLANET = 6800;
  function startAuto() {
    const end = introEnd(), split = Math.max(end * SPLIT, scrollY);
    auto = { from: scrollY, split, to: end, start: performance.now(), d1: AUTO_IN * clamp((split - scrollY) / (end * (SPLIT - JOINED))), d2: AUTO_PLANET };
  }
  // Três lugares, cada um no seu canto, ligados por um portal:
  // - capa: a abertura (óculos e formação do planeta) só anda para a frente; rolar para cima não a desfaz;
  // - planeta: rolar não sai dele; "Explorar o site" vai às seções e "Voltar ao início" volta à capa;
  // - site: rolar para cima para no topo das seções (a trava age antes de passar) e o planeta nem é desenhado;
  //   "Voltar ao planeta" (botão flutuante) volta ao planeta já pronto.
  // Os links do menu levam à seção (pelo portal, se vierem da capa ou do planeta); o logo volta ao início.
  // Durante o portal, a rolagem da pessoa é ignorada.
  const siteTop = () => intro.offsetTop + intro.offsetHeight;
  const exitBtn = $('.planet-exit'), homeBtn = $('.planet-home'), backBtn = document.querySelector('.back-planet');
  const travel = document.querySelector('.travel'), travelLabel = travel?.querySelector('.travel-label');
  const SECTIONS = { sobre: 'O estúdio', portfolio: 'Projetos', contato: 'Contato' };
  let place = 'capa', maxY = 0, freeUntil = 0, travelling = false;
  const free = () => travelling || performance.now() < freeUntil;
  function setPlace(p) {
    place = p; if (p === 'capa') maxY = scrollY;
    rootEl.classList.toggle('away', p === 'site');
    if (backBtn) { backBtn.classList.toggle('show', p === 'site'); backBtn.tabIndex = p === 'site' ? 0 : -1; }
  }
  const nudge = () => { if (!exitBtn) return; exitBtn.classList.remove('nudge'); void exitBtn.offsetWidth; exitBtn.classList.add('nudge'); };
  // Portal: um círculo com borda ciana se abre a partir do botão clicado e cobre a tela (fundo índigo estrelado, mini
  // planeta com anel, destino e linha de carregamento); a página salta para o destino sem refazer a abertura e o
  // círculo se fecha no centro, revelando o lugar novo.
  function travelTo(y, label, dest, from, after) {
    if (travelling || !travel) return;
    auto = null; travelling = true;
    const r = from?.getBoundingClientRect?.();
    travel.style.setProperty('--ox', r ? `${(r.left + r.width / 2).toFixed(0)}px` : '50%');
    travel.style.setProperty('--oy', r ? `${(r.top + r.height / 2).toFixed(0)}px` : '50%');
    travelLabel.textContent = label; travel.classList.remove('out'); travel.classList.add('on');
    const k = reduced ? 0.15 : 1;
    setTimeout(() => {
      const top = typeof y === 'function' ? y() : y;
      rootEl.classList.remove('away');
      scrollTo({ top, behavior: 'instant' }); eased = lastProgress = clamp(top / introEnd()); setPlace(dest);
      if (after) after(); else opts.cleanUrl?.();
      travel.classList.add('out');
      setTimeout(() => { travel.classList.remove('on', 'out'); travelling = false; freeUntil = performance.now() + 150; }, 900 * k);
    }, 1200 * k);
  }
  on(exitBtn, 'click', () => travelTo(siteTop, 'Explorando o site', 'site', exitBtn));
  on(homeBtn, 'click', () => travelTo(0, 'Voltando ao início', 'capa', homeBtn));
  on(backBtn, 'click', () => travelTo(introEnd, 'Voltando ao planeta', 'planet', backBtn));
  on(document, 'click', e => {
    const a = e.target.closest?.('a'); if (!a || !a.href) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || url.pathname !== '/') return;
    if (travelling) { e.preventDefault(); return; }
    if (url.hash) {
      if (place === 'site') return;                                                         // já no site: o roteador rola até a seção
      const id = url.hash.slice(1), el = document.getElementById(id); if (!el) return;
      e.preventDefault();
      travelTo(() => el.getBoundingClientRect().top + scrollY - 24, `Indo para ${SECTIONS[id] || 'o site'}`, 'site', a, () => opts.setHash?.(url.hash));
    } else if (place !== 'capa' || scrollY > 2) { e.preventDefault(); travelTo(0, 'Voltando ao início', 'capa', a); }  // logo
  }, true);
  // Vindo de outra página direto para uma seção (ex.: /login → /#contato): o roteador rola e o lugar é o site.
  if (location.hash) { freeUntil = performance.now() + 2500; setTimeout(() => setPlace(scrollY >= siteTop() - 2 ? 'site' : 'capa'), 2600); }
  on(window, 'scroll', () => {
    if (free() || auto) { if (place === 'capa') maxY = Math.max(maxY, scrollY); return; }
    const y = scrollY, end = introEnd();
    if (place === 'capa') {
      if (y < maxY - 4) scrollTo({ top: maxY, behavior: 'instant' });
      else { maxY = Math.max(maxY, y); if (y >= end - 2) setPlace('planet'); }
    } else if (place === 'planet' && Math.abs(y - end) > 1) { scrollTo({ top: end, behavior: 'instant' }); nudge(); }
    else if (place === 'site' && y < siteTop() - 1) scrollTo({ top: siteTop(), behavior: 'instant' });
  }, { passive: true });
  // px: quanto a rolagem pretende subir; no site, se for passar do topo das seções, para exatamente nele.
  function intercept(e, down, px = 0) {
    const block = () => { if (e.cancelable) e.preventDefault(); };
    if (free()) { block(); return; }
    if (place === 'planet') { block(); nudge(); }
    else if (place === 'site') {
      if (!down && scrollY - Math.abs(px) < siteTop() + 2) { block(); if (scrollY > siteTop() + 1) scrollTo({ top: siteTop(), behavior: 'smooth' }); }
    } else if (place === 'capa' && ((!down && scrollY > 0) || (down && auto))) block();
  }
  const wheelPx = e => e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * innerHeight : e.deltaY;
  on(window, 'wheel', e => intercept(e, e.deltaY > 0, wheelPx(e)), { passive: false });
  on(window, 'touchstart', e => { touchY = e.touches[0].clientY; }, { passive: true });
  on(window, 'touchmove', e => { const dy = touchY - e.touches[0].clientY; if (Math.abs(dy) > 4) intercept(e, dy > 0, dy * 3); else if ((auto || free()) && e.cancelable) e.preventDefault(); }, { passive: false });
  on(window, 'keydown', e => {
    if (e.target.closest && e.target.closest('button, a, input, textarea, canvas')) return;
    if (['ArrowDown', 'PageDown', ' ', 'End'].includes(e.key)) intercept(e, true);
    else if (['ArrowUp', 'PageUp', 'Home'].includes(e.key)) intercept(e, false, e.key === 'ArrowUp' ? 80 : e.key === 'Home' ? 1e9 : innerHeight);
  });
  const autoEase = t => -(Math.cos(Math.PI * t) - 1) / 2;

  // Largura do nome dentro do visor, em pixels de tela, para o nome em HTML encolher até o tamanho exato.
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  const fdir = new THREE.Vector3(), fcam = new THREE.Vector3(), fup = new THREE.Vector3(), camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  function nameWidthOnScreen() {
    va.set(-NAME.x * DS.x * W, 0, frontAt(0)); vb.set(NAME.x * DS.x * W, 0, frontAt(0));
    rig.localToWorld(va); rig.localToWorld(vb); va.project(camera); vb.project(camera);
    return Math.abs(vb.x - va.x) / 2 * stage.clientWidth;
  }

  const t0 = performance.now(); let last = t0, clock = 0, nextFrame = 0;
  // Até 60 quadros por segundo, mesmo em monitores mais rápidos: o mesmo movimento com bem menos trabalho.
  const FRAME = 1000 / 60;
  // Qualidade adaptativa: se o aparelho não sustenta ~45 quadros por segundo, a resolução baixa um degrau (até 75%);
  // com folga por um bom tempo, volta a subir até a resolução normal. Só mede com a cena na tela.
  const Q_MIN = 0.75; let q = dpr, qN = 0, qSum = 0, qSlow = 0, qFast = 0;
  function adapt(ms) {
    qSum += ms; if (++qN < 90) return;
    const avg = qSum / qN; qN = qSum = 0;
    if (avg > 22) { qFast = 0; if (++qSlow >= 2 && q > Q_MIN) { q = Math.max(Q_MIN, q - 0.25); qSlow = 0; applyQ(); } }
    else if (avg < 17.5) { qSlow = 0; if (++qFast >= 6 && q < dpr) { q = Math.min(dpr, q + 0.25); qFast = 0; applyQ(); } }
    else qSlow = qFast = 0;
  }
  function applyQ() { renderer.setPixelRatio(q); formUniforms.uPx.value = q; resize(); }
  const css = (k, v) => root.style.setProperty(k, v.toFixed(4));
  let lastPct = -1, lastLoad = 0;
  const burstEl = $('.burst');
  const up = new THREE.Vector3(0, 1, 0);

  function tick(now) {
    if (disposed) return;
    raf = requestAnimationFrame(tick);
    if (now < nextFrame - 1) return;
    nextFrame = Math.max(nextFrame + FRAME, now);
    const frameMs = now - last, dt = Math.min(0.05, frameMs / 1000); last = now;
    if (auto) {
      const el = now - auto.start;
      const y = el < auto.d1 ? mix(auto.from, auto.split, autoEase(el / auto.d1)) : mix(auto.split, auto.to, autoEase(clamp((el - auto.d1) / auto.d2)));
      // 'instant': o site usa rolagem suave no CSS, que reiniciaria a cada quadro e travaria a animação.
      scrollTo({ top: y, behavior: 'instant' });
      if (el >= auto.d1 + auto.d2) { auto = null; if (place === 'capa' && scrollY >= introEnd() - 2) setPlace('planet'); }
    }
    // Fora da tela (no site, aba escondida ou abertura rolada para fora) o planeta hiberna: nada é animado nem desenhado.
    if (!visible || document.hidden || rootEl.classList.contains('away')) { music.setActive(false); return; }
    if (frameMs < 250) adapt(frameMs);
    if (!reduced) clock += dt;
    rt.clock = clock;
    const alive = reduced ? 0 : 1;

    const progress = clamp(scrollY / introEnd());
    if (!auto && autoOn && !reduced && place === 'capa' && lastProgress < JOINED && progress >= JOINED && progress < 0.6) startAuto();
    lastProgress = progress;
    // Avisa o site: progresso da abertura e se o planeta já saiu de cena (a página segue abaixo dele).
    const passed = scrollY > introEnd() + innerHeight * 0.25;
    if (Math.abs(progress - sentProgress) > 0.0005 || reduced !== sentReduced || passed !== sentPassed) { sentProgress = progress; sentReduced = reduced; sentPassed = passed; opts.onFrame?.({ progress, reduced, passed }); }
    eased += (progress - eased) * (1 - Math.exp(-dt * (reduced || auto ? 30 : 9)));
    // Rolagem → linha do tempo: junção do nome (7% da rolagem), óculos até o mundo (35%) e o planeta, que fica com
    // a maior parte (58%) para a formação ter calma.
    const pRaw = eased, p = pRaw < 0.07 ? pRaw / 0.07 * 0.2 : pRaw < 0.42 ? 0.2 + (pRaw - 0.07) / 0.35 * 0.52 : 0.72 + (pRaw - 0.42) / 0.58 * 0.28;

    // Linha do tempo (0 a 1). Fases encadeadas, sem pausas.
    const enter = reduced ? 1 : easeOut(clamp((now - t0 - 150) / 1900));
    const capa = reduced ? 1 - smooth(0.02, 0.08, p) : 1 - smoother(0.02, 0.1, p);  // textos da capa saem
    const grow = reduced ? 0 : smoother(0.2, 0.34, p);             // óculos cresce do tamanho da capa ao normal
    const lock = lockNow = reduced ? 1 : smooth(0.02, 0.1, p);    // óculos vai ao centro e para de frente
    const join = reduced ? 0 : smoother(0.04, 0.2, p);            // mini + verso se unem no centro
    const power = reduced ? 1 : smooth(0.18, 0.24, p);            // visor liga
    const shrink = reduced ? 1 : smoother(0.21, 0.32, p);         // nome encolhe até o visor
    const nameIn = reduced ? 1 : smooth(0.3, 0.34, p);            // nome passa para o visor
    const turn = reduced ? 0 : smoother(0.34, 0.53, p);           // óculos gira, mostrando as lentes
    const approach = reduced ? 0 : smoother(0.39, 0.62, p);       // e vem até o rosto
    const merge = reduced ? (p > 0.5 ? 1 : 0) : smoother(0.6, 0.72, p); // lentes se abrem no mundo
    const arrive = reduced ? 1 : smoother(0.62, 0.96, p);         // chegada ao planeta (a câmera segue girando enquanto ele se forma)
    const worldUi = smooth(0.935, 0.99, p);                                       // o título surge logo depois da explosão
    const reveal = reduced ? 1 : smooth(0.74, 0.93, p);            // faixa de luz revela o planeta de cima para baixo
    const form = reduced ? 1 : smooth(0.46, 0.8, p);               // partículas chegam girando e formam o planeta
    const solid = reduced ? 1 : smooth(0.62, 0.8, p);              // o planeta sólido cresce por dentro delas
    const scatter = reduced ? 1 : smooth(0.76, 0.92, p);           // e o que sobra se dissipa
    const fitFx = reduced ? 0 : smooth(0.53, 0.6, p) * (1 - smooth(0.68, 0.78, p)); // óculos encaixa no rosto

    // Óculos.
    if (!drag && now - idleAt > 2600) { const home = Math.round(userY / TAU) * TAU; userY += (home - userY) * (1 - Math.exp(-dt * 1.6)); userX += -userX * (1 - Math.exp(-dt * 1.6)); }
    rotY += (userY - rotY) * (1 - Math.exp(-dt * 8)); rotX += (userX - rotX) * (1 - Math.exp(-dt * 8));
    if (lock > 0.99) { const home = Math.round(rotY / TAU) * TAU; userY = rotY = home; userX = rotX = 0; }
    const free = 1 - lock, homeY = Math.round(rotY / TAU) * TAU;
    const follow = drag ? 0 : free * alive;
    const fit = Math.max(7.2, 3.9 / (2 * Math.tan(THREE.MathUtils.degToRad(16)) * camera.aspect));
    const tan = Math.tan(THREE.MathUtils.degToRad(16));
    const portrait = camera.aspect < 1;
    const eyeDist = portrait ? Math.max(1.5, (LENS_R / 0.75) / (tan * camera.aspect)) : Math.max(1.6, (LENS_X + LENS_R + 0.08) / (0.8 * tan * camera.aspect));
    const arc = Math.sin(approach * Math.PI);

    rig.rotation.y = mix(homeY, rotY + Math.sin(clock * 0.4) * 0.12 * alive + mx * 0.15 * follow, free) - (1 - enter) * 0.7 + turn * Math.PI;
    rig.rotation.x = (rotX + Math.sin(clock * 0.3) * 0.04 * alive + my * 0.08 * follow) * free - Math.sin(turn * Math.PI) * 0.16;
    rig.rotation.z = Math.sin(turn * Math.PI) * 0.06;
    rig.position.set((portrait ? LENS_X : 0) * approach + arc * 0.18, Math.sin(clock * 0.55) * 0.035 * free * alive - (1 - enter) * 0.35 + Math.sin(turn * Math.PI) * 0.1, approach * (fit - eyeDist + LENS_Z));
    // Na capa o óculos fica no centro, menor, entre mini e verso; cresce quando o nome entra no visor.
    const pxPerUnit = (stage.clientWidth / 2) / (fit * tan * camera.aspect);
    const gap = Math.max(14, stage.clientWidth * 0.02), gutter = Math.max(16, stage.clientWidth * 0.04);
    const room = stage.clientWidth - 2 * gutter - miniW - versoW - 2 * gap;
    const capaScale = clamp(Math.min(stage.clientWidth * 0.4, room) / 2 / (HALF_W * pxPerUnit), 0.3, 1);
    rig.scale.setScalar(mix(capaScale, 1, grow));
    const hw = HALF_W * capaScale * pxPerUnit;
    root.style.setProperty('--mini-x', `${(-(hw + gap) - (miniW - versoW) / 2).toFixed(1)}px`);
    root.style.setProperty('--verso-x', `${(hw + gap - (miniW - versoW) / 2).toFixed(1)}px`);
    root.style.setProperty('--hint-y', `${(HALF_H * capaScale * pxPerUnit + 22).toFixed(1)}px`);
    const ground = (1 - smooth(0.3, 0.42, p)) * enter;
    shadow.position.set(rig.position.x, rig.position.y - 1.15 * rig.scale.x, -0.5 * rig.scale.x);
    underglow.position.set(rig.position.x, rig.position.y - 1.14 * rig.scale.x, 0.1);
    shadow.scale.setScalar(rig.scale.x); underglow.scale.setScalar(rig.scale.x);
    shadow.material.opacity = ground; underglow.material.opacity = 0.16 * ground;
    shadow.visible = underglow.visible = ground > 0.01;
    rig.visible = merge < 0.999;
    renderer.toneMappingExposure = mix(0.05, 1, enter);

    camera.position.set(0, 0, fit);
    camera.updateMatrixWorld();
    rig.updateMatrixWorld();

    const strapAlpha = 1 - smooth(0.37, 0.48, p);
    for (const m of strapFade) m.opacity = strapAlpha;
    strapGroup.visible = strapAlpha > 0.01;

    const lensOpen = 1 + merge * merge * 14;
    for (const m of lensWindows) {
      m.scale.setScalar(lensOpen);
      m.position.x = m.userData.side * LENS_X * (portrait ? 1 : 1 - merge);
      m.material.depthTest = merge < 0.01;
    }
    for (const [i, m] of lensRims.entries()) { m.scale.setScalar(lensOpen); m.position.x = (i ? 1 : -1) * LENS_X * (portrait ? 1 : 1 - merge); }
    rimUniforms.uFade.value = 1 - smooth(0.62, 0.68, p);
    rimGroup.matrix.copy(rig.matrixWorld); rimGroup.matrixWorldNeedsUpdate = true;

    displayUniforms.uTime.value = clock;
    displayUniforms.uPower.value = power;
    displayUniforms.uSweep.value = reduced ? 0 : clamp((now - t0 - 1100) / 1300);
    displayUniforms.uHover.value += (hoverVisor * (lock < 0.5 ? 1 : 0) - displayUniforms.uHover.value) * (1 - Math.exp(-dt * 8));
    displayUniforms.uName.value = displayUniforms.uNameTex.value ? nameIn * (1 - smooth(0.4, 0.47, p)) : 0;
    displayUniforms.uFade.value = 1;
    displayUniforms.uRipT.value = rippleAt < 0 ? -1 : (now - rippleAt) / 1000;
    if (rippleAt > 0 && now - rippleAt > 1200) rippleAt = -1;
    cosmosUniforms.uTime.value = dustUniforms.uTime.value = clock;
    dustUniforms.uWarp.value = approach * (1 - merge);
    const pulse = 0.85 + 0.15 * Math.sin(clock * 2) * alive;
    ledM.color.copy(ledBase).multiplyScalar(pulse * 1.15); glowM.opacity = 0.12 + 0.07 * pulse;

    // Mundo: o planeta gira sozinho; arrastar dá impulso.
    worldLive = worldUi > 0.6;
    if (!worldLive && focusZone >= 0) closeZone();
    focusT += ((focusZone >= 0 ? 1 : 0) - focusT) * (1 - Math.exp(-dt * (reduced ? 20 : 2.2)));
    if (focusZone >= 0) {
      // Gira o planeta até a área ficar de frente (na cabine o planeta fica parado e a câmera segue o trem).
      velX = velY = 0;
      if (!cab) {
        tilt.updateMatrixWorld(true);
        fdir.copy(zoneMarks[focusZone].dir).transformDirection(planet.matrixWorld);
        orient.premultiply(qb.identity().slerp(qa.setFromUnitVectors(fdir, FACE), Math.min(1, dt * 3))).normalize();
      }
    } else if (!drag) { turnPlanet(velX * dt, (0.08 * alive + velY) * dt); const damp = Math.exp(-dt * 1.8); velX *= damp; velY *= damp; }
    tilt.quaternion.copy(orient);
    planet.rotation.y = formPts.rotation.y = arrive * 0.9;
    clouds.rotation.y = clock * 0.02;
    orbit.rotation.y = clock * 0.25;
    islands.rotation.y = clock * 0.03;
    islands.children.forEach(isl => { isl.position.copy(isl.userData.d).multiplyScalar(PR + 0.9 + Math.sin(clock * 0.7 + isl.userData.ph) * 0.04); if (isl.userData.crystal) isl.userData.crystal.rotation.y = clock; });
    // Planeta se forma: cresce de dentro da nuvem de partículas, com um leve passo além do tamanho final.
    const sc = Math.max(0.001, 1 + 2.2 * (solid - 1) ** 3 + 1.2 * (solid - 1) ** 2);
    for (const o of [planet, atmosphere, clouds, orbit, islands, balloons]) { o.scale.setScalar(sc); o.visible = solid > 0.001; }
    formUniforms.uForm.value = form; formUniforms.uFade.value = scatter;
    revealUniforms.uReveal.value = reveal;
    const edge = revealEdge(reveal);
    formPts.visible = form > 0.001 && scatter < 0.999;
    showDetails(focusT > 0.05 ? lastFocus : -1);
    for (const a of animated) if (a.visible || !a.userData.detail) a.userData.anim(clock);
    const wd = mix(portrait ? 7 : 4.1, portrait ? 14.5 : 7.6, arrive);                // planeta inteiro com folga, anéis e órbita à vista
    camPos.set(mx * 0.25 * arrive, 0.25 - my * 0.15 * arrive, wd); camLook.set(0, portrait ? -0.25 : -0.1, 0);
    fup.set(0, 1, 0);
    if (focusT > 0.001) {
      // Vista de perto num ângulo baixo, como quem chega andando na área (não mais de cima).
      tilt.updateMatrixWorld(true);
      const zg = ZONES[lastFocus].group, far = (portrait ? 1.9 : 1) * (ZONES[lastFocus].view || 1), k = smoother(0, 1, focusT);
      fdir.copy(zoneMarks[lastFocus].dir).transformDirection(planet.matrixWorld);
      const ez = 1 - Math.exp(-dt * (reduced ? 30 : 6));
      zYaw += (zYawT - zYaw) * ez; zPitch += (zPitchT - zPitch) * ez; zDist += (zDistT - zDist) * ez; zF.lerp(zFT, ez);
      const yaw = zYaw + (drag ? 0 : mx * 0.05), r = 0.745 * far * zDist, pitch = Math.max(zPitch, Math.asin(Math.min(1, 0.1 / r))), cp = Math.cos(pitch), sp = Math.sin(pitch); // nunca abaixo de ~0.1 do chão
      // Gira e aproxima em volta do centro da órbita (zF, em coordenadas da área).
      const fx = zF.x, fy = zF.y, fz = zF.z;
      fcam.set(fx + Math.sin(yaw) * cp * r, fy + sp * r, fz + Math.cos(yaw) * cp * r); zg.localToWorld(fcam);
      vb.set(fx, fy, fz); zg.localToWorld(vb);
      camPos.lerp(fcam, k); camLook.lerp(vb, k);
      if (camPos.length() < PR + 0.08) camPos.setLength(PR + 0.08);
      // "Para cima" da câmera perpendicular à visão, para a vista de cima não virar.
      vc.set(-Math.sin(yaw) * sp, cp, -Math.cos(yaw) * sp).transformDirection(zg.matrixWorld);
      fup.lerp(vc, k).normalize();
      const sh = ZONES[lastFocus].show;
      if (show && (!sh || clock - zoneFx[lastFocus] > sh.dur)) show = false;
      showT += ((show ? 1 : 0) - showT) * (1 - Math.exp(-dt * (reduced ? 20 : 1.8)));
      if (sh && showT > 0.001) {
        const s = smoother(0, 1, showT) * k;
        showLook.set(...sh.look); showCam.set(...sh.cam).sub(showLook).multiplyScalar(portrait ? 1.6 : 1).add(showLook);
        zg.localToWorld(showCam); zg.localToWorld(showLook);
        camPos.lerp(showCam, s); camLook.lerp(showLook, s); fup.lerp(fdir, s).normalize();
      }
      raceW = raceCam(raceCamP, raceLook, raceUp, dt);
      if (raceW > 0.001) {
        const s = smoother(0, 1, raceW) * k;
        zg.localToWorld(raceCamP); zg.localToWorld(raceLook); raceUp.transformDirection(zg.matrixWorld);
        camPos.lerp(raceCamP, s); camLook.lerp(raceLook, s); fup.lerp(raceUp, s).normalize();
      }
    } else raceW = 0;
    cabT = clamp(cabT + (cab ? 1 : -1) * dt / (reduced ? 0.2 : 3.2));             // entrada e saída em ~3 s, com a íris da cabine
    if (cabT > 0.001) {
      // Da área até a cabine num arco por cima do planeta (nunca atravessando o chão).
      tilt.updateMatrixWorld(true);
      const th = cabStart + clock * TRAIN_SPEED, k = smoother(0, 0.7, cabT);        // chega à cabine com a íris fechada
      // Lugar do maquinista: dentro da cabine, na altura das janelas, olhando os trilhos à frente nas curvas.
      fcam.copy(railPt(th)).multiplyScalar(RAIL_R + 0.07).addScaledVector(railTan(th), 0.03); planet.localToWorld(fcam);
      vc.copy(railPt(th + 0.25)).multiplyScalar(RAIL_R + 0.05); planet.localToWorld(vc);
      fdir.copy(railPt(th)).transformDirection(planet.matrixWorld);
      const ra = camPos.length(), rb = fcam.length(), da = camPos.clone().normalize(), db = fcam.clone().normalize(), ang = da.angleTo(db);
      da.applyQuaternion(qb.identity().slerp(qa.setFromUnitVectors(da.clone(), db), k));
      camPos.copy(da).multiplyScalar(mix(ra, rb, k) + Math.sin(Math.PI * k) * Math.min(1.6, ang * 0.9));
      camLook.lerp(vc, k); fup.lerp(fdir, k).normalize();
    }
    const fov = mix(mix(30, 52, smoother(0, 1, raceW)), 58, smoother(0, 0.7, cabT)), near = cabT > 0.25 || raceW > 0.2 ? 0.004 : 0.05;
    // Com uma área aberta, o centro da vista sobe para o meio do espaço livre acima da barra da área.
    if (!zoneCard.hidden) barH = zoneCard.offsetHeight + 18;
    const lift = Math.round(barH * 0.5 * smoother(0, 1, focusT) * (1 - smoother(0, 0.3, cabT)));
    if (worldCamera.fov !== fov || worldCamera.near !== near || lift !== camLift) {
      worldCamera.fov = fov; worldCamera.near = near; camLift = lift;
      if (lift) { const w = stage.clientWidth, h = stage.clientHeight; worldCamera.setViewOffset(w, h, 0, lift, w, h); } else worldCamera.clearViewOffset();
      worldCamera.updateProjectionMatrix();
    }
    atmoUniforms.uAlpha.value = 1 - focusT * 0.85;
    cloudM.opacity = 0.92 * (1 - focusT * 0.85);
    worldCamera.position.copy(camPos);
    worldCamera.up.copy(fup);
    worldCamera.lookAt(camLook);
    cabin.visible = cabT > 0.001;
    if (cabin.visible) updateCabin(worldCamera, clock, cabStart + clock * TRAIN_SPEED, cabT, cab);
    // Dentro da cabine a locomotiva some (a câmera está no lugar dela).
    trains.forEach((tr, i) => { tr.group.children[0].visible = !(i === cabTrain && cabT > 0.5); });
    worldCamera.updateMatrixWorld();
    skyUniforms.uTime.value = clock;
    skyUniforms.uDay.value = smoother(0.35, 1, focusT);                // perto de uma área, céu de dia

    zoneMarks.forEach((z, i) => {
      z.glow += ((hoverZone === i ? 1 : 0) - z.glow) * (1 - Math.exp(-dt * 10));
      z.ring.material.opacity = (0.15 + z.glow * 0.6) * worldUi * (1 - focusT * 0.85);
      vc.copy(z.anchor); planet.localToWorld(vc);
      const n = vc.clone().normalize(), facing = n.dot(vc.clone().sub(worldCamera.position).normalize().negate());
      vc.project(worldCamera);
      const el = labels[i];
      el.style.transform = `translate(${((vc.x * 0.5 + 0.5) * stage.clientWidth).toFixed(1)}px, ${((-vc.y * 0.5 + 0.5) * stage.clientHeight).toFixed(1)}px) translate(-50%, -100%)`;
      // Cada rótulo acende quando a faixa de luz passa pela sua área.
      const shownByScan = smooth(edge, edge + 0.12, n.dot(revealUniforms.uRevealAxis.value)) * smooth(0.74, 0.77, p);
      el.style.opacity = (Math.max(worldUi, shownByScan) * smooth(0.05, 0.35, facing) * (1 - focusT)).toFixed(3);
      el.classList.toggle('live', worldLive && facing > 0.2 && focusT < 0.5);
      el.classList.toggle('on', hoverZone === i);
    });
    // Tour: troca de ponto a cada TOUR_STEP segundos e termina na visão geral.
    if (tour && focusZone >= 0 && performance.now() / 1000 - tourAt > TOUR_STEP) {
      tourAt = performance.now() / 1000;
      if (poi + 1 >= poisOf(focusZone).length) { tourStop(); poiSet(-1); } else poiSet(poi + 1);
    }
    // Marcadores dos pontos de interesse sobre a cena (somem na apresentação do boi, na cabine e no ponto escolhido).
    if (markers.length) {
      const zg = ZONES[lastFocus].group, ps = poisOf(lastFocus), vis = smooth(0.6, 0.95, focusT) * (1 - showT) * (cabT > 0.001 || playing() ? 0 : 1);
      markers.forEach((m, k) => {
        vc.fromArray(ps[k].at); vc.y += 0.02; zg.localToWorld(vc); vc.project(worldCamera);
        const o = vc.z < 1 && Math.abs(vc.x) < 1.05 && Math.abs(vc.y) < 1.05 && k !== poi ? vis : 0;
        m.style.transform = `translate(${((vc.x * 0.5 + 0.5) * stage.clientWidth).toFixed(1)}px, ${((-vc.y * 0.5 + 0.5) * stage.clientHeight).toFixed(1)}px)`;
        m.style.opacity = o.toFixed(3);
        const live = o > 0.5; if (m.classList.contains('live') !== live) { m.classList.toggle('live', live); m.tabIndex = live ? 0 : -1; }
      });
    }

    // Nome e interface.
    const target = nameWidthOnScreen() / nameWidth;
    css('--join', join);
    css('--ns', mix(1, target, shrink));
    css('--names', (1 - nameIn) * (reduced ? 1 - smooth(0.12, 0.22, p) : 1));
    css('--capa', capa);
    capaEl.classList.toggle('live', capa > 0.5);
    css('--spark', smooth(0.17, 0.2, p) * (1 - smooth(0.22, 0.28, p)) * alive);
    css('--hint', 1 - smooth(0.01, 0.05, p));
    css('--world', worldUi * (1 - focusT)); css('--p', pRaw);
    const exitLive = worldLive && focusT < 0.5, soundLive = worldLive && place === 'planet';
    music.setActive(soundLive || (place === 'capa' && p > 0.6)); music.setZone(focusZone >= 0 ? ZONES[focusZone].music : null);
    const fz = focusZone >= 0 ? ZONES[focusZone] : null;
    music.setBoost(!!fz?.show && zoneFx[focusZone] >= 0 && clock - zoneFx[focusZone] < fz.show.dur);
    if (soundBtn.classList.contains('live') !== soundLive) { soundBtn.classList.toggle('live', soundLive); soundBtn.tabIndex = soundLive ? 0 : -1; }
    if (exitBtn && exitBtn.classList.contains('live') !== exitLive) for (const b of [exitBtn, homeBtn]) { b.classList.toggle('live', exitLive); b.tabIndex = exitLive ? 0 : -1; }
    css('--forming', reduced ? 0 : smooth(0.6, 0.66, p) * (1 - smooth(0.9, 0.95, p))); css('--reveal', reveal);
    // Tela de carregamento da formação: progresso de 0 a 100% das partículas até a faixa de luz terminar.
    const load = reduced ? 1 : smooth(0.6, 0.93, p), pct = Math.round(load * 100);
    css('--load', load); music.setLoad(place === 'capa' ? load : 1);
    // Planeta pronto: explosãozinha de luz no centro dele (anéis, clarão e faíscas), logo antes do título.
    if (load > 0.8 && load < 1) { vc.set(0, 0, 0); planet.localToWorld(vc); vc.project(worldCamera); css('--bx', (vc.x * 0.5 + 0.5) * 100); css('--by', (-vc.y * 0.5 + 0.5) * 100); }
    if (place === 'capa' && load >= 1 && lastLoad > 0 && lastLoad < 1 && !reduced) { burstEl.classList.remove('go'); void burstEl.offsetWidth; burstEl.classList.add('go'); }
    lastLoad = load;
    if (pct !== lastPct) { root.style.setProperty('--pct', String(pct)); lastPct = pct; }
    css('--fit', fitFx); css('--merge', merge);
    css('--veil', reduced ? 1 - smooth(0, 0.06, Math.abs(p - 0.5)) : 0);

    // Desenho: capa; mundo pelas lentes (stencil); bordas das lentes; ou só o mundo quando as lentes se abriram.
    renderer.clear(true, true, true);
    if (merge >= 0.999) {
      worldStencil(false);
      renderer.render(worldScene, worldCamera);
    } else {
      renderer.render(introScene, camera);
      if (turn > 0.45) {
        renderer.clearDepth();
        worldStencil(true);
        renderer.render(worldScene, worldCamera);
        renderer.render(rimScene, camera);
      }
    }
  }
  raf = requestAnimationFrame(tick);
  // Prepara o planeta enquanto a capa está parada: compila os shaders em paralelo (sem travar a página) e envia as
  // texturas para a placa de vídeo, para a formação não engasgar no primeiro quadro do planeta.
  const warm = setTimeout(async () => {
    if (disposed) return;
    const shown = []; worldScene.traverse(o => { if (!o.visible) { o.visible = true; shown.push(o); } });
    const job = renderer.compileAsync(worldScene, worldCamera);
    for (const o of shown) o.visible = false;
    const texs = new Set();
    worldScene.traverse(o => { for (const m of [].concat(o.material || [])) for (const k in m) if (m[k]?.isTexture) texs.add(m[k]); });
    for (const t of texs) renderer.initTexture(t);
    try { await job; } catch { /* sem compilação em paralelo: o primeiro quadro do planeta compila como antes */ }
  }, 900);
  offs.push(() => clearTimeout(warm));
  return {
    dispose() {
      disposed = true; cancelAnimationFrame(raf); auto = null;
      offs.forEach(off => off()); io.disconnect();
      rt.gameTick = () => {};
      envMap.dispose(); pmrem.dispose(); renderer.dispose(); renderer.forceContextLoss();
    }
  };
}
