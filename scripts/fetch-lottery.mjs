// ดึงผลสลากกินแบ่งรัฐบาลจาก API ของสำนักงานสลากฯ แล้วเขียนเป็นไฟล์ JSON ตาม schema ของเรา
//
//   node scripts/fetch-lottery.mjs            ดึงงวดที่ยังไม่มีไฟล์ ย้อนหลังสูงสุด 24 งวด
//   node scripts/fetch-lottery.mjs --all      ดึงทุกงวดที่ API มี
//   node scripts/fetch-lottery.mjs --limit=8  จำกัดจำนวนงวด
//   node scripts/fetch-lottery.mjs --force    ดึงทับไฟล์ที่มีอยู่แล้ว
//
// ⚠️ endpoint เหล่านี้เป็นสิ่งที่หน้าเว็บของสำนักงานสลากฯ เรียกใช้เอง **ไม่ใช่ public API ที่ประกาศ**
// จึงไม่มีการรับประกันความเสถียรหรือรูปแบบข้อมูล (§28.2) — สคริปต์นี้จึงตรวจทุกอย่างที่ตรวจได้
// ก่อนเขียนไฟล์ และหยุดทันทีเมื่อเจอสิ่งที่ไม่คาด แทนที่จะเขียนข้อมูลครึ่ง ๆ กลาง ๆ ลงไป

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'data', 'lottery');
const BASE = 'https://www.glo.or.th';
const PERIOD_LIST = `${BASE}/api/lottery/getPeriodList`;
const BY_DATE = `${BASE}/api/checking/getLotteryResult`;
/** หน้าที่ผู้ใช้เปิดดูประกาศได้จริง ใช้เป็น sourceUrl ของทุกงวด */
const SOURCE_PAGE = `${BASE}/mission/reward-payment/check-reward`;

/** เว้นจังหวะระหว่างคำขอ ไม่ยิงรัวใส่เซิร์ฟเวอร์ของหน่วยงานรัฐ */
const DELAY_MS = 700;
const DEFAULT_LIMIT = 24;

