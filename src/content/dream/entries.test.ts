import { describe, it, expect } from 'vitest';
import { DREAM_ENTRIES, DREAM_GROUPS, dreamBySlug, dreamsByGroup } from './entries';

describe('ตำราทำนายฝัน', () => {
  it('มีอย่างน้อย 30 เรื่องตามที่ Phase 3 กำหนด', () => {
    expect(DREAM_ENTRIES.length).toBeGreaterThanOrEqual(30);
  });

  it('slug ไม่ซ้ำและเป็น kebab-case ภาษาอังกฤษ', () => {
    const slugs = DREAM_ENTRIES.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const s of slugs) expect(s, s).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it('ทุกเรื่องอยู่ในหมวดที่มีจริง', () => {
    const ids = new Set(DREAM_GROUPS.map((g) => g.id));
    for (const e of DREAM_ENTRIES) expect(ids.has(e.group as never), `${e.slug} → ${e.group}`).toBe(true);
  });

  it('ทุกหมวดมีเนื้อหาอย่างน้อยหนึ่งเรื่อง — หมวดว่างห้ามโผล่บนหน้าเว็บ', () => {
    for (const g of DREAM_GROUPS) expect(dreamsByGroup(g.id).length, g.id).toBeGreaterThan(0);
  });

  it('ทุกเรื่องเขียนครบทุกส่วน ไม่ใช่ template ว่าง', () => {
    for (const e of DREAM_ENTRIES) {
      expect(e.title.length, e.slug).toBeGreaterThan(5);
      expect(e.meaning.length, e.slug).toBeGreaterThan(100);
      expect(e.advice.length, e.slug).toBeGreaterThan(50);
      expect(e.keywords.length, e.slug).toBeGreaterThanOrEqual(3);
      expect(e.contexts.length, e.slug).toBeGreaterThanOrEqual(3);
      for (const c of e.contexts) {
        expect(c.when.length, `${e.slug} · ${c.when}`).toBeGreaterThan(2);
        expect(c.meaning.length, `${e.slug} · ${c.when}`).toBeGreaterThan(30);
      }
    }
  });

  it('related ชี้ไปเรื่องที่มีจริงและไม่ชี้ตัวเอง', () => {
    for (const e of DREAM_ENTRIES) {
      for (const slug of e.related) {
        expect(dreamBySlug(slug), `${e.slug} → ${slug}`).toBeDefined();
        expect(slug).not.toBe(e.slug);
      }
    }
  });

  it('ไม่มีเลขเด็ดหรือการชวนเสี่ยงโชค — เป็นข้อจำกัดของเว็บ ไม่ใช่แค่สไตล์', () => {
    const banned = /เลขเด็ด|เลขนำโชค|ซื้อหวย|แทงหวย|เลขท้าย|งวดนี้|ถูกรางวัล/;
    for (const e of DREAM_ENTRIES) {
      const text = [e.title, e.meaning, e.advice, ...e.contexts.map((c) => c.meaning)].join(' ');
      expect(banned.test(text), e.slug).toBe(false);
    }
  });

  it('ไม่ทำนายความเป็นความตายหรือโรคของบุคคล', () => {
    const banned = /จะตาย|เสียชีวิตแน่|เป็นมะเร็ง|อายุสั้น/;
    for (const e of DREAM_ENTRIES) {
      const text = [e.meaning, e.advice, ...e.contexts.map((c) => c.meaning)].join(' ');
      expect(banned.test(text), e.slug).toBe(false);
    }
  });

  it('dreamBySlug หาไม่เจอคืน undefined', () => {
    expect(dreamBySlug('snake')!.title).toBe('ฝันเห็นงู');
    expect(dreamBySlug('ไม่มีจริง')).toBeUndefined();
  });
});
