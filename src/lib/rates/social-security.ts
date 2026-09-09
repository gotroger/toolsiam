import type { RateSource } from '@/tools/types';

/**
 * อัตราเงินสมทบประกันสังคม — แหล่งความจริงเดียวของทั้งเว็บ (E6)
 *
 * ⚠️ แหล่งของสำนักงานประกันสังคมขัดกันเอง และ **ยังขัดกันอยู่** เมื่อตรวจซ้ำ 8 ก.ย. 2569:
 * หน้า "เงินสมทบและการชำระเงิน"
 * (sso.go.th/wpr/main/general/เงินสมทบและการชำระเงิน_singleview_detail_1_193_0/438_438)
 * ยังเขียนเพดาน 15,000 บาททั้งที่ท้ายหน้าระบุเวอร์ชัน V.2026.08 (ส.ค. 2569)
 * ขณะที่หน้าสิทธิประโยชน์ระบุ 17,500 บาทตั้งแต่ 1 ม.ค. 2569 — ยึดหน้าหลัง
 *
 * ✅ verify เมื่อ 8 ก.ย. 2569 (VF1) — ได้เลขราชกิจจานุเบกษาครบแล้ว:
 * "กฎกระทรวงกำหนดค่าจ้างขั้นต่ำและขั้นสูงที่ใช้เป็นฐานในการคำนวณเงินสมทบ
 * ของผู้ประกันตนตามมาตรา ๓๓ พ.ศ. ๒๕๖๘"
 * **เล่ม ๑๔๒ ตอนที่ ๘๑ ก หน้า ๕ · ประกาศ ๑๒ ธ.ค. ๒๕๖๘** · มีผล 1 ม.ค. 2569
 * → เพดาน 17,500 บาท เงินสมทบสูงสุด 875 บาท/เดือน
 *
 * ค้นได้จาก ratchakitcha.soc.go.th ด้วยคำว่า "ค่าจ้างขั้นต่ำและขั้นสูง"
 * (ต้องพิมพ์ในช่องค้นหาของเว็บเอง — ส่ง keyword ทาง URL ไม่ได้ และเว็บมี Cloudflare กัน bot)
 *
 * หมายเหตุขอบเขตของระยะแรก: แหล่งทุติยภูมิเขียนช่วงไม่ตรงกัน (บ้างว่าถึงปี 2571
 * บ้างว่าถึง 31 ก.ค. 2571) — **จงใจไม่ใส่วันสิ้นสุด** เพราะยังไม่ได้อ่านตัวบทกฎกระทรวง
 * เห็นแต่รายการในสารบัญราชกิจจาฯ เท่านั้น
 */

export interface WageCapPeriod {
  effectiveFrom: string;
  /** ฐานค่าจ้างขั้นต่ำที่ใช้คำนวณ */
  minBase: number;
  /** ฐานค่าจ้างขั้นสูง (เพดาน) */
  maxBase: number;
}

/**
 * เพดานค่าจ้างเป็น "รายการที่มีวันมีผล" ไม่ใช่ค่าคงที่ตัวเดียว
 *
 * เพดานถูกออกแบบเป็นขั้นบันได 3 ระยะ (ข่าวและเอกสารรับฟังความคิดเห็นระบุ 20,000 ปี 2572
 * และ 23,000 ปี 2575) — **ตัวเลขสองระยะหลังยังไม่ยืนยันจากหน้าเว็บทางการ จึงยังไม่ใส่**
 * โครงสร้างนี้มีไว้เพื่อให้เติมได้โดยไม่ต้อง refactor เมื่อยืนยันแล้ว
 *
 * เรียงจากใหม่ไปเก่า
 */
export const SECTION_33_WAGE_CAPS: WageCapPeriod[] = [
  { effectiveFrom: '2026-01-01', minBase: 1_650, maxBase: 17_500 },
  { effectiveFrom: '1995-01-01', minBase: 1_650, maxBase: 15_000 },
];

/** อัตราปกติ — ไม่รวมมาตรการลดอัตราชั่วคราวที่ออกเป็นครั้ง ๆ และเป็นรายพื้นที่ได้ */
export const SECTION_33_RATES = {
  employee: 0.05,
  employer: 0.05,
  government: 0.0275,
} as const;

/**
 * ม.39 — ผู้ประกันตนโดยสมัครใจ ใช้ฐานเดียวกันทุกคน
 *
 * ✅ verify เมื่อ 8 ก.ย. 2569 — ฐาน 4,800 บาท **ไม่เปลี่ยน** แม้เพดาน ม.33 จะขยับเป็น 17,500
 * หน้า "เงินสมทบและการชำระเงิน" ของ สปส. เวอร์ชัน V.2026.08 ยังระบุ 4,800 บาท
 * และ 4,800 × 9% = 432 บาท/เดือน ตรงกับที่ สปส. ประกาศ
 */
export const SECTION_39 = {
  base: 4_800,
  rate: 0.09,
} as const;

export interface Section40Option {
  option: 1 | 2 | 3;
  /** เงินสมทบต่อเดือน (บาท) */
  contribution: number;
  /** จำนวนกรณีที่คุ้มครอง */
  cases: number;
  coverage: string;
}

