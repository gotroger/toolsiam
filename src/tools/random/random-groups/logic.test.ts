import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import { makeGroups, MAX_GROUPS } from './logic';

const TEN = Array.from({ length: 10 }, (_, i) => `คนที่ ${i + 1}`);
const rng = () => seededRng('แบ่งกลุ่ม');
const sizes = (groups: string[][]) => groups.map((g) => g.length);

describe('makeGroups — แบ่งเป็นจำนวนกลุ่ม', () => {
  it('10 คนเป็น 3 กลุ่ม ได้ 4/3/3 — เศษต้องถูกแจก ไม่ใช่ทิ้ง', () => {
    const groups = makeGroups(TEN, { mode: 'byCount', value: 3 }, rng());
    expect(sizes(groups)).toEqual([4, 3, 3]);
  });

  it('ทุกคนถูกจัดลงกลุ่มครบ ไม่หายไม่ซ้ำ', () => {
    const groups = makeGroups(TEN, { mode: 'byCount', value: 3 }, rng());
    expect(groups.flat().sort()).toEqual([...TEN].sort());
  });

  it('แบ่งลงตัวได้กลุ่มเท่ากันหมด', () => {
    expect(sizes(makeGroups(TEN, { mode: 'byCount', value: 5 }, rng()))).toEqual([2, 2, 2, 2, 2]);
  });

  it('กลุ่มเดียวได้ทุกคนอยู่ด้วยกัน', () => {
    expect(sizes(makeGroups(TEN, { mode: 'byCount', value: 1 }, rng()))).toEqual([10]);
  });

  it('จำนวนกลุ่มมากกว่าจำนวนคนเป็นข้อผิดพลาด — กลุ่มว่างไม่ใช่คำตอบที่ใช้ได้', () => {
    expect(() => makeGroups(TEN, { mode: 'byCount', value: 11 }, rng())).toThrow(/10/);
  });

  it('จำนวนกลุ่มต้องเป็นจำนวนเต็มตั้งแต่ 1', () => {
    expect(() => makeGroups(TEN, { mode: 'byCount', value: 0 }, rng())).toThrow();
    expect(() => makeGroups(TEN, { mode: 'byCount', value: 2.5 }, rng())).toThrow();
  });
});

describe('makeGroups — แบ่งตามขนาดกลุ่ม', () => {
  it('10 คน กลุ่มละ 3 ได้ 4 กลุ่มแบบเกลี่ย 3/3/2/2 ไม่ใช่ 3/3/3/1', () => {
    expect(sizes(makeGroups(TEN, { mode: 'bySize', value: 3 }, rng()))).toEqual([3, 3, 2, 2]);
  });

  it('10 คน กลุ่มละ 4 ได้ 4/3/3 ไม่ใช่ 4/4/2', () => {
    expect(sizes(makeGroups(TEN, { mode: 'bySize', value: 4 }, rng()))).toEqual([4, 3, 3]);
  });

  it('ทุกขนาด: จำนวนกลุ่มเท่าเดิม ไม่มีกลุ่มเกินขนาดที่กำหนด และต่างกันไม่เกิน 1 คน', () => {
    for (let n = 1; n <= 40; n++) {
      const names = Array.from({ length: n }, (_, i) => `${i}`);
      for (let size = 1; size <= n + 2; size++) {
        const got = sizes(makeGroups(names, { mode: 'bySize', value: size }, rng()));
        expect(got).toHaveLength(Math.ceil(n / size));
        expect(Math.max(...got)).toBeLessThanOrEqual(size);
        expect(Math.max(...got) - Math.min(...got)).toBeLessThanOrEqual(1);
        expect(got.reduce((a, b) => a + b, 0)).toBe(n);
      }
    }
  });

  it('ลงตัวพอดีไม่มีกลุ่มเศษ', () => {
    expect(sizes(makeGroups(TEN, { mode: 'bySize', value: 5 }, rng()))).toEqual([5, 5]);
  });

  it('ขนาดกลุ่มใหญ่กว่าจำนวนคนได้กลุ่มเดียว', () => {
    expect(sizes(makeGroups(TEN, { mode: 'bySize', value: 20 }, rng()))).toEqual([10]);
  });

  it('ขนาดกลุ่มต้องเป็นจำนวนเต็มตั้งแต่ 1', () => {
    expect(() => makeGroups(TEN, { mode: 'bySize', value: 0 }, rng())).toThrow();
  });

  it('แตกเป็นกลุ่มเกินเพดานเป็นข้อผิดพลาด', () => {
    const many = Array.from({ length: MAX_GROUPS + 5 }, (_, i) => `${i}`);
    expect(() => makeGroups(many, { mode: 'bySize', value: 1 }, rng())).toThrow();
  });
});

describe('makeGroups — ทั่วไป', () => {
  it('รายการว่างเป็นข้อผิดพลาด', () => {
    expect(() => makeGroups([], { mode: 'byCount', value: 2 }, rng())).toThrow();
  });

  it('seed เดิมได้การแบ่งกลุ่มเดิมเป๊ะ', () => {
    const o = { mode: 'byCount', value: 3 } as const;
    expect(makeGroups(TEN, o, seededRng('K7M2'))).toEqual(makeGroups(TEN, o, seededRng('K7M2')));
  });

  it('seed ต่างกันได้การแบ่งกลุ่มต่างกัน', () => {
    const o = { mode: 'byCount', value: 3 } as const;
    expect(makeGroups(TEN, o, seededRng('K7M2'))).not.toEqual(makeGroups(TEN, o, seededRng('QX4P')));
  });
});
