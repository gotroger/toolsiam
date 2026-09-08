import { describe, it, expect } from 'vitest';
import {
  assertValidDraw, distinctPermutations, DrawValidationError, expectedShuffle3,
  HEADLINE_PRIZES, MAJOR_PRIZES, N3_PRIZE_STRUCTURE, neighboursOf, PRIZE_STRUCTURE, validateDrawIssues,
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
    expect([...PRIZE_STRUCTURE].map((p) => p.id).sort()).toEqual([
      'fifth', 'first', 'firstNear', 'fourth', 'second',
      'third', 'threeDigitBack', 'threeDigitFront', 'twoDigitBack',
    ]);
  });

  it('เรียงตามที่ประกาศทางการจัดวาง — สี่ช่องบนสุดคือรางวัลที่ 1 และเลขหน้า/ท้าย', () => {
    expect(HEADLINE_PRIZES.map((p) => p.id)).toEqual([
      'first', 'threeDigitFront', 'threeDigitBack', 'twoDigitBack',
    ]);
    expect(MAJOR_PRIZES.map((p) => p.id)).toEqual([
      'firstNear', 'second', 'third', 'fourth', 'fifth',
    ]);
    expect(HEADLINE_PRIZES.length + MAJOR_PRIZES.length).toBe(PRIZE_STRUCTURE.length);
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


describe('สลากตัวเลขสามหลัก (N3)', () => {
  const n3 = {
    straight3: { price: 5801, numbers: ['212'] },
    shuffle3: { price: 2702, numbers: ['122', '221'] },
    straight2: { price: 582, numbers: ['04'] },
    special: { price: 839705, numbers: ['212000003860'] },
  };

  it('มีครบสี่รางวัลตามที่ประกาศทางการ', () => {
    expect(N3_PRIZE_STRUCTURE.map((p) => p.id)).toEqual(['straight3', 'shuffle3', 'straight2', 'special']);
    expect(N3_PRIZE_STRUCTURE.map((p) => p.digits)).toEqual([3, 3, 2, 12]);
  });

  it('งวดที่มี n3 ถูกต้องผ่าน validator', () => {
    expect(validateDrawIssues(fixture({ n3 }))).toEqual([]);
  });

  it('งวดที่ไม่มี n3 ถือว่าถูกต้อง — งวดก่อน N3 เริ่มขายไม่มีส่วนนี้', () => {
    expect(validateDrawIssues(fixture())).toEqual([]);
  });

  it('สามสลับหลักคือการสลับตำแหน่งของสามตรง ยกเว้นตัวเอง', () => {
    expect(expectedShuffle3('212')).toEqual(['122', '221']);
    expect(expectedShuffle3('209')).toEqual(['029', '092', '290', '902', '920']);
  });

  it('เลขที่มีตัวซ้ำได้ 2 รางวัล เลขที่ไม่ซ้ำได้ 5 รางวัล — จำนวนจึงไม่คงที่', () => {
    expect(expectedShuffle3('212')).toHaveLength(2);
    expect(expectedShuffle3('209')).toHaveLength(5);
    expect(expectedShuffle3('111')).toHaveLength(0);
  });

  it('จับสามสลับหลักที่ไม่ใช่การสลับของสามตรง', () => {
    const bad = fixture({ n3: { ...n3, shuffle3: { price: 2702, numbers: ['999', '888'] } } });
    expect(validateDrawIssues(bad).join(' ')).toContain('รางวัลสามสลับหลักของเลข 212');
  });

  it('จับสามสลับหลักที่จำนวนไม่ครบ', () => {
    const bad = fixture({ n3: { ...n3, shuffle3: { price: 2702, numbers: ['122'] } } });
    expect(validateDrawIssues(bad).join(' ')).toContain('2 รางวัล');
  });

  it('จับเงินรางวัลที่ไม่ใช่ตัวเลขบวก — N3 แบ่งเงินรางวัลตามยอดขาย ต้องมีค่าเสมอ', () => {
    expect(validateDrawIssues(fixture({ n3: { ...n3, straight2: { price: 0, numbers: ['04'] } } })).join(' '))
      .toContain('เงินรางวัลต้องเป็นตัวเลขมากกว่า 0');
  });

  it('จับจำนวนหลักที่ผิดของรางวัลพิเศษ', () => {
    const bad = fixture({ n3: { ...n3, special: { price: 839705, numbers: ['212'] } } });
    expect(validateDrawIssues(bad).join(' ')).toContain('ตัวเลข 12 หลัก');
  });

  it('จับกรณีมี n3 แต่ขาดรางวัลบางประเภท', () => {
    const { special, ...rest } = n3;
    expect(validateDrawIssues(fixture({ n3: rest })).join(' ')).toContain('รางวัลพิเศษ');
  });

  it('distinctPermutations ไม่คืนค่าซ้ำ', () => {
    expect(distinctPermutations('112').sort()).toEqual(['112', '121', '211']);
    expect(distinctPermutations('123')).toHaveLength(6);
  });
});
