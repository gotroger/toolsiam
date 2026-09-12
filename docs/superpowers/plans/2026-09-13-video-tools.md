# หมวดวิดีโอและเสียง — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เพิ่มหมวด "วิดีโอและเสียง" 6 เครื่องมือ (ตัดคลิป, วิดีโอเป็น MP3, วิดีโอเป็น GIF, ลดขนาดวิดีโอ, รูปปก YouTube, ล้างลิงก์แชร์) ที่ประมวลผลบนอุปกรณ์ผู้ใช้ทั้งหมด

**Architecture:** 4 เครื่องมือแรกใช้ ffmpeg core (wasm, single-thread) ที่เว็บโฮสต์เองเป็น `.wasm.gz` และคลายใน Web Worker ของเราเอง (`ffmpeg.worker.ts` — แบบเดียวกับ `document.worker.ts` ที่มีอยู่ ไม่ใช้ `@ffmpeg/ffmpeg` เพราะ worker ภายในของมันสร้างจาก `new URL(..., import.meta.url)` ใน node_modules ซึ่ง Vite ไม่รับประกันว่าจะ bundle) UI ร่วมกันคือ `VideoTool.tsx` ตัวเดียว keyed ด้วย id เหมือน `FileTool.tsx` ส่วน 2 เครื่องมือหลังเป็น pure logic + React ธรรมดาตามแบบ `text-lines`

**Tech Stack:** Astro 7, React 19, Tailwind 4, vitest 5, TypeScript 5.9 (มีอยู่แล้ว) + devDependency ใหม่ 1 ตัว `@ffmpeg/core@0.12.10` (ถูกคัดลอกไป `public/ffmpeg/` ตอน build ไม่ถูก bundle) ไม่มี runtime dependency ใหม่

**Spec:** `docs/superpowers/specs/2026-09-13-video-tools-design.md`

## Global Constraints

- Package manager: **npm** — Task 4 ติดตั้ง dependency ต้อง commit `package.json` + `package-lock.json`
- ทุก `logic.ts`/`timecode.ts`/`args.ts` เป็น pure function ไม่แตะ DOM และมี test คู่ **เขียน test ก่อนเสมอ**
- ข้อความ UI ทั้งหมดเป็น **ภาษาไทย**; slug เป็น kebab-case
- `meta` ต้องผ่าน `registry.test.ts`: `description` ≥ 40 ตัวอักษร, `keywords` ≥ 3, `howTo` ≥ 2, `faq` ≥ 2
- ห้าม `setState` ใน `useEffect` (ESLint `react-hooks/set-state-in-effect: error`)
- import ข้ามโฟลเดอร์ใช้ alias `@/`; ในโฟลเดอร์เดียวกันใช้ `./`
- ไม่มี `localStorage`/`sessionStorage`; ไม่มี API ใหม่; ไม่มี upload
- ไฟล์เข้า: ไฟล์เดียว ≤ 100 MB นามสกุล `.mp4,.mov,.m4v,.webm`; GIF ≤ 15 วินาที; เพดานงาน 15 นาที
- `public/ffmpeg/` ห้าม commit (gitignore) — generate จาก `scripts/copy-ffmpeg.mjs`
- ทุก Task จบด้วย `npm test` + `npm run typecheck` + `npm run lint` ผ่าน แล้ว commit ลงท้าย `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`
- **ห้าม deploy** — จบที่ build/QA ใน Task 7

## File Structure

```
src/components/ui/progress.tsx, progress.test.tsx          ← Task 1 (primitive ใหม่ + CSS ใน product.css)
src/tools/types.ts, categories.ts                           ← Task 2 (เพิ่ม 'video')
src/lib/category-icons.mjs                                  ← Task 2 (ไอคอน video)
src/components/tool-presentation.ts                         ← Task 2 (categoryLabels.video + summaries 6 ตัว)
src/styles/product.css                                      ← Task 1 (progress) + Task 2 ([data-category='video'])
public/covers/_category-video.svg                           ← Task 2 (npm run covers:fallback)
src/tools/video/clean-share-link/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}   ← Task 2
src/tools/video/youtube-thumbnail/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}  ← Task 3
scripts/copy-ffmpeg.mjs, .gitignore, package.json, registry.test.ts (allowlist) ← Task 4
src/tools/video/shared/{types.ts,ffmpeg.worker.ts,vendor.d.ts,engine.ts}     ← Task 4
src/tools/video/shared/{timecode.ts,timecode.test.ts,args.ts,args.test.ts}   ← Task 5
src/tools/video/{catalog.ts,shared/VideoTool.tsx,shared/VideoTool.test.tsx}  ← Task 6
src/tools/video/{video-trim,video-to-mp3,video-to-gif,video-compress}/Tool.tsx ← Task 6
src/tools/registry.ts, loaders.ts                           ← Task 2, 3, 6
docs/video-tools-verification.md, docs/perf-budget.md       ← Task 7
```

---

### Task 1: primitive `ProgressBar`

**Files:**
- Create: `src/components/ui/progress.tsx`, `src/components/ui/progress.test.tsx`
- Modify: `src/components/ui/index.ts` (export), `src/styles/product.css` (คลาส `.product-progress*` ต่อจาก `.tool-loading-bars`), `src/components/DesignSystemDemo.tsx` (ตัวอย่าง 1 ชิ้น)

**Interfaces:**
- Produces: `ProgressBar({ id, label, value, detail })` — `value: number | null` (0–100, `null` = indeterminate), `detail?: string` ข้อความใต้แถบ

- [ ] **Step 1: เขียน test**

```tsx
// src/components/ui/progress.test.tsx
// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from './progress';

describe('ProgressBar', () => {
  it('รายงานค่าเป็น progressbar พร้อมป้ายเปอร์เซ็นต์', () => {
    render(<ProgressBar id="p" label="กำลังแปลง" value={42.6} detail="เหลืออีกไม่นาน" />);
    const bar = screen.getByRole('progressbar', { name: 'กำลังแปลง' });
    expect(bar).toHaveAttribute('aria-valuenow', '43');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
    expect(screen.getByText('43%')).toBeInTheDocument();
    expect(screen.getByText('เหลืออีกไม่นาน')).toBeInTheDocument();
  });
  it('ค่า null = ไม่ทราบความคืบหน้า ไม่มี aria-valuenow และไม่มีเปอร์เซ็นต์', () => {
    render(<ProgressBar id="p" label="กำลังโหลด" value={null} />);
    const bar = screen.getByRole('progressbar', { name: 'กำลังโหลด' });
    expect(bar).not.toHaveAttribute('aria-valuenow');
    expect(bar.querySelector('.product-progress-fill')).toHaveClass('product-progress-indeterminate');
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });
  it('บีบค่าให้อยู่ใน 0–100', () => {
    render(<ProgressBar id="p" label="x" value={140} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/components/ui/progress.test.tsx` → FAIL (module not found)

- [ ] **Step 3: เขียน primitive**

```tsx
// src/components/ui/progress.tsx
import { cx, labelText } from './styles';

/**
 * แถบความคืบหน้า — ใช้กับงานที่นานเกินจะให้ผู้ใช้จ้องปุ่ม (โหลด engine, แปลงวิดีโอ)
 *
 * `value` เป็นเปอร์เซ็นต์ 0–100 หรือ `null` เมื่อยังบอกไม่ได้ (indeterminate)
 * เป็น div role=progressbar ไม่ใช่ <progress> เพราะ <progress> จัดสีข้ามเบราว์เซอร์ไม่ได้
 * แอนิเมชันของ indeterminate อยู่ใน product.css และปิดเมื่อ prefers-reduced-motion
 */
export function ProgressBar({
  id,
  label,
  value,
  detail,
}: {
  id: string;
  label: string;
  value: number | null;
  detail?: string;
}) {
  const percent = value === null ? null : Math.round(Math.min(100, Math.max(0, value)));
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <span id={`${id}-label`} className={labelText}>
          {label}
        </span>
        {percent !== null && (
          <span className="rounded-md bg-brand-50 px-2 py-0.5 text-sm font-medium tabular-nums text-brand-700">
            {percent}%
          </span>
        )}
      </div>
      <div
        role="progressbar"
        aria-labelledby={`${id}-label`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        className="product-progress"
      >
        <div
          className={cx('product-progress-fill', percent === null && 'product-progress-indeterminate')}
          style={percent === null ? undefined : { width: `${percent}%` }}
        />
      </div>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}
```

เพิ่มใน `src/components/ui/index.ts`: `export { ProgressBar } from './progress';`

เพิ่มใน `src/styles/product.css` ถัดจากบล็อก `.tool-loading-bars > span { … }`:

```css
  .product-progress {
    height: 8px;
    border-radius: 999px;
    background: var(--color-slate-200);
    overflow: hidden;
  }
  .product-progress-fill {
    height: 100%;
    border-radius: 999px;
    background: var(--color-brand-600);
    transition: width var(--motion-fast);
  }
  .product-progress-indeterminate {
    width: 40%;
  }
  @media (prefers-reduced-motion: no-preference) {
    .product-progress-indeterminate {
      animation: product-progress-slide 1.4s ease-in-out infinite;
    }
    @keyframes product-progress-slide {
      from { transform: translateX(-100%); }
      to { transform: translateX(250%); }
    }
  }
```

ใน `DesignSystemDemo.tsx` เพิ่ม `ProgressBar` เข้า import และวางใน TabPanel `normal` ท้ายสุด:

```tsx
<ProgressBar id="ds-progress" label="กำลังแปลงวิดีโอ" value={42} detail="ประมาณ 1 นาที" />
<ProgressBar id="ds-progress-wait" label="กำลังโหลดตัวประมวลผล" value={null} />
```

- [ ] **Step 4: รันให้ผ่าน** — `npx vitest run src/components/ui/progress.test.tsx` → PASS

- [ ] **Step 5: ตรวจและ commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/components/ui/progress.tsx src/components/ui/progress.test.tsx src/components/ui/index.ts src/styles/product.css src/components/DesignSystemDemo.tsx
git commit -m "feat(ui): primitive ProgressBar สำหรับงานที่ใช้เวลานาน"
```

---

### Task 2: หมวด `video` + เครื่องมือ "ล้างลิงก์แชร์"

หมวด active ต้องมีเครื่องมือ ≥ 1 (registry.test) จึงเปิดหมวดพร้อมเครื่องมือตัวแรกที่ไม่ต้องใช้ engine

**Files:**
- Modify: `src/tools/types.ts` (CategoryId), `src/tools/categories.ts`, `src/lib/category-icons.mjs`, `src/components/tool-presentation.ts`, `src/styles/product.css`, `src/tools/registry.ts`, `src/tools/loaders.ts`
- Create: `src/tools/video/clean-share-link/logic.ts`, `logic.test.ts`, `meta.ts`, `Tool.tsx`
- Generate: `public/covers/_category-video.svg`

**Interfaces:**
- Produces: `cleanLink(raw: string): CleanResult`, `cleanLinks(text: string): CleanResult[]` โดย `CleanResult = { input: string; cleaned: string; removed: string[]; ok: boolean; note?: string }`

- [ ] **Step 1: หมวดและไอคอน**

`src/tools/types.ts` — เพิ่ม `| 'video'` ท้าย union `CategoryId`

`src/tools/categories.ts` — เพิ่มหลัง `images` (ก่อนบล็อก vertical):

```ts
  {
    id: 'video',
    order: 13,
    status: 'active',
    gradient: ['#fdf4ff', '#f0abfc'],
    name: 'วิดีโอและเสียง',
    nameEn: 'Video & Audio',
    description: 'ตัดคลิป แปลงวิดีโอเป็น MP3 หรือ GIF ลดขนาดวิดีโอ ดาวน์โหลดรูปปก YouTube และล้างลิงก์แชร์',
  },
