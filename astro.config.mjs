import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { isNoindexPath } from './src/lib/noindex';

export default defineConfig({
  site: 'https://toolsiam.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  adapter: cloudflare({ imageService: 'passthrough' }),
  // sitemap อ่าน noindex list ชุดเดียวกับ Base.astro → หน้า noindex ไม่มีทางหลุดเข้า sitemap (§7.3)
  integrations: [react(), sitemap({ filter: (page) => !isNoindexPath(new URL(page).pathname) })],
  vite: { plugins: [tailwindcss()] },
});
