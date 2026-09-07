import { describe, it, expect } from 'vitest';
import { compoundGrowth, monthlyForGoal } from './logic';

describe('compoundGrowth', () => {
  it('ดอกเบี้ย 0% → ยอดสุดท้ายเท่ากับเงินต้นบวกเงินฝากรวม', () => {
    const r = compoundGrowth({ principal: 100_000, monthlyDeposit: 1_000, annualRate: 0, years: 1, compoundsPerYear: 12 });
    expect(r.futureValue).toBe(112_000);
    expect(r.totalDeposits).toBe(12_000);
    expect(r.totalInterest).toBe(0);
  });

  it('ทบต้นรายเดือน 12% ต่อปี 1 ปี ไม่มีเงินฝากเพิ่ม', () => {
    const r = compoundGrowth({ principal: 100_000, monthlyDeposit: 0, annualRate: 0.12, years: 1, compoundsPerYear: 12 });
    expect(r.futureValue).toBe(112_682.5);
    expect(r.totalInterest).toBe(12_682.5);
  });

  it('มีตารางรายปีครบตามจำนวนปี และยอดปีสุดท้ายเท่ากับ futureValue', () => {
    const r = compoundGrowth({ principal: 10_000, monthlyDeposit: 500, annualRate: 0.05, years: 3, compoundsPerYear: 12 });
    expect(r.rows).toHaveLength(3);
    expect(r.rows[0].year).toBe(1);
    expect(r.rows[2].balance).toBe(r.futureValue);
    expect(r.rows[2].balance).toBeGreaterThan(r.rows[1].balance);
  });

  it('ยอดรวมดอกเบี้ย = ยอดสุดท้าย − เงินต้น − เงินฝากรวม', () => {
    const r = compoundGrowth({ principal: 50_000, monthlyDeposit: 2_000, annualRate: 0.06, years: 5, compoundsPerYear: 12 });
    expect(r.totalDeposits).toBe(120_000);
    expect(r.totalInterest).toBe(Math.round((r.futureValue - 50_000 - 120_000) * 100) / 100);
  });

  it('จำนวนปีต้องมากกว่า 0', () => {
    expect(() => compoundGrowth({ principal: 1, monthlyDeposit: 0, annualRate: 0.05, years: 0, compoundsPerYear: 12 })).toThrow();
  });

  it('จำนวนปีต้องไม่เกิน 100 ปี', () => {
    expect(() => compoundGrowth({ principal: 1, monthlyDeposit: 0, annualRate: 0.05, years: 101, compoundsPerYear: 12 })).toThrow();
    expect(() => compoundGrowth({ principal: 1, monthlyDeposit: 0, annualRate: 0.05, years: 100, compoundsPerYear: 12 })).not.toThrow();
  });

  it('เงินต้นติดลบ → error', () => {
    expect(() => compoundGrowth({ principal: -1, monthlyDeposit: 0, annualRate: 0.05, years: 1, compoundsPerYear: 12 })).toThrow();
  });
});

describe('monthlyForGoal', () => {
  it('ดอกเบี้ย 0% → (เป้าหมาย − เงินต้น) ÷ จำนวนเดือน', () => {
    expect(monthlyForGoal({ goal: 112_000, principal: 100_000, annualRate: 0, years: 1, compoundsPerYear: 12 })).toBe(1_000);
  });

  it('ฝากตามที่คำนวณได้ แล้วโตถึงเป้าหมายพอดี', () => {
    const args = { goal: 1_000_000, principal: 100_000, annualRate: 0.05, years: 10, compoundsPerYear: 12 };
    const pmt = monthlyForGoal(args);
    const grown = compoundGrowth({ ...args, monthlyDeposit: pmt });
    expect(grown.futureValue).toBeCloseTo(1_000_000, 0);
  });

  it('เงินต้นมากกว่าเป้าหมายแล้ว → 0', () => {
    expect(monthlyForGoal({ goal: 50_000, principal: 100_000, annualRate: 0.05, years: 5, compoundsPerYear: 12 })).toBe(0);
  });
});
