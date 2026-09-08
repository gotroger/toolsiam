/**
 * ชนิดข้อมูลของ vertical หวย/สลากกินแบ่งรัฐบาล (§8 หมวด lottery)
 *
 * แยก "โครงสร้างรางวัล" (PrizeSpec — กติกาที่เปลี่ยนนาน ๆ ครั้ง) ออกจาก
 * "ผลของงวดหนึ่ง ๆ" (PrizeResult) โดยตั้งใจ: เงินรางวัลบางงวดต่างจากโครงสร้าง
 * มาตรฐาน (เช่น งวดพิเศษ) จึงเก็บ `amount` ไว้ที่ผลของงวดด้วย ไม่ใช่ที่กติกาอย่างเดียว
 */

export type PrizeId =
  | 'first' | 'near-first' | 'second' | 'third' | 'fourth' | 'fifth'
  | 'front-three' | 'last-three' | 'last-two';

/** เทียบเลขรางวัลกับส่วนไหนของเลขสลาก 6 หลัก */
export type MatchMode = 'full' | 'front' | 'back';

export interface PrizeSpec {
  id: PrizeId;
  /** ชื่อรางวัลตามประกาศ */
  label: string;
  /** จำนวนหลักของเลขรางวัล */
  digits: number;
  match: MatchMode;
  /** จำนวนรางวัลตามโครงสร้างมาตรฐาน — ใช้ตรวจความครบของข้อมูลงวด */
  count: number;
  /** เงินรางวัลต่อ 1 รางวัลตามโครงสร้างมาตรฐาน (บาท) */
  amount: number;
  /** ลำดับการแสดงผล */
  order: number;
}

/** ผลรางวัลหนึ่งประเภทของงวดหนึ่ง */
export interface PrizeResult {
  id: PrizeId;
  /** เงินรางวัลต่อ 1 รางวัล "ของงวดนี้" (บาท) */
  amount: number;
  /** เลขรางวัล เก็บเป็นสตริงเสมอเพราะเลขนำหน้าด้วย 0 ได้ */
  numbers: string[];
}

/** ที่มาของข้อมูลงวด — ทุกงวดต้องอ้างประกาศได้ ไม่มีข้อมูลลอย (§17) */
export interface DrawSource {
  name: string;
  url: string;
  /** วันที่คนกรอกตรวจตัวเลขกับประกาศจริง (YYYY-MM-DD) */
  verifiedAt: string;
}

export interface Draw {
  /** วันที่ออกรางวัล YYYY-MM-DD — เป็น id ของงวดและเป็นส่วนหนึ่งของ URL */
  date: string;
  results: PrizeResult[];
  source: DrawSource;
}

/** รางวัลหนึ่งใบที่เลขสลากใบหนึ่งถูก */
export interface TicketPrize {
  id: PrizeId;
  label: string;
  /** เลขรางวัลที่ตรงกัน (2, 3 หรือ 6 หลักแล้วแต่ประเภท) */
  number: string;
  amount: number;
}

export interface TicketResult {
  /** เลขสลาก 6 หลักที่ตรวจ */
  ticket: string;
  prizes: TicketPrize[];
  /** เงินรางวัลรวมก่อนหักอากรแสตมป์ */
  total: number;
}
