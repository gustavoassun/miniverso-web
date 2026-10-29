<template><aside class="line-sidebar" aria-label="Progresso da página"><span class="track"><i :style="{ height: `${progress}%` }" /></span><a v-for="(item,index) in items" :key="item.id" :href="`#${item.id}`" :class="{ active: active === item.id }"><b>0{{ index + 1 }}</b><span>{{ item.label }}</span></a></aside></template>
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
defineProps({ items: { type: Array, default: () => [] } });
const active=ref('sobre'); const progress=ref(0); let observer;
const update=()=>{const max=document.documentElement.scrollHeight-innerHeight;progress.value=max>0?Math.min(100,(scrollY/max)*100):0};
onMounted(()=>{const sections=document.querySelectorAll('[data-progress-section]');observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting)active.value=e.target.id}),{rootMargin:'-35% 0px -55%'});sections.forEach(s=>observer.observe(s));addEventListener('scroll',update,{passive:true});update()});
onUnmounted(()=>{observer?.disconnect();removeEventListener('scroll',update)});
</script>
<style scoped>.line-sidebar{position:fixed;z-index:12;right:18px;top:50%;display:grid;gap:9px;transform:translateY(-50%);padding-left:14px}.track{position:absolute;left:0;top:4px;bottom:4px;width:1px;background:#8dddf02c}.track i{display:block;width:1px;background:#9de8f6;box-shadow:0 0 9px #8ce5f4}.line-sidebar a{display:flex;align-items:center;gap:8px;min-height:28px;text-decoration:none;color:#80a4b6;opacity:.56}.line-sidebar b{font:8px var(--font-mono)}.line-sidebar a span{width:0;overflow:hidden;font:9px var(--font-mono);text-transform:uppercase;white-space:nowrap;transition:width .25s}.line-sidebar a:hover,.line-sidebar a.active{color:#d9f7ff;opacity:1}.line-sidebar a:hover span,.line-sidebar a.active span{width:65px}@media(max-width:900px){.line-sidebar{display:none}}
</style>
