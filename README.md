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

## โดเมน

ตอนนี้เว็บรันอยู่บน `https://toolsiam.appsoom.workers.dev` (ยังไม่ได้ผูกโดเมน `toolsiam.com` เพราะยังไม่ได้ยืนยันว่า zone ของโดเมนนี้อยู่ใน Cloudflare account นี้แล้ว)

เมื่อโดเมนพร้อม ให้เพิ่มใน `wrangler.jsonc` ระดับบนสุด:

```jsonc
"routes": [{ "pattern": "toolsiam.com", "custom_domain": true }, { "pattern": "www.toolsiam.com", "custom_domain": true }],
```

แล้วรัน `npm run deploy` อีกครั้ง
