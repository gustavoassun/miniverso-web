<template>
  <section ref="intro" class="immersive-intro" :class="{ 'motion-reduced': motionReduced }" :style="sceneStyle" aria-labelledby="intro-title">
    <div class="intro-stage">
      <img class="cosmic-field" src="/images/cosmic-field.png" alt="" width="1536" height="1024" fetchpriority="high" />
      <div class="brand-world" aria-hidden="true"></div>
      <canvas ref="particles" class="particle-field" aria-hidden="true"></canvas>

      <div class="intro-topline"><span>UM ESTÚDIO. INFINITAS POSSIBILIDADES.</span><span class="intro-location">SÃO LUÍS, BRASIL</span></div>
      <h1 id="intro-title" class="sr-only">Miniverso — experiências imersivas para marcas</h1>
      <div class="split-name" aria-hidden="true"><span>mini</span><span>verso</span></div>
      <div class="headset-position" aria-hidden="true">
        <img class="headset" src="/images/vr-headset.png" alt="" width="1536" height="1024" fetchpriority="high" />
      </div>

      <div class="reveal-signature" aria-hidden="true">
        <span class="reveal-eyebrow">BEM-VINDO AO NOSSO UNIVERSO</span>
        <img src="/images/miniverso-logo.png" alt="" width="1024" height="236" />
        <span class="reveal-caption">Aqui, ideias ganham outra dimensão.</span>
      </div>
      <div class="project-fragments" aria-hidden="true">
        <figure class="fragment fragment-left"><img src="/images/avati.png" alt="" width="960" height="540" /><figcaption>01 / AVATI<span>Gamificação & ativação de marca</span></figcaption></figure>
        <figure class="fragment fragment-right"><img src="/images/reciclaverso.png" alt="" width="1024" height="576" /><figcaption>02 / RECICLAVERSO<span>Realidade virtual & sustentabilidade</span></figcaption></figure>
      </div>

      <div class="intro-description"><p>O mundo real é só<br /><em>o começo.</em></p><span>Realidade virtual, aumentada e conteúdo 3D.<br />Experiências que levam sua ideia além da tela.</span></div>
      <div class="intro-bottomline">
        <a href="#sobre" class="scroll-invitation">Role para entrar <span aria-hidden="true">↓</span></a>
        <span class="intro-index" aria-hidden="true">{{ phaseLabel }}</span>
        <div class="intro-controls"><button type="button" :aria-pressed="motionReduced" @click="toggleMotion">{{ motionReduced ? 'Ativar movimento' : 'Reduzir movimento' }}</button><a href="#portfolio">Ir aos projetos</a></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { introFrame, clamp } from '../utils/introMotion.js';

const intro = ref(null);
const particles = ref(null);
const progress = ref(0);
const motionReduced = ref(false);
const phaseLabel = computed(() => motionReduced.value ? 'MINIVERSO / EXPERIÊNCIAS IMERSIVAS' : progress.value < 0.28 ? '01 / ENTRE' : progress.value < 0.68 ? '02 / EXPLORE' : '03 / DESCUBRA');
const sceneStyle = computed(() => introFrame(progress.value, motionReduced.value));
let mediaQuery;
let userMotionChoice = null;
let frameId = 0;
let resizeObserver;
let visible = true;
let intersectionObserver;
let context;
let width = 0;
let height = 0;
let lastPaint = 0;
let stars = [];

function updateProgress() {
  if (!intro.value || motionReduced.value) return;
  const box = intro.value.getBoundingClientRect();
  progress.value = clamp(-box.top / Math.max(1, intro.value.offsetHeight - window.innerHeight));
}

function resizeCanvas() {
  if (!particles.value) return;
  const box = particles.value.getBoundingClientRect();
  width = box.width;
  height = box.height;
  const density = Math.min(window.devicePixelRatio || 1, 1.5);
  particles.value.width = Math.round(width * density);
  particles.value.height = Math.round(height * density);
  context = particles.value.getContext('2d');
  if (!context) return;
  context.setTransform(density, 0, 0, density, 0, 0);
  stars = Array.from({ length: width < 700 ? 32 : 72 }, (_, i) => ({ x: ((i * 0.61803398875) % 1) * width, y: ((i * 0.41421356237) % 1) * height, size: i % 9 === 0 ? 1.5 : 0.65, speed: 0.012 + (i % 5) * 0.004 }));
  updateProgress();
}

