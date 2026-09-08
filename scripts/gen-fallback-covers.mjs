// สร้างปกสำรองประจำหมวด (§15.2 ชั้น A) — Node ล้วน ไม่มี dependency ไม่พึ่ง macOS
//
// ออก 1 ไฟล์ต่อหมวด ไม่ใช่ต่อเครื่องมือ: public/covers/_category-<id>.svg
// เนื้อภาพมีแค่พื้นไล่สีประจำหมวด + ไอคอนเส้นของหมวด — ไม่มีตัวอักษร ไม่มีชื่อเครื่องมือ
// เพราะชื่อเครื่องมืออยู่ใต้ภาพในการ์ดอยู่แล้ว การเขียนซ้ำลงบนภาพผิดทิศทางของงานออกแบบ (§15.1)
//
//   node scripts/gen-fallback-covers.mjs
//
// อ่านหมวดจาก src/tools/categories.ts โดยตรงด้วย regex — ไม่ต้องมี TypeScript runtime
// (registry.test.ts ตรวจว่าไฟล์ที่ได้ครบทุกหมวดและตรงกับข้อมูลใน categories.ts)

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORY_ICON_PATHS, CATEGORY_ICON_VIEWBOX } from '../src/lib/category-icons.mjs';

const WIDTH = 1200;
const HEIGHT = 675;
const OUT_DIR = join('public', 'covers');

/** ดึง id / gradient ของทุกหมวดจากซอร์ส TypeScript (ไอคอนมาจาก category-icons.mjs) */
export function parseCategories(source) {
  const re = /id:\s*'([a-z-]+)',[^}]*?gradient:\s*\['(#[0-9a-fA-F]{6})',\s*'(#[0-9a-fA-F]{6})'\]/g;
  const out = [];
  for (const m of source.matchAll(re)) {
    out.push({ id: m[1], from: m[2], to: m[3] });
  }
  return out;
}

/** ขนาดไอคอนบนภาพปก (px บน viewBox 1200×675) */
const ICON_SIZE = 260;

export function fallbackCoverSvg({ id, from, to }) {
  // จุดวงกลมจาง ๆ ให้ภาพไม่ว่างเปล่าเกินไป — ตำแหน่งคงที่ ไม่สุ่ม เพื่อให้ build ซ้ำได้ผลเดิม
  const dots = [
    [210, 170, 96], [980, 210, 130], [330, 520, 74], [900, 540, 60],
  ].map(([cx, cy, r]) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" opacity="0.35"/>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}" role="img" aria-label="ภาพปกหมวด ${id}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${from}"/>
      <stop offset="1" stop-color="${to}"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#g)"/>
  ${dots}
  <g transform="translate(${(WIDTH - ICON_SIZE) / 2} ${(HEIGHT - ICON_SIZE) / 2}) scale(${ICON_SIZE / CATEGORY_ICON_VIEWBOX})" fill="none" stroke="#0f172a" stroke-opacity="0.72" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
    <path d="${CATEGORY_ICON_PATHS[id]}"/>
  </g>
</svg>
`;
}

export function fallbackCoverPath(id) {
  return `/covers/_category-${id}.svg`;
}

function main() {
  const source = readFileSync(join('src', 'tools', 'categories.ts'), 'utf8');
  const cats = parseCategories(source);
  if (cats.length === 0) throw new Error('อ่านหมวดจาก src/tools/categories.ts ไม่ได้');

  mkdirSync(OUT_DIR, { recursive: true });
  for (const c of cats) {
    writeFileSync(join('public', fallbackCoverPath(c.id)), fallbackCoverSvg(c));
  }
  console.log(`สร้างปกสำรอง ${cats.length} หมวด → ${OUT_DIR}/_category-<id>.svg`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
