import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DRAWS } from '@/data/lottery';
import { getLotteryDrawUrl } from '@/lib/routes';
import { latestDrawPath } from './sitemap';

describe('latestDrawPath', () => {
  it('เลือกงวดใหม่สุดจากชื่อไฟล์ และข้ามไฟล์อื่นที่ไม่ใช่ข้อมูลงวด', () => {
    expect(latestDrawPath(['2026-09-01.json', 'schema.ts', '2026-09-16.json', 'index.ts'])).toBe(
      '/lottery/results/2026-09-16',
    );
    expect(latestDrawPath(['index.ts'])).toBeNull();
  });

  it('ตรงกับงวดที่หน้า /lottery ถือว่าเป็นงวดล่าสุด (DRAWS[0])', () => {
    const files = readdirSync(new URL('../data/lottery/', import.meta.url));
    expect(latestDrawPath(files)).toBe(DRAWS[0] ? getLotteryDrawUrl(DRAWS[0].drawDate) : null);
  });
});
