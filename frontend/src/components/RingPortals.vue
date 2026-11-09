<script setup>
// Planeta com anel: o mundo em destaque é o planeta, num portal grande no centro; os outros projetos giram no anel
// inclinado em volta dele, passando por trás (menores e apagados) e pela frente (maiores e acesos). A metade da frente
// do anel é desenhada por cima do planeta, a de trás por baixo, para dar profundidade. A cada poucos segundos o próximo
// mundo vira o planeta; clicar num projeto do anel leva ele para o centro. O mouse em cima pausa e inclina a cena.
// Só anima enquanto está na tela.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const list = computed(() => props.items.slice(0, 8));
const active = ref(0);
const current = computed(() => list.value[active.value] || {});
const others = computed(() => list.value.map((p, i) => ({ p, i })).filter(x => x.i !== active.value));
const root = ref(null);
const pos = ref({});
const ring = ref({ back: '', front: '', cx: 0, cy: 0 });
const tilt = ref({ x: 0, y: 0 });
let raf = 0, timer = 0, io, ro, visible = false, hover = false, last = 0, angle = 0, W = 560;
const CYCLE = 5200, TAU = Math.PI * 2, TILT = (-12 * Math.PI) / 180;

function layout(dt) {
  angle += dt * 0.18;
  const H = W * 0.82, rx = W * 0.47, ry = W * 0.12, out = {};
  const pt = a => { const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry; return [ex * Math.cos(TILT) - ey * Math.sin(TILT), ex * Math.sin(TILT) + ey * Math.cos(TILT)]; };
  others.value.forEach((o, k) => {
    const a = angle + (k / others.value.length) * TAU, [x, y] = pt(a), depth = Math.sin(a);
    out[o.p.id] = { width: (W * 0.13 * (0.8 + 0.2 * depth)).toFixed(1) + 'px', transform: `translate(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%))`, zIndex: depth > 0 ? 6 : 2, opacity: (0.55 + depth * 0.45).toFixed(2), '--lit': Math.max(0, depth).toFixed(2) };
  });
  const arc = (a0, a1) => Array.from({ length: 41 }, (_, k) => pt(a0 + (a1 - a0) * k / 40).map(v => v.toFixed(1)).join(',')).join(' ');
  ring.value = { back: arc(Math.PI, TAU), front: arc(0, Math.PI), cx: W / 2, cy: H / 2 };
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
watch(active, () => layout(0));
onMounted(() => {
  ro = new ResizeObserver(() => { W = root.value.clientWidth; layout(0); }); ro.observe(root.value);
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); cycle(); }); io.observe(root.value);
  document.addEventListener('visibilitychange', kick);
});
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', kick); });
</script>

<template>
  <div ref="root" class="ring-portals" @pointermove="move" @pointerenter="enter" @pointerleave="leave">
    <div class="rp-halo" aria-hidden="true" />
    <div class="rp-scene" :style="{ transform: `rotateX(${(-tilt.y * 6).toFixed(2)}deg) rotateY(${(tilt.x * 8).toFixed(2)}deg)` }">
      <!-- metade de trás do anel -->
      <svg class="rp-ring" aria-hidden="true"><g :transform="`translate(${ring.cx} ${ring.cy})`"><polyline :points="ring.back" fill="none" stroke="#8ee1f2" stroke-opacity=".35" stroke-width="1.2" /></g></svg>

      <!-- planeta: o mundo em destaque -->
      <div class="core">
        <span class="core-ring" aria-hidden="true" />
        <div class="core-lens">
          <TransitionGroup name="warp">
            <img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" :loading="i === 0 ? 'eager' : 'lazy'">
          </TransitionGroup>
          <span class="core-glass" aria-hidden="true" />
        </div>
      </div>

      <!-- projetos no anel -->
      <button v-for="o in others" :key="o.p.id" type="button" class="mini" :style="pos[o.p.id]" :aria-label="'Ver ' + o.p.titulo" @click="pick(o.i)">
        <img :src="o.p.url_imagem" alt="" width="200" height="200" loading="lazy">
        <span class="mini-name">{{ o.p.titulo.split(':')[0] }}</span>
      </button>

      <!-- metade da frente do anel (passa na frente do planeta) -->
      <svg class="rp-ring front" aria-hidden="true"><g :transform="`translate(${ring.cx} ${ring.cy})`"><polyline :points="ring.front" fill="none" stroke="#8ee1f2" stroke-opacity=".6" stroke-width="1.6" /></g></svg>
    </div>

    <div class="op-caption" aria-live="polite">
      <span>Agora você está em</span>
      <Transition name="swap" mode="out-in"><b :key="current.id">{{ current.titulo }}</b></Transition>
      <router-link v-if="current.id" :to="'/projetos/' + current.id" class="op-link">Explorar este mundo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></router-link>
    </div>
  </div>
