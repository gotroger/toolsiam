import type { ToolMeta } from '../types';

export const fileTools = {
  'pdf-merge': {
    name: 'รวมไฟล์ PDF',
    nameEn: 'Merge PDF',
    category: 'documents',
    accept: '.pdf',
    multiple: true,
    action: 'รวม PDF',
    description:
      'รวม PDF หลายไฟล์เป็นไฟล์เดียว จัดลำดับไฟล์ก่อนรวมได้ ประมวลผลบนอุปกรณ์ของคุณโดยไม่ส่งไฟล์ขึ้นเซิร์ฟเวอร์',
    detail: 'เลือก PDF อย่างน้อย 2 ไฟล์ แล้วใช้ปุ่มขึ้นหรือลงเพื่อจัดลำดับ รองรับรวมไม่เกิน 30 MB และ 150 หน้า',
    keywords: ['รวม pdf', 'merge pdf', 'รวมเอกสาร'],
    limit: 15,
  },
  'pdf-extract': {
    name: 'แยกและเลือกหน้า PDF',
    nameEn: 'Extract PDF Pages',
    category: 'documents',
    accept: '.pdf',
    action: 'สร้าง PDF จากหน้าที่เลือก',
    description: 'เลือกหน้า PDF ตามหมายเลขหรือช่วงหน้า เช่น 1,3-5 แล้วบันทึกเป็น PDF ใหม่ เรียงหน้าตามลำดับที่ระบุได้',
    detail: 'กรอกหมายเลขหน้าที่ต้องการ เช่น 3,1,5-7 ผลลัพธ์เป็น PDF หนึ่งไฟล์ตามลำดับที่กรอก ไม่ทำซ้ำหน้าที่ระบุซ้ำ',
    keywords: ['แยก pdf', 'เลือกหน้า pdf', 'split pdf'],
    limit: 15,
  },
  'pdf-remove-pages': {
    name: 'ลบหน้า PDF',
    nameEn: 'Remove PDF Pages',
    category: 'documents',
    accept: '.pdf',
    action: 'สร้าง PDF โดยตัดหน้าที่ระบุ',
    description: 'ลบหน้าที่ไม่ต้องการออกจาก PDF ด้วยหมายเลขหรือช่วงหน้า บันทึกเป็นไฟล์ใหม่โดยเก็บไฟล์ต้นฉบับไว้',
    detail: 'ระบุหน้าที่ต้องการลบ เช่น 2,4-6 ต้องเหลืออย่างน้อย 1 หน้าในผลลัพธ์',
    keywords: ['ลบหน้า pdf', 'ตัดหน้า pdf', 'remove pdf pages'],
    limit: 15,
  },
  'pdf-rotate': {
    name: 'หมุนหน้า PDF',
    nameEn: 'Rotate PDF',
    category: 'documents',
    accept: '.pdf',
    action: 'หมุน PDF',
    description:
      'หมุนทุกหน้าใน PDF ตามเข็มนาฬิกา 90, 180 หรือ 270 องศา แก้เอกสารกลับหัวหรือแนวนอนแล้วดาวน์โหลดไฟล์ใหม่',
    detail: 'หมุนทุกหน้าเพิ่มจากทิศทางเดิม รองรับ PDF ปกติไม่เกิน 150 หน้าและไม่รองรับไฟล์ที่ตั้งรหัสผ่าน',
    keywords: ['หมุน pdf', 'กลับหัว pdf', 'rotate pdf'],
    limit: 15,
  },
  'images-to-pdf': {
    name: 'แปลงรูปภาพเป็น PDF',
    nameEn: 'Images to PDF',
    category: 'documents',
    accept: '.jpg,.jpeg,.png,.webp',
    multiple: true,
    action: 'สร้าง PDF',
    description: 'รวมรูป JPG PNG และ WebP เป็น PDF ขนาด A4 โดยวางรูปหนึ่งภาพต่อหน้า จัดลำดับรูปและดาวน์โหลดได้ทันที',
    detail:
      'เลือกได้สูงสุด 20 รูป รวมไม่เกิน 30 MB วางภาพบนกระดาษ A4 แนวตั้ง พื้นหลังขาว และย่อด้านยาวไม่เกิน 2400 พิกเซล',
    keywords: ['รูปเป็น pdf', 'jpg to pdf', 'png to pdf'],
    limit: 10,
  },
  'excel-to-csv': {
    name: 'แปลง Excel เป็น CSV',
    nameEn: 'Excel to CSV',
    category: 'documents',
    accept: '.xlsx',
    action: 'แปลงเป็น CSV',
    description:
      'แปลงชีตที่เลือกใน Excel XLSX เป็นไฟล์ CSV ภาษาไทย UTF-8 เก็บเฉพาะข้อมูลตารางและค่าผลลัพธ์ที่บันทึกไว้',
    detail:
      'รองรับ .xlsx ไม่เกิน 5 MB ระบุลำดับชีตเริ่มที่ 1 ใช้ค่าของสูตรที่บันทึกไว้ ไม่คำนวณสูตรใหม่ ไม่เก็บรูปแบบ สี หรือรูปภาพ',
    keywords: ['excel เป็น csv', 'xlsx to csv', 'แปลง exel'],
    limit: 5,
  },
  'csv-to-excel': {
    name: 'แปลง CSV เป็น Excel',
    nameEn: 'CSV to Excel',
    category: 'documents',
    accept: '.csv',
    action: 'สร้างไฟล์ Excel',
    description:
      'แปลง CSV ภาษาไทย UTF-8 เป็น Excel XLSX เลือกเครื่องหมายคั่นข้อมูลได้ เก็บเลขศูนย์นำหน้าและข้อความตามต้นฉบับ',
    detail:
      'รองรับ CSV UTF-8 ไม่เกิน 5 MB และ 100,000 ช่องข้อมูล เก็บทุกช่องเป็นข้อความเพื่อรักษาเลขศูนย์นำหน้าและไม่เรียกใช้สูตร',
    keywords: ['csv เป็น excel', 'csv to xlsx', 'แปลงตาราง'],
    limit: 5,
  },
  'word-to-text': {
    name: 'แปลง Word เป็นข้อความ',
    nameEn: 'Word to Text',
    category: 'documents',
    accept: '.docx',
    action: 'ดึงข้อความจาก Word',
    description:
      'ดึงข้อความจากไฟล์ Word DOCX เป็น TXT ภาษาไทย UTF-8 สำหรับคัดลอกและแก้ไขข้อความ ไม่ต้องติดตั้งโปรแกรม Word',
    detail:
      'รองรับ .docx ไม่เกิน 5 MB ดึงเฉพาะข้อความ ไม่เก็บรูปภาพ รูปแบบหน้า หรือข้อความในภาพ และไม่รองรับ .doc รุ่นเก่า',
    keywords: ['word เป็นข้อความ', 'docx to txt', 'ดึงข้อความ word'],
    limit: 5,
  },
  'image-compress': {
    name: 'ลดขนาดไฟล์รูปภาพ',
    nameEn: 'Compress Image',
    category: 'images',
    accept: '.jpg,.jpeg,.png,.webp',
    action: 'ลดขนาดรูปภาพ',
    description: 'ลดขนาดไฟล์รูปด้วยการปรับคุณภาพ JPG หรือ WebP พร้อมเปรียบเทียบขนาดก่อนและหลัง ประมวลผลในเบราว์เซอร์',
    detail:
      'รองรับ JPG PNG WebP ไม่เกิน 10 MB และ 16 ล้านพิกเซล ขนาดผลลัพธ์ขึ้นกับภาพและคุณภาพที่เลือก อาจใหญ่กว่าต้นฉบับได้',
    keywords: ['ลดขนาดรูป', 'บีบอัดรูปภาพ', 'compress image'],
    limit: 10,
  },
  'image-resize': {
    name: 'ปรับขนาดรูปภาพ',
    nameEn: 'Resize Image',
    category: 'images',
    accept: '.jpg,.jpeg,.png,.webp',
    action: 'ปรับขนาดรูปภาพ',
    description:
      'ปรับความกว้างรูปภาพเป็นพิกเซลโดยรักษาสัดส่วนเดิม เหมาะสำหรับเตรียมรูปลงเว็บไซต์ ส่งเอกสาร หรือใช้ในโซเชียล',
    detail: 'กำหนดความกว้าง 1–4096 พิกเซล ระบบคำนวณความสูงตามสัดส่วนเดิม ผลลัพธ์ไม่เกิน 16 ล้านพิกเซล',
    keywords: ['ปรับขนาดรูป', 'ย่อรูป', 'resize image'],
    limit: 10,
  },
  'image-convert': {
    name: 'แปลงไฟล์รูป JPG PNG WebP',
    nameEn: 'Convert Image',
    category: 'images',
    accept: '.jpg,.jpeg,.png,.webp',
    action: 'แปลงรูปภาพ',
    description:
      'แปลงรูป JPG PNG และ WebP เลือกชนิดไฟล์ปลายทางได้ เก็บพื้นหลังโปร่งใสใน PNG และ WebP หรือใช้พื้นขาวใน JPG',
    detail: 'รองรับเฉพาะ JPG PNG WebP ภาพนิ่ง ไม่รองรับ HEIC GIF และ SVG ไฟล์ JPG ใช้พื้นหลังขาวแทนส่วนโปร่งใส',
    keywords: ['แปลงรูป', 'webp เป็น jpg', 'png เป็น jpg'],
    limit: 10,
  },
  'image-rotate': {
    name: 'หมุนและกลับด้านรูปภาพ',
    nameEn: 'Rotate and Flip Image',
    category: 'images',
    accept: '.jpg,.jpeg,.png,.webp',
    action: 'หมุนและกลับด้านรูปภาพ',
    description:
      'หมุนรูปภาพ 90, 180 หรือ 270 องศา และกลับด้านซ้ายขวา เลือกดาวน์โหลดเป็น JPG PNG หรือ WebP โดยไม่ส่งรูปขึ้นเซิร์ฟเวอร์',
    detail: 'เลือกมุมหมุนตามเข็มนาฬิกาและกลับด้านซ้ายขวาได้ การกลับด้านทำก่อนหมุนภาพ',
    keywords: ['หมุนรูป', 'กลับด้านรูป', 'rotate image'],
    limit: 10,
  },
} satisfies Record<
  string,
  {
    name: string;
    nameEn: string;
    category: 'documents' | 'images';
    accept: string;
    multiple?: boolean;
    action: string;
    description: string;
    detail: string;
    keywords: string[];
    limit: number;
  }
