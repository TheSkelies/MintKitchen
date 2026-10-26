import { createApp } from 'vue';
import { createPinia } from 'pinia';
import VideoApp from './VideoApp.vue';

export function mount(el: HTMLElement): () => void {
  const app = createApp(VideoApp);
  app.use(createPinia());
  app.mount(el);
  return () => app.unmount();
}