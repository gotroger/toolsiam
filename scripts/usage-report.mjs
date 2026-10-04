#!/usr/bin/env node
/**
 * รายงานยอดใช้งานเครื่องมือจากตาราง usage_daily — ใช้เลือกว่าจะพัฒนาเครื่องมือไหนต่อ (Phase 5)
 *
 *   npm run usage                 production ย้อนหลัง 30 วัน
 *   npm run usage -- --days 7     เปลี่ยนช่วง
 *   npm run usage -- --local      D1 local (หลัง `npm run preview` แล้วกดใช้เครื่องมือเอง)
 *   npm run usage -- --csv        ผลแบบ CSV ไว้เปิดใน Excel/Sheets
 *
 * ต้องล็อกอิน wrangler (`npx wrangler login`) ด้วยบัญชีที่เข้าถึง D1 `toolsiam` ได้
 * "เปิด" = เข้าหน้าเครื่องมือ · "ใช้" = ลงมือพิมพ์/เลือก/วางไฟล์/กดปุ่มในเครื่องมือ (นับหนึ่งครั้งต่อแท็บ)
 */
import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const local = args.includes('--local');
const csv = args.includes('--csv');
const daysArg = args.indexOf('--days');
const days = daysArg >= 0 ? Number(args[daysArg + 1]) : 30;
if (!Number.isInteger(days) || days < 1 || days > 3650) {
  console.error('--days ต้องเป็นจำนวนเต็ม 1–3650');
  process.exit(1);
}

// วันที่ตามเวลาไทย เหมือนที่ Worker ใช้เขียน (src/lib/today.ts)
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Bangkok' }).format(new Date());
const [y, m, d] = today.split('-').map(Number);
const since = new Date(Date.UTC(y, m - 1, d - (days - 1))).toISOString().slice(0, 10);

const sql = `SELECT slug,
  SUM(CASE WHEN day >= '${since}' THEN views ELSE 0 END) AS views_recent,
  SUM(CASE WHEN day >= '${since}' THEN uses ELSE 0 END) AS uses_recent,
  SUM(uses) AS uses_total,
  MIN(day) AS first_day
FROM usage_daily GROUP BY slug ORDER BY uses_recent DESC, uses_total DESC, slug`;

let raw;
try {
  raw = execFileSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'toolsiam', local ? '--local' : '--remote', '--json', '--command', sql],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );
} catch {
  console.error(
    '\nเรียก wrangler ไม่สำเร็จ — ตรวจว่าล็อกอินแล้ว (npx wrangler login) และ migration 0003 ถูก apply แล้ว',
  );
  process.exit(1);
}

const rows = JSON.parse(raw)[0]?.results ?? [];
if (csv) {
  console.log('slug,views_recent,uses_recent,use_rate,uses_total,first_day');
  for (const r of rows) {
    const rate = r.views_recent ? (r.uses_recent / r.views_recent).toFixed(3) : '';
    console.log([r.slug, r.views_recent, r.uses_recent, rate, r.uses_total, r.first_day].join(','));
  }
  process.exit(0);
}

const n = (v) => Number(v ?? 0).toLocaleString('en-US');
const pct = (r) => (r.views_recent ? `${Math.round((r.uses_recent / r.views_recent) * 100)}%` : '—');
const table = rows.map((r, i) => ({
  '#': i + 1,
  เครื่องมือ: r.slug,
  [`เปิด ${days} วัน`]: n(r.views_recent),
  [`ใช้ ${days} วัน`]: n(r.uses_recent),
  'ใช้/เปิด': pct(r),
  ใช้สะสม: n(r.uses_total),
  เริ่มนับ: r.first_day,
}));

const totalViews = rows.reduce((s, r) => s + Number(r.views_recent ?? 0), 0);
const totalUses = rows.reduce((s, r) => s + Number(r.uses_recent ?? 0), 0);
console.log(`\nยอดใช้งานเครื่องมือ ${since} ถึง ${today} (${local ? 'local' : 'production'})`);
console.log(`รวม: เปิด ${n(totalViews)} ครั้ง · ใช้ ${n(totalUses)} ครั้ง · มีข้อมูล ${rows.length} เครื่องมือ\n`);
if (rows.length === 0) console.log('ยังไม่มีข้อมูล — ตัวนับเริ่มจากศูนย์ในวันที่ deploy');
else console.table(table);
console.log(
  '\nอ่านผล: "ใช้/เปิด" ต่ำ = คนเข้ามาแต่ไม่ได้ใช้ (หน้าไม่ตอบโจทย์หรือเข้ามาผิด) · เครื่องมือที่ไม่อยู่ในตาราง = ยังไม่มีใครเปิดเลยในช่วงที่นับ',
);
