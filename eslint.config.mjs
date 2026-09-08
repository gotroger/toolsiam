// @ts-check
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import astro from 'eslint-plugin-astro';
import prettier from 'eslint-config-prettier';

/**
 * ESLint ของ ToolSiam
 *
 * เป้าหมายหลักไม่ใช่จับบั๊ก (typecheck + vitest ทำอยู่แล้ว) แต่คือกัน "drift"
 * ของหน้าตา/การเข้าถึง — กฎ jsx-a11y คือด่านที่กันไม่ให้ a11y ที่ทำไว้ค่อย ๆ เสื่อม
 * เวลาเพิ่มเครื่องมือใหม่
 *
 * ยังใช้ ESLint 9 เพราะ eslint-plugin-jsx-a11y 6.x รองรับถึง ^9 เท่านั้น
 * (พอปลั๊กอินขยับไป ^10 ค่อยอัป — ไม่มีอะไรในคอนฟิกนี้ต้องแก้)
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      '.astro/**',
      '.wrangler/**',
      'node_modules/**',
      'public/**',
      'scripts/**',
      'workers/**/dist/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },

  // ---------- React islands ----------
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,
      // ตัวแปรที่ตั้งใจไม่ใช้ ให้ขึ้นต้นด้วย _ แทนการปิดกฎทั้งกฎ
      // ignoreRestSiblings รองรับสำนวน `const { x, ...rest } = obj` ที่ตั้งใจตัด x ทิ้ง
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],

      /**
       * เป็น warn ไม่ใช่ error — โดยตั้งใจ
       *
       * 16 จุดที่ติดกฎนี้เกือบทั้งหมดคือสำนวนเดียวกัน: `useEffect(() => setX(todayInBangkok()), [])`
       * ซึ่งจงใจให้ค่าวันที่มาจากฝั่ง client เท่านั้น ไม่งั้น HTML ที่ SSR ไว้กับตอน hydrate
       * จะได้คนละวันเมื่อผู้ใช้ไม่ได้อยู่โซนเวลาไทย
       *
       * ทางแก้ที่ถูกจริงคือ useSyncExternalStore ซึ่งต้องรื้อทุกเครื่องมือที่ใช้วันที่
       * และมีเทสต์ TZ คุมอยู่ — เป็นงานของ Sprint 3 ไม่ใช่ของรอบนี้
       * ระหว่างนี้ให้ขึ้นเป็นคำเตือนไว้เพื่อไม่ให้ลืม แต่ไม่บล็อก CI
       */
      'react-hooks/set-state-in-effect': 'warn',
    },
  },

  // ---------- หน้า .astro ----------
  ...astro.configs['flat/recommended'],

  /**
   * jsx-a11y มาจากชุดของ eslint-plugin-astro ชุดเดียว ไม่ประกาศปลั๊กอินซ้ำเอง
   * ชุดนี้ไม่จำกัด `files` จึงคุมทั้ง .astro และ .tsx ด้วยกฎชุดเดียวกัน —
   * ถ้าประกาศ jsx-a11y เพิ่มเองสำหรับ .tsx ESLint จะฟ้อง "Cannot redefine plugin"
   */
  ...astro.configs['flat/jsx-a11y-recommended'],

  // ---------- ไฟล์เทสต์ ----------
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },

  // prettier ต้องอยู่ท้ายสุด — ปิดกฎที่ชนกับการจัดรูปแบบ
  prettier,
);
