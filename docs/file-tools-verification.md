# ผลตรวจเครื่องมือไฟล์ — 9 กันยายน 2026

## ผลที่ผ่าน

- `npm test`: 764 tests / 74 files ผ่าน; หลังปรับชนิดข้อมูลใน test mock รัน lifecycle tests 3 ข้อซ้ำผ่าน
- `npm run lint`: ผ่าน
- `npm run typecheck`: ผ่าน
- `npm run build`: ผ่าน สร้างหน้าใหม่ 12 เครื่องมือและ 2 หมวด
- `npm run size`: ผ่านงบเดิม JS หน้าเครื่องมือ p95 93 KB, สูงสุด 121.6 KB gzip; ไม่นับ engine ที่โหลดหลังเริ่มแปลง
- Prettier เฉพาะไฟล์ที่เพิ่ม/แก้: ผ่าน; `git diff --check`: ผ่าน
- ทดสอบ production build ผ่าน HTTP local ใน Chromium: แปลงและดาวน์โหลดครบทั้ง 12 เครื่องมือ
- อ่านไฟล์ดาวน์โหลดกลับด้วย PDFDocument และ ExcelJS: ลำดับหน้ารวม PDF ถูกต้อง, PDF รูปภาพเป็น A4 สองหน้า, XLSX เก็บ 001 และข้อความ =1+1 โดยไม่ประเมินสูตร, TXT มีข้อความไทยจาก DOCX
- ทดสอบ UI ไม่มีไฟล์, PDF เสียหาย, เลขหน้าเกินจริง, แก้ค่าแล้วลองใหม่, เลือกชนิดรูปด้วยคีย์บอร์ด และ PDF แบบ offline หลัง engine อยู่ใน cache
- ทดสอบผลภาพ: resize 400×200 เป็น 100×50; rotate 90 องศาเป็น 200×400; JPG, WebP และ PNG ดาวน์โหลดได้
- Mobile 390×844 ทั้ง light/dark และ reduced motion: ไม่มี horizontal overflow; เทียบกับหน้า word-count เดิมและหน้าหมวดเอกสาร desktop
- axe-core WCAG 2 A/AA และ 2.1 AA บน main ของหน้าปรับขนาดรูปในสถานะมีผลลัพธ์: 0 violations; ไม่ใช่การรับรอง accessibility ทั้งเว็บ
- Lifecycle tests ครอบคลุม cancel/terminate, ผลลัพธ์เก่าหลังยกเลิก, retry, invalidation/revoke object URL, เก็บไฟล์เมื่อผิดพลาด และ unmount cleanup

## ข้อสังเกตของเครื่องมือตรวจทั้งโปรเจกต์

`npm run format:check` พบ 150 ไฟล์เดิมที่ไม่ตรง Prettier; ไฟล์ในขอบเขตการแก้ไขผ่านการตรวจแยกแล้ว

Premium static audit รายงาน 14 รายการในไฟล์เดิม: test fixture buttons/forms, Button ที่รับ handlers ผ่าน props และ Textarea ที่ใช้ shared component ซึ่งกำหนด resize-none อยู่แล้ว; ไม่มีรายการในเครื่องมือไฟล์ชุดใหม่ จึงเก็บผล audit ไว้และไม่เปลี่ยน unrelated UI เพื่อให้ผ่าน heuristic

`npm audit` หลังเพิ่ม dependency เหลือ 5 high findings ในสาย dependency Cloudflare/miniflare/sharp ที่มีอยู่เดิม; ไม่มี findings ของ dependency ตัวแปลงไฟล์ใหม่ ใช้ override uuid ^11.1.1 เฉพาะ ExcelJS และตรวจการอ่าน/เขียน XLSX จริงแล้ว

## หลักฐาน local

Logs, browser scripts, fixtures, downloads และ screenshots อยู่ใน `output/playwright/file-tools/` และ `output/file-tools-*.log`; audit JSON อยู่ที่ `output/file-tools-premium-audit.json` (output เป็น QA artifacts ที่ไม่ commit)

ยังไม่ได้ deploy ขึ้น production; ไฟล์ทั้งหมดพร้อมอยู่ใน working tree และ build สำเร็จ
