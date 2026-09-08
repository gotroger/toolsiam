import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  SITE, absoluteUrl, getCategoryUrl, getDreamEntryUrl, getDreamUrl, getHomeUrl,
  getHoroscopePageUrl, getHoroscopeUrl, getLotteryDrawUrl, getLotteryUrl,
  getToolUrl, getToolsUrl, getZodiacSignUrl,
} from './routes';
import { isNoindexPath, normalizePath } from './noindex';

describe('routes', () => {
  it('สร้าง URL ตามโครงสร้างใหม่', () => {
    expect(getHomeUrl()).toBe('/');
    expect(getToolsUrl()).toBe('/tools');
    expect(getToolUrl('age-days')).toBe('/tools/age-days');
    expect(getCategoryUrl({ id: 'finance' })).toBe('/categories/finance');
    expect(getLotteryUrl()).toBe('/lottery');
    expect(getLotteryDrawUrl('2026-09-01')).toBe('/lottery/results/2026-09-01');
    expect(getDreamUrl()).toBe('/dream');
    expect(getDreamEntryUrl('snake')).toBe('/dream/snake');
    expect(getHoroscopeUrl()).toBe('/horoscope');
    expect(getHoroscopePageUrl('daily')).toBe('/horoscope/daily');
    expect(getZodiacSignUrl('aries')).toBe('/horoscope/zodiac/aries');
  });

  it('หมวดที่เป็น vertical ใช้ landingPath แทนหน้า /categories/', () => {
    expect(getCategoryUrl({ id: 'finance', landingPath: '/lottery' })).toBe('/lottery');
  });

  it('absoluteUrl ให้ URL เต็มบนโดเมนจริง', () => {
    expect(absoluteUrl(getToolUrl('baht-text'))).toBe(`${SITE}/tools/baht-text`);
  });

  it('ไม่มี URL ใดชนกับ pattern ของกฎ redirect (กัน loop §5.4)', () => {
    const targets = [getHomeUrl(), getToolsUrl(), getToolUrl('x'), getCategoryUrl({ id: 'date' }), getLotteryUrl()];
    for (const t of targets) {
      expect(t.startsWith('/t/')).toBe(false);
      expect(t.startsWith('/c/')).toBe(false);
      expect(t).not.toBe('/pricing');
    }
  });
});

describe('noindex', () => {
  it('normalizePath ตัด .html และ trailing slash รวม nested route', () => {
    expect(normalizePath('/tools/age-days.html')).toBe('/tools/age-days');
    expect(normalizePath('/tools/index.html')).toBe('/tools');
    expect(normalizePath('/lottery/results/2026-09-01.html')).toBe('/lottery/results/2026-09-01');
    expect(normalizePath('/')).toBe('/');
  });

  it('รู้ว่าหน้าไหน noindex', () => {
    expect(isNoindexPath('/tools/json-formatter')).toBe(true);
    expect(isNoindexPath('/tools/json-formatter.html')).toBe(true);
    expect(isNoindexPath('/404')).toBe(true);
    expect(isNoindexPath('/tools/age-days')).toBe(false);
    expect(isNoindexPath('/categories/finance')).toBe(false);
    // ตั้งแต่ 0B หมวดว่างไม่ถูก build เลย จึงไม่มีหน้าหมวดไหนที่ต้อง noindex (§8.4)
    expect(isNoindexPath('/categories/daily')).toBe(false);
    expect(isNoindexPath('/tools')).toBe(false);
    expect(isNoindexPath('/')).toBe(false);
  });
});

/** §14: ห้าม hardcode path เก่าในซอร์ส — routes.ts เป็นแหล่งเดียว */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

describe('ไม่มี URL เก่าหลงเหลือในซอร์ส', () => {
  const allowed = new Set(['src/lib/routes.test.ts']);

  it("ไม่มี '/t/', '/c/', '/pricing' นอกไฟล์ทดสอบ", () => {
    const offenders = walk('src')
      .filter((f) => !allowed.has(f) && !f.endsWith('.test.ts'))
      .filter((f) => /(["'`(])\/(t|c)\/|\/pricing/.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});

/** §20 M4–M8: ระบบ tier ถูกถอดทั้งหมด — ห้ามมีคำว่า tier หรือ "พรีเมียม" หลงเหลือในซอร์ส */
describe('ไม่มีร่องรอยระบบ tier เหลืออยู่', () => {
  it("ไม่มี 'tier' หรือ 'พรีเมียม' นอกไฟล์ทดสอบ", () => {
    const offenders = walk('src')
      .filter((f) => !f.endsWith('.test.ts'))
      .filter((f) => /tier|พรีเมียม/i.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });
});
