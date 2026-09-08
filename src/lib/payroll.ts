/**
 * ค่าจ้างรายชั่วโมงและค่าล่วงเวลา (§10.2)
 *
 * พ.ร.บ.คุ้มครองแรงงาน พ.ศ. 2541 กำหนด "อัตราคูณ" ไว้ (1.5 / 2 / 3 เท่า) แต่ไม่ได้กำหนด
 * จำนวนวันทำงานต่อเดือนตายตัว — ลูกจ้างรายเดือนแต่ละที่ใช้ฐาน 30 วันบ้าง 26 วันบ้าง
 * เครื่องมือจึงต้องให้ผู้ใช้กรอกวัน/ชั่วโมงเอง และห้าม hardcode ฐานใดฐานหนึ่งเป็นความจริง
 */

/** อัตราคูณค่าล่วงเวลาตามกฎหมายคุ้มครองแรงงาน */
export const OT_MULTIPLIERS = {
  /** ทำเกินเวลาทำงานปกติในวันทำงาน */
  workdayOt: 1.5,
  /** ทำงานในวันหยุด สำหรับลูกจ้างที่ไม่ได้รับค่าจ้างในวันหยุด */
  holidayWork: 2,
  /** ทำเกินเวลาทำงานปกติในวันหยุด */
  holidayOt: 3,
} as const;

export type OtKind = keyof typeof OT_MULTIPLIERS;

export const OT_LABEL: Record<OtKind, string> = {
  workdayOt: 'OT วันทำงานปกติ (1.5 เท่า)',
  holidayWork: 'ทำงานวันหยุด (2 เท่า)',
  holidayOt: 'OT ในวันหยุด (3 เท่า)',
};

export interface WageBase {
  /** เงินเดือน (บาท) */
  monthlySalary: number;
  /** จำนวนวันทำงานที่ใช้เป็นฐานคิดค่าจ้างต่อเดือน */
  workDaysPerMonth: number;
  /** ชั่วโมงทำงานปกติต่อวัน */
  hoursPerDay: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertBase(base: WageBase): void {
  if (!Number.isFinite(base.monthlySalary) || base.monthlySalary < 0) throw new Error('เงินเดือนต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(base.workDaysPerMonth) || base.workDaysPerMonth <= 0) throw new Error('จำนวนวันทำงานต่อเดือนต้องมากกว่า 0');
  if (base.workDaysPerMonth > 31) throw new Error('จำนวนวันทำงานต่อเดือนต้องไม่เกิน 31 วัน');
  if (!Number.isFinite(base.hoursPerDay) || base.hoursPerDay <= 0) throw new Error('ชั่วโมงทำงานต่อวันต้องมากกว่า 0');
  if (base.hoursPerDay > 24) throw new Error('ชั่วโมงทำงานต่อวันต้องไม่เกิน 24 ชั่วโมง');
}

export function dailyWage(base: WageBase): number {
  assertBase(base);
  return round2(base.monthlySalary / base.workDaysPerMonth);
}

export function hourlyWage(base: WageBase): number {
  assertBase(base);
  return round2(base.monthlySalary / base.workDaysPerMonth / base.hoursPerDay);
}

export interface OtLine {
  kind: OtKind;
  hours: number;
}

export interface OtLineResult extends OtLine {
  multiplier: number;
  /** ค่าจ้างต่อชั่วโมง × ตัวคูณ */
  ratePerHour: number;
  amount: number;
}

export interface OtResult {
  hourly: number;
  daily: number;
  lines: OtLineResult[];
  totalHours: number;
  totalOt: number;
  /** เงินเดือน + ค่าล่วงเวลาทั้งหมด (ยังไม่หักภาษีและประกันสังคม) */
  grossWithOt: number;
}

export function calculateOt(base: WageBase, lines: OtLine[]): OtResult {
  const hourly = hourlyWage(base);
  const rows: OtLineResult[] = lines.map((line) => {
    if (!Number.isFinite(line.hours) || line.hours < 0) throw new Error('จำนวนชั่วโมงต้องเป็นตัวเลขไม่ติดลบ');
    const multiplier = OT_MULTIPLIERS[line.kind];
    const ratePerHour = round2(hourly * multiplier);
    return { ...line, multiplier, ratePerHour, amount: round2(ratePerHour * line.hours) };
  });

  const totalOt = round2(rows.reduce((sum, r) => sum + r.amount, 0));
  return {
    hourly,
    daily: dailyWage(base),
    lines: rows,
    totalHours: round2(rows.reduce((sum, r) => sum + r.hours, 0)),
    totalOt,
    grossWithOt: round2(base.monthlySalary + totalOt),
  };
}
