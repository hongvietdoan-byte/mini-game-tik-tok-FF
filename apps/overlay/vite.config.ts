import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiPort = process.env.QUIZ_PORT ?? '8787';
const vitePort = Number(process.env.VITE_PORT ?? 5174);

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: vitePort,
    strictPort: true,
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
      '/assets': `http://127.0.0.1:${apiPort}`,
      '/ws': { target: `ws://127.0.0.1:${apiPort}`, ws: true },
    },
  },
});
