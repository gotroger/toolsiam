import { describe, it, expect } from 'vitest';
import {
  base64url,
  cookieDomain,
  isTrustedOrigin,
  parseCookies,
  randomToken,
  readBody,
  safeNext,
  serializeCookie,
} from './guards';

describe('isTrustedOrigin', () => {
  it('รับเฉพาะโดเมนของเรา localhost และ SITE_ORIGIN ที่ตั้งไว้', () => {
    expect(isTrustedOrigin('https://toolsiam.com')).toBe(true);
    expect(isTrustedOrigin('https://www.toolsiam.com')).toBe(true);
    expect(isTrustedOrigin('http://localhost:4321')).toBe(true);
    expect(isTrustedOrigin('http://localhost')).toBe(true);
    expect(isTrustedOrigin('https://preview.example', 'https://preview.example')).toBe(true);
    expect(isTrustedOrigin('https://evil.com')).toBe(false);
    expect(isTrustedOrigin('https://toolsiam.com.evil.com')).toBe(false);
    expect(isTrustedOrigin('http://localhost.evil.com')).toBe(false);
    expect(isTrustedOrigin(null)).toBe(false);
  });
});

describe('safeNext — กัน open redirect', () => {
  it('รับเฉพาะ path ในเว็บ', () => {
    expect(safeNext('/tools/pdf-merge?x=1#y')).toBe('/tools/pdf-merge?x=1#y');
    expect(safeNext('/account')).toBe('/account');
  });
  it('อย่างอื่นกลับหน้าแรก', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext('')).toBe('/');
    expect(safeNext('https://evil.com')).toBe('/');
    expect(safeNext('//evil.com')).toBe('/');
    expect(safeNext('/\\evil.com')).toBe('/');
    expect(safeNext('tools')).toBe('/');
    expect(safeNext('/api/auth/logout')).toBe('/');
  });
});

describe('readBody', () => {
  it('คืนข้อความเมื่อไม่เกินขนาด และ null เมื่อเกิน (ทั้งตาม header และตามของจริง)', async () => {
    expect(await readBody(new Request('https://x', { method: 'POST', body: 'abc' }), 10)).toBe('abc');
    expect(await readBody(new Request('https://x', { method: 'POST', body: 'a'.repeat(11) }), 10)).toBeNull();
    const lying = new Request('https://x', { method: 'POST', body: 'abc', headers: { 'content-length': '999' } });
    expect(await readBody(lying, 10)).toBeNull();
    // ภาษาไทยหนึ่งตัวอักษร = 3 ไบต์ — นับไบต์ไม่ใช่ตัวอักษร
    expect(await readBody(new Request('https://x', { method: 'POST', body: 'กขคง' }), 10)).toBeNull();
  });
});

describe('cookies', () => {
  it('parse/serialize ไปกลับ และตั้ง attribute ครบ', () => {
    expect(parseCookies('sid=abc; ts_m=1;  oauth = x=y')).toEqual({ sid: 'abc', ts_m: '1', oauth: 'x=y' });
    expect(parseCookies(null)).toEqual({});
    const c = serializeCookie('sid', 'abc', { maxAge: 60, httpOnly: true, domain: 'toolsiam.com' });
    expect(c).toBe('sid=abc; Max-Age=60; Path=/; Secure; SameSite=Lax; HttpOnly; Domain=toolsiam.com');
    expect(serializeCookie('ts_m', '1', { maxAge: 0, path: '/api/auth' })).toBe(
      'ts_m=1; Max-Age=0; Path=/api/auth; Secure; SameSite=Lax',
    );
  });
  it('Domain ตั้งเฉพาะ production', () => {
    expect(cookieDomain('https://toolsiam.com/api/me')).toBe('toolsiam.com');
    expect(cookieDomain('https://www.toolsiam.com/api/me')).toBe('toolsiam.com');
    expect(cookieDomain('http://localhost:4321/api/me')).toBeUndefined();
    expect(cookieDomain('https://toolsiam.com.evil.com/')).toBeUndefined();
  });
});

describe('base64url / randomToken', () => {
  it('ไปกลับได้กับข้อความไทยและไม่มีอักขระนอก URL-safe', () => {
    const text = '{"next":"/tools?ก=ข"}';
    const encoded = base64url.encodeText(text);
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(base64url.decodeText(encoded)).toBe(text);
  });
  it('randomToken ใช้ตัวสุ่มที่ส่งเข้ามาและยาวตามไบต์', () => {
    const token = randomToken(32, (n) => new Uint8Array(n).fill(255));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(randomToken()).not.toBe(randomToken());
  });
});
