import type { ToolMeta } from '@/tools/types';
import { SITE, absoluteUrl, getHomeUrl } from '@/lib/routes';

const SITE_NAME = 'ทูลสยาม ToolSiam';

/**
 * ย่อข้อความยาวให้พอเป็น meta description โดยตัดที่ช่องว่าง
 *
 * ภาษาไทยไม่เว้นวรรคระหว่างคำ แต่เว้นระหว่างวลี — ตัดที่ช่องว่างจึงไม่ทิ้งคำขาดกลางคัน
 * อย่าง "เชิงจ…" หรือสระที่หลุดจากพยัญชนะ (slice ตรง ๆ ตัด "จำเป็น" เหลือ "จำเป็")
 */
export function truncateDescription(text: string, max = 155): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  // ไม่มีช่องว่างในช่วงครึ่งหลัง — ยอมตัดตรง ๆ ดีกว่าได้คำอธิบายสั้นกุด
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

export function toolJsonLd(tool: ToolMeta, url: string): Record<string, unknown>[] {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: tool.name,
      alternateName: tool.nameEn,
      url,
      description: tool.description,
      applicationCategory: 'UtilitiesApplication',
      operatingSystem: 'Web',
      inLanguage: 'th',
      // ทุกเครื่องมือใช้ฟรี ไม่มี paywall — ประกาศตรง ๆ แทนการ emit offers ที่ราคาไม่จริง (§20 M7)
      isAccessibleForFree: true,
      ...(tool.contentUpdatedAt && { dateModified: tool.contentUpdatedAt }),
    },
    faqJsonLd(tool.faq),
  ];
}

/** FAQPage — ใช้ทั้งหน้าเครื่องมือและหน้าเนื้อหาที่มีคำถามที่พบบ่อยของตัวเอง เช่น /premium */
export function faqJsonLd(faq: { q: string; a: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

/** ขั้นหนึ่งของ breadcrumb — ขั้นสุดท้ายคือหน้าปัจจุบัน (ไม่เป็นลิงก์ แต่ยังมี item ใน JSON-LD) */
export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(items: Crumb[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: absoluteUrl(c.path),
    })),
  };
}

export function organizationJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: absoluteUrl(getHomeUrl()),
    /**
     * ใช้สัญลักษณ์สี่เหลี่ยมจัตุรัส ไม่ใช่ /logo.png บน header — Google กำหนดโลโก้ขององค์กร
     * ต้องไม่เล็กกว่า 112×112 px แต่โลโก้แนวนอนสูงแค่ 96 px จึงไม่ถูกนำไปใช้
     */
    logo: { '@type': 'ImageObject', url: absoluteUrl('/favicon-192.png'), width: 192, height: 192 },
  };
}

/** ไม่มี potentialAction / SearchAction โดยตั้งใจ (§25.3) */
export function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE,
    inLanguage: 'th',
  };
}

/** หน้ารวมรายการ (/tools, /categories/<id>) — CollectionPage ที่มี ItemList อยู่ข้างใน */
export function collectionPageJsonLd(page: {
  name: string;
  description: string;
  path: string;
  items: { name: string; path: string }[];
}): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: absoluteUrl(page.path),
    inLanguage: 'th',
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: page.items.length,
      itemListElement: page.items.map((item, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: item.name,
        url: absoluteUrl(item.path),
      })),
    },
  };
}
