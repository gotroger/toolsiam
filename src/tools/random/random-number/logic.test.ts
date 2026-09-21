import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import { drawNumbers, flipCoins, MAX_DICE, MAX_DRAW, rollDice } from './logic';

const rng = () => seededRng('ทดสอบตัวเลข');

describe('drawNumbers — ช่วงตัวเลข', () => {
  it('อยู่ในช่วงที่กำหนดเสมอ', () => {
    const out = drawNumbers({ min: 10, max: 20, count: 50, unique: false }, rng());
    expect(out).toHaveLength(50);
    for (const x of out) {
      expect(x).toBeGreaterThanOrEqual(10);
      expect(x).toBeLessThanOrEqual(20);
    }
  });

  it('min เท่ากับ max ได้ค่านั้นทุกตัว', () => {
    expect(drawNumbers({ min: 7, max: 7, count: 3, unique: false }, rng())).toEqual([7, 7, 7]);
  });

  it('min มากกว่า max เป็นข้อผิดพลาด', () => {
    expect(() => drawNumbers({ min: 20, max: 10, count: 1, unique: false }, rng())).toThrow();
  });

  it('ขอบเขตที่ไม่ใช่จำนวนเต็มเป็นข้อผิดพลาด', () => {
    expect(() => drawNumbers({ min: 1, max: 6.5, count: 1, unique: false }, rng())).toThrow();
  });

  it('โหมดไม่ซ้ำ — ไม่มีเลขซ้ำ', () => {
    const out = drawNumbers({ min: 1, max: 49, count: 6, unique: true }, rng());
    expect(new Set(out).size).toBe(6);
  });

  it('โหมดไม่ซ้ำ — ขอมากกว่าจำนวนเลขในช่วงเป็นข้อผิดพลาดที่บอกจำนวนจริง', () => {
    expect(() => drawNumbers({ min: 1, max: 5, count: 6, unique: true }, rng())).toThrow(/5/);
  });

  it('โหมดไม่ซ้ำ — ขอเท่าจำนวนในช่วงได้ครบทุกเลข', () => {
    const out = drawNumbers({ min: 1, max: 5, count: 5, unique: true }, rng());
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it('โหมดไม่ซ้ำกับช่วงกว้างมาก ยังไม่ซ้ำและไม่ค้าง', () => {
    const out = drawNumbers({ min: 1, max: 1_000_000, count: 200, unique: true }, rng());
    expect(new Set(out).size).toBe(200);
  });

  it('ขอเกินเพดานเป็นข้อผิดพลาด', () => {
    expect(() => drawNumbers({ min: 1, max: 10, count: MAX_DRAW + 1, unique: false }, rng())).toThrow();
  });

  it('seed เดิมให้ชุดเลขเดิม', () => {
    const o = { min: 1, max: 100, count: 5, unique: true } as const;
    expect(drawNumbers(o, seededRng('K7M2'))).toEqual(drawNumbers(o, seededRng('K7M2')));
  });
});

describe('rollDice — ทอยลูกเต๋า', () => {
  it('ทอย 3 ลูก 6 หน้า ได้ผล 3 ค่าในช่วง 1–6 และผลรวมตรงกัน', () => {
    const { rolls, total } = rollDice(3, 6, rng());
    expect(rolls).toHaveLength(3);
    for (const r of rolls) {
      expect(r).toBeGreaterThanOrEqual(1);
      expect(r).toBeLessThanOrEqual(6);
    }
    expect(total).toBe(rolls.reduce((sum, r) => sum + r, 0));
  });

  it('ลูกเต๋า 20 หน้าออกได้ทั้ง 1 และ 20', () => {
    const seen = new Set<number>();
    const r = rng();
    for (let i = 0; i < 500; i++) seen.add(rollDice(1, 20, r).total);
    expect(seen.has(1)).toBe(true);
    expect(seen.has(20)).toBe(true);
  });

  it('จำนวนลูกและจำนวนหน้าต้องสมเหตุสมผล', () => {
    expect(() => rollDice(0, 6, rng())).toThrow();
    expect(() => rollDice(MAX_DICE + 1, 6, rng())).toThrow();
    expect(() => rollDice(1, 1, rng())).toThrow();
    expect(() => rollDice(1, 6.5, rng())).toThrow();
  });
});

describe('flipCoins — หัวก้อย', () => {
  it('ออกได้ทั้งหัวและก้อย', () => {
    const out = flipCoins(200, rng());
    expect(out).toHaveLength(200);
    expect(new Set(out)).toEqual(new Set(['หัว', 'ก้อย']));
  });

  it('จำนวนครั้งต้องเป็นจำนวนเต็มตั้งแต่ 1 และไม่เกินเพดาน', () => {
    expect(() => flipCoins(0, rng())).toThrow();
    expect(() => flipCoins(MAX_DRAW + 1, rng())).toThrow();
  });
});
