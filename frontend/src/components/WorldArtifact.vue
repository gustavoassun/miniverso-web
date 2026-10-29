<script setup>
import { computed, ref } from 'vue';
const props = defineProps({ reduced: Boolean, compact: Boolean });
const pointer = ref({ x: 0, y: 0 });
const active = ref(false);
const sceneStyle = computed(() => ({
  '--tilt-x': `${props.reduced ? 0 : -pointer.value.y * 7}deg`,
  '--tilt-y': `${props.reduced ? 0 : pointer.value.x * 10}deg`,
  '--light-x': `${50 + pointer.value.x * 30}%`,
  '--light-y': `${50 + pointer.value.y * 30}%`
}));
function move(event) {
  if (event.pointerType !== 'mouse') return;
  const box = event.currentTarget.getBoundingClientRect();
  pointer.value = {
    x: Math.max(-1, Math.min(1, (event.clientX - box.left) / box.width * 2 - 1)),
    y: Math.max(-1, Math.min(1, (event.clientY - box.top) / box.height * 2 - 1))
  };
  active.value = true;
}
function reset() { pointer.value = { x: 0, y: 0 }; active.value = false; }
</script>

<template>
  <div class="world-artifact" :class="{ reduced, compact, active }" :style="sceneStyle"
    tabindex="0" role="img" aria-label="Logo da Miniverso conectada a jogos, negócios e criação 3D."
    @pointermove="move" @pointerleave="reset" @focus="active = true" @blur="reset">
    <div class="artifact-light" aria-hidden="true" />
    <div class="artifact-scene" aria-hidden="true">
      <svg class="artifact-orbits" viewBox="0 0 480 420" fill="none">
        <ellipse cx="240" cy="222" rx="194" ry="110" transform="rotate(-16 240 222)" />
        <ellipse class="orbit-secondary" cx="240" cy="222" rx="165" ry="95" transform="rotate(24 240 222)" />
        <path class="artifact-links" d="M112 119L178 189 M369 148L307 192 M274 322L253 242" />
        <g class="artifact-platform"><ellipse cx="240" cy="345" rx="148" ry="27"/><ellipse cx="240" cy="345" rx="115" ry="18"/><path d="M92 345H126 M354 345H388 M240 318V328 M240 363V373"/></g>
        <g class="artifact-pixels"><rect x="71" y="250" width="4" height="4"/><rect x="383" y="268" width="5" height="5"/><rect x="271" y="64" width="3" height="3"/><rect x="170" y="310" width="3" height="3"/></g>
      </svg>
      <div class="artifact-brand"><img src="/images/miniverso-logo.png" alt="" width="1024" height="236"/><span>IDEIAS EM OUTRA DIMENSÃO</span></div>
      <div class="artifact-node node-games"><svg viewBox="0 0 40 40" fill="none"><path d="M12 12H28C32 12 34 16 35 22L36 28C36 32 32 34 29 30L25 26H15L11 30C8 34 4 32 4 28L5 22C6 16 8 12 12 12Z M10 19H18 M14 15V23"/><circle cx="26" cy="18" r="1.5"/><circle cx="30" cy="22" r="1.5"/></svg><span>JOGOS</span></div>
      <div class="artifact-node node-business"><svg viewBox="0 0 40 40" fill="none"><path d="M7 28V33H34 M11 28V22H16V28 M21 28V17H26V28 M31 28V11H36V28 M9 17L19 12L26 14L35 5 M29 5H35V11"/></svg><span>NEGÓCIOS</span></div>
      <div class="artifact-node node-create"><svg viewBox="0 0 40 40" fill="none"><path d="M20 4L34 12V28L20 36L6 28V12Z M6 12L20 20L34 12 M20 20V36 M12 16V24L20 29L28 24V16"/></svg><span>CRIAÇÃO 3D</span></div>
    </div>
  </div>
</template>

<style scoped>
.world-artifact{position:relative;width:100%;max-width:480px;aspect-ratio:480/420;margin:auto;perspective:900px;border-radius:50%;outline-offset:8px;}
.artifact-scene{position:absolute;inset:0;transform:rotateX(var(--tilt-x)) rotateY(var(--tilt-y));transform-style:preserve-3d;transition:transform .35s ease-out;}
.artifact-light{position:absolute;inset:5%;border-radius:50%;background:radial-gradient(circle at var(--light-x) var(--light-y),#76d8ef26,transparent 62%);opacity:.25;transition:opacity .45s;}
.active .artifact-light{opacity:1;}
.artifact-orbits{position:absolute;inset:0;width:100%;height:100%;stroke:#8dccdf;stroke-width:.8;stroke-opacity:.3;}
.orbit-secondary{stroke-dasharray:130 14;stroke-opacity:.16;}.artifact-links{stroke-opacity:.3;stroke-dasharray:3 5;}.artifact-platform{stroke-opacity:.32;}.artifact-pixels{fill:#a5e7f7;stroke:none;opacity:.45;}
.artifact-brand{position:absolute;left:17%;right:17%;top:44%;transform:translateZ(28px);text-align:center;}
.artifact-brand img{display:block;width:100%;height:auto;filter:drop-shadow(0 0 5px #85d3ed14);transition:filter .45s;}
.artifact-brand>span{display:block;margin-top:14px;font:6px var(--font-mono);letter-spacing:.2em;color:#8cb7c8;}
.active .artifact-brand img{filter:drop-shadow(0 0 13px #85d3ed66);}
.artifact-node{position:absolute;display:grid;place-items:center;gap:8px;width:18%;padding:12px 4px;border:1px solid #82c1d840;border-radius:12px 3px 12px 3px;background:linear-gradient(135deg,#3b749731,#091c29bb);box-shadow:inset 0 0 16px #8adaee07;transform:translateZ(40px);transition:box-shadow .45s,border-color .45s;}
.artifact-node svg{width:32px;height:32px;stroke:#9ed5e7;stroke-width:1.2;}.artifact-node span{font:7px var(--font-mono);letter-spacing:.08em;color:#b3d5e3;white-space:nowrap;}
.node-games{left:13%;top:14%;}.node-business{right:12%;top:22%;}.node-create{left:44%;bottom:8%;}
.active .artifact-node{border-color:#9de1f27a;box-shadow:0 0 18px #70bdd315,inset 0 0 16px #8adaee12;}
.compact{max-width:360px;}.reduced .artifact-scene,.reduced .artifact-light,.reduced .artifact-brand img,.reduced .artifact-node{transition:none;}
@media(max-width:700px){.world-artifact{max-width:320px;}.artifact-node{padding:9px 2px;gap:5px;}.artifact-node svg{width:24px;height:24px;}.artifact-node span{font-size:5px;}.artifact-brand>span{font-size:5px;letter-spacing:.1em;}}
</style>
