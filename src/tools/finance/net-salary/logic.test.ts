import { describe, it, expect } from 'vitest';
import { calculateNetSalary, type NetSalaryInput } from './logic';

const base: NetSalaryInput = {
  monthlySalary: 30_000,
  bonus: 0,
  otherIncome: 0,
  hasSocialSecurity: true,
  hasSpouseNoIncome: false,
  children: 0,
  parents: 0,
  lifeInsurance: 0,
  retirementFunds: 0,
  homeLoanInterest: 0,
  otherDeductions: 0,
  asOf: '2026-09-08',
};

describe('ประกันสังคมใน net-salary', () => {
  it('ใช้เพดานปัจจุบัน 17,500 บาท → หัก 875 บาท/เดือน ไม่ใช่ 750 ของเพดานเก่า', () => {
    const r = calculateNetSalary(base);
    expect(r.ssoMonthly).toBe(875);
    expect(r.ssoYearly).toBe(10_500);
  });

  it('ปี 2569 ลดหย่อนเงินสมทบตามจ่ายจริง', () => {
    const r = calculateNetSalary(base);
    expect(r.ssoDeductible).toBe(10_500);
    expect(r.ssoDeductible).toBe(r.ssoYearly);
  });

  it('ใช้เพดานเดิมเมื่อคำนวณย้อนหลังก่อนวันมีผล', () => {
    expect(calculateNetSalary({ ...base, asOf: '2025-06-01' }).ssoMonthly).toBe(750);
  });

  it('เงินเดือนต่ำกว่าเพดานคิดจากค่าจ้างจริง', () => {
    expect(calculateNetSalary({ ...base, monthlySalary: 12_000 }).ssoMonthly).toBe(600);
  });

  it('ไม่ส่งประกันสังคม → ไม่หักและไม่ได้ลดหย่อน', () => {
    const r = calculateNetSalary({ ...base, hasSocialSecurity: false });
    expect(r.ssoMonthly).toBe(0);
    expect(r.ssoDeductible).toBe(0);
    expect(r.netIncome).toBe(200_000);
  });
});

describe('เงินเดือนสุทธิ', () => {
  it('เงินเดือน 30,000 ไม่มีลดหย่อนอื่น', () => {
    const r = calculateNetSalary(base);
    expect(r.annualIncome).toBe(360_000);
    expect(r.expense).toBe(100_000);
    expect(r.netIncome).toBe(189_500); // 360,000 − 100,000 − (60,000 + 10,500)
    expect(r.annualTax).toBe(1_975);
    expect(r.netMonthly).toBe(28_960.42);
  });

  it('โบนัสและรายได้เสริมเพิ่มเงินได้ทั้งปี แต่ไม่เพิ่มเงินเดือนรายเดือน', () => {
    const r = calculateNetSalary({ ...base, bonus: 60_000, otherIncome: 24_000 });
    expect(r.annualIncome).toBe(444_000);
    expect(r.ssoMonthly).toBe(875);
    expect(r.annualTax).toBeGreaterThan(calculateNetSalary(base).annualTax);
  });

  it('ค่าลดหย่อนที่เพิ่มเข้ามาใน Phase 2 ลดภาษีได้จริง', () => {
    const plain = calculateNetSalary({ ...base, monthlySalary: 60_000 });
    const withDeductions = calculateNetSalary({
      ...base,
      monthlySalary: 60_000,
      lifeInsurance: 100_000,
      retirementFunds: 100_000,
      homeLoanInterest: 50_000,
    });
    expect(withDeductions.allowances).toBeGreaterThan(plain.allowances);
    expect(withDeductions.annualTax).toBeLessThan(plain.annualTax);
  });

  it('เงินเดือนน้อยจนไม่ต้องเสียภาษี', () => {
    const r = calculateNetSalary({ ...base, monthlySalary: 15_000 });
    expect(r.annualTax).toBe(0);
    expect(r.effectiveRate).toBe(0);
  });

  it('ลดหย่อนคู่สมรส บุตร และบิดามารดา ทำให้ภาษีเป็นศูนย์', () => {
    expect(calculateNetSalary({ ...base, hasSpouseNoIncome: true, children: 1, parents: 2 }).annualTax).toBe(0);
  });

  it('เงินเดือนติดลบ → error', () => {
    expect(() => calculateNetSalary({ ...base, monthlySalary: -1 })).toThrow();
  });

  it('ค่า NaN ในช่องที่ไม่บังคับต้องแจ้งข้อผิดพลาด', () => {
    for (const key of [
      'bonus',
      'otherIncome',
      'children',
      'parents',
      'lifeInsurance',
      'retirementFunds',
      'homeLoanInterest',
      'otherDeductions',
    ] as const) {
      expect(() => calculateNetSalary({ ...base, [key]: NaN })).toThrow();
    }
  });
});
