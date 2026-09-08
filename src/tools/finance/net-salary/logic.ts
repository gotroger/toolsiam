import { calculateTax } from '@/tools/finance/thai-income-tax/logic';
import { section33Contribution } from '@/lib/rates/social-security';
import { TAX_LIMITS } from '@/lib/rates/income-tax';

/**
 * เงินเดือนสุทธิ — ประกอบจากสองเครื่องมือที่เป็นเจ้าของกฎจริง
 *   ประกันสังคม  → src/lib/rates/social-security.ts
 *   ภาษี         → thai-income-tax/logic.ts ซึ่งอ่านจาก src/lib/rates/income-tax.ts
 * เครื่องมือนี้จึงไม่มีอัตราของตัวเองเลย และไม่มีทางหลุดจากกันเมื่ออัตราเปลี่ยน
 */

export interface NetSalaryInput {
  /** เงินเดือนต่อเดือน (ก่อนหัก) */
  monthlySalary: number;
  /** โบนัสรวมทั้งปี */
  bonus: number;
  /** รายได้เสริมอื่นรวมทั้งปี เช่น OT ค่าคอมมิชชั่น */
  otherIncome: number;
  hasSocialSecurity: boolean;
  hasSpouseNoIncome: boolean;
  children: number;
  parents: number;
  lifeInsurance: number;
  retirementFunds: number;
  homeLoanInterest: number;
  /** ลดหย่อนอื่นรวมทั้งปีที่ผู้ใช้กรอกเอง */
  otherDeductions: number;
  /** วันที่ใช้เลือกเพดานค่าจ้างประกันสังคมที่มีผล */
  asOf: string;
}

export interface NetSalaryResult {
  annualIncome: number;
  ssoMonthly: number;
  ssoYearly: number;
  /** ยอดประกันสังคมที่ใช้ลดหย่อนได้จริงหลังหนีบเพดานของสรรพากร */
  ssoDeductible: number;
  expense: number;
  allowances: number;
  /** เงินได้สุทธิที่ใช้คำนวณภาษี */
  netIncome: number;
  annualTax: number;
  monthlyTax: number;
  netMonthly: number;
  netYearly: number;
  /** ภาษีทั้งปี ÷ เงินได้ทั้งปี */
  effectiveRate: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const nonNegative = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

export function calculateNetSalary(input: NetSalaryInput): NetSalaryResult {
  if (!Number.isFinite(input.monthlySalary) || input.monthlySalary < 0) {
    throw new Error('เงินเดือนต้องเป็นตัวเลขไม่ติดลบ');
  }
  const bonus = nonNegative(input.bonus);
  const otherIncome = nonNegative(input.otherIncome);
  const annualIncome = round2(input.monthlySalary * 12 + bonus + otherIncome);

  const sso = input.hasSocialSecurity ? section33Contribution(input.monthlySalary, input.asOf).employee : 0;
  const ssoYearly = round2(sso * 12);
  // เพดานลดหย่อนของสรรพากรต่ำกว่าเงินสมทบจริงหลังเพดานค่าจ้างขึ้นเป็น 17,500
  const ssoDeductible = Math.min(ssoYearly, TAX_LIMITS.socialSecurityCap);

  const tax = calculateTax({
    annualIncome,
    hasSpouseNoIncome: input.hasSpouseNoIncome,
    children: nonNegative(input.children),
    childrenBorn2018Plus: 0,
    parents: nonNegative(input.parents),
    socialSecurity: ssoDeductible,
    lifeInsurance: nonNegative(input.lifeInsurance),
    healthInsurance: 0,
    retirementFunds: nonNegative(input.retirementFunds),
    thaiEsg: 0,
    homeLoanInterest: nonNegative(input.homeLoanInterest),
    donations: 0,
    otherDeductions: nonNegative(input.otherDeductions),
    withheldTax: 0,
  });

  const monthlyTax = round2(tax.tax / 12);
  return {
    annualIncome,
    ssoMonthly: sso,
    ssoYearly,
    ssoDeductible,
    expense: tax.expense,
    allowances: tax.allowances,
    netIncome: tax.netIncome,
    annualTax: tax.tax,
    monthlyTax,
    netMonthly: round2(input.monthlySalary - sso - monthlyTax),
    netYearly: round2(annualIncome - ssoYearly - tax.tax),
    effectiveRate: tax.effectiveRate,
  };
}
