<template>
  <section class="login-page" :class="{ granted: phase === 'granted' }" aria-labelledby="login-title">
    <canvas ref="orbitCanvas" class="orbit-canvas" aria-hidden="true" />
    <div class="login-copy">
      <p class="eyebrow">Área da equipe</p>
      <h1 id="login-title">Organize mundos.<br><span>Acompanhe entregas.</span></h1>
      <p class="lede">Cuide do portfólio que aparece no site e acompanhe cada projeto, do briefing à entrega.</p>
    </div>

    <form class="login-card" :class="{ shake }" novalidate @submit.prevent="submit" @animationend="shake = false">
      <span class="lock" :class="phase" aria-hidden="true">
        <svg v-if="phase !== 'granted'" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V7.5a3.5 3.5 0 0 1 7 0v3" /></svg>
        <svg v-else class="check" viewBox="0 0 24 24"><path d="M5.5 12.5l4.2 4.2L18.5 8" /></svg>
      </span>
      <h2>{{ phase === 'granted' ? 'Acesso liberado' : 'Entrar' }}</h2>
      <p class="sub">{{ phase === 'granted' ? 'Tudo certo. Abrindo o painel.' : 'Use seu e-mail da equipe Miniverso.' }}</p>

      <label class="field">
        <span>E-mail</span>
        <input v-model.trim="email" type="email" autocomplete="username" required placeholder="nome@miniverso.com" :disabled="busy" @input="error = ''">
      </label>
      <label class="field">
        <span>Senha</span>
        <span class="pass">
          <input v-model="password" :type="showPass ? 'text' : 'password'" autocomplete="current-password" required placeholder="Sua senha" :disabled="busy" @input="error = ''" @keyup="caps = $event.getModifierState?.('CapsLock')">
          <button type="button" class="eye" :aria-label="showPass ? 'Esconder senha' : 'Mostrar senha'" :aria-pressed="showPass" @click="showPass = !showPass">
            <svg viewBox="0 0 24 24"><path d="M2.5 12s3.5-6.5 9.5-6.5S21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /><path v-if="showPass" d="M4 20 20 4" /></svg>
          </button>
        </span>
      </label>
      <p v-if="caps && !busy" class="hint">Caps Lock está ligado</p>
      <p v-if="error" class="error" role="alert">{{ error }}</p>

      <button type="submit" class="submit" :class="phase" :disabled="busy">
        <span class="scan" aria-hidden="true" />
        <span class="label">{{ phase === 'checking' ? 'Verificando…' : phase === 'granted' ? 'Acesso liberado' : 'Entrar no painel' }}</span>
      </button>
      <div class="card-foot">
        <button class="text-btn" type="button" :disabled="busy" @click="fillDemo">Usar acesso de demonstração</button>
        <router-link class="text-btn" to="/">Voltar ao site</router-link>
      </div>
    </form>
    <Teleport to="body">
      <div class="handoff" :class="{ on: phase === 'granted' }" aria-hidden="true">
        <div class="handoff-inner">
          <span class="logo-reveal"><img src="/images/miniverso-logo.png" alt=""></span>
          <span class="handoff-line"><i /></span>
          <p>Preparando seu painel</p>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SESSION_KEY } from '../utils/projectStore.js';

const router = useRouter(); const route = useRoute();
const email = ref(''); const password = ref(''); const error = ref('');
const showPass = ref(false); const caps = ref(false); const shake = ref(false);
const phase = ref('idle'); // idle → checking → granted
const busy = computed(() => phase.value !== 'idle');
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let timers = [];
const later = (fn, ms) => timers.push(setTimeout(fn, reduced ? Math.min(ms, 150) : ms));

const fillDemo = () => {
  // Digita o acesso de demonstração letra por letra, como num terminal.
  error.value = ''; email.value = ''; password.value = '';
  const e = 'admin@demo.miniverso.local', p = 'portal2026';
  if (reduced) { email.value = e; password.value = p; return; }
  [...e].forEach((c, i) => later(() => { email.value += c; }, i * 18));
  [...p].forEach((c, i) => later(() => { password.value += c; }, e.length * 18 + 80 + i * 32));
};

const submit = () => {
  if (busy.value) return;
  if (!email.value || !password.value) { error.value = 'Preencha o e-mail e a senha.'; shake.value = true; return; }
  phase.value = 'checking';
  later(() => {
    if (email.value === 'admin@demo.miniverso.local' && password.value === 'portal2026') {
      phase.value = 'granted';
      sessionStorage.setItem(SESSION_KEY, 'active');
      const to = typeof route.query.redirect === 'string' && route.query.redirect.startsWith('/') ? route.query.redirect : '/dashboard';
      later(() => router.push(to), 2400);
    } else {
      phase.value = 'idle'; error.value = 'E-mail ou senha incorretos.'; shake.value = true;
    }
  }, 900);
};

