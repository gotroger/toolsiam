import { env } from 'cloudflare:workers';
import type { MembershipEnv } from '@/lib/membership/env';
import { d1Store } from '@/lib/membership/store';
import type { Deps } from '@/lib/membership/handlers';

/**
 * ประกอบ binding ให้ handler ของระบบสมาชิก — ใช้ร่วมกันทุก route ใน src/pages/api/{me,auth,billing}
 *
 * ตั้งแต่ Astro v6 ต้องอ่าน binding ผ่าน `cloudflare:workers` ไม่ใช่ `Astro.locals.runtime.env`
 * (เหตุผลเดียวกับ src/pages/api/lottery/latest.ts) · ไม่มี binding = handler ตอบ 204 เอง
 */
export function membership(): { env: MembershipEnv; deps: Deps } {
  const bindings = env as unknown as MembershipEnv;
  return {
    env: bindings,
    deps: { store: bindings.DB ? d1Store(bindings.DB) : undefined, kv: bindings.MEMBER_SESSION },
  };
}
