import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// The build lands in app/static/dist with fixed names so the Jinja template can reference /static/dist/app.js without a manifest.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../app/static/dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'src/main.tsx',
      output: { entryFileNames: 'app.js', chunkFileNames: 'chunk-[hash].js', assetFileNames: 'app[extname]' },
    },
  },
  // npm run dev: Vite serves the UI, FastAPI (uvicorn on :8010) serves API, images and the shared CSS.
  server: { proxy: { '/api': 'http://127.0.0.1:8010', '/static': 'http://127.0.0.1:8010' } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
});
