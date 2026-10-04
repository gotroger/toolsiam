import { describe, expect, it } from 'vitest';
import {
  canSortByPopularity,
  displayCount,
  formatUseCount,
  formatUseCountLong,
  parseUsageSummary,
  POPULAR_SORT_MIN_TOOLS,
  recentSince,
  sortByPopularity,
  USE_DISPLAY_THRESHOLD,
  type UsageSummary,
} from './usage';

const summary = (tools: UsageSummary['tools']): UsageSummary => ({ generatedAt: '2026-10-04T00:00:00.000Z', tools });

describe('usage', () => {
  it('ตัวเลขใช้ตัวคั่นหลักพันชุดเดียวกับทั้งเว็บ', () => {
    expect(formatUseCount(1234)).toBe('ใช้ไปแล้ว 1,234 ครั้ง');
    expect(formatUseCountLong(1234567)).toBe('มีคนใช้เครื่องมือนี้แล้ว 1,234,567 ครั้ง');
  });

  it('ซ่อนตัวเลขจนกว่ายอดสะสมจะถึงเกณฑ์ — ไม่มีข้อมูลก็ซ่อน', () => {
    const s = summary({
      a: { total: USE_DISPLAY_THRESHOLD - 1, recent: 40 },
      b: { total: USE_DISPLAY_THRESHOLD, recent: 0 },
    });
    expect(displayCount(s, 'a')).toBeNull();
    expect(displayCount(s, 'b')).toBe(USE_DISPLAY_THRESHOLD);
    expect(displayCount(s, 'missing')).toBeNull();
    expect(displayCount(null, 'b')).toBeNull();
  });

  it('ตัวเลือกเรียง "ยอดนิยม" ต้องมีเครื่องมือผ่านเกณฑ์ครบจำนวน', () => {
    const tools: UsageSummary['tools'] = {};
    for (let i = 0; i < POPULAR_SORT_MIN_TOOLS - 1; i++) tools[`t${i}`] = { total: 100, recent: 10 };
    tools.low = { total: 3, recent: 3 };
    expect(canSortByPopularity(summary(tools))).toBe(false);
    tools.extra = { total: 100, recent: 1 };
    expect(canSortByPopularity(summary(tools))).toBe(true);
    expect(canSortByPopularity(null)).toBe(false);
  });

  it('เรียงด้วย recent → total → ลำดับเดิม และไม่แก้ array เดิม', () => {
    const list = [{ slug: 'a' }, { slug: 'b' }, { slug: 'c' }, { slug: 'd' }, { slug: 'e' }];
    const s = summary({
      a: { total: 10, recent: 5 },
      b: { total: 90, recent: 5 },
      c: { total: 1, recent: 9 },
      // d และ e ไม่มีข้อมูล = 0 เสมอกัน → คงลำดับเดิม
    });
    expect(sortByPopularity(list, s).map((t) => t.slug)).toEqual(['c', 'b', 'a', 'd', 'e']);
    expect(list.map((t) => t.slug)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(sortByPopularity(list, null).map((t) => t.slug)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('ช่วง 30 วันนับรวมวันนี้ และข้ามเดือน/ปี/ปีอธิกสุรทินได้', () => {
    expect(recentSince('2026-10-04')).toBe('2026-09-05');
    expect(recentSince('2026-01-10')).toBe('2025-12-12');
    expect(recentSince('2028-03-01', 2)).toBe('2028-02-29');
    expect(recentSince('2026-10-04', 1)).toBe('2026-10-04');
  });

  it('คำตอบที่รูปร่างผิดถือว่าไม่มีข้อมูล ช่องที่ผิดถูกตัดทิ้งรายตัว', () => {
    expect(parseUsageSummary(null)).toBeNull();
    expect(parseUsageSummary({ tools: {} })).toBeNull();
    expect(
      parseUsageSummary({
        generatedAt: 'x',
        tools: { ok: { total: 5, recent: 1 }, bad: { total: '5', recent: 1 }, nul: null },
      }),
    ).toEqual({ generatedAt: 'x', tools: { ok: { total: 5, recent: 1 } } });
  });
});
