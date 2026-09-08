import { describe, it, expect } from 'vitest';
import { activeTemporaryMeasures, TAX_BRACKETS, TAX_LIMITS, TEMPORARY_MEASURES } from './income-tax';

describe('ขั้นบันไดภาษี', () => {
  it('ตรงกับประกาศของกรมสรรพากร', () => {
    expect(TAX_BRACKETS.map((b) => b.rate)).toEqual([0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35]);
    expect(TAX_BRACKETS.map((b) => b.upTo)).toEqual([
      150_000, 300_000, 500_000, 750_000, 1_000_000, 2_000_000, 5_000_000, Infinity,
    ]);
  });

  it('ขั้นเรียงจากน้อยไปมากและปิดท้ายด้วย Infinity', () => {
    for (let i = 1; i < TAX_BRACKETS.length; i++) {
      expect(TAX_BRACKETS[i].upTo).toBeGreaterThan(TAX_BRACKETS[i - 1].upTo);
    }
    expect(TAX_BRACKETS.at(-1)!.upTo).toBe(Infinity);
  });
});

describe('เพดานค่าลดหย่อน', () => {
  it('ประกันสุขภาพอยู่ใต้เพดานประกันชีวิตอีกชั้น ไม่ใช่เพดานอิสระ', () => {
    expect(TAX_LIMITS.healthInsuranceCap).toBeLessThan(TAX_LIMITS.lifeInsuranceCap);
  });

  it('เพดานรวมกลุ่มการออมเพื่อเกษียณสูงกว่าเพดานรายตัวทุกตัวในกลุ่ม', () => {
    for (const cap of [TAX_LIMITS.ssfCap, TAX_LIMITS.pensionInsuranceCap, TAX_LIMITS.nsfCap]) {
      expect(cap).toBeLessThanOrEqual(TAX_LIMITS.retirementCap);
    }
  });
});

describe('มาตรการชั่วคราว', () => {
  it('ว่างโดยตั้งใจ — ของปีภาษี 2568/2569 ยังไม่ verify จึงห้ามใส่', () => {
    expect(TEMPORARY_MEASURES).toEqual([]);
    expect(activeTemporaryMeasures('2026-09-08')).toEqual([]);
  });
});
