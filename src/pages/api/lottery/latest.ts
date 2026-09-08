import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { handleLatest, type LotteryEnv } from '@/lib/lottery-worker';

/**
 * `GET /api/lottery/latest` — อ่านผลงวดล่าสุดที่ Worker cron เขียนไว้ใน KV
 *
 * นี่เป็นหน้าเดียวของทั้งเว็บที่ render ตอน request หน้าอื่นทั้งหมดยังเป็น static ที่เสิร์ฟจาก edge
 * ตามสถาปัตยกรรม static-first ของแผน (§28.4)
 *
 * ตัวเขียน KV อยู่คนละ Worker (`workers/lottery-cron/`) เพราะ Cloudflare cron trigger ต้องการ
 * `scheduled` handler ซึ่ง entrypoint ของ Astro ไม่มี — แยกกันยังทำให้เว็บไม่พังเมื่อ cron มีปัญหาด้วย
 *
 * ตั้งแต่ Astro v6 ต้องอ่าน binding ผ่าน `cloudflare:workers` ไม่ใช่ `Astro.locals.runtime.env`
 */
export const prerender = false;

export const GET: APIRoute = async () => {
  const bindings = env as unknown as LotteryEnv;
  // ไม่มี binding = รันในบริบทที่ไม่มี KV — ให้ client ใช้ข้อมูล static ต่อเงียบ ๆ
  if (!bindings?.LOTTERY) return new Response(null, { status: 204 });
  return handleLatest(bindings);
};
