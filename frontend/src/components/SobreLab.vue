<script setup>
// TESTE (só aparece com /?teste=...): outras ideias para o visual dos projetos na seção Sobre, todas no mesmo
// componente para comparar. Modos: solar, roda, constelacao, anel, cartas, esfera, imersiva.
// Mesmo funcionamento dos Portais em órbita: troca sozinho a cada poucos segundos, clicar num projeto leva ele para o
// destaque, o mouse em cima pausa e inclina a cena. Só anima enquanto está na tela.
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
const props = defineProps({ items: { type: Array, default: () => [] }, reduced: Boolean, mode: { type: String, default: 'solar' } });
const list = computed(() => props.items.slice(0, 8));
const N = computed(() => list.value.length);
// Barrinha de teste: troca de ideia na hora, sem recarregar (a galáxia é outro componente, então recarrega).
const MODES = [['oculos', 'Óculos'], ['solar', 'Sistema solar'], ['roda', 'Roda'], ['constelacao', 'Constelação'], ['anel', 'Planeta com anel'], ['cartas', 'Cartas'], ['esfera', 'Esfera'], ['imersiva', 'Tela imersiva']];
const mode = ref(props.mode);
function setMode(m) { mode.value = m; cur = active.value; history.replaceState(history.state, '', '?teste=' + m); layout(); }
const active = ref(0);
const current = computed(() => list.value[active.value] || {});
const root = ref(null);
const pos = ref({});
const svg = ref({ orbits: [], edges: [], back: '', front: '', pulse: null, floor: null, wire: null });
const tilt = ref({ x: 0, y: 0 });
const hasCore = computed(() => mode.value === 'anel' || mode.value === 'esfera' || mode.value === 'oculos');
let raf = 0, timer = 0, io, ro, visible = false, hover = false, last = 0, t = 0, cur = 0, W = 560, pulseAt = 0, from = 0;
const CYCLE = 5200, TAU = Math.PI * 2;

const wrap = d => { const n = N.value; return ((d % n) + n + n / 2) % n - n / 2; };
const S = (x, y, d, z, o = 1, extra = '', lit = 0) => ({ width: d.toFixed(1) + 'px', transform: `translate(calc(${x.toFixed(1)}px - 50%), calc(${y.toFixed(1)}px - 50%)) ${extra}`, zIndex: z, opacity: (+o).toFixed(2), '--lit': (+lit).toFixed(2) });
// Constelação: posições fixas (fração da largura/altura a partir do centro) e ligações.
const STARS = [[-.38, -.08], [-.2, -.32], [-.02, -.06], [.2, -.3], [.38, .02], [.18, .26], [-.16, .24], [.0, .38]];
const LINKS = [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 0], [2, 5], [1, 6], [6, 7], [7, 5]];

