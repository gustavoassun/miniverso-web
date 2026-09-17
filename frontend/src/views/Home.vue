<template>
  <div class="home-page">
    <GhostFibers :enabled="entered" :reduced="scene.reduced" />
    <GlowCursor :enabled="entered" :reduced="scene.reduced" />
    <GooeyNav :enabled="entered" :reduced="scene.reduced" />
    <HoloViewport :enabled="entered" :reduced="scene.reduced" />
    <PixelEdges :enabled="entered" :reduced="scene.reduced" />
    <ImmersiveIntro @scene-change="scene = $event" />

    <!-- 2. Manifesto / Essência -->
    <section id="sobre" aria-labelledby="manifesto-title" class="manifesto">
      <div class="manifesto-copy"><p class="eyebrow">Além da tela / Sobre a Miniverso</p>
      <h2 id="manifesto-title">Pequeno no nome.<br /><span>Imenso nas possibilidades.</span></h2>
      <blockquote>
        "Nós não criamos apenas ambientes 3D. Nós construímos novas formas de 
        interagir, aprender e fazer negócios em um mundo onde a tela plana já não é suficiente."
      </blockquote>
      </div><WorldArtifact :reduced="scene.reduced" />
    </section>

    <!-- 3. Benefícios / Por que imersão -->
    <section aria-labelledby="impacto-title" class="impacto">
      <div class="section-heading">
        <p class="eyebrow">Por que imersão?</p>
        <h2 id="impacto-title">Experiências que fazem a ideia permanecer.</h2>
      </div>
      <div class="impacto-grid">
        <article v-for="(beneficio, index) in beneficios" :key="index" class="impacto-item">
          <div class="panel-status" aria-hidden="true"><span>EXPERIÊNCIA / 0{{ index + 1 }}</span><i/></div>
          <span class="item-number">0{{ index + 1 }}</span>
          <h3><span class="benefit-emphasis">{{ beneficio.destaque }}</span>{{ beneficio.complemento }}</h3>
          <p>{{ beneficio.descricao }}</p>
        </article>
      </div>
    </section>

    <!-- 4. Expertise / Nossos Serviços -->
    <section aria-labelledby="expertise-title" class="expertise">
      <h2 id="expertise-title">O que fazemos</h2>
      <div class="expertise-grid">
        <article v-for="(servico, index) in servicos" :key="index" class="expertise-card">
          <div class="panel-status" aria-hidden="true"><span>CRIAÇÃO / 0{{ index + 1 }}</span><i/></div>
          <svg class="service-glyph" viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 5L42 15V34L24 44L6 34V15Z M6 15L24 25L42 15 M24 25V44 M14 19V30L24 36L34 30V19"/><circle cx="24" cy="25" r="3"/></svg>
          <h3>{{ servico.nome }}</h3>
          <p>{{ servico.descricao }}</p>
        </article>
      </div>
    </section>

    <!-- 5. Portfólio / Selected Works -->
    <section id="portfolio" tabindex="-1" aria-labelledby="portfolio-title" class="portfolio">
      <div class="portfolio-header">
        <div><p class="eyebrow">Mundos que criamos / Portfólio</p><h2 id="portfolio-title">Ideias que saíram<br />da imaginação.</h2></div>
        <a href="https://miniversotech.base44.app/#projetos" target="_blank" rel="noopener noreferrer" class="ver-todos">Portfólio completo <span aria-hidden="true">↗</span><span class="sr-only"> (abre em outra aba)</span></a>
      </div>
      
      <p v-if="projetos.length === 0" class="empty-state">
        Estamos reunindo os primeiros projetos da Miniverso. Em breve, esta seleção estará aqui.
      </p>

      <ScrollExpand src="/images/reciclaverso.png" alt="Cena do Reciclaverso, projeto de realidade virtual e sustentabilidade" :reduced="scene.reduced" />
      <AccordionGallery v-if="projetos.length" :items="projetos" :reduced="scene.reduced" />
      <div class="social-channels"><p>Continue explorando os bastidores e novidades.</p><div><a href="https://www.instagram.com/meuminiverso/" target="_blank" rel="noopener noreferrer">Instagram ↗<span class="sr-only"> (abre em outra aba)</span></a><a href="https://linktr.ee/miniverso" target="_blank" rel="noopener noreferrer">Canais da Miniverso ↗<span class="sr-only"> (abre em outra aba)</span></a></div></div>
    </section>

    <!-- 6. Processo -->
    <section aria-labelledby="processo-title" class="processo">
      <div class="section-heading">
        <p class="eyebrow">Do briefing ao lançamento</p>
        <h2 id="processo-title">Clareza em cada etapa do projeto.</h2>
      </div>
      <ol class="processo-lista">
        <li v-for="(etapa, index) in etapas" :key="index">
          <span class="item-number">0{{ index + 1 }}</span>
          <div>
            <h3>{{ etapa.nome }}</h3>
            <p>{{ etapa.descricao }}</p>
          </div>
        </li>
      </ol>
    </section>

    <!-- 7. Social Proof / Clientes -->
    <section aria-labelledby="clientes-title" class="clientes">
      <h2 id="clientes-title">Quem já inova com a gente</h2>
      <div v-if="clientes.length > 0" class="clientes-logos">
        <span v-for="(cliente, index) in clientes" :key="index" class="logo-placeholder">
          {{ cliente.nome }}
        </span>
      </div>
      <p v-else class="empty-state">Marcas e parceiros que fazem parte dessa história em breve.</p>
    </section>

    <!-- 8. Call to Action / Contato -->
    <section id="contato" aria-labelledby="cta-title" class="cta">
      <div class="contact-copy"><p class="eyebrow">Da sua ideia para uma nova dimensão</p><h2 id="cta-title">Vamos construir o próximo universo juntos?</h2>
      <p class="cta-note">Sua ideia merece um mundo próprio. Vamos conversar?</p>
      <button class="btn-contato" type="button" aria-haspopup="dialog" @click="contactBrief.open()">Conte sua ideia <span aria-hidden="true">↗</span></button>
      </div><WorldArtifact compact :reduced="scene.reduced" />
    </section>

    <ContactBrief ref="contactBrief" />
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import ImmersiveIntro from '../components/ImmersiveIntro.vue';
import GhostFibers from '../components/GhostFibers.vue';
import GlowCursor from '../components/GlowCursor.vue';
import AccordionGallery from '../components/AccordionGallery.vue';
import GooeyNav from '../components/GooeyNav.vue';
import ScrollExpand from '../components/ScrollExpand.vue';
import HoloViewport from '../components/HoloViewport.vue';
import PixelEdges from '../components/PixelEdges.vue';
import WorldArtifact from '../components/WorldArtifact.vue';
import ContactBrief from '../components/ContactBrief.vue';
const contactBrief = ref(null);
const scene = ref({ progress: 0, reduced: false });
const entered = computed(() => scene.value.reduced || scene.value.progress >= .82);

