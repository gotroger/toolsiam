import { describe, it, expect } from 'vitest';
import { section33Yearly, section40Total } from './logic';

describe('ม.33 รายปี', () => {
  it('เงินเดือนถึงเพดานส่งปีละ 10,500 บาท (875 × 12)', () => {
    const r = section33Yearly(30_000, '2026-09-08');
    expect(r.employee).toBe(875);
    expect(r.employeeYearly).toBe(10_500);
    expect(r.employerYearly).toBe(10_500);
    expect(r.deductibleYearly).toBe(10_500);
  });

  it('เงินเดือนต่ำกว่าเพดานคิดจากค่าจ้างจริง', () => {
    expect(section33Yearly(12_000, '2026-09-08').employeeYearly).toBe(7_200);
  });
});

describe('ม.40', () => {
  it('ทางเลือก 1 จ่าย 70 บาท และออมเพิ่มไม่ได้', () => {
    const r = section40Total(1, 500);
    expect(r.option.contribution).toBe(70);
    expect(r.extraSaving).toBe(0);
    expect(r.monthlyTotal).toBe(70);
  });

  it('ทางเลือก 3 ออมเพิ่มได้ รวมเป็นยอดต่อเดือน', () => {
    const r = section40Total(3, 500);
    expect(r.monthlyTotal).toBe(800);
    expect(r.yearlyTotal).toBe(9_600);
  });

  it('ออมเพิ่มเกิน 1,000 บาท/เดือน ไม่ได้', () => {
    expect(() => section40Total(2, 1_001)).toThrow('1,000');
  });

  it('ทางเลือกนอกเหนือ 1–3 ไม่มี', () => {
    expect(() => section40Total(4 as 1, 0)).toThrow('มาตรา 40');
  });
});
