import type { CategoryId, ToolMeta } from '@/tools/types';

/** Discovery copy only. Full names, descriptions and SEO remain in the registry. */
export const categoryLabels: Record<CategoryId, string> = {
  finance: 'การเงิน',
  loan: 'บ้านและรถ',
  business: 'ค้าขาย',
  land: 'ที่ดิน',
  date: 'วันเวลา',
  daily: 'ชีวิตประจำวัน',
  qr: 'QR / PromptPay',
  lottery: 'ตรวจหวย',
  dream: 'ทำนายฝัน',
  horoscope: 'ดูดวง',
};
const summaries: Record<string, [string, string]> = {
  'thai-income-tax': ['คำนวณภาษีเงินได้', 'รวมรายได้ เช็กค่าลดหย่อน รู้ยอดภาษีที่ต้องจ่าย'],
  'net-salary': ['เงินเดือนสุทธิ', 'รู้เงินรับจริง หลังหักภาษีและประกันสังคม'],
  'electricity-bill': ['คำนวณค่าไฟ', 'ประมาณค่าไฟ MEA และ PEA จากหน่วยที่ใช้'],
  'home-loan': ['คำนวณผ่อนบ้าน', 'ดูค่างวดและดอกเบี้ยบ้านแบบขั้นบันได'],
  'car-loan': ['คำนวณผ่อนรถ', 'เช็กเงินดาวน์ ค่างวด และดอกเบี้ยรวม'],
  'loan-installment': ['คำนวณค่างวด', 'วางแผนผ่อนบ้านและรถจากยอดกู้'],
  'promptpay-qr': ['สร้าง QR รับเงิน', 'สร้าง QR PromptPay พร้อมระบุยอดเงิน'],
  'social-security': ['ประกันสังคม', 'คำนวณเงินสมทบและฐานค่าจ้าง'],
  'severance-pay': ['ค่าชดเชยเลิกจ้าง', 'ประเมินค่าชดเชยจากอายุงานและค่าจ้าง'],
  'ot-calculator': ['คำนวณ OT', 'คิดค่าล่วงเวลาและค่าทำงานวันหยุด'],
  'work-tenure': ['คำนวณอายุงาน', 'นับปี เดือน และวันที่ทำงาน'],
  'credit-card-debt': ['วางแผนปิดหนี้บัตร', 'ดูระยะเวลาชำระหนี้และดอกเบี้ย'],
  'flat-effective-rate': ['เทียบอัตราดอกเบี้ย', 'แปลงดอกเบี้ยคงที่เป็นลดต้นลดดอก'],
  'vat-wht': ['คำนวณ VAT 7%', 'ถอดภาษีหรือรวม VAT ในยอดขาย'],
  'wht-calculator': ['ภาษีหัก ณ ที่จ่าย', 'คำนวณยอดหักและยอดรับสุทธิ'],
  'compound-interest': ['ดอกเบี้ยทบต้น', 'วางแผนเงินออมให้ถึงเป้าหมาย'],
  'baht-text': ['แปลงตัวเลขเป็นบาทถ้วน', 'เปลี่ยนยอดเงินเป็นข้อความภาษาไทย'],
  'word-count': ['นับคำและตัวอักษร', 'นับคำไทย ตัวอักษร และบรรทัด'],
  'thai-numerals': ['แปลงเลขไทย', 'สลับเลขไทยและเลขอารบิก'],
  'text-lines': ['จัดการข้อความ', 'เรียงบรรทัด ลบคำซ้ำ และช่องว่าง'],
  'thai-id-check': ['ตรวจเลขบัตรประชาชน', 'ตรวจความถูกต้องของเลข 13 หลัก'],
  'age-days': ['คำนวณอายุ', 'รู้จำนวนปี เดือน และวันจากวันเกิด'],
  'date-add': ['นับวันและบวกลบวันที่', 'หาวันครบกำหนดและระยะห่างระหว่างวัน'],
  'thai-year-convert': ['แปลง พ.ศ. / ค.ศ.', 'แปลงปีและดูวันในสัปดาห์'],
  'thai-holidays': ['ปฏิทินวันหยุด', 'ดูวันหยุดราชการ ธนาคาร และนับวันทำการ'],
  'qr-generator': ['สร้าง QR Code', 'เปลี่ยนข้อความ ลิงก์ หรือ WiFi เป็น QR'],
  'qr-reader': ['อ่าน QR จากรูปภาพ', 'อัปโหลดรูปเพื่ออ่านข้อมูลใน QR Code'],
  'land-unit-convert': ['แปลงหน่วยที่ดิน', 'แปลงไร่ งาน ตารางวา และตารางเมตร'],
  'land-price': ['คำนวณราคาที่ดิน', 'หาราคารวมและราคาต่อหน่วยพื้นที่'],
  'profit-margin': ['คำนวณกำไร', 'เช็กมาร์จิ้นและมาร์กอัปจากต้นทุน'],
  'selling-price': ['ตั้งราคาขาย', 'หาราคาขายจากต้นทุนและกำไรที่ต้องการ'],
  'shop-profit': ['กำไรร้านค้าออนไลน์', 'รวมต้นทุนและค่าธรรมเนียมก่อนตั้งราคา'],
  'fuel-cost': ['คำนวณค่าน้ำมัน', 'ประมาณค่าเดินทางจากระยะทางและอัตราสิ้นเปลือง'],
  'json-formatter': ['จัดรูปแบบ JSON', 'จัดย่อหน้า ตรวจสอบ และย่อข้อมูล JSON'],
};
export type DiscoveryTool = Pick<ToolMeta, 'slug' | 'name' | 'nameEn' | 'category' | 'description' | 'keywords'>;
export function toolPresentation(tool: Pick<ToolMeta, 'slug' | 'name' | 'description'>) {
  const [name, description] = summaries[tool.slug] ?? [tool.name, tool.description];
  return { name, description };
}
export function toDiscoveryTool(tool: ToolMeta): DiscoveryTool {
  return {
    slug: tool.slug,
    name: tool.name,
    nameEn: tool.nameEn,
    category: tool.category,
    description: toolPresentation(tool).description,
    keywords: tool.keywords,
  };
}
