import { describe, it, expect } from 'vitest';
import {
  BE_OFFSET, THAI_MONTHS, THAI_WEEKDAYS, THAI_DAY_COLORS,
  toBuddhistYear, toChristianYear, describeDate, formatThaiDate,
} from './logic';

describe('แปลงปี', () => {
  it('ค.ศ. → พ.ศ. บวก 543', () => {
    expect(BE_OFFSET).toBe(543);
    expect(toBuddhistYear(2026)).toBe(2569);
    expect(toBuddhistYear(1990)).toBe(2533);
  });

  it('พ.ศ. → ค.ศ. ลบ 543', () => {
    expect(toChristianYear(2569)).toBe(2026);
    expect(toChristianYear(2533)).toBe(1990);
  });

  it('แปลงไปกลับได้ค่าเดิม', () => {
    expect(toChristianYear(toBuddhistYear(2026))).toBe(2026);
  });

  it('ปีที่ไม่ใช่จำนวนเต็มหรือน้อยกว่า 1 → error', () => {
    expect(() => toBuddhistYear(2026.5)).toThrow();
    expect(() => toChristianYear(0)).toThrow();
    expect(() => toChristianYear(543)).toThrow(); // จะได้ ค.ศ. 0 ซึ่งไม่มีอยู่
  });
});

describe('ตารางชื่อภาษาไทย', () => {
  it('มีครบ 12 เดือน และ 7 วัน', () => {
    expect(THAI_MONTHS).toHaveLength(12);
    expect(THAI_MONTHS[0]).toBe('มกราคม');
    expect(THAI_MONTHS[11]).toBe('ธันวาคม');
    expect(THAI_WEEKDAYS).toHaveLength(7);
    expect(THAI_WEEKDAYS[0]).toBe('อาทิตย์');
    expect(THAI_DAY_COLORS).toHaveLength(7);
    expect(THAI_DAY_COLORS[0]).toBe('แดง');
  });
});

describe('describeDate', () => {
  it('8 กันยายน 2026 = วันอังคารที่ 8 กันยายน พ.ศ. 2569', () => {
    const d = describeDate('2026-09-08');
    expect(d.day).toBe(8);
    expect(d.month).toBe(9);
    expect(d.monthName).toBe('กันยายน');
    expect(d.monthShort).toBe('ก.ย.');
    expect(d.ceYear).toBe(2026);
    expect(d.beYear).toBe(2569);
    expect(d.weekdayIndex).toBe(2);
    expect(d.weekdayName).toBe('อังคาร');
    expect(d.dayColor).toBe('ชมพู');
    expect(d.dayOfYear).toBe(251);
    expect(d.isLeapYear).toBe(false);
    expect(d.fullThai).toBe('วันอังคารที่ 8 กันยายน พ.ศ. 2569');
    expect(d.shortThai).toBe('8 ก.ย. 2569');
  });

  it('วันอาทิตย์สีแดง และวันเสาร์สีม่วง', () => {
    expect(describeDate('2026-05-31').weekdayName).toBe('อาทิตย์');
    expect(describeDate('2026-05-31').dayColor).toBe('แดง');
    expect(describeDate('2026-12-05').weekdayName).toBe('เสาร์');
    expect(describeDate('2026-12-05').dayColor).toBe('ม่วง');
  });

  it('วันแรกและวันสุดท้ายของปี', () => {
    expect(describeDate('2026-01-01').dayOfYear).toBe(1);
    expect(describeDate('2026-12-31').dayOfYear).toBe(365);
    expect(describeDate('2024-12-31').dayOfYear).toBe(366);
  });

  it('วันที่ไม่ถูกต้อง → error', () => {
    expect(() => describeDate('2026-02-29')).toThrow();
  });
});

describe('formatThaiDate', () => {
  it('ค่าเริ่มต้นเป็นแบบเต็ม พ.ศ.', () => {
    expect(formatThaiDate('2026-09-08')).toBe('วันอังคารที่ 8 กันยายน พ.ศ. 2569');
  });

  it('เลือก ค.ศ. ได้', () => {
    expect(formatThaiDate('2026-09-08', { era: 'ce' })).toBe('วันอังคารที่ 8 กันยายน ค.ศ. 2026');
  });

  it('แบบสั้นและแบบกลาง', () => {
    expect(formatThaiDate('2026-09-08', { style: 'short' })).toBe('8 ก.ย. 2569');
    expect(formatThaiDate('2026-09-08', { style: 'medium' })).toBe('8 กันยายน 2569');
  });
});
