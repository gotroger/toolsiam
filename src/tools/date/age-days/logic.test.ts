import { describe, it, expect } from 'vitest';
import { calculateAge } from './logic';

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
