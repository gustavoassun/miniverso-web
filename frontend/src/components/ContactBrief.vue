<script setup>
// "Conte sua ideia": uma conversa em 3 passos (quem é você, que mundo quer criar, a ideia) que termina numa
// mensagem pronta para enviar por e-mail ou copiar. Nada é enviado nem salvo automaticamente.
import { computed, nextTick, onUnmounted, reactive, ref } from 'vue';
const dialog = ref(null);
const step = ref(0); // 0, 1, 2 = passos; 3 = pronto
const dir = ref(1);
const feedback = ref('');
const copied = ref(false);
const details = reactive({ name: '', company: '', email: '', kind: '', when: '', project: '' });
const STEPS = ['Quem é você', 'Seu mundo', 'Sua ideia'];
const KINDS = [
  { id: 'Treinamento e simulação', icon: 'M4 18h16M6 18V9l6-4 6 4v9M10 18v-5h4v5', hint: 'Equipes praticando com segurança' },
  { id: 'Evento e ativação de marca', icon: 'M12 3l2.4 5 5.6.8-4 3.9.9 5.5L12 15.6 7.1 18.2l.9-5.5-4-3.9 5.6-.8z', hint: 'Experiências que viram assunto' },
  { id: 'Educação', icon: 'M3 9l9-5 9 5-9 5zM7 11.5V16c0 1.5 2.5 3 5 3s5-1.5 5-3v-4.5', hint: 'Aprender vivendo a experiência' },
  { id: 'Cultura e turismo 360°', icon: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM4 12h16M12 4c2.5 2.5 2.5 13.5 0 16M12 4c-2.5 2.5-2.5 13.5 0 16', hint: 'Lugares e histórias em 360°' },
  { id: 'Jogo e gamificação', icon: 'M7 8h10a4 4 0 0 1 4 4l.5 3a2 2 0 0 1-3.5 1.6L16 15H8l-2 1.6A2 2 0 0 1 2.5 15L3 12a4 4 0 0 1 4-4zM7 11v3M5.5 12.5h3M16 12h.01M18 14h.01', hint: 'Desafios que engajam' },
  { id: 'Outra ideia', icon: 'M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3zM9.5 19h5M10.5 21.5h3', hint: 'Algo que ainda está tomando forma' }
];
const WHEN = ['Até 1 mês', '1 a 3 meses', 'Mais de 3 meses', 'Ainda não sei'];
const PROMPTS = ['Para quem é a experiência?', 'O que a pessoa deve sentir?', 'Onde ela vai acontecer?'];
const message = computed(() => [
  'Olá, Miniverso! Quero conversar sobre uma ideia.',
  '', `Nome: ${details.name.trim()}`,
  `Empresa: ${details.company.trim() || 'Não informado'}`,
  `E-mail de retorno: ${details.email.trim()}`,
  `Tipo de experiência: ${details.kind || 'Não informado'}`,
  `Prazo: ${details.when || 'Não informado'}`,
  '', 'Minha ideia:', details.project.trim()
].join('\n'));
const emailUrl = computed(() => `mailto:contato@meuminiverso.com?subject=${encodeURIComponent('Uma nova ideia — ' + details.name.trim())}&body=${encodeURIComponent(message.value)}`);
const emailOk = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim()));
const firstName = computed(() => details.name.trim().split(/\s+/)[0] || '');