/** ม.40 — ตาม พ.ร.ฎ. พ.ศ. 2561 และที่แก้ไขเพิ่มเติม (ฉบับที่ 2) พ.ศ. 2563 */
export const SECTION_40_OPTIONS: Section40Option[] = [
  { option: 1, contribution: 70, cases: 3, coverage: 'เจ็บป่วย · ทุพพลภาพ · เสียชีวิต' },
  { option: 2, contribution: 100, cases: 4, coverage: 'เจ็บป่วย · ทุพพลภาพ · เสียชีวิต · ชราภาพ' },
  { option: 3, contribution: 300, cases: 5, coverage: 'เจ็บป่วย · ทุพพลภาพ · เสียชีวิต · ชราภาพ · สงเคราะห์บุตร' },
];

/** ทางเลือก 2 และ 3 จ่าย "ออมเพิ่ม" ได้ไม่เกินเดือนละเท่านี้ */
export const SECTION_40_EXTRA_SAVING_CAP = 1_000;

/** เพดานเงินสมทบที่ ม.40 จ่ายล่วงหน้าได้ (จ่ายย้อนหลังไม่ได้) */
export const SECTION_40_PREPAY_MONTHS = 12;

/** เพดานค่าจ้างที่มีผล ณ วันที่กำหนด — ไม่พบช่วงที่ตรงถือว่าผิดพลาดในข้อมูล ไม่ใช่กรณีปกติ */
export function wageCapAt(asOf: string): WageCapPeriod {
  const period = SECTION_33_WAGE_CAPS.find((p) => p.effectiveFrom <= asOf);
  if (!period) throw new Error(`ไม่มีข้อมูลเพดานค่าจ้างประกันสังคมสำหรับวันที่ ${asOf}`);
  return period;
}

export interface Section33Result {
  /** ค่าจ้างหลังหนีบเข้าช่วงฐานขั้นต่ำ–ขั้นสูง */
  base: number;
  employee: number;
  employer: number;
  government: number;
  /** ผู้ประกันตน + นายจ้าง (ส่วนที่เข้ากองทุนจากสองฝ่าย) */
  total: number;
  cap: WageCapPeriod;
}

/**
 * เงินสมทบ ม.33 ต่อเดือน
 *
 * เงินสมทบรายคนปัดเป็นบาทตามมาตรา 46: ตั้งแต่ 50 สตางค์ปัดขึ้น ต่ำกว่านั้นปัดทิ้ง
 * ไม่ hardcode ไว้ เพราะเมื่อเพดานเปลี่ยน ตัวเลขสองตัวนั้นต้องเปลี่ยนตามเอง
 */
export function section33Contribution(monthlyWage: number, asOf: string): Section33Result {
  if (!Number.isFinite(monthlyWage) || monthlyWage < 0) throw new Error('ค่าจ้างต้องเป็นตัวเลขไม่ติดลบ');
  const cap = wageCapAt(asOf);
  const base = Math.min(Math.max(monthlyWage, cap.minBase), cap.maxBase);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  const employee = Math.round(base * SECTION_33_RATES.employee);
  const employer = Math.round(base * SECTION_33_RATES.employer);
  return {
    base,
    employee,
    employer,
    government: round2(base * SECTION_33_RATES.government),
    total: round2(employee + employer),
    cap,
  };
}

/** เงินสมทบ ม.39 ต่อเดือน — ฐานคงที่ จึงไม่ขึ้นกับรายได้จริงของผู้ประกันตน */
export function section39Contribution(): number {
  return Math.round(SECTION_39.base * SECTION_39.rate * 100) / 100;
}

export const SOCIAL_SECURITY_SOURCE: RateSource = {
  effectiveFrom: '2026-01-01',
  lastVerifiedAt: '2026-09-08',
  sourceName:
    'กฎกระทรวงฯ ตามมาตรา 33 พ.ศ. 2568 (ราชกิจจานุเบกษา เล่ม 142 ตอนที่ 81 ก หน้า 5 · 12 ธ.ค. 2568) ประกอบหน้าสำนักงานประกันสังคม',
  sourceUrl:
    'https://www.sso.go.th/wpr/main/service/%E0%B8%81%E0%B8%AD%E0%B8%87%E0%B8%97%E0%B8%B8%E0%B8%99%E0%B8%9B%E0%B8%A3%E0%B8%B0%E0%B8%81%E0%B8%B1%E0%B8%99%E0%B8%AA%E0%B8%B1%E0%B8%87%E0%B8%84%E0%B8%A1_detail_detail_1_125_690/605_605',
  summary:
    'ม.33 ผู้ประกันตนและนายจ้างส่งฝ่ายละ 5% ของค่าจ้าง ฐาน 1,650–17,500 บาท/เดือน (เพดาน 17,500 มีผล 1 ม.ค. 2569) · ม.39 ส่ง 9% ของฐาน 4,800 บาท = 432 บาท/เดือน · ม.40 ทางเลือก 70 / 100 / 300 บาท/เดือน',
};
