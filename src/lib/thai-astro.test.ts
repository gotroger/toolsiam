import { describe, it, expect } from 'vitest';
import {
  CHINESE_ZODIAC, CHINESE_ZODIAC_MAX_YEAR, CHINESE_ZODIAC_MIN_YEAR, ZODIAC_SIGNS,
  chineseNewYearOf, chineseZodiacFromDate, dayColorsFromDate, numerologyFromDate, zodiacById, zodiacFromDate,
} from './thai-astro';
import { daysBetweenDates } from './date';

describe('ราศีสากล', () => {
  it('มีครบ 12 ราศี ไม่ซ้ำ', () => {
    expect(ZODIAC_SIGNS).toHaveLength(12);
    expect(new Set(ZODIAC_SIGNS.map((s) => s.id)).size).toBe(12);
  });

  it('หาราศีจากวันเกิดได้ถูกต้อง', () => {
    expect(zodiacFromDate('2026-03-21').id).toBe('aries');
    expect(zodiacFromDate('2026-04-19').id).toBe('aries');
    expect(zodiacFromDate('2026-04-20').id).toBe('taurus');
    expect(zodiacFromDate('2026-09-08').id).toBe('virgo');
  });

  it('ราศีมังกรคาบข้ามปี', () => {
    expect(zodiacFromDate('2026-12-22').id).toBe('capricorn');
    expect(zodiacFromDate('2026-01-19').id).toBe('capricorn');
    expect(zodiacFromDate('2026-01-20').id).toBe('aquarius');
  });

  it('ทุกวันของปีต้องหาราศีได้ ไม่มีวันไหนหลุด', () => {
    // 2024 เป็นปีอธิกสุรทิน จึงครอบคลุม 29 ก.พ. ด้วย
    for (let i = 0; i < 366; i++) {
      const d = new Date(Date.UTC(2024, 0, 1 + i));
      const iso = d.toISOString().slice(0, 10);
      expect(() => zodiacFromDate(iso), iso).not.toThrow();
    }
  });

  it('ช่วงของราศีต่อกันพอดี ไม่ทับซ้อนและไม่มีช่องว่าง', () => {
    let covered = 0;
    for (let i = 0; i < 365; i++) {
      const iso = new Date(Date.UTC(2025, 0, 1 + i)).toISOString().slice(0, 10);
      if (zodiacFromDate(iso)) covered++;
    }
    expect(covered).toBe(365);
  });

  it('ทุกราศีมีเนื้อหาที่เขียนจริง ไม่ใช่ template ว่าง', () => {
    for (const s of ZODIAC_SIGNS) {
      expect(s.traits.length).toBeGreaterThanOrEqual(3);
      expect(s.summary.length).toBeGreaterThan(40);
    }
  });

  it('zodiacById หาไม่เจอคืน undefined', () => {
    expect(zodiacById('aries')!.name).toBe('ราศีเมษ');
    expect(zodiacById('nope')).toBeUndefined();
  });
});

