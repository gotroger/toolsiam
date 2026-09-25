# แปลงรูปเป็นข้อความ (OCR ไทย + อังกฤษ) — ดีไซน์

วันที่: 20 กันยายน 2569

## ที่มา

[file-tools-roadmap.md](../../file-tools-roadmap.md) จัด "OCR ไทย/อังกฤษ" ไว้ระดับสูง โดยต้องทดสอบความแม่นภาษาไทย
ต้นทุน และขีดจำกัดก่อน สเปกนี้ตอบข้อนั้นด้วยทางที่ **ไม่มีต้นทุนต่อการใช้งาน**: รัน Tesseract (WASM) ในเบราว์เซอร์
ตามหลักเดียวกับหมวดวิดีโอ — ไฟล์ไม่ออกจากเครื่องผู้ใช้ ไม่มี upload API ไม่มี VPS/Queue ตามที่สเปกแรกเคยเผื่อไว้

รอบเดียวกันนี้เคยพิจารณา "ลบพื้นหลังภาพ" ด้วย แต่ **พักไว้** (20 กันยายน 2569) เพราะไลบรารีที่นิยม
(`@imgly/background-removal`) เป็น AGPL-3.0 และทางเลือกที่สัญญาอนุญาตเปิดกว่าต้องตรวจโมเดลเพิ่ม — ไม่อยู่ในสเปกนี้

## เป้าหมาย

ผู้ใช้เลือกรูป (สลิป ป้าย ภาพหน้าจอ เอกสารที่ถ่ายมา) แล้วได้ข้อความไทย/อังกฤษที่คัดลอกหรือดาวน์โหลดเป็น `.txt` ได้
โดยไม่ต้องติดตั้งแอปและไม่ต้องส่งรูปให้ใคร

## ขอบเขต

ในขอบเขต — เครื่องมือ 1 ตัว ในหมวด `images` ที่มีอยู่แล้ว

| เครื่องมือ         | slug            | ขอบเขตสั้น                                                                    |
| ------------------ | --------------- | ----------------------------------------------------------------------------- |
| แปลงรูปเป็นข้อความ | `image-to-text` | JPG/PNG/WebP สูงสุด 10 รูปต่อครั้ง ภาษาไทย+อังกฤษ ผลลัพธ์เป็นข้อความ + `.txt` |

นอกขอบเขต

- PDF สแกน (ต้องเพิ่ม `pdfjs-dist` และคุมจำนวนหน้า) — เป็นเครื่องมือตัวถัดไปหลังเห็นความแม่นภาษาไทยจริง
- ภาษาอื่นนอกจากไทย/อังกฤษ, ลายมือ, การรักษาเลย์เอาต์/ตาราง, ผลลัพธ์แบบ searchable PDF หรือ hOCR
- HEIC — เบราว์เซอร์ส่วนใหญ่ถอดรหัสไม่ได้ (iPhone แปลงเป็น JPG ให้เองตอนเลือกรูปผ่าน `<input type="file">`)
- ปรับภาพล่วงหน้าแบบให้ผู้ใช้ปรับเอง (ครอบ หมุน เพิ่มคอนทราสต์) — ชี้ไป `image-rotate` แทน
- ลบพื้นหลังภาพ, upscale, PDF → Word

## การตัดสินใจที่ยืนยันแล้ว

