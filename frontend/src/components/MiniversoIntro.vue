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
            <button class="chip sound-chip" type="button" aria-pressed="true"><i class="sw" aria-hidden="true"></i>Som</button>
            <button class="chip motion-toggle" type="button" aria-pressed="false"><i class="sw" aria-hidden="true"></i>Reduzir movimento</button>
            <button class="chip auto-toggle" type="button" aria-pressed="true"><i class="sw" aria-hidden="true"></i>Abertura automática</button>
            <a class="chip go" href="#portfolio">Ir aos projetos <i aria-hidden="true">→</i></a>
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
      <div class="arcade" role="dialog" aria-label="Fliperama: Quebra-pixel" hidden>
        <div class="ac-top"><b class="ac-title">Quebra-pixel</b><span class="ac-score"></span><button type="button" class="ac-close" aria-label="Sair do fliperama">×</button></div>
        <div class="ac-screen"><canvas width="320" height="240"></canvas></div>
        <p class="ac-hint"></p>
      </div>
      <div class="race-pad" hidden>
        <button type="button" class="rp-btn" data-k="l" aria-label="Virar à esquerda">◀</button>
        <button type="button" class="rp-btn rp-brake" data-k="b" aria-label="Frear">Freio</button>
        <button type="button" class="rp-btn" data-k="r" aria-label="Virar à direita">▶</button>
      </div>
      <div class="train-tip" hidden>Clique para ir na cabine do trem</div>
      <div class="burst" aria-hidden="true"><span class="b-flash"></span><span class="b-ring"></span><span class="b-ring b-ring2"></span><span class="b-sparks"><i style="--a: 0deg; --d: 0.70"></i><i style="--a: 41deg; --d: 0.88"></i><i style="--a: 60deg; --d: 1.06"></i><i style="--a: 101deg; --d: 0.70"></i><i style="--a: 120deg; --d: 0.88"></i><i style="--a: 161deg; --d: 1.06"></i><i style="--a: 180deg; --d: 0.70"></i><i style="--a: 221deg; --d: 0.88"></i><i style="--a: 240deg; --d: 1.06"></i><i style="--a: 281deg; --d: 0.70"></i><i style="--a: 300deg; --d: 0.88"></i><i style="--a: 341deg; --d: 1.06"></i></span></div>
      <div class="pois"></div>
      <button type="button" class="sound-toggle" aria-pressed="false" aria-label="Ligar a música" tabindex="-1"><i aria-hidden="true"><b></b><b></b><b></b><b></b></i><span>Sem música</span></button>
      <div class="zone-card" role="dialog" hidden>
        <div class="zone-head">
          <span class="world-label zone-index">Miniverso · São Luís</span>
          <h3></h3>
          <button type="button" class="zone-info" aria-expanded="false">Sobre a área</button>
          <button type="button" class="zone-close" aria-label="Fechar e voltar ao planeta" title="Voltar ao planeta">×</button>
        </div>
        <div class="zone-more">
          <div>
            <p class="zone-text"></p>
            <p class="zone-hint">Arraste para girar e olhar de cima · role para aproximar onde está o cursor</p>
          </div>
        </div>
        <div class="zone-tour" hidden>
          <button type="button" class="poi-nav poi-prev" aria-label="Ponto anterior">‹</button>
          <div class="poi-now" aria-live="polite">
            <div class="poi-top"><b class="poi-name"></b><span class="poi-count"></span></div>
            <p class="poi-text"></p>
          </div>
          <button type="button" class="poi-nav poi-next" aria-label="Próximo ponto">›</button>
          <button type="button" class="poi-play" aria-pressed="false"><i aria-hidden="true"></i>Tour</button>
        </div>
        <div class="zone-actions">
          <button type="button" class="zone-act"></button>
          <button type="button" class="zone-act zone-act2" hidden></button>
          <button type="button" class="zone-act zone-act3" hidden></button>
          <button type="button" class="zone-act zone-act4" hidden></button>
          <p class="zone-status" aria-live="polite"></p>
        </div>
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
@media (max-width: 1280px) { .capa-bar { grid-template-columns: auto 1fr; } .capa-bar .step { display: none; } }
.capa-bar .actions { display: flex; justify-content: flex-end; gap: 8px; align-items: center; }
.capa-bar button, .capa-bar a { font: inherit; letter-spacing: .04em; text-transform: none; color: var(--ice); background: none; border: 0; padding: 4px 0; cursor: pointer; text-decoration: none; }
.capa-bar a { border-bottom: 1px solid var(--ice); }
/* Ajustes da abertura: pílulas de vidro com uma chave liga/desliga (azul quando ligada) e o atalho para os projetos. */
.capa-bar .chip { display: inline-flex; align-items: center; gap: 9px; padding: 8px 14px 8px 9px; border-radius: 999px; white-space: nowrap;
  font: 500 12px var(--font-display); letter-spacing: .03em; text-transform: none; color: rgba(233, 234, 243, .92);
  background: rgba(255, 255, 255, .05); border: 1px solid rgba(255, 255, 255, .14); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px);
  transition: color .25s, border-color .25s, background .25s; }
