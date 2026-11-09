<template>
  <div class="app-shell" :class="{ 'immersive-shell': isHome, 'admin-shell': isDashboard, 'portal-shell': isLogin }">
    <header ref="header" class="app-header">
      <nav aria-label="Navegação principal" class="navbar">
        <router-link class="brand" to="/" aria-label="Miniverso — início" @click="menuOpen = false"><img src="/images/miniverso-logo.png" alt="Miniverso" width="1024" height="236" /></router-link>
        <button class="menu-button" type="button" :aria-expanded="menuOpen" aria-controls="navigation-links" @click="menuOpen = !menuOpen">{{ menuOpen ? 'Fechar' : 'Menu' }}</button>
        <ul id="navigation-links" class="nav-links" :class="{ 'menu-open': menuOpen }">
          <li><router-link :to="{ path: '/', hash: '#sobre' }" @click="menuOpen = false">O estúdio</router-link></li>
          <li><router-link :to="{ path: '/', hash: '#portfolio' }" @click="menuOpen = false">Projetos</router-link></li>
          <li><router-link class="restricted-link" to="/login" @click="menuOpen = false">Acesso restrito</router-link></li>
        </ul>
        <div class="header-actions">
          <AccessibilityPanel :docked="away" />
          <router-link class="header-contact" :to="{ path: '/', hash: '#contato' }">Vamos conversar <span aria-hidden="true">↗</span></router-link>
        </div>
      </nav>
    </header>
    <main id="conteudo-principal" tabindex="-1"><router-view /></main>
    <PwaStatus />
    <footer class="app-footer"><router-link to="/" aria-label="Miniverso — início"><img src="/images/miniverso-logo.png" alt="Miniverso" width="1024" height="236" /></router-link><p>Experiências que levam ideias além da tela.</p><router-link class="footer-link" to="/acessibilidade">Acessibilidade</router-link><span>© 2026 Miniverso</span></footer>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import PwaStatus from './components/PwaStatus.vue';
import AccessibilityPanel from './components/AccessibilityPanel.vue';
const route = useRoute();
// Home e páginas de projeto usam o visual escuro de céu (cabeçalho transparente por cima).
const isHome = computed(() => ['Home', 'Projects', 'Project', 'Accessibility'].includes(route.name));
const isDashboard = computed(() => route.name === 'Dashboard');
const isLogin = computed(() => route.name === 'Login');
const menuOpen = ref(false);
watch(() => route.fullPath, () => { menuOpen.value = false; });
// Acessibilidade sempre à mão: quando o cabeçalho sai da tela (planeta, site rolado, outras páginas), o botão flutua
// no canto de baixo à esquerda. Cabeçalho escondido de propósito (painel administrativo): não flutua.
const header = ref(null), away = ref(false);
let headIO;
onMounted(() => {
  headIO = new IntersectionObserver(([e]) => {
    away.value = e.intersectionRatio < 0.5 && getComputedStyle(header.value).display !== 'none';
  }, { threshold: [0, 0.5, 1] });
  headIO.observe(header.value);
});
onUnmounted(() => headIO?.disconnect());
</script>

<style>
:root { font-family: var(--font-body); font-synthesis: none; text-rendering: optimizeLegibility; }
* { box-sizing: border-box; }
body { margin: 0; min-width: 0; }
button, input, textarea { font: inherit; }
a { color: inherit; }
/* Cursor da Miniverso no site inteiro: a mira de VR; em links e botões, a mira acesa (apontando). Campos de texto
   continuam com o cursor de texto. */
