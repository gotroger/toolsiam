// ดึงผลสลากกินแบ่งรัฐบาลจาก API ของสำนักงานสลากฯ แล้วเขียนเป็นไฟล์ JSON ตาม schema ของเรา
//
//   npm run lottery                ดึงงวดที่ยังไม่มีไฟล์ ภายใน 24 งวดล่าสุด
//   npm run lottery -- --all       ดึงทุกงวดที่ API มี
//   npm run lottery -- --limit=8   ดูแค่ 8 งวดล่าสุด (งวดที่มีไฟล์แล้วก็นับรวม)
//   npm run lottery -- --force     ดึงทับไฟล์ที่มีอยู่แล้ว
//
// logic การดึงและแปลงข้อมูลอยู่ที่ src/lib/glo-api.mjs ซึ่ง Worker ใช้ร่วมกัน
// สคริปต์นี้รับผิดชอบแค่การวนงวด ตรวจ เขียนไฟล์ และรายงานผล
//
// import validator จากไฟล์ .ts โดยตรงผ่าน type stripping ของ node
// (`npm run lottery` ใส่ --experimental-strip-types ให้แล้ว) — ใช้ตัวตรวจชุดเดียวกับตอน build
// ไฟล์ที่ไม่ผ่านจึงไม่มีทางถูกเขียนลงดิสก์ แล้วไปทำ build ล้มทีหลัง

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchDraw, fetchPeriodList, recentPeriods } from '../src/lib/glo-api.mjs';
import { assertValidFetchedDraw } from '../src/data/lottery/schema.ts';

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
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
  // limit = N งวดล่าสุด ไม่ใช่ "เขียนได้ N ไฟล์" — ไม่อย่างนั้นงวดที่ขาดไฟล์ลึกในประวัติจะถูกไล่ดึงไปเรื่อย ๆ
  const targets = recentPeriods(periods, limit, today);
  console.log(
    `API มีงวดทั้งหมด ${periods.length} งวด · ตรวจ ${limit === Infinity ? 'ทุกงวด' : `${targets.length} งวดล่าสุด`}`,
  );

  const enteredAt = today;
  let written = 0;
  let skipped = 0;
  const failures = [];

  for (const drawDate of targets) {
    const file = join(OUT_DIR, `${drawDate}.json`);
    if (existsSync(file) && !force) {
      skipped++;
      continue;
    }
    try {
      // ผ่านการตรวจรูปแบบเท่านั้น; ผู้ตรวจต้องยืนยันกับประกาศก่อนเปลี่ยนเป็น verified
      // ตรวจก่อนเขียนเสมอ — ผลที่ยังทยอยออกไม่ครบต้องไม่กลายเป็นไฟล์ที่ทำ build ล้ม
      const { draw, droppedN3 } = assertValidFetchedDraw(await fetchDraw(drawDate, { status: 'validated', enteredAt }));
      writeFileSync(file, `${JSON.stringify(draw, null, 2)}\n`);
      console.log(`✓ ${drawDate}  รางวัลที่ 1 = ${draw.prizes.first[0]}${draw.n3 ? '' : '  (ไม่มี N3)'}`);
      if (droppedN3.length > 0) {
        console.warn(`  ⚠ ตัด N3 ทิ้งเพราะไม่ผ่านการตรวจ: ${droppedN3.join(' · ')} — รันใหม่ด้วย --force เมื่อผลครบ`);
      }
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
