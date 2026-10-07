import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: __dirname,
  server: {
    port: 5173,
    strictPort: true,
    open: true,
    host: 'localhost',
    hmr: {
      protocol: 'ws',
      host: 'localhost',
      port: 5173,
      clientPort: 5173,
    },
    fs: { allow: [path.resolve(__dirname, '..')] },
    proxy: {
      // '/api' alone also matches /api.js — use trailing slash / exact API paths
      '/api/': 'http://localhost:8787',
      '/api/health': 'http://localhost:8787',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        cameraDebug: path.resolve(__dirname, 'camera-debug.html'),
      },
    },
  },
});