| ประเด็น          | ข้อสรุป                                                                                                                                                                                              |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| engine           | `tesseract.js` 7.x + `tesseract.js-core` 7.0.0 (Apache-2.0 ทั้งคู่) ใช้ core แบบ **LSTM-only** — เล็กกว่าและเป็นโหมดเดียวที่โมเดลไทยรุ่นใหม่รองรับ                                                   |
| โมเดลภาษา        | `@tesseract.js-data/tha` และ `@tesseract.js-data/eng` ชุด `4.0.0_best_int` (ไฟล์ `.traineddata.gz`) — ต้นทาง tessdata เป็น Apache-2.0                                                                |
| ขนาดโหลดครั้งแรก | core `*-lstm.wasm.js` ~3.9 MB ดิบ → **~1.46 MB gzip** (วัดจริง) + tha 0.90 MB + eng 2.95 MB ≈ **5.3 MB** ทุกไฟล์ต่ำกว่าเพดาน 25 MiB ของ Cloudflare จึงไม่ต้อง gzip เองแบบ ffmpeg                     |
| ที่เก็บไฟล์      | โฮสต์เองที่ `public/ocr/<version>/` — **ไม่เรียก jsDelivr** (ค่าตั้งต้นของ tesseract.js) เพื่อไม่ให้ IP/referrer ของผู้ใช้ไปถึงบุคคลที่สาม และไม่พึ่ง uptime ของคนอื่น                               |
| ไฟล์ใน git       | ไม่ commit — `scripts/copy-ocr.mjs` คัดลอกจาก `node_modules` ตอน `postinstall` และก่อน `build`; `public/ocr/` เข้า `.gitignore` (แบบเดียวกับ `public/ffmpeg/`)                                       |
| worker           | ใช้ `worker.min.js` ของ tesseract.js ที่คัดลอกไป `public/ocr/<version>/` แล้วชี้ด้วย `workerPath` + `workerBlobURL: false` — ไม่ให้ Vite bundle worker ของไลบรารี (บทเรียนเดียวกับ `@ffmpeg/ffmpeg`) |
| ตัวเลือก core    | ให้ tesseract.js เลือกเองระหว่าง `relaxedsimd-lstm` / `simd-lstm` / `lstm` ตามความสามารถของเครื่อง — คัดลอกทั้ง 3 ตัว (ผู้ใช้โหลดแค่ตัวเดียว)                                                        |
| cache            | `/ocr/*` immutable ผ่าน `public/_headers`; `cacheMethod: 'none'` ปิด IndexedDB cache ของ tesseract.js — ให้ HTTP cache ทำงานอย่างเดียว ไม่เก็บไฟล์ 4 MB ซ้ำสองที่ และไม่มีปัญหาโมเดลค้างเวอร์ชันเก่า |
| COOP/COEP        | ไม่ตั้ง — tesseract.js ไม่ใช้ SharedArrayBuffer                                                                                                                                                      |
| ภาษา             | ตัวเลือก 3 ค่า: **ไทย + อังกฤษ (ค่าเริ่มต้น)** / ไทย / อังกฤษ — เลือก "อังกฤษ" จะไม่โหลดโมเดลไทย และกลับกัน                                                                                          |
| ขีดจำกัดไฟล์เข้า | `.jpg .jpeg .png .webp` ไม่เกิน 10 MB/รูป ไม่เกิน 10 รูป/ครั้ง                                                                                                                                       |
| ย่อรูปก่อนอ่าน   | ถ้าด้านยาวเกิน 2,400 px ให้ย่อลงด้วย canvas ก่อนส่งเข้า engine — รูปจากกล้อง 12–48 MP ทำให้ช้าและแรมเต็มบนมือถือโดยไม่ได้แม่นขึ้น                                                                    |
| ลำดับงาน         | อ่านทีละรูปด้วย worker ตัวเดียว (ไม่ใช้ scheduler หลาย worker) — คุมแรมบนมือถือ                                                                                                                      |
| อายุ engine      | โหลดเมื่อกดเริ่มครั้งแรก อยู่ต่อจนออกจากหน้า ยกเลิก หรือผิดพลาด (`terminate`) — เปลี่ยนภาษาในหน้าเดิมใช้ `reinitialize`                                                                              |
| การยกเลิก        | ปุ่มยกเลิก = `worker.terminate()` แล้วเก็บผลของรูปที่อ่านเสร็จแล้วไว้                                                                                                                                |
| ช่องว่างภาษาไทย  | Tesseract มักแทรกช่องว่างระหว่างคำ/อักขระไทย → มีขั้น post-process ลบช่องว่างระหว่างอักขระไทยที่ติดกัน (pure function มี test) และมีสวิตช์ "จัดช่องว่างภาษาไทย" เปิดเป็นค่าเริ่มต้น ปิดได้           |

## ทางเลือกที่พิจารณา

**tesseract.js โฮสต์เอง (เลือก)** — สัญญาอนุญาตเปิดทั้งชุด ขนาดรวม ~5 MB รองรับไทยในตัว มีคนใช้กว้าง
ข้อเสียคือความแม่นภาษาไทยอยู่ระดับ "พอใช้" กับตัวพิมพ์ชัด ๆ และพลาดกับฟอนต์ประดิษฐ์/ลายมือ/ภาพเอียง — ต้องบอกผู้ใช้ตรง ๆ

