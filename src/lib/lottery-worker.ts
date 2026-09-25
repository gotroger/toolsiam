import { assertValidFetchedDraw, type LotteryDraw } from '@/data/lottery/schema';
import { fetchPeriodList, fetchRawResult, latestPeriodOnOrBefore, toDraw } from '@/lib/glo-api.mjs';
import { drawFreshness } from '@/lib/lottery-freshness';
import { daysBetweenDates } from '@/lib/date';
import { todayInBangkok } from '@/lib/today';

/**
 * ฝั่ง Worker ของระบบหวยอัตโนมัติ (§28.2)
 *
 * สถาปัตยกรรมสำคัญ: หน้า `/lottery/*` เป็น static asset ที่เสิร์ฟจาก edge อยู่แล้ว
 * และ **ทำงานได้ครบถ้วนโดยไม่ต้องมี Worker เลย** ส่วนนี้เป็นชั้นเสริมที่ทำให้เห็นงวดใหม่
 * ก่อนที่คนจะรัน `npm run lottery` และ deploy — ถ้าชั้นนี้ล่มทั้งหมด เว็บยังใช้งานได้เหมือนเดิม
 */

export interface LotteryEnv {
  LOTTERY: KVNamespace;
  /** kill switch — ต้องเป็น 'on' เท่านั้นจึงจะดึงข้อมูลอัตโนมัติ */
  LOTTERY_AUTO?: string;
}

/** key เดียวใน KV เก็บ JSON ก้อนเดียว ~2 KB ไม่มีข้อมูลผู้ใช้ (session ของสมาชิกอยู่คนละ namespace) */
export const KV_KEY = 'latest-draw';

/**
 * งวดสองงวดติดกันห่างกันอย่างน้อยราว 12 วันเสมอ (16 ก.พ. → 1 มี.ค. = 13 วัน และงวดที่เลื่อน ±1–2 วัน)
 * ถ้างวดใหม่สุดที่รู้จักออกมาไม่ถึง 10 วัน งวดถัดไปยังออกไม่ได้แน่นอน จึงจบรอบโดยไม่ยิงออกนอก
 */
export const MIN_DAYS_BEFORE_NEXT_DRAW = 10;

/** งวดที่เก็บไว้แล้วแต่ยังไม่มี N3 จะถูกดึงซ้ำภายในกี่วันหลังวันออกรางวัล — เกินนี้ถือว่างวดนั้นไม่มี N3 */
const N3_RETRY_DAYS = 1;

/**
 * รอบ cron สุดท้ายของวัน (13:30 UTC = 20:30 น. เวลาไทย) — ต้องตรงกับ `triggers.crons`
 * ใน `workers/lottery-cron/wrangler.jsonc` · รอบนี้จบแบบไม่ได้งวดใหม่คือสิ่งที่ต้อง alert
 */
export const LAST_RUN_UTC_HOUR = 13;

export interface StoredDraw {
  draw: LotteryDraw;
  /** เวลาที่ Worker ดึงข้อมูลสำเร็จ (ISO) */
  fetchedAt: string;
}

/** ผลของการทำงานหนึ่งรอบ — คืนเป็นค่าเพื่อให้ทดสอบได้โดยไม่ต้องอ่าน log */
export type SyncOutcome =
  | { action: 'disabled' }
  /** `known` = งวดใหม่สุดที่รู้จัก ณ จบรอบ ใช้ตัดสินว่าข้อมูลค้างจนต้อง alert หรือยัง */
  | { action: 'skipped'; reason: string; known?: string }
  | { action: 'stored'; drawDate: string; hasN3: boolean }
  | { action: 'rejected'; drawDate: string; issues: string[] }
  | { action: 'failed'; error: string };

export interface SyncDeps {
  env: LotteryEnv;
  /** งวดใหม่สุดที่ถูก build เข้าไฟล์ static แล้ว */
  newestStaticDate: string | undefined;
  fetchImpl?: typeof fetch;
  now?: Date;
}

const maxDate = (...dates: (string | undefined)[]) =>
  dates.filter((d): d is string => d !== undefined).sort().at(-1);

/** งวดที่เก็บไว้ยังควรดึงซ้ำเพื่อเติม N3 หรือไม่ */
function awaitingN3(stored: StoredDraw | null, today: string): boolean {
  return !!stored && !stored.draw.n3 && daysBetweenDates(stored.draw.drawDate, today) <= N3_RETRY_DAYS;
}

