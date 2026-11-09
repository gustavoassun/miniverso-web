<script setup>
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import PlanetIcon from './PlanetIcon.vue';
const props = defineProps({ enabled: Boolean, reduced: Boolean, showBrand: Boolean });
const root = ref(null), active = ref(0), bubbleStyle = ref({}), burst = ref(0);
const items = [{ label: 'Planeta', id: 'inicio', planet: true }, { label: 'Estúdio', id: 'sobre' }, { label: 'Projetos', id: 'portfolio' }, { label: 'Contato', id: 'contato' }];
let resize, frame = 0;
function position() {
  const link = root.value?.querySelectorAll('.nav-link')[active.value];
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
  // "Planeta" usa o mesmo portal do botão flutuante, que leva direto ao planeta já pronto.
  if (items[index].planet && event?.currentTarget?.classList.contains('nav-link')) {
    const back = document.querySelector('.back-planet');
    if (back) { event.preventDefault(); back.click(); return; }
  }
  const element = document.getElementById(items[index].id);
  if (!element) return;
  event.preventDefault(); active.value = index; burst.value++;
  element.scrollIntoView({ behavior: props.reduced ? 'instant' : 'smooth', block: 'start' });
  if (element.hasAttribute('tabindex')) element.focus({ preventScroll: true });
  history.replaceState(history.state, '', `#${items[index].id}`);
  await nextTick(); position();
}
watch(() => props.enabled, async () => { await nextTick(); position(); scroll(); });
watch(() => props.showBrand, async () => { await nextTick(); position(); });
onMounted(() => { resize = new ResizeObserver(position); resize.observe(root.value); window.addEventListener('scroll', scroll, { passive: true }); position(); scroll(); });
onUnmounted(() => { resize?.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('scroll', scroll); });
</script>
<template>
  <nav ref="root" class="gooey-nav" :class="{ visible: enabled, reduced, 'has-brand': showBrand }" aria-label="Explorar Miniverso" :inert="!enabled">
    <!-- Logo: volta à capa (o óculos 3D) pelo portal; o motor do planeta cuida do clique em links para "/". -->
    <a v-if="showBrand" class="nav-brand" href="/" aria-label="Miniverso: voltar à abertura" title="Voltar à abertura"><img src="/images/miniverso-logo.png" alt="" width="1024" height="236" /></a>
    <span class="gooey-pill" :style="bubbleStyle" aria-hidden="true"><i v-for="i in 4" :key="`${burst}-${i}`" :style="{ '--i': i }" /></span>
    <a v-for="(item, index) in items" :key="item.id" class="nav-link" :href="'#' + item.id" :aria-current="active === index ? 'location' : undefined" @click="navigate(index, $event)"><i v-if="item.planet" class="nav-orb" aria-hidden="true"><PlanetIcon :moon="false" /></i>{{ item.label }}</a>
  </nav>
</template>
<style scoped>
.gooey-nav { position: fixed; z-index: 60; top: max(clamp(22px,5vh,56px),env(safe-area-inset-top)); right: 5%; transform: translateY(-16px); display: flex; align-items: center; gap: 3px; padding: 6px; border: 1px solid #9bcede40; border-radius: 40px; background: #0c1b29eb; backdrop-filter: blur(16px); box-shadow: 0 12px 36px #0004; opacity: 0; pointer-events: none; transition: opacity .4s, transform .4s; }
.gooey-nav.visible { opacity: 1; transform: translateY(0); pointer-events: auto; }
.gooey-nav .nav-brand { position: relative; z-index: 2; display: inline-flex; align-items: center; justify-content: center; min-height: 44px; margin-inline: 12px 14px; animation: brand-appear .3s ease-out both; }
.nav-brand img { display: block; width: 104px; height: auto; opacity: .92; transition: opacity .3s, filter .3s, transform .3s; }
.nav-brand:hover img, .nav-brand:focus-visible img { opacity: 1; filter: drop-shadow(0 0 8px #3fd0ef99); transform: scale(1.04); }
.gooey-nav .nav-brand::after { content: ''; position: absolute; right: -14px; top: 22%; bottom: 22%; width: 1px; background: linear-gradient(180deg, transparent, #9bcede55, transparent); }
.nav-brand:focus-visible { outline: 2px solid #3fd0ef; outline-offset: 4px; border-radius: 8px; }
.gooey-nav .nav-link { position: relative; z-index: 2; display: inline-flex; min-height: 44px; align-items: center; justify-content: center; padding: 0 19px; border-radius: 30px; text-decoration: none; color: #b8ccda; font-size: 12px; white-space: nowrap; transition: color .35s; }
.gooey-nav .nav-link[aria-current] { color: #102433; }
.nav-orb { position: relative; display: block; width: 20px; height: 20px; margin: -4px 8px -4px 0; }
.gooey-pill { position: absolute; top: 6px; left: 0; height: 44px; border-radius: 30px; background: #b6dce8; transition: transform .55s cubic-bezier(.22,1,.36,1),width .55s; }
.gooey-pill i { position: absolute; width: 7px; height: 7px; left: calc(17% * var(--i)); top: 18px; border-radius: 50%; background: #b6dce8; animation: nav-bubble .6s ease-out both; }
@keyframes nav-bubble { 40% { transform: translateY(calc(-7px - var(--i) * 2px)); } 100% { transform: translateY(0); opacity: 0; } }
@keyframes brand-appear { from { opacity: 0; transform: translateX(8px); } to { opacity: 1; transform: translateX(0); } }
@media(min-width:701px) and (max-width:1100px) { .gooey-nav { top: max(16px,env(safe-area-inset-top)); right: 3%; } .gooey-nav .nav-link { padding-inline: 13px; font-size: 11px; } }
@media(max-width:700px) { .gooey-nav { top: max(12px,env(safe-area-inset-top)); right: 4%; max-width: 92vw; } .gooey-nav .nav-brand { margin-inline: 6px 8px; } .nav-brand img { width: 82px; } .gooey-nav .nav-link { padding-inline: 11px; font-size: 11px; } }
/* Celular: tudo numa linha só. No lugar do logo inteiro fica só o símbolo do óculos (a parte esquerda da mesma
   imagem), e os quatro itens se dividem por igual no espaço que sobra. */
@media(max-width:440px) {
  .gooey-nav { left: 4%; right: 4%; max-width: none; }
  .gooey-nav .nav-link { flex: 1 1 0; padding-inline: 4px; font-size: 11px; }
  .gooey-nav .nav-brand { flex: none; width: 30px; overflow: hidden; justify-content: flex-start; margin-inline: 8px 12px; }
  .gooey-nav .nav-brand img { width: 132px; max-width: none; }
  .gooey-nav .nav-brand::after { display: none; }
  .nav-orb { width: 16px; height: 16px; margin-right: 5px; }
}
.reduced, .reduced .gooey-pill { transition: none; } .reduced i { animation: none; }
.reduced .nav-brand { animation: none; }
</style>
