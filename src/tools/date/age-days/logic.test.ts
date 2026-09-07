import { describe, it, expect } from 'vitest';
import { calculateAge, daysBetween, dateDiffParts } from './logic';

describe('dateDiffParts', () => {
  it('แยกเป็นปี/เดือน/วัน โดยยืมวันจากเดือนก่อนหน้า', () => {
    expect(dateDiffParts('1990-05-15', '2026-09-08')).toEqual({ years: 36, months: 3, days: 24 });
    expect(dateDiffParts('2026-01-01', '2026-01-31')).toEqual({ years: 0, months: 0, days: 30 });
    expect(dateDiffParts('2026-09-08', '2026-09-08')).toEqual({ years: 0, months: 0, days: 0 });
  });

  it('สลับลำดับก็ได้ผลเท่ากัน', () => {
    expect(dateDiffParts('2026-09-08', '1990-05-15')).toEqual({ years: 36, months: 3, days: 24 });
  });
});

describe('calculateAge', () => {
  it('อายุ ณ วันอ้างอิงพร้อมวันเกิดครั้งถัดไป', () => {
    const r = calculateAge('1990-05-15', '2026-09-08');
    expect(r.years).toBe(36);
    expect(r.months).toBe(3);
    expect(r.days).toBe(24);
    expect(r.totalDays).toBe(13_265);
    expect(r.totalWeeks).toBe(1_895);
    expect(r.nextBirthday).toBe('2027-05-15');
    expect(r.daysToNextBirthday).toBe(249);
  });

  it('วันเกิดวันนี้ → เหลือ 0 วัน และวันเกิดถัดไปคือวันนี้', () => {
    const r = calculateAge('2000-09-08', '2026-09-08');
    expect(r.years).toBe(26);
    expect(r.months).toBe(0);
    expect(r.days).toBe(0);
    expect(r.daysToNextBirthday).toBe(0);
    expect(r.nextBirthday).toBe('2026-09-08');
  });

  it('เกิด 29 ก.พ. ในปีที่ไม่ใช่อธิกสุรทิน → นับวันเกิดวันที่ 1 มี.ค.', () => {
    const r = calculateAge('2000-02-29', '2026-02-28');
    expect(r.years).toBe(25);
    expect(r.months).toBe(11);
    expect(r.days).toBe(30);
    expect(r.nextBirthday).toBe('2026-03-01');
    expect(r.daysToNextBirthday).toBe(1);
  });

  it('วันเกิดอยู่หลังวันอ้างอิง → error', () => {
    expect(() => calculateAge('2027-01-01', '2026-09-08')).toThrow();
  });

  it('วันที่ไม่ถูกต้อง → error', () => {
    expect(() => calculateAge('2026-02-30', '2026-09-08')).toThrow();
  });
});

describe('daysBetween', () => {
  it('นับวันในเดือนมกราคม 2569 ทั้งเดือน', () => {
    const r = daysBetween('2026-01-01', '2026-01-31');
    expect(r.days).toBe(30);
    expect(r.inclusiveDays).toBe(31);
    expect(r.weeks).toBe(4);
    expect(r.remainderDays).toBe(2);
    expect(r.weekdayCount).toBe(22);
    expect(r.weekendCount).toBe(9);
    expect(r.parts).toEqual({ years: 0, months: 0, days: 30 });
  });

  it('สลับวันเริ่ม/วันสิ้นสุดได้ผลเท่ากัน', () => {
    expect(daysBetween('2026-01-31', '2026-01-01')).toEqual(daysBetween('2026-01-01', '2026-01-31'));
  });

  it('วันเดียวกัน → 0 วัน แต่นับรวมได้ 1 วัน', () => {
    const r = daysBetween('2026-09-08', '2026-09-08');
    expect(r.days).toBe(0);
    expect(r.inclusiveDays).toBe(1);
    expect(r.weekdayCount).toBe(1);
    expect(r.weekendCount).toBe(0);
  });

  it('weekdayCount + weekendCount = inclusiveDays เสมอ', () => {
    const r = daysBetween('2026-04-01', '2026-06-30');
    expect(r.weekdayCount + r.weekendCount).toBe(r.inclusiveDays);
  });
});
