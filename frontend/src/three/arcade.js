// Fliperama do Salão Arcade: "Quebra-pixel", um quebra-blocos em pixel numa tela de fliperama sobre a cena.
// Só roda e desenha enquanto está aberto. Mouse, dedo ou ← → movem a raquete; clique, toque ou espaço lançam a bola.
// Cada fase limpa acelera a bola; blocos dourados valem mais e alargam a raquete por alguns segundos.
// sfx(tipo, altura) toca os efeitos (raquete, tijolo, vida perdida, fase limpa, fim) e buzz(padrão) vibra o celular.
const W = 320, H = 240, COLS = 8, ROWS = 5, BW = 34, BH = 10, GAP = 4, OX = (W - (COLS * BW + (COLS - 1) * GAP)) / 2, OY = 34;
const ROW_COLORS = ['#ff4fd8', '#ffc56b', '#3ee0b5', '#00b7e3', '#b07cff'];
const BEST_KEY = 'miniverso-fliperama';

export function createArcade({ el, on, onClose, sfx = () => {}, buzz = () => {} }) {
  const cv = el.querySelector('canvas'), x = cv.getContext('2d'), scoreEl = el.querySelector('.ac-score'), hintEl = el.querySelector('.ac-hint');
  let open = false, raf = 0, last = 0, kv = 0, keys = { l: false, r: false };
  let px = W / 2, pw = 48, wideUntil = 0, ball, bricks, lives, score, level, msg = '', msgUntil = 0, over = false, sparks = [];
  // Efeitos da tela: rastro da bola, pontos subindo, combo (blocos seguidos sem tocar na raquete), tremida, clarão.
  let trail = [], pops = [], combo = 0, shake = 0, flash = 0, padFlash = 0;
  const stars = Array.from({ length: 46 }, () => ({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7 }));
  // Fundo pintado uma vez: degradê roxo, sol neon e chão de grade (estilo fliperama), mais a vinheta da tela.
  const bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  { const b = bg.getContext('2d'), gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#07041a'); gr.addColorStop(0.62, '#1c0a3a'); gr.addColorStop(1, '#2a0b3f'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
    const sun = b.createLinearGradient(0, 150, 0, 200); sun.addColorStop(0, 'rgba(255,197,107,.32)'); sun.addColorStop(1, 'rgba(255,79,216,.18)'); b.fillStyle = sun; b.beginPath(); b.arc(W / 2, 196, 46, Math.PI, 0); b.fill();
    b.fillStyle = '#1c0a3a'; for (let k = 0; k < 5; k++) b.fillRect(W / 2 - 48, 160 + k * 8, 96, 2 + k * 0.6); }
  const vig = document.createElement('canvas'); vig.width = W; vig.height = H;
  { const v = vig.getContext('2d'), gr = v.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.85); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.55)'); v.fillStyle = gr; v.fillRect(0, 0, W, H); }
  let best = 0; try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* sem armazenamento */ }

  function layout() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const gold = Math.random() < 0.08, hard = level > 1 && r < level - 1 && !gold;
      bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), c: gold ? '#ffd23f' : ROW_COLORS[r], hp: hard ? 2 : 1, max: hard ? 2 : 1, gold, pts: gold ? 50 : (ROWS - r) * 10, born: performance.now() / 1000 + (r * COLS + c) * 0.012 });
    }
  }
  const speed = () => 175 + level * 28;
  function serve() { ball = { x: px, y: 214, vx: 0, vy: 0, stuck: true }; }
  function launch() {
    if (over) return reset();
    if (!ball.stuck) return;
    const a = (Math.random() - 0.5) * 0.9; ball.vx = Math.sin(a) * speed(); ball.vy = -Math.cos(a) * speed(); ball.stuck = false; sfx('tap');
  }
  function reset() { level = 1; score = 0; lives = 3; over = false; pw = 48; wideUntil = 0; combo = 0; trail = []; pops = []; layout(); serve(); say('Fase 1', 1.4); hud(); }
  function say(t, s) { msg = t; msgUntil = performance.now() / 1000 + s; }
  function hud() { scoreEl.textContent = `${score} pts · ${'♥'.repeat(Math.max(0, lives))} · fase ${level}`; }
  function burst(bx, by, c, n = 12) { for (let i = 0; i < n; i++) sparks.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 190, vy: (Math.random() - 0.7) * 170, t: 0.55, c }); }

  function step(dt, now) {
    // Teclado: a raquete arranca rápido até 420 px/s e para na hora em que a tecla é solta.
    const dir = (keys.r ? 1 : 0) - (keys.l ? 1 : 0);
    kv = dir && Math.sign(kv) !== -dir ? Math.max(-420, Math.min(420, kv + dir * 2600 * dt)) : dir * 120; px += kv * dt;
    if (now > wideUntil) pw = 48;
    px = Math.max(pw / 2, Math.min(W - pw / 2, px));
    if (over) return;
    if (ball.stuck) { ball.x = px; ball.y = 214; return; }
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    if (ball.x < 3) { ball.x = 3; ball.vx = Math.abs(ball.vx); }
    if (ball.x > W - 3) { ball.x = W - 3; ball.vx = -Math.abs(ball.vx); }
    if (ball.y < 3) { ball.y = 3; ball.vy = Math.abs(ball.vy); }
    // Raquete: o ponto onde a bola bate decide o ângulo da volta.
    if (ball.vy > 0 && ball.y > 216 && ball.y < 226 && Math.abs(ball.x - px) < pw / 2 + 3) {
      const k = (ball.x - px) / (pw / 2), sp = Math.min(330, Math.hypot(ball.vx, ball.vy) * 1.03), a = k * 1.05;
      ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; ball.y = 216; sfx('paddle'); buzz(8); combo = 0; padFlash = 1;
    }
    if (ball.y > H + 6) {
      lives--; hud();
      if (lives <= 0) {
        over = true; if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* sem armazenamento */ } }
        hintEl.textContent = `Fim de jogo! ${score} pts · recorde ${best} pts. Toque ou aperte espaço para jogar de novo.`;
        sfx('lose'); buzz([60, 40, 60]);
      } else { serve(); say('Mais uma!', 1); sfx('bad'); buzz([40, 30, 40]); }
      combo = 0; shake = 6; flash = 0.25;
      return;
    }
    for (const b of bricks) {
      if (b.hp <= 0 || ball.x < b.x - 3 || ball.x > b.x + BW + 3 || ball.y < b.y - 3 || ball.y > b.y + BH + 3) continue;
      const dx = Math.min(ball.x - (b.x - 3), b.x + BW + 3 - ball.x), dy = Math.min(ball.y - (b.y - 3), b.y + BH + 3 - ball.y);
      if (dx < dy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
      if (--b.hp <= 0) {
        combo++; const pts = b.pts * Math.min(4, 1 + Math.floor(combo / 3)); score += pts; burst(b.x + BW / 2, b.y + BH / 2, b.c, b.gold ? 22 : 12); shake = Math.min(5, 2 + combo * 0.4);
        pops.push({ x: b.x + BW / 2, y: b.y, t: 0.9, s: `+${pts}`, c: b.gold ? '#ffd23f' : '#ffffff' });
        if (combo >= 3 && combo % 3 === 0) pops.push({ x: W / 2, y: 120, t: 1.1, s: `COMBO x${Math.min(4, 1 + Math.floor(combo / 3))}`, c: '#ff4fd8', big: true });
        if (b.gold) { pw = 72; wideUntil = now + 8; say('Raquete larga!', 1.2); sfx('bonus'); buzz(25); } else { sfx('hit', (ROWS - Math.round((b.y - OY) / (BH + GAP))) * 2); buzz(10); }
      } else sfx('paddle');
      hud(); break;
    }
    if (bricks.every(b => b.hp <= 0)) { level++; layout(); serve(); say(`Fase ${level}!`, 1.6); hud(); sfx('win'); buzz([30, 60, 30, 60, 80]); flash = 0.6; combo = 0; for (let k = 0; k < 6; k++) burst(40 + k * 48, 120, ROW_COLORS[k % 5], 14); }
  }
  function draw(now) {
    const dt = 1 / 60;
    x.save();
    if (shake > 0.1) { x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake); shake *= 0.86; }
    x.drawImage(bg, 0, 0);
    // Estrelas descendo devagar (mais perto, mais rápidas) e o chão de grade correndo na direção da tela.
    for (const st of stars) { st.y += st.z * 14 * dt; if (st.y > 150) { st.y = 0; st.x = Math.random() * W; } x.fillStyle = `rgba(255,255,255,${0.25 + st.z * 0.55 * (0.7 + 0.3 * Math.sin(now * 3 + st.x))})`; x.fillRect(st.x, st.y, st.z > 0.8 ? 2 : 1, st.z > 0.8 ? 2 : 1); }
    x.strokeStyle = 'rgba(255,79,216,.28)'; x.lineWidth = 1; x.beginPath();
    for (let k = -8; k <= 8; k++) { x.moveTo(W / 2 + k * 8, 196); x.lineTo(W / 2 + k * 48, H); }
    for (let k = 0; k < 6; k++) { const u = ((k + (now * 0.8) % 1) / 6), yy = 196 + u * u * 44; x.moveTo(0, yy); x.lineTo(W, yy); }
    x.stroke();
    // Placar dentro da tela.
    x.fillStyle = 'rgba(7,4,26,.75)'; x.fillRect(0, 0, W, 20); x.fillStyle = '#ff4fd8'; x.fillRect(0, 20, W, 1);
    x.font = '700 9px monospace'; x.textAlign = 'left'; x.fillStyle = '#7fe9ff'; x.fillText('PONTOS', 6, 9); x.fillStyle = '#ffffff'; x.font = '700 10px monospace'; x.fillText(String(score).padStart(5, '0'), 6, 18);
    x.textAlign = 'center'; x.font = '700 9px monospace'; x.fillStyle = '#ffc56b'; x.fillText('RECORDE', W / 2, 9); x.fillStyle = '#ffffff'; x.font = '700 10px monospace'; x.fillText(String(Math.max(best, score)).padStart(5, '0'), W / 2, 18);
    x.textAlign = 'right'; x.font = '700 9px monospace'; x.fillStyle = '#3ee0b5'; x.fillText(`FASE ${level}`, W - 6, 9);
    for (let k = 0; k < 3; k++) { x.fillStyle = k < lives ? '#ff4f6d' : 'rgba(255,255,255,.18)'; const hx = W - 40 + k * 12, hy = 12; x.fillRect(hx, hy + 1, 3, 3); x.fillRect(hx + 4, hy + 1, 3, 3); x.fillRect(hx + 1, hy + 3, 5, 3); x.fillRect(hx + 2, hy + 6, 3, 1); }
    // Blocos com relevo (luz em cima e à esquerda, sombra embaixo), brilho correndo, rachadura nos duros já batidos.
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      const pop = Math.min(1, Math.max(0, (now - b.born) / 0.25)); if (pop <= 0) continue;
      const bh = BH * pop, by = b.y + (BH - bh) / 2;
      x.fillStyle = b.c; x.fillRect(b.x, by, BW, bh);
      x.fillStyle = 'rgba(255,255,255,.45)'; x.fillRect(b.x, by, BW, 2); x.fillRect(b.x, by, 2, bh);
      x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(b.x, by + bh - 2, BW, 2); x.fillRect(b.x + BW - 2, by, 2, bh);
      const sh = ((now * 40 + b.x * 0.7 + b.y) % 160) - 20; if (sh > 0 && sh < BW) { x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(b.x + sh, by + 2, 3, bh - 4); }
      if (b.max > 1) { x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.strokeRect(b.x + 0.5, by + 0.5, BW - 1, bh - 1); if (b.hp < b.max) { x.strokeStyle = 'rgba(10,6,24,.8)'; x.beginPath(); x.moveTo(b.x + 8, by + 1); x.lineTo(b.x + 13, by + 5); x.lineTo(b.x + 10, by + bh - 1); x.moveTo(b.x + 24, by + 1); x.lineTo(b.x + 21, by + 6); x.stroke(); } }
      if (b.gold) { const tw = 0.5 + 0.5 * Math.sin(now * 8 + b.x); x.fillStyle = `rgba(255,255,255,${0.6 + tw * 0.4})`; x.fillRect(b.x + BW / 2 - 2, by + 3, 4, 4); x.fillRect(b.x + BW / 2 - 4, by + 4, 8, 2); }
    }
    // Raquete neon com brilho (acende ao rebater); larga, fica dourada.
    const wide = pw > 48; padFlash = Math.max(0, padFlash - dt * 4);
    x.shadowColor = wide ? '#ffd23f' : '#7fe9ff'; x.shadowBlur = 8 + padFlash * 10;
    x.fillStyle = wide ? '#ffd23f' : '#7fe9ff'; x.fillRect(px - pw / 2, 220, pw, 6); x.shadowBlur = 0;
    x.fillStyle = `rgba(255,255,255,${0.7 + padFlash * 0.3})`; x.fillRect(px - pw / 2, 220, pw, 2);
    x.fillStyle = '#ff4fd8'; x.fillRect(px - pw / 2, 222, 3, 4); x.fillRect(px + pw / 2 - 3, 222, 3, 4);
    // Bola com rastro.
    if (!over) {
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 9) trail.shift();
      trail.forEach((tp, k) => { const a = (k + 1) / trail.length; x.fillStyle = `rgba(127,233,255,${a * 0.35})`; const r = 1 + a * 2; x.fillRect(tp.x - r, tp.y - r, r * 2, r * 2); });
      x.shadowColor = '#ffffff'; x.shadowBlur = 8; x.fillStyle = '#ffffff'; x.fillRect(ball.x - 3, ball.y - 3, 6, 6); x.shadowBlur = 0;
    }
    sparks = sparks.filter(sp => (sp.t -= dt) > 0);
    for (const sp of sparks) { sp.vy += 260 * dt; sp.x += sp.vx * dt; sp.y += sp.vy * dt; x.fillStyle = sp.c; x.globalAlpha = Math.min(1, sp.t * 2); x.fillRect(sp.x, sp.y, 3, 3); }
    x.globalAlpha = 1;
    pops = pops.filter(pp => (pp.t -= dt) > 0);
    for (const pp of pops) { x.globalAlpha = Math.min(1, pp.t * 2); x.font = pp.big ? '700 16px monospace' : '700 9px monospace'; x.textAlign = 'center'; x.fillStyle = '#0b0618'; x.fillText(pp.s, pp.x + 1, pp.y + 1 - (pp.big ? 0 : (0.9 - pp.t) * 26)); x.fillStyle = pp.c; x.fillText(pp.s, pp.x, pp.y - (pp.big ? 0 : (0.9 - pp.t) * 26)); }
    x.globalAlpha = 1;
    // Título na espera do primeiro lançamento e as mensagens (fase, pausa, fim).
    if (ball.stuck && level === 1 && score === 0 && !over) {
      x.textAlign = 'center'; x.font = '700 26px monospace';
      const bob = Math.sin(now * 2) * 2; x.fillStyle = '#ff4fd8'; x.fillText('QUEBRA-PIXEL', W / 2 + 2, 132 + bob + 2); x.fillStyle = '#ffc56b'; x.fillText('QUEBRA-PIXEL', W / 2, 132 + bob);
    }
    const m = over ? 'FIM DE JOGO' : paused ? 'PAUSA · CLIQUE PARA VOLTAR' : now < msgUntil ? msg : ball.stuck ? 'CLIQUE PARA LANÇAR' : '';
    if (m && (over || paused || now < msgUntil || Math.sin(now * 5) > -0.3)) { x.font = '700 14px monospace'; x.textAlign = 'center'; x.fillStyle = '#0b0618'; x.fillText(m, W / 2 + 1, 161); x.fillStyle = over ? '#ff4f6d' : '#7fe9ff'; x.fillText(m, W / 2, 160); }
    if (over) { x.font = '700 10px monospace'; x.fillStyle = '#ffffff'; x.fillText(`${score} PONTOS · RECORDE ${best}`, W / 2, 178); }
    if (flash > 0) { x.fillStyle = `rgba(255,255,255,${flash})`; x.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * 1.8); }
    x.drawImage(vig, 0, 0);
    x.restore();
  }
  function frame(t) {
    if (!open) return;
    raf = requestAnimationFrame(frame);
    const now = t / 1000, dt = Math.min(0.033, now - last); last = now;
    if (document.hidden) return;
    if (!paused) step(dt, now);
    draw(now);
  }

  // Mouse preso no jogo: ao clicar na tela, o ponteiro some e só move a raquete, sem escapar para o planeta. Esc solta
  // o mouse e pausa; um clique na tela volta ao jogo (e o × fica clicável com o mouse solto). No toque, o dedo já fica
  // preso à tela enquanto arrasta.
  let paused = false, lockLostAt = -1e9;
  const toX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  const locked = () => document.pointerLockElement === cv;
  on(document, 'pointerlockchange', () => { if (!locked()) lockLostAt = performance.now(); if (open && !locked() && !over) { paused = true; keys = { l: false, r: false }; } });
  // Com o mouse preso, a raquete anda pelo movimento; sem a trava (navegador que não permite), ela segue o mouse mesmo
  // fora da tela do jogo, parando na beirada.
  on(document, 'pointermove', e => { if (!open) return; if (locked()) px += e.movementX * 1.5 * W / cv.getBoundingClientRect().width; else if (e.pointerType === 'mouse' || e.target === cv) px = toX(e); });
  on(cv, 'pointerdown', e => {
    if (!open) return;
    e.preventDefault();
    if (e.pointerType === 'mouse') { if (!locked()) { px = toX(e); try { cv.requestPointerLock()?.catch?.(() => {}); } catch { /* sem trava de ponteiro */ } } }
    else { px = toX(e); try { cv.setPointerCapture(e.pointerId); } catch { /* toque já encerrado */ } }
    if (paused) { paused = false; return; }
    launch();
  });
  on(el.querySelector('.ac-close'), 'click', () => close());
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r' };
  on(window, 'keydown', e => {
    if (!open) return;
    if (KEYS[e.key]) { keys[KEYS[e.key]] = true; e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { if (paused) paused = false; else launch(); e.preventDefault(); }
    // O primeiro Esc só solta o mouse (e pausa); com o mouse já solto, o Esc sai do fliperama.
    else if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); if (!locked() && performance.now() - lockLostAt > 400) close(); }
  }, true);
  on(window, 'keyup', e => { if (KEYS[e.key]) keys[KEYS[e.key]] = false; });

  function start() {
    if (open) return;
    open = true; paused = false; el.hidden = false; keys = { l: false, r: false }; sparks = [];
    hintEl.textContent = matchMedia('(hover: none)').matches ? 'Arraste para mover · toque para lançar' : 'Clique na tela: o mouse fica preso no jogo · Esc solta o mouse e pausa';
    reset(); last = performance.now() / 1000; raf = requestAnimationFrame(frame);
  }
  function close(silent) {
    if (!open) return;
    open = false; el.hidden = true; cancelAnimationFrame(raf);
    if (locked()) document.exitPointerLock();
    if (!silent) onClose?.();
  }
  return { start, close, get on() { return open; } };
}
