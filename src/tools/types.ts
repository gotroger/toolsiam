export type CategoryId = 'finance' | 'text' | 'date' | 'qr' | 'image' | 'pdf' | 'dev' | 'web';
export type Tier = 'free' | 'premium';

export interface ToolMeta {
  /** URL: /t/<slug> */
  slug: string;
  /** ชื่อไทย ใช้เป็น h1 */
  name: string;
  nameEn: string;
  category: CategoryId;
  tier: Tier;
  /** 1–2 ประโยค ใช้เป็น meta description (≥ 40 ตัวอักษร) */
  description: string;
  /** คำค้นภาษาไทย (≥ 3) ใช้ในการค้นหาและ keywords */
  keywords: string[];
  /** ขั้นตอนการใช้งาน (≥ 2) */
  howTo: string[];
  /** คำถามที่พบบ่อย (≥ 2) → FAQPage JSON-LD */
  faq: { q: string; a: string }[];

  /* ---- ฝั่งแสดงผลเท่านั้น (optional) ---- */
  /** path ภาพปก 16:9 (แนะนำต้นฉบับ 1200×675) ถ้าไม่ระบุจะ fallback ตาม src/tools/covers.ts */
  coverImage?: string;
  /** alt ของภาพปก ถ้าไม่ระบุจะสร้างจากชื่อเครื่องมือ */
  coverAlt?: string;
  /** ป้ายสถานะบนการ์ด ถ้าไม่ระบุจะอนุมานจาก tier */
  tierLabel?: TierLabel;
}

/** ป้ายสถานะที่แสดงบนการ์ด — กว้างกว่า Tier เพราะบางเครื่องมือมีทั้งส่วนฟรีและพรีเมียม */
export type TierLabel = 'free' | 'freemium' | 'premium';

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  nameEn: string;
  description: string;
  /** emoji */
  icon: string;
}
