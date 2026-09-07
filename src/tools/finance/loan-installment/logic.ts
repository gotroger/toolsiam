export interface LoanInput {
  principal: number;
  annualRatePercent: number;
  months: number;
}
export interface LoanRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
}
export interface LoanResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
  schedule: LoanRow[];
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertInput(principal: number, annualRatePercent: number, months: number) {
  if (!(principal > 0)) throw new Error('เงินต้นต้องมากกว่า 0');
  if (!(months >= 1) || !Number.isInteger(months)) throw new Error('จำนวนงวดต้องเป็นจำนวนเต็มอย่างน้อย 1');
  if (!(annualRatePercent >= 0)) throw new Error('อัตราดอกเบี้ยต้องไม่ติดลบ');
}

/** ค่างวดต่อเดือน (สูตร EMI, ดอกเบี้ยลดต้นลดดอก) — ยังไม่ปัดเศษ */
export function monthlyPayment(principal: number, annualRatePercent: number, months: number): number {
  assertInput(principal, annualRatePercent, months);
  const r = annualRatePercent / 100 / 12;
  if (r === 0) return principal / months;
  return (principal * r) / (1 - Math.pow(1 + r, -months));
}

export function calculateLoan(input: LoanInput): LoanResult {
  const { principal, annualRatePercent, months } = input;
  const pay = round2(monthlyPayment(principal, annualRatePercent, months));
  const r = annualRatePercent / 100 / 12;
  const schedule: LoanRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPayment = 0;

  for (let period = 1; period <= months; period++) {
    const interest = round2(balance * r);
    let principalPart = round2(pay - interest);
    let payment = pay;
    if (period === months || principalPart > balance) {
      principalPart = round2(balance); // งวดสุดท้ายปิดยอดพอดี
      payment = round2(principalPart + interest);
    }
    balance = round2(balance - principalPart);
    totalInterest = round2(totalInterest + interest);
    totalPayment = round2(totalPayment + payment);
    schedule.push({ period, payment, interest, principal: principalPart, balance });
    if (balance === 0) break;
  }

  return { monthlyPayment: pay, totalPayment, totalInterest, schedule };
}
