import { MS_PER_DAY, daysBetweenDates, daysInMonth, isLeapYear, isWeekend, parseIsoDate, toIsoDate } from '@/lib/date';

export interface DiffParts {
  years: number;
  months: number;
  days: number;
}

export interface AgeResult extends DiffParts {
  /** จำนวนวันทั้งหมดตั้งแต่วันเกิดถึงวันอ้างอิง */
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  /** YYYY-MM-DD ของวันเกิดครั้งถัดไป (ถ้าวันนี้เป็นวันเกิด = วันนี้) */
  nextBirthday: string;
  daysToNextBirthday: number;
}

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

/** เรียงวันที่จากน้อยไปมาก */
function order(aIso: string, bIso: string): [string, string] {
  return parseIsoDate(aIso) <= parseIsoDate(bIso) ? [aIso, bIso] : [bIso, aIso];
}

/** ผลต่างแบบปฏิทิน ยืมวันจากเดือนก่อนหน้าวันสิ้นสุดเมื่อวันไม่พอ */
export function dateDiffParts(aIso: string, bIso: string): DiffParts {
  const [startIso, endIso] = order(aIso, bIso);
  const start = new Date(parseIsoDate(startIso));
  const end = new Date(parseIsoDate(endIso));

  let years = end.getUTCFullYear() - start.getUTCFullYear();
  let months = end.getUTCMonth() - start.getUTCMonth();
  let days = end.getUTCDate() - start.getUTCDate();

  if (days < 0) {
    months -= 1;
    // จำนวนวันของเดือนก่อนหน้าเดือนของวันสิ้นสุด
    const prevMonth = end.getUTCMonth() === 0 ? 12 : end.getUTCMonth();
    const prevYear = end.getUTCMonth() === 0 ? end.getUTCFullYear() - 1 : end.getUTCFullYear();
    days += daysInMonth(prevYear, prevMonth);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** วันเกิดในปีที่กำหนด — 29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทินให้นับเป็น 1 มี.ค. */
function birthdayInYear(birthIso: string, year: number): string {
  const month = Number(birthIso.slice(5, 7));
  const day = Number(birthIso.slice(8, 10));
  if (month === 2 && day === 29 && !isLeapYear(year)) return `${year}-03-01`;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function calculateAge(birthIso: string, refIso: string): AgeResult {
  const birth = parseIsoDate(birthIso);
  const ref = parseIsoDate(refIso);
  if (birth > ref) throw new Error('วันเกิดต้องไม่อยู่หลังวันที่อ้างอิง');

  const parts = dateDiffParts(birthIso, refIso);
  const totalDays = daysBetweenDates(birthIso, refIso);

  const refYear = Number(refIso.slice(0, 4));
  let next = birthdayInYear(birthIso, refYear);
  if (parseIsoDate(next) < ref) next = birthdayInYear(birthIso, refYear + 1);

  return {
    ...parts,
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    totalMonths: parts.years * 12 + parts.months,
    nextBirthday: next,
    daysToNextBirthday: daysBetweenDates(refIso, next),
  };
}

export function daysBetween(startIso: string, endIso: string): DateSpan {
  const [fromIso, toIso] = order(startIso, endIso);
  const days = daysBetweenDates(fromIso, toIso);
  const inclusiveDays = days + 1;

  let weekendCount = 0;
  for (let t = parseIsoDate(fromIso); t <= parseIsoDate(toIso); t += MS_PER_DAY) {
    if (isWeekend(toIsoDate(t))) weekendCount += 1;
  }

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
