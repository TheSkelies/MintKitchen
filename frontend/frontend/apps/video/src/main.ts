import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VideoApp from './VideoApp.vue';

const app = createApp(VideoApp);
app.use(createPinia());
app.mount('#app');