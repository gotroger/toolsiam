/**
 * แหล่งความจริงเดียวของ "หน้าไหนห้าม index" (§7.3 ของแผน)
 *
 * โมดูลนี้ตั้งใจไม่ import อะไรเลย เพราะถูกอ่านจากสองฝั่งที่ resolve module ต่างกัน:
 *   - Base.astro   → ใส่ <meta name="robots" content="noindex">
 *   - astro.config → filter ของ @astrojs/sitemap
 * ทั้งสองฝั่งจึงเห็นรายการเดียวกันเสมอ ไม่มีทางหลุดจากกัน
 *
 * รายการต้องตรงกับ registry จริง — บังคับด้วย src/tools/registry.test.ts
 */

/** เครื่องมือที่ปลดระวางเชิง SEO — URL ยังเปิดได้ 200 แต่ไม่เข้า sitemap และไม่ถูก index (§18) */
export const NOINDEX_TOOL_SLUGS = ['json-formatter'];

/**
 * หมวดที่มีหน้าอยู่แต่ห้าม index
 *
 * ว่างตั้งแต่ Phase 0B: หมวดที่ยังไม่มีเครื่องมือเป็น status 'planned' ซึ่ง getStaticPaths
 * ไม่ build ให้ตั้งแต่ต้น จึงไม่มีหน้าหมวดว่างบน production ให้ต้อง noindex อีก (§8.4)
 */
export const NOINDEX_CATEGORY_IDS: string[] = [];

/**
 * หน้าของ vertical หวยที่จะมีค่าให้ index ก็ต่อเมื่อมีข้อมูลงวดจริงแล้ว
 *
 * แนวคิดเดียวกับหมวดว่างใน §8.4: หน้าเปล่าที่ถูก index คือหนี้ SEO ไม่ใช่ทรัพย์สิน
 * หน้า /lottery เองไม่อยู่ในรายการ เพราะมีเนื้อหาถาวร (กติกา โครงสร้างรางวัล ปฏิทินงวด)
 * ที่ถูกต้องอยู่แล้วแม้ยังไม่มีผลรางวัลสักงวด
 */
export const LOTTERY_DATA_PAGES = ['/lottery/check', '/lottery/results', '/lottery/archive'];

/**
 * ตั้งเป็น true พร้อมกับตอนเติมงวดแรกใน src/lottery/data/draws.ts
 * โมดูลนี้ import อะไรไม่ได้ (ดูหัวไฟล์) จึงใช้ค่าคงที่คู่กับเทสต์ใน src/lottery/draws.test.ts
 * ที่บังคับว่าค่านี้ต้องตรงกับข้อมูลจริงเสมอ
 */
export const LOTTERY_HAS_RESULTS = false;

/** หน้าที่ไม่ควร index ตรง ๆ */
export const NOINDEX_EXACT_PATHS = ['/404', ...(LOTTERY_HAS_RESULTS ? [] : LOTTERY_DATA_PAGES)];

/** ตัด .html และ trailing slash ออกให้เทียบกันได้ (build ใช้ format: 'file') */
export function normalizePath(pathname: string): string {
  const p = pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '');
  return p.length > 1 ? p.replace(/\/$/, '') : p;
}

export function isNoindexPath(pathname: string): boolean {
  const p = normalizePath(pathname);
  if (NOINDEX_EXACT_PATHS.includes(p)) return true;
  const tool = p.startsWith('/tools/') ? p.slice('/tools/'.length) : null;
  if (tool && NOINDEX_TOOL_SLUGS.includes(tool)) return true;
  const category = p.startsWith('/categories/') ? p.slice('/categories/'.length) : null;
  if (category && NOINDEX_CATEGORY_IDS.includes(category)) return true;
  return false;
}
