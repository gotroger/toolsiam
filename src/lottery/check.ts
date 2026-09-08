import type { Draw, TicketPrize, TicketResult } from './types';
import { getPrizeSpec, PRIZE_SPECS, sortByPrizeOrder } from './prizes';

/** ความยาวเลขสลากกินแบ่งรัฐบาล */
export const TICKET_DIGITS = 6;

const THAI_DIGITS = '๐๑๒๓๔๕๖๗๘๙';

/**
 * ตัดทุกอย่างที่ไม่ใช่ตัวเลขออก และแปลงเลขไทยเป็นเลขอารบิก
 *
 * ผู้ใช้พิมพ์มาได้หลายแบบ: "123 456", "123-456", "๑๒๓๔๕๖" — ทั้งหมดคือเลขเดียวกัน
 */
export function normalizeTicket(raw: string): string {
  let out = '';
  for (const ch of raw) {
    const thai = THAI_DIGITS.indexOf(ch);
    if (thai >= 0) out += String(thai);
    else if (ch >= '0' && ch <= '9') out += ch;
  }
  return out;
}

export function isValidTicket(ticket: string): boolean {
  return new RegExp(`^\\d{${TICKET_DIGITS}}$`).test(ticket);
}

export interface ParsedTickets {
  /** เลขที่ใช้ได้ ตัดตัวซ้ำออกแล้ว เรียงตามลำดับที่พิมพ์ */
  tickets: string[];
  /** ข้อความที่ตัดแล้วยังไม่ใช่เลข 6 หลัก — คืนกลับไปให้ผู้ใช้เห็นว่าตกไปเพราะอะไร */
  invalid: string[];
}

/**
 * แยกเลขสลากหลายใบจากข้อความเดียว (ขึ้นบรรทัดใหม่ เว้นวรรค หรือคอมมา)
 *
 * แต่ละ token ถูก normalize ก่อนตรวจความยาว จึงรับ "123-456" ได้
 * แต่ "123456 789012" ที่ติดกันเป็น token เดียวจะไม่ถูกยำรวมเป็นเลขเดียว
 */
export function parseTickets(raw: string): ParsedTickets {
  const tickets: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();

  for (const token of raw.split(/[\s,;|]+/)) {
    if (token.trim() === '') continue;
    const normalized = normalizeTicket(token);
    if (!isValidTicket(normalized)) {
      invalid.push(token.trim());
      continue;
    }
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tickets.push(normalized);
  }

  return { tickets, invalid };
}

/** ส่วนของเลขสลากที่ใช้เทียบกับรางวัลประเภทหนึ่ง */
export function ticketPart(ticket: string, id: TicketPrize['id']): string {
  const spec = getPrizeSpec(id);
  if (spec.match === 'front') return ticket.slice(0, spec.digits);
  if (spec.match === 'back') return ticket.slice(-spec.digits);
  return ticket;
}

/**
 * ตรวจสลาก 1 ใบกับผลงวดหนึ่ง
 *
 * ใบเดียวถูกได้หลายรางวัลพร้อมกัน (เช่น ถูกรางวัลที่ 1 และเลขท้าย 2 ตัวด้วย)
 * เพราะเป็นรางวัลคนละประเภทกัน — จึงรวมทุกประเภทที่ตรง ไม่ใช่หยุดที่รางวัลแรก
 */
export function checkTicket(draw: Draw, ticket: string): TicketResult {
  if (!isValidTicket(ticket)) throw new Error(`เลขสลากต้องเป็นตัวเลข ${TICKET_DIGITS} หลัก`);

  const prizes: TicketPrize[] = [];
  for (const spec of PRIZE_SPECS) {
    const result = draw.results.find((r) => r.id === spec.id);
    if (!result) continue;
    const part = ticketPart(ticket, spec.id);
    // ในหนึ่งประเภท เลขที่ตรงมีได้ใบละครั้งเดียว ต่อให้ข้อมูลงวดมีเลขซ้ำ
    const matched = result.numbers.find((n) => n === part);
    if (matched !== undefined) prizes.push({ id: spec.id, label: spec.label, number: matched, amount: result.amount });
  }

  return {
    ticket,
    prizes: sortByPrizeOrder(prizes),
    total: prizes.reduce((sum, p) => sum + p.amount, 0),
  };
}

export interface CheckSummary {
  /** ผลของทุกใบที่ตรวจ เรียงตามลำดับที่กรอก */
  results: TicketResult[];
  /** เฉพาะใบที่ถูกรางวัล */
  winners: TicketResult[];
  invalid: string[];
  /** เงินรางวัลรวมทุกใบ ก่อนหักอากรแสตมป์ */
  total: number;
}

/** ตรวจหลายใบจากข้อความที่ผู้ใช้วางมาทั้งก้อน */
export function checkTickets(draw: Draw, raw: string): CheckSummary {
  const { tickets, invalid } = parseTickets(raw);
  const results = tickets.map((t) => checkTicket(draw, t));
  const winners = results.filter((r) => r.prizes.length > 0);
  return { results, winners, invalid, total: winners.reduce((sum, r) => sum + r.total, 0) };
}
