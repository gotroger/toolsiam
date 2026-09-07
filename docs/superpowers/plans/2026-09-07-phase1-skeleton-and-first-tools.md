# ToolSiam Phase 1 — Skeleton + 5 เครื่องมือแรก + Deploy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เว็บ toolsiam.com ขึ้นจริงบน Cloudflare Workers พร้อมโครง Astro, tool registry, หน้า SEO ภาษาไทย, sitemap และเครื่องมือ 5 ตัวแรก (บาทถ้วน, ผ่อนบ้าน/รถ, ภาษีเงินได้, QR PromptPay, JSON formatter) — ยังไม่มี auth/billing (Phase 2/3 มีแผนแยก)

**Architecture:** Astro 7 (output static, ทุกหน้า prerender) + `@astrojs/cloudflare` adapter deploy เป็น Worker เดียว. เครื่องมือแต่ละตัว = โฟลเดอร์ `src/tools/<category>/<slug>/` มี `logic.ts` (pure, มี test), `meta.ts` (SEO/registry), `Tool.tsx` (React island). `registry.ts` เป็น single source of truth ที่ generate หน้า `/t/[slug]`, `/c/[category]`, `/tools`, sitemap. Island เดียว `ToolIsland.tsx` เลือก component ตาม slug ด้วย `React.lazy` (Astro ไม่รองรับ `client:*` บน dynamic tag).

**Tech Stack:** Node 22.16, npm (ไม่มี pnpm ในเครื่อง), Astro ^7.3.1, @astrojs/cloudflare ^14.3.0, @astrojs/react ^6.0.5, @astrojs/sitemap ^3.7.4, React ^19.2, Tailwind ^4.3 ผ่าน `@tailwindcss/vite`, TypeScript ^5.9 (ห้ามใช้ TS 7 — เพิ่งออก ยังไม่รู้ผลกับ astro), vitest ^5.0, wrangler ^4.129, fuse.js ^7.5, promptpay-qr ^0.5, qrcode ^1.5

**Spec:** `docs/superpowers/specs/2026-09-07-toolsiam-design.md` (หัวข้อ 2, 4, 8, 9 เฟส 1, 12)

## Global Constraints

- Package manager: **npm** เท่านั้น (commit `package-lock.json`)
- ทุกไฟล์ `logic.ts` ต้องเป็น pure function ไม่แตะ DOM/window และมี `logic.test.ts` คู่กัน — เขียน test ก่อนเสมอ
- ข้อความ UI ทั้งหมดเป็น **ภาษาไทย**; slug เป็น kebab-case ภาษาอังกฤษ
- หน้า `/t/<slug>` ต้องมีเนื้อหาไทย (คำอธิบาย, วิธีใช้, FAQ) ใน HTML โดยไม่ต้องรัน JS
- ห้ามใช้ `@astrojs/tailwind` (deprecated) — ใช้ `@tailwindcss/vite`
- ห้ามใช้ Node API (`Buffer`, `node:crypto`) ในโค้ดที่จะรันบน Worker/browser
- Commit ทุก task; message รูปแบบ `feat|chore|docs|test: ...` ลงท้ายด้วย `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- Path alias `@/` = `src/`

---

## File Structure (ผลลัพธ์เมื่อจบ Phase 1)

```
ToolSiam/
├── package.json, package-lock.json, tsconfig.json, astro.config.mjs, vitest.config.ts, wrangler.jsonc
├── public/  favicon.svg, robots.txt
├── src/
│   ├── styles/global.css                  Tailwind + ฟอนต์
│   ├── layouts/Base.astro                 <head> SEO, header/footer
│   ├── components/
│   │   ├── Header.astro, Footer.astro
│   │   ├── ToolCard.astro                 การ์ดเครื่องมือ (ใช้ใน index, /tools, /c/*)
│   │   ├── ToolShell.astro                กรอบหน้าเครื่องมือ: h1, badge, island, วิธีใช้, FAQ, related
│   │   ├── ToolSearch.tsx                 island ค้นหา (Fuse.js) — SSR รายการเต็มเพื่อ SEO
│   │   └── ui.tsx                         Input/Textarea/Select/Label/Button/ResultBox/Stat
│   ├── lib/
│   │   ├── format.ts (+ .test.ts)         formatBaht, formatNumber
│   │   └── seo.ts (+ .test.ts)            JSON-LD builders
│   ├── tools/
│   │   ├── types.ts                       ToolMeta, CategoryMeta, CategoryId, Tier
│   │   ├── categories.ts                  8 หมวด
│   │   ├── registry.ts (+ .test.ts)       tools[], getTool, getToolsByCategory
│   │   ├── loaders.ts (+ ตรวจใน registry.test.ts)  slug → () => import('./.../Tool')
│   │   ├── ToolIsland.tsx                 React.lazy ตาม slug
│   │   ├── text/baht-text/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}
│   │   ├── finance/loan-installment/{...}
│   │   ├── finance/thai-income-tax/{...}
│   │   ├── qr/promptpay-qr/{...}
│   │   └── dev/json-formatter/{...}
│   ├── types/promptpay-qr.d.ts
│   └── pages/
│       ├── index.astro, tools.astro, pricing.astro
│       ├── c/[category].astro
│       └── t/[slug].astro
└── docs/superpowers/{specs,plans}/
```

---

### Task 1: Project scaffold (Astro + React + Tailwind + Cloudflare adapter)

**Files:**
- Create: `package.json`, `tsconfig.json`, `astro.config.mjs`, `vitest.config.ts`, `src/styles/global.css`, `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/pages/index.astro`, `public/favicon.svg`, `public/robots.txt`
- Modify: `.gitignore` (มีอยู่แล้ว)

**Interfaces:**
- Produces: `Base.astro` props `{ title: string; description: string; jsonLd?: object[] }` — ทุกหน้าใช้ layout นี้; alias `@/` ใช้ได้ทั้ง astro/ts/tsx/vitest

- [ ] **Step 1: สร้าง package.json**

```json
{
  "name": "toolsiam",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro build && wrangler dev",
    "deploy": "astro build && wrangler deploy",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^14.3.0",
    "@astrojs/react": "^6.0.5",
    "@astrojs/sitemap": "^3.7.4",
    "@tailwindcss/vite": "^4.3.3",
    "astro": "^7.3.1",
    "fuse.js": "^7.5.0",
    "promptpay-qr": "^0.5.0",
    "qrcode": "^1.5.4",
    "react": "^19.2.8",
    "react-dom": "^19.2.8",
    "tailwindcss": "^4.3.3"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20260907.1",
    "@types/qrcode": "^1.5.6",
    "@types/react": "^19.2.18",
    "@types/react-dom": "^19.2.7",
    "typescript": "^5.9.0",
    "vitest": "^5.0.0",
    "wrangler": "^4.129.0"
  }
}
```

- [ ] **Step 2: ติดตั้ง**

Run: `npm install`
Expected: ไม่มี ERESOLVE; มี `package-lock.json` เกิดขึ้น

- [ ] **Step 3: สร้าง tsconfig.json**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "react",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "types": ["@cloudflare/workers-types", "vitest/globals"],
    "noEmit": true
  },
  "include": [".astro/types.d.ts", "src/**/*", "vitest.config.ts"],
  "exclude": ["dist", "node_modules"]
}
```

- [ ] **Step 4: สร้าง astro.config.mjs**

```js
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
```

- [ ] **Step 5: สร้าง vitest.config.ts** (แยกจาก Astro โดยตั้งใจ — ทดสอบเฉพาะ pure logic)

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
});
```

- [ ] **Step 6: สร้าง src/styles/global.css**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Noto Sans Thai", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --color-brand-50: #ecfdf5;
  --color-brand-600: #059669;
  --color-brand-700: #047857;
}
```

- [ ] **Step 7: สร้าง src/components/Header.astro และ Footer.astro**

`src/components/Header.astro`:
```astro
---
const links = [
  { href: '/tools', label: 'เครื่องมือทั้งหมด' },
  { href: '/pricing', label: 'พรีเมียม' },
];
const current = Astro.url.pathname;
---
<header class="border-b border-slate-200 bg-white">
  <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
    <a href="/" class="text-xl font-bold text-brand-700">ทูลสยาม <span class="text-slate-400 font-normal text-sm">ToolSiam</span></a>
    <nav class="flex gap-4 text-sm">
      {links.map((l) => (
        <a href={l.href} class:list={['hover:text-brand-700', { 'font-semibold text-brand-700': current.startsWith(l.href) }]}>{l.label}</a>
      ))}
    </nav>
  </div>
</header>
```

`src/components/Footer.astro`:
```astro
<footer class="mt-16 border-t border-slate-200 bg-white">
  <div class="mx-auto max-w-5xl px-4 py-6 text-sm text-slate-500">
    © {new Date().getFullYear()} ทูลสยาม — เครื่องมือออนไลน์ภาษาไทย ใช้ฟรี ไม่ต้องติดตั้ง
  </div>
</footer>
```

- [ ] **Step 8: สร้าง src/layouts/Base.astro**

```astro
---
import '@/styles/global.css';
import Header from '@/components/Header.astro';
import Footer from '@/components/Footer.astro';

interface Props {
  title: string;
  description: string;
  jsonLd?: Record<string, unknown>[];
}
const { title, description, jsonLd = [] } = Astro.props;
const canonical = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="th">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
    <meta name="description" content={description} />
    <link rel="canonical" href={canonical} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonical} />
    <meta property="og:site_name" content="ทูลสยาม ToolSiam" />
    <meta property="og:locale" content="th_TH" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="sitemap" href="/sitemap-index.xml" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@400;500;700&display=swap" rel="stylesheet" />
    {jsonLd.map((obj) => <script type="application/ld+json" set:html={JSON.stringify(obj)} />)}
  </head>
  <body class="min-h-screen bg-slate-50 font-sans text-slate-900">
    <Header />
    <main class="mx-auto max-w-5xl px-4 py-8">
      <slot />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 9: สร้างหน้าแรกชั่วคราว, favicon, robots**

`src/pages/index.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
---
<Base title="ทูลสยาม — เครื่องมือออนไลน์ภาษาไทย" description="รวมเครื่องมือออนไลน์ใช้ง่าย คำนวณภาษี ผ่อนบ้าน บาทถ้วน QR PromptPay และอีกมาก">
  <h1 class="text-3xl font-bold">ทูลสยาม</h1>
</Base>
```

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#059669"/><text x="32" y="44" font-size="34" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">ท</text></svg>
```

`public/robots.txt`:
```
User-agent: *
Allow: /
Sitemap: https://toolsiam.com/sitemap-index.xml
```

- [ ] **Step 10: Build เพื่อยืนยันว่า scaffold ทำงาน**

Run: `npm run build`
Expected: จบด้วย `Complete!`; มี `dist/index.html` และ `dist/sitemap-index.xml`
Run: `grep -c "ทูลสยาม" dist/index.html`
Expected: ≥ 1

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 7 + React + Tailwind 4 + Cloudflare adapter

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 2: Tool registry types, categories, registry + loaders (พร้อม test)

**Files:**
- Create: `src/tools/types.ts`, `src/tools/categories.ts`, `src/tools/registry.ts`, `src/tools/loaders.ts`, `src/tools/ToolIsland.tsx`
- Test: `src/tools/registry.test.ts`

**Interfaces:**
- Produces:
  - `type CategoryId = 'finance'|'text'|'date'|'qr'|'image'|'pdf'|'dev'|'web'`, `type Tier = 'free'|'premium'`
  - `interface ToolMeta { slug; name; nameEn; category: CategoryId; tier: Tier; description; keywords: string[]; howTo: string[]; faq: {q,a}[] }`
  - `interface CategoryMeta { id: CategoryId; name; nameEn; description; icon: string }`
  - `categories: CategoryMeta[]`, `tools: ToolMeta[]`, `getTool(slug): ToolMeta|undefined`, `getToolsByCategory(id): ToolMeta[]`, `getCategory(id): CategoryMeta`
  - `toolLoaders: Record<string, () => Promise<{ default: React.ComponentType }>>`
  - `<ToolIsland slug="..." />` React component

- [ ] **Step 1: เขียน test ของ registry (จะ fail เพราะยังไม่มีไฟล์)**

`src/tools/registry.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tools, categories, getTool, getToolsByCategory, getCategory } from './registry';
import { toolLoaders } from './loaders';