:root { --cur: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='9' fill='none' stroke='%23050a1c' stroke-opacity='.55' stroke-width='4.5'/><circle cx='16' cy='16' r='9' fill='none' stroke='%237fe9ff' stroke-width='2'/><path d='M22.4 9.6a9 9 0 0 1 2.6 6.4' fill='none' stroke='%23ff4fd8' stroke-width='2.2' stroke-linecap='round'/><circle cx='16' cy='16' r='2.6' fill='%23ffffff' stroke='%23050a1c' stroke-width='1.2'/></svg>") 16 16, grab; --cur-drag: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><g fill='none' stroke-linecap='round' stroke-linejoin='round'><circle cx='16' cy='16' r='6' stroke='%23050a1c' stroke-opacity='.55' stroke-width='4.5'/><circle cx='16' cy='16' r='6' stroke='%237fe9ff' stroke-width='2'/><path d='M16 3.5l-2.6 2.8M16 3.5l2.6 2.8M16 28.5l-2.6-2.8M16 28.5l2.6-2.8M3.5 16l2.8-2.6M3.5 16l2.8 2.6M28.5 16l-2.8-2.6M28.5 16l-2.8 2.6' stroke='%23050a1c' stroke-opacity='.55' stroke-width='4'/><path d='M16 3.5l-2.6 2.8M16 3.5l2.6 2.8M16 28.5l-2.6-2.8M16 28.5l2.6-2.8M3.5 16l2.8-2.6M3.5 16l2.8 2.6M28.5 16l-2.8-2.6M28.5 16l-2.8 2.6' stroke='%23ffffff' stroke-width='1.8'/></g><circle cx='16' cy='16' r='2.2' fill='%23ff4fd8'/></svg>") 16 16, grabbing; --cur-point: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'><circle cx='16' cy='16' r='11.5' fill='%237fe9ff' fill-opacity='.22' stroke='%23050a1c' stroke-opacity='.55' stroke-width='4.5'/><circle cx='16' cy='16' r='11.5' fill='none' stroke='%237fe9ff' stroke-width='2.2'/><circle cx='16' cy='16' r='3.4' fill='%23ff4fd8' stroke='%23ffffff' stroke-width='1.4'/></svg>") 16 16, pointer; }
html, body { cursor: var(--cur); }
/* Nas seções do site o GlowCursor desenha o próprio cursor (e esconde o do sistema): aqui só vale fora dele. */
html:not(.miniverso-glow-cursor) :is(a[href], button:not(:disabled), [role='button'], summary, label[for], select, .chip) { cursor: var(--cur-point) !important; }
:is(input:not([type='checkbox'], [type='radio'], [type='range'], [type='button'], [type='submit']), textarea, [contenteditable='true']) { cursor: text !important; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }
:focus-visible { outline: 2px solid #7cdeef; outline-offset: 6px; }
.app-shell { background: #f5f3ee; color: #152033; }
.immersive-shell { background: #07131f; color: #eef7ff; }
.skip-link { position: fixed; z-index: 100; top: 12px; left: 12px; padding: 12px 18px; color: #060710; background: #8fe1ee; transform: translateY(-180%); }
.skip-link:focus { transform: translateY(0); }
.app-header { position: relative; z-index: 20; background: #0a0b16; color: #e9eaf3; }
/* Na Home, o cabeçalho entra com suavidade junto com a capa. */
.immersive-shell .app-header { animation: header-in .9s ease .25s both; }
@keyframes header-in { from { opacity: 0; transform: translateY(-8px); } }
.immersive-shell .app-header { position: absolute; top: 0; left: 0; right: 0; background: transparent; }
.navbar { height: 102px; margin: 0 5%; display: flex; justify-content: space-between; align-items: center; gap: 28px; border-bottom: 1px solid #9d99b22b; }
.brand { display: inline-flex; align-items: center; min-height: 44px; }
.navbar .brand, .navbar .nav-links a { display: inline-flex; }
.brand img { display: block; width: 145px; height: auto; }
.nav-links { display: flex; align-items: center; gap: 30px; list-style: none; margin: 0; padding: 0; }
/* Menu: uma fonte só para todos os itens, mais nítida (antes Acesso restrito usava a fonte mono e tudo ficava apagado). */
.nav-links a { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; font: 600 13px/1 var(--font-body); letter-spacing: .02em; text-decoration: none; color: #e1e4f0; transition: color .2s; }
.nav-links a:hover, .nav-links a.router-link-exact-active:not([href*='#']) { color: #fff; }
.restricted-link::before { content: ''; width: 11px; height: 11px; background: currentColor; -webkit-mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z'/></svg>") center / contain no-repeat; mask: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'><path d='M7 10V7a5 5 0 0 1 10 0v3h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1zm2 0h6V7a3 3 0 0 0-6 0v3z'/></svg>") center / contain no-repeat; opacity: .8; }
/* Vamos conversar: texto e seta centralizados na mesma linha, mesma fonte do menu. */
.header-contact { display: inline-flex; align-items: center; justify-content: center; gap: 10px; height: 44px; padding: 0 20px; font: 700 13px/1 var(--font-body); letter-spacing: .02em; color: #111223; background: #f3f4fa; border-radius: 999px; text-decoration: none; transition: background .2s, transform .2s; }
.header-contact:hover { background: #fff; transform: translateY(-1px); }
.header-contact span { font-size: 14px; line-height: 1; }
.menu-button { display: none; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.footer-link { color: inherit; font-weight: 600; text-underline-offset: 3px; }
.footer-link:hover { color: #fff; }

/* Preferências do painel de acessibilidade (classes no <html>). */
html.a11y-big .home-page > section:not(.miniverso-intro), html.a11y-big .app-footer, html.a11y-big .a11y-page,
html.a11y-big #conteudo-principal > :not(.home-page) { zoom: 1.15; }
html.a11y-contrast :where(#conteudo-principal, .app-footer) :is(p, li, small, figcaption, label, dd, dt, .eyebrow) { color: #f6f8fd !important; opacity: 1 !important; }
html.a11y-contrast :where(#conteudo-principal, .app-footer) :is(h1, h2, h3) { color: #ffffff !important; -webkit-text-fill-color: #ffffff; text-shadow: none !important; }
html.a11y-contrast .nav-links a { color: #ffffff; }
html.a11y-contrast :where(#conteudo-principal) :is(button, a.btn) { outline: 1px solid rgba(255, 255, 255, .7); outline-offset: 2px; }
html.a11y-contrast :focus-visible { outline: 3px solid #ffd23f !important; outline-offset: 4px; }
html.a11y-font body, html.a11y-font body :not(svg, svg *, code, kbd, .scene-canvas) { font-family: Verdana, 'Segoe UI', Tahoma, sans-serif !important; letter-spacing: .02em !important; word-spacing: .06em; }
html.a11y-links #conteudo-principal a, html.a11y-links .app-footer a { text-decoration: underline !important; text-underline-offset: 3px; }
html.a11y-motion *, html.a11y-motion *::before, html.a11y-motion *::after { animation-duration: .001s !important; animation-iteration-count: 1 !important; transition-duration: .001s !important; scroll-behavior: auto !important; }
#conteudo-principal { min-height: 75vh; outline: none; }
.app-shell:not(.immersive-shell) #conteudo-principal { padding: clamp(24px, 5vw, 70px); }
.admin-shell .app-header,.admin-shell .app-footer{display:none}.admin-shell #conteudo-principal{padding:0!important}
.portal-shell #conteudo-principal{padding:0!important}
.app-footer { display: flex; align-items: center; justify-content: space-between; gap: 25px; padding: 40px 5% 88px; color: #9a9eb4; background: #0a0b16; font-size: 11px; }
.app-footer img { width: 135px; height: auto; display: block; }
.app-footer span { font: 10px var(--font-mono); }
/* Na Home, o rodapé fica sobre o céu do site, sem faixa de outra cor. */
.immersive-shell .app-footer { position: relative; z-index: 2; background: linear-gradient(180deg, transparent, #070b1acc); border-top: 1px solid #ffffff12; font-size: 13px; color: #8fa9b8; }
.immersive-shell .app-footer span { font: 600 12px var(--font-body); letter-spacing: .08em; }
@media(max-width: 850px) {
  .navbar { height: 84px; gap: 16px; }
  .brand img { width: 125px; }
  .nav-links { gap: 16px; }
  .header-contact { padding: 0 16px; gap: 8px; }
}
@media(max-width: 700px) {
  .navbar { height: 78px; margin-inline: 5%; }
  .brand img { width: 118px; }
  .menu-button { display: block; margin-left: 0; border: 1px solid #9d99b260; border-radius: 30px; background: transparent; color: #e9eaf3; padding: 10px 17px; min-height: 44px; font-size: 11px; cursor: pointer; }
  /* Celular: "Vamos conversar" continua no cabeçalho, mais compacto, ao lado da acessibilidade. */
  .navbar .header-contact { display: inline-flex; height: 40px; padding: 0 12px; gap: 6px; font-size: 11.5px; letter-spacing: 0; white-space: nowrap; }
  .navbar { gap: 8px; }
  .navbar .brand img { width: 100px; }
  .navbar .menu-button { padding: 10px 12px; min-height: 40px; }
  .navbar .header-actions .a11y-btn { width: 40px; height: 40px; padding: 0; justify-content: center; }
  .header-contact span { display: none; }
  .header-actions { margin-left: auto; gap: 8px; }
  .nav-links { display: none; position: absolute; top: 78px; left: 0; right: 0; padding: 22px 6%; background: #121022; border-bottom: 1px solid #756397; }
  .nav-links.menu-open { display: flex; align-items: start; flex-direction: column; gap: 4px; }
  .nav-links a { font-size: 15px; min-height: 46px; }
  .app-footer { align-items: start; flex-direction: column; padding: 36px 6% 88px; gap: 18px; }
  .app-footer p { margin: 0; }
}
/* Celulares bem estreitos (320–360 px): logo e botões ainda mais justos, para o cabeçalho não quebrar. */
@media(max-width: 360px) {
  .navbar { gap: 6px; margin-inline: 4%; }
  .navbar .brand img { width: 84px; }
  .navbar .menu-button { padding: 10px 10px; }
  .navbar .header-contact { padding: 0 10px; font-size: 11px; }
  .header-actions { gap: 6px; }
}
@media(prefers-reduced-motion: reduce) { *, *::before, *::after { scroll-behavior: auto !important; transition-duration: 0s !important; animation: none !important; } }
</style>
