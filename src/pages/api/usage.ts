import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleUsageGet, handleUsagePost, type UsageDeps, type UsageEnv } from '@/lib/usage-worker';
import { tools } from '@/tools/registry';

/**
 * `POST /api/usage` บันทึกการเปิด/ใช้เครื่องมือ · `GET /api/usage` สรุปยอดต่อเครื่องมือ
 * logic อยู่ใน src/lib/usage-worker.ts (ทดสอบได้โดยไม่ต้องมี runtime) — ไฟล์นี้แค่ส่ง binding เข้าไป
 */
export const prerender = false;

const allowed: ReadonlySet<string> = new Set(tools.map((t) => t.slug));

function deps(): UsageDeps {
  // Cache API (`caches.default`) มีเฉพาะบน Worker — บริบทอื่นให้ query D1 ตรง ๆ
  // cast เพราะ lib DOM ของ astro sync บัง type CacheStorage ของ workers-types ที่มี `default`
  const storage = typeof caches !== 'undefined' ? (caches as unknown as { default?: Cache }) : undefined;
  const cache = storage?.default ?? null;
  return { allowed, cache };
}

export const POST: APIRoute = ({ request }) => handleUsagePost(request, env as unknown as UsageEnv, deps());

export const GET: APIRoute = ({ request }) => handleUsageGet(request, env as unknown as UsageEnv, deps());
