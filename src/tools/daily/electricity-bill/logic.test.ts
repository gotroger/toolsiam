import { describe, it, expect } from 'vitest';
import { COMMON_APPLIANCES, totalUnits, unitsPerMonth } from './logic';

describe('หน่วยไฟจากกำลังไฟ', () => {
  it('แอร์ 1,200 วัตต์ เปิดวันละ 8 ชม. 30 วัน = 288 หน่วย', () => {
    expect(unitsPerMonth(1_200, 8, 30)).toBe(288);
  });

  it('พัดลม 55 วัตต์ วันละ 8 ชม. ใช้ไฟน้อยกว่าแอร์มาก', () => {
    expect(unitsPerMonth(55, 8)).toBe(13.2);
  });

  it('ตู้เย็นเปิด 24 ชม. คิดเต็มวัน', () => {
    expect(unitsPerMonth(120, 24, 30)).toBe(86.4);
  });

  it('ปฏิเสธชั่วโมงเกิน 24 และวันเกิน 31', () => {
    expect(() => unitsPerMonth(100, 25)).toThrow('0–24');
    expect(() => unitsPerMonth(100, 5, 32)).toThrow('1–31');
    expect(() => unitsPerMonth(-1, 5)).toThrow();
  });
});

describe('รวมหน่วยไฟหลายเครื่อง', () => {
  const ac = COMMON_APPLIANCES.find((a) => a.id === 'ac-12000')!;
  const fan = COMMON_APPLIANCES.find((a) => a.id === 'fan')!;

  it('คูณจำนวนเครื่องแล้วรวมกัน', () => {
    expect(totalUnits([
      { appliance: ac, quantity: 2, hoursPerDay: 8 },
      { appliance: fan, quantity: 3, hoursPerDay: 8 },
    ])).toBe(288 * 2 + 13.2 * 3);
  });

  it('ไม่มีเครื่องเลย = 0 หน่วย', () => {
    expect(totalUnits([])).toBe(0);
    expect(totalUnits([{ appliance: ac, quantity: 0, hoursPerDay: 8 }])).toBe(0);
  });

  it('รายการตัวอย่างมีค่าที่สมเหตุสมผลทุกตัว', () => {
    for (const a of COMMON_APPLIANCES) {
      expect(a.watts).toBeGreaterThan(0);
      expect(a.hoursPerDay).toBeGreaterThan(0);
      expect(a.hoursPerDay).toBeLessThanOrEqual(24);
    }
  });

  it('ปฏิเสธจำนวนเครื่องติดลบ', () => {
    expect(() => totalUnits([{ appliance: ac, quantity: -1, hoursPerDay: 8 }])).toThrow('จำนวนเครื่อง');
  });
});