// Estado reativo: Projetos
// Conteúdo e imagens da seleção pública da Miniverso. Detalhes permanecem no site atual.
const projetos = ref([
  { id: 'avati', titulo: 'Avati: Do zero a um milhão', categoria: '01 / Gamificação & ativação de marca', descricao: 'Uma trilha interativa em xilogravura.', url_imagem: '/images/avati.png', url: 'https://miniversotech.base44.app/projeto?id=avati-do-zero-a-um-milhao' },
  { id: 'aliados', titulo: 'Aliados do Sucesso: Desafio SEBRAETEC', categoria: '02 / Realidade virtual', descricao: 'O “Show do Milhão” Empreendedor.', url_imagem: '/images/aliados.png', url: 'https://miniversotech.base44.app/projeto?id=aliados-do-sucesso-sebraetec' },
  { id: 'reciclaverso', titulo: 'Reciclaverso', categoria: '03 / Realidade virtual & sustentabilidade', descricao: 'Uma imersão ecológica em um game show interativo e educativo.', url_imagem: '/images/reciclaverso.png', url: 'https://miniversotech.base44.app/projeto?id=reciclaverso' }
]);

// Estado reativo: Serviços (Expertise)
const servicos = ref([
  { nome: 'Simuladores de Treinamento', descricao: 'Reduza riscos e custos operacionais com simulações idênticas ao mundo real.' },
  { nome: 'Gêmeos Digitais', descricao: 'Cópias perfeitas das suas instalações físicas para monitoramento e gestão de dados.' },
  { nome: 'Experiências de Marca', descricao: 'Ativações imersivas para eventos e lançamentos de produtos.' }
]);

