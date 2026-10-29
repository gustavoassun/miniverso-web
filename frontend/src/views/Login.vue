<template>
  <section class="login-page" aria-labelledby="login-title">
    <div class="login-visual">
      <img src="/images/miniverso-logo.png" alt="Miniverso" />
      <p class="eyebrow">Portal do estúdio / acesso restrito</p>
      <h1 id="login-title">Organize mundos.<br><span>Acompanhe entregas.</span></h1>
      <p>Um espaço para cuidar do portfólio e tornar cada etapa dos projetos visível para a equipe.</p>
      <div class="signal" aria-hidden="true"><i/><i/><i/><i/><i/></div>
    </div>
    <form class="login-card" @submit.prevent="submit">
      <p class="step">IDENTIFICAÇÃO / 01</p>
      <h2>Entrar no painel</h2>
      <p class="demo-note">Demonstração local. A autenticação segura pelo servidor será conectada na próxima etapa.</p>
      <label>E-mail<input v-model.trim="email" type="email" autocomplete="username" required placeholder="admin@demo.miniverso.local"></label>
      <label>Senha<input v-model="password" type="password" autocomplete="current-password" required placeholder="••••••••"></label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <button type="submit">Acessar painel <span aria-hidden="true">↗</span></button>
      <button class="demo-fill" type="button" @click="fillDemo">Preencher acesso de demonstração</button>
    </form>
  </section>
</template>
<script setup>
import { ref } from 'vue'; import { useRouter } from 'vue-router'; import { SESSION_KEY } from '../utils/projectStore.js';
const router=useRouter(); const email=ref(''); const password=ref(''); const error=ref('');
const fillDemo=()=>{email.value='admin@demo.miniverso.local';password.value='portal2026';error.value=''};
const submit=()=>{if(email.value==='admin@demo.miniverso.local'&&password.value==='portal2026'){sessionStorage.setItem(SESSION_KEY,'active');router.push('/dashboard');return}error.value='Use o acesso de demonstração indicado abaixo.'};
</script>
<style scoped>
.login-page{min-height:calc(100vh - 180px);display:grid;grid-template-columns:minmax(0,1.15fr) minmax(340px,.85fr);gap:clamp(40px,8vw,110px);align-items:center;padding:clamp(70px,9vw,130px) 7%;color:#e9f5fb;background:radial-gradient(circle at 18% 40%,#173c5266,transparent 35%),#07131f}.login-visual img{width:min(280px,62%);height:auto}.eyebrow,.step{font:9px var(--font-mono);letter-spacing:.14em;text-transform:uppercase;color:#91dced}.eyebrow{margin:50px 0 18px}.login-visual h1{margin:0;font-family:var(--font-title);font-size:clamp(54px,7.8vw,102px);font-weight:500;line-height:.95;letter-spacing:.005em}.login-visual h1 span{color:#9edbed}.login-visual>p:last-of-type{max-width:48ch;color:#9fb8c5;line-height:1.7}.signal{display:flex;gap:7px;margin-top:40px}.signal i{width:38px;height:2px;background:#8ee1f2;opacity:.25}.signal i:nth-child(2),.signal i:nth-child(4){opacity:.7}.login-card{padding:clamp(28px,4vw,48px);border:1px solid #7ecbe04a;border-radius:5px 28px 5px 5px;background:#0d2230cc;box-shadow:0 30px 80px #0008}.login-card h2{font-size:32px;margin:12px 0 8px;font-weight:500}.demo-note{color:#8faab7;font-size:12px;line-height:1.6;margin:0 0 30px}.login-card label{display:grid;gap:9px;margin:18px 0;color:#b9d1dc;font-size:12px}.login-card input{min-height:50px;border:1px solid #7cbdd144;border-radius:10px;padding:0 14px;color:#eefbff;background:#071722}.login-card button{width:100%;min-height:50px;margin-top:12px;border:0;border-radius:999px;color:#07131f;background:#a8e4ef;cursor:pointer;font-weight:650}.login-card .demo-fill{color:#9bd6e6;background:transparent;border:1px solid #76bfd044}.error{color:#ffb5b5;font-size:12px}@media(max-width:760px){.login-page{grid-template-columns:1fr;padding:65px 6%}.login-visual h1{font-size:57px}.login-card{padding:26px}}
</style>