describe('registry', () => {
  it('slug ไม่ซ้ำและเป็น kebab-case', () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('ทุกเครื่องมืออยู่ในหมวดที่มีจริง และมีเนื้อหา SEO ครบ', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const t of tools) {
      expect(ids.has(t.category)).toBe(true);
      expect(t.keywords.length).toBeGreaterThanOrEqual(3);
      expect(t.howTo.length).toBeGreaterThanOrEqual(2);
      expect(t.faq.length).toBeGreaterThanOrEqual(2);
      expect(t.description.length).toBeGreaterThanOrEqual(40);
    }
  });

  it('ทุกเครื่องมือมี loader และ loader ไม่มีส่วนเกิน', () => {
    expect(Object.keys(toolLoaders).sort()).toEqual(tools.map((t) => t.slug).sort());
  });

  it('helpers ทำงานถูก', () => {
    expect(getTool('not-exist')).toBeUndefined();
    expect(getCategory('finance').name).toBe('การเงินและภาษี');
    for (const c of categories) {
      for (const t of getToolsByCategory(c.id)) expect(t.category).toBe(c.id);
    }
  });
});
```

- [ ] **Step 2: รัน test ให้เห็นว่า fail**

Run: `npm test`
Expected: FAIL — `Cannot find module './registry'`

- [ ] **Step 3: สร้าง types.ts และ categories.ts**

`src/tools/types.ts`:
```ts
export type CategoryId = 'finance' | 'text' | 'date' | 'qr' | 'image' | 'pdf' | 'dev' | 'web';
export type Tier = 'free' | 'premium';

export interface ToolMeta {
  /** URL: /t/<slug> */
  slug: string;
  /** ชื่อไทย ใช้เป็น h1 */
  name: string;
  nameEn: string;
  category: CategoryId;
  tier: Tier;
  /** 1–2 ประโยค ใช้เป็น meta description (≥ 40 ตัวอักษร) */
  description: string;
  /** คำค้นภาษาไทย (≥ 3) ใช้ในการค้นหาและ keywords */
  keywords: string[];
  /** ขั้นตอนการใช้งาน (≥ 2) */
  howTo: string[];
  /** คำถามที่พบบ่อย (≥ 2) → FAQPage JSON-LD */
  faq: { q: string; a: string }[];
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  nameEn: string;
  description: string;
  /** emoji */
  icon: string;
}
```

`src/tools/categories.ts`:
```ts
import type { CategoryMeta } from './types';

export const categories: CategoryMeta[] = [
  { id: 'finance', name: 'การเงินและภาษี', nameEn: 'Finance & Tax', description: 'คำนวณภาษี ค่างวด ดอกเบี้ย เงินเดือนสุทธิ', icon: '💰' },
  { id: 'text', name: 'ข้อความภาษาไทย', nameEn: 'Thai Text', description: 'บาทถ้วน นับคำ แปลงเลขไทย จัดการข้อความ', icon: '🔤' },
  { id: 'date', name: 'วันที่และเวลา', nameEn: 'Date & Time', description: 'คำนวณอายุ นับวัน แปลง พ.ศ./ค.ศ. วันหยุด', icon: '📅' },
  { id: 'qr', name: 'QR และ PromptPay', nameEn: 'QR & PromptPay', description: 'สร้าง QR รับเงิน PromptPay, WiFi, vCard', icon: '🔳' },
  { id: 'image', name: 'รูปภาพ', nameEn: 'Image', description: 'ย่อ บีบอัด แปลงไฟล์ ลบ EXIF', icon: '🖼️' },
  { id: 'pdf', name: 'PDF', nameEn: 'PDF', description: 'รวม แยก หมุน แปลงรูปเป็น PDF', icon: '📄' },
  { id: 'dev', name: 'นักพัฒนา', nameEn: 'Developer', description: 'JSON, Base64, UUID, hash, regex', icon: '💻' },
  { id: 'web', name: 'เว็บและ SEO', nameEn: 'Web & SEO', description: 'Meta tag, Open Graph, UTM, slug', icon: '🌐' },
];
```

- [ ] **Step 4: สร้าง registry.ts, loaders.ts (ยังว่าง), ToolIsland.tsx**

`src/tools/registry.ts`:
```ts
import type { CategoryId, CategoryMeta, ToolMeta } from './types';
import { categories } from './categories';

export { categories };
export type { ToolMeta, CategoryMeta, CategoryId };

/** ลำดับในนี้ = ลำดับแสดงผลในหน้า /tools */
export const tools: ToolMeta[] = [];

export function getTool(slug: string): ToolMeta | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getToolsByCategory(id: CategoryId): ToolMeta[] {
  return tools.filter((t) => t.category === id);
}

export function getCategory(id: CategoryId): CategoryMeta {
  const c = categories.find((c) => c.id === id);
  if (!c) throw new Error(`unknown category: ${id}`);
  return c;
}
```

`src/tools/loaders.ts`:
```ts
import type { ComponentType } from 'react';

export type ToolLoader = () => Promise<{ default: ComponentType }>;

/** slug → dynamic import ของ Tool.tsx (code-split ต่อเครื่องมือ) */
export const toolLoaders: Record<string, ToolLoader> = {};
```

`src/tools/ToolIsland.tsx`:
```tsx
import { lazy, Suspense, useMemo } from 'react';
import { toolLoaders } from './loaders';

export default function ToolIsland({ slug }: { slug: string }) {
  const Tool = useMemo(() => {
    const load = toolLoaders[slug];
    return load ? lazy(load) : null;
  }, [slug]);

  if (!Tool) return <p className="text-red-600">ไม่พบเครื่องมือ: {slug}</p>;

  return (
    <Suspense fallback={<p className="text-slate-500">กำลังโหลดเครื่องมือ…</p>}>
      <Tool />
    </Suspense>
  );
}
```

- [ ] **Step 5: รัน test ให้ผ่าน**

Run: `npm test`
Expected: PASS 4 tests (tools ว่างจึงผ่านทุกข้อ)

- [ ] **Step 6: Commit**

```bash
git add src/tools
git commit -m "feat: tool registry types, categories, loaders and ToolIsland

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 3: Shared UI + format helpers + SEO JSON-LD helpers

**Files:**
- Create: `src/components/ui.tsx`, `src/lib/format.ts`, `src/lib/seo.ts`
- Test: `src/lib/format.test.ts`, `src/lib/seo.test.ts`

**Interfaces:**
- Produces:
  - `formatBaht(n: number): string` → `"1,234.50"`; `formatNumber(n: number, digits = 0): string`
  - `toolJsonLd(tool: ToolMeta, url: string): Record<string, unknown>[]` (SoftwareApplication + FAQPage)
  - React: `Input`, `Textarea`, `Select`, `Label`, `Button({variant?: 'primary'|'secondary'})`, `ResultBox({label, children})`, `Stat({label, value})`

- [ ] **Step 1: เขียน test format และ seo**

`src/lib/format.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatBaht, formatNumber } from './format';

describe('format', () => {
  it('formatBaht ใส่คอมมาและทศนิยม 2 ตำแหน่งเสมอ', () => {
    expect(formatBaht(1234.5)).toBe('1,234.50');
    expect(formatBaht(0)).toBe('0.00');
    expect(formatBaht(1000000)).toBe('1,000,000.00');
    expect(formatBaht(-99.999)).toBe('-100.00');
  });
  it('formatNumber ปัดตามจำนวนหลักที่ขอ', () => {
    expect(formatNumber(1234.567)).toBe('1,235');
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
  });
});
```

`src/lib/seo.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toolJsonLd } from './seo';
import type { ToolMeta } from '@/tools/types';

const tool: ToolMeta = {
  slug: 'x', name: 'เครื่องมือ X', nameEn: 'X', category: 'dev', tier: 'free',
  description: 'คำอธิบายยาวพอสมควรสำหรับทดสอบ JSON-LD ของเครื่องมือ',
  keywords: ['a', 'b', 'c'], howTo: ['1', '2'],
  faq: [{ q: 'ถาม1', a: 'ตอบ1' }, { q: 'ถาม2', a: 'ตอบ2' }],
};

describe('toolJsonLd', () => {
  it('คืน SoftwareApplication และ FAQPage', () => {
    const [app, faq] = toolJsonLd(tool, 'https://toolsiam.com/t/x') as any[];
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.name).toBe('เครื่องมือ X');
    expect(app.url).toBe('https://toolsiam.com/t/x');
    expect(app.offers.price).toBe('0');
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('ตอบ1');
  });
  it('premium ใส่ราคา 99', () => {
    const [app] = toolJsonLd({ ...tool, tier: 'premium' }, 'https://toolsiam.com/t/x') as any[];
    expect(app.offers.price).toBe('99');
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npm test`
Expected: FAIL — cannot find `./format`, `./seo`

- [ ] **Step 3: สร้าง format.ts และ seo.ts**

`src/lib/format.ts`:
```ts
const baht = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export function formatBaht(n: number): string {
  return baht.format(n);
}

export function formatNumber(n: number, digits = 0): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
}
```

`src/lib/seo.ts`:
```ts
import type { ToolMeta } from '@/tools/types';

export function toolJsonLd(tool: ToolMeta, url: string): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      alternateName: tool.nameEn,
      url,
      description: tool.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      inLanguage: 'th',
      offers: { '@type': 'Offer', price: tool.tier === 'premium' ? '99' : '0', priceCurrency: 'THB' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npm test`
Expected: PASS (registry 4 + format 2 + seo 2)

- [ ] **Step 5: สร้าง src/components/ui.tsx**

```tsx
import type {
  ButtonHTMLAttributes, InputHTMLAttributes, LabelHTMLAttributes, ReactNode,
  SelectHTMLAttributes, TextareaHTMLAttributes,
} from 'react';

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 ' +
  'focus:outline-none focus:ring-2 focus:ring-brand-600 disabled:bg-slate-100';

function cx(...parts: (string | undefined | false)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cx(field, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cx(field, 'font-mono text-sm', className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cx(field, className)} />;
}

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={cx('mb-1 block text-sm font-medium text-slate-700', className)} />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white hover:bg-brand-700'
      : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50';
  return (
    <button
      type="button"
      {...props}
      className={cx('rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50', styles, className)}
    />
  );
}

export function ResultBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-lg border border-brand-600/20 bg-brand-50 p-4">
      <div className="text-xs font-medium text-brand-700">{label}</div>
      <div className="mt-1 break-words text-lg font-semibold">{children}</div>
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
```

- [ ] **Step 6: Typecheck และ commit**

Run: `npx tsc --noEmit`
Expected: ไม่มี error (ถ้าเจอ error เกี่ยวกับ `.astro/types.d.ts` ให้รัน `npx astro sync` ก่อน)

```bash
git add src/components/ui.tsx src/lib
git commit -m "feat: shared ui primitives, number formatting and JSON-LD helpers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 4: เครื่องมือ "ตัวเลขเป็นคำอ่านไทย (บาทถ้วน)"

**Files:**
- Create: `src/tools/text/baht-text/logic.ts`, `src/tools/text/baht-text/meta.ts`, `src/tools/text/baht-text/Tool.tsx`
- Modify: `src/tools/registry.ts` (เพิ่มใน `tools`), `src/tools/loaders.ts` (เพิ่ม loader)
- Test: `src/tools/text/baht-text/logic.test.ts`

**Interfaces:**
- Produces: `bahtText(input: number | string): string` (throw `Error('รูปแบบตัวเลขไม่ถูกต้อง')` ถ้า parse ไม่ได้), `readInteger(digits: string): string`

กติกาภาษาไทย: หน่วย สิบ/ร้อย/พัน/หมื่น/แสน วนทุก 6 หลักด้วย "ล้าน"; `1` ในหลักหน่วยอ่าน "เอ็ด" เมื่อกลุ่ม 6 หลักนั้นมีค่ามากกว่า 1 (11→สิบเอ็ด, 101→หนึ่งร้อยเอ็ด แต่ 1,000,001→หนึ่งล้านหนึ่ง); `2` หลักสิบอ่าน "ยี่สิบ"; `1` หลักสิบอ่าน "สิบ"; สตางค์ปัดเป็น 2 ตำแหน่ง; ไม่มีสตางค์ลงท้าย "ถ้วน"

- [ ] **Step 1: เขียน test**

`src/tools/text/baht-text/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { bahtText, readInteger } from './logic';

describe('readInteger', () => {
  it.each([
    ['0', 'ศูนย์'],
    ['1', 'หนึ่ง'],
    ['10', 'สิบ'],
    ['11', 'สิบเอ็ด'],
    ['20', 'ยี่สิบ'],
    ['21', 'ยี่สิบเอ็ด'],
    ['100', 'หนึ่งร้อย'],
    ['101', 'หนึ่งร้อยเอ็ด'],
    ['111', 'หนึ่งร้อยสิบเอ็ด'],
    ['1000', 'หนึ่งพัน'],
    ['12345', 'หนึ่งหมื่นสองพันสามร้อยสี่สิบห้า'],
    ['100000', 'หนึ่งแสน'],
    ['1000000', 'หนึ่งล้าน'],
    ['1000001', 'หนึ่งล้านหนึ่ง'],
    ['1000011', 'หนึ่งล้านสิบเอ็ด'],
    ['21000000', 'ยี่สิบเอ็ดล้าน'],
    ['1000000000000', 'หนึ่งล้านล้าน'],
    ['007', 'เจ็ด'],
  ])('%s → %s', (input, expected) => {
    expect(readInteger(input)).toBe(expected);
  });
});

