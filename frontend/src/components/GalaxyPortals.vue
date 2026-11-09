<script setup>
// TESTE (só aparece em /?teste=galaxia): galáxia espiral. O mundo em destaque fica no núcleo da galáxia, num portal
// grande; os outros projetos ficam presos nos dois braços da espiral, que gira devagar. As estrelas dos braços são
// desenhadas num canvas leve (poucos milhares de pontos). Mesmo funcionamento dos Portais em órbita: troca sozinho a
// cada poucos segundos, clicar num projeto leva ele para o núcleo, o mouse em cima pausa. Só anima enquanto está na tela.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const list = computed(() => props.items.slice(0, 8));
const active = ref(0);
const current = computed(() => list.value[active.value] || {});
const others = computed(() => list.value.map((p, i) => ({ p, i })).filter(x => x.i !== active.value));
const root = ref(null), canvas = ref(null);
const pos = ref({});
const tilt = ref({ x: 0, y: 0 });
let raf = 0, timer = 0, io, ro, visible = false, hover = false, last = 0, rot = 0, W = 500, H = 410, ctx, stars = [];
const CYCLE = 5200, SPIN = 4.4, SQUASH = 0.55, TILT = (-12 * Math.PI) / 180;

function makeStars() {
  const n = W < 460 ? 1300 : 2400;
  stars = Array.from({ length: n }, (_, i) => {
    const r = 0.06 + Math.pow(Math.random(), 1.05) * 0.98, puff = i < (W < 460 ? 70 : 130);
    // estrelas concentradas no braço (gaussiana aproximada), e algumas "nuvens" grandes e fracas de poeira
    const g = (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
    return { arm: Math.random() < 0.5 ? 0 : Math.PI, r, j: g * (0.42 - 0.22 * r), s: puff ? 8 + Math.random() * 16 : Math.random() * 1.5 + 0.45, puff, c: Math.random(), tw: Math.random() * 6.28 };
  });
}
// Ponto da espiral (raio relativo r, ângulo a) projetado na galáxia inclinada.
function proj(r, a, Rm) {
  const ex = Math.cos(a) * r * Rm, ey = Math.sin(a) * r * Rm * SQUASH;
  return [ex * Math.cos(TILT) - ey * Math.sin(TILT), ex * Math.sin(TILT) + ey * Math.cos(TILT), Math.sin(a)];
}
function draw(t) {
  if (!ctx) return;
  const cx = W / 2, cy = H / 2, Rm = Math.min(W * 0.5, H * 0.95);
  ctx.clearRect(0, 0, W, H);
  // brilho do núcleo e do disco
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(TILT); ctx.scale(1, SQUASH);
  const disk = ctx.createRadialGradient(0, 0, 0, 0, 0, Rm);
  disk.addColorStop(0, 'rgba(120,220,255,.28)'); disk.addColorStop(0.35, 'rgba(90,110,255,.10)'); disk.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = disk; ctx.beginPath(); ctx.arc(0, 0, Rm, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  for (const s of stars) {
    const [x, y] = proj(s.r, s.arm + s.r * SPIN + s.j + rot, Rm);
    const fade = 1 - s.r * 0.6;
    if (s.puff) {
      ctx.fillStyle = s.c < 0.6 ? `rgba(80,190,255,${0.07 * fade})` : `rgba(140,110,255,${0.07 * fade})`;
      ctx.beginPath(); ctx.ellipse(cx + x, cy + y, s.s, s.s * 0.6, TILT, 0, Math.PI * 2); ctx.fill(); continue;
    }
    const tw = 0.7 + 0.3 * Math.sin(t * 1.6 + s.tw);
    ctx.fillStyle = s.c < 0.55 ? `rgba(140,230,255,${(0.35 + 0.6 * fade) * tw})` : s.c < 0.88 ? `rgba(175,150,255,${(0.3 + 0.55 * fade) * tw})` : `rgba(255,255,255,${0.85 * tw})`;
    ctx.fillRect(cx + x, cy + y, s.s, s.s);
  }
}
function layout() {
  const Rm = Math.min(W * 0.5, H * 0.95), out = {};
  others.value.forEach((o, k) => {
    const arm = k % 2 ? Math.PI : 0, rr = 0.5 + Math.floor(k / 2) * 0.17 + (k % 2) * 0.06;
    const [x, y, depth] = proj(rr, arm + rr * SPIN + rot, Rm);
    out[o.p.id] = { transform: `translate(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%)) scale(${(0.78 + depth * 0.16).toFixed(3)})`, zIndex: depth > 0 ? 4 : 2, opacity: (0.62 + depth * 0.38).toFixed(2), '--lit': Math.max(0, depth).toFixed(2) };
  });
  pos.value = out;
}
function resize() {
  const b = canvas.value.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const newSmall = b.width < 460, oldSmall = W < 460;
  W = b.width; H = b.height;
  canvas.value.width = Math.round(W * dpr); canvas.value.height = Math.round(H * dpr);
  ctx = canvas.value.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!stars.length || newSmall !== oldSmall) makeStars();
  draw(performance.now() / 1000); layout();
}
function loop(now) {
  raf = 0; if (!visible || document.hidden) return;
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  rot += dt * 0.07; draw(now / 1000); layout();
  if (!props.reduced) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(loop); } }
