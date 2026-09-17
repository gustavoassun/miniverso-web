<script setup>
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue';
const dialog = ref(null);
const reviewing = ref(false);
const feedback = ref('');
const details = reactive({ name: '', company: '', email: '', project: '' });
const message = computed(() => [
  'Olá, Miniverso! Quero conversar sobre uma ideia.',
  '', `Nome: ${details.name.trim()}`,
  `Empresa: ${details.company.trim() || 'Não informado'}`,
  `E-mail de retorno: ${details.email.trim()}`,
  '', 'Minha ideia:', details.project.trim()
].join('\n'));
const emailUrl = computed(() => `mailto:contato@meuminiverso.com?subject=${encodeURIComponent('Uma nova ideia — '+details.name.trim())}&body=${encodeURIComponent(message.value)}`);
function open() {
  reviewing.value = false;
  feedback.value = '';
  dialog.value?.showModal();
  document.documentElement.classList.add('miniverso-brief-open');
}
function closed() { document.documentElement.classList.remove('miniverso-brief-open'); }
function close() { dialog.value?.close(); }
function backdrop(event) {
  if (event.target !== dialog.value) return;
  const box = dialog.value.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
}
async function review() {
  if (!details.name.trim() || details.project.trim().length < 20) {
    feedback.value = 'Preencha seu nome e conte a ideia em pelo menos 20 caracteres.';
    return;
  }
  reviewing.value = true;
  feedback.value = '';
  dialog.value.scrollTop = 0;
  await nextTick();
  dialog.value.querySelector('pre')?.focus();
}
async function edit() { reviewing.value = false; feedback.value = ''; await nextTick(); dialog.value.querySelector('input')?.focus(); }
async function copy() {
  try { await navigator.clipboard.writeText(message.value); feedback.value = 'Briefing copiado. Agora você pode compartilhá-lo pelo canal que preferir.'; }
  catch { feedback.value = 'Não foi possível copiar automaticamente. Selecione a mensagem abaixo e copie manualmente.'; }
}
onUnmounted(closed);
defineExpose({ open });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="contact-dialog" aria-labelledby="brief-title" aria-describedby="brief-note" @close="closed" @click="backdrop">
      <button class="brief-close" type="button" aria-label="Fechar formulário" @click="close">✕</button>
      <p class="brief-eyebrow">NOVA CONEXÃO / MINIVERSO</p>
      <h2 id="brief-title">Toda experiência<br/>começa com <em>uma ideia.</em></h2>
      <p id="brief-note" class="brief-note">Conte o que você está imaginando. Não precisa ter tudo definido para começar.</p>
      <div class="brief-steps" aria-hidden="true"><span :class="{current:!reviewing}">01 / Sua ideia</span><i/><span :class="{current:reviewing}">02 / Revisar e compartilhar</span></div>
      <form v-if="!reviewing" @submit.prevent="review">
        <div class="brief-fields">
          <label for="brief-name">Seu nome <span>*</span><input id="brief-name" v-model="details.name" name="name" autocomplete="name" maxlength="100" required autofocus placeholder="Como podemos te chamar?"/></label>
          <label for="brief-company">Empresa <small>(opcional)</small><input id="brief-company" v-model="details.company" name="company" autocomplete="organization" maxlength="150" placeholder="Empresa, projeto ou organização"/></label>
          <label for="brief-email" class="full-field">E-mail para retorno <span>*</span><input id="brief-email" v-model="details.email" name="email" type="email" autocomplete="email" maxlength="200" required placeholder="voce@empresa.com"/></label>
          <label for="brief-project" class="full-field">O que você gostaria de criar? <span>*</span><textarea id="brief-project" v-model="details.project" name="project" rows="5" minlength="20" maxlength="4000" required placeholder="Qual é a sua ideia? Para quem é a experiência e o que você gostaria que ela despertasse?"/><small class="field-help">Pode ser um jogo, um treinamento, uma ativação de marca ou uma ideia que ainda está tomando forma.</small></label>
        </div>
        <p class="brief-privacy">Este formulário prepara uma mensagem, sem envio automático. Os dados não são salvos no servidor; ficam nesta página até você recarregá-la.</p>
        <button class="brief-primary" type="submit">Revisar minha ideia <span aria-hidden="true">↗</span></button>
      </form>
      <div v-else class="brief-review">
        <p class="review-label">Seu briefing está preparado — ainda não foi enviado.</p>
        <pre tabindex="0" aria-label="Mensagem preparada">{{ message }}</pre>
        <div class="review-actions"><button class="brief-primary" type="button" @click="copy">Copiar briefing <span aria-hidden="true">↗</span></button><a class="brief-secondary" :href="emailUrl">Abrir e-mail com a mensagem</a></div>
        <button class="brief-back" type="button" @click="edit">← Voltar e editar</button>
        <p class="brief-privacy">Você escolhe o canal de envio. O botão de e-mail abre seu aplicativo com a mensagem preenchida; copiar não envia nada.</p>
      </div>
      <p class="brief-feedback" role="status" aria-live="polite">{{ feedback }}</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.contact-dialog{box-sizing:border-box;width:min(680px,calc(100vw - 32px));max-height:calc(100dvh - 48px);padding:42px;border:1px solid #86c4da66;border-radius:6px 25px 6px 6px;background:radial-gradient(ellipse at 90% 0,#22516c55,transparent 65%),#091925;color:#eaf6fc;box-shadow:0 30px 120px #0008;overflow:auto;}
.contact-dialog::backdrop{background:#020b13bf;backdrop-filter:blur(8px);}
.brief-close{position:sticky;top:0;float:right;margin:-25px -25px 0 0;z-index:2;width:38px;height:38px;border:1px solid #8bb9ce44;border-radius:50%;color:#c5dce8;background:#122939;font-size:14px;}
.brief-eyebrow{font:9px var(--font-mono);letter-spacing:.16em;color:#9acee2;margin:0 0 22px;}
h2{font:500 clamp(29px,4vw,43px)/1.08 var(--font-body,Arial,sans-serif);letter-spacing:-.04em;margin:0;}h2 em{font-style:normal;color:#aae7f8;}
.brief-note{color:#b2cbd8;font-size:13px;line-height:1.6;margin:20px 0 28px;max-width:48ch;}
.brief-steps{display:flex;gap:16px;align-items:center;margin-bottom:27px;font:8px var(--font-mono);color:#7796aa;}.brief-steps .current{color:#b1e8f5;}.brief-steps i{flex:1;height:1px;background:#88b7cd2e;}
.brief-fields{display:grid;grid-template-columns:1fr 1fr;gap:20px;}.full-field{grid-column:1/-1;}
label{display:block;color:#d0e8f1;font-size:12px;font-weight:500;}label>span{color:#a3e6f5;}label>small{font-weight:400;color:#8cabbc;}
input,textarea{box-sizing:border-box;display:block;width:100%;margin-top:9px;padding:13px 14px;min-height:46px;border:1px solid #80aec34d;border-radius:5px;background:#06121da6;color:#ecf7ff;font:13px/1.5 var(--font-body,Arial,sans-serif);outline-offset:3px;}textarea{resize:vertical;}input::placeholder,textarea::placeholder{color:#7895a8;opacity:1;}input:focus-visible,textarea:focus-visible{outline:2px solid #94d9ec;border-color:#94d9ec;}
.field-help{display:block;font-size:11px;line-height:1.6;margin-top:9px;color:#a2bfce;}
.brief-privacy{color:#90afbf;font-size:11px;line-height:1.6;margin:22px 0;}
.brief-primary{display:inline-flex;justify-content:space-between;align-items:center;gap:30px;min-height:48px;padding:14px 23px;border:0;border-radius:30px;background:linear-gradient(110deg,#a4e2ed,#9dbbe5);color:#0a2435;font:500 12px var(--font-body,Arial,sans-serif);text-decoration:none;}
.brief-feedback{color:#b3e2f1;font-size:12px;line-height:1.6;margin:15px 0 0;}.brief-feedback:empty{display:none;}
.review-label{color:#b7dfeb;font-size:12px;line-height:1.6;}.brief-review pre{white-space:pre-wrap;overflow-wrap:anywhere;padding:20px;border:1px solid #80aec33d;border-radius:6px;background:#06121d99;color:#cce2ef;font:12px/1.7 var(--font-body,Arial,sans-serif);max-height:250px;overflow:auto;}
.review-actions{display:flex;flex-wrap:wrap;gap:14px;align-items:center;}.brief-secondary{color:#b6dbea;font-size:12px;padding:12px 0;text-underline-offset:5px;}.brief-back{display:block;min-height:44px;margin-top:16px;padding:8px 0;color:#b4cddc;background:none;border:0;font-size:12px;}
@media(max-width:700px){.contact-dialog{padding:34px 23px;max-height:calc(100dvh - 24px);width:calc(100vw - 24px);}.brief-close{margin:-20px -6px 0 0;}.brief-fields{grid-template-columns:1fr;gap:17px;}.brief-steps{font-size:7px;gap:10px;}.brief-primary{width:100%;}.brief-eyebrow{font-size:8px;padding-right:35px;}}
</style>
<style>
html.miniverso-brief-open{overflow:hidden;}html.miniverso-brief-open,html.miniverso-brief-open *{cursor:auto!important;}html.miniverso-brief-open input,html.miniverso-brief-open textarea{cursor:text!important;}html.miniverso-brief-open button,html.miniverso-brief-open a{cursor:pointer!important;}
</style>
