# ToolSiam (ทูลสยาม) — แผนความเป็นไปได้ + สถาปัตยกรรม MVP

## Context

ต้องการเว็บรวมเครื่องมือออนไลน์ภาษาไทย `toolsiam.com` ใช้งานง่ายแบบ toolhai.com
(SPA, ~235 tools, 15 หมวด, tag FREE/PREMIUM ต่อเครื่องมือ, หน้า /search กรองหมวด/ฟรี/พรีเมียม,
ใช้เครื่องมือฟรีได้โดยไม่ต้องสมัคร, แพ็กเกจจำกัด requests/วัน)

การตัดสินใจที่ยืนยันแล้ว:
- โฮสต์บน Cloudflare ทั้งหมด (Workers + static assets + D1 + KV + R2 + Cron)
- Frontend: **Astro + React islands** (SEO เป็นหลัก, UI เครื่องมือเป็น React + shadcn ที่คุ้นจาก appsoom)
- สมาชิก: Google + LINE Login
- พรีเมียม 99 บาท/เดือน ชำระผ่าน **Beam Checkout — PromptPay QR**
- MVP: 20-30 tools + สมาชิก + พรีเมียม

โปรเจกต์นี้ยังว่างเปล่า (`/Users/gotroger/PROJECT/ToolSiam` ไม่มีไฟล์) แต่มี pattern ให้ยืมจากโปรเจกต์ข้างเคียง
(catper = Beam integration, appsoom/jaeruay = Google auth, promptpay-qr, Stripe)

---

## 1. คำตอบเรื่องความเป็นไปได้ (Cloudflare-only vs VPS)

**ทำได้ทั้งหมดบน Cloudflare สำหรับ MVP และแนะนำให้ทำแบบนั้น** เหตุผล:

| ประเด็น | Cloudflare Workers | VPS (ที่มีอยู่แล้วของ appsoom) |
|---|---|---|
| เครื่องมือ 90% ประมวลผลในเบราว์เซอร์ (canvas, pdf-lib, คำนวณ) | CPU ฝั่ง server ≈ 0 | ไม่จำเป็น |
| SEO / ความเร็วโหลดทั่วโลก + ไทย | static HTML ที่ edge, cache ฟรี | ต้องตั้ง nginx + CDN เอง |
| ค่าใช้จ่าย | $5/เดือน (Workers Paid) | ใช้ VPS เดิมได้ แต่ต้องดูแล uptime/patch เอง |
| งานหนัก (ffmpeg, puppeteer, OCR, sharp ใหญ่) | ทำไม่ได้ / จำกัด CPU 30s + memory 128MB | ทำได้ |
| ฐานข้อมูล | D1 (SQLite) พอสำหรับ users/subscriptions/usage | Postgres ที่มีอยู่ |

**ข้อควรระวังสำคัญ (ต้องตัดสินใจก่อน launch):**
- ตั้งแต่ **1 ก.ย. 2569 (2026-09-01)** D1 บน Workers **Free** จะ **error ทันที** เมื่อเกิน 5M rows read/วัน หรือ 100K rows write/วัน
  ([changelog](https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/))
  และ Free มี CPU 10ms/request, 100K requests/วัน
- **แนะนำ Workers Paid ($5/เดือน ≈ 180 บาท)** ตั้งแต่วันแรก: ได้ CPU 30s/request, 10M requests, D1 25B reads, ไม่มี daily hard-fail
  → เทียบเท่าสมาชิกพรีเมียม 2 คน

**Hybrid ในอนาคต (Phase 2+):** เครื่องมือหนัก (แปลงวิดีโอ, screenshot เว็บ, OCR) ส่งไป VPS ผ่าน Cloudflare Queue
หรือ HTTP + signed URL แบบเดียวกับ `video-cdn` worker ของ appsoom ไม่ต้องย้ายโครงสร้างหลัก

---

## 2. สถาปัตยกรรม

