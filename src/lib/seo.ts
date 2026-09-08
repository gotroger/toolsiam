import type { ToolMeta } from '@/tools/types';
import { SITE, absoluteUrl, getHomeUrl } from '@/lib/routes';

const SITE_NAME = 'ทูลสยาม ToolSiam';

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
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: tool.faq.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    },
  ];
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
    logo: absoluteUrl('/logo.png'),
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
