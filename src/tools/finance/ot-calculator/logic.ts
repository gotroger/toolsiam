import {
  calculateOt,
  dailyWage,
  hourlyWage,
  OT_LABEL,
  OT_MULTIPLIERS,
  type OtKind,
  type OtLine,
  type OtResult,
  type WageBase,
} from '@/lib/payroll';

export type { OtKind, OtLine, OtResult, WageBase };
export { calculateOt, dailyWage, hourlyWage, OT_LABEL, OT_MULTIPLIERS };

export const OT_KINDS: OtKind[] = ['workdayOt', 'holidayWork', 'holidayOt'];

/** มาตรา 68 ใช้ 30 วัน; ค่าอื่นสำหรับจำลองสิทธิเพิ่มเติมของนายจ้าง */
export const COMMON_WORK_DAYS = [30, 26, 22, 21.75] as const;