```
toolsiam.com  (Cloudflare Worker เดียว: Astro + @astrojs/cloudflare adapter)
├── หน้า static (prerender ตอน build): /, /tools, /c/<หมวด>, /t/<tool-slug>, /pricing, /about
├── React islands: UI ของแต่ละเครื่องมือ (client:load เฉพาะส่วน tool) — ประมวลผลในเบราว์เซอร์
├── Server endpoints (Astro src/pages/api/*):
│   ├── /api/auth/google/{start,callback}     ← OIDC auth code, verify id_token ด้วย jose + Google JWKS
│   ├── /api/auth/line/{start,callback}       ← LINE Login v2.1, POST https://api.line.me/oauth2/v2.1/verify
│   ├── /api/auth/logout, /api/me
│   ├── /api/billing/checkout                 ← POST Beam /api/v1/charges (QR_PROMPT_PAY) → คืน encodedImage
│   ├── /api/billing/webhook                  ← verify HMAC-SHA256 base64 (x-beam-signature) → ต่ออายุ
│   ├── /api/billing/status                   ← polling หลังสแกน QR
│   ├── /api/usage/consume                    ← นับโควตาเครื่องมือพรีเมียม (KV counter)
│   └── /api/tools/<slug>                     ← เฉพาะเครื่องมือที่ต้องมี server (fetch ภายนอก, ซ่อน logic)
├── Bindings: D1 (DB), KV (SESSION, QUOTA), R2 (UPLOADS — ยังไม่ใช้ใน MVP), Cron (daily 02:00 ICT)
└── Secrets: GOOGLE_CLIENT_SECRET, LINE_CHANNEL_SECRET, BEAM_API_KEY, BEAM_WEBHOOK_HMAC_KEY, SESSION_SECRET
```

หลักการ:
- **เครื่องมือ = ไฟล์ React หนึ่งไฟล์ + metadata หนึ่ง entry** ใน `src/tools/registry.ts`
  (slug, ชื่อไทย/อังกฤษ, หมวด, tier free|premium, keywords SEO, component lazy import)
  → หน้า `/t/[slug].astro` และ `/c/[category].astro` generate จาก registry อัตโนมัติ, sitemap อัตโนมัติ
- หน้า tool มี **เนื้อหา SEO ภาษาไทย** (คำอธิบาย, วิธีใช้, FAQ, JSON-LD `SoftwareApplication`/`FAQPage`) นอก island
- Session: cookie `sid` (HttpOnly, Secure, SameSite=Lax) → KV `SESSION:<sid>` → `{userId, exp}` TTL 30 วัน
- Premium gating: island เรียก `/api/me` ตอน mount; ถ้าเครื่องมือเป็น premium และไม่มีสิทธิ์ → แสดง paywall
  **ความจริงที่ต้องยอมรับ:** โค้ดที่รันฝั่ง browser ดึงไปใช้ได้ถ้าตั้งใจ ดังนั้นคุณค่าพรีเมียมควรอยู่ที่สิ่งที่ต้องใช้ server
  (บันทึกประวัติ/รายการโปรด sync, ไม่มีโฆษณา, โควตาไม่จำกัด, batch หลายไฟล์, export เพิ่มเติม, เครื่องมือที่ fetch ผ่าน server)

---

## 3. โมเดล Free / Premium

| | Free (ไม่ต้องสมัคร) | Free (สมัครแล้ว) | Premium 99 บาท/เดือน |
|---|---|---|---|
| เครื่องมือ tier free | ไม่จำกัด | ไม่จำกัด | ไม่จำกัด |
| เครื่องมือ tier premium | ทดลอง 3 ครั้ง/วัน (นับตาม IP) | 5 ครั้ง/วัน | ไม่จำกัด |
| โฆษณา (AdSense) | มี | มี | ไม่มี |
| ประวัติการใช้ / รายการโปรด | — | รายการโปรด | ประวัติ + รายการโปรด sync |
| Batch / ไฟล์ใหญ่ | — | — | ใช่ |

