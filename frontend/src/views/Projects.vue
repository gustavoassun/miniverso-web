<template>
  <div class="projects-page">
    <SpaceSky enabled :reduced="reduced" />
    <header class="head">
      <router-link class="back" to="/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Voltar ao site</router-link>
      <p class="eyebrow">Portfólio completo</p>
      <h1>Mundos que<br><span class="grad">já criamos.</span></h1>
      <p class="lede">Realidade virtual, jogos, inteligência artificial e vídeo 360°: cada projeto nasceu de um desafio real. Escolha um mundo para conhecer a história.</p>
      <div class="chips" role="group" aria-label="Filtrar por setor">
        <button v-for="s in sectors" :key="s" type="button" :class="{ on: sector === s }" :aria-pressed="sector === s" @click="sector = s">{{ s }} <span>{{ count(s) }}</span></button>
      </div>
    </header>

    <TransitionGroup tag="section" name="grid" class="grid" aria-label="Projetos">
      <router-link v-for="(p, i) in filtered" :key="p.id" :to="'/projetos/' + p.id" class="card" :class="{ wide: i % 3 === 0 }" :style="{ '--d': (i % 6) * 70 + 'ms' }" @pointermove="light">
        <img :src="p.url_imagem" :alt="'Cena do projeto ' + p.titulo" loading="lazy" width="1200" height="675">
        <span class="shade" aria-hidden="true" /><span class="spot" aria-hidden="true" />
        <span class="top"><span class="num">{{ String(list.indexOf(p) + 1).padStart(2, '0') }}</span><span class="sector">{{ p.setor }}</span></span>
        <span class="body">
          <span class="cat">{{ p.categoria }}</span>
          <b>{{ p.titulo }}</b>
          <span class="desc">{{ p.descricao }}</span>
          <span class="go">Conhecer o projeto <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
        </span>
      </router-link>
    </TransitionGroup>

    <section class="ask">
      <h2>Sua ideia pode ser<br><span class="grad">o próximo mundo.</span></h2>
      <button class="btn" type="button" aria-haspopup="dialog" @click="brief.open()">Conte sua ideia <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
    </section>
    <ContactBrief ref="brief" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import SpaceSky from '../components/SpaceSky.vue';
import ContactBrief from '../components/ContactBrief.vue';
import { useProjectStore } from '../utils/projectStore.js';

const brief = ref(null);
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const { projects } = useProjectStore();
const list = computed(() => projects.value.filter(p => p.publicado));
const sector = ref('Todos');
const sectors = computed(() => ['Todos', ...new Set(list.value.map(p => p.setor))]);
const filtered = computed(() => list.value.filter(p => sector.value === 'Todos' || p.setor === sector.value));
const count = (s) => (s === 'Todos' ? list.value.length : list.value.filter(p => p.setor === s).length);
function light(e) { const el = e.currentTarget, b = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); }
</script>

