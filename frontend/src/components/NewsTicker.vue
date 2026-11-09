<script setup>
// Novidades da Miniverso: avisos curtos cadastrados no painel, passando numa faixa fina (não é blog).
// Pausa com o mouse em cima; com "reduzir movimento", vira uma lista parada que rola para o lado.
import { computed } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const list = computed(() => props.items.filter(n => n.publicado && n.texto));
const loop = computed(() => (list.value.length ? [...list.value, ...list.value] : []));
const fmt = (d) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d || '')) return ''; const [y, m, dd] = d.split('-').map(Number); return new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' }).format(new Date(y, m - 1, dd)).replace(/\./g, ''); };
const isExternal = (l) => /^https?:/i.test(l || '');
</script>

<template>
  <aside v-if="list.length" class="news" :class="{ still: reduced }" aria-label="Novidades da Miniverso">
    <span class="tag"><i aria-hidden="true" />Novidades</span>
    <div class="track-wrap">
      <ul class="track" :style="{ '--dur': Math.max(18, list.length * 9) + 's' }">
        <li v-for="(n, k) in (reduced ? list : loop)" :key="n.id + '-' + k" :aria-hidden="k >= list.length ? 'true' : null">
          <span class="date">{{ fmt(n.data) }}</span>
          <component :is="n.link ? (isExternal(n.link) ? 'a' : 'router-link') : 'span'" v-bind="n.link ? (isExternal(n.link) ? { href: n.link, target: '_blank', rel: 'noopener' } : { to: n.link }) : {}" class="text" :tabindex="k >= list.length ? -1 : null">{{ n.texto }}<span v-if="n.link" class="arrow" aria-hidden="true">→</span></component>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.news{display:flex;align-items:center;gap:16px;margin:0 0 34px;padding:10px 10px 10px 12px;border:1px solid #ffffff1a;border-radius:999px;background:linear-gradient(90deg,#0c1b29cc,#0c1328cc);backdrop-filter:blur(10px);overflow:hidden}
.tag{flex:none;display:inline-flex;align-items:center;gap:8px;padding:7px 14px;border-radius:999px;background:linear-gradient(110deg,#00b7e3,#1e5bb8 60%,#6a4bd6);color:#fff;font-size:13px;font-weight:700;letter-spacing:.04em}
.tag i{width:7px;height:7px;border-radius:50%;background:#fff;box-shadow:0 0 8px #fff;animation:blink 1.6s ease-in-out infinite}
@keyframes blink{50%{opacity:.3}}
.track-wrap{flex:1;min-width:0;overflow:hidden;mask-image:linear-gradient(90deg,transparent,#000 4%,#000 96%,transparent)}
.track{display:flex;gap:48px;width:max-content;margin:0;padding:0;list-style:none;animation:scroll var(--dur) linear infinite}
.news:hover .track,.news:focus-within .track{animation-play-state:paused}
@keyframes scroll{to{transform:translateX(-50%)}}
li{display:flex;align-items:center;gap:12px;white-space:nowrap}
.date{color:#7fe4ff;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.text{color:#e6f4fb;font-size:15px;text-decoration:none}
a.text:hover,.text:hover{color:#fff}
.arrow{margin-left:8px;color:#00b7e3}
.still .track{animation:none;overflow-x:auto}
@media(prefers-reduced-motion:reduce){.track{animation:none}.tag i{animation:none}}
@media(max-width:700px){.news{border-radius:20px;flex-direction:column;align-items:flex-start;gap:10px;padding:12px}.text{font-size:14px}}
</style>
