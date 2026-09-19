import { describe, it, expect } from 'vitest';
import {
  EXPIRING_SOON_DAYS,
  PLAN_LIMITS,
  PREMIUM_DAYS,
  PREMIUM_PRICE_BAHT,
  PREMIUM_PRICE_SATANG,
  QR_TTL_MINUTES,
  limitsFor,
  mb,
} from './plan-limits';

describe('plan-limits', () => {
  it('พรีเมียมไม่น้อยกว่าฟรีในทุกมิติ — ไม่งั้นจ่ายเงินแล้วได้น้อยลง', () => {
    const { free, premium } = PLAN_LIMITS;
    for (const k of ['pdf', 'image', 'office'] as const) {
      expect(premium.perFileMb[k]).toBeGreaterThan(free.perFileMb[k]);
    }
    expect(premium.maxFiles).toBeGreaterThan(free.maxFiles);
    expect(premium.totalMb).toBeGreaterThan(free.totalMb);
    expect(premium.pages).toBeGreaterThan(free.pages);
    expect(premium.zipExpandedMb).toBeGreaterThan(free.zipExpandedMb);
    expect(premium.cells).toBeGreaterThan(free.cells);
    expect(premium.timeoutMs).toBeGreaterThan(free.timeoutMs);
  });

  it('ขีดจำกัดฟรีตรงกับที่เว็บบังคับมาก่อนหน้านี้ (ผู้ใช้เดิมต้องไม่ได้น้อยลง)', () => {
    expect(PLAN_LIMITS.free).toMatchObject({
      perFileMb: { pdf: 15, image: 10, office: 5 },
      maxFiles: 20,
      totalMb: 30,
      pages: 150,
      cells: 100_000,
      timeoutMs: 60_000,
    });
  });

  it('ผู้ใช้ไม่ล็อกอินได้เท่าแพลนฟรี ไม่มีโควตาทดลอง', () => {
    expect(limitsFor('anonymous')).toBe(PLAN_LIMITS.free);
    expect(limitsFor('free')).toBe(PLAN_LIMITS.free);
    expect(limitsFor('premium')).toBe(PLAN_LIMITS.premium);
  });

  it('ราคาและระยะเวลาตามที่ตกลง: 19 บาท / 30 วัน', () => {
    expect(PREMIUM_PRICE_SATANG).toBe(1900);
    expect(PREMIUM_PRICE_BAHT).toBe(19);
    expect(PREMIUM_DAYS).toBe(30);
    expect(EXPIRING_SOON_DAYS).toBeLessThan(PREMIUM_DAYS);
    expect(QR_TTL_MINUTES).toBeGreaterThan(0);
  });

  it('mb แปลงเป็นไบต์แบบ binary', () => {
    expect(mb(1)).toBe(1_048_576);
  });
});
