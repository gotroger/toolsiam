import { addDays, daysBetweenDates } from '@/lib/date';

/**
 * ตรรกะว่า "ผลที่แสดงอยู่ยังใหม่พอหรือยัง" (§28.3 กฎ L5)
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพราะเป็นจุดที่ผิดแล้วผู้ใช้เสียหายจริง —
 * การแสดงผลงวดเก่าเงียบ ๆ ราวกับเป็นงวดล่าสุดในวันหวยออก แย่กว่าการไม่แสดงอะไรเลย
 */

/**
 * งวดสลากออกวันที่ 1 และ 16 ของทุกเดือน จึงห่างกัน 13–16 วัน
 * แต่มีงวดที่เลื่อนได้ เช่น 2 พ.ค. หรือ 17 ม.ค. ระยะห่างจึงยืดได้ถึงราว 16 วัน
 *
 * ใช้ 18 วันเป็นเกณฑ์ "น่าจะพลาดงวดไปแล้ว" — หลวมพอที่จะไม่เตือนผิดในงวดที่เลื่อน
 * และแน่นพอที่จะจับได้ก่อนข้อมูลเก่าจนน่าอาย · ชั้นนี้จงใจไม่ผูกกับปฏิทินวันประกาศ
 * เพราะวันเลื่อนเปลี่ยนได้ทุกปีและเราไม่มีแหล่งที่ยืนยันล่วงหน้า — การเตือนตามปฏิทินอยู่ที่
 * `drawFreshness` ซึ่งใช้เกณฑ์นี้เป็นตัวกันสุดท้าย
 */
export const STALE_AFTER_DAYS = 18;

/** ผลที่แสดงอยู่เก่าเกินไปจนน่าจะมีงวดใหม่แล้วหรือยัง */
export function isStale(latestDrawDate: string, today: string): boolean {
  const age = daysBetweenDates(latestDrawDate, today);
  return age > STALE_AFTER_DAYS;
}

/**
 * งวดตามกำหนด (1 และ 16) ที่มักเลื่อนออกไปหนึ่งวันเพราะตรงกับวันหยุด
 * — 1 ม.ค. ปีใหม่ · 16 ม.ค. วันครู · 1 พ.ค. วันแรงงาน (ข้อมูลจริง: 2 ม.ค. / 17 ม.ค. / 2 พ.ค. 2569)
 * งวดเหล่านี้ได้ช่วงผ่อนผันเพิ่มอีกหนึ่งวันก่อนเตือน
 */
const SHIFT_PRONE = new Set(['01-01', '01-16', '05-01']);

/**
 * งวดที่เลื่อนขึ้นมาออก **ก่อน** กำหนดได้ไม่กี่วัน (เช่น 30 ธ.ค. แทน 1 ม.ค.)
 * ข้อมูลที่ใหม่กว่า "วันตามกำหนด − 3 วัน" จึงนับว่าครอบคลุมงวดนั้นแล้ว
 */
const EARLY_SHIFT_DAYS = 3;

/** จำนวนวันหลังวันตามกำหนดที่เริ่มเตือนได้ — วันออกรางวัลเองผลยังไม่ออกเป็นเรื่องปกติ */
function graceDays(scheduled: string): number {
  return SHIFT_PRONE.has(scheduled.slice(5)) ? 2 : 1;
}

/** วันตามกำหนด (1 และ 16) ย้อนหลังจากวันที่ระบุ รวมวันนั้นเอง เรียงจากใหม่ไปเก่า */
function scheduledDrawsOnOrBefore(today: string): string[] {
  const [y, m] = today.split('-').map(Number);
  const prevY = m === 1 ? y - 1 : y;
  const prevM = m === 1 ? 12 : m - 1;
  const iso = (yy: number, mm: number, dd: number) =>
    `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
  return [iso(y, m, 16), iso(y, m, 1), iso(prevY, prevM, 16), iso(prevY, prevM, 1)].filter((d) => d <= today);
}

/**
 * งวดตามกำหนดล่าสุดที่ "ควรมีผลแล้ว" ณ วันนี้ — คือวันที่ 1 หรือ 16 ล่าสุดที่พ้นช่วงผ่อนผันแล้ว
 * ใช้วันที่ตามเวลาไทย (ผู้เรียกส่ง `todayInBangkok()` มา)
 */
export function expectedDrawBy(today: string): string {
  const candidates = scheduledDrawsOnOrBefore(today);
  for (const scheduled of candidates) {
    if (daysBetweenDates(scheduled, today) >= graceDays(scheduled)) return scheduled;
  }
  // ไม่เกิดขึ้นจริง — วันที่ 1 ของเดือนก่อนห่างจากวันนี้อย่างน้อย 28 วันเสมอ
  return candidates[candidates.length - 1];
}

export type Freshness =
  | { kind: 'fresh' }
  /** พ้นวันออกรางวัลตามกำหนดแล้วแต่ยังไม่มีผลงวดนั้น — อาจเป็นงวดที่เลื่อน จึงเตือนแบบนุ่มกว่า */
  | { kind: 'missed-draw'; expectedDate: string }
  /** เก่าเกิน `STALE_AFTER_DAYS` — ตัวกันสุดท้ายที่ไม่ขึ้นกับปฏิทิน */
  | { kind: 'stale' };

/**
 * สถานะความใหม่ของผลที่แสดงอยู่ (L5)
 *
 * สองชั้น: ชั้นแรกเทียบกับปฏิทินวันออกรางวัล (1 และ 16) จึงเตือนได้ตั้งแต่วันถัดจากวันออกรางวัล
 * ชั้นที่สองคือเกณฑ์ 18 วันเดิม ซึ่งยังใช้กันกรณีที่ปฏิทินพลาด
 */
export function drawFreshness(latestDrawDate: string, today: string): Freshness {
  if (isStale(latestDrawDate, today)) return { kind: 'stale' };
  const expected = expectedDrawBy(today);
  if (latestDrawDate < addDays(expected, -EARLY_SHIFT_DAYS)) return { kind: 'missed-draw', expectedDate: expected };
  return { kind: 'fresh' };
}

/**
 * ข้อมูลจาก KV ควรถูกนำมาแสดงแทนของ static หรือไม่
 *
 * ไฟล์ใน repo มีลำดับสูงกว่าเสมอ (L3) — KV ชนะได้เฉพาะเมื่อเป็นงวดที่ **ใหม่กว่า** เท่านั้น
 * งวดเดียวกันให้ใช้ของ static เพราะผ่านสายตาคนมาแล้ว
 */
export function shouldPreferRemote(staticDate: string | undefined, remoteDate: string): boolean {
  if (staticDate === undefined) return true;
  return remoteDate > staticDate;
}
