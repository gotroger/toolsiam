/**
 * binding, var และ secret ที่ระบบสมาชิกใช้ (spec 2026-09-19 §สวิตช์สองชั้น)
 *
 * ทุกตัวเป็น optional โดยตั้งใจ — dev ที่ยังไม่ผูก D1/KV หรือ production ที่ยังไม่ตั้ง secret
 * ต้องได้ 204 เงียบ ๆ ไม่ใช่ 500 แบบเดียวกับ `LOTTERY` ใน src/pages/api/lottery/latest.ts
 */
export interface MembershipEnv {
  DB?: D1Database;
  /**
   * KV ของ session — ตั้งชื่อ MEMBER_SESSION ไม่ใช่ SESSION เพราะ @astrojs/cloudflare
   * จะยึด binding ชื่อ SESSION ไปใช้กับ Astro sessions โดยอัตโนมัติ
   */
  MEMBER_SESSION?: KVNamespace;
  /** kill switch — ต้องเป็น 'on' เท่านั้น */
  MEMBERSHIP?: string;
  /** origin ของเว็บ เช่น https://toolsiam.com — ใช้สร้าง redirect URI ของ Google; ไม่ตั้ง = ใช้ origin ของ request */
  SITE_ORIGIN?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  BEAM_API_BASE_URL?: string;
  BEAM_MERCHANT_ID?: string;
  BEAM_API_KEY?: string;
  /** base64 ตามที่ Beam ให้มา */
  BEAM_WEBHOOK_HMAC_SECRET?: string;
}

/** login/session ใช้งานได้ */
export function isEnabled(env: MembershipEnv): boolean {
  return (
    env.MEMBERSHIP === 'on' && !!env.DB && !!env.MEMBER_SESSION && !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET
  );
}

/** ชำระเงินใช้งานได้ — ต้องมี login ก่อนเสมอ */
export function isBillingEnabled(env: MembershipEnv): boolean {
  return (
    isEnabled(env) &&
    !!env.BEAM_API_BASE_URL &&
    !!env.BEAM_MERCHANT_ID &&
    !!env.BEAM_API_KEY &&
    !!env.BEAM_WEBHOOK_HMAC_SECRET
  );
}