function layout() {
  const n = N.value, H = W * (mode.value === 'oculos' ? 0.96 : 0.82), out = {}, a = active.value, m = mode.value, s = { orbits: [], edges: [], back: '', front: '', pulse: null, floor: null, wire: null, cx: W / 2, cy: H / 2 };
  if (m === 'solar') {
    list.value.forEach((p, i) => {
      const rx = W * (0.19 + i * 0.047), ry = rx * 0.36, an = i * 1.7 + t * (0.5 / (1 + i * 0.4)), sn = Math.sin(an), dep = (sn + 1) / 2, on = i === a;
      s.orbits.push({ rx, ry, on });
      out[p.id] = S(Math.cos(an) * rx, sn * ry, W * 0.1 * (0.7 + 0.4 * dep) * (on ? 1.6 : 1), sn > 0 ? 60 + i : 20 + i, 0.5 + 0.5 * dep, '', on ? 1 : dep * 0.5);
    });
  } else if (m === 'roda') {
    cur += wrap(a - cur) * 0.07;
    const R = W * 0.36;
    list.value.forEach((p, i) => {
      const th = (i - cur) / n * TAU, dep = (Math.cos(th) + 1) / 2, sc = 0.3 + 0.7 * Math.pow(dep, 1.6);
      out[p.id] = S(Math.sin(th) * R, -H * 0.05 - (1 - dep) * H * 0.07, W * 0.36 * sc, Math.round(dep * 100), 0.3 + 0.7 * dep, '', dep > 0.95 ? 1 : 0);
    });
    s.floor = { rx: R * 1.05, ry: H * 0.07, cy: H * 0.24 };
  } else if (m === 'constelacao') {
    const P = STARS.slice(0, n).map(([x, y], i) => [x * W + Math.sin(t * 0.6 + i * 1.3) * 5, y * H + Math.cos(t * 0.5 + i) * 4]);
    list.value.forEach((p, i) => { const on = i === a; out[p.id] = S(P[i][0], P[i][1], on ? W * 0.21 : W * 0.1, on ? 60 : 30, on ? 1 : 0.85, '', on ? 1 : 0); });
    s.edges = LINKS.filter(([i, j]) => i < n && j < n).map(([i, j]) => ({ x1: P[i][0], y1: P[i][1], x2: P[j][0], y2: P[j][1], hot: i === a || j === a }));
    const k = Math.min(1, (performance.now() - pulseAt) / 900), e = 1 - Math.pow(1 - k, 3), A = P[from] || P[a], B = P[a];
    if (k < 1) s.pulse = { x: A[0] + (B[0] - A[0]) * e, y: A[1] + (B[1] - A[1]) * e };
  } else if (m === 'anel') {
    const others = list.value.map((p, i) => ({ p, i })).filter(o => o.i !== a), rx = W * 0.47, ry = W * 0.12, tl = (-12 * Math.PI) / 180;
    const pt = an => { const ex = Math.cos(an) * rx, ey = Math.sin(an) * ry; return [ex * Math.cos(tl) - ey * Math.sin(tl), ex * Math.sin(tl) + ey * Math.cos(tl)]; };
    others.forEach((o, k) => { const an = t * 0.18 + k / others.length * TAU, [x, y] = pt(an), dep = Math.sin(an); out[o.p.id] = S(x, y, W * 0.13 * (0.8 + 0.2 * dep), dep > 0 ? 60 : 30, 0.55 + 0.45 * dep, '', Math.max(0, dep)); });
    out[list.value[a]?.id] = S(0, 0, W * 0.1, 1, 0);
    const arc = (a0, a1) => Array.from({ length: 41 }, (_, k) => pt(a0 + (a1 - a0) * k / 40).map(v => v.toFixed(1)).join(',')).join(' ');
    s.front = arc(0, Math.PI); s.back = arc(Math.PI, TAU);
  } else if (m === 'cartas') {
    cur += wrap(a - cur) * 0.09;
    list.value.forEach((p, i) => {
      const off = wrap(i - cur), ab = Math.abs(off);
      out[p.id] = S(off * W * 0.15, ab * H * 0.035, W * 0.3, 100 - Math.round(ab * 10), ab > 3.2 ? 0 : 1 - ab * 0.17, `rotateY(${(-off * 16).toFixed(1)}deg) rotateZ(${(off * 4).toFixed(1)}deg) scale(${(1 - Math.min(ab, 3) * 0.12).toFixed(3)})`, ab < 0.3 ? 1 : 0);
    });
  } else if (m === 'esfera') {
    const others = list.value.map((p, i) => ({ p, i })).filter(o => o.i !== a), k = others.length, R = W * 0.36;
    const ry = t * 0.32 + tilt.value.x * 0.6, rxx = 0.35 + tilt.value.y * 0.3;
    others.forEach((o, j) => {
      const yy = 1 - (j + 0.5) / k * 2, rr = Math.sqrt(1 - yy * yy), ph = j * 2.399963;
      let x = Math.cos(ph) * rr, z = Math.sin(ph) * rr, y = yy;
      [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
      [y, z] = [y * Math.cos(rxx) - z * Math.sin(rxx), y * Math.sin(rxx) + z * Math.cos(rxx)];
      const dep = (z + 1) / 2;
      out[o.p.id] = S(x * R, y * R * 0.92, W * 0.105 * (0.72 + 0.4 * dep), z > 0 ? 60 : 30, 0.4 + 0.6 * dep, '', Math.max(0, z));
    });
    out[list.value[a]?.id] = S(0, 0, W * 0.1, 1, 0);
    s.wire = { r: R, eq: R * Math.abs(Math.sin(rxx)) * 0.92, mer: R * Math.abs(Math.sin(ry)) };
  } else if (m === 'oculos') {
    // O óculos projeta o mundo da vez num holograma acima dele; os outros projetos giram em volta do holograma.
    const others = list.value.map((p, i) => ({ p, i })).filter(o => o.i !== a), rx = W * 0.47, ry = W * 0.11, cy = H * (0.31 - 0.5), tl = (-8 * Math.PI) / 180;
    others.forEach((o, k) => {
      const an = t * 0.17 + k / others.length * TAU, ex = Math.cos(an) * rx, ey = Math.sin(an) * ry, dep = Math.sin(an);
      out[o.p.id] = S(ex * Math.cos(tl) - ey * Math.sin(tl), cy + ex * Math.sin(tl) + ey * Math.cos(tl), W * 0.1 * (0.78 + 0.22 * dep), dep > 0 ? 60 : 20, 0.5 + 0.5 * dep, '', Math.max(0, dep));
    });
    out[list.value[a]?.id] = S(0, cy, W * 0.1, 1, 0);
    const arc = (a0, a1) => Array.from({ length: 41 }, (_, k) => { const an = a0 + (a1 - a0) * k / 40, ex = Math.cos(an) * rx, ey = Math.sin(an) * ry; return [(ex * Math.cos(tl) - ey * Math.sin(tl)).toFixed(1), (cy + ex * Math.sin(tl) + ey * Math.cos(tl)).toFixed(1)].join(','); }).join(' ');
    s.front = arc(0, Math.PI); s.back = arc(Math.PI, TAU);
    drawMotes(H);
  } else if (m === 'imersiva') {
    list.value.forEach((p, i) => { const on = i === a; out[p.id] = S((i - (n - 1) / 2) * W * 0.105, H * 0.39, W * 0.08 * (on ? 1.18 : 1), 60, on ? 1 : 0.7, '', on ? 1 : 0); });
  }
  pos.value = out; svg.value = s;
}
// Óculos: partículas de luz subindo do visor até o holograma (canvas pequeno, ~90 pontos).
const motes = ref(null);
let mctx = null, mw = 0, mh = 0, pts = [];
function drawMotes(H) {
  const cv = motes.value; if (!cv) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  if (mw !== W || mh !== H) { mw = W; mh = H; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); mctx = cv.getContext('2d'); mctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  if (!pts.length) pts = Array.from({ length: 90 }, () => ({ k: Math.random(), x: Math.random() - 0.5, sp: 0.18 + Math.random() * 0.3, s: 0.6 + Math.random() * 1.8 }));
  const c = mctx, x0 = W / 2, yA = H * 0.67, yB = H * 0.36, boost = Math.max(0, 1 - (performance.now() - pulseAt) / 1200);
  c.clearRect(0, 0, W, H);
  for (const p of pts) {
    p.k = (p.k + p.sp * 0.016 * (1 + boost * 3)) % 1;
    const y = yA + (yB - yA) * p.k, spread = W * (0.06 + 0.17 * p.k), a = Math.sin(p.k * Math.PI);
    c.fillStyle = `rgba(${p.x > 0 ? '150,230,255' : '180,160,255'},${(0.25 + 0.6 * a) * (0.7 + boost * 0.3)})`;
    c.beginPath(); c.arc(x0 + p.x * spread * 2, y, p.s, 0, TAU); c.fill();
  }
}
function loop(now) {
  raf = 0; if (!visible || document.hidden) return;
  const dt = props.reduced ? 0 : Math.min(0.05, (now - (last || now)) / 1000); last = now; t += dt; layout();
  if (!props.reduced) raf = requestAnimationFrame(loop);
}
function kick() { if (!raf && visible) { last = 0; raf = requestAnimationFrame(loop); } }
function cycle() { clearTimeout(timer); if (props.reduced || !visible || hover || N.value < 2) return; timer = setTimeout(() => { go((active.value + 1) % N.value); cycle(); }, CYCLE); }
function go(i) { from = active.value; pulseAt = performance.now(); active.value = i; if (props.reduced) layout(); }
function pick(i) { if (i === active.value) return; go(i); cycle(); }
function move(e) {
  if (e.pointerType !== 'mouse') return;
  const b = root.value.getBoundingClientRect();
  tilt.value = { x: ((e.clientX - b.left) / b.width - 0.5) * 2, y: ((e.clientY - b.top) / b.height - 0.5) * 2 };
}
function enter() { hover = true; clearTimeout(timer); }
function leave() { hover = false; tilt.value = { x: 0, y: 0 }; cycle(); }
watch(() => N.value, () => { if (active.value >= N.value) active.value = 0; layout(); });
onMounted(() => {
  ro = new ResizeObserver(() => { W = root.value.clientWidth; layout(); }); ro.observe(root.value);
  io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; kick(); cycle(); }); io.observe(root.value);
  document.addEventListener('visibilitychange', kick);
});
onUnmounted(() => { cancelAnimationFrame(raf); clearTimeout(timer); ro?.disconnect(); io?.disconnect(); document.removeEventListener('visibilitychange', kick); });
</script>

