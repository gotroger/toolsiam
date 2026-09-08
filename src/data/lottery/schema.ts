/**
 * โครงสร้างและตัวตรวจข้อมูลผลสลากกินแบ่งรัฐบาล (§28.1)
 *
 * **ผลรางวัลเป็นข้อเท็จจริง ไม่ใช่งานอันมีลิขสิทธิ์** จึงนำมาแสดงได้ แต่ต้องอ้างอิงแหล่งเสมอ
 * แหล่งทางการเดียวคือสำนักงานสลากกินแบ่งรัฐบาล (glo.or.th)
 *
 * ⚠️ ไฟล์นี้ตรวจ "รูปร่าง" ของข้อมูลเท่านั้น ตรวจไม่ได้ว่าเลขที่กรอกตรงกับประกาศจริงหรือไม่
 * ขั้นตอนตรวจซ้ำด้วยสายตาสองรอบก่อน commit จึงเป็นส่วนหนึ่งของกระบวนการ ไม่ใช่ทางเลือก
 */

export type PrizeId =
  | 'first' | 'firstNear' | 'second' | 'third' | 'fourth' | 'fifth'
  | 'threeDigitFront' | 'threeDigitBack' | 'twoDigitBack';

export interface PrizeSpec {
  id: PrizeId;
  name: string;
  /** จำนวนหลักของเลขในรางวัลนี้ */
  digits: number;
  /** จำนวนรางวัล — null = ผันแปร (รางวัลข้างเคียงขึ้นกับเลขรางวัลที่ 1) */
  count: number;
  /** เงินรางวัลต่อหนึ่งรางวัล (บาท) */
  amount: number;
  /** เทียบกับเลขท้าย / เลขหน้า แทนที่จะเทียบทั้งหมายเลข */
  match: 'full' | 'prefix3' | 'suffix3' | 'suffix2';
}

/**
 * โครงสร้างรางวัลที่ใช้อยู่ปัจจุบัน
 *
 * ⚠️ จำนวนรางวัลและเงินรางวัลเป็นสิ่งที่เปลี่ยนได้โดยประกาศของสำนักงานสลากฯ
 * ถ้าโครงสร้างเปลี่ยน ต้องเพิ่มชุดใหม่พร้อม `effectiveFrom` ไม่ใช่แก้ทับของเดิม
 * เพราะงวดเก่าต้องยังตรวจด้วยโครงสร้างที่ใช้ ณ งวดนั้น
 */
export const PRIZE_STRUCTURE: PrizeSpec[] = [
  { id: 'first', name: 'รางวัลที่ 1', digits: 6, count: 1, amount: 6_000_000, match: 'full' },
  { id: 'firstNear', name: 'รางวัลข้างเคียงรางวัลที่ 1', digits: 6, count: 2, amount: 100_000, match: 'full' },
  { id: 'second', name: 'รางวัลที่ 2', digits: 6, count: 5, amount: 200_000, match: 'full' },
  { id: 'third', name: 'รางวัลที่ 3', digits: 6, count: 10, amount: 80_000, match: 'full' },
  { id: 'fourth', name: 'รางวัลที่ 4', digits: 6, count: 50, amount: 40_000, match: 'full' },
  { id: 'fifth', name: 'รางวัลที่ 5', digits: 6, count: 100, amount: 20_000, match: 'full' },
  { id: 'threeDigitFront', name: 'รางวัลเลขหน้า 3 ตัว', digits: 3, count: 2, amount: 4_000, match: 'prefix3' },
  { id: 'threeDigitBack', name: 'รางวัลเลขท้าย 3 ตัว', digits: 3, count: 2, amount: 4_000, match: 'suffix3' },
  { id: 'twoDigitBack', name: 'รางวัลเลขท้าย 2 ตัว', digits: 2, count: 1, amount: 2_000, match: 'suffix2' },
];

export const PRIZE_BY_ID: Record<PrizeId, PrizeSpec> = Object.fromEntries(
  PRIZE_STRUCTURE.map((p) => [p.id, p]),
) as Record<PrizeId, PrizeSpec>;

/** จำนวนหลักของหมายเลขสลาก */
export const TICKET_DIGITS = 6;

export type DrawStatus = 'validated' | 'verified';

export interface LotteryDraw {
  /** วันที่ออกรางวัลในรูป YYYY-MM-DD */
  drawDate: string;
  /** ผลรางวัลแต่ละประเภท — key ต้องครบทุก PrizeId */
  prizes: Record<PrizeId, string[]>;
  /** URL ประกาศของสำนักงานสลากฯ ที่ใช้อ้างอิงตอนกรอก */
  sourceUrl: string;
  /** วันที่คนกรอกตรวจกับประกาศ */
  enteredAt: string;
  /**
   * validated = ผ่าน validator แล้ว · verified = มีคนตรวจซ้ำกับประกาศด้วยสายตาแล้ว
   * ข้อมูลที่ยังไม่ verified ต้องแสดงป้ายกำกับให้ผู้ใช้เห็น (§28.3)
   */
  status: DrawStatus;
}

