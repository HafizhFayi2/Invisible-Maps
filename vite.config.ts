import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss(), basicSsl()],
  resolve: {
    // Force single instance of React/Router to prevent "Invalid hook call"
    dedupe: ['react', 'react-dom', 'react-router-dom', 'react-leaflet'],
    alias: {
      '@': path.resolve('./src'),
    },
  },
  server: {
    https: true,
    fs: {
      // Allow Vite to serve files from the desktop/ directory (outside src/)
      allow: ['.'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
});

