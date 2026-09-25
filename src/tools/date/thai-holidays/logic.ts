import { addDays, countWeekends, daysBetweenDates, isWeekend, orderDates, parseIsoDate } from '@/lib/date';
import { BANGKOK_HOLIDAYS, HOLIDAYS_2569, HOLIDAYS_BY_YEAR, type Holiday } from './data';

export type { Holiday };
export { HOLIDAYS_2569 };

/** ปฏิทินที่รองรับ: ธนาคาร (ตามประกาศ ธปท.) หรือ ราชการ (ตามมติ ครม.) */
export type HolidayCalendar = 'bank' | 'government';
export type HolidayRegion = 'national' | 'bangkok';

export interface CoveredYear {
  be: number;
  ce: number;
}

/** ปีที่มีประกาศวันหยุดครบแล้ว เรียงจากน้อยไปมาก */
export function coveredYears(): CoveredYear[] {
  return Object.keys(HOLIDAYS_BY_YEAR)
    .map(Number)
    .sort((a, b) => a - b)
    .map((ce) => ({ be: ce + 543, ce }));
}

export function isYearCovered(ce: number): boolean {
  return HOLIDAYS_BY_YEAR[ce] !== undefined;
}

/**
 * เพดานของโหมดบวกวันทำการ — ราว 40 ปี
 * ปีที่ไม่มีข้อมูลไม่หยุดลูปแล้ว จึงต้องกันเลขมหาศาลที่ทำให้หน้าค้าง
 */
export const MAX_BUSINESS_DAYS = 10_000;

export interface BusinessDaySpan {
  totalDays: number;
  businessDays: number;
  weekendDays: number;
  /** วันหยุดนักขัตฤกษ์ที่ตรงวันจันทร์–ศุกร์ */
  holidayDays: number;
  holidays: Holiday[];
  /** พ.ศ. ในช่วงที่ยังไม่มีประกาศวันหยุด — ส่วนนั้นนับเฉพาะเสาร์–อาทิตย์ */
  uncoveredYears: number[];
}

/**
 * วันหยุดของปฏิทินที่เลือก เรียงตามวันที่
 * ไม่ระบุปี = ทุกปีที่มีข้อมูล
 */
export function listHolidays(cal: HolidayCalendar, region: HolidayRegion = 'national', yearCe?: number): Holiday[] {
  const years = yearCe === undefined ? coveredYears().map((y) => y.ce) : [yearCe];
  const extra = region === 'bangkok' ? BANGKOK_HOLIDAYS : [];
  return years
    .flatMap((ce) => [...(HOLIDAYS_BY_YEAR[ce] ?? []), ...extra.filter((h) => Number(h.date.slice(0, 4)) === ce)])
    .filter((h) => (cal === 'bank' ? h.bank : h.government))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** ปีที่ยังไม่มีข้อมูลให้ผล undefined เสมอ — ผู้เรียกดู uncoveredYearsBetween เพื่อเตือนผู้ใช้ */
export function findHoliday(
  iso: string,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): Holiday | undefined {
  parseIsoDate(iso);
  return listHolidays(cal, region, Number(iso.slice(0, 4))).find((h) => h.date === iso);
}

export function isBusinessDay(iso: string, cal: HolidayCalendar, region: HolidayRegion = 'national'): boolean {
  return !isWeekend(iso) && findHoliday(iso, cal, region) === undefined;
}

/** พ.ศ. ในช่วงวันที่ (สลับลำดับได้) ที่ยังไม่มีประกาศวันหยุด */
export function uncoveredYearsBetween(aIso: string, bIso: string): number[] {
  const [fromIso, toIso] = orderDates(aIso, bIso);
  const out: number[] = [];
  for (let ce = Number(fromIso.slice(0, 4)); ce <= Number(toIso.slice(0, 4)); ce++)
    if (!isYearCovered(ce)) out.push(ce + 543);
  return out;
}

/** "ยังไม่มีประกาศวันหยุดปี 2570 นับเฉพาะเสาร์–อาทิตย์" — ไม่มีปีที่ขาด = สตริงว่าง */
export function uncoveredWarning(yearsBe: readonly number[]): string {
  if (yearsBe.length === 0) return '';
  const first = yearsBe[0];
  const last = yearsBe[yearsBe.length - 1];
  const label = first === last ? `${first}` : `${first}–${last}`;
  return `ยังไม่มีประกาศวันหยุดปี ${label} นับเฉพาะเสาร์–อาทิตย์`;
}

/**
 * นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด
 * นับเสาร์–อาทิตย์แบบปิดรูป แล้วไล่เฉพาะรายการวันหยุด จึงไม่วนตามจำนวนวันในช่วง
 */
export function businessDaysBetween(
  startIso: string,
  endIso: string,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): BusinessDaySpan {
  const [fromIso, toIso] = orderDates(startIso, endIso);

  const totalDays = daysBetweenDates(fromIso, toIso) + 1;
  const weekendDays = countWeekends(fromIso, toIso);
  const holidays = listHolidays(cal, region).filter((h) => h.date >= fromIso && h.date <= toIso && !isWeekend(h.date));

  return {
    totalDays,
    businessDays: totalDays - weekendDays - holidays.length,
    weekendDays,
    holidayDays: holidays.length,
    holidays,
    uncoveredYears: uncoveredYearsBetween(fromIso, toIso),
  };
}

/** เดินไปข้างหน้า (หรือถอยหลังถ้าติดลบ) ตามจำนวนวันทำการ */
export function addBusinessDays(
  iso: string,
  count: number,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): string {
  parseIsoDate(iso);
  if (!Number.isInteger(count)) throw new Error('จำนวนวันทำการต้องเป็นจำนวนเต็ม');
  if (Math.abs(count) > MAX_BUSINESS_DAYS)
    throw new Error(`จำนวนวันทำการต้องไม่เกิน ${MAX_BUSINESS_DAYS.toLocaleString('th-TH')} วัน`);
  const step = count >= 0 ? 1 : -1;
  let remaining = Math.abs(count);
  let current = iso;

  while (remaining > 0) {
    current = addDays(current, step);
    if (isBusinessDay(current, cal, region)) remaining -= 1;
  }
  return current;
}
