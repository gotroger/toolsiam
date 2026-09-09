import {
  MIN_TENURE_DAYS,
  NO_SEVERANCE_REASONS,
  SEVERANCE_BANDS,
  severanceBandFor,
  type SeveranceBand,
} from '@/lib/rates/severance';
import { daysBetweenDates, addDays, dateDiffParts } from '@/lib/date';

export type { SeveranceBand };
export { MIN_TENURE_DAYS, NO_SEVERANCE_REASONS, SEVERANCE_BANDS };

/** ฐานรายเดือนหาร 30; ตัวหาร 26 สำหรับสิทธิที่นายจ้างให้เพิ่มเติม */
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
  const elapsedDays = daysBetweenDates(input.startDate, input.endDate);
  if (elapsedDays < 0) throw new Error('วันเริ่มงานต้องไม่อยู่หลังวันสุดท้ายของการทำงาน');

  if (!DAILY_WAGE_DIVISORS.includes(input.divisor)) throw new Error('ตัวหารต้องเป็น 30 หรือ 26');
  const tenureDays = elapsedDays + 1; // รวมวันเริ่มงานและวันสุดท้ายที่ทำงาน
  const tenureYears = dateDiffParts(input.startDate, addDays(input.endDate, 1)).years;
  const dailyWage = input.monthlySalary / input.divisor;
  const band = severanceBandFor(tenureDays, tenureYears);
  const payDays = band?.payDays ?? 0;

  return {
    tenureDays,
    tenureYears,
    dailyWage: round2(dailyWage),
    band,
    payDays,
    amount: round2(dailyWage * payDays),
  };
}