```

`src/lib/category-icons.mjs` — เพิ่มใน `CATEGORY_ICON_PATHS` หลัง `images`:

```js
  /** แผ่นฟิล์มมีปุ่มเล่น — วิดีโอและเสียง */
  video: 'M3 5h18v14H3V5Zm4 0v14m10-14v14M3 9h4m10 0h4M3 15h4m10 0h4m-6.5-4.7v3.4l2.8-1.7-2.8-1.7Z',
```

`src/components/tool-presentation.ts` — `categoryLabels` เพิ่ม `video: 'วิดีโอ',` และ `summaries` เพิ่ม 6 แถว:

```ts
  'video-trim': ['ตัดคลิปวิดีโอ', 'เลือกช่วงเวลาแล้วบันทึกเป็นไฟล์ใหม่'],
  'video-to-mp3': ['แปลงวิดีโอเป็น MP3', 'ดึงเสียงจากคลิปเป็นไฟล์ MP3'],
  'video-to-gif': ['แปลงวิดีโอเป็น GIF', 'ทำ GIF จากช่วงสั้น ๆ ของคลิป'],
  'video-compress': ['ลดขนาดไฟล์วิดีโอ', 'ย่อคลิปให้ส่งแชตหรืออัปโหลดง่ายขึ้น'],
  'youtube-thumbnail': ['รูปปก YouTube', 'ดาวน์โหลดรูปปกคลิปทุกขนาดที่มี'],
  'clean-share-link': ['ล้างลิงก์แชร์', 'ตัดพารามิเตอร์ติดตามออกจากลิงก์'],
```

`src/styles/product.css` — ในบล็อก `[data-category=…]` เปลี่ยน `[data-category='date'],\n  [data-category='dream'] {` เป็น `[data-category='date'],\n  [data-category='dream'],\n  [data-category='video'] {`

รัน `npm run covers:fallback` → ได้ `public/covers/_category-video.svg` (เปิดดูว่าไอคอนอยู่กลางภาพ)

- [ ] **Step 2: เขียน test ของ logic**

```ts
// src/tools/video/clean-share-link/logic.test.ts
import { describe, expect, it } from 'vitest';
import { cleanLink, cleanLinks, MAX_LINES } from './logic';

describe('cleanLink', () => {
  it('ตัด utm_* และ fbclid ออก คงพารามิเตอร์อื่นไว้', () => {
    const r = cleanLink('https://example.com/p?id=5&utm_source=line&utm_medium=chat&fbclid=abc#top');
    expect(r.cleaned).toBe('https://example.com/p?id=5#top');
    expect(r.removed).toEqual(['utm_source', 'utm_medium', 'fbclid']);
    expect(r.ok).toBe(true);
  });
  it('ลิงก์ที่ไม่มีอะไรให้ลบ คืนค่าเดิมทุกตัวอักษร', () => {
    const raw = 'HTTPS://Example.com/A?b=1';
    expect(cleanLink(raw)).toMatchObject({ cleaned: raw, removed: [], ok: true });
  });
  it('youtu.be กลายเป็น watch URL และเก็บ t ไว้', () => {
    expect(cleanLink('https://youtu.be/dQw4w9WgXcQ?si=xyz&t=42').cleaned).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42',
    );
  });
  it('youtube.com เก็บเฉพาะ v t list index', () => {
    const r = cleanLink('https://www.youtube.com/watch?v=abc&list=PL1&index=3&feature=share&si=q&pp=x');
    expect(r.cleaned).toBe('https://www.youtube.com/watch?v=abc&list=PL1&index=3');
    expect(r.removed).toEqual(['feature', 'si', 'pp']);
  });
  it('tiktok และ douyin แบบเต็มตัด query ทั้งหมด', () => {
    expect(cleanLink('https://www.tiktok.com/@u/video/7000?is_from_webapp=1&sender_device=pc').cleaned).toBe(
      'https://www.tiktok.com/@u/video/7000',
    );
    expect(cleanLink('https://www.douyin.com/video/7000?previous_page=app').cleaned).toBe(
      'https://www.douyin.com/video/7000',
    );
  });
  it('ลิงก์สั้น vm.tiktok.com / v.douyin.com คงเดิมพร้อมหมายเหตุ', () => {
    const r = cleanLink('https://vm.tiktok.com/ZSabc/');
    expect(r.cleaned).toBe('https://vm.tiktok.com/ZSabc/');
    expect(r.note).toMatch(/ลิงก์สั้น/);
  });
  it('ไม่ใช่ http/https → ok=false', () => {
    expect(cleanLink('สวัสดี')).toMatchObject({ ok: false, cleaned: 'สวัสดี' });
    expect(cleanLink('ftp://x.y/z')).toMatchObject({ ok: false });
  });
});

describe('cleanLinks', () => {
  it('แยกบรรทัด ข้ามบรรทัดว่าง และจำกัดจำนวน', () => {
    const many = Array.from({ length: MAX_LINES + 5 }, (_, i) => `https://a.b/${i}?utm_source=x`).join('\n');
    expect(cleanLinks(many)).toHaveLength(MAX_LINES);
    expect(cleanLinks('\n\nhttps://a.b/?gclid=1\n\n')).toHaveLength(1);
  });
});
```

- [ ] **Step 3: รันให้ fail** — `npx vitest run src/tools/video/clean-share-link` → FAIL

- [ ] **Step 4: เขียน logic**

```ts
// src/tools/video/clean-share-link/logic.ts
export const MAX_LINES = 50;

export interface CleanResult {
  input: string;
  cleaned: string;
  removed: string[];
  ok: boolean;
  note?: string;
}

const TRACKING = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'twclid', 'ttclid', 'igshid', 'igsh', 'mc_cid', 'mc_eid',
  'yclid', '_ga', '_gl', 'ref_src', 'ref_url', 'si', 'feature', 'mibextid',
]);
const isTracking = (key: string) => key.toLowerCase().startsWith('utm_') || TRACKING.has(key.toLowerCase());

const YOUTUBE_KEEP = new Set(['v', 't', 'list', 'index']);
const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com', 'v.douyin.com']);

function rebuild(url: URL) {
  const query = url.searchParams.toString();
  return `${url.origin}${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
}

export function cleanLink(raw: string): CleanResult {
  const input = raw.trim();
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return { input, cleaned: input, removed: [], ok: false };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { input, cleaned: input, removed: [], ok: false };
  const host = url.hostname.toLowerCase();
  if (SHORT_HOSTS.has(host)) {
    return { input, cleaned: input, removed: [], ok: true, note: 'ลิงก์สั้นต้องเปิดในแอปก่อนจึงเห็นลิงก์เต็ม เบราว์เซอร์แก้ให้ไม่ได้' };
  }
  const removed: string[] = [];
  let transformed = false;

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1).split('/')[0];
    const next = new URL(`https://www.youtube.com/watch?v=${id}`);
    const t = url.searchParams.get('t');
    if (t) next.searchParams.set('t', t);
    for (const key of url.searchParams.keys()) if (key !== 't') removed.push(key);
    return { input, cleaned: rebuild(next), removed: [...new Set(removed)], ok: true };
  }
  const isYoutube = host === 'www.youtube.com' || host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com';
  const stripAll =
    (host.endsWith('tiktok.com') && /\/video\/\d+/.test(url.pathname)) ||
    (host.endsWith('douyin.com') && /\/video\/\d+/.test(url.pathname));

  for (const key of [...new Set(url.searchParams.keys())]) {
    const drop = stripAll || (isYoutube ? !YOUTUBE_KEEP.has(key) : isTracking(key));
    if (drop) {
      url.searchParams.delete(key);
      removed.push(key);
      transformed = true;
    }
  }
  return { input, cleaned: transformed ? rebuild(url) : input, removed, ok: true };
}

export function cleanLinks(text: string): CleanResult[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_LINES)
    .map(cleanLink);
}
```

- [ ] **Step 5: รันให้ผ่าน** — `npx vitest run src/tools/video/clean-share-link` → PASS (ถ้าลำดับ `removed` ใน test ข้อ youtube ไม่ตรง ให้ยึดลำดับที่ปรากฏใน URL — โค้ดข้างบนวนตามลำดับ key เดิม)

- [ ] **Step 6: meta + Tool**

```ts
// src/tools/video/clean-share-link/meta.ts
import type { ToolMeta } from '@/tools/types';

export const cleanShareLinkMeta: ToolMeta = {
  slug: 'clean-share-link',
  name: 'ล้างลิงก์แชร์ ตัดพารามิเตอร์ติดตาม',
  nameEn: 'Clean Share Link',
  category: 'video',
  description:
    'ตัด utm, fbclid, si และพารามิเตอร์ติดตามอื่นออกจากลิงก์ YouTube TikTok Facebook และเว็บทั่วไป ทำได้หลายลิงก์พร้อมกัน ประมวลผลในเบราว์เซอร์',
  keywords: ['ล้างลิงก์', 'ลบ utm', 'ตัด fbclid', 'ลิงก์ youtube สั้น', 'clean url'],
  howTo: ['วางลิงก์ บรรทัดละ 1 ลิงก์ (สูงสุด 50 บรรทัด)', 'ดูลิงก์ที่ล้างแล้วและจำนวนพารามิเตอร์ที่ตัดออก', 'กดคัดลอกทั้งหมดไปแชร์ต่อ'],
  faq: [
    { q: 'ตัดพารามิเตอร์อะไรบ้าง', a: 'utm_* ทุกตัว, fbclid, gclid, msclkid, ttclid, igshid, si, feature, mibextid และตัวติดตามที่รู้จักอื่น ๆ พารามิเตอร์ที่ไม่รู้จักจะเก็บไว้เพื่อไม่ให้ลิงก์เสีย' },
    { q: 'ทำไมลิงก์ youtu.be ถูกเปลี่ยนเป็น youtube.com', a: 'ลิงก์ youtu.be มักพ่วง si= ที่ระบุตัวผู้แชร์ เครื่องมือแปลงเป็นลิงก์ watch มาตรฐานและเก็บเวลาเริ่ม (t=) ไว้ให้' },
    { q: 'ลิงก์สั้นของ TikTok หรือ Douyin ล้างได้ไหม', a: 'ไม่ได้ ลิงก์สั้นต้องให้เซิร์ฟเวอร์ของแอปแปลงเป็นลิงก์เต็มก่อน ซึ่งเบราว์เซอร์ทำจากหน้าเว็บนี้ไม่ได้ ให้เปิดลิงก์ในแอปแล้วคัดลอกลิงก์เต็มมาวาง' },
  ],
  contentUpdatedAt: '2026-09-13',
  related: ['youtube-thumbnail', 'qr-generator'],
};
```

```tsx
// src/tools/video/clean-share-link/Tool.tsx
import { useState } from 'react';
import { cleanLinks, MAX_LINES } from './logic';
import { CopyButton, Field, Stat, Textarea } from '@/components/ui';

