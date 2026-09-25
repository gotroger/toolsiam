/**
 * ตัวเชื่อมกับ API ของสำนักงานสลากกินแบ่งรัฐบาล
 *
 * เขียนเป็น `.mjs` พร้อม JSDoc โดยตั้งใจ เพราะต้องถูกเรียกจากสามที่ที่รันคนละ runtime:
 *   - `scripts/fetch-lottery.mjs`  (node ธรรมดา)
 *   - Cloudflare Worker            (ผ่าน vite)
 *   - vitest
 * ถ้าเขียนแยกกันสองชุด วันที่ GLO เปลี่ยนรูปแบบข้อมูลจะแก้ที่เดียวแล้วอีกที่เงียบ ๆ พัง
 *
 * ⚠️ endpoint เหล่านี้เป็นสิ่งที่หน้าเว็บของสำนักงานสลากฯ เรียกใช้เอง ไม่ใช่ public API
 * ที่ประกาศ จึงไม่มีการรับประกันความเสถียรหรือรูปแบบข้อมูล (§28.2)
 */

export const GLO_BASE = 'https://www.glo.or.th';
export const GLO_PERIOD_LIST = `${GLO_BASE}/api/lottery/getPeriodList`;
export const GLO_RESULT_BY_DATE = `${GLO_BASE}/api/checking/getLotteryResult`;
/** หน้าที่ผู้ใช้เปิดดูประกาศได้จริง ใช้เป็น sourceUrl ของทุกงวด */
export const GLO_SOURCE_PAGE = `${GLO_BASE}/mission/reward-payment/check-reward`;

/** ชื่อรางวัลใน API → ชื่อใน schema ของเรา พร้อมจำนวนรางวัลที่กฎหมายกำหนด */
export const PRIZE_MAP = [
  ['first', 'first', 1],
  ['near1', 'firstNear', 2],
  ['second', 'second', 5],
  ['third', 'third', 10],
  ['fourth', 'fourth', 50],
  ['fifth', 'fifth', 100],
  ['last3f', 'threeDigitFront', 2],
  ['last3b', 'threeDigitBack', 2],
  ['last2', 'twoDigitBack', 1],
];

/**
 * เวลาสูงสุดที่รอ API ของ GLO ต่อหนึ่งคำขอ
 * วันหวยออกเซิร์ฟเวอร์ของสำนักงานสลากฯ ช้าได้มาก ถ้าไม่ตัด คำขอที่ค้างจะกิน wall time ของ cron ทั้งรอบ
 */
export const GLO_TIMEOUT_MS = 10_000;

/** รางวัลของสลากตัวเลขสามหลัก (N3) และจำนวนหลักที่ต้องมี */
export const N3_MAP = [
  ['straight3', 3],
  ['shuffle3', 3],
  ['straight2', 2],
  ['special', 12],
];

/**
 * @typedef {{ price: number, numbers: string[] }} N3PrizeResult
 * @typedef {{
 *   drawDate: string,
 *   prizes: Record<string, string[]>,
 *   n3?: Record<string, N3PrizeResult>,
 *   sourceUrl: string,
 *   enteredAt: string,
 *   status: 'validated' | 'verified',
 * }} LotteryDrawShape
 */

/**
 * เรียก API ของ GLO — โยน error เมื่อรูปแบบไม่เป็นไปตามที่คาด แทนที่จะคืนค่าครึ่ง ๆ กลาง ๆ
 * @param {string} url
 * @param {unknown} [body]
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<any>}
 */
