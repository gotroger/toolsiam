import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LATEST_API_URL } from './lottery-remote';
import { getLoginUrl, getMeApiUrl, getToolUrl } from './routes';

/**
 * อ่าน public/robots.txt แบบเดียวกับ Googlebot: กฎที่ path ยาวที่สุดชนะ · เท่ากันให้ Allow ชนะ
 * (RFC 9309 §2.2.2) — ไม่รองรับ wildcard เพราะไฟล์เราไม่ใช้
 */
const rules = readFileSync(join(process.cwd(), 'public', 'robots.txt'), 'utf8')
  .split('\n')
  .map((line) => line.replace(/#.*/, '').trim())
  .map((line) => /^(allow|disallow):\s*(\S+)$/i.exec(line))
  .filter((m): m is RegExpExecArray => m !== null)
  .map((m) => ({ allow: m[1].toLowerCase() === 'allow', path: m[2] }));

function crawlable(path: string): boolean {
  const best = rules
    .filter((r) => path.startsWith(r.path))
    .sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow))[0];
  return best?.allow ?? true;
}

describe('robots.txt', () => {
  it('หน้าเว็บทั่วไป crawl ได้', () => {
    expect(crawlable('/')).toBe(true);
    expect(crawlable(getToolUrl('qr-code'))).toBe(true);
  });

  it('บล็อก /api/ ที่ไม่ใช่เนื้อหา (ล็อกอิน ข้อมูลผู้ใช้)', () => {
    expect(crawlable(getLoginUrl())).toBe(false);
    expect(crawlable(getMeApiUrl())).toBe(false);
  });

  it('เปิดผลหวยงวดล่าสุดให้ Googlebot ดึงตอน render หน้าผลหวยได้', () => {
    expect(crawlable(LATEST_API_URL)).toBe(true);
  });
});