export default function CleanShareLinkTool() {
  const [text, setText] = useState('');
  const results = cleanLinks(text);
  const removed = results.reduce((sum, r) => sum + r.removed.length, 0);
  const output = results.map((r) => r.cleaned).join('\n');
  return (
    <div className="space-y-4">
      <Field label="ลิงก์ต้นฉบับ" htmlFor="links" hint={`บรรทัดละ 1 ลิงก์ สูงสุด ${MAX_LINES} บรรทัด`}>
        <Textarea id="links" rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder="https://youtu.be/…?si=…" />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="ลิงก์" value={results.length} />
        <Stat label="พารามิเตอร์ที่ตัดออก" value={removed} />
      </div>
      {results.length > 0 && (
        <ul className="space-y-2 text-sm" aria-label="ผลลัพธ์รายลิงก์">
          {results.map((r, i) => (
            <li key={i} className="rounded-[10px] border border-slate-200 bg-surface p-3">
              <div className="break-all font-medium">{r.cleaned}</div>
              <div className="mt-1 text-xs text-slate-600">
                {!r.ok ? 'ไม่ใช่ลิงก์ http/https' : r.note ?? (r.removed.length ? `ตัดออก: ${r.removed.join(', ')}` : 'ไม่มีอะไรให้ตัด')}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Field label="ลิงก์ที่ล้างแล้ว" htmlFor="out">
        <Textarea id="out" rows={6} value={output} readOnly />
      </Field>
      <CopyButton text={output} label="คัดลอกทั้งหมด" />
    </div>
  );
}
```

`src/tools/registry.ts` — import `cleanShareLinkMeta` จาก `./video/clean-share-link/meta` และใส่ท้าย array `tools`
`src/tools/loaders.ts` — เพิ่ม `'clean-share-link': () => import('./video/clean-share-link/Tool'),`

- [ ] **Step 7: ตรวจและ commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/tools/types.ts src/tools/categories.ts src/lib/category-icons.mjs src/components/tool-presentation.ts src/styles/product.css public/covers/_category-video.svg src/tools/video/clean-share-link src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(video): หมวดวิดีโอและเสียง พร้อมเครื่องมือล้างลิงก์แชร์"
```

---

### Task 3: เครื่องมือ "ดาวน์โหลดรูปปก YouTube"

**Files:**
- Create: `src/tools/video/youtube-thumbnail/logic.ts`, `logic.test.ts`, `meta.ts`, `Tool.tsx`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Produces: `parseYoutubeId(input: string): string | null`, `THUMBNAIL_SIZES: { key; label; width; height }[]`, `thumbnailUrl(id: string, key: string): string`

- [ ] **Step 1: test**

```ts
// src/tools/video/youtube-thumbnail/logic.test.ts
import { describe, expect, it } from 'vitest';
import { parseYoutubeId, THUMBNAIL_SIZES, thumbnailUrl } from './logic';

describe('parseYoutubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10', 'dQw4w9WgXcQ'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/shorts/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/embed/dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://www.youtube.com/live/dQw4w9WgXcQ?feature=share', 'dQw4w9WgXcQ'],
    ['https://m.youtube.com/watch?v=dQw4w9WgXcQ', 'dQw4w9WgXcQ'],
    ['https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x', 'dQw4w9WgXcQ'],
    ['  dQw4w9WgXcQ  ', 'dQw4w9WgXcQ'],
  ])('%s → %s', (input, id) => expect(parseYoutubeId(input)).toBe(id));
  it.each(['https://vimeo.com/123', 'https://www.youtube.com/', 'abc', 'dQw4w9WgXc', 'https://youtube.com/watch?v=too-long-id-x'])(
    '%s → null',
    (input) => expect(parseYoutubeId(input)).toBeNull(),
  );
});

describe('thumbnailUrl', () => {
  it('มี 4 ขนาดและชี้ไป i.ytimg.com', () => {
    expect(THUMBNAIL_SIZES.map((s) => s.key)).toEqual(['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault']);
    expect(thumbnailUrl('dQw4w9WgXcQ', 'hqdefault')).toBe('https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  });
});
```

- [ ] **Step 2: รันให้ fail** — `npx vitest run src/tools/video/youtube-thumbnail`

- [ ] **Step 3: logic**

```ts
// src/tools/video/youtube-thumbnail/logic.ts
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be']);

export const THUMBNAIL_SIZES = [
  { key: 'maxresdefault', label: 'ใหญ่สุด 1280×720', width: 1280, height: 720 },
  { key: 'sddefault', label: 'มาตรฐาน 640×480', width: 640, height: 480 },
  { key: 'hqdefault', label: 'กลาง 480×360', width: 480, height: 360 },
  { key: 'mqdefault', label: 'เล็ก 320×180', width: 320, height: 180 },
] as const;

export function parseYoutubeId(input: string): string | null {
  const text = input.trim();
  if (ID.test(text)) return text;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;
  const candidate =
    url.hostname === 'youtu.be'
      ? url.pathname.slice(1).split('/')[0]
      : (url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([^/?]+)/)?.[1] ?? '');
  return ID.test(candidate) ? candidate : null;
}

export function thumbnailUrl(id: string, key: string) {
  return `https://i.ytimg.com/vi/${id}/${key}.jpg`;
}
```

- [ ] **Step 4: รันให้ผ่าน**

- [ ] **Step 5: meta + Tool**

```ts
// src/tools/video/youtube-thumbnail/meta.ts
import type { ToolMeta } from '@/tools/types';

export const youtubeThumbnailMeta: ToolMeta = {
  slug: 'youtube-thumbnail',
  name: 'ดาวน์โหลดรูปปก YouTube',
  nameEn: 'YouTube Thumbnail Downloader',
  category: 'video',
  description:
    'วางลิงก์ YouTube หรือ Shorts แล้วดูรูปปกทุกขนาดที่มี ตั้งแต่ 1280×720 ถึง 320×180 ดาวน์โหลดเป็น JPG ได้ทันทีโดยไม่แตะตัววิดีโอ',
  keywords: ['รูปปก youtube', 'thumbnail youtube', 'โหลดปก youtube', 'ภาพปกคลิป'],
  howTo: ['วางลิงก์คลิป YouTube, Shorts หรือรหัสวิดีโอ 11 ตัว', 'กดค้นหารูปปก แล้วเลือกขนาดที่ต้องการ', 'กดดาวน์โหลด ได้ไฟล์ JPG'],
  faq: [
    { q: 'ทำไมบางคลิปไม่มีขนาด 1280×720', a: 'YouTube สร้างรูปปกขนาดใหญ่สุดเฉพาะคลิปที่อัปโหลดแบบ HD คลิปเก่าหรือความละเอียดต่ำจะมีถึง 640×480 เท่านั้น เครื่องมือแสดงเฉพาะขนาดที่มีจริง' },
    { q: 'ดาวน์โหลดตัววิดีโอได้ไหม', a: 'ไม่ได้ เครื่องมือนี้แสดงเฉพาะรูปปกสาธารณะที่ YouTube เผยแพร่อยู่แล้ว ไม่ดึงหรือแปลงตัววิดีโอ' },
    { q: 'นำรูปปกไปใช้ได้แค่ไหน', a: 'รูปปกเป็นลิขสิทธิ์ของเจ้าของช่อง ใช้เพื่ออ้างอิง ทำสื่อประกอบ หรือดูตัวอย่างได้ การนำไปใช้เชิงพาณิชย์ควรขออนุญาตเจ้าของก่อน' },
  ],
  contentUpdatedAt: '2026-09-13',
  disclaimer: 'รูปปกเป็นของเจ้าของช่อง เครื่องมือแสดงรูปสาธารณะจาก YouTube เท่านั้น ไม่ดาวน์โหลดวิดีโอ',
  related: ['clean-share-link', 'image-resize', 'image-convert'],
};
```

```tsx
// src/tools/video/youtube-thumbnail/Tool.tsx
import { useState } from 'react';
import { parseYoutubeId, THUMBNAIL_SIZES, thumbnailUrl } from './logic';
import { Button, ErrorText, Field, Input } from '@/components/ui';

type SizeKey = (typeof THUMBNAIL_SIZES)[number]['key'];

export default function YoutubeThumbnailTool() {
  const [input, setInput] = useState('');
  const [id, setId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [missing, setMissing] = useState<SizeKey[]>([]);
  const [busy, setBusy] = useState<SizeKey | null>(null);

  function search() {
    const parsed = parseYoutubeId(input);
    setMissing([]);
    if (!parsed) {
      setId(null);
      setError('ไม่พบรหัสวิดีโอ กรุณาวางลิงก์ YouTube, Shorts หรือรหัส 11 ตัว');
      return;
    }
    setError('');
    setId(parsed);
  }

  async function download(key: SizeKey) {
    if (!id) return;
    const url = thumbnailUrl(id, key);
    setBusy(key);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = href;
      a.download = `${id}-${key}.jpg`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(href), 10_000);
    } catch {
      window.open(url, '_blank', 'noopener');
      setError('เบราว์เซอร์นี้บันทึกตรงไม่ได้ เปิดรูปในแท็บใหม่แล้วกดค้างหรือคลิกขวาเพื่อบันทึก');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-5">
      <Field label="ลิงก์หรือรหัสวิดีโอ YouTube" htmlFor="yt" error={error || undefined}>
        <div className="flex gap-2">
          <Input
            id="yt"
            value={input}
            placeholder="https://www.youtube.com/watch?v=…"
            aria-invalid={!!error || undefined}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
          />
          <Button onClick={search}>ค้นหารูปปก</Button>
        </div>
      </Field>
      {error && <ErrorText>{error}</ErrorText>}
      {id && (
        <ul className="grid gap-4 sm:grid-cols-2" aria-label="รูปปกที่พบ">
          {THUMBNAIL_SIZES.filter((s) => !missing.includes(s.key)).map((size) => (
            <li key={size.key} className="rounded-xl border border-slate-200 bg-surface p-3">
              <img
                src={thumbnailUrl(id, size.key)}
                alt={`รูปปกขนาด ${size.width}×${size.height}`}
                width={size.width}
                height={size.height}
                className="w-full rounded-lg bg-slate-100"
                loading="lazy"
                onError={() => setMissing((m) => [...m, size.key])}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{size.label}</span>
                <Button variant="secondary" disabled={busy !== null} onClick={() => download(size.key)}>
                  {busy === size.key ? 'กำลังโหลด…' : 'ดาวน์โหลด'}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

หมายเหตุ: `maxresdefault` ของคลิปที่ไม่มีขนาดนี้ตอบ 404 จริง (ตรวจแล้ว) จึงใช้ `onError` ซ่อนได้
ถ้า `Field` ไม่รับ `error` แบบแสดงเองซ้ำกับ `ErrorText` ให้เลือกใช้ `ErrorText` อย่างเดียว (อ่านโค้ด `form.tsx` ก่อน)

`registry.ts` เพิ่ม `youtubeThumbnailMeta` (วางก่อน `cleanShareLinkMeta`); `loaders.ts` เพิ่ม `'youtube-thumbnail': () => import('./video/youtube-thumbnail/Tool'),`

- [ ] **Step 6: ตรวจและ commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/tools/video/youtube-thumbnail src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(video): ดาวน์โหลดรูปปก YouTube"
```

---

### Task 4: ffmpeg core — สคริปต์คัดลอก, worker และ engine (พิสูจน์ในเบราว์เซอร์)

**Files:**
- Create: `scripts/copy-ffmpeg.mjs`, `src/tools/video/shared/types.ts`, `src/tools/video/shared/vendor.d.ts`, `src/tools/video/shared/ffmpeg.worker.ts`, `src/tools/video/shared/engine.ts`
- Modify: `package.json` (devDependency + scripts), `.gitignore`, `src/tools/registry.test.ts` (allowlist `public/`)

**Interfaces:**
- Produces: `createEngine(hooks: EngineHooks): Engine` โดย
  - `EngineHooks = { onLoad(loaded: number, total: number): void; onProgress(seconds: number): void }`
  - `Engine = { run(job: EngineJob): Promise<EngineOutput>; terminate(): void }`
  - `EngineJob = { input: { name: string; bytes: Uint8Array }; args: string[]; output: { name: string; mime: string } }`
  - `EngineOutput = { bytes: Uint8Array; name: string; mime: string }`

- [ ] **Step 1: ติดตั้ง core และเขียนสคริปต์**

```bash
npm install --save-dev @ffmpeg/core@0.12.10
```

```js
// scripts/copy-ffmpeg.mjs
// คัดลอก ffmpeg core จาก node_modules ไป public/ffmpeg/<version>/ แล้ว gzip ไฟล์ wasm
//
//   node scripts/copy-ffmpeg.mjs        (รันอัตโนมัติตอน postinstall และก่อน build)
//
// ทำไมต้อง gzip เอง: ffmpeg-core.wasm ดิบ 30.7 MB เกินเพดาน 25 MiB ต่อไฟล์ของ Cloudflare
// static assets ส่วน .gz เหลือ ~9.7 MB และเบราว์เซอร์คลายได้ด้วย DecompressionStream
// ไฟล์ทั้งหมดใน public/ffmpeg/ ถูก generate — ไม่ commit (ดู .gitignore)
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const SRC = join('node_modules', '@ffmpeg', 'core');
const OUT = join('public', 'ffmpeg');
const { version } = JSON.parse(readFileSync(join(SRC, 'package.json'), 'utf8'));
const dir = join(OUT, version);
const manifestPath = join(OUT, 'manifest.json');

const wasm = readFileSync(join(SRC, 'dist', 'esm', 'ffmpeg-core.wasm'));
const sha256 = createHash('sha256').update(wasm).digest('hex');

const current = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : null;
if (current?.version === version && current?.sha256 === sha256 && existsSync(join(dir, 'ffmpeg-core.wasm.gz'))) {
  console.log(`ffmpeg core ${version} พร้อมแล้ว`);
  process.exit(0);
}

if (existsSync(OUT)) for (const entry of readdirSync(OUT)) rmSync(join(OUT, entry), { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const gz = gzipSync(wasm, { level: 9 });
writeFileSync(join(dir, 'ffmpeg-core.wasm.gz'), gz);
writeFileSync(join(dir, 'ffmpeg-core.js'), readFileSync(join(SRC, 'dist', 'esm', 'ffmpeg-core.js')));
writeFileSync(manifestPath, JSON.stringify({ version, wasmBytes: wasm.length, gzipBytes: gz.length, sha256 }, null, 2) + '\n');
console.log(`ffmpeg core ${version}: wasm ${(wasm.length / 1048576).toFixed(1)} MB → gz ${(gz.length / 1048576).toFixed(1)} MB`);
```

`package.json` scripts แก้:

```json
"build": "node scripts/copy-ffmpeg.mjs && astro build",
"preview": "npm run build && wrangler dev",
"deploy": "npm run build && wrangler deploy",
"postinstall": "node scripts/copy-ffmpeg.mjs",
```

`.gitignore` เพิ่มท้ายไฟล์:

```
# ffmpeg core ถูก generate จาก node_modules ด้วย scripts/copy-ffmpeg.mjs (ไฟล์ 10 MB ไม่เก็บใน git)
public/ffmpeg/
```

`src/tools/registry.test.ts` — `ALLOWED_DIRS` เพิ่ม `'ffmpeg'` และเพิ่มข้อทดสอบใน describe เดียวกัน:

```ts
  it('ffmpeg/ มี manifest และโฟลเดอร์เวอร์ชันเดียวตรงกับ manifest', () => {
    const manifest = JSON.parse(readFileSync(join('public', 'ffmpeg', 'manifest.json'), 'utf8'));
    const dirs = readdirSync(join('public', 'ffmpeg'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(dirs).toEqual([manifest.version]);
    for (const f of ['ffmpeg-core.js', 'ffmpeg-core.wasm.gz']) {
      expect(existsSync(join('public', 'ffmpeg', manifest.version, f)), f).toBe(true);
    }
  });
```

รัน `node scripts/copy-ffmpeg.mjs` แล้ว `npx vitest run src/tools/registry.test.ts` → PASS

- [ ] **Step 2: types และ vendor declaration**

```ts
// src/tools/video/shared/types.ts
export interface EngineJob {
  input: { name: string; bytes: Uint8Array };
  args: string[];
  output: { name: string; mime: string };
}
export interface EngineOutput {
  bytes: Uint8Array;
  name: string;
  mime: string;
}
export interface EngineHooks {
  onLoad: (loaded: number, total: number) => void;
  onProgress: (seconds: number) => void;
}
export interface Engine {
  run: (job: EngineJob) => Promise<EngineOutput>;
  terminate: () => void;
}

/** main → worker */
export type WorkerCommand = { type: 'load'; base: string; gzipBytes: number } | { type: 'run'; job: EngineJob };
/** worker → main */
export type WorkerEvent =
  | { type: 'load-progress'; loaded: number; total: number }
  | { type: 'loaded' }
  | { type: 'progress'; seconds: number }
  | { type: 'done'; output: EngineOutput }
  | { type: 'error'; message: string };
```

```ts
// src/tools/video/shared/vendor.d.ts
/** พื้นผิวของ ffmpeg-core (Emscripten module) เท่าที่ worker ของเราใช้ */
interface FFmpegCoreModule {
  exec: (...args: string[]) => void;
  ret: number;
  reset: () => void;
  setTimeout: (ms: number) => void;
  setLogger: (cb: (log: { type: string; message: string }) => void) => void;
  setProgress: (cb: (p: { progress: number; time: number }) => void) => void;
  FS: {
    writeFile: (path: string, data: Uint8Array) => void;
    readFile: (path: string, opts: { encoding: 'binary' }) => Uint8Array;
    unlink: (path: string) => void;
  };
}
type CreateFFmpegCore = (opts: { mainScriptUrlOrBlob: string }) => Promise<FFmpegCoreModule>;
```

- [ ] **Step 3: worker**

```ts
// src/tools/video/shared/ffmpeg.worker.ts
/// <reference lib="webworker" />
import type { EngineJob, WorkerCommand, WorkerEvent } from './types';

let core: FFmpegCoreModule | null = null;
const logs: string[] = [];
const post = (event: WorkerEvent, transfer: Transferable[] = []) => self.postMessage(event, transfer);

async function load(base: string, gzipBytes: number) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('เบราว์เซอร์นี้ไม่รองรับเครื่องมือวิดีโอ กรุณาอัปเดตเบราว์เซอร์');
  }
  const res = await fetch(`${base}/ffmpeg-core.wasm.gz`);
  if (!res.ok || !res.body) throw new Error('โหลดตัวประมวลผลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่');
  const total = Number(res.headers.get('content-length')) || gzipBytes;
  let loaded = 0;
  const counted = res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        loaded += chunk.byteLength;
        post({ type: 'load-progress', loaded, total });
        controller.enqueue(chunk);
      },
    }),
  );
  const wasm = await new Response(counted.pipeThrough(new DecompressionStream('gzip'))).blob();
  const wasmURL = URL.createObjectURL(wasm.slice(0, wasm.size, 'application/wasm'));
  const coreURL = new URL(`${base}/ffmpeg-core.js`, self.location.href).href;
  const factory = (await import(/* @vite-ignore */ coreURL)).default as CreateFFmpegCore;
  core = await factory({ mainScriptUrlOrBlob: `${coreURL}#${btoa(JSON.stringify({ wasmURL, workerURL: '' }))}` });
  URL.revokeObjectURL(wasmURL);
  core.setLogger(({ message }) => {
    logs.push(message);
    if (logs.length > 40) logs.shift();
  });
  // time จาก core เป็นไมโครวินาทีของ out_time — ยืนยันด้วย smoke test (Step 5)
  core.setProgress(({ time }) => post({ type: 'progress', seconds: time / 1e6 }));
}

function translate(code: number) {
  const text = logs.join('\n');
  if (/Invalid data found|moov atom not found|Unable to find a suitable output/.test(text))
    return 'ไฟล์เสียหายหรือเป็นชนิดที่อ่านไม่ได้ กรุณาลองไฟล์อื่น';
  if (/Output file is empty|Output file #0 does not contain any stream/.test(text))
    return 'ช่วงเวลาที่เลือกอยู่นอกความยาวคลิป กรุณาตรวจเวลาเริ่มและจบ';
  if (/Cannot allocate memory|out of memory|Aborted/i.test(text))
    return 'หน่วยความจำไม่พอ กรุณาใช้ไฟล์ที่เล็กลงหรือเลือกช่วงที่สั้นลง';
  return `แปลงไม่สำเร็จ (รหัส ${code}) กรุณาลองไฟล์อื่นหรือลดขนาดไฟล์`;
}

function run(job: EngineJob) {
  if (!core) throw new Error('ตัวประมวลผลยังไม่พร้อม');
  logs.length = 0;
  core.FS.writeFile(job.input.name, job.input.bytes);
  try {
    core.setTimeout(-1);
    core.exec(...job.args);
    const code = core.ret;
    core.reset();
    if (code !== 0) throw new Error(translate(code));
    const bytes = core.FS.readFile(job.output.name, { encoding: 'binary' });
    if (!bytes.byteLength) throw new Error(translate(code));
    return bytes;
  } finally {
    for (const name of [job.input.name, job.output.name]) {
      try {
        core.FS.unlink(name);
      } catch {
        /* ไฟล์ออกอาจไม่ถูกสร้างเมื่อผิดพลาด */
      }
    }
  }
}

self.onmessage = async ({ data }: MessageEvent<WorkerCommand>) => {
  try {
    if (data.type === 'load') {
      await load(data.base, data.gzipBytes);
      post({ type: 'loaded' });
    } else {
      const bytes = run(data.job);
      post({ type: 'done', output: { bytes, name: data.job.output.name, mime: data.job.output.mime } }, [bytes.buffer]);
    }
  } catch (error) {
    post({ type: 'error', message: error instanceof Error ? error.message : 'ตัวประมวลผลขัดข้อง กรุณาลองใหม่' });
  }
};
```

หมายเหตุ: `bytes.buffer` จาก MEMFS อาจเป็น view บน heap ของ wasm — ถ้า transfer แล้ว core พัง ให้ใช้ `bytes.slice()` แล้ว transfer buffer ของสำเนาแทน (ตรวจใน Step 5)

- [ ] **Step 4: engine (main thread)**

```ts
// src/tools/video/shared/engine.ts
import type { Engine, EngineHooks, EngineJob, EngineOutput, WorkerCommand, WorkerEvent } from './types';

const MANIFEST_URL = '/ffmpeg/manifest.json';

/**
 * ตัวประมวลผลวิดีโอ — worker หนึ่งตัวต่อหน้า โหลด core ครั้งแรกตอน run() ครั้งแรก
 * terminate() ฆ่า worker ทิ้งทั้งหมด — งานที่ค้างอยู่จะ reject ด้วย 'cancelled'
 */
export function createEngine(hooks: EngineHooks): Engine {
  let worker: Worker | null = null;
  let loaded: Promise<void> | null = null;
  let reject: ((e: Error) => void) | null = null;

  function spawn() {
    const w = new Worker(new URL('./ffmpeg.worker.ts', import.meta.url), { type: 'module' });
    w.onerror = () => reject?.(new Error('โหลดตัวประมวลผลไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่'));
    return w;
  }

  function load(): Promise<void> {
    if (loaded) return loaded;
    loaded = (async () => {
      const manifest = await fetch(MANIFEST_URL).then((r) => {
        if (!r.ok) throw new Error('โหลดตัวประมวลผลไม่สำเร็จ กรุณาลองใหม่ภายหลัง');
        return r.json() as Promise<{ version: string; gzipBytes: number }>;
      });
      worker = spawn();
      await new Promise<void>((resolve, fail) => {
        reject = fail;
        worker!.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
          if (data.type === 'load-progress') hooks.onLoad(data.loaded, data.total);
          else if (data.type === 'loaded') resolve();
          else if (data.type === 'error') fail(new Error(data.message));
        };
        const command: WorkerCommand = { type: 'load', base: `/ffmpeg/${manifest.version}`, gzipBytes: manifest.gzipBytes };
        worker!.postMessage(command);
      });
    })();
    loaded.catch(() => {
      loaded = null;
    });
    return loaded;
  }

  return {
    async run(job: EngineJob): Promise<EngineOutput> {
      await load();
      return new Promise<EngineOutput>((resolve, fail) => {
        reject = fail;
        worker!.onmessage = ({ data }: MessageEvent<WorkerEvent>) => {
          if (data.type === 'progress') hooks.onProgress(data.seconds);
          else if (data.type === 'done') resolve(data.output);
          else if (data.type === 'error') fail(new Error(data.message));
        };
        const command: WorkerCommand = { type: 'run', job };
        worker!.postMessage(command, [job.input.bytes.buffer]);
      });
    },
    terminate() {
      worker?.terminate();
      worker = null;
      loaded = null;
      reject?.(new Error('cancelled'));
      reject = null;
    },
  };
}
```

- [ ] **Step 5: smoke test ในเบราว์เซอร์ (throwaway)**

สร้างหน้าชั่วคราว `src/pages/dev-ffmpeg.astro` (ห้าม commit) ที่ hydrate component ทดสอบ: เลือกไฟล์ mp4 → `createEngine` → run args `['-i','in.mp4','-t','3','-c','copy','out.mp4']` → แสดงขนาด output และค่า `seconds` สุดท้ายที่ได้จาก progress

เปิดด้วย preview tool (`.claude/launch.json` ชื่อ `dev` = `npm run dev` port 4321) แล้วตรวจ:
1. core โหลดได้ (network: `ffmpeg-core.wasm.gz` 9.7 MB, `ffmpeg-core.js`) ไม่มี error ใน console
2. output ไม่ว่าง และเปิดเล่นได้ (สร้าง object URL ใส่ `<video>`)
3. `seconds` สุดท้าย ≈ 3 → ยืนยันว่า `time / 1e6` ถูก; ถ้าได้ ≈ 3000 ให้เปลี่ยนเป็น `/1e3`; ถ้า ≈ 3_000_000 ให้ไม่หาร
4. ไม่มี error หลัง transfer buffer (ถ้า core พังในงานที่สอง ให้ `slice()` ก่อน transfer)
5. ถ้า Vite/Astro ไม่ bundle worker: ดู error `Failed to fetch dynamically imported module` — แก้โดยเพิ่ม `optimizeDeps.exclude` หรือใช้ `?worker` ตาม docs ของ Vite และบันทึกเหตุผลใน comment

ลบหน้าชั่วคราวเมื่อจบ

- [ ] **Step 6: อัปเดต spec และ commit**

แก้ `docs/superpowers/specs/2026-09-13-video-tools-design.md` ตารางการตัดสินใจ แถว `engine`: เปลี่ยนเป็น "ffmpeg core 0.12.10 (single-thread) ผ่าน Web Worker ของเราเอง ไม่ใช้ `@ffmpeg/ffmpeg` เพราะ worker ภายในของมันพึ่ง `new URL(..., import.meta.url)` ใน node_modules ซึ่ง Vite ไม่รับประกัน" และข้อ 7 ตัด `@ffmpeg/ffmpeg` ออกจาก dependencies

```bash
npm test && npm run typecheck && npm run lint
git add scripts/copy-ffmpeg.mjs package.json package-lock.json .gitignore src/tools/registry.test.ts src/tools/video/shared docs/superpowers/specs/2026-09-13-video-tools-design.md
git commit -m "feat(video): ffmpeg core โฮสต์เองแบบ gzip พร้อม worker และ engine"
```

---

### Task 5: `timecode.ts` และ `args.ts` (pure, TDD)

**Files:**
- Create: `src/tools/video/shared/timecode.ts`, `timecode.test.ts`, `args.ts`, `args.test.ts`

**Interfaces:**
- Produces:
  - `parseTimecode(text: string): number` (วินาที, โยน `Error` ข้อความไทยเมื่อผิดรูปแบบ), `formatTimecode(seconds: number): string`
  - `VideoToolId = 'video-trim' | 'video-to-mp3' | 'video-to-gif' | 'video-compress'`
  - `VideoOptions = { start: number; end: number; precise: boolean; bitrate: 128 | 192 | 320; gifWidth: 240 | 320 | 480; gifFps: 10 | 15; preset: 480 | 720 | 1080 }`
  - `buildJob(id: VideoToolId, fileName: string, options: VideoOptions): { args: string[]; output: string; mime: string; expectedSeconds: number | null }` (`expectedSeconds` ใช้คิดเปอร์เซ็นต์; `null` เมื่อไม่รู้ระยะทั้งคลิป — caller เติมจาก `<video>`)
  - `outputName(fileName: string, suffix: string, ext: string): string`
  - `MAX_GIF_SECONDS = 15`, `inputExt(fileName): 'mp4' | 'mov' | 'm4v' | 'webm'`

- [ ] **Step 1: test timecode**

```ts
// src/tools/video/shared/timecode.test.ts
import { describe, expect, it } from 'vitest';
import { formatTimecode, parseTimecode } from './timecode';

describe('parseTimecode', () => {
  it.each([
    ['90', 90], ['1:30', 90], ['01:30.5', 90.5], ['1:02:03', 3723], ['0:00', 0], ['12.25', 12.25], [' 2:05 ', 125],
  ])('%s → %s', (text, seconds) => expect(parseTimecode(text)).toBe(seconds));
  it.each(['', 'abc', '-5', '1:60', '1:2:3:4', '1:', ':30', '1.5:20'])('%s → error', (text) =>
    expect(() => parseTimecode(text)).toThrow(/รูปแบบเวลา/),
  );
});
describe('formatTimecode', () => {
  it.each([[0, '0:00'], [90, '1:30'], [90.5, '1:30.5'], [3723, '1:02:03'], [59.94, '0:59.9']])('%s → %s', (s, text) =>
    expect(formatTimecode(s)).toBe(text),
  );
});
```

- [ ] **Step 2: รันให้ fail**

- [ ] **Step 3: timecode**

```ts
// src/tools/video/shared/timecode.ts
const ERROR = 'รูปแบบเวลาไม่ถูกต้อง ใช้ วินาที, นาที:วินาที หรือ ชั่วโมง:นาที:วินาที เช่น 90, 1:30, 0:01:30.5';

/** '1:30.5' → 90.5 · โยน Error ข้อความไทยเมื่ออ่านไม่ออก */
export function parseTimecode(text: string): number {
  const parts = text.trim().split(':');
  if (parts.length < 1 || parts.length > 3 || parts.some((p) => p === '')) throw new Error(ERROR);
  const last = parts[parts.length - 1];
  if (!/^\d+(\.\d+)?$/.test(last) || parts.slice(0, -1).some((p) => !/^\d+$/.test(p))) throw new Error(ERROR);
  const numbers = parts.map(Number);
  if (parts.length > 1 && numbers[numbers.length - 1] >= 60) throw new Error(ERROR);
  if (parts.length === 3 && numbers[1] >= 60) throw new Error(ERROR);
  return numbers.reduce((total, n) => total * 60 + n, 0);
}

/** 90.5 → '1:30.5' · ตัดทศนิยมเหลือ 1 ตำแหน่งเมื่อไม่ลงตัว */
export function formatTimecode(seconds: number): string {
  const whole = Math.floor(seconds);
  const frac = Math.floor((seconds - whole) * 10);
  const h = Math.floor(whole / 3600), m = Math.floor((whole % 3600) / 60), s = whole % 60;
  const mmss = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  return frac > 0 ? `${mmss}.${frac}` : mmss;
}
```

- [ ] **Step 4: รันให้ผ่าน**

- [ ] **Step 5: test args**

```ts
// src/tools/video/shared/args.test.ts
import { describe, expect, it } from 'vitest';
import { buildJob, DEFAULT_OPTIONS, inputExt, MAX_GIF_SECONDS, outputName } from './args';

const opts = (over = {}) => ({ ...DEFAULT_OPTIONS, ...over });

describe('outputName', () => {
  it('ตัดนามสกุล แทนอักขระไม่ปลอดภัย และจำกัดความยาว', () => {
    expect(outputName('คลิป งาน.MP4', '-trim', 'mp4')).toBe('คลิป-งาน-trim.mp4');
    expect(outputName('a/b\\c:d.mov', '', 'mp3')).toBe('a-b-c-d.mp3');
    expect(outputName('x'.repeat(100) + '.mp4', '', 'gif')).toBe('x'.repeat(60) + '.gif');
    expect(outputName('.mp4', '-trim', 'mp4')).toBe('video-trim.mp4');
  });
});

describe('inputExt', () => {
  it('อ่านนามสกุลแบบไม่สนตัวพิมพ์', () => {
    expect(inputExt('A.MOV')).toBe('mov');
    expect(inputExt('a.webm')).toBe('webm');
  });
});

describe('buildJob', () => {
  it('trim เร็ว: stream copy, mp4 ได้ faststart, webm ไม่ได้', () => {
    const mp4 = buildJob('video-trim', 'a.mov', opts({ start: 5, end: 12.5 }));
    expect(mp4.args).toEqual(['-ss', '5', '-i', 'in.mov', '-t', '7.5', '-c', 'copy', '-avoid_negative_ts', 'make_zero', '-movflags', '+faststart', 'out.mp4']);
    expect(mp4).toMatchObject({ output: 'a-trim.mp4', mime: 'video/mp4', expectedSeconds: 7.5 });
    const webm = buildJob('video-trim', 'a.webm', opts({ start: 0, end: 3 }));
    expect(webm.args).toEqual(['-ss', '0', '-i', 'in.webm', '-t', '3', '-c', 'copy', '-avoid_negative_ts', 'make_zero', 'out.webm']);
    expect(webm.mime).toBe('video/webm');
  });
  it('trim แม่นยำ: เข้ารหัสใหม่เป็น H.264/AAC เสมอ', () => {
    const job = buildJob('video-trim', 'a.webm', opts({ start: 1, end: 2, precise: true }));
    expect(job.args).toEqual(['-ss', '1', '-i', 'in.webm', '-t', '1', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'out.mp4']);
    expect(job.output).toBe('a-trim.mp4');
  });
  it('mp3 ตามบิตเรต และไม่รู้ระยะทั้งคลิป', () => {
    const job = buildJob('video-to-mp3', 'song.mp4', opts({ bitrate: 320 }));
    expect(job.args).toEqual(['-i', 'in.mp4', '-vn', '-c:a', 'libmp3lame', '-b:a', '320k', 'out.mp3']);
    expect(job).toMatchObject({ output: 'song.mp3', mime: 'audio/mpeg', expectedSeconds: null });
  });
  it('gif ใช้ palette สองขั้นใน filter เดียว', () => {
    const job = buildJob('video-to-gif', 'a.mp4', opts({ start: 2, end: 7, gifWidth: 480, gifFps: 15 }));
    expect(job.args).toEqual([
      '-ss', '2', '-t', '5', '-i', 'in.mp4', '-filter_complex',
      '[0:v]fps=15,scale=480:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
      '-loop', '0', 'out.gif',
    ]);
    expect(job).toMatchObject({ output: 'a.gif', mime: 'image/gif', expectedSeconds: 5 });
  });
  it('gif เกิน 15 วินาทีโยน error', () => {
    expect(() => buildJob('video-to-gif', 'a.mp4', opts({ start: 0, end: MAX_GIF_SECONDS + 1 }))).toThrow(/15 วินาที/);
  });
  it('compress จำกัดด้านยาวตาม preset โดยไม่ขยาย', () => {
    const job = buildJob('video-compress', 'a.mov', opts({ preset: 720 }));
    expect(job.args).toEqual([
      '-i', 'in.mov', '-vf',
      "scale='if(gt(iw,ih),min(1280,iw),-2)':'if(gt(iw,ih),-2,min(1280,ih))'",
      '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', 'out.mp4',
    ]);
    expect(job).toMatchObject({ output: 'a-compressed.mp4', expectedSeconds: null });
    expect(buildJob('video-compress', 'a.mp4', opts({ preset: 480 })).args[3]).toContain('854');
    expect(buildJob('video-compress', 'a.mp4', opts({ preset: 1080 })).args[3]).toContain('1920');
  });
  it('เวลาเริ่มต้องน้อยกว่าเวลาจบ', () => {
    expect(() => buildJob('video-trim', 'a.mp4', opts({ start: 5, end: 5 }))).toThrow(/เวลาเริ่ม/);
  });
});
```

- [ ] **Step 6: รันให้ fail แล้วเขียน args**

```ts
// src/tools/video/shared/args.ts
export type VideoToolId = 'video-trim' | 'video-to-mp3' | 'video-to-gif' | 'video-compress';
export type InputExt = 'mp4' | 'mov' | 'm4v' | 'webm';

export interface VideoOptions {
  start: number;
  end: number;
  precise: boolean;
  bitrate: 128 | 192 | 320;
  gifWidth: 240 | 320 | 480;
  gifFps: 10 | 15;
  preset: 480 | 720 | 1080;
}
export const DEFAULT_OPTIONS: VideoOptions = { start: 0, end: 0, precise: false, bitrate: 192, gifWidth: 320, gifFps: 10, preset: 720 };
export const MAX_GIF_SECONDS = 15;
export const MAX_INPUT_MB = 100;
export const ACCEPT = '.mp4,.mov,.m4v,.webm';

export interface VideoJobSpec {
  args: string[];
  output: string;
  mime: string;
  /** ระยะเวลาผลลัพธ์ที่คาด (วินาที) สำหรับคิดเปอร์เซ็นต์ · null = ทั้งคลิป (caller เติมจาก <video>) */
  expectedSeconds: number | null;
}

const LONG_SIDE: Record<VideoOptions['preset'], number> = { 480: 854, 720: 1280, 1080: 1920 };
const fmt = (n: number) => String(Math.round(n * 1000) / 1000);

export function inputExt(fileName: string): InputExt {
  const ext = fileName.toLowerCase().split('.').pop();
  return ext === 'mov' || ext === 'm4v' || ext === 'webm' ? ext : 'mp4';
}

export function outputName(fileName: string, suffix: string, ext: string): string {
  const base = fileName.replace(/\.[^.]*$/, '').replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
  return `${base || 'video'}${suffix}.${ext}`;
}

function range(options: VideoOptions) {
  if (options.start < 0 || options.end <= options.start) throw new Error('เวลาเริ่มต้องน้อยกว่าเวลาจบ');
  return options.end - options.start;
}

export function buildJob(id: VideoToolId, fileName: string, options: VideoOptions): VideoJobSpec {
  const ext = inputExt(fileName);
  const input = `in.${ext}`;
  switch (id) {
    case 'video-trim': {
      const duration = range(options);
      if (options.precise) {
        return {
          args: ['-ss', fmt(options.start), '-i', input, '-t', fmt(duration), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', 'out.mp4'],
          output: outputName(fileName, '-trim', 'mp4'), mime: 'video/mp4', expectedSeconds: duration,
        };
      }
      const webm = ext === 'webm';
      return {
        args: ['-ss', fmt(options.start), '-i', input, '-t', fmt(duration), '-c', 'copy', '-avoid_negative_ts', 'make_zero', ...(webm ? [] : ['-movflags', '+faststart']), webm ? 'out.webm' : 'out.mp4'],
        output: outputName(fileName, '-trim', webm ? 'webm' : 'mp4'), mime: webm ? 'video/webm' : 'video/mp4', expectedSeconds: duration,
      };
    }
    case 'video-to-mp3':
      return { args: ['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', `${options.bitrate}k`, 'out.mp3'], output: outputName(fileName, '', 'mp3'), mime: 'audio/mpeg', expectedSeconds: null };
    case 'video-to-gif': {
      const duration = range(options);
      if (duration > MAX_GIF_SECONDS) throw new Error(`GIF ทำได้ไม่เกิน ${MAX_GIF_SECONDS} วินาที กรุณาเลือกช่วงที่สั้นลง`);
      const filter = `[0:v]fps=${options.gifFps},scale=${options.gifWidth}:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`;
      return { args: ['-ss', fmt(options.start), '-t', fmt(duration), '-i', input, '-filter_complex', filter, '-loop', '0', 'out.gif'], output: outputName(fileName, '', 'gif'), mime: 'image/gif', expectedSeconds: duration };
    }
    case 'video-compress': {
      const side = LONG_SIDE[options.preset];
      return {
        args: ['-i', input, '-vf', `scale='if(gt(iw,ih),min(${side},iw),-2)':'if(gt(iw,ih),-2,min(${side},ih))'`, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', 'out.mp4'],
        output: outputName(fileName, '-compressed', 'mp4'), mime: 'video/mp4', expectedSeconds: null,
      };
    }
  }
}
```

- [ ] **Step 7: รันให้ผ่าน ตรวจ commit**

```bash
npx vitest run src/tools/video/shared && npm run typecheck && npm run lint
git add src/tools/video/shared/timecode.ts src/tools/video/shared/timecode.test.ts src/tools/video/shared/args.ts src/tools/video/shared/args.test.ts
git commit -m "feat(video): ตัวแปลงเวลาและตัวประกอบคำสั่ง ffmpeg แบบ pure"
```

---

### Task 6: `catalog.ts`, `VideoTool.tsx` และ 4 เครื่องมือ

**Files:**
- Create: `src/tools/video/catalog.ts`, `src/tools/video/shared/VideoTool.tsx`, `src/tools/video/shared/VideoTool.test.tsx`, `src/tools/video/{video-trim,video-to-mp3,video-to-gif,video-compress}/Tool.tsx`
- Modify: `src/tools/registry.ts`, `src/tools/loaders.ts`

**Interfaces:**
- Consumes: `createEngine` (Task 4), `buildJob`, `parseTimecode`, `formatTimecode`, `ACCEPT`, `MAX_INPUT_MB`, `DEFAULT_OPTIONS`, `VideoToolId` (Task 5), `ProgressBar` (Task 1)
- Produces: `videoTools` config, `videoToolMetas: ToolMeta[]`

- [ ] **Step 1: catalog**

```ts
// src/tools/video/catalog.ts
import type { ToolMeta } from '../types';
import type { VideoToolId } from './shared/args';

export const FFMPEG_CREDIT = 'ประมวลผลด้วย FFmpeg ผ่าน ffmpeg.wasm (GPL) ในเบราว์เซอร์ของคุณ';
export const FFMPEG_SOURCE = 'https://github.com/ffmpegwasm/ffmpeg.wasm';

export const videoTools: Record<VideoToolId, { name: string; nameEn: string; action: string; description: string; detail: string; keywords: string[]; slow: boolean }> = {
  'video-trim': {
    name: 'ตัดคลิปวิดีโอ',
    nameEn: 'Trim Video',
    action: 'ตัดคลิป',
    description: 'ตัดช่วงวิดีโอตามเวลาเริ่มและจบ โหมดเร็วไม่เข้ารหัสใหม่ หรือโหมดแม่นยำถึงวินาที ประมวลผลบนอุปกรณ์ ไม่อัปโหลดไฟล์',
    detail: 'โหมดเร็วตัดที่คีย์เฟรมก่อนจุดเริ่ม อาจได้ต้นคลิปเกินมาถึง 2 วินาที โหมดแม่นยำเข้ารหัสใหม่เป็น MP4 ใช้เวลาใกล้เคียงความยาวช่วงที่เลือก',
    keywords: ['ตัดคลิป', 'ตัดวิดีโอ', 'trim video', 'ตัดต่อวิดีโอออนไลน์'],
    slow: false,
  },
  'video-to-mp3': {
    name: 'แปลงวิดีโอเป็น MP3',
    nameEn: 'Video to MP3',
    action: 'แปลงเป็น MP3',
    description: 'ดึงเสียงจากไฟล์วิดีโอ MP4 MOV WebM เป็น MP3 เลือกบิตเรต 128 192 หรือ 320 kbps ทำในเบราว์เซอร์โดยไม่อัปโหลดไฟล์',
    detail: 'รับไฟล์วิดีโอไม่เกิน 100 MB เข้ารหัสเสียงใหม่ทั้งคลิปด้วย libmp3lame คลิปยาว 10 นาทีใช้เวลาราวหนึ่งนาทีบนคอมพิวเตอร์ทั่วไป',
    keywords: ['แปลงวิดีโอเป็น mp3', 'ดึงเสียงจากวิดีโอ', 'mp4 to mp3', 'แยกเสียง'],
    slow: false,
  },
  'video-to-gif': {
    name: 'แปลงวิดีโอเป็น GIF',
    nameEn: 'Video to GIF',
    action: 'สร้าง GIF',
    description: 'ทำ GIF จากช่วงสั้น ๆ ของวิดีโอไม่เกิน 15 วินาที เลือกความกว้างและเฟรมเรต ใช้พาเลตสีอัตโนมัติให้ภาพคม ทำในเบราว์เซอร์',
    detail: 'เลือกช่วงไม่เกิน 15 วินาที ความกว้าง 240 320 หรือ 480 พิกเซล ที่ 10 หรือ 15 เฟรมต่อวินาที ไฟล์ GIF ใหญ่ขึ้นตามความกว้าง เฟรมเรต และความยาว',
    keywords: ['วิดีโอเป็น gif', 'ทำ gif', 'mp4 to gif', 'สร้างภาพเคลื่อนไหว'],
    slow: false,
  },
  'video-compress': {
    name: 'ลดขนาดไฟล์วิดีโอ',
    nameEn: 'Compress Video',
    action: 'ลดขนาดวิดีโอ',
    description: 'ย่อไฟล์วิดีโอให้เล็กลงด้วยการเข้ารหัส H.264 ใหม่ที่ 480p 720p หรือ 1080p ส่งแชตหรืออัปโหลดง่ายขึ้น ทำในเบราว์เซอร์โดยไม่อัปโหลดไฟล์',
    detail: 'เข้ารหัสใหม่ทั้งคลิป ใช้เวลาใกล้เคียงหรือมากกว่าความยาวคลิปบนมือถือ คลิปที่เล็กกว่า preset จะไม่ถูกขยาย ผลลัพธ์เป็น MP4 พร้อมเสียง AAC 96 kbps',
    keywords: ['ลดขนาดวิดีโอ', 'บีบอัดวิดีโอ', 'compress video', 'ย่อไฟล์วิดีโอ'],
    slow: true,
  },
};

export const videoToolMetas: ToolMeta[] = (Object.keys(videoTools) as VideoToolId[]).map((slug) => {
  const tool = videoTools[slug];
  return {
    slug,
    name: tool.name,
    nameEn: tool.nameEn,
    category: 'video',
    description: tool.description,
    keywords: tool.keywords,
    contentUpdatedAt: '2026-09-13',
    howTo: ['เลือกไฟล์วิดีโอ MP4 MOV M4V หรือ WebM ไม่เกิน 100 MB', tool.detail, `กด “${tool.action}” รอแถบความคืบหน้า แล้วกดดาวน์โหลด`],
    faq: [
      { q: 'ไฟล์ถูกส่งขึ้นเซิร์ฟเวอร์หรือไม่?', a: 'ไม่ วิดีโอถูกประมวลผลในเบราว์เซอร์ของคุณด้วย FFmpeg เวอร์ชัน WebAssembly ไม่มีการอัปโหลดหรือเก็บไฟล์ ครั้งแรกจะโหลดตัวประมวลผลราว 10 MB แล้วเบราว์เซอร์จะจำไว้' },
      { q: 'เครื่องมือนี้มีข้อจำกัดอะไรบ้าง?', a: tool.detail },
      { q: 'ดาวน์โหลดวิดีโอจาก YouTube หรือ TikTok ได้ไหม?', a: 'ไม่ได้ เครื่องมือรับเฉพาะไฟล์ที่อยู่ในอุปกรณ์ของคุณ ไม่ดึงวิดีโอจากเว็บไซต์หรือแอปใด' },
    ],
    disclaimer: 'ใช้กับไฟล์ที่คุณมีสิทธิ์ใช้งาน เครื่องมือนี้ไม่ดาวน์โหลดวิดีโอจากเว็บไซต์หรือแอปใด',
    related: (['video-trim', 'video-to-mp3', 'video-to-gif', 'video-compress'] as const).filter((s) => s !== slug),
  };
});
```

- [ ] **Step 2: test VideoTool (mock engine)**

```tsx
// src/tools/video/shared/VideoTool.test.tsx
// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Engine, EngineHooks, EngineJob } from './types';

const engines: FakeEngine[] = [];
class FakeEngine implements Engine {
  hooks: EngineHooks;
  resolve!: (o: { bytes: Uint8Array; name: string; mime: string }) => void;
  reject!: (e: Error) => void;
  job: EngineJob | null = null;
  terminate = vi.fn(() => this.reject?.(new Error('cancelled')));
  constructor(hooks: EngineHooks) {
    this.hooks = hooks;
    engines.push(this);
  }
  run = (job: EngineJob) =>
    new Promise<{ bytes: Uint8Array; name: string; mime: string }>((resolve, reject) => {
      this.job = job;
      this.resolve = resolve;
      this.reject = reject;
    });
}
vi.mock('./engine', () => ({ createEngine: (hooks: EngineHooks) => new FakeEngine(hooks) }));
const latest = () => engines[engines.length - 1];

// eslint-disable-next-line import/first
import VideoTool from './VideoTool';

beforeEach(() => {
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: vi.fn() }));
  vi.stubGlobal('requestAnimationFrame', (cb: () => void) => (cb(), 1));
  Object.defineProperty(File.prototype, 'arrayBuffer', { value: () => Promise.resolve(new Uint8Array([1, 2, 3]).buffer), configurable: true });
});
afterEach(() => {
  vi.unstubAllGlobals();
  engines.length = 0;
});

const video = (name = 'clip.mp4') => new File(['xx'], name, { type: 'video/mp4' });
const upload = (f: File) => fireEvent.change(screen.getByLabelText(/เลือกไฟล์/), { target: { files: [f] } });

describe('VideoTool', () => {
  it('ปฏิเสธเมื่อไม่มีไฟล์ นามสกุลผิด และเวลาเริ่มไม่น้อยกว่าจบ', () => {
    render(<VideoTool id="video-trim" />);
    fireEvent.click(screen.getByRole('button', { name: 'ตัดคลิป' }));
    expect(screen.getByRole('alert')).toHaveTextContent('กรุณาเลือกไฟล์');
    upload(video('a.avi'));
    expect(screen.getByRole('alert')).toHaveTextContent('ชนิดไฟล์ไม่รองรับ');
    upload(video());
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '0:10' } });
    fireEvent.change(screen.getByLabelText('เวลาจบ'), { target: { value: '0:05' } });
    fireEvent.click(screen.getByRole('button', { name: 'ตัดคลิป' }));
    expect(screen.getByRole('alert')).toHaveTextContent('เวลาเริ่ม');
    expect(engines).toHaveLength(0);
  });

  it('ส่งงานให้ engine แสดง progress และผลลัพธ์', async () => {
    render(<VideoTool id="video-to-mp3" />);
    upload(video('song.mp4'));
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    expect(latest().job!.args).toContain('libmp3lame');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
    latest().resolve({ bytes: new Uint8Array([1]), name: 'song.mp3', mime: 'audio/mpeg' });
    expect(await screen.findByRole('link', { name: 'ดาวน์โหลด song.mp3' })).toHaveAttribute('href', 'blob:x');
  });

  it('ยกเลิกแล้วผลลัพธ์เก่าไม่โผล่ และลองใหม่ได้', async () => {
    render(<VideoTool id="video-to-mp3" />);
    upload(video());
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    const old = latest();
    fireEvent.click(screen.getByRole('button', { name: 'ยกเลิก' }));
    expect(old.terminate).toHaveBeenCalled();
    old.resolve({ bytes: new Uint8Array([1]), name: 'old.mp3', mime: 'audio/mpeg' });
    await waitFor(() => expect(screen.getByRole('button', { name: 'แปลงเป็น MP3' })).toBeEnabled());
    expect(screen.queryByRole('link', { name: /ดาวน์โหลด/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'แปลงเป็น MP3' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    latest().resolve({ bytes: new Uint8Array([1]), name: 'new.mp3', mime: 'audio/mpeg' });
    expect(await screen.findByRole('link', { name: 'ดาวน์โหลด new.mp3' })).toBeInTheDocument();
  });

  it('แสดง error ภาษาไทยจาก engine, เก็บไฟล์ไว้, และ terminate เมื่อ unmount', async () => {
    const { unmount } = render(<VideoTool id="video-compress" />);
    upload(video());
    fireEvent.click(screen.getByRole('button', { name: 'ลดขนาดวิดีโอ' }));
    await waitFor(() => expect(latest().job).not.toBeNull());
    latest().reject(new Error('ไฟล์เสียหาย'));
    expect(await screen.findByRole('alert')).toHaveTextContent('ไฟล์เสียหาย');
    expect(screen.getByRole('listitem')).toHaveTextContent('clip.mp4');
    fireEvent.click(screen.getByRole('button', { name: 'ลดขนาดวิดีโอ' }));
    await waitFor(() => expect(engines).toHaveLength(2));
    unmount();
    expect(latest().terminate).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('GIF เกิน 15 วินาทีถูกปฏิเสธก่อนถึง engine', () => {
    render(<VideoTool id="video-to-gif" />);
    upload(video());
    fireEvent.change(screen.getByLabelText('เวลาเริ่ม'), { target: { value: '0' } });
    fireEvent.change(screen.getByLabelText('ระยะเวลา'), { target: { value: '20' } });
    fireEvent.click(screen.getByRole('button', { name: 'สร้าง GIF' }));
    expect(screen.getByRole('alert')).toHaveTextContent('15 วินาที');
    expect(engines).toHaveLength(0);
  });
});
```

ถ้า `eslint-disable-next-line import/first` ไม่ตรงชื่อกฎที่ใช้ในโปรเจกต์ ให้ย้าย `vi.mock` ขึ้นไปเหนือ import ทั้งหมด (vitest hoist ให้เอง) แล้วลบ comment

- [ ] **Step 3: รันให้ fail** — `npx vitest run src/tools/video/shared/VideoTool.test.tsx`

- [ ] **Step 4: VideoTool**

```tsx
// src/tools/video/shared/VideoTool.tsx
import { useEffect, useRef, useState } from 'react';
import { Button, Checkbox, ErrorText, Field, FileDrop, Input, ProgressBar, SegmentedControl, SelectedFiles } from '@/components/ui';
import { fileSize } from '@/lib/format';
import { FFMPEG_CREDIT, FFMPEG_SOURCE, videoTools } from '../catalog';
import { ACCEPT, buildJob, DEFAULT_OPTIONS, MAX_INPUT_MB, MAX_GIF_SECONDS, type VideoOptions, type VideoToolId } from './args';
import { formatTimecode, parseTimecode } from './timecode';
import type { Engine, EngineOutput } from './types';

type Phase = { kind: 'idle' } | { kind: 'loading'; loaded: number; total: number } | { kind: 'working'; percent: number | null };
const HARD_LIMIT_MS = 15 * 60_000;

export default function VideoTool({ id }: { id: VideoToolId }) {
  const config = videoTools[id];
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [duration, setDuration] = useState<number | null>(null);
  const [start, setStart] = useState('0:00');
  const [end, setEnd] = useState('');
  const [gifLength, setGifLength] = useState('5');
  const [precise, setPrecise] = useState(false);
  const [bitrate, setBitrate] = useState('192');
  const [gifWidth, setGifWidth] = useState('320');
  const [gifFps, setGifFps] = useState('10');
  const [preset, setPreset] = useState('720');
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' });
  const [error, setError] = useState('');
  const [result, setResult] = useState<(EngineOutput & { url: string; size: number }) | null>(null);
  const engine = useRef<Engine | null>(null);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const objectUrl = useRef('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const errorRef = useRef<HTMLDivElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const busy = phase.kind !== 'idle';
  const needsRange = id === 'video-trim' || id === 'video-to-gif';

  useEffect(
    () => () => {
      engine.current?.terminate();
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    },
    [],
  );
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function clearResult() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = '';
    setResult(null);
    setError('');
  }
  function fail(message: string) {
    setError(message);
    requestAnimationFrame(() => errorRef.current?.focus());
  }
  function dropEngine() {
    engine.current?.terminate();
    engine.current = null;
  }
  function cancel() {
    version.current++;
    clearTimeout(timer.current);
    dropEngine();
    setPhase({ kind: 'idle' });
  }
  function selectFiles(list: FileList | null) {
    const picked = list?.[0];
    if (!picked) return;
    clearResult();
    if (!ACCEPT.split(',').some((ext) => picked.name.toLowerCase().endsWith(ext))) return fail(`${picked.name}: ชนิดไฟล์ไม่รองรับ ใช้ MP4 MOV M4V หรือ WebM`);
    if (!picked.size || picked.size > MAX_INPUT_MB * 1024 * 1024) return fail(`${picked.name}: ต้องมีข้อมูลและขนาดไม่เกิน ${MAX_INPUT_MB} MB`);
    setFile(picked);
    setDuration(null);
    setPreview(URL.createObjectURL(picked));
    if (picker.current) picker.current.value = '';
  }
  function useCurrentTime(setter: (v: string) => void) {
    const t = videoRef.current?.currentTime;
    if (typeof t === 'number' && Number.isFinite(t)) setter(formatTimecode(t));
  }

  async function run() {
    if (busy) return;
    clearResult();
    if (!file) return fail('กรุณาเลือกไฟล์ก่อน');
    let options: VideoOptions = { ...DEFAULT_OPTIONS, precise, bitrate: +bitrate as VideoOptions['bitrate'], gifWidth: +gifWidth as VideoOptions['gifWidth'], gifFps: +gifFps as VideoOptions['gifFps'], preset: +preset as VideoOptions['preset'] };
    let spec;
    try {
      if (needsRange) {
        const s = parseTimecode(start);
        const e = id === 'video-to-gif' ? s + parseTimecode(gifLength) : parseTimecode(end || (duration !== null ? formatTimecode(duration) : ''));
        if (duration !== null && e > duration + 0.5) throw new Error(`เวลาจบเกินความยาวคลิป (${formatTimecode(duration)})`);
        options = { ...options, start: s, end: e };
      }
      spec = buildJob(id, file.name, options);
    } catch (cause) {
      return fail(cause instanceof Error ? cause.message : 'ค่าที่กรอกไม่ถูกต้อง');
    }
    const expected = spec.expectedSeconds ?? duration;
    const current = ++version.current;
    setPhase({ kind: 'loading', loaded: 0, total: 0 });
    timer.current = setTimeout(() => {
      if (current === version.current) {
        cancel();
        fail('ใช้เวลานานเกิน 15 นาที กรุณาเลือกช่วงที่สั้นลงหรือไฟล์ที่เล็กลง');
      }
    }, HARD_LIMIT_MS);
    try {
      const { createEngine } = await import('./engine');
      if (!engine.current) {
        engine.current = createEngine({
          onLoad: (loaded, total) => { if (current === version.current) setPhase({ kind: 'loading', loaded, total }); },
          onProgress: (seconds) => {
            if (current !== version.current) return;
            setPhase({ kind: 'working', percent: expected ? Math.min(99, (seconds / expected) * 100) : null });
          },
        });
      }
      const bytes = new Uint8Array(await file.arrayBuffer());
      setPhase({ kind: 'working', percent: expected ? 0 : null });
      const output = await engine.current.run({ input: { name: `in.${file.name.toLowerCase().split('.').pop()}`, bytes }, args: spec.args, output: { name: spec.args[spec.args.length - 1], mime: spec.mime } });
      if (current !== version.current) return;
      const blob = new Blob([output.bytes], { type: output.mime });
      objectUrl.current = URL.createObjectURL(blob);
      setResult({ ...output, name: spec.output, url: objectUrl.current, size: blob.size });
    } catch (cause) {
      if (current !== version.current) return;
      dropEngine();
      fail(cause instanceof Error && cause.message !== 'cancelled' ? cause.message : 'แปลงไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      if (current === version.current) {
        clearTimeout(timer.current);
        setPhase({ kind: 'idle' });
      }
    }
  }

  const time = (label: string, idAttr: string, value: string, set: (v: string) => void, placeholder: string) => (
    <Field label={label} htmlFor={idAttr}>
      <div className="flex gap-2">
        <Input id={idAttr} value={value} placeholder={placeholder} inputMode="decimal" onChange={(e) => { clearResult(); set(e.target.value); }} />
        <Button type="button" variant="secondary" disabled={!preview} onClick={() => { clearResult(); useCurrentTime(set); }}>ใช้เวลาปัจจุบัน</Button>
      </div>
    </Field>
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-brand-600/20 bg-brand-50 p-4 text-sm text-brand-700">ไฟล์อยู่บนอุปกรณ์ของคุณ · ไม่อัปโหลดขึ้นเซิร์ฟเวอร์ · ครั้งแรกจะโหลดตัวประมวลผลราว 10 MB</div>
      <p className="text-sm text-slate-600">{config.detail}</p>
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <FileDrop ref={picker} id="file-input" label="เลือกไฟล์" accept={ACCEPT} disabled={busy} invalid={!!error} errorId="file-errors" hint={`MP4 MOV M4V WEBM · ไม่เกิน ${MAX_INPUT_MB} MB`} onFiles={selectFiles} />
        {file && <SelectedFiles files={[file]} onRemove={() => { clearResult(); setFile(null); setPreview(''); setDuration(null); }} />}
        {preview && (
          <video ref={videoRef} src={preview} controls preload="metadata" playsInline className="w-full rounded-xl bg-black" onLoadedMetadata={(e) => { const d = e.currentTarget.duration; setDuration(Number.isFinite(d) ? d : null); }} onError={() => setDuration(null)}>
            <track kind="captions" />
          </video>
        )}
        {preview && duration === null && <p className="text-xs text-slate-600">ดูตัวอย่างไม่ได้ในเบราว์เซอร์นี้ แต่ยังแปลงได้ (จะไม่แสดงเปอร์เซ็นต์ความคืบหน้า)</p>}
        {needsRange && time('เวลาเริ่ม', 'start', start, setStart, '0:00')}
        {id === 'video-trim' && time('เวลาจบ', 'end', end, setEnd, duration !== null ? formatTimecode(duration) : '1:30')}
        {id === 'video-trim' && <Checkbox label="ตัดแม่นยำถึงวินาที (เข้ารหัสใหม่ ช้ากว่า)" checked={precise} onChange={(e) => { clearResult(); setPrecise(e.target.checked); }} />}
        {id === 'video-to-gif' && (
          <Field label="ระยะเวลา" htmlFor="gif-length" hint={`ไม่เกิน ${MAX_GIF_SECONDS} วินาที`}>
            <Input id="gif-length" value={gifLength} inputMode="decimal" onChange={(e) => { clearResult(); setGifLength(e.target.value); }} />
          </Field>
        )}
        {id === 'video-to-gif' && <SegmentedControl name="gif-width" legend="ความกว้าง" value={gifWidth} options={[{ value: '240', label: '240 px' }, { value: '320', label: '320 px' }, { value: '480', label: '480 px' }]} onChange={(v) => { clearResult(); setGifWidth(v); }} />}
        {id === 'video-to-gif' && <SegmentedControl name="gif-fps" legend="เฟรมต่อวินาที" value={gifFps} options={[{ value: '10', label: '10 fps' }, { value: '15', label: '15 fps' }]} onChange={(v) => { clearResult(); setGifFps(v); }} />}
        {id === 'video-to-mp3' && <SegmentedControl name="bitrate" legend="บิตเรต" value={bitrate} options={[{ value: '128', label: '128 kbps' }, { value: '192', label: '192 kbps' }, { value: '320', label: '320 kbps' }]} onChange={(v) => { clearResult(); setBitrate(v); }} />}
        {id === 'video-compress' && <SegmentedControl name="preset" legend="ความละเอียดสูงสุด" value={preset} options={[{ value: '480', label: '480p' }, { value: '720', label: '720p' }, { value: '1080', label: '1080p' }]} hint="คลิปที่เล็กกว่าจะไม่ถูกขยาย" onChange={(v) => { clearResult(); setPreset(v); }} />}
        {error && <ErrorText id="file-errors"><div ref={errorRef} tabIndex={-1}>{error}</div></ErrorText>}
        <Button type="button" onClick={run}>{config.action}</Button>
      </fieldset>
      {busy && (
        <div className="space-y-3" aria-live="polite">
          {phase.kind === 'loading' ? (
            <ProgressBar id="progress" label="กำลังโหลดตัวประมวลผล" value={phase.total ? (phase.loaded / phase.total) * 100 : null} detail={phase.total ? `${fileSize(phase.loaded)} / ${fileSize(phase.total)}` : 'ครั้งแรกเท่านั้น ครั้งถัดไปเบราว์เซอร์จำไว้แล้ว'} />
          ) : (
            <ProgressBar id="progress" label="กำลังแปลง" value={phase.kind === 'working' ? phase.percent : null} detail={(config.slow || precise) ? 'บนมือถืออาจใช้เวลาใกล้เคียงความยาวคลิป' : undefined} />
          )}
          <Button type="button" variant="secondary" onClick={cancel}>ยกเลิก</Button>
        </div>
      )}
      {result && (
        <div className="space-y-3 rounded-xl border border-slate-200 bg-surface p-4" aria-live="polite">
          <div className="text-sm">
            <span className="font-medium">{result.name}</span> · {file && (id === 'video-trim' || id === 'video-compress') ? `${fileSize(file.size)} → ${fileSize(result.size)}` : fileSize(result.size)}
          </div>
          {result.mime.startsWith('video/') && <video src={result.url} controls playsInline className="w-full rounded-lg bg-black"><track kind="captions" /></video>}
          {result.mime.startsWith('audio/') && <audio src={result.url} controls className="w-full"><track kind="captions" /></audio>}
          {result.mime === 'image/gif' && <img src={result.url} alt="ตัวอย่าง GIF ที่สร้าง" className="max-w-full rounded-lg" />}
          <div className="flex flex-wrap gap-2">
            <a href={result.url} download={result.name} className="product-button-primary">ดาวน์โหลด {result.name}</a>
            <Button type="button" variant="secondary" onClick={clearResult}>ล้าง</Button>
          </div>
        </div>
      )}
      <p className="text-xs text-slate-500">{FFMPEG_CREDIT} · <a href={FFMPEG_SOURCE} rel="noopener" target="_blank" className="underline">ซอร์สโค้ด</a></p>
    </div>
  );
}
```

ก่อนใช้ ให้เปิด `FileTool.tsx` ดูว่าปุ่มดาวน์โหลดใช้คลาสอะไร (`product-button-primary` หรือ `Button` ครอบ `<a>`) แล้วใช้แบบเดียวกัน; `ErrorText` ของโปรเจกต์อาจ render `role="alert"` ให้เองพร้อม focus — ถ้าเป็นเช่นนั้นลบ `div ref` ซ้อนออกและใช้ `errorRef` ตามที่ FileTool ทำ (คัดลอกแบบแผนจาก FileTool ให้ตรง)

- [ ] **Step 5: Tool.tsx ทั้ง 4 + registry + loaders**

แต่ละไฟล์ (`video-trim`, `video-to-mp3`, `video-to-gif`, `video-compress`):

```tsx
// src/tools/video/video-trim/Tool.tsx
import VideoTool from '../shared/VideoTool';
export default function VideoTrimTool() {
  return <VideoTool id="video-trim" />;
}
```

`registry.ts`: `import { videoToolMetas } from './video/catalog';` และใส่ `...videoToolMetas,` ก่อน `youtubeThumbnailMeta`
`loaders.ts`: เพิ่ม 4 บรรทัด `'video-trim': () => import('./video/video-trim/Tool'),` ฯลฯ

- [ ] **Step 6: รันให้ผ่าน ตรวจ commit**

```bash
npm test && npm run typecheck && npm run lint
git add src/tools/video src/tools/registry.ts src/tools/loaders.ts
git commit -m "feat(video): ตัดคลิป แปลงเป็น MP3 แปลงเป็น GIF และลดขนาดวิดีโอ"
```

---

### Task 7: ตรวจทั้งระบบ, QA ในเบราว์เซอร์, เอกสาร

**Files:**
- Create: `docs/video-tools-verification.md`
- Modify: `docs/perf-budget.md` (ถ้าเกิน budget), `docs/superpowers/specs/2026-09-13-video-tools-design.md` (ถ้าตัดสินใจเปลี่ยนระหว่างทำ)

- [ ] **Step 1: gate ทั้งชุด**

```bash
npm test && npm run typecheck && npm run lint && npm run build && npm run size
```

ถ้า `size` fail ที่ `cssGzip` เพราะ `.product-progress*` ให้บันทึกในตารางประวัติของ `docs/perf-budget.md` ตามกติกา (วันที่, Phase "หมวดวิดีโอ", ค่าที่วัดได้ × 1.15) — ห้ามแก้ตัวเลขเงียบ ๆ
ถ้า JS ของหน้าเครื่องมือวิดีโอเกิน budget = engine หลุดเข้า chunk hydrate → ตรวจว่า `engine.ts` ถูก import แบบ dynamic เท่านั้น

- [ ] **Step 2: QA ใน Chromium ผ่าน preview** (`npm run preview` = wrangler dev บน dist จริง เพื่อทดสอบ header/asset เหมือน production)

เตรียมไฟล์ตัวอย่างใน scratchpad ด้วย ffmpeg ของเครื่อง (ถ้ามี) หรือใช้คลิปจริง: mp4 H.264/AAC 30 วินาที, mov, webm
1. `/tools/video-trim` เร็ว 0:05–0:12 → ไฟล์เล่นได้ ความยาว ≈ 7 วิ; แม่นยำ → ความยาวตรง 7.0
2. `/tools/video-to-mp3` 192 kbps → เล่นได้ ขนาด ≈ ความยาว × 24 KB
3. `/tools/video-to-gif` 0:00 ระยะ 5 480px 15fps → เปิดใน `<img>` เคลื่อนไหว
4. `/tools/video-compress` 720p จากคลิป 1080p → มิติด้านยาว 1280 และเล็กกว่าต้นฉบับ
5. ยกเลิกกลางคัน → ปุ่มกลับมา กดใหม่ได้ (engine โหลดจาก cache)
6. offline (DevTools) หลัง core อยู่ใน cache → ยังแปลงได้
7. `/tools/youtube-thumbnail` กับคลิปที่มี/ไม่มี maxres → การ์ดที่ 404 หาย ดาวน์โหลดได้ไฟล์ JPG
8. `/tools/clean-share-link` วาง 3 ลิงก์ → ผลถูกตามกฎ
9. 390×844 light/dark → ไม่มี horizontal overflow; axe-core บนหน้าที่มีผลลัพธ์ 0 violations
10. หน้า `/categories/video` และ `/tools` แสดงหมวดใหม่ ปกสำรอง และการ์ด 6 ใบ

- [ ] **Step 3: บันทึกผล**

เขียน `docs/video-tools-verification.md` รูปแบบเดียวกับ `docs/file-tools-verification.md`: ผลที่ผ่าน (ตัวเลขจริงจากการวัด), สิ่งที่ยังไม่ได้ทดสอบ (iPhone Safari จริง — ต้องทดสอบก่อน deploy ตามข้อ 3 ของ spec), และหลักฐาน local

- [ ] **Step 4: commit**

```bash
git add docs/video-tools-verification.md docs/perf-budget.md docs/superpowers/specs/2026-09-13-video-tools-design.md
git commit -m "docs(video): ผลตรวจหมวดวิดีโอและงบประสิทธิภาพ"
```

ไม่ deploy — รายงานผู้ใช้ว่าพร้อม deploy หลังทดสอบ iPhone
