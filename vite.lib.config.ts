import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// The drop-in script: dist-site/iris.js defines <iris-skin> with the player, Mux media and styles.
export default defineConfig({
  resolve: { alias: { '@': path('./src') } },
  publicDir: false,
  build: {
    outDir: path('./dist-site'),
    emptyOutDir: false,
    copyPublicDir: false,
    minify: 'oxc',
    lib: { entry: path('./src/iris.ts'), formats: ['es'], fileName: () => 'iris.js' },
    rolldownOptions: { output: { chunkFileNames: 'iris-chunks/[name]-[hash].js', minify: true } },
  },
});
