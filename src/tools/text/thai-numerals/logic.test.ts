import { describe, it, expect } from 'vitest';
import { toThaiDigits, toArabicDigits, transformCase } from './logic';

describe('toThaiDigits', () => {
  it('แปลงเลขอารบิกเป็นเลขไทย', () => {
    expect(toThaiDigits('0123456789')).toBe('๐๑๒๓๔๕๖๗๘๙');
  });

  it('คงตัวอักษรอื่นไว้เหมือนเดิม', () => {
    expect(toThaiDigits('บ้านเลขที่ 25/3')).toBe('บ้านเลขที่ ๒๕/๓');
  });

  it('ข้อความว่างได้ข้อความว่าง', () => {
    expect(toThaiDigits('')).toBe('');
  });
});

describe('toArabicDigits', () => {
  it('แปลงเลขไทยเป็นอารบิก', () => {
    expect(toArabicDigits('๐๑๒๓๔๕๖๗๘๙')).toBe('0123456789');
  });

  it('แปลงกลับไปกลับมาแล้วได้ค่าเดิม', () => {
    const s = 'ปี พ.ศ. 2569 วันที่ 7';
    expect(toArabicDigits(toThaiDigits(s))).toBe(s);
  });
});

describe('transformCase', () => {
  it('ตัวพิมพ์ใหญ่ทั้งหมด', () => {
    expect(transformCase('hello ไทย world', 'upper')).toBe('HELLO ไทย WORLD');
  });

  it('ตัวพิมพ์เล็กทั้งหมด', () => {
    expect(transformCase('HELLO World', 'lower')).toBe('hello world');
  });

  it('ขึ้นต้นคำด้วยตัวใหญ่', () => {
    expect(transformCase('hello world', 'title')).toBe('Hello World');
    expect(transformCase('HELLO WORLD', 'title')).toBe('Hello World');
  });

  it('ขึ้นต้นประโยคด้วยตัวใหญ่', () => {
    expect(transformCase('hello world. how are you?', 'sentence')).toBe('Hello world. How are you?');
  });

  it('ไม่ทำให้ข้อความไทยเปลี่ยน', () => {
    expect(transformCase('สวัสดีครับ', 'title')).toBe('สวัสดีครับ');
  });

  it('เครื่องหมายอะพอสทรอฟีไม่ทำให้ตัวถัดไปเป็นตัวใหญ่', () => {
    expect(transformCase("don't stop", 'title')).toBe("Don't Stop");
  });

  it('ตัวอักษรละตินที่ตามหลังตัวอักษรไทยไม่กลายเป็นตัวใหญ่', () => {
    expect(transformCase('ไทยhello', 'title')).toBe('ไทยhello');
  });
});
