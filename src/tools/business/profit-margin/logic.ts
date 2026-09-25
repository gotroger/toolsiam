import { marginFromPrice, type MarginResult } from '@/lib/pricing';

export type { MarginResult };
export { marginFromPrice };

export interface BatchInput {
  cost: number;
  price: number;
  quantity: number;
}

export interface BatchResult extends MarginResult {
  totalCost: number;
  totalRevenue: number;
  totalProfit: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** กำไรต่อชิ้นและกำไรทั้งล็อตในครั้งเดียว */
export function batchProfit({ cost, price, quantity }: BatchInput): BatchResult {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new Error('จำนวนชิ้นต้องมากกว่า 0');
  if (!Number.isInteger(quantity)) throw new Error('จำนวนชิ้นต้องเป็นจำนวนเต็ม');
  const per = marginFromPrice(cost, price);
  return {
    ...per,
    totalCost: round2(cost * quantity),
    totalRevenue: round2(price * quantity),
    // คูณจากส่วนต่างเต็มก่อนปัด — ถ้าใช้กำไรต่อชิ้นที่ปัดเป็นสตางค์แล้ว เศษจะขยายตามจำนวนชิ้น
    totalProfit: round2((price - cost) * quantity),
  };
}
