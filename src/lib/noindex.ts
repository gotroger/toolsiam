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

/** หน้าที่ไม่ควร index ตรง ๆ */
export const NOINDEX_EXACT_PATHS = ['/404', '/design-system'];

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
