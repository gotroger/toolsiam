import { addDays, daysBetweenDates, isWeekend, parseIsoDate } from '@/lib/date';
import { HOLIDAYS_2569, type Holiday } from './data';

export type { Holiday };
export { HOLIDAYS_2569 };

/** ปฏิทินที่รองรับ: ธนาคาร (ตามประกาศ ธปท.) หรือ ราชการ (ตามมติ ครม.) */
export type HolidayCalendar = 'bank' | 'government';
export type HolidayRegion = 'national' | 'bangkok';

export const COVERED_YEAR = { be: 2569, ce: 2026 } as const;

export interface BusinessDaySpan {
  totalDays: number;
  businessDays: number;
  weekendDays: number;
  /** วันหยุดนักขัตฤกษ์ที่ตรงวันจันทร์–ศุกร์ */
  holidayDays: number;
  holidays: Holiday[];
}

function assertCovered(iso: string): void {
  parseIsoDate(iso);
  if (Number(iso.slice(0, 4)) !== COVERED_YEAR.ce) {
    throw new Error(`ขณะนี้รองรับเฉพาะวันที่ในปี พ.ศ. ${COVERED_YEAR.be} (ค.ศ. ${COVERED_YEAR.ce})`);
  }
}

export function listHolidays(cal: HolidayCalendar, region: HolidayRegion = 'national'): Holiday[] {
  const holidays = HOLIDAYS_2569.filter((h) => (cal === 'bank' ? h.bank : h.government));
  if (region === 'bangkok')
    holidays.push({
      date: '2026-10-16',
      name: 'วันหยุดพิเศษเฉพาะกรุงเทพมหานคร (ประชุม IMF–World Bank)',
      government: true,
      bank: true,
      type: 'พิเศษ',
    });
  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

export function findHoliday(
  iso: string,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): Holiday | undefined {
  assertCovered(iso);
  return listHolidays(cal, region).find((h) => h.date === iso);
}

export function isBusinessDay(iso: string, cal: HolidayCalendar, region: HolidayRegion = 'national'): boolean {
  assertCovered(iso);
  return !isWeekend(iso) && findHoliday(iso, cal, region) === undefined;
}

/** นับรวมทั้งวันเริ่มต้นและวันสิ้นสุด */
export function businessDaysBetween(
  startIso: string,
  endIso: string,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): BusinessDaySpan {
  assertCovered(startIso);
  assertCovered(endIso);
  const [fromIso, toIso] = parseIsoDate(startIso) <= parseIsoDate(endIso) ? [startIso, endIso] : [endIso, startIso];

  const totalDays = daysBetweenDates(fromIso, toIso) + 1;
  let businessDays = 0;
  let weekendDays = 0;
  const holidays: Holiday[] = [];

  for (let i = 0; i < totalDays; i++) {
    const iso = addDays(fromIso, i);
    if (isWeekend(iso)) {
      weekendDays += 1;
      continue;
    }
    const holiday = findHoliday(iso, cal, region);
    if (holiday) holidays.push(holiday);
    else businessDays += 1;
  }

  return { totalDays, businessDays, weekendDays, holidayDays: holidays.length, holidays };
}

/** เดินไปข้างหน้า (หรือถอยหลังถ้าติดลบ) ตามจำนวนวันทำการ */
export function addBusinessDays(
  iso: string,
  count: number,
  cal: HolidayCalendar,
  region: HolidayRegion = 'national',
): string {
  assertCovered(iso);
  if (!Number.isInteger(count)) throw new Error('จำนวนวันทำการต้องเป็นจำนวนเต็ม');
  const step = count >= 0 ? 1 : -1;
  let remaining = Math.abs(count);
  let current = iso;

  while (remaining > 0) {
    current = addDays(current, step);
    assertCovered(current);
    if (isBusinessDay(current, cal, region)) remaining -= 1;
  }
  return current;
}
