import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    headers: {
      'X-Frame-Options': 'SAMEORIGIN',
      'Content-Security-Policy': "frame-ancestors 'self' *.questera.ai questera.ai;"
    }
  },
  preview: {
    headers: {
      'X-Frame-Options': 'SAMEORIGIN', 
      'Content-Security-Policy': "frame-ancestors 'self' *.questera.ai questera.ai;"
    }
  }
});