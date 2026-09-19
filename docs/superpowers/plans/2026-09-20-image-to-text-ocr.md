# แปลงรูปเป็นข้อความ (OCR) — แผนลงมือ

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** เครื่องมือ `/tools/image-to-text` อ่านข้อความไทย/อังกฤษจากรูปในเบราว์เซอร์ ไม่อัปโหลดไฟล์

**Architecture:** React island (`Tool.tsx`) → dynamic import `engine.ts` → dynamic import `tesseract.js` ซึ่งสร้าง worker จากไฟล์ที่โฮสต์เองใน `public/ocr/<ver>/` (คัดลอกจาก `node_modules` ด้วย `scripts/copy-ocr.mjs`) ส่วน logic ที่ทดสอบได้ (`text.ts`, `image.ts`) เป็น pure function

**Tech Stack:** Astro 7 + React 19, tesseract.js 7 / tesseract.js-core 7 (WASM, LSTM-only), vitest + Testing Library, Cloudflare Workers static assets

**Spec:** [2026-09-20-image-to-text-ocr-design.md](../specs/2026-09-20-image-to-text-ocr-design.md) — รายละเอียดพฤติกรรมทั้งหมดอยู่ในสเปก แผนนี้กำหนดลำดับ ขอบเขตไฟล์ และ interface ระหว่าง task

## Global Constraints

- ห้ามมี request ออกนอก origin ของเว็บ — `workerPath`/`corePath`/`langPath` ต้องชี้ `/ocr/<ver>/…` เสมอ, `cacheMethod: 'none'`, `workerBlobURL: false`
- `tesseract.js` import แบบ dynamic จาก `engine.ts` เท่านั้น; `engine.ts` import แบบ dynamic จาก `Tool.tsx` เท่านั้น
- ขีดจำกัด: `.jpg .jpeg .png .webp` ≤ 10 MB/รูป ≤ 10 รูป/ครั้ง; ย่อด้านยาว > 2400 px
- ข้อความ UI ภาษาไทยทั้งหมด; ใช้ primitive จาก `@/components/ui` เท่านั้น ไม่สร้างใหม่
- `public/ocr/` ไม่ commit; ไม่เพิ่ม dependency นอกเหนือ 4 ตัวในสเปก §5
- ก่อน push: `npm run lint && npm run typecheck && npm test && npm run build && npm run size` ต้องผ่าน (push ขึ้น main = deploy)
- commit แยกตามเรื่อง ข้อความภาษาไทยตามแบบ `feat(images): …`

---

### Task 1: โฮสต์ไฟล์ engine (`copy-ocr.mjs`)

**Files:** Create `scripts/copy-ocr.mjs` · Modify `package.json` (deps + `postinstall` + `build`), `public/_headers`, `.gitignore`

**Produces:** `public/ocr/manifest.json` = `{ version: string, sha256: string, bytes: { core: number, tha: number, eng: number } }` และไฟล์ตามผังในสเปก §1

- [ ] `npm i tesseract.js@^7 && npm i -D tesseract.js-core@^7 @tesseract.js-data/tha @tesseract.js-data/eng`
- [ ] เขียนสคริปต์ตามโครง `scripts/copy-ffmpeg.mjs` (ข้ามถ้า manifest ตรง, ลบเวอร์ชันเก่า, Node ล้วน)
- [ ] รัน `node scripts/copy-ocr.mjs` สองครั้ง — ครั้งแรกคัดลอก ครั้งสองต้องขึ้น "พร้อมแล้ว"; `git status` ต้องไม่เห็น `public/ocr/`
- [ ] Commit `build(ocr): โฮสต์ tesseract core และโมเดลภาษาเอง`

### Task 2: `text.ts` (TDD)

**Files:** Create `src/tools/images/image-to-text/text.ts`, `text.test.ts`, `types.ts`

**Produces:**

```ts
// types.ts
export type OcrLanguage = 'tha+eng' | 'tha' | 'eng';
export interface OcrPageResult { name: string; text: string; confidence: number; error?: string }
// text.ts
export function tidyThaiSpacing(text: string): string;
export function joinResults(results: OcrPageResult[], tidy: boolean): string;
export function outputFileName(names: string[]): string;
```

- [ ] เขียน test ก่อน (กรณีตามสเปก §7) → เห็น fail → implement → ผ่าน → commit `feat(images): จัดช่องว่างภาษาไทยและรวมผล OCR`

### Task 3: `image.ts` (TDD ส่วน pure)

**Produces:**

```ts
export const MAX_FILES = 10; export const MAX_MB = 10; export const MAX_SIDE = 2400;
export function validateFiles(files: File[]): string; // '' = ผ่าน
export function targetSize(width: number, height: number): { width: number; height: number; scaled: boolean };
export async function prepareImage(file: File): Promise<Blob | HTMLCanvasElement>;
```

- [ ] test `validateFiles` + `targetSize` → implement → commit `feat(images): ตรวจและย่อรูปก่อนอ่านข้อความ`

### Task 4: `engine.ts` (TDD ด้วย mock `tesseract.js`)

**Consumes:** manifest จาก Task 1, `OcrLanguage` จาก Task 2

**Produces:**

```ts
export interface EngineHooks { onLoad(fraction: number): void; onProgress(fraction: number): void }
export interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement, language: OcrLanguage): Promise<{ text: string; confidence: number }>;
  terminate(): void;
}
export function createEngine(hooks: EngineHooks): OcrEngine;
```

- [ ] test ตามสเปก §7 → implement → **ลองอ่านรูปจริงหนึ่งรูปใน dev** ยืนยัน path/worker/gzip และดู network ว่าไม่มี jsDelivr → commit `feat(images): engine OCR บน tesseract.js ที่โฮสต์เอง`

### Task 5: `Tool.tsx` + `meta.ts` + ลงทะเบียน

**Files:** Create `Tool.tsx`, `Tool.test.tsx`, `meta.ts` · Modify `src/tools/registry.ts`, `src/tools/loaders.ts`, `src/components/tool-glyphs.ts`, `src/components/tool-presentation.ts`, ปก (`npm run covers:fallback` ถ้าจำเป็น)

- [ ] test ตามสเปก §7 (mock engine) → implement UI ตามสเปก §4 → meta ตามสเปก §8 → `registry.test.ts` ผ่าน → commit `feat(images): เครื่องมือแปลงรูปเป็นข้อความ`

### Task 6: ตรวจทั้งชุด + ตรวจด้วยมือ + เอกสาร

- [ ] `npm run lint && npm run typecheck && npm test && npm run build && npm run size`
- [ ] `npm run preview` → ตรวจตามสเปก §7 (ชุดรูปทดสอบ, network, cache, เลือกภาษาเดียว) → เขียน `docs/image-to-text-verification.md` → ปรับ disclaimer/FAQ ให้ตรงผลจริง
- [ ] อัปเดต `docs/file-tools-roadmap.md`, `docs/perf-budget.md` (ขนาด asset จริง) → commit `docs: ผลตรวจ OCR` → push (= deploy) → ตรวจ production