</template>

<style scoped>
.ring-portals{position:relative;width:112%;max-width:680px;margin-inline:-6%;perspective:1100px}
.rp-halo{position:absolute;left:10%;right:10%;top:4%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#00b7e32e,#4b3fb024 45%,transparent 70%);filter:blur(30px);pointer-events:none}
.rp-scene{position:relative;aspect-ratio:1/.82;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.rp-ring{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1}
.rp-ring.front{z-index:5}
/* Planeta */
.core{position:absolute;left:50%;top:50%;z-index:4;width:40%;aspect-ratio:1;transform:translate(-50%,-50%)}
.core-ring{position:absolute;inset:-7%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 40%,#00b7e3 62%,#8ee1f2 70%,#8f6bff 82%,transparent 95%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 10px #00b7e3);animation:spin 8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.core-lens{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:#0a1024;box-shadow:0 0 0 1px #ffffff26,0 30px 70px #0009,0 0 60px #00b7e333}
.core-lens img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover}
.core-glass{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 30% 22%,#ffffff40,transparent 38%),radial-gradient(circle at 50% 50%,transparent 55%,#070b1a99 100%)}
.warp-enter-active{transition:opacity 1s .2s ease,filter 1.1s .15s cubic-bezier(.2,.8,.2,1),scale 1.2s .15s cubic-bezier(.2,.8,.2,1)}
.warp-leave-active{transition:opacity .7s ease,filter .7s ease,scale .8s cubic-bezier(.6,0,.8,.4)}
.warp-enter-from{opacity:0;filter:blur(10px) brightness(1.5);scale:.88}
.warp-leave-to{opacity:0;filter:blur(12px) brightness(1.7);scale:1.25}
/* Projetos no anel */
.mini{--lit:0;position:absolute;left:50%;top:50%;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:#0a1024;cursor:pointer;will-change:transform}
.mini img{width:100%;height:100%;border-radius:50%;object-fit:cover;box-shadow:0 0 0 1.5px rgb(142 225 242 / calc(.28 + var(--lit) * .6)),0 10px 24px #0009,0 0 calc(var(--lit) * 30px) #00b7e3aa;filter:saturate(calc(.65 + var(--lit) * .45)) brightness(calc(.75 + var(--lit) * .3))}
.mini:hover img,.mini:focus-visible img{box-shadow:0 0 0 2px #fff,0 10px 24px #0009,0 0 30px #00b7e3}
.mini-name{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);padding:5px 10px;border-radius:99px;background:#070b1acc;color:#e6f6fb;font:600 12px var(--font-body);white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none}
.mini:hover .mini-name,.mini:focus-visible .mini-name{opacity:1}
/* Legenda */
.op-caption{display:grid;justify-items:center;gap:6px;margin-top:-2%;text-align:center;position:relative;z-index:5}
.op-caption>span{color:#8fa9b8;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.op-caption b{font-family:var(--font-title);font-size:clamp(30px,3vw,40px);font-weight:500;line-height:1.05;letter-spacing:.01em}
.op-link{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:10px 18px;border:1px solid #ffffff26;border-radius:99px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:.25s}
.op-link:hover{border-color:#00b7e3;background:#00b7e31f}
.op-link svg{width:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}
.op-link:hover svg{transform:translateX(3px)}
.swap-enter-active,.swap-leave-active{transition:opacity .35s,transform .35s}
.swap-enter-from{opacity:0;transform:translateY(8px)}.swap-leave-to{opacity:0;transform:translateY(-8px)}
@media(prefers-reduced-motion:reduce){.core-ring{animation:none}}
@media(max-width:1000px){.ring-portals{width:100%;margin-inline:auto}}
@media(max-width:700px){.op-caption b{font-size:28px}}
</style>
