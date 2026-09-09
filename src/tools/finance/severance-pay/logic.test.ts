import { describe, it, expect } from 'vitest';
import { calculateSeverance } from './logic';

const base = { monthlySalary: 30_000, startDate: '2020-01-01', endDate: '2026-01-01', divisor: 30 as const };

describe('ค่าชดเชยเลิกจ้าง', () => {
  it('อายุงาน 6 ปีพอดี ได้ 240 วันของค่าจ้าง', () => {
    const r = calculateSeverance(base);
    expect(r.dailyWage).toBe(1_000);
    expect(r.payDays).toBe(240);
    expect(r.amount).toBe(240_000);
  });

  it('ทำงานไม่ถึง 120 วัน ไม่มีสิทธิ', () => {
    const r = calculateSeverance({ ...base, startDate: '2025-11-01', endDate: '2026-01-01' });
    expect(r.band).toBeNull();
    expect(r.amount).toBe(0);
  });

  it('ครบ 120 วันพอดีได้ 30 วัน', () => {
    const r = calculateSeverance({ ...base, startDate: '2025-09-04', endDate: '2026-01-01' });
    expect(r.tenureDays).toBe(120);
    expect(r.payDays).toBe(30);
  });

  it('อายุงาน 1 ปีพอดีได้ 90 วัน ไม่ใช่ 30', () => {
    const r = calculateSeverance({ ...base, startDate: '2025-01-01', endDate: '2026-01-01' });
    expect(r.payDays).toBe(90);
  });

  it('อายุงาน 20 ปีขึ้นไปได้ 400 วัน', () => {
    const r = calculateSeverance({ ...base, startDate: '2000-01-01', endDate: '2026-01-01' });
    expect(r.payDays).toBe(400);
    expect(r.amount).toBe(400_000);
  });

  it('ตัวหารค่าจ้างรายวันเปลี่ยนผลลัพธ์อย่างมีนัยสำคัญ', () => {
    const d30 = calculateSeverance(base).amount;
    const d26 = calculateSeverance({ ...base, divisor: 26 }).amount;
    expect(d26).toBeGreaterThan(d30);
    expect(d26 / d30).toBeCloseTo(30 / 26, 3);
  });

  it('ปฏิเสธวันเริ่มงานที่อยู่หลังวันสุดท้าย และค่าจ้างติดลบ', () => {
    expect(() => calculateSeverance({ ...base, startDate: '2026-02-01' })).toThrow('วันเริ่มงาน');
    expect(() => calculateSeverance({ ...base, monthlySalary: -1 })).toThrow('ค่าจ้าง');
  });
});
