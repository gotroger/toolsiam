import { SESSION_TTL_SECONDS } from '@/lib/plan-limits';
import { parseCookies, randomToken, serializeCookie } from './guards';

/**
 * session ใน KV — key `SESSION:<sid>` TTL 30 วัน (spec เดิม §2)
 *
 * เลือก session ใน KV แทน JWT เพราะเพิกถอนได้ทันที (logout ลบ key) และ cookie ไม่ต้องถือข้อมูลใด ๆ
 */
export const SID_COOKIE = 'sid';
/**
 * hint ที่ไม่ HttpOnly — script ใน Header อ่านเพื่อรู้ว่า "น่าจะล็อกอินอยู่" จึงค่อยยิง /api/me
 * ผู้ใช้ทั่วไปที่ไม่มี cookie นี้จะไม่มี request ใดออกจากหน้า static เลย
 */
export const HINT_COOKIE = 'ts_m';

export interface Session {
  sid: string;
  userId: string;
  createdAt: number;
}

const key = (sid: string) => `SESSION:${sid}`;

export async function createSession(
  kv: KVNamespace,
  userId: string,
  now: number,
  random?: (n: number) => Uint8Array,
): Promise<string> {
  const sid = randomToken(32, random);
  await kv.put(key(sid), JSON.stringify({ userId, createdAt: now }), { expirationTtl: SESSION_TTL_SECONDS });
  return sid;
}

export async function readSession(kv: KVNamespace, cookieHeader: string | null): Promise<Session | null> {
  const sid = parseCookies(cookieHeader)[SID_COOKIE];
  if (!sid || !/^[A-Za-z0-9_-]{20,}$/.test(sid)) return null;
  const raw = await kv.get(key(sid));
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { userId?: unknown; createdAt?: unknown };
    if (typeof parsed.userId !== 'string') return null;
    return { sid, userId: parsed.userId, createdAt: Number(parsed.createdAt ?? 0) };
  } catch {
    return null;
  }
}

export async function deleteSession(kv: KVNamespace, sid: string): Promise<void> {
  await kv.delete(key(sid));
}

/** Set-Cookie ทั้งคู่ — `null` = ลบทิ้ง (logout หรือ session หมดอายุ) */
export function sessionCookies(sid: string | null, domain?: string): string[] {
  const maxAge = sid ? SESSION_TTL_SECONDS : 0;
  return [
    serializeCookie(SID_COOKIE, sid ?? '', { maxAge, httpOnly: true, domain }),
    serializeCookie(HINT_COOKIE, sid ? '1' : '', { maxAge, domain }),
  ];
}
