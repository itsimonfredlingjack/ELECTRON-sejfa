import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vitejs.dev/config
export default defineConfig(async () => {
  // `@tailwindcss/vite` is ESM-only; dynamically importing avoids CJS require() issues
  // when Electron Forge loads the Vite config.
  const { default: tailwindcss } = await import('@tailwindcss/vite');

  return {
    plugins: [react(), tailwindcss()],
    server: { port: 5180 },
    test: {
      environment: 'jsdom',
      globals: true,
    },
  };
});
