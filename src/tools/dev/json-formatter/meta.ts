import type { ToolMeta } from '@/tools/types';

export const jsonFormatterMeta: ToolMeta = {
  slug: 'json-formatter',
  name: 'JSON Formatter จัดรูปแบบ ตรวจสอบ ย่อ JSON',
  nameEn: 'JSON Formatter & Validator',
  // ปลดระวางเชิง SEO (§18): URL ยัง 200 แต่ไม่สังกัดหมวด ไม่แสดงในรายการ และไม่ถูก index
  // เงื่อนไขพลิกกลับ: ถ้ามีเครื่องมือกลุ่มนักพัฒนาจริง ≥ 3 ตัว ค่อยเพิ่มหมวดกลับและถอด flag ทั้งสาม
  category: null,
  retired: true,
  hidden: true,
  noindex: true,
  description:
    'จัดรูปแบบ JSON ให้อ่านง่าย (pretty print) ตรวจสอบความถูกต้องพร้อมบอกตำแหน่งบรรทัดที่ผิด และย่อ JSON (minify) ทำงานในเบราว์เซอร์ ข้อมูลไม่ถูกส่งออกไปไหน',
  keywords: ['json formatter', 'จัดรูปแบบ json', 'ตรวจสอบ json', 'json validator', 'json minify', 'pretty print'],
  howTo: [
    'วาง JSON ลงในช่องด้านซ้าย',
    'กด "จัดรูปแบบ" หรือ "ย่อ" ผลลัพธ์แสดงด้านขวา',
    'ถ้า JSON ผิด ระบบบอกบรรทัดและคอลัมน์ที่ผิด แก้แล้วกดใหม่',
  ],
  faq: [
    { q: 'ข้อมูลของฉันปลอดภัยไหม', a: 'ปลอดภัย การประมวลผลทั้งหมดเกิดในเบราว์เซอร์ของคุณ ไม่มีการส่ง JSON ไปยังเซิร์ฟเวอร์' },
    { q: 'รองรับไฟล์ใหญ่แค่ไหน', a: 'ขึ้นกับหน่วยความจำของเครื่อง โดยทั่วไปหลายสิบ MB ยังใช้ได้ ถ้าช้าให้ลองย่อก่อน' },
    { q: 'ทำไม JSON ที่มี comment หรือ trailing comma ถึงผิด', a: 'มาตรฐาน JSON ไม่อนุญาตให้มี comment และคอมมาท้ายรายการ ต้องลบออกก่อน (ต่างจาก JSON5)' },
  ],
};
