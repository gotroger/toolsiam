import { sample, type Rng } from '@/lib/random';

export const MAX_LUCKY = 10;

export type LuckyDigits = 2 | 3;

/**
 * สุ่มเลขนำโชคแบบไม่ซ้ำกันในชุดเดียว
 *
 * คืนเป็นสตริงไม่ใช่ตัวเลข เพราะ "07" กับ "7" คนละเลขในความเข้าใจของผู้ใช้
 * และการแปลงเป็น number จะทำให้ศูนย์นำหน้าหายไป
 */
export function drawLuckyNumbers(digits: LuckyDigits, count: number, rng: Rng): string[] {
  if (digits !== 2 && digits !== 3) throw new Error('เลือกได้เฉพาะเลข 2 ตัวหรือ 3 ตัว');
  if (!Number.isInteger(count) || count < 1) throw new Error('จำนวนชุดต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  if (count > MAX_LUCKY) throw new Error(`สุ่มได้ครั้งละไม่เกิน ${MAX_LUCKY} ชุด`);

  const size = digits === 2 ? 100 : 1000;
  const pool = Array.from({ length: size }, (_, i) => String(i).padStart(digits, '0'));
  return sample(pool, count, rng);
}
