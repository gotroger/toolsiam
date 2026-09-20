# คู่มือเปิดใช้ระบบสมาชิก + งานที่ค้างอยู่

วันที่: 19 กันยายน 2569 · คู่กับ [ดีไซน์](2026-09-19-membership-premium-design.md)

## สถานะ ณ 20 กันยายน 2569

| ขั้น                        | สถานะ                                                                              |
| --------------------------- | ---------------------------------------------------------------------------------- |
| B — merge + deploy          | ✅ เสร็จ                                                                           |
| C — ล็อกอิน Google          | ✅ **เปิดใช้จริงแล้ว** ปุ่มเข้าสู่ระบบขึ้นทุกหน้า                                  |
| D ข้อ 1–6 — Beam playground | ✅ ผ่านครบวง (ดู "ผลทดสอบ playground" ด้านล่าง)                                    |
| D ข้อ 7 — รับเงินจริง       | ⏳ รอ Beam อนุมัติ merchant ใหม่ของ ToolSiam (สมัครแล้ว 20 ก.ย. ตรวจ 1–3 วันทำการ) |

ระหว่างรอ ระบบชำระเงิน **ปิด** (`BEAM_MERCHANT_ID` ว่าง) — กดสมัครจะขึ้น "ระบบชำระเงินยังไม่เปิดให้บริการในขณะนี้"

### เปิดรับเงินจริงเมื่อ Beam อนุมัติ

1. Lighthouse ตัวจริง → นักพัฒนา → สร้าง API Key + Webhook Endpoint
   `https://toolsiam.com/api/billing/webhook` (event `charge.succeeded`)
2. `npx wrangler secret put BEAM_API_KEY` และ `BEAM_WEBHOOK_HMAC_SECRET` **ทับ** ค่าของ playground ที่ค้างอยู่
3. `wrangler.jsonc`: `BEAM_API_BASE_URL` → `https://api.beamcheckout.com` · `BEAM_MERCHANT_ID` → id ใหม่ → push
4. ซื้อจริง 19 บาทหนึ่งครั้ง → `/account` ต้องเป็นพรีเมียม · ดู `npx wrangler tail` ว่า webhook ตอบ 200
5. ลบ API key `toolsiam-test` กับ webhook endpoint ของ toolsiam ใน **playground ของ Catper**

### สิ่งที่รู้เพิ่มระหว่างเปิดใช้ (ไม่มีในแผนเดิม)

- **`/api/*` ต้องมี `run_worker_first`** — ชั้น assets ของ Cloudflare ตอบหน้า 404 ให้ request ที่เป็น
  navigation (`Sec-Fetch-Mode: navigate`) โดยไม่เรียก Worker · `curl` กับ `fetch()` ไม่โดน จึงต้องทดสอบ
  endpoint ที่ผู้ใช้ "เปิดเป็นหน้า" ด้วย `curl -H 'Sec-Fetch-Mode: navigate'` เสมอ
- **GCP ครบโควตาโปรเจกต์** — OAuth client อยู่ในโปรเจกต์เดิม `gen-lang-client-0298477351` ที่เปลี่ยนชื่อเป็น ToolSiam
  ไม่ใส่โลโก้ใน consent screen เพราะจะถูกบังคับยื่น verification
- **Beam ไม่ให้ใช้ merchant ร่วมกันข้ามเว็บ** — ต้องสมัครร้านค้าใหม่ด้วยอีเมลใหม่ต่อหนึ่งธุรกิจ
- **token ของ CI** คือ User API Token ชื่อ "Edit Cloudflare Workers" เพิ่ม `Account · D1 · Edit` แล้ว

### ผลทดสอบ playground

เทียบ `src/lib/membership/beam.ts` กับ docs.beamcheckout.com แล้ว **ตรงทุก field ไม่ต้องแก้** และยืนยันด้วยรายการจริง:
สร้าง charge ได้ `chargeId` + `encodedImage.{imageBase64Encoded,rawData}` · webhook `charge.succeeded` มาพร้อม
`x-beam-signature`/`x-beam-event` ลายเซ็นผ่าน · payload แบน (`chargeId` `referenceId` `status` `merchantId` `amount` อยู่ชั้นบนสุด
amount เป็นสตางค์) · `payments` → `paid` · `subscriptions` +30 วัน

