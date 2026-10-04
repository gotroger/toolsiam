import type { APIRoute } from 'astro';
import { handleFavoritesGet, handleFavoritesPost } from '@/lib/membership/handlers';
import { getVisibleTools } from '@/tools/registry';
import { membership } from './_membership';

/** `GET`/`POST /api/favorites` — logic อยู่ใน src/lib/membership/handlers.ts (ทดสอบได้โดยไม่ต้องมี runtime) */
export const prerender = false;

/** เฉพาะเครื่องมือที่ยังแสดงอยู่ — ตัวที่ปลดระวางแล้วไม่มีที่ให้กลับมาเปิดจากรายการโปรด */
const toolSlugs: ReadonlySet<string> = new Set(getVisibleTools().map((t) => t.slug));

export const GET: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleFavoritesGet(request, env, { ...deps, toolSlugs });
};

export const POST: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleFavoritesPost(request, env, { ...deps, toolSlugs });
};
