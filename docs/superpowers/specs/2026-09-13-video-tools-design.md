# หมวดวิดีโอและเสียง — ดีไซน์

วันที่: 13 กันยายน 2569

## ที่มา และสิ่งที่ตัดสินใจไม่ทำ

โจทย์ตั้งต้นคือ "เครื่องมือดาวน์โหลดคลิป" โดยอ้างอิง Open Source สองตัว

| โปรเจกต์                                                        | เป็นอะไรจริง ๆ                                                                                                                          | ทำไมใช้ไม่ได้                                                                    |
| --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [douyin-downloader](https://github.com/jiji262/douyin-downloader) | Python เรียก API ส่วนตัวของ Douyin ต้องมีคุกกี้ล็อกอิน (msToken, ttwid ฯลฯ) และใช้ Playwright เปิด Chromium ให้คนกด CAPTCHA เมื่อโดนบล็อก | ต้องมีเซิร์ฟเวอร์ Python + เบราว์เซอร์จริง ขัดกับสถาปัตยกรรม static บน Cloudflare |
| [OmniGet](https://github.com/tonhowtf/omniget)                  | แอปเดสก์ท็อป Tauri (Rust + Svelte) ห่อไบนารี yt-dlp กับ FFmpeg ไม่มีโหมดเว็บ สัญญาอนุญาต GPL-3.0                                        | ไม่มีส่วนที่รันในเบราว์เซอร์ได้ และ GPL-3.0 จะบังคับให้ ToolSiam เปิดซอร์สทั้งเว็บ |

ข้อสรุปที่ยืนยันแล้ว (13 กันยายน 2569): **ไม่ทำตัวโหลดคลิปจากแพลตฟอร์ม** เพราะ

1. ต้องมีเซิร์ฟเวอร์แยกรัน yt-dlp/FFmpeg ให้วิดีโอทุกไฟล์วิ่งผ่านเรา ต้นทุน bandwidth/CPU ไม่ใช่ค่าคงที่
2. Douyin/YouTube เปลี่ยนลายเซ็นบ่อย IP เซิร์ฟเวอร์โดนบล็อก ต้องไล่อัปเดตไม่รู้จบ
3. ผิดข้อกำหนดการใช้งานของแพลตฟอร์ม เสี่ยงต่อ AdSense และข้อร้องเรียนลิขสิทธิ์ทั้งโดเมน toolsiam.com

สิ่งที่ทำแทนคือหมวด **"วิดีโอและเสียง"** ที่รับไฟล์ซึ่งผู้ใช้มีอยู่แล้ว ประมวลผลบนอุปกรณ์ทั้งหมดตามหลักเดียวกับ
หมวดเอกสารและรูปภาพใน [file-tools-roadmap.md](../../file-tools-roadmap.md) — ไม่มี upload API ไม่มีที่เก็บไฟล์
ไม่ดึงวิดีโอจากแพลตฟอร์มใด **ไม่มีโค้ดจากสองโปรเจกต์ข้างต้นถูกนำมาใช้**

## เป้าหมาย

ตอบคน "อยากได้ไฟล์จากคลิป" ในส่วนที่ทำได้โดยชอบ: ตัดช่วง ดึงเสียง ทำ GIF ลดขนาด และงานเล็กรอบลิงก์วิดีโอ
ที่ไม่ต้องแตะตัวคลิป (รูปปก YouTube และล้างลิงก์แชร์)

## ขอบเขต

ในขอบเขต — 6 เครื่องมือ หมวดใหม่ 1 หมวด

| เครื่องมือ                     | slug               | ใช้ engine | ขอบเขตสั้น                                                    |
| ------------------------------ | ------------------ | ---------- | ------------------------------------------------------------- |
| ตัดคลิปวิดีโอ                  | `video-trim`       | ใช่        | ระบุเวลาเริ่ม/จบ โหมดเร็ว (ตัดที่คีย์เฟรม) หรือแม่นยำ (เข้ารหัสใหม่) |
| แปลงวิดีโอเป็น MP3             | `video-to-mp3`     | ใช่        | ดึงเสียงทั้งคลิปเป็น MP3 เลือกบิตเรต 128/192/320 kbps          |
| แปลงวิดีโอเป็น GIF             | `video-to-gif`     | ใช่        | เลือกช่วงไม่เกิน 15 วินาที ความกว้าง 240/320/480 และ 10/15 fps  |
| ลดขนาดไฟล์วิดีโอ               | `video-compress`   | ใช่        | preset 480p/720p/1080p เข้ารหัส H.264 + AAC                    |
| ดาวน์โหลดรูปปก YouTube         | `youtube-thumbnail`| ไม่        | วางลิงก์ แสดงรูปปกทุกขนาดที่มี ดาวน์โหลดเป็น JPG               |
| ล้างลิงก์แชร์                  | `clean-share-link` | ไม่        | ตัดพารามิเตอร์ติดตาม (utm, fbclid, si ฯลฯ) หลายลิงก์พร้อมกัน   |

นอกขอบเขต

- ดาวน์โหลดหรือดึงข้อมูลวิดีโอจาก YouTube, TikTok, Douyin, Facebook หรือแพลตฟอร์มใด ๆ
- รูปปก TikTok/Douyin — oEmbed ของ TikTok ไม่เปิด CORS (ตรวจ 13 กันยายน 2569) และ Douyin ไม่มี endpoint สาธารณะ
- ตัดต่อหลายคลิป ใส่ซับ ใส่ลายน้ำ หมุนวิดีโอ — รอดูการใช้งานหมวดนี้ก่อน
- เข้ารหัส HEVC/H.265 หรือ AV1 ขาออก
- WebCodecs — เป็นทางเร่งความเร็วในอนาคต ไม่ใช่รอบนี้ (ดู "ทางเลือกที่พิจารณา")

## การตัดสินใจที่ยืนยันแล้ว

| ประเด็น                  | ข้อสรุป                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------- |
| engine                   | `@ffmpeg/core` 0.12.10 (single-thread, ไม่ใช้ core-mt) ผ่าน Web Worker ของเราเอง (`ffmpeg.worker.ts`) — ไม่ใช้ `@ffmpeg/ffmpeg` เพราะ worker ภายในของมันสร้างด้วย `new URL(..., import.meta.url)` ใน node_modules ซึ่ง Vite ไม่รับประกันว่าจะ bundle |
| ที่เก็บ core             | เสิร์ฟจาก `public/ffmpeg/<version>/` ของเว็บเอง ไม่ใช้ CDN ภายนอก ไม่ต้องมี R2                                  |
| ขนาดไฟล์ core            | `ffmpeg-core.wasm` ดิบ 30.7 MB เกินเพดาน 25 MiB/ไฟล์ของ Cloudflare static assets → เก็บเป็น `.wasm.gz` 9.7 MB แล้วคลายในเบราว์เซอร์ด้วย `DecompressionStream` |
| ไฟล์ core ใน git         | ไม่ commit — `scripts/copy-ffmpeg.mjs` คัดลอกจาก `node_modules` ตอน `postinstall` และก่อน `build`; `public/ffmpeg/` อยู่ใน `.gitignore` |
| COOP/COEP                | ไม่ตั้ง — single-thread ไม่ต้องใช้ SharedArrayBuffer จึงไม่กระทบสคริปต์ข้ามโดเมนที่มีอยู่ (Cloudflare beacon) |
| ขีดจำกัดไฟล์เข้า         | ไฟล์เดียว ไม่เกิน 100 MB นามสกุล `.mp4 .mov .m4v .webm`                                                        |
| เวลาประมวลผล             | ไม่มี timeout 60 วินาทีแบบเครื่องมือเอกสาร — แสดงความคืบหน้าและปุ่มยกเลิกแทน เพดานแข็ง 15 นาทีแล้วยกเลิกให้      |
| อายุ engine              | โหลดครั้งแรกเมื่อกดเริ่ม อยู่ต่อจนออกจากหน้า ยกเลิก หรือผิดพลาด (terminate) — ลองค่าใหม่ในหน้าเดิมไม่ต้องโหลดซ้ำ |
| ระยะเวลาคลิป             | อ่านจาก `<video>` metadata ของเบราว์เซอร์ ถ้าอ่านไม่ได้ให้ทำงานต่อโดยไม่มีเปอร์เซ็นต์ความคืบหน้า                 |
| สัญญาอนุญาตของ core      | GPL-2.0-or-later — เสิร์ฟไบนารีต้นฉบับโดยไม่แก้ พร้อมเครดิตและลิงก์ซอร์สบนหน้าเครื่องมือทั้ง 4 ตัว               |
| รูปปก YouTube            | ดึงจาก `i.ytimg.com` ซึ่งส่ง `access-control-allow-origin: *` (ตรวจ 13 กันยายน 2569) → fetch เป็น blob แล้วดาวน์โหลดได้ |

## ทางเลือกที่พิจารณา

**ffmpeg.wasm (เลือก)** — ครอบคลุมทุก container/codec ที่ผู้ใช้ไทยเจอจริง (mp4/mov จากมือถือ, webm) ผลลัพธ์
เป็น MP4 H.264 ที่เปิดได้ทุกที่ และ MP3 จริงจาก libmp3lame ข้อเสียคือต้องโหลด 9.7 MB ครั้งแรก
และการเข้ารหัสใหม่บนมือถือช้าใกล้เคียงหรือช้ากว่าเวลาจริงของคลิป

**WebCodecs + MediaRecorder** — เบามาก (< 100 KB) แต่ต้องเขียน demuxer/muxer เอง (mp4box + mp4-muxer)
Safari รองรับไม่ครบ (AudioEncoder) MP3 ต้องหา encoder แยกอยู่ดี และผลลัพธ์ต่างกันตามเบราว์เซอร์
เหมาะเป็นทางเร่ง `video-compress`/`video-trim` ในอนาคตเมื่อรองรับทั่วถึง ไม่ใช่ฐานของรอบนี้

**สร้าง core เอง (เฉพาะ codec ที่ใช้)** — น่าจะเหลือ 8–10 MB ดิบ แต่ต้อง build FFmpeg ด้วย Emscripten
และดูแล toolchain เอง เกินขอบเขตรอบนี้ บันทึกไว้เป็นงานถัดไปถ้าหมวดนี้มีคนใช้จริง

**เสิร์ฟ core จาก CDN ภายนอก (unpkg/jsdelivr)** — ง่ายที่สุด แต่ขัดหลักโฮสต์เอง (ฟอนต์ก็ย้ายมาโฮสต์เองแล้ว)
และเพิ่มจุดล้มเหลวนอกการควบคุม

## สถาปัตยกรรม

```
หน้า /tools/video-* (static, ToolIsland)
  │ hydrate → VideoTool.tsx  (UI + lifecycle · ไม่มี engine ใน chunk นี้)
  │ กดเริ่ม → import('./engine')
  │           ├─ fetch /ffmpeg/<ver>/ffmpeg-core.wasm.gz → DecompressionStream → Blob → blob: URL
  │           ├─ ffmpeg.worker.ts (Web Worker ของเรา) import ffmpeg-core.js + wasm จาก blob: URL
  │           │   งานทั้งหมดอยู่นอก main thread
  │           ├─ writeFile(input) → exec(args จาก args.ts) → readFile(output)
  │           └─ progress/log → VideoTool (แถบความคืบหน้า)
  ↓
Blob ผลลัพธ์ → URL.createObjectURL → ปุ่มดาวน์โหลด (เหมือน FileTool)
```

ไม่มีเส้นทาง API ใหม่ ไม่มี KV/D1 ไม่มีการเปลี่ยน `wrangler.jsonc` นอกจากไฟล์ static เพิ่ม

## 1. หมวดใหม่ `video`

`src/tools/categories.ts` เพิ่ม

```ts
{
  id: 'video',
  order: 13,
  status: 'active',
  gradient: ['#fdf4ff', '#f0abfc'],
  name: 'วิดีโอและเสียง',
  nameEn: 'Video & Audio',
  description: 'ตัดคลิป แปลงวิดีโอเป็น MP3 หรือ GIF ลดขนาดวิดีโอ ดาวน์โหลดรูปปก YouTube และล้างลิงก์แชร์',
}
```

- `CategoryId` ใน `types.ts` เพิ่ม `'video'`
- `src/lib/category-icons.mjs` เพิ่มไอคอนเส้น "แผ่นฟิล์มมีปุ่มเล่น" บน viewBox 24 ตามกติกาเดิม (เส้นล้วน currentColor)
- รัน `npm run covers:fallback` ให้ได้ `public/covers/_category-video.svg` — `registry.test.ts` บังคับว่าปกสำรองต้องตรงกับสีและไอคอนปัจจุบัน
- ปกจริง `<slug>.webp` ไม่บล็อกงาน (§15.3) ใช้ปกหมวดไปก่อน

## 2. โครงไฟล์

```
src/tools/video/
  catalog.ts                 ← config ของ 4 เครื่องมือที่ใช้ engine (แบบเดียวกับ files/catalog.ts) + videoToolMetas
  shared/
    types.ts                 ← VideoToolId, Options, Output, Progress
    timecode.ts (+ .test)    ← parseTimecode('1:23.5') → 83.5, formatTimecode(83.5) → '1:23.5'
    args.ts (+ .test)        ← buildArgs(id, options, input) → { args: string[], output: string, mime: string }
    engine.ts                ← loadCore() (gz → DecompressionStream → blob URL), runJob(), cancel — โหลดแบบ dynamic เท่านั้น
    VideoTool.tsx (+ .test)  ← UI + lifecycle
    credits.ts               ← ข้อความเครดิต FFmpeg/GPL + ลิงก์ซอร์ส ใช้ร่วมกัน 4 หน้า
  video-trim/Tool.tsx        ← export default () => <VideoTool id="video-trim" />
  video-to-mp3/Tool.tsx
  video-to-gif/Tool.tsx
  video-compress/Tool.tsx
  youtube-thumbnail/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}
  clean-share-link/{logic.ts,logic.test.ts,meta.ts,Tool.tsx}

src/components/ui/progress.tsx (+ .test)   ← primitive ใหม่ ProgressBar (<progress> จริง + ป้ายเปอร์เซ็นต์)
scripts/copy-ffmpeg.mjs                    ← คัดลอก core จาก node_modules → public/ffmpeg/<ver>/ (gzip wasm)
public/ffmpeg/                             ← generate เท่านั้น อยู่ใน .gitignore
```

แก้ไฟล์เดิม: `registry.ts`, `loaders.ts`, `categories.ts`, `types.ts`, `category-icons.mjs`, `registry.test.ts`
(allowlist `public/` เพิ่ม `ffmpeg`), `.gitignore`, `package.json`, `astro.config.mjs` (`optimizeDeps.exclude`
สำหรับ `@ffmpeg/ffmpeg` ถ้า Vite ทำ URL ของ worker ภายในเพี้ยน — ยืนยันตอนลงมือ), หน้า `/design-system`
(เพิ่ม ProgressBar), `docs/perf-budget.md` (บันทึกถ้า CSS โต)

**ทำไมไม่ยัดเข้า `FileTool.tsx`:** FileTool ถือ `Options` ก้อนเดียวของ 12 เครื่องมือแล้ว การเพิ่มเวลาเริ่ม/จบ
fps ความกว้าง GIF preset และ lifecycle ที่ต่างกัน (ไม่มี timeout 60 วิ, มี progress, engine อยู่ต่อ) จะทำให้
ไฟล์เดียวรับสองโมเดลที่ไม่เหมือนกัน แยก `VideoTool.tsx` แล้วใช้ primitive ชุดเดิม (`FileDrop`, `SelectedFiles`,
`SegmentedControl`, `Select`, `Input`, `Button`, `ErrorText`) จึงตรงกว่า

## 3. Engine (`shared/engine.ts`)

### การโหลด core

1. `fetch('/ffmpeg/<ver>/ffmpeg-core.wasm.gz')` อ่านเป็น stream รายงานไบต์ที่ได้เทียบกับ `Content-Length`
   เพื่อแสดง "กำลังโหลดตัวประมวลผล 3.2 / 9.7 MB" (ครั้งแรกเท่านั้น ครั้งถัดไปมาจาก HTTP cache)
2. ต่อท่อผ่าน `new DecompressionStream('gzip')` → `Blob` → `URL.createObjectURL`
3. worker `import()` `/ffmpeg/<ver>/ffmpeg-core.js` แล้วเรียก `createFFmpegCore({ mainScriptUrlOrBlob: coreURL + '#' + base64({ wasmURL }) })` (วิธีเดียวกับที่ `@ffmpeg/ffmpeg` ใช้ส่ง wasmURL เข้า core)
4. ไม่มี `DecompressionStream` (เบราว์เซอร์ก่อน Safari 16.4 / Chrome 80) → ข้อความ
   "เบราว์เซอร์นี้ไม่รองรับเครื่องมือวิดีโอ กรุณาอัปเดตเบราว์เซอร์" ไม่มี fallback ทางอื่น

`<ver>` มาจาก `@ffmpeg/core` ใน `package.json` ผ่านค่าคงที่ที่ `copy-ffmpeg.mjs` เขียนลง `public/ffmpeg/<ver>/manifest.json`
และ `engine.ts` import เวอร์ชันจาก `package.json` โดยตรง — URL เปลี่ยนเมื่ออัปเกรด core จึงไม่ต้องกังวล cache เก่า

### การรันงาน

```
writeFile('in.<ext>', bytes)   ← อ่าน File ทั้งก้อนเป็น Uint8Array (≤ 100 MB ตามขีดจำกัด)
exec(args)                     ← จาก buildArgs()
readFile(output) → Blob
deleteFile ทั้งเข้าและออกใน finally  ← คืนหน่วยความจำ MEMFS ทันที
```

- `progress` event ของ ffmpeg.wasm ให้ `time` (ไมโครวินาทีที่ประมวลผลไปแล้ว) → เปอร์เซ็นต์ = time / ระยะเวลาผลลัพธ์ที่คาด
  (trim/gif ใช้ระยะที่เลือก, mp3/compress ใช้ระยะทั้งคลิป) ถ้าไม่รู้ระยะ → แถบแบบ indeterminate
- `exec` คืน exit code ≠ 0 → อ่านบรรทัด log ท้าย ๆ แปลงเป็นข้อความไทยตามรูปแบบที่รู้จัก
  (`Invalid data found` → "ไฟล์เสียหายหรือเบราว์เซอร์อ่านไม่ได้", `Output file is empty`/ช่วงเวลาเกินคลิป →
  "ช่วงเวลาที่เลือกอยู่นอกความยาวคลิป") นอกนั้น "แปลงไม่สำเร็จ กรุณาลองไฟล์อื่นหรือลดขนาด"
- ยกเลิก = `ffmpeg.terminate()` แล้วทิ้ง instance — ครั้งถัดไปโหลดใหม่ (wasm มาจาก cache ใช้เวลาไม่กี่วินาที)
- หน่วยความจำ: single-thread core โตได้ถึง 2 GB แต่ iOS Safari ฆ่าแท็บก่อนถึงนั้น ขีดจำกัด 100 MB ต่อไฟล์
  ตั้งจากงบ "ไฟล์เข้า + ไฟล์ออก + working set" ให้อยู่ใต้ ~600 MB; ต้องยืนยันด้วยการทดสอบจริงบน iPhone ก่อนปล่อย
  (ถ้าไม่ผ่านให้ลดเป็น 60 MB ไม่ใช่ปรับสถาปัตยกรรม)

## 4. คำสั่ง FFmpeg (`shared/args.ts` — pure, มี test)

| เครื่องมือ       | args (ย่อ)                                                                                                                                                                                         | ไฟล์ออก                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| trim เร็ว        | `-ss S -i in -t D -c copy out` (เติม `-movflags +faststart` เฉพาะเมื่อออกเป็น mp4) — ไม่ใส่ `-avoid_negative_ts make_zero` เพราะทำให้เฟรมตั้งแต่คีย์เฟรมก่อนจุดเริ่มถูกนับเป็นเวลา 0 คลิปจึงยาวเกิน (พบตอน QA)                                                                                     | `<ชื่อ>-trim.mp4` (webm ใช้โหมดแม่นยำเสมอ) |
| trim แม่นยำ      | `-ss S -i in -t D -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart out.mp4`                                                                          | `<ชื่อ>-trim.mp4`           |
| mp3              | `-i in -vn -c:a libmp3lame -b:a {128\|192\|320}k out.mp3`                                                                                                                                          | `<ชื่อ>.mp3`                |
| gif              | `-ss S -t D -i in -filter_complex "[0:v]fps=F,scale=W:-2:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop 0 out.gif` | `<ชื่อ>.gif`                |
| compress         | `-i in -vf "scale=<จำกัดด้านยาวที่ 854/1280/1920 คงสัดส่วน หารสองลงตัว>" -c:v libx264 -preset veryfast -crf 28 -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart out.mp4`                       | `<ชื่อ>-compressed.mp4`     |

- `S`/`D` เป็นวินาทีทศนิยม ผ่าน `parseTimecode` แล้ว; ใช้ `-t` (ระยะ) ไม่ใช้ `-to` เพื่อไม่สับสนเมื่อ `-ss` อยู่หน้า `-i`
- โหมดเร็วตัดที่คีย์เฟรมก่อนจุดเริ่ม อาจได้ต้นคลิปเกินมาถึง ~2 วินาที — บอกผู้ใช้บนหน้า และเป็นเหตุผลที่มีโหมดแม่นยำ
- ชื่อไฟล์ออก: ตัดนามสกุลเดิม แทนอักขระที่ไม่ปลอดภัยด้วย `-` จำกัด 60 ตัวอักษร (pure function มี test)
- `pix_fmt yuv420p` เพื่อให้ MP4 เปิดได้บน iPhone/LINE/Facebook — คลิปจอมือถือหลายไฟล์เป็น 4:2:0 อยู่แล้วแต่บางแอปส่ง 4:4:4

## 5. `VideoTool.tsx` — UI และ lifecycle

ลำดับบนหน้า (ทั้ง 4 เครื่องมือ)

1. กล่อง "ไฟล์อยู่บนอุปกรณ์ของคุณ · ไม่อัปโหลดขึ้นเซิร์ฟเวอร์" (ข้อความเดียวกับ FileTool)
2. `FileDrop` ไฟล์เดียว accept `.mp4,.mov,.m4v,.webm` ขีดจำกัด 100 MB
3. `<video controls preload="metadata">` จาก object URL ของไฟล์ที่เลือก ใช้อ่าน `duration` และให้ผู้ใช้หาจุดตัด
   (ถ้าเบราว์เซอร์เล่นไม่ได้ เช่น HEVC บน Chrome — ยังใช้เครื่องมือได้ แสดง "ดูตัวอย่างไม่ได้ในเบราว์เซอร์นี้ แต่ยังแปลงได้")
4. ช่องตามเครื่องมือ
   - trim: `Input` เวลาเริ่ม/เวลาจบ (placeholder `0:00` / `1:30`) + ปุ่ม "ใช้เวลาปัจจุบันของวิดีโอ" ทั้งสองช่อง + `SegmentedControl` เร็ว/แม่นยำ
   - mp3: `SegmentedControl` 128/192/320 kbps
   - gif: เวลาเริ่ม, ระยะ (วินาที ≤ 15), `SegmentedControl` ความกว้าง 240/320/480 และ fps 10/15
   - compress: `SegmentedControl` 480p/720p/1080p พร้อมคำอธิบายว่าคลิปที่เล็กกว่า preset จะไม่ถูกขยาย
5. ปุ่มหลัก (ข้อความจาก `catalog.action`) → ระหว่างทำงาน: `ProgressBar` สองขั้น ("กำลังโหลดตัวประมวลผล" → "กำลังแปลง 42%")
   + ปุ่ม "ยกเลิก" + ข้อความเตือนความเร็วสำหรับ trim แม่นยำ/compress ("บนมือถืออาจใช้เวลาใกล้เคียงความยาวคลิป")
6. ผลลัพธ์: ชื่อไฟล์ ขนาด (compress/trim แสดง "ก่อน → หลัง") ตัวอย่างในหน้า (`<video>` สำหรับ mp4/webm, `<audio>` สำหรับ mp3, `<img>` สำหรับ gif)
   ปุ่มดาวน์โหลด และปุ่ม "ล้าง"
7. เครดิต FFmpeg (GPL) ท้ายเครื่องมือ

ตรวจก่อนเริ่ม (ฝั่ง UI, ข้อความไทย, focus ไปที่ error เหมือน FileTool)

- ไม่มีไฟล์ / นามสกุลไม่รองรับ / เกิน 100 MB
- เวลาเริ่ม ≥ เวลาจบ, เวลาจบเกินระยะคลิป (เมื่อรู้ระยะ), ระยะ GIF > 15 วินาที, รูปแบบเวลาอ่านไม่ออก

Lifecycle เหมือน FileTool ในสิ่งที่พิสูจน์แล้วว่าจำเป็น: `version` counter กันผลลัพธ์เก่าทับหลังยกเลิก, revoke object URL
ทุกครั้งที่ล้าง/เปลี่ยนไฟล์/unmount, lock กันกดซ้ำ, `fieldset disabled` ระหว่างทำงาน ต่างตรงที่ engine อยู่ต่อหลังสำเร็จ
และถูก terminate เมื่อยกเลิก ผิดพลาด หรือ unmount

ไม่มี `localStorage`/`sessionStorage` เช่นเดิม

## 6. เครื่องมือที่ไม่ใช้ engine

### `youtube-thumbnail`

- `logic.ts`: `parseYoutubeId(input)` รองรับ `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `/live/`, `music.youtube.com`,
  และ ID เปล่า 11 ตัวอักษร `[A-Za-z0-9_-]` คืน `null` ถ้าไม่ตรง; `thumbnailUrls(id)` คืน 4 ขนาด
  (`maxresdefault` 1280×720, `sddefault` 640×480, `hqdefault` 480×360, `mqdefault` 320×180)
- UI: `Input` ลิงก์ + ปุ่ม "ค้นหารูปปก" → การ์ดต่อขนาด โหลดด้วย `<img>` ขนาดที่ 404 (`maxresdefault` ของคลิปเก่า) ซ่อนไป
  ปุ่มดาวน์โหลดต่อขนาด = `fetch` → blob → `<a download="<id>-1280x720.jpg">` ถ้า fetch ล้มเหลวให้เปิดรูปในแท็บใหม่พร้อมคำแนะนำกดค้างเพื่อบันทึก
- FAQ/disclaimer: รูปปกเป็นของเจ้าของช่อง เครื่องมือแสดงรูปสาธารณะที่ YouTube เผยแพร่อยู่แล้ว ไม่แตะตัววิดีโอ ใช้เพื่ออ้างอิงหรือทำสื่อประกอบโดยเคารพลิขสิทธิ์

### `clean-share-link`

- `logic.ts`: `cleanLink(url)` → `{ cleaned, removed: string[] }` และ `cleanLinks(text)` ทีละบรรทัด ไม่เกิน 50 บรรทัด บรรทัดที่ไม่ใช่ http/https คงเดิมและติดป้าย "ไม่ใช่ลิงก์"
- กฎทั่วไป (ลบ): `utm_*`, `fbclid`, `gclid`, `dclid`, `msclkid`, `twclid`, `ttclid`, `igshid`, `igsh`, `mc_cid`, `mc_eid`, `yclid`, `_ga`, `_gl`, `ref_src`, `ref_url`, `si`, `feature`, `mibextid`
- กฎรายโดเมน:
  - `youtu.be/<id>` → `https://www.youtube.com/watch?v=<id>` เก็บ `t=` ไว้; `youtube.com` เก็บเฉพาะ `v`, `t`, `list`, `index`
  - `tiktok.com/@user/video/<id>` และ `douyin.com/video/<id>` → ตัด query ทั้งหมด; ลิงก์สั้น `vm.tiktok.com` / `v.douyin.com` คงเดิม พร้อมหมายเหตุว่าเบราว์เซอร์แก้ลิงก์สั้นให้ไม่ได้
  - `facebook.com`, `instagram.com`, `x.com`/`twitter.com` → ลบตามกฎทั่วไป ไม่ตัดพารามิเตอร์ที่ไม่รู้จัก
- ลิงก์ที่ไม่มีอะไรให้ลบต้องคืนค่าเดิมทุกตัวอักษร (ไม่ normalize ตัวพิมพ์หรือเติม `/`)
- UI: `Textarea` เข้า → ตารางผลลัพธ์ (ลิงก์ที่ล้างแล้ว + ป้ายจำนวนพารามิเตอร์ที่ตัด) + `CopyButton` คัดลอกทั้งหมด

## 7. สคริปต์ `scripts/copy-ffmpeg.mjs` และ `package.json`

- อ่านเวอร์ชันจาก `node_modules/@ffmpeg/core/package.json` → `public/ffmpeg/<ver>/ffmpeg-core.js` (คัดลอกตรง)
  และ `ffmpeg-core.wasm.gz` (gzip ระดับ 9 ด้วย `node:zlib`) + `manifest.json` (ขนาดดิบ, ขนาด gz, sha256)
- ข้ามถ้า manifest ตรงกับไฟล์ที่มีอยู่ (idempotent, รันได้ทุกครั้งโดยไม่เสียเวลา)
- ลบโฟลเดอร์เวอร์ชันเก่าใน `public/ffmpeg/` เพื่อไม่ให้ deploy ไฟล์ 10 MB ซ้ำหลายชุด
- `package.json`: `"postinstall": "node scripts/copy-ffmpeg.mjs"`, `"build": "node scripts/copy-ffmpeg.mjs && astro build"`,
  `"deploy": "npm run build && wrangler deploy"`, `"preview": "npm run build && wrangler dev"`
- devDependencies: `@ffmpeg/core@0.12.10` เท่านั้น (ถูกคัดลอกตอน build ไม่ถูก bundle) — ไม่มี runtime dependency ใหม่ worker ของเราคุยกับ core ผ่าน `createFFmpegCore` โดยตรง (exec/FS.writeFile/FS.readFile/setProgress ตามที่ `@ffmpeg/ffmpeg` ทำ)
- worker ตรวจ magic bytes ของ gzip ก่อนคลาย เพราะเซิร์ฟเวอร์บางตัว (Vite dev) ส่ง `.gz` พร้อม `Content-Encoding: gzip` ให้เบราว์เซอร์คลายเองแล้ว
- ยืนยันจาก smoke test 13 กันยายน 2569: `time` ใน progress ของ core เป็นไมโครวินาที; ตัดคลิป 3 วินาทีแบบ stream copy ใช้ 161 ms; MP3 12 วินาที 92 ms; ไฟล์เสียหายได้ข้อความไทยและ core ทำงานต่อได้
- `registry.test.ts` allowlist `public/` เพิ่ม `ffmpeg` และเพิ่มข้อทดสอบว่า `public/ffmpeg/` มีโฟลเดอร์เวอร์ชันเดียวและตรงกับ `package.json`

## 8. งบประสิทธิภาพและขนาด

- chunk ที่ hydrate ของ `VideoTool` ต้องไม่ static-import `@ffmpeg/ffmpeg` หรือ `engine.ts` — `npm run size` นับ chunk ที่ `ToolIsland` โหลด
  จึงจับได้ทันทีถ้าพลาด คาดว่าหน้าเครื่องมือวิดีโออยู่ใต้ p95 เดิม (103 KB) เพราะ UI ใช้ primitive ที่มีอยู่แล้ว
- 9.7 MB ของ core ไม่นับใน budget ตามหลักเดียวกับ engine เอกสารที่ "โหลดหลังเริ่มแปลง" แต่ต้องบันทึกใน `docs/perf-budget.md`
  ว่าหมวดนี้มีการโหลดหลังคลิกที่ใหญ่กว่าทุกหมวด และแสดงขนาดให้ผู้ใช้เห็นก่อนโหลด ("ครั้งแรกโหลดตัวประมวลผล ~10 MB")
- CSS โตจาก `ProgressBar` เพียงไม่กี่ร้อยไบต์ ถ้าเกิน `cssGzip` ให้บันทึกตามกติกาในตารางประวัติ

## 9. การทดสอบ

หน่วย (vitest, ไม่ต้องมีเบราว์เซอร์)

- `timecode.test.ts`: `'90'`, `'1:30'`, `'01:30.5'`, `'1:02:03'`, ค่าว่าง, ตัวอักษร, ติดลบ, วินาที ≥ 60 ในช่องวินาที
- `args.test.ts`: ทุกเครื่องมือทุก preset ให้ args ตรงตารางข้อ 4, ชื่อไฟล์ออก, การเลือก container ของ trim เร็วตามนามสกุลเข้า, scale ของ compress ทั้งแนวตั้ง/แนวนอน/เล็กกว่า preset
- `youtube-thumbnail/logic.test.ts`: ทุกรูปแบบลิงก์ + ลิงก์ที่ต้องคืน `null` (โดเมนอื่น, ID 10 ตัว)
- `clean-share-link/logic.test.ts`: กฎทั่วไป, กฎรายโดเมน, ลิงก์ที่ต้องคืนค่าเดิมทุกตัวอักษร, บรรทัดที่ไม่ใช่ลิงก์, เกิน 50 บรรทัด
- `VideoTool.test.tsx` (jsdom, mock `./engine` ทั้งโมดูล): ไม่มีไฟล์ → error, นามสกุลผิด, เวลาเริ่ม ≥ จบ, GIF > 15 วิ,
  ยกเลิกระหว่างทำแล้วผลลัพธ์เก่าไม่โผล่, revoke URL ตอนล้าง/unmount, progress อัปเดตจาก callback, error จาก engine แสดงข้อความไทย
- `progress.test.tsx`: ค่า 0–100, indeterminate, `aria-valuenow`/label
- `registry.test.ts` เดิมครอบคลุมหมวดใหม่ ปกสำรอง loader และ allowlist `public/` โดยอัตโนมัติ

ในเบราว์เซอร์ (บันทึกเป็น `docs/video-tools-verification.md` แบบเดียวกับ file-tools)

- Chromium desktop: ทั้ง 4 เครื่องมือกับ mp4 (H.264/AAC จาก iPhone), mov, webm — ตรวจไฟล์ออกเปิดได้และความยาวถูก
- ยกเลิกกลางคัน, กดซ้ำ, เปลี่ยนไฟล์ระหว่างทำ, offline หลัง core อยู่ใน cache
- iPhone Safari จริง: ไฟล์ 100 MB ไม่ทำให้แท็บถูกฆ่า — ถ้าถูกฆ่า ลดขีดจำกัดตามข้อ 3
- axe-core บนหน้าที่มีผลลัพธ์ และ 390×844 light/dark/reduced-motion เหมือนรอบก่อน

## 10. สัญญาอนุญาตและข้อความบนหน้า

- `@ffmpeg/core` เป็น GPL-2.0-or-later (รวม libx264, libmp3lame) เว็บเสิร์ฟไบนารีต้นฉบับโดยไม่ดัดแปลง และโค้ดของเว็บคุยกับมันผ่าน
  Web Worker/message เท่านั้น บนหน้าเครื่องมือทั้ง 4 ตัวมีเครดิต "ประมวลผลด้วย FFmpeg ผ่าน ffmpeg.wasm (GPL) — ซอร์สโค้ด: github.com/ffmpegwasm/ffmpeg.wasm"
- `@ffmpeg/ffmpeg` (wrapper) เป็น MIT
- ทางเลือกถ้าต้องการหลีก GPL ในอนาคต: build core แบบ LGPL (ไม่มี x264) แล้วเข้ารหัสวิดีโอเป็น VP9/WebM แทน — ต้องแลกกับ MP4 ที่เปิดได้ทุกที่ จึงไม่เลือกรอบนี้
- ทุกหน้าในหมวดมี disclaimer สั้น: "ใช้กับไฟล์ที่คุณมีสิทธิ์ใช้งาน เครื่องมือนี้ไม่ดาวน์โหลดวิดีโอจากเว็บไซต์หรือแอปใด"

## 11. ลำดับการลงมือ (ให้ writing-plans แตกเป็น task)

1. หมวด `video` + ไอคอน + ปกสำรอง + `ProgressBar` primitive + หน้า design-system
2. `copy-ffmpeg.mjs` + `package.json` + `.gitignore` + allowlist test + `engine.ts` (พิสูจน์ว่า load/exec ได้จริงใน Chromium ก่อนต่อ)
3. `timecode.ts`, `args.ts` (TDD) + `catalog.ts` + `VideoTool.tsx` (TDD กับ engine mock) + 4 `Tool.tsx` + registry/loaders
4. `youtube-thumbnail` (TDD)
5. `clean-share-link` (TDD)
6. ตรวจ `npm test` / `typecheck` / `lint` / `size` / `build`, QA ในเบราว์เซอร์, เขียน `docs/video-tools-verification.md`, อัปเดต `perf-budget.md` ถ้าจำเป็น — ยังไม่ deploy จนกว่าจะสั่ง
