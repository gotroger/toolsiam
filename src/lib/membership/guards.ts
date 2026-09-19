/**
 * ด่านตรวจร่วมของทุก API สมาชิก (spec 2026-09-19 §ด่านตรวจ)
 *
 * โมดูลนี้ไม่แตะ binding ใด ๆ — ทดสอบได้ด้วย Request/Response ธรรมดา
 */

/** origin ที่ยอมให้ส่ง mutation (POST) เข้ามา — production สองโดเมน + dev บน localhost ทุกพอร์ต */
export function isTrustedOrigin(origin: string | null, siteOrigin?: string): boolean {
  if (!origin) return false;
  if (siteOrigin && origin === siteOrigin) return true;
  if (origin === 'https://toolsiam.com' || origin === 'https://www.toolsiam.com') return true;
  return /^http:\/\/localhost(:\d+)?$/.test(origin);
}

/**
 * path ที่จะ redirect ไปหลังล็อกอิน — ต้องเป็น path ในเว็บนี้เท่านั้น
 * `//evil.com` ก็เป็น "path" ในสายตา URL parser จึงต้องกันแยก (open redirect)
 *
 * ตรวจอักขระควบคุมก่อนเสมอ: URL parser **ลบ** tab/CR/LF ทิ้งก่อนแยกส่วน ดังนั้น
 * `/<tab>/evil.com` ผ่านการตรวจ prefix ทุกข้อแต่เบราว์เซอร์อ่านเป็น `//evil.com`
 * แล้วพาออกนอกเว็บ (tab เป็นอักขระที่ใส่ใน header ได้ ต่างจาก CR/LF ที่ Headers ปฏิเสธเอง)
 */
export function safeNext(next: string | null | undefined): string {
  // eslint-disable-next-line no-control-regex -- ตั้งใจจับอักขระควบคุมตรง ๆ นี่คือจุดประสงค์ของการตรวจ
  if (!next || /[\u0000-\u001f\u007f]/.test(next)) return '/';
  if (!next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/';
  // ไม่ให้วนกลับเข้า API เอง
  if (next.startsWith('/api/')) return '/';
  return next;
}

/** อ่าน body เป็นข้อความ คืน null ถ้ายาวเกินกำหนด — ต้องอ่าน raw ก่อน parse เสมอ (webhook ใช้ตรวจลายเซ็น) */
export async function readBody(request: Request, maxBytes: number): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > maxBytes) return null;
  const text = await request.text();
  return new TextEncoder().encode(text).byteLength > maxBytes ? null : text;
}

/** คำตอบทุกตัวที่ขึ้นกับผู้ใช้ห้ามถูก cache ที่ edge หรือเบราว์เซอร์ */
export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;

export function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...NO_STORE, ...headers },
  });
}

export function empty(status: number, headers: HeadersInit = {}): Response {
  // Headers object กระจายด้วย spread ไม่ได้ — ต้องประกอบผ่าน Headers API
  const merged = new Headers(headers);
  merged.set('Cache-Control', NO_STORE['Cache-Control']);
  return new Response(null, { status, headers: merged });
}

export function redirect(status: 302 | 303, location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location, ...NO_STORE });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(null, { status, headers });
}

export function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name) out[name] = part.slice(i + 1).trim();
  }
  return out;
}

export interface CookieOptions {
  maxAge: number;
  httpOnly?: boolean;
  path?: string;
  /** ตั้งเฉพาะ production ให้ apex/www ใช้ session ร่วมกัน */
  domain?: string;
}

export function serializeCookie(name: string, value: string, opts: CookieOptions): string {
  const parts = [`${name}=${value}`, `Max-Age=${opts.maxAge}`, `Path=${opts.path ?? '/'}`, 'Secure', 'SameSite=Lax'];
  if (opts.httpOnly) parts.push('HttpOnly');
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  return parts.join('; ');
}

/** โดเมนสำหรับ cookie — production เท่านั้น localhost ไม่ตั้ง (เบราว์เซอร์ปฏิเสธ Domain=localhost) */
export function cookieDomain(requestUrl: string): string | undefined {
  const host = new URL(requestUrl).hostname;
  return host === 'toolsiam.com' || host.endsWith('.toolsiam.com') ? 'toolsiam.com' : undefined;
}

export const base64url = {
  encode(bytes: Uint8Array): string {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  },
  decode(text: string): Uint8Array {
    const b64 = text
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(text.length / 4) * 4, '=');
    const s = atob(b64);
    return Uint8Array.from(s, (c) => c.charCodeAt(0));
  },
  encodeText(text: string): string {
    return this.encode(new TextEncoder().encode(text));
  },
  decodeText(text: string): string {
    return new TextDecoder().decode(this.decode(text));
  },
};

/** สุ่ม token แบบ URL-safe — 32 ไบต์ = 256 บิต */
export function randomToken(bytes = 32, random: (n: number) => Uint8Array = defaultRandom): string {
  return base64url.encode(random(bytes));
}

function defaultRandom(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}
