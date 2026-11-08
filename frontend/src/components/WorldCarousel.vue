<script setup>
// Galeria de mundos: carrossel horizontal com cartões grandes, filtro por setor, setas, arrastar com o mouse
// (no celular é o deslizar normal) e luz que acompanha o cursor em cada cartão.
import { computed, nextTick, ref, watch } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean });
const track = ref(null);
const sector = ref('Todos');
const sectors = computed(() => ['Todos', ...new Set(props.items.map(i => i.setor))]);
const list = computed(() => props.items.filter(i => sector.value === 'Todos' || i.setor === sector.value));
const atStart = ref(true), atEnd = ref(false);
function edges() { const t = track.value; if (!t) return; atStart.value = t.scrollLeft < 8; atEnd.value = t.scrollLeft + t.clientWidth > t.scrollWidth - 8; }
function go(dir) { const t = track.value; const card = t?.querySelector('.world'); if (!card) return; t.scrollBy({ left: dir * (card.offsetWidth + 20), behavior: props.reduced ? 'auto' : 'smooth' }); }
watch(sector, async () => { await nextTick(); track.value?.scrollTo({ left: 0 }); edges(); });
// Arrastar com o mouse
let drag = null;
function down(e) { if (e.pointerType !== 'mouse') return; drag = { x: e.clientX, left: track.value.scrollLeft, moved: false }; }
function moveDrag(e) { if (!drag) return; const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) { drag.moved = true; track.value.classList.add('dragging'); } track.value.scrollLeft = drag.left - dx; }
function up() { if (!drag) return; const moved = drag.moved; drag = null; track.value.classList.remove('dragging'); if (moved) { const stop = (ev) => { ev.preventDefault(); ev.stopPropagation(); }; track.value.addEventListener('click', stop, { capture: true, once: true }); } }
function light(e) { const el = e.currentTarget, b = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); }
</script>

<template>
  <div class="world-carousel" :class="{ reduced }">
    <div class="wc-bar">
      <div class="chips" role="group" aria-label="Filtrar projetos por setor">
        <button v-for="s in sectors" :key="s" type="button" :class="{ on: sector === s }" :aria-pressed="sector === s" @click="sector = s">{{ s }}</button>
      </div>
      <div class="arrows">
        <button type="button" aria-label="Projetos anteriores" :disabled="atStart" @click="go(-1)"><svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button type="button" aria-label="Próximos projetos" :disabled="atEnd" @click="go(1)"><svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" /></svg></button>
      </div>
    </div>
    <div ref="track" class="track" tabindex="0" aria-label="Projetos da Miniverso" @scroll.passive="edges" @pointerdown="down" @pointermove="moveDrag" @pointerup="up" @pointerleave="up">
      <TransitionGroup name="world">
        <article v-for="(item, i) in list" :key="item.id" class="world" @pointermove="light">
          <img :src="item.url_imagem" :alt="'Cena do projeto ' + item.titulo" width="960" height="540" loading="lazy" draggable="false">
          <span class="shade" aria-hidden="true" />
          <span class="spot" aria-hidden="true" />
          <div class="world-top"><span class="num">{{ String(i + 1).padStart(2, '0') }}</span><span class="sector">{{ item.setor }}</span></div>
          <div class="world-body">
            <span class="cat">{{ item.categoria.replace(/^\d+ \/ /, '') }}</span>
            <h3>{{ item.titulo }}</h3>
            <p>{{ item.descricao }}</p>
            <router-link :to="'/projetos/' + item.id" draggable="false">Explorar mundo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></router-link>
          </div>
        </article>
      </TransitionGroup>
    </div>
    <p class="hint"><span aria-hidden="true">←</span> Arraste para viajar pelos mundos <span aria-hidden="true">→</span></p>
  </div>
</template>

