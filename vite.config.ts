import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  define: {
    __OZON_ACCESS_DIAGNOSTICS__: JSON.stringify(mode === 'diagnostic'),
  },
  build: {
    emptyOutDir: true,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content.ts'),
      formats: ['iife'],
      name: 'OzonAccess',
      fileName: () => 'content.js',
    },
  },
  plugins: [
    {
      name: 'copy-manifest',
      closeBundle() {
        return import('node:fs/promises').then(({ copyFile }) =>
          copyFile(resolve(import.meta.dirname, 'manifest.json'), resolve(import.meta.dirname, 'dist/manifest.json')),
        );
      },
    },
  ],
}));
