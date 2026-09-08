import { describe, it, expect } from 'vitest';
import { checkTicket, checkTickets, isValidTicket, normalizeTicket, parseTickets, ticketPart } from './check';
import type { Draw } from './types';

/** งวดสมมติสำหรับทดสอบ — ไม่ใช่ผลรางวัลจริง */
const draw: Draw = {
  date: '2026-01-01',
  results: [
    { id: 'first', amount: 6_000_000, numbers: ['123456'] },
    { id: 'near-first', amount: 100_000, numbers: ['123455', '123457'] },
    { id: 'second', amount: 200_000, numbers: ['222222', '333333', '444444', '555555', '666666'] },
    { id: 'front-three', amount: 4_000, numbers: ['123', '789'] },
    { id: 'last-three', amount: 4_000, numbers: ['456', '999'] },
    { id: 'last-two', amount: 2_000, numbers: ['56'] },
  ],
  source: { name: 'ทดสอบ', url: 'https://example.com', verifiedAt: '2026-09-08' },
};

describe('normalizeTicket', () => {
  it('ตัดช่องว่างและขีดออก', () => {
    expect(normalizeTicket('123 456')).toBe('123456');
    expect(normalizeTicket('123-456')).toBe('123456');
  });

  it('แปลงเลขไทยเป็นเลขอารบิก', () => {
    expect(normalizeTicket('๑๒๓๔๕๖')).toBe('123456');
    expect(normalizeTicket('๐๐๐๐๐๑')).toBe('000001');
  });

  it('ตัดตัวอักษรอื่นทิ้งทั้งหมด', () => {
    expect(normalizeTicket('เลข 123456 ครับ')).toBe('123456');
    expect(normalizeTicket('abc')).toBe('');
  });
});

describe('isValidTicket', () => {
  it('รับเฉพาะตัวเลข 6 หลัก', () => {
    expect(isValidTicket('000000')).toBe(true);
    expect(isValidTicket('12345')).toBe(false);
    expect(isValidTicket('1234567')).toBe(false);
    expect(isValidTicket('12345a')).toBe(false);
  });
});

describe('parseTickets', () => {
  it('แยกได้ทั้งขึ้นบรรทัดใหม่ เว้นวรรค และคอมมา', () => {
    expect(parseTickets('123456\n234567, 345678').tickets).toEqual(['123456', '234567', '345678']);
  });

  it('ตัดเลขซ้ำออกโดยคงลำดับที่พิมพ์', () => {
    expect(parseTickets('123456 123456 234567').tickets).toEqual(['123456', '234567']);
  });

  it('คืนข้อความที่ใช้ไม่ได้กลับไปให้ผู้ใช้เห็น', () => {
    const { tickets, invalid } = parseTickets('123456 12345 ห้าหมื่น');
    expect(tickets).toEqual(['123456']);
    expect(invalid).toEqual(['12345', 'ห้าหมื่น']);
  });

  it('ข้อความว่างได้ผลว่าง ไม่ใช่รายการที่มีสตริงว่าง', () => {
    expect(parseTickets('   \n ')).toEqual({ tickets: [], invalid: [] });
  });
});

describe('ticketPart', () => {
  it('เลขหน้าเอา 3 ตัวแรก เลขท้ายเอาจากท้าย', () => {
    expect(ticketPart('123456', 'front-three')).toBe('123');
    expect(ticketPart('123456', 'last-three')).toBe('456');
    expect(ticketPart('123456', 'last-two')).toBe('56');
    expect(ticketPart('123456', 'first')).toBe('123456');
  });
});

describe('checkTicket', () => {
  it('ใบที่ถูกรางวัลที่ 1 ได้เลขหน้า/ท้ายที่ตรงด้วยพร้อมกัน', () => {
    const r = checkTicket(draw, '123456');
    expect(r.prizes.map((p) => p.id)).toEqual(['first', 'front-three', 'last-three', 'last-two']);
    expect(r.total).toBe(6_000_000 + 4_000 + 4_000 + 2_000);
  });

  it('ใบข้างเคียงรางวัลที่ 1', () => {
    const r = checkTicket(draw, '123457');
    expect(r.prizes.map((p) => p.id)).toEqual(['near-first', 'front-three']);
    expect(r.total).toBe(104_000);
  });

  it('ใบที่ไม่ถูกอะไรเลยได้ผลรวม 0 ไม่ใช่ error', () => {
    const r = checkTicket(draw, '111111');
    expect(r.prizes).toEqual([]);
    expect(r.total).toBe(0);
  });

  it('เรียงรางวัลตามลำดับประกาศเสมอ', () => {
    const r = checkTicket(draw, '789999');
    expect(r.prizes.map((p) => p.id)).toEqual(['front-three', 'last-three']);
  });

  it('บอกเลขรางวัลที่ตรงกลับไปด้วย', () => {
    expect(checkTicket(draw, '999999').prizes).toEqual([
      { id: 'last-three', label: 'รางวัลเลขท้าย 3 ตัว', number: '999', amount: 4_000 },
    ]);
  });

  it('โยน error เมื่อเลขไม่ครบ 6 หลัก', () => {
    expect(() => checkTicket(draw, '12345')).toThrow();
  });

  it('รางวัลที่งวดนั้นไม่ประกาศ ไม่ถูกนำมาตรวจ', () => {
    const noLastTwo: Draw = { ...draw, results: draw.results.filter((r) => r.id !== 'last-two') };
    expect(checkTicket(noLastTwo, '123456').prizes.map((p) => p.id)).toEqual(['first', 'front-three', 'last-three']);
  });
});

describe('checkTickets', () => {
  it('รวมเงินเฉพาะใบที่ถูก และแยกใบที่ใช้ไม่ได้ออก', () => {
    const s = checkTickets(draw, '123456\n111111\n99999');
    expect(s.results).toHaveLength(2);
    expect(s.winners.map((w) => w.ticket)).toEqual(['123456']);
    expect(s.invalid).toEqual(['99999']);
    expect(s.total).toBe(6_010_000);
  });
});
