import { daysBetweenDates, isLeapYear, parseIsoDate, weekdayIndex } from '@/lib/date';

export const BE_OFFSET = 543;

export const THAI_MONTHS = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
] as const;

export const THAI_MONTHS_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

export const THAI_WEEKDAYS = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์'] as const;

/** สีประจำวันตามคติไทย เรียงตาม THAI_WEEKDAYS */
export const THAI_DAY_COLORS = ['แดง', 'เหลือง', 'ชมพู', 'เขียว', 'ส้ม', 'ฟ้า', 'ม่วง'] as const;

export interface ThaiDateInfo {
  iso: string;
  day: number;
  month: number;
  monthName: string;
  monthShort: string;
  ceYear: number;
  beYear: number;
  weekdayIndex: number;
  weekdayName: string;
  dayColor: string;
  dayOfYear: number;
  isLeapYear: boolean;
  fullThai: string;
  shortThai: string;
}

function assertYear(year: number, label: string): void {
  if (!Number.isInteger(year)) throw new Error(`${label}ต้องเป็นจำนวนเต็ม`);
  if (year < 1) throw new Error(`${label}ต้องมากกว่า 0`);
}

export function toBuddhistYear(ce: number): number {
  assertYear(ce, 'ปี ค.ศ.');
  if (ce > 9999) throw new Error('รองรับปี ค.ศ. 1–9999');
  return ce + BE_OFFSET;
}

export function toChristianYear(be: number): number {
  assertYear(be, 'ปี พ.ศ.');
  const ce = be - BE_OFFSET;
  if (ce > 9999) throw new Error('รองรับปี พ.ศ. 544–10542');
  if (ce < 1) throw new Error('ปี พ.ศ. ต้องมากกว่า 543');
  return ce;
}

export function describeDate(iso: string): ThaiDateInfo {
  parseIsoDate(iso); // ตรวจความถูกต้องของวันที่
  const ceYear = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const wd = weekdayIndex(iso);
  const monthName = THAI_MONTHS[month - 1];
  const monthShort = THAI_MONTHS_SHORT[month - 1];
  const beYear = ceYear + BE_OFFSET;

  return {
    iso,
    day,
    month,
    monthName,
    monthShort,
    ceYear,
    beYear,
    weekdayIndex: wd,
    weekdayName: THAI_WEEKDAYS[wd],
    dayColor: THAI_DAY_COLORS[wd],
    dayOfYear: daysBetweenDates(`${ceYear}-01-01`, iso) + 1,
    isLeapYear: isLeapYear(ceYear),
    fullThai: `วัน${THAI_WEEKDAYS[wd]}ที่ ${day} ${monthName} พ.ศ. ${beYear}`,
    shortThai: `${day} ${monthShort} ${beYear}`,
  };
}

export interface FormatOptions {
  era?: 'be' | 'ce';
  style?: 'full' | 'medium' | 'short';
}

export function formatThaiDate(iso: string, opts: FormatOptions = {}): string {
  const { era = 'be', style = 'full' } = opts;
  const d = describeDate(iso);
  const year = era === 'be' ? d.beYear : d.ceYear;
  if (style === 'short') return `${d.day} ${d.monthShort} ${year}`;
  if (style === 'medium') return `${d.day} ${d.monthName} ${year}`;
  return `วัน${d.weekdayName}ที่ ${d.day} ${d.monthName} ${era === 'be' ? 'พ.ศ.' : 'ค.ศ.'} ${year}`;
}
