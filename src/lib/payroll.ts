/** ลูกจ้างรายเดือน: ม.68 ใช้เงินเดือน/(30 × ชั่วโมงปกติต่อวัน)
 * ตัวหารต่ำกว่า 30 เป็นสิทธิเพิ่มเติมจากนายจ้าง */

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
  holidayWork: 'ทำงานในเวลาปกติของวันหยุด',
  holidayOt: 'OT ในวันหยุด (3 เท่า)',
};

export interface WageBase {
  /** ได้ค่าจ้างวันหยุดอยู่แล้วในเงินเดือน: จ่ายเพิ่มอย่างน้อย 1 เท่า */
  paidHoliday?: boolean;
  /** เงินเดือน (บาท) */
  monthlySalary: number;
  /** จำนวนวันทำงานที่ใช้เป็นฐานคิดค่าจ้างต่อเดือน */
  workDaysPerMonth: number;
  /** ชั่วโมงทำงานปกติต่อวัน */
  hoursPerDay: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertBase(base: WageBase): void {
  if (!Number.isFinite(base.monthlySalary) || base.monthlySalary < 0)
    throw new Error('เงินเดือนต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(base.workDaysPerMonth) || base.workDaysPerMonth <= 0)
    throw new Error('จำนวนวันทำงานต่อเดือนต้องมากกว่า 0');
  if (base.workDaysPerMonth > 30) throw new Error('จำนวนวันทำงานต่อเดือนต้องไม่เกิน 30 วัน');
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
  assertBase(base);
  // คิดจากค่าจ้างต่อชั่วโมงแบบเต็มความละเอียด แล้วปัดครั้งเดียวตอนแสดง
  // ถ้าปัดค่าจ้างต่อชั่วโมงก่อนแล้วค่อยคูณ เงินเดือน 20,000 จะได้ OT สามเท่าเป็น 249.99 แทน 250
  const exactHourly = base.monthlySalary / base.workDaysPerMonth / base.hoursPerDay;
  const hourly = round2(exactHourly);
  const rows: OtLineResult[] = lines.map((line) => {
    if (!Number.isFinite(line.hours) || line.hours < 0) throw new Error('จำนวนชั่วโมงต้องเป็นตัวเลขไม่ติดลบ');
    const multiplier = line.kind === 'holidayWork' && base.paidHoliday !== false ? 1 : OT_MULTIPLIERS[line.kind];
    if (!Number.isFinite(multiplier)) throw new Error('ประเภท OT ไม่ถูกต้อง');
    return {
      ...line,
      multiplier,
      ratePerHour: round2(exactHourly * multiplier),
      amount: round2(exactHourly * multiplier * line.hours),
    };
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