แพ็กเกจ (PromptPay ต่ออายุอัตโนมัติไม่ได้ → ขายแบบเติมเวลา):
- 1 เดือน 99 บาท · 3 เดือน 279 บาท · 12 เดือน 990 บาท (ต่ออายุ = บวกวันต่อจากวันหมดอายุเดิม)
- Beam คิดค่าธรรมเนียม PromptPay 0% ตามที่โฆษณา (ยืนยันกับสัญญาที่ได้จริง)
- ต่ออายุอัตโนมัติด้วยบัตร (Beam CIT/MIT) เก็บไว้ Phase 2

---

## 4. รายการเครื่องมือ MVP (27 ตัว, 8 หมวด) — ทั้งหมดรันในเบราว์เซอร์ ยกเว้นที่ระบุ

| หมวด | เครื่องมือ | Tier | หมายเหตุ |
|---|---|---|---|
| **การเงิน/ภาษี** | คำนวณภาษีเงินได้บุคคลธรรมดา 2569 | premium | ตารางขั้นภาษี + ลดหย่อน, จุดขายหลัก SEO |
| | คำนวณค่างวดผ่อนบ้าน/รถ (ตารางผ่อน) | free | export ตารางเป็น CSV = premium |
| | เงินเดือนสุทธิ (หักประกันสังคม + ภาษี) | free | |
| | ถอด/รวม VAT 7% และหัก ณ ที่จ่าย | free | |
| | ดอกเบี้ยทบต้น / เป้าหมายออม | free | |
| **ข้อความไทย** | ตัวเลขเป็นคำอ่านไทย (บาทถ้วน) | free | ใช้ในใบเสร็จ, ค้นเยอะ |
| | นับคำ/ตัวอักษรไทย | free | |
| | เลขไทย ↔ อารบิก, ตัวพิมพ์ใหญ่/เล็ก | free | |
| | ถอดอักษรไทยเป็นโรมัน (RTGS) | premium | ต้องมีตารางถอดเสียง |
| | ลบบรรทัดซ้ำ / เรียงบรรทัด / ตัดช่องว่าง | free | |
| | ตรวจเลขบัตรประชาชน 13 หลัก (checksum) + สุ่มเลขทดสอบ | free | |
| **วันที่/เวลา** | คำนวณอายุ + นับวันระหว่างวันที่ (พ.ศ.) | free | |
| | แปลง พ.ศ. ↔ ค.ศ. + วันในสัปดาห์ | free | |
| | วันหยุดราชการ/ธนาคาร 2569 + นับวันทำการ | premium | ข้อมูลอยู่ใน D1/JSON อัปเดตรายปี |
| **QR / PromptPay** | สร้าง QR PromptPay (มี logic จาก `promptpay-qr` แล้ว) | free | ดาวน์โหลด PNG ไม่มีลายน้ำ = premium |
| | สร้าง QR ทั่วไป / WiFi / vCard | free | |
| | อ่าน QR จากรูป | free | jsQR |
| **รูปภาพ** | บีบอัด/ย่อขนาดรูป (canvas) | free | batch >5 ไฟล์ = premium |
| | แปลง PNG/JPG/WebP + ลบ EXIF | free | |
| | ตัด/หมุน/ใส่ลายน้ำข้อความ | premium | |
| **PDF** | รวม PDF / แยกหน้า / หมุน (pdf-lib) | free | |
| | รูปหลายรูป → PDF | premium | |
| **Dev** | JSON format/validate/minify, Base64, URL encode | free | |
| | UUID, hash SHA-256/512, JWT decode | free | |
| | Regex tester, diff ข้อความ | free | |
| **เว็บ/SEO** | Meta tag + Open Graph generator + preview | free | |
| | UTM builder, สร้าง slug ภาษาไทย | free | |
| | ตรวจ meta/OG ของ URL (**server fetch**) | premium | endpoint `/api/tools/og-check` |

