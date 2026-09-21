import { shuffle, type Rng } from '@/lib/random';

/** เพดานจำนวนกลุ่ม — มากกว่านี้ผลลัพธ์อ่านบนหน้าจอไม่ไหว */
export const MAX_GROUPS = 100;

export type GroupMode = 'byCount' | 'bySize';

export interface GroupOptions {
  /** byCount = กำหนดจำนวนกลุ่ม · bySize = กำหนดจำนวนคนต่อกลุ่ม */
  mode: GroupMode;
  value: number;
}

export function makeGroups(items: readonly string[], { mode, value }: GroupOptions, rng: Rng): string[][] {
  if (items.length === 0) throw new Error('ยังไม่มีรายชื่อให้แบ่ง พิมพ์รายชื่อบรรทัดละ 1 คน');
  if (!Number.isInteger(value) || value < 1) throw new Error('ตัวเลขที่กรอกต้องเป็นจำนวนเต็มตั้งแต่ 1 ขึ้นไป');

  const shuffled = shuffle(items, rng);

  if (mode === 'byCount') {
    if (value > items.length) {
      throw new Error(`มี ${items.length} คน จึงแบ่งได้มากที่สุด ${items.length} กลุ่ม โดยไม่มีกลุ่มว่าง`);
    }
    if (value > MAX_GROUPS) throw new Error(`แบ่งได้มากที่สุด ${MAX_GROUPS} กลุ่ม`);

    // แจกเศษให้กลุ่มแรก ๆ กลุ่มละคน ขนาดกลุ่มจึงต่างกันไม่เกิน 1 คนเสมอ
    const base = Math.floor(items.length / value);
    const remainder = items.length % value;
    const groups: string[][] = [];
    let cursor = 0;
    for (let i = 0; i < value; i++) {
      const size = base + (i < remainder ? 1 : 0);
      groups.push(shuffled.slice(cursor, cursor + size));
      cursor += size;
    }
    return groups;
  }

  const groupCount = Math.ceil(items.length / value);
  if (groupCount > MAX_GROUPS) throw new Error(`แบ่งแล้วได้ ${groupCount} กลุ่ม เกินเพดาน ${MAX_GROUPS} กลุ่ม`);

  const groups: string[][] = [];
  for (let cursor = 0; cursor < shuffled.length; cursor += value) {
    groups.push(shuffled.slice(cursor, cursor + value));
  }
  return groups;
}
