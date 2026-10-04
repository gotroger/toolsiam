# รายการโปรด — ดีไซน์

วันที่: 4 ตุลาคม 2569 · ต่อจาก [spec เดิม §3, §7, §9 เฟส 2](2026-09-07-toolsiam-design.md) และ [ระบบสมาชิก](2026-09-19-membership-premium-design.md)

## เป้าหมาย

ให้คนที่กลับมาใช้เครื่องมือเดิมซ้ำเปิดได้เร็วขึ้น และเป็นเหตุผลให้ล็อกอินที่ไม่ต้องจ่ายเงิน
(spec เดิม: สมาชิกฟรีได้รายการโปรด) — LINE Login ตัดออกจากแผนแล้ว (4 ต.ค. 2569) รายการโปรดจึงผูกกับบัญชี Google อย่างเดียว

## การตัดสินใจ

| ประเด็น           | ข้อสรุป                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| ใครใช้ได้         | ต้องล็อกอิน (ฟรี) — ไม่เก็บใน localStorage ของคนที่ไม่ล็อกอิน จึงไม่มีเรื่องรวมข้อมูลสองที่                                    |
| เก็บที่ไหน        | D1 `favorites (user_id, tool_slug, created_at)` migration `0004_favorites.sql`                                                 |
| slug ที่รับ       | เฉพาะเครื่องมือที่ยังแสดงอยู่ (`getVisibleTools()`) — ไม่ต้องมีเพดานจำนวน เพราะมีได้ไม่เกินจำนวนเครื่องมือ                     |
| เครื่องมือ hidden | ไม่มีปุ่มดาว และไม่แสดงในรายการแม้ยังค้างอยู่ในบัญชี                                                                           |
| API               | `GET /api/favorites` → `{slugs}` · `POST /api/favorites` `{slug, favorite}` → `{slugs}` ชุดเต็ม · ระบบปิด 204 · ไม่ล็อกอิน 401 |
| ด่านตรวจ          | ชุดเดียวกับ API สมาชิก: kill switch `MEMBERSHIP`, Origin (POST), body ≤ 200 ไบต์, `Cache-Control: private, no-store`           |

## หน้าตา

- **หน้าเครื่องมือ** ปุ่ม `☆ รายการโปรด` ข้างชิปหมวด (`FavoriteButton`, `client:idle`) — HTML มีตัวจองที่ล่องหนขนาดเท่าปุ่ม
  ไม่ล็อกอิน = ลิงก์เข้าสู่ระบบที่กลับมาพร้อม `?favorite=add` แล้วบันทึกให้ทันที · ล็อกอิน = ปุ่มสลับ `aria-pressed`
  กดแล้วเปลี่ยนทันที (optimistic) ใช้ชุดที่ server ตอบเป็นค่าจริง พลาดเมื่อไรคืนค่าเดิมพร้อมข้อความ
- **หน้าบัญชี** ส่วน "รายการโปรด" (`#favorites`) ลิงก์ไปเครื่องมือ + ปุ่มนำออก · เมนูบัญชีใน Header มีลิงก์ตรง
- **หน้า /tools และหน้าหมวด** ชิป `★ รายการโปรด` (เฉพาะเมื่อล็อกอินและมีอย่างน้อยหนึ่งตัว) จำใน URL เป็น `?category=favorites`
  การ์ดที่อยู่ในรายการโปรดมีดาวเล็ก ๆ
- หน้าแรกไม่เปลี่ยน — `ToolSearch` โหมด command ไม่เรียก `/api/me`, `/api/favorites` หรือ `/api/usage`

ไม่มีปุ่มดาวเมื่อ build โดยไม่มี `PUBLIC_MEMBERSHIP=on`

## ไฟล์

`src/lib/favorites-client.ts` (store) · `src/components/favorites/{FavoriteButton,FavoritesList}.tsx` ·
`src/lib/membership/handlers.ts` (`handleFavoritesGet/Post`) · `src/lib/membership/store.ts` · `src/pages/api/favorites.ts`

## ทดสอบในเครื่อง

`npx wrangler dev` ของเว็บนี้ **เขียน Origin ใหม่เป็น `http://toolsiam.com`** ตาม `routes` ทำให้ POST ทุกเส้น (รวม logout) ได้ 403
ใช้ `npx wrangler dev --local-upstream localhost:8787` แทน · จำลองการล็อกอินได้โดยใส่แถวใน `users` ของ D1 local
และ key `SESSION:<sid>` ใน KV local (`wrangler kv key put --local --binding MEMBER_SESSION`) แล้วตั้ง cookie `sid`/`ts_m`
(ต้องมี `.dev.vars` ที่มี `GOOGLE_CLIENT_SECRET` ค่าใดก็ได้ ไม่งั้น `isEnabled()` เป็น false)
