import { describe, it, expect } from 'vitest';
import { homeLoan } from './logic';

const base = { price: 3_000_000, downPayment: 300_000, years: 30, promoRate: 0.0299, promoMonths: 36, afterRate: 0.0665 };

describe('ผ่อนบ้าน', () => {
  it('ค่างวดขั้นต่ำคิดจากอัตราที่สูงที่สุด ไม่ใช่อัตราโปรโมชัน — ไม่งั้นหนี้ไม่มีวันหมด', () => {
    const r = homeLoan(base);
    const withoutPromo = homeLoan({ ...base, promoMonths: 0 });
    expect(r.principal).toBe(2_700_000);
    expect(r.minimumPayment).toBe(withoutPromo.minimumPayment);
    expect(r.minimumPayment).toBeCloseTo(17_333.05, 0);
  });

  it('ช่วงโปรโมชันตัดเงินต้นได้มากกว่า ทำให้ผ่อนหมดก่อนกำหนด', () => {
    const r = homeLoan(base);
    expect(r.rows[0].annualRate).toBe(0.0299);
    expect(r.rows[36].annualRate).toBe(0.0665);
    expect(r.monthsSaved).toBeGreaterThan(0);
    expect(r.rows.at(-1)!.balance).toBe(0);
  });

  it('อัตราเดียวตลอดสัญญาผ่อนหมดพอดีตามกำหนด', () => {
    const r = homeLoan({ ...base, promoMonths: 0 });
    expect(r.monthsSaved).toBe(0);
    expect(r.months).toBe(360);
    expect(r.rows.at(-1)!.balance).toBe(0);
  });

  it('ผ่อนเพิ่มทุกเดือนทำให้หมดเร็วขึ้นและประหยัดดอกเบี้ย', () => {
    const normal = homeLoan(base);
    const extra = homeLoan({ ...base, extraPayment: 5_000 });
    expect(extra.payment).toBe(normal.minimumPayment + 5_000);
    expect(extra.months).toBeLessThan(normal.months);
    expect(extra.interestSaved).toBeGreaterThan(0);
    expect(normal.interestSaved).toBe(0);
  });

  it('แนะนำรายได้ขั้นต่ำจากเกณฑ์ภาระหนี้ 40% ของค่างวดขั้นต่ำ', () => {
    const r = homeLoan(base);
    expect(r.suggestedIncome).toBeCloseTo(r.minimumPayment / 0.4, 1);
  });

  it('โปรโมชันยาวกว่าสัญญาถูกหนีบไว้ที่ความยาวสัญญา', () => {
    const r = homeLoan({ ...base, years: 2, promoMonths: 120 });
    expect(r.rows.every((row) => row.annualRate === base.promoRate)).toBe(true);
  });

  it('ดอกเบี้ยรวมน้อยกว่าเมื่อมีช่วงโปรโมชัน', () => {
    expect(homeLoan(base).totalInterest).toBeLessThan(homeLoan({ ...base, promoMonths: 0 }).totalInterest);
  });

  it('ปฏิเสธเงินดาวน์ที่มากกว่าราคาบ้าน และระยะเวลาที่เป็นไปไม่ได้', () => {
    expect(() => homeLoan({ ...base, downPayment: 3_000_000 })).toThrow('น้อยกว่าราคาบ้าน');
    expect(() => homeLoan({ ...base, years: 50 })).toThrow('ไม่เกิน 40 ปี');
    expect(() => homeLoan({ ...base, years: 0 })).toThrow();
  });
});
