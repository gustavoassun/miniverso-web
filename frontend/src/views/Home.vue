<template>
  <div class="home-page">
    <SpaceSky :enabled="entered" :reduced="scene.reduced" />
    <GlowCursor :enabled="entered" :reduced="scene.reduced" />
    <GooeyNav :enabled="entered" :reduced="scene.reduced" show-brand />
    <LineSidebar v-if="entered" :items="progressSections" />
    <MiniversoIntro @scene-change="scene = $event" />

    <!-- 2. Sobre a Miniverso -->
    <section id="sobre" data-progress-section aria-labelledby="manifesto-title" class="manifesto">
      <div class="manifesto-copy">
        <p v-reveal class="eyebrow">Sobre a Miniverso</p>
        <h2 id="manifesto-title" v-reveal="80">Pequeno no nome.<br><span class="grad">Imenso nas possibilidades.</span></h2>
        <p v-reveal="160" class="lede">Nós não criamos apenas ambientes 3D. Construímos novas formas de interagir, aprender e fazer negócios, num mundo em que a tela plana já não é suficiente.</p>
        <div v-reveal="240" class="hero-actions">
          <a class="btn primary" href="#portfolio" @click.prevent="goTo('portfolio')">Conhecer os mundos <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></a>
          <button class="btn ghost" type="button" aria-haspopup="dialog" @click="contactBrief.open()">Conte sua ideia</button>
        </div>
      </div>
      <component :is="sobreVisual" v-reveal="120" :items="projetos" :reduced="scene.reduced" v-bind="sobreTeste ? { mode: sobreTeste } : {}" />
    </section>

    <!-- 3. Por que imersão -->
    <section id="impacto" data-progress-section aria-labelledby="impacto-title" class="impacto">
      <div class="heading center">
        <p v-reveal class="eyebrow">Por que imersão?</p>
        <h2 id="impacto-title" v-reveal="80">Experiências que fazem<br><span class="grad">a ideia permanecer.</span></h2>
      </div>
      <div class="glass-grid">
        <article v-for="(b, i) in beneficios" :key="b.nome" v-reveal="i * 110" class="glass" @pointermove="light">
          <span class="spot" aria-hidden="true" />
          <div class="vis" :class="b.vis" aria-hidden="true">
            <template v-if="b.vis === 'focus'">
              <span class="gv-orbit" />
              <span class="gv-swirl"><i v-for="n in 9" :key="n" :style="{ '--a': n * 40 + 'deg', '--t': -(n * .37) + 's' }" /></span>
              <span class="gv-planet"><span class="gv-ring" /></span>
              <small class="vis-cap">Tudo gira em volta da mensagem</small>
            </template>
            <template v-else-if="b.vis === 'learn'">
              <svg class="const" viewBox="0 0 240 150">
                <path v-for="(l, li) in constLines" :key="li" class="c-line" :d="l" pathLength="1" :style="{ '--d': li * .45 + 's' }" />
                <g v-for="(st, si) in constStars" :key="si" class="c-star" :style="{ '--d': si * .45 + 's' }"><circle :cx="st[0]" :cy="st[1]" r="7" class="c-halo" /><circle :cx="st[0]" :cy="st[1]" r="2.6" /></g>
              </svg>
              <small class="vis-cap">Cada prática liga um ponto</small>
            </template>
            <template v-else>
              <div class="globe">
                <span class="g-solid" />
                <span v-for="n in 6" :key="'m' + n" class="g-mer" :style="{ '--r': n * 30 + 'deg' }" />
                <span v-for="n in 3" :key="'p' + n" class="g-par" :style="{ '--y': (n - 2) * 30 + '%', '--w': n === 2 ? '100%' : '86%' }" />
              </div>
              <small class="vis-cap">Veja antes de construir</small>
            </template>
            <span class="g-num">0{{ i + 1 }}</span>
          </div>
          <h3><span class="grad">{{ b.destaque }}</span>{{ b.complemento }}</h3>
          <p>{{ b.descricao }}</p>
        </article>
      </div>
    </section>

    <!-- 4. O que fazemos -->
    <section id="expertise" data-progress-section aria-labelledby="expertise-title" class="expertise">
      <div class="heading split">
        <div>
          <p v-reveal class="eyebrow">O que fazemos</p>
          <h2 id="expertise-title" v-reveal="80">Cada projeto,<br><span class="grad">um mundo próprio.</span></h2>
        </div>
        <p v-reveal="160" class="lede">Do treinamento que salva vidas à ativação que vira assunto no evento: criamos a experiência certa para cada desafio.</p>
      </div>
      <ServiceShowcase :items="servicos" :reduced="scene.reduced" />
    </section>

    <!-- 5. Portfólio -->
    <section id="portfolio" data-progress-section tabindex="-1" aria-labelledby="portfolio-title" class="portfolio">
      <div class="heading split">
        <div>
          <p v-reveal class="eyebrow">Mundos que criamos</p>
          <h2 id="portfolio-title" v-reveal="80">Ideias que saíram<br><span class="grad">da imaginação.</span></h2>
        </div>
        <router-link v-reveal="160" to="/projetos" class="btn ghost">Portfólio completo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></router-link>
      </div>
      <p v-if="projetos.length === 0" class="empty-state">Estamos reunindo os primeiros projetos da Miniverso. Em breve, esta seleção estará aqui.</p>
      <ScrollExpand src="/images/reciclaverso.png" alt="Cena do Reciclaverso, projeto de realidade virtual e sustentabilidade" :reduced="scene.reduced" />
      <WorldCarousel v-if="projetos.length" :items="projetos" :reduced="scene.reduced" />
      <div class="social">
        <p>Bastidores e novidades da Miniverso</p>
        <div>
          <a href="https://www.instagram.com/meuminiverso/" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><path d="M17 7h.01" /></svg>Instagram<span class="sr-only"> (abre em outra aba)</span></a>
          <a href="https://linktr.ee/miniverso" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>Todos os canais<span class="sr-only"> (abre em outra aba)</span></a>
        </div>
      </div>
    </section>

    <!-- 6. Processo -->
    <section id="processo" ref="processRef" data-progress-section aria-labelledby="processo-title" class="processo" :style="{ '--pp': processP }">
      <div class="proc-sticky">
        <div class="heading center">
          <p class="eyebrow">Do briefing ao lançamento</p>
          <h2 id="processo-title">Clareza em <span class="grad">cada etapa.</span></h2>
        </div>
        <div class="journey">
          <div class="j-track" aria-hidden="true">
            <svg viewBox="0 0 1000 160" preserveAspectRatio="none">
              <path class="r-base" d="M40 120 C 220 10, 330 10, 500 80 S 800 150, 960 40" />
              <path ref="routePath" class="r-glow" d="M40 120 C 220 10, 330 10, 500 80 S 800 150, 960 40" pathLength="1" />
            </svg>
            <span class="comet" :style="comet"><i /></span>
          </div>
          <ol class="stops">
            <li v-for="(e, i) in etapas" :key="e.nome" :class="{ lit: processP >= stopAt[i], active: activeStop === i }">
              <span class="stop-node" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="e.icon" /></svg><span class="node-ring" /></span>
              <span class="stop-num">Etapa 0{{ i + 1 }}</span>
              <h3>{{ e.nome }}</h3>
              <p>{{ e.descricao }}</p>
            </li>
          </ol>
          <div class="j-progress" aria-hidden="true">
            <span>{{ processP >= 0.999 ? 'Projeto no ar' : 'Etapa ' + (activeStop + 1) + ' de 3' }}</span>
            <span class="j-bar"><i /></span>
            <b>{{ Math.round(processP * 100) }}%</b>
          </div>
        </div>
      </div>
    </section>

    <!-- 7. Áreas -->
    <section id="atuacao" data-progress-section aria-labelledby="clientes-title" class="clientes">
      <div class="heading center">
        <p v-reveal class="eyebrow">Tecnologia com contexto</p>
        <h2 id="clientes-title" v-reveal="80">Mundos para<br><span class="grad">diferentes realidades.</span></h2>
      </div>
      <AreaMarquee :areas="areasAtendidas" :projects="projetos" />
    </section>

    <!-- 8. Contato -->
    <section id="contato" data-progress-section aria-labelledby="cta-title" class="cta">
      <div class="portal" aria-hidden="true"><span class="pr pr1" /><span class="pr pr2" /><span class="pr pr3" /><span class="pr pr4" /><span class="p-core" /><i v-for="n in 16" :key="n" :style="{ '--a': n * 22.5 + 'deg', '--t': (n % 5) * .8 + 's' }" /></div>
      <div class="cta-copy">
        <p v-reveal class="eyebrow">Da sua ideia para uma nova dimensão</p>
        <h2 id="cta-title" v-reveal="80">Vamos construir o próximo<br><span class="grad">universo juntos?</span></h2>
        <p v-reveal="160" class="lede">Sua ideia merece um mundo próprio. Conte do seu jeito, mesmo que ainda esteja tomando forma.</p>
        <div v-reveal="240" class="cta-actions">
          <button class="btn primary big" type="button" aria-haspopup="dialog" @click="contactBrief.open()"><span class="shine" aria-hidden="true" />Conte sua ideia <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button>
          <a class="btn ghost big" href="https://www.instagram.com/meuminiverso/" target="_blank" rel="noopener noreferrer">Falar pelo Instagram<span class="sr-only"> (abre em outra aba)</span></a>
        </div>
        <ul v-reveal="320" class="promises">
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Leva 1 minuto</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Sem compromisso</li>
          <li><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Feito sob medida</li>
        </ul>
      </div>
    </section>

    <ContactBrief ref="contactBrief" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import MiniversoIntro from '../components/MiniversoIntro.vue';