describe('ปีนักษัตร', () => {
  it('มีครบ 12 นักษัตรเรียงตามลำดับ โดย 1900 เป็นปีชวด', () => {
    expect(CHINESE_ZODIAC).toHaveLength(12);
    expect(CHINESE_ZODIAC[0].id).toBe('rat');
    expect(chineseZodiacFromDate('1996-06-01').animal.id).toBe('rat');
  });

  it('เกิดหลังตรุษจีนเข้านักษัตรของปีตัวเอง', () => {
    const r = chineseZodiacFromDate('2024-06-01');
    expect(r.animal.id).toBe('dragon');
    expect(r.beforeNewYear).toBe(false);
    expect(r.zodiacYear).toBe(2024);
  });

  it('เกิดก่อนตรุษจีนยังเป็นนักษัตรของปีก่อนหน้า — จุดที่คนเข้าใจผิดบ่อยที่สุด', () => {
    const r = chineseZodiacFromDate('2024-01-15');
    expect(r.beforeNewYear).toBe(true);
    expect(r.zodiacYear).toBe(2023);
    expect(r.animal.id).toBe('rabbit');
  });

  it('เกิดวันตรุษจีนพอดีเข้านักษัตรใหม่แล้ว', () => {
    expect(chineseZodiacFromDate('2024-02-10').zodiacYear).toBe(2024);
    expect(chineseZodiacFromDate('2024-02-09').zodiacYear).toBe(2023);
  });

  it('นักษัตรวนรอบละ 12 ปี', () => {
    const a = chineseZodiacFromDate('2000-06-01').animal.id;
    expect(chineseZodiacFromDate('2012-06-01').animal.id).toBe(a);
    expect(chineseZodiacFromDate('1988-06-01').animal.id).toBe(a);
  });

  it('ปีนอกช่วงที่มีข้อมูลต้องแจ้ง ไม่ใช่เดา', () => {
    expect(() => chineseZodiacFromDate('1930-06-01')).toThrow('1940');
    expect(() => chineseZodiacFromDate('2050-06-01')).toThrow('2040');
  });

  /**
   * สำเนาอิสระของวันตรุษจีน ค.ศ. 1940–2040 คัดจาก Gregorian-Lunar Calendar Conversion Table
   * ของหอสังเกตการณ์ฮ่องกง (https://www.hko.gov.hk/en/gts/time/calendar/) เมื่อ 8 ก.ย. 2569
   *
   * จงใจเขียนซ้ำแทนที่จะ import จากซอร์ส เพราะจุดประสงค์คือจับว่าตารางในซอร์สถูกแก้โดยไม่ได้ตั้งใจ
   * ถ้า import มาเทียบกันเองเทสต์จะผ่านเสมอและไม่ได้คุมอะไรเลย
   */
  const HKO_CHINESE_NEW_YEAR = [
  '1940-02-08', '1941-01-27', '1942-02-15', '1943-02-05', '1944-01-25',
  '1945-02-13', '1946-02-02', '1947-01-22', '1948-02-10', '1949-01-29',
  '1950-02-17', '1951-02-06', '1952-01-27', '1953-02-14', '1954-02-03',
  '1955-01-24', '1956-02-12', '1957-01-31', '1958-02-18', '1959-02-08',
  '1960-01-28', '1961-02-15', '1962-02-05', '1963-01-25', '1964-02-13',
  '1965-02-02', '1966-01-21', '1967-02-09', '1968-01-30', '1969-02-17',
  '1970-02-06', '1971-01-27', '1972-02-15', '1973-02-03', '1974-01-23',
  '1975-02-11', '1976-01-31', '1977-02-18', '1978-02-07', '1979-01-28',
  '1980-02-16', '1981-02-05', '1982-01-25', '1983-02-13', '1984-02-02',
  '1985-02-20', '1986-02-09', '1987-01-29', '1988-02-17', '1989-02-06',
  '1990-01-27', '1991-02-15', '1992-02-04', '1993-01-23', '1994-02-10',
  '1995-01-31', '1996-02-19', '1997-02-07', '1998-01-28', '1999-02-16',
  '2000-02-05', '2001-01-24', '2002-02-12', '2003-02-01', '2004-01-22',
  '2005-02-09', '2006-01-29', '2007-02-18', '2008-02-07', '2009-01-26',
  '2010-02-14', '2011-02-03', '2012-01-23', '2013-02-10', '2014-01-31',
  '2015-02-19', '2016-02-08', '2017-01-28', '2018-02-16', '2019-02-05',
  '2020-01-25', '2021-02-12', '2022-02-01', '2023-01-22', '2024-02-10',
  '2025-01-29', '2026-02-17', '2027-02-06', '2028-01-26', '2029-02-13',
  '2030-02-03', '2031-01-23', '2032-02-11', '2033-01-31', '2034-02-19',
  '2035-02-08', '2036-01-28', '2037-02-15', '2038-02-04', '2039-01-24',
  '2040-02-12',
  ];

  it('ทุกวันตรุษจีนตรงกับตารางทางการของหอสังเกตการณ์ฮ่องกง (VF5)', () => {
    expect(HKO_CHINESE_NEW_YEAR).toHaveLength(CHINESE_ZODIAC_MAX_YEAR - CHINESE_ZODIAC_MIN_YEAR + 1);
    for (const expected of HKO_CHINESE_NEW_YEAR) {
      const year = Number(expected.slice(0, 4));
      expect(chineseNewYearOf(year), String(year)).toBe(expected);
    }
  });

  it('ตารางตรุษจีนครบทุกปีในช่วงที่ประกาศว่ารองรับ', () => {
    for (let y = CHINESE_ZODIAC_MIN_YEAR; y <= CHINESE_ZODIAC_MAX_YEAR; y++) {
      expect(chineseNewYearOf(y), String(y)).not.toBeNull();
    }
  });

  it('ทุกวันตรุษจีนอยู่ระหว่าง 21 ม.ค. – 21 ก.พ. และเรียงเพิ่มขึ้นตามปี', () => {
    let previous = '';
    for (let y = CHINESE_ZODIAC_MIN_YEAR; y <= CHINESE_ZODIAC_MAX_YEAR; y++) {
      const date = chineseNewYearOf(y)!;
      expect(date >= `${y}-01-21`, date).toBe(true);
      expect(date <= `${y}-02-21`, date).toBe(true);
      expect(date > previous).toBe(true);
      previous = date;
    }
  });

  it('ตรุษจีนปีติดกันห่างกันราวหนึ่งปีจันทรคติ (353–385 วัน)', () => {
    for (let y = CHINESE_ZODIAC_MIN_YEAR; y < CHINESE_ZODIAC_MAX_YEAR; y++) {
      const gap = daysBetweenDates(chineseNewYearOf(y)!, chineseNewYearOf(y + 1)!);
      expect(gap, `${y} → ${y + 1}`).toBeGreaterThanOrEqual(353);
      expect(gap, `${y} → ${y + 1}`).toBeLessThanOrEqual(385);
    }
  });
});

