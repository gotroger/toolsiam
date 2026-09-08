// ดึงไฟล์ฟอนต์จาก Google Fonts มาเก็บไว้เอง แล้วพิมพ์บล็อก @font-face ให้ก๊อปลง global.css
//
//   node scripts/fetch-fonts.mjs
//
// ทำไมต้องมีสคริปต์: ไฟล์ woff2 ของ Google มี hash อยู่ใน URL และเปลี่ยนเมื่อฟอนต์ออกเวอร์ชันใหม่
// การไล่ก๊อป URL ด้วยมือทีละไฟล์เป็นงานที่พลาดง่ายและไม่มีใครอยากทำซ้ำ
//
// เก็บเฉพาะ subset thai กับ latin — เว็บเป็นภาษาไทยล้วน ไม่มีเนื้อหาเวียดนามหรือยุโรปตะวันออก
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const CSS_URL = 'https://fonts.googleapis.com/css2'
  + '?family=Prompt:wght@500'
  + '&family=Sarabun:wght@400;500;600;700'
  + '&display=swap';

/** ต้องส่ง UA ของเบราว์เซอร์จริง ไม่งั้น Google ส่ง CSS ที่อ้าง ttf แทน woff2 */
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
  + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const KEEP = new Set(['thai', 'latin']);
const OUT_DIR = join('public', 'fonts');

const css = await fetch(CSS_URL, { headers: { 'User-Agent': UA } }).then((r) => {
  if (!r.ok) throw new Error(`ขอ CSS ไม่สำเร็จ: ${r.status}`);
  return r.text();
});

const blocks = [...css.matchAll(/\/\* ([a-z-]+) \*\/\s*@font-face \{(.*?)\}/gs)];
if (blocks.length === 0) throw new Error('อ่านบล็อก @font-face จาก CSS ไม่ได้ — รูปแบบอาจเปลี่ยน');

await mkdir(OUT_DIR, { recursive: true });
const faces = [];
let total = 0;

for (const [, subset, body] of blocks) {
  if (!KEEP.has(subset)) continue;
  const family = /font-family: '([^']+)'/.exec(body)[1];
  const weight = /font-weight: (\d+)/.exec(body)[1];
  const url = /url\((https:\/\/[^)]+)\)/.exec(body)[1];
  const unicodeRange = /unicode-range: ([^;]+);/.exec(body)[1];

  const name = `${family.toLowerCase()}-${weight}-${subset}.woff2`;
  const bytes = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
  await writeFile(join(OUT_DIR, name), bytes);
  total += bytes.length;
  console.log(`${name.padEnd(32)} ${(bytes.length / 1024).toFixed(1).padStart(6)} KB`);

  faces.push(`@font-face {
  font-family: '${family}';
  font-style: normal;
  font-weight: ${weight};
  font-display: swap;
  src: url('/fonts/${name}') format('woff2');
  unicode-range: ${unicodeRange};
}`);
}

console.log(`\nรวม ${(total / 1024).toFixed(1)} KB จาก ${faces.length} ไฟล์`);
console.log('\n--- ก๊อปบล็อกด้านล่างไปแทนที่ @font-face เดิมใน src/styles/global.css ---\n');
console.log(faces.join('\n'));
