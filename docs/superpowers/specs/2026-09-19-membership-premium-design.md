# สมาชิก Google + พรีเมียม 19 บาท/30 วัน — ดีไซน์

วันที่: 19 กันยายน 2569

## เป้าหมาย

1. ให้ผู้ใช้เข้าสู่ระบบด้วยบัญชี Google ได้ (ทางเลือก ไม่บังคับ)
2. ขายสมาชิกพรีเมียมราคา 19 บาทต่อ 30 วัน ชำระผ่าน QR PromptPay (Beam Checkout)
3. สมาชิกพรีเมียมได้ขีดจำกัดเครื่องมือไฟล์สูงขึ้น — เครื่องมือทุกตัวยังใช้ฟรีโดยไม่ต้องสมัคร

spec เดิม [2026-09-07](2026-09-07-toolsiam-design.md) §5–§7 ออกแบบ Google+LINE และ Beam ไว้ที่ 99 บาทแต่ไม่เคยสร้าง
และ Phase 0B (commit `0f48d8a`) ถอดระบบ tier ทั้งหมดเพราะยังไม่มี paywall จริง งานนี้คือการสร้าง paywall จริง
ในรูปแบบที่แคบกว่าเดิม: **ไม่มีเครื่องมือตัวไหนถูกล็อก** ต่างกันแค่ขีดจำกัด

## การตัดสินใจที่ยืนยันแล้ว

| ประเด็น            | ข้อสรุป                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| ผู้ให้บริการ login | Google เท่านั้น (OIDC authorization code + PKCE) ไม่มี LINE                                                                      |
| ราคา               | 19 บาท = 1,900 สตางค์ ต่อ 30 วัน                                                                                                 |
| ช่องทางชำระ        | Beam Checkout QR PromptPay — ต่ออายุอัตโนมัติไม่ได้ จึงเป็นการ "เติมวัน" บวกจาก max(วันนี้, วันหมดอายุเดิม)                      |
| ฟีเจอร์พรีเมียม    | ขีดจำกัดเครื่องมือไฟล์ (ต่อไฟล์ จำนวนไฟล์ ขนาดรวม หน้า PDF ช่องตาราง เวลาประมวลผล) ใน `src/lib/plan-limits.ts`                   |
| tier ต่อเครื่องมือ | ไม่มี — `ToolMeta` ไม่เปลี่ยน, `isAccessibleForFree: true` ใน JSON-LD ยังจริง                                                    |
| ทดลองใช้           | ไม่มี — ผู้ใช้ที่ไม่ล็อกอินเห็นข้อเสนอแล้วต้องล็อกอิน + จ่าย                                                                     |
| gating             | ฝั่ง browser (ไฟล์ไม่เคยขึ้น server) จึง bypass ได้ — ยอมรับตาม spec เดิม §11                                                    |
| dependency ใหม่    | ไม่มี — Google/Beam ใช้ `fetch`, PKCE/HMAC ใช้ Web Crypto                                                                        |
| cron               | ไม่มี — QR หมดอายุจัดการแบบ lazy ใน status endpoint, banner ใกล้หมดอายุคำนวณใน `/api/me`                                         |
| ที่เก็บ            | D1 `DB` (users, subscriptions, payments) + KV `MEMBER_SESSION` — binding ถูก comment ไว้ใน `wrangler.jsonc` จนกว่าจะสร้างของจริง |

## สถาปัตยกรรม

```
เบราว์เซอร์ (หน้า static ทุกหน้าเหมือนเดิม)
  │ Header script: มี cookie ts_m=1 เท่านั้นจึง GET /api/me → เมนูบัญชี
  │ FileTool: usePlan() (module store) → limitsFor(plan) → ข้อเสนอเมื่อเกินฟรีแต่อยู่ในพรีเมียม
  │ /account island: โปรไฟล์ · ซื้อ 30 วัน → QR → poll status
  ↓
Astro API routes (prerender=false, shim บาง ๆ) → src/lib/membership/handlers.ts (pure, ทดสอบด้วย stub)
  ├── GET  /api/auth/google/start     state+PKCE ใน cookie `oauth` 10 นาที → 302 Google
  ├── GET  /api/auth/google/callback  แลก code → id_token (ตรวจ iss/aud/exp/email_verified) → upsert users → sid ใน KV
  ├── POST /api/auth/logout           Origin check → ลบ session + cookies
  ├── GET  /api/me                    private, no-store → {user, plan, premiumUntil, expiringSoon}
  ├── POST /api/billing/checkout      สร้าง payments(pending) → Beam charge → QR base64 (ใช้ pending เดิมที่ยังไม่หมดอายุซ้ำ)
  ├── GET  /api/billing/status?ref=   DB เป็นความจริง · เลย QR TTL → expired
  └── POST /api/billing/webhook       HMAC-SHA256 ของ raw body → settle แบบ idempotent (status='pending' เท่านั้น)
```

## ด่านตรวจ (ทุก API)

