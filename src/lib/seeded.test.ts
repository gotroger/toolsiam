import { describe, it, expect } from 'vitest';
import { hashString, pickBySeed, pickForGroup } from './seeded';

describe('hashString', () => {
  it('seed เดิมให้ค่าเดิมเสมอ', () => {
    expect(hashString('aries-2026-09-08')).toBe(hashString('aries-2026-09-08'));
  });

  it('seed ต่างกันเล็กน้อยให้ค่าต่างกันมาก', () => {
    expect(hashString('aries-2026-09-08')).not.toBe(hashString('aries-2026-09-09'));
    expect(hashString('aries-2026-09-08')).not.toBe(hashString('taurus-2026-09-08'));
  });

  it('อยู่ในช่วง 32-bit ไม่ติดลบ', () => {
    for (const s of ['', 'a', 'ราศีเมษ', 'x'.repeat(500)]) {
      const h = hashString(s);
      expect(Number.isInteger(h)).toBe(true);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(0xffffffff);
    }
  });
});

describe('pickBySeed', () => {
  const pool = ['a', 'b', 'c', 'd', 'e'];

  it('seed เดิมได้รายการเดิม', () => {
    expect(pickBySeed(pool, 'x')).toBe(pickBySeed(pool, 'x'));
  });

  it('กระจายไปทั่ว pool ไม่กระจุกอยู่รายการเดียว', () => {
    const seen = new Set(Array.from({ length: 200 }, (_, i) => pickBySeed(pool, `s${i}`)));
    expect(seen.size).toBe(pool.length);
  });

  it('pool ว่างถือเป็นข้อผิดพลาดของข้อมูล', () => {
    expect(() => pickBySeed([], 'x')).toThrow('อย่างน้อยหนึ่งรายการ');
  });
});

describe('pickForGroup', () => {
  const pool = Array.from({ length: 60 }, (_, i) => `msg-${i}`);

  it('ทุกกลุ่มในวันเดียวกันได้ข้อความไม่ซ้ำกันเลย', () => {
    for (const day of ['2026-09-08', '2026-12-31', '2027-01-01']) {
      const picks = Array.from({ length: 12 }, (_, g) => pickForGroup(pool, day, g, 12));
      expect(new Set(picks).size).toBe(12);
    }
  });

  it('กลุ่มเดิมวันเดิมได้ข้อความเดิมเสมอ', () => {
    expect(pickForGroup(pool, '2026-09-08', 3, 12)).toBe(pickForGroup(pool, '2026-09-08', 3, 12));
  });

  it('กลุ่มเดิมได้ข้อความครบทั้ง pool เมื่อเวลาผ่านไปพอ', () => {
    const seen = new Set(
      Array.from({ length: 2_000 }, (_, i) => pickForGroup(pool, `day-${i}`, 0, 12)),
    );
    expect(seen.size).toBe(pool.length);
  });

  it('pool เล็กกว่าจำนวนกลุ่มแจกไม่ซ้ำไม่ได้ ต้องแจ้งแทนที่จะแอบซ้ำ', () => {
    expect(() => pickForGroup(['a', 'b'], 'x', 0, 12)).toThrow('อย่างน้อย 12 รายการ');
  });

  it('ปฏิเสธลำดับกลุ่มและจำนวนกลุ่มที่ไม่ถูกต้อง', () => {
    expect(() => pickForGroup(pool, 'x', -1, 12)).toThrow();
    expect(() => pickForGroup(pool, 'x', 1.5, 12)).toThrow();
    expect(() => pickForGroup(pool, 'x', 0, 0)).toThrow();
  });
});
