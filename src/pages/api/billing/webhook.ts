import type { APIRoute } from 'astro';
import { handleWebhook } from '@/lib/membership/handlers';
import { membership } from '../_membership';

/** `POST /api/billing/webhook` — logic อยู่ใน src/lib/membership/handlers.ts (ทดสอบได้โดยไม่ต้องมี runtime) */
export const prerender = false;

export const POST: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleWebhook(request, env, deps);
};
