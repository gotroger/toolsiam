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

## สมาชิกและพรีเมียม
- เครื่องมือทุกตัวใช้ฟรีไม่ต้อง login · สมาชิกพรีเมียม 19 บาท/30 วัน (Google login + PromptPay ผ่าน Beam) ขยายขีดจำกัดเครื่องมือไฟล์
- ตัวเลขขีดจำกัดทั้งหมดอยู่ที่ `src/lib/plan-limits.ts` · logic ฝั่ง server อยู่ที่ `src/lib/membership/` · route ใน `src/pages/api/`
- เปิด/ปิดได้สองชั้น: var `MEMBERSHIP=on` ใน `wrangler.jsonc` (runtime, ทุก API) และ `PUBLIC_MEMBERSHIP=on` ตอน build (แสดงปุ่ม login ใน HTML)
- ตัวแปรและ secret ที่ต้องตั้ง ดู `.env.example` · migration D1 อยู่ใน `migrations/`
- Spec: `docs/superpowers/specs/2026-09-19-membership-premium-design.md`

## โดเมน

เว็บออนไลน์แล้วที่ **https://toolsiam.com** (ผูกเป็น custom domain ของ Worker `toolsiam` ผ่าน `routes` ใน `wrangler.jsonc` — ทั้ง apex และ `www`)

หมายเหตุ: `workers.dev` ถูกปิดโดยอัตโนมัติเมื่อ deploy ด้วย `routes` (ไม่ได้ตั้ง `workers_dev: true`) — จึงเข้าผ่าน `toolsiam.appsoom.workers.dev` ไม่ได้อีก ใช้โดเมนจริงแทน