/**
 * ดึงงวดใหม่จาก GLO แล้วเก็บลง KV ถ้าผ่านการตรวจ
 *
 * กฎที่บังคับไว้ในฟังก์ชันนี้:
 * - **L1** ข้อมูลที่ดึงเองโดยไม่มีคนอยู่ในลูป เก็บได้สูงสุดแค่ `validated` เท่านั้น
 * - **L3** ถ้างวดที่ดึงมาไม่ใหม่กว่าไฟล์ใน repo ก็ไม่ต้องเก็บ เพราะ static ชนะอยู่แล้ว
 * - ข้อมูลที่ validator ไม่ผ่าน **ไม่เขียนทับของเดิมใน KV** — ของเก่าที่ถูกต้องมีค่ากว่าของใหม่ที่ผิด
 * - **early exit ก่อนยิงออกนอก** (§28.4) — อ่าน KV ก่อนเสมอ ถ้างวดใหม่สุดที่รู้จักยังใหม่เกินกว่าที่
 *   งวดถัดไปจะออกได้ ก็จบรอบทันที cron ที่ตื่นทุกวันจึงยิง GLO เฉพาะช่วงใกล้วันออกรางวัล
 */
export async function syncLatestDraw(deps: SyncDeps): Promise<SyncOutcome> {
  const { env, newestStaticDate } = deps;
  if (env.LOTTERY_AUTO !== 'on') return { action: 'disabled' };

  const now = deps.now ?? new Date();
  const enteredAt = now.toISOString().slice(0, 10);
  const today = todayInBangkok(now);

  try {
    const stored = await readStored(env);
    const knownBefore = maxDate(stored?.draw.drawDate, newestStaticDate);

    // ยังไม่ถึงเวลาที่งวดถัดไปจะออกได้ — จบโดยไม่ยิงออกนอก (ยกเว้นงวดที่เพิ่งเก็บยังรอ N3)
    if (
      knownBefore !== undefined &&
      daysBetweenDates(knownBefore, today) < MIN_DAYS_BEFORE_NEXT_DRAW &&
      !(stored?.draw.drawDate === knownBefore && awaitingN3(stored, today))
    ) {
      return { action: 'skipped', reason: `งวด ${knownBefore} ยังใหม่อยู่ งวดถัดไปยังไม่ถึงกำหนด`, known: knownBefore };
    }

    // ไม่เชื่อว่า periods[0] คืองวดล่าสุด — เลือกวันที่มากสุดที่ไม่เลยวันนี้ตามเวลาไทยเอง
    const latestDate = latestPeriodOnOrBefore(await fetchPeriodList(deps.fetchImpl), today);
    const known = maxDate(knownBefore, latestDate);
    if (latestDate === undefined) {
      return { action: 'skipped', reason: 'API ไม่มีงวดที่ถึงวันออกรางวัลแล้ว', known };
    }

    // ไฟล์ใน repo ชนะ KV เสมอ (L3) — ถ้า static ตามทันแล้วก็ไม่ต้องเก็บอะไรเพิ่ม
    if (newestStaticDate !== undefined && latestDate <= newestStaticDate) {
      return { action: 'skipped', reason: `งวด ${latestDate} มีในไฟล์ static แล้ว`, known };
    }
    const refillN3 = stored?.draw.drawDate === latestDate && awaitingN3(stored, today);
    if (stored && stored.draw.drawDate >= latestDate && !refillN3) {
      return { action: 'skipped', reason: `งวด ${latestDate} อยู่ใน KV แล้ว`, known };
    }

    // แยกสองขั้นตอนโดยตั้งใจ เพื่อให้ log บอกได้ว่าเป็นคนละเรื่องกัน:
    //   ดึงไม่ได้        = API หรือเครือข่ายมีปัญหา  → failed
    //   ดึงได้แต่ไม่ครบ  = ผลทยอยออกทีละรางวัล ปกติ → rejected แล้วรอ cron รอบถัดไป
    const raw = await fetchRawResult(latestDate, deps.fetchImpl);

    let draw: LotteryDraw;
    try {
      // status ต้องเป็น validated เท่านั้น — cron ไม่มีคนอยู่ในลูป (L1)
      const checked = assertValidFetchedDraw(toDraw(latestDate, raw, { status: 'validated', enteredAt }));
      draw = checked.draw;
      if (checked.droppedN3.length > 0) {
        console.warn(`[lottery-cron] งวด ${latestDate}: ตัด N3 ทิ้ง — ${checked.droppedN3.join(' · ')}`);
      }
    } catch (e) {
      return { action: 'rejected', drawDate: latestDate, issues: [(e as Error).message] };
    }

    // รอบดึงซ้ำเพื่อเติม N3 แต่ N3 ยังไม่ออก — ข้อมูลเหมือนเดิม ไม่ต้องเขียน KV ซ้ำ
    if (refillN3 && !draw.n3) {
      return { action: 'skipped', reason: `งวด ${latestDate} ยังไม่มี N3`, known };
    }

    const payload: StoredDraw = { draw, fetchedAt: now.toISOString() };
    await env.LOTTERY.put(KV_KEY, JSON.stringify(payload));
    return { action: 'stored', drawDate: latestDate, hasN3: draw.n3 !== undefined };
  } catch (e) {
    return { action: 'failed', error: (e as Error).message };
  }
}

