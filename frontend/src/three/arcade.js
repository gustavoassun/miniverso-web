// Fliperama do Salão Arcade: "Quebra-pixel", um quebra-blocos em pixel numa tela de fliperama sobre a cena.
// Só roda e desenha enquanto está aberto. Mouse, dedo ou ← → movem a raquete; clique, toque ou espaço lançam a bola.
// Cada fase limpa acelera a bola; blocos dourados valem mais e alargam a raquete por alguns segundos.
const W = 320, H = 240, COLS = 8, ROWS = 5, BW = 34, BH = 10, GAP = 4, OX = (W - (COLS * BW + (COLS - 1) * GAP)) / 2, OY = 34;
const ROW_COLORS = ['#ff4fd8', '#ffc56b', '#3ee0b5', '#00b7e3', '#b07cff'];
const BEST_KEY = 'miniverso-fliperama';

export function createArcade({ el, on, onClose }) {
  const cv = el.querySelector('canvas'), x = cv.getContext('2d'), scoreEl = el.querySelector('.ac-score'), hintEl = el.querySelector('.ac-hint');
  let open = false, raf = 0, last = 0, keys = { l: false, r: false };
  let px = W / 2, pw = 48, wideUntil = 0, ball, bricks, lives, score, level, msg = '', msgUntil = 0, over = false, sparks = [];
  let best = 0; try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { /* sem armazenamento */ }

  function layout() {
    bricks = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const gold = Math.random() < 0.08, hard = level > 1 && r < level - 1 && !gold;
      bricks.push({ x: OX + c * (BW + GAP), y: OY + r * (BH + GAP), c: gold ? '#ffd23f' : ROW_COLORS[r], hp: hard ? 2 : 1, gold, pts: gold ? 50 : (ROWS - r) * 10 });
    }
  }
  const speed = () => 175 + level * 28;
  function serve() { ball = { x: px, y: 214, vx: 0, vy: 0, stuck: true }; }
  function launch() {
    if (over) return reset();
    if (!ball.stuck) return;
    const a = (Math.random() - 0.5) * 0.9; ball.vx = Math.sin(a) * speed(); ball.vy = -Math.cos(a) * speed(); ball.stuck = false;
  }
  function reset() { level = 1; score = 0; lives = 3; over = false; pw = 48; wideUntil = 0; layout(); serve(); say('Fase 1', 1.4); hud(); }
  function say(t, s) { msg = t; msgUntil = performance.now() / 1000 + s; }
  function hud() { scoreEl.textContent = `${score} pts · ${'♥'.repeat(Math.max(0, lives))} · fase ${level}`; }
  function burst(bx, by, c) { for (let i = 0; i < 8; i++) sparks.push({ x: bx, y: by, vx: (Math.random() - 0.5) * 160, vy: (Math.random() - 0.5) * 160, t: 0.5, c }); }

  function step(dt, now) {
    if (keys.l) px -= 260 * dt; if (keys.r) px += 260 * dt;
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
      ball.vx = Math.sin(a) * sp; ball.vy = -Math.cos(a) * sp; ball.y = 216;
    }
    if (ball.y > H + 6) {
      lives--; hud();
      if (lives <= 0) {
        over = true; if (score > best) { best = score; try { localStorage.setItem(BEST_KEY, String(best)); } catch { /* sem armazenamento */ } }
        hintEl.textContent = `Fim de jogo! ${score} pts · recorde ${best} pts. Toque ou aperte espaço para jogar de novo.`;
      } else { serve(); say('Mais uma!', 1); }
      return;
    }
    for (const b of bricks) {
      if (b.hp <= 0 || ball.x < b.x - 3 || ball.x > b.x + BW + 3 || ball.y < b.y - 3 || ball.y > b.y + BH + 3) continue;
      const dx = Math.min(ball.x - (b.x - 3), b.x + BW + 3 - ball.x), dy = Math.min(ball.y - (b.y - 3), b.y + BH + 3 - ball.y);
      if (dx < dy) ball.vx = -ball.vx; else ball.vy = -ball.vy;
      if (--b.hp <= 0) {
        score += b.pts; burst(b.x + BW / 2, b.y + BH / 2, b.c);
        if (b.gold) { pw = 72; wideUntil = now + 8; say('Raquete larga!', 1.2); }
      }
      hud(); break;
    }
    if (bricks.every(b => b.hp <= 0)) { level++; layout(); serve(); say(`Fase ${level}!`, 1.6); hud(); }
  }
  function draw(now) {
    x.fillStyle = '#0b0618'; x.fillRect(0, 0, W, H);
    x.fillStyle = 'rgba(127,233,255,.05)'; for (let i = 0; i < W; i += 16) x.fillRect(i, 0, 1, H); for (let j = 0; j < H; j += 16) x.fillRect(0, j, W, 1);
    for (const b of bricks) {
      if (b.hp <= 0) continue;
      x.fillStyle = b.c; x.fillRect(b.x, b.y, BW, BH);
      x.fillStyle = 'rgba(255,255,255,.35)'; x.fillRect(b.x, b.y, BW, 2);
      if (b.hp > 1) { x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.strokeRect(b.x + 0.5, b.y + 0.5, BW - 1, BH - 1); }
      if (b.gold) { x.fillStyle = '#ffffff'; x.fillRect(b.x + BW / 2 - 2, b.y + 3, 4, 4); }
    }
    x.fillStyle = '#7fe9ff'; x.fillRect(px - pw / 2, 220, pw, 6); x.fillStyle = '#ffffff'; x.fillRect(px - pw / 2, 220, pw, 2);
    if (!over) { x.fillStyle = '#ffffff'; x.fillRect(ball.x - 3, ball.y - 3, 6, 6); }
    sparks = sparks.filter(s => (s.t -= 1 / 60) > 0);
    for (const s of sparks) { s.x += s.vx / 60; s.y += s.vy / 60; x.fillStyle = s.c; x.globalAlpha = s.t * 2; x.fillRect(s.x, s.y, 3, 3); }
    x.globalAlpha = 1;
    const m = over ? 'FIM DE JOGO' : now < msgUntil ? msg : ball.stuck ? 'TOQUE PARA LANÇAR' : '';
    if (m) { x.font = '700 18px monospace'; x.textAlign = 'center'; x.fillStyle = '#ffc56b'; x.fillText(m, W / 2, 150); }
  }
  function frame(t) {
    if (!open) return;
    raf = requestAnimationFrame(frame);
    const now = t / 1000, dt = Math.min(0.033, now - last); last = now;
    if (document.hidden) return;
    step(dt, now); draw(now);
  }

  const toX = e => { const r = cv.getBoundingClientRect(); return (e.clientX - r.left) / r.width * W; };
  on(cv, 'pointermove', e => { if (open) px = toX(e); });
  on(cv, 'pointerdown', e => { if (!open) return; px = toX(e); cv.setPointerCapture(e.pointerId); launch(); e.preventDefault(); });
  on(el.querySelector('.ac-close'), 'click', () => close());
  const KEYS = { ArrowLeft: 'l', a: 'l', A: 'l', ArrowRight: 'r', d: 'r', D: 'r' };
  on(window, 'keydown', e => {
    if (!open) return;
    if (KEYS[e.key]) { keys[KEYS[e.key]] = true; e.preventDefault(); }
    else if (e.key === ' ' || e.key === 'Enter') { launch(); e.preventDefault(); }
    else if (e.key === 'Escape') { close(); e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);
  on(window, 'keyup', e => { if (KEYS[e.key]) keys[KEYS[e.key]] = false; });

  function start() {
    if (open) return;
    open = true; el.hidden = false; keys = { l: false, r: false }; sparks = [];
    hintEl.textContent = 'Mova com o mouse, o dedo ou ← →. Clique, toque ou espaço para lançar a bola. Esc sai.';
    reset(); last = performance.now() / 1000; raf = requestAnimationFrame(frame);
  }
  function close(silent) {
    if (!open) return;
    open = false; el.hidden = true; cancelAnimationFrame(raf);
    if (!silent) onClose?.();
  }
  return { start, close, get on() { return open; } };
}
