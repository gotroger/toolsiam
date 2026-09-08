/**
 * กำไร มาร์จิ้น และมาร์กอัป (§10.2)
 *
 * สองคำที่คนสับสนกันมากที่สุดในการตั้งราคา:
 *   margin  = กำไร ÷ **ราคาขาย**  (ขายได้ 100 บาท เป็นกำไรกี่บาท)
 *   markup  = กำไร ÷ **ต้นทุน**   (ทุน 100 บาท บวกเพิ่มกี่บาท)
 * ตัวเลขเดียวกันจึงให้เปอร์เซ็นต์คนละค่า — ทั้งสองฟังก์ชันคำนวณแยกกันชัดเจน
 */

export interface MarginResult {
  /** ราคาขาย − ต้นทุน */
  profit: number;
  /** กำไรคิดเป็น % ของราคาขาย */
  marginPercent: number;
  /** กำไรคิดเป็น % ของต้นทุน */
  markupPercent: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

function assertMoney(value: number, label: string): void {
  if (!Number.isFinite(value)) throw new Error(`${label}ต้องเป็นตัวเลข`);
  if (value < 0) throw new Error(`${label}ต้องไม่ติดลบ`);
}

/** จากต้นทุนและราคาขาย → กำไร margin และ markup */
export function marginFromPrice(cost: number, price: number): MarginResult {
  assertMoney(cost, 'ต้นทุน');
  assertMoney(price, 'ราคาขาย');
  const profit = price - cost;
  return {
    profit: round2(profit),
    marginPercent: price === 0 ? 0 : round2((profit / price) * 100),
    markupPercent: cost === 0 ? 0 : round2((profit / cost) * 100),
  };
}

/** ราคาขายที่ทำให้ได้ margin ตามต้องการ — margin 100% ขึ้นไปเป็นไปไม่ได้ */
export function priceFromMargin(cost: number, marginPercent: number): number {
  assertMoney(cost, 'ต้นทุน');
  if (!Number.isFinite(marginPercent)) throw new Error('มาร์จิ้นต้องเป็นตัวเลข');
  if (marginPercent >= 100) throw new Error('มาร์จิ้นต้องน้อยกว่า 100% เพราะกำไรคิดจากราคาขาย');
  if (marginPercent <= -100) throw new Error('มาร์จิ้นติดลบเกิน −100% ทำให้ราคาขายติดลบ');
  return round2(cost / (1 - marginPercent / 100));
}

/** ราคาขายที่บวกจากต้นทุนตาม % ที่กำหนด */
export function priceFromMarkup(cost: number, markupPercent: number): number {
  assertMoney(cost, 'ต้นทุน');
  if (!Number.isFinite(markupPercent)) throw new Error('มาร์กอัปต้องเป็นตัวเลข');
  if (markupPercent <= -100) throw new Error('มาร์กอัปติดลบเกิน −100% ทำให้ราคาขายติดลบ');
  return round2(cost * (1 + markupPercent / 100));
}

/** ราคาขายที่ทำให้ได้กำไรเป็นจำนวนบาทตามต้องการ */
export function priceFromProfit(cost: number, profit: number): number {
  assertMoney(cost, 'ต้นทุน');
  if (!Number.isFinite(profit)) throw new Error('กำไรที่ต้องการต้องเป็นตัวเลข');
  if (cost + profit < 0) throw new Error('กำไรติดลบมากกว่าต้นทุน ทำให้ราคาขายติดลบ');
  return round2(cost + profit);
}

export interface ShopProfitInput {
  /** ราคาขายต่อชิ้นก่อนส่วนลด */
  price: number;
  /** ต้นทุนสินค้าต่อชิ้น */
  cost: number;
  /** ส่วนลดที่ให้ลูกค้า (บาทต่อชิ้น) */
  discount: number;
  /** ค่าส่งส่วนที่ร้านออกเอง (บาทต่อชิ้น) */
  shipping: number;
  /** ค่าธรรมเนียมแพลตฟอร์ม คิดเป็น % ของยอดที่ลูกค้าจ่าย */
  feePercent: number;
  /** ค่าโฆษณาเฉลี่ยต่อชิ้น */
  adCost: number;
  quantity: number;
}

export interface ShopProfitResult {
  /** ยอดที่ลูกค้าจ่ายต่อชิ้น (ราคา − ส่วนลด) */
  netPrice: number;
  feeAmount: number;
  /** กำไรต่อชิ้น */
  profitPerUnit: number;
  /** กำไรรวมทั้งล็อต */
  totalProfit: number;
  totalRevenue: number;
  totalCost: number;
  marginPercent: number;
  /** ขายกี่ชิ้นจึงคุ้มค่าโฆษณา+ค่าใช้จ่ายคงที่ — null เมื่อกำไรต่อชิ้นไม่เป็นบวก */
  breakEvenUnits: number | null;
}

/**
 * กำไรร้านค้าออนไลน์ — หักครบทุกก้อนที่คนขายมักลืม
 * ค่าธรรมเนียมแพลตฟอร์มคิดจากยอดที่ลูกค้าจ่ายจริง (หลังหักส่วนลดร้าน) ตามที่มาร์เก็ตเพลสไทยคิด
 */
export function shopProfit(input: ShopProfitInput): ShopProfitResult {
  assertMoney(input.price, 'ราคาขาย');
  assertMoney(input.cost, 'ต้นทุนสินค้า');
  assertMoney(input.discount, 'ส่วนลด');
  assertMoney(input.shipping, 'ค่าส่ง');
  assertMoney(input.adCost, 'ค่าโฆษณา');
  if (!Number.isFinite(input.feePercent) || input.feePercent < 0) throw new Error('ค่าธรรมเนียมต้องเป็นตัวเลขไม่ติดลบ');
  if (!Number.isFinite(input.quantity) || input.quantity <= 0) throw new Error('จำนวนชิ้นต้องมากกว่า 0');
  if (input.discount > input.price) throw new Error('ส่วนลดต้องไม่มากกว่าราคาขาย');

  const netPrice = input.price - input.discount;
  const feeAmount = (netPrice * input.feePercent) / 100;
  const perUnitCost = input.cost + input.shipping + feeAmount + input.adCost;
  const profitPerUnit = netPrice - perUnitCost;

  return {
    netPrice: round2(netPrice),
    feeAmount: round2(feeAmount),
    profitPerUnit: round2(profitPerUnit),
    totalProfit: round2(profitPerUnit * input.quantity),
    totalRevenue: round2(netPrice * input.quantity),
    totalCost: round2(perUnitCost * input.quantity),
    marginPercent: netPrice === 0 ? 0 : round2((profitPerUnit / netPrice) * 100),
    breakEvenUnits: profitPerUnit > 0 ? Math.ceil(input.adCost / profitPerUnit) : null,
  };
}
