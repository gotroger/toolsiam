import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SECURITY_HEADERS, withSecurityHeaders } from './middleware';

/** อ่านบล็อก `/*` ของ public/_headers เป็น { ชื่อ: ค่า } */
function staticBlock(): Record<string, string> {
  const lines = readFileSync(join(process.cwd(), 'public', '_headers'), 'utf8').split('\n');
  const start = lines.indexOf('/*');
  const out: Record<string, string> = {};
  for (const line of lines.slice(start + 1)) {
    if (!/^\s+\S/.test(line)) break;
    const i = line.indexOf(':');
    out[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return out;
}

describe('header ความปลอดภัย', () => {
  it('public/_headers (static) กับ middleware (/api/*) ใช้ชุดเดียวกันทุกตัว', () => {
    expect(staticBlock()).toEqual(SECURITY_HEADERS);
  });

  it('เติมให้คำตอบ JSON ธรรมดาโดยไม่แตะ header เดิม', () => {
    const res = withSecurityHeaders(
      new Response('{}', { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } }),
    );
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Content-Type')).toBe('application/json');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('redirect ที่ header แก้ไม่ได้ต้องไม่โยน error และ cookie ทุกตัวต้องอยู่ครบ', async () => {
    const redirect = Response.redirect('https://toolsiam.com/account', 302);
    expect(() => redirect.headers.set('X-Test', '1')).toThrow();
    const res = withSecurityHeaders(redirect);
    expect(res.status).toBe(302);
    expect(res.headers.get('Location')).toBe('https://toolsiam.com/account');
    expect(res.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');

    const withCookies = new Response(null, { status: 302 });
    withCookies.headers.append('Set-Cookie', 'a=1; Path=/');
    withCookies.headers.append('Set-Cookie', 'b=2; Path=/');
    // จำลอง header แบบ immutable ของ workerd เพื่อบังคับให้เดินทางสร้าง Response ใหม่
    withCookies.headers.set = () => {
      throw new TypeError("Can't modify immutable headers.");
    };
    expect(withSecurityHeaders(withCookies).headers.getSetCookie()).toEqual(['a=1; Path=/', 'b=2; Path=/']);
  });

  it('ไม่ทับค่าที่ handler ตั้งมาเอง', () => {
    const res = withSecurityHeaders(new Response('', { headers: { 'Referrer-Policy': 'no-referrer' } }));
    expect(res.headers.get('Referrer-Policy')).toBe('no-referrer');
  });
});
