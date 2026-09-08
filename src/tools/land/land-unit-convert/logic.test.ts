import { describe, it, expect } from 'vitest';
import { convertToAllUnits, toRaiNganWa, UNIT_ORDER } from './logic';

describe('แปลงหน่วยที่ดินทุกหน่วยพร้อมกัน', () => {
  it('1 ไร่ ให้ค่าทุกหน่วยถูกต้อง', () => {
    const rows = convertToAllUnits(1, 'rai');
    const by = Object.fromEntries(rows.map((r) => [r.unit, r.value]));
    expect(by.rai).toBe(1);
    expect(by.ngan).toBe(4);
    expect(by.wa2).toBe(400);
    expect(by.m2).toBe(1600);
    expect(by.hectare).toBeCloseTo(0.16, 10);
  });

  it('คืนครบทุกหน่วยตามลำดับที่กำหนด', () => {
    expect(convertToAllUnits(5, 'ngan').map((r) => r.unit)).toEqual(UNIT_ORDER);
  });

  it('มีป้ายภาษาไทยทุกแถว', () => {
    for (const row of convertToAllUnits(1, 'm2')) expect(row.label.length).toBeGreaterThan(0);
  });

  it('พื้นที่ 0 แปลงได้ 0 ทุกหน่วย', () => {
    for (const row of convertToAllUnits(0, 'rai')) expect(row.value).toBe(0);
  });

  it('ปฏิเสธค่าติดลบ', () => {
    expect(() => convertToAllUnits(-1, 'rai')).toThrow();
  });
});

describe('แสดงเป็น ไร่-งาน-ตารางวา', () => {
  it('3 ไร่ 2 งาน 50 ตารางวา ไป-กลับได้ค่าเดิม', () => {
    const sqm = 3 * 1600 + 2 * 400 + 50 * 4;
    expect(toRaiNganWa(sqm)).toEqual({ rai: 3, ngan: 2, wa2: 50 });
  });
});
