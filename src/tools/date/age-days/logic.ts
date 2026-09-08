import { dateDiffParts, daysBetweenDates, isLeapYear, parseIsoDate, type DiffParts } from '@/lib/date';

export type { DiffParts };

export interface AgeResult extends DiffParts {
  /** จำนวนวันทั้งหมดตั้งแต่วันเกิดถึงวันอ้างอิง */
  totalDays: number;
  totalWeeks: number;
  totalMonths: number;
  /** YYYY-MM-DD ของวันเกิดครั้งถัดไป (ถ้าวันนี้เป็นวันเกิด = วันนี้) */
  nextBirthday: string;
  daysToNextBirthday: number;
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