.capa-bar .chip:hover, .capa-bar .chip:focus-visible { color: #fff; border-color: rgba(127, 233, 255, .6); background: rgba(0, 183, 227, .1); }
.chip .sw { position: relative; flex: none; width: 24px; height: 14px; border-radius: 999px; background: rgba(255, 255, 255, .2); transition: background .25s; }
.chip .sw::after { content: ""; position: absolute; top: 2px; left: 2px; width: 10px; height: 10px; border-radius: 50%; background: #fff; transition: translate .25s; }
.chip[aria-pressed="true"] .sw { background: var(--cyan); box-shadow: 0 0 10px rgba(0, 183, 227, .5); }
.chip[aria-pressed="true"] .sw::after { translate: 10px 0; }
.capa-bar .chip.go { padding: 8px 14px; color: #fff; border-color: rgba(0, 183, 227, .5); background: rgba(0, 183, 227, .12); }
.chip.go i { font-style: normal; transition: translate .25s; } .chip.go:hover i { translate: 3px 0; }
/* Explosãozinha do planeta pronto: clarão, dois anéis de choque e faíscas saindo do centro do planeta. */
.burst { position: absolute; left: calc(var(--bx, 50) * 1%); top: calc(var(--by, 50) * 1%); width: 0; height: 0; pointer-events: none; }
.burst span, .burst i { position: absolute; left: 0; top: 0; opacity: 0; }
.burst .b-sparks { opacity: 1; }
.b-flash { width: 90vmin; height: 90vmin; margin: -45vmin; border-radius: 50%; background: radial-gradient(circle, #fff 0%, rgba(235, 252, 255, .95) 22%, rgba(120, 225, 255, .6) 45%, rgba(0, 183, 227, .18) 62%, transparent 72%); }
.b-ring { width: 40vmin; height: 40vmin; margin: -20vmin; border-radius: 50%; border: 3px solid rgba(200, 248, 255, .95); box-shadow: 0 0 30px rgba(0, 183, 227, .8), inset 0 0 30px rgba(0, 183, 227, .5); }
.b-sparks i { width: 8px; height: 8px; margin: -4px; border-radius: 50%; background: #fff; box-shadow: 0 0 10px #7fe9ff, 0 0 20px #00b7e3; }
.burst.go .b-flash { animation: b-flash 1.1s ease-out both; }
.burst.go .b-ring { animation: b-ring 1.2s cubic-bezier(.15, .7, .3, 1) both; }
.burst.go .b-ring2 { animation-delay: .14s; animation-duration: 1.5s; }
.burst.go .b-sparks i { animation: b-spark calc(var(--d) * 1.4s) cubic-bezier(.1, .8, .3, 1) both; }
@keyframes b-flash { 0% { opacity: 0; transform: scale(.3); } 10% { opacity: 1; } 35% { opacity: .85; } 100% { opacity: 0; transform: scale(1.3); } }
@keyframes b-ring { 0% { opacity: 1; transform: scale(.25); } 100% { opacity: 0; transform: scale(2.6); border-width: .5px; } }
@keyframes b-spark { 0% { opacity: 1; transform: rotate(var(--a)) translateX(4vmin) scale(1.2); } 100% { opacity: 0; transform: rotate(var(--a)) translateX(calc(var(--d) * 46vmin)) scale(.3); } }
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
/* Barra da área: fina, embaixo e no centro, para a cena ficar livre. Cabeçalho com número e nome, gaveta com o
   texto completo, legenda do ponto de interesse com setas e tour, e as ações da área. Some quase toda enquanto a
   pessoa arrasta ou dá zoom. */
.zone-card { --c: var(--cyan); position: absolute; left: 50%; bottom: calc(18px + env(safe-area-inset-bottom, 0px)); width: min(720px, calc(100% - 32px)); translate: -50% 0;
  display: grid; gap: 10px; padding: 14px 16px 12px; border-radius: 18px; overflow: hidden; transition: opacity .35s ease;
  background: radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--c) 20%, transparent), transparent 60%), linear-gradient(160deg, rgba(28, 22, 62, .93), rgba(10, 8, 24, .9));
  border: 1px solid rgba(255, 255, 255, .12); box-shadow: 0 30px 70px rgba(0, 0, 0, .5), inset 0 1px 0 rgba(255, 255, 255, .1);
  -webkit-backdrop-filter: blur(12px); backdrop-filter: blur(12px); animation: card-in .5s cubic-bezier(.2, .8, .2, 1); }
.zone-card::before { content: ""; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, var(--c), transparent 85%); }
.stage > .zone-card { pointer-events: auto; }
.zone-card[hidden] { display: none; }
.zone-card.busy { opacity: .16; }
/* Na cabine, compacta no canto esquerdo, longe do painel de instrumentos. */
.zone-card.compact { left: max(16px, 4vw); translate: 0 0; width: min(420px, calc(100% - 32px)); }
.zone-head { display: flex; align-items: center; gap: 12px; }
.zone-card .zone-index { color: var(--c); white-space: nowrap; }
.zone-card .zone-close { display: grid; place-items: center; flex: none; width: 32px; height: 32px; padding: 0; font-size: 18px; line-height: 1; }
.zone-card h3 { flex: 1; min-width: 0; margin: 0; font: 700 28px/1 var(--font-title); letter-spacing: .01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-shadow: 0 0 30px color-mix(in srgb, var(--c) 35%, transparent); }
.zone-card p { margin: 0; color: #c4c4dc; font-size: 14px; line-height: 1.55; }
.zone-card .zone-info { flex: none; padding: 7px 13px; font-size: 12px; }
.zone-card .zone-info::after { content: ""; display: inline-block; width: 5px; height: 5px; margin-left: 8px; border-right: 1.5px solid currentColor; border-bottom: 1.5px solid currentColor; transform: translateY(-2px) rotate(-135deg); transition: transform .3s; }
.zone-card.open .zone-info { border-color: var(--c); }
.zone-card.open .zone-info::after { transform: translateY(1px) rotate(45deg); }
.zone-more { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .4s cubic-bezier(.2, .8, .2, 1); }
.zone-more > div { display: grid; gap: 8px; min-height: 0; overflow: hidden; }
.zone-card.open .zone-more { grid-template-rows: 1fr; }
.zone-more[hidden], .zone-tour[hidden], .zone-card .zone-info[hidden], .zone-card .zone-close[hidden] { display: none; }
.zone-tour { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 10px 0; border-block: 1px solid rgba(255, 255, 255, .08); }
.poi-now { display: grid; gap: 3px; min-width: 0; }
.poi-top { display: flex; align-items: baseline; gap: 10px; }
.poi-name { font: 600 14px var(--font-display); color: #fff; }
.poi-count { font: 10px var(--font-mono); letter-spacing: .1em; color: var(--c); white-space: nowrap; }
.zone-card .poi-text { font-size: 13px; line-height: 1.45; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.zone-card .poi-nav { display: grid; place-items: center; width: 36px; height: 36px; padding: 0 0 2px; font-size: 22px; line-height: 1; }
.zone-card .poi-play { display: inline-flex; align-items: center; gap: 8px; font-weight: 600; }
.poi-play i { width: 0; height: 0; border-block: 5px solid transparent; border-left: 8px solid var(--c); }
.poi-play[aria-pressed="true"] { border-color: var(--c); background: color-mix(in srgb, var(--c) 22%, transparent); }
.poi-play[aria-pressed="true"] i { width: 8px; height: 10px; border: 0; border-inline: 3px solid var(--c); }
/* Botão da música: pílula de vidro no canto de cima; as barrinhas dançam com a música ligada. */
.sound-toggle { position: absolute; right: max(16px, 4vw); top: calc(84px + env(safe-area-inset-top, 0px)); display: inline-flex; align-items: center; gap: 9px; padding: 8px 14px 8px 12px; border-radius: 999px;
  font: 600 11px var(--font-display); letter-spacing: .12em; text-transform: uppercase; color: rgba(255, 255, 255, .7); cursor: pointer;
  background: rgba(16, 12, 36, .62); border: 1px solid rgba(255, 255, 255, .16); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .35); opacity: 0; pointer-events: none; transition: opacity .4s, border-color .25s, color .25s; }
.sound-toggle.live { opacity: 1; pointer-events: auto; }
.sound-toggle:hover { border-color: rgba(0, 183, 227, .7); color: #fff; }
.sound-toggle[aria-pressed="true"] { color: #fff; border-color: rgba(0, 183, 227, .55); box-shadow: 0 8px 24px rgba(0, 0, 0, .35), 0 0 18px rgba(0, 183, 227, .25); }
.sound-toggle i { display: flex; align-items: flex-end; gap: 2px; height: 12px; }
.sound-toggle b { width: 2px; height: 3px; border-radius: 1px; background: currentColor; transition: height .3s; }
.sound-toggle[aria-pressed="true"] b { background: var(--cyan); animation: eq 1.1s ease-in-out infinite; }
.sound-toggle[aria-pressed="true"] b:nth-child(2) { animation-delay: -.35s; } .sound-toggle[aria-pressed="true"] b:nth-child(3) { animation-delay: -.7s; } .sound-toggle[aria-pressed="true"] b:nth-child(4) { animation-delay: -.2s; }
@keyframes eq { 0%, 100% { height: 3px; } 50% { height: 12px; } }
.game-hud:not([hidden]) ~ .sound-toggle { opacity: 0; pointer-events: none; }
/* Marcadores numerados dos pontos de interesse: o nome aparece ao passar o mouse. */
.pois { --c: var(--cyan); position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.pois :deep(.poi) { position: absolute; left: -15px; top: -15px; display: flex; align-items: center; padding: 0; border: 0; background: none; color: #fff; cursor: pointer; opacity: 0; transition: opacity .3s; }
.pois :deep(.poi.live) { pointer-events: auto; }
.pois :deep(.poi b) { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; font: 700 13px var(--font-display);
  background: rgba(10, 8, 24, .78); border: 1.5px solid var(--c); box-shadow: 0 6px 18px rgba(0, 0, 0, .45), 0 0 14px color-mix(in srgb, var(--c) 45%, transparent);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); transition: transform .25s, background .25s; }
.pois :deep(.poi b)::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; animation: poi-pulse 2.6s ease-out infinite; }
.pois :deep(.poi span) { max-width: 0; margin-left: 0; padding: 5px 0; overflow: hidden; white-space: nowrap; opacity: 0; border-radius: 999px;
  font: 600 11px var(--font-display); letter-spacing: .1em; text-transform: uppercase; background: rgba(10, 8, 24, .82); transition: max-width .3s, opacity .3s, margin .3s, padding .3s; }
.pois :deep(.poi:hover b), .pois :deep(.poi:focus-visible b) { transform: scale(1.12); background: color-mix(in srgb, var(--c) 40%, rgba(10, 8, 24, .8)); }
.pois :deep(.poi:hover span), .pois :deep(.poi:focus-visible span) { max-width: 220px; margin-left: 8px; padding: 5px 12px; opacity: 1; }
@keyframes poi-pulse { 0% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--c) 60%, transparent); } 100% { box-shadow: 0 0 0 12px transparent; } }
.zone-card button { justify-self: start; font: 500 13px var(--font-display); color: var(--ice); background: rgba(255, 255, 255, .04); border: 1px solid rgba(255, 255, 255, .18);
  border-radius: 999px; padding: 9px 15px; cursor: pointer; transition: background .2s, border-color .2s, transform .2s; }
.zone-card button:hover { border-color: var(--c); transform: translateY(-1px); }
.zone-card button[hidden] { display: none; }
.zone-card .zone-act { font-weight: 600; color: #fff; border-color: var(--c); background: color-mix(in srgb, var(--c) 22%, transparent); }
.zone-card .zone-act:hover { background: color-mix(in srgb, var(--c) 36%, transparent); }
.zone-card .zone-status { min-height: 1.4em; font: 11px/1.4 var(--font-mono); letter-spacing: .06em; color: var(--c); }
.zone-card .zone-hint { font: 11px/1.4 var(--font-mono); letter-spacing: .04em; color: rgba(255, 255, 255, .55); }
@keyframes card-in { from { opacity: 0; transform: translateY(14px) scale(.98); } }
@media (prefers-reduced-motion: reduce) { .zone-label .dot, .zone-card { animation: none; } }
.zone-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.zone-actions .zone-status { flex: 1 1 180px; min-height: 0; }
.game-hud { position: absolute; left: 50%; top: calc(72px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); display: grid; justify-items: center; gap: 4px; min-width: min(300px, calc(100% - 32px)); padding: 9px 16px; border-radius: 14px;
  background: rgba(20, 12, 42, .82); border: 1px solid #ff4fd8; box-shadow: 0 0 24px rgba(255, 79, 216, .35); text-align: center; -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); }
.game-hud[hidden] { display: none; }
.gh-title { font: 700 18px/1 var(--font-title); letter-spacing: .02em; color: #ffc56b; }
.gh-score { font: 700 26px/1 var(--font-title); color: #fff; min-height: 1em; }
.gh-hint { font: 11px/1.35 var(--font-mono); color: #7fe9ff; max-width: 40ch; }
.stage > .game-hud .gh-btn { pointer-events: auto; }
.gh-btn { margin-top: 4px; font: 700 22px/1 var(--font-title); letter-spacing: .04em; color: #140c2a; background: #ffc56b; border: 0; border-radius: 999px; padding: 12px 28px; cursor: pointer; box-shadow: 0 0 18px rgba(255, 197, 107, .6); touch-action: manipulation; }
.gh-btn[hidden] { display: none; }
.gh-btn:active { transform: scale(.95); }
/* Corrida: placar menor (a câmera fica atrás do kart) e, em telas de toque, botões para virar e frear. */
.game-hud.racing { gap: 4px; padding: 8px 16px; min-width: 0; }
.game-hud.racing .gh-title { display: none; }
.game-hud.racing .gh-score { font-size: 22px; }
.race-pad { position: absolute; left: 16px; right: 16px; bottom: calc(150px + env(safe-area-inset-bottom, 0px)); display: flex; justify-content: space-between; align-items: flex-end; }
.race-pad[hidden] { display: none; }
.stage > .race-pad .rp-btn { pointer-events: auto; }
.rp-btn { width: 72px; height: 72px; border-radius: 50%; font: 700 24px/1 var(--font-title); color: #fff; background: rgba(20, 12, 42, .6); border: 1px solid rgba(127, 233, 255, .55);
  -webkit-backdrop-filter: blur(6px); backdrop-filter: blur(6px); touch-action: none; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none; cursor: pointer; }
.rp-btn:active { background: rgba(0, 183, 227, .35); transform: scale(.94); }
.rp-btn.rp-brake { width: 64px; height: 44px; border-radius: 999px; font: 600 11px var(--font-display); letter-spacing: .1em; text-transform: uppercase; border-color: rgba(255, 79, 216, .55); }
@media (hover: hover) and (pointer: fine) { .race-pad { display: none; } }
/* Fliperama: gabinete com letreiro, tela de tubo (linhas de varredura) e a dica embaixo. */
.arcade { position: absolute; left: 50%; top: calc(76px + env(safe-area-inset-top, 0px)); transform: translateX(-50%); width: min(460px, calc(100% - 32px)); display: grid; gap: 8px; padding: 12px 12px 10px;
  border-radius: 18px; background: linear-gradient(#241a46, #140c2a); border: 2px solid #ff4fd8; box-shadow: 0 0 32px rgba(255, 79, 216, .45), inset 0 0 0 3px #140c2a; }
.arcade[hidden] { display: none; }
.stage > .arcade { pointer-events: auto; }
.ac-top { display: flex; align-items: center; gap: 10px; }
.ac-title { font: 700 22px/1 var(--font-title); letter-spacing: .04em; color: #ffc56b; text-shadow: 0 0 10px rgba(255, 197, 107, .6); }
.ac-score { flex: 1; font: 12px var(--font-mono); color: #7fe9ff; text-align: right; }
.ac-close { width: 30px; height: 30px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, .25); background: rgba(255, 255, 255, .06); color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.ac-close:hover { border-color: #7fe9ff; }
.ac-screen { position: relative; border-radius: 10px; overflow: hidden; border: 2px solid #0b0618; box-shadow: 0 0 18px rgba(0, 183, 227, .35); }
.ac-screen canvas { display: block; width: 100%; aspect-ratio: 4 / 3; image-rendering: pixelated; touch-action: none; cursor: none; }
.ac-screen::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(rgba(0, 0, 0, .18) 0 1px, transparent 1px 3px); }
.ac-hint { margin: 0; font: 11px/1.4 var(--font-mono); color: rgba(233, 234, 243, .78); text-align: center; }
.arcade:not([hidden]) ~ .sound-toggle { opacity: 0; pointer-events: none; }
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
.no-webgl .back-planet, .no-webgl .travel, .no-webgl .names, .no-webgl .hint, .no-webgl .labels, .no-webgl .world, .no-webgl .meter, .no-webgl .capa-bar .auto-toggle, .no-webgl .capa-bar .motion-toggle, .no-webgl .capa-bar .sound-chip { display: none; }

@media (max-width: 760px) {
  .capa-top { top: calc(84px + env(safe-area-inset-top, 0px)); font-size: 9px; }
  .capa-bottom { flex-direction: column; align-items: flex-start; gap: 10px; bottom: calc(88px + env(safe-area-inset-bottom, 0px)); }
  .capa-bar { grid-template-columns: 1fr; }
  .capa-bar .step, .capa-bar .enter { display: none; }
  .capa-bar .actions { justify-content: flex-start; flex-wrap: wrap; gap: 6px; }
  .capa-bar .chip { padding: 7px 11px 7px 8px; font-size: 11px; gap: 7px; }
}
@media (max-width: 700px) { .meter { display: none; } .zone-label .tag { padding: 5px 10px 5px 8px; } .zone-label .name { font-size: 10px; letter-spacing: .1em; }
  .zone-card { bottom: calc(10px + env(safe-area-inset-bottom, 0px)); width: calc(100% - 20px); padding: 12px 12px 10px; gap: 8px; }
  .zone-card .zone-index { display: none; } .zone-card h3 { font-size: 24px; } .zone-card .zone-info { padding: 6px 10px; }
  .zone-tour { grid-template-columns: auto 1fr auto; gap: 8px; } .zone-card .poi-play { grid-column: 1 / -1; justify-self: center; padding: 7px 14px; }
  .zone-card .poi-nav { width: 32px; height: 32px; } .zone-card .zone-act { padding: 8px 12px; font-size: 12px; } }
.reduced .mini, .reduced .verso, .reduced .zone-label .dot, .reduced .zone-card, .reduced .planet-exit i::before, .reduced .pois :deep(.poi b)::after, .reduced .sound-toggle b { animation: none; }
.reduced .chip .sw::after { transition: none; }
</style>
