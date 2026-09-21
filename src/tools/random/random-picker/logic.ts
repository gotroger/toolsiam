import { sample, sampleWithReplacement, type Rng } from '@/lib/random';

/** เพดานต่อการสุ่มหนึ่งครั้ง — กันการพิมพ์เลขหลุดจนหน้าค้าง ไม่ใช่ข้อจำกัดทางเทคนิค */
export const MAX_PICK = 1000;

export interface PickOptions {
  count: number;
  /** true = คนเดิมถูกเลือกซ้ำได้ (เช่น สุ่มคำถาม) · false = จับฉลากหาผู้โชคดีคนละรางวัล */
  allowRepeat: boolean;
}

export function pickWinners(items: readonly string[], { count, allowRepeat }: PickOptions, rng: Rng): string[] {
  if (items.length === 0) throw new Error('ยังไม่มีรายการให้สุ่ม พิมพ์รายชื่อบรรทัดละ 1 รายการ');
  if (!Number.isInteger(count) || count < 1) throw new Error('จำนวนที่สุ่มต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  if (count > MAX_PICK) throw new Error(`สุ่มได้ครั้งละไม่เกิน ${MAX_PICK} รายการ`);

  if (allowRepeat) return sampleWithReplacement(items, count, rng);
  if (count > items.length) {
    throw new Error(`มี ${items.length} รายการ จึงสุ่มแบบไม่ซ้ำได้มากที่สุด ${items.length} รายการ`);
  }
  return sample(items, count, rng);
}
