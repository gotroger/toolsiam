import { dateDiffParts, daysBetweenDates, parseIsoDate, shiftDate, type DiffParts } from '@/lib/date';

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

/**
 * อายุงานนับจากวันเริ่มงานถึงวันที่อ้างอิง (วันสุดท้ายของการทำงาน หรือวันนี้)
 *
 * นับแบบ "ครบรอบ" ตามปฏิทิน ไม่ใช่หารด้วย 365 — คนเริ่มงาน 1 ม.ค. 2563 ถึง 1 ม.ค. 2569
 * ต้องได้ 6 ปีพอดี ไม่ว่าช่วงนั้นจะมีปีอธิกสุรทินกี่ปี
 */
export function calculateTenure(startIso: string, refIso: string): TenureResult {
  const start = parseIsoDate(startIso);
  const ref = parseIsoDate(refIso);
  if (start > ref) throw new Error('วันเริ่มงานต้องไม่อยู่หลังวันที่อ้างอิง');

  const parts = dateDiffParts(startIso, refIso);
  const totalDays = daysBetweenDates(startIso, refIso);

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
