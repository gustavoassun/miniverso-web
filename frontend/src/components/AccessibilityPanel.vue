<template>
  <!-- Painel de acessibilidade: texto maior, alto contraste, menos movimento, fonte mais legível, links destacados e o
       tradutor de Libras (VLibras), que só é carregado se a pessoa ligar. As escolhas ficam salvas no aparelho. -->
  <div class="a11y" @keydown.esc="close(true)">
    <button ref="btn" class="a11y-btn" type="button" data-act="open" :aria-expanded="open" aria-controls="painel-acessibilidade">
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.2" r="2.2" /><path d="M4 8.2c2.6.7 5.3 1 8 1s5.4-.3 8-1M12 9.2v5.3m0 0-3.4 7m3.4-7 3.4 7" /></svg>
      <span class="a11y-label">Acessibilidade</span>
    </button>
    <div v-if="open" id="painel-acessibilidade" ref="panel" class="a11y-panel" role="dialog" aria-labelledby="a11y-title">
      <div class="a11y-head">
        <h2 id="a11y-title">Acessibilidade</h2>
        <button class="a11y-x" type="button" data-act="close" aria-label="Fechar painel de acessibilidade">×</button>
      </div>
      <ul class="a11y-list">
        <li v-for="o in OPTIONS" :key="o.key">
          <button type="button" class="a11y-opt" :data-act="'opt:' + o.key" :aria-pressed="!!state[o.key]">
            <span class="a11y-switch" aria-hidden="true"></span>
            <span><b>{{ o.name }}</b><small>{{ o.hint }}</small></span>
          </button>
        </li>
      </ul>
      <p class="a11y-note">{{ libStatus }}</p>
      <div class="a11y-foot">
        <button type="button" class="a11y-reset" data-act="reset">Restaurar padrão</button>
        <router-link to="/acessibilidade" @click="close(false)">Sobre a acessibilidade do site</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, onUnmounted, reactive, ref } from 'vue';

const KEY = 'miniverso-a11y';
const OPTIONS = [
  { key: 'big', name: 'Texto maior', hint: 'Aumenta textos e botões das seções.' },
  { key: 'contrast', name: 'Alto contraste', hint: 'Textos mais claros e bordas mais fortes.' },
  { key: 'motion', name: 'Menos movimento', hint: 'Desliga animações, brilhos e a abertura automática.' },
  { key: 'font', name: 'Fonte mais legível', hint: 'Letras mais abertas e espaçadas.' },
  { key: 'links', name: 'Destacar links', hint: 'Sublinha todos os links.' },
  { key: 'libras', name: 'Tradutor de Libras', hint: 'Abre o VLibras, do Governo Federal (carrega um serviço externo).' }
];
const open = ref(false), btn = ref(null), panel = ref(null), libStatus = ref('');
const state = reactive({ big: false, contrast: false, motion: false, font: false, links: false, libras: false });

function apply() {
  const html = document.documentElement;
  for (const k of ['big', 'contrast', 'motion', 'font', 'links']) html.classList.toggle(`a11y-${k}`, !!state[k]);
  // O planeta e o céu do site ouvem este aviso para parar as animações.
  window.dispatchEvent(new CustomEvent('miniverso:reduced', { detail: !!state.motion || matchMedia('(prefers-reduced-motion: reduce)').matches }));
  if (state.libras) loadVLibras(); else hideVLibras();
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* sem armazenamento */ }
}
function toggle(k) { state[k] = !state[k]; apply(); }
function reset() { for (const k of Object.keys(state)) state[k] = false; apply(); }

// VLibras: o widget oficial do governo (tradução para Libras). Só entra na página quando ligado.
let vlLoaded = false;
function loadVLibras() {
  librasHidden(false);
  const box = document.querySelector('[vw]');
  if (box) { box.style.display = ''; libStatus.value = 'Tradutor de Libras ligado: use a mãozinha azul no canto da tela.'; return; }
  libStatus.value = 'Carregando o tradutor de Libras…';
  const wrap = document.createElement('div');
  wrap.setAttribute('vw', ''); wrap.className = 'enabled';
  wrap.innerHTML = '<div vw-access-button class="active"></div><div vw-plugin-wrapper><div class="vw-plugin-top-wrapper"></div></div>';
  document.body.appendChild(wrap);
  if (vlLoaded) return;
  vlLoaded = true;
  const s = document.createElement('script');
  s.src = 'https://vlibras.gov.br/app/vlibras-plugin.js'; s.async = true;
  // position 'L': o botão do VLibras fica na esquerda (na direita ficava em cima da barra de seções).
  s.onload = () => { try { new window.VLibras.Widget({ rootPath: 'https://vlibras.gov.br/app', position: 'L' }); window.dispatchEvent(new Event('load')); libStatus.value = 'Tradutor de Libras ligado: use a mãozinha azul no canto da tela.'; } catch { libStatus.value = 'Não foi possível abrir o tradutor de Libras agora.'; } };
  s.onerror = () => { vlLoaded = false; libStatus.value = 'Não foi possível carregar o tradutor de Libras. Verifique a conexão.'; };
  document.head.appendChild(s);
}
// Desligado: some tudo do VLibras, inclusive o botão novo (que ele desenha numa caixa fechada, #vlibras-access-wrapper)
// e a janela do avatar, se estiver aberta. Uma folha de estilo própria esconde também o que ele criar depois (classes
// no <html> não serviam: o VLibras reescreve as classes da página).
function librasHidden(on) {
  let st = document.getElementById('libras-off');
  if (on && !st) { st = document.createElement('style'); st.id = 'libras-off'; st.textContent = "[vw], #vlibras-access-wrapper, #vlibras-app-root { display: none !important; }"; document.head.appendChild(st); }
  // Só as caixas do próprio VLibras: ele também marca elementos da página (vlibras--hover) ao destacar o texto, e
  // esconder por classe apagava a capa inteira. Ao desligar, tira essa marca que tiver ficado.
  if (on) document.querySelectorAll('.vlibras--hover').forEach(e => e.classList.remove('vlibras--hover'));
  if (!on && st) st.remove();
}
function hideVLibras() { librasHidden(true); if (!state.libras) libStatus.value = ''; }

