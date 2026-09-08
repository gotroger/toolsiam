import { describe, it, expect } from 'vitest';
import { comparePayments, minimumPayment, payoffSchedule } from './logic';

describe('ยอดชำระขั้นต่ำ', () => {
  it('คิดเป็นเปอร์เซ็นต์ของยอดคงเหลือ', () => {
    expect(minimumPayment(50_000)).toBe(4_000);
    expect(minimumPayment(50_000, 0.1)).toBe(5_000);
  });

  it('ปฏิเสธอัตราที่เป็นไปไม่ได้', () => {
    expect(() => minimumPayment(1_000, 0)).toThrow();
    expect(() => minimumPayment(1_000, 1.5)).toThrow();
    expect(() => minimumPayment(-1)).toThrow();
  });
});

describe('เทียบการจ่ายหลายระดับ', () => {
  it('จ่ายมากขึ้นหมดเร็วขึ้นและดอกเบี้ยรวมน้อยลง', () => {
    const rows = comparePayments(100_000, 0.16, [3_000, 5_000, 10_000]);
    expect(rows.every((r) => r.feasible)).toBe(true);
    expect(rows[0].months).toBeGreaterThan(rows[1].months);
    expect(rows[1].months).toBeGreaterThan(rows[2].months);
    expect(rows[0].totalInterest).toBeGreaterThan(rows[2].totalInterest);
  });

  it('ตัวเลือกที่จ่ายน้อยกว่าดอกเบี้ยยังอยู่ในตาราง แต่ทำเครื่องหมายว่าเป็นไปไม่ได้', () => {
    const rows = comparePayments(100_000, 0.16, [1_000, 5_000]);
    expect(rows[0].feasible).toBe(false);
    expect(rows[0].months).toBe(0);
    expect(rows[1].feasible).toBe(true);
  });
});

describe('ตารางปลดหนี้', () => {
  it('ยอดคงเหลือลดลงทุกงวดจนเป็นศูนย์', () => {
    const r = payoffSchedule(80_000, 0.16, 5_000);
    for (let i = 1; i < r.rows.length; i++) {
      expect(r.rows[i].balance).toBeLessThan(r.rows[i - 1].balance);
    }
    expect(r.rows.at(-1)!.balance).toBe(0);
  });

  it('ดอกเบี้ยงวดแรกสูงสุดแล้วลดลงเรื่อย ๆ', () => {
    const r = payoffSchedule(80_000, 0.16, 5_000);
    expect(r.rows[0].interest).toBeGreaterThan(r.rows.at(-1)!.interest);
  });
});
