export interface CountResult {
  /** จำนวน code point รวมช่องว่าง (สระ/วรรณยุกต์นับแยก) */
  characters: number;
  charactersNoSpaces: number;
  /** จำนวนตัวอักษรที่ตาเห็น (รวมสระ/วรรณยุกต์เข้ากับพยัญชนะแล้ว) */
  graphemes: number;
  words: number;
  lines: number;
  paragraphs: number;
  sentences: number;
  /** ปัดขึ้น ที่ 200 คำ/นาที */
  readingMinutes: number;
}

const WORDS_PER_MINUTE = 200;

const Seg = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;

function countGraphemes(text: string): number {
  if (!Seg) return Array.from(text).length;
  return [...new Seg('th', { granularity: 'grapheme' }).segment(text)].length;
}

function countWords(text: string): number {
  if (!text.trim()) return 0;
  if (!Seg) return text.trim().split(/\s+/).length;
  const segments = [...new Seg('th', { granularity: 'word' }).segment(text)];
  return segments.filter((s) => s.isWordLike).length;
}

export function countText(text: string): CountResult {
  const characters = Array.from(text).length;
  const charactersNoSpaces = Array.from(text.replace(/\s/g, '')).length;
  const words = countWords(text);
  const lines = text === '' ? 0 : text.split(/\r\n|\r|\n/).length;
  const paragraphs = text
    .split(/(?:\r\n|\r|\n){2,}/)
    .filter((p) => p.trim() !== '').length;
  const sentences = text
    .split(/[.!?…]+|(?:\r\n|\r|\n)+/)
    .filter((s) => s.trim() !== '').length;

  return {
    characters,
    charactersNoSpaces,
    graphemes: countGraphemes(text),
    words,
    lines,
    paragraphs,
    sentences,
    readingMinutes: words === 0 ? 0 : Math.ceil(words / WORDS_PER_MINUTE),
  };
}
