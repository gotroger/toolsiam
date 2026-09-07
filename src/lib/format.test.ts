import { describe, it, expect } from 'vitest';
import { formatBaht, formatNumber } from './format';

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
