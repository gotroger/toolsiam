import { PRIZE_STRUCTURE, TICKET_DIGITS, type LotteryDraw, type PrizeSpec } from '@/data/lottery/schema';

/**
 * ตรวจรางวัลสลากกินแบ่งรัฐบาล — ฟังก์ชันบริสุทธิ์ล้วน ทำงานฝั่งเบราว์เซอร์ 100% (§28.1 ข้อ 5)
 *
 * หมายเลขสลากถูกเก็บเป็นสตริงตลอดทาง ไม่แปลงเป็นตัวเลขแม้แต่ครั้งเดียว
 * เพราะเลขศูนย์นำหน้าคือส่วนหนึ่งของหมายเลข — "012345" ไม่ใช่ 12345
 */

export interface TicketWin {
  prize: PrizeSpec;
  /** เลขที่ถูกรางวัล (ตรงกับหมายเลขทั้งหมด หรือเป็นเลขหน้า/เลขท้าย) */
  matched: string;
  amount: number;
}

export interface TicketResult {
  ticket: string;
  wins: TicketWin[];
  totalAmount: number;
}

export class InvalidTicketError extends Error {}

/**
 * แปลงเลขไทย (๐–๙) และเลขเต็มความกว้าง (０–９) เป็นเลขอารบิก
 * แป้นพิมพ์ไทยบนมือถือพิมพ์เลขไทยได้ง่าย และข้อความที่คัดลอกมาจากบางแอปเป็นเลขเต็มความกว้าง
 */
function toAsciiDigits(input: string): string {
  return input
    .replace(/[\u0E50-\u0E59]/g, (d) => String(d.charCodeAt(0) - 0x0e50))
    .replace(/[\uFF10-\uFF19]/g, (d) => String(d.charCodeAt(0) - 0xff10));
}

/** ตัดช่องว่างและขีดที่ผู้ใช้พิมพ์ติดมา แล้วตรวจว่าเป็นหมายเลขสลากที่ใช้ได้ */
export function normalizeTicket(input: string): string {
  const cleaned = toAsciiDigits(input).replace(/[\s-]/g, '');
  if (cleaned === '') throw new InvalidTicketError('กรุณากรอกหมายเลขสลาก');
  if (!/^\d+$/.test(cleaned)) throw new InvalidTicketError('หมายเลขสลากต้องเป็นตัวเลขเท่านั้น');
  if (cleaned.length !== TICKET_DIGITS) {
    throw new InvalidTicketError(`หมายเลขสลากต้องมี ${TICKET_DIGITS} หลัก (กรอกมา ${cleaned.length} หลัก)`);
  }
  return cleaned;
}

function matches(ticket: string, prizeNumber: string, spec: PrizeSpec): boolean {
  switch (spec.match) {
    case 'full': return ticket === prizeNumber;
    case 'prefix3': return ticket.slice(0, 3) === prizeNumber;
    case 'suffix3': return ticket.slice(-3) === prizeNumber;
    case 'suffix2': return ticket.slice(-2) === prizeNumber;
  }
}

/**
 * ตรวจสลากหนึ่งใบกับผลงวดหนึ่งงวด
 *
 * สลากหนึ่งใบถูกได้หลายรางวัลพร้อมกัน เช่น ถูกรางวัลที่ 1 แล้วเลขท้าย 2 ตัวก็ตรงด้วย
 * จึงคืนทุกรางวัลที่ถูกและรวมเงินทั้งหมด ตามที่สำนักงานสลากฯ จ่ายจริง
 */
export function checkTicket(ticket: string, draw: LotteryDraw): TicketResult {
  const normalized = normalizeTicket(ticket);
  const wins: TicketWin[] = [];

  for (const spec of PRIZE_STRUCTURE) {
    for (const prizeNumber of draw.prizes[spec.id]) {
      if (matches(normalized, prizeNumber, spec)) {
        wins.push({ prize: spec, matched: prizeNumber, amount: spec.amount });
      }
    }
  }

  return {
    ticket: normalized,
    wins,
    totalAmount: wins.reduce((sum, w) => sum + w.amount, 0),
  };
}

/**
 * แยกข้อความในช่องกรอกเป็นรายใบ — คั่นด้วยการขึ้นบรรทัดใหม่ จุลภาค อัฒภาค หรือเว้นวรรคก็ได้
 *
 * ยกเว้นบรรทัดที่ตัดช่องว่างและขีดออกแล้วเหลือ 6 หลักพอดี เช่น "12 34 56" ซึ่งคือสลากใบเดียว
 * ที่พิมพ์เว้นเป็นกลุ่มตามที่พิมพ์บนตัวสลาก — แยกเป็นสามใบจะได้ error ที่ผู้ใช้งง
 * คืนข้อความตามที่ผู้ใช้พิมพ์ (ไม่ normalize) เพื่อให้ข้อความ error อ้างถึงสิ่งที่เขาเห็นในช่องกรอก
 */
export function parseTicketInput(text: string): string[] {
  const out: string[] = [];
  for (const chunk of text.split(/[\r\n,;]+/)) {
    const line = chunk.trim();
    if (line === '') continue;
    const tokens = line.split(/\s+/);
    const joined = toAsciiDigits(line).replace(/[\s-]/g, '');
    if (tokens.length > 1 && joined.length !== TICKET_DIGITS) out.push(...tokens);
    else out.push(line);
  }
  return out;
}

/** ตรวจหลายใบพร้อมกัน — ใบที่รูปแบบผิดจะถูกรายงานแยก ไม่ทำให้ทั้งชุดล้ม */
export interface BulkCheckResult {
  results: TicketResult[];
  errors: { input: string; message: string }[];
  totalAmount: number;
}

export function checkTickets(inputs: string[], draw: LotteryDraw): BulkCheckResult {
  const results: TicketResult[] = [];
  const errors: { input: string; message: string }[] = [];

  for (const input of inputs) {
    if (input.trim() === '') continue;
    try {
      results.push(checkTicket(input, draw));
    } catch (e) {
      errors.push({ input: input.trim(), message: (e as Error).message });
    }
  }

  return { results, errors, totalAmount: results.reduce((s, r) => s + r.totalAmount, 0) };
}
