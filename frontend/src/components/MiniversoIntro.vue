<template>
  <!-- Abertura 3D: capa com o óculos, entrada pelo visor e o planeta Miniverso. O motor (src/three) liga tudo. -->
  <section id="inicio" ref="root" class="miniverso-intro" :class="{ 'no-webgl': failed }" aria-labelledby="intro-title">
    <div class="stage">
      <canvas class="scene-canvas" tabindex="0" role="img" :aria-label="sceneLabel"></canvas>
      <div class="names" aria-hidden="true">
        <div class="name-row"><span class="mini">mini</span><span class="verso">verso</span></div>
        <i class="spark"></i>
      </div>
      <p class="hint" aria-hidden="true">Arraste para explorar 360°</p>
      <div class="fit" aria-hidden="true">
        <svg viewBox="-100 -100 200 200"><circle class="fit-a" r="92" /><circle class="fit-b" r="80" /></svg>
        <span>Entrando no Miniverso</span>
      </div>
      <div class="forming" aria-hidden="true"><span>Formando o Miniverso</span><i></i></div>
      <div class="capa">
        <div class="capa-top"><span>Um estúdio. Infinitas possibilidades.</span><span>São Luís, Brasil</span></div>
        <div class="capa-bottom">
          <h1 id="intro-title">O mundo real é só <span>o começo.</span></h1>
          <p>Realidade virtual, aumentada e conteúdo 3D. Experiências que levam sua ideia além da tela.</p>
        </div>
        <div class="capa-bar">
          <span class="enter">Role para entrar <i aria-hidden="true">↓</i></span>
          <span class="step">01 / Entre</span>
          <span class="actions">
            <button class="motion-toggle" type="button" aria-pressed="false">Reduzir movimento</button>
            <button class="auto-toggle" type="button" aria-pressed="true">Automática: ligada</button>
            <a href="#portfolio">Ir aos projetos</a>
          </span>
        </div>
      </div>
      <div class="labels">
        <button v-for="name in ZONE_NAMES" :key="name" type="button" class="zone-label">{{ name }}</button>
      </div>
      <div class="game-hud" aria-live="polite" hidden>
        <b class="gh-title"></b><span class="gh-score"></span><span class="gh-hint"></span>
        <button type="button" class="gh-btn" hidden></button>
      </div>
      <div class="train-tip" hidden>Clique para ir na cabine do trem</div>
      <div class="zone-card" role="dialog" aria-live="polite" hidden>
        <span class="world-label">Miniverso · São Luís</span>
        <h3></h3>
        <p class="zone-text"></p>
        <div class="zone-actions">
          <button type="button" class="zone-act"></button>
          <button type="button" class="zone-act zone-act2" hidden></button>
          <button type="button" class="zone-act zone-act3" hidden></button>
          <button type="button" class="zone-back">← Voltar ao planeta</button>
        </div>
        <p class="zone-status" aria-live="polite"></p>
        <p class="zone-hint">Arraste para girar e olhar de cima · role para aproximar</p>
      </div>
      <div class="world">
        <div class="world-inner">
          <span class="world-label">Dentro do Miniverso</span>
          <h2>Ideias que você pode vivenciar</h2>
          <span class="world-tip">Arraste em qualquer direção para girar · clique numa área para ver de perto</span>
        </div>
      </div>
      <div class="veil" aria-hidden="true"></div>
      <div class="meter" aria-hidden="true"><i></i></div>
    </div>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { ZONE_NAMES } from '../three/zoneNames.js';

const emit = defineEmits(['scene-change']);
const root = ref(null);
const failed = ref(false);
const sceneLabel = `Óculos de realidade virtual em 3D. Arraste ou use as setas para girar; toque no visor ou pressione Enter para acendê-lo. Ao final da abertura, um pequeno planeta com as áreas da Miniverso (${ZONE_NAMES.join(', ')}) pode ser girado em qualquer direção; cada área abre de perto com uma pequena interação.`;
let engine = null, unmounted = false;

onMounted(async () => {
  try {
    // O Three.js e o planeta vêm num pacote separado, carregado depois que a página já apareceu.
    const { createMiniverso } = await import('../three/engine.js');
    if (unmounted) return;
    engine = createMiniverso(root.value, { onFrame: state => emit('scene-change', state) });
  } catch (error) {
    // Sem WebGL (ou falha ao carregar): a capa continua legível e o site segue normalmente.
    console.warn('Abertura 3D indisponível:', error);
    failed.value = true;
    emit('scene-change', { progress: 1, reduced: true, passed: true });
  }
});