>;
export type FileToolId = keyof typeof fileTools;
export const fileToolMetas: ToolMeta[] = Object.entries(fileTools).map(([slug, tool]) => ({
  slug,
  name: tool.name,
  nameEn: tool.nameEn,
  category: tool.category,
  description: tool.description,
  keywords: tool.keywords,
  contentUpdatedAt: '2026-09-09',
  howTo: ['เลือกไฟล์จากอุปกรณ์ตามชนิดและขนาดที่รองรับ', tool.detail, `กด “${tool.action}” ตรวจผลลัพธ์ แล้วกดดาวน์โหลด`],
  faq: [
    {
      q: 'ไฟล์ถูกส่งขึ้นเซิร์ฟเวอร์หรือไม่?',
      a: 'ไฟล์ประมวลผลในเบราว์เซอร์ของคุณ ไม่มีการอัปโหลดไฟล์หรือเก็บไฟล์ไว้ในระบบ ปิดหน้าหรือกดล้างเพื่อคืนหน่วยความจำ',
    },
    { q: 'เครื่องมือนี้มีข้อจำกัดอะไรบ้าง?', a: tool.detail },
    ...(slug.startsWith('pdf-')
      ? [
          {
            q: 'เก็บแบบฟอร์มและลายเซ็นดิจิทัลไว้หรือไม่?',
            a: 'ใช้กับ PDF ทั่วไปที่ไม่ตั้งรหัสผ่าน การสร้างไฟล์ใหม่อาจไม่เก็บแบบฟอร์ม บุ๊กมาร์ก ลิงก์ข้ามหน้า และลายเซ็นดิจิทัล กรุณาตรวจผลลัพธ์ก่อนใช้งาน',
          },
        ]
      : []),
    ...(tool.category === 'images'
      ? [
          {
            q: 'สีและภาพเคลื่อนไหวจะเหมือนต้นฉบับหรือไม่?',
            a: 'เหมาะสำหรับภาพนิ่ง ภาพเคลื่อนไหวอาจได้เพียงเฟรมเดียว การเข้ารหัสใหม่ไม่เก็บ metadata และสีอาจเปลี่ยนตาม color profile ของเบราว์เซอร์',
          },
        ]
      : []),
  ],
  related:
    tool.category === 'documents'
      ? slug === 'word-to-text'
        ? ['word-count', 'csv-to-excel']
        : ['word-to-text']
      : ['images-to-pdf', 'image-convert'].filter((value) => value !== slug),
}));
