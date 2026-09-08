import { describe, it, expect } from 'vitest';
import { PRICE_BASES, priceFromRate, priceFromTotal } from './logic';

const oneRai = { rai: 1, ngan: 0, wa: 0 };

describe('ราคาที่ดินจากราคาต่อหน่วย', () => {
  it('ตารางวาละ 25,000 บาท บนที่ดิน 1 ไร่ = 10 ล้านบาท', () => {
    const r = priceFromRate(oneRai, 25_000, 'squareWa');
    expect(r.total).toBe(10_000_000);
    expect(r.areaText).toBe('1 ไร่');
  });

  it('ไร่ละ 2 ล้าน บนที่ดิน 2 ไร่ 2 งาน = 5 ล้านบาท', () => {
    expect(priceFromRate({ rai: 2, ngan: 2, wa: 0 }, 2_000_000, 'rai').total).toBe(5_000_000);
  });

  it('ตารางเมตรละ 1,000 บาท บนที่ดิน 1 ไร่ = 1.6 ล้านบาท', () => {
    expect(priceFromRate(oneRai, 1_000, 'squareMeter').total).toBe(1_600_000);
  });

  it('คืนราคาต่อหน่วยครบทุกแบบให้เทียบกับแปลงอื่นได้', () => {
    const r = priceFromRate(oneRai, 25_000, 'squareWa');
    expect(r.perUnit.map((p) => p.basis)).toEqual(PRICE_BASES.map((b) => b.id));
    expect(r.perUnit.find((p) => p.basis === 'rai')!.value).toBe(10_000_000);
    expect(r.perUnit.find((p) => p.basis === 'squareMeter')!.value).toBe(6_250);
  });
});

describe('ราคาต่อหน่วยจากราคารวม', () => {
  it('ที่ดิน 1 ไร่ 200 ตารางวา ราคา 12 ล้าน ตกตารางวาละ 20,000 บาท', () => {
    const r = priceFromTotal({ rai: 1, ngan: 0, wa: 200 }, 12_000_000);
    expect(r.perUnit.find((p) => p.basis === 'squareWa')!.value).toBe(20_000);
    expect(r.total).toBe(12_000_000);
  });

  it('ผลลัพธ์สองทางสอดคล้องกัน', () => {
    const area = { rai: 3, ngan: 1, wa: 45.5 };
    const forward = priceFromRate(area, 18_500, 'squareWa');
    const backward = priceFromTotal(area, forward.total);
    expect(backward.perUnit.find((p) => p.basis === 'squareWa')!.value).toBe(18_500);
  });

  it('ปัดเงินเป็นสองตำแหน่ง ไม่หลุดทศนิยมลอย', () => {
    const r = priceFromTotal({ rai: 0, ngan: 0, wa: 3 }, 100);
    expect(r.perUnit.find((p) => p.basis === 'squareWa')!.value).toBe(33.33);
  });
});

describe('ข้อผิดพลาด', () => {
  it('ที่ดินขนาด 0 คิดราคาต่อหน่วยไม่ได้', () => {
    expect(() => priceFromTotal({ rai: 0, ngan: 0, wa: 0 }, 1_000)).toThrow('ขนาดที่ดิน');
    expect(() => priceFromRate({ rai: 0, ngan: 0, wa: 0 }, 1_000, 'rai')).toThrow('ขนาดที่ดิน');
  });

  it('ราคาติดลบเป็นข้อผิดพลาด', () => {
    expect(() => priceFromRate(oneRai, -1, 'squareWa')).toThrow('ราคาต่อหน่วย');
    expect(() => priceFromTotal(oneRai, -1)).toThrow('ราคารวม');
  });

  it('ขนาดที่ดินติดลบเป็นข้อผิดพลาด', () => {
    expect(() => priceFromTotal({ rai: -1, ngan: 0, wa: 0 }, 100)).toThrow();
  });
});
