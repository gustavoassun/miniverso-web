<template>
  <section id="inicio" tabindex="-1" ref="intro" class="immersive-intro" :class="{ 'motion-reduced': motionReduced, 'world-entered': progress >= .76 }" :style="sceneStyle" aria-labelledby="intro-title">
    <div class="intro-stage" @pointermove="moveHeadset" @pointerleave="resetHeadset">
      <img class="cosmic-field" src="/images/cosmic-field.png" alt="" width="1536" height="1024" fetchpriority="high" />
      <div class="brand-world" aria-hidden="true"></div>
      <div class="portal-burst" aria-hidden="true"></div>
      <div class="edge-circuits" aria-hidden="true"><i v-for="i in 8" :key="i" :style="{ '--i': i }" /></div>
      <canvas ref="particles" class="particle-field" aria-hidden="true"></canvas>

      <div class="intro-topline"><span>UM ESTÚDIO. INFINITAS POSSIBILIDADES.</span><span class="intro-location">SÃO LUÍS, BRASIL</span></div>
      <h1 id="intro-title" class="sr-only">Miniverso — experiências imersivas para marcas</h1>
      <div class="split-name" aria-hidden="true"><span class="name-mini"><svg viewBox="355 50 270 110"><image href="/images/miniverso-logo.png" width="1024" height="236"/></svg></span><span class="name-verso"><svg viewBox="625 50 370 110"><image href="/images/miniverso-logo.png" width="1024" height="236"/></svg></span></div>
      <div class="brand-handoff" aria-hidden="true"><img src="/images/miniverso-logo.png" alt="" width="836" height="174" /></div>
      <div class="headset-position">
        <HeadsetScene :progress="progress" :reduced="motionReduced" :pointer="pointer" />
      </div>
      <div class="eye-alignment" aria-hidden="true"><i/><i/><span>ALINHANDO A EXPERIÊNCIA AO SEU OLHAR</span></div>
      <div class="threshold-flash" aria-hidden="true"><span/></div>

      <div class="vr-world-preview" :inert="!motionReduced && progress < .95">
        <p class="world-eyebrow">ESTÚDIO DE EXPERIÊNCIAS IMERSIVAS</p>
        <h2>Ideias que você<br />pode <em>vivenciar.</em></h2>
        <p class="world-description">Realidade virtual, gamificação e conteúdo 3D.<br />Conheça os mundos que criamos para conectar pessoas e ideias.</p>
        <a href="#portfolio" class="world-link">Explorar os projetos <span aria-hidden="true">↗</span></a>
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
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { introFrame, clamp } from '../utils/introMotion.js';
import HeadsetScene from './HeadsetScene.vue';

const emit = defineEmits(['scene-change']);
const pointer = ref({ x: 0, y: 0 });

