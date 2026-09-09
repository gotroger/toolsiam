import { describe, it, expect } from 'vitest';
import { marginFromPrice, priceFromMargin, priceFromMarkup, priceFromProfit, shopProfit } from './pricing';

describe('margin กับ markup', () => {
  it('ทุน 100 ขาย 125 → margin 20% markup 25%', () => {
    expect(marginFromPrice(100, 125)).toEqual({ profit: 25, marginPercent: 20, markupPercent: 25 });
  });

  it('ขายขาดทุนได้กำไรติดลบ', () => {
    const r = marginFromPrice(100, 80);
    expect(r.profit).toBe(-20);
    expect(r.marginPercent).toBe(-25);
    expect(r.markupPercent).toBe(-20);
  });

  it('ราคาขายหรือต้นทุนเป็น 0 ไม่หารด้วยศูนย์', () => {
    expect(marginFromPrice(50, 0).marginPercent).toBeNull();
    expect(marginFromPrice(0, 50).markupPercent).toBeNull();
  });

  it('ปฏิเสธค่าติดลบ', () => {
    expect(() => marginFromPrice(-1, 100)).toThrow('ต้นทุน');
    expect(() => marginFromPrice(100, -1)).toThrow('ราคาขาย');
  });
});

describe('ตั้งราคาขาย', () => {
  it('margin 20% จากทุน 100 = 125', () => {
    expect(priceFromMargin(100, 20)).toBe(125);
  });

  it('markup 25% จากทุน 100 = 125', () => {
    expect(priceFromMarkup(100, 25)).toBe(125);
  });

  it('ตั้งราคาแล้ววัดกลับได้เปอร์เซ็นต์เดิม', () => {
    const price = priceFromMargin(370, 35);
    expect(marginFromPrice(370, price).marginPercent).toBeCloseTo(35, 1);
  });

  it('margin ตั้งแต่ 100% ขึ้นไปเป็นไปไม่ได้', () => {
    expect(() => priceFromMargin(100, 100)).toThrow('น้อยกว่า 100%');
    expect(() => priceFromMargin(100, 150)).toThrow();
  });

  it('กำไรเป็นบาทบวกตรงเข้าต้นทุน', () => {
    expect(priceFromProfit(100, 30)).toBe(130);
    expect(() => priceFromProfit(100, -200)).toThrow();
  });
});

describe('กำไรร้านค้าออนไลน์', () => {
  const base = { price: 500, cost: 200, discount: 50, shipping: 40, feePercent: 10, adCost: 30, quantity: 10 };

  it('หักครบทุกก้อนตามลำดับที่มาร์เก็ตเพลสคิด', () => {
    const r = shopProfit(base);
    expect(r.netPrice).toBe(450);
    expect(r.feeAmount).toBe(45); // 10% ของ 450
    expect(r.profitPerUnit).toBe(135); // 450 − 200 − 40 − 45 − 30
    expect(r.totalProfit).toBe(1350);
    expect(r.totalRevenue).toBe(4500);
    expect(r.marginPercent).toBe(30);
  });

  it('ค่าโฆษณาเป็นต้นทุนต่อชิ้น ไม่ใช้สร้างจุดคุ้มทุนคงที่', () => {
    const one = shopProfit({ ...base, quantity: 1 });
    const two = shopProfit({ ...base, quantity: 2 });
    expect(two.totalProfit).toBe(one.totalProfit * 2);
    expect(one).not.toHaveProperty('breakEvenUnits');
  });

  it('ปฏิเสธส่วนลดที่มากกว่าราคาขาย และจำนวนชิ้นที่ไม่เป็นบวก', () => {
    expect(() => shopProfit({ ...base, discount: 600 })).toThrow('ส่วนลด');
    expect(() => shopProfit({ ...base, quantity: 0 })).toThrow('จำนวนชิ้น');
  });
});
