import type { ToolMeta } from './types';

/**
 * ภาพปกเครื่องมือ — mapping ฝั่ง frontend ล้วน ไม่แตะข้อมูล/ตรรกะฝั่ง backend
 *
 * โครงสร้าง asset:
 *   assets/covers-src/<slug>.png   ต้นฉบับความละเอียดสูง (ไม่ถูก deploy)
 *   public/covers/<slug>.webp      ไฟล์ที่เสิร์ฟจริง 1200×675 (16:9) ~30–60 KB/ใบ
 *   public/og/<slug>.jpg           ภาพเดียวกันในรูป JPEG สำหรับ og:image
 *
 * เพิ่มเครื่องมือใหม่:
 *   1. วางภาพต้นฉบับที่ assets/covers-src/<slug>.png
 *   2. `npm run covers` เพื่อแปลงเป็น WebP 1200×675
 *   3. เพิ่มบรรทัดในตารางด้านล่าง (หรือใส่ `coverImage` ใน meta ของเครื่องมือนั้น ซึ่งมีลำดับสูงกว่า)
 */
export const COVER_DIR = '/covers';

/** ภาพสำรองสำหรับเครื่องมือที่ยังไม่มีภาพปกเป็นของตัวเอง */
export const FALLBACK_COVER = `${COVER_DIR}/_placeholder.svg`;

export const COVER_WIDTH = 1200;
export const COVER_HEIGHT = 675;

/** โฟลเดอร์ภาพสำหรับ og:image (JPEG) */
export const OG_DIR = '/og';

/** ภาพ og:image เริ่มต้นของเว็บ ใช้กับหน้าที่ไม่มีภาพปกของตัวเอง */
export const DEFAULT_OG_IMAGE = `${OG_DIR}/_default.jpg`;

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

export interface Cover {
  src: string;
  alt: string;
  /** true เมื่อใช้ภาพสำรอง — ใช้ตกแต่งต่างจากภาพจริงได้ */
  isFallback: boolean;
}

/** ลำดับ: meta.coverImage → ตาราง mapping → ภาพสำรอง */
export function resolveCover(tool: Pick<ToolMeta, 'slug' | 'name' | 'coverImage' | 'coverAlt'>): Cover {
  const src = tool.coverImage ?? coverBySlug[tool.slug];
  return {
    src: src ?? FALLBACK_COVER,
    alt: tool.coverAlt ?? `ภาพปกเครื่องมือ ${tool.name}`,
    isFallback: !src,
  };
}

export interface OgImage {
  /** path แบบ absolute จาก root — ให้ layout แปลงเป็น URL เต็มอีกที */
  src: string;
  alt: string;
  width: number;
  height: number;
}

/**
 * ภาพ og:image ของเครื่องมือ
 *
 * ใช้ JPEG แทน WebP เพราะ crawler ของ LINE (ซึ่งเป็นช่องทางแชร์หลักของผู้ใช้ไทย)
 * ยังไม่รองรับ WebP อย่างน่าเชื่อถือ — scripts/build-covers.sh สร้าง .jpg คู่กับ .webp ทุกใบ
 * เครื่องมือที่ภาพปกไม่ใช่ WebP (ยังไม่มีคู่ JPEG) จะใช้ภาพเริ่มต้นของเว็บ
 */
export function resolveOgImage(tool: Pick<ToolMeta, 'slug' | 'name' | 'coverImage' | 'coverAlt'>): OgImage {
  const cover = resolveCover(tool);
  const hasJpeg = !cover.isFallback && cover.src.startsWith(`${COVER_DIR}/`) && cover.src.endsWith('.webp');
  return {
    src: hasJpeg
      ? cover.src.replace(COVER_DIR, OG_DIR).replace(/\.webp$/, '.jpg')
      : DEFAULT_OG_IMAGE,
    alt: hasJpeg ? cover.alt : 'ทูลสยาม ToolSiam — เครื่องมือออนไลน์ภาษาไทย ใช้ฟรี',
    width: COVER_WIDTH,
    height: COVER_HEIGHT,
  };
}
