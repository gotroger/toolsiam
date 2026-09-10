import type { CategoryMeta } from './types';
import { getDreamUrl, getHoroscopeUrl, getLotteryUrl } from '@/lib/routes';

/**
 * หมวดทั้งหมด (§8) — เรียงตาม order
 *
 * 1–7  หมวดเครื่องคำนวณ มีหน้า /categories/<id>
 * 8–10 vertical มี landingPath เป็นบ้านหลัก จึงไม่สร้างหน้า /categories/<id>
 *
 * status 'planned' = ยังไม่มีเครื่องมือจริง → ไม่ build ไม่แสดง ไม่ index
 * (registry.test.ts บังคับว่าหมวด active ที่ไม่มี landingPath ต้องมีเครื่องมือ ≥ 1)
 */
export const categories: CategoryMeta[] = [
  {
    id: 'finance',
    order: 1,
    status: 'active',
    gradient: ['#ecfdf5', '#a7f3d0'],
    name: 'การเงิน ภาษี และเงินเดือน',
    nameEn: 'Finance, Tax & Salary',
    description: 'คำนวณภาษีเงินได้ เงินเดือนสุทธิ ประกันสังคม OT และดอกเบี้ยเงินออม',
  },
  {
    id: 'loan',
    order: 2,
    status: 'active',
    gradient: ['#eff6ff', '#bfdbfe'],
    name: 'หนี้ สินเชื่อ และการผ่อน',
    nameEn: 'Loans & Debt',
    description: 'คำนวณค่างวด ดอกเบี้ยลดต้นลดดอก ผ่อนบ้าน ผ่อนรถ และหนี้บัตรเครดิต',
  },
  {
    id: 'business',
    order: 3,
    status: 'active',
    gradient: ['#fff7ed', '#fed7aa'],
    name: 'ค้าขายและธุรกิจ',
    nameEn: 'Business & Commerce',
    description: 'คำนวณกำไร ราคาขาย ต้นทุนร้านค้า VAT ภาษีหัก ณ ที่จ่าย และบาทถ้วน',
  },
  {
    id: 'land',
    order: 4,
    status: 'active',
    gradient: ['#f7fee7', '#d9f99d'],
    name: 'ที่ดินและอสังหาฯ',
    nameEn: 'Land & Property',
    description: 'แปลงหน่วยที่ดิน ไร่ งาน ตารางวา และคำนวณราคาที่ดิน',
  },
  {
    id: 'date',
    order: 5,
    status: 'active',
    gradient: ['#eef2ff', '#c7d2fe'],
    name: 'วัน เวลา และปฏิทิน',
    nameEn: 'Date & Time',
    description: 'คำนวณอายุ นับวันระหว่างวันที่ แปลง พ.ศ./ค.ศ. และวันหยุดราชการ',
  },
  {
    id: 'daily',
    order: 6,
    status: 'active',
    gradient: ['#fef2f2', '#fecaca'],
    name: 'ชีวิตประจำวันและภาษาไทย',
    nameEn: 'Daily Life & Thai Language',
    description: 'ค่าไฟ ค่าน้ำมัน นับคำ แปลงเลขไทย ตรวจเลขบัตรประชาชน และจัดการข้อความ',
  },
  {
    id: 'qr',
    order: 7,
    status: 'active',
    gradient: ['#f8fafc', '#cbd5e1'],
    name: 'QR และ PromptPay',
    nameEn: 'QR & PromptPay',
    description: 'สร้าง QR รับเงิน PromptPay, WiFi, vCard และอ่าน QR จากรูปภาพ',
  },

  {
    id: 'documents',
    order: 11,
    status: 'active',
    gradient: ['#eff6ff', '#bfdbfe'],
    name: 'เอกสารและแปลงไฟล์',
    nameEn: 'Documents & File Conversion',
    description: 'รวม แยก หมุน PDF แปลงรูปเป็น PDF แปลง Excel CSV และดึงข้อความจาก Word',
  },
  {
    id: 'images',
    order: 12,
    status: 'active',
    gradient: ['#f0fdfa', '#99f6e4'],
    name: 'รูปภาพ',
    nameEn: 'Image Tools',
    description: 'ลดขนาดรูป ปรับขนาด แปลง JPG PNG WebP และหมุนหรือกลับด้านภาพ',
  },

  /* --- vertical: มีบ้านหลักของตัวเอง ไม่มีหน้า /categories/ --- */
  {
    id: 'lottery',
    order: 8,
    status: 'active',
    gradient: ['#fefce8', '#fde68a'],
    name: 'หวยและสลาก',
    nameEn: 'Thai Lottery',
    description: 'ตรวจสลากกินแบ่งรัฐบาล ผลรางวัลงวดล่าสุด และผลย้อนหลัง',
    landingPath: getLotteryUrl(),
  },
  {
    id: 'dream',
    order: 9,
    status: 'active',
    gradient: ['#faf5ff', '#e9d5ff'],
    name: 'ทำนายฝัน',
    nameEn: 'Dream Meanings',
    description: 'ความหมายของความฝันตามความเชื่อไทย',
    landingPath: getDreamUrl(),
  },
  {
    id: 'horoscope',
    order: 10,
    status: 'active',
    gradient: ['#fdf2f8', '#fbcfe8'],
    name: 'ดูดวงและความเชื่อ',
    nameEn: 'Horoscope & Beliefs',
    description: 'ราศี ปีนักษัตร สีมงคล เลขศาสตร์ และดวงรายวัน',
    landingPath: getHoroscopeUrl(),
  },
];
