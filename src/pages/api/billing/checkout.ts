import type { APIRoute } from 'astro';
import { handleCheckout } from '@/lib/membership/handlers';
import { membership } from '../_membership';

/** `POST /api/billing/checkout` — logic อยู่ใน src/lib/membership/handlers.ts (ทดสอบได้โดยไม่ต้องมี runtime) */
export const prerender = false;

export const POST: APIRoute = ({ request }) => {
  const { env, deps } = membership();
  return handleCheckout(request, env, deps);
};
