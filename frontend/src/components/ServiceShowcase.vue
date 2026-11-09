<script setup>
// Vitrine dos serviços: à esquerda a lista (troca sozinha, com barra de tempo); à direita a cena do serviço,
// metade foto real e metade "versão virtual" (planta em linhas ciano). A linha que separa as duas passeia
// sozinha e pode ser arrastada — o real virando virtual, que é o que a Miniverso faz.
import { computed, onMounted, onUnmounted, ref } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const active = ref(0);
const split = ref(50);
const dragging = ref(false);
const svc = computed(() => props.items[active.value] || {});
const CYCLE = 7000;
let timer = 0, raf = 0, io, visible = false, t0 = 0, paused = false;
function cycle() { clearTimeout(timer); if (props.reduced || !visible || paused) return; timer = setTimeout(() => { active.value = (active.value + 1) % props.items.length; cycle(); }, CYCLE); }
function choose(i) { active.value = i; cycle(); }
function sweep(now) {
  raf = 0; if (!visible || props.reduced) return;
  if (!dragging.value) split.value = 50 + Math.sin((now - t0) / 1600) * 28;
  raf = requestAnimationFrame(sweep);
}
const stage = ref(null);
function drag(e) {
  if (!dragging.value) return;
  const b = stage.value.getBoundingClientRect();
  split.value = Math.max(4, Math.min(96, ((e.clientX - b.left) / b.width) * 100));
}
function start(e) { dragging.value = true; paused = true; clearTimeout(timer); e.currentTarget.setPointerCapture?.(e.pointerId); drag(e); }
function stop() { if (!dragging.value) return; dragging.value = false; paused = false; t0 = performance.now() - Math.asin(Math.max(-1, Math.min(1, (split.value - 50) / 28))) * 1600; cycle(); }
function key(e) { if (e.key === 'ArrowLeft') split.value = Math.max(4, split.value - 5); if (e.key === 'ArrowRight') split.value = Math.min(96, split.value + 5); }
const root = ref(null);
onMounted(() => {
  t0 = performance.now();
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; cycle(); if (visible && !raf && !props.reduced) raf = requestAnimationFrame(sweep); }); io.observe(root.value);
});
onUnmounted(() => { clearTimeout(timer); cancelAnimationFrame(raf); io?.disconnect(); });
</script>

<template>
  <div ref="root" class="showcase" :class="{ reduced }">
    <div class="tabs" role="tablist" aria-label="Serviços da Miniverso">
      <button v-for="(s, i) in items" :key="s.nome" type="button" role="tab" class="tab" :class="{ on: i === active }" :aria-selected="i === active" @click="choose(i)">
        <span class="t-num">0{{ i + 1 }}</span>
        <span class="t-body">
          <b>{{ s.nome }}</b>
          <span class="t-desc">{{ s.descricao }}</span>
        </span>
        <span class="t-bar" aria-hidden="true"><i :style="{ animationDuration: CYCLE + 'ms' }" /></span>
      </button>
    </div>

    <div ref="stage" class="stage" :style="{ '--split': split + '%' }" @pointermove="drag" @pointerup="stop" @pointercancel="stop">
      <Transition name="scene" mode="out-in">
        <div :key="svc.nome" class="scene">
          <img class="real" :src="svc.imagem" alt="" width="960" height="540">
          <div class="virtual" aria-hidden="true">
            <img :src="svc.imagem" alt="" width="960" height="540">
            <span class="grid" />
          </div>
          <span class="tag t-real">Real</span>
          <span class="tag t-virtual">Virtual</span>
        </div>
      </Transition>
      <button class="handle" type="button" role="slider" aria-label="Comparar real e virtual" :aria-valuenow="Math.round(split)" aria-valuemin="0" aria-valuemax="100" @pointerdown="start" @keydown="key">
        <span class="h-line" /><span class="h-knob"><svg viewBox="0 0 24 24"><path d="M9 6l-6 6 6 6M15 6l6 6-6 6" /></svg></span>
      </button>
      <div class="caption">
        <Transition name="swap" mode="out-in">
          <div :key="svc.nome">
            <ul class="chips"><li v-for="t in svc.tags" :key="t">{{ t }}</li></ul>
            <p>{{ svc.exemplo }}</p>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.showcase{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.3fr);gap:28px;margin-top:64px;align-items:stretch}
