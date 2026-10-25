import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({
  plugins: [react()],
  resolve: {
    dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    hmr: { host: 'localhost', clientPort: 5173, protocol: 'ws' },
  },
});
