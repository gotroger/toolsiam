import { effectiveRateFromPayment, flatLoan, monthlyPayment } from '@/lib/loan';

export { effectiveRateFromPayment, flatLoan, monthlyPayment };

export interface ConversionResult {
  /** อัตราคงที่ต่อปี (ทศนิยม) */
  flatRate: number;
  /** อัตราลดต้นลดดอกที่ให้ภาระเท่ากัน */
  effectiveRate: number;
  payment: number;
  totalInterest: number;
  totalPaid: number;
  /** อัตราลดต้นลดดอกสูงกว่าอัตราคงที่กี่เท่า */
  multiple: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** จากอัตราคงที่ → อัตราลดต้นลดดอกที่เทียบเท่า */
export function flatToEffective(principal: number, flatRate: number, months: number): ConversionResult {
  const loan = flatLoan(principal, flatRate, months);
  return {
    flatRate,
    effectiveRate: loan.effectiveAnnualRate,
    payment: loan.monthlyPayment,
    totalInterest: loan.totalInterest,
    totalPaid: loan.totalPaid,
    multiple: flatRate === 0 ? 0 : round2(loan.effectiveAnnualRate / flatRate),
  };
}

/**
 * จากอัตราลดต้นลดดอก → อัตราคงที่ที่เทียบเท่า
 *
 * ทิศนี้คำนวณตรง ๆ ได้ ไม่ต้องหา IRR: รู้ค่างวดแล้วก็รู้ดอกเบี้ยรวม
 * และอัตราคงที่คือดอกเบี้ยรวมหารด้วยเงินต้นและจำนวนปี
 */
export function effectiveToFlat(principal: number, effectiveRate: number, months: number): ConversionResult {
  const payment = monthlyPayment(principal, effectiveRate, months);
  const totalPaid = round2(payment * months);
  const totalInterest = round2(totalPaid - principal);
  const years = months / 12;
  const flatRate = round6(totalInterest / principal / years);

  return {
    flatRate,
    effectiveRate,
    payment,
    totalInterest,
    totalPaid,
    multiple: flatRate === 0 ? 0 : round2(effectiveRate / flatRate),
  };
}

/** จากค่างวดที่ไฟแนนซ์เสนอมา → อัตราจริงทั้งสองแบบ (ไม่ต้องเชื่อตัวเลขที่เขาบอก) */
export function fromPayment(principal: number, payment: number, months: number): ConversionResult {
  const effectiveRate = effectiveRateFromPayment(principal, payment, months);
  const totalPaid = round2(payment * months);
  const totalInterest = round2(totalPaid - principal);
  const flatRate = round6(totalInterest / principal / (months / 12));

  return {
    flatRate,
    effectiveRate,
    payment: round2(payment),
    totalInterest,
    totalPaid,
    multiple: flatRate === 0 ? 0 : round2(effectiveRate / flatRate),
  };
}
