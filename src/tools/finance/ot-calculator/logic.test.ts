import { describe, it, expect } from 'vitest';
import { calculateOt, COMMON_WORK_DAYS, hourlyWage, OT_KINDS, OT_MULTIPLIERS } from './logic';

const base = { monthlySalary: 18_000, workDaysPerMonth: 30, hoursPerDay: 8 };

describe('ค่าล่วงเวลา', () => {
  it('ครอบคลุมประเภท OT ครบทั้งสามแบบตามกฎหมาย', () => {
    expect(OT_KINDS).toEqual(['workdayOt', 'holidayWork', 'holidayOt']);
    expect(OT_KINDS.map((k) => OT_MULTIPLIERS[k])).toEqual([1.5, 2, 3]);
  });

  it('เงินเดือน 18,000 ฐาน 30 วัน 8 ชม. → ชั่วโมงละ 75 บาท', () => {
    expect(hourlyWage(base)).toBe(75);
  });

  it('OT วันทำงาน 10 ชม. ได้ 1,125 บาท', () => {
    const r = calculateOt(base, [{ kind: 'workdayOt', hours: 10 }]);
    expect(r.lines[0].ratePerHour).toBe(112.5);
    expect(r.totalOt).toBe(1125);
    expect(r.grossWithOt).toBe(19_125);
  });

  it('เปลี่ยนฐานวันทำงานแล้วยอด OT เปลี่ยนตาม', () => {
    const a = calculateOt(base, [{ kind: 'workdayOt', hours: 10 }]).totalOt;
    const b = calculateOt({ ...base, workDaysPerMonth: 26 }, [{ kind: 'workdayOt', hours: 10 }]).totalOt;
    expect(b).toBeGreaterThan(a);
  });

  it('เสนอฐานวันทำงานที่ใช้กันจริงหลายแบบ ไม่ล็อกค่าเดียว', () => {
    expect(COMMON_WORK_DAYS.length).toBeGreaterThan(1);
    expect(COMMON_WORK_DAYS).toContain(30);
  });
});