.tabs{display:grid;gap:10px;align-content:center}
.tab{position:relative;overflow:hidden;display:grid;grid-template-columns:auto 1fr;gap:18px;align-items:start;padding:24px 26px 28px;border:1px solid #ffffff12;border-radius:24px;background:#0b143066;backdrop-filter:blur(8px);color:inherit;font:inherit;text-align:left;cursor:pointer;transition:border-color .35s,background .35s}
.tab:hover{border-color:#ffffff30}
.tab.on{border-color:#00b7e355;background:linear-gradient(150deg,#00b7e31c,#1e448822)}
.t-num{font-family:var(--font-title);font-size:34px;line-height:1;color:#ffffff40;transition:color .35s}
.tab.on .t-num{color:#8ee1f2}
.t-body b{display:block;font-family:var(--font-title);font-size:clamp(32px,2.8vw,42px);font-weight:500;line-height:1;letter-spacing:.01em;color:#ffffffaa;transition:color .35s}
.tab.on .t-body b{color:#fff}
.t-desc{display:block;max-height:0;overflow:hidden;opacity:0;margin-top:0;color:#a9c0cc;font-size:16px;line-height:1.6;transition:max-height .5s,opacity .4s,margin .4s}
.tab.on .t-desc{max-height:120px;opacity:1;margin-top:10px}
.t-bar{position:absolute;left:26px;right:26px;bottom:12px;height:2px;border-radius:2px;background:#ffffff10;opacity:0;transition:opacity .3s}
.tab.on .t-bar{opacity:1}
.t-bar i{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,#00b7e3,#8ee1f2);transform-origin:left;transform:scaleX(0)}
.tab.on .t-bar i{animation:bar linear forwards}
@keyframes bar{to{transform:scaleX(1)}}
.reduced .tab.on .t-bar i{animation:none;transform:scaleX(1)}
.stage{position:relative;min-height:480px;overflow:hidden;border:1px solid #ffffff18;border-radius:30px;background:#0a1024;box-shadow:0 40px 90px #0009;touch-action:pan-y}
.scene{position:absolute;inset:0}
.scene img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.real{filter:saturate(1.05)}
.virtual{position:absolute;inset:0;clip-path:inset(0 0 0 var(--split))}
.virtual img{filter:grayscale(1) contrast(1.5) brightness(1.05) sepia(1) hue-rotate(160deg) saturate(2.6)}
.virtual::before{content:'';position:absolute;inset:0;z-index:1;background:linear-gradient(135deg,#00b7e322,#1e448866 70%,#1e164599)}
.virtual::after{content:'';position:absolute;inset:0;z-index:2;background:radial-gradient(ellipse at 60% 40%,#8ee1f233,transparent 60%)}
.grid{position:absolute;inset:0;z-index:3;background-image:linear-gradient(#8ee1f230 1px,transparent 1px),linear-gradient(90deg,#8ee1f230 1px,transparent 1px);background-size:32px 32px;animation:gridmove 12s linear infinite}
@keyframes gridmove{to{background-position:32px 32px}}
.tag{position:absolute;top:20px;z-index:4;padding:7px 14px;border-radius:99px;background:#070b1acc;backdrop-filter:blur(6px);font-size:13px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.t-real{left:20px;color:#fff}
.t-virtual{right:20px;color:#8ee1f2}
.handle{position:absolute;top:0;bottom:0;left:var(--split);z-index:5;width:44px;margin-left:-22px;padding:0;border:0;background:none;cursor:ew-resize;touch-action:none}
.h-line{position:absolute;left:50%;top:0;bottom:0;width:2px;margin-left:-1px;background:linear-gradient(180deg,transparent,#8ee1f2 15%,#8ee1f2 85%,transparent);box-shadow:0 0 16px #00b7e3}
.h-knob{position:absolute;left:50%;top:50%;display:grid;place-items:center;width:46px;height:46px;margin:-23px;border-radius:50%;background:#fff;color:#0a1024;box-shadow:0 0 0 6px #00b7e340,0 10px 30px #0008;transition:transform .2s}
.handle:hover .h-knob,.handle:focus-visible .h-knob{transform:scale(1.1)}
.h-knob svg{width:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.caption{position:absolute;left:0;right:0;bottom:0;z-index:4;padding:60px 26px 24px;background:linear-gradient(0deg,#070b1af0,transparent);pointer-events:none}
.caption p{margin:10px 0 0;max-width:46ch;color:#dbe9f0;font-size:16px;line-height:1.55}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:0;padding:0;list-style:none}
.chips li{padding:6px 12px;border-radius:99px;background:#00b7e326;border:1px solid #00b7e344;color:#bdeefa;font-size:13px;font-weight:600}
.scene-enter-active,.scene-leave-active{transition:opacity .6s,transform .8s cubic-bezier(.2,.8,.2,1)}
.scene-enter-from{opacity:0;transform:scale(1.04)}.scene-leave-to{opacity:0}
.swap-enter-active,.swap-leave-active{transition:opacity .4s,transform .4s}
.swap-enter-from{opacity:0;transform:translateY(10px)}.swap-leave-to{opacity:0}
.reduced .grid{animation:none}
@media(max-width:1000px){.showcase{grid-template-columns:1fr}.stage{min-height:400px;order:-1}}
@media(max-width:700px){.showcase{margin-top:40px}.stage{min-height:320px;border-radius:24px}.tab{padding:18px 20px 22px}.caption p{font-size:14px}}
</style>
