import { landPrice, toRaiNganWa, UNIT_LABEL, type LandPriceInput, type LandPriceResult, type LandUnit } from '@/lib/land';

export type { LandPriceInput, LandPriceResult, LandUnit };
export { landPrice, toRaiNganWa, UNIT_LABEL };

/** หน่วยที่ประกาศขายที่ดินในไทยใช้จริง — เอเคอร์/เฮกตาร์ไม่ต้องมีในหน้านี้ */
export const PRICE_UNITS: LandUnit[] = ['rai', 'ngan', 'wa2', 'm2'];

export interface DownPaymentInput {
  totalPrice: number;
  /** เงินดาวน์เป็น % ของราคาที่ดิน */
  downPercent: number;
}

export interface DownPaymentResult {
  downPayment: number;
  /** ส่วนที่ต้องกู้หรือผ่อนต่อ */
  financed: number;
}

/** แยกเงินดาวน์กับส่วนที่ต้องกู้ — ตัวเลขแรกที่คนดูที่ดินอยากรู้ต่อจากราคารวม */
export function splitDownPayment({ totalPrice, downPercent }: DownPaymentInput): DownPaymentResult {
  if (!Number.isFinite(totalPrice) || totalPrice < 0) throw new Error('ราคารวมต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(downPercent) || downPercent < 0 || downPercent > 100) {
    throw new Error('เงินดาวน์ต้องอยู่ระหว่าง 0–100%');
  }
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const downPayment = round2((totalPrice * downPercent) / 100);
  return { downPayment, financed: round2(totalPrice - downPayment) };
}
