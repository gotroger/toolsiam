import { describe, it, expect } from 'vitest';
import { describeArea, fromRaiNganWa, fromUnit, valueIn } from './logic';
import { AREA_UNITS } from '@/lib/land';

describe('แปลงหน่วยที่ดิน', () => {
  it('ไร่-งาน-วา ให้ตารางเมตรและข้อความที่ถูก', () => {
    const r = fromRaiNganWa({ rai: 1, ngan: 2, wa: 30 });
    expect(r.squareMeters).toBe(2520);
    expect(r.text).toBe('1 ไร่ 2 งาน 30 ตารางวา');
    expect(r.summary).toBe('1 ไร่ 2 งาน 30 ตารางวา = 2,520.00 ตารางเมตร');
  });

  it('กรอกหน่วยเดียวก็ได้ผลชุดเดียวกัน', () => {
    expect(fromUnit(1, 'rai').squareMeters).toBe(1600);
    expect(fromUnit(400, 'squareWa').text).toBe('1 ไร่');
    expect(fromUnit(1, 'hectare').squareMeters).toBe(10_000);
  });

  it('คืนค่าครบทุกหน่วยที่ระบบรองรับ', () => {
    const r = describeArea(1600);
    expect(r.rows.map((row) => row.unit.id)).toEqual(AREA_UNITS.map((u) => u.id));
    expect(r.rows.find((row) => row.unit.id === 'rai')!.value).toBe(1);
  });

  it('ที่ดินขนาด 0 ไม่ใช่ข้อผิดพลาด', () => {
    expect(describeArea(0).text).toBe('0 ตารางวา');
  });

  it('ขนาดติดลบเป็นข้อผิดพลาด', () => {
    expect(() => fromRaiNganWa({ rai: -1, ngan: 0, wa: 0 })).toThrow();
    expect(() => fromUnit(-5, 'rai')).toThrow();
  });

  it('valueIn ปัดตามความละเอียดของหน่วยนั้น', () => {
    expect(valueIn(1600, 'rai')).toBe(1);
    expect(valueIn(1234.5678, 'squareMeter')).toBe(1234.57);
  });
});
