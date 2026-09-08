import { describe, it, expect } from 'vitest';
import { getRelatedTools, getVisibleTools, getBrowsableCategories, getToolsByCategory } from '@/tools/registry';
import { DREAM_ENTRIES } from '@/content/dream/entries';

/**
 * Internal linking audit (Phase 5)
 *
 * เป็นเทสต์แทนการตรวจด้วยมือครั้งเดียว เพราะโครงสร้างลิงก์พังได้ทุกครั้งที่เพิ่มเครื่องมือ
 * — การตรวจครั้งเดียวตอนจบเฟสจะหมดอายุทันทีที่เฟสถัดไปเริ่ม
 */
describe('internal linking audit', () => {
  it('ทุกเครื่องมือที่แสดงอยู่ ถูกลิงก์ถึงจากเครื่องมืออื่นอย่างน้อยหนึ่งตัว — ไม่มีหน้ากำพร้า', () => {
    const linkedTo = new Set<string>();
    for (const tool of getVisibleTools()) {
      for (const t of getRelatedTools(tool, 6)) linkedTo.add(t.slug);
    }
    const orphans = getVisibleTools().map((t) => t.slug).filter((s) => !linkedTo.has(s));
    expect(orphans).toEqual([]);
  });

  it('ทุกเครื่องมือมีลิงก์ออกไปหาเครื่องมืออื่นอย่างน้อยสองตัว — ไม่มีหน้าทางตัน', () => {
    const deadEnds = getVisibleTools()
      .filter((t) => getRelatedTools(t, 6).length < 2)
      .map((t) => t.slug);
    expect(deadEnds).toEqual([]);
  });

  it('related ที่กำหนดมือไม่ชี้ออกนอกหมวดจนหมด — อย่างน้อยหนึ่งลิงก์ต้องอยู่ในหมวดเดียวกัน', () => {
    const isolated = getVisibleTools()
      .filter((t) => t.category !== null && getToolsByCategory(t.category).length > 1)
      .filter((t) => getRelatedTools(t, 6).every((r) => r.category !== t.category))
      .map((t) => t.slug);
    expect(isolated).toEqual([]);
  });

  it('ทุกหมวดที่มีหน้าของตัวเองมีเครื่องมือพอจะไม่เป็นหมวดหน้าเดียว', () => {
    const thin = getBrowsableCategories()
      .filter((c) => getToolsByCategory(c.id).length < 2)
      .map((c) => c.id);
    expect(thin).toEqual([]);
  });

  it('ทุกเรื่องในตำราฝันถูกลิงก์ถึงจากเรื่องอื่นอย่างน้อยหนึ่งเรื่อง', () => {
    const linkedTo = new Set(DREAM_ENTRIES.flatMap((e) => e.related));
    const orphans = DREAM_ENTRIES.map((e) => e.slug).filter((s) => !linkedTo.has(s));
    expect(orphans).toEqual([]);
  });

  it('ทุกเรื่องในตำราฝันมีลิงก์ออกอย่างน้อยสามเรื่อง', () => {
    const thin = DREAM_ENTRIES.filter((e) => e.related.length < 3).map((e) => e.slug);
    expect(thin).toEqual([]);
  });
});