1. `env.MEMBERSHIP !== 'on'` หรือไม่มี binding/secret ที่ต้องใช้ → 204 (เว็บทำงานเหมือนไม่มีระบบสมาชิก)
2. mutation ทุกตัวเป็น POST + `Origin` ต้องเป็น `https://toolsiam.com`, `https://www.toolsiam.com` หรือ `http://localhost:*`
3. cookie `sid` HttpOnly Secure SameSite=Lax · `ts_m` ไม่ HttpOnly ใช้เป็น hint เท่านั้น · production ตั้ง `Domain=toolsiam.com` ให้ apex/www ใช้ร่วมกัน
4. `next` หลังล็อกอินต้องขึ้นต้นด้วย `/` และไม่ใช่ `//` (กัน open redirect)
5. webhook: อ่าน raw body (≤ 64 KB) ก่อน parse, ตรวจลายเซ็นแบบ constant-time, ตรวจ `merchantId`, event ที่ไม่รู้จักตอบ 200 ให้ Beam เลิก retry
6. ตัวเลขทุกตัว (ราคา วัน ขีดจำกัด) มาจาก `src/lib/plan-limits.ts` — ไม่พิมพ์มือที่อื่น

## โครงข้อมูล (D1, `migrations/0001_membership.sql`)

- `users(id, google_sub UNIQUE, email, display_name, avatar_url, created_at, last_login_at)`
- `subscriptions(user_id PK, expires_at, updated_at)` — พรีเมียม = `expires_at > now`
- `payments(id, user_id, amount_satang, status pending|paid|expired, beam_charge_id UNIQUE, qr_expires_at, created_at, paid_at, raw_webhook_json)`
  - settle ได้ทั้ง `pending` และ `expired` — เงินที่โอนแล้วต้องได้สิทธิ์เสมอ แม้ webhook จะมาถึงหลังเราปิด QR ไปแล้ว

เวลาเป็น unix seconds ทั้งหมด · ไม่มีตารางไหนเก็บข้อมูลที่ผู้ใช้กรอกในเครื่องมือ

## สวิตช์สองชั้น

- `PUBLIC_MEMBERSHIP=on` ตอน build → HTML มีปุ่มเข้าสู่ระบบ / CTA ใน `/premium` / ลิงก์ขีดจำกัดพรีเมียมใน ToolShell
- `MEMBERSHIP=on` ใน `wrangler.jsonc` → API ทำงาน · ปิดเมื่อไรทุก API ตอบ 204 และ client ถือว่าเป็นแพลนฟรีโดยไม่มีข้อเสนอ

merge ได้โดยยังไม่เปิดทั้งสอง → production เหมือนเดิมทุกประการ

## ลำดับงาน

| เฟส | งาน                                                                           | ผลลัพธ์                                    |
| --- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| 0   | `plan-limits.ts`, routes, `/premium` `/privacy` `/terms`, redirect `/pricing` | หน้าขายขึ้น, Google consent screen ตั้งได้ |
| 1   | `src/lib/membership/*`, migration, `/api/me` + auth, header, `/account`       | ล็อกอิน Google ได้                         |
| 2   | Beam checkout/status/webhook, flow ซื้อใน `/account`                          | รับเงินได้ (playground → production)       |
| 3   | `Job.limits`, FileTool อ่านแพลน, ข้อเสนอเมื่อเกินฟรี, catalog เลิก hardcode   | สมาชิกได้ขีดจำกัดสูงขึ้นจริง               |

## งานนอกโค้ด

1. Cloudflare: Workers Paid · `wrangler d1 create toolsiam` → ใส่ `database_id` · `wrangler kv namespace create SESSION` → ใส่ `id` · token ของ CI เพิ่มสิทธิ์ D1:Edit · repo variable `PUBLIC_MEMBERSHIP=on` ตอน go-live
2. Google Cloud: OAuth consent screen (external; homepage, `/privacy`, `/terms`) · Web client redirect URIs `https://toolsiam.com/api/auth/google/callback`, `https://www.toolsiam.com/api/auth/google/callback`, `http://localhost:4321/api/auth/google/callback`, `http://localhost:8787/api/auth/google/callback` · `wrangler secret put GOOGLE_CLIENT_SECRET`
3. Beam: merchant + playground key + HMAC secret + webhook `https://toolsiam.com/api/billing/webhook` · `wrangler secret put BEAM_API_KEY`, `BEAM_WEBHOOK_HMAC_SECRET` · ทดสอบ playground ครบก่อนสลับ `BEAM_API_BASE_URL`
4. Local: `.dev.vars` + `npx wrangler d1 migrations apply toolsiam --local`

## ความเสี่ยง

- ชื่อ field ของ Beam อ้างจากโปรเจกต์ข้างเคียง (spec เดิม §6) — ต้อง smoke test playground ก่อนเชื่อ assertion
- webhook มาก่อน/ซ้ำ → `settlePayment` guard ที่ `status='pending'`; status endpoint อ่าน DB เป็นความจริง
- perf budget (`docs/perf-budget.md`): header HTML ทุกหน้า + chunk ของ FileTool โตขึ้น — วัดแล้ว ledger ถ้าต้องยก
- KV eventually consistent → OAuth state ไม่เก็บใน KV (ใช้ cookie) · session อ่านจาก PoP เดียวกับที่เขียนในทางปฏิบัติ
