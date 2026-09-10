import type { CategoryId, ToolMeta } from '@/tools/types';

/** Discovery copy only. Full names, descriptions and SEO remain in the registry. */
export const categoryLabels: Record<CategoryId, string> = {
  documents: 'เอกสาร / PDF',
  images: 'รูปภาพ',
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
  'pdf-merge': ['รวมไฟล์ PDF', 'รวมหลายไฟล์เป็น PDF เดียว จัดลำดับได้'],
  'pdf-extract': ['แยกและเลือกหน้า PDF', 'เลือกเฉพาะหน้าที่ต้องการเป็นไฟล์ใหม่'],
  'pdf-remove-pages': ['ลบหน้า PDF', 'ลบหน้าที่ไม่ต้องการ เก็บไฟล์ต้นฉบับไว้'],
  'pdf-rotate': ['หมุนหน้า PDF', 'แก้เอกสารกลับหัวหรือแนวนอน'],
  'images-to-pdf': ['แปลงรูปภาพเป็น PDF', 'รวมรูปเป็น PDF ขนาด A4 หน้าละภาพ'],
  'excel-to-csv': ['แปลง Excel เป็น CSV', 'ดึงชีตที่เลือกออกเป็น CSV ภาษาไทย'],
  'csv-to-excel': ['แปลง CSV เป็น Excel', 'เปิด CSV ภาษาไทยใน Excel ไม่ต้องแก้'],
  'word-to-text': ['แปลง Word เป็นข้อความ', 'ดึงข้อความจาก DOCX เป็นไฟล์ TXT'],
  'image-compress': ['ลดขนาดไฟล์รูปภาพ', 'ลดขนาดไฟล์ เทียบก่อนหลังได้ทันที'],
  'image-resize': ['ปรับขนาดรูปภาพ', 'ย่อขยายความกว้าง โดยรักษาสัดส่วน'],
  'image-convert': ['แปลงไฟล์รูป JPG PNG WebP', 'สลับชนิดไฟล์ JPG PNG และ WebP'],
  'image-rotate': ['หมุนและกลับด้านรูปภาพ', 'หมุน 90 180 270 องศา และกลับด้าน'],
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