เกณฑ์เลือก: ประมวลผลเบา, ไม่มี dependency ฝั่ง server, มี search volume ภาษาไทย, เขียนได้ใน 1-3 ชม./ตัว

---

## 5. Auth

**Google** — OIDC authorization code flow (ไม่ใช้ implicit):
1. `/api/auth/google/start` สร้าง `state` + PKCE เก็บใน KV 10 นาที → redirect `accounts.google.com/o/oauth2/v2/auth` scope `openid email profile`
2. callback แลก code → `id_token` → verify ด้วย `jose` (`createRemoteJWKSet('https://www.googleapis.com/oauth2/v3/certs')`, aud = client id)
3. upsert `users` + `user_identities(provider='google', provider_uid=sub)` → ออก session cookie

**LINE Login v2.1**:
1. start → `https://access.line.me/oauth2/v2.1/authorize` scope `profile openid email`
2. callback แลก code ที่ `https://api.line.me/oauth2/v2.1/token` → POST `https://api.line.me/oauth2/v2.1/verify` (`id_token`, `client_id`) ได้ `sub, name, picture, email`
3. **email ของ LINE ต้องยื่นขอสิทธิ์ "Email address permission" ใน LINE Developers Console** (อนุมัติไม่ทันที) → ออกแบบให้ `users.email` เป็น nullable
4. Provider เดียวกัน `sub` เดียวกัน = user เดิม; ถ้าอีเมลตรงกับบัญชีเดิม → ผูก identity เพิ่ม (account linking)

**โค้ดที่ port ได้แทบตรง ๆ (ยืนยันจากการสำรวจ):**
- `/Users/gotroger/PROJECT/jaeruay/apps/api/src/modules/auth/providers/line.ts` (33 บรรทัด) — POST `/oauth2/v2.1/verify` ด้วย `fetch` ล้วน ไม่มี SDK → ใช้บน Workers ได้ทันที
- `/Users/gotroger/PROJECT/jaeruay/apps/api/src/modules/auth/providers/google.ts` — ใช้ `google-auth-library` (Node) → เปลี่ยนเป็น `jose` `jwtVerify` + `createRemoteJWKSet` (Web Crypto)
- `/Users/gotroger/PROJECT/appsoom/api/src/services/google.service.js` + `controllers/auth.controller.js` — authorization-code flow ฝั่งเว็บ + signed `state` กัน CSRF (เอา flow มา, เปลี่ยน lib)
- `/Users/gotroger/PROJECT/jaeruay/apps/api/src/lib/jwt.ts` — jose EdDSA; แต่ ToolSiam ใช้ session ใน KV แทน JWT (เพิกถอนง่ายกว่า) จึงไม่จำเป็นต้อง port

---

## 6. Billing (Beam Checkout, PromptPay QR)

Flow:
1. ผู้ใช้ล็อกอิน → กด "สมัครพรีเมียม 1/3/12 เดือน" → `POST /api/billing/checkout {plan}`
2. Worker สร้าง `payments` row (status=pending, amount, plan, reference) →
   `POST https://api.beamcheckout.com/api/v1/charges` (Basic auth merchantId:apiKey)
   body: `{ amount, currency:'THB', paymentMethodType:'QR_PROMPT_PAY', qrPromptPay:{expiryTime}, referenceId, ... }`
   → บันทึก `beam_charge_id`, คืน `encodedImage` (QR base64) ให้หน้าเว็บแสดง + นับถอยหลัง 15 นาที
3. หน้าเว็บ poll `/api/billing/status?ref=` ทุก 3 วิ
4. Beam ส่ง webhook `POST /api/billing/webhook` header `x-beam-signature` (HMAC-SHA256 ของ raw body, base64) + `x-beam-event`
   → verify ด้วย `crypto.subtle` (**อ่าน raw body ก่อน parse**), idempotent ตาม charge id
   → ถ้า `charge.succeeded`: `payments.status=paid`, `subscriptions.expires_at = max(now, expires_at) + N วัน`
