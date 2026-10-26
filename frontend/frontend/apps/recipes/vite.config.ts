import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    vue(),
    federation({
      name: 'recipes',
      filename: 'remoteEntry.js',
      exposes: {
        './mount': './src/mount.ts',
      },
      shared: {
        vue: { singleton: true, requiredVersion: '^3.5.0', eager: true },
      },
    }),
  ],
  build: { target: 'chrome89', minify: false, cssCodeSplit: false },
  server: { port: 5003, strictPort: true, cors: true },
  preview: { port: 5003, strictPort: true },
});