function paint(time) {
  frameId = 0;
  if (!visible || document.hidden || motionReduced.value) return;
  updateProgress();
  if (context && time - lastPaint > 32) {
    const delta = Math.min(time - lastPaint, 64);
    lastPaint = time;
    context.clearRect(0, 0, width, height);
    const expansion = Math.max(0, progress.value - 0.3) * 0.7;
    const starColor = progress.value > 0.62 ? 'rgba(96, 218, 244, 0.5)' : 'rgba(204, 220, 255, 0.55)';
    const drawTrace = progress.value > 0.68;
    const traceLeft = width * 0.14;
    const traceRight = width * 0.86;
    context.fillStyle = starColor;
    for (const star of stars) {
      star.y = (star.y - star.speed * delta + height) % height;
      const x = star.x + (star.x - width / 2) * expansion;
      const y = star.y + (star.y - height / 2) * expansion;

      context.fillRect(x, y, star.size, star.size);
      // A low-contrast digital trace at the edges, not a flashing glitch.
      if (drawTrace && star.size > 1 && (x < traceLeft || x > traceRight)) context.fillRect(x, y, 8, 0.6);
    }
  }
  frameId = requestAnimationFrame(paint);
}

function resumeAnimation() {
  cancelAnimationFrame(frameId);
  frameId = 0;
  if (motionReduced.value) context?.clearRect(0, 0, width, height);
  else if (visible && !document.hidden) frameId = requestAnimationFrame(paint);
  updateProgress();
}

async function toggleMotion() {
  const anchor = intro.value.offsetTop;
  userMotionChoice = !motionReduced.value;
  motionReduced.value = userMotionChoice;
  await nextTick();
  window.scrollTo({ top: anchor, behavior: 'instant' });
  resizeCanvas();
  resumeAnimation();
}

function onMotionPreference(event) {
  if (userMotionChoice === null) motionReduced.value = event.matches;
  requestAnimationFrame(() => { resizeCanvas(); resumeAnimation(); });
}

onMounted(() => {
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  motionReduced.value = mediaQuery.matches;
  mediaQuery.addEventListener('change', onMotionPreference);
  resizeObserver = new ResizeObserver(resizeCanvas);
  resizeObserver.observe(particles.value);
  intersectionObserver = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; resumeAnimation(); });
  intersectionObserver.observe(intro.value);
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress, { passive: true });
  document.addEventListener('visibilitychange', resumeAnimation);
  resizeCanvas();
  resumeAnimation();
});

onUnmounted(() => {
  cancelAnimationFrame(frameId);
  mediaQuery?.removeEventListener('change', onMotionPreference);
  resizeObserver?.disconnect();
  intersectionObserver?.disconnect();
  window.removeEventListener('scroll', updateProgress);
  window.removeEventListener('resize', updateProgress);
  document.removeEventListener('visibilitychange', resumeAnimation);
});
</script>

