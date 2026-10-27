import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'host',
      remotes: {
        auth: 'http://localhost:5001/assets/remoteEntry.js',
        home: 'http://localhost:5002/assets/remoteEntry.js',
        recipes: 'http://localhost:5003/assets/remoteEntry.js',
        video: 'http://localhost:5004/assets/remoteEntry.js',
        admin: 'http://localhost:5005/assets/remoteEntry.js',
      },
      shared: {
        react: { singleton: true, requiredVersion: '^18.3.0', eager: true },
        'react-dom': { singleton: true, requiredVersion: '^18.3.0', eager: true },
        'react-router-dom': { singleton: true, eager: true },
      },
    }),
  ],
  build: {
    target: 'chrome89',
    minify: false,
    cssCodeSplit: false,
  },
  server: { port: 5000, strictPort: true },
});