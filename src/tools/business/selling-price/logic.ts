import { marginFromPrice, priceFromMargin, priceFromMarkup, priceFromProfit } from '@/lib/pricing';

export type PriceBasis = 'margin' | 'markup' | 'profit';

export const BASIS_LABEL: Record<PriceBasis, string> = {
  margin: 'มาร์จิ้นที่ต้องการ (% ของราคาขาย)',
  markup: 'บวกจากต้นทุน (% ของต้นทุน)',
  profit: 'กำไรที่ต้องการ (บาทต่อชิ้น)',
};

export interface SellingPriceResult {
  /** ราคาขายก่อน VAT */
  price: number;
  profit: number;
  marginPercent: number;
  markupPercent: number;
  /** ราคาที่ต้องติดป้ายเมื่อรวม VAT แล้ว */
  priceWithVat: number;
  vatAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * ราคาขายที่ควรตั้ง จากฐานที่ผู้ใช้เลือก แล้ววัดกลับเป็นทั้งมาร์จิ้นและมาร์กอัป
 *
 * `vatPercent` ผู้ใช้กรอกเอง — อัตรา VAT ของไทยเป็นเรื่องของกฎหมายที่เปลี่ยนได้
 * และเครื่องมือ VAT เต็มรูปแบบอยู่ที่ /tools/vat-wht ซึ่งเป็นเจ้าของอัตรานั้น
 */
export function sellingPrice(cost: number, basis: PriceBasis, value: number, vatPercent: number): SellingPriceResult {
  if (!Number.isFinite(vatPercent) || vatPercent < 0) throw new Error('อัตรา VAT ต้องเป็นตัวเลขไม่ติดลบ');

  const price =
    basis === 'margin' ? priceFromMargin(cost, value)
    : basis === 'markup' ? priceFromMarkup(cost, value)
    : priceFromProfit(cost, value);

  const measured = marginFromPrice(cost, price);
  const vatAmount = round2((price * vatPercent) / 100);

  return {
    price,
    profit: measured.profit,
    marginPercent: measured.marginPercent,
    markupPercent: measured.markupPercent,
    vatAmount,
    priceWithVat: round2(price + vatAmount),
  };
}
