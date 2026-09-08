import { describe, it, expect } from 'vitest';
import { calculateWht, WHT_RATE_OPTIONS } from './logic';

describe('ภาษีหัก ณ ที่จ่าย', () => {
  it('หักจากยอดก่อน VAT เสมอ ไม่ใช่จากยอดรวม VAT', () => {
    const r = calculateWht({ amount: 10_000, mode: 'fromBase', whtRate: 0.03, vatRate: 0.07 });
    expect(r.base).toBe(10_000);
    expect(r.vat).toBe(700);
    expect(r.invoiceTotal).toBe(10_700);
    expect(r.wht).toBe(300);          // 3% ของ 10,000 ไม่ใช่ของ 10,700
    expect(r.netReceived).toBe(10_400);
  });

  it('ไม่จด VAT ก็หัก ณ ที่จ่ายจากยอดเต็ม', () => {
    const r = calculateWht({ amount: 10_000, mode: 'fromBase', whtRate: 0.03, vatRate: 0 });
    expect(r.vat).toBe(0);
    expect(r.wht).toBe(300);
    expect(r.netReceived).toBe(9_700);
  });

  it('ถอดกลับจากยอดที่ได้รับจริงได้ค่าบริการเดิม', () => {
    const forward = calculateWht({ amount: 10_000, mode: 'fromBase', whtRate: 0.03, vatRate: 0.07 });
    const back = calculateWht({ amount: forward.netReceived, mode: 'fromNet', whtRate: 0.03, vatRate: 0.07 });
    expect(back.base).toBeCloseTo(10_000, 2);
    expect(back.wht).toBeCloseTo(300, 2);
  });

  it('ค่าเช่า 5% หักมากกว่าค่าบริการ 3%', () => {
    const rent = calculateWht({ amount: 50_000, mode: 'fromBase', whtRate: 0.05, vatRate: 0 });
    const service = calculateWht({ amount: 50_000, mode: 'fromBase', whtRate: 0.03, vatRate: 0 });
    expect(rent.wht).toBe(2_500);
    expect(service.wht).toBe(1_500);
  });

  it('มีอัตราที่ใช้บ่อยครบทั้งสี่แบบพร้อมตัวอย่างงาน', () => {
    expect(WHT_RATE_OPTIONS.map((o) => o.rate)).toEqual([0.01, 0.02, 0.03, 0.05]);
    for (const o of WHT_RATE_OPTIONS) expect(o.examples.length).toBeGreaterThan(0);
  });

  it('ปฏิเสธอัตราและยอดที่เป็นไปไม่ได้', () => {
    expect(() => calculateWht({ amount: -1, mode: 'fromBase', whtRate: 0.03, vatRate: 0 })).toThrow();
    expect(() => calculateWht({ amount: 100, mode: 'fromBase', whtRate: 1, vatRate: 0 })).toThrow('0–100%');
    expect(() => calculateWht({ amount: 100, mode: 'fromBase', whtRate: 0.03, vatRate: -1 })).toThrow('VAT');
  });
});
