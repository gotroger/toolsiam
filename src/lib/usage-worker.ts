import { isTrustedOrigin, readBody } from './membership/guards';
import { todayInBangkok } from './today';
import { isUsageKind, recentSince, type UsageSummary } from './usage';

/**
 * ตัวนับการใช้งานฝั่ง Worker — `POST /api/usage` บันทึก · `GET /api/usage` อ่านสรุป
 * (spec 2026-09-10-usage-counter-design §2–3)
 *
 * แยกจาก src/pages/api/usage.ts ตามแบบ lottery-worker.ts เพื่อให้ทดสอบได้โดยไม่ต้องมี runtime จริง
 * ใช้ D1 ตัวเดียวกับระบบสมาชิก (binding `DB`) ตาราง usage_daily — ไม่มีข้อมูลระบุตัวผู้ใช้ใด ๆ
 */
export interface UsageEnv {
  DB?: D1Database;
  /** kill switch — ต้องเป็น 'on' เท่านั้น ปิดได้จาก dashboard โดยไม่ต้อง deploy */
  USAGE_COUNTER?: string;
  SITE_ORIGIN?: string;
}

export interface UsageDeps {
  /** slug ที่ยอมให้บันทึก — มาจาก registry ตอน build กันคนยิง slug สุ่มจนตารางบวม */
  allowed: ReadonlySet<string>;
  now?: () => Date;
  /** Cache API ของ Worker (`caches.default`) — ไม่มี = query D1 ทุกครั้ง (dev/เทสต์) */
  cache?: Cache | null;
}

/** `{"slug":"…","kind":"view"}` ยาวสุดราว 80 ไบต์ — เผื่อไว้แต่ไม่ให้ใครส่งก้อนใหญ่มาให้ parse */
export const USAGE_MAX_BODY = 200;
/** ความสดของตัวเลข — D1 ถูก query จริงไม่เกินครั้งละ 10 นาทีต่อ data center ไม่ว่าจะมีคนเข้ากี่คน */
export const USAGE_EDGE_TTL = 600;
const BROWSER_CACHE = 'public, max-age=60';
const NO_STORE = { 'Cache-Control': 'no-store' };

function enabled(env: UsageEnv): env is UsageEnv & { DB: D1Database } {
  return env.USAGE_COUNTER === 'on' && !!env.DB;
}

const status = (code: number) => new Response(null, { status: code, headers: NO_STORE });

export async function handleUsagePost(request: Request, env: UsageEnv, deps: UsageDeps): Promise<Response> {
  if (!enabled(env)) return status(204);
  if (!isTrustedOrigin(request.headers.get('origin'), env.SITE_ORIGIN)) return status(403);
  // sendBeacon ส่ง Content-Type: text/plain จึงอ่านเป็นข้อความแล้ว parse เอง ไม่ใช้ request.json()
  const body = await readBody(request, USAGE_MAX_BODY);
  if (body === null) return status(400);
  let parsed: { slug?: unknown; kind?: unknown };
  try {
    parsed = JSON.parse(body) as typeof parsed;
  } catch {
    return status(400);
  }
  const { slug, kind } = parsed ?? {};
  if (typeof slug !== 'string' || !deps.allowed.has(slug) || !isUsageKind(kind)) return status(400);

  const day = todayInBangkok((deps.now ?? (() => new Date()))());
  const views = kind === 'view' ? 1 : 0;
  try {
    await env.DB.prepare(
      `INSERT INTO usage_daily (slug, day, views, uses) VALUES (?1, ?2, ?3, ?4)
       ON CONFLICT (slug, day) DO UPDATE SET views = views + ?3, uses = uses + ?4`,
    )
      .bind(slug, day, views, 1 - views)
      .run();
  } catch (e) {
    console.error('[usage] บันทึกไม่สำเร็จ:', (e as Error).message);
    return status(503);
  }
  return status(204);
}

interface SummaryRow {
  slug: string;
  total: number | null;
  recent: number | null;
}

export async function handleUsageGet(request: Request, env: UsageEnv, deps: UsageDeps): Promise<Response> {
  // ปิดหรือไม่มี binding → 204 ฝั่งเว็บไม่แสดงตัวเลขและเรียงตามลำดับเดิม
  if (!enabled(env)) return status(204);
  // key ไม่รวม query string — ใครเติม ?x=สุ่ม มาก็ไม่ทำให้หลุด cache ไปถึง D1
  const cacheKey = new Request(new URL('/api/usage', request.url).toString());
  const cached = await deps.cache?.match(cacheKey).catch(() => undefined);
  if (cached) return withBrowserCache(cached);

  const now = (deps.now ?? (() => new Date()))();
  let rows: SummaryRow[];
  try {
    const result = await env.DB.prepare(
      `SELECT slug, SUM(uses) AS total, SUM(CASE WHEN day >= ?1 THEN uses ELSE 0 END) AS recent
       FROM usage_daily GROUP BY slug`,
    )
      .bind(recentSince(todayInBangkok(now)))
      .all<SummaryRow>();
    rows = result.results ?? [];
  } catch (e) {
    console.error('[usage] อ่านสรุปไม่สำเร็จ:', (e as Error).message);
    return status(503);
  }

  const summary: UsageSummary = { generatedAt: now.toISOString(), tools: {} };
  for (const r of rows) {
    // slug ที่ถูกถอดออกจาก registry ไปแล้วไม่ต้องส่งออก
    if (deps.allowed.has(r.slug))
      summary.tools[r.slug] = { total: Number(r.total ?? 0), recent: Number(r.recent ?? 0) };
  }
  const body = JSON.stringify(summary);
  if (deps.cache) {
    // เก็บที่ edge ด้วยอายุ USAGE_EDGE_TTL · ส่งให้เบราว์เซอร์ด้วยอายุสั้นกว่า (withBrowserCache)
    const stored = new Response(body, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${USAGE_EDGE_TTL}`,
      },
    });
    await deps.cache
      .put(cacheKey, stored)
      .catch((e: Error) => console.warn('[usage] เก็บ cache ไม่สำเร็จ:', e.message));
  }
  return new Response(body, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': BROWSER_CACHE },
  });
}

function withBrowserCache(response: Response): Response {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', BROWSER_CACHE);
  return new Response(response.body, { status: response.status, headers });
}