**PaddleOCR / โมเดล ONNX ผ่าน `onnxruntime-web`** — แม่นกว่ากับภาพถ่ายจริง แต่ต้องประกอบ pipeline เอง (detect → crop →
recognize → decode) โมเดลไทยที่สัญญาอนุญาตชัดเจนหายาก และ runtime + โมเดลรวมใหญ่กว่า 2–3 เท่า — เก็บไว้เป็นทางอัปเกรด
ถ้าผลจาก Tesseract ไม่พอ โดย `engine.ts` ของเครื่องมือนี้ต้องมี interface ที่เปลี่ยนไส้ในได้

**OCR ฝั่งเซิร์ฟเวอร์ / API (Google Vision ฯลฯ)** — แม่นที่สุด แต่มีค่าใช้จ่ายต่อภาพ และรูปของผู้ใช้ (สลิป บัตร) ต้องออกจากเครื่อง
ขัดกับจุดขายของเว็บ — ไม่ทำ

## สถาปัตยกรรม

```
Tool.tsx (React island, โหลดผ่าน ToolIsland)
  └─ dynamic import → engine.ts
        ├─ fetch /ocr/manifest.json (no-store)
        ├─ dynamic import 'tesseract.js' → createWorker(langs, OEM.LSTM_ONLY, {
        │     workerPath: /ocr/<ver>/worker.min.js, corePath: /ocr/<ver>/core,
        │     langPath: /ocr/<ver>/lang, gzip: true, cacheMethod: 'none', workerBlobURL: false, logger })
        └─ recognize(canvas | blob) ทีละรูป → text + confidence
  └─ text.ts (pure): จัดช่องว่างไทย, รวมผลหลายรูป, ตั้งชื่อไฟล์ .txt
  └─ image.ts (pure + canvas): ตรวจชนิด/ขนาด, ย่อรูปด้านยาว ≤ 2400 px
```

`tesseract.js` ต้องถูก import แบบ dynamic จาก `engine.ts` เท่านั้น และ `engine.ts` ถูก import แบบ dynamic จาก `Tool.tsx`
เท่านั้น — chunk ที่ hydrate ตอนเปิดหน้าต้องไม่มีโค้ดของ tesseract (คุมด้วย `npm run size`)

## 1. โครงไฟล์

```
src/tools/images/image-to-text/
  meta.ts            ToolMeta (howTo, faq, related, disclaimer, assumptions)
  Tool.tsx           UI + lifecycle
  engine.ts          ห่อ tesseract.js: load / recognize / terminate + progress
  image.ts           validate + downscale
  text.ts            tidyThaiSpacing(), joinResults(), outputFileName()
  types.ts           OcrLanguage, OcrResult, EngineHooks
  *.test.ts(x)       ดูหัวข้อการทดสอบ
scripts/copy-ocr.mjs
public/ocr/            (generate, gitignore)
  manifest.json        { version, files: { core: [...], lang: { tha, eng } }, bytes }
  <version>/worker.min.js
  <version>/core/tesseract-core-{relaxedsimd-,simd-,}lstm.wasm.js
  <version>/lang/{tha,eng}.traineddata.gz
```

เครื่องมือนี้ **ไม่เข้า `FileTool.tsx`** — `FileTool` เป็น "ไฟล์เข้า → ไฟล์ออก" ผ่าน `document.worker.ts` ส่วน OCR
มี engine ของตัวเอง มีความคืบหน้าหลายขั้น และผลลัพธ์เป็นข้อความ จึงแยกเป็นโฟลเดอร์เครื่องมือเดี่ยวแบบ `qr-reader`

จุดลงทะเบียนที่ต้องแก้: `src/tools/registry.ts` (import meta + วางต่อจากเครื่องมือรูปภาพ), `src/tools/loaders.ts`,
`src/components/tool-glyphs.ts`, `src/components/tool-presentation.ts`, ปกของเครื่องมือ (`npm run covers:fallback`
ถ้าไม่มีปกเฉพาะ), และ `related` ของ `image-*` เดิมไม่ต้องแก้

