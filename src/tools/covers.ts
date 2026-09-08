import type { CategoryId, ToolMeta } from './types';

/**
 * ภาพปกเครื่องมือ — mapping ฝั่ง frontend ล้วน ไม่แตะข้อมูล/ตรรกะฝั่ง backend
 *
 * สถาปัตยกรรม 3 ชั้น (§15.2)
 *   A. ปกสำรองประจำหมวด  public/covers/_category-<id>.svg   สร้างด้วย `npm run covers:fallback`
 *   B. ปกจริงของเครื่องมือ public/covers/<slug>.webp          วางทับชั้น A ได้ทันทีโดยไม่ต้องแก้โค้ด
 *   C. og:image           public/og/<slug>.jpg                derive จากชั้น B ด้วย `npm run covers`
 *
 * **การไม่มีปกจริงต้องไม่ block การเพิ่มเครื่องมือหรือ `npm test`** (§15.3) —
 * เครื่องมือใหม่ใช้ปกประจำหมวดไปก่อน แล้วค่อยวางไฟล์ `<slug>.webp` ทับทีหลัง
 *
 * เพิ่มปกจริงให้เครื่องมือ:
 *   1. วางภาพต้นฉบับที่ assets/covers-src/<slug>.png (1200×675, ไม่มีข้อความในภาพ)
 *   2. `npm run covers` เพื่อแปลงเป็น WebP + JPEG (ต้องใช้ macOS — อยู่นอก critical path)
 *   3. เพิ่มบรรทัดในตารางด้านล่าง (หรือใส่ `coverImage` ใน meta ซึ่งมีลำดับสูงกว่า)
 */
export const COVER_DIR = '/covers';

/** ปกสำรองสุดท้ายสำหรับเครื่องมือที่ปลดระวาง (category === null) ซึ่งไม่มีหมวดให้อ้างอิง */
export const FALLBACK_COVER = `${COVER_DIR}/_placeholder.svg`;

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 675;

/** โฟลเดอร์ภาพสำหรับ og:image (JPEG) */
export const OG_DIR = '/og';

/** ภาพ og:image เริ่มต้นของเว็บ ใช้กับหน้าที่ไม่มีภาพปกเป็นของตัวเอง */
export const DEFAULT_OG_IMAGE = `${OG_DIR}/_default.jpg`;

/** ปกสำรองประจำหมวด — ไฟล์สร้างโดย scripts/gen-fallback-covers.mjs */
export function categoryCoverPath(id: CategoryId): string {
  return `${COVER_DIR}/_category-${id}.svg`;
}

const coverBySlug: Record<string, string> = {
  'thai-income-tax': `${COVER_DIR}/thai-income-tax.webp`,
  'loan-installment': `${COVER_DIR}/loan-installment.webp`,
  'net-salary': `${COVER_DIR}/net-salary.webp`,
  'vat-wht': `${COVER_DIR}/vat-wht.webp`,
  'compound-interest': `${COVER_DIR}/compound-interest.webp`,
  'baht-text': `${COVER_DIR}/baht-text.webp`,
  'word-count': `${COVER_DIR}/word-count.webp`,
  'thai-numerals': `${COVER_DIR}/thai-numerals.webp`,
  'text-lines': `${COVER_DIR}/text-lines.webp`,
  'thai-id-check': `${COVER_DIR}/thai-id-check.webp`,
  'age-days': `${COVER_DIR}/age-days.webp`,
  'thai-year-convert': `${COVER_DIR}/thai-year-convert.webp`,
  'thai-holidays': `${COVER_DIR}/thai-holidays.webp`,
  'promptpay-qr': `${COVER_DIR}/promptpay-qr.webp`,
  'qr-generator': `${COVER_DIR}/qr-generator.webp`,
  'qr-reader': `${COVER_DIR}/qr-reader.webp`,
  'json-formatter': `${COVER_DIR}/json-formatter.webp`,
};

/** ชั้นของปกที่ resolve ได้ — 'tool' = ปกจริง, ที่เหลือคือปกสำรอง */
export type CoverKind = 'tool' | 'category' | 'placeholder';

export interface Cover {
  src: string;
  alt: string;
  kind: CoverKind;
  /** true เมื่อยังไม่มีปกจริงของเครื่องมือนี้ — ใช้รายงานได้ แต่ไม่ใช่ข้อผิดพลาด */
  isFallback: boolean;
}

/** ลำดับ: meta.coverImage → ตาราง mapping → ปกประจำหมวด → ปกสำรองสุดท้าย */
export function resolveCover(tool: Pick<ToolMeta, 'slug' | 'name' | 'category' | 'coverImage' | 'coverAlt'>): Cover {
  const own = tool.coverImage ?? coverBySlug[tool.slug];
  const kind: CoverKind = own ? 'tool' : tool.category ? 'category' : 'placeholder';
  const src = own ?? (tool.category ? categoryCoverPath(tool.category) : FALLBACK_COVER);
  return {
    src,
    alt: tool.coverAlt ?? `ภาพปกเครื่องมือ ${tool.name}`,
    kind,
    isFallback: kind !== 'tool',
  };
}

export interface OgImage {
  /** path แบบ absolute จาก root — ให้ layout แปลงเป็น URL เต็มอีกที */
  src: string;
  alt: string;
  width: number;
  height: number;
  /** true เมื่อใช้ภาพเริ่มต้นของเว็บแทนภาพเฉพาะของเครื่องมือ */
  isDefault: boolean;
}

/**
 * ภาพ og:image ของเครื่องมือ
 *
 * ใช้ JPEG แทน WebP/SVG เพราะ crawler ของ LINE (ซึ่งเป็นช่องทางแชร์หลักของผู้ใช้ไทย)
 * ยังไม่รองรับสองรูปแบบนั้นอย่างน่าเชื่อถือ — scripts/build-covers.sh สร้าง .jpg คู่กับ .webp ทุกใบ
 *
 * เครื่องมือที่ยังใช้ปกสำรอง (หรือมีปกจริงที่ไม่ใช่ WebP ในโฟลเดอร์ /covers จึงไม่มีคู่ JPEG)
 * ใช้ภาพเริ่มต้นของเว็บ **โดยตั้งใจ ไม่ใช่บังเอิญ** (P8) — `isDefault` บอกสถานะนี้ให้ผู้เรียกตรวจได้
 */
export function resolveOgImage(tool: Pick<ToolMeta, 'slug' | 'name' | 'category' | 'coverImage' | 'coverAlt'>): OgImage {
  const cover = resolveCover(tool);
  const hasJpegTwin =
    cover.kind === 'tool' && cover.src.startsWith(`${COVER_DIR}/`) && cover.src.endsWith('.webp');

  return {
    src: hasJpegTwin
      ? cover.src.replace(COVER_DIR, OG_DIR).replace(/\.webp$/, '.jpg')
      : DEFAULT_OG_IMAGE,
    alt: hasJpegTwin ? cover.alt : 'ทูลสยาม ToolSiam — เครื่องมือออนไลน์ภาษาไทย ใช้ฟรี',
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
    isDefault: !hasJpegTwin,
  };
}
