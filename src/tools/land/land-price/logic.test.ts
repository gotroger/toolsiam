import { describe, it, expect } from 'vitest';
import { landPrice, PRICE_UNITS, splitDownPayment } from './logic';

describe('ราคาที่ดิน', () => {
  it('ประกาศเป็นบาทต่อตารางวา คิดราคารวมได้ถูก', () => {
    const r = landPrice({ area: 1, areaUnit: 'rai', pricePerUnit: 25_000, priceUnit: 'wa2' });
    expect(r.totalPrice).toBe(10_000_000);
    expect(r.pricePerRai).toBe(10_000_000);
    expect(r.pricePerSqm).toBe(6250);
  });

  it('เสนอหน่วยราคาที่คนไทยใช้จริงเท่านั้น', () => {
    expect(PRICE_UNITS).toEqual(['rai', 'ngan', 'wa2', 'm2']);
  });
});

describe('เงินดาวน์', () => {
  it('แยกเงินดาวน์กับส่วนที่ต้องกู้', () => {
    expect(splitDownPayment({ totalPrice: 3_000_000, downPercent: 20 })).toEqual({
      downPayment: 600_000, financed: 2_400_000,
    });
  });

  it('ดาวน์ 100% ไม่เหลือส่วนที่ต้องกู้', () => {
    expect(splitDownPayment({ totalPrice: 1_000_000, downPercent: 100 }).financed).toBe(0);
  });

  it('ปฏิเสธเปอร์เซ็นต์นอกช่วง 0–100', () => {
    expect(() => splitDownPayment({ totalPrice: 100, downPercent: 101 })).toThrow('0–100');
    expect(() => splitDownPayment({ totalPrice: 100, downPercent: -1 })).toThrow();
  });
});
