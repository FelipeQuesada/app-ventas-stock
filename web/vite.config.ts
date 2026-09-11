import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@advance-coat/shared': fileURLToPath(new URL('../shared/src', import.meta.url)),
    },
  },
  server: {
    // Evita CORS: el browser llama a /api/tiendanube y Vite reenvía a la API real
    proxy: {
      '/api/tiendanube': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api\/tiendanube/, ''),
      },
    },
  },
});