ใน playground ค่า `rawData` ของ QR คือ URL หน้า **Force Charge** (`…/charges/<id>/force`) — เปิดแล้วกด
Mark as Succeeded แทนการจ่ายเงิน · playground สมัครเองได้ที่ `playground-lighthouse.beamcheckout.com`

**ยังไม่ได้ยืนยันกับ API จริง:** รูปร่าง response ของ `GET /api/v1/charges/{id}` ที่ทางสำรองใช้ (เอกสารบอกแค่ว่ามี `status`)
โค้ดจึงอ่านแบบยอมให้ `referenceId`/`amount` หายได้ — เช็ก log `[membership] ให้สิทธิ์จากการถาม Beam เอง` เมื่อเกิดขึ้นครั้งแรก

---

เอกสารด้านล่างคือแผนเดิม เก็บไว้เป็นลำดับอ้างอิงและวิธีถอยกลับ

`isEnabled()` (ล็อกอิน) กับ `isBillingEnabled()` (ชำระเงิน) ใน `src/lib/membership/env.ts`
**แยกจากกัน** จึงเปิดได้ทีละขั้น และถอยกลับได้ด้วยการแก้ var ตัวเดียวโดยไม่ต้อง deploy ใหม่

## ขั้น B — merge + deploy (ผู้ใช้ไม่เห็นความเปลี่ยนแปลง)

merge เข้า `main` → CI deploy โดย `MEMBERSHIP=off` และไม่มี `PUBLIC_MEMBERSHIP`
→ HTML ไม่มีปุ่มเข้าสู่ระบบ API ทุกเส้นตอบ 204

ต้องทำก่อนตั้ง Google OAuth เพราะ consent screen บังคับให้กรอก URL ที่เปิดได้จริง
(`/privacy`, `/terms`) และ `/premium` จะได้เริ่มเก็บ SEO ล่วงหน้า

ตรวจหลัง deploy:

| ตรวจ                                   | ต้องได้                          |
| -------------------------------------- | -------------------------------- |
| `https://toolsiam.com/tools/pdf-merge` | ไม่มีคำว่า "เข้าสู่ระบบ" ใน HTML |
| `curl -I https://toolsiam.com/api/me`  | 204 (ไม่ใช่ 500)                 |
| `/premium` `/privacy` `/terms`         | 200                              |
| `/pricing`                             | 301 → `/premium`                 |
| `npx wrangler tail`                    | ไม่มี error ต่อเนื่อง            |

## ขั้น C — เปิดเฉพาะล็อกอิน (ยังไม่รับเงิน)

1. `npx wrangler d1 create toolsiam` → ได้ `database_id`
2. `npx wrangler kv namespace create MEMBER_SESSION` → ได้ `id`
3. **ปลด comment บล็อก binding ใน `wrangler.jsonc` แล้วใส่ id จริงทั้งสองตัว** —
   ก่อนหน้านี้ถูก comment ไว้โดยตั้งใจ เพราะ `wrangler deploy` ตรวจ id กับ API จริงตอนอัปโหลด
   ใส่ค่าปลอมแล้ว **deploy ของทั้งเว็บพัง** ไม่ใช่แค่ระบบสมาชิก
4. API token ของ CI เพิ่มสิทธิ์ **D1:Edit** (ไม่งั้น step migration จะ 403)
5. Google Cloud → OAuth consent screen (External; homepage, `/privacy`, `/terms`;
   scope `openid email profile` เป็น non-sensitive ไม่ต้องยื่น verification)
   → Web client → redirect URI ทั้ง 4 เส้น (apex, www, `localhost:4321`, `localhost:8787`)
6. `GOOGLE_CLIENT_ID` ใน vars · `npx wrangler secret put GOOGLE_CLIENT_SECRET`
7. ตั้ง `MEMBERSHIP: "on"` + repository variable `PUBLIC_MEMBERSHIP=on` → deploy

