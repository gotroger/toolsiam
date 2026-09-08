import { describe, it, expect } from 'vitest';
import {
  adjacentDraws, deriveNearFirst, drawYears, drawsInYear, getDraw, hasDrawData, latestDraw, listDraws, validateDraw,
} from './draws';
import { draws as rawDraws } from './data/draws';
import { PRIZE_SPECS, getPrizeSpec, sortByPrizeOrder, totalPrizePool } from './prizes';
import { LOTTERY_DATA_PAGES, LOTTERY_HAS_RESULTS, NOINDEX_EXACT_PATHS, isNoindexPath } from '@/lib/noindex';
import type { Draw } from './types';

const sample: Draw = {
  date: '2026-09-01',
  results: [
    { id: 'first', amount: 6_000_000, numbers: ['000000'] },
    { id: 'second', amount: 200_000, numbers: ['222222', '333333', '444444', '555555', '666666'] },
    { id: 'front-three', amount: 4_000, numbers: ['123', '789'] },
    { id: 'last-three', amount: 4_000, numbers: ['456', '999'] },
    { id: 'last-two', amount: 2_000, numbers: ['56'] },
  ],
  source: { name: 'ทดสอบ', url: 'https://example.com', verifiedAt: '2026-09-08' },
};

describe('เลขข้างเคียงรางวัลที่ 1', () => {
  it('คือเลขที่มากกว่าและน้อยกว่าอยู่ 1', () => {
    expect(deriveNearFirst('123456')).toEqual(['123455', '123457']);
  });

  it('วนรอบที่ขอบของเลข 6 หลัก', () => {
    expect(deriveNearFirst('000000')).toEqual(['999999', '000001']);
    expect(deriveNearFirst('999999')).toEqual(['999998', '000000']);
  });
});

describe('โครงสร้างรางวัล', () => {
  it('id ไม่ซ้ำ order ไม่ซ้ำ และจำนวนหลักเป็น 2, 3 หรือ 6', () => {
    expect(new Set(PRIZE_SPECS.map((s) => s.id)).size).toBe(PRIZE_SPECS.length);
    expect(new Set(PRIZE_SPECS.map((s) => s.order)).size).toBe(PRIZE_SPECS.length);
    for (const s of PRIZE_SPECS) {
      expect([2, 3, 6]).toContain(s.digits);
      expect(s.count).toBeGreaterThan(0);
      expect(s.amount).toBeGreaterThan(0);
      // เลข 6 หลักเทียบทั้งใบ เลขสั้นเทียบหัวหรือท้ายเท่านั้น
      expect(s.match === 'full').toBe(s.digits === 6);
    }
  });

  it('เงินรางวัลรวมทั้งงวดตรงกับผลรวมของทุกประเภท', () => {
    expect(totalPrizePool()).toBe(PRIZE_SPECS.reduce((sum, s) => sum + s.amount * s.count, 0));
  });

  it('sortByPrizeOrder เรียงตามลำดับประกาศ ไม่ใช่ลำดับที่ส่งเข้ามา', () => {
    const sorted = sortByPrizeOrder([{ id: 'last-two' as const }, { id: 'first' as const }, { id: 'second' as const }]);
    expect(sorted.map((s) => s.id)).toEqual(['first', 'second', 'last-two']);
  });

  it('ถามประเภทที่ไม่มีเป็นข้อผิดพลาด', () => {
    // @ts-expect-error — ตั้งใจส่งค่าที่ไม่มีในระบบเพื่อตรวจว่ามันดังไม่ใช่เงียบ
    expect(() => getPrizeSpec('jackpot')).toThrow();
  });
});