<template>
  <div ref="root" class="sobre-lab" :class="'m-' + mode" @pointermove="move" @pointerenter="enter" @pointerleave="leave">
    <div class="sl-halo" aria-hidden="true" />
    <div class="sl-scene" :style="mode === 'esfera' ? null : { transform: `rotateX(${(-tilt.y * 6).toFixed(2)}deg) rotateY(${(tilt.x * 8).toFixed(2)}deg)` }">
      <!-- Linhas (órbitas, constelação, anel de trás, chão da roda, arame da esfera) -->
      <svg class="sl-lines back" aria-hidden="true">
        <g :transform="`translate(${svg.cx} ${svg.cy})`">
          <ellipse v-for="(o, i) in svg.orbits" :key="'o' + i" :cy="o.cy || 0" :rx="o.rx" :ry="o.ry" fill="none" :stroke="o.on ? '#7fe4ff' : '#5b7bd6'" :stroke-opacity="o.on ? .75 : .28" stroke-dasharray="2 5" />
          <line v-for="(e, i) in svg.edges" :key="'e' + i" :x1="e.x1" :y1="e.y1" :x2="e.x2" :y2="e.y2" :stroke="e.hot ? '#7fe4ff' : '#5b7bd6'" :stroke-opacity="e.hot ? .75 : .22" :stroke-width="e.hot ? 1.6 : 1" stroke-linecap="round" />
          <circle v-if="svg.pulse" :cx="svg.pulse.x" :cy="svg.pulse.y" r="4" fill="#bff3ff" class="pulse" />
          <polyline v-if="svg.back" :points="svg.back" fill="none" stroke="#8ee1f2" stroke-opacity=".35" stroke-width="1.2" />
          <ellipse v-if="svg.floor" cx="0" :cy="svg.floor.cy" :rx="svg.floor.rx" :ry="svg.floor.ry" fill="url(#slFloor)" />
          <g v-if="svg.wire" fill="none" stroke="#5b7bd6" stroke-opacity=".3">
            <circle :r="svg.wire.r" /><ellipse :rx="svg.wire.r" :ry="svg.wire.eq" /><ellipse :rx="svg.wire.mer" :ry="svg.wire.r * .92" />
          </g>
          <defs><radialGradient id="slFloor"><stop offset="0" stop-color="#3fd0ef" stop-opacity=".22" /><stop offset="1" stop-color="#3fd0ef" stop-opacity="0" /></radialGradient></defs>
        </g>
      </svg>

      <!-- Sol (sistema solar) -->
      <div v-if="mode === 'solar'" class="sun"><img src="/images/miniverso-logo.png" alt="Miniverso" width="1024" height="236"></div>

      <!-- Óculos Miniverso: "mini" [óculos] "verso", com o projeto da vez no visor -->
      <template v-if="mode === 'oculos'">
        <!-- feixe de luz do visor até o holograma -->
        <span :key="'beam' + active" class="vr-beam" aria-hidden="true" />
        <canvas ref="motes" class="vr-motes" aria-hidden="true" />
        <!-- holograma: o mundo da vez projetado pelo óculos -->
        <div class="holo">
          <span class="holo-ring" aria-hidden="true" />
          <span class="holo-ring r2" aria-hidden="true" />
          <div class="holo-lens">
            <TransitionGroup name="warp"><img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" loading="lazy"></TransitionGroup>
            <span class="holo-lines" aria-hidden="true" />
            <span :key="'scan' + active" class="vr-scan" aria-hidden="true" />
          </div>
          <span class="holo-tag" aria-hidden="true">{{ String(active + 1).padStart(2, '0') }} / {{ String(list.length).padStart(2, '0') }}</span>
        </div>
        <!-- mini [óculos] verso -->
        <div class="vr-wrap">
          <span class="vr-word">mini</span>
          <div class="vr">
            <span class="vr-strap" aria-hidden="true" />
            <div class="vr-body">
              <span class="vr-seam" aria-hidden="true" />
              <img class="vr-logo" src="/images/miniverso-logo.png" alt="" width="1024" height="236">
              <div class="vr-visor">
                <TransitionGroup name="warp"><img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" alt="" width="800" height="800" loading="lazy"></TransitionGroup>
                <span class="vr-glare" aria-hidden="true" />
                <span class="vr-leds" aria-hidden="true"><i /><i /><i /></span>
              </div>
              <span class="vr-nose" aria-hidden="true" />
            </div>
          </div>
          <span class="vr-word">verso</span>
        </div>
        <span class="vr-shadow" aria-hidden="true" />
      </template>

      <!-- Portal central (anel e esfera) -->
      <div v-if="hasCore && mode !== 'oculos'" class="core">
        <span class="core-ring" aria-hidden="true" />
        <div class="core-lens">
          <TransitionGroup name="warp"><img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" loading="lazy"></TransitionGroup>
          <span class="core-glass" aria-hidden="true" />
        </div>
      </div>

      <!-- Tela imersiva -->
      <div v-if="mode === 'imersiva'" class="screen">
        <TransitionGroup name="warp"><img v-for="(p, i) in list" v-show="i === active" :key="p.id" :src="p.url_imagem" :alt="i === active ? 'Cena do projeto ' + p.titulo : ''" width="800" height="800" loading="lazy"></TransitionGroup>
        <span class="screen-shade" aria-hidden="true" />
      </div>

      <!-- Projetos -->
      <button v-for="(p, i) in list" :key="p.id" type="button" class="node" :class="{ on: i === active, card: mode === 'cartas' }" :style="pos[p.id]" :aria-label="'Ver ' + p.titulo" :tabindex="hasCore && i === active ? -1 : 0" @click="pick(i)">
        <img :src="p.url_imagem" alt="" width="200" height="200" loading="lazy">
        <span v-if="mode !== 'imersiva'" class="node-name">{{ p.titulo.split(':')[0] }}</span>
      </button>

      <!-- Anel da frente (passa na frente do planeta) -->
      <svg v-if="svg.front" class="sl-lines front" aria-hidden="true">
        <g :transform="`translate(${svg.cx} ${svg.cy})`"><polyline :points="svg.front" fill="none" stroke="#8ee1f2" stroke-opacity=".6" stroke-width="1.6" /></g>
      </svg>
    </div>

    <div class="op-caption" aria-live="polite">
      <span>Agora você está em</span>
      <Transition name="swap" mode="out-in"><b :key="current.id">{{ current.titulo }}</b></Transition>
      <router-link v-if="current.id" :to="'/projetos/' + current.id" class="op-link">Explorar este mundo <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></router-link>
    </div>

    <!-- Só no teste: troca rápida entre as ideias -->
    <nav class="lab-bar" aria-label="Ideias em teste">
      <b>Teste</b>
      <button v-for="[id, nome] in MODES" :key="id" type="button" :class="{ on: mode === id }" @click="setMode(id)">{{ nome }}</button>
      <a href="/?teste=galaxia">Galáxia</a>
      <a href="/?teste=portais">Portais (antigo)</a><a href="/">Site (anel)</a>
    </nav>
  </div>