// Fundo: céu estrelado sutil em camadas (as mais próximas se mexem mais com o mouse), estrelas cadentes de vez
// em quando, algumas estrelas ligadas como constelação e, ao entrar, um salto para o hiperespaço. Canvas 2D leve,
// que para quando a aba ou a página saem da tela.
const orbitCanvas = ref(null);
let raf = 0, ro, io, onVis, onMove, visible = true, warp = 0;
onMounted(() => {
  const cv = orbitCanvas.value; const ctx = cv.getContext('2d');
  let w = 0, h = 0, dpr = 1;
  const resize = () => { dpr = Math.min(2, devicePixelRatio || 1); w = cv.clientWidth; h = cv.clientHeight; cv.width = w * dpr; cv.height = h * dpr; if (reduced) draw(performance.now()); };
  const rnd = (a, b) => a + Math.random() * (b - a);
  const tints = ['#ffffff', '#ffffff', '#d8f3ff', '#9fe6f7', '#b9c8ff'];
  const stars = Array.from({ length: 320 }, () => { const z = Math.random() ** 2.2; return { x: Math.random(), y: Math.random(), z, r: 0.7 + z * 1.4, ph: rnd(0, 6.3), sp: rnd(0.6, 1.8), c: tints[(Math.random() * tints.length) | 0] }; });
  const near = stars.filter(s => s.z > 0.5).slice(0, 34);
  const meteors = []; let nextMeteor = performance.now() + 2500;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  onMove = (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; };
  addEventListener('pointermove', onMove, { passive: true });
  let t = 0, last = performance.now();
  function draw(now) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0); last = now; t += dt;
    warp += ((phase.value === 'granted' ? 1 : 0) - warp) * Math.min(1, dt * 1.5);
    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    const count = Math.min(stars.length, Math.round(w * h / 2600)), cx = w * 0.5, cy = h * 0.5;
    const pos = (s) => {
      let x = (((s.x - t * 0.0035 * (0.3 + s.z)) % 1) + 1) % 1 * w - mouse.x * 30 * s.z;
      let y = s.y * h - mouse.y * 20 * s.z;
      if (warp > 0.001) { const k = 1 + warp * 0.06 * (0.4 + s.z); x = cx + (x - cx) * k; y = cy + (y - cy) * k; }
      return [x, y];
    };
    // Constelação: estrelas próximas ligadas por linhas bem fracas.
    ctx.lineWidth = 0.6;
    const pts = near.map(pos);
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1], d = Math.hypot(dx, dy);
      if (d < 150) { ctx.globalAlpha = (1 - d / 150) * 0.2 * (1 - warp); ctx.strokeStyle = '#8ee1f2'; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
    }
    // Estrelas.
    for (let i = 0; i < count; i++) {
      const s = stars[i], [x, y] = pos(s);
      const tw = 0.55 + 0.45 * Math.sin(t * s.sp + s.ph);
      ctx.globalAlpha = (0.4 + s.z * 0.6) * tw;
      ctx.fillStyle = s.c;
      ctx.globalAlpha *= 1 - warp * 0.7;
      if (s.z > 0.6) {
        ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.3); ctx.fill();
        ctx.globalAlpha *= 0.18; ctx.beginPath(); ctx.arc(x, y, s.r * 3.5, 0, 6.3); ctx.fill();
      } else ctx.fillRect(x, y, s.r, s.r);
    }
    // Estrela cadente a cada poucos segundos.
    if (!reduced && now > nextMeteor && warp < 0.1) {
      meteors.push({ x: rnd(0.25, 1.05) * w, y: rnd(-0.05, 0.35) * h, vx: -rnd(380, 560), vy: rnd(140, 240), life: 1 });
      nextMeteor = now + rnd(3500, 7500);
    }
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt * 0.9;
      if (m.life <= 0) { meteors.splice(i, 1); continue; }
      const sp = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / sp * 140, ty = m.y - m.vy / sp * 140;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#8ee1f2aa'); g.addColorStop(1, '#00b7e300');
      ctx.globalAlpha = Math.min(1, m.life * 1.6); ctx.strokeStyle = g; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    if (!reduced && visible && !document.hidden) raf = requestAnimationFrame(draw); else raf = 0;
  }
  const kick = () => { if (!raf && !reduced && visible && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(draw); } };
  ro = new ResizeObserver(resize); ro.observe(cv); resize();
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); }); io.observe(cv);
  onVis = kick; document.addEventListener('visibilitychange', kick);
  if (reduced) draw(performance.now()); else kick();
});
onUnmounted(() => { cancelAnimationFrame(raf); if (onVis) document.removeEventListener('visibilitychange', onVis); if (onMove) removeEventListener('pointermove', onMove); ro?.disconnect(); io?.disconnect(); timers.forEach(clearTimeout); });
</script>

