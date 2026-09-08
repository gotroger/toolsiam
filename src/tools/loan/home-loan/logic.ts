import { amortize, monthlyPayment, type AmortResult, type AmortRow, type RateStage } from '@/lib/loan';

export type { AmortResult, AmortRow, RateStage };
export { amortize, monthlyPayment };

export interface HomeLoanInput {
  /** ราคาบ้าน */
  price: number;
  downPayment: number;
  years: number;
  /** อัตราช่วงโปรโมชัน (ทศนิยม) */
  promoRate: number;
  /** จำนวนเดือนที่ใช้อัตราโปรโมชัน */
  promoMonths: number;
  /** อัตราหลังหมดโปรโมชัน */
  afterRate: number;
  /** ผ่อนเกินค่างวดขั้นต่ำเดือนละเท่าไหร่ (0 = ผ่อนตามขั้นต่ำ) */
  extraPayment?: number;
}

export interface HomeLoanResult extends AmortResult {
  principal: number;
  /** ค่างวดที่ใช้จริงต่อเดือน */
  payment: number;
  /** ค่างวดขั้นต่ำก่อนบวกเงินผ่อนเพิ่ม */
  minimumPayment: number;
  /** ผ่อนหมดเร็วกว่ากำหนดกี่เดือน */
  monthsSaved: number;
  /** ดอกเบี้ยที่ประหยัดได้จากการผ่อนเพิ่ม (0 เมื่อผ่อนตามขั้นต่ำ) */
  interestSaved: number;
  /** รายได้ขั้นต่ำโดยประมาณตามเกณฑ์ภาระหนี้ต่อรายได้ */
  suggestedIncome: number;
}

/** เกณฑ์ภาระหนี้ต่อรายได้ที่ธนาคารไทยใช้กันทั่วไปสำหรับสินเชื่อบ้าน */
export const DEBT_SERVICE_RATIO = 0.4;

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * ผ่อนบ้านแบบลดต้นลดดอก รองรับดอกเบี้ยขั้นบันไดที่แบงก์ไทยเสนอจริง
 *
 * ค่างวดขั้นต่ำคำนวณจาก **อัตราที่สูงที่สุด** ของสัญญา ไม่ใช่อัตราโปรโมชันปีแรก ๆ
 * — ถ้าคิดจากอัตราโปรฯ ค่างวดจะน้อยกว่าดอกเบี้ยหลังหมดโปรฯ และหนี้จะไม่มีวันหมด
 * ซึ่งไม่ตรงกับที่แบงก์อนุมัติจริง แบงก์กำหนดค่างวดให้ผ่อนหมดในกำหนดเสมอ
 *
 * ผลพลอยได้คือช่วงโปรโมชันจะตัดเงินต้นได้มากกว่าปกติ ทำให้ผ่อนหมดก่อนกำหนด
 */
export function homeLoan(input: HomeLoanInput): HomeLoanResult {
  if (!Number.isFinite(input.price) || input.price <= 0) throw new Error('ราคาบ้านต้องมากกว่า 0');
  if (!Number.isFinite(input.downPayment) || input.downPayment < 0) throw new Error('เงินดาวน์ต้องเป็นตัวเลขไม่ติดลบ');
  if (input.downPayment >= input.price) throw new Error('เงินดาวน์ต้องน้อยกว่าราคาบ้าน');
  if (!Number.isFinite(input.years) || input.years <= 0) throw new Error('ระยะเวลาผ่อนต้องมากกว่า 0 ปี');
  if (input.years > 40) throw new Error('ระยะเวลาผ่อนต้องไม่เกิน 40 ปี');

  const extra = Math.max(0, input.extraPayment ?? 0);
  if (!Number.isFinite(extra)) throw new Error('เงินผ่อนเพิ่มต้องเป็นตัวเลข');

  const principal = input.price - input.downPayment;
  const months = Math.round(input.years * 12);
  const promoMonths = Math.max(0, Math.min(Math.round(input.promoMonths), months));

  const stages: RateStage[] =
    promoMonths === 0 || input.promoRate === input.afterRate
      ? [{ months: Infinity, annualRate: input.afterRate }]
      : [
          { months: promoMonths, annualRate: input.promoRate },
          { months: Infinity, annualRate: input.afterRate },
        ];

  const minimumPayment = monthlyPayment(principal, Math.max(input.promoRate, input.afterRate), months);
  const payment = round2(minimumPayment + extra);

  const schedule = amortize(principal, stages, months, payment);
  const baseline = amortize(principal, stages, months, minimumPayment);

  return {
    ...schedule,
    principal,
    payment,
    minimumPayment,
    monthsSaved: months - schedule.months,
    interestSaved: round2(baseline.totalInterest - schedule.totalInterest),
    suggestedIncome: round2(minimumPayment / DEBT_SERVICE_RATIO),
  };
}
