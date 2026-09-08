import { describe, it, expect } from 'vitest';
import {
  tools, categories, getTool, getToolsByCategory, getCategory,
  getActiveCategories, getBrowsableCategories, getFeaturedTools, getRelatedTools, getVisibleTools,
} from './registry';
import { toolLoaders } from './loaders';
import { categoryCoverPath, DEFAULT_OG_IMAGE, FALLBACK_COVER, resolveCover, resolveOgImage } from './covers';
import { NOINDEX_CATEGORY_IDS, NOINDEX_TOOL_SLUGS } from '@/lib/noindex';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fallbackCoverPath, fallbackCoverSvg, parseCategories } from '../../scripts/gen-fallback-covers.mjs';

describe('registry', () => {
  it('slug ไม่ซ้ำและเป็น kebab-case', () => {
    const slugs = tools.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('ทุกเครื่องมืออยู่ในหมวดที่มีจริง (หรือ null) และมีเนื้อหา SEO ครบ', () => {
    const ids = new Set<string>(categories.map((c) => c.id));
    for (const t of tools) {
      if (t.category !== null) expect(ids.has(t.category)).toBe(true);
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
    expect(getCategory('finance').id).toBe('finance');
    for (const c of categories) {
      for (const t of getToolsByCategory(c.id)) expect(t.category).toBe(c.id);
    }
  });
});

/** §8.4 — หมวดว่างห้ามแสดง และ vertical ไม่มีหน้า /categories/ */
describe('หมวด', () => {
  it('id ไม่ซ้ำ และ order ไม่ซ้ำ', () => {
    expect(new Set(categories.map((c) => c.id)).size).toBe(categories.length);
    expect(new Set(categories.map((c) => c.order)).size).toBe(categories.length);
  });

  it('หมวด active ที่มีหน้าของตัวเอง ต้องมีเครื่องมืออย่างน้อย 1 ตัว', () => {
    for (const c of getBrowsableCategories()) {
      expect(getToolsByCategory(c.id).length).toBeGreaterThan(0);
    }
  });

  it('หมวด planned ต้องไม่มีเครื่องมือ และไม่ถูก build', () => {
    const planned = categories.filter((c) => c.status === 'planned');
    for (const c of planned) expect(getToolsByCategory(c.id)).toEqual([]);
    const built = new Set(getBrowsableCategories().map((c) => c.id));
    for (const c of planned) expect(built.has(c.id)).toBe(false);
  });

  it('vertical ที่มี landingPath ไม่สร้างหน้า /categories/', () => {
    for (const c of getBrowsableCategories()) expect(c.landingPath).toBeUndefined();
  });

  it('vertical ที่เปิดใช้แล้วต้องมี linkLabel และหมวดเครื่องมือต้องไม่มี', () => {
    // หน้าแรกแสดง linkLabel แทน "n เครื่องมือ" ให้ vertical — หมวด planned ยังไม่ขึ้นหน้าแรกจึงยังไม่ต้องมี
    for (const c of getActiveCategories()) {
      if (c.landingPath) expect(c.linkLabel, c.id).toBeTruthy();
      else expect(c.linkLabel, c.id).toBeUndefined();
    }
  });

  it('getActiveCategories เรียงตาม order', () => {
    const orders = getActiveCategories().map((c) => c.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });
});

/** §18 — เครื่องมือปลดระวางต้องมี flag ครบทั้งชุด */
describe('เครื่องมือที่ปลดระวาง', () => {
  it('category === null ↔ retired && hidden && noindex', () => {
    for (const t of tools) {
      const retiredSet = t.retired === true && t.hidden === true && t.noindex === true;
      expect(t.category === null).toBe(retiredSet);
    }
  });

  it('เครื่องมือ hidden ไม่โผล่ในรายการที่ผู้ใช้เห็น', () => {
    const visible = new Set(getVisibleTools().map((t) => t.slug));
    for (const t of tools.filter((t) => t.hidden)) {
      expect(visible.has(t.slug)).toBe(false);
      for (const c of categories) {
        expect(getToolsByCategory(c.id).some((x) => x.slug === t.slug)).toBe(false);
      }
    }
  });
});

/** §13.4 — related ที่กำหนดมือ */
describe('related', () => {
  it('ทุก slug ใน related มีอยู่จริง ไม่ชี้ตัวเอง และไม่ชี้เครื่องมือที่ hidden', () => {
    for (const t of tools) {
      for (const slug of t.related ?? []) {
        const target = getTool(slug);
        expect(target, `${t.slug} → ${slug}`).toBeDefined();
        expect(slug).not.toBe(t.slug);
        expect(target!.hidden).toBeUndefined();
      }
    }
  });

  it('getRelatedTools เอา related ที่กำหนดมือขึ้นก่อน แล้วเติมด้วยหมวดเดียวกัน', () => {
    const ageDays = getTool('age-days')!;
    const related = getRelatedTools(ageDays, 4);
    expect(related[0].slug).toBe('thai-year-convert');
    expect(related.some((t) => t.slug === 'age-days')).toBe(false);
    expect(new Set(related.map((t) => t.slug)).size).toBe(related.length);
  });

  it('เครื่องมือที่ปลดระวางไม่มี related', () => {
    for (const t of tools.filter((t) => t.category === null)) {
      expect(getRelatedTools(t)).toEqual([]);
    }
  });
});

/** §19 — เครื่องมือแนะนำที่ทีมเลือกเอง */
describe('featuredRank', () => {
  it('เรียงจากมากไปน้อยและไม่มีตัวที่ hidden', () => {
    const featured = getFeaturedTools(8);
    expect(featured.length).toBeGreaterThan(0);
    const ranks = featured.map((t) => t.featuredRank!);
    expect(ranks).toEqual([...ranks].sort((a, b) => b - a));
    for (const t of featured) expect(t.hidden).toBeUndefined();
  });

  it('featuredRank ไม่ซ้ำกัน', () => {
    const ranks = tools.map((t) => t.featuredRank).filter((r) => r !== undefined);
    expect(new Set(ranks).size).toBe(ranks.length);
  });
});

describe('noindex list ตรงกับ registry', () => {
  it('NOINDEX_CATEGORY_IDS = หมวดที่ build แล้วแต่ยังว่าง (ตั้งแต่ 0B ต้องไม่มีเลย)', () => {
    const empty = getBrowsableCategories().filter((c) => getToolsByCategory(c.id).length === 0).map((c) => c.id);
    expect([...NOINDEX_CATEGORY_IDS].sort()).toEqual(empty.sort());
  });

  it('NOINDEX_TOOL_SLUGS ตรงกับ meta.noindex ทุกตัว', () => {
    const flagged = tools.filter((t) => t.noindex).map((t) => t.slug);
    expect([...NOINDEX_TOOL_SLUGS].sort()).toEqual(flagged.sort());
    for (const slug of NOINDEX_TOOL_SLUGS) expect(getTool(slug)).toBeDefined();
  });
});

describe('covers', () => {
  it('ทุกเครื่องมือ resolve ภาพปกได้ และไฟล์มีอยู่จริงใน public/ (ปกสำรองก็ผ่าน)', () => {
    // §15.3 — การไม่มีปกจริงต้องไม่ block การเพิ่มเครื่องมือ ตรวจแค่ว่าไฟล์ที่ชี้ไปมีอยู่จริง
    for (const t of tools) {
      const cover = resolveCover(t);
      expect(cover.alt.length).toBeGreaterThan(0);
      expect(existsSync(join('public', cover.src)), `${t.slug} → ${cover.src}`).toBe(true);
    }
  });

  it('ปกสำรองประจำหมวดมีครบทุกหมวด — รันซ้ำได้ด้วย npm run covers:fallback', () => {
    for (const c of categories) {
      expect(existsSync(join('public', categoryCoverPath(c.id))), c.id).toBe(true);
    }
  });

  it('ปกสำรองที่ generate ตรงกับข้อมูลใน categories.ts (สี + icon ปัจจุบัน)', () => {
    const parsed = parseCategories(readFileSync(join('src', 'tools', 'categories.ts'), 'utf8'));
    expect(parsed.map((c) => c.id).sort()).toEqual(categories.map((c) => c.id).sort());
    for (const c of parsed) {
      expect(readFileSync(join('public', fallbackCoverPath(c.id)), 'utf8')).toBe(fallbackCoverSvg(c));
    }
  });

  it('เครื่องมือที่มีปกจริงได้ og:image เป็น JPEG ที่มีไฟล์อยู่จริง', () => {
    for (const t of tools) {
      const og = resolveOgImage(t);
      expect(og.alt.length).toBeGreaterThan(0);
      expect(og.src.endsWith('.jpg')).toBe(true);
      expect(existsSync(join('public', og.src)), `${t.slug} → ${og.src}`).toBe(true);
      // P8 — ปกที่ไม่ใช่ .webp ของเครื่องมือเอง ต้องตกไปที่ภาพเริ่มต้นอย่างชัดเจน ไม่ใช่ path ที่ไม่มีไฟล์
      expect(og.isDefault).toBe(resolveCover(t).kind !== 'tool');
    }
  });

  it('ภาพ og เริ่มต้นของเว็บมีอยู่จริง', () => {
    expect(existsSync(join('public', DEFAULT_OG_IMAGE))).toBe(true);
  });

  it('เครื่องมือที่ปลดระวาง (ไม่มีหมวด) ใช้ปกสำรองสุดท้าย', () => {
    const cover = resolveCover({ slug: 'ยังไม่มีจริง', name: 'เครื่องมือใหม่', category: null });
    expect(cover.src).toBe(FALLBACK_COVER);
    expect(cover.kind).toBe('placeholder');
    expect(existsSync(join('public', FALLBACK_COVER))).toBe(true);
  });

  it('เครื่องมือใหม่ที่ยังไม่มีปกจริง ใช้ปกประจำหมวดได้ทันที', () => {
    const cover = resolveCover({ slug: 'ยังไม่มีจริง', name: 'เครื่องมือใหม่', category: 'finance' });
    expect(cover.src).toBe(categoryCoverPath('finance'));
    expect(cover.kind).toBe('category');
    expect(existsSync(join('public', cover.src))).toBe(true);
  });

  /** เชิงรายงาน — ไม่ fail ต่อให้ยังใช้ปกสำรอง (§15.3 ข้อ 1) */
  it('รายงานเครื่องมือที่ยังใช้ปกสำรอง', () => {
    const pending = tools.filter((t) => resolveCover(t).isFallback).map((t) => t.slug);
    if (pending.length > 0) {
      console.log(`ยังไม่มีปกจริง ${pending.length} ตัว: ${pending.join(', ')}`);
    }
    expect(Array.isArray(pending)).toBe(true);
  });
});

/** P9 — public/ ต้องมีแต่ไฟล์ที่ตั้งใจ deploy */
describe('public/ ไม่มีไฟล์ขยะ', () => {
  const ALLOWED_ROOT = new Set([
    '_redirects', 'robots.txt', 'favicon.ico', 'favicon.svg', 'favicon-32.png',
    'favicon-192.png', 'apple-touch-icon.png', 'logo.png',
  ]);
  const ALLOWED_DIRS = new Set(['covers', 'og']);

  it('ไฟล์ระดับบนสุดอยู่ใน allowlist ทั้งหมด', () => {
    for (const entry of readdirSync('public', { withFileTypes: true })) {
      if (entry.isDirectory()) expect(ALLOWED_DIRS.has(entry.name), entry.name).toBe(true);
      else expect(ALLOWED_ROOT.has(entry.name), entry.name).toBe(true);
    }
  });

  it('covers/ และ og/ มีแต่ไฟล์ภาพที่มีที่มา', () => {
    for (const f of readdirSync(join('public', 'covers'))) {
      expect(f, `public/covers/${f}`).toMatch(/^(_placeholder\.svg|_category-[a-z-]+\.svg|[a-z0-9-]+\.webp)$/);
    }
    for (const f of readdirSync(join('public', 'og'))) {
      expect(f, `public/og/${f}`).toMatch(/^(_default\.jpg|[a-z0-9-]+\.jpg)$/);
    }
  });
});
