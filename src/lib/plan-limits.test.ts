import { describe, it, expect } from 'vitest';
import {
  EXPIRING_SOON_DAYS,
  PLAN_LIMITS,
  PREMIUM_DAYS,
  packById,
  PREMIUM_PACKS,
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

  it('แพ็ก 3 แบบเรียงจากสั้นไปยาว ยิ่งยาวยิ่งถูกต่อเดือน และ id ไม่ซ้ำ', () => {
    expect(PREMIUM_PACKS.map((p) => [p.id, p.days, p.priceSatang])).toEqual([
      ['m1', 30, 2900],
      ['m3', 90, 7900],
      ['m12', 365, 26900],
    ]);
    const perDay = PREMIUM_PACKS.map((p) => p.priceSatang / p.days);
    expect(perDay).toEqual([...perDay].sort((a, b) => b - a));
    expect(new Set(PREMIUM_PACKS.map((p) => p.id)).size).toBe(PREMIUM_PACKS.length);
  });

  it('packById: ไม่รู้จัก/ไม่ส่งมา → แพ็กเริ่มต้นเดือนเดียว (ค่าจากผู้ใช้เชื่อไม่ได้)', () => {
    expect(packById('m12').days).toBe(365);
    expect(packById(null).id).toBe('m1');
    expect(packById('ของปลอม').id).toBe('m1');
    expect(packById('m1').priceSatang).toBe(PREMIUM_PRICE_SATANG);
    expect(packById('m1').days).toBe(PREMIUM_DAYS);
  });

  it('ราคาและระยะเวลาตามที่ตกลง: 29 บาท / 30 วัน', () => {
    expect(PREMIUM_PRICE_SATANG).toBe(2900);
    expect(PREMIUM_PRICE_BAHT).toBe(29);
    expect(PREMIUM_DAYS).toBe(30);
    expect(EXPIRING_SOON_DAYS).toBeLessThan(PREMIUM_DAYS);
    expect(QR_TTL_MINUTES).toBeGreaterThan(0);
  });

  it('mb แปลงเป็นไบต์แบบ binary', () => {
    expect(mb(1)).toBe(1_048_576);
  });
});
