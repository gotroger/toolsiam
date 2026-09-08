import { describe, it, expect } from 'vitest';
import { carLoan, COMMON_TERMS } from './logic';

const base = { price: 800_000, downPayment: 160_000, flatRate: 0.0299, months: 60 };

describe('ผ่อนรถดอกเบี้ยคงที่', () => {
  it('ดอกเบี้ยคิดจากยอดจัดเต็มจำนวนตลอดสัญญา', () => {
    const r = carLoan(base);
    expect(r.financed).toBe(640_000);
    expect(r.downPercent).toBe(20);
    // 640,000 × 2.99% × 5 ปี = 95,680
    expect(r.totalInterest).toBe(95_680);
    expect(r.monthlyPayment).toBeCloseTo(12_261.33, 1);
  });

  it('อัตราคงที่ต่ำกว่าความเป็นจริงเสมอ — เทียบเท่าลดต้นลดดอกที่สูงเกือบสองเท่า', () => {
    const r = carLoan(base);
    expect(r.effectiveAnnualRate).toBeGreaterThan(base.flatRate * 1.7);
    expect(r.effectiveAnnualRate).toBeLessThan(base.flatRate * 2);
  });

  it('ดอกเบี้ยรวมแปรผันตรงกับยอดจัด ไม่ใช่กับเงินดาวน์', () => {
    const low = carLoan(base);                                   // จัด 640,000
    const high = carLoan({ ...base, downPayment: 320_000 });      // จัด 480,000
    expect(high.totalInterest / low.totalInterest).toBeCloseTo(480_000 / 640_000, 6);
  });

  it('ผ่อนนานขึ้นจ่ายดอกเบี้ยรวมมากขึ้น แม้ค่างวดจะน้อยลง', () => {
    const short = carLoan({ ...base, months: 36 });
    const long = carLoan({ ...base, months: 84 });
    expect(long.monthlyPayment).toBeLessThan(short.monthlyPayment);
    expect(long.totalInterest).toBeGreaterThan(short.totalInterest);
  });

  it('เสนอจำนวนงวดที่ไฟแนนซ์ไทยใช้จริง', () => {
    expect(COMMON_TERMS).toContain(48);
    expect(COMMON_TERMS.at(-1)).toBe(84);
  });

  it('ปฏิเสธเงินดาวน์เต็มจำนวนและอัตราที่กรอกเป็นเปอร์เซ็นต์', () => {
    expect(() => carLoan({ ...base, downPayment: 800_000 })).toThrow('น้อยกว่าราคาเต็ม');
    expect(() => carLoan({ ...base, flatRate: 2.99 })).toThrow('ทศนิยม');
  });
});
