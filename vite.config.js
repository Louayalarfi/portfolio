import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: { main: 'index.html', preview: 'preview.html', die: 'die.html' },
      output: {
        manualChunks: { three: ['three'] }
      }
    }
  }
});
