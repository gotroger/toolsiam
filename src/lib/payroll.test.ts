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
    expect(() => hourlyWage({ ...base, workDaysPerMonth: 40 })).toThrow('ไม่เกิน 30');
    expect(() => hourlyWage({ ...base, hoursPerDay: 25 })).toThrow('ไม่เกิน 24');
    expect(() => hourlyWage({ ...base, monthlySalary: -1 })).toThrow();
  });
});

describe('ค่าล่วงเวลา', () => {
  it('อัตราคูณตรงตามกฎหมาย 1.5 / 2 / 3', () => {
    expect(OT_MULTIPLIERS).toEqual({ workdayOt: 1.5, holidayWork: 2, holidayOt: 3 });
  });

  it('ผู้ไม่มีสิทธิค่าจ้างวันหยุด: คิดแยกประเภทแล้วรวมยอด', () => {
    const r = calculateOt({ ...base, paidHoliday: false }, [
      { kind: 'workdayOt', hours: 10 },
      { kind: 'holidayWork', hours: 8 },
      { kind: 'holidayOt', hours: 2 },
    ]);
    expect(r.lines[0].ratePerHour).toBe(93.75);
    expect(r.lines[0].amount).toBe(937.5);
    expect(r.lines[1].amount).toBe(1000); // 62.50 × 2 × 8
    expect(r.lines[2].amount).toBe(375); // 62.50 × 3 × 2
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

describe('การปัดเศษของค่าล่วงเวลา', () => {
  it('เงินเดือนที่หารไม่ลงตัวยังได้อัตราคูณที่ถูกต้อง ไม่เพี้ยนเป็น 249.99', () => {
    // 20,000 ÷ 30 ÷ 8 = 83.333… ถ้าปัดเป็น 83.33 ก่อนคูณสาม จะได้ 249.99
    const r = calculateOt({ monthlySalary: 20_000, workDaysPerMonth: 30, hoursPerDay: 8 }, [
      { kind: 'holidayOt', hours: 1 },
    ]);
    expect(r.hourly).toBe(83.33);
    expect(r.lines[0].ratePerHour).toBe(250);
    expect(r.lines[0].amount).toBe(250);
  });

  it('เงินเดือน 25,000 ได้ OT 1.5 เท่าเป็น 156.25 ไม่ใช่ 156.26', () => {
    const r = calculateOt({ monthlySalary: 25_000, workDaysPerMonth: 30, hoursPerDay: 8 }, [
      { kind: 'workdayOt', hours: 1 },
    ]);
    expect(r.lines[0].ratePerHour).toBe(156.25);
  });

  it('ยังปฏิเสธฐานที่เป็นไปไม่ได้แม้ไม่มีบรรทัด OT เลย', () => {
    expect(() => calculateOt({ monthlySalary: 20_000, workDaysPerMonth: 0, hoursPerDay: 8 }, [])).toThrow();
  });
});
