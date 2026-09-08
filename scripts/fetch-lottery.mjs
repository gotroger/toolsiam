// ดึงผลสลากกินแบ่งรัฐบาลจาก API ของสำนักงานสลากฯ แล้วเขียนเป็นไฟล์ JSON ตาม schema ของเรา
//
//   npm run lottery                ดึงงวดที่ยังไม่มีไฟล์ ย้อนหลังสูงสุด 24 งวด
//   npm run lottery -- --all       ดึงทุกงวดที่ API มี
//   npm run lottery -- --limit=8   จำกัดจำนวนงวด
//   npm run lottery -- --force     ดึงทับไฟล์ที่มีอยู่แล้ว
//
// logic การดึงและแปลงข้อมูลอยู่ที่ src/lib/glo-api.mjs ซึ่ง Worker ใช้ร่วมกัน
// สคริปต์นี้รับผิดชอบแค่การวนงวด เขียนไฟล์ และรายงานผล

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDraw, fetchPeriodList } from '../src/lib/glo-api.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'src', 'data', 'lottery');

/** เว้นจังหวะระหว่างคำขอ ไม่ยิงรัวใส่เซิร์ฟเวอร์ของหน่วยงานรัฐ */
const DELAY_MS = 700;
const DEFAULT_LIMIT = 24;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const all = args.includes('--all');
  const limitArg = args.find((a) => a.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.split('=')[1]) : all ? Infinity : DEFAULT_LIMIT;

  mkdirSync(OUT_DIR, { recursive: true });
  const periods = await fetchPeriodList();
  console.log(`API มีงวดทั้งหมด ${periods.length} งวด · จะดึงสูงสุด ${limit === Infinity ? 'ทั้งหมด' : limit} งวด`);

  const enteredAt = new Date().toISOString().slice(0, 10);
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
      // ข้อมูลที่ผ่านสคริปต์นี้มีคนสั่งรัน คน review diff และ commit จึงเป็น verified ได้
      // ต่างจาก Worker ที่ดึงเองตอน cron ซึ่งไม่มีคนอยู่ในลูป และต้องเป็น validated เท่านั้น (L1)
      const draw = await fetchDraw(drawDate, { status: 'verified', enteredAt });
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
  console.log('\nขั้นตอนถัดไป: npm test (validator จะตรวจไฟล์ทั้งหมด) แล้วตรวจ diff ก่อน commit');
}

main().catch((e) => {
  console.error(`\nดึงข้อมูลไม่สำเร็จ: ${e.message}`);
  process.exitCode = 1;
});