const beneficios = ref([
  { nome: 'Mais atenção', destaque: 'Mais atenção', complemento: '', descricao: 'Transforme uma mensagem em uma experiência que convida as pessoas a participar.' },
  { nome: 'Aprendizado real', destaque: 'Aprendizado', complemento: ' real', descricao: 'Permita que equipes pratiquem decisões e procedimentos em um ambiente controlado.' },
  { nome: 'Decisões melhores', destaque: 'Decisões', complemento: ' melhores', descricao: 'Visualize produtos, espaços e cenários antes de investir na execução física.' }
]);

const etapas = ref([
  { nome: 'Ideação e planejamento', descricao: 'Entendemos o desafio, o público e o resultado esperado para definir o melhor caminho.' },
  { nome: 'Criação e desenvolvimento', descricao: 'Desenhamos a experiência, construímos a tecnologia e validamos cada entrega com você.' },
  { nome: 'Lançamento e suporte', descricao: 'Colocamos o projeto no ar, acompanhamos seu uso e permanecemos por perto depois da entrega.' }
]);

// Estado reativo: Clientes
const clientes = ref([]);
</script>

<style scoped>
.home-page { position: relative; isolation: isolate; background: #07131f; color: #eef7ff; overflow-x: clip; }
.home-page > section { position: relative; z-index: 1; padding: clamp(70px,9vw,140px) 8%; border-bottom: 1px solid #8f87aa33; scroll-margin-top: 24px; }
.home-page > .immersive-intro { padding: 0; border: 0; }
h2 { margin: 0; font-size: clamp(35px,5.2vw,78px); font-weight: 400; line-height: 1.04; letter-spacing: -.055em; max-width: 22ch; }
h2 span { color: #a89bc5; }
.eyebrow { color: #82deef; margin: 0 0 32px; font: 10px/1.5 var(--font-mono); letter-spacing: .12em; text-transform: uppercase; }
.manifesto blockquote { max-width: 650px; margin: 52px 0 0 auto; color: #beb4d4; font-size: clamp(18px,2vw,27px); font-weight: 400; line-height: 1.6; letter-spacing: -.02em; }
.section-heading { display: grid; grid-template-columns: minmax(170px,.65fr) minmax(0,1.35fr); gap: 3rem; align-items: start; }
.section-heading .eyebrow { margin-top: 10px; }
.impacto-grid, .processo-lista { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 36px; margin-top: 64px; }
.impacto-item, .processo-lista li { padding: 26px 0; border-top: 1px solid #8f87aa55; }
.item-number { display: block; color: #82deef; font: 11px var(--font-mono); margin-bottom: 42px; }
.impacto-item h3, .processo-lista h3, .expertise-card h3 { margin: 0; font-size: 22px; font-weight: 400; line-height: 1.2; letter-spacing: -.025em; }
.impacto-item p, .processo-lista p, .expertise-card p { margin: 18px 0 0; color: #beb4d4; font-size: 14px; line-height: 1.7; }
.expertise { background: #0b203088; }
.expertise-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 36px; margin-top: 60px; }
.expertise-card { padding-top: 26px; border-top: 1px solid #8f87aa55; }
.portfolio { background: #07121f77; }
.social-channels { display: flex; align-items: center; justify-content: space-between; gap: 22px; margin-top: 54px; padding-top: 24px; border-top: 1px solid #aa98cb33; }
.social-channels p { margin: 0; color: #b8adc9; font-size: 13px; }
.social-channels > div { display: flex; flex-wrap: wrap; gap: 24px; }
.social-channels a { display: inline-flex; align-items: center; min-height: 44px; font-size: 12px; color: #b4e2eb; text-underline-offset: 6px; }
.portfolio-header { display: flex; justify-content: space-between; align-items: end; gap: 30px; }
.ver-todos { font-size: 12px; text-underline-offset: 7px; white-space: nowrap; padding: 12px 0; }
.ver-todos > span:first-child { margin-left: 16px; }
.portfolio-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 56px 28px; margin-top: 64px; }
.projeto-card:last-child { grid-column: 1 / -1; width: calc(50% - 14px); }
.projeto-card a { display: block; text-decoration: none; }
.projeto-card img { display: block; width: 100%; aspect-ratio: 16/9; height: auto; object-fit: cover; border: 1px solid #ffffff1f; transition: transform .35s; }
.projeto-card a:hover img { transform: translateY(-5px); }
.projeto-info { padding-top: 24px; }
.project-category { color: #82deef; font: 9px/1.6 var(--font-mono); text-transform: uppercase; letter-spacing: .07em; }
.projeto-info h3 { margin: 12px 0; font-size: clamp(21px,2.4vw,34px); font-weight: 400; line-height: 1.15; letter-spacing: -.035em; }
.projeto-info p { color: #a4a5ba; font-size: 13px; line-height: 1.65; }
.project-link { display: inline-flex; gap: 28px; align-items: center; min-height: 44px; font-size: 11px; color: #d9daea; border-bottom: 1px solid #9d99b260; }
.processo-lista { list-style: none; padding: 0; }
.clientes h2 { font-size: clamp(30px,4vw,54px); }
.empty-state { color: #beb4d4; margin: 30px 0 0; font-size: 14px; line-height: 1.7; max-width: 40rem; }
.clientes-logos { display: flex; gap: 28px; flex-wrap: wrap; margin-top: 36px; }
.cta { text-align: center; }
.cta h2 { margin-inline: auto; max-width: 18ch; }
.cta-note { color: #beb4d4; font-size: 14px; line-height: 1.6; margin: 30px 0; }
.btn-contato { display: inline-flex; gap: 55px; align-items: center; padding: 18px 28px; color: #101020; background: #8ee0ec; text-decoration: none; border-radius: 40px; font-size: 14px; min-height: 48px; }
.home-page h2 span{color:#94b8cf;}.manifesto blockquote,.impacto-item p,.processo-lista p,.expertise-card p,.cta-note,.empty-state{color:#b0c4d3;}.eyebrow,.item-number{color:#9cdef1;}
.home-page > section{border-bottom-color:#7fb8cf24;}.manifesto{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);align-items:center;gap:50px;}.manifesto h2{font-size:clamp(35px,4.5vw,65px);}.manifesto blockquote{margin:32px 0 0;font-size:clamp(17px,1.5vw,21px);max-width:48ch;}.impacto-grid,.expertise-grid{gap:22px;}.impacto-item,.expertise-card{position:relative;padding:27px 26px 30px;border:1px solid #7ebcd244;border-radius:5px 20px 5px 5px;background:linear-gradient(125deg,#518caa19,#10283744);box-shadow:inset 0 0 32px #77bdd005;transition:border-color .35s,background .35s;}.impacto-item::after,.expertise-card::after{content:'';position:absolute;bottom:-1px;right:-1px;width:48px;height:48px;border-right:1px solid #9fe2f3aa;border-bottom:1px solid #9fe2f3aa;pointer-events:none;}.impacto-item:hover,.expertise-card:hover{border-color:#9ce2f380;background:linear-gradient(125deg,#518caa26,#10283755);}.panel-status{display:flex;align-items:center;justify-content:space-between;margin-bottom:35px;font:7px var(--font-mono);letter-spacing:.12em;color:#87afc2;}.panel-status i{width:20px;height:3px;background:repeating-linear-gradient(90deg,#9cd4e3 0 3px,transparent 3px 6px);opacity:.65;}.impacto-item .item-number{margin-bottom:24px;}.service-glyph{width:42px;height:42px;stroke:#91c8dd;stroke-width:1;margin-bottom:25px;}.expertise{background:#0b203033;}.portfolio{background:#07121f33;}.processo-lista li{border-color:#8dcde34d;}.cta{display:grid;grid-template-columns:minmax(0,1.4fr) minmax(0,1fr);align-items:center;gap:50px;text-align:left;background:linear-gradient(120deg,#35698626,#06121d33);}.cta h2{margin:0;max-width:18ch;font-size:clamp(38px,4.5vw,66px);}.btn-contato{background:linear-gradient(110deg,#a4e2ed,#9dbbe5);color:#091724;}.social-channels p{color:#a9c2d1;}
@media(prefers-reduced-motion:reduce){.impacto-item,.expertise-card{transition:none;}}
.impacto-item h3{font-weight:500;line-height:1.3;}.benefit-emphasis{color:#a9e8fa;text-shadow:0 0 18px #66c2df24;}.impacto-item .panel-status{color:#abd6e6;}.impacto-item .panel-status::before{content:'';width:4px;height:4px;background:#a2e5f6;box-shadow:0 0 8px #80daf455;margin-right:8px;}.impacto-item .panel-status>span{margin-right:auto;}.impacto-item{background:linear-gradient(125deg,#518caa27,#10283755);}.impacto-item .item-number{color:#addfec;}.impacto-item:hover .benefit-emphasis{text-shadow:0 0 22px #66c2df55;}
.btn-contato{border:0;font-family:inherit;cursor:pointer;}
@media(max-width:700px) {
 .manifesto,.cta{grid-template-columns:minmax(0,1fr);gap:24px;}.manifesto :deep(.world-artifact){order:-1;max-width:250px;}.cta :deep(.world-artifact){max-width:240px;}.impacto-item,.expertise-card{padding:24px;}.panel-status{margin-bottom:26px;}
 .social-channels { flex-direction: column; align-items: start; }
 .home-page > section { padding: 72px 6%; }
 .home-page > .immersive-intro { padding: 0; }
 .section-heading, .impacto-grid, .processo-lista, .expertise-grid, .portfolio-grid { grid-template-columns: minmax(0,1fr); }
 .section-heading { gap: 16px; }
 .section-heading .eyebrow { margin-bottom: 0; }
 .impacto-grid, .processo-lista, .expertise-grid { gap: 16px; margin-top: 40px; }
 .item-number { margin-bottom: 24px; }
 .manifesto blockquote { margin-top: 32px; }
 .portfolio-header { align-items: start; flex-direction: column; }
 .portfolio-grid { gap: 44px; margin-top: 40px; }
 .projeto-card:last-child { grid-column: auto; width: 100%; }
}
@media(min-width:701px) and (max-width:1000px) {
 .home-page > section { padding-inline: 6%; }
 .section-heading { grid-template-columns: 1fr; gap: 16px; }
 .impacto-grid, .processo-lista, .expertise-grid { grid-template-columns: repeat(2,minmax(0,1fr)); gap: 24px; }
 .portfolio-grid { gap: 40px 20px; }
 .projeto-card:last-child { width: calc(50% - 10px); }
}
</style>