## 2. Engine (`engine.ts`)

```ts
export type OcrLanguage = 'tha+eng' | 'tha' | 'eng';
export interface EngineHooks {
  onLoad(fraction: number): void; // โหลด core + โมเดล (0–1)
  onProgress(fraction: number): void; // อ่านรูปปัจจุบัน (0–1)
}
export interface OcrEngine {
  recognize(image: Blob | HTMLCanvasElement, language: OcrLanguage): Promise<{ text: string; confidence: number }>;
  terminate(): void;
}
export function createEngine(hooks: EngineHooks): OcrEngine;
```

- `manifest.json` fetch แบบ `cache: 'no-store'` (ไฟล์เล็ก ชี้เวอร์ชันปัจจุบัน) — เหตุผลเดียวกับ ffmpeg
- แปลง `logger` ของ tesseract.js (`status` + `progress`) เป็นสอง hook: สถานะที่ขึ้นต้นด้วย `loading`/`initializing` → `onLoad`,
  `recognizing text` → `onProgress`
- เปลี่ยนภาษาระหว่างใช้งาน → `worker.reinitialize(language)`; ครั้งแรก → `createWorker`
- ข้อผิดพลาดตอนโหลด → ข้อความเดียว: "โหลดตัวอ่านข้อความไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่" และล้างสถานะให้ลองใหม่ได้
- `terminate()` ทำให้ promise ที่ค้าง reject ด้วย `'cancelled'` — UI ไม่แสดงเป็น error
- interface นี้ไม่รั่วชนิดของ tesseract.js ออกไป เพื่อให้เปลี่ยนเป็น ONNX ได้ภายหลังโดยไม่แตะ `Tool.tsx`

## 3. `image.ts` และ `text.ts`

`image.ts`

- `validate(files)` — ชนิดจาก MIME + นามสกุล, ≤ 10 MB/รูป, ≤ 10 รูป; คืนข้อความ error ภาษาไทยรายไฟล์
- `prepare(file)` — `createImageBitmap(file, { imageOrientation: 'from-image' })` → ถ้าด้านยาว > 2400 px วาดลง canvas
  ย่อตามสัดส่วน; ไม่เกินก็ส่ง `Blob` เดิม (ไม่เข้ารหัสซ้ำ) · ปิด `ImageBitmap` หลังใช้

`text.ts` (pure ทั้งหมด)

- `tidyThaiSpacing(text)` — ลบช่องว่างเดี่ยวที่อยู่ระหว่างอักขระไทยสองตัว (`฀–๿`) คงช่องว่างระหว่างไทย↔ละติน/ตัวเลข
  คงบรรทัดใหม่ ยุบช่องว่างซ้อน ตัดช่องว่างท้ายบรรทัด **ข้อจำกัดที่ยอมรับ:** ช่องว่างจริงระหว่างประโยคไทยจะหายไปด้วย
  จึงเป็นสวิตช์ที่ปิดได้ และ UI เก็บข้อความดิบไว้เพื่อสลับกลับโดยไม่ต้องอ่านใหม่
- `joinResults(results)` — หลายรูป: คั่นด้วยบรรทัด `--- <ชื่อไฟล์> ---`; รูปเดียว: ไม่มีหัวคั่น
- `outputFileName(files)` — `<ชื่อรูปแรก>.txt` หรือ `ocr-<จำนวน>-รูป.txt`

## 4. `Tool.tsx` — UI และ lifecycle

ใช้ primitive ที่มีอยู่: `FileDrop`, `SelectedFiles`, `SegmentedControl` (ภาษา), `Checkbox` (จัดช่องว่างภาษาไทย),
`Button`, `Progress`, `ErrorText` — ไม่สร้าง primitive ใหม่

ลำดับหน้าจอ

