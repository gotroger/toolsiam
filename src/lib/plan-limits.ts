/**
 * ขีดจำกัดของแพลนฟรีและพรีเมียม — ตัวเลขทุกตัวอยู่ไฟล์นี้ไฟล์เดียว
 *
 * ทั้ง UI (hint ในช่องเลือกไฟล์, ข้อความข้อเสนอ, ตารางในหน้า /premium), เครื่องมือไฟล์
 * และ Web Worker ที่ประมวลผลเอกสาร อ่านจากที่นี่ทั้งหมด — จะได้ไม่มีวันที่ตัวเลขบนหน้าเว็บ
 * ไม่ตรงกับตัวเลขที่บังคับจริง
 *
 * ทำไมพรีเมียมไม่ "ไม่จำกัด": ไฟล์ทั้งหมดถูกประมวลผลในเบราว์เซอร์ pdf-lib ถือทั้งต้นฉบับ
 * หน้าที่คัดลอก และผลลัพธ์ที่ serialize พร้อมกัน (~3–4 เท่าของขนาดไฟล์) 150 MB จึงกินหน่วยความจำ
 * ราว 600 MB ซึ่งยังไหวบนเดสก์ท็อปแต่เริ่มเสี่ยงบนมือถือรุ่นล่าง — เพดานจึงอยู่ตรงนี้
 * และให้เวลาประมวลผลนานขึ้นแทน
 */
export type Plan = 'free' | 'premium';

/** ชนิดไฟล์ที่ขีดจำกัดต่อไฟล์ต่างกัน (ดู `fileClass` ใน src/tools/files/catalog.ts) */
export type FileClass = 'pdf' | 'image' | 'office';

export interface PlanLimits {
  /** ขนาดสูงสุดต่อไฟล์ (MB) แยกตามชนิด */
  perFileMb: Record<FileClass, number>;
  /** จำนวนไฟล์สูงสุดต่อครั้ง (เครื่องมือที่รับหลายไฟล์) */
  maxFiles: number;
  /** ขนาดรวมทุกไฟล์ต่อครั้ง (MB) */
  totalMb: number;
  /** จำนวนหน้า PDF รวมสูงสุด */
  pages: number;
  /** ขนาดไฟล์ Office เมื่อคลายออก (MB) — กัน zip bomb */
  zipExpandedMb: number;
  /** จำนวนช่องข้อมูลสูงสุดของตาราง (CSV/Excel) */
  cells: number;
  /** เวลาประมวลผลสูงสุดต่อครั้ง (ms) */
  timeoutMs: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    perFileMb: { pdf: 15, image: 10, office: 5 },
    maxFiles: 20,
    totalMb: 30,
    pages: 150,
    zipExpandedMb: 30,
    cells: 100_000,
    timeoutMs: 60_000,
  },
  premium: {
    perFileMb: { pdf: 60, image: 30, office: 20 },
    maxFiles: 60,
    totalMb: 150,
    pages: 800,
    zipExpandedMb: 120,
    cells: 500_000,
    timeoutMs: 180_000,
  },
};

/** ราคาพรีเมียม (สตางค์) — Beam รับ amount เป็นสตางค์ */
export const PREMIUM_PRICE_SATANG = 1900;
/** ราคาพรีเมียม (บาท) สำหรับแสดงผล */
export const PREMIUM_PRICE_BAHT = PREMIUM_PRICE_SATANG / 100;
/** จำนวนวันที่ได้ต่อการชำระหนึ่งครั้ง */
export const PREMIUM_DAYS = 30;
/** เหลือกี่วันจึงเริ่มเตือนว่าใกล้หมดอายุ */
export const EXPIRING_SOON_DAYS = 3;
/** QR PromptPay มีอายุกี่นาที */
export const QR_TTL_MINUTES = 15;
/** อายุ session (วินาที) */
export const SESSION_TTL_SECONDS = 30 * 86_400;

/** ผู้ใช้ที่ยังไม่ล็อกอินได้ขีดจำกัดเท่าแพลนฟรี — ไม่มีโควตาทดลอง */
export function limitsFor(plan: Plan | 'anonymous'): PlanLimits {
  return PLAN_LIMITS[plan === 'premium' ? 'premium' : 'free'];
}

/** ค่าจำกัดต่อไฟล์เป็นไบต์ */
export const mb = (n: number) => n * 1024 * 1024;
