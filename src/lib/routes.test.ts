import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  SITE, absoluteUrl, getCategoryUrl, getDreamEntryUrl, getDreamUrl, getHomeUrl,
  getHoroscopePageUrl, getHoroscopeUrl, getLotteryDrawUrl, getLotteryUrl,
  getToolUrl, getToolsUrl, getZodiacSignUrl,
  getAccountUrl, getBillingStatusUrl, getLoginUrl, getLogoutUrl, getPremiumUrl, getPrivacyUrl, getTermsUrl,
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

  it('เส้นทางสมาชิก/พรีเมียม — /premium แทน /pricing ที่ปลดระวาง และ next ถูก encode', () => {
    expect(getPremiumUrl()).toBe('/premium');
    expect(getAccountUrl()).toBe('/account');
    expect(getPrivacyUrl()).toBe('/privacy');
    expect(getTermsUrl()).toBe('/terms');
    expect(getLoginUrl()).toBe('/api/auth/google/start');
    expect(getLoginUrl('/tools/pdf-merge?x=1')).toBe('/api/auth/google/start?next=%2Ftools%2Fpdf-merge%3Fx%3D1');
    expect(getLogoutUrl()).toBe('/api/auth/logout');
    expect(getBillingStatusUrl('a b')).toBe('/api/billing/status?ref=a%20b');
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
    // หน้าบัญชีขึ้นกับผู้ใช้ ไม่ควรถูก index · หน้าขายพรีเมียมเป็นเนื้อหาสาธารณะ
    expect(isNoindexPath('/account')).toBe(true);
    expect(isNoindexPath('/premium')).toBe(false);
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

  // ต้องมีเครื่องหมายคำพูดหรือวงเล็บนำหน้า จึงจะนับว่าเป็น "path ที่เขียนสด"
  // ไม่งั้นชื่อโมดูลอย่าง '@/lib/pricing' จะถูกจับผิดว่าเป็นลิงก์ไปหน้า /pricing ที่ปลดระวางไปแล้ว
  const OLD_PATH_RE = /(["'`(])\/(t\/|c\/|pricing)/;

  it("ไม่มี '/t/', '/c/', '/pricing' นอกไฟล์ทดสอบ", () => {
    const offenders = walk('src')
      .filter((f) => !allowed.has(f) && !f.endsWith('.test.ts'))
      .filter((f) => OLD_PATH_RE.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('จับ path เก่าที่เขียนสด แต่ไม่จับชื่อโมดูลที่บังเอิญลงท้ายเหมือนกัน', () => {
    expect(OLD_PATH_RE.test('href="/t/net-salary"')).toBe(true);
    expect(OLD_PATH_RE.test("getUrl('/c/finance')")).toBe(true);
    expect(OLD_PATH_RE.test('<a href="/pricing">')).toBe(true);
    expect(OLD_PATH_RE.test("import { x } from '@/lib/pricing';")).toBe(false);
  });
});

