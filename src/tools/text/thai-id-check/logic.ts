export interface IdValidation {
  valid: boolean;
  /** เฉพาะตัวเลขที่กรอก (ตัดขีด/ช่องว่างออก) */
  normalized: string;
  /** รูปแบบ x-xxxx-xxxxx-xx-x ถ้าครบ 13 หลัก มิฉะนั้นเท่ากับ normalized */
  formatted: string;
  error?: string;
}

export function idCheckDigit(first12: string): number {
  if (!/^\d{12}$/.test(first12)) throw new Error('ต้องเป็นตัวเลข 12 หลัก');
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(first12[i]) * (13 - i);
  return (11 - (sum % 11)) % 10;
}

export function formatThaiId(id13: string): string {
  if (!/^\d{13}$/.test(id13)) return id13;
  return `${id13[0]}-${id13.slice(1, 5)}-${id13.slice(5, 10)}-${id13.slice(10, 12)}-${id13[12]}`;
}

export function validateThaiId(input: string): IdValidation {
  const normalized = input.replace(/[\s-]/g, '');
  const base: IdValidation = { valid: false, normalized, formatted: formatThaiId(normalized) };

  if (normalized === '') return { ...base, error: 'กรุณากรอกเลขบัตรประชาชน' };
  if (!/^\d+$/.test(normalized)) return { ...base, error: 'ต้องเป็นตัวเลขเท่านั้น' };
  if (normalized.length !== 13) return { ...base, error: `ต้องมี 13 หลัก (กรอกมา ${normalized.length} หลัก)` };

  const expected = idCheckDigit(normalized.slice(0, 12));
  if (expected !== Number(normalized[12])) {
    return { ...base, error: `หลักตรวจสอบไม่ถูกต้อง (ควรเป็น ${expected})` };
  }
  return { ...base, valid: true };
}

/** สุ่มเลขบัตรที่ผ่าน checksum สำหรับใช้ทดสอบระบบเท่านั้น */
export function randomThaiId(rand: () => number = Math.random): string {
  let digits = String(1 + Math.floor(rand() * 8));
  for (let i = 1; i < 12; i++) digits += String(Math.floor(rand() * 10));
  return digits + String(idCheckDigit(digits));
}
