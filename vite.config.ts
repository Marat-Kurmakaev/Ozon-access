import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
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
});
