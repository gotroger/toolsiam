import { daysBetween, isWeekend, shiftDate, type DateSpan, type ShiftUnit } from '@/lib/date';
import { describeDate, formatThaiDate } from '@/lib/thai-date';

export type { DateSpan, ShiftUnit };

export interface ShiftResult {
  /** วันที่ผลลัพธ์ YYYY-MM-DD */
  date: string;
  /** "วันอังคารที่ 8 กันยายน พ.ศ. 2569" */
  fullThai: string;
  weekdayName: string;
  isWeekend: boolean;
  buddhistYear: number;
}

export function describeResult(iso: string): ShiftResult {
  const d = describeDate(iso);
  return {
    date: iso,
    fullThai: formatThaiDate(iso),
    weekdayName: d.weekdayName,
    isWeekend: isWeekend(iso),
    buddhistYear: d.beYear,
  };
}

/**
 * บวก (direction = 1) หรือลบ (direction = −1) แล้วบรรยายวันที่ผลลัพธ์
 *
 * จำนวนรับเฉพาะค่าไม่ติดลบ เพราะทิศทาง "นับไปข้างหน้า/ย้อนหลัง" เป็นตัวเลือกแยกบน UI
 * — ถ้ายอมรับค่าติดลบด้วย ผู้ใช้ที่พิมพ์ −30 พร้อมเลือก "ย้อนหลัง" จะได้วันที่ไปข้างหน้าโดยไม่รู้ตัว
 */
export function shiftAndDescribe(iso: string, amount: number, unit: ShiftUnit, direction: 1 | -1): ShiftResult {
  if (!Number.isFinite(amount) || amount < 0) throw new Error('จำนวนต้องเป็นตัวเลขไม่ติดลบ — เลือกทิศทางนับไปข้างหน้าหรือย้อนหลังด้านบนแทน');
  return describeResult(shiftDate(iso, amount * direction, unit));
}

export { daysBetween };
