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
      <div class="forming" aria-hidden="true">
        <div class="forming-box">
          <span class="forming-kicker">Formando o Miniverso</span>
          <b class="forming-pct"></b>
          <i class="forming-bar"><i></i></i>
          <ol class="forming-steps">
            <li style="--at: 0">Partículas</li><li style="--at: .3">Relevo</li><li style="--at: .55">Cores</li><li style="--at: .85">Áreas</li>
          </ol>
        </div>
      </div>
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
        <button v-for="(name, i) in ZONE_NAMES" :key="name" type="button" class="zone-label" :style="{ '--c': ZONE_COLORS[i] }">
          <span class="tag"><i class="dot"></i><span class="name">{{ name }}</span><span class="go">ver área ›</span></span>
          <i class="stem"></i>
        </button>
      </div>
      <div class="game-hud" aria-live="polite" hidden>
        <b class="gh-title"></b><span class="gh-score"></span><span class="gh-hint"></span>
        <button type="button" class="gh-btn" hidden></button>
      </div>
      <div class="train-tip" hidden>Clique para ir na cabine do trem</div>
      <div class="zone-card" role="dialog" aria-live="polite" hidden>
        <div class="zone-top">
          <span class="world-label zone-index">Miniverso · São Luís</span>
          <button type="button" class="zone-close" aria-label="Fechar e voltar ao planeta">×</button>
        </div>
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
          <div class="planet-actions">
            <button type="button" class="planet-home" tabindex="-1"><i aria-hidden="true"></i><span>Voltar ao início</span></button>
            <button type="button" class="planet-exit" tabindex="-1"><span>Explorar o site</span><i aria-hidden="true"></i></button>
          </div>
        </div>
      </div>
      <div class="veil" aria-hidden="true"></div>
      <div class="meter" aria-hidden="true"><i></i></div>
    </div>
    <!-- No corpo da página (acima das seções): o botão flutuante do site e a cortina das transições. -->
    <Teleport to="body">
      <button type="button" class="back-planet" tabindex="-1"><i class="orb" aria-hidden="true"></i><span>Voltar ao planeta</span></button>
      <div class="travel" aria-hidden="true">
        <i class="travel-ring"></i>
        <div class="travel-core">
          <i class="travel-orb"></i>
          <span class="travel-kicker">Miniverso</span>
          <b class="travel-label"></b>
          <i class="travel-line"></i>
        </div>
      </div>
    </Teleport>
  </section>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ZONE_COLORS, ZONE_NAMES } from '../three/zoneNames.js';

const emit = defineEmits(['scene-change']);
const route = useRoute(), router = useRouter();
// Depois de uma transição (início ou planeta), o endereço perde o "#seção" sem mexer na rolagem.
const cleanUrl = () => { if (route.hash) router.replace({ path: '/', query: route.query }); };
const setHash = hash => router.replace({ path: '/', query: route.query, hash });
const root = ref(null);
const failed = ref(false);
const sceneLabel = `Óculos de realidade virtual em 3D. Arraste ou use as setas para girar; toque no visor ou pressione Enter para acendê-lo. Ao final da abertura, um pequeno planeta com as áreas da Miniverso (${ZONE_NAMES.join(', ')}) pode ser girado em qualquer direção; cada área abre de perto com uma pequena interação.`;
let engine = null, unmounted = false;

