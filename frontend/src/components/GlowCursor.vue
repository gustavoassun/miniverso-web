<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ enabled: Boolean, reduced: Boolean });
const visible = ref(false), activeLink = ref(false), points = ref([]), core = ref({ x: 0, y: 0 });
const capable = ref(false);
const stopped = ref(false);
let query, frame = 0, chain = [], target = { x: 0, y: 0 };
const canUse = computed(() => props.enabled && !props.reduced && capable.value && !stopped.value);
function restore() { visible.value = false; document.documentElement.classList.remove('miniverso-glow-cursor'); cancelAnimationFrame(frame); frame = 0; }
function tick() {
  frame = 0;
  if (!canUse.value || !visible.value || document.hidden) return;
  let previous = target;
  let distance = 0;
  for (const point of chain) { point.x += (previous.x - point.x) * .32; point.y += (previous.y - point.y) * .32; distance += Math.abs(previous.x - point.x) + Math.abs(previous.y - point.y); previous = point; }
  points.value = chain.map(point => ({ ...point }));
  if (distance > .4) frame = requestAnimationFrame(tick);
}
function move(event) {
  if (event.pointerType !== 'mouse' || !canUse.value) return;
  if (event.target.closest('input, textarea, select, [contenteditable="true"]')) { restore(); return; }
  target = { x: event.clientX, y: event.clientY }; core.value = target;
  if (!visible.value) chain = Array.from({ length: 12 }, () => ({ ...target }));
  visible.value = true; activeLink.value = Boolean(event.target.closest('a, button'));
  document.documentElement.classList.add('miniverso-glow-cursor');
  if (!frame) frame = requestAnimationFrame(tick);
}
function key(event) { if (event.key === 'Escape') { stopped.value = true; restore(); } else if (event.key === 'Tab') restore(); }
function capability() { capable.value = query.matches; if (!capable.value) restore(); }
watch(canUse, value => { if (!value) restore(); });
watch(() => props.enabled, () => { stopped.value = false; });
onMounted(() => {
  query = window.matchMedia('(hover: hover) and (pointer: fine)'); capability();
  query.addEventListener('change', capability);
  window.addEventListener('pointermove', move, { passive: true });
  document.addEventListener('pointerleave', restore); window.addEventListener('blur', restore);
  window.addEventListener('keydown', key); document.addEventListener('visibilitychange', restore);
});
onUnmounted(() => {
  restore(); query?.removeEventListener('change', capability);
  window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', restore);
  window.removeEventListener('blur', restore); window.removeEventListener('keydown', key); document.removeEventListener('visibilitychange', restore);
});
</script>
<template>
  <Teleport to="body">
  <svg v-if="visible" class="glow-cursor" aria-hidden="true">
    <circle v-for="(point, index) in points" :key="index" :cx="point.x" :cy="point.y" :r="Math.max(.5, 2.4 - index * .16)" fill="#89b9e0" :opacity=".24 * (1 - index / 12)" />
    <circle :cx="core.x" :cy="core.y" :r="activeLink ? 13 : 9" class="cursor-halo" />
    <circle :cx="core.x" :cy="core.y" r="2.3" fill="#e2f8fc" class="cursor-core" />
  </svg>
  </Teleport>
</template>
<style>
html.miniverso-glow-cursor, html.miniverso-glow-cursor * { cursor: none !important; }
html.miniverso-glow-cursor input, html.miniverso-glow-cursor textarea, html.miniverso-glow-cursor [contenteditable] { cursor: text !important; }
.glow-cursor { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 150; pointer-events: none; overflow: hidden; }
.cursor-halo { fill: #91d9e610; stroke: #91d9e666; stroke-width: .8; transition: r .2s; }
.cursor-core { filter: drop-shadow(0 0 5px #8ee0ec); }
</style>
