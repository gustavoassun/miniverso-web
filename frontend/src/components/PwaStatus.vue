<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useRegisterSW } from 'virtual:pwa-register/vue';

// Atualização automática: quando sai uma versão nova do site, ela é baixada em segundo plano e aplicada num momento
// que não atrapalha (logo ao abrir, com a aba escondida ou ao trocar de página), sem precisar clicar em nada.
// O site procura versões novas ao voltar para a aba, ao reconectar e a cada 20 minutos. Offline continua funcionando.
const UPDATED_FLAG = 'miniverso:atualizado';
const router = useRouter();
const updatedNote = ref(false);
let pendingApply = false, applying = false, poll = 0;

const online = ref(navigator.onLine);
const installPrompt = ref(null);
const dismissed = ref(false);
const registrationError = ref(false);
const installed = ref(window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true);
const installing = ref(false);
let registration;
let checking = false;
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW({
  immediate: true,
  onRegisteredSW(_url, value) { registration = value; },
  onRegisterError(error) { registrationError.value = true; console.warn('Não foi possível preparar o modo offline.', error); }
});
// Sem conexão: só um alerta pequeno no topo, que a pessoa pode esconder (volta a avisar se a conexão cair de novo).
const offlineHidden = ref(false);
const offlineAlert = computed(() => !online.value && !offlineHidden.value);
const visible = computed(() => online.value && !dismissed.value && (registrationError.value || installPrompt.value));

async function checkUpdate() {
  if (!registration || !navigator.onLine || checking) return;
  checking = true;
  try { await registration.update(); } catch { /* Mantém a versão local em caso de falha na conexão. */ }
  finally { checking = false; }
}
function syncConnection() { online.value = navigator.onLine; dismissed.value = false; offlineHidden.value = false; if (online.value) checkUpdate(); }
function captureInstall(event) { event.preventDefault(); installPrompt.value = event; dismissed.value = false; }
function finishInstall() { installed.value = true; installPrompt.value = null; }
function onVisibility() { if (document.visibilityState === 'visible') checkUpdate(); else if (pendingApply) apply(); }
async function install() {
  const prompt = installPrompt.value;
  if (!prompt || installing.value) return;
  installing.value = true;
  try { await prompt.prompt(); await prompt.userChoice; }
  finally { installPrompt.value = null; installing.value = false; }
}
async function apply() {
  if (applying) return; applying = true;
  try { sessionStorage.setItem(UPDATED_FLAG, '1'); } catch { /* sem armazenamento */ }
  try { await updateServiceWorker(true); } catch { applying = false; }
}
// Momento seguro: nos primeiros segundos da visita ou com a aba escondida aplica já; senão, espera a próxima troca
// de página ou a aba sair de foco (ninguém perde o que estava vendo no meio de um jogo ou de uma leitura).
function applyWhenSafe() {
  if (document.visibilityState === 'hidden' || performance.now() < 8000) apply(); else pendingApply = true;
}
watch(needRefresh, v => { if (v) applyWhenSafe(); });
router.afterEach(() => { if (pendingApply) apply(); });
onMounted(() => {
  try { if (sessionStorage.getItem(UPDATED_FLAG)) { sessionStorage.removeItem(UPDATED_FLAG); updatedNote.value = true; setTimeout(() => { updatedNote.value = false; }, 3600); } } catch { /* sem armazenamento */ }
  poll = setInterval(checkUpdate, 20 * 60 * 1000);
  window.addEventListener('online', syncConnection);
  window.addEventListener('offline', syncConnection);
  window.addEventListener('beforeinstallprompt', captureInstall);
  window.addEventListener('appinstalled', finishInstall);
  document.addEventListener('visibilitychange', onVisibility);
});
onUnmounted(() => {
  clearInterval(poll);
  window.removeEventListener('online', syncConnection);
  window.removeEventListener('offline', syncConnection);
  window.removeEventListener('beforeinstallprompt', captureInstall);
  window.removeEventListener('appinstalled', finishInstall);
  document.removeEventListener('visibilitychange', onVisibility);
});
</script>

