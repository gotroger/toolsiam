/**
 * เงินที่ได้รับจริงหลังหักค่าธรรมเนียมตอนขึ้นเงินรางวัล (§17.3)
 *
 * สลากกินแบ่งรัฐบาล: อากรแสตมป์ 1 บาท ต่อเงินรางวัลทุก 200 บาท (เศษของ 200 คิดเป็น 200)
 *   → คิดเป็นประมาณ 0.5% แต่ปัดขึ้นเป็นช่วงละ 200 บาท ไม่ใช่คูณ 0.005 ตรง ๆ
 * สลากการกุศล: หักภาษี 1% ของเงินรางวัล
 *
 * ตัวเลขทั้งสองต้องตรวจกับประกาศ/กฎหมายจริงก่อน launch (ดู LOTTERY_DEDUCTION_SOURCE)
 */
export type LotteryKind = 'government' | 'charity';

export const LOTTERY_DEDUCTION_SOURCE = {
  name: 'สำนักงานสลากกินแบ่งรัฐบาล',
  url: 'https://www.glo.or.th/',
  /** ยังไม่ได้ตรวจกับประกาศจริง — ต้องตรวจและแก้วันที่นี้ก่อน launch */
  verifiedAt: '',
} as const;

/** ขั้นของอากรแสตมป์: 1 บาทต่อทุก ๆ 200 บาทของเงินรางวัล */
export const STAMP_DUTY_STEP = 200;
export const CHARITY_TAX_RATE = 0.01;

export const KIND_LABELS: Record<LotteryKind, string> = {
  government: 'สลากกินแบ่งรัฐบาล (อากรแสตมป์ 1 บาท ต่อ 200 บาท)',
  charity: 'สลากการกุศล (ภาษี 1%)',
};

export interface NetPrize {
  gross: number;
  /** ยอดที่ถูกหัก */
  deduction: number;
  net: number;
  kind: LotteryKind;
  label: string;
}

/** ยอดหักของเงินรางวัลก้อนหนึ่ง — ปัดตามกติกาของแต่ละประเภทสลาก */
export function prizeDeduction(gross: number, kind: LotteryKind = 'government'): number {
  if (!Number.isFinite(gross) || gross < 0) throw new Error('เงินรางวัลต้องเป็นจำนวนไม่ติดลบ');
  if (gross === 0) return 0;
  if (kind === 'charity') return Math.round(gross * CHARITY_TAX_RATE * 100) / 100;
  return Math.ceil(gross / STAMP_DUTY_STEP);
}

export function netPrize(gross: number, kind: LotteryKind = 'government'): NetPrize {
  const deduction = prizeDeduction(gross, kind);
  return { gross, deduction, net: gross - deduction, kind, label: KIND_LABELS[kind] };
}
