import { describe, it, expect } from 'vitest';
import {
  convertArea, fromRaiNganWa, landPrice, SQM_PER_UNIT, toRaiNganWa, toSquareMeters,
} from './land';

describe('หน่วยที่ดิน', () => {
  it('ความสัมพันธ์พื้นฐานถูกต้อง', () => {
    expect(SQM_PER_UNIT.rai).toBe(1600);
    expect(convertArea(1, 'rai', 'ngan')).toBe(4);
    expect(convertArea(1, 'rai', 'wa2')).toBe(400);
    expect(convertArea(1, 'ngan', 'wa2')).toBe(100);
    expect(convertArea(1, 'wa2', 'm2')).toBe(4);
  });

  it('แปลงไป-กลับได้ค่าเดิม', () => {
    for (const v of [0, 1, 3.75, 1234.5]) {
      expect(convertArea(convertArea(v, 'rai', 'm2'), 'm2', 'rai')).toBeCloseTo(v, 10);
      expect(convertArea(convertArea(v, 'acre', 'hectare'), 'hectare', 'acre')).toBeCloseTo(v, 10);
    }
  });

  it('1 เฮกตาร์ = 6.25 ไร่ และ 1 เอเคอร์ ≈ 2.529 ไร่', () => {
    expect(convertArea(1, 'hectare', 'rai')).toBeCloseTo(6.25, 10);
    expect(convertArea(1, 'acre', 'rai')).toBeCloseTo(2.5292852640, 8);
  });

  it('ปฏิเสธค่าที่ไม่ใช่ตัวเลขหรือติดลบ', () => {
    expect(() => toSquareMeters(-1, 'rai')).toThrow();
    expect(() => toSquareMeters(Number.NaN, 'rai')).toThrow();
  });
});

describe('แตกเป็น ไร่-งาน-ตารางวา', () => {
  it('แตกค่าปกติได้ถูก', () => {
    expect(toRaiNganWa(1600)).toEqual({ rai: 1, ngan: 0, wa2: 0 });
    expect(toRaiNganWa(2000)).toEqual({ rai: 1, ngan: 1, wa2: 0 });
    expect(toRaiNganWa(2004)).toEqual({ rai: 1, ngan: 1, wa2: 1 });
    expect(toRaiNganWa(0)).toEqual({ rai: 0, ngan: 0, wa2: 0 });
  });

  it('ทดหน่วยเมื่อปัดเศษตารางวาแล้วเต็มพอดี ไม่คืน "3 งาน 100 ตารางวา"', () => {
    // 3199.99 ตร.ม. ≈ 1 ไร่ 3 งาน 99.9975 ตร.วา → ปัด 2 ตำแหน่งได้ 100.00 จึงต้องทดเป็น 2 ไร่
    expect(toRaiNganWa(3199.99)).toEqual({ rai: 2, ngan: 0, wa2: 0 });
  });

  it('ประกอบกลับได้พื้นที่เดิม', () => {
    const sqm = 5432;
    expect(fromRaiNganWa(toRaiNganWa(sqm))).toBeCloseTo(sqm, 6);
  });
});

describe('ราคาที่ดิน', () => {
  it('คิดราคารวมและราคาต่อหน่วยทุกแบบ', () => {
    const r = landPrice({ area: 2, areaUnit: 'rai', pricePerUnit: 1_000_000, priceUnit: 'rai' });
    expect(r.totalPrice).toBe(2_000_000);
    expect(r.areaSqm).toBe(3200);
    expect(r.pricePerWa).toBe(2500);
    expect(r.pricePerSqm).toBe(625);
    expect(r.pricePerNgan).toBe(250_000);
  });

  it('รับราคาที่ประกาศเป็นบาทต่อตารางวาได้', () => {
    const r = landPrice({ area: 100, areaUnit: 'wa2', pricePerUnit: 50_000, priceUnit: 'wa2' });
    expect(r.totalPrice).toBe(5_000_000);
    expect(r.pricePerRai).toBe(20_000_000);
  });

  it('พื้นที่ 0 ให้ราคารวม 0 แต่ยังบอกราคาต่อหน่วยได้', () => {
    const r = landPrice({ area: 0, areaUnit: 'rai', pricePerUnit: 100, priceUnit: 'm2' });
    expect(r.totalPrice).toBe(0);
    expect(r.pricePerRai).toBe(160_000);
  });

  it('ปฏิเสธราคาติดลบ', () => {
    expect(() => landPrice({ area: 1, areaUnit: 'rai', pricePerUnit: -1, priceUnit: 'rai' })).toThrow();
  });
});
