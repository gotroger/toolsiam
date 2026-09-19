import { describe, expect, it } from 'vitest';
import { getVisibleTools } from '@/tools/registry';
import { TOOL_GLYPHS } from './tool-glyphs';

describe('ไอคอนเฉพาะตัวของเครื่องมือ', () => {
  it('เครื่องมือที่แสดงอยู่ทุกชิ้นมีไอคอนของตัวเอง ไม่ตกไปใช้ไอคอนหมวด', () => {
    const missing = getVisibleTools()
      .map((t) => t.slug)
      .filter((slug) => !TOOL_GLYPHS[slug]);
    expect(missing).toEqual([]);
  });

  it('ไม่มีสองเครื่องมือที่ใช้ไอคอนเดียวกัน', () => {
    const paths = Object.values(TOOL_GLYPHS);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