<style scoped>
.projects-page{--cyan:#00b7e3;--blue:#1e4488;--ink:#eef8fc;--muted:#a9c0cc;--line:#ffffff16;position:relative;isolation:isolate;min-height:100vh;padding:150px 8% 0;color:var(--ink);font-family:var(--font-body);background:#070b1a;overflow-x:clip}
.projects-page>*:not(.space-sky){position:relative;z-index:1}
h1,h2{max-width:none;margin:0;font-family:var(--font-title);font-weight:500;letter-spacing:.01em}
.grad{background:linear-gradient(90deg,#8ee1f2,var(--cyan) 45%,#5a7dd8);-webkit-background-clip:text;background-clip:text;color:transparent}
.back{display:inline-flex;align-items:center;gap:10px;margin-bottom:40px;padding:10px 18px 10px 14px;border:1px solid #ffffff26;border-radius:99px;background:#070b1a99;color:#fff;font-size:14px;font-weight:600;text-decoration:none;transition:.25s}
.back:hover{border-color:var(--cyan);background:#00b7e31f}
.back svg{width:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.eyebrow{display:flex;align-items:center;gap:12px;margin:0 0 22px;color:var(--cyan);font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase}
.eyebrow::before{content:'';width:32px;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue))}
.head h1{font-size:clamp(64px,8.6vw,140px);line-height:.88;animation:rise 1s cubic-bezier(.2,.8,.2,1) both}
.lede{max-width:52ch;margin:26px 0 0;color:var(--muted);font-size:clamp(17px,1.4vw,20px);line-height:1.65;animation:rise 1s .1s cubic-bezier(.2,.8,.2,1) both}
@keyframes rise{from{opacity:0;transform:translateY(20px)}}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin:40px 0 0}
.chips button{min-height:44px;padding:0 18px;border:1px solid var(--line);border-radius:99px;color:var(--muted);background:#0b143066;backdrop-filter:blur(6px);font:inherit;font-size:15px;cursor:pointer;transition:.25s}
.chips button span{margin-left:6px;color:#7f9aaa;font-size:13px}
.chips button:hover{color:#fff;border-color:#ffffff40}
.chips button.on{color:#fff;border-color:transparent;background:linear-gradient(90deg,var(--cyan),var(--blue))}
.chips button.on span{color:#ffffffaa}
.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-top:50px}
.card{--mx:50%;--my:50%;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;min-height:440px;border:1px solid var(--line);border-radius:30px;color:#fff;text-decoration:none;isolation:isolate;animation:rise .9s var(--d) cubic-bezier(.2,.8,.2,1) both;transition:transform .5s cubic-bezier(.2,.8,.2,1),border-color .4s,box-shadow .4s}
.card.wide{grid-column:1/-1;min-height:520px}
.card:hover{transform:translateY(-6px);border-color:#00b7e366;box-shadow:0 30px 70px #0009,0 0 40px #00b7e322}
.card img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;filter:brightness(.8) saturate(.9);transition:transform 1.2s cubic-bezier(.2,.8,.2,1),filter .6s}
.card:hover img{transform:scale(1.06);filter:brightness(.95) saturate(1.05)}
.shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(180deg,#070b1a66 0%,transparent 30%,#070b1acc 65%,#070b1a 100%)}
.spot{position:absolute;inset:0;z-index:-1;background:radial-gradient(400px circle at var(--mx) var(--my),#8ee1f222,transparent 60%);opacity:0;transition:opacity .4s}
.card:hover .spot{opacity:1}
.top{display:flex;justify-content:space-between;align-items:center;padding:24px 26px 0}
.num{font-family:var(--font-title);font-size:40px;line-height:1}
.sector{padding:7px 14px;border-radius:99px;background:#070b1acc;backdrop-filter:blur(6px);color:#8ee1f2;font-size:13px;font-weight:700}
.body{display:grid;gap:10px;padding:28px}
.cat{color:#8ee1f2;font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.body b{font-family:var(--font-title);font-size:clamp(40px,4vw,64px);font-weight:500;line-height:.95}
.wide .body b{font-size:clamp(48px,5vw,80px)}
.desc{max-width:52ch;color:#c9dbe5;font-size:16px;line-height:1.5}
.go{display:inline-flex;align-items:center;gap:10px;justify-self:start;margin-top:6px;padding:12px 20px;border-radius:99px;background:#ffffff14;border:1px solid #ffffff2a;backdrop-filter:blur(8px);font-size:14px;font-weight:700;transition:.3s}
.card:hover .go{background:#fff;color:#0a1124}
.go svg{width:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .3s}
.card:hover .go svg{transform:translateX(4px)}
.grid-move{transition:transform .5s}
.grid-enter-active,.grid-leave-active{transition:opacity .4s,transform .4s}
.grid-enter-from,.grid-leave-to{opacity:0;transform:scale(.96)}
.grid-leave-active{position:absolute;visibility:hidden}
.ask{display:grid;justify-items:center;gap:30px;padding:120px 0;text-align:center}
.ask h2{font-size:clamp(48px,6vw,96px);line-height:.95}
.btn{display:inline-flex;align-items:center;gap:10px;min-height:60px;padding:0 32px;border:0;border-radius:99px;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));font:700 17px var(--font-body);cursor:pointer;box-shadow:0 14px 36px #00b7e333;transition:transform .25s}
.btn:hover{transform:translateY(-2px)}
.btn svg{width:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
@media(max-width:800px){.projects-page{padding:120px 6% 0}.grid{grid-template-columns:1fr}.card,.card.wide{min-height:420px}.chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;margin-inline:-6%;padding-inline:6%}.chips button{flex:none}}
@media(prefers-reduced-motion:reduce){.card,.head h1,.lede{animation:none}}
</style>