</template>

<style scoped>
.sobre-lab{position:relative;width:112%;max-width:680px;margin-inline:-6%;perspective:1100px}
.sl-halo{position:absolute;left:10%;right:10%;top:4%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle,#00b7e32e,#4b3fb024 45%,transparent 70%);filter:blur(30px);pointer-events:none}
.sl-scene{position:relative;aspect-ratio:1/.82;transform-style:preserve-3d;transition:transform .8s cubic-bezier(.2,.8,.2,1)}
.sl-lines{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1}
.sl-lines.front{z-index:55}
.pulse{filter:drop-shadow(0 0 6px #3fd0ef)}
/* Projetos */
.node{--lit:0;position:absolute;left:50%;top:50%;aspect-ratio:1;padding:0;border:0;border-radius:50%;background:#0a1024;cursor:pointer;will-change:transform;transition:width .5s cubic-bezier(.2,.8,.2,1)}
.node img{width:100%;height:100%;border-radius:inherit;object-fit:cover;box-shadow:0 0 0 1.5px rgb(142 225 242 / calc(.28 + var(--lit) * .6)),0 10px 24px #0009,0 0 calc(var(--lit) * 30px) #00b7e3aa;filter:saturate(calc(.65 + var(--lit) * .45)) brightness(calc(.75 + var(--lit) * .3))}
.node:hover img,.node:focus-visible img{box-shadow:0 0 0 2px #fff,0 10px 24px #0009,0 0 30px #00b7e3}
.node-name{position:absolute;left:50%;top:calc(100% + 8px);transform:translateX(-50%);padding:5px 10px;border-radius:99px;background:#070b1acc;color:#e6f6fb;font:600 12px var(--font-body);white-space:nowrap;opacity:0;transition:opacity .25s;pointer-events:none}
.node:hover .node-name,.node:focus-visible .node-name{opacity:1}
.m-solar .node.on .node-name{opacity:1}
.node.card{aspect-ratio:3/4;border-radius:16px;transition:none}
.node.card img{border-radius:16px}
.m-cartas .sl-scene{transform-style:preserve-3d}
/* Sol */
.sun{position:absolute;left:50%;top:50%;width:17%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;z-index:40;display:grid;place-items:center;background:radial-gradient(circle at 36% 32%,#d9f7ff,#3fd0ef 28%,#2f6bff 60%,#5a3cd6);box-shadow:0 0 50px #3fd0ef88,0 0 120px #2f6bff55}
.sun img{width:74%;height:auto;filter:drop-shadow(0 1px 4px #06102a99)}
/* Portal central */
.core{position:absolute;left:50%;top:50%;z-index:45;aspect-ratio:1;transform:translate(-50%,-50%)}
.m-anel .core{width:40%}.m-esfera .core{width:28%}
.core-ring{position:absolute;inset:-7%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 40%,#00b7e3 62%,#8ee1f2 70%,#8f6bff 82%,transparent 95%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 10px #00b7e3);animation:spin 8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.core-lens{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:#0a1024;box-shadow:0 0 0 1px #ffffff26,0 30px 70px #0009,0 0 60px #00b7e333}
.core-lens img,.screen img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover}
.core-glass{position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 30% 22%,#ffffff40,transparent 38%),radial-gradient(circle at 50% 50%,transparent 55%,#070b1a99 100%)}
/* Tela imersiva */
.screen{position:absolute;inset:2% 0 16%;border-radius:26px;overflow:hidden;z-index:2;background:#0a1024;box-shadow:0 0 0 1px #8ee1f233,0 30px 80px #000a,0 0 80px #2f6bff33}
.screen img{animation:kb 14s ease-in-out infinite alternate}
@keyframes kb{to{transform:scale(1.08) translate(-2%,-1%)}}
.screen-shade{position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,#070b1acc),radial-gradient(ellipse at 50% 40%,transparent 50%,#070b1a88)}
.warp-enter-active{transition:opacity 1s .2s ease,filter 1.1s .15s cubic-bezier(.2,.8,.2,1),scale 1.2s .15s cubic-bezier(.2,.8,.2,1)}
.warp-leave-active{transition:opacity .7s ease,filter .7s ease,scale .8s cubic-bezier(.6,0,.8,.4)}
.warp-enter-from{opacity:0;filter:blur(10px) brightness(1.5);scale:.88}
.warp-leave-to{opacity:0;filter:blur(12px) brightness(1.7);scale:1.25}
/* Legenda */
.op-caption{display:grid;justify-items:center;gap:6px;margin-top:-2%;text-align:center;position:relative;z-index:5}
.op-caption>span{color:#8fa9b8;font-size:13px;font-weight:600;letter-spacing:.14em;text-transform:uppercase}
.op-caption b{font-family:var(--font-title);font-size:clamp(30px,3vw,40px);font-weight:500;line-height:1.05;letter-spacing:.01em}
.op-link{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:10px 18px;border:1px solid #ffffff26;border-radius:99px;color:#fff;font-size:14px;font-weight:700;text-decoration:none;transition:.25s}
.op-link:hover{border-color:#00b7e3;background:#00b7e31f}
.op-link svg{width:16px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .25s}
.op-link:hover svg{transform:translateX(3px)}
.swap-enter-active,.swap-leave-active{transition:opacity .35s,transform .35s}
.swap-enter-from{opacity:0;transform:translateY(8px)}.swap-leave-to{opacity:0;transform:translateY(-8px)}
/* Óculos Miniverso */
.m-oculos .sl-scene{aspect-ratio:1/.96}
.m-oculos .sl-halo{top:-2%}
/* holograma */
.holo{position:absolute;left:50%;top:31%;width:40%;aspect-ratio:1;transform:translate(-50%,-50%);z-index:40;animation:float 7s ease-in-out infinite}
@keyframes float{50%{transform:translate(-50%,calc(-50% - 6px))}}
.holo-ring{position:absolute;inset:-9%;border-radius:50%;background:conic-gradient(from 0deg,transparent 0 30%,#00b7e3 55%,#bff3ff 64%,#8f6bff 78%,transparent 92%);-webkit-mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));mask:radial-gradient(closest-side,transparent calc(100% - 3px),#000 calc(100% - 2px));filter:drop-shadow(0 0 10px #00b7e3);animation:spin 9s linear infinite}
.holo-ring.r2{inset:-16%;opacity:.45;animation-duration:16s;animation-direction:reverse;background:repeating-conic-gradient(#8ee1f2 0 2deg,transparent 2deg 9deg)}
.holo-lens{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:#06122a;box-shadow:0 0 0 1px #bff3ff55,0 0 60px #3fd0ef66,inset 0 0 40px #3fd0ef55}
.holo-lens img{position:absolute;inset:-4%;width:108%;height:108%;object-fit:cover;filter:saturate(1.1) brightness(1.05)}
.holo-lines{position:absolute;inset:0;background:repeating-linear-gradient(180deg,#bff3ff14 0 1px,transparent 1px 4px),radial-gradient(circle,transparent 52%,#06122acc 100%);mix-blend-mode:screen;pointer-events:none}
.holo-tag{position:absolute;left:50%;top:calc(100% + 16%);transform:translateX(-50%);font:600 11px var(--font-body);letter-spacing:.24em;color:#8ee1f2;opacity:.8}
.vr-scan{position:absolute;left:0;right:0;top:0;height:30%;background:linear-gradient(180deg,transparent,#bff3ff66,transparent);animation:scan 1.1s .15s cubic-bezier(.4,0,.2,1) both;pointer-events:none}
@keyframes scan{from{transform:translateY(-100%)}to{transform:translateY(340%);opacity:0}}
/* feixe e partículas */
.vr-beam{position:absolute;left:50%;top:34%;width:46%;height:36%;transform:translateX(-50%);z-index:30;pointer-events:none;clip-path:polygon(0 0,100% 0,62% 100%,38% 100%);background:linear-gradient(0deg,#3fd0ef66,#3fd0ef10 70%,transparent);filter:blur(1px);animation:beam 4s ease-in-out infinite, beamIn .9s ease-out both}
@keyframes beam{50%{opacity:.7}}
@keyframes beamIn{from{opacity:0;transform:translateX(-50%) scaleY(.2);transform-origin:bottom}}
.vr-motes{position:absolute;inset:0;width:100%;height:100%;z-index:35;pointer-events:none}
/* mini [óculos] verso */
.vr-wrap{position:absolute;left:50%;top:76%;z-index:50;display:flex;align-items:center;justify-content:center;gap:3%;width:100%;transform:translate(-50%,-50%);pointer-events:none}
.vr-word{font:700 clamp(26px,5vw,52px)/1 var(--font-display,var(--font-title));letter-spacing:-.03em;background:linear-gradient(180deg,#ffffff,#9fdcf0);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 0 18px #3fd0ef44)}
.vr{position:relative;width:46%;aspect-ratio:2.05/1;flex:none;transform:perspective(600px) rotateX(10deg)}
.vr-strap{position:absolute;left:-8%;right:-8%;top:30%;height:26%;border-radius:14px;background:linear-gradient(180deg,#2f3647,#141824 70%);box-shadow:inset 0 1px 0 #ffffff22,0 6px 14px #0008;z-index:-1}
.vr-strap::before,.vr-strap::after{content:'';position:absolute;top:18%;bottom:18%;width:5%;border-radius:4px;background:#0c0f17}
.vr-strap::before{left:3%}.vr-strap::after{right:3%}
.vr-body{position:absolute;inset:0;border-radius:30% / 48%;background:radial-gradient(120% 90% at 30% 0%,#56607a,transparent 55%),linear-gradient(180deg,#3a4256,#1c2130 52%,#0e1119);box-shadow:inset 0 2px 0 #ffffff33,inset 0 -8px 16px #000a,inset 0 0 0 1px #ffffff14,0 26px 50px #000c;padding:9% 7% 8%}
.vr-seam{position:absolute;left:12%;right:12%;top:5%;height:1px;background:linear-gradient(90deg,transparent,#ffffff40,transparent)}
.vr-logo{position:absolute;left:50%;top:1.5%;width:18%;height:auto;transform:translateX(-50%);opacity:.55}
.vr-visor{position:relative;width:100%;height:100%;overflow:hidden;border-radius:26% / 46%;background:#04060d;box-shadow:0 0 0 2px #3fd0ef,0 0 16px #3fd0efcc,inset 0 0 22px #3fd0ef55;animation:visor 3.2s ease-in-out infinite}
@keyframes visor{50%{box-shadow:0 0 0 2px #9beeff,0 0 28px #3fd0ef,inset 0 0 30px #3fd0ef88}}
.vr-visor img{position:absolute;inset:-6%;width:112%;height:112%;object-fit:cover;opacity:.35;filter:blur(1px) saturate(1.2)}
.vr-glare{position:absolute;inset:0;background:linear-gradient(112deg,#ffffff40 0 14%,transparent 30%),linear-gradient(112deg,transparent 0 40%,#ffffff12 44%,transparent 50%),radial-gradient(ellipse at 50% 130%,#3fd0ef55,transparent 60%);pointer-events:none}
.vr-leds{position:absolute;right:9%;top:16%;display:flex;gap:4px}
.vr-leds i{width:4px;height:4px;border-radius:50%;background:#7fe4ff;box-shadow:0 0 6px #3fd0ef;animation:led 2.4s ease-in-out infinite}
.vr-leds i:nth-child(2){animation-delay:.3s}.vr-leds i:nth-child(3){animation-delay:.6s}
@keyframes led{50%{opacity:.25}}
.vr-nose{position:absolute;left:50%;bottom:-1px;width:20%;height:26%;transform:translateX(-50%);border-radius:50% 50% 0 0 / 80% 80% 0 0;background:#090b12;box-shadow:inset 0 3px 6px #000a}
.vr-shadow{position:absolute;left:50%;top:90%;width:38%;height:5%;transform:translateX(-50%);border-radius:50%;background:radial-gradient(closest-side,#3fd0ef33,transparent);z-index:2}
.lab-bar{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:6px;margin-top:18px;padding:8px 10px;border:1px dashed #8ee1f244;border-radius:16px;background:#070b1a99;position:relative;z-index:5}
.lab-bar b{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#ffb86b;margin-right:4px}
.lab-bar button,.lab-bar a{padding:5px 11px;border:1px solid #ffffff1f;border-radius:99px;background:none;color:#cfe3ee;font:600 12px var(--font-body);text-decoration:none;cursor:pointer}
.lab-bar button:hover,.lab-bar a:hover{border-color:#00b7e3}
.lab-bar .on{background:#bfefff;color:#06102a;border-color:#bfefff}
@media(prefers-reduced-motion:reduce){.core-ring,.screen img,.holo,.holo-ring,.vr-beam,.vr-visor,.vr-scan,.vr-leds i{animation:none}}
@media(max-width:1000px){.sobre-lab{width:100%;margin-inline:auto}}
@media(max-width:700px){.op-caption b{font-size:28px}}
</style>
