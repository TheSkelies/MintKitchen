import { createApp } from 'vue';
import { createPinia } from 'pinia';
import RecipesApp from './RecipesApp.vue';

/**
 * Функция монтирования Vue-приложения recipes
 * в произвольный DOM-элемент. Используется host'ом (React).
 */
export function mount(el: HTMLElement): () => void {
  const app = createApp(RecipesApp);
  app.use(createPinia());
  app.mount(el);
  return () => app.unmount();
}