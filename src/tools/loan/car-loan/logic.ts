import { flatLoan, type FlatLoanResult } from '@/lib/loan';

export type { FlatLoanResult };
export { flatLoan };

export interface CarLoanInput {
  price: number;
  /** เงินดาวน์เป็นบาท */
  downPayment: number;
  /** อัตราดอกเบี้ยคงที่ต่อปี (ทศนิยม) */
  flatRate: number;
  months: number;
}

export interface CarLoanResult extends FlatLoanResult {
  financed: number;
  downPercent: number;
}

/** จำนวนงวดที่ไฟแนนซ์รถในไทยเสนอกันทั่วไป */
export const COMMON_TERMS = [12, 24, 36, 48, 60, 72, 84] as const;

const round2 = (n: number) => Math.round(n * 100) / 100;

export function carLoan(input: CarLoanInput): CarLoanResult {
  const result = flatLoan(input.price, input.flatRate, input.months, input.downPayment);
  const financed = input.price - input.downPayment;
  return {
    ...result,
    financed: round2(financed),
    downPercent: round2((input.downPayment / input.price) * 100),
  };
}