onUnmounted(() => {
  unmounted = true;
  engine?.dispose();
  engine = null;
});
</script>

<style scoped>
/* Só a abertura é 3D: o palco fica fixo durante a rolagem desta seção; depois, o site segue normal. */
.miniverso-intro {
  /* Paleta oficial: #1E1645 índigo, #1E4488 azul, #0C0407 quase preto, #00B7E3 ciano. */
  --bg: #0c0407; --navy: #1e1645; --ice: #eef3fb; --cyan: #00b7e3; --cyan-soft: rgba(0, 183, 227, .32); --muted: #9a9ab8; --line: rgba(154, 154, 184, .2);
  position: relative; height: 520vh; height: 520svh; background: var(--bg); color: var(--ice); font-family: var(--font-display); color-scheme: dark;
}
/* A Home dá espaçamento e borda às suas seções; a abertura ocupa a tela inteira. */
.miniverso-intro.miniverso-intro { padding: 0; border: 0; }
.stage { position: sticky; top: 0; height: 100vh; height: 100svh; overflow: hidden; }
.scene-canvas { position: absolute; inset: 0; width: 100%; height: 100%; display: block; cursor: grab; touch-action: pan-y; outline-offset: -4px; }
.scene-canvas.orbiting { touch-action: none; }
.scene-canvas.dragging { cursor: grabbing; }
.scene-canvas.pointing { cursor: pointer; }
.stage > :not(canvas) { pointer-events: none; }
:focus-visible { outline: 2px solid var(--cyan); outline-offset: 3px; }

