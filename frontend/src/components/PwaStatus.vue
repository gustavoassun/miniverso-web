<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useRegisterSW } from 'virtual:pwa-register/vue';

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
const visible = computed(() => !online.value || (!dismissed.value && (offlineReady.value || needRefresh.value || registrationError.value || installPrompt.value)));

async function checkUpdate() {
  if (!registration || !navigator.onLine || checking) return;
  checking = true;
  try { await registration.update(); } catch { /* Mantém a versão local em caso de falha na conexão. */ }
  finally { checking = false; }
}
function syncConnection() { online.value = navigator.onLine; dismissed.value = false; if (online.value) checkUpdate(); }
function captureInstall(event) { event.preventDefault(); installPrompt.value = event; dismissed.value = false; }
function finishInstall() { installed.value = true; installPrompt.value = null; }
function onVisibility() { if (document.visibilityState === 'visible') checkUpdate(); }
async function install() {
  const prompt = installPrompt.value;
  if (!prompt || installing.value) return;
  installing.value = true;
  try { await prompt.prompt(); await prompt.userChoice; }
  finally { installPrompt.value = null; installing.value = false; }
}
async function update() {
  try { await updateServiceWorker(true); }
  catch { registrationError.value = true; }
}
onMounted(() => {
  window.addEventListener('online', syncConnection);
  window.addEventListener('offline', syncConnection);
  window.addEventListener('beforeinstallprompt', captureInstall);
  window.addEventListener('appinstalled', finishInstall);
  document.addEventListener('visibilitychange', onVisibility);
});
onUnmounted(() => {
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
      <template v-if="!online">Você está sem conexão. O conteúdo salvo continua disponível; links externos e serviços online precisam de internet.</template>
      <template v-else-if="needRefresh">Uma nova versão do Miniverso está disponível. Atualize quando puder recarregar a página.</template>
      <template v-else-if="registrationError">Não foi possível preparar o modo offline. Tente recarregar quando a conexão estiver estável.</template>
      <template v-else-if="offlineReady">Miniverso pronto para abrir offline neste dispositivo.</template>
      <template v-else>Leve o Miniverso para sua tela inicial.</template>
    </p>
    <div class="pwa-actions">
      <button v-if="online && needRefresh" type="button" @click="update">Atualizar agora</button>
      <button v-if="online && installPrompt && !installed" type="button" :disabled="installing" @click="install">Instalar Miniverso</button>
      <button v-if="online" type="button" class="pwa-dismiss" @click="dismissed = true">Agora não</button>
    </div>
  </aside>
</template>

<style scoped>
.pwa-status { position: fixed; z-index: 80; bottom: max(16px, env(safe-area-inset-bottom)); right: 16px; width: min(390px, calc(100vw - 32px)); padding: 18px; border: 1px solid #8fe1ee55; border-radius: 16px; background: #141126; color: #f3f4fa; box-shadow: 0 8px 32px #0006; font-size: 14px; }
.pwa-status p { margin: 0; line-height: 1.5; }
.pwa-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.pwa-actions:empty { display: none; }
.pwa-actions button { min-height: 44px; padding: 10px 14px; border: 1px solid #8fe1ee; border-radius: 24px; background: #8fe1ee; color: #141126; cursor: pointer; }
.pwa-actions .pwa-dismiss { background: transparent; color: #f3f4fa; border-color: #ffffff55; }
</style>