1. เลือก/ลากรูป (มือถือ: `accept` เป็นรูป จึงเลือกถ่ายจากกล้องได้) → แสดงรายการไฟล์ ลบรายตัวได้
2. เลือกภาษา (ค่าเริ่มต้น ไทย + อังกฤษ) → กด "อ่านข้อความจากรูป"
3. ครั้งแรก: แถบ "กำลังโหลดตัวอ่านข้อความ (ประมาณ 5 MB ครั้งแรกเท่านั้น)" → แล้วแถบ "กำลังอ่านรูปที่ 2/5" + ปุ่มยกเลิก
4. ผลลัพธ์: `<textarea>` แก้ไขได้ (ผู้ใช้เกลาคำผิดเองก่อนคัดลอก) + ปุ่ม "คัดลอก" + "ดาวน์โหลด .txt" (UTF-8 มี BOM
   เพื่อให้ Notepad บน Windows เปิดภาษาไทยถูก) + ค่าความมั่นใจเฉลี่ยต่อรูป
5. ถ้าความมั่นใจของรูปใด < 60 → ข้อความแนะนำ: ถ่ายให้ตรง แสงพอ ตัวหนังสือไม่เล็กเกิน หรือหมุนรูปด้วย `image-rotate` ก่อน
6. รูปที่อ่านไม่ได้ (ถอดรหัสไม่ได้/ไม่มีข้อความ) ไม่ทำให้ทั้งชุดล้ม — รายงานรายรูปแล้วไปต่อ

Lifecycle: unmount → `engine.terminate()`; กันกดซ้ำด้วย lock แบบเดียวกับ `FileTool`; `aria-live="polite"` สำหรับสถานะ,
โฟกัสไปที่ผลลัพธ์เมื่อเสร็จ, ไปที่ error เมื่อพลาด

## 5. `scripts/copy-ocr.mjs` และ `package.json`

- dependencies: `tesseract.js` · devDependencies: `tesseract.js-core`, `@tesseract.js-data/tha`, `@tesseract.js-data/eng`
  (สามตัวหลังเป็นแค่แหล่งไฟล์ให้สคริปต์คัดลอก ไม่ถูก import ในโค้ด)
- `<version>` = `<tesseract.js>-<core>` เช่น `7.0.0-7.0.0` + sha256 ของไฟล์ทั้งหมดใน manifest; ข้ามถ้าตรงกับของเดิม;
  ลบเวอร์ชันเก่าทิ้งเสมอ (เก็บชุดเดียว) — โครงเดียวกับ `copy-ffmpeg.mjs`, Node ล้วน ไม่มี dependency
- `postinstall` และ `build` เรียกทั้ง `copy-ffmpeg.mjs` และ `copy-ocr.mjs`
- `public/_headers`: เพิ่ม `/ocr/*` → `Cache-Control: public, max-age=31536000, immutable`
- `.gitignore`: เพิ่ม `public/ocr/`

## 6. งบประสิทธิภาพและขนาด

- JS ของหน้า `/tools/image-to-text` ตอนเปิดหน้า (ตามวิธีนับของ `npm run size`) ต้องไม่เกิน budget หน้าเครื่องมือปัจจุบัน —
  tesseract.js ต้องไม่อยู่ใน chunk ที่โหลดตอน hydrate ถ้า `npm run size` นับ dynamic import ชั้นสองเข้าไปด้วย
  ให้ปรับวิธีนับแบบเดียวกับที่ทำกับ engine วิดีโอ ไม่ใช่ขยาย budget
- ไฟล์ใน `public/ocr/` ไม่นับใน budget JS (เป็น asset ที่โหลดเมื่อผู้ใช้สั่งงาน) แต่บันทึกขนาดจริงลง
  `docs/perf-budget.md` หลัง build
- เป้าเวลาที่จะวัดจริงแล้วบันทึก (ไม่ใช่ gate): รูปเอกสาร A4 ถ่ายจากมือถือ ย่อเหลือ 2400 px บนโน้ตบุ๊กทั่วไป < 15 วินาที/รูป

## 7. การทดสอบ

Unit (vitest)

- `text.test.ts` — `tidyThaiSpacing`: ไทยติดไทย, ไทย↔อังกฤษ, ตัวเลข, สระ/วรรณยุกต์ลอย, หลายบรรทัด, ข้อความอังกฤษล้วนไม่เปลี่ยน;
  `joinResults`, `outputFileName`
