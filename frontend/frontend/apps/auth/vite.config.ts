import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'auth',
      filename: 'remoteEntry.js',
      exposes: {
        './AuthApp': './src/AuthApp.tsx',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.3.0', eager: true },
      },
    }),
  ],
  build: {
    target: 'chrome89',
    minify: false,
    cssCodeSplit: false,
  },
  server: { port: 5001, strictPort: true, cors: true },
  preview: { port: 5001, strictPort: true },
});