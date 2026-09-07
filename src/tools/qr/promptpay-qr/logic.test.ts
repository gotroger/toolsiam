import { describe, it, expect } from 'vitest';
import { normalizeTarget, buildPromptPayPayload } from './logic';

describe('normalizeTarget', () => {
  it('เบอร์โทรรูปแบบต่าง ๆ → 10 หลักขึ้นต้น 0', () => {
    expect(normalizeTarget('081-234-5678')).toEqual({ type: 'phone', value: '0812345678' });
    expect(normalizeTarget('+66 81 234 5678')).toEqual({ type: 'phone', value: '0812345678' });
    expect(normalizeTarget('66812345678')).toEqual({ type: 'phone', value: '0812345678' });
  });
  it('เลขบัตรประชาชน 13 หลัก และ e-wallet 15 หลัก', () => {
    expect(normalizeTarget('1-2345-67890-12-3')).toEqual({ type: 'nationalId', value: '1234567890123' });
    expect(normalizeTarget('123456789012345')).toEqual({ type: 'ewallet', value: '123456789012345' });
  });
  it('รูปแบบไม่ถูกต้องโยน error', () => {
    expect(() => normalizeTarget('12345')).toThrow('กรุณากรอกเบอร์โทร 10 หลัก');
    expect(() => normalizeTarget('')).toThrow();
  });
});

describe('buildPromptPayPayload', () => {
  it('payload เป็น EMVCo: ขึ้นต้น 000201, มี 5802TH, ลงท้าย CRC 6304XXXX', () => {
    const p = buildPromptPayPayload('0812345678');
    expect(p.startsWith('000201')).toBe(true);
    expect(p).toContain('5802TH');
    expect(p).toMatch(/6304[0-9A-F]{4}$/);
  });
  it('เบอร์โทรถูกแปลงเป็นรูปแบบสากล 0066 ใน payload', () => {
    expect(buildPromptPayPayload('0812345678')).toContain('0066812345678');
  });
  it('ระบุจำนวนเงินจะมี tag 54 พร้อมทศนิยม 2 ตำแหน่ง', () => {
    expect(buildPromptPayPayload('0812345678', 100)).toContain('5406100.00');
    expect(buildPromptPayPayload('0812345678', 1234.5)).toContain('54071234.50');
  });
  it('ไม่ระบุจำนวนเงินหรือ 0 → ไม่มี tag 54', () => {
    expect(buildPromptPayPayload('0812345678')).not.toContain('5406');
    expect(buildPromptPayPayload('0812345678', 0)).not.toMatch(/54\d{2}\d+\.\d{2}/);
  });
  it('จำนวนเงินติดลบโยน error', () => {
    expect(() => buildPromptPayPayload('0812345678', -1)).toThrow('จำนวนเงินต้องไม่ติดลบ');
  });
});