/** ชื่อรางวัลใน API → ชื่อใน schema ของเรา พร้อมจำนวนรางวัลที่ต้องได้ */
const PRIZE_MAP = [
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

/** รางวัลของสลากตัวเลขสามหลัก (N3) — เงินรางวัลไม่คงที่ จึงเก็บต่องวด */
const N3_KEYS = ['straight3', 'shuffle3', 'straight2', 'special'];
/** จำนวนหลักที่แต่ละรางวัล N3 ต้องมี */
const N3_DIGITS = { straight3: 3, shuffle3: 3, straight2: 2, special: 12 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${url} ตอบ HTTP ${res.status}`);
  const json = await res.json();
  if (json.statusCode !== 200) throw new Error(`${url} ตอบ statusCode ${json.statusCode}`);
  return json.response;
}

async function fetchPeriodList() {
  const response = await post(PERIOD_LIST);
  const list = response?.list;
  if (!Array.isArray(list) || list.length === 0) throw new Error('getPeriodList ไม่คืนรายการงวด');
  for (const d of list) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new Error(`รูปแบบวันที่จาก API ไม่ใช่ YYYY-MM-DD: ${d}`);
  }
  return list;
}

async function fetchDraw(drawDate) {
  const [year, month, date] = drawDate.split('-');
  const response = await post(BY_DATE, { date, month, year });
  const result = response?.result;
  if (!result) throw new Error(`งวด ${drawDate}: API ไม่คืน result`);
  if (result.date !== drawDate) {
    throw new Error(`งวด ${drawDate}: API คืนข้อมูลของวันที่ ${result.date} — ไม่ตรงกับที่ขอ`);
  }
  return toDraw(drawDate, result);
}

/** แปลงรูปแบบของ API เป็น schema ของเรา พร้อมตรวจทุกอย่างที่ตรวจได้ระหว่างทาง */
function toDraw(drawDate, result) {
  const prizes = {};
  for (const [apiKey, ourKey, expected] of PRIZE_MAP) {
    const group = result.data?.[apiKey];
    if (!group) throw new Error(`งวด ${drawDate}: API ไม่มีรางวัล ${apiKey}`);
    const numbers = (group.number ?? []).map((n) => n.value);
    if (numbers.length !== expected) {
      throw new Error(`งวด ${drawDate}: ${apiKey} ควรมี ${expected} รางวัล แต่ API ให้มา ${numbers.length}`);
    }
    for (const value of numbers) {
      if (typeof value !== 'string') throw new Error(`งวด ${drawDate}: ${apiKey} มีค่าที่ไม่ใช่สตริง`);
    }
    // เรียงเลขให้คงที่ ไฟล์จะได้ไม่เปลี่ยนเมื่อ API สลับลำดับ (API ใส่ round มาไม่เรียง)
    prizes[ourKey] = [...numbers].sort();
  }

  const draw = {
    drawDate,
    prizes,
    sourceUrl: SOURCE_PAGE,
    enteredAt: new Date().toISOString().slice(0, 10),
    // ดึงจาก API ทางการของสำนักงานสลากฯ โดยตรง ไม่มีขั้นตอนพิมพ์ด้วยมือให้ผิดพลาด
    // และ validator ตรวจความสอดคล้องภายในซ้ำอีกชั้น จึงถือเป็น verified
    status: 'verified',
  };

  const n3 = toN3(drawDate, result.n3);
  if (n3) draw.n3 = n3;
  return draw;
}

/**
 * แปลงรางวัลสลากตัวเลขสามหลัก (N3)
 * งวดก่อนที่ N3 จะเริ่มขายไม่มีส่วนนี้ ซึ่งถูกต้อง ไม่ใช่ข้อผิดพลาด
 */
function toN3(drawDate, raw) {
  if (!raw) return undefined;
  const out = {};
  for (const key of N3_KEYS) {
    const group = raw[key];
    if (!group) throw new Error(`งวด ${drawDate}: n3 มีอยู่แต่ขาดรางวัล ${key}`);
    const price = Number(group.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`งวด ${drawDate}: n3.${key} เงินรางวัลไม่ถูกต้อง (${group.price})`);
    }
    const numbers = (group.number ?? []).map((n) => n.value);
    if (numbers.length === 0) throw new Error(`งวด ${drawDate}: n3.${key} ไม่มีเลขรางวัล`);
    for (const value of numbers) {
      if (typeof value !== 'string' || !new RegExp(`^\\d{${N3_DIGITS[key]}}$`).test(value)) {
        throw new Error(`งวด ${drawDate}: n3.${key} มีค่า "${value}" ที่ไม่ใช่ตัวเลข ${N3_DIGITS[key]} หลัก`);
      }
    }
    out[key] = { price, numbers: [...numbers].sort() };
  }
  return out;
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const all = args.includes('--all');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : all ? Infinity : DEFAULT_LIMIT;

  mkdirSync(OUT_DIR, { recursive: true });
  const periods = await fetchPeriodList();
  console.log(`API มีงวดทั้งหมด ${periods.length} งวด · จะดึงสูงสุด ${limit === Infinity ? 'ทั้งหมด' : limit} งวด`);

  let written = 0;
  let skipped = 0;
  const failures = [];

  for (const drawDate of periods) {
    if (written >= limit) break;
    const file = join(OUT_DIR, `${drawDate}.json`);
    if (existsSync(file) && !force) {
      skipped++;
      continue;
    }
    try {
      const draw = await fetchDraw(drawDate);
      writeFileSync(file, `${JSON.stringify(draw, null, 2)}\n`);
      console.log(`✓ ${drawDate}  รางวัลที่ 1 = ${draw.prizes.first[0]}`);
      written++;
    } catch (e) {
      // งวดเดียวพังไม่ควรทำให้ทั้งชุดหยุด แต่ต้องรายงานให้ครบตอนจบ
      console.error(`✗ ${drawDate}  ${e.message}`);
      failures.push(drawDate);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nเขียนใหม่ ${written} งวด · ข้ามที่มีอยู่แล้ว ${skipped} งวด · ล้มเหลว ${failures.length} งวด`);
  if (failures.length > 0) {
    console.error(`งวดที่ล้มเหลว: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
  console.log('\nขั้นตอนถัดไป: npm test (validator จะตรวจไฟล์ทั้งหมด) แล้วตรวจสุ่มเทียบกับประกาศก่อน deploy');
}

main().catch((e) => {
  console.error(`\nดึงข้อมูลไม่สำเร็จ: ${e.message}`);
  process.exitCode = 1;
});
