import { describe, it, expect } from 'vitest';
import { seededRng } from '@/lib/random';
import { drawLuckyNumbers, MAX_LUCKY } from './logic';
import { luckyNumberMeta } from './meta';

const rng = () => seededRng('เลขนำโชค');

describe('drawLuckyNumbers', () => {
  it('เลข 2 ตัวมีสองหลักเสมอ และเติมศูนย์นำหน้า', () => {
    const r = rng();
    for (let i = 0; i < 200; i++) {
      for (const n of drawLuckyNumbers(2, 3, r)) expect(n).toMatch(/^\d{2}$/);
    }
  });

  it('เลข 3 ตัวมีสามหลักเสมอ', () => {
    const r = rng();
    for (let i = 0; i < 200; i++) {
      for (const n of drawLuckyNumbers(3, 3, r)) expect(n).toMatch(/^\d{3}$/);
    }
  });

  it('เลข 00 และ 000 ออกได้ — ไม่ถูกตัดทิ้งโดยไม่ตั้งใจ', () => {
    const r = rng();
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const n of drawLuckyNumbers(2, 10, r)) seen.add(n);
    expect(seen.has('00')).toBe(true);
    expect(seen.size).toBe(100);
  });

  it('ได้จำนวนตามที่ขอ และไม่ซ้ำกันในชุดเดียว', () => {
    const out = drawLuckyNumbers(3, 6, rng());
    expect(out).toHaveLength(6);
    expect(new Set(out).size).toBe(6);
  });

  it('จำนวนหลักที่ไม่รองรับเป็นข้อผิดพลาด', () => {
    // @ts-expect-error ทดสอบค่าที่ TypeScript กันไว้แล้ว เผื่อหลุดมาจากข้อมูลภายนอก
    expect(() => drawLuckyNumbers(4, 1, rng())).toThrow();
  });

  it('จำนวนที่ขอต้องอยู่ในช่วงที่รองรับ', () => {
    expect(() => drawLuckyNumbers(2, 0, rng())).toThrow();
    expect(() => drawLuckyNumbers(2, MAX_LUCKY + 1, rng())).toThrow();
    expect(() => drawLuckyNumbers(2, 1.5, rng())).toThrow();
  });

  it('seed เดิมให้เลขชุดเดิม', () => {
    expect(drawLuckyNumbers(2, 4, seededRng('K7M2'))).toEqual(drawLuckyNumbers(2, 4, seededRng('K7M2')));
  });
});

describe('ถ้อยคำของเครื่องมือ', () => {
  const prose = [
    luckyNumberMeta.name,
    luckyNumberMeta.description,
    ...luckyNumberMeta.howTo,
    ...luckyNumberMeta.faq.flatMap((item) => [item.q, item.a]),
  ].join(' ');

  it('ไม่ใช้ถ้อยคำชักชวนให้เล่นพนัน — กติกาเดียวกับตำราฝัน', () => {
    expect(prose).not.toMatch(/เลขเด็ด|ซื้อหวย|แทงหวย|เลขท้าย|งวดนี้|ถูกรางวัล|เลขแม่น/);
  });

  it('มีคำเตือนเสมอ และบอกชัดว่าไม่ใช่การทำนาย', () => {
    expect(luckyNumberMeta.disclaimer ?? '').not.toBe('');
    expect(luckyNumberMeta.disclaimer).toMatch(/ไม่ใช่การทำนาย/);
  });

  it('ไม่ถูกดันขึ้นหน้าแรก — ไม่ควรเป็นหน้าตาของเว็บ', () => {
    expect(luckyNumberMeta.featuredRank).toBeUndefined();
  });
});
