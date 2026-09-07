import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://toolsiam.com',
  output: 'static',
  adapter: cloudflare({ imageService: 'passthrough' }),
  integrations: [react(), sitemap()],
  vite: { plugins: [tailwindcss()] },
});
