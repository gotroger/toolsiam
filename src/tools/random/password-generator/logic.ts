import { randomInt, shuffle, type Rng } from '@/lib/random';

export const MIN_PASSWORD_LENGTH = 4;
export const MAX_PASSWORD_LENGTH = 128;

export const CHARSETS = {
  lower: 'abcdefghijklmnopqrstuvwxyz',
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{};:,.?',
} as const;

/** ตัวที่อ่านจากจอแล้วพิมพ์ผิดบ่อยที่สุด — ศูนย์กับโอ หนึ่งกับแอลเล็กกับไอใหญ่ */
const LOOK_ALIKE = new Set('0O1lI');

export interface PasswordOptions {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeLookAlike: boolean;
}

export const DEFAULT_PASSWORD_OPTIONS: PasswordOptions = {
  length: 16,
  lower: true,
  upper: true,
  digits: true,
  symbols: true,
  excludeLookAlike: true,
};

/** ชุดอักขระที่เปิดใช้ หลังตัดตัวที่สับสนออกแล้ว */
export function activeSets(options: PasswordOptions): string[] {
  const strip = (set: string) => (options.excludeLookAlike ? [...set].filter((c) => !LOOK_ALIKE.has(c)).join('') : set);

  return (['lower', 'upper', 'digits', 'symbols'] as const)
    .filter((key) => options[key])
    .map((key) => strip(CHARSETS[key]))
    .filter((set) => set.length > 0);
}

export function poolSize(options: PasswordOptions): number {
  return activeSets(options).reduce((sum, set) => sum + set.length, 0);
}

/**
 * สร้างรหัสผ่านหนึ่งอัน
 *
 * การันตีชุดละอย่างน้อยหนึ่งตัวก่อน แล้วเติมที่เหลือจากกองรวม จากนั้น **สลับตำแหน่งทั้งหมด**
 * — ถ้าไม่สลับ ตัวที่การันตีจะไปกองอยู่ต้นสตริงเป็นแบบแผนที่เดาได้
 *
 * ต้องใช้กับ `cryptoRng()` เท่านั้น ห้ามใช้ `seededRng()` เพราะรหัสผ่านที่สร้างจาก seed
 * ใครรู้ seed ก็สร้างซ้ำได้ ไม่ใช่ความลับอีกต่อไป
 */
export function generatePassword(options: PasswordOptions, rng: Rng): string {
  const { length } = options;
  if (!Number.isInteger(length)) throw new Error('ความยาวต้องเป็นจำนวนเต็ม');
  if (length < MIN_PASSWORD_LENGTH || length > MAX_PASSWORD_LENGTH) {
    throw new Error(`ความยาวต้องอยู่ระหว่าง ${MIN_PASSWORD_LENGTH} ถึง ${MAX_PASSWORD_LENGTH} ตัว`);
  }

  const sets = activeSets(options);
  if (sets.length === 0) throw new Error('เลือกชุดอักขระอย่างน้อยหนึ่งชุด');
  if (length < sets.length) {
    throw new Error(`เลือกชุดอักขระไว้ ${sets.length} ชุด รหัสผ่านจึงต้องยาวอย่างน้อย ${sets.length} ตัว`);
  }

  const pool = sets.join('');
  const chars = sets.map((set) => set[randomInt(rng, 0, set.length - 1)]);
  while (chars.length < length) chars.push(pool[randomInt(rng, 0, pool.length - 1)]);

  return shuffle(chars, rng).join('');
}

export interface Strength {
  /** เอนโทรปีโดยประมาณ (บิต) = ความยาว × log2(ขนาดกองอักขระ) */
  bits: number;
  label: string;
}

/**
 * ประมาณความแข็งแรง — เป็นการนับ "จำนวนความเป็นไปได้" ของวิธีสร้างนี้เท่านั้น
 * ไม่ได้ตรวจว่ารหัสหลุดในฐานข้อมูลที่รั่วไหลหรือไม่ และไม่ได้บอกว่าปลอดภัยแน่นอน
 */
export function estimateStrength(length: number, size: number): Strength {
  if (size <= 1 || length <= 0) return { bits: 0, label: 'อ่อน' };

  const bits = Math.round(length * Math.log2(size));
  const label = bits < 45 ? 'อ่อน' : bits < 60 ? 'พอใช้' : bits < 80 ? 'ดี' : 'แข็งแรงมาก';
  return { bits, label };
}
