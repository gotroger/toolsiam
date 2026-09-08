import { MIN_TENURE_DAYS, NO_SEVERANCE_REASONS, SEVERANCE_BANDS, severanceBandFor, type SeveranceBand } from '@/lib/rates/severance';
import { daysBetweenDates } from '@/lib/date';

export type { SeveranceBand };
export { MIN_TENURE_DAYS, NO_SEVERANCE_REASONS, SEVERANCE_BANDS };

/**
 * ตัวหารที่ใช้แปลงเงินเดือนเป็นค่าจ้างรายวัน
 *
 * กฎหมายพูดค่าชดเชยเป็น "จำนวนวันของค่าจ้างอัตราสุดท้าย" แต่ **ไม่ได้กำหนดตัวหารไว้**
 * สำหรับลูกจ้างรายเดือน — ที่ทำงานแต่ละแห่งใช้ต่างกัน และนี่คือจุดที่ผลลัพธ์
 * ต่างจากที่ผู้ใช้คาดมากที่สุด จึงต้องให้เลือกเองพร้อมอธิบาย
 */
export const DAILY_WAGE_DIVISORS = [30, 26] as const;
export type DailyWageDivisor = (typeof DAILY_WAGE_DIVISORS)[number];

export interface SeveranceInput {
  /** ค่าจ้างอัตราสุดท้ายต่อเดือน */
  monthlySalary: number;
  startDate: string;
  /** วันสุดท้ายของการทำงาน */
  endDate: string;
  divisor: DailyWageDivisor;
}

export interface SeveranceResult {
  tenureDays: number;
  tenureYears: number;
  dailyWage: number;
  /** null = อายุงานไม่ถึง 120 วัน จึงไม่มีสิทธิ */
  band: SeveranceBand | null;
  payDays: number;
  amount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function calculateSeverance(input: SeveranceInput): SeveranceResult {
  if (!Number.isFinite(input.monthlySalary) || input.monthlySalary < 0) {
    throw new Error('ค่าจ้างต้องเป็นตัวเลขไม่ติดลบ');
  }
  const tenureDays = daysBetweenDates(input.startDate, input.endDate);
  if (tenureDays < 0) throw new Error('วันเริ่มงานต้องไม่อยู่หลังวันสุดท้ายของการทำงาน');

  const dailyWage = round2(input.monthlySalary / input.divisor);
  const band = severanceBandFor(tenureDays);
  const payDays = band?.payDays ?? 0;

  return {
    tenureDays,
    tenureYears: Math.round((tenureDays / 365) * 100) / 100,
    dailyWage,
    band,
    payDays,
    amount: round2(dailyWage * payDays),
  };
}
