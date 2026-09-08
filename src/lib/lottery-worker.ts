import { assertValidDraw, type LotteryDraw } from '@/data/lottery/schema';
import { fetchPeriodList, fetchRawResult, toDraw } from '@/lib/glo-api.mjs';

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

/** key เดียวใน KV เก็บ JSON ก้อนเดียว ~2 KB ไม่มีข้อมูลผู้ใช้ ไม่มี login */
export const KV_KEY = 'latest-draw';

export interface StoredDraw {
  draw: LotteryDraw;
  /** เวลาที่ Worker ดึงข้อมูลสำเร็จ (ISO) */
  fetchedAt: string;
}

/** ผลของการทำงานหนึ่งรอบ — คืนเป็นค่าเพื่อให้ทดสอบได้โดยไม่ต้องอ่าน log */
export type SyncOutcome =
  | { action: 'disabled' }
  | { action: 'skipped'; reason: string }
  | { action: 'stored'; drawDate: string }
  | { action: 'rejected'; drawDate: string; issues: string[] }
  | { action: 'failed'; error: string };

export interface SyncDeps {
  env: LotteryEnv;
  /** งวดใหม่สุดที่ถูก build เข้าไฟล์ static แล้ว */
  newestStaticDate: string | undefined;
  fetchImpl?: typeof fetch;
  now?: Date;
}

/**
 * ดึงงวดใหม่จาก GLO แล้วเก็บลง KV ถ้าผ่านการตรวจ
 *
 * กฎที่บังคับไว้ในฟังก์ชันนี้:
 * - **L1** ข้อมูลที่ดึงเองโดยไม่มีคนอยู่ในลูป เก็บได้สูงสุดแค่ `validated` เท่านั้น
 * - **L3** ถ้างวดที่ดึงมาไม่ใหม่กว่าไฟล์ใน repo ก็ไม่ต้องเก็บ เพราะ static ชนะอยู่แล้ว
 * - ข้อมูลที่ validator ไม่ผ่าน **ไม่เขียนทับของเดิมใน KV** — ของเก่าที่ถูกต้องมีค่ากว่าของใหม่ที่ผิด
 */
export async function syncLatestDraw(deps: SyncDeps): Promise<SyncOutcome> {
  const { env, newestStaticDate } = deps;
  if (env.LOTTERY_AUTO !== 'on') return { action: 'disabled' };

  const now = deps.now ?? new Date();
  const enteredAt = now.toISOString().slice(0, 10);

  try {
    const stored = await readStored(env);
    const periods = await fetchPeriodList(deps.fetchImpl);
    const latestDate = periods[0];

    // ไฟล์ใน repo ชนะ KV เสมอ (L3) — ถ้า static ตามทันแล้วก็ไม่ต้องเก็บอะไรเพิ่ม
    if (newestStaticDate !== undefined && latestDate <= newestStaticDate) {
      return { action: 'skipped', reason: `งวด ${latestDate} มีในไฟล์ static แล้ว` };
    }
    // ดึงซ้ำงวดเดิมไม่ได้อะไรเพิ่ม — early exit ตาม §28.4 ทำให้ cron ส่วนใหญ่ไม่ยิงออกนอกเลย
    if (stored?.draw.drawDate === latestDate) {
      return { action: 'skipped', reason: `งวด ${latestDate} อยู่ใน KV แล้ว` };
    }

    // แยกสองขั้นตอนโดยตั้งใจ เพื่อให้ log บอกได้ว่าเป็นคนละเรื่องกัน:
    //   ดึงไม่ได้        = API หรือเครือข่ายมีปัญหา  → failed
    //   ดึงได้แต่ไม่ครบ  = ผลทยอยออกทีละรางวัล ปกติ → rejected แล้วรอ cron รอบถัดไป
    const raw = await fetchRawResult(latestDate, deps.fetchImpl);

    let draw: LotteryDraw;
    try {
      // status ต้องเป็น validated เท่านั้น — cron ไม่มีคนอยู่ในลูป (L1)
      draw = assertValidDraw(toDraw(latestDate, raw, { status: 'validated', enteredAt }));
    } catch (e) {
      return { action: 'rejected', drawDate: latestDate, issues: [(e as Error).message] };
    }

    const payload: StoredDraw = { draw, fetchedAt: now.toISOString() };
    await env.LOTTERY.put(KV_KEY, JSON.stringify(payload));
    return { action: 'stored', drawDate: latestDate };
  } catch (e) {
    return { action: 'failed', error: (e as Error).message };
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
