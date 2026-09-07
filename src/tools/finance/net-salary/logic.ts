import { calculateTax } from '@/tools/finance/thai-income-tax/logic';

/** ประกันสังคมมาตรา 33 — ลูกจ้างส่ง 5% ของค่าจ้าง ฐาน 1,650–15,000 บาท/เดือน */
export const SSO = {
  rate: 0.05,
  minBase: 1_650,
  maxBase: 15_000,
  monthlyCap: 750,
  yearlyCap: 9_000,
} as const;

export interface NetSalaryInput {
  /** เงินเดือนต่อเดือน (ก่อนหัก) */
  monthlySalary: number;
  /** โบนัส/เงินได้อื่นรวมทั้งปี */
  bonus: number;
  hasSocialSecurity: boolean;
  hasSpouseNoIncome: boolean;
  children: number;
  parents: number;
  /** ลดหย่อนอื่นรวมทั้งปี (ประกันชีวิต กองทุน ดอกเบี้ยบ้าน ฯลฯ) */
  otherDeductions: number;
}

export interface NetSalaryResult {
  annualIncome: number;
  ssoMonthly: number;
  ssoYearly: number;
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

export function ssoMonthly(monthlySalary: number): number {
  if (!Number.isFinite(monthlySalary) || monthlySalary <= 0) return 0;
  const capped = Math.min(Math.max(monthlySalary, SSO.minBase), SSO.maxBase);
  return Math.round(capped * SSO.rate);
}

export function calculateNetSalary(input: NetSalaryInput): NetSalaryResult {
  if (!Number.isFinite(input.monthlySalary) || input.monthlySalary < 0) {
    throw new Error('เงินเดือนต้องเป็นตัวเลขไม่ติดลบ');
  }
  const bonus = Math.max(0, input.bonus);
  const annualIncome = round2(input.monthlySalary * 12 + bonus);

  const sso = input.hasSocialSecurity ? ssoMonthly(input.monthlySalary) : 0;
  const ssoYearly = Math.min(sso * 12, SSO.yearlyCap);

  const tax = calculateTax({
    annualIncome,
    hasSpouseNoIncome: input.hasSpouseNoIncome,
    children: Math.max(0, input.children),
    childrenBorn2018Plus: 0,
    parents: Math.max(0, input.parents),
    socialSecurity: ssoYearly,
    lifeInsurance: 0,
    healthInsurance: 0,
    retirementFunds: 0,
    thaiEsg: 0,
    homeLoanInterest: 0,
    donations: 0,
    otherDeductions: Math.max(0, input.otherDeductions),
    withheldTax: 0,
  });

  const monthlyTax = round2(tax.tax / 12);
  return {
    annualIncome,
    ssoMonthly: sso,
    ssoYearly,
    netIncome: tax.netIncome,
    annualTax: tax.tax,
    monthlyTax,
    netMonthly: round2(input.monthlySalary - sso - monthlyTax),
    netYearly: round2(annualIncome - ssoYearly - tax.tax),
    effectiveRate: tax.effectiveRate,
  };
}
