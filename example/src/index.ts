import 'element-plus/dist/index.css';

import { createApp } from 'vue';
import ElementUI from 'element-plus';

import App from './App.vue';
import router from './router';

console.warn(`RCIMKit Demo version: ${__VERSION__}, commit: ${__COMMIT_ID__}`);

const app = createApp(App);

app.use(router);
app.use(ElementUI, { size: 'small' });
app.mount('#app');