/* mini + verso nas laterais do óculos; juntam-se e entram no visor. */
.names { position: absolute; inset: 0; display: grid; place-items: center; font: 700 clamp(38px, 8vw, 118px)/1 var(--font-display); letter-spacing: -.03em; color: var(--ice); }
.name-row { display: flex; transform: scale(var(--ns, 1)); opacity: var(--names, 1); will-change: transform; }
.name-row span { display: block; }
.mini { transform: translateX(calc((1 - var(--join, 0)) * var(--mini-x, -30vw))); animation: reveal-l 1s cubic-bezier(.2, .7, .2, 1) 1s both; }
.verso { transform: translateX(calc((1 - var(--join, 0)) * var(--verso-x, 30vw))); animation: reveal-r 1s cubic-bezier(.2, .7, .2, 1) 1.12s both; }
@keyframes reveal-l { from { clip-path: inset(0 0 0 100%); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
@keyframes reveal-r { from { clip-path: inset(0 100% 0 0); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
.spark { position: absolute; left: 50%; top: 50%; width: min(56vw, 760px); height: 1px; transform: translate(-50%, -50%) scaleX(var(--spark, 0)); opacity: var(--spark, 0);
  background: linear-gradient(90deg, transparent, var(--cyan) 30%, #fff 50%, var(--cyan) 70%, transparent); box-shadow: 0 0 18px var(--cyan); }
.hint { position: absolute; left: 50%; top: calc(50% + var(--hint-y, 150px)); transform: translateX(-50%); margin: 0; text-align: center; opacity: calc(var(--hint, 1) * var(--capa, 1));
  font: 10px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.veil { position: absolute; inset: 0; background: var(--bg); opacity: var(--veil, 0); }

/* Formação do planeta: legenda e barra que acompanha a faixa de luz. */
.forming { position: absolute; left: 50%; top: calc(96px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 10px; opacity: var(--forming, 0); }
.forming span { font: 11px var(--font-mono); letter-spacing: .32em; text-transform: uppercase; color: var(--cyan); text-shadow: 0 0 12px rgba(0, 183, 227, .6); }
.forming i { width: min(240px, 60vw); height: 1px; background: linear-gradient(90deg, var(--cyan), #fff) left / calc(var(--reveal, 0) * 100%) 100% no-repeat, rgba(154, 154, 184, .25); box-shadow: 0 0 10px rgba(0, 183, 227, .5); }

/* Capa: rótulos no topo, frase e descrição embaixo, barra de navegação da abertura. */
.capa { position: absolute; inset: 0; opacity: var(--capa, 1); }
.capa-top, .capa-bottom, .capa-bar { position: absolute; left: max(16px, 4vw); right: max(16px, 4vw); }
.capa-top { top: calc(110px + env(safe-area-inset-top, 0px)); display: flex; justify-content: space-between; gap: 16px; font: 11px var(--font-mono); letter-spacing: .2em; text-transform: uppercase; color: var(--muted); }
.capa-bottom { bottom: calc(92px + env(safe-area-inset-bottom, 0px)); display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; }
.capa-bottom h1 { margin: 0; max-width: 14ch; font: 500 clamp(32px, 3.8vw, 52px)/1 var(--font-title); letter-spacing: .01em; }
.capa-bottom h1 span { color: var(--cyan); }
.capa-bottom p { margin: 0; max-width: 34ch; color: var(--muted); font-size: 15px; line-height: 1.65; }
.capa-bar { bottom: calc(20px + env(safe-area-inset-bottom, 0px)); display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 12px; padding-top: 16px; border-top: 1px solid var(--line);
  font: 11px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; }
.capa-bar .enter i { font-style: normal; margin-left: 14px; }
.capa-bar .step { color: var(--muted); }
.capa-bar .actions { display: flex; justify-content: flex-end; gap: 18px; align-items: center; }
.capa-bar button, .capa-bar a { font: inherit; letter-spacing: .04em; text-transform: none; color: var(--ice); background: none; border: 0; padding: 4px 0; cursor: pointer; text-decoration: none; }
.capa-bar a { border-bottom: 1px solid var(--ice); }
.capa.live button, .capa.live a { pointer-events: auto; }

/* Mundo: título, rótulos das áreas, cartão da área, placar dos minigames. */
.world { position: absolute; inset: 0; opacity: var(--world, 0); display: grid; align-content: end; justify-items: center;
  padding-bottom: calc(9vh + env(safe-area-inset-bottom, 0px)); padding-left: max(16px, env(safe-area-inset-left, 0px)); padding-right: max(16px, env(safe-area-inset-right, 0px)); }
.world-inner { display: grid; gap: 12px; justify-items: center; text-align: center; transform: translateY(calc((1 - var(--world, 0)) * 18px)); }
.world-label { font: 10px var(--font-mono); letter-spacing: .18em; color: var(--cyan); text-transform: uppercase; }
.world h2 { margin: 0; max-width: 16ch; font: 700 clamp(44px, 6.4vw, 88px)/.95 var(--font-title); letter-spacing: .01em; text-wrap: balance; text-shadow: 0 2px 30px rgba(12, 4, 7, .9); }
.world-tip { font: 10px var(--font-mono); letter-spacing: .12em; color: var(--muted); text-transform: uppercase; }
.zone-label { position: absolute; left: 0; top: 0; display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px;
  font: 500 12px var(--font-display); color: var(--ice); background: rgba(20, 14, 40, .72); border: 1px solid var(--cyan-soft);
  opacity: 0; transition: border-color .2s, background .2s; white-space: nowrap; }
.zone-label::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }
.zone-label.on { border-color: var(--cyan); background: rgba(30, 68, 136, .85); }
.zone-label.live { pointer-events: auto; cursor: pointer; }
.zone-card { position: absolute; left: max(16px, 4vw); bottom: calc(32px + env(safe-area-inset-bottom, 0px)); width: min(360px, calc(100% - 32px)); display: grid; gap: 10px; padding: 20px; border-radius: 16px;
  background: rgba(20, 14, 40, .82); border: 1px solid var(--cyan-soft); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.stage > .zone-card { pointer-events: auto; }
.zone-card[hidden] { display: none; }
.zone-card h3 { margin: 0; font: 700 40px/.95 var(--font-title); letter-spacing: .01em; }
.zone-card p { margin: 0; color: var(--muted); font-size: 15px; line-height: 1.55; }
.zone-card button { justify-self: start; font: 500 13px var(--font-display); color: var(--ice); background: none; border: 1px solid var(--cyan-soft); border-radius: 999px; padding: 8px 14px; cursor: pointer; }
.zone-card button:hover { border-color: var(--cyan); }
.zone-card button[hidden] { display: none; }
.zone-card .zone-act { border-color: var(--cyan); background: rgba(0, 183, 227, .16); }
.zone-card .zone-status { min-height: 1.4em; font: 11px/1.4 var(--font-mono); letter-spacing: .06em; color: var(--cyan); }
.zone-card .zone-hint { font: 11px/1.4 var(--font-mono); letter-spacing: .04em; color: rgba(255, 255, 255, .6); }
.zone-actions { display: flex; flex-wrap: wrap; gap: 8px; }
.game-hud { position: absolute; left: 50%; top: calc(88px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 6px; min-width: min(340px, calc(100% - 32px)); padding: 14px 20px; border-radius: 16px;
  background: rgba(20, 12, 42, .82); border: 1px solid #ff4fd8; box-shadow: 0 0 24px rgba(255, 79, 216, .35); text-align: center; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.game-hud[hidden] { display: none; }
.gh-title { font: 700 28px/1 var(--font-title); letter-spacing: .02em; color: #ffc56b; }
.gh-score { font: 700 34px/1 var(--font-title); color: #fff; min-height: 1em; }
.gh-hint { font: 12px/1.4 var(--font-mono); color: #7fe9ff; max-width: 34ch; }
.stage > .game-hud .gh-btn { pointer-events: auto; }
.gh-btn { margin-top: 4px; font: 700 22px/1 var(--font-title); letter-spacing: .04em; color: #140c2a; background: #ffc56b; border: 0; border-radius: 999px; padding: 12px 28px; cursor: pointer; box-shadow: 0 0 18px rgba(255, 197, 107, .6); touch-action: manipulation; }
.gh-btn[hidden] { display: none; }
.gh-btn:active { transform: scale(.95); }
.train-tip { position: absolute; left: 0; top: 0; padding: 6px 10px; border-radius: 999px; font: 500 12px var(--font-display); color: var(--bg); background: #ffc56b; white-space: nowrap; }
.train-tip[hidden] { display: none; }

/* Encaixe do óculos no rosto: borda escurece e um anel de calibragem gira e se abre. */
.fit { position: absolute; inset: 0; display: grid; place-items: center; opacity: var(--fit, 0); background: radial-gradient(ellipse at center, transparent 42%, rgba(12, 4, 7, .5) 78%, rgba(12, 4, 7, .85)); }
.fit svg { position: absolute; width: min(70vmin, 620px); height: auto; overflow: visible; transform: scale(calc(.85 + var(--merge, 0) * .55)) rotate(calc(var(--merge, 0) * 50deg)); }
.fit circle { fill: none; stroke: var(--cyan); vector-effect: non-scaling-stroke; }
.fit-a { stroke-width: 1.2; stroke-dasharray: 2 7; opacity: .85; }
.fit-b { stroke-width: 1; opacity: .35; }
.fit span { position: absolute; top: calc(50% + min(36vmin, 320px) + 14px); font: 10px var(--font-mono); letter-spacing: .3em; text-transform: uppercase; color: var(--cyan); }
.meter { position: absolute; right: max(16px, env(safe-area-inset-right, 0px)); top: 50%; width: 1px; height: 120px; transform: translateY(-50%); background: rgba(134, 163, 184, .25); }
.meter i { position: absolute; inset: 0; background: var(--cyan); transform-origin: top; transform: scaleY(var(--p, 0)); }

/* Sem WebGL: fica só a capa, curta, e o site segue. */
.no-webgl { height: 100vh; height: 100svh; }
.no-webgl .names, .no-webgl .hint, .no-webgl .labels, .no-webgl .world, .no-webgl .meter, .no-webgl .capa-bar .auto-toggle, .no-webgl .capa-bar .motion-toggle { display: none; }

@media (max-width: 760px) {
  .capa-top { top: calc(84px + env(safe-area-inset-top, 0px)); font-size: 9px; }
  .capa-bottom { flex-direction: column; align-items: flex-start; gap: 10px; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
  .capa-bar { grid-template-columns: 1fr; }
  .capa-bar .step, .capa-bar .enter { display: none; }
  .capa-bar .actions { justify-content: flex-start; flex-wrap: wrap; gap: 6px 16px; }
}
@media (max-width: 700px) { .meter { display: none; } .zone-label { font-size: 11px; padding: 5px 8px; } }
.reduced .mini, .reduced .verso { animation: none; }
</style>
