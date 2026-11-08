<script setup>
// Portais em órbita: o mundo em destaque fica num portal grande no centro; os outros projetos giram em volta numa
// órbita inclinada, passando por trás e pela frente (crescem e acendem quando passam na frente). A cada poucos
// segundos o próximo mundo assume o centro; clicar num portal pequeno leva ele para o centro na hora.
// Só anima enquanto está na tela; o mouse em cima pausa a troca automática.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const list = computed(() => props.items.slice(0, 8));
const active = ref(0);
const current = computed(() => list.value[active.value] || {});
const others = computed(() => list.value.map((p, i) => ({ p, i })).filter(x => x.i !== active.value));
const root = ref(null);
const pos = ref({});
const tilt = ref({ x: 0, y: 0 });
let raf = 0, timer = 0, io, ro, visible = false, hover = false, last = 0, angle = 0, size = 500;
const CYCLE = 5200;

function layout(dt) {
  angle += dt * 0.16;
  const n = others.value.length, out = {};
  const narrow = size < 460, rx = size * (narrow ? 0.44 : 0.5), ry = size * 0.17, rot = (-10 * Math.PI) / 180;
  others.value.forEach((o, k) => {
    const a = angle + (k / n) * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    const x = ex * Math.cos(rot) - ey * Math.sin(rot), y = ex * Math.sin(rot) + ey * Math.cos(rot);
    const depth = Math.sin(a);
    out[o.p.id] = { transform: `translate(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%)) scale(${(0.72 + depth * 0.22).toFixed(3)})`, zIndex: depth > 0.1 ? 4 : 1, opacity: (0.5 + depth * 0.5).toFixed(2), '--lit': Math.max(0, depth).toFixed(2) };
  });
  pos.value = out;
}
function loop(now) {
  raf = 0; if (!visible || document.hidden) return;
  layout(props.reduced ? 0 : Math.min(0.05, (now - (last || now)) / 1000)); last = now;
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
watch(() => list.value.length, () => { if (active.value >= list.value.length) active.value = 0; layout(0); });
onMounted(() => {
  ro = new ResizeObserver(() => { size = root.value.clientWidth; layout(0); }); ro.observe(root.value);
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); cycle(); }); io.observe(root.value);
  document.addEventListener('visibilitychange', kick);
});
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', kick); });
</script>

<template>
  <div ref="root" class="orbit-portals" :class="{ reduced }" @pointermove="move" @pointerenter="enter" @pointerleave="leave">
    <div class="op-halo" aria-hidden="true" />
    <div class="op-scene" :style="{ transform: `rotateX(${(-tilt.y * 6).toFixed(2)}deg) rotateY(${(tilt.x * 8).toFixed(2)}deg)` }">
      <svg class="op-orbit" viewBox="-50 -50 100 100" aria-hidden="true">
        <defs><linearGradient id="opOrbit" x1="0" x2="1"><stop offset="0" stop-color="#8ee1f2" stop-opacity=".05" /><stop offset=".5" stop-color="#8ee1f2" stop-opacity=".5" /><stop offset="1" stop-color="#a99bff" stop-opacity=".1" /></linearGradient></defs>
        <ellipse rx="50" ry="17" transform="rotate(-10)" fill="none" stroke="url(#opOrbit)" stroke-width=".3" />
        <ellipse rx="42" ry="14" transform="rotate(-10)" fill="none" stroke="#8ee1f2" stroke-width=".15" stroke-dasharray=".6 1.4" opacity=".4" />
      </svg>

      <!-- Portal central -->
      <div class="core">
        <span class="core-ring" aria-hidden="true" />
        <div class="core-lens">
          <TransitionGroup name="warp">
            <img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" :loading="i === 0 ? 'eager' : 'lazy'">
          </TransitionGroup>
          <span class="core-glass" aria-hidden="true" />
          <span :key="'flash' + active" class="core-flash" aria-hidden="true" />
        </div>
      </div>

      <!-- Portais pequenos em órbita -->
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
  </div>
</template>

