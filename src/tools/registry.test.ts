import { describe, it, expect } from 'vitest';
import { tools, categories, getTool, getToolsByCategory, getCategory } from './registry';
import { toolLoaders } from './loaders';
import { DEFAULT_OG_IMAGE, FALLBACK_COVER, resolveCover, resolveOgImage } from './covers';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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

describe('covers', () => {
  it('ทุกเครื่องมือ resolve ภาพปกได้ และไฟล์มีอยู่จริงใน public/', () => {
    for (const t of tools) {
      const cover = resolveCover(t);
      expect(cover.isFallback).toBe(false);
      expect(cover.alt.length).toBeGreaterThan(0);
      expect(existsSync(join('public', cover.src))).toBe(true);
    }
  });

  it('ทุกเครื่องมือมี og:image เป็น JPEG ที่มีไฟล์อยู่จริง', () => {
    for (const t of tools) {
      const og = resolveOgImage(t);
      expect(og.src.endsWith('.jpg')).toBe(true);
      expect(existsSync(join('public', og.src))).toBe(true);
      expect(og.alt.length).toBeGreaterThan(0);
    }
  });

  it('ภาพ og เริ่มต้นของเว็บมีอยู่จริง', () => {
    expect(existsSync(join('public', DEFAULT_OG_IMAGE))).toBe(true);
  });

  it('มีภาพสำรองสำหรับเครื่องมือที่ยังไม่มีภาพปก', () => {
    const cover = resolveCover({ slug: 'ยังไม่มีจริง', name: 'เครื่องมือใหม่' });
    expect(cover.src).toBe(FALLBACK_COVER);
    expect(cover.isFallback).toBe(true);
    expect(existsSync(join('public', FALLBACK_COVER))).toBe(true);
  });
});
