import { randomInt, sample, type Rng } from '@/lib/random';

export const MAX_DRAW = 1000;
export const MAX_DICE = 50;
export const MAX_DICE_SIDES = 1000;

/** ขนาดช่วงที่ยังคุ้มจะสร้างกองแล้วสลับ — กว้างกว่านี้ใช้วิธีสุ่มแล้วกันซ้ำ */
const POOL_LIMIT = 100_000;

export type NumberMode = 'range' | 'dice' | 'coin';

export interface RangeOptions {
  min: number;
  max: number;
  count: number;
  unique: boolean;
}

export function drawNumbers({ min, max, count, unique }: RangeOptions, rng: Rng): number[] {
  if (!Number.isInteger(min) || !Number.isInteger(max)) throw new Error('ค่าต่ำสุดและค่าสูงสุดต้องเป็นจำนวนเต็ม');
  if (min > max) throw new Error('ค่าต่ำสุดต้องไม่มากกว่าค่าสูงสุด');
  if (!Number.isInteger(count) || count < 1) throw new Error('จำนวนที่สุ่มต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  if (count > MAX_DRAW) throw new Error(`สุ่มได้ครั้งละไม่เกิน ${MAX_DRAW} ตัว`);

  if (!unique) return Array.from({ length: count }, () => randomInt(rng, min, max));

  const size = max - min + 1;
  if (count > size) {
    throw new Error(`ช่วง ${min}–${max} มีเพียง ${size} ตัวเลข จึงสุ่มแบบไม่ซ้ำได้มากที่สุด ${size} ตัว`);
  }

  // ช่วงแคบ: ขอได้เกือบเท่าจำนวนที่มี การสุ่มแล้วกันซ้ำจะชนบ่อยจนช้า จึงสลับกองทั้งหมดแทน
  if (size <= POOL_LIMIT) {
    return sample(
      Array.from({ length: size }, (_, i) => min + i),
      count,
      rng,
    );
  }

  // ช่วงกว้างมากแต่ขอไม่เกิน MAX_DRAW ตัว โอกาสชนต่ำมาก จึงสุ่มแล้วกันซ้ำ ไม่ต้องกองอาร์เรย์ล้านช่อง
  const seen = new Set<number>();
  const out: number[] = [];
  while (out.length < count) {
    const value = randomInt(rng, min, max);
    if (seen.has(value)) continue;
    seen.add(value);
    out.push(value);
  }
  return out;
}

export interface DiceResult {
  rolls: number[];
  total: number;
}

export function rollDice(diceCount: number, sides: number, rng: Rng): DiceResult {
  if (!Number.isInteger(diceCount) || diceCount < 1) throw new Error('จำนวนลูกเต๋าต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  if (diceCount > MAX_DICE) throw new Error(`ทอยได้ครั้งละไม่เกิน ${MAX_DICE} ลูก`);
  if (!Number.isInteger(sides) || sides < 2) throw new Error('ลูกเต๋าต้องมีอย่างน้อย 2 หน้า');
  if (sides > MAX_DICE_SIDES) throw new Error(`ลูกเต๋ามีได้มากที่สุด ${MAX_DICE_SIDES} หน้า`);

  const rolls = Array.from({ length: diceCount }, () => randomInt(rng, 1, sides));
  return { rolls, total: rolls.reduce((sum, r) => sum + r, 0) };
}

export type CoinSide = 'หัว' | 'ก้อย';

export function flipCoins(count: number, rng: Rng): CoinSide[] {
  if (!Number.isInteger(count) || count < 1) throw new Error('จำนวนครั้งต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');
  if (count > MAX_DRAW) throw new Error(`โยนได้ครั้งละไม่เกิน ${MAX_DRAW} ครั้ง`);
  return Array.from({ length: count }, () => (randomInt(rng, 0, 1) === 0 ? 'หัว' : 'ก้อย'));
}
