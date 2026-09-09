import { TAX_BRACKETS, TAX_LIMITS, type TaxBracket } from '@/lib/rates/income-tax';

// อัตราและเพดานทั้งหมดอยู่ที่ src/lib/rates/income-tax.ts ที่เดียว (E6)
// เครื่องมือนี้ re-export ไว้เพื่อความเข้ากันได้ย้อนหลัง แต่ห้ามแก้ตัวเลขที่นี่
export { TAX_BRACKETS, TAX_LIMITS };
export type { TaxBracket };

export interface TaxInput {
  /** ปีภาษี ค.ศ.; รองรับ 2568–2569 */
  taxYear?: number;
  rmf?: number;
  providentFund?: number;
  pensionInsurance?: number;
  /** ยอดบริจาคจริงที่เข้าเงื่อนไขสิทธิ 2 เท่า */
  doubleDonations?: number;
  /** เงินเดือน 40(1) รวมทั้งปี */
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
  /** สิทธิกองทุนเกษียณอื่นที่ตรวจเพดานรายประเภทแล้ว ไม่รวม RMF/PVD/ประกันบำนาญที่แยกกรอก */
  retirementFunds: number;
  /** Thai ESG เท่านั้น; ESGX และสิทธิย้าย LTF ใช้ยอดสิทธิที่ตรวจแล้วใน otherDeductions */
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

  const taxYear = input.taxYear ?? 2025;
  if (![2025, 2026].includes(taxYear)) throw new Error('รองรับปีภาษี 2568 และ 2569');
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'boolean' || value === undefined) continue;
    if (!Number.isFinite(value) || value < 0) throw new Error('รายได้และค่าลดหย่อนทุกช่องต้องเป็นตัวเลขไม่ติดลบ');
    if (['children', 'childrenBorn2018Plus', 'parents'].includes(key) && !Number.isInteger(value))
      throw new Error('จำนวนบุตรและบิดามารดาต้องเป็นจำนวนเต็ม');
  }
  if (input.parents > (input.hasSpouseNoIncome ? 4 : 2))
    throw new Error('บิดามารดาสูงสุด 2 คน หรือ 4 คนเมื่อคู่สมรสไม่มีเงินได้');
  const providentFund = clamp(input.providentFund ?? 0, Math.min(income * 0.15, L.retirementCap));
  const retirement = Math.min(
    clamp(input.rmf ?? 0, income * 0.3) +
      providentFund +
      clamp(input.pensionInsurance ?? 0, Math.min(income * 0.15, L.pensionInsuranceCap)) +
      input.retirementFunds,
    L.retirementCap,
  );
  // PVD ส่วนเกิน 10,000 เป็นเงินได้ยกเว้นก่อนหักค่าใช้จ่าย (คำแนะนำ ภ.ง.ด.91)
  const expenseBase = Math.max(0, income - Math.max(0, providentFund - 10_000));
  const expense = Math.min(expenseBase * L.expenseRate, L.expenseCap);

  const insurance = Math.min(
    clamp(input.lifeInsurance, L.lifeInsuranceCap) + clamp(input.healthInsurance, L.healthInsuranceCap),
    L.lifeInsuranceCap,
  );
  const allowances =
    L.personal +
    (input.hasSpouseNoIncome ? L.spouse : 0) +
    Math.max(0, input.children) * L.child +
    Math.max(0, input.childrenBorn2018Plus) * L.childBorn2018Plus +
    Math.min(Math.max(0, input.parents), L.parentMax) * L.parent +
    clamp(input.socialSecurity, taxYear === 2026 ? 10_500 : L.socialSecurityCap) +
    insurance +
    retirement +
    clamp(input.thaiEsg, Math.min(income * 0.3, L.thaiEsgCap)) +
    clamp(input.homeLoanInterest, L.homeLoanCap) +
    Math.max(0, input.otherDeductions);

  const beforeDonation = Math.max(0, income - expense - allowances);
  const doubleUsed = Math.min((input.doubleDonations ?? 0) * 2, beforeDonation * L.donationRate);
  const donationUsed = doubleUsed + Math.min(input.donations, (beforeDonation - doubleUsed) * L.donationRate);
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
