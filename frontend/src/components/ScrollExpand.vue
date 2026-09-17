<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { clamp } from '../utils/introMotion.js';
const props = defineProps({ src: String, alt: String, reduced: Boolean });
const root = ref(null), progress = ref(0);
let frame = 0, resize;
const style = computed(() => {
  const p = props.reduced ? 1 : progress.value;
  return { '--expand-inset': `${(1 - p) * 13}%`, '--expand-radius': `${(1 - p) * 32 + 8}px`, '--media-scale': 1.15 - p * .15 };
});
function measure() {
  frame = 0;
  const box = root.value?.getBoundingClientRect();
  if (box) { const p = clamp((window.innerHeight * .85 - box.top) / (window.innerHeight * .8)); progress.value = p * p * (3 - 2 * p); }
}
function scroll() { if (!frame) frame = requestAnimationFrame(measure); }
watch(() => props.reduced, measure);
onMounted(() => { resize = new ResizeObserver(scroll); resize.observe(root.value); window.addEventListener('scroll', scroll, { passive: true }); measure(); });
onUnmounted(() => { resize?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); });
</script>
<template>
  <figure ref="root" class="scroll-expand" :style="style">
    <div class="expand-frame"><img :src="src" :alt="alt" width="1024" height="576" loading="lazy" /><div class="expand-scrim" />
      <figcaption><span>REALIDADE VIRTUAL / RECICLAVERSO</span><h2>Não é só ver.<br />É estar lá.</h2><p>Uma janela para os mundos que criamos.</p></figcaption>
    </div>
  </figure>
</template>
<style scoped>
.scroll-expand { margin: 0; padding-block: 26px; }
.expand-frame { position: relative; height: clamp(380px,50vw,680px); margin-inline: var(--expand-inset); border-radius: var(--expand-radius); overflow: hidden; border: 1px solid #aa98cb36; }
.expand-frame img { display: block; width: 100%; height: 100%; object-fit: cover; transform: scale(var(--media-scale)); }
.expand-scrim { position: absolute; inset: 0; background: linear-gradient(90deg,#080a18d9,#080a181a),linear-gradient(0deg,#080a1877,transparent); }
figcaption { position: absolute; inset: auto 6% 10%; color: #f5f2fa; }
figcaption > span { color: #b4e2eb; font: 9px/1.5 var(--font-mono); letter-spacing: .12em; }
h2 { margin: 22px 0; font-size: clamp(34px,5.6vw,84px); font-weight: 500; line-height: 1; letter-spacing: -.055em; }
p { font-size: 13px; line-height: 1.6; color: #d2c9e0; }
@media(max-width:700px) { .expand-frame { height: 440px; } figcaption { bottom: 9%; } h2 { font-size: 43px; } }
</style>
