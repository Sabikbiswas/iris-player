import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';

const path = (file: string) => fileURLToPath(new URL(file, import.meta.url));

// The public showcase page in site/. It plays the skin from src/ through the <iris-skin> element.
export default defineConfig({
  root: path('./site'),
  base: './',
  publicDir: path('./site/public'),
  resolve: { alias: { '@': path('./src') } },
  build: {
    outDir: path('./dist-site'),
    emptyOutDir: true,
    rolldownOptions: { input: { index: path('./site/index.html'), embed: path('./site/embed.html') } },
  },
});
