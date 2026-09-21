import { describe, it, expect } from 'vitest';
import {
  cryptoRng,
  newSeed,
  randomInt,
  resolveDraw,
  sample,
  sampleWithReplacement,
  seededRng,
  shuffle,
  type Rng,
} from './random';

/** RNG ปลอมที่คายค่าตามลำดับที่กำหนด — ทำให้ทดสอบตรรกะการสุ่มได้แบบเป๊ะ ๆ */
function fixedRng(values: number[]): Rng {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error('RNG ปลอมถูกเรียกเกินจำนวนค่าที่เตรียมไว้');
    return values[i++];
  };
}

const UINT32_COUNT = 0x1_0000_0000;

describe('seededRng', () => {
  it('seed เดิมให้ลำดับเดิมทุกครั้ง', () => {
    const a = seededRng('งานเลี้ยงปีใหม่');
    const b = seededRng('งานเลี้ยงปีใหม่');
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('seed ต่างกันให้ลำดับต่างกัน', () => {
    const a = seededRng('abc');
    const b = seededRng('abd');
    const seqA = Array.from({ length: 20 }, () => a());
    const seqB = Array.from({ length: 20 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('seed ที่ต่างกันตัวเดียวต่างกันตั้งแต่ค่าแรก — นี่คือสิ่งที่การอุ่นเครื่องซื้อมา', () => {
    expect(seededRng('seed1')()).not.toBe(seededRng('seed2')());
  });

  it('seed ว่างใช้ได้ ไม่พัง', () => {
    expect(Number.isInteger(seededRng('')())).toBe(true);
  });

  it('คืน uint32 เสมอ — ไม่ติดลบ ไม่มีทศนิยม ไม่เกิน 2^32', () => {
    const rng = seededRng('ทดสอบขอบเขต');
    for (let i = 0; i < 1000; i++) {
      const x = rng();
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(UINT32_COUNT);
    }
  });
});

describe('cryptoRng', () => {
  it('คืน uint32 ในช่วงที่ถูกต้อง (ไม่ตรวจค่าที่ออก เพราะสุ่มจริง)', () => {
    const rng = cryptoRng();
    // เรียกเกินขนาด buffer ภายใน เพื่อให้แน่ใจว่าการเติม buffer รอบถัดไปทำงาน
    for (let i = 0; i < 300; i++) {
      const x = rng();
      expect(Number.isInteger(x)).toBe(true);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(UINT32_COUNT);
    }
  });

  it('ไม่คายค่าเดิมซ้ำทั้งชุด', () => {
    const rng = cryptoRng();
    const seen = new Set(Array.from({ length: 200 }, () => rng()));
    expect(seen.size).toBeGreaterThan(190);
  });
});

describe('randomInt', () => {
  it('min เท่ากับ max คืนค่านั้นโดยไม่เรียก RNG เลย', () => {
    const rng = fixedRng([]);
    expect(randomInt(rng, 7, 7)).toBe(7);
  });

  it('min มากกว่า max เป็นข้อผิดพลาด', () => {
    expect(() => randomInt(seededRng('x'), 10, 3)).toThrow();
  });

  it('ขอบเขตที่ไม่ใช่จำนวนเต็มเป็นข้อผิดพลาด', () => {
    expect(() => randomInt(seededRng('x'), 1, 6.5)).toThrow();
  });

  it('อยู่ในช่วง [min, max] เสมอ และไปถึงทั้งสองขอบได้', () => {
    const rng = seededRng('ลูกเต๋า');
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++) {
      const x = randomInt(rng, 1, 6);
      expect(x).toBeGreaterThanOrEqual(1);
      expect(x).toBeLessThanOrEqual(6);
      seen.add(x);
    }
    expect([...seen].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('ทิ้งค่าที่ตกหางแล้วสุ่มใหม่ — นี่คือส่วนที่กัน modulo bias', () => {
    // range = 3 → limit = floor(2^32 / 3) * 3 = 4294967295
    // ค่า 4294967295 ต้องถูกทิ้ง แล้วใช้ค่าถัดไป (7 → 7 % 3 = 1 → 0 + 1)
    const rng = fixedRng([UINT32_COUNT - 1, 7]);
    expect(randomInt(rng, 0, 2)).toBe(1);
  });

  it('ค่าที่ไม่ตกหางใช้ได้ทันทีโดยไม่เรียก RNG ซ้ำ', () => {
    const rng = fixedRng([7]);
    expect(randomInt(rng, 0, 2)).toBe(1);
  });

  it('Rng ที่คืนค่าตกหางตลอดต้องโยนข้อผิดพลาด ไม่ใช่วนไม่จบจนหน้าค้าง', () => {
    const broken: Rng = () => UINT32_COUNT - 1;
    expect(() => randomInt(broken, 0, 2)).toThrow();
  });

  it('กระจายตัวใกล้เคียงสม่ำเสมอ — ไม่เอนไปหาเลขต้นช่วง', () => {
    const rng = seededRng('กระจายตัว');
    const counts = new Array(10).fill(0);
    const draws = 60_000;
    for (let i = 0; i < draws; i++) counts[randomInt(rng, 0, 9)]++;
    const expected = draws / 10;
    for (const c of counts) expect(Math.abs(c - expected) / expected).toBeLessThan(0.05);
  });
});

describe('shuffle', () => {
  it('ไม่แก้อาร์เรย์เดิม', () => {
    const src = ['ก', 'ข', 'ค'];
    shuffle(src, seededRng('s'));
    expect(src).toEqual(['ก', 'ข', 'ค']);
  });

  it('ได้สมาชิกครบเท่าเดิมไม่ขาดไม่เกิน', () => {
    const src = Array.from({ length: 50 }, (_, i) => i);
    const out = shuffle(src, seededRng('s'));
    expect([...out].sort((a, b) => a - b)).toEqual(src);
  });

  it('อาร์เรย์ว่างและสมาชิกเดียวไม่พัง', () => {
    expect(shuffle([], seededRng('s'))).toEqual([]);
    expect(shuffle(['เดียว'], seededRng('s'))).toEqual(['เดียว']);
  });

  it('การเรียงสลับของ 4 ตัวออกได้ครบทั้ง 24 แบบ อย่างสมดุล', () => {
    // ถ้าเขียนช่วงสุ่มผิดเป็น [0, i) (บั๊ก Sattolo) จะเหลือแค่ 6 แบบ ทั้งที่เทสต์อื่นยังผ่านหมด
    const rng = seededRng('ครบทุกแบบ');
    const counts = new Map<string, number>();
    const draws = 24_000;
    for (let i = 0; i < draws; i++) {
      const key = shuffle(['a', 'b', 'c', 'd'], rng).join('');
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    expect(counts.size).toBe(24);
    const expected = draws / 24;
    for (const count of counts.values()) expect(Math.abs(count - expected) / expected).toBeLessThan(0.2);
  });

  it('RNG ที่คืน 0 เสมอให้ผลที่คาดเดาได้ — พิสูจน์ว่าเป็น Fisher–Yates จริง', () => {
    // i=3: j=0 → [d,b,c,a] · i=2: j=0 → [c,b,d,a] · i=1: j=0 → [b,c,d,a]
    const zero: Rng = () => 0;
    expect(shuffle(['a', 'b', 'c', 'd'], zero)).toEqual(['b', 'c', 'd', 'a']);
  });
});

describe('sample — สุ่มแบบไม่ซ้ำ', () => {
  it('ได้จำนวนตามที่ขอ และไม่มีสมาชิกซ้ำ', () => {
    const src = Array.from({ length: 20 }, (_, i) => i);
    const out = sample(src, 5, seededRng('s'));
    expect(out).toHaveLength(5);
    expect(new Set(out).size).toBe(5);
    for (const x of out) expect(src).toContain(x);
  });

  it('ขอเท่าจำนวนที่มีได้ครบทุกตัว', () => {
    const src = ['ก', 'ข', 'ค'];
    const out = sample(src, 3, seededRng('s'));
    expect([...out].sort()).toEqual(['ก', 'ข', 'ค']);
  });

  it('ขอมากกว่าจำนวนที่มีเป็นข้อผิดพลาด', () => {
    expect(() => sample(['ก', 'ข'], 3, seededRng('s'))).toThrow();
  });

  it('ขอศูนย์รายการได้อาร์เรย์ว่าง', () => {
    expect(sample(['ก', 'ข'], 0, seededRng('s'))).toEqual([]);
  });

  it('จำนวนที่ขอต้องเป็นจำนวนเต็มไม่ติดลบ', () => {
    expect(() => sample(['ก'], -1, seededRng('s'))).toThrow();
    expect(() => sample(['ก'], 1.5, seededRng('s'))).toThrow();
  });
});

describe('sampleWithReplacement — สุ่มแบบซ้ำได้', () => {
  it('ขอมากกว่าจำนวนที่มีได้ เพราะซ้ำได้', () => {
    const out = sampleWithReplacement(['ก', 'ข'], 10, seededRng('s'));
    expect(out).toHaveLength(10);
    for (const x of out) expect(['ก', 'ข']).toContain(x);
  });

  it('รายการเดียวคืนรายการนั้นซ้ำ ๆ', () => {
    expect(sampleWithReplacement(['เดียว'], 3, seededRng('s'))).toEqual(['เดียว', 'เดียว', 'เดียว']);
  });

  it('รายการว่างเป็นข้อผิดพลาด', () => {
    expect(() => sampleWithReplacement([], 1, seededRng('s'))).toThrow();
  });
});

describe('newSeed', () => {
  it('อ่านออก คัดลอกง่าย และไม่มีตัวอักษรที่สับสน', () => {
    for (let i = 0; i < 50; i++) {
      const seed = newSeed();
      expect(seed).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
      expect(seed).not.toMatch(/[01OIL]/);
    }
  });

  it('ไม่ซ้ำกันในทางปฏิบัติ', () => {
    const seen = new Set(Array.from({ length: 200 }, () => newSeed()));
    expect(seen.size).toBeGreaterThan(195);
  });
});

describe('resolveDraw — นโยบายการสุ่มของทั้งหมวด', () => {
  it('seed ที่กรอกมาถูกตัดช่องว่างและทำเป็นตัวพิมพ์ใหญ่ แล้วให้สตรีมเดียวกับ seededRng', () => {
    const { rng, seed } = resolveDraw('  ab12cd34 ');
    expect(seed).toBe('AB12CD34');
    expect(rng()).toBe(seededRng('AB12CD34')());
  });

  it('ไม่กรอก seed = ปั่น seed ใหม่ให้ และบอกว่าใช้ตัวไหน', () => {
    const { seed } = resolveDraw('');
    expect(seed).toMatch(/^[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/);
  });

  it('ไม่กรอก seed สองครั้งได้คนละ seed', () => {
    expect(resolveDraw('').seed).not.toBe(resolveDraw('').seed);
  });

  it('กรอก seed เดิมกลับมาได้ผลเดิมเป๊ะ — สัญญาหลักของหมวดนี้', () => {
    const first = resolveDraw('');
    const replay = resolveDraw(first.seed);
    expect(Array.from({ length: 10 }, () => first.rng())).toEqual(Array.from({ length: 10 }, () => replay.rng()));
  });
});
