// Vite configuration with proxy for API calls
import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  sourcemap: true,
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  build: {
    sourcemap: true
  },
  server: {
    proxy: {
      '/api': {
        target: process.env.API_TARGET || "http://127.0.0.1:8000",
        changeOrigin: true,
        secure: false
      }
    }
  }
});
