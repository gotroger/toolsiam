import type { PrizeId, PrizeSpec } from './types';

/**
 * โครงสร้างรางวัลสลากกินแบ่งรัฐบาลที่ใช้อยู่ปัจจุบัน (§17.1 — ข้อมูลอ้างอิงต้องมีที่มา)
 *
 * ตัวเลขในไฟล์นี้เป็น "กติกา" ที่เปลี่ยนนาน ๆ ครั้ง ส่วนเงินรางวัลจริงของแต่ละงวด
 * เก็บซ้ำอยู่ใน `PrizeResult.amount` ของงวดนั้น — งวดพิเศษที่จ่ายไม่เท่ามาตรฐาน
 * จึงแสดงผลถูกต้องโดยไม่ต้องแก้ไฟล์นี้
 *
 * ก่อน launch: ตรวจ `amount`/`count` ทุกบรรทัดกับประกาศสำนักงานสลากกินแบ่งรัฐบาล
 * แล้วอัปเดต PRIZE_STRUCTURE_SOURCE.verifiedAt
 */
export const PRIZE_SPECS: PrizeSpec[] = [
  { id: 'first',       label: 'รางวัลที่ 1',                  digits: 6, match: 'full',  count: 1,   amount: 6_000_000, order: 1 },
  { id: 'near-first',  label: 'รางวัลข้างเคียงรางวัลที่ 1',   digits: 6, match: 'full',  count: 2,   amount: 100_000,   order: 2 },
  { id: 'second',      label: 'รางวัลที่ 2',                  digits: 6, match: 'full',  count: 5,   amount: 200_000,   order: 3 },
  { id: 'third',       label: 'รางวัลที่ 3',                  digits: 6, match: 'full',  count: 10,  amount: 80_000,    order: 4 },
  { id: 'fourth',      label: 'รางวัลที่ 4',                  digits: 6, match: 'full',  count: 50,  amount: 40_000,    order: 5 },
  { id: 'fifth',       label: 'รางวัลที่ 5',                  digits: 6, match: 'full',  count: 100, amount: 20_000,    order: 6 },
  { id: 'front-three', label: 'รางวัลเลขหน้า 3 ตัว',          digits: 3, match: 'front', count: 2,   amount: 4_000,     order: 7 },
  { id: 'last-three',  label: 'รางวัลเลขท้าย 3 ตัว',          digits: 3, match: 'back',  count: 2,   amount: 4_000,     order: 8 },
  { id: 'last-two',    label: 'รางวัลเลขท้าย 2 ตัว',          digits: 2, match: 'back',  count: 1,   amount: 2_000,     order: 9 },
];

export const PRIZE_STRUCTURE_SOURCE = {
  name: 'สำนักงานสลากกินแบ่งรัฐบาล',
  url: 'https://www.glo.or.th/',
  /** ยังไม่ได้ตรวจกับประกาศจริง — ต้องตรวจและแก้วันที่นี้ก่อน launch */
  verifiedAt: '',
} as const;

const byId = new Map<PrizeId, PrizeSpec>(PRIZE_SPECS.map((s) => [s.id, s]));

export function getPrizeSpec(id: PrizeId): PrizeSpec {
  const spec = byId.get(id);
  if (!spec) throw new Error(`ไม่รู้จักประเภทรางวัล: ${id}`);
  return spec;
}

/** เรียงตามลำดับที่ประกาศ ไม่ใช่ลำดับที่คนกรอกพิมพ์ */
export function sortByPrizeOrder<T extends { id: PrizeId }>(items: T[]): T[] {
  return [...items].sort((a, b) => getPrizeSpec(a.id).order - getPrizeSpec(b.id).order);
}

/** จำนวนเงินรางวัลรวมทั้งงวดตามโครงสร้างมาตรฐาน (ใช้เป็นเนื้อหาในหน้า landing) */
export function totalPrizePool(): number {
  return PRIZE_SPECS.reduce((sum, s) => sum + s.amount * s.count, 0);
}
