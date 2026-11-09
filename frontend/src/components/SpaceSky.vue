<script setup>
// Céu do Miniverso atrás das seções do site: estrelas em camadas (as próximas acompanham mais a rolagem e o mouse),
// algumas ligadas como constelações, estrela cadente de vez em quando e nebulosas nas cores da marca.
// Canvas 2D leve: no máximo 30 quadros por segundo, resolução limitada e para quando está desligado ou a aba some.
import { onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ enabled: Boolean, reduced: Boolean });
const canvas = ref(null);
const root = ref(null);
// Viagem pelo fundo: progresso da rolagem do início das seções (logo depois do planeta) até o fim da página.
// No topo, o horizonte do planeta que acabamos de deixar; no meio, a Via Láctea; no fim, o brilho de uma galáxia.
let sFrame = 0;
function journey() {
  sFrame = 0; const el = root.value; if (!el) return;
  const start = document.getElementById('sobre')?.offsetTop ?? innerHeight;
  const end = Math.max(start + 1, document.documentElement.scrollHeight - innerHeight);
  const p = Math.min(1, Math.max(0, (scrollY - start) / (end - start)));
  el.style.setProperty('--sp', p.toFixed(4));
  el.style.setProperty('--near', Math.max(0, 1 - Math.max(0, scrollY - start + innerHeight * 0.4) / (innerHeight * 1.6)).toFixed(3));
}
const onScroll = () => { if (!sFrame) sFrame = requestAnimationFrame(journey); };
let ctx, w = 0, h = 0, dpr = 1, raf = 0, last = 0, t = 0, ro;
const rnd = (a, b) => a + Math.random() * (b - a);
const tints = ['#ffffff', '#ffffff', '#d8f3ff', '#9fe6f7', '#b9c8ff'];
const stars = Array.from({ length: 300 }, () => { const z = Math.random() ** 2.2; return { x: Math.random(), y: Math.random(), z, r: 0.6 + z * 1.4, ph: rnd(0, 6.3), sp: rnd(0.5, 1.6), c: tints[(Math.random() * tints.length) | 0] }; });
const near = stars.filter(s => s.z > 0.5).slice(0, 30);
const meteors = []; let nextMeteor = 0;
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
const onMove = (e) => { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; };

function size() {
  if (!canvas.value) return;
  dpr = Math.min(1.5, devicePixelRatio || 1); w = innerWidth; h = innerHeight;
  canvas.value.width = w * dpr; canvas.value.height = h * dpr;
  ctx = canvas.value.getContext('2d'); draw(0);
}
function draw(dt) {
  if (!ctx) return;
  t += dt;
  mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 3); mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 3);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
  const count = Math.min(stars.length, Math.round(w * h / 3000)), scroll = scrollY;
  const pos = (s) => [
    ((((s.x - t * 0.002 * (0.3 + s.z)) % 1) + 1) % 1) * w - mouse.x * 26 * s.z,
    ((((s.y * h - scroll * 0.06 * (0.2 + s.z)) % h) + h) % h) - mouse.y * 18 * s.z
  ];
  ctx.lineWidth = 0.6; ctx.strokeStyle = '#8ee1f2';
  const pts = near.map(pos);
  for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
    const d = Math.hypot(pts[i][0] - pts[j][0], pts[i][1] - pts[j][1]);
    if (d < 140) { ctx.globalAlpha = (1 - d / 140) * 0.16; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
  }
  for (let i = 0; i < count; i++) {
    const s = stars[i], [x, y] = pos(s);
    ctx.globalAlpha = (0.32 + s.z * 0.6) * (0.55 + 0.45 * Math.sin(t * s.sp + s.ph));
    ctx.fillStyle = s.c;
    if (s.z > 0.6) { ctx.beginPath(); ctx.arc(x, y, s.r, 0, 6.3); ctx.fill(); ctx.globalAlpha *= 0.16; ctx.beginPath(); ctx.arc(x, y, s.r * 3.4, 0, 6.3); ctx.fill(); }
    else ctx.fillRect(x, y, s.r, s.r);
  }
  if (!props.reduced && t > nextMeteor) { meteors.push({ x: rnd(0.3, 1.05) * w, y: rnd(-0.05, 0.4) * h, vx: -rnd(360, 520), vy: rnd(130, 220), life: 1 }); nextMeteor = t + rnd(5, 10); }
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt * 0.85;
    if (m.life <= 0) { meteors.splice(i, 1); continue; }
    const sp = Math.hypot(m.vx, m.vy), tx = m.x - m.vx / sp * 130, ty = m.y - m.vy / sp * 130;
    const g = ctx.createLinearGradient(m.x, m.y, tx, ty); g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#8ee1f2aa'); g.addColorStop(1, '#00b7e300');
    ctx.globalAlpha = Math.min(1, m.life * 1.6); ctx.strokeStyle = g; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function loop(now) {
  raf = 0;
  if (!props.enabled || props.reduced || document.hidden) return;
  if (now - last >= 33) { draw(Math.min(0.06, (now - (last || now)) / 1000)); last = now; }
  raf = requestAnimationFrame(loop);
}
function sync() { cancelAnimationFrame(raf); raf = 0; last = 0; if (props.enabled && !props.reduced && !document.hidden) raf = requestAnimationFrame(loop); else draw(0); }
watch(() => [props.enabled, props.reduced], sync);
onMounted(() => { addEventListener('scroll', onScroll, { passive: true }); journey(); size(); ro = new ResizeObserver(size); ro.observe(document.documentElement); addEventListener('pointermove', onMove, { passive: true }); document.addEventListener('visibilitychange', sync); sync(); });
onUnmounted(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(sFrame); cancelAnimationFrame(raf); ro?.disconnect(); removeEventListener('pointermove', onMove); document.removeEventListener('visibilitychange', sync); });
</script>

