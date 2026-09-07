/** helper วันที่แบบ "วันที่ปฏิทิน" — ทุกอย่างเป็น UTC และส่งต่อกันเป็นสตริง YYYY-MM-DD */

export const MS_PER_DAY = 86_400_000;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** month = 1–12 */
export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

/** คืน timestamp UTC เที่ยงคืนของวันนั้น; โยน error ถ้ารูปแบบผิดหรือวันที่ไม่มีจริง */
export function parseIsoDate(iso: string): number {
  const m = ISO_RE.exec(iso);
  if (!m) throw new Error('รูปแบบวันที่ต้องเป็น ปี-เดือน-วัน เช่น 2026-09-08');
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) throw new Error('เดือนต้องอยู่ระหว่าง 01–12');
  if (day < 1 || day > daysInMonth(year, month)) throw new Error(`ไม่มีวันที่ ${iso} ในปฏิทิน`);
  return Date.UTC(year, month - 1, day);
}

export function toIsoDate(ms: number): string {
  const d = new Date(ms);
  const y = String(d.getUTCFullYear()).padStart(4, '0');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** จำนวนวันจาก a ถึง b (ติดลบได้ถ้า b อยู่ก่อน a) */
export function daysBetweenDates(aIso: string, bIso: string): number {
  return Math.round((parseIsoDate(bIso) - parseIsoDate(aIso)) / MS_PER_DAY);
}

export function addDays(iso: string, n: number): string {
  return toIsoDate(parseIsoDate(iso) + Math.round(n) * MS_PER_DAY);
}

/** 0 = อาทิตย์ … 6 = เสาร์ */
export function weekdayIndex(iso: string): number {
  return new Date(parseIsoDate(iso)).getUTCDay();
}

export function isWeekend(iso: string): boolean {
  const d = weekdayIndex(iso);
  return d === 0 || d === 6;
}
