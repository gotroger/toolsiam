import type { APIRoute } from 'astro';
import { handleStart } from '@/lib/membership/handlers';
import { membership } from '../../_membership';

/** `GET /api/auth/google/start` — logic อยู่ใน src/lib/membership/handlers.ts (ทดสอบได้โดยไม่ต้องมี runtime) */
export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleStart(request, env, deps);
};
