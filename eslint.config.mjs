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
       * เป็น error — สำนวน `useEffect(() => setX(...), [])` ถูกถอนออกหมดแล้ว
       *
       * ค่าที่ต้องมาจากฝั่ง client อย่าง "วันนี้ตามเวลาไทย" ใช้ `useSyncExternalStore`
       * ผ่าน hook ใน src/lib/use-today.ts แทน ดูเหตุผลเต็มในไฟล์นั้น
       */
      'react-hooks/set-state-in-effect': 'error',
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
