import { describe, it, expect } from 'vitest';
import { calculateWht, WHT_RATE_OPTIONS } from './logic';

describe('ภาษีหัก ณ ที่จ่าย', () => {
  it('หักจากยอดก่อน VAT เสมอ ไม่ใช่จากยอดรวม VAT', () => {
    const r = calculateWht({ amount: 10_000, mode: 'fromBase', whtRate: 0.03, vatRate: 0.07 });
    expect(r.base).toBe(10_000);
    expect(r.vat).toBe(700);
    expect(r.invoiceTotal).toBe(10_700);
    expect(r.wht).toBe(300); // 3% ของ 10,000 ไม่ใช่ของ 10,700
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

describe('ถอดจากยอดรับสุทธิให้ได้ยอดตรงทุกสตางค์', () => {
  it('อยากได้สุทธิ 1,000 บาท หัก 1% VAT 7% → ยอดรับจริงต้องเป็น 1,000.00 ไม่ใช่ 1,000.01', () => {
    const r = calculateWht({ amount: 1_000, mode: 'fromNet', whtRate: 0.01, vatRate: 0.07 });
    expect(r.netReceived).toBe(1_000);
  });

  // ยอดสุทธิที่ base ใด ๆ ทำได้จริง — ใช้ตรวจว่าถ้ามีคำตอบตรง ฟังก์ชันต้องหาเจอ
  const netOf = (base: number, whtRate: number, vatRate: number) =>
    calculateWht({ amount: base, mode: 'fromBase', whtRate, vatRate }).netReceived;

  it.each([
    [0.01, 0.07],
    [0.02, 0.07],
    [0.03, 0.07],
    [0.05, 0.07],
    [0.03, 0],
    [0.05, 0],
  ])('ไป-กลับครบทุกยอด (หัก %s VAT %s)', (whtRate, vatRate) => {
    for (let cents = 1; cents <= 300_000; cents += 7) {
      const target = cents / 100;
      const r = calculateWht({ amount: target, mode: 'fromNet', whtRate, vatRate });
      // ยอดที่ได้ต้องสอดคล้องกับ base ที่เลือกเสมอ
      expect(netOf(r.base, whtRate, vatRate)).toBe(r.netReceived);
      if (r.netReceived !== target) {
        // ถ้าไม่ตรง ต้องเป็นเพราะไม่มี base ใดในละแวกนั้นให้ยอดตรงจริง และห่างไม่เกิน 1 สตางค์
        expect(Math.abs(r.netReceived - target)).toBeLessThanOrEqual(0.0100001);
        for (let d = -5; d <= 5; d++) {
          const b = Math.round(r.base * 100 + d) / 100;
          if (b >= 0) expect(netOf(b, whtRate, vatRate)).not.toBe(target);
        }
      }
    }
  });

  it('มีหลาย base ที่ให้ยอดตรง เลือก base ที่น้อยที่สุด', () => {
    for (let cents = 1; cents <= 50_000; cents += 13) {
      const target = cents / 100;
      const r = calculateWht({ amount: target, mode: 'fromNet', whtRate: 0.03, vatRate: 0.07 });
      if (r.netReceived !== target) continue;
      const smaller = Math.round(r.base * 100 - 1) / 100;
      if (smaller >= 0) expect(netOf(smaller, 0.03, 0.07)).not.toBe(target);
    }
  });
});