describe('สีมงคลประจำวันเกิด', () => {
  it('บอกวันเกิดและสีประจำวันตามคติไทย', () => {
    // 2026-09-08 เป็นวันอังคาร
    const r = dayColorsFromDate('2026-09-08');
    expect(r.weekdayName).toBe('อังคาร');
    expect(r.birthColor).toBe('ชมพู');
  });

  it('ทุกวันมีสีครบทุกหมวด', () => {
    for (let i = 0; i < 7; i++) {
      const iso = new Date(Date.UTC(2026, 8, 6 + i)).toISOString().slice(0, 10);
      const r = dayColorsFromDate(iso);
      for (const key of ['work', 'money', 'love', 'luck', 'avoid'] as const) {
        expect(r[key].length, `${iso} ${key}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('เลขศาสตร์วันเกิด', () => {
  it('บวกเลขทุกหลักจนเหลือหลักเดียว พร้อมแสดงขั้นตอน', () => {
    // 1990-05-15 → 1+9+9+0+0+5+1+5 = 30 → 3+0 = 3
    const r = numerologyFromDate('1990-05-15');
    expect(r.lifePath).toBe(3);
    expect(r.steps[0]).toContain('= 30');
    expect(r.steps.at(-1)).toBe('3 + 0 = 3');
  });

  it('คงเลข 11 และ 22 ไว้ตามความเชื่อ ไม่บวกต่อ', () => {
    // 1989-09-29 → 1+9+8+9+0+9+2+9 = 47 → 4+7 = 11 (หยุดที่ 11)
    expect(numerologyFromDate('1989-09-29').lifePath).toBe(11);
    // 1979-09-29 → 1+9+7+9+0+9+2+9 = 46 → 4+6 = 10 → 1+0 = 1
    expect(numerologyFromDate('1979-09-29').lifePath).toBe(1);
  });

  it('ผลลัพธ์ทุกวันต้องมีความหมายรองรับ ไม่มีวันไหนได้ค่าว่าง', () => {
    for (let i = 0; i < 400; i += 7) {
      const iso = new Date(Date.UTC(1990, 0, 1 + i)).toISOString().slice(0, 10);
      const r = numerologyFromDate(iso);
      expect(r.meaning, iso).toBeTruthy();
      expect(r.strengths.length, iso).toBeGreaterThan(0);
      expect(r.watchOut, iso).toBeTruthy();
    }
  });

  it('วันเดิมให้ผลเดิมเสมอ', () => {
    expect(numerologyFromDate('2000-01-01')).toEqual(numerologyFromDate('2000-01-01'));
  });
});
