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
  /** จำนวนรางวัล */
  count: number;
  /** เงินรางวัลต่อหนึ่งรางวัล (บาท) */
  amount: number;
  /** เทียบกับเลขท้าย / เลขหน้า แทนที่จะเทียบทั้งหมายเลข */
  match: 'full' | 'prefix3' | 'suffix3' | 'suffix2';
  /**
   * กลุ่มการแสดงผลตามที่ประกาศทางการจัดวาง — ไม่ใช่ลำดับการตรวจรางวัล
   * headline = สี่ช่องบนสุดที่คนดูก่อนเสมอ · major = รางวัลที่เหลือเรียงตามลำดับรางวัล
   */
  displayGroup: 'headline' | 'major';
}

/**
 * โครงสร้างรางวัลที่ใช้อยู่ปัจจุบัน
 *
 * ⚠️ จำนวนรางวัลและเงินรางวัลเป็นสิ่งที่เปลี่ยนได้โดยประกาศของสำนักงานสลากฯ
 * ถ้าโครงสร้างเปลี่ยน ต้องเพิ่มชุดใหม่พร้อม `effectiveFrom` ไม่ใช่แก้ทับของเดิม
 * เพราะงวดเก่าต้องยังตรวจด้วยโครงสร้างที่ใช้ ณ งวดนั้น
 */
export const PRIZE_STRUCTURE: PrizeSpec[] = [
  { id: 'first', name: 'รางวัลที่ 1', digits: 6, count: 1, amount: 6_000_000, match: 'full', displayGroup: 'headline' },
  { id: 'threeDigitFront', name: 'รางวัลเลขหน้า 3 ตัว', digits: 3, count: 2, amount: 4_000, match: 'prefix3', displayGroup: 'headline' },
  { id: 'threeDigitBack', name: 'รางวัลเลขท้าย 3 ตัว', digits: 3, count: 2, amount: 4_000, match: 'suffix3', displayGroup: 'headline' },
  { id: 'twoDigitBack', name: 'รางวัลเลขท้าย 2 ตัว', digits: 2, count: 1, amount: 2_000, match: 'suffix2', displayGroup: 'headline' },
  { id: 'firstNear', name: 'รางวัลข้างเคียงรางวัลที่ 1', digits: 6, count: 2, amount: 100_000, match: 'full', displayGroup: 'major' },
  { id: 'second', name: 'รางวัลที่ 2', digits: 6, count: 5, amount: 200_000, match: 'full', displayGroup: 'major' },
  { id: 'third', name: 'รางวัลที่ 3', digits: 6, count: 10, amount: 80_000, match: 'full', displayGroup: 'major' },
  { id: 'fourth', name: 'รางวัลที่ 4', digits: 6, count: 50, amount: 40_000, match: 'full', displayGroup: 'major' },
  { id: 'fifth', name: 'รางวัลที่ 5', digits: 6, count: 100, amount: 20_000, match: 'full', displayGroup: 'major' },
];

/** รางวัลเรียงตามที่ประกาศทางการจัดวางบนหน้าเว็บ */
export const HEADLINE_PRIZES = PRIZE_STRUCTURE.filter((p) => p.displayGroup === 'headline');
export const MAJOR_PRIZES = PRIZE_STRUCTURE.filter((p) => p.displayGroup === 'major');

/* ------------------------------------------------------------------ *
 * สลากตัวเลขสามหลัก (N3) — คนละใบกับสลากกินแบ่ง 6 หลัก
 * ------------------------------------------------------------------ */

export type N3PrizeId = 'straight3' | 'shuffle3' | 'straight2' | 'special';

export interface N3PrizeSpec {
  id: N3PrizeId;
  name: string;
  digits: number;
  /** คำอธิบายว่ารางวัลนี้ตัดสินอย่างไร */
  note: string;
}

/**
 * โครงสร้างรางวัลของสลาก N3
 *
 * ⚠️ ต่างจากสลากกินแบ่ง 6 หลักตรงที่ **เงินรางวัลไม่คงที่** เป็นการแบ่งเงินรางวัลตามยอดขาย
 * และเปลี่ยนทุกงวด (เคยพบตั้งแต่ 380 ถึง 5,801 บาทสำหรับรางวัลเดียวกัน)
 * เงินรางวัลจึงเก็บไว้ที่ข้อมูลรายงวด ไม่ใช่ในโครงสร้างนี้
 *
 * ⚠️ จำนวนรางวัลสามสลับหลักก็ไม่คงที่ ขึ้นกับว่าเลขสามตรงมีตัวเลขซ้ำหรือไม่
 * (209 สลับได้ 5 แบบ · 212 สลับได้ 2 แบบ) — validator คำนวณจำนวนที่ถูกต้องเองได้
 */
