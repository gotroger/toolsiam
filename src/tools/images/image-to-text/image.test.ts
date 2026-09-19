import { describe, expect, it } from 'vitest';
import { MAX_FILES, targetSize, validateFiles } from './image';

const file = (name: string, type: string, mb = 1) => {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: mb * 1048576 });
  return f;
};

describe('validateFiles', () => {
  it('ผ่านเมื่อเป็น JPG PNG WebP ตามขนาด', () => {
    expect(
      validateFiles([file('a.jpg', 'image/jpeg'), file('b.PNG', 'image/png'), file('c.webp', 'image/webp', 10)]),
    ).toBe('');
  });
  it('ไม่มีไฟล์', () => {
    expect(validateFiles([])).toContain('เลือกรูป');
  });
  it('ชนิดไฟล์ไม่รองรับ บอกชื่อไฟล์', () => {
    expect(validateFiles([file('doc.pdf', 'application/pdf')])).toContain('doc.pdf');
    expect(validateFiles([file('photo.heic', 'image/heic')])).toContain('photo.heic');
    // นามสกุลถูกแต่ MIME ไม่ใช่รูป
    expect(validateFiles([file('fake.jpg', 'text/plain')])).toContain('fake.jpg');
  });
  it('ไฟล์ใหญ่เกิน 10 MB', () => {
    expect(validateFiles([file('big.jpg', 'image/jpeg', 10.5)])).toContain('10 MB');
  });
  it('เกินจำนวนรูปต่อครั้ง', () => {
    const many = Array.from({ length: MAX_FILES + 1 }, (_, i) => file(`${i}.jpg`, 'image/jpeg'));
    expect(validateFiles(many)).toContain(`${MAX_FILES} รูป`);
  });
});

describe('targetSize', () => {
  it('ไม่ย่อเมื่อด้านยาวไม่เกิน 2400', () => {
    expect(targetSize(2400, 1800)).toEqual({ width: 2400, height: 1800, scaled: false });
  });
  it('ย่อตามสัดส่วนเมื่อด้านยาวเกิน', () => {
    expect(targetSize(4800, 3600)).toEqual({ width: 2400, height: 1800, scaled: true });
    expect(targetSize(3000, 6000)).toEqual({ width: 1200, height: 2400, scaled: true });
  });
  it('ด้านสั้นไม่ต่ำกว่า 1 พิกเซล', () => {
    expect(targetSize(100000, 10).height).toBe(1);
  });
});
