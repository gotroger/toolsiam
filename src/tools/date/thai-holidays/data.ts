export type HolidayType = 'ปกติ' | 'ชดเชย' | 'พิเศษ';

export interface Holiday {
  /** YYYY-MM-DD (ค.ศ.) */
  date: string;
  name: string;
  /** เป็นวันหยุดราชการหรือไม่ */
  government: boolean;
  /** เป็นวันหยุดของสถาบันการเงินตามประกาศ ธปท. หรือไม่ */
  bank: boolean;
  type: HolidayType;
}

/**
 * วันหยุด พ.ศ. 2569 (ค.ศ. 2026)
 * ที่มา: ประกาศ ธปท. เรื่องวันหยุดของสถาบันการเงิน 2569 (วันหยุดธนาคารรวม 19 วันทำการ)
 * ตามที่รายงานโดย PPTV และ Thai PBS — ดู docs/data/thai-holidays-2569.md
 *
 * หมายเหตุที่ตั้งใจ:
 * - 1 พ.ค. วันแรงงานแห่งชาติ = วันหยุดธนาคาร/เอกชน แต่ไม่ใช่วันหยุดราชการ
 * - 13 พ.ค. วันพืชมงคล และ 30 ก.ค. วันเข้าพรรษา = วันหยุดราชการ แต่ธนาคารเปิดทำการ
 * - 31 พ.ค. (อาทิตย์) และ 5 ธ.ค. (เสาร์) ตรงวันหยุดสุดสัปดาห์ จึงมีวันชดเชยตามมา
 */
export const HOLIDAYS_2569: readonly Holiday[] = [
  { date: '2026-01-01', name: 'วันขึ้นปีใหม่', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-01-02', name: 'วันหยุดพิเศษ', government: true, bank: true, type: 'พิเศษ' },
  { date: '2026-03-03', name: 'วันมาฆบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-06', name: 'วันจักรี', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-13', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-14', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-04-15', name: 'วันสงกรานต์', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-05-01', name: 'วันแรงงานแห่งชาติ', government: false, bank: true, type: 'ปกติ' },
  { date: '2026-05-04', name: 'วันฉัตรมงคล', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-05-13', name: 'วันพืชมงคล', government: true, bank: false, type: 'ปกติ' },
  { date: '2026-05-31', name: 'วันวิสาขบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-06-01', name: 'ชดเชยวันวิสาขบูชา', government: true, bank: true, type: 'ชดเชย' },
  { date: '2026-06-03', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระนางเจ้าสุทิดาฯ พระบรมราชินี', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-28', name: 'วันเฉลิมพระชนมพรรษา พระบาทสมเด็จพระเจ้าอยู่หัว', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-29', name: 'วันอาสาฬหบูชา', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-07-30', name: 'วันเข้าพรรษา', government: true, bank: false, type: 'ปกติ' },
  { date: '2026-08-12', name: 'วันเฉลิมพระชนมพรรษา สมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-10-13', name: 'วันนวมินทรมหาราช (วันคล้ายวันสวรรคต ร.9)', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-10-23', name: 'วันปิยมหาราช', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-05', name: 'วันคล้ายวันพระบรมราชสมภพ ร.9 / วันชาติ / วันพ่อแห่งชาติ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-07', name: 'ชดเชยวันพ่อแห่งชาติ', government: true, bank: true, type: 'ชดเชย' },
  { date: '2026-12-10', name: 'วันรัฐธรรมนูญ', government: true, bank: true, type: 'ปกติ' },
  { date: '2026-12-31', name: 'วันสิ้นปี', government: true, bank: true, type: 'ปกติ' },
];
