<template>
  <div class="project-page">
    <SpaceSky enabled :reduced="reduced" />
    <!-- :key: ao ir de um projeto para outro (anterior/próximo), a entrada suave se repete -->
    <div v-if="project" :key="project.id" class="pd-body">
      <!-- Capa do projeto -->
      <header class="hero">
        <div class="hero-media" :style="{ '--py': parallax + 'px' }"><img :src="project.url_imagem" :alt="'Cena do projeto ' + project.titulo" width="1600" height="900"></div>
        <span class="hero-shade" aria-hidden="true" />
        <div class="hero-copy">
          <router-link class="back" to="/projetos"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5M11 6l-6 6 6 6" /></svg>Todos os projetos</router-link>
          <p class="kicker"><span>{{ String(index + 1).padStart(2, '0') }}</span>{{ project.categoria }}</p>
          <h1>{{ project.titulo }}</h1>
          <p class="sub">{{ project.descricao }}</p>
        </div>
        <span class="scroll-cue" aria-hidden="true"><i /></span>
      </header>

      <!-- Ficha -->
      <section class="facts" aria-label="Ficha do projeto">
        <div v-if="detail?.cliente"><span>Cliente</span><b>{{ detail.cliente }}</b></div>
        <div v-if="detail?.ocasiao"><span>Onde</span><b>{{ detail.ocasiao }}</b></div>
        <div><span>Setor</span><b>{{ project.setor }}</b></div>
        <div v-if="detail?.plataforma"><span>Tecnologia</span><b>{{ detail.plataforma }}</b></div>
      </section>

      <template v-if="detail">
        <section class="summary">
          <p class="eyebrow">Em resumo</p>
          <p class="big">{{ detail.resumo }}</p>
          <ul class="highlights">
            <li v-for="h in detail.destaques" :key="h[1]"><b>{{ h[0] }}</b><span>{{ h[1] }}</span></li>
          </ul>
        </section>

        <section class="chapters">
          <article class="chapter">
            <span class="ch-tag"><i>01</i>O desafio</span>
            <h2>{{ detail.desafio.titulo }}</h2>
            <p>{{ detail.desafio.texto }}</p>
          </article>
          <figure class="frame">
            <img :src="project.url_imagem" alt="" width="1600" height="900" loading="lazy">
            <figcaption>{{ project.titulo }}</figcaption>
          </figure>
          <article class="chapter">
            <span class="ch-tag"><i>02</i>A solução</span>
            <h2>{{ detail.solucao.titulo }}</h2>
            <p>{{ detail.solucao.texto }}</p>
          </article>
        </section>
      </template>

      <!-- Anterior / próximo -->
      <nav class="pager" aria-label="Outros projetos">
        <router-link v-if="prev" :to="'/projetos/' + prev.id" class="pg prev">
          <img :src="prev.url_imagem" alt="" loading="lazy"><span class="pg-shade" />
          <span class="pg-text"><small>← Anterior</small><b>{{ prev.titulo }}</b></span>
        </router-link>
        <router-link v-if="next" :to="'/projetos/' + next.id" class="pg next">
          <img :src="next.url_imagem" alt="" loading="lazy"><span class="pg-shade" />
          <span class="pg-text"><small>Próximo →</small><b>{{ next.titulo }}</b></span>
        </router-link>
      </nav>

      <section class="ask">
        <h2>Quer uma experiência <span class="grad">como esta?</span></h2>
        <div class="ask-actions">
          <button class="btn primary" type="button" aria-haspopup="dialog" @click="brief.open()">Conte sua ideia <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          <router-link class="btn ghost" to="/projetos">Ver todos os projetos</router-link>
        </div>
      </section>
    </div>

    <section v-else class="missing">
      <h1>Projeto não encontrado</h1>
      <p>Ele pode ter saído do portfólio.</p>
      <router-link class="btn primary" to="/projetos">Ver os projetos</router-link>
    </section>
    <ContactBrief ref="brief" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import SpaceSky from '../components/SpaceSky.vue';
import ContactBrief from '../components/ContactBrief.vue';
import { useProjectStore } from '../utils/projectStore.js';
import { projectDetails } from '../utils/projectDetails.js';