onMounted(async () => {
  try {
    // O Three.js e o planeta vêm num pacote separado, carregado depois que a página já apareceu.
    const { createMiniverso } = await import('../three/engine.js');
    if (unmounted) return;
    engine = createMiniverso(root.value, { onFrame: state => emit('scene-change', state), cleanUrl, setHash });
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
.mini { transform: translateX(calc((1 - var(--join, 0)) * var(--mini-x, -30vw))); animation: reveal-l 1s cubic-bezier(.2, .7, .2, 1) .7s both; }
.verso { transform: translateX(calc((1 - var(--join, 0)) * var(--verso-x, 30vw))); animation: reveal-r 1s cubic-bezier(.2, .7, .2, 1) .82s both; }
@keyframes reveal-l { from { clip-path: inset(0 0 0 100%); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
@keyframes reveal-r { from { clip-path: inset(0 100% 0 0); opacity: 0; } to { clip-path: inset(0); opacity: 1; } }
.spark { position: absolute; left: 50%; top: 50%; width: min(56vw, 760px); height: 1px; transform: translate(-50%, -50%) scaleX(var(--spark, 0)); opacity: var(--spark, 0);
  background: linear-gradient(90deg, transparent, var(--cyan) 30%, #fff 50%, var(--cyan) 70%, transparent); box-shadow: 0 0 18px var(--cyan); }
.hint { position: absolute; left: 50%; top: calc(50% + var(--hint-y, 150px)); transform: translateX(-50%); margin: 0; text-align: center; opacity: calc(var(--hint, 1) * var(--capa, 1));
  font: 10px var(--font-mono); letter-spacing: .14em; text-transform: uppercase; color: var(--muted); }
.veil { position: absolute; inset: 0; background: var(--bg); opacity: var(--veil, 0); }

/* Formação do planeta: legenda e barra que acompanha a faixa de luz. */
/* Formação do planeta: no centro, por cima das partículas, a porcentagem, a barra e as etapas que acendem. */
.forming { position: absolute; inset: 0; display: grid; place-items: center; opacity: var(--forming, 0);
  background: radial-gradient(circle at 50% 50%, rgba(4, 6, 16, .62), transparent 42%); }
.forming-box { display: grid; justify-items: center; gap: 14px; transform: translateY(calc((1 - var(--forming, 0)) * 12px)); }
.forming-kicker { padding: 7px 14px 7px calc(14px + .42em); border-radius: 999px; font: 11px var(--font-mono); letter-spacing: .42em; text-transform: uppercase; color: var(--cyan);
  background: rgba(4, 8, 20, .72); border: 1px solid rgba(0, 183, 227, .35); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); box-shadow: 0 0 20px rgba(0, 183, 227, .25); }
.forming-pct { counter-reset: pct var(--pct, 0); font: 700 clamp(64px, 9vw, 112px)/.9 var(--font-title); letter-spacing: .01em; color: #fff; text-shadow: 0 0 40px rgba(0, 183, 227, .55); }
.forming-pct::before { content: counter(pct); }
.forming-pct::after { content: "%"; margin-left: 4px; font-size: .4em; color: var(--cyan); }
.forming-bar { position: relative; width: min(320px, 70vw); height: 3px; border-radius: 3px; overflow: hidden; background: rgba(255, 255, 255, .12); }
.forming-bar i { position: absolute; inset: 0; transform-origin: left; transform: scaleX(var(--load, 0)); background: linear-gradient(90deg, #0a7fa3, var(--cyan), #fff); box-shadow: 0 0 14px var(--cyan); }
.forming-steps { display: flex; gap: 18px; margin: 0; padding: 0; list-style: none; font: 10px var(--font-mono); letter-spacing: .16em; text-transform: uppercase; color: var(--ice); }
.forming-steps li { display: flex; align-items: center; gap: 7px; opacity: clamp(.3, calc((var(--load, 0) - var(--at)) * 20 + .3), 1); }
.forming-steps li::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: var(--cyan); box-shadow: 0 0 8px var(--cyan); }

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
/* Saída do planeta para o resto do site: botão de vidro com a seta descendo; pulsa quando a pessoa tenta rolar. */
.planet-actions { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px; margin-top: 8px; }
.planet-home { display: inline-flex; align-items: center; gap: 10px; padding: 12px 20px 12px 12px; border-radius: 999px; cursor: pointer; pointer-events: none;
  font: 600 12px var(--font-display); letter-spacing: .16em; text-transform: uppercase; color: var(--ice);
  background: rgba(255, 255, 255, .05); border: 1px solid rgba(255, 255, 255, .2); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .35); transition: transform .25s, border-color .25s; }
.planet-home.live { pointer-events: auto; }
.planet-home:hover { transform: translateY(-2px); border-color: var(--cyan); }
.planet-home i { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255, 255, 255, .1); }
.planet-home i::before { content: ""; width: 6px; height: 6px; border-left: 2px solid #fff; border-top: 2px solid #fff; transform: translateY(2px) rotate(45deg); }
.planet-exit { display: inline-flex; align-items: center; gap: 12px; padding: 12px 14px 12px 22px; border-radius: 999px; cursor: pointer;
  font: 600 12px var(--font-display); letter-spacing: .16em; text-transform: uppercase; color: #fff; pointer-events: none;
  background: linear-gradient(135deg, rgba(0, 183, 227, .24), rgba(30, 22, 69, .6)); border: 1px solid rgba(0, 183, 227, .55);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, .4), 0 0 24px rgba(0, 183, 227, .25), inset 0 1px 0 rgba(255, 255, 255, .15); transition: transform .25s, box-shadow .25s; }
.planet-exit.live { pointer-events: auto; }
.planet-exit:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(0, 0, 0, .45), 0 0 38px rgba(0, 183, 227, .45), inset 0 1px 0 rgba(255, 255, 255, .18); }
.planet-exit i { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; background: rgba(255, 255, 255, .12); }
.planet-exit i::before { content: ""; width: 6px; height: 6px; border-right: 2px solid #fff; border-bottom: 2px solid #fff; transform: translateY(-2px) rotate(45deg); animation: exit-bob 1.8s ease-in-out infinite; }
.planet-exit.nudge { animation: exit-nudge .9s ease; }
@keyframes exit-bob { 50% { transform: translateY(1px) rotate(45deg); } }
@keyframes exit-nudge { 0% { box-shadow: 0 10px 30px rgba(0, 0, 0, .4), 0 0 0 0 rgba(0, 183, 227, .7); } 30% { transform: scale(1.06); } 100% { box-shadow: 0 10px 30px rgba(0, 0, 0, .4), 0 0 0 20px rgba(0, 183, 227, 0); } }
/* Botão flutuante do site para voltar ao planeta: um mini planeta com anel e o texto, sempre à mão. */
.back-planet { position: fixed; right: max(16px, 3vw); bottom: calc(60px + env(safe-area-inset-bottom, 0px)); z-index: 30; display: flex; align-items: center; gap: 10px;
  padding: 7px 18px 7px 7px; border-radius: 999px; cursor: pointer; font: 600 12px var(--font-display); letter-spacing: .12em; text-transform: uppercase; color: #fff;
  background: linear-gradient(135deg, rgba(0, 183, 227, .22), rgba(30, 22, 69, .88)); border: 1px solid rgba(0, 183, 227, .5);
  -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); box-shadow: 0 12px 30px rgba(0, 0, 0, .4), 0 0 22px rgba(0, 183, 227, .2);
  opacity: 0; transform: translateY(16px); pointer-events: none; transition: opacity .45s, transform .45s, box-shadow .25s; }
.back-planet.show { opacity: 1; transform: none; pointer-events: auto; }
.back-planet:hover { box-shadow: 0 14px 34px rgba(0, 0, 0, .45), 0 0 34px rgba(0, 183, 227, .45); }
.back-planet .orb { position: relative; width: 30px; height: 30px; border-radius: 50%; background: radial-gradient(circle at 35% 32%, #9fefff, #1e4488 58%, #0c1a3a); box-shadow: 0 0 14px rgba(0, 183, 227, .6); }
.back-planet .orb::after { content: ""; position: absolute; left: -6px; right: -6px; top: 11px; bottom: 11px; border: 1.5px solid rgba(255, 255, 255, .75); border-radius: 50%; transform: rotate(-18deg); }
/* Portal entre capa, planeta e site: um círculo com borda ciana se abre a partir do botão clicado (fundo índigo com
   estrelas, mini planeta com anel e satélite, destino e linha de carregamento) e depois se fecha no centro. */
.travel { --ox: 50%; --oy: 50%; position: fixed; inset: 0; z-index: 60; display: grid; place-items: center; visibility: hidden; pointer-events: none;
  background: radial-gradient(1px 1px at 12% 22%, rgba(255, 255, 255, .7), transparent), radial-gradient(1px 1px at 78% 30%, rgba(255, 255, 255, .6), transparent),
    radial-gradient(1.5px 1.5px at 30% 76%, rgba(159, 239, 255, .8), transparent), radial-gradient(1px 1px at 88% 82%, rgba(255, 255, 255, .55), transparent),
    radial-gradient(1px 1px at 56% 12%, rgba(255, 255, 255, .5), transparent), radial-gradient(1.5px 1.5px at 18% 60%, rgba(255, 255, 255, .45), transparent),
    radial-gradient(circle at 50% 46%, #261c5e, #0b0820 58%, #05040c);
  clip-path: circle(0 at var(--ox) var(--oy)); }
.travel.on { visibility: visible; pointer-events: auto; clip-path: circle(150vmax at var(--ox) var(--oy)); transition: clip-path .85s cubic-bezier(.7, 0, .25, 1); }
.travel.on.out { clip-path: circle(0 at 50% 50%); transition: clip-path .85s cubic-bezier(.7, 0, .25, 1); }
.travel-ring { position: fixed; left: var(--ox); top: var(--oy); width: 300vmax; height: 300vmax; margin: -150vmax 0 0 -150vmax; border-radius: 50%;
  border: 2px solid rgba(0, 183, 227, .9); box-shadow: 0 0 40px rgba(0, 183, 227, .8), inset 0 0 60px rgba(0, 183, 227, .45); transform: scale(0); }
.travel.on .travel-ring { transform: scale(1); transition: transform .85s cubic-bezier(.7, 0, .25, 1); }
.travel.on.out .travel-ring { left: 50%; top: 50%; transform: scale(0); transition: transform .85s cubic-bezier(.7, 0, .25, 1), left .85s, top .85s; }
.travel-core { display: grid; justify-items: center; gap: 12px; opacity: 0; transform: translateY(10px) scale(.96); transition: opacity .35s, transform .35s; }
.travel.on .travel-core { opacity: 1; transform: none; transition: opacity .5s .45s, transform .5s .45s; }
.travel.on.out .travel-core { opacity: 0; transform: scale(1.05); transition: opacity .3s, transform .3s; }
.travel-orb { position: relative; width: 64px; height: 64px; margin-bottom: 8px; border-radius: 50%;
  background: radial-gradient(circle at 35% 32%, #b8f4ff, #2a7fd0 45%, #1e1645 82%); box-shadow: 0 0 34px rgba(0, 183, 227, .55), inset -8px -10px 18px rgba(0, 0, 0, .45); }
.travel-orb::after { content: ""; position: absolute; left: -18px; right: -18px; top: 24px; bottom: 24px; border: 2px solid rgba(255, 255, 255, .8); border-radius: 50%; transform: rotate(-18deg); }
.travel-orb::before { content: ""; position: absolute; left: 29px; top: 29px; width: 6px; height: 6px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px #9fefff; animation: travel-sat 1.8s linear infinite; }
@keyframes travel-sat { from { transform: rotate(0deg) translateX(46px); } to { transform: rotate(360deg) translateX(46px); } }
.travel-kicker { padding-left: .42em; font: 10px var(--font-mono); letter-spacing: .42em; text-transform: uppercase; color: var(--cyan); text-shadow: 0 0 14px rgba(0, 183, 227, .7); }
.travel-label { font: 600 clamp(20px, 2.4vw, 28px) var(--font-display); color: #fff; letter-spacing: .01em; }
.travel-line { position: relative; width: 180px; height: 2px; border-radius: 2px; overflow: hidden; background: rgba(255, 255, 255, .12); }
.travel-line::after { content: ""; position: absolute; inset: 0; transform-origin: left; transform: scaleX(0); background: linear-gradient(90deg, #0a7fa3, var(--cyan), #fff); box-shadow: 0 0 12px var(--cyan); }
.travel.on .travel-line::after { transform: scaleX(1); transition: transform 1s ease .3s; }
/* No site, o palco do planeta nem é desenhado: subir além do topo das seções nunca mostra o planeta pela metade. */
.miniverso-intro.away .stage { visibility: hidden; }
/* Apresentação ao abrir a página: o óculos surge com calma e a capa entra em sequência, sem tudo de uma vez. */
.scene-canvas { animation: intro-fade 1.6s ease .1s both; }
.capa-top span { animation: intro-rise .9s cubic-bezier(.2, .7, .2, 1) .45s both; }
.capa-top span + span { animation-delay: .6s; }
.capa-bottom h1 { animation: intro-rise .9s cubic-bezier(.2, .7, .2, 1) .9s both; }
.capa-bottom p { animation: intro-rise .9s cubic-bezier(.2, .7, .2, 1) 1.05s both; }
.capa-bar { animation: intro-rise .9s cubic-bezier(.2, .7, .2, 1) 1.25s both; }
@keyframes intro-fade { from { opacity: 0; transform: scale(1.04); } }
@keyframes intro-rise { from { opacity: 0; transform: translateY(14px); filter: blur(6px); } }
/* Rótulo da área: etiqueta de vidro com o ponto na cor da área e uma haste fina que desce até ela. */
.zone-label { --c: var(--cyan); position: absolute; left: 0; top: 0; display: grid; justify-items: center; padding: 0; border: 0; background: none;
  font: inherit; color: var(--ice); opacity: 0; white-space: nowrap; }
.zone-label .tag { display: flex; align-items: center; gap: 8px; padding: 7px 13px 7px 10px; border-radius: 999px;
  background: linear-gradient(135deg, rgba(255, 255, 255, .13), rgba(255, 255, 255, .03)), rgba(12, 10, 30, .55);
  border: 1px solid rgba(255, 255, 255, .16); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35), inset 0 1px 0 rgba(255, 255, 255, .12); transition: border-color .25s, box-shadow .25s, transform .25s; }
.zone-label .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); animation: label-pulse 2.4s ease-out infinite; }
.zone-label .name { font: 600 11px var(--font-display); letter-spacing: .14em; text-transform: uppercase; }
.zone-label .go { max-width: 0; overflow: hidden; opacity: 0; font: 10px var(--font-mono); letter-spacing: .08em; color: var(--c); transition: max-width .3s, opacity .3s; }
.zone-label .stem { width: 1px; height: 22px; background: linear-gradient(var(--c), transparent); opacity: .85; }
.zone-label.on .tag, .zone-label.live:hover .tag { border-color: var(--c); transform: translateY(-2px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, .4), 0 0 18px color-mix(in srgb, var(--c) 45%, transparent), inset 0 1px 0 rgba(255, 255, 255, .14); }
.zone-label.on .go, .zone-label.live:hover .go { max-width: 80px; opacity: 1; }
.zone-label.live { pointer-events: auto; cursor: pointer; }
@keyframes label-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 70%, transparent); } 100% { box-shadow: 0 0 0 9px transparent; } }
/* Cartão da área: faixa e brilho na cor da área, número da área, título com traço e ações marcadas. */
.zone-card { --c: var(--cyan); position: absolute; left: max(16px, 4vw); bottom: calc(32px + env(safe-area-inset-bottom, 0px)); width: min(380px, calc(100% - 32px));
  display: grid; gap: 12px; padding: 22px 22px 18px; border-radius: 20px; overflow: hidden;
  background: radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--c) 20%, transparent), transparent 60%), linear-gradient(160deg, rgba(28, 22, 62, .93), rgba(10, 8, 24, .9));
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 30px 70px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .1);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); animation: card-in .5s cubic-bezier(.2, .8, .2, 1); }
.zone-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--c), transparent 85%); }
.stage > .zone-card { pointer-events: auto; }
.zone-card[hidden] { display: none; }
.zone-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.zone-card .zone-index { color: var(--c); }
.zone-card .zone-close { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; font-size: 18px; line-height: 1; }
.zone-card h3 { margin: 0; font: 700 46px/.92 var(--font-title); letter-spacing: .01em; text-shadow: 0 0 30px color-mix(in srgb, var(--c) 35%, transparent); }
.zone-card h3::after { content: ""; display: block; width: 48px; height: 2px; margin-top: 12px; border-radius: 2px; background: var(--c); }
.zone-card p { margin: 0; color: #c4c4dc; font-size: 14.5px; line-height: 1.6; }
.zone-card button { justify-self: start; font: 500 13px var(--font-display); color: var(--ice); background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 999px; padding: 9px 15px; cursor: pointer; transition: background .2s, border-color .2s, transform .2s; }
.zone-card button:hover { border-color: var(--c); transform: translateY(-1px); }
.zone-card button[hidden] { display: none; }
.zone-card .zone-act { font-weight: 600; color: #fff; border-color: var(--c); background: color-mix(in srgb, var(--c) 22%, transparent); }
.zone-card .zone-act:hover { background: color-mix(in srgb, var(--c) 36%, transparent); }
.zone-card .zone-status { min-height: 1.4em; font: 11px/1.4 var(--font-mono); letter-spacing: .06em; color: var(--c); }
.zone-card .zone-hint { padding-top: 10px; border-top: 1px solid rgba(255, 255, 255, .08); font: 11px/1.4 var(--font-mono); letter-spacing: .04em; color: rgba(255, 255, 255, .55); }
@keyframes card-in { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .zone-label .dot, .zone-card { animation: none; } }
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
.no-webgl .back-planet, .no-webgl .travel, .no-webgl .names, .no-webgl .hint, .no-webgl .labels, .no-webgl .world, .no-webgl .meter, .no-webgl .capa-bar .auto-toggle, .no-webgl .capa-bar .motion-toggle { display: none; }

@media (max-width: 760px) {
  .capa-top { top: calc(84px + env(safe-area-inset-top, 0px)); font-size: 9px; }
  .capa-bottom { flex-direction: column; align-items: flex-start; gap: 10px; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
  .capa-bar { grid-template-columns: 1fr; }
  .capa-bar .step, .capa-bar .enter { display: none; }
  .capa-bar .actions { justify-content: flex-start; flex-wrap: wrap; gap: 6px 16px; }
}
@media (max-width: 700px) { .meter { display: none; } .zone-label .tag { padding: 5px 10px 5px 8px; } .zone-label .name { font-size: 10px; letter-spacing: .1em; } .zone-card h3 { font-size: 38px; } }
.reduced .mini, .reduced .verso, .reduced .zone-label .dot, .reduced .zone-card, .reduced .planet-exit i::before { animation: none; }
</style>
