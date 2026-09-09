export interface CompoundInput {
  principal: number;
  /** เงินฝากเพิ่มทุกสิ้นเดือน */
  monthlyDeposit: number;
  /** อัตราต่อปีแบบทศนิยม เช่น 0.05 = 5% */
  annualRate: number;
  years: number;
  /** จำนวนครั้งที่ทบต้นต่อปี เช่น 12 = รายเดือน, 1 = รายปี */
  compoundsPerYear: number;
}

export interface CompoundYearRow {
  year: number;
  /** เงินฝากสะสมถึงสิ้นปีนั้น (ไม่รวมเงินต้น) */
  deposits: number;
  /** ดอกเบี้ยสะสมถึงสิ้นปีนั้น */
  interest: number;
  balance: number;
}

export interface CompoundResult {
  futureValue: number;
  totalDeposits: number;
  totalInterest: number;
  rows: CompoundYearRow[];
}

export interface GoalInput {
  goal: number;
  principal: number;
  annualRate: number;
  years: number;
  compoundsPerYear: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** อัตราผลตอบแทนต่อเดือนที่เทียบเท่าการทบต้น n ครั้งต่อปี */
function monthlyRate(annualRate: number, compoundsPerYear: number): number {
  if (annualRate === 0) return 0;
  return Math.expm1(Math.log1p(annualRate / compoundsPerYear) * (compoundsPerYear / 12));
}

function validate(principal: number, annualRate: number, years: number, compoundsPerYear: number): void {
  if (!Number.isFinite(principal) || principal < 0) throw new Error('เงินต้นต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error('อัตราดอกเบี้ยต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(years) || years <= 0) throw new Error('จำนวนปีต้องมากกว่า 0');
  if (Math.round(years * 12) < 1) throw new Error('ระยะเวลาต้องอย่างน้อย 1 เดือน');
  if (years > 100) throw new Error('จำนวนปีต้องไม่เกิน 100 ปี');
  if (!Number.isFinite(compoundsPerYear) || compoundsPerYear <= 0) throw new Error('จำนวนครั้งที่ทบต้นต้องมากกว่า 0');
}

export function compoundGrowth(input: CompoundInput): CompoundResult {
  validate(input.principal, input.annualRate, input.years, input.compoundsPerYear);
  if (!Number.isFinite(input.monthlyDeposit) || input.monthlyDeposit < 0)
    throw new Error('เงินฝากเพิ่มต้องเป็นตัวเลขไม่ติดลบ');
  const deposit = input.monthlyDeposit;
  const m = monthlyRate(input.annualRate, input.compoundsPerYear);
  const months = Math.round(input.years * 12);

  let balance = input.principal;
  let deposits = 0;
  const rows: CompoundYearRow[] = [];

  for (let i = 1; i <= months; i++) {
    balance = balance * (1 + m) + deposit;
    if (!Number.isFinite(balance * 100)) throw new Error('ผลลัพธ์สูงเกินช่วงคำนวณ กรุณาลดอัตราหรือระยะเวลา');
    deposits += deposit;
    if (i % 12 === 0 || i === months) {
      const roundedBalance = round2(balance);
      const roundedDeposits = round2(deposits);
      rows.push({
        year: Math.ceil(i / 12),
        deposits: roundedDeposits,
        interest: round2(roundedBalance - input.principal - roundedDeposits),
        balance: roundedBalance,
      });
    }
  }

  const futureValue = round2(balance);
  const totalDeposits = round2(deposits);
  return {
    futureValue,
    totalDeposits,
    totalInterest: round2(futureValue - input.principal - totalDeposits),
    rows,
  };
}

/** เงินที่ต้องฝากทุกเดือนเพื่อให้ถึงเป้าหมาย */
export function monthlyForGoal(input: GoalInput): number {
  validate(input.principal, input.annualRate, input.years, input.compoundsPerYear);
  if (!Number.isFinite(input.goal) || input.goal < 0) throw new Error('เป้าหมายต้องเป็นตัวเลขไม่ติดลบ');

  const m = monthlyRate(input.annualRate, input.compoundsPerYear);
  const n = Math.round(input.years * 12);
  const grownPrincipal = input.principal * (1 + m) ** n;
  if (!Number.isFinite(grownPrincipal)) throw new Error('ผลลัพธ์สูงเกินช่วงคำนวณ');
  const need = input.goal - grownPrincipal;
  if (need <= 0) return 0;
  // เงินฝากสิ้นงวด: FV = PMT × ((1+m)^n − 1) / m
  const factor = m === 0 ? n : Math.expm1(n * Math.log1p(m)) / m;
  if (!Number.isFinite(factor) || factor <= 0) throw new Error('ผลลัพธ์อยู่นอกช่วงคำนวณ');
  return Math.ceil((need / factor) * 100) / 100;
}
