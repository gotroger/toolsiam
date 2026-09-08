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