import SpaceSky from '../components/SpaceSky.vue';
import GlowCursor from '../components/GlowCursor.vue';
import GooeyNav from '../components/GooeyNav.vue';
import ScrollExpand from '../components/ScrollExpand.vue';
import OrbitPortals from '../components/OrbitPortals.vue';
import GalaxyPortals from '../components/GalaxyPortals.vue';
import SobreLab from '../components/SobreLab.vue';
import RingPortals from '../components/RingPortals.vue';
import ServiceShowcase from '../components/ServiceShowcase.vue';
import WorldCarousel from '../components/WorldCarousel.vue';
import AreaMarquee from '../components/AreaMarquee.vue';
import ContactBrief from '../components/ContactBrief.vue';
import LineSidebar from '../components/LineSidebar.vue';
import { useProjectStore } from '../utils/projectStore.js';

const contactBrief = ref(null);
// Visual da seção Sobre: Planeta com anel. TESTE: /?teste=galaxia, portais (o antigo) ou oculos, solar, roda,
// constelacao, anel, cartas, esfera, imersiva mostram outras ideias para comparar. Sem o parâmetro, fica o anel.
const testeParam = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('teste') : null;
const sobreTeste = ['oculos', 'solar', 'roda', 'constelacao', 'anel', 'cartas', 'esfera', 'imersiva'].includes(testeParam) ? testeParam : null;
const sobreVisual = testeParam === 'galaxia' ? GalaxyPortals : testeParam === 'portais' ? OrbitPortals : sobreTeste ? SobreLab : RingPortals;
const scene = ref({ progress: 0, reduced: false });
// Os efeitos do resto da página entram quando o planeta sai de cena (ele ocupa o fim da rolagem da abertura).
const entered = computed(() => scene.value.passed === true);
let footerObserver;

