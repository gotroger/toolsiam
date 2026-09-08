import { describe, it, expect } from 'vitest';
import { checkTicket, checkTickets, InvalidTicketError, normalizeTicket } from './lottery';
import type { LotteryDraw } from '@/data/lottery/schema';

const seq = (n: number, start: number) =>
  Array.from({ length: n }, (_, i) => String(start + i).padStart(6, '0'));

/** งวดสมมติสำหรับทดสอบ logic — ไม่ใช่ผลรางวัลจริง */
const draw: LotteryDraw = {
  drawDate: '2026-09-01',
  prizes: {
    first: ['123456'],
    firstNear: ['123455', '123457'],
    second: seq(5, 200_000),
    third: seq(10, 300_000),
    fourth: seq(50, 400_000),
    fifth: seq(100, 500_000),
    threeDigitFront: ['111', '222'],
    threeDigitBack: ['789', '444'],
    twoDigitBack: ['56'],
  },
  sourceUrl: 'https://www.glo.or.th/',
  enteredAt: '2026-09-02',
  status: 'verified',
};

describe('normalizeTicket', () => {
  it('ตัดช่องว่างและขีดที่ผู้ใช้พิมพ์ติดมา', () => {
    expect(normalizeTicket(' 12 34-56 ')).toBe('123456');
  });

  it('เก็บเลขศูนย์นำหน้าไว้ ไม่แปลงเป็นตัวเลข', () => {
    expect(normalizeTicket('012345')).toBe('012345');
  });

  it('ปฏิเสธจำนวนหลักที่ไม่ใช่ 6 พร้อมบอกว่ากรอกมากี่หลัก', () => {
    expect(() => normalizeTicket('12345')).toThrow('กรอกมา 5 หลัก');
    expect(() => normalizeTicket('1234567')).toThrow('กรอกมา 7 หลัก');
  });

  it('ปฏิเสธตัวอักษรและค่าว่าง', () => {
    expect(() => normalizeTicket('12345ก')).toThrow(InvalidTicketError);
    expect(() => normalizeTicket('   ')).toThrow('กรุณากรอก');
  });
});

describe('ตรวจรางวัล', () => {
  it('ถูกรางวัลที่ 1 ได้เงินรางวัลที่ 1 และเลขท้าย 2 ตัวพร้อมกัน', () => {
    const r = checkTicket('123456', draw);
    expect(r.wins.map((w) => w.prize.id)).toEqual(['first', 'twoDigitBack']);
    expect(r.totalAmount).toBe(6_002_000);
  });

  it('ถูกรางวัลข้างเคียงรางวัลที่ 1', () => {
    const r = checkTicket('123455', draw);
    expect(r.wins.map((w) => w.prize.id)).toContain('firstNear');
    expect(r.totalAmount).toBe(100_000);
  });

  it('เลขท้าย 3 ตัวและเลขท้าย 2 ตัวถูกพร้อมกันได้', () => {
    // ลงท้าย 789 → ถูกเลขท้าย 3 ตัว แต่ท้าย 2 ตัวเป็น 89 ไม่ตรงกับ 56
    const r = checkTicket('999789', draw);
    expect(r.wins.map((w) => w.prize.id)).toEqual(['threeDigitBack']);
    expect(r.totalAmount).toBe(4_000);
  });

  it('เลขหน้า 3 ตัวเทียบจากต้นหมายเลข ไม่ใช่ท้าย', () => {
    expect(checkTicket('111999', draw).wins.map((w) => w.prize.id)).toEqual(['threeDigitFront']);
    expect(checkTicket('999111', draw).wins.map((w) => w.prize.id)).toEqual([]);
  });

  it('ไม่ถูกอะไรเลยได้ผลลัพธ์ว่างและยอด 0 ไม่ใช่ error', () => {
    const r = checkTicket('987654', draw);
    expect(r.wins).toEqual([]);
    expect(r.totalAmount).toBe(0);
  });

  it('ถูกรางวัลที่ 5 ซึ่งมีร้อยรางวัล', () => {
    const r = checkTicket('500099', draw);
    expect(r.wins.map((w) => w.prize.id)).toContain('fifth');
  });

  it('หมายเลขที่มีศูนย์นำหน้าถูกเทียบอย่างถูกต้อง', () => {
    const zeroDraw: LotteryDraw = { ...draw, prizes: { ...draw.prizes, first: ['000123'], firstNear: ['000122', '000124'] } };
    expect(checkTicket('000123', zeroDraw).wins.map((w) => w.prize.id)).toContain('first');
    // "123" ไม่ใช่หมายเลขสลาก — ต้องถูกปฏิเสธ ไม่ใช่เติมศูนย์ให้เองแล้วบอกว่าถูกรางวัล
    expect(() => checkTicket('123', zeroDraw)).toThrow(InvalidTicketError);
  });

  it('รับหมายเลขที่มีขีดคั่นจากการคัดลอกมา', () => {
    expect(checkTicket('12-34-56', draw).totalAmount).toBe(6_002_000);
  });
});

describe('ตรวจหลายใบพร้อมกัน', () => {
  it('รวมยอดทุกใบและข้ามบรรทัดว่าง', () => {
    const r = checkTickets(['123456', '', '  ', '987654'], draw);
    expect(r.results).toHaveLength(2);
    expect(r.totalAmount).toBe(6_002_000);
  });

  it('ใบที่รูปแบบผิดถูกรายงานแยก ไม่ทำให้ทั้งชุดล้ม', () => {
    const r = checkTickets(['123456', '12345', 'abcdef'], draw);
    expect(r.results).toHaveLength(1);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0].input).toBe('12345');
    expect(r.totalAmount).toBe(6_002_000);
  });

  it('ไม่มีใบเลยได้ผลลัพธ์ว่าง', () => {
    expect(checkTickets([], draw)).toEqual({ results: [], errors: [], totalAmount: 0 });
  });
});
