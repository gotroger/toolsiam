import { describe, it, expect } from 'vitest';
import { createSession, deleteSession, HINT_COOKIE, readSession, sessionCookies, SID_COOKIE } from './session';
import { SESSION_TTL_SECONDS } from '@/lib/plan-limits';

/** KV จำลอง — เก็บ ttl ไว้ตรวจ */
export function fakeKv() {
  const store = new Map<string, { value: string; ttl?: number }>();
  return {
    store,
    get: async (k: string) => store.get(k)?.value ?? null,
    put: async (k: string, v: string, opts?: { expirationTtl?: number }) => {
      store.set(k, { value: v, ttl: opts?.expirationTtl });
    },
    delete: async (k: string) => {
      store.delete(k);
    },
  } as unknown as KVNamespace & { store: Map<string, { value: string; ttl?: number }> };
}

const fixed = (n: number) => new Uint8Array(n).fill(7);

describe('session', () => {
  it('สร้าง → อ่านกลับ → ลบ พร้อม TTL 30 วัน', async () => {
    const kv = fakeKv();
    const sid = await createSession(kv, 'u1', 1000, fixed);
    expect(sid).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(kv.store.get(`SESSION:${sid}`)?.ttl).toBe(SESSION_TTL_SECONDS);
    expect(await readSession(kv, `${SID_COOKIE}=${sid}; ${HINT_COOKIE}=1`)).toEqual({
      sid,
      userId: 'u1',
      createdAt: 1000,
    });
    await deleteSession(kv, sid);
    expect(await readSession(kv, `${SID_COOKIE}=${sid}`)).toBeNull();
  });

  it('ไม่มี cookie / sid แปลก ๆ / ค่าใน KV พัง → null โดยไม่โยน', async () => {
    const kv = fakeKv();
    expect(await readSession(kv, null)).toBeNull();
    expect(await readSession(kv, 'sid=short')).toBeNull();
    expect(await readSession(kv, 'sid=../../etc/passwd-ABCDEFGHIJKLMNOPQRS')).toBeNull();
    kv.store.set('SESSION:AAAAAAAAAAAAAAAAAAAAAAAA', { value: '{not json' });
    expect(await readSession(kv, 'sid=AAAAAAAAAAAAAAAAAAAAAAAA')).toBeNull();
  });

  it('cookie คู่: sid HttpOnly, ts_m อ่านได้จาก JS, ลบทั้งคู่ด้วย Max-Age=0', () => {
    const [sid, hint] = sessionCookies('abc', 'toolsiam.com');
    expect(sid).toContain('sid=abc');
    expect(sid).toContain('HttpOnly');
    expect(sid).toContain(`Max-Age=${SESSION_TTL_SECONDS}`);
    expect(sid).toContain('Domain=toolsiam.com');
    expect(hint).toContain('ts_m=1');
    expect(hint).not.toContain('HttpOnly');
    const [gone, hintGone] = sessionCookies(null);
    expect(gone).toContain('Max-Age=0');
    expect(hintGone).toContain('Max-Age=0');
    expect(gone).not.toContain('Domain=');
  });
});