// Elementos entram suavemente quando aparecem na tela (v-reveal="atraso em ms").
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let revealObserver;
const vReveal = {
  mounted(el, binding) {
    if (reduceMotion) return;
    el.classList.add('rv');
    el.style.setProperty('--rv-delay', `${binding.value || 0}ms`);
    revealObserver ??= new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revealObserver.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    revealObserver.observe(el);
  }
};

// Luz que acompanha o mouse nos cartões de vidro.
function light(e) { const el = e.currentTarget, b = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - b.left}px`); el.style.setProperty('--my', `${e.clientY - b.top}px`); }
function goTo(id) { document.getElementById(id)?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }

// Rota do processo: a linha acende conforme a seção passa pela tela.
// A seção é mais alta que a tela e o conteúdo fica parado (sticky) enquanto a rolagem "carrega" a jornada:
// a linha acende, o cometa percorre a rota e cada etapa se ilumina na sua vez.
const processRef = ref(null);
const routePath = ref(null);
const processP = ref(0);
const comet = ref({ left: '4%', top: '75%' });
const stopAt = [0.04, 0.42, 0.8];
const activeStop = computed(() => (processP.value >= stopAt[2] ? 2 : processP.value >= stopAt[1] ? 1 : 0));
let pFrame = 0;
function measureProcess() {
  pFrame = 0;
  const b = processRef.value?.getBoundingClientRect(); if (!b) return;
  const span = Math.max(1, b.height - innerHeight);
  const p = reduceMotion ? 1 : Math.min(1, Math.max(0, -b.top / span));
  processP.value = Math.round(p * 1000) / 1000;
  const path = routePath.value;
  if (path?.getTotalLength) { const len = path.getTotalLength(), pt = path.getPointAtLength(len * processP.value); comet.value = { left: `${pt.x / 10}%`, top: `${(pt.y / 160) * 100}%` }; }
}
const onScroll = () => { if (!pFrame) pFrame = requestAnimationFrame(measureProcess); };

onMounted(() => {
  addEventListener('scroll', onScroll, { passive: true }); measureProcess();
  // Quando o rodapé aparece, o botão "Voltar ao planeta" sobe para não cobrir a logo.
  const footer = document.querySelector('.app-footer');
  if (footer) { footerObserver = new IntersectionObserver(([e]) => document.documentElement.classList.toggle('at-footer', e.isIntersecting)); footerObserver.observe(footer); }
});
onUnmounted(() => { footerObserver?.disconnect(); document.documentElement.classList.remove('at-footer'); revealObserver?.disconnect(); revealObserver = null; removeEventListener('scroll', onScroll); cancelAnimationFrame(pFrame); });

// Projetos publicados no painel aparecem aqui.
const { projects: storedProjects } = useProjectStore();
const projetos = computed(() => storedProjects.value.filter(project => project.publicado));

const progressSections = [
  { id: 'sobre', label: 'Estúdio' }, { id: 'impacto', label: 'Impacto' }, { id: 'expertise', label: 'Criação' },
  { id: 'portfolio', label: 'Projetos' }, { id: 'processo', label: 'Processo' }, { id: 'contato', label: 'Contato' }
];

// Constelação do cartão "Aprendizado real": estrelas que vão sendo ligadas, uma por vez.
const constStars = [[28, 112], [70, 84], [104, 100], [132, 60], [172, 72], [196, 34], [220, 52]];
const constLines = constStars.slice(1).map((st, i) => `M${constStars[i][0]} ${constStars[i][1]}L${st[0]} ${st[1]}`);

const beneficios = [
  { vis: 'focus', nome: 'Mais atenção', destaque: 'Mais atenção', complemento: '', descricao: 'Transforme uma mensagem em uma experiência que convida as pessoas a participar.', icon: 'M4 24s7-13 20-13 20 13 20 13-7 13-20 13S4 24 4 24zM24 30a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM24 24h.01' },
  { vis: 'learn', nome: 'Aprendizado real', destaque: 'Aprendizado', complemento: ' real', descricao: 'Permita que equipes pratiquem decisões e procedimentos em um ambiente controlado.', icon: 'M18 8a7 7 0 0 0-7 7v1a6 6 0 0 0-3 11 7 7 0 0 0 10 8V8zM30 8a7 7 0 0 1 7 7v1a6 6 0 0 1 3 11 7 7 0 0 1-10 8V8zM18 18h-4M30 18h4M18 28h-3M30 28h3' },
  { vis: 'decide', nome: 'Decisões melhores', destaque: 'Decisões', complemento: ' melhores', descricao: 'Visualize produtos, espaços e cenários antes de investir na execução física.', icon: 'M24 6a18 18 0 1 0 0 36 18 18 0 0 0 0-36zM31 17l-4.5 9.5L17 31l4.5-9.5zM24 6v4M24 38v4M6 24h4M38 24h4' }
];

const servicos = [
  { nome: 'Simuladores de treinamento', descricao: 'Reduza riscos e custos operacionais com simulações fiéis ao mundo real.', tags: ['Realidade virtual', 'Indústria', 'Segurança'], imagem: '/images/projeto-manabi.png', exemplo: 'Como no Projeto Manabi: equipes treinam segurança e procedimentos sem correr riscos.' },
  { nome: 'Gêmeos digitais', descricao: 'Cópias digitais de lugares e instalações para visitar, planejar e acompanhar.', tags: ['3D', '360°', 'Gestão'], imagem: '/images/miniverso-360.png', exemplo: 'Lugares reais recriados no virtual, como a viagem no tempo do MINIVERSO 360.' },
  { nome: 'Experiências de marca', descricao: 'Ativações imersivas para eventos e lançamentos que viram assunto.', tags: ['Eventos', 'Gamificação', 'Ativação'], imagem: '/images/avati.png', exemplo: 'Como o Avati: uma trilha interativa que transformou o estande em experiência.' }
];

const etapas = [
  { nome: 'Ideação e planejamento', descricao: 'Entendemos o desafio, o público e o resultado esperado para definir o melhor caminho.', icon: 'M9.5 17.5h5M10.5 20.5h3M12 4.5a5.5 5.5 0 0 0-3.4 9.8c.6.5.9 1.2.9 1.9v.3h5v-.3c0-.7.3-1.4.9-1.9A5.5 5.5 0 0 0 12 4.5zM12 1.5v1M4.6 4.6l.7.7M19.4 4.6l-.7.7M2 11.5h1M21 11.5h1' },
  { nome: 'Criação e desenvolvimento', descricao: 'Desenhamos a experiência, construímos a tecnologia e validamos cada entrega com você.', icon: 'M12 3.2l7.5 4.3v8.9L12 20.8l-7.5-4.4V7.5zM12 12l7.5-4.5M12 12v8.8M12 12 4.5 7.5M8.2 5.3l7.5 4.4' },
  { nome: 'Lançamento e suporte', descricao: 'Colocamos o projeto no ar, acompanhamos o uso e seguimos por perto depois da entrega.', icon: 'M12 2.8c2.8 2 4.2 5.2 4.2 8.9l-1.9 3.6H9.7l-1.9-3.6c0-3.7 1.4-6.9 4.2-8.9zM12 8.6a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3zM7.8 11.7 5.5 14v3.4l3.2-2.1M16.2 11.7l2.3 2.3v3.4l-3.2-2.1M10.4 17.6 12 21l1.6-3.4' }
];

const areasAtendidas = [
  { label: 'Eventos', detail: 'Gamificação e presença', icon: 'M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z' },
  { label: 'Educação', detail: 'Aprendizado imersivo', icon: 'M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5' },
  { label: 'Indústria', detail: 'Simulação e segurança', icon: 'M4 18h16M6 18V9l6-4 6 4v9M10 18v-5h4v5' },
  { label: 'Cultura', detail: 'Memória e turismo 360°', icon: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16' },
  { label: 'Sustentabilidade', detail: 'Consciência que fica', icon: 'M5 19c0-8 5-13 14-14 0 9-5 14-13 14M5 19l7-7' },
  { label: 'Institucional', detail: 'Marcas que ensinam', icon: 'M4 20h16M5 20V10l7-5 7 5v10M9 20v-6h6v6' }
];
</script>

<style scoped>
.home-page{--cyan:#00b7e3;--blue:#1e4488;--indigo:#1e1645;--ink:#eef8fc;--muted:#a9c0cc;--faint:#7f9aaa;--line:#ffffff16;position:relative;isolation:isolate;background:#070b1a;color:var(--ink);font-family:var(--font-body);overflow-x:clip}
.home-page>section{position:relative;z-index:1;padding:clamp(90px,11vw,170px) 8%;scroll-margin-top:24px}
.home-page>.miniverso-intro{padding:0}
@media(min-width:901px){.home-page>section:not(.miniverso-intro){padding-right:max(8%,150px)}}
/* Tipografia */
h2{max-width:none;margin:0;font-family:var(--font-title);font-size:clamp(54px,7vw,110px);font-weight:500;line-height:.92;letter-spacing:.01em}
.grad{background:linear-gradient(90deg,#8ee1f2,var(--cyan) 45%,#5a7dd8);-webkit-background-clip:text;background-clip:text;color:transparent}
.eyebrow{display:inline-flex;align-items:center;gap:12px;margin:0 0 26px;color:var(--cyan);font-size:13px;font-weight:600;letter-spacing:.2em;text-transform:uppercase}
.eyebrow::before{content:'';width:32px;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue))}
.lede{max-width:46ch;margin:28px 0 0;color:var(--muted);font-size:clamp(17px,1.35vw,20px);line-height:1.65}
.heading.center{display:grid;justify-items:center;text-align:center}
.heading.center .lede{margin-inline:auto}
.heading.split{display:flex;justify-content:space-between;align-items:flex-end;gap:40px;flex-wrap:wrap}
.heading.split .lede{margin:0;max-width:40ch}
/* Botões */
.btn{position:relative;overflow:hidden;display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border-radius:99px;font:700 16px var(--font-body);text-decoration:none;cursor:pointer;transition:transform .25s,box-shadow .25s,background .25s,border-color .25s}
.btn svg{width:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}
.btn:hover svg{transform:translateX(3px)}
.btn.primary{border:0;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));box-shadow:0 14px 36px #00b7e333}
.btn.primary:hover{transform:translateY(-2px);box-shadow:0 20px 44px #00b7e355}
.btn.ghost{border:1px solid #ffffff2a;color:var(--ink);background:#0b143066;backdrop-filter:blur(8px)}
.btn.ghost:hover{border-color:#ffffff55;background:#ffffff12}
.btn.big{min-height:64px;padding:0 34px;font-size:17px}
.shine{position:absolute;inset:0;background:linear-gradient(110deg,transparent 30%,#ffffff55 50%,transparent 70%);transform:translateX(-100%);animation:shine 3.6s ease-in-out infinite}
@keyframes shine{60%,100%{transform:translateX(100%)}}
/* Entrada suave */
.rv{opacity:0;transform:translateY(28px);transition:opacity .9s var(--rv-delay,0ms) cubic-bezier(.2,.8,.2,1),transform .9s var(--rv-delay,0ms) cubic-bezier(.2,.8,.2,1)}
.rv.in{opacity:1;transform:none}
/* Sobre */
.manifesto{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.15fr);align-items:center;gap:clamp(40px,6vw,90px);min-height:100vh}
.manifesto h2{font-size:clamp(56px,6.6vw,104px)}
.hero-actions{display:flex;flex-wrap:wrap;gap:14px;margin-top:40px}
/* Por que imersão */
.glass-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px;margin-top:72px}
.glass{--mx:50%;--my:0%;position:relative;overflow:hidden;padding:34px 32px 38px;border:1px solid var(--line);border-radius:30px;background:linear-gradient(160deg,#ffffff0d,#ffffff03);backdrop-filter:blur(14px);transition:transform .4s cubic-bezier(.2,.8,.2,1),border-color .4s}
.glass::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:1px;background:radial-gradient(300px circle at var(--mx) var(--my),#8ee1f2aa,transparent 60%);-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;opacity:0;transition:opacity .4s}
.spot{position:absolute;inset:0;background:radial-gradient(420px circle at var(--mx) var(--my),#00b7e31c,transparent 60%);opacity:0;transition:opacity .4s;pointer-events:none}
.glass:hover{transform:translateY(-6px)}
.glass:hover::before,.glass:hover .spot{opacity:1}
.vis{position:relative;height:190px;margin:-6px -4px 26px;border-radius:22px;overflow:hidden;background:radial-gradient(ellipse at 50% 60%,#00b7e314,transparent 70%),#070b1a99;border:1px solid #ffffff10}
.g-num{position:absolute;top:14px;right:16px;font-family:var(--font-title);font-size:44px;line-height:.8;color:transparent;-webkit-text-stroke:1px #8ee1f266}
.vis-cap{position:absolute;left:14px;bottom:10px;color:#8fb0c0;font-size:11px;font-weight:600;letter-spacing:.06em}
/* Mais atenção: um planeta com gravidade — partículas espiralam até entrar em órbita */
.focus{display:grid;place-items:center}
.gv-planet{position:relative;width:54px;height:54px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#bdf2ff,#00b7e3 30%,#1e4488 68%,#1e1645);box-shadow:0 0 30px #00b7e399,inset -8px -10px 16px #0008;z-index:2}
.gv-ring{position:absolute;left:-22px;right:-22px;top:22px;height:12px;border-radius:50%;border:2px solid #bdf2ffcc;transform:rotate(-14deg);clip-path:inset(50% 0 0 0)}
.gv-orbit{position:absolute;left:50%;top:50%;width:190px;height:70px;margin:-35px 0 0 -95px;border-radius:50%;border:1px dashed #8ee1f244;transform:rotate(-14deg)}
.gv-swirl{position:absolute;left:50%;top:50%;width:0;height:0;transform:rotate(-14deg) scaleY(.37)}
.gv-swirl i{position:absolute;left:-3px;top:-3px;width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 10px #8ee1f2;animation:swirl 3.4s var(--t) linear infinite}
@keyframes swirl{0%{transform:rotate(var(--a)) translateX(150px);opacity:0}20%{opacity:1}75%{transform:rotate(calc(var(--a) + 260deg)) translateX(95px);opacity:1}100%{transform:rotate(calc(var(--a) + 360deg)) translateX(95px);opacity:0}}
/* Aprendizado real: constelação sendo ligada ponto a ponto */
.learn{display:grid;place-items:center;padding:12px 16px 26px}
.const{width:100%;height:100%;overflow:visible}
.c-line{fill:none;stroke:#8ee1f2;stroke-width:1.6;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;filter:drop-shadow(0 0 4px #00b7e3);animation:link 5.4s var(--d) ease-in-out infinite}
@keyframes link{0%,8%{stroke-dashoffset:1}22%,82%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
.c-star circle{fill:#fff}
.c-star .c-halo{fill:#8ee1f2;opacity:0;animation:lit 5.4s var(--d) ease-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes lit{0%,6%{opacity:0;transform:scale(.4)}14%{opacity:.55;transform:scale(1.2)}30%,82%{opacity:.25;transform:scale(1)}100%{opacity:0}}
/* Decisões melhores: um planeta em linhas que ganha superfície (ver antes de construir) */
.decide{display:grid;place-items:center;perspective:700px}
.globe{position:relative;width:118px;height:118px;transform-style:preserve-3d;animation:globe 14s linear infinite}
@keyframes globe{from{transform:rotateX(-18deg) rotateY(0)}to{transform:rotateX(-18deg) rotateY(360deg)}}
.g-mer{position:absolute;inset:0;border-radius:50%;border:1.2px solid #8ee1f2aa;transform:rotateY(var(--r))}
.g-par{position:absolute;left:50%;top:calc(50% + var(--y));width:var(--w);aspect-ratio:1;border-radius:50%;border:1.2px solid #8ee1f277;transform:translate(-50%,-50%) rotateX(90deg)}
.g-solid{position:absolute;inset:4%;border-radius:50%;background:radial-gradient(circle at 34% 30%,#9fe6f7,#00b7e3 35%,#1e4488 70%,#1e1645);box-shadow:0 0 40px #00b7e366;opacity:0;animation:solidify 7s ease-in-out infinite}
@keyframes solidify{0%,35%{opacity:0;transform:scale(.6)}55%,85%{opacity:.95;transform:scale(1)}100%{opacity:0;transform:scale(1.02)}}
/* Portfólio */
.social{display:flex;justify-content:space-between;align-items:center;gap:20px;flex-wrap:wrap;margin-top:56px;padding:24px 28px;border:1px solid var(--line);border-radius:24px;background:#0b143080;backdrop-filter:blur(8px)}
.social p{margin:0;color:var(--muted);font-size:16px}
.social div{display:flex;flex-wrap:wrap;gap:10px}
.social a{display:inline-flex;align-items:center;gap:10px;min-height:48px;padding:0 20px;white-space:nowrap;border:1px solid #ffffff22;border-radius:99px;color:#fff;font-size:15px;font-weight:600;text-decoration:none;transition:.25s}
.social a:hover{border-color:var(--cyan);background:#00b7e31a}
.social svg{width:20px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.empty-state{color:var(--muted);margin:30px 0 0;font-size:16px;line-height:1.7;max-width:40rem}
/* Processo */
.home-page>section.processo{height:320vh;padding-top:0;padding-bottom:0}
.proc-sticky{position:sticky;top:0;min-height:100vh;display:grid;align-content:center;gap:56px;padding:90px 0 60px}
.processo h2{font-size:clamp(50px,6vw,96px)}
.journey{position:relative}
.j-track{position:relative;height:150px;margin:0 0 18px}
.j-track svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.r-base{fill:none;stroke:#ffffff18;stroke-width:2;stroke-dasharray:3 9;vector-effect:non-scaling-stroke}
.r-glow{fill:none;stroke:#00b7e3;stroke-width:3;stroke-linecap:round;vector-effect:non-scaling-stroke;stroke-dasharray:1;stroke-dashoffset:calc(1 - var(--pp));filter:drop-shadow(0 0 10px #00b7e3cc)}
.comet{position:absolute;width:0;height:0;opacity:calc(var(--pp) * 40)}
.comet i{position:absolute;left:-9px;top:-9px;width:18px;height:18px;border-radius:50%;background:radial-gradient(circle,#fff 30%,#8ee1f2 60%,transparent 70%);box-shadow:0 0 20px #8ee1f2,0 0 50px #00b7e3}
.comet i::after{content:'';position:absolute;inset:-16px;border-radius:50%;border:1px solid #8ee1f266;animation:ping 1.6s ease-out infinite}
@keyframes ping{from{transform:scale(.4);opacity:1}to{transform:scale(1.4);opacity:0}}
.stops{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin:0;padding:0;list-style:none}
.stops li{position:relative;display:grid;justify-items:center;align-content:start;text-align:center;padding:28px 26px 30px;border:1px solid #ffffff10;border-radius:28px;background:#0b143055;backdrop-filter:blur(8px);opacity:.45;transform:translateY(10px) scale(.97);transition:opacity .6s,transform .6s cubic-bezier(.2,.8,.2,1),border-color .6s,background .6s,box-shadow .6s}
.stops li.lit{opacity:.85;transform:none}
.stops li.active{opacity:1;border-color:#00b7e355;background:linear-gradient(160deg,#00b7e31c,#1e448826);box-shadow:0 30px 70px #0008,0 0 50px #00b7e31a;transform:translateY(-6px)}
.stop-node{position:relative;display:grid;place-items:center;width:84px;height:84px;margin:0 0 20px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#1a2650,#0a1024 70%);box-shadow:inset 0 0 0 1px #ffffff1f,inset 0 1px 0 #ffffff26;color:#7f9aaa;transition:all .6s cubic-bezier(.2,.8,.2,1)}
.stop-node::before{content:'';position:absolute;inset:-9px;border-radius:50%;border:1px solid #ffffff14;transition:border-color .6s}
.stop-node svg{position:relative;width:36px;height:36px;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.node-ring{position:absolute;inset:-9px;border-radius:50%;border:1px solid #8ee1f2;opacity:0}
.lit .stop-node{background:radial-gradient(circle at 35% 28%,#5fd4f0,var(--cyan) 30%,var(--blue) 72%,var(--indigo));color:#fff;box-shadow:inset 0 1px 0 #ffffff66,inset 0 -8px 16px #0005,0 0 40px #00b7e366}
.lit .stop-node::before{border-color:#8ee1f266}
.active .node-ring{animation:ring 2s ease-out infinite}
@keyframes ring{from{transform:scale(.85);opacity:.9}to{transform:scale(1.35);opacity:0}}
.stop-num{color:var(--cyan);font-size:13px;font-weight:700;letter-spacing:.16em;text-transform:uppercase}
.stops h3{margin:10px 0 0;font-family:var(--font-title);font-size:38px;font-weight:500;line-height:1;letter-spacing:.01em}
.stops p{max-width:32ch;margin:12px 0 0;color:var(--muted);font-size:16px;line-height:1.65}
.j-progress{display:flex;align-items:center;gap:18px;max-width:640px;margin:44px auto 0;color:var(--muted);font-size:14px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}
.j-progress span:first-child{min-width:130px}
.j-bar{position:relative;flex:1;height:6px;border-radius:9px;background:#ffffff12;overflow:hidden}
.j-bar i{position:absolute;inset:0;border-radius:inherit;background:linear-gradient(90deg,var(--blue),var(--cyan),#8ee1f2);transform-origin:left;transform:scaleX(var(--pp));box-shadow:0 0 14px #00b7e3}
.j-progress b{min-width:48px;text-align:right;color:#fff;font-family:var(--font-title);font-size:30px;font-weight:500;letter-spacing:0}
/* Contato */
.home-page>section.cta{overflow:hidden;min-height:calc(100svh - 114px);display:grid;place-items:center;text-align:center;padding-top:80px;padding-bottom:70px}
.cta-copy{position:relative;z-index:2;display:grid;justify-items:center}
.cta h2{font-size:clamp(56px,7.4vw,120px)}
.cta .lede{margin-inline:auto}
.cta-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:44px}
.promises{display:flex;flex-wrap:wrap;justify-content:center;gap:10px 28px;margin:30px 0 0;padding:0;list-style:none;color:var(--muted);font-size:15px}
.promises li{display:flex;align-items:center;gap:8px}
.promises svg{width:18px;fill:none;stroke:var(--cyan);stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}
.portal{position:absolute;left:50%;top:46%;width:min(92vmin,880px);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}
.pr{position:absolute;inset:0;border-radius:50%}
.pr1{background:conic-gradient(from 0deg,transparent 0 55%,#00b7e3 75%,#8ee1f2 82%,transparent 92%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 12px #00b7e3);animation:spin 9s linear infinite}
.pr2{inset:7%;border:1px dashed #8ee1f240;animation:spin 40s linear infinite reverse}
.pr3{inset:14%;background:conic-gradient(from 180deg,transparent 0 60%,#5a7dd8aa 80%,transparent 95%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));mask:radial-gradient(closest-side,transparent calc(100% - 2px),#000 calc(100% - 1px));animation:spin 14s linear infinite reverse}
.pr4{inset:0;border:1px solid #8ee1f2;opacity:0;animation:ripple 5s ease-out infinite}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes ripple{0%{transform:scale(.3);opacity:.6}100%{transform:scale(1.1);opacity:0}}
.p-core{position:absolute;inset:24%;border-radius:50%;background:radial-gradient(circle,#1e448855,#1e164533 50%,transparent 72%);filter:blur(10px)}
.portal i{position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#fff;box-shadow:0 0 8px #8ee1f2;animation:inward 4s var(--t) cubic-bezier(.5,0,.75,0) infinite}
@keyframes inward{0%{transform:rotate(var(--a)) translateX(min(46vmin,440px));opacity:0}15%{opacity:1}100%{transform:rotate(calc(var(--a) + 90deg)) translateX(0);opacity:0}}
/* Responsivo */
@media(max-width:1000px){
  .manifesto{grid-template-columns:1fr;min-height:0}
  .glass-grid{grid-template-columns:1fr 1fr}
  .glass:last-child{grid-column:1/-1}
  .stops h3{font-size:30px}
}
@media(max-width:700px){
  .home-page>section{padding:84px 6%}
  .home-page>.miniverso-intro{padding:0}
  h2{font-size:clamp(48px,13vw,64px)}
  .manifesto h2{font-size:clamp(48px,13vw,64px)}
  .glass-grid{grid-template-columns:1fr;margin-top:44px;gap:16px}
  .glass:last-child{grid-column:auto}
  .glass{padding:24px 22px 28px}.vis{height:170px}
  .home-page>section.processo{height:300vh}
  .proc-sticky{gap:26px;padding:76px 0 30px}
  .j-track{display:none}
  .stops{grid-template-columns:1fr;gap:10px}
  .stops li{grid-template-columns:auto 1fr;justify-items:start;text-align:left;gap:0 16px;padding:16px 18px}
  .stop-node{grid-row:span 3;width:52px;height:52px;margin:0}.stop-node svg{width:24px}
  .stops h3{font-size:26px;margin-top:4px}
  .stops p{grid-column:2;max-height:0;overflow:hidden;margin:0;transition:max-height .5s,margin .5s}
  .stops li.active p{max-height:120px;margin-top:8px}
  .j-progress{margin-top:18px;font-size:12px;gap:12px}.j-progress span:first-child{min-width:96px}.j-progress b{font-size:24px}
  .portal{width:120vw;top:42%}
  .heading.split{align-items:flex-start}
  .btn{width:100%}.hero-actions,.cta-actions{width:100%}
  .social{padding:20px}.social a{flex:1;justify-content:center}
  .home-page>section.cta{min-height:calc(100svh - 190px);padding-top:70px;padding-bottom:50px}
}
@media(prefers-reduced-motion:reduce){.shine,.gv-swirl i,.c-line,.c-halo,.globe,.g-solid,.pr,.portal i,.comet i::after,.node-ring{animation:none}.home-page>section.processo{height:auto}.proc-sticky{position:static}}
</style>
