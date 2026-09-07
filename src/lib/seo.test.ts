import { describe, it, expect } from 'vitest';
import { toolJsonLd } from './seo';
import type { ToolMeta } from '@/tools/types';

const tool: ToolMeta = {
  slug: 'x', name: 'เครื่องมือ X', nameEn: 'X', category: 'dev', tier: 'free',
  description: 'คำอธิบายยาวพอสมควรสำหรับทดสอบ JSON-LD ของเครื่องมือ',
  keywords: ['a', 'b', 'c'], howTo: ['1', '2'],
  faq: [{ q: 'ถาม1', a: 'ตอบ1' }, { q: 'ถาม2', a: 'ตอบ2' }],
};

describe('toolJsonLd', () => {
  it('คืน SoftwareApplication และ FAQPage', () => {
    const [app, faq] = toolJsonLd(tool, 'https://toolsiam.com/t/x') as any[];
    expect(app['@type']).toBe('SoftwareApplication');
    expect(app.name).toBe('เครื่องมือ X');
    expect(app.url).toBe('https://toolsiam.com/t/x');
    expect(app.offers.price).toBe('0');
    expect(faq['@type']).toBe('FAQPage');
    expect(faq.mainEntity).toHaveLength(2);
    expect(faq.mainEntity[0].acceptedAnswer.text).toBe('ตอบ1');
  });
  it('premium ใส่ราคา 99', () => {
    const [app] = toolJsonLd({ ...tool, tier: 'premium' }, 'https://toolsiam.com/t/x') as any[];
    expect(app.offers.price).toBe('99');
  });
});
