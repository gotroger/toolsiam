# Worker ดึงผลหวยอัตโนมัติ (Phase 4B)

Worker ตัวนี้ตื่นตามเวลาที่ตั้งไว้ ดึงผลงวดใหม่จาก API ของสำนักงานสลากกินแบ่งรัฐบาล
ตรวจความถูกต้อง แล้วเขียนลง KV ให้เว็บอ่านผ่าน `GET /api/lottery/latest`

**ตอนนี้ยังไม่ได้เปิดใช้งาน** — ต้องสร้าง KV namespace ก่อน (ขั้นตอนด้านล่าง)
ระหว่างนี้เว็บทำงานได้ครบถ้วนด้วยข้อมูล static เหมือนเดิมทุกประการ

## ทำไมต้องเป็น Worker แยก

1. Cloudflare cron trigger ต้องการ `scheduled` handler ซึ่ง entrypoint ของ Astro ไม่มี
2. แยกกันแล้ว cron ที่มีปัญหาไม่กระทบเว็บเลย — เว็บอ่าน KV อย่างเดียว ไม่เคยเขียน

## ขั้นตอนเปิดใช้งาน

```bash
# 1. สร้าง KV namespace (ทำครั้งเดียว) แล้วจดค่า id ที่ได้
npx wrangler kv namespace create LOTTERY

# 2. ใส่ id ที่ได้ลงในสองที่ ต้องเป็น namespace เดียวกัน ไม่ใช่คนละอัน
#    - workers/lottery-cron/wrangler.jsonc   (ตัวเขียน)
#    - wrangler.jsonc ของเว็บ                (ตัวอ่าน — ปลด comment บล็อก kv_namespaces)

# 3. ตั้ง secret สำหรับสั่งรันเองตอนตรวจสอบ (ไม่ตั้ง = ปิด endpoint /run ไว้)
npx wrangler secret put TRIGGER_SECRET -c workers/lottery-cron/wrangler.jsonc

# 4. deploy ทั้งสองตัว
npm run deploy
npm run deploy:cron
```

## ตรวจสอบว่าทำงาน

```bash
# สั่งรันเองโดยไม่ต้องรอ cron
curl -H "x-trigger-secret: <SECRET>" https://toolsiam-lottery-cron.<subdomain>.workers.dev/run

# ดูว่าเว็บเห็นข้อมูลหรือยัง — 204 คือยังไม่มีอะไรใหม่กว่าไฟล์ static
curl -i https://toolsiam.com/api/lottery/latest
```

ทดสอบในเครื่องได้ด้วย `npx wrangler dev -c workers/lottery-cron/wrangler.jsonc --test-scheduled`
แล้วเรียก `http://localhost:8787/__scheduled`

## ตารางเวลา

ผลสลากประกาศช่วงบ่ายของวันที่ 1 และ 16 (เวลาไทย) และ **ทยอยออกทีละรางวัล**
ยิงครั้งเดียวจะได้ข้อมูลไม่ครบแน่นอน จึงกระจายเป็น 9 ช่วงในหน้าต่าง 14:30–20:30 ICT

ทุกครั้งที่ตื่นจะอ่าน KV ก่อน ถ้างวดปัจจุบันเก็บไว้แล้วจะจบทันทีโดยไม่ยิงออกนอก
จำนวนครั้งที่ยิงจริงจึงน้อยกว่า 9 มาก

## กฎที่บังคับไว้ในโค้ด

| กฎ | ที่มา | บังคับที่ไหน |
|---|---|---|
| ข้อมูลที่ดึงเองเป็น `validated` เท่านั้น ห้ามเป็น `verified` | L1 | `syncLatestDraw` ส่ง status ตายตัว · `toDraw` บังคับให้ผู้เรียกระบุ status เอง |
| ไฟล์ JSON ใน repo ชนะ KV เมื่องวดเดียวกัน | L3 | `shouldPreferRemote` ฝั่ง client |
| ระบบ manual ยังเป็น production fallback ได้ | L4 | เว็บ render จาก static เสมอ · KV เป็นชั้นเสริมล้วน |
| ข้อมูลค้างต้องเตือน ไม่ใช่แสดงงวดเก่าเงียบ ๆ | L5 | `isStale` + `LiveDrawNotice` |
| ข้อมูลที่ไม่ผ่าน validator ไม่เขียนทับของเดิม | §28.2 | `syncLatestDraw` คืน `rejected` โดยไม่เรียก `put` |

## ปิดฉุกเฉิน

ตั้ง `LOTTERY_AUTO` เป็นค่าอื่นที่ไม่ใช่ `"on"` แล้ว deploy ใหม่
Worker จะไม่ดึงข้อมูล และ `/api/lottery/latest` จะตอบ 204 — เว็บกลับไปใช้ static ล้วนทันที