<template>
  <aside v-if="visible" class="pwa-status" aria-label="Aplicativo Miniverso">
    <p role="status" aria-live="polite">
      <template v-if="registrationError">Não foi possível preparar o modo offline. Tente recarregar quando a conexão estiver estável.</template>
      <template v-else>Leve o Miniverso para sua tela inicial.</template>
    </p>
    <div class="pwa-actions">
      <button v-if="installPrompt && !installed" type="button" :disabled="installing" @click="install">Instalar Miniverso</button>
      <button type="button" class="pwa-dismiss" @click="dismissed = true">Agora não</button>
    </div>
  </aside>
  <Transition name="upd">
    <div v-if="offlineAlert" class="pwa-offline" role="status" aria-live="polite">
      <span class="pwa-dot" aria-hidden="true"></span>
      <span>Sem conexão</span>
      <button type="button" aria-label="Esconder aviso de sem conexão" @click="offlineHidden = true">×</button>
    </div>
  </Transition>
  <Transition name="upd"><p v-if="updatedNote" class="pwa-updated" role="status">✓ Você está na versão mais nova do Miniverso</p></Transition>
</template>

<style scoped>
.pwa-status { position: fixed; z-index: 80; bottom: max(16px, env(safe-area-inset-bottom)); right: 16px; width: min(390px, calc(100vw - 32px)); padding: 18px; border: 1px solid #8fe1ee55; border-radius: 16px; background: #141126; color: #f3f4fa; box-shadow: 0 8px 32px #0006; font-size: 14px; }
.pwa-status p { margin: 0; line-height: 1.5; }
.pwa-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pwa-actions:empty { display: none; }
.pwa-actions button { min-height: 44px; padding: 10px 14px; border: 1px solid #8fe1ee; border-radius: 24px; background: #8fe1ee; color: #141126; cursor: pointer; }
.pwa-updated { position: fixed; z-index: 81; left: 50%; top: max(16px, env(safe-area-inset-top)); transform: translateX(-50%); margin: 0; padding: 10px 18px; border: 1px solid #8fe1ee55; border-radius: 999px; background: #0c1b29e6; backdrop-filter: blur(10px); color: #dff4fb; font-size: 13px; font-weight: 600; box-shadow: 0 8px 28px #0006; white-space: nowrap; }
.upd-enter-active, .upd-leave-active { transition: opacity .4s, transform .4s; }
.upd-enter-from, .upd-leave-to { opacity: 0; transform: translate(-50%, -8px); }
/* Logo abaixo do cabeçalho e da barra de seções, para não cobrir os botões deles. */
.pwa-offline { position: fixed; z-index: 81; left: 50%; top: calc(env(safe-area-inset-top, 0px) + 122px); transform: translateX(-50%); display: inline-flex; align-items: center; gap: 10px; height: 40px; padding: 0 6px 0 16px; border: 1px solid #ffc56b66; border-radius: 999px; background: #1a1424ee; backdrop-filter: blur(10px); color: #fbeedd; font-size: 13px; font-weight: 600; box-shadow: 0 8px 28px #0006; white-space: nowrap; }
.pwa-dot { width: 8px; height: 8px; border-radius: 50%; background: #ffc56b; }
.pwa-offline button { display: grid; place-items: center; width: 30px; height: 30px; padding: 0; border: 0; border-radius: 50%; background: #ffffff14; color: #fff; font-size: 18px; line-height: 1; cursor: pointer; }
.pwa-offline button:hover { background: #ffffff26; }
@media (max-width: 700px) { .pwa-offline { top: calc(env(safe-area-inset-top, 0px) + 86px); } }
.pwa-actions .pwa-dismiss { background: transparent; color: #f3f4fa; border-color: #ffffff55; }
</style>
