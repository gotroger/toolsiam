import { describe, it, expect } from 'vitest';
import { CHANNEL_PRESETS, shopProfit } from './logic';

const base = { price: 500, cost: 200, discount: 50, shipping: 40, feePercent: 10, adCost: 30, quantity: 10 };

describe('กำไรร้านค้าออนไลน์', () => {
  it('หักครบทุกก้อน และค่าธรรมเนียมคิดจากยอดหลังหักส่วนลด', () => {
    const r = shopProfit(base);
    expect(r.netPrice).toBe(450);
    expect(r.feeAmount).toBe(45);
    expect(r.profitPerUnit).toBe(135);
    expect(r.totalProfit).toBe(1_350);
  });

  it('ขายเองไม่มีค่าธรรมเนียม กำไรสูงกว่าขายผ่านมาร์เก็ตเพลส', () => {
    const own = shopProfit({ ...base, feePercent: 0 });
    expect(own.profitPerUnit).toBeGreaterThan(shopProfit(base).profitPerUnit);
  });

  it('มีช่องทางขายให้เลือกเป็นจุดตั้งต้น', () => {
    expect(CHANNEL_PRESETS.find((c) => c.id === 'own')!.feePercent).toBe(0);
    expect(CHANNEL_PRESETS.length).toBeGreaterThan(1);
  });

  it('ขายขาดทุนไม่บอกจุดคุ้มค่าโฆษณา', () => {
    expect(shopProfit({ ...base, cost: 500 }).breakEvenUnits).toBeNull();
  });
});
