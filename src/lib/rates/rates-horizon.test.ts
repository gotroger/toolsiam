import { describe, it, expect } from 'vitest';
import { calculateNetSalary } from '@/tools/finance/net-salary/logic';
import { calculateTax } from '@/tools/finance/thai-income-tax/logic';
import { ftForBill } from '@/tools/daily/electricity-bill/logic';
import { resolveTaxYear } from './income-tax';
import { section33Contribution, wageCapAt } from './social-security';
import { calculateBill, residentialTariffsAt, VAT } from './electricity';

/**
 * ยามเฝ้าวันหมดอายุของตารางอัตรา — วันที่ล่วงหน้าราว 1 ปี
 *
 * ตารางอัตราทุกชุดที่เครื่องมือหลักใช้ต้องให้ผลลัพธ์ที่ใช้ได้ ณ วันนี้ ถ้าเทสต์นี้แดง
 * แปลว่ามีตารางที่จะหมดอายุภายในปีหน้า และหน้าเครื่องมือจะพังเมื่อถึงวันนั้น
 * (เคยเกิดมาแล้ว: net-salary พังทั้งหน้าตั้งแต่ 1 ม.ค. 2570 เพราะรับเฉพาะปีภาษี 2568/2569)
 *
 * ค่า Ft ปรับทุก 4 เดือน จึงไม่ตรวจว่ามีงวดจริง — ตรวจเพียงว่าหน้าเครื่องมือยังคิดได้ด้วยค่าชั่วคราว
 */
const HORIZON = '2027-09-25';

describe(`ตารางอัตรายังใช้ได้ ณ ${HORIZON}`, () => {
  it('ภาษีเงินได้: ปีภาษีหาได้ และคำนวณได้', () => {
    const { taxYear } = resolveTaxYear(Number(HORIZON.slice(0, 4)));
    const r = calculateTax({
      annualIncome: 600_000,
      taxYear,
      hasSpouseNoIncome: false,
      children: 0,
      childrenBorn2018Plus: 0,
      parents: 0,
      socialSecurity: 10_500,
      lifeInsurance: 0,
      healthInsurance: 0,
      retirementFunds: 0,
      thaiEsg: 0,
      homeLoanInterest: 0,
      donations: 0,
      otherDeductions: 0,
      withheldTax: 0,
    });
    expect(r.tax).toBeGreaterThan(0);
  });

  it('ประกันสังคม ม.33: มีเพดานค่าจ้างและคิดเงินสมทบได้', () => {
    expect(wageCapAt(HORIZON).maxBase).toBeGreaterThan(0);
    expect(section33Contribution(30_000, HORIZON).employee).toBeGreaterThan(0);
  });

  it('เงินเดือนสุทธิ: คำนวณได้ไม่ error', () => {
    const r = calculateNetSalary({
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
      asOf: HORIZON,
    });
    expect(r.netMonthly).toBeGreaterThan(0);
  });

  it('ค่าไฟ: มีอัตราฐาน ค่า Ft (อย่างน้อยค่าชั่วคราว) และ VAT ยังไม่หมดอายุ', () => {
    for (const utility of ['mea', 'pea'] as const) {
      const tariffs = residentialTariffsAt(utility, HORIZON);
      expect(tariffs).not.toBeNull();
      const ft = ftForBill(HORIZON);
      expect(ft).not.toBeNull();
      expect(calculateBill(200, tariffs![1], ft!.period.ratePerUnit, VAT.rate).total).toBeGreaterThan(0);
    }
    expect(VAT.effectiveTo >= HORIZON).toBe(true);
  });
});
