import { nextTick } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';

import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue';
import Projects from './views/Projects.vue';
import ProjectDetail from './views/ProjectDetail.vue';
import { hasAdminSession } from './utils/projectStore.js';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/projetos',
    name: 'Projects',
    component: Projects
  },
  {
    path: '/projetos/:id',
    name: 'Project',
    component: ProjectDetail
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  }
];

const router = createRouter({
  // O createWebHistory garante que a URL fique limpa (ex: /login) sem aquele "#" antigo
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // Ao abrir ou recarregar o site na Home, começa sempre pela capa da abertura.
    if (!from.matched.length && to.name === 'Home' && !to.hash) return { top: 0 };
    // Na Home, tirar o "#seção" do endereço (depois das transições da abertura) não mexe na rolagem.
    if (from.name === 'Home' && to.name === 'Home' && from.hash && !to.hash) return false;
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, top: 24, behavior: 'auto' };
    // Página nova começa no topo na hora ('instant'): sem isso a rolagem suave do CSS "arrastava" a página para cima
    // na frente da pessoa ao abrir um projeto.
    return { top: 0, behavior: 'instant' };
  }
});

// Troca suave entre a lista de projetos e as páginas de cada projeto: a página atual se dissolve e a nova aparece
// (View Transitions do navegador; onde não existe, a troca é direta). A rolagem para o topo acontece escondida.
const softPages = ['Projects', 'Project'];
const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
let finishSwap = null;
router.beforeResolve((to, from) => {
  if (calm || typeof document === 'undefined' || !document.startViewTransition) return;
  if (!softPages.includes(to.name) || !softPages.includes(from.name) || to.fullPath === from.fullPath) return;
  return new Promise(resolve => {
    document.startViewTransition(() => new Promise(done => { finishSwap = done; resolve(); }));
  });
});
// Libera a troca assim que o Vue desenhar a página nova. (Não esperar um quadro de animação aqui: durante a troca o
// navegador pausa os quadros, e a espera travava a navegação por uns segundos até o tempo limite.)
router.afterEach(async () => {
  if (!finishSwap) return;
  await nextTick();
  const done = finishSwap; finishSwap = null; done();
});

router.beforeEach((to, from) => {
  // Abrir ou recarregar a Home com "#seção" no endereço começa pela capa (o endereço fica limpo); os links do menu,
  // já com o site aberto, continuam indo direto para a seção.
  if (!from.matched.length && to.name === 'Home' && to.hash) return { path: '/', query: to.query, replace: true };
  if (to.meta.requiresAuth && !hasAdminSession()) return { name: 'Login', query: { redirect: to.fullPath } };
  if (to.name === 'Login' && hasAdminSession()) return { name: 'Dashboard' };
});

export default router;
