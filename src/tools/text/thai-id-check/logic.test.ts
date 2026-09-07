import { describe, it, expect } from 'vitest';
import { idCheckDigit, validateThaiId, formatThaiId, randomThaiId } from './logic';

describe('idCheckDigit', () => {
  it('คำนวณหลักตรวจสอบจาก 12 หลักแรก', () => {
    expect(idCheckDigit('123456789012')).toBe(1);
    expect(idCheckDigit('100000000000')).toBe(9);
  });

  it('ต้องเป็นตัวเลข 12 หลักเท่านั้น', () => {
    expect(() => idCheckDigit('12345')).toThrow();
    expect(() => idCheckDigit('12345678901a')).toThrow();
  });
});

describe('validateThaiId', () => {
  it('เลขถูกต้อง', () => {
    const r = validateThaiId('1234567890121');
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe('1234567890121');
    expect(r.formatted).toBe('1-2345-67890-12-1');
    expect(r.error).toBeUndefined();
  });

  it('ยอมรับรูปแบบที่มีขีดและช่องว่าง', () => {
    expect(validateThaiId('1-2345-67890-12-1').valid).toBe(true);
    expect(validateThaiId(' 1234 5678 9012 1 ').valid).toBe(true);
  });

  it('หลักตรวจสอบผิด → ไม่ถูกต้อง', () => {
    const r = validateThaiId('1234567890122');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('หลักตรวจสอบ');
  });

  it('จำนวนหลักไม่ครบ → ไม่ถูกต้อง', () => {
    const r = validateThaiId('12345');
    expect(r.valid).toBe(false);
    expect(r.error).toContain('13 หลัก');
  });

  it('มีตัวอักษรที่ไม่ใช่ตัวเลข → ไม่ถูกต้อง', () => {
    expect(validateThaiId('abcdefghijklm').valid).toBe(false);
  });

  it('ข้อความว่าง → ไม่ถูกต้องแต่ไม่ throw', () => {
    expect(validateThaiId('').valid).toBe(false);
  });
});

describe('formatThaiId', () => {
  it('ใส่ขีดตามรูปแบบราชการ', () => {
    expect(formatThaiId('1234567890121')).toBe('1-2345-67890-12-1');
  });
});

describe('randomThaiId', () => {
  it('สุ่มด้วยค่าคงที่ได้ผลคาดเดาได้ และหลักตรวจสอบถูก', () => {
    expect(randomThaiId(() => 0)).toBe('1000000000009');
  });

  it('เลขที่สุ่มได้ต้องผ่านการตรวจสอบเสมอ', () => {
    for (let i = 0; i < 50; i++) {
      const id = randomThaiId();
      expect(id).toHaveLength(13);
      expect(validateThaiId(id).valid).toBe(true);
    }
  });

  it('หลักแรกอยู่ในช่วง 1-8 ตามประเภทบุคคลที่มีจริง', () => {
    for (let i = 0; i < 50; i++) {
      const first = Number(randomThaiId()[0]);
      expect(first).toBeGreaterThanOrEqual(1);
      expect(first).toBeLessThanOrEqual(8);
    }
  });
});
