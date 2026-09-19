import type { APIRoute } from 'astro';
import { handleCallback } from '@/lib/membership/handlers';
import { membership } from '../../_membership';

/** `GET /api/auth/google/callback` — logic อยู่ใน src/lib/membership/handlers.ts (ทดสอบได้โดยไม่ต้องมี runtime) */
export const prerender = false;

export const GET: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleCallback(request, env, deps);
};
