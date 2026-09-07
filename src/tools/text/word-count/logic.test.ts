import { describe, it, expect } from 'vitest';
import { countText } from './logic';

describe('countText', () => {
  it('ข้อความว่างได้ 0 ทุกค่า', () => {
    const r = countText('');
    expect(r.characters).toBe(0);
    expect(r.charactersNoSpaces).toBe(0);
    expect(r.words).toBe(0);
    expect(r.lines).toBe(0);
    expect(r.paragraphs).toBe(0);
    expect(r.readingMinutes).toBe(0);
  });

  it('นับตัวอักษรรวมและไม่รวมช่องว่าง', () => {
    const r = countText('ก ข ค');
    expect(r.characters).toBe(5);
    expect(r.charactersNoSpaces).toBe(3);
  });

  it('นับสระและวรรณยุกต์ไทยเป็นตัวอักษรแยก แต่นับเป็น 1 พยางค์ที่มองเห็น', () => {
    const r = countText('ที่');
    expect(r.characters).toBe(3);
    expect(r.graphemes).toBe(1);
  });

  it('นับคำภาษาอังกฤษได้เป๊ะ', () => {
    expect(countText('hello world').words).toBe(2);
    expect(countText('  hello   world  ').words).toBe(2);
  });

  it('ตัดคำภาษาไทยที่ไม่มีช่องว่างได้มากกว่า 1 คำ', () => {
    const r = countText('สวัสดีครับผมชื่อสมชาย');
    expect(r.words).toBeGreaterThanOrEqual(4);
    expect(r.words).toBeLessThanOrEqual(8);
  });

  it('นับบรรทัดและย่อหน้า', () => {
    const r = countText('บรรทัดหนึ่ง\nบรรทัดสอง\n\nย่อหน้าใหม่');
    expect(r.lines).toBe(4);
    expect(r.paragraphs).toBe(2);
  });

  it('รองรับ CRLF', () => {
    expect(countText('a\r\nb').lines).toBe(2);
  });

  it('นับประโยคจากเครื่องหมายจบประโยค', () => {
    expect(countText('Hello. How are you? Fine!').sentences).toBe(3);
  });

  it('เวลาอ่านปัดขึ้นเป็นนาที', () => {
    const text = Array.from({ length: 250 }, () => 'word').join(' ');
    expect(countText(text).words).toBe(250);
    expect(countText(text).readingMinutes).toBe(2); // 200 คำ/นาที
  });
});
