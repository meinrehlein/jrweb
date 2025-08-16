// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  devToolbar: {
    enabled: false
  },
  prefetch: true,
  site: 'https://jannisreinelt.netlify.app/',
  integrations: [sitemap()],
  experimental: {
    svg: true,
  },
  markdown: {
    rehypePlugins: [],
  },
  vite: {
    ssr: {
      external: ['react-dom/server', 'react/jsx-runtime'],
    },
  },
});
