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
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  nameEn: string;
  description: string;
  /** emoji */
  icon: string;
}
