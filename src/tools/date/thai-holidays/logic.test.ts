import { describe, it, expect } from 'vitest';
import { isWeekend } from '@/lib/date';
import { HOLIDAYS_2569 } from './data';
import {
  COVERED_YEAR, listHolidays, findHoliday, isBusinessDay, businessDaysBetween, addBusinessDays,
} from './logic';

describe('ข้อมูลวันหยุด 2569', () => {
  it('รูปแบบวันที่ถูกต้อง เรียงจากน้อยไปมาก และไม่ซ้ำ', () => {
    const dates = HOLIDAYS_2569.map((h) => h.date);
    expect(new Set(dates).size).toBe(dates.length);
    expect([...dates].sort()).toEqual(dates);
    for (const h of HOLIDAYS_2569) {
      expect(h.date).toMatch(/^2026-\d{2}-\d{2}$/);
      expect(h.name.length).toBeGreaterThan(2);
      expect(h.government || h.bank).toBe(true);
    }
  });

  it('วันหยุดธนาคารที่ตรงวันทำการมี 19 วัน ตรงตามประกาศ ธปท.', () => {
    const bankWorkdayHolidays = listHolidays('bank').filter((h) => !isWeekend(h.date));
    expect(bankWorkdayHolidays).toHaveLength(19);
  });

  it('วันหยุดราชการที่ตรงวันทำการมี 20 วัน', () => {
    const govWorkdayHolidays = listHolidays('government').filter((h) => !isWeekend(h.date));
    expect(govWorkdayHolidays).toHaveLength(20);
  });

  it('ครอบคลุมเฉพาะปี 2569', () => {
    expect(COVERED_YEAR).toEqual({ be: 2569, ce: 2026 });
  });
});

describe('findHoliday / isBusinessDay', () => {
  it('วันแรงงาน 1 พ.ค. ธนาคารหยุด ราชการไม่หยุด', () => {
    expect(findHoliday('2026-05-01', 'bank')?.name).toBe('วันแรงงานแห่งชาติ');
    expect(findHoliday('2026-05-01', 'government')).toBeUndefined();
    expect(isBusinessDay('2026-05-01', 'bank')).toBe(false);
    expect(isBusinessDay('2026-05-01', 'government')).toBe(true);
  });

  it('วันพืชมงคล 13 พ.ค. ราชการหยุด ธนาคารเปิด', () => {
    expect(findHoliday('2026-05-13', 'government')?.name).toBe('วันพืชมงคล');
    expect(findHoliday('2026-05-13', 'bank')).toBeUndefined();
    expect(isBusinessDay('2026-05-13', 'bank')).toBe(true);
  });

  it('เสาร์-อาทิตย์ไม่ใช่วันทำการแม้ไม่มีวันหยุดนักขัตฤกษ์', () => {
    expect(isBusinessDay('2026-09-12', 'bank')).toBe(false); // เสาร์
    expect(isBusinessDay('2026-09-08', 'bank')).toBe(true); // อังคาร
  });

  it('วันที่นอกปี 2569 → error', () => {
    expect(() => isBusinessDay('2027-01-04', 'bank')).toThrow();
    expect(() => findHoliday('2025-12-31', 'bank')).toThrow();
  });
});

describe('businessDaysBetween', () => {
  it('ช่วงสงกรานต์ 10–17 เม.ย. มีวันทำการธนาคาร 3 วัน', () => {
    const r = businessDaysBetween('2026-04-10', '2026-04-17', 'bank');
    expect(r.totalDays).toBe(8);
    expect(r.businessDays).toBe(3); // 10 (ศ.), 16 (พฤ.), 17 (ศ.)
    expect(r.weekendDays).toBe(2);
    expect(r.holidayDays).toBe(3);
    expect(r.holidays.map((h) => h.date)).toEqual(['2026-04-13', '2026-04-14', '2026-04-15']);
  });

  it('ผลรวมย่อยเท่ากับจำนวนวันทั้งหมดเสมอ', () => {
    const r = businessDaysBetween('2026-01-01', '2026-12-31', 'government');
    expect(r.businessDays + r.weekendDays + r.holidayDays).toBe(r.totalDays);
    expect(r.totalDays).toBe(365);
  });

  it('ทั้งปี 2569 มีวันทำการธนาคาร 242 วัน และวันทำการราชการ 241 วัน', () => {
    expect(businessDaysBetween('2026-01-01', '2026-12-31', 'bank').businessDays).toBe(242);
    expect(businessDaysBetween('2026-01-01', '2026-12-31', 'government').businessDays).toBe(241);
  });

  it('สลับวันเริ่ม/วันสิ้นสุดได้ผลเท่ากัน', () => {
    expect(businessDaysBetween('2026-04-17', '2026-04-10', 'bank')).toEqual(
      businessDaysBetween('2026-04-10', '2026-04-17', 'bank'),
    );
  });

  it('วันเดียวที่เป็นวันทำการ → 1', () => {
    expect(businessDaysBetween('2026-09-08', '2026-09-08', 'bank').businessDays).toBe(1);
  });
});

describe('addBusinessDays', () => {
  it('บวกวันทำการข้ามสงกรานต์', () => {
    expect(addBusinessDays('2026-04-10', 1, 'bank')).toBe('2026-04-16');
    expect(addBusinessDays('2026-04-10', 3, 'bank')).toBe('2026-04-20');
  });

  it('0 วัน → วันเดิม', () => {
    expect(addBusinessDays('2026-04-10', 0, 'bank')).toBe('2026-04-10');
  });

  it('ค่าติดลบเดินย้อนหลัง', () => {
    expect(addBusinessDays('2026-04-16', -1, 'bank')).toBe('2026-04-10');
  });

  it('ถ้าเดินหลุดปี 2569 → error', () => {
    expect(() => addBusinessDays('2026-12-28', 10, 'bank')).toThrow();
  });
});
