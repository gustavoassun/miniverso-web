<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
const props=defineProps({enabled:Boolean,reduced:Boolean});
const nearEdge=ref(false);
function proximity(event){if(!props.enabled||event.pointerType!=='mouse')return;nearEdge.value=event.clientX<60||event.clientX>innerWidth-60;}
function leave(){nearEdge.value=false;}
onMounted(()=>{window.addEventListener('pointermove',proximity,{passive:true});document.documentElement.addEventListener('pointerleave',leave);});
onUnmounted(()=>{window.removeEventListener('pointermove',proximity);document.documentElement.removeEventListener('pointerleave',leave);});
const pixels=Array.from({length:24},(_,i)=>({x:10+(i*19)%75,y:8+(i*31)%86,size:i%5===0?5:2,delay:-(i*.73)}));
</script>
<template><div class="pixel-edges" :class="{visible:enabled,reduced,'near-edge':nearEdge}" aria-hidden="true"><div v-for="side in ['left','right']" :key="side" class="pixel-bank" :class="side"><svg viewBox="0 0 100 800" preserveAspectRatio="none"><path d="M9 65V20H44 M9 98V162L28 182V260 M9 295V365L34 390V485 M9 510V610L25 630V725 M9 750V780H44"/><path class="secondary" d="M18 120V154L37 174V235 M18 330V355L43 380V455 M18 580V605L34 623V698"/><path class="connectors" d="M9 80H47L70 100 M9 280H40L61 259 M9 495H39L69 515 M9 738H41L65 718"/></svg><i v-for="(pixel,i) in pixels" :key="i" :style="{'--x':pixel.x+'%','--y':pixel.y+'%','--size':pixel.size+'px','--delay':pixel.delay+'s'}"/><span class="edge-bars"/><span class="edge-code">XR / 01</span></div></div></template>
<style scoped>
.pixel-edges{position:fixed;inset:0;z-index:4;pointer-events:none;opacity:0;transition:opacity 1.2s;}.visible{opacity:1;}.pixel-bank{position:absolute;top:12%;bottom:14%;width:clamp(12px,1.8vw,28px);color:#7ebbd2;}.left{left:0;}.right{right:0;transform:scaleX(-1);}.pixel-bank svg{height:100%;width:100%;fill:none;stroke:currentColor;stroke-width:.65;opacity:.32;}.secondary{stroke-opacity:.35;}.connectors{stroke-opacity:.5;}.pixel-bank i{position:absolute;left:var(--x);top:var(--y);width:var(--size);height:var(--size);background:#9cdef1;opacity:.16;box-shadow:0 0 6px #5fc1e34d;animation:pixel-drift 8s ease-in-out infinite;animation-delay:var(--delay);}.edge-bars{position:absolute;left:9%;top:45%;height:22px;width:3px;background:repeating-linear-gradient(0deg,#89cde399 0 2px,transparent 2px 5px);}.edge-code{position:absolute;left:24%;bottom:0;writing-mode:vertical-rl;color:#81b8ce66;font:6px monospace;letter-spacing:.16em;}.reduced i{animation:none;}.reduced{transition:none;}@keyframes pixel-drift{0%,100%{opacity:.12;transform:translateY(0);}50%{opacity:.55;transform:translateY(-5px);}}@media(max-width:700px){.pixel-bank{width:9px;opacity:.45;}.pixel-bank i:nth-child(n+7),.edge-code,.edge-bars{display:none;}}
</style>
<style scoped>
.pixel-bank svg{animation:circuit-breathe 9s ease-in-out infinite;}.right svg{animation-delay:-4.5s;}.edge-bars{animation:circuit-breathe 6s ease-in-out infinite;}.near-edge .pixel-bank{filter:drop-shadow(0 0 4px #86d7ef66);}.near-edge .pixel-bank svg{stroke:#b8e9f6;}.pixel-bank{transition:filter .5s;}.reduced svg,.reduced .edge-bars{animation:none;}.reduced .pixel-bank{transition:none;}@keyframes circuit-breathe{0%,100%{opacity:.22;}50%{opacity:.55;}}
</style>
