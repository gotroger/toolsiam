/**
 * คณิตศาสตร์สินเชื่อ — ใช้ร่วมกันโดย home-loan, car-loan, credit-card-debt และ flat-effective-rate
 *
 * มีสองระบบดอกเบี้ยที่คนไทยเจอ และคิดคนละแบบโดยสิ้นเชิง:
 *   ลดต้นลดดอก (effective)  ดอกเบี้ยคิดจากเงินต้นคงเหลือ — บ้าน สินเชื่อส่วนบุคคล บัตรเครดิต
 *   คงที่ (flat)            ดอกเบี้ยคิดจากเงินต้นเต็มตลอดสัญญา — รถยนต์ เช่าซื้อ
 * ดอกเบี้ยคงที่ 3% ต่อปี ให้ภาระจริงราว 5.5% แบบลดต้นลดดอก — เป็นที่มาของเครื่องมือแปลงอัตรา
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface AmortRow {
  period: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  /** อัตราต่อปีที่ใช้ในงวดนี้ (ทศนิยม) — ต่างกันได้เมื่อเป็นดอกเบี้ยขั้นบันได */
  annualRate: number;
}

export interface AmortResult {
  rows: AmortRow[];
  totalInterest: number;
  totalPaid: number;
  months: number;
}

function assertPositive(value: number, label: string): void {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label}ต้องมากกว่า 0`);
}

function assertRate(annualRate: number): void {
  if (!Number.isFinite(annualRate) || annualRate < 0) throw new Error('อัตราดอกเบี้ยต้องเป็นตัวเลขไม่ติดลบ');
  if (annualRate > 1) throw new Error('อัตราดอกเบี้ยต้องเป็นทศนิยม เช่น 0.05 สำหรับ 5% ต่อปี');
}

/** ค่างวดคงที่แบบลดต้นลดดอก (annuity) */
export function monthlyPayment(principal: number, annualRate: number, months: number): number {
  assertPositive(principal, 'เงินต้น');
  assertPositive(months, 'จำนวนงวด');
  assertRate(annualRate);
  const r = annualRate / 12;
  if (r === 0) return round2(principal / months);
  return round2((principal * r) / (1 - (1 + r) ** -months));
}

export interface RateStage {
  /** จำนวนเดือนที่ใช้อัตรานี้ — งวดสุดท้ายใช้ Infinity ได้ */
  months: number;
  annualRate: number;
}

/**
 * ตารางผ่อนแบบลดต้นลดดอก รองรับดอกเบี้ยขั้นบันไดแบบที่แบงก์ไทยเสนอจริง (ปี 1–3 อัตราหนึ่ง หลังจากนั้นอีกอัตราหนึ่ง)
 *
 * ค่างวดคำนวณจากอัตราของ**ขั้นแรก**เพียงครั้งเดียวแล้วคงที่ตลอดสัญญา ซึ่งตรงกับที่แบงก์ทำจริง
 * — พอขึ้นอัตราที่สูงกว่า ค่างวดเท่าเดิมแต่ตัดเงินต้นได้น้อยลง และนี่คือสาเหตุที่หนี้ลดช้ากว่าที่คนคาด
 * ถ้าค่างวดไม่พอจ่ายดอกเบี้ยของขั้นหลัง หนี้จะไม่มีวันหมด จึงต้องโยน error ไม่ใช่วนลูปไม่รู้จบ
 */
export function amortize(principal: number, stages: RateStage[], months: number, fixedPayment?: number): AmortResult {
  assertPositive(principal, 'เงินต้น');
  assertPositive(months, 'จำนวนงวด');
  if (stages.length === 0) throw new Error('ต้องมีอัตราดอกเบี้ยอย่างน้อยหนึ่งช่วง');
  for (const s of stages) assertRate(s.annualRate);

  const payment = fixedPayment ?? monthlyPayment(principal, stages[0].annualRate, months);
  if (!Number.isFinite(payment) || payment <= 0) throw new Error('ค่างวดต้องมากกว่า 0');

  const rateFor = (period: number): number => {
    let elapsed = 0;
    for (const s of stages) {
      elapsed += s.months;
      if (period <= elapsed) return s.annualRate;
    }
    return stages[stages.length - 1].annualRate;
  };

  const rows: AmortRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let period = 1; period <= months && balance > 0; period++) {
    const annualRate = rateFor(period);
    const interest = balance * (annualRate / 12);
    if (period < months && payment <= interest) {
      throw new Error('ค่างวดน้อยกว่าดอกเบี้ยของงวด ทำให้หนี้ไม่ลดลงเลย — ต้องเพิ่มค่างวดหรือยืดระยะเวลา');
    }
    // งวดสุดท้ายปิดยอดที่เหลือทั้งหมด — ค่างวดถูกปัดเป็นสตางค์ ถ้ายึดค่างวดเป๊ะ ๆ
    // จะเหลือเศษไม่กี่บาทค้างไว้ตลอดกาล · แบงก์เองก็เก็บงวดสุดท้ายไม่เท่างวดอื่น
    const isLast = period === months;
    const pay = isLast ? balance + interest : Math.min(payment, balance + interest);
    const principalPaid = pay - interest;
    balance -= principalPaid;
    totalInterest += interest;
    totalPaid += pay;

    rows.push({
      period,
      payment: round2(pay),
      interest: round2(interest),
      principal: round2(principalPaid),
      balance: round2(Math.max(0, balance)),
      annualRate,
    });
  }

  return { rows, totalInterest: round2(totalInterest), totalPaid: round2(totalPaid), months: rows.length };
}

export interface FlatLoanResult {
  /** ดอกเบี้ยรวมตลอดสัญญา = เงินต้น × อัตรา × จำนวนปี */
  totalInterest: number;
  totalPaid: number;
  monthlyPayment: number;
  /** อัตราลดต้นลดดอกที่ให้ภาระเท่ากัน */
  effectiveAnnualRate: number;
}

/**
 * สินเชื่อดอกเบี้ยคงที่ (Flat Rate) — ที่ใช้กับรถยนต์และเช่าซื้อ
 * ดอกเบี้ยคิดจากเงินต้นเต็มจำนวนตลอดสัญญา ไม่ลดตามยอดที่ผ่อนไปแล้ว
 */
export function flatLoan(principal: number, flatAnnualRate: number, months: number, downPayment = 0): FlatLoanResult {
  assertPositive(principal, 'ราคารถหรือเงินต้น');
  assertPositive(months, 'จำนวนงวด');
  assertRate(flatAnnualRate);
  if (!Number.isFinite(downPayment) || downPayment < 0) throw new Error('เงินดาวน์ต้องเป็นตัวเลขไม่ติดลบ');
  if (downPayment >= principal) throw new Error('เงินดาวน์ต้องน้อยกว่าราคาเต็ม');

  const financed = principal - downPayment;
  const years = months / 12;
  const totalInterest = financed * flatAnnualRate * years;
  const totalPaid = financed + totalInterest;
  const payment = totalPaid / months;

  return {
    totalInterest: round2(totalInterest),
    totalPaid: round2(totalPaid),
    monthlyPayment: round2(payment),
    effectiveAnnualRate: effectiveRateFromPayment(financed, payment, months),
  };
}

/**
 * หาอัตราลดต้นลดดอกต่อปีที่ทำให้ค่างวดเท่ากับที่กำหนด — คือการหา IRR ของกระแสเงินสด
 *
 * ใช้ Newton–Raphson แล้วถอยไปใช้ bisection เมื่อไม่ลู่เข้า: อนุพันธ์ของสมการค่างวด
 * แบนมากเมื่ออัตราเข้าใกล้ 0 ทำให้ Newton กระโดดออกนอกช่วงที่มีความหมายได้
 * bisection ช้ากว่าแต่ลู่เข้าแน่นอนเมื่อคำตอบอยู่ในช่วง จึงใช้เป็นตาข่ายรองรับ
 */
export function effectiveRateFromPayment(principal: number, payment: number, months: number): number {
  assertPositive(principal, 'เงินต้น');
  assertPositive(payment, 'ค่างวด');
  assertPositive(months, 'จำนวนงวด');

  const total = payment * months;
  if (!Number.isInteger(months)) throw new Error('จำนวนงวดต้องเป็นจำนวนเต็ม');
  if (total < principal - 0.005 * months) throw new Error('ค่างวดรวมต่ำกว่าเงินต้น ไม่รองรับอัตราดอกเบี้ยติดลบ');
  if (total <= principal) return 0;

  // f(r) = ค่างวดที่อัตรา r − ค่างวดเป้าหมาย · เพิ่มขึ้นตาม r เสมอ จึงมีคำตอบเดียว
  const f = (monthlyRate: number): number => {
    if (monthlyRate === 0) return principal / months - payment;
    return (principal * monthlyRate) / (1 - (1 + monthlyRate) ** -months) - payment;
  };

  let r = 0.01;
  for (let i = 0; i < 60; i++) {
    const value = f(r);
    if (Math.abs(value) < 1e-9) return round6(r * 12);
    const h = 1e-7;
    const slope = (f(r + h) - value) / h;
    if (!Number.isFinite(slope) || slope === 0) break;
    const next = r - value / slope;
    if (!Number.isFinite(next) || next <= 0 || next > 10) break;
    if (Math.abs(next - r) < 1e-12) return round6(next * 12);
    r = next;
  }

  // ตาข่ายรองรับ: หาช่วงที่คร่อมคำตอบก่อน แล้วแบ่งครึ่งจนแคบพอ
  let lo = 0;
  let hi = 1; // 100% ต่อเดือน = 1,200% ต่อปี ซึ่งเกินกว่าสัญญาใด ๆ ในความเป็นจริง
  if (f(hi) < 0) throw new Error('ค่างวดสูงเกินกว่าจะหาอัตราดอกเบี้ยที่สมเหตุสมผลได้');
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) > 0) hi = mid;
    else lo = mid;
  }
  return round6(((lo + hi) / 2) * 12);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export interface RevolvingResult {
  months: number;
  totalInterest: number;
  totalPaid: number;
  rows: AmortRow[];
}

/**
 * หนี้หมุนเวียนอย่างบัตรเครดิต — จ่ายเท่าเดิมทุกเดือนจนหมด
 *
 * `maxMonths` กันลูปไม่รู้จบเมื่อค่างวดเฉียดดอกเบี้ยพอดี แต่กรณีที่จ่ายน้อยกว่าดอกเบี้ยตรง ๆ
 * ต้องแจ้งผู้ใช้ให้ชัดว่า "หนี้ไม่มีวันหมด" ไม่ใช่คืนตัวเลขที่ดูเหมือนคำตอบ
 */
export function payoffSchedule(
  balance: number,
  annualRate: number,
  monthlyPayment: number,
  maxMonths = 600,
): RevolvingResult {
  assertPositive(balance, 'ยอดหนี้');
  assertPositive(monthlyPayment, 'ยอดที่จ่ายต่อเดือน');
  assertRate(annualRate);

  const r = annualRate / 12;
  const firstInterest = balance * r;
  if (monthlyPayment <= firstInterest) {
    throw new Error(
      `จ่ายเดือนละ ${monthlyPayment.toLocaleString('en-US')} บาท น้อยกว่าดอกเบี้ยงวดแรก ${firstInterest.toFixed(2)} บาท — หนี้จะไม่ลดลงเลยและเพิ่มขึ้นทุกเดือน`,
    );
  }

  const rows: AmortRow[] = [];
  let remaining = balance;
  let totalInterest = 0;
  let totalPaid = 0;

  for (let period = 1; period <= maxMonths && remaining > 0; period++) {
    const interest = remaining * r;
    const pay = Math.min(monthlyPayment, remaining + interest);
    const principal = pay - interest;
    remaining -= principal;
    totalInterest += interest;
    totalPaid += pay;
    rows.push({
      period,
      payment: round2(pay),
      interest: round2(interest),
      principal: round2(principal),
      balance: round2(Math.max(0, remaining)),
      annualRate,
    });
  }

  if (remaining > 0) throw new Error(`จ่ายในอัตรานี้ใช้เวลาเกิน ${maxMonths} เดือน — ลองเพิ่มยอดที่จ่ายต่อเดือน`);

  return { months: rows.length, totalInterest: round2(totalInterest), totalPaid: round2(totalPaid), rows };
}
