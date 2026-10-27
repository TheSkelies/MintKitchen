/**
 * Отдельный вход для запуска recipes-модуля (для отладки).
 * В продакшене его загружает host через Module Federation.
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RecipesApp from './RecipesApp.vue';

const app = createApp(RecipesApp);
app.use(createPinia());
app.mount('#app');