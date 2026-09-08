import { describe, it, expect } from 'vitest';
import { calculateOt, dailyWage, hourlyWage, OT_MULTIPLIERS } from './payroll';

const base = { monthlySalary: 15_000, workDaysPerMonth: 30, hoursPerDay: 8 };

describe('ฐานค่าจ้าง', () => {
  it('เงินเดือน 15,000 ฐาน 30 วัน 8 ชม. → วันละ 500 ชั่วโมงละ 62.50', () => {
    expect(dailyWage(base)).toBe(500);
    expect(hourlyWage(base)).toBe(62.5);
  });

  it('เปลี่ยนฐานเป็น 26 วันแล้วค่าจ้างต่อชั่วโมงสูงขึ้น', () => {
    expect(hourlyWage({ ...base, workDaysPerMonth: 26 })).toBeGreaterThan(hourlyWage(base));
  });

  it('ปฏิเสธฐานที่เป็นไปไม่ได้', () => {
    expect(() => hourlyWage({ ...base, workDaysPerMonth: 0 })).toThrow();
    expect(() => hourlyWage({ ...base, workDaysPerMonth: 40 })).toThrow('ไม่เกิน 31');
    expect(() => hourlyWage({ ...base, hoursPerDay: 25 })).toThrow('ไม่เกิน 24');
    expect(() => hourlyWage({ ...base, monthlySalary: -1 })).toThrow();
  });
});

describe('ค่าล่วงเวลา', () => {
  it('อัตราคูณตรงตามกฎหมาย 1.5 / 2 / 3', () => {
    expect(OT_MULTIPLIERS).toEqual({ workdayOt: 1.5, holidayWork: 2, holidayOt: 3 });
  });

  it('คิดแต่ละประเภทแยกบรรทัดแล้วรวมยอด', () => {
    const r = calculateOt(base, [
      { kind: 'workdayOt', hours: 10 },
      { kind: 'holidayWork', hours: 8 },
      { kind: 'holidayOt', hours: 2 },
    ]);
    expect(r.lines[0].ratePerHour).toBe(93.75);
    expect(r.lines[0].amount).toBe(937.5);
    expect(r.lines[1].amount).toBe(1000);   // 62.50 × 2 × 8
    expect(r.lines[2].amount).toBe(375);    // 62.50 × 3 × 2
    expect(r.totalHours).toBe(20);
    expect(r.totalOt).toBe(2312.5);
    expect(r.grossWithOt).toBe(17_312.5);
  });

  it('ไม่มี OT เลยได้ยอดเท่าเงินเดือน', () => {
    const r = calculateOt(base, [{ kind: 'workdayOt', hours: 0 }]);
    expect(r.totalOt).toBe(0);
    expect(r.grossWithOt).toBe(15_000);
  });

  it('ปฏิเสธชั่วโมงติดลบ', () => {
    expect(() => calculateOt(base, [{ kind: 'workdayOt', hours: -1 }])).toThrow();
  });
});
