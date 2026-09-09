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
  // Date.UTC() ตีความปี 0–99 เป็น ค.ศ. 1900–1999 จึงต้องตั้งปีผ่าน setUTCFullYear
  const d = new Date(0);
  d.setUTCFullYear(year, month - 1, day);
  return d.getTime();
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

/**
 * จำนวนวันเสาร์-อาทิตย์ในช่วง (นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด)
 * คำนวณแบบปิดรูป จึงไม่วนลูปตามจำนวนวันในช่วง สลับลำดับวันได้
 */
export function countWeekends(fromIso: string, toIso: string): number {
  const a = parseIsoDate(fromIso);
  const b = parseIsoDate(toIso);
  const startIso = a <= b ? fromIso : toIso;
  const inclusiveDays = Math.round(Math.abs(b - a) / MS_PER_DAY) + 1;

  const startWd = weekdayIndex(startIso);
  const full = Math.floor(inclusiveDays / 7);
  let weekend = full * 2;
  for (let i = full * 7; i < inclusiveDays; i++) {
    const wd = (startWd + i) % 7;
    if (wd === 0 || wd === 6) weekend += 1;
  }
  return weekend;
}

/** ผลต่างวันที่แบบปฏิทิน แยกเป็นปี/เดือน/วัน */
export interface DiffParts {
  years: number;
  months: number;
  days: number;
}

/** เรียงวันที่จากน้อยไปมาก */
export function orderDates(aIso: string, bIso: string): [string, string] {
  return parseIsoDate(aIso) <= parseIsoDate(bIso) ? [aIso, bIso] : [bIso, aIso];
}

/** นับเดือนเต็มจากวันตั้งต้น โดยหนีบวันสิ้นเดือน แล้วนับวันที่เหลือ */
export function dateDiffParts(aIso: string, bIso: string, monthEnd: 'clamp' | 'rollover' = 'clamp'): DiffParts {
  const [startIso, endIso] = orderDates(aIso, bIso);
  const start = new Date(parseIsoDate(startIso));
  const end = new Date(parseIsoDate(endIso));
  let months = (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth();
  const anniversary = (n: number) => {
    const clamped = shiftDate(startIso, n, 'month');
    return monthEnd === 'clamp' ? clamped : addDays(clamped, start.getUTCDate() - Number(clamped.slice(8, 10)));
  };
  if (anniversary(months) > endIso) months -= 1;
  const anchor = anniversary(months);
  return { years: Math.floor(months / 12), months: months % 12, days: daysBetweenDates(anchor, endIso) };
}

/** ช่วงระหว่างสองวันที่ มองได้หลายมุมพร้อมกัน */
export interface DateSpan {
  /** ผลต่างเป็นวัน (ไม่นับวันเริ่มต้น) */
  days: number;
  /** นับรวมทั้งวันเริ่มและวันสิ้นสุด */
  inclusiveDays: number;
  weeks: number;
  remainderDays: number;
  /** จันทร์–ศุกร์ ในช่วง (นับรวมปลายทั้งสองข้าง) */
  weekdayCount: number;
  weekendCount: number;
  parts: DiffParts;
}

/** สลับลำดับวันได้ — ผลลัพธ์เป็นบวกเสมอ */
export function daysBetween(startIso: string, endIso: string): DateSpan {
  const [fromIso, toIso] = orderDates(startIso, endIso);
  const days = daysBetweenDates(fromIso, toIso);
  const inclusiveDays = days + 1;
  const weekendCount = countWeekends(fromIso, toIso);

  return {
    days,
    inclusiveDays,
    weeks: Math.floor(days / 7),
    remainderDays: days % 7,
    weekdayCount: inclusiveDays - weekendCount,
    weekendCount,
    parts: dateDiffParts(fromIso, toIso),
  };
}

export type ShiftUnit = 'day' | 'week' | 'month' | 'year';

/**
 * บวก/ลบวันที่ — จำนวนติดลบคือถอยหลัง
 *
 * บวกเดือนหรือปีแล้ววันเกินสิ้นเดือนจะถูกหนีบไว้ที่วันสุดท้ายของเดือนนั้น
 * (31 ม.ค. + 1 เดือน = 28/29 ก.พ.) ซึ่งตรงกับที่คนไทยนับ "อีกหนึ่งเดือน" ในทางปฏิบัติ
 */
export function shiftDate(iso: string, amount: number, unit: ShiftUnit): string {
  if (!Number.isFinite(amount)) throw new Error('จำนวนที่บวก/ลบต้องเป็นตัวเลข');
  const n = Math.round(amount);
  if (unit === 'day') return addDays(iso, n);
  if (unit === 'week') return addDays(iso, n * 7);

  const base = new Date(parseIsoDate(iso));
  const year = base.getUTCFullYear();
  const month = base.getUTCMonth() + 1;
  const day = base.getUTCDate();

  const totalMonths = unit === 'year' ? (year + n) * 12 + (month - 1) : year * 12 + (month - 1) + n;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  if (targetYear < 1 || targetYear > 9999) throw new Error('ผลลัพธ์อยู่นอกช่วงปีที่รองรับ (ค.ศ. 1–9999)');

  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth));
  return `${String(targetYear).padStart(4, '0')}-${String(targetMonth).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`;
}
