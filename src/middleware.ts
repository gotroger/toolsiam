import type { MiddlewareHandler } from 'astro';

/**
 * header ความปลอดภัยชุดเดียวกับบล็อก `/*` ใน public/_headers — มีเทสต์เทียบให้ตรงกันเสมอ
 *
 * public/_headers มีผลกับ static assets ที่ชั้น assets ตอบเท่านั้น คำตอบที่ Worker สร้างเอง
 * (/api/* ที่ prerender = false) ไม่ผ่านกฎนั้น จึงต้องใส่ที่นี่อีกชั้น
 * CSP มีแค่ frame-ancestors — CSP เต็มรูปจะพัง inline script ของ Astro และ analytics
 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "frame-ancestors 'none'",
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
};

/**
 * เติม header ที่ยังไม่มี — ไม่ทับค่าที่ handler ตั้งมาเอง
 *
 * Response.redirect() และ fetch() คืน header แบบแก้ไม่ได้ (immutable) ตั้งค่าตรง ๆ จะโยน TypeError
 * จึงสร้าง Response ใหม่ครอบ body เดิม — Headers ที่ copy มาเก็บ Set-Cookie ทุกตัวไว้ครบ
 * (callback ของ Google ตั้ง cookie session พร้อม redirect ในคำตอบเดียว)
 */
export function withSecurityHeaders(response: Response): Response {
  const missing = Object.entries(SECURITY_HEADERS).filter(([name]) => !response.headers.has(name));
  if (missing.length === 0) return response;
  try {
    for (const [name, value] of missing) response.headers.set(name, value);
    return response;
  } catch {
    const headers = new Headers(response.headers);
    for (const [name, value] of missing) headers.set(name, value);
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  }
}

/** หน้า prerender ข้ามไป เพราะตอน build header ของ Response ไม่ถูกเก็บลงไฟล์อยู่แล้ว (ใช้ _headers แทน) */
export const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();
  if (context.isPrerendered) return response;
  return withSecurityHeaders(response);
};