5. Sandbox: `https://playground.api.beamcheckout.com` ใช้ทดสอบทั้ง flow ก่อนของจริง; local dev ใช้ `cloudflared tunnel` รับ webhook

Cron (Workers Cron Trigger รายวัน — แทน scheduler ภายนอก + `x-appsoom-worker-secret` ที่ appsoom ใช้ใน `api/index.js:208`):
- กวาด `payments` ที่ `pending` เกิน 36 ชม. → `expired` (แบบ `expireStalePendingTransactions` ใน appsoom `subscription.service.js`)
- หา subscription ที่หมดอายุใน 3 วัน → ตั้ง flag แสดง banner ในเว็บ (MVP ไม่ส่งอีเมล; Phase 2 ส่งผ่าน Resend หรือ LINE Messaging API push ให้คนที่ล็อกอินด้วย LINE)
- ผู้ใช้ที่หมดอายุแล้ว → tier กลับเป็น free อัตโนมัติ (คำนวณจาก `expires_at` ตอน request ไม่ต้องแก้ row)
- ทุก job ต้อง idempotent รันซ้ำได้ (ใช้ `WHERE status='pending' AND created_at < ?` ไม่ใช่ flag แยก)

**Reference ที่ยืนยันแล้ว (port เป็นหลัก):**
- `/Users/gotroger/PROJECT/catper/apps/api/src/modules/payments/provider.ts` (601 บรรทัด) — Beam client สมบูรณ์ที่สุด พึ่งแค่ `zod` + `node:crypto`
  → บน Workers เปลี่ยน `Buffer` เป็น `btoa`/`atob` และ `createHmac`/`timingSafeEqual` เป็น `crypto.subtle` + constant-time compare เขียนเอง
  - request body จริง (บรรทัด 237–276): `{ amount (satang), currency:'THB', deviceType:'WEB', paymentMethod:{ paymentMethodType:'QR_PROMPT_PAY', qrPromptPay:{ expiryTime: ISO } }, referenceId, returnUrl }`
  - response: `actionRequired:'ENCODED_IMAGE'`, `encodedImage.imageBase64Encoded` (PNG), `encodedImage.rawData` (EMVCo payload), `encodedImage.expiry`
  - header `x-beam-idempotency-key`; retry เฉพาะ 429/5xx 3 ครั้ง; timeout 10s
  - webhook (บรรทัด 398–433): key = base64-decode(`BEAM_WEBHOOK_HMAC_SECRET`), HMAC-SHA256 raw body, เทียบกับ `X-Beam-Signature` (base64) + ตรวจ `body.merchantId` ตรงกับของเรา; event ใน `X-Beam-Event`
- `/Users/gotroger/PROJECT/catper/apps/api/src/modules/payments/service.ts` บรรทัด 594–678 — dedupe event id `beam:<type>:<id>:<status>` + sha256 payload, QR TTL 15 นาที, ตรวจหมดอายุตอน poll (Beam **ไม่ส่ง event** เมื่อ QR หมดอายุโดยไม่มีคนสแกน)
- `/Users/gotroger/PROJECT/catper/infrastructure/scripts/beam-api-check.mjs` — smoke test 91 บรรทัด ใช้ทดสอบคีย์ playground ก่อนเขียนโค้ด
- `/Users/gotroger/PROJECT/catper/docs/decisions/0003-beam-payment-provider.md`, `0006-free-pro-plan-and-pricing.md` — ADR ยืนยันว่า Beam+PromptPay = จ่ายครั้งเดียวได้ระยะเวลาคงที่ ไม่มี recurring
- `/Users/gotroger/PROJECT/appsoom/api/src/services/beam/beam.logic.js` บรรทัด 129–160 — `extractWebhookCharge` รองรับ payload หลายรูปแบบ (`data`/`charge`/`object`); และ mobile banking ต้องใช้ `deviceType` `ANDROID`/`IOS` (Beam ปฏิเสธ `WEB`) — MVP ทำ QR อย่างเดียว
- Env ตั้งชื่อตาม catper: `BEAM_API_BASE_URL`, `BEAM_MERCHANT_ID`, `BEAM_API_KEY`, `BEAM_WEBHOOK_HMAC_SECRET` (ดู `/Users/gotroger/PROJECT/catper/.env.example:108-128`)

