import { createApp } from 'vue';
import AdminApp from './AdminApp.vue';

export function mount(el: HTMLElement): () => void {
  const app = createApp(AdminApp);
  app.mount(el);
  return () => app.unmount();
}