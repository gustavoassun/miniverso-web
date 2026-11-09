<script setup>
// Duas faixas correndo em sentidos opostos: as áreas que a Miniverso atende (com ícone) e os projetos (com foto).
// Param quando o mouse passa por cima.
import { computed } from 'vue';
const props = defineProps({ areas: { type: Array, default: () => [] }, projects: { type: Array, default: () => [] } });
const twice = (arr, k) => [...arr, ...arr].map((x, i) => ({ ...x, key: `${k}-${i}` }));
const rowA = computed(() => twice(props.areas, 'a'));
const rowB = computed(() => twice(props.projects, 'b'));
</script>

<template>
  <div class="marquee" aria-label="Áreas atendidas e projetos da Miniverso">
    <div class="row">
      <div class="lane">
        <span v-for="a in rowA" :key="a.key" class="area">
          <span class="ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="a.icon" /></svg></span>
          <span><b>{{ a.label }}</b><small>{{ a.detail }}</small></span>
        </span>
      </div>
    </div>
    <div class="row reverse">
      <div class="lane">
        <span v-for="p in rowB" :key="p.key" class="proj">
          <img :src="p.url_imagem" alt="" loading="lazy" width="160" height="90">
          <span><b>{{ p.titulo.split(':')[0] }}</b><small>{{ p.setor }}</small></span>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marquee{display:grid;gap:16px;margin-top:48px;-webkit-mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent);mask:linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)}
.row{overflow:hidden}
.lane{display:flex;gap:16px;width:max-content;animation:lane 46s linear infinite}
.reverse .lane{animation-direction:reverse;animation-duration:58s}
.marquee:hover .lane{animation-play-state:paused}
@keyframes lane{to{transform:translateX(calc(-50% - 8px))}}
.area,.proj{display:flex;align-items:center;gap:14px;padding:12px 24px 12px 12px;border:1px solid #ffffff16;border-radius:99px;background:#0b1430b3;backdrop-filter:blur(8px);color:#eaf6fb;white-space:nowrap;transition:border-color .3s,background .3s}
.area:hover,.proj:hover{border-color:#00b7e366;background:#10204acc}
.ico{display:grid;place-items:center;width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#00b7e3,#1e4488 60%,#1e1645)}
.ico svg{width:22px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.area b,.proj b{display:block;font-size:17px;font-weight:700}
.area small,.proj small{display:block;margin-top:2px;color:#8fb0c0;font-size:13px}
.proj{padding:8px 24px 8px 8px}
.proj img{width:84px;height:52px;border-radius:99px;object-fit:cover}
@media(prefers-reduced-motion:reduce){.lane{animation:none;flex-wrap:wrap;width:auto}}
@media(max-width:700px){.area b,.proj b{font-size:15px}.ico{width:40px;height:40px}.proj img{width:70px;height:44px}}
</style>