<style scoped>
.world-carousel{margin-top:48px}
.wc-bar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:22px}
.chips{display:flex;flex-wrap:wrap;gap:8px}
.chips button{min-height:42px;padding:0 18px;border:1px solid #ffffff1c;border-radius:99px;color:#a9c3d1;background:#0b143066;backdrop-filter:blur(6px);font:inherit;font-size:14px;cursor:pointer;transition:.25s}
.chips button:hover{color:#fff;border-color:#ffffff40}
.chips button.on{color:#fff;border-color:transparent;background:linear-gradient(90deg,#00b7e3,#1e4488);box-shadow:0 8px 24px #00b7e333}
.arrows{display:flex;gap:10px}
.arrows button{display:grid;place-items:center;width:52px;height:52px;border:1px solid #ffffff22;border-radius:50%;color:#fff;background:#0b143099;backdrop-filter:blur(6px);cursor:pointer;transition:.25s}
.arrows button:hover:not(:disabled){border-color:#00b7e3;background:#00b7e322;transform:scale(1.06)}
.arrows button:disabled{opacity:.3;cursor:default}
.arrows svg{width:22px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.track{position:relative;display:flex;gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:6px 2px 24px;margin:0 -2px;cursor:grab;outline:none}
.track::-webkit-scrollbar{display:none}
.track.dragging{cursor:grabbing;scroll-snap-type:none}
.track.dragging .world{pointer-events:none}
.world{--mx:50%;--my:50%;position:relative;flex:0 0 clamp(290px,34vw,460px);aspect-ratio:4/5;overflow:hidden;border:1px solid #ffffff18;border-radius:28px;background:#0b1430;scroll-snap-align:start;isolation:isolate;transition:transform .5s cubic-bezier(.2,.8,.2,1),border-color .4s,box-shadow .4s}
.world:hover{transform:translateY(-8px);border-color:#00b7e366;box-shadow:0 30px 60px #0009,0 0 40px #00b7e322}
.world img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:-2;transform:scale(1.04);transition:transform 1.2s cubic-bezier(.2,.8,.2,1),filter .6s;filter:saturate(.85) brightness(.85)}
.world:hover img{transform:scale(1.12);filter:saturate(1.05) brightness(.95)}
.shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#070b1a55 0%,transparent 30%,#070b1acc 62%,#070b1a 100%)}
.spot{position:absolute;inset:0;z-index:-1;background:radial-gradient(360px circle at var(--mx) var(--my),#8ee1f226,transparent 60%);opacity:0;transition:opacity .4s}
.world:hover .spot{opacity:1}
.world-top{display:flex;justify-content:space-between;align-items:center;padding:22px 22px 0}
.num{font-family:var(--font-title);font-size:34px;line-height:1;color:#ffffffcc}
.sector{padding:7px 13px;border-radius:99px;background:#070b1acc;backdrop-filter:blur(6px);color:#8ee1f2;font-size:13px;font-weight:600}
.world-body{position:absolute;left:0;right:0;bottom:0;display:grid;gap:10px;padding:26px}
.cat{color:#8ee1f2;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.world-body h3{margin:0;font-family:var(--font-title);font-size:clamp(36px,3.4vw,50px);font-weight:500;line-height:.98;letter-spacing:.01em;color:#fff}
.world-body p{margin:0;color:#c3d6e0;font-size:15px;line-height:1.55;max-height:0;opacity:0;overflow:hidden;transition:max-height .5s,opacity .4s}
.world:hover .world-body p,.world:focus-within .world-body p{max-height:80px;opacity:1}
.world-body a{display:inline-flex;align-items:center;gap:10px;justify-self:start;margin-top:6px;padding:12px 18px;border-radius:99px;background:#ffffff14;border:1px solid #ffffff2a;backdrop-filter:blur(8px);color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:.3s}
.world-body a:hover{background:#fff;color:#0a1124}
.world-body a svg{width:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.hint{margin:6px 0 0;text-align:center;color:#7f9aaa;font-size:13px;letter-spacing:.1em}
.world-enter-active,.world-leave-active{transition:opacity .4s,transform .4s}
.world-enter-from,.world-leave-to{opacity:0;transform:scale(.94)}
.world-leave-active{position:absolute}
.world-move{transition:transform .5s}
@media(hover:none){.world-body p{max-height:80px;opacity:1}}
@media(max-width:700px){.world{flex-basis:80vw}.arrows{display:none}.chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin:0 -6vw;padding:0 6vw}.chips button{flex:none}}
.reduced .world,.reduced .world img{transition:none}
</style>
