<template>
  <div class="app-shell" :class="{ 'immersive-shell': isHome, 'admin-shell': isDashboard, 'portal-shell': isLogin }">
    <header class="app-header">
      <nav aria-label="Navegação principal" class="navbar">
        <router-link class="brand" to="/" aria-label="Miniverso — início" @click="menuOpen = false"><img src="/images/miniverso-logo.png" alt="Miniverso" width="1024" height="236" /></router-link>
        <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="navigation-links" @click="menuOpen = !menuOpen">{{ menuOpen ? 'Fechar' : 'Menu' }}</button>
        <ul id="navigation-links" class="nav-links" :class="{ 'menu-open': menuOpen }">
          <li><router-link :to="{ path: '/', hash: '#sobre' }" @click="menuOpen = false">O estúdio</router-link></li>
          <li><router-link :to="{ path: '/', hash: '#portfolio' }" @click="menuOpen = false">Projetos</router-link></li>
          <li><router-link class="restricted-link" to="/login" @click="menuOpen = false">Acesso restrito</router-link></li>
        </ul>
        <router-link class="header-contact" :to="{ path: '/', hash: '#contato' }">Vamos conversar <span aria-hidden="true">↗</span></router-link>
      </nav>
    </header>
    <main id="conteudo-principal" tabindex="-1"><router-view /></main>
    <PwaStatus />
    <footer class="app-footer"><router-link to="/" aria-label="Miniverso — início"><img src="/images/miniverso-logo.png" alt="Miniverso" width="1024" height="236" /></router-link><p>Experiências que levam ideias além da tela.</p><span>© 2026 Miniverso</span></footer>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PwaStatus from './components/PwaStatus.vue';
const route = useRoute();
const isHome = computed(() => route.name === 'Home');
const isDashboard = computed(() => route.name === 'Dashboard');
const isLogin = computed(() => route.name === 'Login');
const menuOpen = ref(false);
watch(() => route.fullPath, () => { menuOpen.value = false; });
</script>

<style>
:root { font-family: var(--font-display); font-synthesis: none; text-rendering: optimizeLegibility; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 0; }
button, input, textarea { font: inherit; }
a { color: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
:focus-visible { outline: 2px solid #7cdeef; outline-offset: 6px; }
.app-shell { background: #f5f3ee; color: #152033; }
.immersive-shell { background: #07131f; color: #eef7ff; }
.skip-link { position: fixed; z-index: 100; top: 12px; left: 12px; padding: 12px 18px; color: #060710; background: #8fe1ee; transform: translateY(-180%); }
.skip-link:focus { transform: translateY(0); }
.app-header { position: relative; z-index: 20; background: #0a0b16; color: #e9eaf3; }
.immersive-shell .app-header { position: absolute; top: 0; left: 0; right: 0; background: transparent; }
.navbar { height: 102px; margin: 0 5%; display: flex; justify-content: space-between; align-items: center; gap: 28px; border-bottom: 1px solid #9d99b22b; }
.brand { display: inline-flex; align-items: center; min-height: 44px; }
.navbar .brand, .navbar .nav-links a { display: inline-flex; }
.brand img { display: block; width: 145px; height: auto; }
.nav-links { display: flex; align-items: center; gap: 30px; list-style: none; margin: 0; padding: 0; }
.nav-links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 12px; text-decoration: none; color: #bbbdd0; transition: color .2s; }
.nav-links a:hover, .nav-links a.router-link-exact-active:not([href*='#']) { color: #fff; }
.restricted-link { font: 10px var(--font-mono); }
.header-contact { font-size: 12px; display: inline-flex; align-items: center; justify-content: space-between; gap: 26px; padding: 13px 22px; color: #111223; background: #f3f4fa; border-radius: 40px; text-decoration: none; min-height: 44px; }
.menu-button { display: none; }
#conteudo-principal { min-height: 75vh; outline: none; }
.app-shell:not(.immersive-shell) #conteudo-principal { padding: clamp(24px, 5vw, 70px); }
.admin-shell .app-header,.admin-shell .app-footer{display:none}.admin-shell #conteudo-principal{padding:0!important}
.portal-shell #conteudo-principal{padding:0!important}
.app-footer { display: flex; align-items: center; justify-content: space-between; gap: 25px; padding: 40px 5%; color: #9a9eb4; background: #0a0b16; font-size: 11px; }
.app-footer img { width: 135px; height: auto; display: block; }
.app-footer span { font: 10px var(--font-mono); }
@media(max-width: 850px) {
  .navbar { height: 84px; gap: 16px; }
  .brand img { width: 125px; }
  .nav-links { gap: 16px; }
  .header-contact { padding: 12px 16px; gap: 12px; }
}
@media(max-width: 700px) {
  .navbar { height: 78px; margin-inline: 6%; }
  .brand img { width: 118px; }
  .menu-button { display: block; margin-left: auto; border: 1px solid #9d99b260; border-radius: 30px; background: transparent; color: #e9eaf3; padding: 10px 17px; min-height: 44px; font-size: 11px; cursor: pointer; }
  .header-contact { display: none; }
  .nav-links { display: none; position: absolute; top: 78px; left: 0; right: 0; padding: 22px 6%; background: #121022; border-bottom: 1px solid #756397; }
  .nav-links.menu-open { display: flex; align-items: start; flex-direction: column; gap: 4px; }
  .nav-links a { font-size: 14px; min-height: 46px; }
  .app-footer { align-items: start; flex-direction: column; padding: 36px 6%; gap: 18px; }
  .app-footer p { margin: 0; }
}
@media(prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0s !important; animation: none !important; } }
</style>