export async function postGlo(url, body, fetchImpl = fetch) {
  const res = await fetchImpl(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(GLO_TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`${url} ตอบ HTTP ${res.status}`);
  const json = await res.json();
  if (json?.statusCode !== 200) throw new Error(`${url} ตอบ statusCode ${json?.statusCode}`);
  return json.response;
}

/**
 * รายการวันที่ของทุกงวดที่ API มี — ปกติเรียงจากใหม่ไปเก่า แต่ **ห้ามพึ่งลำดับนี้**
 * ให้เลือกงวดผ่าน `latestPeriodOnOrBefore` / `recentPeriods` ซึ่งเรียงเองเสมอ
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<string[]>}
 */
export async function fetchPeriodList(fetchImpl = fetch) {
  const response = await postGlo(GLO_PERIOD_LIST, undefined, fetchImpl);
  const list = response?.list;
  if (!Array.isArray(list) || list.length === 0) throw new Error('getPeriodList ไม่คืนรายการงวด');
  for (const d of list) {
    if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      throw new Error(`รูปแบบวันที่จาก API ไม่ใช่ YYYY-MM-DD: ${d}`);
    }
  }
  return list;
}

/**
 * งวดใหม่สุดที่ถึงวันออกรางวัลแล้ว (≤ วันนี้ตามเวลาไทย)
 * ไม่เชื่อลำดับของ API และข้ามงวดในอนาคตที่ API อาจใส่มาล่วงหน้า
 * @param {string[]} periods
 * @param {string} today YYYY-MM-DD
 * @returns {string | undefined}
 */
export function latestPeriodOnOrBefore(periods, today) {
  return recentPeriods(periods, 1, today)[0];
}

/**
 * N งวดล่าสุดที่ถึงวันออกรางวัลแล้ว เรียงจากใหม่ไปเก่า
 * @param {string[]} periods
 * @param {number} limit
 * @param {string} today YYYY-MM-DD
 * @returns {string[]}
 */
export function recentPeriods(periods, limit, today) {
  return [...new Set(periods)]
    .filter((d) => d <= today)
    .sort((a, b) => b.localeCompare(a))
    .slice(0, limit);
}

/**
 * ผลรางวัลดิบของงวดที่ระบุ
 * @param {string} drawDate YYYY-MM-DD
 * @param {typeof fetch} [fetchImpl]
 * @returns {Promise<any>}
 */
export async function fetchRawResult(drawDate, fetchImpl = fetch) {
  const [year, month, date] = drawDate.split('-');
  const response = await postGlo(GLO_RESULT_BY_DATE, { date, month, year }, fetchImpl);
  const result = response?.result;
  if (!result) throw new Error(`งวด ${drawDate}: API ไม่คืน result`);
  if (result.date !== drawDate) {
    throw new Error(`งวด ${drawDate}: API คืนข้อมูลของวันที่ ${result.date} — ไม่ตรงกับที่ขอ`);
  }
  return result;
}

/**
 * แปลงรูปแบบของ API เป็น schema ของเรา พร้อมตรวจทุกอย่างที่ตรวจได้ระหว่างทาง
 *
 * `status` ต้องส่งเข้ามาเสมอ ไม่มีค่าเริ่มต้น เพราะกฎ L1 ของแผนกำหนดว่าข้อมูลที่ระบบดึงเอง
 * โดยไม่มีคนอยู่ในลูปห้ามเป็น `verified` — การบังคับให้ผู้เรียกระบุเองทำให้ลืมไม่ได้
 *
 * @param {string} drawDate
 * @param {any} result
 * @param {{ status: 'validated' | 'verified', enteredAt: string }} opts
 * @returns {LotteryDrawShape}
 */
