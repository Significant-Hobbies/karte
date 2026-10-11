// @ts-check

import { fileURLToPath } from 'node:url';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';
import { normalizeBuiltLandingHtml } from '../scripts/normalize-landing-html.mjs';

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
  integrations: [
    sitemap(),
    react(),
    {
      name: 'karte-landing-html',
      hooks: {
        'astro:build:done': async ({ dir }) => {
          await normalizeBuiltLandingHtml(fileURLToPath(dir));
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    css: { transformer: 'lightningcss' },
    build: { cssMinify: 'lightningcss' },
  },
});