<style scoped>
.login-page{--cyan:#00b7e3;--blue:#1e4488;--indigo:#1e1645;--ink:#eef8fc;--muted:#a9c0cc;font-family:var(--font-body);position:relative;overflow:hidden;min-height:calc(100vh - 102px);display:grid;grid-template-columns:minmax(0,1.2fr) minmax(360px,440px);gap:clamp(40px,7vw,120px);align-items:center;padding:clamp(56px,7vw,110px) 7%;color:var(--ink);background:radial-gradient(ellipse at 72% 40%,#1e448866,transparent 55%),radial-gradient(circle at 10% 90%,#1e1645,transparent 50%),#080d1c}
.orbit-canvas{position:absolute;z-index:0;inset:0;width:100%;height:100%;pointer-events:none}
/* Nebulosas nas cores da marca, bem desfocadas, respirando devagar atrás das estrelas. */
.login-page::before,.login-page::after{content:'';position:absolute;border-radius:50%;filter:blur(70px);pointer-events:none;will-change:transform;z-index:0}
.login-page::before{width:52vw;height:40vw;right:-12vw;top:-10vw;background:radial-gradient(closest-side,#1e4488aa,#1e164566 60%,transparent);animation:nebula 26s ease-in-out infinite alternate}
.login-page::after{width:44vw;height:34vw;left:-14vw;bottom:-14vw;background:radial-gradient(closest-side,#00b7e333,#1e164588 55%,transparent);animation:nebula 32s ease-in-out -9s infinite alternate-reverse}
@keyframes nebula{to{transform:translate(-4vw,3vw) scale(1.12) rotate(8deg)}}
.login-copy{position:relative;z-index:1}
.eyebrow{display:inline-flex;align-items:center;gap:10px;margin:0 0 22px;color:var(--cyan);font-size:13px;font-weight:500;letter-spacing:.18em;text-transform:uppercase}
.eyebrow::before{content:'';width:28px;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue))}
.login-copy h1{margin:0;font-family:var(--font-title);font-size:clamp(64px,8.6vw,124px);font-weight:500;line-height:.9;letter-spacing:.01em}
.login-copy h1 span{background:linear-gradient(90deg,#7fdcf2,var(--cyan) 45%,#4f74d6);-webkit-background-clip:text;background-clip:text;color:transparent}
.lede{max-width:40ch;margin:26px 0 0;color:var(--muted);font-size:clamp(17px,1.4vw,19px);line-height:1.6}
.login-card{position:relative;z-index:1;display:grid;gap:4px;padding:clamp(30px,3.4vw,44px);border:1px solid #ffffff14;border-radius:28px;background:linear-gradient(170deg,#121a36d9,#0b1226e6);box-shadow:0 40px 90px #0009,inset 0 1px #ffffff12;backdrop-filter:blur(16px);transition:box-shadow .5s,border-color .5s}
.login-card::before{content:'';position:absolute;top:-1px;left:28px;right:28px;height:2px;border-radius:2px;background:linear-gradient(90deg,transparent,var(--cyan),var(--blue),transparent)}
.granted .login-card{transform:scale(.985);opacity:0;transition:transform .9s .55s cubic-bezier(.4,0,.2,1),opacity .7s .55s}
.granted .login-copy{opacity:0;transform:translateY(-6px);transition:opacity .7s .45s,transform .9s .45s}
.shake{animation:shake .42s cubic-bezier(.36,.07,.19,.97)}
@keyframes shake{20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}
.lock{display:grid;place-items:center;width:52px;height:52px;margin-bottom:14px;border-radius:16px;background:linear-gradient(135deg,var(--cyan),var(--blue) 60%,var(--indigo));color:#fff;box-shadow:0 10px 30px #00b7e333;transition:background .4s}
.lock svg{width:24px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
.lock.checking{animation:pulse 1s infinite}
.lock .check{width:26px;stroke-width:2.2;stroke-dasharray:22;stroke-dashoffset:22;animation:draw .45s .05s cubic-bezier(.6,0,.2,1) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes pulse{50%{box-shadow:0 0 0 10px #00b7e322}}
.login-card h2{max-width:none;margin:0;font-family:var(--font-title);font-size:56px;font-weight:500;line-height:1;letter-spacing:.01em}
.sub{margin:6px 0 18px;color:var(--muted);font-size:16px}
.field{display:grid;gap:8px;margin:10px 0;color:#d3e4ec;font-size:14px;font-weight:500}
.field input{width:100%;min-height:56px;border:1px solid #ffffff1c;border-radius:16px;padding:0 18px;color:var(--ink);background:#070c1acc;font-size:16px;transition:border-color .2s,box-shadow .2s,background .2s}
.field input::placeholder{color:#6f8796}
.field input:hover{border-color:#ffffff33}
.field input:focus{outline:none;border-color:var(--cyan);background:#070c1a;box-shadow:0 0 0 4px #00b7e326}
.field input:disabled{opacity:.7}
.pass{position:relative;display:block}.pass input{padding-right:56px}
.eye{position:absolute;top:50%;right:8px;transform:translateY(-50%);display:grid;place-items:center;width:42px;height:42px;border:0;border-radius:12px;color:#94b3c1;background:transparent;cursor:pointer}
.eye:hover{color:#fff;background:#ffffff10}
.eye svg{width:21px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round}
.hint{margin:2px 0;color:#ffd58a;font-size:14px}
.error{margin:2px 0;color:#ffb3b3;font-size:14px}
.submit{position:relative;overflow:hidden;min-height:58px;margin-top:16px;border:0;border-radius:999px;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));font-size:17px;font-weight:700;cursor:pointer;box-shadow:0 14px 34px #00b7e333;transition:transform .2s,box-shadow .2s,background .4s}
.submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 18px 40px #00b7e344}
.submit:disabled{cursor:default}
.submit .label{position:relative}
.scan{position:absolute;inset:0;transform:translateX(-101%);background:linear-gradient(90deg,#7fdcf2,var(--cyan))}
.submit.checking .scan{animation:scan .9s cubic-bezier(.6,0,.3,1) forwards}
.submit.granted{background:linear-gradient(90deg,var(--cyan),var(--blue))}
.submit.granted .scan{display:none}
@keyframes scan{to{transform:translateX(0)}}
.card-foot{display:flex;justify-content:space-between;gap:12px;margin-top:18px}
.text-btn{padding:6px 0;border:0;color:#9fd8e8;background:none;font-size:15px;text-decoration:none;cursor:pointer}
.text-btn:hover:not(:disabled){color:#fff;text-decoration:underline;text-underline-offset:4px}
.handoff{--cyan:#00b7e3;--blue:#1e4488;position:fixed;z-index:200;inset:0;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 55%,#111a3a,#080d1c 60%);opacity:0;visibility:hidden;transition:opacity .6s .4s cubic-bezier(.4,0,.2,1),visibility 0s 1s}
.handoff.on{opacity:1;visibility:visible;transition:opacity .6s .4s cubic-bezier(.4,0,.2,1),visibility 0s .4s}
.handoff-inner{display:grid;justify-items:center;gap:22px}
.logo-reveal{position:relative;display:block;overflow:hidden;clip-path:inset(0 100% 0 0);-webkit-mask:url('/images/miniverso-logo.png') center/100% 100% no-repeat;mask:url('/images/miniverso-logo.png') center/100% 100% no-repeat}
.logo-reveal img{display:block;width:min(240px,56vw);height:auto}
.logo-reveal::after{content:'';position:absolute;top:0;bottom:0;left:-40%;width:40%;background:linear-gradient(90deg,transparent,#9fe6f7,transparent)}
.handoff.on .logo-reveal{animation:reveal .9s .8s cubic-bezier(.7,0,.2,1) forwards}
.handoff.on .logo-reveal::after{animation:sheen .9s 1.3s ease-in-out forwards}
@keyframes reveal{to{clip-path:inset(0 0 0 0)}}
@keyframes sheen{to{left:110%}}
.handoff-line{position:relative;display:block;width:120px;height:1px;background:#ffffff1a;overflow:hidden}
.handoff-line i{position:absolute;inset:0;background:linear-gradient(90deg,var(--cyan),var(--blue));transform:scaleX(0);transform-origin:left}
.handoff.on .handoff-line i{animation:load 1s .95s cubic-bezier(.6,0,.2,1) forwards}
@keyframes load{to{transform:scaleX(1)}}
.handoff p{margin:0;color:#8ea6b4;font-family:var(--font-body);font-size:13px;letter-spacing:.22em;text-transform:uppercase;opacity:0}
.handoff.on p{animation:fadein .6s 1.15s forwards}
@keyframes fadein{to{opacity:1}}
@media(max-width:900px){.login-page{grid-template-columns:1fr;padding:44px 20px 64px;gap:32px}.login-copy h1{font-size:clamp(56px,16vw,76px)}.lede{font-size:17px}.login-card{padding:28px 22px;border-radius:24px}.login-card h2{font-size:48px}.orbit-canvas{opacity:.55}.card-foot{flex-direction:column;align-items:flex-start;gap:4px}}
@media(prefers-reduced-motion:reduce){.lock.checking,.login-page::before,.login-page::after{animation:none}.handoff,.handoff.on{transition:opacity .2s}.handoff.on .logo-reveal{animation:none;clip-path:none}.handoff.on p,.handoff.on .handoff-line i{animation:none;opacity:1;transform:none}}
</style>
