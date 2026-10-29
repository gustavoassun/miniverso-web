<script setup>
// Vue/Canvas adaptation of the supplied GhostFibers visual direction.
import { onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ enabled: Boolean, reduced: Boolean });
const canvas = ref(null);
let context, observer, frame = 0, width = 0, height = 0, last = 0, elapsed = 0;
function size() {
  if (!canvas.value) return;
  width = window.innerWidth; height = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.value.width = width * dpr; canvas.value.height = height * dpr;
  context = canvas.value.getContext('2d');
  context?.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}
function draw() {
  if (!context) return;
  context.clearRect(0, 0, width, height);
  const t = elapsed * .00009;
  // Thin harmonic bands, no full-screen shader or flashing white exposure.
  for (let layer = 0; layer < 3; layer++) {
    for (let line = 0; line < 9; line++) {
      context.beginPath();
      for (let x = -40; x < width + 40; x += 14) {
        const n = x / Math.max(width, 1);
        const y = height * (.29 + layer * .23) + Math.sin(n * 4.8 + t + layer * 1.7) * height * .14
          + Math.sin(n * 9 - t * .7 + line * .035) * height * .045 + line * 3;
        if (x === -40) context.moveTo(x, y); else context.lineTo(x, y);
      }
      context.strokeStyle = layer === 1 ? `rgba(142,207,225,${.105 + line * .003})` : `rgba(96,156,210,${.13 + line * .004})`;
      context.lineWidth = line === 4 ? 1.35 : .7;
      context.stroke();
    }
  }
}
function loop(now) {
  frame = 0;
  if (!props.enabled || props.reduced || document.hidden) return;
  if (now - last >= 48) { elapsed += Math.min(now - (last || now), 80); last = now; draw(); }
  frame = requestAnimationFrame(loop);
}
function sync() { cancelAnimationFrame(frame); frame = 0; last = 0; if (props.enabled && !props.reduced && !document.hidden) frame = requestAnimationFrame(loop); else draw(); }
watch(() => [props.enabled, props.reduced], sync);
onMounted(() => { size(); observer = new ResizeObserver(size); observer.observe(canvas.value); document.addEventListener('visibilitychange', sync); sync(); });
onUnmounted(() => { cancelAnimationFrame(frame); observer?.disconnect(); document.removeEventListener('visibilitychange', sync); });
</script>
<template><canvas ref="canvas" class="ghost-fibers" :class="{ visible: enabled }" aria-hidden="true" /></template>
<style scoped>
.ghost-fibers { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; pointer-events: none; opacity: 0; transition: opacity 1.2s ease; mask-image: linear-gradient(90deg, transparent, #000 20%, #000 80%, transparent); }
.ghost-fibers.visible { opacity: 1; }
</style>
