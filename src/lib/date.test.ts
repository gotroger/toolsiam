import { describe, it, expect } from 'vitest';
import {
  MS_PER_DAY, parseIsoDate, toIsoDate, daysBetweenDates, addDays,
  weekdayIndex, isWeekend, daysInMonth, isLeapYear,
} from './date';

describe('parseIsoDate', () => {
  it('แปลงเป็น UTC timestamp', () => {
    expect(parseIsoDate('2026-09-08')).toBe(Date.UTC(2026, 8, 8));
  });

  it('ปฏิเสธรูปแบบที่ไม่ใช่ YYYY-MM-DD', () => {
    expect(() => parseIsoDate('8/9/2026')).toThrow();
    expect(() => parseIsoDate('2026-9-8')).toThrow();
    expect(() => parseIsoDate('')).toThrow();
  });

  it('ปฏิเสธวันที่ที่ไม่มีอยู่จริง', () => {
    expect(() => parseIsoDate('2026-02-30')).toThrow();
    expect(() => parseIsoDate('2026-13-01')).toThrow();
    expect(() => parseIsoDate('2026-02-29')).toThrow(); // 2026 ไม่ใช่ปีอธิกสุรทิน
    expect(parseIsoDate('2024-02-29')).toBe(Date.UTC(2024, 1, 29));
  });
});

describe('toIsoDate', () => {
  it('กลับเป็นสตริงเดิม', () => {
    expect(toIsoDate(parseIsoDate('2026-01-05'))).toBe('2026-01-05');
  });
});

describe('daysBetweenDates / addDays', () => {
  it('นับผลต่างเป็นจำนวนวัน (b − a)', () => {
    expect(daysBetweenDates('2026-01-01', '2026-01-31')).toBe(30);
    expect(daysBetweenDates('2026-01-31', '2026-01-01')).toBe(-30);
    expect(daysBetweenDates('1990-05-15', '2026-09-08')).toBe(13_265);
  });

  it('บวก/ลบวันข้ามเดือนและข้ามปีได้', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(addDays('2026-09-08', 0)).toBe('2026-09-08');
  });

  it('MS_PER_DAY ถูกต้อง', () => {
    expect(MS_PER_DAY).toBe(86_400_000);
  });
});

describe('weekdayIndex / isWeekend', () => {
  it('0 = อาทิตย์ ถึง 6 = เสาร์ (คิดแบบ UTC)', () => {
    expect(weekdayIndex('2026-09-08')).toBe(2); // อังคาร
    expect(weekdayIndex('2026-05-31')).toBe(0); // อาทิตย์
    expect(weekdayIndex('2026-12-05')).toBe(6); // เสาร์
  });

  it('เสาร์-อาทิตย์เป็นวันหยุดสุดสัปดาห์', () => {
    expect(isWeekend('2026-05-31')).toBe(true);
    expect(isWeekend('2026-12-05')).toBe(true);
    expect(isWeekend('2026-09-08')).toBe(false);
  });
});

describe('daysInMonth / isLeapYear', () => {
  it('จำนวนวันในเดือน', () => {
    expect(daysInMonth(2026, 1)).toBe(31);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 4)).toBe(30);
  });

  it('ปีอธิกสุรทิน', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(isLeapYear(1900)).toBe(false);
  });
});
