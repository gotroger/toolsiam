import { describe, it, expect } from 'vitest';
import { breadcrumbJsonLd, collectionPageJsonLd, organizationJsonLd, toolJsonLd, websiteJsonLd } from './seo';
import type { ToolMeta } from '@/tools/types';

const tool: ToolMeta = {
  slug: 'x', name: 'เครื่องมือ X', nameEn: 'X', category: 'dev', tier: 'free',
  description: 'คำอธิบายยาวพอสมควรสำหรับทดสอบ JSON-LD ของเครื่องมือ',
  keywords: ['a', 'b', 'c'], howTo: ['1', '2'],
  faq: [{ q: 'ถาม1', a: 'ตอบ1' }, { q: 'ถาม2', a: 'ตอบ2' }],
};

describe('toolJsonLd', () => {
  it('คืน SoftwareApplication และ FAQPage', () => {
    const [app, faq] = toolJsonLd(tool, 'https://toolsiam.com/tools/x') as any[];
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.name).toBe('เครื่องมือ X');
    expect(app.url).toBe('https://toolsiam.com/tools/x');
    expect(app.offers.price).toBe('0');
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('ตอบ1');
  });
  it('premium ใส่ราคา 99', () => {
    const [app] = toolJsonLd({ ...tool, tier: 'premium' }, 'https://toolsiam.com/tools/x') as any[];
    expect(app.offers.price).toBe('99');
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

  it('CollectionPage ห่อ ItemList ที่นับจำนวนถูก', () => {
    const c = collectionPageJsonLd({
      name: 'การเงินและภาษี',
      description: 'คำอธิบาย',
      path: '/categories/finance',
      items: [{ name: 'ก', path: '/tools/a' }, { name: 'ข', path: '/tools/b' }],
    }) as any;
    expect(c['@type']).toBe('CollectionPage');
    expect(c.url).toBe('https://toolsiam.com/categories/finance');
    expect(c.mainEntity['@type']).toBe('ItemList');
    expect(c.mainEntity.numberOfItems).toBe(2);
    expect(c.mainEntity.itemListElement[1].url).toBe('https://toolsiam.com/tools/b');
  });
});