export function toDraw(drawDate, result, opts) {
  /** @type {Record<string, string[]>} */
  const prizes = {};
  for (const [apiKey, ourKey, expected] of PRIZE_MAP) {
    const group = result?.data?.[apiKey];
    if (!group) throw new Error(`งวด ${drawDate}: API ไม่มีรางวัล ${apiKey}`);
    const numbers = (group.number ?? []).map((/** @type {any} */ n) => n.value);
    if (numbers.length !== expected) {
      throw new Error(`งวด ${drawDate}: ${apiKey} ควรมี ${expected} รางวัล แต่ API ให้มา ${numbers.length}`);
    }
    for (const value of numbers) {
      if (typeof value !== 'string') throw new Error(`งวด ${drawDate}: ${apiKey} มีค่าที่ไม่ใช่สตริง`);
    }
    // เรียงเลขให้คงที่ ผลลัพธ์จะได้ไม่เปลี่ยนเมื่อ API สลับลำดับ (API ใส่ round มาไม่เรียง)
    prizes[ourKey] = [...numbers].sort();
  }

  /** @type {LotteryDrawShape} */
  const draw = {
    drawDate,
    prizes,
    sourceUrl: GLO_SOURCE_PAGE,
    enteredAt: opts.enteredAt,
    status: opts.status,
  };

  const n3 = toN3(drawDate, result?.n3);
  if (n3) draw.n3 = n3;
  return draw;
}

/**
 * แปลงรางวัลสลากตัวเลขสามหลัก (N3)
 *
 * - ไม่มี n3 หรือเป็นอ็อบเจกต์ว่าง (`{}`) → งวดนั้นไม่มี N3 ซึ่งถูกต้อง ไม่ใช่ข้อผิดพลาด
 * - มี n3 แต่ไม่ครบหรือรูปแบบผิด → **ตัด N3 ทิ้งแล้ว log** ไม่โยน error
 *   เพราะผลทยอยออกทีละรางวัล และ N3 เป็นสลากคนละใบ — ไม่ควรทำให้ผลสลาก 6 หลักที่ครบแล้วถูกทิ้งไปด้วย
 *   (Worker จะดึงซ้ำเองในรอบถัดไปเมื่องวดที่เก็บไว้ยังไม่มี N3)
 *
 * @param {string} drawDate
 * @param {any} raw
 * @returns {Record<string, N3PrizeResult> | undefined}
 */
export function toN3(drawDate, raw) {
  if (!raw || typeof raw !== 'object') return undefined;
  const hasAnyNumber = N3_MAP.some(([key]) => Array.isArray(raw[key]?.number) && raw[key].number.length > 0);
  if (!hasAnyNumber) return undefined;

  /** @type {Record<string, N3PrizeResult>} */
  const out = {};
  /** @type {string[]} */
  const problems = [];
  for (const [key, digits] of N3_MAP) {
    const group = raw[key];
    if (!group) {
      problems.push(`ขาดรางวัล ${key}`);
      continue;
    }
    const price = Number(group.price);
    if (!Number.isFinite(price) || price <= 0) problems.push(`${key} เงินรางวัลไม่ถูกต้อง (${group.price})`);
    const numbers = (group.number ?? []).map((/** @type {any} */ n) => n.value);
    if (numbers.length === 0) problems.push(`${key} ไม่มีเลขรางวัล`);
    for (const value of numbers) {
      if (typeof value !== 'string' || !new RegExp(`^\\d{${digits}}$`).test(value)) {
        problems.push(`${key} มีค่า "${value}" ที่ไม่ใช่ตัวเลข ${digits} หลัก`);
      }
    }
    out[key] = { price, numbers: [...numbers].sort() };
  }

  if (problems.length > 0) {
    console.warn(`[glo-api] งวด ${drawDate}: ตัด N3 ทิ้งเพราะยังไม่ครบหรือรูปแบบผิด — ${problems.join(' · ')}`);
    return undefined;
  }
  return out;
}

/**
 * ดึงและแปลงงวดหนึ่งงวดในขั้นตอนเดียว
 * @param {string} drawDate
 * @param {{ status: 'validated' | 'verified', enteredAt: string, fetchImpl?: typeof fetch }} opts
 * @returns {Promise<LotteryDrawShape>}
 */
export async function fetchDraw(drawDate, opts) {
  const result = await fetchRawResult(drawDate, opts.fetchImpl ?? fetch);
  return toDraw(drawDate, result, { status: opts.status, enteredAt: opts.enteredAt });
}
