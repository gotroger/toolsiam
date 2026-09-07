import { describe, it, expect } from 'vitest';
import {
  MS_PER_DAY, parseIsoDate, toIsoDate, daysBetweenDates, addDays,
  weekdayIndex, isWeekend, daysInMonth, isLeapYear, countWeekends,
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

  it('ปี 0001–0099 ต้องไม่ถูกเลื่อนไปเป็นคริสต์ศตวรรษที่ 20', () => {
    expect(toIsoDate(parseIsoDate('0050-06-15'))).toBe('0050-06-15');
    expect(toIsoDate(parseIsoDate('0001-01-01'))).toBe('0001-01-01');
    expect(new Date(parseIsoDate('0050-06-15')).getUTCFullYear()).toBe(50);
    expect(new Date(parseIsoDate('0001-01-01')).getUTCFullYear()).toBe(1);
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

describe('countWeekends', () => {
  it('มกราคม 2569 ทั้งเดือน = เสาร์-อาทิตย์ 9 วัน (จันทร์-ศุกร์ 22 วัน)', () => {
    const weekend = countWeekends('2026-01-01', '2026-01-31');
    expect(weekend).toBe(9);
    expect(31 - weekend).toBe(22);
  });

  it('วันเดียวกัน', () => {
    expect(countWeekends('2026-09-08', '2026-09-08')).toBe(0); // อังคาร
    expect(countWeekends('2026-05-31', '2026-05-31')).toBe(1); // อาทิตย์
    expect(countWeekends('2026-12-05', '2026-12-05')).toBe(1); // เสาร์
  });

  it('สลับลำดับวันได้ผลเท่ากัน', () => {
    expect(countWeekends('2026-01-31', '2026-01-01')).toBe(countWeekends('2026-01-01', '2026-01-31'));
  });

  it('ตรงกับการนับทีละวันทุกวันเริ่มต้นในสัปดาห์ และความยาว 0–14 วัน', () => {
    // 2026-01-04 คือวันอาทิตย์ จึงครอบคลุมวันเริ่มต้นครบทั้ง 7 วันในสัปดาห์
    for (let s = 0; s < 7; s++) {
      const from = addDays('2026-01-04', s);
      expect(weekdayIndex(from)).toBe(s);
      for (let len = 0; len <= 14; len++) {
        const to = addDays(from, len);
        let brute = 0;
        for (let i = 0; i <= len; i++) if (isWeekend(addDays(from, i))) brute += 1;
        expect(countWeekends(from, to)).toBe(brute);
      }
    }
  });

  it('ช่วงยาวหลายพันปีคำนวณได้ทันทีโดยไม่วนลูปตามจำนวนวัน', () => {
    expect(countWeekends('2026-01-01', '9999-12-31')).toBe(832_126);
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
