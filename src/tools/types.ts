/** หมวดที่มีหน้า /categories/<id> + vertical ที่มี landingPath ของตัวเอง (§8) */
export type CategoryId =
  | 'finance' | 'loan' | 'business' | 'land' | 'date' | 'daily' | 'qr'
  | 'lottery' | 'dream' | 'horoscope';

/** อัตรา/กฎหมายที่เครื่องมืออ้างอิง → Trust panel (§17) */
export interface RateSource {
  /** วันที่อัตรา/กฎหมายเริ่มมีผลบังคับ */
  effectiveFrom: string;
  /** วันที่ตรวจกับแหล่งทางการล่าสุด (อัปเดตได้แม้ค่าไม่เปลี่ยน) */
  lastVerifiedAt: string;
  sourceName: string;
  sourceUrl: string;
  /** สรุปอัตราที่ใช้ เขียนจากค่าจริงใน src/lib/rates/* */
  summary: string;
}

export interface ToolMeta {
  /** URL: /tools/<slug> */
  slug: string;
  /** ชื่อไทย ใช้เป็น h1 */
  name: string;
  nameEn: string;
  /** null = ปลดระวางแล้ว ต้องมี retired + hidden + noindex พร้อมกัน (§18) */
  category: CategoryId | null;
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

  /* ---- สถานะและการจัดลำดับ ---- */
  /** ไม่แสดงในรายการ/ค้นหา/related */
  hidden?: boolean;
  /** ไม่เข้า sitemap + <meta name="robots" content="noindex"> */
  noindex?: boolean;
  /** ปลดระวาง — URL ยัง 200 แต่ไม่ได้รับการดูแลเชิง SEO อีกต่อไป */
  retired?: boolean;
  /** slug ของเครื่องมือที่เกี่ยวข้อง ข้ามหมวดได้ — มาก่อน related อัตโนมัติเสมอ */
  related?: string[];
  /** ลำดับ "เครื่องมือแนะนำ" ที่ทีมเลือกเอง (ไม่ใช่ข้อมูลการใช้งานจริง) สูง = มาก่อน (§19) */
  featuredRank?: number;
  /** วันที่หน้า/logic ถูกแก้จริง → dateModified ใน JSON-LD (§16) */
  contentUpdatedAt?: string;
  /** อัตรา/กฎหมายที่อ้างอิง → Trust panel (§17) */
  rates?: RateSource[];
  disclaimer?: string;
  assumptions?: string[];
}

export interface CategoryMeta {
  id: CategoryId;
  name: string;
  nameEn: string;
  description: string;
  /** emoji */
  icon: string;
  /** สีพื้นของปกสำรอง [เริ่ม, จบ] ของ gradient — ใช้โดย scripts/gen-fallback-covers.mjs (§15.2 ชั้น A) */
  gradient: [string, string];
  order: number;
  /** 'planned' = ยังไม่มีเครื่องมือ → ไม่ build ไม่แสดง ไม่ index ไม่เข้า sitemap */
  status: 'active' | 'planned';
  /** ถ้ามี = หมวดนี้มี vertical เป็นบ้านหลัก → ไม่สร้างหน้า /categories/<id> */
  landingPath?: string;
  /**
   * ข้อความใต้ชื่อหมวดในหน้าแรก สำหรับ vertical ที่ไม่ได้นับเป็น "จำนวนเครื่องมือ"
   * บังคับให้มีคู่กับ landingPath เสมอ (registry.test.ts) — ไม่งั้นหน้าแรกจะขึ้น "0 เครื่องมือ"
   */
  linkLabel?: string;
}