function open() {
  step.value = 0; feedback.value = ''; copied.value = false;
  dialog.value?.showModal();
  document.documentElement.classList.add('miniverso-brief-open');
  nextTick(() => dialog.value?.querySelector('input')?.focus());
}
function closed() { document.documentElement.classList.remove('miniverso-brief-open'); }
function close() { dialog.value?.close(); }
function backdrop(event) {
  if (event.target !== dialog.value) return;
  const box = dialog.value.getBoundingClientRect();
  if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) close();
}
function check() {
  if (step.value === 0) {
    if (!details.name.trim()) return 'Como podemos te chamar?';
    if (!emailOk.value) return 'Coloque um e-mail válido para a gente responder.';
  }
  if (step.value === 1 && !details.kind) return 'Escolha o tipo de experiência que mais combina com a sua ideia.';
  if (step.value === 2 && details.project.trim().length < 20) return 'Conte um pouco mais: pelo menos 20 caracteres.';
  return '';
}
async function next() {
  feedback.value = check(); if (feedback.value) return;
  dir.value = 1; step.value++;
  await nextTick(); dialog.value.scrollTop = 0;
  dialog.value.querySelector('.pane input, .pane textarea, .pane button')?.focus();
}
async function back() { feedback.value = ''; dir.value = -1; step.value = Math.max(0, step.value - 1); await nextTick(); dialog.value.scrollTop = 0; }
function pickKind(k) { details.kind = k; feedback.value = ''; }
function addPrompt(p) { details.project = (details.project.trim() ? details.project.trim() + '\n' : '') + p + ' '; nextTick(() => { const ta = dialog.value.querySelector('textarea'); ta?.focus(); ta?.setSelectionRange(ta.value.length, ta.value.length); }); }
async function copy() {
  try { await navigator.clipboard.writeText(message.value); copied.value = true; feedback.value = 'Mensagem copiada. Agora é só colar no canal que preferir.'; }
  catch { feedback.value = 'Não deu para copiar automaticamente. Selecione a mensagem e copie.'; }
}
onUnmounted(closed);
defineExpose({ open });
</script>

<template>
  <Teleport to="body">
    <dialog ref="dialog" class="contact-dialog" aria-labelledby="brief-title" @close="closed" @click="backdrop">
      <div class="deco" aria-hidden="true"><span class="planet" /><span class="ring" /><i v-for="n in 14" :key="n" :style="{ '--x': (n * 37) % 100 + '%', '--y': (n * 53) % 100 + '%', '--d': (n % 5) * .6 + 's' }" /></div>
      <button class="brief-close" type="button" aria-label="Fechar" @click="close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18" /></svg></button>

      <header class="brief-head">
        <p class="eyebrow">Conte sua ideia</p>
        <h2 id="brief-title">
          <template v-if="step === 3">Sua ideia está pronta<br><em>para decolar.</em></template>
          <template v-else-if="step === 0">Toda experiência começa<br>com <em>uma ideia.</em></template>
          <template v-else-if="step === 1">{{ firstName ? firstName + ', que' : 'Que' }} mundo<br><em>você quer criar?</em></template>
          <template v-else>Agora conte<br><em>a sua ideia.</em></template>
        </h2>
        <ol v-if="step < 3" class="steps" aria-label="Etapas">
          <li v-for="(s, i) in STEPS" :key="s" :class="{ done: i < step, now: i === step }" :aria-current="i === step ? 'step' : null"><span class="dot">{{ i < step ? '✓' : i + 1 }}</span><span class="lbl">{{ s }}</span></li>
          <span class="bar" aria-hidden="true"><i :style="{ width: (step / 2) * 100 + '%' }" /></span>
        </ol>
      </header>

      <Transition :name="dir > 0 ? 'fwd' : 'bwd'" mode="out-in">
        <form v-if="step === 0" key="s0" class="pane" @submit.prevent="next">
          <div class="fields">
            <label class="full">Seu nome<input v-model="details.name" autocomplete="name" maxlength="100" placeholder="Como podemos te chamar?"></label>
            <label>E-mail para resposta<input v-model="details.email" type="email" autocomplete="email" maxlength="200" placeholder="voce@empresa.com"></label>
            <label><span>Empresa <small>(opcional)</small></span><input v-model="details.company" autocomplete="organization" maxlength="150" placeholder="Empresa ou projeto"></label>
          </div>
          <div class="actions"><span /><button class="primary" type="submit">Continuar <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button></div>
        </form>

        <form v-else-if="step === 1" key="s1" class="pane" @submit.prevent="next">
          <div class="kinds" role="radiogroup" aria-label="Tipo de experiência">
            <button v-for="k in KINDS" :key="k.id" type="button" role="radio" :aria-checked="details.kind === k.id" class="kind" :class="{ on: details.kind === k.id }" @click="pickKind(k.id)">
              <span class="k-ico" aria-hidden="true"><svg viewBox="0 0 24 24"><path :d="k.icon" /></svg></span>
              <b>{{ k.id }}</b><small>{{ k.hint }}</small>
            </button>
          </div>
          <p class="sub-label">Para quando? <small>(opcional)</small></p>
          <div class="pills" role="radiogroup" aria-label="Prazo">
            <button v-for="w in WHEN" :key="w" type="button" role="radio" :aria-checked="details.when === w" :class="{ on: details.when === w }" @click="details.when = details.when === w ? '' : w">{{ w }}</button>
          </div>
          <div class="actions"><button class="ghost" type="button" @click="back">Voltar</button><button class="primary" type="submit">Continuar <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button></div>
        </form>

        <form v-else-if="step === 2" key="s2" class="pane" @submit.prevent="next">
          <label class="idea">
            <span class="sr-only">Sua ideia</span>
            <textarea v-model="details.project" rows="6" maxlength="4000" placeholder="Pode ser um treinamento, um jogo, uma ativação de marca ou algo que ainda está tomando forma." />
            <span class="count" :class="{ ok: details.project.trim().length >= 20 }">{{ details.project.trim().length }} caracteres</span>
          </label>
          <p class="sub-label">Precisa de uma ajuda para começar?</p>
          <div class="pills">
            <button v-for="p in PROMPTS" :key="p" type="button" @click="addPrompt(p)">+ {{ p }}</button>
          </div>
          <div class="actions"><button class="ghost" type="button" @click="back">Voltar</button><button class="primary" type="submit">Ver minha mensagem <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg></button></div>
        </form>

        <div v-else key="s3" class="pane done">
          <div class="summary">
            <div class="sum-row"><span>De</span><b>{{ details.name }}<template v-if="details.company"> · {{ details.company }}</template></b></div>
            <div class="sum-row"><span>Mundo</span><b>{{ details.kind }}<template v-if="details.when"> · {{ details.when }}</template></b></div>
            <div class="sum-idea"><span>Ideia</span><p>{{ details.project }}</p></div>
          </div>
          <div class="actions final">
            <a class="primary" :href="emailUrl">Enviar por e-mail <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4zM4 7l8 6 8-6" /></svg></a>
            <button class="ghost" type="button" @click="copy">{{ copied ? 'Copiado ✓' : 'Copiar mensagem' }}</button>
          </div>
          <button class="link" type="button" @click="back">← Voltar e editar</button>
          <p class="privacy">O botão de e-mail abre seu aplicativo com a mensagem pronta; copiar não envia nada. Seus dados não são salvos.</p>
        </div>
      </Transition>
      <p class="brief-feedback" role="status" aria-live="polite">{{ feedback }}</p>
    </dialog>
  </Teleport>
