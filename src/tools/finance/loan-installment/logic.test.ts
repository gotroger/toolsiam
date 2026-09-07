import { describe, it, expect } from 'vitest';
import { monthlyPayment, calculateLoan } from './logic';

describe('monthlyPayment', () => {
  it('สูตร EMI มาตรฐาน: 1,000,000 บาท 6% 30 ปี ≈ 5,995.51', () => {
    expect(monthlyPayment(1_000_000, 6, 360)).toBeCloseTo(5995.51, 2);
  });
  it('ดอกเบี้ย 0% = หารเท่ากัน', () => {
    expect(monthlyPayment(120_000, 0, 12)).toBe(10_000);
  });
  it('input ผิดโยน error', () => {
    expect(() => monthlyPayment(0, 5, 12)).toThrow();
    expect(() => monthlyPayment(1000, 5, 0)).toThrow();
    expect(() => monthlyPayment(1000, -1, 12)).toThrow();
  });
});

describe('calculateLoan', () => {
  const r = calculateLoan({ principal: 1_000_000, annualRatePercent: 6, months: 360 });
  it('ตารางครบทุกงวดและงวดสุดท้ายยอดคงเหลือ 0', () => {
    expect(r.schedule).toHaveLength(360);
    expect(r.schedule[0].period).toBe(1);
    expect(r.schedule[359].balance).toBe(0);
  });
  it('งวดแรกดอกเบี้ย = เงินต้น × อัตรา/12', () => {
    expect(r.schedule[0].interest).toBe(5000);
    expect(r.schedule[0].principal).toBeCloseTo(995.51, 2);
  });
  it('ยอดรวมสอดคล้องกัน', () => {
    expect(r.totalPayment).toBeCloseTo(r.totalInterest + 1_000_000, 0);
    expect(r.totalInterest).toBeGreaterThan(1_100_000);
    expect(r.totalInterest).toBeLessThan(1_200_000);
  });
  it('ดอกเบี้ย 0% ไม่มีดอกเบี้ยเลย', () => {
    const z = calculateLoan({ principal: 12_000, annualRatePercent: 0, months: 12 });
    expect(z.totalInterest).toBe(0);
    expect(z.schedule.every((row) => row.interest === 0)).toBe(true);
  });
  it('ปิดยอดก่อนครบงวดแล้วไม่มีแถวศูนย์ต่อท้าย', () => {
    const r = calculateLoan({ principal: 1_000, annualRatePercent: 4.5, months: 480 });
    expect(r.schedule.length).toBeLessThanOrEqual(480);
    expect(r.schedule[r.schedule.length - 1].balance).toBe(0);
    expect(r.schedule.every((row) => row.payment > 0)).toBe(true);
    expect(r.schedule.filter((row) => row.balance === 0)).toHaveLength(1);
  });
});
