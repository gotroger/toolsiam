import { describe, expect, it } from 'vitest';
import { DREAM_ENTRIES } from './entries';
import { DREAM_LUCKY_NUMBERS } from './lucky-numbers';

describe('เลขนำโชคของความฝัน', () => {
  it('ทุกเรื่องมีเลขนำโชค และไม่มีเลขของเรื่องที่ไม่มีอยู่จริง', () => {
    const slugs = DREAM_ENTRIES.map((e) => e.slug).sort();
    expect(Object.keys(DREAM_LUCKY_NUMBERS).sort()).toEqual(slugs);
  });

  it('เลขเด่นเป็นหลักเดียว เลขคู่เป็นสองหลัก และเป็นสตริงทั้งหมด', () => {
    for (const [slug, n] of Object.entries(DREAM_LUCKY_NUMBERS)) {
      expect(n.digits.length, slug).toBe(2);
      expect(n.pairs.length, slug).toBe(3);
      for (const d of n.digits) expect(d, slug).toMatch(/^\d$/);
      for (const p of n.pairs) expect(p, slug).toMatch(/^\d{2}$/);
      expect(new Set(n.pairs).size, slug).toBe(n.pairs.length);
    }
  });

  it('เลขคู่ตัวแรกผสมจากเลขเด่นของเรื่องนั้นเอง', () => {
    for (const [slug, n] of Object.entries(DREAM_LUCKY_NUMBERS)) {
      expect([...n.pairs[0]!].sort(), slug).toEqual([...n.digits].sort());
    }
  });
});
