import { describe, it, expect } from 'vitest';
import { tools, categories, getTool, getToolsByCategory, getCategory } from './registry';
import { toolLoaders } from './loaders';

describe('registry', () => {
  it('slug ไม่ซ้ำและเป็น kebab-case', () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('ทุกเครื่องมืออยู่ในหมวดที่มีจริง และมีเนื้อหา SEO ครบ', () => {
    const ids = new Set(categories.map((c) => c.id));
    for (const t of tools) {
      expect(ids.has(t.category)).toBe(true);
      expect(t.keywords.length).toBeGreaterThanOrEqual(3);
      expect(t.howTo.length).toBeGreaterThanOrEqual(2);
      expect(t.faq.length).toBeGreaterThanOrEqual(2);
      expect(t.description.length).toBeGreaterThanOrEqual(40);
    }
  });

  it('ทุกเครื่องมือมี loader และ loader ไม่มีส่วนเกิน', () => {
    expect(Object.keys(toolLoaders).sort()).toEqual(tools.map((t) => t.slug).sort());
  });

  it('helpers ทำงานถูก', () => {
    expect(getTool('not-exist')).toBeUndefined();
    expect(getCategory('finance').name).toBe('การเงินและภาษี');
    for (const c of categories) {
      for (const t of getToolsByCategory(c.id)) expect(t.category).toBe(c.id);
    }
  });
});
