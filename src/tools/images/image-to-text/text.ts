import type { OcrPageResult } from './types';

// พยัญชนะ สระ วรรณยุกต์ — ไม่รวมไม้ยมก (ๆ) กับเลขไทย ซึ่งเขียนเว้นวรรคตามปกติ
/* eslint-disable no-misleading-character-class -- ตั้งใจจับสระบน/ล่างและวรรณยุกต์ทีละ code point */
const BETWEEN_THAI =
  /(?<=[\u0E01-\u0E3A\u0E40-\u0E45\u0E47-\u0E4E])[ \t]+(?=[\u0E01-\u0E3A\u0E40-\u0E45\u0E47-\u0E4E])/g;

/* eslint-enable no-misleading-character-class */

/**
 * Tesseract มักแทรกช่องว่างกลางคำไทย ("ยอด เงิน", "น้ ำ") เพราะภาษาไทยไม่เว้นวรรคระหว่างคำ
 * ลบช่องว่างที่อยู่ระหว่างอักขระไทยสองตัว คงช่องว่างระหว่างไทยกับละติน/ตัวเลขไว้
 *
 * ข้อจำกัดที่ยอมรับ: ช่องว่างจริงระหว่างประโยคไทยหายไปด้วย — UI จึงให้ปิดได้และเก็บข้อความดิบไว้สลับกลับ
 */
export function tidyThaiSpacing(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(BETWEEN_THAI, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Tesseract คืนสระอำเป็นนิคหิต (U+0E4D) + สระอา (U+0E32) แยกกัน — หน้าตาเหมือนกันแต่ค้นหาและวางลงโปรแกรมอื่นแล้วไม่ตรงกับ "ำ" ที่พิมพ์จากคีย์บอร์ด
 * รวมกลับเป็น U+0E33 โดยย้ายวรรณยุกต์ (U+0E48–0E4B) ไปไว้หน้าสระอำตามลำดับมาตรฐาน — เป็นการแก้การเข้ารหัส ไม่ใช่การเดาคำ จึงทำเสมอ
 */
export function normalizeThai(text: string): string {
  return text.replace(/\u0E4D([\u0E48-\u0E4B]?)\u0E32|([\u0E48-\u0E4B])\u0E4D\u0E32/g, '$1$2\u0E33');
}

export function joinResults(results: OcrPageResult[], tidy: boolean): string {
  const clean = (text: string) => (tidy ? tidyThaiSpacing(normalizeThai(text)) : normalizeThai(text).trim());
  const readable = results.filter((page) => !page.error);
  if (results.length === 1) return readable.map((page) => clean(page.text)).join('');
  return readable.map((page) => `--- ${page.name} ---\n${clean(page.text)}`).join('\n\n');
}

export function outputFileName(names: string[]): string {
  if (names.length === 1) return `${names[0]!.replace(/\.[^.]+$/, '')}.txt`;
  return `ocr-${names.length}-รูป.txt`;
}
