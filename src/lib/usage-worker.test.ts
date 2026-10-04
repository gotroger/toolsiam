import { describe, expect, it, vi } from 'vitest';
import { handleUsageGet, handleUsagePost, USAGE_EDGE_TTL, type UsageEnv } from './usage-worker';
import { sqliteD1 } from '@/test-utils/sqlite-d1';

const SITE = 'https://toolsiam.com';
const allowed = new Set(['thai-income-tax', 'baht-text']);
// 2026-10-04 06:30 ที่กรุงเทพฯ = 2026-10-03 23:30 UTC — เส้นแบ่งวันต้องเป็นของไทย
const NOW = new Date('2026-10-03T23:30:00Z');

function post(body: string, origin: string | null = SITE) {
  const headers = new Headers({ 'Content-Type': 'text/plain;charset=UTF-8' });
  if (origin) headers.set('Origin', origin);
  return new Request(`${SITE}/api/usage`, { method: 'POST', body, headers });
}
const beacon = (slug: string, kind: string) => post(JSON.stringify({ slug, kind }));

function setup(overrides: Partial<UsageEnv> = {}) {
  const db = sqliteD1();
  const env: UsageEnv = { DB: db, USAGE_COUNTER: 'on', SITE_ORIGIN: SITE, ...overrides };
  return { db, env, deps: { allowed, now: () => NOW } };
}

async function rows(db: D1Database) {
  const { results } = await db.prepare('SELECT slug, day, views, uses FROM usage_daily ORDER BY slug, day').all();
  return results;
}

describe('POST /api/usage', () => {
  it('บันทึกลงถังของวันตามเวลาไทย และบวกเพิ่มในแถวเดิม', async () => {
    const { db, env, deps } = setup();
    expect((await handleUsagePost(beacon('thai-income-tax', 'view'), env, deps)).status).toBe(204);
    await handleUsagePost(beacon('thai-income-tax', 'view'), env, deps);
    await handleUsagePost(beacon('thai-income-tax', 'use'), env, deps);
    expect(await rows(db)).toEqual([{ slug: 'thai-income-tax', day: '2026-10-04', views: 2, uses: 1 }]);
  });

  it('kill switch ปิดหรือไม่มี binding → 204 โดยไม่แตะ D1', async () => {
    const { db, deps } = setup();
    const off = await handleUsagePost(beacon('baht-text', 'use'), { DB: db, USAGE_COUNTER: 'off' }, deps);
    const noDb = await handleUsagePost(beacon('baht-text', 'use'), { USAGE_COUNTER: 'on' }, deps);
    expect([off.status, noDb.status]).toEqual([204, 204]);
    expect(await rows(db)).toEqual([]);
  });

  it('Origin ต้องเป็นของเว็บนี้ (localhost ทุกพอร์ตสำหรับ dev)', async () => {
    const { db, env, deps } = setup();
    const body = JSON.stringify({ slug: 'baht-text', kind: 'use' });
    expect((await handleUsagePost(post(body, 'https://evil.example'), env, deps)).status).toBe(403);
    expect((await handleUsagePost(post(body, null), env, deps)).status).toBe(403);
    expect((await handleUsagePost(post(body, 'http://localhost:8787'), env, deps)).status).toBe(204);
    expect(await rows(db)).toHaveLength(1);
  });

  it.each([
    ['body พัง', 'not json'],
    ['body ยาวเกิน', JSON.stringify({ slug: 'baht-text', kind: 'use', pad: 'x'.repeat(300) })],
    ['kind ผิด', JSON.stringify({ slug: 'baht-text', kind: 'click' })],
    ['slug นอก allowlist', JSON.stringify({ slug: 'random-junk', kind: 'use' })],
    ['slug ไม่ใช่ข้อความ', JSON.stringify({ slug: 1, kind: 'use' })],
    ['body เป็น null', 'null'],
  ])('%s → 400 และไม่เขียน', async (_name, body) => {
    const { db, env, deps } = setup();
    expect((await handleUsagePost(post(body), env, deps)).status).toBe(400);
    expect(await rows(db)).toEqual([]);
  });

  it('D1 ล่ม → 503 ไม่โยน error ใส่ runtime', async () => {
    const broken = { prepare: () => ({ bind: () => ({ run: () => Promise.reject(new Error('down')) }) }) };
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await handleUsagePost(
      beacon('baht-text', 'use'),
      { DB: broken as unknown as D1Database, USAGE_COUNTER: 'on' },
      { allowed },
    );
    expect(res.status).toBe(503);
    spy.mockRestore();
  });
});

describe('GET /api/usage', () => {
  async function seed(db: D1Database) {
    const put = (slug: string, day: string, uses: number) =>
      db.prepare('INSERT INTO usage_daily (slug, day, views, uses) VALUES (?1, ?2, 0, ?3)').bind(slug, day, uses).run();
    await put('thai-income-tax', '2026-10-04', 3);
    await put('thai-income-tax', '2026-09-05', 2); // วันแรกของช่วง 30 วัน — นับ
    await put('thai-income-tax', '2026-09-04', 7); // ก่อนช่วง — นับแค่ยอดสะสม
    await put('baht-text', '2026-01-01', 4);
    await put('retired-tool', '2026-10-04', 9); // ไม่อยู่ใน registry แล้ว — ไม่ส่งออก
  }

  it('ยอดสะสมและยอด 30 วันจาก query เดียว พร้อม header cache สั้นสำหรับเบราว์เซอร์', async () => {
    const { db, env, deps } = setup();
    await seed(db);
    const res = await handleUsageGet(new Request(`${SITE}/api/usage`), env, deps);
    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(await res.json()).toEqual({
      generatedAt: NOW.toISOString(),
      tools: { 'thai-income-tax': { total: 12, recent: 5 }, 'baht-text': { total: 4, recent: 0 } },
    });
  });

  it('ระบบปิด → 204 แบบไม่ cache', async () => {
    const { db, deps } = setup();
    const res = await handleUsageGet(new Request(`${SITE}/api/usage`), { DB: db, USAGE_COUNTER: 'off' }, deps);
    expect(res.status).toBe(204);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
  });

  it('ใช้ Cache API ที่ edge: ครั้งที่สองไม่ถึง D1 และ query string สุ่มไม่ทำให้หลุด cache', async () => {
    const { db, env, deps } = setup();
    await seed(db);
    const store = new Map<string, Response>();
    const cache = {
      match: vi.fn(async (req: Request) => store.get(req.url)?.clone()),
      put: vi.fn(async (req: Request, res: Response) => void store.set(req.url, res)),
    } as unknown as Cache;
    const prepare = vi.spyOn(db, 'prepare');

    await handleUsageGet(new Request(`${SITE}/api/usage`), env, { ...deps, cache });
    expect(store.get(`${SITE}/api/usage`)?.headers.get('Cache-Control')).toBe(`public, max-age=${USAGE_EDGE_TTL}`);
    const again = await handleUsageGet(new Request(`${SITE}/api/usage?bust=123`), env, { ...deps, cache });
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(again.headers.get('Cache-Control')).toBe('public, max-age=60');
    expect(((await again.json()) as { tools: Record<string, unknown> }).tools['baht-text']).toEqual({
      total: 4,
      recent: 0,
    });
  });
});
