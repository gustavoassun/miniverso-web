<template>
  <button ref="button" class="hold-button" type="button" :style="{ '--hold': `${progress}%` }"
    @pointerdown="start" @pointerup="stop" @pointerleave="stop" @pointercancel="stop"
    @keydown.space.prevent="start" @keyup.space.prevent="stop" @keydown.enter.prevent="start" @keyup.enter.prevent="stop">
    <span class="hold-fill" aria-hidden="true" />
    <span class="hold-label">{{ completed ? 'Excluído' : active ? 'Continue segurando…' : label }}</span>
  </button>
</template>

<script setup>
import { onUnmounted, ref } from 'vue';
const props = defineProps({ label: { type: String, default: 'Segure para excluir' }, duration: { type: Number, default: 1100 } });
const emit = defineEmits(['confirm']);
const progress = ref(0); const active = ref(false); const completed = ref(false);
let startedAt = 0; let frame = 0;
const tick = (time) => {
  if (!active.value) return;
  progress.value = Math.min(100, ((time - startedAt) / props.duration) * 100);
  if (progress.value >= 100) { active.value = false; completed.value = true; emit('confirm'); setTimeout(() => { completed.value = false; progress.value = 0; }, 700); return; }
  frame = requestAnimationFrame(tick);
};
const start = () => { if (active.value || completed.value) return; active.value = true; startedAt = performance.now() - (progress.value / 100) * props.duration; frame = requestAnimationFrame(tick); };
const stop = () => { active.value = false; cancelAnimationFrame(frame); if (!completed.value) progress.value = 0; };
onUnmounted(() => cancelAnimationFrame(frame));
</script>

<style scoped>
.hold-button{position:relative;overflow:hidden;isolation:isolate;min-height:44px;padding:11px 16px;border:1px solid #ff8b8b66;border-radius:12px;color:#ffc6c6;background:#30182055;cursor:pointer}.hold-fill{position:absolute;z-index:-1;inset:0;transform:translateX(calc(-100% + var(--hold)));background:linear-gradient(90deg,#8c273e,#d54b64);transition:transform .05s linear}.hold-label{position:relative;font-size:12px;font-weight:650;letter-spacing:.01em}
</style>