- `image.test.ts` — validate ชนิด/ขนาด/จำนวน; คำนวณขนาดย่อ (แยกส่วนคำนวณเป็น pure function)
- `engine.test.ts` — mock `tesseract.js`: แมป logger → hooks, ส่ง path จาก manifest ถูก, `reinitialize` เมื่อเปลี่ยนภาษา,
  terminate ระหว่างงาน → reject `'cancelled'`, manifest ล้ม → ข้อความ error
- `Tool.test.tsx` — mock engine: เลือกไฟล์ → อ่าน → แสดงผล, คัดลอก, สลับจัดช่องว่างโดยไม่อ่านใหม่, ยกเลิกกลางชุดเก็บผลที่เสร็จแล้ว,
  รูปเสียหนึ่งรูปไม่ล้มทั้งชุด, axe ผ่าน
- `registry.test.ts` ที่มีอยู่ต้องผ่านกับ meta ใหม่ (description ≥ 40, keywords ≥ 3, howTo ≥ 2, faq ≥ 2)

ตรวจด้วยมือบน build จริง (`npm run preview`) → บันทึกผลลง `docs/image-to-text-verification.md`

- ชุดรูปทดสอบ 6 แบบ: ภาพหน้าจอข้อความไทย, สลิปโอนเงิน, เอกสารพิมพ์ถ่ายจากมือถือ, ป้ายร้าน, อังกฤษล้วน, ไทยปนอังกฤษปนตัวเลข —
  บันทึกอัตราอักขระผิดโดยประมาณของแต่ละแบบ **ผลนี้ใช้ตัดสินว่าข้อความ "ข้อจำกัด" บนหน้าเขียนตรงความจริงหรือยัง**
- network: ไม่มี request ออกนอก `toolsiam.com` (โดยเฉพาะ jsDelivr), ครั้งที่สองโหลดจาก cache, เลือก "อังกฤษ" ไม่โหลด `tha`
- Chrome, Safari, Firefox เดสก์ท็อป + มือถือ Android จริง; iPhone จริงถ้ามีเครื่อง (ถ้าไม่มีให้ระบุว่ายังไม่ได้ทดสอบ)

## 8. สัญญาอนุญาตและข้อความบนหน้า

- เครดิตท้ายหน้าเครื่องมือ: "ใช้ Tesseract OCR และ tesseract.js (Apache License 2.0)" พร้อมลิงก์ซอร์ส
- `meta.disclaimer`: ผลลัพธ์อาจมีอักขระผิด โดยเฉพาะลายมือ ฟอนต์ประดิษฐ์ ภาพเอียง/เบลอ และตัวเลขในเอกสารการเงิน —
  ตรวจทานก่อนนำไปใช้ทุกครั้ง
- FAQ อย่างน้อย: รูปถูกส่งขึ้นเซิร์ฟเวอร์ไหม · ทำไมครั้งแรกช้า (~5 MB) · ทำไมอ่านผิด/ทำอย่างไรให้แม่นขึ้น · รองรับ PDF/ลายมือไหม
- `related`: `image-rotate`, `image-resize`, `word-count`, `images-to-pdf`

## 9. ลำดับการลงมือ (ให้ writing-plans แตกเป็น task)

1. `copy-ocr.mjs` + package.json + `_headers` + `.gitignore` → ยืนยันไฟล์ขึ้นที่ `public/ocr/<ver>/`
2. `text.ts` + test (TDD)
3. `image.ts` + test
4. `engine.ts` + test → ลองอ่านรูปจริงหนึ่งรูปใน dev เพื่อยืนยัน path/worker/gzip ก่อนทำ UI
5. `Tool.tsx` + test
6. `meta.ts` + ลงทะเบียน (registry, loaders, glyph, presentation, ปก)
7. `npm run lint && npm run typecheck && npm test && npm run build && npm run size`
8. ตรวจด้วยมือตามหัวข้อ 7 → เขียน `docs/image-to-text-verification.md` → ปรับข้อความข้อจำกัดให้ตรงผลจริง
9. อัปเดต `docs/file-tools-roadmap.md` (ย้าย OCR ภาพออกจาก "สูง" เป็นทำแล้ว; OCR PDF ยังค้าง) และ `docs/perf-budget.md`

Deploy ไม่อยู่ในแผนนี้ — รอผู้ใช้สั่งหลังดูผลตรวจข้อ 8
