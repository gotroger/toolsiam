import { describe, it, expect } from 'vitest';
import {
  SECTION_33_RATES, SECTION_40_OPTIONS, section33Contribution, section39Contribution,
  SOCIAL_SECURITY_SOURCE, wageCapAt,
} from './social-security';

describe('เพดานค่าจ้าง ม.33', () => {
  it('ใช้เพดาน 17,500 ตั้งแต่ 1 ม.ค. 2569', () => {
    expect(wageCapAt('2026-01-01').maxBase).toBe(17_500);
    expect(wageCapAt('2026-09-08').maxBase).toBe(17_500);
  });

  it('ก่อนวันมีผลยังใช้เพดานเดิม 15,000', () => {
    expect(wageCapAt('2025-12-31').maxBase).toBe(15_000);
  });

  it('เก็บเป็นรายการที่มีวันมีผล ไม่ใช่ค่าคงที่ตัวเดียว', () => {
    expect(wageCapAt('2026-01-01')).not.toEqual(wageCapAt('2025-12-31'));
  });
});

describe('เงินสมทบ ม.33', () => {
  const asOf = '2026-09-08';

  it('เงินเดือนถึงเพดานส่ง 875 บาท (17,500 × 5%) ไม่ใช่ 750 ของเพดานเก่า', () => {
    const r = section33Contribution(30_000, asOf);
    expect(r.base).toBe(17_500);
    expect(r.employee).toBe(875);
    expect(r.employer).toBe(875);
    expect(r.total).toBe(1750);
  });

  it('เงินเดือนต่ำกว่าฐานขั้นต่ำถูกยกขึ้นเป็น 1,650 → ส่ง 82.50 บาท', () => {
    const r = section33Contribution(1_000, asOf);
    expect(r.base).toBe(1_650);
    expect(r.employee).toBe(82.5);
  });

  it('เงินเดือนกลางช่วงคิดจากค่าจ้างจริง', () => {
    expect(section33Contribution(12_000, asOf).employee).toBe(600);
  });

  it('รัฐบาลสมทบ 2.75% แยกจากสองฝ่าย', () => {
    expect(SECTION_33_RATES.government).toBe(0.0275);
    expect(section33Contribution(10_000, asOf).government).toBe(275);
  });

  it('เงินเดือนเท่าเพดานเดิมได้ยอดต่างกันตามวันที่ใช้', () => {
    expect(section33Contribution(20_000, '2025-06-01').employee).toBe(750);
    expect(section33Contribution(20_000, '2026-06-01').employee).toBe(875);
  });

  it('ปฏิเสธค่าจ้างติดลบ', () => {
    expect(() => section33Contribution(-1, asOf)).toThrow();
  });
});

describe('ม.39 และ ม.40', () => {
  it('ม.39 = 4,800 × 9% = 432 บาท', () => {
    expect(section39Contribution()).toBe(432);
  });

  it('ม.40 มีสามทางเลือกตามที่กฎหมายกำหนด', () => {
    expect(SECTION_40_OPTIONS.map((o) => o.contribution)).toEqual([70, 100, 300]);
    expect(SECTION_40_OPTIONS.map((o) => o.cases)).toEqual([3, 4, 5]);
  });
});

describe('แหล่งอ้างอิง', () => {
  it('มี URL ทางการและวันตรวจล่าสุด', () => {
    expect(SOCIAL_SECURITY_SOURCE.sourceUrl).toMatch(/^https:\/\/www\.sso\.go\.th\//);
    expect(SOCIAL_SECURITY_SOURCE.lastVerifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(SOCIAL_SECURITY_SOURCE.effectiveFrom).toBe('2026-01-01');
  });
});
