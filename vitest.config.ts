import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // .test.ts = ตรรกะล้วน รันบน node · .test.tsx = คอมโพเนนต์ ประกาศ jsdom
    // ไว้ที่หัวไฟล์ด้วย `// @vitest-environment jsdom` เป็นรายไฟล์
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