---

## 7. Data model (D1)

```sql
users            (id, email NULL, display_name, avatar_url, created_at, last_login_at)
user_identities  (id, user_id, provider 'google'|'line', provider_uid, UNIQUE(provider, provider_uid))
subscriptions    (user_id PK, expires_at, plan_last, updated_at)          -- premium = expires_at > now
payments         (id, user_id, plan, amount_satang, status pending|paid|expired|failed,
                  beam_charge_id UNIQUE, reference_id UNIQUE, created_at, paid_at, raw_webhook_json)
favorites        (user_id, tool_slug, created_at, PK(user_id, tool_slug))
tool_history     (id, user_id, tool_slug, input_summary, created_at)      -- premium เท่านั้น
tool_stats       (tool_slug PK, uses_total, uses_7d)                      -- นับ popular (batch จาก KV รายวัน)
```
KV: `SESSION:<sid>`, `QUOTA:<yyyymmdd>:<userId|ip>:<slug>` (TTL 2 วัน), `OAUTH_STATE:<state>` (TTL 10 นาที)

---

## 8. โครงสร้างโปรเจกต์

```
ToolSiam/
├── package.json  (pnpm; astro, @astrojs/react, @astrojs/cloudflare, @astrojs/sitemap, tailwind, shadcn, jose, zod, vitest, wrangler)
├── wrangler.jsonc  (name toolsiam, main dist/_worker.js, assets, d1_databases, kv_namespaces, triggers.crons)
├── astro.config.mjs  (output: 'static' + adapter cloudflare; API routes เป็น prerender=false)
├── migrations/0001_init.sql
├── src/
│   ├── tools/registry.ts           ← single source of truth ของเครื่องมือ
│   ├── tools/<category>/<slug>/    ← Tool.tsx (React island) + logic.ts (pure, มี unit test) + meta.ts
│   ├── pages/  index.astro, tools.astro, c/[category].astro, t/[slug].astro, pricing.astro, account.astro
│   ├── pages/api/  auth/*, billing/*, usage/*, tools/*
│   ├── lib/  session.ts, db.ts, beam.ts, google.ts, line.ts, quota.ts, entitlement.ts
│   ├── components/  (shadcn ui, ToolShell, Paywall, SearchBox, CategoryGrid, AdSlot)
│   └── layouts/  Base.astro (Thai font, meta, JSON-LD)
├── worker/cron.ts                  ← scheduled handler (ผูกผ่าน Astro adapter's custom entry)
└── docs/superpowers/specs/2026-09-07-toolsiam-design.md
```

การค้นหา: client-side fuzzy search (Fuse.js) บน registry ที่ฝังในหน้า `/tools` — ไม่ต้องใช้ server

---

## 9. ลำดับการพัฒนา (แต่ละเฟส deploy ได้จริง)

