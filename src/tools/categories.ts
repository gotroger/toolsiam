import type { CategoryMeta } from './types';

export const categories: CategoryMeta[] = [
  { id: 'finance', name: 'การเงินและภาษี', nameEn: 'Finance & Tax', description: 'คำนวณภาษี ค่างวด ดอกเบี้ย เงินเดือนสุทธิ', icon: '💰' },
  { id: 'text', name: 'ข้อความภาษาไทย', nameEn: 'Thai Text', description: 'บาทถ้วน นับคำ แปลงเลขไทย จัดการข้อความ', icon: '🔤' },
  { id: 'date', name: 'วันที่และเวลา', nameEn: 'Date & Time', description: 'คำนวณอายุ นับวัน แปลง พ.ศ./ค.ศ. วันหยุด', icon: '📅' },
  { id: 'qr', name: 'QR และ PromptPay', nameEn: 'QR & PromptPay', description: 'สร้าง QR รับเงิน PromptPay, WiFi, vCard', icon: '🔳' },
  { id: 'image', name: 'รูปภาพ', nameEn: 'Image', description: 'ย่อ บีบอัด แปลงไฟล์ ลบ EXIF', icon: '🖼️' },
  { id: 'pdf', name: 'PDF', nameEn: 'PDF', description: 'รวม แยก หมุน แปลงรูปเป็น PDF', icon: '📄' },
  { id: 'dev', name: 'นักพัฒนา', nameEn: 'Developer', description: 'JSON, Base64, UUID, hash, regex', icon: '💻' },
  { id: 'web', name: 'เว็บและ SEO', nameEn: 'Web & SEO', description: 'Meta tag, Open Graph, UTM, slug', icon: '🌐' },
];
