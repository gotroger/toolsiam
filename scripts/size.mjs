// วัดขนาดหน้าเว็บหลัง build แล้วเทียบกับ budget ใน docs/perf-budget.md (§21.2)
//
//   npm run size            รายงาน + fail ถ้าเกิน budget
//   npm run size -- --json  พิมพ์ผลดิบเป็น JSON (ใช้ตอนตั้ง budget ใหม่)
//
// นับ "JS ของหน้า" = ไฟล์ที่เบราว์เซอร์ต้องโหลดจริงเพื่อให้หน้านั้นทำงานครบ:
//   - script ที่อ้างจาก HTML (astro-island component-url / renderer-url / <script src>)
//   - ไฟล์ที่ chunk เหล่านั้น import แบบ static (ตามไปจนสุด)
//   - สำหรับหน้าเครื่องมือ: chunk ของเครื่องมือนั้นที่ ToolIsland โหลดแบบ dynamic พร้อม dependency
//     (อ่านจากตาราง __vite__mapDeps ที่ Vite ใส่ไว้ — จึงตรงกับสิ่งที่โหลดจริง ไม่ใช่การประมาณ)
//
// Node ล้วน ใช้ zlib ของ Node เอง — ไม่เพิ่ม dependency ใด ๆ (E8)

import { gzipSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIST = join('dist', 'client');
const BUDGET_FILE = join('docs', 'perf-budget.md');

const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (bytes) => Math.round((bytes / 1024) * 10) / 10;

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

/** path ที่อ้างจาก HTML (เริ่มด้วย /) → path จริงใน dist/client */
const fromUrl = (url) => join(DIST, url.replace(/^\//, ''));

/** ไฟล์ที่ chunk นี้ import แบบ static (ตามไปจนสุด) */
function staticClosure(entryFiles) {
  const seen = new Set();
  const queue = [...entryFiles];
  while (queue.length) {
    const file = queue.pop();
    if (seen.has(file) || !existsSync(file)) continue;
    seen.add(file);
    const code = readFileSync(file, 'utf8');
    for (const m of code.matchAll(/(?:from|import)\s*["'](\.\.?\/[^"']+\.js)["']/g)) {
      queue.push(resolve(dirname(file), m[1]));
    }
  }
  return seen;
}

/** slug → ไฟล์ที่โหลดตอน hydrate เครื่องมือนั้น (จากตาราง __vite__mapDeps ของ ToolIsland) */
function lazyDepsBySlug(islandFile) {
  const code = readFileSync(islandFile, 'utf8');
  const dep = code.match(/__vite__mapDeps\s*=\s*\(i,\s*m=__vite__mapDeps,\s*d=\(m\.f\|\|\(m\.f=\[([^\]]*)\]\)\)/);
  if (!dep) return {};
  const files = dep[1].split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));

  const out = {};
  for (const m of code.matchAll(/["']([a-z0-9-]+)["']\s*:\s*\(\)\s*=>[^[]*__vite__mapDeps\(\[([^\]]*)\]\)/g)) {
    out[m[1]] = m[2]
      .split(',')
      .map((n) => files[Number(n.trim())])
      .filter(Boolean)
      .map((f) => join(DIST, f));
  }
  return out;
}

function measure() {
  if (!existsSync(DIST)) throw new Error('ยังไม่มี dist/client — รัน `npm run build` ก่อน');

  const all = walk(DIST);
  const islandFile = all.find((f) => /ToolIsland\.[^/]+\.js$/.test(f));
  const lazy = islandFile ? lazyDepsBySlug(islandFile) : {};

  const cssBytes = all.filter((f) => f.endsWith('.css')).reduce((n, f) => n + gz(readFileSync(f)), 0);

  const pages = [];
  for (const file of all.filter((f) => f.endsWith('.html'))) {
    const html = readFileSync(file, 'utf8');
    const route = '/' + relative(DIST, file).replace(/\.html$/, '').replace(/\/?index$/, '');

    const entries = [...html.matchAll(/(?:component-url|renderer-url|src)="(\/[^"]+\.js)"/g)].map((m) => fromUrl(m[1]));
    const slug = route.startsWith('/tools/') ? route.slice('/tools/'.length) : null;
    const files = staticClosure([...entries, ...(lazy[slug] ?? [])]);

    pages.push({
      route,
      kind: slug ? 'tool' : 'content',
      htmlGzip: gz(Buffer.from(html)),
      jsGzip: [...files].reduce((n, f) => n + gz(readFileSync(f)), 0),
    });
  }

  pages.sort((a, b) => b.jsGzip - a.jsGzip || b.htmlGzip - a.htmlGzip);
  return { pages, cssGzip: cssBytes };
}

/** เปอร์เซ็นไทล์แบบ nearest-rank — ชุดข้อมูลมีไม่กี่สิบหน้า จึงไม่ต้อง interpolate */
function p95(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(0.95 * sorted.length) - 1)];
}

/** budget เก็บเป็นบล็อก ```json ใน docs/perf-budget.md — ไฟล์เดียว ทั้งตัวเลขและเหตุผล ไม่มีทาง drift */
function readBudget() {
  if (!existsSync(BUDGET_FILE)) return null;
  const m = readFileSync(BUDGET_FILE, 'utf8').match(/```json\n([\s\S]*?)```/);
  return m ? JSON.parse(m[1]) : null;
}

function main() {
  const { pages, cssGzip } = measure();
  const tools = pages.filter((p) => p.kind === 'tool');
  const content = pages.filter((p) => p.kind === 'content');

  const summary = {
    cssGzip,
    toolPageJsP95: p95(tools.map((p) => p.jsGzip)),
    toolPageJsMax: Math.max(0, ...tools.map((p) => p.jsGzip)),
    toolPageHtmlP95: p95(tools.map((p) => p.htmlGzip)),
    contentPageJsP95: p95(content.map((p) => p.jsGzip)),
    contentPageHtmlP95: p95(content.map((p) => p.htmlGzip)),
  };

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ summary, pages }, null, 2));
    return;
  }

  console.log('ขนาดหลัง gzip (KB)\n');
  console.log('  หน้า'.padEnd(38) + 'JS'.padStart(8) + 'HTML'.padStart(8));
  for (const p of pages) {
    console.log('  ' + p.route.padEnd(36) + String(kb(p.jsGzip)).padStart(8) + String(kb(p.htmlGzip)).padStart(8));
  }
  console.log('\nสรุป');
  console.log(`  CSS รวมทั้งเว็บ            ${kb(summary.cssGzip)} KB`);
  console.log(`  หน้าเครื่องมือ JS p95      ${kb(summary.toolPageJsP95)} KB   (สูงสุด ${kb(summary.toolPageJsMax)} KB)`);
  console.log(`  หน้าเครื่องมือ HTML p95    ${kb(summary.toolPageHtmlP95)} KB`);
  console.log(`  หน้าเนื้อหา JS p95         ${kb(summary.contentPageJsP95)} KB`);
  console.log(`  หน้าเนื้อหา HTML p95       ${kb(summary.contentPageHtmlP95)} KB`);

  const budget = readBudget();
  if (!budget) {
    console.log(`\n⚠ ยังไม่มี budget ใน ${BUDGET_FILE} — บันทึกค่าข้างบนเป็น baseline ก่อน`);
    return;
  }

  const over = [];
  for (const [key, limit] of Object.entries(budget.limits)) {
    if (summary[key] > limit) over.push(`${key} = ${kb(summary[key])} KB เกิน budget ${kb(limit)} KB`);
  }
  // หน้าใดหน้าหนึ่งที่โดดขึ้นมาเกิน budget ของกลุ่มตัวเอง ต้องรู้ตัวแม้ p95 จะยังผ่าน
  for (const p of pages) {
    const limit = p.kind === 'tool' ? budget.limits.toolPageJsP95 : budget.limits.contentPageJsP95;
    if (limit !== undefined && p.jsGzip > limit) over.push(`${p.route} JS = ${kb(p.jsGzip)} KB เกิน budget ${kb(limit)} KB`);
  }

  if (over.length) {
    console.error(`\n❌ เกิน budget (${BUDGET_FILE} · baseline ${budget.measuredAt})`);
    for (const line of over) console.error(`   - ${line}`);
    console.error('\nถ้าการเพิ่มขึ้นมีเหตุผล ให้ยกระดับ budget พร้อมบันทึกเหตุผลและชื่อ Phase ลงใน docs/perf-budget.md');
    process.exit(1);
  }
  console.log(`\n✅ อยู่ใน budget ทั้งหมด (${BUDGET_FILE} · baseline ${budget.measuredAt})`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
