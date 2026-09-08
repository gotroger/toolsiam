import { parseIsoDate } from '@/lib/date';
import { draws as rawDraws } from './data/draws';
import { getPrizeSpec, PRIZE_SPECS } from './prizes';
import type { Draw, PrizeResult } from './types';
import { TICKET_DIGITS } from './check';

/**
 * เลขข้างเคียงรางวัลที่ 1 = เลขที่มากกว่าและน้อยกว่ารางวัลที่ 1 อยู่ 1
 * วนรอบที่ 6 หลัก: ข้างเคียงของ 000000 คือ 999999 กับ 000001
 */
export function deriveNearFirst(first: string): string[] {
  const size = 10 ** TICKET_DIGITS;
  const n = Number(first);
  const pad = (v: number) => String((v + size) % size).padStart(TICKET_DIGITS, '0');
  return [pad(n - 1), pad(n + 1)];
}

/** เติมรางวัลข้างเคียงให้อัตโนมัติเมื่อข้อมูลงวดไม่ได้กรอกไว้ */
function withDerived(draw: Draw): Draw {
  const first = draw.results.find((r) => r.id === 'first');
  const hasNear = draw.results.some((r) => r.id === 'near-first');
  if (!first || hasNear || first.numbers.length !== 1) return draw;
  const spec = getPrizeSpec('near-first');
  const near: PrizeResult = { id: 'near-first', amount: spec.amount, numbers: deriveNearFirst(first.numbers[0]) };
  return { ...draw, results: [...draw.results, near] };
}

/** ทุกงวดที่มีข้อมูล เรียงจากงวดล่าสุดไปเก่าสุด */
export function listDraws(): Draw[] {
  return rawDraws.map(withDerived).sort((a, b) => b.date.localeCompare(a.date));
}

export function hasDrawData(): boolean {
  return rawDraws.length > 0;
}

export function latestDraw(): Draw | undefined {
  return listDraws()[0];
}

export function getDraw(date: string): Draw | undefined {
  return listDraws().find((d) => d.date === date);
}

/** งวดก่อนหน้า/ถัดไปตามวันที่ ใช้ทำลิงก์เดินหน้า-ถอยหลังในหน้าผลรางวัล */
export function adjacentDraws(date: string): { previous?: Draw; next?: Draw } {
  const all = listDraws();
  const i = all.findIndex((d) => d.date === date);
  if (i < 0) return {};
  return { previous: all[i + 1], next: all[i - 1] };
}

/** ปีที่มีข้อมูล เรียงจากใหม่ไปเก่า — ใช้จัดกลุ่มหน้างวดย้อนหลัง */
export function drawYears(): number[] {
  return [...new Set(listDraws().map((d) => Number(d.date.slice(0, 4))))].sort((a, b) => b - a);
}

export function drawsInYear(year: number): Draw[] {
  return listDraws().filter((d) => d.date.startsWith(`${year}-`));
}

/**
 * ตรวจความถูกต้องของข้อมูลงวดหนึ่ง — คืนรายการข้อผิดพลาดทั้งหมด (ว่าง = ผ่าน)
 *
 * ใช้ในเทสต์ ไม่ใช่ตอน runtime: ข้อมูลผิดต้องหยุดที่ CI ไม่ใช่ให้ผู้ใช้เห็นหน้าพัง
 */
export function validateDraw(draw: Draw): string[] {
  const errors: string[] = [];
  const at = (msg: string) => errors.push(`งวด ${draw.date}: ${msg}`);

  try {
    parseIsoDate(draw.date);
  } catch {
    at('วันที่ออกรางวัลไม่ถูกต้อง (ต้องเป็น YYYY-MM-DD และมีอยู่จริง)');
  }

  const seen = new Set<string>();
  for (const result of draw.results) {
    if (seen.has(result.id)) at(`มีรางวัล ${result.id} ซ้ำ`);
    seen.add(result.id);

    const spec = PRIZE_SPECS.find((s) => s.id === result.id);
    if (!spec) {
      at(`ไม่รู้จักประเภทรางวัล ${result.id}`);
      continue;
    }
    if (result.amount <= 0) at(`${spec.label}: เงินรางวัลต้องมากกว่า 0`);
    if (result.numbers.length !== spec.count) {
      at(`${spec.label}: ต้องมี ${spec.count} เลข แต่มี ${result.numbers.length}`);
    }
    if (new Set(result.numbers).size !== result.numbers.length) at(`${spec.label}: มีเลขซ้ำ`);
    for (const n of result.numbers) {
      if (!new RegExp(`^\\d{${spec.digits}}$`).test(n)) {
        at(`${spec.label}: "${n}" ต้องเป็นตัวเลข ${spec.digits} หลัก`);
      }
    }
  }

  if (!seen.has('first')) at('ต้องมีรางวัลที่ 1');
  if (!draw.source.name.trim() || !draw.source.url.trim()) at('ต้องระบุที่มาของข้อมูล');
  if (!draw.source.verifiedAt.trim()) at('ต้องระบุวันที่ตรวจข้อมูลกับประกาศจริง');

  return errors;
}
