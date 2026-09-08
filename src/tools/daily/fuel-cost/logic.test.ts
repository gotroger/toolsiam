import { describe, it, expect } from 'vitest';
import { fuelCost } from './logic';

const base = { distanceKm: 100, kmPerLitre: 15, pricePerLitre: 35, roundTrip: false, people: 1, tolls: 0 };

describe('ค่าน้ำมัน', () => {
  it('เที่ยวเดียว 100 กม. 15 กม./ลิตร ลิตรละ 35 บาท', () => {
    const r = fuelCost(base);
    expect(r.totalDistanceKm).toBe(100);
    expect(r.litresUsed).toBe(6.67);
    expect(r.fuelCost).toBe(233.33);
    expect(r.costPerKm).toBe(2.33);
  });

  it('ไป-กลับคิดระยะทางสองเท่า', () => {
    expect(fuelCost({ ...base, roundTrip: true }).totalDistanceKm).toBe(200);
    expect(fuelCost({ ...base, roundTrip: true }).fuelCost).toBe(466.67);
  });

  it('บวกค่าทางด่วนเข้ายอดรวม แต่ไม่เข้าค่าน้ำมัน', () => {
    const r = fuelCost({ ...base, tolls: 120 });
    expect(r.fuelCost).toBe(233.33);
    expect(r.totalCost).toBe(353.33);
  });

  it('หารกันหลายคน', () => {
    const r = fuelCost({ ...base, tolls: 100, people: 4 });
    expect(r.costPerPerson).toBe(83.33);
  });

  it('ระยะทาง 0 ไม่หารด้วยศูนย์', () => {
    expect(fuelCost({ ...base, distanceKm: 0 }).costPerKm).toBe(0);
  });

  it('ปฏิเสธอัตราสิ้นเปลืองที่เป็น 0 และจำนวนคนที่ไม่ใช่จำนวนเต็มบวก', () => {
    expect(() => fuelCost({ ...base, kmPerLitre: 0 })).toThrow('อัตราสิ้นเปลือง');
    expect(() => fuelCost({ ...base, people: 0 })).toThrow('จำนวนคน');
    expect(() => fuelCost({ ...base, people: 2.5 })).toThrow('จำนวนเต็ม');
  });
});
