import type { OcrPageResult } from './types';

// พยัญชนะ สระ วรรณยุกต์ — ไม่รวมไม้ยมก (ๆ) กับเลขไทย ซึ่งเขียนเว้นวรรคตามปกติ
const THAI = '[\\u0E01-\\u0E3A\\u0E40-\\u0E45\\u0E47-\\u0E4E]';
const BETWEEN_THAI = new RegExp(`(?<=${THAI})[ \\t]+(?=${THAI})`, 'g');

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

export function joinResults(results: OcrPageResult[], tidy: boolean): string {
  const clean = (text: string) => (tidy ? tidyThaiSpacing(text) : text.trim());
  const readable = results.filter((page) => !page.error);
  if (results.length === 1) return readable.map((page) => clean(page.text)).join('');
  return readable.map((page) => `--- ${page.name} ---\n${clean(page.text)}`).join('\n\n');
}

export function outputFileName(names: string[]): string {
  if (names.length === 1) return `${names[0]!.replace(/\.[^.]+$/, '')}.txt`;
  return `ocr-${names.length}-รูป.txt`;
}
