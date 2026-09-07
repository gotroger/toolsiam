import { describe, it, expect } from 'vitest';
import { SSO, ssoMonthly, calculateNetSalary, type NetSalaryInput } from './logic';

const base: NetSalaryInput = {
  monthlySalary: 30_000,
  bonus: 0,
  hasSocialSecurity: true,
  hasSpouseNoIncome: false,
  children: 0,
  parents: 0,
  otherDeductions: 0,
};

describe('ssoMonthly', () => {
  it('5% ของเงินเดือน', () => {
    expect(ssoMonthly(10_000)).toBe(500);
  });

  it('เพดาน 750 บาท เมื่อเงินเดือนเกิน 15,000', () => {
    expect(ssoMonthly(15_000)).toBe(750);
    expect(ssoMonthly(80_000)).toBe(750);
    expect(SSO.monthlyCap).toBe(750);
  });

  it('ฐานขั้นต่ำ 1,650 บาท → 83 บาท', () => {
    expect(ssoMonthly(1_000)).toBe(83);
    expect(ssoMonthly(1_650)).toBe(83);
  });

  it('ไม่มีรายได้ → 0', () => {
    expect(ssoMonthly(0)).toBe(0);
  });
});

describe('calculateNetSalary', () => {
  it('เงินเดือน 30,000 มีประกันสังคม ไม่มีลดหย่อนอื่น', () => {
    const r = calculateNetSalary(base);
    expect(r.annualIncome).toBe(360_000);
    expect(r.ssoMonthly).toBe(750);
    expect(r.ssoYearly).toBe(9_000);
    expect(r.netIncome).toBe(191_000); // 360,000 − 100,000 (ค่าใช้จ่าย) − 69,000 (ลดหย่อน)
    expect(r.annualTax).toBe(2_050);
    expect(r.monthlyTax).toBe(170.83);
    expect(r.netMonthly).toBe(29_079.17);
  });

  it('โบนัสเพิ่มเงินได้ทั้งปีแต่ไม่เพิ่มเงินเดือนรายเดือน', () => {
    const r = calculateNetSalary({ ...base, bonus: 60_000 });
    expect(r.annualIncome).toBe(420_000);
    expect(r.ssoYearly).toBe(9_000);
    expect(r.netIncome).toBe(251_000);
    expect(r.annualTax).toBe(5_050);
    expect(r.netYearly).toBe(405_950);
  });

  it('ไม่ส่งประกันสังคม → ไม่หัก และไม่ได้ลดหย่อน', () => {
    const r = calculateNetSalary({ ...base, hasSocialSecurity: false });
    expect(r.ssoMonthly).toBe(0);
    expect(r.ssoYearly).toBe(0);
    expect(r.netIncome).toBe(200_000); // ลดหย่อนเหลือแค่ส่วนตัว 60,000
    expect(r.annualTax).toBe(2_500);
  });

  it('เงินเดือนน้อยจนไม่ต้องเสียภาษี', () => {
    const r = calculateNetSalary({ ...base, monthlySalary: 15_000 });
    expect(r.annualTax).toBe(0);
    expect(r.monthlyTax).toBe(0);
    expect(r.netMonthly).toBe(14_250);
    expect(r.effectiveRate).toBe(0);
  });

  it('ลดหย่อนคู่สมรส/บุตร/บิดามารดา ทำให้ภาษีลดลง', () => {
    const r = calculateNetSalary({ ...base, hasSpouseNoIncome: true, children: 1, parents: 2 });
    expect(r.annualTax).toBe(0);
  });

  it('เงินเดือนติดลบ → error', () => {
    expect(() => calculateNetSalary({ ...base, monthlySalary: -1 })).toThrow();
  });

  it('ค่า NaN ในโบนัส/บุตร/บิดามารดา/ลดหย่อนอื่น ให้ผลเหมือนใส่ 0', () => {
    const zero = calculateNetSalary(base);
    expect(calculateNetSalary({ ...base, bonus: NaN })).toEqual(zero);
    expect(calculateNetSalary({ ...base, children: NaN })).toEqual(zero);
    expect(calculateNetSalary({ ...base, parents: NaN })).toEqual(zero);
    expect(calculateNetSalary({ ...base, otherDeductions: NaN })).toEqual(zero);
  });
});
