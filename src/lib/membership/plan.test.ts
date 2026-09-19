import { describe, it, expect } from 'vitest';
import { DAY, daysLeft, expiringSoon, extendExpiry, planOf } from './plan';
import { EXPIRING_SOON_DAYS } from '@/lib/plan-limits';

const now = 1_800_000_000;

describe('planOf', () => {
  it('พรีเมียมเมื่อวันหมดอายุยังไม่ถึง ขอบเขตวินาทีเดียวกัน = หมดแล้ว', () => {
    expect(planOf(null, now)).toBe('free');
    expect(planOf(undefined, now)).toBe('free');
    expect(planOf(now, now)).toBe('free');
    expect(planOf(now + 1, now)).toBe('premium');
  });
});

describe('extendExpiry', () => {
  it('ไม่เคยมี / หมดไปแล้ว → นับจากวันนี้', () => {
    expect(extendExpiry(null, now, 30)).toBe(now + 30 * DAY);
    expect(extendExpiry(now - DAY, now, 30)).toBe(now + 30 * DAY);
  });
  it('ยังไม่หมด → บวกต่อจากวันหมดอายุเดิม ไม่เสียวันที่เหลือ', () => {
    expect(extendExpiry(now + 5 * DAY, now, 30)).toBe(now + 35 * DAY);
  });
});

describe('expiringSoon / daysLeft', () => {
  it('เตือนเมื่อเหลือไม่เกินเกณฑ์ และไม่เตือนคนที่ไม่ได้เป็นสมาชิก', () => {
    expect(expiringSoon(now + EXPIRING_SOON_DAYS * DAY, now)).toBe(true);
    expect(expiringSoon(now + EXPIRING_SOON_DAYS * DAY + 1, now)).toBe(false);
    expect(expiringSoon(now - 1, now)).toBe(false);
    expect(expiringSoon(null, now)).toBe(false);
  });
  it('daysLeft ปัดขึ้น', () => {
    expect(daysLeft(now + 2 * 3600, now)).toBe(1);
    expect(daysLeft(now + 30 * DAY, now)).toBe(30);
    expect(daysLeft(now - 5, now)).toBe(0);
  });
});
