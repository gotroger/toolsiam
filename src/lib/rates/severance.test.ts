import { describe, it, expect } from 'vitest';
import { SEVERANCE_BANDS, severanceBandFor } from './severance';
describe('ค่าชดเชยตามวันและปีเต็ม', () => {
  it('ครบ 120 วัน และขอบปีเต็มทุกขั้น', () => {
    expect(severanceBandFor(119, 0)).toBeNull();
    expect(severanceBandFor(120, 0)?.payDays).toBe(30);
    for (const [years, pay] of [
      [1, 90],
      [2, 90],
      [3, 180],
      [5, 180],
      [6, 240],
      [9, 240],
      [10, 300],
      [19, 300],
      [20, 400],
    ]) {
      expect(severanceBandFor(365 * years, years)?.payDays).toBe(pay);
    }
  });
  it('ห้ามอนุมานปีเต็มจากจำนวนวัน', () => {
    expect(severanceBandFor(2190, 5)?.payDays).toBe(180);
  });
  it('ตารางครบและช่วงปีต่อเนื่อง', () => {
    expect(SEVERANCE_BANDS.map((t) => t.payDays)).toEqual([30, 90, 180, 240, 300, 400]);
    for (let i = 1; i < SEVERANCE_BANDS.length; i++)
      expect(SEVERANCE_BANDS[i].minYears).toBe(SEVERANCE_BANDS[i - 1].maxYears);
  });
  it('ปฏิเสธอายุงานไม่ถูกต้อง', () => {
    expect(() => severanceBandFor(-1, 0)).toThrow();
    expect(() => severanceBandFor(120, 0.5)).toThrow();
  });
});