const route = useRoute();
const brief = ref(null);
const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const { projects } = useProjectStore();
const list = computed(() => projects.value.filter(p => p.publicado));
const index = computed(() => list.value.findIndex(p => p.id === route.params.id));
const project = computed(() => list.value[index.value] || null);
const detail = computed(() => projectDetails[route.params.id] || null);
const prev = computed(() => (index.value > 0 ? list.value[index.value - 1] : null));
const next = computed(() => (index.value >= 0 && index.value < list.value.length - 1 ? list.value[index.value + 1] : null));
const parallax = ref(0);
let frame = 0;
const onScroll = () => { if (!frame) frame = requestAnimationFrame(() => { frame = 0; parallax.value = reduced ? 0 : Math.min(scrollY, innerHeight) * 0.35; }); };
onMounted(() => addEventListener('scroll', onScroll, { passive: true }));
onUnmounted(() => { removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); });
</script>

<style scoped>
.project-page{--cyan:#00b7e3;--blue:#1e4488;--indigo:#1e1645;--ink:#eef8fc;--muted:#a9c0cc;--line:#ffffff16;position:relative;isolation:isolate;min-height:100vh;color:var(--ink);font-family:var(--font-body);background:#070b1a;overflow-x:clip}
.project-page>*:not(.space-sky){position:relative;z-index:1}
h1,h2{max-width:none;margin:0;font-family:var(--font-title);font-weight:500;letter-spacing:.01em}
.grad{background:linear-gradient(90deg,#8ee1f2,var(--cyan) 45%,#5a7dd8);-webkit-background-clip:text;background-clip:text;color:transparent}
.eyebrow{display:inline-flex;align-items:center;gap:12px;margin:0 0 22px;color:var(--cyan);font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase}
.eyebrow::before{content:'';width:32px;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue))}
/* Capa */
.hero{position:relative;min-height:100svh;display:flex;align-items:flex-end;padding:0 8% 12vh;overflow:hidden}
.hero-media{position:absolute;inset:0;transform:translateY(var(--py));will-change:transform}
.hero-media img{width:100%;height:100%;object-fit:cover;transform:scale(1.04);animation:heroIn 1.8s cubic-bezier(.2,.8,.2,1) both}
@keyframes heroIn{from{transform:scale(1.1);opacity:.4;filter:brightness(.7)}}
.hero-shade{position:absolute;inset:0;background:linear-gradient(180deg,#070b1a99 0%,#070b1a22 30%,#070b1acc 72%,#070b1a 100%),linear-gradient(90deg,#070b1acc,transparent 70%)}
.hero-copy{position:relative;max-width:900px}
.hero-copy>*{animation:rise 1s .25s cubic-bezier(.2,.8,.2,1) both}
.hero-copy>:nth-child(2){animation-delay:.35s}.hero-copy>:nth-child(3){animation-delay:.45s}.hero-copy>:nth-child(4){animation-delay:.55s}
@keyframes rise{from{opacity:0;transform:translateY(8px)}}
.back{display:inline-flex;align-items:center;gap:10px;margin-bottom:34px;padding:10px 18px 10px 14px;border:1px solid #ffffff26;border-radius:99px;background:#070b1a99;backdrop-filter:blur(8px);color:#fff;font-size:14px;font-weight:600;text-decoration:none;transition:.25s}
.back:hover{border-color:var(--cyan);background:#00b7e31f}
.back svg{width:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.kicker{display:flex;align-items:center;gap:14px;margin:0 0 18px;color:#8ee1f2;font-size:14px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.kicker span{font-family:var(--font-title);font-size:30px;letter-spacing:0;color:#fff}
.hero h1{font-size:clamp(64px,9vw,150px);line-height:.88}
.sub{max-width:40ch;margin:22px 0 0;color:#d2e3eb;font-size:clamp(18px,1.6vw,22px);line-height:1.5}
.scroll-cue{position:absolute;left:50%;bottom:28px;width:26px;height:42px;margin-left:-13px;border:1.5px solid #ffffff55;border-radius:99px}
.scroll-cue i{position:absolute;left:50%;top:8px;width:4px;height:8px;margin-left:-2px;border-radius:4px;background:#fff;animation:cue 1.8s ease-in-out infinite}
@keyframes cue{60%{transform:translateY(14px);opacity:0}}
/* Ficha */
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:1px;margin:0 8%;border:1px solid var(--line);border-radius:24px;overflow:hidden;background:var(--line);transform:translateY(-40px)}
.facts div{display:grid;gap:6px;padding:22px 24px;background:#0b1430f0;backdrop-filter:blur(10px)}
.facts span{color:var(--cyan);font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.facts b{font-size:17px;font-weight:700;line-height:1.35}
/* Resumo */
.summary{padding:80px 8% 40px;max-width:1300px}
.big{margin:0;font-family:var(--font-title);font-size:clamp(36px,4.2vw,64px);font-weight:500;line-height:1.08;letter-spacing:.01em}
.highlights{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:50px 0 0;padding:0;list-style:none}
.highlights li{display:grid;gap:6px;padding:24px 26px;border:1px solid var(--line);border-radius:22px;background:linear-gradient(160deg,#ffffff0b,#ffffff03)}
.highlights b{font-family:var(--font-title);font-size:56px;font-weight:500;line-height:1;background:linear-gradient(90deg,#fff,#8ee1f2);-webkit-background-clip:text;background-clip:text;color:transparent}
.highlights span{color:var(--muted);font-size:15px}
/* Capítulos */
.chapters{display:grid;gap:70px;padding:60px 8% 90px}
.chapter{display:grid;grid-template-columns:minmax(180px,.4fr) minmax(0,1fr);gap:20px 50px;max-width:1200px}
.ch-tag{display:flex;align-items:center;gap:12px;align-self:start;color:var(--muted);font-size:15px;font-weight:700;letter-spacing:.12em;text-transform:uppercase}
.ch-tag i{display:grid;place-items:center;width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,var(--cyan),var(--blue) 60%,var(--indigo));color:#fff;font-style:normal;font-size:14px;letter-spacing:0}
.chapter h2{grid-column:2;font-size:clamp(38px,4vw,58px);line-height:1}
.chapter p{grid-column:2;max-width:60ch;margin:0;color:var(--muted);font-size:18px;line-height:1.7}
.frame{position:relative;margin:0;overflow:hidden;border:1px solid var(--line);border-radius:32px;aspect-ratio:21/9;box-shadow:0 40px 100px #0009}
.frame img{width:100%;height:100%;object-fit:cover;transition:transform 1.2s cubic-bezier(.2,.8,.2,1)}
.frame:hover img{transform:scale(1.04)}
.frame figcaption{position:absolute;left:22px;bottom:18px;padding:8px 14px;border-radius:99px;background:#070b1acc;backdrop-filter:blur(6px);font-size:13px;font-weight:600}
/* Anterior / próximo */
.pager{display:grid;grid-template-columns:1fr 1fr;gap:18px;padding:0 8% 60px}
.pg{position:relative;overflow:hidden;display:flex;align-items:flex-end;min-height:220px;padding:26px;border:1px solid var(--line);border-radius:26px;color:#fff;text-decoration:none;isolation:isolate}
.pg.next{grid-column:2;text-align:right;justify-content:flex-end}
.pg img{position:absolute;inset:0;z-index:-2;width:100%;height:100%;object-fit:cover;filter:brightness(.6) saturate(.8);transition:transform 1s cubic-bezier(.2,.8,.2,1),filter .6s}
.pg:hover img{transform:scale(1.06);filter:brightness(.8)}
.pg-shade{position:absolute;inset:0;z-index:-1;background:linear-gradient(0deg,#070b1ae6,transparent 70%)}
.pg-text{display:grid;gap:6px}
.pg small{color:#8ee1f2;font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase}
.pg b{font-family:var(--font-title);font-size:clamp(30px,2.8vw,42px);font-weight:500;line-height:1}
/* Convite */
.ask{display:grid;justify-items:center;gap:30px;padding:60px 8% 120px;text-align:center}
.ask h2{font-size:clamp(48px,6vw,90px);line-height:.95}
.ask-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:14px}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border-radius:99px;font:700 16px var(--font-body);text-decoration:none;cursor:pointer;transition:transform .25s,box-shadow .25s,background .25s,border-color .25s}
.btn svg{width:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.btn.primary{border:0;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));box-shadow:0 14px 36px #00b7e333}
.btn.primary:hover{transform:translateY(-2px)}
.btn.ghost{border:1px solid #ffffff2a;color:var(--ink);background:#0b143066}
.btn.ghost:hover{border-color:#ffffff55}
.missing{display:grid;justify-items:center;gap:18px;min-height:70vh;place-content:center;text-align:center}
.missing h1{font-size:64px}.missing p{color:var(--muted)}
@media(max-width:800px){
  .hero{padding:0 6% 14vh}.facts{margin:0 6%}.summary,.chapters{padding-inline:6%}
  .highlights{grid-template-columns:1fr}
  .chapter{grid-template-columns:1fr}.chapter h2,.chapter p{grid-column:auto}
  .frame{aspect-ratio:4/3;border-radius:24px}
  .pager{grid-template-columns:1fr;padding:0 6% 50px}.pg.next{grid-column:auto}
  .btn{width:100%}
}
@media(prefers-reduced-motion:reduce){.hero-media img,.hero-copy>*,.scroll-cue i{animation:none}}
</style>