function cycle() { clearTimeout(timer); if (props.reduced || !visible || hover || list.value.length < 2) return; timer = setTimeout(() => { active.value = (active.value + 1) % list.value.length; cycle(); }, CYCLE); }
function pick(i) { active.value = i; cycle(); }
function move(e) {
  if (e.pointerType !== 'mouse') return;
  const b = root.value.getBoundingClientRect();
  tilt.value = { x: ((e.clientX - b.left) / b.width - 0.5) * 2, y: ((e.clientY - b.top) / b.height - 0.5) * 2 };
}
function enter() { hover = true; clearTimeout(timer); }
function leave() { hover = false; tilt.value = { x: 0, y: 0 }; cycle(); }
watch(() => list.value.length, () => { if (active.value >= list.value.length) active.value = 0; layout(); });
watch(active, layout);
onMounted(() => {
  ro = new ResizeObserver(resize); ro.observe(canvas.value);
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); cycle(); }); io.observe(root.value);
  document.addEventListener('visibilitychange', kick);
});
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', kick); });
</script>

<template>
  <div ref="root" class="galaxy-portals" @pointermove="move" @pointerenter="enter" @pointerleave="leave">
    <div class="gp-scene" :style="{ transform: `rotateX(${(-tilt.y * 6).toFixed(2)}deg) rotateY(${(tilt.x * 8).toFixed(2)}deg)` }">
      <canvas ref="canvas" class="gp-sky" aria-hidden="true" />

      <!-- Núcleo: o mundo em destaque -->
      <div class="core">
        <span class="core-ring" aria-hidden="true" />
        <div class="core-lens">
          <TransitionGroup name="warp">
            <img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" :loading="i === 0 ? 'eager' : 'lazy'">
          </TransitionGroup>
          <span class="core-glass" aria-hidden="true" />
        </div>
      </div>

      <!-- Projetos nos braços da espiral -->
      <button v-for="o in others" :key="o.p.id" type="button" class="mini" :style="pos[o.p.id]" :aria-label="'Ver ' + o.p.titulo" @click="pick(o.i)">
        <img :src="o.p.url_imagem" alt="" width="160" height="160" loading="lazy">
        <span class="mini-name">{{ o.p.titulo.split(':')[0] }}</span>
      </button>
    </div>

    <div class="op-caption" aria-live="polite">
      <span>Agora você está em</span>
      <Transition name="swap" mode="out-in"><b :key="current.id">{{ current.titulo }}</b></Transition>
      <router-link v-if="current.id" :to="'/projetos/' + current.id" class="op-link">Explorar este mundo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></router-link>
    </div>

    <!-- Só no teste: links para as outras ideias -->
    <nav class="lab-bar" aria-label="Ideias em teste">
      <b>Teste</b>
      <a v-for="[id, nome] in [['oculos', 'Óculos'], ['solar', 'Sistema solar'], ['roda', 'Roda'], ['constelacao', 'Constelação'], ['anel', 'Planeta com anel'], ['cartas', 'Cartas'], ['esfera', 'Esfera'], ['imersiva', 'Tela imersiva']]" :key="id" :href="'/?teste=' + id">{{ nome }}</a>
      <a class="on" href="/?teste=galaxia">Galáxia</a>
      <a href="/?teste=portais">Portais (antigo)</a><a href="/">Site (anel)</a>
    </nav>
  </div>