<style scoped>
.orbit-portals{position:relative;width:112%;max-width:680px;margin-inline:-6%;perspective:1100px}
.op-halo{position:absolute;left:10%;right:10%;top:4%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#00b7e32e,#4b3fb024 45%,transparent 70%);filter:blur(30px);animation:breathe 7s ease-in-out infinite;pointer-events:none}
@keyframes breathe{50%{transform:scale(1.08);opacity:.75}}
.op-scene{position:relative;aspect-ratio:1/.82;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.op-orbit{position:absolute;left:0;top:50%;width:100%;height:auto;aspect-ratio:1;transform:translateY(-50%);overflow:visible;pointer-events:none}
/* Portal central */
.core{position:absolute;left:50%;top:50%;z-index:3;width:44%;aspect-ratio:1;transform:translate(-50%,-50%)}
.core-ring{position:absolute;inset:-7%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 40%,#00b7e3 62%,#8ee1f2 70%,#8f6bff 82%,transparent 95%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 10px #00b7e3);animation:spin 8s linear infinite}
.core-ring::after{content:'';position:absolute;inset:0;border-radius:50%;border:1px solid #8ee1f233}
@keyframes spin{to{transform:rotate(360deg)}}
.core-lens{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:#0a1024;box-shadow:0 0 0 1px #ffffff26,0 30px 70px #0009,0 0 60px #00b7e333}
.core-lens img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover}
.core-glass{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 30% 22%,#ffffff40,transparent 38%),radial-gradient(circle at 50% 50%,transparent 55%,#070b1a99 100%)}
.core-flash{position:absolute;left:50%;top:50%;width:30%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%) scale(.2);border:2px solid #bdf2ff;box-shadow:0 0 30px #00b7e3,inset 0 0 30px #00b7e388;opacity:0;animation:flash 1.2s .1s cubic-bezier(.2,.8,.2,1) both;pointer-events:none}
@keyframes flash{25%{opacity:.9}100%{opacity:0;transform:translate(-50%,-50%) scale(4)}}
.warp-enter-active{transition:opacity 1s .2s ease,filter 1.1s .15s cubic-bezier(.2,.8,.2,1),scale 1.2s .15s cubic-bezier(.2,.8,.2,1)}
.warp-leave-active{transition:opacity .7s ease,filter .7s ease,scale .8s cubic-bezier(.6,0,.8,.4)}
.warp-enter-from{opacity:0;filter:blur(10px) brightness(1.5);scale:.88}
.warp-leave-to{opacity:0;filter:blur(12px) brightness(1.7);scale:1.25}
/* Portais pequenos */
.mini{--lit:0;position:absolute;left:50%;top:50%;width:19%;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:#0a1024;cursor:pointer;will-change:transform}
.mini img{width:100%;height:100%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1.5px rgb(142 225 242 / calc(.25 + var(--lit) * .6)),0 10px 24px #0009,0 0 calc(var(--lit) * 24px) #00b7e388;filter:saturate(calc(.6 + var(--lit) * .5)) brightness(calc(.7 + var(--lit) * .35));transition:box-shadow .3s}
.mini:hover img,.mini:focus-visible img{box-shadow:0 0 0 2px #fff,0 10px 24px #0009,0 0 30px #00b7e3}
.mini-name{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);padding:5px 10px;border-radius:99px;background:#070b1acc;color:#e6f6fb;font:600 12px var(--font-body);white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none}
.mini:hover .mini-name,.mini:focus-visible .mini-name{opacity:1}
/* Legenda */
.op-caption{display:grid;justify-items:center;gap:6px;margin-top:-2%;text-align:center}
.op-caption>span{color:#8fa9b8;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.op-caption b{font-family:var(--font-title);font-size:clamp(30px,3vw,40px);font-weight:500;line-height:1.05;letter-spacing:.01em}
.op-link{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:10px 18px;border:1px solid #ffffff26;border-radius:99px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:.25s}
.op-link:hover{border-color:#00b7e3;background:#00b7e31f}
.op-link svg{width:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}
.op-link:hover svg{transform:translateX(3px)}
.swap-enter-active,.swap-leave-active{transition:opacity .35s,transform .35s}
.swap-enter-from{opacity:0;transform:translateY(8px)}.swap-leave-to{opacity:0;transform:translateY(-8px)}
.reduced .op-halo,.reduced .core-ring,.reduced .core-flash{animation:none}
@media(max-width:1000px){.orbit-portals{width:100%;margin-inline:auto}}
@media(max-width:700px){.core{width:52%}.mini{width:20%}.op-caption b{font-size:28px}}
</style>
