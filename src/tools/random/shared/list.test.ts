import { describe, it, expect } from 'vitest';
import { parseList } from './list';

describe('parseList', () => {
  it('แยกทีละบรรทัดและตัดช่องว่างหัวท้าย', () => {
    expect(parseList('  สมชาย \n สมหญิง  ')).toEqual(['สมชาย', 'สมหญิง']);
  });

  it('ตัดบรรทัดว่างทิ้ง', () => {
    expect(parseList('ก\n\n  \nข\n')).toEqual(['ก', 'ข']);
  });

  it('รองรับตัวขึ้นบรรทัดใหม่ทั้งสามแบบ', () => {
    expect(parseList('ก\r\nข\rค\nง')).toEqual(['ก', 'ข', 'ค', 'ง']);
  });

  it('ข้อความว่างได้อาร์เรย์ว่าง', () => {
    expect(parseList('')).toEqual([]);
    expect(parseList('   \n  ')).toEqual([]);
  });

  it('เก็บรายการซ้ำไว้ — คนชื่อซ้ำกันคือคนละคน', () => {
    expect(parseList('สมชาย\nสมชาย')).toEqual(['สมชาย', 'สมชาย']);
  });
});