</template>

<style scoped>
.galaxy-portals{position:relative;width:112%;max-width:680px;margin-inline:-6%;perspective:1100px}
.gp-scene{position:relative;aspect-ratio:1/.82;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.gp-sky{position:absolute;inset:-6% -4%;width:108%;height:112%;pointer-events:none}
.core{position:absolute;left:50%;top:50%;z-index:3;width:30%;aspect-ratio:1;transform:translate(-50%,-50%)}
.core::before{content:'';position:absolute;inset:-40%;border-radius:50%;background:radial-gradient(circle,#bff3ff40,#3fd0ef22 35%,transparent 68%);pointer-events:none}
.core-ring{position:absolute;inset:-8%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 40%,#00b7e3 62%,#8ee1f2 70%,#8f6bff 82%,transparent 95%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 10px #00b7e3);animation:spin 8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.core-lens{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:#0a1024;box-shadow:0 0 0 1px #ffffff26,0 20px 50px #0009,0 0 70px #3fd0ef55}
.core-lens img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover}
.core-glass{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 30% 22%,#ffffff40,transparent 38%),radial-gradient(circle at 50% 50%,transparent 55%,#070b1a99 100%)}
.warp-enter-active{transition:opacity 1s .2s ease,filter 1.1s .15s cubic-bezier(.2,.8,.2,1),scale 1.2s .15s cubic-bezier(.2,.8,.2,1)}
.warp-leave-active{transition:opacity .7s ease,filter .7s ease,scale .8s cubic-bezier(.6,0,.8,.4)}
.warp-enter-from{opacity:0;filter:blur(10px) brightness(1.5);scale:.88}
.warp-leave-to{opacity:0;filter:blur(12px) brightness(1.7);scale:1.25}
.mini{--lit:0;position:absolute;left:50%;top:50%;width:14%;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:#0a1024;cursor:pointer;will-change:transform}
.mini img{width:100%;height:100%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1.5px rgb(142 225 242 / calc(.3 + var(--lit) * .55)),0 8px 20px #0009,0 0 calc(10px + var(--lit) * 18px) #3fd0ef66;filter:saturate(calc(.7 + var(--lit) * .4)) brightness(calc(.8 + var(--lit) * .25));transition:box-shadow .3s}
.mini:hover img,.mini:focus-visible img{box-shadow:0 0 0 2px #fff,0 8px 20px #0009,0 0 30px #00b7e3}
.mini-name{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);padding:5px 10px;border-radius:99px;background:#070b1acc;color:#e6f6fb;font:600 12px var(--font-body);white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none}
.mini:hover .mini-name,.mini:focus-visible .mini-name{opacity:1}
.op-caption{display:grid;justify-items:center;gap:6px;margin-top:-2%;text-align:center;position:relative;z-index:5}
.op-caption>span{color:#8fa9b8;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.op-caption b{font-family:var(--font-title);font-size:clamp(30px,3vw,40px);font-weight:500;line-height:1.05;letter-spacing:.01em}
.op-link{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:10px 18px;border:1px solid #ffffff26;border-radius:99px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:.25s}
.op-link:hover{border-color:#00b7e3;background:#00b7e31f}
.op-link svg{width:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}
.op-link:hover svg{transform:translateX(3px)}
.swap-enter-active,.swap-leave-active{transition:opacity .35s,transform .35s}
.swap-enter-from{opacity:0;transform:translateY(8px)}.swap-leave-to{opacity:0;transform:translateY(-8px)}
.lab-bar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin-top:18px;padding:8px 10px;border:1px dashed #8ee1f244;border-radius:16px;background:#070b1a99;position:relative;z-index:5}
.lab-bar b{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#ffb86b;margin-right:4px}
.lab-bar a{padding:5px 11px;border:1px solid #ffffff1f;border-radius:99px;color:#cfe3ee;font:600 12px var(--font-body);text-decoration:none}
.lab-bar a:hover{border-color:#00b7e3}
.lab-bar .on{background:#bfefff;color:#06102a;border-color:#bfefff}
@media(prefers-reduced-motion:reduce){.core-ring{animation:none}}
@media(max-width:1000px){.galaxy-portals{width:100%;margin-inline:auto}}
@media(max-width:700px){.core{width:36%}.mini{width:16%}.op-caption b{font-size:28px}}
</style>
