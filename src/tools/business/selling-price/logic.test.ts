import { describe, it, expect } from 'vitest';
import { sellingPrice } from './logic';

describe('ตั้งราคาขายจากต้นทุน', () => {
  it('ฐานมาร์จิ้น 20% จากทุน 100 ได้ราคา 125', () => {
    const r = sellingPrice(100, 'margin', 20, 0);
    expect(r.price).toBe(125);
    expect(r.marginPercent).toBe(20);
    expect(r.markupPercent).toBe(25);
  });

  it('ฐานมาร์กอัป 25% จากทุน 100 ได้ราคาเดียวกัน แต่เข้าจากอีกทาง', () => {
    expect(sellingPrice(100, 'markup', 25, 0).price).toBe(125);
  });

  it('ฐานกำไรเป็นบาทบวกตรงเข้าต้นทุน', () => {
    const r = sellingPrice(250, 'profit', 80, 0);
    expect(r.price).toBe(330);
    expect(r.profit).toBe(80);
  });

  it('คิด VAT ทับราคาขายที่ได้', () => {
    const r = sellingPrice(100, 'margin', 20, 7);
    expect(r.vatAmount).toBe(8.75);
    expect(r.priceWithVat).toBe(133.75);
  });

  it('VAT 0% ทำให้ราคารวมเท่าราคาขาย', () => {
    const r = sellingPrice(100, 'markup', 10, 0);
    expect(r.priceWithVat).toBe(r.price);
  });

  it('มาร์จิ้น 100% ขึ้นไปเป็นไปไม่ได้ และ VAT ติดลบไม่ได้', () => {
    expect(() => sellingPrice(100, 'margin', 100, 7)).toThrow('น้อยกว่า 100%');
    expect(() => sellingPrice(100, 'margin', 20, -1)).toThrow('VAT');
  });
});