</template>

<style scoped>
.contact-dialog{--cyan:#00b7e3;--blue:#1e4488;--indigo:#1e1645;box-sizing:border-box;width:min(760px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:48px 48px 36px;border:1px solid #ffffff1a;border-radius:32px;background:radial-gradient(ellipse at 100% 0,#1e448866,transparent 55%),radial-gradient(ellipse at 0 100%,#1e1645,transparent 60%),#0a1024;color:#eef8fc;font-family:var(--font-body);box-shadow:0 40px 140px #000c;overflow:auto;overflow-x:hidden}
.contact-dialog[open]{animation:pop .5s cubic-bezier(.2,.9,.3,1.1)}
@keyframes pop{from{opacity:0;transform:translateY(24px) scale(.96)}}
.contact-dialog::backdrop{background:#03060ed9;backdrop-filter:blur(10px)}
.deco{position:absolute;inset:0;overflow:hidden;pointer-events:none;border-radius:inherit}
.deco i{position:absolute;left:var(--x);top:var(--y);width:2px;height:2px;border-radius:50%;background:#fff;opacity:.5;animation:tw 3s var(--d) ease-in-out infinite}
@keyframes tw{50%{opacity:.1}}
.planet{position:absolute;right:-70px;top:-70px;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#5fd4f0,#1e4488 45%,#1e1645 80%);opacity:.55;box-shadow:0 0 80px #00b7e333}
.ring{position:absolute;right:-130px;top:10px;width:340px;height:80px;border-radius:50%;border:1px solid #8ee1f255;transform:rotate(-18deg)}
.brief-close{position:sticky;top:0;float:right;z-index:3;display:grid;place-items:center;width:44px;height:44px;margin:-24px -24px 0 0;border:1px solid #ffffff22;border-radius:50%;color:#fff;background:#0a1024cc;backdrop-filter:blur(6px);cursor:pointer;transition:.2s}
.brief-close:hover{background:#ffffff18;transform:rotate(90deg)}
.brief-close svg{width:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
.brief-head{position:relative}
.eyebrow{display:inline-flex;align-items:center;gap:10px;margin:0 0 18px;color:var(--cyan);font-size:13px;font-weight:600;letter-spacing:.18em;text-transform:uppercase}
.eyebrow::before{content:'';width:28px;height:2px;background:linear-gradient(90deg,var(--cyan),var(--blue))}
h2{max-width:none;margin:0;font:500 clamp(42px,6vw,64px)/.95 var(--font-title);letter-spacing:.01em}
h2 em{font-style:normal;background:linear-gradient(90deg,#8ee1f2,var(--cyan) 50%,#5a7dd8);-webkit-background-clip:text;background-clip:text;color:transparent}
.steps{position:relative;display:grid;grid-template-columns:repeat(3,1fr);margin:32px 0 30px;padding:0;list-style:none}
.steps li{position:relative;z-index:1;display:grid;justify-items:center;gap:8px;color:#7f9aaa;font-size:13px;font-weight:600}
.dot{display:grid;place-items:center;width:34px;height:34px;border-radius:50%;border:2px solid #ffffff26;background:#0a1024;font-size:14px;transition:.4s}
.steps li.now{color:#fff}.steps li.now .dot{border-color:#fff;background:linear-gradient(135deg,var(--cyan),var(--blue));box-shadow:0 0 0 6px #00b7e322}
.steps li.done{color:#b9d3de}.steps li.done .dot{border-color:transparent;background:var(--cyan);color:#fff}
.bar{position:absolute;left:16.6%;right:16.6%;top:16px;height:2px;background:#ffffff14;border-radius:2px}
.bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,var(--blue),var(--cyan));transition:width .6s cubic-bezier(.2,.8,.2,1)}
.pane{position:relative}
.fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.full{grid-column:1/-1}
label{display:grid;gap:8px;color:#d3e4ec;font-size:14px;font-weight:600}
label small{font-weight:400;color:#86a2b1}
input,textarea{box-sizing:border-box;width:100%;min-height:56px;padding:14px 18px;border:1px solid #ffffff1c;border-radius:16px;background:#070c1acc;color:#eef8fc;font:16px/1.5 var(--font-body);transition:border-color .2s,box-shadow .2s}
textarea{resize:vertical;min-height:170px}
input::placeholder,textarea::placeholder{color:#677f8f}
input:focus,textarea:focus{outline:none;border-color:var(--cyan);box-shadow:0 0 0 4px #00b7e326}
.kinds{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.kind{position:relative;display:grid;justify-items:start;gap:6px;padding:18px;border:1px solid #ffffff18;border-radius:20px;background:#0b1430b3;color:#eef8fc;font:inherit;text-align:left;cursor:pointer;transition:transform .25s,border-color .25s,background .25s,box-shadow .25s}
.kind:hover{transform:translateY(-3px);border-color:#ffffff38}
.kind.on{border-color:var(--cyan);background:linear-gradient(160deg,#00b7e322,#1e448822);box-shadow:0 12px 30px #00b7e322}
.kind.on::after{content:'✓';position:absolute;top:14px;right:14px;display:grid;place-items:center;width:24px;height:24px;border-radius:50%;background:var(--cyan);color:#fff;font-size:13px;font-weight:700}
.k-ico{display:grid;place-items:center;width:44px;height:44px;margin-bottom:6px;border-radius:14px;background:linear-gradient(135deg,var(--cyan),var(--blue) 60%,var(--indigo))}
.k-ico svg{width:22px;fill:none;stroke:#fff;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
.kind b{font-size:15px;line-height:1.25}
.kind small{color:#8fa9b8;font-size:13px;line-height:1.4}
.sub-label{margin:26px 0 12px;color:#d3e4ec;font-size:14px;font-weight:600}
.sub-label small{font-weight:400;color:#86a2b1}
.pills{display:flex;flex-wrap:wrap;gap:8px}
.pills button{min-height:42px;padding:0 18px;border:1px solid #ffffff1f;border-radius:99px;color:#c3d6e0;background:transparent;font:inherit;font-size:14px;cursor:pointer;transition:.2s}
.pills button:hover{color:#fff;border-color:#ffffff44}
.pills button.on{color:#fff;border-color:transparent;background:linear-gradient(90deg,var(--cyan),var(--blue))}
.idea{position:relative}
.count{justify-self:end;color:#7f9aaa;font-size:13px;font-weight:500}
.count.ok{color:#79e7ba}
.actions{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:30px}
.primary{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-height:56px;padding:0 28px;border:0;border-radius:99px;color:#fff;background:linear-gradient(90deg,var(--cyan),var(--blue));font:700 16px var(--font-body);text-decoration:none;cursor:pointer;box-shadow:0 14px 34px #00b7e333;transition:transform .2s,box-shadow .2s}
.primary:hover{transform:translateY(-2px);box-shadow:0 18px 40px #00b7e344}
.primary svg{width:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.ghost{min-height:56px;padding:0 24px;border:1px solid #ffffff26;border-radius:99px;color:#e6f3f9;background:transparent;font:600 15px var(--font-body);cursor:pointer;transition:.2s}
.ghost:hover{background:#ffffff10;border-color:#ffffff44}
.link{display:block;margin:18px 0 0;padding:6px 0;border:0;color:#9fd8e8;background:none;font:15px var(--font-body);cursor:pointer}
.link:hover{color:#fff}
.summary{display:grid;gap:2px;overflow:hidden;border:1px solid #ffffff18;border-radius:22px;background:#0b1430b3}
.sum-row,.sum-idea{display:grid;grid-template-columns:90px 1fr;gap:14px;padding:16px 20px;border-bottom:1px solid #ffffff10}
.sum-idea{border:0}
.sum-row span,.sum-idea span{color:var(--cyan);font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;padding-top:3px}
.sum-row b{font-size:16px}
.sum-idea p{margin:0;color:#d6e6ee;font-size:15px;line-height:1.6;white-space:pre-wrap;max-height:180px;overflow:auto}
.final{justify-content:flex-start;flex-wrap:wrap}
.privacy{margin:18px 0 0;color:#7f9aaa;font-size:13px;line-height:1.6}
.brief-feedback{margin:16px 0 0;color:#ffd58a;font-size:14px}
.brief-feedback:empty{display:none}
.done ~ .brief-feedback{color:#9ef0cc}
.fwd-enter-active,.fwd-leave-active,.bwd-enter-active,.bwd-leave-active{transition:opacity .3s,transform .3s cubic-bezier(.2,.8,.2,1)}
.fwd-enter-from,.bwd-leave-to{opacity:0;transform:translateX(30px)}
.fwd-leave-to,.bwd-enter-from{opacity:0;transform:translateX(-30px)}
@media(max-width:700px){.contact-dialog{padding:34px 20px 26px;width:calc(100vw - 20px);max-height:calc(100dvh - 20px);border-radius:26px}.brief-close{margin:-16px -4px 0 0}.fields{grid-template-columns:1fr}.kinds{grid-template-columns:1fr 1fr}.kind{padding:14px}.kind small{display:none}.steps .lbl{font-size:11px}.actions{flex-direction:column-reverse;align-items:stretch}.actions span{display:none}.final{flex-direction:column}.sum-row,.sum-idea{grid-template-columns:1fr;gap:4px}}
@media(prefers-reduced-motion:reduce){.contact-dialog[open],.deco i{animation:none}}
</style>
<style>
html.miniverso-brief-open{overflow:hidden;}html.miniverso-brief-open,html.miniverso-brief-open *{cursor:auto!important;}html.miniverso-brief-open input,html.miniverso-brief-open textarea{cursor:text!important;}html.miniverso-brief-open button,html.miniverso-brief-open a{cursor:pointer!important;}
</style>
