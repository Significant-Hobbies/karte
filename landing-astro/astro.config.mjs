// @ts-check

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

// Static landing assets are copied into OpenNext by the overlay script.
export default defineConfig({
  site: 'https://karte.cc',
  output: 'static',
  trailingSlash: 'never',
  // Emit `about.html` rather than `about/index.html` — no 308 redirect
  // on every link. Same as sarthakagrawal.pages.dev.
  build: {
    format: 'file',
  },
  integrations: [sitemap(), react()],
  vite: {
    plugins: [tailwindcss()],
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
  },
});