ผลลัพธ์: ล็อกอินได้ `/account` แสดงโปรไฟล์ แต่ปุ่มซื้อจะขึ้นว่าระบบชำระเงินยังไม่เปิด (204)

ทดสอบ: ล็อกอินด้วยบัญชีตัวเอง → `npx wrangler d1 execute toolsiam --remote --command "SELECT * FROM users"`
ต้องเห็น 1 แถว · ออกจากระบบแล้วเมนูบัญชีหายและ cookie ถูกลบ · ตั้ง `MEMBERSHIP=off` แล้วเว็บกลับเหมือนเดิมทันที

## ขั้น D — Beam playground ก่อน production

**ความเสี่ยงอันดับหนึ่งที่เหลืออยู่:** ชื่อ field ใน `src/lib/membership/beam.ts`
(`encodedImage.imageBase64Encoded`, `chargeId`, header `x-beam-signature`) อ้างจากโปรเจกต์ข้างเคียง
ผ่าน spec เดิม §6 **ไม่ได้อ่านจากเอกสาร Beam โดยตรง** → ต้อง smoke test playground ก่อนเชื่อ

1. สมัคร Beam merchant → ขอ playground key + HMAC secret
2. ยิง smoke test สร้าง charge จริงหนึ่งครั้ง เทียบ field กับโค้ด แก้ให้ตรงก่อนไปต่อ
3. `BEAM_API_BASE_URL` (playground), `BEAM_MERCHANT_ID` ใน vars ·
   `wrangler secret put BEAM_API_KEY` และ `BEAM_WEBHOOK_HMAC_SECRET`
4. ตั้ง webhook ที่ Beam → `https://toolsiam.com/api/billing/webhook`
5. ทดสอบครบวง: กดซื้อ → QR ขึ้น → จ่าย → `/account` เป็นพรีเมียมภายใน 3 วินาที →
   `/tools/pdf-merge` รับไฟล์ 20 MB ได้ · ยิง webhook ซ้ำ วันต้องไม่เพิ่ม · ลายเซ็นผิดต้อง 401
6. ปล่อย QR ทิ้ง 15 นาที → ต้องขึ้น "QR หมดอายุแล้ว" และสร้างใหม่ได้
7. ผ่านครบ → สลับ `BEAM_API_BASE_URL` เป็น production + rotate key/secret → ซื้อจริง 19 บาทหนึ่งครั้ง

## งานที่ตั้งใจเว้นไว้

| #   | งาน                                                                 | เมื่อไรถึงควรทำ                                                                                                                                                                            |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| C1  | ซ่อนปุ่มซื้อเมื่อ billing ยังไม่เปิด (`/api/me` ส่ง `billingReady`) | ก่อนขั้น C ถ้าเว้นช่วงจาก Beam นาน                                                                                                                                                         |
| C2  | ~~`scripts/beam-check.mjs`~~ ไม่ต้องทำแล้ว — ยืนยันด้วยรายการจริง   | —                                                                                                                                                                                          |
| C3  | แพ็ก 3/12 เดือน                                                     | ทันทีที่เห็นว่าคนไม่กลับมาต่ออายุ                                                                                                                                                          |
| C5  | ปุ่มลบบัญชีในหน้าบัญชี                                              | เมื่อมีคนขอลบเกิน 2–3 ราย                                                                                                                                                                  |
| C6  | rate limit start/checkout ด้วย KV                                   | เมื่อเห็น row ขยะใน `payments`                                                                                                                                                             |
| F   | ตัวนับการใช้งานเครื่องมือ                                           | ทำตาม [spec](2026-09-10-usage-counter-design.md) แต่ใช้ `DB` ตัวเดิมเป็น migration `0002_usage_daily.sql` แทนการสร้าง D1 แยก และใช้ `isTrustedOrigin()` จาก `src/lib/membership/guards.ts` |

## ข้อกังวลเชิงธุรกิจ (ไม่ใช่บั๊ก)

