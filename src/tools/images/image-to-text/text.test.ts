import { describe, expect, it } from 'vitest';
import { joinResults, normalizeThai, outputFileName, tidyThaiSpacing } from './text';

describe('tidyThaiSpacing', () => {
  it('ลบช่องว่างระหว่างอักขระไทยที่ติดกัน', () => {
    expect(tidyThaiSpacing('ยอด เงิน ที่ ต้อง ชำระ')).toBe('ยอดเงินที่ต้องชำระ');
  });
  it('ลบช่องว่างหน้าสระและวรรณยุกต์ที่ลอยออกมา', () => {
    expect(tidyThaiSpacing('น้ ำ ดื่ ม')).toBe('น้ำดื่ม');
  });
  it('คงช่องว่างระหว่างไทยกับอังกฤษและตัวเลข', () => {
    expect(tidyThaiSpacing('โอน เงิน 1,500 บาท ผ่าน PromptPay แล้ว')).toBe('โอนเงิน 1,500 บาทผ่าน PromptPay แล้ว');
  });
  it('ไม่แตะข้อความอังกฤษล้วน', () => {
    expect(tidyThaiSpacing('Total amount due: 1,500.00 THB')).toBe('Total amount due: 1,500.00 THB');
  });
  it('คงบรรทัดใหม่ ยุบช่องว่างซ้อน และตัดช่องว่างท้ายบรรทัด', () => {
    expect(tidyThaiSpacing('ชื่อ  ผู้ รับ   \nJohn   Smith \n\n\n\nจบ')).toBe('ชื่อผู้รับ\nJohn Smith\n\nจบ');
  });
  it('ไม่ลบช่องว่างรอบเลขไทยและไม้ยมก', () => {
    expect(tidyThaiSpacing('หน้า ๑๒ ของ ๒๐')).toBe('หน้า ๑๒ ของ ๒๐');
    expect(tidyThaiSpacing('ต่าง ๆ นานา')).toBe('ต่าง ๆ นานา');
  });
});

describe('normalizeThai', () => {
  it('รวมนิคหิต + สระอา ที่ Tesseract คืนมาแยกกัน เป็นสระอำตัวเดียว', () => {
    expect(normalizeThai('ช\u0E4D\u0E32ระ')).toBe('ชำระ');
  });
  it('มีวรรณยุกต์คั่นหรือสลับลำดับก็รวมได้ โดยวรรณยุกต์อยู่หน้าสระอำ', () => {
    expect(normalizeThai('น\u0E4D\u0E49\u0E32')).toBe('น้ำ');
    expect(normalizeThai('น\u0E49\u0E4D\u0E32')).toBe('น้ำ');
  });
  it('ไม่แตะข้อความที่ถูกอยู่แล้ว', () => {
    expect(normalizeThai('น้ำดื่ม Total 1,500')).toBe('น้ำดื่ม Total 1,500');
  });
});

describe('joinResults', () => {
  const page = (name: string, text: string, error?: string) => ({ name, text, confidence: 90, error });
  it('รูปเดียวไม่มีหัวคั่น', () => {
    expect(joinResults([page('a.jpg', 'สวัส ดี')], true)).toBe('สวัสดี');
    expect(joinResults([page('a.jpg', 'สวัส ดี')], false)).toBe('สวัส ดี');
  });
  it('normalize สระอำเสมอ แม้ปิดการจัดช่องว่าง', () => {
    expect(joinResults([page('a.jpg', 'ช\u0E4D\u0E32ระ เงิน')], false)).toBe('ชำระ เงิน');
  });
  it('หลายรูปคั่นด้วยชื่อไฟล์ และข้ามรูปที่อ่านไม่ได้', () => {
    const text = joinResults([page('a.jpg', 'หนึ่ง'), page('b.png', '', 'อ่านไม่ได้'), page('c.png', 'three')], true);
    expect(text).toBe('--- a.jpg ---\nหนึ่ง\n\n--- c.png ---\nthree');
  });
});

describe('outputFileName', () => {
  it('รูปเดียวใช้ชื่อรูป', () => {
    expect(outputFileName(['สลิป 20-09.JPG'])).toBe('สลิป 20-09.txt');
  });
  it('หลายรูปใช้จำนวน', () => {
    expect(outputFileName(['a.jpg', 'b.jpg', 'c.jpg'])).toBe('ocr-3-รูป.txt');
  });
});
