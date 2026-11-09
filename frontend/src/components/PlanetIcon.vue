<script setup>
// Ícone do planeta Miniverso (estilo "gema"): esfera lisa e brilhante no degradê da marca (ciano → azul → roxo), com
// faixas suaves de nuvens e um continente em tom claro passando devagar, sombra do lado da noite, contorno de
// atmosfera, anel fino que passa por trás e pela frente, e uma lua pequena em órbita.
defineProps({ animated: { type: Boolean, default: true }, moon: { type: Boolean, default: true } });
const uid = `pi${Math.random().toString(36).slice(2, 8)}`;
</script>

<template>
  <svg class="planet-icon" :class="{ still: !animated }" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <radialGradient :id="uid + 'b'" cx="34%" cy="28%" r="78%"><stop offset="0" stop-color="#c9f5ff" /><stop offset=".22" stop-color="#4fd2f2" /><stop offset=".52" stop-color="#1f7fd0" /><stop offset=".8" stop-color="#4b3fb0" /><stop offset="1" stop-color="#1e1645" /></radialGradient>
      <radialGradient :id="uid + 'n'" cx="78%" cy="80%" r="70%"><stop offset=".4" stop-color="#0a0f2e" stop-opacity="0" /><stop offset="1" stop-color="#0a0f2e" stop-opacity=".65" /></radialGradient>
      <radialGradient :id="uid + 'g'" cx="50%" cy="50%" r="50%"><stop offset=".6" stop-color="#3fc6ee" stop-opacity=".45" /><stop offset="1" stop-color="#6a4bd6" stop-opacity="0" /></radialGradient>
      <linearGradient :id="uid + 'r'" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9fe6f7" stop-opacity=".2" /><stop offset=".45" stop-color="#ffffff" /><stop offset="1" stop-color="#b9a8ff" stop-opacity=".3" /></linearGradient>
      <clipPath :id="uid + 'c'"><circle cx="32" cy="32" r="16.5" /></clipPath>
    </defs>
    <circle cx="32" cy="32" r="25" :fill="`url(#${uid}g)`" />
    <path d="M6.05 39.44 A27 7.4 -16 0 1 57.95 24.56" fill="none" :stroke="`url(#${uid}r)`" stroke-width="1.6" stroke-linecap="round" opacity=".5" />
    <g :clip-path="`url(#${uid}c)`">
      <circle cx="32" cy="32" r="16.5" :fill="`url(#${uid}b)`" />
      <g class="drift">
        <g v-for="dx in [0, 36]" :key="dx" :transform="`translate(${dx} 0)`">
          <path d="M14 22c4-3 9-3 12 0s1 6-3 7-6 4-9 2-3-6 0-9z" fill="#bff3ff" opacity=".22" />
          <path d="M30 37c3-2 7-1 9 1s0 5-3 5-5 0-6-2 0-3 0-4z" fill="#bff3ff" opacity=".18" />
          <path d="M8 30q12-3 24 0t24 0" fill="none" stroke="#fff" stroke-width="1.4" stroke-linecap="round" opacity=".28" />
          <path d="M10 41q10-2 20 0t22 0" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round" opacity=".2" />
        </g>
      </g>
      <circle cx="32" cy="32" r="16.5" :fill="`url(#${uid}n)`" />
      <ellipse cx="26" cy="24.5" rx="6.5" ry="3.6" fill="#fff" opacity=".42" transform="rotate(-32 26 24.5)" />
      <circle cx="23.5" cy="22.5" r="1.4" fill="#fff" opacity=".8" />
    </g>
    <circle cx="32" cy="32" r="16.8" fill="none" stroke="#bdf2ff" stroke-width=".8" opacity=".7" />
    <path d="M57.95 24.56 A27 7.4 -16 0 1 6.05 39.44" fill="none" :stroke="`url(#${uid}r)`" stroke-width="1.9" stroke-linecap="round" />
    <g v-if="moon" class="moon-orbit"><circle cx="32" cy="6.5" r="2.4" fill="#f4f7ff" /><circle cx="31.3" cy="5.9" r=".8" fill="#cdd6ea" /></g>
  </svg>
</template>

<style scoped>
.planet-icon{display:block;width:100%;height:100%;overflow:visible}
.drift{animation:drift 12s linear infinite}
@keyframes drift{to{transform:translateX(-36px)}}
.moon-orbit{transform-origin:32px 32px;animation:moon 8s linear infinite}
@keyframes moon{to{transform:rotate(360deg)}}
.still .drift,.still .moon-orbit{animation:none}
@media(prefers-reduced-motion:reduce){.drift,.moon-orbit{animation:none}}
</style>
