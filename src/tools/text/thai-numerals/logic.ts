const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

export type CaseMode = 'upper' | 'lower' | 'title' | 'sentence';

export function toThaiDigits(text: string): string {
  return text.replace(/[0-9]/g, (d) => THAI_DIGITS[Number(d)]);
}

export function toArabicDigits(text: string): string {
  return text.replace(/[๐-๙]/g, (d) => String(THAI_DIGITS.indexOf(d)));
}

export function transformCase(text: string, mode: CaseMode): string {
  switch (mode) {
    case 'upper':
      return text.toUpperCase();
    case 'lower':
      return text.toLowerCase();
    case 'title':
      // ตัวใหญ่เฉพาะตอนขึ้นต้นคำจริง ๆ: ต้นข้อความ หรือไม่ได้ตามหลังตัวอักษรละติน/อะพอสทรอฟี/ตัวอักษรไทย
      return text.toLowerCase().replace(/(?<![a-z'฀-๿])[a-z]/g, (c) => c.toUpperCase());
    case 'sentence': {
      const lower = text.toLowerCase();
      // ตัวแรกของข้อความ และตัวแรกหลังเครื่องหมายจบประโยค
      return lower.replace(/(^\s*|[.!?]\s+)([a-z])/g, (_, prefix: string, c: string) => prefix + c.toUpperCase());
    }
  }
}
