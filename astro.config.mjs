import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readdirSync } from 'node:fs';
import { isNoindexPath } from './src/lib/noindex';
import { latestDrawPath } from './src/lib/sitemap';

// งวดล่าสุดชี้ canonical ไป /lottery/results จึงตัดออกจาก sitemap (ดู src/lib/sitemap.ts)
const canonicalElsewhere = latestDrawPath(readdirSync(new URL('./src/data/lottery/', import.meta.url)));

export default defineConfig({
  site: 'https://toolsiam.com',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  adapter: cloudflare({ imageService: 'passthrough' }),
  // sitemap อ่าน noindex list ชุดเดียวกับ Base.astro → หน้า noindex ไม่มีทางหลุดเข้า sitemap (§7.3)
  integrations: [
    react(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !isNoindexPath(path) && path !== canonicalElsewhere;
      },
    }),
    {
      name: 'toolsiam-isolated-dependency-cache',
      hooks: {
        // astro sync/build disable dependency discovery; sharing their cache with
        // a running dev server deletes the modules its browser/worker still use.
        'astro:config:setup': ({ command, updateConfig }) => {
          updateConfig({ vite: { cacheDir: `node_modules/.vite-toolsiam/${command}` } });
        },
      },
    },
  ],
  vite: {
    plugins: [tailwindcss()],
    worker: { format: 'es' },
    // workerd runner ถือ hash ของ optimize รอบแรกไว้ พอ vite ค้นพบ dep เพิ่มแล้ว
    // re-optimize รอบสอง ไฟล์ hash เก่าถูกลบ → dev server ตายตอน cold start
    // ประกาศ dep ที่ถูกค้นพบทีหลังไว้ล่วงหน้า ให้ optimize จบในรอบเดียว
    optimizeDeps: {
      include: ['astro/assets/services/noop', 'astro/logger/console', 'qrcode', 'promptpay-qr', 'jsqr'],
    },
  },
});
