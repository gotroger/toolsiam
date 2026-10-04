/**
 * หน้าที่ build ได้ปกติแต่ไม่ควรอยู่ใน sitemap เพราะ canonical ชี้ไปหน้าอื่น
 *
 * sitemap ควรมีแต่ URL ที่เป็น canonical ของตัวเอง — ใส่ URL ที่ canonical ชี้ออกไป
 * คือส่งสัญญาณขัดกันให้ search engine (Search Console ขึ้นเตือน "Duplicate, Google chose different canonical")
 *
 * ไฟล์นี้ไม่ import อะไรเลยด้วยเหตุผลเดียวกับ noindex.ts — astro.config อ่านมันได้โดยไม่ต้องผ่าน vite
 */

/**
 * หน้าผลของงวดล่าสุด (`/lottery/results/<วันที่>`) ชี้ canonical ไป `/lottery/results`
 * (ดู src/pages/lottery/[...path].astro) จึงต้องไม่อยู่ใน sitemap
 *
 * รับชื่อไฟล์ใน src/data/lottery/ เพราะ astro.config ใช้ import.meta.glob แบบ DRAWS ไม่ได้
 */
export function latestDrawPath(dataFiles: readonly string[]): string | null {
  const dates = dataFiles
    .map((f) => /^(\d{4}-\d{2}-\d{2})\.json$/.exec(f)?.[1])
    .filter((d): d is string => d !== undefined)
    .sort();
  const latest = dates.at(-1);
  return latest ? `/lottery/results/${latest}` : null;
}