export const N3_PRIZE_STRUCTURE: N3PrizeSpec[] = [
  { id: 'straight3', name: 'รางวัลสามตรง', digits: 3, note: 'เลข 3 หลักตรงตำแหน่ง' },
  { id: 'shuffle3', name: 'รางวัลสามสลับหลัก', digits: 3, note: 'เลขชุดเดียวกับสามตรงแต่สลับตำแหน่ง' },
  { id: 'straight2', name: 'รางวัลสองตรง', digits: 2, note: 'เลข 2 หลักท้ายตรงตำแหน่ง' },
  { id: 'special', name: 'รางวัลพิเศษ', digits: 12, note: 'หมายเลขสลากเต็มที่ได้รับรางวัลพิเศษ' },
];

export interface N3PrizeResult {
  /** เงินรางวัลต่อหนึ่งรางวัลของงวดนั้น (บาท) — เปลี่ยนทุกงวด */
  price: number;
  numbers: string[];
}

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
  /**
   * ผลรางวัลสลากตัวเลขสามหลัก (N3) ของงวดนั้น
   * optional เพราะงวดก่อนที่ N3 จะเริ่มขาย (พบว่าถึงราวปี 2566) ไม่มีข้อมูลส่วนนี้
   */
  n3?: Record<N3PrizeId, N3PrizeResult>;
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

  validateN3(draw.n3, issues);
  return issues;
}

/** การเรียงสับเปลี่ยนที่ไม่ซ้ำกันทั้งหมดของสตริงตัวเลข */
export function distinctPermutations(value: string): string[] {
  if (value.length <= 1) return [value];
  const out = new Set<string>();
  for (let i = 0; i < value.length; i++) {
    const rest = value.slice(0, i) + value.slice(i + 1);
    for (const p of distinctPermutations(rest)) out.add(value[i] + p);
  }
  return [...out];
}

/**
 * รางวัลสามสลับหลักที่ถูกต้องของเลขสามตรงหนึ่งค่า
 * = การเรียงสับเปลี่ยนทั้งหมดที่ไม่ซ้ำกัน ยกเว้นตัวเลขเดิม (ซึ่งเป็นรางวัลสามตรงไปแล้ว)
 * เลขที่มีตัวซ้ำอย่าง 212 จึงได้ 2 รางวัล ส่วนเลขที่ไม่ซ้ำอย่าง 209 ได้ 5 รางวัล
 */
export function expectedShuffle3(straight3: string): string[] {
  return distinctPermutations(straight3).filter((v) => v !== straight3).sort();
}

function validateN3(n3: unknown, issues: string[]): void {
  if (n3 === undefined) return; // งวดก่อน N3 เริ่มขายไม่มีส่วนนี้ ถือว่าถูกต้อง
  if (typeof n3 !== 'object' || n3 === null) {
    issues.push('n3 ต้องเป็นอ็อบเจกต์ หรือไม่มีเลยถ้างวดนั้นยังไม่มีสลาก N3');
    return;
  }
  const groups = n3 as Record<string, unknown>;

  for (const spec of N3_PRIZE_STRUCTURE) {
    const group = groups[spec.id] as Partial<N3PrizeResult> | undefined;
    if (!group || typeof group !== 'object') {
      issues.push(`n3.${spec.id} (${spec.name}) ไม่มีข้อมูล`);
      continue;
    }
    if (typeof group.price !== 'number' || !Number.isFinite(group.price) || group.price <= 0) {
      issues.push(`${spec.name}: เงินรางวัลต้องเป็นตัวเลขมากกว่า 0`);
    }
    if (!Array.isArray(group.numbers) || group.numbers.length === 0) {
      issues.push(`${spec.name}: numbers ต้องเป็น array ที่มีอย่างน้อยหนึ่งรายการ`);
      continue;
    }
    for (const n of group.numbers) {
      if (typeof n !== 'string' || !new RegExp(`^\\d{${spec.digits}}$`).test(n)) {
        issues.push(`${spec.name}: "${String(n)}" ต้องเป็นตัวเลข ${spec.digits} หลักในรูปสตริง`);
      }
    }
  }

  // สามสลับหลักต้องเป็นการสลับตำแหน่งของสามตรงพอดี — ตรวจอัตโนมัติได้ทั้งชุดและจำนวน
  const straight = (groups.straight3 as N3PrizeResult | undefined)?.numbers?.[0];
  const shuffle = (groups.shuffle3 as N3PrizeResult | undefined)?.numbers;
  if (typeof straight === 'string' && /^\d{3}$/.test(straight) && Array.isArray(shuffle)) {
    const expected = expectedShuffle3(straight);
    const got = [...shuffle].sort();
    if (JSON.stringify(got) !== JSON.stringify(expected)) {
      issues.push(
        `รางวัลสามสลับหลักของเลข ${straight} ต้องเป็น ${expected.join(' ')} (${expected.length} รางวัล) แต่พบ ${got.join(' ')}`,
      );
    }
  }
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
