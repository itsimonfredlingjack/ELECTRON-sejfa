import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Keep Socket.IO client (and ws) unbundled in main so optional peer deps
      // like `bufferutil`/`utf-8-validate` remain truly optional (ws uses try/catch require).
      external: ['socket.io-client', 'engine.io-client', 'ws', 'bufferutil', 'utf-8-validate'],
    },
  },
});
