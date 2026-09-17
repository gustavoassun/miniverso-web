<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ enabled: Boolean, reduced: Boolean });
const root = ref(null), active = ref(0), bubbleStyle = ref({}), burst = ref(0);
const items = [{ label: 'Início', id: 'inicio' }, { label: 'Estúdio', id: 'sobre' }, { label: 'Projetos', id: 'portfolio' }, { label: 'Contato', id: 'contato' }];
let resize, frame = 0;
function position() {
  const link = root.value?.querySelectorAll('a')[active.value];
  if (link) bubbleStyle.value = { width: `${link.offsetWidth}px`, transform: `translateX(${link.offsetLeft}px)` };
}
function scroll() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    let current = 0;
    items.forEach((item, index) => { const element = document.getElementById(item.id); if (element && element.getBoundingClientRect().top <= window.innerHeight * .4) current = index; });
    active.value = current; position();
  });
}
async function navigate(index, event) {
  const element = document.getElementById(items[index].id);
  if (!element) return;
  event.preventDefault(); active.value = index; burst.value++;
  element.scrollIntoView({ behavior: props.reduced ? 'instant' : 'smooth', block: 'start' });
  if (element.hasAttribute('tabindex')) element.focus({ preventScroll: true });
  history.replaceState(history.state, '', `#${items[index].id}`);
  await nextTick(); position();
}
watch(() => props.enabled, async () => { await nextTick(); position(); scroll(); });
onMounted(() => { resize = new ResizeObserver(position); resize.observe(root.value); window.addEventListener('scroll', scroll, { passive: true }); position(); scroll(); });
onUnmounted(() => { resize?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); });
</script>
<template>
  <nav ref="root" class="gooey-nav" :class="{ visible: enabled, reduced }" aria-label="Explorar Miniverso" :inert="!enabled">
    <span class="gooey-pill" :style="bubbleStyle" aria-hidden="true"><i v-for="i in 4" :key="`${burst}-${i}`" :style="{ '--i': i }" /></span>
    <a v-for="(item, index) in items" :key="item.id" :href="'#' + item.id" :aria-current="active === index ? 'location' : undefined" @click="navigate(index, $event)">{{ item.label }}</a>
  </nav>
</template>
<style scoped>
.gooey-nav { position: fixed; z-index: 60; bottom: max(22px,env(safe-area-inset-bottom)); left: 50%; transform: translate(-50%,20px); display: flex; gap: 3px; padding: 6px; border: 1px solid #b7a4d633; border-radius: 40px; background: #131022e8; backdrop-filter: blur(16px); box-shadow: 0 12px 36px #0004; opacity: 0; pointer-events: none; transition: opacity .5s, transform .5s; }
.gooey-nav.visible { opacity: 1; transform: translate(-50%,0); pointer-events: auto; }
.gooey-nav a, .gooey-nav a:not(.login-link) { position: relative; z-index: 2; display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 0 19px; border-radius: 30px; text-decoration: none; color: #c4bcd2; font-size: 12px; white-space: nowrap; transition: color .35s; }
.gooey-nav a[aria-current] { color: #151222; }
.gooey-pill { position: absolute; top: 6px; left: 0; height: 44px; border-radius: 30px; background: #b6dce8; transition: transform .55s cubic-bezier(.22,1,.36,1),width .55s; }
.gooey-pill i { position: absolute; width: 7px; height: 7px; left: calc(17% * var(--i)); top: 18px; border-radius: 50%; background: #b6dce8; animation: nav-bubble .6s ease-out both; }
@keyframes nav-bubble { 40% { transform: translateY(calc(-7px - var(--i) * 2px)); } 100% { transform: translateY(0); opacity: 0; } }
@media(max-width:700px) { .gooey-nav { bottom: max(14px,env(safe-area-inset-bottom)); } .gooey-nav a, .gooey-nav a:not(.login-link) { padding-inline: 14px; font-size: 11px; } }
.reduced, .reduced .gooey-pill { transition: none; } .reduced i { animation: none; }
.gooey-nav{background:#0c1b29eb;border-color:#9bcede40;}.gooey-nav a,.gooey-nav a:not(.login-link){color:#b8ccda;}.gooey-nav a[aria-current]{color:#102433;}
</style>