export class DrawValidationError extends Error {
  constructor(public readonly issues: string[]) {
    super(`ข้อมูลงวดไม่ถูกต้อง:\n- ${issues.join('\n- ')}`);
    this.name = 'DrawValidationError';
  }
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * ตรวจข้อมูลงวดหนึ่งงวดให้ครบทุกด้านที่ตรวจได้โดยอัตโนมัติ
 *
 * คืนรายการปัญหาทั้งหมดในครั้งเดียว ไม่หยุดที่ข้อแรก — คนกรอกจะได้แก้รอบเดียวจบ
 */
export function validateDrawIssues(input: unknown): string[] {
  const issues: string[] = [];
  if (typeof input !== 'object' || input === null) return ['ข้อมูลงวดต้องเป็นอ็อบเจกต์'];
  const draw = input as Partial<LotteryDraw>;

  if (typeof draw.drawDate !== 'string' || !ISO_DATE.test(draw.drawDate)) {
    issues.push('drawDate ต้องเป็นรูปแบบ YYYY-MM-DD');
  }
  if (typeof draw.sourceUrl !== 'string' || !draw.sourceUrl.includes('glo.or.th')) {
    issues.push('sourceUrl ต้องชี้ไปที่ประกาศบน glo.or.th ซึ่งเป็นแหล่งทางการเดียว');
  }
  if (typeof draw.enteredAt !== 'string' || !ISO_DATE.test(draw.enteredAt)) {
    issues.push('enteredAt ต้องเป็นรูปแบบ YYYY-MM-DD');
  }
  if (draw.status !== 'validated' && draw.status !== 'verified') {
    issues.push("status ต้องเป็น 'validated' หรือ 'verified'");
  }

  const prizes = draw.prizes;
  if (typeof prizes !== 'object' || prizes === null) {
    issues.push('prizes ต้องเป็นอ็อบเจกต์ที่มีครบทุกประเภทรางวัล');
    return issues;
  }

  for (const spec of PRIZE_STRUCTURE) {
    const numbers = (prizes as Record<string, unknown>)[spec.id];
    if (!Array.isArray(numbers)) {
      issues.push(`prizes.${spec.id} ต้องเป็น array ของสตริงตัวเลข`);
      continue;
    }
    if (numbers.length !== spec.count) {
      issues.push(`${spec.name} ต้องมี ${spec.count} รางวัล แต่พบ ${numbers.length}`);
    }
    for (const n of numbers) {
      if (typeof n !== 'string' || !new RegExp(`^\\d{${spec.digits}}$`).test(n)) {
        issues.push(`${spec.name}: "${String(n)}" ต้องเป็นตัวเลข ${spec.digits} หลักในรูปสตริง (ห้ามตัดเลขศูนย์นำหน้า)`);
      }
    }
    // เลขซ้ำในรางวัลเดียวกันแทบทุกกรณีคือพิมพ์ผิด ไม่ใช่ผลจริง
    const unique = new Set(numbers.filter((n): n is string => typeof n === 'string'));
    if (unique.size !== numbers.length) {
      issues.push(`${spec.name} มีเลขซ้ำกันในประเภทเดียวกัน — ตรวจการพิมพ์อีกครั้ง`);
    }
  }

  // รางวัลข้างเคียงต้องเป็นเลขก่อนหน้าและถัดจากรางวัลที่ 1 พอดี ซึ่งเป็นกฎที่ตรวจอัตโนมัติได้
  const first = Array.isArray(prizes.first) ? prizes.first[0] : undefined;
  const near = Array.isArray(prizes.firstNear) ? prizes.firstNear : undefined;
  if (typeof first === 'string' && /^\d{6}$/.test(first) && near?.length === 2) {
    const expected = neighboursOf(first);
    const got = [...near].sort();
    if (JSON.stringify(got) !== JSON.stringify([...expected].sort())) {
      issues.push(`รางวัลข้างเคียงต้องเป็น ${expected.join(' และ ')} ตามรางวัลที่ 1 (${first}) แต่พบ ${near.join(' และ ')}`);
    }
  }

  return issues;
}

/** เลขก่อนหน้าและถัดจากรางวัลที่ 1 — วนรอบที่ 000000 และ 999999 */
export function neighboursOf(first: string): [string, string] {
  const n = Number(first);
  const wrap = (v: number) => String((v + 1_000_000) % 1_000_000).padStart(6, '0');
  return [wrap(n - 1), wrap(n + 1)];
}

/** โยน error ถ้าข้อมูลไม่ผ่าน — ใช้ตอน build เพื่อไม่ให้ข้อมูลผิดหลุดขึ้น production */
export function assertValidDraw(input: unknown): LotteryDraw {
  const issues = validateDrawIssues(input);
  if (issues.length > 0) throw new DrawValidationError(issues);
  return input as LotteryDraw;
}
