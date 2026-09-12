import type { ToolMeta } from '@/tools/types';

export const cleanShareLinkMeta: ToolMeta = {
  slug: 'clean-share-link',
  name: 'ล้างลิงก์แชร์ ตัดพารามิเตอร์ติดตาม',
  nameEn: 'Clean Share Link',
  category: 'video',
  description:
    'ตัด utm, fbclid, si และพารามิเตอร์ติดตามอื่นออกจากลิงก์ YouTube TikTok Facebook และเว็บทั่วไป ทำได้หลายลิงก์พร้อมกัน ประมวลผลในเบราว์เซอร์',
  keywords: ['ล้างลิงก์', 'ลบ utm', 'ตัด fbclid', 'ลิงก์ youtube สั้น', 'clean url'],
  howTo: [
    'วางลิงก์ บรรทัดละ 1 ลิงก์ (สูงสุด 50 บรรทัด)',
    'ดูลิงก์ที่ล้างแล้วและพารามิเตอร์ที่ถูกตัดออกในแต่ละบรรทัด',
    'กดคัดลอกทั้งหมดไปแชร์ต่อ',
  ],
  faq: [
    {
      q: 'ตัดพารามิเตอร์อะไรบ้าง',
      a: 'utm_* ทุกตัว, fbclid, gclid, msclkid, ttclid, igshid, si, feature, mibextid และตัวติดตามที่รู้จักอื่น ๆ พารามิเตอร์ที่ไม่รู้จักจะเก็บไว้เพื่อไม่ให้ลิงก์เสีย',
    },
    {
      q: 'ทำไมลิงก์ youtu.be ถูกเปลี่ยนเป็น youtube.com',
      a: 'ลิงก์ youtu.be มักพ่วง si= ที่ระบุตัวผู้แชร์ เครื่องมือแปลงเป็นลิงก์ watch มาตรฐานและเก็บเวลาเริ่ม (t=) ไว้ให้',
    },
    {
      q: 'ลิงก์สั้นของ TikTok หรือ Douyin ล้างได้ไหม',
      a: 'ไม่ได้ ลิงก์สั้นต้องให้เซิร์ฟเวอร์ของแอปแปลงเป็นลิงก์เต็มก่อน ซึ่งเบราว์เซอร์ทำจากหน้าเว็บนี้ไม่ได้ ให้เปิดลิงก์ในแอปแล้วคัดลอกลิงก์เต็มมาวาง',
    },
  ],
  contentUpdatedAt: '2026-09-13',
  related: ['youtube-thumbnail', 'qr-generator'],
};
