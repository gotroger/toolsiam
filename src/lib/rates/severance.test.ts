import { describe, it, expect } from 'vitest';
import { MIN_TENURE_DAYS, SEVERANCE_BANDS, severanceBandFor } from './severance';

const YEAR = 365;

describe('ขั้นค่าชดเชย', () => {
  it('ทำงานไม่ถึง 120 วัน ไม่มีสิทธิ', () => {
    expect(severanceBandFor(0)).toBeNull();
    expect(severanceBandFor(119)).toBeNull();
    expect(severanceBandFor(MIN_TENURE_DAYS)).not.toBeNull();
  });

  it('ครบ 120 วันได้ 30 วัน', () => {
    expect(severanceBandFor(120)!.payDays).toBe(30);
    expect(severanceBandFor(YEAR - 1)!.payDays).toBe(30);
  });

  it('ขอบเขตเป็น "ครบ X แต่ไม่ครบ Y" — 1 ปีพอดีได้ 90 วัน ไม่ใช่ 30', () => {
    expect(severanceBandFor(1 * YEAR)!.payDays).toBe(90);
    expect(severanceBandFor(3 * YEAR - 1)!.payDays).toBe(90);
  });

  it('20 ปีพอดีได้ 400 วัน ไม่ใช่ 300', () => {
    expect(severanceBandFor(20 * YEAR - 1)!.payDays).toBe(300);
    expect(severanceBandFor(20 * YEAR)!.payDays).toBe(400);
    expect(severanceBandFor(40 * YEAR)!.payDays).toBe(400);
  });

  it('ครบทุกขั้นตามมาตรา 118', () => {
    expect(SEVERANCE_BANDS.map((t) => t.payDays)).toEqual([30, 90, 180, 240, 300, 400]);
  });

  it('ขั้นต่อเนื่องกันไม่มีช่องว่างและไม่ซ้อนทับ', () => {
    for (let i = 1; i < SEVERANCE_BANDS.length; i++) {
      expect(SEVERANCE_BANDS[i].minDays).toBe(SEVERANCE_BANDS[i - 1].maxDays);
    }
  });

  it('ปฏิเสธอายุงานติดลบ', () => {
    expect(() => severanceBandFor(-1)).toThrow();
  });
});