<template>
  <div ref="root" class="space-sky" :class="{ visible: enabled }" aria-hidden="true">
    <span class="nebula n1" /><span class="nebula n2" /><span class="nebula n3" />
    <span class="milky"><i /><i /></span>
    <span class="galaxy"><i /><i /></span>
    <canvas ref="canvas" />
    <span class="home-planet"><i /></span>
  </div>
</template>

<style scoped>
.space-sky{--sp:0;--near:1;position:fixed;inset:0;z-index:0;overflow:hidden;pointer-events:none;opacity:0;transition:opacity 1.2s;background:linear-gradient(180deg,#081028 0%,#070b1a 40%,#0b0a22 100%)}
.space-sky.visible{opacity:1}
canvas{position:absolute;inset:0;width:100%;height:100%}
.nebula{position:absolute;border-radius:50%;filter:blur(80px);will-change:transform}
.nebula{translate:0 calc(var(--sp) * var(--k, -40vh))}
.n1{--k:-60vh;width:60vw;height:46vw;right:-18vw;top:-14vw;background:radial-gradient(closest-side,#1e448899,#1e164555 60%,transparent);animation:drift 30s ease-in-out infinite alternate}
.n2{--k:-30vh;width:50vw;height:40vw;left:-20vw;top:30vh;background:radial-gradient(closest-side,#00b7e326,#1e164577 55%,transparent);animation:drift 38s ease-in-out -12s infinite alternate-reverse}
.n3{--k:-90vh;width:44vw;height:34vw;right:5vw;bottom:-18vw;background:radial-gradient(closest-side,#5a3fb033,#1e164544 60%,transparent);animation:drift 34s ease-in-out -6s infinite alternate}
@keyframes drift{to{transform:translate(-5vw,4vw) scale(1.14) rotate(10deg)}}
/* O planeta que ficou para trás: a curva do horizonte brilhando no topo, que se afasta conforme a pessoa desce. */
.home-planet{position:absolute;left:50%;top:0;width:180vw;height:180vw;border-radius:50%;transform:translate(-50%,calc(-100% + 22vh - (1 - var(--near)) * 30vh));opacity:var(--near);background:radial-gradient(circle at 50% 100%,#1e4488 0%,#14214f 6%,#0b1230 18%,#070b1a 40%);box-shadow:0 2px 0 #8ee1f2b0,0 12px 50px #00b7e366,0 40px 140px #00b7e333}
.home-planet i{position:absolute;left:20%;right:20%;bottom:-60px;height:120px;border-radius:50%;background:radial-gradient(ellipse at 50% 0%,#00b7e340,transparent 70%);filter:blur(16px)}
/* Via Láctea: uma faixa diagonal de poeira e luz que atravessa o meio da viagem. */
.milky{position:absolute;inset:-30% -20%;transform:rotate(-24deg) translateY(calc(40vh - var(--sp) * 90vh));opacity:calc(.25 + (1 - var(--near)) * .75)}
.milky i{position:absolute;left:0;right:0;top:44%;height:12%;border-radius:50%;background:radial-gradient(ellipse at 50% 50%,#b9c8ff1f,#8ee1f214 30%,transparent 70%);filter:blur(30px)}
.milky i+i{top:47%;height:4%;background:linear-gradient(90deg,transparent,#ffffff14 20%,#8ee1f21f 50%,#ffffff14 80%,transparent);filter:blur(10px)}
/* Galáxia no fim: o brilho do núcleo atrás do convite final. */
.galaxy{position:absolute;left:50%;bottom:-10vh;width:110vw;height:70vh;transform:translateX(-50%) scale(calc(.85 + var(--sp) * .15));opacity:calc(max(0, var(--sp) - .72) * 3.6)}
.galaxy i{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 50% 60%,#8f6bff33,#1e448844 30%,#1e164522 55%,transparent 70%);filter:blur(30px)}
.galaxy i+i{inset:30% 25%;background:radial-gradient(ellipse,#bdf2ff33,#00b7e322 40%,transparent 70%);animation:core 8s ease-in-out infinite}
@keyframes core{50%{transform:scale(1.15);opacity:.7}}
@media(prefers-reduced-motion:reduce){.nebula,.galaxy i+i{animation:none}}
</style>