/**
 * ระดับ log ของผลแต่ละรอบ — ให้ Workers logs / alert แยกรอบที่ผิดปกติออกจากรอบที่เงียบตามปกติได้
 *
 * - กลางหน้าต่าง: ผลทยอยออก ข้อมูลไม่ครบเป็นเรื่องปกติ (`info`) · API ล่มเป็น `warn`
 * - **รอบสุดท้ายของวัน**: งวดที่ API มีแล้วแต่เก็บไม่ได้ หรือ API ล่ม = `error`
 *   ข้อมูลใหม่สุดที่รู้จักเก่าเกินเกณฑ์ 18 วัน = `error` · พ้นวันออกรางวัลตามกำหนดแล้วยังไม่มีผล = `warn`
 *   (อาจเป็นงวดที่เลื่อนวัน จึงยังไม่ถึงขั้น error)
 */
export function outcomeSeverity(outcome: SyncOutcome, now: Date): 'info' | 'warn' | 'error' {
  const lastRun = now.getUTCHours() >= LAST_RUN_UTC_HOUR && now.getUTCHours() < 17;
  switch (outcome.action) {
    case 'disabled':
      return 'info';
    case 'stored':
      return outcome.hasN3 ? 'info' : 'warn';
    case 'rejected':
      return lastRun ? 'error' : 'info';
    case 'failed':
      return lastRun ? 'error' : 'warn';
    case 'skipped': {
      if (!lastRun || outcome.known === undefined) return 'info';
      const freshness = drawFreshness(outcome.known, todayInBangkok(now));
      if (freshness.kind === 'stale') return 'error';
      return freshness.kind === 'missed-draw' ? 'warn' : 'info';
    }
  }
}

export async function readStored(env: LotteryEnv): Promise<StoredDraw | null> {
  const raw = await env.LOTTERY.get(KV_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredDraw;
  } catch {
    // KV เสียหายไม่ควรทำให้ทั้งหน้าเว็บล่ม — ถือว่าไม่มีข้อมูลแล้วใช้ static ต่อ
    return null;
  }
}

/** วินาทีที่ให้ edge และเบราว์เซอร์ cache คำตอบ — วันหวยออกคือ traffic สูงสุดของเว็บ */
export const LATEST_MAX_AGE = 300;

/**
 * `GET /api/lottery/latest`
 *
 * ตอบ 204 เมื่อไม่มีข้อมูลใหม่กว่า static — ฝั่ง client จะได้ไม่ต้องแยกแยะ "ไม่มี" กับ "พัง"
 * และใช้ข้อมูล static ต่อไปเงียบ ๆ
 */
export async function handleLatest(env: LotteryEnv): Promise<Response> {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': `public, max-age=${LATEST_MAX_AGE}, s-maxage=${LATEST_MAX_AGE}`,
  };

  if (env.LOTTERY_AUTO !== 'on') return new Response(null, { status: 204, headers });

  const stored = await readStored(env);
  if (!stored) return new Response(null, { status: 204, headers });

  return new Response(JSON.stringify(stored), { status: 200, headers });
}
