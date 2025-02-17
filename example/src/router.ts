import { createRouter, createWebHashHistory } from 'vue-router';

import InitScene from './sences/InitScene.vue';
import ConfScene from './sences/ConfScene.vue';
import ChatScene from './sences/ChatScene.vue';

import { authed } from './services/imlib';

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: '/', name: 'index', component: InitScene },
    { path: '/conf', name: 'conf', component: ConfScene },
    { path: '/chat', name: 'main', component: ChatScene },
  ],
});

router.beforeEach((to, from, next) => {
  if (to.name === 'main' && !authed.value) {
    next('/');
    return;
  }
  if (to.name !== 'main' && authed.value) {
    next('/chat');
    return;
  }
  if (to.name === 'conf' && from.name !== 'index') {
    next('/');
    return;
  }
  next();
});

export default router;