<style scoped>
.immersive-intro { height: 280svh; padding: 0; border: 0; background: #060710; }
.intro-stage { position: sticky; top: 0; height: 100svh; min-height: 640px; overflow: clip; isolation: isolate; color: #f3f4fa; }
.cosmic-field, .brand-world, .particle-field { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.cosmic-field { object-fit: cover; opacity: var(--field-opacity); transform: scale(var(--field-scale)); }
.brand-world { background: #211747; opacity: var(--world-opacity); }
.particle-field { z-index: 1; }
.intro-topline { position: absolute; top: 22%; left: 5%; right: 5%; display: flex; justify-content: space-between; color: #acb1c5; font: 10px/1.5 var(--font-mono); letter-spacing: .12em; opacity: var(--opening-opacity); }
.split-name { position: absolute; z-index: 3; inset: 0; display: flex; justify-content: center; align-items: center; gap: calc(clamp(270px, 39vw, 560px) * var(--name-gap)); padding-bottom: 3vh; font-size: clamp(80px, 10.2vw, 158px); font-weight: 500; line-height: 1; letter-spacing: -.075em; opacity: var(--name-opacity); transform: translateY(var(--name-y)); pointer-events: none; }
.headset-position { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; padding-bottom: 4vh; pointer-events: none; }
.headset { width: min(43vw, 590px); height: auto; object-fit: contain; opacity: var(--headset-opacity); transform: translateY(var(--headset-y)) scale(var(--headset-scale)) rotate(var(--headset-rotation)); will-change: transform, opacity; }
.reveal-signature { position: absolute; z-index: 4; left: 50%; top: 47%; width: min(48vw, 560px); display: flex; align-items: center; flex-direction: column; gap: 24px; opacity: var(--reveal-opacity); transform: translate(-50%, -50%) translateY(var(--reveal-y)); pointer-events: none; }
.reveal-signature img { width: 100%; height: auto; }
.reveal-eyebrow, .reveal-caption { white-space: nowrap; }
.reveal-eyebrow { color: #82deef; font: 10px/1.5 var(--font-mono); letter-spacing: .17em; }
.reveal-caption { color: #d2cce8; font-size: 15px; }
.project-fragments { position: absolute; z-index: 2; inset: 0; opacity: var(--fragment-opacity); pointer-events: none; perspective: 1200px; }
.fragment { position: absolute; width: clamp(180px, 22vw, 330px); margin: 0; transform: translateY(var(--fragment-y)) rotateY(12deg) rotate(-9deg); }
.fragment-left { top: 33%; left: -4%; }
.fragment-right { top: 42%; right: -4%; transform: translateY(var(--fragment-y)) rotateY(-12deg) rotate(9deg); }
.fragment img { display: block; width: 100%; height: auto; border: 1px solid #766a99; box-shadow: 0 25px 60px #10092580; }
.fragment figcaption { margin-top: 16px; padding-inline: 16px; color: #8edfeb; font: 10px/1.6 var(--font-mono); letter-spacing: .08em; }
.fragment figcaption span { display: block; color: #ccc5dd; letter-spacing: 0; }
.intro-description { position: absolute; z-index: 4; bottom: 15%; left: 5%; right: 5%; display: flex; justify-content: space-between; align-items: end; opacity: var(--opening-opacity); pointer-events: none; }
.intro-description p { margin: 0; font-size: clamp(26px, 3.2vw, 48px); line-height: 1.1; letter-spacing: -.04em; }
.intro-description em { color: #93dce9; font-style: normal; }
.intro-description > span { max-width: 330px; color: #b0b5c9; font-size: 13px; line-height: 1.65; }
.intro-bottomline { position: absolute; z-index: 5; left: 5%; right: 5%; bottom: 30px; display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-top: 22px; border-top: 1px solid #9d99b22b; font: 10px/1.5 var(--font-mono); }
.scroll-invitation { text-decoration: none; text-transform: uppercase; letter-spacing: .1em; display: flex; align-items: center; gap: 22px; min-height: 44px; }
.scroll-invitation span { font-size: 22px; }
.intro-index { color: #8e91aa; letter-spacing: .08em; }
.intro-controls { display: flex; align-items: center; gap: 22px; }
.intro-controls button { cursor: pointer; color: #c4c7d6; background: transparent; border: 0; font: inherit; padding: 12px 0; min-height: 44px; }
.intro-controls a { padding: 12px 0; min-height: 44px; text-underline-offset: 5px; }
.motion-reduced { height: auto; }
.motion-reduced .intro-stage { position: relative; }
.motion-reduced .project-fragments { display: none; }
.motion-reduced .reveal-signature { top: 45%; }
@media (max-width: 700px) {
  .immersive-intro { height: 240svh; }
  .intro-stage { min-height: 620px; }
  .intro-topline { top: 19%; left: 6%; right: 6%; font-size: 8px; }
  .intro-location { display: none; }
  .split-name { font-size: clamp(60px, 14vw, 96px); gap: calc(17vw * var(--name-gap)); padding-bottom: 6vh; }
  .headset-position { padding-bottom: 6vh; }
  .headset { width: 69vw; }
  .intro-description { left: 6%; right: 6%; bottom: 18%; align-items: start; gap: 16px; flex-direction: column; }
  .intro-description p { font-size: 30px; }
  .intro-description > span { font-size: 11px; }
  .intro-bottomline { left: 6%; right: 6%; bottom: 16px; flex-wrap: wrap; gap: 2px 12px; padding-top: 10px; font-size: 9px; }
  .intro-index { display: none; }
  .intro-controls { gap: 16px; }
  .scroll-invitation { gap: 10px; }
  .reveal-signature { width: 78vw; gap: 20px; top: 43%; }
  .reveal-eyebrow { font-size: 8px; letter-spacing: .08em; }
  .reveal-caption { font-size: 12px; }
  .fragment { width: 43vw; }
  .fragment-left { top: 64%; left: -8%; }
  .fragment-right { top: 68%; right: -8%; }
  .fragment figcaption { font-size: 8px; margin-top: 10px; }
  .fragment figcaption span { display: none; }
  .motion-reduced { height: auto; }
}
@media (max-height: 640px) and (min-width: 701px) {
  .intro-stage { min-height: 460px; }
  .intro-topline { top: 19%; }
  .intro-description { bottom: 18%; }
  .intro-description p { font-size: 28px; }
  .intro-bottomline { bottom: 12px; padding-top: 8px; }
}
@media (max-height: 600px) and (max-width: 700px) {
  .intro-stage { min-height: 0; }
  .intro-topline { top: 25%; }
  .headset { width: 47vw; }
  .split-name { font-size: 11vw; }
  .intro-description { bottom: 23%; }
  .intro-description p { font-size: 22px; }
  .intro-description > span { display: none; }
  .fragment-left, .fragment-right { top: 62%; }
  .fragment { width: 26vw; }
  .reveal-signature { width: 62vw; gap: 10px; }
}
</style>
