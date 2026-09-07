import { describe, it, expect } from 'vitest';
import { progressiveTax, calculateTax, TAX_LIMITS, type TaxInput } from './logic';

const base: TaxInput = {
  annualIncome: 0, hasSpouseNoIncome: false, children: 0, childrenBorn2018Plus: 0, parents: 0,
  socialSecurity: 0, lifeInsurance: 0, healthInsurance: 0, retirementFunds: 0, thaiEsg: 0, homeLoanInterest: 0,
  donations: 0, otherDeductions: 0, withheldTax: 0,
};

describe('progressiveTax', () => {
  it.each([
    [0, 0],
    [150_000, 0],
    [300_000, 7_500],
    [500_000, 27_500],
    [750_000, 65_000],
    [1_000_000, 115_000],
    [2_000_000, 365_000],
    [5_000_000, 1_265_000],
    [5_000_001, 1_265_000.35],
  ])('เงินได้สุทธิ %d → ภาษี %d', (net, tax) => {
    expect(progressiveTax(net).tax).toBeCloseTo(tax, 2);
  });
  it('แสดงบรรทัดเฉพาะขั้นที่มีเงินได้ตกอยู่', () => {
    const { lines } = progressiveTax(440_000);
    expect(lines).toHaveLength(3);
    expect(lines[2]).toMatchObject({ from: 300_000, to: 500_000, rate: 0.1, taxable: 140_000, tax: 14_000 });
  });
});

describe('calculateTax', () => {
  it('เงินได้ 300,000: หักค่าใช้จ่าย 100,000 + ส่วนตัว 60,000 → ไม่เสียภาษี', () => {
    const r = calculateTax({ ...base, annualIncome: 300_000 });
    expect(r.expense).toBe(100_000);
    expect(r.allowances).toBe(TAX_LIMITS.personal);
    expect(r.netIncome).toBe(140_000);
    expect(r.tax).toBe(0);
  });
  it('เงินได้ 600,000 ไม่มีลดหย่อนอื่น → 21,500', () => {
    const r = calculateTax({ ...base, annualIncome: 600_000 });
    expect(r.netIncome).toBe(440_000);
    expect(r.tax).toBe(21_500);
    expect(r.effectiveRate).toBeCloseTo(21_500 / 600_000, 6);
  });
  it('ค่าใช้จ่าย 50% แต่ไม่เกินเพดาน', () => {
    expect(calculateTax({ ...base, annualIncome: 150_000 }).expense).toBe(75_000);
    expect(calculateTax({ ...base, annualIncome: 400_000 }).expense).toBe(TAX_LIMITS.expenseCap);
  });
  it('ลดหย่อนถูกจำกัดเพดาน: ประกันสังคม, ประกันชีวิต+สุขภาพ, กองทุนเกษียณ, ดอกเบี้ยบ้าน, บิดามารดา', () => {
    const r = calculateTax({
      ...base, annualIncome: 3_000_000,
      socialSecurity: 20_000, lifeInsurance: 150_000, healthInsurance: 50_000,
      retirementFunds: 900_000, thaiEsg: 500_000, homeLoanInterest: 200_000, parents: 6,
    });
    const expected =
      TAX_LIMITS.personal + TAX_LIMITS.socialSecurityCap + TAX_LIMITS.lifeInsuranceCap +
      TAX_LIMITS.retirementCap + TAX_LIMITS.thaiEsgCap + TAX_LIMITS.homeLoanCap + TAX_LIMITS.parentMax * TAX_LIMITS.parent;
    expect(r.allowances).toBe(expected);
  });
  it('Thai ESG ลดหย่อนแยกจากกองทุนเกษียณ สูงสุด 300,000', () => {
    const r = calculateTax({ ...base, annualIncome: 3_000_000, retirementFunds: 500_000, thaiEsg: 300_000 });
    const expected = TAX_LIMITS.personal + TAX_LIMITS.retirementCap + TAX_LIMITS.thaiEsgCap;
    expect(r.allowances).toBe(expected);
  });
  it('คู่สมรส + บุตร 2 คน (คนที่สองเกิดหลัง 2561) + ประกันสังคม', () => {
    const r = calculateTax({ ...base, annualIncome: 1_500_000, hasSpouseNoIncome: true, children: 1, childrenBorn2018Plus: 1, socialSecurity: 9_000, lifeInsurance: 100_000 });
    // 1,500,000 - 100,000 - (60,000+60,000+30,000+60,000+9,000+100,000) = 1,081,000
    expect(r.netIncome).toBe(1_081_000);
    expect(r.tax).toBe(115_000 + 81_000 * 0.25);
  });
  it('เงินบริจาคไม่เกิน 10% ของเงินได้หลังหักค่าใช้จ่ายและลดหย่อน', () => {
    const r = calculateTax({ ...base, annualIncome: 600_000, donations: 100_000 });
    // ก่อนบริจาค 440,000 → บริจาคได้สูงสุด 44,000
    expect(r.donationUsed).toBe(44_000);
    expect(r.netIncome).toBe(396_000);
  });
  it('ยอดต้องชำระเพิ่ม/ได้คืน', () => {
    expect(calculateTax({ ...base, annualIncome: 600_000, withheldTax: 30_000 }).balance).toBe(-8_500);
    expect(calculateTax({ ...base, annualIncome: 600_000, withheldTax: 10_000 }).balance).toBe(11_500);
  });
  it('เงินได้ติดลบหรือ NaN โยน error', () => {
    expect(() => calculateTax({ ...base, annualIncome: -1 })).toThrow();
    expect(() => calculateTax({ ...base, annualIncome: NaN })).toThrow();
  });
});