const intro = ref(null);
const particles = ref(null);
const progress = ref(0);
const motionReduced = ref(false);
const phaseLabel = computed(() => motionReduced.value ? 'MINIVERSO / EXPERIÊNCIAS IMERSIVAS' : progress.value < 0.28 ? '01 / ENTRE' : progress.value < 0.68 ? '02 / EXPLORE' : '03 / DESCUBRA');
const sceneStyle = computed(() => ({ ...introFrame(progress.value, motionReduced.value), '--pointer-y': `${pointer.value.x * 7}deg`, '--pointer-x': `${-pointer.value.y * 5}deg` }));
watch([progress, motionReduced], () => emit('scene-change', { progress: progress.value, reduced: motionReduced.value }), { immediate: true });
function moveHeadset(event) {
  if (motionReduced.value || event.pointerType !== 'mouse') return;
  pointer.value = { x: clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1), y: clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1) };
}
function resetHeadset() { pointer.value = { x: 0, y: 0 }; }
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
const smooth = (start, end, value) => {
  const t = clamp((value - start) / Math.max(.0001, end - start));
  return t * t * (3 - 2 * t);
};

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
    for (const star of stars) {
      star.y = (star.y - star.speed * delta + height) % height;
      const x = star.x + (star.x - width / 2) * expansion;
      const y = star.y + (star.y - height / 2) * expansion;
      context.fillStyle = progress.value > 0.62 ? 'rgba(96, 218, 244, 0.5)' : 'rgba(204, 220, 255, 0.55)';
      context.fillRect(x, y, star.size, star.size);
      const warp = Math.max(0,1 - Math.abs(progress.value - .49) / .2);
      if (warp > 0) {
        context.beginPath(); context.moveTo(x,y);
        context.lineTo(x + (x-width/2) * warp * .055,y + (y-height/2) * warp * .055);
        context.strokeStyle = `rgba(169,207,233,${warp * .28})`; context.lineWidth = .6; context.stroke();
      }
      // A low-contrast digital trace at the edges, not a flashing glitch.
      if (progress.value > 0.68 && star.size > 1 && (x < width * 0.14 || x > width * 0.86)) context.fillRect(x, y, 8, 0.6);
    }
    if (progress.value > .68) {
      for (let i = 0; i < 16; i++) {
        const edge = i % 2 ? width - 14 : 14;
        const y = height * (.1 + (i * .137) % .78);
        const drift = Math.sin(time * .0008 + i) * 7;
        context.strokeStyle = `rgba(145,216,235,${.2 + Math.sin(time * .001 + i) * .12})`;
        context.beginPath(); context.moveTo(edge,y); context.lineTo(edge + (i%2 ? -1 : 1)*(18+drift),y-7); context.lineTo(edge + (i%2 ? -1 : 1)*(26+drift),y-7); context.stroke();
        context.fillStyle = 'rgba(145,204,226,.4)'; context.fillRect(edge + (i%2 ? -1 : 1)*(32+drift),y-8,2,2);
      }
    }
    const tunnel = smooth(.4,.6,progress.value) * (1-smooth(.74,.87,progress.value));
    if (tunnel > .001) {
      const cx=width/2,cy=height/2,travel=smooth(.42,.76,progress.value),reach=Math.max(width,height);
      context.save();context.globalCompositeOperation='lighter';context.lineCap='round';
      for(let i=0;i<96;i++){
        const angle=i*2.399963+progress.value*1.8,seed=((i*37)%101)/101,radius=22+seed*reach*(.22+travel*.58),length=(12+(i%9)*8+travel*86)*tunnel;
        const x=cx+Math.cos(angle)*radius,y=cy+Math.sin(angle)*radius*.72,dx=Math.cos(angle)*length,dy=Math.sin(angle)*length*.72;
        context.beginPath();context.moveTo(x-dx*.18,y-dy*.18);context.lineTo(x+dx,y+dy);
        context.strokeStyle=`rgba(${i%5===0?'255,238,221':'126,226,255'},${(.08+seed*.42)*tunnel})`;context.lineWidth=.45+(i%7===0?1.5:.25)*tunnel;context.stroke();
      }
      const glow=context.createRadialGradient(cx,cy,0,cx,cy,Math.max(80,reach*.34));
      glow.addColorStop(0,`rgba(242,253,255,${.72*tunnel})`);glow.addColorStop(.12,`rgba(116,226,255,${.42*tunnel})`);glow.addColorStop(.46,`rgba(43,152,211,${.14*tunnel})`);glow.addColorStop(1,'rgba(0,0,0,0)');
      context.fillStyle=glow;context.fillRect(0,0,width,height);context.restore();
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
.immersive-intro { height: 280svh; padding: 0; border: 0; background: transparent; }
.intro-stage { position: sticky; top: 0; height: 100svh; min-height: 640px; overflow: clip; isolation: isolate; color: #f3f4fa; }
.cosmic-field, .brand-world, .particle-field { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.cosmic-field { object-fit: cover; opacity: var(--field-opacity); transform: scale(var(--field-scale)); }
.brand-world { background: radial-gradient(circle at 50% 44%,#38c5eb38 0 12%,#12618a42 28%,transparent 62%),radial-gradient(ellipse at 12% 72%,#397ba73d,transparent 42%),linear-gradient(145deg,#03111e,#08283b 46%,#061724); opacity: var(--world-opacity); }
.brand-world::before{content:'';position:absolute;inset:-25%;background:conic-gradient(from 210deg at 50% 48%,transparent,#5adbf31c,transparent 21%,#366bc818,transparent 52%);animation:world-aurora 18s linear infinite;filter:blur(34px);}
.brand-world::after{content:'';position:absolute;left:-30%;right:-30%;bottom:-17%;height:48%;background:linear-gradient(#79d9ed4d 1px,transparent 1px),linear-gradient(90deg,#79d9ed4d 1px,transparent 1px);background-size:54px 54px;transform:perspective(350px) rotateX(58deg);transform-origin:center top;mask-image:linear-gradient(transparent,#000b);opacity:.28;pointer-events:none;}
@keyframes world-aurora{to{transform:rotate(1turn)}}
.particle-field { z-index: 4; }
.intro-topline { position: absolute; top: 22%; left: 5%; right: 5%; display: flex; justify-content: space-between; color: #acb1c5; font: 10px/1.5 var(--font-mono); letter-spacing: .12em; opacity: var(--opening-opacity); }
.split-name { position:absolute;z-index:3;inset:0;display:flex;justify-content:center;align-items:center;gap:0;font-size:clamp(42px,5vw,72px);line-height:1;opacity:var(--name-opacity);pointer-events:none; }.split-name span{display:block;height:1em;}.name-mini{width:2.454545em;}.name-verso{width:3.363636em;}.split-name svg{display:block;width:100%;height:100%;overflow:hidden;}
.split-name span:first-child{transform:translateX(calc(-27vw * var(--name-gap))) scale(var(--name-scale));transform-origin:right center;}.split-name span:last-child{transform:translateX(calc(27vw * var(--name-gap))) scale(var(--name-scale));transform-origin:left center;}
.brand-handoff{position:absolute;z-index:4;left:50%;top:50%;width:clamp(230px,33vw,450px);transform:translate(-50%,calc(-50% - var(--brand-lift))) scale(var(--brand-scale));opacity:var(--brand-opacity);pointer-events:none;}.brand-handoff img{display:block;width:100%;height:auto;filter:drop-shadow(0 0 22px #72bddd25);}
.headset-position { position: absolute; z-index: 2; inset: 0; display: grid; place-items: center; opacity: var(--headset-opacity); filter:blur(var(--headset-blur)) saturate(var(--headset-saturation)); pointer-events: none; }
.headset-position :deep(.headset-scene){transform:scale(var(--headset-stage-scale));}
.eye-alignment{position:absolute;z-index:3;inset:0;display:grid;place-items:center;opacity:var(--eye-opacity);pointer-events:none}.eye-alignment i{position:absolute;top:50%;left:50%;width:clamp(82px,12vw,170px);aspect-ratio:1;border:1px solid #baf5ff;border-radius:50%;transform:translate(calc(-50% - var(--eye-gap)),-50%) scale(var(--eye-scale));box-shadow:0 0 18px #76ddf488,inset 0 0 26px #83e6fa44}.eye-alignment i:nth-child(2){transform:translate(calc(-50% + var(--eye-gap)),-50%) scale(var(--eye-scale))}.eye-alignment i::after{content:'';position:absolute;inset:38%;border-radius:50%;background:#e8fcff;box-shadow:0 0 30px 9px #5ed9f2}.eye-alignment span{margin-top:clamp(180px,27vh,270px);color:#c7f5ff;font:9px var(--font-mono);letter-spacing:.2em;opacity:var(--threshold-copy-opacity);text-shadow:0 0 14px #61d8f2}
.threshold-flash{position:absolute;z-index:6;inset:0;display:grid;place-items:center;overflow:hidden;opacity:var(--flash-opacity);pointer-events:none;mix-blend-mode:screen}.threshold-flash::before{content:'';position:absolute;left:50%;top:50%;width:140vw;height:3px;background:linear-gradient(90deg,transparent,#84e9ff,#fff,#84e9ff,transparent);transform:translate(-50%,-50%) scaleX(var(--flash-scale));filter:blur(2px);box-shadow:0 0 45px 16px #67dff1aa}.threshold-flash::after{content:'';position:absolute;inset:-20%;background:radial-gradient(circle at center,#fff 0 3%,#c9f8ff 11%,#58d6ef88 31%,transparent 64%);transform:scale(var(--flash-scale));filter:blur(9px)}.threshold-flash span{width:100%;height:100%;background:radial-gradient(circle,#f9ffff 0 8%,#8ae7f36e 31%,transparent 68%);transform:scale(var(--flash-scale));filter:blur(18px)}
.vr-world-preview{position:absolute;z-index:1;left:50%;top:52%;width:min(850px,80%);transform:translate(-50%,-50%);opacity:var(--reveal-opacity);text-align:center;color:#ecf7ff;}
.world-eyebrow{margin:0 0 32px;color:#92cfe6;font:9px var(--font-mono);letter-spacing:.18em;}
.vr-world-preview h2{max-width:none;margin:0;font-size:clamp(43px,6.6vw,96px);font-weight:350;line-height:1.02;letter-spacing:-.055em;}.vr-world-preview h2 em{font-style:normal;color:#9bddf2;}
.world-description{margin:30px auto;max-width:50ch;color:#b3c8d9;font-size:14px;line-height:1.7;}.world-link{display:inline-flex;align-items:center;gap:48px;padding:16px 24px;border:1px solid #97d9ef77;border-radius:30px;color:#d1f3ff;background:#75c4e50c;text-decoration:none;font-size:12px;min-height:48px;}
.headset { width: min(43vw, 590px); height: auto; object-fit: contain; opacity: var(--headset-opacity); transform: translateY(var(--headset-y)) scale(var(--headset-scale)) rotate(var(--headset-rotation)); will-change: transform, opacity; }
.reveal-signature { position: absolute; z-index: 4; left: 50%; top: 50%; width: min(43vw,520px); opacity: var(--reveal-opacity); transform: translate(-50%,-50%); pointer-events: none; }
.reveal-signature img { display: block; width: 100%; height: auto; filter: drop-shadow(0 0 36px #ad93e025); }
.reveal-eyebrow, .reveal-caption { white-space: nowrap; }
.reveal-eyebrow { position: absolute; bottom: calc(100% + 36px); left: 50%; transform: translateX(-50%); color: #aedce7; font: 9px/1.5 var(--font-mono); letter-spacing: .22em; }
.reveal-caption { position: absolute; top: calc(100% + 30px); left: 50%; transform: translateX(-50%); color: #c2b5d7; font-size: 14px; }
.portal-burst { position: absolute; z-index: 2; top: 50%; left: 50%; width: min(60vw,680px); aspect-ratio: 1; border: 1px solid #91dce666; border-radius: 50%; box-shadow: 0 0 40px #9072cc33,inset 0 0 50px #9072cc22; background: radial-gradient(ellipse,#90d9e50d,transparent 67%); opacity: var(--burst-opacity); transform: translate(-50%,-50%) scale(var(--burst-scale)); pointer-events: none; }
.edge-circuits { position: absolute; inset: 0; z-index: 3; opacity: var(--fragment-opacity); pointer-events: none; }
.edge-circuits i { position: absolute; top: calc(12% + var(--i) * 8%); left: 0; width: calc(12px + var(--i) * 3px); height: 1px; background: linear-gradient(90deg,#96dcea,transparent); box-shadow: 0 3px 0 #a990dc55,7px -4px 0 #96dcea33; animation: edge-trace 5s ease-in-out infinite; animation-delay: calc(var(--i) * -.6s); }
.edge-circuits i:nth-child(even) { left: auto; right: 0; transform: scaleX(-1); }
@keyframes edge-trace { 0%,100% { opacity: .15; width: 14px; } 45%,65% { opacity: .75; width: 48px; } }
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
.world-entered .intro-bottomline { bottom: 30px; }
.motion-reduced { height: auto; }
.motion-reduced .intro-stage { position: relative; }
.motion-reduced .project-fragments { display: none; }
.motion-reduced .reveal-signature { top: 50%; }
@media (max-width: 700px) {
  .immersive-intro { height: 240svh; }
  .intro-stage { min-height: 620px; }
  .intro-topline { top: 19%; left: 6%; right: 6%; font-size: 8px; }
  .intro-location { display: none; }
  .split-name{font-size:8.5vw;transform:translateY(calc(-70px * var(--name-gap)));}.split-name span:first-child{transform:translateX(calc(-21vw * var(--name-gap))) scale(var(--name-scale));}.split-name span:last-child{transform:translateX(calc(21vw * var(--name-gap))) scale(var(--name-scale));}.brand-handoff{width:70vw;}
  .vr-world-preview{width:84%;top:54%;}.vr-world-preview h2{font-size:clamp(38px,11vw,52px);}.world-description{font-size:12px;}.world-eyebrow{font-size:7px;line-height:1.7;}.world-link{gap:24px;}
  .headset-position { padding: 0; }
  .eye-alignment i{width:22vw}.eye-alignment span{width:90%;margin-top:33vh;text-align:center;font-size:7px}.threshold-flash::before,.threshold-flash::after{width:60vw;height:60vw}
  .headset { width: 69vw; }
  .intro-description { left: 6%; right: 6%; bottom: 12%; align-items: start; gap: 12px; flex-direction: column; }
  .intro-description p { font-size: 30px; }
  .intro-description > span { font-size: 11px; }
  .intro-bottomline { left: 6%; right: 6%; bottom: 16px; flex-wrap: wrap; gap: 2px 12px; padding-top: 10px; font-size: 9px; }
  .world-entered .intro-bottomline { bottom: 16px; }
  .intro-index { display: none; }
  .intro-controls { gap: 16px; }
  .scroll-invitation { gap: 10px; }
  .reveal-signature { width: 76vw; top: 50%; }
  .reveal-eyebrow { width: 90vw; font-size: 8px; letter-spacing: .12em; white-space: normal; text-align: center; bottom: calc(100% + 28px); }
  .reveal-caption { font-size: 12px; }
  .fragment { width: 43vw; }
  .fragment-left { top: 64%; left: -8%; }
  .fragment-right { top: 68%; right: -8%; }
  .fragment figcaption { font-size: 8px; margin-top: 10px; }
  .fragment figcaption span { display: none; }
  .motion-reduced { height: auto; }
}
@media (min-width: 701px) and (max-width: 1100px) {
  .brand-handoff { width: clamp(210px,27vw,280px); }
  .vr-world-preview { width: min(760px,82%); }
}
@media (min-width: 701px) and (max-height: 900px) {
  .brand-handoff { width: clamp(220px,28vw,360px); }
  .vr-world-preview { top: 54%; width: min(760px,78%); }
  .world-eyebrow { margin-bottom: clamp(12px,2vh,22px); }
  .vr-world-preview h2 { font-size: clamp(48px,min(6vw,10.5vh),78px); line-height: .98; }
  .world-description { margin: clamp(14px,2.2vh,22px) auto; font-size: 13px; line-height: 1.55; }
  .world-link { gap: 36px; min-height: 44px; padding: 12px 22px; }
  .world-entered .intro-bottomline { bottom: 18px; }
}
@media (max-width: 380px) {
  .intro-topline { top: 16%; }
  .split-name { font-size: 8.5vw; }
  .headset { width: 62vw; }
  .intro-description { bottom: 12%; }
  .intro-description p { font-size: 26px; }
  .intro-bottomline { font-size: 8px; }
  .intro-controls { width: 100%; justify-content: space-between; gap: 8px; }
  .reveal-signature { width: 84vw; }
}
@media (max-height: 640px) and (min-width: 701px) {
  .vr-world-preview{top:53%;}.vr-world-preview h2{font-size:clamp(32px,4vw,54px);}.world-eyebrow{margin-bottom:16px;}.world-description{margin:18px auto;font-size:12px;}.world-link{padding:10px 20px;}.brand-handoff{width:clamp(210px,24vw,330px);}
  .intro-stage { min-height: 460px; }
  .intro-topline { top: 19%; }
  .intro-description { bottom: 18%; }
  .intro-description p { font-size: 28px; }
  .intro-bottomline { bottom: 12px; padding-top: 8px; }
  .world-entered .intro-bottomline { bottom: 10px; }
}
@media (max-height: 600px) and (max-width: 700px) {
  .intro-stage { min-height: 0; }
  .intro-topline { top: 25%; }
  .headset { width: 47vw; }
  .split-name { font-size: 8vw; }
  .intro-description { bottom: 23%; }
  .intro-description p { font-size: 22px; }
  .intro-description > span { display: none; }
  .fragment-left, .fragment-right { top: 62%; }
  .fragment { width: 26vw; }
  .reveal-signature { width: 62vw; gap: 10px; }
}
@media(prefers-reduced-motion:reduce){.brand-world::before{animation:none}}
</style>
