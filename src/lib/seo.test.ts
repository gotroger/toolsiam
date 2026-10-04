import { describe, it, expect } from 'vitest';
import {
  breadcrumbJsonLd,
  collectionPageJsonLd,
  organizationJsonLd,
  toolJsonLd,
  truncateDescription,
  websiteJsonLd,
} from './seo';
import type { ToolMeta } from '@/tools/types';

const tool: ToolMeta = {
  slug: 'x',
  name: 'เครื่องมือ X',
  nameEn: 'X',
  category: 'daily',
  description: 'คำอธิบายยาวพอสมควรสำหรับทดสอบ JSON-LD ของเครื่องมือ',
  keywords: ['a', 'b', 'c'],
  howTo: ['1', '2'],
  faq: [
    { q: 'ถาม1', a: 'ตอบ1' },
    { q: 'ถาม2', a: 'ตอบ2' },
  ],
};

describe('toolJsonLd', () => {
  it('คืน SoftwareApplication และ FAQPage', () => {
    const [app, faq] = toolJsonLd(tool, 'https://toolsiam.com/tools/x') as any[];
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.name).toBe('เครื่องมือ X');
    expect(app.url).toBe('https://toolsiam.com/tools/x');
    expect(app.isAccessibleForFree).toBe(true);
    expect(app.offers).toBeUndefined();
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('ตอบ1');
  });
  it('dateModified มาจาก contentUpdatedAt และไม่ใส่เมื่อไม่มีวันที่ (§16)', () => {
    const [withDate] = toolJsonLd({ ...tool, contentUpdatedAt: '2026-09-08' }, 'https://toolsiam.com/tools/x') as any[];
    expect(withDate.dateModified).toBe('2026-09-08');
    const [withoutDate] = toolJsonLd(tool, 'https://toolsiam.com/tools/x') as any[];
    expect(withoutDate).not.toHaveProperty('dateModified');
  });
  it('ไม่ประกาศราคาใด ๆ เพราะไม่มี paywall จริง (§20 M7)', () => {
    const json = JSON.stringify(toolJsonLd(tool, 'https://toolsiam.com/tools/x'));
    expect(json).not.toContain('Offer');
    expect(json).not.toContain('priceCurrency');
  });
});

describe('structured data ของหน้ารวมและ breadcrumb', () => {
  it('BreadcrumbList เรียงตำแหน่งและใช้ URL เต็ม', () => {
    const b = breadcrumbJsonLd([
      { name: 'ทูลสยาม', path: '/' },
      { name: 'เครื่องมือทั้งหมด', path: '/tools' },
      { name: 'คำนวณอายุ', path: '/tools/age-days' },
    ]) as any;
    expect(b['@type']).toBe('BreadcrumbList');
    expect(b.itemListElement).toHaveLength(3);
    expect(b.itemListElement[0].position).toBe(1);
    expect(b.itemListElement[2].item).toBe('https://toolsiam.com/tools/age-days');
  });

  it('WebSite ไม่มี SearchAction', () => {
    const w = websiteJsonLd() as any;
    expect(w['@type']).toBe('WebSite');
    expect(w.potentialAction).toBeUndefined();
    expect(JSON.stringify(w)).not.toContain('SearchAction');
  });

  it('Organization ชี้โดเมนจริง', () => {
    const o = organizationJsonLd() as any;
    expect(o['@type']).toBe('Organization');
    expect(o.url).toBe('https://toolsiam.com/');
  });

  it('โลโก้ Organization เป็นภาพจัตุรัสอย่างน้อย 112×112 ตามข้อกำหนดของ Google', () => {
    const { logo } = organizationJsonLd() as any;
    expect(logo.url).toBe('https://toolsiam.com/favicon-192.png');
    expect(logo.width).toBeGreaterThanOrEqual(112);
    expect(logo.height).toBe(logo.width);
  });

  it('CollectionPage ห่อ ItemList ที่นับจำนวนถูก', () => {
    const c = collectionPageJsonLd({
      name: 'การเงินและภาษี',
      description: 'คำอธิบาย',
      path: '/categories/finance',
      items: [
        { name: 'ก', path: '/tools/a' },
        { name: 'ข', path: '/tools/b' },
      ],
    }) as any;
    expect(c['@type']).toBe('CollectionPage');
    expect(c.url).toBe('https://toolsiam.com/categories/finance');
    expect(c.mainEntity['@type']).toBe('ItemList');
    expect(c.mainEntity.numberOfItems).toBe(2);
    expect(c.mainEntity.itemListElement[1].url).toBe('https://toolsiam.com/tools/b');
  });
});

describe('truncateDescription', () => {
  it('ข้อความสั้นคืนตามเดิม', () => {
    expect(truncateDescription('สั้น ๆ')).toBe('สั้น ๆ');
  });
  it('ตัดที่ช่องว่างสุดท้าย ไม่ตัดกลางคำ', () => {
    const text = `${'ก'.repeat(100)} ความหมายเชิงจิตวิทยา ${'ข'.repeat(60)}`;
    const out = truncateDescription(text);
    expect(out).toBe(`${'ก'.repeat(100)} ความหมายเชิงจิตวิทยา…`);
    expect(out.length).toBeLessThanOrEqual(155);
  });
  it('ไม่มีช่องว่างให้ตัด ก็ยังไม่เกินความยาวที่กำหนด', () => {
    expect(truncateDescription('ก'.repeat(300))).toHaveLength(155);
  });
});