async function show() { open.value = true; await nextTick(); panel.value?.querySelector('.a11y-opt')?.focus(); document.addEventListener('pointerdown', outside, true); }
function close(focusBack) { if (!open.value) return; open.value = false; document.removeEventListener('pointerdown', outside, true); if (focusBack) btn.value?.focus(); }
function outside(e) { if (!e.target.closest?.('.a11y')) close(false); }

// Os botões do painel são atendidos na janela, antes de qualquer outro script: com o VLibras ligado, ele captura os
// cliques da página (para traduzir o texto clicado) e o clique em "desligar" nunca chegava ao painel.
function onAct(e) {
  const b = e.target.closest?.('.a11y [data-act]'); if (!b) return;
  e.stopPropagation(); e.preventDefault();
  const act = b.dataset.act;
  if (act === 'open') open.value ? close(true) : show();
  else if (act === 'close') close(true);
  else if (act === 'reset') reset();
  else if (act.startsWith('opt:')) toggle(act.slice(4));
}
onUnmounted(() => window.removeEventListener('click', onAct, true));
onMounted(() => {
  window.addEventListener('click', onAct, true);
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { /* sem armazenamento */ }
  // Espera o planeta montar para ele também receber o aviso de menos movimento.
  apply(); setTimeout(apply, 1500);
});
</script>

<style scoped>
.a11y { position: relative; }
.a11y-btn { display: inline-flex; align-items: center; gap: 8px; height: 44px; padding: 0 14px 0 12px; border-radius: 999px; border: 1px solid rgba(233, 234, 243, .28); background: rgba(10, 11, 22, .45); color: #e9eaf3; font: 600 13px/1 var(--font-body); cursor: pointer; transition: border-color .2s, background .2s; }
.a11y-btn:hover, .a11y-btn[aria-expanded='true'] { border-color: #7cdeef; background: rgba(0, 183, 227, .14); }
.a11y-btn svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; }
.a11y-btn svg circle { fill: currentColor; stroke: none; }
.a11y-panel { position: absolute; right: 0; top: calc(100% + 10px); z-index: 60; width: min(340px, calc(100vw - 32px)); padding: 16px; border-radius: 18px; border: 1px solid rgba(124, 222, 239, .35); background: #0d0f22; box-shadow: 0 18px 50px rgba(0, 0, 0, .55); color: #eef1fa; }
.a11y-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.a11y-head h2 { margin: 0; font: 700 18px/1.2 var(--font-body); }
.a11y-x { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255, 255, 255, .25); background: transparent; color: #fff; font-size: 20px; cursor: pointer; }
.a11y-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.a11y-opt { display: flex; align-items: center; gap: 12px; width: 100%; min-height: 52px; padding: 8px 10px; border: 0; border-radius: 12px; background: transparent; color: inherit; text-align: left; cursor: pointer; font: inherit; }
.a11y-opt:hover { background: rgba(255, 255, 255, .06); }
.a11y-opt b { display: block; font: 600 14px/1.3 var(--font-body); }
.a11y-opt small { display: block; font: 400 12.5px/1.35 var(--font-body); color: #c3c8dc; }
.a11y-switch { flex: none; position: relative; width: 38px; height: 22px; border-radius: 99px; background: #3a3f5c; transition: background .2s; }
.a11y-switch::after { content: ''; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; }
.a11y-opt[aria-pressed='true'] .a11y-switch { background: #00b7e3; }
.a11y-opt[aria-pressed='true'] .a11y-switch::after { transform: translateX(16px); }
.a11y-note { margin: 8px 4px 0; min-height: 0; font: 400 12.5px/1.4 var(--font-body); color: #9fe9f6; }
.a11y-note:empty { display: none; }
.a11y-foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, .12); }
.a11y-reset { min-height: 40px; padding: 0 14px; border-radius: 99px; border: 1px solid rgba(255, 255, 255, .28); background: transparent; color: #fff; font: 600 13px var(--font-body); cursor: pointer; }
.a11y-foot a { color: #9fe9f6; font: 600 13px var(--font-body); }
@media (max-width: 700px) { .a11y-label { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); } .a11y-btn { padding: 0 12px; } }
</style>
