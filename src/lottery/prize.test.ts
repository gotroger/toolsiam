import { describe, it, expect } from 'vitest';
import { netPrize, prizeDeduction } from './prize';

describe('อากรแสตมป์สลากกินแบ่งรัฐบาล', () => {
  it('1 บาทต่อเงินรางวัลทุก 200 บาท', () => {
    expect(prizeDeduction(200)).toBe(1);
    expect(prizeDeduction(2_000)).toBe(10);
    expect(prizeDeduction(6_000_000)).toBe(30_000);
  });

  it('เศษของ 200 คิดเป็นอีก 1 บาทเต็ม', () => {
    expect(prizeDeduction(201)).toBe(2);
    expect(prizeDeduction(1)).toBe(1);
  });

  it('ไม่ถูกรางวัลก็ไม่มีอะไรให้หัก', () => {
    expect(prizeDeduction(0)).toBe(0);
  });

  it('เงินรางวัลติดลบเป็นข้อผิดพลาด', () => {
    expect(() => prizeDeduction(-1)).toThrow();
  });
});

describe('สลากการกุศล', () => {
  it('หักภาษี 1%', () => {
    expect(prizeDeduction(2_000, 'charity')).toBe(20);
    expect(prizeDeduction(6_000_000, 'charity')).toBe(60_000);
  });
});

describe('netPrize', () => {
  it('คืนทั้งยอดก่อนหัก ยอดหัก และยอดสุทธิ', () => {
    expect(netPrize(6_000_000)).toMatchObject({ gross: 6_000_000, deduction: 30_000, net: 5_970_000, kind: 'government' });
  });

  it('ประเภทสลากต่างกันได้ยอดสุทธิต่างกัน', () => {
    expect(netPrize(2_000, 'charity').net).toBe(1_980);
    expect(netPrize(2_000, 'government').net).toBe(1_990);
  });
});
