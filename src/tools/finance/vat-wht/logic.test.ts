import { describe, it, expect } from 'vitest';
import { VAT_RATE, WHT_RATES, calculateInvoice } from './logic';

describe('calculateInvoice', () => {
  it('รวม VAT: 100 → ฐาน 100, VAT 7, รวม 107', () => {
    const r = calculateInvoice({ amount: 100, mode: 'add', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(100);
    expect(r.vat).toBe(7);
    expect(r.total).toBe(107);
    expect(r.wht).toBe(0);
    expect(r.payable).toBe(107);
  });

  it('ถอด VAT: 107 → ฐาน 100, VAT 7', () => {
    const r = calculateInvoice({ amount: 107, mode: 'extract', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(100);
    expect(r.vat).toBe(7);
    expect(r.total).toBe(107);
  });

  it('ถอด VAT แล้ว ฐาน + VAT ต้องเท่ากับยอดรวมเป๊ะ ไม่เพี้ยนจากการปัดเศษ', () => {
    const r = calculateInvoice({ amount: 1000, mode: 'extract', vatRate: VAT_RATE, whtRate: 0 });
    expect(r.base).toBe(934.58);
    expect(r.vat).toBe(65.42);
    expect(Math.round((r.base + r.vat) * 100) / 100).toBe(1000);
  });

  it('หัก ณ ที่จ่ายคิดจากฐานก่อน VAT', () => {
    const r = calculateInvoice({ amount: 100, mode: 'add', vatRate: VAT_RATE, whtRate: 0.03 });
    expect(r.wht).toBe(3);
    expect(r.payable).toBe(104); // 107 − 3
  });

  it('อัตรา VAT 0% ใช้ได้', () => {
    const r = calculateInvoice({ amount: 500, mode: 'add', vatRate: 0, whtRate: 0.05 });
    expect(r.vat).toBe(0);
    expect(r.total).toBe(500);
    expect(r.wht).toBe(25);
    expect(r.payable).toBe(475);
  });

  it('ยอด 0 ได้ผลลัพธ์ 0 ทั้งหมด', () => {
    const r = calculateInvoice({ amount: 0, mode: 'extract', vatRate: VAT_RATE, whtRate: 0.03 });
    expect(r).toEqual({ base: 0, vat: 0, total: 0, wht: 0, payable: 0 });
  });

  it('ยอดติดลบ → error', () => {
    expect(() => calculateInvoice({ amount: -1, mode: 'add', vatRate: VAT_RATE, whtRate: 0 })).toThrow();
  });

  it('ตารางอัตราหัก ณ ที่จ่ายมีครบและอัตราอยู่ระหว่าง 0–1', () => {
    expect(WHT_RATES.length).toBeGreaterThanOrEqual(6);
    for (const w of WHT_RATES) {
      expect(w.rate).toBeGreaterThan(0);
      expect(w.rate).toBeLessThan(1);
      expect(w.label.length).toBeGreaterThan(0);
    }
  });
});
