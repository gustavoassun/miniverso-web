import { createRouter, createWebHistory } from 'vue-router';

import Home from './views/Home.vue';
import Login from './views/Login.vue';
import Dashboard from './views/Dashboard.vue';
import { hasAdminSession } from './utils/projectStore.js';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
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
    if (savedPosition) return savedPosition;
    if (to.hash) return { el: to.hash, top: 24, behavior: 'auto' };
    return { top: 0 };
  }
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !hasAdminSession()) return { name: 'Login', query: { redirect: to.fullPath } };
  if (to.name === 'Login' && hasAdminSession()) return { name: 'Dashboard' };
});

export default router;
