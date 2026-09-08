import { describe, it, expect } from 'vitest';
import {
  assertValidDraw, DrawValidationError, neighboursOf, PRIZE_STRUCTURE, validateDrawIssues,
} from './schema';

/** งวดสมมติที่รูปแบบถูกต้องครบทุกด้าน — ใช้เป็นฐานแล้วดัดให้ผิดทีละจุด */
function fixture(overrides: Record<string, unknown> = {}) {
  const seq = (n: number, start: number) =>
    Array.from({ length: n }, (_, i) => String(start + i).padStart(6, '0'));
  return {
    drawDate: '2026-09-01',
    prizes: {
      first: ['123456'],
      firstNear: ['123455', '123457'],
      second: seq(5, 200_000),
      third: seq(10, 300_000),
      fourth: seq(50, 400_000),
      fifth: seq(100, 500_000),
      threeDigitFront: ['111', '222'],
      threeDigitBack: ['333', '444'],
      twoDigitBack: ['55'],
    },
    sourceUrl: 'https://www.glo.or.th/ตรวจผลสลาก',
    enteredAt: '2026-09-02',
    status: 'verified',
    ...overrides,
  };
}

describe('โครงสร้างรางวัล', () => {
  it('ครบทุกประเภทตามที่ประกาศใช้อยู่', () => {
    expect(PRIZE_STRUCTURE.map((p) => p.id)).toEqual([
      'first', 'firstNear', 'second', 'third', 'fourth', 'fifth',
      'threeDigitFront', 'threeDigitBack', 'twoDigitBack',
    ]);
  });

  it('จำนวนรางวัลและเงินรางวัลตรงกับโครงสร้างปัจจุบัน', () => {
    const by = Object.fromEntries(PRIZE_STRUCTURE.map((p) => [p.id, p]));
    expect(by.first).toMatchObject({ count: 1, amount: 6_000_000, digits: 6 });
    expect(by.firstNear).toMatchObject({ count: 2, amount: 100_000 });
    expect(by.second).toMatchObject({ count: 5, amount: 200_000 });
    expect(by.third).toMatchObject({ count: 10, amount: 80_000 });
    expect(by.fourth).toMatchObject({ count: 50, amount: 40_000 });
    expect(by.fifth).toMatchObject({ count: 100, amount: 20_000 });
    expect(by.twoDigitBack).toMatchObject({ count: 1, amount: 2_000, digits: 2 });
  });
});

describe('เลขข้างเคียงรางวัลที่ 1', () => {
  it('คือเลขก่อนหน้าและถัดไปหนึ่งหน่วย', () => {
    expect(neighboursOf('123456')).toEqual(['123455', '123457']);
  });

  it('วนรอบที่ขอบล่างและขอบบน', () => {
    expect(neighboursOf('000000')).toEqual(['999999', '000001']);
    expect(neighboursOf('999999')).toEqual(['999998', '000000']);
  });
});

describe('validator', () => {
  it('งวดที่ถูกต้องผ่านโดยไม่มีปัญหา', () => {
    expect(validateDrawIssues(fixture())).toEqual([]);
    expect(() => assertValidDraw(fixture())).not.toThrow();
  });

  it('จับจำนวนรางวัลที่ไม่ครบ', () => {
    const bad = fixture();
    (bad.prizes as Record<string, string[]>).second = ['200000'];
    expect(validateDrawIssues(bad).join(' ')).toContain('รางวัลที่ 2 ต้องมี 5 รางวัล');
  });

  it('จับจำนวนหลักที่ผิด และเลขที่ถูกตัดศูนย์นำหน้า', () => {
    const bad = fixture({ prizes: { ...fixture().prizes, twoDigitBack: ['5'] } });
    expect(validateDrawIssues(bad).join(' ')).toContain('ต้องเป็นตัวเลข 2 หลัก');
  });

  it('จับตัวเลขที่ส่งมาเป็น number แทนสตริง — เคสที่ทำให้ศูนย์นำหน้าหาย', () => {
    const bad = fixture({ prizes: { ...fixture().prizes, twoDigitBack: [5] } });
    expect(validateDrawIssues(bad).join(' ')).toContain('ห้ามตัดเลขศูนย์นำหน้า');
  });

  it('จับเลขซ้ำในรางวัลประเภทเดียวกัน', () => {
    const bad = fixture({ prizes: { ...fixture().prizes, threeDigitBack: ['333', '333'] } });
    expect(validateDrawIssues(bad).join(' ')).toContain('มีเลขซ้ำกัน');
  });

  it('จับรางวัลข้างเคียงที่ไม่ตรงกับรางวัลที่ 1 — ความสอดคล้องภายในที่ตรวจอัตโนมัติได้', () => {
    const bad = fixture({ prizes: { ...fixture().prizes, firstNear: ['999998', '999999'] } });
    expect(validateDrawIssues(bad).join(' ')).toContain('รางวัลข้างเคียงต้องเป็น 123455 และ 123457');
  });

  it('ยอมรับรางวัลข้างเคียงที่สลับลำดับกัน', () => {
    const ok = fixture({ prizes: { ...fixture().prizes, firstNear: ['123457', '123455'] } });
    expect(validateDrawIssues(ok)).toEqual([]);
  });

  it('บังคับให้อ้างอิงแหล่งทางการเท่านั้น', () => {
    expect(validateDrawIssues(fixture({ sourceUrl: 'https://example.com/หวย' })).join(' '))
      .toContain('glo.or.th');
  });

  it('บังคับรูปแบบวันที่และสถานะ', () => {
    expect(validateDrawIssues(fixture({ drawDate: '1 ก.ย. 2569' })).join(' ')).toContain('YYYY-MM-DD');
    expect(validateDrawIssues(fixture({ status: 'pending' })).join(' ')).toContain('status');
  });

  it('รายงานทุกปัญหาในครั้งเดียว ไม่หยุดที่ข้อแรก', () => {
    const bad = fixture({ drawDate: 'ผิด', sourceUrl: 'ผิด', status: 'ผิด' });
    expect(validateDrawIssues(bad).length).toBeGreaterThanOrEqual(3);
  });

  it('assertValidDraw โยน DrawValidationError ที่บอกปัญหาครบ', () => {
    try {
      assertValidDraw(fixture({ drawDate: 'ผิด' }));
      expect.unreachable('ควรโยน error');
    } catch (e) {
      expect(e).toBeInstanceOf(DrawValidationError);
      expect((e as DrawValidationError).issues.length).toBeGreaterThan(0);
    }
  });

  it('ปฏิเสธข้อมูลที่ไม่ใช่อ็อบเจกต์', () => {
    expect(validateDrawIssues(null).join(' ')).toContain('อ็อบเจกต์');
    expect(validateDrawIssues('123456').join(' ')).toContain('อ็อบเจกต์');
  });
});
