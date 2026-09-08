import { describe, it, expect } from 'vitest';
import {
  AREA_UNITS, convertAll, formatRaiNganWa, fromSquareMeters, getAreaUnit, raiNganWaToSquareMeters,
  roundTo, squareMetersToRaiNganWa, toSquareMeters, SQUARE_METERS_PER_RAI,
} from './land';

describe('มาตราที่ดินไทย', () => {
  it('1 ไร่ = 4 งาน = 400 ตารางวา = 1,600 ตารางเมตร', () => {
    expect(SQUARE_METERS_PER_RAI).toBe(1600);
    expect(toSquareMeters(1, 'rai')).toBe(1600);
    expect(toSquareMeters(4, 'ngan')).toBe(1600);
    expect(toSquareMeters(400, 'squareWa')).toBe(1600);
  });

  it('หน่วยสากลใช้ค่านิยามตายตัว', () => {
    expect(toSquareMeters(1, 'hectare')).toBe(10_000);
    expect(toSquareMeters(1, 'acre')).toBe(4046.8564224);
    expect(toSquareMeters(1, 'squareKilometer')).toBe(1_000_000);
  });

  it('แปลงกลับได้ค่าเดิม', () => {
    for (const unit of AREA_UNITS) {
      expect(roundTo(fromSquareMeters(toSquareMeters(7.5, unit.id), unit.id), 8)).toBe(7.5);
    }
  });

  it('id ของหน่วยไม่ซ้ำ และหน่วยที่ไม่มีเป็นข้อผิดพลาด', () => {
    expect(new Set(AREA_UNITS.map((u) => u.id)).size).toBe(AREA_UNITS.length);
    // @ts-expect-error — ตั้งใจส่งหน่วยที่ไม่มีเพื่อตรวจว่ามันดังไม่ใช่เงียบ
    expect(() => getAreaUnit('sqft')).toThrow();
  });

  it('พื้นที่ติดลบหรือไม่ใช่ตัวเลขเป็นข้อผิดพลาด', () => {
    expect(() => toSquareMeters(-1, 'rai')).toThrow();
    expect(() => toSquareMeters(Number.NaN, 'rai')).toThrow();
    expect(() => squareMetersToRaiNganWa(-1)).toThrow();
    expect(() => raiNganWaToSquareMeters({ rai: 1, ngan: -1, wa: 0 })).toThrow('งาน');
  });
});

describe('ไร่-งาน-ตารางวา', () => {
  it('รวมเป็นตารางเมตรได้ถูก', () => {
    expect(raiNganWaToSquareMeters({ rai: 1, ngan: 2, wa: 30 })).toBe(1600 + 800 + 120);
    expect(raiNganWaToSquareMeters({ rai: 0, ngan: 0, wa: 0 })).toBe(0);
  });

  it('แยกกลับได้เท่าเดิม', () => {
    expect(squareMetersToRaiNganWa(2520)).toEqual({ rai: 1, ngan: 2, wa: 30 });
    expect(squareMetersToRaiNganWa(1600)).toEqual({ rai: 1, ngan: 0, wa: 0 });
    expect(squareMetersToRaiNganWa(0)).toEqual({ rai: 0, ngan: 0, wa: 0 });
  });

  it('เศษไม่ลงตัวเก็บไว้ที่ตารางวาเป็นทศนิยม', () => {
    expect(squareMetersToRaiNganWa(1601)).toEqual({ rai: 1, ngan: 0, wa: 0.25 });
    expect(squareMetersToRaiNganWa(4046.8564224)).toEqual({ rai: 2, ngan: 2, wa: 11.7141 });
  });

  it('ไม่คืนค่าอย่าง "3 งาน 99.999 ตารางวา" จากการปัดเศษ', () => {
    // 1 ไร่ ที่ผ่านการหาร/คูณมาแล้ว ต้องยังเป็น 1 ไร่เต็ม
    const roundTrip = squareMetersToRaiNganWa(toSquareMeters(fromSquareMeters(1600, 'acre'), 'acre'));
    expect(roundTrip).toEqual({ rai: 1, ngan: 0, wa: 0 });
  });

  it('เขียนเป็นข้อความแบบที่คนไทยพูด', () => {
    expect(formatRaiNganWa({ rai: 1, ngan: 2, wa: 30 })).toBe('1 ไร่ 2 งาน 30 ตารางวา');
    expect(formatRaiNganWa({ rai: 2, ngan: 0, wa: 0 })).toBe('2 ไร่');
    expect(formatRaiNganWa({ rai: 0, ngan: 0, wa: 0 })).toBe('0 ตารางวา');
    expect(formatRaiNganWa({ rai: 0, ngan: 1, wa: 0.5 })).toBe('1 งาน 0.5 ตารางวา');
  });
});

describe('convertAll', () => {
  it('คืนขนาดเดียวกันครบทุกหน่วย', () => {
    const rows = convertAll(1600);
    expect(rows).toHaveLength(AREA_UNITS.length);
    expect(rows.find((r) => r.unit.id === 'rai')!.value).toBe(1);
    expect(rows.find((r) => r.unit.id === 'squareWa')!.value).toBe(400);
    expect(rows.find((r) => r.unit.id === 'hectare')!.value).toBe(0.16);
  });

  it('ปัดทศนิยมตามที่แต่ละหน่วยเหมาะสม ไม่หลุดเลขทศนิยมลอย', () => {
    for (const row of convertAll(1234.56)) {
      expect(row.value).toBe(roundTo(row.value, row.unit.digits));
    }
  });
});
