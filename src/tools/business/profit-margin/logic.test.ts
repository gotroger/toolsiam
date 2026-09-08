import { describe, it, expect } from 'vitest';
import { batchProfit, marginFromPrice } from './logic';

describe('กำไรต่อชิ้น', () => {
  it('แยก margin กับ markup ให้ชัด', () => {
    expect(marginFromPrice(100, 125)).toEqual({ profit: 25, marginPercent: 20, markupPercent: 25 });
  });
});

describe('กำไรทั้งล็อต', () => {
  it('คูณจำนวนชิ้นเข้ากับกำไรต่อชิ้น', () => {
    const r = batchProfit({ cost: 100, price: 125, quantity: 40 });
    expect(r.totalCost).toBe(4000);
    expect(r.totalRevenue).toBe(5000);
    expect(r.totalProfit).toBe(1000);
    expect(r.marginPercent).toBe(20);
  });

  it('ขายขาดทุนแล้วไม่บอกจำนวนชิ้นที่ทำกำไร', () => {
    expect(batchProfit({ cost: 100, price: 80, quantity: 10 }).unitsForProfit).toBeNull();
  });

  it('ปฏิเสธจำนวนชิ้นที่ไม่เป็นบวก', () => {
    expect(() => batchProfit({ cost: 1, price: 2, quantity: 0 })).toThrow('จำนวนชิ้น');
  });
});
