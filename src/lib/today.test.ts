import { describe, it, expect } from 'vitest';
import { todayInBangkok } from './today';
import { daysBetweenDates } from './date';

/** §27.4 — "วันนี้" ต้องไม่ขึ้นกับ timezone ของเครื่องผู้ใช้ */
describe('todayInBangkok', () => {
  it('23:30 ICT วันที่ 31 ธ.ค. ยังเป็นวันที่ 31 ไม่ใช่ปีใหม่', () => {
    // 2026-12-31T23:30+07:00 = 2026-12-31T16:30Z
    expect(todayInBangkok(new Date('2026-12-31T16:30:00Z'))).toBe('2026-12-31');
  });

  it('00:30 ICT วันที่ 1 ม.ค. เป็นวันปีใหม่แม้เครื่องอยู่ UTC (ซึ่งยังเป็นวันเก่า)', () => {
    // 2027-01-01T00:30+07:00 = 2026-12-31T17:30Z
    expect(todayInBangkok(new Date('2026-12-31T17:30:00Z'))).toBe('2027-01-01');
  });

  it('ให้ค่าเดียวกันไม่ว่าเครื่องผู้ใช้อยู่ timezone ใด เมื่อเวลาจริงเดียวกัน', () => {
    // ค่าที่ได้มาจาก timeZone: 'Asia/Bangkok' ล้วน ไม่แตะ getFullYear()/getMonth() ของเครื่อง
    const instant = new Date('2026-09-08T13:00:00Z'); // 20:00 ICT
    expect(todayInBangkok(instant)).toBe('2026-09-08');
    // ผู้ใช้ที่ Kiritimati (UTC+14) ขึ้นวันที่ 9 แล้ว แต่ยังต้องเห็น "วันนี้" เป็น 8
    expect(new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Kiritimati' }).format(instant)).toBe('2026-09-09');
  });

  it('เที่ยงคืนไทยพอดีเป็นวันใหม่', () => {
    expect(todayInBangkok(new Date('2026-09-07T17:00:00Z'))).toBe('2026-09-08');
    expect(todayInBangkok(new Date('2026-09-07T16:59:59Z'))).toBe('2026-09-07');
  });

  it('คืนรูปแบบ YYYY-MM-DD ที่ date helper อ่านต่อได้', () => {
    const iso = todayInBangkok(new Date('2026-03-01T05:00:00Z'));
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(daysBetweenDates('2026-02-28', iso)).toBe(1);
  });
});

/** DST ของเครื่องผู้ใช้ต้องไม่ทำให้จำนวนวันเพี้ยน — date.ts เป็น UTC ล้วนอยู่แล้ว */
describe('ข้ามช่วง DST ของ America/New_York', () => {
  it('daysBetweenDates ยังคืนจำนวนเต็มถูกต้อง', () => {
    expect(daysBetweenDates('2026-03-07', '2026-03-09')).toBe(2);
    expect(daysBetweenDates('2026-10-31', '2026-11-02')).toBe(2);
  });
});
