import { describe, expect, it } from 'vitest';
import { DREAM_ENTRIES, DREAM_GROUPS } from '@/content/dream/entries';
import { normalizeDreamQuery, searchDreams } from './DreamSearch';

const labels = Object.fromEntries(DREAM_GROUPS.map((g) => [g.id, g.label]));
const slugs = (q: string) => searchDreams(DREAM_ENTRIES, q, labels).map((e) => e.slug);

describe('normalizeDreamQuery', () => {
  it('ตัดคำนำหน้า ฝัน / ฝันเห็น / ฝันว่า และช่องว่าง', () => {
    expect(normalizeDreamQuery('  ฝันเห็นงู ')).toBe('งู');
    expect(normalizeDreamQuery('ฝันว่า ฟันหลุด')).toBe('ฟันหลุด');
    expect(normalizeDreamQuery('ฝันงู')).toBe('งู');
    expect(normalizeDreamQuery('ฝัน')).toBe('');
  });
});

describe('searchDreams', () => {
  it('"ฝันเห็นงูตัวใหญ่" เจอเรื่องงู (เคยได้ 0 เรื่อง)', () => {
    expect(slugs('ฝันเห็นงูตัวใหญ่')).toEqual(['snake']);
  });

  it('คำเดียวแบบเดิมยังได้ผลเดิม', () => {
    expect(slugs('งู')).toContain('snake');
    expect(slugs('ฟันหลุด')).toEqual(['tooth-falling']);
  });

  it('ค้นหลายเรื่องพร้อมกันได้ เช่น งูกับปลา', () => {
    expect(slugs('งู ปลา').sort()).toEqual(['fish', 'snake']);
  });

  it('ไม่มีคำค้น = ทุกเรื่องตามลำดับเดิม และคำที่ไม่มีในตำรา = ว่าง', () => {
    expect(slugs('')).toHaveLength(DREAM_ENTRIES.length);
    expect(slugs('ฝันเห็น')).toHaveLength(DREAM_ENTRIES.length);
    expect(slugs('ยานอวกาศ')).toEqual([]);
  });
});
