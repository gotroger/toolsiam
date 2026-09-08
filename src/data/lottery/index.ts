import { assertValidDraw, type LotteryDraw } from './schema';

/**
 * รวมทุกงวดจากไฟล์ JSON ในโฟลเดอร์นี้ (§28.1 ข้อ 3)
 *
 * `import.meta.glob` แบบ eager ทำให้ไฟล์ที่เพิ่มเข้ามาถูกรวมเองโดยไม่ต้องแก้โค้ด
 * และ validator ถูกเรียกตอน build — ข้อมูลที่ผิดรูปทำให้ build ล้มทันที
 * ไม่ใช่หลุดขึ้น production แล้วค่อยเจอ
 */
const files = import.meta.glob<{ default: unknown }>('./*.json', { eager: true });

/** ทุกงวดเรียงจากใหม่ไปเก่า */
export const DRAWS: LotteryDraw[] = Object.entries(files)
  .map(([path, mod]) => {
    try {
      return assertValidDraw(mod.default);
    } catch (e) {
      throw new Error(`${path}: ${(e as Error).message}`);
    }
  })
  .sort((a, b) => b.drawDate.localeCompare(a.drawDate));

/**
 * มีข้อมูลงวดพอจะเปิดหน้า /lottery หรือยัง
 *
 * หน้าหวยทั้งหมดถูก build เมื่อค่านี้เป็น true เท่านั้น ตามหลักเดียวกับหมวด `planned` (§8.4)
 * — หน้าเปล่าที่ยังไม่มีข้อมูลไม่ควรขึ้น production ให้ผู้ใช้และ crawler เจอ
 */
export const HAS_DRAWS = DRAWS.length > 0;

export function latestDraw(): LotteryDraw | undefined {
  return DRAWS[0];
}

export function drawByDate(date: string): LotteryDraw | undefined {
  return DRAWS.find((d) => d.drawDate === date);
}

/** งวดทั้งหมดจัดกลุ่มตามปี ค.ศ. เรียงจากใหม่ไปเก่า — ใช้กับหน้า archive */
export function drawsByYear(): { year: number; draws: LotteryDraw[] }[] {
  const groups = new Map<number, LotteryDraw[]>();
  for (const d of DRAWS) {
    const year = Number(d.drawDate.slice(0, 4));
    const list = groups.get(year) ?? [];
    list.push(d);
    groups.set(year, list);
  }
  return [...groups.entries()]
    .map(([year, draws]) => ({ year, draws }))
    .sort((a, b) => b.year - a.year);
}