| เฟส | งาน | ผลลัพธ์ |
|---|---|---|
| 0 | ตั้งค่า: โดเมน toolsiam.com เข้า Cloudflare, Workers Paid, สร้าง D1/KV, Google OAuth client, LINE Login channel (+ขอ email permission), Beam merchant + playground key, AdSense (รอ approve) | บัญชี/คีย์ครบ |
| 1 | Skeleton Astro + registry + layout + 5 tools แรก (ภาษี, ผ่อน, บาทถ้วน, QR PromptPay, JSON) + sitemap + deploy | เว็บขึ้นจริง, ทดสอบ SEO |
| 2 | Auth Google + LINE, session, หน้า account, favorites | สมัครสมาชิกได้ |
| 3 | Billing Beam QR + webhook + entitlement + quota + paywall + cron | รับเงินได้ (ทดสอบ playground → production) |
| 4 | เติมเครื่องมือให้ครบ 27 + เนื้อหา SEO ไทยทุกหน้า + AdSlot + analytics (Cloudflare Web Analytics) | พร้อม launch |
| 5 | Launch + ดู `tool_stats` เลือกทำเครื่องมือถัดไปตามความนิยม | |

แต่ละเครื่องมือ: เขียน `logic.ts` แบบ TDD (vitest) ก่อน แล้วค่อยทำ UI

---

## 10. ค่าใช้จ่ายโดยประมาณ/เดือน

| รายการ | บาท/เดือน |
|---|---|
| Cloudflare Workers Paid | ~180 |
| โดเมน .com | ~40 (จ่ายรายปี) |
| Beam PromptPay | 0% ต่อรายการ (ยืนยันกับสัญญา) |
| Google/LINE Login | 0 |
| **รวม** | **~220 บาท** → คุ้มทุนที่สมาชิก 3 คน |

---

## 11. ความเสี่ยงและวิธีรับมือ

- **PromptPay ไม่ต่ออายุอัตโนมัติ** → ขายแพ็ก 3/12 เดือน + แจ้งเตือนก่อนหมดอายุ; เพิ่มบัตรเครดิต (Beam CIT/MIT) ใน Phase 2
- **Client-side premium ถูก bypass** → ยอมรับ; ผูกคุณค่ากับฟีเจอร์ฝั่ง server (ประวัติ, batch, ไม่มีโฆษณา)
- **โควตาตาม IP (ไม่ล็อกอิน)** → ผู้ใช้หลัง NAT เดียวกันโดนโควตาร่วม; ตั้งเลขให้หลวม (3/วัน) และแนะนำสมัครฟรี
- **LINE email permission ไม่ผ่าน** → ระบบทำงานได้โดย email null; ผูกบัญชีข้าม provider ทำได้ทีหลังจากหน้า account
- **D1 คือ SQLite region เดียว** → เขียนน้อย อ่านผ่าน read replication; หน้า tool ไม่แตะ D1 เลย
- **Webhook มาก่อน/ซ้ำ** → upsert ตาม `beam_charge_id`, verify signature ก่อนทุกครั้ง, status endpoint ใช้ DB เป็น source of truth

---

## 12. Verification (end-to-end)

1. `pnpm test` — unit test ทุก `logic.ts` + `beam.ts` (signature verify กับ test vector จากเอกสาร Beam) + `quota.ts`
2. `pnpm build && wrangler dev` — เปิด `/t/thai-income-tax` ดูว่า HTML มีเนื้อหาไทยโดยไม่ต้องรัน JS (`curl | grep`), Lighthouse SEO ≥ 95
3. Auth: ล็อกอิน Google และ LINE จริงบน `wrangler dev --remote` / preview URL, ตรวจ row ใน `user_identities`
4. Billing: ใช้ Beam playground สร้าง charge, ยิง webhook ตัวอย่างพร้อม signature ที่ถูก/ผิด → ต้องต่ออายุเฉพาะกรณีถูก; ยิงซ้ำ 2 ครั้ง → ต่ออายุครั้งเดียว
5. Quota: ใช้เครื่องมือ premium เกินโควตาแบบไม่ล็อกอิน → paywall; หลังจ่าย → ผ่าน
6. Cron: `wrangler dev --test-scheduled` แล้ว `curl /__scheduled` ตรวจ flag หมดอายุ
7. Deploy production → ตรวจ `wrangler tail` ไม่มี error 1 วัน ก่อนเปิด AdSense
