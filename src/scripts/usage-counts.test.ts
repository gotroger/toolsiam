// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest';
import { fillUsageCounts } from './usage-counts';
import { __setUsageSummaryForTests } from '@/lib/usage-client';
import { USE_DISPLAY_THRESHOLD } from '@/lib/usage';

beforeEach(() => {
  document.body.innerHTML = `
    <span id="card" data-usage-slug="baht-text"></span>
    <span id="react" data-usage-slug="baht-text" data-usage-managed>ของ React</span>
    <span id="low" data-usage-slug="age-days"></span>
    <p id="note" data-usage-note hidden><span id="long" data-usage-slug="baht-text" data-usage-format="long"></span></p>`;
});

it('เติมเฉพาะช่องที่ไม่ใช่ของ React · ยอดต่ำกว่าเกณฑ์ปล่อยว่าง · ข้อความยาวเปิดกล่องหมายเหตุ', async () => {
  __setUsageSummaryForTests({
    generatedAt: 'x',
    tools: { 'baht-text': { total: 1500, recent: 9 }, 'age-days': { total: USE_DISPLAY_THRESHOLD - 1, recent: 1 } },
  });
  await fillUsageCounts();
  const text = (id: string) => document.getElementById(id)!.textContent;
  expect(text('card')).toBe('ใช้ไปแล้ว 1,500 ครั้ง');
  expect(text('react')).toBe('ของ React');
  expect(text('low')).toBe('');
  expect(text('long')).toBe('มีคนใช้เครื่องมือนี้แล้ว 1,500 ครั้ง');
  expect(document.getElementById('note')).not.toHaveAttribute('hidden');
});

it('ไม่มีข้อมูล (ระบบปิด) → ทุกช่องว่างและหมายเหตุยังซ่อน', async () => {
  __setUsageSummaryForTests(null);
  await fillUsageCounts();
  expect(document.getElementById('card')!.textContent).toBe('');
  expect(document.getElementById('note')).toHaveAttribute('hidden');
});