**19 บาท/เดือน + PromptPay ที่ต่ออัตโนมัติไม่ได้** = ผู้ใช้ต้องจำมาสแกนใหม่ทุก 30 วันเพื่อเงิน 19 บาท
แรงเสียดทานต่อมูลค่าสูงมาก ทางแก้ที่ถูกที่สุดคือ C3 ขายแพ็กยาว เช่น 1 เดือน 19 · 3 เดือน 49 · 12 เดือน 169
โครงข้อมูลรองรับแล้ว (`extendExpiry` บวกวันเท่าไรก็ได้) แก้แค่ `PREMIUM_DAYS` → ตาราง plan + ปุ่มเลือกแพ็ก

**ขีดจำกัดไฟล์เป็นเหตุผลจ่ายเงินที่เจอนาน ๆ ครั้ง** คนที่ชน 15 MB ปีละครั้งจะไม่สมัคร
ควรมีฟีเจอร์พรีเมียมตัวที่สองที่ใช้ทุกวัน — ตัวนับการใช้งาน (F) คือข้อมูลชิ้นเดียวที่จะบอกว่าควรเป็นตัวไหน

## บันทึก: ประเมิน VPS สำหรับเครื่องมือพรีเมียมฝั่งเซิร์ฟเวอร์

พิจารณาเครื่อง **500 บาท/เดือน — 3 Core, 8 GB RAM, 200 GB SSD**
สรุป: **พอสำหรับเริ่ม ถ้าทำ 2–3 เครื่องมือแรกและมีคิว** ไม่พอถ้าจะทำทุกตัวในโรดแมป

| งาน                                       | RAM ต่องาน (ประมาณ)      | รับไหว?                 |
| ----------------------------------------- | ------------------------ | ----------------------- |
| PDF → JPG (poppler), HEIC → JPG (libheif) | ~200 MB                  | สบาย                    |
| บีบอัด PDF (ghostscript)                  | ~300–500 MB              | สบาย                    |
| Word/Excel → PDF (LibreOffice headless)   | ~400–600 MB ต่อ instance | ได้ ถ้าจำกัด 2 instance |
| OCR ไทย (Tesseract)                       | ~300–600 MB              | ได้                     |
| OCR ไทย (PaddleOCR/neural)                | ~1.5–2 GB                | ได้ 2 งานพร้อมกัน       |
| ลบพื้นหลัง (rembg/U²-Net)                 | ~1–2 GB                  | ได้ 2 งานพร้อมกัน       |
| เพิ่มความละเอียด / ลบวัตถุด้วย AI         | ต้อง GPU                 | **ไม่ไหว**              |

งบ RAM: OS + app ~1 GB เหลือ ~7 GB → concurrency 2–3 งานพอดี ·
CPU 3 core ที่งานเฉลี่ย 10 วินาที ≈ 500–700 งาน/ชม. เกินพอสำหรับสมาชิกหลักร้อยคน ·
SSD 200 GB เกินความจำเป็นเพราะไฟล์เป็นของชั่วคราว

**ความเสี่ยงจริงไม่ใช่ค่าเฉลี่ยแต่เป็นงานเดี่ยวที่ยาว** — OCR PDF สแกน 300 หน้ากินคอร์เดียว 15–20 นาที
สามงานพร้อมกันคือเครื่องตัน จึงต้องมีตั้งแต่วันแรก: คิวจำกัด concurrency · เพดานจำนวนหน้าต่องาน ·
โควตาต่อเดือนต่อสมาชิก · timeout ต่องาน

**กระทบธุรกิจ:** จุดคุ้มทุนขยับจาก ~10 คน เป็น ~36 คน (Workers 180 + VPS 500 = 680 ÷ 19)
ตัวเลขข้างบนเป็นการประมาณจากลักษณะงาน **ยังไม่ได้ benchmark บนเครื่องจริง** —
ควรเช่าเดือนแรกแล้ววัด OCR ไทยด้วยไฟล์จริงก่อนผูกยาว
