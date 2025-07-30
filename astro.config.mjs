// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  prefetch: true,
  site: 'https://simoneballuer.netlify.app/',
  integrations: [sitemap()],
  experimental: {
    svg: true,
  },
  markdown: {
    // optional: ensure raw HTML is enabled
    // (it's true by default in Astro)
    rehypePlugins: [],
  },
});
