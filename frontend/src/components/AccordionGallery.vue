<script setup>
import { ref } from 'vue';
defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const active = ref(0);
function activate(index, event) { if (!event || event.pointerType === 'mouse') active.value = index; }
</script>
<template>
  <div class="accordion-gallery" :class="{ reduced }" aria-label="Galeria de projetos Miniverso">
    <article v-for="(item, index) in items" :key="item.id" class="gallery-panel" :class="{ expanded: active === index }" @pointerenter="activate(index, $event)">
      <img :src="item.url_imagem" :alt="'Cena do projeto ' + item.titulo" width="960" height="540" loading="lazy" />
      <button class="gallery-select" type="button" :aria-expanded="active === index" :aria-controls="'gallery-detail-' + item.id" @click="active = index" @keydown.right.prevent="active = (index + 1) % items.length" @keydown.left.prevent="active = (index + items.length - 1) % items.length">
        <span class="gallery-number">0{{ index + 1 }}</span><span class="gallery-short">{{ item.titulo.split(':')[0] }}</span><span aria-hidden="true">{{ active === index ? '−' : '+' }}</span>
      </button>
      <div :id="'gallery-detail-' + item.id" class="gallery-detail" v-show="active === index">
        <span class="gallery-category">{{ item.categoria }}</span>
        <h3>{{ item.titulo }}</h3><p>{{ item.descricao }}</p>
        <a :href="item.url" target="_blank" rel="noopener noreferrer">Explorar projeto <span aria-hidden="true">↗</span><span class="sr-only"> (abre em outra aba)</span></a>
      </div>
    </article>
  </div>
  <p class="gallery-hint">Selecione um mundo para explorar <span aria-hidden="true">↔</span></p>
</template>
<style scoped>
.accordion-gallery { display: flex; gap: 12px; margin-top: 54px; height: clamp(420px, 42vw, 610px); }
.gallery-panel { position: relative; flex: 1; min-width: 0; overflow: hidden; border: 1px solid #aa98cb36; border-radius: 20px; background: #111020; transition: flex .7s cubic-bezier(.22,1,.36,1), border-color .5s; }
.gallery-panel.expanded { flex: 3.1; border-color: #96d6e577; }
.gallery-panel::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg,#090a1833 0%,#090a1800 35%,#090a18e8 80%); pointer-events: none; }
.gallery-panel img { width: 100%; height: 100%; display: block; object-fit: cover; filter: saturate(.35) brightness(.5); transform: scale(1.07); transition: filter .7s, transform 1s; }
.gallery-panel.expanded img { filter: saturate(.9) brightness(.85); transform: scale(1); }
.gallery-select { position: absolute; z-index: 2; inset: 0 0 auto; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 64px; padding: 18px; border: 0; color: #f4f0fb; background: linear-gradient(#070914b0,transparent); text-align: left; cursor: pointer; }
.gallery-select > span:last-child { margin-left: auto; }
.gallery-number { font: 10px var(--font-mono); color: #a5dfeb; }
.gallery-short { font-size: 12px; }
.gallery-detail { position: absolute; z-index: 2; bottom: 26px; left: 26px; right: 26px; }
.gallery-category { font: 9px/1.6 var(--font-mono); color: #a6dfeb; text-transform: uppercase; }
.gallery-detail h3 { margin: 12px 0; font-size: clamp(24px,2.8vw,42px); font-weight: 500; line-height: 1.12; letter-spacing: -.035em; }
.gallery-detail p { max-width: 40ch; margin: 12px 0; font-size: 13px; color: #d2c9e0; line-height: 1.6; }
.gallery-detail a { display: inline-flex; gap: 28px; align-items: center; min-height: 44px; font-size: 12px; color: #f4f0fb; text-decoration: none; border-bottom: 1px solid #a6dfeb77; }
.gallery-hint { margin: 20px 0 0; color: #a69db8; font: 10px var(--font-mono); display: flex; justify-content: space-between; }
@media(max-width:700px) {
 .accordion-gallery { flex-direction: column; height: 700px; gap: 10px; margin-top: 36px; }
 .gallery-panel { flex: 0 0 72px; }
 .gallery-panel.expanded { flex: 1; }
 .gallery-short { font-size: 14px; }
 .gallery-detail { left: 20px; right: 20px; bottom: 22px; }
 .gallery-detail h3 { font-size: 27px; }
}
.reduced .gallery-panel, .reduced img { transition: none; }
</style>
