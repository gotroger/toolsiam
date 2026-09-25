import { describe, it, expect } from 'vitest';
import { formatBaht, formatNumber, parseNumberInput } from './format';

describe('format', () => {
  it('formatBaht ใส่คอมมาและทศนิยม 2 ตำแหน่งเสมอ', () => {
    expect(formatBaht(1234.5)).toBe('1,234.50');
    expect(formatBaht(0)).toBe('0.00');
    expect(formatBaht(1000000)).toBe('1,000,000.00');
    expect(formatBaht(-99.999)).toBe('-100.00');
  });
  it('formatNumber ปัดตามจำนวนหลักที่ขอ', () => {
    expect(formatNumber(1234.567)).toBe('1,235');
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
  });
});

describe('parseNumberInput', () => {
  it('ตัดคอมมาและช่องว่างที่ผู้ใช้พิมพ์', () => {
    expect(parseNumberInput('2,000,000')).toBe(2_000_000);
    expect(parseNumberInput(' 1,234.50 ')).toBe(1234.5);
    expect(parseNumberInput('0')).toBe(0);
  });

  it('ช่องว่างเปล่าเป็น NaN ไม่ใช่ 0 — กันกรณีลบค่าทิ้งแล้วกลายเป็นศูนย์เงียบ ๆ', () => {
    expect(parseNumberInput('')).toBeNaN();
    expect(parseNumberInput('   ')).toBeNaN();
  });

  it('ข้อความที่ไม่ใช่ตัวเลขเป็น NaN', () => {
    expect(parseNumberInput('abc')).toBeNaN();
    expect(parseNumberInput('Infinity')).toBeNaN();
  });
});
