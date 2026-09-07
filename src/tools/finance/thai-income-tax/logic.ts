/** อัตราภาษีเงินได้บุคคลธรรมดา (ขั้นบันได) ปีภาษี 2568 */
export const TAX_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 150_000, rate: 0 },
  { upTo: 300_000, rate: 0.05 },
  { upTo: 500_000, rate: 0.1 },
  { upTo: 750_000, rate: 0.15 },
  { upTo: 1_000_000, rate: 0.2 },
  { upTo: 2_000_000, rate: 0.25 },
  { upTo: 5_000_000, rate: 0.3 },
  { upTo: Infinity, rate: 0.35 },
];

/** เพดานลดหย่อน ปีภาษี 2568 — แก้ที่นี่ที่เดียวเมื่อกฎเปลี่ยน */
export const TAX_LIMITS = {
  expenseRate: 0.5,
  expenseCap: 100_000,
  personal: 60_000,
  spouse: 60_000,
  child: 30_000,
  childBorn2018Plus: 60_000,
  parent: 30_000,
  parentMax: 4,
  socialSecurityCap: 9_000,
  lifeInsuranceCap: 100_000,     // ประกันชีวิต + สุขภาพ รวมกันไม่เกิน
  healthInsuranceCap: 25_000,
  retirementCap: 500_000,        // PVD + RMF + ประกันบำนาญ + กบข./กอช. รวม
  thaiEsgCap: 300_000,
  homeLoanCap: 100_000,
  donationRate: 0.1,
} as const;

export interface TaxInput {
  /** เงินได้ 40(1)/(2) รวมทั้งปี */
  annualIncome: number;
  hasSpouseNoIncome: boolean;
  /** บุตรที่ลดหย่อนได้ 30,000 */
  children: number;
  /** บุตรคนที่ 2 ขึ้นไปที่เกิดตั้งแต่ปี 2561 ลดหย่อน 60,000 */
  childrenBorn2018Plus: number;
  parents: number;
  socialSecurity: number;
  lifeInsurance: number;
  healthInsurance: number;
  retirementFunds: number;
  /** Thai ESG / ESGX (สูงสุด 300,000 แยกจากกองทุนเกษียณ) */
  thaiEsg: number;
  homeLoanInterest: number;
  donations: number;
  /** ลดหย่อนอื่นที่กรอกเอง (เช่น Easy E-Receipt) ใช้ตามที่กรอก */
  otherDeductions: number;
  withheldTax: number;
}

export interface TaxBracketLine {
  from: number;
  to: number;
  rate: number;
  taxable: number;
  tax: number;
}

export interface TaxResult {
  expense: number;
  allowances: number;
  donationUsed: number;
  netIncome: number;
  tax: number;
  effectiveRate: number;
  lines: TaxBracketLine[];
  /** บวก = ต้องชำระเพิ่ม, ลบ = ได้คืน */
  balance: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, cap: number) => Math.min(Math.max(n, 0), cap);

export function progressiveTax(netIncome: number): { tax: number; lines: TaxBracketLine[] } {
  const lines: TaxBracketLine[] = [];
  let prev = 0;
  let tax = 0;
  for (const b of TAX_BRACKETS) {
    if (netIncome <= prev) break;
    const taxable = Math.min(netIncome, b.upTo) - prev;
    const t = round2(taxable * b.rate);
    lines.push({ from: prev, to: b.upTo, rate: b.rate, taxable, tax: t });
    tax = round2(tax + t);
    prev = b.upTo;
  }
  return { tax, lines };
}

export function calculateTax(input: TaxInput): TaxResult {
  const income = input.annualIncome;
  if (!Number.isFinite(income) || income < 0) throw new Error('เงินได้ต้องเป็นตัวเลขไม่ติดลบ');
  const L = TAX_LIMITS;

  const expense = Math.min(income * L.expenseRate, L.expenseCap);

  const insurance = Math.min(clamp(input.lifeInsurance, L.lifeInsuranceCap) + clamp(input.healthInsurance, L.healthInsuranceCap), L.lifeInsuranceCap);
  const allowances =
    L.personal +
    (input.hasSpouseNoIncome ? L.spouse : 0) +
    Math.max(0, input.children) * L.child +
    Math.max(0, input.childrenBorn2018Plus) * L.childBorn2018Plus +
    Math.min(Math.max(0, input.parents), L.parentMax) * L.parent +
    clamp(input.socialSecurity, L.socialSecurityCap) +
    insurance +
    clamp(input.retirementFunds, L.retirementCap) +
    clamp(input.thaiEsg, L.thaiEsgCap) +
    clamp(input.homeLoanInterest, L.homeLoanCap) +
    Math.max(0, input.otherDeductions);

  const beforeDonation = Math.max(0, income - expense - allowances);
  const donationUsed = Math.min(Math.max(0, input.donations), beforeDonation * L.donationRate);
  const netIncome = round2(beforeDonation - donationUsed);

  const { tax, lines } = progressiveTax(netIncome);
  return {
    expense,
    allowances,
    donationUsed,
    netIncome,
    tax,
    effectiveRate: income > 0 ? tax / income : 0,
    lines,
    balance: round2(tax - Math.max(0, input.withheldTax)),
  };
}