describe('validateDraw', () => {
  it('งวดที่ถูกต้องไม่มีข้อผิดพลาด', () => {
    expect(validateDraw(sample)).toEqual([]);
  });

  it('จับจำนวนเลขไม่ครบตามประกาศ', () => {
    const broken: Draw = { ...sample, results: sample.results.map((r) => (r.id === 'second' ? { ...r, numbers: ['222222'] } : r)) };
    expect(validateDraw(broken).join(' ')).toContain('รางวัลที่ 2');
  });

  it('จับจำนวนหลักผิด', () => {
    const broken: Draw = { ...sample, results: [...sample.results.filter((r) => r.id !== 'last-two'), { id: 'last-two', amount: 2_000, numbers: ['5'] }] };
    expect(validateDraw(broken).join(' ')).toContain('2 หลัก');
  });

  it('จับงวดที่ไม่มีรางวัลที่ 1 และงวดที่ไม่ระบุที่มา', () => {
    const broken: Draw = { date: '2026-09-01', results: [], source: { name: '', url: '', verifiedAt: '' } };
    const errors = validateDraw(broken).join(' ');
    expect(errors).toContain('รางวัลที่ 1');
    expect(errors).toContain('ที่มา');
    expect(errors).toContain('ตรวจข้อมูล');
  });

  it('จับวันที่ที่ไม่มีอยู่จริง', () => {
    expect(validateDraw({ ...sample, date: '2026-02-30' }).join(' ')).toContain('วันที่ออกรางวัล');
  });
});

describe('ข้อมูลงวดในระบบ', () => {
  it('ทุกงวดผ่าน validateDraw', () => {
    for (const draw of rawDraws) expect(validateDraw(draw)).toEqual([]);
  });

  it('ไม่มีวันที่งวดซ้ำกัน', () => {
    const dates = rawDraws.map((d) => d.date);
    expect(new Set(dates).size).toBe(dates.length);
  });

  it('เรียงจากงวดล่าสุดไปเก่าสุด และงวดล่าสุดคือตัวแรก', () => {
    const dates = listDraws().map((d) => d.date);
    expect(dates).toEqual([...dates].sort().reverse());
    expect(latestDraw()?.date).toBe(dates[0]);
  });

  it('เติมรางวัลข้างเคียงให้อัตโนมัติเมื่อข้อมูลงวดไม่ได้กรอก', () => {
    for (const draw of listDraws()) {
      const near = draw.results.find((r) => r.id === 'near-first');
      const first = draw.results.find((r) => r.id === 'first');
      expect(near?.numbers).toEqual(deriveNearFirst(first!.numbers[0]));
    }
  });

  it('หางวดที่ไม่มีได้ undefined ไม่ใช่ error', () => {
    expect(getDraw('1900-01-01')).toBeUndefined();
    expect(adjacentDraws('1900-01-01')).toEqual({});
  });

  it('งวดก่อนหน้า/ถัดไปต่อกันเป็นลูกโซ่ตามลำดับเวลา', () => {
    const all = listDraws();
    all.forEach((draw, i) => {
      const { previous, next } = adjacentDraws(draw.date);
      expect(previous?.date).toBe(all[i + 1]?.date);
      expect(next?.date).toBe(all[i - 1]?.date);
    });
  });

  it('ปีที่มีข้อมูลครอบคลุมทุกงวด', () => {
    expect(drawYears().flatMap((y) => drawsInYear(y)).map((d) => d.date).sort())
      .toEqual(listDraws().map((d) => d.date).sort());
  });
});

/**
 * §8.4 — หน้าเปล่าห้ามถูก index
 * noindex.ts import อะไรไม่ได้ จึงต้องมีเทสต์ตัวนี้บังคับให้ค่าคงที่ตรงกับข้อมูลจริง
 */
describe('หน้าหวยที่พึ่งข้อมูลงวด', () => {
  it('LOTTERY_HAS_RESULTS ตรงกับข้อมูลใน data/draws.ts', () => {
    expect(LOTTERY_HAS_RESULTS).toBe(hasDrawData());
  });

  it('ยังไม่มีงวด = หน้าที่พึ่งข้อมูลทั้งหมด noindex, มีงวดแล้ว = index ได้ทุกหน้า', () => {
    for (const path of LOTTERY_DATA_PAGES) {
      expect(NOINDEX_EXACT_PATHS.includes(path)).toBe(!hasDrawData());
      expect(isNoindexPath(path)).toBe(!hasDrawData());
      expect(isNoindexPath(`${path}.html`)).toBe(!hasDrawData());
    }
  });

  it('หน้าแรกของ vertical และหน้าผลรายงวด ไม่เคยติด noindex จากรายการนี้', () => {
    expect(isNoindexPath('/lottery')).toBe(false);
    expect(isNoindexPath('/lottery/results/2026-09-01')).toBe(false);
  });
});
