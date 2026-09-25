import { addDays, dateDiffParts, daysBetweenDates, parseIsoDate, shiftDate, type DiffParts } from '@/lib/date';

export interface TenureResult extends DiffParts {
  totalDays: number;
  /** อายุงานคิดเป็นเดือนเต็ม */
  totalMonths: number;
  /** อายุงานเป็นปีทศนิยม 2 ตำแหน่ง — ใช้เทียบกับเกณฑ์ที่พูดเป็น "ปี" */
  decimalYears: number;
  /** วันที่ครบรอบปีถัดไป และเหลืออีกกี่วัน */
  nextAnniversary: string;
  daysToNextAnniversary: number;
}

export interface TenureOptions {
  /**
   * true = วันที่อ้างอิงคือ "วันสุดท้ายที่ทำงาน" จึงนับวันนั้นด้วย (ลาออก/ออกจากงานแล้ว)
   * ตรงกับการนับอายุงานของเครื่องมือค่าชดเชยที่รวมทั้งวันเริ่มงานและวันสุดท้าย
   * false (ค่าตั้งต้น) = นับแบบครบรอบถึงวันที่อ้างอิง เหมาะกับคนที่ยังทำงานอยู่
   */
  includeEndDay?: boolean;
}

/**
 * อายุงานนับจากวันเริ่มงานถึงวันที่อ้างอิง (วันสุดท้ายของการทำงาน หรือวันนี้)
 *
 * นับแบบ "ครบรอบ" ตามปฏิทิน ไม่ใช่หารด้วย 365 — คนเริ่มงาน 1 ม.ค. 2563 ถึง 1 ม.ค. 2569
 * ต้องได้ 6 ปีพอดี ไม่ว่าช่วงนั้นจะมีปีอธิกสุรทินกี่ปี
 * ส่วนคนที่ทำงานวันสุดท้าย 31 ธ.ค. 2568 (includeEndDay) ก็ได้ 6 ปีพอดีเช่นกัน
 */
export function calculateTenure(startIso: string, refIso: string, options: TenureOptions = {}): TenureResult {
  const start = parseIsoDate(startIso);
  const ref = parseIsoDate(refIso);
  if (start > ref) throw new Error('วันเริ่มงานต้องไม่อยู่หลังวันที่อ้างอิง');

  // นับวันสุดท้ายด้วย = เทียบกับวันถัดไปแบบไม่รวมปลาย — สูตรเดียวกับ severance-pay
  const endExclusive = options.includeEndDay ? addDays(refIso, 1) : refIso;
  const parts = dateDiffParts(startIso, endExclusive);
  const totalDays = daysBetweenDates(startIso, endExclusive);

  const nextAnniversary = shiftDate(startIso, parts.years + 1, 'year');

  return {
    ...parts,
    totalDays,
    totalMonths: parts.years * 12 + parts.months,
    decimalYears: Math.round((totalDays / 365.2425) * 100) / 100,
    nextAnniversary,
    daysToNextAnniversary: daysBetweenDates(refIso, nextAnniversary),
  };
}

/** ข้อความอ่านง่ายแบบที่เขียนในหนังสือรับรองการทำงาน */
export function formatTenure(t: TenureResult): string {
  const parts = [
    t.years > 0 && `${t.years} ปี`,
    t.months > 0 && `${t.months} เดือน`,
    (t.days > 0 || (t.years === 0 && t.months === 0)) && `${t.days} วัน`,
  ].filter(Boolean);
  return parts.join(' ');
}
