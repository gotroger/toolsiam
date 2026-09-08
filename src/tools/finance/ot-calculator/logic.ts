import { calculateOt, dailyWage, hourlyWage, OT_LABEL, OT_MULTIPLIERS, type OtKind, type OtLine, type OtResult, type WageBase } from '@/lib/payroll';

export type { OtKind, OtLine, OtResult, WageBase };
export { calculateOt, dailyWage, hourlyWage, OT_LABEL, OT_MULTIPLIERS };

export const OT_KINDS: OtKind[] = ['workdayOt', 'holidayWork', 'holidayOt'];

/** ฐานจำนวนวันทำงานต่อเดือนที่ที่ทำงานไทยใช้กันจริง — ไม่มีค่าใดถูกต้องกว่าค่าอื่นโดยอัตโนมัติ */
export const COMMON_WORK_DAYS = [30, 26, 22, 21.75] as const;