describe('bahtText', () => {
  it.each([
    [0, 'ศูนย์บาทถ้วน'],
    [1, 'หนึ่งบาทถ้วน'],
    [11, 'สิบเอ็ดบาทถ้วน'],
    [1000000, 'หนึ่งล้านบาทถ้วน'],
    [1.5, 'หนึ่งบาทห้าสิบสตางค์'],
    [0.25, 'ยี่สิบห้าสตางค์'],
    [0.01, 'หนึ่งสตางค์'],
    [1234567.89, 'หนึ่งล้านสองแสนสามหมื่นสี่พันห้าร้อยหกสิบเจ็ดบาทแปดสิบเก้าสตางค์'],
    [-5, 'ลบห้าบาทถ้วน'],
  ])('%s → %s', (input, expected) => {
    expect(bahtText(input)).toBe(expected);
  });

  it('รับ string ที่มีคอมมา/ช่องว่าง และปัดสตางค์', () => {
    expect(bahtText('1,234.50')).toBe('หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์');
    expect(bahtText(' 99 ')).toBe('เก้าสิบเก้าบาทถ้วน');
    expect(bahtText('1.005')).toBe('หนึ่งบาทหนึ่งสตางค์');
    expect(bahtText('0.999')).toBe('หนึ่งบาทถ้วน'); // ทดสตางค์ขึ้นบาท
  });

  it('รับตัวเลขใหญ่กว่า Number.MAX_SAFE_INTEGER ผ่าน string', () => {
    expect(bahtText('123456789012345678')).toBe(
      'หนึ่งแสนสองหมื่นสามพันสี่ร้อยห้าสิบหกล้านล้านเจ็ดแสนแปดหมื่นเก้าพันสิบสองล้านสามแสนสี่หมื่นห้าพันหกร้อยเจ็ดสิบแปดบาทถ้วน',
    );
  });

  it('โยน error เมื่อรูปแบบผิด', () => {
    expect(() => bahtText('abc')).toThrow('รูปแบบตัวเลขไม่ถูกต้อง');
    expect(() => bahtText('1.2.3')).toThrow('รูปแบบตัวเลขไม่ถูกต้อง');
    expect(() => bahtText('')).toThrow('รูปแบบตัวเลขไม่ถูกต้อง');
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npx vitest run src/tools/text/baht-text`
Expected: FAIL — cannot find `./logic`

- [ ] **Step 3: เขียน logic.ts**

```ts
const DIGITS = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const UNITS = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

/** อ่านกลุ่มไม่เกิน 6 หลัก (ไม่มีคำว่า "ล้าน") คืน '' ถ้าเป็นศูนย์ */
function readGroup(group: string): string {
  const value = Number(group);
  if (value === 0) return '';
  const digits = group.padStart(6, '0').split('').map(Number);
  let out = '';
  for (let i = 0; i < 6; i++) {
    const d = digits[i];
    const pos = 5 - i; // 0 = หน่วย, 1 = สิบ, ...
    if (d === 0) continue;
    if (pos === 0 && d === 1 && value > 1) out += 'เอ็ด';
    else if (pos === 1 && d === 1) out += 'สิบ';
    else if (pos === 1 && d === 2) out += 'ยี่สิบ';
    else out += DIGITS[d] + UNITS[pos];
  }
  return out;
}

/** อ่านจำนวนเต็มจาก string ตัวเลขล้วน (ยาวเท่าไรก็ได้) */
export function readInteger(digits: string): string {
  const s = digits.replace(/^0+/, '');
  if (s === '') return DIGITS[0];
  const groups: string[] = [];
  for (let end = s.length; end > 0; end -= 6) groups.unshift(s.slice(Math.max(0, end - 6), end));
  return groups
    .map((g, i) => {
      const words = readGroup(g);
      return words ? words + 'ล้าน'.repeat(groups.length - 1 - i) : '';
    })
    .join('');
}

const NUMBER_RE = /^(-)?(\d+)(?:\.(\d+))?$/;

/** แปลงจำนวนเงินเป็นคำอ่านภาษาไทย เช่น 1234.5 → หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์ */
export function bahtText(input: number | string): string {
  const raw = typeof input === 'number' ? input.toFixed(2) : input.replace(/[,\s]/g, '');
  const m = NUMBER_RE.exec(raw);
  if (!m) throw new Error('รูปแบบตัวเลขไม่ถูกต้อง');
  const [, sign, intPart, decPart = ''] = m;

  // ปัดสตางค์เป็น 2 ตำแหน่ง (ปัดครึ่งขึ้น) แล้วทดขึ้นบาทถ้าครบ 100
  let satang = Math.round(Number(`0.${decPart || '0'}`) * 100);
  let baht = BigInt(intPart);
  if (satang === 100) {
    baht += 1n;
    satang = 0;
  }

  const bahtStr = baht.toString();
  let out = '';
  if (baht > 0n || satang === 0) out += readInteger(bahtStr) + 'บาท';
  out += satang === 0 ? 'ถ้วน' : readGroup(String(satang)) + 'สตางค์';
  return (sign && (baht > 0n || satang > 0) ? 'ลบ' : '') + out;
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npx vitest run src/tools/text/baht-text`
Expected: PASS ทุกเคส (ถ้า `'0.999'` ไม่ผ่านให้ตรวจการทด `satang === 100`)

- [ ] **Step 5: เขียน meta.ts**

```ts
import type { ToolMeta } from '@/tools/types';

export const bahtTextMeta: ToolMeta = {
  slug: 'baht-text',
  name: 'แปลงตัวเลขเป็นตัวอักษรภาษาไทย (บาทถ้วน)',
  nameEn: 'Thai Baht Text',
  category: 'text',
  tier: 'free',
  description:
    'แปลงจำนวนเงินตัวเลขเป็นคำอ่านภาษาไทย เช่น 1,234.50 → หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์ ใช้ในใบเสร็จ ใบกำกับภาษี เช็ค รองรับตัวเลขหลักล้านล้าน',
  keywords: ['บาทถ้วน', 'ตัวเลขเป็นตัวอักษร', 'คำอ่านจำนวนเงิน', 'bahttext', 'แปลงเงินเป็นตัวหนังสือ'],
  howTo: [
    'พิมพ์หรือวางจำนวนเงิน เช่น 1,234.50 (ใส่คอมมาได้)',
    'ระบบแสดงคำอ่านภาษาไทยทันที',
    'กด "คัดลอก" เพื่อนำไปใส่ในเอกสาร',
  ],
  faq: [
    { q: 'ต่างจากสูตร BAHTTEXT ใน Excel อย่างไร', a: 'ให้ผลลัพธ์แบบเดียวกับ BAHTTEXT ของ Excel รวมถึงการใช้ "เอ็ด" และ "ยี่สิบ" แต่ไม่ต้องเปิดโปรแกรม ใช้บนมือถือได้' },
    { q: 'รองรับสตางค์ไหม', a: 'รองรับ ทศนิยม 2 ตำแหน่งจะอ่านเป็นสตางค์ ถ้าไม่มีทศนิยมจะลงท้ายด้วย "ถ้วน"' },
    { q: 'ตัวเลขใหญ่แค่ไหนที่รองรับ', a: 'ไม่จำกัด อ่านทุก 6 หลักด้วยคำว่า "ล้าน" ซ้อนกันได้ เช่น หนึ่งล้านล้านบาท' },
  ],
};
```

- [ ] **Step 6: เขียน Tool.tsx**

```tsx
import { useState } from 'react';
import { bahtText } from './logic';
import { Button, Field, Input, ResultBox } from '@/components/ui';

export default function BahtTextTool() {
  const [value, setValue] = useState('1,234.50');
  const [copied, setCopied] = useState(false);

  let result = '';
  let error = '';
  if (value.trim()) {
    try {
      result = bahtText(value);
    } catch (e) {
      error = (e as Error).message;
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="space-y-4">
      <Field label="จำนวนเงิน (บาท)" htmlFor="amount" hint="ใส่คอมมาหรือทศนิยมได้ เช่น 1,234.50">
        <Input id="amount" inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </Field>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ResultBox label="คำอ่านภาษาไทย">{result || '—'}</ResultBox>
      <Button onClick={copy} disabled={!result}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอก'}</Button>
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียนใน registry และ loaders**

`src/tools/registry.ts` — เพิ่ม import และใส่ใน array:
```ts
import { bahtTextMeta } from './text/baht-text/meta';
// ...
export const tools: ToolMeta[] = [bahtTextMeta];
```

`src/tools/loaders.ts`:
```ts
export const toolLoaders: Record<string, ToolLoader> = {
  'baht-text': () => import('./text/baht-text/Tool'),
};
```

- [ ] **Step 8: รัน test ทั้งหมด + typecheck**

Run: `npm test && npx tsc --noEmit`
Expected: PASS ทั้งหมด รวม registry test ข้อ "ทุกเครื่องมือมี loader"

- [ ] **Step 9: Commit**

```bash
git add src/tools
git commit -m "feat(tool): baht-text — แปลงตัวเลขเป็นคำอ่านภาษาไทย

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 5: หน้าเว็บทั้งหมด (tool page, category, all tools + search, index, pricing)

**Files:**
- Create: `src/components/ToolCard.astro`, `src/components/ToolShell.astro`, `src/components/ToolSearch.tsx`, `src/pages/t/[slug].astro`, `src/pages/c/[category].astro`, `src/pages/tools.astro`, `src/pages/pricing.astro`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `tools`, `categories`, `getCategory`, `getToolsByCategory` (Task 2); `toolJsonLd` (Task 3); `ToolIsland` (Task 2)
- Produces: URL scheme `/t/<slug>`, `/c/<category>`, `/tools`, `/pricing` ที่ Phase 2–4 จะเติม (ไม่ต้องเปลี่ยนโครง)

- [ ] **Step 1: ToolCard.astro**

```astro
---
import type { ToolMeta } from '@/tools/types';
import { getCategory } from '@/tools/registry';
interface Props { tool: ToolMeta }
const { tool } = Astro.props;
const cat = getCategory(tool.category);
---
<a href={`/t/${tool.slug}`} class="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-600 hover:shadow-sm">
  <div class="flex items-start justify-between gap-2">
    <h3 class="font-semibold leading-snug">{tool.name}</h3>
    <span class:list={['shrink-0 rounded-full px-2 py-0.5 text-xs font-medium', tool.tier === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700']}>
      {tool.tier === 'premium' ? 'พรีเมียม' : 'ฟรี'}
    </span>
  </div>
  <p class="mt-1 line-clamp-2 text-sm text-slate-600">{tool.description}</p>
  <div class="mt-2 text-xs text-slate-400">{cat.icon} {cat.name}</div>
</a>
```

- [ ] **Step 2: ToolShell.astro**

```astro
---
import type { ToolMeta } from '@/tools/types';
import { getCategory, getToolsByCategory } from '@/tools/registry';
import ToolCard from './ToolCard.astro';
interface Props { tool: ToolMeta }
const { tool } = Astro.props;
const cat = getCategory(tool.category);
const related = getToolsByCategory(tool.category).filter((t) => t.slug !== tool.slug).slice(0, 4);
---
<nav class="text-sm text-slate-500" aria-label="breadcrumb">
  <a href="/" class="hover:underline">หน้าแรก</a> › <a href={`/c/${cat.id}`} class="hover:underline">{cat.name}</a>
</nav>
<div class="mt-2 flex flex-wrap items-center gap-2">
  <h1 class="text-2xl font-bold sm:text-3xl">{tool.name}</h1>
  <span class:list={['rounded-full px-2 py-0.5 text-xs font-medium', tool.tier === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700']}>
    {tool.tier === 'premium' ? 'พรีเมียม' : 'ฟรี'}
  </span>
</div>
<p class="mt-2 max-w-3xl text-slate-600">{tool.description}</p>

<section class="mt-6 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
  <slot />
</section>

<section class="mt-10 grid gap-8 md:grid-cols-2">
  <div>
    <h2 class="text-xl font-semibold">วิธีใช้งาน</h2>
    <ol class="mt-3 list-decimal space-y-1 pl-5 text-slate-700">
      {tool.howTo.map((step) => <li>{step}</li>)}
    </ol>
  </div>
  <div>
    <h2 class="text-xl font-semibold">คำถามที่พบบ่อย</h2>
    <dl class="mt-3 space-y-3">
      {tool.faq.map((f) => (
        <div>
          <dt class="font-medium">{f.q}</dt>
          <dd class="text-slate-600">{f.a}</dd>
        </div>
      ))}
    </dl>
  </div>
</section>

{related.length > 0 && (
  <section class="mt-10">
    <h2 class="text-xl font-semibold">เครื่องมืออื่นในหมวด {cat.name}</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2">
      {related.map((t) => <ToolCard tool={t} />)}
    </div>
  </section>
)}
```

- [ ] **Step 3: หน้า t/[slug].astro**

```astro
---
import Base from '@/layouts/Base.astro';
import ToolShell from '@/components/ToolShell.astro';
import ToolIsland from '@/tools/ToolIsland';
import { tools } from '@/tools/registry';
import { toolJsonLd } from '@/lib/seo';

export function getStaticPaths() {
  return tools.map((tool) => ({ params: { slug: tool.slug }, props: { tool } }));
}
const { tool } = Astro.props;
const url = new URL(`/t/${tool.slug}`, Astro.site).toString();
---
<Base title={`${tool.name} — ทูลสยาม`} description={tool.description} jsonLd={toolJsonLd(tool, url)}>
  <ToolShell tool={tool}>
    <ToolIsland client:load slug={tool.slug} />
  </ToolShell>
</Base>
```

- [ ] **Step 4: หน้า c/[category].astro**

```astro
---
import Base from '@/layouts/Base.astro';
import ToolCard from '@/components/ToolCard.astro';
import { categories, getToolsByCategory } from '@/tools/registry';

export function getStaticPaths() {
  return categories.map((category) => ({ params: { category: category.id }, props: { category } }));
}
const { category } = Astro.props;
const list = getToolsByCategory(category.id);
---
<Base title={`${category.name} — เครื่องมือออนไลน์ ทูลสยาม`} description={`เครื่องมือหมวด${category.name}: ${category.description} ใช้ฟรีบนเว็บ ไม่ต้องติดตั้ง`}>
  <h1 class="text-3xl font-bold">{category.icon} {category.name}</h1>
  <p class="mt-2 text-slate-600">{category.description}</p>
  {list.length === 0 ? (
    <p class="mt-8 rounded-lg bg-white p-6 text-slate-500">กำลังเพิ่มเครื่องมือในหมวดนี้ เร็ว ๆ นี้</p>
  ) : (
    <div class="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {list.map((t) => <ToolCard tool={t} />)}
    </div>
  )}
</Base>
```

- [ ] **Step 5: ToolSearch.tsx (island; SSR รายการเต็ม)**

```tsx
import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';
import { tools, categories, type ToolMeta, type CategoryId } from '@/tools/registry';
import { Input, Select } from '@/components/ui';

const fuse = new Fuse(tools, {
  keys: [
    { name: 'name', weight: 3 },
    { name: 'keywords', weight: 2 },
    { name: 'nameEn', weight: 1 },
    { name: 'description', weight: 1 },
  ],
  threshold: 0.4,
  ignoreLocation: true,
});

type TierFilter = 'all' | 'free' | 'premium';

export default function ToolSearch({ initialCategory }: { initialCategory?: CategoryId }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState<TierFilter>('all');
  const [category, setCategory] = useState<CategoryId | 'all'>(initialCategory ?? 'all');

  const results: ToolMeta[] = useMemo(() => {
    const base = q.trim() ? fuse.search(q.trim()).map((r) => r.item) : tools;
    return base.filter((t) => (tier === 'all' || t.tier === tier) && (category === 'all' || t.category === category));
  }, [q, tier, category]);

  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input type="search" placeholder="ค้นหาเครื่องมือ เช่น ภาษี, บาทถ้วน, QR" value={q} onChange={(e) => setQ(e.target.value)} aria-label="ค้นหาเครื่องมือ" />
        <Select value={category} onChange={(e) => setCategory(e.target.value as CategoryId | 'all')} aria-label="หมวดหมู่">
          <option value="all">ทุกหมวด</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </Select>
        <Select value={tier} onChange={(e) => setTier(e.target.value as TierFilter)} aria-label="ประเภท">
          <option value="all">ฟรี + พรีเมียม</option>
          <option value="free">เฉพาะฟรี</option>
          <option value="premium">เฉพาะพรีเมียม</option>
        </Select>
      </div>

      <p className="mt-3 text-sm text-slate-500">พบ {results.length} เครื่องมือ</p>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((t) => {
          const cat = categories.find((c) => c.id === t.category)!;
          return (
            <li key={t.slug}>
              <a href={`/t/${t.slug}`} className="block h-full rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-600 hover:shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold leading-snug">{t.name}</h3>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${t.tier === 'premium' ? 'bg-amber-100 text-amber-800' : 'bg-brand-50 text-brand-700'}`}>
                    {t.tier === 'premium' ? 'พรีเมียม' : 'ฟรี'}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{t.description}</p>
                <div className="mt-2 text-xs text-slate-400">{cat.icon} {cat.name}</div>
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

- [ ] **Step 6: หน้า tools.astro, pricing.astro และแก้ index.astro**

`src/pages/tools.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
import ToolSearch from '@/components/ToolSearch';
import { tools } from '@/tools/registry';
---
<Base title="เครื่องมือทั้งหมด — ทูลสยาม" description={`รวมเครื่องมือออนไลน์ภาษาไทย ${tools.length} รายการ ค้นหาตามหมวดหมู่ ฟรีและพรีเมียม ใช้งานได้ทันทีบนเบราว์เซอร์`}>
  <h1 class="text-3xl font-bold">เครื่องมือทั้งหมด</h1>
  <p class="mt-2 text-slate-600">ค้นหาหรือกรองตามหมวดหมู่ เครื่องมือฟรีใช้ได้ทันทีไม่ต้องสมัคร</p>
  <div class="mt-6">
    <ToolSearch client:load />
  </div>
</Base>
```

`src/pages/pricing.astro`:
```astro
---
import Base from '@/layouts/Base.astro';
const plans = [
  { name: '1 เดือน', price: 99, note: 'ลองใช้ก่อน' },
  { name: '3 เดือน', price: 279, note: 'ประหยัด 6%' },
  { name: '12 เดือน', price: 990, note: 'ประหยัด 17% — คุ้มสุด' },
];
const perks = ['ใช้เครื่องมือพรีเมียมทุกตัวไม่จำกัด', 'ไม่มีโฆษณา', 'บันทึกประวัติและรายการโปรด', 'ประมวลผลหลายไฟล์พร้อมกัน', 'ดาวน์โหลดไม่มีลายน้ำ'];
---
<Base title="สมาชิกพรีเมียม 99 บาท/เดือน — ทูลสยาม" description="อัปเกรดเป็นพรีเมียมเพียง 99 บาทต่อเดือน ใช้เครื่องมือทุกตัวไม่จำกัด ไม่มีโฆษณา จ่ายผ่าน PromptPay">
  <h1 class="text-3xl font-bold">สมาชิกพรีเมียม</h1>
  <p class="mt-2 text-slate-600">เครื่องมือฟรีใช้ได้ตลอดไป พรีเมียมปลดล็อกทุกอย่างในราคาเริ่มต้น 99 บาท/เดือน ชำระผ่าน PromptPay</p>
  <div class="mt-8 grid gap-4 sm:grid-cols-3">
    {plans.map((p) => (
      <div class="rounded-2xl border border-slate-200 bg-white p-6">
        <div class="text-sm text-slate-500">{p.name}</div>
        <div class="mt-1 text-3xl font-bold">{p.price.toLocaleString('en-US')} <span class="text-base font-normal text-slate-500">บาท</span></div>
        <div class="mt-1 text-xs text-brand-700">{p.note}</div>
        <button type="button" disabled class="mt-4 w-full rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-500">เปิดรับสมัครเร็ว ๆ นี้</button>
      </div>
    ))}
  </div>
  <ul class="mt-8 space-y-2 text-slate-700">
    {perks.map((x) => <li>✅ {x}</li>)}
  </ul>
</Base>
```

`src/pages/index.astro` (แทนที่ทั้งไฟล์):
```astro
---
import Base from '@/layouts/Base.astro';
import ToolCard from '@/components/ToolCard.astro';
import { tools, categories, getToolsByCategory } from '@/tools/registry';
---
<Base title="ทูลสยาม — เครื่องมือออนไลน์ภาษาไทย ใช้ฟรี" description="รวมเครื่องมือออนไลน์ใช้ง่าย คำนวณภาษี ผ่อนบ้าน บาทถ้วน QR PromptPay JSON และอีกมาก ใช้ฟรีบนเบราว์เซอร์ ไม่ต้องติดตั้ง">
  <section class="py-8 text-center">
    <h1 class="text-3xl font-bold sm:text-4xl">เครื่องมือออนไลน์ภาษาไทย ใช้ง่าย ใช้ฟรี</h1>
    <p class="mx-auto mt-3 max-w-2xl text-slate-600">คำนวณภาษี ค่างวด บาทถ้วน สร้าง QR PromptPay จัดการไฟล์และข้อความ ทั้งหมดในที่เดียว ไม่ต้องติดตั้งโปรแกรม</p>
    <a href="/tools" class="mt-6 inline-block rounded-lg bg-brand-600 px-5 py-2.5 font-medium text-white hover:bg-brand-700">ดูเครื่องมือทั้งหมด ({tools.length})</a>
  </section>

  <section class="mt-8">
    <h2 class="text-xl font-semibold">หมวดหมู่</h2>
    <div class="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
      {categories.map((c) => (
        <a href={`/c/${c.id}`} class="rounded-xl border border-slate-200 bg-white p-4 hover:border-brand-600">
          <div class="text-2xl">{c.icon}</div>
          <div class="mt-1 font-medium">{c.name}</div>
          <div class="text-xs text-slate-500">{getToolsByCategory(c.id).length} เครื่องมือ</div>
        </a>
      ))}
    </div>
  </section>

  <section class="mt-10">
    <h2 class="text-xl font-semibold">เครื่องมือยอดนิยม</h2>
    <div class="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tools.slice(0, 6).map((t) => <ToolCard tool={t} />)}
    </div>
  </section>
</Base>
```

- [ ] **Step 7: Build และตรวจ SEO HTML**

Run: `npm run build`
Expected: สำเร็จ; มีไฟล์ `dist/t/baht-text/index.html`, `dist/c/finance/index.html`, `dist/tools/index.html`, `dist/pricing/index.html`
Run: `grep -c "คำถามที่พบบ่อย" dist/t/baht-text/index.html && grep -c "FAQPage" dist/t/baht-text/index.html && grep -c "baht-text" dist/sitemap-0.xml`
Expected: แต่ละค่า ≥ 1
Run: `grep -c "แปลงตัวเลขเป็นตัวอักษร" dist/tools/index.html`
Expected: ≥ 1 (island ถูก SSR — รายการเต็มอยู่ใน HTML)

- [ ] **Step 8: ทดสอบในเบราว์เซอร์ด้วย dev server**

Run: `npm run dev` แล้วเปิด `http://localhost:4321/t/baht-text` — พิมพ์ `1234.5` ต้องเห็น "หนึ่งพันสองร้อยสามสิบสี่บาทห้าสิบสตางค์" และปุ่มคัดลอกทำงาน; เปิด `/tools` พิมพ์ "บาท" ต้องกรองเหลือ 1 รายการ; หยุด dev server

- [ ] **Step 9: Commit**

```bash
git add src public
git commit -m "feat: tool/category/search/index/pricing pages with Thai SEO content

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 6: เครื่องมือ "คำนวณค่างวดผ่อนบ้าน/รถ"

**Files:**
- Create: `src/tools/finance/loan-installment/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `monthlyPayment(principal, annualRatePercent, months): number`; `calculateLoan(input: LoanInput): LoanResult` โดย
  `LoanInput = { principal: number; annualRatePercent: number; months: number }`,
  `LoanResult = { monthlyPayment; totalPayment; totalInterest; schedule: LoanRow[] }`,
  `LoanRow = { period; payment; interest; principal; balance }` (ทุกค่าปัด 2 ตำแหน่ง)

- [ ] **Step 1: เขียน test**

`src/tools/finance/loan-installment/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { monthlyPayment, calculateLoan } from './logic';

describe('monthlyPayment', () => {
  it('สูตร EMI มาตรฐาน: 1,000,000 บาท 6% 30 ปี ≈ 5,995.51', () => {
    expect(monthlyPayment(1_000_000, 6, 360)).toBeCloseTo(5995.51, 2);
  });
  it('ดอกเบี้ย 0% = หารเท่ากัน', () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000);
  });
  it('input ผิดโยน error', () => {
    expect(() => monthlyPayment(0, 5, 12)).toThrow();
    expect(() => monthlyPayment(1000, 5, 0)).toThrow();
    expect(() => monthlyPayment(1000, -1, 12)).toThrow();
  });
});

describe('calculateLoan', () => {
  const r = calculateLoan({ principal: 1_000_000, annualRatePercent: 6, months: 360 });
  it('ตารางครบทุกงวดและงวดสุดท้ายยอดคงเหลือ 0', () => {
    expect(r.schedule).toHaveLength(360);
    expect(r.schedule[0].period).toBe(1);
    expect(r.schedule[359].balance).toBe(0);
  });
  it('งวดแรกดอกเบี้ย = เงินต้น × อัตรา/12', () => {
    expect(r.schedule[0].interest).toBe(5000);
    expect(r.schedule[0].principal).toBeCloseTo(995.51, 2);
  });
  it('ยอดรวมสอดคล้องกัน', () => {
    expect(r.totalPayment).toBeCloseTo(r.totalInterest + 1_000_000, 0);
    expect(r.totalInterest).toBeGreaterThan(1_100_000);
    expect(r.totalInterest).toBeLessThan(1_200_000);
  });
  it('ดอกเบี้ย 0% ไม่มีดอกเบี้ยเลย', () => {
    const z = calculateLoan({ principal: 12_000, annualRatePercent: 0, months: 12 });
    expect(z.totalInterest).toBe(0);
    expect(z.schedule.every((row) => row.interest === 0)).toBe(true);
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npx vitest run src/tools/finance/loan-installment`
Expected: FAIL — cannot find `./logic`

- [ ] **Step 3: เขียน logic.ts**

```ts
export interface LoanInput {
  principal: number;
  annualRatePercent: number;
  months: number;
}
export interface LoanRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}
export interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: LoanRow[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertInput(principal: number, annualRatePercent: number, months: number) {
  if (!(principal > 0)) throw new Error('เงินต้นต้องมากกว่า 0');
  if (!(months >= 1) || !Number.isInteger(months)) throw new Error('จำนวนงวดต้องเป็นจำนวนเต็มอย่างน้อย 1');
  if (!(annualRatePercent >= 0)) throw new Error('อัตราดอกเบี้ยต้องไม่ติดลบ');
}

/** ค่างวดต่อเดือน (สูตร EMI, ดอกเบี้ยลดต้นลดดอก) — ยังไม่ปัดเศษ */
export function monthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  assertInput(principal, annualRatePercent, months);
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function calculateLoan(input: LoanInput): LoanResult {
  const { principal, annualRatePercent, months } = input;
  const pay = round2(monthlyPayment(principal, annualRatePercent, months));
  const r = annualRatePercent / 100 / 12;
  const schedule: LoanRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;

  for (let period = 1; period <= months; period++) {
    const interest = round2(balance * r);
    let principalPart = round2(pay - interest);
    let payment = pay;
    if (period === months || principalPart > balance) {
      principalPart = round2(balance); // งวดสุดท้ายปิดยอดพอดี
      payment = round2(principalPart + interest);
    }
    balance = round2(balance - principalPart);
    totalInterest = round2(totalInterest + interest);
    totalPayment = round2(totalPayment + payment);
    schedule.push({ period, payment, interest, principal: principalPart, balance });
  }

  return { monthlyPayment: pay, totalPayment, totalInterest, schedule };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npx vitest run src/tools/finance/loan-installment`
Expected: PASS

- [ ] **Step 5: meta.ts**

```ts
import type { ToolMeta } from '@/tools/types';

export const loanInstallmentMeta: ToolMeta = {
  slug: 'loan-installment',
  name: 'คำนวณค่างวดผ่อนบ้าน ผ่อนรถ',
  nameEn: 'Loan Installment Calculator',
  category: 'finance',
  tier: 'free',
  description:
    'คำนวณค่างวดต่อเดือน ดอกเบี้ยรวม และตารางผ่อนชำระแบบลดต้นลดดอก สำหรับสินเชื่อบ้าน รถยนต์ หรือสินเชื่อส่วนบุคคล กรอกเงินต้น ดอกเบี้ย และระยะเวลา',
  keywords: ['คำนวณค่างวด', 'ผ่อนบ้าน', 'ผ่อนรถ', 'ตารางผ่อนชำระ', 'ดอกเบี้ยลดต้นลดดอก', 'สินเชื่อ'],
  howTo: [
    'กรอกวงเงินกู้ (เงินต้น) เป็นบาท',
    'กรอกอัตราดอกเบี้ยต่อปี (%) และระยะเวลาผ่อนเป็นปี',
    'ดูค่างวดต่อเดือน ดอกเบี้ยรวม และตารางผ่อนรายงวด',
  ],
  faq: [
    { q: 'ใช้สูตรอะไรคำนวณ', a: 'ใช้สูตรค่างวดคงที่แบบลดต้นลดดอก (EMI) ซึ่งเป็นวิธีที่ธนาคารส่วนใหญ่ใช้สำหรับสินเชื่อบ้านและสินเชื่อส่วนบุคคล' },
    { q: 'ผ่อนรถที่คิดดอกเบี้ยแบบคงที่ (flat rate) ใช้ได้ไหม', a: 'สินเชื่อรถแบบ flat rate คิดดอกเบี้ยจากเงินต้นเต็มตลอดสัญญา ค่างวดจะสูงกว่าผลลัพธ์ที่นี่ ให้เทียบเป็นอัตราลดต้นลดดอกโดยประมาณ ×1.8 ก่อนกรอก' },
    { q: 'ผลลัพธ์ต่างจากธนาคารเล็กน้อยเพราะอะไร', a: 'ธนาคารอาจปัดเศษต่างกัน คิดดอกเบี้ยรายวัน หรือมีค่าธรรมเนียมเพิ่ม ตัวเลขที่นี่ใช้เพื่อวางแผนเบื้องต้น' },
  ],
};
```

- [ ] **Step 6: Tool.tsx**

```tsx
import { useMemo, useState } from 'react';
import { calculateLoan } from './logic';
import { Button, Field, Input, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

export default function LoanInstallmentTool() {
  const [principal, setPrincipal] = useState('2000000');
  const [rate, setRate] = useState('5.5');
  const [years, setYears] = useState('30');
  const [showAll, setShowAll] = useState(false);

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: calculateLoan({ principal: Number(principal), annualRatePercent: Number(rate), months: Math.round(Number(years) * 12) }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [principal, rate, years]);

  const rows = result.ok ? (showAll ? result.value.schedule : result.value.schedule.slice(0, 12)) : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="วงเงินกู้ (บาท)" htmlFor="principal">
          <Input id="principal" inputMode="decimal" value={principal} onChange={(e) => setPrincipal(e.target.value)} />
        </Field>
        <Field label="ดอกเบี้ยต่อปี (%)" htmlFor="rate">
          <Input id="rate" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
        </Field>
        <Field label="ระยะเวลาผ่อน (ปี)" htmlFor="years">
          <Input id="years" inputMode="numeric" value={years} onChange={(e) => setYears(e.target.value)} />
        </Field>
      </div>

      {!result.ok && <p className="text-sm text-red-600">{result.error}</p>}

      {result.ok && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="ค่างวดต่อเดือน" value={`${formatBaht(result.value.monthlyPayment)} บาท`} />
            <Stat label="ดอกเบี้ยรวมตลอดสัญญา" value={`${formatBaht(result.value.totalInterest)} บาท`} />
            <Stat label="ยอดจ่ายรวม" value={`${formatBaht(result.value.totalPayment)} บาท`} />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr>
                  <th className="px-2 py-1">งวด</th><th className="px-2 py-1">ค่างวด</th><th className="px-2 py-1">ดอกเบี้ย</th><th className="px-2 py-1">เงินต้น</th><th className="px-2 py-1">คงเหลือ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-t border-slate-100">
                    <td className="px-2 py-1">{r.period}</td>
                    <td className="px-2 py-1">{formatBaht(r.payment)}</td>
                    <td className="px-2 py-1">{formatBaht(r.interest)}</td>
                    <td className="px-2 py-1">{formatBaht(r.principal)}</td>
                    <td className="px-2 py-1">{formatBaht(r.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {result.value.schedule.length > 12 && (
            <Button variant="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'แสดงเฉพาะ 12 งวดแรก' : `แสดงทั้งหมด ${result.value.schedule.length} งวด`}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`src/tools/registry.ts`: เพิ่ม `import { loanInstallmentMeta } from './finance/loan-installment/meta';` และ `tools = [loanInstallmentMeta, bahtTextMeta]`
`src/tools/loaders.ts`: เพิ่ม `'loan-installment': () => import('./finance/loan-installment/Tool'),`

- [ ] **Step 8: ทดสอบทั้งหมด + build + commit**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: PASS; มี `dist/t/loan-installment/index.html`

```bash
git add src/tools
git commit -m "feat(tool): loan-installment — คำนวณค่างวดและตารางผ่อน

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 7: เครื่องมือ "คำนวณภาษีเงินได้บุคคลธรรมดา" (premium)

**Files:**
- Create: `src/tools/finance/thai-income-tax/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `TAX_BRACKETS`, `TAX_LIMITS`, `progressiveTax(netIncome): { tax; lines: TaxBracketLine[] }`, `calculateTax(input: TaxInput): TaxResult`
- หมายเหตุ: อัตราขั้นบันไดและเพดานลดหย่อนเป็น**ค่าคงที่ที่แก้ได้ในไฟล์เดียว** (`TAX_LIMITS`) เพราะเปลี่ยนรายปี; ค่าปัจจุบัน = ปีภาษี 2568 (ยื่นต้นปี 2569)

- [ ] **Step 1: เขียน test**

`src/tools/finance/thai-income-tax/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { progressiveTax, calculateTax, TAX_LIMITS, type TaxInput } from './logic';

const base: TaxInput = {
  annualIncome: 0, hasSpouseNoIncome: false, children: 0, childrenBorn2018Plus: 0, parents: 0,
  socialSecurity: 0, lifeInsurance: 0, healthInsurance: 0, retirementFunds: 0, homeLoanInterest: 0,
  donations: 0, otherDeductions: 0, withheldTax: 0,
};

describe('progressiveTax', () => {
  it.each([
    [0, 0],
    [150_000, 0],
    [300_000, 7_500],
    [500_000, 27_500],
    [750_000, 65_000],
    [1_000_000, 115_000],
    [2_000_000, 365_000],
    [5_000_000, 1_265_000],
    [5_000_001, 1_265_000.35],
  ])('เงินได้สุทธิ %d → ภาษี %d', (net, tax) => {
    expect(progressiveTax(net).tax).toBeCloseTo(tax, 2);
  });
  it('แสดงบรรทัดเฉพาะขั้นที่มีเงินได้ตกอยู่', () => {
    const { lines } = progressiveTax(440_000);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatchObject({ from: 300_000, to: 500_000, rate: 0.1, taxable: 140_000, tax: 14_000 });
  });
});

describe('calculateTax', () => {
  it('เงินได้ 300,000: หักค่าใช้จ่าย 100,000 + ส่วนตัว 60,000 → ไม่เสียภาษี', () => {
    const r = calculateTax({ ...base, annualIncome: 300_000 });
    expect(r.expense).toBe(100_000);
    expect(r.allowances).toBe(TAX_LIMITS.personal);
    expect(r.netIncome).toBe(140_000);
    expect(r.tax).toBe(0);
  });
  it('เงินได้ 600,000 ไม่มีลดหย่อนอื่น → 21,500', () => {
    const r = calculateTax({ ...base, annualIncome: 600_000 });
    expect(r.netIncome).toBe(440_000);
    expect(r.tax).toBe(21_500);
    expect(r.effectiveRate).toBeCloseTo(21_500 / 600_000, 6);
  });
  it('ค่าใช้จ่าย 50% แต่ไม่เกินเพดาน', () => {
    expect(calculateTax({ ...base, annualIncome: 150_000 }).expense).toBe(75_000);
    expect(calculateTax({ ...base, annualIncome: 400_000 }).expense).toBe(TAX_LIMITS.expenseCap);
  });
  it('ลดหย่อนถูกจำกัดเพดาน: ประกันสังคม, ประกันชีวิต+สุขภาพ, กองทุนเกษียณ, ดอกเบี้ยบ้าน, บิดามารดา', () => {
    const r = calculateTax({
      ...base, annualIncome: 3_000_000,
      socialSecurity: 20_000, lifeInsurance: 150_000, healthInsurance: 50_000,
      retirementFunds: 900_000, homeLoanInterest: 200_000, parents: 6,
    });
    const expected =
      TAX_LIMITS.personal + TAX_LIMITS.socialSecurityCap + TAX_LIMITS.lifeInsuranceCap +
      TAX_LIMITS.retirementCap + TAX_LIMITS.homeLoanCap + TAX_LIMITS.parentMax * TAX_LIMITS.parent;
    expect(r.allowances).toBe(expected);
  });
  it('คู่สมรส + บุตร 2 คน (คนที่สองเกิดหลัง 2561) + ประกันสังคม', () => {
    const r = calculateTax({ ...base, annualIncome: 1_500_000, hasSpouseNoIncome: true, children: 1, childrenBorn2018Plus: 1, socialSecurity: 9_000, lifeInsurance: 100_000 });
    // 1,500,000 - 100,000 - (60,000+60,000+30,000+60,000+9,000+100,000) = 1,081,000
    expect(r.netIncome).toBe(1_081_000);
    expect(r.tax).toBe(115_000 + 81_000 * 0.25);
  });
  it('เงินบริจาคไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและลดหย่อน', () => {
    const r = calculateTax({ ...base, annualIncome: 600_000, donations: 100_000 });
    // ก่อนบริจาค 440,000 → บริจาคได้สูงสุด 44,000
    expect(r.donationUsed).toBe(44_000);
    expect(r.netIncome).toBe(396_000);
  });
  it('ยอดต้องชำระเพิ่ม/ได้คืน', () => {
    expect(calculateTax({ ...base, annualIncome: 600_000, withheldTax: 30_000 }).balance).toBe(-8_500);
    expect(calculateTax({ ...base, annualIncome: 600_000, withheldTax: 10_000 }).balance).toBe(11_500);
  });
  it('เงินได้ติดลบหรือ NaN โยน error', () => {
    expect(() => calculateTax({ ...base, annualIncome: -1 })).toThrow();
    expect(() => calculateTax({ ...base, annualIncome: NaN })).toThrow();
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npx vitest run src/tools/finance/thai-income-tax`
Expected: FAIL — cannot find `./logic`

- [ ] **Step 3: เขียน logic.ts**

```ts
/** อัตราภาษีเงินได้บุคคลธรรมดา (ขั้นบันได) ปีภาษี 2568 */
export const TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

/** เพดานลดหย่อน ปีภาษี 2568 — แก้ที่นี่ที่เดียวเมื่อกฎเปลี่ยน */
export const TAX_LIMITS = {
  expenseRate: 0.5,
  expenseCap: 100_000,
  personal: 60_000,
  spouse: 60_000,
  child: 30_000,
  childBorn2018Plus: 60_000,
  parent: 30_000,
  parentMax: 4,
  socialSecurityCap: 9_000,
  lifeInsuranceCap: 100_000,     // ประกันชีวิต + สุขภาพ รวมกันไม่เกิน
  healthInsuranceCap: 25_000,
  retirementCap: 500_000,        // PVD + RMF + SSF/TESG + ประกันบำนาญ รวม
  homeLoanCap: 100_000,
  donationRate: 0.1,
} as const;

export interface TaxInput {
  /** เงินได้ 40(1)/(2) รวมทั้งปี */
  annualIncome: number;
  hasSpouseNoIncome: boolean;
  /** บุตรที่ลดหย่อนได้ 30,000 */
  children: number;
  /** บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561 ลดหย่อน 60,000 */
  childrenBorn2018Plus: number;
  parents: number;
  socialSecurity: number;
  lifeInsurance: number;
  healthInsurance: number;
  retirementFunds: number;
  homeLoanInterest: number;
  donations: number;
  /** ลดหย่อนอื่นที่กรอกเอง (เช่น Easy E-Receipt) ใช้ตามที่กรอก */
  otherDeductions: number;
  withheldTax: number;
}

export interface TaxBracketLine {
  from: number;
  to: number;
  rate: number;
  taxable: number;
  tax: number;
}

export interface TaxResult {
  expense: number;
  allowances: number;
  donationUsed: number;
  netIncome: number;
  tax: number;
  effectiveRate: number;
  lines: TaxBracketLine[];
  /** บวก = ต้องชำระเพิ่ม, ลบ = ได้คืน */
  balance: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, cap: number) => Math.min(Math.max(n, 0), cap);

export function progressiveTax(netIncome: number): { tax: number; lines: TaxBracketLine[] } {
  const lines: TaxBracketLine[] = [];
  let prev = 0;
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (netIncome <= prev) break;
    const taxable = Math.min(netIncome, b.upTo) - prev;
    const t = round2(taxable * b.rate);
    lines.push({ from: prev, to: b.upTo, rate: b.rate, taxable, tax: t });
    tax = round2(tax + t);
    prev = b.upTo;
  }
  return { tax, lines };
}

export function calculateTax(input: TaxInput): TaxResult {
  const income = input.annualIncome;
  if (!Number.isFinite(income) || income < 0) throw new Error('เงินได้ต้องเป็นตัวเลขไม่ติดลบ');
  const L = TAX_LIMITS;

  const expense = Math.min(income * L.expenseRate, L.expenseCap);

  const insurance = Math.min(clamp(input.lifeInsurance, L.lifeInsuranceCap) + clamp(input.healthInsurance, L.healthInsuranceCap), L.lifeInsuranceCap);
  const allowances =
    L.personal +
    (input.hasSpouseNoIncome ? L.spouse : 0) +
    Math.max(0, input.children) * L.child +
    Math.max(0, input.childrenBorn2018Plus) * L.childBorn2018Plus +
    Math.min(Math.max(0, input.parents), L.parentMax) * L.parent +
    clamp(input.socialSecurity, L.socialSecurityCap) +
    insurance +
    clamp(input.retirementFunds, L.retirementCap) +
    clamp(input.homeLoanInterest, L.homeLoanCap) +
    Math.max(0, input.otherDeductions);

  const beforeDonation = Math.max(0, income - expense - allowances);
  const donationUsed = Math.min(Math.max(0, input.donations), beforeDonation * L.donationRate);
  const netIncome = round2(beforeDonation - donationUsed);

  const { tax, lines } = progressiveTax(netIncome);
  return {
    expense,
    allowances,
    donationUsed,
    netIncome,
    tax,
    effectiveRate: income > 0 ? tax / income : 0,
    lines,
    balance: round2(tax - Math.max(0, input.withheldTax)),
  };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npx vitest run src/tools/finance/thai-income-tax`
Expected: PASS

- [ ] **Step 5: meta.ts**

```ts
import type { ToolMeta } from '@/tools/types';

export const thaiIncomeTaxMeta: ToolMeta = {
  slug: 'thai-income-tax',
  name: 'คำนวณภาษีเงินได้บุคคลธรรมดา ปีภาษี 2568',
  nameEn: 'Thai Personal Income Tax Calculator',
  category: 'finance',
  tier: 'premium',
  description:
    'คำนวณภาษีเงินได้บุคคลธรรมดาจากเงินเดือนและรายได้ทั้งปี พร้อมค่าลดหย่อนครบ คู่สมรส บุตร บิดามารดา ประกันสังคม ประกันชีวิต กองทุน RMF SSF ดอกเบี้ยบ้าน เงินบริจาค แสดงภาษีแต่ละขั้นและยอดต้องจ่ายเพิ่มหรือได้คืน',
  keywords: ['คำนวณภาษี', 'ภาษีเงินได้บุคคลธรรมดา', 'ภงด.90', 'ภงด.91', 'ลดหย่อนภาษี', 'ภาษีเงินเดือน', 'ยื่นภาษี 2569'],
  howTo: [
    'กรอกเงินได้รวมทั้งปี (เงินเดือน × 12 + โบนัส)',
    'เลือกและกรอกค่าลดหย่อนที่มี เช่น ประกันสังคม ประกันชีวิต กองทุน',
    'กรอกภาษีที่ถูกหัก ณ ที่จ่ายแล้ว (ดูจากหนังสือรับรอง 50 ทวิ)',
    'ดูภาษีที่ต้องเสีย รายละเอียดแต่ละขั้น และยอดที่ต้องจ่ายเพิ่มหรือได้คืน',
  ],
  faq: [
    { q: 'ใช้อัตราภาษีปีไหน', a: 'อัตราขั้นบันได 0–35% และเพดานลดหย่อนของปีภาษี 2568 (ยื่นแบบต้นปี 2569) ค่าใช้จ่ายเหมา 50% ไม่เกิน 100,000 บาท ลดหย่อนส่วนตัว 60,000 บาท' },
    { q: 'รายได้จากฟรีแลนซ์หรือค่าเช่าใช้ได้ไหม', a: 'เครื่องมือนี้ออกแบบสำหรับเงินได้ประเภท 40(1) และ 40(2) เช่น เงินเดือน ค่าจ้าง ค่านายหน้า เงินได้ประเภทอื่นหักค่าใช้จ่ายต่างกัน' },
    { q: 'เงินบริจาคลดหย่อนได้เท่าไร', a: 'ลดหย่อนได้ตามจริงแต่ไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและค่าลดหย่อนอื่น บริจาคการศึกษา/โรงพยาบาลรัฐบางประเภทลดหย่อนได้ 2 เท่า ให้กรอกยอดที่คูณแล้ว' },
    { q: 'ผลลัพธ์ใช้ยื่นภาษีได้เลยไหม', a: 'ใช้เพื่อวางแผนและประมาณการ การยื่นจริงให้ตรวจสอบกับระบบ e-Filing ของกรมสรรพากรอีกครั้ง' },
  ],
};
```

- [ ] **Step 6: Tool.tsx**

```tsx
import { useMemo, useState } from 'react';
import { calculateTax, type TaxInput } from './logic';
import { Field, Input, Stat } from '@/components/ui';
import { formatBaht } from '@/lib/format';

type NumKey = Exclude<keyof TaxInput, 'hasSpouseNoIncome'>;
type Form = Record<NumKey, string> & { hasSpouseNoIncome: boolean };

const fields: { key: NumKey; label: string; hint?: string }[] = [
  { key: 'annualIncome', label: 'เงินได้รวมทั้งปี (บาท)', hint: 'เงินเดือน × 12 + โบนัส + ค่าคอมมิชชัน' },
  { key: 'children', label: 'จำนวนบุตร (30,000/คน)' },
  { key: 'childrenBorn2018Plus', label: 'บุตรคนที่ 2+ เกิดตั้งแต่ปี 2561 (60,000/คน)' },
  { key: 'parents', label: 'อุปการะบิดามารดา (คน, สูงสุด 4)' },
  { key: 'socialSecurity', label: 'ประกันสังคมที่จ่ายทั้งปี', hint: 'สูงสุด 9,000' },
  { key: 'lifeInsurance', label: 'เบี้ยประกันชีวิต', hint: 'สูงสุด 100,000' },
  { key: 'healthInsurance', label: 'เบี้ยประกันสุขภาพ', hint: 'สูงสุด 25,000 (รวมกับประกันชีวิตไม่เกิน 100,000)' },
  { key: 'retirementFunds', label: 'กองทุนสำรองเลี้ยงชีพ + RMF + SSF/TESG + ประกันบำนาญ', hint: 'รวมสูงสุด 500,000' },
  { key: 'homeLoanInterest', label: 'ดอกเบี้ยกู้บ้าน', hint: 'สูงสุด 100,000' },
  { key: 'donations', label: 'เงินบริจาค', hint: 'ไม่เกิน 10% ของเงินได้หลังหักลดหย่อน' },
  { key: 'otherDeductions', label: 'ลดหย่อนอื่น ๆ (Easy E-Receipt ฯลฯ)' },
  { key: 'withheldTax', label: 'ภาษีหัก ณ ที่จ่ายแล้ว (จาก 50 ทวิ)' },
];

const initial: Form = {
  annualIncome: '600000', children: '0', childrenBorn2018Plus: '0', parents: '0', socialSecurity: '9000',
  lifeInsurance: '0', healthInsurance: '0', retirementFunds: '0', homeLoanInterest: '0', donations: '0',
  otherDeductions: '0', withheldTax: '0', hasSpouseNoIncome: false,
};

export default function ThaiIncomeTaxTool() {
  const [form, setForm] = useState<Form>(initial);

  const result = useMemo(() => {
    const input = Object.fromEntries(fields.map((f) => [f.key, Number(form[f.key].replace(/,/g, '')) || 0])) as Record<NumKey, number>;
    try {
      return { ok: true as const, value: calculateTax({ ...input, hasSpouseNoIncome: form.hasSpouseNoIncome }) };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [form]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3">
        {fields.map((f) => (
          <Field key={f.key} label={f.label} htmlFor={f.key} hint={f.hint}>
            <Input id={f.key} inputMode="decimal" value={form[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
          </Field>
        ))}
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.hasSpouseNoIncome} onChange={(e) => setForm({ ...form, hasSpouseNoIncome: e.target.checked })} />
          คู่สมรสไม่มีเงินได้ (ลดหย่อน 60,000)
        </label>
      </div>

      <div className="space-y-4">
        {!result.ok && <p className="text-sm text-red-600">{result.error}</p>}
        {result.ok && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Stat label="ภาษีที่ต้องเสีย" value={`${formatBaht(result.value.tax)} บาท`} />
              <Stat label={result.value.balance >= 0 ? 'ต้องชำระเพิ่ม' : 'ได้คืน'} value={`${formatBaht(Math.abs(result.value.balance))} บาท`} />
              <Stat label="เงินได้สุทธิ" value={`${formatBaht(result.value.netIncome)} บาท`} />
              <Stat label="อัตราภาษีเฉลี่ย" value={`${(result.value.effectiveRate * 100).toFixed(2)}%`} />
            </div>
            <ul className="space-y-1 text-sm text-slate-600">
              <li>หักค่าใช้จ่าย {formatBaht(result.value.expense)} บาท</li>
              <li>ค่าลดหย่อนรวม {formatBaht(result.value.allowances)} บาท</li>
              <li>เงินบริจาคที่ใช้ได้ {formatBaht(result.value.donationUsed)} บาท</li>
            </ul>
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-left">
                <tr><th className="px-2 py-1">ขั้นเงินได้สุทธิ</th><th className="px-2 py-1">อัตรา</th><th className="px-2 py-1">ภาษี</th></tr>
              </thead>
              <tbody>
                {result.value.lines.map((l) => (
                  <tr key={l.from} className="border-t border-slate-100">
                    <td className="px-2 py-1">{formatBaht(l.from)} – {l.to === Infinity ? 'ขึ้นไป' : formatBaht(l.to)}</td>
                    <td className="px-2 py-1">{l.rate * 100}%</td>
                    <td className="px-2 py-1">{formatBaht(l.tax)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`registry.ts`: import `thaiIncomeTaxMeta` และเรียง `tools = [thaiIncomeTaxMeta, loanInstallmentMeta, bahtTextMeta]`
`loaders.ts`: เพิ่ม `'thai-income-tax': () => import('./finance/thai-income-tax/Tool'),`

- [ ] **Step 8: ทดสอบทั้งหมด + build + commit**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: PASS; `dist/t/thai-income-tax/index.html` มีคำว่า "พรีเมียม"

```bash
git add src/tools
git commit -m "feat(tool): thai-income-tax — คำนวณภาษีเงินได้บุคคลธรรมดา

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 8: เครื่องมือ "สร้าง QR PromptPay"

**Files:**
- Create: `src/types/promptpay-qr.d.ts`, `src/tools/qr/promptpay-qr/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `normalizeTarget(raw: string): { type: 'phone'|'nationalId'|'ewallet'; value: string }`; `buildPromptPayPayload(target: string, amount?: number): string` (EMVCo payload สำหรับทำ QR)
- ไลบรารี `promptpay-qr` เป็น CommonJS ไม่มี type → ประกาศเอง

- [ ] **Step 1: ประกาศ type ของ promptpay-qr**

`src/types/promptpay-qr.d.ts`:
```ts
declare module 'promptpay-qr' {
  /** สร้าง EMVCo payload สำหรับ PromptPay (เบอร์โทร 10 หลัก, เลขบัตร 13 หลัก, e-wallet 15 หลัก) */
  export default function generatePayload(target: string, options?: { amount?: number }): string;
}
```

- [ ] **Step 2: เขียน test**

`src/tools/qr/promptpay-qr/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { normalizeTarget, buildPromptPayPayload } from './logic';

describe('normalizeTarget', () => {
  it('เบอร์โทรรูปแบบต่าง ๆ → 10 หลักขึ้นต้น 0', () => {
    expect(normalizeTarget('081-234-5678')).toEqual({ type: 'phone', value: '0812345678' });
    expect(normalizeTarget('+66 81 234 5678')).toEqual({ type: 'phone', value: '0812345678' });
    expect(normalizeTarget('66812345678')).toEqual({ type: 'phone', value: '0812345678' });
  });
  it('เลขบัตรประชาชน 13 หลัก และ e-wallet 15 หลัก', () => {
    expect(normalizeTarget('1-2345-67890-12-3')).toEqual({ type: 'nationalId', value: '1234567890123' });
    expect(normalizeTarget('123456789012345')).toEqual({ type: 'ewallet', value: '123456789012345' });
  });
  it('รูปแบบไม่ถูกต้องโยน error', () => {
    expect(() => normalizeTarget('12345')).toThrow('กรุณากรอกเบอร์โทร 10 หลัก');
    expect(() => normalizeTarget('')).toThrow();
  });
});

describe('buildPromptPayPayload', () => {
  it('payload เป็น EMVCo: ขึ้นต้น 000201, มี 5802TH, ลงท้าย CRC 6304XXXX', () => {
    const p = buildPromptPayPayload('0812345678');
    expect(p.startsWith('000201')).toBe(true);
    expect(p).toContain('5802TH');
    expect(p).toMatch(/6304[0-9A-F]{4}$/);
  });
  it('เบอร์โทรถูกแปลงเป็นรูปแบบสากล 0066 ใน payload', () => {
    expect(buildPromptPayPayload('0812345678')).toContain('0066812345678');
  });
  it('ระบุจำนวนเงินจะมี tag 54 พร้อมทศนิยม 2 ตำแหน่ง', () => {
    expect(buildPromptPayPayload('0812345678', 100)).toContain('5406100.00');
    expect(buildPromptPayPayload('0812345678', 1234.5)).toContain('54071234.50');
  });
  it('ไม่ระบุจำนวนเงินหรือ 0 → ไม่มี tag 54', () => {
    expect(buildPromptPayPayload('0812345678')).not.toContain('5406');
    expect(buildPromptPayPayload('0812345678', 0)).not.toMatch(/54\d{2}\d+\.\d{2}/);
  });
  it('จำนวนเงินติดลบโยน error', () => {
    expect(() => buildPromptPayPayload('0812345678', -1)).toThrow('จำนวนเงินต้องไม่ติดลบ');
  });
});
```

- [ ] **Step 3: รันให้ fail**

Run: `npx vitest run src/tools/qr/promptpay-qr`
Expected: FAIL — cannot find `./logic`

- [ ] **Step 4: เขียน logic.ts**

```ts
import generatePayload from 'promptpay-qr';

export type PromptPayTargetType = 'phone' | 'nationalId' | 'ewallet';

export function normalizeTarget(raw: string): { type: PromptPayTargetType; value: string } {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('66') && digits.length === 11) digits = '0' + digits.slice(2);
  if (digits.length === 10 && digits.startsWith('0')) return { type: 'phone', value: digits };
  if (digits.length === 13) return { type: 'nationalId', value: digits };
  if (digits.length === 15) return { type: 'ewallet', value: digits };
  throw new Error('กรุณากรอกเบอร์โทร 10 หลัก, เลขบัตรประชาชน 13 หลัก หรือ e-Wallet 15 หลัก');
}

/** คืน EMVCo payload สำหรับสร้าง QR PromptPay (amount ไม่ระบุ/0 = ให้ผู้จ่ายกรอกเอง) */
export function buildPromptPayPayload(target: string, amount?: number): string {
  const { value } = normalizeTarget(target);
  if (amount !== undefined && !(Number.isFinite(amount) && amount >= 0)) {
    throw new Error('จำนวนเงินต้องไม่ติดลบ');
  }
  const opts = amount && amount > 0 ? { amount: Math.round(amount * 100) / 100 } : {};
  return generatePayload(value, opts);
}
```

- [ ] **Step 5: รันให้ผ่าน**

Run: `npx vitest run src/tools/qr/promptpay-qr`
Expected: PASS (ถ้า `0066812345678` ไม่ตรง ให้ดู payload จริงด้วย `console.log` แล้วแก้ค่าใน test ให้ตรง format ของไลบรารี — ไลบรารีใช้ tag `01` + `0066` + 9 หลักหลังตัด 0)

- [ ] **Step 6: meta.ts**

```ts
import type { ToolMeta } from '@/tools/types';

export const promptpayQrMeta: ToolMeta = {
  slug: 'promptpay-qr',
  name: 'สร้าง QR Code รับเงิน PromptPay',
  nameEn: 'PromptPay QR Generator',
  category: 'qr',
  tier: 'free',
  description:
    'สร้าง QR Code พร้อมเพย์สำหรับรับเงินโอนจากเบอร์โทรศัพท์ เลขบัตรประชาชน หรือ e-Wallet ระบุจำนวนเงินได้ ดาวน์โหลดเป็นรูปไปใส่ป้ายหน้าร้านหรือส่งให้ลูกค้า ไม่ต้องสมัคร',
  keywords: ['QR PromptPay', 'พร้อมเพย์', 'สร้าง QR รับเงิน', 'คิวอาร์โค้ดรับเงิน', 'promptpay qr'],
  howTo: [
    'กรอกเบอร์โทรศัพท์หรือเลขบัตรประชาชนที่ผูกพร้อมเพย์ไว้',
    'ระบุจำนวนเงิน (ไม่ระบุก็ได้ ผู้โอนจะกรอกเอง)',
    'สแกนทดสอบด้วยแอปธนาคาร แล้วกดดาวน์โหลดรูป QR',
  ],
  faq: [
    { q: 'QR ที่สร้างปลอดภัยไหม', a: 'QR PromptPay มีเพียงหมายเลขรับเงินและจำนวนเงิน ไม่มีข้อมูลลับ สร้างในเบราว์เซอร์ของคุณโดยตรง ไม่ส่งข้อมูลขึ้นเซิร์ฟเวอร์' },
    { q: 'ใช้กับทุกธนาคารได้ไหม', a: 'ได้ เป็นมาตรฐาน Thai QR Payment ของธนาคารแห่งประเทศไทย สแกนได้กับแอปธนาคารทุกแห่งในไทย' },
    { q: 'ทำไมสแกนแล้วไม่ขึ้นชื่อบัญชี', a: 'หมายเลขที่กรอกอาจยังไม่ได้ผูกพร้อมเพย์ ตรวจสอบกับแอปธนาคารของคุณก่อน' },
  ],
};
```

- [ ] **Step 7: Tool.tsx**

```tsx
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { buildPromptPayPayload, normalizeTarget } from './logic';
import { Field, Input } from '@/components/ui';

const TYPE_LABEL = { phone: 'เบอร์โทรศัพท์', nationalId: 'เลขบัตรประชาชน', ewallet: 'e-Wallet' } as const;

export default function PromptPayQrTool() {
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');

  let typeLabel = '';
  try {
    if (target.trim()) typeLabel = TYPE_LABEL[normalizeTarget(target).type];
  } catch {
    /* แสดง error ตอนสร้าง QR แทน */
  }

  useEffect(() => {
    if (!target.trim()) {
      setDataUrl('');
      setError('');
      return;
    }
    try {
      const amt = amount.trim() ? Number(amount.replace(/,/g, '')) : undefined;
      const payload = buildPromptPayPayload(target, amt);
      QRCode.toDataURL(payload, { width: 320, margin: 2, errorCorrectionLevel: 'M' }).then((url) => {
        setDataUrl(url);
        setError('');
      });
    } catch (e) {
      setError((e as Error).message);
      setDataUrl('');
    }
  }, [target, amount]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-4">
        <Field label="เบอร์โทร / เลขบัตรประชาชน / e-Wallet" htmlFor="target" hint={typeLabel ? `ตรวจพบ: ${typeLabel}` : 'เช่น 0812345678'}>
          <Input id="target" inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} autoFocus />
        </Field>
        <Field label="จำนวนเงิน (บาท) — เว้นว่างให้ผู้โอนกรอกเอง" htmlFor="amount">
          <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="เช่น 150.00" />
        </Field>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
      <div className="flex flex-col items-center gap-3">
        {dataUrl ? (
          <>
            <img src={dataUrl} alt="QR PromptPay" width={320} height={320} className="rounded-lg border border-slate-200 bg-white" />
            <a href={dataUrl} download={`promptpay-${target.replace(/\D/g, '')}.png`} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
              ดาวน์โหลดรูป QR
            </a>
          </>
        ) : (
          <div className="flex h-80 w-80 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
            QR จะแสดงที่นี่
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 8: ลงทะเบียน**

`registry.ts`: import `promptpayQrMeta`; `tools = [thaiIncomeTaxMeta, loanInstallmentMeta, bahtTextMeta, promptpayQrMeta]`
`loaders.ts`: เพิ่ม `'promptpay-qr': () => import('./qr/promptpay-qr/Tool'),`

- [ ] **Step 9: ทดสอบ + build + ทดสอบใน browser + commit**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: PASS (ถ้า build เตือนเรื่อง `qrcode` ใช้ Node built-in ให้ตรวจว่า import ถูก tree-shake ไปฝั่ง client — โมดูล `qrcode` มี browser build อยู่แล้ว)
Run: `npm run dev` เปิด `/t/promptpay-qr` กรอก `0812345678` + `100` → เห็น QR และสแกนด้วยแอปธนาคารขึ้นยอด 100.00 (ทดสอบด้วยเบอร์ของตัวเองจริง)

```bash
git add src/tools src/types
git commit -m "feat(tool): promptpay-qr — สร้าง QR รับเงินพร้อมเพย์

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 9: เครื่องมือ "JSON Formatter / Validator"

**Files:**
- Create: `src/tools/dev/json-formatter/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `formatJson(input, indent: 2|4|'tab' = 2): JsonResult`; `minifyJson(input): JsonResult`; `JsonResult = { ok: true; output: string } | { ok: false; error: { message; line; column; position } }`

- [ ] **Step 1: เขียน test**

`src/tools/dev/json-formatter/logic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { formatJson, minifyJson } from './logic';

describe('formatJson', () => {
  it('จัดรูปแบบด้วย 2 ช่องว่างเป็นค่าเริ่มต้น', () => {
    const r = formatJson('{"a":1,"b":[1,2]}');
    expect(r).toEqual({ ok: true, output: '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}' });
  });
  it('รองรับ 4 ช่องว่างและแท็บ', () => {
    expect(formatJson('{"a":1}', 4)).toEqual({ ok: true, output: '{\n    "a": 1\n}' });
    expect(formatJson('{"a":1}', 'tab')).toEqual({ ok: true, output: '{\n\t"a": 1\n}' });
  });
  it('ข้อความว่างเป็น error ที่อ่านเข้าใจ', () => {
    const r = formatJson('   ');
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message).toBe('ยังไม่ได้ใส่ข้อมูล JSON');
  });
  it('JSON ผิดรูปแบบบอกตำแหน่งบรรทัด/คอลัมน์', () => {
    const r = formatJson('{\n  "a": 1,\n}');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.line).toBe(3);
      expect(r.error.column).toBe(1);
      expect(r.error.position).toBe(12);
      expect(r.error.message.length).toBeGreaterThan(0);
    }
  });
});

describe('minifyJson', () => {
  it('ลบช่องว่างทั้งหมด', () => {
    expect(minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}')).toEqual({ ok: true, output: '{"a":1,"b":[1,2]}' });
  });
  it('รักษาค่าใน string', () => {
    expect(minifyJson('{"s": "a  b"}')).toEqual({ ok: true, output: '{"s":"a  b"}' });
  });
});
```

- [ ] **Step 2: รันให้ fail**

Run: `npx vitest run src/tools/dev/json-formatter`
Expected: FAIL — cannot find `./logic`

- [ ] **Step 3: เขียน logic.ts**

```ts
export interface JsonError {
  message: string;
  line: number;
  column: number;
  position: number;
}
export type JsonResult = { ok: true; output: string } | { ok: false; error: JsonError };
export type Indent = 2 | 4 | 'tab';

function locate(input: string, position: number): { line: number; column: number } {
  const before = input.slice(0, position);
  const line = (before.match(/\n/g)?.length ?? 0) + 1;
  const column = position - (before.lastIndexOf('\n') + 1) + 1;
  return { line, column };
}

function parse(input: string): { ok: true; value: unknown } | { ok: false; error: JsonError } {
  if (!input.trim()) return { ok: false, error: { message: 'ยังไม่ได้ใส่ข้อมูล JSON', line: 1, column: 1, position: 0 } };
  try {
    return { ok: true, value: JSON.parse(input) };
  } catch (e) {
    const msg = (e as Error).message;
    // V8: "... in JSON at position 12 (line 3 column 1)" / Firefox: "... at line 3 column 1"
    const pos = /position (\d+)/.exec(msg);
    const lc = /line (\d+) column (\d+)/.exec(msg);
    let position = pos ? Number(pos[1]) : 0;
    let { line, column } = lc ? { line: Number(lc[1]), column: Number(lc[2]) } : locate(input, position);
    if (!pos && lc) {
      const lines = input.split('\n');
      position = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0) + column - 1;
    }
    return { ok: false, error: { message: msg, line, column, position } };
  }
}

export function formatJson(input: string, indent: Indent = 2): JsonResult {
  const r = parse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value, null, indent === 'tab' ? '\t' : indent) };
}

export function minifyJson(input: string): JsonResult {
  const r = parse(input);
  if (!r.ok) return r;
  return { ok: true, output: JSON.stringify(r.value) };
}
```

- [ ] **Step 4: รันให้ผ่าน**

Run: `npx vitest run src/tools/dev/json-formatter`
Expected: PASS (Node 22 ให้ทั้ง position และ line/column ใน message)

- [ ] **Step 5: meta.ts**

```ts
import type { ToolMeta } from '@/tools/types';

export const jsonFormatterMeta: ToolMeta = {
  slug: 'json-formatter',
  name: 'JSON Formatter จัดรูปแบบ ตรวจสอบ ย่อ JSON',
  nameEn: 'JSON Formatter & Validator',
  category: 'dev',
  tier: 'free',
  description:
    'จัดรูปแบบ JSON ให้อ่านง่าย (pretty print) ตรวจสอบความถูกต้องพร้อมบอกตำแหน่งบรรทัดที่ผิด และย่อ JSON (minify) ทำงานในเบราว์เซอร์ ข้อมูลไม่ถูกส่งออกไปไหน',
  keywords: ['json formatter', 'จัดรูปแบบ json', 'ตรวจสอบ json', 'json validator', 'json minify', 'pretty print'],
  howTo: [
    'วาง JSON ลงในช่องด้านซ้าย',
    'กด "จัดรูปแบบ" หรือ "ย่อ" ผลลัพธ์แสดงด้านขวา',
    'ถ้า JSON ผิด ระบบบอกบรรทัดและคอลัมน์ที่ผิด แก้แล้วกดใหม่',
  ],
  faq: [
    { q: 'ข้อมูลของฉันปลอดภัยไหม', a: 'ปลอดภัย การประมวลผลทั้งหมดเกิดในเบราว์เซอร์ของคุณ ไม่มีการส่ง JSON ไปยังเซิร์ฟเวอร์' },
    { q: 'รองรับไฟล์ใหญ่แค่ไหน', a: 'ขึ้นกับหน่วยความจำของเครื่อง โดยทั่วไปหลายสิบ MB ยังใช้ได้ ถ้าช้าให้ลองย่อก่อน' },
    { q: 'ทำไม JSON ที่มี comment หรือ trailing comma ถึงผิด', a: 'มาตรฐาน JSON ไม่อนุญาตให้มี comment และคอมมาท้ายรายการ ต้องลบออกก่อน (ต่างจาก JSON5)' },
  ],
};
```

- [ ] **Step 6: Tool.tsx**

```tsx
import { useState } from 'react';
import { formatJson, minifyJson, type Indent, type JsonResult } from './logic';
import { Button, Select, Textarea } from '@/components/ui';

export default function JsonFormatterTool() {
  const [input, setInput] = useState('{"name":"ทูลสยาม","tools":[1,2,3]}');
  const [indent, setIndent] = useState<Indent>(2);
  const [result, setResult] = useState<JsonResult | null>(null);
  const [copied, setCopied] = useState(false);

  function run(fn: () => JsonResult) {
    setResult(fn());
    setCopied(false);
  }
  async function copy() {
    if (result?.ok) {
      await navigator.clipboard.writeText(result.output);
      setCopied(true);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => run(() => formatJson(input, indent))}>จัดรูปแบบ</Button>
        <Button variant="secondary" onClick={() => run(() => minifyJson(input))}>ย่อ (minify)</Button>
        <Select className="w-auto" value={String(indent)} onChange={(e) => setIndent(e.target.value === 'tab' ? 'tab' : (Number(e.target.value) as 2 | 4))} aria-label="ระยะเยื้อง">
          <option value="2">เยื้อง 2 ช่อง</option>
          <option value="4">เยื้อง 4 ช่อง</option>
          <option value="tab">เยื้องด้วยแท็บ</option>
        </Select>
        <Button variant="secondary" onClick={copy} disabled={!result?.ok}>{copied ? 'คัดลอกแล้ว ✓' : 'คัดลอกผลลัพธ์'}</Button>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Textarea rows={16} value={input} onChange={(e) => setInput(e.target.value)} aria-label="JSON ต้นฉบับ" spellCheck={false} />
        <Textarea rows={16} readOnly value={result?.ok ? result.output : ''} aria-label="ผลลัพธ์" placeholder="ผลลัพธ์จะแสดงที่นี่" />
      </div>
      {result && !result.ok && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          ผิดพลาดที่บรรทัด {result.error.line} คอลัมน์ {result.error.column}: {result.error.message}
        </p>
      )}
      {result?.ok && <p className="text-sm text-brand-700">✓ JSON ถูกต้อง ({result.output.length.toLocaleString()} ตัวอักษร)</p>}
    </div>
  );
}
```

- [ ] **Step 7: ลงทะเบียน**

`registry.ts`: import `jsonFormatterMeta`; `tools = [thaiIncomeTaxMeta, loanInstallmentMeta, bahtTextMeta, promptpayQrMeta, jsonFormatterMeta]`
`loaders.ts`: เพิ่ม `'json-formatter': () => import('./dev/json-formatter/Tool'),`

- [ ] **Step 8: ทดสอบ + build + commit**

Run: `npm test && npx tsc --noEmit && npm run build`
Expected: PASS; sitemap มี 5 หน้า `/t/*` + 8 หน้า `/c/*` + index/tools/pricing
Run: `grep -o "<loc>[^<]*</loc>" dist/sitemap-0.xml | wc -l`
Expected: 16

```bash
git add src/tools
git commit -m "feat(tool): json-formatter — จัดรูปแบบ/ตรวจสอบ/ย่อ JSON

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

### Task 10: Wrangler config + deploy ขึ้น Cloudflare Workers + โดเมน

**Files:**
- Create: `wrangler.jsonc`
- Modify: `README.md` (สร้างใหม่: วิธี dev/test/deploy)

**Interfaces:**
- Produces: Worker ชื่อ `toolsiam` บน account ที่มีอยู่ (subdomain `appsoom.workers.dev`), URL production `https://toolsiam.com` เมื่อโดเมนพร้อม

- [ ] **Step 1: สร้าง wrangler.jsonc**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "toolsiam",
  "main": "@astrojs/cloudflare/entrypoints/server",
  "compatibility_date": "2026-09-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": "./dist",
    "binding": "ASSETS"
  },
  "observability": { "enabled": true },
  "preview_urls": false
  // routes ใส่ใน Step 5 หลังโดเมน toolsiam.com อยู่ใน Cloudflare zone แล้ว
  // Phase 2/3 จะเพิ่ม d1_databases, kv_namespaces, triggers.crons ที่นี่
}
```

- [ ] **Step 2: ทดสอบ Worker แบบ local**

Run: `npm run preview` (= astro build + wrangler dev) แล้วในอีก terminal:
```bash
curl -s http://localhost:8787/t/baht-text | grep -c "บาทถ้วน"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/sitemap-index.xml
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8787/no-such-page
```
Expected: `≥1`, `200`, `404`
ถ้า wrangler ฟ้องเรื่อง `main` entrypoint ไม่พบ: ตรวจว่า `@astrojs/cloudflare` ≥ 14 และ `astro build` สร้าง `dist/_worker.js/` — ถ้ามี ให้เปลี่ยน `main` เป็น `"./dist/_worker.js/index.js"` ตามที่ build log บอก แล้วรันใหม่

- [ ] **Step 3: Login และ deploy ครั้งแรก (ผู้ใช้ต้องทำ login เอง)**

Run: `npx wrangler whoami` — ถ้ายังไม่ login ให้ผู้ใช้รัน `npx wrangler login` ในเทอร์มินัลของตัวเอง
Run: `npm run deploy`
Expected: log แสดง `https://toolsiam.appsoom.workers.dev`
Run: `curl -s https://toolsiam.appsoom.workers.dev/t/thai-income-tax | grep -c "ภาษีเงินได้"`
Expected: ≥ 1

- [ ] **Step 4: README.md**

```markdown
# ToolSiam — ทูลสยาม

เว็บรวมเครื่องมือออนไลน์ภาษาไทย บน Cloudflare Workers (Astro + React islands)

## คำสั่ง
- `npm run dev` — dev server http://localhost:4321
- `npm test` — unit test ทุก `logic.ts`
- `npm run build` — build ลง `dist/`
- `npm run preview` — build แล้วรันด้วย wrangler (เหมือน production) ที่ :8787
- `npm run deploy` — build + deploy ขึ้น Cloudflare

## เพิ่มเครื่องมือใหม่
1. สร้าง `src/tools/<category>/<slug>/` มี `logic.ts` + `logic.test.ts` (เขียน test ก่อน), `meta.ts`, `Tool.tsx`
2. เพิ่ม meta ใน `src/tools/registry.ts` และ loader ใน `src/tools/loaders.ts`
3. `npm test` ต้องผ่าน (registry test บังคับให้ meta/loader ครบ)

Spec: `docs/superpowers/specs/2026-09-07-toolsiam-design.md`
```

- [ ] **Step 5: ผูกโดเมน toolsiam.com (ทำเมื่อโดเมนอยู่ใน Cloudflare แล้ว)**

เพิ่มใน `wrangler.jsonc` ระดับบนสุด:
```jsonc
"routes": [{ "pattern": "toolsiam.com", "custom_domain": true }, { "pattern": "www.toolsiam.com", "custom_domain": true }],
```
Run: `npm run deploy` แล้ว `curl -sI https://toolsiam.com | head -1`
Expected: `HTTP/2 200`
ถ้าโดเมนยังไม่พร้อม: ข้ามขั้นนี้ บันทึกไว้ใน README ว่ายังใช้ workers.dev

- [ ] **Step 6: Commit**

```bash
git add wrangler.jsonc README.md
git commit -m "chore: wrangler config, README and first deploy to Cloudflare Workers

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

---

## Self-review (ทำแล้ว)

- **Spec coverage เฟส 1:** skeleton Astro ✓ (Task 1), registry ✓ (2), layout + SEO content + JSON-LD ✓ (3, 5), 5 tools ตาม spec ✓ (4, 6–9), sitemap ✓ (1, ตรวจใน 9), deploy ✓ (10). Auth/billing/quota/AdSense/analytics อยู่ในแผน Phase 2–4 ไม่อยู่ในแผนนี้โดยตั้งใจ
- **Type consistency:** `ToolMeta` ฟิลด์ตรงกันทุก meta.ts; `toolLoaders` key = slug ทุกตัว; `Field/Input/Button/Stat/Select/Textarea/ResultBox` ประกาศใน Task 3 ก่อนใช้ใน Task 4+; `formatBaht` ใน Task 3 ใช้ใน 6, 7; `Indent` type ใช้ตรงกันใน logic/Tool ของ json-formatter
- **ความไม่แน่นอนที่ระบุวิธีรับมือไว้แล้ว:** entrypoint ของ wrangler (Task 10 Step 2), format payload ของ promptpay-qr (Task 8 Step 5), รูปแบบ error message ของ JSON.parse (Task 9 Step 4)
